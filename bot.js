// bot.js

export class BuracoBot {
  static _turnLocks = new Set();

  static async playTurn(stateIgnored, botIndex, engine) {
    this.currentEngine = engine; // Salva o motor para o sleep interceptar o pause
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

      const myScore = engine.computeTeamMeldScore(team).total;
      const oppScore = engine.computeTeamMeldScore(oppTeam).total;
      const stockCount = state.stock.length;
      const tookMorto = (state.deadChunksTaken[team.id] || 0) > 0;
      const oppTookMorto = (state.deadChunksTaken[oppTeam.id] || 0) > 0;

      const isDesperate = oppScore > myScore + 1000 || (oppTookMorto && !tookMorto && stockCount < 25);
      const isRushingMorto = !tookMorto && me.hand.length <= 5;
      // O cérebro agora entende que o Trio também exige estratégia de equipe
      const isDuo = state.mode === '2x2' || ((state.mode === '1x2' || state.mode === '1x3') && team.playerIndexes.length > 1);
      const ctx = { isDesperate, isRushingMorto, isDuo, tookMorto };

      engine.showMessage(`🤖 ${me.name} analisando a mesa...`);
      await this.sleep(Math.floor(Math.random() * 4000) + 1500);

      try {
        let boughtFromDiscard = false;
        if (state.discard.length > 0) {
          const intent = this.evaluateDiscard(state, me.hand, team, engine, ctx);
          if (intent && intent.wants) {
            engine.showMessage(`🤖 ${me.name} puxou o Lixo!`);

            const drawOk = state.variant === 'fechado' ? await engine.executeDrawDiscardFechado(botIndex, intent) : await engine.executeDrawDiscard(botIndex);
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
          await engine.executeDrawStock(botIndex);
        }

        await this.sleep(1000);

        state = engine.getState();
        if (!state || !state.players || !state.players[botIndex]) {
          if (typeof window !== 'undefined' && window.isClosingGame) return;
          console.error('[BOT] Estado inválido antes de organizar as cartas:', state);
          return;
        }

        me = state.players[botIndex];
        engine.showMessage(`🤖 ${me.name} organizando as cartas...`);

        await this.processMelds(botIndex, ctx, engine);
        await this.sleep(1000);
      } catch (error) {
        console.error('Erro interno:', error);
        let s = engine.getState();
        const botName = s && s.players && s.players[botIndex] ? s.players[botIndex].name : 'BOT';
        engine.showMessage(`🤖 ${botName} deu curto-circuito!`);
      }

      try {
        let s = engine.getState();
        const botName = s && s.players && s.players[botIndex] ? s.players[botIndex].name : 'BOT';

        engine.showMessage(`🤖 ${botName} descartando...`);
        await this.sleep(1200);
        await this.processDiscard(botIndex, me.teamId === 0 ? 1 : 0, engine);
      } catch (error) {
        console.error('Erro fatal:', error);

        const s = engine.getState();
        if (s && s.players && s.players[botIndex]) {
          await engine.executeDiscard(botIndex, 0);
        }
      }
    } finally {
      this._turnLocks.delete(turnKey);
    }
  }

  // 🧠 SIMULADOR FANTASMA DA IA: Arranca a armadura do 2 para o bot ver as possibilidades reais
  static simulateMeld(baseMeld, newCards) {
    const combined = [...baseMeld, ...newCards].map((c) => (c ? { ...c } : null));
    combined.forEach((c) => {
      if (c && !c.joker && (c.rank === '2' || c.rank === 2)) {
        c.forceNatural = false;
        c.forceWild = false;
      }
    });
    return combined;
  }

  static isMeldDirty(meld) {
    if (!meld || meld.length === 0) return false;
    return meld.some((c) => c.joker || c.forceWild || ((c.rank === '2' || c.rank === 2) && !c.forceNatural));
  }

