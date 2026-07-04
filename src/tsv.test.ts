import { describe, expect, it } from 'vitest';
import {
  parseResolved,
  parseSaveResults,
  savedUrls,
  serializeResolved,
  serializeSaveResult,
  type ResolvedPlace,
  type SaveResult,
} from './tsv.js';

const place: ResolvedPlace = {
  query: '東京タワー',
  name: '東京タワー',
  url: 'https://www.google.com/maps/place/%E6%9D%B1%E4%BA%AC%E3%82%BF%E3%83%AF%E3%83%BC/@35.6585805,139.7454329,17z',
};

describe('resolved TSV round-trip', () => {
  it('serializes and parses back the same records', () => {
    const text = serializeResolved([place]);
    expect(parseResolved(text)).toEqual([place]);
  });

  it('sanitizes tabs and newlines inside fields', () => {
    const dirty: ResolvedPlace = { ...place, name: '東京\tタワー\n展望台' };
    const parsed = parseResolved(serializeResolved([dirty]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('東京 タワー 展望台');
  });

  it('skips blank lines and malformed rows when parsing', () => {
    const text = serializeResolved([place]) + '\n\nmalformed-row\n';
    expect(parseResolved(text)).toEqual([place]);
  });
});

describe('save results', () => {
  const results: SaveResult[] = [
    { url: 'https://maps.example/a', query: 'A', status: 'saved' },
    { url: 'https://maps.example/b', query: 'B', status: 'already' },
    { url: 'https://maps.example/c', query: 'C', status: 'failed', message: 'timeout' },
  ];

  it('round-trips each result line', () => {
    const text = results.map(serializeSaveResult).join('\n');
    expect(parseSaveResults(text)).toEqual(results);
  });

  it('savedUrls collects only successfully saved urls for idempotent reruns', () => {
    expect(savedUrls(results)).toEqual(new Set(['https://maps.example/a', 'https://maps.example/b']));
  });
});
