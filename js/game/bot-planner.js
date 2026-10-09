const RANK_HIGH = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
const RANK_LOW = Object.freeze(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

function rankOf(card) {
  return card?.rank == null ? '' : String(card.rank);
}

function isTwo(card) {
  return !card?.joker && rankOf(card) === '2';
}

function neededWilds(naturals, order, acePosition) {
  if (!naturals.length) return null;
  const index = new Map(order.map((rank, i) => [rank, i]));
  const sorted = naturals.slice().sort((a, b) => (index.get(rankOf(a)) ?? 99) - (index.get(rankOf(b)) ?? 99));
  const aceIndex = sorted.findIndex((card) => rankOf(card) === 'A');
  if (aceIndex >= 0) {
    if (acePosition === 'high' && aceIndex !== sorted.length - 1) return null;
    if (acePosition === 'low' && aceIndex !== 0) return null;
  }
  let needed = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = index.get(rankOf(sorted[i - 1]));
    const current = index.get(rankOf(sorted[i]));
    if (!Number.isFinite(previous) || !Number.isFinite(current) || current <= previous) return null;
    needed += Math.max(0, current - previous - 1);
  }
  return needed;
}

function assignmentCanSequence(cards, naturalTwoIds) {
  const naturalTwoSet = new Set(naturalTwoIds);
  const naturals = [];
  let wilds = 0;

  for (const card of cards) {
    if (!card) return false;
    if (card.joker) {
      wilds += 1;
      continue;
    }
    if (isTwo(card) && !naturalTwoSet.has(card.id)) {
      wilds += 1;
      continue;
    }
    naturals.push(card);
  }

  if (wilds > 1 || !naturals.length) return false;
  const suit = naturals[0]?.suit;
  if (!suit || naturals.some((card) => card.suit !== suit)) return false;

  const high = neededWilds(naturals, RANK_HIGH, 'high');
  const low = neededWilds(naturals, RANK_LOW, 'low');
  if ((high != null && high <= wilds) || (low != null && low <= wilds)) return true;

  // Keep Ace-to-Ace candidates conservative. It normally matters only for
  // longer melds, but accepting them here cannot create an illegal move: the
  // authoritative game validator still runs before execution.
  return naturals.filter((card) => rankOf(card) === 'A').length >= 2
    && naturals.some((card) => rankOf(card) === 'K');
}

export function isPlausibleSequenceTriple(cards) {
  if (!Array.isArray(cards) || cards.length !== 3 || cards.some((card) => !card)) return false;

  const twos = cards.filter(isTwo);
  const candidates = [[]];
  for (const two of twos) {
    const snapshot = candidates.slice();
    for (const base of snapshot) candidates.push([...base, two.id]);
  }

  // A 2 can be natural only in its own suit. Reject impossible assignments
  // before the expensive live rules engine sees them.
  for (const naturalIds of candidates) {
    const naturalSet = new Set(naturalIds);
    if (naturalIds.some((id) => {
      const two = twos.find((card) => card.id === id);
      const hardNatural = cards.find((card) => !card.joker && !isTwo(card));
      return hardNatural && two?.suit !== hardNatural.suit;
    })) continue;
    if (assignmentCanSequence(cards, naturalSet)) return true;
  }
  return false;
}

export function planTripleIndexes(hand) {
  const cards = Array.isArray(hand) ? hand : [];
  const result = [];
  for (let i = 0; i < cards.length - 2; i += 1) {
    for (let j = i + 1; j < cards.length - 1; j += 1) {
      for (let k = j + 1; k < cards.length; k += 1) {
        if (isPlausibleSequenceTriple([cards[i], cards[j], cards[k]])) result.push([i, j, k]);
      }
    }
  }
  return result;
}

export function planPairIndexesWithTop(hand, topCard) {
  const cards = Array.isArray(hand) ? hand : [];
  const result = [];
  if (!topCard) return result;
  for (let i = 0; i < cards.length - 1; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      if (isPlausibleSequenceTriple([cards[i], cards[j], topCard])) result.push([i, j]);
    }
  }
  return result;
}

export function plannerFingerprint(state, botIndex) {
  const player = state?.players?.[botIndex];
  const team = player ? state?.teams?.[player.teamId] : null;
  const ids = (cards) => (cards || []).map((card) => card?.id || `${card?.rank || '?'}${card?.suit || '?'}`).join(',');
  const melds = (team?.melds || []).map(ids).join('/');
  const discard = state?.discard || [];
  return [
    state?.turnNumber ?? -1,
    state?.currentPlayer ?? -1,
    state?.hasDrawnThisTurn ? 1 : 0,
    state?.partialDraw ? 1 : 0,
    state?.stock?.length ?? -1,
    discard.length,
    discard.at?.(-1)?.id || '',
    ids(player?.hand),
    melds,
    ...(state?.mode?.startsWith('boss_') ? [JSON.stringify({
      boss: state.boss, action: state.lastAction?.id, finished: state.finished,
      dead: (state.deadPiles || []).map(p => p?.length || 0), taken: state.deadChunksTaken,
      hands: (state.players || []).map(p => p.hand?.length || 0),
    })] : []),
  ].join('|');
}

