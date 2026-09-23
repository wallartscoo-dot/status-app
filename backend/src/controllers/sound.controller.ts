import type { Request, Response } from "express";
import * as soundService from "../services/sound.service";
import * as soundFavoriteService from "../services/soundFavorite.service";
import { asyncHandler } from "../utils/asyncHandler";

export const listSounds = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as soundService.ListSoundsParams;
  const result = await soundService.listSounds({ ...query, viewerId: req.user?.sub });
  res.json(result);
});

export const trending = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, category } = req.query as unknown as { page: number; limit: number; category?: "MUSIC" | "ISLAMIC" };
  const result = await soundService.trendingSounds({ page, limit, category, viewerId: req.user?.sub });
  res.json(result);
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q, page, limit, category, islamicSubcategory } = req.query as unknown as {
    q: string;
    page: number;
    limit: number;
    category?: "MUSIC" | "ISLAMIC";
    islamicSubcategory?: string;
  };
  const result = await soundService.searchSounds({
    q,
    page,
    limit,
    category,
    islamicSubcategory: islamicSubcategory as any,
    viewerId: req.user?.sub,
  });
  res.json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const sound = await soundService.getSoundById(id, req.user?.sub);
  res.json({ sound });
});

export const videosForSound = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await soundService.listVideosForSound(id, { page, limit, viewerId: req.user?.sub });
  res.json(result);
});

export const meta = asyncHandler(async (_req: Request, res: Response) => {
  const result = await soundService.listSoundMeta();
  res.json(result);
});

export const surahs = asyncHandler(async (_req: Request, res: Response) => {
  const result = await soundService.listSurahs();
  res.json(result);
});

export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await soundFavoriteService.addSoundFavorite(req.user!.sub, id);
  res.status(result.alreadyFavorited ? 200 : 201).json(result);
});

export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await soundFavoriteService.removeSoundFavorite(req.user!.sub, id);
  res.status(204).send();
});

export const listFavorites = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await soundFavoriteService.listSoundFavorites(req.user!.sub, { page, limit });
  res.json(result);
});
