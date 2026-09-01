import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";

const ACTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string }[] = [
  { icon: "create-outline", label: "Edit Profile" },
  { icon: "download-outline", label: "My Downloads", route: "/(tabs)/downloads" },
  { icon: "heart-outline", label: "My Favorites", route: "/favorites" },
  { icon: "cloud-upload-outline", label: "My Uploads", route: "/(tabs)/create" },
  { icon: "people-outline", label: "Following", route: "/following" },
  { icon: "settings-outline", label: "Settings", route: "/settings" },
];

export default function Profile() {
  const { theme } = useAppTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (!user) return null;

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

  return (
    <Screen edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} cachePolicy="disk" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name="person" size={32} color={theme.textMuted} />
            </View>
          )}
          <Text style={[styles.name, { color: theme.textPrimary }]}>{user.fullName}</Text>
          <Text style={[styles.username, { color: theme.textMuted }]}>@{user.username}</Text>
          {!!user.bio && <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{user.totalDownloads}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Downloads</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{user.totalFavorites}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Favorites</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
              {new Date(user.joinedDate).getFullYear()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Joined</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={[styles.actionRow, { borderColor: theme.border }]}
              onPress={() => action.route && router.push(action.route as any)}
            >
              <View style={styles.actionLeft}>
                <Ionicons name={action.icon} size={20} color={theme.textPrimary} />
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>{action.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.logoutLabel, { color: theme.danger }]}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  name: { ...typography.h2, marginTop: spacing.md },
  username: { ...typography.body, marginTop: 2 },
  bio: { ...typography.body, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.xl },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statBox: { alignItems: "center" },
  statNumber: { ...typography.h3 },
  statLabel: { ...typography.tiny, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  actionLabel: { ...typography.bodyStrong, fontSize: 15 },
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
