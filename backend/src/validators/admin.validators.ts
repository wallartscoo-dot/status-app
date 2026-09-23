import { z } from "zod";

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUsersQuerySchema = adminPaginationSchema.extend({
  search: z.string().trim().optional(),
});

export const banUserSchema = z.object({
  banned: z.boolean(),
});

export const adminStatusesQuerySchema = adminPaginationSchema.extend({
  visibility: z.enum(["PENDING", "PUBLISHED", "REJECTED", "REMOVED"]).optional(),
});

export const moderateStatusSchema = z
  .object({
    visibility: z.enum(["PENDING", "PUBLISHED", "REJECTED", "REMOVED"]).optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine((d) => d.visibility !== undefined || d.isFeatured !== undefined, {
    message: "Provide at least one of visibility or isFeatured",
  });

export const adminReportsQuerySchema = adminPaginationSchema.extend({
  state: z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional(),
});

export const updateReportSchema = z.object({
  state: z.enum(["OPEN", "REVIEWED", "DISMISSED"]),
});

export const createCategorySchema = z.object({
  key: z.string().trim().toLowerCase().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  emoji: z.string().trim().max(8).optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateCategorySchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  emoji: z.string().trim().max(8).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });
