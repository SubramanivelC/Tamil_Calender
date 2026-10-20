# Data Sources & Accuracy Policy

This app does **not fabricate calendar data**. Every stored festival and
observance row carries a `source` column, and dates that cannot be verified are
presented as approximate (≈) in the UI rather than as fact.

## Verified anchors (hard requirements)

| Fact | Value | Source |
|---|---|---|
| Puthandu (Tamil New Year) | 14 Apr 2026 (Chithirai 1) | Widely published Tamil panchangams for 2026 |
| Tamil year starting 14 Apr 2026 | **Parabhava** (பராபவ) — cycle index 40 of 60 | Standard 60-year Samvatsara cycle lists |
| Thai 1 (Thai Pongal) | 14 Jan 2026 | Verified via published 2026 panchangams |
| Sunrise panchangam fields (tithi/nakshatra/yoga/karana) at 06:00 IST on 14 Oct, 19 Oct, 8 Nov 2026 | match Drik Panchang Chennai exactly (see tests) | drikpanchang.com day-panchang, Chennai geoname 1264527 |
| Deepavali 2026 (Chennai) | 8 Nov | Drik Panchang Chennai Tamil Deepavali 2026 |
| Deepavali 2027 (Chennai) | 28 Oct | Drik Panchang Chennai Tamil Deepavali 2027 |
| Thaipoosam / Shivarathri / Vinayakar Chaturthi / Karadaiyan Nombu 2026–2027 | 1 Feb 2026, 15 Feb 2026, 14 Mar 2026, 14 Sep 2026; 22 Jan 2027, 6 Mar 2027, 15 Mar 2027, 4 Sep 2027 | Drik Panchang Chennai festival pages |
| Chennai sunrise/sunset approx table | mid-month 2026 values (±7 min within a month) | Alpenglow Chennai 2026 monthly table |
| Vaara Soolam weekday table (Sun West·வெல்லம், Mon East·தயிர், Tue/Wed North·பால், Thu South·எண்ணெய், Fri West·வெல்லம், Sat East·தயிர்) | per-weekday rows | Prokerala shoolam calculator, Tamil Daily Calendar / tamilporutham daily sheets, Oneindia |
| Subha Muhurtham days 2026 (55, with engine-checked paksha labels), 2027 (74, dates only — its paksha column contradicts Drik/engine), 2029 (138, AstroHood சுப/திருமண முகூர்த்தம், no labels); 2028: no published list | transcription + weekday-pinned tests | tamildailycalendar.com tamil_muhurtham_dates.php; astrohood.in/tamil/muhurat/marriage/2029 |
| Tamil Nadu govt holidays 2026 | dates bundled in seed data | Govt TN holiday list 2026 (Gaz. No. G.O.(Ms)No.361 CT [S] [S] 16.10.2025) |

## Engine design: why not Intl?

Node/ICU's `Intl.DateTimeFormat` does not support the `ca=tamil` calendar and
**silently falls back to Gregorian**, which would fabricate Tamil dates with no
error. The conversion engine
(`src/services/tamilCalendarService.ts`) therefore computes month boundaries
**astronomically**: the solar ingress (sankranti) instant at which the
sidereal sun enters each rasi is found with the app's ephemeris
(`panchangamAstro.ts`, truncated Meeus sun + linear Lahiri ayanamsa) and the
ingress is mapped to a calendar day in Chennai time (IST = UTC+5:30) using
the printed-calendar convention: sankranti before 13:00 IST starts the month
that day, at/after 13:00 IST the next day. The 13:00 cutoff is calibrated
against published Thirukanitha calendars (Prokerala/ClickAstro Chennai,
Drik Panchang); both boundary sides are locked by regression tests, together
with the full 2026 month-start set, Puthandu 2024-2026 and Thai 1 2024-2027
anchors (`src/utils/__tests__/tamilCalendarService.test.ts`). Results are
cached per navigated year, so day conversions stay cheap.

**Printed daily-sheet (Vakya tradition) divergence**: Vakya panchangam
sankranti times used by printed daily sheets can differ from true-time
computation by hours (documented by Drik Panchang). In verified cases the
printed month start is pinned by `PRINTED_MONTH_STARTS` overrides in the
engine, transcribed from published calendars: 2024 Masi 1 = Feb 13,
2026 Aavani 1 = Aug 18, 2026 Purattasi 1 = Sep 18 (so Oct 17 2026 =
Purattasi 30, matching printed sheets), 2027 Aavani 1 = Aug 17. All other
published month starts (full 2025 set incl. Aavani Aug 17 / Aippasi Oct 18,
Thai 1 = Jan 14) are already reproduced by the computed rule and locked by
the regression tests.

