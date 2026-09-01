import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/theme/ThemeProvider";
import { spacing, typography } from "@/theme/tokens";

export default function Signup() {
  const { theme } = useAppTheme();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError(null);
    setLoading(true);
    const result = await signup({ fullName, username, email, password, confirmPassword });
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
            <Text style={[styles.title, { color: theme.textPrimary }]}>Create your account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Find the perfect status in seconds.
            </Text>
          </View>

          <TextField label="Full Name" placeholder="Ayesha Khan" leftIcon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <TextField label="Username" placeholder="ayesha.khan" leftIcon="at-outline" value={username} onChangeText={setUsername} />
          <TextField label="Email" placeholder="you@example.com" leftIcon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextField label="Password" placeholder="At least 8 characters" leftIcon="lock-closed-outline" isPassword value={password} onChangeText={setPassword} />
          <TextField label="Confirm Password" placeholder="Re-enter password" leftIcon="lock-closed-outline" isPassword value={confirmPassword} onChangeText={setConfirmPassword} />

          {!!error && <Text style={[styles.errorBanner, { color: theme.danger }]}>{error}</Text>}

          <Button label="Create Account" onPress={handleSignup} loading={loading} />

          <View style={styles.footerRow}>
            <Text style={{ color: theme.textSecondary }}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={[styles.link, { color: theme.accent }]}>Log in</Text>
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
  link: { ...typography.bodyStrong, fontSize: 14 },
  errorBanner: { ...typography.caption, marginBottom: spacing.sm },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, marginBottom: spacing.xl },
});
