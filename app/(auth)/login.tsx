import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";

export default function Login() {
  const { theme } = useAppTheme();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const result = await login({ identifier, password });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.replace("/(tabs)/home");
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xl }}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Log in to save, favorite and share statuses.
            </Text>
          </View>

          <TextField
            label="Email or Username"
            placeholder="you@example.com"
            leftIcon="person-outline"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            placeholder="••••••••"
            leftIcon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={setPassword}
          />

          {!!error && <Text style={[styles.errorBanner, { color: theme.danger }]}>{error}</Text>}

          <View style={styles.row}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe((r) => !r)}>
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={20}
                color={rememberMe ? theme.accent : theme.textMuted}
              />
              <Text style={[styles.rememberText, { color: theme.textSecondary }]}>Remember me</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={[styles.link, { color: theme.accent }]}>Forgot password?</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button label="Log In" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footerRow}>
            <Text style={{ color: theme.textSecondary }}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text style={[styles.link, { color: theme.accent }]}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1 },
  subtitle: { ...typography.body, marginTop: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rememberText: { ...typography.caption },
  link: { ...typography.bodyStrong, fontSize: 14 },
  errorBanner: { ...typography.caption, marginBottom: spacing.sm },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, marginBottom: spacing.xl },
});
