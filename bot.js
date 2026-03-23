// bot.js

export class BuracoBot {
  static async playTurn(stateIgnored, botIndex, engine) {
    let state = engine.getState();
    let me = state.players[botIndex];
    let team = state.teams[me.teamId];
    let oppTeam = state.teams[me.teamId === 0 ? 1 : 0];

    const myScore = engine.computeTeamMeldScore(team).total;
    const oppScore = engine.computeTeamMeldScore(oppTeam).total;
    const stockCount = state.stock.length;
    const tookMorto = (state.deadChunksTaken[team.id] || 0) > 0;
    const oppTookMorto = (state.deadChunksTaken[oppTeam.id] || 0) > 0;

    const isDesperate = oppScore > myScore + 1000 || (oppTookMorto && !tookMorto && stockCount < 25);
    const isRushingMorto = !tookMorto && me.hand.length <= 5;
    const isDuo = state.mode === '2x2' || (state.mode === '1x2' && team.playerIndexes.length === 2);
    const ctx = { isDesperate, isRushingMorto, isDuo, tookMorto };

    // PONTO 1 RESOLVIDO: Tira o "Bot" redundante, usa só o nome que você digitou
    engine.showMessage(`🤖 ${me.name} analisando a mesa...`);

    // PONTO 2 RESOLVIDO: Tempo randômico entre 2 e 8 segundos para simular pensamento
    await this.sleep(Math.floor(Math.random() * 6000) + 2000);

    try {
      let boughtFromDiscard = false;
      if (state.discard.length > 0) {
        const intent = this.evaluateDiscard(state, me.hand, team, engine, ctx);
        if (intent && intent.wants) {
          boughtFromDiscard = true;
          engine.showMessage(`🤖 ${me.name} puxou o Lixo!`);

          if (state.variant === 'fechado') {
            await engine.executeDrawDiscardFechado(botIndex, intent);
          } else {
            await engine.executeDrawDiscard(botIndex);
          }
        }
      }

      state = engine.getState();

      if (!boughtFromDiscard || state.partialDraw) {
        await engine.executeDrawStock(botIndex);
      }

      await this.sleep(1500);

      state = engine.getState();
      me = state.players[botIndex];
      engine.showMessage(`🤖 ${me.name} organizando as cartas...`);

      await this.processMelds(botIndex, ctx, engine);
      await this.sleep(1000);
    } catch (error) {
      console.error('Erro interno:', error);
      let s = engine.getState();
      engine.showMessage(`🤖 ${s.players[botIndex].name} deu curto-circuito!`);
    }

    try {
      let s = engine.getState();
      engine.showMessage(`🤖 ${s.players[botIndex].name} descartando...`);
      await this.sleep(1500);
      await this.processDiscard(botIndex, me.teamId === 0 ? 1 : 0, engine);
    } catch (error) {
      console.error('Erro fatal:', error);
      await engine.executeDiscard(botIndex, 0);
    }
  }

