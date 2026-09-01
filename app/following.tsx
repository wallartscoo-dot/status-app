import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { StatusCard } from "@/components/StatusCard";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import type { StatusItem } from "@/constants/mockData";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

export default function FollowingFeed() {
  const { theme } = useAppTheme();
  const onToggleFavorite = useFavoriteToggle();
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.follows.feed();
      setItems(res.items.map(mapApiStatus));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your feed.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Following</Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="people-outline" size={36} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nothing here yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Follow creators to see their new statuses here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <StatusCard item={item} width={168} onToggleFavorite={onToggleFavorite} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.lg },
  title: { ...typography.h2 },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.xl },
});
