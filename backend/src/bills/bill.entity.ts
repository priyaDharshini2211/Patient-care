import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { PaymentStatus } from '../common/enums';
import { Patient } from '../patients/patient.entity';
import { Payment } from '../payments/payment.entity';

@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'patient_id' })
  patientId: number;

  @ManyToOne(() => Patient, (patient) => patient.bills, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient: Relation<Patient>;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  tax: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  totalAmount: number;

  /** Payment deadline (YYYY-MM-DD). Open bills past this date are reported as overdue. */
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.Pending,
  })
  paymentStatus: PaymentStatus;

  @OneToMany(() => Payment, (payment) => payment.bill)
  payments: Relation<Payment[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
