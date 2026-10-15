import { useSettingsStore } from '../settingsStore';

beforeEach(() => {
  // Note: themeMode is NOT pre-set so the store default ('light') is exercised.
  useSettingsStore.setState({
    fontScale: 1,
    language: 'ta',
    numerals: 'arabic',
    defaultCalendarView: 'monthly',
    firstDayOfWeek: 0,
    location: 'Chennai',
    festivalRemindersEnabled: true,
  });
});

describe('settings store', () => {
  test('defaults are sane', () => {
    const s = useSettingsStore.getState();
    expect(s.themeMode).toBe('light');
    expect(s.language).toBe('ta');
    expect(s.firstDayOfWeek).toBe(0);
  });

  test('setters update state', () => {
    useSettingsStore.getState().setThemeMode('dark');
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    useSettingsStore.getState().setLanguage('en');
    expect(useSettingsStore.getState().language).toBe('en');
    useSettingsStore.getState().setNumerals('tamil');
    expect(useSettingsStore.getState().numerals).toBe('tamil');
    useSettingsStore.getState().setFirstDayOfWeek(1);
    expect(useSettingsStore.getState().firstDayOfWeek).toBe(1);
    useSettingsStore.getState().setFontScale(1.15);
    expect(useSettingsStore.getState().fontScale).toBe(1.15);
    useSettingsStore.getState().setDefaultCalendarView('annual');
    expect(useSettingsStore.getState().defaultCalendarView).toBe('annual');
  });
});
