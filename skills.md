# Skills used to build this app (Tamil calendar)

A map of every engineering and domain skill exercised while building the app,
with the concrete places each was applied. Read together with `README.md`,
`docs/DATA_SOURCES.md` (provenance) and `prompts.md` (follow-up backlog).

## 1. Domain skills — Tamil panchangam & calendars

### Sidereal astronomy / ephemeris computation
- Truncated Meeus lunar + solar series for moon/sun tropical longitudes and
  Julian-day conversion → `src/services/panchangamAstro.ts` (Meeus-example
  anchored, see its test suite).
- Tropical → sidereal (Lahiri ayanamsa) conversion for rasi/nakshatra math.
- Tithi (12° elongation bands), karana half-tithis, yoga/nakshatra
  classification, paksha (Shukla/Krishna) flip at 180°.
- Sunrise-time ephemeris sampling (06:00 IST convention + per-day DB rows
  with approximate fallbacks marked "≈").

### Moon-phase & observance rules (printed-calendar conventions)
- Amavasai/pournami junction-day rule: the calendar day containing the
  elongation 0°/180° crossing, "before 18:00 IST owns the day" convention →
  `src/data/lunarPhases.ts`, seeded via `src/database/seed/importer.ts`.
- Tithi-band observances: Ekadasi (tithi 11) and Pradosham (trayodashi)
  local-minimum band rule with one day per fortnight guarantee.
- Chandandra-gochara (moon transit) palam categories: janma rasi ±
  good/best/moderate/caution/Chandrashtama classification →
  `src/data/rasiPalam.ts`.
- Tamil solar calendar: Chithirai-1 anchoring, 60-year cycle anchor, Tamil
  month spans across Gregorian months, Tamil date numbers per month grid.
- Birth-nakshatra → janma-rasi mapping incl. the 9 pada-split stars →

  `rasiIndexForStar`; birth date+time janma rasi via the same ephemeris.

### Data provenance & verification discipline
- Bundled "verified vs derived vs unavailable" dataset policy: nothing
  copy-typed where computation is deterministic; published lists (Govt TN
  holidays, Drik Panchang, TamilDailyCalendar, AstroHood subha muhurtham)
  transcribed with source + cross-check tests → `src/data/seedData.ts`,
  `src/data/__tests__/seedData.test.ts`, `docs/DATA_SOURCES.md`.
- Physical anchor tests (e.g., Jan 19 2026 amavasai ⇒ moon = sun rasi
  Makaram) that bind engine outputs to real-world dates.

## 2. Engineering skills — React Native / Expo app

### App architecture
- Expo (SDK 57) + React Native + expo-router with typed routes and tab
  layout (Home, Calendar, My Rasi, Festivals, Search, Settings).
- Feature folders (`src/features/*`) driving screens via hooks
  (`useHomeData`, `useMonthDecorations`, `useMonthDetails`, `useRasiPalam`,
  `useDayDetails`) — logic separated from JSX.

### Offline-first data
- expo-sqlite with versioned migrations + single-transaction seed import and
  `dataset_meta.version` gate → `src/database/migrations/migrate.ts`,
  `src/database/seed/importer.ts`.
- Repository layer (`festivalRepo`, `panchangamRepo`, `eventsRepo`,
  `userDataRepo`, `searchRepo`) with SQL LIKE range queries and
  verified/unverified fallback rows.
- Search index generation over festivals, Tamil months and notes; fake-DB
  jest harness (`jest.fakeDb.js`) letting repo tests run without a device.
- Runtime engine-derived overlays (arbitrary-year amavasai/pournami/
  pradosham/ekadasi via per-year cached generation + DB-authoritative
  merge/dedupe) — pattern in `src/database/repositories/festivalRepo.ts`.
- **Query-scope discipline for overlays**: a computed year-wide overlay must
  be filter-reduced to each caller's scope (date/month/year) — the exact-date
  query initially leaked every observance of the year into single-day lists
  (Home/day-details bug) and is now guarded by regression tests asserting
  `date_key === request`, empty results on quiet dates, and ≤2 rows/day.

### State, theming & i18n
- Zustand persisted settings (theme, language, numerals, rasi palam,
  notification prefs) with derivation logic (e.g., `setBirthStar` deriving
  janma rasi) → `src/store/settingsStore.ts`.
- Dual-theme design tokens + font scaling → `src/theme/*`.
- **Theme default policy**: the store defaults to light (white) rather than
  following the OS (`settingsStore.themeMode: 'light'`); System/Dark remain
  explicit user choices in Settings — with the test fixture deliberately not
  pre-setting the key so the default itself is what's asserted.
- Bilingual Tamil/English strings and bilingual value cleaner
  (`அ / B` format) → `src/localization/*`, `src/utils/bilingual.ts`.

### Platform capabilities
- expo-notifications: channel setup, permission flow, idempotent
  cancel-then-schedule daily palam notification with stable identifier and
  startup re-application (`appInit.ts`) → `src/services/notificationService.ts`.
- User events: exact + yearly-repeating reminders with scheduled
  notifications (`src/services/*`, `add-event` screen).
- Native date/time pickers (`@react-native-community/datetimepicker`) with
  platform-specific presentation (Android dialog vs iOS Modal sheet), min/max
  birth bounds, tokenizer-free picker-only input — My Rasi screen.
- Deep-link/tab navigation patterns: Home prompt card and "More details"
  row both route to `/(tabs)/my-rasi`; month-detail rows route to
  `/day-details?date=...`.

### UI craft
- Fully offline calendar grid with per-cell decorations (Tamil day numbers,
  amavasai ●, pournami ○, festival dot, subha-muhurtham marker, event dots),
  monthly + annual views, month details list, legend rows.
- **Month-at-a-glance composition** (`src/features/calendar/useMonthDetails.ts`
  + `MonthDetails.tsx`): one parallel fetch grouping observances/festivals/
  events into labeled sections; empty groups suppressed before rendering;
  focus-triggered refetch via a signal prop for post-add-event freshness.
- **Day-details top navigation**: prev/next day controls fixed above the
  scroll content with the current Gregorian date centered, so orientation
  survives any scroll depth; labeled Tamil-date and English(Gregorian)-date
  rows in the hero; Paksha lives in the Panchangam card as the last row.
- Accessible pressables (roles, labels) and minimum touch targets across
  components (`minTouchTarget`).

### Testing & delivery hygiene
- Jest suites per layer: pure-math engines, seed data correctness,
  repositories over fake DB, stores, localization parity, date utilities —
  currently 20 suites / 228 tests, all green.
- **Bugs become guards**: every user-reported defect (year-overlay leak,
  duplicated localization key, JSX duplication from partial replacements)
  turns into a regression test or compiler-clean verification instead of a
  workaround; the exact-date leak test is the canonical example.
- Explicit exit-code check discipline (`tsc --noEmit` + full jest) after
  every substantive change; fix the cause, never weaken assertions.
- In-repo docs (`README.md`, `docs/DATA_SOURCES.md`) updated whenever data
  provenance or behavior contracts change.
