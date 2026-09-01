import type { Request, Response } from "express";
import * as creatorService from "../services/creator.service";
import { asyncHandler } from "../utils/asyncHandler";

export const getByUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const creator = await creatorService.getCreatorProfile(username, req.user?.sub);
  res.json({ creator });
});
