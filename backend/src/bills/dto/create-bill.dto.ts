import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaymentStatus } from '../../common/enums';

const MAX_MONEY = 10_000_000;
export const MANUAL_STATUSES = [PaymentStatus.Pending, PaymentStatus.Cancelled];

export class CreateBillDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'A valid patient must be selected' })
  @IsPositive({ message: 'A valid patient must be selected' })
  patientId: number;

  @ApiProperty({ example: 'General consultation' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Service / description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 500, description: 'Amount before tax, max 2 decimals' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with at most 2 decimals' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  @Max(MAX_MONEY, { message: `Amount must not exceed ${MAX_MONEY}` })
  amount: number;

  @ApiPropertyOptional({ example: 90, description: 'Tax as an absolute amount (not a percentage)', default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tax must be a number with at most 2 decimals' })
  @Min(0, { message: 'Tax cannot be negative' })
  @Max(MAX_MONEY)
  tax?: number;

  @ApiPropertyOptional({ example: '2026-12-15', description: 'Payment deadline (YYYY-MM-DD)', nullable: true })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Due date must be a valid date (YYYY-MM-DD)' })
  dueDate?: string | null;

  @ApiPropertyOptional({
    enum: MANUAL_STATUSES,
    default: PaymentStatus.Pending,
    description: 'Paid and Failed are set only by the payment flow; manually a bill can be Pending or Cancelled.',
  })
  @IsOptional()
  @IsIn(MANUAL_STATUSES, { message: 'Status can only be set to Pending or Cancelled; payments mark bills Paid' })
  paymentStatus?: PaymentStatus;
}
