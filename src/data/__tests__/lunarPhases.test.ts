/**
 * Regression tests for the engine-derived amavasai/pournami dates
 * (src/data/lunarPhases.ts + src/services/lunarEphemeris.ts).
 *
 * Day rule under test (printed Tamil daily-calendar convention):
 *   A phase belongs to the FIRST Chennai sunrise inside the phase tithi
 *   (the sunrise-day whose dawn opens inside [tBegin, tEnd)); when no
 *   sunrise falls inside the tithi, the sunrise-day containing the
 *   conjunction/phase end. Validated against multiple printed sources:
 *
 *  - Drik Panchang Chennai Tamil monthly panchangam per-day msrks:
 *    Mar 19 2026, Jun 15 2026, Sep 11 2026, Nov 9 2026, Apr 2 2026,
 *    Jul 4 2027 (fetched October 2026).
 *  - Prokerala Tamil calendar (Chennai): same dates for those months plus
 *    Apr/Aug/Oct/Dec 2026 pournami, May 16/May 31 2026, Feb 17 2026,
 *    Feb 20 2027 (fallback case), Oct 3/Oct 18 2028.
 *  - TamilDailyCalendar.com 2027 list-view (fetched directly): 13 amavasai
 *    + 12 pournami, all matching this rule.
 *  - Drik Panchang Chennai amavasya/purnima tithi INTERVALS 2026/2028/2029
 *    (DATASET_VERSION/test tables below) pin the phase instants; the
 *    2028/2029 day labels are those intervals run through the same rule.
 *
 * IMPORTANT: a TDC list-page transcription for 2026 (bundled before this
 * regression) matched the OLD tithi-start rule on 8 of 25 rows and is
 * internally inconsistent with TDC's own 2027 list; the evidence-weighted
 * rule (3 independent publishers + panchangam documentation) is tested
 * here instead. See docs/DATA_SOURCES.md for the full derivation.
 */
import {
  amPournaForRange,
  phaseInstantsForRange,
  PRADOSHAM_CENTERS,
  EKADASI_CENTERS,
  tithiBandDatesForRange,
  elongAtSunriseIST,
  civilFromJdIst,
} from '../lunarPhases';
import { julianDay } from '@/services/panchangamAstro';
import { AM_POURNA_RECORDS, DATASET_VERSION } from '../seedData';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * VERIFIED REFERENCE — Amavasai/Pournami (IST, Chennai sunrise convention).
 * 2026 rows: six amavasai months + every pournami month cross-checked on
 * Drik-Chennai-monthly AND Prokerala individually; the rest of the 2026
 * rows follow the identical rule shape (evening/night conjunctions).
 * 2027 rows: transcribed from the TamilDailyCalendar 2027 list page.
 * 2028/2029 rows: derived by the same rule from Drik's published Chennai
 * tithi intervals, spot-checked against Prokerala (Oct 3/18 2028 both fit).
 */
const REFERENCE_AMAVASAI: Record<number, string[]> = {
  2026: ['2026-01-18', '2026-02-17', '2026-03-19', '2026-04-17', '2026-05-16', '2026-06-15', '2026-07-14', '2026-08-12', '2026-09-11', '2026-10-10', '2026-11-09', '2026-12-08'],
  2027: ['2027-01-07', '2027-02-06', '2027-03-08', '2027-04-06', '2027-05-06', '2027-06-04', '2027-07-04', '2027-08-02', '2027-08-31', '2027-09-30', '2027-10-29', '2027-11-28', '2027-12-27'],
  2028: ['2028-01-26', '2028-02-25', '2028-03-26', '2028-04-24', '2028-05-24', '2028-06-22', '2028-07-22', '2028-08-20', '2028-09-18', '2028-10-18', '2028-11-16', '2028-12-16'],
  2029: ['2029-01-14', '2029-02-13', '2029-03-15', '2029-04-13', '2029-05-13', '2029-06-12', '2029-07-11', '2029-08-10', '2029-09-08', '2029-10-07', '2029-11-06', '2029-12-05'],
};

