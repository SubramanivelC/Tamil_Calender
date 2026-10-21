import { formatTimeWithMeridiem, formatNumerals } from '@/utils/numerals';
import type { Language, NumeralStyle } from '@/types';

/**
 * Formats a panchangam boundary end stamp for TimeRow-style display:
 * IST meridiem time in the UI numerals, with a 'next day' marker when the
 * transition lands on the following civil IST date. Returned null is
 * rendered as '—' by TimeRow — never a fabricated fallback time.
 */
export function formatBoundaryStamp(
  hhmm: string | null,
  endDayKey: string | null,
  baseDateKey: string,
  language: Language,
  t: (key: string, vars?: Record<string, string | number>) => string,
  numerals: NumeralStyle
): string | null {
  if (!hhmm) return null;
  const stamp = formatNumerals(formatTimeWithMeridiem(hhmm, language), numerals);
  if (!endDayKey || endDayKey === baseDateKey) return stamp;
  return formatNumerals(`${stamp} · ${t('nextDayMarker')}`, numerals);
}
