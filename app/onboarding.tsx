import React, { useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { spacing, typography } from "@/theme/tokens";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    emoji: "🎬",
    title: "Your Status.\nYour Style.",
    subtitle: "Discover thousands of short statuses for every mood and moment.",
  },
  {
    key: "2",
    emoji: "⚡",
    title: "Download in\nSeconds",
    subtitle: "Save your favorite statuses quickly, in one tap.",
  },
  {
    key: "3",
    emoji: "🌙",
    title: "Share Your\nMood",
    subtitle: "Find statuses for every mood and occasion — then share instantly.",
  },
];

export default function Onboarding() {
  const { theme } = useAppTheme();
  const { continueAsGuest, completeOnboarding } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
  }).current;

  const handleCreateAccount = async () => {
    await completeOnboarding();
    router.replace("/(auth)/signup");
  };

  const handleGuest = async () => {
    await completeOnboarding();
    await continueAsGuest();
    router.replace("/(tabs)/home");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <LinearGradient colors={theme.gradient} style={styles.iconWrap}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </LinearGradient>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? theme.accent : theme.border,
                width: i === activeIndex ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Create Account" onPress={handleCreateAccount} />
        <View style={{ height: spacing.md }} />
        <Button label="Continue as Guest" variant="ghost" onPress={handleGuest} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  emoji: { fontSize: 44 },
  title: { ...typography.h1, textAlign: "center", marginBottom: spacing.md },
  subtitle: { ...typography.body, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing.md },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: spacing.xl },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
});
