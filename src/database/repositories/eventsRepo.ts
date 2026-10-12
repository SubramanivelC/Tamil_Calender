import { getDatabase } from '../client';
import type { UserEvent, EventKind } from '@/types';
import { localTodayKey, diffCalendarDays } from '@/utils/dates';

interface EventRow {
  id: number;
  title: string;
  kind: string;
  date_key: string;
  repeat_yearly: number;
  reminder_time: string | null;
  notification_id: string | null;
  note: string | null;
  created_at: number;
}

function mapRow(r: EventRow): UserEvent {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind as EventKind,
    dateKey: r.date_key,
    repeatYearly: r.repeat_yearly === 1,
    reminderTime: r.reminder_time,
    notificationId: r.notification_id,
    note: r.note,
    createdAt: r.created_at,
  };
}

export async function addEvent(input: {
  title: string;
  kind: EventKind;
  dateKey: string;
  repeatYearly: boolean;
  reminderTime: string | null;
  note?: string | null;
}): Promise<number> {
  const db = await getDatabase();
  const res = await db.runAsync(
    `INSERT INTO user_events (title, kind, date_key, repeat_yearly, reminder_time, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.kind,
    input.dateKey,
    input.repeatYearly ? 1 : 0,
    input.reminderTime,
    input.note ?? null,
    Date.now()
  );
  return Number(res.lastInsertRowId);
}

export async function setEventNotificationId(id: number, notificationId: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE user_events SET notification_id = ? WHERE id = ?`, notificationId, id);
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM user_events WHERE id = ?`, id);
}

export async function getEvent(id: number): Promise<UserEvent | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<EventRow>(
    `SELECT * FROM user_events WHERE id = ?`,
    id
  );
  return row ? mapRow(row) : null;
}

export async function getEventsForDate(dateKey: string): Promise<UserEvent[]> {
  const db = await getDatabase();
  const exact = await db.getAllAsync<EventRow>(
    `SELECT * FROM user_events WHERE date_key = ? ORDER BY created_at`,
    dateKey
  );
  // Yearly events resurface on the same month/day of any year. Match on the
  // MM-DD suffix in JS so the filter is engine-independent.
  const md = dateKey.slice(5);
  const yearlyRows = await db.getAllAsync<EventRow>(
    `SELECT * FROM user_events WHERE repeat_yearly = 1`
  );
  const yearly = yearlyRows.filter((r) => r.date_key.slice(5) === md);
  const byId = new Map<number, UserEvent>();
  for (const r of [...exact, ...yearly]) {
    if (!byId.has(r.id)) byId.set(r.id, mapRow(r));
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export interface YearlyEventKey {
  event: UserEvent;
  /** Expanded occurrence date keys within the queried range. */
  dateKeys: string[];
}

/**
 * All yearly-repeating events that land on any month/day inside
 * [startKey, endKey] — used for calendar range decoration.
 */
export async function getYearlyEventsInRange(
  startKey: string,
  endKey: string
): Promise<UserEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EventRow>(
    `SELECT * FROM user_events WHERE repeat_yearly = 1 AND substr(date_key, 6) >= ? AND substr(date_key, 6) <= ?`,
    startKey.slice(5),
    endKey.slice(5)
  );
  return rows.map(mapRow);
}

export async function getEventsInRange(startKey: string, endKey: string): Promise<UserEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EventRow>(
    `SELECT * FROM user_events WHERE date_key >= ? AND date_key <= ? ORDER BY date_key`,
    startKey,
    endKey
  );
  return rows.map(mapRow);
}

export interface UpcomingUserEvent {
  event: UserEvent;
  /** Days from today to the next occurrence of this event. */
  daysUntil: number;
  /** Concrete next occurrence date key. */
  occurrenceKey: string;
}

/** Next occurrence of each event, within ~365 days from today. */
export async function getUpcomingEvents(limit = 5): Promise<UpcomingUserEvent[]> {
  const todayKey = localTodayKey();
  const db = await getDatabase();
  const rows = await db.getAllAsync<EventRow>(`SELECT * FROM user_events`);
  const events = rows.map(mapRow);
  const upcoming: UpcomingUserEvent[] = [];
  for (const ev of events) {
    const occ = nextOccurrenceKey(ev, todayKey);
    if (!occ) continue;
    upcoming.push({ event: ev, occurrenceKey: occ, daysUntil: diffCalendarDays(occ, todayKey) });
  }
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming.slice(0, limit);
}

function nextOccurrenceKey(ev: UserEvent, todayKey: string): string | null {
  if (!ev.repeatYearly) {
    return ev.dateKey >= todayKey ? ev.dateKey : null;
  }
  const md = ev.dateKey.slice(5); // 'MM-DD'
  const thisYear = todayKey.slice(0, 4);
  const candidate = `${thisYear}-${md}`;
  if (candidate >= todayKey) return candidate;
  return `${Number(thisYear) + 1}-${md}`;
}

/** Exposed for tests. */
export const __testing = { nextOccurrenceKey };
