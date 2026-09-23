import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { GlassSurface } from "@/components/Glass";
import { ALL_CATEGORIES } from "@/constants/categories";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";

export default function Explore() {
  const { theme } = useAppTheme();

  return (
    <Screen edges={["top"]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Explore</Text>

      <Pressable onPress={() => router.push("/search")}>
        <GlassSurface style={styles.searchBar} strength="subtle" elevated={false}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.searchPlaceholder, { color: theme.textMuted }]}>
            Search statuses, hashtags, creators…
          </Text>
        </GlassSurface>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Categories</Text>

      <FlatList
        data={ALL_CATEGORIES}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        renderItem={({ item }) => (
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/category/${item.key}`)}>
            <GlassSurface style={styles.categoryCard} strength="subtle" elevated={false}>
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: theme.textPrimary }]}>{item.label}</Text>
            </GlassSurface>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.lg },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.xl,
  },
  searchPlaceholder: { ...typography.body, fontSize: 14 },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  categoryCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
  },
  categoryEmoji: { fontSize: 28, marginBottom: spacing.xs },
  categoryLabel: { ...typography.bodyStrong, fontSize: 13 },
});
