import type { ApiStatus } from "@/services/api";
import type { StatusItem } from "@/constants/mockData";

function formatDuration(sec: number | null): string {
  if (sec === null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function mapApiStatus(item: ApiStatus): StatusItem {
  return {
    id: item.id,
    title: item.title,
    category: item.category.label,
    duration: formatDuration(item.durationSec),
    thumbnailUrl: item.thumbnailUrl ?? item.mediaUrl,
    mediaUrl: item.mediaUrl,
    type: item.type,
    views: item.viewCount,
    downloads: item.downloadCount,
    creatorUsername: item.creator.username,
    isFavorited: item.isFavorited,
  };
}
