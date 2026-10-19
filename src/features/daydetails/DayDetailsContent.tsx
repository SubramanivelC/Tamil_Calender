import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Pressable, StyleSheet, TextInput, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/ThemedView';
import { SectionHeader } from '@/components/SectionHeader';
import { TimeRow } from '@/components/TimeRow';
import { FestivalRow } from '@/components/FestivalRow';
import { SkeletonDay } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT, gregorianMonthName } from '@/localization';
import { cleanBilingualValue } from '@/utils/bilingual';
import { useSettingsStore } from '@/store/settingsStore';
import { useDayDetails } from '@/features/daydetails/useDayDetails';
import { AllRasisPalamCard } from '@/features/rasiPalam/AllRasisPalamCard';
import { LiveTimeBanner } from '@/features/daydetails/LiveTimeBanner';
import { saveNote as saveNoteToDb, toggleBookmark } from '@/database/repositories/userDataRepo';
import { useRemindersStore } from '@/store/remindersStore';
import { getEventsForDate, deleteEvent } from '@/database/repositories/eventsRepo';
import type { UserEvent, ReminderDefinition, Language } from '@/types';
import { DEFAULT_REMINDER_HHMM } from '@/data/constants';
import { spacing, radius } from '@/theme/spacing';
import { formatTimeWithMeridiem } from '@/utils/numerals';
import { localTodayKey, parseDateKey } from '@/utils/dates';

import { selectionTick, lightTap, successTick } from '@/utils/haptics';


/**
 * Full single-day detail content — the "Today View" of the Calendar tab.
 * Self-contained: loads panchangam, festivals, observances, note, bookmark,
 * events and reminders for `dateKey`.
 *
 * Host decides navigation:
 * - `onChangeDate` is called for the previous/next-day and "jump to today"
 *   controls (e.g. update a URL param in the day-details screen, or local
 *   state inside the Calendar tab).
 * - `onBack` backs out to the previous screen. Sits in the top bar.
 * - `bottomPadding` reserves space so content stays readable above the
 *   floating view toggle when embedded in the Calendar tab.
 */
