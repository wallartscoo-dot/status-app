import type { IslamicSubcategory } from "@/services/api";

export type LibraryTabKey = "ALL" | "MUSIC" | "TRENDING" | "ISLAMIC" | "FAVORITES";

export const LIBRARY_TABS: { key: LibraryTabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "MUSIC", label: "Music" },
  { key: "TRENDING", label: "Trending" },
  { key: "ISLAMIC", label: "Islamic" },
  { key: "FAVORITES", label: "Favorites" },
];

// Fallback list used before /api/sounds/meta resolves (and offline). Kept in
// sync with backend/src/services/sound.service.ts's listSoundMeta().
export const ISLAMIC_SUBCATEGORIES: { key: IslamicSubcategory; label: string; emoji: string }[] = [
  { key: "QURAN", label: "Quran Recitation", emoji: "📖" },
  { key: "NAAT", label: "Naat", emoji: "🤲" },
  { key: "HAMD", label: "Hamd", emoji: "🌙" },
  { key: "DUA", label: "Dua", emoji: "🕋" },
  { key: "AZKAR", label: "Azkar", emoji: "📿" },
  { key: "DUROOD", label: "Durood", emoji: "❤️" },
  { key: "BAYAN", label: "Bayan / Nasihat", emoji: "🎙️" },
];

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatUsageCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
