import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { launchOptions, profileDir, removeProfile } from './browser.js';

describe('profileDir', () => {
  afterEach(() => {
    delete process.env.MAPS_LIST_SAVER_PROFILE;
  });

  it('defaults to ~/.maps-list-saver/profile', () => {
    expect(profileDir()).toBe(path.join(os.homedir(), '.maps-list-saver', 'profile'));
  });

  it('falls back to MAPS_LIST_SAVER_PROFILE', () => {
    process.env.MAPS_LIST_SAVER_PROFILE = '/tmp/env-profile';
    expect(profileDir()).toBe('/tmp/env-profile');
  });

  it('prefers an explicit override over the environment', () => {
    process.env.MAPS_LIST_SAVER_PROFILE = '/tmp/env-profile';
    expect(profileDir('/tmp/cli-profile')).toBe('/tmp/cli-profile');
  });
});

describe('removeProfile', () => {
  it('removes an existing profile and returns its path', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mls-profile-'));
    await fs.writeFile(path.join(dir, 'Cookies'), 'x');
    expect(await removeProfile(dir)).toBe(dir);
    await expect(fs.access(dir)).rejects.toThrow();
  });

  it('returns null when there is no profile to remove', async () => {
    const dir = path.join(os.tmpdir(), 'mls-profile-does-not-exist');
    expect(await removeProfile(dir)).toBeNull();
  });
});

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
