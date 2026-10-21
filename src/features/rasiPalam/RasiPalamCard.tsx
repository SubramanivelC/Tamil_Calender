import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { useT } from '@/localization';
import { useRasiPalam } from '@/features/rasiPalam/useRasiPalam';
import { useSettingsStore } from '@/store/settingsStore';
import { cleanBilingualValue } from '@/utils/bilingual';
import { formatNumerals, formatTimeWithMeridiem } from '@/utils/numerals';
import { spacing } from '@/theme/spacing';

/**
 * Today's Rasi Palan card for a date (moved out of the Home screen).
 * Rendering is intentionally identical to the old Home card; only the
 * navigation changed — both actions now open the Settings screen, where
 * the rasi is selected.
 *
 * Chandrashtama rendering is the mandated star-based convention:
 *  - the 8th nakshatra counted inclusively from the janma nakshatra,
 *  - the actual moon-occupancy interval (start/end instants, IST),
 *  - until the user stores a birth star the card asks for one instead of
 *    inventing a personalized verdict (the rasi-transit forecast stays).
 */
export function RasiPalamCard({ dateKey }: { dateKey: string }) {
  const router = useRouter();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  // Hooks stay unconditional: useRasiPalam returns null while unconfigured.
  const rasiPalam = useRasiPalam(dateKey);
  if (!rasiPalam) {
    return (
      <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
        <ThemedText variant="h4" weight="bold">
          {t('rasiPalam')}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
          {t('rasiPalamPrompt')}
        </ThemedText>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('selectRasiPalam')}
          style={({ pressed }) => [styles.rasiPromptBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <ThemedText variant="body" weight="medium" color="primary">
            {t('selectRasiPalam')} →
          </ThemedText>
        </Pressable>
      </Card>
    );
  }
  const p = rasiPalam.palam;
  const fmtStamp = (hhmm: string, dayKey: string): string => {
    const dayMarker = dayKey !== dateKey ? ` · ${t('nextDayMarker')}` : '';
    return `${formatTimeWithMeridiem(hhmm, language)}${dayMarker}`;
  };
  return (
    <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
      <ThemedText variant="h4" weight="bold">
        {t('rasiPalam')}
      </ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
        {cleanBilingualValue(rasiPalam.rasiName, language as 'ta' | 'en')}
      </ThemedText>
      <ThemedText variant="body" weight="medium" style={{ marginTop: spacing.md }}>
        {cleanBilingualValue(p.headline, language as 'ta' | 'en')}
      </ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
        {t('moonTransitRow')}: {t('transitFromRasi', { n: p.transit })}
      </ThemedText>

      {/* Star-based Chandrashtama — record + actual moon interval */}
      {rasiPalam.chandrashtama ? (
        <View style={styles.chandraBlock}>
          <ThemedText
            variant="body"
            weight="medium"
            color={rasiPalam.chandrashtama.status === 'active' ? 'error' : 'default'}
          >
            {rasiPalam.chandrashtama.status === 'active'
              ? t('chandrashtamaInterval')
              : t('nextChandrashtama')}
            : {cleanBilingualValue(rasiPalam.chandrashtama.starLabel, language as 'ta' | 'en')}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {t('chandrashtamaUntil')}:{' '}
            {formatNumerals(
              `${fmtStamp(rasiPalam.chandrashtama.startHHmm, rasiPalam.chandrashtama.startDayKey)} — ${fmtStamp(rasiPalam.chandrashtama.endHHmm, rasiPalam.chandrashtama.endDayKey)}`,
              numerals
            )}
          </ThemedText>
        </View>
      ) : rasiPalam.chandrashtamaNeedsStar ? (
        <ThemedText variant="caption" color="secondary" style={styles.chandraBlock}>
          {t('chandrashtamaNeedsStar')}
        </ThemedText>
      ) : null}

      <ThemedText variant="body" style={{ marginTop: spacing.md }}>
        {cleanBilingualValue(p.palam, language as 'ta' | 'en')}
      </ThemedText>
      <Pressable
        onPress={() => router.push('/(tabs)/settings')}
        accessibilityRole="button"
        accessibilityLabel={t('moreDetails')}
        style={({ pressed }) => [styles.rasiPromptBtn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <ThemedText variant="body" weight="medium" color="primary">
          {t('moreDetails')} →
        </ThemedText>
      </Pressable>
    </Card>
  );
}

const styles = {
  rasiPromptBtn: {
    alignSelf: 'flex-start' as const,
    marginTop: spacing.md,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center' as const,
  },
  chandraBlock: {
    marginTop: spacing.sm,
  },
};
