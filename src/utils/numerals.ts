import type { Language, NumeralStyle } from '@/types';

const TAMIL_DIGITS = ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯'];

/** Convert any digits in the string to Tamil numerals (௰/௱/௲ keep ASCII groups). */
export function toTamilNumerals(input: string): string {
  return input.replace(/\d/g, (d) => TAMIL_DIGITS[Number(d)] ?? d);
}

export function formatNumerals(input: string, style: NumeralStyle): string {
  return style === 'tamil' ? toTamilNumerals(input) : input;
}

export function formatNumber(n: number, style: NumeralStyle): string {
  return formatNumerals(String(n), style);
}

/**
 * Display 'HH:mm' in the user's language convention.
 * Tamil locale commonly uses 24h "காலை 06:30" style; keep simple: prefix.
 */
export function formatTimeWithMeridiem(hhmm: string, language: Language): string {
  const [hStr, m] = hhmm.split(':');
  const h = Number(hStr);
  if (language === 'ta') {
    return hhmm; // Tamil UI shows 24-hour times with period labels nearby.
  }
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}
