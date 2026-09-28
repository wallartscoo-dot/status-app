import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { validateEmail } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";

export default function ForgotPassword() {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      setError("Invalid email");
      return;
    }
    setError(null);
    setLoading(true);
    // Phase 2: call api.auth.forgotPassword(email)
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setSent(true);
  };

  return (
    <Screen>
      <Ionicons
        name="chevron-back"
        size={26}
        color={theme.textPrimary}
        onPress={() => router.back()}
        style={{ marginTop: spacing.md }}
      />
      {sent ? (
        <View style={styles.confirmWrap}>
          <Ionicons name="mail-open-outline" size={48} color={theme.accent} />
          <Text style={[styles.title, { color: theme.textPrimary, marginTop: spacing.lg }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            If an account exists for {email}, we've sent a link to reset your password.
          </Text>
          <View style={{ height: spacing.xl }} />
          <Button label="Back to Login" onPress={() => router.replace("/(auth)/login")} />
        </View>
      ) : (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Reset your password</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, marginBottom: spacing.xl }]}>
            Enter the email associated with your account and we'll send a reset link.
          </Text>
          <TextField
            label="Email"
            placeholder="you@example.com"
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={error ?? undefined}
          />
          <Button label="Send Reset Link" onPress={handleSubmit} loading={loading} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1 },
  subtitle: { ...typography.body, marginTop: spacing.xs, lineHeight: 21 },
  confirmWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
});
