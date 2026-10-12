/**
 * Panchangam timing service.
 *
 * Rahu Kalam, Yamagandam, Kuligai: computed from the classical fixed
 * weekday-to-segment mapping, divided equally between sunrise and sunset —
 * the standard convention used across Tamil panchangams.
 *
 * Nalla Neram: day-time good periods; dataset provides verified values, and
 * this module can only compute a conservative approximation when raw data is
 * missing. Sun/moon rise/set require an ephemeris and are read ONLY from
 * bundled dataset records — never fabricated here.
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

/** Weekday (0=Sun..6=Sat) -> segment indices (0..7 within day-half). */
const RAHU_SEGMENTS = [7, 1, 6, 4, 2, 0, 5] as const; // Sun, Mon, Tue, Wed, Thu, Fri, Sat (Sat=5)
const YAMA_SEGMENTS = [4, 3, 1, 0, 6, 2, 7] as const;
const KULI_SEGMENTS = [2, 5, 3, 6, 0, 4, 7] as const;

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
    const seg = arr[weekday] ?? 0;
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
 * Conservative Nalla Neram: first and last eighth of the day-half excluded.
 * Values presented as approximate when no dataset record exists; UI labels
 * such rows "≈". Precise Nalla Neram comes from verified dataset rows.
 */
export function computeNallaNeramApprox(input: DayTimingsInput): string | null {
  if (!input.sunrise || !input.sunset) return null;
  const rise = hhmmToMin(input.sunrise);
  const set = hhmmToMin(input.sunset);
  if (rise === null || set === null) return null;
  const dayLength = set - rise;
  if (dayLength <= 0) return null;
  const segLen = dayLength / 8;
  const s = rise + segLen * 1; // second eighth onward
  const e = rise + segLen * 7; // through seventh eighth
  return `${minToHhmm(s)} - ${minToHhmm(e)}`;
}
