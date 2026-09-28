import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, shadow, typography } from "@/theme/tokens";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  fullWidth = true,
}: ButtonProps) {
  const { theme } = useAppTheme();
  const g = theme.glass;
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === "primary" ? theme.onAccent : theme.accent} />
  ) : (
    <Text
      style={[
        styles.label,
        variant === "primary" && { color: theme.onAccent },
        variant !== "primary" && { color: theme.accent },
      ]}
    >
      {label}
    </Text>
  );

  if (variant === "primary") {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={[fullWidth && styles.fullWidth, shadow.glass, { opacity: isDisabled ? 0.6 : 1 }, style]}
      >
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.base}>
          {/* Glass sheen: a soft brighter band across the top third — keeps
              the brand gradient but gives it the same curved-glass highlight
              as every other surface in the app. */}
          <View pointerEvents="none" style={styles.sheen} />
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  // secondary / ghost — real frosted glass via BlurView, tinted with the
  // accent color only for "secondary" so it still reads as an action.
  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles.glassBase,
        fullWidth && styles.fullWidth,
        { borderColor: variant === "ghost" ? theme.accent : g.border, opacity: isDisabled ? 0.6 : 1 },
        style,
      ]}
    >
      <BlurView intensity={g.intensity} tint={g.tint} style={StyleSheet.absoluteFillObject} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: variant === "secondary" ? `${theme.accent}1F` : g.fillSubtle },
        ]}
      />
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  glassBase: { borderWidth: 1.5 },
  fullWidth: {
    width: "100%",
  },
  label: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
