import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getBossMeldUiModel } from '../js/boss/ui/boss-ui-registry.js';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const coreCss = fs.readFileSync(new URL('../styles/boss-mode.css', import.meta.url), 'utf8');
const bossFiles = {
  banker: 'banker',
  dominadora: 'dominatrix',
  matriarca_esmeralda: 'matriarch',
  dimitrescu: 'dimitrescu',
  nehelenia: 'nehelenia',
};

function renderMeldsSource() {
  const start = app.indexOf('function renderMelds()');
  const end = app.indexOf('scheduleMatriarchGraftLinks();', start);
  assert.ok(start >= 0 && end > start, 'renderMelds deve existir');
  return app.slice(start, end);
}

test('UI especifica de chefe passa por um registry isolado', () => {
  assert.match(app, /getBossMeldContributionUi/);
  assert.match(app, /getBossMeldUiModel/);
  assert.doesNotMatch(app, /state\.boss\?\.id === 'banker' && contribution\?\.bankerDebtRelief/);
  assert.doesNotMatch(app, /state\.boss\?\.id === 'dominadora' && contribution\?\.dominatrixChainsBroken/);
});

test('renderMelds nao decide mais as marcacoes visuais especificas dos chefes', () => {
  const source = renderMeldsSource();
  assert.doesNotMatch(source, /state\.boss\?\.id === '(?:dominadora|matriarca_esmeralda|dimitrescu|nehelenia)'/);
  for (const marker of [
    'boss-meld-dominatrix-order-mark',
    'interdicted-by-boss',
    'rooted-by-matriarch',
    'grafted-by-matriarch',
    'feasted-by-cassandra',
    'boss-meld-nehelenia-attendant',
  ]) {
    assert.doesNotMatch(source, new RegExp(marker));
  }
});

test('adaptador da Dominadora concentra ordem e interdito do jogo', () => {
  const model = getBossMeldUiModel('dominadora', {
    boss: {
      interdicts: [{ status: 'active', teamId: 0, meldId: 'm-1' }],
      activeOrders: [{ status: 'active', type: 'feed_specific_meld', targetPlayerId: 7, meldId: 'm-1' }],
    },
    players: [{ id: 7, teamId: 0 }],
    teamId: 0,
    meldIndex: 1,
    meldId: 'm-1',
    meldInfo: { kind: 'limpa' },
  });
  assert.deepEqual(model.divClasses, ['interdicted-by-boss']);
  assert.deepEqual(model.rowClasses, ['boss-meld-dominatrix-order-mark']);
  assert.equal(model.rowDataset.dominatrixOrder, 'feed_specific_meld');
  assert.match(model.labels.join(''), /INTERDITO · LIMPA → REAL/);
});

test('adaptador da Matriarca concentra Raiz e Enxerto', () => {
  const model = getBossMeldUiModel('matriarca_esmeralda', {
    natureThreats: [
      { id: 'root-1', type: 'root', progress: 1, required: 2 },
      { id: 'graft-1', type: 'graft', meldIds: ['m-1', 'm-2'], matchedMeldId: 'm-2', fedMeldIds: ['m-1'], required: 2 },
    ],
  });
  assert.deepEqual(model.divClasses, ['rooted-by-matriarch', 'grafted-by-matriarch']);
  assert.equal(model.divDataset.graftId, 'graft-1');
  assert.equal(model.divDataset.graftSide, 'B');
  assert.match(model.labels.join(''), /RAIZ 1\/2/);
  assert.match(model.labels.join(''), /ENXERTO B · 1\/2/);
});

test('adaptador da Dimitrescu concentra a marcacao de Cassandra', () => {
  const model = getBossMeldUiModel('dimitrescu', {
    boss: { currentIntent: { abilityId: 'cassandra_feast', payload: { meldId: 'm-1', fed: false } } },
    meldId: 'm-1',
    meldIndex: 0,
  });
  assert.deepEqual(model.divClasses, ['feasted-by-cassandra']);
  assert.deepEqual(model.cardDecoration, { classes: ['boss-card-cassandra-feast'], bloodProfile: 'feast' });
});

