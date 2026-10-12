/**
 * Global Jest setup (plain JS).
 *
 * In-memory mocks for native modules that have no runtime under Node:
 * AsyncStorage, expo-sqlite (see jest.fakeDb.js for the SQL engine),
 * expo-notifications, and navigation primitives.
 */
jest.setTimeout(15000);

/* ------------------------------ AsyncStorage ------------------------------ */
jest.mock('@react-native-async-storage/async-storage', function () {
  var store = {};
  var api = {
    getItem: jest.fn(async function (key) { return store[key] != null ? store[key] : null; }),
    setItem: jest.fn(async function (key, value) { store[key] = value; }),
    removeItem: jest.fn(async function (key) { delete store[key]; }),
    multiRemove: jest.fn(async function (keys) { keys.forEach(function (k) { delete store[k]; }); }),
    clear: jest.fn(async function () { store = {}; }),
    getAllKeys: jest.fn(async function () { return Object.keys(store); }),
  };
  return Object.assign({ __esModule: true, default: api }, api);
});

/* ------------------------------ expo-sqlite ------------------------------- */
/*
 * Minimal statement-aware SQL emulation covering the exact statements the
 * app's schema/migrations/repositories issue. Lets importer + repository
 * logic run end-to-end in tests without a native runtime.
 *
 * The engine lives in jest.fakeDb.js (plain CommonJS) and is the single
 * source of truth — do NOT duplicate it here.
 */
jest.mock('expo-sqlite', function () {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  var FakeDb = require('./jest.fakeDb');
  var dbs0 = new Map();
  return {
    openDatabaseSync: jest.fn(function (name) {
      if (!dbs0.has(name)) dbs0.set(name, new FakeDb());
      return dbs0.get(name);
    }),
    openDatabaseAsync: jest.fn(async function (name) {
      if (!dbs0.has(name)) dbs0.set(name, new FakeDb());
      return dbs0.get(name);
    }),
    SQLiteProvider: function () { return null; },
    useSQLiteContext: function () { return null; },
  };
});

/* --------------------------- expo-notifications --------------------------- */
jest.mock('expo-notifications', function () {
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(function () { return Promise.resolve(); }),
    getPermissionsAsync: jest.fn(function () { return Promise.resolve({ granted: true, canAskAgain: true }); }),
    requestPermissionsAsync: jest.fn(function () { return Promise.resolve({ granted: true }); }),
    scheduleNotificationAsync: jest.fn(function (req) { return Promise.resolve((req && req.identifier) || 'notif-1'); }),
    cancelScheduledNotificationAsync: jest.fn(function () { return Promise.resolve(); }),
    getAllScheduledNotificationsAsync: jest.fn(function () { return Promise.resolve([]); }),
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar', DAILY: 'daily' },
    AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  };
});

/* ------------------------------ other modules ----------------------------- */
jest.mock('expo-splash-screen', function () {
  return {
    preventAutoHideAsync: jest.fn(function () { return Promise.resolve(); }),
    hideAsync: jest.fn(function () { return Promise.resolve(); }),
  };
});

jest.mock('expo-haptics', function () {
  return { selectionAsync: jest.fn(), impactAsync: jest.fn() };
});

jest.mock('react-native-reanimated', function () {
  return require('react-native-reanimated/mock');
});

jest.mock('expo-router', function () {
  var Screen = function () { return null; };
  var Stack = function (props) { return props.children; };
  Stack.Screen = Screen;
  var Tabs = function (props) { return props.children; };
  Tabs.Screen = Screen;
  return {
    useRouter: function () { return { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() }; },
    useLocalSearchParams: function () { return {}; },
    Stack: Stack,
    Tabs: Tabs,
  };
});