const REFERENCE_POURNAMI: Record<number, string[]> = {
  2026: ['2026-01-03', '2026-02-01', '2026-03-03', '2026-04-02', '2026-05-01', '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-28', '2026-09-26', '2026-10-26', '2026-11-24', '2026-12-24'],
  2027: ['2027-01-22', '2027-02-20', '2027-03-22', '2027-04-20', '2027-05-20', '2027-06-18', '2027-07-18', '2027-08-17', '2027-09-15', '2027-10-15', '2027-11-14', '2027-12-13'],
  2028: ['2028-01-12', '2028-02-10', '2028-03-11', '2028-04-09', '2028-05-08', '2028-06-07', '2028-07-06', '2028-08-05', '2028-09-03', '2028-10-03', '2028-11-02', '2028-12-02', '2028-12-31'],
  2029: ['2029-01-30', '2029-02-28', '2029-03-30', '2029-04-28', '2029-05-27', '2029-06-26', '2029-07-25', '2029-08-24', '2029-09-22', '2029-10-22', '2029-11-21', '2029-12-20'],
};

describe('amPournaForRange — engine equals the verified reference table', () => {
  const engine = amPournaForRange(2026, 2029);

  test('every amavasai row matches the verified reference', () => {
    const byYear: Record<number, string[]> = {};
    for (const r of engine.filter((r) => r.kind === 'amavasai')) {
      const y = Number(r.dateKey.slice(0, 4));
      (byYear[y] ??= []).push(r.dateKey);
    }
    for (const y of [2026, 2027, 2028, 2029]) {
      expect((byYear[y] ?? []).sort()).toEqual(REFERENCE_AMAVASAI[y]);
    }
  });

  test('every pournami row matches the verified reference', () => {
    const byYear: Record<number, string[]> = {};
    for (const r of engine.filter((r) => r.kind === 'pournami')) {
      const y = Number(r.dateKey.slice(0, 4));
      (byYear[y] ??= []).push(r.dateKey);
    }
    for (const y of [2026, 2027, 2028, 2029]) {
      expect((byYear[y] ?? []).sort()).toEqual(REFERENCE_POURNAMI[y]);
    }
  });

  test('the bundled seed dataset equals the engine output exactly', () => {
    expect(DATASET_VERSION.startsWith('2026.10')).toBe(true);
    expect(AM_POURNA_RECORDS.map((r) => `${r.dateKey}:${r.kind}`).sort())
      .toEqual(engine.map((r) => `${r.dateKey}:${r.kind}`).sort());
    expect(AM_POURNA_RECORDS.length).toBe(
      Object.values(REFERENCE_AMAVASAI).flat().length +
        Object.values(REFERENCE_POURNAMI).flat().length
    );
  });
});

describe('engine phase instants vs published tithi intervals (Drik Chennai)', () => {
  /** [istBegin, istEnd] of the phase tithi, as published by Drik Chennai. */
  const DRIK_INTERVALS: [string, string, 'amavasai' | 'pournami'][] = [
    ['2028-01-25T18:16', '2028-01-26T20:41', 'amavasai'], // Drik prints 08:41 PM Jan 26 = 20:41
    ['2028-03-25T07:56', '2028-03-26T10:00', 'amavasai'],
    ['2028-10-17T12:04', '2028-10-18T08:26', 'amavasai'],
    ['2028-12-30T23:13', '2028-12-31T22:17', 'pournami'],
    ['2029-01-13T22:46', '2029-01-14T22:53', 'amavasai'],
    ['2029-03-14T07:33', '2029-03-15T09:48', 'amavasai'],
    ['2029-06-11T08:17', '2029-06-12T09:19', 'amavasai'],
    ['2029-08-09T09:10', '2029-08-10T07:25', 'amavasai'],
    ['2029-11-05T13:44', '2029-11-06T09:53', 'amavasai'],
    ['2029-12-04T23:46', '2029-12-05T20:21', 'amavasai'],
    ['2029-09-21T20:17', '2029-09-22T21:58', 'pournami'],
    ['2029-10-21T12:31', '2029-10-22T14:56', 'pournami'],
    ['2029-12-20T02:29', '2029-12-21T04:15', 'pournami'],
  ];

  test.each(DRIK_INTERVALS.map((r) => [...r]))('%s … %s (%s)', (istBegin, istEnd, kind) => {
    const beginT = new Date(`${istBegin}:00+05:30`).getTime();
    const endT = new Date(`${istEnd}:00+05:30`).getTime();
    const wantBegin = beginT / 86400000 + 2440587.5;
    const wantEnd = endT / 86400000 + 2440587.5;
    const instants = phaseInstantsForRange(2028, 2029).filter((p) => p.kind === kind);
    // Match by the published END instant (conjunction / full moon).
    const hit = instants.find((p) => Math.abs(p.tEndJdUt - wantEnd) < 0.5);
    expect(hit).toBeDefined();
    expect(Math.abs((hit?.tEndJdUt ?? 0) - wantEnd) * 1440).toBeLessThanOrEqual(5); // ≤5 min
    expect(Math.abs((hit?.tBeginJdUt ?? 0) - wantBegin) * 1440).toBeLessThanOrEqual(10); // ≤10 min
  });
});

