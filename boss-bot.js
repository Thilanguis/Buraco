// bot.js
import { cleanDominationMelds, dominationOpeningCards, dominationStockEndgame } from './js/game/domination-strategy.js';
import { isPlausibleSequenceTriple, planPairIndexesWithTop, plannerFingerprint } from './js/game/bot-planner.js';

export class BossBuracoBot {
  static _turnLocks = new Set();
  static _plannerWorker = null;
  static _plannerRequestId = 0;
  static _plannerPending = new Map();
  static _plannerWorkerDisabled = false;
  static _plannerWorkerThreshold = 14;

  static perfNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
  }

  static createPlannerAbortError(message = 'Planejamento do bot cancelado.') {
    const error = new Error(message);
    error.name = 'AbortError';
    error.code = 'BOT_TURN_CANCELLED';
    return error;
  }

  static createStalePlanError() {
    const error = new Error('A mesa mudou enquanto o bot calculava a jogada.');
    error.name = 'AbortError';
    error.code = 'BOT_PLAN_STALE';
    return error;
  }

  static destroyPlannerWorker(reason = 'Planner reiniciado.') {
    const error = this.createPlannerAbortError(reason);
    for (const pending of this._plannerPending.values()) {
      pending.cleanup?.();
      pending.reject(error);
    }
    this._plannerPending.clear();
    if (this._plannerWorker) this._plannerWorker.terminate();
    this._plannerWorker = null;
  }

  static getPlannerWorker() {
    if (this._plannerWorkerDisabled || typeof Worker === 'undefined') return null;
    if (this._plannerWorker) return this._plannerWorker;
    try {
      const worker = new Worker(new URL('./js/game/bot-planner-worker.js', import.meta.url), { type: 'module' });
      worker.addEventListener('message', (event) => {
        const message = event.data || {};
        const pending = this._plannerPending.get(message.requestId);
        if (!pending) return;
        this._plannerPending.delete(message.requestId);
        pending.cleanup?.();
        if (message.ok) pending.resolve(message.result || []);
        else pending.reject(new Error(message.error || 'Falha no planner do bot.'));
      });
      const disable = () => {
        this._plannerWorkerDisabled = true;
        this.destroyPlannerWorker('Worker do bot indisponível; fallback local ativado.');
      };
      worker.addEventListener('error', disable);
      worker.addEventListener('messageerror', disable);
      this._plannerWorker = worker;
      return worker;
    } catch (error) {
      console.warn('[BOT-PERF] Web Worker indisponível; usando planner local.', error);
      this._plannerWorkerDisabled = true;
      return null;
    }
  }

  static assertPlanCurrent(token, engine, botIndex) {
    const current = engine.getState();
    if (!current || plannerFingerprint(current, botIndex) !== token) throw this.createStalePlanError();
  }

  static async planTriplesLocally(hand, engine, signal) {
    const cards = Array.isArray(hand) ? hand : [];
    const result = [];
    let checked = 0;
    for (let i = 0; i < cards.length - 2; i += 1) {
      for (let j = i + 1; j < cards.length - 1; j += 1) {
        for (let k = j + 1; k < cards.length; k += 1) {
          if (isPlausibleSequenceTriple([cards[i], cards[j], cards[k]])) result.push([i, j, k]);
          checked += 1;
          if (checked % 420 === 0) await this.cooperativeYield(engine, signal);
        }
      }
    }
    return result;
  }

  static async planTriples(state, botIndex, engine, signal) {
    const hand = state?.players?.[botIndex]?.hand || [];
    const token = plannerFingerprint(state, botIndex);
    const worker = hand.length >= this._plannerWorkerThreshold ? this.getPlannerWorker() : null;
    if (!worker) return { token, indexes: await this.planTriplesLocally(hand, engine, signal), worker: false };

    const requestId = ++this._plannerRequestId;
    try {
      const indexes = await new Promise((resolve, reject) => {
        let watchdog = null;
        const onAbort = () => {
          const pending = this._plannerPending.get(requestId);
          if (!pending) return;
          this._plannerPending.delete(requestId);
          pending.cleanup?.();
          reject(this.createPlannerAbortError());
        };
        const cleanup = () => {
          signal?.removeEventListener?.('abort', onAbort);
          if (watchdog != null) clearTimeout(watchdog);
        };
        this._plannerPending.set(requestId, { resolve, reject, cleanup });
        signal?.addEventListener?.('abort', onAbort, { once: true });
        // Alguns navegadores móveis já deixaram Workers vivos sem devolver
        // mensagem. Não deixamos um turno inteiro depender indefinidamente disso.
        watchdog = setTimeout(() => {
          const pending = this._plannerPending.get(requestId);
          if (!pending) return;
          this._plannerPending.delete(requestId);
          pending.cleanup?.();
          const error = new Error('Planner do bot excedeu o tempo de resposta; usando fallback local.');
          error.code = 'BOT_PLANNER_TIMEOUT';
          reject(error);
        }, 2200);
        worker.postMessage({ requestId, token, kind: 'triples', payload: { hand } });
      });
      this.assertActive(engine, signal);
      this.assertPlanCurrent(token, engine, botIndex);
      return { token, indexes, worker: true };
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      console.warn('[BOT-PERF] Worker falhou; usando planner local.', error);
      this._plannerWorkerDisabled = true;
      this.destroyPlannerWorker('Worker desativado após falha.');
      this.assertActive(engine, signal);
      this.assertPlanCurrent(token, engine, botIndex);
      return { token, indexes: await this.planTriplesLocally(hand, engine, signal), worker: false };
    }
  }

  static async cooperativeYield(engine, signal) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.assertActive(engine, signal);
  }

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
    this.destroyPlannerWorker('Turnos pendentes do bot cancelados.');
  }

  static async playTurn(stateIgnored, botIndex, engine, options = {}) {
    const signal = options.signal;
    this.assertActive(engine, signal);
    let state = engine.getState();
    if (!state?.mode?.startsWith('boss_')) {
      console.error('[BOSS-BOT] Execução recusada fora de modo Chefe:', state?.mode);
      return false;
    }
    if (!state || !state.players || !state.players[botIndex] || !state.teams) {
      if (typeof window !== 'undefined' && window.isClosingGame) return false;
      console.error('[BOT] Estado inicial inválido em playTurn:', state);
      return false;
    }

    const turnKey = `${state.turnNumber}:${state.currentPlayer}:${botIndex}`;
    if (this._turnLocks.has(turnKey)) {
      console.warn('[BOT] Jogada duplicada bloqueada para o mesmo turno:', turnKey);
      return false;
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
        await this.sleep(this.randomDelay(700, 1300), engine, signal);
        await engine.resolvePendingBossChoice(botIndex);
        state = engine.getState();
        me = state.players[botIndex];
        team = state.teams[me.teamId];
        oppTeam = state.teams[me.teamId === 0 ? 1 : 0];
      }
      if (typeof engine.hasPendingBossChoice === 'function' && engine.hasPendingBossChoice()) return;

      if (state.mode === '1x1_dominacao' && botIndex === 1 && engine.executeDominationPowers) {
        await engine.executeDominationPowers(botIndex);
        this.assertActive(engine, signal);
        state = engine.getState();
        if (!state || state.finished || state.currentPlayer !== botIndex) return;
        me = state.players[botIndex];
        team = state.teams[me.teamId];
        oppTeam = state.teams[me.teamId === 0 ? 1 : 0];
      }

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

      // Domination waits for <=4 cards without dead piles; other modes keep <=8.
      // O bot desliga o modo "fresco" do Ás-a-Ás e passa a desovar jogo separado, sujar cruzado, etc.
      const isDominationOwner = state.mode === '1x1_dominacao' && botIndex === 1;
      const isMonteSecando = isDominationOwner ? dominationStockEndgame(state) : !hasDeadPiles && stockCount <= 8;
      const isPanicDump = oppAboutToWin || isMonteSecando;

      // isDesperate absorve o Pânico, forçando o bot a quebrar as regras de segurar carta
      const isDesperate = isDominationOwner ? isMonteSecando
        : oppScore > myScore + 1000 || (oppTookMorto && !tookMorto && stockCount < 25) || isPanicDump;
      const isRushingMorto = !tookMorto && me.hand.length <= 5;
      const isDuo = state.mode?.startsWith('boss_') || state.mode === '2x2' || ((state.mode === '1x2' || state.mode === '1x3') && team.playerIndexes && team.playerIndexes.length > 1);

      // 🛡️ Identifica se o bot faz parte do time "Apelão" (Vantagem)
      const isVip = ((state.mode === '1x1_dominacao' || state.mode === '1x1_duploMorto') && botIndex === 1) || ((state.mode === '1x2' || state.mode === '1x3') && me.teamId === 1);

      // VIP Sniper ativado desde o turno 1, desliga se entrar em pânico
      const isVipSniper = isDominationOwner ? !isMonteSecando : isVip && !isDesperate && stockCount > 10;

      // 🛑 MODO HUMILHAÇÃO (FARMING): Desativado se o jogo estiver acabando
      const isFarming = isVip && tookMorto && engine.teamHasGoodCanastra(team.id) && (!oppHasCanastra || myScore > oppScore + 1000) && stockCount > 6 && !isPanicDump;

      const ctx = { isDesperate, isRushingMorto, isDuo, tookMorto, isVip, isVipSniper, isFarming, isPanicDump };

      engine.showMessage(`🤖 ${me.name} analisando a mesa...`);
      await this.sleep(Math.floor(Math.random() * 4000) + 1500, engine, signal);

      try {
        this.assertActive(engine, signal);
        let boughtFromDiscard = false;
        const naturePlan = engine.getNaturePriorities?.(me.id);
        const alreadyBought = state.hasDrawnThisTurn;
        if (!alreadyBought && state.discard.length > 0 && !engine.isDiscardBlocked?.() && !engine.shouldForceStockDraw?.(me.id)) {
          const intent = this.evaluateDiscard(state, me.hand, team, engine, ctx);
          const bossAllowsDiscard = !intent || typeof engine.shouldTakeBossDiscard !== 'function'
            || engine.shouldTakeBossDiscard(me.id, intent, naturePlan);
          if (intent && intent.wants && bossAllowsDiscard) {
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

        if (!state.hasDrawnThisTurn && (!boughtFromDiscard || state.partialDraw)) {
          this.assertActive(engine, signal);
          await engine.executeDrawStock(botIndex);
        }

        await this.sleep(this.randomDelay(900, 1300), engine, signal);

        state = engine.getState();
        if (!state || !state.players || !state.players[botIndex]) {
          if (typeof window !== 'undefined' && window.isClosingGame) return;
          console.error('[BOT] Estado inválido antes de organizar as cartas:', state);
          return;
        }

        me = state.players[botIndex];
        if (state.mode === '1x1_dominacao' && botIndex === 1 && engine.executeDominationPowers) {
          // The purchase may have made a canastra possible: invite before melding.
          await engine.executeDominationPowers(botIndex);
          this.assertActive(engine, signal);
          state = engine.getState();
          if (!state || state.finished || state.currentPlayer !== botIndex) return;
          me = state.players[botIndex];
        }
        engine.showMessage(`🤖 ${me.name} organizando as cartas...`);

        if (!engine.shouldSkipMelds?.(me.id)) {
          await this.processMelds(botIndex, ctx, engine, signal);

          // Rede de segurança exclusiva do modo Chefe: antes de descartar,
          // tenta novamente qualquer extensao NATURAL legal nos jogos da equipe.
          // Isso evita descartar uma carta como 9♣ quando A♣..8♣ ja esta na mesa.
          await this.playImmediateNaturalExtensions(botIndex, ctx, engine, signal);

          state = engine.getState();
          if (!state || state.finished || state.currentPlayer !== botIndex) return;
          me = state.players[botIndex];
        }
        await this.sleep(this.randomDelay(900, 1300), engine, signal);
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
        await this.sleep(this.randomDelay(800, 1400), engine, signal);
        let discarded = await this.processDiscard(botIndex, me.teamId === 0 ? 1 : 0, engine, signal);
        if (!discarded && typeof engine.recoverBotTurn === 'function') discarded = await engine.recoverBotTurn(botIndex);
        if (!discarded) {
          const error = new Error('O bot terminou as jogadas sem encontrar um descarte legal.');
          error.code = 'BOT_TURN_INCOMPLETE';
          throw error;
        }
      } catch (error) {
        if (this.isCancellationError(error)) throw error;
        console.error('Erro fatal:', error);

        const s = engine.getState();
        let recovered = false;
        if (s && s.players && s.players[botIndex]) {
          this.assertActive(engine, signal);
          const fallbackIndex = s.players[botIndex].hand.findIndex((card) => (
            card?.id
            && card.id !== s.pickedDiscardCardId
            && !engine.isCardBlocked?.(s.players[botIndex].id, card.id, 'discard')
          ));
          if (fallbackIndex >= 0) recovered = (await engine.executeDiscard(botIndex, fallbackIndex)) !== false;
          else if (typeof engine.recoverBotTurn === 'function') recovered = await engine.recoverBotTurn(botIndex);
        }
        const afterRecovery = engine.getState();
        if (!recovered && afterRecovery && !afterRecovery.finished && afterRecovery.currentPlayer === botIndex) throw error;
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

  static preservesDominationMeld(state, botIndex, base, after, engine) {
    if (state.mode !== '1x1_dominacao' || botIndex !== 1) return true;
    const before = this.simulateMeld(base, [], engine);
    if (!dominationStockEndgame(state) && this.isMeldDirty(after)) return false;
    return this.isMeldDirty(before) || !this.isMeldDirty(after);
  }

  static dominationOpeningValidator(state, botIndex, hand, melds, engine) {
    if (state.mode !== '1x1_dominacao' || botIndex !== 1 || dominationStockEndgame(state)) return () => true;
    const prepare = cards => this.simulateMeld(cards, [], engine);
    const available = new Set(dominationOpeningCards(hand, melds, {
      prepare,
      isWild: card => this.isMeldDirty([card]),
    }).map(card => card.id));
    return combo => {
      if (!combo.every(card => available.has(card.id))) return false;
      const prepared = prepare(combo);
      return engine.isValidSequenceMeld(prepared) && !this.isMeldDirty(prepared);
    };
  }

  static evaluateDiscard(state, hand, team, engine, ctx) {
    const pileSize = state.discard.length;
    if (pileSize === 0) return false;

    const topCard = state.discard[pileSize - 1];
    const allowsOpening = this.dominationOpeningValidator(state, state.currentPlayer, [...hand, topCard], team.melds, engine);
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

    // O filtro barato elimina pares que nunca poderiam formar sequência com o
    // topo do lixo. A validação oficial continua abaixo, então a regra do jogo
    // continua sendo a autoridade final.
    const pairCandidates = hand.length >= 2 ? planPairIndexesWithTop(hand, topCard) : [];

    // FASE 1: Tenta comprar usando jogo LIMPO (Encaixe perfeito)
    if (team.melds && team.melds.length > 0) {
      for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
        if (engine.isMeldLocked?.(team.id, mIdx)) continue;
        const meld = team.melds[mIdx];
        if (topIsWildOrTwo && this.isMeldDirty(meld)) continue;

        const testMeld = this.simulateMeld(meld, [topCard], engine);
        if (engine.isValidSequenceMeld(testMeld)) {
          const realSuit = this.getRealSuit(meld);
          if (!this.preservesDominationMeld(state, state.currentPlayer, meld, testMeld, engine)) continue;
          const hasTwo = meld.some((c) => c.rank === '2');
          const needsWild = this.isMeldDirty(testMeld);
          const isPerfectTwo = topCard.rank === '2' && topCard.suit === realSuit && !hasTwo && !needsWild;

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
      for (const [i, j] of pairCandidates) {
          const combo = [hand[i], hand[j], topCard];
          if (!allowsOpening(combo)) continue;

          if (this.isComboPerfectlyClean3(combo, engine)) {
            if (!checkSafe(2, combo)) continue;

            // 🛑 TRAVA ANTI-CANIBALISMO NO LIXO (Jogo Limpo)
            const getRealSuit = (cards) => {
              const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
              return real ? real.suit : null;
            };
            const suit = getRealSuit(combo);
            const hasMeldSameSuit = suit && team.melds && team.melds.some((m) => getRealSuit(m) === suit);

            if (hasMeldSameSuit && !(state.mode === '1x1_dominacao' && state.currentPlayer === 1) && (ctx.isVip || !ctx.isDesperate)) {
              if (!ctx.isPanicDump) continue;
            }

            return { wants: true, action: 'new', handIndexes: [i, j] };
          }
      }
    }

    // 🧠 FASE 1.5: GOLPE DO FALSO SUJO
    // O bot (especialmente o VIP) usa EXCLUSIVAMENTE o 2 do MESMO naipe para roubar a mesa,
    // garantindo que a sujeira poderá ser limpa depois para fazer as canastras de meta.
    if (hand.length >= 2 && (isJuicyPile || ctx.isVip)) {
      for (const [i, j] of pairCandidates) {
          const combo = [hand[i], hand[j], topCard];
          if (!allowsOpening(combo)) continue;

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

    // FASE 2: Tenta comprar SUJANDO o jogo (Só vai entrar aqui se estiver no Desespero)
    if (allowDirty) {
      if (team.melds && team.melds.length > 0) {
        for (let mIdx = 0; mIdx < team.melds.length; mIdx++) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          const meld = team.melds[mIdx];
          if (topIsWildOrTwo && this.isMeldDirty(meld)) continue;

          const testMeld = this.simulateMeld(meld, [topCard], engine);
          if (!this.preservesDominationMeld(state, state.currentPlayer, meld, testMeld, engine)) continue;
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
        for (const [i, j] of pairCandidates) {
            const combo = [hand[i], hand[j], topCard];
            if (!allowsOpening(combo)) continue;
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
  static bossResourceRiskScore(current, max, delta = 0, sidePenalty = 0) {
    const cap = Math.max(1, Number(max) || 1);
    const before = Math.max(0, Math.min(cap, Number(current) || 0));
    const applied = Math.max(0, Number(delta) || 0);
    const after = Math.max(0, Math.min(cap, before + applied));
    if (applied > 0 && after >= cap) return 1000;

    const afterRatio = after / cap;
    const deltaRatio = applied / cap;
    return deltaRatio * 150 + Math.pow(afterRatio, 3) * 120 + Math.max(0, Number(sidePenalty) || 0);
  }

  static dominatrixPressureConfig(abilityId, phase = 1) {
    const configs = {
      forced_choice: {
        1: { direct: 6, obey: 2, fail: 12 },
        2: { direct: 7, obey: 3, fail: 14 },
        3: { direct: 8, obey: 3, fail: 16 },
      },
      exposure: {
        1: { success: 1, fail: 9 },
        2: { success: 1, fail: 11 },
        3: { success: 1, fail: 13 },
      },
      iron_etiquette: {
        1: { obey: 2, fail: 10 },
        2: { obey: 2, fail: 12 },
        3: { obey: 3, fail: 14 },
      },
      final_order: { direct: 7, accept: 2, miss: 6 },
      break_will: { direct: 8, heal: 180 },
    };
    const config = configs[abilityId];
    if (!config) return {};
    return config[phase] || config[3] || config;
  }

  // A Dominadora ainda guarda 0..4 internamente por compatibilidade, mas cada
  // unidade equivale a 12,5 pontos da barra 0..50 mostrada ao jogador.
  // O bot avalia a barra real e o transbordamento, não "Chicotes inteiros".
  static dominatrixRiskScore(state, playerId, addedDominationPoints = 0) {
    const boss = state?.boss;
    if (!boss || boss.id !== 'dominadora') return 0;
    const players = state.players || [];
    const partner = players.find((player) => player.id !== playerId);
    const ownBefore = Math.max(0, Math.min(50, (Number(boss.chainsByPlayer?.[playerId]) || 0) * 12.5));
    const partnerBefore = Math.max(0, Math.min(50, (Number(boss.chainsByPlayer?.[partner?.id]) || 0) * 12.5));
    const incoming = Math.max(0, Number(addedDominationPoints) || 0);
    const ownAfter = Math.min(50, ownBefore + incoming);
    const overflow = Math.max(0, ownBefore + incoming - 50);
    const partnerAfter = Math.min(50, partnerBefore + overflow);

    if (ownAfter >= 50 && partnerAfter >= 50) return 1000;

    const barRisk = (before, after, primary) => {
      const delta = Math.max(0, after - before);
      let score = (delta / 50) * 150 + Math.pow(after / 50, 3) * (primary ? 70 : 35);
      const crossings = [
        [12.5, primary ? 4 : 2],
        [25, primary ? 10 : 5],
        [37.5, primary ? 55 : 28], // Sob Controle
        [50, primary ? 120 : 70], // Dominado
      ];
      for (const [threshold, bonus] of crossings) {
        if (before < threshold && after >= threshold) score += bonus;
      }
      return score;
    };

    return barRisk(ownBefore, ownAfter, true) + barRisk(partnerBefore, partnerAfter, false);
  }

  static estimateDominatrixOrderSuccess(state, player, order) {
    if (!player || !order?.type) return 0.5;
    if (order.type === 'discard_suit') {
      const eligible = new Set(order.eligibleCardIds || []);
      const options = (player.hand || []).filter((card) => card?.id && eligible.has(card.id)).length;
      return options >= 2 ? 0.9 : options === 1 ? 0.8 : 0.5;
    }
    if (order.type === 'evolve_specific_meld') {
      const eligible = new Set(order.eligibleCardIds || []);
      const options = (player.hand || []).filter((card) => card?.id && eligible.has(card.id)).length;
      return options >= 2 ? 0.82 : options === 1 ? 0.68 : 0.5;
    }
    if (order.type === 'feed_specific_meld') return 0.86;
    if (order.type === 'reduce_hand') {
      const excess = Math.max(0, (player.hand?.length || 0) - (Number(order.handLimit) || 0));
      return excess <= 1 ? 0.88 : excess === 2 ? 0.78 : 0.62;
    }
    return 0.65;
  }

  static chooseDominatrixPendingChoice(state, playerId, choice) {
    if (state?.boss?.id !== 'dominadora' || !choice) return null;
    const player = (state.players || []).find((entry) => entry.id === playerId);
    if (!player) return null;
    const phase = Math.max(1, Number(choice.announcedPhase || state.boss.phase || 1));

    if (choice.type === 'forced_choice' && choice.options?.includes('chain') && choice.options?.includes('order')) {
      const pressure = this.dominatrixPressureConfig('forced_choice', phase);
      const directRisk = this.dominatrixRiskScore(state, playerId, pressure.direct);
      if (!choice.order) return 'chain';
      const successChance = this.estimateDominatrixOrderSuccess(state, player, choice.order);
      const successRisk = this.dominatrixRiskScore(state, playerId, pressure.obey);
      const failureRisk = this.dominatrixRiskScore(state, playerId, pressure.obey + pressure.fail);
      const strategicCost = {
        discard_suit: 3,
        feed_specific_meld: 4,
        reduce_hand: 6,
        evolve_specific_meld: 9,
      }[choice.order.type] || 5;
      const orderRisk = successChance * successRisk + (1 - successChance) * failureRisk + strategicCost;
      return orderRisk <= directRisk ? 'order' : 'chain';
    }

    if (choice.type === 'final_order' && choice.options?.includes('obey') && choice.options?.includes('chain')) {
      const pressure = this.dominatrixPressureConfig('final_order', phase);
      const directRisk = this.dominatrixRiskScore(state, playerId, pressure.direct);
      const handSize = player.hand?.length || 0;
      let missChance = handSize <= 6 ? 0.18 : handSize <= 9 ? 0.24 : handSize <= 12 ? 0.3 : 0.36;
      const ownPoints = (Number(state.boss.chainsByPlayer?.[playerId]) || 0) * 12.5;
      if (ownPoints >= 37.5) missChance += 0.05;
      missChance = Math.min(0.5, missChance);
      const p0 = Math.pow(1 - missChance, 2);
      const p1 = 2 * missChance * (1 - missChance);
      const p2 = Math.pow(missChance, 2);
      const obeyRisk = p0 * this.dominatrixRiskScore(state, playerId, pressure.accept)
        + p1 * this.dominatrixRiskScore(state, playerId, pressure.accept + pressure.miss)
        + p2 * this.dominatrixRiskScore(state, playerId, pressure.accept + pressure.miss * 2);
      return obeyRisk <= directRisk ? 'obey' : 'chain';
    }

    if (choice.type === 'break_will' && choice.options?.includes('chain') && choice.options?.includes('break_meld')) {
      const pressure = this.dominatrixPressureConfig('break_will', phase);
      const directRisk = this.dominatrixRiskScore(state, playerId, pressure.direct);
      const boss = state.boss;
      const actualHeal = Math.max(0, Math.min(pressure.heal, Number(boss.maxHp) - Number(boss.hp)));
      const hpRatio = boss.maxHp > 0 ? Math.max(0, Number(boss.hp) / Number(boss.maxHp)) : 1;
      let healCost = boss.maxHp > 0 ? (actualHeal / boss.maxHp) * 400 : actualHeal / 6;
      if (hpRatio <= 0.15) healCost += 95;
      else if (hpRatio <= 0.3) healCost += 55;
      else if (hpRatio <= 0.5) healCost += 20;
      return directRisk <= healCost ? 'chain' : 'break_meld';
    }

    return null;
  }

  static bossStrategicMeldKind(meld) {
    const cards = (meld || []).filter(Boolean);
    if (cards.length < 7) return 'simple';
    if (this.isMeldDirty(cards)) return 'suja';
    if (cards.length >= 14) return 'asas';
    if (cards.length === 13) return 'real';
    return 'limpa';
  }

  static bossMeldSacrificeCost(baseMeld, testMeld) {
    const before = (baseMeld || []).filter(Boolean);
    const after = (testMeld || []).filter(Boolean);
    if (!before.length || this.isMeldDirty(before) || !this.isMeldDirty(after)) return 0;

    const kind = this.bossStrategicMeldKind(before);
    if (kind === 'asas') return 230;
    if (kind === 'real') return 190;
    if (kind === 'limpa') return 130;
    // Mesmo antes de fechar canastra, uma sequência limpa longa tem valor futuro.
    return 36 + Math.min(6, before.length) * 9;
  }

  static bossThreatScore(state, player, {
    card = null,
    meldIndex = null,
    naturePriorities = null,
    dominatrixPriorities = null,
    dimitrescuPriorities = null,
    neheleniaPriorities = null,
    financedCardIds = [],
    bankerAuditCardIds = [],
    directObjective = false,
  } = {}) {
    const boss = state?.boss;
    if (!boss || !state?.mode?.startsWith('boss_')) return 0;
    const intent = boss.currentIntent;
    const cardId = card?.id || null;

    if (boss.id === 'banker') {
      let debt = 0;
      if (cardId && financedCardIds.includes(cardId)) {
        const financed = (boss.effects || []).find((effect) => effect.id === 'financed_card' && effect.playerId === player.id && effect.cardId === cardId);
        debt = Math.max(debt, Number(financed?.debtPerCard) || 0);
      }
      if (intent?.abilityId === 'suit_audit' && cardId && bankerAuditCardIds.includes(cardId)) {
        const remaining = Math.max(1, (Number(intent.payload?.required) || 0) - (Number(intent.payload?.progress) || 0));
        debt = Math.max(debt, (Number(intent.payload?.failureDelta) || 0) / remaining);
      }
      if (!debt && directObjective && intent?.abilityId === 'compound_interest') {
        const totalCards = (state.players || []).reduce((sum, entry) => sum + (entry.hand?.length || 0), 0);
        debt = totalCards >= 14 ? Number(intent.payload?.dangerDebt) || 14 : totalCards >= 8 ? Number(intent.payload?.warningDebt) || 10 : 0;
      }
      return this.bossResourceRiskScore(boss.danger, boss.maxDanger || 100, debt);
    }

    if (boss.id === 'matriarca_esmeralda') {
      let bloom = 0;
      let sidePenalty = 0;
      const threats = (boss.natureThreats || []).filter((threat) => threat?.status === 'active');
      for (const threat of threats) {
        const matchesCard = cardId && threat.cardId === cardId && threat.targetPlayerId === player.id;
        const matchesMeld = Number.isInteger(meldIndex) && (
          threat.meldIndex === meldIndex || (threat.meldIndexes || []).includes(meldIndex)
        );
        const matchesHarvest = naturePriorities?.harvestActive && threat.type === 'harvest' && threat.targetPlayerId === player.id;
        if (!matchesCard && !matchesMeld && !matchesHarvest) continue;
        bloom = Math.max(bloom, Number(threat.bloomAmount) || (threat.type === 'graft' ? 2 : 1));
        sidePenalty = Math.max(sidePenalty, (Number(threat.healAmount) || 0) / 5);
      }
      if (!bloom && directObjective) bloom = boss.bloom >= 4 ? 1 : 0;
      return this.bossResourceRiskScore(boss.bloom, boss.maxDanger || 5, bloom, sidePenalty);
    }

    if (boss.id === 'dominadora') {
      const phase = Math.max(1, Number(intent?.announcedPhase || boss.phase || 1));
      let dominationPoints = 0;
      let sidePenalty = 0;
      if (cardId) {
        const finalOrderMarked = (boss.effects || []).some((effect) => effect.id === 'final_order_mark'
          && effect.playerId === player.id && effect.cardId === cardId);
        if (finalOrderMarked) dominationPoints = Math.max(dominationPoints, this.dominatrixPressureConfig('final_order').miss);
        if (intent?.abilityId === 'exposure' && intent.payload?.targetPlayerId === player.id && intent.payload?.cardId === cardId) {
          const pressure = this.dominatrixPressureConfig('exposure', phase);
          dominationPoints = Math.max(dominationPoints, Math.max(0, pressure.fail - pressure.success));
        }
      }
      if (Number.isInteger(meldIndex)) {
        const activeOrder = (boss.activeOrders || []).find((order) => order?.status === 'active'
          && order.targetPlayerId === player.id
          && ['feed_specific_meld', 'evolve_specific_meld'].includes(order.type)
          && Number(order.meldIndex) === Number(meldIndex));
        if (activeOrder) {
          const orderPressure = this.dominatrixPressureConfig(activeOrder.sourceAbilityId, Number(activeOrder.announcedPhase || phase));
          dominationPoints = Math.max(dominationPoints, Number(orderPressure.fail) || 0);
        } else if ((dominatrixPriorities?.meldIndexes || []).includes(meldIndex)) {
          // Posse é controle puro: ainda vale priorizar libertar o jogo, mas não
          // fingimos que ela causa Dominação direta.
          sidePenalty = 46;
        }
      }
      if (!dominationPoints && directObjective && dominatrixPriorities?.urgent) sidePenalty = Math.max(sidePenalty, 28);
      return this.dominatrixRiskScore(state, player.id, dominationPoints) + sidePenalty;
    }

    if (boss.id === 'dimitrescu') {
      const phase = Number(intent?.announcedPhase || boss.phase || 1);
      let blood = 0;
      if (intent?.abilityId === 'bela_hunt' && cardId === intent.payload?.cardId && intent.payload?.targetPlayerId === player.id && !intent.payload?.used) {
        blood = (phase === 3 ? 16 : 14) + 3;
      } else if (intent?.abilityId === 'cassandra_feast' && Number.isInteger(meldIndex) && meldIndex === intent.payload?.meldIndex && !intent.payload?.fed) {
        blood = (phase === 3 ? 18 : 16) + 4;
      } else if (intent?.abilityId === 'crimson_brand' && cardId) {
        const mark = (intent.payload?.marks || []).find((entry) => entry.status === 'active' && entry.playerId === player.id && entry.cardId === cardId);
        if (mark) blood = (phase === 3 ? 9 : 7) + 2;
      } else if (intent?.abilityId === 'three_daughters') {
        const objectives = intent.payload?.objectives || [];
        const bela = objectives.find((entry) => entry.type === 'bela' && entry.status === 'active' && entry.targetPlayerId === player.id && entry.cardId === cardId);
        const cassandra = objectives.find((entry) => entry.type === 'cassandra' && entry.status === 'active' && Number.isInteger(meldIndex) && entry.meldIndex === meldIndex);
        if (bela || cassandra) blood = 10; // +8 evitado e -2 conquistado.
      }
      if (!blood && directObjective && dimitrescuPriorities?.urgent) blood = boss.danger >= 85 ? 12 : 0;
      return this.bossResourceRiskScore(boss.danger, boss.maxDanger || 100, blood);
    }

    if (boss.id === 'nehelenia') {
      let mirrors = 0;
      let sidePenalty = 0;
      if (intent?.abilityId === 'mirrored_meld' && Number.isInteger(meldIndex) && meldIndex === intent.payload?.meldIndex && !intent.payload?.fed) mirrors = 1;
      if (intent?.abilityId === 'follow_reflection' && neheleniaPriorities?.exactPlayCount != null) mirrors = 1;
      if (intent?.abilityId === 'tiger_link' && Number.isInteger(meldIndex) && (neheleniaPriorities?.meldIndexes || []).includes(meldIndex)) sidePenalty = 48;
      if (intent?.abilityId === 'tiger_prey' && Number.isInteger(meldIndex) && (neheleniaPriorities?.meldIndexes || []).includes(meldIndex)) sidePenalty = 58;
      if (intent?.abilityId === 'fish_inverted' && Number.isInteger(meldIndex) && (neheleniaPriorities?.meldIndexes || []).includes(meldIndex)) sidePenalty = 64;
      if (intent?.abilityId === 'fish_marked_card' && cardId && (neheleniaPriorities?.markedCardIds || []).includes(cardId)) sidePenalty = 52;
      if (!mirrors && !sidePenalty && directObjective && neheleniaPriorities?.urgent) sidePenalty = 36;
      return this.bossResourceRiskScore(boss.danger, boss.maxDanger || 5, mirrors, sidePenalty);
    }

    return 0;
  }

  static shouldSacrificeMeldForBoss(state, player, baseMeld, testMeld, context = {}) {
    const sacrificeCost = this.bossMeldSacrificeCost(baseMeld, testMeld);
    if (sacrificeCost <= 0) return true;
    const threatScore = this.bossThreatScore(state, player, context);
    // Derrota imediata / condição crítica sempre pode justificar o sacrifício.
    if (threatScore >= 1000) return true;
    return threatScore >= sacrificeCost;
  }

  static canMeldSafely(me, team, cardsToUse, engine, pendingMeld = null, ctx = null) {
    const cardsLeft = me.hand.length - cardsToUse;

    if (cardsLeft > 1) return true;

    // 🚨 PANIC DUMP: Se a partida vai acabar a qualquer segundo, ignora restrições e desova tudo.
    if (ctx && ctx.isPanicDump) return true;

    // 🛑 TRAVA DE FARMING: Se o bot quer humilhar, ele recusa fazer jogadas que deixem ele com 1 carta (força descarte final) ou 0 cartas (batida direta).
    if (ctx && ctx.isFarming && cardsLeft <= 1) return false;

    if (engine.canTeamTakeDeadNow(team.id)) return true;
    const bossState = engine.getState?.();
    const bossMode = !!bossState?.mode?.startsWith('boss_');
    const safeBossFinish = !bossMode || typeof engine.canSafelyFinishBoss !== 'function' || engine.canSafelyFinishBoss();
    if (engine.teamHasGoodCanastra(team.id)) return safeBossFinish;

    // Se ele for zerar a mão, mas o jogo que ele está montando FORMAR a canastra,
    // isso só autoriza a batida no modo Chefe quando o ataque final projetado mata.
    if (pendingMeld && pendingMeld.length >= 7) {
      const realSuit = this.getRealSuit(pendingMeld);
      const hasWild = pendingMeld.some((c) => c.joker || (c.rank === '2' && c.suit !== realSuit) || c.forceWild);
      if (!hasWild && safeBossFinish) return true; // É limpa/real/ás e a batida é segura.
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
    const perfStartedAt = this.perfNow();
    let plannedCandidates = 0;
    let workerPlans = 0;
    let maxHandSize = 0;
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
      maxHandSize = Math.max(maxHandSize, me.hand?.length || 0);
      const team = s.teams[me.teamId];
      if (!team) {
        console.error('[BOT] Team inválido em processMelds:', { s, me, botIndex });
        return;
      }

      // 🧠 MODO SNIPER (Ganância Segura): VIPs jogam para humilhar, mas só APÓS garantir uma canastra limpa.
      // A trava VIP agora vem do contexto global para operar de forma unificada
      if (s.mode === '1x1_dominacao' && botIndex === 1) {
        // Draws and canastra bonuses can cross the threshold within this turn.
        const endgame = dominationStockEndgame(s);
        ctx = { ...ctx, isDesperate: endgame, isPanicDump: endgame,
          isVipSniper: !endgame, isFarming: ctx.isFarming && !endgame };
      }
      const isVipSniper = ctx.isVipSniper;
      const allowsOpening = this.dominationOpeningValidator(s, botIndex, me.hand, team.melds, engine);
      // Longer clean runs get first refusal, regardless of creation order.
      const meldOrder = team.melds.map((meld, index) => ({ meld, index }));
      if (s.mode === '1x1_dominacao' && botIndex === 1) {
        meldOrder.sort((a, b) => Number(this.isMeldDirty(a.meld)) - Number(this.isMeldDirty(b.meld))
          || b.meld.length - a.meld.length);
      }

      const naturePriorities = engine.getNaturePriorities?.(me.id);
      const dominatrixPriorities = engine.getDominatrixPriorities?.(me.id);
      const dimitrescuPriorities = engine.getDimitrescuPriorities?.(me.id);
      const neheleniaPriorities = engine.getNeheleniaPriorities?.(me.id);
      const combatPriorities = engine.getCombatPriorities?.(me.id);
      const combatMove = combatPriorities?.plan?.moves?.[0];
      if (combatMove) {
        const indexes = combatMove.cardIds.map((id) => me.hand.findIndex((card) => card.id === id));
        const pendingMeld = combatMove.meldIndex == null ? indexes.map((index) => me.hand[index]) : [...(team.melds[combatMove.meldIndex] || []), ...indexes.map((index) => me.hand[index])];
        if (indexes.every((index) => index >= 0) && this.canMeldSafely(me, team, indexes.length, engine, pendingMeld, ctx)) {
          const moved = combatMove.meldIndex == null
            ? await engine.executeMeldNew(botIndex, indexes)
            : await engine.executeMeldExtend(botIndex, combatMove.meldIndex, indexes);
          if (moved !== false) { madeMove = true; await this.paceBetweenActions(engine, signal); continue; }
        }
      }
      const exactPlayTarget = Number.isInteger(neheleniaPriorities?.exactPlayCount) ? neheleniaPriorities.exactPlayCount : null;
      const exactAlreadyPlayed = Math.max(0, Number(neheleniaPriorities?.exactPlayedCount) || 0);
      const exactRemaining = exactPlayTarget == null ? null : Math.max(0, exactPlayTarget - exactAlreadyPlayed);
      const requiredDiscardSuit = neheleniaPriorities?.discardSuit || null;
      const withinNeheleniaPlayLimit = (count) => exactRemaining == null || Math.max(0, Number(count) || 0) <= exactRemaining;
      const preservesNeheleniaDiscardSuit = (cards) => {
        if (!requiredDiscardSuit) return true;
        const spentIds = new Set((cards || []).map((card) => card?.id).filter(Boolean));
        const remainingLegalSuitCards = (me.hand || []).filter((card) => card?.id
          && !spentIds.has(card.id)
          && card.id !== s.pickedDiscardCardId
          && !card.joker
          && card.suit === requiredDiscardSuit
          && !engine.isCardBlocked?.(me.id, card.id, 'discard'));
        return remainingLegalSuitCards.length > 0;
      };
      // Siga o Reflexo: quando o BOT já atingiu exatamente o padrão, ele para
      // de baixar cartas e preserva o resultado até o descarte.
      if (exactRemaining === 0) break;
      const financedCardIds = (s.boss?.id === 'banker' ? (s.boss.effects || []) : [])
        .filter((effect) => effect.id === 'financed_card' && effect.playerId === me.id)
        .map((effect) => effect.cardId)
        .filter(Boolean);
      const bankerAuditCardIds = s.boss?.id === 'banker'
        && s.boss.currentIntent?.abilityId === 'suit_audit'
        && (Number(s.boss.currentIntent.payload?.progress) || 0) < (Number(s.boss.currentIntent.payload?.required) || 0)
        ? (me.hand || []).filter((card) => card?.id && !card.joker && card.suit === s.boss.currentIntent.payload?.suit).map((card) => card.id)
        : [];
      const markedCards = new Set([
        ...(naturePriorities?.markedCardIds || []),
        ...(dominatrixPriorities?.markedCardIds || []),
        ...(dimitrescuPriorities?.markedCardIds || []),
        ...(neheleniaPriorities?.markedCardIds || []),
        ...(combatPriorities?.markedCardIds || []),
        ...financedCardIds,
        ...bankerAuditCardIds,
      ]);
      const markedMelds = new Set([
        ...(naturePriorities?.meldIndexes || []),
        ...(dominatrixPriorities?.meldIndexes || []),
        ...(dimitrescuPriorities?.meldIndexes || []),
        ...(neheleniaPriorities?.meldIndexes || []),
      ]);
      const directMarkedCards = new Set(markedCards);
      const directMarkedMelds = new Set(markedMelds);
      const priorityUrgent = !!naturePriorities?.urgent || !!naturePriorities?.harvestActive || !!dominatrixPriorities?.urgent || !!dimitrescuPriorities?.urgent || !!neheleniaPriorities?.urgent || !!combatPriorities?.urgent;
      const flexibleBossObjective = neheleniaPriorities?.exactPlayCount != null || !!naturePriorities?.harvestActive;
      if (markedCards.size || markedMelds.size || priorityUrgent || flexibleBossObjective) {
        if ((priorityUrgent || flexibleBossObjective) && !neheleniaPriorities?.strictMeldTargets) {
          (team.melds || []).forEach((meld, index) => {
            if (meld?.length) markedMelds.add(index);
          });
        }
        const cardIndexes = me.hand.map((card, index) => ({ card, index })).sort((a, b) => Number(markedCards.has(b.card?.id)) - Number(markedCards.has(a.card?.id))
          || Number(this.isMeldDirty([a.card])) - Number(this.isMeldDirty([b.card])));
        const meldIndexes = (team.melds || []).map((meld, index) => ({ meld, index })).sort((a, b) => Number(markedMelds.has(b.index)) - Number(markedMelds.has(a.index)));

        let priorityChecks = 0;
        // Primeiro procura uma solução que preserve a qualidade dos jogos. Só depois
        // considera sujar algo, e nesse segundo passe o custo estratégico é comparado
        // com o risco REAL do chefe (barra/Chicotes/efeito persistente).
        for (const allowSacrifice of [false, true]) {
          for (const { meld, index: meldIndex } of meldIndexes) {
            if (engine.isMeldLocked?.(team.id, meldIndex)) continue;
            for (const { card, index: handIndex } of cardIndexes) {
              priorityChecks += 1;
              if (priorityChecks % 48 === 0) await this.cooperativeYield(engine, signal);
              if (!card || (!markedCards.has(card.id) && !markedMelds.has(meldIndex))) continue;
              if (!withinNeheleniaPlayLimit(1) || !preservesNeheleniaDiscardSuit([card])) continue;
              const testMeld = this.simulateMeld(meld, [card], engine);
              if (!this.preservesDominationMeld(s, botIndex, meld, testMeld, engine)) continue;
              const dirtiesClean = !this.isMeldDirty(meld) && this.isMeldDirty(testMeld);
              if (dirtiesClean && !allowSacrifice) continue;

              const directObjective = directMarkedCards.has(card.id)
                || directMarkedMelds.has(meldIndex)
                || flexibleBossObjective;
              if (dirtiesClean) {
                // Urgência genérica nunca autoriza destruir uma canastra sozinha.
                // A jogada precisa realmente atender a obrigação atual e o risco
                // precisa valer mais do que o patrimônio sacrificado.
                if (!directObjective) continue;
                if (!this.shouldSacrificeMeldForBoss(s, me, meld, testMeld, {
                  card,
                  meldIndex,
                  naturePriorities,
                  dominatrixPriorities,
                  dimitrescuPriorities,
                  neheleniaPriorities,
                  financedCardIds,
                  bankerAuditCardIds,
                  directObjective,
                })) continue;
              }
              if (!engine.isValidSequenceMeld(testMeld) || !this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;
              this.assertActive(engine, signal);
              const moved = await engine.executeMeldExtend(botIndex, meldIndex, [handIndex]);
              if (moved !== false) {
                madeMove = true;
                await this.paceBetweenActions(engine, signal);
                break;
              }
            }
            if (madeMove) break;
          }
          if (madeMove) break;
        }
        if (madeMove) continue;

        if (markedCards.size && engine.canCreateMeld?.(me.id) !== false && me.hand.length >= 3) {
          const markedIndex = me.hand.findIndex((card) => markedCards.has(card?.id));
          if (markedIndex >= 0) {
            let markedComboChecks = 0;
            outerNatureCombo: for (let first = 0; first < me.hand.length - 1; first += 1) {
              if (first === markedIndex) continue;
              for (let second = first + 1; second < me.hand.length; second += 1) {
                if (second === markedIndex) continue;
                markedComboChecks += 1;
                if (markedComboChecks % 48 === 0) await this.cooperativeYield(engine, signal);
                const indexes = [markedIndex, first, second];
                const combo = indexes.map((index) => me.hand[index]);
                if (!withinNeheleniaPlayLimit(combo.length) || !preservesNeheleniaDiscardSuit(combo)) continue;
                if (!allowsOpening(combo)) continue;
                if (!engine.isValidSequenceMeld(combo) || !this.canMeldSafely(me, team, 3, engine, combo, ctx)) continue;
                this.assertActive(engine, signal);
                const moved = await engine.executeMeldNew(botIndex, indexes);
                if (moved !== false) {
                  madeMove = true;
                  await this.paceBetweenActions(engine, signal);
                  break outerNatureCombo;
                }
              }
            }
          }
        }
        if (madeMove) continue;
      }

      if (team.melds && team.melds.length > 0) {
        for (const { index: mIdx } of meldOrder) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.joker || c.rank === '2') continue;
            if (!withinNeheleniaPlayLimit(1) || !preservesNeheleniaDiscardSuit([c])) continue;

            // CORREÇÃO 1: Usa o simulador para ignorar a armadura do 2
            const testMeld = this.simulateMeld(team.melds[mIdx], [c], engine);
            if (!this.preservesDominationMeld(s, botIndex, team.melds[mIdx], testMeld, engine)) continue;

            if (!this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;

            // 🛑 TRAVA ANTI-BURRICE: Não suja jogo limpo a não ser que vá bater
            const wasDirty = this.isMeldDirty(team.melds[mIdx]);
            const isNowDirty = this.isMeldDirty(testMeld);
            if (!wasDirty && isNowDirty && me.hand.length > 1) continue;

            if (engine.isValidSequenceMeld(testMeld)) {
              this.assertActive(engine, signal);
              const moved = await engine.executeMeldExtend(botIndex, mIdx, [i]);
              madeMove = moved !== false;
              await this.paceBetweenActions(engine, signal);
              break;
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      if (team.melds && team.melds.length > 0) {
        for (const { index: mIdx } of meldOrder) {
          if (engine.isMeldLocked?.(team.id, mIdx)) continue;
          const meld = team.melds[mIdx];
          if (this.isMeldDirty(meld)) continue;

          const realSuit = this.getRealSuit(meld);
          for (let i = 0; i < me.hand.length; i++) {
            const c = me.hand[i];
            if (c.rank === '2' && c.suit === realSuit) {
              if (!withinNeheleniaPlayLimit(1) || !preservesNeheleniaDiscardSuit([c])) continue;
              // CORREÇÃO 2: Usa o simulador para o Coringa Perfeito
              const testMeld = this.simulateMeld(meld, [c], engine);
              if (!this.preservesDominationMeld(s, botIndex, meld, testMeld, engine)) continue;

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
                await this.paceBetweenActions(engine, signal);
                break;
              }
            }
          }
          if (madeMove) break;
        }
      }
      if (madeMove) continue;

      // A + natural 2 (or another two-card bridge) may only fit together.
      // Try that before opening a separate run with the same cards.
      if (s.mode === '1x1_dominacao' && botIndex === 1) {
        for (const { meld, index: mIdx } of meldOrder) {
          if (meld.length >= 14 || engine.isMeldLocked?.(team.id, mIdx)) continue;
          for (let first = 0; first < me.hand.length - 1 && !madeMove; first++) {
            for (let second = first + 1; second < me.hand.length; second++) {
              const bridgeCards = [me.hand[first], me.hand[second]];
              if (!withinNeheleniaPlayLimit(bridgeCards.length) || !preservesNeheleniaDiscardSuit(bridgeCards)) continue;
              const after = this.simulateMeld(meld, bridgeCards, engine);
              if (this.isMeldDirty(after) || !engine.isValidSequenceMeld(after)
                || !this.canMeldSafely(me, team, 2, engine, after, ctx)) continue;
              this.assertActive(engine, signal);
              madeMove = (await engine.executeMeldExtend(botIndex, mIdx, [first, second])) !== false;
              if (madeMove) {
                await this.paceBetweenActions(engine, signal);
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
        const plan = await this.planTriples(s, botIndex, engine, signal);
        plannedCandidates += plan.indexes.length;
        if (plan.worker) workerPlans += 1;

        for (let candidateIndex = 0; candidateIndex < plan.indexes.length; candidateIndex += 1) {
          if (candidateIndex > 0 && candidateIndex % 48 === 0) {
            await this.cooperativeYield(engine, signal);
            this.assertPlanCurrent(plan.token, engine, botIndex);
          }
          const indexes = plan.indexes[candidateIndex];
          const combo = indexes.map((index) => me.hand[index]);
          if (combo.some((card) => !card)) continue;
          if (!withinNeheleniaPlayLimit(combo.length) || !preservesNeheleniaDiscardSuit(combo)) continue;
          if (!allowsOpening(combo)) continue;
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
          if (!isValidCombo || !engine.isValidSequenceMeld(combo)) continue;

          // 🛑 TRAVA UNIVERSAL ANTI-CANIBALISMO (Impede separar jogos do mesmo naipe)
          const getRealSuit = (cards) => {
            const real = cards.find((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
            return real ? real.suit : null;
          };
          const suit = getRealSuit(combo);
          if (suit) {
            const hasMeldSameSuit = team.melds.some((m) => getRealSuit(m) === suit);
            if (hasMeldSameSuit && !(s.mode === '1x1_dominacao' && botIndex === 1) && (ctx.isVip || !ctx.isDesperate)) {
              if (!ctx.isPanicDump) continue;
            }
          }

          this.assertPlanCurrent(plan.token, engine, botIndex);
          this.assertActive(engine, signal);
          const moved = await engine.executeMeldNew(botIndex, indexes);
          madeMove = moved !== false;
          await this.paceBetweenActions(engine, signal);
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
      if (s.mode === '1x1_dominacao' && botIndex === 1) {
        allowDirty = dominationStockEndgame(s);
      } else if (isVipSniper) {
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
              if (!withinNeheleniaPlayLimit(1) || !preservesNeheleniaDiscardSuit([c])) continue;

              // 🛑 TRAVA DE PRESERVAÇÃO DO 2 (Anti-Cross-Suit)
              // Impede que o bot queime um 2 natural em outro naipe, preservando o caminho para o Ás-a-Ás.
              if (!c.joker && c.rank === '2' && c.suit !== realSuit) {
                if (ctx.isVip && !ctx.isPanicDump) continue; // Dominador NUNCA suja cruzado antes do pânico fatal
                if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto && me.hand.length > 2) continue; // Bot normal segura
              }

              // CORREÇÃO 3: Usa o simulador para sujeira no endgame
              const testMeld = this.simulateMeld(meld, [c], engine);
              if (!this.preservesDominationMeld(s, botIndex, meld, testMeld, engine)) continue;

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
                await this.paceBetweenActions(engine, signal);
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
          const panicPlan = await this.planTriples(s, botIndex, engine, signal);
          plannedCandidates += panicPlan.indexes.length;
          if (panicPlan.worker) workerPlans += 1;

          for (let candidateIndex = 0; candidateIndex < panicPlan.indexes.length; candidateIndex += 1) {
            if (candidateIndex > 0 && candidateIndex % 48 === 0) {
              await this.cooperativeYield(engine, signal);
              this.assertPlanCurrent(panicPlan.token, engine, botIndex);
            }
            const indexes = panicPlan.indexes[candidateIndex];
            const combo = indexes.map((index) => me.hand[index]);
            if (combo.some((card) => !card)) continue;
            if (!withinNeheleniaPlayLimit(combo.length) || !preservesNeheleniaDiscardSuit(combo)) continue;
            if (!allowsOpening(combo)) continue;
            if (!this.canMeldSafely(me, team, 3, engine, combo)) continue;

            const wilds = combo.filter((c) => c.joker || c.rank === '2').length;
            if (wilds === 0 || wilds > 2) continue;

            const wildCard = combo.find((c) => c.joker || c.rank === '2');
            const realCard = combo.find((c) => !c.joker && c.rank !== '2');
            if (wildCard && !wildCard.joker && wildCard.rank === '2' && realCard && wildCard.suit !== realCard.suit) {
              if (ctx.isVip && !ctx.isPanicDump) continue;
              if (!ctx.isVip && !ctx.isDesperate && !ctx.isRushingMorto && me.hand.length > 2) continue;
            }

            if (!engine.isValidSequenceMeld(combo)) continue;
            this.assertPlanCurrent(panicPlan.token, engine, botIndex);
            this.assertActive(engine, signal);
            const moved = await engine.executeMeldNew(botIndex, indexes);
            madeMove = moved !== false;
            await this.paceBetweenActions(engine, signal);
            if (madeMove) break;
          }
        }
      }
    }

    const elapsed = this.perfNow() - perfStartedAt;
    if (elapsed >= 120) {
      console.info('[BOT-PERF] processMelds', {
        mode: engine.getState()?.mode,
        botIndex,
        ms: Math.round(elapsed),
        loops,
        maxHandSize,
        plannedCandidates,
        workerPlans,
      });
    }
  }

  static async playImmediateNaturalExtensions(botIndex, ctx, engine, signal) {
    let movedAny = false;
    let safety = 0;

    while (safety < 20) {
      safety += 1;
      this.assertActive(engine, signal);
      const state = engine.getState();
      if (!state || state.finished || state.currentPlayer !== botIndex) return movedAny;

      const me = state.players?.[botIndex];
      const team = me ? state.teams?.[me.teamId] : null;
      if (!me || !team || engine.shouldSkipMelds?.(me.id)) return movedAny;

      const neheleniaPriorities = engine.getNeheleniaPriorities?.(me.id);
      const exactTarget = Number.isInteger(neheleniaPriorities?.exactPlayCount) ? neheleniaPriorities.exactPlayCount : null;
      const exactPlayed = Math.max(0, Number(neheleniaPriorities?.exactPlayedCount) || 0);
      if (exactTarget != null && exactPlayed >= exactTarget) return movedAny;

      const requiredDiscardSuit = neheleniaPriorities?.discardSuit || null;
      let movedThisPass = false;

      for (let meldIndex = 0; meldIndex < (team.melds || []).length && !movedThisPass; meldIndex += 1) {
        const meld = team.melds[meldIndex];
        if (!meld || engine.isMeldLocked?.(team.id, meldIndex)) continue;

        for (let handIndex = 0; handIndex < (me.hand || []).length; handIndex += 1) {
          const card = me.hand[handIndex];
          if (!card || card.joker || card.rank === '2') continue;

          // Nao gasta a ultima carta exigida para descarte por uma habilidade.
          if (requiredDiscardSuit && card.suit === requiredDiscardSuit) {
            const alternatives = (me.hand || []).filter((other, index) => index !== handIndex
              && other?.id
              && !other.joker
              && other.suit === requiredDiscardSuit
              && other.id !== state.pickedDiscardCardId
              && !engine.isCardBlocked?.(me.id, other.id, 'discard'));
            if (!alternatives.length) continue;
          }

          const testMeld = this.simulateMeld(meld, [card], engine);
          if (!engine.isValidSequenceMeld(testMeld)) continue;
          if (!this.canMeldSafely(me, team, 1, engine, testMeld, ctx)) continue;

          this.assertActive(engine, signal);
          const moved = await engine.executeMeldExtend(botIndex, meldIndex, [handIndex]);
          if (moved !== false) {
            movedAny = true;
            movedThisPass = true;
            await this.paceBetweenActions(engine, signal);
            break;
          }
        }
      }

      if (!movedThisPass) return movedAny;
    }

    return movedAny;
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

    if (me.hand.length === 0) return typeof engine.recoverBotTurn === 'function' ? engine.recoverBotTurn(botIndex) : false;

    const labDiscardIndex = engine.selectBossLabDiscardIndex?.(me.id, me.hand);
    if (Number.isInteger(labDiscardIndex) && labDiscardIndex >= 0 && labDiscardIndex < me.hand.length) {
      this.assertActive(engine, signal);
      const discarded = await engine.executeDiscard(botIndex, labDiscardIndex);
      if (discarded !== false) return true;
    }

    let discardIndex = -1;
    let minDanger = 9999;
    const dominatrixPriorities = engine.getDominatrixPriorities?.(me.id);
    const finalOrderCardIds = new Set(dominatrixPriorities?.markedCardIds || []);
    const neheleniaPriorities = engine.getNeheleniaPriorities?.(me.id);
    const orderedSuit = dominatrixPriorities?.discardSuit || neheleniaPriorities?.discardSuit || null;
    const neheleniaMarkedCardIds = new Set(neheleniaPriorities?.markedCardIds || []);
    const combatPriorities = engine.getCombatPriorities?.(me.id);
    const neheleniaPreferredDiscardCardIds = new Set([...(neheleniaPriorities?.preferredDiscardCardIds || []), ...(combatPriorities?.preferredDiscardCardIds || [])]);
    const financedCardIds = new Set((state.boss?.id === 'banker' ? (state.boss.effects || []) : [])
      .filter((effect) => effect.id === 'financed_card' && effect.playerId === me.id)
      .map((effect) => effect.cardId)
      .filter(Boolean));
    const growingClean = state.mode === '1x1_dominacao' && botIndex === 1
      ? cleanDominationMelds(state.teams[me.teamId].melds, {
        prepare: meld => this.simulateMeld(meld, [], engine),
        isWild: card => this.isMeldDirty([card]),
      }).filter(meld => meld.length < 14) : [];

    for (let i = 0; i < me.hand.length; i++) {
      const c = me.hand[i];
      // Ignora cartas fantasmas (null)
      if (!c || state.pickedDiscardCardId === c.id || engine.isCardBlocked?.(me.id, c.id, 'discard')) continue;

      let danger = 0;
      // A Carta Financiada só quita a Tarifa se entrar em jogo. O bot tenta
      // preservá-la para uma jogada e só a descarta como último recurso.
      if (financedCardIds.has(c.id)) danger += 5000;
      if (finalOrderCardIds.has(c.id)) danger += 5000;
      if (combatPriorities?.preferredDiscardCardIds?.includes(c.id)) danger -= 7000;
      if (neheleniaMarkedCardIds.has(c.id)) {
        // Mão no Espelho aceita jogar OU descartar a carta marcada. Se o BOT
        // não conseguiu usá-la em jogo, o descarte é a saída correta.
        danger += neheleniaPreferredDiscardCardIds.has(c.id) ? -6200 : 4200;
      }
      if (!c.joker) {
        const needed = growingClean.filter(meld => meld[0].suit === c.suit).reduce((sum, meld) =>
          sum + Math.max(0, (c.rank === 'A' ? 2 : 1) - meld.filter(card => card.rank === c.rank).length), 0);
        const copies = me.hand.filter(card => !card.joker && card.suit === c.suit && card.rank === c.rank).length;
        if (needed >= copies) danger += 1500;
      }
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

        // Evita jogar fora carta que entra no PRÓPRIO jogo.
        // Uma extensão natural válida vale muito mais do que uma heurística comum
        // de descarte: o bot já teve a chance de baixá-la em processMelds(), então,
        // se ela ainda chegou até aqui, deve ser preservada como fallback em vez
        // de ser jogada fora por uma diferença pequena de score.
        const myTeam = state.teams[me.teamId];
        if (myTeam && myTeam.melds) {
          const orderedSuitAlternatives = orderedSuit
            ? me.hand.filter((card) => card?.id
              && card.id !== c.id
              && !card.joker
              && card.suit === orderedSuit
              && card.id !== state.pickedDiscardCardId
              && !engine.isCardBlocked?.(me.id, card.id, 'discard')).length
            : 0;

          for (let myMeldIndex = 0; myMeldIndex < myTeam.melds.length; myMeldIndex += 1) {
            const myMeld = myTeam.melds[myMeldIndex];
            if (!myMeld || engine.isMeldLocked?.(myTeam.id, myMeldIndex)) continue;
            const simulated = this.simulateMeld(myMeld, [c], engine);
            if (!engine.isValidSequenceMeld(simulated)) continue;

            // Se esta for a única carta capaz de cumprir um descarte de naipe
            // obrigatório, a ordem do chefe tem precedência sobre preservá-la.
            const forcedSuitOnlyOption = orderedSuit
              && !c.joker
              && c.suit === orderedSuit
              && orderedSuitAlternatives === 0;

            if (state.mode?.startsWith('boss_')) {
              if (!forcedSuitOnlyOption) {
                danger += 9000;
                if (myMeld.length < 7 && simulated.length >= 7) danger += 4000;
              }
            } else {
              // Fora do modo Chefe, preserva exatamente a heurística histórica
              // dos bots normais/especiais. Não alterar comportamento de 1x1,
              // 1x2, 1x3, 2x2, Dominação ou Duplo Morto.
              danger += 200;
            }
            break;
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

      if (orderedSuit) {
        if (!c.joker && c.suit === orderedSuit) danger -= 600;
        else danger += 150;
      }

      if (danger < minDanger) {
        minDanger = danger;
        discardIndex = i;
      }
    }

    // Fallback de segurança se tudo der errado
    if (discardIndex === -1 || (state.pickedDiscardCardId && state.pickedDiscardCardId === me.hand[discardIndex]?.id)) {
      discardIndex = me.hand.findIndex((c) => c
        && c.id !== state.pickedDiscardCardId
        && !engine.isCardBlocked?.(me.id, c.id, 'discard'));

      // Se não achou, pega a primeira carta real disponível na mão
      if (discardIndex === -1) {
        discardIndex = me.hand.findIndex((c) => c
          && !engine.isCardBlocked?.(me.id, c.id, 'discard'));
      }

      // Prevenção extrema: se a mão inteira for fantasma, aborta para não crashar o motor
      if (discardIndex === -1) return false;
    }

    this.assertActive(engine, signal);
    return (await engine.executeDiscard(botIndex, discardIndex)) !== false;
  }

  static randomDelay(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  static async paceBetweenActions(engine, signal) {
    await this.sleep(this.randomDelay(1700, 2300), engine, signal);
  }

  static async sleep(ms, engine, signal) {
    this.assertActive(engine, signal);

    const configuredScale = Number(engine?.botDelayScale);
    const delayScale = Number.isFinite(configuredScale) && configuredScale > 0 ? configuredScale : 1;
    const delay = Math.max(20, Math.round(ms * delayScale));

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
      }, delay);
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
