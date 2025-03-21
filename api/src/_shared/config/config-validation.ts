import { z } from "zod";

export const Environment = z.enum(["development", "production", "test"]);

export const envSchema = z.object({
  /* APP CONFIG */
  NODE_ENV: Environment,
  NEST_API_PORT: z.string().min(1).regex(/^\d+$/),
  NEST_API_WS_PORT: z.string().min(1).regex(/^\d+$/),

  /* DATABASE CONFIG */
  DATABASE_URL: z.string().min(1),

  /* EMAIL CONFIG */
  EMAIL_HOST: z.string().min(1),
  EMAIL_PORT: z.string().min(1).regex(/^\d+$/),
  EMAIL_USER: z.string().min(1),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_TO: z.string().email(),
  SUPER_ADMIN_EMAIL: z.string().email(),

  /* REDIS CONFIG */
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.string().min(1).regex(/^\d+$/),

  /* AUTH CONFIG */
  SESSION_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1),

  /* OAUTH CONFIG */
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  /* OPTIONAL CONFIG */
  RESEND_API_KEY: z.string().optional(),
  COLLAB_SECRET_KEY: z.string().min(1),

  /* COS CONFIG */
  OSS_PROVIDER: z.enum(["minio", "cos", "oss"]),
  OSS_SECRET_ID: z.string().min(1),
  OSS_SECRET_KEY: z.string().min(1),
  OSS_BUCKET: z.string().min(1),
  OSS_REGION: z.string().min(1),
  OSS_ENDPOINT: z.string().url(),
  OSS_CDN_ENDPOINT: z.string().url().optional().nullable(),

  /* AI PROVIDERS */
  DEEPSEEK_API_KEY_1: z.string().min(1),

  /* SENTRY CONFIG */
  SENTRY_DSN: z.string().url().optional(),
  // Build-time variables don't need to be validated here
  // SENTRY_AUTH_TOKEN: z.string().optional(),
  // SENTRY_AUTH_TOKEN_REACT: z.string().optional(),
});

const clientEnvSchema = z.object({
  /* CLIENT CONFIG */
  CLIENT_APP_URL: z.string().url(),
  CLIENT_COLLAB_WS_URL: z.string().url(),
  CLIENT_SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const validateConfig = (config: Record<string, unknown>) => {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("\nEnvironment validation errors:");
      error.errors.forEach((err, index) => {
        console.error(`${index + 1}. ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\n");
    }
    throw error;
  }
};
