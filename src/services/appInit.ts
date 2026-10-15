/**
 * App startup: initialize the database (migrations + first-run dataset
 * import). Fully offline; no network calls. Also re-applies the daily
 * rasi palam schedule (OS can drop scheduled notifications on update/
 * reinstall; cancel-then-schedule is idempotent).
 */
import { getDatabase } from '@/database/client';
import { useSettingsStore } from '@/store/settingsStore';
import { scheduleDailyPalam } from '@/services/notificationService';

export async function initializeAppData(): Promise<void> {
  await getDatabase();
  const s = useSettingsStore.getState();
  await scheduleDailyPalam(s.dailyPalamEnabled, s.dailyPalamTime, s.rasiPalamRasi);
}
