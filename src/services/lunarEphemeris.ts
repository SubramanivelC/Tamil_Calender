/**
 * High-accuracy lunar-phase ephemeris (Amavasai / Pournami engine core).
 *
 * Purpose: root-finding quality math for new moon (elongation = 0°), full
 * moon (= 180°) and the phase-tithi boundaries (elongation 348° for the
 * amavasai tithi, 168° for the pournami tithi), plus Chennai sunrise times
 * needed by the printed-Tamil-calendar day rule (see lunarPhases.ts).
 *
 * Accuracy
 *  - Moon: full Meeus "Astronomical Algorithms" ch.47 truncated series
 *    (60 longitude terms + the 3 additive terms) → ±0.01° tropical
 *    longitude. Combined with the sun (ch.25 low-precision terms,
 *    ±0.005°) the moon−sun elongation is accurate to ~±0.016°, i.e.
 *    better than ±2 min of time at the phase and boundary instants.
 *  - ΔT (UT↔TT) via the Espenak–Meeus piecewise polynomials covers
 *    1900–2150; a ±0.5 s residual error is immaterial here.
 *  - Sunrise: solar-altitude root-find to the −0.833° (refraction)
 *    convention for Chennai (13.0827°N, 80.2707°E), ±1–2 min of real
 *    almanac sunrise as printed by panchangam publishers.
 *
 * Data provenance: the 60-row coefficient table below is Meeus Table 47.A
 * as published (checksummed against the MIT-licensed astronomia port,
 * https://github.com/commenthol/astronomia). The port is verified at
 * runtime by regression tests against published new/full moon instants
 * (timeanddate 2026 table) and Drik Panchang Chennai tithi intervals.
 *
 * Timezone independence: no `Date` object and no device clock is used
 * anywhere in this module — every function maps (year, month, day) or
 * Julian Days to Julian Days deterministically, so the engine produces
 * identical output on every device and in every timezone.
 */

import { julianDay, norm360, sunLongitude } from './panchangamAstro';

const DEG = Math.PI / 180;
const JD_J2000 = 2451545.0;
const SYNODIC_MONTH = 29.530588861;
const JD_NEW_MOON_MEAN = 2451550.09766;

/** Chennai, Tamil Nadu — the anchor latitude/longitude of printed Tamil daily calendars. */
export const CHENNAI_LAT_DEG = 13.0827;
export const CHENNAI_LON_EAST_DEG = 80.2707;

/** IST offset from UTC in days (UTC+05:30). */
export const IST_OFFSET_DAYS = 5.5 / 24;

/**
 * ΔT = TT − UT1 in seconds, Espenak & Meeus piecewise polynomials
 * (https://eclipse.gsfc.nasa.gov/SEhelp/ApolloLunar.html). Accuracy is far
 * beyond what phase-day labelling needs (~1 s error tolerable).
 */
export function deltaTSeconds(year: number): number {
  const t2000 = year - 2000;
  if (year >= 2005 && year <= 2050) {
    return 62.92 + 0.32217 * t2000 + 0.005589 * t2000 * t2000;
  }
  if (year > 2050) {
    // Morrison–Stephenson extrapolated beyond 2050.
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
  if (year >= 1986) {
    const u = t2000;
    return (
      63.86 +
      0.3345 * u -
      0.060374 * u * u +
      0.0017275 * u ** 3 +
      0.000651814 * u ** 4 +
      0.00002373599 * u ** 5
    );
  }
  if (year >= 1961) {
    const u = year - 1975;
    return 45.45 + 1.067 * u - (u * u) / 260 - (u ** 3) / 718;
  }
  if (year >= 1941) {
    const u = year - 1950;
    return 29.07 + 0.407 * u - (u * u) / 233 + (u ** 3) / 2547;
  }
  if (year >= 1920) {
    const u = year - 1920;
    return 21.2 + 0.84493 * u - 0.0761 * u * u + 0.0020936 * u ** 3;
  }
  const u = year - 1900;
  return -2.79 + 1.494119 * u - 0.0598939 * u * u + 0.0061966 * u ** 3 - 0.000197 * u ** 4;
}

/**
 * Meeus Table 47.A rows: [D, M, M', F, Σl] multiplier exponents and the
 * sine coefficient in 1e-6 degrees. The M exponent also carries its E
 * factor exponent (E^|m|); sign stays inside the argument.
 */
type MoonTerm = readonly [number, number, number, number, number];

const MOON_LONGITUDE_TERMS: readonly MoonTerm[] = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351],
  [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
  [2, 0, -1, -2, 0],
];

/**
 * Tropical apparent longitude of the Moon in degrees (Meeus ch.47 with the
 * full 60-term longitude table + additive terms A1/A2/A3). ``jde`` is the
 * Julian ephemeris day (TT).
 */
export function moonLongitudeFull(jde: number): number {
  const T = (jde - JD_J2000) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;  const E2 = E * E;

  let sum =
    3958 * Math.sin(A1 * DEG) +
    1962 * Math.sin((Lp - F) * DEG) +
    318 * Math.sin(A2 * DEG);
  for (const [dExp, mExp, mpExp, fExp, coef] of MOON_LONGITUDE_TERMS) {
    let eFactor = 1;
    const absM = Math.abs(mExp);
    if (absM === 1) eFactor = E;
    else if (absM === 2) eFactor = E2;
    const arg = D * dExp + M * mExp + Mp * mpExp + F * fExp;
    sum += coef * Math.sin(arg * DEG) * eFactor;
  }
  return norm360(Lp + sum * 1e-6);
}

