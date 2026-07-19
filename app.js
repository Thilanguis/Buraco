import { BOSS_SFX, CANASTRA_SFX, TABLE_AMBIENT_MAX_VOLUME, TABLE_AMBIENT_MUSIC, TABLE_AMBIENT_STORAGE_KEY, clampMediaVolume, playSfxClone, sfxCardMove, sfxHeartbeat, sfxMyTurn, sfxSteal, stopAllGameSfx } from './js/audio.js';
import { db, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from './js/firebase.js';
import { createDeck, dealInitialDeck } from './js/deck.js';
import { TABLE_THEME_IDS, normalizeDeckTheme, normalizeTableTheme } from './js/themes.js';
import {
  BOSS_MODE_DOMINATRIX,
  applyBossDeadTaken,
  applyBossFinalStrike,
  applyBossMeldTransition,
  applyBossResourceDefeat,
  advanceBossTurn,
  beginBossTurn,
  completeBossPlayerTurn,
  consumeBossDiscardSurcharge,
  consumeBossExtraDraw,
  registerBossFinancedCards,
  createBossStateForMode,
  canBossCreateMeld,
  canBossUseMeld,
  getBossChains,
  getBossCreditLimitQuote,
  chooseBossFixedInterestBotOption,
  shouldBossBotAcceptCreditPlay,
  shouldBossBotTakeDiscard,
  getBossCardBlockFeedback,
  getBossCardEffect,
  getBossPendingChoice,
  getBossMeldContribution,
  getBossMeldNatureThreats,
  getBossDominatrixPriorities,
  getBossNaturePriorities,
  getBossNatureThreatSummaries,
  getBossDiscardSurcharge,
  getBossInterdictAttempt,
  getBossVault,
  hasPendingBossChoices,
  canBossPerformCommonAction,
  getBossPhaseName,
  isBossCardBlocked,
  isBossDiscardBlocked,
  isBossMeldLocked,
  isBossMeldPossessed,
  isBossMode,
  isBossPlayerDominated,
  isBossTurnActive,
  isBossVaultDrawRequired,
  normalizeBossState,
  notifyBossDiscardTaken,
  notifyBossCardDiscarded,
  reclaimBossVault,
  resolveBossChoice,
  resolveBossInterdictAttempt,
  validateBossClosedDiscardSelection,
  validateBossMeldPlay,
  isValidBossSequence,
} from './js/boss/boss-engine.js';
import { getBossDefinition, getBossDefinitionForMode, normalizeVariantForMode } from './js/boss/boss-registry.js';
import { buildBossActionPresentation, buildBossFinalPresentation } from './js/boss/boss-presentation.js';
import { canRestoreUndoTransaction, createUndoTransaction, restoreUndoTransaction } from './js/game/undo-transaction.js';
import { enumerateWildcardOptions } from './js/game/wildcard-choice.js';

// Importa a IA do Bot
import { BuracoBot } from './bot.js';

const COOPERATIVE_MENU_MODE = 'cooperative';

function getSelectedBossDefinition() {
  return getBossDefinition(document.getElementById('bossSelect')?.value || 'banker');
}

function getEffectiveMenuMode() {
  const menuMode = document.getElementById('modeSelect')?.value || '';
  return menuMode === COOPERATIVE_MENU_MODE ? getSelectedBossDefinition()?.mode || '' : menuMode;
}

function applyCooperativeBossPreset() {
  if (document.getElementById('modeSelect')?.value !== COOPERATIVE_MENU_MODE) return null;
  const definition = getSelectedBossDefinition();
  if (!definition) return null;

  document.getElementById('variantSelect').value = 'fechado';
  document.getElementById('betToggle').value = 'nao';
  document.getElementById('deckThemeSelect').value = definition.deckTheme;
  document.getElementById('tableThemeSelect').value = definition.tableTheme;
  document.getElementById('betConfig').style.display = 'none';
  return definition;
}

// --- LÓGICA DE LOADING E ROTAÇÃO DE VÍDEOS ---
const loadingScreen = document.getElementById('loadingScreen');
let introFinished = false;

window.addEventListener('load', () => {
  // Inicia a rotação dos vídeos
  const videos = [document.getElementById('bgVid1'), document.getElementById('bgVid2'), document.getElementById('bgVid3')];

  videos.forEach((vid, idx) => {
    if (!vid) return;
    vid.addEventListener('ended', () => {
      vid.classList.remove('active'); // Esconde o atual com fade out

      const nextIdx = (idx + 1) % videos.length;
      const nextVid = videos[nextIdx];

      nextVid.currentTime = 0; // Zera o próximo
      nextVid.play().catch(() => {});
      nextVid.classList.add('active'); // Mostra o próximo com fade in
    });
  });

  // Força o play do primeiro (fallback para navegadores chatos)
  if (videos[0])
    Object.assign(videos[0], { currentTime: 0 })
      .play()
      .catch(() => {});

  // Lógica de sumir a tela de loading
  const isDebug = window.location.search.includes('debug=1') || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (isDebug) {
    loadingScreen.style.display = 'none';
    introFinished = true;
    if (!state) {
      document.getElementById('configSection').style.display = 'flex';
      if (typeof window.updateMenuDynamic === 'function') window.updateMenuDynamic();
    }
  } else {
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';

    setTimeout(() => {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        introFinished = true;

        if (!state) {
          document.getElementById('configSection').style.display = 'flex';
          if (typeof window.updateMenuDynamic === 'function') window.updateMenuDynamic();
        }
      }, 1000);
    }, 2500);
  }
});

window.addEventListener('load', () => {
  const battleDetails = document.getElementById('bossBattleDetails');
  battleDetails?.addEventListener('toggle', () => {
    if (!battleDetails.open || !state?.boss?.eventLog?.length) return;
    const latest = state.boss.eventLog[state.boss.eventLog.length - 1];
    lastSeenBossLogKey = `${latest.actionId || latest.id || latest.type}:${latest.at || latest.round || 0}`;
    const marker = document.getElementById('bossLogNew');
    if (marker) marker.hidden = true;
  });
});

document.addEventListener(
  'click',
  () => {
    unlockAudio();
  },
  { once: true },
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Substitua o bloco do navigator.serviceWorker.register (linhas 3435 a 3470) por este:

    navigator.serviceWorker
      .register('service-worker.js')
      .then(async (reg) => {
        let totalAtts = 1;
        let newVersionNum = 93;
        let oldVersionNum = parseInt(localStorage.getItem('buraco_current_version') || '93', 10);

        try {
          const response = await fetch('service-worker.js');
          const text = await response.text();
          const match = text.match(/CACHE_NAME\s*=\s*['"`]buraco-v(\d+)['"`]/);
          if (match) {
            newVersionNum = parseInt(match[1], 10);
            if (newVersionNum > oldVersionNum) {
              totalAtts = newVersionNum - oldVersionNum;
            }
          }
        } catch (err) {
          console.error('[SW] Erro ao calcular salto de versões:', err);
        }

        // 🛡️ TRAVA: Só abre a modal se a versão do servidor for maior que a do localStorage
        const applyWorker = (worker) => {
          if (!worker) return;
          if (newVersionNum > oldVersionNum) showUpdatePrompt(worker, totalAtts, newVersionNum);
          else worker.postMessage('skipWaiting');
        };

        if (reg.waiting) applyWorker(reg.waiting);

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) applyWorker(installingWorker);
          };
        };
      })
      .catch((err) => console.log('SW erro:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdatePrompt(worker, totalAtts = 1, newVersion = 93) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(5, 5, 5, 0.95); z-index: 100000; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(5px);';
  document.body.appendChild(overlay);

  const startProgressSequence = () => {
    overlay.innerHTML = `
                    <div class="score-card" style="max-width: 320px; text-align: center; padding: 30px 20px; border-color: #facc15;">
                      <h2 style="margin: 0 0 16px 0; color: #facc15; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Sincronizando Módulos...</h2>

                      <div style="width: 100%; background: #1e293b; border-radius: 99px; height: 8px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(250, 204, 21, 0.2);">
                        <div id="update-progress-bar" style="width: 0%; height: 100%; background: #22c55e; box-shadow: 0 0 10px #22c55e; transition: width 0.1s linear;"></div>
                      </div>

                      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                        <span id="update-status-text">Compilando pacotes (1/${totalAtts})...</span>
                        <span id="update-percent" style="color: #4ade80; font-weight: bold;">0%</span>
                      </div>
                    </div>
                  `;

    let progress = 0;
    let currentStep = 1;
    const bar = document.getElementById('update-progress-bar');
    const percentText = document.getElementById('update-percent');
    const statusText = document.getElementById('update-status-text');

    const interval = setInterval(() => {
      // Calcula o teto de progresso visual para a etapa atual (Ex: se total for 3, etapa 1 para em 33%)
      let stepTarget = (currentStep / totalAtts) * 100;
      progress += Math.floor(Math.random() * 8) + 4;

      if (progress >= stepTarget) {
        progress = stepTarget;
        if (currentStep < totalAtts) {
          currentStep++;
        }
      }

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        statusText.textContent = 'Mesa pronta!';
        statusText.style.color = '#4ade80';
        bar.style.width = '100%';
        bar.style.background = '#facc15';
        bar.style.boxShadow = '0 0 15px #facc15';
        percentText.textContent = '100%';

        // Salva a versão atualizada com sucesso para a próxima checagem bater certo
        localStorage.setItem('buraco_current_version', newVersion);

        setTimeout(() => {
          if (worker) {
            try {
              worker.postMessage('skipWaiting');
            } catch (err) {
              console.error('[SW] Erro ao enviar skipWaiting:', err);
            }
          }
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }, 600);
      } else {
        bar.style.width = progress + '%';
        percentText.textContent = Math.round(progress) + '%';
        statusText.textContent = `Compilando pacotes (${currentStep}/${totalAtts})...`;
      }
    }, 80);
  };

  overlay.innerHTML = `
              <div class="score-card" style="max-width: 380px; text-align: center; padding: 30px 20px; border-color: #facc15;">
                <div style="font-size: 2.5rem; margin-bottom: 12px; text-shadow: 0 0 15px rgba(250, 204, 21, 0.4);">✨</div>
                <h2 style="margin: 0 0 10px 0; color: #facc15; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">Atualização Pronta</h2>
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 24px; line-height: 1.5;">Uma nova versão do Buraco Findom foi detectada (${totalAtts} modificação(ões) pendente(s)). Deseja aplicar as melhorias agora?</p>
                <div style="display: flex; gap: 10px; width: 100%;">
                  <button class="custom-modal-btn" id="btn-update-later" style="flex: 1; background: #334155; color: #fff; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none;">DEPOIS</button>
                  <button class="custom-modal-btn" id="btn-update-now" style="flex: 1; background: linear-gradient(135deg, #b45309 0%, #78350f 100%); color: #facc15; border: 1px solid #facc15; padding: 12px; border-radius: 8px; font-weight: 900; cursor: pointer; letter-spacing: 1px;">ATUALIZAR</button>
                </div>
              </div>
            `;

  document.getElementById('btn-update-later').onclick = () => overlay.remove();
  document.getElementById('btn-update-now').onclick = () => startProgressSequence();
}

const urlParams = new URLSearchParams(window.location.search);
let gameId = urlParams.get('game');
if (!gameId) {
  // Se não tem sala na URL, gera um código aleatório (ex: a1b2c3) e redireciona
  gameId = Math.random().toString(36).substring(2, 8);
  window.location.replace(`?game=${gameId}`);
}
let myPlayerIndex = parseInt(urlParams.get('player'), 10);
if (isNaN(myPlayerIndex)) {
  const savedSeat = localStorage.getItem(`buraco_seat_${gameId}`);
  myPlayerIndex = savedSeat !== null ? parseInt(savedSeat, 10) : -1;
} else {
  localStorage.setItem(`buraco_seat_${gameId}`, myPlayerIndex);
}

const gameRef = doc(db, 'buracoGames', gameId);

const SUITS = ['♠', '♦', '♣', '♥'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANKS_SEQ = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_SEQ_LOW = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const DEAD_CHUNK_SIZE = 11;

let state = null;
let currentLobby = null;
window.botPlayTimeoutId = null;
window.isClosingGame = false;
window.gameSessionId = window.gameSessionId || 0;
let localExitPending = false;
let botTurnController = new AbortController();
let selectedHandIndexes = new Set();
let turnTimerId = null;
let turnTimerRemaining = 0;
let selectedMeldTarget = null;
let lastMyTurn = false;
let lastSeenActionId = null;
let ignoreOwnActionId = null;
let lastRenderedBossEventId = null;
let lastAnimatedBossSwapId = null;
let renderedBossFeedbackCount = null;
let renderedBossFeedbackEventIds = null;
let lastRenderedBossBloom = null;
let lastRenderedBossBloomEventId = null;
let lastSeenBossLogKey = null;
let lastBossVictorySoundKey = null;
let lastBossIntroSoundKey = null;
let seenBossResourceSoundEventIds = null;
let bossResourceSoundScope = null;
let bossPresentationTimer = null;
let bossPresentationKey = '';
let bossDamageReactionTimer = null;
const renderedBossMeldContributions = new Map();
const bossSwapReceivedHighlights = new Map();

function isBossLabAutomationPaused(gameState = state) {
  return gameState?.debugScenario?.active === true && gameState.debugScenario.pauseAutomation === true;
}

function bossEventAddsResource(boss, event) {
  if (!boss || !event) return false;
  if (boss.id === 'banker') {
    return Number(event.dangerDelta) > 0 || (event.type === 'discardSurcharge' && Number(event.amount) > 0) || (event.type === 'bossDamage' && Number(event.creditLimitDebt) > 0);
  }
  if (boss.id === 'dominadora') return event.type === 'chainChange' && Number(event.amount) > 0;
  if (boss.id === 'matriarca_esmeralda') return event.type === 'bloomChange' && Number(event.amount) > 0;
  return false;
}

function bossEventHealsMatriarch(boss, event) {
  return boss?.id === 'matriarca_esmeralda' && event?.type === 'bossHeal' && Number(event.amount) > 0;
}

function matriarchNatureSoundPairKey(event, suffix) {
  const actionId = String(event?.actionId || '');
  const marker = `:${suffix}`;
  return actionId.endsWith(marker) ? actionId.slice(0, -marker.length) : '';
}

function playBossSfxSequence(firstSource, secondSource) {
  const firstAudio = playSfxClone(firstSource, { audioContext: audioCtx });
  if (!firstAudio) {
    playSfxClone(secondSource, { audioContext: audioCtx });
    return;
  }

  let secondStarted = false;
  const playSecond = () => {
    if (secondStarted) return;
    secondStarted = true;
    playSfxClone(secondSource, { audioContext: audioCtx });
  };
  firstAudio.addEventListener('ended', playSecond, { once: true });
  firstAudio.addEventListener('error', playSecond, { once: true });
}

function syncBossResourceSounds(boss) {
  const events = boss?.eventLog || [];
  const scope = `${gameId}:${boss?.id || ''}:${boss?.seed || 0}`;
  if (seenBossResourceSoundEventIds == null || bossResourceSoundScope !== scope) {
    bossResourceSoundScope = scope;
    seenBossResourceSoundEventIds = new Set(events.map((event) => event.actionId).filter(Boolean));
    return;
  }

  const newEvents = events.filter((event) => event.actionId && !seenBossResourceSoundEventIds.has(event.actionId));
  newEvents.forEach((event) => seenBossResourceSoundEventIds.add(event.actionId));
  if (!audioUnlocked) return;

  const pairedHealByKey = new Map(
    newEvents
      .filter((event) => bossEventHealsMatriarch(boss, event))
      .map((event) => [matriarchNatureSoundPairKey(event, 'heal'), event])
      .filter(([key]) => key),
  );
  const pairedResourceKeys = new Set(
    newEvents
      .filter((event) => bossEventAddsResource(boss, event))
      .map((event) => matriarchNatureSoundPairKey(event, 'bloom'))
      .filter(Boolean),
  );
  const sequencedHealIds = new Set([...pairedHealByKey].filter(([key]) => pairedResourceKeys.has(key)).map(([, event]) => event.actionId));

  for (const event of newEvents) {
    if (bossEventAddsResource(boss, event)) {
      const pairedHeal = pairedHealByKey.get(matriarchNatureSoundPairKey(event, 'bloom'));
      if (pairedHeal) {
        playBossSfxSequence(BOSS_SFX[boss.id]?.resource, BOSS_SFX.matriarca_esmeralda.heal);
      } else {
        playSfxClone(BOSS_SFX[boss.id]?.resource, { audioContext: audioCtx });
      }
    }
    if (bossEventHealsMatriarch(boss, event) && !sequencedHealIds.has(event.actionId)) {
      playSfxClone(BOSS_SFX.matriarca_esmeralda.heal, { audioContext: audioCtx });
    }
  }
}

function playBossIntroSoundOnce(gameState = state) {
  const boss = gameState?.boss;
  if (!audioUnlocked || !boss?.id) return;
  const introKey = `${gameId}:${boss.id}:${boss.seed || 0}`;
  const persistedIntroKey = sessionStorage.getItem('buraco_boss_intro_sound');
  if (introKey === lastBossIntroSoundKey || introKey === persistedIntroKey) return;
  lastBossIntroSoundKey = introKey;
  sessionStorage.setItem('buraco_boss_intro_sound', introKey);
  playSfxClone(BOSS_SFX[boss.id]?.resource, { audioContext: audioCtx });
}

let movingWild = null;

function resetDeniedCardSelection() {
  selectedHandIndexes.clear();
  selectedMeldTarget = null;
  renderHand();
  renderMelds();
}

let localUndoStack = []; // Pilha para o botão voltar
window.isStealModeActive = false; // Controle da visão da mesa

function cancelGameAnimations() {
  if (bossPresentationTimer) {
    clearTimeout(bossPresentationTimer);
    bossPresentationTimer = null;
  }
  if (bossDamageReactionTimer) {
    clearTimeout(bossDamageReactionTimer);
    bossDamageReactionTimer = null;
  }
  bossPresentationKey = '';
  const gameSection = document.getElementById('gameSection');
  (document.getAnimations?.() || []).forEach((animation) => {
    const target = animation.effect?.target;
    if (target && (gameSection?.contains(target) || target.classList?.contains('dice-scene'))) animation.cancel();
  });
  document.querySelectorAll('.fly-card, .impact-ring, .spark, .dice-scene, .boss-floating-number').forEach((element) => element.remove());
}

function invalidateGameSession({ stopMedia = true } = {}) {
  window.isClosingGame = true;
  window.gameSessionId += 1;
  botTurnController.abort();
  botTurnController = new AbortController();
  BuracoBot.cancelPendingTurns();

  if (window.botPlayTimeoutId) {
    clearTimeout(window.botPlayTimeoutId);
    window.botPlayTimeoutId = null;
  }
  window.lastBotTurnPlayed = null;
  stopTurnTimer();
  cancelGameAnimations();

  if (stopMedia) {
    stopTableAmbientMusic(true);
    stopAllGameSfx();
  }
}

function activateGameSession() {
  botTurnController.abort();
  botTurnController = new AbortController();
  window.gameSessionId += 1;
  window.isClosingGame = false;
  localExitPending = false;
  BuracoBot.cancelPendingTurns();
  return window.gameSessionId;
}

function isGameSessionActive(sessionId, signal) {
  return !signal?.aborted && !window.isClosingGame && !localExitPending && !!state && window.gameSessionId === sessionId && document.getElementById('gameSection')?.style.display === 'flex';
}

function isCurrentBossMode() {
  return isBossMode(state);
}

function getCooperativeProjectedScore() {
  if (!state?.teams?.[0]) return 0;
  const team = state.teams[0];
  const boardScore = computeTeamMeldScore(team).total;
  const handPenalty = state.players.filter((player) => player.teamId === 0).reduce((sum, player) => sum + player.hand.reduce((handSum, card) => handSum + cardBasePoints(card), 0), 0);
  return boardScore - handPenalty - ((state.deadChunksTaken?.[0] || 0) === 0 ? 100 : 0);
}

async function processBossMeldChange(player, oldKind, newKind, meldIndex, cardsAdded, isNewMeld = false, options = {}) {
  if (!isCurrentBossMode()) return null;
  const pendingInterdictEvent =
    state._pendingBossEvent?.type === 'interdictDecision' && state._pendingBossEvent?.decision === 'disobey' && state._pendingBossEvent?.allowEvolution === true && state._pendingBossEvent?.resistanceSuppressionConsumed !== true
      ? state._pendingBossEvent
      : null;
  const suppressDominatrixResistance = options.suppressDominatrixResistance ?? !!pendingInterdictEvent;
  const event = applyBossMeldTransition(state, {
    teamId: player.teamId,
    playerId: player.id,
    meldIndex,
    oldKind,
    newKind,
    cardsAdded,
    isNewMeld,
    creditEligibleCardIds: options.creditEligibleCardIds ?? null,
    cardOriginsById: options.cardOriginsById ?? null,
    suppressDominatrixResistance,
  });
  if (suppressDominatrixResistance && pendingInterdictEvent) {
    pendingInterdictEvent.resistanceSuppressionConsumed = true;
  }
  if (state.boss?.defeated && !state.boss.result) {
    const definition = getBossDefinition(state.boss.id);
    state.boss.result = {
      victory: true,
      reason: 'boss_defeated',
      title: `${definition?.name || 'O chefe'} foi derrotado`,
      detail: 'A última canastra encerrou a batalha.',
    };
    state.boss.stats.finalDebt = state.boss.danger;
    await finishGame(0, { skipFinalStrike: true, bossEvent: event });
  } else if (state.boss?.result && !state.finished) {
    await finishGame(state.boss.result.victory ? 0 : 1, { skipFinalStrike: true, bossEvent: event });
  }
  return event;
}

function confirmBossDiscardPickup(playerId) {
  const surcharge = getBossDiscardSurcharge(state);
  if (!surcharge) return { allowed: true, surcharge: null };
  const confirmed = window.confirm(`Agio do Lixo: esta retirada gera Divida +${surcharge.amount}.\n\nConfirmar a retirada?`);
  if (!confirmed) {
    showMessage('Retirada cancelada. Voce ainda pode comprar do monte.');
    return { allowed: false, surcharge: null };
  }
  return { allowed: true, surcharge };
}

async function prepareBossMeldMutation(player, meldIndex, oldKind, newKind, cardsAdded, undoType, selectedCardIds = [], options = {}) {
  const quote = getBossCreditLimitQuote(state, cardsAdded, {
    creditEligibleCardIds: options.creditEligibleCardIds ?? null,
    cardOriginsById: options.cardOriginsById ?? null,
  });
  if (quote?.debt > 0) {
    const confirmed = window.confirm(`Limite de Credito: esta jogada coloca ${quote.newCardIds.length} carta(s) nova(s) na mesa e gera Divida +${quote.debt}.\n\nConfirmar a jogada?`);
    if (!confirmed) {
      showMessage('Jogada cancelada sem alterar cartas ou Divida.');
      return { allowed: false, undoSaved: false, event: null };
    }
  }

  const interdict = Number.isInteger(meldIndex) ? getBossInterdictAttempt(state, player.teamId, meldIndex, oldKind, newKind) : null;
  if (!interdict) return { allowed: true, undoSaved: false, event: null };

  saveStateForUndo(undoType, selectedCardIds);
  const mustObey = getBossChains(state, player.id) >= 4;
  const disobey = !mustObey && window.confirm('Interdito: esta jogada evolui o jogo.\n\nOK: desobedecer, concluir a evolucao e receber +1 Chicote.\nCancelar: obedecer e cancelar somente esta tentativa.');
  const event = resolveBossInterdictAttempt(state, player.id, interdict.id, disobey ? 'disobey' : 'obey');
  if (!event?.allowEvolution) {
    selectedHandIndexes.clear();
    selectedMeldTarget = null;
    showMessage(mustObey ? 'Interdito: com 4 Chicotes, voce deve obedecer. A tentativa foi cancelada.' : 'Interdito obedecido. A tentativa foi cancelada e suas cartas permaneceram na mao.');
    renderAll();
    await commitState();
    return { allowed: false, undoSaved: true, event };
  }
  return { allowed: true, undoSaved: true, event };
}

function processBossDeadReward() {
  return isCurrentBossMode() ? applyBossDeadTaken(state) : null;
}

function confirmBossFinalStrike() {
  if (!isCurrentBossMode()) return true;
  const name = getBossDefinition(state.boss?.id)?.name || 'o chefe';
  return window.confirm(`Finalizar o ataque contra ${name}?\n\nCaso sobreviva, a equipe perderá a batalha.`);
}

function captureUndoUiState(selectedCardIds = null) {
  const hand = currentPlayer()?.hand || [];
  return {
    selectedCardIds: selectedCardIds || [...selectedHandIndexes].map((index) => hand[index]?.id).filter(Boolean),
    selectedMeldTarget,
    movingWild: movingWild ? JSON.parse(JSON.stringify(movingWild)) : null,
    isStealModeActive: !!window.isStealModeActive,
    turnTimerRemaining,
  };
}

function saveStateForUndo(actionType = 'gameAction', selectedCardIds = null) {
  if (!state) return;
  const transaction = createUndoTransaction(state, captureUndoUiState(selectedCardIds), {
    actorPlayerId: myPlayerIndex,
    actionType,
  });
  if (transaction) localUndoStack.push(transaction);
}

function restoreUndoUiState(ui = {}) {
  selectedMeldTarget = ui.selectedMeldTarget || null;
  movingWild = ui.movingWild || null;
  window.isStealModeActive = !!ui.isStealModeActive;
  turnTimerRemaining = Number.isFinite(ui.turnTimerRemaining) ? ui.turnTimerRemaining : turnTimerRemaining;
  selectedHandIndexes.clear();
  const hand = state?.players?.[myPlayerIndex]?.hand || [];
  const wanted = new Set(ui.selectedCardIds || []);
  hand.forEach((card, index) => {
    if (wanted.has(card?.id)) selectedHandIndexes.add(index);
  });
}

window.executeUndo = async () => {
  const transaction = localUndoStack[localUndoStack.length - 1];
  if (!canRestoreUndoTransaction(transaction, state, myPlayerIndex)) {
    showMessage('Esta acao nao pode mais ser desfeita.');
    return;
  }

  localUndoStack.pop();
  const restored = restoreUndoTransaction(transaction);
  const previousState = restored.state;
  const actionToUndo = state.lastAction; // Pega a ação que estamos revertendo

  // 1. Descobrir de onde as cartas vão sair (da mesa) ANTES de reverter o DOM
  let originRect = null;
  let cardsToAnimate = [];

  if (actionToUndo) {
    if (actionToUndo.type === 'meldNew' || actionToUndo.type === 'meldExtend') {
      cardsToAnimate = actionToUndo.cards || [];
      originRect = meldCardsRect(actionToUndo.teamId, actionToUndo.meldIndex);
    } else if (actionToUndo.type === 'meldMoveWild') {
      cardsToAnimate = [actionToUndo.card];
      originRect = meldCardsRect(actionToUndo.teamId, actionToUndo.toMeldIndex); // De onde o coringa vai sair
    } else if (actionToUndo.type === 'stealCard') {
      cardsToAnimate = [actionToUndo.card];
      const fromCardEl = cardElById(actionToUndo.card.id);
      if (fromCardEl) originRect = getRect(fromCardEl); // Sai da sua mão
    }
  }

  // Fallback: se não achar a posição exata da mesa, usa o centro
  if (!originRect) {
    const board = document.querySelector('.board-melds');
    if (board) {
      const br = board.getBoundingClientRect();
      originRect = { left: br.left + br.width / 2, top: br.top + br.height / 2, width: 28, height: 40 };
    }
  }

  // Trava a interface para evitar duplo clique durante o voo
  const playerInterface = document.querySelector('.player-interface');
  if (playerInterface) playerInterface.style.pointerEvents = 'none';

  // 2. Restaura o estado e renderiza a tela (as cartas voltam pra posição original no DOM)
  previousState.lastAction = {
    id: newActionId(),
    type: 'undoMove',
    playerId: myPlayerIndex,
    ts: Date.now(),
  };
  state = previousState;
  restoreUndoUiState(restored.ui);
  ignoreOwnActionId = state.lastAction.id;

  renderAll();

  // 3. Executa a animação de voo reversa
  try {
    if (cardsToAnimate.length > 0 && originRect) {
      const anims = cardsToAnimate.map((c, i) => {
        let toEl = cardElById(c.id); // Acha a carta na mão
        let toRect = null;

        if (actionToUndo.type === 'stealCard') {
          // Se desfez um roubo, a carta volta pro escravo no topo
          toRect = opponentAnchorRect(0);
        } else if (toEl) {
          toRect = getRect(toEl);
        } else if (actionToUndo.type === 'meldMoveWild') {
          // Se foi o coringa movido, a carta não vai pra mão, volta pro jogo de origem
          toRect = meldCardsRect(actionToUndo.teamId, actionToUndo.fromMeldIndex);
        }

        if (!toRect) return Promise.resolve();

        if (toEl) toEl.style.visibility = 'hidden'; // Esconde o elemento original enquanto voa

        // Cria um pequeno espalhamento se forem várias cartas saindo da mesma pilha
        const fromRect = { ...originRect, left: originRect.left + i * 10, top: originRect.top - i * 2 };

        // Voa usando a física já existente do sistema
        return flyRectToRect(c, fromRect, toRect, 'front').then(() => {
          if (toEl) toEl.style.visibility = ''; // Revela a carta no lugar certo
          impactAtRect(toRect);
        });
      });
      await Promise.all(anims);
    }
  } finally {
    if (playerInterface) playerInterface.style.pointerEvents = '';
  }

  // Libera a interface e salva no Firebase
  resetTurnTimer();
  await commitState();
  showMessage('🔄 Jogada desfeita!');
};

// --- CONTROLE DO ACORDEÃO DE METAS ---
window.isGoalsHudCollapsed = false;
window.toggleGoalsHud = function () {
  window.isGoalsHudCollapsed = !window.isGoalsHudCollapsed;
  const hud = document.getElementById('goalsHud');
  if (hud) {
    hud.classList.toggle('collapsed', window.isGoalsHudCollapsed);
  }
};

window.isAsasDetailsExpanded = false;
window.toggleAsasDetails = function (event) {
  if (event) event.stopPropagation(); // Evita conflito caso clique propague
  window.isAsasDetailsExpanded = !window.isAsasDetailsExpanded;
  const el = document.getElementById('asasGoalItem');
  if (el) {
    el.classList.toggle('expanded', window.isAsasDetailsExpanded);
  }
};

window.isChuvaDetailsExpanded = false;
window.toggleChuvaDetails = function (event) {
  if (event) event.stopPropagation();
  window.isChuvaDetailsExpanded = !window.isChuvaDetailsExpanded;
  const el = document.getElementById('chuvaGoalItem');
  if (el) {
    el.classList.toggle('expanded', window.isChuvaDetailsExpanded);
  }
};

// --- CONTROLE DE TELA VIVA (WAKE LOCK) ---
let wakeLock = null;
async function keepScreenAlive() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
  }
}
function releaseScreen() {
  if (wakeLock !== null) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
// Se a pessoa minimizar o navegador e voltar, a API derruba a trava. Isso garante que ela reative.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (state && document.getElementById('gameSection').style.display === 'flex') {
      keepScreenAlive();
    }
  }
});

//Para economizar a bateria do celular, precisamos pausar os vídeos ao entrar no jogo e dar o play novamente apenas ao voltar para o lobby

function toggleMenuVideos(play) {
  const videos = [document.getElementById('bgVid1'), document.getElementById('bgVid2'), document.getElementById('bgVid3')];
  videos.forEach((vid) => {
    if (!vid) return;
    if (play) {
      // Apenas o vídeo que estiver com a classe 'active' volta a rodar
      if (vid.classList.contains('active')) vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  });
}

window.getState = () => state;
window.setState = (s) => ((state = s), renderAll());

function buildRankIndex(order) {
  const m = {};
  order.forEach((r, i) => (m[r] = i));
  return m;
}
const IDX_HIGH = buildRankIndex(RANKS_SEQ);
const IDX_LOW = buildRankIndex(RANKS_SEQ_LOW);

function missingRankBetween(a, b) {
  const ah = IDX_HIGH[a],
    bh = IDX_HIGH[b];
  if (ah != null && bh === ah + 2) return RANKS_SEQ[ah + 1];
  const al = IDX_LOW[a],
    bl = IDX_LOW[b];
  if (al != null && bl === al + 2) return RANKS_SEQ_LOW[al + 1];
  return null;
}

function pushWildToEdge(meld, wildIdx) {
  const wild = meld[wildIdx];
  let cand = meld.slice();
  cand.splice(wildIdx, 1);
  cand.push(wild);
  if (isValidSequenceMeld(cand)) return cand;

  cand = meld.slice();
  cand.splice(wildIdx, 1);
  cand.unshift(wild);
  if (isValidSequenceMeld(cand)) return cand;

  return null;
}

function autoSwapWildWhenFillingGap(meld) {
  if (!meld || meld.length < 4) return false;

  const wIdx = meld.findIndex((c, i) => (c?.joker || c?.rank === '2') && isWildcard(c, meld) && i > 0 && i < meld.length - 1);
  if (wIdx === -1) return false;

  const left = meld[wIdx - 1];
  const right = meld[wIdx + 1];
  if (!left || !right) return false;
  if (left.joker || right.joker) return false;
  if (left.suit !== right.suit) return false;

  const needed = missingRankBetween(left.rank, right.rank);
  if (!needed) return false;

  const naturalIdx = meld.findIndex((c, i) => i !== wIdx && !c.joker && c.rank === needed && c.suit === left.suit);
  if (naturalIdx === -1) return false;

  const wild = meld[wIdx];
  const natural = meld[naturalIdx];

  if (!wild.joker && wild.rank === '2') wild.forceWild = true;

  meld[wIdx] = natural;
  meld.splice(naturalIdx, 1);

  const insertAt = naturalIdx < wIdx ? wIdx - 1 : wIdx;
  meld.splice(insertAt, 0, wild);

  const pushed = pushWildToEdge(meld, meld.indexOf(wild));
  if (pushed) meld.splice(0, meld.length, ...pushed);

  showMessage('🔄 Coringa deslocado automaticamente para a ponta.');
  return true;
}

function applyViewTeamClass() {
  document.body.classList.remove('view-team0', 'view-team1');
  if (!state?.players?.length) return;
  const me = state.players[myPlayerIndex];
  if (!me) return;
  document.body.classList.add(me.teamId === 0 ? 'view-team0' : 'view-team1');
}

let audioUnlocked = false;
let audioCtx = null;
let tableAmbientAudio = null;
let tableAmbientTheme = null;
let tableAmbientFadeId = 0;
let tableAmbientEnabled = (() => {
  try {
    return localStorage.getItem(TABLE_AMBIENT_STORAGE_KEY) !== 'false';
  } catch (e) {
    return true;
  }
})();

function updateAmbientMusicToggle() {
  const btn = document.getElementById('ambientMusicToggle');
  const icon = document.getElementById('ambientMusicIcon');
  if (!btn || !icon) return;

  btn.classList.toggle('muted', !tableAmbientEnabled);
  icon.innerHTML = tableAmbientEnabled ? '&#128266;' : '&#128263;';
  const label = tableAmbientEnabled ? 'Desligar música da mesa' : 'Ligar música da mesa';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-pressed', String(tableAmbientEnabled));
}

function setTableAmbientEnabled(enabled, persist = true) {
  tableAmbientEnabled = enabled !== false;
  if (persist) {
    try {
      localStorage.setItem(TABLE_AMBIENT_STORAGE_KEY, String(tableAmbientEnabled));
    } catch (e) {}
  }
  updateAmbientMusicToggle();
  if (tableAmbientEnabled) syncTableAmbientMusic();
  else stopTableAmbientMusic(false);
}

function toggleTableAmbientMusic() {
  if (!audioUnlocked) unlockAudio();
  setTableAmbientEnabled(!tableAmbientEnabled);
}

function getSafeAmbientVolume(theme) {
  const cfg = TABLE_AMBIENT_MUSIC[normalizeTableTheme(theme)] || TABLE_AMBIENT_MUSIC.feltro;
  const requested = Number(cfg.volume) || 0.1;
  // Mantém a música sempre bem abaixo dos efeitos mais baixos da mesa.
  return Math.min(requested, TABLE_AMBIENT_MAX_VOLUME, sfxCardMove.volume * 0.7);
}

function fadeTableAmbientTo(targetVolume, duration = 850, onDone = null) {
  if (!tableAmbientAudio) return;
  const audio = tableAmbientAudio;
  const fadeId = ++tableAmbientFadeId;
  const startVolume = clampMediaVolume(audio.volume);
  const safeTarget = clampMediaVolume(Math.min(targetVolume, TABLE_AMBIENT_MAX_VOLUME));
  const startedAt = performance.now();

  function step(now) {
    if (fadeId !== tableAmbientFadeId || audio !== tableAmbientAudio) return;
    const progress = duration <= 0 ? 1 : Math.min(1, (now - startedAt) / duration);
    audio.volume = clampMediaVolume(startVolume + (safeTarget - startVolume) * progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else if (typeof onDone === 'function') {
      onDone(audio);
    }
  }

  requestAnimationFrame(step);
}

function stopTableAmbientMusic(immediate = false) {
  if (!tableAmbientAudio) return;
  const audio = tableAmbientAudio;

  const finish = (a) => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) {}
  };

  if (immediate) {
    tableAmbientFadeId++;
    finish(audio);
    tableAmbientAudio = null;
    tableAmbientTheme = null;
    return;
  }

  fadeTableAmbientTo(0, 650, (a) => {
    finish(a);
    if (tableAmbientAudio === a) {
      tableAmbientAudio = null;
      tableAmbientTheme = null;
    }
  });
}

function syncTableAmbientMusic() {
  const gameSection = document.getElementById('gameSection');
  const gameVisible = !!gameSection && gameSection.style.display === 'flex';
  const shouldPlay = tableAmbientEnabled && audioUnlocked && state && !window.isClosingGame && gameVisible && document.visibilityState !== 'hidden';

  if (!shouldPlay) {
    stopTableAmbientMusic(false);
    return;
  }

  const theme = normalizeTableTheme(state.tableTheme || document.body.dataset.tableTheme || 'feltro');
  const cfg = TABLE_AMBIENT_MUSIC[theme];
  const targetVolume = getSafeAmbientVolume(theme);

  if (!tableAmbientAudio || tableAmbientTheme !== theme) {
    stopTableAmbientMusic(true);
    tableAmbientTheme = theme;
    tableAmbientAudio = new Audio(cfg.src);
    tableAmbientAudio.addEventListener('error', () => {
      console.warn('[ambient] Música ambiente não encontrada ou não carregou:', cfg.src);
    });
    tableAmbientAudio.preload = 'auto';
    tableAmbientAudio.loop = true;
    tableAmbientAudio.volume = clampMediaVolume(0);
    tableAmbientAudio
      .play()
      .then(() => {
        fadeTableAmbientTo(targetVolume, 1000);
      })
      .catch(() => {});
    return;
  }

  tableAmbientAudio.loop = true;
  if (tableAmbientAudio.paused) tableAmbientAudio.play().catch(() => {});
  if (Math.abs(tableAmbientAudio.volume - targetVolume) > 0.01) {
    fadeTableAmbientTo(targetVolume, 500);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') stopTableAmbientMusic(false);
  else syncTableAmbientMusic();
});

function playCardMove() {
  if (!audioUnlocked) return;
  try {
    playSfxClone(sfxCardMove);
  } catch (e) {}
}

function syncHeartbeatAudio(active) {
  if (active && audioUnlocked) {
    if (sfxHeartbeat.paused) sfxHeartbeat.play().catch((error) => console.log('Erro ao tocar som do coracao:', error));

    if (tableAmbientAudio && state) {
      const theme = normalizeTableTheme(state.tableTheme || document.body.dataset.tableTheme || 'feltro');
      fadeTableAmbientTo(getSafeAmbientVolume(theme) * 0.45, 280);
    }
    return;
  }

  sfxHeartbeat.pause();
  sfxHeartbeat.currentTime = 0;
  if (state && !window.isClosingGame) syncTableAmbientMusic();
}

Object.values(CANASTRA_SFX).forEach((a) => {
  a.preload = 'auto';
  a.volume = 0.9;
});

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  } catch (e) {}

  // Injeta o novo som de coração na lista global para garantir que o navegador libere o autoplay
  const bossAudios = Object.values(BOSS_SFX).flatMap((sounds) => Object.values(sounds));
  const allAudios = [...Object.values(CANASTRA_SFX), ...bossAudios, sfxCardMove, sfxMyTurn, sfxSteal, sfxHeartbeat];
  for (const a of allAudios) {
    try {
      a.pause();
      a.currentTime = 0;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
        })
        .catch(() => {});
    } catch (e) {}
  }

  syncTableAmbientMusic();
}

function isMovableTwoOrJoker(card) {
  if (!card) return false;
  return !!card.joker || card.rank === '2';
}

function meldKey(teamId, meldIdx) {
  return `${teamId}:${meldIdx}`;
}

function parseMeldKey(key) {
  if (!key) return null;
  const [t, m] = key.split(':');
  const teamId = parseInt(t, 10);
  const meldIdx = parseInt(m, 10);
  if (Number.isNaN(teamId) || Number.isNaN(meldIdx)) return null;
  return { teamId, meldIdx };
}

function miniCardElByMeld(teamId, meldIdx, cardIdx) {
  const key = meldKey(teamId, meldIdx);
  return document.querySelector(`.meld-line[data-meld-key="${key}"] .carta.mini[data-card-index="${cardIdx}"]`);
}

function meldCardsRect(teamId, meldIdx) {
  const key = meldKey(teamId, meldIdx);
  const meldEl = document.querySelector(`.meld-line[data-meld-key="${key}"]`);
  const row = meldEl ? meldEl.querySelector('.meld-line-cards') : null;
  const r = row ? row.getBoundingClientRect() : null;
  if (!r) return null;
  return { left: r.left + r.width * 0.5 - 14, top: r.top + 4, width: 28, height: 40 };
}

function clearMovingWild(msg = null) {
  movingWild = null;
  if (msg) showMessage(msg);
  renderMelds();
  renderAll();
}

function pickWildFromMeld(teamId, meldIdx, cardIdx) {
  if (!state || state.finished) return;
  if (!canPerformCommonGameAction(state)) {
    showPendingBossChoiceMessage();
    return;
  }

  const myTurn = state.currentPlayer === myPlayerIndex;
  if (!myTurn || !state.hasDrawnThisTurn) {
    showMessage('⚠️ Ação bloqueada: Compre uma carta antes de mexer na mesa.');
    return;
  }

  const me = state.players[myPlayerIndex];
  if (teamId !== me.teamId) {
    showMessage('❌ Acesso negado: Você não pode alterar os jogos do adversário.');
    return;
  }

  const meld = state.teams?.[teamId]?.melds?.[meldIdx];
  if (!meld || !meld[cardIdx]) return;

  const card = meld[cardIdx];
  if (!isMovableTwoOrJoker(card)) {
    showMessage('⚠️ Movimento inválido: Apenas Coringas (2 ou Joker) podem ser movidos.');
    return;
  }

  const isTrapped = cardIdx > 0 && cardIdx < meld.length - 1;
  if (isTrapped) {
    showMessage('❌ Coringa preso: A carta está conectando o jogo e não pode ser retirada.');
    return;
  }

  if (movingWild && movingWild.fromTeamId === teamId && movingWild.fromMeldIndex === meldIdx && movingWild.fromCardIndex === cardIdx) {
    clearMovingWild('Movimento cancelado.');
    return;
  }

  ensureCardId(card);
  movingWild = { fromTeamId: teamId, fromMeldIndex: meldIdx, fromCardIndex: cardIdx, card: packCard(card) };
  showMessage('Clique em "Mover 2/Joker". (Selecionar destino é opcional)');
  renderMelds();
  renderAll();
}

async function movePickedWildToSelectedMeld() {
  if (!state || state.finished) return;
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn) {
    showMessage('Compre primeiro.');
    return;
  }
  if (!movingWild) {
    showMessage('Clique num 2/JOKER no jogo pra selecionar.');
    return;
  }

  const me = state.players[myPlayerIndex];
  const myTeamId = me.teamId;
  const destParsed = parseMeldKey(selectedMeldTarget) || { teamId: movingWild.fromTeamId, meldIdx: movingWild.fromMeldIndex };

  if (!destParsed || destParsed.teamId !== myTeamId) {
    showMessage('Selecione um jogo DESTINO do seu time.');
    return;
  }

  const { teamId: toTeamId, meldIdx: toMeldIdx } = destParsed;
  const fromTeamId = movingWild.fromTeamId;
  const fromMeldIdx = movingWild.fromMeldIndex;
  const fromCardIdx = movingWild.fromCardIndex;

  if (fromTeamId !== myTeamId) {
    showMessage('Origem não é do seu time (bug de seleção).');
    clearMovingWild();
    return;
  }

  const team = state.teams[myTeamId];
  const fromMeld = team?.melds?.[fromMeldIdx];
  const toMeld = team?.melds?.[toMeldIdx];

  if (!fromMeld || !toMeld) {
    showMessage('Jogo origem/destino inválido.');
    clearMovingWild();
    return;
  }

  const rawCard = fromMeld[fromCardIdx];
  if (!rawCard || !isMovableTwoOrJoker(rawCard)) {
    showMessage('Essa carta não existe mais no jogo origem.');
    clearMovingWild();
    return;
  }

  ensureCardId(rawCard);
  const cardId = rawCard.id;
  const actualFromIdx = fromMeld.findIndex((c) => c && c.id === cardId);
  const fromIdx = actualFromIdx >= 0 ? actualFromIdx : fromCardIdx;
  const card = fromMeld[fromIdx];

  const sameMeld = fromMeldIdx === toMeldIdx;
  let fromAfter = fromMeld.slice();
  let toAfter = sameMeld ? fromAfter : toMeld.slice();

  if (sameMeld) {
    const targetIndex = fromIdx === fromMeld.length - 1 ? 0 : fromMeld.length - 1;
    const [moved] = toAfter.splice(fromIdx, 1);
    if (targetIndex === 0) toAfter.unshift(moved);
    else toAfter.push(moved);

    if (toAfter.length < 3) {
      showMessage('Não pode quebrar o jogo (mínimo 3 cartas).');
      return;
    }
  } else {
    fromAfter.splice(fromIdx, 1);
    toAfter.push(card);

    if (fromAfter.length < 3) {
      showMessage('Não pode quebrar o jogo origem (mínimo 3 cartas).');
      return;
    }
    if (!isValidSequenceMeld(fromAfter)) {
      showMessage('Remover isso quebra o jogo origem.');
      return;
    }
  }

  if (!isValidSequenceMeld(toAfter)) {
    showMessage(sameMeld ? 'Mover assim deixa o jogo inválido.' : 'Mover pra esse destino deixa o jogo inválido.');
    return;
  }

  saveStateForUndo('meldMoveWild');

  const fromEl = miniCardElByMeld(myTeamId, fromMeldIdx, fromIdx);
  const fromRect = fromEl ? getRect(fromEl) : meldCardsRect(myTeamId, fromMeldIdx);
  const keyTo = meldKey(myTeamId, toMeldIdx);

  let toRect = null;
  if (sameMeld) {
    const targetIndex = fromIdx === fromMeld.length - 1 ? 0 : fromMeld.length - 1;
    if (targetIndex === 0) {
      const meldEl = meldElByKey(keyTo);
      const row = meldEl ? meldEl.querySelector('.meld-line-cards') : null;
      const r = row ? row.getBoundingClientRect() : null;
      toRect = r ? { left: r.left + 4, top: r.top + 4, width: 28, height: 40 } : meldCardsRect(myTeamId, toMeldIdx);
    } else {
      const baseDrop = meldDropRect(keyTo, 0);
      toRect = baseDrop || meldCardsRect(myTeamId, toMeldIdx);
    }
  } else {
    const baseDrop = meldDropRect(keyTo, 0);
    toRect = baseDrop || meldCardsRect(myTeamId, toMeldIdx);
  }

  if (fromEl) fromEl.style.visibility = 'hidden';
  if (fromRect && toRect) {
    await flyRectToRect(card, fromRect, toRect, 'front');
    impactAtRect(toRect);
  }
  if (fromEl) fromEl.style.visibility = '';

  if (sameMeld) {
    fromMeld.splice(0, fromMeld.length, ...toAfter);
  } else {
    fromMeld.splice(0, fromMeld.length, ...fromAfter);
    toMeld.splice(0, toMeld.length, ...toAfter);
    normalizeMeldOrder(fromMeld);
    normalizeMeldOrder(toMeld);
  }

  const actionCard = packCard(card);
  const actionId = newActionId();

  state.lastAction = {
    id: actionId,
    type: 'meldMoveWild',
    playerId: myPlayerIndex,
    teamId: myTeamId,
    fromMeldIndex: fromMeldIdx,
    toMeldIndex: toMeldIdx,
    card: actionCard,
    ts: Date.now(),
  };
  ignoreOwnActionId = actionId;

  movingWild = null;
  renderAll();
  resetTurnTimer();
  await commitState();
  showMessage('✅ Coringa reposicionado com sucesso.');
}

function playCanastraSfx(kind) {
  if (!audioUnlocked) return;
  const a = CANASTRA_SFX[kind] || CANASTRA_SFX.suja;
  try {
    a.pause();
    a.currentTime = 0;
  } catch (e) {}
  a.play().catch(() => {});
}

function playTone(freq, t0, dur, vol = 0.12, type = 'sine') {
  if (!audioUnlocked || !audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

let canastraMemPrimed = false;
const canastraKindMem = new Map();

function resetCanastraSfxMemory() {
  canastraKindMem.clear();
  canastraMemPrimed = false;
}

function computeMeldKindMap() {
  const m = new Map();
  if (!state?.teams) return m;
  for (const t of state.teams) {
    (t.melds || []).forEach((meld, idx) => {
      m.set(`${t.id}:${idx}`, classifyMeldForUi(meld).kind);
    });
  }
  return m;
}

function syncCanastraSfxFromState() {
  if (!state?.teams) return;
  const curr = computeMeldKindMap();

  if (!canastraMemPrimed) {
    canastraKindMem.clear();
    for (const [k, v] of curr) canastraKindMem.set(k, v);
    canastraMemPrimed = true;
    return;
  }

  for (const [k, kind] of curr) {
    const prev = canastraKindMem.get(k);
    const isCanastra = kind !== 'simple';
    const wasSimple = prev === 'simple';
    const wasMissing = prev == null;
    const changedKind = prev != null && prev !== kind;

    if ((wasSimple && isCanastra) || (wasMissing && isCanastra) || (changedKind && isCanastra)) {
      playCanastraSfx(kind);
    }
    canastraKindMem.set(k, kind);
  }

  for (const key of Array.from(canastraKindMem.keys())) {
    if (!curr.has(key)) canastraKindMem.delete(key);
  }
}

function newActionId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function packCard(c) {
  if (!c) return null;
  ensureCardId(c);
  return { id: c.id, rank: c.rank, suit: c.suit, joker: !!c.joker, back: c.back || 'red' };
}

function ensureCardId(card) {
  if (!card) return null;
  if (!card.id) card.id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return card.id;
}

const ANIM_MS = 900;
const ANIM_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function suitClass(card) {
  return card.joker ? 'joker-card' : card.suit === '♥' || card.suit === '♦' ? 'hearts' : 'spades';
}

function deckFaceClass(card) {
  return card?.back === 'blue' ? 'deck-blue' : 'deck-red';
}

function cardFrontHTML(card) {
  if (!card) return ''; // Retorna vazio se for fantasma
  if (card.joker) {
    return `<div class="carta-canto top joker-label"><span class="card-rank">JOKER</span></div><div class="carta-meio joker-symbol">★</div><div class="carta-canto bottom joker-label"><span class="card-rank">JOKER</span></div>`;
  }
  return `<div class="carta-canto top"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div><div class="carta-meio">${card.suit}</div><div class="carta-canto bottom"><span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span></div>`;
}

function getRect(el) {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function makeFlyEl(card, face = 'front') {
  const el = document.createElement('div');
  el.className = `carta fly-card ${suitClass(card)} ${deckFaceClass(card)}`;
  if (face === 'back') {
    el.classList.add('back');
    el.classList.add(card.back === 'blue' ? 'back-blue' : 'back-red');
  }
  el.innerHTML = cardFrontHTML(card);
  document.body.appendChild(el);
  return el;
}

function setBox(el, rect) {
  el.style.left = rect.left + 'px';
  el.style.top = rect.top + 'px';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
}

async function flyRectToRect(card, fromRect, toRect, face = 'front') {
  playCardMove();
  const fly = makeFlyEl(card, face);

  // Desativa a transição do CSS que faz a carta pular
  fly.style.transition = 'none';

  // TRAVA O TAMANHO BASE: Mantém 60x90 para as fontes e ícones não explodirem
  const NATIVE_W = 60;
  const NATIVE_H = 90;

  fly.style.left = fromRect.left + 'px';
  fly.style.top = fromRect.top + 'px';
  fly.style.width = NATIVE_W + 'px';
  fly.style.height = NATIVE_H + 'px';

  // Escala matemática: a carta encolhe ou cresce sem deformar o conteúdo interno
  const startScaleX = fromRect.width / NATIVE_W;
  const startScaleY = fromRect.height / NATIVE_H;
  const endScaleX = toRect.width / NATIVE_W;
  const endScaleY = toRect.height / NATIVE_H;

  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  const anim = fly.animate(
    [
      { transform: `translate(0px, 0px) scale(${startScaleX}, ${startScaleY})`, opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScaleX}, ${endScaleY})`, opacity: 1 },
    ],
    { duration: ANIM_MS, easing: ANIM_EASE, fill: 'forwards' },
  );
  try {
    await anim.finished;
  } finally {
    fly.remove();
  }
}

function impactSparksAt(x, y, opts = {}) {
  const particles = opts.particles ?? 10;
  const dist = opts.dist ?? 32;
  const dur = opts.dur ?? 320;

  const ring = document.createElement('div');
  ring.className = 'impact-ring';
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  document.body.appendChild(ring);

  ring
    .animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.15)', opacity: 0.95 },
        { transform: 'translate(-50%, -50%) scale(1.25)', opacity: 0.0 },
      ],
      { duration: dur, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' },
    )
    .finished.catch(() => {})
    .finally(() => ring.remove());

  for (let i = 0; i < particles; i++) {
    const sp = document.createElement('div');
    sp.className = 'spark';
    sp.style.left = x + 'px';
    sp.style.top = y + 'px';
    document.body.appendChild(sp);

    const ang = Math.random() * Math.PI * 2;
    const d = dist * (0.55 + Math.random() * 0.75);
    const dx = Math.cos(ang) * d;
    const dy = Math.sin(ang) * d;
    const rot = Math.random() * 160 - 80;

    sp.animate(
      [
        { transform: `translate(-50%, -50%) rotate(${rot}deg) translate(0px,0px)`, opacity: 1 },
        { transform: `translate(-50%, -50%) rotate(${rot}deg) translate(${dx}px,${dy}px)`, opacity: 0 },
      ],
      { duration: dur, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' },
    )
      .finished.catch(() => {})
      .finally(() => sp.remove());
  }
}

function impactAtRect(toRect) {
  if (!toRect) return;
  const x = toRect.left + toRect.width / 2;
  const y = toRect.top + toRect.height / 2;
  impactSparksAt(x, y, { particles: 10, dist: 34, dur: 320 });
}

function cardElById(cardId) {
  return document.querySelector(`#handContainer .carta[data-card-id="${cardId}"]`);
}
function meldElByKey(key) {
  return document.querySelector(`.meld-line[data-meld-key="${key}"]`);
}

function meldDropRect(key, offset = 0) {
  const meldEl = meldElByKey(key);
  const row = meldEl ? meldEl.querySelector('.meld-line-cards') : null;
  const r = row ? row.getBoundingClientRect() : null;
  if (!r) return null;
  return { left: r.left + r.width - 28 - offset, top: r.top, width: 28, height: 40 };
}

function updateTimerLabel() {
  const el = document.getElementById('turnTimerLabel');
  if (!el) return;
  if (!state || state.finished) {
    el.textContent = '';
    el.classList.remove('timer-critical');
    return;
  }

  if (!canPerformCommonGameAction(state)) {
    el.classList.remove('timer-critical');
    el.textContent = hasPendingBossChoices(state) ? 'PAUSADO · ESCOLHA' : 'TURNO DO CHEFE';
    return;
  }

  if (turnTimerRemaining <= 10) {
    el.classList.add('timer-critical');
    el.textContent = `⏳ ${turnTimerRemaining}s`;
  } else {
    el.classList.remove('timer-critical');
    el.textContent = `${turnTimerRemaining}s`;
    el.style.color = '#facc15';
  }
}

function stopTurnTimer() {
  if (turnTimerId !== null) {
    clearInterval(turnTimerId);
    turnTimerId = null;
  }
}

function resetTurnTimer() {
  if (state && hasPendingBossChoices(state)) {
    stopTurnTimer();
    updateTimerLabel();
    return;
  }
  if (turnTimerId !== null) {
    turnTimerRemaining = 60;
    updateTimerLabel();
  }
}

let committing = false;
let pendingCommit = false;

async function commitState() {
  if (!state || window.isClosingGame) return;

  // Gatilho Universal de Reciclagem (Travado se o jogo já acabou)
  if (state.stock && state.stock.length === 0 && !state.finished && !window.isClosingGame) {
    const hasDead = state.deadPiles && state.deadPiles.some((p) => p && p.length > 0);
    if (hasDead) {
      await recycleDeadToStockIfPossible();
    }
  }

  // 🛑 CARIMBADOR DE ANIMAÇÃO: Gruda a animação de reposição na jogada que o usuário/bot acabou de fazer
  if (state._pendingRecycleSync !== undefined && state.lastAction) {
    state.lastAction.autoRecycledIndex = state._pendingRecycleSync;
    delete state._pendingRecycleSync;
  }

  pendingCommit = true;
  if (committing) return;

  committing = true;
  try {
    while (pendingCommit) {
      if (!state || window.isClosingGame) {
        pendingCommit = false;
        break;
      }
      pendingCommit = false;
      await updateDoc(gameRef, { stateJson: JSON.stringify(state), updatedAt: Date.now() });
    }
  } catch (err) {
    console.error('commitState failed:', err);
  } finally {
    committing = false;
  }
}

function passTurn({ preserveUndo = false } = {}) {
  if (!canPerformCommonGameAction(state)) {
    if (hasPendingBossChoices(state)) showPendingBossChoiceMessage();
    return false;
  }
  if (!preserveUndo) localUndoStack = [];
  state.powerActiveThisTurn = false; // Desativa o poder do Dominador ao fim do turno
  window.isStealModeActive = false; // Força fechar a visão
  if (isCurrentBossMode()) {
    state._pendingBossEvent = completeBossPlayerTurn(state, state.currentPlayer);
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
    if (state.boss?.result) {
      state.finished = true;
      state.winnerTeamId = state.boss.result.victory ? 0 : 1;
    }
  } else if (state.mode === '1x1_duploMorto' || state.mode === '1x1_dominacao' || state.mode === '1x1') {
    state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  } else {
    // Roda sequencial limpo para 1x2 (3 jogadores: 0 -> 1 -> 2) e 2x2 (4 jogadores: 0 -> 1 -> 2 -> 3)
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }
  state.turnNumber = (state.turnNumber || 0) + 1;
  state.hasDrawnThisTurn = false;
  state.partialDraw = false; // Zera a puxada parcial
  state.boughtCardIds = []; // Limpa os brilhos
  state.requiredDiscardCard = null;
  state.pickedDiscardCardId = null;
  return true;
}

async function autoPlayTimeout() {
  if (!canPerformCommonGameAction(state)) {
    window.isAutoPlaying = false;
    if (hasPendingBossChoices(state)) showPendingBossChoiceMessage();
    return;
  }
  if (isBossLabAutomationPaused()) {
    window.isAutoPlaying = false;
    return;
  }
  if (!ensureMyTurn()) return;

  let actionDraw = null;

  if (!state.hasDrawnThisTurn) {
    // 🛑 AWAIT INJETADO: Agora o relógio espera o morto virar monte antes de forçar a compra
    if (!state.stock.length) await recycleDeadToStockIfPossible();

    const fromStockEl = document.querySelector('#drawStockBtn .pile-card');
    const fromStockRect = fromStockEl ? getRect(fromStockEl) : null;
    const discardAreaEl = document.querySelector('#drawDiscardBtn .pile-card');
    const discardRect = discardAreaEl ? getRect(discardAreaEl) : null;

    if (state.stock.length) {
      const c = state.stock.pop();
      ensureCardId(c);
      const me = currentPlayer();
      me.hand.push(c);
      sortHand(me.hand);
      state.hasDrawnThisTurn = true;

      renderHand();

      const toEl = cardElById(c.id);
      if (fromStockRect && toEl) {
        const toRect = getRect(toEl);
        toEl.style.visibility = 'hidden';
        await flyRectToRect(c, fromStockRect, toRect, 'back');
        if (toEl) toEl.style.visibility = '';
      }

      actionDraw = { id: newActionId(), type: 'drawStock', playerId: state.currentPlayer, card: packCard(c), ts: Date.now() };
    } else if (state.discard.length && state.variant === 'aberto') {
      const top = state.discard[state.discard.length - 1];
      const pile = state.discard.splice(0, state.discard.length);
      pile.forEach(ensureCardId);
      const me = currentPlayer();
      me.hand.push(...pile);
      sortHand(me.hand);
      state.hasDrawnThisTurn = true;
      state.pickedDiscardCardId = top.id;

      renderHand();

      const toEl = cardElById(top.id);
      if (discardRect && toEl) {
        const toRect = getRect(toEl);
        toEl.style.visibility = 'hidden';
        await flyRectToRect(top, discardRect, toRect, 'front');
        if (toEl) toEl.style.visibility = '';
      }

      actionDraw = { id: newActionId(), type: 'drawDiscard', playerId: state.currentPlayer, card: packCard(top), ts: Date.now() };
    }
  }

  if (actionDraw) {
    state.lastAction = actionDraw;
    ignoreOwnActionId = actionDraw.id;
    await commitState();
    await new Promise((r) => setTimeout(r, 600));
  }

  // Puxa o estado MAIS FRESCO possível caso o Firebase tenha atualizado na linha de cima
  const me = state.players[state.currentPlayer];
  const hand = me.hand;
  if (!hand.length) {
    await commitState();
    return;
  }

  let validIndexes = [];
  for (let i = 0; i < hand.length; i++) {
    if (hand[i] && state.pickedDiscardCardId !== hand[i].id) {
      validIndexes.push(i);
    }
  }
  if (validIndexes.length === 0) validIndexes = [0];

  const idxToPick = validIndexes[Math.floor(Math.random() * validIndexes.length)];
  const card = hand[idxToPick];
  ensureCardId(card);

  const fromEl = cardElById(card.id);
  const toEl = document.querySelector('#drawDiscardBtn .pile-card');
  if (fromEl && toEl) {
    const fromRect = getRect(fromEl);
    const toRect = getRect(toEl);
    fromEl.style.visibility = 'hidden';
    await flyRectToRect(card, fromRect, toRect, 'front');
    if (fromEl) fromEl.style.visibility = '';
  }

  // Mutação segura no Array blindado
  const actualIdx = hand.findIndex((c) => c.id === card.id);
  if (actualIdx !== -1) hand.splice(actualIdx, 1);
  state.discard.push(card);

  let tookDead = null;
  if (hand.length === 0) tookDead = takeDeadIfAvailableForPlayer(me);

  if (hand.length === 0 && !canTeamTakeDeadNow(me.teamId)) {
    if (teamHasGoodCanastra(me.teamId)) {
      await finishGame(me.teamId);
    } else {
      showMessage('Batida falsa automática! Oponente vence.');
      await finishGame(me.teamId === 0 ? 1 : 0);
    }
    return;
  }

  passTurn();

  state.lastAction = {
    id: newActionId(),
    type: 'discard',
    playerId: myPlayerIndex,
    card: packCard(card),
    tookDead,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  showMessage('⚠️ Tempo esgotado! Jogada automática executada.');
  renderAll();
  await commitState();
}

function classifyMeldForUi(meld) {
  if (!meld) return { kind: 'simple', base: 'Jogo', tag: null };
  meld = meld.filter((c) => c != null); // Limpa a sujeira do Firebase
  if (meld.length < 7) return { kind: 'simple', base: 'Jogo', tag: null };

  const hasWild = meld.some((c) => c.joker || isWildcard(c, meld));
  const realCards = meld.filter((c) => !c.joker && !isWildcard(c, meld));
  if (!realCards.length) return { kind: 'simple', base: 'Jogo', tag: null };

  const sameSuit = realCards.every((c) => c.suit === realCards[0].suit);

  const orderLow = {};
  RANKS_SEQ_LOW.forEach((r, i) => (orderLow[r] = i));
  const orderHigh = {};
  RANKS_SEQ.forEach((r, i) => (orderHigh[r] = i));

  const ranks = realCards.map((c) => c.rank);
  const aceCount = ranks.filter((r) => r === 'A').length;
  const hasKing = ranks.includes('K');

  function isContiguous(order) {
    const idxs = [...new Set(ranks.map((r) => order[r]).filter((v) => v != null))].sort((a, b) => a - b);
    if (idxs.length < 2) return true;
    for (let i = 1; i < idxs.length; i++) if (idxs[i] !== idxs[i - 1] + 1) return false;
    return true;
  }

  const contiguousLow = sameSuit && isContiguous(orderLow);
  const contiguousHigh = sameSuit && isContiguous(orderHigh);
  const isSeq = isValidSequenceMeld(meld);

  if (hasWild) return { kind: 'suja', base: 'Canastra', tag: { cls: 'suja', text: 'Suja' } };
  if (!isSeq) return { kind: 'simple', base: 'Jogo', tag: null };

  const need = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const isAsAs = aceCount >= 2 && hasKing && need.every((r) => ranks.includes(r));
  if (isAsAs) return { kind: 'asas', base: 'C. Ás-Ás', tag: { cls: 'asas', text: 'Ás-Ás' } };

  const needReal = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const isReal = !hasWild && sameSuit && needReal.every((r) => ranks.includes(r)) && realCards.length === 13;
  if (isReal) return { kind: 'real', base: 'C. Real', tag: { cls: 'real', text: 'Real' } };

  return { kind: 'limpa', base: 'Canastra', tag: { cls: 'limpa', text: 'Limpa' } };
}

// Classifica uma jogada futura do mesmo modo que o jogo real ficará depois
// de otimizar o 2 natural/coringa. Sem isso, o preview podia enxergar o 2
// como coringa, ignorar uma evolução Limpa -> Real e deixar o Interdito
// ser cancelado somente depois que a canastra já havia evoluído.
function classifyMeldPreview(meld) {
  const preview = (meld || []).filter(Boolean).map((card) => ({ ...card }));

  optimizeMeld(preview);
  normalizeMeldOrder(preview);
  autoSwapWildWhenFillingGap(preview);
  optimizeMeld(preview);
  normalizeMeldOrder(preview);

  return classifyMeldForUi(preview);
}

let activeTurnNumber = -1;
function startTurnTimerIfNeeded() {
  if (!state || state.finished) {
    stopTurnTimer();
    updateTimerLabel();
    activeTurnNumber = -1;
    return;
  }

  if (isBossLabAutomationPaused()) {
    stopTurnTimer();
    activeTurnNumber = -1;
    updateTimerLabel();
    return;
  }

  if (!canPerformCommonGameAction(state)) {
    stopTurnTimer();
    activeTurnNumber = -1;
    updateTimerLabel();
    return;
  }

  if (activeTurnNumber === state.turnNumber && turnTimerId !== null) return;

  stopTurnTimer();
  activeTurnNumber = state.turnNumber;
  turnTimerRemaining = 60;
  updateTimerLabel();

  turnTimerId = setInterval(() => {
    if (window.isAutoPlaying || (state && state.debugPaused) || isBossLabAutomationPaused()) return; // Congela o relógio se o debug exigir

    if (!canPerformCommonGameAction(state)) return;
    turnTimerRemaining--;

    if (turnTimerRemaining <= 0) {
      stopTurnTimer();
      if (state.currentPlayer === myPlayerIndex) {
        // TRAVA DE 2.5s PARA EVITAR RACE CONDITION (DUPLO DESCARTE)
        window.isAutoPlaying = true;
        showMessage('Tempo esgotado. Processando Auto-play...');
        document.querySelector('.player-interface').style.pointerEvents = 'none';
        document.querySelector('.board-middle').style.pointerEvents = 'none';

        setTimeout(() => {
          if (!canPerformCommonGameAction(state)) {
            window.isAutoPlaying = false;
            renderAll();
            return;
          }
          // Checa se ainda é a vez dele depois do delay (pode ter jogado no milissegundo final)
          if (!state.finished && state.currentPlayer === myPlayerIndex) {
            autoPlayTimeout().catch(console.error);
          } else {
            window.isAutoPlaying = false;
            renderAll(); // Restaura a UI
          }
        }, 2500);
      }
    } else {
      updateTimerLabel();
      if (turnTimerRemaining <= 10 && state.currentPlayer === myPlayerIndex) {
        // Aumentei o volume de 0.05 para 0.25 (5x mais alto)
        if (audioCtx && audioCtx.state === 'running') playTone(880, audioCtx.currentTime, 0.1, 0.25, 'sine');
        else if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      }
    }
  }, 1000);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function recycleDeadToStockIfPossible() {
  if (!state || state.stock.length > 0) return null;
  if (!state.deadPiles || !state.deadPiles.length) return null;

  const idx = state.deadPiles.findIndex((pile) => pile && pile.length);
  if (idx === -1) return null;

  // Força a tela a mostrar o monte vazio com a borda tracejada
  renderAll();
  showMessage('⚠️ O Monte esgotou! Preparando o Morto...');

  // Congela a mesa para o suspense
  const pi = document.querySelector('.player-interface');
  const bm = document.querySelector('.board-middle');
  if (pi) pi.style.pointerEvents = 'none';
  if (bm) bm.style.pointerEvents = 'none';

  await new Promise((r) => setTimeout(r, 2000));

  const collected = state.deadPiles[idx];
  state.deadPiles[idx] = [];
  shuffle(collected);
  state.stock = collected;

  // Animação do Morto subindo
  const fromEl = document.getElementById(idx === 0 ? 'mortoSlot0' : 'mortoSlot1');
  const toEl = document.querySelector('#drawStockBtn .pile-card');
  if (fromEl && toEl) {
    const fakeCard = { rank: '★', suit: '★', joker: true, id: `recycle_${Date.now()}`, back: 'red' };
    fromEl.style.opacity = '0'; // Esconde a pilha original na hora do voo
    await flyRectToRect(fakeCard, getRect(fromEl), getRect(toEl), 'back');
    impactAtRect(getRect(toEl));
  }

  showMessage('🔄 O Morto virou o novo Monte!');
  if (pi) pi.style.pointerEvents = 'auto';
  if (bm) bm.style.pointerEvents = 'auto';
  renderAll();
  state._pendingRecycleSync = idx; // 🛑 RASTREADOR: Avisa o Firebase que o morto voou pro monte
  return idx;
}

async function animateDeadToHandLocal(deadIndex) {
  const fromSlot = document.getElementById(deadIndex === 0 ? 'mortoSlot0' : 'mortoSlot1');
  const handArea = document.getElementById('handContainer');
  if (fromSlot && handArea) {
    const fr = fromSlot.getBoundingClientRect();
    const hr = handArea.getBoundingClientRect();
    const fakeCard = { rank: '★', suit: '★', joker: true, id: `dead_${Date.now()}`, back: 'red' };
    const fromRect = { left: fr.left, top: fr.top, width: fr.width, height: fr.height };
    const toRect = { left: hr.left + hr.width * 0.5 - 30, top: hr.top + 10, width: 60, height: 90 };
    fromSlot.style.opacity = '0'; // Esconde a pilha original na hora do voo
    await flyRectToRect(fakeCard, fromRect, toRect, 'back');
    impactAtRect(toRect);
  }
}

function cardLabel(card) {
  if (card.joker) return 'JOKER';
  return card.rank + card.suit;
}

function isWildcard(card, meld = null) {
  if (!card) return false; // Escudo Anti-Ghost
  if (card.joker) return true;
  if (card.forceNatural) return false;
  if (card.forceWild) return true;
  if (card.rank === '2' || card.rank === 2) return true;
  return false;
}

function optimizeMeld(meld) {
  if (!Array.isArray(meld) || !meld.length) return;

  // limpa cartas inválidas sem quebrar a partida
  for (let i = meld.length - 1; i >= 0; i--) {
    if (!meld[i]) {
      console.warn('[optimizeMeld] carta inválida removida do meld:', i, meld);
      meld.splice(i, 1);
    }
  }

  if (!meld.length) return;

  meld.forEach((c) => {
    if (!c) return;
    if (!c.joker && (c.rank === '2' || c.rank === 2)) {
      c.forceWild = false;
      c.forceNatural = false;
    }
  });

  const realCards = meld.filter((c) => c && !c.joker && c.rank !== '2' && c.rank !== 2);
  if (!realCards.length) return;

  const suit = realCards[0]?.suit;
  if (!suit) return;

  const twos = meld.filter((c) => c && !c.joker && (c.rank === '2' || c.rank === 2) && c.suit === suit);
  if (twos.length === 1) {
    const two = twos[0];
    two.forceNatural = true;
    if (isValidSequenceMeld(meld)) return;
    two.forceNatural = false;
    two.forceWild = true;
  }
}

function cardBasePoints(card) {
  if (!card) return 0; // Escudo Anti-Ghost
  if (card.joker) return 20;
  if (card.rank === 'A') return 15;
  if (['3', '4', '5', '6', '7'].includes(card.rank)) return 5;
  return 10;
}

function hasRealWild(meld) {
  return meld.some((c) => isWildcard(c, meld));
}

function sortHand(hand) {
  const rankOrder = {};
  RANKS_SEQ.forEach((r, idx) => (rankOrder[r] = idx));
  hand.sort((a, b) => {
    if (a.joker && !b.joker) return 1;
    if (!a.joker && b.joker) return -1;
    if (a.suit === b.suit) return rankOrder[a.rank] - rankOrder[b.rank];
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

async function startGame(mode, names, variant, pixKeys = []) {
  activateGameSession();
  const effectiveVariant = normalizeVariantForMode(mode, variant);
  const players = [];
  const teams = [];
  let playerConfigs = [];
  if (mode === '1x1' || mode === '1x1_duploMorto' || mode === '1x1_dominacao') {
    playerConfigs = [
      { name: names[0] || 'J1', team: 0 },
      { name: names[1] || 'J2', team: 1 },
    ];
  } else if (mode === '2x2') {
    playerConfigs = [
      { name: names[0] || 'J1', team: 0 },
      { name: names[1] || 'J2', team: 1 },
      { name: names[2] || 'J3', team: 0 },
      { name: names[3] || 'J4', team: 1 },
    ];
  } else if (mode === '1x2') {
    playerConfigs = [
      { name: names[0] || 'Solo', team: 0 },
      { name: names[1] || 'D1', team: 1 },
      { name: names[2] || 'D2', team: 1 },
    ];
  } else if (mode === '1x3') {
    playerConfigs = [
      { name: names[0] || 'Solo', team: 0 },
      { name: names[1] || 'T1', team: 1 },
      { name: names[2] || 'T2', team: 1 },
      { name: names[3] || 'T3', team: 1 },
    ];
  } else if (isBossMode(mode)) {
    playerConfigs = [
      { name: names[0] || 'Agente 1', team: 0 },
      { name: names[1] || 'Agente 2', team: 0 },
    ];
  }
  playerConfigs.forEach((cfg, idx) => {
    players.push({ id: idx, name: cfg.name, teamId: cfg.team, hand: [] });
  });
  for (let t = 0; t < 2; t++) {
    const playerIndexes = players.filter((p) => p.teamId === t).map((p) => p.id);
    let tName = t === 0 ? 'Time 1' : 'Time 2';

    if (mode === '1x1_duploMorto' || mode === '1x1_dominacao') {
      tName = t === 0 ? 'Escravo' : '👑 Dominador';
    } else if (mode === '1x2') {
      tName = t === 0 ? 'Solo' : 'Dupla';
    } else if (mode === '1x3') {
      tName = t === 0 ? 'Solo' : 'Trio';
    } else if (isBossMode(mode)) {
      tName = t === 0 ? 'Cooperadores' : getBossDefinition(mode === BOSS_MODE_DOMINATRIX ? 'dominadora' : 'banker')?.name || 'Chefe';
    }

    // O PIX AGORA PERTENCE AO TIME, NÃO AO JOGADOR!
    teams.push({ id: t, name: tName, playerIndexes, melds: [], pix: pixKeys[t] || '' });
  }
  const preparedDeck = shuffle(createDeck(SUITS, RANKS));
  const HAND_SIZE = 11;
  const initialDeal = dealInitialDeck(preparedDeck, players.length, HAND_SIZE, DEAD_CHUNK_SIZE);
  const { stock, discard, deadPiles } = initialDeal;
  players.forEach((player, index) => {
    player.hand = initialDeal.hands[index];
  });
  players.forEach((p) => sortHand(p.hand));

  let deadChunksMax = [1, 1];
  if (mode === '1x1_duploMorto' || mode === '1x1_dominacao') deadChunksMax = [1, 2];
  if (isBossMode(mode)) deadChunksMax = [2, 0];
  const bossDefinition = isBossMode(mode) ? getBossDefinitionForMode(mode) : null;
  const deckTheme = bossDefinition?.deckTheme || document.getElementById('deckThemeSelect').value || 'classico';
  const tableTheme = bossDefinition?.tableTheme || document.getElementById('tableThemeSelect').value || 'feltro'; // Captura novo tema
  const isBetting = isBossMode(mode) ? false : document.getElementById('betToggle').value === 'sim';
  const betBase = parseFloat(document.getElementById('betBase').value) || 0;
  const betPerPoint = parseFloat(document.getElementById('betPerPoint').value) || 0;

  // 🎲 Sorteio de Início (Maior Dado Começa)
  const possibleRolls = shuffle([1, 2, 3, 4, 5, 6]);
  const diceRolls = [];
  for (let i = 0; i < players.length; i++) diceRolls.push(possibleRolls[i]);
  const maxRoll = Math.max(...diceRolls);
  const starterIdx = diceRolls.indexOf(maxRoll);

  const newState = {
    mode,
    variant: effectiveVariant,
    deckTheme,
    tableTheme,
    players,
    teams,
    currentPlayer: starterIdx,
    diceRolls: diceRolls, // Guarda os dados no banco
    turnNumber: 0,
    stock,
    discard,
    deadPiles,
    deadChunksTaken: [0, 0],
    deadChunksMax,
    hasDrawnThisTurn: false,
    finished: false,
    winnerTeamId: null,
    j2ConsecutiveTurns: 0,
    lastDPlayer: 2,
    requiredDiscardCard: null,
    pickedDiscardCardId: null,
    isBetting,
    betBase,
    betPerPoint,
    dominatorUsedPower: false,
    powerActiveThisTurn: false,
  };
  if (isBossMode(mode)) {
    newState.boss = createBossStateForMode(mode, Date.now());
    beginBossTurn(newState, { first: true, now: Date.now() });
  }
  const battleDetails = document.getElementById('bossBattleDetails');
  if (battleDetails) battleDetails.open = false;
  lastSeenBossLogKey = null;
  await setDoc(gameRef, { stateJson: JSON.stringify(newState), createdAt: Date.now() });
  showMessage('Partida iniciada!');
  return newState;
}

function currentPlayer() {
  return state.players[state.currentPlayer];
}
function currentTeam() {
  return state.teams[currentPlayer().teamId];
}
function showPendingBossChoiceMessage(playerId = myPlayerIndex) {
  const localChoice = state?.boss?.pendingChoices?.find((entry) => entry.playerId === playerId);
  const choice = localChoice || state?.boss?.pendingChoices?.[0];
  if (!choice) return;
  const target = state.players?.find((player) => player.id === choice.playerId);
  if (localChoice) showMessage('Voce precisa decidir antes de continuar.');
  else showMessage(`Aguardando ${target?.name || 'o jogador alvo'} decidir.`);
}
function canPerformCommonGameAction(gameState = state) {
  return canBossPerformCommonAction(gameState);
}
function ensureMyTurn() {
  if (!state || state.finished) {
    showMessage('Fim de jogo.');
    return false;
  }
  if (state.debugPaused) {
    showMessage('⚠️ Jogo congelado pelo DevTools.');
    return false;
  }
  if (!canPerformCommonGameAction(state)) {
    if (hasPendingBossChoices(state)) showPendingBossChoiceMessage();
    else showMessage(`${getBossDefinition(state.boss?.id)?.name || 'O chefe'} esta executando a acao da rodada.`);
    return false;
  }
  if (state.currentPlayer !== myPlayerIndex) {
    showMessage('Aguarde sua vez.');
    return false;
  }
  return true;
}

function hasAnyDeadToRecycle() {
  return !!state?.deadPiles?.some((p) => p && p.length);
}

function canTeamTakeDead(teamId) {
  const taken = state.deadChunksTaken?.[teamId] ?? 0;
  const max = state.deadChunksMax?.[teamId] ?? 1;
  if (taken >= max) return false;
  if (isCurrentBossMode() && teamId === 0) return state.deadPiles.some((pile) => pile && pile.length > 0);
  let deadIndex = teamId;
  if ((state.mode === '1x1_duploMorto' || state.mode === '1x1_dominacao') && teamId === 1 && taken >= 1) {
    if (!state.deadPiles?.[deadIndex]?.length) deadIndex = 0;
  }
  return !!state.deadPiles?.[deadIndex]?.length;
}

function teamHasGoodCanastra(teamId) {
  const team = state.teams[teamId];
  if (!team?.melds?.length) return false;
  return team.melds.some((m) => {
    if (!m || m.length < 7) return false;
    const kind = classifyMeldForUi(m).kind;
    return kind === 'limpa' || kind === 'real' || kind === 'asas';
  });
}

async function drawBossTurnExtras(player) {
  if (hasPendingBossChoices(state)) {
    showPendingBossChoiceMessage(player?.id);
    return [];
  }
  const extraCount = consumeBossExtraDraw(state, player.id);
  const stockEl = document.querySelector('#drawStockBtn .pile-card');
  const stockRect = stockEl ? getRect(stockEl) : null;
  const cards = [];
  for (let i = 0; i < extraCount; i++) {
    if (!state.stock.length) await recycleDeadToStockIfPossible();
    if (!state.stock.length) {
      await finishGame(null);
      break;
    }
    const card = state.stock.pop();
    ensureCardId(card);
    player.hand.push(card);
    cards.push(card);
  }
  const financedEvent = registerBossFinancedCards(state, player.id, cards);
  if (cards.length) {
    state.boughtCardIds = [...new Set([...(state.boughtCardIds || []), ...cards.map((card) => card.id)])];
    if (player.id === myPlayerIndex) {
      renderHand();
      for (const card of cards) {
        const toEl = cardElById(card.id);
        if (!stockRect || !toEl) continue;
        toEl.style.visibility = 'hidden';
        await flyRectToRect(card, stockRect, getRect(toEl), 'back');
        toEl.style.visibility = '';
      }
    }
  }
  if (financedEvent && player.id === myPlayerIndex) {
    showMessage(`${financedEvent.outcome} Use ou descarte neste turno. Cada carta restante gera Dívida.`);
  }
  return cards;
}

async function drawFromStock() {
  if (!ensureMyTurn()) return;
  if (state.hasDrawnThisTurn) {
    showMessage('⚠️ Compra bloqueada: Você já puxou carta neste turno.');
    return;
  }
  if (isBossVaultDrawRequired(state, state.currentPlayer)) {
    showMessage('Cofre: recupere sua garantia. Ela substitui a compra normal deste turno.');
    return;
  }

  const fromEl = document.querySelector('#drawStockBtn .pile-card');
  const fromRect = fromEl ? getRect(fromEl) : null;

  saveStateForUndo('drawStock');

  // Se for J2 na Humilhação ou Dominação, puxa 2 (se já puxou do lixo, puxa só mais 1)
  const isDominador = (state.mode === '1x1_duploMorto' || state.mode === '1x1_dominacao') && state.currentPlayer === 1;
  const bossExtraDraw = consumeBossExtraDraw(state, state.currentPlayer);
  const drawCount = (isDominador ? (state.partialDraw ? 1 : 2) : 1) + bossExtraDraw;
  const drawnCards = [];

  let recycledIndex = null;
  for (let i = 0; i < drawCount; i++) {
    if (!state.stock.length) {
      recycledIndex = await recycleDeadToStockIfPossible();
      if (recycledIndex === null || !state.stock.length) {
        if (i === 0) {
          showMessage('⚠️ O Monte esgotou e não há mortos. Fim de jogo por exaustão!');
          await finishGame(null);
          return;
        } else break;
      }
      showMessage('🔄 O Morto virou Monte!');
    }
    const c = state.stock.pop();
    ensureCardId(c);
    currentPlayer().hand.push(c);
    drawnCards.push(c);
  }

  const bossExtraCards = bossExtraDraw > 0 ? drawnCards.slice(-bossExtraDraw) : [];
  const financedEvent = registerBossFinancedCards(state, state.currentPlayer, bossExtraCards);

  sortHand(currentPlayer().hand);
  state.hasDrawnThisTurn = true;
  state.partialDraw = false; // Finalizou as compras
  window.isStealModeActive = false; // 👁️ Desativa a visão se tiver comprado do monte

  if (!state.boughtCardIds) state.boughtCardIds = [];
  drawnCards.forEach((c) => state.boughtCardIds.push(c.id)); // Salva todas para brilhar

  // Atualiza a mesa IMEDIATAMENTE (o número do monte cai na hora do clique)
  renderAll();

  if (fromRect) {
    for (const c of drawnCards) {
      const toEl = cardElById(c.id);
      if (toEl) {
        toEl.style.visibility = 'hidden';
        await flyRectToRect(c, fromRect, getRect(toEl), 'back');
        toEl.style.visibility = '';
      }
    }
  }

  showMessage(financedEvent ? `${financedEvent.outcome} Use ou descarte neste turno. Cada carta restante gera Dívida.` : '');

  state.lastAction = {
    id: newActionId(),
    type: 'drawStock',
    playerId: state.currentPlayer,
    card: packCard(drawnCards[drawnCards.length - 1]),
    count: drawnCards.length,
    bossExtraCards: bossExtraCards.map(packCard),
    bossEvent: financedEvent,
    recycledDeadIndex: recycledIndex,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  resetTurnTimer();
  await commitState();
  if (!state.partialDraw && !financedEvent) showMessage('✅ Compra realizada.');
}

function canUseDiscardInClosed(discardTop, hand, team) {
  if (!discardTop) return false;
  const n = hand.length;
  const pool = hand.concat([discardTop]);
  const idxTopo = pool.length - 1;
  const totalMasks = 1 << pool.length;
  for (let mask = 0; mask < totalMasks; mask++) {
    if (!(mask & (1 << idxTopo))) continue;
    const subset = [];
    for (let i = 0; i < pool.length; i++) if (mask & (1 << i)) subset.push(pool[i]);
    if (subset.length >= 3 && isValidSequenceMeld(subset)) return true;
  }
  if (team && team.melds && team.melds.length) {
    for (const meld of team.melds) {
      const base = meld;
      const maxMask2 = 1 << n;
      for (let mask = 0; mask < maxMask2; mask++) {
        const subset = base.slice();
        subset.push(discardTop);
        for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(hand[i]);
        if (isValidSequenceMeld(subset)) return true;
      }
    }
  }
  return false;
}

async function drawFromDiscard() {
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn && isBossVaultDrawRequired(state, state.currentPlayer)) {
    showMessage('Cofre: recupere sua garantia antes de continuar. Monte e lixo estão bloqueados.');
    return;
  }
  if (!state.hasDrawnThisTurn && isBossDiscardBlocked(state)) {
    showMessage('🔒 Bloqueio de Crédito: o lixo está indisponível nesta cobrança.');
    return;
  }

  if (hasPendingBossChoices(state)) {
    stopTurnTimer();
    turnTimerRemaining = 60;
    updateTimerLabel();
    return;
  }

  // NOVO: Se já comprou, o clique no lixo funciona como botão de Descartar
  if (state.hasDrawnThisTurn) {
    if (selectedHandIndexes.size === 1) {
      discardSelectedCard();
    } else {
      showMessage('⚠️ Selecione exatamente 1 carta da sua mão para descartar.');
    }
    return;
  }

  if (!state.stock.length && !hasAnyDeadToRecycle()) {
    showMessage('⚠️ O Monte esgotou e não há mortos. Fim de jogo por exaustão!');
    await finishGame(null);
    return;
  }
  if (!state.discard.length) {
    showMessage('⚠️ O Lixo está vazio.');
    return;
  }

  const top = state.discard[state.discard.length - 1];
  ensureCardId(top);
  const me = currentPlayer();
  const team = currentTeam();
  const hand = me.hand;

  // =========================================================
  // LÓGICA: BURACO FECHADO DIRETO DA MESA
  // =========================================================
  if (state.variant === 'fechado') {
    const indexes = Array.from(selectedHandIndexes).sort((a, b) => b - a);
    const selectedCards = indexes.map((i) => hand[i]);
    const bossSelection = validateBossClosedDiscardSelection(state, me.id, selectedCards);
    if (!bossSelection.allowed) {
      showMessage(bossSelection.message);
      resetDeniedCardSelection();
      return;
    }

    selectedCards.forEach((c) => {
      c.forceNatural = false;
      c.forceWild = false;
    });

    let isNewMeld = false;
    let extendedMeldIndex = -1;

    // 1. PRIORIDADE ABSOLUTA: Tenta adicionar a um JOGO EXISTENTE
    let validExtensions = [];
    let targetIndexes = [];

    if (selectedMeldTarget) {
      const [tId, mIdx] = selectedMeldTarget.split(':');
      // Checagem extra: só tenta empurrar pro jogo se ele de fato existir na memória!
      if (parseInt(tId) === team.id && team.melds[parseInt(mIdx)] && !isBossMeldLocked(state, team.id, parseInt(mIdx)) && canBossUseMeld(state, me.id, parseInt(mIdx))) targetIndexes.push(parseInt(mIdx));
    } else {
      team.melds.forEach((m, i) => {
        if (!isBossMeldLocked(state, team.id, i) && canBossUseMeld(state, me.id, i)) targetIndexes.push(i);
      });
    }

    // 🧠 Simulador Fantasma Injetado na validação da compra do Lixo
    const simulateMeldDiscard = (baseMeld = [], newCards, topC) => {
      const combined = [...baseMeld, ...newCards, topC].map((c) => (c ? { ...c } : null));
      combined.forEach((c) => {
        if (c && !c.joker && (c.rank === '2' || c.rank === 2)) {
          c.forceNatural = false;
          c.forceWild = false;
        }
      });
      return combined;
    };

    for (const mIdx of targetIndexes) {
      const testMeld = simulateMeldDiscard(team.melds[mIdx], selectedCards, top);
      if (isValidSequenceMeld(testMeld)) validExtensions.push(mIdx);
    }

    if (validExtensions.length > 0) {
      // Em caso puramente raro de 2 jogos idênticos, estende o primeiro e segue a vida
      extendedMeldIndex = validExtensions[0];
    }
    // 2. Se não encaixou na mesa, tenta formar um NOVO JOGO
    else if (selectedCards.length >= 2 && isValidSequenceMeld([...selectedCards, top])) {
      if (!canBossCreateMeld(state, me.id)) {
        showMessage('⛓ Você não pode criar outro jogo durante esta ordem.');
        return;
      }
      isNewMeld = true;
    } else {
      showMessage('🔒 FECHADO: Selecione na mão as cartas que justificam a compra do lixo!');
      return;
    }

    const bossMeldValidation = validateBossMeldPlay(state, me.id, selectedCards, state.discard.slice(0, -1));
    if (!bossMeldValidation.allowed) {
      showMessage(bossMeldValidation.message);
      return;
    }

    // 🛡️ TRAVA DA MATEMÁTICA: O cálculo exato que você descreveu
    const futureHandSize = hand.length - selectedCards.length + (state.discard.length - 1);
    if ((futureHandSize === 0 || futureHandSize === 1) && !canTeamTakeDeadNow(team.id)) {
      const hasCanasta = teamHasGoodCanastra(team.id);
      let willCreateCanastra = false;

      if (isNewMeld) {
        willCreateCanastra = ['limpa', 'real', 'asas'].includes(classifyMeldForUi([...selectedCards, top]).kind);
      } else {
        willCreateCanastra = ['limpa', 'real', 'asas'].includes(classifyMeldForUi([...team.melds[extendedMeldIndex], ...selectedCards, top]).kind);
      }

      if (!hasCanasta && !willCreateCanastra) {
        showMessage(`❌ Matemática inválida: Vai sobrar ${futureHandSize} carta(s) sem ter canastra limpa!`);
        selectedHandIndexes.clear();
        renderHand();
        return;
      }
    }
    if (futureHandSize === 0 && isCurrentBossMode() && !canTeamTakeDeadNow(team.id) && !confirmBossFinalStrike()) return;

    const pickupDecision = confirmBossDiscardPickup(me.id);
    if (!pickupDecision.allowed) return;

    const previewMeldIndex = isNewMeld ? team.melds.length : extendedMeldIndex;
    const previewOldKind = isNewMeld ? 'simple' : classifyMeldForUi(team.melds[extendedMeldIndex]).kind;
    const previewCards = [...selectedCards, top].filter(Boolean);
    const creditEligibleCardIds = selectedCards.map((card) => card.id);
    const cardOriginsById = Object.fromEntries(previewCards.map((card) => [card.id, creditEligibleCardIds.includes(card.id) ? 'hand' : 'discard']));
    const previewMeld = isNewMeld ? previewCards : [...team.melds[extendedMeldIndex], ...previewCards];
    const previewNewKind = classifyMeldPreview(previewMeld).kind;
    const bossPreparation = await prepareBossMeldMutation(
      me,
      previewMeldIndex,
      previewOldKind,
      previewNewKind,
      previewCards,
      'drawDiscardFechado',
      selectedCards.map((card) => card.id),
      { creditEligibleCardIds, cardOriginsById },
    );
    if (!bossPreparation.allowed) return;
    if (!bossPreparation.undoSaved)
      saveStateForUndo(
        'drawDiscardFechado',
        selectedCards.map((card) => card.id),
      );
    const surchargeEvent = pickupDecision.surcharge ? consumeBossDiscardSurcharge(state, me.id) : null;

    // --- SE ENCAIXOU, FAZ A MÁGICA ---
    const pile = state.discard.splice(0, state.discard.length);
    pile.forEach(ensureCardId);
    const topCard = pile.pop();
    notifyBossDiscardTaken(state, me.id, [...pile, topCard].filter(Boolean));

    for (const idx of indexes) hand.splice(idx, 1);

    let kindBeforeFechado = '';
    if (!isNewMeld) kindBeforeFechado = classifyMeldForUi(team.melds[extendedMeldIndex]).kind;

    const finalMeldCards = [...selectedCards, topCard].filter(Boolean);

    if (!finalMeldCards.length) {
      console.warn('[meld] finalMeldCards vazio ou inválido', {
        selectedCards,
        topCard,
        isNewMeld,
        extendedMeldIndex,
      });
      return false;
    }

    if (isNewMeld) {
      optimizeMeld(finalMeldCards);
      normalizeMeldOrder(finalMeldCards);
      team.melds.push(finalMeldCards.filter(Boolean));
    } else {
      if (!Array.isArray(team.melds[extendedMeldIndex])) {
        console.warn('[meld] meld alvo inválido', extendedMeldIndex, team.melds);
        return false;
      }

      team.melds[extendedMeldIndex].push(...finalMeldCards.filter(Boolean));
      optimizeMeld(team.melds[extendedMeldIndex]);
      normalizeMeldOrder(team.melds[extendedMeldIndex]);
      autoSwapWildWhenFillingGap(team.melds[extendedMeldIndex]);
      optimizeMeld(team.melds[extendedMeldIndex]);
      normalizeMeldOrder(team.melds[extendedMeldIndex]);
    }

    if (pile.length > 0) {
      hand.push(...pile);
      sortHand(hand);
    }
    const bossExtraCards = await drawBossTurnExtras(me);
    if (state.finished) return;

    if ((state.mode === '1x1_duploMorto' || state.mode === '1x1_dominacao') && state.currentPlayer === 1 && !state.partialDraw) {
      state.partialDraw = true;
      showMessage('Lixo baixado direto! Compre 1 carta do monte!');
    } else {
      state.hasDrawnThisTurn = true;
      state.partialDraw = false;
    }

    state.pickedDiscardCardId = null;
    state.requiredDiscardCard = null;
    selectedHandIndexes.clear();
    selectedMeldTarget = null;

    if (!state.boughtCardIds) state.boughtCardIds = [];
    pile.forEach((c) => state.boughtCardIds.push(c.id));

    renderAll();

    const bossMeldIndex = isNewMeld ? team.melds.length - 1 : extendedMeldIndex;
    const bossMeld = team.melds[bossMeldIndex];
    const kindAfterFechado = classifyMeldForUi(bossMeld).kind;
    let domReward = await processDominationReward(me, kindBeforeFechado, kindAfterFechado, bossMeldIndex);
    const bossEvent = await processBossMeldChange(me, kindBeforeFechado || 'simple', kindAfterFechado, bossMeldIndex, finalMeldCards, isNewMeld, {
      creditEligibleCardIds,
      cardOriginsById,
      suppressDominatrixResistance: bossPreparation.event?.type === 'interdictDecision' && bossPreparation.event?.decision === 'disobey',
    });
    if (state.finished) return;

    if (domReward && domReward.drawnCards && domReward.drawnCards.length > 0) {
      renderHand();
      const anims = domReward.drawnCards.map((c) => {
        const toEl = cardElById(c.id);
        if (!toEl) return Promise.resolve();

        const isSteal = c && c._isEndgameSteal === true;
        let fromRect = null;

        if (isSteal) {
          fromRect = opponentAnchorRect(0); // Sai do Escravo (Index 0)
        } else {
          const fromEl = document.querySelector('#drawStockBtn .pile-card');
          fromRect = fromEl ? getRect(fromEl) : null;
        }

        if (!fromRect) return Promise.resolve();

        toEl.style.visibility = 'hidden';
        return flyRectToRect(c, fromRect, getRect(toEl), isSteal ? 'front' : 'back').then(() => {
          if (toEl) toEl.style.visibility = '';
        });
      });
      await Promise.all(anims);
    }

    const tookDead = domReward?.tookDead || (await checkPostMeldStatus(me));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    state.lastAction = {
      id: newActionId(),
      type: 'drawDiscardFechado',
      playerId: state.currentPlayer,
      tookDead: tookDead,
      drawnCards: domReward?.drawnCards,
      bossExtraCards: bossExtraCards.map(packCard),
      bossFinanceEvent: surchargeEvent,
      bossEvent,
      ts: Date.now(),
    };
    ignoreOwnActionId = state.lastAction.id;

    renderAll();
    resetTurnTimer();
    await commitState();
    return;
  }

  // =========================================================
  // LÓGICA: BURACO ABERTO
  // =========================================================
  const pickupDecision = confirmBossDiscardPickup(me.id);
  if (!pickupDecision.allowed) return;
  saveStateForUndo('drawDiscard');
  const surchargeEvent = pickupDecision.surcharge ? consumeBossDiscardSurcharge(state, me.id) : null;
  const pile = state.discard.splice(0, state.discard.length);
  pile.forEach(ensureCardId);

  me.hand.push(...pile);
  notifyBossDiscardTaken(state, me.id, pile);
  sortHand(me.hand);
  const bossExtraCards = await drawBossTurnExtras(me);
  if (state.finished) return;

  if (!state.boughtCardIds) state.boughtCardIds = [];
  pile.forEach((c) => state.boughtCardIds.push(c.id));

  if ((state.mode === '1x1_duploMorto' || state.mode === '1x1_dominacao') && state.currentPlayer === 1 && !state.partialDraw) {
    state.partialDraw = true;
    showMessage('Lixo recolhido. Compre 1 carta do monte!');
  } else {
    state.hasDrawnThisTurn = true;
    state.partialDraw = false;
  }

  state.pickedDiscardCardId = top.id;
  state.requiredDiscardCard = null;
  selectedHandIndexes.clear();

  renderHand();
  renderAll();

  state.lastAction = {
    id: newActionId(),
    type: 'drawDiscard',
    playerId: state.currentPlayer,
    card: packCard(top),
    count: pile.length + 1,
    bossExtraCards: bossExtraCards.map(packCard),
    bossFinanceEvent: surchargeEvent,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  resetTurnTimer();
  await commitState();
  if (!state.partialDraw) showMessage('✅ Lixo recolhido.');
}

function isValidSequenceMeld(cards) {
  return isValidBossSequence(cards);
}

function legacyIsValidSequenceMeld(cards) {
  if (!cards) return false;
  cards = cards.filter((c) => c != null); // Remove os fantasmas da matemática
  if (cards.length < 3) return false;

  // TRAVA ANTI-ABERRAÇÃO: Nenhuma canastra no Buraco pode passar de 14 cartas (Ás a Ás).
  if (cards.length > 14) return false;

  let wildCards = cards.filter((c) => isWildcard(c, cards));
  let modifiedTwo = null;

  if (wildCards.length > 1) {
    const twos = wildCards.filter((c) => !c.joker && (c.rank === '2' || c.rank === 2));
    const realCards = cards.filter((c) => !c.joker && !(c.rank === '2' || c.rank === 2));
    const suit = realCards.length > 0 ? realCards[0].suit : twos.length > 0 ? twos[0].suit : null;

    if (twos.length > 0 && suit) {
      const twoToNatural = twos.find((t) => t.suit === suit);
      if (twoToNatural) {
        twoToNatural.forceNatural = true;
        modifiedTwo = twoToNatural;
        wildCards = cards.filter((c) => isWildcard(c, cards));
      }
    }
  }

  if (wildCards.length > 1) {
    if (modifiedTwo) modifiedTwo.forceNatural = false;
    return false;
  }

  const nonWild = cards.filter((c) => !isWildcard(c, cards));
  if (!nonWild.length) {
    if (modifiedTwo) modifiedTwo.forceNatural = false;
    return false;
  }
  const suit = nonWild[0].suit;
  if (!nonWild.every((c) => c.suit === suit)) {
    if (modifiedTwo) modifiedTwo.forceNatural = false;
    return false;
  }

  const availableWilds = cards.length - nonWild.length;

  function neededWildsForOrder(order, aceMode) {
    const seqOrder = {};
    order.forEach((r, i) => (seqOrder[r] = i));
    const sorted = nonWild.slice().sort((a, b) => seqOrder[a.rank] - seqOrder[b.rank]);
    const aceIndex = sorted.findIndex((c) => c.rank === 'A');
    if (aceIndex !== -1) {
      if (aceMode === 'high' && aceIndex !== sorted.length - 1) return null;
      if (aceMode === 'low' && aceIndex !== 0) return null;
      if (aceMode === 'none') return null;
    }
    let needed = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = seqOrder[sorted[i - 1].rank];
      const curr = seqOrder[sorted[i].rank];
      if (prev == null || curr == null) return null;
      const diff = curr - prev;
      if (diff <= 0) return null;
      if (diff > 1) needed += diff - 1;
    }
    return needed;
  }

  const needHigh = neededWildsForOrder(RANKS_SEQ, 'high');
  const needLow = neededWildsForOrder(RANKS_SEQ_LOW, 'low');
  const baseOk = (needHigh !== null && needHigh <= availableWilds) || (needLow !== null && needLow <= availableWilds);
  if (baseOk) {
    if (modifiedTwo) modifiedTwo.forceNatural = false;
    return true;
  }

  const aceCount = nonWild.filter((c) => c.rank === 'A').length;
  const hasKing = nonWild.some((c) => c.rank === 'K');
  if (aceCount >= 2 && hasKing) {
    const idxAceToRemove = nonWild.findIndex((c, i) => c.rank === 'A' && i !== nonWild.findIndex((x) => x.rank === 'A'));
    if (idxAceToRemove !== -1) {
      const test = nonWild.slice();
      test.splice(idxAceToRemove, 1);
      const seqOrder = {};
      RANKS_SEQ_LOW.forEach((r, i) => (seqOrder[r] = i));
      const sorted = test.slice().sort((a, b) => seqOrder[a.rank] - seqOrder[b.rank]);
      const aceIdx = sorted.findIndex((c) => c.rank === 'A');
      if (aceIdx === 0) {
        let needed = 0;
        let ok = true;
        for (let i = 1; i < sorted.length; i++) {
          const prev = seqOrder[sorted[i - 1].rank];
          const curr = seqOrder[sorted[i].rank];
          if (prev == null || curr == null) {
            ok = false;
            break;
          }
          const diff = curr - prev;
          if (diff <= 0) {
            ok = false;
            break;
          }
          if (diff > 1) needed += diff - 1;
        }
        if (ok && needed <= availableWilds) {
          if (modifiedTwo) modifiedTwo.forceNatural = false;
          return true;
        }
      }
    }
  }

  if (modifiedTwo) modifiedTwo.forceNatural = false;
  return false;
}

async function processDominationReward(p, oldKind, newKind, meldIndex) {
  if (!state || state.mode !== '1x1_dominacao') return null;
  if (oldKind === newKind) return null;
  if (meldIndex === undefined || meldIndex === null || meldIndex < 0) return null;

  // Tabela de valores exatos das compras
  const rewards = { simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 };

  state.dominationTurnTracking = state.dominationTurnTracking || {};
  const trackingKey = `${p.teamId}:${meldIndex}`;
  const currentTurnNumber = state.turnNumber || 0;
  const lastTracked = state.dominationTurnTracking[trackingKey];

  let cardsToDraw = 0;
  const newRewardValue = rewards[newKind] || 0;

  if (newRewardValue === 0) return null;

  if (!lastTracked || lastTracked.turnNumber !== currentTurnNumber) {
    // NOVO TURNO: Dá o bônus cheio da canastra atual
    cardsToDraw = newRewardValue;
  } else {
    // MESMO TURNO: Calcula apenas a diferença (Anti-Exploit)
    const previousRewardValue = lastTracked.highestWeight || 0;
    if (newRewardValue > previousRewardValue) {
      cardsToDraw = newRewardValue - previousRewardValue;
    }
  }

  // Atualiza a memória da jogada atual
  state.dominationTurnTracking[trackingKey] = {
    turnNumber: currentTurnNumber,
    highestWeight: newRewardValue,
  };

  if (cardsToDraw <= 0) return null;

  let tookDead = null;
  let drawnCards = [];

  // Compra as cartas rigorosamente baseada na matemática (sem puxar o morto inteiro)
  for (let i = 0; i < cardsToDraw; i++) {
    if (!state.stock.length) {
      await recycleDeadToStockIfPossible();
    }

    if (state.stock.length > 0) {
      const c = state.stock.pop();
      ensureCardId(c);

      const packed = packCard(c);
      packed._isEndgameSteal = false;

      p.hand.push(c);
      drawnCards.push(packed);

      if (!state.boughtCardIds) state.boughtCardIds = [];
      state.boughtCardIds.push(c.id);
    } else {
      // Se não tem monte nem morto, rouba do escravo
      const escravo = state.players[0];
      if (escravo && escravo.hand.length > 0) {
        const randIdx = Math.floor(Math.random() * escravo.hand.length);
        const c = escravo.hand.splice(randIdx, 1)[0];
        ensureCardId(c);

        c._isEndgameSteal = true;
        const packed = packCard(c);
        packed._isEndgameSteal = true;

        p.hand.push(c);
        drawnCards.push(packed);

        if (!state.boughtCardIds) state.boughtCardIds = [];
        state.boughtCardIds.push(c.id);
      }
    }
  }

  sortHand(p.hand);

  if (drawnCards.length > 0) {
    const temRoubo = drawnCards.some((c) => c && c._isEndgameSteal === true);
    showMessage(`👑 DOMINAÇÃO: Canastra ${newKind.toUpperCase()}! +${drawnCards.length} carta(s) ${temRoubo ? 'ROUBADA DA MÃO' : 'DO MONTE'}.`);
  }

  return { tookDead, drawnCards: drawnCards.length > 0 ? drawnCards : null };
}

async function checkPostMeldStatus(player) {
  if (player.hand.length > 0) return null;
  const teamId = player.teamId;
  const tookDead = takeDeadIfAvailableForPlayer(player);

  if (!tookDead) {
    if (teamHasGoodCanastra(teamId)) {
      showMessage('🏆 Batida direta!');
      await finishGame(teamId);
    }
    return null;
  } else {
    showMessage('💀 Pegou o morto!');
    return tookDead; // Retorna o morto em vez de salvar o estado pela metade
  }
}

async function attemptExtendExistingMeld(cards, indexes) {
  const team = currentTeam();
  if (!team.melds || !team.melds.length) return false;
  const hand = currentPlayer().hand;
  let forcedIndex = null;

  if (selectedMeldTarget) {
    const [teamIdStr, meldIdxStr] = selectedMeldTarget.split(':');
    if (parseInt(teamIdStr) === team.id && team.melds[parseInt(meldIdxStr)]) forcedIndex = parseInt(meldIdxStr);
  }

  // 🧠 Simulador Limpo: Clona as cartas e arranca a armadura do "2" natural
  // Isso permite que o motor matemático enxergue o 2 como coringa novamente!
  const simulateMeld = (baseMeld, newCards) => {
    const combined = [...baseMeld, ...newCards].map((c) => (c ? { ...c } : null));
    combined.forEach((c) => {
      if (c && !c.joker && (c.rank === '2' || c.rank === 2)) {
        c.forceNatural = false;
        c.forceWild = false;
      }
    });
    return combined;
  };

  if (forcedIndex !== null) {
    if (isBossMeldLocked(state, team.id, forcedIndex)) {
      showMessage('🔒 Penhora ativa: este jogo está bloqueado até a próxima cobrança.');
      return false;
    }
    if (!canBossUseMeld(state, currentPlayer().id, forcedIndex)) {
      showMessage('⛓ Separação ativa: seu cooperador já usou este jogo na rodada.');
      return false;
    }
    const targetMeld = team.melds[forcedIndex];
    const combined = simulateMeld(targetMeld, cards);

    if (!isValidSequenceMeld(combined)) {
      showMessage('❌ Combinação inválida: As cartas selecionadas não encaixam neste jogo.');
      return false;
    }
    const cardsLeft = hand.length - indexes.length;
    if ((cardsLeft === 0 || cardsLeft === 1) && !canTeamTakeDeadNow(team.id)) {
      const hasCanasta = teamHasGoodCanastra(team.id);
      optimizeMeld(combined); // Re-calcula se virou suja ou limpa no simulador
      const willCreateCanastra = ['limpa', 'real', 'asas'].includes(classifyMeldForUi(combined).kind);
      if (!hasCanasta && !willCreateCanastra) {
        showMessage(`❌ Você não pode ficar com ${cardsLeft} carta(s) sem ter canastra limpa!`);
        return false;
      }
    }
    if (cardsLeft === 0 && isCurrentBossMode() && !canTeamTakeDeadNow(team.id) && !confirmBossFinalStrike()) return false;

    const kindBefore1 = classifyMeldForUi(targetMeld).kind;
    const kindAfter1 = classifyMeldPreview(combined).kind;
    const bossPreparation = await prepareBossMeldMutation(
      currentPlayer(),
      forcedIndex,
      kindBefore1,
      kindAfter1,
      cards,
      'meldExtend',
      cards.map((card) => card.id),
    );
    if (!bossPreparation.allowed) return false;

    const key = team.id + ':' + forcedIndex;
    const baseDrop = meldDropRect(key, 0);

    if (baseDrop) {
      const anims = cards.map((card, index) => {
        const from = cardElById(card.id);

        if (!from) {
          return Promise.resolve();
        }

        const fromRect = getRect(from);
        from.style.visibility = 'hidden';

        const toRect = {
          ...baseDrop,
          left: baseDrop.left - index * 10,
          top: baseDrop.top + index * 2,
        };

        return flyRectToRect(card, fromRect, toRect, 'front').then(() => impactAtRect(toRect));
      });

      await Promise.all(anims);
    }

    if (!bossPreparation.undoSaved) {
      saveStateForUndo(
        'meldExtend',
        cards.map((card) => card.id),
      );
    }

    for (const index of indexes) {
      targetMeld.push(hand[index]);
      hand.splice(index, 1);
    }

    optimizeMeld(targetMeld);
    normalizeMeldOrder(targetMeld);
    autoSwapWildWhenFillingGap(targetMeld);
    optimizeMeld(targetMeld);
    normalizeMeldOrder(targetMeld);

    sortHand(hand);

    selectedHandIndexes.clear();
    selectedMeldTarget = null;

    let domReward = await processDominationReward(currentPlayer(), kindBefore1, classifyMeldForUi(targetMeld).kind, forcedIndex);
    const bossEvent = await processBossMeldChange(currentPlayer(), kindBefore1, classifyMeldForUi(targetMeld).kind, forcedIndex, cards, false, {
      suppressDominatrixResistance: bossPreparation.event?.type === 'interdictDecision' && bossPreparation.event?.decision === 'disobey',
    });
    if (state.finished) return true;

    if (domReward && domReward.drawnCards && domReward.drawnCards.length > 0) {
      renderHand();
      const anims = domReward.drawnCards.map((c) => {
        const toEl = cardElById(c.id);
        if (!toEl) return Promise.resolve();

        const isSteal = c && c._isEndgameSteal === true;
        let fromRect = null;

        if (isSteal) {
          fromRect = opponentAnchorRect(0);
        } else {
          const fromEl = document.querySelector('#drawStockBtn .pile-card');
          fromRect = fromEl ? getRect(fromEl) : null;
        }

        if (!fromRect) return Promise.resolve();

        toEl.style.visibility = 'hidden';
        return flyRectToRect(c, fromRect, getRect(toEl), isSteal ? 'front' : 'back').then(() => {
          if (toEl) toEl.style.visibility = '';
        });
      });
      await Promise.all(anims);
    }

    const tookDead = domReward?.tookDead || (await checkPostMeldStatus(currentPlayer()));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    state.lastAction = {
      id: newActionId(),
      type: 'meldExtend',
      playerId: myPlayerIndex,
      teamId: team.id,
      meldIndex: forcedIndex,
      cards: cards.map(packCard),
      tookDead: tookDead,
      drawnCards: domReward?.drawnCards,
      bossEvent,
      ts: Date.now(),
    };
    ignoreOwnActionId = state.lastAction.id;

    renderAll();
    resetTurnTimer();
    await commitState();
    showMessage('Cartas adicionadas!');
    return true;
  }

  const candidateMeldIndexes = [];
  team.melds.forEach((meld, idx) => {
    if (isBossMeldLocked(state, team.id, idx)) return;
    if (!canBossUseMeld(state, currentPlayer().id, idx)) return;
    const combinedCheck = simulateMeld(meld, cards);
    if (isValidSequenceMeld(combinedCheck)) candidateMeldIndexes.push(idx);
  });

  if (!candidateMeldIndexes.length) return false;
  if (candidateMeldIndexes.length > 1) {
    showMessage('Encaixa em vários. Selecione o jogo.');
    return false;
  }

  const teamMeld = team.melds[candidateMeldIndexes[0]];
  const combinedCheck = simulateMeld(teamMeld, cards);
  if (enumerateWildcardOptions(combinedCheck, isValidBossSequence).length > 1) {
    showMessage('Clique no jogo que deseja completar.');
    return 'select-target';
  }

  const cardsLeft = hand.length - indexes.length;
  if ((cardsLeft === 0 || cardsLeft === 1) && !canTeamTakeDeadNow(team.id)) {
    const hasCanasta = teamHasGoodCanastra(team.id);
    optimizeMeld(combinedCheck); // Re-calcula se virou suja ou limpa no simulador
    const willCreateCanastra = ['limpa', 'real', 'asas'].includes(classifyMeldForUi(combinedCheck).kind);
    if (!hasCanasta && !willCreateCanastra) {
      showMessage(`❌ Você não pode ficar com ${cardsLeft} carta(s) sem ter canastra limpa!`);
      return false;
    }
  }
  if (cardsLeft === 0 && isCurrentBossMode() && !canTeamTakeDeadNow(team.id) && !confirmBossFinalStrike()) return false;

  const kindBefore2 = classifyMeldForUi(teamMeld).kind;
  const kindAfter2 = classifyMeldPreview(combinedCheck).kind;
  const bossPreparation = await prepareBossMeldMutation(
    currentPlayer(),
    candidateMeldIndexes[0],
    kindBefore2,
    kindAfter2,
    cards,
    'meldExtend',
    cards.map((card) => card.id),
  );
  if (!bossPreparation.allowed) return false;

  if (!bossPreparation.undoSaved)
    saveStateForUndo(
      'meldExtend',
      cards.map((card) => card.id),
    );

  for (const idx of indexes) {
    teamMeld.push(hand[idx]);
    hand.splice(idx, 1);
  }

  optimizeMeld(teamMeld);
  normalizeMeldOrder(teamMeld);
  autoSwapWildWhenFillingGap(teamMeld);
  optimizeMeld(teamMeld);
  normalizeMeldOrder(teamMeld);
  sortHand(hand);
  selectedHandIndexes.clear();
  selectedMeldTarget = null;

  let domReward = await processDominationReward(currentPlayer(), kindBefore2, classifyMeldForUi(teamMeld).kind, candidateMeldIndexes[0]);
  const bossEvent = await processBossMeldChange(currentPlayer(), kindBefore2, classifyMeldForUi(teamMeld).kind, candidateMeldIndexes[0], cards, false, {
    suppressDominatrixResistance: bossPreparation.event?.type === 'interdictDecision' && bossPreparation.event?.decision === 'disobey',
  });
  if (state.finished) return true;

  if (domReward && domReward.drawnCards && domReward.drawnCards.length > 0) {
    renderHand();
    const anims = domReward.drawnCards.map((c) => {
      const toEl = cardElById(c.id);
      if (!toEl) return Promise.resolve();

      const isSteal = c && c._isEndgameSteal === true;
      let fromRect = null;

      if (isSteal) {
        fromRect = opponentAnchorRect(0);
      } else {
        const fromEl = document.querySelector('#drawStockBtn .pile-card');
        fromRect = fromEl ? getRect(fromEl) : null;
      }

      if (!fromRect) return Promise.resolve();

      toEl.style.visibility = 'hidden';
      return flyRectToRect(c, fromRect, getRect(toEl), isSteal ? 'front' : 'back').then(() => {
        if (toEl) toEl.style.visibility = '';
      });
    });
    await Promise.all(anims);
  }

  const tookDead = domReward?.tookDead || (await checkPostMeldStatus(currentPlayer()));
  if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

  state.lastAction = {
    id: newActionId(),
    type: 'meldExtend',
    playerId: myPlayerIndex,
    teamId: team.id,
    meldIndex: candidateMeldIndexes[0],
    cards: cards.map(packCard),
    tookDead: tookDead,
    drawnCards: domReward?.drawnCards,
    bossEvent,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  renderAll();
  resetTurnTimer();
  await commitState();
  showMessage('Cartas adicionadas!');
  return true;
}

async function makeMeldFromSelection(forceNew = false) {
  if (window.isMelding) return; // 🛡️ TRAVA ANTI-SPAM: Impede duplo-clique
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn) {
    showMessage('Compre primeiro.');
    return;
  }

  window.isMelding = true; // 🔒 TRANCA A FUNÇÃO

  try {
    const hand = currentPlayer().hand;
    const indexes = Array.from(selectedHandIndexes).sort((a, b) => b - a);

    if (!indexes.length) {
      showMessage('Selecione cartas.');
      return;
    }
    const cards = indexes.map((i) => hand[i]);
    const blockedPlay = cards.map((card) => getBossCardBlockFeedback(state, currentPlayer().id, card?.id, 'play')).find(Boolean);
    if (blockedPlay) {
      showMessage(blockedPlay.message);
      resetDeniedCardSelection();
      return;
    }
    const bossMeldValidation = validateBossMeldPlay(state, currentPlayer().id, cards);
    if (!bossMeldValidation.allowed) {
      showMessage(bossMeldValidation.message);
      resetDeniedCardSelection();
      return;
    }

    cards.forEach((c) => {
      c.forceNatural = false;
      c.forceWild = false;
    });

    if (!forceNew) {
      const extended = await attemptExtendExistingMeld(cards, indexes);
      if (extended === 'select-target') {
        renderHand();
        return;
      }
      if (extended) return;

      // Se tentou colocar as cartas num jogo específico mas elas não encaixaram, aborta!
      // Isso impede que o sistema crie um jogo novo indesejado com as sobras.
      if (selectedMeldTarget) {
        renderHand();
        return;
      }
    }

    // --- LÓGICA EXCLUSIVA PARA JOGO NOVO ---
    if (indexes.length < 3) {
      showMessage('⚠️ Um novo jogo exige no mínimo 3 cartas em sequência.');
      renderHand(); // Devolve as cartas para a tela visualmente
      return;
    }
    if (!isValidSequenceMeld(cards)) {
      showMessage('❌ Sequência inválida: As cartas não formam um jogo estruturado.');
      renderHand();
      return;
    }
    const teamId = currentTeam().id;
    const cardsLeft = hand.length - indexes.length;
    if ((cardsLeft === 0 || cardsLeft === 1) && !canTeamTakeDeadNow(teamId)) {
      const hasCanasta = teamHasGoodCanastra(teamId);
      const willCreateCanastra = ['limpa', 'real', 'asas'].includes(classifyMeldForUi(cards).kind);
      if (!hasCanasta && !willCreateCanastra) {
        showMessage(`❌ Você não pode ficar com ${cardsLeft} carta(s) sem ter canastra limpa!`);
        return;
      }
    }

    if (!canBossCreateMeld(state, currentPlayer().id)) {
      const chains = getBossChains(state, currentPlayer().id);
      showMessage(chains >= 4 ? '👑 Você está Dominado e não pode criar um jogo novo.' : chains >= 3 ? '⛓ Sob Controle: você pode alimentar jogos, mas não criar um novo.' : '⛓ Mãos Atadas: você já criou seu jogo nesta rodada.');
      return;
    }
    if (cardsLeft === 0 && isCurrentBossMode() && !canTeamTakeDeadNow(teamId) && !confirmBossFinalStrike()) return;

    cards.forEach(ensureCardId);
    const bossPreparation = await prepareBossMeldMutation(
      currentPlayer(),
      currentTeam().melds.length,
      'simple',
      classifyMeldForUi(cards).kind,
      cards,
      'meldNew',
      cards.map((card) => card.id),
    );
    if (!bossPreparation.allowed) return;
    if (!bossPreparation.undoSaved)
      saveStateForUndo(
        'meldNew',
        cards.map((card) => card.id),
      );

    const targetContainer = document.getElementById(teamId === 0 ? 'meldsP1' : 'meldsP2');

    if (targetContainer) {
      const tr = targetContainer.getBoundingClientRect();
      const dropBase = { left: tr.left + tr.width - 30, top: tr.top + 10, width: 22, height: 30 };
      const anims = cards.map((c, i) => {
        const from = cardElById(c.id);
        if (!from) return Promise.resolve();
        const fromRect = getRect(from);
        from.style.visibility = 'hidden';
        const toRect = { ...dropBase, left: dropBase.left - i * 10, top: dropBase.top + i * 2 };
        return flyRectToRect(c, fromRect, toRect, 'front').then(() => impactAtRect(toRect));
      });
      await Promise.all(anims);
    }

    const meld = [];
    for (const idx of indexes) {
      meld.unshift(hand[idx]);
      hand.splice(idx, 1);
    }

    optimizeMeld(meld);
    normalizeMeldOrder(meld);

    currentTeam().melds.push(meld);
    const meldIdx = currentTeam().melds.length - 1;

    // Avaliação Plus Dominação (CORRIGIDO: meldIdx numérico)
    let domReward = await processDominationReward(currentPlayer(), 'simple', classifyMeldForUi(meld).kind, meldIdx);
    const bossEvent = await processBossMeldChange(currentPlayer(), 'simple', classifyMeldForUi(meld).kind, meldIdx, cards, true, {
      suppressDominatrixResistance: bossPreparation.event?.type === 'interdictDecision' && bossPreparation.event?.decision === 'disobey',
    });
    if (state.finished) return;

    if (domReward && domReward.drawnCards && domReward.drawnCards.length > 0) {
      renderHand(); // Força as cartas a existirem no DOM para voarem até elas
      const anims = domReward.drawnCards.map((c) => {
        const toEl = cardElById(c.id);
        if (!toEl) return Promise.resolve();

        const isSteal = c && c._isEndgameSteal === true;
        let fromRect = null;

        if (isSteal) {
          fromRect = opponentAnchorRect(0);
        } else {
          const fromEl = document.querySelector('#drawStockBtn .pile-card');
          fromRect = fromEl ? getRect(fromEl) : null;
        }

        if (!fromRect) return Promise.resolve();

        toEl.style.visibility = 'hidden';
        return flyRectToRect(c, fromRect, getRect(toEl), isSteal ? 'front' : 'back').then(() => {
          if (toEl) toEl.style.visibility = '';
        });
      });
      await Promise.all(anims);
    }

    const tookDead = domReward?.tookDead || (await checkPostMeldStatus(currentPlayer()));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    state.lastAction = {
      id: newActionId(),
      type: 'meldNew',
      playerId: myPlayerIndex,
      teamId: currentTeam().id,
      meldIndex: meldIdx,
      cards: cards.map(packCard),
      tookDead: tookDead,
      drawnCards: domReward?.drawnCards, // <- Envia para o oponente animar
      bossEvent,
      ts: Date.now(),
    };

    ignoreOwnActionId = state.lastAction.id;
    selectedHandIndexes.clear();
    renderAll();
    resetTurnTimer();
    await commitState();
    if (!tookDead) showMessage('✅ Jogo baixado com sucesso na mesa.');
  } finally {
    window.isMelding = false; // 🔓 DESTRAVA A FUNÇÃO (Independente de sucesso ou erro)
  }
}

function takeDeadIfAvailableForPlayer(p) {
  if (!state || !p) return null;

  const teamId = p.teamId;
  const taken = state.deadChunksTaken?.[teamId] ?? 0;
  const max = state.deadChunksMax?.[teamId] ?? 1;
  if (taken >= max) return null;
  if (p.hand.length !== 0) return null;

  // Pega o índice do primeiro morto que achar na mesa
  const deadIndex = state.deadPiles.findIndex((pile) => pile && pile.length > 0);
  if (deadIndex === -1) return null;

  const dead = state.deadPiles[deadIndex];
  const chunkSize = Math.min(DEAD_CHUNK_SIZE, dead.length);

  p.hand.length = 0;
  p.hand.push(...dead.splice(0, chunkSize));
  sortHand(p.hand);
  state.deadChunksTaken[teamId] = taken + 1;
  processBossDeadReward();

  return { deadIndex, count: chunkSize };
}

function canTeamTakeDeadNow(teamId) {
  const taken = state.deadChunksTaken?.[teamId] ?? 0;
  const max = state.deadChunksMax?.[teamId] ?? 1;
  if (taken >= max) return false;

  // Procura se existe QUALQUER morto disponível na mesa
  return state.deadPiles.some((pile) => pile && pile.length > 0);
}

async function discardSelectedCard() {
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn) {
    showMessage('Compre primeiro.');
    return;
  }

  if (state.variant === 'fechado' && state.pickedDiscardCardId) {
    const stillInHand = currentPlayer().hand.some((c) => c.id === state.pickedDiscardCardId);
    if (stillInHand) {
      showMessage('🔒 FECHADO: A carta comprada do lixo precisa ser baixada na mesa obrigatoriamente.');
      return;
    }
  }

  const pInitial = currentPlayer();
  const indexes = Array.from(selectedHandIndexes);
  if (indexes.length !== 1) {
    showMessage('Selecione 1 carta.');
    return;
  }

  const card = pInitial.hand[indexes[0]];

  if (!card) {
    selectedHandIndexes.clear();
    renderHand();
    return;
  }

  ensureCardId(card);
  const blockedDiscard = getBossCardBlockFeedback(state, pInitial.id, card.id, 'discard');
  if (blockedDiscard) {
    showMessage(blockedDiscard.message);
    resetDeniedCardSelection();
    return;
  }
  // Optional chaining para evitar crash se id for nulo na leitura
  if (state.pickedDiscardCardId && state.pickedDiscardCardId === card.id) {
    showMessage('Você não pode descartar a carta que acabou de pegar do lixo.');
    resetDeniedCardSelection();
    return;
  }

  if (pInitial.hand.length === 1 && !canTeamTakeDeadNow(pInitial.teamId)) {
    if (!teamHasGoodCanastra(pInitial.teamId)) {
      showMessage('❌ Você não pode bater sem ter uma canastra limpa!');
      renderHand();
      return;
    }
    if (isCurrentBossMode() && !confirmBossFinalStrike()) {
      renderHand();
      return;
    }
  }

  saveStateForUndo('discard', [card.id]);
  const discardOrderEvents = notifyBossCardDiscarded(state, pInitial.id, card);
  if (discardOrderEvents.length) state._pendingBossEvent = discardOrderEvents[discardOrderEvents.length - 1];

  const fromEl = cardElById(card.id);
  const toEl = document.querySelector('#drawDiscardBtn .pile-card');

  if (fromEl && toEl) {
    const fromRect = getRect(fromEl);
    const toRect = getRect(toEl);
    fromEl.style.visibility = 'hidden';
    await flyRectToRect(card, fromRect, toRect, 'front');
    fromEl.style.visibility = '';
  }

  // --- PROTEÇÃO ANTI-CORRUPÇÃO DE ESTADO ---
  // Recupera o estado NOVO caso o Firebase tenha atualizado durante o 1 segundo de animação
  const p = state.players[myPlayerIndex];
  const hand = p.hand;

  const actualIndex = hand.findIndex((c) => c.id === card.id);
  if (actualIndex !== -1) {
    hand.splice(actualIndex, 1);
  }
  state.discard.push(card);

  let tookDead = null;
  if (p.hand.length === 0) tookDead = takeDeadIfAvailableForPlayer(p);

  if (p.hand.length === 0 && !canTeamTakeDeadNow(p.teamId)) {
    await finishGame(p.teamId);
    return;
  }

  if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

  passTurn({ preserveUndo: true });

  state.lastAction = {
    id: newActionId(),
    type: 'discard',
    playerId: myPlayerIndex,
    card: packCard(card),
    tookDead,
    bossEvent: state._pendingBossEvent || null,
    ts: Date.now(),
  };
  delete state._pendingBossEvent;
  ignoreOwnActionId = state.lastAction.id;

  renderAll();
  await commitState();
  showMessage('✅ Carta descartada. Turno encerrado.');
}

function computeTeamMeldScore(team) {
  let meldPoints = 0,
    sujaBonus = 0,
    limpaBonus = 0,
    realBonus = 0,
    asasBonus = 0;
  if (!team || !team.melds) return { total: 0 };
  team.melds.forEach((meld) => {
    meld.forEach((c) => (meldPoints += cardBasePoints(c)));
    if (meld.length >= 7) {
      const info = classifyMeldForUi(meld);
      if (info.kind === 'suja') sujaBonus += 100;
      if (info.kind === 'limpa') limpaBonus += 200;
      if (info.kind === 'real') realBonus += 500;
      if (info.kind === 'asas') asasBonus += 1000;
    }
  });
  return { meldPoints, sujaBonus, limpaBonus, realBonus, asasBonus, total: meldPoints + sujaBonus + limpaBonus + realBonus + asasBonus };
}

function normalizeMeldOrder(meld) {
  if (!meld || !meld.length) return;
  if (meld.some((card) => card?.wildTargetRank) && isValidSequenceMeld(meld)) return;
  const nonWild = meld.filter((c) => !isWildcard(c, meld));
  const wild = meld.filter((c) => isWildcard(c, meld));
  if (!nonWild.length) {
    meld.splice(0, meld.length, ...wild);
    return;
  }

  const aces = nonWild.filter((c) => c.rank === 'A');
  const hasKing = nonWild.some((c) => c.rank === 'K');
  if (aces.length >= 2 && hasKing) {
    const closingAce = aces[1];
    const baseNonWild = nonWild.filter((c) => c !== closingAce);
    const seqOrderLow = {};
    RANKS_SEQ_LOW.forEach((r, i) => (seqOrderLow[r] = i));

    const sortedNonWild = baseNonWild.slice().sort((a, b) => seqOrderLow[a.rank] - seqOrderLow[b.rank]);
    const middle = [];
    const wildQueue = [...wild];

    for (let i = 0; i < sortedNonWild.length; i++) {
      middle.push(sortedNonWild[i]);
      if (i < sortedNonWild.length - 1) {
        let gap = seqOrderLow[sortedNonWild[i + 1].rank] - seqOrderLow[sortedNonWild[i].rank] - 1;
        while (gap > 0 && wildQueue.length) {
          middle.push(wildQueue.shift());
          gap--;
        }
      }
    }

    const suffix = [];
    while (wildQueue.length) suffix.push(wildQueue.shift());
    meld.splice(0, meld.length, ...middle, ...suffix, closingAce);
    return;
  }

  const availableWilds = wild.length;
  function neededWildsForOrder(order, aceMode) {
    const seqOrder = {};
    order.forEach((r, i) => (seqOrder[r] = i));
    const sorted = nonWild.slice().sort((a, b) => seqOrder[a.rank] - seqOrder[b.rank]);
    const aceIndex = sorted.findIndex((c) => c.rank === 'A');
    if (aceIndex !== -1) {
      if (aceMode === 'high' && aceIndex !== sorted.length - 1) return null;
      if (aceMode === 'low' && aceIndex !== 0) return null;
      if (aceMode === 'none') return null;
    }
    let needed = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = seqOrder[sorted[i].rank] - seqOrder[sorted[i - 1].rank];
      if (diff <= 0) return null;
      if (diff > 1) needed += diff - 1;
    }
    return needed;
  }

  const needHigh = neededWildsForOrder(RANKS_SEQ, 'high');
  const needLow = neededWildsForOrder(RANKS_SEQ_LOW, 'low');
  const okHigh = needHigh !== null && needHigh <= availableWilds;
  const okLow = needLow !== null && needLow <= availableWilds;

  const isWildAtEnd = wild.length > 0 && meld.length > 0 && isWildcard(meld[meld.length - 1], meld);

  let order, aceMode;
  if (okHigh && okLow) {
    if (needHigh < needLow) {
      order = RANKS_SEQ;
      aceMode = 'high';
    } else if (needLow < needHigh) {
      order = RANKS_SEQ_LOW;
      aceMode = 'low';
    } else {
      if (isWildAtEnd) {
        order = RANKS_SEQ_LOW;
        aceMode = 'low';
      } else {
        order = RANKS_SEQ;
        aceMode = 'high';
      }
    }
  } else if (okHigh) {
    order = RANKS_SEQ;
    aceMode = 'high';
  } else if (okLow) {
    order = RANKS_SEQ_LOW;
    aceMode = 'low';
  } else return;

  const seqOrder = {};
  order.forEach((r, i) => (seqOrder[r] = i));
  const sortedNonWild = nonWild.slice().sort((a, b) => seqOrder[a.rank] - seqOrder[b.rank]);
  const middle = [];
  const wildQueue = [...wild];
  for (let i = 0; i < sortedNonWild.length; i++) {
    middle.push(sortedNonWild[i]);
    if (i < sortedNonWild.length - 1) {
      let gap = seqOrder[sortedNonWild[i + 1].rank] - seqOrder[sortedNonWild[i].rank] - 1;
      while (gap > 0 && wildQueue.length) {
        middle.push(wildQueue.shift());
        gap--;
      }
    }
  }
  const prefix = [];
  const suffix = [];
  if (aceMode === 'high') {
    while (wildQueue.length) prefix.push(wildQueue.shift());
  } else {
    while (wildQueue.length) suffix.push(wildQueue.shift());
  }

  meld.splice(0, meld.length, ...prefix, ...middle, ...suffix);
}

function computeScores() {
  const results = [];
  state.teams.forEach((team) => {
    const players = state.players.filter((p) => p.teamId === team.id);
    let handPenalty = 0;
    players.forEach((p) => p.hand.forEach((c) => (handPenalty += cardBasePoints(c))));
    const meldInfo = computeTeamMeldScore(team);

    const mortosPegos = state.deadChunksTaken?.[team.id] ?? 0;
    const penaltyMorto = mortosPegos === 0 ? 100 : 0;
    const bonusBatida = state.winnerTeamId === team.id ? 100 : 0;

    const finalScore = meldInfo.total - handPenalty - penaltyMorto + bonusBatida;
    results.push({ team, players, score: finalScore, handPenalty, penaltyMorto, bonusBatida, ...meldInfo });
  });
  return results;
}

// Função que encerra a partida
async function finishGame(winnerTeamId, options = {}) {
  if (!state || state.finished) return;
  let bossEvent = options.bossEvent || null;
  if (isCurrentBossMode()) {
    normalizeBossState(state);
    if (!options.skipFinalStrike && !state.boss.result) {
      bossEvent = winnerTeamId === null ? applyBossResourceDefeat(state) : applyBossFinalStrike(state, getCooperativeProjectedScore());
    }
    if (bossEvent?.reborn && !state.boss.result) {
      state.lastAction = {
        id: newActionId(),
        type: 'bossRebirth',
        playerId: myPlayerIndex,
        bossEvent,
        ts: Date.now(),
      };
      ignoreOwnActionId = state.lastAction.id;
      renderAll();
      await commitState();
      return;
    }
    if (!state.boss.result) {
      state.boss.result = {
        victory: !!state.boss.defeated,
        reason: state.boss.defeated ? 'boss_defeated' : 'battle_interrupted',
        title: state.boss.defeated ? 'O Banqueiro foi derrotado' : 'Cobrança interrompida',
        detail: state.boss.defeated ? 'A equipe encerrou a cobrança.' : 'A equipe não concluiu o confronto.',
      };
    }
    winnerTeamId = state.boss.result.victory ? 0 : 1;
  }
  state.finished = true;
  state.winnerTeamId = winnerTeamId;

  state.lastAction = {
    id: newActionId(),
    type: 'endGame',
    playerId: myPlayerIndex,
    bossEvent,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  // Força o áudio a rodar na máquina de quem executou a batida/botão de teste
  playCanastraSfx('fim');

  renderAll();
  await commitState();
}

function getBackClass(card) {
  return card?.back === 'blue' ? 'back-blue' : 'back-red';
}

function setBackClassIfChanged(el, wantedClass, baseClass = null) {
  if (!el) return false;

  if (baseClass) el.classList.add(baseClass);

  const currentClass = el.classList.contains('back-blue') ? 'back-blue' : el.classList.contains('back-red') ? 'back-red' : '';

  if (currentClass === wantedClass) return false;

  el.classList.remove('back-red', 'back-blue');
  if (wantedClass) el.classList.add(wantedClass);
  return true;
}

function renderBossDetailFields(element, details) {
  if (!element) return;
  element.replaceChildren();
  details.forEach((detail) => {
    const separator = detail.indexOf(':');
    const row = document.createElement('div');
    if (separator < 0) {
      row.textContent = detail;
    } else {
      const label = document.createElement('span');
      const value = document.createElement('strong');
      label.textContent = detail.slice(0, separator).trim();
      value.textContent = detail.slice(separator + 1).trim();
      row.append(label, value);
    }
    element.appendChild(row);
  });
}

function bossFlowHostIndex() {
  const humanIndex = state?.players?.findIndex((player) => player && !player.name?.toUpperCase().includes('BOT')) ?? -1;
  return humanIndex >= 0 ? humanIndex : myPlayerIndex;
}

function scheduleBossTurnAdvance() {
  const flow = state?.boss?.bossFlow;
  const active = isCurrentBossMode() && isBossTurnActive(state) && flow && !hasPendingBossChoices(state);
  const isHost = active && myPlayerIndex === bossFlowHostIndex();
  const key = active ? `${flow.id}:${flow.stage}:${flow.endsAt}` : '';
  if (!isHost) {
    if (bossPresentationTimer) clearTimeout(bossPresentationTimer);
    bossPresentationTimer = null;
    bossPresentationKey = '';
    return;
  }
  if (bossPresentationTimer && bossPresentationKey === key) return;
  if (bossPresentationTimer) clearTimeout(bossPresentationTimer);
  bossPresentationKey = key;
  const sessionId = window.gameSessionId;
  const signal = botTurnController.signal;
  const delay = Math.max(0, Number(flow.endsAt || 0) - Date.now()) + 40;
  bossPresentationTimer = setTimeout(async () => {
    bossPresentationTimer = null;
    bossPresentationKey = '';
    if (!isGameSessionActive(sessionId, signal) || !state || state.finished) return;
    const currentFlow = state.boss?.bossFlow;
    if (!currentFlow || `${currentFlow.id}:${currentFlow.stage}:${currentFlow.endsAt}` !== key) return;
    const step = advanceBossTurn(state, Date.now());
    if (!step) {
      renderAll();
      return;
    }
    state.lastAction = { id: newActionId(), type: 'bossTurn', stage: step.stage, flowId: step.flowId, ts: Date.now() };
    ignoreOwnActionId = state.lastAction.id;
    renderAll();
    await commitState();
    startTurnTimerIfNeeded();
  }, delay);
}

async function reclaimLocalBossVault() {
  if (!ensureMyTurn() || !isBossVaultDrawRequired(state, myPlayerIndex)) return;
  const slot = document.getElementById('bossLocalVaultSlot');
  const fromRect = slot ? getRect(slot) : null;
  const vault = getBossVault(state, myPlayerIndex);
  const event = reclaimBossVault(state, myPlayerIndex);
  if (!event || !vault?.card) return;
  state.boughtCardIds = [vault.card.id];
  state.lastAction = { id: newActionId(), type: 'bossVaultReclaim', playerId: myPlayerIndex, bossEvent: event, ts: Date.now() };
  renderAll();
  const commitPromise = commitState();
  const toEl = cardElById(vault.card.id);
  if (fromRect && toEl) {
    toEl.style.visibility = 'hidden';
    await flyRectToRect(vault.card, fromRect, getRect(toEl), 'front');
    toEl.style.visibility = '';
  }
  await commitPromise;
  showMessage('Garantia recuperada. Esta foi a compra obrigatoria do seu turno.');
}

function renderBossVaultSlot(root, player, isLocal = false) {
  if (!root) return;
  if (!player) {
    root.style.display = 'none';
    root.innerHTML = '';
    root.onclick = null;
    return;
  }
  const vault = getBossVault(state, player.id);
  if (!vault) {
    root.style.display = 'none';
    root.innerHTML = '';
    root.onclick = null;
    return;
  }
  const cardFace = isLocal ? cardFrontHTML(vault.card) : '<span class="boss-vault-hidden">?</span>';
  const reclaimRequired = isBossVaultDrawRequired(state, player.id) && state.currentPlayer === player.id;
  root.style.display = 'grid';
  root.classList.toggle('boss-vault-required', reclaimRequired);
  root.innerHTML = `<div class="boss-vault-card carta mini ${isLocal ? `${suitClass(vault.card)} ${deckFaceClass(vault.card)}` : 'boss-vault-card-back'}">${cardFace}</div><div class="boss-vault-copy"><span class="boss-vault-kicker">GARANTIA NO COFRE</span><small>${player.name}</small><strong>${reclaimRequired ? 'RESGATAR PARA COMPRAR' : 'Substitui a próxima compra'}</strong></div><i class="boss-vault-seal" aria-hidden="true"></i>`;
  root.onclick = isLocal ? reclaimLocalBossVault : null;
}

async function animateBossForcedSwap(feedback) {
  const eventId = feedback.eventId || feedback.actionId;

  if (!eventId || lastAnimatedBossSwapId === eventId) return;

  lastAnimatedBossSwapId = eventId;

  const sentCards = feedback.sentCards || [];
  const receivedCards = feedback.receivedCards || [];

  const mine = receivedCards.find((received) => received.playerId === myPlayerIndex);

  // O estado já contém a carta recebida antes de a animação começar.
  // Esconde somente essa carta para ela não aparecer duplicada durante o voo.
  const receivedCardElement = mine ? cardElById(mine.cardId) : null;

  if (receivedCardElement) {
    receivedCardElement.style.visibility = 'hidden';
  }

  // Mostra previamente as duas cartas que serão trocadas,
  // sem esconder o restante das mãos.
  const previews = sentCards
    .map((sent) => {
      const fromRect = opponentAnchorRect(sent.playerId);

      if (!fromRect || !sent.card) return null;

      const preview = document.createElement('div');

      preview.className = `carta boss-swap-preview ${suitClass(sent.card)} ${deckFaceClass(sent.card)}`;

      preview.innerHTML = cardFrontHTML(sent.card);

      Object.assign(preview.style, {
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
      });

      document.body.appendChild(preview);

      return {
        preview,
        sent,
        fromRect,
      };
    })
    .filter(Boolean);

  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await new Promise((resolve) => setTimeout(resolve, 480));
    }

    // Remove as prévias quando o movimento realmente começa.
    previews.forEach(({ preview }) => preview.remove());

    await Promise.all(
      previews.map(async ({ sent, fromRect }) => {
        const toRect = opponentAnchorRect(sent.toPlayerId);

        if (toRect) {
          await flyRectToRect(sent.card, fromRect, toRect, 'front');
        }
      }),
    );
  } finally {
    previews.forEach(({ preview }) => preview.remove());

    if (receivedCardElement) {
      receivedCardElement.style.visibility = '';
    }
  }

  const expiresAt = Date.now() + 4200;

  receivedCards.forEach((received) => {
    bossSwapReceivedHighlights.set(received.cardId, {
      eventId,
      fromPlayerId: received.fromPlayerId,
      expiresAt,
    });
  });

  renderHand();

  if (mine) {
    const sender = state.players.find((player) => player.id === mine.fromPlayerId);

    showMessage(`Você recebeu ${mine.cardLabel} de ${sender?.name || 'outro jogador'}.`);
  }

  setTimeout(() => {
    receivedCards.forEach((received) => {
      bossSwapReceivedHighlights.delete(received.cardId);
    });

    renderHand();
  }, 4300);
}

function setBossPortrait(image, definition) {
  if (!image || !definition) return;
  const frame = image.closest('.boss-portrait');
  const source = definition.portrait || 'assets/images/boss-banqueiro.png';
  const fallbackLabel =
    String(definition.name || 'Chefe')
      .split(/\s+/)
      .filter((part) => part.length > 2)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'CM';
  if (frame) frame.dataset.fallbackLabel = fallbackLabel;
  image.onload = () => {
    image.style.display = '';
    frame?.classList.remove('boss-portrait-fallback');
  };
  image.onerror = () => {
    image.onerror = null;
    image.style.display = 'none';
    frame?.classList.add('boss-portrait-fallback');
  };
  if (image.dataset.portraitSource !== source) {
    frame?.classList.remove('boss-portrait-fallback');
    image.dataset.portraitSource = source;
    image.style.display = '';
    image.src = source;
  }
}

function renderBossHud() {
  const hud = document.getElementById('bossHud');
  const resultSection = document.getElementById('bossResultSection');
  const bossMode = isCurrentBossMode();
  document.body.classList.toggle('boss-mode', bossMode);
  if (!bossMode) {
    document.body.removeAttribute('data-boss-id');
    if (hud) hud.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    renderBossVaultSlot(document.getElementById('bossLocalVaultSlot'), null, true);
    return;
  }

  const boss = normalizeBossState(state);
  const definition = getBossDefinition(boss.id);
  const isDominatrix = boss.id === 'dominadora';
  const isMatriarch = boss.id === 'matriarca_esmeralda';
  document.body.dataset.bossId = boss.id;
  const flow = boss.bossFlow;
  const resolvingEvent = flow?.stage === 'result' ? boss.eventLog?.find((entry) => entry.actionId === flow.eventActionId) || null : null;
  hud.style.display = 'grid';
  hud.classList.remove('boss-resolving');
  hud.classList.toggle('boss-turn-active', isBossTurnActive(state));
  const cocoonActive = isMatriarch && boss.emeraldCocoon?.status === 'active';
  const cocoonMaximum = 180;
  const cocoonRemaining = cocoonActive ? Math.max(0, Number(boss.emeraldCocoon.remaining) || 0) : 0;
  hud.classList.toggle('boss-cocoon-active', cocoonActive);
  hud.dataset.cocoonStage = cocoonActive ? (cocoonRemaining <= 60 ? 'critical' : cocoonRemaining <= 120 ? 'cracked' : 'full') : '';
  const cocoonStrength = cocoonActive ? cocoonRemaining / cocoonMaximum : 0;
  hud.style.setProperty('--boss-cocoon-strength', String(cocoonStrength));
  hud.style.setProperty('--boss-cocoon-opacity', String(0.5 + cocoonStrength * 0.35));
  hud.style.setProperty('--boss-cocoon-detail-opacity', String(0.42 + cocoonStrength * 0.4));
  const springCrownBuffed = isMatriarch && ['root_prepared', 'root_active'].includes(boss.springCrown?.status);
  hud.classList.toggle('boss-spring-crown-buffed', springCrownBuffed);
  hud.dataset.springCrownStage = springCrownBuffed ? boss.springCrown.status : '';
  document.getElementById('bossName').textContent = (definition?.name || 'CHEFE').toUpperCase();
  setBossPortrait(document.getElementById('bossPortraitImage'), definition);
  document.getElementById('bossPhase').textContent = `FASE ${boss.phase} · ${getBossPhaseName(state)}`;
  const phaseRules = {
    1: 'Próxima fase: primeiro morto, monte com 40 cartas ou HP em 70%.',
    2: 'Próxima fase: segundo morto, monte com 18 cartas ou HP em 35%.',
    3: 'Fase final.',
  };
  document.getElementById('bossPhaseRule').textContent = phaseRules[boss.phase];
  document.getElementById('bossHpText').textContent = `${boss.hp} / ${boss.maxHp}`;
  document.getElementById('bossHpBar').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  const cocoonMeter = document.getElementById('bossCocoonMeter');
  const cocoonText = document.getElementById('bossCocoonText');
  if (cocoonMeter && cocoonText) {
    cocoonMeter.hidden = !cocoonActive;
    cocoonText.textContent = `${cocoonRemaining} / ${cocoonMaximum}`;
    cocoonMeter.setAttribute('aria-label', cocoonActive ? `Casulo Esmeralda: ${cocoonRemaining} de ${cocoonMaximum} de protecao restante` : 'Casulo Esmeralda inativo');
  }
  const dangerMeter = document.getElementById('bossDangerMeter');
  const chainStatus = document.getElementById('bossChainStatus');
  const bloomFlowers = document.getElementById('bossBloomFlowers');
  dangerMeter.style.display = isDominatrix ? 'none' : 'block';
  chainStatus.style.display = isDominatrix ? 'grid' : 'none';
  dangerMeter.classList.toggle('boss-bloom-meter', isMatriarch);
  bloomFlowers.style.display = isMatriarch ? 'flex' : 'none';
  if (isDominatrix) {
    chainStatus.innerHTML = state.players
      .map((player) => {
        const chains = getBossChains(state, player.id);
        const links = Array.from({ length: 4 }, (_, index) => `<i class="boss-chain-link${index < chains ? ' active' : ''}"></i>`).join('');
        const dominated = chains >= 4;
        const controlled = chains === 3;
        const notice = dominated
          ? '<small class="boss-dominated-notice"><strong>DOMINADO — 4 CORRENTES</strong><span>Não pode pegar o lixo nem criar jogos novos. Pode comprar do monte, alimentar jogos existentes e descartar.</span></small>'
          : controlled
            ? '<small class="boss-dominated-notice boss-controlled-notice"><strong>SOB CONTROLE — 3 CORRENTES</strong><span>Não pode criar jogos novos, mas pode alimentar jogos existentes.</span></small>'
            : '';
        return `<div class="boss-chain-player${dominated ? ' dominated' : ''}" data-player-id="${player.id}"><span>${player.name}</span><span class="boss-chain-links">${links}</span>${notice}</div>`;
      })
      .join('');
  } else {
    document.getElementById('bossDangerLabel').textContent = isMatriarch ? 'FLORESCIMENTO' : 'DÍVIDA COLETIVA';
    document.getElementById('bossDebtText').textContent = `${boss.danger} / ${boss.maxDanger}`;
    document.getElementById('bossDebtBar').style.width = `${Math.max(0, (boss.danger / boss.maxDanger) * 100)}%`;
    const bloomEventChanged = isMatriarch && boss.lastBloomEventId && boss.lastBloomEventId !== lastRenderedBossBloomEventId;
    const previousBloom = lastRenderedBossBloom;
    bloomFlowers.innerHTML = isMatriarch
      ? Array.from({ length: 5 }, (_, index) => {
          const isOpen = index < boss.bloom;
          const isOpening = bloomEventChanged && previousBloom != null && boss.bloom > previousBloom && index >= previousBloom && index < boss.bloom;
          const isWilting = bloomEventChanged && previousBloom != null && boss.bloom < previousBloom && index >= boss.bloom && index < previousBloom;
          return `<i class="${[isOpen ? 'open' : '', isOpening ? 'opening' : '', isWilting ? 'wilting' : ''].filter(Boolean).join(' ')}" title="Flor ${index + 1}">✿</i>`;
        }).join('')
      : '';
    if (isMatriarch) {
      lastRenderedBossBloom = boss.bloom;
      lastRenderedBossBloomEventId = boss.lastBloomEventId || null;
    }
  }
  renderBossVaultSlot(document.getElementById('bossLocalVaultSlot'), state.players[myPlayerIndex], true);

  const actionPresentation = buildBossActionPresentation(state);
  document.getElementById('bossActionType').textContent = actionPresentation.category.toUpperCase();
  document.getElementById('bossIntentName').textContent = actionPresentation.name;

  const intentDescription = document.getElementById('bossIntentDescription');
  const intentProgress = document.getElementById('bossIntentProgress');
  const activeHarvestThreat = [...(boss.natureThreats || [])].reverse().find((threat) => threat.type === 'harvest' && threat.status === 'active');
  const harvestIntent = boss.currentIntent?.abilityId === 'harvest' ? boss.currentIntent : null;
  const isHarvestLive = isMatriarch && flow?.stage !== 'result' && Boolean(activeHarvestThreat || harvestIntent);

  if (isHarvestLive) {
    const targetPlayerId = activeHarvestThreat?.targetPlayerId || harvestIntent?.payload?.targetPlayerId;
    const targetPlayer = state.players.find((player) => player.id === targetPlayerId);
    const cards = targetPlayer?.hand?.length ?? Number(activeHarvestThreat?.observedHandSize || 0);
    const discardNeeded = Math.max(0, cards - 7);
    const currentBand = cards <= 7 ? 'safe' : cards <= 10 ? 'warning' : 'danger';
    const countText = cards <= 7 ? `✅ ${cards} carta${cards === 1 ? '' : 's'} · meta atingida` : `${cards >= 11 ? '🔴' : '🟡'} ${cards} cartas · descarte ${discardNeeded}`;

    intentDescription.className = 'boss-harvest-panel';
    intentDescription.innerHTML = `
      <span class="boss-harvest-hint">
       ${targetPlayer ? `${targetPlayer.name} ` : ''}: Descarte cartas. O total na sua mão ao fim do turno define o efeito.
      </span>
      <span class="boss-harvest-count ${currentBand}">${countText}</span>
      <span class="boss-harvest-rules">
        <span class="boss-harvest-rule ${currentBand === 'safe' ? 'active' : ''}">
          <b>0–7</b><span>Sem efeito</span>
        </span>
        <span class="boss-harvest-rule ${currentBand === 'warning' ? 'active' : ''}">
          <b>8–10</b><span>Cura 60 HP</span>
        </span>
        <span class="boss-harvest-rule ${currentBand === 'danger' ? 'active' : ''}">
          <b>11+</b><span>+1 Flor e cura 100 HP</span>
        </span>
      </span>
    `;

    intentProgress.className = '';
    intentProgress.textContent = '';
  } else {
    intentDescription.className = '';
    intentDescription.textContent = actionPresentation.instruction;
    intentProgress.className = '';
    const intentProgressParts = [actionPresentation.progress, actionPresentation.consequence].filter(Boolean);
    intentProgress.textContent = intentProgressParts.join(actionPresentation.progress?.includes('\n') ? '\n' : ' · ');
  }

  renderBossDetailFields(document.getElementById('bossActionDetails'), actionPresentation.details);

  const dialoguePanel = document.getElementById('bossDialoguePresentation');
  const dialogueVisible = ['ability', 'phase', 'taunt'].includes(flow?.stage) && !hasPendingBossChoices(state);
  dialoguePanel.style.display = dialogueVisible ? 'grid' : 'none';
  if (dialogueVisible) {
    const objective = [actionPresentation.instruction !== actionPresentation.speech ? actionPresentation.instruction : '', actionPresentation.consequence].filter(Boolean).join(' · ') || `A Fase ${boss.phase} está ativa.`;
    document.getElementById('bossDialogueType').textContent = flow.stage === 'ability' ? 'NOVA HABILIDADE' : 'O CHEFE DIZ';
    document.getElementById('bossDialogueName').textContent = actionPresentation.name;
    document.getElementById('bossDialogueSpeech').textContent = actionPresentation.speech ? `“${actionPresentation.speech}”` : '';
    document.getElementById('bossDialogueConsequence').textContent = objective;
  }
  document.querySelectorAll('#bossPhaseTrack [data-phase]').forEach((phaseNode) => {
    const phaseNumber = Number(phaseNode.dataset.phase);
    phaseNode.classList.toggle('complete', phaseNumber < boss.phase);
    phaseNode.classList.toggle('active', phaseNumber === boss.phase);
  });
  const persistentPossessions = (boss.possessions || []).map((possession) => ({
    id: 'possession',
    meldIndex: possession.meldIndex,
    progress: possession.progress || 0,
    required: possession.required || state.players.length || 2,
    contributorPlayerIds: possession.contributorPlayerIds || [],
    suppressedDamage: possession.suppressedDamage || 0,
  }));
  const natureSummaries = isMatriarch ? getBossNatureThreatSummaries(state) : [];
  const natureEffects = [];
  if (boss.emeraldCocoon?.status === 'active') natureEffects.push({ id: 'emerald_cocoon', remaining: boss.emeraldCocoon.remaining });
  if (boss.springCrown && ['active', 'root_prepared', 'root_active'].includes(boss.springCrown.status)) {
    const markedThreat = (boss.natureThreats || []).find((threat) => threat.id === boss.springCrown.markedThreatId);
    natureEffects.push({
      id: 'spring_crown',
      status: boss.springCrown.status,
      markedThreatName: boss.springCrown.markedThreatName || markedThreat?.name || 'Ameaca natural',
    });
  }
  const tacticalEffects = [];
  if (boss.currentIntent?.abilityId === 'hands_tied') tacticalEffects.push({ id: 'hands_tied_team', ...boss.currentIntent.payload });
  (boss.activeOrders || []).filter((order) => order.status === 'active').forEach((order) => tacticalEffects.push({ id: 'dominatrix_order', ...order }));
  (boss.interdicts || []).filter((interdict) => interdict.status === 'active').forEach((interdict) => tacticalEffects.push({ id: 'interdict', ...interdict }));
  if (boss.creditLimit?.status === 'active') tacticalEffects.push({ id: 'credit_limit', ...boss.creditLimit });
  if (boss.discardSurcharge?.status === 'active') tacticalEffects.push({ id: 'discard_surcharge', ...boss.discardSurcharge });
  document.getElementById('bossEffects').innerHTML =
    [...(boss.effects || []), ...persistentPossessions, ...natureEffects, ...tacticalEffects]
      .map((effect) => {
        if (effect.id === 'maintenance_fee') return `<span class="boss-effect-chip">Tarifa: +${effect.extraDraw} carta${effect.extraDraw === 1 ? '' : 's'} financiada${effect.extraDraw === 1 ? '' : 's'} · Dívida +${effect.financedDebt} cada</span>`;
        if (effect.id === 'financed_card') {
          const owner = state.players.find((player) => player.id === effect.playerId);
          const card = owner?.hand?.find((entry) => entry.id === effect.cardId);
          return `<span class="boss-effect-chip boss-financed-chip">$ ${owner?.name || 'Jogador'}: ${card ? `${card.rank}${card.suit}` : 'carta'} financiada · +${effect.debtPerCard}</span>`;
        }
        if (effect.id === 'choice_lock') {
          const owner = state.players.find((player) => player.id === effect.playerId);
          const card = owner?.hand?.find((entry) => entry.id === effect.cardId);
          const label = card ? `${card.rank}${card.suit}` : 'carta';
          return `<span class="boss-effect-chip">⛓ ${owner?.name || 'Jogador'}: ${label} presa</span>`;
        }
        if (effect.id === 'possession') {
          const contributors = (effect.contributorPlayerIds || []).map((playerId) => state.players.find((player) => player.id === playerId)?.name).filter(Boolean);
          return `<span class="boss-effect-chip">Posse: jogo ${effect.meldIndex + 1} · ${effect.progress}/${effect.required} (${contributors.join(' + ') || 'sem contribuicoes'}) · ${effect.suppressedDamage} dano suspenso</span>`;
        }
        if (effect.id === 'emerald_cocoon') return `<span class="boss-effect-chip boss-nature-chip">Casulo: ${effect.remaining}/180</span>`;
        if (effect.id === 'spring_crown') {
          if (effect.status === 'root_active') return '<span class="boss-effect-chip boss-nature-chip boss-crown-chip">Coroa fortalecida · Raiz Fortalecida ativa</span>';
          if (effect.status === 'root_prepared') return '<span class="boss-effect-chip boss-nature-chip boss-crown-chip">Coroa fortalecida · Raiz Fortalecida preparada</span>';
          return `<span class="boss-effect-chip boss-nature-chip">A Coroa marcou: ${effect.markedThreatName}</span>`;
        }
        if (effect.id === 'hands_tied_team')
          return `<span class="boss-effect-chip">Maos Atadas: ${effect.teamMeldAvailable === false ? `criacao consumida por ${state.players.find((player) => player.id === effect.consumedByPlayerId)?.name || 'cooperador'}` : '1 criacao disponivel para a equipe'}</span>`;
        if (effect.id === 'dominatrix_order') return `<span class="boss-effect-chip">Ordem: ${effect.label || effect.suitLabel || effect.type} · ${state.players.find((player) => player.id === effect.targetPlayerId)?.name || 'alvo'}</span>`;
        if (effect.id === 'interdict') return `<span class="boss-effect-chip">Interdito: jogo ${Number(effect.meldIndex) + 1} · primeira evolucao</span>`;
        if (effect.id === 'credit_limit') return `<span class="boss-effect-chip">Credito ${new Set(effect.countedCardIds || []).size}/${effect.allowance} · cobranca ${effect.chargedDebt || 0}/${effect.maxCharge}</span>`;
        if (effect.id === 'discard_surcharge') return `<span class="boss-effect-chip">Agio do Lixo: +${effect.amount} Divida na primeira retirada valida</span>`;
        return `<span class="boss-effect-chip">${effect.id}</span>`;
      })
      .join('') +
    natureSummaries
      .map(
        (summary) => `
      <article class="boss-nature-threat-detail${summary.urgent ? ' is-urgent' : ''}" data-threat-id="${summary.id}">
        <header><strong>${summary.name}</strong>${summary.urgent ? '<span>MAIS URGENTE</span>' : ''}</header>
        <dl>
          <div><dt>Alvo</dt><dd>${summary.target}</dd></div>
          <div><dt>Prazo</dt><dd>${summary.deadline}</dd></div>
          <div><dt>Condição</dt><dd>${summary.condition}</dd></div>
          <div><dt>Falha</dt><dd>${summary.consequence}</dd></div>
          <div><dt>Cura prevista</dt><dd>${summary.predictedHeal} HP</dd></div>
        </dl>
      </article>
    `,
      )
      .join('');

  const choicePanel = document.getElementById('bossChoicePanel');
  const myChoice = getBossPendingChoice(state, myPlayerIndex);
  const pendingChoice = boss.pendingChoices?.[0] || null;
  const choiceLabels = {
    draw2: 'Comprar 2 cartas',
    chain: 'Receber 1 Chicote',
    order: 'Aceitar a ordem',
    lock_card: 'Prender 1 carta',
    break_meld: 'Retirar carta da canastra',
    full: 'Pagar valor integral',
  };
  const animateForcedChoiceDraw = async (event, playerId, fromRect) => {
    if (playerId !== myPlayerIndex || !fromRect) return;
    const player = state.players.find((entry) => entry.id === playerId);
    const receivedCards = event.drawnCardIds
      .slice(0, 2)
      .map((cardId) => player?.hand.find((card) => card.id === cardId))
      .filter(Boolean);
    await Promise.all(
      receivedCards.map((card) => {
        const toEl = cardElById(card.id);
        if (!toEl) return Promise.resolve();
        toEl.style.visibility = 'hidden';
        return flyRectToRect(card, fromRect, getRect(toEl), 'back').then(() => {
          if (toEl) toEl.style.visibility = '';
        });
      }),
    );
  };
  if (myChoice && !state.finished) {
    choicePanel.style.display = 'flex';
    document.getElementById('bossChoicePrompt').textContent =
      myChoice.type === 'break_will'
        ? 'Quebra de Vontade: escolha sua punição.'
        : myChoice.type === 'fixed_interest_payment'
          ? 'Juros Fixos: pague o valor integral ou escolha um garantidor.'
          : myChoice.type === 'banker_collateral_card'
            ? 'Escolha uma carta sua para enviar ao Cofre.'
            : myChoice.type === 'final_order_draw'
              ? 'Ordem Final: escolha entre comprar 2 cartas que ficarao presas no proximo turno ou receber 1 Chicote.'
              : myChoice.type === 'final_order_lock'
                ? 'Ordem Final: escolha entre deixar 1 carta aleatoria da sua mao presa no proximo turno ou receber 1 Chicote.'
                : myChoice.type === 'forced_choice' && myChoice.order?.description
                  ? `Escolha Forçada: receba 1 Chicote agora ou aceite a ordem: ${myChoice.order.description}`
                  : 'A Dominadora exige uma escolha.';
    const actions = document.getElementById('bossChoiceActions');
    actions.innerHTML = myChoice.options
      .map((option) => {
        let label = choiceLabels[option] || option;
        if (option.startsWith('guarantee:')) {
          const player = state.players.find((entry) => entry.id === Number(option.split(':')[1]));
          label = `Garantia: ${player?.name || 'Jogador'}`;
        } else if (option.startsWith('card:')) {
          const card = state.players[myPlayerIndex]?.hand?.find((entry) => entry.id === option.slice(5));
          label = card ? `${card.rank}${card.suit}` : 'Carta';
        }
        return `<button type="button" data-boss-choice="${option}">${label}</button>`;
      })
      .join('');
    actions.querySelectorAll('[data-boss-choice]').forEach((button) => {
      button.onclick = async () => {
        if (!state || state.finished || !getBossPendingChoice(state, myPlayerIndex)) return;
        const stockEl = document.querySelector('#drawStockBtn .pile-card');
        const stockRect = stockEl ? getRect(stockEl) : null;
        const selectedCollateralId = button.dataset.bossChoice.startsWith('card:') ? button.dataset.bossChoice.slice(5) : '';
        const selectedCollateralEl = selectedCollateralId ? cardElById(selectedCollateralId) : null;
        const selectedCollateralRect = selectedCollateralEl ? getRect(selectedCollateralEl) : null;
        localUndoStack = [];
        const event = resolveBossChoice(state, myPlayerIndex, button.dataset.bossChoice);
        if (!event) return;
        if (state.boss?.result) {
          state.finished = true;
          state.winnerTeamId = state.boss.result.victory ? 0 : 1;
        }
        if (event.drawnCardIds?.length) {
          state.boughtCardIds = [...event.drawnCardIds];

          const lockedMessage = event.lockedCardLabels?.length ? ` ${event.lockedCardLabels.join(' e ')} ficaram presas.` : ' As duas cartas ficaram presas.';

          showMessage(`2 cartas adicionadas à sua mão.${lockedMessage} Sua compra normal do turno continua sendo 1 carta.`);
        } else if (event.choiceType === 'final_order_lock' && event.lockedCardLabel) {
          showMessage(`Ordem Final: ${event.lockedCardLabel} ficou presa durante o proximo turno completo.`);
        }
        state.lastAction = { id: newActionId(), type: 'bossChoice', playerId: myPlayerIndex, bossEvent: event, ts: Date.now() };
        renderAll();
        const commitPromise = commitState();
        if (event.drawnCardIds?.length) await animateForcedChoiceDraw(event, myPlayerIndex, stockRect);
        if (event.collateralCardId && selectedCollateralRect) {
          const vaultSlot = document.getElementById('bossLocalVaultSlot');
          const vaultCard = getBossVault(state, myPlayerIndex)?.card;
          if (vaultSlot && vaultCard) await flyRectToRect(vaultCard, selectedCollateralRect, getRect(vaultSlot), 'front');
        }
        await commitPromise;
        if (!hasPendingBossChoices(state)) startTurnTimerIfNeeded();
      };
    });
  } else if (pendingChoice && !state.finished) {
    const target = state.players.find((player) => player.id === pendingChoice.playerId);
    choicePanel.style.display = 'flex';
    document.getElementById('bossChoicePrompt').textContent = `Aguardando ${target?.name || 'o jogador alvo'} decidir.`;
    document.getElementById('bossChoiceActions').innerHTML = '';
  } else {
    choicePanel.style.display = 'none';
    document.getElementById('bossChoiceActions').innerHTML = '';
  }

  document.getElementById('bossTotalDamage').textContent = `${boss.stats.totalDamage || 0} de dano total`;

  const reactionPanel = document.getElementById('bossDamageReaction');
  const activeDamageReaction = Number(boss.damageReaction?.until || 0) > Date.now() ? boss.damageReaction : null;
  const activeHealReaction = Number(boss.healReaction?.until || 0) > Date.now() ? boss.healReaction : null;
  const reaction = activeDamageReaction || activeHealReaction;
  const reactionRemaining = Number(reaction?.until || 0) - Date.now();
  if (bossDamageReactionTimer) {
    clearTimeout(bossDamageReactionTimer);
    bossDamageReactionTimer = null;
  }
  if (reaction?.text && reactionRemaining > 0) {
    reactionPanel.textContent = `“${reaction.text}”`;
    reactionPanel.style.display = 'block';
    reactionPanel.dataset.reactionId = reaction.id || '';
    bossDamageReactionTimer = setTimeout(() => {
      reactionPanel.style.display = 'none';
      bossDamageReactionTimer = null;
    }, reactionRemaining);
  } else reactionPanel.style.display = 'none';

  const playersInRound = state.players.length || 2;
  const turnsCompleted = boss.playersActedThisRound?.length || 0;
  const displayedTurn = Math.min(turnsCompleted + 1, playersInRound);
  const actor = state.players?.[state.currentPlayer];
  document.getElementById('bossRoundNumber').textContent = `Rodada ${boss.roundNumber}`;
  document.getElementById('bossRoundTurn').textContent = `Turno ${displayedTurn}/${playersInRound}`;
  document.getElementById('bossCurrentActor').textContent = isBossTurnActive(state) ? `Agora: ${definition?.name || 'Chefe'}` : actor ? `Agora: ${actor.name}` : 'Agora: aguardando';

  const kindLabels = { suja: 'Canastra suja', limpa: 'Canastra limpa', real: 'Canastra real', asas: 'Canastra Ás-a-Ás' };
  const describeBossEvent = (entry) => {
    if (entry.type === 'bossDamage')
      return {
        icon: '💥',
        title: kindLabels[entry.newKind] || 'Ataque da equipe',
        detail: `${entry.damage} de dano${entry.dangerChangeLabel ? ` · ${entry.dangerChangeLabel}` : ''}${entry.chainsRemoved ? ` · ${entry.chainsRemoved} Chicote removido` : ''}${entry.possessionProgress != null ? ` · Posse ${entry.possessionProgress}/2` : ''}`,
      };
    if (entry.type === 'bossAbility') return { icon: '💼', title: `${definition?.name || 'Chefe'} — ${entry.name || 'Habilidade'}`, detail: entry.outcome || 'Habilidade resolvida' };
    if (entry.type === 'chainChange') return { icon: '⛓', title: entry.amount > 0 ? 'Chicote aplicado' : 'Resistência', detail: `${state.players.find((player) => player.id === entry.playerId)?.name || 'Jogador'}: ${entry.chains}/4 Chicotes` };
    if (entry.type === 'chainOverflow') return { icon: '⛓', title: 'Chicote transferido', detail: entry.outcome || 'O excesso de Chicotes foi transferido ao parceiro.' };
    if (entry.type === 'dominatrixOrder') return { icon: '👑', title: 'Ordem da Dominadora', detail: entry.outcome || 'A ordem foi resolvida.' };
    if (entry.type === 'creditLimit') return { icon: '🪙', title: 'Limite de Crédito', detail: entry.outcome || `Dívida +${entry.debtAdded || 0}` };
    if (entry.type === 'discardSurcharge') return { icon: '🪙', title: 'Sobretaxa do Lixo', detail: entry.outcome || `Dívida +${entry.amount || 0}` };
    if (entry.type === 'bossChoice') return { icon: '👑', title: 'Escolha cumprida', detail: entry.outcome };
    if (entry.type === 'debtReduction') return { icon: '🛡️', title: 'Morto conquistado', detail: entry.dangerChangeLabel || `Morto conquistado: Dívida -${entry.amount}` };
    if (entry.type === 'bossHeal') return { icon: '✿', title: entry.origin || 'Cura natural', detail: `HP +${entry.amount}` };
    if (entry.type === 'bloomChange') return { icon: '🌸', title: entry.origin || 'Florescimento', detail: `${entry.amount > 0 ? '+' : ''}${entry.amount} Flor${Math.abs(entry.amount) === 1 ? '' : 'es'}` };
    if (entry.type === 'natureThreat') return { icon: '🌿', title: `${definition?.name || 'Matriarca'} — ${entry.name || 'Ameaça natural'}`, detail: entry.outcome || 'A ameaça foi plantada na mesa.' };
    if (entry.type === 'rebirth') return { icon: '✨', title: 'Renascimento Esmeralda', detail: entry.outcome || 'A Matriarca retornou com 300 HP.' };
    if (entry.type === 'playerTurn') return { icon: '👥', title: `${entry.playerName} concluiu o turno`, detail: `${entry.cardsInHand} carta(s) na mão` };
    if (entry.type === 'finalStrike') return { icon: '⚔️', title: 'Ataque final', detail: `${entry.damage} de dano` };
    return { icon: '📋', title: 'Evento da batalha', detail: entry.outcome || entry.reason || 'Estado atualizado' };
  };
  const escapeLogHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  const logEntries = [...(boss.eventLog || [])].slice(-24).reverse();
  const groupedLog = new Map();
  logEntries.forEach((entry) => {
    const round = Number(entry.round || boss.roundNumber || 1);
    if (!groupedLog.has(round)) groupedLog.set(round, []);
    groupedLog.get(round).push(entry);
  });
  const latestLog = boss.eventLog?.[boss.eventLog.length - 1];
  const latestLogKey = latestLog ? `${latestLog.actionId || latestLog.id || latestLog.type}:${latestLog.at || latestLog.round || 0}` : null;
  const detailsOpen = document.getElementById('bossBattleDetails')?.open;
  if (detailsOpen && latestLogKey) lastSeenBossLogKey = latestLogKey;
  const newLogMarker = document.getElementById('bossLogNew');
  if (newLogMarker) newLogMarker.hidden = !latestLogKey || latestLogKey === lastSeenBossLogKey || !!detailsOpen;
  document.getElementById('bossLogCount').textContent = String(boss.eventLog?.length || 0);
  document.getElementById('bossEventLog').innerHTML = groupedLog.size
    ? [...groupedLog.entries()]
        .map(
          ([round, entries]) => `
        <section class="boss-log-round">
          <h4>RODADA ${round}</h4>
          ${entries
            .map((entry) => {
              const info = describeBossEvent(entry);
              const time = entry.at ? new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `R${round}`;
              return `<div class="boss-log-entry"><span class="boss-log-icon">${info.icon}</span><span class="boss-log-copy"><strong>${escapeLogHtml(info.title)}</strong><br>${escapeLogHtml(info.detail)}</span><span class="boss-log-time">${time}</span></div>`;
            })
            .join('')}
        </section>`,
        )
        .join('')
    : '<div class="boss-log-empty">A batalha ainda não registrou impactos.</div>';

  const discardButton = document.getElementById('drawDiscardBtn');
  if (discardButton) {
    discardButton.classList.toggle('boss-locked', isBossDiscardBlocked(state) && !state.hasDrawnThisTurn);
    const discardCardIds = new Set((state.discard || []).map((card) => card?.id).filter(Boolean));
    const pollenActive = (boss.natureThreats || []).some((threat) => threat.status === 'active' && ['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null && discardCardIds.has(threat.discardCardId));
    discardButton.classList.toggle('boss-pollen-discard', pollenActive);
    if (pollenActive) discardButton.setAttribute('aria-label', 'Lixo contaminado por Pólen da Matriarca');
    else discardButton.removeAttribute('aria-label');
    discardButton.classList.toggle('boss-surcharge-discard', boss.id === 'banker' && boss.discardSurcharge?.status === 'active');
  }

  const event = resolvingEvent || (boss.lastEvent?.type === 'bossAbility' ? null : boss.lastEvent);
  if (event?.actionId && event.actionId !== lastRenderedBossEventId) {
    lastRenderedBossEventId = event.actionId;
    if (event.type === 'bossDamage') {
      hud.classList.remove('boss-hit');
      void hud.offsetWidth;
      hud.classList.add('boss-hit');
    }
    const amount = event.damage ? `-${event.damage} HP` : '';
    if (amount) {
      const floating = document.createElement('div');
      floating.className = `boss-floating-number${event.damage ? '' : event.dangerDelta > 0 ? ' debt-up' : ' debt-down'}`;
      floating.textContent = amount;
      const rect = hud.getBoundingClientRect();
      floating.style.left = `${rect.left + rect.width / 2}px`;
      floating.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(floating);
      setTimeout(() => floating.remove(), 2600);
    }
  }

  const feedbackEvents = boss.eventLog || [];
  syncBossResourceSounds(boss);
  if (renderedBossFeedbackEventIds == null) {
    renderedBossFeedbackEventIds = new Set(feedbackEvents.map((event) => event.actionId).filter(Boolean));
    renderedBossFeedbackCount = feedbackEvents.length;
  } else {
    const newFeedback = feedbackEvents.filter((event) => {
      if (!event.actionId || renderedBossFeedbackEventIds.has(event.actionId)) return false;
      renderedBossFeedbackEventIds.add(event.actionId);
      return true;
    });
    renderedBossFeedbackCount = feedbackEvents.length;
    if (renderedBossFeedbackEventIds.size > 120) {
      const liveIds = new Set(feedbackEvents.map((event) => event.actionId).filter(Boolean));
      renderedBossFeedbackEventIds = new Set([...renderedBossFeedbackEventIds].filter((id) => liveIds.has(id)));
    }
    newFeedback.forEach((feedback, index) => {
      if (feedback.type === 'bossAbility' && feedback.abilityId === 'forced_swap' && feedback.actionId !== lastAnimatedBossSwapId && feedback.receivedCards?.length === 2) {
        void animateBossForcedSwap(feedback);
      }
      const isChain = feedback.type === 'chainChange' && feedback.amount;
      const isDebt = feedback.dangerChangeLabel && (feedback.type === 'bossAbility' || feedback.type === 'bossDamage' || feedback.type === 'debtReduction');
      const isHeal = feedback.type === 'bossHeal' && feedback.amount;
      const isBloom = feedback.type === 'bloomChange' && feedback.amount;
      const isRebirth = feedback.type === 'rebirth';
      const isCocoonAbsorb = feedback.type === 'bossDamage' && Number(feedback.absorbedDamage) > 0;
      const isCocoonBreak = feedback.type === 'bossDamage' && feedback.cocoonBroken;
      const isNatureCreated = feedback.type === 'bossAbility' && Array.isArray(feedback.threatIds) && feedback.threatIds.length > 0;
      if (isCocoonAbsorb) {
        const portrait = document.querySelector('#bossHud .boss-portrait');
        if (portrait) {
          const pulseClass = isCocoonBreak ? 'boss-cocoon-breaking' : 'boss-cocoon-impact';
          portrait.classList.remove('boss-cocoon-impact', 'boss-cocoon-breaking');
          void portrait.offsetWidth;
          portrait.classList.add(pulseClass);
          setTimeout(() => portrait.classList.remove(pulseClass), isCocoonBreak ? 820 : 620);
        }
      }
      if (!isChain && !isDebt && !isHeal && !isBloom && !isRebirth && !isCocoonAbsorb && !isCocoonBreak && !isNatureCreated) return;
      const floating = document.createElement('div');
      const visualClass = isChain
        ? feedback.amount > 0
          ? 'chain-up'
          : 'chain-down'
        : isHeal
          ? 'nature-heal-up'
          : isBloom
            ? feedback.amount > 0
              ? 'bloom-up'
              : 'bloom-down'
            : isRebirth
              ? 'nature-rebirth'
              : isCocoonBreak
                ? 'nature-cocoon-break'
                : isCocoonAbsorb
                  ? 'nature-cocoon-absorb'
                : isNatureCreated
                  ? 'nature-threat-created'
                  : feedback.dangerDelta > 0
                    ? 'debt-up'
                    : 'debt-down';
      floating.className = `boss-floating-number ${visualClass}`;
      floating.textContent = isChain
        ? `${feedback.amount > 0 ? '+' : '−'}${Math.abs(feedback.amount)} Chicote`
        : isHeal
          ? `HP +${feedback.amount}`
          : isBloom
            ? `${feedback.amount > 0 ? '+' : '−'}${Math.abs(feedback.amount)} Flor${Math.abs(feedback.amount) === 1 ? '' : 'es'}`
            : isRebirth
              ? 'RENASCIMENTO +300 HP'
              : isCocoonBreak
                ? `CASULO ROMPIDO · ${feedback.absorbedDamage || 0} ABSORVIDO`
                : isCocoonAbsorb
                  ? `CASULO ABSORVEU ${feedback.absorbedDamage}`
                : isNatureCreated
                  ? { living_seed: 'SEMENTE CRIADA', hungry_root: 'RAIZ CRIADA', twin_vines: 'TREPADEIRAS CRIADAS', graft: 'ENXERTO CRIADO', discard_pollen: 'PÓLEN CRIADO', royal_bloom: 'FLORESCIMENTO REAL' }[feedback.abilityId] || 'AMEAÇA CRIADA'
                  : feedback.dangerChangeLabel;
      const chainPlayer = isChain ? [...document.querySelectorAll('#bossChainStatus .boss-chain-player')].find((element) => String(element.dataset.playerId) === String(feedback.playerId)) : null;
      const anchor = isChain
        ? chainPlayer?.querySelector('.boss-chain-links')?.getBoundingClientRect()
        : isHeal || isRebirth
          ? document.getElementById('bossHpBar')?.parentElement?.getBoundingClientRect()
          : isCocoonBreak || isCocoonAbsorb
            ? document.querySelector('.boss-portrait')?.getBoundingClientRect()
            : isNatureCreated
              ? document.getElementById('bossIntentName')?.parentElement?.getBoundingClientRect()
              : document.getElementById('bossDangerMeter')?.getBoundingClientRect();
      if (!anchor) return;
      floating.style.left = `${anchor.left + anchor.width / 2}px`;
      floating.style.top = `${anchor.top + anchor.height / 2 + index * 8}px`;
      document.body.appendChild(floating);
      setTimeout(() => floating.remove(), isRebirth || isCocoonBreak ? 2500 : 2600);
    });
  }
  scheduleBossTurnAdvance();
}

function renderBossResult() {
  const section = document.getElementById('bossResultSection');
  if (!isCurrentBossMode() || !state.finished || !state.boss?.result) {
    section.style.display = 'none';
    return;
  }
  const boss = normalizeBossState(state);
  const presentation = buildBossFinalPresentation(state);
  const specialDefeatReasons = new Set(['max_debt', 'both_players_dominated', 'max_bloom']);
  const bossVictoryKey = `${gameId}:${boss.id}:${boss.seed || 0}:${boss.result.reason || ''}`;
  const persistedVictoryKey = sessionStorage.getItem('buraco_boss_victory_sound');
  if (!boss.result.victory && bossVictoryKey !== lastBossVictorySoundKey && bossVictoryKey !== persistedVictoryKey) {
    lastBossVictorySoundKey = bossVictoryKey;
    sessionStorage.setItem('buraco_boss_victory_sound', bossVictoryKey);
    playSfxClone(BOSS_SFX[boss.id]?.victory, { audioContext: audioCtx });
  }
  if (!boss.result.victory && specialDefeatReasons.has(boss.result.reason)) {
    section.dataset.specialDefeat = boss.id;
    section.classList.remove('boss-special-defeat');
    void section.offsetWidth;
    section.classList.add('boss-special-defeat');
    setTimeout(() => section.classList.remove('boss-special-defeat'), 2200);
  }
  section.dataset.outcome = boss.result.victory ? 'victory' : 'defeat';
  document.getElementById('bossResultTitle').textContent = presentation.outcome;
  document.getElementById('bossResultBossName').textContent = presentation.bossName.toUpperCase();
  document.getElementById('bossResultPortrait').src = presentation.portrait;
  document.getElementById('bossResultPortrait').alt = presentation.bossName;
  document.getElementById('bossResultDetail').textContent = presentation.reason;
  document.getElementById('bossFinalSpeech').textContent = `“${presentation.speech}”`;
  const stats = [
    ['HP restante', presentation.hp],
    [presentation.dangerLabel, presentation.danger],
    ['Dano total', presentation.totalDamage],
    ['Canastras', presentation.canastras],
    ['Rodadas', presentation.rounds],
    ['Ataque final', presentation.finalStrike],
  ];
  document.getElementById('bossResultStats').innerHTML = stats.map(([label, value]) => `<div class="boss-result-stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
  section.style.display = 'flex';
}

function renderAll() {
  if (!state) return;

  // Garante que a UI sempre destrave ao receber novo estado
  window.isAutoPlaying = false;

  // Gerenciador Síncrono da Vinheta Sensual para ambas as telas
  let stealOverlay = document.getElementById('sensualStealOverlay');
  if (!stealOverlay) {
    stealOverlay = document.createElement('div');
    stealOverlay.id = 'sensualStealOverlay';
    stealOverlay.className = 'sensual-steal-overlay';
    document.body.appendChild(stealOverlay);
  }

  if (state.powerActiveThisTurn && !state.finished) {
    stealOverlay.style.display = 'block';
    stealOverlay.classList.add('pulsing'); // Liga a animação de pulsação do CSS

    // Dispara o loop do coração batendo junto com o efeito visual
    syncHeartbeatAudio(true);

    setTimeout(() => {
      stealOverlay.style.opacity = '1';
    }, 20);
  } else {
    stealOverlay.style.opacity = '0';
    stealOverlay.classList.remove('pulsing'); // Desliga a pulsação do CSS

    // Pausa e reinicia o ponteiro do áudio para o início imediatamente
    syncHeartbeatAudio(false);

    setTimeout(() => {
      if (stealOverlay.style.opacity === '0') stealOverlay.style.display = 'none';
    }, 500);
  }
  const pi = document.querySelector('.player-interface');
  const bm = document.querySelector('.board-middle');
  if (pi) pi.style.pointerEvents = 'auto';
  if (bm) bm.style.pointerEvents = 'auto';

  // TRAVA DO DEVTOOLS: Força a exibição respeitando o botão de minimizar
  const debugPanel = document.getElementById('debugPanel');
  const debugMiniBtn = document.getElementById('debugMiniBtn');
  if (debugPanel && debugMiniBtn) {
    const isDebug = window.location.search.includes('debug=1') || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    if (isDebug) {
      debugPanel.style.display = window.isDevToolsOpen ? 'flex' : 'none';
      debugMiniBtn.style.display = window.isDevToolsOpen ? 'none' : 'block';
    } else {
      debugPanel.style.display = 'none';
      debugMiniBtn.style.display = 'none';
    }
  }

  applyViewTeamClass();
  // ... (resto da função continua igual)

  // Aplica o Estilo de Baralho (Theme) selecionado
  document.body.dataset.deckTheme = state.deckTheme || 'classico';
  if (!TABLE_THEME_IDS.includes(state.tableTheme)) state.tableTheme = 'cassino';
  document.body.dataset.tableTheme = state.tableTheme || document.body.dataset.tableTheme || 'feltro';
  syncTableAmbientMusic();
  const debugTableThemeSelect = document.getElementById('debugTableThemeSelect');
  if (debugTableThemeSelect && debugTableThemeSelect.value !== document.body.dataset.tableTheme) {
    debugTableThemeSelect.value = document.body.dataset.tableTheme;
  }
  updateAmbientMusicToggle();
  const debugDeckThemeSelect = document.getElementById('debugDeckThemeSelect');
  if (debugDeckThemeSelect && debugDeckThemeSelect.value !== document.body.dataset.deckTheme) {
    debugDeckThemeSelect.value = document.body.dataset.deckTheme;
  }
  syncMythicPhase();

  // Liga o visual FinDom se a partida estiver valendo PIX (para lógica de placar)
  if (state.isBetting) {
    document.body.classList.add('is-betting');
  } else {
    document.body.classList.remove('is-betting');
  }

  const badge = document.getElementById('gameModeBadge');
  if (badge) {
    let modeDisplay = state.mode;
    if (modeDisplay === '1x1_duploMorto') modeDisplay = '1x1 Humilhação';
    if (modeDisplay === '1x1_dominacao') modeDisplay = '1x1 Dominação';
    if (isBossMode(modeDisplay)) modeDisplay = `Chefe da Mesa · ${getBossDefinition(state.boss?.id)?.name || 'Chefe'}`;
    badge.textContent = `${modeDisplay} • Buraco ${state.variant}`;
  }

  renderBossHud();

  const commonActionsAllowed = canPerformCommonGameAction(state);
  const isMyTurnRightNow = !state.finished && state.currentPlayer === myPlayerIndex && commonActionsAllowed;

  const currP = currentPlayer();
  const pName = currP ? currP.name : 'Aguardando...';
  const cardCount = currP && currP.hand ? currP.hand.length : 0; // 🔥 CORREÇÃO: Variável declarada corretamente no escopo de renderAll

  document.getElementById('currentPlayerLabel').textContent = isMyTurnRightNow ? `Sua Vez! (${cardCount})` : `Vez de ${pName} (${cardCount})`;

  // Exibe o contador de cartas no chip de status do topo esquerdo
  document.getElementById('currentPlayerLabel').textContent = isMyTurnRightNow ? `Sua Vez! (${cardCount})` : `Vez de ${pName} (${cardCount})`;
  const currentChip = document.querySelector('.current-player-chip');
  if (currentChip) currentChip.classList.toggle('is-my-turn', isMyTurnRightNow);
  document.getElementById('stockCount').textContent = state.stock.length;

  // ==========================================================
  // MOTOR DE RENDERIZAÇÃO 3D DINÂMICO (Monte, Lixo e Mortos)
  // ==========================================================
  function updatePile3D(container, baseCardClass, count, backColor, keepArcade) {
    if (!container) return 0;

    container.querySelectorAll('.visual-layer').forEach((e) => e.remove());

    if (count === 0) {
      container.style.background = '';
      container.style.border = '';
      container.style.boxShadow = '';
      container.classList.add('empty-pile');
      if (backColor !== 'discard') container.classList.remove('back-red', 'back-blue');
      return 0;
    }

    container.classList.remove('empty-pile');
    container.style.setProperty('background', 'transparent', 'important');
    container.style.setProperty('border', 'none', 'important');
    container.style.setProperty('box-shadow', 'none', 'important');

    const isMorto = baseCardClass.includes('morto');
    const isDiscard = backColor === 'discard';
    const divisor = isMorto ? 1 : 3; // Lixo e Monte vão empilhar na mesma velocidade
    let layers = Math.ceil(count / divisor);
    if (layers < 1) layers = 1;
    if (layers > 16) layers = 16;

    const topClass = backColor === 'blue' ? 'back-blue' : backColor === 'red' ? 'back-red' : 'visual-discard-layer';

    for (let i = 0; i < layers; i++) {
      if (isDiscard && i === layers - 1) continue;

      const layer = document.createElement('div');
      const isTopLayer = i === layers - 1;

      // Intercala as cores herdando perfeitamente as classes do Tema
      let currentClass = topClass;
      if (!isDiscard) {
        const isBlueTop = topClass === 'back-blue';
        currentClass = (layers - 1 - i) % 2 === 0 ? topClass : isBlueTop ? 'back-red' : 'back-blue';
      }

      layer.className = `${baseCardClass} visual-layer ${currentClass}`;
      if (!isTopLayer && !isDiscard) {
        layer.classList.add('sub-layer'); // Aciona o CSS que apaga os ícones de dentro
      }
      if (keepArcade && isTopLayer) layer.classList.add('arcade-car-run');

      layer.style.position = 'absolute';
      layer.style.width = '100%';
      layer.style.height = '100%';
      layer.style.borderRadius = '6px';

      layer.style.bottom = `${i * 1.2}px`;
      layer.style.right = `${i * 0.3}px`;
      layer.style.zIndex = i;
      layer.style.margin = '0';

      // CORREÇÃO: Não injeta box-shadow na carta do topo para não esmagar o CSS do Tema Minimalista
      if (!isTopLayer || isDiscard) {
        if (i === 0) {
          layer.style.setProperty('box-shadow', '0 6px 12px rgba(0,0,0,0.8)', 'important');
        } else {
          layer.style.setProperty('box-shadow', '-0.5px 1px 1px rgba(0,0,0,0.7), inset 0 0 2px rgba(0,0,0,0.5)', 'important');
        }
      }

      if (isDiscard) {
        layer.style.background = '#f3f4f6';
        layer.style.border = '1px solid #d1d5db';
        layer.style.filter = `brightness(${0.6 + (i / layers) * 0.4})`;
      } else if (!isTopLayer) {
        // Escurece gradativamente para dar noção de profundidade na pilha
        layer.style.filter = `brightness(${0.4 + (i / layers) * 0.5})`;
      }

      container.appendChild(layer);
    }
    return layers;
  }

  // 1. Aplica o 3D no Monte
  const stockEl = document.querySelector('#drawStockBtn .pile-card');
  const count = state.stock.length;
  let stockClass = 'back-red';
  let keepArcade = false;
  if (count > 0) {
    stockClass = state.stock[count - 1].back === 'blue' ? 'back-blue' : 'back-red';
    keepArcade = stockEl ? stockEl.querySelector('.arcade-car-run') !== null : false;
  }
  updatePile3D(stockEl, 'pile-card', count, stockClass.replace('back-', ''), keepArcade);

  // 2. Aplica o 3D no Lixo
  const discardCount = state.discard.length;
  document.getElementById('discardCount').textContent = discardCount;
  const discardFace = document.getElementById('discardFace');
  const discardEl = document.querySelector('#drawDiscardBtn .pile-card');

  const discardLayers = updatePile3D(discardEl, 'pile-card', discardCount, 'discard', false);

  const discardTop = state.discard[discardCount - 1];
  const discardCardIds = new Set((state.discard || []).map((card) => card?.id).filter(Boolean));
  const pollenThreat = state.boss?.id === 'matriarca_esmeralda' ? (state.boss.natureThreats || []).find((threat) => threat.status === 'active' && threat.targetPlayerId == null && discardCardIds.has(threat.discardCardId)) : null;
  document.getElementById('drawDiscardBtn')?.classList.toggle('boss-pollen-discard', !!pollenThreat);
  document.getElementById('drawDiscardBtn')?.classList.toggle('boss-surcharge-discard', state.boss?.id === 'banker' && state.boss.discardSurcharge?.status === 'active');
  if (!discardTop) {
    discardFace.style.display = 'none';
  } else {
    discardFace.style.display = 'flex';
    discardFace.style.position = 'absolute';
    discardFace.style.width = '100%';
    discardFace.style.height = '100%';
    discardFace.style.margin = '0';

    // 🚀 MÁGICA: A carta da face do lixo senta no topo exato do 3D
    const topIndex = Math.max(0, discardLayers - 1);
    discardFace.style.bottom = `${topIndex * 1.2}px`;
    discardFace.style.right = `${topIndex * 0.3}px`;
    discardFace.style.zIndex = 20;

    discardFace.innerHTML = cardFrontHTML(discardTop);
    discardFace.className = `discard-face ${suitClass(discardTop)} ${deckFaceClass(discardTop)}${pollenThreat ? ' boss-discard-pollen-card' : ''}`;
    if (pollenThreat) discardFace.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-pollen" aria-hidden="true"><i>&#10022;</i><b>PÓLEN</b></span>');
    discardFace.style.color = discardTop.joker ? '#000' : discardTop.suit === '♥' || discardTop.suit === '♦' ? '#b91c1c' : '#000';
  }

  // 3. Aplica o 3D nos Mortos
  const s0 = document.getElementById('mortoSlot0');
  const s1 = document.getElementById('mortoSlot1');
  if (state.deadPiles.length >= 2) {
    const m0 = state.deadPiles[0];
    const m1 = state.deadPiles[1];

    s0.style.opacity = ''; // Devolve o controle para o CSS padrão
    s1.style.opacity = '';

    s0.classList.toggle('used', m0.length === 0);
    s1.classList.toggle('used', m1.length === 0);

    updatePile3D(s0, 'morto-card-back', m0.length, m0.length ? m0[m0.length - 1].back : 'red', false);
    updatePile3D(s1, 'morto-card-back', m1.length, m1.length ? m1[m1.length - 1].back : 'blue', false);
  }

  renderOpponentHands();
  renderHand();
  renderMelds();

  const myTurn = !state.finished && state.currentPlayer === myPlayerIndex && commonActionsAllowed;

  // Toca o som e vibra o celular SOMENTE na virada pro seu turno (Ignora turno 0 para não dar spoiler do Dado)
  const isDicePhase = state.turnNumber === 0 && !state.hasDrawnThisTurn;

  if (myTurn && !lastMyTurn) {
    if (!isDicePhase) {
      if (navigator.vibrate && audioUnlocked) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch (e) {}
      }
      if (audioUnlocked) {
        try {
          sfxMyTurn.pause();
          sfxMyTurn.currentTime = 0;
          sfxMyTurn.play().catch(() => {});
        } catch (e) {}
      }
    }
  }
  lastMyTurn = myTurn;

  const bossControlsLocked = isCurrentBossMode() && isBossTurnActive(state);
  const vaultDrawRequired = isBossVaultDrawRequired(state, myPlayerIndex);
  document.getElementById('drawStockBtn').style.pointerEvents = myTurn && !state.hasDrawnThisTurn && !bossControlsLocked ? 'auto' : 'none';
  document.getElementById('drawStockBtn').style.opacity = myTurn && !state.hasDrawnThisTurn && !bossControlsLocked && !vaultDrawRequired ? '1' : '0.5';

  // NOVO: Libera o clique no lixo tanto para comprar quanto para descartar
  const canDrawDiscard = myTurn && !state.hasDrawnThisTurn && !bossControlsLocked && (vaultDrawRequired || (state.discard.length && !isBossDiscardBlocked(state)));
  const canDiscardToPile = myTurn && state.hasDrawnThisTurn && !bossControlsLocked;
  document.getElementById('drawDiscardBtn').style.pointerEvents = canDrawDiscard || canDiscardToPile ? 'auto' : 'none';
  document.getElementById('drawDiscardBtn').style.opacity = vaultDrawRequired ? '0.5' : canDrawDiscard || canDiscardToPile ? '1' : '0.5';

  const me = state.players[myPlayerIndex];
  const myTeamId = me ? me.teamId : null; // Protege o Team ID

  document.getElementById('endGameBtn').disabled = false;

  // Controle de exibição do botão Voltar
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    const canUndo = canRestoreUndoTransaction(localUndoStack[localUndoStack.length - 1], state, myPlayerIndex);
    undoBtn.style.display = canUndo ? 'block' : 'none';
    undoBtn.disabled = !canUndo;
    undoBtn.title = canUndo ? 'Desfazer a ultima acao completa' : 'Esta acao nao pode ser desfeita';
  }

  const powerBtn = document.getElementById('powerBtn');
  if (powerBtn) {
    const canUsePower = state.mode === '1x1_dominacao' && state.currentPlayer === 1 && myPlayerIndex === 1 && !state.hasDrawnThisTurn && (!state.dominatorUsedPower || state.powerActiveThisTurn);
    powerBtn.style.display = canUsePower ? 'block' : 'none';

    if (window.isStealModeActive) {
      powerBtn.innerHTML = '❌ FECHAR VISÃO';
      powerBtn.style.background = '#ef4444';
      powerBtn.style.borderColor = '#fca5a5';
      powerBtn.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
    } else {
      powerBtn.innerHTML = '👁️ ROUBAR MÃO';
      powerBtn.style.background = 'linear-gradient(90deg, var(--hud-accent-soft), rgba(15, 23, 42, 0.82))';
      powerBtn.style.borderColor = 'var(--hud-accent)';
      powerBtn.style.boxShadow = '0 0 10px var(--hud-accent-glow)';
    }
  }

  // Oculta botões se o jogo acabou OU se for o Espectador (-1)
  const isFin = !!state.finished;
  const isSpec = myPlayerIndex === -1;
  document.getElementById('showScoreBtn').style.display = isFin && !isCurrentBossMode() ? 'block' : 'none';

  // 🔥 NOVO: Controle de render do botão de revanche com contagem de votos síncrona
  const rematchBtn = document.getElementById('rematchBtn');
  if (rematchBtn) {
    if (isFin && !isSpec) {
      rematchBtn.style.display = 'block';
      const votes = state.rematch?.votes || {};
      const totalRequired = state.players.length;
      const yesCount = Object.values(votes).filter((v) => v === true).length;

      if (votes[myPlayerIndex]) {
        rematchBtn.textContent = `⏳ ACEITO (${yesCount}/${totalRequired})`;
        rematchBtn.style.background = '#1e3a8a'; // Tom azul escuro de espera
      } else {
        rematchBtn.textContent = '🔄 JOGAR NOVAMENTE';
        rematchBtn.style.background = '#22c55e'; // Tom verde pronto
      }
    } else {
      rematchBtn.style.display = 'none';
    }
  }

  let specBadge = document.getElementById('specBadgeInfo');
  if (!specBadge) {
    specBadge = document.createElement('div');
    specBadge.id = 'specBadgeInfo';
    specBadge.style = 'color: #94a3b8; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; font-size: 11px; padding: 8px;';
    specBadge.textContent = '👀 MODO ESPECTADOR';
    document.querySelector('.player-actions').appendChild(specBadge);
  }
  specBadge.style.display = isSpec && !isFin ? 'block' : 'none';

  if (state.finished) {
    if (isCurrentBossMode()) renderBossResult();
    else renderScores(computeScores(), state.winnerTeamId);
  } else if (isCurrentBossMode()) {
    document.getElementById('bossResultSection').style.display = 'none';
  }

  syncCanastraSfxFromState();

  // reativa os carrinhos do tema arcade sem loop bugado
  refreshArcadeCars(false);

  syncMythicPhase();

  // CHAMA A TELA DE VOTAÇÃO AQUI
  renderSurrender();

  // --- SISTEMA DE CONGELAMENTO VISUAL (DEBUG) ---
  const boardEl = document.querySelector('.board');
  let pauseWatermark = document.getElementById('pauseWatermark');

  if (!pauseWatermark) {
    pauseWatermark = document.createElement('div');
    pauseWatermark.id = 'pauseWatermark';
    pauseWatermark.innerHTML = '⏸ JOGO CONGELADO (DEBUG)';
    pauseWatermark.style.cssText =
      'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 22px; font-weight: 900; color: #facc15; z-index: 9999; pointer-events: none; text-shadow: 0 5px 15px rgba(0,0,0,0.9); display: none; background: rgba(0,0,0,0.85); padding: 15px 30px; border-radius: 12px; border: 2px dashed #facc15; text-align: center; letter-spacing: 2px;';
    document.getElementById('gameSection').appendChild(pauseWatermark);
  }

  if (state.debugPaused) {
    if (boardEl) {
      boardEl.style.pointerEvents = 'none'; // Impede qualquer clique na mesa
      boardEl.style.filter = 'grayscale(0.7) brightness(0.5)'; // Deixa a mesa com aspecto "pausado"
    }
    pauseWatermark.style.display = 'block';

    const pauseBtn = document.getElementById('debugPauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '▶️ Descongelar Jogo';
      pauseBtn.style.background = '#22c55e';
    }
  } else {
    if (boardEl) {
      boardEl.style.pointerEvents = 'auto';
      boardEl.style.filter = 'none';
    }
    if (pauseWatermark) pauseWatermark.style.display = 'none';

    const pauseBtn = document.getElementById('debugPauseBtn');
    if (pauseBtn) {
      pauseBtn.innerHTML = '⏸ Congelar Jogo';
      pauseBtn.style.background = '#f97316';
    }
  }
}

function activeMatriarchTargetPlayerIds() {
  if (state?.boss?.id !== 'matriarca_esmeralda') return new Set();
  const playerIds = new Set();
  const intentTarget = state.boss.currentIntent?.payload?.targetPlayerId;
  if (state.boss.bossFlow?.stage === 'ability' && intentTarget != null) playerIds.add(intentTarget);
  (state.boss.natureThreats || []).forEach((threat) => {
    if (threat.status === 'active' && threat.targetPlayerId != null) playerIds.add(threat.targetPlayerId);
  });
  return playerIds;
}

function renderHand() {
  const container = document.querySelector('#handContainer .cards-row');
  container.innerHTML = '';
  const localLabelEl = document.getElementById('localPlayerLabel'); // Captura o novo elemento

  // --- MODO ESPECTADOR ---
  if (myPlayerIndex === -1) {
    if (localLabelEl) {
      localLabelEl.style.display = 'none';
      localLabelEl.classList.remove('boss-player-targeted');
    }
    const p0 = state.players[0];
    if (!p0) return;

    p0.hand.forEach((card) => {
      ensureCardId(card);
      const div = document.createElement('div');
      div.dataset.cardId = card.id;
      div.className = 'carta back ' + (card.back === 'blue' ? 'back-blue' : 'back-red');
      container.appendChild(div);
    });
    return;
  }

  // --- JOGADOR NORMAL ---
  const me = state.players[myPlayerIndex];
  if (!me) {
    if (localLabelEl) {
      localLabelEl.style.display = 'none';
      localLabelEl.classList.remove('boss-player-targeted');
    }
    return;
  }

  // 🔥 Atualiza o seu próprio indicador dinamicamente na tela com nome e contagem real
  if (localLabelEl) {
    localLabelEl.textContent = `${me.name} (${me.hand.length})`;
    localLabelEl.style.display = 'block';
    localLabelEl.classList.toggle('boss-player-targeted', activeMatriarchTargetPlayerIds().has(me.id));

    // Verifica se é a sua vez para aplicar o mesmo verde dinâmico dos oponentes ativos
    const isMyTurn = !state.finished && state.currentPlayer === myPlayerIndex;
    if (isMyTurn) {
      localLabelEl.style.setProperty('background', '#16a34a', 'important');
      localLabelEl.style.setProperty('border-color', 'rgba(255, 255, 255, 0.3)', 'important');
    } else {
      localLabelEl.style.setProperty('background', 'rgba(15, 23, 42, 0.9)', 'important');
      localLabelEl.style.setProperty('border-color', 'rgba(255, 255, 255, 0.15)', 'important');
    }
  }

  me.hand.forEach((card, idx) => {
    if (!card) return; // 🛡️ BLINDAGEM ANTI-FANTASMA: Impede o crash de UI
    ensureCardId(card);
    const div = document.createElement('div');
    div.dataset.cardId = card.id;
    div.className = `carta ${suitClass(card)} ${deckFaceClass(card)}`;

    const bossCardEffect = getBossCardEffect(state, me.id, card.id);
    const bossDiscardFeedback = getBossCardBlockFeedback(state, me.id, card.id, 'discard');
    const bossCardLocked = bossCardEffect === 'locked';

    // O brilho de compra nunca compete com um estado visual da Dominadora.
    const bossChoiceBoughtIds = state.boss?.choiceDrawnCardIdsByPlayer?.[me.id] || [];
    if (!bossCardEffect && ((state.boughtCardIds && state.boughtCardIds.includes(card.id)) || bossChoiceBoughtIds.includes(card.id))) {
      div.classList.add('just-bought');
    }

    if (bossCardLocked) {
      div.classList.add('boss-card-locked');
      div.title = bossDiscardFeedback?.message || 'Carta temporariamente presa';
    }
    if (bossCardEffect === 'exposed') {
      div.classList.add('boss-card-exposed');
      div.title = 'Carta exposta: não pode ser descartada';
    }
    if (bossCardEffect === 'nature-seed') {
      div.classList.add('boss-card-nature-seed');
      div.title = bossDiscardFeedback?.message || 'Semente Viva: use esta carta antes do fim do turno';
    }
    if (bossCardEffect === 'nature-pollen') {
      div.classList.add('boss-card-nature-pollen');
      div.title = bossDiscardFeedback?.message || 'Pólen da Matriarca: use esta carta neste turno';
    }
    const swapHighlight = bossSwapReceivedHighlights.get(card.id);
    if (swapHighlight && swapHighlight.expiresAt > Date.now()) div.classList.add('boss-swap-received');
    if (bossDiscardFeedback) div.setAttribute('aria-label', `${card.rank}${card.suit}. ${bossDiscardFeedback.message}`);
    const financedCard = state.boss?.effects?.find((effect) => effect.id === 'financed_card' && effect.playerId === me.id && effect.cardId === card.id);
    if (financedCard) {
      div.classList.add('boss-card-financed');
      div.title = `Carta Financiada: Dívida +${financedCard.debtPerCard} se permanecer na mão ao fim do turno`;
    }

    div.innerHTML = cardFrontHTML(card);
    if (bossCardLocked) {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-locked" aria-hidden="true"><i></i><b>PRESA</b></span>');
    } else if (bossCardEffect === 'exposed') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-exposed" aria-hidden="true"><i></i><b>USE NESTE TURNO</b></span>');
    } else if (bossCardEffect === 'nature-seed') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-seed" aria-hidden="true"><i>&#10047;</i><b>SEMENTE</b></span>');
    } else if (bossCardEffect === 'nature-pollen') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-pollen" aria-hidden="true"><i>&#10022;</i><b>POLEN</b></span>');
    }
    if (swapHighlight && swapHighlight.expiresAt > Date.now()) {
      const sender = state.players.find((player) => player.id === swapHighlight.fromPlayerId);
      div.insertAdjacentHTML('beforeend', `<span class="boss-swap-origin">DO PARCEIRO${sender?.name ? `: ${sender.name}` : ''}</span>`);
    }

    // A seleção visual agora aplica a classe 'selected' isoladamente
    if (selectedHandIndexes.has(idx)) div.classList.add('selected');

    div.onclick = () => {
      if (!canPerformCommonGameAction(state)) {
        showPendingBossChoiceMessage();
        return;
      }
      if (state.currentPlayer !== myPlayerIndex) return;
      // Lógica limpa: apenas adiciona ou remove o index do Set
      if (selectedHandIndexes.has(idx)) {
        selectedHandIndexes.delete(idx);
      } else {
        selectedHandIndexes.add(idx);
      }

      if (selectedHandIndexes.size === 0) selectedMeldTarget = null; // Auto-clear de segurança

      renderHand();
      renderMelds(); // Atualiza a mesa para acender/apagar a zona de drop
    };
    container.appendChild(div);
  });
}

function seatForPlayer(pid) {
  const total = state.players.length;
  // Se for espectador, finge que a cadeira de baixo é do Jogador 0
  const baseIdx = myPlayerIndex !== -1 ? myPlayerIndex : 0;

  if (pid === baseIdx) return 'self';

  const others = [];
  for (let i = 1; i < total; i++) others.push((baseIdx + i) % total);

  const seats = { top: null, left: null, right: null };
  if (total === 2) {
    if (isCurrentBossMode()) seats.right = others[0];
    else seats.top = others[0];
  } else if (total === 3) {
    seats.right = others[0];
    seats.left = others[1];
  } else {
    seats.right = others[0];
    seats.top = others[1];
    seats.left = others[2];
  }

  if (seats.top === pid) return 'top';
  if (seats.left === pid) return 'left';
  if (seats.right === pid) return 'right';
  return null;
}

function fallbackSeatRect(seat) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (seat === 'top') return { left: vw * 0.5 - 20, top: 40, width: 40, height: 60 };
  if (seat === 'left') return { left: 12, top: vh * 0.5 - 30, width: 40, height: 60 };
  if (seat === 'right') return { left: vw - 52, top: vh * 0.5 - 30, width: 40, height: 60 };
  return null;
}

function opponentAnchorRect(pid) {
  const seat = seatForPlayer(pid);
  if (seat === 'self') {
    const hc = document.getElementById('handContainer');
    if (!hc) return fallbackSeatRect('top');
    const r = hc.getBoundingClientRect();
    return { left: r.left + r.width / 2 - 30, top: r.top + 10, width: 60, height: 90 };
  }
  if (seat === 'top') return getOpponentAnchorRectById('opponentTop', 'top');
  if (seat === 'left') return getOpponentAnchorRectById('opponentLeft', 'left');
  if (seat === 'right') return getOpponentAnchorRectById('opponentRight', 'right');
  return null;
}

function getOpponentAnchorRectById(rootId, seatFallback) {
  const root = document.getElementById(rootId);
  if (!root) return fallbackSeatRect(seatFallback);

  const cards = root.querySelector('.opponent-cards');
  const r1 = cards ? cards.getBoundingClientRect() : null;
  if (r1 && r1.width > 0 && r1.height > 0) return { left: r1.left + r1.width * 0.5 - 20, top: r1.top + r1.height * 0.5 - 30, width: 40, height: 60 };

  const r2 = root.getBoundingClientRect();
  if (r2 && r2.width > 0 && r2.height > 0) return { left: r2.left + r2.width * 0.5 - 20, top: r2.top + r2.height * 0.5 - 30, width: 40, height: 60 };

  return fallbackSeatRect(seatFallback);
}

function renderOpponentSeat(rootEl, playerIdx) {
  if (!rootEl) return;

  if (playerIdx === null || playerIdx === undefined) {
    rootEl.innerHTML = '';
    rootEl.classList.remove('active-turn-glow');
    rootEl.classList.remove('boss-player-targeted');
    return;
  }

  const p = state.players[playerIdx];
  if (!p) {
    rootEl.innerHTML = '';
    rootEl.classList.remove('active-turn-glow');
    rootEl.classList.remove('boss-player-targeted');
    return;
  }

  rootEl.classList.toggle('active-turn-glow', state.currentPlayer === playerIdx);
  rootEl.classList.toggle('boss-player-targeted', activeMatriarchTargetPlayerIds().has(p.id));

  let label = rootEl.querySelector('.opponent-label');
  if (!label) {
    label = document.createElement('div');
    label.className = 'opponent-label';
    rootEl.appendChild(label);
  }
  label.innerHTML = `${p.name} (${p.hand.length})`;

  let cardsDiv = rootEl.querySelector('.opponent-cards');
  if (!cardsDiv) {
    cardsDiv = document.createElement('div');
    cardsDiv.className = 'opponent-cards';
    rootEl.appendChild(cardsDiv);
  }

  const desiredCount = Math.min(p.hand.length, 12);
  const currentCount = cardsDiv.children.length;

  for (let i = 0; i < desiredCount; i++) {
    const cdata = p.hand[i];
    let cardEl = cardsDiv.children[i];

    if (!cardEl) {
      cardEl = document.createElement('div');
      cardEl.className = 'opponent-card-back';
      cardsDiv.appendChild(cardEl);
    }

    const wantedClass = cdata?.back === 'blue' ? 'back-blue' : 'back-red';
    const keepArcadeRun = cardEl.classList.contains('arcade-car-run');

    cardEl.classList.add('opponent-card-back');
    setBackClassIfChanged(cardEl, wantedClass);

    if (document.body.dataset.deckTheme === 'arcade' && keepArcadeRun) {
      cardEl.classList.add('arcade-car-run');
    }
  }

  while (cardsDiv.children.length > desiredCount) {
    cardsDiv.removeChild(cardsDiv.lastChild);
  }
}

function renderOpponentHands() {
  const top = document.getElementById('opponentTop');
  const left = document.getElementById('opponentLeft');
  const right = document.getElementById('opponentRight');

  const total = state.players.length;
  const seats = { top: null, left: null, right: null };
  const others = [];
  const baseIdx = myPlayerIndex !== -1 ? myPlayerIndex : 0;

  for (let i = 1; i < total; i++) {
    others.push((baseIdx + i) % total);
  }

  if (total === 2) {
    if (isCurrentBossMode()) seats.right = others[0];
    else seats.top = others[0];
  } else if (total === 3) {
    seats.right = others[0];
    seats.left = others[1];
  } else {
    seats.right = others[0];
    seats.top = others[1];
    seats.left = others[2];
  }

  function updateSeat(rootEl, playerIdx) {
    if (!rootEl) return;

    if (playerIdx === null || playerIdx === undefined) {
      rootEl.innerHTML = '';
      rootEl.classList.remove('active-turn-glow');
      rootEl.classList.remove('boss-player-targeted');
      return;
    }

    const p = state.players[playerIdx];
    if (!p) {
      rootEl.innerHTML = '';
      rootEl.classList.remove('active-turn-glow');
      rootEl.classList.remove('boss-player-targeted');
      return;
    }

    rootEl.classList.toggle('active-turn-glow', state.currentPlayer === playerIdx);
    rootEl.classList.toggle('boss-player-targeted', activeMatriarchTargetPlayerIds().has(p.id));

    let label = rootEl.querySelector('.opponent-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'opponent-label';
      rootEl.appendChild(label);
    }
    label.innerHTML = `${p.name} (${p.hand.length})`;

    let vaultSlot = rootEl.querySelector('.boss-vault-slot');
    if (!vaultSlot) {
      vaultSlot = document.createElement('div');
      vaultSlot.className = 'boss-vault-slot boss-vault-opponent';
      rootEl.appendChild(vaultSlot);
    }
    renderBossVaultSlot(vaultSlot, p, false);

    let cardsDiv = rootEl.querySelector('.opponent-cards');
    if (!cardsDiv) {
      cardsDiv = document.createElement('div');
      cardsDiv.className = 'opponent-cards';
      rootEl.appendChild(cardsDiv);
    }

    // 👁️ VISÃO DO DOMINADOR: Liga o CSS grid e exibe a face das cartas com clique liberado
    const isStealTarget = window.isStealModeActive && playerIdx === 0 && myPlayerIndex === 1 && state.powerActiveThisTurn && !state.hasDrawnThisTurn;

    if (isStealTarget) {
      rootEl.classList.add('reveal-mode');
      cardsDiv.innerHTML = '';

      p.hand.forEach((cdata) => {
        ensureCardId(cdata);
        const c = document.createElement('div');
        // Mantém a classe .mini para o tamanho, mas o HTML agora é o padrão da sua mão
        c.className = `carta mini ${suitClass(cdata)} ${deckFaceClass(cdata)}`;
        c.dataset.cardId = cdata.id;

        // Usa exatamente o mesmo HTML que renderiza a sua mão
        c.innerHTML = cardFrontHTML(cdata);

        c.onclick = (e) => {
          e.stopPropagation();
          stealCard(cdata.id);
        };
        cardsDiv.appendChild(c);
      });
    } else {
      rootEl.classList.remove('reveal-mode');
      const desiredCount = Math.min(p.hand.length, 12);

      while (cardsDiv.children.length < desiredCount) {
        const c = document.createElement('div');
        c.className = 'opponent-card-back';
        cardsDiv.appendChild(c);
      }

      while (cardsDiv.children.length > desiredCount) {
        cardsDiv.removeChild(cardsDiv.lastChild);
      }

      for (let i = 0; i < desiredCount; i++) {
        const cdata = p.hand[i];
        const cardEl = cardsDiv.children[i];
        if (!cardEl) continue;

        // 🧹 CORREÇÃO DO BURACO FANTASMA: Destrói a invisibilidade injetada pela animação!
        cardEl.removeAttribute('style');
        cardEl.innerHTML = '';
        cardEl.onclick = null;
        cardEl.className = 'opponent-card-back';

        const wantedClass = cdata?.back === 'blue' ? 'back-blue' : 'back-red';
        const keepArcadeRun = cardEl.classList.contains('arcade-car-run');

        cardEl.classList.add(wantedClass);

        if (document.body.dataset.deckTheme === 'arcade' && keepArcadeRun) {
          cardEl.classList.add('arcade-car-run');
        } else if (document.body.dataset.deckTheme !== 'arcade') {
          cardEl.classList.remove('arcade-car-run');
        }
      }
    }
  }

  updateSeat(top, seats.top);
  updateSeat(left, seats.left);
  updateSeat(right, seats.right);

  if (document.body.dataset.deckTheme === 'mythic') {
    syncMythicPhase();
  }
}

let bossGraftLinkFrame = null;

function renderMatriarchGraftLinks() {
  document.getElementById('bossGraftLinks')?.remove();
  if (state?.boss?.id !== 'matriarca_esmeralda' || window.innerWidth <= 900) return;
  const gameSection = document.getElementById('gameSection');
  if (!gameSection) return;
  const groups = new Map();
  document.querySelectorAll('.meld-line.grafted-by-matriarch[data-graft-id]').forEach((meld) => {
    const id = meld.dataset.graftId;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(meld);
  });
  const linkedGroups = [...groups.values()].filter((melds) => melds.length === 2);
  if (!linkedGroups.length) return;
  const rootRect = gameSection.getBoundingClientRect();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'bossGraftLinks';
  svg.classList.add('boss-graft-links');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${Math.max(1, rootRect.width)} ${Math.max(1, rootRect.height)}`);
  linkedGroups.forEach(([first, second]) => {
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    const x1 = a.left - rootRect.left + a.width / 2;
    const y1 = a.bottom - rootRect.top + 3;
    const x2 = b.left - rootRect.left + b.width / 2;
    const y2 = b.bottom - rootRect.top + 3;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.max(y1, y2) + 22} ${x2} ${y2}`);
    svg.appendChild(path);
  });
  gameSection.appendChild(svg);
}

function scheduleMatriarchGraftLinks() {
  if (bossGraftLinkFrame != null) cancelAnimationFrame(bossGraftLinkFrame);
  bossGraftLinkFrame = requestAnimationFrame(() => {
    bossGraftLinkFrame = null;
    renderMatriarchGraftLinks();
  });
}

window.addEventListener('resize', scheduleMatriarchGraftLinks);
document.addEventListener('scroll', scheduleMatriarchGraftLinks, true);

function renderMelds() {
  const m1 = document.getElementById('meldsP1');
  m1.innerHTML = '';
  const m2 = document.getElementById('meldsP2');
  m2.innerHTML = '';
  let s1 = 0,
    s2 = 0;

  const meLocal = state.players[myPlayerIndex];
  const myTurnLocal = !state.finished && state.currentPlayer === myPlayerIndex;
  const activeTeamId = state.players?.[state.currentPlayer]?.teamId;

  state.teams.forEach((t, i) => {
    const info = computeTeamMeldScore(t);
    if (i === 0) s1 = info.total;
    else s2 = info.total;

    const panel = document.getElementById(`teamPanel${i + 1}`);
    if (panel) {
      const growPanel = panel.closest('.grow');
      const isCurrentTeamPanel = !state.finished && t.id === activeTeamId;
      panel.classList.toggle('is-current-team', isCurrentTeamPanel);
      if (growPanel) growPanel.classList.toggle('is-current-team', isCurrentTeamPanel);

      // Efeito visual de Dropzone
      if (meLocal && t.id === meLocal.teamId && myTurnLocal && selectedHandIndexes.size > 0) {
        panel.classList.add('can-drop-new');
      } else {
        panel.classList.remove('can-drop-new');
      }

      // Clique no fundo da caixa cria um NOVO JOGO
      panel.onclick = (ev) => {
        if (!canPerformCommonGameAction(state)) {
          showPendingBossChoiceMessage();
          return;
        }
        if (meLocal && t.id === meLocal.teamId && myTurnLocal && selectedHandIndexes.size > 0) {
          selectedMeldTarget = null; // Zera o alvo para garantir jogo limpo
          makeMeldFromSelection(true); // Força criação de jogo novo
        }
      };
    }

    const pNames = state.players
      .filter((p) => p.teamId === t.id)
      .map((p) => p.name)
      .join(' e ');

    // Lógica do Badge do Morto (Corrigido o parêntese quebrado do Firebase)
    const mortosPegos = state.deadChunksTaken?.[t.id] ?? 0;
    const maxMortos = state.deadChunksMax?.[t.id] ?? 1;

    let mortoHtml = '';
    if (mortosPegos >= maxMortos) {
      mortoHtml = `<span class="morto-badge taken">💀 Morto (${mortosPegos}/${maxMortos})</span>`;
    } else if (mortosPegos > 0) {
      mortoHtml = `<span class="morto-badge taken">💀 Morto (${mortosPegos}/${maxMortos})</span>`;
    } else {
      mortoHtml = `<span class="morto-badge pending">💀 Sem Morto</span>`;
    }

    // Texto encurtado para "+X" economizando espaço precioso na barra
    let extraCardsHtml = '';
    if (state.mode === '1x1_dominacao') {
      let extraCardsDrawn = 0;
      const rewardsMap = { simple: 0, suja: 0, limpa: 1, real: 2, asas: 3 };
      t.melds.forEach((m) => {
        const kind = classifyMeldForUi(m).kind;
        extraCardsDrawn += rewardsMap[kind] || 0;
      });
      if (extraCardsDrawn > 0) {
        extraCardsHtml = `<span class="extra-cards-badge">🃏 +${extraCardsDrawn}</span>`;
      }
    }

    // Mantido o texto sutil e enxuto sem ocupar espaço duplicado
    let powerStealHtml = '';
    if (state.mode === '1x1_dominacao' && t.id === 1) {
      if (state.dominatorUsedPower) {
        powerStealHtml = `<span class="power-steal-badge used">👁️ Roubo</span>`;
      } else {
        powerStealHtml = `<span class="power-steal-badge available">👁️ Roubo</span>`;
      }
    }

    const titleEl = document.querySelector(`#teamPanel${i + 1} .meld-title`);
    if (titleEl) {
      const normalizedRole = (t.name || '').toLowerCase();
      const isDominadorRole = normalizedRole.includes('dominador');
      const isEscravoRole = normalizedRole.includes('escravo');
      const roleClass = isDominadorRole ? 'role-dominador' : isEscravoRole ? 'role-escravo' : 'role-neutral';

      titleEl.innerHTML = `
              <div class="player-title-main">
                <div class="player-identity-chip ${roleClass}">
                  <span class="identity-copy">
                    <span class="identity-role">${t.name}</span>
                    <span class="identity-player-name">${pNames}</span>
                  </span>
                </div>
                <div class="player-title-badges">${mortoHtml}${extraCardsHtml}${powerStealHtml}</div>
              </div>
              <div class="title-score-cluster">
                <div id="liveMoney${i + 1}" class="live-money-badge"></div>
                <strong id="scoreTeam${i + 1}">${i === 0 ? s1 : s2}</strong>
              </div>
            `;
    }

    const target = i === 0 ? m1 : m2;
    t.melds.forEach((meld, midx) => {
      // 🛡️ RE-HIDRATAÇÃO DA FÍSICA: Como o Firebase apaga as flags ao salvar,
      // precisamos reavaliar a matemática do jogo antes de desenhá-lo.
      // Isso garante que o sistema lembre que o "2" está atuando como carta natural!
      optimizeMeld(meld);

      const div = document.createElement('div');
      div.className = 'meld-line';
      const key = t.id + ':' + midx;
      div.dataset.meldKey = key;
      div.classList.toggle('locked-by-boss', isBossMeldLocked(state, t.id, midx));
      const possessed = isBossMeldPossessed(state, t.id, midx);
      div.classList.toggle('possessed-by-boss', possessed);
      const activeInterdict =
        isCurrentBossMode() && state.boss?.id === 'dominadora'
          ? (state.boss.interdicts || []).find(
              (entry) => entry.status === 'active' && Number(entry.teamId ?? 0) === Number(t.id) && (Number(entry.meldIndex) === midx || (entry.meldId && entry.meldId === state.boss?.meldIdsByPosition?.[`${t.id}:${midx}`])),
            )
          : null;
      div.classList.toggle('interdicted-by-boss', !!activeInterdict);
      const natureThreats = isCurrentBossMode() ? getBossMeldNatureThreats(state, t.id, midx) : [];
      const rootThreat = natureThreats.find((threat) => ['root', 'twin_root', 'royal_root'].includes(threat.type));
      const graftThreat = natureThreats.find((threat) => threat.type === 'graft');
      div.classList.toggle('rooted-by-matriarch', !!rootThreat);
      div.classList.toggle('grafted-by-matriarch', !!graftThreat);
      if (graftThreat) {
        const graftSideIndex = (graftThreat.meldIds || []).indexOf(graftThreat.matchedMeldId);
        div.dataset.graftId = graftThreat.id;
        div.dataset.graftSide = graftSideIndex === 1 ? 'B' : 'A';
      }

      const row = document.createElement('div');
      row.className = 'meld-line-cards';
      const mInfo = classifyMeldForUi(meld);

      // Se for uma canastra Ás-a-Ás, injeta o visual BDSM de destaque
      if (mInfo && mInfo.kind === 'asas') {
        div.classList.add('canastra-asas-bdsm');
      }

      meld.forEach((card, cardIndex) => {
        if (!card || typeof card !== 'object') {
          console.warn('[renderMelds] carta inválida ignorada:', card, {
            teamId: t.id,
            meldIndex: midx,
            cardIndex,
          });

          return;
        }

        const isClosedCard = mInfo?.kind !== 'simple' && cardIndex === meld.length - 1;

        if (isClosedCard) {
          return;
        }

        const miniCard = document.createElement('div');

        miniCard.className = `carta mini ${suitClass(card)} ${deckFaceClass(card)}`;

        miniCard.dataset.cardIndex = String(cardIndex);
        miniCard.innerHTML = cardFrontHTML(card);

        row.appendChild(miniCard);
      });

      if (mInfo?.kind !== 'simple') {
        const lastCard = meld[meld.length - 1];

        if (lastCard && typeof lastCard === 'object') {
          const closedCard = document.createElement('div');

          closedCard.className = `carta mini canastra-fechada ${suitClass(lastCard)} ${deckFaceClass(lastCard)}`;

          closedCard.dataset.cardIndex = String(meld.length - 1);

          closedCard.innerHTML = cardFrontHTML(lastCard);

          row.appendChild(closedCard);
        } else {
          console.warn('[renderMelds] carta final inválida ignorada:', lastCard, {
            teamId: t.id,
            meldIndex: midx,
          });
        }
      }

      const meta = document.createElement('div');
      meta.className = 'meld-meta';
      const contribution = isCurrentBossMode() ? getBossMeldContribution(state, t.id, midx) : null;
      const contributionChips = [];
      const contributionChip = (type, value, icon, title) => {
        const renderKey = `${gameId}:${state.boss?.id}:${contribution?.meldId}:${type}`;
        const hadPreviousValue = renderedBossMeldContributions.has(renderKey);
        const previousValue = renderedBossMeldContributions.get(renderKey) || 0;
        renderedBossMeldContributions.set(renderKey, value);
        const increasedClass = hadPreviousValue && value > previousValue ? ' is-increased' : '';
        return `<span class="boss-meld-contribution boss-meld-contribution-${type}${increasedClass}" title="${title}"><span aria-hidden="true">${icon}</span> ${type === 'damage' ? '' : '-'}${value}</span>`;
      };
      if (contribution?.damageDone > 0) {
        contributionChips.push(contributionChip('damage', contribution.damageDone, '&#128165;', 'Dano causado por este jogo'));
      }
      if (state.boss?.id === 'banker' && contribution?.bankerDebtRelief > 0) {
        contributionChips.push(contributionChip('debt', contribution.bankerDebtRelief, '&#129689;', 'Divida reduzida por este jogo'));
      }
      if (state.boss?.id === 'dominadora' && contribution?.dominatrixChainsBroken > 0) {
        contributionChips.push(contributionChip('chains', contribution.dominatrixChainsBroken, '&#9939;&#65039;', 'Chicotes removidos por este jogo'));
      }
      if (state.boss?.id === 'matriarca_esmeralda' && contribution?.matriarchBloomRemoved > 0) {
        contributionChips.push(contributionChip('bloom', contribution.matriarchBloomRemoved, '&#127800;', 'Florescimentos removidos por este jogo'));
      }
      const natureLabels = [];
      if (activeInterdict) {
        const evolutionLabel = mInfo.kind === 'real' ? 'REAL → ÁS-A-ÁS' : 'LIMPA → REAL';
        natureLabels.push(`<span class="boss-meld-interdict-seal">INTERDITO · ${evolutionLabel}</span>`);
      }
      if (rootThreat) natureLabels.push(`<span class="boss-meld-nature-seal">RAIZ ${rootThreat.progress || 0}/${rootThreat.required || 1}</span>`);
      if (graftThreat) {
        const fed = new Set(graftThreat.fedMeldIds || []);
        const sideIndex = (graftThreat.meldIds || []).indexOf(graftThreat.matchedMeldId);
        const sideLabel = sideIndex === 1 ? 'B' : 'A';
        natureLabels.push(`<span class="boss-meld-nature-seal boss-meld-nature-graft">ENXERTO ${sideLabel} · ${fed.size}/${graftThreat.required || 2}</span>`);
      }
      meta.innerHTML = `
              <span class="meld-meta-label">${mInfo.base}${mInfo.tag ? ` <span class="meld-tag ${mInfo.tag.cls}">${mInfo.tag.text}</span>` : ''}</span>
              ${contributionChips.length ? `<span class="boss-meld-contributions" data-meld-id="${contribution.meldId}">${contributionChips.join('')}</span>` : ''}
              ${natureLabels.join('')}
            `;

      div.appendChild(row);
      div.appendChild(meta);
      div.onclick = (ev) => {
        ev.stopPropagation(); // Impede o clique de vazar pro fundo da caixa

        if (!canPerformCommonGameAction(state)) {
          showPendingBossChoiceMessage();
          return;
        }

        if (isBossMeldLocked(state, t.id, midx)) {
          showMessage('🔒 Penhora ativa: este jogo está bloqueado até a próxima cobrança.');
          resetDeniedCardSelection();
          return;
        }
        if (meLocal && !canBossUseMeld(state, meLocal.id, midx)) {
          showMessage('⛓ Separação ativa: seu cooperador já usou este jogo na rodada.');
          resetDeniedCardSelection();
          return;
        }

        if (meLocal && t.id === meLocal.teamId && myTurnLocal && selectedHandIndexes.size > 0) {
          // ESTENDE O JOGO IMEDIATAMENTE
          selectedMeldTarget = key;
          makeMeldFromSelection(false);
        }
        // O 'else' que acendia a borda amarela foi aniquilado
      };
      target.appendChild(div);
    });
  });

  scheduleMatriarchGraftLinks();

  if (typeof window.lastScores === 'undefined') window.lastScores = [0, 0];

  function triggerScoreAnim(teamIndex, oldScore, newScore) {
    const scoreEl = document.getElementById(`scoreTeam${teamIndex + 1}`);
    if (newScore <= oldScore) {
      scoreEl.textContent = newScore;
      return;
    }

    const diff = newScore - oldScore;
    const panelEl = document.getElementById(`teamPanel${teamIndex + 1}`);

    if (panelEl && scoreEl) {
      const pr = panelEl.getBoundingClientRect();
      const sr = scoreEl.getBoundingClientRect();
      const flyEl = document.createElement('div');
      flyEl.className = 'floating-score';
      flyEl.textContent = `+${diff}`;
      flyEl.style.left = pr.left + pr.width / 2 + 'px';
      flyEl.style.top = pr.top + pr.height / 2 + 'px';
      document.body.appendChild(flyEl);

      flyEl
        .animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(${sr.left - (pr.left + pr.width / 2)}px, ${sr.top - (pr.top + pr.height / 2)}px) scale(0.5)`, opacity: 0 },
          ],
          { duration: 1800, easing: 'ease-in' },
        )
        .finished.catch(() => {})
        .then(() => flyEl.remove());
    }

    let startTime = null;
    const duration = 900;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      scoreEl.textContent = Math.floor(progress * diff + oldScore);
      if (progress < 1) window.requestAnimationFrame(step);
      else {
        scoreEl.textContent = newScore;
        scoreEl.style.color = '#facc15';
        setTimeout(() => (scoreEl.style.color = ''), 300);
      }
    };
    window.requestAnimationFrame(step);
  }

  triggerScoreAnim(0, window.lastScores[0], s1);
  triggerScoreAnim(1, window.lastScores[1], s2);

  // --- SISTEMA DE DOMINAÇÃO ---
  const diff = Math.abs(s1 - s2);
  let level = 0;
  let statusText = 'Equilibrado';
  let glowColor = '#4ade80';

  if (diff >= 300 && diff <= 799) {
    level = 1;
    statusText = 'Pressão';
    glowColor = '#d4af37';
  } else if (diff >= 800 && diff <= 1499) {
    level = 2;
    statusText = 'Controle';
    glowColor = '#facc15';
  } else if (diff >= 1500 && diff <= 2499) {
    level = 3;
    statusText = 'Dominação';
    glowColor = '#eab308';
  } else if (diff >= 2500 && diff <= 3499) {
    level = 4;
    statusText = 'Controle Absoluto';
    glowColor = '#facc15';
  } else if (diff >= 3500 && diff <= 4499) {
    level = 5;
    statusText = 'Humilhação Total';
    glowColor = '#f97316';
  } else if (diff >= 4500) {
    level = 6;
    statusText = 'Falência';
    glowColor = '#fb2d5c';
  } // Carmesim Elegante

  const panel1 = document.getElementById('teamPanel1');
  const panel2 = document.getElementById('teamPanel2');

  if (panel1 && panel2) {
    const grow1 = panel1.closest('.grow');
    const grow2 = panel2.closest('.grow');
    const boardMelds = panel1.closest('.board-melds');

    for (let i = 0; i <= 6; i++) {
      grow1.classList.remove('dom-nivel-' + i);
      grow2.classList.remove('dom-nivel-' + i);
    }
    grow1.classList.remove('has-brasao', 'dom-dominador', 'dom-escravo');
    grow2.classList.remove('has-brasao', 'dom-dominador', 'dom-escravo');
    if (boardMelds) boardMelds.classList.remove('has-domination-status');

    const oldStatus1 = document.getElementById('statusDom1');
    if (oldStatus1) oldStatus1.remove();
    const oldStatus2 = document.getElementById('statusDom2');
    if (oldStatus2) oldStatus2.remove();

    if (level === 0) {
      grow1.classList.add('dom-nivel-0');
      grow2.classList.add('dom-nivel-0');
    }

    // Calcula quantas coroas acender (nível 1 a 6)
    const coroaSlots = Array.from({ length: 6 }, (_, i) => `<span class="coroa-slot ${i < level ? 'active' : ''}">👑</span>`).join('');

    // Adiciona a classe dinâmica baseada no nível (ex: brasao-lvl-5)
    const levelClass = level > 0 ? `brasao-lvl-${level}` : '';

    const brasaoHtml = `
                <div id="statusDom_ID_AQUI" class="brasao-dominacao ${levelClass}" data-level="${level}" style="--brasao-runtime-accent:${glowColor};">
                    <div class="brasao-coroas">${coroaSlots}</div>
                    <div class="brasao-frame"></div>
                    <span class="brasao-wing wing-left" aria-hidden="true"></span>
                    <span class="brasao-wing wing-right" aria-hidden="true"></span>
                    <div class="brasao-core">
                        <span class="brasao-titulo">${statusText}</span>
                        <span class="brasao-pontos">+${diff}</span>
                    </div>
                </div>
            `;

    const applyDominationVisual = (winnerGrow, loserGrow, statusId) => {
      winnerGrow.classList.add('dom-nivel-' + level, 'dom-dominador');
      loserGrow.classList.add('dom-escravo');
      if (level > 0) {
        winnerGrow.classList.add('has-brasao');
        if (boardMelds) boardMelds.classList.add('has-domination-status');
        winnerGrow.insertAdjacentHTML('afterbegin', brasaoHtml.replace('statusDom_ID_AQUI', statusId));
      }
    };

    if (level > 0 && s1 > s2) {
      applyDominationVisual(grow1, grow2, 'statusDom1');
    } else if (level > 0 && s2 > s1) {
      applyDominationVisual(grow2, grow1, 'statusDom2');
    }
  }
  // -----------------------------

  if (state.isBetting) {
    // Função universal de cálculo financeiro com Projeção Real e suporte a contagem de mortos do próprio time
    window.calculatePixFin = (myScore, opScore, myMelds, oppMelds, myTookMorto, oppTookMorto, myProjected, oppProjected) => {
      let asasCount = 0;
      let totalCanastras = 0;
      myMelds.forEach((m) => {
        const kind = classifyMeldForUi(m).kind;
        if (kind === 'asas') asasCount++;
        if (kind !== 'simple') totalCanastras++;
      });

      const diff = Math.max(0, myScore - opScore);
      let total = 0;
      const oppCanastras = oppMelds.filter((m) => classifyMeldForUi(m).kind !== 'simple').length;

      let b = {
        base: 0,
        diff: 0,
        asas: 0,
        negative: 0,
        countAsas: asasCount,
        totalCanastras: totalCanastras,
        canastraQuantityBonus: 0,
        hasHumilhacao: false,
        humilhacaoSuprema: 0,
        oppCanastras: oppCanastras,
        virgemDeMorto: false,
        valorVirgem: 0,
        oppProjected: oppProjected,
        myTookMorto: myTookMorto,
        soberaniaMortosBonus: myTookMorto === 2 ? 12.0 : 0,
      };

      if (totalCanastras === 4) {
        b.canastraQuantityBonus = 2;
      } else if (totalCanastras === 5) {
        b.canastraQuantityBonus = 5; // 2 + 3
      } else if (totalCanastras === 6) {
        b.canastraQuantityBonus = 9; // 5 + 4
      } else if (totalCanastras === 7) {
        b.canastraQuantityBonus = 14; // 9 + 5
      } else if (totalCanastras >= 8) {
        b.canastraQuantityBonus = 14 + (totalCanastras - 7) * 5;
      }

      if (myScore > opScore) {
        total += 5.0;
        b.base = 5.0;
        total += diff * 0.01;
        b.diff = diff * 0.01;

        // 🛑 PROJEÇÃO REAL: Oponente negativo paga R$ 0,05 por cada ponto abaixo de zero
        if (oppProjected < 0) {
          const negativePoints = Math.abs(oppProjected);
          const negativePenalty = negativePoints * 0.05;
          total += negativePenalty;
          b.negative = negativePenalty;
        }

        if (oppCanastras === 0) {
          b.hasHumilhacao = true;
          b.humilhacaoSuprema = 10.0;
          total += b.humilhacaoSuprema;
        }

        if (!oppTookMorto) {
          b.virgemDeMorto = true;
          b.valorVirgem = 8.0;
          total += b.valorVirgem;
        }
      }

      const asasRewards = [0, 3, 7, 12, 27];
      b.asas = asasRewards[Math.min(asasCount, 4)] || 0;
      total += b.asas;
      total += b.canastraQuantityBonus;
      total += b.soberaniaMortosBonus; // Injeta os 12 reais caso complete a Soberania dos Mortos

      return { total, diff, b };
    };

    // Auxiliar para calcular pontos projetados (Mesa - Mão - Morto)
    const getProjectedScore = (teamId, boardScore, otherBoardScore) => {
      // 🛡️ TRAVA DE EMPATE INICIAL: Se ninguém pontuou, a projeção é zero para não confundir o HUD
      if (boardScore === 0 && otherBoardScore === 0) return 0;

      let handPenalty = 0;
      state.players
        .filter((p) => p.teamId === teamId)
        .forEach((p) => {
          p.hand.forEach((c) => {
            if (c) handPenalty += cardBasePoints(c);
          });
        });
      const mortoPenalty = (state.deadChunksTaken?.[teamId] ?? 0) === 0 ? 100 : 0;

      // 🏅 Sincroniza o bônus de batida (+100 pts) no HUD ao vivo assim que o jogo finalizar
      const bonusBatida = state.finished && state.winnerTeamId === teamId ? 100 : 0;

      return boardScore - handPenalty - mortoPenalty + bonusBatida;
    };

    const t1MortosPegos = state.deadChunksTaken?.[0] ?? 0;
    const t2MortosPegos = state.deadChunksTaken?.[1] ?? 0;

    // Passamos o score de ambos para validar a trava de 0-0
    const proj1 = getProjectedScore(0, s1, s2);
    const proj2 = getProjectedScore(1, s2, s1);

    // Sincroniza a quantidade de mortos coletados de cada equipe respectiva na assinatura da função
    const fin1 = window.calculatePixFin(s1, s2, state.teams[0].melds, state.teams[1].melds, t1MortosPegos, t2MortosPegos > 0, proj1, proj2);
    const fin2 = window.calculatePixFin(s2, s1, state.teams[1].melds, state.teams[0].melds, t2MortosPegos, t1MortosPegos > 0, proj2, proj1);

    // 💸 MOTOR DE ANIMAÇÃO FINANCEIRA: Compara o último render com o atual para soltar a animação de dinheiro
    if (typeof window.lastFinScores === 'undefined') {
      window.lastFinScores = [fin1.total, fin2.total]; // Trava o primeiro load para não estourar na tela do nada
    } else {
      const triggerMoneyAnim = (teamIndex, oldVal, newVal) => {
        if (Math.abs(newVal - oldVal) < 0.005) return; // Ignora se não mudou dinheiro

        const diff = newVal - oldVal;
        const badgeEl = document.getElementById(`liveMoney${teamIndex + 1}`);
        // Se o badge do PIX estiver escondido (R$ 0,00), tenta achar a caixa do placar
        const targetEl = badgeEl && badgeEl.offsetWidth > 0 ? badgeEl : document.querySelector(`#teamPanel${teamIndex + 1} .meld-title`);

        if (targetEl) {
          const r = targetEl.getBoundingClientRect();
          const flyEl = document.createElement('div');
          flyEl.className = 'floating-money ' + (diff > 0 ? 'positive' : 'negative');
          flyEl.textContent = (diff > 0 ? '+' : '-') + 'R$ ' + Math.abs(diff).toFixed(2).replace('.', ',');

          flyEl.style.left = r.left + r.width / 2 + 'px';
          flyEl.style.top = r.top + r.height / 2 + 'px';
          document.body.appendChild(flyEl);

          // Lucro: sobe 50px | Prejuízo: afunda 50px
          const yMove = diff > 0 ? -50 : 50;

          flyEl
            .animate(
              [
                { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
                { transform: 'translate(-50%, -50%) scale(1.1)', opacity: 1, offset: 0.1 }, // Offset menor para ele ficar grande mais rápido e demorar mais sumindo
                { transform: `translate(-50%, calc(-50% + ${yMove}px)) scale(1)`, opacity: 0 },
              ],
              { duration: 6000, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
            )
            .finished.catch(() => {})
            .then(() => flyEl.remove());
        }
      };

      triggerMoneyAnim(0, window.lastFinScores[0], fin1.total);
      triggerMoneyAnim(1, window.lastFinScores[1], fin2.total);

      window.lastFinScores[0] = fin1.total;
      window.lastFinScores[1] = fin2.total;
    }

    const updateBadge = (badge, fin) => {
      if (!badge) return;
      if (fin.total > 0) {
        const moneyStr = '💰 R$ ' + fin.total.toFixed(2).replace('.', ',');
        if (badge.textContent !== moneyStr) {
          badge.textContent = moneyStr;
          badge.classList.remove('money-update-anim');
          void badge.offsetWidth;
          badge.classList.add('money-update-anim');
        }
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    };

    updateBadge(document.getElementById('liveMoney1'), fin1);
    updateBadge(document.getElementById('liveMoney2'), fin2);

    // 🎨 PINTANDO A CHECKLIST DE METAS (COM HTML CORRIGIDO)
    const hud = document.getElementById('goalsHud');

    if (hud) {
      // --- MOTOR CORRIGIDO: Vincula o painel fixo ao time do cliente local para o rastreio individual funcionar ---
      const myTeamId = state.players[myPlayerIndex] ? state.players[myPlayerIndex].teamId : 0;
      let refFin = myTeamId === 1 ? fin2 : fin1;
      let refName = state.teams[myTeamId].name;

      // Determina se o seu time está na liderança de pontos para acender o bônus de vitória
      const isMyTeamLeading = myTeamId === 1 ? s2 > s1 : s1 > s2;
      const isMyTeamWinner = state.finished && state.winnerTeamId === myTeamId;
      const myTeamWinsGoal = state.finished ? isMyTeamWinner : isMyTeamLeading;

      let achievedCount = 0;
      if (myTeamWinsGoal) achievedCount++;
      if (refFin.b.diff > 0) achievedCount++;
      if (refFin.b.negative > 0) achievedCount++;
      if (refFin.b.countAsas > 0) achievedCount++;
      if (refFin.b.hasHumilhacao) achievedCount++;
      if (refFin.b.virgemDeMorto) achievedCount++;
      if (refFin.b.canastraQuantityBonus > 0) achievedCount++;
      if (refFin.b.myTookMorto === 2) achievedCount++;

      // PERSISTÊNCIA: Exibe para todos na mesa e não some no fim do jogo
      hud.style.display = myPlayerIndex !== -1 ? 'block' : 'none';
      hud.classList.toggle('collapsed', window.isGoalsHudCollapsed);

      // Indica o nome do seu time no topo do menu de metas
      const nameEl = document.getElementById('winnerNameHud');
      if (nameEl) {
        nameEl.textContent = `(${refName})`;
      }

      // Exibe o balanço financeiro em tempo real do seu time
      document.getElementById('goalsTotalHud').textContent = 'R$ ' + refFin.total.toFixed(2).replace('.', ',');

      const counterEl = document.getElementById('goalsCounterHud');
      if (counterEl) {
        counterEl.textContent = `(${achievedCount}/8)`;
        counterEl.style.color = achievedCount === 8 ? '#4ade80' : '#94a3b8';
      }

      // Renderiza a lista de itens baseada na referência calculada incluindo a Soberania dos Mortos
      const list = document.getElementById('goalsListHud');
      list.innerHTML = `
                        <div class="goal-item ${myTeamWinsGoal ? 'achieved' : ''}">
                            <span>✅ Vitória (R$ 5)</span>
                            <strong>+R$ ${myTeamWinsGoal ? '5,00' : '0,00'}</strong>
                        </div>
                        <div class="goal-item ${refFin.b.virgemDeMorto ? 'achieved' : ''}">
                            <span>🛑 Adv. Sem Morto (R$ 8)</span>
                            <strong>+R$ ${refFin.b.valorVirgem.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div class="goal-item ${refFin.b.diff > 0 ? 'achieved' : ''}">
                            <span>📈 Diferença (R$ 0,01/pt)</span>
                            <strong>+R$ ${refFin.b.diff.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div class="goal-item ${refFin.b.negative > 0 ? 'achieved' : ''}">
                            <span>☠️ Adv. Neg. (R$ 0,05/pt) [${refFin.b.oppProjected} pts]</span>
                            <strong>+R$ ${refFin.b.negative > 0 ? refFin.b.negative.toFixed(2).replace('.', ',') : '0,00'}</strong>
                        </div>
                        <div class="goal-item ${refFin.b.myTookMorto === 2 ? 'achieved' : ''}">
                            <span>💀 Soberania dos Mortos (${refFin.b.myTookMorto}/2)</span>
                            <strong>+R$ ${refFin.b.myTookMorto === 2 ? '12,00' : '0,00'}</strong>
                        </div>
                        <div id="asasGoalItem" class="goal-item expandable ${refFin.b.countAsas > 0 ? 'achieved' : ''} ${window.isAsasDetailsExpanded ? 'expanded' : ''}" onclick="toggleAsasDetails(event)">
                            <div class="goal-item-header">
                                <span><span class="expand-icon">▶</span>⭐ Bônus Ás-a-Ás (${refFin.b.countAsas}/4)</span>
                                <strong>+R$ ${refFin.b.asas.toFixed(2).replace('.', ',')}</strong>
                            </div>
                            <div class="goal-details" style="font-size: 11px; margin-top: 4px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.countAsas >= 1 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>1ª Ás-a-Ás:</span> <span>+R$ 3,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.countAsas >= 2 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>2ª Ás-a-Ás:</span> <span>+R$ 4,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.countAsas >= 3 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>3ª Ás-a-Ás:</span> <span>+R$ 5,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: ${refFin.b.countAsas >= 4 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>4ª Ás-a-Ás:</span> <span>+R$ 15,00</span>
                                </div>
                            </div>
                        </div>
                        <div class="goal-item ${refFin.b.hasHumilhacao ? 'achieved' : ''}">
                            <span>🩸 Adv. ${refFin.b.oppCanastras} Canastra(s) (R$ 10)</span>
                            <strong>+R$ ${refFin.b.humilhacaoSuprema.toFixed(2).replace('.', ',')}</strong>
                        </div>
                        <div id="chuvaGoalItem" class="goal-item expandable ${refFin.b.totalCanastras >= 4 ? 'achieved' : ''} ${window.isChuvaDetailsExpanded ? 'expanded' : ''}" onclick="toggleChuvaDetails(event)">
                            <div class="goal-item-header">
                                <span><span class="expand-icon">▶</span>🃏 Chuva de Canastras (${refFin.b.totalCanastras}/4+)</span>
                                <strong>+R$ ${refFin.b.canastraQuantityBonus.toFixed(2).replace('.', ',')}</strong>
                            </div>
                            <div class="goal-details" style="font-size: 11px; margin-top: 4px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.totalCanastras >= 4 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>4ª Canastra:</span> <span>+R$ 2,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.totalCanastras >= 5 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>5ª Canastra:</span> <span>+R$ 3,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.totalCanastras >= 6 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>6ª Canastra:</span> <span>+R$ 4,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: ${refFin.b.totalCanastras >= 7 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>7ª Canastra:</span> <span>+R$ 5,00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: ${refFin.b.totalCanastras >= 8 ? '#4ade80' : 'rgba(255,255,255,0.5)'};">
                                  <span>8ª em diante:</span> <span>+R$ 5,00 /cada</span>
                                </div>
                            </div>
                        </div>
                    `;
    }
  } else {
    const hud = document.getElementById('goalsHud');
    if (hud) hud.style.display = 'none';
  }

  window.lastScores[0] = s1;
  window.lastScores[1] = s2;
}

function renderScores(scores, winner) {
  document.getElementById('scoreSection').style.display = 'flex';

  // Motor de Criptografia do Banco Central (BR Code)
  const generatePixPayload = (key, amount) => {
    const f = (id, val) => id + String(val.length).padStart(2, '0') + val;
    const payloadKey = f('00', 'BR.GOV.BCB.PIX') + f('01', key);
    let p = f('00', '01') + f('01', '11') + f('26', payloadKey) + f('52', '0000') + f('53', '986') + f('54', parseFloat(amount).toFixed(2)) + f('58', 'BR') + f('59', 'Buraco Findom') + f('60', 'Brasil') + f('62', f('05', '***')) + '6304';
    let crc = 0xffff;
    for (let i = 0; i < p.length; i++) {
      crc ^= p.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    return p + (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  };

  const scoreCard = document.querySelector('.score-card');
  scoreCard.innerHTML = `
              <h2 style="margin: 0; color: #fff; font-size: 22px">Fim de Jogo</h2>
              <div style="font-size: 11px; color: #facc15; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                MODO: ${state.mode === '1x1_duploMorto' ? '1x1 Humilhação' : state.mode === '1x1_dominacao' ? '1x1 Dominação' : state.mode} | REGRA: ${state.variant}
              </div>
              <div id="scoreBoard" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"></div>
              <button id="closeScoreBtn" style="width: 100%; margin-top: 10px; background: #334155">Voltar à Mesa</button>
            `;

  const board = document.getElementById('scoreBoard');
  document.getElementById('closeScoreBtn').onclick = () => (document.getElementById('scoreSection').style.display = 'none');

  scores.sort((a, b) => b.score - a.score);

  const financialWinnerTeam = scores[0].team || {};
  const winnerPix = financialWinnerTeam.pix || '';

  scores.forEach((s, index) => {
    const isWinner = s.team.id === winner;
    const totalBonus = s.sujaBonus + s.limpaBonus + s.realBonus + s.asasBonus;
    const pNames = s.players.map((p) => p.name).join(' e ');

    let financialHtml = '';
    if (state.isBetting) {
      const winnerData = scores[0];
      const loserData = scores[1];
      const loserTookMorto = (state.deadChunksTaken?.[loserData.team.id] ?? 0) > 0;
      const winnerTookMortoCount = state.deadChunksTaken?.[winnerData.team.id] ?? 0;

      const winnerFin = window.calculatePixFin(winnerData.score, loserData.score, winnerData.team.melds, loserData.team.melds, winnerTookMortoCount, loserTookMorto, winnerData.score, loserData.score);

      const totalMoney = winnerFin.total;
      const moneyStr = totalMoney.toFixed(2).replace('.', ',');

      if (winnerData.score === loserData.score) {
        financialHtml = `
                    <div style="margin-top: 15px; padding: 10px; background: rgba(100, 116, 139, 0.2); border: 1px solid #94a3b8; border-radius: 8px;">
                      <span style="color: #cbd5e1; font-weight: 900; font-size: 16px;">EMPATE: Ninguém paga</span>
                    </div>
                  `;
      } else if (index === 0) {
        financialHtml = `
                    <div style="margin-top: 15px; padding: 10px; background: rgba(34, 197, 94, 0.2); border: 1px solid #4ade80; border-radius: 8px;">
                      <span style="color: #4ade80; font-weight: 900; font-size: 16px;">LUCRO A RECEBER: R$ ${moneyStr}</span>
                    </div>
                  `;
      } else {
        let pixHtml = '';
        if (winnerPix) {
          const pixBRCode = generatePixPayload(winnerPix, totalMoney);
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pixBRCode)}`;
          const zapText = encodeURIComponent(`Fatura do Buraco Findom! 👑 Você perdeu e me deve R$ ${moneyStr}. Faz o PIX aí na chave: ${winnerPix}`);

          pixHtml = `
                      <div style="margin-top: 10px; padding: 15px 10px 10px 10px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #334155; display: flex; flex-direction: column; align-items: center;">
                        <img src="${qrCodeUrl}" style="border-radius: 8px; border: 4px solid #fff; margin-bottom: 12px; width: 140px; height: 140px; box-shadow: 0 4px 10px rgba(0,0,0,0.8);" alt="QR Code PIX">
                        <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Ou copie a Chave PIX:</div>
                        <div style="color: #facc15; font-weight: 900; font-size: 14px; letter-spacing: 1px; user-select: all; cursor: copy; margin-bottom: 15px; padding: 4px 8px; background: rgba(250, 204, 21, 0.1); border: 1px dashed #facc15; border-radius: 4px;" title="Selecionar para copiar">${winnerPix}</div>
                        <a href="https://wa.me/?text=${zapText}" target="_blank" style="width: 100%; text-align: center; display: block; background: #25D366; color: #fff; padding: 12px; border-radius: 6px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; transition: 0.3s; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);">
                          📲 Cobrar pelo WhatsApp
                        </a>
                      </div>
                    `;
        } else {
          pixHtml = `<div style="margin-top: 10px; font-size: 10px; color: #9ca3af; font-style: italic;">O vencedor não cadastrou chave PIX. Calote liberado?</div>`;
        }

        let titleFatura = 'FATURA';
        if (s.team.name === 'Escravo') titleFatura = 'FATURA DO ESCRAVO';
        else if (s.team.name.includes('Dominador')) titleFatura = 'FATURA DO DOMINADOR';
        else titleFatura = `FATURA DO ${s.team.name.toUpperCase()}`;

        financialHtml = `
                    <div style="margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.15); border: 1px dashed #ef4444; border-radius: 8px;">
                      <div style="color: #ef4444; font-size: 10px; letter-spacing: 2px; margin-bottom: 5px; font-weight: bold;">${titleFatura}</div>
                      <span style="color: #fca5a5; font-weight: 900; font-size: 20px;">PAGUE: R$ ${moneyStr}</span>
                      ${pixHtml}
                    </div>
                  `;
      }
    }

    board.innerHTML += `
                <div class="score-team ${isWinner ? 'winner' : ''}">
                  <div class="score-team-name">
                    ${isWinner ? '👑 ' : ''}${s.team.name}
                    <span style="font-size: 12px; color: #9ca3af; font-weight: normal; margin-left: 6px;">(${pNames})</span>
                  </div>
                  <div class="score-details">
                    <div class="score-row"><span>Cartas Baixadas:</span> <span class="text-green">+${s.meldPoints} pts</span></div>
                    <div class="score-row"><span>Bônus Canastras:</span> <span class="text-green">+${totalBonus} pts</span></div>
                    <div class="score-row" style="border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px;"><span>Batida Final:</span> <span>${s.bonusBatida > 0 ? '<strong class="text-green">Sim (+100 pts)</strong>' : '<strong class="text-red">Não (0 pts)</strong>'}</span></div>
                    <div class="score-row" style="margin-top: 6px;"><span>Cartas Restantes:</span> <span class="text-red">-${s.handPenalty} pts</span></div>
                    <div class="score-row"><span>Pegou Morto?</span> <span>${s.penaltyMorto > 0 ? '<strong class="text-red">Não (-100 pts)</strong>' : '<strong class="text-green">Sim (0 pts)</strong>'}</span></div>
                  </div>
                  <div class="score-row total"><span>PONTUAÇÃO FINAL:</span> <span>${s.score} pts</span></div>
                  ${financialHtml}
                </div>
              `;
  });
}

function showMessage(msg) {
  document.getElementById('message').textContent = msg;
}

async function playRemoteAction(a) {
  if (!state || !a) return;

  const stockEl = document.querySelector('#drawStockBtn .pile-card');
  const discardEl = document.querySelector('#drawDiscardBtn .pile-card');
  const dead0El = document.getElementById('mortoSlot0');
  const dead1El = document.getElementById('mortoSlot1');

  const stockRect = stockEl ? getRect(stockEl) : null;
  const discardRect = discardEl ? getRect(discardEl) : null;
  const handRect = opponentAnchorRect(a.playerId);
  if (!handRect) return;

  const fallbackCard = a.card || { rank: '★', suit: '★', joker: true, id: `rf_${Date.now()}` };

  const dropRects = (baseRect, count) => {
    const out = [];
    for (let i = 0; i < count; i++) out.push({ ...baseRect, left: baseRect.left - i * 10, top: baseRect.top + i * 2 });
    return out;
  };

  // 🛑 INJETOR UNIVERSAL DE REPOSIÇÃO (Morto -> Monte)
  const animateRemoteRecycleIfAny = async () => {
    if (a.autoRecycledIndex !== undefined && a.autoRecycledIndex !== null) {
      const deadEl = a.autoRecycledIndex === 1 ? dead1El : dead0El;
      if (deadEl && stockRect) {
        if (deadEl) deadEl.style.opacity = '0';
        await flyRectToRect(fallbackCard, getRect(deadEl), stockRect, 'back');
        impactAtRect(stockRect);
      }
    }
  };

  // Injetor universal para morto automático remoto (incluindo IA)
  const animateRemoteDeadIfAny = async () => {
    await animateRemoteRecycleIfAny(); // Garante que a reposição aconteça ANTES do morto ou das compras voarem!
    if (a.tookDead) {
      const fromEl = a.tookDead.deadIndex === 1 ? dead1El : dead0El;
      const fromR = fromEl ? getRect(fromEl) : null;
      if (fromR && handRect) {
        if (fromEl) fromEl.style.opacity = '0'; // Esconde a pilha original na hora do voo
        await flyRectToRect(fallbackCard, fromR, handRect, 'back');
        impactAtRect(handRect);
      }
    }
  };

  const animateRemoteDrawsIfAny = async () => {
    if (a.drawnCards && a.drawnCards.length > 0) {
      for (let i = 0; i < a.drawnCards.length; i++) {
        const cardData = a.drawnCards[i];

        const isSteal = cardData && (cardData._isEndgameSteal === true || cardData.id?._isEndgameSteal === true);

        let fromRect = stockRect;
        let fromEl = null;

        if (isSteal) {
          const targetVictimId = a.playerId === 1 ? 0 : 1;
          if (targetVictimId === myPlayerIndex) {
            fromEl = cardElById(cardData.id);
          }

          if (fromEl) {
            fromRect = getRect(fromEl);
          } else {
            fromRect = opponentAnchorRect(targetVictimId);
          }
        }

        if (fromRect && handRect) {
          const cardVisual = cardData ? { rank: cardData.rank, suit: cardData.suit, joker: !!cardData.joker, back: cardData.back } : fallbackCard;

          // 🔥 CORREÇÃO: Oculta cada carta individualmente assim que ela inicia o voo
          if (fromEl) {
            fromEl.style.visibility = 'hidden';
          }

          await flyRectToRect(cardVisual, fromRect, handRect, isSteal ? 'front' : 'back');
          impactAtRect(handRect);

          if (i < a.drawnCards.length - 1) await new Promise((r) => setTimeout(r, 180));
        }
      }
    }
  };

  const animateRemoteFinancedCards = async () => {
    const financedCards = a.bossExtraCards || [];
    if (!financedCards.length || !stockRect) return;
    for (let i = 0; i < financedCards.length; i++) {
      await flyRectToRect(financedCards[i], stockRect, handRect, 'back');
      impactAtRect(handRect);
      if (i < financedCards.length - 1) await new Promise((resolve) => setTimeout(resolve, 220));
    }
    const playerName = state.players?.find((player) => player.id === a.playerId)?.name || 'Jogador';
    showMessage(`Tarifa de Manutenção: ${playerName} recebeu +${financedCards.length} carta${financedCards.length === 1 ? '' : 's'} financiada${financedCards.length === 1 ? '' : 's'}. Cada carta restante gera Dívida.`);
  };

  if (a.type === 'stealCard') {
    if (sfxSteal) {
      sfxSteal.currentTime = 0;
      sfxSteal.play().catch((e) => console.log(e));
    }

    if (myPlayerIndex === 0) {
      showMessage('💥 SABOTAGEM! O Dominador invadiu sua mão e roubou uma carta!');
      if (navigator.vibrate) navigator.vibrate([300, 110, 300]);
    } else if (myPlayerIndex === 1) {
      showMessage('👑 Mão invadida! Você extraiu uma carta direto da mão do Escravo.');
      if (navigator.vibrate) navigator.vibrate([70]);
    }

    // Ambas as telas calculam a mesma trajetória física com base em quem disparou a ação (a.playerId)
    const fromRect = opponentAnchorRect(a.playerId === 1 ? 0 : 1);
    const toRect = opponentAnchorRect(a.playerId);

    if (fromRect && toRect) {
      await flyRectToRect(fallbackCard, fromRect, toRect, 'front');
      impactAtRect(toRect);
    }

    // 🔥 NOVO: Renderiza o voo do Monte para o Escravo na tela do J2 (Dominador)
    if (a.escravoAutoDraw && stockRect) {
      const escravoRect = opponentAnchorRect(0);
      if (escravoRect) {
        await flyRectToRect(a.escravoAutoDraw, stockRect, escravoRect, 'back');
        impactAtRect(escravoRect);
      }
    }
    return;
  }

  if (a.type === 'drawStock') {
    if (a.recycledDeadIndex !== null && a.recycledDeadIndex !== undefined) {
      const deadEl = a.recycledDeadIndex === 1 ? dead1El : dead0El;
      if (deadEl && stockRect) {
        await flyRectToRect(fallbackCard, getRect(deadEl), stockRect, 'back');
        impactAtRect(stockRect);
      }
    }

    const drawCount = Math.max(0, (a.count || 1) - (a.bossExtraCards?.length || 0));
    for (let i = 0; i < drawCount; i++) {
      if (stockRect) await flyRectToRect(fallbackCard, stockRect, handRect, 'back');
      impactAtRect(handRect);
      if (i < drawCount - 1) await new Promise((r) => setTimeout(r, 180)); // Pequeno delay pra ver as cartas separadas
    }
    await animateRemoteFinancedCards();
    return;
  }

  if (a.type === 'drawDiscard') {
    if (discardRect) {
      await flyRectToRect(fallbackCard, discardRect, handRect, 'front');
      impactAtRect(handRect);
      if (a.count) {
        const opPlayer = state.players[a.playerId];
        if (opPlayer) renderOpponentHands();
      }
    }
    await animateRemoteFinancedCards();
    return;
  }

  if (a.type === 'discard') {
    const df = document.getElementById('discardFace');
    let prevHtml = null;
    let prevColor = null;
    let prevClass = null;

    if (df && state.discard.length > 1) {
      const prevCard = state.discard[state.discard.length - 2];
      prevHtml = df.innerHTML;
      prevColor = df.style.color;
      prevClass = df.className;
      df.innerHTML = cardFrontHTML(prevCard);
      df.className = `discard-face ${suitClass(prevCard)} ${deckFaceClass(prevCard)}`;
      df.style.color = prevCard.joker ? '#000' : prevCard.suit === '♥' || prevCard.suit === '♦' ? '#b91c1c' : '#000';
    } else if (df) {
      df.style.visibility = 'hidden';
    }

    if (discardRect) await flyRectToRect(fallbackCard, handRect, discardRect, 'front');
    impactAtRect(discardRect);

    if (df) {
      if (prevHtml) {
        df.innerHTML = prevHtml;
        if (prevClass) df.className = prevClass;
        df.style.color = prevColor;
      }
      df.style.visibility = '';
    }

    await animateRemoteDeadIfAny();
    await animateRemoteDrawsIfAny();
    return;
  }

  if (a.type === 'takeDead') {
    const fromEl = a.deadIndex === 1 || a.teamId === 1 ? dead1El : dead0El;
    const fromRect = fromEl ? getRect(fromEl) : null;
    if (fromRect) {
      if (fromEl) fromEl.style.opacity = '0'; // Esconde a pilha original na hora do voo
      await flyRectToRect(fallbackCard, fromRect, handRect, 'back');
      impactAtRect(handRect);
    }
    return;
  }

  if (a.type === 'drawDiscardFechado') {
    await animateRemoteDeadIfAny();
    await animateRemoteDrawsIfAny();
    await animateRemoteFinancedCards();
    return;
  }

  if (a.type === 'meldNew') {
    let base = null;
    if (a.meldIndex != null && a.teamId != null) {
      const key = `${a.teamId}:${a.meldIndex}`;
      base = meldDropRect(key, 0);
    }
    if (!base) {
      const container = document.getElementById((a.teamId ?? 0) === 0 ? 'meldsP1' : 'meldsP2');
      if (!container) return;
      const tr = container.getBoundingClientRect();
      base = { left: tr.left + tr.width - 30, top: tr.top + 10, width: 22, height: 30 };
    }
    const cards = a.cards && a.cards.length ? a.cards : [fallbackCard];
    const targets = dropRects(base, cards.length);

    await Promise.all(
      cards.map((c, i) => {
        c.id ||= `rm_${Date.now()}_${i}`;
        const toRect = targets[i];
        return flyRectToRect(c, handRect, toRect, 'front').then(() => impactAtRect(toRect));
      }),
    );

    await animateRemoteDeadIfAny();
    await animateRemoteDrawsIfAny();
    return;
  }

  if (a.type === 'meldExtend') {
    if (a.meldIndex == null || a.teamId == null) return;
    const key = `${a.teamId}:${a.meldIndex}`;
    const base = meldDropRect(key, 0);
    if (!base) return;

    const cards = a.cards && a.cards.length ? a.cards : [fallbackCard];
    const targets = dropRects(base, cards.length);

    await Promise.all(
      cards.map((c, i) => {
        c.id ||= `re_${Date.now()}_${i}`;
        const toRect = targets[i];
        return flyRectToRect(c, handRect, toRect, 'front').then(() => impactAtRect(toRect));
      }),
    );

    await animateRemoteDeadIfAny();
    await animateRemoteDrawsIfAny();
    return;
  }

  if (a.type === 'meldMoveWild') {
    if (a.teamId == null || a.fromMeldIndex == null || a.toMeldIndex == null) return;
    const fromRect = meldCardsRect(a.teamId, a.fromMeldIndex) || meldDropRect(`${a.teamId}:${a.fromMeldIndex}`, 0);
    const toRect = meldDropRect(`${a.teamId}:${a.toMeldIndex}`, 0) || meldCardsRect(a.teamId, a.toMeldIndex);
    if (!fromRect || !toRect) return;

    const card = a.card || { rank: '★', suit: '★', joker: true, id: `mw_${Date.now()}` };
    await flyRectToRect(card, fromRect, toRect, 'front');
    impactAtRect(toRect);
    return;
  }
}
// ==========================================
// MOTOR DE EXECUÇÃO DA IA (BOT ENGINE)
// ==========================================
const botEngine = {
  getState: () => state,
  isActive: () => !window.isClosingGame && !localExitPending && !!state,
  commitState: async () => commitState(),
  showMessage: (msg) => showMessage(msg),
  computeTeamMeldScore: (team) => computeTeamMeldScore(team),
  isValidSequenceMeld: (cards) => isValidSequenceMeld(cards),
  canTeamTakeDeadNow: (teamId) => canTeamTakeDeadNow(teamId),
  teamHasGoodCanastra: (teamId) => teamHasGoodCanastra(teamId),
  isDiscardBlocked: () => isBossDiscardBlocked(state),
  isMeldLocked: (teamId, meldIndex) => isBossMeldLocked(state, teamId, meldIndex) || !canBossUseMeld(state, state.currentPlayer, meldIndex),
  isCardBlocked: (playerId, cardId, action = 'play') => isBossCardBlocked(state, playerId, cardId, action),
  canCreateMeld: (playerId) => canBossCreateMeld(state, playerId),
  hasPendingBossChoice: () => hasPendingBossChoices(state),
  getNaturePriorities: (playerId) => getBossNaturePriorities(state, playerId),
  getDominatrixPriorities: (playerId) => getBossDominatrixPriorities(state, playerId),
  shouldTakeBossDiscard: (playerId, intent, naturePlan) => shouldBossBotTakeDiscard(state, playerId, { intent, naturePlan }),

  async resolvePendingBossChoice(playerId) {
    const choice = getBossPendingChoice(state, playerId);
    if (!choice) return null;
    const player = state.players.find((entry) => entry.id === playerId);
    const hasCanastra = state.teams?.[0]?.melds?.some((meld) => meld?.length >= 7);
    let option = choice.options[0];
    if (choice.type === 'fixed_interest_payment' || choice.type === 'banker_collateral_card') {
      option = chooseBossFixedInterestBotOption(state, choice) || option;
    }
    if (choice.type === 'forced_choice' && choice.options.includes('chain') && choice.options.includes('order')) {
      const ownChains = getBossChains(state, playerId);
      const partnerChains = Math.max(0, ...(state.players || []).filter((entry) => entry.id !== playerId).map((entry) => getBossChains(state, entry.id)));
      const practicalOrder = ['discard_suit', 'no_new_meld', 'feed_specific_meld'].includes(choice.order?.type);
      option = choice.order && (ownChains >= 3 || partnerChains >= 3 || practicalOrder) ? 'order' : 'chain';
    } else if (choice.options.includes('chain') && getBossChains(state, playerId) >= 2) {
      option = choice.options.find((entry) => entry !== 'chain') || 'chain';
    }
    if (choice.options.includes('break_meld') && !hasCanastra) option = 'chain';
    if (choice.options.includes('lock_card') && (player?.hand?.length || 0) <= 2) option = 'chain';
    const event = resolveBossChoice(state, playerId, option);
    if (state.boss?.result) {
      state.finished = true;
      state.winnerTeamId = state.boss.result.victory ? 0 : 1;
    }
    if (event?.drawnCardIds?.length) state.boughtCardIds = [...event.drawnCardIds];
    if (event) {
      state.lastAction = { id: newActionId(), type: 'bossChoice', playerId, bossEvent: event, ts: Date.now() };
      await this.commitState();
      if (!hasPendingBossChoices(state)) startTurnTimerIfNeeded();
    }
    return event;
  },

  async evaluateBossMeldMutation(botIndex, meldIndex, oldKind, newKind, cards, options = {}) {
    const s = this.getState();
    const me = s?.players?.[botIndex];
    if (!s || !me) return false;
    const quote = getBossCreditLimitQuote(s, cards, {
      creditEligibleCardIds: options.creditEligibleCardIds ?? null,
    });
    if (
      quote?.debt > 0 &&
      !shouldBossBotAcceptCreditPlay(s, me.id, {
        cards,
        oldKind,
        newKind,
        creditEligibleCardIds: options.creditEligibleCardIds ?? null,
      })
    )
      return false;

    const interdict = Number.isInteger(meldIndex) ? getBossInterdictAttempt(s, me.teamId, meldIndex, oldKind, newKind) : null;
    if (!interdict) return true;
    const chains = getBossChains(s, me.id);
    const valuableEvolution = ['real', 'asas'].includes(newKind);
    const decision = chains < 3 && valuableEvolution ? 'disobey' : 'obey';
    const event = resolveBossInterdictAttempt(s, me.id, interdict.id, decision);
    if (event) s._pendingBossEvent = event;
    if (!event?.allowEvolution) {
      await this.commitState();
      return false;
    }
    return true;
  },

  acceptBossDiscardSurcharge(playerId, intent = null, naturePlan = null) {
    const s = this.getState();
    const surcharge = getBossDiscardSurcharge(s);
    if (!surcharge) return { allowed: true, event: null };
    if (intent && !shouldBossBotTakeDiscard(s, playerId, { intent, naturePlan })) return { allowed: false, event: null };
    if (!intent && (s.boss?.danger || 0) + surcharge.amount >= (s.boss?.maxDanger || 100)) return { allowed: false, event: null };
    return { allowed: true, event: consumeBossDiscardSurcharge(s, playerId) };
  },

  normalizeMeld(meld) {
    optimizeMeld(meld);
    normalizeMeldOrder(meld);
    autoSwapWildWhenFillingGap(meld);
    optimizeMeld(meld);
    normalizeMeldOrder(meld);
  },

  async _checkBotMortoOrWin(botIndex) {
    const s = this.getState();
    if (!s) return null;
    const me = s.players[botIndex];
    if (me.hand.length === 0) {
      const tookDead = takeDeadIfAvailableForPlayer(me);
      if (!tookDead) {
        if (teamHasGoodCanastra(me.teamId)) await finishGame(me.teamId);
      } else {
        showMessage(`🤖 Bot ${me.name} pegou o Morto!`);
        return tookDead;
      }
    }
    return null;
  },

  async executeMeldNew(botIndex, handIndexes) {
    const s = this.getState();
    if (!s) return;
    const me = s.players[botIndex];
    if (!canBossCreateMeld(s, me.id)) return false;
    const team = s.teams[me.teamId];
    const cards = handIndexes.map((i) => me.hand[i]);
    if (cards.some((card) => isBossCardBlocked(s, me.id, card?.id, 'play'))) return false;
    if (!validateBossMeldPlay(s, me.id, cards).allowed) return false;
    if (!(await this.evaluateBossMeldMutation(botIndex, team.melds.length, 'simple', classifyMeldForUi(cards).kind, cards))) return false;

    handIndexes.sort((a, b) => b - a).forEach((idx) => me.hand.splice(idx, 1));

    this.normalizeMeld(cards);
    team.melds.push(cards);
    const meldIdx = team.melds.length - 1;

    // CORRIGIDO: meldIdx no lugar do array
    let domReward = await processDominationReward(me, 'simple', classifyMeldForUi(cards).kind, meldIdx);
    const bossEvent = await processBossMeldChange(me, 'simple', classifyMeldForUi(cards).kind, meldIdx, cards, true);
    if (s.finished) return;
    const tookDead = domReward?.tookDead || (await this._checkBotMortoOrWin(botIndex));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'meldNew',
        playerId: botIndex,
        teamId: team.id,
        meldIndex: meldIdx,
        cards: cards.map(packCard),
        tookDead,
        drawnCards: domReward?.drawnCards,
        bossEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
  },

  async executeMeldExtend(botIndex, meldIndex, handIndexes) {
    const s = this.getState();
    if (!s) return;
    const me = s.players[botIndex];
    if (!canBossUseMeld(s, me.id, meldIndex)) return false;
    const team = s.teams[me.teamId];
    const cards = handIndexes.map((i) => me.hand[i]);
    if (cards.some((card) => isBossCardBlocked(s, me.id, card?.id, 'play'))) return false;
    if (!validateBossMeldPlay(s, me.id, cards).allowed) return false;

    const kindBefore = classifyMeldForUi(team.melds[meldIndex]).kind;
    const previewMeld = [...team.melds[meldIndex], ...cards].map((card) => ({ ...card }));
    optimizeMeld(previewMeld);
    normalizeMeldOrder(previewMeld);
    const kindAfter = classifyMeldForUi(previewMeld).kind;
    if (!(await this.evaluateBossMeldMutation(botIndex, meldIndex, kindBefore, kindAfter, cards))) return false;

    handIndexes.sort((a, b) => b - a).forEach((idx) => me.hand.splice(idx, 1));

    team.melds[meldIndex].push(...cards);
    this.normalizeMeld(team.melds[meldIndex]);

    let domReward = await processDominationReward(me, kindBefore, classifyMeldForUi(team.melds[meldIndex]).kind, meldIndex);
    const bossEvent = await processBossMeldChange(me, kindBefore, classifyMeldForUi(team.melds[meldIndex]).kind, meldIndex, cards);
    if (s.finished) return;
    const tookDead = domReward?.tookDead || (await this._checkBotMortoOrWin(botIndex));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'meldExtend',
        playerId: botIndex,
        teamId: team.id,
        meldIndex: meldIndex,
        cards: cards.map(packCard),
        tookDead,
        drawnCards: domReward?.drawnCards,
        bossEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
  },

  async executeDrawStock(botIndex) {
    const s = this.getState();
    if (!s) return;
    const me = s.players[botIndex];
    if (isBossVaultDrawRequired(s, botIndex)) {
      const vaultEvent = reclaimBossVault(s, botIndex);
      if (!vaultEvent) return;
      s.lastAction = { id: newActionId(), type: 'bossVaultReclaim', playerId: botIndex, bossEvent: vaultEvent, ts: Date.now() };
      await this.commitState();
      return;
    }
    const bossExtraCount = consumeBossExtraDraw(s, botIndex);
    const drawCount = ((s.mode === '1x1_duploMorto' || s.mode === '1x1_dominacao') && botIndex === 1 && !s.partialDraw ? 2 : 1) + bossExtraCount;
    const drawnCards = [];
    let recycledIndex = null;

    for (let i = 0; i < drawCount; i++) {
      if (!s.stock.length) {
        // 🛑 AWAIT ADICIONADO: O bot agora espera a animação de 2 segundos do morto terminar!
        recycledIndex = await recycleDeadToStockIfPossible();
        if (recycledIndex === null || !s.stock.length) {
          if (i === 0) {
            await finishGame(null);
            return;
          } else break;
        }
        // Animação redundante apagada (o recycleDeadToStockIfPossible já faz a carta voar)
      }
      const c = s.stock.pop();
      ensureCardId(c);
      me.hand.push(c);
      drawnCards.push(c);
    }

    const bossExtraCards = bossExtraCount > 0 ? drawnCards.slice(-bossExtraCount) : [];
    const financedEvent = registerBossFinancedCards(s, botIndex, bossExtraCards);

    sortHand(me.hand);
    s.hasDrawnThisTurn = true;
    s.partialDraw = false;

    const freshS = this.getState();
    if (freshS && drawnCards.length > 0) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'drawStock',
        playerId: botIndex,
        card: packCard(drawnCards[drawnCards.length - 1]),
        count: drawnCards.length,
        bossExtraCards: bossExtraCards.map(packCard),
        bossEvent: financedEvent,
        recycledDeadIndex: recycledIndex,
        ts: Date.now(),
      };
      await this.commitState();
    }
  },

  async executeDrawDiscard(botIndex) {
    const s = this.getState();
    if (!s) return false;
    if (isBossDiscardBlocked(s)) return false;
    if (!Array.isArray(s.discard) || s.discard.length === 0) {
      console.warn('[BOT] executeDrawDiscard chamado com lixo vazio. Possível jogada duplicada.');
      return false;
    }
    const me = s.players[botIndex];
    const surchargeDecision = this.acceptBossDiscardSurcharge(me.id);
    if (!surchargeDecision.allowed) return false;
    const pile = s.discard.splice(0, s.discard.length);
    pile.forEach(ensureCardId);
    const topCard = pile[pile.length - 1];
    if (!topCard) {
      console.warn('[BOT] executeDrawDiscard sem carta do topo.');
      return false;
    }

    me.hand.push(...pile);
    notifyBossDiscardTaken(s, me.id, pile);

    const bossExtraCount = consumeBossExtraDraw(s, botIndex);
    const bossExtraCards = [];
    for (let i = 0; i < bossExtraCount; i++) {
      if (!s.stock.length) await recycleDeadToStockIfPossible();
      if (!s.stock.length) break;
      const extraCard = s.stock.pop();
      ensureCardId(extraCard);
      me.hand.push(extraCard);
      bossExtraCards.push(extraCard);
    }
    const financedEvent = registerBossFinancedCards(s, botIndex, bossExtraCards);

    // INJEÇÃO DIRETA: Bot Dominador pega a 2ª carta do monte instantaneamente
    if ((s.mode === '1x1_duploMorto' || s.mode === '1x1_dominacao') && botIndex === 1) {
      // 🛑 SALVA-VIDAS: Prepara o morto caso o monte tenha acabado bem na carta extra dele!
      if (s.stock.length === 0) {
        await recycleDeadToStockIfPossible();
      }

      if (s.stock.length > 0) {
        const extraCard = s.stock.pop();
        ensureCardId(extraCard);
        me.hand.push(extraCard);
      }
    }

    sortHand(me.hand);
    s.hasDrawnThisTurn = true;
    s.partialDraw = false;
    s.pickedDiscardCardId = topCard.id;

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'drawDiscard',
        playerId: botIndex,
        card: packCard(topCard),
        count: pile.length,
        bossExtraCards: bossExtraCards.map(packCard),
        bossFinanceEvent: surchargeDecision.event,
        bossEvent: financedEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
    return true;
  },

  async executeDrawDiscardFechado(botIndex, intent) {
    const s = this.getState();
    if (!s) return false;
    if (isBossDiscardBlocked(s)) return false;
    if (!Array.isArray(s.discard) || s.discard.length === 0) {
      console.warn('[BOT] executeDrawDiscardFechado chamado com lixo vazio. Possível jogada duplicada.');
      return false;
    }
    const me = s.players[botIndex];
    const team = s.teams[me.teamId];
    const selectedHandCards = intent.action === 'new' ? (intent.handIndexes || []).map((index) => me.hand[index]).filter(Boolean) : [];
    if (intent.action === 'extend' && !canBossUseMeld(s, me.id, intent.meldIndex)) return false;
    if (intent.action === 'new') {
      if (!canBossCreateMeld(s, me.id)) return false;
      if (selectedHandCards.length !== (intent.handIndexes || []).length) return false;
      if (selectedHandCards.some((card) => isBossCardBlocked(s, me.id, card.id, 'play'))) return false;
    }
    const bossMeldValidation = validateBossMeldPlay(s, me.id, selectedHandCards, s.discard.slice(0, -1));
    if (!bossMeldValidation.allowed) return false;
    const previewTop = s.discard[s.discard.length - 1];
    const previewAddedCards = intent.action === 'new' ? [...selectedHandCards, previewTop] : [previewTop];
    const previewOldKind = intent.action === 'extend' ? classifyMeldForUi(team.melds[intent.meldIndex]).kind : 'simple';
    const previewMeld = intent.action === 'extend' ? [...team.melds[intent.meldIndex], previewTop] : [...selectedHandCards, previewTop];
    const previewNewKind = classifyMeldForUi(previewMeld).kind;
    const previewMeldIndex = intent.action === 'extend' ? intent.meldIndex : team.melds.length;
    const creditEligibleCardIds = selectedHandCards.map((card) => card.id);
    if (!(await this.evaluateBossMeldMutation(botIndex, previewMeldIndex, previewOldKind, previewNewKind, previewAddedCards, { creditEligibleCardIds }))) return false;
    const surchargeDecision = this.acceptBossDiscardSurcharge(me.id, intent, getBossNaturePriorities(s, me.id));
    if (!surchargeDecision.allowed) return false;
    const pile = s.discard.splice(0, s.discard.length);
    pile.forEach(ensureCardId);
    const topCard = pile.pop();
    notifyBossDiscardTaken(s, me.id, [...pile, topCard].filter(Boolean));
    if (!topCard) {
      console.warn('[BOT] executeDrawDiscardFechado sem carta do topo.');
      return false;
    }

    let kindBeforeFechado = '';
    let meldToCheck = null;
    let bossAddedCards = [topCard];

    if (intent.action === 'extend') {
      kindBeforeFechado = classifyMeldForUi(team.melds[intent.meldIndex]).kind;
      team.melds[intent.meldIndex].push(topCard);
      this.normalizeMeld(team.melds[intent.meldIndex]);
      meldToCheck = team.melds[intent.meldIndex];
    } else if (intent.action === 'new') {
      kindBeforeFechado = 'simple';
      const cardsFromHand = selectedHandCards;
      bossAddedCards = [...cardsFromHand, topCard];
      intent.handIndexes.sort((a, b) => b - a).forEach((idx) => me.hand.splice(idx, 1));
      const newMeld = [...cardsFromHand, topCard];
      this.normalizeMeld(newMeld);
      team.melds.push(newMeld);
      meldToCheck = newMeld;
    }

    if (pile.length > 0) {
      me.hand.push(...pile);
    }

    const bossExtraCount = consumeBossExtraDraw(s, botIndex);
    const bossExtraCards = [];
    for (let i = 0; i < bossExtraCount; i++) {
      if (!s.stock.length) await recycleDeadToStockIfPossible();
      if (!s.stock.length) break;
      const extraCard = s.stock.pop();
      ensureCardId(extraCard);
      me.hand.push(extraCard);
      bossExtraCards.push(extraCard);
    }
    const financedEvent = registerBossFinancedCards(s, botIndex, bossExtraCards);

    if ((s.mode === '1x1_duploMorto' || s.mode === '1x1_dominacao') && botIndex === 1) {
      // 🛑 SALVA-VIDAS: Prepara o morto caso o monte tenha acabado bem na carta extra dele!
      if (s.stock.length === 0) {
        await recycleDeadToStockIfPossible();
      }

      if (s.stock.length > 0) {
        const extraCard = s.stock.pop();
        ensureCardId(extraCard);
        me.hand.push(extraCard);
      }
    }

    const targetIdx = intent.action === 'extend' ? intent.meldIndex : team.melds.length - 1;
    let domReward = await processDominationReward(me, kindBeforeFechado, classifyMeldForUi(meldToCheck).kind, targetIdx);
    const cardOriginsById = Object.fromEntries(bossAddedCards.map((card) => [card.id, creditEligibleCardIds.includes(card.id) ? 'hand' : 'discard']));
    const bossEvent = await processBossMeldChange(me, kindBeforeFechado || 'simple', classifyMeldForUi(meldToCheck).kind, targetIdx, bossAddedCards, intent.action === 'new', { creditEligibleCardIds, cardOriginsById });
    if (s.finished) return true;

    sortHand(me.hand);
    s.hasDrawnThisTurn = true;
    s.partialDraw = false;
    s.pickedDiscardCardId = null;

    const tookDead = domReward?.tookDead || (await this._checkBotMortoOrWin(botIndex));

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'drawDiscardFechado',
        playerId: botIndex,
        tookDead,
        drawnCards: domReward?.drawnCards,
        bossExtraCards: bossExtraCards.map(packCard),
        bossFinanceEvent: financedEvent || surchargeDecision.event,
        bossSurchargeEvent: surchargeDecision.event,
        bossEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
    return true;
  },

  async executeDiscard(botIndex, cardIndex) {
    const s = this.getState();
    if (!s) return false;
    const me = s.players[botIndex];
    if (isBossCardBlocked(s, me.id, me.hand[cardIndex]?.id, 'discard')) {
      cardIndex = me.hand.findIndex((card) => !isBossCardBlocked(s, me.id, card?.id, 'discard') && card?.id !== s.pickedDiscardCardId);
    }
    if (cardIndex < 0) return false;
    const card = me.hand[cardIndex];

    const discardOrderEvents = notifyBossCardDiscarded(s, me.id, card);
    if (discardOrderEvents.length) s._pendingBossEvent = discardOrderEvents[discardOrderEvents.length - 1];

    me.hand.splice(cardIndex, 1);
    s.discard.push(card);

    let tookDead = null;
    if (me.hand.length === 0) tookDead = takeDeadIfAvailableForPlayer(me);

    if (me.hand.length === 0 && !canTeamTakeDeadNow(me.teamId)) {
      if (teamHasGoodCanastra(me.teamId)) await finishGame(me.teamId);
      else await finishGame(me.teamId === 0 ? 1 : 0);
      return true;
    }

    passTurn({ preserveUndo: true });

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = { id: newActionId(), type: 'discard', playerId: botIndex, card: packCard(card), tookDead, bossEvent: freshS._pendingBossEvent || null, ts: Date.now() };
      delete freshS._pendingBossEvent;
      await this.commitState();
    }
    return true;
  },

  async recoverBotTurn(botIndex) {
    const s = this.getState();
    const me = s?.players?.[botIndex];
    if (!s || !me || s.finished) return false;
    normalizeBossState(s);
    const legalIndex = me.hand.findIndex((card) => card?.id && card.id !== s.pickedDiscardCardId && !isBossCardBlocked(s, me.id, card.id, 'discard'));
    if (legalIndex < 0) return false;
    return this.executeDiscard(botIndex, legalIndex);
  },
};

function createBotEngineForSession(sessionId, signal, { delayScale = 1, bossLabOutcome = null } = {}) {
  const engine = Object.create(botEngine);
  engine.botDelayScale = delayScale;
  engine.isActive = () => isGameSessionActive(sessionId, signal);
  engine.getState = () => (engine.isActive() ? state : null);
  engine.commitState = async () => {
    if (!engine.isActive()) {
      const error = new Error('Commit do bot cancelado para uma sessao antiga.');
      error.name = 'AbortError';
      throw error;
    }
    await commitState();
  };
  if (bossLabOutcome === 'failure') {
    engine.shouldForceStockDraw = () => true;
    engine.shouldSkipMelds = () => true;
    engine.selectBossLabDiscardIndex = (playerId, hand) => {
      const payload = state?.boss?.currentIntent?.payload || {};
      const protectedIds = new Set([payload.cardId, ...(payload.cardIds || []), ...(payload.lockedCards || []).filter((entry) => entry?.playerId === playerId).map((entry) => entry.cardId)].filter(Boolean));
      const requiredSuit = payload.suit || null;
      const legalCards = (hand || []).map((card, index) => ({ card, index })).filter(({ card }) => card?.id && card.id !== state?.pickedDiscardCardId && !engine.isCardBlocked?.(playerId, card.id, 'discard'));
      const harmless = legalCards.find(({ card }) => !protectedIds.has(card.id) && (!requiredSuit || card.suit !== requiredSuit));
      return (harmless || legalCards.find(({ card }) => !protectedIds.has(card.id)) || legalCards[0])?.index ?? -1;
    };
  }
  return engine;
}

function getDiceSpawnPosition(pid) {
  const seat = seatForPlayer(pid);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (seat === 'self') return { x: vw / 2 - 80, y: vh - 220 };
  if (seat === 'top') return { x: vw / 2 - 80, y: 180 };
  if (seat === 'left') return { x: 180, y: vh / 2 };
  if (seat === 'right') return { x: vw - 220, y: vh / 2 };
  return { x: vw / 2, y: vh / 2 };
}

function create3DDiceElement(roll, endX, endY) {
  const scene = document.createElement('div');
  scene.className = 'dice-scene';
  scene.style.left = endX + 'px';
  scene.style.top = endY + 'px';

  const bounce = document.createElement('div');
  bounce.className = 'dice-bounce';
  const cube = document.createElement('div');
  cube.className = 'dice-cube';

  for (let i = 1; i <= 6; i++) {
    const face = document.createElement('div');
    face.className = `face face-${i}`;
    for (let p = 0; p < i; p++) {
      const pip = document.createElement('span');
      pip.className = `pip pip-${p + 1}`;
      face.appendChild(pip);
    }
    cube.appendChild(face);
  }
  bounce.appendChild(cube);
  scene.appendChild(bounce);

  let rx = 0,
    ry = 0;
  switch (roll) {
    case 1:
      rx = 0;
      ry = 0;
      break;
    case 6:
      rx = 0;
      ry = 180;
      break;
    case 2:
      rx = 90;
      ry = 0;
      break;
    case 5:
      rx = -90;
      ry = 0;
      break;
    case 3:
      rx = 0;
      ry = -90;
      break;
    case 4:
      rx = 0;
      ry = 90;
      break;
  }

  // ALINHAMENTO PERFEITO: Trava chapado na mesa
  const orthoZ = [0, 90, 180, -90];
  const finalRx = rx;
  const finalRy = ry;
  const finalRz = orthoZ[Math.floor(Math.random() * orthoZ.length)];

  // VETOR DE ARREMESSO: Vem de mais alto e mais longe
  const throwDirX = endX > window.innerWidth / 2 ? -450 : 450;
  const throwDirY = 350;

  // 1. ANIMAÇÃO DE ROLAMENTO E IMPACTO (2.5s)
  bounce.animate(
    [
      { transform: `translate(${throwDirX}px, ${throwDirY}px) scale(2)` },
      { transform: `translate(${throwDirX * 0.6}px, ${throwDirY * 0.6}px) scale(1.2)`, offset: 0.25, easing: 'ease-out' },
      { transform: `translate(${throwDirX * 0.3}px, ${throwDirY * 0.3 - 80}px) scale(1.15)`, offset: 0.4, easing: 'ease-in' },
      { transform: `translate(${throwDirX * 0.15}px, ${throwDirY * 0.15}px) scale(1.08)`, offset: 0.55, easing: 'ease-out' },
      { transform: `translate(${throwDirX * 0.05}px, ${throwDirY * 0.05 - 30}px) scale(1.03)`, offset: 0.7, easing: 'ease-in' },
      { transform: `translate(${throwDirX * 0.01}px, ${throwDirY * 0.01}px) scale(1)`, offset: 0.85, easing: 'ease-out' },
      { transform: `translate(0px, 0px) scale(1)` },
    ],
    { duration: 3500, fill: 'forwards' },
  );

  // 2. ANIMAÇÃO DE ATRITO E ROTAÇÃO (Giros caóticos até travar reto)
  const startRx = finalRx + 1440 * (Math.random() > 0.5 ? 1 : -1);
  const startRy = finalRy + 1800 * (Math.random() > 0.5 ? 1 : -1);
  const startRz = finalRz + 720 * (Math.random() > 0.5 ? 1 : -1);

  // A MÁGICA AQUI: O rotateZ precisa ser o primeiro da string para girar o dado em relação à câmera e não se auto-tombar.
  cube.animate([{ transform: `rotateZ(${startRz}deg) rotateX(${startRx}deg) rotateY(${startRy}deg)` }, { transform: `rotateZ(${finalRz}deg) rotateX(${finalRx}deg) rotateY(${finalRy}deg)` }], {
    duration: 3500,
    easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
    fill: 'forwards',
  });

  // 3. FADE OUT
  scene.animate([{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 6000, fill: 'forwards' });

  return scene;
}

// Flag de controle para bloquear re-escrita do lobby durante carregamento de cache
window.isFirstLobbyLoad = true;

onSnapshot(gameRef, async (snap) => {
  if (!snap.exists()) {
    invalidateGameSession();
    window.stopBossLabReportTimer?.();
    localExitPending = false;
    releaseScreen();
    toggleMenuVideos(true);

    if (window.startTimer) {
      clearInterval(window.startTimer);
      window.startTimer = null;
    }

    const playerUI = document.querySelector('.player-interface');
    if (playerUI) playerUI.classList.remove('active-turn-glow');

    selectedHandIndexes.clear();
    movingWild = null;
    selectedMeldTarget = null;

    const localSelect = document.getElementById('localPlayerSelect');
    if (localSelect) {
      localSelect.value = myPlayerIndex !== -1 ? myPlayerIndex.toString() : '';
    }

    lastSeenActionId = null;
    ignoreOwnActionId = null;
    window.lastScores = [0, 0];
    window.diceAnnounced = false;
    activeTurnNumber = -1;
    stopTurnTimer();

    document.getElementById('meldsP1').innerHTML = '';
    document.getElementById('meldsP2').innerHTML = '';
    document.getElementById('opponentTop').innerHTML = '';
    document.getElementById('opponentLeft').innerHTML = '';
    document.getElementById('opponentRight').innerHTML = '';
    document.querySelector('#handContainer .cards-row').innerHTML = '';
    document.getElementById('discardFace').style.display = 'none';

    const liveM1 = document.getElementById('liveMoney1');
    if (liveM1) liveM1.style.display = 'none';
    const liveM2 = document.getElementById('liveMoney2');
    if (liveM2) liveM2.style.display = 'none';

    document.getElementById('gameSection').style.display = 'none';
    document.getElementById('scoreSection').style.display = 'none';
    document.getElementById('surrenderSection').style.display = 'none';
    document.getElementById('bossResultSection').style.display = 'none';
    document.getElementById('bossHud').style.display = 'none';
    document.body.classList.remove('boss-mode');
    document.body.removeAttribute('data-boss-id');
    lastRenderedBossEventId = null;
    lastAnimatedBossSwapId = null;
    renderedBossFeedbackCount = null;
    renderedBossFeedbackEventIds = null;
    lastRenderedBossBloom = null;
    lastRenderedBossBloomEventId = null;
    lastSeenBossLogKey = null;
    lastBossVictorySoundKey = null;
    lastBossIntroSoundKey = null;
    seenBossResourceSoundEventIds = null;
    bossResourceSoundScope = null;
    renderedBossMeldContributions.clear();

    const overlay = document.getElementById('countdownOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.startTimer) {
      clearInterval(window.startTimer);
      window.startTimer = null;
    }

    state = null;
    currentLobby = null;
    for (let i = 0; i < 4; i++) {
      const r = document.getElementById('ready' + i);
      if (r) r.style.display = 'none';
      const nameInput = document.getElementById(`p${i + 1}Name`);
      if (nameInput) {
        nameInput.style.backgroundColor = '';
        nameInput.style.borderColor = '';
        nameInput.style.color = '';
        nameInput.style.boxShadow = '';
      }
    }
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.textContent = 'ESTOU PRONTO';
      startBtn.style.background = '';
      startBtn.style.boxShadow = '';
    }

    if (introFinished) {
      document.getElementById('configSection').style.display = 'flex';
      if (typeof window.updateMenuDynamic === 'function') window.updateMenuDynamic();

      // 🔥 CORREÇÃO: Bloqueia o pushLobby imediato no reset de testes para não corromper o cache do navegador
      if (!window.isFirstLobbyLoad) {
        if (typeof window.pushLobby === 'function') window.pushLobby();
      }
      window.isFirstLobbyLoad = false;
    }
    resetCanastraSfxMemory();
    return;
  }

  const data = snap.data();

  if (!data.stateJson && data.lobby) {
    if (state || document.getElementById('gameSection').style.display === 'flex') {
      invalidateGameSession();
      window.stopBossLabReportTimer?.();
      localExitPending = false;
      state = null;
      toggleMenuVideos(true);
    }
    stopTableAmbientMusic(false);
    if (introFinished) {
      document.getElementById('configSection').style.display = 'flex';
      document.getElementById('gameSection').style.display = 'none';
    }

    const l = { ...data.lobby };

    const setIfUnfocused = (id, val) => {
      const el = document.getElementById(id);
      if (document.activeElement !== el && el.value !== String(val)) el.value = val;
    };

    const lobbyBoss = getBossDefinitionForMode(l.mode);
    l.variant = normalizeVariantForMode(l.mode, l.variant || '');
    currentLobby = l;
    setIfUnfocused('modeSelect', lobbyBoss ? COOPERATIVE_MENU_MODE : l.mode || '');
    if (lobbyBoss) setIfUnfocused('bossSelect', lobbyBoss.id);
    setIfUnfocused('variantSelect', l.variant || '');
    setIfUnfocused('deckThemeSelect', l.deckTheme || 'classico');
    setIfUnfocused('tableThemeSelect', l.tableTheme || 'feltro'); // Sincroniza inputs entre abas
    setIfUnfocused('betToggle', l.betToggle || '');
    setIfUnfocused('betBase', l.betBase || 5);
    setIfUnfocused('betPerPoint', l.betPerPoint || 0.01);
    if (l.names) {
      setIfUnfocused('p1Name', l.names[0] || '');
      setIfUnfocused('p2Name', l.names[1] || '');
      setIfUnfocused('p3Name', l.names[2] || '');
      setIfUnfocused('p4Name', l.names[3] || '');
    }

    // CHAMA A FUNÇÃO NOVA AQUI PARA ATUALIZAR A TELA COM OS DADOS DO BANCO
    window.updateMenuDynamic();

    document.getElementById('betConfig').style.display = l.betToggle === 'sim' ? 'block' : 'none';

    const ready = l.ready || [false, false, false, false];

    for (let i = 0; i < 4; i++) {
      const nameInput = document.getElementById(`p${i + 1}Name`);
      const oldCheck = document.getElementById(`ready${i}`);

      if (oldCheck) oldCheck.style.display = 'none'; // Esconde o emoji definitivamente

      if (nameInput) {
        if (ready[i]) {
          // Acende o input com a cor verde harmoniosa
          nameInput.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
          nameInput.style.borderColor = '#22c55e';
          nameInput.style.color = '#4ade80';
          nameInput.style.boxShadow = 'inset 0 0 15px rgba(34, 197, 94, 0.2)';
        } else {
          // Devolve para a cor padrão do CSS
          nameInput.style.backgroundColor = '';
          nameInput.style.borderColor = '';
          nameInput.style.color = '';
          nameInput.style.boxShadow = '';
        }
      }
    }

    const btn = document.getElementById('startBtn');
    if (ready[myPlayerIndex]) {
      btn.textContent = 'CANCELAR PRONTO';
      btn.style.background = '#334155';
      btn.style.boxShadow = 'none';
    } else {
      btn.textContent = 'ESTOU PRONTO';
      btn.style.background = '';
      btn.style.boxShadow = '';
    }

    let req = 2;
    if (l.mode === '1x2') req = 3;
    if (l.mode === '2x2') req = 4;

    let readyCount = 0;
    for (let i = 0; i < req; i++) if (ready[i]) readyCount++;

    if (readyCount === req) {
      // TRAVA NOVA: Impede de iniciar se faltar a Regra ou o Dinheiro
      if (!currentLobby.variant || !currentLobby.betToggle) {
        document.getElementById('menuError').textContent = '⚠️ Escolha a Regra e Valendo Dinheiro antes de iniciar!';
        document.getElementById('menuError').style.display = 'block';
        return; // Para tudo aqui e não deixa começar
      } else {
        document.getElementById('menuError').style.display = 'none';
      }

      // Verifica se a sala é 100% bot
      let allBots = true;
      for (let i = 0; i < req; i++) {
        if (!currentLobby.names[i] || !currentLobby.names[i].toUpperCase().includes('BOT')) {
          allBots = false;
          break;
        }
      }

      // Trava de segurança: Exige cadeira APENAS se tiver algum humano jogando
      if (!allBots && (myPlayerIndex === -1 || isNaN(myPlayerIndex))) {
        if (window.startTimer) {
          clearInterval(window.startTimer);
          window.startTimer = null;
        }
        document.getElementById('countdownOverlay').style.display = 'flex';
        document.getElementById('countdownText').textContent = '⚠️';
        document.getElementById('countdownText').nextElementSibling.textContent = 'Selecione quem você é (Sou) para iniciar!';
        return;
      }

      if (!window.startTimer) {
        // 🔥 CORREÇÃO DEV: Se estiver em modo debug, pula o contador visual e inicia em 0 segundos
        if (isDebugMode) {
          let hostIdx = currentLobby.names.findIndex((n) => n && !n.toUpperCase().includes('BOT'));
          if (hostIdx === -1) hostIdx = myPlayerIndex;
          if (myPlayerIndex === hostIdx || myPlayerIndex === -1) {
            startGame(currentLobby.mode, currentLobby.names, currentLobby.variant, currentLobby.pixKeys);
          }
          return;
        }

        let timeLeft = 5;
        document.getElementById('countdownOverlay').style.display = 'flex';
        document.getElementById('countdownText').textContent = timeLeft;
        document.getElementById('countdownText').nextElementSibling.textContent = 'A partida vai começar!';

        window.startTimer = setInterval(() => {
          // 🛡️ TRAVA ANTI-FANTASMA: Se a aba estiver minimizada, pausa a contagem
          if (document.hidden) return;

          timeLeft--;
          document.getElementById('countdownText').textContent = timeLeft;
          if (timeLeft <= 0) {
            clearInterval(window.startTimer);
            window.startTimer = null;

            let hostIdx = currentLobby.names.findIndex((n) => n && !n.toUpperCase().includes('BOT'));
            // Se for 100% bot, o observador (-1) vira o Host
            if (hostIdx === -1) hostIdx = myPlayerIndex;

            if (myPlayerIndex === hostIdx) {
              startGame(currentLobby.mode, currentLobby.names, currentLobby.variant, currentLobby.pixKeys);
            }
          }
        }, 1000);
      }
    } else {
      if (window.startTimer) {
        clearInterval(window.startTimer);
        window.startTimer = null;
      }
      const overlay = document.getElementById('countdownOverlay');
      if (overlay) overlay.style.display = 'none';
    }
    return;
  }

  if (!data.stateJson) return;

  const newState = JSON.parse(data.stateJson);
  // Compatibilidade com partidas salvas enquanto existia o modal de posicao do coringa.
  delete newState.pendingWildcardChoice;
  newState.variant = normalizeVariantForMode(newState.mode, newState.variant);
  if (newState.surrender?.active) {
    state = newState;
    if (!window.isClosingGame) invalidateGameSession({ stopMedia: false });
    renderSurrender();
    return;
  }

  if (!state || window.isClosingGame) activateGameSession();
  const snapshotSessionId = window.gameSessionId;
  if (state && !state.finished && newState.finished) playCanastraSfx('fim');

  // 🚀 INTERCEPTOR GRAFICO: Captura a nova ação remota ANTES de aplicar as mutações de dados no state
  const a = newState.lastAction;
  const isNewRemoteAction = a && a.id !== lastSeenActionId && a.id !== ignoreOwnActionId;

  if (isNewRemoteAction) {
    localUndoStack = [];
    lastSeenActionId = a.id;
    resetTurnTimer();

    // 1. Executa a animação de voo com os elementos gráficos e cartas atuais ainda fixados na mão
    try {
      await playRemoteAction(a);
    } catch (error) {
      if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
      throw error;
    }
    if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
  } else if (a && a.id === ignoreOwnActionId) {
    // Trava de segurança: Limpa a flag do autor e impede qualquer re-execução visual
    lastSeenActionId = a.id;
    ignoreOwnActionId = null;
  }

  // 2. Após o término do voo, atualiza a memória com o novo estado e renderiza limpando o DOM de forma síncrona
  if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
  state = newState;
  movingWild = null;
  selectedHandIndexes.clear();

  document.getElementById('configSection').style.display = 'none';
  document.getElementById('gameSection').style.display = 'flex';
  keepScreenAlive();

  toggleMenuVideos(false);
  syncTableAmbientMusic();

  renderAll();
  startTurnTimerIfNeeded();

  // 🎲 Anuncia quem venceu no dado assim que a mesa carrega (Isolado no fluxo estável)
  if (!isNewRemoteAction) {
    if (state.turnNumber === 0 && !state.hasDrawnThisTurn && state.diceRolls && !window.diceAnnounced) {
      window.diceAnnounced = true;
      const starterName = state.players[state.currentPlayer].name;
      const maxRoll = Math.max(...state.diceRolls);

      const pi = document.querySelector('.player-interface');
      const bm = document.querySelector('.board-middle');

      if (isDebugMode) {
        playBossIntroSoundOnce(state);
        showMessage(`🎲 Sorteio: ${starterName} tirou ${maxRoll} e começa!`);
        if (pi) pi.style.pointerEvents = 'auto';
        if (bm) bm.style.pointerEvents = 'auto';
      } else {
        if (pi) pi.style.pointerEvents = 'none';
        if (bm) bm.style.pointerEvents = 'none';

        state.players.forEach((p) => {
          const roll = state.diceRolls[p.id];
          if (!roll) return;
          const pos = getDiceSpawnPosition(p.id);
          const diceScene = create3DDiceElement(roll, pos.x, pos.y);
          document.body.appendChild(diceScene);
          setTimeout(() => diceScene.remove(), 6000);
        });

        setTimeout(() => {
          playBossIntroSoundOnce(state);
          if (hasPendingBossChoices(state)) {
            window.isAutoPlaying = false;
            renderAll();
            return;
          }
          showMessage(`🎲 Sorteio: ${starterName} tirou ${maxRoll} e começa!`);
          if (pi) pi.style.pointerEvents = 'auto';
          if (bm) bm.style.pointerEvents = 'auto';

          if (state.currentPlayer === myPlayerIndex) {
            if (navigator.vibrate && audioUnlocked) {
              try {
                navigator.vibrate([150, 80, 150]);
              } catch (e) {}
            }
            if (audioUnlocked) {
              try {
                sfxMyTurn.pause();
                sfxMyTurn.currentTime = 0;
                sfxMyTurn.play().catch(() => {});
              } catch (e) {}
            }
          }
        }, 3700);
      }
    }
  }

  // --- GATILHO DA INTELIGÊNCIA ARTIFICIAL (SINCRONIZADO) ---
  const pendingBotChoice = state.boss?.pendingChoices?.find((choice) =>
    state.players
      ?.find((player) => player.id === choice.playerId)
      ?.name?.toUpperCase()
      .includes('BOT'),
  );
  if (!state.finished && !isBossLabAutomationPaused() && pendingBotChoice) {
    let hostIdx = state.players.findIndex((player) => player && !player.name.toUpperCase().includes('BOT'));
    if (hostIdx === -1) hostIdx = myPlayerIndex;
    if (myPlayerIndex === hostIdx && !window.botPlayTimeoutId) {
      const sessionId = window.gameSessionId;
      const signal = botTurnController.signal;
      window.botPlayTimeoutId = setTimeout(async () => {
        window.botPlayTimeoutId = null;
        if (!isGameSessionActive(sessionId, signal) || !hasPendingBossChoices(state)) return;
        const sessionEngine = createBotEngineForSession(sessionId, signal);
        await sessionEngine.resolvePendingBossChoice(pendingBotChoice.playerId);
      }, 700);
    }
  } else if (!state.finished && !isBossLabAutomationPaused() && !hasPendingBossChoices(state) && !isBossTurnActive(state)) {
    const currentPlayerObj = state.players[state.currentPlayer];

    if (currentPlayerObj && currentPlayerObj.name.toUpperCase().includes('BOT')) {
      let hostIdx = state.players.findIndex((p) => p && !p.name.toUpperCase().includes('BOT'));
      if (hostIdx === -1) hostIdx = myPlayerIndex;

      if (myPlayerIndex === hostIdx) {
        if (window.lastBotTurnPlayed !== state.turnNumber) {
          // 🛡️ TRAVA DE SINCRONIA: Se for o sorteio inicial (Turno 0), espera o dado parar (4s)
          // Caso contrário, espera apenas o delay normal de processamento (0.6s)
          const botDelay = state.turnNumber === 0 ? 4000 : 600;
          const scheduledTurn = state.turnNumber;
          const scheduledPlayerId = currentPlayerObj.id;
          const scheduledSessionId = window.gameSessionId;
          const scheduledSignal = botTurnController.signal;

          if (window.botPlayTimeoutId) {
            clearTimeout(window.botPlayTimeoutId);
            window.botPlayTimeoutId = null;
          }

          window.botPlayTimeoutId = setTimeout(() => {
            window.botPlayTimeoutId = null;

            if (!isGameSessionActive(scheduledSessionId, scheduledSignal)) return;
            if (!state || state.finished) return;
            if (isBossTurnActive(state) || hasPendingBossChoices(state)) return;
            if (document.getElementById('gameSection').style.display !== 'flex') return;
            if (state.debugPaused) return; // 🛑 CORTA A IA IMEDIATAMENTE
            if (isBossLabAutomationPaused()) return;
            if (state.turnNumber !== scheduledTurn) return;
            if (state.currentPlayer !== scheduledPlayerId) return;

            window.lastBotTurnPlayed = state.turnNumber;
            const sessionEngine = createBotEngineForSession(scheduledSessionId, scheduledSignal);
            BuracoBot.playTurn(state, state.currentPlayer, sessionEngine, { signal: scheduledSignal, sessionId: scheduledSessionId }).catch((err) => {
              if (BuracoBot.isCancellationError(err)) return;
              console.error('Erro na Matrix:', err);
              window.lastBotTurnPlayed = null;
            });
          }, botDelay);
        }
      }
    }
  }
});

window.pushLobby = function () {
  applyCooperativeBossPreset();
  const mode = getEffectiveMenuMode();
  const resetReady = currentLobby && currentLobby.mode !== mode;

  const pt1 = document.getElementById('pixTeam1');
  const pt2 = document.getElementById('pixTeam2');

  // Atualiza o cache seguro APENAS se o jogador tiver permissão para digitar
  if (!pt1.disabled) pt1.dataset.rawPix = pt1.value.trim();
  if (!pt2.disabled) pt2.dataset.rawPix = pt2.value.trim();

  const lobby = {
    mode: mode,
    bossId: getBossDefinitionForMode(mode)?.id || null,
    variant: normalizeVariantForMode(mode, document.getElementById('variantSelect').value),
    deckTheme: document.getElementById('deckThemeSelect').value,
    tableTheme: document.getElementById('tableThemeSelect').value, // Sincroniza escolha no lobby do Firebase
    betToggle: document.getElementById('betToggle').value,
    betBase: document.getElementById('betBase').value,
    betPerPoint: document.getElementById('betPerPoint').value,
    names: [document.getElementById('p1Name').value, document.getElementById('p2Name').value, document.getElementById('p3Name').value, document.getElementById('p4Name').value],
    pixKeys: [pt1.dataset.rawPix || '', pt2.dataset.rawPix || ''],
  };

  let readyArray = [false, false, false, false];
  if (currentLobby && currentLobby.ready && !resetReady) {
    readyArray = [...currentLobby.ready];
  }

  lobby.ready = readyArray;
  setDoc(gameRef, { lobby: lobby, updatedAt: Date.now() }, { merge: true });
};

window.fillEmptyWithBots = function () {
  const femaleNames = [
    'Luana',
    'Camila',
    'Juliana',
    'Amanda',
    'Letícia',
    'Fernanda',
    'Beatriz',
    'Larissa',
    'Mariana',
    'Carolina',
    'Sofia',
    'Isabella',
    'Helena',
    'Valentina',
    'Laura', // Originais
    'Gabriela',
    'Rafaela',
    'Manuela',
    'Lorena',
    'Nicole',
    'Rebeca',
    'Vitória',
    'Alice',
    'Clara',
    'Marina',
    'Bianca',
    'Lívia',
    'Cecília',
    'Mirella',
    'Esther',
    'Sarah',
    'Antonella',
    'Giovanna',
    'Maya',
    'Isadora',
    'Clarice',
    'Pérola',
    'Aurora',
    'Olívia',
    'Bárbara',
    'Daniela',
    'Priscila',
    'Tatiana',
    'Renata',
    'Vanessa',
    'Patrícia',
    'Milena',
    'Brenda',
    'Natália',
  ];

  const mode = getEffectiveMenuMode();
  if (!mode) return;

  let reqPlayers = 2;
  if (mode === '1x2') reqPlayers = 3;
  if (mode === '2x2' || mode === '1x3') reqPlayers = 4;

  let added = false;
  for (let i = 1; i <= reqPlayers; i++) {
    const input = document.getElementById(`p${i}Name`);
    if (input && input.value.trim() === '') {
      const randomName = femaleNames[Math.floor(Math.random() * femaleNames.length)];
      input.value = `BOT ${randomName}`;
      added = true;
    }
  }

  if (added) {
    if (typeof window.updateMenuDynamic === 'function') window.updateMenuDynamic();
    if (typeof window.pushLobby === 'function') window.pushLobby();
  }
};

document.querySelectorAll('#configSection input').forEach((el) => {
  if (el.id !== 'localPlayerSelect') {
    el.addEventListener('keyup', (e) => {
      clearTimeout(el.syncTimer);
      // PONTO 3 RESOLVIDO: Se detectar "BOT", espera 5 segundos para dar tempo de terminar o complemento
      const delay = el.value.toUpperCase().includes('BOT') ? 5000 : 400;
      el.syncTimer = setTimeout(() => {
        updateMenuDynamic();
        pushLobby();
      }, delay);
    });
  }
});

document.querySelectorAll('#configSection select').forEach((el) => {
  if (el.id !== 'localPlayerSelect') {
    el.addEventListener('change', () => {
      updateMenuDynamic();
      pushLobby();
    });
  }
});

const arcadeCarTimers = new WeakMap();

function getArcadeCarHosts() {
  return document.querySelectorAll(`
        body[data-deck-theme="arcade"] .back-red:not(.sub-layer),
        body[data-deck-theme="arcade"] .back-blue:not(.sub-layer),
        body[data-deck-theme="arcade"] .fly-card.back:not(.back-blue):not(.sub-layer),
        body[data-deck-theme="arcade"] .fly-card.back.back-blue:not(.sub-layer),
        body[data-deck-theme="arcade"] .opponent-card-back:not(.back-blue):not(.sub-layer),
        body[data-deck-theme="arcade"] .opponent-card-back.back-blue:not(.sub-layer),
        body[data-deck-theme="arcade"] #mortoSlot0 .morto-card-back:not(.sub-layer),
        body[data-deck-theme="arcade"] #mortoSlot1 .morto-card-back:not(.sub-layer),
        body[data-deck-theme="arcade"] .morto-card-back:not(.back-blue):not(.sub-layer),
        body[data-deck-theme="arcade"] .morto-card-back.back-blue:not(.sub-layer),
        body[data-deck-theme="arcade"] #drawStockBtn .pile-card.back-red:not(.sub-layer),
        body[data-deck-theme="arcade"] #drawStockBtn .pile-card.back-blue:not(.sub-layer),
        body[data-deck-theme="arcade"] .carta.mini.back:not(.back-blue):not(.sub-layer),
        body[data-deck-theme="arcade"] .carta.mini.back.back-blue:not(.sub-layer)
      `);
}

function clearArcadeCarTimer(el) {
  const oldTimer = arcadeCarTimers.get(el);
  if (oldTimer) {
    clearTimeout(oldTimer);
    arcadeCarTimers.delete(el);
  }
}

function scheduleArcadeCar(el, force = false) {
  if (!el || !document.contains(el)) return;

  if (!force && arcadeCarTimers.has(el)) return;

  clearArcadeCarTimer(el);

  const run = () => {
    if (!document.contains(el) || document.body.dataset.deckTheme !== 'arcade') {
      clearArcadeCarTimer(el);
      el.classList.remove('arcade-car-run');
      return;
    }

    el.classList.remove('arcade-car-run');
    void el.offsetWidth;
    el.classList.add('arcade-car-run');

    const waitMs = 8000 + Math.floor(Math.random() * 2001);
    const totalMs = 1550 + waitMs;

    const timer = setTimeout(run, totalMs);
    arcadeCarTimers.set(el, timer);
  };

  const initialWait = 500 + Math.floor(Math.random() * 700);
  const timer = setTimeout(run, initialWait);
  arcadeCarTimers.set(el, timer);
}

function refreshArcadeCars(force = false) {
  if (!document.body || document.body.dataset.deckTheme !== 'arcade') return;

  const hosts = getArcadeCarHosts();
  if (!hosts || !hosts.length) return;

  hosts.forEach((el) => {
    if (!el) return;
    scheduleArcadeCar(el, force);
  });
}

const MYTHIC_CYCLE_MS = 9500;
const mythicPhaseStartedAt = Date.now();

function syncMythicPhase() {
  if (!document.body) return;

  const phaseMs = (Date.now() - mythicPhaseStartedAt) % MYTHIC_CYCLE_MS;
  document.body.style.setProperty('--mythic-delay', `-${phaseMs}ms`);
}

// Função que atualiza a quantidade de inputs e os labels do menu
window.updateMenuDynamic = function () {
  const menuMode = document.getElementById('modeSelect').value;
  const cooperative = menuMode === COOPERATIVE_MENU_MODE;
  const bossDefinition = cooperative ? applyCooperativeBossPreset() : null;
  const mode = cooperative ? bossDefinition?.mode || '' : menuMode;

  const bossSelectField = document.getElementById('bossSelectField');
  const variantMenuField = document.getElementById('variantMenuField');
  const visualMenuBlock = document.getElementById('visualMenuBlock');
  const moneyMenuBlock = document.getElementById('moneyMenuBlock');
  if (bossSelectField) bossSelectField.style.display = cooperative ? '' : 'none';
  if (variantMenuField) variantMenuField.style.display = cooperative ? 'none' : '';
  if (visualMenuBlock) visualMenuBlock.style.display = cooperative ? 'none' : '';
  if (moneyMenuBlock) moneyMenuBlock.style.display = cooperative ? 'none' : '';

  // 🎨 ATUALIZA A MINIATURA DO BARALHO NO LOBBY
  const themeSelect = document.getElementById('deckThemeSelect');
  if (themeSelect) document.body.dataset.deckTheme = themeSelect.value || 'classico';
  const tableSelect = document.getElementById('tableThemeSelect');
  if (tableSelect) document.body.dataset.tableTheme = tableSelect.value || 'feltro'; // Atualiza miniatura local do menu
  refreshArcadeCars(true);
  syncMythicPhase();

  const playersContainer = document.getElementById('playersContainer');
  const playersMenuBlock = document.getElementById('playersMenuBlock');
  const humiliationRules = document.getElementById('humiliationRules');
  const bossModeRules = document.getElementById('bossModeRules');

  const p1 = document.getElementById('boxP1');
  const lbl1 = document.getElementById('lblP1');
  const p2 = document.getElementById('boxP2');
  const lbl2 = document.getElementById('lblP2');
  const p3 = document.getElementById('boxP3');
  const lbl3 = document.getElementById('lblP3');
  const p4 = document.getElementById('boxP4');
  const lbl4 = document.getElementById('lblP4');

  // Pega as opções do dropdown "Sou"
  const localSelect = document.getElementById('localPlayerSelect');
  const opt0 = localSelect.querySelector('option[value="0"]');
  const opt1 = localSelect.querySelector('option[value="1"]');
  const opt2 = localSelect.querySelector('option[value="2"]');
  const opt3 = localSelect.querySelector('option[value="3"]');

  if (!menuMode) {
    if (playersMenuBlock) playersMenuBlock.style.display = 'none';
    playersContainer.style.display = 'none';
    humiliationRules.style.display = 'none';
    if (bossModeRules) bossModeRules.style.display = 'none';
    return;
  }

  if (playersMenuBlock) playersMenuBlock.style.display = 'block';
  playersContainer.style.display = 'grid';
  humiliationRules.style.display = 'none';
  if (bossModeRules) bossModeRules.style.display = 'none';

  // 1. Cores e Estilos dos Times para facilitar a visualização (Identidade visual da mesa)
  const styleT1 = 'position: relative; border-left: 4px solid #22c55e; background: rgba(34, 197, 94, 0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 5px; display: block;';
  const styleT2 = 'position: relative; border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 5px; display: block;';
  const styleNone = 'display: none;';

  // 2. Reseta as opções do "Sou" para o padrão e garante que estão visíveis
  opt0.hidden = false;
  opt0.disabled = false;
  opt0.textContent = 'Jogador 1';
  opt1.hidden = false;
  opt1.disabled = false;
  opt1.textContent = 'Jogador 2';
  opt2.hidden = false;
  opt2.disabled = false;
  opt2.textContent = 'Jogador 3';
  opt3.hidden = false;
  opt3.disabled = false;
  opt3.textContent = 'Jogador 4';

  if (isBossMode(mode)) {
    const isDominatrixMenu = mode === BOSS_MODE_DOMINATRIX;
    const cooperativeColor = bossDefinition?.accent || (isDominatrixMenu ? '#ec4899' : '#22c55e');
    const cooperativeStyle = `position: relative; border-left: 4px solid ${cooperativeColor}; background: rgba(${isDominatrixMenu ? '236, 72, 153' : '34, 197, 94'}, 0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 5px; display: block;`;
    p1.style.cssText = cooperativeStyle;
    p2.style.cssText = cooperativeStyle;
    p3.style.cssText = styleNone;
    p4.style.cssText = styleNone;
    lbl1.innerHTML = `Agente 1 <span style="color:${cooperativeColor}; font-size:9px;">(Cooperadores)</span>`;
    lbl2.innerHTML = `Agente 2 <span style="color:${cooperativeColor}; font-size:9px;">(Cooperadores)</span>`;
    opt0.textContent = 'Agente 1';
    opt1.textContent = 'Agente 2';
    opt2.hidden = true;
    opt2.disabled = true;
    opt3.hidden = true;
    opt3.disabled = true;
    const betToggle = document.getElementById('betToggle');
    betToggle.value = 'nao';
    document.getElementById('betConfig').style.display = 'none';
  } else if (mode === '1x1') {
    p1.style.cssText = styleT1;
    p2.style.cssText = styleT2;
    p3.style.cssText = styleNone;
    p4.style.cssText = styleNone;

    lbl1.innerHTML = 'Jogador 1 <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl2.innerHTML = 'Jogador 2 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';

    opt2.hidden = true;
    opt2.disabled = true;
    opt3.hidden = true;
    opt3.disabled = true;
  } else if (mode === '2x2') {
    p1.style.cssText = styleT1;
    p2.style.cssText = styleT2;
    p3.style.cssText = styleT1;
    p4.style.cssText = styleT2;

    lbl1.innerHTML = 'Jogador 1 <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl2.innerHTML = 'Jogador 2 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';
    lbl3.innerHTML = 'Jogador 3 <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl4.innerHTML = 'Jogador 4 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';
  } else if (mode === '1x2') {
    p1.style.cssText = styleT1;
    p2.style.cssText = styleT2;
    p3.style.cssText = styleT2;
    p4.style.cssText = styleNone;

    lbl1.innerHTML = 'Solo <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl2.innerHTML = 'Dupla 1 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';
    lbl3.innerHTML = 'Dupla 2 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';

    opt0.textContent = 'Solo';
    opt1.textContent = 'Dupla 1';
    opt2.textContent = 'Dupla 2';
    opt3.hidden = true;
    opt3.disabled = true;
  } else if (mode === '1x3') {
    p1.style.cssText = styleT1;
    p2.style.cssText = styleT2;
    p3.style.cssText = styleT2;
    p4.style.cssText = styleT2;

    lbl1.innerHTML = 'Solo <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl2.innerHTML = 'Trio 1 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';
    lbl3.innerHTML = 'Trio 2 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';
    lbl4.innerHTML = 'Trio 3 <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';

    opt0.textContent = 'Solo';
    opt1.textContent = 'Trio 1';
    opt2.textContent = 'Trio 2';
    opt3.hidden = false;
    opt3.disabled = false;
    opt3.textContent = 'Trio 3';
  } else if (mode === '1x1_duploMorto' || mode === '1x1_dominacao') {
    p1.style.cssText = styleT1;
    p2.style.cssText = styleT2;
    p3.style.cssText = styleNone;
    p4.style.cssText = styleNone;

    lbl1.innerHTML = 'Escravo <span style="color:#22c55e; font-size:9px;">(Time 1)</span>';
    lbl2.innerHTML = '👑 Rainha <span style="color:#ef4444; font-size:9px;">(Time 2)</span>';

    opt0.textContent = 'Escravo';
    opt1.textContent = '👑 Dominador';
    opt2.hidden = true;
    opt2.disabled = true;
    opt3.hidden = true;
    opt3.disabled = true;

    humiliationRules.style.display = 'block';
    const extraRules = document.getElementById('dominacaoExtra');
    if (extraRules) extraRules.style.display = mode === '1x1_dominacao' ? 'block' : 'none';
    const humTitle = document.getElementById('humiliationTitle');
    if (humTitle) humTitle.textContent = mode === '1x1_dominacao' ? 'Regras do 1x1 Dominação:' : 'Regras do 1x1 Humilhação:';
  }

  // 3. Se a opção que o usuário já tinha escolhido foi desativada, limpa a seleção
  if (localSelect.selectedIndex > 0 && localSelect.options[localSelect.selectedIndex].disabled) {
    localSelect.value = '';
    myPlayerIndex = -1;
  }

  const pt1 = document.getElementById('pixTeam1');
  const pt2 = document.getElementById('pixTeam2');
  if (mode === '1x1') {
    pt1.placeholder = 'Chave PIX';
    pt2.placeholder = 'Chave PIX';
  } else if (mode === '1x1_duploMorto' || mode === '1x1_dominacao') {
    pt1.placeholder = 'Chave PIX';
    pt2.placeholder = 'Chave PIX';
  } else if (mode === '1x2') {
    pt1.placeholder = 'Chave PIX';
    pt2.placeholder = 'Chave PIX';
  } else {
    pt1.placeholder = 'Chave PIX';
    pt2.placeholder = 'Chave PIX';
  }

  // -----------------------------------------------------------------
  // 🛡️ TRAVA DE VISÃO DO PIX: Oculta a chave do time adversário
  // -----------------------------------------------------------------
  let myTeam = -1;
  if (myPlayerIndex === 0 || myPlayerIndex === 2) myTeam = 0; // Time 1
  if (myPlayerIndex === 1 || myPlayerIndex === 3) myTeam = 1; // Time 2
  if (isBossMode(mode) && (myPlayerIndex === 0 || myPlayerIndex === 1)) myTeam = 0;

  // Sincroniza o Cache Imutável (Dataset) com o Banco de Dados
  if (currentLobby && currentLobby.pixKeys) {
    pt1.dataset.rawPix = currentLobby.pixKeys[0] || '';
    pt2.dataset.rawPix = currentLobby.pixKeys[1] || '';
  } else {
    pt1.dataset.rawPix = pt1.dataset.rawPix || '';
    pt2.dataset.rawPix = pt2.dataset.rawPix || '';
  }

  const realPix1 = pt1.dataset.rawPix;
  const realPix2 = pt2.dataset.rawPix;

  if (myTeam === 0) {
    pt1.disabled = false;
    pt2.disabled = true;
    if (document.activeElement !== pt1) pt1.value = realPix1;
    pt2.value = realPix2 ? '•••••••••••••••• (Oculto)' : '';
  } else if (myTeam === 1) {
    pt1.disabled = true;
    pt2.disabled = false;
    pt1.value = realPix1 ? '•••••••••••••••• (Oculto)' : '';
    if (document.activeElement !== pt2) pt2.value = realPix2;
  } else {
    pt1.disabled = true;
    pt2.disabled = true;
    pt1.value = realPix1 ? '•••••••••••••••• (Oculto)' : '';
    pt2.value = realPix2 ? '•••••••••••••••• (Oculto)' : '';
  }

  // Estética Refinada (Identidade de Time sem clashing)
  const pixBaseStyle = 'margin: 0; font-size: 11px; transition: all 0.3s; border-radius: 6px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);';

  // Time 1: Verde sutil apenas na borda de destaque
  pt1.style.cssText = pixBaseStyle + 'border-left: 4px solid #22c55e; background: rgba(34, 197, 94, 0.05); color: #e5e7eb;';

  // Time 2: Vermelho sutil apenas na borda de destaque
  pt2.style.cssText = pixBaseStyle + 'border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05); color: #e5e7eb;';

  // Mantém as travas de opacidade e cursor
  pt1.style.opacity = pt1.disabled ? '0.3' : '1';
  pt2.style.opacity = pt2.disabled ? '0.3' : '1';
  pt1.style.cursor = pt1.disabled ? 'not-allowed' : 'text';
  pt2.style.cursor = pt2.disabled ? 'not-allowed' : 'text';
  // -----------------------------------------------------------------

  // PONTO 4 (Parte A) RESOLVIDO: Verifica se todos os nomes são Bots para sumir com o campo SOU
  const namesArray = [document.getElementById('p1Name').value, document.getElementById('p2Name').value, document.getElementById('p3Name').value, document.getElementById('p4Name').value];

  let reqPlayers = 2;
  if (mode === '1x2') reqPlayers = 3;
  if (mode === '2x2' || mode === '1x3') reqPlayers = 4;

  let allBots = mode ? true : false;
  for (let i = 0; i < reqPlayers; i++) {
    if (!namesArray[i] || !namesArray[i].toUpperCase().includes('BOT')) {
      allBots = false;
      break;
    }
  }

  const souContainer = document.getElementById('localPlayerSelect').parentElement;
  if (allBots) {
    souContainer.style.display = 'none'; // Some com a opção
    document.getElementById('localPlayerSelect').value = ''; // Vira espectador
    myPlayerIndex = -1;
  } else {
    souContainer.style.display = 'flex'; // Volta se tiver humano
  }
};

// ==========================================
// MOTOR DE DEBUG / DEVTOOLS
// ==========================================
const isDebugMode = urlParams.get('debug') === '1' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
window.isDevToolsOpen = true; // Começa aberto por padrão

window.toggleDebugPanel = (show) => {
  window.isDevToolsOpen = show;
  if (!show) window.stopBossLabReportTimer?.();
  if (isDebugMode) {
    document.getElementById('debugPanel').style.display = show ? 'flex' : 'none';
    document.getElementById('debugMiniBtn').style.display = show ? 'none' : 'block';
  }
};

window.debugSetTableTheme = async (theme) => {
  const nextTheme = normalizeTableTheme(theme);
  document.body.dataset.tableTheme = nextTheme;
  syncTableAmbientMusic();

  const lobbySelect = document.getElementById('tableThemeSelect');
  if (lobbySelect) lobbySelect.value = nextTheme;

  const debugSelect = document.getElementById('debugTableThemeSelect');
  if (debugSelect && debugSelect.value !== nextTheme) debugSelect.value = nextTheme;

  if (state) {
    state.tableTheme = nextTheme;
    renderAll();
    await commitState();
  }
};

window.setTableAmbientEnabled = (enabled) => {
  setTableAmbientEnabled(enabled);
};

window.toggleTableAmbientMusic = toggleTableAmbientMusic;

window.debugSetDeckTheme = async (theme) => {
  const nextTheme = normalizeDeckTheme(theme);
  document.body.dataset.deckTheme = nextTheme;

  const lobbySelect = document.getElementById('deckThemeSelect');
  if (lobbySelect) lobbySelect.value = nextTheme;

  const debugSelect = document.getElementById('debugDeckThemeSelect');
  if (debugSelect && debugSelect.value !== nextTheme) debugSelect.value = nextTheme;

  if (state) {
    state.deckTheme = nextTheme;
    renderAll();
    await commitState();
  }
};

if (isDebugMode) {
  window.toggleDebugPanel(true);
  // 🔥 Exibe o painel de atalhos rápidos do menu principal
  const menuPanel = document.getElementById('menuDebugPanel');
  if (menuPanel) menuPanel.style.display = 'flex';

  // 🔥 Preenche as configurações e inverte dinamicamente os BOTs de lugar baseado na sua cadeira de teste
  window.debugInstantStart = async (selectedMode, preferredSeat = 0) => {
    const selectedBoss = getBossDefinitionForMode(selectedMode);
    document.getElementById('modeSelect').value = selectedBoss ? COOPERATIVE_MENU_MODE : selectedMode;
    if (selectedBoss) document.getElementById('bossSelect').value = selectedBoss.id;
    document.getElementById('variantSelect').value = normalizeVariantForMode(selectedMode, 'aberto');
    document.getElementById('deckThemeSelect').value = selectedBoss?.deckTheme || 'dominacao';
    document.getElementById('tableThemeSelect').value = selectedBoss?.tableTheme || 'cassino';
    document.getElementById('betToggle').value = selectedBoss ? 'nao' : 'sim';

    const targetSeat = String(preferredSeat);
    document.getElementById('localPlayerSelect').value = targetSeat;

    // Monta o array jogando os BOTs estritamente nas cadeiras que você não está ocupando
    const names = [];
    const poolNomes = ['Rebeca', 'Luana', 'Camila', 'Juliana'];
    for (let i = 0; i < 4; i++) {
      if (i === preferredSeat) {
        names.push('Biel');
      } else {
        names.push(`BOT ${poolNomes[i]}`);
      }
    }

    // Atualiza os elementos do DOM para o painel do lobby não ficar dessincronizado
    document.getElementById('p1Name').value = names[0];
    document.getElementById('p2Name').value = names[1];
    document.getElementById('p3Name').value = names[2];
    document.getElementById('p4Name').value = names[3];

    document.getElementById('pixTeam1').value = 'biel@financeiro.com';
    document.getElementById('pixTeam2').value = 'bot@rebeca.com';

    myPlayerIndex = preferredSeat;
    const url = new URL(window.location);
    url.searchParams.set('player', targetSeat);
    window.history.replaceState({}, '', url);
    localStorage.setItem(`buraco_seat_${gameId}`, targetSeat);

    window.updateMenuDynamic();

    return startGame(selectedMode, names, normalizeVariantForMode(selectedMode, 'aberto'), ['biel@financeiro.com', 'bot@rebeca.com']);
  };

  let bossDebugLabModulePromise = null;
  let bossDebugLabCatalog = [];
  let bossDebugLabBaseSnapshot = null;
  let bossDebugLabObservedBaseline = null;
  let bossDebugLabLastConfig = null;
  let bossDebugLabReportTimerId = null;

  const loadBossDebugLabModule = () => {
    bossDebugLabModulePromise ||= import('./js/boss/boss-debug-scenarios.js');
    return bossDebugLabModulePromise;
  };

  const bossLabElement = (id) => document.getElementById(id);
  const setBossLabOptions = (select, options, selectedValue = null) => {
    if (!select) return;
    select.innerHTML = '';
    options.forEach((option) => {
      const element = document.createElement('option');
      element.value = String(option.id);
      element.textContent = option.label;
      element.disabled = option.disabled === true;
      select.appendChild(element);
    });
    if (selectedValue != null && options.some((option) => String(option.id) === String(selectedValue) && !option.disabled)) {
      select.value = String(selectedValue);
    }
  };

  const setBossLabError = (message = '') => {
    const element = bossLabElement('debugBossLabError');
    if (element) element.textContent = message;
  };

  function selectedBossLabAbility() {
    const boss = bossDebugLabCatalog.find((entry) => entry.id === bossLabElement('debugBossLabBoss')?.value);
    return boss?.abilities.find((entry) => entry.id === bossLabElement('debugBossLabAbility')?.value) || null;
  }

  function syncBossLabAbilityControls({ preservePhase = true } = {}) {
    const ability = selectedBossLabAbility();
    if (!ability) return;
    const phaseSelect = bossLabElement('debugBossLabPhase');
    const previousPhase = preservePhase ? phaseSelect?.value : 'auto';
    setBossLabOptions(phaseSelect, [{ id: 'auto', label: 'Automatica' }, ...[1, 2, 3].map((phase) => ({ id: phase, label: `Fase ${phase}`, disabled: !ability.phases.includes(phase) }))], previousPhase);
    setBossLabOptions(bossLabElement('debugBossLabVariant'), ability.variants, bossLabElement('debugBossLabVariant')?.value || 'interactive');
    setBossLabOptions(bossLabElement('debugBossLabTarget'), ability.targets, bossLabElement('debugBossLabTarget')?.value || 'auto');
    const technical = bossLabElement('debugBossLabTechnical');
    if (technical) technical.textContent = `${ability.id} - Fases ${ability.phases.join('/')} - peso ${ability.weight}`;
    document.querySelectorAll('[data-boss-lab-variant]').forEach((button) => {
      button.hidden = !ability.variants.some((variant) => variant.id === button.dataset.bossLabVariant);
    });
    validateBossLabSelection();
  }

  function syncBossLabBossControls() {
    const boss = bossDebugLabCatalog.find((entry) => entry.id === bossLabElement('debugBossLabBoss')?.value) || bossDebugLabCatalog[0];
    if (!boss) return;
    setBossLabOptions(
      bossLabElement('debugBossLabAbility'),
      boss.abilities.map((ability) => ({ id: ability.id, label: `${ability.name} - Fases ${ability.phases.join('/')} - peso ${ability.weight}` })),
    );
    syncBossLabAbilityControls({ preservePhase: false });
  }

  function validateBossLabSelection() {
    const ability = selectedBossLabAbility();
    const phase = bossLabElement('debugBossLabPhase')?.value || 'auto';
    const button = bossLabElement('debugBossLabPrepare');
    const compatible = !!ability && (phase === 'auto' || ability.phases.includes(Number(phase)));
    if (button) button.disabled = !compatible;
    setBossLabError(compatible ? '' : `${ability?.name || 'A habilidade'} nao e elegivel na Fase ${phase}.`);
    return compatible;
  }

  function currentBossLabConfig(overrides = {}) {
    return {
      bossId: bossLabElement('debugBossLabBoss')?.value,
      abilityId: bossLabElement('debugBossLabAbility')?.value,
      phase: bossLabElement('debugBossLabPhase')?.value || 'auto',
      variant: bossLabElement('debugBossLabVariant')?.value || 'interactive',
      target: bossLabElement('debugBossLabTarget')?.value || 'auto',
      ...overrides,
    };
  }

  async function refreshBossLabObserved() {
    if (!state || !bossDebugLabObservedBaseline) return;
    const module = await loadBossDebugLabModule();
    const element = bossLabElement('debugBossLabObserved');
    if (element) element.textContent = module.summarizeBossDebugResult(bossDebugLabObservedBaseline, state);
  }

  function stopBossLabReportTimer() {
    if (bossDebugLabReportTimerId != null) clearInterval(bossDebugLabReportTimerId);
    bossDebugLabReportTimerId = null;
  }

  window.stopBossLabReportTimer = stopBossLabReportTimer;

  function startBossLabReportTimer() {
    stopBossLabReportTimer();
    const details = bossLabElement('debugBossLab');
    if (!details?.open || !state?.debugScenario?.active) return;
    bossDebugLabReportTimerId = setInterval(() => {
      const gameVisible = document.getElementById('gameSection')?.style.display === 'flex';
      if (!details.open || !state?.debugScenario?.active || !gameVisible) {
        stopBossLabReportTimer();
        return;
      }
      refreshBossLabObserved().catch(console.error);
    }, 1500);
  }

  async function activatePreparedBossLabState(prepared, config, { rememberBase = true } = {}) {
    const module = await loadBossDebugLabModule();
    stopBossLabReportTimer();
    if (window.botPlayTimeoutId) {
      clearTimeout(window.botPlayTimeoutId);
      window.botPlayTimeoutId = null;
    }
    BuracoBot.cancelPendingTurns();
    stopTurnTimer();
    localUndoStack = [];
    selectedHandIndexes.clear();
    selectedMeldTarget = null;
    movingWild = null;
    state = prepared.state;
    state.debugScenario.pauseAutomation = true;
    renderedBossFeedbackCount = null;
    renderedBossFeedbackEventIds = null;
    if (rememberBase) bossDebugLabBaseSnapshot = module.createBossDebugSnapshot(state);
    beginBossTurn(state, { first: true, now: Date.now(), debug: true });
    const fallbackExpected = config.variant === 'no_target';
    if (!fallbackExpected && state.boss?.currentIntent?.abilityId !== config.abilityId) {
      throw new Error(`O motor selecionou ${state.boss?.currentIntent?.abilityId || 'nenhuma habilidade'} em vez de ${config.abilityId}.`);
    }
    const selectedDebugAbilityId = state.boss?.currentIntent?.abilityId || state.boss?.lastAbilityId || null;
    if (fallbackExpected && (!selectedDebugAbilityId || selectedDebugAbilityId === config.abilityId)) {
      throw new Error(`${config.abilityId} nao foi rejeitada pelo fallback sem alvo.`);
    }
    bossDebugLabObservedBaseline = module.restoreBossDebugSnapshot(module.createBossDebugSnapshot(state));
    bossDebugLabLastConfig = { ...config };
    state.lastAction = { id: newActionId(), type: 'bossDebugScenario', abilityId: config.abilityId, ts: Date.now() };
    renderAll();
    await commitState();
    startTurnTimerIfNeeded();
    window.toggleDebugPanel(true);
    const details = bossLabElement('debugBossLab');
    if (details) details.open = true;
    await refreshBossLabObserved();
    startBossLabReportTimer();
  }

  async function prepareBossLab(overrides = {}) {
    if (!validateBossLabSelection()) return;
    const config = currentBossLabConfig(overrides);
    const instructions = bossLabElement('debugBossLabInstructions');
    const prepareButton = bossLabElement('debugBossLabPrepare');
    setBossLabError('');
    if (prepareButton) prepareButton.disabled = true;
    try {
      const module = await loadBossDebugLabModule();
      const definition = bossDebugLabCatalog.find((entry) => entry.id === config.bossId);
      if (!definition) throw new Error('Chefe invalido no laboratorio.');
      const prepared = module.buildBossDebugScenario(null, config);
      await window.debugInstantStart(definition.mode, 0);
      await activatePreparedBossLabState(prepared, config);
      if (instructions) instructions.textContent = prepared.instructions;
      showMessage(`${definition.name}: ${state.boss.currentIntent?.name || 'fallback legal'} preparado no laboratorio.`);
      return true;
    } catch (error) {
      setBossLabError(error.message || String(error));
    } finally {
      validateBossLabSelection();
    }
    return false;
  }

  async function executeBossLabVariant(variant) {
    const config = currentBossLabConfig({ variant });
    const sameScenario = state?.debugScenario?.active && state.debugScenario.bossId === config.bossId && state.debugScenario.abilityId === config.abilityId && state.debugScenario.variant === variant;
    if (!sameScenario && !(await prepareBossLab({ variant }))) return;
    const module = await loadBossDebugLabModule();
    const result = module.executeBossDebugScenarioVariant(state);
    state.lastAction = { id: newActionId(), type: 'bossDebugExecute', variant, result, ts: Date.now() };
    renderAll();
    await commitState();
    await refreshBossLabObserved();
    showMessage(result.executed ? `Laboratorio: ${result.action}.` : result.reason);
  }

  function advanceBossLabPresentationToPlayers() {
    let steps = 0;
    while (isBossTurnActive(state) && !hasPendingBossChoices(state) && steps < 12) {
      const flow = state.boss?.bossFlow;
      const now = Math.max(Date.now(), Number(flow?.endsAt || 0) + 1);
      const step = advanceBossTurn(state, now);
      if (!step) break;
      steps += 1;
    }
    return !isBossTurnActive(state);
  }

  async function executeBossLabBotAction(outcome) {
    const buttonId = outcome === 'success' ? 'debugBossLabBotSuccess' : 'debugBossLabBotFailure';
    const button = bossLabElement(buttonId);
    const otherButton = bossLabElement(outcome === 'success' ? 'debugBossLabBotFailure' : 'debugBossLabBotSuccess');
    const originalLabel = button?.textContent || `BOT: executar ${outcome === 'success' ? 'sucesso' : 'falha'}`;
    if (button) {
      button.disabled = true;
      button.textContent = 'Bot jogando...';
    }
    if (otherButton) otherButton.disabled = true;
    setBossLabError('');

    try {
      const ability = selectedBossLabAbility();
      if (!ability) throw new Error('Selecione uma habilidade antes de executar o bot.');
      const scenarioVariant = ability.variants.some((variant) => variant.id === outcome) ? outcome : 'interactive';
      const supportsBotTarget = ability.targets.some((target) => target.id === 'bot');
      const overrides = {
        variant: scenarioVariant,
        ...(supportsBotTarget ? { target: 'bot' } : {}),
      };
      const activeConfig = currentBossLabConfig();
      const module = await loadBossDebugLabModule();
      if (!module.canContinueBossDebugScenario(state, activeConfig) && !(await prepareBossLab(overrides))) return;

      showMessage(`Laboratorio: o bot esta executando o cenario de ${outcome === 'success' ? 'sucesso' : 'falha'}...`);
      advanceBossLabPresentationToPlayers();

      const botIndex = state.players.findIndex((player) => player.name?.toUpperCase().includes('BOT'));
      if (botIndex < 0) throw new Error('O cenario nao possui bot responsavel.');
      const botPlayer = state.players[botIndex];
      const preparedResult = module.applyBossDebugBotOutcome(state, outcome, botPlayer.id);
      const sessionId = window.gameSessionId;
      const signal = botTurnController.signal;
      const sessionEngine = createBotEngineForSession(sessionId, signal, { delayScale: 0.12, bossLabOutcome: outcome });

      let resolvedChoice = false;
      while (state.boss?.pendingChoices?.some((choice) => choice.playerId === botPlayer.id)) {
        const event = await sessionEngine.resolvePendingBossChoice(botPlayer.id);
        if (!event) break;
        resolvedChoice = true;
      }

      if (hasPendingBossChoices(state)) {
        const waitingChoice = state.boss.pendingChoices[0];
        const waitingPlayer = state.players.find((player) => player.id === waitingChoice.playerId);
        renderAll();
        await commitState();
        await refreshBossLabObserved();
        showMessage(`Laboratorio: escolha do bot resolvida. Aguardando ${waitingPlayer?.name || 'o outro jogador'} decidir.`);
        return;
      }

      advanceBossLabPresentationToPlayers();
      if (isBossTurnActive(state)) throw new Error('A apresentacao do chefe nao chegou ao turno dos jogadores.');

      const previousPlayer = state.currentPlayer;
      if (previousPlayer !== botIndex) {
        state.currentPlayer = botIndex;
      }
      state.hasDrawnThisTurn = false;
      state.partialDraw = false;
      state.pickedDiscardCardId = null;
      state.boss.playersActedThisRound = (state.boss.playersActedThisRound || []).filter((playerId) => playerId !== botPlayer.id);
      state.debugScenario.pauseAutomation = true;

      const turnBefore = state.turnNumber || 0;
      const completedBotTurnsBefore = (state.boss?.eventLog || []).filter((event) => event.type === 'playerTurn' && event.playerId === botPlayer.id).length;
      await BuracoBot.playTurn(state, botIndex, sessionEngine, { signal, sessionId });
      const completedBotTurnsAfter = (state.boss?.eventLog || []).filter((event) => event.type === 'playerTurn' && event.playerId === botPlayer.id).length;
      const turnFinished = state.finished || (state.turnNumber || 0) > turnBefore || state.currentPlayer !== botIndex || completedBotTurnsAfter > completedBotTurnsBefore;
      if (!turnFinished && !resolvedChoice) {
        throw new Error('O bot nao conseguiu concluir uma jogada legal neste cenario.');
      }

      const result = module.completeBossDebugBotOutcome(state, outcome, botPlayer.id, preparedResult);
      state.debugScenario.pauseAutomation = true;
      renderAll();
      await commitState();
      await refreshBossLabObserved();
      if (!result.executed) throw new Error(result.reason || 'O Laboratorio nao encontrou o resultado da habilidade selecionada.');
      const outcomeNote = result.matchedRequestedOutcome ? '' : ` O bot produziu ${result.actualOutcome || 'outro resultado'}; o painel foi mantido nesse resultado real.`;
      showMessage(`Laboratorio: ${botPlayer.name} concluiu o cenario de ${outcome === 'success' ? 'sucesso' : 'falha'} (${result.action}).${outcomeNote}`);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
      if (otherButton) otherButton.disabled = false;
    }
  }

  async function resetBossLabScenario() {
    stopBossLabReportTimer();
    if (!bossDebugLabBaseSnapshot || !bossDebugLabLastConfig) {
      setBossLabError('Prepare um cenario antes de resetar.');
      return;
    }
    try {
      const module = await loadBossDebugLabModule();
      const restored = module.restoreBossDebugSnapshot(bossDebugLabBaseSnapshot);
      await activatePreparedBossLabState({ state: restored }, bossDebugLabLastConfig, { rememberBase: false });
    } catch (error) {
      setBossLabError(error.message || String(error));
    }
  }

  async function sweepBossLab() {
    const module = await loadBossDebugLabModule();
    const report = module.runBossDebugSweep();
    const byBoss = bossDebugLabCatalog.map((boss) => {
      const entries = report.results.filter((entry) => entry.bossId === boss.id);
      return `${boss.name}: ${entries.filter((entry) => entry.ok).length}/${entries.length}`;
    });
    const failures = report.failed.map((entry) => `${entry.abilityId}: ${entry.reason}`);
    bossLabElement('debugBossLabObserved').textContent = ['VARREDURA DE CENARIOS', ...byBoss, '', failures.length ? failures.join('\n') : `OK - ${report.passed}/${report.total} habilidades preparadas`].join('\n');
  }

  async function initBossDebugLab() {
    const module = await loadBossDebugLabModule();
    bossDebugLabCatalog = module.getBossDebugCatalog();
    setBossLabOptions(
      bossLabElement('debugBossLabBoss'),
      bossDebugLabCatalog.map((boss) => ({ id: boss.id, label: boss.name })),
    );
    syncBossLabBossControls();
    bossLabElement('debugBossLabBoss')?.addEventListener('change', syncBossLabBossControls);
    bossLabElement('debugBossLabAbility')?.addEventListener('change', () => syncBossLabAbilityControls({ preservePhase: false }));
    bossLabElement('debugBossLabPhase')?.addEventListener('change', validateBossLabSelection);
    bossLabElement('debugBossLabPrepare')?.addEventListener('click', () => prepareBossLab());
    document.querySelectorAll('[data-boss-lab-variant]').forEach((button) => button.addEventListener('click', () => executeBossLabVariant(button.dataset.bossLabVariant)));
    bossLabElement('debugBossLabBotSuccess')?.addEventListener('click', () => executeBossLabBotAction('success').catch((error) => setBossLabError(error.message || String(error))));
    bossLabElement('debugBossLabBotFailure')?.addEventListener('click', () => executeBossLabBotAction('failure').catch((error) => setBossLabError(error.message || String(error))));
    bossLabElement('debugBossLabUndo')?.addEventListener('click', async () => {
      await window.executeUndo();
      await refreshBossLabObserved();
    });
    bossLabElement('debugBossLabReset')?.addEventListener('click', resetBossLabScenario);
    bossLabElement('debugBossLabSweep')?.addEventListener('click', sweepBossLab);
    bossLabElement('debugBossLab')?.addEventListener('toggle', () => {
      if (bossLabElement('debugBossLab')?.open) startBossLabReportTimer();
      else stopBossLabReportTimer();
    });
  }

  initBossDebugLab().catch((error) => setBossLabError(`Falha ao carregar laboratorio: ${error.message}`));
}

window.debugDraw5 = async () => {
  if (!ensureMyTurn()) return;
  const me = currentPlayer();
  const limit = Math.min(5, state.stock.length);
  for (let i = 0; i < limit; i++) {
    const c = state.stock.pop();
    ensureCardId(c);
    me.hand.push(c);
  }
  sortHand(me.hand);
  renderAll();
  await commitState();
};

window.debugDraw30 = async () => {
  if (!ensureMyTurn()) return;
  const me = currentPlayer();
  // Compra 30 ou o que sobrar no monte
  const limit = Math.min(30, state.stock.length);
  for (let i = 0; i < limit; i++) {
    const c = state.stock.pop();
    ensureCardId(c);
    me.hand.push(c);
  }
  sortHand(me.hand);
  renderAll();
  await commitState();
};

window.debugDiscard5 = async () => {
  if (!ensureMyTurn()) return;
  const me = currentPlayer();
  const limit = Math.min(5, me.hand.length);
  if (limit === 0) return;

  // Arranca as cartas da mão e joga pro lixo (sem animação para ser instantâneo no debug)
  for (let i = 0; i < limit; i++) {
    const c = me.hand.pop();
    state.discard.push(c);
  }

  let tookDead = null;
  if (me.hand.length === 0) tookDead = takeDeadIfAvailableForPlayer(me);

  // Se zerar a mão sem morto e sem canastra, aciona o fim de jogo punitivo
  if (me.hand.length === 0 && !canTeamTakeDeadNow(me.teamId)) {
    if (teamHasGoodCanastra(me.teamId)) await finishGame(me.teamId);
    else await finishGame(me.teamId === 0 ? 1 : 0);
    return;
  }

  if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

  renderAll();
  await commitState();
};

window.debugRestartGame = async () => {
  if (!state) return;
  const keepDevToolsOpen = window.isDevToolsOpen;

  // Puxa as configurações atuais da partida e da sala para refazer igual
  const currentNames = [state.players[0]?.name || '', state.players[1]?.name || '', state.players[2]?.name || '', state.players[3]?.name || ''];

  const currentPix = [state.teams[0]?.pix || '', state.teams[1]?.pix || ''];

  // Sincroniza o DOM com o estado atual para o startGame() não perder o PIX e o Tema do Baralho
  document.getElementById('deckThemeSelect').value = state.deckTheme || 'classico';
  document.getElementById('tableThemeSelect').value = state.tableTheme || document.body.dataset.tableTheme || 'feltro';
  document.getElementById('betToggle').value = state.isBetting ? 'sim' : 'nao';
  document.getElementById('betBase').value = state.betBase || 5;
  document.getElementById('betPerPoint').value = state.betPerPoint || 0.01;

  // 🧹 FAXINA GLOBAL: Limpa a memória do navegador para não bugar a nova partida
  if (window.botPlayTimeoutId) {
    clearTimeout(window.botPlayTimeoutId);
    window.botPlayTimeoutId = null;
  }
  window.lastBotTurnPlayed = null; // Destrava o cérebro da IA
  window.diceAnnounced = false; // Permite que os dados rolem de novo na tela

  lastSeenActionId = null;
  ignoreOwnActionId = null;
  activeTurnNumber = -1;
  movingWild = null;
  selectedHandIndexes.clear();
  selectedMeldTarget = null; // MATA A SELEÇÃO FANTASMA AQUI TAMBÉM
  stopTurnTimer();

  // Destrava a tela se o DevTools estava com o jogo congelado
  if (state.debugPaused) state.debugPaused = false;

  // Inicia a nova partida no Firebase
  await startGame(state.mode, currentNames, state.variant, currentPix);

  // Esconde o painel do DevTools para o jogador ver os dados rolarem
  window.toggleDebugPanel(keepDevToolsOpen);
};

window.debugEndGame = async () => {
  if (!ensureMyTurn()) return;
  await finishGame(currentTeam().id);
};

window.debugTogglePause = async () => {
  if (!state) return;
  state.debugPaused = !state.debugPaused; // Inverte o estado atual
  renderAll();
  await commitState(); // Salva no Firebase para paralisar a sala inteira
};

function showDebugBossDamageReaction() {
  if (!isCurrentBossMode() || !state?.boss) return;
  const lines = getBossDefinition(state.boss.id)?.damageReactions || [];
  if (!lines.length) return;
  const now = Date.now();
  const index = Math.abs((state.boss.actionSequence || 0) + now) % lines.length;
  state.boss.damageReaction = {
    id: `debug_reaction_${now}_${state.boss.actionSequence || 0}`,
    round: state.boss.roundNumber,
    text: lines[index],
    at: now,
    until: now + 2500,
    debugPreview: true,
  };
}

window.debugMeld = async (type) => {
  if (!ensureMyTurn()) return;
  const team = currentTeam();
  let meld = [];
  const mkCard = (r, s, j) => ({ rank: r, suit: s, joker: j, id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, back: 'red' });

  if (type === 'suja') {
    meld = [mkCard('4', '♥', false), mkCard('5', '♥', false), mkCard('6', '♥', false), mkCard('7', '♥', false), mkCard('8', '♥', false), mkCard('9', '♥', false), mkCard('JOKER', '★', true)];
  } else if (type === 'limpa') {
    meld = [mkCard('4', '♠', false), mkCard('5', '♠', false), mkCard('6', '♠', false), mkCard('7', '♠', false), mkCard('8', '♠', false), mkCard('9', '♠', false), mkCard('10', '♠', false)];
  } else if (type === 'real') {
    ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].forEach((r) => meld.push(mkCard(r, '♦', false)));
  } else if (type === 'asas') {
    ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].forEach((r) => meld.push(mkCard(r, '♣', false)));
  }

  optimizeMeld(meld);
  normalizeMeldOrder(meld);
  team.melds.push(meld);
  const meldIdx = team.melds.length - 1;

  // Passando o meldIdx corretamente no lugar do array "meld"
  let domReward = await processDominationReward(currentPlayer(), 'simple', classifyMeldForUi(meld).kind, meldIdx);
  await processBossMeldChange(currentPlayer(), 'simple', classifyMeldForUi(meld).kind, meldIdx, meld, true);
  showDebugBossDamageReaction();
  if (state.finished) return;

  if (domReward && domReward.drawnCards && domReward.drawnCards.length > 0) {
    renderHand(); // Força as cartas a existirem no DOM para voarem até a mão
    const anims = domReward.drawnCards.map((c) => {
      const toEl = cardElById(c.id);
      if (!toEl) return Promise.resolve();

      const isSteal = c && c._isEndgameSteal === true;
      let fromRect = null;

      if (isSteal) {
        fromRect = opponentAnchorRect(0);
      } else {
        const fromEl = document.querySelector('#drawStockBtn .pile-card');
        fromRect = fromEl ? getRect(fromEl) : null;
      }

      if (!fromRect) return Promise.resolve();

      toEl.style.visibility = 'hidden';
      return flyRectToRect(c, fromRect, getRect(toEl), isSteal ? 'front' : 'back').then(() => {
        if (toEl) toEl.style.visibility = '';
      });
    });
    await Promise.all(anims);
  }

  if (domReward?.tookDead) {
    await animateDeadToHandLocal(domReward.tookDead.deadIndex);
  }

  renderAll();
  await commitState();
};

window.debugSetupDead = async () => {
  if (!ensureMyTurn()) return;
  const me = currentPlayer();
  const teamId = me.teamId;

  // Trava para respeitar as regras do jogo fora do debug
  const taken = state.deadChunksTaken?.[teamId] ?? 0;
  const max = state.deadChunksMax?.[teamId] ?? 1;
  if (taken >= max) {
    showMessage('SEU TIME JÁ PEGOU O MÁXIMO DE MORTOS!');
    return;
  }

  // Esvazia a mão e deixa 1 carta. Marca que já comprou pra liberar o descarte.
  me.hand = [{ rank: '4', suit: '♣', joker: false, id: `db_${Date.now()}`, back: 'red' }];
  state.hasDrawnThisTurn = true;
  renderAll();
  await commitState();
  showMessage('Descarte a única carta para pegar o morto.');
};

window.debugSetupWin = async () => {
  if (!ensureMyTurn()) return;
  const me = currentPlayer();
  const team = currentTeam();

  // 1. Trava o sistema dizendo que a equipe já pegou o morto máximo permitido
  state.deadChunksTaken[team.id] = state.deadChunksMax[team.id];

  // 2. Deixa só 1 carta na mão e libera o botão de descarte
  me.hand = [{ rank: 'K', suit: '♥', joker: false, id: `db_${Date.now()}_k`, back: 'red' }];
  state.hasDrawnThisTurn = true;

  renderAll();
  await commitState();
  showMessage('Tente bater sem canastra para ver o bloqueio!');
};

// VALIDAÇÃO E ENVIO DO "ESTOU PRONTO"
document.getElementById('startBtn').onclick = () => {
  const errorDiv = document.getElementById('menuError');
  applyCooperativeBossPreset();
  const mode = getEffectiveMenuMode();
  const variant = normalizeVariantForMode(mode, document.getElementById('variantSelect').value);
  const localPlayer = document.getElementById('localPlayerSelect').value;
  const betToggle = document.getElementById('betToggle').value;
  const tableTheme = document.getElementById('tableThemeSelect').value; // 🔥 CORREÇÃO: Declaração adicionada aqui

  // 1. Verifica Seleções Básicas do Menu
  if (!mode || !variant || !tableTheme || !betToggle) {
    errorDiv.textContent = 'Selecione todas as opções (Modo, Regra, Fundo e Dinheiro).';
    errorDiv.style.display = 'block';
    return;
  }

  const p1 = document.getElementById('p1Name').value.trim();
  const p2 = document.getElementById('p2Name').value.trim();
  const p3 = document.getElementById('p3Name').value.trim();
  const p4 = document.getElementById('p4Name').value.trim();
  const namesArray = [p1, p2, p3, p4];

  // 2. Verifica se a mesa é 100% Bot
  let reqPlayers = 2;
  if (mode === '1x2') reqPlayers = 3;
  if (mode === '2x2' || mode === '1x3') reqPlayers = 4;

  let allBots = true;
  for (let i = 0; i < reqPlayers; i++) {
    if (!namesArray[i] || !namesArray[i].toUpperCase().includes('BOT')) {
      allBots = false;
      break;
    }
  }

  // 3. Verifica se assumiu uma cadeira (SÓ EXIGE SE TIVER HUMANO JOGANDO)
  if (!allBots && (myPlayerIndex === -1 || isNaN(myPlayerIndex))) {
    errorDiv.textContent = "Tem humano na mesa! Selecione quem você é (Campo 'Sou').";
    errorDiv.style.display = 'block';
    return;
  }

  // 4. Verifica se os nomes visíveis estão preenchidos
  if ((mode.startsWith('1x1') || isBossMode(mode)) && (!p1 || !p2)) {
    errorDiv.textContent = 'Preencha o nome dos 2 jogadores.';
    errorDiv.style.display = 'block';
    return;
  } else if (mode === '1x2' && (!p1 || !p2 || !p3)) {
    errorDiv.textContent = 'Preencha o nome dos 3 jogadores.';
    errorDiv.style.display = 'block';
    return;
  } else if ((mode === '2x2' || mode === '1x3') && (!p1 || !p2 || !p3 || !p4)) {
    errorDiv.textContent = 'Preencha o nome de todos os 4 jogadores.';
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none'; // Passou na validação completa

  // Motor Rigoroso de Validação de PIX (Respostas Diretas)
  const validatePixDetailed = (chave) => {
    if (!chave) return { valid: false, msg: 'Chave vazia.' };
    chave = chave.trim();

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)) return { valid: true };
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) return { valid: true };

    const hasPhoneChars = chave.includes('+') || chave.includes('(') || chave.includes(')');
    const hasDocChars = chave.includes('.') || chave.includes('-') || chave.includes('/');
    const num = chave.replace(/\D/g, '');

    if (hasPhoneChars) {
      if (num.length >= 10 && num.length <= 14) return { valid: true };
      return { valid: false, msg: `Telefone inválido (contém ${num.length} números, exige de 10 a 14).` };
    }

    const isCPF = (cpf) => {
      if (/^(\d)\1+$/.test(cpf)) return false;
      let sum = 0,
        rem;
      for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
      rem = (sum * 10) % 11;
      if (rem === 10 || rem === 11) rem = 0;
      if (rem !== parseInt(cpf.substring(9, 10))) return false;
      sum = 0;
      for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
      rem = (sum * 10) % 11;
      if (rem === 10 || rem === 11) rem = 0;
      if (rem !== parseInt(cpf.substring(10, 11))) return false;
      return true;
    };

    const isCNPJ = (cnpj) => {
      if (/^(\d)\1+$/.test(cnpj)) return false;
      let size = cnpj.length - 2,
        numbers = cnpj.substring(0, size),
        digits = cnpj.substring(size),
        sum = 0,
        pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
      }
      let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(0))) return false;
      size = size + 1;
      numbers = cnpj.substring(0, size);
      sum = 0;
      pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
      }
      result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(1))) return false;
      return true;
    };

    if (hasDocChars) {
      if (num.length === 11) return isCPF(num) ? { valid: true } : { valid: false, msg: 'CPF inválido.' };
      if (num.length === 14) return isCNPJ(num) ? { valid: true } : { valid: false, msg: 'CNPJ inválido.' };
      return { valid: false, msg: `Documento incompleto (CPF=11, CNPJ=14, digitado=${num.length}).` };
    }

    if (num.length === 11) return isCPF(num) ? { valid: true } : { valid: false, msg: 'CPF inválido.' };
    if (num.length === 14) return isCNPJ(num) ? { valid: true } : { valid: false, msg: 'CNPJ inválido.' };

    return { valid: false, msg: `Formato não reconhecido (${num.length} números digitados). Leia a regra abaixo.` };
  };

  // 🛡️ TRAVA FRONTEND: Executa a validação e bloqueia a tela se for inválido
  if (betToggle === 'sim') {
    const p1PixCheck = document.getElementById('pixTeam1').disabled && currentLobby ? currentLobby.pixKeys[0] : document.getElementById('pixTeam1').value.trim();
    const p2PixCheck = document.getElementById('pixTeam2').disabled && currentLobby ? currentLobby.pixKeys[1] : document.getElementById('pixTeam2').value.trim();

    const t1IsBot = mode === '2x2' ? namesArray[0].toUpperCase().includes('BOT') && namesArray[2].toUpperCase().includes('BOT') : namesArray[0].toUpperCase().includes('BOT');

    let t2IsBot = false;
    if (mode.startsWith('1x1')) t2IsBot = namesArray[1].toUpperCase().includes('BOT');
    else if (mode === '1x2') t2IsBot = namesArray[1].toUpperCase().includes('BOT') && namesArray[2].toUpperCase().includes('BOT');
    else if (mode === '2x2') t2IsBot = namesArray[1].toUpperCase().includes('BOT') && namesArray[3].toUpperCase().includes('BOT');
    else if (mode === '1x3') t2IsBot = namesArray[1].toUpperCase().includes('BOT') && namesArray[2].toUpperCase().includes('BOT') && namesArray[3].toUpperCase().includes('BOT');

    if (!t1IsBot) {
      const res1 = validatePixDetailed(p1PixCheck);
      if (!res1.valid) {
        errorDiv.innerHTML = `❌ <strong>PIX Time 1:</strong> ${res1.msg}`;
        errorDiv.style.display = 'block';
        return;
      }
    }
    if (!t2IsBot) {
      const res2 = validatePixDetailed(p2PixCheck);
      if (!res2.valid) {
        errorDiv.innerHTML = `❌ <strong>PIX Time 2:</strong> ${res2.msg}`;
        errorDiv.style.display = 'block';
        return;
      }
    }
  }

  const l = currentLobby || {};
  const readyArray = l.ready ? [...l.ready] : [false, false, false, false];

  // Evita que o Espectador (-1) tente dar ready e quebre o array do Firebase
  if (myPlayerIndex !== -1 && !isNaN(myPlayerIndex)) {
    readyArray[myPlayerIndex] = !readyArray[myPlayerIndex];
  }

  // Trava de segurança: Força o Ready dos Bots na hora do clique
  for (let i = 0; i < 4; i++) {
    if (namesArray[i] && namesArray[i].toUpperCase().includes('BOT')) {
      readyArray[i] = true;
    }
  }

  const fullLobby = {
    mode: mode,
    variant: variant,
    betToggle: betToggle,
    betBase: document.getElementById('betBase').value,
    betPerPoint: document.getElementById('betPerPoint').value,
    names: [p1, p2, p3, p4],
    pixKeys: [
      document.getElementById('pixTeam1').disabled ? document.getElementById('pixTeam1').dataset.rawPix || '' : document.getElementById('pixTeam1').value.trim(),
      document.getElementById('pixTeam2').disabled ? document.getElementById('pixTeam2').dataset.rawPix || '' : document.getElementById('pixTeam2').value.trim(),
    ],
    ready: readyArray,
  };

  setDoc(gameRef, { lobby: fullLobby, updatedAt: Date.now() }, { merge: true });
};

document.getElementById('cancelReadyBtn').onclick = () => {
  if (!currentLobby) return;
  const readyArray = [...currentLobby.ready];

  // 1. Tira o seu "Pronto" (se você tiver um)
  if (myPlayerIndex !== -1 && !isNaN(myPlayerIndex)) {
    readyArray[myPlayerIndex] = false;
  }

  // 2. Desmarca os Bots sem apagar os nomes deles!
  const namesArray = [...currentLobby.names];
  for (let i = 0; i < 4; i++) {
    if (namesArray[i] && namesArray[i].toUpperCase().includes('BOT')) {
      readyArray[i] = false;
    }
  }

  // 3. Esconde o aviso de erro e reseta os textos originais
  const overlay = document.getElementById('countdownOverlay');
  if (overlay) overlay.style.display = 'none';
  document.getElementById('countdownText').textContent = '5';
  document.getElementById('countdownText').nextElementSibling.textContent = 'A partida vai começar!';

  // 4. Salva a fuga no Firebase
  const fullLobby = {
    mode: getEffectiveMenuMode(),
    bossId: getBossDefinitionForMode(getEffectiveMenuMode())?.id || null,
    variant: normalizeVariantForMode(getEffectiveMenuMode(), document.getElementById('variantSelect').value),
    betToggle: document.getElementById('betToggle').value,
    betBase: document.getElementById('betBase').value,
    betPerPoint: document.getElementById('betPerPoint').value,
    names: namesArray,
    pixKeys: currentLobby.pixKeys || ['', ''],
    ready: readyArray,
    tableTheme: document.getElementById('tableThemeSelect').value, // 🔥 CORREÇÃO: Captura o valor direto do elemento
  };
  setDoc(gameRef, { lobby: fullLobby, updatedAt: Date.now() }, { merge: true });
};

document.getElementById('localPlayerSelect').onchange = (e) => {
  myPlayerIndex = parseInt(e.target.value);
  if (isNaN(myPlayerIndex)) myPlayerIndex = -1;

  // 🛡️ TRAVA DE AMNÉSIA ABSOLUTA (URL + LocalStorage)
  const url = new URL(window.location);
  if (myPlayerIndex === -1) {
    url.searchParams.delete('player');
    localStorage.removeItem(`buraco_seat_${gameId}`);
  } else {
    url.searchParams.set('player', myPlayerIndex);
    localStorage.setItem(`buraco_seat_${gameId}`, myPlayerIndex);
  }
  window.history.replaceState({}, '', url);

  window.updateMenuDynamic();
  if (state) renderAll();
};
document.getElementById('drawStockBtn').onclick = drawFromStock;
document.getElementById('drawDiscardBtn').onclick = drawFromDiscard;

// --- LÓGICA DE VOTAÇÃO PARA SAIR ---
document.getElementById('endGameBtn').onclick = async () => {
  if (!state) return;

  localExitPending = true;
  invalidateGameSession();

  state.surrender = { active: true, votes: {} };
  if (myPlayerIndex !== -1) state.surrender.votes[myPlayerIndex] = true;

  state.players.forEach((p) => {
    if (p.name.toUpperCase().includes('BOT')) state.surrender.votes[p.id] = true;
  });

  let yesCount = Object.values(state.surrender.votes).filter((v) => v).length;
  renderSurrender();

  // Se a sala estiver pronta para ser fechada (Solo ou Humanos + Bots votaram)
  if (yesCount >= state.players.length && state.players.length > 0) {
    try {
      await deleteDoc(gameRef);
    } catch (err) {
      console.error('[ERRO] Falha ao deletar sala no Firebase. Forçando saída local:', err);
      // Fallback imediato: Se o Firestore barrar o delete, retira o jogador da sala bugada na marra
      window.location.replace(window.location.pathname);
    }
    return;
  }

  try {
    await updateDoc(gameRef, { stateJson: JSON.stringify(state), updatedAt: Date.now() });
  } catch (err) {
    console.error('[ERRO] Falha ao atualizar status de rendição:', err);
  }
};

document.getElementById('voteYesBtn').onclick = async () => {
  if (!state || !state.surrender) return;
  localExitPending = true;
  invalidateGameSession();
  state.surrender.votes[myPlayerIndex] = true;

  state.players.forEach((p) => {
    if (p.name.toUpperCase().includes('BOT')) state.surrender.votes[p.id] = true;
  });

  let yesCount = Object.values(state.surrender.votes).filter((v) => v).length;
  if (yesCount >= state.players.length && state.players.length > 0) {
    await deleteDoc(gameRef); // Quem deu o último sim destrói a sala instantaneamente
    return;
  }

  await updateDoc(gameRef, { stateJson: JSON.stringify(state), updatedAt: Date.now() });
};

document.getElementById('voteNoBtn').onclick = async () => {
  if (!state || !state.surrender) return;
  activateGameSession();
  state.surrender.active = false;
  state.surrender.votes = {};
  await updateDoc(gameRef, { stateJson: JSON.stringify(state), updatedAt: Date.now() });
};

function renderSurrender() {
  const section = document.getElementById('surrenderSection');
  if (!state || !state.surrender || !state.surrender.active) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'flex';
  const list = document.getElementById('surrenderVotesList');
  list.innerHTML = '';

  state.players.forEach((p) => {
    const votedYes = state.surrender.votes[p.id] === true;
    const statusHtml = votedYes ? '<span style="color: #4ade80; font-weight: bold;">✅ Sim</span>' : '<span style="color: #9ca3af; font-style: italic;">⏳ Aguardando...</span>';

    list.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 10px 14px; border-radius: 6px; border: 1px solid #334155;">
                  <span style="color: #f8fafc; font-weight: 900; font-size: 14px;">${p.name}</span>
                  ${statusHtml}
                </div>
              `;
  });

  const alreadyVoted = state.surrender.votes[myPlayerIndex] === true;
  document.getElementById('voteYesBtn').style.display = alreadyVoted ? 'none' : 'block';
  document.getElementById('voteNoBtn').style.display = alreadyVoted ? 'none' : 'block';
}
document.getElementById('closeScoreBtn').onclick = () => (document.getElementById('scoreSection').style.display = 'none');
document.getElementById('closeBossResultBtn').onclick = () => (document.getElementById('bossResultSection').style.display = 'none');
document.getElementById('bossRematchBtn').onclick = () => window.voteRematch();
// Abre o placar manualmente pela mesa
document.getElementById('showScoreBtn').onclick = () => (document.getElementById('scoreSection').style.display = 'flex');

// Ação do botão de convite
document.getElementById('inviteBtn').onclick = async () => {
  // 🛡️ TRAVA ANTI-CLONE: Limpa a sua cadeira do link para o convidado não nascer no seu corpo
  const urlObj = new URL(window.location.href);
  urlObj.searchParams.delete('player');
  const inviteUrl = urlObj.toString();

  const btn = document.getElementById('inviteBtn');
  const originalText = btn.innerHTML;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Buraco Findom',
        text: 'Vem jogar na minha mesa!',
        url: inviteUrl,
      });
    } catch (err) {
      console.log('Compartilhamento cancelado ou falhou:', err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      btn.innerHTML = '✅ LINK COPIADO!';
      btn.style.background = 'rgba(34, 197, 94, 0.2)';
      btn.style.color = '#4ade80';
      btn.style.borderColor = '#22c55e';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = 'rgba(37, 99, 235, 0.15)';
        btn.style.color = '#60a5fa';
        btn.style.borderColor = '#3b82f6';
      }, 2500);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  }
};

// ==========================================
// SISTEMA DE ROUBO DE MÃO (DOMINAÇÃO COMPLETA)
// ==========================================
window.toggleStealMode = async () => {
  if (!ensureMyTurn() || state.hasDrawnThisTurn) return;

  window.isStealModeActive = !window.isStealModeActive;
  if (window.isStealModeActive) {
    state.dominatorUsedPower = true;
  }
  // Sincroniza a vinheta no Firebase com base na visão ativa
  state.powerActiveThisTurn = window.isStealModeActive;

  renderAll();
  await commitState();
};

window.stealCard = async (cardId) => {
  if (!ensureMyTurn()) return;

  // Trava de anti-spam deletada: reseta o ponteiro e força a risada a tocar em todo clique
  if (sfxSteal) {
    sfxSteal.currentTime = 0;
    sfxSteal.play().catch(() => {});
  }

  const p1 = state.players[0]; // Escravo
  const p2 = state.players[1]; // Dominador

  const cardIndex = p1.hand.findIndex((c) => c && c.id === cardId);
  if (cardIndex === -1) {
    showMessage('Erro: Carta não encontrada.');
    return;
  }

  saveStateForUndo('stealCard');

  const card = p1.hand.splice(cardIndex, 1)[0];
  p2.hand.push(card);
  sortHand(p2.hand);

  if (!state.boughtCardIds) state.boughtCardIds = [];
  state.boughtCardIds.push(card.id);

  // Animação de voo saindo da mesa
  const fromCardEl = document.querySelector(`.reveal-mode .carta[data-card-id="${cardId}"]`);

  renderHand(); // Força a carta nova a existir no DOM do J2
  const toEl = cardElById(card.id);

  if (fromCardEl && toEl) {
    fromCardEl.style.visibility = 'hidden';
    if (toEl) toEl.style.visibility = 'hidden';
    await flyRectToRect(card, getRect(fromCardEl), getRect(toEl), 'front');
    if (toEl) toEl.style.visibility = '';
  }

  // 🔥 NOVA REGRA: Bloqueia o morto defensivo e força compra do monte para manter o Escravo sob controle
  let escravoAutoDraw = null;
  if (p1.hand.length === 0) {
    if (!state.stock.length) {
      await recycleDeadToStockIfPossible();
    }

    if (state.stock.length > 0) {
      const extraC = state.stock.pop();
      ensureCardId(extraC);
      p1.hand.push(extraC);
      sortHand(p1.hand);
      escravoAutoDraw = packCard(extraC); // Registra para sincronizar com a outra tela

      // Animação local: A carta do monte voa para a mão do Escravo
      const stockEl = document.querySelector('#drawStockBtn .pile-card');
      if (stockEl) {
        const stockRect = getRect(stockEl);
        const targetHandRect = opponentAnchorRect(0);
        if (stockRect && targetHandRect) {
          await flyRectToRect(extraC, stockRect, targetHandRect, 'back');
          impactAtRect(targetHandRect);
        }
      }
      showMessage('🛡️ DOMINAÇÃO: Mão do Escravo esvaziada! +1 carta forçada do Monte.');
    } else {
      if (teamHasGoodCanastra(p1.teamId)) await finishGame(p1.teamId);
      else await finishGame(1);
    }
  }

  state.lastAction = {
    id: newActionId(),
    type: 'stealCard',
    playerId: 1,
    card: packCard(card),
    escravoAutoDraw: escravoAutoDraw, // Envia o draw para o oponente renderizar remoto
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  if (state.partialDraw) {
    state.hasDrawnThisTurn = true;
    state.partialDraw = false;
    window.isStealModeActive = false;
    state.powerActiveThisTurn = false; // Desliga a vinheta síncrona para ambos
    showMessage('👁️ 2 cartas roubadas. Sua fase de compra acabou!');
  } else {
    state.partialDraw = true;
    showMessage('👁️ 1 carta roubada. Roube a 2ª ou compre na mesa!');
  }

  renderAll();
  resetTurnTimer();
  await commitState();
};

// 🔥 NOVO: Motor de verificação e gatilho de nova partida síncrona
window.voteRematch = async () => {
  if (!state || !state.finished || myPlayerIndex === -1) return;

  if (!state.rematch) {
    state.rematch = { votes: {} };
  }

  // Registra o voto do jogador local
  state.rematch.votes[myPlayerIndex] = true;

  // Computa automaticamente o voto de confirmação dos bots da sala
  state.players.forEach((p) => {
    if (p && p.name && p.name.toUpperCase().includes('BOT')) {
      state.rematch.votes[p.id] = true;
    }
  });

  const yesCount = Object.values(state.rematch.votes).filter((v) => v === true).length;

  // Se todos aceitaram, dispara o motor de faxina e reinicia direto no Firebase
  if (yesCount >= state.players.length) {
    await window.debugRestartGame();
    return;
  }

  // Senão, joga o estado pro Firebase pro outro jogador ver a contagem subir
  renderAll();
  await commitState();
};
