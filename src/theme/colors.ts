// Premium color system for Status App
// Accent: logo colors — lime + black. Dark-first, liquid glass.

export const palette = {
  // Brand (logo): lime + black
  lime: "#C1FF72",
  limeLight: "#D8FFA3",
  limeDeep: "#8FD83A",
  limeText: "#4F8A0E",
  black0: "#000000",
  ink: "#0C0C0C",
  dark900: "#050505",
  dark800: "#101210",
  dark700: "#171A15",
  dark600: "#262B22",
  grey500: "#8A9083",
  grey300: "#C9CEC3",
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
  /** Text/icon color to use ON TOP of `accent` or `gradient` (buttons, badges, bubbles). */
  onAccent: string;
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
  accent: palette.lime,
  accentAlt: palette.limeDeep,
  onAccent: palette.ink,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  gradient: [palette.limeLight, palette.lime] as const,
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
    backdropA: "rgba(193,255,114,0.16)",
    backdropB: "rgba(143,216,58,0.10)",
  },
};

export const lightTheme: AppTheme = {
  mode: "light",
  background: "#F4F7EE",
  surface: palette.white,
  surfaceAlt: "#EDF2E4",
  border: "#DDE5D2",
  textPrimary: "#141612",
  textSecondary: "#4A5044",
  textMuted: "#8A9083",
  // Light mode: black accent with lime on top (exactly like the logo) —
  // lime text on a white background would be unreadable.
  accent: palette.ink,
  accentAlt: palette.limeText,
  onAccent: palette.lime,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  gradient: ["#2B2B2B", palette.ink] as const,
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
    backdropA: "rgba(193,255,114,0.28)",
    backdropB: "rgba(143,216,58,0.12)",
  },
};
