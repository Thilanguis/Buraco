// bot.js

export class BuracoBot {
  static async playTurn(stateIgnored, botIndex, engine) {
    let state = engine.getState();
    let me = state.players[botIndex];
    let team = state.teams[me.teamId];
    let oppTeam = state.teams[me.teamId === 0 ? 1 : 0];

    // ==========================================
    // MÓDULO DE INTELIGÊNCIA DE CONTEXTO
    // ==========================================
    const myScore = engine.computeTeamMeldScore(team).total;
    const oppScore = engine.computeTeamMeldScore(oppTeam).total;
    const stockCount = state.stock.length;
    const tookMorto = (state.deadChunksTaken[team.id] || 0) > 0;
    const oppTookMorto = (state.deadChunksTaken[oppTeam.id] || 0) > 0;

    // 1. Desespero: Tomando surra de pontos ou o oponente pegou o morto e as cartas estão acabando
    const isDesperate = oppScore > myScore + 1000 || (oppTookMorto && !tookMorto && stockCount < 25);

    // 2. Rush Mode: Mão pequena e o morto ainda está na mesa
    const isRushingMorto = !tookMorto && me.hand.length <= 5;

    // 3. Estratégia de Dupla
    const isDuo = state.mode === '2x2' || (state.mode === '1x2' && team.playerIndexes.length === 2);

    const ctx = { isDesperate, isRushingMorto, isDuo, tookMorto };

    engine.showMessage(`🤖 Bot ${me.name} analisando a mesa...`);
    await this.sleep(1200);

    try {
      // ==========================================
      // FASE 1: DECISÃO DE COMPRA
      // ==========================================
      let boughtFromDiscard = false;
      if (state.discard.length > 0) {
        const wantsDiscard = this.evaluateDiscard(state, me.hand, team, engine, ctx);
        if (wantsDiscard) {
          boughtFromDiscard = true;
          engine.showMessage(`🤖 Bot ${me.name} puxou o Lixo!`);
          await engine.executeDrawDiscard(botIndex);
        }
      }

      state = engine.getState(); // Atualiza a mente após a compra!

      if (!boughtFromDiscard || state.partialDraw) {
        await engine.executeDrawStock(botIndex);
      }
      await this.sleep(800);

      // ==========================================
      // FASE 2: BAIXAR JOGOS (CÉREBRO TÁTICO)
      // ==========================================
      state = engine.getState();
      me = state.players[botIndex];
      engine.showMessage(`🤖 Bot ${me.name} organizando as cartas...`);

      await this.processMelds(botIndex, ctx, engine);
      await this.sleep(1000);
    } catch (error) {
      console.error('Erro interno do Bot (Curto-circuito):', error);
      let s = engine.getState();
      engine.showMessage(`🤖 Bot ${s.players[botIndex].name} deu curto-circuito!`);
    }

    // ==========================================
    // FASE 3: DESCARTE
    // ==========================================
    try {
      let s = engine.getState();
      engine.showMessage(`🤖 Bot ${s.players[botIndex].name} descartando...`);
      await this.processDiscard(botIndex, me.teamId === 0 ? 1 : 0, engine);
    } catch (error) {
      console.error('Erro fatal no descarte do Bot:', error);
      await engine.executeDiscard(botIndex, 0);
    }
  }

