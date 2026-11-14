import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/token-payload';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateGuestDto } from './dto/create-guest.dto';
import { CsvUpload, GuestsService } from './guests.service';

class ImportTextDto {
  @ApiProperty({
    example: 'Ana López 5512345678\nLuis Pérez luis@correo.com',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  text: string;
}

@ApiTags('guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post('import-csv')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1_048_576 } }),
  )
  importCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: CsvUpload | undefined,
  ) {
    return this.guestsService.importCsv(eventId, file, user.id);
  }

  @Post('import-text')
  importText(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: ImportTextDto,
  ) {
    return this.guestsService.importText(eventId, body.text, user.id);
  }

  @Post('ensure-passes')
  ensurePasses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guestsService.ensurePasses(eventId, user.id);
  }

  @Get('passes/:passId/qr')
  getPassQr(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('passId', ParseUUIDPipe) passId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guestsService.getPassQr(eventId, passId, user.id);
  }

  @Post(':guestId/send-invite')
  sendInvite(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guestsService.sendInvite(eventId, guestId, user.id);
  }

  @Post()
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGuestDto,
  ) {
    return this.guestsService.createOne(eventId, dto, user.id);
  }

  @Get()
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guestsService.findAll(eventId, user.id);
  }
}
