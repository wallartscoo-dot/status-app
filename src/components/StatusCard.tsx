import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, shadow, spacing, typography } from "@/theme/tokens";
import type { StatusItem } from "@/constants/mockData";
import { useDownloadStatus } from "@/hooks/useDownloadStatus";
import { useShare } from "@/hooks/useShare";
import { useAuth } from "@/context/AuthContext";
import { GlassSurface } from "@/components/Glass";

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
  const g = theme.glass;
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(item.isFavorited ?? false);
  const { download, retry, stateFor } = useDownloadStatus();
  const share = useShare();
  const downloadState = stateFor(item.id);
  const isOwnStatus = !!user && !user.isGuest && user.username === item.creatorUsername;

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

  const handleMessage = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!user || user.isGuest) {
      router.push("/(auth)/signup");
      return;
    }
    router.push(`/chat/${item.creatorUsername}`);
  };

  const downloadIcon =
    downloadState.state === "COMPLETED"
      ? "checkmark-circle"
      : downloadState.state === "FAILED"
      ? "reload"
      : "download-outline";

  return (
    <Pressable onPress={onPress} style={[styles.card, { width }, shadow.glass]}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} cachePolicy="disk" transition={150} />
        {/* Duration badge — frosted glass pill */}
        <GlassChip style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </GlassChip>
        {/* Play button — glass roundel */}
        <GlassCircle size={34} style={styles.playButton} onPress={onPress}>
          <Ionicons name="play" size={15} color="#fff" style={{ marginLeft: 1 }} />
        </GlassCircle>
        {/* Favorite button — glass roundel */}
        <GlassCircle size={30} style={styles.favButton} onPress={toggleFavorite}>
          <Ionicons name={favorited ? "heart" : "heart-outline"} size={15} color={favorited ? theme.danger : "#fff"} />
        </GlassCircle>
        {/* Download moved here as a small glass icon (spec update: the
            message button now owns the card's primary full-width action).
            Still shows the same state feedback (progress / saved / retry). */}
        <GlassCircle
          size={30}
          style={styles.downloadButton}
          onPress={(e: any) => {
            e.stopPropagation?.();
            handleDownload();
          }}
          disabled={downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING"}
        >
          {downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={downloadIcon as any}
              size={14}
              color={downloadState.state === "COMPLETED" ? theme.success : "#fff"}
            />
          )}
        </GlassCircle>
        {/* Bottom scrim so white glass icons stay legible over bright thumbnails */}
        <View pointerEvents="none" style={styles.scrim} />
      </View>

      <GlassSurface strength="subtle" borderRadius={0} elevated={false} bordered={false} style={styles.meta}>
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

        {/* Message is now the card's primary action (replaces the old
            full-width Download button — download lives as a small icon on
            the thumbnail above). Hidden on your own statuses since you
            can't message yourself. Share stays reachable alongside it. */}
        {!isOwnStatus && (
          <Pressable onPress={handleMessage} style={[styles.actionRow, { borderColor: g.border, backgroundColor: g.fillSubtle }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.accent} />
            <Text style={[styles.actionLabel, { color: theme.accent }]}>Message</Text>
            <Pressable
              onPress={(e: any) => {
                e.stopPropagation?.();
                handleShare();
              }}
              hitSlop={8}
              style={styles.shareIcon}
            >
              <Ionicons name="share-social-outline" size={15} color={theme.textMuted} />
            </Pressable>
          </Pressable>
        )}
      </GlassSurface>
    </Pressable>
  );
}

/** Small frosted-glass pill used for the duration badge. */
function GlassChip({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassChip, style]}>
      <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.28)" }]} />
      <View style={{ paddingHorizontal: 8, paddingVertical: 3 }}>{children}</View>
    </View>
  );
}

/** Small frosted-glass circular icon button used for overlay controls on media thumbnails. */
function GlassCircle({
  children,
  size,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  size: number;
  style?: any;
  onPress?: (e: any) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={[styles.glassCircle, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.30)", borderRadius: size / 2 }]} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" }]}
      />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: "hidden", marginRight: spacing.md },
  thumbWrap: { width: "100%", aspectRatio: 9 / 14, backgroundColor: "#000" },
  thumb: { width: "100%", height: "100%" },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "38%",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  glassChip: { position: "absolute", bottom: spacing.sm, left: spacing.sm, borderRadius: radius.sm, overflow: "hidden" },
  glassCircle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  durationBadge: {},
  durationText: { color: "#fff", ...typography.tiny },
  playButton: { position: "absolute", top: "42%", left: "50%", marginLeft: -17, marginTop: -17 },
  favButton: { position: "absolute", top: spacing.sm, right: spacing.sm },
  downloadButton: { position: "absolute", bottom: spacing.sm, right: spacing.sm },
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
