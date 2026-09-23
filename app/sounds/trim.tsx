import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { GlassSurface } from "@/components/Glass";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiError, type ApiSound } from "@/services/api";
import { formatDuration } from "@/constants/sounds";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useSoundSelection } from "@/context/SoundSelectionContext";

const BAR_COUNT = 56;
const HANDLE_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 16 };

/** Deterministic pseudo-waveform (purely decorative — no real audio analysis available client-side). */
function pseudoWaveform(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    bars.push(0.25 + ((h >>> 8) % 100) / 100 * 0.75);
  }
  return bars;
}

export default function TrimSound() {
  const { soundId } = useLocalSearchParams<{ soundId: string }>();
  const { theme } = useAppTheme();
  const { sound: ctxSound, trim, volumes, selectSound, setTrim, setVolumes } = useSoundSelection();

  const [sound, setSound] = useState<ApiSound | null>(ctxSound);
  const [loading, setLoading] = useState(!ctxSound);
  const [error, setError] = useState<string | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const { isPlaying, play, pause } = useAudioPreview(sound?.audioUrl);

  // Deep-link / stale-context guard: fetch by id if we don't already have
  // this exact sound selected (e.g. screen opened directly with a soundId).
  useEffect(() => {
    if (ctxSound && ctxSound.id === soundId) {
      setSound(ctxSound);
      setLoading(false);
      return;
    }
    if (!soundId) return;
    setLoading(true);
    api.sounds
      .byId(soundId)
      .then((res) => {
        setSound(res.sound);
        selectSound(res.sound);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load this sound."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundId]);

  const waveform = useMemo(() => pseudoWaveform(sound?.id ?? "sound", BAR_COUNT), [sound?.id]);

  const duration = sound?.durationSec ?? 0;
  const minTrim = sound?.minTrimSec ?? 5;
  const maxTrim = Math.min(sound?.maxTrimSec ?? 60, duration || 60);

  const startSec = trim?.startSec ?? 0;
  const endSec = trim?.endSec ?? Math.min(maxTrim, duration);

  const secToX = useCallback((sec: number) => (duration > 0 ? (sec / duration) * trackWidth : 0), [duration, trackWidth]);
  const xToSec = useCallback((x: number) => (trackWidth > 0 ? (x / trackWidth) * duration : 0), [duration, trackWidth]);

  // --- Trim handle drag logic ---
  const dragStartX = useRef(0);
  const dragStartSec = useRef(0);

  const startResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartSec.current = startSec;
      },
      onPanResponderMove: (_evt, gesture) => {
        const deltaSec = xToSec(gesture.dx);
        let next = dragStartSec.current + deltaSec;
        next = Math.max(0, Math.min(next, endSec - minTrim));
        setTrim({ startSec: next, endSec });
      },
      onPanResponderRelease: () => Haptics.selectionAsync().catch(() => {}),
    })
  ).current;

  const endResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartSec.current = endSec;
      },
      onPanResponderMove: (_evt, gesture) => {
        const deltaSec = xToSec(gesture.dx);
        let next = dragStartSec.current + deltaSec;
        next = Math.min(duration, Math.max(next, startSec + minTrim));
        next = Math.min(next, startSec + maxTrim);
        setTrim({ startSec, endSec: next });
      },
      onPanResponderRelease: () => Haptics.selectionAsync().catch(() => {}),
    })
  ).current;

  const togglePreview = () => {
    Haptics.selectionAsync().catch(() => {});
    if (isPlaying) pause();
    else play(startSec, endSec);
  };

  const handleContinue = () => {
    if (!sound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    pause();
    router.push("/(tabs)/create");
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
      <Screen edges={["top"]} style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error ?? "Sound unavailable"}</Text>
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Trim & Mix</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.soundRow}>
        <Image source={{ uri: sound.artworkUrl ?? undefined }} style={styles.artwork} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.soundTitle, { color: theme.textPrimary }]}>{sound.title}</Text>
          <Text numberOfLines={1} style={[styles.soundSubtitle, { color: theme.textMuted }]}>{sound.artist ?? "Unknown"}</Text>
        </View>
        <Pressable onPress={togglePreview} style={[styles.playBtn, { backgroundColor: theme.accent }]}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Trim ({Math.max(0, Math.round(endSec - startSec))}s selected · {minTrim}–{Math.round(maxTrim)}s allowed)
      </Text>

      {sound.allowTrim ? (
        <GlassSurface
          style={styles.track}
          strength="subtle"
          borderRadius={radius.md}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.waveformRow}>
            {waveform.map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: 6 + h * 34, backgroundColor: theme.border }]} />
            ))}
          </View>

          {trackWidth > 0 && (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.selectionOverlay,
                  { left: secToX(startSec), width: Math.max(0, secToX(endSec) - secToX(startSec)), backgroundColor: `${theme.accent}33`, borderColor: theme.accent },
                ]}
              />
              <View
                {...startResponder.panHandlers}
                hitSlop={HANDLE_HIT_SLOP}
                style={[styles.handle, { left: secToX(startSec) - 3, backgroundColor: theme.accent }]}
              />
              <View
                {...endResponder.panHandlers}
                hitSlop={HANDLE_HIT_SLOP}
                style={[styles.handle, { left: secToX(endSec) - 3, backgroundColor: theme.accent }]}
              />
            </>
          )}
        </GlassSurface>
      ) : (
        <View style={[styles.track, styles.center, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={{ color: theme.textMuted }}>This audio doesn't support trimming — full {formatDuration(duration)} will be used.</Text>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.xl }]}>Volume Mix</Text>
      <VolumeSlider
        icon="videocam-outline"
        label="Original video audio"
        value={volumes.originalVolume}
        onChange={(v) => setVolumes({ ...volumes, originalVolume: v })}
      />
      <VolumeSlider
        icon="musical-notes-outline"
        label="Selected sound"
        value={volumes.soundVolume}
        onChange={(v) => setVolumes({ ...volumes, soundVolume: v })}
      />

      <Button label="Continue to Editor" onPress={handleContinue} style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }} />
    </Screen>
  );
}

function VolumeSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const dragStartX = useRef(0);
  const dragStartVal = useRef(value);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartVal.current = value;
      },
      onPanResponderMove: (_evt, gesture) => {
        if (width <= 0) return;
        const delta = gesture.dx / width;
        const next = Math.max(0, Math.min(1, dragStartVal.current + delta));
        onChange(Math.round(next * 100) / 100);
      },
    })
  ).current;

  const muted = value === 0;

  return (
    <View style={styles.volumeRow}>
      <Pressable onPress={() => onChange(muted ? 1 : 0)} hitSlop={8} style={styles.volumeIconBtn}>
        <Ionicons name={muted ? "volume-mute-outline" : icon} size={18} color={theme.textPrimary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.volumeLabel, { color: theme.textPrimary }]}>{label}</Text>
        <View
          style={[styles.volumeTrack, { backgroundColor: theme.surfaceAlt }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <View style={[styles.volumeFill, { width: `${value * 100}%`, backgroundColor: theme.accent }]} />
          {width > 0 && (
            <View
              {...responder.panHandlers}
              hitSlop={HANDLE_HIT_SLOP}
              style={[styles.volumeThumb, { left: Math.max(0, value * width - 8), backgroundColor: theme.accent }]}
            />
          )}
        </View>
      </View>
      <Text style={[styles.volumePct, { color: theme.textMuted }]}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  headerTitle: { ...typography.h3 },
  soundRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  artwork: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: "#000" },
  soundTitle: { ...typography.bodyStrong, fontSize: 14 },
  soundSubtitle: { ...typography.tiny, marginTop: 1 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionLabel: { ...typography.caption, marginBottom: spacing.sm },
  track: { height: 72, borderRadius: radius.md, justifyContent: "center", overflow: "visible" },
  waveformRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm, height: 44 },
  waveBar: { width: 3, borderRadius: 2 },
  selectionOverlay: { position: "absolute", top: 0, bottom: 0, borderWidth: 2, borderRadius: radius.md },
  handle: { position: "absolute", top: -4, bottom: -4, width: 6, borderRadius: 3 },
  volumeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  volumeIconBtn: { width: 28, alignItems: "center" },
  volumeLabel: { ...typography.caption, marginBottom: 6 },
  volumeTrack: { height: 6, borderRadius: 3, justifyContent: "center" },
  volumeFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3 },
  volumeThumb: { position: "absolute", width: 16, height: 16, borderRadius: 8, top: -5 },
  volumePct: { ...typography.tiny, width: 36, textAlign: "right" },
});
