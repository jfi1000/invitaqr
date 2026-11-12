import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

  @ApiProperty({ example: '2026-12-01T23:00:00.000Z' })
  @IsDateString()
  ends_at: string;

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
}
