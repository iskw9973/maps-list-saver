import type { Page } from 'playwright';

export interface SavedList {
  name: string;
  visibility: string | null;
  count: number | null;
}

// The saved pane renders one "more options" button per list row.
const OPTIONS_BTN =
  'button[aria-label="その他のオプション"], button[aria-label="More options"]';
const SAVED_NAV = /^(保存済み|Saved)$/;

/** List labels are prefixed with icon glyphs from a private-use-area font. */
export function stripIconGlyphs(s: string): string {
  return s.replace(/\p{Co}+/gu, '').trim();
}

/**
 * Parse a list's meta line: "非公開·3 か所", "公開·1,234 か所",
 * "Private · 3 places", or just "非公開" for built-ins without a count.
 */
export function parseListMeta(meta: string): {
  visibility: string | null;
  count: number | null;
} {
  const m = meta.match(/([\d,]+)\s*(?:か所|places?)/);
  return {
    visibility: meta.split(/[·・]/)[0].trim() || null,
    count: m ? parseInt(m[1].replace(/,/g, ''), 10) : null,
  };
}

/** Collapse tabs/newlines so a field never breaks the TSV structure. */
function sanitize(field: string): string {
  return field.replace(/[\t\r\n]+/g, ' ').trim();
}

export function serializeLists(lists: SavedList[]): string {
  return lists
    .map((l) => [sanitize(l.name), sanitize(l.visibility ?? ''), l.count ?? ''].join('\t'))
    .join('\n');
}

/**
 * Open the "Saved" pane from the Maps home page and enumerate every list.
 * Assumes the page is already on https://www.google.com/maps (ensureSignedIn
 * leaves it there).
 */
export async function fetchSavedLists(page: Page): Promise<SavedList[]> {
  await page.getByText(SAVED_NAV).first().click({ timeout: 20000 });
  await page.waitForSelector(OPTIONS_BTN, { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Scroll the pane until the row count stops growing so long collections
  // are fully rendered before we read them.
  let previous = -1;
  for (let i = 0; i < 10; i++) {
    const count = await page.evaluate((sel) => {
      const buttons = document.querySelectorAll(sel);
      buttons[buttons.length - 1]?.scrollIntoView({ block: 'end' });
      return buttons.length;
    }, OPTIONS_BTN);
    if (count === previous) break;
    previous = count;
    await page.waitForTimeout(1200);
  }

  // A row is the nearest ancestor of an options button that also directly
  // contains the open-list button; its leaf text divs hold name and meta
  // (leading leaves may be icon glyphs, so filter for real text).
  const rows = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((btn) => {
      let el = btn.parentElement;
      const openOf = (node: Element) =>
        [...node.children].find((c) => c.tagName === 'BUTTON' && !c.contains(btn));
      while (el && !openOf(el)) el = el.parentElement;
      const open = el ? openOf(el) : null;
      const leaves = open
        ? [...open.querySelectorAll('div')]
            .filter((d) => !d.querySelector('div') && d.textContent?.trim())
            .map((d) => d.textContent?.trim() ?? '')
        : [];
      return {
        name: leaves.find((t) => /[\p{L}\p{N}]/u.test(t)) ?? '',
        // require a digit so a list literally named "Saved places" is not
        // mistaken for its own meta line
        meta:
          leaves.find((t) => /[\d,]+\s*(?:か所|places?)/.test(t)) ??
          leaves.find((t) => /^(非公開|公開|共有|Private|Public|Shared)/.test(t)) ??
          '',
      };
    });
  }, OPTIONS_BTN);

  return rows
    .map((r) => ({ name: stripIconGlyphs(r.name), ...parseListMeta(r.meta) }))
    .filter((r) => r.name);
}
