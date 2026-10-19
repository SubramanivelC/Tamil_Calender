import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, minTouchTarget } from '@/theme/spacing';

interface SettingsOptionRowProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

/** Labeled row with segmented pill-style choices. */
export function SettingsOptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SettingsOptionRowProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText variant="body" color="secondary" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.pills}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceMuted,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText
                variant="small"
                color={active ? 'onMaroon' : 'default'}
                weight={active ? 'medium' : 'regular'}
              >
                {o.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface SettingsToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/** Simple labeled toggle replacement using a Pressable switch-like row. */
export function SettingsToggleRow({ label, value, onChange, disabled }: SettingsToggleRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : () => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={styles.toggleRow}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <View
        style={[
          styles.track,
          {
            backgroundColor: value ? theme.colors.primary : theme.colors.surfaceMuted,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.knob,
            { transform: [{ translateX: value ? 16 : 0 }], backgroundColor: value ? theme.colors.textOnMaroon : theme.colors.textSecondary },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
  },
  label: {
    marginBottom: 8,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    // Rows of small pills are the Settings screen's primary controls —
    // keep them on the full minimum touch target.
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: minTouchTarget,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
