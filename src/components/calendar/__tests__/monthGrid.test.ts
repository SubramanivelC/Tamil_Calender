import { buildMonthGrid } from '../monthGrid';

describe('buildMonthGrid', () => {
  test('April 2026 starts on Wednesday and yields 35 cells with Sunday start', () => {
    // 2026-04-01 is a Wednesday (weekday 3). With firstDayOfWeek=0 lead is 3.
    const cells = buildMonthGrid({ year: 2026, month: 4, firstDayOfWeek: 0 });
    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBe(35);
    const first = cells[0];
    expect(first).toBeDefined();
    expect(first?.weekday).toBe(0);
    expect(first?.inMonth).toBe(false);
    expect(first?.key).toBe('2026-03-29');
    const apr1 = cells.find((c) => c.key === '2026-04-01');
    expect(apr1?.inMonth).toBe(true);
    const apr30 = cells.find((c) => c.key === '2026-04-30');
    expect(apr30?.inMonth).toBe(true);
  });

  test('February 2024 (leap) covers 29 days across 35 cells', () => {
    const cells = buildMonthGrid({ year: 2024, month: 2, firstDayOfWeek: 0 });
    expect(cells.filter((c) => c.inMonth).map((c) => c.day).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 29 }, (_, i) => i + 1)
    );
  });

  test('Monday-first week starts weeks on Monday', () => {
    const cells = buildMonthGrid({ year: 2026, month: 4, firstDayOfWeek: 1 });
    expect(cells[0]?.key).toBe('2026-03-30'); // Monday
    expect(cells[0]?.weekday).toBe(1);
  });

  test('December-January: month transition produces valid adjacent cells', () => {
    const cells = buildMonthGrid({ year: 2026, month: 12, firstDayOfWeek: 0 });
    const dec31 = cells.find((c) => c.key === '2026-12-31');
    expect(dec31?.inMonth).toBe(true);
    const janKeys = cells.filter((c) => c.key.startsWith('2027-01'));
    expect(janKeys.length).toBeGreaterThan(0);
  });

  test('festival flags propagate', () => {
    const cells = buildMonthGrid({
      year: 2026,
      month: 1,
      firstDayOfWeek: 0,
      festivalKeys: new Set(['2026-01-14', '2026-01-15']),
    });
    expect(cells.find((c) => c.key === '2026-01-14')?.hasFestival).toBe(true);
    expect(cells.find((c) => c.key === '2026-01-16')?.hasFestival).toBe(false);
  });

  test('tamilDay mapper applies to cells', () => {
    const cells = buildMonthGrid({
      year: 2026,
      month: 4,
      firstDayOfWeek: 0,
      tamilDayFor: (key) => (key === '2026-04-14' ? 1 : null),
    });
    expect(cells.find((c) => c.key === '2026-04-14')?.tamilDay).toBe(1);
    expect(cells.find((c) => c.key === '2026-04-15')?.tamilDay).toBeNull();
  });

  test('amavasai/pournami decorations propagate to cells', () => {
    const cells = buildMonthGrid({
      year: 2026,
      month: 1,
      firstDayOfWeek: 0,
      decorations: new Map([
        ['2026-01-19', { isAmavasai: true }],
        ['2026-01-04', { isPournami: true }],
      ]),
    });
    const amavasai = cells.find((c) => c.key === '2026-01-19');
    expect(amavasai?.isAmavasai).toBe(true);
    expect(amavasai?.isPournami).toBe(false);
    const pournami = cells.find((c) => c.key === '2026-01-04');
    expect(pournami?.isPournami).toBe(true);
    expect(pournami?.isAmavasai).toBe(false);
    // A plain day carries no moon flags.
    const plain = cells.find((c) => c.key === '2026-01-10');
    expect(plain?.isAmavasai).toBe(false);
    expect(plain?.isPournami).toBe(false);
  });
});
