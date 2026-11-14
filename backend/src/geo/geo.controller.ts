import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { GeoService } from './geo.service';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('address') address?: string,
    @Query('venue') venue?: string,
  ) {
    return this.geoService.search({
      q: q?.trim() || undefined,
      address: address?.trim() || undefined,
      venue: venue?.trim() || undefined,
    });
  }
}
