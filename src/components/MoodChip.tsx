import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";

interface MoodChipProps {
  emoji: string;
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function MoodChip({ emoji, label, selected, onPress }: MoodChipProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.surfaceAlt,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, { color: selected ? "#fff" : theme.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  emoji: { fontSize: 16, marginRight: 6 },
  label: { ...typography.caption, fontSize: 13 },
});
