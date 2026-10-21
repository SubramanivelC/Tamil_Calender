/**
 * High-accuracy tithi / nakshatra / Chandrashtama computation layer.
 *
 * Root-cause context: the previously existing UI-facing fields were derived
 * from `lunarFieldsAtJd` (truncated ±0.05° series, evaluated at a fixed
 * 06:00-IST approximation) and carried NAMES ONLY — no end times existed,
 * and Chandrashtama was mapped from the rasi transit (8th from the janma
 * rasi) instead of the janma NAKSHATRA, the traditional star-based rule.
 *
 * This module:
 *  - evaluates the moon (Meeus ch.47 full 60-term series, ±0.01°, the same
 *    core lunarEphemeris.ts uses for amavasai/pournami) and the sun, so
 *    tithi/karana (elongation-only) are accurate to ~±2 min of time;
 *  - converts tropical positions to SIDEREAL via the linear Lahiri
 *    (Chitrapaksha) ayanamsa — the convention already used and
 *    cross-checked by the bundled dataset (see lunarPhases.ts tests,
 *    documentation and Puthandu/Makar-solar-ingression regression tests);
 *  - solves the EXACT instant a boundary is crossed (Newton on the
 *    monotone boundary functions) rather than sampling at sunrise;
 *  - i.e., tithi end = elongation = k·12° crossing (k = current tithi + 1),
 *    nakshatra end = moon sidereal λ = k·13°20′ crossing;
 *  - derives Chandrashtama the traditional way: the 8th star counted
 *    INCLUSIVELY from the janma nakshatra (Ashwini → Krittika … Revati →
 *    wraps to Ashwini), and returns the observed Moon-nakshatra interval
 *    [startJd, endJd) when the moon occupies that star.
 *
 * Timezone: every function takes/returns UT Julian Days; civil IST dates
 * come from the pure JDN mapper in lunarPhases.ts (no Date objects).
 * Display conversion is IST (UTC+05:30) only — India has no DST.
 */
import { ayanamsaLahiri, julianDay, norm360 } from '@/services/panchangamAstro';
import {
  IST_OFFSET_DAYS,
  chennaiSunriseJdUt,
  elongationAtJdUt,
  findElongationCrossing,
  moonLongitudeFull,
} from '@/services/lunarEphemeris';
import { civilFromJdIst } from '@/data/lunarPhases';
import {
  NAKSHATRA_NAMES,
  PAKSHA_NAMES,
  TITHI_NAMES,
} from '@/data/mappings';

const DEG = Math.PI / 180;

/** Nakshatra arc: 360°/27 = 13°20′ in degrees. */
export const NAKSHATRA_ARC_DEG = 360 / 27;

/** Sidereal moon longitude (Lahiri-linear) in degrees at a UT Julian Day. */
export function moonSiderealAtJdUt(jdUt: number): number {
  const ayan = ayanamsaLahiri(jdUt);
  return norm360(moonLongitudeFull(jdUt) - ayan);
}

function angDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * Newton root-find for the instant the sidereal moon longitude crosses
 * `target` (0..360°), searching near `seedJdUt`. The moon moves ~13.18°/d
 * monotonically, so with |residual| < NAKSHATRA_ARC a seed within ±12 h is
 * well inside the Newton basin. Handles the Revati(356°40′)→Ashwini(0°)
 * wrap through the angular delta.
 */
export function findMoonSiderealCrossing(targetDeg: number, seedJdUt: number): number {
  let t = seedJdUt;
  for (let i = 0; i < 12; i++) {
    const f = angDelta(targetDeg, moonSiderealAtJdUt(t));
    if (Math.abs(f) * DEG < 1e-9) break;
    const h = 1 / 1440; // one minute
    const dfdt = angDelta(moonSiderealAtJdUt(t - h), moonSiderealAtJdUt(t + h)) / (2 * h);
    if (Math.abs(dfdt) < 0.001) break; // degenerate; keep last t
    t -= f / dfdt;
  }
  return t;
}

/** Nakshatra index 0..26 at a UT Julian Day (sidereal, Lahiri-linear). */
export function nakshatraIndexAtJdUt(jdUt: number): number {
  return Math.min(Math.floor(moonSiderealAtJdUt(jdUt) / NAKSHATRA_ARC_DEG), 26);
}

export interface BoundaryFacts {
  /** Current boundary index (tithi 0..29, nakshatra 0..26). */
  index: number;
  /** Bilingual name of the current segment at `jdUt`. */
  name: string;
  /** Next segment's index and bilingual name. */
  nextIndex: number;
  nextName: string;
  /** UT Julian Day the CURRENT segment ends (next boundary crossing). */
  endJdUt: number;
  /** UT Julian Day the NEXT segment ends. */
  nextEndJdUt: number;
}

