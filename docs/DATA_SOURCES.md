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
- **Amavasai and Pournami come exclusively from the verified dataset**
  (`src/data/seedData.ts` → AM_POURNA_RECORDS), never computed. The same rule
  applies to Pradosham and Ekadasi lists.

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
