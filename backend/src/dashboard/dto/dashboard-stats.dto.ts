import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 40 })
  totalGuests: number;

  @ApiProperty({ example: 28 })
  confirmed: number;

  @ApiProperty({ example: 4 })
  declined: number;

  @ApiProperty({ example: 3 })
  waitlist: number;

  @ApiProperty({ example: 5 })
  pending: number;

  @ApiProperty({ example: 18 })
  accessed: number;

  @ApiProperty({ example: 10 })
  notAccessed: number;

  @ApiProperty({ example: 36, description: 'Porcentaje de capacidad ya ingresada' })
  occupancyPercent: number;
}
