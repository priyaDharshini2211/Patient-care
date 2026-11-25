import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 7,
    name: 'Dr Meera',
    email: 'meera@clinic.com',
    clinicName: 'Nair Clinic',
    createdAt: new Date(),
    lastLoginAt: null,
    password: bcrypt.hashSync('Correct1Horse', 4),
    ...overrides,
  }) as User;

type UsersMock = jest.Mocked<
  Pick<UsersService, 'create' | 'findByEmailWithPassword' | 'findByIdWithPassword' | 'findById' | 'touchLogin' | 'setPassword' | 'updateProfile'>
>;

describe('AuthService', () => {
  let users: UsersMock;
  let service: AuthService;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findById: jest.fn(),
      touchLogin: jest.fn(),
      setPassword: jest.fn(),
      updateProfile: jest.fn(),
    };
    service = new AuthService(users as unknown as UsersService, new JwtService({ secret: 'test-secret' }));
  });

  it('register returns a token and a profile without the password hash', async () => {
    users.create.mockResolvedValue(makeUser());
    const session = await service.register({ name: 'Dr Meera', email: 'meera@clinic.com', password: 'Correct1Horse', clinicName: 'Nair Clinic' });
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.user).toMatchObject({ id: 7, email: 'meera@clinic.com', clinicName: 'Nair Clinic' });
    expect(session.user).not.toHaveProperty('password');
  });

  it('login succeeds with the right password and records the login time', async () => {
    users.findByEmailWithPassword.mockResolvedValue(makeUser());
    const session = await service.login({ email: 'meera@clinic.com', password: 'Correct1Horse' });
    expect(session.user.id).toBe(7);
    expect(users.touchLogin).toHaveBeenCalledWith(7);
  });

  it('gives the same error for an unknown email and a wrong password (no user enumeration)', async () => {
    users.findByEmailWithPassword.mockResolvedValueOnce(null).mockResolvedValueOnce(makeUser());
    const unknown = await service.login({ email: 'x@y.com', password: 'Whatever1' }).catch((error) => error);
    const wrong = await service.login({ email: 'meera@clinic.com', password: 'Wrong1Password' }).catch((error) => error);
    expect(unknown).toBeInstanceOf(UnauthorizedException);
    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect(unknown.message).toBe(wrong.message);
    expect(users.touchLogin).not.toHaveBeenCalled();
  });

  describe('changePassword', () => {
    it('rejects a wrong current password', async () => {
      users.findByIdWithPassword.mockResolvedValue(makeUser());
      await expect(service.changePassword(7, { currentPassword: 'Nope1Nope', newPassword: 'Another1Pass' })).rejects.toBeInstanceOf(BadRequestException);
      expect(users.setPassword).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      users.findByIdWithPassword.mockResolvedValue(makeUser());
      await expect(service.changePassword(7, { currentPassword: 'Correct1Horse', newPassword: 'Correct1Horse' })).rejects.toThrow('different');
    });

    it('stores the new password', async () => {
      users.findByIdWithPassword.mockResolvedValue(makeUser());
      await expect(service.changePassword(7, { currentPassword: 'Correct1Horse', newPassword: 'Brand2NewPass' })).resolves.toEqual({ changed: true });
      expect(users.setPassword).toHaveBeenCalledWith(7, 'Brand2NewPass');
    });
  });
});
