/**
 * Seed dataset integrity + correctness tests.
 *
 * Correctness anchors were cross-checked against Drik Panchang's Chennai
 * location (geoname 1264527) in October 2026:
 *  - Chennai Tamil Deepavali 2026 = 8 Nov 2026 (NOT 19 Oct 2026, which was
 *    Durga Ashtami); Tamil Deepavali 2027 = 28 Oct 2027 (north Deepavali is
 *    29 Oct that year — the regional distinction matters).
 *  - Thaipoosam 2026 = 1 Feb, 2027 = 22 Jan (Poosam nakshatra in Thai).
 *  - Maha Shivarathri 2026 = 15 Feb, 2027 = 6 Mar (Nishita puja past
 *    midnight does not move the festival day).
 *  - Karadaiyan Nombu 2026 = 14 Mar, 2027 = 15 Mar (Meena Sankranti).
 *  - Vinayakar Chaturthi 2026 = 14 Sep (Chaturthi tithi reaches 15 Sep,
 *    but the observance day is 14 Sep), 2027 = 4 Sep.
 */
import {
  SEED_FESTIVALS,
  SUBHA_MUHURTHAM_DATES,
  approxSunriseSunset,
  DATASET_VERSION,
  DATASET_COVERAGE_START,
  DATASET_COVERAGE_END,
} from '../seedData';
import {
  julianDay,
  tithiIndex,
  toSidereal,
  sunMoonLongitudesAtJd,
} from '@/services/panchangamAstro';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Drik-verified (dateKey, English name) pairs that must never regress. */
const DRIK_ANCHORS: [string, string][] = [
  ['2026-01-14', 'Thai Pongal'],
  ['2026-04-14', 'Tamil New Year (Puthandu)'],
  ['2026-02-01', 'Thaipoosam'],
  ['2026-02-15', 'Maha Shivarathri'],
  ['2026-03-14', 'Karadaiyan Nombu'],
  ['2026-09-14', 'Vinayakar Chaturthi'],
  ['2026-11-08', 'Deepavali'],
  ['2027-01-22', 'Thaipoosam'],
  ['2027-03-06', 'Maha Shivarathri'],
  ['2027-03-15', 'Karadaiyan Nombu'],
  ['2027-09-04', 'Vinayakar Chaturthi'],
  ['2027-10-28', 'Deepavali'],
];

