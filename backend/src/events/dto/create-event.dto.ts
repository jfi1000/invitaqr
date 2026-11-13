import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EventPlan } from '../event-plan.enum';
import { EventType } from '../event-type.enum';

export class CreateEventDto {
  @ApiProperty({ example: 'Boda de Ana y Luis', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiProperty({ example: '2026-12-01T18:00:00.000Z' })
  @IsDateString()
  starts_at: string;

  @ApiPropertyOptional({
    example: '2026-12-01T23:00:00.000Z',
    description: 'Si se omite, el evento termina en el mismo momento en que empieza',
  })
  @IsOptional()
  @IsDateString()
  ends_at?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @ApiPropertyOptional({ example: '2026-11-25T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  rsvp_deadline?: string;

  @ApiPropertyOptional({ enum: EventPlan, default: EventPlan.FREE })
  @IsOptional()
  @IsEnum(EventPlan)
  plan?: EventPlan;

  @ApiPropertyOptional({ enum: EventType, default: EventType.SOCIAL })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  has_tables?: boolean;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  table_count?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  default_max_companions?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  has_zones?: boolean;

  @ApiPropertyOptional({ example: 'General, VIP, Staff' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  zones?: string;

  @ApiPropertyOptional({ description: 'Logo en data URL base64' })
  @IsOptional()
  @IsString()
  logo?: string;
}
