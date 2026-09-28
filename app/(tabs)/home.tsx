import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusFeedItem } from "@/components/StatusFeedItem";

const APP_LOGO = require("../../assets/app-logo.png");
const LIME = "#C1FF72";
type FeedTab = "foryou" | "trending" | "fresh";
const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: "foryou", label: "For you" },
  { key: "trending", label: "Trending" },
  { key: "fresh", label: "New" },
];

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

  // ---------- design-only state (which tab/page is on screen) ----------
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  // Pause the video whenever Home isn't the visible tab.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const feed = tab === "foryou" ? visibleForYou : tab === "trending" ? visibleTrending : visibleFresh;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActiveIndex(first.index);
  }).current;
  // Room for the floating tab bar (64 bar + gap).
  const bottomInset = Math.max(insets.bottom - 6, 12) + 64 + 8;
  // ----------------------------------------------------------------------

  return (
    <View style={styles.root} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
      {focused && <StatusBar style="light" />}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={LIME} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={32} color="rgba(255,255,255,0.6)" />
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={{ fontSize: 30 }}>🌙</Text>
          <Text style={styles.stateText}>No statuses for this mood yet.</Text>
        </View>
      ) : pageHeight > 0 ? (
        <FlatList
          key={tab}
          data={feed}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={pageHeight}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LIME} />}
          renderItem={({ item, index }) => (
            <StatusFeedItem
              item={item}
              active={focused && index === activeIndex}
              height={pageHeight}
              bottomInset={bottomInset}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        />
      ) : null}

      {/* ---------- Top overlay ---------- */}
      <View style={[styles.overlay, { top: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <Image source={APP_LOGO} style={styles.logo} />
            <View>
              <Text style={styles.brandTitle}>Status</Text>
              <Text style={styles.brandSub}>What is your mood?</Text>
            </View>
          </View>
          <View style={styles.topIcons}>
            <Pressable hitSlop={8} onPress={() => router.push("/(tabs)/explore")} style={styles.circle}>
              <Ionicons name="search-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => router.push("/notifications")} style={styles.circle}>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          {FEED_TABS.map((t) => (
            <Pressable
              key={t.key}
              hitSlop={8}
              onPress={() => {
                setTab(t.key);
                setActiveIndex(0);
              }}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
              {tab === t.key && <View style={styles.tabLine} />}
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moods}>
          {MOOD_CATEGORIES.map((m) => {
            const on = selectedMood === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => {
                  setSelectedMood(m.key === selectedMood ? null : m.key);
                  setActiveIndex(0);
                }}
                style={[styles.moodChip, on && styles.moodChipOn]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, on && { color: "#0C0C0C" }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const textShadow = { textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { position: "absolute", left: 0, right: 0 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14 },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  brandTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3, ...textShadow },
  brandSub: { color: LIME, fontSize: 11, fontWeight: "600", marginTop: 1, ...textShadow },
  topIcons: { flexDirection: "row", gap: 8 },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { color: "#0C0C0C", fontSize: 10, fontWeight: "800" },
  tabs: { flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 12 },
  tabText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600", ...textShadow },
  tabTextOn: { color: "#fff", fontWeight: "800" },
  tabLine: { height: 2.5, width: 22, borderRadius: 2, backgroundColor: LIME, marginTop: 4, alignSelf: "center" },
  moods: { paddingHorizontal: 14, gap: 6, paddingTop: 10 },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  moodChipOn: { backgroundColor: LIME, borderColor: LIME },
  moodEmoji: { fontSize: 13 },
  moodLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: spacing.xl },
  stateText: { color: "rgba(255,255,255,0.75)", ...typography.body, textAlign: "center" },
  retryButton: { borderWidth: 1, borderColor: LIME, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { color: LIME, ...typography.bodyStrong },
});
