import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
import { requestPermission, scheduleDailyPalam } from '@/services/notificationService';
import { RASI_NAMES, PADA_SPLIT_STAR_INDICES } from '@/data/rasiPalam';
import { NAKSHATRA_NAMES } from '@/data/mappings';
import { cleanBilingualValue } from '@/utils/bilingual';
import type { ThemeMode } from '@/theme/theme';
import type { FontScale } from '@/theme/typography';
import { fontScaleFactors } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
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
  const router = useRouter();
  const { colors } = useThemeColors();
  const settings = useSettingsStore();
  const language = settings.language;

  const [datasetVersion, setDatasetVersion] = useState<string>(DATASET_VERSION);
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  // Picker mode follows the saved shape after the persisted store re-hydrates
  // mid-session — derived each render from the store, with the user's
  // in-session choice taking precedence (no setState-in-effect cascade).
  const [userRasiMode, setUserRasiMode] = useState<'rasi' | 'star' | null>(null);
  const rasiMode: 'rasi' | 'star' =
    userRasiMode ?? (settings.rasiPalamBirthStar !== null ? 'star' : 'rasi');

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

  const applyDailyPalamSettings = useCallback(
    async (enabled: boolean, time: string) => {
      if (enabled) {
        const granted = await requestPermission();
        if (!granted) {
          const status = await Notifications.getPermissionsAsync();
          setNotifPermission(status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied');
          return; // stay disabled when permission was refused
        }
      }
      settings.setDailyPalamEnabled(enabled);
      settings.setDailyPalamTime(time);
      await scheduleDailyPalam(enabled, time, settings.rasiPalamRasi);
    },
    [settings]
  );

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

        <SectionHeader title={t('appearance')} icon="color-palette-outline" />
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

        <SectionHeader title={t('language')} icon="language-outline" />
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

        <SectionHeader title={t('rasiPalam')} icon="moon-outline" />
        <ThemedView variant="surface" style={styles.group}>
          <SettingsOptionRow<'rasi' | 'star'>
            label={t('rasiSelectMode')}
            options={[
              { value: 'rasi', label: t('byRasiName') },
              { value: 'star', label: t('byBirthStar') },
            ]}
            value={rasiMode}
            onChange={setUserRasiMode}
          />
          {rasiMode === 'rasi' ? (
            <SettingsOptionRow<number>
              label={t('selectYourRasi')}
              options={RASI_NAMES.map((n, i) => ({ value: i, label: cleanBilingualValue(n, language) }))}
              value={settings.rasiPalamRasi ?? -1}
              onChange={settings.setRasi}
            />
          ) : (
            <>
              <SettingsOptionRow<number>
                label={t('birthStar')}
                options={NAKSHATRA_NAMES.map((n, i) => ({ value: i, label: cleanBilingualValue(n, language) }))}
                value={settings.rasiPalamBirthStar ?? -1}
                onChange={(star) => settings.setBirthStar(star, 1)}
              />
              {settings.rasiPalamBirthStar !== null &&
              PADA_SPLIT_STAR_INDICES.includes(settings.rasiPalamBirthStar) ? (
                <SettingsOptionRow<1 | 2 | 3 | 4>
                  label={t('birthPada')}
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                  ]}
                  value={settings.rasiPalamBirthPada ?? 1}
                  onChange={(p) => settings.setBirthStar(settings.rasiPalamBirthStar ?? 0, p)}
                />
              ) : null}
              <TimeRow
                label={t('janmaRasi')}
                value={
                  settings.rasiPalamRasi !== null
                    ? cleanBilingualValue(RASI_NAMES[settings.rasiPalamRasi] ?? '', language)
                    : null
                }
                language={language}
              />
            </>
          )}
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
              options={[
                { value: '06:00', label: '06:00' },
                { value: '06:30', label: '06:30' },
                { value: '07:00', label: '07:00' },
                { value: '07:30', label: '07:30' },
                { value: '08:00', label: '08:00' },
                { value: '09:00', label: '09:00' },
              ]}
              value={settings.dailyPalamTime}
              onChange={(time) => {
                void applyDailyPalamSettings(true, time);
              }}
            />
          ) : null}
        </ThemedView>

        <SectionHeader title={t('calendar')} icon="calendar-outline" />
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
          <TimeRow
            label={t('dataCoverage')}
            value={
              language === 'ta'
                ? `${NAVIGABLE_START_YEAR}–${NAVIGABLE_END_YEAR} (நாட்காட்டி); ${DATASET_START_YEAR}–${DATASET_END_YEAR} (சரிபார்க்கப்பட்ட தரவு)`
                : `${NAVIGABLE_START_YEAR}–${NAVIGABLE_END_YEAR} (calendar); ${DATASET_START_YEAR}–${DATASET_END_YEAR} (verified data)`
            }
          />
        </ThemedView>

        <SectionHeader title={t('notifications')} icon="notifications-outline" />
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

        {/* Search — moved out of the bottom menu; opened from here. */}
        <SectionHeader title={t('tabSearch')} icon="search-outline" />
        <ThemedView variant="surface" style={styles.group}>
          <Pressable
            onPress={() => router.push('/(tabs)/search')}
            accessibilityRole="button"
            accessibilityLabel={t('tabSearch')}
            style={({ pressed }) => [styles.searchRow, pressed ? { opacity: 0.8 } : null]}
          >
            <ThemedText variant="body">{t('tabSearch')}</ThemedText>
            <ThemedText variant="small" color="secondary">
              {t('searchPlaceholder').replace('…', '')} →
            </ThemedText>
          </Pressable>
        </ThemedView>

        <SectionHeader title={t('about')} icon="information-circle-outline" />
        <ThemedView variant="surface" style={styles.group}>
          <TimeRow label={t('appVersion')} value={String(Constants.expoConfig?.version ?? '1.0.0')} language={language} />
          <TimeRow label={t('datasetVersion')} value={datasetVersion} language={language} />
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: 4,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
});
