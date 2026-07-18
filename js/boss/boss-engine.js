import { getBossDefinition, getBossDefinitionForMode } from './boss-registry.js';
import { BOSS_DAMAGE_BY_KIND, DEBT_REDUCTION_BY_KIND } from './bosses/banker.js';
import { buildBossActionPresentation } from './boss-presentation.js';
import { getRestorativeDewHealing } from './boss-balance.js';

export { getRestorativeDewHealing } from './boss-balance.js';

const SUITS = Object.freeze([
  { value: '♠', label: 'Espadas' },
  { value: '♦', label: 'Ouros' },
  { value: '♣', label: 'Paus' },
  { value: '♥', label: 'Copas' },
]);
const BOSS_RANKS_HIGH = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
const BOSS_RANKS_LOW = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

export const BOSS_MODE_BANKER = 'boss_banker';
export const BOSS_MODE_DOMINATRIX = 'boss_dominadora';
export const BOSS_MODE_MATRIARCH = 'boss_matriarca';

export function isBossMode(stateOrMode) {
  const mode = typeof stateOrMode === 'string' ? stateOrMode : stateOrMode?.mode;
  return !!getBossDefinitionForMode(mode);
}

export function isDominatrixMode(stateOrMode) {
  const mode = typeof stateOrMode === 'string' ? stateOrMode : stateOrMode?.mode;
  return mode === BOSS_MODE_DOMINATRIX;
}

export function isMatriarchMode(stateOrMode) {
  const mode = typeof stateOrMode === 'string' ? stateOrMode : stateOrMode?.mode;
  return mode === BOSS_MODE_MATRIARCH;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const MELD_TIER = Object.freeze({ simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 });
const BANKER_CONTRACTS = Object.freeze({
  early: Object.freeze([
    Object.freeze({ tier: 'mild', fullDebt: 5, guaranteedDebt: 2 }),
    Object.freeze({ tier: 'standard', fullDebt: 6, guaranteedDebt: 3 }),
    Object.freeze({ tier: 'severe', fullDebt: 7, guaranteedDebt: 4 }),
  ]),
  late: Object.freeze([
    Object.freeze({ tier: 'mild', fullDebt: 7, guaranteedDebt: 4 }),
    Object.freeze({ tier: 'standard', fullDebt: 8, guaranteedDebt: 5 }),
    Object.freeze({ tier: 'severe', fullDebt: 9, guaranteedDebt: 6 }),
  ]),
});

function weightedContract(gameState) {
  const roll = seededUnit(bossSeed(gameState, 13));
  const index = roll < 0.25 ? 0 : roll < 0.75 ? 1 : 2;
  const contract = (gameState.boss.phase === 3 ? BANKER_CONTRACTS.late : BANKER_CONTRACTS.early)[index];
  return {
    contractTier: contract.tier,
    fullDebt: contract.fullDebt,
    guaranteedDebt: contract.guaranteedDebt,
    amount: contract.fullDebt,
    collateralAmount: contract.guaranteedDebt,
    rollEventId: `contract_${gameState.boss.roundNumber}_${gameState.boss.actionSequence + 1}`,
  };
}

function bossCardDamage(card) {
  if (!card) return 0;
  if (card.joker || card.rank === 'JOKER') return 20;
  const rank = String(card.rank);
  if (rank === 'A' || rank === '2') return 15;
  if (['8', '9', '10', 'J', 'Q', 'K'].includes(rank)) return 10;
  return ['3', '4', '5', '6', '7'].includes(rank) ? 5 : 0;
}

function phaseForProgress(gameState) {
  const deadTaken = gameState.deadChunksTaken?.[0] || 0;
  const stockCount = Array.isArray(gameState.stock) ? gameState.stock.length : Number.POSITIVE_INFINITY;
  const boss = gameState.boss;
  const hpRatio = boss?.maxHp > 0 ? boss.hp / boss.maxHp : 1;
  if (deadTaken >= 2 || stockCount <= 18 || hpRatio <= 0.35) return 3;
  if (deadTaken >= 1 || stockCount <= 40 || hpRatio <= 0.7) return 2;
  return 1;
}

function seededUnit(seed) {
  let value = Number(seed) || 1;
  value = (value ^ 0x6d2b79f5) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function bossSeed(gameState, salt = 0) {
  const boss = gameState.boss;
  return ((boss.seed || 1) + boss.actionSequence * 7919 + boss.roundNumber * 104729 + salt) >>> 0;
}

function chooseSeeded(items, gameState, salt) {
  if (!items.length) return null;
  return items[Math.floor(seededUnit(bossSeed(gameState, salt)) * items.length) % items.length];
}

function choosePlayer(gameState, salt, predicate = () => true) {
  return chooseSeeded((gameState.players || []).filter(predicate), gameState, salt);
}

function chooseCard(player, gameState, salt) {
  return chooseSeeded((player?.hand || []).filter((card) => card?.id), gameState, salt);
}

function chooseCards(player, gameState, salt, count) {
  const available = (player?.hand || []).filter((card) => card?.id);
  const selected = [];
  while (available.length && selected.length < count) {
    const card = chooseSeeded(available, gameState, salt + selected.length * 17);
    selected.push(card);
    available.splice(available.findIndex((entry) => entry.id === card.id), 1);
  }
  return selected;
}

function legalDiscardCards(gameState, player) {
  return (player?.hand || []).filter((card) => card?.id
    && card.id !== gameState.pickedDiscardCardId
    && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'discard'));
}

function discardSuitOrderCandidates(gameState, player) {
  const legal = legalDiscardCards(gameState, player);
  return SUITS.filter((suit) => {
    const matching = legal.filter((card) => !card.joker && card.suit === suit.value);
    const alternatives = legal.filter((card) => card.joker || card.suit !== suit.value);
    return matching.length >= 2 && alternatives.length >= 1;
  });
}

function buildDominatrixOrder(gameState, targetPlayer, salt = 0) {
  if (!targetPlayer) return null;
  const melds = gameState.teams?.[targetPlayer.teamId]?.melds || [];
  const feedable = melds.map((meld, meldIndex) => ({ meld, meldIndex }))
    .filter(({ meld }) => (targetPlayer.hand || []).some((card) => card?.id
      && !isCardBlockedByBossState(gameState.boss, targetPlayer.id, card.id, 'play')
      && isValidBossSequence([...(meld || []), card])
      && hasLegalDiscard(gameState, targetPlayer, [card.id])));
  const evolvable = melds.map((meld, meldIndex) => ({
    meld,
    meldIndex,
    evolutionOptions: bossMeldEvolutionOptions(gameState, targetPlayer, meldIndex),
  })).filter(({ evolutionOptions }) => evolutionOptions.length > 0);
  const suits = discardSuitOrderCandidates(gameState, targetPlayer);
  const candidates = [];
  if (feedable.length > 1) {
    const selected = chooseSeeded(feedable, gameState, 301 + salt);
    const label = `alimente o jogo ${selected.meldIndex + 1} antes de outro jogo`;
    candidates.push({ type: 'feed_specific_meld', meldIndex: selected.meldIndex, meldId: resolveBossMeldId(gameState, targetPlayer.teamId, selected.meldIndex, true), label, description: label });
  }
  if ((targetPlayer.hand || []).length >= 3) candidates.push({ type: 'no_new_meld', label: 'nao crie um jogo novo no proximo turno', description: 'não crie um jogo novo no próximo turno' });
  if (evolvable.length) {
    const selected = chooseSeeded(evolvable, gameState, 307 + salt);
    const label = `tente evoluir o jogo ${selected.meldIndex + 1}`;
    candidates.push({
      type: 'evolve_specific_meld',
      meldIndex: selected.meldIndex,
      meldId: resolveBossMeldId(gameState, targetPlayer.teamId, selected.meldIndex, true),
      eligibleCardIds: [...new Set(selected.evolutionOptions.flatMap((option) => option.cardIds))],
      label,
      description: label,
    });
  }
  if ((targetPlayer.hand || []).length >= 6) {
    const limit = Math.max(3, targetPlayer.hand.length - 2);
    const label = `termine o turno com no máximo ${limit} cartas`;
    candidates.push({ type: 'reduce_hand', handLimit: limit, label, description: label });
  }
  if (suits.length) {
    const selected = chooseSeeded(suits, gameState, 311 + salt);
    const label = `descarte uma carta de ${selected.label}`;
    candidates.push({ type: 'discard_suit', suit: selected.value, suitLabel: selected.label, label, description: label });
  }
  return chooseSeeded(candidates, gameState, 313 + salt);
}

function playerHasCard(gameState, playerId, cardId) {
  if (playerId == null || !cardId) return false;
  return !!gameState.players?.find((player) => player.id === playerId)?.hand?.some((card) => card?.id === cardId);
}

function isBossWildcard(card) {
  if (!card) return false;
  if (card.joker) return true;
  if (card.forceNatural) return false;
  if (card.forceWild) return true;
  return card.rank === '2' || card.rank === 2;
}

export function isValidBossSequence(cards) {
  const clean = (cards || []).filter(Boolean).map((card) => ({ ...card }));
  if (clean.length < 3 || clean.length > 14) return false;

  let wildCards = clean.filter(isBossWildcard);
  if (wildCards.length > 1) {
    const realCards = clean.filter((card) => !card.joker && card.rank !== '2' && card.rank !== 2);
    const suit = realCards[0]?.suit;
    const naturalTwo = clean.find((card) => !card.joker && (card.rank === '2' || card.rank === 2) && card.suit === suit);
    if (naturalTwo) naturalTwo.forceNatural = true;
    wildCards = clean.filter(isBossWildcard);
  }
  if (wildCards.length > 1) return false;

  const nonWild = clean.filter((card) => !isBossWildcard(card));
  if (!nonWild.length || !nonWild.every((card) => card.suit === nonWild[0].suit)) return false;
  const availableWilds = clean.length - nonWild.length;

  const neededFor = (order, acePosition) => {
    const indexes = Object.fromEntries(order.map((rank, index) => [rank, index]));
    const sorted = nonWild.slice().sort((a, b) => indexes[a.rank] - indexes[b.rank]);
    const aceIndex = sorted.findIndex((card) => card.rank === 'A');
    if (aceIndex >= 0 && ((acePosition === 'high' && aceIndex !== sorted.length - 1) || (acePosition === 'low' && aceIndex !== 0))) return null;
    let needed = 0;
    for (let index = 1; index < sorted.length; index += 1) {
      const difference = indexes[sorted[index].rank] - indexes[sorted[index - 1].rank];
      if (!Number.isFinite(difference) || difference <= 0) return null;
      needed += Math.max(0, difference - 1);
    }
    return needed;
  };

  const highNeeded = neededFor(BOSS_RANKS_HIGH, 'high');
  const lowNeeded = neededFor(BOSS_RANKS_LOW, 'low');
  if ((highNeeded != null && highNeeded <= availableWilds) || (lowNeeded != null && lowNeeded <= availableWilds)) return true;

  const aceCount = nonWild.filter((card) => card.rank === 'A').length;
  if (aceCount < 2 || !nonWild.some((card) => card.rank === 'K')) return false;
  const withoutLastAce = nonWild.slice();
  withoutLastAce.splice(withoutLastAce.map((card) => card.rank).lastIndexOf('A'), 1);
  const lowIndexes = Object.fromEntries(BOSS_RANKS_LOW.map((rank, index) => [rank, index]));
  const sorted = withoutLastAce.sort((a, b) => lowIndexes[a.rank] - lowIndexes[b.rank]);
  if (sorted[0]?.rank !== 'A') return false;
  let needed = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const difference = lowIndexes[sorted[index].rank] - lowIndexes[sorted[index - 1].rank];
    if (!Number.isFinite(difference) || difference <= 0) return false;
    needed += Math.max(0, difference - 1);
  }
  return needed <= availableWilds;
}

function isCompleteAceToAce(meld) {
  const clean = (meld || []).filter(Boolean);
  if (clean.length < 14) return false;
  const ranks = clean.filter((card) => !card.joker).map((card) => String(card.rank));
  return ranks.filter((rank) => rank === 'A').length >= 2
    && ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].every((rank) => ranks.includes(rank));
}

function meldCanReceiveAnyCard(meld) {
  if (!Array.isArray(meld) || !meld.length || isCompleteAceToAce(meld) || meld.length >= 14) return false;
  const realSuit = meld.find((card) => card && !card.joker && card.rank !== '2' && card.rank !== 2)?.suit || SUITS[0].value;
  const candidates = BOSS_RANKS_LOW.map((rank) => ({ rank, suit: realSuit }));
  candidates.push({ joker: true, rank: 'JOKER', suit: 'JOKER' });
  return candidates.some((card) => isValidBossSequence([...meld, card]));
}

function isNaturalBossSequence(meld) {
  const cards = (meld || []).filter(Boolean);
  if (!cards.length || cards.some((card) => card.joker || card.forceWild)) return false;
  if (!cards.every((card) => card.suit === cards[0].suit)) return false;

  const ranks = cards.map((card) => String(card.rank));
  if (new Set(ranks).size !== ranks.length) return false;

  return [BOSS_RANKS_HIGH, BOSS_RANKS_LOW].some((order) => {
    const indexes = ranks.map((rank) => order.indexOf(rank)).sort((a, b) => a - b);
    if (indexes.some((index) => index < 0)) return false;
    return indexes.every((index, position) => position === 0 || index === indexes[position - 1] + 1);
  });
}

function classifyBossMeldKind(meld) {
  const cards = (meld || []).filter(Boolean);
  if (cards.length < 7 || !isValidBossSequence(cards)) return 'simple';
  if (isCompleteAceToAce(cards)) return 'asas';
  if (!isNaturalBossSequence(cards)) return 'suja';
  return cards.length === 13 ? 'real' : 'limpa';
}

function combinationsOfSize(items, size, visit, start = 0, chosen = []) {
  if (chosen.length === size) return visit(chosen);
  const missing = size - chosen.length;
  for (let index = start; index <= items.length - missing; index += 1) {
    chosen.push(items[index]);
    if (combinationsOfSize(items, size, visit, index + 1, chosen) === false) return false;
    chosen.pop();
  }
  return true;
}

function evolutionCandidateCards(gameState, player, meld) {
  const suit = (meld || []).find((card) => card && !isBossWildcard(card))?.suit;
  const seen = new Map();
  return (player?.hand || []).filter((card) => card?.id
    && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'play')
    && (isBossWildcard(card) || !suit || card.suit === suit))
    .filter((card) => {
      const base = isBossWildcard(card) ? 'wild' : `${card.suit}:${card.rank}`;
      const count = seen.get(base) || 0;
      const allowed = base.endsWith(':A') ? 2 : 1;
      seen.set(base, count + 1);
      return count < allowed;
    });
}

function bossMeldEvolutionOptions(gameState, player, meldIndex, limit = 12) {
  const meld = gameState.teams?.[player?.teamId]?.melds?.[meldIndex];
  if (!player || !Array.isArray(meld) || isCompleteAceToAce(meld)) return [];
  const oldKind = classifyBossMeldKind(meld);
  const oldTier = MELD_TIER[oldKind] || 0;
  if (oldKind === 'suja' || oldTier >= 3) return [];
  const targetLengths = oldTier === 0 ? [7, 13, 14] : oldTier === 1 ? [13, 14] : [14];
  const candidates = evolutionCandidateCards(gameState, player, meld);
  const options = [];
  for (const targetLength of targetLengths) {
    const needed = targetLength - meld.length;
    if (needed <= 0 || needed > candidates.length) continue;
    combinationsOfSize(candidates, needed, (combination) => {
      const finalMeld = [...meld, ...combination];
      const newKind = classifyBossMeldKind(finalMeld);
      if ((MELD_TIER[newKind] || 0) <= oldTier) return true;
      if (!hasLegalDiscard(gameState, player, combination.map((card) => card.id))) return true;
      options.push({
        playerId: player.id,
        meldIndex,
        oldKind,
        newKind,
        cardIds: combination.map((card) => card.id),
      });
      return options.length < limit;
    });
    if (options.length >= limit) break;
  }
  return options;
}

export function getBossMeldEvolutionOptions(gameState, playerId, meldIndex) {
  const boss = normalizeBossState(gameState);
  if (!boss) return [];
  const player = (gameState.players || []).find((entry) => entry.id === playerId);
  return bossMeldEvolutionOptions(gameState, player, meldIndex).map((option) => ({ ...option, cardIds: [...option.cardIds] }));
}

function meldEvolutionPlayers(gameState, meldIndex) {
  return (gameState.players || [])
    .filter((player) => bossMeldEvolutionOptions(gameState, player, meldIndex, 1).length > 0)
    .map((player) => player.id);
}

function eligibleMeldIndexes(gameState, { excludePossessed = false } = {}) {
  const boss = gameState.boss;
  const possessed = new Set((boss.possessions || []).map((entry) => entry.meldIndex));
  return (gameState.teams?.[0]?.melds || [])
    .map((meld, index) => ({ meld, index }))
    .filter(({ meld, index }) => meldCanReceiveAnyCard(meld) && (!excludePossessed || !possessed.has(index)))
    .map(({ index }) => index);
}

function possessionDamageForMeld(gameState, meldIndex) {
  const boss = gameState.boss;
  const meld = gameState.teams?.[0]?.melds?.[meldIndex] || [];
  const damagedCardIds = new Set(boss.damagedCardIds || []);
  const individualDamage = meld.reduce((total, card) => (
    card?.id && damagedCardIds.has(card.id) ? total + bossCardDamage(card) : total
  ), 0);
  const meldId = resolveBossMeldId(gameState, 0, meldIndex, false);
  const canastraDamage = Math.max(0, Number(boss.meldProgress?.[meldId || `0:${meldIndex}`]?.damageValue) || 0);
  return individualDamage + canastraDamage;
}

function resolveBossMeldId(gameState, teamId, meldIndex, create = true) {
  const boss = gameState?.boss;
  const meld = gameState?.teams?.[teamId]?.melds?.[meldIndex];
  if (!boss || !Array.isArray(meld)) return null;
  boss.meldIdsByCardId ||= {};
  boss.meldIdsByPosition ||= {};
  const positionKey = `${teamId}:${meldIndex}`;
  let meldId = meld
    .map((card) => card?.id && boss.meldIdsByCardId[card.id])
    .find(Boolean) || boss.meldIdsByPosition[positionKey] || null;
  if (!meldId && create) {
    boss.meldIdSequence = (Number(boss.meldIdSequence) || 0) + 1;
    meldId = `meld_${teamId}_${boss.meldIdSequence}`;
  }
  if (!meldId) return null;
  boss.meldIdsByPosition[positionKey] = meldId;
  meld.forEach((card) => {
    if (card?.id) boss.meldIdsByCardId[card.id] = meldId;
  });
  return meldId;
}

function ensureBossMeldContribution(boss, meldId) {
  if (!boss || !meldId) return null;
  boss.meldContributions ||= {};
  boss.meldContributions[meldId] ||= {
    damageDone: 0,
    bankerDebtRelief: 0,
    dominatrixChainsBroken: 0,
    dominatrixResistanceTier: 0,
    matriarchBloomRemoved: 0,
    matriarchBloomTier: 0,
  };
  return boss.meldContributions[meldId];
}

export function getBossMeldContribution(gameState, teamId, meldIndex) {
  if (!isBossMode(gameState) || !gameState?.boss) return null;
  const meldId = resolveBossMeldId(gameState, teamId, meldIndex, false);
  if (!meldId) return null;
  const contribution = gameState.boss.meldContributions?.[meldId];
  return contribution ? { meldId, ...contribution } : null;
}

function cardCanBePlayedNow(gameState, player, card) {
  if (!player || !card?.id) return false;
  const melds = gameState.teams?.[player.teamId]?.melds || [];
  if (melds.some((meld) => isValidBossSequence([...(meld || []), card]))) return true;
  if ((gameState.boss?.chainsByPlayer?.[player.id] || 0) >= 3) return false;
  const others = (player.hand || []).filter((entry) => entry?.id && entry.id !== card.id);
  for (let first = 0; first < others.length; first += 1) {
    for (let second = first + 1; second < others.length; second += 1) {
      if (isValidBossSequence([card, others[first], others[second]])) return true;
    }
  }
  return false;
}

function cardHasSafeLegalPlay(gameState, player, card) {
  if (!player || !card?.id) return false;
  const melds = gameState.teams?.[player.teamId]?.melds || [];
  if (melds.some((meld) => isValidBossSequence([...(meld || []), card])
    && hasLegalDiscard(gameState, player, [card.id]))) return true;
  if ((gameState.boss?.chainsByPlayer?.[player.id] || 0) >= 3) return false;
  const others = (player.hand || []).filter((entry) => entry?.id && entry.id !== card.id);
  for (let first = 0; first < others.length; first += 1) {
    for (let second = first + 1; second < others.length; second += 1) {
      const cards = [card, others[first], others[second]];
      if (isValidBossSequence(cards) && hasLegalDiscard(gameState, player, cards.map((entry) => entry.id))) return true;
    }
  }
  return false;
}

function isCardBlockedByBossState(boss, playerId, cardId, action = 'play') {
  if (!boss || !cardId) return false;
  if (boss.id === 'matriarca_esmeralda') {
    if (action !== 'discard') return false;
    return activeNatureThreats(boss).some((threat) => (
      threat.targetPlayerId === playerId
      && threat.cardId === cardId
      && ['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type)
    ));
  }
  if (boss.id !== 'dominadora') return false;
  const intent = boss.currentIntent;
  if (intent?.abilityId === 'collar' && intent.payload?.targetPlayerId === playerId) {
    const cardIds = intent.payload?.cardIds || (intent.payload?.cardId ? [intent.payload.cardId] : []);
    if (cardIds.includes(cardId)) return true;
  }
  if (intent?.abilityId === 'double_collar' && intent.payload?.lockedCards?.some((entry) => entry.playerId === playerId && entry.cardId === cardId)) return true;
  if (action === 'discard' && intent?.abilityId === 'exposure' && intent.payload?.targetPlayerId === playerId && intent.payload?.cardId === cardId) return true;
  if (boss.effects.some((effect) => effect.playerId === playerId && effect.cardId === cardId && (effect.id === 'choice_lock' || (action === 'discard' && effect.id === 'choice_exposure')))) return true;
  return false;
}

function hasLegalDiscard(gameState, player, excludedCardIds = [], incomingCards = []) {
  const excluded = new Set(excludedCardIds.filter(Boolean));
  const remaining = [...(player?.hand || []).filter((card) => card?.id && !excluded.has(card.id)), ...incomingCards.filter((card) => card?.id)];
  if (!remaining.length) return true;
  return remaining.some((card) => card.id !== gameState.pickedDiscardCardId && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'discard'));
}

