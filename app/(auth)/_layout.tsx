import React from "react";
import { Stack } from "expo-router";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function AuthLayout() {
  const { theme } = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
