import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { useT } from '@/localization';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettingsStore } from '@/store/settingsStore';
import { cleanBilingualValue } from '@/utils/bilingual';
import { parseDateKey } from '@/utils/dates';
import {
  RASI_NAMES,
  computeDailyPalamForAllRasis,
  julianDayAtSunrise,
  type DailyPalam,
} from '@/data/rasiPalam';
import { getPanchangamForDate } from '@/database/repositories/panchangamRepo';
import { spacing } from '@/theme/spacing';

/**
 * Palam for ALL 12 rasis on a date (moon transits every rasi once a month,
 * so each row is that rasi's own day forecast). The user's configured rasi
 * (chosen in Settings, optionally by birth date/time) is highlighted.
 */
export function AllRasisPalamCard({ dateKey }: { dateKey: string }) {
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const myRasi = useSettingsStore((s) => s.rasiPalamRasi);

  const [rows, setRows] = useState<DailyPalam[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { year, month, day } = parseDateKey(dateKey);
      // Sunrise exactly as the panchangam card shows it; here it's
      // unverified-approximate so the whole list silently uses the same day.
      let sunrise: string | null = null;
      try {
        const { record } = await getPanchangamForDate(dateKey);
        sunrise = record.sunrise;
      } catch {
        // engine fallback (06:00) inside julianDayAtSunrise
      }
      const dayOfYear =
        Math.round(
          (new Date(year, month - 1, day).getTime() - new Date(year, 0, 1).getTime()) / 86400000
        ) + 1;
      const computed = computeDailyPalamForAllRasis(
        julianDayAtSunrise(year, month, day, sunrise),
        dayOfYear
      );
      if (!cancelled) setRows(computed);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return (
    <View>
      <SectionHeader title={t('allRasisPalam')} />
      <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
        {rows === null ? (
          <ThemedText variant="body" color="secondary">
            {t('loading')}
          </ThemedText>
        ) : (
          rows.map((row, rasi) => {
            const mine = myRasi === rasi;
            return (
              <View
                key={rasi}
                style={[styles.palamRow, { backgroundColor: colors.surfaceMuted }, mine && styles.palamRowSelected]}
              >
                <ThemedText
                  variant="small"
                  weight={mine ? 'medium' : 'regular'}
                  color={mine ? 'primary' : 'default'}
                  style={styles.palamRowName}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  numberOfLines={2}
                >
                  {cleanBilingualValue(RASI_NAMES[rasi] ?? '', language as 'ta' | 'en')}
                </ThemedText>
                <View style={styles.palamRowRight}>
                  <ThemedText
                    variant="small"
                    color={row.category === 'chandrashtama' ? 'error' : mine ? 'primary' : 'secondary'}
                  >
                    {cleanBilingualValue(row.headline, language as 'ta' | 'en')}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
        <ThemedText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
          {t('allRasisPalamHint')}
        </ThemedText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  palamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 40,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 8,
  },
  palamRowSelected: {
    backgroundColor: 'rgba(118, 37, 54, 0.14)',
  },
  palamRowName: {
    flexShrink: 1,
  },
  palamRowRight: {
    flexShrink: 1,
  },
});
