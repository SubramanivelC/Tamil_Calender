import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView, Card } from '@/components/ThemedView';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MonthSelector } from '@/components/calendar/MonthSelector';
import { buildMonthGrid } from '@/components/calendar/monthGrid';
import { useMonthDecorations } from '@/features/calendar/useMonthDecorations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme/spacing';
import { addMonths, addDays, toDateKey, daysInMonth, localTodayKey, parseDateKey } from '@/utils/dates';
import { gregorianMonthName, tamilMonthName, weekdayName } from '@/localization';
import { getFestivalsForMonth } from '@/database/repositories/festivalRepo';
import { TAMIL_MONTHS } from '@/data/mappings';
import { AnnualCalendar } from '@/features/calendar/AnnualCalendar';

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const defaultView = useSettingsStore((s) => s.defaultCalendarView);

  const [annual, setAnnual] = useState(params.view === 'annual' || defaultView === 'annual');
  const todayKey = useMemo(() => localTodayKey(), []);
  const todayParts = parseDateKey(todayKey);
  const [year, setYear] = useState(todayParts.year);
  const [month, setMonth] = useState(todayParts.month);
  const [grid, setGrid] = useState<import('@/types').DayCell[]>([]);
  const [previousMonthLabel, setPreviousMonthLabel] = useState('');
  const [nextYearLabel] = useState('');

  const { map: decorations, refetch: refetchDecorations } = useMonthDecorations(year, month);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const festivalKeys = new Set(
          (await getFestivalsForMonth(year, month)).map((f) => f.dateKey)
        );
        if (cancelled) return;
        setGrid(buildMonthGrid({ year, month, firstDayOfWeek, festivalKeys, decorations }));
      })();
      return () => {
        cancelled = true;
      };
    }, [year, month, firstDayOfWeek, decorations])
  );

  const goMonth = (delta: number) => {
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };
  const goYear = (delta: number) => {
    setYear((y) => y + delta);
  };

  if (annual) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <AnnualCalendar
          year={year}
          todayKey={todayKey}
          onPrevYear={() => goYear(-1)}
          onNextYear={() => goYear(1)}
          onToday={() => {
            setYear(todayParts.year);
            setMonth(todayParts.month);
            setAnnual(false);
          }}
          onSelectMonth={(m) => {
            setMonth(m);
            setAnnual(false);
          }}
        />
        <View style={styles.viewToggle}>
          <ViewToggle annual={annual} onToggle={setAnnual} t={t} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <MonthSelector
          monthName={gregorianMonthName(month, language)}
          year={year}
          numerals={String(year)}
          onPrev={() => goMonth(-1)}
          onNext={() => goMonth(1)}
          onToday={() => {
            setYear(todayParts.year);
            setMonth(todayParts.month);
          }}
          onTitlePress={() => router.push({ pathname: '/year-picker', params: { year: String(year), month: String(month) } })}
          prevLabel={t('previousMonth')}
          nextLabel={t('nextMonth')}
          todayLabel={t('jumpToToday')}
        />
        <Card style={{ padding: spacing.lg }}>
          <CalendarGrid
            weeks={grid}
            firstDayOfWeek={firstDayOfWeek}
            language={language}
            numerals={numerals}
            showTamilDate
            selectedKey={todayKey}
            onSelectDate={(key) => router.push({ pathname: '/day-details', params: { date: key } })}
          />
        </Card>
        <View style={styles.prevYearRow}>
          <Pressable onPress={() => goYear(-1)} accessibilityRole="button" accessibilityLabel={t('previousYear')} style={styles.yearBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <ThemedText variant="small" color="primary">
              {String(year - 1)}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => goYear(1)} accessibilityRole="button" accessibilityLabel={t('nextYear')} style={styles.yearBtn}>
            <ThemedText variant="small" color="primary">
              {String(year + 1)}
            </ThemedText>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.viewToggle}>
        <ViewToggle annual={annual} onToggle={setAnnual} t={t} />
      </View>
    </SafeAreaView>
  );
}

function ViewToggle({
  annual,
  onToggle,
  t,
}: {
  annual: boolean;
  onToggle: (v: boolean) => void;
  t: (k: string) => string;
}) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        styles.toggleContainer,
        { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <Pressable
        onPress={() => onToggle(false)}
        accessibilityRole="button"
        accessibilityState={{ selected: !annual }}
        style={[styles.toggleBtn, !annual && { backgroundColor: colors.surface }]}
      >
        <ThemedText variant="small" weight={!annual ? 'medium' : 'regular'}>
          {t('monthlyView')}
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onToggle(true)}
        accessibilityRole="button"
        accessibilityState={{ selected: annual }}
        style={[styles.toggleBtn, annual && { backgroundColor: colors.surface }]}
      >
        <ThemedText variant="small" weight={annual ? 'medium' : 'regular'}>
          {t('annualView')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  viewToggle: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  prevYearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  yearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    minWidth: 40,
    gap: 4,
  },
});
