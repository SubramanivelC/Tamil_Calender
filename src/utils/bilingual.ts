/**
 * The bundled dataset stores several panchangam strings bilingually
 * ("பிரதமை / Prathamai", "விஷ்கம்பம் / Vishkambham", …) so both languages
 * work without separate columns. When a row is rendered in one UI language,
 * the opposite script must be stripped — otherwise the English UI leaks
 * Tamil words and vice versa, and the combined string is ~2x longer than
 * either label alone, which overflows rows on small screens.
 */

/**
 * Contracts: given a dataset string that may contain "Tamil / English"
 * segments, returns only the part matching the requested language.
 * - Never throws; unknown shapes are returned trimmed and unchanged, so a
 *   new dataset format degrades to showing the full string rather than
 *   losing data.
 * - Pure function, no normalization of case/spacing beyond the separator
 *   handling documented below.
 */
export function cleanBilingualValue(value: string, language: 'ta' | 'en'): string {
  if (!value) return '';
  // Values with no Tamil characters at all (dates, times, "14/04/2026") are
  // not bilingual — pass through unmangled regardless of separators.
  if (!hasTamilChars(value) && language === 'en') return value.trim();
  // Split on any of '/', '·' or ' | ' separators (dataset convention is '/').
  const segments = value.split(/\s*[/|·]\s*/).map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return value.trim();

  const wanted = segments.filter((seg) =>
    language === 'ta' ? hasTamilChars(seg) : !hasTamilChars(seg)
  );
  if (wanted.length === 0) return value.trim(); // all-script segment: show as-is
  return wanted.join(' / ').trim();
}

function hasTamilChars(s: string): boolean {
  return /[\u0B80-\u0BFF]/.test(s); // Tamil Unicode block
}
