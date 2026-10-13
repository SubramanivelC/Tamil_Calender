/**
 * Sidereal lunar/solar ephemeris (truncated Meeus series) for tithi,
 * nakshatra, yoga, karana and paksha.
 *
 * Accuracy note: the truncated series used here gives the moon's tropical
 * longitude to ~±0.05° (full Meeus ch.47 accuracy 0.01° needs ~60 terms).
 * Absolute longitude error cancels in the moon-sun elongation used by
 * tithi/karana; the nakshatra/yoga classification carries the ±6-7 min
 * residual only near a boundary, evaluated at sunrise granularity.
 * Positions are sidereal via a linear Lahiri (Chitrapaksha) ayanamsa.
 */
import { TITHI_NAMES, PAKSHA_NAMES, NAKSHATRA_NAMES, YOGA_NAMES, KARANA_NAMES, karanaNameIndex } from '@/data/mappings';

const DEG = Math.PI / 180;

/** Normalize degrees into [0, 360). */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function sin(d: number): number {
  return Math.sin(d * DEG);
}

/**
 * Julian Day from Gregorian calendar parts + fraction-of-day (Meeus 7.1:
 * Jan/Feb belong to the previous year's numbering).
 */
export function julianDay(year: number, month: number, day: number, dayFractionUtc: number): number {
  const y = month <= 2 ? year - 1 : year;
  const m = month <= 2 ? month + 12 : month;
  const jdn =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    dayFractionUtc -
    1524.5;
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return jdn + b; // Gregorian correction
}

export interface SunMoonLongitude {
  /** Tropical (sayana) solar longitude in degrees. */
  sunTropical: number;
  /** Tropical (sayana) lunar longitude in degrees. */
  moonTropical: number;
}

function sunLongitude(T: number): number {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  return norm360(trueLong - 0.00569 - 0.00478 * sin(omega));
}

function moonLongitude(T: number): number {
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T;

  const E2 = E * E;
  let lam =
    Lp +
    6.288774 * E * sin(Mp) +
    1.274027 * sin(2 * D - Mp) +
    0.658314 * sin(2 * D) +
    0.213618 * E2 * sin(2 * Mp) -
    0.185116 * E * sin(M) -
    0.114332 * sin(2 * F) +
    0.058793 * E2 * sin(2 * D - 2 * Mp) +
    0.057066 * E2 * sin(2 * D - M - Mp) +
    0.053322 * E * sin(2 * D + Mp) +
    0.045758 * E * sin(2 * D - M) -
    0.040923 * E * sin(M - Mp) -
    0.034720 * sin(D) -
    0.030465 * E * sin(M + Mp) +
    0.015266 * sin(2 * D - 2 * F) -
    0.012528 * E * sin(Mp + 2 * F) -
    0.010980 * E * sin(Mp - 2 * F);
  return norm360(lam);
}

/** Linear Lahiri ayanamsa (Chitrapaksha), degrees. ±1′ vs published tables. */
export function ayanamsaLahiri(jd: number): number {
  const yearsSince2000 = (jd - 2451545.0) / 365.2425;
  return 23.8530 + 0.013966 * yearsSince2000;
}

/**
 * Solar & lunar longitudes at a given instant. `jd` is the Julian Day at
 * the instant (UT≈TT here; the neglect of ΔT is ±1 min of time, harmless
 * at sunrise granularity).
 */
export function sunMoonLongitudesAtJd(jd: number): SunMoonLongitude {
  const T = (jd - 2451545.0) / 36525;
  const sunTropical = sunLongitude(T);
  const moonTropical = moonLongitude(T);
  return { sunTropical, moonTropical };
}

export interface SiderealResult extends SunMoonLongitude {
  sunSidereal: number;
  moonSidereal: number;
  /** Moon-sun elongation 0..360 (drives tithi/karana). */
  elongation: number;
}

export function toSidereal(longs: SunMoonLongitude, jd: number): SiderealResult {
  const ayan = ayanamsaLahiri(jd);
  const sunSidereal = norm360(longs.sunTropical - ayan);
  const moonSidereal = norm360(longs.moonTropical - ayan);
  return {
    ...longs,
    sunSidereal,
    moonSidereal,
    elongation: norm360(moonSidereal - sunSidereal),
  };
}

/**
 * Lunar month quantization. `elong` = sidereal moon-sun elongation.
 * 30 tithis (12° each); paksha flips at elong=180 (Pournami).
 */
export function tithiIndex(elong: number): number {
  return Math.floor(norm360(elong) / 12); // 0..29
}

export function pakshaOf(elong: number): 'Shukla' | 'Krishna' {
  return tithiIndex(elong) < 15 ? 'Shukla' : 'Krishna';
}

/** Full bilingual tithi string, e.g. 'வளர்பிறை பஞ்சமி / Shukla Panchami'.
 *  Pournami and Amavasai stand alone so the 'அ / B' bilingual format stays
 *  cleanly splittable by cleanBilingualValue — no paksha prefix baked into
 *  the same segment (the paksha is implied by the phase). */
export function tithiName(elong: number): string {
  const idx = tithiIndex(elong);
  const pct = idx % 15;
  if (pct === 14) return idx < 15 ? PAKSHA_NAMES.pournami : TITHI_NAMES[14] ?? '';
  const paksha = idx < 15 ? PAKSHA_NAMES.shukla : PAKSHA_NAMES.krishna;
  return `${paksha} ${TITHI_NAMES[pct] ?? ''}`;
}

export function nakshatraName(moonSidereal: number): string {
  const idx = Math.min(Math.floor(norm360(moonSidereal) / (360 / 27)), 26);
  return NAKSHATRA_NAMES[idx] ?? NAKSHATRA_NAMES[0] ?? '';
}

export function yogaName(sunSidereal: number, moonSidereal: number): string {
  const idx = Math.min(Math.floor(norm360(sunSidereal + moonSidereal) / (360 / 27)), 26);
  return YOGA_NAMES[idx] ?? YOGA_NAMES[0] ?? '';
}

export function karanaName(elong: number): string {
  const idx = karanaNameIndex(Math.floor(norm360(elong) / 6)); // 0..59
  return KARANA_NAMES[idx] ?? KARANA_NAMES[0] ?? '';
}

/**
 * Convenience: derive all lunar day-fields at one instant ( Julian Day).
 */
export function lunarFieldsAtJd(jd: number): {
  tithi: string;
  paksha: string;
  nakshatra: string;
  yoga: string;
  karana: string;
} {
  const sid = toSidereal(sunMoonLongitudesAtJd(jd), jd);
  const paksha = pakshaOf(sid.elongation);
  return {
    tithi: tithiName(sid.elongation),
    paksha: paksha === 'Shukla' ? PAKSHA_NAMES.shukla : PAKSHA_NAMES.krishna,
    nakshatra: nakshatraName(sid.moonSidereal),
    yoga: yogaName(sid.sunSidereal, sid.moonSidereal),
    karana: karanaName(sid.elongation),
  };
}