/**
 * Segment-spec helpers: tithis (30×12°) and nakshatras (27×13°20′) share
 * the same monotone-boundary structure, so end times are solved once.
 */
interface SegmentSpec {
  /** Segment count (30 tithis, 27 nakshatras). */
  count: number;
  /** Segment arc in degrees (12, 13°20′). */
  arc: number;
  /** Boundary f(t) crossing solver for target degrees. */
  atValue: (jdUt: number) => number;
  crossing: (targetDeg: number, seedJdUt: number) => number;
  /** Instantaneous rate bounds °/day → seed error bound. */
  rate: { min: number; max: number };
  /** Traverse `atValue` when counting segments: tithi uses elongation. */
  wrapNote: string;
}

function segmentFacts(spec: SegmentSpec, jdUt: number): BoundaryFacts {
  const v = spec.atValue(jdUt);
  const index = Math.min(Math.floor(v / spec.arc), spec.count - 1);
  const nextIndex = (index + 1) % spec.count;
  const nextTarget = (nextIndex * spec.arc) % 360;
  // Angular distance from the current value to the next boundary (0, arc],
  // 360−v when the boundary wraps to 0° (last segment → first segment).
  const dist = nextIndex === 0 ? 360 - v : nextTarget - v;
  const span = (dist / spec.rate.max + dist / spec.rate.min) / 2; // mid-estimate days
  const endJdUt = spec.crossing(nextTarget, jdUt + span);
  // Next segment ends at the boundary after next (handles both wraps).
  const afterNextIndex = (nextIndex + 1) % spec.count;
  const afterTarget = (afterNextIndex * spec.arc) % 360;
  const dist2 = afterNextIndex === 0 ? 360 - nextTarget : afterTarget - nextTarget;
  const span2 = (dist2 / spec.rate.max + dist2 / spec.rate.min) / 2;
  const nextEndJdUt = spec.crossing(afterTarget, endJdUt + span2);
  return {
    index,
    name: '',
    nextIndex,
    nextName: '',
    endJdUt,
    nextEndJdUt,
  };
}

// --- Tithi -----------------------------------------------------------------

/**
 * Tithi speed: elongation rate = moon rate − sun rate ≈ 12.19°/day mean,
 * perigee/apogee extremes ≈ 11.1 − 15.0. (Meeus: moon 13.176−15.40 %/ over
 * the anomalistic cycle minus sun ~1.02.) Seeds stay inside the basin.
 */
const TITHI_SPEC: SegmentSpec = {
  count: 30,
  arc: 12,
  atValue: elongationAtJdUt,
  crossing: findElongationCrossing,
  rate: { min: 11.1, max: 15.0 },
  wrapNote: 'tithi 29→0 at elongation 360°/0° (amavasai→shukla prathama)',
};

/**
 * Tithi facts at an instant. Names follow the bundled bilingual tables:
 * tithi 13 (index) = Pournami stands alone, tithi 29 = Amavasai;
 * paksha (Shukla/Krishna) is implied by the position relative to 180°.
 */
export function tithiFactsAtJdUt(jdUt: number): BoundaryFacts {
  const f = segmentFacts(TITHI_SPEC, jdUt);
  const nameAt = (idx: number): string => {
    if (idx === 14) return PAKSHA_NAMES.pournami; // start of purnima tithi
    if (idx === 29) return TITHI_NAMES[14] ?? 'அமாவாசை / Amavasai';
    const paksha = idx < 15 ? PAKSHA_NAMES.shukla : PAKSHA_NAMES.krishna;
    return `${paksha} ${TITHI_NAMES[idx % 15] ?? ''}`;
  };
  return { ...f, name: nameAt(f.index), nextName: nameAt(f.nextIndex) };
}

// --- Nakshatra -------------------------------------------------------------

/** Nakshatra rate range °/day (moon alone: perigee 13.66 – apogee 15.40). */
const NAKSHATRA_SPEC: SegmentSpec = {
  count: 27,
  arc: NAKSHATRA_ARC_DEG,
  atValue: moonSiderealAtJdUt,
  crossing: findMoonSiderealCrossing,
  rate: { min: 13.0, max: 15.5 },
  wrapNote: 'nakshatra 26→0 at sidereal λ 360° (Revati→Ashwini)',
};

export function nakshatraFactsAtJdUt(jdUt: number): BoundaryFacts {
  const f = segmentFacts(NAKSHATRA_SPEC, jdUt);
  const nameAt = (idx: number): string => NAKSHATRA_NAMES[idx] ?? NAKSHATRA_NAMES[0] ?? '';
  return { ...f, name: nameAt(f.index), nextName: nameAt(f.nextIndex) };
}

// --- Chandrashtama ---------------------------------------------------------

