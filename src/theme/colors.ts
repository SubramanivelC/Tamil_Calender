/**
 * Centralized design tokens — Tamil Calendar.
 *
 * Every color, spacing, radius, and typography choice lives here.
 * UI components must never hardcode colors; they read from `useTheme()`.
 */

export const palette = {
  // Primary accents
  primaryMaroon: '#762536',
  deepBurgundy: '#4B1724',
  mutedGold: '#C5A05A',

  // Warm neutrals (light)
  warmIvory: '#FFFBF5',
  softBeige: '#F2EBE1',
  paleRose: '#F5E8E9',

  // Text (light scheme)
  primaryText: '#292524',
  secondaryText: '#77716E',
  white: '#FFFFFF',

  // Semantic
  successGreen: '#3F6212',
  errorRed: '#B3261E',
  infoBlue: '#1D4ED8',
  festivalDot: '#B45309',

  // Overlays & dividers
  dividerLight: 'rgba(41,37,36,0.08)',
  dividerDark: 'rgba(255,251,245,0.12)',
} as const;

export const lightColors = {
  background: palette.warmIvory,
  surface: palette.white,
  surfaceMuted: palette.softBeige,
  surfaceAccent: palette.paleRose,

  text: palette.primaryText,
  textSecondary: palette.secondaryText,
  textOnMaroon: palette.white,

  primary: palette.primaryMaroon,
  primaryMuted: 'rgba(118, 37, 54, 0.12)',
  deepBurgundy: palette.deepBurgundy,
  gold: palette.mutedGold,
  goldSoft: 'rgba(197, 160, 90, 0.28)',

  border: 'rgba(118, 37, 54, 0.14)',
  divider: palette.dividerLight,

  today: palette.primaryMaroon,
  selected: palette.primaryMaroon,
  festival: palette.festivalDot,
  success: palette.successGreen,
  error: palette.errorRed,
  info: palette.infoBlue,

  tabBarBackground: palette.white,
  tabBarActive: palette.primaryMaroon,
  tabBarInactive: palette.secondaryText,
} as const;

export const darkColors = {
  background: '#1B1414',
  surface: '#251B1B',
  surfaceMuted: '#2F2222',
  surfaceAccent: '#3A2626',

  text: '#F3ECE5',
  textSecondary: '#B5A79F',
  textOnMaroon: palette.white,

  primary: '#D98BA0',
  primaryMuted: 'rgba(217, 139, 160, 0.18)',
  deepBurgundy: '#2A1015',
  gold: '#D9B97C',
  goldSoft: 'rgba(217, 185, 124, 0.22)',

  border: 'rgba(243, 236, 229, 0.14)',
  divider: palette.dividerDark,

  today: '#D98BA0',
  selected: '#D98BA0',
  festival: '#E5A66B',
  success: '#A3C76D',
  error: '#E57373',
  info: '#8AB4F8',

  tabBarBackground: '#251B1B',
  tabBarActive: '#D98BA0',
  tabBarInactive: '#B5A79F',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceAccent: string;
  text: string;
  textSecondary: string;
  textOnMaroon: string;
  primary: string;
  primaryMuted: string;
  deepBurgundy: string;
  gold: string;
  goldSoft: string;
  border: string;
  divider: string;
  today: string;
  selected: string;
  festival: string;
  success: string;
  error: string;
  info: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
};
