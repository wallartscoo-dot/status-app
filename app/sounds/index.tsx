import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { SoundCard } from "@/components/SoundCard";
import { GlassSurface } from "@/components/Glass";
import { SoundSkeletonList, SoundEmptyState } from "@/components/SoundSkeleton";
import { MoodChip } from "@/components/MoodChip";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiError, type ApiPaginated, type ApiSound, type IslamicSubcategory } from "@/services/api";
import { LIBRARY_TABS, ISLAMIC_SUBCATEGORIES, type LibraryTabKey } from "@/constants/sounds";

const PAGE_LIMIT = 20;

export default function SoundLibrary() {
  const { theme } = useAppTheme();
  const { user } = useAuth();

  const [tab, setTab] = useState<LibraryTabKey>("ALL");
  const [islamicSub, setIslamicSub] = useState<IslamicSubcategory | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [items, setItems] = useState<ApiSound[]>([]);
  const [trending, setTrending] = useState<ApiSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const requestId = useRef(0);

  // Debounce search input (300ms) before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (targetPage: number, replace: boolean) => {
      const myRequest = ++requestId.current;
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        let result: ApiPaginated<ApiSound>;
        if (debouncedQuery) {
          result = await api.sounds.search(debouncedQuery, {
            page: targetPage,
            limit: PAGE_LIMIT,
            category: tab === "MUSIC" ? "MUSIC" : tab === "ISLAMIC" ? "ISLAMIC" : undefined,
            islamicSubcategory: islamicSub ?? undefined,
          });
        } else if (tab === "TRENDING") {
          result = await api.sounds.trending({ page: targetPage, limit: PAGE_LIMIT });
        } else if (tab === "FAVORITES") {
          if (!user || user.isGuest) {
            result = { items: [], page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 };
          } else {
            result = await api.sounds.listFavorites(targetPage);
          }
        } else {
          result = await api.sounds.list({
            page: targetPage,
            limit: PAGE_LIMIT,
            category: tab === "MUSIC" ? "MUSIC" : tab === "ISLAMIC" ? "ISLAMIC" : undefined,
            islamicSubcategory: islamicSub ?? undefined,
          });
        }
        if (myRequest !== requestId.current) return; // a newer request superseded this one
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (e) {
        if (myRequest !== requestId.current) return;
        setError(e instanceof ApiError ? e.message : "Couldn't load sounds. Pull to try again.");
        if (replace) setItems([]);
      } finally {
        if (myRequest === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [tab, islamicSub, debouncedQuery, user]
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  // Trending rail shown above the list on the "All" tab.
  useEffect(() => {
    if (tab !== "ALL" || debouncedQuery) return;
    api.sounds
      .trending({ limit: 10 })
      .then((res) => setTrending(res.items))
      .catch(() => {});
  }, [tab, debouncedQuery]);

  const onEndReached = () => {
    if (loading || loadingMore || page >= totalPages) return;
    load(page + 1, false);
  };

  const subcategoryChips = useMemo<{ key: IslamicSubcategory | null; label: string; emoji: string }[]>(
    () => [{ key: null, label: "All Islamic", emoji: "🕌" }, ...ISLAMIC_SUBCATEGORIES],
    []
  );

  return (
    <Screen edges={["top"]} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Sound Library</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchWrap}>
        <GlassSurface style={styles.searchBar} strength="subtle" elevated={false}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, Surah, reciter…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </GlassSurface>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
        {LIBRARY_TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              setTab(t.key);
              if (t.key !== "ISLAMIC") setIslamicSub(null);
            }}
            style={[
              styles.tabChip,
              { backgroundColor: tab === t.key ? theme.accent : theme.surfaceAlt, borderColor: tab === t.key ? theme.accent : theme.border },
            ]}
          >
            <Text style={[styles.tabChipLabel, { color: tab === t.key ? "#fff" : theme.textSecondary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "ISLAMIC" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsRow} contentContainerStyle={{ paddingHorizontal: spacing.lg }}>
          {subcategoryChips.map((c) => (
            <MoodChip
              key={c.key ?? "all"}
              emoji={c.emoji}
              label={c.label}
              selected={islamicSub === c.key}
              onPress={() => setIslamicSub(c.key)}
            />
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <SoundSkeletonList count={6} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm }}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListHeaderComponent={
            tab === "ALL" && !debouncedQuery && trending.length > 0 ? (
              <View style={{ marginBottom: spacing.lg }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>🔥 Trending Sounds</Text>
                  <Pressable onPress={() => setTab("TRENDING")}>
                    <Text style={[styles.seeAll, { color: theme.accent }]}>See all</Text>
                  </Pressable>
                </View>
                <FlatList
                  data={trending}
                  keyExtractor={(item) => `trend-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => <SoundCard sound={item} variant="compact" />}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <SoundEmptyState icon="alert-circle-outline" title="Something went wrong" subtitle={error} />
            ) : tab === "FAVORITES" && (!user || user.isGuest) ? (
              <SoundEmptyState icon="lock-closed-outline" title="Sign up to save favorites" subtitle="Your favorited sounds are saved to your account." />
            ) : debouncedQuery ? (
              <SoundEmptyState icon="search-outline" title="No results found" subtitle={`No sounds match "${debouncedQuery}"`} />
            ) : tab === "FAVORITES" ? (
              <SoundEmptyState icon="heart-outline" title="No favorites yet" subtitle="Tap the heart on any sound to save it here." />
            ) : (
              <SoundEmptyState icon="musical-notes-outline" title="No sounds yet" subtitle="Check back soon for new sounds." />
            )
          }
          ListFooterComponent={loadingMore ? <SoundSkeletonList count={2} /> : null}
          renderItem={({ item }) => <SoundCard sound={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { ...typography.h3 },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 44 },
  searchInput: { flex: 1, ...typography.body, fontSize: 14 },
  tabsRow: { flexGrow: 0, marginBottom: spacing.sm },
  tabChip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8, marginRight: spacing.sm },
  tabChipLabel: { ...typography.caption, fontWeight: "700" },
  subTabsRow: { flexGrow: 0, marginBottom: spacing.md },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  sectionHeader: { ...typography.bodyStrong, fontSize: 16 },
  seeAll: { ...typography.caption, fontWeight: "700" },
});
