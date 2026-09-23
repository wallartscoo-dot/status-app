import { useCallback } from "react";
import { router } from "expo-router";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/utils/analytics";

/** Same optimistic-sync pattern as useFavoriteToggle, for sounds instead of statuses. */
export function useSoundFavoriteToggle() {
  const { user } = useAuth();

  return useCallback(
    (id: string, nextFavorited: boolean) => {
      if (!user || user.isGuest) {
        router.push("/(auth)/signup");
        return;
      }
      track(nextFavorited ? "sound_favorited" : "sound_unfavorited", { soundId: id });
      const call = nextFavorited ? api.sounds.favorite(id) : api.sounds.unfavorite(id);
      call.catch(() => {
        // Silent best-effort sync, matching useFavoriteToggle's behavior.
      });
    },
    [user]
  );
}
