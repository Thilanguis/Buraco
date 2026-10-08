// Persistent castle combat, independent of Nemesis' invasion/reanimation lifecycle.
import { damageCombatEntity, isCombatEntityAlive } from './boss-combat.js';

export const CASTLE_BALANCE = Object.freeze({ ladyHp: 2000, daughterHp: 450, linkPerDaughter: 500,
  regeneration: 50, anticoagulantRegeneration: 25, passiveBlood: 3, itemMaxHpLoss: 100,
  daughterHpFloor: 200, copiesPerItem: 3, daggerDamage: 50, explosiveDamage: 100, furyHealingStep: .1, furyBloodStep: 2 });
const LADY_BLOOD_BALANCE = Object.freeze({
  1: Object.freeze({ mediumTithe: 3, heavyTithe: 6, crimsonBrand: 5 }),
  2: Object.freeze({ mediumTithe: 4, heavyTithe: 8, crimsonBrand: 7, deadFeast: 10 }),
  3: Object.freeze({ mediumTithe: 6, heavyTithe: 10, crimsonBrand: 9, deadFeast: 14 }),
});
export const ladyBloodBalance = phase => LADY_BLOOD_BALANCE[Number(phase)] || LADY_BLOOD_BALANCE[1];
const item = (label, file, special) => Object.freeze({ label, image: `assets/images/items/${file}.png`, special });
export const ITEM_DEFINITIONS = Object.freeze({
  dagger: item('Adaga', 'adaga', `Causa ${CASTLE_BALANCE.daggerDamage} de dano imediato.`),
  cold_flask: item('Frasco de Frio', 'frasco-frio', 'Bloqueia a próxima regeneração.'),
  anticoagulant: item('Anticoagulante', 'anticoagulante', `Regeneração cai de ${CASTLE_BALANCE.regeneration} para ${CASTLE_BALANCE.anticoagulantRegeneration}, permanentemente. Não acumula.`),
  explosive: item('Explosivo', 'explosivo', `Causa ${CASTLE_BALANCE.explosiveDamage} de dano imediato.`),
  relic: item('Relíquia', 'reliquia', 'Suspende a passiva por uma janela: a atual, se ainda pendente; senão, a próxima.'),
});
export const ITEM_COMMON_HELP = 'Cada item reduz o HP máximo da filha em 100 (mínimo 200). A carta fica presa a ela. Ao morrer, devolve as cartas ao fundo do Lixo, sem item. Sacrificar não encerra o turno: conserve uma carta para descartar.';
export const REMOVED_DAUGHTER_ABILITIES = new Set(['bela_hunt', 'cassandra_feast', 'daniela_swarm']);
export const DAUGHTER_IDS = Object.freeze(['bela', 'cassandra', 'daniela']);
export function createCastleState() {
  return { castleVersion: 1, castleDaughterBalanceVersion: 2, castleItems: null, castlePassiveRound: 0, castleRegeneratedRound: 0, castleSelectedDaughterIds: [], castleLastDaughterId: null,
    bloodLinkProtection: 1500, combatTargetsByPlayer: {}, combatEntities: DAUGHTER_IDS.map(id => ({ id, name: id[0].toUpperCase() + id.slice(1),
      portrait: `assets/images/boss-dimitrescu-${id}.png`, hp: CASTLE_BALANCE.daughterHp, maxHp: CASTLE_BALANCE.daughterHp,
      status: 'alive', regeneration: CASTLE_BALANCE.regeneration, cold: false, relicRound: null, sacrificedCards: [], passive: null })) };
}
export const livingDaughters = boss => (boss.combatEntities || []).filter(isCombatEntityAlive);
export const bloodLinkCapacity = boss => livingDaughters(boss).length * CASTLE_BALANCE.linkPerDaughter;
export const bloodLinkRemaining = boss => Math.max(0, Math.min(bloodLinkCapacity(boss),
  Number.isFinite(boss.bloodLinkProtection) ? boss.bloodLinkProtection : bloodLinkCapacity(boss)));
