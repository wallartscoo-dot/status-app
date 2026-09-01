import { api } from "@/services/api";

/**
 * Fire-and-forget event tracking. Never awaited by callers, never throws —
 * an analytics hiccup must never block or break a user action. Matches the
 * event-type allow-list in backend/src/services/analytics.service.ts; add
 * new types there first if you need one that isn't listed.
 */
export function track(eventType: string, metadata: Record<string, unknown> = {}) {
  api.analytics.track(eventType, metadata).catch(() => {
    // Silently dropped — analytics failures are never user-visible.
  });
}
