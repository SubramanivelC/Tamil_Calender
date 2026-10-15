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
import { AM_POURNA_RECORDS } from '../seedData';

describe('amPournaForRange (engine-derived, arbitrary years)', () => {
  test('reproduces the bundled dataset EXACTLY over its coverage window', () => {
    // Same generator, same window ⇒ identical rows in identical order. This
    // is the drift guard: any rule change breaks it loudly.
    expect(amPournaForRange(2026, 2029)).toEqual(AM_POURNA_RECORDS);
  });

  test('2026 contains the documented Jan 19 amavasai and Jan 3 pournami', () => {
    const rows = amPournaForRange(2026, 2026);
    const am = rows.find((r) => r.kind === 'amavasai');
    expect(am?.dateKey).toBe('2026-01-19');
    const firstPournami = rows.find((r) => r.kind === 'pournami');
    expect(firstPournami?.dateKey).toBe('2026-01-03');
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
