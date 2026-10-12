import React, { useMemo, useCallback, useState } from 'react';
import { FlatList, Pressable, View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { SectionHeader } from '@/components/SectionHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing, minTouchTarget } from '@/theme/spacing';
import { NAVIGABLE_START_YEAR, NAVIGABLE_END_YEAR } from '@/data/constants';
import { localTodayKey, parseDateKey } from '@/utils/dates';

export default function YearPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const t = useT();
  const { colors } = useThemeColors();
  const numerals = useSettingsStore((s) => s.numerals);
  const todayKey = useMemo(() => localTodayKey(), []);
  const currentYear = parseDateKey(todayKey).year;
  const initialYear = params.year ? parseInt(params.year, 10) : currentYear;
  const [selectedYear, setSelectedYear] = useState(initialYear);

  const years = useMemo(() => {
    const list: { year: number; group: 'past' | 'current' | 'future' }[] = [];
    for (let y = NAVIGABLE_START_YEAR; y <= NAVIGABLE_END_YEAR; y++) {
      list.push({ year: y, group: y < currentYear ? 'past' : y === currentYear ? 'current' : 'future' });
    }
    return list;
  }, [currentYear]);

  // Start scrolled to the initially selected year.
  const initialIndex = Math.max(0, years.findIndex((y) => y.year === initialYear));

  const onPick = useCallback(
    (year: number) => {
      const month = params.month ? parseInt(params.month, 10) : undefined;
      router.replace({
        pathname: '/(tabs)/calendar',
        params: { year: String(year), ...(month ? { month: String(month) } : {}) },
      });
    },
    [router, params.month]
  );

  interface RenderProps {
    index: number;
  }

  // Group headers computed on the fly (FlatList with section emulation).
  let lastGroup: 'past' | 'current' | 'future' | null = null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.header}>
        <ThemedText variant="h3" weight="bold">
          {t('yearPickerTitle')}
        </ThemedText>
        <Pressable
          onPress={() => onPick(currentYear)}
          accessibilityRole="button"
          accessibilityLabel={t('currentYear')}
          style={({ pressed }) => [
            styles.todayBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <ThemedText variant="small" color="onMaroon" weight="medium">
            {t('currentYear')}
          </ThemedText>
        </Pressable>
      </View>
      <FlatList
        initialNumToRender={initialIndex + 12}
        data={years}
        keyExtractor={(item) => String(item.year)}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
        renderItem={({ item }) => {
          const showHeader = item.group !== lastGroup;
          lastGroup = item.group;
          const groupTitle =
            item.group === 'past'
              ? t('previousYears')
              : item.group === 'current'
                ? t('currentYear')
                : t('futureYears');
          return (
            <View>
              {showHeader ? <SectionHeader title={groupTitle} /> : null}
              <Pressable
                onPress={() => {
                  setSelectedYear(item.year);
                  onPick(item.year);
                }}
                accessibilityRole="button"
                accessibilityLabel={String(item.year)}
                accessibilityState={{ selected: item.year === selectedYear }}
                style={({ pressed }) => [
                  styles.yearRow,
                  { opacity: pressed ? 0.7 : 1 },
                  item.year === selectedYear && { backgroundColor: colors.primaryMuted },
                ]}
              >
                <ThemedText
                  variant="body"
                  weight={item.year === currentYear ? 'bold' : 'regular'}
                  color={item.year === selectedYear ? 'primary' : 'default'}
                >
                  {item.year}
                </ThemedText>
              </Pressable>
            </View>
          );
        }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
      />
    </SafeAreaView>
  );
}

const ROW_H = minTouchTarget + 8;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
  },
  yearRow: {
    minHeight: ROW_H,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
});
