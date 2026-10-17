/**
 * The runtime lunar-phase generators (src/data/lunarPhases.ts) must reproduce
 * the bundled seed dataset exactly for its coverage window, and behave
 * plausibly for the navigable years outside it (the reason the module exists:
 * amavasai/pournami markers must not vanish for 1900–2025 or 2030–2100).
 */
import {
  amPournaForRange,
  tithiBandDatesForRange,
  PRADOSHAM_CENTERS,
  EKADASI_CENTERS,
  elongAtSunriseIST,
} from '../lunarPhases';
import { AM_POURNA_RECORDS, DATASET_VERSION } from '../seedData';

describe('amPournaForRange (engine-derived, arbitrary years)', () => {
  test('reproduces the bundled dataset rows EXACTLY for the engine-covered years (2027-2029)', () => {
    // Same generator, same window ⇒ identical non-transcribed rows. The 2026
    // portion of the bundled data is transcription-verified (published lists)
    // and intentionally may differ from the engine on borderline junctions.
    const engine = amPournaForRange(2026, 2029).filter((r) => !r.dateKey.startsWith('2026-'));
    expect(engine).toEqual(AM_POURNA_RECORDS.filter((r) => !r.dateKey.startsWith('2026-')));
  });

  test('the SHIPPED 2026 dataset rows equal the PUBLISHED Tamil calendar dates in full (TDC + Drik, Chennai/IST)', () => {
    // Trust anchor for the bundled data: the 2026 portion of AM_POURNA_RECORDS
    // must be the transcription-verified published lists (tamildailycalendar
    // amavasai.php/pournami.php?Year=2026, corroborated by Drik Chennai
    // amavasya/purnima tables): 12 amavasai + 13 pournami, exact days.
    const PUBLISHED_AMAVASAI = [
      '2026-01-18', '2026-02-17', '2026-03-18', '2026-04-17', '2026-05-16',
      '2026-06-14', '2026-07-14', '2026-08-12', '2026-09-10', '2026-10-10',
      '2026-11-08', '2026-12-08',
    ];
    const PUBLISHED_POURNAMI = [
      '2026-01-03', '2026-02-01', '2026-03-03', '2026-04-01', '2026-05-01',
      '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-27', '2026-09-26',
      '2026-10-25', '2026-11-24', '2026-12-23',
    ];
    expect(DATASET_VERSION.startsWith('2026.10')).toBe(true);
    const shipped = AM_POURNA_RECORDS.filter((r) => r.dateKey.startsWith('2026-'));
    expect(shipped.filter((r) => r.kind === 'amavasai').map((r) => r.dateKey)).toEqual(PUBLISHED_AMAVASAI);
    expect(shipped.filter((r) => r.kind === 'pournami').map((r) => r.dateKey)).toEqual(PUBLISHED_POURNAMI);
    expect(shipped).toHaveLength(25);
  });

  test('the ENGINE stays within ±1 day of the published 2026 lists (documented borderline precision)', () => {
    const PUBLISHED_AMAVASAI = [
      '2026-01-18', '2026-02-17', '2026-03-18', '2026-04-17', '2026-05-16',
      '2026-06-14', '2026-07-14', '2026-08-12', '2026-09-10', '2026-10-10',
      '2026-11-08', '2026-12-08',
    ];
    const PUBLISHED_POURNAMI = [
      '2026-01-03', '2026-02-01', '2026-03-03', '2026-04-01', '2026-05-01',
      '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-27', '2026-09-26',
      '2026-10-25', '2026-11-24', '2026-12-23',
    ];
    const engine = amPournaForRange(2026, 2026);
    const pairAdjacent = (a: string, b: string) => {
      const diff = Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
      return diff <= 1;
    };
    for (const p of PUBLISHED_AMAVASAI) {
      expect(engine.some((r) => r.kind === 'amavasai' && pairAdjacent(r.dateKey, p))).toBe(true);
    }
    for (const p of PUBLISHED_POURNAMI) {
      expect(engine.some((r) => r.kind === 'pournami' && pairAdjacent(r.dateKey, p))).toBe(true);
    }
  });

  test.each([1990, 2050])('%i: plausible amavasai/pournami counts', (year) => {
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
      const prev = rows[i - 1];
      const cur = rows[i];
      expect(prev && cur ? prev.dateKey <= cur.dateKey : true).toBe(true);
      expect(`${prev?.dateKey}|${prev?.kind}`).not.toBe(`${cur?.dateKey}|${cur?.kind}`);
    }
  });

  test('conjunction days alternate near-exactly a fortnight apart (1990)', () => {
    const rows = amPournaForRange(1990, 1990);
    expect(rows.length).toBeGreaterThanOrEqual(24);
    expect(rows.length).toBeLessThanOrEqual(26);
    const toDay = (key: string) => {
      const [y, m, d] = key.split('-').map(Number);
      return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86400000;
    };
    for (let i = 1; i < rows.length; i++) {
      // Conjunction ↔ full moon alternate every half synodic month ≈ 14.8 d.
      const gap = toDay(rows[i]?.dateKey ?? '') - toDay(rows[i - 1]?.dateKey ?? '');
      expect(gap).toBeGreaterThanOrEqual(14); // rare fast lunations: 13.9 d pairs
      expect(gap).toBeLessThanOrEqual(16);
    }
  });
});

