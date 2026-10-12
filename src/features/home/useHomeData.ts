import { useEffect, useState, useCallback } from 'react';
import type { DayCell, NumeralStyle, Language } from '@/types';
import type { PanchangamRecord } from '@/types';
import { buildMonthGrid } from '@/components/calendar/monthGrid';
import { useMonthDecorations } from '@/features/calendar/useMonthDecorations';
import {
  getFestivalsForMonth,
  getUpcomingFestivals,
  getFestivalsForDate,
  getObservancesForDate,
  getObservancesForDate as _obs,
} from '@/database/repositories/festivalRepo';
import { getPanchangamForDate } from '@/database/repositories/panchangamRepo';
import { parseDateKey, localTodayKey, toDateKey } from '@/utils/dates';
import { gregorianMonthName, weekdayName, tamilMonthName } from '@/localization';
import { TAMIL_YEAR_CYCLE } from '@/data/mappings';

export interface HomeData {
  todayKey: string;
  todayLabel: string;
  selectedGregorianLabel: string;
  selectedTamilLabel: string;
  selectedMonthName: string;
  grid: DayCell[];
  selectedPanchang: PanchangamRecord;
  selectedVerified: boolean;
  upcoming: {
    festivalId: number;
    dateKey: string;
    nameTa: string;
    nameEn: string;
    daysUntil: number;
  }[];
}

/**
 * Loads everything the Home screen renders for the currently selected date,
 * entirely from the local SQLite database (offline).
 */
export function useHomeData(selectedKey: string): {
  data: HomeData | null;
  loading: boolean;
  refetch: () => void;
} {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const parts0 = parseDateKey(selectedKey);
  const { map: decorations } = useMonthDecorations(parts0.year, parts0.month);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { year, month } = parseDateKey(selectedKey);
        const todayKey = localTodayKey();
        const language = useSettingsLanguage();
        const numerals = useSettingsNumerals();

        // Build grid flags from DB.
        const festivals = await getFestivalsForMonth(year, month);
        const festivalKeys = new Set(festivals.map((f) => f.dateKey));
        const grid = buildMonthGrid({ year, month, firstDayOfWeek: useSettingsFirstDay(), festivalKeys, decorations });

        const [{ record, verified }, upcoming, dayFestivals, observances] = await Promise.all([
          getPanchangamForDate(selectedKey),
          getUpcomingFestivals(5),
          getFestivalsForDate(selectedKey),
          getObservancesForDate(selectedKey),
        ]);

        if (cancelled) return;

        const dayNum = parseDateKey(selectedKey);
        const observanceSuffix = observances.map((o) => o.kind).join(', ');
        setData({
          todayKey,
          todayLabel: formatToday(todayKey, language),
          selectedGregorianLabel: formatGregorian(selectedKey, language),
          selectedTamilLabel: await formatTamil(selectedKey, language),
          selectedMonthName: gregorianMonthName(month, language),
          grid,
          selectedPanchang: record,
          selectedVerified: verified,
          upcoming,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedKey, tick, decorations]);

  return { data, loading, refetch };
}

// Lazily imported settings selectors (avoid store import cycle at module top).
import { useSettingsStore } from '@/store/settingsStore';

function useSettingsLanguage(): Language {
  return useSettingsStore.getState().language;
}
function useSettingsNumerals(): NumeralStyle {
  return useSettingsStore.getState().numerals;
}
function useSettingsFirstDay(): 0 | 1 {
  return useSettingsStore.getState().firstDayOfWeek;
}

function formatToday(key: string, language: Language): string {
  const { year, month, day } = parseDateKey(key);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${weekdayName(weekday, language)}, ${gregorianMonthName(month, language)} ${day}, ${year}`;
}

function formatGregorian(key: string, language: Language): string {
  const { year, month, day } = parseDateKey(key);
  const weekday = new Date(year, month - 1, day).getDay();
  return `${weekdayName(weekday, language)}, ${gregorianMonthName(month, language)} ${day}, ${year}`;
}

async function formatTamil(key: string, language: Language): Promise<string> {
  const [{ getTamilDate }] = await Promise.all([
    import('@/database/repositories/panchangamRepo'),
  ]);
  const td = await getTamilDate(key);
  if (!td || td.month === null || td.day === null) {
    return '—';
  }
  const monthName = tamilMonthName(td.month, language);
  const yearName = td.yearIndex !== null ? TAMIL_YEAR_CYCLE[td.yearIndex] : null;
  const yearLabel = yearName ? (language === 'ta' ? yearName.ta : yearName.en) : '';
  return `${monthName} ${td.day}, ${yearLabel}`.trim();
}
