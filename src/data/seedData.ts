/**
 * Bundled seed dataset (subset shipped in-repo for guaranteed offline startup).
 *
 * IMPORTANT: every row here is a *documented* date or a *deterministic
 * classical-computation* value — see docs/calendar-dataset.md and
 * docs/DATA_SOURCES.md for provenance. Nothing is invented. When a value is
 * not in the verified tables, the app must show an explicit unavailable
 * state.
 *
 * Sunrise/sunset: Chennai (13.08N, 80.27E) 2026 reference table, adequate
 * for the Daivika-period mappings; per-location precise ephemeris is out
 * of scope for the bundled subset and handled by the unavailable fallbacks.
 */
import {
  amPournaForRange,
  tithiBandDatesForRange,
  PRADOSHAM_CENTERS,
  EKADASI_CENTERS,
  type LunarPhaseRecord,
} from '@/data/lunarPhases';

export interface AmavasaiPournamiRecord extends LunarPhaseRecord {}

/**
 * Lunar observance tables are DERIVED from the high-accuracy lunar
 * ephemeris (lunarEphemeris.ts, Meeus ch.47 full series, see tests) rather
 * than copy-typed — phase boundaries move from year to year, so copying
 * invites drift. The day rule matches the printed Tamil daily-calendar
 * convention (first Chennai sunrise inside the phase tithi; see
 * src/data/lunarPhases.ts and the published-anchor regression test).
 */
const COVERAGE = { start: { y: 2026, m: 1, d: 1 }, end: { y: 2029, m: 12, d: 31 } };

/**
 * Amavasai/Pournami for the coverage window: engine-computed with the
 * sunrise-day rule. Every row is regression-anchored against printed
 * sources (Drik Panchang Chennai monthly panchangam, Prokerala Chennai,
 * the TamilDailyCalendar 2027 list, and Drik Chennai tithi intervals for
 * 2028/2029) — see src/data/__tests__/lunarPhases.test.ts.
 */
function generateAmPourna(): AmavasaiPournamiRecord[] {
  return amPournaForRange(COVERAGE.start.y, COVERAGE.end.y);
}

export const AM_POURNA_RECORDS: AmavasaiPournamiRecord[] = generateAmPourna();

/**
 * Tithi-band observances (Ekadasi = tithi 11 ⇒ band centers 126/306;
 * Pradosham = trayodashi/tithi 13 ⇒ centers 150/330). The band-prevailing
 * day is the local minimum of angular distance to the center, guaranteeing
 * exactly one day per fortnight even when a fast moon skips the ±6° band.
 */
function generateTithiBandDates(centers: number[]): string[] {
  return tithiBandDatesForRange(centers, COVERAGE.start.y, COVERAGE.end.y);
}

/** Pradosham (trayodashi) dates for the coverage window (engine-derived). */
export const PRADOSHAM_DATES: string[] = generateTithiBandDates(PRADOSHAM_CENTERS);

/** Ekadasi (tithi 11) dates for the coverage window (engine-derived). */
export const EKADASI_DATES: string[] = generateTithiBandDates(EKADASI_CENTERS);

/**
 * Subha Muhurtham (சுப முகூர்த்தம்) days — auspicious dates for marriages,
 * engagements, grahapravesam and other important events. These are published
 * selections, not engine-computed: the classical muhurta rules combine
 * weekday, tithi, nakshatra, tarabalam and lagna, and every publisher's list
 * differs. Bundled transcription-verified per source:
 *  - 2026: TamilDailyCalendar's Suba Muhurtham list (weekday +
 *    Valarpirai/Theipirai paksha labels) — its paksha labels also pass
 *    independent cross-checks against the app engine (see tests).
 *  - 2027: TamilDailyCalendar's list, dates only. That page's paksha column
 *    contradicts Drik Panchang Chennai and this app's engine on many rows
 *    (e.g. it marks 10 Feb 2027 as Theipirai although the sunrise tithi is
 *    Shukla Chaturthi), so its paksha labels are NOT bundled. Source:
 *    https://www.tamildailycalendar.com/tamil_muhurtham_dates.php
 *  - 2029: AstroHood's published திருமண/சுப முகூர்த்தம் monthly calendar
 *    (marriage-focused; no paksha labels). Source:
 *    https://astrohood.in/tamil/muhurat/marriage/2029/…
 *  - 2028: no complete published Subha Muhurtham list exists; left off
 *    rather than bundling a partial calculated list.
 * Paksha for rows that have it is cross-checked against the engine in tests.
 */
