import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Tiny haptics helpers so call sites stay one-liners and all failures are
 * swallowed silently (haptics are a garnish, never a blocker). Availability:
 * iOS & Android via expo-haptics; web returns without calling.
 */

/** Light tick for selection/navigation changes (day select, view toggle). */
export function selectionTick() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

/** Light impact for day navigation taps (prev/next day, jump to today). */
export function lightTap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success tick for completing an action (bookmark added, reminder added). */
export function successTick() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
