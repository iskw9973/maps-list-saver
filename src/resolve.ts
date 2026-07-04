import type { Page } from 'playwright';
import type { ResolvedPlace } from './tsv.js';

const PLACE_URL = /\/maps\/place\//;

/**
 * Turn a free-text query into a canonical Google Maps place URL by driving
 * the Maps search UI. Returns null when nothing matched.
 *
 * A unique hit redirects straight to /maps/place/...; otherwise we take the
 * first entry of the results feed.
 */
export async function resolvePlace(page: Page, query: string): Promise<ResolvedPlace | null> {
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });

  if (!(await waitForPlaceUrl(page, 8000))) {
    const firstHit = page.locator('a[href*="/maps/place/"]').first();
    try {
      await firstHit.click({ timeout: 8000 });
    } catch {
      return null;
    }
    if (!(await waitForPlaceUrl(page, 8000))) return null;
  }

  const heading = await page
    .locator('h1')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  return { query, name: heading?.trim() || query, url: page.url() };
}

async function waitForPlaceUrl(page: Page, timeout: number): Promise<boolean> {
  try {
    await page.waitForURL(PLACE_URL, { timeout });
    return true;
  } catch {
    return false;
  }
}
