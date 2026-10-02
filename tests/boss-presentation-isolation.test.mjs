import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildBossCompactAction,
  buildBossPendingChoicePresentation,
  buildBossPresentationHelp,
  getBossActionCategory,
  getBossFinalDangerPresentation,
  getBossPresentationAdapter,
  getBossPresentationSpeech,
  getBossResultCategory,
  isBossPresentationFeminine,
} from '../js/boss/presentation/boss-presentation-registry.js';

const presentation = fs.readFileSync(new URL('../js/boss/boss-presentation.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

const bosses = ['banker', 'dominadora', 'matriarca_esmeralda', 'dimitrescu', 'nehelenia'];

test('registry de apresentacao possui adaptador para os cinco chefes', () => {
  for (const id of bosses) assert.ok(getBossPresentationAdapter(id), `${id} deve possuir adaptador`);
  assert.equal(getBossPresentationAdapter('inexistente'), null);
  assert.equal(isBossPresentationFeminine('banker'), false);
  for (const id of bosses.filter((entry) => entry !== 'banker')) assert.equal(isBossPresentationFeminine(id), true);
});

test('falas permanecem equivalentes e Coleira singular continua especial', () => {
  assert.equal(getBossPresentationSpeech('banker', 'fixed_interest'), 'O prazo acabou. Agora paguem os juros.');
  assert.equal(getBossPresentationSpeech('dominadora', 'collar', { collarCards: ['A♠', 'K♠'] }), 'Duas das suas opcoes agora me pertencem.');
  assert.equal(getBossPresentationSpeech('dominadora', 'collar', { collarCards: ['A♠'] }), 'Uma das suas opcoes agora me pertence.');
  assert.equal(getBossPresentationSpeech('matriarca_esmeralda', 'living_seed'), 'Uma semente basta para tomar toda a sua mao.');
  assert.equal(getBossPresentationSpeech('dimitrescu', 'crimson_brand'), 'Vou deixar a minha marca em cada uma de vocês.');
  assert.equal(getBossPresentationSpeech('nehelenia', 'hawk_watch'), "Hawk's Eye fechou os olhos de vocês para um caminho.");
});

test('categorias de acao preservam a classificacao anterior por chefe', () => {
  const expected = {
    banker: {
      maintenance_fee: 'Tarifa ativa nesta rodada', credit_block: 'Restricao ativa agora', suit_audit: 'Objetivo da rodada',
      pledge: 'Restricao ativa agora', credit_limit: 'Cobranca variavel ativa', discard_surcharge: 'Cobranca preparada', fixed_interest: 'Efeito no fim da rodada',
    },
    dominadora: {
      collar: 'Restricao ativa agora', forced_choice: 'Escolha imediata', exposure: 'Restricao ativa agora', hands_tied: 'Restricao ativa agora',
      possession: 'Objetivo da rodada', break_will: 'Escolha preparada', final_order: 'Escolha preparada', iron_etiquette: 'Objetivo da rodada', interdict: 'Restricao ativa agora',
    },
    matriarca_esmeralda: { living_seed: 'Ameaca natural ativa', royal_bloom: 'Ameaca natural ativa', emerald_cocoon: 'Efeito natural ativo', spring_crown: 'Efeito natural ativo' },
    dimitrescu: { bela_hunt: 'Objetivo da rodada', blood_tithe: 'Objetivo da rodada', crimson_clot: 'Efeito natural ativo', castle_lockdown: 'Restricao ativa agora', red_wine: 'Efeito no fim da rodada' },
    nehelenia: { false_image: 'Escolha preparada', mirrored_meld: 'Objetivo da rodada', hawk_watch: 'Restricao ativa agora', fish_inverted: 'Restricao ativa agora' },
  };
  for (const [bossId, abilities] of Object.entries(expected)) {
    for (const [abilityId, category] of Object.entries(abilities)) assert.equal(getBossActionCategory(bossId, abilityId), category, `${bossId}/${abilityId}`);
  }
});

test('categorias de resultado permanecem disponiveis sem tabela global compartilhada', () => {
  assert.equal(getBossResultCategory('fixed_interest'), 'Cobranca automatica');
  assert.equal(getBossResultCategory('possession'), 'Objetivo resolvido');
  assert.equal(getBossResultCategory('emerald_cocoon'), 'Protecao encerrada');
  assert.equal(getBossResultCategory('crimson_brand'), 'Marcas resolvidas');
  assert.equal(getBossResultCategory('hawk_watch'), 'Vigilância encerrada');
  assert.equal(getBossResultCategory('inexistente'), '');
});

test('resumo final do recurso fica isolado por chefe', () => {
  const common = { boss: { danger: 37, maxDanger: 100 }, players: [] };
  assert.deepEqual(getBossFinalDangerPresentation('banker', common), { label: 'Dívida final', value: '37 / 100' });
  assert.deepEqual(getBossFinalDangerPresentation('dimitrescu', common), { label: 'Sede final', value: '37 / 100' });
  assert.deepEqual(getBossFinalDangerPresentation('matriarca_esmeralda', { boss: { danger: 3, maxDanger: 5 } }), { label: 'Florescimento final', value: '3 / 5' });
  assert.deepEqual(getBossFinalDangerPresentation('nehelenia', { boss: { danger: 4, maxDanger: 5 } }), { label: 'Espelhos roubados', value: '4 / 5' });
  const dominatrix = { boss: { chainsByPlayer: { 0: 2, 1: 3 } }, players: [{ id: 0, name: 'Biel' }, { id: 1, name: 'BOT' }] };
  assert.deepEqual(getBossFinalDangerPresentation('dominadora', dominatrix), { label: 'Chicotes finais', value: 'Biel: 2/4 · BOT: 3/4' });
});

test('boss-presentation deixa de guardar tabelas e cadeia final dos cinco chefes', () => {
  for (const token of ['BANKER_SPEECHES', 'DOMINATRIX_SPEECHES', 'DIMITRESCU_SPEECHES', 'NEHELENIA_SPEECHES', 'MATRIARCH_SPEECHES', 'RESULT_CATEGORY_BY_ABILITY']) {
    assert.equal(presentation.includes(token), false, `${token} nao deve voltar ao arquivo compartilhado`);
  }
  assert.equal(presentation.includes("boss?.id === 'dominadora' ? 'Chicotes finais'"), false);
  assert.ok(presentation.includes('getBossPresentationSpeech'));
  assert.ok(presentation.includes('getBossFinalDangerPresentation'));
});

test('modulos de apresentacao ficam no precache offline', () => {
  for (const file of ['boss-presentation-registry.js', 'banker.js', 'dominatrix.js', 'matriarch.js', 'dimitrescu.js', 'nehelenia.js']) {
    assert.ok(sw.includes(`./js/boss/presentation/${file}`), `${file} deve estar no service worker`);
  }
});


test('HUD compacto e ajuda ficam roteados pelo adaptador do chefe', () => {
  const helpers = {
    playerName: (state, id) => state.players?.find((player) => player.id === id)?.name || '',
    cardLabelAnywhere: () => 'Q♥',
    objectiveProgress: (current, required) => `${current}/${required}`,
    groupedObjectiveProgress: () => '0/2',
    getRestorativeDewHealing: () => 100,
  };
  const bankerState = { boss: { id: 'banker', phase: 1 }, players: [{ id: 0, name: 'Biel', hand: [] }] };
  assert.match(buildBossCompactAction('banker', { gameState: bankerState, intent: { abilityId: 'credit_block', payload: {} }, helpers }).instruction, /Lixo bloqueado/);
  const matState = { boss: { id: 'matriarca_esmeralda', phase: 1, natureThreats: [] }, players: [{ id: 0, name: 'Biel', hand: [] }] };
  assert.match(buildBossCompactAction('matriarca_esmeralda', { gameState: matState, intent: { id: 'm1', abilityId: 'hungry_root', payload: { meldIndex: 0 } }, helpers }).instruction, /Jogo 1/);
  const nehState = { boss: { id: 'nehelenia', danger: 1, maxDanger: 5 }, players: [{ id: 0, name: 'Biel', hand: [] }] };
  assert.match(buildBossPresentationHelp('nehelenia', { gameState: nehState, intent: { abilityId: 'hawk_watch', payload: { targetPlayerId: 0, meldIndex: 1 } }, helpers }), /Vigilância/);
});

test('escolhas pendentes ficam no modulo do chefe correto', () => {
  const helpers = {
    playerName: (state, id) => state.players?.find((player) => player.id === id)?.name || '',
    cardLabelAnywhere: () => 'A♠',
    detailFields: (entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`),
  };
  const players = [{ id: 0, name: 'Biel', hand: [] }];
  assert.equal(buildBossPendingChoicePresentation('banker', { gameState: { players }, choice: { type: 'fixed_interest_payment', playerId: 0, amount: 12, collateralAmount: 5 }, helpers }).name, 'Pagamento dos Juros Fixos');
  assert.equal(buildBossPendingChoicePresentation('dominadora', { gameState: { players }, choice: { type: 'final_order_lock', playerId: 0 }, helpers }).name, 'Ordem Final');
  assert.equal(buildBossPendingChoicePresentation('nehelenia', { gameState: { players }, choice: { type: 'discard_mirror', playerId: 0, options: ['a', 'b'], optionLabels: { a: 'I', b: 'II' } }, helpers }).name, 'Espelho do Lixo');
  assert.equal(buildBossPendingChoicePresentation('dimitrescu', { gameState: { players }, choice: { type: 'discard_mirror', playerId: 0 }, helpers }), null);
});

test('arquivo compartilhado nao volta a conhecer habilidades ou IDs especificos dos chefes', () => {
  for (const token of [
    "'banker'", "'dominadora'", "'matriarca_esmeralda'", "'dimitrescu'", "'nehelenia'",
    "case 'fixed_interest'", "case 'collar'", "case 'living_seed'", "case 'bela_hunt'", "case 'false_image'",
    'BOSS_HELP_ABILITY_IDS', 'final_order_mark', 'fixed_interest_payment', 'eternal_nightmare',
  ]) assert.equal(presentation.includes(token), false, `${token} deve permanecer fora do coordenador compartilhado`);
  assert.ok(presentation.includes('buildBossCompactAction'));
  assert.ok(presentation.includes('buildBossPendingChoicePresentation'));
  assert.ok(presentation.includes('buildBossStatusPresentation'));
});
