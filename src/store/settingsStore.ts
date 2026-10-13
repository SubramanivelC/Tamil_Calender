import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language, NumeralStyle, FirstDayOfWeek } from '@/types';
import type { ThemeMode } from '@/theme/theme';
import type { FontScale } from '@/theme/typography';
import { rasiIndexForStar } from '@/data/rasiPalam';

export interface SettingsState {
  themeMode: ThemeMode;
  fontScale: number;
  language: Language;
  numerals: NumeralStyle;
  defaultCalendarView: 'monthly' | 'annual';
  firstDayOfWeek: FirstDayOfWeek;
  location: string;
  festivalRemindersEnabled: boolean;
  /** Rasi palam — janma rasi index 0..11, null until the user picks one. */
  rasiPalamRasi: number | null;
  /** Optional birth star 0..26 + pada 1..4 (sets/overrides rasiPalamRasi). */
  rasiPalamBirthStar: number | null;
  rasiPalamBirthPada: 1 | 2 | 3 | 4 | null;
  /** Daily rasi palam notification. */
  dailyPalamEnabled: boolean;
  dailyPalamTime: string; // 'HH:mm', default 07:00

  setThemeMode: (mode: ThemeMode) => void;
  setFontScale: (scale: number) => void;
  setLanguage: (lang: Language) => void;
  setNumerals: (style: NumeralStyle) => void;
  setDefaultCalendarView: (view: 'monthly' | 'annual') => void;
  setFirstDayOfWeek: (day: FirstDayOfWeek) => void;
  setLocation: (location: string) => void;
  setFestivalRemindersEnabled: (enabled: boolean) => void;
  setRasi: (rasi: number) => void;
  setBirthStar: (star: number, pada: 1 | 2 | 3 | 4) => void;
  clearRasi: () => void;
  setDailyPalamEnabled: (enabled: boolean) => void;
  setDailyPalamTime: (time: string) => void;
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
      rasiPalamRasi: null,
      rasiPalamBirthStar: null,
      rasiPalamBirthPada: null,
      dailyPalamEnabled: false,
      dailyPalamTime: '07:00',

      setThemeMode: (mode) => set({ themeMode: mode }),
      setFontScale: (scale) => set({ fontScale: scale }),
      setLanguage: (lang) => set({ language: lang }),
      setNumerals: (style) => set({ numerals: style }),
      setDefaultCalendarView: (view) => set({ defaultCalendarView: view }),
      setFirstDayOfWeek: (day) => set({ firstDayOfWeek: day }),
      setLocation: (location) => set({ location }),
      setFestivalRemindersEnabled: (enabled) => set({ festivalRemindersEnabled: enabled }),
      setRasi: (rasi) =>
        set({
          rasiPalamRasi: ((rasi % 12) + 12) % 12,
          // A direct rasi pick clears stale birth-star derivation so the
          // Settings UI shows the rasi as chosen, not re-derived.
          rasiPalamBirthStar: null,
          rasiPalamBirthPada: null,
        }),
      setBirthStar: (star, pada) => {
        const normalizedStar = ((star % 27) + 27) % 27;
        const normalizedPada = pada < 1 || pada > 4 ? 1 : pada;
        // Janma rasi follows from the star+pada via the standard mapping.
        set({
          rasiPalamBirthStar: normalizedStar,
          rasiPalamBirthPada: normalizedPada,
          rasiPalamRasi: rasiIndexForStar(normalizedStar, normalizedPada),
        });
      },
      clearRasi: () =>
        set({ rasiPalamRasi: null, rasiPalamBirthStar: null, rasiPalamBirthPada: null }),
      setDailyPalamEnabled: (enabled) => set({ dailyPalamEnabled: enabled }),
      setDailyPalamTime: (time) => set({ dailyPalamTime: time }),
    }),
    {
      name: 'thirunellai.settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
