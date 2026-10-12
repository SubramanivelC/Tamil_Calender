import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

interface FestivalRowProps {
  title: string;
  subtitle?: string | null;
  dateLabel: string;
  festivalDotColor?: boolean;
  onPress?: () => void;
}

export function FestivalRow({
  title,
  subtitle,
  dateLabel,
  festivalDotColor = false,
  onPress,
}: FestivalRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${dateLabel}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {festivalDotColor ? (
        <View style={[styles.dot, { backgroundColor: theme.colors.festival }]} />
      ) : null}
      <View style={styles.textCol}>
        <ThemedText variant="body" weight="medium" numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="small" color="secondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText variant="small" color="secondary">
        {dateLabel}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  textCol: {
    flex: 1,
    marginRight: spacing.md,
  },
});
