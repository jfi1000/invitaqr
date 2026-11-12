import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ConfirmRsvpDto } from './dto/confirm-rsvp.dto';
import { DeclineRsvpDto } from './dto/decline-rsvp.dto';
import { RsvpService } from './rsvp.service';

@ApiTags('rsvp')
@Public()
@Controller('rsvp')
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Get(':token')
  getPass(@Param('token', ParseUUIDPipe) token: string) {
    return this.rsvpService.getPass(token);
  }

  @Post(':token/confirm')
  confirm(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() dto: ConfirmRsvpDto,
  ) {
    return this.rsvpService.confirm(token, dto.companions ?? 0);
  }

  @Post(':token/decline')
  decline(
    @Param('token', ParseUUIDPipe) token: string,
    @Body() _dto: DeclineRsvpDto,
  ) {
    return this.rsvpService.decline(token);
  }
}