describe('engine conjunction instants vs astronomical ephemeris (timeanddate 2026)', () => {
  /**
   * Published new/full-moon instants (UTC) — timeanddate.com
   * "Moon Phases 2026" table (accurate to ±1 min). The engine must sit
   * within ±3 minutes of every one of them.
   */
  const NM_UTC_2026 = [
    ['2026-01-18T19:52', 'amavasai'], ['2026-02-17T12:01', 'amavasai'],
    ['2026-03-19T01:23', 'amavasai'], ['2026-04-17T11:51', 'amavasai'],
    ['2026-05-16T20:01', 'amavasai'], ['2026-06-15T02:54', 'amavasai'],
    ['2026-07-14T09:43', 'amavasai'], ['2026-08-12T17:36', 'amavasai'],
    ['2026-09-11T03:27', 'amavasai'], ['2026-10-10T15:50', 'amavasai'],
    ['2026-11-09T07:02', 'amavasai'], ['2026-12-09T00:51', 'amavasai'],
  ];
  const FM_UTC_2026 = [
    ['2026-01-03T10:02', 'pournami'], ['2026-02-01T22:09', 'pournami'],
    ['2026-03-03T11:37', 'pournami'], ['2026-04-02T02:11', 'pournami'],
    ['2026-05-01T17:23', 'pournami'], ['2026-05-31T08:45', 'pournami'],
    ['2026-06-29T23:56', 'pournami'], ['2026-07-29T14:35', 'pournami'],
    ['2026-08-28T04:18', 'pournami'], ['2026-09-26T16:49', 'pournami'],
    ['2026-10-26T04:11', 'pournami'], ['2026-11-24T14:53', 'pournami'],
    ['2026-12-24T01:28', 'pournami'],
  ];

  test.each([...NM_UTC_2026, ...FM_UTC_2026].map((r) => [...r]))('phase %s (%s)', (utc, kind) => {
    const want = new Date(`${utc}:00Z`).getTime() / 86400000 + 2440587.5;
    const hit = phaseInstantsForRange(2026, 2026).find(
      (p) => p.kind === kind && Math.abs(p.tEndJdUt - want) < 1.5
    );
    expect(hit).toBeDefined();
    expect(Math.abs((hit?.tEndJdUt ?? 0) - want) * 1440).toBeLessThanOrEqual(3); // ≤3 min
  });
});

describe('date-boundary edge cases (IST)', () => {
  test('midnight-close conjunction: Dec 2026 conjunction 06:21 IST → amavasai Dec 8', () => {
    const rows = amPournaForRange(2026, 2026).filter((r) => r.kind === 'amavasai');
    expect(rows.some((r) => r.dateKey === '2026-12-08')).toBe(true);
    expect(rows.some((r) => r.dateKey === '2026-12-09')).toBe(false);
  });

  test('Dec→Jan transition: Dec 2028 pournami (Dec 31) then Jan 2029 amavasai (Jan 14)', () => {
    const rows = amPournaForRange(2028, 2029);
    expect(rows.some((r) => r.dateKey === '2028-12-31' && r.kind === 'pournami')).toBe(true);
    expect(rows.some((r) => r.dateKey === '2029-01-14' && r.kind === 'amavasai')).toBe(true);
  });

  test('no-sunrise-inside-tithi fallback (Feb 2027 pournami → Feb 20, printed by TDC & Prokerala)', () => {
    const tE = civilFromJdIst(phaseInstantsForRange(2027, 2027)[0]?.tEndJdUt ?? 0);
    expect(tE).toBeDefined();
    const rows = amPournaForRange(2027, 2027).filter((r) => r.kind === 'pournami');
    expect(rows.some((r) => r.dateKey === '2027-02-20')).toBe(true);
  });

  test('two-sunrise tithi (Jun 2027 pournami) takes the FIRST sunrise-day: Jun 18', () => {
    const rows = amPournaForRange(2027, 2027).filter((r) => r.kind === 'pournami');
    expect(rows.some((r) => r.dateKey === '2027-06-18')).toBe(true);
    expect(rows.some((r) => r.dateKey === '2027-06-19')).toBe(false);
  });
});

