/**
 * App-wide constants.
 */

/** years the engine can navigate to (Gregorian). */
export const NAVIGABLE_START_YEAR = 1900;
export const NAVIGABLE_END_YEAR = 2100;

/** years with bundled verified dataset rows. */
export const DATASET_START_YEAR = 2026;
export const DATASET_END_YEAR = 2027;

/** Anchor for the 60-year Tamil cycle (docs/calendar-dataset.md). */
export const TAMIL_CYCLE_ANCHOR_GREG_YEAR = 2022;
export const TAMIL_CYCLE_ANCHOR_INDEX = 36; // Subhakruth

/** Recent searches stored locally. */
export const MAX_RECENT_SEARCHES = 10;

/** Default reminder lead time (minutes before midnight of target date). */
export const DEFAULT_REMINDER_HHMM = '07:00';
