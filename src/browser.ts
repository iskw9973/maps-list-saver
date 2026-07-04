import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext } from 'playwright';

/**
 * Persistent Chrome profile so the user logs in to Google once by hand.
 * Credentials are never seen or stored by this tool.
 */
export function profileDir(): string {
  return (
    process.env.MAPS_LIST_SAVER_PROFILE ?? path.join(os.homedir(), '.maps-list-saver', 'profile')
  );
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
export async function loginWithPlainChrome(startUrl: string): Promise<void> {
  await fs.mkdir(profileDir(), { recursive: true });
  const child = spawn(
    chromePath(),
    [`--user-data-dir=${profileDir()}`, '--no-first-run', '--no-default-browser-check', startUrl],
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

export async function launchContext(headless = false): Promise<BrowserContext> {
  return chromium.launchPersistentContext(profileDir(), launchOptions(headless));
}

/** Random pause between actions so the pace stays human-like. */
export function humanDelay(minMs = 2000, maxMs = 5000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
