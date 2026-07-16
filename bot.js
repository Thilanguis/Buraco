// bot.js

export class BuracoBot {
  static _turnLocks = new Set();

  static isCancellationError(error) {
    return error?.name === 'AbortError' || error?.code === 'BOT_TURN_CANCELLED';
  }

  static assertActive(engine, signal) {
    if (signal?.aborted || (typeof engine?.isActive === 'function' && !engine.isActive())) {
      const error = new Error('Turno do bot cancelado porque a partida nao esta mais ativa.');
      error.name = 'AbortError';
      error.code = 'BOT_TURN_CANCELLED';
      throw error;
    }
  }

  static cancelPendingTurns() {
    this._turnLocks.clear();
  }

  static async playTurn(stateIgnored, botIndex, engine, options = {}) {
    const signal = options.signal;
    this.assertActive(engine, signal);
    let state = engine.getState();
    if (!state || !state.players || !state.players[botIndex] || !state.teams) {
      if (typeof window !== 'undefined' && window.isClosingGame) return;
      console.error('[BOT] Estado inicial inválido em playTurn:', state);
      return;
    }

    const turnKey = `${state.turnNumber}:${state.currentPlayer}:${botIndex}`;
    if (this._turnLocks.has(turnKey)) {
      console.warn('[BOT] Jogada duplicada bloqueada para o mesmo turno:', turnKey);
      return;
    }
    this._turnLocks.add(turnKey);

    try {
      let me = state.players[botIndex];
      let team = state.teams[me.teamId];
      let oppTeam = state.teams[me.teamId === 0 ? 1 : 0];

      if (!team || !oppTeam) {
        console.error('[BOT] Times inválidos em playTurn:', { state, botIndex, me });
        return;
      }

      if (typeof engine.resolvePendingBossChoice === 'function') {
        await engine.resolvePendingBossChoice(botIndex);
        state = engine.getState();
        me = state.players[botIndex];
        team = state.teams[me.teamId];
        oppTeam = state.teams[me.teamId === 0 ? 1 : 0];
      }
      if (typeof engine.hasPendingBossChoice === 'function' && engine.hasPendingBossChoice()) return;

      const myScore = engine.computeTeamMeldScore(team).total;
      const oppScore = engine.computeTeamMeldScore(oppTeam).total;
      const stockCount = state.stock.length;
      const tookMorto = (state.deadChunksTaken[team.id] || 0) > 0;
      const oppTookMorto = (state.deadChunksTaken[oppTeam.id] || 0) > 0;

      // 🚨 RADAR DE PÂNICO: Bot percebe que a partida está nos últimos suspiros
      const oppHasCanastra = engine.teamHasGoodCanastra(oppTeam.id);
      const oppAboutToWin = oppTookMorto && oppHasCanastra && state.players.filter((p) => p.teamId === oppTeam.id).some((p) => p.hand.length <= 3);

      // Verifica se existe QUALQUER morto na mesa (seja para pegar ou para virar monte)
      const hasDeadPiles = state.deadPiles && state.deadPiles.some((p) => p && p.length > 0);

      // 🚨 REGRA DO BURACO: Se não tem mais morto e faltam 8 cartas ou menos no monte, é PÂNICO!
      // O bot desliga o modo "fresco" do Ás-a-Ás e passa a desovar jogo separado, sujar cruzado, etc.
      const isMonteSecando = !hasDeadPiles && stockCount <= 8;
      const isPanicDump = oppAboutToWin || isMonteSecando;

      // isDesperate absorve o Pânico, forçando o bot a quebrar as regras de segurar carta
      const isDesperate = oppScore > myScore + 1000 || (oppTookMorto && !tookMorto && stockCount < 25) || isPanicDump;
      const isRushingMorto = !tookMorto && me.hand.length <= 5;
      const isDuo = state.mode?.startsWith('boss_') || state.mode === '2x2' || ((state.mode === '1x2' || state.mode === '1x3') && team.playerIndexes && team.playerIndexes.length > 1);

      // 🛡️ Identifica se o bot faz parte do time "Apelão" (Vantagem)
      const isVip = ((state.mode === '1x1_dominacao' || state.mode === '1x1_duploMorto') && botIndex === 1) || ((state.mode === '1x2' || state.mode === '1x3') && me.teamId === 1);

      // VIP Sniper ativado desde o turno 1, desliga se entrar em pânico
      const isVipSniper = isVip && !isDesperate && stockCount > 10;

      // 🛑 MODO HUMILHAÇÃO (FARMING): Desativado se o jogo estiver acabando
      const isFarming = isVip && tookMorto && engine.teamHasGoodCanastra(team.id) && (!oppHasCanastra || myScore > oppScore + 1000) && stockCount > 6 && !isPanicDump;

      const ctx = { isDesperate, isRushingMorto, isDuo, tookMorto, isVip, isVipSniper, isFarming, isPanicDump };

      engine.showMessage(`🤖 ${me.name} analisando a mesa...`);
      await this.sleep(Math.floor(Math.random() * 4000) + 1500, engine, signal);

      try {
        this.assertActive(engine, signal);
        let boughtFromDiscard = false;
        if (state.discard.length > 0 && !engine.isDiscardBlocked?.()) {
          const intent = this.evaluateDiscard(state, me.hand, team, engine, ctx);
          if (intent && intent.wants) {
            engine.showMessage(`🤖 ${me.name} puxou o Lixo!`);

            this.assertActive(engine, signal);
            const usesClosedDiscard = state.variant === 'fechado' || state.mode?.startsWith('boss_');
            const drawOk = usesClosedDiscard ? await engine.executeDrawDiscardFechado(botIndex, intent) : await engine.executeDrawDiscard(botIndex);
            boughtFromDiscard = drawOk !== false;
          }
        }

        state = engine.getState();
        if (!state || !state.players || !state.players[botIndex]) {
          if (typeof window !== 'undefined' && window.isClosingGame) return;
          console.error('[BOT] Estado inválido após compra do lixo/antes do monte:', state);
          return;
        }

        if (!boughtFromDiscard || state.partialDraw) {
          this.assertActive(engine, signal);
          await engine.executeDrawStock(botIndex);
        }

        await this.sleep(1000, engine, signal);

        state = engine.getState();
        if (!state || !state.players || !state.players[botIndex]) {
          if (typeof window !== 'undefined' && window.isClosingGame) return;
          console.error('[BOT] Estado inválido antes de organizar as cartas:', state);
          return;
        }

        me = state.players[botIndex];
        engine.showMessage(`🤖 ${me.name} organizando as cartas...`);

        await this.processMelds(botIndex, ctx, engine, signal);
        await this.sleep(1000, engine, signal);
      } catch (error) {
        if (this.isCancellationError(error)) throw error;
        console.error('Erro interno:', error);
        let s = engine.getState();
        const botName = s && s.players && s.players[botIndex] ? s.players[botIndex].name : 'BOT';
        engine.showMessage(`🤖 ${botName} deu curto-circuito!`);
      }

      try {
        let s = engine.getState();
        const botName = s && s.players && s.players[botIndex] ? s.players[botIndex].name : 'BOT';

        engine.showMessage(`🤖 ${botName} descartando...`);
        await this.sleep(1200, engine, signal);
        await this.processDiscard(botIndex, me.teamId === 0 ? 1 : 0, engine, signal);
      } catch (error) {
        if (this.isCancellationError(error)) throw error;
        console.error('Erro fatal:', error);

        const s = engine.getState();
        if (s && s.players && s.players[botIndex]) {
          this.assertActive(engine, signal);
          await engine.executeDiscard(botIndex, 0);
        }
      }
    } finally {
      this._turnLocks.delete(turnKey);
    }
  }

