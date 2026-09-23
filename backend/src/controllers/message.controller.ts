import type { Request, Response } from "express";
import * as messageService from "../services/message.service";
import { asyncHandler } from "../utils/asyncHandler";

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await messageService.listConversations(req.user!.sub, page, limit);
  res.json(result);
});

export const startConversation = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const conversation = await messageService.startConversationByUsername(req.user!.sub, username);
  res.status(201).json({ conversation });
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await messageService.listMessages(id, req.user!.sub, page, limit);
  res.json(result);
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { body } = req.body as { body: string };
  const message = await messageService.sendMessage(id, req.user!.sub, body);
  res.status(201).json({ message });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await messageService.markConversationRead(id, req.user!.sub);
  res.status(204).send();
});
