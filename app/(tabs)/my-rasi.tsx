import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView, Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { SettingsOptionRow, SettingsToggleRow } from '@/components/SettingsRow';
import { TimeRow } from '@/components/TimeRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { cleanBilingualValue } from '@/utils/bilingual';
import { useSettingsStore } from '@/store/settingsStore';
import {
  requestPermission,
  scheduleDailyPalam,
} from '@/services/notificationService';
import { localTodayKey, parseDateKey } from '@/utils/dates';
import {
  RASI_NAMES,
  computeDailyPalamForAllRasis,
  julianDayAtSunrise,
  janmaRasiFromBirth,
  type DailyPalam,
} from '@/data/rasiPalam';
import { getPanchangamForDate } from '@/database/repositories/panchangamRepo';
import { spacing } from '@/theme/spacing';

const NOTIF_TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '09:00'];

const MIN_BIRTH_DATE = new Date(1900, 0, 1);
/** Sensible picker seed when nothing is chosen yet (IST 06:00, matching the hint). */
const BIRTH_SEED = new Date(1990, 5, 21, 6, 0);

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function MyRasiScreen() {
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const settings = useSettingsStore();

  const [notified, setNotified] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [birth, setBirth] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<null | 'date' | 'time'>(null);
  const [foundRasi, setFoundRasi] = useState<number | null>(null);
  const [allPalam, setAllPalam] = useState<DailyPalam[] | null>(null);
  const [dateKey, setDateKey] = useState(localTodayKey());

  // Midnight (or focus) refresh of "today".
  useEffect(() => {
    const tick = () => setDateKey(localTodayKey());
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const s = await Notifications.getPermissionsAsync();
        setNotified(s.granted ? 'granted' : s.canAskAgain ? 'undetermined' : 'denied');
      } catch {
        setNotified('undetermined');
      }
    })();
  }, []);

  // Today's palam for all 12 rasis, evaluated at the day's sunrise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { year, month, day } = parseDateKey(dateKey);
      let sunrise: string | null = null;
      try {
        const { record } = await getPanchangamForDate(dateKey);
        sunrise = record.sunrise;
      } catch {
        // julianDayAtSunrise falls back to 06:00 IST
      }
      const dayOfYear =
        Math.round((new Date(year, month - 1, day).getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;
      const rows = computeDailyPalamForAllRasis(
        julianDayAtSunrise(year, month, day, sunrise),
        dayOfYear
      );
      if (!cancelled) setAllPalam(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const onPickerChange = useCallback(
    (_event: unknown, value?: Date) => {
      if (!value) return;
      setBirth((prev) => {
        const d = prev ? new Date(prev) : new Date(BIRTH_SEED);
        if (pickerMode === 'time') {
          d.setHours(value.getHours(), value.getMinutes(), 0, 0);
        } else if (pickerMode === 'date') {
          d.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
        }
        return d;
      });
      if (Platform.OS === 'android') setPickerMode(null); // Android dialog closes itself
    },
    [pickerMode]
  );

  const onFindRasi = useCallback(() => {
    if (!birth) {
      setFoundRasi(null);
      return;
    }
    setFoundRasi(
      janmaRasiFromBirth(
        birth.getFullYear(),
        birth.getMonth() + 1,
        birth.getDate(),
        `${pad2(birth.getHours())}:${pad2(birth.getMinutes())}`
      )
    );
  }, [birth]);

  const birthText = birth
    ? `${birth.getFullYear()}-${pad2(birth.getMonth() + 1)}-${pad2(birth.getDate())}`
    : null;
  const birthTimeText = birth ? `${pad2(birth.getHours())}:${pad2(birth.getMinutes())}` : null;
  const pickerValue = birth ?? new Date(BIRTH_SEED);

  const applyDailyPalamSettings = useCallback(
    async (enabled: boolean, time: string) => {
      if (enabled) {
        const granted = await requestPermission();
        if (!granted) {
          const status = await Notifications.getPermissionsAsync();
          setNotified(status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied');
          return;
        }
      }
      settings.setDailyPalamEnabled(enabled);
      settings.setDailyPalamTime(time);
      await scheduleDailyPalam(enabled, time, settings.rasiPalamRasi);
    },
    [settings]
  );

  const selectedRasi = settings.rasiPalamRasi;
  const mine = allPalam ? (selectedRasi !== null ? allPalam[selectedRasi] ?? null : null) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <ThemedText variant="h2" weight="bold" style={{ marginBottom: spacing.lg }}>
          {t('tabMyRasi')}
        </ThemedText>

        {/* Selection: rasi chips or birth-based janma rasi finder */}
        <SectionHeader title={t('selectRasiPalam')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsOptionRow<number>
            label={t('selectYourRasi')}
            options={RASI_NAMES.map((n, i) => ({ value: i, label: cleanBilingualValue(n, language) }))}
            value={selectedRasi ?? -1}
            onChange={settings.setRasi}
          />

          <ThemedText variant="body" color="secondary" style={styles.birthHeading}>
            {t('findByBirth')}
          </ThemedText>
          <View style={styles.birthRow}>
            <Pressable
              onPress={() => setPickerMode('date')}
              accessibilityRole="button"
              accessibilityLabel={t('birthDate')}
              style={({ pressed }) => [
                styles.pickerField,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <ThemedText variant="caption" color="secondary">
                {t('birthDate')}
              </ThemedText>
              <ThemedText variant="body" color={birthText ? 'default' : 'secondary'}>
                {birthText ?? t('pickDate')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setPickerMode('time')}
              accessibilityRole="button"
              accessibilityLabel={t('birthTime')}
              style={({ pressed }) => [
                styles.pickerField,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <ThemedText variant="caption" color="secondary">
                {t('birthTime')}
              </ThemedText>
              <ThemedText variant="body" color={birthTimeText ? 'default' : 'secondary'}>
                {birthTimeText ?? t('pickTime')}
              </ThemedText>
            </Pressable>
          </View>

          {pickerMode !== null && Platform.OS === 'android' ? (
            <DateTimePicker
              value={pickerValue}
              mode={pickerMode}
              display="default"
              is24Hour
              minimumDate={MIN_BIRTH_DATE}
              maximumDate={new Date()}
              onChange={onPickerChange}
            />
          ) : null}
          {pickerMode !== null && Platform.OS === 'ios' ? (
            <Modal transparent animationType="slide" onRequestClose={() => setPickerMode(null)}>
              <Pressable
                style={styles.pickerBackdrop}
                onPress={() => setPickerMode(null)}
                accessibilityLabel={t('done')}
              >
                <Pressable
                  style={[
                    styles.pickerSheet,
                    { backgroundColor: colors.surface },
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Pressable
                    onPress={() => setPickerMode(null)}
                    accessibilityRole="button"
                    accessibilityLabel={t('done')}
                  >
                    <ThemedText variant="body" weight="medium" color="primary">
                      {t('done')}
                    </ThemedText>
                  </Pressable>
                  <DateTimePicker
                    value={pickerValue}
                    mode={pickerMode}
                    display="spinner"
                    is24Hour
                    minimumDate={MIN_BIRTH_DATE}
                    maximumDate={new Date()}
                    onChange={onPickerChange}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          ) : null}

          <ThemedText variant="caption" color="secondary">
            {t('birthTimeHint')}
          </ThemedText>
          <PressableButton label={t('computeRasi')} onPress={onFindRasi} />

          {foundRasi !== null ? (
            <View style={styles.foundRow}>
              <ThemedText variant="body">
                {t('yourJanmaRasi')}:{' '}
                <ThemedText variant="body" weight="medium" color="primary">
                  {cleanBilingualValue(RASI_NAMES[foundRasi] ?? '', language)}
                </ThemedText>
              </ThemedText>
              <PressableButton label={t('useThisRasi')} onPress={() => settings.setRasi(foundRasi)} accent />
            </View>
          ) : null}
        </ThemedView>

        {/* Your rasi + today's catam for it */}
        {selectedRasi !== null && mine ? (
          <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
            {/* Chandrashtama is the day's most consequential signal — give it
                a banner, not just a tinted row in the 12-rasi list below. */}
            {mine.category === 'chandrashtama' ? (
              <View style={[styles.chandraBanner, { backgroundColor: 'rgba(179, 38, 30, 0.08)' }]}>
                <Ionicons name="warning" size={18} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small" weight="medium" color="error">
                    {t('chandrashtamaTitle')}
                  </ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {t('chandrashtamaMessage')}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <ThemedText variant="caption" color="secondary">
              {t('janmaRasi')} · {cleanBilingualValue(RASI_NAMES[selectedRasi] ?? '', language)}
            </ThemedText>
            <ThemedText variant="h4" weight="bold" style={{ marginTop: 4 }}>
              {cleanBilingualValue(mine.headline, language as 'ta' | 'en')}
            </ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
              {t('moonTransitRow')}: {t('transitFromRasi', { n: mine.transit })}
            </ThemedText>
            <ThemedText variant="body" style={{ marginTop: spacing.md }}>
              {cleanBilingualValue(mine.palam, language as 'ta' | 'en')}
            </ThemedText>
          </Card>
        ) : null}

        {/* Palam for all 12 rasis today */}
        <SectionHeader title={t('allRasisPalam')} />
        <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
          {allPalam === null ? (
            <ThemedText variant="body" color="secondary">
              {t('loading')}
            </ThemedText>
          ) : (
            allPalam.map((row, rasi) => (
              <View
                key={rasi}
                style={[
                  styles.palamRow,
                  { backgroundColor: colors.surfaceMuted },
                  rasi === selectedRasi && { backgroundColor: colors.primaryMuted },
                ]}
              >
                <ThemedText
                  variant="small"
                  weight={rasi === selectedRasi ? 'medium' : 'regular'}
                  color={rasi === selectedRasi ? 'primary' : 'default'}
                  style={styles.palamRowName}
                >
                  {cleanBilingualValue(RASI_NAMES[rasi] ?? '', language)}
                </ThemedText>
                <View style={styles.palamRowRight}>
                  <ThemedText
                    variant="small"
                    color={
                      row.category === 'chandrashtama' ? 'error' : rasi === selectedRasi ? 'primary' : 'secondary'
                    }
                  >
                    {cleanBilingualValue(row.headline, language as 'ta' | 'en')}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
          <ThemedText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
            {t('allRasisPalamHint')}
          </ThemedText>
        </Card>

        {/* Daily notification for the selected rasi */}
        <SectionHeader title={t('notifications')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsToggleRow
            label={t('dailyPalamNotification')}
            value={settings.dailyPalamEnabled}
            onChange={(enabled) => {
              void applyDailyPalamSettings(enabled, settings.dailyPalamTime);
            }}
          />
          {settings.dailyPalamEnabled ? (
            <SettingsOptionRow<string>
              label={t('dailyPalamTime')}
              options={NOTIF_TIMES.map((v) => ({ value: v, label: v }))}
              value={settings.dailyPalamTime}
              onChange={(time) => {
                void applyDailyPalamSettings(true, time);
              }}
            />
          ) : null}
          <TimeRow
            label={t('notificationPermission')}
            value={
              notified === 'granted'
                ? t('notificationPermissionGranted')
                : notified === 'denied'
                  ? t('notificationPermissionDenied')
                  : '—'
            }
          />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function PressableButton({
  label,
  onPress,
  accent,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const { colors } = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: accent ? colors.primary : colors.surfaceMuted,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ThemedText variant="body" weight="medium" color={accent ? 'onMaroon' : 'default'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: 8,
  },
  chandraBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  birthHeading: {
    marginTop: spacing.md,
  },
  birthRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    gap: 2,
    justifyContent: 'center',
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  foundRow: {
    gap: 8,
    marginTop: spacing.sm,
  },
  btn: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  palamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 40,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 8,
  },

  palamRowName: {
    flexShrink: 1,
  },
  palamRowRight: {
    flexShrink: 1,
  },
});
