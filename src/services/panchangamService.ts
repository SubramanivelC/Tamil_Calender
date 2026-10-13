/**
 * Panchangam timing service.
 *
 * Rahu Kalam, Yamagandam, Kuligai: the classical fixed weekday→segment
 * mapping, divided equally between sunrise and sunset — matching the
 * printed Tamil calendar tables (cross-checked against Drik Panchang /
 * TamilDot, see tests).
 *
 * Nalla Neram: Gowri Panchangam convention — daylight split into 8 equal
 * parts from sunrise; the favourable labels (Amirtham, Dhanam, Uthi,
 * Labam, Sugam) are merged into consecutive good windows exactly as
 * printed daily calendars list them.
 *
 * Sun/moon rise/set require an ephemeris and are read ONLY from bundled
 * dataset records — never fabricated here.
 */
export interface DayPeriod {
  /** Minutes from local midnight. */
  start: number;
  end: number;
}

export interface DayTimingsInput {
  /** 'HH:mm' 24h local; null => unavailable downstream. */
  sunrise: string | null;
  sunset: string | null;
}

/** Weekday (0=Sun..6=Sat) -> segment indices 0..7 within the day-half. */
export const RAHU_SEGMENTS = [7, 1, 6, 4, 5, 3, 2] as const;
// Printed tables: Sun 8th, Mon 2nd, Tue 7th, Wed 5th, Thu 6th, Fri 4th, Sat 3rd.
export const YAMA_SEGMENTS = [4, 3, 2, 1, 0, 6, 5] as const;
// Printed tables: Sun 5th, Mon 4th, Tue 3rd, Wed 2nd, Thu 1st, Fri 7th, Sat 6th.
export const KULI_SEGMENTS = [6, 5, 4, 3, 2, 1, 0] as const;
// Printed tables: Sun 7th, Mon 6th, Tue 5th, Wed 4th, Thu 3rd, Fri 2nd, Sat 1st.

export function segmentToPeriod(
  segmentIndex: number,
  sunriseMin: number,
  sunsetMin: number
): DayPeriod | null {
  const dayLength = sunsetMin - sunriseMin;
  if (dayLength <= 0) return null;
  const segLen = dayLength / 8;
  return { start: sunriseMin + segLen * segmentIndex, end: sunriseMin + segLen * (segmentIndex + 1) };
}

function hhmmToMin(v: string): number | null {
  const parts = v.split(':').map(Number);
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minToHhmm(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface InauspiciousTimings {
  rahuKalam: string | null;
  yamagandam: string | null;
  kuligai: string | null;
}

export function computeInauspiciousTimings(
  weekday: number,
  input: DayTimingsInput
): InauspiciousTimings {
  if (!input.sunrise || !input.sunset) {
    return { rahuKalam: null, yamagandam: null, kuligai: null };
  }
  const rise = hhmmToMin(input.sunrise);
  const set = hhmmToMin(input.sunset);
  if (rise === null || set === null) {
    return { rahuKalam: null, yamagandam: null, kuligai: null };
  }
  const period = (arr: readonly number[]) => {
    const seg = arr[((weekday % 7) + 7) % 7] ?? 0;
    const p = segmentToPeriod(seg, rise, set);
    return p ? `${minToHhmm(p.start)} - ${minToHhmm(p.end)}` : null;
  };
  return {
    rahuKalam: period(RAHU_SEGMENTS),
    yamagandam: period(YAMA_SEGMENTS),
    kuligai: period(KULI_SEGMENTS),
  };
}

/**
 * Gowri Panchangam — favourable daylight windows (Nalla Neram).
 *
 * Label indices into GOWRI_LABELS below: 0=Rogam 1=Labam 2=Dhanam
 * 3=Sugam 4=Soram 5=Uthi 6=Visham 7=Amirtham. Sequences per weekday,
 * part 1 starting at sunrise (cross-checked Drik Panchang & Nitya
 * Panchangam, see tests):
 */
export const GOWRI_LABELS = [
  'Rogam',
  'Labam',
  'Dhanam',
  'Sugam',
  'Soram',
  'Uthi',
  'Visham',
  'Amirtham',
] as const;
export const GOWRI_DAY_SEQUENCES: readonly (readonly number[])[] = [
  [5, 7, 0, 1, 2, 3, 4, 6], // Sun: Uthi Amirtham Rogam Labam Dhanam Sugam Soram Visham
  [7, 6, 0, 1, 2, 3, 4, 5], // Mon: Amirtham Visham Rogam Labam Dhanam Sugam Soram Uthi
  [0, 1, 2, 3, 4, 5, 6, 7], // Tue: Rogam Labam Dhanam Sugam Soram Uthi Visham Amirtham
  [1, 2, 3, 4, 6, 5, 7, 0], // Wed: Labam Dhanam Sugam Soram Visham Uthi Amirtham Rogam
  [2, 3, 4, 5, 7, 6, 0, 1], // Thu: Dhanam Sugam Soram Uthi Amirtham Visham Rogam Labam
  [3, 4, 5, 6, 7, 0, 1, 2], // Fri: Sugam Soram Uthi Visham Amirtham Rogam Labam Dhanam
  [4, 5, 6, 7, 0, 1, 2, 3], // Sat: Soram Uthi Visham Amirtham Rogam Labam Dhanam Sugam
];

const FAVOURABLE = new Set([1, 2, 3, 5, 7]); // Labam, Dhanam, Sugam, Uthi, Amirtham

/**
 * Proper Nalla Neram following the printed-calendar Gowri convention:
 * consecutive favourable eighth-part windows are merged and rendered as
 * 'HH:mm - HH:mm · HH:mm - HH:mm …'. Returns null without sun times.
 */
export function computeNallaNeramGowri(weekday: number, input: DayTimingsInput): string | null {
  if (!input.sunrise || !input.sunset) return null;
  const rise = hhmmToMin(input.sunrise);
  const set = hhmmToMin(input.sunset);
  if (rise === null || set === null) return null;
  const dayLength = set - rise;
  if (dayLength <= 0) return null;
  const wd = ((weekday % 7) + 7) % 7;
  const seq: readonly number[] =
    GOWRI_DAY_SEQUENCES[wd] ?? GOWRI_DAY_SEQUENCES[2] ?? [0, 1, 2, 3, 4, 5, 6, 7];
  const segLen = dayLength / 8;
  const windows: DayPeriod[] = [];
  let open: DayPeriod | null = null;
  for (let part = 0; part < 8; part++) {
    const favourable = FAVOURABLE.has(seq[part] ?? 0);
    const start = rise + segLen * part;
    const end = rise + segLen * (part + 1);
    if (favourable) {
      if (open) open.end = end;
      else open = { start, end };
    } else if (open) {
      windows.push(open);
      open = null;
    }
  }
  if (open) windows.push(open);
  if (windows.length === 0) return null;
  return windows.map((w) => `${minToHhmm(w.start)} - ${minToHhmm(w.end)}`).join(' · ');
}


