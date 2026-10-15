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
(`src/services/tamilCalendarService.ts`) therefore uses documented,
table-driven month windows anchored on the verified facts above:

| Tamil month | 1 falls ~on | Tamil month | 1 falls ~on |
|---|---|---|---|
| Chithirai | 14 Apr | Aippasi | 17 Oct |
| Vaikasi | 15 May | Karthigai | 16 Nov |
| Aani | 15 Jun | Margazhi | 16 Dec |
| Aadi | 16 Jul | Thai | 14 Jan |
| Aavani | 17 Aug | Masi | 13 Feb |
| Purattasi | 17 Sep | Panguni | 15 Mar |

Because the real solar calendar drifts ±1 day around Sankranti each year,
**day-level results at month boundaries are marked `approximate: true`** and the
UI renders them with an ≈ prefix. Month-level and New-Year/Pongal anchors are
exact.

## Paksha, Amavasai, Pournami

- Paksha (Shukla/Krishna) is a structural approximation (day 1–15 vs 16–30) and
  is labelled as computed.
- **Amavasai and Pournami dates**: the printed Tamil calendars label the day
  on which the phase tithi BEGINS (amavasai tithi spans elongation
  [348°,360°), pournami tithi spans [168°,180°)) — not the conjunction
  instant's day. Within the dataset window, the 2026 rows are
  **transcription-verified from the published lists**
  (tamildailycalendar.com amavasai/pournami 2026, corroborated by Drik
  Panchang Chennai) and are the truth anchor (`data/__tests__/lunarPhases.test.ts`);
  2027–2029 and all other navigable years are engine-derived
  (`src/data/lunarPhases.ts` tithi-start junction rule), with an occasional
  ±1-day possibility on junction instants within the truncated series'
  hour-scale precision. A phase spans two calendar days in printing sources —
  the app always marks exactly ONE day (the printed convention), never two.
  So are the Pradosham (trayodashi)
  and Ekadasi (tithi 11) lists. The Meeus example anchors these computations
  in `src/services/__tests__/panchangamAstro.test.ts`.
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
