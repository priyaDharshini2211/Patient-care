import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { PaymentStatus } from '../common/enums';
import { Bill } from '../bills/bill.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bill_id' })
  billId: number;

  @ManyToOne(() => Bill, (bill) => bill.payments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill: Relation<Bill>;

  @Column({ name: 'razorpay_order_id', length: 64, unique: true })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', type: 'varchar', length: 64, nullable: true, unique: true })
  razorpayPaymentId: string | null;

  @Column({ name: 'razorpay_signature', type: 'varchar', length: 255, nullable: true })
  razorpaySignature: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.Pending,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
