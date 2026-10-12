import { convertToTamil, tamilYearName, tamilMonthName } from '../../services/tamilCalendarService';
// eslint-disable-next-line
import { dateKeyToDate } from '../dates';

describe('tamil calendar conversion', () => {
  test('Puthandu 2026-04-14 is Chithirai 1', () => {
    const c = convertToTamil(dateKeyToDate('2026-04-14'));
    expect(c.day).toBe(1);
    expect(c.month).toBe(1);
  });

  test('Thai Pongal 2026-01-14 is Thai (month 10) day 1', () => {
    const c = convertToTamil(dateKeyToDate('2026-01-14'));
    expect(c.month).toBe(10);
    expect(c.day).toBe(1);
  });

  test('Aadi 1 ~ July 16', () => {
    const c = convertToTamil(dateKeyToDate('2026-07-16'));
    expect(c.month).toBe(4);
  });

  test('packsha splits at day 15/16', () => {
    const c1 = convertToTamil(dateKeyToDate('2026-04-20'));
    expect(c1.paksha).toBe('Shukla');
    const c2 = convertToTamil(dateKeyToDate('2026-05-05'));
    expect(c2.paksha).toBe('Krishna');
  });

  test('cycle index anchored at Parabhava for Apr 2026', () => {
    const c = convertToTamil(dateKeyToDate('2026-04-14'));
    expect(c.yearIndex).toBe(40);
    expect(tamilYearName(40, 'en')).toBe('Parabhava');
    expect(tamilYearName(40, 'ta')).toBe('பராபவ');
  });

  test('pre-Puthandu dates belong to previous Tamil year', () => {
    // Apr 13, 2026 = last day of Visuvasuva (39)
    const c = convertToTamil(dateKeyToDate('2026-04-13'));
    expect(c.yearIndex).toBe(39);
  });

  test('day-of-month continues across Gregorian month boundary', () => {
    // Chithirai starts Apr 14; May 1 = Chithirai 18
    const c = convertToTamil(dateKeyToDate('2026-05-01'));
    expect(c.month).toBe(1);
    expect(c.day).toBe(18);
  });

  test('Jan 1 2026 wraps to Margazhi window from previous year', () => {
    // Jan 1 2026 falls inside the Margazhi window started Dec 16, 2025.
    const c = convertToTamil(dateKeyToDate('2026-01-01'));
    expect(c.month).toBe(9);
    expect(c.day).toBe(17); // Dec16+0..: 17 days after Dec 16 inclusive = Jan 1
  });

  test('tamilMonthName resolves names', () => {
    expect(tamilMonthName(1, 'en')).toBe('Chithirai');
    expect(tamilMonthName(1, 'ta')).toBe('சித்திரை');
    expect(tamilMonthName(12, 'en')).toBe('Panguni');
  });
});
