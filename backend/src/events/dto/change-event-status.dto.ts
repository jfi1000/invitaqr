import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { EventStatus } from '../event-status.enum';

export class ChangeEventStatusDto {
  @ApiProperty({ enum: EventStatus })
  @IsEnum(EventStatus)
  status: EventStatus;

  @ApiPropertyOptional({
    description: 'Si es true al suspender, avisa por email a los invitados confirmados',
  })
  @IsOptional()
  @IsBoolean()
  notifyGuests?: boolean;
}
