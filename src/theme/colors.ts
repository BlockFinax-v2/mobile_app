export const palette = {
  primaryBlue: '#1E90FF',
  primaryBlueLight: '#26C6DA',
  primaryBlueDark: '#00ACC1',
  white: '#FFFFFF',
  accentGreen: '#4CAF50',
  successGreen: '#00CC66',
  warningYellow: '#FFB800',
  errorRed: '#FF3B30',
  neutralDark: '#1F2933',
  neutralMid: '#4B5563',
  neutralLight: '#9CA3AF',
  neutralLighter: '#E5E7EB',
  surface: '#F8FAFC', // Light gray background
  cardBackground: '#FFFFFF', // Pure white for cards
  shadowColor: '#000000', // Shadow color for components
  background: '#F8FAFC', // Background color (same as surface)
};

// Additional color system for new screens
export const colors = {
  primary: palette.primaryBlue,
  background: palette.surface,
  surface: palette.surface,
  text: palette.neutralDark,
  textSecondary: palette.neutralMid,
  border: palette.neutralLighter,
  success: palette.successGreen,
  warning: palette.warningYellow,
  error: palette.errorRed,
};

export const gradients = {
  // Removed gradients for clean, professional design
  hero: [palette.primaryBlue, palette.primaryBlue] as const,
  splash: [palette.primaryBlue, palette.primaryBlue] as const,
};
