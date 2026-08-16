/**
 * Cinematic dark theme — derived from the sibling web artifact's CSS tokens.
 * Both light and dark palettes are set to the same dark cinematic values so
 * the app always renders in dark mode regardless of device system setting.
 */

const palette = {
  text: '#eef1fa',
  tint: '#5be3d8',
  background: '#05070c',
  foreground: '#eef1fa',
  card: '#0d1120',
  cardForeground: '#eef1fa',
  primary: '#8f7bf0',
  primaryForeground: '#05070c',
  secondary: '#1a2342',
  secondaryForeground: '#eef1fa',
  muted: '#141929',
  mutedForeground: '#93a0bd',
  accent: '#5be3d8',
  accentForeground: '#05070c',
  destructive: '#f0748a',
  destructiveForeground: '#ffffff',
  success: '#0acc68',
  successForeground: '#ffffff',
  border: '#242e4d',
  input: '#1a2342',
  // Extended cinematic tokens
  cyan: '#5be3d8',
  violet: '#8f7bf0',
  rose: '#f0748a',
  amber: '#f0b84f',
  orange: '#f0a35c',
  lblue: '#6fd3f0',
  surface: '#111827',
};

const colors = {
  light: palette,
  dark: palette,
  radius: 12,
};

export default colors;
