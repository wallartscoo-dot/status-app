import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { StatusCard } from "@/components/StatusCard";
import { ALL_CATEGORIES } from "@/constants/categories";
import type { StatusItem } from "@/constants/mockData";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

export default function CategoryScreen() {
  const { theme } = useAppTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const category = ALL_CATEGORIES.find((c) => c.key === key);
  const onToggleFavorite = useFavoriteToggle();

  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setError(null);
    api.statuses
      .byCategory(key)
      .then((res) => setItems(res.items.map(mapApiStatus)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load this category."))
      .finally(() => setLoading(false));
  }, [key]);

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {category ? `${category.emoji} ${category.label}` : "Category"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="albums-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No statuses in this category yet.
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  title: { ...typography.h2 },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", paddingHorizontal: spacing.lg },
});
