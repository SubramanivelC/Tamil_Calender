/**
 * Rasi palam (ராசி பலம்) — moon-sign daily forecast, computed entirely
 * offline from the bundled sidereal engine (panchangamAstro).
 *
 * Basis: Tamil astrology's Chandra-gochara — the transiting moon's rasi
 * counted from the user's janma (birth) rasi, 1..12, with the classic
 * goodness categories (1 mixed-good, 3/11 best, 8 = Chandrashtama…).
 * Message wording is locally curated; variety comes from a deterministic
 * day-seed so the same day always yields the same text.
 *
 * Bilingual strings follow the app convention 'தமிழ் / English' so
 * cleanBilingualValue strips per UI language.
 */
import { norm360, sunMoonLongitudesAtJd, toSidereal } from '@/services/panchangamAstro';
import { julianDay } from '@/services/panchangamAstro';

// ---------------------------------------------------------------------------
// Rasi names (index 0..11, sidereal order starting Mesham)
// ---------------------------------------------------------------------------

export const RASI_NAMES: string[] = [
  'மேஷம் / Mesham (Aries)',
  'ரிஷபம் / Rishabam (Taurus)',
  'மிதுனம் / Mithunam (Gemini)',
  'கடகம் / Kadagam (Cancer)',
  'சிம்மம் / Simmam (Leo)',
  'கன்னி / Kanniyam (Virgo)',
  'துளாம் / Thulaam (Libra)',
  'விருச்சிகம் / Vrischikam (Scorpio)',
  'தனுசு / Dhanusu (Sagittarius)',
  'மகரம் / Makaram (Capricorn)',
  'கும்பம் / Kumbam (Aquarius)',
  'மீனம் / Meenam (Pisces)',
];

/**
 * Nakshatra (27, index 0..26) → rasi. Nine stars straddle two rasis and
 * their janma rasi depends on the birth pada (1..4):
 * Krittika, Mrigashira, Punarvasu, Uttara Phalguni, Chitra, Vishakha,
 * Uttarashada, Dhanishta, Purvabhadra. Whole-star defaults use pada 1.
 */
export function rasiIndexForStar(starIndex: number, pada = 1): number {
  const star = ((starIndex % 27) + 27) % 27;
  const p = pada < 1 ? 1 : pada > 4 ? 4 : pada;
  switch (star) {
    case 0: // Ashwini
    case 1: // Bharani
      return 0; // Mesham
    case 2: // Krittika: pada 1 Mesham, 2-4 Rishabam
      return p === 1 ? 0 : 1;
    case 3: // Rohini
      return 1; // Rishabam
    case 4: // Mrigashira: pada 1-2 Rishabam, 3-4 Mithunam
      return p <= 2 ? 1 : 2;
    case 5: // Arudra (Thiruvathirai)
      return 2; // Mithunam
    case 6: // Punarvasu: pada 1-3 Mithunam, 4 Kadagam
      return p <= 3 ? 2 : 3;
    case 7: // Pushya (Poosam)
    case 8: // Ashlesha (Ayilyam)
      return 3; // Kadagam
    case 9: // Magha (Makam)
    case 10: // Purva Phalguni (Pooram)
    case 11: // Uttara Phalguni: pada 1 Simmam, 2-4 Kanniyam
      return star === 11 ? (p === 1 ? 4 : 5) : 4;
    case 12: // Hasta (Hastham)
      return 5; // Kanniyam
    case 13: // Chitra: pada 1-2 Kanniyam, 3-4 Thulaam
      return p <= 2 ? 5 : 6;
    case 14: // Swati (Swathi)
    case 15: // Vishakha: pada 1-3 Thulaam, 4 Vrischikam
      return star === 15 ? (p <= 3 ? 6 : 7) : 6;
    case 16: // Anuradha (Anusham)
    case 17: // Jyeshtha (Kettai)
      return 7; // Vrischikam
    case 18: // Moola (Moolam)
    case 19: // Purvashadha (Pooradam)
    case 20: // Uttarashadha: pada 1 Dhanusu, 2-4 Makaram
      return star === 20 ? (p === 1 ? 8 : 9) : 8;
    case 21: // Shravana (Thiruvonam)
    case 22: // Dhanishta: pada 1-2 Makaram, 3-4 Kumbham
      return star === 22 ? (p <= 2 ? 9 : 10) : 9;
    case 23: // Shatabhisha (Sadayam)
    case 24: // Purvabhadra:pada 1-3 Kumbham, 4 Meenam
      return star === 24 ? (p <= 3 ? 10 : 11) : 10;
    case 25: // Uttarabhadra (Uthirattathi)
    case 26: // Revati (Revathi)
      return 11; // Meenam
    default:
      return 0;
  }
}

