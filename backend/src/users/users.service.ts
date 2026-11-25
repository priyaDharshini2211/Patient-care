import { ConflictException, Injectable } from '@nestjs/common';
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
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

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
