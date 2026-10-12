import { cleanBilingualValue } from '../bilingual';
import { taDict, enDict, translate, tamilMonthName, gregorianMonthName } from '../../localization';

const TAMIL_RE = /[\u0B80-\u0BFF]/;

/**
 * Bilingual dataset values ("பிரதமை / Prathamai") previously leaked into the
 * English UI. These tests pin the script-stripping contract.
 */
describe('cleanBilingualValue', () => {
  test("English mode drops the Tamil side of 'ta / en' values", () => {
    expect(cleanBilingualValue('பிரதமை / Prathamai', 'en')).toBe('Prathamai');
    expect(cleanBilingualValue('விஷ்கம்பம் / Vishkambham', 'en')).toBe('Vishkambham');
  });

  test('Tamil mode drops the English side', () => {
    expect(cleanBilingualValue('பிரதமை / Prathamai', 'ta')).toBe('பிரதமை');
    expect(cleanBilingualValue('அமாவாசை / Amavasai', 'ta')).toBe('அமாவாசை');
  });

  test('single-script values pass through untouched', () => {
    expect(cleanBilingualValue('07:30–09:00', 'en')).toBe('07:30–09:00');
    expect(cleanBilingualValue('ராகு காலம்', 'ta')).toBe('ராகு காலம்');
    expect(cleanBilingualValue('Sunrise', 'en')).toBe('Sunrise');
  });

  test('no-script separators (times with no slash) are safe', () => {
    expect(cleanBilingualValue('06:00:12', 'ta')).toBe('06:00:12');
  });

  test('empty/null-ish values never throw', () => {
    expect(cleanBilingualValue('', 'en')).toBe('');
    expect(cleanBilingualValue('   ', 'en')).toBe('');
  });

  test('unknown script shape falls back to full string (no data loss)', () => {
    expect(cleanBilingualValue('Something Odd', 'ta')).toBe('Something Odd');
  });

  test('date strings with slashes are asymmetric-safe (no data loss)', () => {
    // '14/04/2026' has no Tamil chars, so both sides "match" English: we must
    // never drop content just because a separator exists.
    expect(cleanBilingualValue('14/04/2026', 'en')).toBe('14/04/2026');
    expect(cleanBilingualValue('14/04/2026', 'ta')).toBe('14/04/2026');
  });
});

/**
 * Regression guard for the "English mode still shows Tamil" bug: every
 * dictionary key must produce a non-Tamil string in the English dictionary.
 */
describe('english dictionary has no Tamil leakage', () => {
  const TAMIL_RE = /[\u0B80-\u0BFF]/;

  test('every enDict value is Tamil-free (allowlisted keys excepted)', () => {
    // Keys intentionally allowed to contain Tamil script in English mode:
    // proper nouns with no accepted English spelling.
    const allowlist = new Set<string>([]);
    const offenders = Object.entries(enDict)
      .filter(([k, v]) => !allowlist.has(k) && TAMIL_RE.test(v as string))
      .map(([k, v]) => `${k}="${v}"`);
    expect(offenders).toEqual([]);
  });

  test('translate() in English never returns a Tamil string for any known key', () => {
    for (const key of Object.keys(enDict)) {
      const value = translate('en', key);
      expect(TAMIL_RE.test(value)).toBe(false);
    }
  });

  test('key parity: ta and en dictionaries have identical key sets', () => {
    expect(Object.keys(taDict).sort()).toEqual(Object.keys(enDict).sort());
  });
});

/**
 * "Tamil month name is missing" regression: the home hero and calendar
 * header both surface the Tamil month via tamilMonthName(); every month in
 * both languages must resolve to a non-empty string.
 */
describe('tamil month names are complete', () => {
  test('all 12 months resolve in Tamil', () => {
    for (let m = 1; m <= 12; m++) {
      const name = tamilMonthName(m, 'ta');
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(TAMIL_RE.test(name)).toBe(true);
    }
  });

  test('all 12 months resolve in English', () => {
    const expected = [
      'Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Aavani', 'Purattasi',
      'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Masi', 'Panguni',
    ];
    for (let m = 1; m <= 12; m++) {
      expect(tamilMonthName(m, 'en')).toBe(expected[m - 1]);
    }
  });

  test('out-of-range months clamp instead of crashing/undefined', () => {
    expect(tamilMonthName(0, 'en')).toBe('Chithirai');
    expect(tamilMonthName(13, 'en')).toBe('Panguni');
  });

  test('gregorian month names resolve in both languages', () => {
    expect(gregorianMonthName(7, 'ta')).toBe('ஜூலை');
    expect(gregorianMonthName(7, 'en')).toBe('July');
  });

  test("tamilMonthYear label exists in both dictionaries (hero tag)", () => {
    expect(translate('en', 'tamilMonthYear')).toBe('Tamil month / year');
    expect(translate('ta', 'tamilMonthYear')).toBeTruthy();
  });
});
