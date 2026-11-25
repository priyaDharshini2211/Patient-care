import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';

describe('PatientsService account isolation', () => {
  it('cannot read another accounts patient', async () => {
    const patients = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new PatientsService(patients as never, {} as never);

    await expect(service.findOne(2, 10)).rejects.toBeInstanceOf(NotFoundException);
    expect(patients.findOne).toHaveBeenCalledWith({ where: { id: 10, userId: 2 } });
  });

  it('stamps new patients with the creating account', async () => {
    const patients = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 1, ...value })),
    };
    const service = new PatientsService(patients as never, {} as never);

    const created = await service.create(9, { name: 'A', age: 30, gender: 'Male', phone: '1234567', email: 'a@b.co', address: 'x' } as never);
    expect(created.userId).toBe(9);
  });

  it('checks patient email uniqueness within the account only', async () => {
    const patients = { findOne: jest.fn().mockResolvedValue({ id: 4 }) };
    const service = new PatientsService(patients as never, {} as never);

    await expect(service.create(9, { email: 'dup@b.co' } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(patients.findOne).toHaveBeenCalledWith({ where: { email: 'dup@b.co', userId: 9 }, select: { id: true } });
  });

  it('will not delete a patient who has bills', async () => {
    const patients = { findOne: jest.fn().mockResolvedValue({ id: 1 }), remove: jest.fn() };
    const bills = { exist: jest.fn().mockResolvedValue(true) };
    const service = new PatientsService(patients as never, bills as never);

    await expect(service.remove(1, 1)).rejects.toBeInstanceOf(ConflictException);
    expect(patients.remove).not.toHaveBeenCalled();
  });
});