/**
 * Moon−sun elongation (0..360°) at a UT Julian Day. Internally evaluates
 * both bodies at TT (jde + ΔT) using the full-accuracy series. Tithi,
 * paksha and the phase-day rule are elongation-only quantities, so the
 * (identical for both bodies) ayanamsa cancels and no sidereal conversion
 * is needed.
 */
export function elongationAtJdUt(jdUt: number): number {
  const year = tToApproxYear(jdUt);
  const jde = jdUt + deltaTSeconds(year) / 86400;
  const sun = sunLongitude((jde - JD_J2000) / 36525);
  const moon = moonLongitudeFull(jde);
  return norm360(moon - sun);
}

/** Normalize degrees into [0, 360). */
function norm180(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

/** Mean-synodic cycle index k for a UT Julian Day (k integer ⇒ new moon). */
export function meanCycle(jdUt: number): number {
  return (jdUt - JD_NEW_MOON_MEAN) / SYNODIC_MONTH;
}

/** Mean-synodic estimate of the new moon instant for integer cycle k. */
export function meanNewMoonJd(k: number): number {
  return JD_NEW_MOON_MEAN + SYNODIC_MONTH * k;
}

/** Shortest angular delta a→b across the 0/360 wrap (−180..180). */
function angDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * Newton root-find for the instant when the elongation crosses `target`
 * (degrees, 0..360), searching near `seedJdUt`. The elongation increases
 * monotonically through a phase boundary (0.45–0.6°/h), so a seed within
 * ±24 h is safely within the Newton basin.
 */
export function findElongationCrossing(targetDeg: number, seedJdUt: number): number {
  let t = seedJdUt;
  for (let i = 0; i < 12; i++) {
    const f = angDelta(targetDeg, elongationAtJdUt(t));
    if (Math.abs(f) * DEG < 1e-9) break;
    const h = 1 / 1440; // one minute
    const dfdt = angDelta(elongationAtJdUt(t - h), elongationAtJdUt(t + h)) / (2 * h);
    if (Math.abs(dfdt) < 0.001) break; // degenerate; keep last t
    t -= f / dfdt;
  }
  return t;
}

/**
 * New moon (conjunction) instant, UT Julian Day, for synodic cycle k
 * (k integer). Newton-seeded from the mean-synodic formula; the seed
 * error (≤ ±0.6 h) is far inside the basin.
 */
export function newMoonJdUt(k: number): number {
  return findElongationCrossing(0, meanNewMoonJd(k));
}

/** Full moon instant, UT Julian Day, for synodic cycle k + 0.5. */
export function fullMoonJdUt(k: number): number {
  return findElongationCrossing(180, meanNewMoonJd(k) + SYNODIC_MONTH / 2);
}

/**
 * Solar altitude at Chennai (deg) at a UT Julian Day, using the same
 * apparent solar longitude as the panchangam engine (Meeus ch.25 with
 * aberration + nutation-in-longitude terms), declination from true
 * obliquity, and Greenwich mean sidereal time (Meeus 12.4).
 */
export function solarAltitudeChennaiDeg(jdUt: number): number {
  const T = (jdUt - JD_J2000) / 36525;
  const lambda = sunLongitude(T);
  const eps = 23.439291 - 0.0130042 * T;
  const sinL = Math.sin(lambda * DEG);
  const sinE = Math.sin(eps * DEG);
  const cosE = Math.cos(eps * DEG);
  const dec = Math.asin(sinE * sinL) / DEG;
  const ra = norm360(Math.atan2(cosE * sinL, Math.cos(lambda * DEG)) / DEG);
  const gmst =
    280.46061837 +
    360.98564736629 * (jdUt - JD_J2000) +
    0.000387933 * T * T -
    (T ** 3) / 38710000;
  const H = norm180(gmst + CHENNAI_LON_EAST_DEG - ra);
  const lat = CHENNAI_LAT_DEG;
  return (
    Math.asin(
      Math.sin(lat * DEG) * Math.sin(dec * DEG) +
        Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos(H * DEG)
    ) / DEG
  );
}

/**
 * Sunrise instant (UT Julian Day) for Chennai on the civil date (y, m, d),
 * solved for solar altitude = −0.833° (standard refraction convention,
 * same as panchangam almanacs). Seed 06:00 IST; Newton with a numeric
 * derivative converges in 3–4 iterations from a ≤2 h offset.
 */
export function chennaiSunriseJdUt(y: number, m: number, d: number): number {
  // 06:00 IST = 00:30 UTC on the same civil date.
  let t = julianDay(y, m, d, 30 / 1440);
  const target = -0.833;
  for (let i = 0; i < 10; i++) {
    const f = solarAltitudeChennaiDeg(t) - target;
    if (Math.abs(f) < 1e-6) break;
    const h = 1 / 2880; // 30 s
    const dfdt =
      (solarAltitudeChennaiDeg(t + h) - solarAltitudeChennaiDeg(t - h)) / (2 * h * 1440); // deg/min
    if (Math.abs(dfdt) < 0.001) break;
    t -= f / dfdt / 1440;
  }
  return t;
}

/** Rough Gregorian year for a JD (for the ΔT lookup; calendar-only precision). */
function tToApproxYear(jd: number): number {
  return Math.floor(2000 + (jd - JD_J2000) / 365.25);
}

/** Days in a Gregorian month — pure arithmetic, timezone-independent. */
export function daysInGregorianMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  if (m === 4 || m === 6 || m === 9 || m === 11) return 30;
  return 31;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
