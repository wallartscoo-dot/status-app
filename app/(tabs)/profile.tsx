import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { GlassSurface } from "@/components/Glass";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiCreatorProfile } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";

const LIME = "#C1FF72";
const LIME_DEEP = "#8FD83A";

type GridTab = "uploads" | "downloads" | "favorites";
type GridItem = { id: string; thumb: string | null; label: string };

const TABS: { key: GridTab; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap; seeAll: string }[] = [
  { key: "uploads", icon: "grid-outline", iconOn: "grid", seeAll: "/(tabs)/create" },
  { key: "downloads", icon: "download-outline", iconOn: "download", seeAll: "/downloads" },
  { key: "favorites", icon: "heart-outline", iconOn: "heart", seeAll: "/favorites" },
];

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function Profile() {
  const { theme } = useAppTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();

  // ---- unchanged from the original screen ----
  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };
  // --------------------------------------------

  // Data for the new layout — only existing API calls (same ones used by the
  // creator page, My Downloads and My Favorites screens). Each grid tab loads
  // only when it's opened, so the profile opens fast.
  const [creator, setCreator] = useState<ApiCreatorProfile | null>(null);
  const [tab, setTab] = useState<GridTab>("uploads");
  const [grid, setGrid] = useState<Record<GridTab, GridItem[] | null>>({ uploads: null, downloads: null, favorites: null });
  const [gridLoading, setGridLoading] = useState(false);

  const isRealUser = !!user && !user.isGuest;
  const username = user?.username;

  useFocusEffect(
    useCallback(() => {
      if (!isRealUser || !username) return;
      api.creators
        .get(username)
        .then((res) => {
          setCreator(res.creator);
          setGrid((g) => ({
            ...g,
            uploads: res.creator.popularStatuses.map((s) => ({
              id: s.id,
              thumb: s.thumbnailUrl ?? s.mediaUrl,
              label: formatCount(s.viewCount),
            })),
          }));
        })
        .catch(() => setGrid((g) => ({ ...g, uploads: g.uploads ?? [] })));
    }, [isRealUser, username])
  );

  useEffect(() => {
    if (!isRealUser || tab === "uploads" || grid[tab] !== null) return;
    setGridLoading(true);
    const req =
      tab === "downloads"
        ? api.downloads.list().then((res) =>
            res.items.map((d) => ({ id: d.downloadId, thumb: d.status.thumbnailUrl ?? d.status.mediaUrl, label: d.status.category.emoji }))
          )
        : api.favorites.list().then((res) =>
            res.items.map(mapApiStatus).map((s) => ({ id: s.id, thumb: s.thumbnailUrl, label: formatCount(s.views) }))
          );
    req
      .then((items) => setGrid((g) => ({ ...g, [tab]: items })))
      .catch(() => setGrid((g) => ({ ...g, [tab]: [] })))
      .finally(() => setGridLoading(false));
  }, [tab, isRealUser, grid]);

  if (!user) return null;

  // Guest view — unchanged
  if (user.isGuest) {
    return (
      <Screen style={styles.guestCenter}>
        <Ionicons name="person-circle-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>You're browsing as a guest</Text>
        <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
          Create an account to unlock favorites, personalized recommendations and uploads.
        </Text>
        <View style={{ height: spacing.lg }} />
        <Button label="Create Account" onPress={() => router.push("/(auth)/signup")} />
      </Screen>
    );
  }

  const isDark = theme.mode === "dark";
  const cell = (width - 4) / 3;
  const items = grid[tab];
  const stats: { label: string; value: string; route?: string }[] = [
    { label: "Following", value: creator ? formatCount(creator.followingCount) : "–", route: "/following" },
    { label: "Followers", value: creator ? formatCount(creator.followerCount) : "–" },
    { label: "Downloads", value: formatCount(user.totalDownloads), route: "/downloads" },
  ];

  return (
    <Screen edges={["top"]} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Top bar (no stats button) */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push("/following")} hitSlop={6}>
            <GlassSurface style={styles.iconBtn} borderRadius={22} strength="strong" elevated={false}>
              <Ionicons name="person-add-outline" size={19} color={theme.textPrimary} />
            </GlassSurface>
          </Pressable>
          <Text style={[styles.topName, { color: theme.textPrimary }]} numberOfLines={1}>
            {user.fullName}
          </Text>
          <Pressable onPress={() => router.push("/settings")} hitSlop={6}>
            <GlassSurface style={styles.iconBtn} borderRadius={22} strength="strong" elevated={false}>
              <Ionicons name="menu" size={20} color={theme.textPrimary} />
            </GlassSurface>
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.center}>
          <View>
            <LinearGradient colors={[LIME, LIME_DEEP]} style={styles.avatarRing}>
              <View style={[styles.avatarInner, { borderColor: theme.background }]}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFill} cachePolicy="disk" />
                ) : (
                  <Text style={styles.avatarLetter}>{user.fullName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
            </LinearGradient>
            <Pressable
              onPress={() => router.push("/(tabs)/create")}
              style={[styles.avatarPlus, { borderColor: theme.background }]}
              hitSlop={6}
            >
              <Ionicons name="add" size={17} color="#0C0C0C" />
            </Pressable>
          </View>
          <Text style={[styles.username, { color: theme.textPrimary }]}>@{user.username}</Text>
        </View>

        {/* Stats */}
        <GlassSurface style={styles.side} borderRadius={22} strength="regular">
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={[styles.statDivider, { backgroundColor: theme.border }]} />}
                <Pressable style={styles.statBox} disabled={!s.route} onPress={() => s.route && router.push(s.route as any)}>
                  <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </GlassSurface>

        {/* Buttons */}
        <View style={[styles.side, styles.actions]}>
          <Pressable style={{ flex: 1 }}>
            {/* "Edit Profile" had no screen in the original menu either */}
            <GlassSurface borderRadius={999} strength="strong" elevated={false}>
              <Text style={[styles.btnText, { color: theme.textPrimary }]}>Edit profile</Text>
            </GlassSurface>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/settings")}>
            <GlassSurface borderRadius={999} strength="strong" elevated={false}>
              <Text style={[styles.btnText, { color: theme.textPrimary }]}>Settings</Text>
            </GlassSurface>
          </Pressable>
          <Pressable onPress={() => router.push("/following")}>
            <GlassSurface style={styles.iconBtnLg} borderRadius={25} strength="strong" elevated={false}>
              <Ionicons name="people-outline" size={20} color={theme.textPrimary} />
            </GlassSurface>
          </Pressable>
        </View>

        {!!user.bio && <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>}
        <Text style={[styles.joined, { color: theme.textMuted }]}>
          Joined {new Date(user.joinedDate).getFullYear()}
        </Text>

        {/* Grid tabs */}
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
                <Ionicons name={on ? t.iconOn : t.icon} size={21} color={on ? theme.textPrimary : theme.textMuted} />
                {on && <View style={styles.tabLine} />}
              </Pressable>
            );
          })}
        </View>

        {/* Grid */}
        {items === null || gridLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={isDark ? LIME : theme.textPrimary} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={TABS.find((t) => t.key === tab)!.icon} size={28} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nothing here yet</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((it) => (
              <View key={it.id} style={{ width: cell, aspectRatio: 3 / 4, backgroundColor: theme.surfaceAlt }}>
                {!!it.thumb && <Image source={{ uri: it.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />}
                <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.45)"]} style={styles.cellShade} />
                <View style={styles.cellLabel}>
                  {tab !== "downloads" && <Ionicons name="play-outline" size={11} color="#fff" />}
                  <Text style={styles.cellLabelText}>{it.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {items !== null && items.length > 0 && (
          <Pressable style={styles.seeAll} onPress={() => router.push(TABS.find((t) => t.key === tab)!.seeAll as any)}>
            <Text style={[styles.seeAllText, { color: isDark ? LIME : "#4F8A0E" }]}>See all</Text>
          </Pressable>
        )}

        {/* Log out — unchanged behaviour */}
        <Pressable style={styles.logoutRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.logoutLabel, { color: theme.danger }]}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: spacing.sm },
  topName: { ...typography.h3, flex: 1, textAlign: "center", marginHorizontal: spacing.sm },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconBtnLg: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", marginTop: spacing.lg },
  avatarRing: { width: 104, height: 104, borderRadius: 52, padding: 3 },
  avatarInner: {
    flex: 1,
    borderRadius: 52,
    borderWidth: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CDEFA6",
  },
  avatarLetter: { fontSize: 36, fontWeight: "700", color: "#1D2A10" },
  avatarPlus: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },
  username: { ...typography.body, fontWeight: "600", marginTop: spacing.sm },
  side: { marginHorizontal: 16, marginTop: spacing.lg },
  statsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { ...typography.h3 },
  statLabel: { ...typography.tiny, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { ...typography.bodyStrong, textAlign: "center", paddingVertical: 14 },
  bio: { ...typography.body, textAlign: "center", marginTop: spacing.md, paddingHorizontal: 32 },
  joined: { ...typography.tiny, textAlign: "center", marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginTop: spacing.lg },
  tab: { flex: 1, alignItems: "center", paddingVertical: 11 },
  tabLine: { position: "absolute", bottom: -1, width: 30, height: 3, borderRadius: 2, backgroundColor: LIME },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cellShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" },
  cellLabel: { position: "absolute", left: 6, bottom: 5, flexDirection: "row", alignItems: "center", gap: 3 },
  cellLabelText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { ...typography.body },
  seeAll: { alignItems: "center", paddingTop: spacing.md },
  seeAllText: { ...typography.bodyStrong },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  logoutLabel: { ...typography.bodyStrong },
  guestCenter: { alignItems: "center", justifyContent: "center" },
  guestTitle: { ...typography.h2, marginTop: spacing.lg, textAlign: "center" },
  guestSubtitle: { ...typography.body, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.lg },
});
