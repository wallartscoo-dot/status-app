import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),

  // --- Media storage (Phase 3) ---
  // Local-disk adapter by default so Phase 3 works with zero external
  // dependencies. See src/config/storage.ts for the adapter interface —
  // swap in an S3/Cloudinary/etc. adapter there for production without
  // touching any route/controller code.
  UPLOAD_DIR: z.string().default("uploads"),
  PUBLIC_MEDIA_BASE_URL: z.string().default(""), // derived from PORT if empty, see storage.ts
  MAX_VIDEO_MB: z.coerce.number().default(30),
  MAX_IMAGE_MB: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check your .env against .env.example");
}

export const env = parsed.data;
