import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

type ValidateTarget = "body" | "query" | "params";

/**
 * Validates req[target] against a zod schema. On success, replaces
 * req[target] with the parsed (and coerced/defaulted) value.
 */
export function validate(schema: ZodSchema, target: ValidateTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(ApiError.badRequest("Validation failed", fieldErrors));
    }
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
