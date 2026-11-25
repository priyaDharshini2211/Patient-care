import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { toCsv } from '../common/csv.util';
import { decimalTransformer, roundMoney } from '../common/decimal.transformer';
import { OPEN_STATUSES, PaymentStatus } from '../common/enums';
import { Patient } from '../patients/patient.entity';
import { Bill } from './bill.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { ListBillsQueryDto } from './dto/list-bills-query.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

/** Total payable = amount + tax, always computed on the server. */
export const calculateTotal = (amount: number, tax = 0): number => roundMoney(amount + tax);

export const invoiceNumber = (id: number): string => `INV-${String(id).padStart(5, '0')}`;

/** A bill is overdue when money is still owed and the due date (YYYY-MM-DD, compared in UTC) is before today. */
export const isBillOverdue = (status: PaymentStatus, dueDate: string | null, now: Date = new Date()): boolean =>
  Boolean(dueDate) && OPEN_STATUSES.includes(status) && (dueDate as string) < now.toISOString().slice(0, 10);

const withMeta = (bill: Bill) => ({ ...bill, invoiceNumber: invoiceNumber(bill.id), isOverdue: isBillOverdue(bill.paymentStatus, bill.dueDate) });

type StatBucket = { count: number; amount: number };

@Injectable()
export class BillsService {
  constructor(
    @InjectRepository(Bill) private readonly bills: Repository<Bill>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
  ) {}

  async findAll(userId: number, query: ListBillsQueryDto) {
    const { page, limit, sortBy, order } = query;
    const [items, total] = await this.filtered(userId, query)
      .orderBy(`bill.${sortBy}`, order, sortBy === 'dueDate' ? 'NULLS LAST' : undefined)
      .addOrderBy('bill.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: items.map(withMeta), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Counts and amounts per status (for the filter tabs) plus the overdue subtotal. */
  async stats(userId: number) {
    const rows = await this.bills
      .createQueryBuilder('bill')
      .innerJoin('bill.patient', 'patient')
      .select('bill.payment_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(bill.total_amount), 0)', 'amount')
      .addSelect('COUNT(*) FILTER (WHERE bill.due_date < CURRENT_DATE AND bill.payment_status IN (:...open))', 'overdueCount')
      .addSelect('COALESCE(SUM(bill.total_amount) FILTER (WHERE bill.due_date < CURRENT_DATE AND bill.payment_status IN (:...open)), 0)', 'overdueAmount')
      .where('patient.user_id = :userId', { userId })
      .setParameter('open', OPEN_STATUSES)
      .groupBy('bill.payment_status')
      .getRawMany<{ status: PaymentStatus; count: string; amount: string; overdueCount: string; overdueAmount: string }>();

    const empty = (): StatBucket => ({ count: 0, amount: 0 });
    const byStatus = Object.fromEntries(Object.values(PaymentStatus).map((status) => [status, empty()])) as Record<PaymentStatus, StatBucket>;
    const all = empty();
    const overdue = empty();
    for (const row of rows) {
      byStatus[row.status] = { count: Number(row.count), amount: decimalTransformer.from(row.amount) };
      all.count += Number(row.count);
      all.amount = roundMoney(all.amount + decimalTransformer.from(row.amount));
      overdue.count += Number(row.overdueCount);
      overdue.amount = roundMoney(overdue.amount + decimalTransformer.from(row.overdueAmount));
    }
    return { all, byStatus, overdue };
  }

  async findOne(userId: number, id: number) {
    return withMeta(await this.owned(userId, id));
  }

  async create(userId: number, dto: CreateBillDto) {
    await this.assertPatientOwned(userId, dto.patientId);
    const tax = dto.tax ?? 0;
    const saved = await this.bills.save(
      this.bills.create({
        patientId: dto.patientId,
        description: dto.description,
        amount: dto.amount,
        tax,
        totalAmount: calculateTotal(dto.amount, tax),
        dueDate: dto.dueDate ?? null,
        paymentStatus: dto.paymentStatus ?? PaymentStatus.Pending,
      }),
    );
    return this.findOne(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateBillDto) {
    const bill = await this.owned(userId, id);
    const amountChanged = dto.amount !== undefined || dto.tax !== undefined;

    if (bill.paymentStatus === PaymentStatus.Paid && (amountChanged || dto.paymentStatus !== undefined)) {
      throw new ConflictException('A paid bill cannot be changed');
    }
    if (dto.patientId && dto.patientId !== bill.patientId) await this.assertPatientOwned(userId, dto.patientId);

    const { payments, patient, ...fields } = bill;
    Object.assign(fields, dto);
    fields.totalAmount = calculateTotal(fields.amount, fields.tax);
    await this.bills.save(fields);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<{ id: number }> {
    const bill = await this.owned(userId, id);
    if (bill.paymentStatus === PaymentStatus.Paid) {
      throw new ConflictException('A paid bill cannot be deleted');
    }
    await this.bills.delete(bill.id); // payment attempts are removed through ON DELETE CASCADE
    return { id };
  }

  async exportCsv(userId: number, query: ListBillsQueryDto): Promise<string> {
    const bills = await this.filtered(userId, query).orderBy(`bill.${query.sortBy}`, query.order).addOrderBy('bill.id', 'DESC').getMany();
    return toCsv(
      ['Invoice', 'Patient', 'Description', 'Amount', 'Tax', 'Total', 'Status', 'Due date', 'Overdue', 'Created'],
      bills.map((b) => [
        invoiceNumber(b.id), b.patient.name, b.description, b.amount, b.tax, b.totalAmount, b.paymentStatus, b.dueDate,
        isBillOverdue(b.paymentStatus, b.dueDate) ? 'Yes' : 'No', b.createdAt.toISOString(),
      ]),
    );
  }

  private filtered(userId: number, { patientId, paymentStatus, overdue, search }: ListBillsQueryDto): SelectQueryBuilder<Bill> {
    const qb = this.bills.createQueryBuilder('bill').innerJoinAndSelect('bill.patient', 'patient').where('patient.user_id = :userId', { userId });
    if (patientId) qb.andWhere('bill.patient_id = :patientId', { patientId });
    if (paymentStatus) qb.andWhere('bill.payment_status = :paymentStatus', { paymentStatus });
    if (overdue) qb.andWhere('bill.due_date < CURRENT_DATE').andWhere('bill.payment_status IN (:...open)', { open: OPEN_STATUSES });
    if (search) {
      const invoice = search.match(/^(?:inv-?)?(\d+)$/i);
      qb.andWhere(
        invoice ? '(bill.description ILIKE :search OR patient.name ILIKE :search OR bill.id = :invoiceId)' : '(bill.description ILIKE :search OR patient.name ILIKE :search)',
        { search: `%${search}%`, invoiceId: invoice ? Number(invoice[1]) : undefined },
      );
    }
    return qb;
  }

  /** Loads a bill only if it belongs to the caller's account; otherwise it "does not exist". */
  private async owned(userId: number, id: number): Promise<Bill> {
    const bill = await this.bills.findOne({
      where: { id, patient: { userId } },
      relations: { patient: true, payments: true },
      order: { payments: { id: 'DESC' } },
    });
    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);
    return bill;
  }

  private async assertPatientOwned(userId: number, patientId: number): Promise<void> {
    if (!(await this.patients.exist({ where: { id: patientId, userId } }))) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }
  }
}
