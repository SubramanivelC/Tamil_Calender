import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT, gregorianMonthName } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { buildMonthGrid, type DayDecoration } from '@/components/calendar/monthGrid';
import { getFestivalsForYear, getObservancesForYear } from '@/database/repositories/festivalRepo';
import { spacing } from '@/theme/spacing';
import { parseDateKey } from '@/utils/dates';
import type { DayCell } from '@/types';
import { miniStyles } from './miniStyles';
import { ThaliMark } from '@/components/calendar/ThaliMark';

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
  const [decorations, setDecorations] = useState<Map<string, DayDecoration>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load festivals for the entire year efficiently.
      const [fests, obsRows] = await Promise.all([
        getFestivalsForYear(year),
        getObservancesForYear(year),
      ]);
      const map: Record<number, Set<string>> = {};
      for (const f of fests) {
        const { month } = parseDateKey(f.dateKey);
        if (!map[month]) map[month] = new Set();
        map[month].add(f.dateKey);
      }
      // Amavasai / Pournami moon markers and Subha Muhurtham days per date.
      const decor = new Map<string, DayDecoration>();
      for (const o of obsRows) {
        const entry = decor.get(o.date_key) ?? {};
        entry.isAmavasai = (entry.isAmavasai ?? false) || o.kind === 'amavasai';
        entry.isPournami = (entry.isPournami ?? false) || o.kind === 'pournami';
        entry.isSubhaMuhurtham =
          (entry.isSubhaMuhurtham ?? false) || o.kind === 'subha_muhurtham';
        decor.set(o.date_key, entry);
      }
      if (!cancelled) {
        setFestivalByMonth(map);
        setDecorations(decor);
      }
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
        decorations,
      }),
    }));
  }, [year, firstDayOfWeek, festivalByMonth, decorations]);

  const gridFor = (m: number) => grids[m - 1]?.cells ?? [];

  return (
    // Bottom clearance for the floating Monthly/Annual view toggle so the
    // last month card is never covered at full scroll.
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + 56 }}>
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
      <View style={styles.legendRow}>
        <ThemedText variant="caption" color="secondary">
          {t('amavasai')}
        </ThemedText>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text }} />
        <ThemedText variant="caption" color="secondary">
          {t('pournami')}
        </ThemedText>
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: colors.gold }} />
        <ThaliMark color={colors.gold} size={10} />
        <ThemedText variant="caption" color="secondary">
          {t('subhaMuhurtham')}
        </ThemedText>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.festival }} />
        <ThemedText variant="caption" color="secondary">
          {t('festival')}
        </ThemedText>
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
              gold={colors.gold}
              text={colors.text}
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
  gold,
  text,
}: {
  cells: DayCell[];
  todayKey: string;
  numerals: string;
  onPress: (key: string) => void;
  primary: string;
  festival: string;
  muted: string;
  gold: string;
  text: string;
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
              accessibilityLabel={
                cell.hasFestival
                  ? `${cell.key}, festival`
                  : cell.isAmavasai
                    ? `${cell.key}, amavasai`
                    : cell.isPournami
                      ? `${cell.key}, pournami`
                      : cell.key
              }
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
              ) : cell.isAmavasai ? (
                <View
                  style={{
                    width: 7,
                    height: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: text,
                    }}
                  />
                </View>
              ) : cell.isPournami ? (
                <View
                  style={{
                    width: 7,
                    height: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      borderWidth: 1.5,
                      borderColor: gold,
                    }}
                  />
                </View>
              ) : cell.isSubhaMuhurtham ? (
                <View style={{ width: 9, height: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <ThaliMark color={gold} size={9} />
                </View>
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
});
