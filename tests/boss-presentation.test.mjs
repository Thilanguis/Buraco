import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildBossActionPresentation, buildBossFinalPresentation, buildBossResultPresentation } from '../js/boss/boss-presentation.js';

const baseState = (id = 'banker') => ({
  players: [
    { id: 0, name: 'Biel', hand: [{ id: 'c1', rank: 'A', suit: '♠' }, { id: 'c2', rank: '7', suit: '♦' }] },
    { id: 1, name: 'BOT Luana', hand: [{ id: 'c3', rank: 'Q', suit: '♥' }] },
  ],
  boss: { id, phase: 2, roundNumber: 3, chainsByPlayer: { 0: 2, 1: 1 }, currentIntent: null, lastEvent: null },
});

test('resultado recente nunca usa currentIntent e habilidades diferentes nao se misturam', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'credit_block', name: 'Bloqueio de Credito', description: 'NAO PODE VAZAR', payload: {} };
  state.boss.lastEvent = {
    type: 'bossAbility',
    abilityId: 'fixed_interest',
    name: 'Juros Fixos',
    outcome: 'Juros aplicados: +6 de Divida.',
    dangerDelta: 6,
    presentation: { details: ['Cobranca inevitavel'] },
  };
  const result = buildBossResultPresentation(state.boss.lastEvent);
  assert.equal(result.name, 'Juros Fixos');
  assert.match(result.description, /\+6/);
  assert.doesNotMatch(JSON.stringify(result), /Bloqueio|NAO PODE VAZAR/);
});

test('primeira habilidade possui dialogo tematico e objetivo durante ability', () => {
  const state = baseState('dominadora');
  state.boss.bossFlow = { stage: 'ability' };
  state.boss.currentIntent = { abilityId: 'collar', name: 'Coleira', description: 'A carta fica presa.', payload: { targetPlayerId: 0, cardId: 'c1' } };
  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Coleira');
  assert.ok(action.speech);
  assert.match(action.instruction, /Biel|carta|turno/i);
});

test('balao de habilidade ignora lastEvent e resultado anterior nao repete fala tematica', () => {
  const state = baseState();
  state.boss.bossFlow = { stage: 'ability' };
  state.boss.currentIntent = { abilityId: 'fixed_interest', name: 'Juros Fixos', description: 'Nova cobranca.', payload: { amount: 6 } };
  state.boss.lastEvent = { type: 'bossAbility', abilityId: 'credit_block', name: 'Bloqueio antigo', outcome: 'Bloqueio encerrado.', presentation: { speech: 'FALA ANTIGA', details: [] } };
  const action = buildBossActionPresentation(state);
  const result = buildBossResultPresentation(state.boss.lastEvent);
  assert.doesNotMatch(JSON.stringify(action), /FALA ANTIGA|Bloqueio antigo/);
  assert.equal(result.speech, '');
});

test('acao atual nunca usa lastEvent', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'credit_block', name: 'Bloqueio de Credito', description: 'Lixo bloqueado.', payload: {} };
  state.boss.lastEvent = { type: 'bossAbility', abilityId: 'fixed_interest', name: 'JUROS ANTIGOS', outcome: 'RESULTADO ANTIGO' };
  const action = buildBossActionPresentation(state);
  assert.equal(action.name, 'Bloqueio de Credito');
  assert.match(action.details.join(' '), /Lixo bloqueado agora/);
  assert.doesNotMatch(JSON.stringify(action), /JUROS ANTIGOS|RESULTADO ANTIGO/);
});

test('Auditoria mostra naipe, valores e progresso', () => {
  const state = baseState();
  state.boss.phase = 3;
  state.boss.currentIntent = { abilityId: 'suit_audit', name: 'Auditoria de Naipe', description: 'Auditoria ativa.', payload: { suitLabel: 'Copas', progress: 2, required: 4 } };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Copas/);
  assert.match(text, /2\/4/);
  assert.match(text, /-5/);
  assert.match(text, /\+12/);
});

