import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../client';
import type { PanchangamRecord } from '@/types';
import {
  computeInauspiciousTimings,
  computeNallaNeramGowri,
  computeSoolamParikaram,
} from '@/services/panchangamService';
import { julianDay, lunarFieldsAtJd } from '@/services/panchangamAstro';
import {
  jdUtToIstDayKey,
  jdUtToIstHHmm,
  nakshatraFactsAtJdUt,
  sunriseJdUtForDateKey,
  tithiFactsAtJdUt,
} from '@/services/panchangamCalc';
import { PAKSHA_NAMES } from '@/data/mappings';
import { approxSunriseSunset } from '@/data/seedData';
import { convertToTamil } from '@/services/tamilCalendarService';
import { dateKeyToDate, daysInMonth, toDateKey, addDays, parseDateKey } from '@/utils/dates';

interface PanchangRow {
  date_key: string;
  tithi: string | null;
  nakshatra: string | null;
  yoga: string | null;
  karana: string | null;
  paksha: string | null;
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  rahu_kalam: string | null;
  yamagandam: string | null;
  kuligai: string | null;
  nalla_neram: string | null;
  verified: number;
  source: string | null;
}

function rowToRecord(row: PanchangRow): PanchangamRecord {
  return {
    dateKey: row.date_key,
    tithi: row.tithi,
    nakshatra: row.nakshatra,
    yoga: row.yoga,
    karana: row.karana,
    paksha: row.paksha,
    tithiEnd: null,
    tithiEndDay: null,
    nextTithi: null,
    nextTithiEnd: null,
    nextTithiEndDay: null,
    nakshatraEnd: null,
    nakshatraEndDay: null,
    nextNakshatraEnd: null,
    nextNakshatraEndDay: null,
    sunrise: row.sunrise,
    sunset: row.sunset,
    moonrise: row.moonrise,
    moonset: row.moonset,
    rahuKalam: row.rahu_kalam,
    yamagandam: row.yamagandam,
    kuligai: row.kuligai,
    nallaNeram: row.nalla_neram,
    ...computeSoolamParikaram(dateKeyToDate(row.date_key).getDay()),
  };
}

/**
 * High-accuracy lunar overlay (src/services/panchangamCalc.ts):
 * re-evaluates tithi/nakshatra at the day's actual Chennai sunrise with
 * the full-series ephemeris and solves the EXACT tithi/nakshatra end
 * instants, then overlays the record. This keeps every screen consistent
 * (all of them read through this function) and supplies the end times and
 * next-tithi/next-nakshatra forecasts the almanac rows render.
 */
function overlayLunarFacts(record: PanchangamRecord): void {
  try {
    const { year, month, day } = parseDateKey(record.dateKey);
    const sunriseJdUt = sunriseJdUtForDateKey(record.dateKey);
    const tithi = tithiFactsAtJdUt(sunriseJdUt);
    const naks = nakshatraFactsAtJdUt(sunriseJdUt);
    record.tithi = tithi.name;
    record.nakshatra = naks.name;
    record.paksha = tithi.index < 15 ? PAKSHA_NAMES.shukla : PAKSHA_NAMES.krishna;
    record.tithiEnd = jdUtToIstHHmm(tithi.endJdUt);
    record.tithiEndDay = jdUtToIstDayKey(tithi.endJdUt);
    record.nextTithi = tithi.nextName;
    record.nextTithiEnd = jdUtToIstHHmm(tithi.nextEndJdUt);
    record.nextTithiEndDay = jdUtToIstDayKey(tithi.nextEndJdUt);
    record.nakshatraEnd = jdUtToIstHHmm(naks.endJdUt);
    record.nakshatraEndDay = jdUtToIstDayKey(naks.endJdUt);
    record.nextNakshatraEnd = jdUtToIstHHmm(naks.nextEndJdUt);
    record.nextNakshatraEndDay = jdUtToIstDayKey(naks.nextEndJdUt);
    void year; void month; void day;
  } catch {
    // Ephemeris failure: keep the previously verified DB values; never
    // substitute fabricated times in their place.
  }
}

/**
 * Loads panchangam for a local date. If no dataset row exists, computes
 * classical timings from approximate sun times and flags them as
 * non-verified via `verified: false`. Never fabricates tithi/nakshatra:
 * the lunar overlay only labels instants the engine itself computes,
 * and leaves DB values untouched on ephemeris failure.
 */
export async function getPanchangamForDate(
  dateKey: string
): Promise<{ record: PanchangamRecord; verified: boolean; source: string | null }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PanchangRow>(
    `SELECT * FROM panchangam_records WHERE date_key = ?`,
    dateKey
  );
  if (row) {
    const record = rowToRecord(row);
    overlayLunarFacts(record);
    return { record, verified: row.verified === 1, source: row.source };
  }

  // Fallback: derive from approximations (marked unverified).
  const date = dateKeyToDate(dateKey);
  const sun = approxSunriseSunset(date.getMonth() + 1);
  const inauspicious = computeInauspiciousTimings(
    date.getDay(),
    sun ?? { sunrise: null, sunset: null }
  );

  // Tithi/nakshatra/yoga/karana/paksha are evaluated at sunrise, evaluated
  // in IST (Tamil Nadu convention; sunrise strings are IST HH:mm).
  const lunar = sun?.sunrise
    ? lunarFieldsAtSunrise(date.getFullYear(), date.getMonth() + 1, date.getDate(), sun.sunrise)
    : null;

  const record: PanchangamRecord = {
    dateKey,
    tithi: lunar?.tithi ?? null,
    nakshatra: lunar?.nakshatra ?? null,
    yoga: lunar?.yoga ?? null,
    karana: lunar?.karana ?? null,
    paksha: lunar?.paksha ?? null,
    sunrise: sun?.sunrise ?? null,
    sunset: sun?.sunset ?? null,
    moonrise: null,
    moonset: null,
    rahuKalam: inauspicious.rahuKalam,
    yamagandam: inauspicious.yamagandam,
    kuligai: inauspicious.kuligai,
    nallaNeram: computeNallaNeramGowri(date.getDay(), sun ?? { sunrise: null, sunset: null }),
    ...computeSoolamParikaram(date.getDay()),
    tithiEnd: null,
    tithiEndDay: null,
    nextTithi: null,
    nextTithiEnd: null,
    nextTithiEndDay: null,
    nakshatraEnd: null,
    nakshatraEndDay: null,
    nextNakshatraEnd: null,
    nextNakshatraEndDay: null,
  };
  overlayLunarFacts(record);
  return { record, verified: false, source: null };
}

