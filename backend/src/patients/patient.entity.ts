import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BloodGroup, Gender } from '../common/enums';
import { Bill } from '../bills/bill.entity';
import { User } from '../users/user.entity';

@Entity('patients')
@Unique('UQ_patients_owner_email', ['userId', 'email'])
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  /** The account (clinic) that owns this record. Every query is scoped by it. */
  @Index()
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  owner: Relation<User> | null;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'smallint' })
  age: number;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender_enum' })
  gender: Gender;

  @Column({ name: 'blood_group', type: 'varchar', length: 3, nullable: true })
  bloodGroup: BloodGroup | null;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 150 })
  email: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Bill, (bill) => bill.patient)
  bills: Relation<Bill[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