export function validateBossMeldPlay(gameState, playerId, cardsToPlay = [], incomingCards = []) {
  const boss = normalizeBossState(gameState);
  if (!boss) return { allowed: true, message: '' };
  const player = gameState.players?.find((entry) => entry.id === playerId);
  if (!player) return { allowed: false, message: 'Jogador inválido.' };
  const cardIds = cardsToPlay.map((card) => card?.id).filter(Boolean);
  if (hasLegalDiscard(gameState, player, cardIds, incomingCards)) return { allowed: true, message: '' };
  return { allowed: false, message: 'Você precisa conservar uma carta livre para encerrar o turno.' };
}

function canApplyDiscardLock(gameState, player, cardIds) {
  if (!player || !cardIds.length) return false;
  const locked = new Set(cardIds);
  return (player.hand || []).some((card) => card?.id && !locked.has(card.id) && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'discard'));
}

function eligibleExposureCards(gameState, player) {
  return (player?.hand || []).filter((card) => cardCanBePlayedNow(gameState, player, card) && canApplyDiscardLock(gameState, player, [card.id]));
}

const MATRIARCH_THREAT_LIMIT = Object.freeze({ 1: 1, 2: 2, 3: 3 });
const MATRIARCH_HEAL_LIMIT = Object.freeze({ 1: 150, 2: 220, 3: 300 });
const MATRIARCH_ABILITIES = new Set([
  'living_seed', 'hungry_root', 'restorative_dew', 'twin_vines', 'graft',
  'discard_pollen', 'harvest', 'royal_bloom', 'emerald_cocoon', 'spring_crown',
]);

function activeNatureThreats(boss) {
  return (boss?.natureThreats || []).filter((threat) => threat?.status === 'active');
}

function natureThreatSlots(gameState) {
  const boss = gameState.boss;
  return Math.max(0, (MATRIARCH_THREAT_LIMIT[boss.phase] || 1) - activeNatureThreats(boss).length);
}

function matriarchSeedCandidates(gameState) {
  const markedCardIds = new Set(activeNatureThreats(gameState.boss).map((threat) => threat.cardId).filter(Boolean));
  return (gameState.players || []).flatMap((player) => (player.hand || [])
    .filter((card) => card?.id
      && !markedCardIds.has(card.id)
      && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'play')
      && !isCardBlockedByBossState(gameState.boss, player.id, card.id, 'discard')
      && cardHasSafeLegalPlay(gameState, player, card))
    .map((card) => ({ player, card })));
}

function matriarchRootCandidates(gameState) {
  return eligibleMeldIndexes(gameState).map((meldIndex) => ({
    meldIndex,
    meldId: resolveBossMeldId(gameState, 0, meldIndex, true),
  })).filter((entry) => entry.meldId && !activeNatureThreats(gameState.boss).some((threat) => (
    threat.meldId === entry.meldId || threat.meldIds?.includes(entry.meldId)
  )));
}

function matriarchDiscardCandidate(gameState) {
  return gameState.discard?.at?.(-1) || gameState.discard?.[gameState.discard.length - 1] || null;
}

function buildRoyalBloomObjectives(gameState) {
  const objectives = [];
  const slots = Math.min(3, natureThreatSlots(gameState));
  const seed = chooseSeeded(matriarchSeedCandidates(gameState), gameState, 211);
  if (seed && objectives.length < slots) objectives.push({ type: 'seed', targetPlayerId: seed.player.id, cardId: seed.card.id });
  const root = chooseSeeded(matriarchRootCandidates(gameState), gameState, 223);
  if (root && objectives.length < slots) objectives.push({ type: 'root', ...root });
  const discard = matriarchDiscardCandidate(gameState);
  if (discard?.id && objectives.length < slots) objectives.push({ type: 'pollen', discardCardId: discard.id });
  return objectives;
}

function createPayload(gameState, abilityId) {
  const boss = gameState.boss;
  if (abilityId === 'fixed_interest') return weightedContract(gameState);
  if (abilityId === 'maintenance_fee') return {
    extraDraw: boss.phase === 3 ? 2 : 1,
    financedDebt: boss.phase === 3 ? 4 : 3,
  };
  if (abilityId === 'suit_audit') {
    const suit = SUITS[Math.floor(seededUnit(bossSeed(gameState, 17)) * SUITS.length) % SUITS.length];
    return { suit: suit.value, suitLabel: suit.label, required: boss.phase === 3 ? 4 : 3, progress: 0, successDelta: -5, failureDelta: boss.phase === 3 ? 12 : 10 };
  }
  if (abilityId === 'credit_limit') {
    const config = { 1: { allowance: 7, maxCharge: 4 }, 2: { allowance: 6, maxCharge: 5 }, 3: { allowance: 5, maxCharge: 6 } }[boss.phase];
    return { ...config, debtPerCard: 1 };
  }
  if (abilityId === 'discard_surcharge') return { amount: boss.phase === 3 ? 6 : 4 };

  if (abilityId === 'pledge') {
    const candidates = eligibleMeldIndexes(gameState)
      .map((index) => ({ index, size: gameState.teams[0].melds[index]?.length || 0 }))
      .sort((a, b) => a.size - b.size || a.index - b.index);
    const chosen = chooseSeeded(candidates, gameState, 29);
    return { meldIndex: chosen?.index ?? null };
  }

  if (boss.id === 'dominadora') {
    if (abilityId === 'collar' || abilityId === 'exposure' || abilityId === 'forced_choice' || abilityId === 'absolute_control') {
      const needsCard = abilityId === 'collar' || abilityId === 'exposure';
      const target = choosePlayer(gameState, 51, (player) => {
        if (!needsCard) return true;
        if (abilityId === 'exposure') return eligibleExposureCards(gameState, player).length > 0;
        return player.hand?.some((card) => card?.id);
      });
      if (abilityId === 'collar') {
        const maxLocks = Math.max(0, Math.min(2, (target?.hand?.length || 0) - 1));
        const cards = chooseCards(target, gameState, 53, maxLocks);
        return { targetPlayerId: target?.id ?? null, cardId: cards[0]?.id ?? null, cardIds: cards.map((card) => card.id) };
      }
      const card = needsCard
        ? chooseSeeded(abilityId === 'exposure' ? eligibleExposureCards(gameState, target) : (target?.hand || []).filter((entry) => entry?.id), gameState, 53)
        : null;
      const payload = { targetPlayerId: target?.id ?? null, cardId: card?.id ?? null };
      if (abilityId === 'forced_choice') payload.order = buildDominatrixOrder(gameState, target, 1);
      return payload;
    }
    if (abilityId === 'double_collar') {
      return {
        lockedCards: (gameState.players || []).map((player, index) => ({
          playerId: player.id,
          cardId: player.hand?.length > 1 ? chooseCard(player, gameState, 61 + index)?.id ?? null : null,
        })),
      };
    }
    if (abilityId === 'possession') {
      const meldIndex = chooseSeeded(eligibleMeldIndexes(gameState, { excludePossessed: true }), gameState, 71);
      const meldId = Number.isInteger(meldIndex) ? resolveBossMeldId(gameState, 0, meldIndex, true) : null;
      const kind = boss.meldProgress?.[meldId]?.highestKind || 'simple';
      return { meldIndex, meldId, createdTier: MELD_TIER[kind] || 0, contributorPlayerIds: [] };
    }
    if (abilityId === 'favorite') {
      const protectedPlayer = choosePlayer(gameState, 73);
      const punishedPlayer = (gameState.players || []).find((player) => player.id !== protectedPlayer?.id) || protectedPlayer;
      return { protectedPlayerId: protectedPlayer?.id ?? null, punishedPlayerId: punishedPlayer?.id ?? null };
    }
    if (abilityId === 'hands_tied') return { teamMeldAvailable: true, consumedByPlayerId: null, consumedMeldId: null };
    if (abilityId === 'separation') return { meldOwners: {} };
    if (abilityId === 'break_will') {
      const target = choosePlayer(gameState, 79, (player) => (boss.chainsByPlayer?.[player.id] || 0) >= 2);
      return { targetPlayerId: target?.id ?? null };
    }
    if (abilityId === 'final_order') return { orderedPlayerIds: (gameState.players || []).map((player) => player.id) };
    if (abilityId === 'iron_etiquette') {
      const candidates = (gameState.players || []).flatMap((player) => discardSuitOrderCandidates(gameState, player).map((suit) => ({ player, suit })));
      const selected = chooseSeeded(candidates, gameState, 83);
      return { targetPlayerId: selected?.player?.id ?? null, suit: selected?.suit?.value ?? null, suitLabel: selected?.suit?.label ?? '' };
    }
    if (abilityId === 'interdict') {
      const candidates = (gameState.teams?.[0]?.melds || []).map((meld, meldIndex) => ({
        meldIndex,
        eligiblePlayerIds: meldEvolutionPlayers(gameState, meldIndex),
      })).filter((entry) => entry.eligiblePlayerIds.length > 0);
      const selected = chooseSeeded(candidates, gameState, 89);
      return {
        meldIndex: selected?.meldIndex ?? null,
        meldId: Number.isInteger(selected?.meldIndex) ? resolveBossMeldId(gameState, 0, selected.meldIndex, true) : null,
        eligiblePlayerIds: selected?.eligiblePlayerIds || [],
      };
    }
  }

  if (boss.id === 'matriarca_esmeralda') {
    if (abilityId === 'living_seed') {
      const candidate = chooseSeeded(matriarchSeedCandidates(gameState), gameState, 181);
      return { targetPlayerId: candidate?.player?.id ?? null, cardId: candidate?.card?.id ?? null };
    }
    if (abilityId === 'hungry_root') {
      return chooseSeeded(matriarchRootCandidates(gameState), gameState, 183) || { meldIndex: null, meldId: null };
    }
    if (abilityId === 'restorative_dew') return {
      announcedPhase: boss.phase,
      baseHeal: getRestorativeDewHealing(boss.phase, 0),
      countedCardIds: [],
    };
    if (abilityId === 'twin_vines') {
      const candidates = matriarchRootCandidates(gameState);
      const first = chooseSeeded(candidates, gameState, 185);
      const remaining = candidates.filter((entry) => entry.meldId !== first?.meldId);
      const second = chooseSeeded(remaining, gameState, 187);
      return { targets: [first, second].filter(Boolean), targetCount: [first, second].filter(Boolean).length };
    }
    if (abilityId === 'graft') {
      const candidates = matriarchRootCandidates(gameState);
      const first = chooseSeeded(candidates, gameState, 189);
      const second = chooseSeeded(candidates.filter((entry) => entry.meldId !== first?.meldId), gameState, 191);
      return { targets: [first, second].filter(Boolean) };
    }
    if (abilityId === 'discard_pollen') return { discardCardId: matriarchDiscardCandidate(gameState)?.id ?? null };
    if (abilityId === 'harvest') return { targetPlayerId: choosePlayer(gameState, 193)?.id ?? null };
    if (abilityId === 'royal_bloom') {
      const objectives = buildRoyalBloomObjectives(gameState);
      return { objectives, targetCount: objectives.length };
    }
    if (abilityId === 'emerald_cocoon') return { amount: 180 };
    if (abilityId === 'spring_crown') return { activeThreatIds: activeNatureThreats(boss).map((threat) => threat.id) };
  }

  return {};
}

function hasValidAbilityPayload(gameState, abilityId, payload) {
  const players = gameState.players || [];
  if (abilityId === 'collar') {
    const cardIds = [...new Set(payload.cardIds || (payload.cardId ? [payload.cardId] : []))];
    const target = players.find((player) => player.id === payload.targetPlayerId);
    return cardIds.length > 0 && cardIds.length <= 2
      && cardIds.every((cardId) => playerHasCard(gameState, payload.targetPlayerId, cardId))
      && canApplyDiscardLock(gameState, target, cardIds);
  }
  if (abilityId === 'exposure') {
    const target = players.find((player) => player.id === payload.targetPlayerId);
    return !!target && eligibleExposureCards(gameState, target).some((card) => card.id === payload.cardId);
  }
  if (abilityId === 'forced_choice' || abilityId === 'absolute_control' || abilityId === 'break_will') {
    return players.some((player) => player.id === payload.targetPlayerId)
      && (abilityId !== 'forced_choice' || !!payload.order);
  }
  if (abilityId === 'double_collar') {
    return payload.lockedCards?.length === players.length && payload.lockedCards.every((entry) => {
      const player = players.find((candidate) => candidate.id === entry.playerId);
      return playerHasCard(gameState, entry.playerId, entry.cardId) && canApplyDiscardLock(gameState, player, [entry.cardId]);
    });
  }
  if (abilityId === 'pledge') {
    return Number.isInteger(payload.meldIndex) && eligibleMeldIndexes(gameState).includes(payload.meldIndex);
  }
  if (abilityId === 'possession') {
    return (gameState.boss?.possessions || []).length < 2
      && Number.isInteger(payload.meldIndex)
      && eligibleMeldIndexes(gameState, { excludePossessed: true }).includes(payload.meldIndex);
  }
  if (abilityId === 'iron_etiquette') {
    const target = players.find((player) => player.id === payload.targetPlayerId);
    return !!target && discardSuitOrderCandidates(gameState, target).some((suit) => suit.value === payload.suit);
  }
  if (abilityId === 'interdict') {
    return !!payload.meldId && Number.isInteger(payload.meldIndex)
      && meldEvolutionPlayers(gameState, payload.meldIndex).length > 0;
  }
  if (abilityId === 'favorite') {
    return players.some((player) => player.id === payload.protectedPlayerId) && players.some((player) => player.id === payload.punishedPlayerId);
  }
  if (abilityId === 'final_order') {
    return payload.orderedPlayerIds?.length === players.length && payload.orderedPlayerIds.every((id) => players.some((player) => player.id === id));
  }
  if (abilityId === 'forced_swap' || abilityId === 'hands_tied' || abilityId === 'separation') {
    return players.length >= 2;
  }
  if (abilityId === 'living_seed') {
    return natureThreatSlots(gameState) > 0 && matriarchSeedCandidates(gameState).some((candidate) => candidate.player?.id === payload.targetPlayerId && candidate.card?.id === payload.cardId);
  }
  if (abilityId === 'hungry_root') return !!payload.meldId && natureThreatSlots(gameState) > 0;
  if (abilityId === 'restorative_dew' || abilityId === 'harvest' || abilityId === 'discard_pollen') {
    if (natureThreatSlots(gameState) <= 0) return false;
    if (abilityId === 'harvest') return players.some((player) => player.id === payload.targetPlayerId);
    if (abilityId === 'discard_pollen') return !!payload.discardCardId;
    return true;
  }
  if (abilityId === 'twin_vines') return payload.targets?.length > 0 && natureThreatSlots(gameState) > 0;
  if (abilityId === 'graft') return payload.targets?.length === 2 && natureThreatSlots(gameState) > 0;
  if (abilityId === 'royal_bloom') return payload.objectives?.length > 0 && natureThreatSlots(gameState) > 0;
  if (abilityId === 'emerald_cocoon') return !gameState.boss?.emeraldCocoon;
  if (abilityId === 'spring_crown') return activeNatureThreats(gameState.boss).length > 0;
  return true;
}

const ABILITY_DURATION = Object.freeze({
  forced_choice: 'until_choice',
  break_will: 'until_choice',
  final_order: 'until_choice',
  collar: 'target_turn',
  exposure: 'target_turn',
  absolute_control: 'target_turn',
  possession: 'immediate',
  forced_swap: 'immediate',
  favorite: 'immediate',
  iron_etiquette: 'full_round',
  interdict: 'full_round',
});

export const BOSS_PRESENTATION_MS = Object.freeze({
  firstAbility: 6000,
  ability: 5000,
  result: 4000,
  phase: 3000,
  taunt: 4000,
});

export function createBossState(id = 'banker', seed = Date.now()) {
  const definition = getBossDefinition(id);
  if (!definition) throw new Error(`Chefe desconhecido: ${id}`);
  return {
    version: 1,
    phaseModel: 'progress-v1',
    id: definition.id,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    phase: 1,
    dangerType: definition.dangerType || 'debt',
    danger: 0,
    maxDanger: definition.maxDanger,
    bloom: 0,
    natureThreats: [],
    natureHealingThisRound: 0,
    natureHealingRound: 1,
    emeraldCocoon: null,
    springCrown: null,
    rebirthUsed: false,
    lastBloomEventId: null,
    lastHealEventId: null,
    resolvedNatureEventIds: [],
    resolvedNatureRoundIds: [],
    natureFailureCountThisRound: 0,
    propagationRound: 0,
    propagationUsedThisRound: false,
    pendingRootPropagation: null,
    lastPropagationEventId: null,
    roundNumber: 1,
    playersActedThisRound: [],
    currentIntent: null,
    lastAbilityId: null,
    effects: [],
    chainsByPlayer: {},
    chainReliefRoundByPlayer: {},
    choiceDrawnCardIdsByPlayer: {},
    pendingFinancedDrawsByPlayer: {},
    damagedCardIds: [],
    suppressedDamageCardIds: [],
    vaultsByPlayer: {},
    possessions: [],
    activeOrders: [],
    interdicts: [],
    creditLimit: null,
    discardSurcharge: null,
    pendingChoices: [],
    meldProgress: {},
    meldContributions: {},
    meldIdsByCardId: {},
    meldIdsByPosition: {},
    meldIdSequence: 0,
    deadRewardsApplied: 0,
    resolvedTurnIds: [],
    phaseTransitions: [1],
    pendingPhase: null,
    phaseTransitionId: null,
    phaseIntroPending: null,
    bossFlow: null,
    awaitingBossTurn: false,
    actionSequence: 0,
    lastResolvedActionId: null,
    lastEvent: null,
    eventLog: [],
    damageReaction: null,
    lastDamageReactionRound: 0,
    seed: Number(seed) || 1,
    defeated: false,
    result: null,
    stats: {
      totalDamage: 0,
      canastrasFormed: 0,
      largestAttack: 0,
      finalStrike: 0,
      finalDebt: 0,
    },
  };
}

export function createBossStateForMode(mode, seed = Date.now()) {
  const definition = getBossDefinitionForMode(mode);
  if (!definition) throw new Error(`Modo de chefe desconhecido: ${mode}`);
  return createBossState(definition.id, seed);
}

