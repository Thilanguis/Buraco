// bot.js

export class BuracoBot {
  static async playTurn(stateIgnored, botIndex, engine) {
    // Agora o Bot SEMPRE puxa o estado mais recente do motor para não enlouquecer
    let state = engine.getState();
    let me = state.players[botIndex];
    let team = state.teams[me.teamId];
    let oppTeam = state.teams[me.teamId === 0 ? 1 : 0];

    const myScore = engine.computeTeamMeldScore(team).total;
    const oppScore = engine.computeTeamMeldScore(oppTeam).total;
    const isDesperate = oppScore > myScore + 1000;

    engine.showMessage(`🤖 Bot ${me.name} está pensando...`);
    await this.sleep(1200);

    try {
      // ==========================================
      // FASE 1: DECISÃO DE COMPRA
      // ==========================================
      let boughtFromDiscard = false;
      if (state.discard.length > 0) {
        const wantsDiscard = this.evaluateDiscard(state, me.hand, team, engine, isDesperate);
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
      // FASE 2: BAIXAR JOGOS
      // ==========================================
      state = engine.getState();
      me = state.players[botIndex];
      engine.showMessage(`🤖 Bot ${me.name} organizando as cartas...`);

      await this.processMelds(botIndex, isDesperate, engine);
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

  static evaluateDiscard(state, hand, team, engine, isDesperate) {
    const topCard = state.discard[state.discard.length - 1];

    if (team.melds && team.melds.length > 0) {
      for (let meld of team.melds) {
        const testMeld = [...meld, topCard];
        if (engine.isValidSequenceMeld(testMeld)) {
          const needsWild = testMeld.some((c) => c.joker || c.rank === '2');
          if (!needsWild || meld.length >= 6 || isDesperate) return true;
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
    if (state.variant === 'aberto' && state.discard.length >= 4) return true;
    if (isDesperate && (topCard.joker || topCard.rank === '2')) return true;

    return false;
  }

  static canMeldSafely(me, team, cardsToMeldCount, engine) {
    const cardsLeft = me.hand.length - cardsToMeldCount;
    if (cardsLeft > 1) return true;

    if (engine.canTeamTakeDeadNow(team.id)) return true;
    if (engine.teamHasGoodCanastra(team.id)) return true;

    return false;
  }

  static async processMelds(botIndex, isDesperate, engine) {
    let madeMove = true;
    let loops = 0;

    while (madeMove && loops < 25) {
      madeMove = false;
      loops++;

      // A GRANDE CORREÇÃO: Ele puxa a mão atualizada do Firebase A CADA LOOP!
      const state = engine.getState();
      const me = state.players[botIndex];
      const team = state.teams[me.teamId];

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
              await this.sleep(400);
              break;
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
              if (!this.canMeldSafely(me, team, 3, engine)) continue;
              const combo = [me.hand[i], me.hand[j], me.hand[k]];
              if (combo.some((c) => c.joker || c.rank === '2')) continue;

              if (engine.isValidSequenceMeld(combo)) {
                await engine.executeMeldNew(botIndex, [i, j, k]);
                madeMove = true;
                await this.sleep(600);
                break;
              }
            }
            if (madeMove) break;
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          const meld = team.melds[mIdx];
          const alreadyHasWild = meld.some((c) => c.joker || c.forceWild || c.rank === '2');
          if (alreadyHasWild) continue;

          if (meld.length >= 6 || isDesperate) {
            for (let i = 0; i < me.hand.length; i++) {
              if (!this.canMeldSafely(me, team, 1, engine)) continue;
              const c = me.hand[i];
              if (!c.joker && c.rank !== '2') continue;

              const testMeld = [...meld, c];
              if (engine.isValidSequenceMeld(testMeld)) {
                await engine.executeMeldExtend(botIndex, mIdx, [i]);
                madeMove = true;
                await this.sleep(500);
                break;
              }
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      if (isDesperate && me.hand.length >= 3) {
        n = me.hand.length;
        for (let i = 0; i < n - 2; i++) {
          for (let j = i + 1; j < n - 1; j++) {
            for (let k = j + 1; k < n; k++) {
              if (!this.canMeldSafely(me, team, 3, engine)) continue;
              const combo = [me.hand[i], me.hand[j], me.hand[k]];
              const wildCount = combo.filter((c) => c.joker || c.rank === '2').length;
              if (wildCount > 1) continue;

              if (engine.isValidSequenceMeld(combo)) {
                await engine.executeMeldNew(botIndex, [i, j, k]);
                madeMove = true;
                await this.sleep(600);
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
