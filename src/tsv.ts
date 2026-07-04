export interface ResolvedPlace {
  query: string;
  name: string;
  url: string;
}

export type SaveStatus = 'saved' | 'already' | 'failed';

export interface SaveResult {
  url: string;
  query: string;
  status: SaveStatus;
  message?: string;
}

/** Collapse tabs/newlines so a field never breaks the TSV structure. */
function sanitize(field: string): string {
  return field.replace(/[\t\r\n]+/g, ' ').trim();
}

export function serializeResolved(places: ResolvedPlace[]): string {
  return places
    .map((p) => [sanitize(p.query), sanitize(p.name), sanitize(p.url)].join('\t'))
    .join('\n');
}

export function parseResolved(text: string): ResolvedPlace[] {
  const places: ResolvedPlace[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [query, name, url] = line.split('\t');
    if (!query || !name || !url) continue;
    places.push({ query, name, url });
  }
  return places;
}

const SAVE_STATUSES: ReadonlySet<string> = new Set(['saved', 'already', 'failed']);

export function serializeSaveResult(result: SaveResult): string {
  return [
    sanitize(result.url),
    result.status,
    sanitize(result.query),
    sanitize(result.message ?? ''),
  ].join('\t');
}

export function parseSaveResults(text: string): SaveResult[] {
  const results: SaveResult[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [url, status, query, message] = line.split('\t');
    if (!url || !status || !SAVE_STATUSES.has(status)) continue;
    results.push({
      url,
      query: query ?? '',
      status: status as SaveStatus,
      ...(message ? { message } : {}),
    });
  }
  return results;
}

/** URLs that no longer need saving — used to make reruns idempotent. */
export function savedUrls(results: SaveResult[]): Set<string> {
  return new Set(results.filter((r) => r.status !== 'failed').map((r) => r.url));
}
