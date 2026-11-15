import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SetStaffPasswordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inviteToken: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
