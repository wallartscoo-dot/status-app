import { Router } from "express";
import * as messageController from "../controllers/message.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listConversationsQuerySchema,
  conversationIdParamSchema,
  usernameParamSchema,
  listMessagesQuerySchema,
  sendMessageSchema,
} from "../validators/message.validators";

const router = Router();

// Messaging is friends-only functionality — every route requires a real
// (non-guest) account.
router.use(requireAuth);

router.get("/conversations", validate(listConversationsQuerySchema, "query"), messageController.listConversations);

router.post(
  "/start/:username",
  validate(usernameParamSchema, "params"),
  messageController.startConversation
);

router.get(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema, "params"),
  validate(listMessagesQuerySchema, "query"),
  messageController.listMessages
);

router.post(
  "/conversations/:id/messages",
  validate(conversationIdParamSchema, "params"),
  validate(sendMessageSchema),
  messageController.sendMessage
);

router.patch(
  "/conversations/:id/read",
  validate(conversationIdParamSchema, "params"),
  messageController.markRead
);

export default router;
