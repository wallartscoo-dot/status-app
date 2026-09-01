import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Base URL comes from app.json -> expo.extra.apiUrl, overridable with
// EXPO_PUBLIC_API_URL (handy for device testing against your LAN IP, e.g.
// EXPO_PUBLIC_API_URL=http://192.168.1.23:4000 npx expo start).
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000";

const ACCESS_TOKEN_KEY = "30sec_access_token";
const REFRESH_TOKEN_KEY = "30sec_refresh_token";

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function storeTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export class ApiError extends Error {
  code?: string;
  status: number;
  field?: string;
  constructor(message: string, status: number, code?: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (e) {
    throw new ApiError(
      "Can't reach the server. Check your connection or API URL.",
      0,
      "NETWORK_ERROR"
    );
  }

  if (response.status === 401 && options.auth && !retried) {
    const refreshed = await (refreshInFlight ?? (refreshInFlight = refreshAccessToken()));
    refreshInFlight = null;
    if (refreshed) return request<T>(path, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message || body?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body?.error?.code, body?.error?.details?.field);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// --- Response shapes (mirrors backend/src/utils/serializers.ts) ---
export interface ApiCategory {
  key: string;
  label: string;
  emoji: string;
  iconUrl: string | null;
  statusCount: number;
}

export interface ApiStatus {
  id: string;
  title: string;
  description: string | null;
  type: "VIDEO" | "IMAGE" | "QUOTE";
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  viewCount: number;
  downloadCount: number;
  favoriteCount: number;
  isFeatured: boolean;
  category: { key: string; label: string; emoji: string };
  creator: { id: string; username: string; fullName: string; avatarUrl: string | null };
  hashtags: string[];
  isFavorited: boolean;
  createdAt: string;
}

export interface ApiPaginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  isCreator: boolean;
  joinedAt: string;
  profile: {
    avatarUrl: string | null;
    bio: string | null;
    totalDownloads: number;
    totalFavorites: number;
    totalUploads: number;
    followerCount: number;
    notificationPrefs: NotificationPrefs;
  };
}

export interface NotificationPrefs {
  favorites: boolean;
  newFromCreator: boolean;
  trending: boolean;
  system: boolean;
}

export interface ApiNotification {
  id: string;
  type: "WELCOME" | "TRENDING" | "FAVORITE" | "NEW_FROM_CREATOR" | "SYSTEM";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface ApiDownload {
  downloadId: string;
  state: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  downloadedAt: string;
  status: {
    id: string;
    title: string;
    type: "VIDEO" | "IMAGE" | "QUOTE";
    mediaUrl: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
    category: { key: string; label: string; emoji: string };
    creator: { username: string; fullName: string };
  };
}

export interface ApiCreatorProfile {
  id: string;
  username: string;
  fullName: string;
  isCreator: boolean;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  totalUploads: number;
  totalDownloads: number;
  isFollowing: boolean;
  joinedAt: string;
  popularStatuses: {
    id: string;
    title: string;
    type: "VIDEO" | "IMAGE" | "QUOTE";
    mediaUrl: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
    viewCount: number;
    downloadCount: number;
    favoriteCount: number;
    category: { key: string; label: string; emoji: string };
    createdAt: string;
  }[];
}

export interface UploadStatusInput {
  uri: string;
  fileName: string;
  mimeType: string;
  title: string;
  description?: string;
  type: "VIDEO" | "IMAGE";
  categoryKey: string;
  durationSec?: number;
  hashtags?: string[];
}

export const api = {
  auth: {
    signup: (payload: {
      fullName: string;
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
    login: (payload: { identifier: string; password: string }) =>
      request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  },
  categories: {
    list: () => request<{ categories: ApiCategory[] }>("/api/categories", { auth: true }),
  },
  statuses: {
    list: (params: { page?: number; limit?: number } = {}) =>
      request<ApiPaginated<ApiStatus>>(
        `/api/statuses?${new URLSearchParams(params as Record<string, string>).toString()}`,
        { auth: true }
      ),
    trending: (limit = 10) =>
      request<ApiPaginated<ApiStatus>>(`/api/statuses/trending?limit=${limit}`, { auth: true }),
    forYou: (limit = 10) =>
      request<ApiPaginated<ApiStatus>>(`/api/statuses/for-you?limit=${limit}`, { auth: true }),
    byId: (id: string) => request<{ status: ApiStatus }>(`/api/statuses/${id}`, { auth: true }),
    byCategory: (category: string, page = 1) =>
      request<ApiPaginated<ApiStatus>>(`/api/statuses/category/${category}?page=${page}`, { auth: true }),
    search: (query: string, page = 1) =>
      request<ApiPaginated<ApiStatus>>(
        `/api/statuses/search?q=${encodeURIComponent(query)}&page=${page}`,
        { auth: true }
      ),
    favorite: (id: string) =>
      request<{ alreadyFavorited: boolean }>(`/api/statuses/${id}/favorite`, { method: "POST", auth: true }),
    unfavorite: (id: string) =>
      request<void>(`/api/statuses/${id}/favorite`, { method: "DELETE", auth: true }),
    report: (id: string, payload: { reason: string; details?: string }) =>
      request<{ message: string }>(`/api/statuses/${id}/report`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      }),
    download: (id: string) =>
      request<{ download: { id: string; statusId: string; state: string; mediaUrl: string; createdAt: string } }>(
        `/api/statuses/${id}/download`,
        { method: "POST", auth: true }
      ),
    // Real multipart upload (Phase 3). Builds a FormData with the media file
    // plus text fields, matching backend/src/validators/status.validators.ts's
    // uploadStatusSchema exactly (hashtags as a comma-separated string).
    upload: async (input: UploadStatusInput): Promise<{ status: ApiStatus }> => {
      const form = new FormData();
      // React Native's FormData accepts this { uri, name, type } file shape
      // directly — it is NOT a real Blob/File, hence the `as any`.
      form.append("media", { uri: input.uri, name: input.fileName, type: input.mimeType } as any);
      form.append("title", input.title);
      if (input.description) form.append("description", input.description);
      form.append("type", input.type);
      form.append("categoryKey", input.categoryKey);
      if (input.durationSec) form.append("durationSec", String(Math.round(input.durationSec)));
      if (input.hashtags?.length) form.append("hashtags", input.hashtags.join(","));

      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      let response: Response;
      try {
        // Deliberately not going through request(): fetch must set its own
        // multipart boundary from the FormData, so we must NOT set
        // Content-Type manually (request() always adds application/json).
        response = await fetch(`${API_URL}/api/statuses/upload`, { method: "POST", headers, body: form });
      } catch {
        throw new ApiError("Can't reach the server. Check your connection or API URL.", 0, "NETWORK_ERROR");
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(
          body?.error?.message || `Upload failed (${response.status})`,
          response.status,
          body?.error?.code
        );
      }
      return response.json();
    },
  },
  favorites: {
    list: (page = 1) => request<ApiPaginated<ApiStatus>>(`/api/favorites?page=${page}`, { auth: true }),
  },
  downloads: {
    list: (page = 1) => request<ApiPaginated<ApiDownload>>(`/api/downloads?page=${page}`, { auth: true }),
  },
  creators: {
    get: (username: string) => request<{ creator: ApiCreatorProfile }>(`/api/creators/${username}`, { auth: true }),
  },
  follows: {
    follow: (userId: string) =>
      request<{ alreadyFollowing: boolean }>(`/api/follows/${userId}`, { method: "POST", auth: true }),
    unfollow: (userId: string) => request<void>(`/api/follows/${userId}`, { method: "DELETE", auth: true }),
    feed: (page = 1) => request<ApiPaginated<ApiStatus>>(`/api/follows/feed?page=${page}`, { auth: true }),
  },
  notifications: {
    list: (page = 1) =>
      request<ApiPaginated<ApiNotification> & { unreadCount: number }>(
        `/api/notifications?page=${page}`,
        { auth: true }
      ),
    markRead: (id: string) =>
      request<{ notification: ApiNotification }>(`/api/notifications/${id}/read`, {
        method: "PATCH",
        auth: true,
      }),
    markAllRead: () => request<void>("/api/notifications/read-all", { method: "POST", auth: true }),
  },
  analytics: {
    track: (eventType: string, metadata: Record<string, unknown> = {}) =>
      request<{ ok: true }>("/api/analytics/events", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ eventType, metadata }),
      }),
  },
  user: {
    me: () => request<{ user: ApiUser }>("/api/users/me", { auth: true }),
    updateMe: (payload: Record<string, unknown>) =>
      request<{ user: ApiUser }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
        auth: true,
      }),
  },
};
