import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';

/**
 * Persistent Chrome profile so the user logs in to Google once by hand.
 * Credentials are never seen or stored by this tool. Precedence:
 * --profile flag > MAPS_LIST_SAVER_PROFILE > default.
 */
export function profileDir(override?: string): string {
  return (
    override ??
    process.env.MAPS_LIST_SAVER_PROFILE ??
    path.join(os.homedir(), '.maps-list-saver', 'profile')
  );
}

/** Delete a profile directory. Returns its path, or null if it did not exist. */
export async function removeProfile(profile?: string): Promise<string | null> {
  const dir = profileDir(profile);
  const exists = await fs.access(dir).then(
    () => true,
    () => false,
  );
  if (!exists) return null;
  await fs.rm(dir, { recursive: true });
  return dir;
}

function chromePath(): string {
  return (
    process.env.MAPS_LIST_SAVER_CHROME ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  );
}

/**
 * Launch plain Chrome (no automation flags) on the tool's profile so the user
 * can sign in to Google by hand. Google rejects sign-in attempts from
 * automation-flagged browsers ("This browser or app may not be secure"), so
 * login must happen outside Playwright; the session persists in the profile
 * and automated runs reuse it. Resolves when the user quits Chrome.
 */
export async function loginWithPlainChrome(startUrl: string, profile?: string): Promise<void> {
  const dir = profileDir(profile);
  await fs.mkdir(dir, { recursive: true });
  const child = spawn(
    chromePath(),
    [`--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', startUrl],
    { stdio: 'ignore' },
  );
  await new Promise<void>((done, fail) => {
    child.on('error', fail);
    child.on('exit', () => done());
  });
}

export function launchOptions(headless: boolean) {
  return {
    channel: process.env.MAPS_LIST_SAVER_CHANNEL ?? 'chrome',
    headless,
    // Headless has no real window; Maps needs a desktop-width layout for its
    // selectors, so a fixed viewport replaces the headed viewport: null.
    viewport: headless ? { width: 1440, height: 900 } : null,
    // On macOS Chrome encrypts cookies with a Keychain-derived key. Playwright
    // defaults to --use-mock-keychain, which cannot decrypt cookies written by
    // the plain-Chrome login session — Google then treats us as signed out.
    ignoreDefaultArgs: ['--use-mock-keychain'],
  };
}

export async function launchContext(
  options: { headless?: boolean; profile?: string } = {},
): Promise<BrowserContext> {
  return chromium.launchPersistentContext(
    profileDir(options.profile),
    launchOptions(options.headless ?? false),
  );
}

/**
 * Fail fast when the Google session is gone — otherwise every save burns a
 * 20 s selector timeout before failing. Only an affirmatively visible sign-in
 * link aborts the run; if neither header link is found (selector rot) we
 * proceed as before. Both hrefs are UI-language independent.
 */
export async function ensureSignedIn(page: Page): Promise<void> {
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  const signIn = page.locator('a[href*="ServiceLogin"]');
  const account = page.locator('a[href*="SignOutOptions"]');
  await signIn
    .or(account)
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
  if (await signIn.first().isVisible().catch(() => false)) {
    throw new Error('Google session is signed out — run `maps-list-saver login` first.');
  }
}

/** Random pause between actions so the pace stays human-like. */
export function humanDelay(minMs = 2000, maxMs = 5000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
