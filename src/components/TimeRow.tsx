import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';
import { cleanBilingualValue } from '@/utils/bilingual';
import type { Language } from '@/types';

interface TimeRowProps {
  label: string;
  value: string | null;
  /** Show a soft '≈' marker for approximated (non-verified) values. */
  approximate?: boolean;
  /** Current UI language, used to strip the other script from bilingual
   *  dataset values (e.g. 'பிரதமை / Prathamai'). Defaults to English
   *  when omitted so the row never renders mixed scripts. */
  language?: Language;
}

export function TimeRow({ label, value, approximate = false, language = 'en' }: TimeRowProps) {
  const theme = useTheme();
  const cleaned = value ? cleanBilingualValue(value, language) : null;
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${cleaned ?? '—'}`}>
      <ThemedText variant="body" color="secondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText variant="body" weight="medium" style={styles.value}>
        {cleaned ? `${approximate ? '≈ ' : ''}${cleaned}` : '—'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    minHeight: 36,
  },
  // Label shrinks (may wrap to 2 lines) instead of pushing the value off-screen.
  label: {
    flexShrink: 1,
    paddingRight: 8,
  },
  // Value takes the remaining width and wraps — long values never clip.
  value: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
});
