// Premium color system for Status App
// Accent: purple/blue, rounded, dark-first, minimal gradient use.

export const palette = {
  purple500: "#7C5CFC",
  purple600: "#6440F0",
  blue500: "#4F8DFC",
  black0: "#000000",
  dark900: "#0B0B14",
  dark800: "#121220",
  dark700: "#191928",
  dark600: "#22223A",
  grey500: "#8A8A9E",
  grey300: "#C6C6D6",
  white: "#FFFFFF",
  success: "#3DDC97",
  danger: "#FF5C7A",
  warning: "#FFB648",
};

export interface AppTheme {
  mode: "dark" | "light";
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  success: string;
  danger: string;
  warning: string;
  gradient: readonly [string, string];
  /** Liquid-glass surface system — translucent fills/borders/highlights that
   * let the screen's backdrop show through (see src/components/Glass.tsx). */
  glass: {
    /** BlurView `tint` prop for this theme. */
    tint: "light" | "dark";
    /** Blur intensity for a standard card/panel. */
    intensity: number;
    /** Blur intensity for a prominent bar (tab bar, header). */
    intensityStrong: number;
    /** Translucent fill layered over the blur — gives the glass its tone. */
    fill: string;
    fillStrong: string;
    fillSubtle: string;
    /** Thin hairline edge that catches the light. */
    border: string;
    borderStrong: string;
    /** Soft specular highlight along the top edge. */
    highlight: string;
    /** Backdrop wash behind glass surfaces (ambient color bleed). */
    backdropA: string;
    backdropB: string;
  };
}

export const darkTheme: AppTheme = {
  mode: "dark",
  background: palette.dark900,
  surface: palette.dark800,
  surfaceAlt: palette.dark700,
  border: palette.dark600,
  textPrimary: palette.white,
  textSecondary: palette.grey300,
  textMuted: palette.grey500,
  accent: palette.purple500,
  accentAlt: palette.blue500,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  gradient: [palette.purple500, palette.blue500] as const,
  glass: {
    tint: "dark",
    intensity: 42,
    intensityStrong: 60,
    fill: "rgba(255,255,255,0.06)",
    fillStrong: "rgba(255,255,255,0.10)",
    fillSubtle: "rgba(255,255,255,0.035)",
    border: "rgba(255,255,255,0.14)",
    borderStrong: "rgba(255,255,255,0.22)",
    highlight: "rgba(255,255,255,0.22)",
    backdropA: "rgba(124,92,252,0.18)",
    backdropB: "rgba(79,141,252,0.14)",
  },
};

export const lightTheme: AppTheme = {
  mode: "light",
  background: "#F7F7FB",
  surface: palette.white,
  surfaceAlt: "#F0F0F7",
  border: "#E4E4EE",
  textPrimary: "#14141F",
  textSecondary: "#4B4B5C",
  textMuted: "#8A8A9E",
  accent: palette.purple600,
  accentAlt: palette.blue500,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  gradient: [palette.purple500, palette.blue500] as const,
  glass: {
    tint: "light",
    intensity: 55,
    intensityStrong: 72,
    fill: "rgba(255,255,255,0.55)",
    fillStrong: "rgba(255,255,255,0.72)",
    fillSubtle: "rgba(255,255,255,0.38)",
    border: "rgba(255,255,255,0.60)",
    borderStrong: "rgba(255,255,255,0.85)",
    highlight: "rgba(255,255,255,0.9)",
    backdropA: "rgba(124,92,252,0.10)",
    backdropB: "rgba(79,141,252,0.08)",
  },
};
