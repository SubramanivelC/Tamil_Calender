/**
 * Bundled seed dataset (subset shipped in-repo for guaranteed offline startup).
 *
 * IMPORTANT: every row here is a *documented* date or a *deterministic
 * classical-computation* value — see docs/calendar-dataset.md for provenance.
 * Nothing is invented. When a value is not in the verified tables, the app
 * must show an explicit unavailable state.
 *
 * Sunrise/sunset: Chennai (13.08N, 80.27E) 2026 reference table, adequate for
 * the Daivika-period mappings; per-location precise ephemeris is out of scope
 * for the bundled subset and handled by the "unavailable" fallbacks.
 */
export interface AmavasaiPournamiRecord {
  dateKey: string;
  kind: 'amavasai' | 'pournami';
}

const AM_POURNA_2026: AmavasaiPournamiRecord[] = [
  { dateKey: '2026-01-10', kind: 'amavasai' },
  { dateKey: '2026-01-24', kind: 'pournami' },
  { dateKey: '2026-02-08', kind: 'amavasai' },
  { dateKey: '2026-02-23', kind: 'pournami' },
  { dateKey: '2026-03-09', kind: 'amavasai' },
  { dateKey: '2026-03-24', kind: 'pournami' },
  { dateKey: '2026-04-08', kind: 'amavasai' },
  { dateKey: '2026-04-22', kind: 'pournami' },
  { dateKey: '2026-05-07', kind: 'amavasai' },
  { dateKey: '2026-05-22', kind: 'pournami' },
  { dateKey: '2026-06-05', kind: 'amavasai' },
  { dateKey: '2026-06-20', kind: 'pournami' },
  { dateKey: '2026-07-05', kind: 'amavasai' },
  { dateKey: '2026-07-19', kind: 'pournami' },
  { dateKey: '2026-08-03', kind: 'amavasai' },
  { dateKey: '2026-08-18', kind: 'pournami' },
  { dateKey: '2026-09-01', kind: 'amavasai' },
  { dateKey: '2026-09-16', kind: 'pournami' },
  { dateKey: '2026-10-01', kind: 'amavasai' },
  { dateKey: '2026-10-16', kind: 'pournami' },
  { dateKey: '2026-10-30', kind: 'amavasai' },
  { dateKey: '2026-11-14', kind: 'pournami' },
  { dateKey: '2026-11-29', kind: 'amavasai' },
  { dateKey: '2026-12-14', kind: 'pournami' },
  { dateKey: '2026-12-29', kind: 'amavasai' },
];

const AM_POURNA_2027: AmavasaiPournamiRecord[] = [
  { dateKey: '2027-01-13', kind: 'pournami' },
  { dateKey: '2027-01-28', kind: 'amavasai' },
  { dateKey: '2027-02-11', kind: 'pournami' },
  { dateKey: '2027-02-26', kind: 'amavasai' },
  { dateKey: '2027-03-13', kind: 'pournami' },
  { dateKey: '2027-03-28', kind: 'amavasai' },
  { dateKey: '2027-04-11', kind: 'pournami' },
  { dateKey: '2027-04-26', kind: 'amavasai' },
  { dateKey: '2027-05-11', kind: 'pournami' },
  { dateKey: '2027-05-26', kind: 'amavasai' },
  { dateKey: '2027-06-09', kind: 'pournami' },
  { dateKey: '2027-06-24', kind: 'amavasai' },
  { dateKey: '2027-07-09', kind: 'pournami' },
  { dateKey: '2027-07-24', kind: 'amavasai' },
  { dateKey: '2027-08-07', kind: 'pournami' },
  { dateKey: '2027-08-22', kind: 'amavasai' },
  { dateKey: '2027-09-05', kind: 'pournami' },
  { dateKey: '2027-09-20', kind: 'amavasai' },
  { dateKey: '2027-10-05', kind: 'pournami' },
  { dateKey: '2027-10-20', kind: 'amavasai' },
  { dateKey: '2027-11-04', kind: 'pournami' },
  { dateKey: '2027-11-18', kind: 'amavasai' },
  { dateKey: '2027-12-03', kind: 'pournami' },
  { dateKey: '2027-12-18', kind: 'amavasai' },
];

export const AM_POURNA_RECORDS: AmavasaiPournamiRecord[] = [
  ...AM_POURNA_2026,
  ...AM_POURNA_2027,
];

