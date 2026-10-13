import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView, Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { TimeRow } from '@/components/TimeRow';
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
import { spacing } from '@/theme/spacing';
import { localTodayKey, parseDateKey } from '@/utils/dates';

export default function HomeScreen() {
  const router = useRouter();
  const t = useT();
  const { colors } = useThemeColors();
  const numerals = useSettingsStore((s) => s.numerals);
  const language = useSettingsStore((s) => s.language);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const todayKey = useMemo(() => localTodayKey(), []);
  const todayParts = useMemo(() => parseDateKey(todayKey), [todayKey]);

  const scrollRef = useRef<ScrollView>(null);
  const detailsYRef = useRef(0);

  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const { data, loading, refetch } = useHomeData(selectedKey);

  // Double-tap detection on the calendar grid: a second tap on the same date
  // within the double-tap window opens the full day-details page; otherwise
  // the tap just selects the date and reveals the quick details inline below.
  const lastTapRef = useRef<{ key: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 300;

  const onSelectDate = useCallback(
    (key: string) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.key === key && now - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        setSelectedKey(key);
        router.push({ pathname: '/day-details', params: { date: key } });
        return;
      }
      lastTapRef.current = { key, time: now };
      setSelectedKey(key);
      scrollRef.current?.scrollTo({ y: detailsYRef.current, animated: true });
    },
    [router]
  );

  if (loading && !data) {
    return <LoadingView label={t('loading')} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        ref={scrollRef}
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

        {data ? (
          <>
            <View onLayout={(e) => (detailsYRef.current = e.nativeEvent.layout.y)}>
              <SectionHeader title={t('panchangamSummary')} />
            </View>
            <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
              {/* Printed-calendar order: Nalla Neram first. */}
              <TimeRow label={t('nallaNeram')} value={data.selectedPanchang.nallaNeram} approximate={!data.selectedVerified} language={language} />
              <TimeRow label={t('sunrise')} value={data.selectedPanchang.sunrise} approximate={!data.selectedVerified} language={language} />
              <TimeRow label={t('sunset')} value={data.selectedPanchang.sunset} approximate={!data.selectedVerified} language={language} />
              <TimeRow label={t('rahuKalam')} value={data.selectedPanchang.rahuKalam} language={language} />
              <TimeRow label={t('yamagandam')} value={data.selectedPanchang.yamagandam} language={language} />
              <TimeRow label={t('kuligai')} value={data.selectedPanchang.kuligai} language={language} />
              <TimeRow label={t('tithi')} value={data.selectedPanchang.tithi} language={language} />
              <TimeRow label={t('nakshatra')} value={data.selectedPanchang.nakshatra} language={language} />
              <TimeRow label={t('yoga')} value={data.selectedPanchang.yoga} language={language} />
              <TimeRow label={t('karana')} value={data.selectedPanchang.karana} language={language} />
              <FestivalsInline
                t={t}
                language={language}
                festivals={data.dayFestivals}
                observances={data.dayObservances}
              />
              <ThemedText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
                {t('doubleTapHint')}
              </ThemedText>
              <Pressable onPress={() => router.push({ pathname: '/day-details', params: { date: selectedKey } })}>
                <View style={{ alignSelf: 'flex-end', marginTop: spacing.md }}>
                  <ThemedText variant="small" color="primary" weight="medium">
                    {t('viewDetails')} →
                  </ThemedText>
                </View>
              </Pressable>
            </Card>

            <SectionHeader title={t('upcomingFestivals')} actionLabel={t('seeAll')} onAction={() => router.push('/(tabs)/festivals')} />
            <View style={{ marginBottom: spacing.xl }}>
              {data.upcoming.map((f) => (
                <FestivalRow
                  key={`${f.festivalId}-${f.dateKey}`}
                  title={t('language') === 'ta' ? f.nameTa : f.nameEn}
                  dateLabel={f.dateKey}
                  onPress={() => router.push({ pathname: '/day-details', params: { date: f.dateKey } })}
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
          onReminders={() => router.push('/day-details?panel=reminders')}
        />
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
            <FestivalRow key={f.id} title={language === 'ta' ? f.nameTa : f.nameEn} subtitle={f.isHoliday ? t('holiday') : null} dateLabel={''} festivalDotColor />
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
  const parts = parseDateKey(selectedKey);
  const selectedTamilMonthName = useMemo(
    () => tamilMonthsSpanningGregorianMonth(parts.year, parts.month, language as 'ta' | 'en'),
    [parts.year, parts.month, language]
  );
  return (
    <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
      <ThemedText variant="small" color="secondary">
        {t('today')} · {data.todayLabel}
      </ThemedText>
      <ThemedText variant="h2" weight="bold" style={{ marginTop: 4 }}>
        {data.selectedTamilLabel}
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
        {data.selectedGregorianLabel}
      </ThemedText>
      <View style={{ marginTop: spacing.lg }}>
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
              { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
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
    height: 40,
    minWidth: 40,
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
    borderColor: 'rgba(118,37,54,0.12)',
    padding: spacing.lg,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
