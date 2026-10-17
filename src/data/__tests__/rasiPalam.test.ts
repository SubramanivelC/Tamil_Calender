import {
  RASI_NAMES,
  PADA_SPLIT_STAR_INDICES,
  rasiIndexForStar,
  palamCategoryForTransit,
  computeDailyPalam,
  computeDailyPalamForAllRasis,
  janmaRasiFromBirth,
  moonRasiIndexAtJd,
  julianDayAtSunrise,
} from '../rasiPalam';
import { toSidereal, sunMoonLongitudesAtJd } from '@/services/panchangamAstro';

describe('rasiIndexForStar (star → janma rasi)', () => {
  test('whole stars map to their owning rasi', () => {
    expect(rasiIndexForStar(0)).toBe(0); // Ashwini → Mesham
    expect(rasiIndexForStar(1)).toBe(0); // Bharani → Mesham
    expect(rasiIndexForStar(3)).toBe(1); // Rohini → Rishabam
    expect(rasiIndexForStar(5)).toBe(2); // Thiruvathirai → Mithunam
    expect(rasiIndexForStar(7)).toBe(3); // Poosam → Kadagam
    expect(rasiIndexForStar(8)).toBe(3); // Ayilyam → Kadagam
    expect(rasiIndexForStar(9)).toBe(4); // Makam → Simmam
    expect(rasiIndexForStar(10)).toBe(4); // Pooram → Simmam
    expect(rasiIndexForStar(12)).toBe(5); // Hastham → Kanniyam
    expect(rasiIndexForStar(14)).toBe(6); // Swathi → Thulaam
    expect(rasiIndexForStar(16)).toBe(7); // Anusham → Vrischikam
    expect(rasiIndexForStar(17)).toBe(7); // Kettai → Vrischikam
    expect(rasiIndexForStar(18)).toBe(8); // Moolam → Dhanusu
    expect(rasiIndexForStar(19)).toBe(8); // Pooradam → Dhanusu
    expect(rasiIndexForStar(21)).toBe(9); // Thiruvonam → Makaram
    expect(rasiIndexForStar(23)).toBe(10); // Sadayam → Kumbham
    expect(rasiIndexForStar(25)).toBe(11); // Uthirattathi → Meenam
    expect(rasiIndexForStar(26)).toBe(11); // Revathi → Meenam
  });

  test('pada-split stars honour the pada (1..4)', () => {
    // Krittika: pada 1 Mesham, 2-4 Rishabam
    expect(rasiIndexForStar(2, 1)).toBe(0);
    expect(rasiIndexForStar(2, 2)).toBe(1);
    expect(rasiIndexForStar(2, 4)).toBe(1);
    // Mrigashira: 1-2 Rishabam, 3-4 Mithunam
    expect(rasiIndexForStar(4, 1)).toBe(1);
    expect(rasiIndexForStar(4, 3)).toBe(2);
    // Punarpoosam: 1-3 Mithunam, 4 Kadagam
    expect(rasiIndexForStar(6, 1)).toBe(2);
    expect(rasiIndexForStar(6, 4)).toBe(3);
    // Uthiram: 1 Simmam, 2-4 Kanniyam
    expect(rasiIndexForStar(11, 1)).toBe(4);
    expect(rasiIndexForStar(11, 2)).toBe(5);
    // Chithirai: 1-2 Kanniyam, 3-4 Thulaam
    expect(rasiIndexForStar(13, 2)).toBe(5);
    expect(rasiIndexForStar(13, 3)).toBe(6);
    // Visakam: 1-3 Thulaam, 4 Vrischikam
    expect(rasiIndexForStar(15, 3)).toBe(6);
    expect(rasiIndexForStar(15, 4)).toBe(7);
    // Uthiradam: 1 Dhanusu, 2-4 Makaram
    expect(rasiIndexForStar(20, 1)).toBe(8);
    expect(rasiIndexForStar(20, 2)).toBe(9);
    // Avittam: 1-2 Makaram, 3-4 Kumbham
    expect(rasiIndexForStar(22, 1)).toBe(9);
    expect(rasiIndexForStar(22, 3)).toBe(10);
    // Poorattathi: 1-3 Kumbham, 4 Meenam
    expect(rasiIndexForStar(24, 3)).toBe(10);
    expect(rasiIndexForStar(24, 4)).toBe(11);
  });

  test('the split-star list is exactly the nine two-rasi stars', () => {
    expect(PADA_SPLIT_STAR_INDICES).toEqual([2, 4, 6, 11, 13, 15, 20, 22, 24]);
  });

  test('every rasi is reachable and names cover 12 signs', () => {
    const covered = new Set<number>();
    for (let star = 0; star < 27; star++) {
      for (const pada of [1, 2, 3, 4] as const) {
        covered.add(rasiIndexForStar(star, pada));
      }
    }
    expect(covered.size).toBe(12);
    expect(RASI_NAMES.length).toBe(12);
  });
});

