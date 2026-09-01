import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiCreatorProfile, ApiError } from "@/services/api";
import { track } from "@/utils/analytics";

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function CreatorProfileScreen() {
  const { theme } = useAppTheme();
  const { user: viewer } = useAuth();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [creator, setCreator] = useState<ApiCreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    setError(null);
    try {
      const res = await api.creators.get(username);
      setCreator(res.creator);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this creator.");
    }
  }, [username]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const toggleFollow = async () => {
    if (!creator) return;
    if (!viewer || viewer.isGuest) {
      router.push("/(auth)/signup");
      return;
    }
    setFollowBusy(true);
    const wasFollowing = creator.isFollowing;
    // Optimistic update
    setCreator({
      ...creator,
      isFollowing: !wasFollowing,
      followerCount: creator.followerCount + (wasFollowing ? -1 : 1),
    });
    try {
      if (wasFollowing) {
        await api.follows.unfollow(creator.id);
      } else {
        await api.follows.follow(creator.id);
        track("creator_followed", { creatorId: creator.id });
      }
    } catch {
      // revert on failure
      setCreator({ ...creator, isFollowing: wasFollowing, followerCount: creator.followerCount });
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </Screen>
    );
  }

  if (error || !creator) {
    return (
      <Screen style={styles.center}>
        <Ionicons name="person-remove-outline" size={40} color={theme.textMuted} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error ?? "Creator not found"}</Text>
        <Button label="Go back" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  const isSelf = viewer && !viewer.isGuest && viewer.username === creator.username;

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={creator.popularStatuses}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Ionicons name="chevron-back" size={24} color={theme.textPrimary} onPress={() => router.back()} />
            </View>

            {creator.avatarUrl ? (
              <Image source={{ uri: creator.avatarUrl }} style={styles.avatar} cachePolicy="disk" />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="person" size={32} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>{creator.fullName}</Text>
              {creator.isCreator && <Ionicons name="checkmark-circle" size={16} color={theme.accent} />}
            </View>
            <Text style={[styles.username, { color: theme.textMuted }]}>@{creator.username}</Text>
            {!!creator.bio && <Text style={[styles.bio, { color: theme.textSecondary }]}>{creator.bio}</Text>}

            <View style={styles.statsRow}>
              <Stat label="Followers" value={formatCount(creator.followerCount)} theme={theme} />
              <Stat label="Uploads" value={formatCount(creator.totalUploads)} theme={theme} />
              <Stat label="Downloads" value={formatCount(creator.totalDownloads)} theme={theme} />
            </View>

            {!isSelf && (
              <Button
                label={creator.isFollowing ? "Following" : "Follow"}
                variant={creator.isFollowing ? "secondary" : "primary"}
                onPress={toggleFollow}
                loading={followBusy}
                style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
              />
            )}

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Popular Statuses</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
            <Image source={{ uri: item.thumbnailUrl ?? item.mediaUrl }} style={styles.statusThumb} cachePolicy="disk" />
            <View style={styles.statusMeta}>
              <Text numberOfLines={1} style={[styles.statusTitle, { color: theme.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.statusStats, { color: theme.textMuted }]}>
                {formatCount(item.downloadCount)} downloads
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textMuted, marginHorizontal: spacing.lg }]}>
            No published statuses yet.
          </Text>
        }
      />
    </Screen>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", paddingHorizontal: spacing.lg },
  headerRow: { alignSelf: "flex-start", marginBottom: spacing.md },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  name: { ...typography.h2 },
  username: { ...typography.body, marginTop: 2 },
  bio: { ...typography.body, marginTop: spacing.sm, textAlign: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: spacing.xl },
  statBox: { alignItems: "center" },
  statNumber: { ...typography.h3 },
  statLabel: { ...typography.tiny, marginTop: 2 },
  sectionTitle: { ...typography.h3, alignSelf: "flex-start", marginBottom: spacing.sm },
  statusCard: { flex: 1, borderRadius: radius.lg, overflow: "hidden" },
  statusThumb: { width: "100%", aspectRatio: 9 / 12, backgroundColor: "#000" },
  statusMeta: { padding: spacing.sm },
  statusTitle: { ...typography.bodyStrong, fontSize: 13 },
  statusStats: { ...typography.tiny, marginTop: 2 },
  emptyText: { ...typography.body, textAlign: "center", marginTop: spacing.md },
});
