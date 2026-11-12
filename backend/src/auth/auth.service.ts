import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserProfile } from '../users/user-profile';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './token-payload';

export const ACCESS_JWT = 'ACCESS_JWT';
export const REFRESH_JWT = 'REFRESH_JWT';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(ACCESS_JWT) private readonly accessJwt: JwtService,
    @Inject(REFRESH_JWT) private readonly refreshJwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    const user = await this.usersService.createPlanner(dto);
    return this.openSession(user.id);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.usersService.findByEmail(dto.email);
    const passwordOk = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !user.isActive || !passwordOk) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos',
      });
    }

    return this.openSession(user.id);
  }

  async refresh(refreshToken: string): Promise<Session> {
    let payload: TokenPayload;
    try {
      payload = await this.refreshJwt.verifyAsync<TokenPayload>(refreshToken);
    } catch {
      throw this.invalidRefresh();
    }

    if (payload.type !== 'refresh') {
      throw this.invalidRefresh();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw this.invalidRefresh();
    }

    return this.openSession(user.id);
  }

  private async openSession(userId: string): Promise<Session> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Sesión no válida',
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.accessJwt.signAsync({ ...payload, type: 'access' }),
      this.refreshJwt.signAsync({ ...payload, type: 'refresh' }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toProfile(user),
    };
  }

  private invalidRefresh() {
    return new UnauthorizedException({
      error: 'INVALID_REFRESH',
      message: 'La sesión expiró. Vuelve a iniciar sesión',
    });
  }
}
