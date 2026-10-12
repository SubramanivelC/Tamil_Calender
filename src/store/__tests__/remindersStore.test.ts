jest.mock('@/services/notificationService', () => ({
  scheduleReminder: jest.fn().mockResolvedValue('notif-1'),
  cancelScheduledNotification: jest.fn().mockResolvedValue(undefined),
  ensureAndroidChannel: jest.fn().mockResolvedValue(undefined),
  getPermissionStatus: jest.fn().mockResolvedValue('granted'),
  requestPermission: jest.fn().mockResolvedValue(true),
  triggerDateFor: jest.fn(),
  listScheduledIds: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn().mockResolvedValue(undefined),
    execSync: jest.fn(),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    runSync: jest.fn(),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest
      .fn()
      .mockImplementation(async (fn: () => Promise<void>) => {
        await fn();
      }),
  })),
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn().mockResolvedValue(undefined),
    execSync: jest.fn(),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    runSync: jest.fn(),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest
      .fn()
      .mockImplementation(async (fn: () => Promise<void>) => {
        await fn();
      }),
  })),
}));

import { useRemindersStore } from '../remindersStore';
import { scheduleReminder, cancelScheduledNotification } from '@/services/notificationService';

describe('reminders store', () => {
  beforeEach(() => {
    useRemindersStore.setState({ byId: {}, order: [], loading: false });
    (scheduleReminder as jest.Mock).mockClear().mockResolvedValue('notif-1');
    (cancelScheduledNotification as jest.Mock).mockClear();
  });

  test('addReminder persists and schedules once', async () => {
    const def = await useRemindersStore.getState().addReminder({
      dateKey: '2026-04-14',
      time: '07:00',
      title: 'Puthandu',
      body: 'Tamil new year',
      repeat: 'none',
    });
    expect(def.enabled).toBe(true);
    expect(def.notificationId).toBe('notif-1');
    expect(scheduleReminder).toHaveBeenCalledTimes(1);
    const state = useRemindersStore.getState();
    expect(state.order).toContain(def.id);
    expect(state.remindersForDate('2026-04-14')).toHaveLength(1);
  });

  test('toggle off cancels existing notification', async () => {
    const def = await useRemindersStore.getState().addReminder({
      dateKey: '2026-04-14',
      time: '07:00',
      title: 'x',
      body: null,
      repeat: 'none',
    });
    await useRemindersStore.getState().toggleReminder(def.id, false);
    expect(cancelScheduledNotification).toHaveBeenCalledWith('notif-1');
    expect(useRemindersStore.getState().byId[def.id]?.enabled).toBe(false);
    expect(useRemindersStore.getState().byId[def.id]?.notificationId).toBeNull();
  });

  test('deleteReminder cancels notification first', async () => {
    const def = await useRemindersStore.getState().addReminder({
      dateKey: '2026-04-14',
      time: '07:00',
      title: 'x',
      body: null,
      repeat: 'none',
    });
    await useRemindersStore.getState().deleteReminder(def.id);
    expect(cancelScheduledNotification).toHaveBeenCalledWith('notif-1');
    expect(useRemindersStore.getState().order).not.toContain(def.id);
  });

  test('remindersForDate filters by date', async () => {
    await useRemindersStore.getState().addReminder({
      dateKey: '2026-04-14',
      time: '07:00',
      title: 'a',
      body: null,
      repeat: 'none',
    });
    await useRemindersStore.getState().addReminder({
      dateKey: '2026-05-01',
      time: '09:00',
      title: 'b',
      body: null,
      repeat: 'none',
    });
    expect(useRemindersStore.getState().remindersForDate('2026-04-14')).toHaveLength(1);
    expect(useRemindersStore.getState().remindersForDate('2026-05-01')).toHaveLength(1);
    expect(useRemindersStore.getState().remindersForDate('2026-06-01')).toHaveLength(0);
  });
});
