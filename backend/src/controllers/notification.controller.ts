import type { Request, Response } from "express";
import * as notificationService from "../services/notification.service";
import { asyncHandler } from "../utils/asyncHandler";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await notificationService.listNotifications(req.user!.sub, page, limit);
  res.json(result);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const notification = await notificationService.markRead(req.user!.sub, id);
  res.json({ notification });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.sub);
  res.status(204).send();
});
