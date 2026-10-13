import { useEffect, useState } from 'react';
import { parseDateKey } from '@/utils/dates';
import { getPanchangamForDate } from '@/database/repositories/panchangamRepo';
import { RASI_NAMES, computeDailyPalam, julianDayAtSunrise, type DailyPalam } from '@/data/rasiPalam';
import { useSettingsStore } from '@/store/settingsStore';

export interface RasiPalamData {
  rasiName: string; // bilingual name of the user's rasi
  palam: DailyPalam;
}

/**
 * Today's rasi palam for the stored janma rasi. Reuses the engine's
 * sunrise (IST) for the exact instant, matching the panchangam rows the
 * user already sees. Returns null when the user hasn't configured a rasi.
 */
export function useRasiPalam(dateKey: string): RasiPalamData | null {
  const rasi = useSettingsStore((s) => s.rasiPalamRasi);
  const [palam, setPalam] = useState<DailyPalam | null>(null);

  useEffect(() => {
    if (rasi === null) {
      setPalam(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { year, month, day } = parseDateKey(dateKey);
      // Sunrise exactly as the panchangam card shows it; fallback handled
      // inside julianDayAtSunrise.
      let sunrise: string | null = null;
      try {
        const { record } = await getPanchangamForDate(dateKey);
        sunrise = record.sunrise;
      } catch {
        // engine fallback default (06:00) applies
      }
      const dayOfYear = Math.round(
        (new Date(year, month - 1, day).getTime() - new Date(year, 0, 1).getTime()) / 86400000
      ) + 1;
      const computed = computeDailyPalam(julianDayAtSunrise(year, month, day, sunrise), rasi, dayOfYear);
      if (!cancelled) setPalam(computed);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey, rasi]);

  if (rasi === null || palam === null) return null;
  return {
    rasiName: RASI_NAMES[rasi] ?? '',
    palam,
  };
}
