import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, TokenPayload } from './token-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: TokenPayload): AuthUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Token de acceso no válido',
      });
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
