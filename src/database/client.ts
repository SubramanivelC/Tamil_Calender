/**
 * expo-sqlite database client. Uses the modern `openDatabaseSync` API.
 * In Jest (node environment) this module is mocked — see
 * src/database/__mocks__/expo-sqlite.ts.
 */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations/migrate';
import { importBundledDataset } from './seed/importer';
import { onDatabaseReady } from './init';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (or returns already-open) database with WAL + required PRAGMAs. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('thirunellai.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  const wasImported = await initialize(db);
  return db;
}

/**
 * Idempotent startup logic: run migrations, then seed if fresh install.
 * Returns true if the bundled dataset import ran this session.
 */
export async function initialize(db: SQLite.SQLiteDatabase): Promise<boolean> {
  await runMigrations(db);
  const seeded = await importBundledDataset(db);
  if (seeded) {
    onDatabaseReady(db);
  }
  return seeded;
}

/** For tests — close any open database handle. */
export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.closeAsync();
    dbPromise = null;
  }
}
