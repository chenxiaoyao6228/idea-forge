interface ClientEnv {
  CLIENT_APP_URL: string;
  CLIENT_COLLAB_WS_URL: string;
  CLIENT_SENTRY_DSN: string;
}

export const getEnvVariable = <K extends keyof ClientEnv>(key: K): ClientEnv[K] => {
  if (!window.__ENV__) {
    throw new Error(`Environment variable ${key} is not initialized`);
  }
  return window.__ENV__[key];
};
