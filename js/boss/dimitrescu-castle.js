// Persistent castle combat, independent of Nemesis' invasion/reanimation lifecycle.
import { damageCombatEntity, isCombatEntityAlive } from './boss-combat.js';

export const LEGACY_CASTLE_BALANCE = Object.freeze({ ladyHp: 2000, daughterHp: 450, linkPerDaughter: 500,
  regeneration: 50, anticoagulantRegeneration: 25, passiveBlood: 3, itemMaxHpLoss: 100,
  daughterHpFloor: 200, copiesPerItem: 3, daggerDamage: 50, explosiveDamage: 100, furyHealingStep: .1, furyBloodStep: 2 });
export const CASTLE_BALANCE = Object.freeze({ ...LEGACY_CASTLE_BALANCE, daughterHp: 500, daughterHpFloor: 130,
  regeneration: 20, anticoagulantRegeneration: 10,
  daggerDamage: 0, daggerTransfer: .80, explosiveDamage: 100, bleedAmount: 15, bleedPercent: .03,
  itemEffectsVersion: 2, relicAttackBonus: .20, freezeTurns: 2,
  bleedPermanent: true, bleedRounds: null, coldMaxCharges: 2,
  maxHpLossByItem: Object.freeze({ dagger: 80, explosive: 110, anticoagulant: 100, cold_flask: 160, relic: 160 }),
  maxHpLossPercent: Object.freeze({ dagger: .16, explosive: .22, cold_flask: .32, anticoagulant: .20, relic: .32 }) });
export const castleRules = boss => boss?.castleItemRulesVersion === 2 ? boss.castleItemRules || CASTLE_BALANCE : LEGACY_CASTLE_BALANCE;
export const usesGlobalCastleItems = boss => boss?.castleItemRulesVersion === 2 && castleRules(boss).itemEffectsVersion === 2;
export const castleFrozen = boss => usesGlobalCastleItems(boss) && boss.castleFreeze?.remainingTurns > 0;
export function freezeCastle(state, actionId) {
  const boss = state.boss;
  // Refresh, never add durations. The current opportunity counts again on refresh.
  boss.castleFreeze = { remainingTurns: castleRules(boss).freezeTurns, actionId, resolvedTurnIds: [] };
  for (const d of livingDaughters(boss)) {
    if (d.passive?.status === 'active') {
      d.passive.status = 'suppressed';
      d.passive.suppressedBy = 'freeze';
    }
  }
}
export function completeCastleFreezeTurn(state, playerId, record) {
  const boss = state.boss, freeze = boss.castleFreeze;
  if (!castleFrozen(boss)) return;
  const turnId = `turn_${state.turnNumber}_${playerId}`;
  if (freeze.resolvedTurnIds.includes(turnId)) return;
  freeze.resolvedTurnIds.push(turnId);
  freeze.remainingTurns = Math.max(0, freeze.remainingTurns - 1);
  record?.({ type: 'castleFreezeTurn', actionId: `freeze_${freeze.actionId}_${turnId}`,
    playerId, remainingTurns: freeze.remainingTurns });
}
export const daughterOriginalHp = (boss, daughter) => daughter.originalMaxHp || castleRules(boss).daughterHp;
export const hasCastleHemorrhage = daughter => !!(daughter.hemorrhage?.permanent || daughter.hemorrhage?.remaining > 0);
export const castleBleedAmount = (boss, daughter = null) => castleRules(boss).bleedAmount
  ?? Math.round((daughter ? daughterOriginalHp(boss, daughter) : castleRules(boss).daughterHp) * castleRules(boss).bleedPercent);
export const castleItemHpLoss = (boss, type, daughter = null) => boss?.castleItemRulesVersion === 2
  ? castleRules(boss).maxHpLossByItem?.[type]
    ?? Math.round((daughter ? daughterOriginalHp(boss, daughter) : castleRules(boss).daughterHp) * castleRules(boss).maxHpLossPercent[type])
  : LEGACY_CASTLE_BALANCE.itemMaxHpLoss;
