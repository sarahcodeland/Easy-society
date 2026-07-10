// Modern Village palette — warm, organic, community-focused.
export const colors = {
  primary: '#E2725B', // Terracotta — key actions, buttons, "Sent" chat bubbles
  primaryDark: '#C25A45', // darker terracotta for pressed/active states
  background: '#FFF8F4', // Surface (Cream) — main screen background
  card: '#FBF2EB', // Surface Container — card backgrounds, "Received" chat bubbles
  border: '#E1D8D2', // Surface Dim — subtle section dividers
  textPrimary: '#4A3F3A', // Text (Deep Brown)
  textSecondary: '#8C7E77', // Text Secondary — metadata, timestamps, placeholders
  textMuted: '#8C7E77',
  inactive: '#8C7E77',
  success: '#7A846A', // Maintenance/Utility (Sage Green)
  successBg: '#EEF1E9',
  warningBg: '#F6E4E4',
  warningText: '#8B3A3A', // Urgent/Critical (Deep Red)
  visitorBg: '#F6E8DA',
  visitorText: '#8C7E77',
};

export const radii = {
  card: 12,
  input: 8,
  button: 24,
  pill: 20,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

export const typography = {
  title: { fontSize: 16, fontWeight: '700' as const, color: colors.textPrimary },
  body: { fontSize: 13, color: colors.textSecondary },
  meta: { fontSize: 11, color: colors.textMuted },
};
