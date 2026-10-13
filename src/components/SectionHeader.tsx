import React from 'react';
import { View, Pressable, StyleSheet, AccessibilityRole } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/theme/ThemeProvider';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText
        variant="h4"
        weight="bold"
        style={[{ color: theme.colors.text }, styles.title]}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={2}
      >
        {title}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <ThemedText variant="small" color="primary" weight="medium">
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Titles like "பண்டிகைகள் மற்றும் நோன்புகள்" shrink/wrap instead of pushing
  // the action link off-screen on narrow devices.
  title: {
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
});
