import { describe, expect, it } from 'vitest';
import { parseListMeta, serializeLists, stripIconGlyphs } from './lists.js';

describe('stripIconGlyphs', () => {
  it('removes private-use-area icon chars and trims', () => {
    expect(stripIconGlyphs('トラベル2026')).toBe('トラベル2026');
  });

  it('keeps regular text untouched', () => {
    expect(stripIconGlyphs('Paris Weekend')).toBe('Paris Weekend');
  });
});

describe('parseListMeta', () => {
  it('parses visibility and count from the Japanese UI', () => {
    expect(parseListMeta('非公開·3 か所')).toEqual({ visibility: '非公開', count: 3 });
    expect(parseListMeta('公開·1,234 か所')).toEqual({ visibility: '公開', count: 1234 });
  });

  it('parses a count-less label (built-in lists like スター付き)', () => {
    expect(parseListMeta('非公開')).toEqual({ visibility: '非公開', count: null });
    expect(parseListMeta('')).toEqual({ visibility: null, count: null });
  });

  it('parses the English UI', () => {
    expect(parseListMeta('Private · 3 places')).toEqual({ visibility: 'Private', count: 3 });
    expect(parseListMeta('Private · 1 place')).toEqual({ visibility: 'Private', count: 1 });
  });
});

describe('serializeLists', () => {
  it('emits one name/visibility/count row per list', () => {
    expect(
      serializeLists([
        { name: 'トラベル2026', visibility: '非公開', count: 25 },
        { name: 'スター付き', visibility: '非公開', count: null },
      ]),
    ).toBe('トラベル2026\t非公開\t25\nスター付き\t非公開\t');
  });

  it('sanitizes tabs and newlines inside names', () => {
    expect(serializeLists([{ name: 'a\tb\nc', visibility: null, count: 0 }])).toBe('a b c\t\t0');
  });
});
