import { afterEach, describe, expect, it } from 'vitest';
import { launchOptions } from './browser.js';

describe('launchOptions', () => {
  afterEach(() => {
    delete process.env.MAPS_LIST_SAVER_CHANNEL;
  });

  it('defaults to a headed browser with the real window size', () => {
    const options = launchOptions(false);
    expect(options.headless).toBe(false);
    expect(options.viewport).toBeNull();
  });

  it('switches to headless with a fixed desktop viewport', () => {
    const options = launchOptions(true);
    expect(options.headless).toBe(true);
    // Headless has no real window; Maps needs a desktop-width layout for its
    // selectors, so a fixed viewport replaces viewport: null.
    expect(options.viewport).toEqual({ width: 1440, height: 900 });
  });

  it('keeps the keychain workaround in both modes', () => {
    expect(launchOptions(false).ignoreDefaultArgs).toContain('--use-mock-keychain');
    expect(launchOptions(true).ignoreDefaultArgs).toContain('--use-mock-keychain');
  });

  it('honors MAPS_LIST_SAVER_CHANNEL and defaults to chrome', () => {
    expect(launchOptions(false).channel).toBe('chrome');
    process.env.MAPS_LIST_SAVER_CHANNEL = 'chrome-beta';
    expect(launchOptions(true).channel).toBe('chrome-beta');
  });
});