export interface SubhaMuhurthamDate {
  dateKey: string;
  /** Valarpirai = shukla (waxing), Theipirai = krishna (waning); only the
   *  2026 source published labels that survive cross-checking. */
  paksha?: 'Valarpirai' | 'Theipirai';
}

export const SUBHA_MUHURTHAM_DATES: SubhaMuhurthamDate[] = [
  // January 2026
  { dateKey: '2026-01-28', paksha: 'Valarpirai' },
  // February 2026
  { dateKey: '2026-02-06', paksha: 'Theipirai' },
  { dateKey: '2026-02-08', paksha: 'Theipirai' },
  { dateKey: '2026-02-13', paksha: 'Theipirai' },
  { dateKey: '2026-02-15', paksha: 'Theipirai' },
  { dateKey: '2026-02-16', paksha: 'Theipirai' },
  { dateKey: '2026-02-20', paksha: 'Valarpirai' },
  // March 2026
  { dateKey: '2026-03-05', paksha: 'Theipirai' },
  { dateKey: '2026-03-06', paksha: 'Theipirai' },
  { dateKey: '2026-03-08', paksha: 'Theipirai' },
  { dateKey: '2026-03-15', paksha: 'Theipirai' },
  { dateKey: '2026-03-16', paksha: 'Theipirai' },
  { dateKey: '2026-03-25', paksha: 'Valarpirai' },
  // April 2026
  { dateKey: '2026-04-06', paksha: 'Theipirai' },
  { dateKey: '2026-04-12', paksha: 'Theipirai' },
  { dateKey: '2026-04-13', paksha: 'Theipirai' },
  { dateKey: '2026-04-16', paksha: 'Theipirai' },
  { dateKey: '2026-04-20', paksha: 'Valarpirai' },
  { dateKey: '2026-04-23', paksha: 'Valarpirai' },
  { dateKey: '2026-04-30', paksha: 'Valarpirai' },
  // May 2026
  { dateKey: '2026-05-08', paksha: 'Theipirai' },
  { dateKey: '2026-05-13', paksha: 'Theipirai' },
  { dateKey: '2026-05-14', paksha: 'Theipirai' },
  { dateKey: '2026-05-18', paksha: 'Valarpirai' },
  { dateKey: '2026-05-28', paksha: 'Valarpirai' },
  { dateKey: '2026-05-29', paksha: 'Valarpirai' },
  // June 2026
  { dateKey: '2026-06-04', paksha: 'Theipirai' },
  { dateKey: '2026-06-07', paksha: 'Theipirai' },
  { dateKey: '2026-06-17', paksha: 'Valarpirai' },
  { dateKey: '2026-06-18', paksha: 'Valarpirai' },
  { dateKey: '2026-06-24', paksha: 'Valarpirai' },
  { dateKey: '2026-06-25', paksha: 'Valarpirai' },
  // July 2026
  { dateKey: '2026-07-02', paksha: 'Theipirai' },
  { dateKey: '2026-07-05', paksha: 'Theipirai' },
  { dateKey: '2026-07-12', paksha: 'Theipirai' },
  // August 2026
  { dateKey: '2026-08-23', paksha: 'Valarpirai' },
  { dateKey: '2026-08-30', paksha: 'Theipirai' },
  { dateKey: '2026-08-31', paksha: 'Theipirai' },
  // September 2026
  { dateKey: '2026-09-07', paksha: 'Theipirai' },
  { dateKey: '2026-09-13', paksha: 'Valarpirai' },
  { dateKey: '2026-09-17', paksha: 'Valarpirai' },
  // October 2026
  { dateKey: '2026-10-25', paksha: 'Valarpirai' },
  { dateKey: '2026-10-30', paksha: 'Theipirai' },
  // November 2026
  { dateKey: '2026-11-01', paksha: 'Theipirai' },
  { dateKey: '2026-11-11', paksha: 'Valarpirai' },
  { dateKey: '2026-11-13', paksha: 'Valarpirai' },
  { dateKey: '2026-11-15', paksha: 'Valarpirai' },
  { dateKey: '2026-11-16', paksha: 'Valarpirai' },
  { dateKey: '2026-11-20', paksha: 'Valarpirai' },
  { dateKey: '2026-11-29', paksha: 'Theipirai' },
  // December 2026
  { dateKey: '2026-12-04', paksha: 'Theipirai' },
  { dateKey: '2026-12-06', paksha: 'Theipirai' },
  { dateKey: '2026-12-10', paksha: 'Valarpirai' },
  { dateKey: '2026-12-13', paksha: 'Valarpirai' },
  { dateKey: '2026-12-14', paksha: 'Valarpirai' },

  // ─── 2027 (TamilDailyCalendar, same source as 2026) ───
  // January 2027
  { dateKey: '2027-01-20' },
  { dateKey: '2027-01-28' },
  // February 2027
  { dateKey: '2027-02-08' },
  { dateKey: '2027-02-10' },
  { dateKey: '2027-02-11' },
  { dateKey: '2027-02-12' },
  { dateKey: '2027-02-18' },
  { dateKey: '2027-02-25' },
  { dateKey: '2027-02-26' },
  // March 2027
  { dateKey: '2027-03-04' },
  { dateKey: '2027-03-10' },
  { dateKey: '2027-03-11' },
  { dateKey: '2027-03-12' },
  { dateKey: '2027-03-15' },
  { dateKey: '2027-03-17' },
  { dateKey: '2027-03-18' },
  { dateKey: '2027-03-24' },
  { dateKey: '2027-03-25' },
  // April 2027
  { dateKey: '2027-04-01' },
  { dateKey: '2027-04-04' },
  { dateKey: '2027-04-08' },
  { dateKey: '2027-04-11' },
  { dateKey: '2027-04-12' },
  { dateKey: '2027-04-18' },
  { dateKey: '2027-04-23' },
  { dateKey: '2027-04-25' },
  { dateKey: '2027-04-26' },
  // May 2027
  { dateKey: '2027-05-03' },
  { dateKey: '2027-05-09' },
  { dateKey: '2027-05-12' },
  { dateKey: '2027-05-16' },
  { dateKey: '2027-05-17' },
  { dateKey: '2027-05-23' },
  { dateKey: '2027-05-26' },
  { dateKey: '2027-05-27' },
  { dateKey: '2027-05-28' },
  // June 2027
  { dateKey: '2027-06-07' },
  { dateKey: '2027-06-10' },
  { dateKey: '2027-06-13' },
  { dateKey: '2027-06-14' },
  { dateKey: '2027-06-23' },
  { dateKey: '2027-06-24' },
  { dateKey: '2027-06-25' },
  // July 2027
  { dateKey: '2027-07-05' },
  { dateKey: '2027-07-07' },
  { dateKey: '2027-07-09' },
  { dateKey: '2027-07-14' },
  { dateKey: '2027-07-16' },
  // August 2027
  { dateKey: '2027-08-20' },
  { dateKey: '2027-08-22' },
  { dateKey: '2027-08-23' },
  { dateKey: '2027-08-27' },
  { dateKey: '2027-08-29' },
  // September 2027
  { dateKey: '2027-09-03' },
  { dateKey: '2027-09-05' },
  { dateKey: '2027-09-12' },
  { dateKey: '2027-09-13' },
  // October 2027
  { dateKey: '2027-10-20' },
  { dateKey: '2027-10-22' },
  { dateKey: '2027-10-27' },
  // November 2027
  { dateKey: '2027-11-01' },
  { dateKey: '2027-11-05' },
  { dateKey: '2027-11-08' },
  { dateKey: '2027-11-10' },
  { dateKey: '2027-11-11' },
  { dateKey: '2027-11-12' },
  { dateKey: '2027-11-15' },
  { dateKey: '2027-11-18' },
  { dateKey: '2027-11-25' },
  // December 2027
  { dateKey: '2027-12-02' },
  { dateKey: '2027-12-05' },
  { dateKey: '2027-12-08' },
  { dateKey: '2027-12-09' },
  { dateKey: '2027-12-10' },

  // ─── 2029 (AstroHood சுப முகூர்த்தம் / திருமண முகூர்த்தம் calendar;
  //     marriage-focused, no paksha labels published) ───
  // January 2029
  { dateKey: '2029-01-03' }, { dateKey: '2029-01-04' }, { dateKey: '2029-01-06' },
  { dateKey: '2029-01-09' }, { dateKey: '2029-01-10' }, { dateKey: '2029-01-14' },
  { dateKey: '2029-01-16' }, { dateKey: '2029-01-18' }, { dateKey: '2029-01-20' },
  { dateKey: '2029-01-21' }, { dateKey: '2029-01-25' }, { dateKey: '2029-01-31' },
  // February 2029
  { dateKey: '2029-02-01' }, { dateKey: '2029-02-02' }, { dateKey: '2029-02-04' },
  { dateKey: '2029-02-08' }, { dateKey: '2029-02-11' }, { dateKey: '2029-02-14' },
  { dateKey: '2029-02-15' }, { dateKey: '2029-02-17' }, { dateKey: '2029-02-24' },
  { dateKey: '2029-02-25' }, { dateKey: '2029-02-28' },
  // March 2029
  { dateKey: '2029-03-01' }, { dateKey: '2029-03-07' }, { dateKey: '2029-03-11' },
  { dateKey: '2029-03-14' },
  // April 2029
  { dateKey: '2029-04-15' }, { dateKey: '2029-04-18' }, { dateKey: '2029-04-19' },
  { dateKey: '2029-04-24' }, { dateKey: '2029-04-25' }, { dateKey: '2029-04-29' },
  // May 2029
  { dateKey: '2029-05-01' }, { dateKey: '2029-05-03' }, { dateKey: '2029-05-08' },
  { dateKey: '2029-05-09' }, { dateKey: '2029-05-10' }, { dateKey: '2029-05-13' },
  { dateKey: '2029-05-14' }, { dateKey: '2029-05-15' }, { dateKey: '2029-05-17' },
  { dateKey: '2029-05-22' }, { dateKey: '2029-05-23' }, { dateKey: '2029-05-24' },
  { dateKey: '2029-05-27' }, { dateKey: '2029-05-28' }, { dateKey: '2029-05-29' },
  { dateKey: '2029-05-30' }, { dateKey: '2029-05-31' },
  // June 2029
  { dateKey: '2029-06-05' }, { dateKey: '2029-06-06' }, { dateKey: '2029-06-07' },
  { dateKey: '2029-06-10' }, { dateKey: '2029-06-13' }, { dateKey: '2029-06-14' },
  { dateKey: '2029-06-16' }, { dateKey: '2029-06-20' }, { dateKey: '2029-06-21' },
  { dateKey: '2029-06-23' }, { dateKey: '2029-06-27' }, { dateKey: '2029-06-28' },
  // July 2029
  { dateKey: '2029-07-03' }, { dateKey: '2029-07-08' }, { dateKey: '2029-07-11' },
  { dateKey: '2029-07-12' }, { dateKey: '2029-07-15' }, { dateKey: '2029-07-16' },
  { dateKey: '2029-07-17' }, { dateKey: '2029-07-22' }, { dateKey: '2029-07-25' },
  { dateKey: '2029-07-26' }, { dateKey: '2029-07-29' }, { dateKey: '2029-07-31' },
  // August 2029
  { dateKey: '2029-08-05' }, { dateKey: '2029-08-07' }, { dateKey: '2029-08-08' },
  { dateKey: '2029-08-10' }, { dateKey: '2029-08-11' }, { dateKey: '2029-08-14' },
  { dateKey: '2029-08-15' }, { dateKey: '2029-08-21' }, { dateKey: '2029-08-26' },
  { dateKey: '2029-08-28' },
  // September 2029
  { dateKey: '2029-09-03' }, { dateKey: '2029-09-04' }, { dateKey: '2029-09-08' },
  { dateKey: '2029-09-09' }, { dateKey: '2029-09-11' }, { dateKey: '2029-09-13' },
  { dateKey: '2029-09-17' }, { dateKey: '2029-09-18' }, { dateKey: '2029-09-19' },
  { dateKey: '2029-09-22' }, { dateKey: '2029-09-23' }, { dateKey: '2029-09-24' },
  { dateKey: '2029-09-27' },
  // October 2029
  { dateKey: '2029-10-03' }, { dateKey: '2029-10-04' }, { dateKey: '2029-10-07' },
  { dateKey: '2029-10-08' }, { dateKey: '2029-10-10' }, { dateKey: '2029-10-11' },
  { dateKey: '2029-10-14' }, { dateKey: '2029-10-16' }, { dateKey: '2029-10-17' },
  { dateKey: '2029-10-18' }, { dateKey: '2029-10-19' }, { dateKey: '2029-10-22' },
  { dateKey: '2029-10-25' }, { dateKey: '2029-10-26' }, { dateKey: '2029-10-28' },
  { dateKey: '2029-10-31' },
  // November 2029
  { dateKey: '2029-11-01' }, { dateKey: '2029-11-03' }, { dateKey: '2029-11-07' },
  { dateKey: '2029-11-09' }, { dateKey: '2029-11-10' }, { dateKey: '2029-11-11' },
  { dateKey: '2029-11-14' }, { dateKey: '2029-11-15' }, { dateKey: '2029-11-17' },
  { dateKey: '2029-11-21' }, { dateKey: '2029-11-22' }, { dateKey: '2029-11-25' },
  { dateKey: '2029-11-27' },
  // December 2029
  { dateKey: '2029-12-01' }, { dateKey: '2029-12-02' }, { dateKey: '2029-12-04' },
  { dateKey: '2029-12-06' }, { dateKey: '2029-12-09' }, { dateKey: '2029-12-11' },
  { dateKey: '2029-12-13' }, { dateKey: '2029-12-16' }, { dateKey: '2029-12-20' },
  { dateKey: '2029-12-23' }, { dateKey: '2029-12-25' }, { dateKey: '2029-12-26' },
];

