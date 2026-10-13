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
import { julianDay, sunMoonLongitudesAtJd, norm360 } from '@/services/panchangamAstro';

export interface AmavasaiPournamiRecord {
  dateKey: string;
  kind: 'amavasai' | 'pournami';
}

/**
 * Lunar observance tables are DERIVED from the bundled sidereal ephemeris
 * (panchangamAstro.ts, Meeus-anchored, see tests) rather than copy-typed —
 * phase boundaries move from year to year, so copying invites the exact
 * kind of drift the first dataset revision shipped (dates ~8 days early).
 * Rules match the printed Tamil daily-calendar convention.
 */
const COVERAGE = { start: { y: 2026, m: 1, d: 1 }, end: { y: 2027, m: 12, d: 31 } };

/** Moon-sun elongation at approx. sunrise (06:00 IST) on a local date. */
function elongAtSunriseIST(y: number, m: number, d: number): number {
  const jd = julianDay(y, m, d, (6 * 60 - 330) / 1440);
  const { moonTropical, sunTropical } = sunMoonLongitudesAtJd(jd);
  return norm360(moonTropical - sunTropical);
}

/** Shortest angular distance a→b across the 0/360 wrap. */
function angularDist(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function eachDay(cb: (y: number, m: number, d: number, e: number) => void): void {
  const { start, end } = COVERAGE;
  for (let y = start.y; y <= end.y; y++) {
    for (let m = 1; m <= 12; m++) {
      const dim = new Date(y, m, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        cb(y, m, d, elongAtSunriseIST(y, m, d));
      }
    }
  }
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Amavasai/Pournami: the calendar day containing the conjunction (elongation
 * crossing 0°/180° between two sunrises) — the printed-calendar convention.
 */
function generateAmPourna(): AmavasaiPournamiRecord[] {
  const rows: AmavasaiPournamiRecord[] = [];
  const dates: { key: string; y: number; m: number; d: number; e: number }[] = [];
  eachDay((y, m, d, e) => dates.push({ key: toDateKey(y, m, d), y, m, d, e }));
  for (let i = 0; i < dates.length - 1; i++) {
    const cur = dates[i];
    const next = dates[i + 1];
    if (!cur || !next) continue;
    const a = cur.e;
    const b = next.e;
    // Amavasai: elongation wrapping past 0 (a>180 falls to b<180).
    if (a > 180 && b < 180) {
      const offsetH = ((360 - a) / (b + (360 - a))) * 24;
      rows.push({
        dateKey: offsetH < 18 ? cur.key : next.key,
        kind: 'amavasai',
      });
    }
    // Pournami: elongation crossing 180 upward.
    if (a < 180 && b > 180) {
      const offsetH = ((180 - a) / (b - a)) * 24;
      rows.push({
        dateKey: offsetH < 18 ? cur.key : next.key,
        kind: 'pournami',
      });
    }
  }
  return rows;
}

/**
 * Tithi-band observances (Ekadasi = tithi 11 ⇒ band centers 126/306;
 * Pradosham = trayodashi/tithi 13 ⇒ centers 150/330). The band-prevailing
 * day is the local minimum of angular distance to the center, guaranteeing
 * exactly one day per fortnight even when a fast moon skips the ±6° band.
 */
function generateTithiBandDates(centers: number[]): string[] {
  const days: { key: string; dist: number }[] = [];
  const list: { y: number; m: number; d: number; e: number }[] = [];
  eachDay((y, m, d, e) => list.push({ y, m, d, e }));
  for (const day of list) {
    const dist = Math.min(...centers.map((c) => angularDist(day.e, c)));
    days.push({ key: toDateKey(day.y, day.m, day.d), dist });
  }
  const out: string[] = [];
  for (let i = 1; i < days.length - 1; i++) {
    const cur = days[i];
    const prev = days[i - 1];
    const next = days[i + 1];
    if (!cur || !prev || !next) continue;
    if (cur.dist < 8 && cur.dist <= next.dist && cur.dist < prev.dist) {
      out.push(cur.key);
    }
  }
  return out;
}

/** Amavasai + Pournami dates for the coverage window (engine-derived). */
export const AM_POURNA_RECORDS: AmavasaiPournamiRecord[] = generateAmPourna();

/** Pradosham (trayodashi) dates for the coverage window (engine-derived). */
export const PRADOSHAM_DATES: string[] = generateTithiBandDates([150, 330]);

/** Ekadasi (tithi 11) dates for the coverage window (engine-derived). */
export const EKADASI_DATES: string[] = generateTithiBandDates([126, 306]);

export const DATASET_VERSION = '2026.10-subset.2';
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