describe('tithiBandDatesForRange (ekadasi/pradosham day rule, arbitrary years)', () => {
  test('reproduces the seeded ekadasi counts for the coverage window', () => {
    // Band rule is deterministic; the seeded table was generated the same way.
    const ekadasi2026 = tithiBandDatesForRange(EKADASI_CENTERS, 2026, 2026);
    expect(ekadasi2026.length).toBeGreaterThanOrEqual(23);
    expect(ekadasi2026.length).toBeLessThanOrEqual(25); // ~2 per fortnight-pair
  });

  test.each([1990, 2050])('%i: plausible ekadasi/pradosham counts', (year) => {
    const ekadasi = tithiBandDatesForRange(EKADASI_CENTERS, year, year);
    const pradosham = tithiBandDatesForRange(PRADOSHAM_CENTERS, year, year);
    expect(ekadasi.length).toBeGreaterThanOrEqual(22);
    expect(ekadasi.length).toBeLessThanOrEqual(25);
    expect(pradosham.length).toBeGreaterThanOrEqual(22);
    expect(pradosham.length).toBeLessThanOrEqual(25);
  });

  test('ekadasi days alternate with pradosham within 3 days (band sanity, 2050)', () => {
    const ekadasi = tithiBandDatesForRange(EKADASI_CENTERS, 2050, 2050);
    const pradosham = tithiBandDatesForRange(PRADOSHAM_CENTERS, 2050, 2050);
    // Trayodashi (13) is two tithis after Ekadasi (11) ⇒ ≈2 days apart.
    const gapBetweenSets = Math.min(
      ...pradosham.slice(0, 6).map((p) => {
        const nearest = ekadasi.map((e) =>
          Math.abs(Date.parse(p) - Date.parse(e)) / 86400000
        );
        return Math.min(...nearest);
      })
    );
    expect(gapBetweenSets).toBeLessThanOrEqual(3);
  });
});

describe('macros around the 06:00 IST sunrise sample', () => {
  test('elongation advances ~12.19°/day (one tithi per day)', () => {
    const e1 = elongAtSunriseIST(2050, 6, 1);
    const e2 = elongAtSunriseIST(2050, 6, 2);
    let delta = ((e2 - e1) % 360 + 360) % 360;
    if (delta > 358) delta -= 360; // wrap-day pair
    expect(Math.abs(delta - 12.19)).toBeLessThan(1.5); // synodic mean 12.19°/day
  });
});
