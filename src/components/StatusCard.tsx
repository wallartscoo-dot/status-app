import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, shadow, spacing, typography } from "@/theme/tokens";
import type { StatusItem } from "@/constants/mockData";
import { useDownloadStatus } from "@/hooks/useDownloadStatus";
import { useShare } from "@/hooks/useShare";

interface StatusCardProps {
  item: StatusItem;
  onPress?: () => void;
  width?: number;
  /** Called with the new favorited state; wire this to api.statuses.favorite/unfavorite. */
  onToggleFavorite?: (id: string, nextFavorited: boolean) => void;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function StatusCard({ item, onPress, width = 168, onToggleFavorite }: StatusCardProps) {
  const { theme } = useAppTheme();
  const [favorited, setFavorited] = useState(item.isFavorited ?? false);
  const { download, retry, stateFor } = useDownloadStatus();
  const share = useShare();
  const downloadState = stateFor(item.id);

  useEffect(() => {
    setFavorited(item.isFavorited ?? false);
  }, [item.isFavorited]);

  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavorited((f) => {
      const next = !f;
      onToggleFavorite?.(item.id, next); // optimistic update, synced to the API by the caller
      return next;
    });
  };

  const handleDownload = () => {
    if (!item.mediaUrl) return; // mock/placeholder card with no real file behind it
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (downloadState.state === "FAILED") {
      retry(item.id, item.mediaUrl, item.title, item.type === "VIDEO");
    } else if (downloadState.state === "IDLE" || downloadState.state === "COMPLETED") {
      download(item.id, item.mediaUrl, item.title, item.type === "VIDEO");
    }
  };

  const handleShare = () => {
    if (item.mediaUrl) share(item.title, item.mediaUrl);
  };

  const downloadIcon =
    downloadState.state === "COMPLETED"
      ? "checkmark-circle"
      : downloadState.state === "FAILED"
      ? "reload"
      : "download-outline";

  return (
    <Pressable onPress={onPress} style={[styles.card, { width, backgroundColor: theme.surface }, shadow.card]}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} cachePolicy="disk" transition={150} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
        <Pressable style={styles.playButton} onPress={onPress} hitSlop={10}>
          <Ionicons name="play" size={16} color="#fff" />
        </Pressable>
        <Pressable style={styles.favButton} onPress={toggleFavorite} hitSlop={10}>
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={16}
            color={favorited ? theme.danger : "#fff"}
          />
        </Pressable>
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.category, { color: theme.textMuted }]}>{item.category}</Text>
        <Pressable
          onPress={(e: any) => {
            e.stopPropagation?.();
            router.push(`/creator/${item.creatorUsername}`);
          }}
          hitSlop={4}
        >
          <Text numberOfLines={1} style={[styles.creator, { color: theme.accent }]}>
            @{item.creatorUsername}
          </Text>
        </Pressable>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textMuted }]}>{formatCount(item.views)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="download-outline" size={12} color={theme.textMuted} />
            <Text style={[styles.statText, { color: theme.textMuted }]}>{formatCount(item.downloads)}</Text>
          </View>
        </View>

        {/* Download is the primary action on every card per spec section 21
            ("make the download action extremely easy") — a full-width
            button rather than a small icon, with clear state feedback. */}
        <Pressable
          onPress={handleDownload}
          disabled={downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING"}
          style={[styles.actionRow, { borderColor: theme.border }]}
        >
          {downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING" ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons
              name={downloadIcon as any}
              size={14}
              color={downloadState.state === "COMPLETED" ? theme.success : theme.accent}
            />
          )}
          <Text
            style={[
              styles.actionLabel,
              { color: downloadState.state === "COMPLETED" ? theme.success : theme.accent },
            ]}
          >
            {downloadState.state === "DOWNLOADING"
              ? `${Math.round(downloadState.progress * 100)}%`
              : downloadState.state === "PROCESSING"
              ? "Processing…"
              : downloadState.state === "COMPLETED"
              ? "Saved"
              : downloadState.state === "FAILED"
              ? "Retry"
              : "Download"}
          </Text>
          <Pressable onPress={handleShare} hitSlop={8} style={styles.shareIcon}>
            <Ionicons name="share-social-outline" size={15} color={theme.textMuted} />
          </Pressable>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: "hidden", marginRight: spacing.md },
  thumbWrap: { width: "100%", aspectRatio: 9 / 14, backgroundColor: "#000" },
  thumb: { width: "100%", height: "100%" },
  durationBadge: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  durationText: { color: "#fff", ...typography.tiny },
  playButton: {
    position: "absolute",
    top: "45%",
    left: "45%",
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  favButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { padding: spacing.sm },
  title: { ...typography.bodyStrong, fontSize: 13 },
  category: { ...typography.tiny, marginTop: 2 },
  creator: { ...typography.tiny, marginTop: 1, fontWeight: "600" },
  statsRow: { flexDirection: "row", marginTop: spacing.xs, gap: spacing.sm },
  statItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  statText: { ...typography.tiny },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  actionLabel: { ...typography.tiny, fontWeight: "700", flex: 1 },
  shareIcon: { paddingLeft: spacing.xs },
});