  // 🛡️ MOTOR DE VISÃO REAL: Identifica o naipe verdadeiro de um jogo ignorando coringas e o número 2
  static getRealSuit(meld) {
    if (!meld || !meld.length) return null;
    const real = meld.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
    return real ? real.suit : meld[0] ? meld[0].suit : null;
  }

  // 🧠 SIMULADOR FANTASMA DA IA: Arranca a armadura do 2 para o bot ver as possibilidades reais
  static simulateMeld(baseMeld, newCards, engine) {
    const combined = [...baseMeld, ...newCards].map((c) => (c ? { ...c } : null));
    combined.forEach((c) => {
      if (c && !c.joker && (c.rank === '2' || c.rank === 2)) {
        c.forceNatural = false;
        c.forceWild = false;
      }
    });

    // Devolve a armadura se a carta realmente encaixar como natural no novo cenário
    if (engine && engine.normalizeMeld) {
      engine.normalizeMeld(combined);
    }
    return combined;
  }

  static isMeldDirty(meld) {
    if (!meld || meld.length === 0) return false;
    return meld.some((c) => c.joker || c.forceWild || ((c.rank === '2' || c.rank === 2) && !c.forceNatural));
  }

  // 🛡️ MOTOR MATEMÁTICO: Prova que um jogo de 3 cartas na mão é 100% Limpo e permite o início de Ás-a-Ás
  static isComboPerfectlyClean3(combo, engine) {
    if (!combo || combo.length !== 3) return false;
    if (combo.some((c) => c.joker)) return false;

    const testCombo = this.simulateMeld([], combo, engine);
    if (!engine.isValidSequenceMeld(testCombo)) return false;

    const hasTwo = combo.find((c) => c.rank === '2');
    if (hasTwo) {
      const suits = combo.map((c) => c.suit);
      if (!suits.every((s) => s === suits[0])) return false;

      const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const rankIdxs = combo.map((c) => order.indexOf(c.rank)).sort((a, b) => a - b);

      // Trava de blindagem: Garante que não existam cartas repetidas (ex: 2, 2, 4)
      const uniqueRanks = new Set(rankIdxs);
      if (uniqueRanks.size !== 3) return false;

      if (rankIdxs[2] - rankIdxs[0] !== 2) return false; // Se a diferença entre os index não for exata, tem buraco (logo, o 2 é falso)
    }
    return true;
  }

