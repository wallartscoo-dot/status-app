import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiConversation, ApiError } from "@/services/api";

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Messages() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.messages.conversations();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your messages.");
    }
  }, []);

  useEffect(() => {
    if (!user || user.isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!user || user.isGuest) {
    return (
      <Screen edges={["top"]} style={styles.center}>
        <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.textMuted} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign up to chat with friends</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Create an account to message people you follow.
        </Text>
        <View style={{ height: spacing.lg }} />
        <Button label="Create Account" onPress={() => router.push("/(auth)/signup")} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <Text style={[styles.title, { color: theme.textPrimary, marginBottom: spacing.lg }]}>Messages</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
          <Button label="Retry" onPress={load} style={{ marginTop: spacing.lg }} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No conversations yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Visit a creator's profile and tap "Message" to start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.xs }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.otherUser.username}`)}
              style={[styles.row, { borderColor: theme.border }]}
            >
              {item.otherUser.avatarUrl ? (
                <Image source={{ uri: item.otherUser.avatarUrl }} style={styles.avatar} cachePolicy="disk" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="person" size={22} color={theme.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.name, { color: theme.textPrimary }]}>
                  {item.otherUser.fullName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.lastMessage,
                    { color: item.unreadCount > 0 ? theme.textPrimary : theme.textMuted, fontWeight: item.unreadCount > 0 ? "700" : "400" },
                  ]}
                >
                  {item.lastMessage ? item.lastMessage.body : "Say hello 👋"}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.time, { color: theme.textMuted }]}>{formatTime(item.lastMessageAt)}</Text>
                {item.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.body, marginTop: spacing.sm, textAlign: "center" },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm, textAlign: "center" },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  name: { ...typography.bodyStrong },
  lastMessage: { ...typography.caption, marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 6 },
  time: { ...typography.tiny },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
