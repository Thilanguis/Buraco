// Shared, serialized team ledger. Classification and physical meld identity are
// supplied by the canonical engine, never inferred from a render or an event.
export const SPECIAL_POINTS = Object.freeze({ limpa: 25, real: 50, asas: 100 });
export const SPECIAL_HELP = 'A equipe ganha 25 pontos por Canastra Limpa, 50 por Real e 100 por Ás-a-Ás.\nSe o mesmo jogo evoluir, ganha só a diferença.\nGaste 100 para dar 5 cartas do topo do Lixo a um dos jogadores. Com menos de 5 cartas no Lixo, não pode usar. A compra normal continua disponível. O excedente fica guardado.\nOs bloqueios e efeitos de retirada do Lixo continuam valendo.';

export function normalizeBossSpecial(boss) {
  if (!boss.cooperativeSpecial) {
    // Existing saves receive their earned categories once. Legacy positional
    // aliases and canonical IDs refer to the same physical meld, not two awards.
    const ledger = {};
    for (const [key, progress] of Object.entries(boss.meldProgress || {})) {
      const id = boss.meldIdsByPosition?.[key] || key;
      ledger[id] = Math.max(ledger[id] || 0, SPECIAL_POINTS[progress.highestKind] || 0);
    }
    const earned = Object.values(ledger).reduce((sum, value) => sum + value, 0);
    boss.cooperativeSpecial = { version: 1, points: earned, earned, ledger,
      activations: 0, cardsReceived: 0, resolvedActionIds: [] };
  }
  return boss.cooperativeSpecial;
}

export function creditBossSpecial(boss, meldId, kind) {
  const special = normalizeBossSpecial(boss);
  const value = SPECIAL_POINTS[kind] || 0;
  const previous = special.ledger[meldId] || 0;
  const added = Math.max(0, value - previous);
  if (added) {
    special.ledger[meldId] = value;
    special.points += added;
    special.earned += added;
  }
  return added;
}

export function bossSpecialView(boss) {
  const special = normalizeBossSpecial(boss);
  return { points: special.points, charges: Math.floor(special.points / 100),
    progress: special.points >= 100 ? 100 : special.points % 100 };
}

// Called only on the authoritative latest snapshot inside a transaction.
// Revision comparison belongs to the transaction boundary, before mutation.
export function consumeBossSpecial(game, { actorId, recipientId, actionId }) {
  const special = normalizeBossSpecial(game.boss);
  const actor = game.players.find(player => player.id === actorId);
  const recipient = game.players.find(player => player.id === recipientId);
  if (!actionId || special.resolvedActionIds.includes(actionId)) return null;
  if (!actor || actor.isBot || actor.name?.toUpperCase().includes('BOT') || actor.teamId !== 0 || !recipient || recipient.teamId !== 0) return null;
  if (special.points < 100 || (game.discard?.length || 0) < 5) return null;
  const cards = [];
  while (cards.length < 5) cards.push(game.discard.pop());
  recipient.hand.push(...cards);
  special.points -= 100;
  special.activations++;
  special.cardsReceived += cards.length;
  special.resolvedActionIds.push(actionId);
  // The engine applies discard reactions once after this physical transfer.
  // No normal-draw flag, extra-draw consumption, Grabber trigger or item removal.
  return { type: 'bossSpecial', id: actionId, playerId: actorId, recipientId,
    cards, count: cards.length, points: special.points, ts: Date.now() };
}
