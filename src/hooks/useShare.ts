import { useCallback } from "react";
import { Share } from "react-native";
import { track } from "@/utils/analytics";

/**
 * Spec section 12: "Allow users to share content using the device's native
 * share sheet where technically permitted" — WhatsApp/Instagram/Facebook/
 * Messenger/Telegram/Copy Link all show up here because they're whatever
 * share targets are installed on the device; React Native's Share API is
 * the correct (and only honest) way to reach that sheet without pretending
 * to have direct per-app integrations Expo doesn't provide.
 */
export function useShare() {
  return useCallback(async (title: string, mediaUrl: string) => {
    try {
      const result = await Share.share(
        {
          message: `Check out "${title}" on Status App: ${mediaUrl}`,
          url: mediaUrl, // iOS uses `url`; Android folds it into `message` above
          title,
        },
        { dialogTitle: `Share "${title}"` }
      );
      if (result.action === Share.sharedAction) track("status_shared", { title });
    } catch {
      // User dismissed the share sheet or it failed silently — nothing to do.
    }
  }, []);
}
