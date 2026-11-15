import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/token-payload';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { UserRole } from '../users/user-role.enum';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('events/:eventId/staff/invite')
  @ResponseMessage('Invitación de staff enviada')
  invite(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: InviteStaffDto,
  ) {
    return this.staffService.invite(eventId, dto, user);
  }

  @Get('events/:eventId/staff')
  list(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.listForEvent(eventId, user);
  }

  @Delete('events/:eventId/staff/:staffId')
  @ResponseMessage('Staff removido del evento')
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.removeFromEvent(eventId, staffId, user);
  }

  @Get('staff/my-events')
  myEvents(@CurrentUser() user: AuthUser) {
    if (user.role !== UserRole.STAFF && user.role !== UserRole.OWNER) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Solo el personal de acceso puede ver sus eventos',
      });
    }
    if (user.role === UserRole.OWNER) {
      return [];
    }
    return this.staffService.myEvents(user.id);
  }

  @Get('staff/events/:eventId')
  eventForScanner(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffService.getEventForScanner(eventId, user);
  }
}
