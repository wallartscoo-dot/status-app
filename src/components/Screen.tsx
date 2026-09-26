import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme/ThemeProvider";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  padded?: boolean;
  /** Disable the ambient gradient backdrop (rare — e.g. full-bleed video/camera screens). */
  backdrop?: boolean;
}

export function Screen({ children, style, edges = ["top", "bottom"], padded = true, backdrop = true }: ScreenProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {backdrop && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {/* Soft ambient color wash behind the whole screen — this is what
              the glass surfaces (cards/bars/panels) blur and refract, giving
              them real depth instead of looking like flat translucent boxes. */}
          <View style={[styles.blobTopRight, { backgroundColor: theme.glass.backdropA }]} />
          <View style={[styles.blobBottomLeft, { backgroundColor: theme.glass.backdropB }]} />
        </View>
      )}
      <SafeAreaView edges={edges} style={[styles.flex, padded && styles.padded, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, backgroundColor: "transparent" },
  padded: { paddingHorizontal: 20 },
  blobTopRight: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 200,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -140,
    left: -110,
    width: 340,
    height: 340,
    borderRadius: 220,
  },
});