Verified published anchors reproduced by the engine (Chennai):

| Anchor | Verified value |
|---|---|
| Puthandu / Chithirai 1 | Apr 14 2024, 2025, 2026 |
| Thai Pongal / Thai 1 | Jan 14 2025, Jan 15 2026, Jan 15 2027 |
| Aippasi 1 | Oct 17 2024 (rule-computed, not printed-verified), Oct 18 2025, Oct 18 2026 |
| Aani 1 | Jun 15 2026 (Mithuna sankranti 12:49 IST same day) |
| Aadi 1 | Jul 17 2026 (Kataka sankranti 23:27 IST → next day) |

The 1900–2100 runtime range is covered by the ephemeris itself; outside the
printed-verified set the engine follows the Drik Thiru Ganita convention
exactly. Sankrantis landing within minutes of the 13:00 cutoff are the
engine's residual risk window — the published boundary cases bracket it, and
the printed-sheet override layer covers the verified Vakya divergences.

## Paksha, Amavasai, Pournami

- Paksha (Shukla/Krishna) is a structural approximation (day 1–15 vs 16–30) and
  is labelled as computed.
- **Amavasai and Pournami dates**: the printed Tamil calendars follow the
  classical panchangam day-naming rule — a phase belongs to the
  **first Chennai sunrise falling inside its phase tithi** (the amavasai
  tithi spans elongation [348°,360°), the pournami tithi [168°,180°));
  when no sunrise falls inside the tithi (it sits wholly between two sunrises),
  the sunrise-day containing the conjunction/phase end. Concretely: night
  conjunctions label the dawn day, morning-after-dawn conjunctions label
  the same day, and conjunctions between one dawn and the next label the
  conjunction's sunrise-day. This is exactly how Drik Panchang's Chennai
  monthly panchangam and Prokerala's Chennai Tamil calendar mark the days
  (verified per-date for Mar/Jun/Sep/Nov 2026 amavasai and
  Apr/Aug/Oct/Dec 2026 pournami, May 2026, Feb 2027 pournami,
  Jul 2027 amavasai, Oct 2028), and how the TamilDailyCalendar 2027 list
  prints all 25 rows of that year.
  NOTE: the TDC 2026 *list page* is internally inconsistent with TDC's own
  2027 list (8 of 25 rows match the old tithi-start junction rule); the
  multiple-publisher evidence above outweighs it.
- Phase instants come from the full Meeus ch.47 series (`lunarEphemeris.ts`,
  ±0.01° ⇒ ±~2 min) with ΔT (Espenak–Meeus) and Chennai sunrise root-solves;
  they regress against timeanddate's new/full-moon table for 2026 to ±3 min
  and Drik Chennai's published tithi intervals 2028–2029 to ±5 min
  (`src/data/__tests__/lunarPhases.test.ts`).
- The engine is timezone-independent by construction (no `Date`/clock use);
  displayed dates are assigned in IST via pure Julian-day arithmetic.
  A printed phase spans two calendar days in some publisher lists —
  the app marks exactly ONE day (the printed sunrise-day convention).
  Pradosham (trayodashi)
  and Ekadasi (tithi 11) use tithi-band rules (see below). The Meeus anchors
  live in `src/services/__tests__/panchangamAstro.test.ts`.
- The same generators live in `src/data/lunarPhases.ts` (range-parameterized);
  the observance repositories run them **at runtime for every navigable year
  (1900–2100)**, so the dates do not stop at the bundled dataset window
  (2026–2029). The runtime output is regression-tested to equal the bundled
  seed rows for 2026–2029 (`src/data/__tests__/lunarPhases.test.ts`).

## Row verification flags

- `festival_occurrences.verified = 1` for rows with a public source (govt
  holiday list, published panchangams).
- `panchangam_records.verified = 0` for computed rows (Rahu Kalam etc. from
  classical weekday mapping; sunrise/sunset approximated by month).
- Absence of data is surfaced as *no data*, never as a fabricated placeholder:
  far-past/future dates outside the dataset return `null` Tamil day, and
  repository helpers return empty arrays rather than inventing rows.

## Restoring / updating the dataset

The bundled dataset is versioned via `DATASET_VERSION` in seedData. Bump it and
the next app start re-imports festivals/observances inside one transaction
(`dataset_meta.version` gate). To validate a data change:

```bash
npm test            # includes dataset-integrity tests: sources present,
                    # amavasai/pournami/pradosham/ekadasi counts > threshold,
                    # search-index populated from festivals
```

Dataset-integrity expectations live in `src/database/__tests__/migrate.test.ts`.
