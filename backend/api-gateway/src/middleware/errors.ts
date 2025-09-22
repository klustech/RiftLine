import type { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err.status === "number" ? err.status : 500;
  const code = err.code ?? err.name ?? "Error";
  const message = err.message ?? "Internal server error";

  if (status >= 500) {
    logger.error({ err }, "unhandled error");
  } else {
    logger.warn({ err }, "client error");
  }

  res.status(status).json({ error: true, code, message });
}
