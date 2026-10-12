import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemedText } from './ThemedText';

export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container} accessibilityLabel={label ?? ''}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {label ? (
        <ThemedText variant="small" color="secondary" style={{ marginTop: 10 }}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
