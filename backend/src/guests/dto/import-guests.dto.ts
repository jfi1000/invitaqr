import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateGuestDto } from './create-guest.dto';

export class ImportGuestsDto {
  @ApiProperty({ type: [CreateGuestDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGuestDto)
  guests: CreateGuestDto[];
}
