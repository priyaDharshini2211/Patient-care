import { NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '../common/enums';
import { BillsService, calculateTotal, invoiceNumber, isBillOverdue } from './bills.service';

describe('calculateTotal', () => {
  it('adds amount and tax', () => {
    expect(calculateTotal(500, 90)).toBe(590);
  });

  it('defaults tax to zero', () => {
    expect(calculateTotal(250.5)).toBe(250.5);
  });

  it('avoids floating point drift', () => {
    expect(calculateTotal(0.1, 0.2)).toBe(0.3);
  });
});

describe('invoiceNumber', () => {
  it('is zero padded', () => {
    expect(invoiceNumber(12)).toBe('INV-00012');
    expect(invoiceNumber(123456)).toBe('INV-123456');
  });
});

describe('isBillOverdue', () => {
  const now = new Date('2026-11-25T12:00:00Z');

  it('is overdue when money is owed and the due date has passed', () => {
    expect(isBillOverdue(PaymentStatus.Pending, '2026-11-24', now)).toBe(true);
    expect(isBillOverdue(PaymentStatus.Failed, '2026-01-01', now)).toBe(true);
  });

  it('is not overdue on the due date itself or before it', () => {
    expect(isBillOverdue(PaymentStatus.Pending, '2026-11-25', now)).toBe(false);
    expect(isBillOverdue(PaymentStatus.Pending, '2026-12-01', now)).toBe(false);
  });

  it('is never overdue when paid, cancelled or without a due date', () => {
    expect(isBillOverdue(PaymentStatus.Paid, '2026-01-01', now)).toBe(false);
    expect(isBillOverdue(PaymentStatus.Cancelled, '2026-01-01', now)).toBe(false);
    expect(isBillOverdue(PaymentStatus.Pending, null, now)).toBe(false);
  });
});

describe('BillsService account isolation', () => {
  it('looks bills up through the callers patient ownership, so other accounts bills do not exist', async () => {
    const bills = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new BillsService(bills as never, {} as never);

    await expect(service.findOne(5, 99)).rejects.toBeInstanceOf(NotFoundException);
    expect(bills.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 99, patient: { userId: 5 } } }));
  });

  it('refuses to bill a patient that belongs to another account', async () => {
    const patients = { exist: jest.fn().mockResolvedValue(false) };
    const service = new BillsService({} as never, patients as never);

    await expect(service.create(5, { patientId: 3, description: 'x', amount: 100 })).rejects.toBeInstanceOf(NotFoundException);
    expect(patients.exist).toHaveBeenCalledWith({ where: { id: 3, userId: 5 } });
  });
});
