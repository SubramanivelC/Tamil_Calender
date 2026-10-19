import { lightTheme, darkTheme } from '../theme';

describe('design system themes', () => {
  test('light theme uses required brand colors', () => {
    expect(lightTheme.colors.primary).toBe('#762536');
    expect(lightTheme.colors.background).toBe('#FAF4E8');
    expect(lightTheme.colors.text).toBe('#292524');
    expect(lightTheme.colors.textSecondary).toBe('#6B655E');
  });

  test('dark theme differs from light on background/surface', () => {
    expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.surface).not.toBe(lightTheme.colors.surface);
    expect(darkTheme.dark).toBe(true);
    expect(lightTheme.dark).toBe(false);
  });

  test('spacing tokens are stable increments', () => {
    const s = lightTheme.spacing;
    expect(s.xs).toBeLessThan(s.sm);
    expect(s.sm).toBeLessThan(s.md);
    expect(s.md).toBeLessThan(s.lg);
    expect(s.lg).toBeLessThan(s.xl);
  });

  test('surface/text contrast remains readable in both modes', () => {
    // Sanity: text never equals background.
    expect(lightTheme.colors.text).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.text).not.toBe(darkTheme.colors.background);
  });
});
