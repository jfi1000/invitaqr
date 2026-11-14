import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  ValidationArguments,
} from 'class-validator';

export class CreateGuestDto {
  @ApiProperty({ example: 'Ana López', maxLength: 150 })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @ValidateBy({
    name: 'hasPhoneOrEmail',
    validator: {
      validate(_value: unknown, args: ValidationArguments) {
        const guest = args.object as CreateGuestDto;
        return Boolean(guest.phone?.trim() || guest.email?.trim());
      },
      defaultMessage: () => 'El invitado debe tener teléfono o correo',
    },
  })
  name: string;

  @ApiPropertyOptional({ example: '5512345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'ana@correo.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_companions?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  table_number?: number;

  @ApiPropertyOptional({ example: 'VIP' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  /** Si es true, tras crear se envía la invitación RSVP por correo. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1)
  @IsBoolean()
  send_invite?: boolean;
}