  static evaluateDiscard(state, hand, team, engine, ctx) {
    const topCard = state.discard[state.discard.length - 1];

    if (team.melds && team.melds.length > 0) {
      for (let meld of team.melds) {
        const testMeld = [...meld, topCard];
        if (engine.isValidSequenceMeld(testMeld)) {
          const needsWild = testMeld.some((c) => c.joker || c.rank === '2');
          // Só suja puxando do lixo se fechar canastra, se for o 2 do mesmo naipe, ou se estiver rushando pro morto
          if (!needsWild || meld.length >= 6 || ctx.isRushingMorto || (topCard.rank === '2' && topCard.suit === meld[0].suit)) return true;
        }
      }
    }

    if (hand.length >= 2) {
      for (let i = 0; i < hand.length - 1; i++) {
        for (let j = i + 1; j < hand.length; j++) {
          const combo = [hand[i], hand[j], topCard];
          const hasWild = combo.some((c) => c.joker || c.rank === '2');
          if (!hasWild && engine.isValidSequenceMeld(combo)) return true;
        }
      }
    }

    if (state.variant === 'fechado') return false;

    // Se tá rushando o morto, vira uma máquina de catar lixo se tiver coringa pra ajudar a desovar a mão
    if (ctx.isRushingMorto && (topCard.joker || topCard.rank === '2')) return true;

    // Em jogo solo, pega lixo gordo para ganhar volume de cartas
    if (state.variant === 'aberto' && state.discard.length >= 4 && !ctx.isDuo) return true;

    return false;
  }

  static canMeldSafely(me, team, cardsToMeldCount, engine) {
    const cardsLeft = me.hand.length - cardsToMeldCount;
    if (cardsLeft > 1) return true;
    if (engine.canTeamTakeDeadNow(team.id)) return true;
    if (engine.teamHasGoodCanastra(team.id)) return true;
    return false;
  }

  static async processMelds(botIndex, ctx, engine) {
    let madeMove = true;
    let loops = 0;

    // A lógica de prioridade define a qualidade do jogo do Bot.
    while (madeMove && loops < 30) {
      madeMove = false;
      loops++;

      const state = engine.getState();
      const me = state.players[botIndex];
      const team = state.teams[me.teamId];

      // --- PASSO 1: EXTENSÃO LIMPA (100% Segura e prioritária) ---
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          for (let i = 0; i < me.hand.length; i++) {
            if (!this.canMeldSafely(me, team, 1, engine)) continue;
            const c = me.hand[i];
            if (c.joker || c.rank === '2') continue; // Ignora coringas nesta fase

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

      // --- PASSO 2: FORMAR NOVOS JOGOS LIMPOS (Base da estrutura) ---
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

      // --- PASSO 3: O CORINGA PERFEITO (2 do MESMO naipe) ---
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];
          // Evita poluir um jogo que já tem coringa
          if (meld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== meld[0].suit))) continue;

          for (let i = 0; i < me.hand.length; i++) {
            if (!this.canMeldSafely(me, team, 1, engine)) continue;
            const c = me.hand[i];

            // Só libera o '2' aqui se o naipe bater com o jogo, garantindo que vai virar limpa no futuro
            if (c.rank === '2' && c.suit === meld[0].suit) {
              const testMeld = [...meld, c];
              if (engine.isValidSequenceMeld(testMeld)) {
                await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = true;
                await this.sleep(400);
                break;
              }
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      // --- PASSO 4: FORÇAR CANASTRA SUJA (Apenas se tiver 6 cartas na mesa) ---
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];
          if (meld.length < 6) continue; // Só faz isso para matar a canastra e pegar pontos
          if (meld.some((c) => c.joker || c.forceWild || (c.rank === '2' && c.suit !== meld[0].suit))) continue; // Ignora se já for suja

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

      // --- PASSO 5: RUSH PARA O MORTO / MODO DESESPERO (Libera sujeira total) ---
      if (ctx.isRushingMorto || ctx.isDesperate) {
        // Estende sujo os jogos da mesa para desovar a mão
        if (team.melds && team.melds.length > 0) {
          for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
            const meld = team.melds[mIdx];
            if (meld.some((c) => c.joker || c.forceWild || c.rank === '2')) continue;

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

        // Cria jogos novos sujos rasgando as regras (Ex: 8, 9, Coringa)
        if (me.hand.length >= 3) {
          n = me.hand.length;
          for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
              for (let k = j + 1; k < n; k++) {
                if (!this.canMeldSafely(me, team, 3, engine)) continue;
                const combo = [me.hand[i], me.hand[j], me.hand[k]];
                const wildCount = combo.filter((c) => c.joker || c.rank === '2').length;
                if (wildCount > 1) continue; // Continua proibido meter 2 coringas no mesmo jogo

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
