import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { SectionHeader } from '@/components/SectionHeader';
import { Card } from '@/components/ThemedView';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing, minTouchTarget } from '@/theme/spacing';
import { formatNumerals } from '@/utils/numerals';
import { useMonthDetails, type MonthDetailEntry } from '@/features/calendar/useMonthDetails';

/**
 * "Month details" list shown below the monthly calendar grid: amavasai,
 * pournami, pradosham, ekadasi, subha muhurtham, festivals and the user's
 * events for the displayed month. Rows deep-link into day details.
 */
export function MonthDetails({
  year,
  month,
  onSelectDate,
  refreshSignal = 0,
}: {
  year: number;
  month: number;
  onSelectDate: (dateKey: string) => void;
  /** Bump to refetch when returning from adding a festival/event. */
  refreshSignal?: number;
}) {
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const details = useMonthDetails(year, month);

  useEffect(() => {
    if (refreshSignal !== 0) details.refetch();
    // refetch identity is stable; signal bumps are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const groups: { title: string; rows: MonthDetailEntry[]; muted?: boolean }[] = [
    { title: t('festivalsObservances'), rows: details.festivals },
    { title: t('amavasai'), rows: details.amavasai, muted: true },
    { title: t('pournami'), rows: details.pournami, muted: true },
    { title: t('pradosham'), rows: details.pradosham, muted: true },
    { title: t('ekadasi'), rows: details.ekadasi, muted: true },
    { title: t('subhaMuhurtham'), rows: details.subhaMuhurtham, muted: true },
    { title: t('events'), rows: details.events },
  ].filter((g) => g.rows.length > 0);

  return (
    <View>
      <SectionHeader title={t('monthDetails')} />
      <Card style={{ padding: spacing.lg }}>
        {details.loading ? (
          <ThemedText variant="body" color="secondary">
            {t('loading')}
          </ThemedText>
        ) : groups.length === 0 ? (
          <ThemedText variant="body" color="secondary">
            {t('noMonthDetails')}
          </ThemedText>
        ) : (
          groups.map((g) => (
            <View
              key={g.title}
              style={[styles.group, g.muted ? [styles.mutedGroup, { backgroundColor: colors.surfaceMuted }] : null]}
            >
              <ThemedText variant="small" weight="medium" color="secondary">
                {g.title}
              </ThemedText>
              {g.rows.map((row) => (
                <Pressable
                  key={`${g.title}-${row.dateKey}-${String(row.nameTa ?? '')}`}
                  onPress={() => onSelectDate(row.dateKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.dateKey} ${row.nameEn ?? row.nameTa ?? g.title}`}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
                >
                  <View style={styles.dayWrap}>
                    <ThemedText
                      variant="small"
                      weight="medium"
                      color={
                        (row as { isHoliday?: boolean }).isHoliday ? 'primary' : 'default'
                      }
                    >
                      {formatNumerals(String(row.day), numerals as 'arabic' | 'tamil')}
                    </ThemedText>
                  </View>
                  <ThemedText
                    variant="body"
                    color={(row as { isHoliday?: boolean }).isHoliday ? 'primary' : 'default'}
                    style={[styles.name, (row as { repeatYearly?: boolean }).repeatYearly && styles.repeated]}
                  >
                    {row.nameEn && language === 'en'
                      ? (row as { nameEn: string }).nameEn
                      : (row.nameTa ?? row.nameEn ?? g.title)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.md,
    gap: 2,
  },
  mutedGroup: {
    padding: spacing.md,
    gap: 2,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 4,
    minHeight: minTouchTarget,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  dayWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(118, 37, 54, 0.08)',
  },
  name: {
    flex: 1,
    flexShrink: 1,
  },
  repeated: {
    fontStyle: 'italic',
  },
});
