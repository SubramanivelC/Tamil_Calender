import { lightColors, darkColors, type ThemeColors } from './colors';
import { fontSizes } from './typography';
import { spacing, radius, minTouchTarget } from './spacing';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSizes: typeof fontSizes;
}

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  spacing,
  radius,
  fontSizes,
};

export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  spacing,
  radius,
  fontSizes,
};

export const minTouch = minTouchTarget;
