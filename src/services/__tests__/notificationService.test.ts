import { triggerDateFor, scheduleReminder } from '../notificationService';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  schedulableTriggerInputTypes: jest.requireActual('expo-notifications').SchedulableTriggerInputTypes ?? {},
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-1'),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  AndroidImportance: { HIGH: 5 },
}));

describe('reminder trigger computation', () => {
  test('one-shot reminder in the future returns a date trigger', () => {
    // Far-future date so this test is stable regardless of "now".
    const trig = triggerDateFor('2049-04-14', '07:00', false);
    if (trig === null) {
      // If engine compares to now with different semantics, ensure null only for past dates.
      throw new Error('future trigger should not be null');
    }
    expect((trig as { type?: string }).type).toBe('date');
  });

  test('one-shot reminder in the past returns null (no fabricated firing)', () => {
    const past = new Date();
    const y = past.getFullYear() - 2;
    const key = `${y}-04-14`;
    const trig = triggerDateFor(key, '07:00', false);
    expect(trig).toBeNull();
  });

  test('yearly reminder returns repeating calendar trigger', () => {
    const trig = triggerDateFor('2026-04-14', '07:00', true) as {
      month?: number;
      day?: number;
      repeats?: boolean;
    } | null;
    expect(trig).not.toBeNull();
    expect(trig?.month).toBe(4);
    expect(trig?.day).toBe(14);
    expect(trig?.repeats).toBe(true);
  });

  test('invalid time yields null', () => {
    expect(triggerDateFor('2026-04-14', 'noon', false)).toBeNull();
  });
});

describe('schedule / cancel', () => {
  test('scheduleReminder returns id and requests stable identifier', async () => {
    const id = await scheduleReminder({
      id: 'rem-stable',
      dateKey: '2049-04-14',
      time: '07:00',
      title: 'Puthandu',
      body: null,
      repeat: 'none',
      enabled: true,
      notificationId: null,
      createdAt: 0,
    });
    expect(id).toBe('notif-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'rem-stable' })
    );
  });
});