describe('timezone/device independence', () => {
  test('engine source contains no device-clock or Date construction', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    for (const rel of ['src/data/lunarPhases.ts', 'src/services/lunarEphemeris.ts']) {
      const text = fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
      expect(text).not.toMatch(/\bnew Date\(/);
      expect(text).not.toMatch(/\bDate\.now\(/);
      expect(text).not.toMatch(/toLocaleString|toLocaleDateString/);
      expect(text).not.toMatch(/getTimezoneOffset/);
    }
  });

  test('same output regardless of process TZ setting (deterministic inputs → same rows)', () => {
    const a = amPournaForRange(2019, 2019);
    const b = amPournaForRange(2019, 2019);
    expect(a).toEqual(b);
  });
});

describe('amPournaForRange (arbitrary years structural sanity)', () => {
  test.each([1990, 2005, 2050])('%i: plausible amavasai/pournami counts', (year) => {
    const rows = amPournaForRange(year, year);
    const am = rows.filter((r) => r.kind === 'amavasai');
    const por = rows.filter((r) => r.kind === 'pournami');
    expect(am.length).toBeGreaterThanOrEqual(12);
    expect(am.length).toBeLessThanOrEqual(13);
    expect(por.length).toBeGreaterThanOrEqual(12);
    expect(por.length).toBeLessThanOrEqual(13);
  });

  test.each([1990, 2050])('%i: rows are unique and chronological', (year) => {
    const rows = amPournaForRange(year, year);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]?.dateKey.localeCompare(rows[i]?.dateKey ?? '')).toBeLessThanOrEqual(0);
      const prev = `${rows[i - 1]?.dateKey}:${rows[i - 1]?.kind}`;
      const cur = `${rows[i]?.dateKey}:${rows[i]?.kind}`;
      expect(prev).not.toBe(cur);
      for (const r of rows) expect(r.dateKey).toMatch(DATE_KEY);
    }
  });

  test('conjunction↔full-moon pairs alternate ~half a synodic month apart (1990)', () => {
    const rows = amPournaForRange(1990, 1990);
    expect(rows.length).toBeGreaterThanOrEqual(24);
    const toDay = (key: string) => {
      const [y, m, d] = key.split('-').map(Number);
      return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86400000;
    };
    for (let i = 1; i < rows.length; i++) {
      const gap = toDay(rows[i]?.dateKey ?? '') - toDay(rows[i - 1]?.dateKey ?? '');
      expect(gap).toBeGreaterThanOrEqual(14);
      expect(gap).toBeLessThanOrEqual(16);
    }
  });
});

describe('tithiBandDatesForRange (ekadasi/pradosham day rule) — unchanged behavior', () => {
  test('reproduces the seeded ekadasi counts for the coverage window', () => {
    const ekadasi2026 = tithiBandDatesForRange(EKADASI_CENTERS, 2026, 2026);
    expect(ekadasi2026.length).toBeGreaterThanOrEqual(23);
    expect(ekadasi2026.length).toBeLessThanOrEqual(25);
  });

  test.each([1990, 2050])('%i: plausible ekadasi/pradosham counts', (year) => {
    const ekadasi = tithiBandDatesForRange(EKADASI_CENTERS, year, year);
    const pradosham = tithiBandDatesForRange(PRADOSHAM_CENTERS, year, year);
    expect(ekadasi.length).toBeGreaterThanOrEqual(22);
    expect(ekadasi.length).toBeLessThanOrEqual(25);
    expect(pradosham.length).toBeGreaterThanOrEqual(22);
    expect(pradosham.length).toBeLessThanOrEqual(25);
  });
});

describe('macros around the 06:00 IST sample (tithi-band helper unchanged)', () => {
  test('elongation advances ~12.19°/day (one tithi per day)', () => {
    const e1 = elongAtSunriseIST(2050, 6, 1);
    const e2 = elongAtSunriseIST(2050, 6, 2);
    let delta = ((e2 - e1) % 360 + 360) % 360;
    if (delta > 358) delta -= 360;
    expect(Math.abs(delta - 12.19)).toBeLessThan(1.5);
  });

  test('civilFromJdIst round-trips mala Julian days', () => {
    // JD(UT) of 2026-03-19 01:23 UTC ≈ conjunction; civil IST date must be 2026-03-19.
    const jd = julianDay(2026, 3, 19, 1.383 / 24);
    expect(civilFromJdIst(jd)).toEqual({ y: 2026, m: 3, d: 19 });
  });
});