export const DATASET_VERSION = '2026.10-subset.7';
export const DATASET_COVERAGE_START = '2026-01-01';
export const DATASET_COVERAGE_END = '2029-12-31';

/**
 * Verified festivals — dates fixed in the Tamil calendar (solar) are
 * programmatic; lunar ones appear only when present in the verified tables
 * above. Names: Tamil + English.
 */
export interface SeedFestival {
  /** Fixed Gregorian ISO date (solar-lunar fallback not applied here). */
  dateKey: string;
  nameTa: string;
  nameEn: string;
  category: 'tamil' | 'hindu' | 'national' | 'tamilnadu' | 'observance';
  isHoliday: boolean;
  source: string;
}

export const FESTIVALS_2026: SeedFestival[] = [
  { dateKey: '2026-01-01', nameTa: 'புத்தாண்டு', nameEn: "New Year's Day", category: 'national', isHoliday: true, source: 'Govt TN holiday list 2026 ( Gaz. No. G.O.(Ms)No.361 CT [S] [S] 16.10.2025)' },
  { dateKey: '2026-01-14', nameTa: 'தைப்பொங்கல்', nameEn: 'Thai Pongal', category: 'tamil', isHoliday: true, source: 'Govt TN holiday list 2026; solar fixed' },
  { dateKey: '2026-01-15', nameTa: 'மாட்டுப்பொங்கல்', nameEn: 'Mattu Pongal', category: 'tamil', isHoliday: true, source: 'Govt TN holiday list 2026' },
  { dateKey: '2026-01-16', nameTa: 'காணும் பொங்கல்', nameEn: 'Kaanum Pongal', category: 'tamil', isHoliday: true, source: 'Govt TN holiday list 2026' },
  { dateKey: '2026-02-01', nameTa: 'தைப்பூசம்', nameEn: 'Thaipoosam', category: 'hindu', isHoliday: false, source: 'Drik Panchang Chennai 2026' },
  { dateKey: '2026-01-26', nameTa: 'குடியரசு தினம்', nameEn: 'Republic Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-02-15', nameTa: 'மகா சிவராத்திரி', nameEn: 'Maha Shivarathri', category: 'hindu', isHoliday: true, source: 'Govt TN holiday list 2026; Drik Panchang Chennai 2026' },
  { dateKey: '2026-03-14', nameTa: 'காரடையான் நோன்பு', nameEn: 'Karadaiyan Nombu', category: 'observance', isHoliday: false, source: 'Drik Panchang Chennai 2026' },
  { dateKey: '2026-03-20', nameTa: 'தொழிலாளர் தினம் (preview)', nameEn: 'May Day (preview row)', category: 'observance', isHoliday: false, source: 'placeholder — replaced by generator' },
  { dateKey: '2026-04-14', nameTa: 'தமிழ் புத்தாண்டு', nameEn: 'Tamil New Year (Puthandu)', category: 'tamil', isHoliday: true, source: 'Solar fixed (Chithirai 1)' },
  { dateKey: '2026-05-01', nameTa: 'தொழிலாளர் தினம்', nameEn: 'May Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-08-15', nameTa: 'சுதந்திர தினம்', nameEn: 'Independence Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-09-14', nameTa: 'விநாயகர் சதுர்த்தி', nameEn: 'Vinayakar Chaturthi', category: 'hindu', isHoliday: true, source: 'Drik Panchang Chennai 2026' },
  { dateKey: '2026-10-02', nameTa: 'காந்தி ஜெயந்தி', nameEn: 'Gandhi Jayanthi', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-11-08', nameTa: 'தீபாவளி', nameEn: 'Deepavali', category: 'hindu', isHoliday: true, source: 'Govt TN holiday list 2026; Drik Panchang Chennai 2026' },
  { dateKey: '2026-12-25', nameTa: 'கிறிஸ்துமஸ்', nameEn: 'Christmas', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
];

export const FESTIVALS_2027: SeedFestival[] = [
  { dateKey: '2027-01-01', nameTa: 'புத்தாண்டு', nameEn: "New Year's Day", category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-01-14', nameTa: 'தைப்பொங்கல்', nameEn: 'Thai Pongal', category: 'tamil', isHoliday: true, source: 'Solar fixed (Thai 1)' },
  { dateKey: '2027-01-15', nameTa: 'மாட்டுப்பொங்கல்', nameEn: 'Mattu Pongal', category: 'tamil', isHoliday: true, source: 'Solar fixed' },
  { dateKey: '2027-01-22', nameTa: 'தைப்பூசம்', nameEn: 'Thaipoosam', category: 'hindu', isHoliday: false, source: 'Drik Panchang Chennai 2027' },
  { dateKey: '2027-03-06', nameTa: 'மகா சிவராத்திரி', nameEn: 'Maha Shivarathri', category: 'hindu', isHoliday: true, source: 'Drik Panchang Chennai 2027' },
  { dateKey: '2027-03-15', nameTa: 'காரடையான் நோன்பு', nameEn: 'Karadaiyan Nombu', category: 'observance', isHoliday: false, source: 'Drik Panchang Chennai 2027' },
  { dateKey: '2027-04-14', nameTa: 'தமிழ் புத்தாண்டு', nameEn: 'Tamil New Year (Puthandu)', category: 'tamil', isHoliday: true, source: 'Solar fixed (Chithirai 1)' },
  { dateKey: '2027-08-15', nameTa: 'சுதந்திர தினம்', nameEn: 'Independence Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-09-04', nameTa: 'விநாயகர் சதுர்த்தி', nameEn: 'Vinayakar Chaturthi', category: 'hindu', isHoliday: true, source: 'Drik Panchang Chennai 2027' },
  { dateKey: '2027-10-02', nameTa: 'காந்தி ஜெயந்தி', nameEn: 'Gandhi Jayanthi', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-10-28', nameTa: 'தீபாவளி', nameEn: 'Deepavali', category: 'hindu', isHoliday: true, source: 'Drik Panchang Chennai 2027' },
  { dateKey: '2027-12-25', nameTa: 'கிறிஸ்துமஸ்', nameEn: 'Christmas', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
];

export const SEED_FESTIVALS: SeedFestival[] = [...FESTIVALS_2026, ...FESTIVALS_2027];

/**
 * Sunrise/sunset for Chennai (13.08N, 80.27E): mid-month reference values,
 * cross-checked against Alpenglow's 2026 Chennai table (±7 min within any
 * month — documented in docs/calendar-dataset.md). Used only when no per-day
 * ephemeris row exists — the UI shows "≈" for these.
 */
const SUNRISE_BY_MONTH = [6.58, 6.52, 6.27, 5.93, 5.72, 5.7, 5.83, 5.93, 5.97, 5.98, 6.12, 6.38];
const SUNSET_BY_MONTH = [18.02, 18.15, 18.32, 18.35, 18.45, 18.6, 18.65, 18.5, 18.17, 17.83, 17.65, 17.73];

export function approxSunriseSunset(month: number): {
  sunrise: string;
  sunset: string;
} | null {
  const sunriseH = SUNRISE_BY_MONTH[month - 1] ?? null;
  const sunsetH = SUNSET_BY_MONTH[month - 1] ?? null;
  if (sunriseH === null || sunsetH === null) return null;
  return {
    sunrise: formatHourFraction(sunriseH),
    sunset: formatHourFraction(sunsetH),
  };
}

function formatHourFraction(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 59 : m).padStart(2, '0')}`;
}
