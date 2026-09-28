import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/theme/ThemeProvider";
import { radius, shadow } from "@/theme/tokens";

type GlassStrength = "subtle" | "regular" | "strong" | "floating";

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How much the surface "reads" as glass — subtle for inline chips, floating for sheets/modals. */
  strength?: GlassStrength;
  /** Corner radius; defaults to a card-appropriate rounding. */
  borderRadius?: number;
  /** Draw the hairline border. Defaults to true. */
  bordered?: boolean;
  /** Draw the soft drop shadow that makes the surface feel like it's floating. Defaults to true. */
  elevated?: boolean;
  /** Extra content painted above the blur but below children (e.g. a color wash). */
  tintOverlayColor?: string;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  onLayout?: (e: import("react-native").LayoutChangeEvent) => void;
}

/**
 * Liquid-Glass surface primitive.
 *
 * Layer stack (bottom → top): BlurView (real backdrop blur) → translucent
 * tint fill → thin hairline border → a soft 1px specular highlight along the
 * top edge (the thing that sells "glass" vs. "frosted plastic") → content.
 *
 * Falls back gracefully: on platforms/devices where blur is unsupported,
 * expo-blur still renders (using a translucent fallback), so this never
 * breaks layout.
 */
export function GlassSurface({
  children,
  style,
  strength = "regular",
  borderRadius = radius.lg,
  bordered = true,
  elevated = true,
  tintOverlayColor,
  pointerEvents,
  onLayout,
}: GlassSurfaceProps) {
  const { theme } = useAppTheme();
  const g = theme.glass;

  const intensity =
    strength === "subtle" ? Math.max(18, g.intensity - 20) : strength === "floating" ? g.intensityStrong + 10 : strength === "strong" ? g.intensityStrong : g.intensity;

  const fill = strength === "subtle" ? g.fillSubtle : strength === "strong" || strength === "floating" ? g.fillStrong : g.fill;
  const borderColor = strength === "strong" || strength === "floating" ? g.borderStrong : g.border;
  const elevationStyle = !elevated ? undefined : strength === "floating" ? shadow.glassFloating : shadow.glass;

  // Performance: Android's real blur (dimezisBlurView) is expensive, and cards
  // in scrolling lists render dozens of these at once. Since this surface
  // already paints an opaque `theme.surface` underneath, the blur adds almost
  // nothing visually on small cards — so on Android we only run the real blur
  // for big surfaces (tab bar, headers, sheets). Look stays the same, scrolling
  // gets much smoother. iOS blur is cheap and is kept everywhere.
  const useRealBlur = Platform.OS !== "android" || strength === "strong" || strength === "floating";

  return (
    <View
      pointerEvents={pointerEvents}
      onLayout={onLayout}
      style={[
        { borderRadius, overflow: "hidden", backgroundColor: theme.surface },
        elevationStyle,
        style,
      ]}
    >
      {useRealBlur && (
        <BlurView
          intensity={intensity}
          tint={g.tint}
          style={StyleSheet.absoluteFillObject}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        />
      )}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fill }]} />
      {!!tintOverlayColor && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tintOverlayColor }]} />}
      {bordered && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { borderRadius, borderWidth: 1, borderColor }]}
        />
      )}
      {/* Specular highlight: a thin brighter line along the top edge, the
          hallmark of a curved glass surface catching light from above. */}
      <View pointerEvents="none" style={[styles.highlight, { borderColor: g.highlight, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** Thin glass pill — for chips, badges, small icon buttons. */
export function GlassPill({ children, style, strength = "regular", bordered = true, elevated = false }: GlassSurfaceProps) {
  return (
    <GlassSurface style={style} strength={strength} borderRadius={radius.pill} bordered={bordered} elevated={elevated}>
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { position: "relative" },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
  },
});
