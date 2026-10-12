import type { SQLiteDatabase } from 'expo-sqlite';

/** Hook called after a fresh import completes — reserved for future
 * denormalizations (e.g. precomputing month day-festival maps). */
export function onDatabaseReady(_db: SQLiteDatabase): void {
  // intentionally empty
}
