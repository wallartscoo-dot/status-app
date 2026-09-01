import type { Request, Response } from "express";
import * as downloadService from "../services/download.service";
import { asyncHandler } from "../utils/asyncHandler";

export const recordDownload = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const download = await downloadService.recordDownload(req.user!.sub, id);
  res.status(201).json({ download });
});

export const listDownloads = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await downloadService.listDownloads(req.user!.sub, page, limit);
  res.json(result);
});
