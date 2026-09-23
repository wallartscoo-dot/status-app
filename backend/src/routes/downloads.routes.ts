import { Router } from "express";
import * as downloadController from "../controllers/download.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationSchema } from "../validators/status.validators";

const router = Router();

router.get("/", requireAuth, validate(paginationSchema, "query"), downloadController.listDownloads);

export default router;
