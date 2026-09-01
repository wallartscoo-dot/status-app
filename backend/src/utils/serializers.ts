import type { UserRow, ProfileRow } from "../types/db";

/** Never send password_hash (or other internal fields) to the client. */
export function toPublicUser(user: UserRow, profile?: ProfileRow | null) {
  return {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    isCreator: user.is_creator,
    joinedAt: user.created_at,
    profile: profile
      ? {
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          totalDownloads: profile.total_downloads,
          totalFavorites: profile.total_favorites,
          totalUploads: profile.total_uploads,
          followerCount: profile.follower_count,
          notificationPrefs: profile.notification_prefs,
        }
      : null,
  };
}
