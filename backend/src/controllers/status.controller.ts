import type { Request, Response } from "express";
import * as statusService from "../services/status.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { storage } from "../config/storage";
import { extensionFor, isVideoMime } from "../middleware/upload";
import { env } from "../config/env";

export const listStatuses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, category, type } = req.query as unknown as {
    page: number;
    limit: number;
    category?: string;
    type?: "VIDEO" | "IMAGE" | "QUOTE";
  };
  const result = await statusService.listStatuses({ page, limit, category, type, viewerId: req.user?.sub });
  res.json(result);
});

export const trending = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, windowDays } = req.query as unknown as { page: number; limit: number; windowDays: number };
  const result = await statusService.trendingStatuses({ page, limit, windowDays, viewerId: req.user?.sub });
  res.json(result);
});

export const forYou = asyncHandler(async (req: Request, res: Response) => {
  const { limit } = req.query as unknown as { limit: number };
  const result = await statusService.recommendedStatuses(req.user?.sub, limit);
  res.json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const status = await statusService.getStatusById(id, req.user?.sub);
  res.json({ status });
});

export const byCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params as { category: string };
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await statusService.statusesByCategory(category, { page, limit, viewerId: req.user?.sub });
  res.json(result);
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q, page, limit } = req.query as unknown as { q: string; page: number; limit: number };
  const result = await statusService.searchStatuses({ q, page, limit, viewerId: req.user?.sub });
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const status = await statusService.createStatus(req.user!.sub, req.body);
  res.status(201).json({ status });
});

// Real file upload (Phase 3). Multer (src/middleware/upload.ts) has already
// validated the MIME type and buffered the file in req.file by the time we
// get here; this handler validates the type-specific size cap, persists the
// file via the storage adapter, then creates the status row pointing at the
// resulting URL — mirroring exactly what `create` above does for
// metadata-only (Phase 2) status creation.
export const upload = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest("A 'media' file is required");

  const isVideo = isVideoMime(file.mimetype);
  if (req.body.type === "VIDEO" && !isVideo) {
    throw ApiError.badRequest("type is VIDEO but the uploaded file is not a video");
  }
  if (req.body.type === "IMAGE" && isVideo) {
    throw ApiError.badRequest("type is IMAGE but the uploaded file is a video");
  }

  const capMb = isVideo ? env.MAX_VIDEO_MB : env.MAX_IMAGE_MB;
  if (file.size > capMb * 1024 * 1024) {
    throw ApiError.badRequest(`File exceeds the ${capMb}MB limit for ${isVideo ? "videos" : "images"}`);
  }

  const mediaUrl = await storage.save({
    buffer: file.buffer,
    subdir: isVideo ? "videos" : "images",
    extension: extensionFor(file.mimetype),
  });

  const status = await statusService.createStatus(req.user!.sub, {
    title: req.body.title,
    description: req.body.description || undefined,
    type: req.body.type,
    mediaUrl,
    // No real thumbnail generation in Phase 3 (that needs ffmpeg for video
    // frame extraction) — the client shows a local preview before publish,
    // and the media itself is used as the thumbnail source on cards for now.
    thumbnailUrl: isVideo ? undefined : mediaUrl,
    durationSec: req.body.durationSec,
    fileSize: file.size,
    mimeType: file.mimetype,
    categoryKey: req.body.categoryKey,
    hashtags: req.body.hashtags ?? [],
  });

  res.status(201).json({ status });
});

export const report = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await statusService.reportStatus(id, req.user!.sub, req.body);
  res.status(201).json({ report: result });
});
