import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as engine from '../js/boss/boss-engine.js';
import { ITEM_DEFINITIONS } from '../js/boss/dimitrescu-castle.js';
import { createDeck } from '../js/deck.js';
import { createActionGate, pauseBlocksPlay } from '../js/game/match-control.js';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('// Local presentation state only:'), app.indexOf('function castleItemInfoButton('));
function harness() {
  const deck = createDeck(['♠', '♥', '♦', '♣'], ['A','2','3','4','5','6','7','8','9','10','J','Q','K']);
  const boss = engine.createBossState('dimitrescu', 834);
  engine.distributeCastleItems(boss, deck); boss.bossFlow = { stage: 'players' };
  const hand = Object.keys(ITEM_DEFINITIONS).map(type => deck.find(c => c.castleItem?.type === type));
  hand.push(deck.find(c => !c.castleItem));
  const elements = new Map(), listeners = [];
  const ctx = { ...engine, ITEM_DEFINITIONS, JSON, Object, CSS: { escape: s => s },
    state: { mode:'boss_dimitrescu', matchStartedAt:1, turnNumber:1, currentPlayer:0, hasDrawnThisTurn:true,
      players:[{ id:0, name:'Humano', teamId:0, hand }, { id:1, name:'BOT', teamId:0, hand:[] }],
      teams:[{id:0,melds:[]}], discard:[], stock:deck.filter(c => !hand.includes(c)), boss },
    myPlayerIndex:0, committing:false, pauseBlocksPlay, window: { gameSessionId:1, matchMedia:()=>({ matches:true }) },
    document: { querySelectorAll:()=>[], querySelector:()=>null, getElementById:id=>elements.get(id),
      addEventListener:(type, fn)=>listeners.push({type,fn}), createElement:()=>({ dataset:{}, setAttribute(){}, remove(){elements.delete(this.id);} }) },
    selectedHandIndexes:new Set(), localActionGate:createActionGate(), closeBossIntentHelp(){},
    canPerformCommonGameAction:()=>true, saveStateForUndo:()=>{ctx.undo=structuredClone(ctx.state);},
    newActionId:()=> 'ui-item', renderAll:()=>{ctx.renders++;}, commitState:async()=>{ctx.commits++;},
    renders:0, commits:0, flyRectToRect:async()=>assert.fail('reduced motion must not animate') };
  elements.set('dimitrescuCastlePanel', { insertAdjacentElement:(_where, el)=>elements.set(el.id, el) });
  vm.createContext(ctx); vm.runInContext(source, ctx);
  engine.normalizeBossState(ctx.state);
  vm.runInContext('refreshCastleItemSelection = () => { castleItemSelectionModel(); };', ctx);
  ctx.item = type => ctx.state.players[0].hand.find(c=>c.castleItem?.type===type).id;
  ctx.listeners = listeners;
  return ctx;
}

test('item presentation toggles, switches and registers cancellation listeners only once', () => {
  const h=harness(), before=JSON.stringify(h.state);
  for(let i=0;i<10;i++){
    h.selectCastleItem(h.item('explosive')); assert.equal(h.castleItemSelectionModel().cardId,h.item('explosive'));
    h.selectCastleItem(h.item('dagger')); assert.equal(h.castleItemSelectionModel().cardId,h.item('dagger'));
    h.selectCastleItem(h.item('dagger')); assert.equal(h.castleItemSelectionModel(),null);
  }
  assert.equal(h.listeners.length,2);assert.equal(JSON.stringify(h.state),before);
  h.selectCastleItem(h.item('relic'));h.listeners.find(l=>l.type==='keydown').fn({key:'Escape'});
  assert.equal(h.castleItemSelectionModel(),null);
  h.selectCastleItem(h.item('relic'));h.listeners.find(l=>l.type==='click').fn({target:{closest:()=>null}});
  assert.equal(h.castleItemSelectionModel(),null);
});

test('all five item UI applications preserve the canonical engine result and undo snapshot', async () => {
  for(const type of Object.keys(ITEM_DEFINITIONS)){
    const h=harness(), id=h.item(type), before=structuredClone(h.state), expected=structuredClone(h.state);
    engine.useCastleItem(expected,0,id,'bela');h.selectCastleItem(id);await h.applySelectedCastleItem('bela');
    const mechanics=s=>JSON.parse(JSON.stringify({boss:s.boss,players:s.players,discard:s.discard},(key,value)=>key==='at'?undefined:value));
    assert.deepEqual(mechanics(h.state),mechanics(expected),type);
    assert.deepEqual(h.undo,before);assert.equal(h.commits,1);assert.equal(h.castleItemSelectionModel(),null);
  }
});

test('dead/invalid daughter and duplicate attempts cannot consume another physical card', async () => {
  const h=harness(), id=h.item('explosive');h.state.boss.combatEntities[0].hp=0;
  h.selectCastleItem(id);assert.equal(h.castleItemSelectionModel().statuses.bela.allowed,false);
  await h.applySelectedCastleItem('bela');assert.equal(h.state.boss.castleItems[id].consumed,false);assert.equal(h.commits,0);
  h.selectCastleItem(id);await Promise.all([h.applySelectedCastleItem('cassandra'),h.applySelectedCastleItem('cassandra')]);
  assert.equal(h.state.boss.combatEntities[1].sacrificedCards.length,1);assert.equal(h.commits,1);
});

test('selection clears on turn, daughter death, undo, session, finish and pause changes', () => {
  for(const mutate of [h=>h.state.turnNumber++,h=>h.state.boss.combatEntities[0].hp=0,
    h=>h.state.lastAction={type:'undoMove',id:'undo'},h=>h.window.gameSessionId++,h=>h.state.matchStartedAt++,
    h=>h.state.finished=true,h=>h.state.pause={paused:true},h=>h.state.boss.result='lost']){
    const h=harness();h.selectCastleItem(h.item('relic'));mutate(h);assert.equal(h.castleItemSelectionModel(),null);
  }
});

test('canonical draw, last-card and discarded-card restrictions are explained, not bypassed', () => {
  for(const [mutate,code] of [[h=>h.state.hasDrawnThisTurn=false,'draw'],
    [h=>h.state.players[0].hand=[h.state.players[0].hand.find(c=>c.id===h.item('relic'))],'last_card'],
    [h=>h.state.pickedDiscardCardId=h.item('relic'),'discard_pickup']]){
    const h=harness(),id=h.item('relic');mutate(h);const status=h.getCastleItemUseStatus(h.state,0,id,'bela');
    assert.equal(status.code,code);h.selectCastleItem(id);assert.equal(h.castleItemSelectionModel(),null);
    assert.equal(h.state.boss.castleItems[id].consumed,false);
  }
});

test('stale target click after a state change cannot apply or commit an item', async () => {
  const h=harness(),id=h.item('dagger');h.selectCastleItem(id);h.state.currentPlayer=1;h.state.turnNumber++;
  await h.applySelectedCastleItem('bela');assert.equal(h.commits,0);assert.equal(h.state.boss.castleItems[id].consumed,false);
});
