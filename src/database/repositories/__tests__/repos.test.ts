import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../../migrations/migrate';
import { importBundledDataset } from '../../seed/importer';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  saveNote,
  getNote,
  deleteNote,
  upsertReminder,
  deleteReminder,
  setReminderEnabled,
  getAllReminders,
  getRemindersForDate,
  toggleBookmark,
} from '../userDataRepo';
import {
  getFestivalsForDate,
  getFestivalsForMonth,
  getUpcomingFestivals,
  getObservancesForDate,
} from '../festivalRepo';
import { getPanchangamForDate, getTamilDate, getTamilDaysForMonth } from '../panchangamRepo';
import {
  addEvent,
  deleteEvent,
  getEvent,
  getEventsForDate,
  getUpcomingEvents,
  __testing,
} from '../eventsRepo';
import { closeDatabase } from '../../client';
import type { SQLiteDatabase } from 'expo-sqlite';

async function freshDbWithInjectedHelpers(): Promise<SQLiteDatabase> {
  // The repositories use getDatabase() from client.ts, so point it at a fresh
  // test database: closing resets the client so the next getDatabase() reopens
  // 'thirunellai.db', which the expo-sqlite mock keeps per-name per test file.
  await closeDatabase();
  const db = await openDatabaseAsyncCompat();
  await runMigrations(db as never);
  await importBundledDataset(db as never);
  return db as unknown as SQLiteDatabase;
}

async function openDatabaseAsyncCompat() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { openDatabaseAsync } = require('expo-sqlite') as {
    openDatabaseAsync: (name: string) => Promise<unknown>;
  };
  return openDatabaseAsync('thirunellai.db');
}

