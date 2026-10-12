import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS panchangam_records (
  date_key TEXT PRIMARY KEY NOT NULL,
  tithi TEXT, nakshatra TEXT, yoga TEXT, karana TEXT, paksha TEXT,
  sunrise TEXT, sunset TEXT, moonrise TEXT, moonset TEXT,
  rahu_kalam TEXT, yamagandam TEXT, kuligai TEXT, nalla_neram TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  source TEXT
);
CREATE TABLE IF NOT EXISTS tamil_dates (
  date_key TEXT PRIMARY KEY NOT NULL,
  tamil_day INTEGER, tamil_month INTEGER, tamil_year_index INTEGER, paksha TEXT
);
CREATE TABLE IF NOT EXISTS festivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ta TEXT NOT NULL, name_en TEXT NOT NULL,
  category TEXT NOT NULL, is_holiday INTEGER NOT NULL DEFAULT 0,
  description_ta TEXT, description_en TEXT
);
CREATE TABLE IF NOT EXISTS festival_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL, source TEXT, verified INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_focc_date ON festival_occurrences (date_key);
CREATE INDEX IF NOT EXISTS idx_focc_festival ON festival_occurrences (festival_id);
CREATE TABLE IF NOT EXISTS observances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_key TEXT NOT NULL, kind TEXT NOT NULL, name_ta TEXT NOT NULL, name_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obs_date ON observances (date_key);
CREATE TABLE IF NOT EXISTS bookmarks (
  date_key TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  date_key TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL, date_key TEXT NOT NULL, time TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT, repeat TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, notification_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rem_date ON reminders (date_key);
CREATE TABLE IF NOT EXISTS dataset_meta (
  key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS search_index (
  kind TEXT NOT NULL, ref_key TEXT NOT NULL, title TEXT NOT NULL,
  subtitle TEXT, search_text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_text ON search_index (search_text);
CREATE INDEX IF NOT EXISTS idx_search_kind ON search_index (kind);
`;

const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS user_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  date_key TEXT NOT NULL,
  repeat_yearly INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,
  notification_id TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON user_events (date_key);
`;

export const CURRENT_SCHEMA_VERSION = 2;

const migrations: Record<number, (db: SQLiteDatabase) => Promise<void>> = {
  1: async (db) => {
    await db.execAsync(SCHEMA_V1);
  },
  2: async (db) => {
    await db.execAsync(SCHEMA_V2);
  },
};

/** Runs all pending migrations inside one transaction per step. */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`);
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'schema_version'`
  );
  let current = row ? parseInt(row.value, 10) : 0;

  while (current < CURRENT_SCHEMA_VERSION) {
    const next = current + 1;
    const migrate = migrations[next];
    if (!migrate) throw new Error(`No migration registered for schema v${next}`);
    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.runAsync(
        `INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(next)
      );
    });
    current = next;
  }
}
