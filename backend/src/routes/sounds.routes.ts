import { Router } from "express";
import * as soundController from "../controllers/sound.controller";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationSchema, idParamSchema } from "../validators/status.validators";
import {
  listSoundsQuerySchema,
  trendingSoundsQuerySchema,
  searchSoundsQuerySchema,
  soundIdParamSchema,
} from "../validators/sound.validators";

const router = Router();

// --- Static paths first (must precede the /:id catch-all) ---
router.get("/trending", optionalAuth, validate(trendingSoundsQuerySchema, "query"), soundController.trending);
router.get("/search", optionalAuth, validate(searchSoundsQuerySchema, "query"), soundController.search);
router.get("/meta", soundController.meta);
router.get("/quran/surahs", soundController.surahs);

// --- Favorites ("Favorites" tab of the library) ---
router.get("/favorites/mine", requireAuth, validate(paginationSchema, "query"), soundController.listFavorites);

router.get("/", optionalAuth, validate(listSoundsQuerySchema, "query"), soundController.listSounds);

// --- Dynamic :id routes ---
router.post("/:id/favorite", requireAuth, validate(soundIdParamSchema, "params"), soundController.addFavorite);
router.delete("/:id/favorite", requireAuth, validate(soundIdParamSchema, "params"), soundController.removeFavorite);
router.get(
  "/:id/videos",
  optionalAuth,
  validate(soundIdParamSchema, "params"),
  validate(paginationSchema, "query"),
  soundController.videosForSound
);
router.get("/:id", optionalAuth, validate(idParamSchema, "params"), soundController.getById);

export default router;