export function absorbBloodLink(boss, damage) {
  const absorbed = Math.min(Math.max(0, damage), bloodLinkRemaining(boss));
  boss.bloodLinkProtection = bloodLinkRemaining(boss) - absorbed;
  return absorbed;
}
export const furyLevel = boss => (boss.combatEntities || []).filter(d => DAUGHTER_IDS.includes(d.id) && !isCombatEntityAlive(d)).length;
export const furyHealing = (boss, amount) => Math.floor(Math.max(0, amount) * (1 + furyLevel(boss) * CASTLE_BALANCE.furyHealingStep));
export const furyBlood = (boss, amount) => amount > 0 ? amount + furyLevel(boss) * CASTLE_BALANCE.furyBloodStep : 0;

function allCards(state) {
  return [...(state.stock || []), ...(state.discard || []), ...(state.deadPiles || []).flat(),
    ...(state.players || []).flatMap(p => p.hand || []), ...(state.teams || []).flatMap(t => (t.melds || []).flat()),
    ...(state.boss?.combatEntities || []).flatMap(d => d.sacrificedCards || [])];
}
export function distributeCastleItems(boss, cards) {
  if (boss.id !== 'dimitrescu' || boss.castleItems !== null) return false;
  const ids = [...new Set(cards.map(c => c?.id).filter(Boolean))].sort();
  const copies = CASTLE_BALANCE.copiesPerItem, total = Object.keys(ITEM_DEFINITIONS).length * copies;
  if (ids.length < total) throw new Error(`O castelo exige ao menos ${total} cartas físicas distintas.`);
  let seed = (Number(boss.seed) ^ 0x51ca57e) >>> 0;
  const random = () => { seed += 0x6d2b79f5; let x = seed; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  boss.castleItems = Object.fromEntries(Object.keys(ITEM_DEFINITIONS).flatMap((type, index) =>
    ids.slice(index * copies, index * copies + copies).map(id => [id, { type, consumed: false }])));
  for (const card of cards) if (boss.castleItems[card.id]) card.castleItem = { ...boss.castleItems[card.id] };
  return true;
}
export function normalizeCastle({ boss, gameState }) {
  if (!boss.castleVersion) {
    Object.assign(boss, createCastleState(), { castleItems: {} }); // Legacy games never reroll items on reload.
    boss.maxHp = CASTLE_BALANCE.ladyHp;
    boss.hp = Math.min(boss.hp, boss.maxHp);
  }
  if (REMOVED_DAUGHTER_ABILITIES.has(boss.currentIntent?.abilityId)
    || (boss.currentIntent?.abilityId === 'three_daughters' && boss.currentIntent.payload?.passiveVersion !== 2)) {
    boss.currentIntent = null;
    boss.bossFlow = null;
    boss.awaitingBossTurn = true;
  }
  boss.combatTargetsByPlayer ||= {};
  for (const daughter of boss.combatEntities) {
    if (boss.castleDaughterBalanceVersion !== 2) {
      // Preserve item max-HP losses and wounds; never heal during migration.
      daughter.maxHp = Math.max(CASTLE_BALANCE.daughterHpFloor, daughter.maxHp - 50);
      daughter.regeneration = daughter.regeneration === 30
        ? CASTLE_BALANCE.anticoagulantRegeneration : CASTLE_BALANCE.regeneration;
    }
    daughter.maxHp = Math.max(CASTLE_BALANCE.daughterHpFloor, Math.min(CASTLE_BALANCE.daughterHp, daughter.maxHp));
    daughter.hp = Math.max(0, Math.min(daughter.hp, daughter.maxHp));
    daughter.status = daughter.hp > 0 ? 'alive' : 'dead';
    daughter.sacrificedCards ||= [];
  }
  boss.castleDaughterBalanceVersion = 2;
  // Migrate old floor-only saves once; preserve depleted protection, including zero.
  boss.bloodLinkProtection = bloodLinkRemaining(boss);
  for (const card of allCards(gameState)) {
    if (boss.castleItems?.[card.id]) card.castleItem = { ...boss.castleItems[card.id] };
  }
  for (const [playerId, target] of Object.entries(boss.combatTargetsByPlayer)) {
    if (target !== 'boss' && !livingDaughters(boss).some(d => d.id === target)) boss.combatTargetsByPlayer[playerId] = 'boss';
  }
}
export function killDaughter(state, daughter, eventId, record) {
  if (daughter.deathRecorded) return;
  const protection = Number.isFinite(state.boss.bloodLinkProtection)
    ? state.boss.bloodLinkProtection : bloodLinkCapacity(state.boss) + (isCombatEntityAlive(daughter) ? 0 : CASTLE_BALANCE.linkPerDaughter);
  daughter.deathRecorded = true;
  daughter.hp = 0; daughter.status = 'dead'; daughter.cold = false; daughter.relicRound = null;
  state.boss.bloodLinkProtection = Math.max(0, Math.min(bloodLinkCapacity(state.boss), protection - CASTLE_BALANCE.linkPerDaughter));
  if (daughter.passive) daughter.passive.status = 'cancelled';
  const returned = daughter.sacrificedCards.splice(0);
  state.discard ||= [];
  state.discard.unshift(...returned); // Top is the LAST card; preserve it and return to the bottom.
  record?.({ type: 'daughterDeath', actionId: `daughter_death_${daughter.id}_${eventId}`, targetId: daughter.id,
    fury: furyLevel(state.boss), bloodLinkProtection: bloodLinkRemaining(state.boss), sound: 'howDareYou', returnedCardIds: returned.map(c => c.id) });
}
export function damageDaughter(state, daughter, amount, eventId, record) {
  const applied = damageCombatEntity(daughter, amount, eventId);
  if (daughter.hp === 0 && applied) killDaughter(state, daughter, eventId, record);
  return applied;
}
export function startCastleRound(state, { huntCandidates, meldCandidates, choose, selectedDaughterId = null }) {
  const boss = state.boss;
  if ((!selectedDaughterId && boss.castlePassiveRound === boss.roundNumber) || boss.result) return;
  boss.castlePassiveRound = boss.roundNumber;
  const alive = livingDaughters(boss);
  const all = boss.currentIntent?.abilityId === 'three_daughters' && boss.currentIntent.activatedRound === boss.roundNumber;
  const alternatives = alive.filter(d => d.id !== boss.castleLastDaughterId);
  const selected = selectedDaughterId ? alive.filter(d=>d.id===selectedDaughterId) : all ? alive : [choose(alternatives.length ? alternatives : alive, 907)].filter(Boolean);
  boss.castleSelectedDaughterIds = selected.map(d => d.id);
  if (!all && selected.length) boss.castleLastDaughterId = selected[0].id;
  for (const daughter of boss.combatEntities) {
    if (!isCombatEntityAlive(daughter)) continue;
    daughter.passive = null;
    if (!boss.castleSelectedDaughterIds.includes(daughter.id)) continue;
    if (daughter.relicRound != null && daughter.relicRound <= boss.roundNumber) { daughter.passive = { round: boss.roundNumber, status: 'suppressed' }; continue; }
    if (daughter.id === 'bela') {
      const candidate = choose(huntCandidates(), 911);
      daughter.passive = candidate ? { round: boss.roundNumber, status: 'active', targetPlayerId: candidate.player.id, cardId: candidate.card.id } : { round: boss.roundNumber, status: 'idle' };
    } else if (daughter.id === 'cassandra') {
      const candidate = choose(meldCandidates(), 919);
      daughter.passive = candidate ? { round: boss.roundNumber, status: 'active', ...candidate } : { round: boss.roundNumber, status: 'idle' };
    } else daughter.passive = { round: boss.roundNumber, status: 'active' };
  }
}
export function resolveDaughterPassive(state, daughter, changeBlood) {
  if (!isCombatEntityAlive(daughter) || daughter.passive?.status !== 'active') return;
  daughter.passive.status = daughter.id === 'daniela' ? 'idle' : 'failed';
  if (daughter.id !== 'daniela') changeBlood(CASTLE_BALANCE.passiveBlood, `Passiva de ${daughter.name}`, `daughter_${daughter.id}_${state.boss.roundNumber}`);
}
export function regenerateDaughters(state, changeBlood, record) {
  const boss = state.boss;
  if (boss.castleRegeneratedRound === boss.roundNumber || boss.result) return;
  boss.castleRegeneratedRound = boss.roundNumber;
  for (const d of boss.combatEntities) resolveDaughterPassive(state, d, changeBlood);
  for (const d of livingDaughters(boss)) {
    const amount = d.cold ? 0 : Math.min(d.regeneration, d.maxHp - d.hp);
    const blocked = d.cold; d.cold = false; d.hp += amount;
    if (d.passive?.round === boss.roundNumber && d.passive.status === 'suppressed') d.relicRound = null;
    record({ type: 'daughterRegen', actionId: `daughter_regen_${d.id}_${boss.roundNumber}`, targetId: d.id, amount, blocked, hp: d.hp });
  }
}
export function sacrificeCastleItem(state, playerId, cardId, daughterId, record) {
  const boss = state.boss, player = state.players.find(p => p.id === playerId);
  const daughter = livingDaughters(boss).find(d => d.id === daughterId);
  const index = player?.hand.findIndex(c => c.id === cardId) ?? -1;
  const metadata = boss.castleItems?.[cardId];
  if (!daughter || index < 0 || !metadata || metadata.consumed || !ITEM_DEFINITIONS[metadata.type]) return null;
  const card = player.hand.splice(index, 1)[0];
  metadata.consumed = true; card.castleItem = { ...metadata };
  daughter.sacrificedCards.push(card);
  daughter.maxHp = Math.max(CASTLE_BALANCE.daughterHpFloor, daughter.maxHp - CASTLE_BALANCE.itemMaxHpLoss);
  daughter.hp = Math.min(daughter.hp, daughter.maxHp);
  const eventId = `castle_item_${cardId}`;
  if (metadata.type === 'cold_flask') daughter.cold = true;
  if (metadata.type === 'anticoagulant') daughter.regeneration = CASTLE_BALANCE.anticoagulantRegeneration;
  if (metadata.type === 'relic') {
    const pending = daughter.passive?.round === boss.roundNumber && daughter.passive.status === 'active';
    daughter.relicRound = boss.roundNumber + (pending ? 0 : 1);
    if (pending) daughter.passive.status = 'suppressed';
  }
  const damage = metadata.type === 'dagger' ? CASTLE_BALANCE.daggerDamage : metadata.type === 'explosive' ? CASTLE_BALANCE.explosiveDamage : 0;
  const appliedDamage = damage ? damageDaughter(state, daughter, damage, eventId, record) : 0;
  const event = { type: 'castleItem', actionId: eventId, playerId, targetId: daughterId, cardId, itemType: metadata.type, appliedDamage, hp: daughter.hp, maxHp: daughter.maxHp };
  return record(event);
}
export function chooseCastleDamageTarget(state, damage = 100) {
  const boss = state.boss, daughters = livingDaughters(boss);
  if (!daughters.length || bloodLinkRemaining(boss) === 0) return 'boss';
  // A lethal daughter strike also removes up to 500 protection; otherwise direct
  // attacks consume protection permanently instead of hitting the former HP floor.
  return daughters.filter(d => d.hp <= damage).sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0]?.id || 'boss';
}
export function chooseCastleItem(state, playerId, canUse) {
  const player = state.players.find(p => p.id === playerId), boss = state.boss;
  if (!player || player.hand.length <= 2) return null;
  const candidates = player.hand.filter(c => boss.castleItems?.[c.id] && !boss.castleItems[c.id].consumed)
    .filter(c => boss.combatEntities.find(d => d.id === 'bela')?.passive?.cardId !== c.id
      && !boss.currentIntent?.payload?.marks?.some(m => m.status === 'active' && m.cardId === c.id));
  for (const card of candidates.sort((a, b) => a.id.localeCompare(b.id))) {
    // Preserve likely clean runs: sacrifice isolated cards, not an obvious same-suit run.
    const nearby = player.hand.filter(c => c.id !== card.id && c.suit === card.suit && !c.joker);
    if (!card.joker && card.rank !== '2' && nearby.length >= 2) continue;
    if (card.joker || card.rank === '2') continue; // high meld value: keep wildcards.
    for (const d of [...livingDaughters(boss)].sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))) {
      const type = boss.castleItems[card.id].type;
      if ((type === 'anticoagulant' && d.regeneration === CASTLE_BALANCE.anticoagulantRegeneration) || (type === 'cold_flask' && d.cold)
        || (type === 'relic' && d.relicRound != null)) continue;
      if (canUse(card.id, d.id)) return { cardId: card.id, daughterId: d.id };
    }
  }
  return null;
}
