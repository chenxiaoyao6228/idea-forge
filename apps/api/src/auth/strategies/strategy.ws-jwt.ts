// api/src/auth/strategies/strategy.ws-jwt.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtConfig } from "@/_shared/config/configs";
import type { ConfigType } from "@nestjs/config";
import { Inject } from "@nestjs/common";
import { AuthService } from "../auth.service";
import type { Socket } from "socket.io";

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, "ws-jwt") {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (socket: Socket) => {
          return socket.handshake.query.token?.toString() || socket.handshake.headers.authorization?.toString().split(" ")[1];
        },
      ]),
      secretOrKey: jwtConfiguration.secret,
      ignoreExpiration: false,
    });
  }

  getTokenFromSocket(socket: Socket) {
    return socket.handshake.query.token?.toString() || socket.handshake.headers.authorization?.toString().split(" ")[1];
  }

  async validate(payload: any) {
    const { sub: userId } = payload;
    return this.authService.validateJWTToken(userId);
  }
}
