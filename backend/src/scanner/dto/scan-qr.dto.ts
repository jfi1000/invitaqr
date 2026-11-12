import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ScanQrDto {
  @ApiProperty({ description: 'JWT del código QR' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  qrToken: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;
}