export function DayDetailsContent({
  dateKey,
  onChangeDate,
  onBack,
  onAddEvent,
  bottomPadding,
}: {
  dateKey: string;
  onChangeDate: (key: string) => void;
  onBack: () => void;
  onAddEvent: () => void;
  bottomPadding?: number;
}) {
  const t = useT();
  const { colors } = useThemeColors();
  const language = useSettingsStore((s) => s.language);
  const isToday = dateKey === localTodayKey();
  const { data, loading, previousKey, nextKey } = useDayDetails(dateKey, language);

  const [noteText, setNoteText] = useState<string>('');
  const [noteLoadedFor, setNoteLoadedFor] = useState<string>('');
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  // The dense almanac rows (tithi…paksha) stay tucked behind an expander so
  // the scannable time-band chips remain the visual focus.
  const [fullPanchangamOpen, setFullPanchangamOpen] = useState(false);

  // Reset the note/bookmark fields when the loaded data changes date —
  // adjusted during render (guarded by noteLoadedFor) rather than inside an
  // effect, which would trigger cascading renders.
  if (data && noteLoadedFor !== dateKey) {
    setNoteText(data.note ?? '');
    setNoteLoadedFor(dateKey);
    setBookmarked(data.bookmarked);
  }

  // Select the stable store slices directly — `remindersForDate` builds a new
  // array per snapshot, and an unstable zustand v5 selector causes an infinite
  // render loop ("Maximum update depth exceeded" crash). Compute instead.
  const remindersById = useRemindersStore((s) => s.byId);
  const remindersOrder = useRemindersStore((s) => s.order);
  const reminders = useMemo(
    () =>
      remindersOrder
        .map((id) => remindersById[id])
        .filter((r): r is ReminderDefinition => !!r && r.dateKey === dateKey),
    [remindersById, remindersOrder, dateKey]
  );
  const [dayEvents, setDayEvents] = useState<UserEvent[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const evs = await getEventsForDate(dateKey);
      if (!cancelled) setDayEvents(evs);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const onDeleteEvent = useCallback(async (id: number) => {
    const { cancelScheduledNotification } = await import('@/services/notificationService');
    const ev = dayEvents.find((e) => e.id === id);
    if (ev?.notificationId) await cancelScheduledNotification(ev.notificationId);
    await deleteEvent(id);
    setDayEvents((prev) => prev.filter((e) => e.id !== id));
  }, [dayEvents]);

  const onShare = useCallback(() => {
    if (!data) return;
    const lines = [
      `${data.weekdayLabel} — ${data.gregorianLabel}`,
      data.tamilMonthLabel ? `Tamil: ${data.tamilMonthLabel} ${data.tamilDay ?? ''} ${data.tamilYearLabel ?? ''}` : null,
      `Rahu Kalam: ${data.panchangam.record.rahuKalam ?? '—'}`,
      `Nalla Neram: ${data.panchangam.record.nallaNeram ?? '—'}`,
      ...data.festivals.map((f) => `• ${language === 'ta' ? f.nameTa : f.nameEn}`),
    ].filter(Boolean);
    void Share.share({ message: lines.join('\n') });
  }, [data, language]);

  const onToggleBookmark = useCallback(async () => {
    const next = !bookmarked;
    setBookmarked(next);
    if (next) successTick();
    await toggleBookmark(dateKey, next);
  }, [bookmarked, dateKey]);

  const onSaveNote = useCallback(async () => {
    await saveNoteToDb(dateKey, noteText.trim());
  }, [dateKey, noteText]);

  const onAddReminder = useCallback(async () => {
    await useRemindersStore.getState().addReminder({
      dateKey,
      time: DEFAULT_REMINDER_HHMM,
      title: t('addReminder'),
      body: data ? `${data.weekdayLabel} ${data.gregorianLabel}` : dateKey,
      repeat: 'none',
    });
  }, [dateKey, data, t]);

  // Placeholder-shaped loading: hints at the coming layout instead of a
  // blank spinner (Apple HIG loading guidance).
  if (loading) return <SkeletonDay />;
  if (!data) {
    return (
      <EmptyState
        icon="calendar-outline"
        title={t('dataUnavailableTitle')}
        message={t('dataUnavailableMessage')}
      />
    );
  }

  const verified = data.panchangam.verified;
  const cleanedPaksha = data.pakshaLabel ? cleanBilingualValue(data.pakshaLabel, language) : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('back')} style={styles.topBarBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel={t('shareDetails')} hitSlop={8} style={styles.topBarBtn}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={onToggleBookmark} accessibilityRole="button" accessibilityLabel={bookmarked ? t('bookmarked') : t('bookmark')} hitSlop={8} style={styles.topBarBtn}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={bookmarked ? colors.primary : colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Prev / next day — fixed above the scrolling content so it is
          always visible without scrolling to the bottom. */}
      <View style={styles.dayNav}>
        <Pressable
          onPress={() => {
            lightTap();
            onChangeDate(previousKey);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('previousDay')}
          style={[styles.dayNavBtn, { minHeight: 44, minWidth: 44, justifyContent: 'center' }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <ThemedText variant="small" color="primary">
            {t('previousDay')}
          </ThemedText>
        </Pressable>
        <View style={styles.dayNavCenter}>
          <ThemedText variant="caption" color="secondary" style={styles.dayNavDate}>
            {data.gregorianLabel}
          </ThemedText>
          <Pressable
            disabled={isToday}
            onPress={() => onChangeDate(localTodayKey())}
            accessibilityRole="button"
            accessibilityLabel={t('jumpToToday')}
            accessibilityState={{ disabled: isToday }}
            style={[
              styles.dayNavTodayBtn,
              isToday && styles.dayNavTodayBtnActive,
            ]}
          >
            <ThemedText
              variant="small"
              weight="medium"
              color={isToday ? 'secondary' : 'primary'}
            >
              {t('jumpToToday')}
            </ThemedText>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            lightTap();
            onChangeDate(nextKey);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('nextDay')}
          style={[styles.dayNavBtn, { minHeight: 44, minWidth: 44, justifyContent: 'center' }]}
        >
          <ThemedText variant="small" color="primary">
            {t('nextDay')}
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomPadding ?? spacing.xxxl }}>
        <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
          <ThemedText variant="small" color="secondary">
            {dateKey}
          </ThemedText>
          <ThemedText variant="h2" weight="bold" style={{ marginTop: 4 }}>
            {data.weekdayLabel}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText variant="body" color="secondary" style={styles.metaRowKey}>
              {t('gregorianDate')}:
            </ThemedText>
            <ThemedText variant="body" style={styles.metaRowValue}>
              {elaboratedGregorian(dateKey, language)}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText variant="body" color="secondary" style={styles.metaRowKey}>
              {t('tamilDate')}:
            </ThemedText>
            <ThemedText variant="body" color="primary" weight="medium" style={styles.metaRowValue}>
              {data.tamilDay !== null && data.tamilMonthLabel
                ? `${data.tamilMonthLabel} ${data.tamilDay}${data.tamilYearLabel ? `, ${data.tamilYearLabel}` : ''}`
                : `${t('dataUnavailableTitle')}`}
            </ThemedText>
          </View>
        </Card>

        {/* Live band banner — today only; shows what time band is running
            now or how far away the next one is (refreshes every 30s). */}
        {isToday ? (
          <View style={{ marginBottom: spacing.xl }}>
            <LiveTimeBanner record={data.panchangam.record} />
          </View>
        ) : null}

        {/* Panchangam — redesigned for scanning: the four peak-attention
            time bands as prominent chips first, then sunrise/moon events,
            with the dense almanac rows (Tithi… Paksha) tucked behind a
            "full panchangam" expander per Material 3 list hierarchy. */}
        <SectionHeader title={t('panchangamSummary')} />
        <Card style={{ padding: spacing.lg, marginBottom: spacing.xl }}>
          <ThemedText variant="small" weight="medium" color="secondary" style={styles.groupLabel}>
            {t('timeBands')}
          </ThemedText>
          <View style={styles.chipGrid}>
            {(
              [
                [t('nallaNeram'), data.panchangam.record.nallaNeram, !verified],
                [t('rahuKalam'), data.panchangam.record.rahuKalam, false],
                [t('yamagandam'), data.panchangam.record.yamagandam, false],
                [t('kuligai'), data.panchangam.record.kuligai, false],
              ] as const
            ).map(([label, value, approximate]) => (
              <View key={label} style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
                <ThemedText variant="caption" color="secondary" numberOfLines={1}>
                  {approximate ? `≈ ${label}` : label}
                </ThemedText>
                <ThemedText variant="body" weight="medium" style={styles.chipValue}>
                  {value ? cleanBilingualValue(value, language) : '—'}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ThemedText variant="small" weight="medium" color="secondary" style={styles.groupLabel}>
            {t('riseAndSet')}
          </ThemedText>
          <TimeRow label={t('sunrise')} value={data.panchangam.record.sunrise} approximate={!verified} language={language} />
          <TimeRow label={t('sunset')} value={data.panchangam.record.sunset} approximate={!verified} language={language} />
          <TimeRow label={t('moonrise')} value={data.panchangam.record.moonrise} language={language} />
          <TimeRow label={t('moonset')} value={data.panchangam.record.moonset} language={language} />

          <Pressable
            onPress={() => {
              selectionTick();
              setFullPanchangamOpen((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel={fullPanchangamOpen ? t('hideFullPanchangam') : t('showFullPanchangam')}
            accessibilityState={{ expanded: fullPanchangamOpen }}
            style={styles.fullToggle}
          >
            <ThemedText variant="small" color="primary" weight="medium">
              {fullPanchangamOpen ? t('hideFullPanchangam') : t('showFullPanchangam')}
            </ThemedText>
            <Ionicons name={fullPanchangamOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>
          {fullPanchangamOpen ? (
            <View>
              <TimeRow label={t('tithi')} value={data.panchangam.record.tithi} language={language} />
              <TimeRow label={t('nakshatra')} value={data.panchangam.record.nakshatra} language={language} />
              <TimeRow label={t('yoga')} value={data.panchangam.record.yoga} language={language} />
              <TimeRow label={t('karana')} value={data.panchangam.record.karana} language={language} />
              <TimeRow label={t('soolam')} value={data.panchangam.record.soolam} language={language} />
              <TimeRow label={t('parikaram')} value={data.panchangam.record.parikaram} language={language} />
              {cleanedPaksha ? (
                <TimeRow label={t('paksha')} value={cleanedPaksha} language={language} />
              ) : null}
            </View>
          ) : null}
        </Card>

        {/* Rasi Palan for all 12 rasis — the moon transits every rasi once
            a month, so each row is that rasi's own day forecast; the row
            for the user's rasi (Settings) is highlighted. */}
        <AllRasisPalamCard dateKey={dateKey} />

        {/* Festivals & observances */}
        <SectionHeader title={t('festivalsObservances')} />
        <View style={{ marginBottom: spacing.xl }}>
          {data.festivals.map((f) => (
            <FestivalRow
              key={f.id}
              title={language === 'ta' ? f.nameTa : f.nameEn}
              subtitle={f.isHoliday ? t('holiday') : null}
              // Day-first screen: every row is on the same date, so no date
              // column (and no countdown) here.
              dateLabel={''}
              category={f.category}
            />
          ))}
          {data.observances.map((o) => (
            <FestivalRow
              key={o.kind}
              title={language === 'ta' ? o.nameTa : o.nameEn}
              dateLabel={''}
            />
          ))}
          {data.festivals.length === 0 && data.observances.length === 0 ? (
            <ThemedText variant="small" color="secondary">
              {t('festivalUnavailable')}
            </ThemedText>
          ) : null}
        </View>

        {/* Note */}
        <SectionHeader title={t('note')} />
        <Card style={{ padding: spacing.md, marginBottom: spacing.lg }}>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t('notePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            accessibilityLabel={t('addNote')}
            style={[styles.noteInput, { color: colors.text }]}
          />
          <View style={styles.noteActions}>
            {data.note ? (
              <Pressable onPress={() => { void saveNoteToDb(dateKey, ''); setNoteText(''); }} accessibilityRole="button" accessibilityLabel={t('deleteNote')}>
                <ThemedText variant="small" color="error">
                  {t('deleteNote')}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={onSaveNote} accessibilityRole="button" accessibilityLabel={t('saveNote')} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <ThemedText variant="small" color="primary" weight="medium">
                {t('saveNote')}
              </ThemedText>
            </Pressable>
          </View>
        </Card>

        {/* User events */}
        <SectionHeader
          title={t('events')}
          actionLabel={t('addEvent')}
          onAction={onAddEvent}
        />
        <View style={{ marginBottom: spacing.xl }}>
          {dayEvents.map((ev) => (
            <View key={ev.id} style={[styles.reminderRow]}>
              <Ionicons
                name={ev.kind === 'birthday' ? 'gift-outline' : ev.kind === 'anniversary' ? 'heart-outline' : 'star-outline'}
                size={18}
                color={colors.success}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText variant="body">{ev.title}</ThemedText>
                {ev.repeatYearly ? (
                  <ThemedText variant="caption" color="secondary">
                    {t('repeatYearly')}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => void onDeleteEvent(ev.id)}
                accessibilityRole="button"
                accessibilityLabel={t('deleteEventShort')}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
          {dayEvents.length === 0 ? (
            <ThemedText variant="small" color="secondary">
              {t('noEvents')}
            </ThemedText>
          ) : null}
        </View>

        {/* Reminders */}
        <SectionHeader title={t('reminders')} actionLabel={t('addReminder')} onAction={onAddReminder} />
        <View style={{ marginBottom: spacing.xl }}>
          {reminders.map((r) => (
            <View key={r.id} style={styles.reminderRow}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              <ThemedText variant="body" style={{ flex: 1, marginLeft: 10 }}>
                {formatTimeWithMeridiem(r.time, language)} · {r.title}
              </ThemedText>
              <Pressable
                onPress={() => useRemindersStore.getState().deleteReminder(r.id)}
                accessibilityRole="button"
                accessibilityLabel={t('deleteReminder')}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
          {reminders.length === 0 ? (
            <ThemedText variant="small" color="secondary">
              {t('noReminders')}
            </ThemedText>
          ) : null}
        </View>

      </ScrollView>
    </View>
  );
}

/** Elaborated `15 October 2026` (localized month name) instead of the
 *  weekday-prefixed label used in the top nav. */
function elaboratedGregorian(key: string, language: string): string {
  const { year, month, day } = parseDateKey(key);
  return `${day} ${gregorianMonthName(month, language as Language)} ${year}`;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 20,
  },
  topBarBtn: {
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 64,
  },
  chipValue: {
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  fullToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    minHeight: 44,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  metaRowKey: {
    flexShrink: 1,
    paddingRight: 4,
  },
  metaRowValue: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
  noteInput: {
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 15,
    padding: 4,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  dayNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dayNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dayNavDate: {
    textAlign: 'center',
  },
  dayNavCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNavTodayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    minHeight: 26,
    justifyContent: 'center',
  },
  dayNavTodayBtnActive: {
    opacity: 0.5,
  },
});
