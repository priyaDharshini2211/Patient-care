import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export const BCRYPT_ROUNDS = 12;

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  clinicName: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export const toProfile = (user: User): UserProfile => ({
  id: user.id,
  name: user.name,
  email: user.email,
  clinicName: user.clinicName ?? null,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt ?? null,
});

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /** Seeds a default admin so the app is usable right after first start, and adopts data created before accounts existed. */
  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('SEED_ADMIN_EMAIL', 'admin@example.com').toLowerCase();
    let admin = await this.users.findOne({ where: { email } });

    if (!admin) {
      const password = await bcrypt.hash(this.config.get<string>('SEED_ADMIN_PASSWORD', 'Admin@123'), BCRYPT_ROUNDS);
      admin = await this.users.save(
        this.users.create({ name: this.config.get('SEED_ADMIN_NAME', 'Admin'), email, password, clinicName: 'Demo Clinic' }),
      );
      this.logger.log(`Seeded admin user ${email}`);
    }

    // Patients created before multi-account support belong to the seeded admin.
    try {
      const [, adopted] = await this.users.manager.query('UPDATE patients SET user_id = $1 WHERE user_id IS NULL', [admin.id]);
      if (adopted) this.logger.log(`Assigned ${adopted} existing patient(s) to ${email}`);
    } catch (error) {
      this.logger.warn(`Could not assign existing patients to the admin account: ${(error as Error).message}`);
    }
  }

  /** Returns the user including the password hash (for credential checks only). */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findByIdWithPassword(id: number): Promise<User | null> {
    return this.users.createQueryBuilder('user').addSelect('user.password').where('user.id = :id', { id }).getOne();
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async create(input: { name: string; email: string; password: string; clinicName?: string | null }): Promise<User> {
    if (await this.users.exist({ where: { email: input.email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const password = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    return this.users.save(this.users.create({ ...input, clinicName: input.clinicName || null, password }));
  }

  async updateProfile(id: number, changes: { name?: string; clinicName?: string | null }): Promise<User> {
    const user = await this.users.findOneOrFail({ where: { id } });
    if (changes.name !== undefined) user.name = changes.name;
    if (changes.clinicName !== undefined) user.clinicName = changes.clinicName || null;
    return this.users.save(user);
  }

  async setPassword(id: number, plainPassword: string): Promise<void> {
    await this.users.update(id, { password: await bcrypt.hash(plainPassword, BCRYPT_ROUNDS) });
  }

  async touchLogin(id: number): Promise<void> {
    await this.users.update(id, { lastLoginAt: new Date() });
  }
}
