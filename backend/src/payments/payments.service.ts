import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Razorpay from 'razorpay';
import { DataSource, In, Repository } from 'typeorm';
import { Bill } from '../bills/bill.entity';
import { PaymentStatus } from '../common/enums';
import { ListPaymentsQueryDto, PaymentFailedDto, VerifyPaymentDto } from './dto/payment.dto';
import { Payment } from './payment.entity';
import { RAZORPAY_CLIENT } from './razorpay.provider';
import { isValidRazorpaySignature } from './razorpay-signature.util';

const toPaise = (rupees: number): number => Math.round(rupees * 100);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Bill) private readonly bills: Repository<Bill>,
    @Inject(RAZORPAY_CLIENT) private readonly razorpay: Razorpay | null,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** Steps 2-4 of the payment flow: validate bill, create Razorpay order, return what Checkout needs. */
  async createOrder(userId: number, billId: number) {
    const client = this.requireRazorpay();
    const bill = await this.bills.findOne({ where: { id: billId, patient: { userId } }, relations: { patient: true } });
    if (!bill) throw new NotFoundException(`Bill with ID ${billId} not found`);
    if (bill.paymentStatus === PaymentStatus.Paid) throw new ConflictException('This bill is already paid');
    if (bill.paymentStatus === PaymentStatus.Cancelled) throw new BadRequestException('A cancelled bill cannot be paid');
    if (!(bill.totalAmount > 0)) throw new BadRequestException('Bill total amount must be greater than 0');

    const currency = this.config.get<string>('RAZORPAY_CURRENCY', 'INR');
    const amountInPaise = toPaise(bill.totalAmount);

    let order: { id: string; amount: number | string; currency: string };
    try {
      order = await client.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `bill_${bill.id}_${Date.now()}`.slice(0, 40),
        notes: { billId: String(bill.id) },
      });
    } catch (error) {
      this.logger.error(`Razorpay order creation failed for bill ${bill.id}: ${JSON.stringify(error)}`);
      const description = (error as { error?: { description?: string } })?.error?.description;
      throw new BadGatewayException(`Could not create Razorpay order${description ? `: ${description}` : ''}`);
    }

    const payment = await this.dataSource.transaction(async (manager) => {
      // A new attempt supersedes earlier abandoned ones.
      await manager.update(Payment, { billId: bill.id, paymentStatus: PaymentStatus.Pending }, { paymentStatus: PaymentStatus.Cancelled });
      if (bill.paymentStatus === PaymentStatus.Failed) {
        await manager.update(Bill, bill.id, { paymentStatus: PaymentStatus.Pending });
      }
      return manager.save(
        manager.create(Payment, {
          billId: bill.id,
          razorpayOrderId: order.id,
          amount: bill.totalAmount,
          currency: order.currency,
          paymentStatus: PaymentStatus.Pending,
        }),
      );
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(order.amount), // paise, as required by Checkout
      currency: order.currency,
      keyId: this.config.getOrThrow<string>('RAZORPAY_KEY_ID'), // public key id only
      bill: { id: bill.id, description: bill.description, totalAmount: bill.totalAmount },
      patient: { name: bill.patient.name, email: bill.patient.email, phone: bill.patient.phone },
    };
  }

  /** Steps 8-10: verify signature, then update payment + bill atomically. */
  async verifyPayment(userId: number, dto: VerifyPaymentDto) {
    await this.assertOrderOwned(userId, dto.razorpay_order_id);
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) throw new ServiceUnavailableException('Razorpay is not configured on the server');

    const { valid, paymentId } = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { razorpayOrderId: dto.razorpay_order_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Payment order not found');
      if (payment.paymentStatus === PaymentStatus.Paid) return { valid: true, paymentId: payment.id }; // idempotent

      const valid = isValidRazorpaySignature(dto.razorpay_order_id, dto.razorpay_payment_id, dto.razorpay_signature, secret);
      payment.razorpayPaymentId = dto.razorpay_payment_id;
      payment.razorpaySignature = dto.razorpay_signature;
      payment.paymentStatus = valid ? PaymentStatus.Paid : PaymentStatus.Failed;
      payment.failureReason = valid ? null : 'Invalid payment signature';
      await manager.save(payment);

      if (valid) {
        await manager.update(Bill, payment.billId, { paymentStatus: PaymentStatus.Paid });
      } else {
        await manager.update(Bill, { id: payment.billId, paymentStatus: In([PaymentStatus.Pending, PaymentStatus.Failed]) }, { paymentStatus: PaymentStatus.Failed });
      }
      return { valid, paymentId: payment.id };
    });

    if (!valid) throw new BadRequestException('Payment verification failed: invalid payment signature');
    return this.findOne(userId, paymentId);
  }

  /** Records a failure reported by Razorpay Checkout (payment.failed event). Never downgrades a Paid payment. */
  async markFailed(userId: number, dto: PaymentFailedDto) {
    await this.assertOrderOwned(userId, dto.razorpay_order_id);
    const paymentId = await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { razorpayOrderId: dto.razorpay_order_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Payment order not found');
      if (payment.paymentStatus === PaymentStatus.Paid) return payment.id;

      payment.paymentStatus = PaymentStatus.Failed;
      payment.failureReason = dto.reason ?? 'Payment failed';
      if (dto.razorpay_payment_id) payment.razorpayPaymentId = dto.razorpay_payment_id;
      await manager.save(payment);
      await manager.update(Bill, { id: payment.billId, paymentStatus: PaymentStatus.Pending }, { paymentStatus: PaymentStatus.Failed });
      return payment.id;
    });
    return this.findOne(userId, paymentId);
  }

  findAll(userId: number, query: ListPaymentsQueryDto) {
    return this.list(userId, query);
  }

  private async list(userId: number, { billId, status, page, limit }: ListPaymentsQueryDto) {
    const [items, total] = await this.payments.findAndCount({
      where: { ...(status && { paymentStatus: status }), bill: { ...(billId && { id: billId }), patient: { userId } } },
      relations: { bill: { patient: true } },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(userId: number, id: number): Promise<Payment> {
    const payment = await this.payments.findOne({ where: { id, bill: { patient: { userId } } }, relations: { bill: { patient: true } } });
    if (!payment) throw new NotFoundException(`Payment with ID ${id} not found`);
    return payment;
  }

  /** A payment order may only be verified / failed by the account that owns the bill. */
  private async assertOrderOwned(userId: number, razorpayOrderId: string): Promise<void> {
    if (!(await this.payments.exist({ where: { razorpayOrderId, bill: { patient: { userId } } } }))) {
      throw new NotFoundException('Payment order not found');
    }
  }

  private requireRazorpay(): Razorpay {
    if (!this.razorpay) throw new ServiceUnavailableException('Razorpay is not configured on the server');
    return this.razorpay;
  }
}