export function normalizeBossState(gameState) {
  if (!isBossMode(gameState)) return null;
  if (!gameState.boss) gameState.boss = createBossState(getBossDefinitionForMode(gameState.mode)?.id || 'banker');
  const boss = gameState.boss;
  boss.effects ||= [];
  boss.chainsByPlayer ||= {};
  boss.chainReliefRoundByPlayer ||= {};
  boss.choiceDrawnCardIdsByPlayer ||= {};
  boss.pendingFinancedDrawsByPlayer ||= {};
  boss.damagedCardIds ||= [];
  // Possession suppresses only its stored historical damage. New contribution
  // cards are always accounted immediately, including migrated snapshots.
  boss.suppressedDamageCardIds = [];
  boss.vaultsByPlayer ||= {};
  boss.possessions ||= [];
  boss.activeOrders ||= [];
  boss.interdicts ||= [];
  boss.creditLimit ||= null;
  boss.discardSurcharge ||= null;
  boss.pendingChoices ||= [];
  (gameState.players || []).forEach((player) => {
    boss.chainsByPlayer[player.id] = clamp(Number(boss.chainsByPlayer[player.id]) || 0, 0, 4);
  });
  boss.meldProgress ||= {};
  boss.meldContributions ||= {};
  Object.values(boss.meldContributions).forEach((entry) => {
    entry.damageDone ||= 0;
    entry.bankerDebtRelief ||= 0;
    entry.dominatrixChainsBroken ||= 0;
    entry.dominatrixResistanceTier ||= 0;
    entry.matriarchBloomRemoved ||= 0;
    entry.matriarchBloomTier ||= 0;
  });
  boss.meldIdsByCardId ||= {};
  boss.meldIdsByPosition ||= {};
  boss.meldIdSequence ||= 0;
  boss.resolvedTurnIds ||= [];
  boss.playersActedThisRound ||= [];
  boss.phaseTransitions ||= [boss.phase || 1];
  boss.pendingPhase ??= null;
  boss.phaseTransitionId ??= null;
  boss.phaseIntroPending ??= null;
  boss.bossFlow ||= null;
  boss.awaitingBossTurn ||= false;
  boss.eventLog ||= [];
  boss.damageReaction ||= null;
  boss.lastDamageReactionRound ||= 0;
  boss.healReaction ||= null;
  boss.lastHealReactionRound ||= 0;
  boss.bloom = clamp(Number(boss.bloom ?? (boss.id === 'matriarca_esmeralda' ? boss.danger : 0)) || 0, 0, 5);
  if (boss.id === 'matriarca_esmeralda') boss.danger = boss.bloom;
  boss.natureThreats ||= [];
  boss.natureHealingThisRound ||= 0;
  boss.natureHealingRound ||= boss.roundNumber || 1;
  boss.emeraldCocoon ||= null;
  boss.springCrown ||= null;
  boss.rebirthUsed ||= false;
  boss.lastBloomEventId ||= null;
  boss.lastHealEventId ||= null;
  boss.resolvedNatureEventIds ||= [];
  boss.resolvedNatureRoundIds ||= [];
  boss.natureFailureCountThisRound ||= 0;
  boss.propagationRound ||= 0;
  boss.propagationUsedThisRound ||= false;
  boss.pendingRootPropagation ||= null;
  boss.lastPropagationEventId ||= null;
  boss.stats ||= { totalDamage: 0, canastrasFormed: 0, largestAttack: 0, finalStrike: 0, finalDebt: 0 };

  Object.entries(boss.vaultsByPlayer).forEach(([playerId, vault]) => {
    const ownerExists = (gameState.players || []).some((player) => String(player.id) === String(playerId));
    if (!ownerExists || !vault?.card?.id) delete boss.vaultsByPlayer[playerId];
  });

  const teamMelds = gameState.teams?.[0]?.melds || [];
  const meldIndexForStableId = (meldId) => teamMelds.findIndex((meld, meldIndex) => resolveBossMeldId(gameState, 0, meldIndex, false) === meldId);
  boss.possessions = boss.possessions.filter((possession) => {
    const stableIndex = possession?.meldId ? meldIndexForStableId(possession.meldId) : possession?.meldIndex;
    if (!Number.isInteger(stableIndex) || !Array.isArray(teamMelds[stableIndex])) return false;
    possession.meldIndex = stableIndex;
    possession.contributorPlayerIds ||= [];
    possession.progressCardIds ||= [];
    return true;
  });
  boss.interdicts = boss.interdicts.filter((interdict) => {
    if (interdict.status !== 'active') return true;
    const stableIndex = interdict.meldId ? meldIndexForStableId(interdict.meldId) : interdict.meldIndex;
    if (!Number.isInteger(stableIndex) || !Array.isArray(teamMelds[stableIndex])
      || isCompleteAceToAce(teamMelds[stableIndex])
      || meldEvolutionPlayers(gameState, stableIndex).length === 0) {
      interdict.status = 'cancelled';
      return true;
    }
    interdict.meldIndex = stableIndex;
    return true;
  });

  const activePlayerId = gameState.players?.[gameState.currentPlayer]?.id ?? gameState.currentPlayer;
  if (boss.currentIntent?.abilityId === 'exposure') {
    const { targetPlayerId, cardId } = boss.currentIntent.payload || {};
    const targetTurnStarted = activePlayerId === targetPlayerId || boss.playersActedThisRound.includes(targetPlayerId);
    const target = (gameState.players || []).find((player) => player.id === targetPlayerId);
    const exposureStillPossible = !!target && eligibleExposureCards(gameState, target).some((card) => card.id === cardId);
    if (activePlayerId != null && !targetTurnStarted && !exposureStillPossible) {
      boss.currentIntent = null;
      boss.actionSequence += 1;
      recordEvent(boss, {
        type: 'bossFallback',
        actionId: `exposure_cancelled_${boss.actionSequence}`,
        outcome: 'Exposição cancelada: a carta alvo deixou de existir antes do turno.',
      });
    }
  }

  if (boss.bossFlow?.stage === 'choice' && !boss.pendingChoices.length) {
    boss.bossFlow.stage = 'players';
    boss.bossFlow.endsAt = 0;
    boss.awaitingBossTurn = false;
    boss.presentationUntil = 0;
  } else if (boss.bossFlow && !['pending', 'result', 'phase', 'taunt', 'ability', 'choice', 'players'].includes(boss.bossFlow.stage)) {
    boss.bossFlow.stage = 'players';
    boss.bossFlow.endsAt = 0;
    boss.presentationUntil = 0;
  }

  if (boss.id === 'dominadora') {
    for (const order of (boss.activeOrders || []).filter((entry) => entry.status === 'active')) {
      const target = (gameState.players || []).find((player) => player.id === order.targetPlayerId);
      if (!target) {
        finishDominatrixOrder(gameState, order, 'cancelled', 'A ordem perdeu o jogador alvo.');
        continue;
      }
      const targetTurnStarted = activePlayerId === target.id || boss.playersActedThisRound.includes(target.id);
      if (['feed_specific_meld', 'evolve_specific_meld'].includes(order.type)) {
        const stableIndex = order.meldId ? meldIndexForStableId(order.meldId) : order.meldIndex;
        const meld = teamMelds[stableIndex];
        const hasLegalOrderedAction = order.type === 'evolve_specific_meld'
          ? bossMeldEvolutionOptions(gameState, target, stableIndex, 1).length > 0
          : Array.isArray(meld) && (target.hand || []).some((card) => card?.id
            && !isCardBlockedByBossState(boss, target.id, card.id, 'play')
            && isValidBossSequence([...meld, card])
            && hasLegalDiscard(gameState, target, [card.id]));
        if (!targetTurnStarted && (!Array.isArray(meld) || !hasLegalOrderedAction)) {
          finishDominatrixOrder(gameState, order, 'cancelled', 'O jogo ordenado deixou de aceitar uma acao legal antes do turno do alvo.');
        } else if (Array.isArray(meld)) order.meldIndex = stableIndex;
      } else if (order.type === 'discard_suit' && !targetTurnStarted) {
        const possible = legalDiscardCards(gameState, target).some((card) => !card.joker && card.suit === order.suit);
        if (!possible) finishDominatrixOrder(gameState, order, 'cancelled', 'O naipe ordenado deixou de ter descarte legal antes do turno do alvo.');
      }
    }
    for (const player of gameState.players || []) {
      if (!player.hand?.length || hasLegalDiscard(gameState, player)) continue;
      let effectIndex = -1;
      for (let index = boss.effects.length - 1; index >= 0; index -= 1) {
        const effect = boss.effects[index];
        if (effect.playerId === player.id && effect.expiresAfterTurn && ['choice_lock', 'choice_exposure'].includes(effect.id)) {
          effectIndex = index;
          break;
        }
      }
      if (effectIndex >= 0) {
        const [cancelled] = boss.effects.splice(effectIndex, 1);
        boss.actionSequence += 1;
        recordEvent(boss, {
          type: 'bossFallback',
          actionId: `discard_lock_cancelled_${boss.actionSequence}`,
          playerId: player.id,
          cardId: cancelled.cardId,
          outcome: 'A trava temporária mais recente foi cancelada para preservar um descarte legal.',
        });
        continue;
      }

      const intent = boss.currentIntent;
      let cancelledCardId = null;
      if (intent?.abilityId === 'collar' && intent.payload?.targetPlayerId === player.id) {
        const cardIds = [...(intent.payload.cardIds || (intent.payload.cardId ? [intent.payload.cardId] : []))];
        cancelledCardId = cardIds.pop() || null;
        if (cardIds.length) {
          intent.payload.cardIds = cardIds;
          intent.payload.cardId = cardIds[0];
        } else boss.currentIntent = null;
      } else if (intent?.abilityId === 'double_collar') {
        const lockedIndex = intent.payload?.lockedCards?.findIndex((entry) => entry.playerId === player.id) ?? -1;
        if (lockedIndex >= 0) {
          cancelledCardId = intent.payload.lockedCards[lockedIndex].cardId;
          intent.payload.lockedCards.splice(lockedIndex, 1);
        }
      } else if (intent?.abilityId === 'exposure' && intent.payload?.targetPlayerId === player.id) {
        cancelledCardId = intent.payload.cardId || null;
        boss.currentIntent = null;
      }
      if (cancelledCardId) {
        boss.actionSequence += 1;
        recordEvent(boss, {
          type: 'bossFallback',
          actionId: `intent_lock_cancelled_${boss.actionSequence}`,
          playerId: player.id,
          cardId: cancelledCardId,
          outcome: 'A trava temporária mais recente foi reduzida para preservar um descarte legal.',
        });
      }
    }
  }
  if (boss.id === 'matriarca_esmeralda') {
    const playerById = (playerId) => (gameState.players || []).find((player) => player.id === playerId);
    const meldIndexById = (meldId) => (gameState.teams?.[0]?.melds || []).findIndex((meld, meldIndex) => (
      resolveBossMeldId(gameState, 0, meldIndex, false) === meldId
    ));
    const cardIsOnTable = (cardId) => (gameState.teams?.[0]?.melds || []).some((meld) => (
      (meld || []).some((card) => card?.id === cardId)
    ));

    for (const threat of [...activeNatureThreats(boss)]) {
      if (['seed', 'royal_seed', 'root', 'twin_root', 'royal_root', 'graft'].includes(threat.type)) threat.healAmount = 0;
      if (threat.type === 'pollen') threat.healAmount = 40;
      if (threat.type === 'royal_pollen') threat.healAmount = 0;
      if (threat.type === 'dew') {
        threat.healAmount = Number(threat.healAmount) || ({ 1: 150, 2: 180, 3: 220 }[boss.phase] || 150);
        threat.reductionPerCard = 15;
      }
      if (['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId != null) {
        const target = playerById(threat.targetPlayerId);
        const markedCard = target?.hand?.find((card) => card?.id === threat.cardId) || null;
        if (cardIsOnTable(threat.cardId)) {
          succeedNatureThreat(gameState, threat, `${target?.name || 'O alvo'} usou a carta marcada.`);
        } else if (!markedCard) {
          cancelNatureThreat(gameState, threat, 'A carta marcada deixou de ser um alvo valido.');
        } else if (!cardHasSafeLegalPlay(gameState, target, markedCard)) {
          cancelNatureThreat(gameState, threat, 'A carta marcada deixou de possuir uma jogada legal segura.');
        }
      } else if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
        const currentIndex = meldIndexById(threat.meldId);
        if (currentIndex < 0) cancelNatureThreat(gameState, threat, 'O jogo marcado deixou de existir.');
        else if (threat.strengthened && (gameState.players || []).length < Math.max(1, Number(threat.requiredContributorCount) || 2)) {
          cancelNatureThreat(gameState, threat, 'Um dos cooperadores deixou de poder contribuir com a Raiz Fortalecida.');
        }
        else if (!meldCanReceiveAnyCard(gameState.teams?.[0]?.melds?.[currentIndex])) {
          cancelNatureThreat(gameState, threat, 'O jogo marcado nao aceita mais nenhuma continuacao legal.');
        } else threat.meldIndex = currentIndex;
      } else if (threat.type === 'graft') {
        const indexes = (threat.meldIds || []).map(meldIndexById);
        if (indexes.length !== 2 || indexes.some((index) => index < 0)) {
          cancelNatureThreat(gameState, threat, 'O Enxerto perdeu um dos jogos ligados.');
        } else if (indexes.some((index) => !meldCanReceiveAnyCard(gameState.teams?.[0]?.melds?.[index]))) {
          cancelNatureThreat(gameState, threat, 'Um dos lados do Enxerto deixou de aceitar continuacoes legais.');
        } else threat.meldIndexes = indexes;
      } else if (threat.type === 'harvest' && !playerById(threat.targetPlayerId)) {
        cancelNatureThreat(gameState, threat, 'A Colheita perdeu o jogador alvo.');
      } else if (['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null) {
        const discardTopId = gameState.discard?.[gameState.discard.length - 1]?.id || null;
        if (discardTopId !== threat.discardCardId) cancelNatureThreat(gameState, threat, 'O topo do lixo mudou antes de ser pego.');
      }
    }

    if (boss.currentIntent?.abilityId === 'restorative_dew') {
      const activeDew = activeNatureThreats(boss).find((threat) => (
        threat.type === 'dew' && threat.sourceIntentId === boss.currentIntent.id
      ));
      if (activeDew) {
        boss.currentIntent.payload ||= {};
        boss.currentIntent.payload.countedCardIds = [...new Set(activeDew.countedCardIds || [])];
      }
    }

    if (boss.emeraldCocoon && boss.emeraldCocoon.status !== 'active') boss.emeraldCocoon = null;
  }
  if (boss.phaseModel !== 'progress-v1') {
    boss.phaseModel = 'progress-v1';
    boss.phase = phaseForProgress(gameState);
    boss.phaseTransitions = [boss.phase];
  }
  boss.phase ||= 1;
  return boss;
}

function eligibleAbilityCandidates(gameState, entries, { avoidLast = false } = {}) {
  const boss = gameState.boss;
  let choices = entries.filter((entry) => entry.phases.includes(boss.phase));
  if (avoidLast && boss.lastAbilityId && choices.length > 1) choices = choices.filter((entry) => entry.id !== boss.lastAbilityId);
  if (boss.phase === 3 && boss.lastMaintenanceRound === boss.roundNumber) choices = choices.filter((entry) => entry.id !== 'maintenance_fee');
  if (!eligibleMeldIndexes(gameState).length) choices = choices.filter((entry) => entry.id !== 'pledge');
  if ((boss.possessions || []).length >= 2 || !eligibleMeldIndexes(gameState, { excludePossessed: true }).length) choices = choices.filter((entry) => entry.id !== 'possession');
  if (!(gameState.players || []).some((player) => (boss.chainsByPlayer?.[player.id] || 0) >= 2)) choices = choices.filter((entry) => entry.id !== 'break_will');
  const players = gameState.players || [];
  const allPlayersHaveCards = players.length > 0 && players.every((player) => player.hand?.some((card) => card?.id));
  if (!players.length) choices = choices.filter((entry) => !['forced_choice', 'absolute_control', 'break_will'].includes(entry.id));
  if (!players.some((player) => player.hand?.some((card) => card?.id))) choices = choices.filter((entry) => entry.id !== 'collar');
  if (!players.some((player) => eligibleExposureCards(gameState, player).length)) choices = choices.filter((entry) => entry.id !== 'exposure');
  if (players.length < 2 || !allPlayersHaveCards) choices = choices.filter((entry) => !['forced_swap', 'double_collar', 'final_order'].includes(entry.id));
  if (players.length < 2) choices = choices.filter((entry) => entry.id !== 'favorite');
  return choices
    .map((entry) => ({ entry, payload: createPayload(gameState, entry.id) }))
    .filter(({ entry, payload }) => hasValidAbilityPayload(gameState, entry.id, payload));
}

export function inspectBossAbilityEligibility(gameState, abilityId) {
  const boss = normalizeBossState(gameState);
  if (!boss) return { eligible: false, reason: 'O estado nao pertence a um modo Chefe da Mesa.', entry: null, payload: null };
  const definition = getBossDefinition(boss.id);
  const entry = definition?.abilities?.find((ability) => ability.id === abilityId) || null;
  if (!entry) return { eligible: false, reason: `Habilidade desconhecida para ${definition?.name || boss.id}: ${abilityId}.`, entry: null, payload: null };
  if (!entry.phases.includes(boss.phase)) {
    return { eligible: false, reason: `${entry.name} nao e elegivel na Fase ${boss.phase}.`, entry, payload: null };
  }
  const candidate = eligibleAbilityCandidates(gameState, [entry])[0] || null;
  if (!candidate) {
    return { eligible: false, reason: `${entry.name} nao encontrou um alvo legal no estado atual.`, entry, payload: null };
  }
  return { eligible: true, reason: '', entry: candidate.entry, payload: candidate.payload };
}

export function queueDebugBossAbility(gameState, abilityId) {
  const boss = normalizeBossState(gameState);
  if (!boss) throw new Error('O laboratorio exige uma partida Chefe da Mesa.');
  boss.debugForcedAbilityId = abilityId;
  return abilityId;
}

export function selectNextBossIntent(gameState, { debug = false, forcedAbilityId = null, fallbackOnIneligible = false } = {}) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.defeated || boss.result || boss.pendingChoices.length) return null;
  const definition = getBossDefinition(boss.id);
  const normalEntries = definition.abilities.filter((entry) => entry.phases.includes(boss.phase));
  let candidates = [];
  let selectionSource = 'normal';
  const queuedDebugAbilityId = debug ? (forcedAbilityId || boss.debugForcedAbilityId || null) : null;
  const allowDebugFallback = fallbackOnIneligible || (debug && boss.debugFallbackOnIneligible === true);
  if (debug && boss.debugForcedAbilityId) delete boss.debugForcedAbilityId;
  if (debug && boss.debugFallbackOnIneligible) delete boss.debugFallbackOnIneligible;
  if (queuedDebugAbilityId) {
    const forcedEntry = definition.abilities.find((entry) => entry.id === queuedDebugAbilityId);
    if (!forcedEntry) throw new Error(`Habilidade debug desconhecida para ${definition.name}: ${queuedDebugAbilityId}.`);
    if (!forcedEntry.phases.includes(boss.phase)) throw new Error(`${forcedEntry.name} nao e elegivel na Fase ${boss.phase}.`);
    candidates = eligibleAbilityCandidates(gameState, [forcedEntry]);
    if (!candidates.length && !allowDebugFallback) throw new Error(`${forcedEntry.name} nao encontrou um alvo legal no cenario preparado.`);
    selectionSource = candidates.length ? 'debug_forced' : 'debug_fallback';
  } else if (boss.phaseIntroPending === boss.phase) {
    const introIds = definition.phaseIntroAbilities?.[boss.phase] || [];
    const introEntries = introIds.map((id) => normalEntries.find((entry) => entry.id === id)).filter(Boolean);
    candidates = eligibleAbilityCandidates(gameState, introEntries);
    selectionSource = candidates.length ? 'phase_intro' : 'phase_intro_fallback';
  }
  if (!candidates.length) {
    const fallbackEntries = queuedDebugAbilityId
      ? normalEntries.filter((entry) => entry.id !== queuedDebugAbilityId)
      : normalEntries;
    candidates = eligibleAbilityCandidates(gameState, fallbackEntries, { avoidLast: true });
  }
  if (!candidates.length) return null;

  let selected = candidates[0];
  if (!queuedDebugAbilityId) {
    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.entry.weight, 0);
    let cursor = seededUnit(bossSeed(gameState, 43)) * totalWeight;
    for (const candidate of candidates) {
      cursor -= candidate.entry.weight;
      if (cursor <= 0) {
        selected = candidate;
        break;
      }
    }
  }

  const { entry, payload } = selected;
  const context = { phase: boss.phase, ...payload };
  const phaseTransitionId = boss.phaseIntroPending === boss.phase ? boss.phaseTransitionId : null;
  if (boss.phaseIntroPending === boss.phase) boss.phaseIntroPending = null;
  boss.currentIntent = {
    id: `intent_${boss.roundNumber}_${boss.actionSequence + 1}_${entry.id}`,
    abilityId: entry.id,
    name: entry.name,
    description: entry.describe(context),
    payload,
    duration: ABILITY_DURATION[entry.id] || 'full_round',
    announcedPhase: boss.phase,
    activatedRound: boss.roundNumber,
    announcedAtSequence: boss.actionSequence,
    selectionSource,
    phaseTransitionId,
    intentStatus: 'announced',
    intentAnnouncedAt: null,
    intentAppliedAt: null,
  };
  return boss.currentIntent;
}

function flowItemDuration(kind, firstAbility = false) {
  if (kind === 'ability') return firstAbility ? BOSS_PRESENTATION_MS.firstAbility : BOSS_PRESENTATION_MS.ability;
  return BOSS_PRESENTATION_MS[kind] || BOSS_PRESENTATION_MS.ability;
}

export function isBossTurnActive(gameState) {
  const boss = normalizeBossState(gameState);
  return !!boss?.bossFlow && boss.bossFlow.stage !== 'players';
}

export function beginBossTurn(gameState, { first = false, phaseChanged = false, resultEvent = null, now = Date.now(), debug = false } = {}) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.result || boss.defeated) return null;
  if (boss.pendingChoices.length) {
    boss.awaitingBossTurn = { first, phaseChanged, resultActionId: resultEvent?.actionId || null };
    return null;
  }
  const queue = [];
  if (resultEvent?.actionId) queue.push({ kind: 'result', eventActionId: resultEvent.actionId });
  if (phaseChanged) queue.push({ kind: 'phase', phase: boss.phase }, { kind: 'taunt', phase: boss.phase });
  queue.push({ kind: 'ability', firstAbility: first });
  boss.awaitingBossTurn = false;
  const phaseTransitionId = phaseChanged ? boss.phaseTransitionId : null;
  boss.bossFlow = {
    id: `boss_turn_${boss.roundNumber}_${boss.actionSequence}${phaseTransitionId ? `_${phaseTransitionId}` : ''}`,
    stage: 'pending',
    queue,
    startedAt: now,
    endsAt: now,
    eventActionId: null,
    phase: boss.phase,
    phaseTransitionId,
    debugSelection: debug === true,
  };
  return advanceBossTurn(gameState, now);
}

export function advanceBossTurn(gameState, now = Date.now()) {
  const boss = normalizeBossState(gameState);
  const flow = boss?.bossFlow;
  if (!boss || !flow || boss.pendingChoices.length || boss.result) return null;
  if (flow.stage !== 'pending' && flow.stage !== 'players' && now < flow.endsAt) return null;
  if (flow.stage === 'ability') {
    const announcedIntent = boss.currentIntent;
    const matriarchActivation = boss.id === 'matriarca_esmeralda' && MATRIARCH_ABILITIES.has(announcedIntent?.abilityId);
    const dominatrixPersistentActivation = boss.id === 'dominadora'
      && ['iron_etiquette', 'interdict'].includes(announcedIntent?.abilityId);
    const persistentActivation = matriarchActivation || dominatrixPersistentActivation;
    const resolvesBeforePlayers = announcedIntent?.duration === 'immediate'
      || announcedIntent?.abilityId === 'forced_choice'
      || persistentActivation;
    if (resolvesBeforePlayers && !announcedIntent.immediateApplied) {
      const immediateEvent = resolveIntent(gameState, { keepIntent: true, appliedAt: now });
      if (immediateEvent && !persistentActivation) flow.queue.unshift({ kind: 'result', eventActionId: immediateEvent.actionId });
      if (announcedIntent?.abilityId === 'forced_choice' && boss.pendingChoices.length) {
        flow.stage = 'choice';
        flow.startedAt = now;
        flow.endsAt = 0;
        flow.eventActionId = immediateEvent?.actionId || null;
        boss.presentationUntil = 0;
        boss.awaitingBossTurn = { resumePlayersAfterChoice: true, flowId: flow.id };
        return { stage: 'choice', flowId: flow.id, eventActionId: flow.eventActionId };
      }
    }
  }
  if (flow.stage === 'result' && boss.currentIntent?.immediateApplied) {
    boss.currentIntent = null;
  }
  const next = flow.queue.shift();
  if (!next) {
    flow.stage = 'players';
    flow.startedAt = now;
    flow.endsAt = 0;
    flow.eventActionId = null;
    boss.presentationUntil = 0;
    return { stage: 'players', flowId: flow.id };
  }

  if (next.kind === 'ability') {
    const persistentIntent = boss.currentIntent?.duration === 'until_released' && !boss.currentIntent?.payload?.released
      ? boss.currentIntent
      : null;
    const debugSelection = flow.debugSelection === true;
    const intent = persistentIntent || selectNextBossIntent(gameState, { debug: debugSelection });
    if (debugSelection) delete flow.debugSelection;
    if (!intent) {
      flow.queue = [];
      return advanceBossTurn(gameState, now);
    }
    intent.intentStatus = intent.immediateApplied ? 'applied' : 'announced';
    intent.intentAnnouncedAt ||= now;
  }

  flow.stage = next.kind;
  flow.startedAt = now;
  flow.endsAt = now + flowItemDuration(next.kind, next.firstAbility);
  flow.eventActionId = next.eventActionId || null;
  flow.phase = next.phase || boss.phase;
  boss.presentationUntil = flow.endsAt;
  return { stage: flow.stage, flowId: flow.id, endsAt: flow.endsAt, eventActionId: flow.eventActionId, phase: flow.phase };
}

