import { useEffect, useState, useCallback } from 'react';
import type { FestivalOccurrence } from '@/types';
import { getPanchangamForDate, getTamilDate } from '@/database/repositories/panchangamRepo';
import { getFestivalsForDate, getObservancesForDate } from '@/database/repositories/festivalRepo';
import { getNote, isBookmarked } from '@/database/repositories/userDataRepo';
import { convertToTamil } from '@/services/tamilCalendarService';
import { dateKeyToDate, parseDateKey, addDays } from '@/utils/dates';
import { weekdayName, tamilMonthName, useT as _useT } from '@/localization';
import { TAMIL_YEAR_CYCLE } from '@/data/mappings';
import type { Language } from '@/types';

export interface DayDetailsData {
  dateKey: string;
  weekdayLabel: string;
  gregorianLabel: string;
  tamilDay: number | null;
  tamilMonthLabel: string | null;
  tamilYearLabel: string | null;
  pakshaLabel: string | null;
  panchangam: Awaited<ReturnType<typeof getPanchangamForDate>>;
  festivals: FestivalOccurrence[];
  observances: { kind: string; nameTa: string; nameEn: string }[];
  note: string | null;
  bookmarked: boolean;
}

export function useDayDetails(dateKey: string, language: Language) {
  const [data, setData] = useState<DayDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(() => undefined, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const date = dateKeyToDate(dateKey);
        const [{ record, verified, source }, tamilRow, festivals, observances, note, bookmarked] =
          await Promise.all([
            getPanchangamForDate(dateKey),
            getTamilDate(dateKey),
            getFestivalsForDate(dateKey),
            getObservancesForDate(dateKey),
            getNote(dateKey),
            isBookmarked(dateKey),
          ]);
        const conv = convertToTamil(date);
        const td = tamilRow ?? {
          day: conv.day,
          month: conv.month,
          yearIndex: conv.yearIndex,
          paksha: conv.paksha,
        };
        if (cancelled) return;
        const { month: m, day: d } = parseDateKey(dateKey);
        setData({
          dateKey,
          weekdayLabel: weekdayName(date.getDay(), language),
          gregorianLabel: `${d}/${m}/${date.getFullYear()}`,
          tamilDay: td.day,
          tamilMonthLabel: td.month !== null ? tamilMonthName(td.month, language) : null,
          tamilYearLabel:
            td.yearIndex !== null
              ? (TAMIL_YEAR_CYCLE[td.yearIndex]?.[language === 'ta' ? 'ta' : 'en'] ?? null)
              : null,
          pakshaLabel: td.paksha,
          panchangam: { record, verified, source },
          festivals,
          observances: observances.map((o) => ({
            kind: o.kind,
            nameTa: o.name_ta,
            nameEn: o.name_en,
          })),
          note: note?.text ?? null,
          bookmarked,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey, language]);

  return { data, loading, refetch, previousKey: addDays(dateKey, -1), nextKey: addDays(dateKey, 1) };
}