  static evaluateDiscard(state, hand, team, engine, ctx) {
    const pileSize = state.discard.length;
    if (pileSize === 0) return false;

    const topCard = state.discard[pileSize - 1];
    const isJuicyPile = pileSize >= 8;
    const isEndgame = state.stock.length <= 22 || (ctx.tookMorto && hand.length <= 6);
    const allowDirty = isJuicyPile || ctx.isRushingMorto || ctx.isDesperate || isEndgame;

    const topIsWildOrTwo = topCard.joker || topCard.rank === '2';

    // 🛡️ MOTOR DE PREVISÃO DE SUICÍDIO (Agora suporta fechamento de canastra simultâneo)
    const checkSafe = (cardsUsedFromHand, pendingMeld) => {
      const cardsAdded = state.variant === 'fechado' ? pileSize - 1 : pileSize;
      const predictedHandSize = hand.length - cardsUsedFromHand + cardsAdded;

      if (predictedHandSize > 1) return true;
      if (engine.canTeamTakeDeadNow(team.id)) return true;
      if (engine.teamHasGoodCanastra(team.id)) return true;

      // Inteligência Nova: Se a jogada em si FORMAR a canastra limpa, o bot tem permissão para zerar a mão!
      if (pendingMeld && pendingMeld.length >= 7) {
        const hasWild = pendingMeld.some((c) => c.joker || (c.rank === '2' && c.suit !== pendingMeld[0].suit) || c.forceWild);
        if (!hasWild) return true;
      }
      return false;
    };

    if (team.melds && team.melds.length > 0) {
      for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
        const meld = team.melds[mIdx];
        if (topIsWildOrTwo && meld.some((c) => c.joker || c.rank === '2')) continue;

        const testMeld = this.simulateMeld(meld, [topCard]);
        if (engine.isValidSequenceMeld(testMeld)) {
          const hasTwo = meld.some((c) => c.rank === '2');
          const needsWild = testMeld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== testMeld[0].suit));
          const isPerfectTwo = topCard.rank === '2' && topCard.suit === meld[0].suit && !hasTwo;

          if (!needsWild || isPerfectTwo) {
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
          const hasWild = combo.some((c) => c.joker || c.rank === '2');

          if (!hasWild && engine.isValidSequenceMeld(combo)) {
            if (!checkSafe(2, combo)) continue;
            return { wants: true, action: 'new', handIndexes: [i, j] };
          }
        }
      }
    }

    if (allowDirty) {
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];
          if (topIsWildOrTwo && meld.some((c) => c.joker || c.rank === '2')) continue;

          const testMeld = [...meld, topCard];
          if (engine.isValidSequenceMeld(testMeld)) {
            const isCanastra = meld.length >= 7;
            const hasTwo = meld.some((c) => c.rank === '2');
            const hasThree = meld.some((c) => c.rank === '3');
            const isLimpa = !meld.some((c) => c.joker || (c.rank === '2' && c.suit !== meld[0].suit) || (c.rank === '2' && !hasThree));

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
              if (!checkSafe(2, combo)) continue;
              return { wants: true, action: 'new', handIndexes: [i, j] };
            }
          }
        }
      }
    }

    if (state.variant === 'fechado') return false;
    if (!checkSafe(0, null)) return false;

    const hasWildInPile = state.discard.some((c) => c.joker || c.rank === '2');
    if (hasWildInPile) return { wants: true, action: 'open' };

    // 🛡️ FILTRO DE LIXO: Ignora lixos gigantes se não for pra salvar a vida pegando morto
    if (pileSize > 5 && !ctx.isRushingMorto) return false;

    if (ctx.isRushingMorto && pileSize >= 3) return { wants: true, action: 'open' };
    if (pileSize >= 4 && !ctx.isDuo) return { wants: true, action: 'open' };
    if (pileSize >= 5 && ctx.isDuo) return { wants: true, action: 'open' };

    return false;
  }

  // 🛡️ NOVO CÉREBRO: O bot agora sabe quando a própria jogada vai liberar a batida
  static canMeldSafely(me, team, cardsToUse, engine, pendingMeld = null) {
    const cardsLeft = me.hand.length - cardsToUse;

    if (cardsLeft > 1) return true;
    if (engine.canTeamTakeDeadNow(team.id)) return true;
    if (engine.teamHasGoodCanastra(team.id)) return true;

    // Se ele for zerar a mão, mas o jogo que ele está montando FORMAR a canastra, a jogada é legalizada!
    if (pendingMeld && pendingMeld.length >= 7) {
      const hasWild = pendingMeld.some((c) => c.joker || (c.rank === '2' && c.suit !== pendingMeld[0].suit) || c.forceWild);
      if (!hasWild) return true; // É limpa/real/ás, pode bater!
    }

    return false;
  }

  static async processMelds(botIndex, ctx, engine) {
    let madeMove = true;
    let loops = 0;

    while (madeMove && loops < 25) {
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
      const isVip = ((s.mode === '1x1_dominacao' || s.mode === '1x1_duploMorto') && botIndex === 1) || ((s.mode === '1x2' || s.mode === '1x3') && me.teamId === 1);
      const isVipSniper = isVip && engine.teamHasGoodCanastra(team.id) && s.stock.length > 15 && !ctx.isDesperate;

      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.joker || c.rank === '2') continue;

            // CORREÇÃO 1: Usa o simulador para ignorar a armadura do 2
            const testMeld = this.simulateMeld(team.melds[mIdx], [c]);

            if (!this.canMeldSafely(me, team, 1, engine, testMeld)) continue;

            // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
            const wasDirty = this.isMeldDirty(team.melds[mIdx]);
            const isNowDirty = this.isMeldDirty(testMeld);
            if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

            if (engine.isValidSequenceMeld(testMeld)) {
              await engine.executeMeldExtend(botIndex, mIdx, [i]);
              madeMove = true;
              await this.sleep(300);
              break;
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];
          if (meld.some((c) => c.joker || c.rank === '2')) continue;

          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.rank === '2' && c.suit === meld[0].suit) {
              // CORREÇÃO 2: Usa o simulador para o Coringa Perfeito
              const testMeld = this.simulateMeld(meld, [c]);

              if (!this.canMeldSafely(me, team, 1, engine, testMeld)) continue;

              // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
              const wasDirty = this.isMeldDirty(meld);
              const isNowDirty = this.isMeldDirty(testMeld);
              if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

              if (engine.isValidSequenceMeld(testMeld)) {
                await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = true;
                await this.sleep(300);
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
              if (!this.canMeldSafely(me, team, 3, engine, combo)) continue;

              if (combo.some((c) => c.joker || c.rank === '2')) continue;

              // 🛑 TRAVA DO SNIPER (Anti-Canibalismo): Se for VIP, não cria jogo novo do mesmo naipe de uma canastra limpa/real que já existe. Segura pra colar nela!
              if (isVipSniper) {
                const suit = combo[0].suit;
                const hasLimpaOfSameSuit = team.melds.some((m) => m.length >= 7 && m[0].suit === suit && !m.some((c) => c.joker || (c.rank === '2' && c.suit !== suit) || c.forceWild));
                if (hasLimpaOfSameSuit) continue;
              }

              if (engine.isValidSequenceMeld(combo)) {
                await engine.executeMeldNew(botIndex, [i, j, k]);
                madeMove = true;
                await this.sleep(400);
                break;
              }
            }
            if (madeMove) break;
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      const isEndgame = s.stock.length <= 22 || (ctx.tookMorto && me.hand.length <= 6);

      // 🧠 LÓGICA DE PACIÊNCIA (TEAMPLAY) E MODO SNIPER
      let allowDirty = ctx.isRushingMorto || ctx.isDesperate || isEndgame;
      if (ctx.isDuo && !ctx.isDesperate && s.stock.length > 16) {
        allowDirty = false;
      }

      // 🛑 TRAVA DO SNIPER: Cancela completamente a sujeira para focar na Ás-a-Ás.
      if (isVipSniper) {
        allowDirty = false;
      }

      if (allowDirty) {
        if (team.melds && team.melds.length > 0) {
          for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
            const meld = team.melds[mIdx];
            if (meld.some((c) => c.joker || c.rank === '2')) continue;

            const isCanastra = meld.length >= 7;
            const hasTwo = meld.some((c) => c.rank === '2');
            const hasThree = meld.some((c) => c.rank === '3');
            const isLimpa = !meld.some((c) => c.joker || (c.rank === '2' && c.suit !== meld[0].suit) || (c.rank === '2' && !hasThree));

            if (isLimpa) {
              if (isCanastra) continue;

              if (ctx.isDuo && !ctx.isDesperate && s.stock.length > 10) continue;

              if (!ctx.isDuo && meld.length >= 5 && !ctx.isDesperate) continue;
            }

            if (meld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== meld[0].suit) || (c.rank === '2' && !hasThree))) continue;
            if (isCanastra && isLimpa) continue;

            for (let i = 0; i < me.hand.length; i++) {
              const c = me.hand[i];
              if (!c.joker && c.rank !== '2') continue;

              // CORREÇÃO 3: Usa o simulador para sujeira no endgame
              const testMeld = this.simulateMeld(meld, [c]);

              if (!this.canMeldSafely(me, team, 1, engine, testMeld)) continue;

              // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
              const wasDirty = this.isMeldDirty(meld);
              const isNowDirty = this.isMeldDirty(testMeld);
              if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

              if (engine.isValidSequenceMeld(testMeld)) {
                await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = true;
                await this.sleep(400);
                break;
              }
            }
            if (madeMove) break;
          }
        }
        if (madeMove) continue;

        if (me.hand.length >= 3 && me.hand.length <= 6) {
          n = me.hand.length;
          for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
              for (let k = j + 1; k < n; k++) {
                const combo = [me.hand[i], me.hand[j], me.hand[k]];
                if (!this.canMeldSafely(me, team, 3, engine, combo)) continue;

                const wilds = combo.filter((c) => c.joker || c.rank === '2').length;
                if (wilds !== 1) continue;

                if (engine.isValidSequenceMeld(combo)) {
                  await engine.executeMeldNew(botIndex, [i, j, k]);
                  madeMove = true;
                  await this.sleep(400);
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

  static async processDiscard(botIndex, oppTeamId, engine) {
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
      if (state.pickedDiscardCardId === c.id) continue;

      let danger = 0;
      // Nunca joga coringa fora a não ser que seja a última opção da vida
      if (c.joker || c.rank === '2') {
        danger += 1000;
      } else {
        if (oppTeam.melds) {
          for (let oppMeld of oppTeam.melds) {
            if (engine.isValidSequenceMeld([...oppMeld, c])) {
              danger += 500; // Carta levanta jogo do inimigo!
              break;
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
    if (discardIndex === -1 || (state.pickedDiscardCardId && state.pickedDiscardCardId === me.hand[discardIndex].id)) {
      discardIndex = me.hand.findIndex((c) => c.id !== state.pickedDiscardCardId);
      if (discardIndex === -1) discardIndex = 0;
    }

    await engine.executeDiscard(botIndex, discardIndex);
  }

  static async sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    const engine = this.currentEngine;
    if (engine) {
      let s = engine.getState();
      // Segura a execução do bot em loop enquanto o jogo estiver congelado no DevTools
      while (s && s.debugPaused && !s.finished && !(typeof window !== 'undefined' && window.isClosingGame)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        s = engine.getState();
      }
    }
  }
}
