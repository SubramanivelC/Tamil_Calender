/**
 * Time-window utilities for the live time-band banner.
 *
 * The panchangam strings are consistently 24h zero-padded `HH:mm` (see
 * panchangamService.ts): single inauspicious windows are `HH:mm - HH:mm`,
 * Nalla Neram merges its favourable windows with ` - ` / `·` separators.
 * Both `-` and `–`/`—` separators are tolerated.
 */

export interface TimeWindow {
  /** Minutes of day, inclusive. */
  start: number;
  /** Minutes of day, exclusive. */
  end: number;
}

const TIME_RE = /(\d{1,2})\s*[:.]\s*(\d{2})/g;

/** Parse every `start - end` pair from a band value ('06:32 - 07:48 · 09:16 - 10:44'). */
export function parseTimeWindows(value: string | null | undefined): TimeWindow[] {
  if (!value) return [];
  const windows: TimeWindow[] = [];
  for (const seg of value.split('·')) {
    const times: number[] = [];
    for (const m of seg.matchAll(TIME_RE)) {
      const h = parseInt(m[1]!, 10);
      const mm = parseInt(m[2]!, 10);
      if (h > 23 || mm > 59) continue;
      times.push(h * 60 + mm);
    }
    if (times.length >= 2) {
      times.sort((a, b) => a - b);
      windows.push({ start: times[0]!, end: times[1]! });
    }
  }
  return windows;
}

/** Local wall-clock minutes of day (no UTC — matches all date utilities). */
export function currentMinutesOfDay(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function activeWindow(windows: TimeWindow[], now: number): TimeWindow | null {
  for (const w of windows) {
    if (now >= w.start && now < w.end) return w;
  }
  return null;
}

export function nextWindow(windows: TimeWindow[], now: number): TimeWindow | null {
  let next: TimeWindow | null = null;
  for (const w of windows) {
    if (w.start > now && (next === null || w.start < next.start)) next = w;
  }
  return next;
}

/** '06:00' → 360, tolerant of common variants. */
export function hhmmToMinutes(hhmm: string): number | null {
  const m = /(\d{1,2})\s*[:.]\s*(\d{2})/.exec(hhmm);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** Minutes-of-day → zero-padded 'HH:mm' for display. */
export function minutesToHhmm(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Break a duration into display parts for the localized `{h}h {m}m` pattern. */
export function durationParts(mins: number, now = currentMinutesOfDay()): { h: number; m: number } {
  const positive = Math.max(0, mins - now);
  return { h: Math.floor(positive / 60), m: positive % 60 };
}
