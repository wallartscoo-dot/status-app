import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";
import { GlassPill } from "@/components/Glass";

interface MoodChipProps {
  emoji: string;
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Glass pill filter chip — selected state reads as an accent-tinted glass, not a flat fill. */
export function MoodChip({ emoji, label, selected, onPress }: MoodChipProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <GlassPill
        strength={selected ? "strong" : "regular"}
        bordered
        tintOverlayColor={selected ? `${theme.accent}3D` : undefined}
        style={[styles.chip, selected ? { borderColor: theme.accent } : undefined]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.label, { color: selected ? theme.accent : theme.textPrimary }]}>{label}</Text>
      </GlassPill>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emoji: { fontSize: 16, marginRight: 6 },
  label: { ...typography.caption, fontSize: 13, fontWeight: "700" },
});
