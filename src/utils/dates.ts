/**
 * Timezone-safe date helpers. All functions work on local-calendar dates and
 * produce 'YYYY-MM-DD' keys using *local* fields — never UTC getters, which
 * shift dates for users west of UTC (see tests/unit/dates.test.ts).
 */

export const MS_PER_DAY = 86_400_000;

/** Format a local Y/M/D as a zero-padded 'YYYY-MM-DD' key. */
export function toDateKey(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year.toString().padStart(4, '0')}-${m}-${d}`;
}

/** Parse 'YYYY-MM-DD' into local Y/M/D parts. */
export function parseDateKey(key: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Bad date key: ${key}`);
  }
  return { year: y, month: m, day: d };
}

/** Local-midnight Date for a 'YYYY-MM-DD' key (avoids UTC drift). */
export function dateKeyToDate(key: string): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** 'YYYY-MM-DD' for the device's local "today" — never via UTC getters. */
export function localTodayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** 0=Sunday..6=Saturday for a local calendar date key. */
export function weekdayOf(key: string): number {
  return dateKeyToDate(key).getDay();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  const len = lengths[month - 1];
  return len ?? 31;
}

/** Whole-day difference a - b in days (calendar-based, DST-safe). */
export function diffCalendarDays(a: string, b: string): number {
  const da = dateKeyToDate(a);
  const db = dateKeyToDate(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcA - utcB) / MS_PER_DAY);
}

/** Add n calendar days to a key (normalizes overflow like Date does). */
export function addDays(key: string, n: number): string {
  const d = dateKeyToDate(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function addMonths(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const total = (year * 12 + (month - 1) + delta) as number;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { year, month, day } = parseDateKey(key);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}