// Public-information boundary: neither partner identities nor future draws are
// copied. Hand counts are public; a bot partner gets no special permission.
const bossPublicHistory = new WeakMap();
export function observeBossPublicAction(state) {
  const a=state?.lastAction;
  if (!state?.mode?.startsWith('boss_') || !['meldNew','meldExtend','discard'].includes(a?.type)) return;
  const entry={id:a.id || JSON.stringify([a.type,a.playerId,(a.cards || [a.card]).map(c=>c?.id)]),
    type:a.type,playerId:a.playerId,cards:(a.cards || (a.card?[a.card]:[])).map(c=>({id:c.id,rank:c.rank,suit:c.suit,joker:c.joker}))};
  const history=bossPublicHistory.get(state) || [];
  if (history.some(e=>e.id===entry.id)) return;
  bossPublicHistory.set(state,[...history.slice(-15),entry]);
}
export function bossObservableState(state, botIndex) {
  const clone = value => JSON.parse(JSON.stringify(value));
  const hidden = (cards, prefix) => Array.from({length: cards?.length || 0}, (_, i) => ({id: `${prefix}:${i}`}));
  const result = {};
  for (const key of ['mode', 'variant', 'currentPlayer', 'turnNumber', 'hasDrawnThisTurn', 'partialDraw',
    'pickedDiscardCardId', 'deadChunksTaken', 'deadChunksMax', 'finished', 'boss']) {
    if (state[key] !== undefined) result[key] = clone(state[key]);
  }
  result.players = (state.players || []).map((p, i) => ({id:p.id, teamId:p.teamId, name:p.name,
    ...(i === botIndex ? {isBot:!!p.isBot} : {}),
    hand:i === botIndex ? clone(p.hand || []) : hidden(p.hand, `hidden:${p.id}`)}));
  result.teams = clone(state.teams || []);
  result.discard = clone(state.discard || []);
  result.stock = hidden(state.stock, 'stock');
  result.deadPiles = (state.deadPiles || []).map((p, i) => hidden(p, `dead:${i}`));
  if (['meldNew','meldExtend','discard'].includes(state.lastAction?.type)) {
    const a=state.lastAction;
    result.lastAction=clone({type:a.type,playerId:a.playerId,meldIndex:a.meldIndex,cards:a.cards,card:a.card});
  }
  result.publicActions=clone(bossPublicHistory.get(state) || state.publicActions || []);
  return result;
}

// Same potential as before, indexed by suit/rank rather than repeatedly filtering
// the hand. This is valuation only; legality still belongs to the engine.
const rankNeighbours = new Map(RANK_LOW.map(rank => [rank, [...new Set([RANK_LOW, RANK_HIGH]
  .flatMap(order => { const i=order.indexOf(rank); return [order[i-1],order[i+1]].filter(Boolean); }))]]));
const handKey = (suit,rank) => `${suit}:${rank}`;
function handPotential(hand = [], melds = []) {
  const counts=new Map(), affected=new Map(), entries=[];
  for(const c of hand) if(!c.joker) {const key=handKey(c.suit,rankOf(c));counts.set(key,(counts.get(key)||0)+1);}
  const boards=melds.filter(m=>m.length<14&&!m.some(c=>c.joker||c.forceWild));
  let total=0;
  for(const c of hand) {
    const neighbours=rankNeighbours.get(rankOf(c)) || [];
    const reserved=c.joker||c.forceWild||(isTwo(c)&&!c.forceNatural);
    const degree=neighbours.reduce((n,r)=>n+(counts.get(handKey(c.suit,r))||0),0);
    let value=reserved?28:Math.min(2,degree)*7;
    if(!reserved) {
      const board=boards.find(m=>m.some(o=>o.suit===c.suit&&neighbours.includes(rankOf(o))));
      if(board)value+=board.length>=5?18:8;
      if(degree>0&&degree<=2) {const key=handKey(c.suit,rankOf(c));affected.set(key,(affected.get(key)||0)+1);}
    }
    total+=value;entries.push({c,value,neighbours});
  }
  // Removing a neighbour changes another card's capped score only at degree 1/2.
  const marginals=new Map(entries.map(({c,value,neighbours})=>[c.id,value+(c.joker?0:
    7*neighbours.reduce((n,r)=>n+(affected.get(handKey(c.suit,r))||0),0))]));
  return {total,marginals};
}
export function cooperativeHandValue(hand, melds = []) { return handPotential(hand || [],melds).total; }
export function cooperativeHandMarginals(hand, melds = []) { return handPotential(hand || [],melds).marginals; }

export function bossStockOpportunityValue(state,botIndex) {
  if (!state.stock?.length) return -Infinity;
  const p=state.players[botIndex],melds=state.teams[p.teamId].melds;
  const known=[...p.hand,...state.discard,...state.teams.flatMap(t=>t.melds.flat())];
  const base=cooperativeHandValue(p.hand,melds);
  let total=0,count=0;
  for (const suit of ['♠','♥','♦','♣']) for (const rank of RANK_LOW) {
    const copies=Math.max(0,2-known.filter(c=>!c.joker&&c.suit===suit&&String(c.rank)===rank).length);
    const potential=cooperativeHandValue([...p.hand,{id:'possible',rank,suit}],melds)-base;
    total+=copies*potential;count+=copies;
  }
  const jokers=Math.max(0,4-known.filter(c=>c.joker).length);total+=jokers*28;count+=jokers;
  // Unknown cards are not promised to be in the Monte: use the public unseen
  // pool as an expectation, never actual stock/partner identities.
  return Math.max(3,Math.min(18,2*total/Math.max(1,count)));
}
