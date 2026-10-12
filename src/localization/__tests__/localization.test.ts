import { translate, weekdayName, tamilMonthName, gregorianMonthName, taDict, enDict } from '../index';
import type { TranslationDict } from '../types';

describe('localization', () => {
  test('ta and en dictionaries have identical key sets', () => {
    const taKeys = Object.keys(taDict).sort();
    const enKeys = Object.keys(enDict).sort();
    expect(taKeys).toEqual(enKeys);
  });

  test('translate returns Tamil text', () => {
    expect(translate('ta', 'tabHome')).toBe('முகப்பு');
    expect(translate('en', 'tabHome')).toBe('Home');
  });

  test('translate falls back to English when key missing in Tamil', () => {
    const fakeTa: TranslationDict = { ...taDict };
    delete (fakeTa as Record<string, string>).tabHome;
    expect(translate('ta', 'tabHome', undefined, fakeTa)).toBe('Home');
  });

  test('weekday names short + full in both languages', () => {
    expect(weekdayName(0, 'ta', true)).toBe('ஞா');
    expect(weekdayName(0, 'en')).toBe('Sunday');
    expect(weekdayName(3, 'en', true)).toBe('Wed');
    expect(weekdayName(4, 'ta')).toBe('வியாழன்');
  });

  test('tamil month names', () => {
    expect(tamilMonthName(1, 'en')).toBe('Chithirai');
    expect(tamilMonthName(9, 'ta')).toBe('மார்கழி');
    expect(tamilMonthName(10, 'ta')).toBe('தை');
    expect(tamilMonthName(12, 'ta')).toBe('பங்குனி');
  });

  test('gregorian month names', () => {
    expect(gregorianMonthName(1, 'en')).toBe('January');
    expect(gregorianMonthName(12, 'ta')).toBe('டிசம்பர்');
  });
});
