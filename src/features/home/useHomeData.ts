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
  // Subscribe to settings *reactively* — reading getState() inside the effect
  // froze these labels in whatever language was active at first render, so the
  // Home hero stayed in Tamil after switching to English. Recompute on change.
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const parts0 = parseDateKey(selectedKey);
  const { map: decorations } = useMonthDecorations(parts0.year, parts0.month);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { year, month } = parseDateKey(selectedKey);
        const todayKey = localTodayKey();

        // Build grid flags from DB.
        const festivals = await getFestivalsForMonth(year, month);
        const festivalKeys = new Set(festivals.map((f) => f.dateKey));
        const grid = buildMonthGrid({ year, month, firstDayOfWeek, festivalKeys, decorations });

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
  }, [selectedKey, tick, decorations, language, numerals, firstDayOfWeek]);

  return { data, loading, refetch };
}

// Lazily imported settings selectors (avoid store import cycle at module top).
import { useSettingsStore } from '@/store/settingsStore';

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
