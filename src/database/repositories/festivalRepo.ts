import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../client';
import type { FestivalCategory, FestivalOccurrence, UpcomingFestival } from '@/types';
import { parseDateKey, toDateKey, addDays, localTodayKey } from '@/utils/dates';
import {
  amPournaForRange,
  tithiBandDatesForRange,
  PRADOSHAM_CENTERS,
  EKADASI_CENTERS,
} from '@/data/lunarPhases';
import { NAVIGABLE_START_YEAR, NAVIGABLE_END_YEAR } from '@/data/constants';

export interface RawOccurrenceRow {
  id: number;
  festival_id: number;
  date_key: string;
  name_ta: string;
  name_en: string;
  description_ta: string | null;
  description_en: string | null;
  category: string;
  is_holiday: number;
  source: string | null;
  verified: number;
}

function mapRow(r: RawOccurrenceRow): FestivalOccurrence {
  return {
    id: r.id,
    festivalId: r.festival_id,
    dateKey: r.date_key,
    nameTa: r.name_ta,
    nameEn: r.name_en,
    descriptionTa: r.description_ta,
    descriptionEn: r.description_en,
    category: r.category as FestivalCategory,
    isHoliday: r.is_holiday === 1,
    source: r.source,
    verified: r.verified === 1,
  };
}

export async function getFestivalsForDate(dateKey: string): Promise<FestivalOccurrence[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RawOccurrenceRow>(
    `SELECT fo.id, fo.festival_id, fo.date_key, fo.source, fo.verified,
            f.name_ta, f.name_en, f.description_ta, f.description_en,
            f.category, f.is_holiday
     FROM festival_occurrences fo
     JOIN festivals f ON f.id = fo.festival_id
     WHERE fo.date_key = ?`,
    dateKey
  );
  return rows.map(mapRow);
}

export async function getFestivalsForMonth(year: number, month: number): Promise<FestivalOccurrence[]> {
  const start = toDateKey(year, month, 1);
  const firstNext = month === 12 ? toDateKey(year + 1, 1, 1) : toDateKey(year, month + 1, 1);
  const end = addDays(firstNext, -1);
  return getFestivalsInRange(start, end);
}

export async function getFestivalsForYear(year: number): Promise<FestivalOccurrence[]> {
  return getFestivalsInRange(`${year}-01-01`, `${year}-12-31`);
}

export async function getFestivalsInRange(startKey: string, endKey: string): Promise<FestivalOccurrence[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RawOccurrenceRow>(
    `SELECT fo.id, fo.festival_id, fo.date_key, fo.source, fo.verified,
            f.name_ta, f.name_en, f.description_ta, f.description_en,
            f.category, f.is_holiday
     FROM festival_occurrences fo
     JOIN festivals f ON f.id = fo.festival_id
     WHERE fo.date_key >= ? AND fo.date_key <= ?
     ORDER BY fo.date_key ASC`,
    startKey,
    endKey
  );
  return rows.map(mapRow);
}

export async function getUpcomingFestivals(limit = 5): Promise<UpcomingFestival[]> {
  const db = await getDatabase();
  const today = localTodayKey();
  const end = addDays(today, 60);
  const rows = await db.getAllAsync<RawOccurrenceRow>(
    `SELECT fo.id, fo.festival_id, fo.date_key, fo.source, fo.verified,
            f.name_ta, f.name_en, f.description_ta, f.description_en,
            f.category, f.is_holiday
     FROM festival_occurrences fo
     JOIN festivals f ON f.id = fo.festival_id
     WHERE fo.date_key >= ? AND fo.date_key <= ?
     ORDER BY fo.date_key ASC
     LIMIT ?`,
    today,
    end,
    limit
  );
  return rows.map((r) => {
    const occ = mapRow(r);
    const { month, day } = parseDateKey(r.date_key);
    return {
      festivalId: occ.festivalId,
      dateKey: r.date_key,
      nameTa: occ.nameTa,
      nameEn: occ.nameEn,
      daysUntil: r.date_key === today ? 0 : diffKeys(today, r.date_key),
    };
  });
}

function diffKeys(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db_ = new Date(b + 'T00:00:00');
  return Math.round((db_.getTime() - da.getTime()) / 86400000);
}

export interface ObservanceRow {
  date_key: string;
  kind: string;
  name_ta: string;
  name_en: string;
}

