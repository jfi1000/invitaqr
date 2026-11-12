import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. La app móvil lo envía aquí. La PWA puede omitirlo y usar la cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
