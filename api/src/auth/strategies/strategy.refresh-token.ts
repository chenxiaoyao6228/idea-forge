import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as PassportJWTStrategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import type { AuthJwtPayload } from '../types/auth-jwtPayload';
import { AuthService } from '../auth.service';
import {refreshJwtConfig} from '../config/refresh.config';
import type { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(PassportJWTStrategy, 'refresh-jwt') {
  constructor(
    @Inject(refreshJwtConfig.KEY)
    private readonly refreshJwtConfiguration: ConfigType<typeof refreshJwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refreshToken;
        },
      ]),
      secretOrKey: refreshJwtConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  @Inject(AuthService)
  private readonly authService: AuthService;

  async validate(req: Request, payload: AuthJwtPayload) {
    const { sub: userId } = payload;
    const refreshToken = req.cookies.refreshToken;

    return this.authService.validateRefreshToken(userId, refreshToken);
  }
}
