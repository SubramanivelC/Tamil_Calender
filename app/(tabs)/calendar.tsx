import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView, Card } from '@/components/ThemedView';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MonthSelector } from '@/components/calendar/MonthSelector';
import { MonthDetails } from '@/components/calendar/MonthDetails';
import { buildMonthGrid } from '@/components/calendar/monthGrid';
import { useMonthDecorations } from '@/features/calendar/useMonthDecorations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme/spacing';
import { addMonths, addDays, toDateKey, daysInMonth, localTodayKey, parseDateKey, isValidDateKey } from '@/utils/dates';
import { gregorianMonthName, tamilMonthName, weekdayName } from '@/localization';
import { getFestivalsForMonth } from '@/database/repositories/festivalRepo';
import { TAMIL_MONTHS } from '@/data/mappings';
import { AnnualCalendar } from '@/features/calendar/AnnualCalendar';
import { tamilMonthsSpanningGregorianMonth } from '@/features/calendar/tamilMonthSpan';
import { DayDetailsContent } from '@/features/daydetails/DayDetailsContent';
import { selectionTick } from '@/utils/haptics';

/** The three views of the Calendar tab. Daily detail content is the
    "Today" view, embedded so the bottom menu stays visible. */
type CalendarView = 'monthly' | 'today' | 'annual';

function normalizeView(v: unknown): CalendarView | null {
  return v === 'today' || v === 'annual' || v === 'monthly' ? v : null;
}

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; date?: string }>();
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const defaultView = useSettingsStore((s) => s.defaultCalendarView);

  const todayKey = useMemo(() => localTodayKey(), []);
  const todayParts = parseDateKey(todayKey);
  const [year, setYear] = useState(todayParts.year);
  const [month, setMonth] = useState(todayParts.month);
  const [grid, setGrid] = useState<import('@/types').DayCell[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  useFocusEffect(
    // Re-read month details when returning (e.g. after adding an event).
    useCallback(() => setRefreshSignal((s) => s + 1), [])
  );

  // View state — initialized from route params (deep link / double-tap from
  // Home), otherwise the user's default (monthly). `todayDate` is the date
  // shown in the Today (daily details) view.
  const [view, setView] = useState<CalendarView>(
    () => normalizeView(params.view) ?? defaultView
  );
  const [todayDate, setTodayDate] = useState<string>(() =>
    typeof params.date === 'string' && isValidDateKey(params.date) ? params.date : todayKey
  );

  // Navigations arriving while the Calendar tab is already mounted (e.g.
  // double-tapping a Home date) update view/date via params. When params
  // carry no explicit view, fall back to the user's default — this is what
  // makes a direct Calendar tab press open the Monthly view.
  // Adjusted *during render* (per ref of the last-seen param signature) so
  // state resets exactly when params change, without a setState-in-effect.
  const currentParamSeq = `${params.view ?? ''}|${(params.date as string | undefined) ?? ''}`;
  const [paramSeq, setParamSeq] = useState(currentParamSeq);
  if (paramSeq !== currentParamSeq) {
    setParamSeq(currentParamSeq);
    const pView = normalizeView(params.view);
    if (pView) {
      setView(pView);
      const pDate = typeof params.date === 'string' && isValidDateKey(params.date) ? params.date : todayKey;
      setTodayDate(pDate);
    } else {
      setView(defaultView);
    }
  }

  const { map: decorations, refetch: refetchDecorations } = useMonthDecorations(year, month);
  // Header shows both Tamil months the Gregorian month spans (e.g. Jan =
  // Margazhi · Thai), not just the one containing day 1.
  const tamilMonthLine = useMemo(
    () => tamilMonthsSpanningGregorianMonth(year, month, language),
    [year, month, language]
  );

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

  /** Open a specific date's full details inside the Today view. */
  const openTodayView = useCallback(
    (key: string) => {
      setTodayDate(key);
      setView('today');
    },
    []
  );

  const annual = view === 'annual';
  const showToday = view === 'today';

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
            setView('monthly');
          }}
          onSelectMonth={(m) => {
            setMonth(m);
            setView('monthly');
          }}
          onSelectDate={openTodayView}
        />
        <View style={styles.viewToggle}>
          <ViewToggle view={view} onChange={setView} t={t} />
        </View>
      </SafeAreaView>
    );
  }

  if (showToday) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <DayDetailsContent
          dateKey={todayDate}
          onChangeDate={setTodayDate}
          onBack={() => setView('monthly')}
          onAddEvent={() => router.push({ pathname: '/add-event', params: { date: todayDate } })}
          bottomPadding={spacing.xxxl + 60}
        />
        <View style={styles.viewToggle}>
          <ViewToggle view={view} onChange={setView} t={t} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Bottom clearance: the floating Monthly/Today/Annual toggle overlays the
          scroll area, so pad past it to keep the last rows readable. */}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + 56 }}>
        <MonthSelector
          monthName={gregorianMonthName(month, language)}
          tamilMonthName={tamilMonthLine}
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
            onSelectDate={openTodayView}
          />
        </Card>
        <MonthDetails
          year={year}
          month={month}
          refreshSignal={refreshSignal}
          onSelectDate={openTodayView}
        />
        <View style={styles.legendRow}>
          <ThemedText variant="caption" color="secondary">
            {t('amavasai')}
          </ThemedText>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text }} />
          <ThemedText variant="caption" color="secondary">
            {t('pournami')}
          </ThemedText>
          <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: colors.gold }} />
          <ThemedText variant="caption" color="secondary">
            {t('festival')}
          </ThemedText>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.festival }} />
        </View>
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
        <ViewToggle view={view} onChange={setView} t={t} />
      </View>
    </SafeAreaView>
  );
}

/** Floating three-way switch: Monthly · Today · Annual. */
function ViewToggle({
  view,
  onChange,
  t,
}: {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
  t: (k: string) => string;
}) {
  const { colors } = useThemeColors();
  const items: { key: CalendarView; label: string }[] = [
    { key: 'monthly', label: t('monthlyView') },
    { key: 'today', label: t('todayView') },
    { key: 'annual', label: t('annualView') },
  ];
  return (
    <View
      style={[
        styles.toggleContainer,
        { backgroundColor: colors.surfaceMuted },
      ]}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            selectionTick();
            onChange(item.key);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: view === item.key }}
          style={({ pressed }) => [
            styles.toggleBtn,
            view === item.key && { backgroundColor: colors.surface },
            pressed ? { transform: [{ scale: 0.96 }] } : null,
          ]}
        >
          <ThemedText variant="small" weight={view === item.key ? 'medium' : 'regular'}>
            {item.label}
          </ThemedText>
        </Pressable>
      ))}
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
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
