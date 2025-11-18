interface ClientEnv {
  CLIENT_APP_URL: string;
  CLIENT_COLLAB_WS_URL: string;
  CLIENT_SENTRY_DSN?: string; // Optional
}

// Optional environment variables (all others are required by default)
const OPTIONAL_ENV_VARS: Array<keyof ClientEnv> = [
  'CLIENT_SENTRY_DSN'
];

export const getEnvVariable = <K extends keyof ClientEnv>(key: K): ClientEnv[K] => {
  // Check if window.__ENV__ is initialized
  if (!window.__ENV__) {
    const errorMsg = `window.__ENV__ is not initialized`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const value = window.__ENV__[key];

  // Check if required variable is missing (not in optional list)
  if (!OPTIONAL_ENV_VARS.includes(key) && !value) {
    const errorMsg = `Required environment variable ${key} is not set`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return value as ClientEnv[K];
};
