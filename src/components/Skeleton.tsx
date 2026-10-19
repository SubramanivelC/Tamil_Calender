import React, { useEffect, useState } from 'react';
import { Animated, Easing, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius } from '@/theme/spacing';

/**
 * Placeholder-shaped loading (Apple HIG: loading should hint at what's
 * coming) — a gentle opacity pulse, no spinner. Blocks are theme-aware so
 * they read on both light and dark surfaces.
 */
export function Skeleton({
  width,
  height,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  // Animated.Value is held in state (created once) — useRef would evaluate
  // the constructor on every render, which react-hooks/refs forbids.
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as number | undefined,
          height,
          borderRadius: radius.xs,
          backgroundColor: theme.colors.surfaceMuted,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Day-details-shaped placeholder: hero card, time-band chips, rows. */
export function SkeletonDay() {
  return (
    <View style={styles.day}>
      <Skeleton width="30%" height={12} />
      <Skeleton width="70%" height={26} style={{ marginTop: spacing.md }} />
      <Skeleton width="55%" height={15} style={{ marginTop: spacing.sm }} />
      <Skeleton width="65%" height={15} style={{ marginTop: spacing.xs }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
        <Skeleton width="48%" height={64} style={{ borderRadius: radius.sm }} />
        <Skeleton width="48%" height={64} style={{ borderRadius: radius.sm }} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Skeleton width="48%" height={64} style={{ borderRadius: radius.sm }} />
        <Skeleton width="48%" height={64} style={{ borderRadius: radius.sm }} />
      </View>
      {[0, 1, 2].map((i) => (
        <Skeleton
          key={i}
          width={i % 2 ? '42%' : '58%'}
          height={15}
          style={{ marginTop: spacing.md }}
        />
      ))}
    </View>
  );
}

/** Festival-list-shaped placeholder: dot rows with title + date lines. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      <Skeleton width="30%" height={16} style={{ marginBottom: spacing.md }} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton width={7} height={7} style={styles.dot} />
          <View style={{ flex: 1 }}>
            <Skeleton width={i % 2 ? '64%' : '82%'} height={15} />
            <Skeleton width={90} height={11} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    flex: 1,
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  dot: {
    borderRadius: 4,
    marginRight: spacing.md,
  },
});
