import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { toPublicUser } from "../utils/serializers";
import { asyncHandler } from "../utils/asyncHandler";

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);
  res.status(201).json({
    user: toPublicUser(result.user, result.profile),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    user: toPublicUser(result.user, result.profile),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const tokens = await authService.refresh(refreshToken);
  res.status(200).json(tokens);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  await authService.requestPasswordReset(email);
  res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Stateless JWT: logout is enforced client-side by discarding tokens.
  // (A refresh-token blocklist can be added here in a later phase.)
  res.status(200).json({ message: "Logged out" });
});