test('adaptador da Nehelenia concentra espelho e marcas dos capangas', () => {
  const model = getBossMeldUiModel('nehelenia', {
    boss: {
      currentIntent: { abilityId: 'mirrored_meld', payload: { meldId: 'm-1', fed: false, resolved: false } },
      effects: [{ id: 'nehelenia_tiger_claw', attendant: 'tiger', meldId: 'm-1' }],
    },
    players: [],
    meldId: 'm-1',
    contributionMeldId: 'm-1',
    meldIndex: 0,
  });
  assert.deepEqual(model.divClasses, ['mirrored-by-nehelenia']);
  assert.equal(model.divDataset.neheleniaMirror, 'JOGO ESPELHADO');
  assert.equal(model.mirror.choice, true);
  assert.ok(model.rowClasses.includes('nehelenia-mirror-card-frame'));
  assert.ok(model.rowClasses.includes('boss-meld-nehelenia-tiger-mark'));
  assert.ok(model.rowClasses.includes('is-tiger-claw'));
  assert.match(model.labels.join(''), /GARRAS · DANO SELADO/);
});


test('Nehelenia preserva a diferenca antiga entre id visual do espelho e id de contribuicao dos capangas', () => {
  const model = getBossMeldUiModel('nehelenia', {
    boss: {
      currentIntent: { abilityId: 'mirrored_meld', payload: { meldId: 'm-stable', fed: false, resolved: false } },
      effects: [{ id: 'nehelenia_tiger_claw', attendant: 'tiger', meldId: 'm-stable' }],
    },
    players: [],
    meldId: 'm-stable',
    contributionMeldId: null,
    meldIndex: 4,
  });
  assert.equal(model.mirror?.label, 'JOGO ESPELHADO');
  assert.ok(!model.rowClasses.includes('boss-meld-nehelenia-tiger-mark'));
});

test('cada chefe tem folha de estilo propria carregada e cacheada', () => {
  for (const file of Object.values(bossFiles)) {
    assert.match(html, new RegExp(`styles/boss/${file}\\.css`));
    assert.match(sw, new RegExp(`styles/boss/${file}\\.css`));
  }
});

test('regras movidas para CSS de chefe continuam estritamente escopadas', () => {
  for (const [bossId, file] of Object.entries(bossFiles)) {
    const css = fs.readFileSync(new URL(`../styles/boss/${file}.css`, import.meta.url), 'utf8');
    const foreignBosses = Object.keys(bossFiles).filter((id) => id !== bossId);
    for (const foreign of foreignBosses) {
      assert.doesNotMatch(css, new RegExp(`data-boss-id=['"]${foreign}['"]`));
    }
    assert.match(css, new RegExp(`data-boss-id=['"]${bossId}['"]`));
  }
  assert.match(coreCss, /CORE COMPARTILHADO \+ LEGADO/);
});


test('URLs locais dos CSS de chefe resolvem para assets existentes e ficam precacheadas', () => {
  const cssFiles = [
    ['core', '../styles/boss-mode.css'],
    ...Object.values(bossFiles).map((file) => [file, `../styles/boss/${file}.css`]),
  ];
  const referencedAssets = new Set();

  for (const [label, relativeFile] of cssFiles) {
    const cssUrl = new URL(relativeFile, import.meta.url);
    const css = fs.readFileSync(cssUrl, 'utf8');
    // A quoted data SVG can contain nested url(%23gradient). Consume the whole
    // quoted URL before looking for another CSS URL, rather than parsing SVG as CSS.
    for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g)) {
      const ref = (match[1] ?? match[2] ?? match[3]).trim();
      if (!ref || /^(?:data:|https?:|#)/i.test(ref)) continue;
      const resolvedUrl = new URL(ref, cssUrl);
      const resolvedPath = fileURLToPath(resolvedUrl);
      assert.ok(fs.existsSync(resolvedPath), `${label}: asset CSS inexistente ${ref} -> ${path.relative(fileURLToPath(new URL('..', import.meta.url)), resolvedPath)}`);
      const projectRoot = fileURLToPath(new URL('..', import.meta.url));
      const projectRelative = path.relative(projectRoot, resolvedPath).split(path.sep).join('/');
      if (projectRelative.startsWith('assets/')) referencedAssets.add(projectRelative);
    }
  }

  for (const asset of referencedAssets) {
    assert.match(sw, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${asset} deve estar no precache do service worker`);
  }
});