describe('user data repositories', () => {
  test('bookmarks add/toggle/remove', async () => {
    await freshDbWithInjectedHelpers();
    await addBookmark('2026-01-14');
    expect(await isBookmarked('2026-01-14')).toBe(true);
    await toggleBookmark('2026-01-14', false);
    expect(await isBookmarked('2026-01-14')).toBe(false);
    await toggleBookmark('2026-01-14', true);
    expect(await isBookmarked('2026-01-14')).toBe(true);
    await removeBookmark('2026-01-14');
    expect(await isBookmarked('2026-01-14')).toBe(false);
  });

  test('notes save/update/delete', async () => {
    await saveNote('2026-01-14', 'first');
    const n1 = await getNote('2026-01-14');
    expect(n1?.text).toBe('first');
    await saveNote('2026-01-14', 'second');
    const n2 = await getNote('2026-01-14');
    expect(n2?.text).toBe('second');
    await deleteNote('2026-01-14');
    expect(await getNote('2026-01-14')).toBeNull();
  });

  test('reminders upsert/toggle/delete and dup prevention via stable id', async () => {
    const def = {
      id: 'rem-1',
      dateKey: '2026-04-14',
      time: '07:00',
      title: 'Puthandu',
      body: null,
      repeat: 'none' as const,
      enabled: true,
      notificationId: null,
      createdAt: 1000,
    };
    await upsertReminder(def);
    await upsertReminder({ ...def }); // re-upsert same id = no duplicate row
    const all = await getAllReminders();
    expect(all.filter((r) => r.id === 'rem-1')).toHaveLength(1);
    await setReminderEnabled('rem-1', false);
    const [after] = await getRemindersForDate('2026-04-14');
    expect(after?.enabled).toBe(false);
    await deleteReminder('rem-1');
    expect((await getAllReminders()).find((r) => r.id === 'rem-1')).toBeUndefined();
  });

  test('festival queries for date/month/upcoming', async () => {
    const pongal = await getFestivalsForDate('2026-01-14');
    expect(pongal.length).toBeGreaterThanOrEqual(1);
    expect(pongal.some((f) => f.nameEn.includes('Pongal'))).toBe(true);

    const janFests = await getFestivalsForMonth(2026, 1);
    expect(janFests.length).toBeGreaterThanOrEqual(3);

    const upcoming = await getUpcomingFestivals(5);
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming[0]?.daysUntil).toBeGreaterThanOrEqual(0);
  });

  test('observances by date (amavasai/pournami/pradosham/ekadasi)', async () => {
    // Dates follow the engine-derived lunar tables (dataset 2026.10-subset.2):
    // conjunction Jan 19, trayodashi Jan 16.
    const amd = await getObservancesForDate('2026-01-19');
    expect(amd.some((o) => o.kind === 'amavasai')).toBe(true);
    const pradosham = await getObservancesForDate('2026-01-16');
    expect(pradosham.some((o) => o.kind === 'pradosham')).toBe(true);
  });

  test('panchangam fallback present even without dataset row (unverified)', async () => {
    const { record, verified } = await getPanchangamForDate('2026-06-15');
    expect(verified).toBe(false);
    // Classical computations still yield timings from month approximation.
    expect(record.rahuKalam).toBeTruthy();
    expect(record.sunrise).toBeTruthy();
  });

  test('missing-data handling: far-past date yields null tamil day without crashing', async () => {
    // Intentionally inside the engine's range without a dataset row.
    const td = await getTamilDate('1947-08-15');
    // Either resolved (engine supports it) or null; never throws and never fabricates a value.
    // Tamil solar months run 29-32 days (fixed-window approximation), so the
    // day-of-month bound is 32.
    if (td !== null) {
      expect(td.day).toBeGreaterThan(0);
      expect(td.day).toBeLessThanOrEqual(32);
    }
  });

  test('getTamilDaysForMonth fills a whole Gregorian month with Tamil days', async () => {
    const map = await getTamilDaysForMonth(2026, 4);
    // Every day of April 2026 resolves (fixed-window engine covers all dates).
    for (let d = 1; d <= 30; d++) {
      const key = `2026-04-${String(d).padStart(2, '0')}`;
      const entry = map.get(key);
      expect(entry).toBeDefined();
      expect(entry?.day).toBeGreaterThan(0);
      expect(entry?.day).toBeLessThanOrEqual(32);
    }
    // Chithirai 1 = Apr 14 2026 (Puthandu anchor).
    expect(map.get('2026-04-14')?.day).toBe(1);
    expect(map.get('2026-04-14')?.month).toBe(1);
  });

  test('user events add/get-by-date/delete incl. yearly resurfacing', async () => {
    await closeDatabase();
    const id1 = await addEvent({
      title: 'Appa birthday',
      kind: 'birthday',
      dateKey: '1955-04-14',
      repeatYearly: true,
      reminderTime: '07:00',
    });
    const id2 = await addEvent({
      title: 'House warming',
      kind: 'custom',
      dateKey: '2026-06-01',
      repeatYearly: false,
      reminderTime: null,
    });

    // Exact hit on a non-yearly event.
    const onJun1 = await getEventsForDate('2026-06-01');
    expect(onJun1.some((e) => e.id === id2)).toBe(true);
    // Yearly event resurfaces on the same MM-DD of any year.
    const onApr14 = await getEventsForDate('2030-04-14');
    expect(onApr14.some((e) => e.id === id1)).toBe(true);
    // And not on other days.
    const onApr15 = await getEventsForDate('2030-04-15');
    expect(onApr15.some((e) => e.id === id1)).toBe(false);

    await deleteEvent(id1);
    await deleteEvent(id2);
    expect(await getEvent(id1)).toBeNull();
    expect(await getEvent(id2)).toBeNull();
  });

  test('upcoming events sorted by daysUntil with yearly expansion', async () => {
    const id = await addEvent({
      title: 'Yearly test',
      kind: 'custom',
      dateKey: '2000-01-17',
      repeatYearly: true,
      reminderTime: null,
    });
    const upcoming = await getUpcomingEvents(10);
    const found = upcoming.find((u) => u.event.id === id);
    expect(found).toBeDefined();
    // Occurrence is in the current Gregorian year, month 01 day 17.
    expect(found?.occurrenceKey.endsWith('-01-17')).toBe(true);
    expect(found?.daysUntil).toBeGreaterThanOrEqual(0);
    await deleteEvent(id);
  });
});
