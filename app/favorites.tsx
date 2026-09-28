import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { StatusCard } from "@/components/StatusCard";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import type { StatusItem } from "@/constants/mockData";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

export default function Favorites() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const onToggleFavorite = useFavoriteToggle();
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.favorites.list();
      setItems(res.items.map(mapApiStatus));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your favorites.");
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

  // Removing a heart here should drop the card from this list immediately,
  // unlike everywhere else where the optimistic state just flips in place.
  const handleToggle = (id: string, nextFavorited: boolean) => {
    onToggleFavorite(id, nextFavorited);
    if (!nextFavorited) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!user || user.isGuest) {
    return (
      <Screen edges={["top"]} style={styles.center}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.textMuted} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign up to save favorites</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your favorited statuses are saved to your account.
        </Text>
        <View style={{ height: spacing.lg }} />
        <Button label="Create Account" onPress={() => router.push("/(auth)/signup")} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>My Favorites</Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="heart-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No favorites yet. Tap the heart on any status to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => <StatusCard item={item} width={168} onToggleFavorite={handleToggle} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  title: { ...typography.h2, textAlign: "center", marginTop: spacing.lg },
  subtitle: { ...typography.body, textAlign: "center", marginTop: spacing.xs },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
