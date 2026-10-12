import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT, gregorianMonthName } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { buildMonthGrid } from '@/components/calendar/monthGrid';
import { getFestivalsForYear } from '@/database/repositories/festivalRepo';
import { spacing } from '@/theme/spacing';
import { parseDateKey } from '@/utils/dates';
import type { DayCell } from '@/types';
import { miniStyles } from './miniStyles';

interface AnnualCalendarProps {
  year: number;
  todayKey: string;
  onPrevYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
  onSelectMonth: (month: number) => void;
}

export function AnnualCalendar({
  year,
  todayKey,
  onPrevYear,
  onNextYear,
  onToday,
  onSelectMonth,
}: AnnualCalendarProps) {
  const router = useRouter();
  const t = useT();
  const { colors, dark } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const { width } = useWindowDimensions();
  const columns = width >= 720 ? 3 : 2;

  const [festivalByMonth, setFestivalByMonth] = useState<Record<number, Set<string>>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<number, Set<string>> = {};
      // Load festivals for the entire year efficiently.
      const fests = await getFestivalsForYear(year);
      for (const f of fests) {
        const { month } = parseDateKey(f.dateKey);
        if (!map[month]) map[month] = new Set();
        map[month].add(f.dateKey);
      }
      if (!cancelled) setFestivalByMonth(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const grids = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      cells: buildMonthGrid({
        year,
        month: i + 1,
        firstDayOfWeek,
        festivalKeys: festivalByMonth[i + 1],
      }),
    }));
  }, [year, firstDayOfWeek, festivalByMonth]);

  const gridFor = (m: number) => grids[m - 1]?.cells ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
      <View style={styles.yearHeader}>
        <Pressable onPress={onPrevYear} accessibilityRole="button" accessibilityLabel={t('previousYear')} hitSlop={8}>
          <ThemedText variant="h3" color="primary">
            ‹
          </ThemedText>
        </Pressable>
        <Pressable onPress={onToday} accessibilityRole="button" accessibilityLabel={t('jumpToToday')}>
          <ThemedText variant="h2" weight="bold">
            {year}
          </ThemedText>
        </Pressable>
        <Pressable onPress={onNextYear} accessibilityRole="button" accessibilityLabel={t('nextYear')} hitSlop={8}>
          <ThemedText variant="h3" color="primary">
            ›
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.gridWrap}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <Card
            key={m}
            style={{ flexBasis: `${Math.floor(100 / columns - 2)}%`, flexGrow: 1, padding: spacing.md }}
          >
            <Pressable onPress={() => onSelectMonth(m)} accessibilityRole="button" accessibilityLabel={`${gregorianMonthName(m, language)} ${year}`}>
              <ThemedText variant="small" weight="bold" style={{ marginBottom: 6, textAlign: 'center' }}>
                {gregorianMonthName(m, language)}
              </ThemedText>
            </Pressable>
            <MiniMonth
              cells={gridFor(m)}
              todayKey={todayKey}
              numerals={numerals}
              onPress={(key) => router.push({ pathname: '/day-details', params: { date: key } })}
              primary={colors.primary}
              festival={colors.festival}
              muted={colors.textSecondary}
            />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

export function MiniMonth({
  cells,
  todayKey,
  numerals,
  onPress,
  primary,
  festival,
  muted,
}: {
  cells: DayCell[];
  todayKey: string;
  numerals: string;
  onPress: (key: string) => void;
  primary: string;
  festival: string;
  muted: string;
}) {
  const rows: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View>
      {rows.map((week, i) => (
        <View key={i} style={miniStyles.weekRow}>
          {week.map((cell) => (
            <Pressable
              key={cell.key}
              onPress={() => onPress(cell.key)}
              accessibilityRole="button"
              accessibilityLabel={cell.key}
              style={miniStyles.dayCell}
            >
              <ThemedText
                variant="caption"
                style={
                  cell.key === todayKey
                    ? { color: primary, fontWeight: '700' }
                    : cell.inMonth
                      ? undefined
                      : { color: muted }
                }
              >
                {cell.day}
              </ThemedText>
              {cell.hasFestival ? (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: festival,
                  }}
                />
              ) : (
                <View style={{ height: 4 }} />
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
