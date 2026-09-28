import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { GlassSurface } from "@/components/Glass";
import { ALL_CATEGORIES, MOOD_CATEGORIES } from "@/constants/categories";
import type { StatusItem } from "@/constants/mockData";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import { useDownloadStatus } from "@/hooks/useDownloadStatus";

const LIME = "#C1FF72";
const LIME_DEEP = "#8FD83A";

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/** "0:15" / "00:15" → "15 sec", "1:30" → "90 sec" (display only). */
function toSeconds(duration: string) {
  const parts = duration.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return duration;
  const total = parts.reduce((acc, p) => acc * 60 + p, 0);
  return `${total} sec`;
}

function emojiFor(categoryLabel: string) {
  const c = ALL_CATEGORIES.find((x) => x.label.toLowerCase() === categoryLabel.toLowerCase());
  return c?.emoji ?? "✨";
}

/* ---------- Trending card (download = the app's existing download flow) ---------- */
function TrendingCard({ item, width }: { item: StatusItem; width: number }) {
  const { theme } = useAppTheme();
  const { download, retry, stateFor } = useDownloadStatus();
  const downloadState = stateFor(item.id);
  const isBusy = downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING";

  // Same logic as StatusCard.handleDownload
  const handleDownload = () => {
    if (!item.mediaUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (downloadState.state === "FAILED") {
      retry(item.id, item.mediaUrl, item.title, item.type === "VIDEO");
    } else if (downloadState.state === "IDLE" || downloadState.state === "COMPLETED") {
      download(item.id, item.mediaUrl, item.title, item.type === "VIDEO");
    }
  };

  const downloadIcon =
    downloadState.state === "COMPLETED" ? "checkmark" : downloadState.state === "FAILED" ? "reload" : "download-outline";
  const initials = item.creatorUsername.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();

  return (
    <GlassSurface style={[styles.card, { width }]} borderRadius={22} strength="regular">
      <View style={styles.thumb}>
        <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={150} />
        <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.5)"]} style={styles.thumbShade} />

        <View style={styles.moodBadge}>
          <Text style={styles.moodBadgeText} numberOfLines={1}>
            {emojiFor(item.category)} {item.category}
          </Text>
        </View>

        <View style={styles.stats}>
          {!!item.duration && (
            <View style={styles.statRow}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.statText}>{toSeconds(item.duration)}</Text>
            </View>
          )}
          <View style={styles.statRow}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={styles.statText}>{formatCount(item.views)}</Text>
          </View>
        </View>

        <Pressable onPress={handleDownload} disabled={isBusy} hitSlop={6} style={styles.downloadBtn}>
          {isBusy ? <ActivityIndicator size="small" color="#0C0C0C" /> : <Ionicons name={downloadIcon as any} size={17} color="#0C0C0C" />}
        </Pressable>
      </View>

      <Pressable style={styles.meta} onPress={() => router.push(`/creator/${item.creatorUsername}`)} hitSlop={4}>
        <LinearGradient colors={[LIME, LIME_DEEP]} style={styles.avatarRing}>
          <View style={[styles.avatar, { borderColor: theme.surface }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </LinearGradient>
        <Text style={[styles.creator, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.creatorUsername}
        </Text>
        <Ionicons name="download-outline" size={12} color={theme.textMuted} />
        <Text style={[styles.count, { color: theme.textMuted }]}>{formatCount(item.downloads)}</Text>
      </Pressable>
    </GlassSurface>
  );
}

export default function Explore() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const [showAll, setShowAll] = useState(false); // filter button: 11 moods ↔ all categories
  const [trending, setTrending] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same API call Home already uses for its Trending section.
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.statuses.trending(10);
      setTrending(res.items.map(mapApiStatus));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load trending statuses.");
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

  const categories = showAll ? ALL_CATEGORIES : MOOD_CATEGORIES;
  const cardWidth = (width - 40 - 12) / 2; // 20px side padding (Screen) + 12px gap
  const isDark = theme.mode === "dark";
  const linkColor = isDark ? LIME : "#4F8A0E";

  return (
    <Screen edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={linkColor} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Explore</Text>
            <Text style={[styles.tagline, { color: linkColor }]}>What is your mood?</Text>
          </View>
          <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={6}>
            <GlassSurface style={styles.iconBtn} borderRadius={23} strength="strong" elevated={false}>
              <Ionicons name={showAll ? "close" : "options-outline"} size={20} color={theme.textPrimary} />
            </GlassSurface>
          </Pressable>
        </View>

        {/* Search (opens the existing search screen) */}
        <Pressable onPress={() => router.push("/search")}>
          <GlassSurface borderRadius={999} strength="strong" elevated={false} style={{ marginTop: spacing.md }}>
            <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={19} color={theme.textSecondary} />
            <Text style={[styles.searchPlaceholder, { color: theme.textMuted }]} numberOfLines={1}>
              Search status, users, #tags
            </Text>
            <View style={[styles.mic, { backgroundColor: theme.accent }]}>
              <Ionicons name="mic-outline" size={17} color={theme.onAccent} />
            </View>
            </View>
          </GlassSurface>
        </Pressable>

        {/* Moods (open the existing category screen) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{showAll ? "All categories" : "Moods"}</Text>
          <Pressable onPress={() => setShowAll((v) => !v)} hitSlop={8}>
            <Text style={[styles.seeAll, { color: linkColor }]}>{showAll ? "Less" : "See all"}</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {categories.map((c, i) => {
            const featured = i === 0;
            return (
              <Pressable key={c.key} onPress={() => router.push(`/category/${c.key}`)}>
                {featured ? (
                  <View style={[styles.chip, { backgroundColor: isDark ? LIME : "#0C0C0C" }]}>
                    <Text style={styles.chipEmoji}>{c.emoji}</Text>
                    <Text style={[styles.chipLabel, { color: isDark ? "#0C0C0C" : LIME }]}>{c.label}</Text>
                  </View>
                ) : (
                  <GlassSurface borderRadius={999} strength="strong" elevated={false}>
                    <View style={styles.chip}>
                      <Text style={styles.chipEmoji}>{c.emoji}</Text>
                      <Text style={[styles.chipLabel, { color: theme.textPrimary }]}>{c.label}</Text>
                    </View>
                  </GlassSurface>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Trending Now */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>🔥 Trending Now</Text>
          <Pressable onPress={() => router.push("/category/trending")} hitSlop={8}>
            <Text style={[styles.seeAll, { color: linkColor }]}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={linkColor} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
            <Pressable onPress={onRefresh} style={[styles.retry, { borderColor: linkColor }]}>
              <Text style={{ color: linkColor, ...typography.bodyStrong }}>Retry</Text>
            </Pressable>
          </View>
        ) : trending.length === 0 ? (
          <Text style={[styles.errorText, { color: theme.textMuted }]}>No trending statuses yet.</Text>
        ) : (
          <View style={styles.grid}>
            {trending.map((item) => (
              <TrendingCard key={item.id} item={item} width={cardWidth} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  title: { ...typography.h1 },
  tagline: { fontSize: 13, fontWeight: "700", marginTop: 1 },
  iconBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    paddingLeft: 16,
    paddingRight: 7,
  },
  searchPlaceholder: { ...typography.body, flex: 1 },
  mic: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3 },
  seeAll: { fontSize: 13, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingLeft: 10, paddingRight: 13, borderRadius: 999 },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 13.5, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  card: { padding: 6 },
  thumb: { height: 200, borderRadius: 17, overflow: "hidden", backgroundColor: "#000" },
  thumbShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  moodBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    maxWidth: "80%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moodBadgeText: { fontSize: 11, fontWeight: "700", color: "#111" },
  stats: { position: "absolute", left: 9, bottom: 8, gap: 2 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: "#fff", fontSize: 11.5, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 3 },
  downloadBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 9, paddingHorizontal: 4, paddingBottom: 3 },
  avatarRing: { width: 26, height: 26, borderRadius: 13, padding: 1.5 },
  avatar: { flex: 1, borderRadius: 13, borderWidth: 1.5, backgroundColor: "#E8F5D6", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 9, fontWeight: "800", color: "#1D2A10" },
  creator: { flex: 1, fontSize: 12.5, fontWeight: "700" },
  count: { fontSize: 11.5, fontWeight: "600" },
  errorBox: { alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  errorText: { ...typography.body, textAlign: "center", marginTop: spacing.md },
  retry: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 },
});
