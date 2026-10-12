import { toTamilNumerals, formatNumerals, formatNumber, formatTimeWithMeridiem } from '../numerals';

describe('numerals', () => {
  test('Tamil digits map', () => {
    expect(toTamilNumerals('2026')).toBe('௨௦௨௬');
    expect(toTamilNumerals('04')).toBe('௦௪');
  });

  test('formatNumerals respects style', () => {
    expect(formatNumerals('15', 'tamil')).toBe('௧௫');
    expect(formatNumerals('15', 'arabic')).toBe('15');
  });

  test('formatNumber formats numbers', () => {
    expect(formatNumber(108, 'tamil')).toBe('௧௦௮');
    expect(formatNumber(108, 'arabic')).toBe('108');
  });

  test('formatTimeWithMeridiem English converts to 12h', () => {
    expect(formatTimeWithMeridiem('06:30', 'en')).toBe('6:30 AM');
    expect(formatTimeWithMeridiem('18:00', 'en')).toBe('6:00 PM');
    expect(formatTimeWithMeridiem('00:15', 'en')).toBe('12:15 AM');
    expect(formatTimeWithMeridiem('12:00', 'en')).toBe('12:00 PM');
  });

  test('formatTimeWithMeridiem Tamil keeps 24h', () => {
    expect(formatTimeWithMeridiem('18:00', 'ta')).toBe('18:00');
  });
});