function recordEvent(boss, event) {
  const recordedEvent = {
    round: boss.roundNumber,
    at: Date.now(),
    ...event,
  };
  boss.lastEvent = recordedEvent;
  boss.eventLog.push(recordedEvent);
  if (boss.eventLog.length > 30) boss.eventLog.splice(0, boss.eventLog.length - 30);
  return recordedEvent;
}

function natureEventWasResolved(boss, eventId) {
  return !!eventId && boss.resolvedNatureEventIds.includes(eventId);
}

function markNatureEventResolved(boss, eventId) {
  if (!eventId || boss.resolvedNatureEventIds.includes(eventId)) return;
  boss.resolvedNatureEventIds.push(eventId);
  if (boss.resolvedNatureEventIds.length > 80) boss.resolvedNatureEventIds.splice(0, boss.resolvedNatureEventIds.length - 80);
}

export function changeMatriarchBloom(gameState, amount, origin = 'Florescimento', eventId = null) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda' || boss.result || !amount || natureEventWasResolved(boss, eventId)) return null;
  const before = boss.bloom;
  boss.bloom = clamp(before + amount, 0, boss.maxDanger || 5);
  boss.danger = boss.bloom;
  const applied = boss.bloom - before;
  if (!applied) return null;
  markNatureEventResolved(boss, eventId);
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'bloomChange',
    actionId: eventId || `bloom_${boss.actionSequence}`,
    amount: applied,
    bloom: boss.bloom,
    origin,
    outcome: `${origin}: ${applied > 0 ? '+' : ''}${applied} Flor${Math.abs(applied) === 1 ? '' : 'es'}.`,
  });
  boss.lastBloomEventId = event.actionId;
  if (boss.bloom >= boss.maxDanger && !boss.result) {
    boss.result = {
      victory: false,
      reason: 'max_bloom',
      title: 'Primavera Eterna',
      detail: 'O quinto Florescimento transformou a mesa no jardim da Matriarca.',
    };
  }
  return event;
}

export function healMatriarch(gameState, requested, origin = 'Cura natural', eventId = null) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda' || boss.result || requested <= 0 || natureEventWasResolved(boss, eventId)) return null;
  if (boss.natureHealingRound !== boss.roundNumber) {
    boss.natureHealingRound = boss.roundNumber;
    boss.natureHealingThisRound = 0;
    boss.natureFailureCountThisRound = 0;
  }
  const roundLimit = MATRIARCH_HEAL_LIMIT[boss.phase] || 150;
  const availableByRound = Math.max(0, roundLimit - boss.natureHealingThisRound);
  const availableHp = Math.max(0, boss.maxHp - boss.hp);
  const applied = Math.min(Math.max(0, Number(requested) || 0), availableByRound, availableHp);
  markNatureEventResolved(boss, eventId);
  if (!applied) return null;
  boss.hp += applied;
  boss.natureHealingThisRound += applied;
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'bossHeal',
    actionId: eventId || `heal_${boss.actionSequence}`,
    amount: applied,
    requested: Number(requested) || 0,
    hp: boss.hp,
    origin,
    outcome: `${origin}: +${applied} HP.`,
  });
  boss.lastHealEventId = event.actionId;
  if (boss.lastHealReactionRound !== boss.roundNumber) {
    boss.lastHealReactionRound = boss.roundNumber;
    event.reaction = getBossDefinition(boss.id)?.healReactions?.[0] || '';
    if (event.reaction) {
      boss.healReaction = {
        id: `heal_reaction_${boss.roundNumber}`,
        text: event.reaction,
        at: Date.now(),
        until: Date.now() + 2500,
      };
    }
  }
  return event;
}

function triggerMatriarchRebirth(gameState, sourceActionId) {
  const boss = gameState.boss;
  if (boss.id !== 'matriarca_esmeralda' || boss.hp > 0 || boss.phase !== 3 || boss.bloom < 3 || boss.rebirthUsed || boss.result) return false;
  boss.rebirthUsed = true;
  boss.bloom -= 3;
  boss.danger = boss.bloom;
  boss.hp = 300;
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'rebirth',
    actionId: `rebirth_${sourceActionId || boss.actionSequence}`,
    hp: boss.hp,
    bloom: boss.bloom,
    outcome: 'RENASCIMENTO - 300 HP. Tres Florescimentos foram consumidos.',
  });
  boss.lastBloomEventId = event.actionId;
  return true;
}

function applyDamageToBoss(gameState, damage, { breaksCocoon = false, sourceActionId = '' } = {}) {
  const boss = gameState.boss;
  let remaining = Math.max(0, Number(damage) || 0);
  let absorbed = 0;
  let cocoonBroken = false;
  if (boss.id === 'matriarca_esmeralda' && boss.emeraldCocoon?.status === 'active') {
    if (breaksCocoon) {
      boss.emeraldCocoon.remaining = 0;
      boss.emeraldCocoon.status = 'broken';
      cocoonBroken = true;
    } else {
      absorbed = Math.min(remaining, boss.emeraldCocoon.remaining);
      boss.emeraldCocoon.remaining -= absorbed;
      remaining -= absorbed;
      if (boss.emeraldCocoon.remaining <= 0) {
        boss.emeraldCocoon.status = 'broken';
        cocoonBroken = true;
      }
    }
  }
  const before = boss.hp;
  boss.hp = clamp(boss.hp - remaining, 0, boss.maxHp);
  const hpDamage = before - boss.hp;
  const reborn = triggerMatriarchRebirth(gameState, sourceActionId);
  return { hpDamage, absorbed, cocoonBroken, reborn, remainingDamage: remaining };
}

function addNatureThreat(gameState, data) {
  const boss = gameState.boss;
  if (natureThreatSlots(gameState) <= 0) return null;
  boss.actionSequence += 1;
  const threat = {
    id: data.id || `nature_${boss.roundNumber}_${boss.actionSequence}_${data.type}`,
    createdRound: boss.roundNumber,
    deadlineRound: boss.roundNumber,
    healAmount: 0,
    bloomAmount: 0,
    status: 'active',
    resolvedEventId: null,
    ...data,
  };
  boss.natureThreats.push(threat);
  return threat;
}

function completeNatureThreat(boss, threat, status, outcome = '') {
  if (!threat || threat.status !== 'active') return null;
  threat.status = status;
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'natureThreat',
    actionId: `threat_${threat.id}_${status}`,
    threatId: threat.id,
    threatType: threat.type,
    status,
    outcome,
  });
  threat.resolvedEventId = event.actionId;
  return event;
}

function requestRootPropagation(gameState, sourceThreat, { strengthen = false } = {}) {
  const boss = gameState.boss;
  if (boss?.id !== 'matriarca_esmeralda') return false;
  if (boss.pendingRootPropagation) {
    if (strengthen) boss.pendingRootPropagation.strengthened = true;
    return true;
  }
  boss.pendingRootPropagation = {
    id: `propagation_request_${sourceThreat?.id || boss.actionSequence}_${boss.roundNumber}`,
    sourceThreatId: sourceThreat?.id || null,
    sourceMeldId: sourceThreat?.meldId || null,
    requestedRound: boss.roundNumber,
    strengthened: !!strengthen,
    status: 'pending',
  };
  return true;
}

function createPendingRootPropagation(gameState) {
  const boss = gameState.boss;
  const pending = boss?.pendingRootPropagation;
  if (!pending || pending.status !== 'pending' || boss.propagationRound === boss.roundNumber || natureThreatSlots(gameState) <= 0) return null;
  const candidates = matriarchRootCandidates(gameState);
  const preferred = candidates.filter((entry) => entry.meldId !== pending.sourceMeldId);
  const target = chooseSeeded(preferred.length ? preferred : candidates, gameState, 367);
  boss.pendingRootPropagation = null;
  if (!target) return null;
  const threat = addNatureThreat(gameState, {
    type: 'root',
    sourceAbilityId: 'propagation',
    sourceIntentId: pending.id,
    sourceThreatId: pending.sourceThreatId,
    ...target,
    createdRound: boss.roundNumber,
    deadlineRound: boss.roundNumber,
    healAmount: 0,
    bloomAmount: 1,
    progressCardIds: [],
    contributorPlayerIds: [],
    strengthened: !!pending.strengthened,
    requiredContributorCount: pending.strengthened ? Math.min(2, (gameState.players || []).length) : 1,
    crownEventId: pending.strengthened ? boss.springCrown?.id || null : null,
    propagated: true,
  });
  if (!threat) return null;
  boss.propagationRound = boss.roundNumber;
  boss.propagationUsedThisRound = true;
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'naturePropagation',
    actionId: `propagation_${threat.id}_${boss.actionSequence}`,
    threatId: threat.id,
    sourceThreatId: pending.sourceThreatId,
    strengthened: !!threat.strengthened,
    outcome: threat.strengthened
      ? `Uma Raiz Faminta Fortalecida nasceu no jogo ${target.meldIndex + 1}.`
      : `Uma nova Raiz Faminta nasceu no jogo ${target.meldIndex + 1}.`,
  });
  boss.lastPropagationEventId = event.actionId;
  return event;
}

function failNatureThreat(gameState, threat, { bloom = threat?.bloomAmount || 0, heal = threat?.healAmount || 0, outcome = '' } = {}) {
  const boss = gameState.boss;
  if (!threat || threat.status !== 'active') return null;
  boss.natureFailureCountThisRound = (boss.natureFailureCountThisRound || 0) + 1;
  const crownActive = boss.springCrown?.status === 'active' && boss.springCrown.round === boss.roundNumber;
  if (crownActive && boss.natureFailureCountThisRound === 1) requestRootPropagation(gameState, threat);
  if (crownActive && boss.natureFailureCountThisRound === 2 && boss.pendingRootPropagation) {
    boss.pendingRootPropagation.strengthened = true;
    boss.springCrown.strengthenedCreated = true;
  }
  const event = completeNatureThreat(boss, threat, 'failed', outcome || 'A ameaca natural nao foi contida.');
  const bloomEvent = bloom ? changeMatriarchBloom(gameState, bloom, threat.name || 'Ameaca natural', `${threat.id}:bloom`) : null;
  const healEvent = heal
    ? healMatriarch(gameState, heal, threat.name || 'Ameaca natural', `${threat.id}:heal`)
    : null;
  if (event) {
    event.bloomApplied = bloomEvent?.amount || 0;
    event.healApplied = healEvent?.amount || 0;
    event.crownBonus = 0;
  }
  return event;
}

function succeedNatureThreat(gameState, threat, outcome = '') {
  return completeNatureThreat(gameState.boss, threat, 'success', outcome || 'A ameaca natural foi contida.');
}

function cancelNatureThreat(gameState, threat, outcome = '') {
  return completeNatureThreat(gameState.boss, threat, 'cancelled', outcome || 'A ameaca perdeu o alvo e foi cancelada.');
}

function resolveMatriarchPlayerDeadline(gameState, playerId) {
  const boss = gameState.boss;
  if (boss?.id !== 'matriarca_esmeralda') return [];
  const player = gameState.players?.find((entry) => entry.id === playerId);
  const events = [];
  for (const threat of activeNatureThreats(boss).filter((entry) => (
    entry.deadlinePlayerId === playerId
    && (!Number.isFinite(Number(entry.deadlineRound)) || Number(entry.deadlineRound) <= boss.roundNumber)
  ))) {
    if (['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type)) {
      const remainsInHand = !!player?.hand?.some((card) => card?.id === threat.cardId);
      const pollenHeal = threat.type === 'pollen' ? 40 : 0;
      events.push(remainsInHand
        ? failNatureThreat(gameState, threat, { bloom: 1, heal: pollenHeal, outcome: `${player?.name || 'O alvo'} terminou o turno com a carta marcada.` })
        : succeedNatureThreat(gameState, threat, `${player?.name || 'O alvo'} usou a carta marcada.`));
    } else if (threat.type === 'harvest') {
      const cards = player?.hand?.length || 0;
      if (cards <= 7) events.push(succeedNatureThreat(gameState, threat, `Colheita: ${cards} cartas, sem cura.`));
      else if (cards <= 10) events.push(failNatureThreat(gameState, threat, { bloom: 0, heal: 60, outcome: `Colheita: ${cards} cartas, cura de 60 HP.` }));
      else events.push(failNatureThreat(gameState, threat, { bloom: 1, heal: 100, outcome: `Colheita: ${cards} cartas, +1 Flor e cura de 100 HP.` }));
    }
  }
  return events.filter(Boolean);
}

function resolveMatriarchRound(gameState) {
  const boss = gameState.boss;
  if (boss?.id !== 'matriarca_esmeralda') return [];
  const roundResolutionId = `nature_round_${boss.roundNumber}`;
  if (boss.resolvedNatureRoundIds.includes(roundResolutionId)) return [];
  boss.resolvedNatureRoundIds.push(roundResolutionId);
  if (boss.resolvedNatureRoundIds.length > 30) boss.resolvedNatureRoundIds.splice(0, boss.resolvedNatureRoundIds.length - 30);
  const events = [];
  const discardTopId = gameState.discard?.[gameState.discard.length - 1]?.id || null;
  for (const threat of [...activeNatureThreats(boss)].filter((entry) => (
    !Number.isFinite(Number(entry.deadlineRound)) || Number(entry.deadlineRound) <= boss.roundNumber
  ))) {
    if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
      const event = failNatureThreat(gameState, threat, { bloom: 1, heal: 0, outcome: `O jogo ${Number(threat.meldIndex) + 1} nao alimentou a raiz.` });
      events.push(event);
      if (threat.type === 'root' || threat.type === 'royal_root') requestRootPropagation(gameState, threat);
    } else if (threat.type === 'graft') {
      const fed = new Set(threat.fedMeldIds || []).size;
      if (fed >= 2) events.push(succeedNatureThreat(gameState, threat, 'Os dois jogos alimentaram o Enxerto.'));
      else if (fed === 1) events.push(failNatureThreat(gameState, threat, { bloom: 1, heal: 0, outcome: 'Apenas um jogo alimentou o Enxerto.' }));
      else {
        events.push(failNatureThreat(gameState, threat, { bloom: 2, heal: 0, outcome: 'Nenhum jogo alimentou o Enxerto.' }));
        requestRootPropagation(gameState, threat);
      }
    } else if (threat.type === 'dew') {
      const uniqueCards = new Set(threat.countedCardIds || []).size;
      const healing = getRestorativeDewHealing(threat.announcedPhase || 1, uniqueCards);
      events.push(healing
        ? failNatureThreat(gameState, threat, { bloom: 0, heal: healing, outcome: `Orvalho Restaurador: ${uniqueCards} carta(s) reduziram a cura para ${healing} HP.` })
        : succeedNatureThreat(gameState, threat, 'O Orvalho foi totalmente dissipado pelas cartas jogadas.'));
    } else if (['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null) {
      if (discardTopId !== threat.discardCardId) {
        events.push(cancelNatureThreat(gameState, threat, 'O topo do lixo mudou sem entrar em uma mao.'));
      }
    }
  }
  const failedTwinGroups = new Map();
  events.filter((event) => event?.status === 'failed').forEach((event) => {
    const threat = boss.natureThreats.find((entry) => entry.id === event.threatId);
    if (threat?.type !== 'twin_root') return;
    const group = threat.sourceIntentId || threat.id;
    failedTwinGroups.set(group, (failedTwinGroups.get(group) || 0) + 1);
  });
  failedTwinGroups.forEach((count, group) => {
    const total = boss.natureThreats.filter((entry) => entry.type === 'twin_root' && (entry.sourceIntentId || entry.id) === group).length;
    if (total >= 2 && count >= 2) {
      const source = boss.natureThreats.find((entry) => entry.type === 'twin_root' && (entry.sourceIntentId || entry.id) === group);
      requestRootPropagation(gameState, source);
    }
  });
  if (boss.emeraldCocoon?.status === 'active') {
    const remaining = Math.max(0, Number(boss.emeraldCocoon.remaining) || 0);
    if (remaining) healMatriarch(gameState, Math.floor(remaining / 2), 'Casulo Esmeralda', `${boss.emeraldCocoon.id}:heal`);
    boss.emeraldCocoon.status = 'expired';
  }
  boss.emeraldCocoon = null;
  return events.filter(Boolean);
}

export function notifyBossDiscardTaken(gameState, playerId, takenCards = []) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda') return [];
  const takenIds = new Set(takenCards.map((card) => card?.id).filter(Boolean));
  const activated = [];
  for (const threat of activeNatureThreats(boss)) {
    if (!['pollen', 'royal_pollen'].includes(threat.type) || threat.targetPlayerId != null || !takenIds.has(threat.discardCardId)) continue;
    threat.targetPlayerId = playerId;
    threat.deadlinePlayerId = playerId;
    threat.cardId = threat.discardCardId;
    activated.push(threat);
  }
  return activated;
}

export function getBossNatureThreats(gameState) {
  const boss = normalizeBossState(gameState);
  return boss?.id === 'matriarca_esmeralda' ? activeNatureThreats(boss).map((threat) => ({ ...threat })) : [];
}

export function getBossNatureSeedCandidates(gameState) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda') return [];
  return matriarchSeedCandidates(gameState).map(({ player, card }) => ({
    playerId: player.id,
    cardId: card.id,
  }));
}

export function getBossNatureThreatSummaries(gameState) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda') return [];
  const threats = activeNatureThreats(boss);
  const deadlineValue = (threat) => Number.isFinite(Number(threat.deadlineRound)) ? Number(threat.deadlineRound) : boss.roundNumber;
  const urgentThreatId = threats
    .slice()
    .sort((a, b) => deadlineValue(a) - deadlineValue(b) || Number(a.createdRound || 0) - Number(b.createdRound || 0))[0]?.id || null;
  const names = {
    seed: 'Semente Viva',
    royal_seed: 'Semente Real',
    root: 'Raiz Faminta',
    twin_root: 'Trepadeira',
    royal_root: 'Raiz Real',
    pollen: 'Pólen do Lixo',
    royal_pollen: 'Pólen Real',
    graft: 'Enxerto',
    dew: 'Orvalho Restaurador',
    harvest: 'Colheita',
  };
  const playerName = (playerId) => gameState.players?.find((player) => player.id === playerId)?.name || 'Jogador';
  const cardLabel = (playerId, cardId) => {
    const card = gameState.players?.find((player) => player.id === playerId)?.hand?.find((entry) => entry?.id === cardId);
    return card ? `${card.rank}${card.suit}` : 'carta marcada';
  };

  return threats.map((threat) => {
    const uniqueDewCards = new Set(threat.countedCardIds || []).size;
    const predictedHeal = threat.type === 'dew'
      ? getRestorativeDewHealing(threat.announcedPhase || boss.phase, uniqueDewCards)
      : Math.max(0, Number(threat.healAmount) || 0);
    const target = ['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId != null
      ? `${playerName(threat.targetPlayerId)} · ${cardLabel(threat.targetPlayerId, threat.cardId)}`
      : ['root', 'twin_root', 'royal_root'].includes(threat.type)
        ? `Jogo ${Number(threat.meldIndex) + 1}`
        : threat.type === 'graft'
          ? (threat.meldIndexes || []).map((index) => `Jogo ${Number(index) + 1}`).join(' + ')
          : threat.type === 'harvest'
            ? playerName(threat.targetPlayerId)
            : ['pollen', 'royal_pollen'].includes(threat.type)
              ? 'Topo do lixo'
              : 'Mesa cooperativa';
    let condition = '';
    let consequence = '';
    if (['seed', 'royal_seed'].includes(threat.type)) {
      condition = `Jogar ${cardLabel(threat.targetPlayerId, threat.cardId)} antes do fim do turno.`;
      consequence = `Falha: +${threat.bloomAmount || 1} Flor, sem cura.`;
    } else if (['pollen', 'royal_pollen'].includes(threat.type)) {
      condition = threat.targetPlayerId == null ? 'Não pegar o lixo, ou usar a carta contaminada no mesmo turno.' : `Jogar ${cardLabel(threat.targetPlayerId, threat.cardId)} neste turno.`;
      consequence = threat.type === 'pollen' ? 'Falha: +1 Flor e cura 40 HP.' : 'Falha: +1 Flor, sem cura.';
    } else if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
      const contributors = new Set(threat.contributorPlayerIds || []).size;
      condition = threat.strengthened
        ? `Cada cooperador deve adicionar 1 carta legal (${contributors}/${threat.requiredContributorCount || 2}).`
        : 'Adicionar 1 carta legal ao jogo marcado nesta rodada.';
      consequence = `Falha: +${threat.bloomAmount || 1} Flor e pode propagar uma Raiz.`;
    } else if (threat.type === 'graft') {
      const fed = new Set(threat.fedMeldIds || []).size;
      condition = `Alimentar os dois jogos ligados (${fed}/2).`;
      consequence = fed ? 'Falha parcial: +1 Flor, sem cura.' : 'Falha total: +2 Flores, sem cura, e pode propagar.';
    } else if (threat.type === 'dew') {
      condition = `Cartas novas na mesa: ${uniqueDewCards}/6. A cura cai por faixas e zera com 6 cartas.`;
      consequence = `Cura prevista: ${predictedHeal} HP.`;
    } else if (threat.type === 'harvest') {
      condition = 'Encerrar o turno com no máximo 7 cartas.';
      consequence = '8–10: cura 60 HP · 11+: +1 Flor e cura 100 HP.';
    }
    const deadline = threat.deadlinePlayerId != null
      ? `Fim do turno de ${playerName(threat.deadlinePlayerId)} · rodada ${deadlineValue(threat)}`
      : `Fim da rodada ${deadlineValue(threat)}`;
    return {
      id: threat.id,
      type: threat.type,
      name: names[threat.type] || 'Ameaça natural',
      target,
      deadline,
      condition,
      consequence,
      predictedHeal,
      urgent: threat.id === urgentThreatId,
    };
  });
}

