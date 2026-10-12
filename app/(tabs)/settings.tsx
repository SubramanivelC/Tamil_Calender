import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Linking, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { SettingsOptionRow, SettingsToggleRow } from '@/components/SettingsRow';
import { TimeRow } from '@/components/TimeRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemeMode } from '@/theme/theme';
import type { FontScale } from '@/theme/typography';
import { fontScaleFactors } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import {
  DATASET_START_YEAR,
  DATASET_END_YEAR,
  NAVIGABLE_START_YEAR,
  NAVIGABLE_END_YEAR,
} from '@/data/constants';
import { getDatasetMeta } from '@/database/repositories/userDataRepo';
import { DATASET_VERSION } from '@/data/seedData';

export default function SettingsScreen() {
  const t = useT();
  const { colors } = useThemeColors();
  const settings = useSettingsStore();

  const [datasetVersion, setDatasetVersion] = useState<string>(DATASET_VERSION);
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useEffect(() => {
    void (async () => {
      try {
        const v = await getDatasetMeta('version');
        if (v) setDatasetVersion(v);
      } catch {
        /* database not ready yet - keep bundled constant */
      }
      try {
        const s = await Notifications.getPermissionsAsync();
        setNotifPermission(s.granted ? 'granted' : s.canAskAgain ? 'undetermined' : 'denied');
      } catch {
        setNotifPermission('undetermined');
      }
    })();
  }, []);

  const fontScaleOptions: { value: number; label: string }[] = [
    { value: fontScaleFactors.small, label: t('fontSmall') },
    { value: fontScaleFactors.default, label: t('fontDefault') },
    { value: fontScaleFactors.large, label: t('fontLarge') },
    { value: fontScaleFactors.extraLarge, label: t('fontExtraLarge') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <ThemedText variant="h2" weight="bold" style={{ marginBottom: spacing.lg }}>
          {t('tabSettings')}
        </ThemedText>

        <SectionHeader title={t('appearance')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsOptionRow<ThemeMode>
            label={t('systemTheme')}
            options={[
              { value: 'light', label: t('lightMode') },
              { value: 'dark', label: t('darkMode') },
              { value: 'system', label: t('systemTheme') },
            ]}
            value={settings.themeMode}
            onChange={settings.setThemeMode}
          />
          <SettingsOptionRow<number>
            label={t('fontSize')}
            options={fontScaleOptions}
            value={settings.fontScale}
            onChange={settings.setFontScale}
          />
        </ThemedView>

        <SectionHeader title={t('language')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsOptionRow<'ta' | 'en'>
            label=""
            options={[
              { value: 'ta', label: t('tamil') },
              { value: 'en', label: t('english') },
            ]}
            value={settings.language}
            onChange={settings.setLanguage}
          />
          <SettingsOptionRow<'arabic' | 'tamil'>
            label={t('numerals')}
            options={[
              { value: 'arabic', label: t('arabicNumerals') },
              { value: 'tamil', label: t('tamilNumerals') },
            ]}
            value={settings.numerals}
            onChange={settings.setNumerals}
          />
        </ThemedView>

        <SectionHeader title={t('calendar')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsOptionRow<'monthly' | 'annual'>
            label={t('defaultView')}
            options={[
              { value: 'monthly', label: t('monthlyView') },
              { value: 'annual', label: t('annualView') },
            ]}
            value={settings.defaultCalendarView}
            onChange={settings.setDefaultCalendarView}
          />
          <SettingsOptionRow<0 | 1>
            label={t('firstDayOfWeek')}
            options={[
              { value: 0, label: t('sunday') },
              { value: 1, label: t('monday') },
            ]}
            value={settings.firstDayOfWeek}
            onChange={settings.setFirstDayOfWeek}
          />
          <TimeRow label={t('dataCoverage')} value={`${NAVIGABLE_START_YEAR}–${NAVIGABLE_END_YEAR} (calendar); ${DATASET_START_YEAR}–${DATASET_END_YEAR} (verified data)`} />
        </ThemedView>

        <SectionHeader title={t('notifications')} />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsToggleRow
            label={t('festivalReminders')}
            value={settings.festivalRemindersEnabled}
            onChange={settings.setFestivalRemindersEnabled}
          />
          <TimeRow
            label={t('notificationPermission')}
            value={
              notifPermission === 'granted'
                ? t('notificationPermissionGranted')
                : notifPermission === 'denied'
                  ? t('notificationPermissionDenied')
                  : '—'
            }
          />
          {notifPermission === 'undetermined' ? (
            <Pressable
              onPress={() => {
                void Notifications.requestPermissionsAsync();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('notificationPermission')}
              style={styles.linkBtn}
            >
              <ThemedText variant="small" color="primary" weight="medium">
                {t('retry')}
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>

        <SectionHeader title={t('about')} />
        <ThemedView variant="surface" style={styles.group}>
          <TimeRow label={t('appVersion')} value={String(Constants.expoConfig?.version ?? '1.0.0')} />
          <TimeRow label={t('datasetVersion')} value={datasetVersion} />
          <Pressable
            onPress={() => Linking.openURL('https://github.com/thirunellai/docs/calendar-dataset.md')}
            accessibilityRole="link"
            accessibilityLabel={t('dataSource')}
            style={styles.linkBtn2}
          >
            <ThemedText variant="body" color="primary">
              {t('dataSource')} →
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://thirunellai.app/privacy')}
            accessibilityRole="link"
            accessibilityLabel={t('privacyPolicy')}
            style={styles.linkBtn2}
          >
            <ThemedText variant="body" color="primary">
              {t('privacyPolicy')} →
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://thirunellai.app/licenses')}
            accessibilityRole="link"
            accessibilityLabel={t('licenses')}
            style={styles.linkBtn2}
          >
            <ThemedText variant="body" color="primary">
              {t('licenses')} →
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: 4,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  linkBtn2: {
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
});
