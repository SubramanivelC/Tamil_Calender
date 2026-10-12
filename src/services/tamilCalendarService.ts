/**
 * Tamil calendar conversion engine (solar calendar).
 *
 * Implementation notes (see docs/calendar-dataset.md):
 * - The Tamil solar month boundaries drift ±1 day around solar ingress
 *   (Sankranti) each year. Verified anchors: Chithirai 1 = Tamil New Year
 *   (Puthandu) = April 14; Thai 1 = January 14 (Thai Pongal). The engine uses
 *   the standard fixed Gregorian windows used by printed Tamil calendars.
 * - Where a value cannot be verified (day-level precision near boundaries),
 *   callers must present it as approximate (≈) — never as verified fact.
 * - Paksha approximation: days 1..15 Shukla, 16..30 Krishna. Amavasai/Pournami
 *   come EXCLUSIVELY from the verified observances dataset, never from here.
 * - 60-year cycle: verified anchor — Apr 14, 2026 begins Parabhava
 *   (பிரவ, cycle index 40 in the standard 1-based naming, = index 40 here).
 */
import { TAMIL_MONTHS, TAMIL_YEAR_CYCLE } from '@/data/mappings';

export interface TamilConversion {
  /** Tamil day-of-month (1..31), or null when unknown. */
  day: number | null;
  /** Tamil month index 1..12 (Chithirai..Panguni), or null when unknown. */
  month: number | null;
  /** Index into TAMIL_YEAR_CYCLE (0-based; 40 = Parabhava), or null. */
  yearIndex: number | null;
  isAmavasai: boolean;
  isPournami: boolean;
  paksha: 'Shukla' | 'Krishna' | null;
  /** Month boundary days drift ±1 with solar ingress; day-level data is approximate. */
  approximate: boolean;
}

/** Verified window per Tamil month: [startMonth(1..12), startDay, nextMonth, nextDayExclusive-adjusted] handled via day-of-year logic below. */
interface MonthWindow {
  monthIndex: number; // 1..12
  gregMonthStart: number; // 1..12
  gregDayStart: number;
}

/**
 * Documented start days for each Tamil month (standard printed-calendar
 * windows; ±1 day drift possible near ingress).
 */
const MONTH_WINDOWS: MonthWindow[] = [
  { monthIndex: 10, gregMonthStart: 1, gregDayStart: 14 }, // Thai
  { monthIndex: 11, gregMonthStart: 2, gregDayStart: 13 }, // Masi
  { monthIndex: 12, gregMonthStart: 3, gregDayStart: 15 }, // Panguni
  { monthIndex: 1, gregMonthStart: 4, gregDayStart: 14 }, // Chithirai (Puthandu)
  { monthIndex: 2, gregMonthStart: 5, gregDayStart: 15 }, // Vaikasi
  { monthIndex: 3, gregMonthStart: 6, gregDayStart: 15 }, // Aani
  { monthIndex: 4, gregMonthStart: 7, gregDayStart: 16 }, // Aadi
  { monthIndex: 5, gregMonthStart: 8, gregDayStart: 17 }, // Aavani
  { monthIndex: 6, gregMonthStart: 9, gregDayStart: 17 }, // Purattasi
  { monthIndex: 7, gregMonthStart: 10, gregDayStart: 17 }, // Aippasi
  { monthIndex: 8, gregMonthStart: 11, gregDayStart: 16 }, // Karthigai
  { monthIndex: 9, gregMonthStart: 12, gregDayStart: 16 }, // Margazhi
];

/** Cycle index for the Tamil year that begins (Chithirai 1) in the given Gregorian year. Verified anchor: Apr 14, 2026 begins Parabhava (index 40). */
const ANCHOR_GREG_YEAR = 2026;
const ANCHOR_INDEX = 40; // TAMIL_YEAR_CYCLE[40] = பராபவ / Parabhava
function cycleIndexOf(tamilStartYear: number): number {
  const raw = ANCHOR_INDEX + (tamilStartYear - ANCHOR_GREG_YEAR);
  return ((raw % 60) + 60) % 60;
}