export function getBossNaturePriorities(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda') return null;
  const player = (gameState.players || []).find((entry) => entry.id === playerId);
  if (!player) return null;
  const threats = activeNatureThreats(boss);
  const markedCardIds = threats
    .filter((threat) => threat.targetPlayerId === playerId && ['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type))
    .map((threat) => threat.cardId)
    .filter((cardId) => player.hand?.some((card) => card?.id === cardId));
  const meldIds = new Set();
  threats.forEach((threat) => {
    if (['root', 'twin_root', 'royal_root'].includes(threat.type) && threat.meldId) meldIds.add(threat.meldId);
    if (threat.type === 'graft') {
      const fed = new Set(threat.fedMeldIds || []);
      (threat.meldIds || []).filter((meldId) => !fed.has(meldId)).forEach((meldId) => meldIds.add(meldId));
    }
  });
  const meldIndexes = (gameState.teams?.[player.teamId]?.melds || [])
    .map((meld, meldIndex) => ({ meldIndex, meldId: resolveBossMeldId(gameState, player.teamId, meldIndex, false) }))
    .filter(({ meldId }) => meldId && meldIds.has(meldId))
    .map(({ meldIndex }) => meldIndex);
  return {
    urgent: boss.bloom >= 4,
    bloom: boss.bloom,
    markedCardIds,
    meldIndexes,
    harvestActive: threats.some((threat) => threat.type === 'harvest' && threat.targetPlayerId === playerId),
    pollenOnDiscard: threats.some((threat) => ['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null),
  };
}

export function getBossDominatrixPriorities(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora') return null;
  const player = (gameState.players || []).find((entry) => entry.id === playerId);
  if (!player) return null;

  const priorityMeldIds = new Set();
  (boss.possessions || []).forEach((possession) => {
    if (possession.teamId !== player.teamId) return;
    if (!(possession.contributorPlayerIds || []).includes(playerId) && possession.meldId) {
      priorityMeldIds.add(possession.meldId);
    }
  });
  (boss.activeOrders || [])
    .filter((order) => order.status === 'active' && order.targetPlayerId === playerId)
    .forEach((order) => {
      if (['feed_specific_meld', 'evolve_specific_meld'].includes(order.type) && order.meldId) {
        priorityMeldIds.add(order.meldId);
      }
    });

  const meldIndexes = (gameState.teams?.[player.teamId]?.melds || [])
    .map((meld, meldIndex) => ({ meldIndex, meldId: resolveBossMeldId(gameState, player.teamId, meldIndex, false) }))
    .filter(({ meldId }) => meldId && priorityMeldIds.has(meldId))
    .map(({ meldIndex }) => meldIndex);
  const discardOrder = activeOrderForPlayer(boss, playerId, 'discard_suit');
  return {
    urgent: getBossChains(gameState, playerId) >= 3,
    meldIndexes,
    discardSuit: discardOrder?.suit || null,
    discardSuitLabel: discardOrder?.suitLabel || null,
    orderType: activeOrderForPlayer(boss, playerId)?.type || null,
  };
}

export function getBossMeldNatureThreats(gameState, teamId, meldIndex) {
  if (teamId !== 0) return [];
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'matriarca_esmeralda') return [];
  const meldId = resolveBossMeldId(gameState, teamId, meldIndex, false);
  return activeNatureThreats(boss)
    .filter((threat) => threat.meldId === meldId || threat.meldIds?.includes(meldId))
    .map((threat) => ({ ...threat, matchedMeldId: meldId }));
}

function dominatrixDefeatIfNeeded(gameState) {
  const boss = gameState.boss;
  if (boss.id !== 'dominadora' || boss.result) return false;
  const dominated = (gameState.players || []).filter((player) => (boss.chainsByPlayer[player.id] || 0) >= 4);
  if (dominated.length < gameState.players.length) return false;
  boss.result = {
    victory: false,
    reason: 'both_players_dominated',
    title: 'Vontades Subjugadas',
    detail: 'Os dois cooperadores chegaram a 4 Chicotes ao mesmo tempo.',
  };
  return true;
}

function changeChains(gameState, playerId, amount, reason = '') {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora' || playerId == null || !amount) return 0;
  const before = boss.chainsByPlayer[playerId] || 0;
  if (amount > 0 && boss.phase === 3 && before >= 4) {
    const partner = (gameState.players || []).find((player) => player.id !== playerId);
    if (partner && (boss.chainsByPlayer[partner.id] || 0) < 4) {
      const overflowApplied = changeChains(gameState, partner.id, amount, `overflow:${reason}`);
      if (overflowApplied) {
        boss.actionSequence += 1;
        recordEvent(boss, {
          type: 'chainOverflow',
          actionId: `chain_overflow_${playerId}_${partner.id}_${boss.actionSequence}`,
          originalTargetPlayerId: playerId,
          overflowTargetPlayerId: partner.id,
          amount: overflowApplied,
          reason,
          outcome: `O Chicote destinado ao alvo dominado transbordou para ${partner.name || 'o parceiro'}.`,
        });
      }
      return overflowApplied;
    }
    dominatrixDefeatIfNeeded(gameState);
    return 0;
  }
  const after = clamp(before + amount, 0, 4);
  boss.chainsByPlayer[playerId] = after;
  dominatrixDefeatIfNeeded(gameState);
  if (after !== before) {
    boss.actionSequence += 1;
    recordEvent(boss, {
      type: 'chainChange',
      actionId: `chain_${playerId}_${boss.actionSequence}`,
      playerId,
      amount: after - before,
      chains: after,
      reason,
    });
  }
  return after - before;
}

export function getBossChains(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  return boss?.id === 'dominadora' ? boss.chainsByPlayer[playerId] || 0 : 0;
}

export function isBossPlayerDominated(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora') return false;
  return (boss.chainsByPlayer[playerId] || 0) >= 4 || (boss.currentIntent?.abilityId === 'absolute_control' && boss.currentIntent.payload?.targetPlayerId === playerId);
}

export function isBossCardBlocked(gameState, playerId, cardId, action = 'play') {
  const boss = normalizeBossState(gameState);
  return isCardBlockedByBossState(boss, playerId, cardId, action);
}

export function getBossCardBlockFeedback(gameState, playerId, cardId, action = 'discard') {
  const boss = normalizeBossState(gameState);
  if (!boss || !cardId || !isCardBlockedByBossState(boss, playerId, cardId, action)) return null;

  const natureThreat = activeNatureThreats(boss).find((threat) => (
    threat.targetPlayerId === playerId && threat.cardId === cardId
  ));
  if (natureThreat && ['seed', 'royal_seed'].includes(natureThreat.type)) {
    return {
      effect: 'nature-seed',
      reason: 'matriarch_seed',
      message: '🌱 Esta carta é uma Semente Viva e não pode ser descartada. Jogue-a antes do fim do próximo turno.',
    };
  }
  if (natureThreat && ['pollen', 'royal_pollen'].includes(natureThreat.type)) {
    return {
      effect: 'nature-pollen',
      reason: 'matriarch_pollen',
      message: '🌿 Esta carta está contaminada pelo Pólen da Matriarca e precisa ser usada neste turno. Ela não pode ser descartada.',
    };
  }

  if (boss.id === 'dominadora') {
    return {
      effect: getBossCardEffect(gameState, playerId, cardId) || 'locked',
      reason: 'dominatrix_lock',
      message: action === 'play'
        ? '⛓ Esta carta está presa pela Dominadora e não pode ser usada nesta jogada.'
        : '⛓ Esta carta está sob controle da Dominadora e não pode ser descartada.',
    };
  }

  return {
    effect: 'locked',
    reason: 'boss_lock',
    message: 'Esta carta está temporariamente bloqueada para esta ação.',
  };
}

export function validateBossClosedDiscardSelection(gameState, playerId, selectedCards = []) {
  const blockedCard = selectedCards.find((card) => getBossCardBlockFeedback(gameState, playerId, card?.id, 'play'));
  if (!blockedCard) return { allowed: true, message: '' };
  const feedback = getBossCardBlockFeedback(gameState, playerId, blockedCard.id, 'play');
  return {
    allowed: false,
    blockedCardId: blockedCard.id,
    reason: feedback.reason,
    message: feedback.message,
  };
}

export function getBossCardEffect(gameState, playerId, cardId) {
  const boss = normalizeBossState(gameState);
  if (!boss || !cardId) return null;
  if (boss.id === 'matriarca_esmeralda') {
    const threat = activeNatureThreats(boss).find((entry) => entry.targetPlayerId === playerId && entry.cardId === cardId);
    if (!threat) return null;
    return ['pollen', 'royal_pollen'].includes(threat.type) ? 'nature-pollen' : 'nature-seed';
  }
  if (boss.id !== 'dominadora') return null;
  const intent = boss.currentIntent;
  if (intent?.abilityId === 'exposure' && intent.payload?.targetPlayerId === playerId && intent.payload?.cardId === cardId) return 'exposed';
  if (boss.effects.some((effect) => effect.id === 'choice_exposure' && effect.playerId === playerId && effect.cardId === cardId)) return 'exposed';
  return isBossCardBlocked(gameState, playerId, cardId, 'play') ? 'locked' : null;
}

export function canBossCreateMeld(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora') return true;
  if ((boss.chainsByPlayer[playerId] || 0) >= 3 || isBossPlayerDominated(gameState, playerId)) return false;
  const intent = boss.currentIntent;
  if (intent?.abilityId !== 'hands_tied') return true;
  return intent.payload?.teamMeldAvailable !== false;
}

export function canBossUseMeld(gameState, playerId, meldIndex) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora') return true;
  const intent = boss.currentIntent;
  if (intent?.abilityId !== 'separation') return true;
  const owner = intent.payload?.meldOwners?.[meldIndex];
  return owner == null || owner === playerId;
}

function finishDominatrixOrder(gameState, order, status, outcome, { addChain = false } = {}) {
  const boss = gameState.boss;
  if (!order || order.status !== 'active') return null;
  order.status = status;
  if (addChain) changeChains(gameState, order.targetPlayerId, 1, `${order.sourceAbilityId || 'order'}:${order.type}`);
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'dominatrixOrder',
    actionId: `order_${order.id}_${status}_${boss.actionSequence}`,
    orderId: order.id,
    orderType: order.type,
    playerId: order.targetPlayerId,
    status,
    chainApplied: !!addChain,
    outcome,
  });
  order.resolvedEventId = event.actionId;
  return event;
}

function activeOrderForPlayer(boss, playerId, type = null) {
  return (boss?.activeOrders || []).find((order) => order.status === 'active'
    && order.targetPlayerId === playerId
    && (!type || order.type === type)) || null;
}

function resolveOrdersFromMeldAction(gameState, playerId, meldId, isNewMeld, oldKind, newKind, cardsAdded = []) {
  const boss = gameState.boss;
  if (boss?.id !== 'dominadora' || playerId == null) return [];
  const events = [];
  for (const order of (boss.activeOrders || []).filter((entry) => entry.status === 'active' && entry.targetPlayerId === playerId)) {
    if (order.type === 'discard_suit' && cardsAdded.some((card) => order.eligibleCardIds?.includes(card?.id))) {
      order.ownOptionsConsumed = true;
    }
    if (order.type === 'no_new_meld' && isNewMeld) {
      events.push(finishDominatrixOrder(gameState, order, 'disobeyed', 'A ordem proibia criar um jogo novo.', { addChain: true }));
    } else if (order.type === 'feed_specific_meld') {
      events.push(finishDominatrixOrder(
        gameState,
        order,
        order.meldId === meldId ? 'obeyed' : 'disobeyed',
        order.meldId === meldId ? 'O jogo ordenado foi alimentado primeiro.' : 'Outro jogo foi alimentado antes do jogo ordenado.',
        { addChain: order.meldId !== meldId },
      ));
    } else if (order.type === 'evolve_specific_meld' && order.meldId === meldId && MELD_TIER[newKind] > MELD_TIER[oldKind]) {
      events.push(finishDominatrixOrder(gameState, order, 'obeyed', 'O jogo ordenado evoluiu de tier.'));
    }
  }
  return events.filter(Boolean);
}

export function notifyBossCardDiscarded(gameState, playerId, card) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora' || !card?.id) return [];
  const events = [];
  for (const order of (boss.activeOrders || []).filter((entry) => entry.status === 'active'
    && entry.targetPlayerId === playerId && entry.type === 'discard_suit')) {
    const player = gameState.players?.find((entry) => entry.id === playerId);
    const currentlyPossible = legalDiscardCards(gameState, player)
      .some((entry) => !entry.joker && entry.suit === order.suit);
    if (!card.joker && card.suit === order.suit) {
      events.push(finishDominatrixOrder(gameState, order, 'obeyed', `A ordem de descartar ${order.suitLabel || order.suit} foi cumprida.`));
    } else if (!currentlyPossible && order.ownOptionsConsumed) {
      events.push(finishDominatrixOrder(gameState, order, 'disobeyed', 'O jogador usou as próprias opções do naipe e tornou a ordem impossível.', { addChain: true }));
    } else if (!currentlyPossible) {
      events.push(finishDominatrixOrder(gameState, order, 'cancelled', 'A ordem perdeu todas as opções válidas por uma mudança externa.'));
    } else {
      events.push(finishDominatrixOrder(gameState, order, 'disobeyed', `O jogador descartou outro naipe e desobedeceu a ordem.`, { addChain: true }));
    }
  }
  return events.filter(Boolean);
}

export function getBossInterdictAttempt(gameState, teamId, meldIndex, oldKind, newKind) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'dominadora' || teamId !== 0 || MELD_TIER[newKind] <= MELD_TIER[oldKind]) return null;
  const meldId = resolveBossMeldId(gameState, teamId, meldIndex, false);
  const interdict = (boss.interdicts || []).find((entry) => entry.status === 'active'
    && (entry.meldId ? entry.meldId === meldId : entry.meldIndex === meldIndex));
  return interdict ? { ...interdict } : null;
}

export function resolveBossInterdictAttempt(gameState, playerId, interdictId, decision) {
  const boss = normalizeBossState(gameState);
  const interdict = boss?.id === 'dominadora'
    ? (boss.interdicts || []).find((entry) => entry.id === interdictId && entry.status === 'active')
    : null;
  if (!interdict || !['obey', 'disobey'].includes(decision)) return null;
  const mustObey = (boss.chainsByPlayer[playerId] || 0) >= 4;
  const finalDecision = mustObey ? 'obey' : decision;
  interdict.status = finalDecision === 'obey' ? 'obeyed' : 'disobeyed';
  if (finalDecision === 'disobey') changeChains(gameState, playerId, 1, 'interdict');
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'interdictDecision',
    actionId: `interdict_${interdict.id}_${boss.actionSequence}`,
    interdictId: interdict.id,
    playerId,
    decision: finalDecision,
    allowEvolution: finalDecision === 'disobey',
    chainApplied: finalDecision === 'disobey',
    outcome: finalDecision === 'obey'
      ? 'A tentativa de evolucao foi cancelada e o Interdito foi consumido.'
      : 'A evolucao foi concluida por desobediencia; 1 Chicote foi aplicado.',
  });
  interdict.resolvedEventId = event.actionId;
  return event;
}

export function getBossCreditLimitQuote(gameState, cards = [], { creditEligibleCardIds = null, cardOriginsById = null } = {}) {
  const boss = normalizeBossState(gameState);
  const limit = boss?.id === 'banker' ? boss.creditLimit : null;
  if (!limit || limit.status !== 'active' || limit.round !== boss.roundNumber) return null;
  const counted = new Set(limit.countedCardIds || []);
  const eligible = Array.isArray(creditEligibleCardIds) ? new Set(creditEligibleCardIds.filter(Boolean)) : null;
  const newCardIds = [...new Set((cards || []).map((card) => card?.id).filter((cardId) => {
    if (!cardId || counted.has(cardId)) return false;
    if (eligible && !eligible.has(cardId)) return false;
    if (cardOriginsById && cardOriginsById[cardId] !== 'hand') return false;
    return true;
  }))];
  const countBefore = counted.size;
  const countAfter = countBefore + newCardIds.length;
  const allowance = Math.max(0, Number(limit.allowance) || 0);
  const debtPerCard = Math.max(0, Number(limit.debtPerCard) || 1);
  const maxCharge = Math.max(0, Number(limit.maxCharge) || 0);
  const chargedDebt = Math.max(0, Number(limit.chargedDebt) || 0);
  const excessBefore = Math.max(0, countBefore - allowance);
  const excessAfter = Math.max(0, countAfter - allowance);
  const rawDebt = Math.max(0, excessAfter - excessBefore) * debtPerCard;
  const debt = Math.max(0, Math.min(rawDebt, maxCharge - chargedDebt));
  return {
    round: boss.roundNumber,
    allowance,
    countBefore,
    countAfter,
    newCardIds,
    excessCards: Math.max(0, excessAfter - excessBefore),
    debt,
    debtPerCard,
    chargedDebt,
    maxCharge,
  };
}

function confirmBankerDebtDefeat(gameState, sourceActionId = 'debt') {
  const boss = gameState?.boss;
  if (!boss || boss.id !== 'banker') return null;
  boss.danger = clamp(Number(boss.danger) || 0, 0, boss.maxDanger);
  if (boss.danger < boss.maxDanger) return null;
  const actionId = `banker_debt_defeat_${sourceActionId}`;
  const existing = (boss.eventLog || []).find((event) => event.actionId === actionId) || null;
  if (!boss.result) {
    boss.result = {
      victory: false,
      reason: 'max_debt',
      title: 'Execucao da Divida',
      detail: 'A Divida coletiva chegou ao limite.',
    };
    boss.stats.finalDebt = boss.danger;
  }
  if (existing) return existing;
  return recordEvent(boss, {
    type: 'bossDefeat',
    actionId,
    reason: 'max_debt',
    danger: boss.danger,
    outcome: 'A Divida coletiva chegou ao limite.',
  });
}

function botCardUtility(gameState, player, card) {
  if (!card) return Number.POSITIVE_INFINITY;
  let utility = bossCardDamage(card);
  if (card.joker) utility += 35;
  else if (String(card.rank) === '2' || String(card.rank) === 'A') utility += 12;
  const melds = gameState.teams?.[player?.teamId]?.melds || [];
  if (melds.some((meld) => isValidBossSequence([...(meld || []), card]))) utility += 30;
  if (activeNatureThreats(gameState.boss).some((threat) => threat.targetPlayerId === player?.id && threat.cardId === card.id)) utility += 35;
  return utility;
}

export function chooseBossFixedInterestBotOption(gameState, choice) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.id !== 'banker' || !choice?.options?.length) return choice?.options?.[0] || null;
  if (choice.type === 'banker_collateral_card') {
    const player = (gameState.players || []).find((entry) => entry.id === choice.playerId);
    return choice.options
      .filter((option) => option.startsWith('card:'))
      .map((option) => ({ option, card: player?.hand?.find((entry) => entry?.id === option.slice(5)) }))
      .filter((entry) => entry.card)
      .sort((a, b) => botCardUtility(gameState, player, a.card) - botCardUtility(gameState, player, b.card))[0]?.option
      || choice.options[0];
  }
  if (choice.type !== 'fixed_interest_payment') return choice.options[0];
  const amount = Math.max(0, Number(choice.amount) || 0);
  const collateralAmount = Math.max(0, Number(choice.collateralAmount) || 0);
  const candidates = choice.options.filter((option) => option.startsWith('guarantee:')).map((option) => {
    const playerId = Number(option.split(':')[1]);
    const player = (gameState.players || []).find((entry) => entry.id === playerId);
    const card = (player?.hand || []).filter((entry) => entry?.id)
      .sort((a, b) => botCardUtility(gameState, player, a) - botCardUtility(gameState, player, b))[0];
    return { option, utility: card ? botCardUtility(gameState, player, card) : Number.POSITIVE_INFINITY };
  }).filter((entry) => Number.isFinite(entry.utility)).sort((a, b) => a.utility - b.utility);
  if (!candidates.length) return 'full';
  const fullRisk = (boss.danger + amount) / Math.max(1, boss.maxDanger);
  const savings = Math.max(0, amount - collateralAmount);
  if (fullRisk >= 1 || fullRisk >= 0.72 || candidates[0].utility <= savings * 12) return candidates[0].option;
  return 'full';
}

