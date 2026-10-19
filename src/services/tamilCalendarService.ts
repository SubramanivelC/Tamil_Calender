/**
 * Tamil calendar conversion engine (solar calendar).
 *
 * Method: Tamil solar months begin on the day the sun enters the next rasi
 * (sankranti / solar ingress). The ingress instant is computed with the
 * sidereal ephemeris in ./panchangamAstro (truncated Meeus sun + linear
 * Lahiri ayanamsa, evaluated for Chennai / IST = UTC+5:30) and mapped to a
 * calendar day by the Drik Thiru Ganita (modern/Thirukanitha) convention:
 *
 *   - sankranti before 13:00 IST ... the calendar day itself is month day 1
 *   - sankranti at/after 13:00 IST ... the next day is month day 1
 *
 * IMPORTANT — printed daily-sheet calendars follow the older Vakya
 * panchangam tradition, whose sankranti times can genuinely differ from
 * true-time computation by hours (documented by Drik Panchang,
 * thiruganita-versus-vakyam-panchangam). In such years a month start that
 * is internal-computable lands on a different printed day (verified
 * examples: 2026 Aavani/Purattasi, 2024 Masi, 2027 Aavani). Those cases are
 * pinned by PRINTED_MONTH_STARTS below, transcribed from published
 * calendars (Prokerala monthly calendar, hindupad.com, etc.) and locked by
 * regression tests. Outside the verified set the engine reproduces the
 * Thiru Ganita convention exactly (verified against Drik's Chennai Tamil
 * calendar for every month of 2024-2029).
 *
 * The 13:00 cutoff is empirically bracketed: Mithuna sankranti Jun 15 2026
 * ~12:59 IST still starts Aani the same day, while Tulam sankranti Oct 17
 * 2025 ~13:54 IST and Makara sankranti Jan 14 2026 ~15:13 IST start
 * Aippasi/Thai the next day.
 *
 * Paksha is still derived from day-of-month (days 1..15 Shukla, 16+ Krishna)
 * as a coarse indicator only. Amavasai/Pournami come EXCLUSIVELY from the
 * verified observances dataset, never from here.
 */
import { TAMIL_MONTHS, TAMIL_YEAR_CYCLE } from '@/data/mappings';
import {
  ayanamsaLahiri,
  julianDay,
  norm360,
  sunMoonLongitudesAtJd,
} from './panchangamAstro';

export interface TamilConversion {
  /** Tamil day-of-month (1..32), or null when unknown. */
  day: number | null;
  /** Tamil month index 1..12 (Chithirai..Panguni), or null when unknown. */
  month: number | null;
  /** Index into TAMIL_YEAR_CYCLE (0-based; 40 = Parabhava), or null. */
  yearIndex: number | null;
  isAmavasai: boolean;
  isPournami: boolean;
  paksha: 'Shukla' | 'Krishna' | null;
  /**
   * Month/day are computed from the actual solar ingress (verified against
   * published calendars), so the Tamil date itself is presented as exact.
   * Only the paksha field remains a coarse day-count indicator.
   */
  approximate: boolean;
}

/** Chennai fixed offset in ms (IST = UTC+5:30 — the app's reference city). */
const IST_OFFSET_MS = 5.5 * 3_600_000;

/** Sankranti at/after this many minutes past midnight IST pushes month day 1 to the next calendar day. */
const SAME_DAY_CUTOFF_MIN = 13 * 60;

