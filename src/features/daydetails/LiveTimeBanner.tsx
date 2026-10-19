import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import type { PanchangamRecord } from '@/types';
import { spacing } from '@/theme/spacing';
import {
  parseTimeWindows,
  activeWindow,
  nextWindow,
  currentMinutesOfDay,
  minutesToHhmm,
  type TimeWindow,
} from '@/utils/timeWindows';

/**
 * The "what is happening NOW" hook Drik Panchang coined its retention on:
 * a live banner above the Today view that says which time band is running
 * (or how far away the next one is), refreshed every 30 seconds.
 *
 * Shows nothing once every band of the day has passed — a calm evening
 * instead of stale noise.
 */
export function LiveTimeBanner({ record }: { record: PanchangamRecord }) {
  const t = useT();
  const { colors } = useThemeColors();
  const [nowMin, setNowMin] = useState<number>(() => currentMinutesOfDay());

  useEffect(() => {
    const id = setInterval(() => setNowMin(currentMinutesOfDay()), 30_000);
    return () => clearInterval(id);
  }, []);

  const bands: {
    name: string;
    windows: TimeWindow[];
    tone: 'good' | 'warn' | 'info';
  }[] = [
    { name: t('rahuKalam'), windows: parseTimeWindows(record.rahuKalam), tone: 'warn' },
    { name: t('yamagandam'), windows: parseTimeWindows(record.yamagandam), tone: 'warn' },
    { name: t('kuligai'), windows: parseTimeWindows(record.kuligai), tone: 'warn' },
    { name: t('nallaNeram'), windows: parseTimeWindows(record.nallaNeram), tone: 'good' },
  ];

  // Inauspicious bands take precedence: when Rahu Kalam overlaps a
  // favourable Gowri window, the user still needs the warning.
  const active = bands.find((b) => activeWindow(b.windows, nowMin));
  if (active) {
    const w = activeWindow(active.windows, nowMin)!;
    return (
      <Banner
        tone={active.tone}
        icon={active.tone === 'good' ? 'sunny-outline' : 'alert-circle'}
        color={active.tone === 'good' ? colors.success : colors.error}
        text={t('bannerNowUntil', { band: active.name, time: minutesToHhmm(w.end) })}
      />
    );
  }

  // Otherwise: earliest upcoming band of the day, inauspicious or not.
  let upcoming: { band: (typeof bands)[number]; window: TimeWindow } | null = null;
  for (const band of bands) {
    const w = nextWindow(band.windows, nowMin);
    if (w && (upcoming === null || w.start < upcoming.window.start)) {
      upcoming = { band, window: w };
    }
  }
  if (!upcoming) return null;

  const mins = upcoming.window.start - nowMin;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur = h > 0 ? t('durHm', { h, m }) : t('durMin', { m });
  return (
    <Banner
      tone="info"
      icon="time-outline"
      color={colors.info}
      text={t('bannerStartsIn', {
        band: upcoming.band.name,
        dur,
        time: minutesToHhmm(upcoming.window.start),
      })}
    />
  );
}

function Banner({
  tone,
  icon,
  color,
  text,
}: {
  tone: 'good' | 'warn' | 'info';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
}) {
  const tints = {
    good: 'rgba(63, 98, 18, 0.10)',
    warn: 'rgba(179, 38, 30, 0.08)',
    info: 'rgba(29, 78, 216, 0.08)',
  } as const;
  return (
    <View style={[styles.banner, { backgroundColor: tints[tone] }]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={18} color={color} />
      <ThemedText variant="small" weight="medium" style={{ flex: 1, flexShrink: 1, color }} numberOfLines={2}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
  },
});
