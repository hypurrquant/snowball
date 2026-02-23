import type { Request, Response, NextFunction } from "express";
import { AppError } from "@snowball/shared";
import { logger } from "../logger";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "Internal server error",
      statusCode: 500,
    },
  });
}
