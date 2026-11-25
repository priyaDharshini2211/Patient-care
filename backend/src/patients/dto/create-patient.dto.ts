import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { BloodGroup, Gender } from '../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePatientDto {
  @ApiProperty({ example: 'Asha Verma' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 34, minimum: 0, maximum: 150 })
  @IsInt({ message: 'Age must be a whole number' })
  @Min(0, { message: 'Age must be between 0 and 150' })
  @Max(150, { message: 'Age must be between 0 and 150' })
  age: number;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender, { message: 'Gender must be Male, Female or Other' })
  gender: Gender;

  @ApiProperty({ example: '+91 98765 43210' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'Phone number must be 7-20 digits (may include + - ( ) and spaces)' })
  phone: string;

  @ApiProperty({ example: 'asha@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: '12 MG Road, Bengaluru' })
  @Transform(trim)
  @IsNotEmpty({ message: 'Address is required' })
  @IsString()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ enum: BloodGroup, nullable: true })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsEnum(BloodGroup, { message: 'Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-' })
  bloodGroup?: BloodGroup | null;

  @ApiPropertyOptional({ example: 'Allergic to penicillin', nullable: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
