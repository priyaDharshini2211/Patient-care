import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResponseMessage } from '../common/response-message.decorator';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { ListBillsQueryDto } from './dto/list-bills-query.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@ApiTags('Bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bills')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListBillsQueryDto) {
    return this.bills.findAll(user.id, query);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.bills.stats(user.id);
  }

  @Get('export')
  async export(@CurrentUser() user: AuthUser, @Query() query: ListBillsQueryDto, @Res() res: Response) {
    const csv = await this.bills.exportCsv(user.id, query);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bills.csv"' }).send(csv);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bills.findOne(user.id, id);
  }

  @Post()
  @ResponseMessage('Bill created')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillDto) {
    return this.bills.create(user.id, dto);
  }

  @Put(':id')
  @ResponseMessage('Bill updated')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBillDto) {
    return this.bills.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ResponseMessage('Bill deleted')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bills.remove(user.id, id);
  }
}
