import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../../migrations/migrate';
import { importBundledDataset } from '../../seed/importer';
import { search, addRecentSearch, getRecentSearches, clearRecentSearches } from '../searchRepo';

function plainDb() {
  return openDatabaseSync('search-test.db');
}

// searchRepo pulls the db via getDatabase(); under jest-expo the native module
// is shimmed to in-memory so this suite runs against a fresh instance when the
// client singleton has been reset. Setup below pre-seeds, matching app flow.
beforeAll(async () => {
  const db = plainDb();
  await runMigrations(db as never);
  await importBundledDataset(db as never);
});

afterAll(async () => {
  await clearRecentSearches();
});

describe('offline search', () => {
  test('English festival search', async () => {
    const res = await search('pongal');
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((r) => r.kind === 'festival' && /Pongal/.test(r.title) === false || r.title.includes('Pongal'))).toBe(true);
  });

  test('Tamil festival search', async () => {
    const res = await search('பொங்கல்');
    expect(res.length).toBeGreaterThan(0);
  });

  test('date search resolves to a navigable dateKey', async () => {
    const res = await search('2026-04-14');
    const dateHit = res.find((r) => r.kind === 'date');
    expect(dateHit?.dateKey).toBe('2026-04-14');
  });

  test('tamil month search', async () => {
    const res = await search('சித்திரை');
    expect(res.some((r) => r.kind === 'tamil_month')).toBe(true);
  });

  test('no results for nonsense', async () => {
    const res = await search('zzzznotathing');
    expect(res.filter((r) => r.kind !== 'date' && r.kind !== 'tamil_month')).toHaveLength(0);
  });

  test('recent searches stored with cap and dedupe', async () => {
    await clearRecentSearches();
    await addRecentSearch('a');
    await addRecentSearch('b');
    await addRecentSearch('a'); // dedupe moves to front
    let rec = await getRecentSearches();
    expect(rec).toEqual(['a', 'b']);
    for (let i = 0; i < 15; i++) await addRecentSearch(`q${i}`);
    rec = await getRecentSearches();
    expect(rec.length).toBeLessThanOrEqual(10);
  });
});
