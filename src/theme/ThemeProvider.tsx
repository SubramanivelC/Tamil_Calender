import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './theme';
import { useSettingsStore } from '@/store/settingsStore';

interface ThemeContextValue {
  theme: Theme;
  fontScale: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const fontScalePref = useSettingsStore((s) => s.fontScale);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedDark =
      themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
    const theme = resolvedDark ? darkTheme : lightTheme;
    return { theme, fontScale: fontScalePref };
  }, [themeMode, scheme, fontScalePref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue['theme'] {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx.theme;
}

export function useFontScale(): number {
  const ctx = useContext(ThemeContext);
  return ctx ? ctx.fontScale : 1;
}

/** Token-aware StyleSheet factory. */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
) {
  return factory;
}
