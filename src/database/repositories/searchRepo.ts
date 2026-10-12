import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../client';
import { normalize } from '../seed/importer';
import { MAX_RECENT_SEARCHES } from '@/data/constants';
import { parseDateKey, isValidDateKey } from '@/utils/dates';
import { TAMIL_MONTHS } from '@/data/mappings';

export interface SearchResult {
  kind: 'festival' | 'observance' | 'note' | 'tamil_month' | 'date';
  refKey: string;
  title: string;
  subtitle: string | null;
  dateKey: string | null;
}

export async function search(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const results: SearchResult[] = [];

  // 1. Exact date-key search ('2026-04-14' or '14/04/2026').
  const normalizedDate = trimmed.replace(/\//g, '-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (m, y, mo, d) =>
    `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  );
  if (isValidDateKey(normalizedDate)) {
    results.push({ kind: 'date', refKey: normalizedDate, title: trimmed, subtitle: null, dateKey: normalizedDate });
  }

  // 2. Tamil/Gregorian month-name search.
  const lower = trimmed.toLowerCase();
  for (const m of TAMIL_MONTHS) {
    if (m.ta.includes(trimmed) || m.en.toLowerCase().includes(lower)) {
      results.push({
        kind: 'tamil_month',
        refKey: String(TAMIL_MONTHS.indexOf(m) + 1),
        title: `${m.ta} / ${m.en}`,
        subtitle: null,
        dateKey: null,
      });
    }
  }

  // 3. SQLite indexed search over festivals/observances/notes.
  const db = await getDatabase();
  const pattern = `%${normalize(trimmed)}%`;
  const rows = await db.getAllAsync<{
    kind: string;
    ref_key: string;
    title: string;
    subtitle: string | null;
  }>(
    `SELECT kind, ref_key, title, subtitle FROM search_index
     WHERE search_text LIKE ?
     ORDER BY CASE WHEN search_text LIKE ? THEN 0 ELSE 1 END, title
     LIMIT 30`,
    pattern,
    `${normalize(trimmed)}%`
  );
  for (const r of rows) {
    const dateKey =
      r.kind === 'festival'
        ? await resolveFestivalDate(r.ref_key)
        : null;
    results.push({
      kind: r.kind as SearchResult['kind'],
      refKey: r.ref_key,
      title: r.title,
      subtitle: r.subtitle,
      dateKey,
    });
  }

  return results;
}

async function resolveFestivalDate(festivalId: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ date_key: string }>(
    `SELECT MIN(date_key) AS date_key FROM festival_occurrences WHERE festival_id = ?`,
    festivalId
  );
  return row?.date_key ?? null;
}

const RECENT_SEARCHES_KEY = 'thirunellai.recentSearches';

export async function getRecentSearches(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    const list: unknown = json ? JSON.parse(json) : [];
    return Array.isArray(list) ? (list as string[]).slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = await getRecentSearches();
  const updated = [trimmed, ...current.filter((q) => q !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
}
