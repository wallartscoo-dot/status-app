import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { MoodChip } from "@/components/MoodChip";
import { StatusCard } from "@/components/StatusCard";
import { MOOD_CATEGORIES } from "@/constants/categories";
import type { StatusItem } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import { track } from "@/utils/analytics";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

export default function Home() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const onToggleFavorite = useFavoriteToggle();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const [forYou, setForYou] = useState<StatusItem[]>([]);
  const [trending, setTrending] = useState<StatusItem[]>([]);
  const [fresh, setFresh] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [forYouRes, trendingRes, freshRes] = await Promise.all([
        api.statuses.forYou(10),
        api.statuses.trending(10),
        api.statuses.list({ page: 1, limit: 10 }),
      ]);
      setForYou(forYouRes.items.map(mapApiStatus));
      setTrending(trendingRes.items.map(mapApiStatus));
      setFresh(freshRes.items.map(mapApiStatus));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load statuses. Pull to retry.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // Unread notifications badge — refetched whenever Home regains focus (e.g.
  // coming back from the notifications screen after reading some).
  useFocusEffect(
    useCallback(() => {
      track("screen_view", { screen: "home" });
      if (!user || user.isGuest) {
        setUnreadCount(0);
        return;
      }
      api.notifications
        .list()
        .then((res) => setUnreadCount(res.unreadCount))
        .catch(() => {});
    }, [user])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visibleForYou = selectedMood
    ? forYou.filter((s) => s.category.toLowerCase() === selectedMood)
    : forYou;
  const visibleTrending = selectedMood
    ? trending.filter((s) => s.category.toLowerCase() === selectedMood)
    : trending;
  const visibleFresh = selectedMood
    ? fresh.filter((s) => s.category.toLowerCase() === selectedMood)
    : fresh;

  return (
    <Screen edges={["top"]} padded={false}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={[styles.logoDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.logoText, { color: theme.textPrimary }]}>Status App</Text>
          </View>
          <View style={styles.topIcons}>
            <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/explore")}>
              <Ionicons name="search-outline" size={22} color={theme.textPrimary} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => router.push("/notifications")} style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/profile")}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} cachePolicy="disk" />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="person" size={16} color={theme.textMuted} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>What's your mood today?</Text>
          <FlatList
            data={MOOD_CATEGORIES}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            renderItem={({ item }) => (
              <MoodChip
                emoji={item.emoji}
                label={item.label}
                selected={selectedMood === item.key}
                onPress={() => setSelectedMood(item.key === selectedMood ? null : item.key)}
              />
            )}
          />
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
            <Pressable onPress={onRefresh} style={[styles.retryButton, { borderColor: theme.accent }]}>
              <Text style={{ color: theme.accent, ...typography.bodyStrong }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* For You (personalized recommendations) */}
            {visibleForYou.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>💫 For You</Text>
                </View>
                <FlatList
                  data={visibleForYou}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: spacing.lg }}
                  renderItem={({ item }) => (
                    <StatusCard item={item} onPress={() => {}} onToggleFavorite={onToggleFavorite} />
                  )}
                />
              </>
            )}

            {/* Trending */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🔥 Trending Now</Text>
              <Pressable onPress={() => router.push("/(tabs)/explore")}>
                <Text style={[styles.seeAll, { color: theme.accent }]}>See all</Text>
              </Pressable>
            </View>
            {visibleTrending.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No trending statuses for this mood yet.
              </Text>
            ) : (
              <FlatList
                data={visibleTrending}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: spacing.lg }}
                renderItem={({ item }) => (
                  <StatusCard item={item} onPress={() => {}} onToggleFavorite={onToggleFavorite} />
                )}
              />
            )}

            {/* New */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>✨ Fresh Drops</Text>
            </View>
            {visibleFresh.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted, marginBottom: spacing.xxl }]}>
                No fresh statuses for this mood yet.
              </Text>
            ) : (
              <FlatList
                data={visibleFresh}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: spacing.lg, paddingBottom: spacing.xxl }}
                renderItem={({ item }) => (
                  <StatusCard item={item} onPress={() => {}} onToggleFavorite={onToggleFavorite} />
                )}
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoDot: { width: 10, height: 10, borderRadius: 5 },
  logoText: { ...typography.h3 },
  topIcons: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  bellWrap: { position: "relative" },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  hero: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  heroTitle: { ...typography.h2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3 },
  seeAll: { ...typography.caption },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  errorText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
  retryButton: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyText: { ...typography.body, paddingHorizontal: spacing.lg },
});
