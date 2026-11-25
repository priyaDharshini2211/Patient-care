import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from './password.rules';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normaliseEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Dr. Meera Nair' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'meera@clinic.com' })
  @Transform(normaliseEmail)
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'Str0ngPassw0rd' })
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiPropertyOptional({ example: 'Nair Family Clinic' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  clinicName?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Send an empty string to clear it' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  clinicName?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
