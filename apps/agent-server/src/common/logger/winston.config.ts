import * as winston from "winston";
import * as path from "path";

const logDir = path.resolve(process.cwd(), "logs");

export const winstonConfig: winston.LoggerOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context || "App"}] ${level}: ${message}`;
        }),
      ),
    }),
    new winston.transports.File({
      dirname: logDir,
      filename: `agent-${new Date().toISOString().slice(0, 10)}.log`,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 14,
    }),
    new winston.transports.File({
      dirname: logDir,
      filename: `error-${new Date().toISOString().slice(0, 10)}.log`,
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14,
    }),
  ],
};