/** Stars whose janma rasi needs a pada choice (indices into 27-star list). */
export const PADA_SPLIT_STAR_INDICES = [2, 4, 6, 11, 13, 15, 20, 22, 24];

// ---------------------------------------------------------------------------
// Transit (Chandra gochara) categories and curated daily messages
// ---------------------------------------------------------------------------

export type PalamCategory = 'best' | 'good' | 'mixed-good' | 'moderate' | 'caution' | 'chandrashtama';

const CATEGORY_LABELS: Record<PalamCategory, string> = {
  best: 'மிக நல்ல நாள் / Excellent day',
  good: 'நல்ல நாள் / Good day',
  'mixed-good': 'கலந்த நல்ல நாள் / Generally good day',
  moderate: 'சாதாரண நாள் / Average day',
  caution: 'எச்சரிக்கை தேவை / Needs caution',
  chandrashtama: 'சந்திரஷ்டம நாள் / Chandrashtama',
};

/**
 * Transit position 1..12 from janma rasi → daily palam category.
 * Note the (transit - 1) normalization: case 0 must be transit 1 (moon in
 * the janma rasi itself), transit 8 must be Chandrashtama.
 */
export function palamCategoryForTransit(transit: number): PalamCategory {
  switch (((transit - 1) % 12 + 12) % 12) {
    case 0: // moon in janma rasi (transit 1)
      return 'mixed-good';
    case 1: // 2nd — wealth
    case 2: // 3rd — courage/success
      return 'best';
    case 3: // 4th — anxiety
      return 'moderate';
    case 4: // 5th — education/children
      return 'mixed-good';
    case 5: // 6th — defeating rivals
      return 'good';
    case 6: // 7th — desires
      return 'good';
    case 7: // 8th — Chandrashtama
      return 'chandrashtama';
    case 8: // 9th — minor obstacles
    case 11: // 12th — expenses
      return 'caution';
    case 9: // 10th — work success
      return 'best';
    case 10: // 11th — gains
      return 'best';
    default:
      return 'moderate';
  }
}

/**
 * Curated palam lines per transit 1..12 (index = transit − 1). Each entry
 * offers 2+ variants; the day-seed picks one so days differ but a given
 * date always renders identically (offline-deterministic).
 */
