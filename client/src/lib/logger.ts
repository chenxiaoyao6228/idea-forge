type LoggerMethods = "info" | "debug" | "error" | "warn" | "trace";
type LogArgs = any[];

export const logger = (() => {
  const methodColorMap: Record<LoggerMethods, string> = {
    debug: "#7f8c8d",
    info: "#2ecc71",
    warn: "#f39c12",
    error: "#c0392b",
    trace: "#06c8f8",
  };

  function print(method: LoggerMethods, ...args: LogArgs): void {
    const styles = [`background: ${methodColorMap[method]}`, `border-radius: 0.5em`, `color: white`, `font-weight: bold`, `padding: 2px 0.5em`];

    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      console[method](...args);
      return;
    }

    const date = new Date();
    const currentTime = `${date.toLocaleString("zh")}:${date.getMilliseconds()}`;

    const logPrefix = [`%c[${method}][${currentTime}]`, styles.join(";")];

    console[method](...logPrefix, ...args);
  }

  const methodList = Object.keys(methodColorMap) as LoggerMethods[];
  const api = {} as Record<LoggerMethods, (...args: LogArgs) => void>;

  for (const method of methodList) {
    api[method] = (...args: LogArgs) => {
      print(method, ...args);
    };
  }

  return api;
})();
