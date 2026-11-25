import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResponseMessage } from '../common/response-message.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPatientsQueryDto) {
    return this.patients.findAll(user.id, query);
  }

  /** CSV download of every patient matching the current search/filter (not just one page). */
  @Get('export')
  async export(@CurrentUser() user: AuthUser, @Query() query: ListPatientsQueryDto, @Res() res: Response) {
    const csv = await this.patients.exportCsv(user.id, query);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="patients.csv"' }).send(csv);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.patients.findOne(user.id, id);
  }

  @Post()
  @ResponseMessage('Patient created')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(user.id, dto);
  }

  @Put(':id')
  @ResponseMessage('Patient updated')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto) {
    return this.patients.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ResponseMessage('Patient deleted')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.patients.remove(user.id, id);
  }
}
