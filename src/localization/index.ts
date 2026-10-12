import { useCallback } from 'react';
import { taDict } from './ta';
import { enDict } from './en';
import type { Language } from '@/types';
import { WEEKDAYS, TAMIL_MONTHS } from '@/data/mappings';
import { useSettingsStore } from '@/store/settingsStore';

export { taDict, enDict };

const dicts: Record<Language, Record<string, string>> = {
  ta: taDict as unknown as Record<string, string>,
  en: enDict as unknown as Record<string, string>,
};

export function translate(
  language: Language,
  key: string,
  vars?: Record<string, string | number>,
  overrideTaDict?: Record<string, string>
): string {
  const dict =
    language === 'ta' && overrideTaDict ? overrideTaDict : dicts[language];
  let str = (dict as Record<string, string>)[key] ?? (enDict as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

/** Hook-based translator for components. */
export function useT(): ReturnType<typeof translateFactory> {
  const language = useLanguage();
  return translateFactory(language);
}

function translateFactory(language: Language) {
  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language]
  );
}

function useLanguage(): Language {
  return useSettingsStore((s) => s.language);
}

/** Weekday name in the requested language. */
export function weekdayName(weekday: number, language: Language, short = false): string {
  const wd = WEEKDAYS[weekday] ?? WEEKDAYS[0];
  if (language === 'ta') return short ? wd.shortTa : wd.ta;
  return short ? wd.shortEn : wd.en;
}

/** Tamil month name (1..12) in the requested language. */
export function tamilMonthName(month: number, language: Language, _short = false): string {
  const m = TAMIL_MONTHS[Math.min(Math.max(month - 1, 0), 11)] ?? TAMIL_MONTHS[0];
  return language === 'ta' ? m.ta : m.en;
}

/** Gregorian month name in the requested language. */
export function gregorianMonthName(month: number, language: Language): string {
  const namesTa: readonly string[] = [
    'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
    'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்',
  ];
  const namesEn: readonly string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const idx = Math.min(Math.max(month - 1, 0), 11);
  const ta = namesTa[idx] ?? 'ஜனவரி';
  const e = namesEn[idx] ?? 'January';
  return language === 'ta' ? ta : e;
}
