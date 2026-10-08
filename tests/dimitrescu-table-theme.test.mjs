import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';
import { TABLE_THEME_IDS, normalizeTableTheme, normalizeDeckTheme } from '../js/themes.js';
import { getBossDefinition } from '../js/boss/boss-registry.js';

test('Castelo da Dimitrescu is a separate table, not a new deck', () => {
  assert.ok(TABLE_THEME_IDS.includes('dimitrescu'));
  assert.equal(normalizeTableTheme('dimitrescu'), 'dimitrescu');
  assert.equal(normalizeDeckTheme('dimitrescu'), 'classico');
  assert.equal(getBossDefinition('dimitrescu').tableTheme, 'dimitrescu');
  assert.equal(getBossDefinition('dimitrescu').deckTheme, 'resident');
  assert.equal(getBossDefinition('nemesis').tableTheme, 'resident');
  assert.equal(normalizeTableTheme('resident'), 'resident', 'saved R.P.D. tables remain valid');
});

test('both table menus include the castle and label the existing R.P.D. theme', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['tableThemeSelect', 'debugTableThemeSelect']) {
    const select = html.match(new RegExp(`<select[^>]*id="${id}"[\\s\\S]*?</select>`))?.[0];
    assert.ok(select, id);
    assert.match(select, /value="dimitrescu">(?:🩸 )?Castelo da Dimitrescu/);
    assert.match(select, /value="resident">(?:☣ )?Resident Evil 3 — R\.P\.D\./);
  }
});

test('castle artwork is lightweight WebP and included in offline cache', async () => {
  const path = new URL('../assets/resident/dimitrescu-table.webp', import.meta.url);
  const bytes = await readFile(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.ok((await stat(path)).size < 600_000);
  const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /\.\/assets\/resident\/dimitrescu-table\.webp/);
});

test('castle table preserves the existing Resident Evil soundtrack and celebrations', async () => {
  const source = await readFile(new URL('../js/audio.js', import.meta.url), 'utf8');
  // Execute only the table audio declarations, without browser playback globals.
  const excerpt = source.slice(source.indexOf('export const TABLE_ASAS_SFX'), source.indexOf('export const TABLE_AMBIENT_MAX_VOLUME'));
  const context = { Audio: class {}, CANASTRA_SFX: {}, createBossSfx: (src, volume) => ({ src, volume }),
    sfxCardMove: {}, window: {}, sfxSteal: {} };
  vm.runInNewContext(excerpt.replaceAll('export ', '') + '\nthis.tables = { TABLE_ASAS_SFX, TABLE_CANASTRA_SFX, TABLE_AMBIENT_MUSIC };', context);
  for (const mapping of Object.values(context.tables)) assert.equal(mapping.dimitrescu, mapping.resident);
});
