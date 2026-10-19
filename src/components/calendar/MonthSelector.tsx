import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { Icon } from '../Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, minTouchTarget } from '@/theme/spacing';

interface MonthSelectorProps {
  monthName: string;
  /** Optional Tamil month line, shown under the title so both scripts fit. */
  tamilMonthName?: string | null;
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
  tamilMonthName,
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
        accessibilityLabel={`${monthName}${tamilMonthName ? ` / ${tamilMonthName}` : ''} ${year}`}
        style={styles.titleWrap}
      >
        {/* Both month names wrap instead of clipping; h3 on narrow screens
            scales down via adjustsFontSizeToFit (never below ~14pt). */}
        <ThemedText
          variant="h3"
          weight="bold"
          style={styles.title}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={2}
        >
          {monthName} {numerals}
        </ThemedText>
        {tamilMonthName ? (
          <ThemedText
            variant="small"
            color="primary"
            weight="medium"
            style={styles.subTitle}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
          >
            {tamilMonthName}
          </ThemedText>
        ) : null}
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
            <ThemedText variant="small" color="primary" weight="medium" numberOfLines={1}>
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
  // Title area owns the leftover space and can wrap to 2 lines.
  titleWrap: {
    flex: 1,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: 2,
  },
  title: {
    textAlign: 'center',
  },
  subTitle: {
    textAlign: 'center',
    marginTop: 1,
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
    minHeight: 36,
    justifyContent: 'center',
  },
});
