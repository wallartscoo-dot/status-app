import type { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service";
import { asyncHandler } from "../utils/asyncHandler";

export const trackEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventType, metadata } = req.body as {
    eventType: analyticsService.AnalyticsEventType;
    metadata: Record<string, unknown>;
  };
  // Fire-and-forget from the client's perspective: always 202, even if the
  // insert fails, since analytics must never block or error out a user
  // action. Errors are still logged server-side by the global error handler
  // if recordEvent throws synchronously before the response is sent.
  await analyticsService.recordEvent(req.user?.sub, eventType, metadata).catch(() => {});
  res.status(202).json({ ok: true });
});
