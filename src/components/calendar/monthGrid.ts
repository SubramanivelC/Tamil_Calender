import type { DayCell, NumeralStyle } from '@/types';
import {
  toDateKey,
  parseDateKey,
  weekdayOf,
  daysInMonth,
  localTodayKey,
  addDays,
} from '@/utils/dates';

export interface DayDecoration {
  tamilDay?: number | null;
  tamilMonth?: number | null;
  isAmavasai?: boolean;
  isPournami?: boolean;
  hasEvent?: boolean;
}

export interface MonthGridOptions {
  year: number;
  month: number; // 1..12
  firstDayOfWeek: 0 | 1;
  /** Optional per-date flags resolved by caller (festival/amavasai/etc). */
  festivalKeys?: Set<string>;
  tamilDayFor?: (key: string) => number | null;
  /** Per-date decorations: Tamil date, moon-phase markers, user events. */
  decorations?: Map<string, DayDecoration>;
}

/**
 * Builds a flat list of DayCell for one month including leading/trailing
 * days from adjacent months to fill complete weeks. Deterministic, no UTC.
 */
export function buildMonthGrid(options: MonthGridOptions): DayCell[] {
  const { year, month, firstDayOfWeek, festivalKeys, tamilDayFor, decorations } = options;
  const yearKeyOfToday = localTodayKey();
  const total = daysInMonth(year, month);
  const firstKey = toDateKey(year, month, 1);
  const firstWeekday = weekdayOf(firstKey);
  const lead = (firstWeekday - firstDayOfWeek + 7) % 7;

  const cells: DayCell[] = [];

  // Leading days from previous month.
  for (let i = lead - 1; i >= 0; i--) {
    const key = addDays(firstKey, -(i + 1));
    cells.push(makeCell(key, false, yearKeyOfToday, festivalKeys, tamilDayFor, decorations));
  }

  // Days of current month.
  for (let d = 1; d <= total; d++) {
    const key = toDateKey(year, month, d);
    cells.push(makeCell(key, true, yearKeyOfToday, festivalKeys, tamilDayFor, decorations));
  }

  // Trailing days from next month to complete the final week.
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const nextNeeded = 7 - remainder;
    const afterLast = addDays(toDateKey(year, month, total), 1);
    for (let i = 0; i < nextNeeded; i++) {
      cells.push(makeCell(addDays(afterLast, i), false, yearKeyOfToday, festivalKeys, tamilDayFor, decorations));
    }
  }

  return cells;
}

function makeCell(
  key: string,
  inMonth: boolean,
  todayKey: string,
  festivalKeys?: Set<string>,
  tamilDayFor?: (key: string) => number | null,
  decorations?: Map<string, DayDecoration>
): DayCell {
  const { year, month, day } = parseDateKey(key);
  const weekday = weekdayOf(key);
  const decor = decorations?.get(key);
  const tamilDay = decor?.tamilDay !== undefined ? decor.tamilDay : tamilDayFor ? tamilDayFor(key) : null;
  const festival = festivalKeys?.has(key) ?? false;
  return {
    key,
    year,
    month,
    day,
    weekday,
    isToday: key === todayKey,
    inMonth,
    tamilDay,
    tamilMonth: decor?.tamilMonth ?? null,
    hasFestival: festival,
    isAmavasai: decor?.isAmavasai ?? false,
    isPournami: decor?.isPournami ?? false,
    hasEvent: decor?.hasEvent ?? false,
  };
}

/** 'YYYY-MM' month label prefix -> keys within that month only. */
export function monthOfKey(key: string): { year: number; month: number } {
  const { year, month } = parseDateKey(key);
  return { year, month };
}

export type { NumeralStyle as _NumeralStyle };
