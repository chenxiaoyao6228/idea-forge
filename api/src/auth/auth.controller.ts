import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtRefreshAuthGuard } from "./guards/jwt-refresh-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { GithubAuthGuard } from "./guards/github-auth.guard";
import type { Response } from "express";
import { Public } from "./decorators/public.decorator";
import { EmailVerifyDto, ForgotPasswordDto, CodeValidateDto, ResetPasswordDto, RegisterDto } from "./auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { UserService } from "@/user/user.service";
import { ApiException } from "@/_shared/model/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/error-code.constant";
import { VerificationService } from "./verification.service";
import { clearAuthCookies, setAuthCookies } from "@/_shared/utils/cookie";
import { ConfigService } from "@nestjs/config";
import { UserResponseData } from "shared";

@Controller("/api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("/code/validate")
  async validateCode(@Body() dto: CodeValidateDto) {
    return this.verificationService.validateCode(dto.email, dto.code, dto.type);
  }

  @Public()
  @Post("/code/resend")
  async resendVerificationCode(@Body() dto: EmailVerifyDto) {
    return this.authService.sendRegistrationVerificationCode(dto.email);
  }

  @Public()
  @Post("/register")
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("/login")
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.loginUser(req.user.email);

    setAuthCookies(res, accessToken, refreshToken);

    return {
      user,
    };
  }

  @Public()
  @Post("/forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("/reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetUserPassword(dto);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post("/refresh")
  async refreshToken(@Req() req: any, @Res({ passthrough: true }) res: Response): Promise<UserResponseData> {
    const { accessToken, refreshToken, user } = await this.authService.refreshToken(req.user);

    setAuthCookies(res, accessToken, refreshToken);

    return user;
  }

  @Post("/logout")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutUser(req.user.id);

    clearAuthCookies(res);

    return { message: "Logged out successfully" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("/userInfo")
  async getAuthenticatedUser(@Req() req: any) {
    try {
      const user = await this.userService.getUserById(req.user.id);

      if (!user) {
        throw new ApiException(ErrorCodeEnum.UserNotFound);
      }

      return {
        id: user.id,
        email: user.email,
        ...(user.displayName ? { displayName: user.displayName } : {}),
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Auth guard(eg: jwt) will called the corresponding strategy, use the validate method in the strategy to validate the user
  // and then add the user to the request object

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("/google/login")
  async googleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("/google/callback")
  async googleCallback(@Req() req: any, @Res() res: Response) {
    return this.handleOauthCallback(req, res);
  }

  @Public()
  @UseGuards(GithubAuthGuard)
  @Get("/github/login")
  async githubLogin() {}

  @Public()
  @UseGuards(GithubAuthGuard)
  @Get("/github/callback")
  async githubCallback(@Req() req: any, @Res() res: Response) {
    return this.handleOauthCallback(req, res);
  }
  private async handleOauthCallback(req: any, res: Response) {
    const data = req.user;
    const provider = data.providerName;

    try {
      const result = await this.authService.handleOAuthLogin(data);

      console.log("====result==== ", result);

      if (result.type === "NEW_USER" || result.type === "EXISTING_USER") {
        const { accessToken, refreshToken } = result.data;
        setAuthCookies(res, accessToken, refreshToken);
      }

      const queryParams = new URLSearchParams(
        Object.entries({
          provider,
          type: result.type,
          data: JSON.stringify(Object.fromEntries(Object.entries(result.data).filter(([key]) => !["accessToken", "refreshToken"].includes(key)))),
        }).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString();

      res.redirect(`/auth-callback?${queryParams}`);
    } catch (error: any) {
      res.redirect(`/auth-callback?type=ERROR&error=${error.code}&message=${error.message}`);
    }
  }
}
