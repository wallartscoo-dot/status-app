import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { pool } from "../config/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/** Requires a valid access token. Rejects guests. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized("Missing bearer token"));
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

/** Attaches req.user if a valid token is present, but allows guests through. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Invalid token on an optional route: proceed as guest rather than failing.
  }
  next();
}

/**
 * Requires an authenticated ADMIN. Must run after requireAuth.
 *
 * Deliberately re-checks the role in the database rather than trusting the
 * `role` claim baked into the access token at login time. Access tokens are
 * short-lived but not instant — an admin promotion, demotion, or ban should
 * take effect on the next request, not wait for the token to expire and
 * refresh. This costs one indexed lookup per admin request, which is the
 * right tradeoff for an authorization boundary this sensitive.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  try {
    const { rows } = await pool.query<{ role: string; is_banned: boolean }>(
      "SELECT role, is_banned FROM users WHERE id = $1",
      [req.user.sub]
    );
    const current = rows[0];
    if (!current || current.is_banned) return next(ApiError.forbidden("Admin access required"));
    if (current.role !== "ADMIN") return next(ApiError.forbidden("Admin access required"));
    next();
  } catch (err) {
    next(err);
  }
}
