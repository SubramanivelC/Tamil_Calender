import { create } from 'zustand';
import type { ReminderDefinition } from '@/types';
import * as remindersRepo from '@/database/repositories/userDataRepo';
import { scheduleReminder, cancelScheduledNotification } from '@/services/notificationService';

interface RemindersState {
  byId: Record<string, ReminderDefinition>;
  order: string[];
  loading: boolean;

  loadAll: () => Promise<void>;
  addReminder: (
    input: Pick<ReminderDefinition, 'dateKey' | 'time' | 'title' | 'body' | 'repeat'>
  ) => Promise<ReminderDefinition>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  remindersForDate: (dateKey: string) => ReminderDefinition[];
}

export const useRemindersStore = create<RemindersState>((set, get) => ({
  byId: {},
  order: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    try {
      const all = await remindersRepo.getAllReminders();
      const byId: Record<string, ReminderDefinition> = {};
      for (const r of all) byId[r.id] = r;
      set({ byId, order: all.map((r) => r.id), loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  addReminder: async (input) => {
    const id = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const definition: ReminderDefinition = {
      id,
      ...input,
      enabled: true,
      notificationId: null,
      createdAt: Date.now(),
    };
    await remindersRepo.upsertReminder(definition);
    const notificationId = await scheduleReminder(definition);
    if (notificationId) {
      definition.notificationId = notificationId;
      await remindersRepo.setReminderNotificationId(id, notificationId);
    }
    set((s) => ({
      byId: { ...s.byId, [id]: definition },
      order: [...s.order, id],
    }));
    return definition;
  },

  toggleReminder: async (id, enabled) => {
    const existing = get().byId[id];
    if (!existing) return;
    await remindersRepo.setReminderEnabled(id, enabled);
    if (!enabled && existing.notificationId) {
      await cancelScheduledNotification(existing.notificationId);
    }
    const notificationId = enabled
      ? await scheduleReminder({ ...existing, enabled: true })
      : null;
    if (notificationId) {
      await remindersRepo.setReminderNotificationId(id, notificationId);
    }
    set((s) => {
      const prev = s.byId[id];
      const byId: Record<string, ReminderDefinition> = { ...s.byId };
      if (prev) byId[id] = { ...prev, enabled, notificationId };
      return { byId };
    });
  },

  deleteReminder: async (id) => {
    const existing = get().byId[id];
    if (existing?.notificationId) {
      await cancelScheduledNotification(existing.notificationId);
    }
    await remindersRepo.deleteReminder(id);
    set((s) => {
      const byId = { ...s.byId };
      delete byId[id];
      return { byId, order: s.order.filter((x) => x !== id) };
    });
  },

  remindersForDate: (dateKey) => {
    const s = get();
    return s.order
      .map((id) => s.byId[id])
      .filter((r): r is ReminderDefinition => !!r && r.dateKey === dateKey);
  },
}));
