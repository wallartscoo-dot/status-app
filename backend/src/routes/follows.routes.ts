import { Router } from "express";
import { z } from "zod";
import * as followController from "../controllers/follow.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationSchema } from "../validators/status.validators";

const router = Router();

const userIdParamSchema = z.object({ userId: z.string().uuid("Invalid userId") });

// GET /api/follows/feed must be declared before the (nonexistent here, but
// kept consistent with status.routes.ts's static-before-dynamic pattern)
// dynamic paths in case this file grows more :userId routes later.
router.get("/feed", requireAuth, validate(paginationSchema, "query"), followController.followingFeed);

router.post("/:userId", requireAuth, validate(userIdParamSchema, "params"), followController.followUser);
router.delete("/:userId", requireAuth, validate(userIdParamSchema, "params"), followController.unfollowUser);

export default router;
