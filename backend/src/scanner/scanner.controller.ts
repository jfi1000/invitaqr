import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/token-payload';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user-role.enum';
import { ScanQrDto } from './dto/scan-qr.dto';
import { ScannerService } from './scanner.service';

@ApiTags('scanner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('validate')
  validate(@CurrentUser() user: AuthUser, @Body() dto: ScanQrDto) {
    if (user.role !== UserRole.STAFF && user.role !== UserRole.OWNER) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Solo el personal de acceso puede escanear',
      });
    }
    return this.scannerService.validate(dto, user.id);
  }
}
