/**
 * Tamil months begin mid-Gregorian-month (Thai 1 = Jan 14, Chithirai 1 =
 * Apr 14, …), so every Gregorian month spans exactly two Tamil months.
 * The month header on Home/Calendar must show both, e.g. an English January:
 * "Margazhi · Thai".
 */
import { convertToTamil } from '@/services/tamilCalendarService';
import { tamilMonthName } from '@/localization';
import { dateKeyToDate, toDateKey, daysInMonth } from '@/utils/dates';
import type { Language } from '@/types';

export function tamilMonthsSpanningGregorianMonth(
  year: number,
  month: number,
  language: Language
): string {
  // Peak-sample days spread across the month; dedupe of the two Tamil month
  // indices across all samples yields exactly the months actually covered.
  const seen: number[] = [];
  const total = daysInMonth(year, month);
  for (let d = 1; d <= total; d++) {
    const conv = convertToTamil(dateKeyToDate(toDateKey(year, month, d)));
    if (conv.month !== null && !seen.includes(conv.month)) seen.push(conv.month);
  }
  if (seen.length === 0) return '';
  return seen.map((m) => tamilMonthName(m, language)).join(' · ');
}