export function shouldBossBotAcceptCreditPlay(gameState, playerId, {
  cards = [],
  oldKind = 'simple',
  newKind = 'simple',
  creditEligibleCardIds = null,
} = {}) {
  const boss = normalizeBossState(gameState);
  const quote = getBossCreditLimitQuote(gameState, cards, { creditEligibleCardIds });
  if (!boss || boss.id !== 'banker' || !quote?.debt) return true;
  if (boss.danger + quote.debt >= boss.maxDanger) return false;
  const eligible = creditEligibleCardIds ? new Set(creditEligibleCardIds) : null;
  const cardDamage = cards.filter((card) => !eligible || eligible.has(card?.id)).reduce((sum, card) => sum + bossCardDamage(card), 0);
  const tierDamage = Math.max(0, (BOSS_DAMAGE_BY_KIND[newKind] || 0) - (BOSS_DAMAGE_BY_KIND[oldKind] || 0));
  const debtRelief = Math.max(0, (DEBT_REDUCTION_BY_KIND[newKind] || 0) - (DEBT_REDUCTION_BY_KIND[oldKind] || 0));
  const risk = (boss.danger + quote.debt) / Math.max(1, boss.maxDanger);
  const decisive = boss.hp <= cardDamage + tierDamage
    || (MELD_TIER[newKind] || 0) >= 2
    || debtRelief >= quote.debt
    || (gameState.stock?.length || 0) <= 8;
  if (decisive) return true;
  const value = cardDamage + tierDamage + debtRelief * 10;
  const cost = quote.debt * (8 + risk * 14);
  return value >= cost;
}

function botPileCardValue(card) {
  if (!card) return 0;
  if (card.joker) return 50;
  if (['A', '2'].includes(String(card.rank))) return 20;
  if (['8', '9', '10', 'J', 'Q', 'K'].includes(String(card.rank))) return 10;
  return 5;
}

export function shouldBossBotTakeDiscard(gameState, playerId, { intent = null, naturePlan = null } = {}) {
  const boss = normalizeBossState(gameState);
  if (!intent?.wants) return false;
  const surcharge = boss?.id === 'banker' ? getBossDiscardSurcharge(gameState) : null;
  const pile = (gameState.discard || []).filter(Boolean);
  const pileValue = pile.reduce((sum, card) => sum + botPileCardValue(card), 0);
  const immediatePollenUse = !!intent && intent.usesTopImmediately !== false && ['new', 'extend'].includes(intent.action);
  if (naturePlan?.pollenOnDiscard && naturePlan.bloom >= 4 && !immediatePollenUse) return false;
  if (!surcharge) return !naturePlan?.pollenOnDiscard || immediatePollenUse;
  if (boss.danger + surcharge.amount >= boss.maxDanger) return false;
  const risk = (boss.danger + surcharge.amount) / Math.max(1, boss.maxDanger);
  const decisive = !!intent.decisive || pile.length >= 5 || ['real', 'asas'].includes(intent.newKind);
  const value = pileValue + (decisive ? 55 : 0) + (naturePlan?.pollenOnDiscard && immediatePollenUse ? 20 : 0);
  const cost = surcharge.amount * (10 + risk * 14);
  return value >= cost;
}

export function getBossPendingChoice(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  return boss?.pendingChoices?.find((choice) => choice.playerId === playerId) || null;
}

export function hasPendingBossChoices(gameState) {
  return !!normalizeBossState(gameState)?.pendingChoices?.length;
}

export function canBossPerformCommonAction(gameState) {
  const boss = normalizeBossState(gameState);
  return !boss?.result && !hasPendingBossChoices(gameState) && !isBossTurnActive(gameState);
}

function drawChoiceCards(gameState, playerId, count) {
  const player = gameState.players?.find((entry) => entry.id === playerId);
  if (!player) return [];
  const drawnCards = [];
  while (drawnCards.length < count && gameState.stock?.length) {
    const card = gameState.stock.pop();
    if (!card) continue;
    player.hand.push(card);
    drawnCards.push(card);
  }
  return drawnCards;
}

function availableChoiceDraws(gameState) {
  const stockCount = (gameState.stock || []).filter(Boolean).length;
  const deadCount = (gameState.deadPiles || []).reduce((sum, pile) => sum + (pile || []).filter(Boolean).length, 0);
  return stockCount + deadCount;
}

function recycleChoiceDead(gameState) {
  if (gameState.stock?.length) return true;
  const index = gameState.deadPiles?.findIndex((pile) => pile?.length) ?? -1;
  if (index < 0) return false;
  gameState.stock = gameState.deadPiles[index].filter(Boolean);
  gameState.deadPiles[index] = [];
  return gameState.stock.length > 0;
}

function compactCardLabel(card) {
  if (!card) return '';
  if (card.joker) return 'JOKER';
  return `${card.rank || ''}${card.suit || ''}` || card.id || '';
}

export function resolveBossChoice(gameState, playerId, option) {
  const boss = normalizeBossState(gameState);
  const choice = getBossPendingChoice(gameState, playerId);
  if (!boss || !choice || !choice.options?.includes(option)) return null;

  if (boss.id === 'banker') {
    let outcome = '';
    let dangerDelta = 0;
    let collateralPlayerId = null;
    let collateralCardId = null;
    if (choice.type === 'fixed_interest_payment' && option === 'full') {
      boss.pendingChoices = boss.pendingChoices.filter((entry) => entry.id !== choice.id);
      dangerDelta = choice.amount;
      outcome = `Juros Fixos: Divida +${dangerDelta}.`;
    } else if (choice.type === 'fixed_interest_payment' && option.startsWith('guarantee:')) {
      collateralPlayerId = Number(option.split(':')[1]);
      const guarantor = gameState.players?.find((player) => player.id === collateralPlayerId);
      const cardOptions = (guarantor?.hand || []).filter((card) => card?.id).map((card) => `card:${card.id}`);
      if (!guarantor || boss.vaultsByPlayer[collateralPlayerId] || !cardOptions.length) return null;
      boss.pendingChoices = boss.pendingChoices.filter((entry) => entry.id !== choice.id);
      enqueueChoice(boss, collateralPlayerId, 'banker_collateral_card', cardOptions, {
        amount: choice.amount,
        collateralAmount: choice.collateralAmount,
      });
      outcome = `${guarantor.name} foi escolhido como garantidor e deve enviar uma carta ao Cofre.`;
    } else if (choice.type === 'banker_collateral_card' && option.startsWith('card:')) {
      const guarantor = gameState.players?.find((player) => player.id === playerId);
      collateralCardId = option.slice(5);
      const cardIndex = guarantor?.hand?.findIndex((card) => card?.id === collateralCardId) ?? -1;
      if (!guarantor || cardIndex < 0 || boss.vaultsByPlayer[playerId]) return null;
      boss.pendingChoices = boss.pendingChoices.filter((entry) => entry.id !== choice.id);
      const [card] = guarantor.hand.splice(cardIndex, 1);
      boss.vaultsByPlayer[playerId] = {
        playerId,
        card,
        sourceAbilityId: 'fixed_interest',
        storedAtRound: boss.roundNumber,
        requiredDraw: true,
      };
      dangerDelta = choice.collateralAmount;
      outcome = `${guarantor.name} enviou ${compactCardLabel(card)} ao Cofre. Juros Fixos: Divida +${dangerDelta}.`;
    } else {
      return null;
    }

    boss.danger = clamp(boss.danger + dangerDelta, 0, boss.maxDanger);
    boss.actionSequence += 1;
    const event = recordEvent(boss, {
      type: 'bossChoice',
      actionId: `choice_${boss.actionSequence}`,
      playerId,
      choiceType: choice.type,
      option,
      outcome,
      dangerDelta,
      danger: boss.danger,
      dangerChangeLabel: dangerDelta ? `Juros Fixos: Divida +${dangerDelta}` : '',
      collateralPlayerId,
      collateralCardId,
    });
    confirmBankerDebtDefeat(gameState, event.actionId);
    if (!boss.pendingChoices.length && !boss.currentIntent && !boss.result) {
      const awaiting = boss.awaitingBossTurn || {};
      beginBossTurn(gameState, {
        first: !!awaiting.first,
        phaseChanged: !!awaiting.phaseChanged,
        resultEvent: event,
      });
    }
    return event;
  }

  if (boss.id !== 'dominadora') return null;
  let outcome = '';
  let drawnCards = [];
  let lockedCard = null;
  let lockedCardId = null;
  if (option === 'draw2') {
    if (availableChoiceDraws(gameState) < 2) {
      changeChains(gameState, playerId, 1, `${choice.type}_draw_unavailable`);
      outcome = 'Compra indisponivel: 1 Chicote recebido.';
    } else {
      if (!gameState.stock?.length) recycleChoiceDead(gameState);
      drawnCards = drawChoiceCards(gameState, playerId, 2);
      if (drawnCards.length < 2 && recycleChoiceDead(gameState)) {
        drawnCards.push(...drawChoiceCards(gameState, playerId, 2 - drawnCards.length));
      }
      if (drawnCards.length === 2) {
        const phase3Exposure = choice.type === 'forced_choice' && Number(choice.announcedPhase) === 3;
        boss.choiceDrawnCardIdsByPlayer[playerId] = drawnCards.map((card) => card.id);
        drawnCards.forEach((lockedCard) => {
          boss.effects.push({
            id: phase3Exposure ? 'choice_exposure' : 'choice_lock',
            source: choice.type,
            playerId,
            cardId: lockedCard.id,
            expiresAfterTurn: true,
            appliedAtRound: boss.roundNumber,
            chainIfHeld: phase3Exposure,
          });
        });
        lockedCardId = drawnCards[0]?.id || null;
        outcome = phase3Exposure
          ? `2 cartas compradas; ${drawnCards.map(compactCardLabel).join(' e ')} podem ser jogadas, mas cada uma que permanecer na mão ao fim do próximo turno aplicará 1 Chicote.`
          : `2 cartas compradas; ${drawnCards.map(compactCardLabel).join(' e ')} ficaram presas durante o proximo turno completo.`;
      } else {
        drawnCards.forEach((card) => {
          const player = gameState.players?.find((entry) => entry.id === playerId);
          const index = player?.hand?.findIndex((entry) => entry.id === card.id) ?? -1;
          if (index >= 0) player.hand.splice(index, 1);
          gameState.stock.push(card);
        });
        drawnCards = [];
        changeChains(gameState, playerId, 1, `${choice.type}_draw_incomplete`);
        outcome = 'Compra incompleta cancelada: 1 Chicote recebido.';
      }
    }
  }
  else if (option === 'chain') {
    changeChains(gameState, playerId, 1, choice.type);
    outcome = '1 Chicote recebido.';
  } else if (option === 'order' && choice.type === 'forced_choice' && choice.order?.type) {
    const order = {
      ...choice.order,
      id: `order_${choice.id}`,
      sourceAbilityId: 'forced_choice',
      targetPlayerId: playerId,
      createdRound: boss.roundNumber,
      deadlinePlayerId: playerId,
      status: 'active',
      resolvedEventId: null,
      eligibleCardIds: choice.order.type === 'discard_suit'
        ? legalDiscardCards(gameState, gameState.players?.find((entry) => entry.id === playerId))
          .filter((card) => !card.joker && card.suit === choice.order.suit)
          .map((card) => card.id)
        : [],
    };
    boss.activeOrders.push(order);
    outcome = `Ordem aceita: ${order.label}.`;
  } else if (option === 'lock_card') {
    const player = gameState.players.find((entry) => entry.id === playerId);
    const card = chooseSeeded((player?.hand || []).filter((entry) => entry?.id && canApplyDiscardLock(gameState, player, [entry.id])), gameState, 97);
    if (!card) return null;
    lockedCard = card;
    lockedCardId = card.id;
    boss.effects.push({
      id: 'choice_lock',
      source: choice.type,
      playerId,
      cardId: card.id,
      expiresAfterTurn: true,
      appliedAtRound: boss.roundNumber,
    });
    outcome = `${compactCardLabel(card)} ficou presa durante o proximo turno completo.`;
  } else if (option === 'break_meld') {
    const melds = gameState.teams?.[0]?.melds || [];
    const meld = melds.find((entry) => entry?.length >= 7);
    const player = gameState.players.find((entry) => entry.id === playerId);
    if (meld && player) {
      player.hand.push(meld.pop());
      outcome = '1 carta voltou de uma canastra para a mão.';
    } else {
      changeChains(gameState, playerId, 1, choice.type);
      outcome = 'Sem canastra disponível: 1 Chicote recebido.';
    }
  } else return null;
  boss.pendingChoices = boss.pendingChoices.filter((entry) => entry.id !== choice.id);
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'bossChoice',
    actionId: `choice_${boss.actionSequence}`,
    playerId,
    choiceType: choice.type,
    option,
    outcome,
    drawnCount: drawnCards.length,
    drawnCardIds: drawnCards.map((card) => card.id),
    lockedCardId,
    lockedCardIds: lockedCard ? [lockedCard.id] : drawnCards.map((card) => card.id),
    lockedCardLabel: compactCardLabel(lockedCard || drawnCards.find((card) => card.id === lockedCardId)),
    lockedCardLabels: lockedCard ? [compactCardLabel(lockedCard)] : drawnCards.map(compactCardLabel),
    exposedCardIds: drawnCards.filter((card) => boss.effects.some((effect) => effect.id === 'choice_exposure' && effect.cardId === card.id)).map((card) => card.id),
    order: option === 'order' ? { ...choice.order } : null,
  });
  const resumesPlayers = !boss.pendingChoices.length
    && boss.awaitingBossTurn?.resumePlayersAfterChoice
    && boss.awaitingBossTurn.flowId === boss.bossFlow?.id;
  if (resumesPlayers) {
    boss.currentIntent = null;
    boss.awaitingBossTurn = false;
    boss.bossFlow.stage = 'players';
    boss.bossFlow.startedAt = Date.now();
    boss.bossFlow.endsAt = 0;
    boss.bossFlow.eventActionId = null;
    boss.presentationUntil = 0;
  }
  if (!boss.pendingChoices.length && !boss.currentIntent && !boss.result) {
    if (!resumesPlayers) {
      const awaiting = boss.awaitingBossTurn || {};
      beginBossTurn(gameState, {
        first: !!awaiting.first,
        phaseChanged: !!awaiting.phaseChanged,
        resultEvent: event,
      });
    }
  }
  return event;
}

function detectPendingPhase(gameState) {
  const boss = gameState.boss;
  const nextPhase = Math.max(boss.phase || 1, phaseForProgress(gameState));
  if (nextPhase === boss.phase) return null;
  boss.pendingPhase = Math.max(Number(boss.pendingPhase) || 0, nextPhase);
  return boss.pendingPhase;
}

function activatePendingPhase(gameState) {
  const boss = gameState.boss;
  const nextPhase = Math.max(boss.phase || 1, Number(boss.pendingPhase) || phaseForProgress(gameState));
  boss.pendingPhase = null;
  if (nextPhase === boss.phase) return null;
  boss.currentIntent = null;
  boss.phase = nextPhase;
  if (!boss.phaseTransitions.includes(nextPhase)) boss.phaseTransitions.push(nextPhase);
  boss.actionSequence += 1;
  boss.phaseTransitionId = `phase_${nextPhase}_${boss.actionSequence}`;
  boss.phaseIntroPending = nextPhase;
  return recordEvent(boss, { type: 'phase', phase: nextPhase, actionId: boss.phaseTransitionId });
}

