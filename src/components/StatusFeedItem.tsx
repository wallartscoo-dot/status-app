import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { StatusItem } from "@/constants/mockData";
import { useDownloadStatus } from "@/hooks/useDownloadStatus";
import { useShare } from "@/hooks/useShare";
import { useAuth } from "@/context/AuthContext";

/**
 * Full-screen status page for the Home feed (TikTok-style).
 *
 * DESIGN ONLY: every action here is the exact same behaviour StatusCard already
 * had — favorite (onToggleFavorite), download/retry (useDownloadStatus), share
 * (useShare), message the creator (chat route / signup for guests), open the
 * creator's profile. No new app logic.
 */

const LIME = "#C1FF72";

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

interface Props {
  item: StatusItem;
  /** true only for the page currently on screen — video plays only then. */
  active: boolean;
  height: number;
  /** Space kept free at the bottom for the floating tab bar. */
  bottomInset: number;
  onToggleFavorite?: (id: string, nextFavorited: boolean) => void;
}

function RailButton({
  icon,
  label,
  color = "#fff",
  onPress,
  disabled,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label?: string;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={styles.railItem}>
      <View style={styles.railButton}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={icon} size={22} color={color} />}
      </View>
      {!!label && <Text style={styles.railText}>{label}</Text>}
    </Pressable>
  );
}

export function StatusFeedItem({ item, active, height, bottomInset, onToggleFavorite }: Props) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(item.isFavorited ?? false);
  const { download, retry, stateFor } = useDownloadStatus();
  const share = useShare();
  const downloadState = stateFor(item.id);

  useEffect(() => {
    setFavorited(item.isFavorited ?? false);
  }, [item.isFavorited]);

  // ---- same handlers as StatusCard ----
  const toggleFavorite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFavorited((f) => {
      const next = !f;
      onToggleFavorite?.(item.id, next);
      return next;
    });
  };

  const handleDownload = () => {
    if (!item.mediaUrl) return;
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

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!user || user.isGuest) {
      router.push("/(auth)/signup");
      return;
    }
    router.push(`/chat/${item.creatorUsername}`);
  };
  // -------------------------------------

  const isBusy = downloadState.state === "DOWNLOADING" || downloadState.state === "PROCESSING";
  const downloadIcon =
    downloadState.state === "COMPLETED" ? "checkmark-circle" : downloadState.state === "FAILED" ? "reload" : "download-outline";
  const isVideo = item.type === "VIDEO" && !!item.mediaUrl;
  const initials = item.creatorUsername.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();

  return (
    <View style={{ height, backgroundColor: "#000" }}>
      {/* Media */}
      {isVideo ? (
        <Video
          source={{ uri: item.mediaUrl! }}
          posterSource={{ uri: item.thumbnailUrl }}
          usePoster
          posterStyle={{ resizeMode: "cover" }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={active}
          isLooping
          isMuted={!active}
        />
      ) : (
        <Image
          source={{ uri: item.thumbnailUrl || item.mediaUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
        />
      )}

      {/* Top + bottom shade so white text stays readable */}
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.topShade} />
      <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.bottomShade} />

      {/* Right action rail */}
      <View style={[styles.rail, { bottom: bottomInset + 70 }]}>
        <RailButton
          icon={favorited ? "heart" : "heart-outline"}
          color={favorited ? LIME : "#fff"}
          label="Like"
          onPress={toggleFavorite}
        />
        <RailButton
          icon={downloadIcon as any}
          color={downloadState.state === "COMPLETED" ? LIME : "#fff"}
          label={formatCount(item.downloads)}
          onPress={handleDownload}
          disabled={isBusy}
          loading={isBusy}
        />
        <RailButton icon="chatbubble-ellipses-outline" label="Message" onPress={handleMessage} />
        <RailButton icon="paper-plane-outline" label="Share" onPress={handleShare} />
      </View>

      {/* Creator + info */}
      <View style={[styles.info, { bottom: bottomInset + 10 }]}>
        <Pressable style={styles.userRow} onPress={() => router.push(`/creator/${item.creatorUsername}`)} hitSlop={4}>
          <LinearGradient colors={[LIME, "#8FD83A"]} style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.username} numberOfLines={1}>
            @{item.creatorUsername}
          </Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.tag}>#{item.category.toLowerCase().replace(/\s+/g, "")}</Text>
          <Text style={styles.meta}>
            <Ionicons name="eye-outline" size={12} color="#fff" /> {formatCount(item.views)}
          </Text>
          <Text style={styles.meta}>
            <Ionicons name="time-outline" size={12} color="#fff" /> {item.duration}
          </Text>
        </View>
      </View>
    </View>
  );
}

const textShadow = { textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  topShade: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  bottomShade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 360 },
  rail: { position: "absolute", right: 12, alignItems: "center", gap: 14 },
  railItem: { alignItems: "center", gap: 4 },
  railButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    // Plain translucent glass (no BlurView) — cheap to render on every page.
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  railText: { color: "#fff", fontSize: 11, fontWeight: "700", ...textShadow },
  info: { position: "absolute", left: 16, right: 84, gap: 6 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarRing: { width: 38, height: 38, borderRadius: 19, padding: 2 },
  avatar: {
    flex: 1,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#243016",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  username: { color: "#fff", fontSize: 15, fontWeight: "800", flexShrink: 1, ...textShadow },
  title: { color: "#fff", fontSize: 14, fontWeight: "600", ...textShadow },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tag: { color: LIME, fontSize: 13, fontWeight: "700", ...textShadow },
  meta: { color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.9, ...textShadow },
});
