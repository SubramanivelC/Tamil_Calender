import React, { useState, useCallback } from 'react';
import { ScrollView, View, Pressable, TextInput, StyleSheet, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { addEvent } from '@/database/repositories/eventsRepo';
import { DEFAULT_REMINDER_HHMM } from '@/data/constants';
import { spacing } from '@/theme/spacing';
import type { EventKind } from '@/types';

const KINDS: { kind: EventKind; titleKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'birthday', titleKey: 'eventBirthday', icon: 'gift-outline' },
  { kind: 'anniversary', titleKey: 'eventAnniversary', icon: 'heart-outline' },
  { kind: 'custom', titleKey: 'eventCustom', icon: 'star-outline' },
];

export default function AddEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; kind?: string }>();
  const dateKey = typeof params.date === 'string' ? params.date : '';
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);

  const initialKind = KINDS.find((k) => k.kind === params.kind)?.kind ?? 'birthday';
  const [kind, setKind] = useState<EventKind>(initialKind);
  const [title, setTitle] = useState('');
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState<string>(DEFAULT_REMINDER_HHMM);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!dateKey) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <EmptyState
          icon="calendar-outline"
          title={t('dataUnavailableTitle')}
          message={t('dataUnavailableMessage')}
        />
      </SafeAreaView>
    );
  }

  const onSave = useCallback(async () => {
    if (title.trim().length === 0 || saving) return;
    setSaving(true);
    try {
      const id = await addEvent({
        title: title.trim(),
        kind,
        dateKey,
        repeatYearly,
        reminderTime: reminderOn ? reminderTime : null,
        note: note.trim() || null,
      });
      if (reminderOn) {
        // Reuse the reminder pipeline: schedule a notification bound to this
        // event, then store its notification id for later cancellation.
        try {
          const [{ scheduleReminder }] = await Promise.all([
            import('@/services/notificationService'),
          ]);
          const nid = await scheduleReminder({
            id: `evt-${id}`,
            dateKey: repeatYearly ? `${dateKey.slice(0, 4)}-${dateKey.slice(5)}` : dateKey,
            time: reminderTime,
            title: title.trim(),
            body: t('eventReminderBody'),
            repeat: repeatYearly ? 'yearly' : 'none',
            enabled: true,
            notificationId: null,
            createdAt: Date.now(),
          });
          if (nid) await (await import('@/database/repositories/eventsRepo')).setEventNotificationId(id, nid);
        } catch {
          // Notifications are best-effort; event is still saved.
        }
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }, [title, saving, kind, dateKey, repeatYearly, reminderOn, reminderTime, note, language, router, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <ThemedText variant="h4" weight="bold" style={{ flex: 1, textAlign: 'center' }}>
          {t('addEvent')}
        </ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
          {dateKey}
        </ThemedText>

        <ThemedText variant="small" weight="medium" style={{ marginBottom: 8 }}>
          {t('eventType')}
        </ThemedText>
        <View style={styles.kindRow}>
          {KINDS.map((k) => (
            <Pressable
              key={k.kind}
              onPress={() => setKind(k.kind)}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === k.kind }}
              style={[
                styles.kindBtn,
                {
                  backgroundColor: kind === k.kind ? colors.primaryMuted : colors.surface,
                  borderColor: kind === k.kind ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name={k.icon} size={20} color={kind === k.kind ? colors.primary : colors.textSecondary} />
              <ThemedText variant="small" weight={kind === k.kind ? 'medium' : 'regular'}>
                {t(k.titleKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText variant="small" weight="medium" style={{ marginTop: spacing.lg, marginBottom: 8 }}>
          {t('eventTitle')}
        </ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('eventTitlePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('eventTitle')}
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        />

        <View style={styles.switchRow}>
          <ThemedText variant="body" style={{ flex: 1 }}>
            {t('eventRepeatYearly')}
          </ThemedText>
          <Switch
            value={repeatYearly}
            onValueChange={setRepeatYearly}
            trackColor={{ true: colors.primary, false: colors.divider }}
            accessibilityLabel={t('eventRepeatYearly')}
          />
        </View>

        <View style={styles.switchRow}>
          <ThemedText variant="body" style={{ flex: 1 }}>
            {t('reminderTime')}
          </ThemedText>
          <Switch
            value={reminderOn}
            onValueChange={setReminderOn}
            trackColor={{ true: colors.primary, false: colors.divider }}
            accessibilityLabel={t('addReminder')}
          />
        </View>

        {reminderOn ? (
          <TextInput
            value={reminderTime}
            onChangeText={setReminderTime}
            placeholder="HH:mm"
            accessibilityLabel={t('reminderTime')}
            style={[styles.input, styles.timeInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          />
        ) : null}

        <ThemedText variant="small" weight="medium" style={{ marginTop: spacing.lg, marginBottom: 8 }}>
          {t('eventNote')}
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('notePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          accessibilityLabel={t('eventNote')}
          style={[styles.input, styles.noteInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        />

        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={t('saveEvent')}
          disabled={saving || title.trim().length === 0}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: colors.today,
              opacity: pressed || saving || title.trim().length === 0 ? 0.6 : 1,
            },
          ]}
        >
          <ThemedText variant="body" weight="medium" color="onMaroon">
            {t('saveEvent')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  kindRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kindBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  timeInput: {
    marginTop: 8,
    maxWidth: 120,
    alignSelf: 'flex-start',
  },
  noteInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginTop: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.xl,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
