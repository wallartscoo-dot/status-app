import { z } from "zod";
import { paginationSchema } from "./status.validators";

export const soundCategorySchema = z.enum(["MUSIC", "ISLAMIC"]);
export const islamicSubcategorySchema = z.enum([
  "QURAN",
  "NAAT",
  "HAMD",
  "DUA",
  "AZKAR",
  "DUROOD",
  "BAYAN",
]);

// GET /api/sounds — browse/filter. `tab` mirrors the app's top nav
// (All | Music | Trending | Islamic | Favorites); "TRENDING" and
// "FAVORITES" are handled by dedicated routes/services, so this schema
// only needs to cover the plain browse filters.
export const listSoundsQuerySchema = paginationSchema.extend({
  category: soundCategorySchema.optional(),
  islamicSubcategory: islamicSubcategorySchema.optional(),
  genre: z.string().trim().toLowerCase().optional(),
  mood: z.string().trim().toLowerCase().optional(),
  surahNumber: z.coerce.number().int().min(1).max(114).optional(),
});

export const trendingSoundsQuerySchema = paginationSchema.extend({
  category: soundCategorySchema.optional(),
});

export const searchSoundsQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1, "Search query 'q' is required").max(80),
  category: soundCategorySchema.optional(),
  islamicSubcategory: islamicSubcategorySchema.optional(),
});

export const soundIdParamSchema = z.object({
  id: z.string().uuid("Invalid sound id"),
});

export const surahNumberParamSchema = z.object({
  number: z.coerce.number().int().min(1).max(114),
});

// Body accepted when a user contributes their own (properly owned/licensed)
// audio to the library — separate from the admin-curated catalog, gated by
// requiring an explicit source + attribution so nothing is added silently
// as if it were pre-cleared content.
export const createUserSoundSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(120).optional(),
  category: soundCategorySchema,
  islamicSubcategory: islamicSubcategorySchema.optional(),
  audioUrl: z.string().url(),
  artworkUrl: z.string().url().optional(),
  durationSec: z.coerce.number().int().min(1).max(600),
  source: z.enum(["USER_UPLOADED"]).default("USER_UPLOADED"),
  attribution: z.string().trim().max(300).optional(),
});