const PALAM_LINES: string[][] = [
  // 1. Moon in janma rasi — fresh start, mild ups/downs
  [
    'சந்திரன் உங்கள் ராசியில் — புதிய முயற்சிகள் சிறக்கும்; உடல்நலத்தைக் கவனியுங்கள் / Moon in your own rasi — new ventures prosper; mind your health.',
    'சந்திரன் உங்கள் ராசியில் — மனம் தெளிவு; முடிவுகள் நிதானமாக / Moon in your own rasi — clear mind; take decisions slowly.',
  ],
  // 2. Wealth/comforts
  [
    'இரண்டாம் ஸ்தானத்தில் சந்திரன் — பொருளாதாரப் பலன், வசதி விருத்தி / 2nd from your rasi — material gain, comforts grow.',
    'இரண்டாம் ஸ்தான சந்திரன் — செல்வத் திருப்தி; குடும்பம் ஒற்றுமை / 2nd transit — financial satisfaction; family harmony.',
  ],
  // 3. Courage, siblings, success
  [
    'மூன்றாம் ஸ்தானத்தில் சந்திரன் — தைரியம் பொருந்தும், வெற்றி கைகூடும் / 3rd from your rasi — courage rises, success follows.',
    'மூன்றாம் ஸ்தான சந்திரன் — கடின உழைப்புக்குப் விரைவு வளையில்லை; முயற்சிகள் சிறக்கும் / 3rd transit — effort pays quickly; enterprise thrives.',
  ],
  // 4. Anxiety/obstacles at home
  [
    'நான்காம் ஸ்தானத்தில் சந்திரன் — மன அழுத்தம் தவிர்க்க; தாய்மை வழிமேடையில் அமைதி / 4th from your rasi — avoid stress; find calm at home.',
    'நான்காம் ஸ்தான சந்திரன் — நிதானம் முக்கியம்; சொத்து/நில விவகாரங்களில் கவனம் / 4th transit — patience matters; care in property matters.',
  ],
  // 5. Education/children/intelligence
  [
    'ஐந்தாம் ஸ்தானத்தில் சந்திரன் — படிப்புக்கு நல்ல நாள்; குழந்தைகள் முன்னேற்றம் / 5th from rasi — good for studies; progress for children.',
    'ஐந்தாம் ஸ்தான சந்திரன் — புதுச்சிந்தனை சிறந்த பலன்; யோக்கியர் கிடைப்பர் / 5th transit — new ideas bear fruit; right mentors appear.',
  ],
  // 6. Overcoming rivals
  [
    'ஆறாம் ஸ்தானத்தில் சந்திரன் — போட்டியாளரை அப்பாற்பட; உடல் உழைப்புசிறக்கும் / 6th from rasi — rivals recede; physical effort wins.',
    'ஆறாம் ஸ்தான சந்திரன் — நோய் துன்பம் குறையும்; சட்ட விவகாரங்களுக்கு சாதகம் / 6th transit — ill effects fade; legal matters favor you.',
  ],
  // 7. Desires fulfiled
  [
    'ஏழாம் ஸ்தானத்தில் சந்திரன் — விருப்பங்கள் நிறைவேறும்; உடன்பிறப்பு தொடர்பு நன்மை / 7th from rasi — desires fulfilled; good contacts shine.',
    'ஏழாம் ஸ்தான சந்திரன் — பேச்சுவழக்கால் பலன்; தரப்பு மாறினாலும் உறுதி / 7th transit — negotiations succeed; stay firm through turnarounds.',
  ],
  // 8. Chandrashtama
  [
    'சந்திரஷ்டமம் — எச்சரிக்கை அவசியம்: புதுமுயற்சி தவிர்க்க, உடல்நலம் பேணுக / Chandrashtama — be careful: avoid new ventures, mind health.',
    'சந்திரஷ்டமம் — கவனம்: விஷய காலதாமதம் தவிர்க்க நிதானம்; நம்பிக்கை கைவிடவேண்டாம் / Chandrashtama — caution: delays possible; keep faith.',
  ],
  // 9. Minor obstacles
  [
    'ஒன்பதாம் ஸ்தானத்தில் சந்திரன் — சிறு தடைகள் இருந்தும் உறுதி வெல்லும் / 9th from rasi — small hurdles, but persistence wins.',
    'ஒன்பதாம் ஸ்தான சந்திரன் — பயணத்தில் கவனம்; முயற்சி விளகு குறையாது / 9th transit — care in travel; effort will not dim.',
  ],
  // 10. Career success
  [
    'பத்தாம் ஸ்தானத்தில் சந்திரன் — பணியில் வெற்றி, முதலீட்டில் வளர்ச்சி / 10th from rasi — career success, growth in ventures.',
    'பத்தாம் ஸ்தான சந்திரன் — உயரும் மதிப்பு; போட்டியில் விளங்கும் / 10th transit — rising esteem; stand out in competition.',
  ],
  // 11. Gains
  [
    'பதினொராம் ஸ்தானத்தில் சந்திரன் — வாங்கியது கைகூடும், லாபம் நல்ல வாய்ப்பு / 11th from rasi — efforts pay, profit prospers.',
    'பதினொராம் ஸ்தான சந்திரன் — பணவரவு நல்ல நாள்; நட்பு வளையல் விரியும் / 11th transit — money flows; friendships widen.',
  ],
  // 12. Expenses
  [
    'பன்னிரண்டாம் ஸ்தானத்தில் சந்திரன் — செலவு அதிகம்; பண பத்திரம் கவனம் / 12th from rasi — spending high; guard your finances.',
    'பன்னிரண்டாம் ஸ்தான சந்திரன் — உறக்கம் தயக்கமின்றி; செலவு திட்டமிடுக / 12th transit — rest well; plan spending.',
  ],
];

