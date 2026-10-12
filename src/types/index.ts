/**
 * Domain model types for Tamil Calendar.
 *
 * All "date keys" are local-calendar strings 'YYYY-MM-DD'. We never construct
 * these with UTC methods (which shift dates across time zones); see
 * `src/utils/dates.ts`.
 */

export type Language = 'en' | 'ta';
export type NumeralStyle = 'arabic' | 'tamil';
export type FirstDayOfWeek = 0 | 1; // 0 = Sunday, 1 = Monday

export interface DayCell {
  /** 'YYYY-MM-DD' */
  key: string;
  year: number;
  month: number; // 1..12 (Gregorian)
  day: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday (JS convention)
  isToday: boolean;
  inMonth: boolean;
  /** Tamil day-of-month number, or null when unverified. */
  tamilDay: number | null;
  /** Tamil month index 1..12 (Chithirai..Panguni), or null when unverified. */
  tamilMonth: number | null;
  hasFestival: boolean;
  isAmavasai: boolean;
  isPournami: boolean;
  /** Has at least one user-created event on this date. */
  hasEvent?: boolean;
}

export interface TamilDateInfo {
  day: number | null;
  month: number | null; // 1..12 Chithirai..Panguni
  year: number | null; // cycle-relative label e.g. "Sharvari"
  monthNameTa: string | null;
  monthNameEn: string | null;
  yearNameTa: string | null;
  yearNameEn: string | null;
}

export interface PakshaInfo {
  labelTa: string;
  labelEn: string;
}

export interface PanchangTimings {
  rahuKalam: string | null;
  yamagandam: string | null;
  kuligai: string | null;
  nallaNeram: string | null;
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
}

export interface PanchangamRecord extends PanchangTimings {
  dateKey: string;
  tithi: string | null;
  nakshatra: string | null;
  yoga: string | null;
  karana: string | null;
  paksha: string | null;
}

export interface FestivalOccurrence {
  id: number;
  festivalId: number;
  /** 'YYYY-MM-DD' */
  dateKey: string;
  nameTa: string;
  nameEn: string;
  descriptionTa: string | null;
  descriptionEn: string | null;
  category: FestivalCategory;
  isHoliday: boolean;
  /** Verification provenance; must never be fabricated. */
  source: string | null;
  verified: boolean;
}

export type FestivalCategory =
  | 'tamil'
  | 'hindu'
  | 'national'
  | 'tamilnadu'
  | 'observance';

export interface Bookmark {
  dateKey: string;
  createdAt: number;
}

export interface Note {
  dateKey: string;
  text: string;
  updatedAt: number;
}

export type EventKind = 'birthday' | 'anniversary' | 'custom';

/** A user-created event. Persisted in SQLite, shown on the calendar grid. */
export interface UserEvent {
  id: number;
  title: string;
  kind: EventKind;
  /** Occurrence date 'YYYY-MM-DD'. */
  dateKey: string;
  /** When true, resurfaces on the same month/day every year with a reminder. */
  repeatYearly: boolean;
  /** Optional reminder time 'HH:mm' (null = no reminder). */
  reminderTime: string | null;
  /** Native notification id once a reminder is scheduled. */
  notificationId: string | null;
  note: string | null;
  createdAt: number;
}

export interface ReminderDefinition {
  id: string;
  /** 'YYYY-MM-DD' */
  dateKey: string;
  /** Local 'HH:mm' */
  time: string;
  title: string;
  body: string | null;
  repeat: 'none' | 'yearly';
  enabled: boolean;
  /** Native notification id once scheduled. */
  notificationId: string | null;
  createdAt: number;
}

export interface DatasetMeta {
  key: string;
  value: string;
}

export interface UpcomingFestival {
  festivalId: number;
  dateKey: string;
  nameTa: string;
  nameEn: string;
  daysUntil: number;
}
