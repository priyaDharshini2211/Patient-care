import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService, toProfile } from '../users/users.service';
import { ChangePasswordDto, RegisterDto, UpdateProfileDto } from './auth.dto';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.create({ name: dto.name, email: dto.email, password: dto.password, clinicName: dto.clinicName });
    return this.issueSession(user);
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findByEmailWithPassword(email);
    // Same message for unknown email and wrong password to avoid user enumeration.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.users.touchLogin(user.id);
    return this.issueSession(user);
  }

  async me(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User no longer exists');
    return toProfile(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return toProfile(await this.users.updateProfile(userId, dto));
  }

  async changePassword(userId: number, { currentPassword, newPassword }: ChangePasswordDto) {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user) throw new UnauthorizedException('User no longer exists');
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) throw new BadRequestException('New password must be different from the current one');
    await this.users.setPassword(userId, newPassword);
    return { changed: true };
  }

  private async issueSession(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: toProfile(user) };
  }
}
