import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Icon } from '../Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, minTouchTarget } from '@/theme/spacing';

interface MonthSelectorProps {
  monthName: string;
  year: number;
  numerals: string;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
  onTitlePress?: () => void;
  prevLabel: string;
  nextLabel: string;
  todayLabel?: string;
}

export function MonthSelector({
  monthName,
  year,
  numerals,
  onPrev,
  onNext,
  onToday,
  onTitlePress,
  prevLabel,
  nextLabel,
  todayLabel,
}: MonthSelectorProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel={prevLabel}
        hitSlop={8}
        style={styles.arrow}
      >
        <Icon name="chevron-back" accessibilityLabel={prevLabel} color="primary" />
      </Pressable>
      <Pressable
        onPress={onTitlePress}
        accessibilityRole="button"
        accessibilityLabel={`${monthName} ${year}`}
        style={{ minHeight: minTouchTarget, justifyContent: 'center' }}
      >
        <ThemedText variant="h3" weight="bold" style={{ textAlign: 'center' }}>
          {monthName} {numerals}
        </ThemedText>
      </Pressable>
      <View style={styles.rightSide}>
        {onToday ? (
          <Pressable
            onPress={onToday}
            accessibilityRole="button"
            accessibilityLabel={todayLabel ?? 'Today'}
            hitSlop={6}
            style={({ pressed }) => [
              styles.todayPill,
              { backgroundColor: theme.colors.primaryMuted, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText variant="small" color="primary" weight="medium">
              {todayLabel}
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          hitSlop={8}
          style={styles.arrow}
        >
          <Icon name="chevron-forward" accessibilityLabel={nextLabel} color="primary" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  arrow: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: spacing.sm,
    minHeight: 30,
    justifyContent: 'center',
  },
});
