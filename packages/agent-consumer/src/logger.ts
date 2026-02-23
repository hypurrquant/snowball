import pino from "pino";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info");

export const logger = pino({
  level,
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export const monitorLogger = logger.child({ module: "monitor" });
export const chainLogger = logger.child({ module: "chain" });
export const a2aLogger = logger.child({ module: "a2a" });
export const authLogger = logger.child({ module: "auth" });
