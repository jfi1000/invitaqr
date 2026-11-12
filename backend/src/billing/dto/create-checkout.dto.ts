import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { PaidPlan } from '../payment.entity';

export class CreateCheckoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ enum: ['BASIC', 'PRO'] })
  @IsIn(['BASIC', 'PRO'])
  plan: PaidPlan;
}