describe('palamCategoryForTransit (Chandra gochara)', () => {
  test('canonical positions', () => {
    expect(palamCategoryForTransit(3)).toBe('best'); // 3rd — courage/success
    expect(palamCategoryForTransit(11)).toBe('best'); // 11th — gains
    expect(palamCategoryForTransit(1)).toBe('mixed-good'); // janma rasi
    expect(palamCategoryForTransit(4)).toBe('moderate'); // 4th
    expect(palamCategoryForTransit(8)).toBe('chandrashtama'); // 8th
    expect(palamCategoryForTransit(12)).toBe('caution'); // 12th — expenses
  });

  test('wraps cleanly past 12', () => {
    expect(palamCategoryForTransit(13)).toBe(palamCategoryForTransit(1));
    expect(palamCategoryForTransit(0)).toBe(palamCategoryForTransit(12));
  });
});

describe('computeDailyPalam', () => {
  const sunriseJD = julianDayAtSunrise(2026, 1, 19, '06:30');
  const dayOfYear = 19;

  test('deterministic: same inputs → identical output', () => {
    const a = computeDailyPalam(sunriseJD, 0, dayOfYear);
    const b = computeDailyPalam(sunriseJD, 0, dayOfYear);
    expect(a).toEqual(b);
  });

  test('physical anchor: on the PRINTED amavasai day (Jan 18), the moon sits inside the amavasai tithi band', () => {
    // Printed Tamil calendars label the day on which the amavasai tithi
    // (elong [348°,360°)) BEGINS — not the conjunction instant's day. On that
    // sunrise the moon is 0–12° behind the sun (same/adjacent sidereal rasi).
    const meJD = julianDayAtSunrise(2026, 1, 18, '06:30');
    const elong = toSidereal(sunMoonLongitudesAtJd(meJD), meJD).elongation;
    expect(elong).toBeGreaterThanOrEqual(348);
    expect(elong).toBeLessThan(360);
  });

  test('physical anchor: the morning AFTER conjunction (Jan 19), sun and moon share Makaram', () => {
    // Mid-January the sun is inside Makaram (Makara sankranti ~Jan 14); just
    // past new moon the moon trails it by only ~2°, i.e. the same sidereal rasi.
    const sid = toSidereal(sunMoonLongitudesAtJd(sunriseJD), sunriseJD);
    const sunRasi = Math.floor(sid.sunSidereal / 30);
    expect(sunRasi).toBe(9); // Makaram
    expect(computeDailyPalam(sunriseJD, 9, dayOfYear).transit).toBe(1);
    expect(computeDailyPalam(sunriseJD, 9, dayOfYear).moonRasiIndex).toBe(9);
  });

  test('transit varies with the janma rasi (1..12 coverage)', () => {
    const seen = new Set<number>();
    for (let janma = 0; janma < 12; janma++) {
      seen.add(computeDailyPalam(sunriseJD, janma, dayOfYear).transit);
    }
    expect(seen.size).toBe(12);
  });

  test('headline and palam text are present for every transit', () => {
    for (let janma = 0; janma < 12; janma++) {
      const p = computeDailyPalam(sunriseJD, janma, dayOfYear);
      expect(p.headline).toBeTruthy();
      expect(p.palam).toContain('/');
    }
  });
});

