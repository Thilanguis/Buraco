import { createCastleState, normalizeCastle, chooseCastleDamageTarget, damageDaughter, resolveDaughterPassive, regenerateDaughters } from '../dimitrescu-castle.js';

function matchesMeld(target, meldId, meldIndex) {
  if (!target) return false;
  if (target.meldId && meldId) return target.meldId === meldId;
  return Number(target.meldIndex) === Number(meldIndex);
}

export const dimitrescuBossMechanics = Object.freeze({
  id: 'dimitrescu',
  createState: createCastleState,
  normalize: normalizeCastle,
  applyDamage({ boss, gameState, damage, playerId, sourceActionId, recordBossEvent }) {
    const player = gameState.players?.find(p => p.id === playerId);
    const selected = boss.combatTargetsByPlayer[playerId]
      ?? (player?.isBot || /bot/i.test(player?.name || '') ? chooseCastleDamageTarget(gameState, damage) : 'boss');
    const daughter = boss.combatEntities.find(d => d.id === selected && d.status === 'alive');
    if (!daughter) return null; // Lady: Coágulo -> consumable Blood Link -> HP.
    return { hpDamage: damageDaughter(gameState, daughter, damage, sourceActionId, recordBossEvent), targetId: daughter.id, absorbed: 0, reborn: false };
  },
  onPlayerTurnEnd({ boss, gameState, playerId, changeBlood }) {
    const bela = boss.combatEntities.find(d => d.id === 'bela');
    if (bela?.passive?.targetPlayerId === playerId) resolveDaughterPassive(gameState, bela, changeBlood);
  },
  beforeRoundResolve({ boss, gameState, changeBlood }) {
    for (const daughter of boss.combatEntities) resolveDaughterPassive(gameState, daughter, changeBlood);
  },
  onMeldTransition({
    boss,
    playerId = null,
    meldId = null,
    meldIndex = null,
    cardsAdded = [],
    isCardUsedAsWildcard = () => false,
    changeBlood,
    previousDangerReliefValue = 0,
    nextDangerReliefValue = 0,
  } = {}) {
    if (!boss) return null;
    const bloodReduction = Math.max(0, Number(nextDangerReliefValue) - Number(previousDangerReliefValue));
    const intent = boss.currentIntent;

    const addedIds = new Set(cardsAdded.map((card) => card?.id).filter(Boolean));
    for (const daughter of boss.combatEntities || []) {
      const passive = daughter.passive;
      if (daughter.status !== 'alive' || passive?.status !== 'active' || !addedIds.size) continue;
      if (daughter.id === 'bela' && passive.targetPlayerId === playerId && addedIds.has(passive.cardId)) passive.status = 'success';
      if (daughter.id === 'cassandra' && matchesMeld(passive, meldId, meldIndex)) passive.status = 'success';
    }
    if (!intent || !addedIds.size) return { bloodReduction };

    if (intent.abilityId === 'bela_hunt' && intent.payload?.targetPlayerId === playerId && addedIds.has(intent.payload?.cardId)) {
      intent.payload.used = true;
    }

    if (intent.abilityId === 'cassandra_feast' && matchesMeld(intent.payload, meldId, meldIndex)) {
      intent.payload.fed = true;
    }

    if (intent.abilityId === 'crimson_brand') {
      for (const mark of intent.payload?.marks || []) {
        if (mark.status === 'active' && mark.playerId === playerId && addedIds.has(mark.cardId)) mark.status = 'success';
      }
    }

    if (intent.abilityId === 'impure_blood' && playerId != null && cardsAdded.some(isCardUsedAsWildcard)) {
      const triggered = intent.payload.triggeredPlayerIds ||= [];
      if (!triggered.includes(playerId) && triggered.length < 2) {
        triggered.push(playerId);
        changeBlood?.(3, 'Sangue Impuro', `impure_blood_${intent.id}_${playerId}`);
      }
    }

    return { bloodReduction };
  },

  afterMeldResolution({ boss, contribution, appliedBloodReduction = 0, newKind = 'simple' } = {}) {
    const applied = Math.max(0, Number(appliedBloodReduction) || 0);
    if (contribution) contribution.dimitrescuBloodRelief += applied;
    return {
      dangerChangeLabel: applied ? `Canastra ${newKind === 'asas' ? 'Ás-a-Ás' : newKind}: Sede -${applied}` : '',
      eventFields: {
        bloodClotRemaining: boss?.crimsonClot?.status === 'active' ? Math.max(0, Number(boss.crimsonClot.remaining) || 0) : null,
      },
    };
  },

  afterIntentResolve({ boss, gameState, allPlayersActed = false, resolveBloodRound = null, changeBlood, recordBossEvent } = {}) {
    if (!allPlayersActed || typeof resolveBloodRound !== 'function') return {};
    const bloodEvents = (resolveBloodRound() || []).filter(Boolean);
    regenerateDaughters(gameState, changeBlood, recordBossEvent);
    return { bloodEvents, fallbackEvent: bloodEvents.at(-1) || null };
  },

  confirmTurnDefeat({ confirmDimitrescuDefeat = null, sourceActionId = null } = {}) {
    return typeof confirmDimitrescuDefeat === 'function'
      ? { defeatEvent: confirmDimitrescuDefeat(sourceActionId) }
      : {};
  },

});
