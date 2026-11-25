import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaymentStatus } from '../../common/enums';

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'A valid bill ID is required' })
  @IsPositive({ message: 'A valid bill ID is required' })
  billId: number;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_Abc123' })
  @IsString()
  @IsNotEmpty({ message: 'razorpay_order_id is required' })
  razorpay_order_id: string;

  @ApiProperty({ example: 'pay_Abc123' })
  @IsString()
  @IsNotEmpty({ message: 'razorpay_payment_id is required' })
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'razorpay_signature is required' })
  razorpay_signature: string;
}

export class PaymentFailedDto {
  @ApiProperty({ example: 'order_Abc123' })
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @ApiPropertyOptional({ description: 'Failure description reported by Razorpay Checkout' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  billId?: number;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
