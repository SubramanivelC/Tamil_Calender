import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { useT } from '@/localization';
import { useRasiPalam } from '@/features/rasiPalam/useRasiPalam';
import { useSettingsStore } from '@/store/settingsStore';
import { cleanBilingualValue } from '@/utils/bilingual';
import { spacing } from '@/theme/spacing';

/**
 * Today's Rasi Palan card for a date (moved out of the Home screen).
 * Rendering is intentionally identical to the old Home card; only the
 * navigation changed — both actions now open the Settings screen, where
 * the rasi is selected.
 */
export function RasiPalamCard({ dateKey }: { dateKey: string }) {
  const router = useRouter();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
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
};
