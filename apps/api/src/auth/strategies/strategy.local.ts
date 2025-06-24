import { Strategy as PassportLocalStrategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Inject } from "@nestjs/common";
import { AuthService } from "../auth.service";

export class LocalStrategy extends PassportStrategy(PassportLocalStrategy) {
  constructor() {
    super({
      usernameField: "email",
    });
  }

  @Inject(AuthService)
  private authService: AuthService;

  async validate(email: string, password: string) {
    console.log("LocalStrategy validate", email, password);
    return await this.authService.validateLocalUser(email, password);
  }
}
