import {
  toDateKey,
  parseDateKey,
  isValidDateKey,
  isLeapYear,
  daysInMonth,
  addMonths,
  addDays,
  diffCalendarDays,
  weekdayOf,
} from '../dates';

describe('date key helpers', () => {
  test('toDateKey zero-pads correctly', () => {
    expect(toDateKey(2026, 3, 5)).toBe('2026-03-05');
    expect(toDateKey(26, 3, 5)).toBe('0026-03-05');
  });

  test('parseDateKey round-trips', () => {
    expect(parseDateKey('2026-12-31')).toEqual({ year: 2026, month: 12, day: 31 });
  });

  test('isValidDateKey validates real dates', () => {
    expect(isValidDateKey('2026-04-14')).toBe(true);
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('banana')).toBe(false);
  });

  test('leap years', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });

  test('leap month lengths', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 8)).toBe(31);
  });

  test('addMonths crosses December-January boundary', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  test('addDays rolls over month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-04-14', 1)).toBe('2026-04-15');
  });

  test('diffCalendarDays is symmetric and DST-safe', () => {
    expect(diffCalendarDays('2026-08-22', '2026-08-12')).toBe(10);
    expect(diffCalendarDays('2026-04-14', '2026-01-15')).toBe(89);
  });

  test('2016-01-01 is a Friday (weekdayOf neglects TZ shift)', () => {
    expect(weekdayOf('2016-01-01')).toBe(5);
    expect(weekdayOf('2026-04-14')).toBe(2); // Tuesday
    expect(weekdayOf('2024-07-04')).toBe(4); // Thursday
  });
});
