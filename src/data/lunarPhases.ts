/**
 * Engine-derived lunar observance dates for ARBITRARY year ranges.
 *
 * The bundled dataset (seedData.ts) runs these same generators over its
 * 2026–2029 coverage window at import time. This module is the shared,
 * per-range core so the repositories can compute the same printed-calendar
 * conventions for any navigable Gregorian year (1900–2100) on demand —
 * nothing here is copy-typed; every date comes from the high-accuracy
 * ephemeris (lunarEphemeris.ts, Meeus ch.47 full series, see tests).
 *
 * DAY RULE (printed Tamil daily-calendar convention, cross-verified against
 * Drik Panchang Chennai monthly panchangam, Prokerala Chennai and the
 * TamilDailyCalendar 2027 list — see lunarPhases tests and DATA_SOURCES.md):
 *   A phase (amavasai = conjunction tithi, pournami = full-moon tithi) is
 *   labelled with the FIRST Chennai sunrise that falls inside the phase
 *   tithi interval; i.e. the day the phase tithi is present at sunrise.
 *   When no sunrise falls inside the tithi (tithi entirely between two
 *   sunrises, happens a couple of times per year), the phase belongs to
 *   the sunrise-day containing the conjunction — equivalently the
 *   sunrise-day holding the larger part of the tithi. These are exactly
 *   the classical panchangam day-naming rules; published lists use them.
 *
 * Why a sunrise rule and not a civil-midnight rule: tithi day-naming is
 * anchored to sunrise in panchangam tradition ("panchang day starts and
 * ends with sunrise"). Phase instants are computed at the true elongation
 * crossing (Meeus ch.47 full 60-term series ⇒ ±~2 min of time) and never
 * at a fixed clock time; a *fixed-IST-sunrise* or midnight junction rule
 * mislabels every event whose tithi begins in the afternoon or whose
 * conjunction lands in the morning IST hours (the regression previously
 * shipped in dataset 2026.10-subset.6 — see the published-table test).
 *
 * Timezone independence: no `Date`, no `Date.now`, no device local time —
 * the engine maps Gregorian parts ⇄ Julian Days purely.
 */
import { julianDay, sunMoonLongitudesAtJd, norm360 } from '@/services/panchangamAstro';
import {
  IST_OFFSET_DAYS,
  chennaiSunriseJdUt,
  daysInGregorianMonth,
  elongationAtJdUt,
  findElongationCrossing,
  fullMoonJdUt,
  meanCycle,
  meanNewMoonJd,
  newMoonJdUt,
} from '@/services/lunarEphemeris';

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
      const dim = daysInGregorianMonth(y, m);
      for (let d = 1; d <= dim; d++) {
        cb(y, m, d, elongAtSunriseIST(y, m, d));
      }
    }
  }
}

/**
 * Amavasai + Pournami calendar days over an inclusive Gregorian year range.
 * O(phases) (~25/year); a few ms/year with the full-series ephemeris.
 *
 * Phase instants (UT Julian Days):
 *   amavasai: tB = elongation crossing 348° (start of tithi 30),
 *             tE = elongation crossing 0° (the conjunction itself).
 *   pournami: tB = elongation crossing 168° (start of the purnima tithi),
 *             tE = elongation crossing 180° (the full moon itself).
 * The phase tithi occupies [tB, tE); its labelled day follows the
 * first-sunrise-inside-the-tithi rule documented in the module header.
 */

export interface PhaseInstantInfo {
  kind: AmPournamiKind;
  /** UT Julian Days of the tithi begin & end (conjunction / full moon). */
  tBeginJdUt: number;
  tEndJdUt: number;
  /** Labelled civil date (IST): the printed amavasai/pournami day. */
  label: { y: number; m: number; d: number };
}

/** Sane tithi length bounds for the begin-boundary Newton seed (hours). */
const TITHI_MIN_H = 17;
const TITHI_MAX_H = 29;

