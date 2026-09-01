import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, spacing, typography } from "@/theme/tokens";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export function TextField({ label, error, isPassword, leftIcon, ...rest }: TextFieldProps) {
  const { theme } = useAppTheme();
  const [secure, setSecure] = useState(!!isPassword);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: error ? theme.danger : focused ? theme.accent : theme.border,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons name={leftIcon} size={18} color={theme.textMuted} style={{ marginRight: spacing.sm }} />
        )}
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable onPress={() => setSecure((s) => !s)} hitSlop={8}>
            <Ionicons name={secure ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  input: { flex: 1, ...typography.body, fontSize: 15, paddingVertical: 0 },
  error: { ...typography.tiny, marginTop: spacing.xs },
});
