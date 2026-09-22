// Choose a useful, available face, never the stock's draw order or hidden hands.
export function chooseDominationSearchCard(state, rules) {
  if (state?.mode !== '1x1_dominacao' || state.dominationOptions?.search === false || state.dominatorSearchUsed) return null;
  const player = state.players.find(p => p.id === 1);
  const team = state.teams.find(t => t.id === player?.teamId);
  if (!player || !team) return null;
  let best = null;
  const bonus = { limpa: 500, real: 1500, asas: 3000 };
  for (const [source, stock] of [['main', state.stock || []], ['auxiliary', state.dominationFriendShared?.stock || []]]) {
    const seen = new Set();
    for (const card of stock) {
      const face = card.joker ? 'joker' : `${card.suit}:${card.rank}`;
      if (seen.has(face)) continue;
      seen.add(face);
      let score = 0;
      for (const base of team.melds) {
        const after = rules.prepare([...base, card]);
        if (!rules.valid(after)) continue;
        const cleanBefore = !base.some(c => rules.isWild(c, base));
        const cleanAfter = !after.some(c => rules.isWild(c, after));
        if (cleanBefore && !cleanAfter) continue;
        const beforeKind = rules.classify(base), afterKind = rules.classify(after);
        score = Math.max(score, (cleanAfter ? 200 : 60) + after.length * 5 + (beforeKind !== afterKind ? bonus[afterKind] || 0 : 0));
      }
      for (let i = 0; i < player.hand.length; i++) {
        for (let j = i + 1; j < player.hand.length; j++) {
          const meld = rules.prepare([player.hand[i], player.hand[j], card]);
          if (rules.valid(meld) && !meld.some(c => rules.isWild(c, meld))) score = Math.max(score, 100);
        }
      }
      if (score > (best?.score || 0)) best = { source, cardId: card.id, score };
    }
  }
  return best; // Save the once-per-match power if no immediate use is available.
}
