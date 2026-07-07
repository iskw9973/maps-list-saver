import type { Page } from 'playwright';

export interface SaveOutcome {
  status: 'saved' | 'already';
  /** Accessible label of the list entry that was actually clicked. */
  list?: string;
}

// Google Maps action buttons carry data-value in the UI language.
const SAVE_BTN = 'button[data-value="保存"], button[data-value="Save"]';
const SAVED_BTN = 'button[data-value="保存済み"], button[data-value="Saved"]';
const MENU_ITEM = '[role="menuitemradio"], [role="menuitem"]';
const NEW_LIST = /新しいリスト|New list/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Menu entries carry extra text around the list name. Observed formats:
 * "行きたい・非公開・3件", "Tokyo · Private · 3 places", and the current UI's
 * "トラベル2026非公開·3 か所" where icon glyphs (private-use-area chars)
 * prefix the label and the visibility word follows the name with no
 * separator. Require the exact name — leading icons/whitespace allowed,
 * then the end, a separator, or a visibility word. A bare prefix match
 * would save into "東京グルメ" when "東京" was requested; a miss here
 * silently creates a duplicate list instead.
 */
export function listNamePattern(listName: string): RegExp {
  return new RegExp(
    `^[\\s\\p{Co}]*${escapeRegExp(listName)}` +
      `(?:$|\\s*[・·]|\\s*(?:非公開|公開|共有|Private|Public|Shared))`,
    'u',
  );
}

/**
 * Open a place page and save it into the given list, creating the list on
 * the fly via the "New list" menu entry when it does not exist yet.
 *
 * Returns 'already' when the place is saved in some list already — v1 does
 * not verify which list; rerun after removing it manually if that matters.
 */
export async function savePlace(page: Page, url: string, listName: string): Promise<SaveOutcome> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`${SAVE_BTN}, ${SAVED_BTN}`, { timeout: 20000 });

  if (await page.locator(SAVED_BTN).count()) return { status: 'already' };

  await page.locator(SAVE_BTN).first().click();
  await page.waitForSelector(MENU_ITEM, { timeout: 10000 });

  const namePattern = listNamePattern(listName);
  const item = page
    .getByRole('menuitemradio', { name: namePattern })
    .or(page.getByRole('menuitem', { name: namePattern }));
  let list = listName;
  // Custom lists render after the default entries, so a count() taken as soon
  // as the menu opens misses them and creates a duplicate list every run.
  // Give the entry a grace period; the timeout is only paid when the list
  // genuinely does not exist yet (i.e. once per new list).
  const exists = await item
    .first()
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  if (exists) {
    list = (await item.first().textContent())?.trim() || listName;
    await item.first().click();
  } else {
    await createListAndSave(page, listName);
  }

  // Confirm the save actually landed: the button flips to "Saved". A fixed
  // sleep here used to report 'saved' even when the request never made it.
  await page.waitForSelector(SAVED_BTN, { timeout: 15000 });
  return { status: 'saved', list };
}

async function createListAndSave(page: Page, listName: string): Promise<void> {
  const newList = page
    .getByRole('menuitemradio', { name: NEW_LIST })
    .or(page.getByRole('menuitem', { name: NEW_LIST }))
    .or(page.getByRole('button', { name: NEW_LIST }));
  await newList.first().click({ timeout: 10000 });

  const nameInput = page.getByRole('textbox').first();
  await nameInput.fill(listName, { timeout: 10000 });
  await page
    .getByRole('button', { name: /^(作成|Create)$/ })
    .first()
    .click({ timeout: 10000 });
}
