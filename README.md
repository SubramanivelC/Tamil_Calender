# Tamil Calendar — தமிழ் நாட்காட்டி

A premium, fully offline Tamil calendar app for Android and iOS, built with
React Native (Expo), Expo Router, and expo-sqlite. Design system: warm ivory
backgrounds, maroon accents, restrained gold details.

## Features

- **Home** — today's Tamil/Gregorian dual date, month calendar grid with festival
  markers, panchangam summary (Rahu Kalam, Yamagandam, Kuligai, Nalla Neram),
  upcoming festivals, quick actions.
- **Calendar** — monthly view with swipe navigation, compact/detailed toggle,
  tap-to-open day details; annual view with previous/current/future-year
  navigation and jump-to-today.
- **Festivals** — full-year verified festival list with holiday flags, sources
  and search.
- **Search** — offline indexed search over festivals, observances, notes, Tamil
  months and date keys (e.g. `14/04/2026` works).
- **Settings** — Tamil/English UI, Tamil or Arabic numerals, light/dark/system
  theme, font scale (accessibility), first day of week, notification preferences.
- **Day details** — panchangam timings, observances, festivals, notes and
  date bookmarks.
- **Local reminders** — one-shot and yearly festival reminders via
  expo-notifications; duplicate-scheduling proof via stable ids; persisted in
  SQLite.
- Fully offline: all calendar data is bundled and imported into SQLite on first
  launch. No network permission required.

## Getting started

Prerequisites: Node.js ≥ 20.19 (tested on 24), npm ≥ 10, JDK 17, Android Studio
(optional for builds), Xcode + CocoaPods (iOS, macOS only).

```bash
npm install
npx expo start          # run in Expo Go or a dev build
```

Useful scripts:

```bash
npm run typecheck       # tsc --noEmit
npm test                # jest (88 tests, 14 suites)
npm run lint            # eslint
```

## Building a test APK on your phone

```bash
npx expo prebuild --platform android   # once, generates android/
cd android
gradlew.bat assembleDebug
# APK at android\app\build\outputs\apk\debug\app-debug.apk
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Note: the app uses native modules (expo-sqlite, expo-notifications,
reanimated) and does **not** run in Expo Go beyond the JS dev bundle for those
modules being mocked/unavailable — use a development or debug build on device.

### Release builds

- **Android (AAB for Play):** `cd android && gradlew.bat bundleRelease` after
  signing config, or use EAS:

  ```bash
  npm i -g eas-cli
  eas login
  eas build -p android --profile production
  ```

- **iOS / TestFlight:** requires macOS + Xcode:

  ```bash
  cd ios && pod install && cd ..
  # open ios/TamilCalendar.xcworkspace, or:
  eas build -p ios --profile production
  ```

  Then upload with Transporter or `eas submit`.

## Architecture

```
app/                    Expo Router screens (tabs: home, calendar, festivals,
                        search, settings) + day-details & year-picker modals
src/
  components/           ThemedText, calendar grid (flat, memoized cells)
  database/
    client.ts           expo-sqlite connection + init (migrate → seed)
    migrations/migrate  versioned schema migrations (app_meta.schema_version)
    repositories/       userData (bookmarks/notes/reminders), festivals,
                        observances, panchangam, search — all parameterized
                        queries over indexed date keys
    seed/importer       one-time bundled dataset import (transaction)
  services/             tamilCalendarService (Tamil date engine),
                        panchangamService (Rahu/Yama/Kuligai/Nalla Neram),
                        notificationService, appInit
  store/                zustand stores (settings, reminders)
  data/                 seedData (verified festivals/observances), mappings
                        (months, weekdays, 60-year cycle, tithis)
  localization/         ta + en dictionaries, identical key sets
  theme/                design tokens (colors, typography, spacing)
  utils/                date helpers (UTC-safe), numerals
```

Data layer notes:

- SQLite with journal_mode WAL, foreign keys ON.
- `dataset_meta.version` marks the bundled dataset; importer skips when current
  (single-source enable of future data updates via a versioned re-import).
- All queries use bound parameters and are keyed on `date_key` indexes.

## Testing & validation

`npm test` covers: Tamil date conversion (verified anchors below), leap years,
month/year navigation, Dec↔Jan boundaries, migrations & idempotency, dataset
integrity (sources present, no fabricated rows), offline search, repositories,
reminder scheduling (incl. no fabricated past firings), localization key-parity,
theming, and accessibility (font scale).

## Calendar data accuracy

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for sources and the verified vs
approximate boundary policy. Highlights:

- **Puthandu** (Tamil New Year) = 14 Apr 2026, starting **Parabhava** (பராபவ)
  year (verified; cycle index 40 of the standard 60-year cycle).
- **Thai Pongal** = 14 Jan 2026 (Thai 1) — verified.
- Govt of Tamil Nadu 2026 holiday list dates are imported with their source
  string (`verified = 1`); Amavasai/Pournami/Pradosham/Ekadasi dates are
  imported from the verified dataset with sources.
- Panchangam Rahu/Yama/Kuligai segments are computed by classical weekday
  mapping and flagged `approximate` near solar-ingress boundaries; the UI renders
  unverified values with an ≈ marker rather than implying certified precision.
- The Intl-based `tamil` calendar is NOT used: Node/ICU lacks support for it and
  silently falls back to Gregorian, which would fabricate data. The engine uses
  documented month-window anchors instead.