/**
 * Engine-computed lunar observances for any Gregorian year (1900–2100).
 *
 * The bundled dataset only seeds observance rows for its coverage window
 * (see src/data/lunarPhases.ts, which shares the generator rules); this
 * overlay computes the same dates on demand for every other navigable year
 * so amavasai/pournami/pradosham/ekadasi markers never vanish.
 * Same algorithm as the seeder ⇒ values agree inside the dataset window and
 * the merge below de-duplicates, preferring DB rows.
 */
const OBSERVANCE_LABELS: Pick<ObservanceRow, 'kind' | 'name_ta' | 'name_en'>[] = [
  { kind: 'amavasai', name_ta: 'அமாவாசை', name_en: 'Amavasai' },
  { kind: 'pournami', name_ta: 'பௌர்ணமி', name_en: 'Pournami' },
  { kind: 'pradosham', name_ta: 'பிரதோஷம்', name_en: 'Pradosham' },
  { kind: 'ekadasi', name_ta: 'ஏகாதசி', name_en: 'Ekadasi' },
];

const computedYearCache = new Map<number, ObservanceRow[]>();

function computedObservancesForYear(year: number): ObservanceRow[] {
  if (year < NAVIGABLE_START_YEAR || year > NAVIGABLE_END_YEAR) return [];
  const cached = computedYearCache.get(year);
  if (cached) return cached;
  const rows: ObservanceRow[] = [];
  for (const rec of amPournaForRange(year, year)) {
    const label = OBSERVANCE_LABELS.find((l) => l.kind === rec.kind);
    if (!label) continue;
    rows.push({ date_key: rec.dateKey, ...label });
  }
  const bandKinds: { centers: number[]; kind: 'pradosham' | 'ekadasi' }[] = [
    { centers: PRADOSHAM_CENTERS, kind: 'pradosham' },
    { centers: EKADASI_CENTERS, kind: 'ekadasi' },
  ];
  for (const { centers, kind } of bandKinds) {
    const label = OBSERVANCE_LABELS.find((l) => l.kind === kind);
    if (!label) continue;
    for (const d of tithiBandDatesForRange(centers, year, year)) {
      rows.push({ date_key: d, ...label });
    }
  }
  rows.sort((a, b) => a.date_key.localeCompare(b.date_key));
  computedYearCache.set(year, rows);
  return rows;
}

/** DB rows are authoritative; computed rows only fill gaps (ordered by date). */
function mergeWithComputed(dbRows: ObservanceRow[], year: number): ObservanceRow[] {
  const seen = new Set(dbRows.map((r) => `${r.date_key}|${r.kind}`));
  const extras = computedObservancesForYear(year).filter(
    (r) => !seen.has(`${r.date_key}|${r.kind}`)
  );
  if (extras.length === 0) return dbRows;
  return [...dbRows, ...extras].sort((a, b) => a.date_key.localeCompare(b.date_key));
}

export async function getObservancesForDate(dateKey: string): Promise<ObservanceRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ObservanceRow>(
    `SELECT date_key, kind, name_ta, name_en FROM observances WHERE date_key = ?`,
    dateKey
  );
  // The year overlay computes the WHOLE year's rows; for an exact-date query
  // only rows matching dateKey may leave this function (bug fixed: previously
  // every date of the year leaked into single-day festival lists).
  const merged = mergeWithComputed(rows, parseDateKey(dateKey).year);
  return merged.filter((r) => r.date_key === dateKey);
}

export async function getObservancesForMonth(year: number, month: number): Promise<ObservanceRow[]> {
  const db = await getDatabase();
  const prefix = `${year}-${String(month).padStart(2, '0')}-%`;
  const rows = await db.getAllAsync<ObservanceRow>(
    `SELECT date_key, kind, name_ta, name_en FROM observances WHERE date_key LIKE ? ORDER BY date_key`,
    prefix
  );
  return mergeWithComputed(rows, year).filter(
    (r) => r.date_key.startsWith(prefix.slice(0, 8))
  );
}

export async function getObservancesForYear(year: number): Promise<ObservanceRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ObservanceRow>(
    `SELECT date_key, kind, name_ta, name_en FROM observances WHERE date_key LIKE ? ORDER BY date_key`,
    `${year}-%`
  );
  return mergeWithComputed(rows, year);
}
