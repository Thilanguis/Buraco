// Materialize the previous JS tree in an owned temporary directory so its
// imports cannot silently load the current strategy during an A/B comparison.
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadBossBaseline(ref, { includeFixtures = false } = {}) {
  const revision = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
  const directory = await mkdtemp(join(tmpdir(), 'buraco-bot-baseline-'));
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', revision, '--', 'boss-bot.js', 'js',
    ...(includeFixtures ? ['tests/boss-cooperative-fixture.mjs','tests/boss-wildcard-audit.mjs'] : [])], { encoding: 'utf8' })
    .trim().split('\n').filter(path => /\.m?js$/.test(path));
  try {
    for (const file of files) {
      const destination = join(directory, file);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, execFileSync('git', ['show', `${revision}:${file}`]));
    }
    const { BossBuracoBot } = await import(pathToFileURL(join(directory, 'boss-bot.js')).href);
    const fixture = includeFixtures ? await import(pathToFileURL(join(directory, 'tests/boss-cooperative-fixture.mjs')).href) : null;
    const rules = includeFixtures ? await import(pathToFileURL(join(directory, 'js/boss/boss-engine.js')).href) : null;
    return { BossBuracoBot, fixture, rules, directory, revision, dispose: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