export function amPournaForRange(startY: number, endY: number): LunarPhaseRecord[] {
  const rows: LunarPhaseRecord[] = [];
  for (const ph of phaseInstantsForRange(startY, endY)) {
    rows.push({ dateKey: toDateKey(ph.label.y, ph.label.m, ph.label.d), kind: ph.kind });
  }
  return rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

/**
 * Phase instants + their printed-day labels for a year range. Also used by
 * the regression tests to compare computed instants against published
 * panchangam tithi intervals and astronomical ephemerides.
 */
export function phaseInstantsForRange(startY: number, endY: number): PhaseInstantInfo[] {
  const jdStart = julianDay(startY, 1, 1, 0) - 35;
  const jdEnd = julianDay(endY, 12, 31, 1) + 35;
  const kMin = Math.floor(meanCycle(jdStart));
  const kMax = Math.ceil(meanCycle(jdEnd));
  const out: PhaseInstantInfo[] = [];
  for (let k = kMin; k <= kMax; k++) {
    out.push(amPournaInstant('amavasai', newMoonJdUt(k)));
    out.push(amPournaInstant('pournami', fullMoonJdUt(k)));
  }
  return out
    .filter((p) => p.label.y >= startY && p.label.y <= endY)
    .sort((a, b) => a.tEndJdUt - b.tEndJdUt);
}

function amPournaInstant(kind: AmPournamiKind, tEndJdUt: number): PhaseInstantInfo {
  const target = kind === 'amavasai' ? 348 : 168;
  let tBeginJdUt = findElongationCrossing(target, tEndJdUt - TITHI_MAX_H / 24);
  // Guard against a Newton mis-land (tithi lengths run ~19–26.5 h).
  const spanH = (tEndJdUt - tBeginJdUt) * 24;
  if (spanH < TITHI_MIN_H || spanH > TITHI_MAX_H) {
    // Re-seed from the mean tithi duration and retry once.
    tBeginJdUt = findElongationCrossing(target, tEndJdUt - 23.5 / 24);
  }
  return {
    kind,
    tBeginJdUt,
    tEndJdUt,
    label: phaseDayLabel(tBeginJdUt, tEndJdUt),
  };
}

function phaseDayLabel(tBeginJdUt: number, tEndJdUt: number): { y: number; m: number; d: number } {
  // Candidate 1: the civil day on which the tithi begins, if that day's
  // Chennai sunrise precedes the tithi-begin.
  const beginDay = civilFromJdIst(tBeginJdUt);
  if (chennaiSunriseJdUt(beginDay.y, beginDay.m, beginDay.d) > tBeginJdUt) {
    // Tithi begins before that day's dawn ⇒ the day opens inside the tithi.
    if (chennaiSunriseJdUt(beginDay.y, beginDay.m, beginDay.d) < tEndJdUt) {
      return beginDay;
    }
  } else {
    // First dawn after the tithi begins: the next morning.
    const next = nextDay(beginDay);
    if (chennaiSunriseJdUt(next.y, next.m, next.d) < tEndJdUt) {
      return next;
    }
  }
  // No Chennai sunrise falls inside the tithi: the phase belongs to the
  // sunrise-day containing the conjunction (equivalently the sunrise-day
  // holding the larger part of the tithi).
  return sunriseDayOf(tEndJdUt);
}

/** The sunrise-day (y,m,d) such that sunrise(d) ≤ t ≤ sunrise(d+1). */
function sunriseDayOf(jdUt: number): { y: number; m: number; d: number } {
  const civil = civilFromJdIst(jdUt);
  if (chennaiSunriseJdUt(civil.y, civil.m, civil.d) <= jdUt) return civil;
  return prevDay(civil);
}

/** Civil Gregorian date (IST calendar day) for a UT Julian Day. */
export function civilFromJdIst(jdUt: number): { y: number; m: number; d: number } {
  const f0 = jdUt + IST_OFFSET_DAYS + 0.5;
  let Z = Math.floor(f0);
  const A = Z >= 2299161 ? Z + 1 + Math.floor((Z - 1867216.25) / 36524.25) - Math.floor(Math.floor((Z - 1867216.25) / 36524.25) / 4) : Z;
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = Math.floor(B - D - Math.floor(30.6001 * E));
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { y: year, m: month, d: day };
}

function nextDay(c: { y: number; m: number; d: number }): { y: number; m: number; d: number } {
  let { y, m, d } = c;
  if (d < daysInGregorianMonth(y, m)) d++;
  else if (m < 12) { m++; d = 1; }
  else { y++; m = 1; d = 1; }
  return { y, m, d };
}

function prevDay(c: { y: number; m: number; d: number }): { y: number; m: number; d: number } {
  let { y, m, d } = c;
  if (d > 1) d--;
  else if (m > 1) { m--; d = daysInGregorianMonth(y, m); }
  else { y--; m = 12; d = 31; }
  return { y, m, d };
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