const LADY_BLOOD_BALANCE = Object.freeze({
  1: Object.freeze({ mediumTithe: 3, heavyTithe: 6, crimsonBrand: 5 }),
  2: Object.freeze({ mediumTithe: 4, heavyTithe: 8, crimsonBrand: 7, deadFeast: 10 }),
  3: Object.freeze({ mediumTithe: 6, heavyTithe: 10, crimsonBrand: 9, deadFeast: 14 }),
});
export const ladyBloodBalance = phase => LADY_BLOOD_BALANCE[Number(phase)] || LADY_BLOOD_BALANCE[1];
// Fury is applied once to the collective quote, not once per hand/mark.
export const ladyTitheBalance = Object.freeze({ mediumTithe: 2, heavyTithe: 4 });
export const ladyTitheParameters = (boss, intent) => intent?.payload?.bloodPressureVersion === 1
  ? ladyBloodBalance(intent.announcedPhase) : ladyTitheBalance;
export const ladyTitheBlood = (boss, amount, intent = null) => intent?.payload?.bloodPressureVersion === 1
  ? furyBlood(boss, amount) : amount > 0 ? amount + [0,4,8,10][furyLevel(boss)] : 0;
export const ladyCrimsonBrandBase = (boss, phase, intent = null) => intent?.payload?.bloodPressureVersion === 1
  ? ladyBloodBalance(phase).crimsonBrand : Math.max(1,
  Math.floor(ladyBloodBalance(phase).crimsonBrand * (.4 + .2 * furyLevel(boss)) + 1e-8));
const item = (label, file, special) => Object.freeze({ label, image: `assets/images/items/${file}.png`, special });
export const ITEM_DEFINITIONS = Object.freeze({
  dagger: item('Adaga', 'adaga', 'Vínculo Sangrento: 80% do dano dos seus ataques à filha também atinge a vida da Lady, ignorando as proteções.'),
  cold_flask: item('Frasco Congelante', 'frasco-frio', 'Congela as três filhas pelo restante deste turno e pelo próximo turno de um cooperador. Elas não regeneram nem usam passivas. Objetivos pendentes são cancelados sem punição. Outro Frasco renova a duração, sem acumular.'),
  anticoagulant: item('Anticoagulante', 'anticoagulante', `Regeneração cai de ${CASTLE_BALANCE.regeneration} para ${CASTLE_BALANCE.anticoagulantRegeneration}, permanentemente. Não acumula.`),
  explosive: item('Explosivo', 'explosivo', 'Causa 100 de dano imediato. A filha perde 15 HP antes de regenerar no fim de cada rodada, até morrer. Outro Explosivo causa novo impacto, sem aumentar o sangramento.'),
  relic: item('Relíquia', 'reliquia', 'A filha recebe 20% mais dano dos ataques diretos até morrer. Não aumenta dano de Explosivo, hemorragia ou outros efeitos. Outra Relíquia não aumenta o bônus.'),
});
export const hasUnspentCastleItem = (state,cardId) => state?.boss?.id === 'dimitrescu'
  && !!ITEM_DEFINITIONS[state.boss.castleItems?.[cardId]?.type] && !state.boss.castleItems[cardId].consumed;
