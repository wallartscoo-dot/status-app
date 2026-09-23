import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/ThemeProvider";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  padded?: boolean;
}

export function Screen({ children, style, edges = ["top", "bottom"], padded = true }: ScreenProps) {
  const { theme } = useAppTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor: theme.background }, padded && styles.padded, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  padded: { paddingHorizontal: 20 },
});