/** Julian Day at the given IST sunrise time on the local date. */
function lunarFieldsAtSunrise(year: number, month: number, day: number, sunriseIST: string) {
  const [h, m] = sunriseIST.split(':').map(Number);
  const localMinutes = (h ?? 0) * 60 + (m ?? 0);
  const utcMinutes = localMinutes - 330; // IST = UTC +5:30
  const dayFraction = utcMinutes / (24 * 60);
  const jd = julianDay(year, month, day, dayFraction);
  return lunarFieldsAtJd(jd);
}

/** Bulk write used by importer/tests. */
export async function upsertPanchangam(
  db: SQLiteDatabase,
  records: PanchangamRecord[]
): Promise<void> {
  for (const r of records) {
    await db.runAsync(
      `INSERT OR REPLACE INTO panchangam_records
       (date_key, tithi, nakshatra, yoga, karana, paksha, sunrise, sunset,
        moonrise, moonset, rahu_kalam, yamagandam, kuligai, nalla_neram,
        verified, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'bundled dataset')`,
      r.dateKey,
      r.tithi,
      r.nakshatra,
      r.yoga,
      r.karana,
      r.paksha,
      r.sunrise,
      r.sunset,
      r.moonrise,
      r.moonset,
      r.rahuKalam,
      r.yamagandam,
      r.kuligai,
      r.nallaNeram
    );
  }
}

/** Tamil date mapping read/write (engine-derived, stored for consistency). */
export async function getTamilDate(
  dateKey: string
): Promise<{
  day: number | null;
  month: number | null;
  yearIndex: number | null;
  paksha: string | null;
} | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    tamil_day: number | null;
    tamil_month: number | null;
    tamil_year_index: number | null;
    paksha: string | null;
  }>(`SELECT tamil_day, tamil_month, tamil_year_index, paksha FROM tamil_dates WHERE date_key = ?`, dateKey);
  if (row) {
    return {
      day: row.tamil_day,
      month: row.tamil_month,
      yearIndex: row.tamil_year_index,
      paksha: row.paksha,
    };
  }
  const conv = convertToTamil(dateKeyToDate(dateKey));
  if (conv.day === null) return null;
  await db.runAsync(
    `INSERT OR REPLACE INTO tamil_dates (date_key, tamil_day, tamil_month, tamil_year_index, paksha)
     VALUES (?, ?, ?, ?, ?)`,
    dateKey,
    conv.day,
    conv.month,
    conv.yearIndex,
    conv.paksha
  );
  return {
    day: conv.day,
    month: conv.month,
    yearIndex: conv.yearIndex,
    paksha: conv.paksha,
  };
}

export interface TamilDayFor {
  /** Tamil day-of-month, null when unknown. */
  (key: string): number | null;
}

/**
 * Batch loader for a whole month: returns a dateKey -> Tamil day map for all
 * days of the given Gregorian month. DB rows first; engine fallback fills
 * gaps and persists them so later reads hit the DB.
 */
export async function getTamilDaysForMonth(
  year: number,
  month: number
): Promise<Map<string, { day: number; month: number }>> {
  const db = await getDatabase();
  const prefix = `${year}-${String(month).padStart(2, '0')}-%`;
  const rows = await db.getAllAsync<{
    date_key: string;
    tamil_day: number | null;
    tamil_month: number | null;
  }>(
    `SELECT date_key, tamil_day, tamil_month FROM tamil_dates WHERE date_key LIKE ?`,
    prefix
  );
  const map = new Map<string, { day: number; month: number }>();
  for (const r of rows) {
    if (r.tamil_day !== null && r.tamil_day !== undefined) {
      map.set(r.date_key, { day: Number(r.tamil_day), month: r.tamil_month ?? 0 });
    }
  }

  const total = daysInMonth(year, month);
  const firstKey = toDateKey(year, month, 1);
  const lastKey = toDateKey(year, month, total);

  // Boundary days of adjacent months also appear in the grid; fill ±6 days past
  // the month edges so leading/trailing cells carry Tamil dates too.
  const boundaryBefore = addDays(firstKey, -6);
  const boundaryAfter = addDays(lastKey, 6);
  const keysToEnsure: string[] = [];
  let k = boundaryBefore;
  while (k <= boundaryAfter) {
    if (!map.has(k)) keysToEnsure.push(k);
    if (k === boundaryAfter) break;
    k = addDays(k, 1);
  }

  for (const key of keysToEnsure) {
    const conv = convertToTamil(dateKeyToDate(key));
    if (conv.day !== null) {
      map.set(key, { day: conv.day, month: conv.month ?? 0 });
      await db.runAsync(
        `INSERT OR REPLACE INTO tamil_dates (date_key, tamil_day, tamil_month, tamil_year_index, paksha)
         VALUES (?, ?, ?, ?, ?)`,
        key,
        conv.day,
        conv.month,
        conv.yearIndex,
        conv.paksha
      );
    }
  }
  return map;
}
