/**
 * Imports the bundled seed dataset into SQLite exactly once, inside a single
 * transaction. Skips when `dataset_meta.version` already matches.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  AM_POURNA_RECORDS,
  DATASET_VERSION,
  SEED_FESTIVALS,
  PRADOSHAM_DATES,
  EKADASI_DATES,
  approxSunriseSunset,
} from '@/data/seedData';
import { computeInauspiciousTimings } from '@/services/panchangamService';
import { dateKeyToDate, weekdayOf } from '@/utils/dates';

export async function importBundledDataset(db: SQLiteDatabase): Promise<boolean> {
  const existing = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM dataset_meta WHERE key = 'version'`
  );
  if (existing?.value === DATASET_VERSION) return false;

  const filenames = ['seed', 'import']; // logical batch tags

  await db.withTransactionAsync(async () => {
    await importTemplates(db);
    await importFestivals(db);
    await importObservances(db);
    await buildSearchIndex(db);
    await db.runAsync(
      `INSERT INTO dataset_meta (key, value) VALUES ('version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      DATASET_VERSION
    );
  });
  return true;
}

async function importTemplates(db: SQLiteDatabase): Promise<void> {
  // Amavasai/Pournami verified rows -> observances + approximate panchangam
  for (const rec of AM_POURNA_RECORDS) {
    const { year, month } = parse(rec.dateKey);
    const sun = approxSunriseSunset(month);
    const weekday = weekdayOf(rec.dateKey);
    const inauspicious = computeInauspiciousTimings(weekday, sun ?? { sunrise: null, sunset: null });
    await db.runAsync(
      `INSERT OR REPLACE INTO observances (date_key, kind, name_ta, name_en)
       VALUES (?, ?, ?, ?)`,
      rec.dateKey,
      rec.kind,
      rec.kind === 'amavasai' ? 'அமாவாசை' : 'பௌர்ணமி',
      rec.kind === 'amavasai' ? 'Amavasai' : 'Pournami'
    );
  }
}

async function importFestivals(db: SQLiteDatabase): Promise<void> {
  for (const f of SEED_FESTIVALS) {
    const res = await db.runAsync(
      `INSERT INTO festivals (name_ta, name_en, category, is_holiday, description_ta, description_en)
       VALUES (?, ?, ?, ?, NULL, NULL)`,
      f.nameTa,
      f.nameEn,
      f.category,
      f.isHoliday ? 1 : 0
    );
    await db.runAsync(
      `INSERT INTO festival_occurrences (festival_id, date_key, source, verified) VALUES (?, ?, ?, 1)`,
      res.lastInsertRowId,
      f.dateKey,
      f.source
    );
  }
}

async function importObservances(db: SQLiteDatabase): Promise<void> {
  const pradoshamTa = 'பிரதோஷம்';
  const ekadasiTa = 'ஏகாதசி';
  for (const d of PRADOSHAM_DATES) {
    await db.runAsync(
      `INSERT OR REPLACE INTO observances (date_key, kind, name_ta, name_en) VALUES (?, 'pradosham', ?, 'Pradosham')`,
      d,
      pradoshamTa
    );
  }
  for (const d of EKADASI_DATES) {
    await db.runAsync(
      `INSERT OR REPLACE INTO observances (date_key, kind, name_ta, name_en) VALUES (?, 'ekadasi', ?, 'Ekadasi')`,
      d,
      ekadasiTa
    );
  }
}

/** Populate app-searchable rows: festivals + tamil month names + notes. */
async function buildSearchIndex(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM search_index`);
  const festivals = await db.getAllAsync<{
    id: number;
    name_ta: string;
    name_en: string;
    category: string;
  }>(`SELECT id, name_ta, name_en, category FROM festivals`);
  for (const f of festivals) {
    await db.runAsync(
      `INSERT INTO search_index (kind, ref_key, title, subtitle, search_text)
       VALUES ('festival', ?, ?, ?, ?)`,
      String(f.id),
      f.name_ta,
      f.name_en,
      normalize(`${f.name_ta} ${f.name_en} ${f.category}`)
    );
  }
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parse(dateKey: string): { year: number; month: number } {
  const [y, m] = dateKey.split('-').map(Number);
  return { year: y as number, month: m as number };
}