describe('seed dataset integrity', () => {
  test('every festival row has a valid dateKey and a non-empty source', () => {
    for (const f of SEED_FESTIVALS) {
      expect(f.dateKey).toMatch(DATE_KEY);
      expect(f.nameTa.length).toBeGreaterThan(0);
      expect(f.nameEn.length).toBeGreaterThan(0);
      expect(f.source.length).toBeGreaterThan(0);
      expect(['tamil', 'hindu', 'national', 'tamilnadu', 'observance']).toContain(f.category);
    }
  });

  test('no duplicate dateKey+name rows', () => {
    const seen = new Set<string>();
    for (const f of SEED_FESTIVALS) {
      const key = `${f.dateKey}:${f.nameEn}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test('all rows fall inside the coverage window', () => {
    expect(DATASET_COVERAGE_START < DATASET_COVERAGE_END).toBe(true);
    for (const f of SEED_FESTIVALS) {
      expect(f.dateKey >= DATASET_COVERAGE_START).toBe(true);
      expect(f.dateKey <= DATASET_COVERAGE_END).toBe(true);
    }
    expect(DATASET_VERSION.length).toBeGreaterThan(0);
  });

  test.each(DRIK_ANCHORS.map(([date, name]) => [`${name} on ${date}`, date, name]))(
    '%s',
    (_label, date, name) => {
      const rows = SEED_FESTIVALS.filter((f) => f.nameEn === name);
      expect(rows.some((f) => f.dateKey === date)).toBe(true);
      // Each named festival appears exactly once per its (yearly) occurrence.
      expect(rows.length).toBe(new Set(rows.map((f) => f.dateKey)).size);
      expect(new Set(rows.map((f) => f.nameEn)).size).toBe(1);
    }
  );
});

describe('Chennai sunrise/sunset approximation table', () => {
  const REAL_MIDMONTH_2026: [number, string, string][] = [
    // [month, real sunrise, real sunset] (Alpenglow Chennai 2026, mid-month)
    [1, '06:35', '18:01'],
    [6, '05:42', '18:36'],
    [10, '05:59', '17:50'],
    [12, '06:23', '17:44'],
  ];

  test('formatted output is valid HH:mm and respects month anchors', () => {
    const HHMM = /^\d{2}:\d{2}$/;
    for (let m = 1; m <= 12; m++) {
      const s = approxSunriseSunset(m);
      expect(s).not.toBeNull();
      expect(s?.sunrise).toMatch(HHMM);
      expect(s?.sunset).toMatch(HHMM);
    }
    expect(approxSunriseSunset(0)).toBeNull();
    expect(approxSunriseSunset(13)).toBeNull();
  });

  test('mid-month values stay within ±7 min of the Alpenglow 2026 table', () => {
    const toMin = (v: string) => {
      const [h, m] = v.split(':').map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };
    for (const [month, rise, set] of REAL_MIDMONTH_2026) {
      const s = approxSunriseSunset(month);
      expect(Math.abs(toMin(s?.sunrise ?? '') - toMin(rise))).toBeLessThanOrEqual(7);
      expect(Math.abs(toMin(s?.sunset ?? '') - toMin(set))).toBeLessThanOrEqual(7);
    }
  });

  test('sunset is always after sunrise and the seasonal shape is correct', () => {
    for (let m = 1; m <= 12; m++) {
      const s = approxSunriseSunset(m);
      if (!s) continue;
      const rise = Number(s.sunrise.slice(0, 2)) + Number(s.sunrise.slice(3)) / 60;
      const set = Number(s.sunset.slice(0, 2)) + Number(s.sunset.slice(3)) / 60;
      expect(set - rise).toBeGreaterThan(11); // Chennai day length ~11.4–12.9h
      expect(set - rise).toBeLessThan(13.2);
    }
    // Longest days around June, shortest around December/January.
    expect(approxSunriseSunset(6)?.sunrise).toBe('05:42');
    const jun = approxSunriseSunset(6);
    const dec = approxSunriseSunset(12);
    if (jun && dec) expect(dec.sunset < jun.sunset).toBe(true);
  });
});

describe('Subha Muhurtham day list', () => {
  /**
   * (dateKey, published weekday) pairs transcribed alongside the bundled
   * list from TamilDailyCalendar's Suba Muhurtham 2026 page. Every pair
   * pins the transcription: seed entry, weekday and date must agree.
   */
  const PUBLISHED_WEEKDAYS: [string, number][] = [
    ['2026-01-28', 3], // Wed
    ['2026-02-06', 5], ['2026-02-08', 0], ['2026-02-13', 5], ['2026-02-15', 0], ['2026-02-16', 1], ['2026-02-20', 5],
    ['2026-03-05', 4], ['2026-03-06', 5], ['2026-03-08', 0], ['2026-03-15', 0], ['2026-03-16', 1], ['2026-03-25', 3],
    ['2026-04-06', 1], ['2026-04-12', 0], ['2026-04-13', 1], ['2026-04-16', 4], ['2026-04-20', 1], ['2026-04-23', 4], ['2026-04-30', 4],
    ['2026-05-08', 5], ['2026-05-13', 3], ['2026-05-14', 4], ['2026-05-18', 1], ['2026-05-28', 4], ['2026-05-29', 5],
    ['2026-06-04', 4], ['2026-06-07', 0], ['2026-06-17', 3], ['2026-06-18', 4], ['2026-06-24', 3], ['2026-06-25', 4],
    ['2026-07-02', 4], ['2026-07-05', 0], ['2026-07-12', 0],
    ['2026-08-23', 0], ['2026-08-30', 0], ['2026-08-31', 1],
    ['2026-09-07', 1], ['2026-09-13', 0], ['2026-09-17', 4],
    ['2026-10-25', 0], ['2026-10-30', 5],
    ['2026-11-01', 0], ['2026-11-11', 3], ['2026-11-13', 5], ['2026-11-15', 0], ['2026-11-16', 1], ['2026-11-20', 5], ['2026-11-29', 0],
    ['2026-12-04', 5], ['2026-12-06', 0], ['2026-12-10', 4], ['2026-12-13', 0], ['2026-12-14', 1],
  ];

  /**
   * 2027 — TamilDailyCalendar Suba Muhurtham list (same publisher as 2026);
   * weekday column read off the page.
   */
  const PUBLISHED_WEEKDAYS_2027: [string, number][] = [
    ['2027-01-20', 3], ['2027-01-28', 4],
    ['2027-02-08', 1], ['2027-02-10', 3], ['2027-02-11', 4], ['2027-02-12', 5], ['2027-02-18', 4], ['2027-02-25', 4], ['2027-02-26', 5],
    ['2027-03-04', 4], ['2027-03-10', 3], ['2027-03-11', 4], ['2027-03-12', 5], ['2027-03-15', 1], ['2027-03-17', 3], ['2027-03-18', 4], ['2027-03-24', 3], ['2027-03-25', 4],
    ['2027-04-01', 4], ['2027-04-04', 0], ['2027-04-08', 4], ['2027-04-11', 0], ['2027-04-12', 1], ['2027-04-18', 0], ['2027-04-23', 5], ['2027-04-25', 0], ['2027-04-26', 1],
    ['2027-05-03', 1], ['2027-05-09', 0], ['2027-05-12', 3], ['2027-05-16', 0], ['2027-05-17', 1], ['2027-05-23', 0], ['2027-05-26', 3], ['2027-05-27', 4], ['2027-05-28', 5],
    ['2027-06-07', 1], ['2027-06-10', 4], ['2027-06-13', 0], ['2027-06-14', 1], ['2027-06-23', 3], ['2027-06-24', 4], ['2027-06-25', 5],
    ['2027-07-05', 1], ['2027-07-07', 3], ['2027-07-09', 5], ['2027-07-14', 3], ['2027-07-16', 5],
    ['2027-08-20', 5], ['2027-08-22', 0], ['2027-08-23', 1], ['2027-08-27', 5], ['2027-08-29', 0],
    ['2027-09-03', 5], ['2027-09-05', 0], ['2027-09-12', 0], ['2027-09-13', 1],
    ['2027-10-20', 3], ['2027-10-22', 5], ['2027-10-27', 3],
    ['2027-11-01', 1], ['2027-11-05', 5], ['2027-11-08', 1], ['2027-11-10', 3], ['2027-11-11', 4], ['2027-11-12', 5], ['2027-11-15', 1], ['2027-11-18', 4], ['2027-11-25', 4],
    ['2027-12-02', 4], ['2027-12-05', 0], ['2027-12-08', 3], ['2027-12-09', 4], ['2027-12-10', 5],
  ];

  /**
   * 2029 — AstroHood சுப முகூர்த்தம் (marriage) list; the page does not print
   * weekdays, they are calendar-derived and pin transcription in the same way.
   */
  const PUBLISHED_WEEKDAYS_2029: [string, number][] = [
    ['2029-01-03', 3], ['2029-01-04', 4], ['2029-01-06', 6], ['2029-01-09', 2], ['2029-01-10', 3], ['2029-01-14', 0], ['2029-01-16', 2], ['2029-01-18', 4], ['2029-01-20', 6], ['2029-01-21', 0], ['2029-01-25', 4], ['2029-01-31', 3],
    ['2029-02-01', 4], ['2029-02-02', 5], ['2029-02-04', 0], ['2029-02-08', 4], ['2029-02-11', 0], ['2029-02-14', 3], ['2029-02-15', 4], ['2029-02-17', 6], ['2029-02-24', 6], ['2029-02-25', 0], ['2029-02-28', 3],
    ['2029-03-01', 4], ['2029-03-07', 3], ['2029-03-11', 0], ['2029-03-14', 3],
    ['2029-04-15', 0], ['2029-04-18', 3], ['2029-04-19', 4], ['2029-04-24', 2], ['2029-04-25', 3], ['2029-04-29', 0],
    ['2029-05-01', 2], ['2029-05-03', 4], ['2029-05-08', 2], ['2029-05-09', 3], ['2029-05-10', 4], ['2029-05-13', 0], ['2029-05-14', 1], ['2029-05-15', 2], ['2029-05-17', 4], ['2029-05-22', 2], ['2029-05-23', 3], ['2029-05-24', 4], ['2029-05-27', 0], ['2029-05-28', 1], ['2029-05-29', 2], ['2029-05-30', 3], ['2029-05-31', 4],
    ['2029-06-05', 2], ['2029-06-06', 3], ['2029-06-07', 4], ['2029-06-10', 0], ['2029-06-13', 3], ['2029-06-14', 4], ['2029-06-16', 6], ['2029-06-20', 3], ['2029-06-21', 4], ['2029-06-23', 6], ['2029-06-27', 3], ['2029-06-28', 4],
    ['2029-07-03', 2], ['2029-07-08', 0], ['2029-07-11', 3], ['2029-07-12', 4], ['2029-07-15', 0], ['2029-07-16', 1], ['2029-07-17', 2], ['2029-07-22', 0], ['2029-07-25', 3], ['2029-07-26', 4], ['2029-07-29', 0], ['2029-07-31', 2],
    ['2029-08-05', 0], ['2029-08-07', 2], ['2029-08-08', 3], ['2029-08-10', 5], ['2029-08-11', 6], ['2029-08-14', 2], ['2029-08-15', 3], ['2029-08-21', 2], ['2029-08-26', 0], ['2029-08-28', 2],
    ['2029-09-03', 1], ['2029-09-04', 2], ['2029-09-08', 6], ['2029-09-09', 0], ['2029-09-11', 2], ['2029-09-13', 4], ['2029-09-17', 1], ['2029-09-18', 2], ['2029-09-19', 3], ['2029-09-22', 6], ['2029-09-23', 0], ['2029-09-24', 1], ['2029-09-27', 4],
    ['2029-10-03', 3], ['2029-10-04', 4], ['2029-10-07', 0], ['2029-10-08', 1], ['2029-10-10', 3], ['2029-10-11', 4], ['2029-10-14', 0], ['2029-10-16', 2], ['2029-10-17', 3], ['2029-10-18', 4], ['2029-10-19', 5], ['2029-10-22', 1], ['2029-10-25', 4], ['2029-10-26', 5], ['2029-10-28', 0], ['2029-10-31', 3],
    ['2029-11-01', 4], ['2029-11-03', 6], ['2029-11-07', 3], ['2029-11-09', 5], ['2029-11-10', 6], ['2029-11-11', 0], ['2029-11-14', 3], ['2029-11-15', 4], ['2029-11-17', 6], ['2029-11-21', 3], ['2029-11-22', 4], ['2029-11-25', 0], ['2029-11-27', 2],
    ['2029-12-01', 6], ['2029-12-02', 0], ['2029-12-04', 2], ['2029-12-06', 4], ['2029-12-09', 0], ['2029-12-11', 2], ['2029-12-13', 4], ['2029-12-16', 0], ['2029-12-20', 4], ['2029-12-23', 0], ['2029-12-25', 2], ['2029-12-26', 3],
  ];

  test('list is complete, valid, unique and matches the published weekday for every entry', () => {
    const all: [string, number][] = [...PUBLISHED_WEEKDAYS, ...PUBLISHED_WEEKDAYS_2027, ...PUBLISHED_WEEKDAYS_2029];
    expect(SUBHA_MUHURTHAM_DATES).toHaveLength(all.length);
    expect(SUBHA_MUHURTHAM_DATES).toHaveLength(267); // 55 (2026) + 74 (2027) + 138 (2029)
    for (const [key, weekday] of all) {
      const row = SUBHA_MUHURTHAM_DATES.find((m) => m.dateKey === key);
      expect(row).toBeDefined();
      const [y, m, d] = key.split('-').map(Number);
      expect(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).getDay()).toBe(weekday);
    }
    expect(new Set(SUBHA_MUHURTHAM_DATES.map((m) => m.dateKey)).size).toBe(
      SUBHA_MUHURTHAM_DATES.length
    );
    for (const m of SUBHA_MUHURTHAM_DATES) {
      expect(m.dateKey).toMatch(DATE_KEY);
      expect(m.dateKey >= DATASET_COVERAGE_START).toBe(true);
      expect(m.dateKey <= DATASET_COVERAGE_END).toBe(true);
      if (m.paksha !== undefined) {
        expect(['Valarpirai', 'Theipirai']).toContain(m.paksha);
      }
    }
    // 2028 has no published list: no 2028 rows may exist.
    expect(SUBHA_MUHURTHAM_DATES.some((m) => m.dateKey.startsWith('2028-'))).toBe(false);
  });

  test('published paksha labels agree with the engine phase at sunrise', () => {
    const mismatches: string[] = [];
    let labelled = 0;
    for (const { dateKey, paksha } of SUBHA_MUHURTHAM_DATES) {
      if (paksha === undefined) continue; // 2027/2029 rows: unreliable or absent labels.
      labelled++;
      const [y, m, d] = dateKey.split('-').map(Number);
      // Evaluated at ~06:00 IST sunrise, the same instant the app uses.
      const jd = julianDay(y ?? 0, m ?? 1, d ?? 1, (6 * 60 - 330) / 1440);
      const sid = toSidereal(sunMoonLongitudesAtJd(jd), jd);
      const isShukla = tithiIndex(sid.elongation) < 15;
      if ((paksha === 'Valarpirai') !== isShukla) mismatches.push(`${dateKey}=${paksha}`);
    }
    // Only the 2026 source published a paksha column that survives cross-checks.
    expect(labelled).toBe(55);
    expect(mismatches).toEqual([]);
  });
});
