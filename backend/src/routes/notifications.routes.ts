import { Router } from "express";
import { z } from "zod";
import * as notificationController from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationSchema } from "../validators/status.validators";

const router = Router();

const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

router.get("/", requireAuth, validate(paginationSchema, "query"), notificationController.list);
router.patch("/:id/read", requireAuth, validate(idParamSchema, "params"), notificationController.markRead);
router.post("/read-all", requireAuth, notificationController.markAllRead);

export default router;
