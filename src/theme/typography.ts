/**
 * Typography tokens. The app uses the platform serif stack for headings
 * (Noto Serif Tamil is bundled via expo-font when available - see
 * `useFonts` in `app/_layout.tsx`) with system fallbacks so text always
 * renders even if a custom font fails to load.
 */

export const fontNames = {
  tamilRegular: 'NotoSerifTamil-Regular',
  tamilSemiBold: 'NotoSerifTamil-SemiBold',
  tamilBold: 'NotoSerifTamil-Bold',
} as const;

export const fontFamily = {
  // Bundled custom font when loaded; falls back gracefully in ThemedText.
  custom: {
    regular: fontNames.tamilRegular,
    medium: fontNames.tamilSemiBold,
    bold: fontNames.tamilBold,
  },
  system: {
    regular: undefined as string | undefined,
    medium: undefined as string | undefined,
    bold: undefined as string | undefined,
  },
};

export const fontSizes = {
  caption: 12,
  small: 13,
  body: 15,
  bodyLarge: 16,
  h4: 18,
  h3: 20,
  h2: 24,
  h1: 28,
  display: 34,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.35,
  relaxed: 1.55,
} as const;

export type FontScale = 'small' | 'default' | 'large' | 'extraLarge';

export const fontScaleFactors: Record<FontScale, number> = {
  small: 0.9,
  default: 1,
  large: 1.15,
  extraLarge: 1.3,
};
