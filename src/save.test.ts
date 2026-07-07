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

  it('does not match a longer list name that starts with the requested one', () => {
    expect(listNamePattern('東京').test('東京グルメ・非公開・3件')).toBe(false);
  });

  it('matches a label that is exactly the list name', () => {
    expect(listNamePattern('行きたい').test('行きたい')).toBe(true);
  });

  it('matches the English UI separator', () => {
    expect(listNamePattern('Tokyo').test('Tokyo · Private · 3 places')).toBe(true);
    expect(listNamePattern('Tokyo').test('Tokyo Trip · Private · 3 places')).toBe(false);
  });

  // Real 2026 UI: icon glyphs (private-use-area chars) prefix the label and
  // the visibility word follows the name with no separator.
  it('matches the current UI label format (icon glyphs + 非公開 directly after name)', () => {
    expect(listNamePattern('トラベル2026').test('トラベル2026非公開·3 か所')).toBe(
      true,
    );
    expect(listNamePattern('行きたい').test('行きたい非公開·3 か所')).toBe(true);
    expect(listNamePattern('東京').test('東京グルメ非公開·3 か所')).toBe(false);
  });

  it('does not treat the icon prefix as part of another list name', () => {
    expect(listNamePattern('トラベル').test('トラベル2026非公開·3 か所')).toBe(
      false,
    );
  });
});
