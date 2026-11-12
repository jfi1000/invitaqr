import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/token-payload';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user-role.enum';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    if (user.role !== UserRole.PLANNER && user.role !== UserRole.OWNER) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Solo el organizador puede pagar un evento',
      });
    }
    return this.billingService.createCheckoutSession(
      dto.eventId,
      dto.plan,
      user.id,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string | string[],
  ) {
    const header = Array.isArray(signature) ? signature[0] : signature ?? '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    return this.billingService.handleWebhook(rawBody, header);
  }
}
