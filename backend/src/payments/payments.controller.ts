import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResponseMessage } from '../common/response-message.decorator';
import { CreateOrderDto, ListPaymentsQueryDto, PaymentFailedDto, VerifyPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Each order is a real Razorpay API call, so it is limited more tightly than the rest of the API. */
  @Post('orders')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ResponseMessage('Razorpay order created')
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.payments.createOrder(user.id, dto.billId);
  }

  @Post('verify')
  @HttpCode(200)
  @ResponseMessage('Payment verified successfully')
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyPaymentDto) {
    return this.payments.verifyPayment(user.id, dto);
  }

  @Post('failed')
  @HttpCode(200)
  @ResponseMessage('Payment failure recorded')
  failed(@CurrentUser() user: AuthUser, @Body() dto: PaymentFailedDto) {
    return this.payments.markFailed(user.id, dto);
  }

  /** Payment history: GET /payments?billId=1&status=Paid&page=1&limit=10 */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPaymentsQueryDto) {
    return this.payments.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.payments.findOne(user.id, id);
  }
}