/**
 * Deterministic daily palam for one date + janma rasi.
 * Needs the moon's sidereal longitude at that day's sunrise (IST):
 */
export interface DailyPalam {
  /** Chandra gochara position from janma rasi, 1..12. */
  transit: number;
  /** Transiting moon's rasi index 0..11. */
  moonRasiIndex: number;
  category: PalamCategory;
  /** Bilingual headline e.g. 'நல்ல நாள் / Good day'. */
  headline: string;
  /** Curated bilingual palam text. */
  palam: string;
}

/** Moon's sidereal rasi index (0..11) at the given instant (Julian Day). */
export function moonRasiIndexAtJd(jd: number): number {
  const sid = toSidereal(sunMoonLongitudesAtJd(jd), jd);
  const idx = Math.floor(norm360(sid.moonSidereal) / 30);
  return Math.min(Math.max(idx, 0), 11);
}

/**
 * Compute the day's palam. `jdSunrise` = Julian Day at local sunrise
 * (caller converts 'HH:mm' IST sunrise time as in panchamamRepo
 * lunarFieldsAtSunrise). `janmaRasi` 0..11; `dayOfYear` 1..366 perturbs
 * the message pick.
 */
export function computeDailyPalam(jdSunrise: number, janmaRasi: number, dayOfYear: number): DailyPalam {
  const moonRasiIndex = moonRasiIndexAtJd(jdSunrise);
  const transit = (((moonRasiIndex - janmaRasi) % 12) + 12) % 12 + 1;
  const category = palamCategoryForTransit(transit);
  const lines = PALAM_LINES[transit - 1] ?? PALAM_LINES[0] ?? [''];
  const variant = Math.abs(dayOfYear + janmaRasi * 7) % lines.length;
  return {
    transit,
    moonRasiIndex,
    category,
    headline: CATEGORY_LABELS[category],
    palam: lines[variant] ?? '',
  };
}

/**
 * IST 'HH:mm' sunrise on a local date → Julian Day at sunrise
 * (mirrors panchamamRepo lunarFieldsAtSunrise without its DB coupling).
 */
export function julianDayAtSunrise(year: number, month: number, day: number, sunriseHHmm: string | null): number {
  const parts = sunriseHHmm ?? '06:00';
  const [hStr, mStr] = parts.split(':');
  const localMinutes = (Number(hStr) || 0) * 60 + (Number(mStr) || 0);
  const utcMinutes = localMinutes - 330; // IST = UTC +5:30
  return julianDay(year, month, day, utcMinutes / (24 * 60));
}

// ---------------------------------------------------------------------------
// Birth-based janma rasi finder + all-rasis palam
// ---------------------------------------------------------------------------

/**
 * Janma rasi from date of birth + birth time (Tamil Nadu convention:
 * birth time in IST / Hindu calendar time). Sidereal moon sign at the
 * birth instant, computed by the same Meeus-anchored engine as the
 * panchangam (±~7 min residual near a rasi boundary).
 */
export function janmaRasiFromBirth(
  year: number,
  month: number,
  day: number,
  timeHHmm: string
): number {
  const [hStr, mStr] = timeHHmm.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const utcMinutes = h * 60 + m - 330; // IST = UTC +5:30
  const jd = julianDay(year, month, day, utcMinutes / (24 * 60));
  return moonRasiIndexAtJd(jd);
}

/**
 * Today's palam for ALL 12 janma rasis (moon transits each rasi once per
 * month, so today yields exactly one transit 1..12 per rasi). Row i is
 * rasi i's own forecast — identical to computeDailyPalam(rasi=i).
 */
export function computeDailyPalamForAllRasis(jdSunrise: number, dayOfYear: number): DailyPalam[] {
  return RASI_NAMES.map((_, rasi) => computeDailyPalam(jdSunrise, rasi, dayOfYear));
}
