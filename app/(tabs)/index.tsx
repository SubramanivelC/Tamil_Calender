import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { FestivalRow } from '@/components/FestivalRow';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { MonthSelector } from '@/components/calendar/MonthSelector';
import { LoadingView } from '@/components/LoadingView';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import type { FestivalOccurrence } from '@/types';
import { tamilMonthsSpanningGregorianMonth } from '@/features/calendar/tamilMonthSpan';
import { useSettingsStore } from '@/store/settingsStore';
import { useHomeData, type HomeData } from '@/features/home/useHomeData';
import { TimeRow } from '@/components/TimeRow';
import { RasiPalamCard } from '@/features/rasiPalam/RasiPalamCard';
import { spacing } from '@/theme/spacing';
import { localTodayKey, parseDateKey } from '@/utils/dates';
import { formatBoundaryStamp } from '@/utils/stamps';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const { colors } = useThemeColors();
  const numerals = useSettingsStore((s) => s.numerals);
  const language = useSettingsStore((s) => s.language);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const todayKey = useMemo(() => localTodayKey(), []);


  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const { data, loading, refetch } = useHomeData(selectedKey);

  // Double-tap detection on the calendar grid: a second tap on the same date
  // within the double-tap window opens that date's full details in the
  // Calendar tab's Today view; otherwise the tap just selects the date and
  // reveals the quick details inline below.
  const lastTapRef = useRef<{ key: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 300;

  const onSelectDate = useCallback(
    (key: string) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.key === key && now - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        setSelectedKey(key);
        // Open the day's full details under the Calendar tab's Today view,
        // keeping the bottom menu visible.
        router.push({ pathname: '/(tabs)/calendar', params: { view: 'today', date: key } });
        return;
      }
      lastTapRef.current = { key, time: now };
      setSelectedKey(key);
    },
    [router]
  );

  if (loading && !data) {
    return <LoadingView label={t('loading')} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Header onSearchPress={() => router.push('/(tabs)/search')} onSettingsPress={() => router.push('/(tabs)/settings')} />

        {data ? (
          <TodayHero
            data={data}
            numerals={numerals}
            language={language}
            onSelectDate={onSelectDate}
            onNav={setSelectedKey}
            selectedKey={selectedKey}
            firstDayOfWeek={firstDayOfWeek}
            t={t}
          />
        ) : (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('dataUnavailableTitle')}
            message={t('dataUnavailableMessage')}
            retryLabel={t('retry')}
            onRetry={refetch}
          />
        )}

        {/* Everything below the calendar gets side margins (the grid above
            computes its own column widths for the full card width, so the
            inset starts below it). */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          {data ? (
            <>
              {/* Full panchangam for the selected date: lunar fields,
                  rise/set times, good/inauspicious time bands and soolam —
                  the same detail set as the Day details screen. */}
              <SectionHeader title={t('panchangamSummary')} icon="sunny-outline" />
              <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
                <TimeRow
                  key="tithi"
                  label={t('tithi')}
                  value={data.selectedPanchang.tithi}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="tithiEnd"
                  label={t('tithiEnd')}
                  value={formatBoundaryStamp(
                    data.selectedPanchang.tithiEnd,
                    data.selectedPanchang.tithiEndDay,
                    selectedKey,
                    language,
                    t,
                    numerals
                  )}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="nextTithi"
                  label={t('nextTithi')}
                  value={data.selectedPanchang.nextTithi ?? null}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="nextTithiEnd"
                  label={`${t('nextTithi')} ${t('tithiEnd').toLowerCase()}`}
                  value={formatBoundaryStamp(
                    data.selectedPanchang.nextTithiEnd,
                    data.selectedPanchang.nextTithiEndDay,
                    selectedKey,
                    language,
                    t,
                    numerals
                  )}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="nakshatra"
                  label={t('nakshatra')}
                  value={data.selectedPanchang.nakshatra}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="nakshatraEnd"
                  label={t('nakshatraEnd')}
                  value={formatBoundaryStamp(
                    data.selectedPanchang.nakshatraEnd,
                    data.selectedPanchang.nakshatraEndDay,
                    selectedKey,
                    language,
                    t,
                    numerals
                  )}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="yoga"
                  label={t('yoga')}
                  value={data.selectedPanchang.yoga}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="karana"
                  label={t('karana')}
                  value={data.selectedPanchang.karana}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  key="nokkuNaal"
                  label={t('nokkuNaalRow')}
                  value={data.selectedPanchang.nokkuNaal ? t(`nokkuNaal${data.selectedPanchang.nokkuNaal === 'mel' ? 'Mel' : data.selectedPanchang.nokkuNaal === 'keel' ? 'Keel' : 'Sama'}`) : null}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('paksha')}
                  value={data.selectedPanchang.paksha}
                  language={language as 'ta' | 'en'}
                />
                <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
                <TimeRow
                  label={t('sunrise')}
                  value={data.selectedPanchang.sunrise}
                  approximate={!data.selectedVerified}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('sunset')}
                  value={data.selectedPanchang.sunset}
                  approximate={!data.selectedVerified}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('moonrise')}
                  value={data.selectedPanchang.moonrise}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('moonset')}
                  value={data.selectedPanchang.moonset}
                  language={language as 'ta' | 'en'}
                />
                <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
                <TimeRow
                  label={t('nallaNeram')}
                  value={data.selectedPanchang.nallaNeram}
                  approximate={!data.selectedVerified}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('rahuKalam')}
                  value={data.selectedPanchang.rahuKalam}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('yamagandam')}
                  value={data.selectedPanchang.yamagandam}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('kuligai')}
                  value={data.selectedPanchang.kuligai}
                  language={language as 'ta' | 'en'}
                />
                <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
                <TimeRow
                  label={t('soolam')}
                  value={data.selectedPanchang.soolam}
                  language={language as 'ta' | 'en'}
                />
                <TimeRow
                  label={t('parikaram')}
                  value={data.selectedPanchang.parikaram}
                  language={language as 'ta' | 'en'}
                />
                <FestivalsInline
                  t={t}
                  language={language}
                  festivals={data.dayFestivals}
                  observances={data.dayObservances}
                />
                <View style={styles.detailsRow}>
                  <ThemedText variant="caption" color="secondary" style={{ flex: 1, flexShrink: 1, paddingRight: spacing.md }}>
                    {t('doubleTapHint')}
                  </ThemedText>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(tabs)/calendar', params: { view: 'today', date: selectedKey } })}
                    accessibilityRole="button"
                    accessibilityLabel={t('viewDetails')}
                    hitSlop={8}
                  >
                    <ThemedText variant="small" color="primary" weight="medium">
                      {t('viewDetails')} →
                    </ThemedText>
                  </Pressable>
                </View>
              </Card>

              {/* Rasi Palan — the user's own forecast once a rasi is chosen
                  in Settings (by name or by birth date/time); otherwise a
                  select prompt that opens Settings. */}
              <RasiPalamCard dateKey={selectedKey} />

            <SectionHeader title={t('upcomingFestivals')} actionLabel={t('seeAll')} onAction={() => router.push('/(tabs)/festivals')} />
              <View style={{ marginBottom: spacing.xl }}>
                {data.upcoming.map((f) => (
                  <FestivalRow
                    key={`${f.festivalId}-${f.dateKey}`}
                    title={t('language') === 'ta' ? f.nameTa : f.nameEn}
                    dateLabel={f.dateKey}
                    onPress={() => router.push({ pathname: '/(tabs)/calendar', params: { view: 'today', date: f.dateKey } })}
                  />
                ))}
                {data.upcoming.length === 0 ? (
                  <ThemedText variant="small" color="secondary">
                    {t('festivalUnavailable')}
                  </ThemedText>
                ) : null}
              </View>
            </>
          ) : null}

          <QuickActions
            t={t}
            onAnnual={() => router.push('/(tabs)/calendar?view=annual')}
            onFestivals={() => router.push('/(tabs)/festivals')}
            onSearch={() => router.push('/(tabs)/search')}
            onReminders={() => router.push({ pathname: '/(tabs)/calendar', params: { view: 'today' } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Festivals & observances of the currently selected date, inline on Home. */
function FestivalsInline({
  t,
  language,
  festivals,
  observances,
}: {
  t: (k: string) => string;
  language: string;
  festivals: FestivalOccurrence[];
  observances: { kind: string; nameTa: string; nameEn: string }[];
}) {
  const hasAny = festivals.length > 0 || observances.length > 0;
  return (
    <View style={{ marginTop: spacing.lg }}>
      <ThemedText variant="small" weight="medium" color="secondary">
        {t('festivalsObservances')}
      </ThemedText>
      {hasAny ? (
        <View style={{ marginTop: 4 }}>
          {festivals.map((f) => (
            <FestivalRow key={f.id} title={language === 'ta' ? f.nameTa : f.nameEn} subtitle={f.isHoliday ? t('holiday') : null} dateLabel={''} category={f.category} />
          ))}
          {observances.map((o) => (
            <FestivalRow key={o.kind} title={language === 'ta' ? o.nameTa : o.nameEn} dateLabel={''} />
          ))}
        </View>
      ) : (
        <ThemedText variant="small" color="secondary" style={{ marginTop: 4 }}>
          {t('festivalUnavailable')}
        </ThemedText>
      )}
    </View>
  );
}

function Header({ onSearchPress, onSettingsPress }: { onSearchPress: () => void; onSettingsPress: () => void }) {
  const t = useT();
  const { colors } = useThemeColors();
  return (
    <View style={styles.headerRow}>
      <View style={[styles.logoDot, { backgroundColor: colors.primary }]}>
        <ThemedText variant="h4" weight="bold" color="onMaroon">
          த
        </ThemedText>
      </View>
      <ThemedText variant="h3" weight="bold" style={{ flex: 1, marginLeft: spacing.md }}>
        {t('appName')}
      </ThemedText>
      <Pressable onPress={onSearchPress} accessibilityRole="button" accessibilityLabel={t('tabSearch')} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="search" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={onSettingsPress} accessibilityRole="button" accessibilityLabel={t('tabSettings')} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name="settings-outline" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function TodayHero({
  data,
  numerals,
  language,
  onSelectDate,
  onNav,
  selectedKey,
  firstDayOfWeek,
  t,
}: {
  data: HomeData;
  numerals: string;
  language: string;
  onSelectDate: (key: string) => void;
  onNav: (key: string) => void;
  selectedKey: string;
  firstDayOfWeek: 0 | 1;
  t: (k: string) => string;
}) {
  const { colors } = useThemeColors();
  const parts = parseDateKey(selectedKey);
  const selectedTamilMonthName = useMemo(
    () => tamilMonthsSpanningGregorianMonth(parts.year, parts.month, language as 'ta' | 'en'),
    [parts.year, parts.month, language]
  );
  return (
    <Card style={{ padding: 0, marginBottom: spacing.xl, overflow: 'hidden' }}>
        {/* Brand band — Tamil date on the app's signature maroon; the one
            place the identity color is used at full strength. */}
      <View style={[stylesTodayHero.heroBand, { backgroundColor: colors.primary }]}>
        <ThemedText variant="caption" color="gold" weight="medium">
          {t('today')} • {data.selectedGregorianLabel}
        </ThemedText>
        <ThemedText variant="h2" weight="bold" color="onMaroon" style={{ marginTop: 2 }} tamil>
          {data.selectedTamilLabel}
        </ThemedText>
      </View>
      <View style={[stylesTodayHero.calendarArea, { borderBottomColor: colors.border }]}>
        <MonthSelector
          monthName={data.selectedMonthName}
          tamilMonthName={selectedTamilMonthName}
          year={parts.year}
          numerals={String(parts.year)}
          onPrev={() => onNav(shiftMonth(selectedKey, -1))}
          onNext={() => onNav(shiftMonth(selectedKey, 1))}
          onToday={() => onNav(data.todayKey)}
          onTitlePress={() => onNav(selectedKey)}
          prevLabel={t('previousMonth')}
          nextLabel={t('nextMonth')}
          todayLabel={t('jumpToToday')}
        />
      </View>
      <CalendarGrid
        weeks={data.grid}
        firstDayOfWeek={firstDayOfWeek}
        language={language as 'ta' | 'en'}
        numerals={numerals as 'arabic' | 'tamil'}
        showTamilDate
        selectedKey={selectedKey}
        onSelectDate={onSelectDate}
      />
    </Card>
  );
}

const stylesTodayHero = StyleSheet.create({
  heroBand: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  /** Keeps the month selector arrows away from the screen edges and gives
   *  the calendar block a clean inset inside the hero card. */
  calendarArea: {
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

function shiftMonth(key: string, delta: number): string {
  const { year, month, day } = parseDateKey(key);
  const total = year * 12 + month - 1 + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(ny, nm, 0).getDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function QuickActions({
  t,
  onAnnual,
  onFestivals,
  onSearch,
  onReminders,
}: {
  t: (k: string) => string;
  onAnnual: () => void;
  onFestivals: () => void;
  onSearch: () => void;
  onReminders: () => void;
}) {
  const { colors } = useThemeColors();
  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'calendar-clear-outline', label: t('annualCalendar'), onPress: onAnnual },
    { icon: 'star-outline', label: t('tabFestivals'), onPress: onFestivals },
    { icon: 'search-outline', label: t('tabSearch'), onPress: onSearch },
    { icon: 'notifications-outline', label: t('reminders'), onPress: onReminders },
  ];
  return (
    <View>
      <SectionHeader title={t('quickActions')} />
      <View style={styles.quickGrid}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [
              styles.quickTile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name={a.icon} size={24} color={colors.primary} />
            <ThemedText variant="small" style={{ marginTop: 8, textAlign: 'center' }} numberOfLines={2}>
              {a.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  logoDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    height: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickTile: {
    flexGrow: 1,
    flexBasis: '44%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
