import { useEffect, useState, useCallback } from 'react';
import type { DayDecoration } from '@/components/calendar/monthGrid';
import { getTamilDaysForMonth } from '@/database/repositories/panchangamRepo';
import { getObservancesForMonth } from '@/database/repositories/festivalRepo';
import { getYearlyEventsInRange, getEventsInRange } from '@/database/repositories/eventsRepo';
import { addDays } from '@/utils/dates';

export interface MonthDecorations {
  map: Map<string, DayDecoration>;
  loading: boolean;
  refetch: () => void;
}

/**
 * Builds a per-date decoration map for one Gregorian month:
 * - Tamil date numbers (DB-backed with engine fallback)
 * - Amavasai / Pournami markers from the verified observances dataset
 * - User events (exact + yearly-repeating)
 */
export function useMonthDecorations(year: number, month: number): MonthDecorations {
  const [map, setMap] = useState<Map<string, DayDecoration>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tamilDays, obRows] = await Promise.all([
          getTamilDaysForMonth(year, month),
          getObservancesForMonth(year, month),
        ]);
        const startKey = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endKey = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        // Include the grid's leading/trailing adjacent-month days.
        const events = [
          ...(await getEventsInRange(addDays(startKey, -7), addDays(endKey, 7))),
        ];
        const yearly = await getYearlyEventsInRange(addDays(startKey, -7), addDays(endKey, 7));
        const yearlyKeys = new Set<string>();
        const startMd = addDays(startKey, -7).slice(5);
        const endMd = addDays(endKey, 7).slice(5);
        for (const ev of yearly) {
          const md = ev.dateKey.slice(5);
          const inWindow =
            startMd <= endMd ? md >= startMd && md <= endMd : md >= startMd || md <= endMd;
          if (inWindow) {
            // Mark every day in the month window that matches this MM-DD.
            for (let d = 1; d <= lastDay; d++) {
              yearlyKeys.add(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }
          }
        }

        const result = new Map<string, DayDecoration>();
        const allKeys = new Set<string>([
          ...tamilDays.keys(),
          ...obRows.map((o) => o.date_key),
          ...events.map((e) => e.dateKey),
        ]);
        for (const key of allKeys) {
          const td = tamilDays.get(key);
          const obs = obRows.filter((o) => o.date_key === key);
          const hasEvent =
            events.some((e) => e.dateKey === key) ||
            (yearlyKeys.has(key) &&
              yearly.some((e) => e.dateKey.slice(5) === key.slice(5)));
          const decor: DayDecoration = {
            tamilDay: td?.day ?? null,
            tamilMonth: td?.month ?? null,
            isAmavasai: obs.some((o) => o.kind === 'amavasai'),
            isPournami: obs.some((o) => o.kind === 'pournami'),
            hasEvent,
          };
          if (decor.tamilDay !== null || decor.isAmavasai || decor.isPournami || decor.hasEvent) {
            result.set(key, decor);
          }
        }
        if (!cancelled) setMap(result);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, tick]);

  return { map, loading, refetch };
}
