import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';

interface TimeRowProps {
  label: string;
  value: string | null;
  /** Show a soft '≈' marker for approximated (non-verified) values. */
  approximate?: boolean;
}

export function TimeRow({ label, value, approximate = false }: TimeRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value ?? '—'}`}>
      <ThemedText variant="body" color="secondary">
        {label}
      </ThemedText>
      <ThemedText variant="body" weight="medium">
        {value ? `${approximate ? '≈ ' : ''}${value}` : '—'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    minHeight: 36,
  },
});
