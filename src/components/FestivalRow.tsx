import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { useT } from '@/localization';
import { gregorianMonthName } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { localTodayKey, parseDateKey, diffCalendarDays } from '@/utils/dates';
import { formatNumerals } from '@/utils/numerals';
import type { FestivalCategory } from '@/types';

/** Category → semantic color-token name; keep in sync with the legend on
 *  the Festivals screen. */
export const categoryColorName: Record<FestivalCategory, 'primary' | 'festival' | 'info' | 'success' | 'textSecondary'> = {
  tamil: 'primary',
  hindu: 'festival',
  national: 'info',
  tamilnadu: 'success',
  observance: 'textSecondary',
};

interface FestivalRowProps {
  title: string;
  subtitle?: string | null;
  /** 'YYYY-MM-DD' of the occurrence — shows a Today/Tomorrow/In-N-days
   *  countdown plus a localized date, not the raw ISO string. A value that
   *  is not a date key (e.g. '') renders as-is. */
  dateLabel: string;
  /** Category for the colored dot; omit to hide the dot. */
  category?: FestivalCategory;
  onPress?: () => void;
}

/**
 * The relative countdown label Drik Panchang made famous — 'Today',
 * 'Tomorrow', 'In N days' — paired with the localized calendar date.
 */
function countdownLabel(
  t: (k: string, vars?: Record<string, string | number>) => string,
  language: 'en' | 'ta',
  dateKey: string,
  numerals: 'arabic' | 'tamil'
) {
  const days = diffCalendarDays(localTodayKey(), dateKey);
  const { day, month } = parseDateKey(dateKey);
  const dateText = formatNumerals(`${day} ${gregorianMonthName(month, language)}`, numerals);
  if (days === 0) return { label: t('today'), highlight: true, dateText };
  if (days === 1) return { label: t('tomorrow'), highlight: true, dateText };
  if (days > 1) return { label: t('inNDays', { n: days }), highlight: false, dateText };
  return { label: dateText, highlight: false, dateText: '' };
}

export function FestivalRow({
  title,
  subtitle,
  dateLabel,
  category,
  onPress,
}: FestivalRowProps) {
  const theme = useTheme();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const isDateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateLabel);
  const countdown = isDateKey ? countdownLabel(t, language, dateLabel, numerals) : null;
  const dotColor = category ? theme.colors[categoryColorName[category]] : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countdown ? `${countdown.label}, ${countdown.dateText}` : dateLabel}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <View style={styles.textCol}>
        <ThemedText variant="body" weight="medium" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="small" color="secondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {countdown ? (
        <View style={styles.dateCol}>
          <ThemedText
            variant="small"
            color={countdown.highlight ? 'primary' : 'secondary'}
            weight={countdown.highlight ? 'medium' : 'regular'}
          >
            {countdown.label}
          </ThemedText>
          {countdown.dateText ? (
            <ThemedText variant="caption" color="secondary">
              {countdown.dateText}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <ThemedText variant="small" color="secondary">
          {dateLabel ? formatNumerals(dateLabel, numerals) : ''}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  textCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  dateCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
