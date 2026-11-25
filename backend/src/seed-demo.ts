/**
 * Optional demo data: `npm run seed:demo` fills the seeded admin account with ~14 patients and ~30 bills spread over the
 * last 6 months (paid / pending / overdue / failed / cancelled) so the dashboard charts have something to show.
 * It never touches other accounts and refuses to run twice unless `--force` is passed.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Bill } from './bills/bill.entity';
import { calculateTotal } from './bills/bills.service';
import { BloodGroup, Gender, PaymentStatus } from './common/enums';
import { Patient } from './patients/patient.entity';
import { Payment } from './payments/payment.entity';
import { User } from './users/user.entity';

// Small deterministic PRNG so every run produces the same demo clinic.
const random = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const PEOPLE: [string, number, Gender, BloodGroup, string][] = [
  ['Asha Verma', 34, Gender.Female, BloodGroup.OPositive, 'Indiranagar, Bengaluru'],
  ['Rohan Mehta', 41, Gender.Male, BloodGroup.APositive, 'Andheri West, Mumbai'],
  ['Priya Nair', 29, Gender.Female, BloodGroup.BPositive, 'Kakkanad, Kochi'],
  ['Karthik Subramanian', 52, Gender.Male, BloodGroup.ABPositive, 'T. Nagar, Chennai'],
  ['Neha Kapoor', 27, Gender.Female, BloodGroup.ONegative, 'Saket, New Delhi'],
  ['Imran Sheikh', 38, Gender.Male, BloodGroup.BNegative, 'Banjara Hills, Hyderabad'],
  ['Lakshmi Iyer', 66, Gender.Female, BloodGroup.APositive, 'Adyar, Chennai'],
  ['Arjun Reddy', 8, Gender.Male, BloodGroup.OPositive, 'Jubilee Hills, Hyderabad'],
  ['Sneha Joshi', 45, Gender.Female, BloodGroup.ANegative, 'Koregaon Park, Pune'],
  ['Vikram Singh', 58, Gender.Male, BloodGroup.OPositive, 'Sector 17, Chandigarh'],
  ['Ananya Das', 31, Gender.Female, BloodGroup.BPositive, 'Salt Lake, Kolkata'],
  ['Farhan Ali', 23, Gender.Male, BloodGroup.APositive, 'Gomti Nagar, Lucknow'],
  ['Meera Pillai', 72, Gender.Female, BloodGroup.ABNegative, 'Vyttila, Kochi'],
  ['Sam Taylor', 36, Gender.Other, BloodGroup.OPositive, 'Whitefield, Bengaluru'],
];

const SERVICES: [string, number][] = [
  ['General consultation', 500], ['Blood test panel', 1200], ['Chest X-Ray', 900], ['Dental cleaning', 1500], ['ECG', 700],
  ['Physiotherapy session', 800], ['Vaccination', 450], ['MRI scan', 6500], ['Eye examination', 600], ['Follow-up visit', 300],
];

const NOTES = ['Allergic to penicillin', 'Type 2 diabetes - monitor sugar levels', 'Prefers morning appointments', null, null, 'Hypertension, on medication'];

const DAY = 86_400_000;

async function run() {
  const force = process.argv.includes('--force');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();

  const user = await dataSource.getRepository(User).findOneByOrFail({ email });
  const existing = await dataSource.getRepository(Patient).count({ where: { userId: user.id } });
  if (existing >= 5 && !force) {
    console.log(`${email} already has ${existing} patients - nothing to do (use --force to add the demo data anyway).`);
    await app.close();
    return;
  }

  const rnd = random(2026);
  const pick = <T>(items: T[]) => items[Math.floor(rnd() * items.length)];
  const now = Date.now();
  let billCount = 0;

  const taken = new Set((await dataSource.getRepository(Patient).find({ where: { userId: user.id }, select: { email: true } })).map((p) => p.email));
  let patientCount = 0;

  await dataSource.transaction(async (manager) => {
    for (const [index, [name, age, gender, bloodGroup, address]] of PEOPLE.entries()) {
      const patientEmail = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
      if (taken.has(patientEmail)) continue; // already in this account (e.g. an earlier test patient)
      patientCount += 1;
      const registered = new Date(now - (20 + rnd() * 150) * DAY);
      const patient = await manager.save(
        manager.create(Patient, {
          userId: user.id,
          name,
          age,
          gender,
          bloodGroup,
          address,
          phone: `+91 98${String(10000000 + Math.floor(rnd() * 89999999))}`,
          email: patientEmail,
          notes: pick(NOTES),
          createdAt: registered, // explicit timestamps: no UPDATE, so the updated_at triggers cannot overwrite them
          updatedAt: registered,
        }),
      );

      const visits = 1 + Math.floor(rnd() * 3) + (index % 3 === 0 ? 1 : 0);
      for (let visit = 0; visit < visits; visit += 1) {
        const [description, amount] = pick(SERVICES);
        const tax = Math.round(amount * pick([0, 0.05, 0.12, 0.18]));
        const created = new Date(registered.getTime() + rnd() * (now - registered.getTime()));
        const due = new Date(created.getTime() + 15 * DAY);
        const roll = rnd();
        const status = roll < 0.58 ? PaymentStatus.Paid : roll < 0.84 ? PaymentStatus.Pending : roll < 0.92 ? PaymentStatus.Failed : PaymentStatus.Cancelled;

        const bill = await manager.save(
          manager.create(Bill, {
            patientId: patient.id,
            description,
            amount,
            tax,
            totalAmount: calculateTotal(amount, tax),
            dueDate: due.toISOString().slice(0, 10),
            paymentStatus: status,
            createdAt: created,
            updatedAt: created,
          }),
        );
        billCount += 1;

        if (status === PaymentStatus.Paid || status === PaymentStatus.Failed) {
          const attempted = new Date(Math.min(now, created.getTime() + (1 + rnd() * 6) * DAY));
          await manager.save(
            manager.create(Payment, {
              billId: bill.id,
              razorpayOrderId: `order_demo_${bill.id}`,
              razorpayPaymentId: `pay_demo_${bill.id}`,
              razorpaySignature: 'demo-signature',
              amount: bill.totalAmount,
              currency: 'INR',
              paymentStatus: status,
              failureReason: status === PaymentStatus.Failed ? 'Payment declined by the bank' : null,
              createdAt: attempted,
              updatedAt: attempted,
            }),
          );
        }
      }
    }
  });

  console.log(`Seeded ${patientCount} patients and ${billCount} bills for ${email}.`);
  await app.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
