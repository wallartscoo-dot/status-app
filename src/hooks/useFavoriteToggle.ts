import { useCallback } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { track } from "@/utils/analytics";

/**
 * Returns a handler for StatusCard's onToggleFavorite prop that syncs the
 * change to POST/DELETE /api/statuses/:id/favorite. Guests are redirected to
 * sign up instead of hitting the (auth-only) endpoint.
 */
export function useFavoriteToggle() {
  const { user } = useAuth();

  return useCallback(
    (id: string, nextFavorited: boolean) => {
      if (!user || user.isGuest) {
        router.push("/(auth)/signup");
        return;
      }
      track(nextFavorited ? "status_favorited" : "status_unfavorited", { statusId: id });
      const call = nextFavorited ? api.statuses.favorite(id) : api.statuses.unfavorite(id);
      call.catch(() => {
        // Silent best-effort sync; the card's local optimistic state is left
        // as-is so a flaky network blip doesn't visibly flicker the heart.
      });
    },
    [user]
  );
}
