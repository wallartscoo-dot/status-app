import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";
import { api, ApiError, ApiNotification } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const ICONS: Record<ApiNotification["type"], keyof typeof Ionicons.glyphMap> = {
  WELCOME: "sparkles-outline",
  TRENDING: "flame-outline",
  FAVORITE: "heart-outline",
  NEW_FROM_CREATOR: "person-add-outline",
  SYSTEM: "information-circle-outline",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Notifications() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.notifications.list();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load notifications.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onTapNotification = async (n: ApiNotification) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
    try {
      await api.notifications.markRead(n.id);
    } catch {
      // best-effort; a stray unread badge isn't worth blocking on
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    try {
      await api.notifications.markAllRead();
    } catch {
      // best-effort
    }
  };

  const hasUnread = items.some((i) => !i.isRead);

  if (user?.isGuest) {
    return (
      <Screen edges={["top"]}>
        <View style={styles.headerRow}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
          <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
        </View>
        <View style={styles.centerState}>
          <Ionicons name="notifications-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Create an account to get notified about favorites, trending statuses, and creators you follow.
          </Text>
          <Pressable
            style={[styles.signupButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.signupButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Notifications</Text>
        {hasUnread && (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={[styles.markAll, { color: theme.accent }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="notifications-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No notifications yet. We'll let you know when something happens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onTapNotification(item)}
              style={[
                styles.row,
                { backgroundColor: item.isRead ? "transparent" : theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name={ICONS[item.type] ?? "notifications-outline"} size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.notifBody, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[styles.notifTime, { color: theme.textMuted }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    justifyContent: "space-between",
  },
  title: { ...typography.h2, flex: 1 },
  markAll: { ...typography.caption },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
  signupButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  signupButtonText: { color: "#fff", ...typography.bodyStrong },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notifTitle: { ...typography.bodyStrong },
  notifBody: { ...typography.caption, marginTop: 2 },
  notifTime: { ...typography.tiny, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