describe('janmaRasiFromBirth (janma rasi finder from date of birth + time)', () => {
  test('anchor: born on the Jan 19 2026 amavasai sunrise → Makaram (index 9)', () => {
    // The engine-verified anchor: sun and moon both sit in Makaram at that
    // sunrise, so a birth then must return janma rasi Makaram.
    expect(janmaRasiFromBirth(2026, 1, 19, '06:00')).toBe(9);
  });

  test('matches moonRasiIndexAtJd for any instant of the day', () => {
    const jd = julianDayAtSunrise(2026, 6, 15, '05:42');
    expect(janmaRasiFromBirth(2026, 6, 15, '06:00')).toBe(moonRasiIndexAtJd(jd));
  });

  test('later in the day can cross into the next rasi near a boundary', () => {
    // Whole-day sampling must only ever produce valid rasi indices.
    for (let h = 0; h < 24; h++) {
      const r = janmaRasiFromBirth(1990, 5, 21, `${String(h).padStart(2, '0')}:30`);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(11);
    }
  });

  test('round-trip: the found rasi equals the star+pada derivation at that instant', () => {
    // Independent cross-check: derive the star AND its pada from the same
    // sidereal moon longitude, then the mapping must return the same rasi.
    const jd = julianDayAtSunrise(1988, 9, 2, '06:15');
    const sid = toSidereal(sunMoonLongitudesAtJd(jd), jd);
    const starWidth = 360 / 27;
    const starIdx = Math.min(Math.floor(sid.moonSidereal / starWidth), 26);
    const pada = Math.min(4, Math.max(1, Math.floor((sid.moonSidereal - starIdx * starWidth) / (starWidth / 4)) + 1)) as 1 | 2 | 3 | 4;
    expect(janmaRasiFromBirth(1988, 9, 2, '06:15')).toBe(rasiIndexForStar(starIdx, pada));
  });
});

describe('computeDailyPalamForAllRasis (all 12 rasis per day)', () => {
  const sunriseJD = julianDayAtSunrise(2026, 1, 19, '06:00');

  test('returns 12 rows whose transits cover 1..12 exactly', () => {
    const rows = computeDailyPalamForAllRasis(sunriseJD, 19);
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.transit)).size).toBe(12);
  });

  test('row i equals computeDailyPalam for janma rasi i', () => {
    const rows = computeDailyPalamForAllRasis(sunriseJD, 19);
    for (let rasi = 0; rasi < 12; rasi++) {
      expect(rows[rasi]).toEqual(computeDailyPalam(sunriseJD, rasi, 19));
    }
  });

  test('exactly one rasi is at Chandrashtama each day (the 8th from the moon)', () => {
    const rows = computeDailyPalamForAllRasis(sunriseJD, 19);
    expect(rows.filter((r) => r.category === 'chandrashtama')).toHaveLength(1);
  });
});

describe('julianDayAtSunrise', () => {
  test('falls back to 06:00 when sunrise unknown', () => {
    expect(julianDayAtSunrise(2026, 1, 19, null)).toBe(julianDayAtSunrise(2026, 1, 19, '06:00'));
  });

  test('UTC conversion: IST 06:00 sunrise → date-fraction shifts day back', () => {
    const jd = julianDayAtSunrise(2026, 1, 19, '06:00');
    const jdNoonNext = julianDayAtSunrise(2026, 1, 19, '18:00');
    expect(jd + 0.5).toBeCloseTo(jdNoonNext, 5); // 06:00 + 12h == 18:00 IST
  });
});
