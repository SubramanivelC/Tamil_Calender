import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DayDetailsContent } from '@/features/daydetails/DayDetailsContent';
import { isValidDateKey, localTodayKey } from '@/utils/dates';

export default function DayDetailsScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  // Guard: some entry points (e.g. the Reminders quick action) navigate here
  // without a `date` param — fall back to today instead of crashing on
  // `parseDateKey('')`.
  const passable = typeof date === 'string' && isValidDateKey(date) ? date : null;
  const dateKey = passable ?? localTodayKey();
  const { colors } = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <DayDetailsContent
        dateKey={dateKey}
        onChangeDate={(key) => router.setParams({ date: key })}
        onBack={() => router.back()}
        onAddEvent={() => router.push({ pathname: '/add-event', params: { date: dateKey } })}
      />
    </SafeAreaView>
  );
}
