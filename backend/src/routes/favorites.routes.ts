import { Router } from "express";
import * as favoriteController from "../controllers/favorite.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationSchema } from "../validators/status.validators";

const router = Router();

router.get("/", requireAuth, validate(paginationSchema, "query"), favoriteController.listFavorites);

export default router;
