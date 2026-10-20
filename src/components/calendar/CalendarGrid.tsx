import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { weekdayName } from '@/localization';
import { ThemedText } from '@/components/ThemedText';
import type { DayCell, Language, NumeralStyle } from '@/types';
import { formatNumerals } from '@/utils/numerals';
import { ThaliMark } from '@/components/calendar/ThaliMark';
import { selectionTick } from '@/utils/haptics';
import { spacing, minTouchTarget } from '@/theme/spacing';

export interface CalendarGridProps {
  weeks: DayCell[];
  firstDayOfWeek: 0 | 1;
  language: Language;
  numerals: NumeralStyle;
  showTamilDate: boolean;
  selectedKey?: string | null;
  onSelectDate: (key: string) => void;
}

interface RenderCellProps {
  cell: DayCell;
  numerals: NumeralStyle;
  showTamilDate: boolean;
  selected: boolean;
  onPress: (key: string) => void;
}

function CalendarCell({
  cell,
  numerals,
  showTamilDate,
  selected,
  onPress,
}: RenderCellProps) {
  const theme = useTheme();
  const today = cell.isToday;
  const showTamil = showTamilDate && cell.tamilDay !== null;
  const weekend = cell.weekday === 0 || cell.weekday === 6;

  const fg = today
    ? theme.colors.textOnMaroon
    : selected
      ? theme.colors.primary
      : !cell.inMonth
        ? theme.colors.textSecondary
        : weekend
          ? theme.colors.textSecondary
          : theme.colors.text;

  return (
    <Pressable
      onPress={() => {
        selectionTick();
        onPress(cell.key);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${formatNumerals(String(cell.day), numerals)}${
        showTamil && cell.tamilDay !== null
          ? `, tamil ${formatNumerals(String(cell.tamilDay), numerals)}`
          : ''
      }${cell.hasFestival ? ', festival' : ''}${today ? ', today' : ''}`}
      accessibilityState={{ selected }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.cell,
            { borderRadius: theme.radius.sm },
            pressed ? { transform: [{ scale: 0.97 }] } : null,
            today
              ? { backgroundColor: theme.colors.today }
              : selected
                ? {
                    backgroundColor: theme.colors.primaryMuted,
                    borderWidth: 1.5,
                    borderColor: theme.colors.primary,
                  }
                : pressed
                  ? { backgroundColor: theme.colors.primaryMuted }
                  : null,
          ]}
        >
          <Text
            style={[
              styles.day,
              { color: fg, fontSize: showTamil ? 14 : 16 },
            ]}
            adjustsFontSizeToFit
          >
            {formatNumerals(String(cell.day), numerals)}
          </Text>
          {showTamil && cell.tamilDay !== null ? (
            <Text
              style={[
                styles.tamil,
                {
                  color: today
                    ? theme.colors.textOnMaroon
                    : theme.colors.textSecondary,
                  fontSize: 10,
                },
              ]}
            >
              {formatNumerals(String(cell.tamilDay), numerals)}
            </Text>
          ) : showTamil ? (
            <Text style={[styles.tamil, { color: theme.colors.textSecondary, fontSize: 10 }]}>
              ·
            </Text>
          ) : null}
          {/* Days may carry several markings at once (e.g. 25 Oct 2026 is
              both Pournami and a Subha Muhurtham date). Render every marker,
              not just the first matching one. */}
          {markersFor(cell, today, theme.colors).length > 0 ? (
            <View
              pointerEvents="none"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}
            >
              {markersFor(cell, today, theme.colors)}
            </View>
          ) : (
            <View style={{ height: 7, marginTop: 2 }} />
          )}
        </View>
      )}
    </Pressable>
  );
}

/** All markers a day carries, in legend order: festival, moon phase,
 *  Subha Muhurtham thali, user event. */
function markersFor(
  cell: DayCell,
  today: boolean,
  colors: {
    gold: string;
    festival: string;
    success: string;
    text: string;
    textOnMaroon: string;
  }
): React.ReactNode[] {
  const markers: React.ReactNode[] = [];
  if (cell.hasFestival) {
    markers.push(
      <View
        key="festival"
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: today ? colors.gold : colors.festival,
        }}
      />
    );
  }
  if (cell.isAmavasai || cell.isPournami) {
    markers.push(
      <View
        key="moon"
        style={{
          width: 9,
          height: 9,
          borderRadius: 4.5,
          borderWidth: cell.isPournami ? 1.5 : 0,
          borderColor: colors.gold,
          backgroundColor: cell.isAmavasai
            ? today
              ? colors.textOnMaroon
              : colors.text
            : 'transparent',
        }}
      />
    );
  }
  if (cell.isSubhaMuhurtham) {
    markers.push(
      <ThaliMark key="thali" color={today ? colors.textOnMaroon : colors.gold} size={8} />
    );
  }
  if (cell.hasEvent) {
    markers.push(
      <View
        key="event"
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.success,
        }}
      />
    );
  }
  return markers;
}

export function CalendarGrid({
  weeks,
  firstDayOfWeek,
  language,
  numerals,
  showTamilDate,
  selectedKey,
  onSelectDate,
}: CalendarGridProps) {
  const theme = useTheme();

  const weekdayOrder = firstDayOfWeek === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  // Group flat list into weekly rows.
  const rows: DayCell[][] = [];
  for (let i = 0; i < weeks.length; i += 7) {
    rows.push(weeks.slice(i, i + 7));
  }

  return (
    <View style={styles.gridWrap}>
      <View style={styles.weekHeader}>
        {weekdayOrder.map((w) => (
          <View key={w} style={styles.headerCell}>
            <Text
              numberOfLines={1}
              style={[
                styles.headerText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {weekdayName(w, language, true)}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.headerDivider, { backgroundColor: theme.colors.border }]} />
      {rows.map((week, idx) => {
        const ordered = [...week].sort(
          (a, b) => weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
        );
        return (
          <View key={idx} style={styles.weekRow}>
            {ordered.map((cell) => (
              <View key={cell.key} style={styles.cellWrap}>
                <CalendarCell
                  cell={cell}
                  numerals={numerals}
                  showTamilDate={showTamilDate}
                  selected={cell.key === selectedKey}
                  onPress={onSelectDate}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Gutter around the grid so the grid fits any parent card exactly
   *  — columns distribute via flex, never fixed pixel math. */
  gridWrap: {
    paddingHorizontal: 6,
    paddingBottom: spacing.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    // No textTransform/letterSpacing: Tamil has no uppercase, and the W3C
    // Tamil layout note (ilreq-taml) warns fixed letter-spacing/clipping
    // assumptions break Tamil glyphs with two-part vowel signs.
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
    marginHorizontal: spacing.xs,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cellWrap: {
    flex: 1,
    minHeight: minTouchTarget,
  },
  cell: {
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 10,
    paddingVertical: 3,
  },
  day: {
    fontWeight: '600',
  },
  tamil: {
    lineHeight: 13,
  },
});