export function convertToTamil(date: Date): TamilConversion {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  // Find the applicable window: current Gregorian year, else previous year's Dec window.
  // Windows sorted by (gregMonthStart, gregDayStart).
  let active: MonthWindow | null = null;
  for (let i = 0; i < MONTH_WINDOWS.length; i++) {
    const w = MONTH_WINDOWS[i]!;
    if (!w) continue;
    const next: MonthWindow =
      i + 1 < MONTH_WINDOWS.length && MONTH_WINDOWS[i + 1]
        ? MONTH_WINDOWS[i + 1]!
        : { monthIndex: MONTH_WINDOWS[0]!.monthIndex, gregMonthStart: 1, gregDayStart: 14 };
    const onOrAfterStart =
      gMonth > w.gregMonthStart ||
      (gMonth === w.gregMonthStart && gDay >= w.gregDayStart);
    const beforeNext =
      gMonth < next.gregMonthStart ||
      (gMonth === next.gregMonthStart && gDay < next.gregDayStart);
    if (onOrAfterStart && beforeNext) {
      active = w;
      break;
    }
  }

  if (!active && gMonth === 1) {
    // Jan 1..13 belongs to Margazhi, which started Dec 16 of the PREVIOUS
    // Gregorian year (Thai 1 = Jan 14; Margazhi runs 29 days from Dec 16).
    const prevYear = gYear - 1;
    const start = new Date(prevYear, 11, 16);
    const diff = Math.round((date.getTime() - start.getTime()) / 86_400_000);
    return {
      day: diff + 1,
      month: 9,
      yearIndex: cycleIndexOf(prevYear),
      isAmavasai: false,
      isPournami: false,
      paksha: (diff + 1) <= 15 ? 'Shukla' : 'Krishna',
      approximate: true,
    };
  }

  if (!active) {
    return {
      day: null,
      month: null,
      yearIndex: null,
      isAmavasai: false,
      isPournami: false,
      paksha: null,
      approximate: false,
    };
  }

  // Day-of-month within the Tamil month (wraps across Gregorian month end).
  const start = new Date(gYear, active.gregMonthStart - 1, active.gregDayStart);
  let diff = Math.round(
    (date.getTime() - start.getTime()) / 86_400_000
  );
  // Dates before the window start in the same Gregorian year belong to the
  // previous month window of the PREVIOUS Gregorian year (e.g. Jan 1).
  if (diff < 0) {
    const prevYearStart = new Date(gYear - 1, active.gregMonthStart - 1, active.gregDayStart);
    diff = Math.round((date.getTime() - prevYearStart.getTime()) / 86_400_000);
  }
  const tamilDay = diff + 1;

  // Tamil year label: the Tamil year restarts at Chithirai 1 (Apr 14).
  // A date on/after Apr 14 belongs to the Tamil year that begins in the
  // current Gregorian year; before that, the previous year's Tamil year.
  let tamilStartYear: number;
  if (gMonth === 1 || (gMonth === 2 && gDay <= 28) || (gMonth === 3) || (gMonth === 4 && gDay < 14)) {
    // Jan..early-Apr => previous Tamil year (window: prev Apr 14 .. Apr 13)
    if (gMonth === 4 && gDay >= 14) tamilStartYear = gYear;
    else if (gMonth === 4) tamilStartYear = gYear - 1;
    else tamilStartYear = gYear - 1;
  } else {
    tamilStartYear = gYear;
  }

  // Verified anchor: Apr 14, 2026 begins Parabhava (cycle index 40).
  const cycleIndex = cycleIndexOf(tamilStartYear);

  const paksha: 'Shukla' | 'Krishna' = tamilDay <= 15 ? 'Shukla' : 'Krishna';

  return {
    day: tamilDay,
    month: active.monthIndex,
    yearIndex: cycleIndex,
    isAmavasai: false, // verified via dataset only
    isPournami: false, // verified via dataset only
    paksha,
    approximate: true, // fixed-window engine: day levels are approximate
  };
}

export function tamilYearName(cycleIndex: number, lang: 'ta' | 'en'): string | null {
  const entry = TAMIL_YEAR_CYCLE[(cycleIndex % TAMIL_YEAR_CYCLE.length + TAMIL_YEAR_CYCLE.length) % TAMIL_YEAR_CYCLE.length];
  if (!entry) return null;
  return lang === 'ta' ? entry.ta : entry.en;
}

export function tamilMonthName(monthIndex: number, lang: 'ta' | 'en'): string | null {
  const entry = TAMIL_MONTHS[monthIndex - 1];
  if (!entry) return null;
  return lang === 'ta' ? entry.ta : entry.en;
}
