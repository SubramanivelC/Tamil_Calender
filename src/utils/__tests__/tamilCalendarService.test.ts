import {
  computeTamilYearStarts,
  convertToTamil,
  tamilYearName,
  tamilMonthName,
} from '../../services/tamilCalendarService';
import { dateKeyToDate } from '../dates';

describe('tamil calendar conversion (sankranti-verified anchors)', () => {
  // Full 2026 month starts, cross-verified against Prokerala/ClickAstro
  // Chennai calendars (Thirukanitha, the printed-calendar convention).
  describe('2026 month starts (Chennai published calendars)', () => {
    const cases: [string, number][] = [
      ['2026-01-15', 10], // Thai (Thai Pongal day)
      ['2026-02-13', 11], // Masi
      ['2026-03-15', 12], // Panguni
      ['2026-04-14', 1], // Chithirai — Puthandu
      ['2026-05-15', 2], // Vaikasi
      ['2026-06-15', 3], // Aani
      ['2026-07-17', 4], // Aadi
      ['2026-08-18', 5], // Aavani — printed daily sheets start Aug 18 (Simha sankranti Aug 17 08:04)
      ['2026-09-18', 6], // Purattasi — printed daily sheets start Sep 18 (Kanya sankranti Sep 17 07:58)
      ['2026-10-18', 7], // Aippasi — Tulam sankranti Oct 17 19:57 IST → next day
      ['2026-11-17', 8], // Karthigai
      ['2026-12-16', 9], // Margazhi
    ];
    for (const [dateKey, expectedMonth] of cases) {
      test(`${dateKey} is Tamil month ${expectedMonth} day 1`, () => {
        const c = convertToTamil(dateKeyToDate(dateKey));
        expect(c.month).toBe(expectedMonth);
        expect(c.day).toBe(1);
      });
    }
  });

  // Regression for the user-reported wrong data: Oct 18, 2026 was shown as
  // Aippasi 2 and Oct 17 as Purattasi 31 by earlier engines; printed calendars
  // say Purattasi 1 = Sep 18, so Oct 17 is Purattasi 30 and Oct 18 is Aippasi 1.
  test('2026-10-18 is Aippasi 1 and 2026-10-17 is Purattasi 30 (regression)', () => {
    const c = convertToTamil(dateKeyToDate('2026-10-18'));
    expect(c.month).toBe(7); // Aippasi
    expect(c.day).toBe(1);
    // and the day before is the last Purattasi day
    const prev = convertToTamil(dateKeyToDate('2026-10-17'));
    expect(prev.month).toBe(6); // Purattasi
    expect(prev.day).toBe(30);
  });

  test('Aavani 2026 runs Aug 18 to Sep 17 (31 days, printed calendar)', () => {
    const first = convertToTamil(dateKeyToDate('2026-08-18'));
    expect(first.month).toBe(5);
    expect(first.day).toBe(1);
    const last = convertToTamil(dateKeyToDate('2026-09-17'));
    expect(last.month).toBe(5);
    expect(last.day).toBe(31);
    // The day before Aavani 1 is the last Aadi day (Aadi = 32 days in 2026)
    const aadiLast = convertToTamil(dateKeyToDate('2026-08-17'));
    expect(aadiLast.month).toBe(4);
    expect(aadiLast.day).toBe(32);
  });

  test('Aippasi month length matches published calendars: Nov 16 2026 is Aippasi 30', () => {
    const c = convertToTamil(dateKeyToDate('2026-11-16'));
    expect(c.month).toBe(7);
    expect(c.day).toBe(30);
  });

  test('Aani runs 32 days: Jul 16 2026 is Aani 32', () => {
    const c = convertToTamil(dateKeyToDate('2026-07-16'));
    expect(c.month).toBe(3);
    expect(c.day).toBe(32);
  });

  test('Jun 14 2026 is Vaikasi 31 (end of month)', () => {
    const c = convertToTamil(dateKeyToDate('2026-06-14'));
    expect(c.month).toBe(2);
    expect(c.day).toBe(31);
  });

  // Thai Pongal follows the sankranti rule: 2025 sankranti (Jan 14, morning)
  // → Thai 1 same day; 2026 sankranti (Jan 14, 15:13 IST) → next day; 2027
  // sankranti (Jan 14, 21:14 IST, Drik) → next day.
  test.each([
    ['2025-01-14', 1], // Thai Pongal 2025 = Jan 14
    ['2026-01-15', 1], // Thai Pongal 2026 = Jan 15
    ['2027-01-15', 1], // Thai Pongal 2027 = Jan 15
  ])('%s is Thai 1', (dateKey, expectedDay) => {
    const c = convertToTamil(dateKeyToDate(dateKey));
    expect(c.month).toBe(10); // Thai
    expect(c.day).toBe(expectedDay);
  });

  test('Bogi Pandigai: Jan 14 2026 is still Margazhi 30 (Thai starts Jan 15)', () => {
    const c = convertToTamil(dateKeyToDate('2026-01-14'));
    expect(c.month).toBe(9); // Margazhi
    expect(c.day).toBe(30);
  });

  test('Puthandu anchors: Apr 14 is Chithirai 1 (2024, 2025, 2026)', () => {
    for (const y of [2024, 2025, 2026]) {
      const c = convertToTamil(dateKeyToDate(`${y}-04-14`));
      expect(c.month).toBe(1);
      expect(c.day).toBe(1);
    }
  });

  test('printed-sheet anchors outside the naive same-day rule', () => {
    // 2024 Masi 1 = Feb 13 (printed; Kumbha sankranti Feb 13 15:54 IST)
    const masi2024 = convertToTamil(dateKeyToDate('2024-02-13'));
    expect(masi2024.month).toBe(11);
    expect(masi2024.day).toBe(1);
    // 2025 Aavani 1 = Aug 17 (printed; Simha sankranti Aug 17 02:00 IST)
    const aavani2025 = convertToTamil(dateKeyToDate('2025-08-17'));
    expect(aavani2025.month).toBe(5);
    expect(aavani2025.day).toBe(1);
    // 2027 Aavani 1 = Aug 17 (printed; Simha sankranti Aug 17 14:16 IST)
    const aavani2027 = convertToTamil(dateKeyToDate('2027-08-17'));
    expect(aavani2027.month).toBe(5);
    expect(aavani2027.day).toBe(1);
  });

  test('Aippasi 1 anchors: Oct 18 2025 and Oct 18 2026 (published calendars)', () => {
    const c2025 = convertToTamil(dateKeyToDate('2025-10-18'));
    expect(c2025.month).toBe(7);
    expect(c2025.day).toBe(1);
    const c2026 = convertToTamil(dateKeyToDate('2026-10-18'));
    expect(c2026.month).toBe(7);
    expect(c2026.day).toBe(1);
  });

  test('Aippasi 2025: Deepavali Oct 20 2025 = Aippasi 3 (published calendar)', () => {
    const c = convertToTamil(dateKeyToDate('2025-10-20'));
    expect(c.month).toBe(7);
    expect(c.day).toBe(3);
  });

  test('Aippasi 2024 starts Oct 17 (Tulam sankranti 07:32 IST same day)', () => {
    const c = convertToTamil(dateKeyToDate('2024-10-17'));
    expect(c.month).toBe(7);
    expect(c.day).toBe(1);
  });

  test('Jan 1 2026 wraps into Margazhi (day 17) of the previous Tamil year', () => {
    const c = convertToTamil(dateKeyToDate('2026-01-01'));
    expect(c.month).toBe(9); // Margazhi (starts Dec 16, 2025)
    expect(c.day).toBe(17);
    expect(c.yearIndex).toBe(39); // Visuvasuva (Tamil year begun Apr 2025)
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
    // December 2026 belongs to Parabhava (40)
    const dec = convertToTamil(dateKeyToDate('2026-12-20'));
    expect(dec.yearIndex).toBe(40);
  });

  test('day-of-month continues across Gregorian month boundary', () => {
    // Chithirai 1 = Apr 14, 2026; May 1 = Chithirai 18
    const c = convertToTamil(dateKeyToDate('2026-05-01'));
    expect(c.month).toBe(1);
    expect(c.day).toBe(18);
  });

  test('paksha splits at day 15/16 within a month', () => {
    const c1 = convertToTamil(dateKeyToDate('2026-04-20')); // Chithirai 7
    expect(c1.paksha).toBe('Shukla');
    const c2 = convertToTamil(dateKeyToDate('2026-05-05')); // Chithirai 22
    expect(c2.paksha).toBe('Krishna');
  });

  test('month start days are internally consistent (each next start after previous)', () => {
    for (const y of [2024, 2025, 2026, 2027, 2028]) {
      const { starts } = computeTamilYearStarts(y);
      for (const s of starts) expect(s).toBeGreaterThan(0);
      for (let m = 1; m < 12; m++) {
        const len = starts[m]! - starts[m - 1]!;
        // Tamil months are 29-32 days long
        expect(len).toBeGreaterThanOrEqual(29);
        expect(len).toBeLessThanOrEqual(32);
      }
    }
  });

  test('tamilMonthName resolves names', () => {
    expect(tamilMonthName(1, 'en')).toBe('Chithirai');
    expect(tamilMonthName(1, 'ta')).toBe('சித்திரை');
    expect(tamilMonthName(12, 'en')).toBe('Panguni');
  });

  test('tamil date is presented as verified (not approximate)', () => {
    const c = convertToTamil(dateKeyToDate('2026-10-18'));
    expect(c.approximate).toBe(false);
  });
});
