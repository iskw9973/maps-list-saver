#!/usr/bin/env node
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { humanDelay, launchContext, loginWithPlainChrome, profileDir } from './browser.js';
import { parsePlaceList } from './places.js';
import { resolvePlace } from './resolve.js';
import { savePlace } from './save.js';
import {
  parseResolved,
  parseSaveResults,
  savedUrls,
  serializeResolved,
  serializeSaveResult,
} from './tsv.js';

const USAGE = `maps-list-saver — bulk-save places into your Google Maps saved lists

Usage:
  maps-list-saver login
      Open Chrome with a dedicated profile; log in to Google by hand, then
      close the browser. Credentials never touch this tool.

  maps-list-saver resolve <places.txt> [-o resolved.tsv]
      Resolve free-text place names (one per line, # for comments) into
      canonical Google Maps URLs. Review the TSV before saving!

  maps-list-saver save <resolved.tsv> --list <list name> [--results results.tsv]
      Save each resolved place into the given list. Progress is appended to
      the results file, so interrupted or failed runs can simply be rerun.
`;

async function login(): Promise<void> {
  process.stderr.write(
    `Log in to Google in the opened browser (profile: ${profileDir()}).\n` +
      'When you are done, quit Chrome entirely (Cmd+Q on macOS).\n',
  );
  await loginWithPlainChrome('https://www.google.com/maps');
}

async function resolveCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { output: { type: 'string', short: 'o' } },
    allowPositionals: true,
  });
  const inputPath = positionals[0];
  if (!inputPath) throw new Error('usage: maps-list-saver resolve <places.txt> [-o resolved.tsv]');

  const queries = parsePlaceList(await fs.readFile(inputPath, 'utf8'));
  process.stderr.write(`Resolving ${queries.length} places...\n`);

  const context = await launchContext();
  const page = context.pages()[0] ?? (await context.newPage());
  const resolved = [];
  const misses: string[] = [];
  try {
    for (const [i, query] of queries.entries()) {
      process.stderr.write(`[${i + 1}/${queries.length}] ${query} ... `);
      const place = await resolvePlace(page, query).catch(() => null);
      if (place) {
        resolved.push(place);
        process.stderr.write(`-> ${place.name}\n`);
      } else {
        misses.push(query);
        process.stderr.write('not found\n');
      }
      if (i < queries.length - 1) await humanDelay();
    }
  } finally {
    await context.close();
  }

  const text = resolved.length ? serializeResolved(resolved) + '\n' : '';
  if (values.output) {
    await fs.writeFile(values.output, text);
    process.stderr.write(`Wrote ${resolved.length} places to ${values.output}\n`);
  } else {
    process.stdout.write(text);
  }
  if (misses.length) {
    process.stderr.write(`Not found (${misses.length}): ${misses.join(', ')}\n`);
    process.exitCode = 1;
  }
}

async function saveCommand(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      list: { type: 'string', short: 'l' },
      results: { type: 'string', short: 'r', default: 'results.tsv' },
    },
    allowPositionals: true,
  });
  const inputPath = positionals[0];
  const listName = values.list;
  if (!inputPath || !listName) {
    throw new Error(
      'usage: maps-list-saver save <resolved.tsv> --list <list name> [--results results.tsv]',
    );
  }

  const places = parseResolved(await fs.readFile(inputPath, 'utf8'));
  const previous = parseSaveResults(await fs.readFile(values.results, 'utf8').catch(() => ''));
  const done = savedUrls(previous);
  const pending = places.filter((p) => !done.has(p.url));
  process.stderr.write(
    `Saving ${pending.length} of ${places.length} places to "${listName}"` +
      ` (${places.length - pending.length} already done)\n`,
  );
  if (!pending.length) return;

  const context = await launchContext();
  const page = context.pages()[0] ?? (await context.newPage());
  let failed = 0;
  try {
    for (const [i, place] of pending.entries()) {
      process.stderr.write(`[${i + 1}/${pending.length}] ${place.name} ... `);
      try {
        const outcome = await savePlace(page, place.url, listName);
        await fs.appendFile(
          values.results,
          serializeSaveResult({ url: place.url, query: place.query, status: outcome }) + '\n',
        );
        process.stderr.write(outcome === 'saved' ? 'saved\n' : 'already saved\n');
      } catch (err) {
        failed++;
        await fs.appendFile(
          values.results,
          serializeSaveResult({
            url: place.url,
            query: place.query,
            status: 'failed',
            message: err instanceof Error ? err.message : String(err),
          }) + '\n',
        );
        process.stderr.write(`failed: ${err instanceof Error ? err.message : err}\n`);
      }
      if (i < pending.length - 1) await humanDelay();
    }
  } finally {
    await context.close();
  }

  if (failed) {
    process.stderr.write(`${failed} failed — rerun the same command to retry only those.\n`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'login':
      return login();
    case 'resolve':
      return resolveCommand(rest);
    case 'save':
      return saveCommand(rest);
    default:
      process.stderr.write(USAGE);
      if (command) process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
