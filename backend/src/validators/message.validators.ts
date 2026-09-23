import { z } from "zod";
import { paginationSchema } from "./status.validators";

export const listConversationsQuerySchema = paginationSchema;

export const conversationIdParamSchema = z.object({
  id: z.string().uuid("Invalid conversation id"),
});

export const usernameParamSchema = z.object({
  username: z.string().trim().min(1),
});

export const listMessagesQuerySchema = paginationSchema;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(2000),
});
