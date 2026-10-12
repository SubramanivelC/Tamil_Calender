import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../client';
import type { Bookmark, Note, ReminderDefinition } from '@/types';

export async function addBookmark(dateKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO bookmarks (date_key, created_at) VALUES (?, ?)`,
    dateKey,
    Date.now()
  );
}

export async function toggleBookmark(dateKey: string, on: boolean): Promise<void> {
  if (on) return addBookmark(dateKey);
  return removeBookmark(dateKey);
}

export async function removeBookmark(dateKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM bookmarks WHERE date_key = ?`, dateKey);
}

export async function isBookmarked(dateKey: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT 1 FROM bookmarks WHERE date_key = ?`,
    dateKey
  );
  return !!row;
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDatabase();
  return db.getAllAsync<Bookmark>(`SELECT * FROM bookmarks ORDER BY created_at DESC`);
}

export async function saveNote(dateKey: string, text: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notes (date_key, text, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(date_key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
    dateKey,
    text,
    Date.now()
  );
}

export async function deleteNote(dateKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notes WHERE date_key = ?`, dateKey);
}

export async function getNote(dateKey: string): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Note>(
    `SELECT date_key, text, updated_at FROM notes WHERE date_key = ?`,
    dateKey
  );
  return row ?? null;
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDatabase();
  return db.getAllAsync<Note>(`SELECT * FROM notes ORDER BY updated_at DESC`);
}

export async function upsertReminder(r: ReminderDefinition): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reminders (id, date_key, time, title, body, repeat, enabled, notification_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET time = excluded.time, title = excluded.title,
       body = excluded.body, repeat = excluded.repeat, enabled = excluded.enabled,
       notification_id = excluded.notification_id`,
    r.id,
    r.dateKey,
    r.time,
    r.title,
    r.body,
    r.repeat,
    r.enabled ? 1 : 0,
    r.notificationId,
    r.createdAt
  );
}

export async function getRemindersForDate(dateKey: string): Promise<ReminderDefinition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<ReminderDefinition, 'enabled'> & { enabled: number }>(
    `SELECT * FROM reminders WHERE date_key = ? ORDER BY time`,
    dateKey
  );
  return rows.map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

export async function getAllReminders(): Promise<ReminderDefinition[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<ReminderDefinition, 'enabled'> & { enabled: number }>(
    `SELECT * FROM reminders ORDER BY date_key, time`
  );
  return rows.map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM reminders WHERE id = ?`, id);
}

export async function setReminderEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE reminders SET enabled = ? WHERE id = ?`, enabled ? 1 : 0, id);
}

export async function setReminderNotificationId(id: string, notificationId: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE reminders SET notification_id = ? WHERE id = ?`, notificationId, id);
}

export async function getDatasetMeta(
  key: string,
  providedDb?: SQLiteDatabase
): Promise<string | null> {
  const db = providedDb ?? (await getDatabase());
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM dataset_meta WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}