  static evaluateDiscard(state, hand, team, engine, ctx) {
    const pileSize = state.discard.length;
    if (pileSize === 0) return false;

    const topCard = state.discard[pileSize - 1];
    const isJuicyPile = pileSize >= 8;
    const isEndgame = ctx.isVipSniper ? state.stock.length <= 10 : state.stock.length <= 22 || (ctx.tookMorto && hand.length <= 6);

    // 🛑 TRAVA MAGISTRAL UNIVERSAL: Ninguém suja o jogo à toa mais.
    let allowDirty = false;

    if (ctx.isDesperate) {
      allowDirty = true; // Libera a sujeira no pânico total
    } else if (!ctx.isVipSniper && !ctx.isFarming && ctx.isRushingMorto && isJuicyPile) {
      // Bot normal só suja se faltar <5 cartas pro morto E o lixo for gigante (8+ cartas)
      allowDirty = true;
    }

    const topIsWildOrTwo = topCard.joker || topCard.rank === '2';

    const checkSafe = (cardsUsedFromHand, pendingMeld) => {
      const cardsAdded = state.variant === 'fechado' ? pileSize - 1 : pileSize;
      const predictedHandSize = hand.length - cardsUsedFromHand + cardsAdded;

      // 🛑 TRAVA ANTI-OBESIDADE CORRIGIDA (Visão de Monopólio)
      // Bots normais ficam intimidados com lixos gigantes no final do jogo.
      // O VIP (Dominador) IGNORA essa regra e engole o lixo para matar o oponente de fome!
      // Ele só recusa a compra se estiver nas últimas 8 cartas do monte (Panic Dump).
      if (isEndgame && cardsAdded >= 7 && predictedHandSize > 1) {
        if (ctx.isVip && !ctx.isPanicDump) {
          // 👑 LICENÇA PARA GULA: O Dominador pega as cartas para manter o monopólio
        } else if (!ctx.isPanicDump) {
          return false; // Bot escravo recusa a compra suicida
        }
      }

      if (predictedHandSize > 1) return true;
      if (ctx.isFarming && predictedHandSize <= 1) return false;
      if (engine.canTeamTakeDeadNow(team.id)) return true;
      if (engine.teamHasGoodCanastra(team.id)) return true;

      if (pendingMeld && pendingMeld.length >= 7) {
        const realSuit = this.getRealSuit(pendingMeld);
        const hasWild = pendingMeld.some((c) => c.joker || (c.rank === '2' && c.suit !== realSuit) || c.forceWild);
        if (!hasWild) return true;
      }
      return false;
    };

    // FASE 1: Tenta comprar usando jogo LIMPO (Encaixe perfeito)
    if (team.melds && team.melds.length > 0) {
      for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
        if (engine.isMeldLocked?.(team.id, mIdx)) continue;
        const meld = team.melds[mIdx];
        if (topIsWildOrTwo && this.isMeldDirty(meld)) continue;

        const testMeld = this.simulateMeld(meld, [topCard], engine);
        if (engine.isValidSequenceMeld(testMeld)) {
          const realSuit = this.getRealSuit(meld);
          const testSuit = this.getRealSuit(testMeld);
          const hasTwo = meld.some((c) => c.rank === '2');
          const needsWild = testMeld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== testSuit));
          const isPerfectTwo = topCard.rank === '2' && topCard.suit === realSuit && !hasTwo;

          // 🛡️ CORREÇÃO DA CEGUEIRA: Se o jogo já era sujo e a carta do topo é natural, a compra é aprovada!
          const wasDirty = this.isMeldDirty(meld);
          const topIsNatural = !topCard.joker && topCard.rank !== '2';

          if (!needsWild || isPerfectTwo || (wasDirty && topIsNatural)) {
            if (!checkSafe(0, testMeld)) continue;
            return { wants: true, action: 'extend', meldIndex: mIdx };
          }
        }
      }
    }

    if (hand.length >= 2) {
      for (let i = 0; i < hand.length - 1; i++) {
        for (let j = i + 1; j < hand.length; j++) {
          const combo = [hand[i], hand[j], topCard];

          if (this.isComboPerfectlyClean3(combo, engine)) {
            if (!checkSafe(2, combo)) continue;

            // 🛑 TRAVA ANTI-CANIBALISMO NO LIXO (Jogo Limpo)
            const getRealSuit = (cards) => {
              const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
              return real ? real.suit : null;
            };
            const suit = getRealSuit(combo);
            const hasMeldSameSuit = suit && team.melds && team.melds.some((m) => getRealSuit(m) === suit);

            if (hasMeldSameSuit && (ctx.isVip || !ctx.isDesperate)) {
              if (!ctx.isPanicDump) continue;
            }

            return { wants: true, action: 'new', handIndexes: [i, j] };
          }
        }
      }
    }

    // 🧠 FASE 1.5: GOLPE DO FALSO SUJO
    // O bot (especialmente o VIP) usa EXCLUSIVAMENTE o 2 do MESMO naipe para roubar a mesa,
    // garantindo que a sujeira poderá ser limpa depois para fazer as canastras de meta.
    if (hand.length >= 2 && (isJuicyPile || ctx.isVip)) {
      for (let i = 0; i < hand.length - 1; i++) {
        for (let j = i + 1; j < hand.length; j++) {
          const combo = [hand[i], hand[j], topCard];

          if (engine.isValidSequenceMeld(combo)) {
            const wilds = combo.filter((c) => c.joker || c.rank === '2');
            const realCards = combo.filter((c) => !c.joker && c.rank !== '2');

            // Só aprova se tiver 1 "coringa", não for o curingão com estrela, e for um 2 do mesmo naipe
            if (wilds.length === 1 && !wilds[0].joker && wilds[0].rank === '2' && realCards.length > 0) {
              const realSuit = this.getRealSuit(combo);
              if (wilds[0].suit === realSuit) {
                if (!checkSafe(2, combo)) continue;

                // 🛑 TRAVA ANTI-CANIBALISMO NO LIXO (Falso Sujo)
                const getRealSuit = (cards) => {
                  const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
                  return real ? real.suit : null;
                };
                const suit = getRealSuit(combo);
                const hasMeldSameSuit = suit && team.melds && team.melds.some((m) => getRealSuit(m) === suit);

                if (hasMeldSameSuit && (ctx.isVip || !ctx.isDesperate)) {
                  if (!ctx.isPanicDump) continue;
                }

                return { wants: true, action: 'new', handIndexes: [i, j] };
              }
            }
          }
        }
      }
    }

    // FASE 2: Tenta comprar SUJANDO o jogo (Só vai entrar aqui se estiver no Desespero)
    if (allowDirty) {
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          const meld = team.melds[mIdx];
          if (topIsWildOrTwo && this.isMeldDirty(meld)) continue;

          const testMeld = [...meld, topCard];
          if (engine.isValidSequenceMeld(testMeld)) {
            const realSuit = this.getRealSuit(meld);
            // 🛑 TRAVA DE PRESERVAÇÃO DO 2 NO LIXO (Anti-Cross-Suit)
            if (!topCard.joker && topCard.rank === '2' && topCard.suit !== realSuit) {
              if (ctx.isVip && !ctx.isPanicDump) continue;
              if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto) continue;
            }

            const isCanastra = meld.length >= 7;
            const hasTwo = meld.some((c) => c.rank === '2');
            const hasThree = meld.some((c) => c.rank === '3');
            const isLimpa = !this.isMeldDirty(meld);

            if (isCanastra && isLimpa) {
              const isPlayingNaturalTwo = topCard.rank === '2' && topCard.suit === meld[0].suit && hasThree && !hasTwo;
              if (topCard.joker || (topCard.rank === '2' && !isPlayingNaturalTwo)) {
                continue;
              }
            }

            if (!checkSafe(0, testMeld)) continue;
            return { wants: true, action: 'extend', meldIndex: mIdx };
          }
        }
      }

      if (hand.length >= 2) {
        for (let i = 0; i < hand.length - 1; i++) {
          for (let j = i + 1; j < hand.length; j++) {
            const combo = [hand[i], hand[j], topCard];
            const wilds = combo.filter((c) => c.joker || c.rank === '2').length;

            if (wilds === 1 && engine.isValidSequenceMeld(combo)) {
              // 🛑 TRAVA DE PRESERVAÇÃO DO 2 NO LIXO (Nova Sujeira)
              const wildCard = combo.find((c) => c.joker || c.rank === '2');
              const realCard = combo.find((c) => !c.joker && c.rank !== '2');
              if (wildCard && !wildCard.joker && wildCard.rank === '2' && realCard && wildCard.suit !== realCard.suit) {
                if (ctx.isVip && !ctx.isPanicDump) continue;
                if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto) continue;
              }

              if (!checkSafe(2, combo)) continue;

              // 🛑 TRAVA ANTI-CANIBALISMO NO LIXO (Sujeira Desesperada)
              const getRealSuit = (cards) => {
                const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
                return real ? real.suit : null;
              };
              const suit = getRealSuit(combo);
              const hasMeldSameSuit = suit && team.melds && team.melds.some((m) => getRealSuit(m) === suit);

              if (hasMeldSameSuit && (ctx.isVip || !ctx.isDesperate)) {
                if (!ctx.isPanicDump) continue;
              }

              return { wants: true, action: 'new', handIndexes: [i, j] };
            }
          }
        }
      }
    }

    // FASE 3: Lixo Aberto (Comprar sem formar jogo imediato na mesa)
    // Devolvemos o interesse deles por lixo solto, mantendo a agressividade natural.
    if (state.variant === 'fechado') return false;
    if (state.stock.length === 0) return false; // 🛑 BLOQUEIO DO LOOP INFINITO: Impede o bot de ficar pescando lixo inútil e travando o fim do jogo
    if (!checkSafe(0, null)) return false;

    const hasWildInPile = state.discard.some((c) => c.joker || c.rank === '2');

    if (hasWildInPile && pileSize <= 8) return { wants: true, action: 'open' };
    if (pileSize > 5 && !ctx.isRushingMorto) return false;
    if (ctx.isRushingMorto && pileSize >= 3) return { wants: true, action: 'open' };
    if (pileSize >= 4) return { wants: true, action: 'open' };

    return false;
  }

  // 🛡️ NOVO CÉREBRO: O bot agora sabe quando a própria jogada vai liberar a batida
  static canMeldSafely(me, team, cardsToUse, engine, pendingMeld = null, ctx = null) {
    const cardsLeft = me.hand.length - cardsToUse;

    if (cardsLeft > 1) return true;

    // 🚨 PANIC DUMP: Se a partida vai acabar a qualquer segundo, ignora restrições e desova tudo.
    if (ctx && ctx.isPanicDump) return true;

    // 🛑 TRAVA DE FARMING: Se o bot quer humilhar, ele recusa fazer jogadas que deixem ele com 1 carta (força descarte final) ou 0 cartas (batida direta).
    if (ctx && ctx.isFarming && cardsLeft <= 1) return false;

    if (engine.canTeamTakeDeadNow(team.id)) return true;
    if (engine.teamHasGoodCanastra(team.id)) return true;

    // Se ele for zerar a mão, mas o jogo que ele está montando FORMAR a canastra, a jogada é legalizada!
    if (pendingMeld && pendingMeld.length >= 7) {
      const realSuit = this.getRealSuit(pendingMeld);
      const hasWild = pendingMeld.some((c) => c.joker || (c.rank === '2' && c.suit !== realSuit) || c.forceWild);
      if (!hasWild) return true; // É limpa/real/ás, pode bater!
    }

    // Risco de Batida do Parceiro
    const s = engine.getState();
    if (s) {
      const myTookMorto = (s.deadChunksTaken[team.id] || 0) > 0;
      if (myTookMorto && engine.teamHasGoodCanastra(team.id)) {
        const partnerAboutToWin = s.players.filter((p) => p.teamId === team.id && p.id !== me.id).some((p) => p.hand.length <= 2);
        if (partnerAboutToWin) return true;
      }
    }

    return false;
  }

  static async processMelds(botIndex, ctx, engine, signal) {
    let madeMove = true;
    let loops = 0;

    while (madeMove && loops < 25) {
      this.assertActive(engine, signal);
      madeMove = false;
      loops++;

      const s = engine.getState();
      if (!s || !s.players || !s.players[botIndex] || !s.teams) {
        console.error('[BOT] Estado inválido em processMelds:', s);
        return;
      }

      const me = s.players[botIndex];
      const team = s.teams[me.teamId];
      if (!team) {
        console.error('[BOT] Team inválido em processMelds:', { s, me, botIndex });
        return;
      }

      // 🧠 MODO SNIPER (Ganância Segura): VIPs jogam para humilhar, mas só APÓS garantir uma canastra limpa.
      // A trava VIP agora vem do contexto global para operar de forma unificada
      const isVipSniper = ctx.isVipSniper;

      const naturePriorities = engine.getNaturePriorities?.(me.id);
      if (naturePriorities && (naturePriorities.markedCardIds.length || naturePriorities.meldIndexes.length)) {
        const markedCards = new Set(naturePriorities.markedCardIds);
        const markedMelds = new Set(naturePriorities.meldIndexes);
        const cardIndexes = me.hand.map((card, index) => ({ card, index })).sort((a, b) => Number(markedCards.has(b.card?.id)) - Number(markedCards.has(a.card?.id)));
        const meldIndexes = (team.melds || []).map((meld, index) => ({ meld, index })).sort((a, b) => Number(markedMelds.has(b.index)) - Number(markedMelds.has(a.index)));

        for (const { meld, index: meldIndex } of meldIndexes) {
          if (engine.isMeldLocked?.(team.id, meldIndex)) continue;
          for (const { card, index: handIndex } of cardIndexes) {
            if (!card || (!markedCards.has(card.id) && !markedMelds.has(meldIndex))) continue;
            const testMeld = this.simulateMeld(meld, [card], engine);
            if (!engine.isValidSequenceMeld(testMeld) || !this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;
            this.assertActive(engine, signal);
            const moved = await engine.executeMeldExtend(botIndex, meldIndex, [handIndex]);
            if (moved !== false) {
              madeMove = true;
              await this.sleep(300, engine, signal);
              break;
            }
          }
          if (madeMove) break;
        }
        if (madeMove) continue;

        if (markedCards.size && engine.canCreateMeld?.(me.id) !== false && me.hand.length >= 3) {
          const markedIndex = me.hand.findIndex((card) => markedCards.has(card?.id));
          if (markedIndex >= 0) {
            outerNatureCombo: for (let first = 0; first < me.hand.length - 1; first += 1) {
              if (first === markedIndex) continue;
              for (let second = first + 1; second < me.hand.length; second += 1) {
                if (second === markedIndex) continue;
                const indexes = [markedIndex, first, second];
                const combo = indexes.map((index) => me.hand[index]);
                if (!engine.isValidSequenceMeld(combo) || !this.canMeldSafely(me, team, 3, engine, combo, ctx)) continue;
                this.assertActive(engine, signal);
                const moved = await engine.executeMeldNew(botIndex, indexes);
                if (moved !== false) {
                  madeMove = true;
                  await this.sleep(400, engine, signal);
                  break outerNatureCombo;
                }
              }
            }
          }
        }
        if (madeMove) continue;
      }

      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.joker || c.rank === '2') continue;

            // CORREÇÃO 1: Usa o simulador para ignorar a armadura do 2
            const testMeld = this.simulateMeld(team.melds[mIdx], [c], engine);

            if (!this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;

            // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
            const wasDirty = this.isMeldDirty(team.melds[mIdx]);
            const isNowDirty = this.isMeldDirty(testMeld);
            if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

            if (engine.isValidSequenceMeld(testMeld)) {
              this.assertActive(engine, signal);
              const moved = await engine.executeMeldExtend(botIndex, mIdx, [i]);
              madeMove = moved !== false;
              await this.sleep(300, engine, signal);
              break;
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          const meld = team.melds[mIdx];
          if (this.isMeldDirty(meld)) continue;

          const realSuit = this.getRealSuit(meld);
          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.rank === '2' && c.suit === realSuit) {
              // CORREÇÃO 2: Usa o simulador para o Coringa Perfeito
              const testMeld = this.simulateMeld(meld, [c], engine);

              if (!this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;

              const wasDirty = this.isMeldDirty(meld);
              let isNowDirty = this.isMeldDirty(testMeld);

              // 🧠 A MÁGICA DO 2 NATURAL: Prova que o 2 encaixou perfeito e não sujou a canastra!
              const hasThree = meld.some((x) => x.rank === '3');
              const hasTwo = meld.some((x) => x.rank === '2');
              if (!wasDirty && hasThree && !hasTwo) {
                isNowDirty = false;
              }

              // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
              if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

              if (engine.isValidSequenceMeld(testMeld)) {
                this.assertActive(engine, signal);
                const moved = await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = moved !== false;
                await this.sleep(300, engine, signal);
                break;
              }
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      let n = me.hand.length;
      if (n >= 3) {
        for (let i = 0; i < n - 2; i++) {
          for (let j = i + 1; j < n - 1; j++) {
            for (let k = j + 1; k < n; k++) {
              const combo = [me.hand[i], me.hand[j], me.hand[k]];
              if (!this.canMeldSafely(me, team, 3, engine, combo, ctx)) continue;

              // Validação blindada: Permite sequência pura OU o "Falso Sujo" (2 do mesmo naipe)
              let isValidCombo = this.isComboPerfectlyClean3(combo, engine);
              if (!isValidCombo) {
                const wilds = combo.filter((c) => c.joker || c.rank === '2');
                const realCards = combo.filter((c) => !c.joker && c.rank !== '2');
                if (wilds.length === 1 && !wilds[0].joker && wilds[0].rank === '2' && realCards.length > 0) {
                  if (wilds[0].suit === realCards[0].suit) isValidCombo = true;
                }
              }

              if (!isValidCombo) continue;

              // 🛑 TRAVA UNIVERSAL ANTI-CANIBALISMO (Impede separar jogos do mesmo naipe)
              // CORREÇÃO: Ignora o '2' na hora de identificar o naipe, pois um 2 coringa mascara a mesa.
              const getRealSuit = (cards) => {
                const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
                return real ? real.suit : null;
              };

              const suit = getRealSuit(combo);
              if (suit) {
                const hasMeldSameSuit = team.melds.some((m) => getRealSuit(m) === suit);

                // VIPs (Dominadores) NUNCA dividem o mesmo naipe.
                // Bots normais só podem dividir no desespero absoluto (ex: última carta para bater).
                if (hasMeldSameSuit && (ctx.isVip || !ctx.isDesperate)) {
                  // Se entrou em pânico (8 cartas finais sem morto), a honra VIP é suspensa e ele joga as cartas para fugir da multa
                  if (!ctx.isPanicDump) continue;
                }
              }

              if (engine.isValidSequenceMeld(combo)) {
                this.assertActive(engine, signal);
                const moved = await engine.executeMeldNew(botIndex, [i, j, k]);
                madeMove = moved !== false;
                await this.sleep(400, engine, signal);
                break;
              }
            }
            if (madeMove) break;
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      // O Endgame padrão disparava no 22. O VIP agora tem frieza para segurar a mão até as últimas 10 cartas.
      const isEndgame = ctx.isVipSniper ? s.stock.length <= 10 : s.stock.length <= 22 || (ctx.tookMorto && me.hand.length <= 6);

      // 🧠 LÓGICA DE PACIÊNCIA (TEAMPLAY) E MODO SNIPER
      let allowDirty = ctx.isRushingMorto || ctx.isDesperate || isEndgame;
      if (ctx.isDuo && !ctx.isDesperate && s.stock.length > 16) {
        allowDirty = false;
      }

      // 🛑 TRAVA DO SNIPER ABSOLUTA: O VIP é blindado de jogar coringas na mesa antes do verdadeiro endgame
      if (isVipSniper) {
        allowDirty = false;
      }

      if (allowDirty) {
        if (team.melds && team.melds.length > 0) {
          for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
            if (engine.isMeldLocked?.(team.id, mIdx)) continue;
            const meld = team.melds[mIdx];
            if (this.isMeldDirty(meld)) continue;

            const isCanastra = meld.length >= 7;
            const hasTwo = meld.some((c) => c.rank === '2');
            const hasThree = meld.some((c) => c.rank === '3');
            const isLimpa = !this.isMeldDirty(meld);

            if (isLimpa) {
              if (isCanastra) continue;

              if (ctx.isDuo && !ctx.isDesperate && s.stock.length > 10) continue;

              if (!ctx.isDuo && meld.length >= 5 && !ctx.isDesperate) continue;
            }

            const realSuit = this.getRealSuit(meld);
            if (meld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== realSuit) || (c.rank === '2' && !hasThree))) continue;
            if (isCanastra && isLimpa) continue;

            for (let i = 0; i < me.hand.length; i++) {
              const c = me.hand[i];
              if (!c.joker && c.rank !== '2') continue;

              // 🛑 TRAVA DE PRESERVAÇÃO DO 2 (Anti-Cross-Suit)
              // Impede que o bot queime um 2 natural em outro naipe, preservando o caminho para o Ás-a-Ás.
              if (!c.joker && c.rank === '2' && c.suit !== realSuit) {
                if (ctx.isVip && !ctx.isPanicDump) continue; // Dominador NUNCA suja cruzado antes do pânico fatal
                if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto && me.hand.length > 2) continue; // Bot normal segura
              }

              // CORREÇÃO 3: Usa o simulador para sujeira no endgame
              const testMeld = this.simulateMeld(meld, [c], engine);

              if (!this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;

              const wasDirty = this.isMeldDirty(meld);
              let isNowDirty = this.isMeldDirty(testMeld);

              // Proteção idêntica do 2 natural para não travar a extensão suja no endgame
              const hasThreeDirty = meld.some((x) => x.rank === '3');
              const hasTwoDirty = meld.some((x) => x.rank === '2');
              if (!wasDirty && c.rank === '2' && c.suit === realSuit && hasThreeDirty && !hasTwoDirty) {
                isNowDirty = false;
              }

              // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
              if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

              if (engine.isValidSequenceMeld(testMeld)) {
                this.assertActive(engine, signal);
                const moved = await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = moved !== false;
                await this.sleep(400, engine, signal);
                break;
              }
            }
            if (madeMove) break;
          }
        }
        if (madeMove) continue;

        // 🚨 NOVO: Se o bot estiver no Panic Dump, ele ignora o limite de 6 cartas e tenta sujar tudo que der na mesa para fugir da multa!
        if (me.hand.length >= 3 && (me.hand.length <= 6 || ctx.isPanicDump)) {
          n = me.hand.length;
          for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
              for (let k = j + 1; k < n; k++) {
                const combo = [me.hand[i], me.hand[j], me.hand[k]];
                if (!this.canMeldSafely(me, team, 3, engine, combo)) continue;

                const wilds = combo.filter((c) => c.joker || c.rank === '2').length;

                // Permite 1 coringa normal, ou 2 "wilds" (para o caso de 2, 2, 4 onde um 2 é natural)
                if (wilds === 0 || wilds > 2) continue;

                // 🛑 TRAVA DE PRESERVAÇÃO DO 2 (Nova Sujeira)
                const wildCard = combo.find((c) => c.joker || c.rank === '2');
                const realCard = combo.find((c) => !c.joker && c.rank !== '2');
                if (wildCard && !wildCard.joker && wildCard.rank === '2' && realCard && wildCard.suit !== realCard.suit) {
                  if (ctx.isVip && !ctx.isPanicDump) continue;
                  if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto && me.hand.length > 2) continue;
                }

                if (engine.isValidSequenceMeld(combo)) {
                  this.assertActive(engine, signal);
                  const moved = await engine.executeMeldNew(botIndex, [i, j, k]);
                  madeMove = moved !== false;
                  await this.sleep(400, engine, signal);
                  break;
                }
              }
              if (madeMove) break;
            }
            if (madeMove) break;
          }
        }
      }
    }
  }

  static async processDiscard(botIndex, oppTeamId, engine, signal) {
    this.assertActive(engine, signal);
    const state = engine.getState();
    if (!state || !state.players || !state.players[botIndex] || !state.teams) {
      if (typeof window !== 'undefined' && window.isClosingGame) return;
      console.error('[BOT] Estado inválido em processDiscard:', state);
      return;
    }

    const me = state.players[botIndex];
    const oppTeam = state.teams[oppTeamId];
    if (!oppTeam) {
      console.error('[BOT] Time oponente inválido em processDiscard:', { state, oppTeamId });
      return;
    }

    if (me.hand.length === 0) return;

    let discardIndex = -1;
    let minDanger = 9999;

    for (let i = 0; i < me.hand.length; i++) {
      const c = me.hand[i];
      // Ignora cartas fantasmas (null)
      if (!c || state.pickedDiscardCardId === c.id) continue;

      let danger = 0;
      // Nunca joga coringa fora a não ser que seja a última opção da vida
      if (c.joker || c.rank === '2') {
        danger += 1000;
      } else {
        if (oppTeam.melds) {
          for (let oppMeld of oppTeam.melds) {
            if (!oppMeld) continue; // Trava para melds nulos
            if (engine.isValidSequenceMeld([...oppMeld, c])) {
              danger += 500; // Carta levanta jogo do inimigo!
              break;
            }
          }
        }

        // Evita jogar fora carta que entra no PRÓPRIO jogo (Blindagem extra)
        const myTeam = state.teams[me.teamId];
        if (myTeam && myTeam.melds) {
          for (let myMeld of myTeam.melds) {
            if (!myMeld) continue;
            if (engine.isValidSequenceMeld([...myMeld, c])) {
              danger += 200;
              break;
            }
          }

          // 🛡️ INSTINTO DE ÁS-A-ÁS: Bot segura o Ás se o time tiver um jogo do mesmo naipe crescendo
          if (c.rank === 'A') {
            for (let myMeld of myTeam.melds) {
              if (!myMeld) continue;
              const realCards = myMeld.filter((x) => x && !x.joker && x.rank !== '2' && x.rank !== 2);
              if (realCards.length > 0 && realCards[0].suit === c.suit) {
                danger += 150; // Dá peso para o Ás ficar na mão esperando a canastra chegar nele
                break;
              }
            }
          }
        }
      }

      if (danger < minDanger) {
        minDanger = danger;
        discardIndex = i;
      }
    }

    // Fallback de segurança se tudo der errado
    if (discardIndex === -1 || (state.pickedDiscardCardId && state.pickedDiscardCardId === me.hand[discardIndex]?.id)) {
      discardIndex = me.hand.findIndex((c) => c && c.id !== state.pickedDiscardCardId);

      // Se não achou, pega a primeira carta real disponível na mão
      if (discardIndex === -1) {
        discardIndex = me.hand.findIndex((c) => c !== null && c !== undefined);
      }

      // Prevenção extrema: se a mão inteira for fantasma, aborta para não crashar o motor
      if (discardIndex === -1) return;
    }

    this.assertActive(engine, signal);
    await engine.executeDiscard(botIndex, discardIndex);
  }

  static async sleep(ms, engine, signal) {
    this.assertActive(engine, signal);

    await new Promise((resolve, reject) => {
      let timer = null;
      const abort = () => {
        clearTimeout(timer);
        const error = new Error('Turno do bot cancelado durante a espera.');
        error.name = 'AbortError';
        error.code = 'BOT_TURN_CANCELLED';
        reject(error);
      };
      timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, ms);
      signal?.addEventListener('abort', abort, { once: true });
    });

    this.assertActive(engine, signal);
    let s = engine.getState();
      // Segura a execução do bot em loop enquanto o jogo estiver congelado no DevTools
    while (s && s.debugPaused && !s.finished) {
      await this.sleep(500, engine, signal);
      s = engine.getState();
    }
  }
}
