import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Bill } from '../bills/bill.entity';
import { invoiceNumber, isBillOverdue } from '../bills/bills.service';
import { roundMoney } from '../common/decimal.transformer';
import { Gender, OPEN_STATUSES, PaymentStatus } from '../common/enums';
import { Patient } from '../patients/patient.entity';
import { Payment } from '../payments/payment.entity';

const MONTHS_SHOWN = 6;

/** ['2026-06', ..., '2026-11'] - the last `count` calendar months (UTC), oldest first. */
export const lastMonths = (count: number, now: Date = new Date()): string[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });

/** Share of invoiced-and-due money that has actually been collected, as a percentage with one decimal. */
export const collectionRate = (collected: number, outstanding: number): number => {
  const total = collected + outstanding;
  return total > 0 ? Math.round((collected / total) * 1000) / 10 : 0;
};

const money = (value: unknown): number => roundMoney(Number(value) || 0);

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Bill) private readonly bills: Repository<Bill>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(userId: number) {
    const now = new Date();
    const months = lastMonths(MONTHS_SHOWN, now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const windowStart = new Date(`${months[0]}-01T00:00:00Z`);

    const [patientCounts, genders, statusRows, billed, collected, recentPatients, recentPayments, dueBills] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE created_at >= $2) AS this_month,
                COUNT(*) FILTER (WHERE created_at >= $3 AND created_at < $2) AS last_month
           FROM patients WHERE user_id = $1`,
        [userId, monthStart, previousMonthStart],
      ),
      this.dataSource.query('SELECT gender, COUNT(*) AS count FROM patients WHERE user_id = $1 GROUP BY gender', [userId]),
      this.dataSource.query(
        `SELECT b.payment_status AS status, COUNT(*) AS count, COALESCE(SUM(b.total_amount), 0) AS amount,
                COUNT(*) FILTER (WHERE b.due_date < CURRENT_DATE AND b.payment_status = ANY($2)) AS overdue_count,
                COALESCE(SUM(b.total_amount) FILTER (WHERE b.due_date < CURRENT_DATE AND b.payment_status = ANY($2)), 0) AS overdue_amount
           FROM bills b JOIN patients p ON p.id = b.patient_id
          WHERE p.user_id = $1 GROUP BY b.payment_status`,
        [userId, OPEN_STATUSES],
      ),
      this.dataSource.query(
        `SELECT to_char(date_trunc('month', b.created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month, COALESCE(SUM(b.total_amount), 0) AS value
           FROM bills b JOIN patients p ON p.id = b.patient_id
          WHERE p.user_id = $1 AND b.created_at >= $2 AND b.payment_status <> 'Cancelled' GROUP BY 1`,
        [userId, windowStart],
      ),
      this.dataSource.query(
        `SELECT to_char(date_trunc('month', pay.updated_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month, COALESCE(SUM(pay.amount), 0) AS value
           FROM payments pay JOIN bills b ON b.id = pay.bill_id JOIN patients p ON p.id = b.patient_id
          WHERE p.user_id = $1 AND pay.payment_status = 'Paid' AND pay.updated_at >= $2 GROUP BY 1`,
        [userId, windowStart],
      ),
      this.patients.find({ where: { userId }, order: { createdAt: 'DESC', id: 'DESC' }, take: 5 }),
      this.payments.find({ where: { bill: { patient: { userId } } }, relations: { bill: { patient: true } }, order: { id: 'DESC' }, take: 6 }),
      this.bills
        .createQueryBuilder('bill')
        .innerJoinAndSelect('bill.patient', 'patient')
        .where('patient.user_id = :userId', { userId })
        .andWhere('bill.payment_status IN (:...open)', { open: OPEN_STATUSES })
        .orderBy('bill.dueDate', 'ASC', 'NULLS LAST')
        .addOrderBy('bill.id', 'ASC')
        .take(5)
        .getMany(),
    ]);

    const statusBreakdown = Object.values(PaymentStatus).map((status) => {
      const row = statusRows.find((r: { status: PaymentStatus }) => r.status === status);
      return { status, count: Number(row?.count ?? 0), amount: money(row?.amount) };
    });
    const amountOf = (status: PaymentStatus) => statusBreakdown.find((s) => s.status === status)?.amount ?? 0;
    const collectedTotal = amountOf(PaymentStatus.Paid);
    const outstanding = roundMoney(amountOf(PaymentStatus.Pending) + amountOf(PaymentStatus.Failed));
    const overdueCount = statusRows.reduce((sum: number, r: { overdue_count: string }) => sum + Number(r.overdue_count), 0);
    const overdueAmount = statusRows.reduce((sum: number, r: { overdue_amount: string }) => sum + money(r.overdue_amount), 0);

    const byMonth = (rows: { month: string; value: string }[]) => new Map(rows.map((r) => [r.month, money(r.value)]));
    const billedByMonth = byMonth(billed);
    const collectedByMonth = byMonth(collected);

    const counts = patientCounts[0];
    return {
      kpis: {
        totalPatients: Number(counts.total),
        newPatientsThisMonth: Number(counts.this_month),
        newPatientsLastMonth: Number(counts.last_month),
        totalBills: statusBreakdown.reduce((sum, s) => sum + s.count, 0),
        collected: collectedTotal,
        outstanding,
        overdueCount,
        overdueAmount: roundMoney(overdueAmount),
        collectionRate: collectionRate(collectedTotal, outstanding),
      },
      monthly: months.map((month) => ({ month, billed: billedByMonth.get(month) ?? 0, collected: collectedByMonth.get(month) ?? 0 })),
      statusBreakdown,
      genderBreakdown: Object.values(Gender).map((gender) => ({
        gender,
        count: Number(genders.find((g: { gender: Gender }) => g.gender === gender)?.count ?? 0),
      })),
      recentPatients,
      recentPayments,
      dueBills: dueBills.map((bill) => ({ ...bill, invoiceNumber: invoiceNumber(bill.id), isOverdue: isBillOverdue(bill.paymentStatus, bill.dueDate) })),
    };
  }
}
