import { tamilMonthsSpanningGregorianMonth } from '../tamilMonthSpan';

const TAMIL_RE = /[\u0B80-\u0BFF]/;

describe('tamilMonthsSpanningGregorianMonth', () => {
  test('January spans exactly two Tamil months: Margazhi · Thai (en)', () => {
    // Jan 1..13 = Margazhi (Thai 1 = Jan 14); Jan 14..31 = Thai.
    expect(tamilMonthsSpanningGregorianMonth(2026, 1, 'en')).toBe('Margazhi · Thai');
  });

  test('April spans Panguni · Chithirai (en)', () => {
    // Apr 1..13 = Panguni; Apr 14..30 = Chithirai (Puthandu).
    expect(tamilMonthsSpanningGregorianMonth(2026, 4, 'en')).toBe('Panguni · Chithirai');
  });

  test('Tamil rendering uses Tamil script names', () => {
    const value = tamilMonthsSpanningGregorianMonth(2026, 1, 'ta');
    expect(value).toBe('மார்கழி · தை');
    expect(TAMIL_RE.test(value)).toBe(true);
  });

  test('mid-span months boundaries are respected across years', () => {
    // Dec 16..31 = Margazhi 1..16; Dec 1..15 = Karthigai tail.
    expect(tamilMonthsSpanningGregorianMonth(2026, 12, 'en')).toBe('Karthigai · Margazhi');
  });

  test('never returns fewer than two names for any month of 2026', () => {
    for (let m = 1; m <= 12; m++) {
      const value = tamilMonthsSpanningGregorianMonth(2026, m, 'en');
      const parts = value.split(' · ');
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts.every((p) => p.length > 0)).toBe(true);
    }
  });
});
