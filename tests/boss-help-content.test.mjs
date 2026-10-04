import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBossAbilityHelp, buildBossActionPresentation } from '../js/boss/boss-presentation.js';

function state(bossId, abilityId, payload = {}, { name = abilityId, description = 'DESCRICAO OFICIAL LONGA QUE NAO DEVE SER COPIADA', phase = 2, players = null } = {}) {
  return {
    players: players || [
      { id: 0, name: 'Biel', teamId: 0, hand: [] },
      { id: 1, name: 'BOT Luana', teamId: 0, hand: [] },
    ],
    boss: {
      id: bossId,
      phase,
      danger: 0,
      pendingChoices: [],
      currentIntent: { abilityId, name, description, announcedPhase: phase, payload },
    },
  };
}

test('ajuda usa explicacao editorial e nao duplica a descricao oficial', () => {
  const game = state('dimitrescu', 'crimson_clot', { amount: 180 }, { name: 'Coágulo Carmesim' });
  const help = buildBossAbilityHelp(game);
  assert.ok(help);
  assert.equal(help.title, 'Coágulo Carmesim');
  assert.doesNotMatch(help.text, /DESCRICAO OFICIAL LONGA/);
  assert.match(help.text, /dano antes de Lady/i);
  assert.match(help.text, /metade da proteção restante vira cura/i);
});

test('ajuda detalhada cobre também regras curtas que escondem consequência importante', () => {
  assert.match(buildBossAbilityHelp(state('dimitrescu', 'crimson_brand', {}))?.text || '', /cada marca é resolvida separadamente/i);
  assert.match(buildBossAbilityHelp(state('banker', 'credit_block', {}))?.text || '', /ninguém pode recolher o Lixo/i);
  assert.match(buildBossAbilityHelp(state('matriarca_esmeralda', 'restorative_dew', {}))?.text || '', /cura prevista/i);
});

test('Vigilancia explica escopo sem poluir a mensagem principal', () => {
  const game = state('nehelenia', 'hawk_watch', { targetPlayerId: 0, meldIndex: 2 }, { name: 'Vigilância' });
  const action = buildBossActionPresentation(game);
  const help = buildBossAbilityHelp(game);
  assert.equal(action.instruction, 'Biel: não alimente o Jogo 3.');
  assert.equal(action.consequence, 'Só o alvo é bloqueado');
  assert.ok(help);
  assert.match(help.text, /somente para Biel/i);
  assert.match(help.text, /durante esse turno/i);
});

test('Presa Marcada mostra ordem imediata e deixa persistencia para a ajuda', () => {
  const game = state('nehelenia', 'tiger_prey', { targetPlayerId: 1, meldIndex: 0 }, { name: 'Presa Marcada' });
  const action = buildBossActionPresentation(game);
  const help = buildBossAbilityHelp(game);
  assert.equal(action.instruction, 'BOT Luana: alimente primeiro o Jogo 1.');
  assert.match(action.consequence, /outros jogos bloqueados/i);
  assert.match(help.text, /parceiro continua livre/i);
  assert.match(help.text, /atravessa rodadas/i);
});

test('Controle Absoluto traduz Dominado para o que importa no turno', () => {
  const game = state('dominadora', 'absolute_control', { targetPlayerId: 0 }, { name: 'Controle Absoluto', phase: 3 });
  const action = buildBossActionPresentation(game);
  const help = buildBossAbilityHelp(game);
  assert.equal(action.instruction, 'Biel: Dominado por 1 turno.');
  assert.equal(action.consequence, '+5 Dominação');
  assert.match(help.text, /comprar do Monte/i);
  assert.match(help.text, /alimentar jogos existentes/i);
});

test('Marca Carmesim fica curta na mesa e detalhada na ajuda', () => {
  const game = state('dimitrescu', 'crimson_brand', { marks: [] }, { name: 'Marca Carmesim', phase: 1 });
  const action = buildBossActionPresentation(game);
  assert.equal(action.instruction, 'Use cada carta marcada em um jogo.');
  assert.match(buildBossAbilityHelp(game)?.text || '', /Cada cooperador recebe uma carta marcada/i);
});

test('Cofre recebe ajuda porque o termo tem regra propria', () => {
  const game = state('banker', 'fixed_interest', { holderPlayerId: 0, fullDebt: 12, guaranteedDebt: 5, interestStep: 2 }, { name: 'Juros Fixos', phase: 2 });
  const action = buildBossActionPresentation(game);
  const help = buildBossAbilityHelp(game);
  assert.equal(action.instruction, 'Biel: escolha Integral ou Cofre.');
  assert.match(help.text, /prende 1 carta/i);
  assert.match(help.text, /substitui a compra normal/i);
  assert.match(help.text, /obrigatório/i);
});
