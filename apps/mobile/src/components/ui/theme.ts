export const Colors = {
  // Primary brand
  primary: "#047857",       // emerald-700
  primaryLight: "#d1fae5",  // emerald-100
  primaryMid: "#6ee7b7",    // emerald-300
  primaryDark: "#065f46",   // emerald-800

  // Background
  background: "#f5faf8",
  surface: "#ffffff",
  surfaceAlt: "#f0f9f5",

  // Text
  textPrimary: "#17211d",
  text: "#17211d",          // alias for textPrimary
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  textOnPrimary: "#ffffff",

  // Borders
  border: "#dbe7e2",
  borderLight: "#e2e8f0",

  // Status
  success: "#059669",
  warning: "#d97706",
  error: "#dc2626",
  info: "#0284c7",

  // Neutrals
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#0f172a",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Typography = {
  eyebrow: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2 },
  caption: { fontSize: 12, fontWeight: "400" as const },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: "600" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  title3: { fontSize: 20, fontWeight: "700" as const },
  title2: { fontSize: 24, fontWeight: "800" as const },
  title1: { fontSize: 30, fontWeight: "800" as const },
  largeTitle: { fontSize: 34, fontWeight: "800" as const },
};
