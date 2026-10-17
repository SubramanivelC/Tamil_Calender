import React from 'react';
import { View, ViewProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { shadows } from '@/theme/spacing';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'muted' | 'accent';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function ThemedView({
  variant = 'background',
  style,
  children,
  ...rest
}: ThemedViewProps) {
  const theme = useTheme();
  const bg =
    variant === 'surface'
      ? theme.colors.surface
      : variant === 'muted'
        ? theme.colors.surfaceMuted
        : variant === 'accent'
          ? theme.colors.surfaceAccent
          : theme.colors.background;
  return (
    <View {...rest} style={StyleSheet.flatten([{ backgroundColor: bg }, style])}>
      {children}
    </View>
  );
}

/** Elevated Card with subtle border + restrained shadow. */
export function Card({
  style,
  children,
  ...rest
}: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={StyleSheet.flatten([
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        },
        shadows.card,
        style,
      ])}
    >
      {children}
    </View>
  );
}

/** Screen-level container with standard margins. */
export function ScreenContainer({
  children,
  style,
  ...rest
}: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={StyleSheet.flatten([
        { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.lg },
        style,
      ])}
    >
      {children}
    </View>
  );
}
