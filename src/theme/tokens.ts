export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  tiny: { fontSize: 11, fontWeight: "500" as const },
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
};
