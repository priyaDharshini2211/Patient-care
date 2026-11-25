import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  /** Name of the clinic / practice this account manages (shown in the UI and on invoices). */
  @Column({ name: 'clinic_name', type: 'varchar', length: 120, nullable: true })
  clinicName: string | null;

  /** bcrypt hash - never selected by default. */
  @Column({ length: 255, select: false })
  password: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
