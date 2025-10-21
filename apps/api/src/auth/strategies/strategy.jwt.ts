import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy as PassportJWTStrategy } from "passport-jwt";
import { Request } from "express";
import { jwtConfig } from "@/_shared/config/configs";
import type { ConfigType } from "@nestjs/config";
import type { AuthJwtPayload } from "../types/auth-jwtPayload";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(PassportJWTStrategy, "jwt") {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from Authorization header (for API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Then try cookies (for browser requests)
        (request: Request) => {
          return request?.cookies?.accessToken;
        },
      ]),
      secretOrKey: jwtConfiguration.secret,
      ignoreExpiration: false, // not allow expired token to be used
    });
  }

  @Inject(AuthService)
  private readonly authService: AuthService;

  validate(payload: AuthJwtPayload) {
    const { sub: userId } = payload;

    return this.authService.validateJWTToken(userId);
  }
}