export function applyBossMeldTransition(gameState, {
  teamId,
  playerId = null,
  meldIndex,
  oldKind = 'simple',
  newKind = 'simple',
  cardsAdded = [],
  isNewMeld = false,
  creditEligibleCardIds = null,
  cardOriginsById = null,
  suppressDominatrixResistance = false,
}) {
  const boss = normalizeBossState(gameState);
  if (!boss || teamId !== 0 || boss.result) return null;
  const legacyKey = `${teamId}:${meldIndex}`;
  const meldId = resolveBossMeldId(gameState, teamId, meldIndex, true);
  const key = meldId || legacyKey;
  const previous = boss.meldProgress[key] || boss.meldProgress[legacyKey] || {
    damageValue: BOSS_DAMAGE_BY_KIND[oldKind] || 0,
    debtValue: DEBT_REDUCTION_BY_KIND[oldKind] || 0,
    highestKind: oldKind,
  };
  const nextDamageValue = Math.max(previous.damageValue, BOSS_DAMAGE_BY_KIND[newKind] || 0);
  const nextDebtValue = Math.max(previous.debtValue, DEBT_REDUCTION_BY_KIND[newKind] || 0);
  let canastraDamage = Math.max(0, nextDamageValue - previous.damageValue);
  let cardDamage = 0;
  let debtReduction = boss.id === 'banker' ? Math.max(0, nextDebtValue - previous.debtValue) : 0;
  let possessionProgressed = false;
  let possessionReleased = false;
  let possessionProgress = null;
  let possessionSuppressesDamage = false;
  let possessionReappliedDamage = 0;
  let possessionQualifiedByTier = false;
  let creditLimitDebt = 0;
  let creditLimitEventId = null;
  let orderEvents = [];

  if (boss.id === 'dominadora') {
    const intent = boss.currentIntent;
    const possession = boss.possessions.find((entry) => entry.teamId === teamId
      && (entry.meldId ? entry.meldId === meldId : entry.meldIndex === meldIndex));
    if (possession) {
      possession.progressCardIds ||= [];
      possession.contributorPlayerIds ||= [];
      const newProgressCards = cardsAdded.filter((card) => card?.id && !possession.progressCardIds.includes(card.id));
      newProgressCards.forEach((card) => possession.progressCardIds.push(card.id));
      possessionProgressed = newProgressCards.length > 0;
      if (possessionProgressed && playerId != null && !possession.contributorPlayerIds.includes(playerId)) possession.contributorPlayerIds.push(playerId);
      possession.progress = possession.contributorPlayerIds.length;
      possession.required = Math.max(1, (gameState.players || []).length);
      possessionProgress = possession.progress;
      possessionQualifiedByTier = MELD_TIER[newKind] > Math.max(Number(possession.createdTier) || 0, MELD_TIER[oldKind] || 0);
      if (possession.contributorPlayerIds.length >= possession.required || possessionQualifiedByTier) {
        possessionReleased = true;
        possessionReappliedDamage = Math.max(0, Number(possession.suppressedDamage) || 0);
        possession.releasedEventId = `possession_release_${possession.id}_${boss.roundNumber}`;
        boss.possessions = boss.possessions.filter((entry) => entry.id !== possession.id);
      } else possessionSuppressesDamage = true;
      if (possessionSuppressesDamage) canastraDamage = 0;
    }
    if (intent?.abilityId === 'hands_tied' && isNewMeld && playerId != null) {
      intent.payload.teamMeldAvailable = false;
      intent.payload.consumedByPlayerId = playerId;
      intent.payload.consumedMeldId = meldId;
    }
    if (intent?.abilityId === 'separation' && playerId != null) {
      intent.payload.meldOwners ||= {};
      if (intent.payload.meldOwners[meldIndex] == null) intent.payload.meldOwners[meldIndex] = playerId;
    }
    orderEvents = resolveOrdersFromMeldAction(gameState, playerId, meldId, isNewMeld, oldKind, newKind, cardsAdded);
  }

  const accountedCardIds = new Set(boss.damagedCardIds);
  for (const card of cardsAdded) {
    if (!card?.id || accountedCardIds.has(card.id)) continue;
    accountedCardIds.add(card.id);
    boss.damagedCardIds.push(card.id);
    cardDamage += bossCardDamage(card);
  }
  if (boss.id === 'banker' && boss.creditLimit?.status === 'active' && boss.creditLimit.round === boss.roundNumber) {
    const limit = boss.creditLimit;
    limit.countedCardIds ||= [];
    limit.eventIds ||= [];
    const quote = getBossCreditLimitQuote(gameState, cardsAdded, { creditEligibleCardIds, cardOriginsById });
    quote?.newCardIds.forEach((cardId) => limit.countedCardIds.push(cardId));
    creditLimitDebt = quote?.debt || 0;
    limit.chargedDebt = Math.min(limit.maxCharge, (limit.chargedDebt || 0) + creditLimitDebt);
    if (quote?.newCardIds.length) {
      const eventId = `credit_limit_${limit.round}_${quote.newCardIds.slice().sort().join('_')}`;
      if (!limit.eventIds.includes(eventId)) limit.eventIds.push(eventId);
      creditLimitEventId = eventId;
    }
  }
  const damage = canastraDamage + cardDamage + possessionReappliedDamage;

  boss.meldProgress[key] = {
    damageValue: possessionSuppressesDamage ? previous.damageValue : nextDamageValue,
    debtValue: nextDebtValue,
    highestKind: canastraDamage > 0 ? newKind : previous.highestKind,
  };
  if (key !== legacyKey) delete boss.meldProgress[legacyKey];

  if (boss.currentIntent?.abilityId === 'suit_audit') {
    const suit = boss.currentIntent.payload.suit;
    const countedCardIds = (boss.currentIntent.payload.countedCardIds ||= []);
    const matchingCards = cardsAdded.filter((card) => card && card.id && !countedCardIds.includes(card.id) && !card.joker && card.suit === suit);
    matchingCards.forEach((card) => countedCardIds.push(card.id));
    const matching = matchingCards.length;
    boss.currentIntent.payload.progress = clamp((boss.currentIntent.payload.progress || 0) + matching, 0, boss.currentIntent.payload.required);
  }

  const contribution = ensureBossMeldContribution(boss, meldId);
  let bloomRemoved = 0;
  if (boss.id === 'matriarca_esmeralda') {
    const addedIds = new Set(cardsAdded.map((card) => card?.id).filter(Boolean));
    for (const threat of [...activeNatureThreats(boss)]) {
      if (['seed', 'royal_seed', 'pollen', 'royal_pollen'].includes(threat.type) && addedIds.has(threat.cardId)) {
        succeedNatureThreat(gameState, threat, 'A carta marcada foi usada legalmente.');
      } else if (['root', 'twin_root', 'royal_root'].includes(threat.type) && threat.meldId === meldId && addedIds.size) {
        threat.progressCardIds ||= [];
        addedIds.forEach((cardId) => {
          if (!threat.progressCardIds.includes(cardId)) threat.progressCardIds.push(cardId);
        });
        if (threat.strengthened) {
          threat.contributorPlayerIds ||= [];
          if (playerId != null && !threat.contributorPlayerIds.includes(playerId)) threat.contributorPlayerIds.push(playerId);
          const required = Math.max(1, Number(threat.requiredContributorCount) || Math.min(2, (gameState.players || []).length));
          if (threat.contributorPlayerIds.length >= required) {
            succeedNatureThreat(gameState, threat, `Cada cooperador alimentou a Raiz Fortalecida do jogo ${meldIndex + 1}.`);
          }
        } else {
          succeedNatureThreat(gameState, threat, `O jogo ${meldIndex + 1} alimentou a raiz.`);
        }
      } else if (threat.type === 'graft' && threat.meldIds?.includes(meldId) && addedIds.size) {
        threat.fedMeldIds ||= [];
        if (!threat.fedMeldIds.includes(meldId)) threat.fedMeldIds.push(meldId);
        if (new Set(threat.fedMeldIds).size >= 2) succeedNatureThreat(gameState, threat, 'Os dois lados do Enxerto foram alimentados.');
      } else if (threat.type === 'dew' && addedIds.size) {
        threat.countedCardIds ||= [];
        addedIds.forEach((cardId) => {
          if (!threat.countedCardIds.includes(cardId)) threat.countedCardIds.push(cardId);
        });
        if (boss.currentIntent?.abilityId === 'restorative_dew' && threat.sourceIntentId === boss.currentIntent.id) {
          boss.currentIntent.payload ||= {};
          boss.currentIntent.payload.countedCardIds = [...threat.countedCardIds];
        }
      }
    }
    if (contribution) {
      const bloomTier = { simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 }[newKind] || 0;
      const previousTier = Number(contribution.matriarchBloomTier) || 0;
      const tierIncrease = Math.max(0, bloomTier - previousTier);
      contribution.matriarchBloomTier = Math.max(previousTier, bloomTier);
      if (tierIncrease && boss.bloom > 0) {
        const bloomEvent = changeMatriarchBloom(gameState, -Math.min(tierIncrease, boss.bloom), `Canastra ${newKind === 'asas' ? 'As-a-As' : newKind}`, `meld_bloom_${meldId}_${bloomTier}`);
        bloomRemoved = Math.abs(bloomEvent?.amount || 0);
        contribution.matriarchBloomRemoved += bloomRemoved;
      }
    }
  }

  if (damage <= 0 && debtReduction <= 0 && !possessionProgressed && bloomRemoved <= 0 && creditLimitDebt <= 0 && !orderEvents.length) return null;
  const breaksCocoon = boss.id === 'matriarca_esmeralda'
    && canastraDamage > 0
    && ({ limpa: 1, real: 2, asas: 3 }[newKind] || 0) >= 1;
  const damageResult = applyDamageToBoss(gameState, damage, {
    breaksCocoon,
    sourceActionId: `meld_${key}_${boss.actionSequence + 1}`,
  });
  const dangerAfterRelief = clamp(boss.danger - debtReduction, 0, boss.maxDanger);
  const appliedDebtReduction = Math.max(0, boss.danger - dangerAfterRelief);
  boss.danger = dangerAfterRelief;
  if (creditLimitDebt) boss.danger = clamp(boss.danger + creditLimitDebt, 0, boss.maxDanger);
  const appliedDamage = damageResult.hpDamage;
  boss.stats.totalDamage += appliedDamage;
  boss.stats.largestAttack = Math.max(boss.stats.largestAttack, appliedDamage);
  if ((BOSS_DAMAGE_BY_KIND[newKind] || 0) >= BOSS_DAMAGE_BY_KIND.suja && (BOSS_DAMAGE_BY_KIND[oldKind] || 0) < BOSS_DAMAGE_BY_KIND.suja) boss.stats.canastrasFormed += 1;
  if (boss.hp === 0 && !damageResult.reborn) boss.defeated = true;
  let chainsRemoved = 0;
  let resistanceSuppressedByInterdict = false;
  if (boss.id === 'dominadora' && playerId != null && (!possessionSuppressesDamage || possessionReleased)) {
    const tier = MELD_TIER[newKind] || 0;
    const previousResistanceTier = Number(contribution?.dominatrixResistanceTier) || 0;
    if (contribution) contribution.dominatrixResistanceTier = Math.max(previousResistanceTier, tier);
    if (tier > previousResistanceTier && tier > 0) {
      if (suppressDominatrixResistance) {
        resistanceSuppressedByInterdict = true;
        boss.actionSequence += 1;
        recordEvent(boss, {
          type: 'resistanceSuppressed',
          actionId: `resistance_interdict_${meldId}_${tier}_${boss.roundNumber}`,
          playerId,
          meldId,
          tier,
          outcome: 'A desobediencia ao Interdito anulou a remocao de Chicote desta evolucao.',
        });
      } else if (boss.chainReliefRoundByPlayer[playerId] !== boss.roundNumber) {
        chainsRemoved = Math.abs(Math.min(0, changeChains(gameState, playerId, -1, 'resistance')));
        if (chainsRemoved) boss.chainReliefRoundByPlayer[playerId] = boss.roundNumber;
      } else {
        boss.actionSequence += 1;
        recordEvent(boss, {
          type: 'resistanceQualified',
          actionId: `resistance_limit_${meldId}_${tier}_${boss.roundNumber}`,
          playerId,
          meldId,
          tier,
          outcome: 'A evolucao qualificou a Resistencia, mas o limite desta rodada ja foi usado.',
        });
      }
    }
  }
  if (contribution) {
    // Damage restored after breaking Possession was already credited before possession.
    contribution.damageDone += Math.min(appliedDamage, canastraDamage + cardDamage);
    contribution.bankerDebtRelief += appliedDebtReduction;
    contribution.dominatrixChainsBroken += chainsRemoved;
  }
  boss.actionSequence += 1;
  const pendingPhase = detectPendingPhase(gameState);
  const event = {
    type: 'bossDamage',
    actionId: `meld_${key}_${boss.actionSequence}`,
    damage,
    cardDamage,
    canastraDamage,
    possessionReappliedDamage,
    debtReduction,
    creditLimitDebt,
    chainsRemoved,
    resistanceSuppressedByInterdict,
    bloomRemoved,
    absorbedDamage: damageResult.absorbed,
    cocoonBroken: damageResult.cocoonBroken,
    reborn: damageResult.reborn,
    possessionProgress: possessionProgressed ? possessionProgress : null,
    possessionReleased,
    possessionQualifiedByTier,
    orderEventIds: orderEvents.map((entry) => entry.actionId),
    oldKind,
    newKind,
    hp: boss.hp,
    danger: boss.danger,
    dangerChangeLabel: creditLimitDebt
      ? `Limite de Credito: Divida +${creditLimitDebt}`
      : debtReduction
      ? `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}: Dívida -${debtReduction}`
      : bloomRemoved ? `Canastra ${newKind === 'asas' ? 'As-a-As' : newKind}: Florescimento -${bloomRemoved}` : '',
    pendingPhase,
  };
  const definition = getBossDefinition(boss.id);
  const reactionLines = definition?.damageReactions || [];
  if (canastraDamage >= BOSS_DAMAGE_BY_KIND.limpa && boss.lastDamageReactionRound !== boss.roundNumber && reactionLines.length) {
    const now = Date.now();
    boss.lastDamageReactionRound = boss.roundNumber;
    boss.damageReaction = {
      id: `reaction_${boss.roundNumber}_${boss.actionSequence}`,
      round: boss.roundNumber,
      text: chooseSeeded(reactionLines, gameState, 149),
      at: now,
      until: now + 2500,
    };
    event.reaction = { ...boss.damageReaction };
  }
  const damageEvent = recordEvent(boss, event);
  if (creditLimitDebt > 0) {
    damageEvent.defeatEvent = confirmBankerDebtDefeat(gameState, creditLimitEventId || damageEvent.actionId);
  }
  if (possessionReleased) {
    boss.actionSequence += 1;
    damageEvent.possessionEvent = recordEvent(boss, {
      type: 'possessionReleased',
      actionId: `possession_released_${meldIndex}_${boss.actionSequence}`,
      meldIndex,
      reappliedDamage: possessionReappliedDamage,
      outcome: `A equipe rompeu a Posse do jogo ${meldIndex + 1}; ${possessionReappliedDamage} de dano foram reaplicados.`,
    });
  }
  return damageEvent;
}

export function applyBossDeadTaken(gameState) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.result) return null;
  const taken = gameState.deadChunksTaken?.[0] || 0;
  const newlyApplied = Math.max(0, taken - (boss.deadRewardsApplied || 0));
  if (!newlyApplied) return null;
  const reduction = boss.id === 'banker' ? newlyApplied * 5 : 0;
  boss.deadRewardsApplied = taken;
  boss.danger = clamp(boss.danger - reduction, 0, boss.maxDanger);
  const pendingPhase = detectPendingPhase(gameState);
  boss.actionSequence += 1;
  return recordEvent(boss, {
    type: reduction ? 'debtReduction' : 'bossProgress',
    actionId: `dead_${taken}_${boss.actionSequence}`,
    amount: reduction,
    danger: boss.danger,
    deadTaken: taken,
    pendingPhase,
    dangerChangeLabel: reduction ? `Morto conquistado: Dívida -${reduction}` : '',
  });
}

export function isBossDiscardBlocked(gameState) {
  if (!isBossMode(gameState)) return false;
  const boss = normalizeBossState(gameState);
  const playerId = gameState.players?.[gameState.currentPlayer]?.id ?? gameState.currentPlayer;
  if (boss.id === 'banker') return boss.currentIntent?.abilityId === 'credit_block' || isBossVaultDrawRequired(gameState, playerId);
  return (boss.chainsByPlayer?.[playerId] || 0) >= 4;
}

export function getBossDiscardSurcharge(gameState) {
  const boss = normalizeBossState(gameState);
  const surcharge = boss?.id === 'banker' ? boss.discardSurcharge : null;
  if (!surcharge || surcharge.status !== 'active' || surcharge.createdRound !== boss.roundNumber) return null;
  return { ...surcharge };
}

export function consumeBossDiscardSurcharge(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  const surcharge = getBossDiscardSurcharge(gameState);
  if (!boss || !surcharge || boss.discardSurcharge.resolvedEventId) return null;
  const amount = Math.max(0, Number(surcharge.amount) || 0);
  boss.discardSurcharge.status = 'consumed';
  boss.discardSurcharge.consumedByPlayerId = playerId;
  boss.danger = clamp(boss.danger + amount, 0, boss.maxDanger);
  boss.actionSequence += 1;
  const event = recordEvent(boss, {
    type: 'discardSurcharge',
    actionId: `discard_surcharge_${surcharge.createdRound}_${boss.actionSequence}`,
    playerId,
    amount,
    danger: boss.danger,
    dangerChangeLabel: `Agio do Lixo: Divida +${amount}`,
    outcome: `A retirada do lixo foi confirmada; Divida +${amount}.`,
  });
  boss.discardSurcharge.resolvedEventId = event.actionId;
  event.defeatEvent = confirmBankerDebtDefeat(gameState, event.actionId);
  return event;
}

export function isBossMeldLocked(gameState, teamId, meldIndex) {
  if (!isBossMode(gameState) || teamId !== 0) return false;
  const intent = gameState.boss?.currentIntent;
  return intent?.abilityId === 'pledge' && intent.payload?.meldIndex === meldIndex;
}

export function isBossMeldPossessed(gameState, teamId, meldIndex) {
  const boss = normalizeBossState(gameState);
  return !!boss && boss.id === 'dominadora' && teamId === 0
    && boss.possessions.some((entry) => entry.teamId === teamId && entry.meldIndex === meldIndex);
}

export function getBossVault(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  return boss?.id === 'banker' ? boss.vaultsByPlayer?.[playerId] || null : null;
}

export function isBossVaultDrawRequired(gameState, playerId = gameState?.currentPlayer) {
  return !!getBossVault(gameState, playerId) && !gameState?.hasDrawnThisTurn;
}

export function reclaimBossVault(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  const vault = getBossVault(gameState, playerId);
  const player = gameState.players?.find((entry) => entry.id === playerId);
  if (!boss || !vault || !player || gameState.currentPlayer !== playerId || gameState.hasDrawnThisTurn || boss.pendingChoices.length || isBossTurnActive(gameState)) return null;
  player.hand.push(vault.card);
  delete boss.vaultsByPlayer[playerId];
  gameState.hasDrawnThisTurn = true;
  gameState.partialDraw = false;
  boss.actionSequence += 1;
  return recordEvent(boss, {
    type: 'vaultReclaim',
    actionId: `vault_reclaim_${playerId}_${boss.actionSequence}`,
    playerId,
    cardId: vault.card.id,
    cardLabel: compactCardLabel(vault.card),
    outcome: `${player.name} recuperou a garantia do Cofre; a compra do turno foi concluida.`,
  });
}

export function consumeBossExtraDraw(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss) return 0;
  const effect = boss.effects.find((entry) => entry.id === 'maintenance_fee' && entry.pendingPlayerIds?.includes(playerId));
  if (!effect) return 0;
  boss.pendingFinancedDrawsByPlayer[playerId] = {
    count: effect.extraDraw || 1,
    debtPerCard: effect.financedDebt || 3,
    sourceActionId: effect.sourceActionId || null,
  };
  effect.pendingPlayerIds = effect.pendingPlayerIds.filter((id) => id !== playerId);
  boss.effects = boss.effects.filter((entry) => entry.id !== 'maintenance_fee' || entry.pendingPlayerIds.length > 0);
  return effect.extraDraw || 1;
}

export function registerBossFinancedCards(gameState, playerId, cards = []) {
  const boss = normalizeBossState(gameState);
  const pending = boss?.pendingFinancedDrawsByPlayer?.[playerId];
  if (!boss || boss.id !== 'banker' || !pending) return null;
  const financedCards = cards.filter((card) => card?.id).slice(0, pending.count || cards.length);
  delete boss.pendingFinancedDrawsByPlayer[playerId];
  if (!financedCards.length) return null;
  financedCards.forEach((card) => {
    if (boss.effects.some((effect) => effect.id === 'financed_card' && effect.playerId === playerId && effect.cardId === card.id)) return;
    boss.effects.push({
      id: 'financed_card',
      playerId,
      cardId: card.id,
      debtPerCard: pending.debtPerCard,
      appliedRound: boss.roundNumber,
      sourceActionId: pending.sourceActionId,
    });
  });
  boss.actionSequence += 1;
  return recordEvent(boss, {
    type: 'financedCards',
    actionId: `financed_${playerId}_${boss.actionSequence}`,
    playerId,
    cardIds: financedCards.map((card) => card.id),
    cardLabels: financedCards.map(compactCardLabel),
    count: financedCards.length,
    debtPerCard: pending.debtPerCard,
    outcome: `Tarifa de Manutenção: +${financedCards.length} carta${financedCards.length === 1 ? '' : 's'} financiada${financedCards.length === 1 ? '' : 's'}.`,
  });
}

function enqueueChoice(boss, playerId, type, options, data = {}) {
  if (playerId == null || boss.pendingChoices.some((choice) => choice.playerId === playerId)) return null;
  const choice = { id: `choice_${boss.roundNumber}_${boss.actionSequence}_${playerId}_${type}`, playerId, type, options, ...data };
  boss.pendingChoices.push(choice);
  return choice;
}

function swapCooperatorCards(gameState) {
  const players = gameState.players || [];
  if (players.length < 2 || !players[0].hand?.length || !players[1].hand?.length) return null;
  const firstCard = chooseCard(players[0], gameState, 101);
  const secondCard = chooseCard(players[1], gameState, 103);
  const firstIndex = players[0].hand.findIndex((card) => card.id === firstCard?.id);
  const secondIndex = players[1].hand.findIndex((card) => card.id === secondCard?.id);
  if (firstIndex < 0 || secondIndex < 0) return null;
  const firstSnapshot = { ...firstCard };
  const secondSnapshot = { ...secondCard };
  players[0].hand[firstIndex] = secondCard;
  players[1].hand[secondIndex] = firstCard;
  return {
    firstPlayerId: players[0].id,
    secondPlayerId: players[1].id,
    firstCardId: firstCard.id,
    secondCardId: secondCard.id,
    firstCardLabel: compactCardLabel(firstCard),
    secondCardLabel: compactCardLabel(secondCard),
    sentCards: [
      { playerId: players[0].id, toPlayerId: players[1].id, cardId: firstCard.id, cardLabel: compactCardLabel(firstCard), card: firstSnapshot },
      { playerId: players[1].id, toPlayerId: players[0].id, cardId: secondCard.id, cardLabel: compactCardLabel(secondCard), card: secondSnapshot },
    ],
    receivedCards: [
      { playerId: players[0].id, fromPlayerId: players[1].id, cardId: secondCard.id, cardLabel: compactCardLabel(secondCard) },
      { playerId: players[1].id, fromPlayerId: players[0].id, cardId: firstCard.id, cardLabel: compactCardLabel(firstCard) },
    ],
  };
}

