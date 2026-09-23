import type { Request, Response } from "express";
import * as favoriteService from "../services/favorite.service";
import { asyncHandler } from "../utils/asyncHandler";

export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await favoriteService.addFavorite(req.user!.sub, id);
  res.status(result.alreadyFavorited ? 200 : 201).json(result);
});

export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await favoriteService.removeFavorite(req.user!.sub, id);
  res.status(204).send();
});

export const listFavorites = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await favoriteService.listFavorites(req.user!.sub, { page, limit });
  res.json(result);
});
