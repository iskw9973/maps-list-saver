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

export async function launchContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext(profileDir(), {
    channel: process.env.MAPS_LIST_SAVER_CHANNEL ?? 'chrome',
    headless: false,
    viewport: null,
  });
}

/** Random pause between actions so the pace stays human-like. */
export function humanDelay(minMs = 2000, maxMs = 5000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
