import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, ApiError, ApiUser, NotificationPrefs, clearTokens, storeTokens } from "@/services/api";
import { track } from "@/utils/analytics";

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  totalDownloads: number;
  totalFavorites: number;
  joinedDate: string;
  isGuest: boolean;
  notificationPrefs: NotificationPrefs;
}

interface SignupPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginPayload {
  identifier: string; // email or username
  password: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (payload: SignupPayload) => Promise<{ success: boolean; error?: string }>;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasOnboarded: boolean;
  completeOnboarding: () => Promise<void>;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => Promise<void>;
}

const USER_KEY = "30sec_auth_user";
const ONBOARD_KEY = "30sec_onboarded";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// --- Validation helpers (shared with Signup/Login screens for instant,
// pre-submit feedback; the backend re-validates everything server-side too) ---
export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  favorites: true,
  newFromCreator: true,
  trending: true,
  system: true,
};

function mapApiUser(apiUser: ApiUser): UserProfile {
  return {
    id: apiUser.id,
    fullName: apiUser.fullName,
    username: apiUser.username,
    email: apiUser.email,
    bio: apiUser.profile.bio ?? "",
    avatarUrl: apiUser.profile.avatarUrl,
    totalDownloads: apiUser.profile.totalDownloads,
    totalFavorites: apiUser.profile.totalFavorites,
    joinedDate: apiUser.joinedAt,
    isGuest: false,
    notificationPrefs: apiUser.profile.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedUser, onboarded] = await Promise.all([
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(ONBOARD_KEY),
        ]);
        if (onboarded === "true") setHasOnboarded(true);
        if (storedUser) {
          const parsed: UserProfile = JSON.parse(storedUser);
          setUser(parsed);
          // Refresh from the server in the background (skip for guests, who
          // have no account to fetch) so stats/bio stay current.
          if (!parsed.isGuest) {
            api.user
              .me()
              .then(({ user: fresh }) => persistUser(mapApiUser(fresh)))
              .catch(() => {
                // Access + refresh tokens both invalid/expired -> sign out locally.
                persistUser(null);
              });
          }
        }
      } catch (e) {
        // ignore hydration errors, fall back to signed-out state
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistUser = async (nextUser: UserProfile | null) => {
    setUser(nextUser);
    if (nextUser) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
      await clearTokens();
    }
  };

  const signup: AuthContextValue["signup"] = async (payload) => {
    if (!payload.fullName.trim()) return { success: false, error: "Full name is required" };
    if (payload.username.trim().length < 3)
      return { success: false, error: "Username must be at least 3 characters" };
    if (!validateEmail(payload.email)) return { success: false, error: "Invalid email address" };
    if (!validatePassword(payload.password))
      return { success: false, error: "Password must be at least 8 characters" };
    if (payload.password !== payload.confirmPassword)
      return { success: false, error: "Passwords do not match" };

    try {
      const { user: apiUser, accessToken, refreshToken } = await api.auth.signup(payload);
      await storeTokens(accessToken, refreshToken);
      await persistUser(mapApiUser(apiUser));
      track("signup_completed");
      return { success: true };
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
      return { success: false, error: message };
    }
  };

  const login: AuthContextValue["login"] = async ({ identifier, password }) => {
    if (!identifier.trim()) return { success: false, error: "Enter your email or username" };
    if (!password) return { success: false, error: "Password is required" };

    try {
      const { user: apiUser, accessToken, refreshToken } = await api.auth.login({ identifier, password });
      await storeTokens(accessToken, refreshToken);
      await persistUser(mapApiUser(apiUser));
      track("login_completed");
      return { success: true };
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
      return { success: false, error: message };
    }
  };

  const continueAsGuest = async () => {
    const guestUser: UserProfile = {
      id: "guest",
      fullName: "Guest",
      username: "guest",
      email: "",
      bio: "",
      avatarUrl: null,
      totalDownloads: 0,
      totalFavorites: 0,
      joinedDate: new Date().toISOString(),
      isGuest: true,
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    };
    await persistUser(guestUser);
  };

  const logout = async () => {
    await persistUser(null);
  };

  const refreshProfile = async () => {
    if (!user || user.isGuest) return;
    try {
      const { user: fresh } = await api.user.me();
      await persistUser(mapApiUser(fresh));
    } catch {
      // best-effort; keep the cached profile if the refresh fails
    }
  };

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    await SecureStore.setItemAsync(ONBOARD_KEY, "true");
  };

  const updateNotificationPrefs = async (patch: Partial<NotificationPrefs>) => {
    if (!user || user.isGuest) return;
    // Optimistic local update so Settings toggles feel instant...
    const optimistic = { ...user, notificationPrefs: { ...user.notificationPrefs, ...patch } };
    setUser(optimistic);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(optimistic));
    try {
      // ...then sync to the server, which is the source of truth on next load.
      const { user: fresh } = await api.user.updateMe({ notificationPrefs: patch });
      await persistUser(mapApiUser(fresh));
    } catch {
      // Leave the optimistic value in place; it'll reconcile on next refreshProfile().
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !user.isGuest,
        signup,
        login,
        continueAsGuest,
        logout,
        refreshProfile,
        hasOnboarded,
        completeOnboarding,
        updateNotificationPrefs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
