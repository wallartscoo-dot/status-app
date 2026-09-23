export interface StatusItem {
  id: string;
  title: string;
  category: string;
  duration: string; // e.g. "00:30"
  thumbnailUrl: string;
  mediaUrl?: string; // full-resolution media (video/image) — used for download/share
  type?: "VIDEO" | "IMAGE" | "QUOTE";
  views: number;
  downloads: number;
  creatorUsername: string;
  isFavorited?: boolean;
}

// Placeholder thumbnails (picsum) so the UI has real images to lay out against
// during Phase 1. Swap for real CDN URLs once media storage (Phase 3) is wired up.
function thumb(seed: string) {
  return `https://picsum.photos/seed/${seed}/400/640`;
}

export const TRENDING_STATUSES: StatusItem[] = [
  { id: "1", title: "Golden Hour Vibes", category: "Aesthetic", duration: "00:15", thumbnailUrl: thumb("gold1"), views: 128000, downloads: 9400, creatorUsername: "noor.edits" },
  { id: "2", title: "Attitude King 👑", category: "Attitude", duration: "00:22", thumbnailUrl: thumb("att2"), views: 89000, downloads: 6100, creatorUsername: "royal.status" },
  { id: "3", title: "Missing You Tonight", category: "Sad", duration: "00:30", thumbnailUrl: thumb("sad3"), views: 45300, downloads: 3200, creatorUsername: "emo.clips" },
  { id: "4", title: "Rise & Grind 💪", category: "Motivation", duration: "00:18", thumbnailUrl: thumb("mot4"), views: 210000, downloads: 15800, creatorUsername: "grindmode" },
  { id: "5", title: "Best Friends Forever", category: "Friendship", duration: "00:12", thumbnailUrl: thumb("fri5"), views: 67000, downloads: 4900, creatorUsername: "squadgoals" },
  { id: "6", title: "Jummah Mubarak", category: "Islamic", duration: "00:20", thumbnailUrl: thumb("isl6"), views: 154000, downloads: 12200, creatorUsername: "noor.deen" },
];

export const NEW_STATUSES: StatusItem[] = [
  { id: "7", title: "Midnight Thoughts", category: "Aesthetic", duration: "00:25", thumbnailUrl: thumb("mid7"), views: 3200, downloads: 210, creatorUsername: "moon.child" },
  { id: "8", title: "Funny Fail Compilation", category: "Funny", duration: "00:29", thumbnailUrl: thumb("fun8"), views: 8900, downloads: 640, creatorUsername: "lolzone" },
  { id: "9", title: "Happy Birthday Sparkles", category: "Birthday", duration: "00:10", thumbnailUrl: thumb("bday9"), views: 1200, downloads: 98, creatorUsername: "partyvibes" },
  { id: "10", title: "Travel the World", category: "Travel", duration: "00:28", thumbnailUrl: thumb("trv10"), views: 5400, downloads: 410, creatorUsername: "wanderclips" },
];
