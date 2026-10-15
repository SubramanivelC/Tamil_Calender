/**
 * Engine-derived lunar observance dates for ARBITRARY year ranges.
 *
 * The bundled dataset (seedData.ts) runs these same generators over its
 * 2026–2029 coverage window at import time. This module is the shared,
 * per-range core so the repositories can compute the same printed-calendar
 * conventions for any navigable Gregorian year (1900–2100) on demand —
 * nothing here is copy-typed; every date comes from the bundled sidereal
 * ephemeris (panchangamAstro.ts, Meeus-anchored, see tests).
 *
 * Convention (matches printed Tamil daily calendars):
 *  - Sunrise anchor 06:00 IST for the elongation sample.
 *  - Amavasai = calendar day containing the conjunction (elongation wraps
 *    past 0° between two sunrises); Pournami = the day containing full
 *    moon (elongation crosses 180° upward). The phase instant is
 *    interpolated linearly; the day owning a phase before 18:00 IST is
 *    marked, else the next day (the printed convention).
 *  - Tithi-band observances take the day where the moon-sun elongation is
 *    closest to the band center (local minimum), guaranteeing exactly one
 *    day per fortnight even when a fast moon skips a ±8° window
 *    (Ekadasi = tithi 11 ⇒ centers 126/306; Pradosham = trayodashi ⇒
 *    centers 150/330).
 */
import { julianDay, sunMoonLongitudesAtJd, norm360 } from '@/services/panchangamAstro';

export type AmPournamiKind = 'amavasai' | 'pournami';

export interface LunarPhaseRecord {
  dateKey: string;
  kind: AmPournamiKind;
}

/** Moon-sun elongation 0..360 at approx. sunrise (06:00 IST) on a local date. */
export function elongAtSunriseIST(y: number, m: number, d: number): number {
  const jd = julianDay(y, m, d, (6 * 60 - 330) / 1440);
  const { moonTropical, sunTropical } = sunMoonLongitudesAtJd(jd);
  return norm360(moonTropical - sunTropical);
}

/** Shortest angular distance a→b across the 0/360 wrap. */
function angularDist(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function eachDay(
  startY: number,
  endY: number,
  cb: (y: number, m: number, d: number, e: number) => void
): void {
  for (let y = startY; y <= endY; y++) {
    for (let m = 1; m <= 12; m++) {
      const dim = new Date(y, m, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        cb(y, m, d, elongAtSunriseIST(y, m, d));
      }
    }
  }
}

/**
 * Amavasai + Pournami calendar days over an inclusive Gregorian year range.
 * O(days); ~7 ms/year with the truncated-series ephemeris.
 */
export function amPournaForRange(startY: number, endY: number): LunarPhaseRecord[] {
  const rows: LunarPhaseRecord[] = [];
  const dates: { key: string; e: number }[] = [];
  eachDay(startY, endY, (y, m, d, e) => dates.push({ key: toDateKey(y, m, d), e }));
  for (let i = 0; i < dates.length - 1; i++) {
    const cur = dates[i];
    const next = dates[i + 1];
    if (!cur || !next) continue;
    const a = cur.e;
    const b = next.e;
    // Amavasai: elongation wrapping past 0 (a>180 falls to b<180).
    if (a > 180 && b < 180) {
      const offsetH = ((360 - a) / (b + (360 - a))) * 24;
      rows.push({
        dateKey: offsetH < 18 ? cur.key : next.key,
        kind: 'amavasai',
      });
    }
    // Pournami: elongation crossing 180 upward.
    if (a < 180 && b > 180) {
      const offsetH = ((180 - a) / (b - a)) * 24;
      rows.push({
        dateKey: offsetH < 18 ? cur.key : next.key,
        kind: 'pournami',
      });
    }
  }
  return rows;
}

/**
 * Tithi-band observance dates (Ekadasi/Pradosham day rule) over an inclusive
 * Gregorian year range: the local minimum of angular distance to the band
 * center, cached as whole ranges by callers.
 */
export function tithiBandDatesForRange(
  centers: number[],
  startY: number,
  endY: number
): string[] {
  const days: { key: string; dist: number }[] = [];
  eachDay(startY, endY, (y, m, d, e) => {
    const dist = Math.min(...centers.map((c) => angularDist(e, c)));
    days.push({ key: toDateKey(y, m, d), dist });
  });
  const out: string[] = [];
  for (let i = 1; i < days.length - 1; i++) {
    const cur = days[i];
    const prev = days[i - 1];
    const next = days[i + 1];
    if (!cur || !prev || !next) continue;
    if (cur.dist < 8 && cur.dist <= next.dist && cur.dist < prev.dist) {
      out.push(cur.key);
    }
  }
  return out;
}

/** Pradosham = trayodashi (tithi 13) band centers. */
export const PRADOSHAM_CENTERS = [150, 330];
/** Ekadasi = tithi 11 band centers. */
export const EKADASI_CENTERS = [126, 306];
