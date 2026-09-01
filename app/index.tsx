import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/context/AuthContext";

// This is the very first route Expo Router mounts. It decides, based on
// persisted auth/onboarding state, whether to send the user to onboarding,
// login, or straight into the app.
export default function Index() {
  const { theme } = useAppTheme();
  const { isLoading, user, hasOnboarded } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (!hasOnboarded) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/home" />;
}
