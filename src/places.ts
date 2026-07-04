/**
 * Parse a plain-text place list: one place per line.
 * Blank lines and lines starting with `#` are ignored.
 * Duplicates are removed, keeping first-occurrence order.
 */
export function parsePlaceList(text: string): string[] {
  const seen = new Set<string>();
  const queries: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    queries.push(line);
  }
  return queries;
}
