import type { Request, Response } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";

interface CategoryWithCountRow {
  key: string;
  label: string;
  emoji: string | null;
  icon_url: string | null;
  status_count: string; // count(*) comes back as text from pg
}

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query<CategoryWithCountRow>(
    `SELECT c.key, c.label, c.emoji, c.icon_url,
            COUNT(s.id) FILTER (WHERE s.visibility = 'PUBLISHED') AS status_count
     FROM categories c
     LEFT JOIN statuses s ON s.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC`
  );

  res.json({
    categories: rows.map((c) => ({
      key: c.key,
      label: c.label,
      emoji: c.emoji,
      iconUrl: c.icon_url,
      statusCount: Number(c.status_count),
    })),
  });
});
