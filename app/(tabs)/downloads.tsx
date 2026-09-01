import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, radius, typography } from "@/theme/tokens";
import { api, ApiDownload, ApiError } from "@/services/api";
import { router } from "expo-router";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Downloads() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<ApiDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.downloads.list();
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your downloads.");
    }
  }, []);

  useEffect(() => {
    if (!user || user.isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!user || user.isGuest) {
    return (
      <Screen style={styles.center}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.textMuted} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign up to track downloads</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your download history is saved to your account.
        </Text>
        <View style={{ height: spacing.lg }} />
        <Button label="Create Account" onPress={() => router.push("/(auth)/signup")} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <Text style={[styles.title, { color: theme.textPrimary, marginBottom: spacing.lg }]}>My Downloads</Text>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{error}</Text>
          <Button label="Retry" onPress={onRefresh} style={{ marginTop: spacing.lg }} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="download-outline" size={40} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No downloads yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Statuses you download will show up here so you can find them offline.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.downloadId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          contentContainerStyle={{ paddingBottom: spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Image
                source={{ uri: item.status.thumbnailUrl ?? item.status.mediaUrl }}
                style={styles.rowThumb}
                cachePolicy="disk"
              />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.textPrimary }]}>
                  {item.status.title}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                  {item.status.category.emoji} {item.status.category.label} · {formatDate(item.downloadedAt)}
                </Text>
              </View>
              <View
                style={[
                  styles.stateBadge,
                  {
                    backgroundColor:
                      item.state === "COMPLETED" ? theme.success + "22" : theme.warning + "22",
                  },
                ]}
              >
                <Ionicons
                  name={item.state === "COMPLETED" ? "checkmark-circle" : "time-outline"}
                  size={12}
                  color={item.state === "COMPLETED" ? theme.success : theme.warning}
                />
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.body, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.xl },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: spacing.xxxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.lg, textAlign: "center" },
  emptySubtitle: { ...typography.body, textAlign: "center", marginTop: spacing.xs, paddingHorizontal: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  rowThumb: { width: 56, height: 72, borderRadius: radius.sm, backgroundColor: "#000" },
  rowTitle: { ...typography.bodyStrong, fontSize: 14 },
  rowMeta: { ...typography.tiny, marginTop: 2 },
  stateBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
