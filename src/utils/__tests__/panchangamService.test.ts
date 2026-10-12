import {
  computeInauspiciousTimings,
  computeNallaNeramApprox,
  segmentToPeriod,
  minToHhmm,
} from '../../services/panchangamService';

const sun = { sunrise: '06:00', sunset: '18:00' }; // 6:00..18:00, 12h day

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

  test('Rahu Kalam on Sunday = 7th segment (16:30-18:00)', () => {
    const r = computeInauspiciousTimings(0, sun);
    expect(rahuEnds(r.rahuKalam)).toBe('18:00');
    expect(rahuStarts(r.rahuKalam)).toBe('16:30');
  });

  test('Rahu Kalam on Monday = 1st segment (07:30-09:00)', () => {
    const r = computeInauspiciousTimings(1, sun);
    expect(r.rahuKalam).toBe('07:30 - 09:00');
  });

  test('Yamagandam on Sunday = 5th segment (12:00-13:30)', () => {
    const r = computeInauspiciousTimings(0, sun);
    expect(r.yamagandam).toBe('12:00 - 13:30');
  });

  test('Kuligai on Tuesday = 4th segment (10:30-12:00)', () => {
    const r = computeInauspiciousTimings(2, sun);
    expect(r.kuligai).toBe('10:30 - 12:00');
  });

  test('returns null timings when sun data missing', () => {
    const r = computeInauspiciousTimings(0, { sunrise: null, sunset: null });
    expect(r.rahuKalam).toBeNull();
    expect(r.yamagandam).toBeNull();
    expect(r.kuligai).toBeNull();
  });

  test('Nalla Neram approximate: excludes first & last eighths', () => {
    expect(computeNallaNeramApprox(sun)).toBe('07:30 - 16:30');
  });

  test('Nalla Neram null without sun times', () => {
    expect(computeNallaNeramApprox({ sunrise: null, sunset: null })).toBeNull();
  });
});

function rahuStarts(v: string | null): string | null {
  return v ? v.split('-')[0]?.trim() ?? null : null;
}
function rahuEnds(v: string | null): string | null {
  return v ? v.split('-')[1]?.trim() ?? null : null;
}
