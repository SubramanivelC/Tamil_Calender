import { useEffect, useState } from 'react';
import { parseDateKey } from '@/utils/dates';
import { getPanchangamForDate } from '@/database/repositories/panchangamRepo';
import {
  RASI_NAMES,
  computeDailyPalam,
  julianDayAtSunrise,
  type DailyPalam,
} from '@/data/rasiPalam';
import { useSettingsStore } from '@/store/settingsStore';
import {
  chandrashtamaStarIndex,
  chandrashtamaWindowForDate,
  jdUtToIstDayKey,
  jdUtToIstHHmm,
  NAKSHATRA_ARC_DEG,
  moonSiderealAtJdUt,
} from '@/services/panchangamCalc';
import { chennaiSunriseJdUt } from '@/services/lunarEphemeris';
import { NAKSHATRA_NAMES } from '@/data/mappings';

export interface ChandrashtamaInfo {
  /** 'active' = window intersects the queried panchang day. */
  status: 'active' | 'upcoming';
  /** Chandrashtama star (8th inclusive from the janma star), 0..26. */
  starIndex: number;
  starLabel: string;
  /** IST 'HH:mm' instants of the moon's entry/exit. */
  startHHmm: string;
  startDayKey: string;
  endHHmm: string;
  endDayKey: string;
}

export interface RasiPalamData {
  rasiName: string; // bilingual name of the user's rasi
  palam: DailyPalam;
  /** Star-based Chandrashtama window; null when no birth star is stored. */
  chandrashtama: ChandrashtamaInfo | null;
  /**
   * True when the day would be the rasi-transit-8 ('chandrashtama') case
   * but the personalized star-based verdict could not be issued because
   * the user never set a birth star. The UI then shows the set-your-star
   * prompt instead of a personalized verdict.
   */
  chandrashtamaNeedsStar: boolean;
}

/**
 * Star-based Chandrashtama window for the stored janma star:
 * the 8th nakshatra counted inclusively, with the actual moon-occupancy
 * interval solved from the ephemeris (never a fixed day offset).
 */
function chandrashtamaFor(dateKey: string, birthStar: number): ChandrashtamaInfo {
  const w = chandrashtamaWindowForDate(dateKey, birthStar);
  return {
    status: w.status,
    starIndex: w.starIndex,
    starLabel: NAKSHATRA_NAMES[w.starIndex] ?? '',
    startHHmm: jdUtToIstHHmm(w.startJdUt),
    startDayKey: jdUtToIstDayKey(w.startJdUt),
    endHHmm: jdUtToIstHHmm(w.endJdUt),
    endDayKey: jdUtToIstDayKey(w.endJdUt),
  };
}

/**
 * Today's rasi palam for the stored janma rasi. Reuses the engine's
 * sunrise (IST) for the exact instant, matching the panchangam rows the
 * user already sees. Returns null when the user hasn't configured a rasi.
 */
export function useRasiPalam(dateKey: string): RasiPalamData | null {
  const rasi = useSettingsStore((s) => s.rasiPalamRasi);
  const birthStar = useSettingsStore((s) => s.rasiPalamBirthStar);
  const [palam, setPalam] = useState<DailyPalam | null>(null);
  const [chandrashtama, setChandrashtama] = useState<ChandrashtamaInfo | null>(null);
  const [needsStar, setNeedsStar] = useState(false);

  useEffect(() => {
    if (rasi === null) {
      setPalam(null);
      setChandrashtama(null);
      setNeedsStar(false);
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
      const jdSunrise = julianDayAtSunrise(year, month, day, sunrise);
      const computed = computeDailyPalam(jdSunrise, rasi, dayOfYear);

      // Star-based Chandrashtama override. The mandated convention is the
      // janma NAKSHATRA rule; the rasi-transit-8 category alone must not
      // present a personalized Chandrashtama verdict.
      let ch: ChandrashtamaInfo | null = null;
      let derived = computed;
      if (birthStar !== null) {
        ch = chandrashtamaFor(dateKey, birthStar);
        if (ch.status === 'active') {
          derived = { ...computed, category: 'chandrashtama' };
        } else if (computed.category === 'chandrashtama') {
          // Rasi transit says 8th, but the star-based window is elsewhere
          // on this day — downgrade to caution without a personal verdict.
          derived = { ...computed, category: 'caution' };
        }
      } else if (computed.category === 'chandrashtama') {
        // No janma star stored: never invent one. Ask for it instead.
        derived = { ...computed, category: 'caution' };
      }
      if (cancelled) return;
      setPalam(derived);
      setChandrashtama(ch);
      setNeedsStar(birthStar === null && computed.category === 'chandrashtama');
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey, rasi, birthStar]);

  if (rasi === null || palam === null) return null;
  return {
    rasiName: RASI_NAMES[rasi] ?? '',
    palam,
    chandrashtama,
    chandrashtamaNeedsStar: needsStar,
  };
}

/** True when the moon sits inside the Chandrashtama star at `jdSunrise`. */
export function moonInChandrashtamaStarAt(
  jdSunrise: number,
  janmaStarIndex: number
): boolean {
  const target = chandrashtamaStarIndex(janmaStarIndex) * NAKSHATRA_ARC_DEG;
  const rel = ((moonSiderealAtJdUt(jdSunrise) - target) % 360 + 360) % 360;
  return rel < NAKSHATRA_ARC_DEG;
}

/** Sunrise (UT JD) for 'YYYY-MM-DD', used by the all-rasis card. */
export function sunriseJdForDateKey(dateKey: string): number {
  const { y, m, d } = splitDateKey(dateKey);
  return chennaiSunriseJdUt(y, m, d);
}

function splitDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y: y ?? 2026, m: m ?? 1, d: d ?? 1 };
}
