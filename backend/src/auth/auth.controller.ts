import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { REFRESH_COOKIE } from '../common/constants';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SetStaffPasswordDto } from '../staff/dto/set-staff-password.dto';
import { StaffService } from '../staff/staff.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly staffService: StaffService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ResponseMessage('Cuenta creada')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(dto);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Public()
  @Post('login')
  @ResponseMessage('Sesión iniciada')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(dto);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Public()
  @Post('refresh')
  @ResponseMessage('Token renovado')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH',
        message: 'La sesión expiró. Vuelve a iniciar sesión',
      });
    }
    const session = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, session.refreshToken);
    return session;
  }

  @Public()
  @Get('staff/invite-status')
  inviteStatus(@Query('token') token?: string) {
    return this.staffService.getInviteStatus(token ?? '');
  }

  @Public()
  @Post('staff/set-password')
  @ResponseMessage('Contraseña establecida')
  setStaffPassword(@Body() dto: SetStaffPasswordDto) {
    return this.staffService.setPassword(dto.inviteToken, dto.password);
  }

  @Public()
  @Post('logout')
  @ResponseMessage('Sesión cerrada')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
    return { loggedOut: true };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const maxAge = this.refreshMaxAgeMs();
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge,
    });
  }

  private refreshMaxAgeMs() {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const match = /^(\d+)([dhms])$/.exec(raw);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };
    return amount * multipliers[unit];
  }
}
