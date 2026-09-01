import { Router } from "express";
import { z } from "zod";
import * as creatorController from "../controllers/creator.controller";
import { optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const usernameParamSchema = z.object({ username: z.string().trim().min(1) });

router.get("/:username", optionalAuth, validate(usernameParamSchema, "params"), creatorController.getByUsername);

export default router;
