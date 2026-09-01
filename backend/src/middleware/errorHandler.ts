import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

interface PgError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large" : `Upload error: ${err.message}`;
    return res.status(400).json({ error: { code: "BAD_REQUEST", message } });
  }

  // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  const pgErr = err as PgError;
  if (pgErr && typeof pgErr.code === "string") {
    if (pgErr.code === "23505") {
      // unique_violation
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A record with these unique fields already exists",
          details: pgErr.detail,
        },
      });
    }
    if (pgErr.code === "23503") {
      // foreign_key_violation
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Referenced record does not exist", details: pgErr.detail },
      });
    }
    if (pgErr.code === "23514") {
      // check_violation
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid value", details: pgErr.constraint },
      });
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Something went wrong",
      ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
