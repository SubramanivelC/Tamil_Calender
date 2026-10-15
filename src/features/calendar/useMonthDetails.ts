import { useEffect, useState, useCallback } from 'react';
import type { UserEvent, FestivalOccurrence } from '@/types';
import {
  getObservancesForMonth,
  getFestivalsForMonth,
  type ObservanceRow,
} from '@/database/repositories/festivalRepo';
import { getEventsInRange, getYearlyEventsInRange } from '@/database/repositories/eventsRepo';

export interface MonthDetailEntry {
  dateKey: string;
  /** Display day of month, e.g. 19. */
  day: number;
  /** Festival/bilingual name rows carry a name; phase rows use the kind. */
  nameTa?: string;
  nameEn?: string;
}

export interface MonthDetails {
  loading: boolean;
  amavasai: MonthDetailEntry[];
  pournami: MonthDetailEntry[];
  pradosham: MonthDetailEntry[];
  ekadasi: MonthDetailEntry[];
  subhaMuhurtham: MonthDetailEntry[];
  festivals: (MonthDetailEntry & { isHoliday: boolean })[];
  events: (MonthDetailEntry & { repeatYearly: boolean })[];
  refetch: () => void;
}

/**
 * Everything the monthly calendar's "details list" shows for one Gregorian
 * month: amavasai/pournami, pradosham, ekadasi, subha muhurtham (all
 * engine-published or bundled rows), festivals and the user's own events.
 * Observance dates exist for every navigable year (see lunarPhases);
 * festivals exist only where the verified dataset has rows.
 */
export function useMonthDetails(year: number, month: number): MonthDetails {
  const [state, setState] = useState<Omit<MonthDetails, 'loading' | 'refetch'>>();
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [obRows, festivalRows, events] = await Promise.all([
        getObservancesForMonth(year, month),
        getFestivalsForMonth(year, month),
        (async () => {
          const startKey = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endKey = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          const exactPromise = getEventsInRange(startKey, endKey);
          const md = String(month).padStart(2, '0');
          const localRows = await Promise.all([exactPromise, getYearlyEventsInRange(startKey, endKey)]);
          const rows: UserEvent[] = [...(localRows[0] ?? [])];
          // Yearly repeats land on this year's MM-DD inside the month.
          for (const ev of localRows[1] ?? []) {
            const evMd = ev.dateKey.slice(5, 7);
            if (evMd !== md) continue;
            const day = Number(ev.dateKey.slice(8));
            if (day >= 1 && day <= lastDay) {
              rows.push({ ...ev, dateKey: `${year}-${md}-${String(day).padStart(2, '0')}` });
            }
          }
          rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
          return rows;
        })(),
      ]);
      if (cancelled) return;
      const byKind = (kind: string, rows = obRows): MonthDetailEntry[] =>
        obRows
          .filter((o: ObservanceRow) => o.kind === kind)
          .map((o) => ({
            dateKey: o.date_key,
            day: Number(o.date_key.slice(8)),
            nameTa: o.name_ta,
            nameEn: o.name_en,
          }));
      setState({
        amavasai: byKind('amavasai'),
        pournami: byKind('pournami'),
        pradosham: byKind('pradosham'),
        ekadasi: byKind('ekadasi'),
        subhaMuhurtham: byKind('subha_muhurtham'),
        festivals: festivalRows
          .map((f: FestivalOccurrence) => ({
            dateKey: f.dateKey,
            day: Number(f.dateKey.slice(8)),
            nameTa: f.nameTa,
            nameEn: f.nameEn,
            isHoliday: f.isHoliday,
          }))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
        events: events.map((e) => ({
          dateKey: e.dateKey,
          day: Number(e.dateKey.slice(8)),
          nameTa: e.title,
          repeatYearly: e.repeatYearly,
        }))
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, tick]);

  return {
    loading,
    amavasai: state?.amavasai ?? [],
    pournami: state?.pournami ?? [],
    pradosham: state?.pradosham ?? [],
    ekadasi: state?.ekadasi ?? [],
    subhaMuhurtham: state?.subhaMuhurtham ?? [],
    festivals: state?.festivals ?? [],
    events: state?.events ?? [],
    refetch,
  };
}