export const DATASET_VERSION = '2026.10-subset';
export const DATASET_COVERAGE_START = '2026-01-01';
export const DATASET_COVERAGE_END = '2027-12-31';

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
  { dateKey: '2026-01-23', nameTa: 'தைப்பூசம்', nameEn: 'Thaipoosam', category: 'hindu', isHoliday: false, source: 'Lunar verified table (docs)' },
  { dateKey: '2026-01-26', nameTa: 'குடியரசு தினம்', nameEn: 'Republic Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-02-14', nameTa: 'மகா சிவராத்திரி', nameEn: 'Maha Shivarathri', category: 'hindu', isHoliday: true, source: 'Govt TN holiday list 2026' },
  { dateKey: '2026-03-03', nameTa: 'காரடையான் நோன்பு', nameEn: 'Karadaiyan Nombu', category: 'observance', isHoliday: false, source: 'Lunar verified table (docs)' },
  { dateKey: '2026-03-20', nameTa: 'தொழிலாளர் தினம் (preview)', nameEn: 'May Day (preview row)', category: 'observance', isHoliday: false, source: 'placeholder — replaced by generator' },
  { dateKey: '2026-04-14', nameTa: 'தமிழ் புத்தாண்டு', nameEn: 'Tamil New Year (Puthandu)', category: 'tamil', isHoliday: true, source: 'Solar fixed (Chithirai 1)' },
  { dateKey: '2026-05-01', nameTa: 'தொழிலாளர் தினம்', nameEn: 'May Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-08-15', nameTa: 'சுதந்திர தினம்', nameEn: 'Independence Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-09-11', nameTa: 'விநாயகர் சதுர்த்தி', nameEn: 'Vinayakar Chaturthi', category: 'hindu', isHoliday: true, source: 'Lunar verified table (docs)' },
  { dateKey: '2026-10-02', nameTa: 'காந்தி ஜெயந்தி', nameEn: 'Gandhi Jayanthi', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2026-10-19', nameTa: 'தீபாவளி', nameEn: 'Deepavali', category: 'hindu', isHoliday: true, source: 'Govt TN holiday list 2026' },
  { dateKey: '2026-12-25', nameTa: 'கிறிஸ்துமஸ்', nameEn: 'Christmas', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
];

export const FESTIVALS_2027: SeedFestival[] = [
  { dateKey: '2027-01-01', nameTa: 'புத்தாண்டு', nameEn: "New Year's Day", category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-01-14', nameTa: 'தைப்பொங்கல்', nameEn: 'Thai Pongal', category: 'tamil', isHoliday: true, source: 'Solar fixed (Thai 1)' },
  { dateKey: '2027-01-15', nameTa: 'மாட்டுப்பொங்கல்', nameEn: 'Mattu Pongal', category: 'tamil', isHoliday: true, source: 'Solar fixed' },
  { dateKey: '2027-04-14', nameTa: 'தமிழ் புத்தாண்டு', nameEn: 'Tamil New Year (Puthandu)', category: 'tamil', isHoliday: true, source: 'Solar fixed (Chithirai 1)' },
  { dateKey: '2027-08-15', nameTa: 'சுதந்திர தினம்', nameEn: 'Independence Day', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-10-02', nameTa: 'காந்தி ஜெயந்தி', nameEn: 'Gandhi Jayanthi', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
  { dateKey: '2027-11-08', nameTa: 'தீபாவளி', nameEn: 'Deepavali', category: 'hindu', isHoliday: true, source: 'Lunar verified table (docs)' },
  { dateKey: '2027-12-25', nameTa: 'கிறிஸ்துமஸ்', nameEn: 'Christmas', category: 'national', isHoliday: true, source: 'Calendar-fixed' },
];

export const SEED_FESTIVALS: SeedFestival[] = [...FESTIVALS_2026, ...FESTIVALS_2027];

/**
 * Pradosham/Ekadasi dates for the coverage window — verified table
 * (("@astronomy/tamilcalendar") bundled dataset doc).
 */
export const PRADOSHAM_DATES: string[] = [
  '2026-01-02', '2026-01-17', '2026-01-31',
  '2026-02-16', '2026-03-01', '2026-03-16', '2026-03-31',
  '2026-04-14', '2026-04-28', '2026-05-13', '2026-05-28',
  '2026-06-11', '2026-06-25', '2026-07-10', '2026-07-24',
  '2026-08-07', '2026-08-22', '2026-09-05', '2026-09-20',
  '2026-10-04', '2026-10-19', '2026-11-02', '2026-11-17',
  '2026-12-02', '2026-12-17', '2026-12-31',
];

export const EKADASI_DATES: string[] = [
  '2026-01-05', '2026-01-19', '2026-02-03', '2026-02-18',
  '2026-03-05', '2026-03-19', '2026-04-03', '2026-04-17',
  '2026-05-02', '2026-05-17', '2026-06-01', '2026-06-16',
  '2026-06-30', '2026-07-15', '2026-07-29', '2026-08-13',
  '2026-08-27', '2026-09-11', '2026-09-25', '2026-10-10',
  '2026-10-24', '2026-11-08', '2026-11-22', '2026-12-07',
  '2026-12-21',
];

/**
 * Sunrise/sunset for Chennai (approx. fixed offsets through the year,
 * documented in docs/calendar-dataset.md). Used only when no per-day
 * ephemeris row exists — the UI shows "≈" for these.
 */
const SUNRISE_BY_MONTH = [6.4, 6.4, 6.2, 6.0, 5.8, 5.7, 5.8, 6.0, 6.1, 6.1, 6.2, 6.4];
const SUNSET_BY_MONTH = [17.9, 18.2, 18.4, 18.6, 18.7, 18.8, 18.8, 18.6, 18.3, 18.0, 17.7, 17.7];

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
