import assert from 'node:assert/strict';
import { resolve } from 'node:path';

export async function runCastleItemSelectionCases({ a, b, width, evidence }) {
  const withoutClock = value => JSON.parse(JSON.stringify(value, (key, value) => key === 'at' ? undefined : value));
  const item = type => a.locator(`#handContainer .castle-use-item[data-item-type="${type}"]`).first();
  const target = id => a.locator(`[data-entity-id="${id}"] .boss-combat-card-target`);
  const active = () => a.locator('.castle-use-item.is-applying').count();
  const reset = async () => { await a.evaluate(async () => { p0.reset(); await p0.share(); }); };
  await reset();
  const initial = await a.evaluate(() => JSON.stringify(p0.state()));
  await item('explosive').tap();
  assert.equal(await active(), 1);
  assert.equal(await a.locator('.is-item-eligible').count(), 3);
  assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(), false);
  assert.equal(await a.locator('.castle-item-targets').count(), 0);
  assert.equal(await a.evaluate(() => JSON.stringify(p0.state())), initial, 'selection has no mechanical effect');
  await item('explosive').tap(); assert.equal(await active(), 0);
  await item('dagger').click(); await item('relic').tap();
  assert.equal(await active(), 1);
  assert.equal(await a.locator('.is-applying').getAttribute('data-item-type'), 'relic');
  await a.keyboard.press('Escape'); assert.equal(await active(), 0);
  await item('dagger').focus(); await a.keyboard.press('Enter'); assert.equal(await active(), 1);
  await a.keyboard.press('Escape');
  await item('explosive').click(); await a.locator('#bossName').click(); assert.equal(await active(), 0);
  await item('explosive').locator('..').locator('.castle-item-info').tap();
  assert.match(await a.locator('#bossIntentHelpText').innerText(), /100.*15/s);
  assert.equal(await active(), 0); await a.keyboard.press('Escape');
  // Card corners still select physical cards, never an item.
  await item('explosive').locator('..').tap({ position: { x: 3, y: 3 } });
  assert.equal((await a.evaluate(() => p0.selected())).length, 1); assert.equal(await active(), 0);
  await reset();
  // Each item uses the exact engine result, not a parallel UI implementation.
  for (const type of ['explosive', 'dagger', 'cold_flask', 'relic', 'anticoagulant']) {
    await reset();
    const expected = await a.evaluate(async type => {
      const { useCastleItem } = await import('/js/boss/boss-engine.js');
      const s = structuredClone(p0.state()), c = s.players[0].hand.find(c => c.castleItem?.type === type);
      useCastleItem(s, 0, c.id, 'bela');
      return { boss: s.boss, hand: s.players[0].hand, discard: s.discard };
    }, type);
    await item(type).tap();
    // Preserve mode over a same-turn snapshot/hand marker rerender.
    await a.evaluate(() => { const s = p0.state(); s.boughtCardIds = [p0.itemSelection().cardId]; p0.render(); });
    assert.equal(await active(), 1);
    await target('bela').tap();
    await b.waitForFunction(() => p0.state().boss.combatEntities[0].sacrificedCards.length === 1);
    assert.deepEqual(withoutClock(await a.evaluate(() => ({ boss: p0.state().boss, hand: p0.state().players[0].hand, discard: p0.state().discard }))), withoutClock(expected));
    assert.deepEqual(withoutClock(await b.evaluate(() => p0.state().boss)), withoutClock(expected.boss));
    assert.equal(await active(), 0);
    assert.equal(await target('bela').getAttribute('aria-label'), 'Atacar Bela');
  }
  await reset(); await item('explosive').tap();
  // One user gesture cannot consume twice, even when the handler is invoked twice.
  await a.evaluate(async () => { const id = 'bela'; await Promise.all([p0.applyItem(id), p0.applyItem(id)]); });
  assert.equal(await a.evaluate(() => p0.state().boss.combatEntities[0].sacrificedCards.length), 1);
  await a.evaluate(async () => { p0.undo(); await p0.share(); });
  assert.equal(await b.evaluate(() => p0.state().boss.combatEntities[0].hp), 500);
  assert.equal(await active(), 0);
  // A dead daughter is not an item target. Death also clears an existing selection.
  await item('explosive').tap();
  await a.evaluate(() => { p0.state().boss.combatEntities[0].hp = 0; p0.render(); });
  assert.equal(await active(), 0);
  await item('explosive').tap();
  assert.equal(await a.locator('.is-item-eligible').count(), 2);
  assert.equal(await target('bela').isDisabled(), true);
  await a.keyboard.press('Escape');
  for (const reason of ['turn', 'finish', 'pause', 'undo', 'match', 'reload', 'hand', 'pending', 'boss']) {
    await reset(); await item('relic').tap();
    await a.evaluate(reason => {
      const s = p0.state();
      if (reason === 'turn') { s.currentPlayer = 1; s.turnNumber++; }
      if (reason === 'finish') s.finished = true;
      if (reason === 'pause') s.pauseControl = { paused: true };
      if (reason === 'undo') s.lastAction = { type: 'undoMove', id: 'undo-test' };
      if (reason === 'match') s.matchStartedAt++;
      if (reason === 'reload') return p0.reload();
      if (reason === 'hand') s.players[0].hand = s.players[0].hand.filter(c => c.id !== p0.itemSelection().cardId);
      if (reason === 'pending') s.boss.pendingChoices = [{ type: 'test' }];
      if (reason === 'boss') s.boss.bossFlow.stage = 'ability';
      p0.render();
    }, reason);
    assert.equal(await active(), 0, reason + ' clears selection');
    assert.equal(await a.locator('.is-item-eligible').count(), 0, reason + ' clears target highlights');
  }
  await reset();
  await a.evaluate(() => { p0.state().hasDrawnThisTurn = false; p0.render(); });
  await item('explosive').tap(); assert.equal(await active(), 0);
  assert.match(await a.locator('#castleItemSelectionHint').innerText(), /Termine a compra/);
  await reset();
  // Switch humans, apply on the remote observer's hand, then restore damage selection.
  await a.evaluate(async () => { p0.state().currentPlayer = 1; p0.state().turnNumber++; p0.render(); await p0.share(); });
  await b.locator('#handContainer .castle-use-item[data-item-type="anticoagulant"]').tap();
  await b.locator('[data-entity-id="daniela"] .boss-combat-card-target').focus(); await b.keyboard.press('Space');
  await a.waitForFunction(() => p0.state().boss.combatEntities[2].regeneration === 10);
  assert.equal(await b.locator('[aria-label="Atacar Daniela"]').count(), 1);
  await reset(); await target('cassandra').click();
  assert.equal(await a.evaluate(() => p0.state().boss.combatTargetsByPlayer[0]), 'cassandra');
  await item('dagger').tap(); await target('bela').tap();
  assert.equal(await a.evaluate(() => p0.state().boss.combatTargetsByPlayer[0]), 'cassandra', 'item use does not retarget damage');
  // A previously attached card is help in normal mode, never a click shield during application.
  await item('explosive').tap();
  assert.equal(await a.locator('[data-entity-id="bela"] .castle-sacrifice-stack').evaluate(el=>getComputedStyle(el).pointerEvents), 'none');
  await target('bela').tap();
  assert.equal(await a.evaluate(()=>p0.state().boss.combatEntities[0].sacrificedCards.length), 2);
  assert.equal(await a.locator('[data-entity-id="bela"] .castle-sacrifice-stack').evaluate(el=>getComputedStyle(el).pointerEvents), 'auto');
  await reset();
  // All five labels and help controls at native zoom, then browser zoom simulation.
  for (const zoom of [1, 1.25]) {
    await a.evaluate(zoom => { document.body.style.zoom = String(zoom); }, zoom);
    for (const type of ['explosive', 'dagger', 'cold_flask', 'relic', 'anticoagulant']) {
      await item(type).scrollIntoViewIfNeeded();
      const geometry = await item(type).locator('.castle-use-caption').evaluate(el => {
        const r = el.getBoundingClientRect(), card = el.closest('.carta').getBoundingClientRect();
        const art = el.closest('.carta').querySelector('.castle-item-overlay').getBoundingClientRect();
        const info = el.closest('.carta').querySelector('.castle-item-info').getBoundingClientRect();
        return { contained: r.left >= card.left && r.right <= card.right + 1 && r.bottom <= card.bottom,
          noArtOverlap: r.top >= art.bottom - 1, noHelpOverlap: info.bottom <= r.top || info.right <= r.left,
          rects: { caption: { top:r.top, bottom:r.bottom }, art: { top:art.top, bottom:art.bottom }, info: {top:info.top,bottom:info.bottom}, card:{top:card.top,height:card.height} },
          fits: el.scrollWidth <= el.clientWidth + 1, font: parseFloat(getComputedStyle(el).fontSize) };
      });
      assert.equal(geometry.contained && geometry.fits, true, JSON.stringify({ type, width, zoom, geometry }));
      assert.ok(geometry.font >= 8);
      assert.equal(geometry.noArtOverlap && geometry.noHelpOverlap, true, JSON.stringify({ type, width, zoom, geometry }));
      await item(type).tap(); assert.equal(await active(), 1); await a.keyboard.press('Escape');
      await item(type).locator('..').locator('.castle-item-info').tap();
      assert.equal(await a.locator('#bossIntentHelpPopover').isVisible(), true); await a.keyboard.press('Escape');
    }
    if (zoom === 1) {
      await item('explosive').tap();
      await a.screenshot({ path: resolve(evidence, `items-direct-${width}.png`), fullPage: true });
      await a.keyboard.press('Escape');
    }
  }
  await a.evaluate(() => { document.body.style.zoom = ''; });
  await reset();
  console.log('Castle direct item selection / two humans / all five / keyboard-touch-mouse / lifecycle / zoom:', width, 'PASS');
}
