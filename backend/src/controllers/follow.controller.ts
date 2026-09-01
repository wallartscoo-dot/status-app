import type { Request, Response } from "express";
import * as followService from "../services/follow.service";
import { asyncHandler } from "../utils/asyncHandler";

export const followUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await followService.follow(req.user!.sub, userId);
  res.status(201).json(result);
});

export const unfollowUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  await followService.unfollow(req.user!.sub, userId);
  res.status(204).send();
});

export const followingFeed = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await followService.followingFeed(req.user!.sub, page, limit);
  res.json(result);
});
