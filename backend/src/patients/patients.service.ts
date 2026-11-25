import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Bill } from '../bills/bill.entity';
import { toCsv } from '../common/csv.util';
import { decimalTransformer } from '../common/decimal.transformer';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient } from './patient.entity';

export interface PatientBilling {
  billsCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  lastBillAt: Date | null;
}

const EMPTY_BILLING: PatientBilling = { billsCount: 0, totalBilled: 0, totalPaid: 0, outstanding: 0, lastBillAt: null };

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Bill) private readonly bills: Repository<Bill>,
  ) {}

  async findAll(userId: number, query: ListPatientsQueryDto) {
    const { page, limit, sortBy, order } = query;
    const [items, total] = await this.filtered(userId, query)
      .orderBy(`patient.${sortBy}`, order)
      .addOrderBy('patient.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const billing = await this.billingFor(items.map((patient) => patient.id));
    return {
      items: items.map((patient) => ({ ...patient, billing: billing.get(patient.id) ?? EMPTY_BILLING })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(userId: number, id: number) {
    const patient = await this.patients.findOne({ where: { id, userId } });
    if (!patient) throw new NotFoundException(`Patient with ID ${id} not found`);
    const billing = await this.billingFor([id]);
    return { ...patient, billing: billing.get(id) ?? EMPTY_BILLING };
  }

  async create(userId: number, dto: CreatePatientDto): Promise<Patient> {
    await this.assertEmailAvailable(userId, dto.email);
    return this.patients.save(this.patients.create({ ...dto, userId }));
  }

  async update(userId: number, id: number, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.owned(userId, id);
    if (dto.email && dto.email !== patient.email) await this.assertEmailAvailable(userId, dto.email, id);
    return this.patients.save(Object.assign(patient, dto));
  }

  async remove(userId: number, id: number): Promise<{ id: number }> {
    const patient = await this.owned(userId, id);
    if (await this.bills.exist({ where: { patientId: id } })) {
      throw new ConflictException('Cannot delete a patient who has bills. Delete the bills first.');
    }
    await this.patients.remove(patient);
    return { id };
  }

  async exportCsv(userId: number, query: ListPatientsQueryDto): Promise<string> {
    const patients = await this.filtered(userId, query).orderBy(`patient.${query.sortBy}`, query.order).addOrderBy('patient.id', 'DESC').getMany();
    const billing = await this.billingFor(patients.map((patient) => patient.id));
    return toCsv(
      ['ID', 'Name', 'Age', 'Gender', 'Blood group', 'Phone', 'Email', 'Address', 'Notes', 'Bills', 'Total billed', 'Total paid', 'Outstanding', 'Registered'],
      patients.map((p) => {
        const b = billing.get(p.id) ?? EMPTY_BILLING;
        return [p.id, p.name, p.age, p.gender, p.bloodGroup, p.phone, p.email, p.address, p.notes, b.billsCount, b.totalBilled, b.totalPaid, b.outstanding, p.createdAt.toISOString()];
      }),
    );
  }

  private filtered(userId: number, { search, gender }: ListPatientsQueryDto): SelectQueryBuilder<Patient> {
    const qb = this.patients.createQueryBuilder('patient').where('patient.user_id = :userId', { userId });
    if (search) {
      qb.andWhere('(patient.name ILIKE :search OR patient.email ILIKE :search OR patient.phone ILIKE :search)', { search: `%${search}%` });
    }
    if (gender) qb.andWhere('patient.gender = :gender', { gender });
    return qb;
  }

  /** One aggregate query for a whole page of patients (no N+1). */
  private async billingFor(patientIds: number[]): Promise<Map<number, PatientBilling>> {
    const result = new Map<number, PatientBilling>();
    if (!patientIds.length) return result;

    const rows = await this.bills
      .createQueryBuilder('bill')
      .select('bill.patient_id', 'patientId')
      .addSelect('COUNT(*)', 'billsCount')
      .addSelect('COALESCE(SUM(bill.total_amount), 0)', 'totalBilled')
      .addSelect("COALESCE(SUM(bill.total_amount) FILTER (WHERE bill.payment_status = 'Paid'), 0)", 'totalPaid')
      .addSelect("COALESCE(SUM(bill.total_amount) FILTER (WHERE bill.payment_status IN ('Pending', 'Failed')), 0)", 'outstanding')
      .addSelect('MAX(bill.created_at)', 'lastBillAt')
      .where('bill.patient_id IN (:...patientIds)', { patientIds })
      .groupBy('bill.patient_id')
      .getRawMany<Record<'patientId' | 'billsCount' | 'totalBilled' | 'totalPaid' | 'outstanding' | 'lastBillAt', string>>();

    for (const row of rows) {
      result.set(Number(row.patientId), {
        billsCount: Number(row.billsCount),
        totalBilled: decimalTransformer.from(row.totalBilled),
        totalPaid: decimalTransformer.from(row.totalPaid),
        outstanding: decimalTransformer.from(row.outstanding),
        lastBillAt: row.lastBillAt ? new Date(row.lastBillAt) : null,
      });
    }
    return result;
  }

  private async owned(userId: number, id: number): Promise<Patient> {
    const patient = await this.patients.findOne({ where: { id, userId } });
    if (!patient) throw new NotFoundException(`Patient with ID ${id} not found`);
    return patient;
  }

  private async assertEmailAvailable(userId: number, email: string, excludeId?: number): Promise<void> {
    const existing = await this.patients.findOne({ where: { email, userId }, select: { id: true } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('A patient with this email already exists');
    }
  }
}
