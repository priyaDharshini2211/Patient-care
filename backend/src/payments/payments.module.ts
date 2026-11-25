import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from '../bills/bill.entity';
import { Payment } from './payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { razorpayProvider } from './razorpay.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Bill])],
  controllers: [PaymentsController],
  providers: [PaymentsService, razorpayProvider],
})
export class PaymentsModule {}