export const ITEM_COMMON_HELP = 'Cada item petrifica uma parte diferente da vida da filha (mínimo recuperável: 130). A carta fica presa a ela e volta ao fundo do Lixo na morte, sem item. Usar não encerra o turno: guarde uma carta para descartar.';
export const REMOVED_DAUGHTER_ABILITIES = new Set(['bela_hunt', 'cassandra_feast', 'daniela_swarm']);
export const DAUGHTER_IDS = Object.freeze(['bela', 'cassandra', 'daniela']);
export function createCastleState() {
  return { castleVersion: 1, castleDaughterBalanceVersion: 3, castleItemRulesVersion: 2, castleRebalanceVersion: 1, castleExplosiveBalanceVersion: 1,
    castleItemEffectsVersion: 1, castlePetrificationBalanceVersion: 1, castleBloodPressureVersion: 2, castleFreeze: null,
    castleItemRules: { ...CASTLE_BALANCE, maxHpLossByItem: {...CASTLE_BALANCE.maxHpLossByItem}, maxHpLossPercent: { ...CASTLE_BALANCE.maxHpLossPercent } },
    castleItems: null, castlePassiveRound: 0, castleRegeneratedRound: 0, castleSelectedDaughterIds: [], castleLastDaughterId: null,
    bloodLinkProtection: 1500, combatTargetsByPlayer: {}, combatEntities: DAUGHTER_IDS.map(id => ({ id, name: id[0].toUpperCase() + id.slice(1),
      portrait: `assets/images/boss-dimitrescu-${id}.png`, hp: CASTLE_BALANCE.daughterHp, maxHp: CASTLE_BALANCE.daughterHp,
      originalMaxHp: CASTLE_BALANCE.daughterHp, status: 'alive', regeneration: CASTLE_BALANCE.regeneration,
      cold: false, coldCharges: 0, daggerLink: false, hemorrhage: null, castleDamageActionIds: [],
      relicRound: null, relicAttackBonus: false, sacrificedCards: [], passive: null })) };
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
    Object.assign(boss, createCastleState(), { castleItems: {}, castleItemRulesVersion: 1, castleItemRules: null,
      castleDaughterBalanceVersion: 2 }); // Legacy games never reroll items or acquire new effects on reload.
    for (const d of boss.combatEntities) {
      d.hp = d.maxHp = d.originalMaxHp = LEGACY_CASTLE_BALANCE.daughterHp;
      d.regeneration = LEGACY_CASTLE_BALANCE.regeneration;
    }
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
  // Missing item version stays legacy; modern effects migrate explicitly below.
  boss.castleItemRulesVersion ||= 1;
  if (boss.castleItemRulesVersion === 2 && !boss.castleRebalanceVersion) {
    // Apply the approved B package once to modern saves, without healing,
    // rerolling items, changing petrification or replaying an item/bleed tick.
    const previous = castleRules(boss);
    for (const daughter of boss.combatEntities) {
      const anticoagulant = daughter.regeneration === previous.anticoagulantRegeneration || daughter.regeneration === 25
        || daughter.sacrificedCards?.some(card => card.castleItem?.type === 'anticoagulant');
      daughter.regeneration = anticoagulant ? CASTLE_BALANCE.anticoagulantRegeneration : CASTLE_BALANCE.regeneration;
      if (hasCastleHemorrhage(daughter)) daughter.hemorrhage = {
        ...daughter.hemorrhage, amount: CASTLE_BALANCE.bleedAmount, permanent: true, remaining: null,
      };
    }
    boss.castleItemRules = { ...previous, regeneration: CASTLE_BALANCE.regeneration,
      anticoagulantRegeneration: CASTLE_BALANCE.anticoagulantRegeneration, daggerTransfer: CASTLE_BALANCE.daggerTransfer,
      bleedAmount: CASTLE_BALANCE.bleedAmount, bleedPercent: CASTLE_BALANCE.bleedPercent,
      bleedPermanent: true, bleedRounds: null };
    boss.castleRebalanceVersion = 1;
  }
  // Update future impacts only, without replaying items or changing wounds/ticks.
  if (boss.castleItemRulesVersion === 2 && !boss.castleExplosiveBalanceVersion) {
    boss.castleItemRules = { ...castleRules(boss), explosiveDamage: CASTLE_BALANCE.explosiveDamage };
    boss.castleExplosiveBalanceVersion = 1;
  }
  if (boss.castleItemRulesVersion === 2 && !boss.castleItemEffectsVersion) {
    // Upgrade effects once; never replay petrification, impact, bleed or healing.
    const hadCold = livingDaughters(boss).some(d => d.cold || d.coldCharges > 0);
    boss.castleItemRules = { ...castleRules(boss), itemEffectsVersion: 2,
      relicAttackBonus: .20, freezeTurns: 2, bleedAmount: 15, bleedPercent: .03 };
    for (const d of boss.combatEntities) {
      d.relicAttackBonus = d.hp > 0 && !!d.sacrificedCards?.some(c => c.castleItem?.type === 'relic');
      d.relicRound = null;
      d.cold = false; d.coldCharges = 0;
      if (hasCastleHemorrhage(d)) d.hemorrhage.amount = 15;
    }
    boss.castleItemEffectsVersion = 1;
    if (hadCold) freezeCastle(gameState, 'save_migration');
  }
  if (boss.castleItemRulesVersion === 2 && !boss.castlePetrificationBalanceVersion) {
    // Future sacrifices use the new flat losses. Never reapply old sacrifices,
    // restore HP, reroll cards or replay their effects during reload/undo.
    boss.castleItemRules = {...castleRules(boss), daughterHpFloor:CASTLE_BALANCE.daughterHpFloor,
      maxHpLossByItem:{...CASTLE_BALANCE.maxHpLossByItem}, maxHpLossPercent:{...CASTLE_BALANCE.maxHpLossPercent}};
    boss.castlePetrificationBalanceVersion=1;
  }
  if (!boss.castleBloodPressureVersion) {
    // Preserve a quote already announced by an old save until that intent ends.
    if (['blood_tithe','crimson_brand'].includes(boss.currentIntent?.abilityId)) {
      boss.currentIntent.payload ||= {};
      boss.currentIntent.payload.bloodPressureVersion ??= 1;
    }
    boss.castleBloodPressureVersion=2;
  }
  const rules = castleRules(boss), modern = boss.castleItemRulesVersion === 2;
  for (const daughter of boss.combatEntities) {
    if (!modern && boss.castleDaughterBalanceVersion !== 2) {
      // Preserve item max-HP losses and wounds; never heal during migration.
      daughter.maxHp = Math.max(rules.daughterHpFloor, daughter.maxHp - 50);
      daughter.regeneration = daughter.regeneration === 30
        ? LEGACY_CASTLE_BALANCE.anticoagulantRegeneration : LEGACY_CASTLE_BALANCE.regeneration;
    }
    daughter.originalMaxHp = rules.daughterHp;
    daughter.maxHp = Math.max(rules.daughterHpFloor, Math.min(rules.daughterHp, daughter.maxHp));
    daughter.hp = Math.max(0, Math.min(daughter.hp, daughter.maxHp));
    daughter.status = daughter.hp > 0 ? 'alive' : 'dead';
    daughter.sacrificedCards ||= [];
  }
  boss.castleDaughterBalanceVersion = modern ? 3 : 2;
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
  daughter.coldCharges = 0; daughter.daggerLink = false; daughter.hemorrhage = null; daughter.relicAttackBonus = false;
  state.boss.bloodLinkProtection = Math.max(0, Math.min(bloodLinkCapacity(state.boss), protection - CASTLE_BALANCE.linkPerDaughter));
  if (daughter.passive) daughter.passive.status = 'cancelled';
  const returned = daughter.sacrificedCards.splice(0);
  state.discard ||= [];
  state.discard.unshift(...returned); // Top is the LAST card; preserve it and return to the bottom.
  record?.({ type: 'daughterDeath', actionId: `daughter_death_${daughter.id}_${eventId}`, targetId: daughter.id,
    fury: furyLevel(state.boss), bloodLinkProtection: bloodLinkRemaining(state.boss), sound: 'howDareYou', returnedCardIds: returned.map(c => c.id) });
}
export function damageDaughter(state, daughter, amount, eventId, record, { source = 'other', playerId = null } = {}) {
  const modern = state.boss.castleItemRulesVersion === 2;
  if (modern && eventId) {
    daughter.castleDamageActionIds ||= [];
    if (daughter.castleDamageActionIds.includes(eventId)) return 0;
    daughter.castleDamageActionIds.push(eventId);
  }
  const attack = usesGlobalCastleItems(state.boss) && source === 'attack' && daughter.relicAttackBonus
    ? Math.floor(amount * (1 + castleRules(state.boss).relicAttackBonus)) : amount;
  const applied = damageCombatEntity(daughter, attack, eventId);
  if (modern && source === 'attack' && daughter.daggerLink && applied > 0) {
    const boss = state.boss, before = boss.hp;
    const transmitted = Math.min(before, Math.floor(applied * castleRules(boss).daggerTransfer));
    boss.hp -= transmitted; // Deliberately bypass Coágulo AND Vínculo. No recursive damage pipeline.
    if (transmitted) {
      boss.stats.totalDamage += transmitted;
      record?.({ type: 'daggerTransfer', actionId: `dagger_${eventId}`, sourceEntityId: daughter.id,
        targetId: 'boss', playerId, amount: transmitted, hpBefore: before, hp: boss.hp, daughterDamage: applied });
      if (!boss.hp) {
        boss.defeated = true;
        boss.result = { victory: true, reason: 'boss_defeated', title: 'Lady Dimitrescu foi derrotada', detail: 'O Vínculo Sangrento atingiu a vida da Lady.' };
      }
    }
  }
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
    if (castleFrozen(boss)) {
      daughter.passive = { round: boss.roundNumber, status: 'suppressed', suppressedBy: 'freeze' };
      continue;
    }
    const modern = boss.castleItemRulesVersion === 2;
    if (!modern && daughter.relicRound != null && daughter.relicRound <= boss.roundNumber) { daughter.passive = { round: boss.roundNumber, status: 'suppressed' }; continue; }
    if (daughter.id === 'bela') {
      const candidate = choose(huntCandidates(), 911);
      daughter.passive = candidate ? { round: boss.roundNumber, status: 'active', targetPlayerId: candidate.player.id, cardId: candidate.card.id } : { round: boss.roundNumber, status: 'idle' };
    } else if (daughter.id === 'cassandra') {
      const candidate = choose(meldCandidates(), 919);
      daughter.passive = candidate ? { round: boss.roundNumber, status: 'active', ...candidate } : { round: boss.roundNumber, status: 'idle' };
    } else daughter.passive = { round: boss.roundNumber, status: 'active' };
    // A relic waits through unselected/idle rounds; consume only a real opportunity.
    if (modern && !usesGlobalCastleItems(boss) && daughter.passive.status === 'active' && daughter.relicRound != null && daughter.relicRound <= boss.roundNumber)
      daughter.passive.status = 'suppressed';
  }
}
export function resolveDaughterPassive(state, daughter, changeBlood) {
  if (castleFrozen(state.boss) || !isCombatEntityAlive(daughter) || daughter.passive?.status !== 'active') return;
  daughter.passive.status = daughter.id === 'daniela' ? 'idle' : 'failed';
  if (daughter.id !== 'daniela') changeBlood(CASTLE_BALANCE.passiveBlood, `Passiva de ${daughter.name}`, `daughter_${daughter.id}_${state.boss.roundNumber}`);
}
export function regenerateDaughters(state, changeBlood, record) {
  const boss = state.boss;
  if (boss.castleRegeneratedRound === boss.roundNumber || boss.result) return;
  boss.castleRegeneratedRound = boss.roundNumber;
  for (const d of boss.combatEntities) resolveDaughterPassive(state, d, changeBlood);
  const modern = boss.castleItemRulesVersion === 2;
  for (const d of livingDaughters(boss)) {
    const bleed = d.hemorrhage;
    if (!modern || !hasCastleHemorrhage(d) || bleed.lastTickRound === boss.roundNumber) continue;
    bleed.lastTickRound = boss.roundNumber;
    if (!bleed.permanent) bleed.remaining--;
    const amount = damageDaughter(state, d, bleed.amount, `bleed_${d.id}_${boss.roundNumber}`, record, { source: 'bleed' });
    record({ type: 'daughterBleed', actionId: `daughter_bleed_${d.id}_${boss.roundNumber}`, targetId: d.id, amount, hp: d.hp, permanent: !!bleed.permanent, remaining: bleed.remaining });
    if (!bleed.permanent && !bleed.remaining) d.hemorrhage = null;
  }
  for (const d of livingDaughters(boss)) {
    const available = Math.min(d.regeneration, d.maxHp - d.hp);
    const blocked = castleFrozen(boss) || (d.cold && (!modern || available > 0));
    const amount = blocked ? 0 : available;
    if (modern && !usesGlobalCastleItems(boss)) {
      if (blocked) d.coldCharges = Math.max(0, (d.coldCharges || 1) - 1);
      d.cold = (d.coldCharges || 0) > 0;
    } else if (!modern) d.cold = false;
    d.hp += amount;
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
  const rules = castleRules(boss), modern = boss.castleItemRulesVersion === 2;
  daughter.maxHp = Math.max(rules.daughterHpFloor, daughter.maxHp - castleItemHpLoss(boss, metadata.type, daughter));
  daughter.hp = Math.min(daughter.hp, daughter.maxHp);
  const eventId = `castle_item_${cardId}`;
  if (metadata.type === 'cold_flask') {
    if (usesGlobalCastleItems(boss)) freezeCastle(state, eventId);
    else {
      daughter.cold = true;
      if (modern) daughter.coldCharges = Math.min(rules.coldMaxCharges, (daughter.coldCharges || 0) + 1);
    }
  }
  if (metadata.type === 'dagger' && modern) daughter.daggerLink = true;
  if (metadata.type === 'anticoagulant') daughter.regeneration = rules.anticoagulantRegeneration;
  if (metadata.type === 'explosive' && modern) daughter.hemorrhage = {
    amount: castleBleedAmount(boss, daughter), permanent: !!rules.bleedPermanent,
    remaining: rules.bleedPermanent ? null : rules.bleedRounds,
    lastTickRound: daughter.hemorrhage?.lastTickRound ?? null,
  };
  if (metadata.type === 'relic') {
    if (usesGlobalCastleItems(boss)) daughter.relicAttackBonus = true;
    else {
      const pending = daughter.passive?.round === boss.roundNumber && daughter.passive.status === 'active';
      if (!modern || daughter.relicRound == null) daughter.relicRound = boss.roundNumber + (pending ? 0 : 1);
      if (pending) daughter.passive.status = 'suppressed';
    }
  }
  const damage = metadata.type === 'dagger' ? rules.daggerDamage : metadata.type === 'explosive' ? rules.explosiveDamage : 0;
  const appliedDamage = damage ? damageDaughter(state, daughter, damage, eventId, record, { source: 'item' }) : 0;
  const event = { type: 'castleItem', actionId: eventId, playerId, targetId: daughterId, cardId, itemType: metadata.type, appliedDamage, hp: daughter.hp, maxHp: daughter.maxHp };
  return record(event);
}
export function chooseCastleDamageTarget(state, damage = 100) {
  const boss = state.boss, daughters = livingDaughters(boss);
  if (boss.castleItemRulesVersion === 2 && daughters.length) {
    const clot = boss.crimsonClot?.status === 'active' ? boss.crimsonClot.remaining : 0;
    if (damage >= boss.hp + bloodLinkRemaining(boss) + clot) return 'boss';
    const lethal = daughters.filter(d => d.hp <= damage).sort((a,b) => a.hp - b.hp || a.id.localeCompare(b.id))[0];
    if (lethal) return lethal.id;
    // Invested daughters make the daughter route useful without making it mandatory.
    const invested = daughters.filter(d => d.daggerLink || hasCastleHemorrhage(d) || d.maxHp < daughterOriginalHp(boss,d));
    return invested.sort((a,b) => Number(b.daggerLink) - Number(a.daggerLink) || a.hp - b.hp || a.id.localeCompare(b.id))[0]?.id || 'boss';
  }
  if (!daughters.length || bloodLinkRemaining(boss) === 0) return 'boss';
  // A lethal daughter strike also removes up to 500 protection; otherwise direct
  // attacks consume protection permanently instead of hitting the former HP floor.
  return daughters.filter(d => d.hp <= damage).sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id))[0]?.id || 'boss';
}