  static evaluateDiscard(state, hand, team, engine, ctx) {
    const pileSize = state.discard.length;
    if (pileSize === 0) return false;

    const topCard = state.discard[pileSize - 1];
    const isJuicyPile = pileSize >= 8;
    const isEndgame = state.stock.length <= 22 || (ctx.tookMorto && hand.length <= 6);
    const allowDirty = isJuicyPile || ctx.isRushingMorto || ctx.isDesperate || isEndgame;

    const topIsWildOrTwo = topCard.joker || topCard.rank === '2';

    // 🛡️ MOTOR DE PREVISÃO DE SUICÍDIO: Garante que o bot não zere a mão acidentalmente ao usar o lixo
    const checkSafe = (cardsUsedFromHand) => {
      // Calcula quantas cartas vão sobrar na mão do bot caso ele faça a jogada
      const cardsAdded = state.variant === 'fechado' ? pileSize - 1 : pileSize;
      const predictedHandSize = hand.length - cardsUsedFromHand + cardsAdded;

      if (predictedHandSize > 1) return true;
      if (engine.canTeamTakeDeadNow(team.id)) return true;
      if (engine.teamHasGoodCanastra(team.id)) return true;
      return false; // Trava o bot!
    };

    // =========================================================
    // FASE 1: PRIORIDADE ABSOLUTA - PEGAR LIMPO
    // =========================================================
    if (team.melds && team.melds.length > 0) {
      for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
        const meld = team.melds[mIdx];
        if (topIsWildOrTwo && meld.some((c) => c.joker || c.rank === '2')) continue;

        const testMeld = [...meld, topCard];
        if (engine.isValidSequenceMeld(testMeld)) {
          const hasTwo = meld.some((c) => c.rank === '2');
          const needsWild = testMeld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== testMeld[0].suit));
          const isPerfectTwo = topCard.rank === '2' && topCard.suit === meld[0].suit && !hasTwo;

          if (!needsWild || isPerfectTwo) {
            if (!checkSafe(0)) continue; // 🔒 TRAVA DE SEGURANÇA APLICADA
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
            if (!checkSafe(2)) continue; // 🔒 TRAVA DE SEGURANÇA APLICADA
            return { wants: true, action: 'new', handIndexes: [i, j] };
          }
        }
      }
    }

    // =========================================================
    // FASE 2: PAGANDO O PREÇO (Sujando por necessidade)
    // =========================================================
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

            if (!checkSafe(0)) continue; // 🔒 TRAVA DE SEGURANÇA APLICADA
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
              if (!checkSafe(2)) continue; // 🔒 TRAVA DE SEGURANÇA APLICADA
              return { wants: true, action: 'new', handIndexes: [i, j] };
            }
          }
        }
      }
    }

    // =========================================================
    // FASE 3: BURACO ABERTO
    // =========================================================
    if (state.variant === 'fechado') return false;

    if (!checkSafe(0)) return false; // 🔒 TRAVA NO ABERTO TAMBÉM

    const hasWildInPile = state.discard.some((c) => c.joker || c.rank === '2');
    if (hasWildInPile) return { wants: true, action: 'open' };
    if (ctx.isRushingMorto && pileSize >= 3) return { wants: true, action: 'open' };
    if (pileSize >= 4 && !ctx.isDuo) return { wants: true, action: 'open' };
    if (pileSize >= 5 && ctx.isDuo) return { wants: true, action: 'open' };

    return false;
  }

  static canMeldSafely(me, team, cardsToUse, engine) {
    const cardsLeft = me.hand.length - cardsToUse;

    // Se após a jogada sobrar 2 ou mais cartas na mão, ele está seguro pra jogar e descartar depois.
    if (cardsLeft > 1) return true;

    // A CORDA APERTOU: Vai sobrar 0 cartas (bater direto) ou 1 carta (ficar pro descarte).

    // Regra 1: Tem morto na mesa pra ele pegar? Se sim, a jogada suicida tá liberada porque ele ressuscita.
    if (engine.canTeamTakeDeadNow(team.id)) return true;

    // Regra 2: Não tem morto. Ele TEM que ter uma canastra válida (Limpa, Real ou Ás-a-Ás) pra poder bater.
    if (engine.teamHasGoodCanastra(team.id)) return true;

    // Se chegou aqui: Não tem morto, não tem canastra e ele ia se matar ficando com 0 ou 1 carta.
    // TRAVA O BOT! Ele é forçado a segurar as cartas na mão e passar a vez igual um humano.
    return false;
  }

  static async processMelds(botIndex, ctx, engine) {
    let madeMove = true;
    let loops = 0;

    while (madeMove && loops < 25) {
      madeMove = false;
      loops++;

      const s = engine.getState();
      const me = s.players[botIndex];
      const team = s.teams[me.teamId];

      // --- PASSO 1: EXTENSÃO 100% LIMPA ---
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          for (let i = 0; i < me.hand.length; i++) {
            if (!this.canMeldSafely(me, team, 1, engine)) continue;
            const c = me.hand[i];
            if (c.joker || c.rank === '2') continue;

            const testMeld = [...team.melds[mIdx], c];
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

      // --- PASSO 2: O CORINGA PERFEITO ---
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];

          // 🛡️ TRAVA DO DESPERDÍCIO: Se já tem Joker ou 2 na mesa, não baixa outro!
          if (meld.some((c) => c.joker || c.rank === '2')) continue;

          for (let i = 0; i < me.hand.length; i++) {
            if (!this.canMeldSafely(me, team, 1, engine)) continue;
            const c = me.hand[i];

            if (c.rank === '2' && c.suit === meld[0].suit) {
              const testMeld = [...meld, c];
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

      // --- PASSO 3: FORMAR NOVOS JOGOS LIMPOS ---
      let n = me.hand.length;
      if (n >= 3) {
        for (let i = 0; i < n - 2; i++) {
          for (let j = i + 1; j < n - 1; j++) {
            for (let k = j + 1; k < n; k++) {
              if (!this.canMeldSafely(me, team, 3, engine)) continue;
              const combo = [me.hand[i], me.hand[j], me.hand[k]];
              if (combo.some((c) => c.joker || c.rank === '2')) continue;

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

      // --- PASSO 4: USO DE CORINGA SUJO (Fim de Jogo) ---
      const isEndgame = s.stock.length <= 22 || (ctx.tookMorto && me.hand.length <= 6);

      if (ctx.isRushingMorto || ctx.isDesperate || isEndgame) {
        // 4.1 Tenta fechar/estender jogos já existentes com sujeira
        if (team.melds && team.melds.length > 0) {
          for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
            const meld = team.melds[mIdx];

            // 🛡️ TRAVA DO DESPERDÍCIO: Se já tem Joker ou 2 na mesa, procura outro jogo!
            if (meld.some((c) => c.joker || c.rank === '2')) continue;

            const isCanastra = meld.length >= 7;
            const hasTwo = meld.some((c) => c.rank === '2');
            const hasThree = meld.some((c) => c.rank === '3');
            const isLimpa = !meld.some((c) => c.joker || (c.rank === '2' && c.suit !== meld[0].suit) || (c.rank === '2' && !hasThree));

            // 🛡️ PROTEÇÃO DA CANASTRA E DA "QUASE LIMPA"
            if (isLimpa) {
              if (isCanastra) continue; // Cofre trancado: Já é limpa, sagrada.
              // Se o jogo limpo já tem 5 ou 6 cartas, está a 1 ou 2 cartas da glória. Não suja!
              if (meld.length >= 5 && !ctx.isDesperate) continue;
            }

            // Se o jogo já tem um coringa atuando, ignora.
            if (meld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== meld[0].suit) || (c.rank === '2' && !hasThree))) continue;

            if (isCanastra && isLimpa) {
              continue;
            }

            for (let i = 0; i < me.hand.length; i++) {
              if (!this.canMeldSafely(me, team, 1, engine)) continue;
              const c = me.hand[i];
              if (!c.joker && c.rank !== '2') continue;

              const testMeld = [...meld, c];
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

        // 4.2 Cria jogo novo sujo (último recurso)
        if (me.hand.length >= 3 && me.hand.length <= 6) {
          n = me.hand.length;
          for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
              for (let k = j + 1; k < n; k++) {
                if (!this.canMeldSafely(me, team, 3, engine)) continue;
                const combo = [me.hand[i], me.hand[j], me.hand[k]];
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
    const me = state.players[botIndex];
    const oppTeam = state.teams[oppTeamId];

    if (me.hand.length === 0) return;

    let discardIndex = 0;
    for (let i = 0; i < me.hand.length; i++) {
      const c = me.hand[i];
      if (state.pickedDiscardCardId === c.id) continue;

      if (!c.joker && c.rank !== '2') {
        let helpsOpponent = false;
        if (oppTeam.melds) {
          for (let oppMeld of oppTeam.melds) {
            if (engine.isValidSequenceMeld([...oppMeld, c])) {
              helpsOpponent = true;
              break;
            }
          }
        }
        if (!helpsOpponent) {
          discardIndex = i;
          break;
        }
      }
    }

    if (state.pickedDiscardCardId === me.hand[discardIndex].id) {
      discardIndex = me.hand.findIndex((c) => c.id !== state.pickedDiscardCardId);
      if (discardIndex === -1) discardIndex = 0;
    }

    await engine.executeDiscard(botIndex, discardIndex);
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