/** Calendar-day number (timezone-independent) for Y/M/D parts. */
function dayNumberOf(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Sidereal solar longitude at a Julian day (degrees, [0, 360)). */
function sunSiderealAtJd(jd: number): number {
  const { sunTropical } = sunMoonLongitudesAtJd(jd);
  return norm360(sunTropical - ayanamsaLahiri(jd));
}

/** Signed angular difference a - b folded into (-180, 180]. */
function wrapSigned(a: number, b: number): number {
  let d = norm360(a - b);
  if (d > 180) d -= 360;
  return d;
}

/** Minutes-of-day of the given instant in Chennai (IST) wall time. */
function chennaiMinutesOfDay(jd: number): number {
  const ms = (jd - 2440587.5) * 86_400_000 + IST_OFFSET_MS;
  return Math.round((((ms / 60_000) % 1440) + 1440) % 1440);
}

/** Chennai (IST) calendar day number on which the given instant falls. */
function chennaiDayNumber(jd: number): number {
  const ms = (jd - 2440587.5) * 86_400_000 + IST_OFFSET_MS;
  const d = new Date(ms);
  return dayNumberOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Calendar day on which the Tamil month containing this ingress starts. */
function monthStartDayNumber(ingressJd: number): number {
  const day = chennaiDayNumber(ingressJd);
  if (chennaiMinutesOfDay(ingressJd) >= SAME_DAY_CUTOFF_MIN) return day + 1;
  return day;
}

/**
 * Printed daily-sheet (Vakya tradition) month-start day 1 dates that
 * intentionally override the computed Thiru Ganita mapping, transcribed
 * from published calendars (Prokerala monthly calendar, hindupad.com).
 * Named by Tamil month 0..11 (0 = Chithirai) and the Gregorian date of the
 * printed month day 1. Add rows only with a published source; all published
 * month starts that the computed rule already reproduces are locked by the
 * regression tests and should stay unlisted here.
 */
const PRINTED_MONTH_STARTS: { tamilMonth: number; date: string }[] = [
  { tamilMonth: 10, date: '2024-02-13' }, // Masi (printed; Kumbha sankranti Feb 13 15:54, still Feb 13)
  { tamilMonth: 4, date: '2026-08-18' }, // Aavani (printed Aug 18; Simha sankranti Aug 17 08:04)
  { tamilMonth: 5, date: '2026-09-18' }, // Purattasi (printed Sep 18; Kanya sankranti Sep 17 07:58) => Oct 17 2026 = Purattasi 30
  { tamilMonth: 4, date: '2027-08-17' }, // Aavani (printed Aug 17; Simha sankranti Aug 17 14:16)
];

/** Overrides resolvable per Tamil year: tamilStartYear -> { monthIdx -> dayNumber }. */
let printedOverridesByYear: Map<
  number,
  Map<number, number>
> | null = null;

function getPrintedOverridesByYear(): Map<
  number,
  Map<number, number>
> {
  if (printedOverridesByYear === null) {
    printedOverridesByYear = new Map();
    for (const row of PRINTED_MONTH_STARTS) {
      const gYear = Number(row.date.slice(0, 4));
      // Margazhi..Panguni (months 9..12, Jan-Mar of a Gregorian year) belong
      // to the Tamil year that began the previous April; Chithirai..Karthigai
      // (months 1..8) to the one beginning this year.
      const monthIdx1 = row.tamilMonth + 1; // 1..12
      const tamilStartYear = monthIdx1 >= 9 && monthIdx1 <= 12 ? gYear - 1 : gYear;
      let perYear = printedOverridesByYear.get(tamilStartYear);
      if (!perYear) {
        perYear = new Map();
        printedOverridesByYear.set(tamilStartYear, perYear);
      }
      perYear.set(
        row.tamilMonth,
        dayNumberOf(
          Number(row.date.slice(0, 4)),
          Number(row.date.slice(5, 7)),
          Number(row.date.slice(8, 10))
        )
      );
    }
  }
  return printedOverridesByYear;
}

/**
 * Refines the instant at which the sidereal sun last crosses targetLong
 * ascending, within the 2-day window [jdLo, jdHi]. Sun motion is ~1°/day,
 * so at most one 30° boundary lies in any 2-day window.
 */
function refineIngress(targetLong: number, jdLo: number, jdHi: number): number | null {
  let a: number | null = null;
  let b: number | null = null;
  const SCAN_STEPS = 48; // hour granularity over the 2-day window
  let prevAt = jdLo;
  let prevVal = wrapSigned(sunSiderealAtJd(jdLo), targetLong);
  for (let i = 1; i <= SCAN_STEPS; i++) {
    const jd = jdLo + ((jdHi - jdLo) * i) / SCAN_STEPS;
    const val = wrapSigned(sunSiderealAtJd(jd), targetLong);
    if (prevVal < 0 && val >= 0) {
      a = prevAt;
      b = jd;
      break;
    }
    prevVal = val;
    prevAt = jd;
  }
  if (a === null || b === null) return null;
  let lo: number = a;
  let hi: number = b;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (wrapSigned(sunSiderealAtJd(mid), targetLong) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

interface TamilYearStarts {
  /** Calendar day number on which Tamil month m (0..11 = Chithirai..Panguni) begins. */
  starts: number[];
}

/**
 * Computes the 12 Tamil month-start calendar day numbers for the Tamil year
 * that begins (Chithirai 1 / Mesha ingress) in the given Gregorian year.
 * Cached per year (one day-level sweep ≈ 400 ephemeris evaluations plus 12
 * refinements), so repeated day conversions stay cheap.
 */
const startsCache = new Map<number, TamilYearStarts>();

export function computeTamilYearStarts(gYear: number): TamilYearStarts {
  const cached = startsCache.get(gYear);
  if (cached) return cached;

  // Scan from Apr 1 gYear (sun still in Meena/Panguni) through the Panguni
  // ingress of the next year; 400 daily samples always cover all 12.
  const jdStart = julianDay(gYear, 4, 1, 0);
  const ingresses: (number | null)[] = new Array(12).fill(null);
  let lonRawPrev = sunSiderealAtJd(jdStart);
  let unwrappedPrev = lonRawPrev;
  let jdPrev = jdStart;
  let turnCorrection = 0;
  let boundaryCount = 0;

  for (let s = 1; s <= 400 && boundaryCount < 12; s++) {
    const jd = jdStart + s;
    const lon = sunSiderealAtJd(jd);
    if (lon < lonRawPrev - 180) {
      // raw longitude wrapped past 360° — solar motion continues upward
      turnCorrection++;
    }
    lonRawPrev = lon;
    const unwrapped = lon + 360 * turnCorrection;

    const cellPrev = Math.floor(unwrappedPrev / 30);
    const cell = Math.floor(unwrapped / 30);
    if (cell > cellPrev) {
      for (let k = cellPrev + 1; k <= cell && boundaryCount < 12; k++) {
        const target = (30 * (k % 12)) % 360;
        const ingress = refineIngress(target, jdPrev, jd);
        if (ingress !== null) {
          ingresses[k % 12] = ingress; // k === 12 → Chithirai (index 0)
          boundaryCount++;
        }
      }
    }
    unwrappedPrev = unwrapped;
    jdPrev = jd;
  }

  const starts: number[] = ingresses.map((jd) => (jd === null ? -1 : monthStartDayNumber(jd)));

  // Published printed-sheet (Vakya tradition) month starts win over the
  // computed Thiru Ganita mapping where both are known and differ.
  const overrides = getPrintedOverridesByYear().get(gYear);
  if (overrides) {
    for (const [m, dayNumber] of overrides) starts[m] = dayNumber;
  }

  const result: TamilYearStarts = { starts };
  if (startsCache.size >= 12) {
    const oldest = startsCache.keys().next();
    if (!oldest.done) startsCache.delete(oldest.value);
  }
  startsCache.set(gYear, result);
  return result;
}

/** Verified anchor: Apr 14, 2026 begins Parabhava (cycle index 40). */
const ANCHOR_GREG_YEAR = 2026;
const ANCHOR_INDEX = 40; // TAMIL_YEAR_CYCLE[40] = பராபவ / Parabhava

function cycleIndexOf(tamilStartYear: number): number {
  const raw = ANCHOR_INDEX + (tamilStartYear - ANCHOR_GREG_YEAR);
  return ((raw % 60) + 60) % 60;
}

export function convertToTamil(date: Date): TamilConversion {
  const gYear = date.getFullYear();
  const queryDay = dayNumberOf(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  // Candidate month starts bracketing the query date:
  //  - Tamil year begun in gYear-1: months 9..12 (Thai..Panguni land in Jan..Apr
  //    of gYear); Margazhi (m 9, starts Dec of gYear-1) also covers Jan 1..13.
  //  - Tamil year begun in gYear: months 1..12 (Apr gYear .. Mar gYear+1).
  type Candidate = { dayNumber: number; monthIdx: number; tamilStartYear: number };
  const candidates: Candidate[] = [];
  const prev = computeTamilYearStarts(gYear - 1);
  for (let m = 8; m < 12; m++) {
    const dn = prev.starts[m] ?? -1;
    if (dn > 0) candidates.push({ dayNumber: dn, monthIdx: m, tamilStartYear: gYear - 1 });
  }
  const cur = computeTamilYearStarts(gYear);
  for (let m = 0; m < 12; m++) {
    const dn = cur.starts[m] ?? -1;
    if (dn > 0) candidates.push({ dayNumber: dn, monthIdx: m, tamilStartYear: gYear });
  }

  let best: Candidate | null = null;
  for (const c of candidates) {
    if (c.dayNumber <= queryDay && (best === null || c.dayNumber > best.dayNumber)) {
      best = c;
    }
  }
  if (best === null) {
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

  const tamilDay = queryDay - best.dayNumber + 1;
  const paksha: 'Shukla' | 'Krishna' = tamilDay <= 15 ? 'Shukla' : 'Krishna';

  return {
    day: tamilDay,
    month: best.monthIdx + 1,
    yearIndex: cycleIndexOf(best.tamilStartYear),
    isAmavasai: false, // verified via dataset only
    isPournami: false, // verified via dataset only
    paksha,
    approximate: false,
  };
}

export function tamilYearName(
  cycleIndex: number,
  lang: 'ta' | 'en'
): string | null {
  const entry =
    TAMIL_YEAR_CYCLE[
      ((cycleIndex % TAMIL_YEAR_CYCLE.length) + TAMIL_YEAR_CYCLE.length) %
        TAMIL_YEAR_CYCLE.length
    ];
  if (!entry) return null;
  return lang === 'ta' ? entry.ta : entry.en;
}

export function tamilMonthName(
  monthIndex: number,
  lang: 'ta' | 'en'
): string | null {
  const entry = TAMIL_MONTHS[monthIndex - 1];
  if (!entry) return null;
  return lang === 'ta' ? entry.ta : entry.en;
}
