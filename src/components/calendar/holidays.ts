import type { DayCell } from '@/types';
import { toDateKey, parseDateKey, weekdayOf, isLeapYear, daysInMonth, dateKeyToDate, localTodayKey } from '@/utils/dates';

export function getMonthWidth(width: number): boolean {
  return width >= 320;
}

/** Accessibility label helper for calendar date cell. */
export function getDayCellLabel(day: number, weekday: number): string {
  return `${day}, weekday ${weekday}`;
}

/**
 * Convenience helper: total days in month.
 */
export function daysInMonthOf(year: number, month: number): number {
  return isLeapYear(year) && month === 2 ? 29 : daysInMonth(year, month);
}

/** Local today key based on device clock (no UTC shift). */
export function todayLocal(): string {
  return localTodayKey();
}

/** Whether this date is today. */
export function isToday(date: string): boolean {
  return date === localTodayKey();
}

export function createDayCell(year: number, month: number, day: number, hasFestival: boolean, tamilDay: number | null): DayCell {
  const key = toDateKey(year, month, day);
  const date = dateKeyToDate(key);
  return {
    key,
    year,
    month,
    day,
    weekday: date.getDay(),
    isToday: todayLocal() === key,
    inMonth: true,
    tamilDay,
    tamilMonth: month,
    hasFestival,
    isAmavasai: false,
    isPournami: false,
  };
}

export function parse(key: string) {
  return parseDateKey(key);
}
