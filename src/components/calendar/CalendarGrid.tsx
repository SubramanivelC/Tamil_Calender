import React from 'react';
import { View, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { weekdayName } from '@/localization';
import { ThemedText } from '@/components/ThemedText';
import type { DayCell, Language, NumeralStyle } from '@/types';
import { formatNumerals } from '@/utils/numerals';
import { ThaliMark } from '@/components/calendar/ThaliMark';
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
      onPress={() => onPress(cell.key)}
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
  const { width } = useWindowDimensions();
  const colWidth = (width - spacing.xl * 2) / 7;

  const weekdayOrder = firstDayOfWeek === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  // Group flat list into weekly rows.
  const rows: DayCell[][] = [];
  for (let i = 0; i < weeks.length; i += 7) {
    rows.push(weeks.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.weekHeader}>
        {weekdayOrder.map((w) => (
          <View key={w} style={[styles.headerCell, { width: colWidth }]}>
            <Text
              style={[
                { color: theme.colors.textSecondary, fontSize: 12 },
                styles.headerText,
              ]}
            >
              {weekdayName(w, language, true)}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((week, idx) => {
        const ordered = [...week].sort(
          (a, b) => weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
        );
        return (
          <View key={idx} style={styles.weekRow}>
            {ordered.map((cell) => (
              <View key={cell.key} style={{ width: colWidth, minHeight: minTouchTarget }}>
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
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    alignItems: 'center',
  },
  headerText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    paddingVertical: 3,
  },
  day: {
    fontWeight: '600',
  },
  tamil: {
    lineHeight: 13,
  },
});
