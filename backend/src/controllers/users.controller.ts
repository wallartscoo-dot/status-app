import type { Request, Response } from "express";
import { pool } from "../config/db";
import { toPublicUser } from "../utils/serializers";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import type { UserRow, ProfileRow } from "../types/db";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { rows: userRows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [
    req.user!.sub,
  ]);
  const user = userRows[0];
  if (!user) throw ApiError.notFound("User not found");

  const { rows: profileRows } = await pool.query<ProfileRow>(
    "SELECT * FROM profiles WHERE user_id = $1",
    [user.id]
  );

  res.json({ user: toPublicUser(user, profileRows[0] ?? null) });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, bio, avatarUrl, notificationPrefs } = req.body as {
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
    notificationPrefs?: Partial<{
      favorites: boolean;
      newFromCreator: boolean;
      trending: boolean;
      system: boolean;
    }>;
  };

  if (fullName !== undefined) {
    await pool.query("UPDATE users SET full_name = $1 WHERE id = $2", [fullName, req.user!.sub]);
  }

  await pool.query(
    `INSERT INTO profiles (user_id, bio, avatar_url)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       bio = COALESCE($2, profiles.bio),
       avatar_url = COALESCE($3, profiles.avatar_url)`,
    [req.user!.sub, bio ?? null, avatarUrl ?? null]
  );

  if (notificationPrefs) {
    // Merge rather than replace, so PATCHing one toggle doesn't clobber the rest.
    await pool.query(
      `UPDATE profiles SET notification_prefs = notification_prefs || $2::jsonb WHERE user_id = $1`,
      [req.user!.sub, JSON.stringify(notificationPrefs)]
    );
  }

  const { rows: userRows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [
    req.user!.sub,
  ]);
  const { rows: profileRows } = await pool.query<ProfileRow>(
    "SELECT * FROM profiles WHERE user_id = $1",
    [req.user!.sub]
  );

  res.json({ user: toPublicUser(userRows[0], profileRows[0] ?? null) });
});
