import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { StatusCard } from "@/components/StatusCard";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";
import { api, ApiError } from "@/services/api";
import { mapApiStatus } from "@/utils/mapStatus";
import { track } from "@/utils/analytics";
import type { StatusItem } from "@/constants/mockData";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";

const RECENT_SEARCHES_SEED = ["love", "attitude status", "sad quotes", "motivation"];

export default function Search() {
  const { theme } = useAppTheme();
  const onToggleFavorite = useFavoriteToggle();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(RECENT_SEARCHES_SEED);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      api.statuses
        .search(trimmed)
        .then((res) => {
          setResults(res.items.map(mapApiStatus));
          setSearched(true);
          track("search_performed", { query: trimmed, resultCount: res.items.length });
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : "Search failed. Try again."))
        .finally(() => setLoading(false));
    }, 350); // debounce so we don't hit the API on every keystroke
    return () => clearTimeout(timeout);
  }, [query]);

  const submitSearch = (term: string) => {
    setQuery(term);
    setRecentSearches((prev) => [term, ...prev.filter((t) => t !== term)].slice(0, 6));
  };

  return (
    <Screen edges={["top"]}>
      <View style={styles.headerRow}>
        <Ionicons name="chevron-back" size={26} color={theme.textPrimary} onPress={() => router.back()} />
        <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.textPrimary }]}
            placeholder="Search statuses, hashtags, creators…"
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => query.trim() && submitSearch(query.trim())}
            autoFocus
            returnKeyType="search"
          />
        </View>
      </View>

      {query.trim().length < 2 ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Searches</Text>
          {recentSearches.map((term) => (
            <Text
              key={term}
              style={[styles.recentText, { color: theme.textSecondary }]}
              onPress={() => submitSearch(term)}
            >
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />  {term}
            </Text>
          ))}
        </>
      ) : loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
      ) : searched && results.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="search-outline" size={32} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No results for "{query.trim()}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: { flex: 1, ...typography.body, fontSize: 14, paddingVertical: 0 },
  sectionTitle: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.md },
  recentText: { ...typography.body, paddingVertical: spacing.sm },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...typography.body, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
