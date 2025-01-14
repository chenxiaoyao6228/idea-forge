interface ClientEnv {
  CLIENT_APP_URL: string;
  COLLAB_TOKEN: string;
  CLIENT_COLLAB_WS_URL: string;
}

export const getEnvVariable = <K extends keyof ClientEnv>(key: K): ClientEnv[K] => {
  if (!window.__ENV__) {
    throw new Error("Environment variables not initialized");
  }
  return window.__ENV__[key];
};
