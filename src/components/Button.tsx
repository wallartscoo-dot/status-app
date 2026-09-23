import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, typography } from "@/theme/tokens";

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
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === "primary" ? "#fff" : theme.accent} />
  ) : (
    <Text
      style={[
        styles.label,
        variant === "primary" && { color: "#fff" },
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
        style={[fullWidth && styles.fullWidth, { opacity: isDisabled ? 0.6 : 1 }, style]}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.base}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variant === "secondary" ? theme.surfaceAlt : "transparent",
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor: theme.accent,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
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
  },
  fullWidth: {
    width: "100%",
  },
  label: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
});
