/**
 * Loose dictionary type — key parity between ta.ts and en.ts is enforced by
 * tests/localization.test.ts (both must have identical key sets).
 */
export type TranslationDict = { [key: string]: string };

export type LanguagePref = 'ta' | 'en';
