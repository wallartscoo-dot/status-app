import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { StatusCard } from "@/components/StatusCard";
import { GlassSurface, GlassPill } from "@/components/Glass";
import { SoundSkeletonList, SoundEmptyState } from "@/components/SoundSkeleton";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiError, type ApiSound } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import type { StatusItem } from "@/constants/mockData";
import { formatDuration, formatUsageCount } from "@/constants/sounds";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useSoundFavoriteToggle } from "@/hooks/useSoundFavoriteToggle";
import { useSoundSelection } from "@/context/SoundSelectionContext";

export default function SoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();

  const [sound, setSound] = useState<ApiSound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videos, setVideos] = useState<StatusItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const toggleFavorite = useSoundFavoriteToggle();
  const [favorited, setFavorited] = useState(false);
  const { isPlaying, toggle } = useAudioPreview(sound?.audioUrl);
  const { selectSound } = useSoundSelection();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.sounds.byId(id);
      setSound(res.sound);
      setFavorited(!!res.sound.isFavorited);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this sound.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    setVideosLoading(true);
    api.sounds
      .videosForSound(id, 1)
      .then((res) => {
        setVideos(res.items.map(mapApiStatus));
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setVideosLoading(false));
  }, [id]);

  const loadMoreVideos = () => {
    if (!id || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    api.sounds
      .videosForSound(id, page + 1)
      .then((res) => {
        setVideos((prev) => [...prev, ...res.items.map(mapApiStatus)]);
        setPage(res.page);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const handleFavorite = () => {
    if (!sound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavorited((f) => {
      const next = !f;
      toggleFavorite(sound.id, next);
      return next;
    });
  };

  const handlePreview = () => {
    if (!sound) return;
    Haptics.selectionAsync().catch(() => {});
    toggle(0, sound.durationSec);
  };

  const handleUseSound = () => {
    if (!sound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    selectSound(sound);
    router.push({ pathname: "/sounds/trim", params: { soundId: sound.id } });
  };

  if (loading) {
    return (
      <Screen edges={["top"]} style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </Screen>
    );
  }

  if (error || !sound) {
    return (
      <Screen edges={["top"]}>
        <HeaderBar title="Sound" />
        <SoundEmptyState icon="alert-circle-outline" title="Sound not found" subtitle={error ?? undefined} />
      </Screen>
    );
  }

  const subtitleParts = [sound.artist, sound.surah ? `Surah ${sound.surah.nameTransliteration}` : null].filter(Boolean);

  return (
    <Screen edges={["top"]} padded={false}>
      <HeaderBar title="Sound" />
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxxl }}
        onEndReachedThreshold={0.4}
        onEndReached={loadMoreVideos}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.heroRow}>
              <Pressable onPress={handlePreview} style={styles.artworkWrap}>
                <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.artwork} cachePolicy="disk" />
                <View style={styles.playOverlay}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#fff" />
                </View>
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
                  {sound.title}
                </Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {subtitleParts.join(" · ") || "Unknown"}
                </Text>
                {sound.ayatStart && sound.ayatEnd && (
                  <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                    Ayat {sound.ayatStart}–{sound.ayatEnd}
                  </Text>
                )}
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: theme.textMuted }]}>{formatDuration(sound.durationSec)}</Text>
                  <Text style={[styles.metaText, { color: theme.textMuted }]}> · </Text>
                  <Ionicons name="videocam-outline" size={12} color={theme.textMuted} />
                  <Text style={[styles.metaText, { color: theme.textMuted }]}> {formatUsageCount(sound.usageCount)} videos</Text>
                </View>
                {sound.category === "ISLAMIC" && (
                  <GlassPill style={styles.islamicBadge} strength="subtle">
                    <Text style={styles.islamicBadgeText}>🕌 {sound.islamicSubcategory}</Text>
                  </GlassPill>
                )}
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable onPress={handleFavorite} style={{ flex: 1 }}>
                <GlassSurface style={styles.actionBtn} strength="subtle" elevated={false}>
                  <Ionicons name={favorited ? "heart" : "heart-outline"} size={20} color={favorited ? theme.danger : theme.textPrimary} />
                  <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>{favorited ? "Favorited" : "Favorite"}</Text>
                </GlassSurface>
              </Pressable>
              <Pressable onPress={handlePreview} style={{ flex: 1 }}>
                <GlassSurface style={styles.actionBtn} strength="subtle" elevated={false}>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={theme.textPrimary} />
                  <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>{isPlaying ? "Pause" : "Preview"}</Text>
                </GlassSurface>
              </Pressable>
              <Pressable onPress={handleUseSound} style={[styles.useBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={styles.useLabel}>Use Sound</Text>
              </Pressable>
            </View>

            {!!sound.attribution && (
              <Text style={[styles.attribution, { color: theme.textMuted }]}>{sound.attribution}</Text>
            )}

            <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Videos with this sound</Text>
          </View>
        }
        ListEmptyComponent={
          videosLoading ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SoundSkeletonList count={4} />
            </View>
          ) : (
            <SoundEmptyState icon="videocam-outline" title="No videos yet" subtitle="Be the first to post using this sound." />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: spacing.md }} color={theme.accent} /> : null}
        renderItem={({ item }) => (
          <StatusCard item={item} width={168} onPress={() => router.push({ pathname: "/sounds/trim", params: { soundId: sound.id } })} />
        )}
      />
    </Screen>
  );
}

function HeaderBar({ title }: { title: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { ...typography.h3 },
  heroRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  artworkWrap: { width: 96, height: 96, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" },
  artwork: { width: "100%", height: "100%" },
  playOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  title: { ...typography.h3 },
  subtitle: { ...typography.body, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  metaText: { ...typography.tiny },
  islamicBadge: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.xs },
  islamicBadgeText: { fontSize: 11, fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.lg, paddingVertical: 12 },
  actionLabel: { ...typography.caption, fontWeight: "700" },
  useBtn: { flex: 1.3, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.lg, paddingVertical: 12 },
  useLabel: { color: "#fff", ...typography.caption, fontWeight: "700" },
  attribution: { ...typography.tiny, marginTop: spacing.md },
  sectionHeader: { ...typography.bodyStrong, fontSize: 15, marginTop: spacing.xl, marginBottom: spacing.md },
});
