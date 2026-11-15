import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteStaffDto {
  @ApiProperty({ example: 'María Acceso' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'staff@ejemplo.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;
}
