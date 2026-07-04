import { describe, expect, it } from 'vitest';
import { parsePlaceList } from './places.js';

describe('parsePlaceList', () => {
  it('splits lines into place queries', () => {
    expect(parsePlaceList('東京タワー\n浅草寺\n')).toEqual(['東京タワー', '浅草寺']);
  });

  it('trims whitespace around each line', () => {
    expect(parsePlaceList('  東京タワー  \n\t浅草寺\n')).toEqual(['東京タワー', '浅草寺']);
  });

  it('skips empty lines and comment lines', () => {
    const input = '# 台湾旅行\n九份\n\n  # メモ\n士林夜市\n';
    expect(parsePlaceList(input)).toEqual(['九份', '士林夜市']);
  });

  it('deduplicates while preserving first occurrence order', () => {
    expect(parsePlaceList('A\nB\nA\nC\nB')).toEqual(['A', 'B', 'C']);
  });

  it('handles CRLF line endings', () => {
    expect(parsePlaceList('A\r\nB\r\n')).toEqual(['A', 'B']);
  });

  it('returns empty array for empty input', () => {
    expect(parsePlaceList('')).toEqual([]);
  });
});