/**
 * Traditional star-based Chandrashtama star: the 8th nakshatra counted * INCLUSIVELY from the janma nakshatra (janma star slot 1 → target slot 8;
 * Ashwini → Krittika). Wraparound Revati→Ashwini is the modulo.
 */
export function chandrashtamaStarIndex(janmaStarIndex: number): number {
  return (((janmaStarIndex + 7) % 27) + 27) % 27;
}

export interface ChandrashtamaWindow {
  /** 'active' if the window intersects the queried panchang day. */
  status: 'active' | 'upcoming';
  /** Index 0..26 of the Chandrashtama star. */
  starIndex: number;
  /** UT Julian Days when the moon enters/leaves the Chandrashtama star. */
  startJdUt: number;
  endJdUt: number;
}

/**
 * The moon-nakshatra interval of the Chandrashtama star around `jdUt`:
 * the window currently containing `jdUt`, else the next one ahead.
 */
function chandrashtamaWindowAroundJd(
  jdUt: number,
  starIndex: number
): ChandrashtamaWindow {
  const target = starIndex * NAKSHATRA_ARC_DEG;
  const value = moonSiderealAtJdUt(jdUt);
  const rel = norm360(value - target); // distance INTO the segment [0, 360)
  const startJdUt =
    rel < NAKSHATRA_ARC_DEG
      ? findMoonSiderealCrossing(target, jdUt - rel / 13.0)
      : findMoonSiderealCrossing(target, jdUt + (360 - rel) / 13.0);
  const endTarget = (((starIndex + 1) % 27) * NAKSHATRA_ARC_DEG) % 360;
  const endJdUt = findMoonSiderealCrossing(endTarget, startJdUt + 1.0);
  return { status: 'active', starIndex, startJdUt, endJdUt };
}

/**
 * Chandrashtama window for a queried civil date (panchang-day semantics:
 * the window is 'active' when it intersects [sunrise(d), sunrise(d+1)
 * interval, the Chennai engine sunrise). Returns the ACTIVE window on the
 * day, else the NEXT window starting after the day's sunrise.
 */
export function chandrashtamaWindowForDate(
  dateKey: string,
  janmaStarIndex: number
): ChandrashtamaWindow {
  const { year, month, day } = parseIsoDateKey(dateKey);
  const sunrise = chennaiSunriseJdUt(year, month, day);
  const starIndex = chandrashtamaStarIndex(janmaStarIndex);
  // Nearest window around the sunrise instant:
  const around = chandrashtamaWindowAroundJd(sunrise + 0.5, starIndex);
  if (around.startJdUt < sunrise) {
    // window began before sunrise: active iff it still covers daylight part
    if (around.endJdUt > sunrise) {
      return { ...around, status: 'active' };
    }
  }
  // Not covering this day: find the next entry strictly after 'sunrise'.
  const targetValue = starIndex * NAKSHATRA_ARC_DEG;
  const value = moonSiderealAtJdUt(sunrise);
  const rel = norm360(value - targetValue);
  // Distance (degrees) to the next entry into the segment is always 360−rel:
  // inside the segment the moon must traverse the remainder and full circle.
  const aheadStart = findMoonSiderealCrossing(targetValue, sunrise + (360 - rel) / 13.0);
  const endTarget = (((starIndex + 1) % 27) * NAKSHATRA_ARC_DEG) % 360;
  const aheadEnd = findMoonSiderealCrossing(endTarget, aheadStart + 1.0);
  return { status: 'upcoming', starIndex, startJdUt: aheadStart, endJdUt: aheadEnd };
}

function parseIsoDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y ?? 2026, month: m ?? 1, day: d ?? 1 };
}

// --- IST formatting --------------------------------------------------------

/**
 * IST wall-clock 'HH:mm' for a UT Julian Day.
 */
export function jdUtToIstHHmm(jdUt: number): string {
  // Julian Days are noon-anchored: the time-of-day fraction is (frac+0.5)
  // mod 1 — the same convention civilFromJdIst builds into its +0.5 term.
  const ist = jdUt + IST_OFFSET_DAYS + 0.5;
  const frac = ist - Math.floor(ist);
  const minutes = Math.round(frac * 24 * 60) % 1440;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Civil IST 'YYYY-MM-DD' day key of a UT Julian Day instant. */
export function jdUtToIstDayKey(jdUt: number): string {
  const c = civilFromJdIst(jdUt);
  return `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`;
}

/** Panchang-day JD: Chennai engine sunrise on the local date parts. */
export function sunriseJdUtForDateKey(dateKey: string): number {
  const { year, month, day } = parseIsoDateKey(dateKey);
  return chennaiSunriseJdUt(year, month, day);
}

/** Convenience: 'YYYY-MM-DD' → { year, month, day } (never UTC-parsed). */
export { parseIsoDateKey };
