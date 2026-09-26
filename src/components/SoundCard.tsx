import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, shadow, spacing, typography } from "@/theme/tokens";
import type { ApiSound } from "@/services/api";
import { formatDuration, formatUsageCount } from "@/constants/sounds";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useSoundFavoriteToggle } from "@/hooks/useSoundFavoriteToggle";
import { useSoundSelection } from "@/context/SoundSelectionContext";
import { GlassSurface } from "@/components/Glass";

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
      <Pressable onPress={openDetail} style={[styles.compactCard, shadow.glass]}>
        <View style={styles.compactArtworkWrap}>
          <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.compactArtwork} cachePolicy="disk" />
          <GlassCircle size={26} style={styles.compactPlayBtn} onPress={handlePreview}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={12} color="#fff" />
          </GlassCircle>
        </View>
        <GlassSurface strength="subtle" borderRadius={0} elevated={false} bordered={false} style={styles.compactMeta}>
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
          <Pressable onPress={handleUse} style={styles.compactUseBtnWrap}>
            <GlassSurface
              strength="strong"
              borderRadius={radius.pill}
              elevated={false}
              tintOverlayColor={`${theme.accent}55`}
              style={[styles.compactUseBtn, { borderColor: theme.accent }]}
            >
              <Text style={[styles.compactUseLabel, { color: theme.mode === "dark" ? "#fff" : theme.accent }]}>Use</Text>
            </GlassSurface>
          </Pressable>
        </GlassSurface>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={openDetail} style={[styles.card, shadow.glass]}>
      <Pressable onPress={handlePreview} style={styles.artworkWrap} hitSlop={4}>
        <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.artwork} cachePolicy="disk" transition={120} />
        <View style={styles.playOverlay}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#fff" />
        </View>
      </Pressable>

      <GlassSurface strength="subtle" borderRadius={0} elevated={false} bordered={false} style={styles.info}>
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
            <View style={[styles.islamicBadge, { backgroundColor: theme.glass.fillStrong, borderColor: theme.glass.border }]}>
              <Text style={styles.islamicBadgeText}>🕌</Text>
            </View>
          )}
        </View>
      </GlassSurface>

      <View style={styles.actions}>
        <Pressable onPress={handleFavorite} hitSlop={8} style={styles.actionBtn}>
          <Ionicons name={favorited ? "heart" : "heart-outline"} size={20} color={favorited ? theme.danger : theme.textMuted} />
        </Pressable>
        <Pressable onPress={handleUse}>
          <GlassSurface
            strength="strong"
            borderRadius={radius.pill}
            elevated={false}
            tintOverlayColor={`${theme.accent}55`}
            style={[styles.useBtn, { borderColor: theme.accent }]}
          >
            <Text style={[styles.useLabel, { color: theme.mode === "dark" ? "#fff" : theme.accent }]}>Use Sound</Text>
          </GlassSurface>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Small frosted-glass circular icon button, matching StatusCard's overlay controls. */
function GlassCircle({
  children,
  size,
  style,
  onPress,
}: {
  children: React.ReactNode;
  size: number;
  style?: any;
  onPress?: (e: any) => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.glassCircle, { width: size, height: size, borderRadius: size / 2 }, style]}>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  artworkWrap: { width: 52, height: 52, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#000", marginLeft: spacing.sm, marginVertical: spacing.sm },
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
  info: { flex: 1, minWidth: 0, paddingVertical: spacing.sm, paddingRight: spacing.xs },
  title: { ...typography.bodyStrong, fontSize: 14 },
  subtitle: { ...typography.caption, marginTop: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: { ...typography.tiny },
  metaDot: { ...typography.tiny },
  islamicBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.sm, marginLeft: 4, borderWidth: 1 },
  islamicBadgeText: { fontSize: 10 },
  actions: { alignItems: "center", gap: spacing.xs, paddingRight: spacing.sm },
  actionBtn: { padding: 2 },
  useBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1 },
  useLabel: { ...typography.tiny, fontWeight: "700" },
  glassCircle: { alignItems: "center", justifyContent: "center", overflow: "hidden" },

  compactCard: { width: 128, borderRadius: radius.lg, overflow: "hidden", marginRight: spacing.sm },
  compactArtworkWrap: { width: "100%", aspectRatio: 1, backgroundColor: "#000" },
  compactArtwork: { width: "100%", height: "100%" },
  compactPlayBtn: { position: "absolute", bottom: 6, right: 6 },
  compactMeta: { padding: spacing.sm },
  compactTitle: { ...typography.caption, fontWeight: "700" },
  compactSubtitle: { ...typography.tiny, marginTop: 1 },
  compactMetaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  compactMetaText: { ...typography.tiny },
  compactUseBtnWrap: { marginTop: spacing.xs },
  compactUseBtn: { borderWidth: 1, paddingVertical: 5, alignItems: "center" },
  compactUseLabel: { ...typography.tiny, fontWeight: "700" },
});
