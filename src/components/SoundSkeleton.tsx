import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";

export function SoundSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

function SkeletonRow() {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.row, { backgroundColor: theme.surface, opacity }]}>
      <View style={[styles.thumb, { backgroundColor: theme.surfaceAlt }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.line, { width: "60%", backgroundColor: theme.surfaceAlt }]} />
        <View style={[styles.line, { width: "40%", backgroundColor: theme.surfaceAlt }]} />
      </View>
      <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]} />
    </Animated.View>
  );
}

export function SoundEmptyState({
  icon = "musical-notes-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={32} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.lg, padding: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  line: { height: 10, borderRadius: 5 },
  pill: { width: 72, height: 28, borderRadius: radius.pill },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.bodyStrong, textAlign: "center" },
  emptySubtitle: { ...typography.caption, textAlign: "center" },
});
