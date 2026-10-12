import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: 'default' | 'secondary' | 'primary' | 'gold' | 'onMaroon';
  /** Required accessibility label for interactive icons. */
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'image';
  onPress?: () => void;
}

export function Icon({
  name,
  size = 22,
  color = 'default',
  accessibilityLabel,
  accessibilityRole = 'image',
  onPress,
}: IconProps) {
  const theme = useTheme();
  const colorValue =
    color === 'secondary'
      ? theme.colors.textSecondary
      : color === 'primary'
        ? theme.colors.primary
        : color === 'gold'
          ? theme.colors.gold
          : color === 'onMaroon'
            ? theme.colors.textOnMaroon
            : theme.colors.text;

  return (
    <Ionicons
      name={name}
      size={size}
      color={colorValue}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
    />
  );
}