test('Juros Compostos mostra cartas e estimativa calculada agora', () => {
  const state = baseState();
  state.boss.currentIntent = { abilityId: 'compound_interest', name: 'Juros Compostos', description: 'Variavel.', payload: {} };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Cartas nas maos agora: 3/);
  assert.match(text, /Estimativa atual: \+4/);
});

test('efeitos da Dominadora mostram alvo e consequencia', () => {
  const state = baseState('dominadora');
  state.boss.currentIntent = { abilityId: 'collar', name: 'Coleira', description: 'Restricao.', payload: { targetPlayerId: 0, cardId: 'c1' } };
  const text = buildBossActionPresentation(state).details.join(' | ');
  assert.match(text, /Alvo: Biel/);
  assert.match(text, /Carta: A♠/);
  assert.match(text, /nao pode jogar nem descartar/i);
  assert.match(text, /fim do turno/);
  assert.doesNotMatch(text, /Jogo alvo|Correntes|nao se aplica/i);
  const compact = buildBossActionPresentation(state);
  assert.doesNotMatch([compact.instruction, compact.progress, compact.consequence].join(' '), /Nao se aplica/i);
});

test('Escolha Forcada e imediata, mas as demais escolhas continuam preparadas', () => {
  const state = baseState('dominadora');
  state.boss.pendingChoices = [];
  state.boss.currentIntent = { abilityId: 'forced_choice', name: 'Escolha Forcada', payload: { targetPlayerId: 0 } };
  const immediate = buildBossActionPresentation(state);
  assert.equal(immediate.category, 'Escolha imediata');
  assert.match(immediate.instruction, /Biel devera escolher agora/i);

  state.boss.currentIntent = { abilityId: 'break_will', name: 'Quebra de Vontade', payload: { targetPlayerId: 0 } };
  const prepared = buildBossActionPresentation(state);
  assert.equal(prepared.category, 'Escolha preparada');
  assert.match(prepared.instruction, /Ao final da rodada/i);

  state.boss.currentIntent = null;
  state.boss.pendingChoices = [{ id: 'choice-1', type: 'forced_choice', playerId: 0, options: ['draw2', 'chain'] }];
  const mandatory = buildBossActionPresentation(state);
  assert.equal(mandatory.category, 'Escolha obrigatoria agora');
  assert.match(mandatory.instruction, /Biel precisa decidir/i);
});

test('apresentacao nao mascara carta sem alvo com texto generico', async () => {
  const source = await readFile(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Nenhuma carta/);
  assert.doesNotMatch(source, /Carta alvo: nao se aplica/i);
});

test('fontes dos apresentadores mantem a separacao estrutural', async () => {
  const source = await readFile(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
  const actionSource = source.match(/export function buildBossActionPresentation[\s\S]*?\n}\n\nexport function buildBossResultPresentation/)?.[0] || '';
  const resultSource = source.match(/export function buildBossResultPresentation[\s\S]*$/)?.[0] || '';
  assert.doesNotMatch(actionSource, /lastEvent/);
  assert.doesNotMatch(resultSource, /currentIntent/);
});

test('tela final explicita vitoria ou derrota e usa a fala do chefe correto', () => {
  const victory = baseState('banker');
  victory.teams = [{ id: 0, melds: [] }];
  Object.assign(victory.boss, { hp: 0, maxHp: 2200, maxDanger: 100, danger: 12, stats: { totalDamage: 2200, canastrasFormed: 4, finalStrike: 600 }, eventLog: [], result: { victory: true, detail: 'Ataque final concluido.' } });
  const win = buildBossFinalPresentation(victory);
  assert.equal(win.outcome, 'VITÓRIA');
  assert.equal(win.speech, 'Isto não estava previsto nos meus cálculos.');

  const defeat = baseState('dominadora');
  defeat.teams = [{ id: 0, melds: [] }];
  Object.assign(defeat.boss, { hp: 900, maxHp: 1800, stats: { totalDamage: 900, canastrasFormed: 2, finalStrike: 0 }, eventLog: [], result: { victory: false, detail: 'A equipe foi dominada.' } });
  const loss = buildBossFinalPresentation(defeat);
  assert.equal(loss.outcome, 'DERROTA');
  assert.equal(loss.speech, 'No fim, vocês fizeram exatamente o que eu mandei.');
});
