/**
 * App startup: initialize the database (migrations + first-run dataset
 * import). Fully offline; no network calls.
 */
import { getDatabase } from '@/database/client';

export async function initializeAppData(): Promise<void> {
  await getDatabase();
}
