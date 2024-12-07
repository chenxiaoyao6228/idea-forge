import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { join } from "path";
import * as fs from "fs";
import { jwtConfig } from "@/auth/config/jwt.config";
import { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "@/auth/auth.service";
import { UserService } from "@/user/user.service";
import { setAuthCookies } from "@/_shared/utils/cookie";

// Skip authentication for these paths
const skipAuthPaths = ["/register", "/login", "/reset-password"];

// https://stackoverflow.com/questions/55335096/excluding-all-api-routes-in-nest-js-to-serve-react-app

// TODO: There's a Vite plugin that can get the manifest.json after Vite build, read it and check if CSS files need to be handled
@Injectable()
export class FallbackMiddleware implements NestMiddleware {
  @Inject(jwtConfig.KEY)
  private readonly jwtConfiguration: ConfigType<typeof jwtConfig>;

  @Inject(JwtService)
  private readonly jwtService: JwtService;

  @Inject(UserService)
  private readonly userService: UserService;

  @Inject(AuthService)
  private readonly authService: AuthService;

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Exclude API paths
      if (req.url.includes("/api")) {
        next();
      } else if (req.url.includes("/__open-stack-frame-in-editor")) {
        next();
      }
      // Exclude static assets
      else if (
        req.url.match(
          /\.(jpg|jpeg|png|gif|ico|css|js|json|svg|mp3|mp4|wav|ogg|ttf|woff|woff2|eot|html|txt)$/
        )
      ) {
        next();
      } else {
        const result = await this.renderApp(req, res);
        return res.send(result);
      }
    } catch (error) {
      console.error("Fallback middleware error:", error);
      next(error);
    }
  }

  private async renderApp(req: Request, res: Response) {
    console.log("====renderApp==== ");
    const isDev = process.env.NODE_ENV === "development";
    const vitePort = process.env.PORT || 5173;

    // Only get user info if not on skipAuthPaths
    const needAuth = !skipAuthPaths.some((path) => req.url.includes(path));

    const { accessToken, refreshToken } = req.cookies;

    if (needAuth && !accessToken && !refreshToken) {
      // No tokens, redirect to login page with current path
      const currentPath = req.url;
      const redirectTo = encodeURIComponent(currentPath);
      return res.redirect(`/login?redirectTo=${redirectTo}`);
    }

    const userInfo = needAuth ? await this.getUserInfo(req, res) : null;

    const renderDevScript = () => `
      <script type="module">
        import RefreshRuntime from 'http://localhost:${vitePort}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module" src="http://localhost:${vitePort}/@vite/client"></script>
      <script type="module" src="http://localhost:${vitePort}/src/index.tsx"></script>
    `;

    const renderProdScript = () => {
      try {
        const manifestPath = join(
          __dirname,
          "..",
          "view",
          ".vite",
          "manifest.json"
        );
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        const entryPoint = manifest["src/main.tsx"];

        return `${
          entryPoint.css
            ? entryPoint.css
                .map((css) => `<link rel="stylesheet" href="${css}">`)
                .join("\n")
            : ""
        }
          <script type="module" src="${entryPoint.file}"></script>
        `;
      } catch (error) {
        console.error("Failed to read manifest.json:", error);
        return '<script>console.error("Failed to load application");</script>';
      }
    };

    const renderEnv = () => {
      return `<script>console.log("NODE_ENV", "${process.env.NODE_ENV}")</script>`;
    };

    const renderUserInfoScript = () => {
      if (!needAuth) return "";

      return `
        <script>
          function decodeHtml(str) {
            try {
              return JSON.parse(new DOMParser().parseFromString(str, 'text/html').documentElement.textContent);
            } catch (err) {
              return '';
            }
          }
        </script>
        <script id="userHook">
          window._userInfo = decodeHtml('${JSON.stringify(userInfo)}');
          console.log("userInfo", window._userInfo);
        </script>
      `;
    };

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Vite + React + TS</title>
        </head>
        <body>
          <div id="root"></div>
          ${renderUserInfoScript()}
          ${renderEnv()}
          ${isDev ? renderDevScript() : renderProdScript()}
        </body>
      </html>
    `;

    return html;
  }

  private async getUserInfo(req: Request, res: Response) {
    const { accessToken, refreshToken } = req.cookies;

    if (!accessToken || !refreshToken) {
      return null;
    }

    try {
      const payload = this.jwtService.verify(accessToken, {
        secret: this.jwtConfiguration.secret,
      });
      return await this.userService.getUserById(payload.sub);
    } catch (error) {
      if (error.name === "TokenExpiredError" && refreshToken) {
        try {
          const refreshPayload = this.jwtService.verify(refreshToken, {
            secret: this.jwtConfiguration.secret,
          });

          const user = await this.userService.getUserById(refreshPayload.sub);

          if (user) {
            const {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            } = await this.authService.refreshToken(user);

            setAuthCookies(res, newAccessToken, newRefreshToken);

            return user;
          }
        } catch (refreshError) {
          console.log("Failed to refresh token:", refreshError);
        }
      }
    }
    return null;
  }
}
