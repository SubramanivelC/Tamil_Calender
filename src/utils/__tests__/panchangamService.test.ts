import {
  computeInauspiciousTimings,
  computeNallaNeramGowri,
  computeSoolamParikaram,
  segmentToPeriod,
  minToHhmm,
  RAHU_SEGMENTS,
  YAMA_SEGMENTS,
  KULI_SEGMENTS,
  GOWRI_DAY_SEQUENCES,
} from '../../services/panchangamService';

const sun = { sunrise: '06:00', sunset: '18:00' }; // 6:00..18:00, 12h day, 90-min eighths

describe('panchangam timing service', () => {
  test('minToHhmm formats', () => {
    expect(minToHhmm(360)).toBe('06:00');
    expect(minToHhmm(1079)).toBe('17:59');
    expect(minToHhmm(1080)).toBe('18:00');
  });

  test('segments divide the day between sunrise and sunset', () => {
    const p = segmentToPeriod(0, 360, 1080);
    expect(p).toEqual({ start: 360, end: 450 }); // 06:00-07:30
    const p7 = segmentToPeriod(7, 360, 1080);
    expect(p7).toEqual({ start: 990, end: 1080 }); // 16:30-18:00
  });

  /**
   * Printed-calendar weekdays tables (Drik Panchang / TamilDot): the day is
   * divided into 8 equal parts from sunrise; part k -> segment index k-1.
   * These 21 cases pin every cell of all three tables exactly.
   */
  const PRINTED_RULES = [
    // Rahu Kalam: Sun p8, Mon p2, Tue p7, Wed p5, Thu p6, Fri p4, Sat p3
    ['Rahu Kalam Sunday = 8th part (16:30-18:00)', RAHU_SEGMENTS, 0, 7, '16:30 - 18:00'],
    ['Rahu Kalam Monday = 2nd part (07:30-09:00)', RAHU_SEGMENTS, 1, 1, '07:30 - 09:00'],
    ['Rahu Kalam Tuesday = 7th part (15:00-16:30)', RAHU_SEGMENTS, 2, 6, '15:00 - 16:30'],
    ['Rahu Kalam Wednesday = 5th part (12:00-13:30)', RAHU_SEGMENTS, 3, 4, '12:00 - 13:30'],
    ['Rahu Kalam Thursday = 6th part (13:30-15:00)', RAHU_SEGMENTS, 4, 5, '13:30 - 15:00'],
    ['Rahu Kalam Friday = 4th part (10:30-12:00)', RAHU_SEGMENTS, 5, 3, '10:30 - 12:00'],
    ['Rahu Kalam Saturday = 3rd part (09:00-10:30)', RAHU_SEGMENTS, 6, 2, '09:00 - 10:30'],
    // Yamagandam: Sun p5, Mon p4, Tue p3, Wed p2, Thu p1, Fri p7, Sat p6
    ['Yamagandam Sunday = 5th part (12:00-13:30)', YAMA_SEGMENTS, 0, 4, '12:00 - 13:30'],
    ['Yamagandam Monday = 4th part (10:30-12:00)', YAMA_SEGMENTS, 1, 3, '10:30 - 12:00'],
    ['Yamagandam Tuesday = 3rd part (09:00-10:30)', YAMA_SEGMENTS, 2, 2, '09:00 - 10:30'],
    ['Yamagandam Wednesday = 2nd part (07:30-09:00)', YAMA_SEGMENTS, 3, 1, '07:30 - 09:00'],
    ['Yamagandam Thursday = 1st part (06:00-07:30)', YAMA_SEGMENTS, 4, 0, '06:00 - 07:30'],
    ['Yamagandam Friday = 7th part (15:00-16:30)', YAMA_SEGMENTS, 5, 6, '15:00 - 16:30'],
    ['Yamagandam Saturday = 6th part (13:30-15:00)', YAMA_SEGMENTS, 6, 5, '13:30 - 15:00'],
    // Kuligai: Sun p7, Mon p6, Tue p5, Wed p4, Thu p3, Fri p2, Sat p1
    ['Kuligai Sunday = 7th part (15:00-16:30)', KULI_SEGMENTS, 0, 6, '15:00 - 16:30'],
    ['Kuligai Monday = 6th part (13:30-15:00)', KULI_SEGMENTS, 1, 5, '13:30 - 15:00'],
    ['Kuligai Tuesday = 5th part (12:00-13:30)', KULI_SEGMENTS, 2, 4, '12:00 - 13:30'],
    ['Kuligai Wednesday = 4th part (10:30-12:00)', KULI_SEGMENTS, 3, 3, '10:30 - 12:00'],
    ['Kuligai Thursday = 3rd part (09:00-10:30)', KULI_SEGMENTS, 4, 2, '09:00 - 10:30'],
    ['Kuligai Friday = 2nd part (07:30-09:00)', KULI_SEGMENTS, 5, 1, '07:30 - 09:00'],
    ['Kuligai Saturday = 1st part (06:00-07:30)', KULI_SEGMENTS, 6, 0, '06:00 - 07:30'],
  ] as const;

  test.each(PRINTED_RULES)('%s', (_name, table, weekday, expectedSegment, expectedText) => {
    expect(table[weekday]).toBe(expectedSegment);
    const r = computeInauspiciousTimings(weekday, sun);
    const field =
      table === RAHU_SEGMENTS ? r.rahuKalam : table === YAMA_SEGMENTS ? r.yamagandam : r.kuligai;
    expect(field).toBe(expectedText);
  });

  test('returns null timings when sun data missing', () => {
    const r = computeInauspiciousTimings(0, { sunrise: null, sunset: null });
    expect(r.rahuKalam).toBeNull();
    expect(r.yamagandam).toBeNull();
    expect(r.kuligai).toBeNull();
  });

  /** Structural guard: the arrays must be 7 long in weekday order (0=Sun). */
  test('segment tables cover all 7 weekdays', () => {
    for (const table of [RAHU_SEGMENTS, YAMA_SEGMENTS, KULI_SEGMENTS]) {
      expect(table).toHaveLength(7);
      for (const seg of table) expect(seg).toBeGreaterThanOrEqual(0);
    }
  });

  /**
   * Gowri Nalla Neram (கௌரி நல்ல நேரம்), printed-calendar convention:
   * favourable labels (Amirtham, Dhanam, Uthi, Labam, Sugam) merged into
   * consecutive windows. Sequences cross-checked against Drik Panchang
   * weekday tables (Tuesday anchor: 1 Rogam, 2 Labam, 3 Dhanam, 4 Sugam,
   * 5 Soram, 6 Uthi, 7 Visham, 8 Amirtham).
   */
  test('Gowri sequences match the printed weekday tables', () => {
    const L = { Rogam: 0, Labam: 1, Dhanam: 2, Sugam: 3, Soram: 4, Uthi: 5, Visham: 6, Amirtham: 7 };
    expect(GOWRI_DAY_SEQUENCES[0]).toEqual([L.Uthi, L.Amirtham, L.Rogam, L.Labam, L.Dhanam, L.Sugam, L.Soram, L.Visham]);
    expect(GOWRI_DAY_SEQUENCES[1]).toEqual([L.Amirtham, L.Visham, L.Rogam, L.Labam, L.Dhanam, L.Sugam, L.Soram, L.Uthi]);
    expect(GOWRI_DAY_SEQUENCES[2]).toEqual([L.Rogam, L.Labam, L.Dhanam, L.Sugam, L.Soram, L.Uthi, L.Visham, L.Amirtham]);
    expect(GOWRI_DAY_SEQUENCES[3]).toEqual([L.Labam, L.Dhanam, L.Sugam, L.Soram, L.Visham, L.Uthi, L.Amirtham, L.Rogam]);
    expect(GOWRI_DAY_SEQUENCES[4]).toEqual([L.Dhanam, L.Sugam, L.Soram, L.Uthi, L.Amirtham, L.Visham, L.Rogam, L.Labam]);
    expect(GOWRI_DAY_SEQUENCES[5]).toEqual([L.Sugam, L.Soram, L.Uthi, L.Visham, L.Amirtham, L.Rogam, L.Labam, L.Dhanam]);
    expect(GOWRI_DAY_SEQUENCES[6]).toEqual([L.Soram, L.Uthi, L.Visham, L.Amirtham, L.Rogam, L.Labam, L.Dhanam, L.Sugam]);
    for (const seq of GOWRI_DAY_SEQUENCES) {
      expect(seq).toHaveLength(8);
      expect([...seq].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  test('Tuesday Nalla Neram from 06:00-18:00 equals printed windows', () => {
    // Favourable parts 2-4 (Labam/Dhanam/Sugam), 6 (Uthi), 8 (Amirtham)
    expect(computeNallaNeramGowri(2, sun)).toBe('07:30 - 12:00 · 13:30 - 15:00 · 16:30 - 18:00');
  });

  test('Sunday Nalla Neram from 06:00-18:00 equals printed windows', () => {
    // Favourable parts 1-2 (Uthi/Amirtham) and 4-6 (Labam/Dhanam/Sugam)
    expect(computeNallaNeramGowri(0, sun)).toBe('06:00 - 09:00 · 10:30 - 15:00');
  });

  test('Friday Nalla Neram from 06:00-18:00 equals printed windows', () => {
    // Favourable parts 1, 3, 5 and 7-8
    expect(computeNallaNeramGowri(5, sun)).toBe('06:00 - 07:30 · 09:00 - 10:30 · 12:00 - 13:30 · 15:00 - 18:00');
  });

  test('Nalla Neram null without sun times', () => {
    expect(computeNallaNeramGowri(0, { sunrise: null, sunset: null })).toBeNull();
  });

  test('Nalla Neram windows honour a different sunrise/sunset', () => {
    // Saturday, sunrise 06:10 sunset 17:30 -> 8 parts of 85 min: 366..1050
    // Favourable parts 2,4,6,7,8: p2 07:35-09:00, p4 10:25-11:50, p6 13:15-16:35(6-8 merged 13:15-17:30)
    expect(computeNallaNeramGowri(6, { sunrise: '06:10', sunset: '17:30' })).toBe(
      '07:35 - 09:00 · 10:25 - 11:50 · 13:15 - 17:30'
    );
  });

  /**
   * Vaara Soolam + Parigaram table, cross-checked against Tamil daily
   * calendar sheets (Prokerala shoolam calculator Mon/Sat East, Wed North;
   * tamilporutham & tamildailycalendar daily rows; Oneindia cardinal
   * remedies). Bilingual strings must contain both languages for the
   * cleanBilingualValue splitter.
   */
  test.each([
    ['Sunday soolam West, jaggery', 0, 'மேற்கு / West', 'வெல்லம் / Jaggery'],
    ['Monday soolam East, curd', 1, 'கிழக்கு / East', 'தயிர் / Curd'],
    ['Tuesday soolam North, milk', 2, 'வடக்கு / North', 'பால் / Milk'],
    ['Wednesday soolam North, milk', 3, 'வடக்கு / North', 'பால் / Milk'],
    ['Thursday soolam South, oil', 4, 'தெற்கு / South', 'எண்ணெய் / Oil'],
    ['Friday soolam West, jaggery', 5, 'மேற்கு / West', 'வெல்லம் / Jaggery'],
    ['Saturday soolam East, curd', 6, 'கிழக்கு / East', 'தயிர் / Curd'],
  ])('%s', (_label, weekday, direction, remedy) => {
    const r = computeSoolamParikaram(weekday);
    expect(r.soolam).toBe(direction);
    expect(r.parikaram).toBe(remedy);
    for (const v of [r.soolam, r.parikaram]) {
      expect(v).toMatch(/[\u0B80-\u0BFF]/); // has Tamil segment
      expect(v).toContain('/'); // has English segment
    }
  });

  test('soolam weekday normalization wraps across the week boundary', () => {
    expect(computeSoolamParikaram(7).soolam).toBe(computeSoolamParikaram(0).soolam);
    expect(computeSoolamParikaram(9).soolam).toBe(computeSoolamParikaram(2).soolam);
    expect(computeSoolamParikaram(-1).soolam).toBe(computeSoolamParikaram(6).soolam);
  });
});
