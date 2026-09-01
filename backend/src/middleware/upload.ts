import multer from "multer";
import type { Request } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const ALLOWED_VIDEO_MIME = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export const ALLOWED_MEDIA_MIME = new Set([...ALLOWED_VIDEO_MIME, ...ALLOWED_IMAGE_MIME]);

export function extensionFor(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? "bin";
}

export function isVideoMime(mime: string) {
  return ALLOWED_VIDEO_MIME.has(mime);
}

// Memory storage: files are validated and handed to the storage adapter
// (src/config/storage.ts) rather than ever touching disk unvalidated.
const memoryStorage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MEDIA_MIME.has(file.mimetype)) {
    return cb(
      ApiError.badRequest(
        `Unsupported file type '${file.mimetype}'. Allowed: mp4, mov, webm, jpg, png, webp.`
      )
    );
  }
  cb(null, true);
}

// Multer's own limit is set to the larger of the two caps (video); the
// controller re-checks against the tighter image cap for image uploads,
// since multer can't know the MIME type until the file starts streaming.
const maxBytes = Math.max(env.MAX_VIDEO_MB, env.MAX_IMAGE_MB) * 1024 * 1024;

export const uploadMedia = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: maxBytes, files: 1 },
}).single("media");
