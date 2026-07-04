import { describe, expect, it } from 'vitest';
import { listNamePattern } from './save.js';

describe('listNamePattern', () => {
  it('matches an accessible name that starts with the list name', () => {
    expect(listNamePattern('行きたい').test('行きたい・非公開・3件')).toBe(true);
  });

  it('does not match a different list containing the name as a substring', () => {
    expect(listNamePattern('行きたい').test('また行きたい・非公開・3件')).toBe(false);
  });

  it('escapes regex metacharacters in the list name', () => {
    expect(listNamePattern('A+B (2026)').test('A+B (2026)・公開・12件')).toBe(true);
    expect(listNamePattern('A+B').test('AAB・公開')).toBe(false);
  });
});
