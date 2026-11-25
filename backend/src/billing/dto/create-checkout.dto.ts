import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaidPlan } from '../payment.entity';

export class CreateCheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ enum: ['BASIC', 'PRO'] })
  @IsIn(['BASIC', 'PRO'])
  plan: PaidPlan;

  @ApiPropertyOptional({
    description: 'Regreso a la app tras el pago. Debe incluir {CHECKOUT_SESSION_ID}.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Regreso a la app si el usuario cancela.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelUrl?: string;
}
