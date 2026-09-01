import { Router } from "express";
import * as statusController from "../controllers/status.controller";
import * as favoriteController from "../controllers/favorite.controller";
import * as downloadController from "../controllers/download.controller";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadMedia } from "../middleware/upload";
import {
  listStatusesQuerySchema,
  trendingQuerySchema,
  searchQuerySchema,
  categoryParamSchema,
  idParamSchema,
  createStatusSchema,
  uploadStatusSchema,
  reportStatusSchema,
  paginationSchema,
} from "../validators/status.validators";

const router = Router();

// --- Static paths first (must precede the /:id catch-all) ---
router.get("/trending", optionalAuth, validate(trendingQuerySchema, "query"), statusController.trending);
router.get(
  "/for-you",
  optionalAuth,
  validate(paginationSchema.pick({ limit: true }), "query"),
  statusController.forYou
);
router.get("/search", optionalAuth, validate(searchQuerySchema, "query"), statusController.search);
router.get(
  "/category/:category",
  optionalAuth,
  validate(categoryParamSchema, "params"),
  validate(listStatusesQuerySchema, "query"),
  statusController.byCategory
);

// Real file upload (Phase 3): multipart/form-data, field name "media" for
// the file plus title/description/type/categoryKey/durationSec/hashtags as
// text fields. uploadMedia (multer) runs first so req.file + req.body are
// populated before validation.
router.post("/upload", requireAuth, uploadMedia, validate(uploadStatusSchema), statusController.upload);

// Metadata-only creation (Phase 2 behavior) — kept for QUOTE statuses,
// which have no file to upload, and for admin/seeding tooling.
router.post("/", requireAuth, validate(createStatusSchema), statusController.create);

router.get("/", optionalAuth, validate(listStatusesQuerySchema, "query"), statusController.listStatuses);

// --- Favorite toggle ---
router.post("/:id/favorite", requireAuth, validate(idParamSchema, "params"), favoriteController.addFavorite);
router.delete("/:id/favorite", requireAuth, validate(idParamSchema, "params"), favoriteController.removeFavorite);

// --- Download (Phase 3) ---
router.post("/:id/download", requireAuth, validate(idParamSchema, "params"), downloadController.recordDownload);

// --- Report ---
router.post(
  "/:id/report",
  requireAuth,
  validate(idParamSchema, "params"),
  validate(reportStatusSchema),
  statusController.report
);

// --- Dynamic :id last ---
router.get("/:id", optionalAuth, validate(idParamSchema, "params"), statusController.getById);

export default router;
