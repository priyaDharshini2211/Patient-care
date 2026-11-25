import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../patients/patient.entity';
import { Bill } from './bill.entity';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, Patient])],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
