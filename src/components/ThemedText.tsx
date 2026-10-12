import React from 'react';
import { Text, TextProps, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useTheme, useFontScale } from '@/theme/ThemeProvider';

export type ThemedTextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyLarge'
  | 'small'
  | 'caption';

interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  color?: 'default' | 'secondary' | 'primary' | 'onMaroon' | 'gold' | 'error';
  weight?: 'regular' | 'medium' | 'bold';
  tamil?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const fontSizeByVariant: Record<ThemedTextVariant, number> = {
  display: 34,
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  bodyLarge: 16,
  body: 15,
  small: 13,
  caption: 12,
};

export function ThemedText({
  variant = 'body',
  color = 'default',
  weight = 'regular',
  tamil = true,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const scale = useFontScale();

  const colorValue =
    color === 'secondary'
      ? theme.colors.textSecondary
      : color === 'primary'
        ? theme.colors.primary
        : color === 'onMaroon'
          ? theme.colors.textOnMaroon
          : color === 'gold'
            ? theme.colors.gold
            : color === 'error'
              ? theme.colors.error
              : theme.colors.text;

  return (
    <Text
      {...rest}
      style={StyleSheet.flatten([
        {
          fontSize: fontSizeByVariant[variant] * scale,
          color: colorValue,
          fontWeight: weight === 'bold' ? '700' : weight === 'medium' ? '600' : '400',
        },
        style,
      ])}
    >
      {children}
    </Text>
  );
}
