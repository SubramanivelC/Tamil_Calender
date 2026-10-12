import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language, NumeralStyle, FirstDayOfWeek } from '@/types';
import type { ThemeMode } from '@/theme/theme';
import type { FontScale } from '@/theme/typography';

export interface SettingsState {
  themeMode: ThemeMode;
  fontScale: number;
  language: Language;
  numerals: NumeralStyle;
  defaultCalendarView: 'monthly' | 'annual';
  firstDayOfWeek: FirstDayOfWeek;
  location: string;
  festivalRemindersEnabled: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setFontScale: (scale: number) => void;
  setLanguage: (lang: Language) => void;
  setNumerals: (style: NumeralStyle) => void;
  setDefaultCalendarView: (view: 'monthly' | 'annual') => void;
  setFirstDayOfWeek: (day: FirstDayOfWeek) => void;
  setLocation: (location: string) => void;
  setFestivalRemindersEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      fontScale: 1,
      language: 'ta',
      numerals: 'arabic',
      defaultCalendarView: 'monthly',
      firstDayOfWeek: 0,
      location: 'Chennai',
      festivalRemindersEnabled: true,

      setThemeMode: (mode) => set({ themeMode: mode }),
      setFontScale: (scale) => set({ fontScale: scale }),
      setLanguage: (lang) => set({ language: lang }),
      setNumerals: (style) => set({ numerals: style }),
      setDefaultCalendarView: (view) => set({ defaultCalendarView: view }),
      setFirstDayOfWeek: (day) => set({ firstDayOfWeek: day }),
      setLocation: (location) => set({ location }),
      setFestivalRemindersEnabled: (enabled) => set({ festivalRemindersEnabled: enabled }),
    }),
    {
      name: 'thirunellai.settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
