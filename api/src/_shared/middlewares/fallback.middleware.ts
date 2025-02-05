import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { join } from "node:path";
import * as fs from "node:fs";
import { jwtConfig } from "@/_shared/config/configs";
import { ConfigService, ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "@/auth/auth.service";
import { UserService } from "@/user/user.service";
import { clearAuthCookies, setAuthCookies } from "@/_shared/utils/cookie";
import { ClientEnv } from "@/_shared/config/config-validation";
import { UserResponseData } from "shared";
import { CollaborationService } from "@/collaboration/collaboration.service";

interface Manifest {
  preload: string | null;
  css: string | null;
  js: string;
}

// https://stackoverflow.com/questions/55335096/excluding-all-api-routes-in-nest-js-to-serve-react-app
@Injectable()
export class FallbackMiddleware implements NestMiddleware {
  private static readonly SKIP_AUTH_PATHS = ["/login", "/register", "/verify", "/reset-password", "/forgot-password", "/auth-callback"];
  private static readonly STATIC_ASSETS_REGEX = /\.(jpg|jpeg|png|gif|ico|css|js|json|svg|mp3|mp4|wav|ogg|ttf|woff|woff2|eot|html|txt)$/;
  private static readonly API_PATH = "/api";
  private static readonly STACK_FRAME_PATH = "/__open-stack-frame-in-editor";
  private manifestCache: Manifest | null = null;
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly collaborationService: CollaborationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      if (this.shouldSkipProcessing(req)) {
        return next();
      }

      const result = await this.renderApp(req, res);
      return res.send(result);
    } catch (error) {
      console.error("Fallback middleware error:", error);
      return next(error);
    }
  }

  private shouldSkipProcessing(req: Request): boolean {
    return (
      req.url.includes(FallbackMiddleware.API_PATH) ||
      req.url.includes(FallbackMiddleware.STACK_FRAME_PATH) ||
      FallbackMiddleware.STATIC_ASSETS_REGEX.test(req.url)
    );
  }

  private redirectToLogin(req: Request, res: Response) {
    const currentPath = req.url;
    const redirectTo = encodeURIComponent(currentPath);
    clearAuthCookies(res);
    return res.redirect(`/login?redirectTo=${redirectTo}`);
  }

  private async renderApp(req: Request, res: Response) {
    console.log("====renderApp==== ");
    const isDev = this.configService.get("NODE_ENV") === "development";
    const vitePort = this.configService.get("PORT", 5173);

    // Only get user info if not on skipAuthPaths
    const needAuth = !FallbackMiddleware.SKIP_AUTH_PATHS.some((path) => req.url.includes(path));

    console.log("====renderApp==== needAuth", needAuth);

    const { accessToken, refreshToken } = req.cookies;

    if (needAuth && !accessToken && !refreshToken) {
      console.log("====renderApp==== needAuth && !accessToken && !refreshToken");
      // No tokens, redirect to login page with current path
      return this.redirectToLogin(req, res);
    }

    const userInfo = needAuth ? await this.getUserInfo(req, res) : null;

    const createDevHTML = () => {
      return {
        preload: null,
        css: null,
        js: `
            <script type="module">
              import RefreshRuntime from 'http://localhost:${vitePort}/@react-refresh'
              RefreshRuntime.injectIntoGlobalHook(window)
              window.$RefreshReg$ = () => {}
              window.$RefreshSig$ = () => (type) => type
              window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script type="module" src="http://localhost:${vitePort}/@vite/client"></script>
            <script type="module" src="http://localhost:${vitePort}/src/index.tsx"></script>
          `,
      };
    };

    const createProdHTML = () => {
      try {
        const manifest = this.loadManifest();
        const publicPath = "/";
        const entryPath = "src/index.tsx";

        const entryPoint = manifest[entryPath];
        if (!entryPoint) {
          throw new Error("Entry not found in the manifest.json file");
        }

        const preloadHtml = this.generatePreloadTags(manifest, entryPoint, publicPath);
        const cssHtml = this.generateCssTags(entryPoint);
        const jsHtml = `<script type="module" src="${entryPoint.file}"></script>`;

        return {
          preload: preloadHtml,
          css: cssHtml,
          js: jsHtml,
        };
      } catch (error) {
        console.error("Failed to create prod HTML:", error);
        return {
          preload: null,
          css: null,
          js: '<script>console.error("Failed to load application");</script>',
        };
      }
    };

    const createEnvScript = () => {
      // Filter only CLIENT_ prefixed variables
      const clientEnv = Object.entries(process.env)
        .filter(([key]) => key.startsWith("CLIENT_"))
        .reduce((acc, [key, value]) => Object.assign(acc, { [key]: value }), {} as Partial<ClientEnv>);

      return `
        <script>
          window.__ENV__ = decodeHtml('${JSON.stringify(clientEnv)}');
          console.log("clientEnv", window.__ENV__);
        </script>
      `;
    };

    const createUserInfoScript = async () => {
      if (!needAuth) return "";

      if (userInfo?.id) {
        const collabToken = await this.collaborationService.generateCollabToken(userInfo.id);
        userInfo.collabToken = collabToken;
      }

      return `
        <script id="userHook">
          window._userInfo = decodeHtml('${JSON.stringify(userInfo)}');
          console.log("userInfo", window._userInfo);
        </script>
      `;
    };

    const _html = isDev ? createDevHTML() : createProdHTML();
    const userInfoScript = await createUserInfoScript();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Idea Forge</title>
          <meta name="description" content="Powerful document tool that combines the functionality of Notion with the intelligence of AI" />
          ${_html.preload ? _html.preload : ""}
          ${_html.css ? _html.css : ""}
           <script>
            function decodeHtml(str) {
              try {
                return JSON.parse(new DOMParser().parseFromString(str, 'text/html').documentElement.textContent);
              } catch (err) {
                return '';
              }
            }
          </script>
        </head>
        <body>
          <div id="root"></div>
          ${userInfoScript}
          ${createEnvScript()}
          ${_html.js}
        </body>
      </html>
    `;

    return html;
  }

  private async getUserInfo(req: Request, res: Response): Promise<UserResponseData | null> {
    const { accessToken, refreshToken } = req.cookies;

    if (!accessToken || !refreshToken) {
      this.redirectToLogin(req, res);
      return null;
    }

    try {
      const jwtConfig = this.configService.get("jwt");
      const payload = this.jwtService.verify(accessToken, {
        secret: jwtConfig.secret,
      });

      const user = await this.userService.getUserById(payload.sub);

      if (!user) {
        this.redirectToLogin(req, res);
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName || "",
        imageUrl: user.imageUrl || "",
      };
    } catch (error) {
      console.log("====getUserInfo==== error", error);
      if ((error as any).name === "TokenExpiredError" && refreshToken) {
        try {
          const jwtConfig = this.configService.get("jwt");
          const refreshPayload = this.jwtService.verify(refreshToken, {
            secret: jwtConfig.secret,
          });

          const user = await this.userService.getUserById(refreshPayload.sub);

          if (user) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.authService.refreshToken(user);

            setAuthCookies(res, newAccessToken, newRefreshToken);

            return {
              id: user.id,
              email: user.email,
              displayName: user.displayName || "",
              imageUrl: user.imageUrl || "",
            };
          }
        } catch (refreshError) {
          console.log("Failed to refresh token:", refreshError);
          this.redirectToLogin(req, res);
        }
      }

      if ((error as any).message.includes("invalid signature")) {
        this.redirectToLogin(req, res);
      }
    }
    return null;
  }

  private loadManifest(): Record<string, any> {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    try {
      const manifestPath = join(process.cwd(), "view", ".vite", "manifest.json");
      this.manifestCache = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      return this.manifestCache || {};
    } catch (error) {
      console.error("Failed to load manifest:", error);
      return {};
    }
  }

  private generatePreloadTags(manifest: Record<string, any>, entryPoint: any, publicPath: string): string {
    const preloadList = ["src/index.tsx"];
    if (Array.isArray(entryPoint.imports)) {
      preloadList.push(...entryPoint.imports);
    }

    return preloadList
      .map((pre) => {
        if (!manifest[pre]?.file) return "";
        return `<link rel="modulepreload" href="${publicPath}${manifest[pre].file}" />`;
      })
      .join(" ");
  }

  private generateCssTags(entryPoint: any): string {
    return entryPoint.css.map((css: string) => `<link rel="stylesheet" href="${css}">`).join("\n");
  }
}
