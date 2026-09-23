import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";
import type { ApiSound } from "@/services/api";
import { formatDuration, formatUsageCount } from "@/constants/sounds";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useSoundFavoriteToggle } from "@/hooks/useSoundFavoriteToggle";
import { useSoundSelection } from "@/context/SoundSelectionContext";

interface SoundCardProps {
  sound: ApiSound;
  onUseSound?: (sound: ApiSound) => void;
  /** Compact layout for horizontal "Trending" rails; defaults to a full-width row. */
  variant?: "row" | "compact";
}

export function SoundCard({ sound, onUseSound, variant = "row" }: SoundCardProps) {
  const { theme } = useAppTheme();
  const [favorited, setFavorited] = useState(sound.isFavorited);
  const toggleFavorite = useSoundFavoriteToggle();
  const { isPlaying, toggle } = useAudioPreview(sound.audioUrl);
  const { selectSound } = useSoundSelection();

  const handleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavorited((f) => {
      const next = !f;
      toggleFavorite(sound.id, next);
      return next;
    });
  };

  const handlePreview = () => {
    Haptics.selectionAsync().catch(() => {});
    toggle(0, sound.durationSec);
  };

  const handleUse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    selectSound(sound);
    if (onUseSound) {
      onUseSound(sound);
    } else {
      router.push({ pathname: "/sounds/trim", params: { soundId: sound.id } });
    }
  };

  const openDetail = () => router.push(`/sounds/${sound.id}`);

  const subtitleParts = [
    sound.artist,
    sound.surah ? `Surah ${sound.surah.nameTransliteration}` : null,
  ].filter(Boolean);

  if (variant === "compact") {
    return (
      <Pressable
        onPress={openDetail}
        style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <View style={styles.compactArtworkWrap}>
          <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.compactArtwork} cachePolicy="disk" />
          <Pressable style={styles.compactPlayBtn} onPress={handlePreview} hitSlop={8}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={14} color="#fff" />
          </Pressable>
        </View>
        <Text numberOfLines={1} style={[styles.compactTitle, { color: theme.textPrimary }]}>
          {sound.title}
        </Text>
        <Text numberOfLines={1} style={[styles.compactSubtitle, { color: theme.textMuted }]}>
          {subtitleParts.join(" · ") || "Unknown"}
        </Text>
        <View style={styles.compactMetaRow}>
          <Ionicons name="musical-notes-outline" size={11} color={theme.textMuted} />
          <Text style={[styles.compactMetaText, { color: theme.textMuted }]}>{formatUsageCount(sound.usageCount)}</Text>
        </View>
        <Pressable
          onPress={handleUse}
          style={[styles.compactUseBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.compactUseLabel}>Use</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={openDetail} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable onPress={handlePreview} style={styles.artworkWrap} hitSlop={4}>
        <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.artwork} cachePolicy="disk" transition={120} />
        <View style={styles.playOverlay}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#fff" />
        </View>
      </Pressable>

      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
          {sound.title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitleParts.join(" · ") || "Unknown artist"}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>{formatDuration(sound.durationSec)}</Text>
          {sound.usageCount > 0 && (
            <>
              <Text style={[styles.metaDot, { color: theme.textMuted }]}>·</Text>
              <Ionicons name="videocam-outline" size={11} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>{formatUsageCount(sound.usageCount)}</Text>
            </>
          )}
          {sound.category === "ISLAMIC" && (
            <View style={[styles.islamicBadge, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={styles.islamicBadgeText}>🕌</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleFavorite} hitSlop={8} style={styles.actionBtn}>
          <Ionicons name={favorited ? "heart" : "heart-outline"} size={20} color={favorited ? theme.danger : theme.textMuted} />
        </Pressable>
        <Pressable onPress={handleUse} style={[styles.useBtn, { backgroundColor: theme.accent }]}>
          <Text style={styles.useLabel}>Use Sound</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  artworkWrap: { width: 52, height: 52, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#000" },
  artwork: { width: "100%", height: "100%" },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  info: { flex: 1, minWidth: 0 },
  title: { ...typography.bodyStrong, fontSize: 14 },
  subtitle: { ...typography.caption, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: { ...typography.tiny },
  metaDot: { ...typography.tiny },
  islamicBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.sm, marginLeft: 4 },
  islamicBadgeText: { fontSize: 10 },
  actions: { alignItems: "center", gap: spacing.xs },
  actionBtn: { padding: 2 },
  useBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill },
  useLabel: { color: "#fff", ...typography.tiny, fontWeight: "700" },

  compactCard: { width: 128, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, marginRight: spacing.sm },
  compactArtworkWrap: { width: "100%", aspectRatio: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#000" },
  compactArtwork: { width: "100%", height: "100%" },
  compactPlayBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: { ...typography.caption, fontWeight: "700", marginTop: spacing.xs },
  compactSubtitle: { ...typography.tiny, marginTop: 1 },
  compactMetaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  compactMetaText: { ...typography.tiny },
  compactUseBtn: { marginTop: spacing.xs, borderRadius: radius.pill, paddingVertical: 5, alignItems: "center" },
  compactUseLabel: { color: "#fff", ...typography.tiny, fontWeight: "700" },
});
