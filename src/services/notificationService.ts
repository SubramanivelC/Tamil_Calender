/**
 * Local notification service (expo-notifications). Works fully offline.
 * Duplicate prevention: callers always pass the definition's stored
 * notification id so cancel-then-schedule is idempotent.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderDefinition } from '@/types';
import { parseDateKey } from '@/utils/dates';
import { RASI_NAMES } from '@/data/rasiPalam';

/** Short rasi label for notification titles ('மேஷம் / Mesham'). */
const RASI_LABELS: string[] = RASI_NAMES.map((n) => n.replace(/ \(.*\)$/, ''));

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android channel (idempotent). */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'நினைவூட்டல்கள் / Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#762536',
    });
    await Notifications.setNotificationChannelAsync('rasi-palam', {
      name: 'ராசி பலம் / Rasi palam',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return 'granted';
  if (!settings.canAskAgain) return 'denied';
  return 'undetermined';
}

export async function requestPermission(): Promise<boolean> {
  const status = await getPermissionStatus();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Local 'HH:mm' + date -> trigger fire date (local seconds). null on bad input. */
export function triggerDateFor(
  dateKey: string,
  time: string,
  repeatYearly: boolean
): Notifications.DateTriggerInput | Notifications.CalendarTriggerInput | null {
  const { year, month, day } = parseDateKey(dateKey);
  const [hStr, mStr] = time.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (repeatYearly) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      channelId: 'reminders',
      repeats: true,
      hour,
      minute,
      // month is 1-based in CalendarTriggerInput
      month,
      day,
    };
  }
  const fire = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (fire.getTime() <= Date.now()) return null; // past reminders don't schedule
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    channelId: 'reminders',
    date: fire,
  };
}

/** Schedule local reminder and return notification id, or null if impossible. */
export async function scheduleReminder(definition: ReminderDefinition): Promise<string | null> {
  await ensureAndroidChannel();
  const trigger = triggerDateFor(definition.dateKey, definition.time, definition.repeat === 'yearly');
  if (!trigger) return null;
  const request: Notifications.NotificationRequestInput = {
    identifier: definition.id, // stable id => prevents duplicates on re-add
    content: {
      title: definition.title,
      body: definition.body ?? '',
      sound: 'default',
    },
    trigger,
  };
  const id = await Notifications.scheduleNotificationAsync(request);
  return id ?? null;
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function listScheduledIds(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((n) => n.identifier);
}

// ------------------------------------------------------------------------
// Daily rasi palam notification
// ------------------------------------------------------------------------

/** Stable identifier so re-scheduling is cancel-then-add (no duplicates). */
export const DAILY_PALAM_NOTIFICATION_ID = 'daily-rasi-palam';

/**
 * Repeating daily trigger at the chosen local morning time. The repeat
 * trigger shows static content ("today's palam is ready"), because
 * expo-notifications repeating triggers cannot per-day vary the body.
 */
function dailyPalamTrigger(time: string): Notifications.CalendarTriggerInput | null {
  const [hStr, mStr] = time.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    channelId: 'rasi-palam',
    repeats: true,
    hour: hour >= 0 && hour <= 23 ? hour : 7,
    minute: minute >= 0 && minute <= 59 ? minute : 0,
  };
}

/**
 * Schedule (or cancel per `enabled`) the daily rasi palam notification.
 * Idempotent: cancels the stable identifier first when one exists.
 * `rasiIndex` (0..11) personalizes the title with the user's moon sign.
 */
export async function scheduleDailyPalam(
  enabled: boolean,
  time: string,
  rasiIndex?: number | null
): Promise<boolean> {
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    if (existing.some((n) => n.identifier === DAILY_PALAM_NOTIFICATION_ID)) {
      await Notifications.cancelScheduledNotificationAsync(DAILY_PALAM_NOTIFICATION_ID);
    }
    if (!enabled) return true;
    await ensureAndroidChannel();
    const trigger = dailyPalamTrigger(time);
    if (!trigger) return false;
    const cleanIndex = typeof rasiIndex === 'number' && rasiIndex >= 0 && rasiIndex <= 11 ? rasiIndex : null;
    const rasiName = cleanIndex !== null ? RASI_LABELS[cleanIndex] ?? '' : '';
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_PALAM_NOTIFICATION_ID,
      content: {
        title: rasiName
          ? `ராசி பலம் — ${rasiName} / Rasi palam — ${rasiName}`
          : 'ராசி பலம் / Rasi palam',
        body: 'இன்றைய சந்திரகோச்சாரப் பலன் தயார் — திறந்து பாருங்கள் / Today\'s daily palam is ready — open the app.',
        sound: 'default',
      },
      trigger,
    });
    return true;
  } catch {
    return false;
  }
}
