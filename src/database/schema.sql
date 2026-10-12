-- Thirunellai Tamil Calendar - SQLite schema (version 1)
-- All user data lives alongside verified calendar data in one database.

CREATE TABLE IF NOT EXISTS panchangam_records (
  date_key TEXT PRIMARY KEY NOT NULL,   -- 'YYYY-MM-DD'
  tithi TEXT,
  nakshatra TEXT,
  yoga TEXT,
  karana TEXT,
  paksha TEXT,
  sunrise TEXT,                          -- 'HH:mm'
  sunset TEXT,
  moonrise TEXT,
  moonset TEXT,
  rahu_kalam TEXT,
  yamagandam TEXT,
  kuligai TEXT,
  nalla_neram TEXT,
  verified INTEGER NOT NULL DEFAULT 0,   -- 1 = dataset row; 0 = computed approx
  source TEXT
);

CREATE TABLE IF NOT EXISTS tamil_dates (
  date_key TEXT PRIMARY KEY NOT NULL,
  tamil_day INTEGER,
  tamil_month INTEGER,                  -- 1..12 Chithirai..Panguni
  tamil_year_index INTEGER,             -- 0..59 cycle index
  paksha TEXT
);

CREATE TABLE IF NOT EXISTS festivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ta TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL,               -- tamil|hindu|national|tamilnadu|observance
  is_holiday INTEGER NOT NULL DEFAULT 0,
  description_ta TEXT,
  description_en TEXT
);

CREATE TABLE IF NOT EXISTS festival_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  source TEXT,
  verified INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_focc_date ON festival_occurrences (date_key);
CREATE INDEX IF NOT EXISTS idx_focc_festival ON festival_occurrences (festival_id);

CREATE TABLE IF NOT EXISTS observances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_key TEXT NOT NULL,
  kind TEXT NOT NULL,                   -- amavasai|pournami|pradosham|ekadasi
  name_ta TEXT NOT NULL,
  name_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obs_date ON observances (date_key);

CREATE TABLE IF NOT EXISTS bookmarks (
  date_key TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  date_key TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  date_key TEXT NOT NULL,
  time TEXT NOT NULL,                   -- 'HH:mm'
  title TEXT NOT NULL,
  body TEXT,
  repeat TEXT NOT NULL,                 -- 'none'|'yearly'
  enabled INTEGER NOT NULL DEFAULT 1,
  notification_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rem_date ON reminders (date_key);

CREATE TABLE IF NOT EXISTS dataset_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Tamil month text search (Tamil + English), refreshed during import.
CREATE TABLE IF NOT EXISTS search_index (
  kind TEXT NOT NULL,                   -- festival|observance|note|tamil_month|tamil_date
  ref_key TEXT NOT NULL,                -- date_key or entity id
  title TEXT NOT NULL,
  subtitle TEXT,
  search_text TEXT NOT NULL             -- normalized haystack (ta + en)
);
CREATE INDEX IF NOT EXISTS idx_search_text ON search_index (search_text);
CREATE INDEX IF NOT EXISTS idx_search_kind ON search_index (kind);
