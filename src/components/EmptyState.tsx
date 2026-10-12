import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function EmptyState({ icon, title, message, retryLabel, onRetry }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Icon name={icon} size={40} color="secondary" accessibilityLabel="" />
      <ThemedText variant="h4" weight="bold" style={{ marginTop: 12, textAlign: 'center' }}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText
          variant="body"
          color="secondary"
          style={{ marginTop: 6, textAlign: 'center' }}
        >
          {message}
        </ThemedText>
      ) : null}
      {retryLabel && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <ThemedText variant="body" color="onMaroon" weight="medium">
            {retryLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  retry: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
  },
});
