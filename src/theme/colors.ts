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
};