function resolveIntent(gameState, { keepIntent = false, appliedAt = Date.now() } = {}) {
  const boss = gameState.boss;
  const intent = boss.currentIntent;
  if (!intent) return null;
  if (intent.immediateApplied) {
    if (!keepIntent) boss.currentIntent = null;
    return null;
  }
  const presentation = buildBossActionPresentation(gameState);
  let dangerDelta = 0;
  let outcome = '';
  let exposureSuccess = null;
  let resultData = {};

  if (boss.id === 'dominadora') {
    if (intent.abilityId === 'forced_choice') {
      enqueueChoice(boss, intent.payload.targetPlayerId, 'forced_choice', ['chain', 'order'], {
        announcedPhase: intent.announcedPhase,
        order: { ...intent.payload.order },
      });
      outcome = 'A escolha pessoal foi imposta.';
    } else if (intent.abilityId === 'forced_swap') {
      const swap = swapCooperatorCards(gameState);
      const firstPlayer = gameState.players.find((player) => player.id === swap?.firstPlayerId);
      const secondPlayer = gameState.players.find((player) => player.id === swap?.secondPlayerId);
      outcome = swap
        ? `${firstPlayer?.name || 'O primeiro cooperador'} entregou ${swap.firstCardLabel} e recebeu ${swap.secondCardLabel}; ${secondPlayer?.name || 'o segundo cooperador'} fez a troca inversa.`
        : 'A troca falhou por falta de cartas.';
      resultData = swap || {};
    } else if (intent.abilityId === 'favorite') {
      changeChains(gameState, intent.payload.protectedPlayerId, -1, 'favorite_protection');
      changeChains(gameState, intent.payload.punishedPlayerId, 1, 'favorite_punishment');
      const protectedPlayer = gameState.players.find((player) => player.id === intent.payload.protectedPlayerId);
      const punishedPlayer = gameState.players.find((player) => player.id === intent.payload.punishedPlayerId);
      outcome = `${protectedPlayer?.name || 'A favorita'} foi protegida; ${punishedPlayer?.name || 'o outro cooperador'} recebeu 1 Chicote.`;
      resultData = { protectedPlayerId: intent.payload.protectedPlayerId, punishedPlayerId: intent.payload.punishedPlayerId };
    } else if (intent.abilityId === 'exposure') {
      const target = gameState.players.find((player) => player.id === intent.payload.targetPlayerId);
      const remainsInHand = !!target?.hand?.some((card) => card?.id === intent.payload.cardId);
      exposureSuccess = !remainsInHand;
      if (remainsInHand) changeChains(gameState, intent.payload.targetPlayerId, 1, 'exposure_failed');
      outcome = remainsInHand
        ? `${target?.name || 'O jogador alvo'} não usou a carta exposta e recebeu 1 Chicote.`
        : `${target?.name || 'O jogador alvo'} usou a carta exposta e evitou o Chicote.`;
    } else if (intent.abilityId === 'break_will') {
      enqueueChoice(boss, intent.payload.targetPlayerId, 'break_will', ['chain', 'break_meld']);
      outcome = 'A Quebra de Vontade aguarda uma decisão.';
    } else if (intent.abilityId === 'final_order') {
      const ids = intent.payload.orderedPlayerIds || [];
      enqueueChoice(boss, ids[0], 'final_order_draw', ['draw2', 'chain']);
      enqueueChoice(boss, ids[1], 'final_order_lock', ['lock_card', 'chain']);
      outcome = 'Cada cooperador recebeu uma ordem diferente.';
    } else if (intent.abilityId === 'possession') {
      const alreadyPossessed = boss.possessions.some((entry) => entry.meldIndex === intent.payload.meldIndex);
      if (!alreadyPossessed && boss.possessions.length < 2 && eligibleMeldIndexes(gameState, { excludePossessed: true }).includes(intent.payload.meldIndex)) {
        const calculatedDamage = possessionDamageForMeld(gameState, intent.payload.meldIndex);
        const suppressedDamage = Math.min(calculatedDamage, Math.max(0, boss.maxHp - boss.hp));
        boss.hp = clamp(boss.hp + suppressedDamage, 0, boss.maxHp);
        boss.stats.totalDamage = Math.max(0, boss.stats.totalDamage - suppressedDamage);
        boss.possessions.push({
          id: `possession_${intent.id}`,
          teamId: 0,
          meldIndex: intent.payload.meldIndex,
          meldId: intent.payload.meldId || resolveBossMeldId(gameState, 0, intent.payload.meldIndex, true),
          progress: 0,
          progressCardIds: [],
          contributorPlayerIds: [],
          required: Math.max(1, (gameState.players || []).length),
          createdTier: Number(intent.payload.createdTier) || 0,
          releasedEventId: null,
          suppressedDamage,
          calculatedDamage,
          appliedRound: boss.roundNumber,
        });
        outcome = `O jogo ${intent.payload.meldIndex + 1} foi possuído; ${suppressedDamage} de dano ficam suspensos até ambos cooperarem ou o jogo evoluir.`;
        resultData = { meldIndex: intent.payload.meldIndex, suppressedDamage, calculatedDamage };
      } else {
        outcome = 'A Posse não encontrou um jogo elegível.';
      }
    } else if (intent.abilityId === 'iron_etiquette') {
      const target = gameState.players.find((player) => player.id === intent.payload.targetPlayerId);
      boss.activeOrders.push({
        id: `etiquette_${intent.id}`,
        sourceAbilityId: 'iron_etiquette',
        type: 'discard_suit',
        targetPlayerId: intent.payload.targetPlayerId,
        suit: intent.payload.suit,
        suitLabel: intent.payload.suitLabel,
        createdRound: boss.roundNumber,
        deadlinePlayerId: intent.payload.targetPlayerId,
        eligibleCardIds: legalDiscardCards(gameState, target)
          .filter((card) => !card.joker && card.suit === intent.payload.suit)
          .map((card) => card.id),
        ownOptionsConsumed: false,
        status: 'active',
        resolvedEventId: null,
      });
      outcome = `Etiqueta: o alvo deve descartar ${intent.payload.suitLabel} no próximo turno.`;
    } else if (intent.abilityId === 'interdict') {
      boss.interdicts.push({
        id: `interdict_${intent.id}`,
        sourceAbilityId: 'interdict',
        teamId: 0,
        meldIndex: intent.payload.meldIndex,
        meldId: intent.payload.meldId,
        createdRound: boss.roundNumber,
        status: 'active',
        resolvedEventId: null,
      });
      outcome = `Interdito aplicado ao jogo ${intent.payload.meldIndex + 1}; a primeira evolução exigirá uma decisão.`;
    } else {
      outcome = `${intent.name} foi encerrada.`;
    }
  } else if (boss.id === 'matriarca_esmeralda') {
    const baseThreat = {
      sourceAbilityId: intent.abilityId,
      sourceIntentId: intent.id,
      deadlineRound: boss.roundNumber,
    };
    if (intent.abilityId === 'living_seed') {
      const threat = addNatureThreat(gameState, {
        ...baseThreat,
        type: 'seed',
        targetPlayerId: intent.payload.targetPlayerId,
        deadlinePlayerId: intent.payload.targetPlayerId,
        cardId: intent.payload.cardId,
        healAmount: 0,
        bloomAmount: 1,
      });
      outcome = threat ? 'A Semente foi marcada e precisa ser usada no proximo turno do alvo.' : 'Nenhuma Semente valida foi encontrada.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'hungry_root') {
      const threat = addNatureThreat(gameState, { ...baseThreat, type: 'root', ...intent.payload, healAmount: 0, bloomAmount: 1, progressCardIds: [], contributorPlayerIds: [] });
      outcome = threat ? `A Raiz envolve o jogo ${Number(threat.meldIndex) + 1}.` : 'Nenhuma Raiz valida foi criada.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'restorative_dew') {
      const announcedPhase = intent.payload.announcedPhase || intent.announcedPhase || boss.phase;
      const threat = addNatureThreat(gameState, {
        ...baseThreat,
        type: 'dew',
        announcedPhase,
        healAmount: getRestorativeDewHealing(announcedPhase, 0),
        bloomAmount: 0,
        countedCardIds: [],
      });
      outcome = threat ? `O Orvalho prepara ${getRestorativeDewHealing(announcedPhase, 0)} HP de cura e enfraquece por faixas conforme novas cartas entram na mesa.` : 'O Orvalho nao encontrou espaco entre as ameacas.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'twin_vines') {
      const threats = (intent.payload.targets || []).slice(0, natureThreatSlots(gameState)).map((target, index) => addNatureThreat(gameState, {
        ...baseThreat,
        id: `${intent.id}_vine_${index}`,
        type: 'twin_root',
        ...target,
        healAmount: 0,
        bloomAmount: 1,
        progressCardIds: [],
      })).filter(Boolean);
      outcome = `${threats.length} Trepadeira${threats.length === 1 ? '' : 's'} criadas; cada jogo resolve separadamente.`;
      resultData = { threatIds: threats.map((threat) => threat.id) };
    } else if (intent.abilityId === 'graft') {
      const threat = addNatureThreat(gameState, {
        ...baseThreat,
        type: 'graft',
        meldIds: (intent.payload.targets || []).map((target) => target.meldId),
        meldIndexes: (intent.payload.targets || []).map((target) => target.meldIndex),
        fedMeldIds: [],
        healAmount: 0,
        bloomAmount: 2,
      });
      outcome = threat ? 'O Enxerto ligou dois jogos; ambos precisam receber uma carta.' : 'O Enxerto nao encontrou dois jogos validos.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'discard_pollen') {
      const threat = addNatureThreat(gameState, { ...baseThreat, type: 'pollen', discardCardId: intent.payload.discardCardId, healAmount: 40, bloomAmount: 1, targetPlayerId: null });
      outcome = threat ? 'O topo do lixo foi contaminado pelo Polen.' : 'O Polen nao encontrou uma carta valida no lixo.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'harvest') {
      const threat = addNatureThreat(gameState, { ...baseThreat, type: 'harvest', targetPlayerId: intent.payload.targetPlayerId, deadlinePlayerId: intent.payload.targetPlayerId });
      outcome = threat ? 'A mao do alvo sera avaliada pela Colheita ao fim do turno.' : 'A Colheita nao encontrou um alvo valido.';
      resultData = { threatIds: threat ? [threat.id] : [] };
    } else if (intent.abilityId === 'royal_bloom') {
      const threats = [];
      for (const [index, objective] of (intent.payload.objectives || []).entries()) {
        if (natureThreatSlots(gameState) <= 0) break;
        const threat = addNatureThreat(gameState, {
          ...baseThreat,
          id: `${intent.id}_royal_${index}`,
          ...objective,
          type: objective.type === 'root' ? 'royal_root' : objective.type === 'seed' ? 'royal_seed' : 'royal_pollen',
          deadlinePlayerId: objective.targetPlayerId ?? null,
          healAmount: 0,
          bloomAmount: 1,
          progressCardIds: [],
        });
        if (threat) threats.push(threat);
      }
      outcome = `Florescimento Real criou ${threats.length} objetivo${threats.length === 1 ? '' : 's'} independente${threats.length === 1 ? '' : 's'}.`;
      resultData = { threatIds: threats.map((threat) => threat.id) };
    } else if (intent.abilityId === 'emerald_cocoon') {
      boss.emeraldCocoon = { id: `cocoon_${intent.id}`, remaining: intent.payload.amount || 180, createdRound: boss.roundNumber, status: 'active' };
      outcome = 'O Casulo Esmeralda absorvera ate 180 de dano nesta rodada.';
      resultData = { cocoonId: boss.emeraldCocoon.id, remaining: boss.emeraldCocoon.remaining };
    } else if (intent.abilityId === 'spring_crown') {
      boss.springCrown = { id: `crown_${intent.id}`, round: boss.roundNumber, failureCount: 0, strengthenedCreated: false, status: 'active' };
      outcome = 'A Coroa da Primavera pode propagar uma Raiz e fortalecer a nova ameaca na segunda falha.';
      resultData = { crownId: boss.springCrown.id };
    }
  } else if (intent.abilityId === 'fixed_interest') {
    const amount = intent.payload.fullDebt ?? intent.payload.amount ?? (intent.announcedPhase === 3 ? 8 : 6);
    const collateralAmount = intent.payload.guaranteedDebt ?? intent.payload.collateralAmount ?? (intent.announcedPhase === 3 ? 5 : 3);
    const eligibleGuarantors = (gameState.players || []).filter((player) => !boss.vaultsByPlayer[player.id] && player.hand?.some((card) => card?.id));
    if (eligibleGuarantors.length) {
      const decisionPlayer = gameState.players.find((player) => !String(player.name || '').toUpperCase().includes('BOT')) || gameState.players[0];
      enqueueChoice(boss, decisionPlayer?.id, 'fixed_interest_payment', [
        'full',
        ...eligibleGuarantors.map((player) => `guarantee:${player.id}`),
      ], { amount, collateralAmount });
      outcome = `Juros Fixos exige pagamento integral de ${amount} ou uma garantia no Cofre.`;
    } else {
      dangerDelta = amount;
      outcome = `Juros Fixos: Dívida +${dangerDelta}. Sem vaga de garantia disponível.`;
    }
  } else if (intent.abilityId === 'maintenance_fee') {
    const extraDraw = intent.payload.extraDraw ?? (intent.announcedPhase === 3 ? 2 : 1);
    const financedDebt = intent.payload.financedDebt ?? (intent.announcedPhase === 3 ? 4 : 3);
    boss.effects = boss.effects.filter((entry) => entry.id !== 'maintenance_fee');
    boss.effects.push({ id: 'maintenance_fee', extraDraw, financedDebt, sourceActionId: intent.id, pendingPlayerIds: gameState.players.map((player) => player.id) });
    boss.lastMaintenanceRound = boss.roundNumber;
    outcome = `Tarifa ativa: +${extraDraw} carta${extraDraw === 1 ? '' : 's'} financiada${extraDraw === 1 ? '' : 's'} para cada jogador.`;
  } else if (intent.abilityId === 'credit_block') {
    outcome = 'Bloqueio de Crédito encerrado.';
  } else if (intent.abilityId === 'suit_audit') {
    const success = (intent.payload.progress || 0) >= intent.payload.required;
    dangerDelta = success ? (intent.payload.successDelta ?? -5) : (intent.payload.failureDelta ?? (intent.announcedPhase === 3 ? 12 : 10));
    outcome = success ? 'Auditoria concluída: Dívida -5.' : `Auditoria falhou: Dívida +${dangerDelta}.`;
  } else if (intent.abilityId === 'pledge') {
    outcome = 'A Penhora foi liberada.';
  } else if (intent.abilityId === 'compound_interest') {
    const totalCards = gameState.players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);
    dangerDelta = Math.min(12, 4 + Math.floor(totalCards / 4));
    outcome = `Juros Compostos: Dívida +${dangerDelta}.`;
  } else if (intent.abilityId === 'credit_limit') {
    boss.creditLimit = {
      round: boss.roundNumber,
      allowance: intent.payload.allowance,
      debtPerCard: intent.payload.debtPerCard || 1,
      countedCardIds: [],
      chargedDebt: 0,
      maxCharge: intent.payload.maxCharge,
      eventIds: [],
      status: 'active',
      sourceIntentId: intent.id,
    };
    outcome = `Limite de Crédito: franquia compartilhada de ${intent.payload.allowance} cartas; cobrança máxima de ${intent.payload.maxCharge}.`;
  } else if (intent.abilityId === 'discard_surcharge') {
    boss.discardSurcharge = {
      amount: intent.payload.amount,
      createdRound: boss.roundNumber,
      status: 'active',
      consumedByPlayerId: null,
      resolvedEventId: null,
    };
    outcome = `Ágio do Lixo: a primeira retirada confirmada custará Dívida +${intent.payload.amount}.`;
  }

  boss.danger = clamp(boss.danger + dangerDelta, 0, boss.maxDanger);
  boss.actionSequence += 1;
  boss.lastAbilityId = intent.abilityId;
  boss.lastResolvedActionId = intent.id;
  const eventActionId = `boss_${boss.actionSequence}_${intent.abilityId}`;
  const event = {
    type: 'bossAbility',
    actionId: eventActionId,
    eventId: eventActionId,
    abilityId: intent.abilityId,
    name: intent.name,
    outcome,
    dangerDelta,
    danger: boss.danger,
    dangerChangeLabel: dangerDelta
      ? `${intent.abilityId === 'suit_audit' ? (dangerDelta < 0 ? 'Auditoria concluída' : 'Auditoria falhou') : intent.name}: Dívida ${dangerDelta > 0 ? '+' : ''}${dangerDelta}`
      : '',
    targetPlayerId: intent.payload?.targetPlayerId ?? null,
    cardId: intent.payload?.cardId ?? null,
    cardIds: [...(intent.payload?.cardIds || [])],
    exposureSuccess,
    ...resultData,
    presentation: {
      category: presentation.category,
      speech: presentation.speech,
      description: presentation.description,
      details: [...presentation.details],
    },
  };
  const recorded = recordEvent(boss, event);
  if (boss.id === 'banker' && dangerDelta > 0) recorded.defeatEvent = confirmBankerDebtDefeat(gameState, recorded.actionId);
  if (keepIntent) {
    intent.immediateApplied = true;
    intent.immediateEventActionId = recorded.actionId;
    intent.intentStatus = 'applied';
    intent.intentAppliedAt = appliedAt;
  } else boss.currentIntent = null;
  return recorded;
}

export function completeBossPlayerTurn(gameState, playerId) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.result || boss.pendingChoices.length || isBossTurnActive(gameState)) return null;
  detectPendingPhase(gameState);
  const turnId = `turn_${gameState.turnNumber}_${playerId}`;
  if (boss.resolvedTurnIds.includes(turnId)) return null;
  boss.resolvedTurnIds.push(turnId);
  if (boss.resolvedTurnIds.length > 20) boss.resolvedTurnIds.splice(0, boss.resolvedTurnIds.length - 20);
  if (!boss.playersActedThisRound.includes(playerId)) boss.playersActedThisRound.push(playerId);
  const player = gameState.players.find((entry) => entry.id === playerId);
  recordEvent(boss, {
    type: 'playerTurn',
    actionId: `player_${turnId}`,
    playerId,
    playerName: player?.name || `Jogador ${playerId + 1}`,
    cardsInHand: player?.hand?.length || 0,
  });

  if (boss.id === 'banker') {
    const financedCards = boss.effects.filter((effect) => effect.id === 'financed_card' && effect.playerId === playerId);
    if (financedCards.length) {
      const heldCardIds = new Set((player?.hand || []).map((card) => card?.id).filter(Boolean));
      const chargedCards = financedCards.filter((effect) => heldCardIds.has(effect.cardId));
      const dangerDelta = chargedCards.reduce((total, effect) => total + (Number(effect.debtPerCard) || 0), 0);
      boss.effects = boss.effects.filter((effect) => !(effect.id === 'financed_card' && effect.playerId === playerId));
      boss.danger = clamp(boss.danger + dangerDelta, 0, boss.maxDanger);
      boss.actionSequence += 1;
      recordEvent(boss, {
        type: 'financedCharge',
        actionId: `financed_charge_${playerId}_${boss.actionSequence}`,
        playerId,
        financedCardIds: financedCards.map((effect) => effect.cardId),
        chargedCardIds: chargedCards.map((effect) => effect.cardId),
        dangerDelta,
        danger: boss.danger,
        dangerChangeLabel: dangerDelta ? `Tarifa de Manutenção: Dívida +${dangerDelta}` : '',
        outcome: dangerDelta
          ? `${chargedCards.length} Carta${chargedCards.length === 1 ? '' : 's'} Financiada${chargedCards.length === 1 ? '' : 's'} permaneceram na mão.`
          : 'Todas as Cartas Financiadas foram usadas ou descartadas; nenhuma Dívida foi aplicada.',
      });
    }
  }

  if (boss.id === 'dominadora') {
    const expiringExposures = boss.effects.filter((effect) => effect.id === 'choice_exposure' && effect.playerId === playerId && effect.expiresAfterTurn);
    const exposedCardsHeld = expiringExposures.filter((effect) => player?.hand?.some((card) => card?.id === effect.cardId));
    delete boss.choiceDrawnCardIdsByPlayer[playerId];
    boss.effects = boss.effects.filter((effect) => !(effect.expiresAfterTurn && effect.playerId === playerId));
    exposedCardsHeld.forEach((effect) => changeChains(gameState, playerId, 1, `forced_choice_exposure:${effect.cardId}`));
    for (const order of (boss.activeOrders || []).filter((entry) => entry.status === 'active' && entry.targetPlayerId === playerId)) {
      if (order.type === 'no_new_meld') {
        finishDominatrixOrder(gameState, order, 'obeyed', 'O jogador encerrou o turno sem criar um jogo novo.');
      } else if (order.type === 'reduce_hand') {
        const obeyed = (player?.hand?.length || 0) <= Number(order.handLimit);
        finishDominatrixOrder(
          gameState,
          order,
          obeyed ? 'obeyed' : 'disobeyed',
          obeyed ? `A mao terminou dentro do limite de ${order.handLimit}.` : `A mao terminou acima do limite de ${order.handLimit}.`,
          { addChain: !obeyed },
        );
      } else {
        finishDominatrixOrder(
          gameState,
          order,
          'disobeyed',
          'O turno terminou sem cumprir a ordem aceita.',
          { addChain: true },
        );
      }
    }
  }

  let natureEvents = [];
  if (boss.id === 'matriarca_esmeralda') {
    natureEvents = resolveMatriarchPlayerDeadline(gameState, playerId);
  }

  const allPlayersActed = gameState.players.every((player) => boss.playersActedThisRound.includes(player.id));
  if (allPlayersActed && boss.id === 'dominadora') {
    (boss.interdicts || []).filter((entry) => entry.status === 'active').forEach((interdict) => {
      interdict.status = 'expired';
      boss.actionSequence += 1;
      const expired = recordEvent(boss, {
        type: 'interdictExpired',
        actionId: `interdict_expired_${interdict.id}_${boss.actionSequence}`,
        interdictId: interdict.id,
        outcome: 'O Interdito expirou sem uma tentativa de evolucao.',
      });
      interdict.resolvedEventId = expired.actionId;
    });
  }
  if (allPlayersActed && boss.id === 'banker') {
    if (boss.creditLimit?.status === 'active' && boss.creditLimit.round === boss.roundNumber) boss.creditLimit.status = 'expired';
    if (boss.discardSurcharge?.status === 'active' && boss.discardSurcharge.createdRound === boss.roundNumber) boss.discardSurcharge.status = 'expired';
  }
  const duration = boss.currentIntent?.duration || 'full_round';
  const targetTurnFinished = duration === 'target_turn' && boss.currentIntent?.payload?.targetPlayerId === playerId;
  const shouldResolve = targetTurnFinished || (duration !== 'until_released' && allPlayersActed);
  let event = null;
  if (shouldResolve) event = resolveIntent(gameState);
  if (allPlayersActed && boss.id === 'matriarca_esmeralda') {
    natureEvents.push(...resolveMatriarchRound(gameState));
    event ||= natureEvents.filter(Boolean).at(-1) || null;
  }
  if (event) {
    boss.resolvedRoundEventActionId = event.actionId;
  }
  let phaseEvent = null;
  if (allPlayersActed) {
    if (boss.id === 'matriarca_esmeralda' && boss.springCrown?.status === 'active') boss.springCrown.status = 'expired';
    boss.roundNumber += 1;
    boss.playersActedThisRound = [];
    if (boss.id === 'matriarca_esmeralda') {
      boss.natureHealingRound = boss.roundNumber;
      boss.natureHealingThisRound = 0;
      boss.natureFailureCountThisRound = 0;
      boss.propagationUsedThisRound = false;
      createPendingRootPropagation(gameState);
    }
    phaseEvent = activatePendingPhase(gameState);
  }
  if (boss.id === 'banker') confirmBankerDebtDefeat(gameState, event?.actionId || `round_${boss.roundNumber}`);
  if (allPlayersActed && !boss.result) {
    const resultEvent = boss.eventLog.find((entry) => entry.actionId === boss.resolvedRoundEventActionId) || event;
    boss.resolvedRoundEventActionId = null;
    if (boss.pendingChoices.length) {
      boss.awaitingBossTurn = { first: false, phaseChanged: !!phaseEvent, resultActionId: resultEvent?.actionId || null };
    } else {
      beginBossTurn(gameState, { phaseChanged: !!phaseEvent, resultEvent });
    }
  }
  return event;
}

export function applyBossFinalStrike(gameState, projectedTeamScore, playerId = gameState.currentPlayer) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.result) return null;
  const baseDamage = 500 + Math.max(0, Math.floor((Number(projectedTeamScore) || 0) * 0.25));
  const damage = boss.id === 'dominadora' && isBossPlayerDominated(gameState, playerId) ? Math.floor(baseDamage * 0.65) : baseDamage;
  const damageResult = applyDamageToBoss(gameState, damage, { breaksCocoon: true, sourceActionId: `final_${boss.actionSequence + 1}` });
  boss.stats.totalDamage += damage;
  boss.stats.finalStrike = damage;
  boss.stats.largestAttack = Math.max(boss.stats.largestAttack, damage);
  boss.stats.finalDebt = boss.danger;
  boss.actionSequence += 1;
  if (damageResult.reborn) {
    boss.defeated = false;
  } else if (boss.hp === 0) {
    boss.defeated = true;
    boss.result = { victory: true, reason: 'boss_defeated', title: `${getBossDefinition(boss.id)?.name || 'O chefe'} foi derrotado`, detail: 'O ataque final encerrou a batalha.' };
  } else {
    const survivalTitle = boss.id === 'dominadora'
      ? 'Vontade Quebrada'
      : boss.id === 'matriarca_esmeralda'
        ? 'Primavera Eterna'
        : 'Execução da Dívida';
    boss.result = { victory: false, reason: 'insufficient_final_strike', title: survivalTitle, detail: `${getBossDefinition(boss.id)?.name || 'O chefe'} sobreviveu com ${boss.hp} HP.` };
  }
  return recordEvent(boss, {
    type: 'finalStrike',
    actionId: `final_${boss.actionSequence}`,
    damage,
    absorbedDamage: damageResult.absorbed,
    hp: boss.hp,
    reborn: damageResult.reborn,
    victory: boss.result?.victory ?? false,
  });
}

export function applyBossResourceDefeat(gameState) {
  const boss = normalizeBossState(gameState);
  if (!boss || boss.result) return null;
  boss.stats.finalDebt = boss.danger;
  boss.result = { victory: false, reason: 'resources_exhausted', title: boss.id === 'dominadora' ? 'Dominação sem fim' : 'Cobrança sem fim', detail: `${getBossDefinition(boss.id)?.name || 'O chefe'} sobreviveu com ${boss.hp} HP quando os recursos acabaram.` };
  boss.actionSequence += 1;
  return recordEvent(boss, { type: 'bossDefeat', actionId: `resources_${boss.actionSequence}`, reason: boss.result.reason });
}

export function getBossPhaseName(gameState) {
  const boss = normalizeBossState(gameState);
  const definition = boss ? getBossDefinition(boss.id) : null;
  return definition?.phaseNames?.[boss.phase] || '';
}
