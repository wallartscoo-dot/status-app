import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listStatusesQuerySchema = paginationSchema.extend({
  category: z.string().trim().toLowerCase().optional(),
  type: z.enum(["VIDEO", "IMAGE", "QUOTE"]).optional(),
});

export const trendingQuerySchema = paginationSchema.extend({
  windowDays: z.coerce.number().int().min(1).max(90).default(7),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1, "Search query 'q' is required").max(80),
});

export const categoryParamSchema = z.object({
  category: z.string().trim().toLowerCase().min(1),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const createStatusSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["VIDEO", "IMAGE", "QUOTE"]),
  mediaUrl: z.string().url("mediaUrl must be a valid URL"),
  thumbnailUrl: z.string().url().optional(),
  durationSec: z.coerce.number().int().min(1).max(30).optional(),
  fileSize: z.coerce.number().int().min(1).optional(),
  mimeType: z.string().optional(),
  categoryKey: z.string().trim().toLowerCase().min(1, "categoryKey is required"),
  hashtags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(15).default([]),
}).refine((data) => data.type !== "VIDEO" || !!data.durationSec, {
  message: "durationSec is required for VIDEO statuses",
  path: ["durationSec"],
});

// Multipart uploads send everything as strings (multer parses non-file
// fields into req.body as plain strings), and the file itself arrives
// separately as req.file — so no mediaUrl/mimeType/fileSize here, and
// hashtags comes in as a comma-separated string instead of an array.
export const uploadStatusSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  type: z.enum(["VIDEO", "IMAGE"]), // QUOTE has no file to upload — use createStatusSchema for those
  durationSec: z.coerce.number().int().min(1).max(30).optional(),
  categoryKey: z.string().trim().toLowerCase().min(1, "categoryKey is required"),
  hashtags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 15)
    ),
}).refine((data) => data.type !== "VIDEO" || !!data.durationSec, {
  message: "durationSec is required for VIDEO statuses (max 30, per spec section 6)",
  path: ["durationSec"],
});

export const reportStatusSchema = z.object({
  reason: z.enum([
    "COPYRIGHT",
    "SPAM",
    "OFFENSIVE",
    "VIOLENCE",
    "SEXUAL_CONTENT",
    "HARASSMENT",
    "OTHER",
  ]),
  details: z.string().trim().max(500).optional(),
});
