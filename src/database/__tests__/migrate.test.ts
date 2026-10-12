/**
 * Database integration tests using a real in-memory expo-sqlite database via
 * the expo-sqlite jest shim (dev-mode SQLite adapter runs as in-memory even
 * under jest-expo when native development build is skipped).
 */
import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../migrations/migrate';
import { importBundledDataset } from '../seed/importer';
import { DATASET_VERSION } from '@/data/seedData';

function makeDb() {
  const db = openDatabaseSync('thirunellai-test.db');
  db.execSync(`PRAGMA foreign_keys = ON;`);
  return db;
}

describe('schema migrations', () => {
  it('creates all core tables', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    const tables = ((await db.getAllAsync!(
      `SELECT name FROM sqlite_master WHERE type = 'table'`
    )) as { name: string }[]).map((t) => t.name);
    for (const table of [
      'panchangam_records',
      'tamil_dates',
      'festivals',
      'festival_occurrences',
      'observances',
      'bookmarks',
      'notes',
      'reminders',
      'dataset_meta',
      'search_index',
      'user_events',
    ]) {
      expect(tables).toContain(table);
    }
  });

  it('stamps schema_version and is idempotent', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    await runMigrations(db as never); // second run must not throw
    const row = (await db.getFirstAsync!(
      `SELECT value FROM app_meta WHERE key = 'schema_version'`
    )) as { value: string };
    expect(parseInt(row.value, 10)).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('bundled dataset import', () => {
  it('imports once, then skips', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    const ran1 = await importBundledDataset(db as never);
    expect(ran1).toBe(true);
    const ran2 = await importBundledDataset(db as never);
    expect(ran2).toBe(false);
    const version = (await db.getFirstAsync!(
      `SELECT value FROM dataset_meta WHERE key = 'version'`
    )) as { value: string };
    expect(version.value).toBe(DATASET_VERSION);
  });

  it('imports festivals with sources, no fabricated rows', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    await importBundledDataset(db as never);
    const count = (await db.getFirstAsync!(
      `SELECT COUNT(*) as c FROM festivals`
    )) as { c: number };
    expect(count.c).toBeGreaterThan(5);
    const withoutSource = (await db.getFirstAsync!(
      `SELECT COUNT(*) as c FROM festival_occurrences WHERE source IS NULL OR source = ''`
    )) as { c: number };
    expect(withoutSource.c).toBe(0);
  });

  it('imports amavasai/pournami/pradosham/ekadasi observances', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    await importBundledDataset(db as never);
    const kinds = (await db.getAllAsync!(
      `SELECT kind, COUNT(*) as c FROM observances GROUP BY kind`
    )) as { kind: string; c: number }[];
    const byKind = Object.fromEntries(kinds.map((k) => [k.kind, k.c]));
    expect(byKind['amavasai']).toBeGreaterThan(10);
    expect(byKind['pournami']).toBeGreaterThan(10);
    expect(byKind['pradosham']).toBeGreaterThan(10);
    expect(byKind['ekadasi']).toBeGreaterThan(10);
  });

  it('populates the search index from festivals', async () => {
    const db = makeDb();
    await runMigrations(db as never);
    await importBundledDataset(db as never);
    const pongal = (await db.getFirstAsync!(
      `SELECT title FROM search_index WHERE search_text LIKE '%pongal%'`
    )) as { title: string } | null;
    expect(pongal).toBeTruthy();
    expect(pongal?.title).toContain('பொங்கல்');
  });
});
