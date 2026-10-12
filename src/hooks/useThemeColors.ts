import { useTheme } from '@/theme/ThemeProvider';

export function useThemeColors() {
  const theme = useTheme();
  return { colors: theme.colors, dark: theme.dark, theme };
}
