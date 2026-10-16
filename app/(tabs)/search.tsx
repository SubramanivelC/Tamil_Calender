import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FlatList, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';
import { useSettingsStore } from '@/store/settingsStore';
import {
  search,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  type SearchResult,
} from '@/database/repositories/searchRepo';
import { spacing, minTouchTarget } from '@/theme/spacing';

export default function SearchScreen() {
  const router = useRouter();
  const t = useT();
  const { colors } = useThemeColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    void getRecentSearches().then(setRecent);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const found = await search(q);
    setResults(found);
    setSearched(true);
    if (q.trim().length >= 2) {
      await addRecentSearch(q);
      setRecent(await getRecentSearches());
    }
  }, []);

  const onChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.trim().length === 0) {
        setResults([]);
        setSearched(false);
        return;
      }
      debounceRef.current = setTimeout(() => {
        void runSearch(text);
      }, 220);
    },
    [runSearch]
  );

  const kindLabel = (r: SearchResult) => {
    switch (r.kind) {
      case 'festival': return t('tabFestivals');
      case 'observance': return t('categoryObservance');
      case 'note': return t('addNote');
      case 'tamil_month': return t('selectMonth');
      case 'date': return t('gregorianDate');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <ThemedTextInputStyled
            value={query}
            onChangeValue={onChange}
            placeholder={t('searchPlaceholder')}
            placeholderText={colors.textSecondary}
            textValue={colors.text}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => onChange('')}
              accessibilityRole="button"
              accessibilityLabel={t('clear')}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        ListHeaderComponent={
          !searched && recent.length > 0 ? (
            <View>
              <SectionHeader
                title={t('recentSearches')}
                actionLabel={t('clear')}
                onAction={() => {
                  void clearRecentSearches().then(() => setRecent([]));
                }}
              />
              <View style={styles.recentWrap}>
                {recent.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => {
                      setQuery(q);
                      void runSearch(q);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('recentSearches')}: ${q}`}
                    style={[styles.recentChip, { backgroundColor: colors.surfaceMuted }]}
                  >
                    <ThemedText variant="caption">{q}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        data={query.trim().length > 0 ? results : []}
        keyExtractor={(item, i) => `${item.kind}-${item.refKey}-${i}`}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              if (item.dateKey) {
                router.push({ pathname: '/(tabs)/calendar', params: { view: 'today', date: item.dateKey } });
              } else if (item.kind === 'tamil_month') {
                router.push('/(tabs)/calendar');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${kindLabel(item)}: ${item.title}`}
            style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.75 : 1 }]}
          >
            <ThemedText variant="caption" color="secondary">
              {kindLabel(item)}
            </ThemedText>
            <ThemedText variant="body" weight="medium" numberOfLines={2}>
              {item.title}
            </ThemedText>
            {item.subtitle ? (
              <ThemedText variant="small" color="secondary" numberOfLines={1}>
                {item.subtitle}
              </ThemedText>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          searched && query.trim().length > 0 && results.length === 0 ? (
            <EmptyState icon="search-outline" title={t('noResults')} message={t('noResultsHint')} />
          ) : !searched && recent.length === 0 ? (
            <EmptyState icon="search-outline" title={t('searchHint')} message={t('searchPlaceholder')} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

import { TextInput, type TextInputProps } from 'react-native';

interface StyledInputProps extends TextInputProps {
  value: string;
  onChangeValue: (t: string) => void;
  placeholderText: string;
  textValue: string;
}

function ThemedTextInputStyled(props: StyledInputProps) {
  const { onChangeValue, placeholderText, textValue, ...rest } = props;
  return (
    <TextInput
      {...rest}
      placeholder={placeholderText}
      placeholderTextColor={placeholderText}
      onChangeText={onChangeValue}
      style={{ color: textValue, flex: 1, fontSize: 15, marginLeft: 10, minHeight: 40 }}
      autoCorrect={false}
    />
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 46,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: 'center',
  },
  resultRow: {
    paddingVertical: spacing.md,
    minHeight: minTouchTarget,
  },
});
