import React, { useMemo, useState, useCallback } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { FestivalRow } from '@/components/FestivalRow';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT, gregorianMonthName } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { getFestivalsForYear, type RawOccurrenceRow } from '@/database/repositories/festivalRepo';
import { spacing } from '@/theme/spacing';
import { localTodayKey, parseDateKey, diffCalendarDays } from '@/utils/dates';
import { formatNumerals } from '@/utils/numerals';
import { categoryColorName } from '@/components/FestivalRow';
import type { FestivalCategory } from '@/types';

const CATEGORIES: (FestivalCategory | 'all')[] = [
  'all',
  'tamil',
  'hindu',
  'national',
  'tamilnadu',
  'observance',
];

export default function FestivalsScreen() {
  const router = useRouter();
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const [category, setCategory] = useState<FestivalCategory | 'all'>('all');
  const [yearOffset, setYearOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Awaited<ReturnType<typeof getFestivalsForYear>>>([]);
  const numerals = useSettingsStore((s) => s.numerals);

  const todayKey = useMemo(() => localTodayKey(), []);
  const todayYear = parseDateKey(todayKey).year;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await getFestivalsForYear(todayYear + yearOffset);
      if (!cancelled) {
        setAll(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [todayYear, yearOffset]);

  const filtered = useMemo(
    () => all.filter((f) => category === 'all' || f.category === category),
    [all, category]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const f of filtered) {
      const { month, day } = parseDateKey(f.dateKey);
      const key = f.dateKey.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const catLabel = (c: FestivalCategory | 'all') => {
    switch (c) {
      case 'tamil': return t('categoryTamil');
      case 'hindu': return t('categoryHindu');
      case 'national': return t('categoryNational');
      case 'tamilnadu': return t('categoryTamilNadu');
      case 'observance': return t('categoryObservance');
      default: return t('categoryAll');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <ThemedText variant="h2" weight="bold">
          {t('tabFestivals')}
        </ThemedText>
        <View style={styles.categories}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: category === c }}
              style={[
                styles.catPill,
                category === c && { backgroundColor: colors.primary },
              ]}
            >
              <ThemedText
                variant="caption"
                color={category === c ? 'onMaroon' : 'secondary'}
                weight={category === c ? 'medium' : 'regular'}
              >
                {catLabel(c)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.yearNav}>
          <Pressable onPress={() => setYearOffset((y) => y - 1)} accessibilityRole="button" accessibilityLabel={t('previousYear')}>
            <ThemedText variant="body" color="primary">
              ‹ {t('previousYear')}
            </ThemedText>
          </Pressable>
          <ThemedText variant="h4" weight="bold">
            {formatNumerals(String(todayYear + yearOffset), numerals as 'arabic' | 'tamil')}
          </ThemedText>
          <Pressable onPress={() => setYearOffset((y) => y + 1)} accessibilityRole="button" accessibilityLabel={t('nextYear')}>
            <ThemedText variant="body" color="primary">
              {t('nextYear')} ›
            </ThemedText>
          </Pressable>
        </View>
        {/* Category color legend — the dots on the rows mean these. */}
        <View style={styles.legendRow}>
          {(
            [
              ['tamil', 'categoryTamil'],
              ['hindu', 'categoryHindu'],
              ['national', 'categoryNational'],
              ['tamilnadu', 'categoryTamilNadu'],
              ['observance', 'categoryObservance'],
            ] as const
          ).map(([cat, labelKey]) => (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[categoryColorName[cat]] }]} />
              <ThemedText variant="caption" color="secondary" numberOfLines={1}>
                {t(labelKey)}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        {loading ? (
          <SkeletonList rows={8} />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title={t('noResults')}
            message={t('festivalUnavailable')}
          />
        ) : (
          grouped.map(([monthKey, fests]) => (
            <View key={monthKey} style={{ marginBottom: spacing.md }}>
              <SectionHeader title={gregorianMonthName(parseInt(monthKey.slice(5), 10), language)} />
              {/* White card so rows read as cards on the ivory page, like
                  Home — without them the rows melt into the background. */}
              <Card style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
                {fests.map((f) => (
                  <FestivalRow
                    key={f.id}
                    title={language === 'ta' ? f.nameTa : f.nameEn}
                    subtitle={f.isHoliday ? t('holiday') : null}
                    dateLabel={f.dateKey}
                    category={f.category}
                    onPress={() => router.push({ pathname: '/(tabs)/calendar', params: { view: 'today', date: f.dateKey } })}
                  />
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(118,37,54,0.25)',
    minHeight: 32,
    justifyContent: 'center',
  },
  yearNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 40,
  },
});
