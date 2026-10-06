import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = await readFile(resolve(root, 'app.js'), 'utf8');
const handSource = source.slice(source.indexOf('function renderHand('), source.indexOf('function renderHand(') + 25000);
assert.ok(handSource.indexOf('decorateCard?.(div, bossCardEffect)') > handSource.indexOf('div.innerHTML = cardFrontHTML(card)'), 'card marker must survive face rendering');
const index = await readFile(resolve(root, 'index.html'), 'utf8');
const panelSource = source.slice(source.indexOf('function createBossCombatHelp('), source.indexOf('\nfunction renderBossHud(', source.indexOf('function renderBossCombatPanel(')));
const helpSource = source.slice(source.indexOf('function closeBossIntentHelp('), source.indexOf('\nfunction createBossCombatHelp('));
const frameSource = source.slice(source.indexOf('function applyBossMeldEffectFrame('), source.indexOf('\nfunction applyBossMeldCardDecoration('));
const meterSource = source.slice(source.indexOf('function renderBossRangeMeters('), source.indexOf('\nconst BOSS_GUIDE_CORE'));
const snapshotGuard = source.match(/if \(localActionGate\.pending\) await localActionGate\.pending;\s*if \(snapshotSequence !== gameSnapshotSequence\) return;/)[0];
assert.ok(panelSource.endsWith('}\r\n') || panelSource.trimEnd().endsWith('}'));
// Include the outer section, not the nested hidden battle-log section.
const hudMarkup = index.match(/<section id="bossHud"[\s\S]*?<\/section>(?=\s*<div id="bossDaughterStrip")/)[0].replace('style="display: none"', 'style="display: grid"');
const discardMarkup = index.match(/<div class="pile-area" id="drawDiscardBtn">[\s\S]*?<span id="discardTop"[^>]*><\/span>\s*<\/div>/)[0];
const styles = ['base-menu', 'game', 'cards', 'hud', 'responsive', 'boss-mode', 'boss/nemesis'];
const fixture = `<!doctype html><html><head><meta charset="utf-8">${styles.map((name) => `<link rel="stylesheet" href="/styles/${name}.css">`).join('')}</head>
<body class="boss-mode" data-boss-id="nemesis"><main style="padding:14px;max-width:1440px;margin:auto">${hudMarkup}${discardMarkup}</main>
<script type="module">
import { buildBossDebugScenario } from '/js/boss/boss-debug-scenarios.js';
import { getBossUiAdapter } from '/js/boss/ui/boss-ui-registry.js';
import { nemesisBossPresentation } from '/js/boss/presentation/nemesis.js';
import { createActionGate } from '/js/game/match-control.js';
import { setBossDamageTarget, isBossTurnActive, getBossCardEffect, beginBossTurn, advanceBossTurn, notifyBossPurchaseCompleted, completeBossPlayerTurn } from '/js/boss/boss-engine.js';
let state = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'stars_hunt', phase: 1 }).state;
state.currentPlayer = 0; state.boss.bossFlow = null;
let myPlayerIndex = 0; let committing = false;
const pauseBlocksPlay = () => false;
const canPerformCommonGameAction = () => !state.finished;
const localActionGate = createActionGate();
let commitDelay = null, commits = 0; const commitState = async () => { commits++; if (commitDelay) await commitDelay; };
${panelSource}
${helpSource}
${frameSource}
${meterSource}
const buildBossAbilityHelp = sample => sample.noAbilityHelp ? null : ({ title: 'Habilidade', text: 'Objetivo' });
const buildBossRuleSummary = () => '100 Infecção: derrota. Canastras aliviam a barra.';
const renderBossHudRichText = (element, text) => { element.textContent = text; };
syncBossIntentHelp({ ...state, noAbilityHelp: true });
window.initialHelpBound = document.getElementById('bossIntentHelpButton').dataset.helpBound;
syncBossIntentHelp(state);
syncBossRuleHelp(state, { name: 'Nemesis' });
const hud = document.getElementById('bossHud');
document.getElementById('bossName').textContent = 'NEMESIS';
document.getElementById('bossPortraitImage').src = '/assets/images/boss-nemesis.png';
document.getElementById('bossDangerLabel').textContent = 'INFECÇÃO';
document.getElementById('bossHpText').textContent = state.boss.hp + ' / ' + state.boss.maxHp;
document.getElementById('bossIntentName').textContent = 'Caçada S.T.A.R.S.';
document.getElementById('bossIntentDescription').textContent = 'Contribua com 1 carta neste turno.';
window.fixture = { render: () => renderBossCombatPanel(hud, state.boss), state: () => state, commits: () => commits, frame: applyBossMeldEffectFrame,
  reload: () => { state = JSON.parse(JSON.stringify(state)); renderBossCombatPanel(hud, state.boss); },
  observer: (index) => { myPlayerIndex = index; renderBossCombatPanel(hud, state.boss); } };
window.fixture.render();
let discardClicks = 0;
document.getElementById('drawDiscardBtn').onclick = () => { discardClicks++; };
window.fixture.discardClicks = () => discardClicks;
window.fixture.discardHelp = syncBossDiscardHelp;
window.fixture.targetRace = async () => {
  let release; commitDelay = new Promise(resolve => { release = resolve; });
  const before = commits, oldState = JSON.parse(JSON.stringify(state));
  document.querySelector('[aria-label="Selecionar Agarrador como alvo"]').click();
  const selected = state.boss.combatTargetsByPlayer[0];
  const savedState = JSON.parse(JSON.stringify(state));
  let gameSnapshotSequence = 0;
  const snapshot = async (incoming) => {
    const snapshotSequence = ++gameSnapshotSequence;
    ${snapshotGuard}
    state = incoming; renderBossCombatPanel(hud, state.boss);
  };
  const stale = snapshot(oldState);
  document.querySelector('[aria-label="Selecionar Devorador como alvo"]').click();
  const stillSelected = state.boss.combatTargetsByPlayer[0];
  const latest = snapshot(savedState);
  release(); await Promise.all([stale, latest, localActionGate.pending]); commitDelay = null;
  const afterSnapshot = state.boss.combatTargetsByPlayer[0];
  document.querySelector('[aria-label="Selecionar Devorador como alvo"]').click();
  if (localActionGate.pending) await localActionGate.pending;
  document.querySelector('[aria-label="Selecionar Devorador como alvo"]').click();
  if (localActionGate.pending) await localActionGate.pending;
  return { selected, stillSelected, afterSnapshot, final: state.boss.combatTargetsByPlayer[0], commits: commits - before,
    highlighted: [...document.querySelectorAll('.boss-combat-entity.is-selected')].map(node => node.dataset.entityId) };
};
syncBossDiscardHelp(true);
// Render can encounter melds without a registered stable ID and no impact zone.
for (const impactZone of [null, undefined]) {
  const model = getBossUiAdapter('nemesis').meld({ boss: { impactZone, roundNumber: 1 }, meldId: undefined });
  if (model.divClasses.length) throw new Error('Missing zone must not mark a meld');
}
window.fixture.discard = (active) => {
  const sample = { players: [{ id: 0 }], currentPlayer: 0, boss: { currentIntent: { abilityId: active ? 'contaminated_zone' : 'rocket_launcher', payload: { targetPlayerId: 0 } } } };
  document.getElementById('drawDiscardBtn').classList.toggle('boss-nemesis-contaminated-discard', getBossUiAdapter('nemesis').discard({ gameState: sample }));
  getBossUiAdapter('nemesis').decorateCard(document.getElementById('discardFace'), active ? 'nemesis-contaminated' : null);
};
window.fixture.meter = (abilityId, payload) => renderBossRangeMeters(document.getElementById('bossIntentDescription'), nemesisBossPresentation.rangeMeters({ gameState: state, intent: { abilityId, payload } }) || []);
window.fixture.command = () => {
  const intent = { abilityId: 'horde_command', payload: { entityId: state.boss.hordeBuff.entityId, activated: true } };
  const context = { gameState: state, intent }, copy = nemesisBossPresentation.compactAction(context);
  document.getElementById('bossIntentName').textContent = 'Comando da Horda';
  document.getElementById('bossIntentDescription').textContent = copy.instruction;
  document.getElementById('bossIntentProgress').textContent = [copy.progress, copy.consequence].filter(Boolean).join(' · ');
  renderBossRangeMeters(document.getElementById('bossIntentDescription'), nemesisBossPresentation.rangeMeters(context) || []);
};
window.fixture.infectedCard = () => {
  const sample = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'horde_invasion', phase: 1, target: 'zombie_grabber' }).state;
  beginBossTurn(sample, { first: true, now: 1000, debug: true });
  for (let i = 0; i < 15 && sample.boss.bossFlow.stage !== 'players'; i++) advanceBossTurn(sample, sample.boss.bossFlow.endsAt + 1);
  const intent = sample.boss.currentIntent;
  const cardId = intent.payload.cardIds[0];
  const effect = getBossCardEffect(sample, intent.payload.targetPlayerId, cardId);
  const node = document.createElement('div'); node.id = 'infectionTestCard'; node.className = 'carta';
  node.style.cssText = 'position:relative;width:100px;height:150px;background:#fff9e8;margin:20px';
  node.innerHTML = '<b style="position:absolute;top:4px;left:4px">2♣</b><span class="bought-card-marker"><span>NOVA</span></span>';
  const hand = document.createElement('div'); hand.id = 'handContainer';
  hand.style.cssText = 'position:relative;display:flex;justify-content:center;height:190px;overflow:visible';
  hand.append(node); document.querySelector('main').append(hand);
  const ui = getBossUiAdapter('nemesis'); ui.decorateCard(node, effect); ui.decorateCard(node, effect);
  return { effect, other: getBossCardEffect(sample, 1 - intent.payload.targetPlayerId, cardId) };
};
window.fixture.decorate = (effect) => getBossUiAdapter('nemesis').decorateCard(document.getElementById('infectionTestCard'), effect);
window.fixture.grabPulse = (reducedMotion = false) => {
  const sample = buildBossDebugScenario(null, { bossId: 'nemesis', abilityId: 'stars_hunt', phase: 1 }).state;
  sample.boss.currentIntent = null; sample.boss.bossFlow = null; sample.boss.combatEntities[0].status = 'persistent';
  const ui = getBossUiAdapter('nemesis'), root = document.createElement('div');
  const acquired = [{ id: 'grab-a', rank: '7', suit: '♥' }, { id: 'free-b', rank: 'K', suit: '♠' }];
  sample.players[0].hand = acquired.slice();
  sample.teams[0].melds = [['3','4','5','6'].map(rank => ({ id: 'table-' + rank, rank, suit: '♥' }))];
  sample.hasDrawnThisTurn = true; sample.partialDraw = false;
  let pulses = 0;
  const render = () => {
    root.replaceChildren();
    for (const card of acquired) {
      const node = document.createElement('div'); node.className = 'carta'; node.dataset.cardId = card.id;
      ui.decorateCard(node, getBossCardEffect(sample, 0, card.id));
      const overlay = node.querySelector('.nemesis-infection-overlay'); if (overlay) overlay.animate = () => { pulses++; };
      root.append(node);
    }
    ui.syncCardTransitions(root, sample.boss, { reducedMotion });
  };
  render();
  const beforePurchase = JSON.parse(JSON.stringify(sample.boss));
  notifyBossPurchaseCompleted(sample, 0); render();
  const first = pulses, marked = [...root.querySelectorAll('.nemesis-grabbed')].map(node => node.dataset.cardId);
  const label = root.querySelector('.boss-card-status-nemesis')?.textContent;
  render(); sample.boss = JSON.parse(JSON.stringify(sample.boss)); notifyBossPurchaseCompleted(sample, 0); render();
  // Undo/reapply the same logical purchase must not replay its presentation.
  sample.boss = beforePurchase; notifyBossPurchaseCompleted(sample, 0); render();
  const repeat = pulses;
  const reloadedRoot = root.cloneNode(true);
  reloadedRoot.querySelectorAll('.nemesis-infection-overlay').forEach(node => { node.animate = () => { pulses++; }; });
  ui.syncCardTransitions(reloadedRoot, sample.boss);
  completeBossPlayerTurn(sample, 0); render();
  return { first, repeat, pulses, marked, label, remaining: root.querySelectorAll('.nemesis-infection-overlay').length };
};
</script></body></html>`;
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); return res.end(fixture); }
    const file = resolve(root, `.${decodeURIComponent(path)}`);
    if (!file.startsWith(`${root}\\`) && !file.startsWith(`${root}/`)) throw new Error('outside root');
    const bytes = await readFile(file);
    res.setHeader('Content-Type', { '.css': 'text/css', '.png': 'image/png', '.js': 'text/javascript' }[extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
  try { await page.waitForSelector('#bossCombatPanel', { state: 'attached', timeout: 10000 }); }
  catch (error) { throw new Error(`Fixture did not render: ${errors.join('; ')}`, { cause: error }); }
  assert.equal(await page.evaluate(() => window.initialHelpBound), '1', 'official help binds even before an active ability');
  const discardHelp = page.getByLabel('Explicar Lixo no modo Chefe', { exact: true });
  await discardHelp.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#bossIntentHelpPopover').isVisible(), true, `discard help opens; focus=${await page.evaluate(() => document.activeElement.id)}`);
  assert.equal(await page.locator('#bossIntentHelpTitle').innerText(), 'Lixo — Modo Chefe');
  const discardRule = await page.locator('#bossIntentHelpText').innerText();
  assert.ok(discardRule.length < 350, 'discard rule remains short');
  assert.match(discardRule, /jogo já baixado.*só o topo/);
  assert.match(discardRule, /jogo novo.*Lixo inteiro/);
  assert.match(discardRule, /Joker.*só o Joker/);
  assert.match(discardRule, /2 como coringa.*só o 2/);
  assert.match(discardRule, /2 natural.*Lixo inteiro/);
  assert.equal(await page.evaluate(() => window.fixture.discardClicks()), 0, 'help never triggers pickup');
  await page.keyboard.press('Escape');
  assert.equal(await discardHelp.getAttribute('aria-expanded'), 'false');
  await page.locator('#drawDiscardBtn .pile-card').click();
  assert.equal(await page.evaluate(() => window.fixture.discardClicks()), 1, 'normal discard click is preserved');
  await page.locator('#drawDiscardBtn').evaluate(node => { node.style.pointerEvents = 'none'; });
  await discardHelp.click();
  assert.equal(await page.locator('#bossIntentHelpPopover').isVisible(), true, 'help remains usable when pickup is blocked');
  await page.evaluate(() => window.fixture.discardHelp(false));
  assert.equal(await page.locator('#bossDiscardHelpButton').count(), 0, 'no button outside boss mode');
  assert.equal(await page.locator('#bossIntentHelpPopover').isVisible(), false);
  await page.evaluate(() => { window.fixture.discardHelp(true); window.fixture.discardHelp(true); });
  assert.equal(await page.locator('#bossDiscardHelpButton').count(), 1, 'rerender does not duplicate the control');
  await page.locator('#drawDiscardBtn').evaluate(node => { node.style.pointerEvents = ''; });
  assert.equal(await page.locator('.boss-combat-entity').count(), 0, 'new match has no permanent zombie cards');
  const cardEffects = await page.evaluate(() => window.fixture.infectedCard());
  assert.equal(cardEffects.effect, 'nemesis-marked', 'Agarrador entry exposes the actual marked card');
  assert.equal(cardEffects.other, null, 'other players are not marked');
  assert.equal(await page.locator('#infectionTestCard .nemesis-infection-overlay').count(), 1, 'rerender does not duplicate infection');
  assert.equal(await page.locator('#infectionTestCard .boss-card-status-nemesis').innerText(), '☣ MARCADA');
  const infectionStyle = await page.locator('#infectionTestCard .nemesis-infection-overlay').evaluate(node => {
    const css = getComputedStyle(node);
    return { border: css.border, shadow: css.boxShadow, inset: css.inset };
  });
  assert.equal(await page.locator('#infectionTestCard .bought-card-marker').innerText(), 'NOVA');
  assert.equal(await page.locator('#infectionTestCard').evaluate(node => {
    const marker = node.querySelector('.boss-card-status-nemesis').getBoundingClientRect();
    const nova = node.querySelector('.bought-card-marker > span').getBoundingClientRect();
    return marker.bottom <= nova.top;
  }), true, 'infection label must not cover NOVA');
  assert.equal(await page.locator('.nemesis-infection-overlay').evaluate(node => getComputedStyle(node).pointerEvents), 'none');
  for (const [effect, label] of [['nemesis-grabbed', 'AGARRADA'], ['nemesis-contaminated', 'CONTAMINADA']]) {
    await page.evaluate(effect => window.fixture.decorate(effect), effect);
    assert.equal(await page.locator('#infectionTestCard .boss-card-status-nemesis').innerText(), `☣ ${label}`);
    assert.equal(await page.locator('#infectionTestCard .nemesis-infection-overlay').count(), 1);
    assert.deepEqual(await page.locator('#infectionTestCard .nemesis-infection-overlay').evaluate(node => {
      const css = getComputedStyle(node);
      return { border: css.border, shadow: css.boxShadow, inset: css.inset };
    }), infectionStyle, 'all exact-card marks retain the same restrained outline');
  }
  assert.deepEqual(await page.evaluate(() => window.fixture.grabPulse()), { first: 1, repeat: 1, pulses: 1, marked: ['grab-a'], label: '☣ AGARRADA', remaining: 0 });
  assert.deepEqual(await page.evaluate(() => window.fixture.grabPulse(true)), { first: 0, repeat: 0, pulses: 0, marked: ['grab-a'], label: '☣ AGARRADA', remaining: 0 });
  await page.evaluate(() => window.fixture.decorate(null));
  assert.equal(await page.locator('#infectionTestCard .nemesis-infection-overlay, #infectionTestCard .boss-card-status-nemesis').count(), 0, 'clearing the effect removes infection decoration');
  await page.evaluate(() => window.fixture.decorate('nemesis-marked'));
  await page.evaluate(() => { const entity = window.fixture.state().boss.combatEntities[0]; entity.status = 'entering'; entity.transitionEventId = 'entry'; entity.transitionAt = Date.now(); window.fixture.render(); });
  assert.equal(await page.locator('.boss-combat-entity.is-entering').count(), 1);
  await page.waitForFunction(() => { const image = document.querySelector('.is-entering .boss-combat-portrait'); return image?.complete && image.naturalWidth > 0; });
  assert.equal(await page.locator('.boss-combat-card-target').count(), 0, 'entering cannot be attacked');
  assert.equal(await page.locator('.is-entering meter').count(), 0, 'entering has no combat HP');
  await page.getByLabel('Agarrador: INVADINDO', { exact: true }).click();
  assert.match(await page.locator('#bossIntentHelpText').innerText(), /objetivo.*expulsar/);
  assert.equal(await page.evaluate(() => window.fixture.commits()), 0);
  await page.keyboard.press('Escape');
  assert.doesNotMatch(await page.locator('.is-entering').innerText(), /ENTRANDO|impeça a invasão/);
  assert.deepEqual(await page.locator('.is-entering .boss-daughter-state').allTextContents(), ['INVADINDO']);
  assert.equal(await page.locator('#bossHud #bossCombatPanel').count(), 0, 'zombies must not expand the boss HUD');
  assert.equal(await page.locator('#bossHud + #bossCombatPanel').count(), 1, 'zombies use the separate helper strip');
  assert.equal(await page.locator('.boss-combat-head').count(), 0, 'no loose duration row above zombies');
  await page.evaluate(() => { for (const entity of window.fixture.state().boss.combatEntities) entity.status = 'persistent'; window.fixture.render(); });
  assert.equal(await page.locator('.boss-combat-entity').count(), 3);
  assert.equal(await page.locator('.boss-portrait .boss-combat-targets').count(), 1, 'damage selector integrated in portrait');
  assert.equal(await page.locator('#bossCombatPanel .boss-combat-targets').count(), 0, 'no loose damage row below zombies');
  await page.waitForFunction(() => [...document.querySelectorAll('.boss-combat-portrait')].length === 3 && [...document.querySelectorAll('.boss-combat-portrait')].every((image) => image.complete && image.naturalWidth > 0));
  assert.deepEqual(await page.locator('.boss-combat-portrait').evaluateAll((images) => images.map((image) => image.getAttribute('src'))), ['assets/images/nemesis-agarrador.png', 'assets/images/nemesis-infectado.png', 'assets/images/nemesis-devorador.png']);
  assert.equal(await page.locator('.boss-combat-portrait').first().evaluate((image) => getComputedStyle(image).objectFit), 'cover');
  await page.getByRole('button', { name: 'Selecionar Infectado como alvo', exact: true }).click();
  assert.equal(await page.evaluate(() => window.fixture.state().boss.combatTargetsByPlayer[0]), 'infected');
  assert.equal(await page.evaluate(() => window.fixture.commits()), 1);
  await page.evaluate(() => { window.originalButton = document.querySelector('.boss-combat-targets button'); window.fixture.render(); });
  assert.equal(await page.evaluate(() => window.originalButton === document.querySelector('.boss-combat-targets button')), true);
  await page.evaluate(() => window.fixture.reload());
  assert.equal(await page.getByRole('button', { name: 'Selecionar Infectado como alvo', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-entity-id="infected"].is-selected').count(), 1);
  await page.getByLabel('Infectado: INFECÇÃO +2', { exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#bossIntentHelpText').innerText(), /falha.*\+2/i);
  assert.equal(await page.evaluate(() => window.fixture.commits()), 1, 'chip does not change target');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Selecionar Nemesis como alvo', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.fixture.state().boss.combatTargetsByPlayer[0] === 'boss');
  assert.equal(await page.evaluate(() => window.fixture.commits()), 2);
  await page.getByRole('button', { name: 'Selecionar Infectado como alvo', exact: true }).click();
  await page.getByLabel('Passiva de Infectado').click();
  assert.equal(await page.locator('#bossIntentHelpPopover').isVisible(), true);
  assert.match(await page.locator('#bossIntentHelpText').innerText(), /total \+4 normal \/ \+6 Mutado/);
  assert.equal(await page.evaluate(() => window.fixture.commits()), 3, 'help never selects or commits a target');
  await page.getByRole('button', { name: 'Fechar ajuda', exact: true }).click();
  assert.equal(await page.getByLabel('Passiva de Infectado').getAttribute('aria-expanded'), 'false');
  await page.getByLabel('Passiva de Infectado').click();
  await page.getByLabel('Explicar esta habilidade').click();
  assert.equal(await page.locator('#bossIntentHelpTitle').innerText(), 'Habilidade');
  assert.equal(await page.getByLabel('Passiva de Infectado').getAttribute('aria-expanded'), 'false');
  await page.keyboard.press('Escape');
  await page.getByLabel('Passiva de Infectado').click();
  await page.getByLabel('Passiva de Infectado').click();
  await page.getByLabel('Explicar alvo S.T.A.R.S.').click();
  assert.match(await page.locator('#bossIntentHelpText').innerText(), /Dano causado aos zumbis não altera o alvo/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#bossIntentHelpPopover').isVisible(), false);
  await page.evaluate(() => window.fixture.observer(1));
  assert.equal(await page.getByLabel('Redirecionar dano para Nemesis', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel('Selecionar Nemesis como alvo', { exact: true }).isDisabled(), true);
  await page.evaluate(() => window.fixture.observer(0));
  await page.evaluate(() => {
    const boss = window.fixture.state().boss;
    boss.combatEntities[1].mutated = true;
    boss.hordeBuff = { entityId: 'infected', expiresRound: boss.roundNumber + 1 };
    window.fixture.render();
  });
  assert.deepEqual(await page.locator('[data-entity-id="infected"] .boss-daughter-state').allTextContents(), ['ATIVO', 'MUTADO', 'REFORÇADO', 'INFECÇÃO +6']);
  assert.deepEqual(await page.evaluate(() => window.fixture.targetRace()), {
    selected: 'grabber', stillSelected: 'grabber', afterSnapshot: 'grabber', final: 'devourer', commits: 2, highlighted: ['devourer'],
  }, 'rapid clicks and stale snapshots must not bounce the target back to Infectado');
  for (const [width, height] of [[1920, 1080], [1024, 768], [844, 390], [390, 844], [3840, 2160]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.fixture.discard(false));
    const discardShadows = await page.locator('#drawDiscardBtn .pile-card, #discardFace').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).boxShadow));
    await page.evaluate(() => window.fixture.discard(true));
    assert.match(await page.locator('#drawDiscardBtn').evaluate(el => getComputedStyle(el, '::after').content), /INFECÇÃO/);
    assert.deepEqual(await page.locator('#drawDiscardBtn .pile-card, #discardFace').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).boxShadow)), discardShadows, 'contamination must not stack outlines/glows on the pile and face');
    assert.equal(await page.locator('#discardFace .nemesis-infection-overlay').count(), 1);
    assert.deepEqual(await page.locator('#discardFace .nemesis-infection-overlay').evaluate(node => {
      const css = getComputedStyle(node);
      return { border: css.border, shadow: css.boxShadow, inset: css.inset };
    }), infectionStyle, 'discard uses exactly the Invasion/hand card marking');
    await page.evaluate(() => window.fixture.discard(false));
    assert.equal(await page.locator('#drawDiscardBtn').evaluate(el => el.classList.contains('boss-nemesis-contaminated-discard')), false);
    for (const value of [0, 1, 2]) {
      await page.evaluate(v => window.fixture.meter('stars_extermination', { contributed: v >= 1, secondExited: v >= 2 }), value);
      const bar = page.locator('#bossRangeMeters [role="progressbar"]');
      assert.equal(await bar.getAttribute('aria-valuenow'), String(value));
      assert.equal(await bar.getAttribute('aria-valuemax'), '2');
      assert.equal(await page.locator('#bossRangeMeters .boss-range-meter-fill').evaluate(el => el.style.width), `${value * 50}%`);
    }
    await page.evaluate(() => window.fixture.meter('stars_extermination', { contributed: true, secondExited: false }));
    assert.equal(await page.locator('#bossRangeMeters [role="progressbar"]').count(), 1);
    assert.equal(await page.locator('#bossRangeMeters .boss-range-meter-legend > span').count(), 3);
    await page.evaluate(() => window.fixture.meter('horde_invasion', { entryKind: 'infected' }));
    assert.equal(await page.locator('#bossRangeMeters').isVisible(), false);
    await page.evaluate(() => window.fixture.meter('rocket_launcher', {}));
    assert.equal(await page.locator('#bossRangeMeters').isVisible(), false);
    await page.evaluate(() => window.fixture.command());
    assert.equal(await page.locator('#bossRangeMeters').isVisible(), false, 'Horde Command is a timed buff, not a graded objective');
    assert.match(await page.locator('#bossIntentDescription').innerText(), /Infectado reforçado até fim da rodada/);
    assert.equal(await page.locator('#bossIntentProgress').innerText(), 'Falha: +6 Infecção extra.');
    await page.setViewportSize({ width, height });
    for (const label of ['Explicar Lixo no modo Chefe', 'Passiva de Agarrador', 'Passiva de Infectado', 'Infectado: MUTADO', 'Infectado: REFORÇADO', 'Infectado: INFECÇÃO +6', 'Explicar alvo S.T.A.R.S.', 'Explicar alvo do dano', 'Explicar esta habilidade', 'Explicar a regra deste chefe']) {
      await page.getByLabel(label, { exact: true }).click();
      const anchored = await page.locator(label === 'Explicar a regra deste chefe' ? '#bossRule' : '#bossIntentHelpPopover').evaluate(node => {
        const r = node.getBoundingClientRect(), t = node._anchorTrigger.getBoundingClientRect();
        const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
        // Chips are wider than a ?; measure the gap between the two rectangles,
        // not from the chip's centre (which incorrectly includes half its width).
        const distance = Math.hypot(Math.max(r.left - t.right, t.left - r.right, 0), Math.max(r.top - t.bottom, t.top - r.bottom, 0));
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, distance, side: node.dataset.anchorSide, arrow: getComputedStyle(node, '::before').content };
      });
      assert.ok(anchored.left >= 0 && anchored.right <= width + 1 && anchored.top >= 0 && anchored.bottom <= height + 1, `${width}/${label}: popup in viewport ${JSON.stringify(anchored)}`);
      assert.ok(anchored.distance <= 24, `${width}/${label}: popup next to actual trigger ${JSON.stringify(anchored)}`);
      assert.ok(anchored.side && anchored.arrow !== 'none', 'dialogue pointer connects the trigger');
      await page.keyboard.press('Escape');
    }
    const hudHeight = await page.locator('#bossHud').evaluate(node => node.getBoundingClientRect().height);
    await page.locator('#bossCombatPanel').evaluate(node => { node.hidden = true; });
    assert.equal(await page.locator('#bossHud').evaluate(node => node.getBoundingClientRect().height), hudHeight, `${width}: helper strip does not expand HUD`);
    await page.locator('#bossCombatPanel').evaluate(node => { node.hidden = false; });
    const geometry = await page.locator('#bossCombatPanel').evaluate((panel) => {
      const rect = panel.getBoundingClientRect();
      const cards = [...panel.querySelectorAll('.boss-combat-entity')].map((node) => node.getBoundingClientRect());
      return { left: rect.left, right: rect.right, width: rect.width, overflow: panel.scrollWidth - panel.clientWidth,
        overlap: cards.some((card, i) => i && card.left < cards[i - 1].right - 1) };
    });
    assert.ok(geometry.left >= 0 && geometry.right <= width + 1, `${width}: HUD outside viewport ${JSON.stringify(geometry)}`);
    assert.ok(geometry.overflow <= 1, `${width}: panel overflows ${JSON.stringify(geometry)}`); assert.equal(geometry.overlap, false);
    assert.equal(await page.locator('.boss-combat-entity').evaluateAll((cards) => cards.every((card) => {
      const r = card.getBoundingClientRect(), h = card.querySelector('.boss-combat-help').getBoundingClientRect(), a = card.querySelector('img').getBoundingClientRect();
      return h.left >= r.left && h.right <= r.right && h.top >= r.top && h.bottom <= r.bottom && Math.abs(a.width - (r.width - 2)) < 2 && Math.abs(a.height - (r.height - 2)) < 2;
    })), true, `${width}: art full bleed and help contained`);
    const chipWidths = await page.locator('.boss-combat-chips .boss-daughter-state').evaluateAll(chips => chips.map(chip => ({ label: chip.textContent, scroll: chip.scrollWidth, client: chip.clientWidth, rect: chip.getBoundingClientRect().width })));
    assert.ok(chipWidths.every(chip => chip.scroll <= chip.client + 1), `${width}: status labels fit ${JSON.stringify(chipWidths)}`);
    assert.equal(await page.locator('.boss-combat-entity').evaluateAll(cards => cards.every(card => {
      const chips = card.querySelector('.boss-combat-chips').getBoundingClientRect();
      const hp = card.querySelector('.boss-combat-content')?.getBoundingClientRect();
      return !hp || chips.bottom <= hp.top;
    })), true, `${width}: final effect chip does not cover HP or card help`);
    assert.equal(await page.locator('#nemesisStarsOverlay').evaluate((overlay) => {
      const r = overlay.getBoundingClientRect(), p = overlay.closest('.boss-portrait').getBoundingClientRect();
      return r.left >= p.left && r.right <= p.right && r.top >= p.top && r.bottom <= p.bottom;
    }), true, `${width}: S.T.A.R.S. remains inside the main art`);
    await mkdir(resolve(root, '.cache/nemesis-ui'), { recursive: true });
    await page.locator('#bossCombatPanel').evaluate(async node => {
      await Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    await page.evaluate(() => window.fixture.discard(true));
    await page.screenshot({ path: resolve(root, `.cache/nemesis-ui/nemesis-hud-${width}.png`), fullPage: true });
    await page.evaluate(() => window.fixture.discard(false));
  }
  const frameResults = await page.evaluate(() => {
    const classes = ['locked-by-boss', 'possessed-by-boss', 'interdicted-by-boss', 'rooted-by-matriarch', 'grafted-by-matriarch', 'feasted-by-cassandra', 'nemesis-impact-zone', 'mirrored-by-nehelenia'];
    return classes.map(className => {
      const div = document.createElement('div'); div.className = `meld-line ${className}`;
      div.style.cssText = 'display:inline-flex;flex-direction:column;margin:20px';
      const row = document.createElement('div'); row.className = 'meld-line-cards'; row.style.cssText = 'width:160px;height:100px';
      if (className === 'mirrored-by-nehelenia') { row.classList.add('nehelenia-mirror-card-frame'); row.dataset.neheleniaMirror = 'PRISÃO'; }
      const meta = document.createElement('div'); meta.className = 'meld-meta'; meta.style.height = '20px'; meta.textContent = 'Canastra · Limpa';
      div.append(row, meta); window.fixture.frame(div, row); document.body.append(div);
      const r = row.getBoundingClientRect(), m = meta.getBoundingClientRect();
      const result = { className, rowFrame: row.classList.contains('boss-meld-effect-frame'), metaOutside: m.top > r.bottom + 3, outline: getComputedStyle(row).outlineStyle, parentBefore: getComputedStyle(div, '::before').content, parentAfter: getComputedStyle(div, '::after').content };
      div.remove(); return result;
    });
  });
  for (const r of frameResults) { assert.ok(r.rowFrame && r.metaOutside && r.outline === 'solid', JSON.stringify(r)); assert.equal(r.parentBefore, 'none'); assert.equal(r.parentAfter, 'none'); }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.nemesis-infection-overlay').evaluate(node => getComputedStyle(node, '::before').animationName), 'none');
  await page.evaluate(() => { const entity = window.fixture.state().boss.combatEntities[0]; entity.transitionEventId = 'persistent-transition'; window.fixture.render(); });
  assert.equal(await page.locator('[data-entity-id="grabber"]').evaluate((node) => getComputedStyle(node).animationName), 'none');
  await page.evaluate(() => { const entity = window.fixture.state().boss.combatEntities[0]; entity.status = 'repelled'; entity.transitionAt = Date.now(); entity.transitionEventId = 'repelled'; window.fixture.render(); });
  await page.waitForFunction(() => !document.querySelector('[data-entity-id="grabber"]'), null, { timeout: 2000 });
  await page.evaluate(() => { for (const entity of window.fixture.state().boss.combatEntities) { entity.hp = 0; entity.status = 'corpse'; } window.fixture.render(); });
  assert.equal(await page.locator('.boss-combat-targets').count(), 0);
  assert.equal(await page.locator('.boss-combat-entity.is-corpse').count(), 3);
  assert.equal(await page.locator('.boss-combat-entity.is-corpse .boss-combat-portrait').count(), 3);
  assert.equal(await page.locator('.boss-combat-entity meter').count(), 0);
  assert.deepEqual(errors, []);
  const touchPage = await browser.newPage({ hasTouch: true, viewport: { width: 390, height: 844 } });
  await touchPage.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
  await touchPage.goto(`http://127.0.0.1:${server.address().port}/fixture`);
  await touchPage.getByLabel('Explicar Lixo no modo Chefe', { exact: true }).tap();
  assert.equal(await touchPage.locator('#bossIntentHelpPopover').isVisible(), true, 'touch opens official help');
  assert.equal(await touchPage.evaluate(() => window.fixture.discardClicks()), 0);
  await touchPage.getByLabel('Explicar Lixo no modo Chefe', { exact: true }).tap();
  assert.equal(await touchPage.locator('#bossIntentHelpPopover').isVisible(), false, 'second tap closes help');
  await touchPage.close();
  console.log('Nemesis HUD: real renderer, target persistence, turn permissions, DOM stability and 5 viewports passed.');
} finally { await browser?.close(); await new Promise((done) => server.close(done)); }
