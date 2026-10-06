import {
  ALL_CANASTRA_SFX,
  DECK_MOVE_SFX,
  TABLE_ASAS_SFX,
  TABLE_CANASTRA_SFX,
  BOSS_SFX,
  CANASTRA_SFX,
  TABLE_AMBIENT_MAX_VOLUME,
  TABLE_AMBIENT_MUSIC,
  TABLE_AMBIENT_STORAGE_KEY,
  clampMediaVolume,
  playSfxClone,
  sfxCardMove,
  sfxHeartbeat,
  sfxMyTurn,
  sfxSearch,
  sfxSteal,
  stopAllGameSfx,
} from './js/audio.js';
import { applyDominationDecree, canUseDominationDecree, dominationDecreeUsed, isDominationDiscardDecreeActive, shouldShowDominationDecreeDiscardLock } from './js/game/domination-decree.js';
import { applyPauseVote, pauseBlocksPlay, stockIsExhausted, createActionGate } from './js/game/match-control.js';
import { db, deleteDoc, doc, onSnapshot, runTransaction, setDoc, updateDoc } from './js/firebase.js';
import { activeAccount } from './js/account-auth.js';
import { profileInLobby, teamForSeat } from './js/account-profile.js';
import { buildMatchSummary, prepareHistoryWrites } from './js/match-history.js';
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
  getBossDimitrescuPriorities,
  getBossNeheleniaPriorities,
  getBossCombatPriorities,
  setBossDamageTarget,
  getBossNaturePriorities,
  getBossNatureThreatSummaries,
  getBossDiscardSurcharge,
  getBossInterdictAttempt,
  getBossVault,
  getBossVaultQuote,
  hasPendingBossChoices,
  canBossPerformCommonAction,
  getBossPhaseName,
  getBossPhaseProgress,
  isBossCardBlocked,
  isBossDiscardBlocked,
  isBossMeldLocked,
  isBossMeldPossessed,
  isBossMode,
  isBossPlayerDominated,
  isBossTurnActive,
  isBossVaultDrawRequired,
  deferBossVault,
  prepareBossVaultTurn,
  normalizeBossState,
  notifyBossDiscardTaken,
  notifyBossPurchaseCompleted,
  notifyBossCardDiscarded,
  reclaimBossVault,
  shouldBossBotReclaimVault,
  resolveBossChoice,
  resolveNeheleniaMirroredMeldChoice,
  resolveBossInterdictAttempt,
  validateBossClosedDiscardSelection,
  quoteBossDiscardPickup,
  validateBossMeldPlay,
  isValidBossSequence,
} from './js/boss/boss-engine.js';
import { getBossDefinition, getBossDefinitionForMode, normalizeVariantForMode } from './js/boss/boss-registry.js';
import { buildBossActionPresentation, buildBossAbilityHelp, buildBossFinalPresentation, buildBossRuleSummary } from './js/boss/boss-presentation.js';
import { getBossPresentationAdapter } from './js/boss/presentation/boss-presentation-registry.js';
import { getBossMeldContributionUi, getBossMeldUiModel, getBossUiAdapter } from './js/boss/ui/boss-ui-registry.js';
import { canRestoreUndoTransaction, createUndoTransaction, restoreUndoTransaction } from './js/game/undo-transaction.js';
import { enumerateWildcardOptions } from './js/game/wildcard-choice.js';
import {
  hasDominationFriendSelection,
  normalizeDominationFriends,
  dominationFriends,
  activeDominationFriends,
  getDominationFriend,
  completeDominationFriendPresentation,
  canCallDominationFriend,
  shouldBotCallDominationFriend,
  createFriendInvitation,
  callDominationFriend,
  isDominationFriendTurn,
  isDominationFriendBusy,
  queueDominationFriendTurn,
  executeDominationFriendTurn,
  grantDominationFriendExtraTurn,
  grantDominationFriendSharedBonus,
  normalizeDominationOptions,
  dominationFeatureEnabled,
} from './js/game/domination-friend.js';
import { renderDominationFriend, presentDominationFriend, playDominationFriendTimeline, createFriendNoticeTracker, showDominationFriendNotice } from './js/game/domination-friend-ui.js';
import { opponentSeats, OPPONENT_SEAT_IDS, renderOpponentBacks } from './js/game/opponent-seats.js';
import { cardFrontHTML, suitClass, deckFaceClass } from './js/game/card-face.js';
import { createVisionHintEvaluator } from './js/game/domination-vision-hint.js';
import { createVisionAlert } from './js/game/domination-vision-alert.js';
import { createVisionFocus } from './js/game/domination-vision-focus.js';
import { setDebugFriends, debugFriendMeld } from './js/game/domination-dev-tools.js';
import { animateDiscardTransfer } from './js/game/discard-presentation.js';
import { FRIEND_MP3, friendNoticeSound, createFriendSoundQueue, waitForPlayingCanastras } from './js/game/domination-friend-sound.js';

// Importa a IA do Bot
import { BuracoBot } from './bot.js';
import { BossBuracoBot } from './boss-bot.js';

const COOPERATIVE_MENU_MODE = 'cooperative';

function botControllerForState(gameState = state) {
  return gameState?.mode?.startsWith('boss_') ? BossBuracoBot : BuracoBot;
}

function cancelPendingBotTurns() {
  BuracoBot.cancelPendingTurns();
  BossBuracoBot.cancelPendingTurns();
}

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

// O login pode terminar depois do evento load original da página.
function onPageLoad(callback) {
  if (document.readyState === 'complete') queueMicrotask(callback);
  else window.addEventListener('load', callback, { once: true });
}

// --- LÓGICA DE LOADING E ROTAÇÃO DE VÍDEOS ---
const loadingScreen = document.getElementById('loadingScreen');
const accountBootHandled = document.body.classList.contains('account-pending');
let introFinished = false;

onPageLoad(() => {
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
  if (isDebug || accountBootHandled) {
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

onPageLoad(() => {
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

let pendingServiceWorkerVersion = null;
let serviceWorkerReloading = false;
let serviceWorkerActivationRequested = false;
let serviceWorkerProgressTimer = null;
let serviceWorkerActivationTimer = null;

if ('serviceWorker' in navigator) {
  onPageLoad(() => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (serviceWorkerReloading || !serviceWorkerActivationRequested) return;
      serviceWorkerReloading = true;
      clearInterval(serviceWorkerProgressTimer);
      clearTimeout(serviceWorkerActivationTimer);

      if (Number.isFinite(pendingServiceWorkerVersion)) {
        localStorage.setItem('buraco_current_version', String(pendingServiceWorkerVersion));
      }

      const bar = document.getElementById('update-progress-bar');
      const percentText = document.getElementById('update-percent');
      const statusText = document.getElementById('update-status-text');
      if (bar) bar.style.width = '100%';
      if (percentText) percentText.textContent = '100%';
      if (statusText) {
        statusText.textContent = 'Atualização aplicada. Reabrindo a mesa…';
        statusText.style.color = '#4ade80';
      }

      setTimeout(() => window.location.reload(), 180);
    });

    navigator.serviceWorker
      .register('service-worker.js')
      .then(async (reg) => {
        let newVersionNum = null;
        const storedVersion = Number.parseInt(localStorage.getItem('buraco_current_version') || '', 10);
        const oldVersionNum = Number.isFinite(storedVersion) ? storedVersion : null;

        try {
          const response = await fetch(`service-worker.js?version_check=${Date.now()}`, { cache: 'no-store' });
          const text = await response.text();
          const match = text.match(/CACHE_NAME\s*=\s*['"`]buraco-v(\d+)['"`]/);
          if (match) newVersionNum = Number.parseInt(match[1], 10);
        } catch (err) {
          console.error('[SW] Erro ao consultar a versão atual:', err);
        }

        const shouldPrompt = oldVersionNum == null || (newVersionNum != null && newVersionNum > oldVersionNum);
        const totalAtts = oldVersionNum != null && newVersionNum != null ? Math.max(1, newVersionNum - oldVersionNum) : 1;

        const applyWorker = (worker) => {
          if (!worker) return;
          if (shouldPrompt) {
            showUpdatePrompt(worker, reg, totalAtts, newVersionNum);
          } else {
            serviceWorkerActivationRequested = true;
            worker.postMessage('skipWaiting');
          }
        };

        if (reg.waiting) applyWorker(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) applyWorker(installingWorker);
          });
        });

        // DevTools costuma manter a aba viva por muito tempo; força uma checagem
        // real no servidor em vez de depender somente da verificação periódica.
        reg.update().catch((err) => console.error('[SW] Erro ao forçar verificação de atualização:', err));
      })
      .catch((err) => console.log('SW erro:', err));
  });
}

function showUpdatePrompt(worker, registration, totalAtts = 1, newVersion = null) {
  if (document.getElementById('sw-update-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'sw-update-overlay';
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(5, 5, 5, 0.95); z-index: 100000; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(5px);';
  document.body.appendChild(overlay);

  const requestActivation = () => {
    const candidate = registration?.waiting || registration?.installing || worker;
    if (!candidate) return false;
    try {
      candidate.postMessage('skipWaiting');
      return true;
    } catch (err) {
      console.error('[SW] Erro ao solicitar ativação:', err);
      return false;
    }
  };

  const startProgressSequence = () => {
    pendingServiceWorkerVersion = Number.isFinite(Number(newVersion)) ? Number(newVersion) : null;
    const steps = Math.max(1, Number(totalAtts) || 1);
    overlay.innerHTML = `
      <div class="score-card" style="max-width: 320px; text-align: center; padding: 30px 20px; border-color: #facc15;">
        <h2 style="margin: 0 0 16px 0; color: #facc15; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Sincronizando Módulos...</h2>
        <div style="width: 100%; background: #1e293b; border-radius: 99px; height: 8px; overflow: hidden; margin-bottom: 10px; border: 1px solid rgba(250, 204, 21, 0.2);">
          <div id="update-progress-bar" style="width: 0%; height: 100%; background: #22c55e; box-shadow: 0 0 10px #22c55e; transition: width 0.1s linear;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: #94a3b8;">
          <span id="update-status-text">Compilando pacotes (1/${steps})...</span>
          <span id="update-percent" style="color: #4ade80; font-weight: bold;">0%</span>
        </div>
        <button id="btn-update-retry" type="button" class="custom-modal-btn" style="display:none; width:100%; margin-top:18px; background:#334155; color:#fff; padding:11px; border-radius:8px; font-weight:800; cursor:pointer; border:1px solid #64748b;">TENTAR NOVAMENTE</button>
      </div>`;

    clearInterval(serviceWorkerProgressTimer);
    clearTimeout(serviceWorkerActivationTimer);
    let progress = 0;
    let currentStep = 1;
    const bar = document.getElementById('update-progress-bar');
    const percentText = document.getElementById('update-percent');
    const statusText = document.getElementById('update-status-text');

    const armTimeout = () => {
      clearTimeout(serviceWorkerActivationTimer);
      serviceWorkerActivationTimer = setTimeout(() => {
        if (serviceWorkerReloading) return;
        clearInterval(serviceWorkerProgressTimer);
        const retry = document.getElementById('btn-update-retry');
        if (statusText) {
          statusText.textContent = 'O navegador ainda não ativou a nova versão.';
          statusText.style.color = '#fbbf24';
        }
        if (retry) retry.style.display = 'block';
      }, 8000);
    };

    const requestAndWaitForActivation = () => {
      serviceWorkerActivationRequested = true;
      requestActivation();
      armTimeout();
    };

    const retry = document.getElementById('btn-update-retry');
    if (retry) {
      retry.onclick = () => {
        retry.style.display = 'none';
        if (statusText) {
          statusText.textContent = 'Tentando ativar novamente…';
          statusText.style.color = '#94a3b8';
        }
        requestActivation();
        registration?.update?.().catch((err) => console.error('[SW] Erro ao repetir verificação:', err));
        armTimeout();
      };
    }

    serviceWorkerProgressTimer = setInterval(() => {
      const stepTarget = (currentStep / steps) * 100;
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= stepTarget) {
        progress = stepTarget;
        if (currentStep < steps) currentStep += 1;
      }

      if (progress >= 100) {
        progress = 100;
        clearInterval(serviceWorkerProgressTimer);
        serviceWorkerProgressTimer = null;
        if (statusText) {
          statusText.textContent = 'Mesa pronta!';
          statusText.style.color = '#4ade80';
        }
        if (bar) {
          bar.style.width = '100%';
          bar.style.background = '#facc15';
          bar.style.boxShadow = '0 0 15px #facc15';
        }
        if (percentText) percentText.textContent = '100%';
        // A apresentação antiga termina aqui; a correção nova permanece: só
        // consideramos a versão aplicada depois do controllerchange real.
        setTimeout(requestAndWaitForActivation, 600);
        return;
      }

      if (bar) bar.style.width = `${progress}%`;
      if (percentText) percentText.textContent = `${Math.round(progress)}%`;
      if (statusText) statusText.textContent = `Compilando pacotes (${currentStep}/${steps})...`;
    }, 80);
  };

  overlay.innerHTML = `
    <div class="score-card" style="max-width: 380px; text-align: center; padding: 30px 20px; border-color: #facc15;">
      <div style="font-size: 2.5rem; margin-bottom: 12px; text-shadow: 0 0 15px rgba(250, 204, 21, 0.4);">✨</div>
      <h2 style="margin: 0 0 10px 0; color: #facc15; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">Atualização Pronta</h2>
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 24px; line-height: 1.5;">Uma nova versão do Buraco Findom foi detectada (${Math.max(1, Number(totalAtts) || 1)} modificação(ões) pendente(s)). Deseja aplicar as melhorias agora?</p>
      <div style="display: flex; gap: 10px; width: 100%;">
        <button class="custom-modal-btn" id="btn-update-later" style="flex: 1; background: #334155; color: #fff; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none;">DEPOIS</button>
        <button class="custom-modal-btn" id="btn-update-now" style="flex: 1; background: linear-gradient(135deg, #b45309 0%, #78350f 100%); color: #facc15; border: 1px solid #facc15; padding: 12px; border-radius: 8px; font-weight: 900; cursor: pointer; letter-spacing: 1px;">ATUALIZAR</button>
      </div>
    </div>`;

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
let isDebugMode = false;
const localActionGate = createActionGate();
let resultPresented = false;
let rematchVotePending = false;
let exitVotePending = false;
let friendOperationPending = false;
const friendControllerId = crypto.randomUUID();
let friendAutomationRunning = false;
let friendAutomationTimer = null;
let friendPlayback = null;
const friendActionPresentations = new Map();
const friendNoticeTracker = createFriendNoticeTracker();
const friendSoundQueue = createFriendSoundQueue({
  enabled: () => audioUnlocked && !window.isClosingGame && document.visibilityState !== 'hidden',
  waitForCanastras: () => waitForPlayingCanastras(ALL_CANASTRA_SFX),
  onBusy: () => {
    if (state && !window.isClosingGame) syncTableAmbientMusic();
  },
});
let currentLobby = null;
let accountSeatStamp = '';
window.addEventListener('account-profile-updated', () => {
  void syncAccountSeat(true);
});

async function syncAccountSeat(force = false, previousSeat = -1) {
  if (!activeAccount || state || !currentLobby || (myPlayerIndex < 0 && !force)) return;
  const seat = myPlayerIndex;
  const mode = currentLobby.mode || '';
  if (seat !== -1 && teamForSeat(mode, seat) < 0) return;
  const stamp = `${seat}:${mode}`;
  if (!force && accountSeatStamp === stamp) return;
  accountSeatStamp = stamp;
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      const data = snap.data();
      if (!data?.lobby || data.stateJson || data.lobby.mode !== mode || myPlayerIndex !== seat) return;
      const lobby = profileInLobby(data.lobby, seat, activeAccount, previousSeat);
      if (JSON.stringify(lobby) !== JSON.stringify(data.lobby)) transaction.update(gameRef, { lobby, updatedAt: Date.now() });
    });
  } catch {
    accountSeatStamp = '';
    const error = document.getElementById('menuError');
    error.textContent = 'Não foi possível preencher nome/Pix. Confira a conexão e escolha seu jogador novamente.';
    error.style.display = 'block';
  }
}
window.botPlayTimeoutId = null;
window.isClosingGame = false;
window.gameSessionId = window.gameSessionId || 0;
let localExitPending = false;
let botTurnController = new AbortController();
let selectedHandIndexes = new Set();
let selectedBossCollateralCardId = null;
let selectedBossCollateralChoiceId = null;
let turnTimerId = null;
let turnTimerRemaining = 0;
let selectedMeldTarget = null;
let pendingDiscardChoice = null;
let discardPickupAnimating = false;
const pendingStockCardIds = new Set();
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

let bossResultFinishScheduled = false;

function schedulePendingBossResultFinish() {
  if (!isCurrentBossMode() || !state?.boss?.result || state.finished || bossResultFinishScheduled) return;
  bossResultFinishScheduled = true;
  queueMicrotask(async () => {
    try {
      if (isCurrentBossMode() && state?.boss?.result && !state.finished) {
        await finishGame(state.boss.result.victory ? 0 : 1, { skipFinalStrike: true });
      }
    } finally {
      bossResultFinishScheduled = false;
    }
  });
}
let bossPresentationKey = '';
let bossArtSpotlightKey = '';
let bossArtSpotlightTimer = null;
let bossDamageReactionTimer = null;
let dimitrescuPhasePortraitTimer = null;
const locallyAnimatedBossVaultSoundEventIds = new Set();
const locallyAnimatingBossVaultStates = new Map();
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
  if (boss.id === 'dimitrescu') return Number(event.dangerDelta) > 0 || (event.type === 'bloodChange' && Number(event.amount) > 0);
  return getBossPresentationAdapter(boss.id)?.resourceSoundEvent?.(event) === true;
}

function bossEventHealsMatriarch(boss, event) {
  return boss?.id === 'matriarca_esmeralda' && event?.type === 'bossHeal' && Number(event.amount) > 0;
}

function bossEventIsMatriarchRebirth(boss, event) {
  return boss?.id === 'matriarca_esmeralda' && event?.type === 'rebirth';
}

function bossEventIsDimitrescuPhaseChange(boss, event) {
  return boss?.id === 'dimitrescu' && event?.type === 'phase' && [2, 3].includes(Number(event.phase));
}

function triggerDimitrescuPhasePortraitVisual() {
  const portrait = document.querySelector('#bossHud .boss-portrait');
  if (!portrait || document.body.dataset.bossId !== 'dimitrescu') return;

  if (dimitrescuPhasePortraitTimer) {
    clearTimeout(dimitrescuPhasePortraitTimer);
    dimitrescuPhasePortraitTimer = null;
  }

  portrait.classList.remove('boss-dimitrescu-phase-shift');
  void portrait.offsetWidth;
  portrait.classList.add('boss-dimitrescu-phase-shift');

  dimitrescuPhasePortraitTimer = setTimeout(() => {
    dimitrescuPhasePortraitTimer = null;
    portrait.classList.remove('boss-dimitrescu-phase-shift');
  }, 1200);
}

function matriarchNatureSoundPairKey(event, suffix) {
  const actionId = String(event?.actionId || '');
  const marker = `:${suffix}`;
  return actionId.endsWith(marker) ? actionId.slice(0, -marker.length) : '';
}

const NEHELENIA_WRONG_MIRROR_CHOICE_TYPES = new Set(['false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare']);

function playNeheleniaWrongMirrorLaugh(choice, selectedOption) {
  if (state?.boss?.id !== 'nehelenia' || !choice?.correctOption) return false;
  if (!NEHELENIA_WRONG_MIRROR_CHOICE_TYPES.has(choice.type)) return false;
  if (String(selectedOption) === String(choice.correctOption)) return false;
  playSfxClone(BOSS_SFX.nehelenia?.laugh, { audioContext: audioCtx });
  return true;
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

  const newEvents = events.filter((event) => {
    if (!event.actionId || seenBossResourceSoundEventIds.has(event.actionId)) return false;
    seenBossResourceSoundEventIds.add(event.actionId);
    return true;
  });
  newEvents.filter((event) => boss.id === 'banker' && event.vaultSound === 'open').forEach((event) => void animateBossVaultOpen(event, { playSound: audioUnlocked }));

  if (newEvents.some((event) => bossEventIsDimitrescuPhaseChange(boss, event))) {
    triggerDimitrescuPhasePortraitVisual();
  }

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
    if (bossEventIsDimitrescuPhaseChange(boss, event)) {
      const phaseSound = Number(event.phase) === 2 ? BOSS_SFX.dimitrescu?.phase2 : BOSS_SFX.dimitrescu?.phase3;
      playSfxClone(phaseSound, { audioContext: audioCtx });
    }
    if (boss.id === 'banker' && event.vaultSound === 'close') {
      if (!locallyAnimatedBossVaultSoundEventIds.has(event.actionId)) {
        playSfxClone(BOSS_SFX.banker.vaultClose, { audioContext: audioCtx });
      }
    }
    if (bossEventAddsResource(boss, event)) {
      const pairedHeal = pairedHealByKey.get(matriarchNatureSoundPairKey(event, 'bloom'));
      const resourceSfx = boss.id === 'dimitrescu' ? BOSS_SFX.dimitrescu?.blood : BOSS_SFX[boss.id]?.resource;
      if (pairedHeal) {
        playBossSfxSequence(resourceSfx, BOSS_SFX.matriarca_esmeralda.heal);
      } else {
        playSfxClone(resourceSfx, { audioContext: audioCtx });
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
  if (dimitrescuPhasePortraitTimer) {
    clearTimeout(dimitrescuPhasePortraitTimer);
    dimitrescuPhasePortraitTimer = null;
    document.querySelector('#bossHud .boss-portrait')?.classList.remove('boss-dimitrescu-phase-shift');
  }
  bossPresentationKey = '';
  bossArtSpotlightKey = '';
  if (bossArtSpotlightTimer) {
    clearTimeout(bossArtSpotlightTimer);
    bossArtSpotlightTimer = null;
  }
  document.getElementById('bossArtSpotlight')?.remove();
  const gameSection = document.getElementById('gameSection');
  (document.getAnimations?.() || []).forEach((animation) => {
    const target = animation.effect?.target;
    if (target && (gameSection?.contains(target) || target.classList?.contains('dice-scene'))) animation.cancel();
  });
  document.querySelectorAll('.fly-card, .impact-ring, .spark, .dice-scene, .boss-floating-number, .domination-decree-lock-flight, .domination-decree-lock-frame').forEach((element) => element.remove());
  dominationDecreeLockAnimating = false;
}

function invalidateGameSession({ stopMedia = true } = {}) {
  clearTimeout(friendAutomationTimer);
  friendAutomationTimer = null;
  friendPlayback = null;
  friendActionPresentations.clear();
  document.getElementById('dominationFriendPresentation')?.remove();
  window.isClosingGame = true;
  updateVisionAlert('', false);
  updateDecreeAlert('', false);
  clearBotDominationDecreeSchedule();
  friendSoundQueue.cancel();
  friendNoticeTracker.reset();
  document.querySelectorAll('.friend-notice').forEach((notice) => {
    notice.getAnimations().forEach((animation) => animation.cancel());
    notice.remove();
  });
  window.gameSessionId += 1;
  botTurnController.abort();
  botTurnController = new AbortController();
  cancelPendingBotTurns();

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
  cancelPendingBotTurns();
  return window.gameSessionId;
}

function isGameSessionActive(sessionId, signal) {
  return !signal?.aborted && !window.isClosingGame && !localExitPending && !!state && !pauseBlocksPlay(state) && window.gameSessionId === sessionId && document.getElementById('gameSection')?.style.display === 'flex';
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

function confirmBossDiscardPickup() {
  const surcharge = getBossDiscardSurcharge(state);
  if (!surcharge) return { allowed: true, surcharge: null };
  return { allowed: true, surcharge };
}

function bossCreateMeldDeniedMessage(playerId) {
  const intent = state?.boss?.currentIntent;
  const persistentInverted = state?.boss?.id === 'nehelenia' && state.boss.effects?.some((effect) => effect.id === 'nehelenia_inverted_reflection' && effect.playerId === playerId);
  if (state?.boss?.id === 'nehelenia' && ((intent?.abilityId === 'fish_inverted' && intent.payload?.targetPlayerId === playerId && !intent.payload?.fedExisting) || persistentInverted)) {
    return '🪞 Reflexo Invertido: alimente primeiro um jogo que já existe. O efeito só termina quando você fizer isso.';
  }
  return '⛓ Você não pode criar outro jogo durante esta ordem.';
}

function bossUseMeldDeniedMessage(playerId, meldIndex) {
  const intent = state?.boss?.currentIntent;
  if (state?.boss?.id === 'nehelenia') {
    if (intent?.abilityId === 'hawk_watch' && intent.payload?.targetPlayerId === playerId && Number(intent.payload?.meldIndex) === Number(meldIndex)) {
      return "👁 Vigilância de Hawk's Eye: este jogo está fora do seu alcance neste turno.";
    }
    const player = state.players?.find((entry) => entry.id === playerId);
    const meldId = state.teams?.[player?.teamId ?? 0]?.melds?.[meldIndex]?.bossMeldId || null;
    const currentPrey = intent?.abilityId === 'tiger_prey' && intent.payload?.targetPlayerId === playerId && !intent.payload?.fed ? intent.payload : null;
    const persistentPrey = state.boss.effects?.find((effect) => effect.id === 'nehelenia_tiger_prey' && effect.playerId === playerId);
    const prey = currentPrey || persistentPrey;
    const preyMatches = prey && ((prey.meldId && meldId && prey.meldId === meldId) || Number(prey.meldIndex) === Number(meldIndex));
    if (prey && !preyMatches) return `🐯 Presa Marcada: só você está preso ao Jogo ${Number(prey.meldIndex) + 1}. Alimente a Presa primeiro.`;
    const tigerLock = state.boss.effects?.some(
      (effect) => effect.id === 'nehelenia_meld_lock' && (effect.playerId == null || effect.playerId === playerId) && ((effect.meldId && meldId && effect.meldId === meldId) || Number(effect.meldIndex) === Number(meldIndex)),
    );
    if (tigerLock) return "🐯 As garras de Tiger's Eye mantêm este jogo bloqueado.";
  }
  return '⛓ Separação ativa: seu cooperador já usou este jogo na rodada.';
}

async function prepareBossMeldMutation(player, meldIndex, oldKind, newKind, cardsAdded, undoType, selectedCardIds = [], options = {}) {
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
  const warning = getBossUiAdapter(state.boss?.id)?.finalStrikeWarning?.({ gameState: state, playerId: currentPlayer()?.id });
  if (warning) return window.confirm(warning);
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
  if (state?.mode === '1x1_dominacao') {
    if (isDominationFriendBusy(state) || friendOperationPending || transaction?.state?.friendUsed !== state.friendUsed || JSON.stringify(dominationFriends(transaction?.state)) !== JSON.stringify(dominationFriends(state))) return;
  }
  if (!canRestoreUndoTransaction(transaction, state, myPlayerIndex)) {
    showMessage('Esta acao nao pode mais ser desfeita.');
    return;
  }

  localUndoStack.pop();
  const restored = restoreUndoTransaction(transaction);
  const previousState = restored.state;
  if (state.mode === '1x1_dominacao') previousState.friendRevision = state.friendRevision || 0;
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
  const container = document.getElementById('videoContainer');
  const videos = [document.getElementById('bgVid1'), document.getElementById('bgVid2'), document.getElementById('bgVid3')];

  // Durante a partida o vídeo não é apenas pausado: ele sai da árvore de
  // composição. Em tablets isso evita manter três superfícies de vídeo +
  // filtros atrás da mesa e também impede que um frame do menu apareça em
  // caso de pressão no compositor/GPU.
  if (container) container.style.display = play ? '' : 'none';
  if (play) document.body.classList.remove('game-performance-lite');

  videos.forEach((vid) => {
    if (!vid) return;
    if (play) {
      // Apenas o vídeo que estiver com a classe 'active' volta a rodar.
      if (vid.classList.contains('active')) vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  });
}

function syncAdaptiveGamePerformance() {
  const body = document.body;
  if (!state || !window.matchMedia?.('(any-pointer: coarse)').matches) {
    body.classList.remove('game-performance-lite');
    body.removeAttribute('data-render-weight');
    return;
  }

  const handCards = (state.players || []).reduce((sum, player) => sum + (player.hand?.length || 0), 0);
  const meldCards = (state.teams || []).reduce((sum, team) => sum + (team.melds || []).reduce((meldSum, meld) => meldSum + (meld?.length || 0), 0), 0);
  // Monte/lixo desenham no máximo 16 camadas cada. Contar as camadas visuais,
  // e não todas as cartas, aproxima melhor o custo real de composição.
  const pileLayers = Math.min(16, Math.ceil((state.stock?.length || 0) / 3)) + Math.min(16, Math.ceil((state.discard?.length || 0) / 3));
  const renderWeight = handCards + meldCards + pileLayers;
  const wasLite = body.classList.contains('game-performance-lite');
  // Histerese: entra quando a mesa fica pesada e só sai depois de aliviar bem,
  // evitando ficar ligando/desligando efeitos a cada compra ou descarte.
  const shouldLite = wasLite ? renderWeight >= 62 : renderWeight >= 76;
  body.classList.toggle('game-performance-lite', shouldLite);
  body.dataset.renderWeight = String(renderWeight);
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
let ambientIntroSession = null;
const playedTableIntros = new Set();
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
  const requested = tableAmbientAudio?.dataset.intro === 'true' ? 0.35 : Number(cfg.volume) || 0.1;
  // Mantém a música sempre bem abaixo dos efeitos mais baixos da mesa.
  return Math.min(requested, TABLE_AMBIENT_MAX_VOLUME, sfxCardMove.volume * 0.7);
}

function dominationAudioHasPriority() {
  // Any themed Ás-a-Ás celebration needs a clear background in every game mode.
  // Queued canastra sounds are already covered by friendSoundQueue.busy.
  if (Object.values(TABLE_ASAS_SFX).some((sound) => !sound.paused && !sound.ended)) return true;
  return (
    state?.mode === '1x1_dominacao' &&
    (friendSoundQueue.busy || (state.powerActiveThisTurn && !state.hasDrawnThisTurn) || document.getElementById('cardSearchDialog')?.open || (!sfxSteal.paused && !sfxSteal.ended) || (!sfxSearch.paused && !sfxSearch.ended))
  );
}

function pauseAmbientForDomination() {
  tableAmbientFadeId++;
  // Keep this element and currentTime: resume the same intro/music afterward.
  tableAmbientAudio?.pause();
}

function playDominationSearchSound() {
  if (!audioUnlocked || window.isClosingGame) return;
  pauseAmbientForDomination();
  const sound = playSfxClone(sfxSearch, { audioContext: audioCtx });
  if (!sound) {
    syncTableAmbientMusic();
    return;
  }
  const resumeAmbient = () => syncTableAmbientMusic();
  sound.addEventListener('ended', resumeAmbient, { once: true });
  sound.addEventListener('error', resumeAmbient, { once: true });
}

for (const sound of [sfxSearch, sfxSteal, ...Object.values(TABLE_ASAS_SFX)]) {
  for (const event of ['play', 'ended', 'pause', 'error']) sound.addEventListener(event, () => syncTableAmbientMusic());
}
document.getElementById('cardSearchDialog')?.addEventListener('close', () => syncTableAmbientMusic());

function fadeTableAmbientTo(targetVolume, duration = 850, onDone = null) {
  if (!tableAmbientAudio) return;
  if (targetVolume > 0 && dominationAudioHasPriority()) {
    pauseAmbientForDomination();
    return;
  }
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

  if (dominationAudioHasPriority()) {
    pauseAmbientForDomination();
    return;
  }

  const theme = normalizeTableTheme(state.tableTheme || document.body.dataset.tableTheme || 'feltro');
  const cfg = TABLE_AMBIENT_MUSIC[theme];
  // Illustrated tables may not have a supplied soundtrack yet.
  if (!cfg) {
    stopTableAmbientMusic(true);
    return;
  }
  const targetVolume = getSafeAmbientVolume(theme);

  if (!tableAmbientAudio || tableAmbientTheme !== theme || ambientIntroSession !== window.gameSessionId) {
    stopTableAmbientMusic(true);
    if (ambientIntroSession !== window.gameSessionId) {
      ambientIntroSession = window.gameSessionId;
      playedTableIntros.clear();
    }
    const intro = Boolean(cfg.intro) && !playedTableIntros.has(theme);
    if (intro) playedTableIntros.add(theme);
    tableAmbientTheme = theme;
    const audio = new Audio(intro ? cfg.intro : cfg.src);
    tableAmbientAudio = audio;
    audio.dataset.intro = String(intro);
    const finishIntro = () => {
      if (tableAmbientAudio !== audio) return;
      stopTableAmbientMusic(true);
      syncTableAmbientMusic();
    };
    if (intro) audio.addEventListener('ended', finishIntro, { once: true });
    audio.addEventListener('error', () => {
      console.warn('[ambient] Áudio da mesa não carregou:', audio.src);
      if (intro) finishIntro();
    });
    tableAmbientAudio.preload = 'auto';
    tableAmbientAudio.loop = !intro;
    tableAmbientAudio.volume = clampMediaVolume(0);
    tableAmbientAudio
      .play()
      .then(() => {
        if (tableAmbientAudio === audio) fadeTableAmbientTo(getSafeAmbientVolume(theme), intro ? 200 : 1000);
      })
      .catch(() => {});
    return;
  }

  tableAmbientAudio.loop = tableAmbientAudio.dataset.intro !== 'true';
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
    const themed = DECK_MOVE_SFX[normalizeDeckTheme(state?.deckTheme || document.body.dataset.deckTheme)];
    if (themed) {
      // Simultaneous card movements share one clip instead of overlapping voices.
      if (themed.paused || themed.ended) {
        themed.currentTime = 0;
        themed.play().catch(() => {});
      }
      return;
    }
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

ALL_CANASTRA_SFX.forEach((a) => {
  a.preload = 'auto';
  if (Object.values(CANASTRA_SFX).includes(a)) a.volume = 0.9;
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
  const allAudios = [...ALL_CANASTRA_SFX, ...Object.values(DECK_MOVE_SFX), ...bossAudios, sfxCardMove, sfxMyTurn, sfxSearch, sfxSteal, sfxHeartbeat];
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
  const friendKindsBefore = state.mode === '1x1_dominacao' && activeDominationFriends(state).length > 0 ? [classifyMeldForUi(fromMeld).kind, classifyMeldForUi(toMeld).kind] : null;

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

  // Moving a wild can clean a canastra too. Only the friend's duration changes;
  // the existing card-reward rules for this action remain untouched.
  if (friendKindsBefore) {
    grantDominationFriendExtraTurn(state, myPlayerIndex, friendKindsBefore[0], classifyMeldForUi(fromMeld).kind, fromMeldIdx);
    if (!sameMeld) grantDominationFriendExtraTurn(state, myPlayerIndex, friendKindsBefore[1], classifyMeldForUi(toMeld).kind, toMeldIdx);
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
  if (kind === 'asas') {
    // Do not let the preceding card-movement jingle cover the celebration.
    for (const sound of Object.values(DECK_MOVE_SFX)) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  const tableTheme = normalizeTableTheme(state?.tableTheme || document.body.dataset.tableTheme);
  const a = TABLE_CANASTRA_SFX[tableTheme]?.[kind] || CANASTRA_SFX[kind] || CANASTRA_SFX.suja;
  if (state?.mode === '1x1_dominacao') {
    if (kind === 'fim') friendSoundQueue.cancel();
    else if (activeDominationFriends(state).length > 0 || friendSoundQueue.busy) {
      friendSoundQueue.enqueue(a);
      return;
    }
  }
  try {
    a.pause();
    a.currentTime = 0;
  } catch (e) {}
  const isThemedAsas = Object.values(TABLE_ASAS_SFX).includes(a);
  if (isThemedAsas) pauseAmbientForDomination();
  a.play().catch(() => {
    if (isThemedAsas) syncTableAmbientMusic();
  });
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
  friendNoticeTracker.reset();
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

function applyDimitrescuBloodScatter(element, key = '', profile = 'card') {
  if (!element) return;
  const seedText = `${profile}:${String(key || 'blood')}`;
  let seed = 23;
  for (let i = 0; i < seedText.length; i += 1) seed = (seed * 33 + seedText.charCodeAt(i)) % 2147483647;
  const next = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const pick = (min, max, digits = 2) => (min + next() * (max - min)).toFixed(digits);
  const spec = {
    card: {
      blobX: [10, 88],
      blobY: [11, 79],
      blobR: [5.4, 12.8],
      dripCount: 3,
      dripX: [14, 82],
      dripTop: [58, 76],
      dripW: [6, 14],
      dripH: [16, 30],
      dripBulge: [34, 58],
      mistOpacity: [0.16, 0.3],
    },
    feast: {
      blobX: [8, 90],
      blobY: [10, 82],
      blobR: [6.8, 14.5],
      dripCount: 4,
      dripX: [12, 84],
      dripTop: [54, 74],
      dripW: [7, 16],
      dripH: [18, 36],
      dripBulge: [38, 64],
      mistOpacity: [0.2, 0.34],
    },
    discard: {
      blobX: [12, 86],
      blobY: [12, 76],
      blobR: [5.6, 12.4],
      dripCount: 3,
      dripX: [16, 80],
      dripTop: [60, 78],
      dripW: [6, 13],
      dripH: [15, 28],
      dripBulge: [32, 54],
      mistOpacity: [0.15, 0.28],
    },
    dead: {
      blobX: [10, 88],
      blobY: [10, 82],
      blobR: [7.2, 16.8],
      dripCount: 4,
      dripX: [14, 84],
      dripTop: [50, 72],
      dripW: [6, 15],
      dripH: [18, 34],
      dripBulge: [36, 62],
      mistOpacity: [0.18, 0.34],
    },
  }[profile] || {
    blobX: [10, 88],
    blobY: [11, 79],
    blobR: [5.4, 12.8],
    dripCount: 3,
    dripX: [14, 82],
    dripTop: [58, 76],
    dripW: [6, 14],
    dripH: [16, 30],
    dripBulge: [34, 58],
    mistOpacity: [0.16, 0.3],
  };

  for (let i = 1; i <= 6; i += 1) {
    element.style.setProperty(`--blood-blob-x${i}`, `${pick(spec.blobX[0], spec.blobX[1])}%`);
    element.style.setProperty(`--blood-blob-y${i}`, `${pick(spec.blobY[0], spec.blobY[1])}%`);
    element.style.setProperty(`--blood-blob-r${i}`, `${pick(spec.blobR[0], spec.blobR[1])}%`);
    element.style.setProperty(`--blood-blob-o${i}`, pick(0.48, 0.96, 3));
  }

  for (let i = 1; i <= 4; i += 1) {
    const enabled = i <= spec.dripCount;
    element.style.setProperty(`--blood-drip-x${i}`, `${pick(spec.dripX[0], spec.dripX[1])}%`);
    element.style.setProperty(`--blood-drip-top${i}`, `${pick(spec.dripTop[0], spec.dripTop[1])}%`);
    element.style.setProperty(`--blood-drip-w${i}`, enabled ? `${pick(spec.dripW[0], spec.dripW[1])}px` : '0px');
    element.style.setProperty(`--blood-drip-h${i}`, enabled ? `${pick(spec.dripH[0], spec.dripH[1])}px` : '0px');
    element.style.setProperty(`--blood-drip-bulge${i}`, enabled ? `${pick(spec.dripBulge[0], spec.dripBulge[1])}%` : '0%');
    element.style.setProperty(`--blood-drip-sway${i}`, enabled ? `${pick(-1.8, 1.8)}px` : '0px');
  }

  element.style.setProperty('--blood-smear-angle', `${pick(96, 128)}deg`);
  element.style.setProperty('--blood-sheen-angle', `${pick(84, 110)}deg`);
  element.style.setProperty('--blood-mist-opacity', pick(spec.mistOpacity[0], spec.mistOpacity[1], 3));
}

function syncDimitrescuDeadPileVisual(container, active, key = '') {
  if (!container) return;
  container.querySelectorAll('.boss-dead-blood-layer').forEach((layer) => layer.classList.remove('boss-dead-blood-layer'));
  if (!active) return;
  const topLayer = [...container.querySelectorAll('.visual-layer')].at(-1);
  if (!topLayer) return;
  topLayer.classList.add('boss-dead-blood-layer');
  applyDimitrescuBloodScatter(topLayer, key, 'dead');
}

const ANIM_MS = 900;
const ANIM_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

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

async function flyRectToRect(card, fromRect, toRect, face = 'front', silent = false) {
  if (!silent && !card?._silentAsAsBonus) playCardMove();
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
    if (isDominationFriendBusy(state) || friendOperationPending) {
      el.textContent = isDominationFriendTurn(state) ? `TURNO DE ${(getDominationFriend(state)?.name || 'AMIGA').toUpperCase()}` : 'CHAMANDO AMIGA';
      return;
    }
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

const friendMeldRules = {
  prepare: (cards) => {
    const copy = cards.map((card) => ({ ...card }));
    optimizeMeld(copy);
    normalizeMeldOrder(copy);
    return copy;
  },
  valid: (cards) => isValidSequenceMeld(cards),
  classify: (cards) => classifyMeldForUi(cards).kind,
  isWild: (card, meld) => isWildcard(card, meld),
  sortHand,
};

const evaluateDominationVisionHint = createVisionHintEvaluator(friendMeldRules);
const presentVisionFocus = createVisionFocus();
const presentDecreeFocus = createVisionFocus(document, window, 'decreeBtn');
const updateVisionAlert = createVisionAlert({
  busy: () => [sfxMyTurn, ...ALL_CANASTRA_SFX].some((audio) => !audio.paused && !audio.ended),
  valid: () => !window.isClosingGame && Boolean(evaluateDominationVisionHint(state, myPlayerIndex, canPerformCommonGameAction(state))),
  intro: presentVisionFocus,
  pulse: (active) => ['powerBtn', 'dominationVisionHint'].forEach((id) => document.getElementById(id)?.classList.toggle('vision-alert-pulse', active)),
  recalled: (key) => {
    try {
      return sessionStorage.getItem('buraco-vision-alert') === key;
    } catch {
      return false;
    }
  },
  remember: (key) => {
    try {
      sessionStorage.setItem('buraco-vision-alert', key);
    } catch {}
  },
});

const updateDecreeAlert = createVisionAlert({
  // Se a UI estiver sincronizando/gravando no exato começo do turno, não
  // consumimos o aviso. Esperamos o botão ficar realmente acionável.
  busy: () => [sfxMyTurn, ...ALL_CANASTRA_SFX].some((audio) => !audio.paused && !audio.ended) || !canActivateDominationDecree(state, 1),
  valid: () => !window.isClosingGame && Boolean(getDominationDecreeThreat(state)),
  // O alerta apenas mostra/destaca o botão. Som e animação de execução
  // acontecem somente depois do clique realmente aplicar o Decreto.
  intro: presentDecreeFocus,
  pulse: (active) => ['decreeBtn', 'dominationDecreeHint'].forEach((id) => document.getElementById(id)?.classList.toggle('vision-alert-pulse', active)),
  // Diferente da Visão, o alerta do Decreto é ligado ao descarte que abriu o
  // turno. Um reload/sincronização no mesmo turno não deve fazê-lo desaparecer.
  recalled: () => false,
  remember: () => {},
});

const DOMINATION_DECREE_LOCK_ASSET = 'assets/images/domination-decree-lock.png';
const DOMINATION_DECREE_LOCK_ASPECT = 971 / 1619;
const DOMINATION_DECREE_LOCK_TARGET_SCALE = 1.6;
let dominationDecreeLockAnimating = false;

function dominationDecreeDiscardTarget() {
  const face = document.getElementById('discardFace');
  if (face && face.getClientRects().length) return face;
  return document.querySelector('#drawDiscardBtn .pile-card');
}

function syncDominationDecreeDiscardLock(gameState = state, { settle = false } = {}) {
  const pile = document.querySelector('#drawDiscardBtn .pile-card');
  const target = dominationDecreeDiscardTarget();
  const show = !window.isClosingGame && shouldShowDominationDecreeDiscardLock(gameState);

  if (!pile || !target || !show || dominationDecreeLockAnimating) {
    if (!show || dominationDecreeLockAnimating) pile?.querySelector('.domination-decree-lock-frame')?.remove();
    return null;
  }

  let frame = pile.querySelector('.domination-decree-lock-frame');
  if (!frame) {
    frame = document.createElement('img');
    frame.className = 'domination-decree-lock-frame';
    frame.src = DOMINATION_DECREE_LOCK_ASSET;
    frame.alt = '';
    frame.setAttribute('aria-hidden', 'true');
    frame.draggable = false;
    pile.appendChild(frame);
  }

  const pileRect = getRect(pile);
  const targetRect = getRect(target);
  if (pileRect.width && pileRect.height && targetRect.width && targetRect.height) {
    const height = targetRect.height * DOMINATION_DECREE_LOCK_TARGET_SCALE;
    const width = height * DOMINATION_DECREE_LOCK_ASPECT;
    frame.style.left = `${targetRect.left - pileRect.left + targetRect.width / 2}px`;
    frame.style.top = `${targetRect.top - pileRect.top + targetRect.height / 2}px`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
  }

  if (settle && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    frame.classList.remove('is-settling');
    void frame.offsetWidth;
    frame.classList.add('is-settling');
    setTimeout(() => frame?.classList.remove('is-settling'), 460);
  }
  return frame;
}

async function animateDominationDecreeLockToDiscard({ force = false, persist = true } = {}) {
  if (!force && !shouldShowDominationDecreeDiscardLock(state)) {
    syncDominationDecreeDiscardLock(state);
    return;
  }

  const target = dominationDecreeDiscardTarget();
  const stage = document.querySelector('#gameSection .board-middle') || document.querySelector('#gameSection .board');
  if (!target || !stage) {
    if (persist) syncDominationDecreeDiscardLock(state);
    return;
  }

  const toRect = getRect(target);
  const stageRect = getRect(stage);
  if (!toRect.width || !toRect.height || !stageRect.width || !stageRect.height) {
    if (persist) syncDominationDecreeDiscardLock(state);
    return;
  }

  dominationDecreeLockAnimating = true;
  document.querySelector('#drawDiscardBtn .domination-decree-lock-frame')?.remove();

  const ghost = document.createElement('img');
  ghost.className = 'domination-decree-lock-flight';
  ghost.src = DOMINATION_DECREE_LOCK_ASSET;
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.draggable = false;

  const stageCenterX = stageRect.left + stageRect.width / 2;
  const stageCenterY = stageRect.top + stageRect.height / 2;
  const startHeight = Math.max(toRect.height * 2.2, Math.min(240, Math.max(180, stageRect.height * 1.8)));
  const startWidth = startHeight * DOMINATION_DECREE_LOCK_ASPECT;
  const targetHeight = toRect.height * DOMINATION_DECREE_LOCK_TARGET_SCALE;
  const endScale = targetHeight / startHeight;
  const approachScale = 1 + (endScale - 1) * 0.68;
  const targetCenterX = toRect.left + toRect.width / 2;
  const targetCenterY = toRect.top + toRect.height / 2;
  const dx = targetCenterX - stageCenterX;
  const dy = targetCenterY - stageCenterY;

  Object.assign(ghost.style, {
    left: `${stageCenterX - startWidth / 2}px`,
    top: `${stageCenterY - startHeight / 2}px`,
    width: `${startWidth}px`,
    height: `${startHeight}px`,
  });
  document.body.appendChild(ghost);

  try {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!reducedMotion) {
      const flight = ghost.animate(
        [
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 0, filter: 'brightness(1.22) drop-shadow(0 0 24px rgba(244,114,182,.55))' },
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'brightness(1.16) drop-shadow(0 0 24px rgba(244,114,182,.64))', offset: 0.16 },
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'brightness(1.06) drop-shadow(0 0 18px rgba(168,85,247,.52))', offset: 0.34 },
          { transform: `translate3d(${dx * 0.68}px,${dy * 0.62}px,0) scale(${approachScale})`, opacity: 0.98, filter: 'brightness(1) drop-shadow(0 0 14px rgba(126,34,206,.48))', offset: 0.76 },
          { transform: `translate3d(${dx}px,${dy}px,0) scale(${endScale})`, opacity: 1, filter: 'drop-shadow(0 0 10px rgba(88,28,135,.42))' },
        ],
        { duration: 1120, easing: 'cubic-bezier(.2,.72,.16,1)', fill: 'forwards' },
      );
      await flight.finished.catch(() => {});
    } else {
      await waitForVisualDuration(80);
    }
  } finally {
    ghost.remove();
    dominationDecreeLockAnimating = false;
    if (persist) syncDominationDecreeDiscardLock(state);
  }
}

function renderDominationVisionHint() {
  const hint = document.getElementById('dominationVisionHint');
  if (!hint) return;
  const message = evaluateDominationVisionHint(state, myPlayerIndex, canPerformCommonGameAction(state));
  // Updating only on change avoids repeated live-region announcements on renders.
  if (hint.textContent !== message) hint.textContent = message;
  hint.hidden = !message;
  updateVisionAlert(`${gameId}:${state.friendGameId || window.gameSessionId}:${state.turnNumber}:${myPlayerIndex}`, Boolean(message) && !window.isClosingGame && state.turnNumber !== 0);
  const powerButton = document.getElementById('powerBtn');
  if (powerButton) {
    if (message) powerButton.setAttribute('aria-describedby', 'dominationVisionHint');
    else powerButton.removeAttribute('aria-describedby');
  }
}

let matchDurationTimer = null;
function renderMatchDuration() {
  const el = document.getElementById('matchDuration');
  if (!el) return;
  if (!state || window.isClosingGame) {
    el.textContent = '';
    clearInterval(matchDurationTimer);
    matchDurationTimer = null;
    return;
  }
  const start = state.matchStartedAt;
  const end = state.finished ? (state.matchFinishedAt ||= state.lastAction?.ts || Date.now()) : Date.now();
  const seconds = start ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
  if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
  el.textContent = `${state.finished ? '⏱ Final' : '⏱'} ${parts.map((n) => String(n).padStart(2, '0')).join(':')}`;
  if (state.finished) {
    clearInterval(matchDurationTimer);
    matchDurationTimer = null;
  } else if (!matchDurationTimer) matchDurationTimer = setInterval(renderMatchDuration, 1000);
}

function canActivateDominationDecree(gameState = state, actorId = myPlayerIndex) {
  return canUseDominationDecree(gameState, actorId) && !isDominationFriendBusy(gameState) && canPerformCommonGameAction(gameState) && !friendOperationPending && !committing;
}

function evaluateDominationDecreeThreat(gameState = state) {
  if (gameState?.mode !== '1x1_dominacao') return null;
  if (!canUseDominationDecree(gameState, 1) || dominationDecreeUsed(gameState)) return null;
  const lastAction = gameState.lastAction;
  if (lastAction?.type !== 'discard' || Number(lastAction.playerId) !== 1) return null;
  const slave = gameState.players?.[0];
  if (!slave) return null;
  const top = gameState.discard?.at?.(-1);
  if (!top) return null;
  if (lastAction.card?.id && top.id && lastAction.card.id !== top.id) return null;
  const hand = (slave.hand || []).filter(Boolean);
  const team = gameState.teams?.find((entry) => entry.id === slave.teamId);
  const melds = team?.melds || [];

  // A mesma leitura serve ao alerta humano e à IA do Dominador. Além de dizer
  // se a carta serve, classificamos a força da oportunidade para a IA não
  // gastar o poder 1x/partida numa ameaça pequena logo no começo.
  const fits = (cards) => cards.length >= 3 && isValidSequenceMeld(cards);
  let kind = '';
  let baseScore = 0;
  if (melds.some((meld) => fits([...meld, top]))) {
    kind = 'direct';
    baseScore = 4;
  } else if (melds.some((meld) => hand.some((card) => fits([...meld, card, top])))) {
    kind = 'bridge';
    baseScore = 3;
  } else {
    outer: for (let i = 0; i < hand.length - 1; i += 1) {
      for (let j = i + 1; j < hand.length; j += 1) {
        if (fits([hand[i], hand[j], top])) {
          kind = 'new';
          baseScore = 2;
          break outer;
        }
      }
    }
  }
  if (!baseScore) return null;

  const pileSize = gameState.discard.length;
  const handSize = hand.length;
  const tookDead = Number(gameState.deadChunksTaken?.[slave.teamId] || 0) > 0;
  let score = baseScore;
  if (pileSize >= 6) score += 2;
  else if (pileSize >= 3) score += 1;
  if (handSize <= 3) score += 3;
  else if (handSize <= 5) score += 2;
  else if (handSize <= 7) score += 1;
  if (tookDead) score += 1;
  if (top.joker || top.rank === '2') score += 1;

  return {
    card: top,
    label: `${top.rank || ''}${top.suit || ''}`.trim() || 'A carta do topo',
    kind,
    score,
    pileSize,
    handSize,
    tookDead,
  };
}

function getDominationDecreeThreat(gameState = state) {
  if (myPlayerIndex !== 1) return null;
  const slave = gameState?.players?.[0];
  if (!slave || slave.name?.toUpperCase().includes('BOT')) return null;
  return evaluateDominationDecreeThreat(gameState);
}

function shouldBotUseDominationDecree(gameState = state, threat = evaluateDominationDecreeThreat(gameState), { actualDiscardIntent = false } = {}) {
  if (!threat || gameState?.players?.[1]?.name?.toUpperCase().includes('BOT') !== true) return false;
  // Se o Escravo BOT já decidiu pegar o Lixo, isso é uma confirmação extra de
  // valor. Contra humano, a IA decide no começo do turno pela ameaça visível.
  const score = threat.score + (actualDiscardIntent ? 2 : 0);
  return score >= 4;
}

let botDominationDecreeTimeoutId = null;
let botDominationDecreeScheduleKey = '';

function clearBotDominationDecreeSchedule() {
  if (botDominationDecreeTimeoutId) clearTimeout(botDominationDecreeTimeoutId);
  botDominationDecreeTimeoutId = null;
  botDominationDecreeScheduleKey = '';
}

function scheduleBotDominationDecree() {
  const dominatorIsBot = state?.players?.[1]?.name?.toUpperCase().includes('BOT') === true;
  const slaveIsBot = state?.players?.[0]?.name?.toUpperCase().includes('BOT') === true;
  const hostIndex = friendHostIndex(state);
  const threat = !slaveIsBot ? evaluateDominationDecreeThreat(state) : null;
  const eligible = dominatorIsBot
    && !slaveIsBot
    && myPlayerIndex === hostIndex
    && !window.isClosingGame
    && !friendPlayback
    && !state?.finished
    && state.currentPlayer === 0
    && shouldBotUseDominationDecree(state, threat);

  if (!eligible) {
    clearBotDominationDecreeSchedule();
    return;
  }

  const key = `${state.friendGameId || window.gameSessionId}:${state.turnNumber}:${threat.card.id || threat.label}`;
  if (botDominationDecreeScheduleKey === key) return;
  if (botDominationDecreeTimeoutId) clearTimeout(botDominationDecreeTimeoutId);
  botDominationDecreeScheduleKey = key;
  const session = window.gameSessionId;
  const turn = state.turnNumber;

  botDominationDecreeTimeoutId = setTimeout(async () => {
    botDominationDecreeTimeoutId = null;
    if (session !== window.gameSessionId || window.isClosingGame || !state || state.turnNumber !== turn || state.currentPlayer !== 0 || state.hasDrawnThisTurn) return;
    const liveThreat = evaluateDominationDecreeThreat(state);
    if (!shouldBotUseDominationDecree(state, liveThreat)) return;

    // Pequenas gravações/animações no começo do turno não fazem a IA perder a
    // janela. Ela espera brevemente, mas nunca bloqueia depois que o Escravo já comprou.
    for (let tries = 0; tries < 20 && !canActivateDominationDecree(state, 1); tries += 1) {
      if (session !== window.gameSessionId || window.isClosingGame || !state || state.turnNumber !== turn || state.currentPlayer !== 0 || state.hasDrawnThisTurn) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!canActivateDominationDecree(state, 1)) return;
    await performDominationDecree(1, true);
  }, 700);
}

function renderDominationTools() {
  const control = document.getElementById('debugFriendControls');
  if (control) control.hidden = state.mode !== '1x1_dominacao';
  const select = document.getElementById('debugMeldActor');
  if (select) {
    const options = [['current', 'Jogador do turno'], ...state.players.map((p) => [`player:${p.id}`, p.name])];
    if (state.mode === '1x1_dominacao')
      for (const [i, seat] of ['left', 'right'].entries()) {
        const friend = activeDominationFriends(state).find((f) => f.seat === seat);
        if (friend) options.push([`friend:${friend.id}`, `Amiga ${i + 1} — ${friend.name}`]);
      }
    const key = JSON.stringify(options);
    if (select.dataset.options !== key) {
      const previous = select.value;
      select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
      if (options.some(([value]) => value === previous)) select.value = previous;
      select.dataset.options = key;
    }
  }

  const button = document.getElementById('decreeBtn');
  const hint = document.getElementById('dominationDecreeHint');
  const show = state.mode === '1x1_dominacao' && dominationFeatureEnabled(state, 'decree') && myPlayerIndex === 1 && !state.finished;
  const active = show && isDominationDiscardDecreeActive(state, 0);
  const available = show && canActivateDominationDecree(state, 1);
  const used = dominationDecreeUsed(state);

  if (button) {
    button.hidden = !show;
    button.disabled = !available;
    button.textContent = active ? '🔒 LIXO BLOQUEADO' : used ? '✓ DECRETO USADO' : available ? '🔒 BLOQUEAR LIXO' : '🔒 BLOQUEAR LIXO';
    button.title = used
      ? 'O Decreto do Dominador já foi usado nesta partida.'
      : available
        ? 'Use agora para bloquear o Lixo durante o turno atual do Escravo e obrigar a compra do Monte.'
        : '1x por partida. Fica disponível durante o turno do Escravo, antes da compra, quando há cartas no Lixo.';
    button.style.boxShadow = available ? '0 0 16px rgba(245, 158, 11, 0.8)' : 'none';
    button.style.transform = available ? 'scale(1.04)' : '';
  }

  const slaveIsBot = state.players?.[0]?.name?.toUpperCase().includes('BOT') === true;
  const threat = show && !used && !slaveIsBot ? getDominationDecreeThreat(state) : null;
  const message = threat ? `⚠️ ${threat.label} que você descartou serve ao Escravo. Ele pode pegar o Lixo — bloqueie agora.` : active ? '🔒 Lixo bloqueado neste turno.' : '';
  if (hint) {
    if (hint.textContent !== message) hint.textContent = message;
    hint.hidden = !message;
  }
  const alertKey = threat ? `${gameId}:${state.turnNumber}:${threat.card.id || threat.label}` : '';
  updateDecreeAlert(alertKey, Boolean(threat));
  syncDominationDecreeDiscardLock(state);
  scheduleBotDominationDecree();
}

window.activateDominationDecree = () => performDominationDecree(myPlayerIndex);

async function performDominationDecree(actorId, botCall = false) {
  if (botCall && (Number(actorId) !== 1 || myPlayerIndex !== friendHostIndex(state) || state?.players?.[1]?.name?.toUpperCase().includes('BOT') !== true)) return false;
  if (!canActivateDominationDecree(state, actorId)) return false;
  const session = window.gameSessionId;
  const id = newActionId();
  friendOperationPending = true;
  renderAll();
  try {
    const saved = await saveFriendOperation((latest) => {
      if (!applyDominationDecree(latest, actorId)) return null;
      latest.lastAction = {
        id,
        type: 'dominationDecree',
        playerId: actorId,
        targetPlayerId: 0,
        turnNumber: latest.turnNumber,
        ts: Date.now(),
      };
      return true;
    });
    if (session !== window.gameSessionId || window.isClosingGame) return false;
    if (!saved) {
      showMessage('A janela do Decreto fechou antes da confirmação. O poder não foi gasto.');
      return false;
    }
    ignoreOwnActionId = id;
    localUndoStack = [];
    if ((state.friendRevision || 0) <= saved.state.friendRevision) state = saved.state;
    // Só depois da confirmação real do clique: executa feedback do Decreto.
    presentDecreeFocus(true);
    playDominationSearchSound();
    const lockPresentation = animateDominationDecreeLockToDiscard();
    setTimeout(() => presentDecreeFocus(false), 1400);
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) {
      try {
        navigator.vibrate([180, 80, 180]);
      } catch {}
    }
    showMessage(botCall ? `🤖 ${state.players?.[1]?.name || 'Dominador BOT'} usou o Decreto: Lixo bloqueado neste turno.` : '🔒 Lixo bloqueado neste turno.');
    await lockPresentation;
    return true;
  } catch (error) {
    console.error('Decreto do Dominador:', error);
    showMessage('Não foi possível aplicar o Decreto. Tente novamente enquanto o Escravo ainda não comprou.');
    return false;
  } finally {
    friendOperationPending = false;
    if (session === window.gameSessionId && !window.isClosingGame) {
      renderAll();
      startTurnTimerIfNeeded();
    }
  }
}

async function waitForDominationDecreeReaction(botIndex) {
  if (botIndex !== 0) return false;
  const dominatorIsBot = state?.players?.[1]?.name?.toUpperCase().includes('BOT') === true;
  const session = window.gameSessionId;
  const turn = state?.turnNumber;
  const top = state?.discard?.at?.(-1);

  if (dominatorIsBot) {
    if (myPlayerIndex !== friendHostIndex(state) || !canActivateDominationDecree(state, 1)) return false;
    const baseThreat = evaluateDominationDecreeThreat(state);
    const threat = baseThreat || (top ? {
      card: top,
      label: `${top.rank || ''}${top.suit || ''}`.trim() || 'A carta do topo',
      kind: 'actual',
      score: 2,
      pileSize: state.discard.length,
      handSize: state.players?.[0]?.hand?.length || 0,
      tookDead: Number(state.deadChunksTaken?.[state.players?.[0]?.teamId] || 0) > 0,
    } : null);
    if (!shouldBotUseDominationDecree(state, threat, { actualDiscardIntent: true })) return false;
    await performDominationDecree(1, true);
    while (
      friendOperationPending
      && session === window.gameSessionId
      && !window.isClosingGame
      && state
      && state.turnNumber === turn
      && state.currentPlayer === botIndex
      && !state.hasDrawnThisTurn
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return session !== window.gameSessionId || window.isClosingGame || !state || state.turnNumber !== turn || state.currentPlayer !== botIndex || state.hasDrawnThisTurn
      ? true
      : isDominationDiscardDecreeActive(state, botIndex);
  }

  if (myPlayerIndex !== 1 || !canActivateDominationDecree(state, 1)) return false;
  const label = top ? `${top.rank || ''}${top.suit || ''}`.trim() : 'A carta do topo';
  showMessage(`⚠️ ${label} que você descartou serve ao Escravo BOT. Ele vai tentar pegar o Lixo — bloqueie agora.`);
  renderDominationTools();
  presentDecreeFocus(true);
  setTimeout(() => presentDecreeFocus(false), 1400);
  if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) {
    try {
      navigator.vibrate([120, 70, 120]);
    } catch {}
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Se o Dominador clicou perto do fim da janela, a transação/animação do
  // Decreto ainda pode estar concluindo. O BOT não pode avançar enquanto
  // canPerformCommonGameAction() continuaria bloqueado por essa operação.
  while (
    friendOperationPending
    && session === window.gameSessionId
    && !window.isClosingGame
    && state
    && state.turnNumber === turn
    && state.currentPlayer === botIndex
    && !state.hasDrawnThisTurn
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (session !== window.gameSessionId || window.isClosingGame) return true;
  if (!state || state.turnNumber !== turn || state.currentPlayer !== botIndex || state.hasDrawnThisTurn) return true;
  return isDominationDiscardDecreeActive(state, botIndex);
}

async function performDominationDevOperation(operation) {
  if (!isDebugMode || state?.mode !== '1x1_dominacao' || state.finished || friendOperationPending || committing || isDominationFriendBusy(state) || document.querySelector('.fly-card')) return;
  const session = window.gameSessionId;
  const id = newActionId();
  friendOperationPending = true;
  ignoreOwnActionId = id;
  stopTurnTimer();
  try {
    const saved = await saveFriendOperation(
      (latest) => {
        if (isDominationFriendBusy(latest)) return null;
        const result = operation(latest);
        if (!result) return null;
        latest.historyTest = true;
        latest.lastAction = { ...(result === true ? { type: 'debugFriends', playerId: 1 } : result), id, ts: Date.now() };
        return true;
      },
      { allowDebugPause: true },
    );
    if (!saved || session !== window.gameSessionId || window.isClosingGame) return;
    localUndoStack = [];
    try {
      await playRemoteAction(saved.state.lastAction);
    } finally {
      if (session === window.gameSessionId && !window.isClosingGame && (state.friendRevision || 0) <= saved.state.friendRevision) state = saved.state;
    }
    showMessage('🔧 Cenário atualizado. Os bônus seguem as opções Plus da partida.');
  } catch (error) {
    console.error('Dev amigas:', error);
    showMessage('Não foi possível aplicar o cenário.');
  } finally {
    friendOperationPending = false;
    if (session === window.gameSessionId && !window.isClosingGame) {
      renderAll();
      startTurnTimerIfNeeded();
      scheduleDominationFriend();
    }
  }
}
window.debugSetFriends = (count) => {
  if (!isDebugMode || ![1, 2].includes(count)) return;
  const invitation = createFriendInvitation(crypto.randomUUID());
  return performDominationDevOperation((latest) => setDebugFriends(latest, count, invitation, friendMeldRules));
};

function friendHostIndex(gameState) {
  if (!gameState?.players?.[1]?.name?.toUpperCase().includes('BOT')) return 1;
  const human = gameState.players.findIndex((player) => !player.name.toUpperCase().includes('BOT'));
  return human >= 0 ? human : -1;
}

async function saveFriendOperation(operation, { allowDebugPause = false } = {}) {
  const gameIdentity = state?.friendGameId;
  const sessionId = window.gameSessionId;
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(gameRef);
    if (sessionId !== window.gameSessionId || window.isClosingGame) return null;
    if (!snapshot.exists() || !snapshot.data().stateJson) return null;
    const latest = normalizeDominationFriends(JSON.parse(snapshot.data().stateJson));
    if (latest.mode !== '1x1_dominacao' || latest.friendGameId !== gameIdentity || latest.finished || latest.surrender?.active || pauseBlocksPlay(latest) || (latest.debugPaused && !(allowDebugPause && isDebugMode))) return null;
    const result = operation(latest);
    if (!result) return null;
    latest.friendRevision = (latest.friendRevision || 0) + 1;
    const saveHistory = latest.finished ? await prepareMatchHistory(transaction, latest) : () => {};
    transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
    saveHistory();
    return { state: latest, result };
  });
}

window.callDominationFriend = () => performDominationFriendCall(myPlayerIndex);

async function performDominationFriendCall(actorId, botCall = false) {
  if (botCall && (actorId !== 1 || myPlayerIndex !== friendHostIndex(state) || !state?.players?.[1]?.name?.toUpperCase().includes('BOT'))) return;
  if (!canCallDominationFriend(state, actorId) || friendOperationPending || committing || window.isAutoPlaying || window.isStealModeActive || window.isMelding || document.querySelector('.fly-card')) return;
  friendOperationPending = true;
  stopTurnTimer();
  renderAll();
  const sessionId = window.gameSessionId;
  const invitation = createFriendInvitation(crypto.randomUUID());
  try {
    const saved = await saveFriendOperation((latest) => {
      if (!callDominationFriend(latest, actorId, invitation, Date.now(), friendMeldRules)) return null;
      latest.lastAction = { id: `friend_call_${invitation.id}`, type: 'friendCall', playerId: 1, ts: Date.now() };
      return true;
    });
    if (!saved || sessionId !== window.gameSessionId || window.isClosingGame) return;
    if ((state.friendRevision || 0) <= saved.state.friendRevision) state = saved.state;
    localUndoStack = [];
    renderAll();
    scheduleDominationFriend();
    // Both clients present the same persisted invitation; neither rolls again.
    const invited = dominationFriends(saved.state).filter((friend) => friend.callId === invitation.id);
    await playFriendInvitationPresentation(invited);
  } catch (error) {
    console.error('Falha ao chamar amiga:', error);
    showMessage('Não foi possível salvar a chamada. Tente novamente.');
  } finally {
    friendOperationPending = false;
    if (sessionId === window.gameSessionId && state && !window.isClosingGame) {
      renderAll();
      startTurnTimerIfNeeded();
      scheduleDominationFriend();
    }
  }
}

function playFriendInvitationPresentation(invited) {
  if (!invited.length || state?.mode !== '1x1_dominacao') return Promise.resolve();
  const key = `invitation:${state.friendGameId}:${invited[0].callId || invited[0].id}`;
  if (friendActionPresentations.has(key)) return friendActionPresentations.get(key);
  const sessionId = window.gameSessionId;
  const playback = { gameId: state.friendGameId, view: structuredClone(state), promise: null };
  const isActive = () => friendPlayback === playback && sessionId === window.gameSessionId && !window.isClosingGame && state?.friendGameId === playback.gameId && !state.finished;
  friendPlayback = playback;
  playback.promise = Promise.resolve().then(async () => {
    try {
      if (!isActive()) return;
      stopTurnTimer();
      await presentDominationFriend(invited, isActive, {
        fly: flyRectToRect,
        impact: impactAtRect,
        rect: getRect,
        startRouletteSound: () => {
          const controller = new AbortController();
          friendSoundQueue.enqueue(FRIEND_MP3.arrival, undefined, { signal: controller.signal, loop: true });
          return () => controller.abort();
        },
      });
    } finally {
      if (friendPlayback === playback) friendPlayback = null;
      if (sessionId === window.gameSessionId && state && !window.isClosingGame) renderAll();
    }
  });
  friendActionPresentations.set(key, playback.promise);
  return playback.promise;
}

async function playFriendTurnPresentation(action) {
  const result = action?.friendResult;
  if (!result?.steps?.length || state?.mode !== '1x1_dominacao') return;
  if (friendActionPresentations.has(action.id)) return friendActionPresentations.get(action.id);
  // A reload renders the saved result without replaying an already ended turn.
  const guest = getDominationFriend(state, result.friendId);
  if (!guest?.active || guest.lastExecutedTurnId === result.turnId) return;
  const sessionId = window.gameSessionId;
  const playback = { actionId: action.id, gameId: state.friendGameId, view: structuredClone(state), promise: null };
  getDominationFriend(playback.view, result.friendId).pendingTurnId = result.turnId;
  getDominationFriend(playback.view, result.friendId).farewell = result.farewell;
  const isActive = () => friendPlayback === playback && sessionId === window.gameSessionId && !window.isClosingGame && state?.mode === '1x1_dominacao' && state.friendGameId === playback.gameId && !state.finished;
  friendPlayback = playback;
  playback.promise = Promise.resolve().then(async () => {
    try {
      if (!isActive()) return;
      stopTurnTimer();
      renderAll();
      await playDominationFriendTimeline(playback.view, result, {
        animate: playRemoteAction,
        render: renderAll,
        isActive,
        pace: async (stage) => {
          // Only the committing host renews the shared animation lease.
          const barrier = state.dominationFriendShared?.presentation;
          if (barrier?.owner === friendControllerId && barrier.expiresAt - Date.now() < 90000) {
            const renewed = await saveFriendOperation((latest) => {
              const lock = latest.dominationFriendShared?.presentation;
              if (lock?.id !== result.turnId || lock.owner !== friendControllerId) return null;
              lock.expiresAt = Date.now() + 120000;
              return true;
            });
            if (!renewed) throw new Error('A apresentação foi assumida por outra sessão.');
            barrier.expiresAt = renewed.state.dominationFriendShared.presentation.expiresAt;
          }
          const ranges = { think: [1500, 5500], organize: [900, 1300], play: [1700, 2300], discard: [800, 1400], card: [180, 350] };
          const [min, max] = ranges[stage];
          await BuracoBot.sleep(
            BuracoBot.randomDelay(min, max),
            {
              isActive,
              getState: () => state,
            },
            botTurnController.signal,
          );
        },
      });
    } catch (error) {
      // The gameplay was already committed. A cancelled/failed visual must not
      // retry the turn, charge bonuses again or strand the next player.
      if (isActive()) console.error('Falha na animação da amiga:', error);
    } finally {
      if (friendPlayback === playback) friendPlayback = null;
    }
  });
  friendActionPresentations.set(action.id, playback.promise);
  return playback.promise;
}

function playDominationFriendSharedDraw(event) {
  if (event?.recipients) return Promise.all(event.recipients.map(playDominationFriendSharedDraw));
  if (!event?.cards?.length || state?.mode !== '1x1_dominacao' || state.finished || window.isClosingGame || !getDominationFriend(state, event.friendId)?.active) return Promise.resolve();
  const key = `shared-draw:${event.id}`;
  if (friendActionPresentations.has(key)) return friendActionPresentations.get(key);
  const sessionId = window.gameSessionId;
  const gameIdentity = state.friendGameId;
  const promise = Promise.resolve()
    .then(() => {
      if (sessionId !== window.gameSessionId || state?.friendGameId !== gameIdentity || window.isClosingGame || state?.finished || !getDominationFriend(state, event.friendId)?.active) return;
      renderDominationFriend(state, myPlayerIndex);
      return playRemoteAction({ type: 'drawStock', playerId: 'friend', friendId: event.friendId, reason: 'canastra', kind: event.kind, cards: event.cards });
    })
    .catch((error) => console.warn('Falha visual na compra da amiga:', error));
  friendActionPresentations.set(key, promise);
  return promise;
}

function syncDominationFriendNotices() {
  if (state?.mode !== '1x1_dominacao' || state.finished || window.isClosingGame) return;
  const sessionId = window.gameSessionId;
  const gameIdentity = state.friendGameId;
  for (const event of friendNoticeTracker.collect(state, friendOperationPending)) {
    // Card flights are independent of the canastra/extra-turn sound queue.
    if (event.type === 'cardBonus') {
      playDominationFriendSharedDraw(event);
      continue;
    }
    // Entry music belongs only to the visible roulette, not the arrival notice.
    friendSoundQueue.enqueue(friendNoticeSound(event), () => {
      if (sessionId !== window.gameSessionId || window.isClosingGame || state?.finished || state?.friendGameId !== gameIdentity) return;
      return showDominationFriendNotice(event);
    });
  }
}

function scheduleDominationFriend() {
  clearTimeout(friendAutomationTimer);
  friendAutomationTimer = null;
  if (state?.mode !== '1x1_dominacao' || state.finished || state.debugPaused || pauseBlocksPlay(state) || window.isClosingGame) return;
  const friend = getDominationFriend(state);
  const barrier = state.dominationFriendShared?.presentation;
  if (!barrier && !friend?.pendingTurnId && !friend?.presentationUntil) return;
  const sessionId = window.gameSessionId;
  const wait = Math.max(1200, (barrier?.expiresAt || friend?.presentationUntil || 0) - Date.now() + 50);
  friendAutomationTimer = setTimeout(async () => {
    friendAutomationTimer = null;
    if (sessionId !== window.gameSessionId || window.isClosingGame || !state || state.debugPaused) return;
    if (myPlayerIndex !== friendHostIndex(state)) {
      renderAll();
      startTurnTimerIfNeeded();
      return;
    }
    if (committing || friendOperationPending || friendAutomationRunning || friendPlayback) {
      scheduleDominationFriend();
      return;
    }
    friendAutomationRunning = true;
    try {
      const saved = await saveFriendOperation((latest) => {
        if (myPlayerIndex !== friendHostIndex(latest)) return null;
        const shared = latest.dominationFriendShared;
        if (shared.presentation) {
          if (shared.presentation.expiresAt > Date.now()) return null;
          shared.presentation = null; // Recover the barrier, never repeat committed cards.
          return { recovered: true };
        }
        const guest = getDominationFriend(latest);
        if (!guest?.active || activeDominationFriends(latest).some((entry) => entry.presentationUntil > Date.now())) return null;
        let result;
        if (guest.pendingTurnId) result = executeDominationFriendTurn(latest, guest.pendingTurnId, friendMeldRules, { owner: friendControllerId });
        else if (guest.presentationUntil) result = { arrived: true, friendId: guest.id, name: guest.name };
        if (!result) return null;
        guest.presentationUntil = 0;
        latest.lastAction = {
          id: `friend_${result.turnId || guest.id + '_arrival'}`,
          type: 'friendTurn',
          playerId: 'friend',
          friendId: guest.id,
          friendResult: result,
          ts: Date.now(),
        };
        return result;
      });
      if (saved && sessionId === window.gameSessionId && !window.isClosingGame) {
        if (saved.result.turnId) state.dominationFriendShared.presentation = saved.state.dominationFriendShared.presentation;
        if (!saved.result.recovered) await playFriendTurnPresentation(saved.state.lastAction);
        if (sessionId !== window.gameSessionId || window.isClosingGame) return;
        localUndoStack = [];
        if ((state.friendRevision || 0) <= saved.state.friendRevision) state = saved.state;
        if (saved.result.turnId) {
          const completed = await saveFriendOperation((latest) => completeDominationFriendPresentation(latest, saved.result.turnId, friendControllerId));
          if (completed && sessionId === window.gameSessionId && !window.isClosingGame && (state.friendRevision || 0) <= completed.state.friendRevision) state = completed.state;
        }
        if (saved.result.departed) showMessage(`💋 ${saved.result.name} foi embora.`);
      }
    } catch (error) {
      console.error('Falha no turno da amiga:', error);
      showMessage('Aguardando conexão para concluir o turno da amiga.');
    } finally {
      friendAutomationRunning = false;
      if (sessionId === window.gameSessionId && state && !window.isClosingGame) {
        renderAll();
        startTurnTimerIfNeeded();
        scheduleDominationFriend();
      }
    }
  }, wait);
}

async function commitState() {
  if (!state || window.isClosingGame) return;
  if (state.finished && !state.matchFinishedAt) state.matchFinishedAt = Date.now();

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
      if (state.mode === '1x1_dominacao') {
        const localState = state;
        const proposal = structuredClone(state);
        const expectedRevision = proposal.friendRevision || 0;
        const sessionId = window.gameSessionId;
        const saved = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(gameRef);
          if (!snapshot.exists() || !snapshot.data().stateJson) return null;
          const latest = JSON.parse(snapshot.data().stateJson);
          if (latest.mode !== proposal.mode || latest.friendGameId !== proposal.friendGameId) return null;
          if ((latest.friendRevision || 0) !== expectedRevision || latest.surrender?.active || pauseBlocksPlay(latest) || (latest.pauseControlRevision || 0) !== (proposal.pauseControlRevision || 0)) return { accepted: false, state: latest };
          proposal.friendRevision = (latest.friendRevision || 0) + 1;
          const saveHistory = proposal.finished ? await prepareMatchHistory(transaction, proposal) : () => {};
          transaction.update(gameRef, { stateJson: JSON.stringify(proposal), updatedAt: Date.now() });
          saveHistory();
          return { accepted: true, state: proposal };
        });
        if (!saved?.accepted) {
          pendingCommit = false;
          localUndoStack = [];
          if (saved && sessionId === window.gameSessionId && !window.isClosingGame && state?.friendGameId === proposal.friendGameId && (state.friendRevision || 0) <= saved.state.friendRevision) {
            state = saved.state;
            renderAll();
            startTurnTimerIfNeeded();
            scheduleDominationFriend();
          }
          return;
        }
        if (state === localState) state.friendRevision = saved.state.friendRevision;
      } else {
        const proposal = structuredClone(state);
        const saved = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(gameRef);
          if (!snapshot.exists() || !snapshot.data().stateJson) return null;
          const latest = JSON.parse(snapshot.data().stateJson);
          if (latest.matchStartedAt !== proposal.matchStartedAt || latest.surrender?.active || pauseBlocksPlay(latest) || (latest.pauseControlRevision || 0) !== (proposal.pauseControlRevision || 0)) return latest;
          const saveHistory = proposal.finished ? await prepareMatchHistory(transaction, proposal) : () => {};
          transaction.update(gameRef, { stateJson: JSON.stringify(proposal), updatedAt: Date.now() });
          saveHistory();
          return null;
        });
        if (saved) {
          state = saved;
          pendingCommit = false;
          localUndoStack = [];
          renderAll();
        }
      }
    }
  } catch (err) {
    console.error('commitState failed:', err);
    if (state?.finished) showMessage('Não foi possível salvar o resultado. Confira a conexão antes de sair ou pedir revanche.');
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
  queueDominationFriendTurn(state, state.currentPlayer);
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
  if (isCurrentBossMode()) prepareBossVaultTurn(state, state.currentPlayer);
  return true;
}

async function autoPlayTimeout() {
  try {
    return await localActionGate.run(autoPlayTimeoutOnce);
  } finally {
    window.isAutoPlaying = false;
  }
}
async function autoPlayTimeoutOnce() {
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

  if (!state.hasDrawnThisTurn && isBossVaultDrawRequired(state, state.currentPlayer)) {
    const reclaimedVault = await reclaimLocalBossVault();
    if (!reclaimedVault) {
      window.isAutoPlaying = false;
      renderAll();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

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
    notifyBossPurchaseCompleted(state, currentPlayer().id);
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

  // The next card inherits the removed card's index. Clear selection before
  // any render/await, not only when our Firebase snapshot comes back.
  selectedHandIndexes.clear();
  selectedMeldTarget = null;

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

  if (stockIsExhausted(state)) {
    await finishGame(null);
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
  if (pauseBlocksPlay(state)) {
    updateTimerLabel();
    return;
  }
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
    if (window.isAutoPlaying || localActionGate.pending || pauseBlocksPlay(state) || (state && state.debugPaused) || isBossLabAutomationPaused()) return;

    if (!canPerformCommonGameAction(state)) return;
    turnTimerRemaining--;

    if (turnTimerRemaining <= 0) {
      stopTurnTimer();
      if (state.players?.[state.currentPlayer]?.name?.toUpperCase().includes('BOT')) {
        recoverTimedOutBotTurn().catch(console.error);
      } else if (state.currentPlayer === myPlayerIndex) {
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

async function recoverTimedOutBotTurn() {
  const botIndex = state?.currentPlayer;
  const turnNumber = state?.turnNumber;
  const sessionId = window.gameSessionId;
  const hostIndex = state?.players?.findIndex((player) => player && !player.name.toUpperCase().includes('BOT'));
  if (hostIndex !== myPlayerIndex || !state?.players?.[botIndex]?.name.toUpperCase().includes('BOT')) return;
  const running = window.activeBotTurn;
  // Stop the decision loop, then wait for any in-flight move/commit. Never
  // race a timeout discard against a move that is already being applied.
  const timedOutController = botTurnController;
  timedOutController.abort();
  if (running?.promise) await running.promise.catch(() => {});
  if (botTurnController !== timedOutController) return;
  botTurnController = new AbortController();
  if (sessionId !== window.gameSessionId || state?.turnNumber !== turnNumber || state?.currentPlayer !== botIndex || state?.finished) return;
  if (!canPerformCommonGameAction(state) || isBossTurnActive(state) || hasPendingBossChoices(state)) return;
  const engine = createBotEngineForSession(sessionId, botTurnController.signal);
  showMessage('Tempo do bot esgotado. Concluindo o turno...');
  if (!state.hasDrawnThisTurn) await engine.executeDrawStock(botIndex);
  if (state?.currentPlayer === botIndex && !state.finished) await engine.recoverBotTurn(botIndex);
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

function updateDominationFriendCapacity() {
  const input = document.getElementById('dominationFriendCapacity');
  if (!input) return;
  const count = Number(input.value);
  const label = count === 0 ? 'Escolha a quantidade' : count === 1 ? '1 amiga' : '2 amigas juntas';
  input.style.setProperty('--friend-capacity-progress', `${count * 50}%`);
  input.setAttribute('aria-valuetext', label);
  input.disabled = document.getElementById('dominationOption_friend')?.checked === false;
  const output = document.getElementById('dominationFriendCapacityValue');
  if (output) output.textContent = label;
}
window.updateDominationFriendCapacity = updateDominationFriendCapacity;

function readDominationMenuOptions() {
  return normalizeDominationOptions({
    ...Object.fromEntries(['friend', 'plus', 'vision', 'decree'].map((key) => [key, document.getElementById(`dominationOption_${key}`)?.checked !== false])),
    friendCapacity: document.getElementById('dominationFriendCapacity')?.value || 0,
  });
}

function syncDominationMenuOptions(options) {
  const normalized = normalizeDominationOptions({ ...options, friendCapacity: options?.friendCapacity ?? 0 });
  const capacity = document.getElementById('dominationFriendCapacity');
  if (capacity) capacity.value = String(normalized.friendCapacity);
  for (const key of ['friend', 'plus', 'vision', 'decree']) {
    const enabled = normalized[key];
    const checkbox = document.getElementById(`dominationOption_${key}`);
    if (checkbox) checkbox.checked = enabled;
  }
  updateDominationFriendCapacity();
}

function validateDominationFriendSelection(mode, options) {
  if (hasDominationFriendSelection(mode, options)) return true;
  const error = document.getElementById('menuError');
  error.textContent = 'Escolha 1 ou 2 amigas para iniciar, ou desmarque Amiga do Dominador.';
  error.style.display = 'block';
  document.getElementById('dominationFriendCapacity')?.focus();
  return false;
}

async function startGame(mode, names, variant, pixKeys = [], dominationOptions = readDominationMenuOptions(), historyOptions = {}) {
  if (!validateDominationFriendSelection(mode, dominationOptions)) return;
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
    const owners = historyOptions.accountIds || currentLobby?.seatAccountIds || [];
    const accountUid = /bot/i.test(cfg.name) ? null : owners[idx] || (idx === myPlayerIndex ? activeAccount?.uid : null) || null;
    players.push({ id: idx, name: cfg.name, accountUid, teamId: cfg.team, hand: [] });
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
      tName = t === 0 ? 'Cooperadores' : getBossDefinitionForMode(mode)?.name || 'Chefe';
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
    matchStartedAt: Date.now(),
    matchFinishedAt: null,
    historyTest: !!historyOptions.test,
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
    dominatorDecreeUsed: false,
    dominatorDiscardBlockTurn: null,
    powerActiveThisTurn: false,
  };
  if (mode === '1x1_dominacao') {
    newState.dominationOptions = normalizeDominationOptions(dominationOptions);
    newState.friendUsed = false;
    newState.dominationFriends = [];
    newState.dominationFriendShared = { stock: [], discard: [], rewardedMeldTiers: {}, bonusIds: [] };
    newState.friendRevision = 0;
    newState.friendGameId = crypto.randomUUID();
  }
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
  return (
    !pauseBlocksPlay(gameState) &&
    !gameState?.surrender?.active &&
    !discardPickupAnimating &&
    !isDominationFriendBusy(gameState) &&
    !(gameState?.mode === '1x1_dominacao' && (friendOperationPending || friendPlayback)) &&
    canBossPerformCommonAction(gameState)
  );
}
function ensureMyTurn() {
  if (pauseBlocksPlay(state)) {
    showMessage('⏸ Partida pausada ou aguardando votação.');
    return false;
  }
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
    else if (isDominationFriendBusy(state) || friendOperationPending) showMessage('👠 Aguarde a amiga concluir a participação.');
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

function financedTariffMessage(event, ownerName = '') {
  if (!event) return '';
  const labels = (event.cardLabels || []).filter(Boolean);
  const cards = labels.length ? labels.join(labels.length > 1 ? ' e ' : '') : `${event.count || 1} carta${(event.count || 1) === 1 ? '' : 's'}`;
  const owner = ownerName ? `${ownerName}: ` : '';
  return `${owner}Tarifa de Manutenção — ${cards} ${labels.length === 1 ? 'é' : 'são'} FINANCIADA${labels.length === 1 ? '' : 'S'}. Use ${labels.length === 1 ? 'essa carta' : 'essas cartas'} em um jogo neste turno. Descartar não quita a Tarifa; cada carta que não entrar em jogo gera +${event.debtPerCard} Dívida.`;
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
    showMessage(financedTariffMessage(financedEvent));
  }
  return cards;
}

function normalizeLegacyDiscardPurchase(gameState) {
  if (['1x1_duploMorto', '1x1_dominacao'].includes(gameState?.mode) && gameState.partialDraw && gameState.lastAction?.playerId === gameState.currentPlayer && ['drawDiscard', 'drawDiscardFechado'].includes(gameState.lastAction?.type)) {
    gameState.hasDrawnThisTurn = true;
    gameState.partialDraw = false;
  }
}

async function drawFromStock() {
  return localActionGate.run(drawFromStockOnce);
}
async function drawFromStockOnce() {
  if (!ensureMyTurn()) return;
  if (state.hasDrawnThisTurn) {
    showMessage('⚠️ Compra bloqueada: Você já puxou carta neste turno.');
    return;
  }
  if (isBossVaultDrawRequired(state, state.currentPlayer)) {
    showMessage('Cofre: o resgate chegou ao valor integral e é obrigatório neste turno.');
    return;
  }

  const fromEl = document.querySelector('#drawStockBtn .pile-card');
  const fromRect = fromEl ? getRect(fromEl) : null;

  saveStateForUndo('drawStock');

  // J2 compra 2; uma compra parcial da Visao ainda permite apenas 1.
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
  const vaultInterestEvent = deferBossVault(state, state.currentPlayer);

  sortHand(currentPlayer().hand);
  state.hasDrawnThisTurn = true;
  state.partialDraw = false; // Finalizou as compras
  notifyBossPurchaseCompleted(state, currentPlayer().id);
  window.isStealModeActive = false; // 👁️ Desativa a visão se tiver comprado do monte

  if (!state.boughtCardIds) state.boughtCardIds = [];
  drawnCards.forEach((c) => state.boughtCardIds.push(c.id)); // Salva todas para brilhar

  // Reserve os lugares na mão, mas revele cada carta só ao terminar seu voo.
  if (fromRect) drawnCards.forEach((c) => pendingStockCardIds.add(c.id));
  try {
    renderAll(); // A contagem do monte continua caindo imediatamente.
    if (fromRect) {
      for (const c of drawnCards) {
        const toEl = cardElById(c.id);
        if (toEl) await flyRectToRect(c, fromRect, getRect(toEl), 'back');
        pendingStockCardIds.delete(c.id);
        const arrivedEl = cardElById(c.id);
        if (arrivedEl) arrivedEl.style.visibility = '';
      }
    }
  } finally {
    for (const c of drawnCards) {
      pendingStockCardIds.delete(c.id);
      const el = cardElById(c.id);
      if (el) el.style.visibility = '';
    }
  }

  const drawMessages = [];
  if (financedEvent) drawMessages.push(financedTariffMessage(financedEvent));
  if (vaultInterestEvent) drawMessages.push(vaultInterestEvent.outcome);
  showMessage(drawMessages.join(' '));

  state.lastAction = {
    id: newActionId(),
    type: 'drawStock',
    playerId: state.currentPlayer,
    card: packCard(drawnCards[drawnCards.length - 1]),
    count: drawnCards.length,
    bossExtraCards: bossExtraCards.map(packCard),
    bossEvent: financedEvent,
    bossVaultEvent: vaultInterestEvent,
    recycledDeadIndex: recycledIndex,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  resetTurnTimer();
  await commitState();
  if (!state.partialDraw && !financedEvent && !vaultInterestEvent) showMessage('✅ Compra realizada.');
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

function discardChoiceIsCurrent() {
  return (
    !!pendingDiscardChoice &&
    !state.finished &&
    !state.hasDrawnThisTurn &&
    state.currentPlayer === myPlayerIndex &&
    pendingDiscardChoice.turn === state.turnNumber &&
    pendingDiscardChoice.topId === state.discard.at(-1)?.id &&
    pendingDiscardChoice.selection === JSON.stringify([...selectedHandIndexes].sort((a, b) => a - b).map((i) => currentPlayer().hand[i]?.id))
  );
}

async function animateLocalDiscardPickup(presentation, origin, handOrigins = {}) {
  const session = window.gameSessionId;
  const hidden = [];
  const pausedPulses = [];
  const conceal = (el) => {
    if (!el) return null;
    const rect = getRect(el);
    hidden.push([el, el.style.visibility]);
    for (const animation of el.getAnimations?.({ subtree: true }) || []) {
      if (animation.id === 'nemesis-grab-entry' && animation.playState === 'running') {
        animation.pause(); pausedPulses.push(animation);
      }
    }
    el.style.visibility = 'hidden';
    return rect;
  };
  discardPickupAnimating = true;
  try {
    await animateDiscardTransfer({
      ...presentation,
      fromDiscard: origin,
      fromHand: (card) => handOrigins[card.id] || opponentAnchorRect(myPlayerIndex),
      toHand: (card) => conceal(cardElById(card.id)),
      toMeld: (card) => {
        const meld = state.teams.find((t) => t.id === presentation.teamId)?.melds[presentation.meldIndex];
        const index = meld?.findIndex((c) => c.id === card.id);
        const root = meldElByKey(`${presentation.teamId}:${presentation.meldIndex}`);
        return conceal(root?.querySelector(`[data-card-index="${index}"]`)) || meldDropRect(`${presentation.teamId}:${presentation.meldIndex}`);
      },
      fly: flyRectToRect,
      isActive: () => session === window.gameSessionId && !window.isClosingGame,
    });
  } finally {
    hidden.forEach(([el, visibility]) => {
      el.style.visibility = visibility;
    });
    if (session === window.gameSessionId && !window.isClosingGame) pausedPulses.forEach(animation => animation.play());
    discardPickupAnimating = false;
  }
}

async function chooseDiscardDestination(teamId, meldIndex = null) {
  if (!discardChoiceIsCurrent() || !canPerformCommonGameAction(state) || pendingDiscardChoice.teamId !== teamId) return false;
  if (meldIndex === null ? !pendingDiscardChoice.canCreateNew : !pendingDiscardChoice.indexes.includes(meldIndex)) {
    showMessage('Escolha um dos jogos destacados para receber a carta do lixo.');
    return false;
  }
  selectedMeldTarget = meldIndex === null ? null : `${teamId}:${meldIndex}`;
  await drawFromDiscard({ forceNew: meldIndex === null });
  return true;
}

async function drawFromDiscard(options = {}) {
  if (state?.hasDrawnThisTurn) return discardSelectedCard();
  return localActionGate.run(() => drawFromDiscardOnce(options));
}
async function drawFromDiscardOnce(options = {}) {
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn && isBossVaultDrawRequired(state, state.currentPlayer)) {
    showMessage('Cofre: resgate obrigatório. Monte e lixo estão bloqueados neste turno.');
    return;
  }
  if (!state.hasDrawnThisTurn && isDominationDiscardDecreeActive(state, state.currentPlayer)) {
    showMessage('👑 Monte Obrigatório: o Dominador bloqueou o Lixo neste turno. Compre do Monte.');
    return;
  }
  if (!state.hasDrawnThisTurn && isBossDiscardBlocked(state)) {
    const currentPlayerId = state.players?.[state.currentPlayer]?.id ?? state.currentPlayer;
    const topDiscardId = state.discard?.at?.(-1)?.id || null;
    const hawkSeal =
      state.boss?.id === 'nehelenia' &&
      (state.boss.effects?.some((effect) => effect.id === 'nehelenia_discard_lock' && effect.playerId === currentPlayerId) ||
        (topDiscardId && state.boss.effects?.some((effect) => effect.id === 'nehelenia_hawk_guarded_discard' && effect.cardId === topDiscardId)));
    showMessage(hawkSeal ? "👁 Hawk's Eye está vigiando o topo do lixo. Enquanto essa carta estiver ali, ninguém pode recolhê-lo." : '🔒 Bloqueio de Crédito: o lixo está indisponível nesta cobrança.');
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
  if (state.variant === 'fechado' || isCurrentBossMode()) {
    const indexes = Array.from(selectedHandIndexes).sort((a, b) => b - a);
    const selectedCards = indexes.map((i) => ({ ...hand[i] }));
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

    if (options.forceNew) {
      targetIndexes = [];
    } else if (selectedMeldTarget) {
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

    const canCreateNew = !selectedMeldTarget && selectedCards.length >= 2 && isValidSequenceMeld([...selectedCards, top]) && canBossCreateMeld(state, me.id);
    if (!selectedMeldTarget && !options.forceNew && validExtensions.length + Number(canCreateNew) > 1) {
      pendingDiscardChoice = { topId: top.id, turn: state.turnNumber, teamId: team.id, indexes: validExtensions, canCreateNew, selection: JSON.stringify([...selectedHandIndexes].sort((a, b) => a - b).map((i) => hand[i]?.id)) };
      renderMelds();
      showMessage('Escolha o jogo destacado que receberá a carta do lixo.' + (canCreateNew ? ' Ou clique no fundo da sua mesa para criar um novo jogo.' : ''));
      return;
    }
    if (validExtensions.length > 0) {
      extendedMeldIndex = validExtensions[0];
    }
    // 2. Se não encaixou na mesa, tenta formar um NOVO JOGO
    else if (!selectedMeldTarget && selectedCards.length >= 2 && isValidSequenceMeld([...selectedCards, top])) {
      if (!canBossCreateMeld(state, me.id)) {
        showMessage(bossCreateMeldDeniedMessage(me.id));
        return;
      }
      isNewMeld = true;
    } else {
      showMessage('🔒 FECHADO: Selecione na mão as cartas que justificam a compra do lixo!');
      return;
    }

    const pickupQuote = isCurrentBossMode() ? quoteBossDiscardPickup(state, me.id, {
      meldIndex: isNewMeld ? null : extendedMeldIndex, handCardIds: selectedCards.map(card => card.id),
    }) : { allowed: true, count: state.discard.length };
    if (!pickupQuote.allowed) { showMessage(pickupQuote.message); return; }
    const retainedDiscard = state.discard.slice(state.discard.length - pickupQuote.count, -1);
    const bossMeldValidation = validateBossMeldPlay(state, me.id, selectedCards, retainedDiscard);
    if (!bossMeldValidation.allowed) {
      showMessage(bossMeldValidation.message);
      return;
    }

    // 🛡️ TRAVA DA MATEMÁTICA: O cálculo exato que você descreveu
    const futureHandSize = hand.length - selectedCards.length + (pickupQuote.count - 1);
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

    if (pickupQuote.message) showMessage(pickupQuote.message);
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
    pendingDiscardChoice = null;
    const discardOriginEl = document.querySelector('#drawDiscardBtn .pile-card');
    const discardOrigin = discardOriginEl ? getRect(discardOriginEl) : null;
    const handOrigins = Object.fromEntries(selectedCards.map((card) => [card.id, cardElById(card.id) ? getRect(cardElById(card.id)) : null]));
    const pile = state.discard.splice(state.discard.length - pickupQuote.count, pickupQuote.count);
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
    const discardPresentation = { cards: pile.map(packCard), topCard: packCard(topCard), meldCards: finalMeldCards.map(packCard), teamId: team.id, meldIndex: isNewMeld ? team.melds.length - 1 : extendedMeldIndex };
    state.hasDrawnThisTurn = true;
    state.partialDraw = false;
    selectedHandIndexes.clear();
    selectedMeldTarget = null;
    renderAll();
    await animateLocalDiscardPickup(discardPresentation, discardOrigin, handOrigins);
    const bossExtraCards = await drawBossTurnExtras(me);
    if (state.finished) return;
    const vaultInterestEvent = deferBossVault(state, me.id);

    state.hasDrawnThisTurn = true;
    state.partialDraw = false;

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
    notifyBossPurchaseCompleted(state, me.id);
    if (state.finished) return;

    const friendDraw = domReward?.friendBonus ? playDominationFriendSharedDraw(domReward.friendBonus) : Promise.resolve();
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
    await friendDraw;

    const tookDead = domReward?.tookDead || (await checkPostMeldStatus(me));
    if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

    state.lastAction = {
      id: newActionId(),
      type: 'drawDiscardFechado',
      playerId: state.currentPlayer,
      discardPresentation,
      tookDead: tookDead,
      drawnCards: domReward?.drawnCards,
      friendBonus: domReward?.friendBonus || null,
      bossExtraCards: bossExtraCards.map(packCard),
      bossFinanceEvent: surchargeEvent,
      bossEvent,
      bossVaultEvent: vaultInterestEvent,
      ts: Date.now(),
    };
    ignoreOwnActionId = state.lastAction.id;

    renderAll();
    resetTurnTimer();
    await commitState();
    if (vaultInterestEvent) showMessage(vaultInterestEvent.outcome);
    return;
  }

  // =========================================================
  // LÓGICA: BURACO ABERTO
  // =========================================================
  const pickupDecision = confirmBossDiscardPickup(me.id);
  if (!pickupDecision.allowed) return;
  saveStateForUndo('drawDiscard');
  pendingDiscardChoice = null;
  const discardOriginEl = document.querySelector('#drawDiscardBtn .pile-card');
  const discardOrigin = discardOriginEl ? getRect(discardOriginEl) : null;
  const surchargeEvent = pickupDecision.surcharge ? consumeBossDiscardSurcharge(state, me.id) : null;
  const pile = state.discard.splice(0, state.discard.length);
  pile.forEach(ensureCardId);

  me.hand.push(...pile);
  notifyBossDiscardTaken(state, me.id, pile);
  sortHand(me.hand);
  state.hasDrawnThisTurn = true;
  state.partialDraw = false;
  state.hasDrawnThisTurn = true;
  state.partialDraw = false;
  selectedHandIndexes.clear();
  selectedMeldTarget = null;
  renderAll();
  await animateLocalDiscardPickup({ cards: pile }, discardOrigin);
  const bossExtraCards = await drawBossTurnExtras(me);
  if (state.finished) return;
  const vaultInterestEvent = deferBossVault(state, me.id);

  notifyBossPurchaseCompleted(state, me.id);

  if (!state.boughtCardIds) state.boughtCardIds = [];
  pile.forEach((c) => state.boughtCardIds.push(c.id));

  state.hasDrawnThisTurn = true;
  state.partialDraw = false;

  state.pickedDiscardCardId = top.id;
  state.requiredDiscardCard = null;
  selectedHandIndexes.clear();

  // renderAll already refreshes the hand. Avoid rendering the full hand twice
  // after a discard pickup, which is the exact moment it is usually largest.
  renderAll();

  state.lastAction = {
    id: newActionId(),
    type: 'drawDiscard',
    playerId: state.currentPlayer,
    card: packCard(top),
    count: pile.length,
    discardPresentation: { cards: pile.map(packCard) },
    bossExtraCards: bossExtraCards.map(packCard),
    bossFinanceEvent: surchargeEvent,
    bossVaultEvent: vaultInterestEvent,
    ts: Date.now(),
  };
  ignoreOwnActionId = state.lastAction.id;

  resetTurnTimer();
  await commitState();
  if (!state.partialDraw) showMessage(vaultInterestEvent?.outcome || '✅ Lixo recolhido.');
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
  grantDominationFriendExtraTurn(state, p.id, oldKind, newKind, meldIndex);
  if (!dominationFeatureEnabled(state, 'plus')) return null;
  if (oldKind === newKind) return null;
  if (meldIndex === undefined || meldIndex === null || meldIndex < 0) return null;

  // Tabela de valores exatos das compras
  const rewards = { simple: 0, suja: 0, limpa: 1, real: 1, asas: 1 };

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
      packed._silentAsAsBonus = newKind === 'asas';

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
        packed._silentAsAsBonus = newKind === 'asas';

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

  const friendBonus = grantDominationFriendSharedBonus(state, p.id, newKind, cardsToDraw, meldIndex);
  return { tookDead, drawnCards: drawnCards.length > 0 ? drawnCards : null, friendBonus };
}

async function checkPostMeldStatus(player) {
  if (player.hand.length > 0) return null;
  const teamId = player.teamId;

  // Se a última carta acabou de ir para a mesa, a mão precisa aparecer vazia
  // durante o voo do Morto. O Morto só entra visualmente depois da animação.
  if (state.players?.[myPlayerIndex]?.id === player.id) renderHand();

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
      showMessage(bossUseMeldDeniedMessage(currentPlayer().id, forcedIndex));
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

    const friendDraw = domReward?.friendBonus ? playDominationFriendSharedDraw(domReward.friendBonus) : Promise.resolve();
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
    await friendDraw;

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
      friendBonus: domReward?.friendBonus || null,
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

  const friendDraw = domReward?.friendBonus ? playDominationFriendSharedDraw(domReward.friendBonus) : Promise.resolve();
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
  await friendDraw;

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
    friendBonus: domReward?.friendBonus || null,
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

    const friendDraw = domReward?.friendBonus ? playDominationFriendSharedDraw(domReward.friendBonus) : Promise.resolve();
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
    await friendDraw;

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
      friendBonus: domReward?.friendBonus || null,
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
  return localActionGate.run(discardSelectedCardOnce);
}
async function discardSelectedCardOnce() {
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
  if (actualIndex === -1 || !ensureMyTurn() || !state.hasDrawnThisTurn) return;
  if (actualIndex !== -1) {
    hand.splice(actualIndex, 1);
  }
  state.discard.push(card);

  // The next card inherits the removed card's index. Clear selection before
  // any render/await, not only when our Firebase snapshot comes back.
  selectedHandIndexes.clear();
  selectedMeldTarget = null;

  // A carta já saiu da mão. Atualiza o DOM antes de qualquer animação do Morto,
  // para ela não reaparecer enquanto o Morto está voando.
  renderHand();

  let tookDead = null;
  if (p.hand.length === 0) tookDead = takeDeadIfAvailableForPlayer(p);

  if (p.hand.length === 0 && !canTeamTakeDeadNow(p.teamId)) {
    await finishGame(p.teamId);
    return;
  }

  if (tookDead) await animateDeadToHandLocal(tookDead.deadIndex);

  if (stockIsExhausted(state)) {
    await finishGame(null);
    return;
  }
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

function computeScores(gameState = state) {
  const results = [];
  gameState.teams.forEach((team) => {
    const players = gameState.players.filter((p) => p.teamId === team.id);
    let handPenalty = 0;
    players.forEach((p) => p.hand.forEach((c) => (handPenalty += cardBasePoints(c))));
    const meldInfo = computeTeamMeldScore(team);

    const mortosPegos = gameState.deadChunksTaken?.[team.id] ?? 0;
    const penaltyMorto = mortosPegos === 0 ? 100 : 0;
    const bonusBatida = gameState.winnerTeamId === team.id ? 100 : 0;

    const finalScore = meldInfo.total - handPenalty - penaltyMorto + bonusBatida;
    results.push({ team, players, score: finalScore, handPenalty, penaltyMorto, bonusBatida, ...meldInfo });
  });
  return results;
}

async function prepareMatchHistory(transaction, gameState) {
  if (gameState.finished) gameState.matchFinishedAt ||= gameState.lastAction?.ts || Date.now();
  const summary = gameState.finished ? buildMatchSummary(gameId, gameState, computeScores(gameState)) : null;
  return prepareHistoryWrites(transaction, { db, doc, gameRef, summary, uid: activeAccount?.uid });
}

let historyRecoveryPromise = null;
function recoverFinishedHistory() {
  if (historyRecoveryPromise) return historyRecoveryPromise;
  historyRecoveryPromise = (async () => {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      const data = snap.data();
      if (!data?.stateJson || data.historySummary) return;
      const finished = JSON.parse(data.stateJson);
      if (!finished.finished) return;
      finished.matchFinishedAt ||= finished.lastAction?.ts || Date.now();
      const save = await prepareMatchHistory(transaction, finished);
      save();
    });
  })().finally(() => {
    historyRecoveryPromise = null;
  });
  return historyRecoveryPromise;
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

function renderBossHudRichText(element, value) {
  if (!element) return;
  const text = String(value ?? '');
  const pattern = /(10|[2-9AJQK])([♠♦♣♥])/g;
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    const token = document.createElement('span');
    token.className = `boss-card-ref ${match[2] === '♥' || match[2] === '♦' ? 'suit-red' : 'suit-dark'}`;
    token.setAttribute('aria-label', `${match[1]} ${match[2]}`);
    token.textContent = `${match[1]}${match[2]}`;
    fragment.appendChild(token);
    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
  element.replaceChildren(fragment);
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

function renderBossRangeMeters(anchor, meters = []) {
  if (!anchor?.parentElement) return;
  const insertionAnchor = anchor.closest?.('.boss-intent-instruction-row') || anchor;
  let panel = document.getElementById('bossRangeMeters');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'bossRangeMeters';
    panel.className = 'boss-range-meters';
    insertionAnchor.insertAdjacentElement('afterend', panel);
  } else if (panel.previousElementSibling !== insertionAnchor) {
    insertionAnchor.insertAdjacentElement('afterend', panel);
  }

  panel.replaceChildren();
  if (!Array.isArray(meters) || !meters.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  meters.forEach((meter) => {
    const value = Math.max(0, Number(meter.value) || 0);
    const maximum = Math.max(1, Number(meter.max) || value || 1);
    const percent = Math.max(0, Math.min(100, (value / maximum) * 100));
    const row = document.createElement('div');
    row.className = `boss-range-meter tone-${meter.tone || 'neutral'}`;

    const header = document.createElement('div');
    header.className = 'boss-range-meter-head';
    const name = document.createElement('strong');
    name.textContent = meter.label || 'Faixa atual';
    const current = document.createElement('span');
    current.textContent = `${value} ${meter.unit || ''}${meter.currentEffect ? ` · ${meter.currentEffect}` : ''}`.trim();
    header.append(name, current);

    const track = document.createElement('div');
    track.className = 'boss-range-meter-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(maximum));
    track.setAttribute('aria-valuenow', String(value));
    track.setAttribute('aria-label', meter.ariaLabel || `${meter.label || 'Faixa'}: ${value} ${meter.unit || ''}${meter.currentEffect ? `, ${meter.currentEffect}` : ''}`);

    const segments = document.createElement('div');
    segments.className = 'boss-range-meter-segments';
    (meter.segments || []).forEach((segment) => {
      const segmentEl = document.createElement('span');
      const from = Math.max(0, Number(segment.from) || 0);
      const finiteTo = segment.to == null ? maximum : Math.max(from, Number(segment.to) || from);
      const weight = Math.max(1, Math.min(maximum, finiteTo) - Math.min(maximum, from) + 1);
      segmentEl.className = `boss-range-meter-segment tone-${segment.tone || 'neutral'}`;
      segmentEl.style.flexGrow = String(weight);
      segments.appendChild(segmentEl);
    });

    const fill = document.createElement('i');
    fill.className = 'boss-range-meter-fill';
    fill.style.width = `${percent}%`;
    track.append(segments, fill);

    if (Array.isArray(meter.markers) && meter.markers.length) {
      meter.markers.forEach((marker, markerIndex) => {
        const markerValue = Math.max(0, Number(marker.value) || 0);
        const markerPercent = Math.max(0, Math.min(100, (markerValue / maximum) * 100));
        const markerEl = document.createElement('b');
        markerEl.className = `boss-range-meter-marker tone-${marker.tone || 'neutral'} marker-${markerIndex % 2}`;
        markerEl.style.left = `${markerPercent}%`;
        markerEl.title = `${marker.label || 'Jogador'}: ${markerValue}`;
        markerEl.setAttribute('aria-hidden', 'true');
        track.appendChild(markerEl);
      });
    } else {
      const pointer = document.createElement('b');
      pointer.className = 'boss-range-meter-pointer';
      pointer.style.left = `${percent}%`;
      track.appendChild(pointer);
    }

    const legend = document.createElement('div');
    legend.className = 'boss-range-meter-legend';
    (meter.segments || []).forEach((segment) => {
      const item = document.createElement('span');
      item.className = `tone-${segment.tone || 'neutral'}`;
      const range = document.createElement('b');
      const effect = document.createElement('small');
      range.textContent = segment.label || '';
      effect.textContent = segment.effect || '';
      item.append(range, effect);
      legend.appendChild(item);
    });

    row.append(header, track, legend);
    panel.appendChild(row);
  });
}

const BOSS_GUIDE_CORE = Object.freeze({
  banker: '100 de Dívida = derrota. Limpa, Real e Ás-a-Ás reduzem a Dívida.',
  dominadora: 'Cada jogador tem uma barra de Dominação 0–50. Em 37,5 fica Sob Controle; em 50 fica Dominado. Os dois em 50 = derrota.',
  matriarca_esmeralda: '5 Flores = derrota. Na Fase 3, pode renascer 1 vez gastando 1 Flor.',
  dimitrescu: '100 de Sede = derrota. Limpa/Real/Ás-a-Ás reduzem a Sede em 4/8/12.',
  nehelenia: 'Mundo do Espelho 100/100 = derrota. Os 5 Espelhos enchem gradualmente; Limpa/Real/Ás-a-Ás reduzem 4/8/12.',
});

const BOSS_GUIDE_OVERRIDES = Object.freeze({
  // Banqueiro — visão rápida; a regra completa fica no HUD/ajuda da habilidade.
  fixed_interest: 'Pague tudo ou use o Cofre. Adiar o resgate aumenta os juros.',
  maintenance_fee: 'Cartas FINANCIADAS precisam entrar em jogo no turno. Se não, viram Dívida.',
  credit_block: 'Lixo bloqueado nesta rodada.',
  suit_audit: 'Baixe o naipe exigido antes da rodada acabar. Falha = Dívida.',
  pledge: 'Um jogo fica penhorado e não recebe cartas até a próxima cobrança.',
  compound_interest: 'Quanto mais cartas nas mãos da equipe, maior a cobrança.',
  credit_limit: 'Use cartas da mão dentro da franquia. Excedentes viram Dívida.',
  discard_surcharge: 'A primeira retirada do Lixo cobra Ágio. Comprar do Monte evita.',

  // Dominadora — texto de jogo curto; detalhes e exceções ficam no ?.
  collar: 'Prende até 2 cartas úteis do alvo neste turno.',
  forced_choice: 'Aceite a ordem ou sofra Dominação.',
  exposure: 'Use a carta exposta neste turno.',
  forced_swap: 'Troca 1 carta útil entre os cooperadores.',
  hands_tied: 'Cada jogador fica preso ao primeiro jogo que tocar.',
  possession: 'O dano do jogo fica suspenso até romper a Posse.',
  iron_etiquette: 'Termine o turno descartando o naipe ordenado.',
  favorite: 'Uma é poupada; a menos dominada recebe a punição.',
  double_collar: 'Prende 1 carta útil de cada jogador.',
  separation: 'Um jogo alimentado fica exclusivo daquele jogador na rodada.',
  absolute_control: 'O alvo fica Dominado por 1 turno.',
  break_will: 'Escolha entre Dominação ou curar a Dominadora.',
  final_order: 'Aceite a Ordem às cegas ou sofra Dominação.',

  // Matriarca Esmeralda.
  living_seed: 'Use a carta marcada antes do prazo. Falha = +1 Flor.',
  hungry_root: 'Alimente o jogo marcado. Falha = +1 Flor e pode criar nova Raiz.',
  restorative_dew: 'Baixe cartas novas para reduzir a cura. Com 6+, a cura zera.',
  twin_vines: 'Alimente todos os jogos marcados. Uma ou duas falhas: +1 Flor no total.',
  graft: 'Alimente os 2 jogos ligados. Falha parcial ou total: +1 Flor.',
  discard_pollen: 'Não recolha a carta contaminada do Lixo. Se pegar: +1 Flor e cura.',
  harvest: 'Termine o turno com até 7 cartas. Mãos maiores fortalecem a Matriarca.',
  royal_bloom: 'Vários objetivos ao mesmo tempo. Falhas desta ativação: máximo +1 Flor.',
  emerald_cocoon: '180 de proteção. Canastra Limpa+ rompe; o restante pode virar cura.',
  spring_crown: 'A Coroa marca uma ameaça. Se ela falhar, nasce uma Raiz Fortalecida.',
  rebirth: 'Fase 3: ao cair a 0 HP, gasta 1 Flor e volta com 300 HP. Uma vez.',

  // Lady Dimitrescu.
  bela_hunt: 'Use a carta caçada no turno. Sucesso evita punição; falha aumenta Sede.',
  blood_tithe: 'Mãos grandes pagam Sede no fim da rodada. Mais cartas = mais tributo.',
  red_wine: 'Lady troca Sede por HP quando está ferida.',
  crimson_brand: 'Use as cartas marcadas em jogos. Cumprir evita punição; falhar aumenta Sede.',
  cassandra_feast: 'Alimente o jogo marcado nesta rodada. Cumprir evita punição; falhar aumenta Sede.',
  cassandra_dead_feast: 'O próximo Morto alimenta e cura Lady. Real/Ás-a-Ás enfraquece a maldição.',
  daniela_swarm: 'Não pegue o Lixo contaminado. Evitar não altera Sede; pegar aumenta.',
  crimson_clot: 'Dano vai primeiro ao Coágulo. Romper evita a cura; sobrar vira cura.',
  castle_lockdown: 'Lixo fechado por 1 rodada. Só o Monte fica disponível.',
  three_daughters: 'Três objetivos simultâneos. Sucesso evita punição; cada falha aumenta Sede.',

  // Rainha Nehelenia.
  mirrored_meld: 'Use 1 carta e escolha o jogo verdadeiro. Errar = +18 no Mundo do Espelho e Desorientado.',
  follow_reflection: 'O 1º define a quantidade; o 2º precisa igualar. Falha = +16 no Mundo do Espelho.',
  discard_mirror: 'Escolha entre 2 reflexos do Lixo. Errar = +16 no Mundo do Espelho e sela o Lixo.',
  mirror_prison: 'Liberte o parceiro alimentando o jogo indicado. Sucesso: sem penalidade. Falha: +8/+10/+12 no Mundo do Espelho.',
  eternal_nightmare: 'Memorize a original e siga-a no embaralhamento. Errar = +24 no Mundo do Espelho.',
  tiger_link: 'Alimente os 2 jogos ligados. Falha = +12 no Mundo do Espelho e garras persistentes.',
  tiger_prey: 'O alvo deve alimentar o jogo marcado antes dos outros jogos existentes.',
  hawk_suit: 'Descarte o naipe exigido. Errar faz Hawk vigiar o topo do Lixo.',
  hawk_watch: 'O alvo não pode alimentar o jogo marcado neste turno.',
  fish_marked_card: 'Use ou descarte a carta marcada. Falha transforma em Reflexo Morto.',
  fish_inverted: 'Alimente um jogo existente antes de abrir um novo. Persiste até cumprir.',
});

function bossAbilityGuideDescription(definition, ability, phase) {
  if (BOSS_GUIDE_OVERRIDES[ability.id]) return BOSS_GUIDE_OVERRIDES[ability.id];
  if (typeof ability.describe !== 'function') return '';
  const previewPhase = ability.phases?.includes(phase) ? phase : Math.max(...(ability.phases || [phase || 1]));
  try {
    return ability.describe({
      phase: previewPhase,
      suitLabel: 'um naipe sorteado',
      targetCount: 2,
      markedThreatName: 'uma ameaça natural',
    });
  } catch {
    return '';
  }
}

function renderBossAbilityGuide(definition, boss) {
  const root = document.getElementById('bossAbilityGuide');
  if (!root || !definition || !boss) return;

  const currentAbilityId = boss.currentIntent?.abilityId || '';
  const signature = `${definition.id}:${boss.phase}:${currentAbilityId}`;
  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;
  root.replaceChildren();

  const intro = document.createElement('section');
  intro.className = 'boss-ability-overview';
  const title = document.createElement('strong');
  title.textContent = `Como ${definition.name} funciona`;
  const rule = document.createElement('span');
  rule.textContent = BOSS_GUIDE_CORE[definition.id] || 'O chefe alterna habilidades conforme a fase atual.';
  intro.append(title, rule);
  root.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'boss-ability-grid';

  (definition.abilities || []).forEach((ability) => {
    const availableNow = ability.phases?.includes(boss.phase);
    const activeNow = currentAbilityId === ability.id;
    const card = document.createElement('article');
    card.className = `boss-ability-card${availableNow ? ' is-current-phase' : ''}${activeNow ? ' is-active' : ''}`;

    const header = document.createElement('header');
    const name = document.createElement('strong');
    name.textContent = ability.name;
    const phases = document.createElement('span');
    phases.className = 'boss-ability-phases';
    phases.textContent = (ability.phases || []).map((value) => `F${value}`).join(' · ');
    header.append(name, phases);

    const description = document.createElement('p');
    description.textContent = bossAbilityGuideDescription(definition, ability, boss.phase);
    card.append(header, description);

    if (activeNow) {
      const badge = document.createElement('b');
      badge.className = 'boss-ability-active-badge';
      badge.textContent = 'ATIVA AGORA';
      card.appendChild(badge);
    }
    grid.appendChild(card);
  });

  root.appendChild(grid);
}

function bossArtSpotlightModel(definition, boss) {
  const flow = boss?.bossFlow;
  // O spotlight grande fica reservado apenas para mudança de fase.
  // Habilidades normais já são apresentadas no HUD/balão e não devem
  // interromper a mesa com um overlay de retrato a cada rodada.
  if (!definition || !boss || !flow || flow.stage !== 'phase') return null;

  const phase = Math.max(1, Number(boss.phase) || 1);
  const bossPortrait = definition.phasePortraits?.[phase] || definition.portrait || '';
  return {
    key: `${flow.id}:phase:${phase}`,
    kicker: `FASE ${phase}`,
    title: definition.name || 'Chefe da Mesa',
    subtitle: getBossPhaseName(state),
    artworks: bossPortrait ? [{ id: definition.id, name: definition.name || 'Chefe da Mesa', portrait: bossPortrait }] : [],
  };
}

function showBossArtSpotlight(model) {
  if (!model?.artworks?.length) return;
  document.getElementById('bossArtSpotlight')?.remove();
  if (bossArtSpotlightTimer) clearTimeout(bossArtSpotlightTimer);

  const overlay = document.createElement('div');
  overlay.id = 'bossArtSpotlight';
  overlay.className = 'boss-art-spotlight';
  overlay.dataset.count = String(Math.min(3, model.artworks.length));
  overlay.dataset.layout = model.layout || 'boss';
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('span');
  backdrop.className = 'boss-art-spotlight-backdrop';

  const stage = document.createElement('div');
  stage.className = 'boss-art-spotlight-stage';

  const gallery = document.createElement('div');
  gallery.className = 'boss-art-spotlight-gallery';

  model.artworks.slice(0, 3).forEach((artwork) => {
    const frame = document.createElement('figure');
    frame.className = 'boss-art-spotlight-frame';
    frame.dataset.artId = artwork.id || '';

    const glow = document.createElement('span');
    glow.className = 'boss-art-spotlight-blur';
    glow.style.backgroundImage = `url("${artwork.portrait}")`;

    const image = document.createElement('img');
    image.src = artwork.portrait;
    image.alt = '';
    image.decoding = 'async';
    image.addEventListener('error', () => frame.classList.add('is-missing-art'), { once: true });

    const caption = document.createElement('figcaption');
    caption.textContent = artwork.name || model.title;
    frame.append(glow, image, caption);
    gallery.appendChild(frame);
  });

  const copy = document.createElement('div');
  copy.className = 'boss-art-spotlight-copy';
  const title = document.createElement('strong');
  title.textContent = model.title;
  const subtitle = document.createElement('b');
  subtitle.textContent = model.subtitle || '';
  if (model.kicker) {
    const kicker = document.createElement('span');
    kicker.textContent = model.kicker;
    copy.appendChild(kicker);
  }
  copy.append(title, subtitle);

  stage.append(gallery, copy);
  overlay.append(backdrop, stage);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('is-visible'));
  bossArtSpotlightTimer = setTimeout(() => {
    bossArtSpotlightTimer = null;
    overlay.classList.add('is-leaving');
    setTimeout(() => overlay.remove(), 260);
  }, 1450);
}

function syncBossArtSpotlight(definition, boss) {
  const model = bossArtSpotlightModel(definition, boss);
  if (!model) return;
  if (model.key === bossArtSpotlightKey) return;
  bossArtSpotlightKey = model.key;
  showBossArtSpotlight(model);
}

function renderBossDaughterStrip(definition, boss) {
  const strip = document.getElementById('bossDaughterStrip');
  if (!strip) return;
  const isDimitrescu = definition?.id === 'dimitrescu';
  const isNehelenia = definition?.id === 'nehelenia';
  if (!isDimitrescu && !isNehelenia) {
    strip.hidden = true;
    strip.replaceChildren();
    strip.dataset.signature = '';
    return;
  }

  const resultEvent = boss.bossFlow?.stage === 'result' && boss.bossFlow?.eventActionId ? boss.eventLog?.find((entry) => entry.actionId === boss.bossFlow.eventActionId) || null : null;
  const abilityId = boss.currentIntent?.abilityId || resultEvent?.abilityId || '';
  const roster = isDimitrescu ? definition.daughters : definition.attendants;
  const abilityMap = isDimitrescu ? definition.abilityDaughters : definition.abilityAttendants;
  const activeIds = new Set(abilityMap?.[abilityId] || []);

  if (isDimitrescu) {
    if (resultEvent?.daughter === 'all') ['bela', 'cassandra', 'daniela'].forEach((id) => activeIds.add(id));
    else if (resultEvent?.daughter) activeIds.add(resultEvent.daughter);
  } else {
    if (resultEvent?.attendant) activeIds.add(resultEvent.attendant);
    // Efeitos persistentes permitem que os capangas se sobreponham e formem combos.
    (boss.effects || []).forEach((effect) => {
      if (effect?.attendant && roster?.[effect.attendant]) activeIds.add(effect.attendant);
    });
  }

  const neheleniaPlayerName = (playerId) => {
    if (playerId == null) return '';
    return state?.players?.find((player) => player.id === playerId)?.name || `Jogador ${Number(playerId) + 1}`;
  };

  const neheleniaIntentContext = (memberId) => {
    if (!isNehelenia) return null;
    const intent = boss.currentIntent;
    if (!intent || !abilityMap?.[intent.abilityId]?.includes(memberId)) return null;
    const payload = intent.payload || {};
    const targetName = neheleniaPlayerName(payload.targetPlayerId);
    if (intent.abilityId === 'tiger_prey') return { targetName, detail: Number.isInteger(payload.meldIndex) ? `JOGO ${payload.meldIndex + 1}` : 'PRESA MARCADA' };
    if (intent.abilityId === 'tiger_link') {
      const games = (payload.targets || []).map((target) => (Number.isInteger(target?.meldIndex) ? target.meldIndex + 1 : null)).filter(Boolean);
      return { targetName: '', detail: games.length ? `JOGOS ${games.join(' + ')}` : '2 JOGOS LIGADOS' };
    }
    if (intent.abilityId === 'hawk_suit') return { targetName, detail: payload.suitLabel ? `DESCARTE: ${String(payload.suitLabel).toUpperCase()}` : 'DESCARTE MARCADO' };
    if (intent.abilityId === 'hawk_watch') return { targetName, detail: Number.isInteger(payload.meldIndex) ? `JOGO ${payload.meldIndex + 1}` : 'JOGO VIGIADO' };
    if (intent.abilityId === 'fish_marked_card') return { targetName, detail: 'CARTA MARCADA' };
    if (intent.abilityId === 'fish_inverted') return { targetName, detail: 'ALIMENTE JOGO ABERTO' };
    return targetName ? { targetName, detail: '' } : null;
  };

  const neheleniaPersistentContexts = (memberId) => {
    if (!isNehelenia) return [];
    return (boss.effects || [])
      .filter((effect) => effect?.attendant === memberId)
      .map((effect) => {
        const targetName = neheleniaPlayerName(effect.playerId);
        if (effect.id === 'nehelenia_tiger_prey') return { targetName, detail: Number.isInteger(effect.meldIndex) ? `JOGO ${effect.meldIndex + 1}` : 'PRESA MARCADA', persistent: true };
        if (effect.id === 'nehelenia_tiger_claw') return { targetName: '', detail: Number.isInteger(effect.meldIndex) ? `GARRAS: JOGO ${effect.meldIndex + 1}` : 'GARRAS NO JOGO', persistent: true };
        if (effect.id === 'nehelenia_hawk_guarded_discard') return { targetName, detail: 'LIXO VIGIADO', persistent: true };
        if (effect.id === 'nehelenia_fish_dead_card') return { targetName, detail: 'REFLEXO MORTO', persistent: true };
        if (effect.id === 'nehelenia_inverted_reflection') return { targetName, detail: 'JOGO ABERTO', persistent: true };
        return targetName ? { targetName, detail: '', persistent: true } : null;
      })
      .filter(Boolean);
  };

  const neheleniaAttendantContext = (memberId) => {
    if (!isNehelenia) return { lines: [], signature: '' };
    const current = neheleniaIntentContext(memberId);
    const persistent = neheleniaPersistentContexts(memberId);
    const lines = [];

    if (current) {
      const currentParts = [];
      if (current.targetName) currentParts.push(current.targetName);
      if (current.detail) currentParts.push(current.detail.replace(/^JOGO\s+/i, 'J').replace(/^DESCARTE:\s*/i, ''));
      if (currentParts.length) lines.push({ text: currentParts.join(' · '), kind: 'current' });
    }

    const persistentLabels = persistent.map((entry) => {
      const sameAsCurrent = !!current && current.targetName === entry.targetName && current.detail === entry.detail;
      const parts = [];
      if (entry.targetName) parts.push(entry.targetName);
      if (entry.detail) parts.push(entry.detail.replace(/^JOGO\s+/i, 'J'));
      return {
        sameAsCurrent,
        text: parts.join(' · ') || 'ATIVO',
      };
    });

    const sameCurrent = persistentLabels.find((entry) => entry.sameAsCurrent);
    const otherPersistent = persistentLabels.find((entry) => !entry.sameAsCurrent);
    if (sameCurrent) lines.push({ text: 'PERSISTENTE', kind: 'persistent' });
    else if (otherPersistent) lines.push({ text: `PERSISTENTE · ${otherPersistent.text}`, kind: 'persistent' });

    const compact = lines.slice(0, 2);
    return {
      lines: compact,
      signature: compact.map((line) => `${line.kind}:${line.text}`).join('|'),
    };
  };

  const statusFor = (memberId) => {
    const intent = boss.currentIntent;
    if (isDimitrescu) {
      if (intent?.abilityId === 'three_daughters') {
        const objective = intent.payload?.objectives?.find((entry) => entry.type === memberId);
        if (objective) return objective.status || 'active';
      }
      if (intent && abilityMap?.[intent.abilityId]?.includes(memberId)) return 'active';
      if (resultEvent?.abilityId === 'three_daughters') {
        return resultEvent.objectives?.find((entry) => entry.type === memberId)?.status || 'active';
      }
      if (resultEvent?.type === 'bloodiedDead' && memberId === 'cassandra') return resultEvent.purified ? 'success' : 'failed';
      if (resultEvent?.daughter === memberId) return resultEvent.success === false ? 'failed' : resultEvent.success === true ? 'success' : 'active';
      return 'active';
    }
    if (intent && abilityMap?.[intent.abilityId]?.includes(memberId)) return 'active';
    if ((boss.effects || []).some((effect) => effect?.attendant === memberId)) return 'active';
    if (resultEvent && abilityMap?.[resultEvent.abilityId]?.includes(memberId)) {
      return resultEvent.success === false ? 'failed' : resultEvent.success === true ? 'success' : 'active';
    }
    return 'idle';
  };

  // Dimitrescu e Nehelenia usam o mesmo comportamento de palco:
  // sem participante ativo, a faixa some e não ocupa espaço; quando a habilidade
  // chama alguém, renderiza somente o(s) participante(s) daquela habilidade.
  const rosterOrder = Object.keys(roster || {});
  const memberList = [...activeIds].sort((a, b) => rosterOrder.indexOf(a) - rosterOrder.indexOf(b));
  const contextByMember = new Map(memberList.map((id) => [id, neheleniaAttendantContext(id)]));
  const signature = `${definition.id}:${abilityId}:${memberList.map((id) => `${id}:${statusFor(id)}:${contextByMember.get(id)?.signature || ''}`).join(',')}`;
  if (strip.dataset.signature === signature) {
    strip.hidden = memberList.length === 0;
    return;
  }
  strip.dataset.signature = signature;
  strip.replaceChildren();
  if (!memberList.length) {
    strip.hidden = true;
    return;
  }

  strip.setAttribute('aria-label', isDimitrescu ? 'Filhas de Lady Dimitrescu' : 'Capangas de Rainha Nehelenia');
  const stateLabels = { idle: 'AGUARDANDO', active: 'ATIVO', success: 'CONCLUÍDO', failed: 'FALHOU', consumed: 'CONCLUÍDO' };
  memberList.forEach((memberId) => {
    const member = roster?.[memberId];
    if (!member) return;
    const status = statusFor(memberId);
    const card = document.createElement('span');
    card.className = `boss-daughter-card is-${status}${isNehelenia ? ' boss-nehelenia-attendant-card' : ''}`;
    if (isDimitrescu) card.dataset.daughter = memberId;
    else card.dataset.attendant = memberId;
    card.dataset.status = status;
    card.title = member.name;

    const image = document.createElement('img');
    image.src = member.portrait;
    image.alt = '';
    image.addEventListener(
      'error',
      () => {
        card.classList.add('is-missing-art');
        image.remove();
      },
      { once: true },
    );

    const name = document.createElement('b');
    name.textContent = member.name;
    const stateBadge = document.createElement('small');
    stateBadge.className = 'boss-daughter-state';
    stateBadge.textContent = stateLabels[status] || 'ATIVO';
    card.append(image, name, stateBadge);

    if (isNehelenia) {
      const context = contextByMember.get(memberId);
      if (context?.lines?.length) {
        const contextBox = document.createElement('span');
        contextBox.className = 'boss-attendant-context';
        // CRÍTICO: apresentação 100% fora do fluxo. Mesmo se o CSS estiver
        // desatualizado, esta label nunca pode alterar altura/alinhamento do card.
        contextBox.style.cssText = ['position:absolute', 'right:7px', 'top:25px', 'z-index:5', 'max-width:86px', 'display:flex', 'flex-direction:column', 'align-items:flex-end', 'gap:2px', 'pointer-events:none'].join(';');
        context.lines.forEach((line) => {
          line.text
            .split(/\s*·\s*/)
            .filter(Boolean)
            .forEach((part) => {
              const badge = document.createElement('small');
              badge.className = `boss-attendant-context-line is-${line.kind}`;
              badge.textContent = part;
              const persistent = line.kind === 'persistent';
              badge.style.cssText = [
                'max-width:86px',
                'box-sizing:border-box',
                'padding:2px 5px',
                'overflow:hidden',
                `border:1px solid ${persistent ? 'rgba(196,181,253,.72)' : 'rgba(255,255,255,.55)'}`,
                'border-radius:999px',
                `color:${persistent ? '#ede9fe' : '#fff'}`,
                `background:${persistent ? 'rgba(46,16,101,.90)' : 'rgba(4,7,18,.90)'}`,
                'box-shadow:0 2px 7px rgba(0,0,0,.45)',
                'font-size:5px',
                'font-weight:1000',
                'line-height:1',
                'letter-spacing:.15px',
                'text-overflow:ellipsis',
                'text-transform:uppercase',
                'white-space:nowrap',
              ].join(';');
              contextBox.appendChild(badge);
            });
        });
        card.appendChild(contextBox);
        card.title = `${member.name} — ${context.lines.map((line) => line.text).join(' · ')}`;
      }
    }
    strip.appendChild(card);
  });
  strip.hidden = strip.childElementCount === 0;
}

function bossFlowHostIndex() {
  const humanIndex = state?.players?.findIndex((player) => player && !player.name?.toUpperCase().includes('BOT')) ?? -1;
  return humanIndex >= 0 ? humanIndex : myPlayerIndex;
}

function scheduleBossTurnAdvance() {
  const flow = state?.boss?.bossFlow;
  const heldDebugResult = state?.debugScenario?.active && state.debugScenario.heldResultActionId;
  const active = !heldDebugResult && !pauseBlocksPlay(state) && isCurrentBossMode() && isBossTurnActive(state) && flow && !hasPendingBossChoices(state);
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
    if (state.boss?.result && !state.finished) {
      await finishGame(state.boss.result.victory ? 0 : 1, { skipFinalStrike: true });
      return;
    }
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
  if (!ensureMyTurn() || state.hasDrawnThisTurn || !getBossVault(state, myPlayerIndex)) return null;
  const slot = document.getElementById('bossLocalVaultSlot');
  const fromRect = slot ? getRect(slot) : null;
  const vault = getBossVault(state, myPlayerIndex);
  const event = reclaimBossVault(state, myPlayerIndex);
  if (!event || !vault?.card) return null;
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
  showMessage(event.outcome);
  return event;
}

function renderBossVaultSlot(root, player, isLocal = false) {
  if (!root) return;
  if (!player) {
    root.style.display = 'none';
    root.innerHTML = '';
    delete root._vaultMarkup;
    delete root.dataset.playerId;
    delete root.dataset.vaultState;
    root.onclick = null;
    return;
  }
  root.dataset.playerId = String(player.id);
  const vault = getBossVault(state, player.id);
  if (!vault) {
    root.style.display = 'none';
    root.innerHTML = '';
    delete root._vaultMarkup;
    delete root.dataset.vaultState;
    root.onclick = null;
    return;
  }
  const cardFace = isLocal ? cardFrontHTML(vault.card) : '<span class="boss-vault-hidden">?</span>';
  const quote = getBossVaultQuote(state, player.id);
  const localAnimationState = locallyAnimatingBossVaultStates.get(player.id) || '';
  const vaultReceiving = localAnimationState === 'receiving';
  const vaultClosing = localAnimationState === 'closing';
  const vaultOpening = localAnimationState === 'opening';
  const reclaimAvailable = quote?.state === 'open' && state.currentPlayer === player.id && !state.hasDrawnThisTurn && !hasPendingBossChoices(state) && !isBossTurnActive(state);
  const reclaimRequired = reclaimAvailable && !!quote?.forced;
  root.style.display = 'grid';
  root.classList.toggle('boss-vault-required', reclaimRequired);
  root.classList.toggle('boss-vault-available', reclaimAvailable);
  root.classList.toggle('boss-vault-appearing', vaultReceiving);
  root.classList.toggle('boss-vault-locking', vaultReceiving);
  root.classList.toggle('boss-vault-closing', vaultClosing);
  root.classList.toggle('boss-vault-opening', vaultOpening);
  root.dataset.vaultState = vaultReceiving ? 'receiving' : vaultClosing ? 'closing' : vaultOpening ? 'opening' : quote?.state === 'open' ? 'open' : 'closed';
  const frameSrc = vaultReceiving || quote?.state === 'open' ? 'assets/images/boss-vault-open.png' : 'assets/images/boss-vault-frame.png';
  const interestStep = quote?.interestStep || 1;
  const status = vaultReceiving
    ? 'RECEBENDO GARANTIA...'
    : vaultClosing
      ? 'GARANTIA PROTEGIDA'
      : vaultOpening
        ? 'ABRINDO COFRE...'
        : reclaimRequired
          ? `RESGATE OBRIGATÓRIO · +${quote?.totalDebt || 0} DÍVIDA · SUBSTITUI A COMPRA`
          : reclaimAvailable
            ? `RESGATAR +${quote?.currentDebt || 0} · OU COMPRAR NORMAL (+${interestStep} NO COFRE)`
            : quote?.state === 'open'
              ? `ABERTO · RESGATE +${quote?.currentDebt || 0} NO PRÓXIMO TURNO`
              : 'ABRE NO PRÓXIMO TURNO DO TITULAR';
  const vaultMarkup = `<div class="boss-vault-visual"><div class="boss-vault-card carta mini ${isLocal ? `${suitClass(vault.card)} ${deckFaceClass(vault.card)}` : `back back-${vault.card.back === 'blue' ? 'blue' : 'red'} boss-vault-card-back`}">${cardFace}</div><img class="boss-vault-frame" src="${frameSrc}" alt="" aria-hidden="true"></div><div class="boss-vault-copy"><span class="boss-vault-kicker">GARANTIA NO COFRE</span><small>${player.name} · base +${quote?.baseDebt || 0} · +${interestStep} por turno adiado · atual +${quote?.currentDebt || 0}</small><strong>${status}</strong></div>`;
  if (root._vaultMarkup !== vaultMarkup) {
    root.innerHTML = vaultMarkup;
    root._vaultMarkup = vaultMarkup;
  }
  root.onclick = isLocal && reclaimAvailable ? reclaimLocalBossVault : null;
}

function snapshotVisibleCardRects() {
  const rects = new Map();
  document.querySelectorAll('[data-card-id]').forEach((element) => {
    const cardId = element.dataset.cardId;
    if (!cardId || rects.has(cardId)) return;
    const rect = getRect(element);
    if (rect.width > 0 && rect.height > 0) rects.set(cardId, rect);
  });
  return rects;
}

function bossVaultSlotForPlayer(playerId) {
  return [...document.querySelectorAll('.boss-vault-slot')].find((slot) => String(slot.dataset.playerId) === String(playerId)) || null;
}

function waitForVisualDuration(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function animateBossVaultOpen(event, { playSound = true } = {}) {
  const playerId = event?.playerId;
  const player = state.players?.find((entry) => entry.id === playerId);
  let slot = bossVaultSlotForPlayer(playerId);
  if (!event?.actionId || !player || !slot) {
    if (playSound) playSfxClone(BOSS_SFX.banker.vaultOpen, { audioContext: audioCtx });
    return;
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const isLocal = playerId === myPlayerIndex;
  locallyAnimatingBossVaultStates.set(playerId, 'opening');
  renderBossVaultSlot(slot, player, isLocal);
  if (playSound) playSfxClone(BOSS_SFX.banker.vaultOpen, { audioContext: audioCtx });

  try {
    if (!reducedMotion) await waitForVisualDuration(1300);
  } finally {
    locallyAnimatingBossVaultStates.delete(playerId);
    slot = bossVaultSlotForPlayer(playerId);
    if (slot) renderBossVaultSlot(slot, player, isLocal);
  }
}

async function animateBossVaultLock(event, card, fromRect) {
  const eventId = event?.actionId;
  const playerId = event?.collateralPlayerId;
  const player = state.players?.find((entry) => entry.id === playerId);
  let slot = bossVaultSlotForPlayer(playerId);
  if (!eventId || !card || !slot) {
    locallyAnimatingBossVaultStates.delete(playerId);
    playSfxClone(BOSS_SFX.banker.vaultClose, { audioContext: audioCtx });
    return;
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const isLocal = playerId === myPlayerIndex;
  locallyAnimatingBossVaultStates.set(playerId, 'receiving');
  renderBossVaultSlot(slot, player, isLocal);
  slot = bossVaultSlotForPlayer(playerId);
  const storedCard = slot?.querySelector('.boss-vault-card');
  const targetRect = storedCard ? getRect(storedCard) : getRect(slot);
  if (storedCard) storedCard.style.visibility = 'hidden';

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (fromRect && !reducedMotion) await flyRectToRect(card, fromRect, targetRect, 'front');

    locallyAnimatingBossVaultStates.set(playerId, 'closing');
    slot = bossVaultSlotForPlayer(playerId);
    renderBossVaultSlot(slot, player, isLocal);
    playSfxClone(BOSS_SFX.banker.vaultClose, { audioContext: audioCtx });
    if (!reducedMotion) await waitForVisualDuration(900);
  } finally {
    locallyAnimatingBossVaultStates.delete(playerId);
    slot = bossVaultSlotForPlayer(playerId);
    if (slot) renderBossVaultSlot(slot, player, isLocal);
  }
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

let matriarchRebirthVisualSequence = 0;
let matriarchRebirthStartTimer = null;
let matriarchRebirthEndTimer = null;
let activeMatriarchRebirthEventId = '';
let bossDeathVisualSequence = 0;
let bossDeathResultTimer = null;

function clearBossPortraitTerminalVisuals({ invalidateRebirth = true } = {}) {
  const portrait = document.querySelector('#bossHud .boss-portrait');
  if (invalidateRebirth) {
    matriarchRebirthVisualSequence += 1;
    activeMatriarchRebirthEventId = '';
  }
  bossDeathVisualSequence += 1;

  if (matriarchRebirthStartTimer) {
    clearTimeout(matriarchRebirthStartTimer);
    matriarchRebirthStartTimer = null;
  }
  if (matriarchRebirthEndTimer) {
    clearTimeout(matriarchRebirthEndTimer);
    matriarchRebirthEndTimer = null;
  }
  if (bossDeathResultTimer) {
    clearTimeout(bossDeathResultTimer);
    bossDeathResultTimer = null;
  }
  if (!portrait) return;
  portrait.classList.remove('boss-rebirth-burst', 'boss-death-fade');
  portrait.querySelector('.boss-rebirth-ring')?.remove();
}

function bossHasActiveRebirthVisual(boss) {
  if (!activeMatriarchRebirthEventId || boss?.id !== 'matriarca_esmeralda' || boss?.rebirthUsed !== true) return false;
  return (boss.eventLog || []).some((event) => event?.type === 'rebirth' && event.actionId === activeMatriarchRebirthEventId);
}

function triggerMatriarchRebirthVisual(eventActionId = '') {
  const portrait = document.querySelector('#bossHud .boss-portrait');
  if (!portrait || document.body.dataset.bossId !== 'matriarca_esmeralda') return;

  clearBossPortraitTerminalVisuals();
  const sequence = matriarchRebirthVisualSequence;
  activeMatriarchRebirthEventId = eventActionId || `local_rebirth_${sequence}`;
  void portrait.offsetWidth;

  // Primeiro ela realmente "morre": a cor some e o retrato fica cinza.
  portrait.classList.add('boss-death-fade');

  // Só depois do silêncio visual começa o Renascimento.
  matriarchRebirthStartTimer = setTimeout(() => {
    matriarchRebirthStartTimer = null;
    if (sequence !== matriarchRebirthVisualSequence || !portrait.isConnected) return;

    portrait.classList.remove('boss-death-fade');
    void portrait.offsetWidth;

    const ring = document.createElement('span');
    ring.className = 'boss-rebirth-ring';
    ring.setAttribute('aria-hidden', 'true');
    portrait.appendChild(ring);
    portrait.classList.add('boss-rebirth-burst');

    // O áudio entra junto do estouro verde, não durante a "morte".
    playSfxClone(BOSS_SFX.matriarca_esmeralda.rebirth, { audioContext: audioCtx });
  }, 1800);

  matriarchRebirthEndTimer = setTimeout(() => {
    matriarchRebirthEndTimer = null;
    if (sequence !== matriarchRebirthVisualSequence || !portrait.isConnected) return;
    portrait.classList.remove('boss-rebirth-burst', 'boss-death-fade');
    portrait.querySelector('.boss-rebirth-ring')?.remove();
    activeMatriarchRebirthEventId = '';
  }, 4400);
}

function setBossPortrait(image, definition, boss = null) {
  if (!image || !definition) return;
  const frame = image.closest('.boss-portrait');
  const fallbackSource = definition.portrait || 'assets/images/boss-banqueiro.png';
  const phase = Math.max(1, Number(boss?.phase) || 1);
  const source = definition.phasePortraits?.[phase] || fallbackSource;
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
    if (source !== fallbackSource) {
      image.dataset.portraitSource = fallbackSource;
      image.src = fallbackSource;
      return;
    }
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

const NEHELENIA_VISUAL_TIMING = Object.freeze({
  nightmareOriginalHold: 1450,
  nightmareCloneBirth: 1350,
  nightmareSettle: 650,
  nightmareShuffle: 3000,
  discardMirrorReveal: 1050,
  discardMirrorReturn: 1050,
  discardMirrorSealDrop: 1350,
  mirroredMeldMarkHold: 1400,
  mirroredMeldCloneBirth: 1000,
  mirroredMeldSplit: 1700,
  mirroredMeldSettle: 220,
});

const locallyAnimatedNeheleniaMirrorMelds = new Set();
const locallyAnimatingNeheleniaMirrorMelds = new Set();

function neheleniaChoiceCardFromLabel(label) {
  const text = String(label || '').trim();
  const suit = ['♠', '♦', '♣', '♥'].find((entry) => text.endsWith(entry));
  const rank = suit ? text.slice(0, -1) : text;
  const card = { rank: rank || 'A', suit: suit || '♠' };
  return `<i class="carta mini ${suitClass(card)} ${deckFaceClass(card)}" aria-hidden="true">${cardFrontHTML(card)}</i>`;
}

function clearNeheleniaChoiceStageTimers(actions) {
  const timers = actions?._neheleniaChoiceTimers || [];
  timers.forEach((timer) => clearTimeout(timer));
  const animations = actions?._neheleniaChoiceAnimations || [];
  animations.forEach((animation) => {
    try {
      animation.cancel();
    } catch (_) {}
  });
  if (actions) {
    actions._neheleniaChoiceTimers = [];
    actions._neheleniaChoiceAnimations = [];
  }
}

function neheleniaShuffleSeed(value) {
  return String(value ?? 'nehelenia')
    .split('')
    .reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 5381);
}

function renderNeheleniaChoiceStage(actions, choice) {
  if (!actions || !choice) return false;
  if (!['discard_mirror', 'eternal_nightmare'].includes(choice.type)) return false;
  if (actions.dataset.neheleniaChoiceId === String(choice.id) && actions.querySelector('.nehelenia-choice-stage')) return true;

  clearNeheleniaChoiceStageTimers(actions);
  actions.dataset.neheleniaChoiceId = String(choice.id);
  actions.classList.add('nehelenia-choice-stage-host');

  const options = [...(choice.options || [])];
  const labels = options.map((option) => choice.optionLabels?.[option] || '');
  const buttons = options
    .map(
      (option, index) => `
    <button type="button" class="nehelenia-shell-option" data-boss-choice="${option}" data-shell-index="${index}" disabled>
      <span class="nehelenia-shell-frame">
        <span class="nehelenia-shell-glass"></span>
        ${neheleniaChoiceCardFromLabel(labels[index] || labels[0])}
      </span>
      <span class="nehelenia-shell-label">REFLEXO ${index + 1}</span>
    </button>
  `,
    )
    .join('');

  if (choice.type === 'discard_mirror') {
    actions.innerHTML = `
      <div class="nehelenia-choice-stage is-discard-mirror">
        <div class="nehelenia-choice-stage-title">ESPELHO DO LIXO</div>
        <div class="nehelenia-choice-stage-subtitle">Dois reflexos idênticos. Nenhuma pista. Escolha um.</div>
        <div class="nehelenia-discard-mirror-pair">${buttons}</div>
        <div class="nehelenia-choice-stage-foot">50% de chance · erro sela o lixo nesta rodada</div>
      </div>
    `;
    const unlock = setTimeout(() => {
      if (actions.dataset.neheleniaChoiceId !== String(choice.id)) return;
      actions.querySelectorAll('.nehelenia-shell-option').forEach((button) => {
        button.disabled = false;
      });
      actions.querySelector('.nehelenia-choice-stage')?.classList.add('is-ready');
    }, NEHELENIA_VISUAL_TIMING.discardMirrorReveal + 90);
    actions._neheleniaChoiceTimers = [unlock];
    return true;
  }

  actions.innerHTML = `
    <div class="nehelenia-choice-stage is-eternal-nightmare">
      <div class="nehelenia-choice-stage-title">PESADELO ETERNO</div>
      <div class="nehelenia-choice-stage-subtitle">Observe a ORIGINAL. Depois dela nascem dois reflexos; só então os três serão embaralhados.</div>
      <div class="nehelenia-shell-arena">${buttons}</div>
      <div class="nehelenia-choice-stage-foot">Acompanhe a carta verdadeira até o fim do embaralhamento</div>
    </div>
  `;

  const tokens = [...actions.querySelectorAll('.nehelenia-shell-option')];
  const correctToken = tokens.find((button) => button.dataset.bossChoice === choice.correctOption) || tokens[0];
  const fakeTokens = tokens.filter((button) => button !== correctToken);
  correctToken?.classList.add('is-origin');
  fakeTokens.forEach((button) => {
    button.classList.add('is-clone-pending');
    button.style.opacity = '0';
    button.style.transform = 'translate(calc(-50% + 0px), 0) scale(.72)';
    button.style.filter = 'blur(8px) brightness(1.45)';
  });

  const arena = actions.querySelector('.nehelenia-shell-arena');
  const revealTimer = setTimeout(() => {
    if (actions.dataset.neheleniaChoiceId !== String(choice.id) || !arena?.isConnected || !correctToken) return;
    const spread = Math.max(92, Math.min(158, (arena.clientWidth || 420) * 0.28));
    const leftFake = fakeTokens[0] || tokens[0];
    const rightFake = fakeTokens[1] || tokens[tokens.length - 1];
    const birthTargets = new Map([
      [leftFake, -spread],
      [correctToken, 0],
      [rightFake, spread],
    ]);
    const birthAnimations = [];

    fakeTokens.forEach((button) => {
      const targetX = birthTargets.get(button) || 0;
      const animation = button.animate(
        [
          { transform: 'translate(calc(-50% + 0px), 0) scale(.72)', opacity: 0, filter: 'blur(9px) brightness(1.65)' },
          { transform: `translate(calc(-50% + ${targetX * 0.36}px), -5px) scale(.88)`, opacity: 0.62, filter: 'blur(4px) brightness(1.38)', offset: 0.42 },
          { transform: `translate(calc(-50% + ${targetX}px), 0) scale(1)`, opacity: 1, filter: 'blur(0) brightness(1)' },
        ],
        {
          duration: NEHELENIA_VISUAL_TIMING.nightmareCloneBirth,
          easing: 'cubic-bezier(.18,.78,.18,1)',
          fill: 'forwards',
        },
      );
      birthAnimations.push(animation);
    });
    const originAnimation = correctToken.animate(
      [
        { transform: 'translate(calc(-50% + 0px), 0) scale(1)', filter: 'brightness(1.18)' },
        { transform: 'translate(calc(-50% + 0px), -3px) scale(1.035)', filter: 'brightness(1.32)', offset: 0.48 },
        { transform: 'translate(calc(-50% + 0px), 0) scale(1)', filter: 'brightness(1)' },
      ],
      {
        duration: NEHELENIA_VISUAL_TIMING.nightmareCloneBirth,
        easing: 'ease-in-out',
        fill: 'forwards',
      },
    );
    birthAnimations.push(originAnimation);
    actions._neheleniaChoiceAnimations.push(...birthAnimations);

    const shuffleTimer = setTimeout(() => {
      if (actions.dataset.neheleniaChoiceId !== String(choice.id) || !arena?.isConnected) return;
      fakeTokens.forEach((button) => button.classList.remove('is-clone-pending'));
      correctToken.classList.remove('is-origin');
      tokens.forEach((button) => button.classList.add('is-shuffling'));

      const identityOrder = [leftFake, correctToken, rightFake];
      const seed = neheleniaShuffleSeed(choice.id);
      const finaleVariants = [
        [identityOrder[2], identityOrder[0], identityOrder[1]],
        [identityOrder[1], identityOrder[2], identityOrder[0]],
        [identityOrder[0], identityOrder[2], identityOrder[1]],
        [identityOrder[2], identityOrder[1], identityOrder[0]],
      ];
      const orders = [
        identityOrder,
        [identityOrder[1], identityOrder[2], identityOrder[0]],
        [identityOrder[2], identityOrder[0], identityOrder[1]],
        [identityOrder[1], identityOrder[0], identityOrder[2]],
        [identityOrder[0], identityOrder[2], identityOrder[1]],
        [identityOrder[2], identityOrder[1], identityOrder[0]],
        finaleVariants[seed % finaleVariants.length],
      ];
      const lanes = [-spread, 0, spread];
      const finalXs = new Map();
      const shuffleAnimations = [];

      tokens.forEach((button, tokenIndex) => {
        const keyframes = orders.map((order, step) => {
          const laneIndex = Math.max(0, order.indexOf(button));
          const x = lanes[laneIndex];
          const last = step === orders.length - 1;
          if (last) finalXs.set(button, x);
          const y = last ? 0 : step % 2 === tokenIndex % 2 ? -9 : 8;
          const scale = last ? 1 : step % 2 ? 0.985 : 1.018;
          return {
            transform: `translate(calc(-50% + ${x}px), ${y}px) scale(${scale})`,
            opacity: 1,
            filter: `brightness(${last ? 1 : step % 2 ? 0.95 : 1.08})`,
            offset: step / (orders.length - 1),
          };
        });
        const animation = button.animate(keyframes, {
          duration: NEHELENIA_VISUAL_TIMING.nightmareShuffle,
          easing: 'cubic-bezier(.42,.05,.18,1)',
          fill: 'forwards',
        });
        shuffleAnimations.push(animation);
      });
      actions._neheleniaChoiceAnimations.push(...shuffleAnimations);

      const unlockTimer = setTimeout(() => {
        if (actions.dataset.neheleniaChoiceId !== String(choice.id)) return;
        tokens.forEach((button) => {
          const finalX = finalXs.get(button) || 0;
          button.style.transform = `translate(calc(-50% + ${finalX}px), 0) scale(1)`;
          button.style.opacity = '1';
          button.style.filter = '';
          button.classList.remove('is-shuffling');
          button.disabled = false;
        });
        actions.querySelector('.nehelenia-choice-stage')?.classList.add('is-ready');
      }, NEHELENIA_VISUAL_TIMING.nightmareShuffle + 90);
      actions._neheleniaChoiceTimers.push(unlockTimer);
    }, NEHELENIA_VISUAL_TIMING.nightmareCloneBirth + NEHELENIA_VISUAL_TIMING.nightmareSettle);
    actions._neheleniaChoiceTimers.push(shuffleTimer);
  }, NEHELENIA_VISUAL_TIMING.nightmareOriginalHold);
  actions._neheleniaChoiceTimers = [revealTimer];
  return true;
}

async function animateNeheleniaDiscardMirrorReturn(button, { trap = false } = {}) {
  const stage = button?.closest('.nehelenia-choice-stage.is-discard-mirror');
  const sourceCard = button?.querySelector('.carta.mini');
  const sourceMirror = button?.querySelector('.nehelenia-shell-frame');
  const discardButton = document.getElementById('drawDiscardBtn');
  const discardTarget = document.querySelector('#drawDiscardBtn .pile-card') || discardButton;
  if (!stage || !sourceCard || !discardTarget) return;

  stage.classList.add('is-resolving');
  stage.querySelectorAll('.nehelenia-shell-option').forEach((entry) => {
    entry.disabled = true;
  });
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reducedMotion) {
    if (trap) discardButton?.classList.add('boss-nehelenia-seal-preview');
    await waitForVisualDuration(80);
    return;
  }

  const fromRect = getRect(sourceCard);
  const toRect = getRect(discardTarget);
  if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) {
    if (trap) discardButton?.classList.add('boss-nehelenia-seal-preview');
    await waitForVisualDuration(220);
    return;
  }

  const cardGhost = sourceCard.cloneNode(true);
  cardGhost.classList.add('nehelenia-discard-flight-card');
  cardGhost.removeAttribute('id');
  cardGhost.setAttribute('aria-hidden', 'true');
  cardGhost.style.setProperty('position', 'fixed', 'important');
  cardGhost.style.setProperty('left', `${fromRect.left}px`, 'important');
  cardGhost.style.setProperty('top', `${fromRect.top}px`, 'important');
  cardGhost.style.setProperty('width', `${fromRect.width}px`, 'important');
  cardGhost.style.setProperty('height', `${fromRect.height}px`, 'important');
  cardGhost.style.setProperty('margin', '0', 'important');
  cardGhost.style.setProperty('z-index', '10080', 'important');
  cardGhost.style.setProperty('pointer-events', 'none', 'important');
  cardGhost.style.setProperty('transform-origin', 'center center', 'important');
  document.body.appendChild(cardGhost);
  sourceCard.style.opacity = '0';

  let mirrorGhost = null;
  let mirrorFlight = null;
  if (trap && sourceMirror) {
    const mirrorRect = getRect(sourceMirror);
    if (mirrorRect.width && mirrorRect.height) {
      mirrorGhost = sourceMirror.cloneNode(true);
      mirrorGhost.querySelector('.carta.mini')?.remove();
      mirrorGhost.classList.add('nehelenia-discard-flight-mirror');
      mirrorGhost.setAttribute('aria-hidden', 'true');
      mirrorGhost.style.setProperty('position', 'fixed', 'important');
      mirrorGhost.style.setProperty('left', `${mirrorRect.left}px`, 'important');
      mirrorGhost.style.setProperty('top', `${mirrorRect.top}px`, 'important');
      mirrorGhost.style.setProperty('width', `${mirrorRect.width}px`, 'important');
      mirrorGhost.style.setProperty('height', `${mirrorRect.height}px`, 'important');
      mirrorGhost.style.setProperty('margin', '0', 'important');
      mirrorGhost.style.setProperty('z-index', '10079', 'important');
      mirrorGhost.style.setProperty('pointer-events', 'none', 'important');
      mirrorGhost.style.setProperty('transform-origin', 'center center', 'important');
      document.body.appendChild(mirrorGhost);

      const mirrorDx = toRect.left + toRect.width / 2 - (mirrorRect.left + mirrorRect.width / 2);
      const mirrorDy = toRect.top + toRect.height / 2 - (mirrorRect.top + mirrorRect.height / 2);
      // A moldura PNG é mais alta que a antiga moldura CSS. O voo termina
      // no mesmo tamanho visual do selo que permanece no lixo, evitando
      // encolher e depois "pular" de tamanho quando a animação termina.
      const targetWidth = toRect.width * 1.42;
      const targetHeight = targetWidth * (1671 / 941);
      const mirrorScale = Math.max(0.72, Math.min(1.35, Math.min(targetWidth / mirrorRect.width, targetHeight / mirrorRect.height)));
      mirrorFlight = mirrorGhost.animate(
        [
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'brightness(1.12) drop-shadow(0 0 16px rgba(196,181,253,.5))' },
          { transform: `translate3d(${mirrorDx * 0.08}px,-14px,0) scale(.99)`, opacity: 1, filter: 'brightness(1.28) drop-shadow(0 0 22px rgba(196,181,253,.72))', offset: 0.28 },
          { transform: `translate3d(${mirrorDx * 0.66}px,${mirrorDy * 0.58}px,0) scale(${Math.max(mirrorScale, 0.84)})`, opacity: 0.98, filter: 'brightness(1.06) drop-shadow(0 0 14px rgba(167,139,250,.6))', offset: 0.72 },
          { transform: `translate3d(${mirrorDx}px,${mirrorDy}px,0) scale(${mirrorScale})`, opacity: 0.96, filter: 'brightness(.94) drop-shadow(0 0 11px rgba(124,58,237,.5))' },
        ],
        {
          duration: NEHELENIA_VISUAL_TIMING.discardMirrorSealDrop,
          easing: 'cubic-bezier(.2,.7,.16,1)',
          fill: 'forwards',
        },
      );
    }
  }

  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
  const endScale = Math.max(0.5, Math.min(1, Math.min(toRect.width / fromRect.width, toRect.height / fromRect.height)));
  const cardFlight = cardGhost.animate(
    [
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, filter: 'brightness(1.18) drop-shadow(0 0 10px rgba(196,181,253,.55))' },
      { transform: `translate3d(${dx * 0.08}px,-38px,0) scale(1.08)`, opacity: 1, filter: 'brightness(1.35) drop-shadow(0 0 20px rgba(196,181,253,.75))', offset: 0.22 },
      { transform: `translate3d(${dx * 0.62}px,${dy * 0.56 - 18}px,0) scale(${Math.max(endScale, 0.82)})`, opacity: 0.96, filter: 'brightness(1.08) drop-shadow(0 0 13px rgba(167,139,250,.58))', offset: 0.66 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(${endScale})`, opacity: 0.12, filter: 'brightness(.95) drop-shadow(0 0 5px rgba(167,139,250,.35))' },
    ],
    {
      duration: NEHELENIA_VISUAL_TIMING.discardMirrorReturn,
      easing: 'cubic-bezier(.24,.72,.18,1)',
      fill: 'forwards',
    },
  );

  const flights = [cardFlight.finished];
  if (mirrorFlight) flights.push(mirrorFlight.finished);
  await Promise.allSettled(flights);
  if (trap) discardButton?.classList.add('boss-nehelenia-seal-preview');
  cardGhost.remove();
  mirrorGhost?.remove();
}
function neheleniaMirrorMeldAnimationKey(intent, teamId, meldIndex) {
  const visualEpoch = state?.debugScenario?.preparedAt || state?.boss?.seed || 'match';
  return `${String(visualEpoch)}:${String(intent?.id ?? 'mirror')}:${String(teamId)}:${String(meldIndex)}`;
}

function setNeheleniaGhostRect(ghost, rect) {
  ghost.style.setProperty('position', 'fixed', 'important');
  ghost.style.setProperty('left', `${rect.left}px`, 'important');
  ghost.style.setProperty('top', `${rect.top}px`, 'important');
  ghost.style.setProperty('width', `${rect.width}px`, 'important');
  ghost.style.setProperty('min-width', `${rect.width}px`, 'important');
  ghost.style.setProperty('max-width', `${rect.width}px`, 'important');
  ghost.style.setProperty('height', `${rect.height}px`, 'important');
  ghost.style.setProperty('margin', '0', 'important');
  ghost.style.setProperty('z-index', '10065', 'important');
  ghost.style.setProperty('pointer-events', 'none', 'important');
  ghost.style.setProperty('transform-origin', 'top left', 'important');
}

function animateNeheleniaMeldGhostToRect(ghost, fromRect, toRect) {
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;
  return ghost.animate(
    [
      { transform: 'translate3d(0,0,0)', filter: 'blur(0) brightness(1.12)', opacity: 1 },
      { transform: `translate3d(${dx * 0.24}px,${dy * 0.18 - 3}px,0)`, filter: 'blur(.35px) brightness(1.22)', opacity: 1, offset: 0.28 },
      { transform: `translate3d(${dx * 0.68}px,${dy * 0.62 + 2}px,0)`, filter: 'blur(0) brightness(1.07)', opacity: 1, offset: 0.68 },
      { transform: `translate3d(${dx}px,${dy}px,0)`, filter: 'blur(0) brightness(1)', opacity: 1 },
    ],
    {
      duration: NEHELENIA_VISUAL_TIMING.mirroredMeldSplit,
      easing: 'cubic-bezier(.2,.72,.18,1)',
      fill: 'forwards',
    },
  );
}

function scheduleNeheleniaMirroredMeldSplit(intent, teamId, meldIndex) {
  if (!intent || intent.abilityId !== 'mirrored_meld') return;
  const animationKey = neheleniaMirrorMeldAnimationKey(intent, teamId, meldIndex);
  if (locallyAnimatedNeheleniaMirrorMelds.has(animationKey) || locallyAnimatingNeheleniaMirrorMelds.has(animationKey)) return;
  locallyAnimatingNeheleniaMirrorMelds.add(animationKey);

  requestAnimationFrame(async () => {
    let firstGhost = null;
    let secondGhost = null;
    let sourceCards = null;
    try {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (reducedMotion) {
        locallyAnimatedNeheleniaMirrorMelds.add(animationKey);
        renderMelds();
        return;
      }

      await waitForVisualDuration(NEHELENIA_VISUAL_TIMING.mirroredMeldMarkHold);
      const liveIntent = state?.boss?.id === 'nehelenia' ? state.boss.currentIntent : null;
      if (!liveIntent || liveIntent.abilityId !== 'mirrored_meld' || String(liveIntent.id) !== String(intent.id) || liveIntent.payload?.resolved) return;
      const source = document.querySelector(`[data-meld-key="${teamId}:${meldIndex}"]`);
      sourceCards = source?.querySelector('.meld-line-cards');
      if (!sourceCards?.isConnected) return;
      const sourceRect = getRect(sourceCards);
      if (!sourceRect.width || !sourceRect.height) return;

      // A animação deve mover SOMENTE as cartas. "Canastra / Limpa" e o
      // contêiner do jogo não participam da clonagem e, portanto, não sobem.
      firstGhost = sourceCards.cloneNode(true);
      secondGhost = sourceCards.cloneNode(true);
      for (const ghost of [firstGhost, secondGhost]) {
        ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        ghost.classList.add('nehelenia-mirror-split-ghost');
        ghost.classList.remove('nehelenia-mirror-split-pending');
        setNeheleniaGhostRect(ghost, sourceRect);
      }
      firstGhost.dataset.neheleniaMirror = 'REFLEXO I';
      secondGhost.dataset.neheleniaMirror = 'REFLEXO II';
      secondGhost.style.opacity = '0';
      document.body.append(firstGhost, secondGhost);
      sourceCards.style.visibility = 'hidden';

      const birth = secondGhost.animate(
        [
          { opacity: 0, transform: 'translate3d(0,0,0)', filter: 'blur(9px) brightness(1.8)' },
          { opacity: 0.58, transform: 'translate3d(3px,-2px,0)', filter: 'blur(4px) brightness(1.5)', offset: 0.48 },
          { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0) brightness(1.12)' },
        ],
        {
          duration: NEHELENIA_VISUAL_TIMING.mirroredMeldCloneBirth,
          easing: 'cubic-bezier(.16,.84,.22,1)',
          fill: 'forwards',
        },
      );
      const sourcePulse = firstGhost.animate([{ filter: 'brightness(1.05)' }, { filter: 'brightness(1.42) drop-shadow(0 0 20px rgba(196,181,253,.55))', offset: 0.52 }, { filter: 'brightness(1.12)' }], {
        duration: NEHELENIA_VISUAL_TIMING.mirroredMeldCloneBirth,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      await Promise.allSettled([birth.finished, sourcePulse.finished]);

      const stillLiveIntent = state?.boss?.id === 'nehelenia' ? state.boss.currentIntent : null;
      if (!stillLiveIntent || stillLiveIntent.abilityId !== 'mirrored_meld' || String(stillLiveIntent.id) !== String(intent.id) || stillLiveIntent.payload?.resolved) return;
      locallyAnimatedNeheleniaMirrorMelds.add(animationKey);
      renderMelds();

      const finalLeftMeld = document.querySelector(`[data-nehelenia-mirror-slot="left"][data-nehelenia-clone-for="${teamId}:${meldIndex}"], [data-meld-key="${teamId}:${meldIndex}"][data-nehelenia-mirror-slot="left"]`);
      const finalRightMeld = document.querySelector(`[data-nehelenia-mirror-slot="right"][data-nehelenia-clone-for="${teamId}:${meldIndex}"], [data-meld-key="${teamId}:${meldIndex}"][data-nehelenia-mirror-slot="right"]`);
      const finalLeft = finalLeftMeld?.querySelector('.meld-line-cards');
      const finalRight = finalRightMeld?.querySelector('.meld-line-cards');
      if (!finalLeft || !finalRight) return;
      const leftRect = getRect(finalLeft);
      const rightRect = getRect(finalRight);
      finalLeft.style.visibility = 'hidden';
      finalRight.style.visibility = 'hidden';

      const leftFlight = animateNeheleniaMeldGhostToRect(firstGhost, sourceRect, leftRect);
      const rightFlight = animateNeheleniaMeldGhostToRect(secondGhost, sourceRect, rightRect);
      await Promise.allSettled([leftFlight.finished, rightFlight.finished]);
      await waitForVisualDuration(NEHELENIA_VISUAL_TIMING.mirroredMeldSettle);
      document.querySelectorAll(`[data-meld-key="${teamId}:${meldIndex}"], [data-nehelenia-clone-for="${teamId}:${meldIndex}"]`).forEach((node) => {
        node.classList.remove('nehelenia-mirror-split-underlay');
        const cards = node.querySelector('.meld-line-cards');
        if (cards) cards.style.visibility = '';
      });
    } finally {
      firstGhost?.remove();
      secondGhost?.remove();
      locallyAnimatingNeheleniaMirrorMelds.delete(animationKey);
      if (sourceCards?.isConnected) sourceCards.style.visibility = '';
      document.querySelectorAll(`[data-meld-key="${teamId}:${meldIndex}"], [data-nehelenia-clone-for="${teamId}:${meldIndex}"]`).forEach((node) => {
        node.classList.remove('nehelenia-mirror-split-underlay');
        const cards = node.querySelector('.meld-line-cards');
        if (cards) cards.style.visibility = '';
      });
    }
  });
}

function positionBossDialogueOverlay(hud) {
  const portrait = hud?.querySelector('.boss-portrait');
  const dialoguePanel = hud?.querySelector('#bossDialoguePresentation');
  if (!hud || !portrait || !dialoguePanel || hud.style.display === 'none') return;

  // Usa coordenadas de layout (offset*) em vez de getBoundingClientRect().
  // Em tablet/DevTools a mesa pode estar escalada; misturar rects já escalados
  // com top/left em CSS px fazia o balão cair para baixo do HUD.
  let node = portrait;
  let portraitLeft = 0;
  let portraitTop = 0;
  while (node && node !== hud) {
    portraitLeft += Number(node.offsetLeft) || 0;
    portraitTop += Number(node.offsetTop) || 0;
    node = node.offsetParent;
  }
  if (node !== hud) return;

  const portraitWidth = portrait.offsetWidth || 0;
  const portraitHeight = portrait.offsetHeight || 0;
  const hudWidth = hud.clientWidth || 0;
  if (!hudWidth || !portraitWidth || !portraitHeight) return;

  const left = Math.max(8, portraitLeft + portraitWidth * 0.58);
  const top = Math.max(6, portraitTop + portraitHeight * 0.08);
  const availableWidth = Math.max(178, hudWidth - left - 12);
  const width = Math.min(390, availableWidth);
  const leftPx = `${Math.round(left)}px`;
  const topPx = `${Math.round(top)}px`;
  const widthPx = `${Math.round(width)}px`;

  hud.style.setProperty('--boss-dialogue-left', leftPx);
  hud.style.setProperty('--boss-dialogue-top', topPx);
  hud.style.setProperty('--boss-dialogue-width', widthPx);
  dialoguePanel.style.setProperty('left', leftPx, 'important');
  dialoguePanel.style.setProperty('top', topPx, 'important');
  dialoguePanel.style.setProperty('width', widthPx, 'important');
}

function closeBossIntentHelp() {
  const button = document.getElementById('bossIntentHelpButton');
  const popover = document.getElementById('bossIntentHelpPopover');
  if (!button || !popover) return;
  popover._extraTrigger?.setAttribute('aria-expanded', 'false');
  popover._extraTrigger = null;
  popover.hidden = true;
  popover.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-expanded', 'false');
}

function positionBossHelpPopover(trigger, popover) {
  if (!trigger?.isConnected || popover.hidden) return;
  // Portal avoids clipping by the HUD/card and anchors every help to its own ?.
  if (popover.parentElement !== document.body) document.body.append(popover);
  popover.classList.add('boss-help-anchored');
  popover._anchorTrigger = trigger;
  const r = trigger.getBoundingClientRect();
  const w = popover.offsetWidth, h = popover.offsetHeight, gap = 10, edge = 10;
  let side = 'right', x = r.right + gap, y = r.top + r.height / 2 - h / 2;
  if (x + w > window.innerWidth - edge) {
    if (r.left - gap - w >= edge) { side = 'left'; x = r.left - gap - w; }
    else { side = r.bottom + gap + h <= window.innerHeight - edge ? 'below' : 'above'; x = r.left + r.width / 2 - w / 2; y = side === 'below' ? r.bottom + gap : r.top - gap - h; }
  }
  x = Math.max(edge, Math.min(x, window.innerWidth - w - edge));
  y = Math.max(edge, Math.min(y, window.innerHeight - h - edge));
  popover.style.left = `${x}px`; popover.style.top = `${y}px`;
  popover.dataset.anchorSide = side;
  const vertical = side === 'right' || side === 'left';
  popover.style.setProperty('--help-arrow', `${Math.max(12, Math.min(vertical ? r.top + r.height / 2 - y : r.left + r.width / 2 - x, (vertical ? h : w) - 12))}px`);
  if (!window._bossHelpAnchorBound) {
    window._bossHelpAnchorBound = true;
    const reposition = () => document.querySelectorAll('.boss-help-anchored:not([hidden])').forEach(node => {
      if (!node._anchorTrigger?.isConnected) { node.hidden = true; node.setAttribute('aria-hidden', 'true'); return; }
      positionBossHelpPopover(node._anchorTrigger, node);
    });
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  }
}

function closeBossRuleHelp() {
  const button = document.getElementById('bossRuleHelpButton');
  const popover = document.getElementById('bossRule');
  if (!button || !popover) return;
  popover.hidden = true;
  popover.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-expanded', 'false');
}

function syncBossRuleHelp(gameState, definition = null) {
  const button = document.getElementById('bossRuleHelpButton');
  const popover = document.getElementById('bossRule');
  const title = document.getElementById('bossRuleTitle');
  const text = document.getElementById('bossRuleText');
  const close = document.getElementById('bossRuleHelpClose');
  if (!button || !popover || !title || !text || !close) return;

  const ruleSummary = buildBossRuleSummary(gameState);
  button.hidden = !ruleSummary;
  text.textContent = ruleSummary;
  title.textContent = definition?.name ? `Regra · ${definition.name}` : 'Regra do chefe';

  if (!ruleSummary) {
    closeBossRuleHelp();
    return;
  }

  if (button.dataset.helpBound === '1') return;
  button.dataset.helpBound = '1';

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const opening = popover.hidden;
    if (opening) closeBossIntentHelp();
    popover.hidden = !opening;
    popover.setAttribute('aria-hidden', opening ? 'false' : 'true');
    button.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (opening) positionBossHelpPopover(button, popover);
  });

  close.addEventListener('click', (event) => {
    event.stopPropagation();
    closeBossRuleHelp();
    button.focus({ preventScroll: true });
  });

  document.addEventListener('click', (event) => {
    if (popover.hidden) return;
    if (popover.contains(event.target) || button.contains(event.target)) return;
    closeBossRuleHelp();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) closeBossRuleHelp();
  });
}

function syncBossIntentHelp(gameState) {
  const button = document.getElementById('bossIntentHelpButton');
  const popover = document.getElementById('bossIntentHelpPopover');
  const title = document.getElementById('bossIntentHelpTitle');
  const text = document.getElementById('bossIntentHelpText');
  const close = document.getElementById('bossIntentHelpClose');
  if (!button || !popover || !title || !text || !close) return;

  // Combat help shares the official floating popover, not a second component.
  if (!popover.hidden && popover._extraTrigger?.isConnected) return;

  const help = buildBossAbilityHelp(gameState);
  button.hidden = !help;
  if (!help) {
    closeBossIntentHelp();
    title.textContent = 'Ajuda da habilidade';
    text.textContent = '';
  } else {
    title.textContent = help.title;
    renderBossHudRichText(text, help.text);
  }

  if (button.dataset.helpBound === '1') return;
  button.dataset.helpBound = '1';

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const opening = popover.hidden || !!popover._extraTrigger;
    closeBossIntentHelp();
    if (opening) { syncBossIntentHelp(state); closeBossRuleHelp(); }
    popover.hidden = !opening;
    popover.setAttribute('aria-hidden', opening ? 'false' : 'true');
    button.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (opening) positionBossHelpPopover(button, popover);
  });

  close.addEventListener('click', (event) => {
    event.stopPropagation();
    const trigger = popover._extraTrigger || button;
    closeBossIntentHelp();
    trigger.focus({ preventScroll: true });
  });

  document.addEventListener('click', (event) => {
    if (popover.hidden) return;
    if (popover.contains(event.target) || button.contains(event.target) || popover._extraTrigger?.contains(event.target)) return;
    closeBossIntentHelp();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) closeBossIntentHelp();
  });
}

function createBossCombatHelp(label, title, text, caption = '?') {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'boss-intent-help-button boss-combat-help';
  button.textContent = caption; button.setAttribute('aria-label', label);
  button.setAttribute('aria-controls', 'bossIntentHelpPopover'); button.setAttribute('aria-expanded', 'false');
  button.onclick = (event) => {
    event.stopPropagation();
    const popover = document.getElementById('bossIntentHelpPopover');
    const opening = popover.hidden || popover._extraTrigger !== button;
    closeBossIntentHelp(); closeBossRuleHelp();
    if (!opening) return;
    document.getElementById('bossIntentHelpTitle').textContent = title;
    document.getElementById('bossIntentHelpText').textContent = typeof text === 'function' ? text() : text;
    popover._extraTrigger = button;
    popover.hidden = false; popover.setAttribute('aria-hidden', 'false');
    button.setAttribute('aria-expanded', 'true');
    positionBossHelpPopover(button, popover);
  };
  return button;
}

// Presentation only: use the engine's existing progress/thresholds without recomputing phase rules.
function renderBossPhaseAndHealth(gameState, progress) {
  const boss = gameState.boss;
  const panel = document.getElementById('bossPhaseProgress');
  if (panel) {
    panel.hidden = !progress;
    if (progress) {
      panel.classList.toggle('is-ready', progress.ready);
      panel.classList.toggle('is-final', progress.final);
      document.getElementById('bossPhaseProgressNext').textContent = progress.final ? 'FASE FINAL' : `FASE ${progress.nextPhase}`;
      const bar = document.getElementById('bossPhaseProgressBar');
      bar.parentElement.hidden = progress.final;
      bar.style.width = `${Math.round(Math.max(0, Math.min(1, progress.hpProgress || 0)) * 100)}%`;
      let button = document.getElementById('bossPhaseHelpButton');
      if (!button) {
        button = createBossCombatHelp('Explicar a progressão de fase', 'Próxima fase', () => button._phaseHelpText);
        button.id = 'bossPhaseHelpButton';
        document.getElementById('bossPhaseHelpSlot').append(button);
      }
      button._phaseHelpText = progress.final
        ? 'Fase final: não há outra transição. Monte e Morto mostram os recursos atuais da mesa.'
        : `Basta 1 gatilho para liberar a Fase ${progress.nextPhase}:\n• HP do chefe em ${progress.hp.targetPercent}% ou menos.\n• Monte com ${progress.stock.target} cartas ou menos.\n• ${progress.dead.target} morto(s) retirado(s).\n\nA barra acompanha o HP até o próximo marco. A transição segue o fluxo da batalha; não exige cumprir todos os gatilhos.`;
      const popover = document.getElementById('bossIntentHelpPopover');
      if (!popover?.hidden && popover?._extraTrigger === button) {
        document.getElementById('bossIntentHelpText').textContent = button._phaseHelpText;
        positionBossHelpPopover(button, popover);
      }
    }
  }
  const ratio = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
  const hpBar = document.getElementById('bossHpBar');
  document.getElementById('bossHpText').textContent = `${boss.hp} / ${boss.maxHp}`;
  hpBar.style.width = `${ratio * 100}%`;
  hpBar.dataset.health = ratio > 0.5 ? 'normal' : ratio > 0.25 ? 'tension' : 'danger';
  hpBar.classList.toggle('is-empty', boss.hp <= 0);
}

function syncBossDiscardHelp(bossMode) {
  let button = document.getElementById('bossDiscardHelpButton');
  if (!bossMode) {
    if (document.getElementById('bossIntentHelpPopover')?._extraTrigger === button && button) closeBossIntentHelp();
    button?.remove();
    return;
  }
  if (button) return;
  const label = document.querySelector('#drawDiscardBtn .pile-info');
  if (!label) return;
  button = createBossCombatHelp('Explicar Lixo no modo Chefe', 'Lixo — Modo Chefe',
    'Num jogo da mesa:\n• A carta de cima encaixa sozinha? Pegue só ela.\n• Precisa juntar cartas da sua mão? Pegue o Lixo inteiro.\n\nFez um jogo novo com a mão? Pegue o Lixo inteiro.\n\nJoker: só ele.\n2: só ele, mesmo completando um jogo. Só pega tudo se abrir um jogo novo com o 2 valendo como 2 (ex.: 2–3–4).');
  button.id = 'bossDiscardHelpButton';
  label.append(button);
}

function renderBossCombatPanel(hud, boss) {
  let panel = document.getElementById('bossCombatPanel');
  const model = getBossUiAdapter(boss.id)?.combatHud?.({ gameState: state, playerId: state.players[myPlayerIndex]?.id });
  if (!model) { if (panel) panel.hidden = true; if (document.getElementById('bossIntentHelpPopover')?._extraTrigger) closeBossIntentHelp(); document.getElementById('nemesisStarsOverlay')?.remove(); hud.querySelector('.boss-combat-targets')?.remove(); hud.querySelector('.boss-combat-main-target')?.remove(); document.getElementById('nemesisEffectSummary')?.remove(); hud.querySelector('.boss-portrait')?.setAttribute('aria-hidden', 'true'); return; }
  if (!panel) { panel = document.createElement('section'); panel.id = 'bossCombatPanel'; panel.className = 'boss-combat-panel'; }
  // Helpers occupy their own strip below the HUD, just like daughters/attendants.
  if (panel.previousElementSibling !== hud) hud.insertAdjacentElement('afterend', panel);
  panel.hidden = false;
  const disabled = state.currentPlayer !== myPlayerIndex || isBossTurnActive(state) || !!boss.result || pauseBlocksPlay(state);
  const fingerprint = JSON.stringify([model, disabled, state.players[myPlayerIndex]?.id]);
  if (panel.dataset.fingerprint === fingerprint) return;
  panel.dataset.fingerprint = fingerprint;
  const sessionChanged = panel.dataset.combatSession !== String(model.sessionKey);
  const initialRender = !panel._combatSeenEvents || sessionChanged;
  if (initialRender) panel._combatSeenEvents = new Set();
  panel.dataset.combatSession = String(model.sessionKey);
  if (document.getElementById('bossIntentHelpPopover')?._extraTrigger) closeBossIntentHelp();
  panel.replaceChildren();
  document.getElementById('nemesisStarsOverlay')?.remove();
  hud.querySelector('.boss-combat-targets')?.remove();
  hud.querySelector('.boss-combat-main-target')?.remove();
  const starsOverlay = document.createElement('span'); starsOverlay.id = 'nemesisStarsOverlay';
  starsOverlay.className = 'nemesis-stars-overlay';
  const starsLabel = document.createElement('span'); starsLabel.textContent = `🎯 S.T.A.R.S. — ${model.stars.toLocaleUpperCase('pt-BR')}`;
  starsOverlay.append(starsLabel, createBossCombatHelp('Explicar alvo S.T.A.R.S.', 'Alvo S.T.A.R.S.', 'Prioridade ofensiva: este jogador.\nQuem causar dano direto ao Nemesis assume S.T.A.R.S.\nDano causado aos zumbis não altera o alvo.'));
  const mainPortrait = hud.querySelector('.boss-portrait');
  mainPortrait.removeAttribute('aria-hidden'); mainPortrait.append(starsOverlay);
  const selectTarget = (id) => localActionGate.run(async () => {
    if (state.boss?.combatTargetsByPlayer?.[state.players[myPlayerIndex]?.id] === id) return;
    if (disabled || committing || state.finished || window.isClosingGame || !canPerformCommonGameAction() || !setBossDamageTarget(state, state.players[myPlayerIndex].id, id)) return;
    renderBossCombatPanel(hud, state.boss);
    await commitState();
  });
  const mainTarget = document.createElement('button'); mainTarget.type = 'button'; mainTarget.className = 'boss-combat-main-target';
  mainTarget.setAttribute('aria-label', 'Selecionar Nemesis como alvo'); mainTarget.setAttribute('aria-pressed', String(model.target === 'boss'));
  mainTarget.disabled = disabled; mainTarget.onclick = () => selectTarget('boss'); mainPortrait.append(mainTarget);
  let effects = document.getElementById('nemesisEffectSummary');
  if (!effects) { effects = document.createElement('small'); effects.id = 'nemesisEffectSummary'; document.getElementById('bossIntentProgress').insertAdjacentElement('afterend', effects); }
  effects.textContent = model.effects; effects.hidden = !model.effects;
  const entities = document.createElement('div'); entities.className = 'boss-combat-entities';
  for (const entity of model.entities) {
    const item = document.createElement('article'); item.dataset.entityId = entity.id;
    item.className = `boss-daughter-card boss-combat-entity is-${entity.status}${entity.mutated ? ' is-mutated' : ''}${entity.reinforced ? ' is-reinforced' : ''}`;
    const newVisualEvent = entity.visualEventId && !panel._combatSeenEvents.has(entity.visualEventId);
    if (entity.visualEventId) panel._combatSeenEvents.add(entity.visualEventId);
    if (newVisualEvent && !initialRender && entity.status !== 'repelled') item.classList.add('is-transitioning');
    if (entity.portrait) { const portrait = document.createElement('img'); portrait.src = entity.portrait; portrait.alt = entity.name; portrait.className = 'boss-combat-portrait'; item.append(portrait); }
    const content = document.createElement('div'); content.className = 'boss-combat-content';
    const label = document.createElement('b'); label.textContent = entity.name.toLocaleUpperCase('pt-BR'); item.append(label);
    const chips = document.createElement('span'); chips.className = 'boss-combat-chips';
    for (const entry of entity.chips || []) {
      const chip = createBossCombatHelp(`${entity.name}: ${entry.label}`, `${entity.name} · ${entry.label}`, entry.text, entry.label);
      chip.classList.add('boss-daughter-state'); chips.append(chip);
    }
    item.append(chips);
    if (entity.selectable) {
      const hp = document.createElement('span'); hp.textContent = `${entity.hp}/${entity.maxHp} HP`;
      const meter = document.createElement('meter'); meter.min = 0; meter.max = entity.maxHp; meter.value = entity.hp; meter.setAttribute('aria-label', `HP de ${entity.name}`);
      meter.low = entity.maxHp * .25; meter.high = entity.maxHp * .5; meter.optimum = entity.maxHp;
      meter.dataset.health = entity.hp > meter.high ? 'normal' : entity.hp > meter.low ? 'tension' : 'danger';
      content.append(hp, meter);
      const target = document.createElement('button'); target.type = 'button'; target.className = 'boss-combat-card-target'; target.textContent = entity.name;
      target.setAttribute('aria-label', `Selecionar ${entity.name} como alvo`); target.setAttribute('aria-pressed', String(entity.id === model.target));
      target.disabled = disabled; target.onclick = () => selectTarget(entity.id); item.append(target);
      item.classList.toggle('is-selected', entity.id === model.target);
    }
    if (entity.selectable) item.append(content);
    if (entity.help) {
      item.append(createBossCombatHelp(`Passiva de ${entity.name}`, entity.name, entity.help));
    }
    if (entity.status === 'repelled') { item.classList.add('is-withdrawing'); item.addEventListener('animationend', () => item.remove(), { once: true }); }
    entities.append(item);
  }
  panel.append(entities);
  if (!model.choices.length) return;
  const targets = document.createElement('div'); targets.className = 'boss-combat-targets';
  const hint = document.createElement('span'); hint.textContent = 'ALVO'; targets.append(hint);
  for (const choice of model.choices) {
    const button = document.createElement('button'); button.type = 'button';
    const targetName = model.entities.find(entity => entity.id === model.target)?.name;
    button.textContent = targetName ? `↩ ${targetName}` : choice.name;
    button.setAttribute('aria-label', 'Redirecionar dano para Nemesis');
    button.setAttribute('aria-pressed', String(choice.id === model.target));
    button.disabled = disabled || model.target === 'boss';
    button.onclick = () => selectTarget(choice.id);
    targets.append(button);
  }
  targets.append(createBossCombatHelp('Explicar alvo do dano', 'Alvo do dano', 'Toque num zumbi ATIVO para atacá-lo ou na arte do Nemesis para voltar ao chefe.\nEscolha antes de jogar; vale para o ataque final. Dano excedente não passa para outro alvo.'));
  mainPortrait.append(targets);
}

function presentBossDamageFeedback(hud, boss, event) {
  const zombieTarget = Array.isArray(boss.combatEntities) && event.targetId && event.targetId !== 'boss';
  const target = zombieTarget
    ? [...document.querySelectorAll('.boss-combat-entity')].find(node => node.dataset.entityId === event.targetId)
    : hud;
  const damage = Array.isArray(boss.combatEntities) ? (event.appliedDamage ?? event.damage) : event.damage;
  if (!target || !(damage > 0)) return;
  if (event.type === 'bossDamage') {
    const hitClass = zombieTarget ? 'boss-combat-hit' : 'boss-hit';
    target.classList.remove(hitClass);
    void target.offsetWidth;
    target.classList.add(hitClass);
  }
  const floating = document.createElement('div');
  floating.className = 'boss-floating-number';
  floating.dataset.targetId = zombieTarget ? event.targetId : 'boss';
  floating.textContent = `-${damage} HP`;
  const anchor = zombieTarget ? target : hud.querySelector('.boss-hp-meter') || hud;
  const rect = anchor.getBoundingClientRect();
  floating.style.left = `${rect.left + rect.width / 2}px`;
  floating.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(floating);
  setTimeout(() => floating.remove(), 2600);
}

function renderBossHud() {
  const hud = document.getElementById('bossHud');
  const resultSection = document.getElementById('bossResultSection');
  const bossMode = isCurrentBossMode();
  document.body.classList.toggle('boss-mode', bossMode);
  syncBossDiscardHelp(bossMode);
  if (!bossMode) {
    closeBossIntentHelp(); closeBossRuleHelp();
    const combatPanel = document.getElementById('bossCombatPanel');
    if (combatPanel) combatPanel.hidden = true;
    clearBossPortraitTerminalVisuals();
    document.body.removeAttribute('data-boss-id');
    if (hud) hud.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    renderBossVaultSlot(document.getElementById('bossLocalVaultSlot'), null, true);
    return;
  }

  const boss = normalizeBossState(state);
  const portraitHasTerminalVisual = !!document.querySelector('#bossHud .boss-portrait.boss-death-fade, #bossHud .boss-portrait.boss-rebirth-burst, #bossHud .boss-rebirth-ring');
  const hasTerminalVisualTimer = !!(matriarchRebirthStartTimer || matriarchRebirthEndTimer || bossDeathResultTimer || activeMatriarchRebirthEventId);
  const bossShouldLookAlive = Number(boss.hp) > 0 && !(state?.finished && boss.result?.victory);
  if (bossShouldLookAlive && !bossHasActiveRebirthVisual(boss) && (portraitHasTerminalVisual || hasTerminalVisualTimer)) {
    clearBossPortraitTerminalVisuals();
  }
  const definition = getBossDefinition(boss.id);
  renderBossCombatPanel(hud, boss);
  const isDominatrix = boss.id === 'dominadora';
  const isBanker = boss.id === 'banker';
  const isMatriarch = boss.id === 'matriarca_esmeralda';
  const isDimitrescu = boss.id === 'dimitrescu';
  const isNehelenia = boss.id === 'nehelenia';
  document.body.dataset.bossId = boss.id;
  const flow = boss.bossFlow;
  const resolvingEvent = flow?.stage === 'result' ? boss.eventLog?.find((entry) => entry.actionId === flow.eventActionId) || null : null;
  hud.style.display = 'grid';
  hud.classList.remove('boss-resolving');
  hud.classList.toggle('boss-turn-active', isBossTurnActive(state));
  const cocoonActive = isMatriarch && boss.emeraldCocoon?.status === 'active';
  const bloodClotActive = isDimitrescu && boss.crimsonClot?.status === 'active';
  const mirrorReturnActive = false;
  const totalEclipseActive = false;
  const mirrorPrisonActive = mirrorReturnActive || totalEclipseActive;
  const mirrorStoredDamage = mirrorReturnActive ? Math.max(0, Number(boss.mirrorReturn?.storedDamage) || 0) : totalEclipseActive ? Math.max(0, Number(boss.totalEclipse?.storedDamage) || 0) : 0;
  const mirrorRequiredDamage = mirrorReturnActive ? Math.max(1, Number(boss.mirrorReturn?.requiredTotal) || 1) : 0;
  const cocoonMaximum = 180;
  const cocoonRemaining = cocoonActive ? Math.max(0, Number(boss.emeraldCocoon.remaining) || 0) : 0;
  const bloodClotMaximum = bloodClotActive ? Math.max(1, Number(boss.crimsonClot.max) || 1) : 0;
  const bloodClotRemaining = bloodClotActive ? Math.max(0, Number(boss.crimsonClot.remaining) || 0) : 0;
  hud.classList.toggle('boss-cocoon-active', cocoonActive);
  hud.classList.toggle('boss-blood-clot-active', bloodClotActive);
  hud.classList.toggle('boss-mirror-prison-active', mirrorPrisonActive);
  hud.classList.toggle('boss-mirror-return-active', mirrorReturnActive);
  hud.classList.toggle('boss-nehelenia-dream-stolen', isNehelenia && Number(boss.danger || 0) > 0);
  hud.classList.toggle('boss-nehelenia-mirror-world', isNehelenia && !!boss.mirrorWorldActive);
  hud.classList.toggle('boss-total-eclipse-active', totalEclipseActive);
  hud.dataset.cocoonStage = cocoonActive ? (cocoonRemaining <= 60 ? 'critical' : cocoonRemaining <= 120 ? 'cracked' : 'full') : '';
  hud.dataset.bloodClotStage = bloodClotActive ? (bloodClotRemaining <= bloodClotMaximum * 0.33 ? 'critical' : bloodClotRemaining <= bloodClotMaximum * 0.66 ? 'cracked' : 'full') : '';
  const cocoonStrength = cocoonActive ? cocoonRemaining / cocoonMaximum : 0;
  const clotStrength = bloodClotActive ? bloodClotRemaining / bloodClotMaximum : 0;
  hud.style.setProperty('--boss-cocoon-strength', String(cocoonStrength));
  hud.style.setProperty('--boss-cocoon-opacity', String(0.5 + cocoonStrength * 0.35));
  hud.style.setProperty('--boss-cocoon-detail-opacity', String(0.42 + cocoonStrength * 0.4));
  hud.style.setProperty('--boss-blood-clot-strength', String(clotStrength));
  const springCrownBuffed = isMatriarch && ['root_prepared', 'root_active'].includes(boss.springCrown?.status);
  hud.classList.toggle('boss-spring-crown-buffed', springCrownBuffed);
  hud.dataset.springCrownStage = springCrownBuffed ? boss.springCrown.status : '';
  document.getElementById('bossName').textContent = (definition?.name || 'CHEFE').toUpperCase();
  setBossPortrait(document.getElementById('bossPortraitImage'), definition, boss);
  renderBossDaughterStrip(definition, boss);
  syncBossArtSpotlight(definition, boss);
  renderBossAbilityGuide(definition, boss);
  document.getElementById('bossPhase').textContent = `FASE ${boss.phase} · ${getBossPhaseName(state)}`;
  const legacyPhaseRule = document.getElementById('bossPhaseRule');
  if (legacyPhaseRule) legacyPhaseRule.hidden = true;

  const phaseProgress = getBossPhaseProgress(state);
  renderBossPhaseAndHealth(state, phaseProgress);
  syncBossRuleHelp(state, definition);
  const cocoonMeter = document.getElementById('bossCocoonMeter');
  const cocoonText = document.getElementById('bossCocoonText');
  const wardLabel = document.getElementById('bossWardLabel');
  if (cocoonMeter && cocoonText) {
    const wardActive = cocoonActive || bloodClotActive || mirrorPrisonActive;
    cocoonMeter.hidden = !wardActive;
    if (wardLabel) wardLabel.textContent = bloodClotActive ? 'COÁGULO' : cocoonActive ? 'CASULO' : totalEclipseActive ? 'ECLIPSE' : 'ESPELHO';
    cocoonText.textContent = bloodClotActive
      ? `${bloodClotRemaining} / ${bloodClotMaximum}`
      : cocoonActive
        ? `${cocoonRemaining} / ${cocoonMaximum}`
        : mirrorReturnActive
          ? `${mirrorStoredDamage} / ${mirrorRequiredDamage}`
          : `${mirrorStoredDamage} PRESO`;
    cocoonMeter.setAttribute(
      'aria-label',
      bloodClotActive
        ? `Coágulo Carmesim: ${bloodClotRemaining} de ${bloodClotMaximum} de proteção restante`
        : cocoonActive
          ? `Casulo Esmeralda: ${cocoonRemaining} de ${cocoonMaximum} de protecao restante`
          : mirrorReturnActive
            ? `Espelho de Retorno: ${mirrorStoredDamage} de ${mirrorRequiredDamage} de dano aprisionado`
            : totalEclipseActive
              ? `Eclipse Total: ${mirrorStoredDamage} de dano aprisionado`
              : 'Proteção do chefe inativa',
    );
  }
  const dangerMeter = document.getElementById('bossDangerMeter');
  const chainStatus = document.getElementById('bossChainStatus');
  const bloomFlowers = document.getElementById('bossBloomFlowers');
  const escapeBossHudText = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  dangerMeter.style.display = isDominatrix ? 'none' : 'block';
  chainStatus.style.display = isDominatrix ? 'grid' : 'none';
  dangerMeter.classList.toggle('boss-bloom-meter', isMatriarch);
  dangerMeter.classList.toggle('boss-blood-meter', isDimitrescu);
  dangerMeter.classList.toggle('boss-mirror-meter', isNehelenia);
  bloomFlowers.style.display = isMatriarch || isNehelenia ? 'flex' : 'none';
  if (isDominatrix) {
    chainStatus.innerHTML = state.players
      .map((player) => {
        const chains = Math.max(0, Math.min(4, Number(getBossChains(state, player.id)) || 0));
        const domination = Math.round(chains * 12.5 * 10) / 10;
        const fill = Math.max(0, Math.min(100, domination * 2));
        const dominated = domination >= 50;
        const controlled = domination >= 37.5 && !dominated;
        const nextEffectAt = controlled ? 50 : 37.5;
        const nextEffectAmount = Math.max(0, Math.round((nextEffectAt - domination) * 10) / 10);
        const valueLabel = Number.isInteger(domination) ? String(domination) : domination.toFixed(1);
        const status = dominated ? 'DOMINADO · sem Lixo e sem jogo novo' : controlled ? `SOB CONTROLE · Dominado em ${nextEffectAmount}` : `Sob Controle em ${nextEffectAmount}`;
        return `<div class="boss-domination-player${dominated ? ' dominated' : controlled ? ' controlled' : ''}" data-player-id="${player.id}">
          <div class="boss-domination-head"><span>${escapeBossHudText(player.name)}</span><strong>${valueLabel} / 50</strong></div>
          <div class="boss-domination-track" role="meter" aria-label="Dominação de ${escapeBossHudText(player.name)}" aria-valuemin="0" aria-valuemax="50" aria-valuenow="${domination}">
            <span class="boss-domination-fill" style="width:${fill}%"></span>
            <i style="left:25%"></i><i style="left:50%"></i><i style="left:75%"></i>
          </div>
          <small class="boss-domination-state">${status}</small>
        </div>`;
      })
      .join('');
  } else {
    document.getElementById('bossDangerLabel').textContent = definition?.dangerLabel || (isMatriarch ? 'FLORESCIMENTO' : isDimitrescu ? 'SEDE DE SANGUE' : isNehelenia ? 'MUNDO DO ESPELHO' : 'DÍVIDA COLETIVA');
    document.getElementById('bossDebtText').textContent = isNehelenia ? `${Math.round((Number(boss.danger) || 0) * 20 * 10) / 10} / 100` : `${boss.danger} / ${boss.maxDanger}`;
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
      : isNehelenia
        ? Array.from({ length: Math.max(1, Number(boss.maxDanger) || 5) }, (_, index) => {
            const fill = Math.round(Math.max(0, Math.min(1, (Number(boss.danger) || 0) - index)) * 100);
            return `<i class="boss-dream-mirror-orb${fill >= 100 ? ' taken' : fill > 0 ? ' partial' : ' intact'}" style="--boss-mirror-fill:${fill}%" title="Espelho ${index + 1}: ${fill}%"><span class="boss-dream-mirror-glass"></span><b>${index + 1}</b></i>`;
          }).join('')
        : '';
    if (isMatriarch) {
      lastRenderedBossBloom = boss.bloom;
      lastRenderedBossBloomEventId = boss.lastBloomEventId || null;
    }
  }
  renderBossVaultSlot(document.getElementById('bossLocalVaultSlot'), state.players[myPlayerIndex], true);

  const actionPresentation = buildBossActionPresentation(state);
  syncBossIntentHelp(state);
  document.getElementById('bossActionType').textContent = actionPresentation.category.toUpperCase();
  document.getElementById('bossIntentName').textContent = actionPresentation.name;

  const intentDescription = document.getElementById('bossIntentDescription');
  const intentProgress = document.getElementById('bossIntentProgress');

  intentDescription.className = '';
  renderBossHudRichText(intentDescription, actionPresentation.instruction);
  renderBossRangeMeters(intentDescription, actionPresentation.rangeMeters);
  intentProgress.className = '';
  const intentProgressParts = [actionPresentation.progress, actionPresentation.consequence].filter(Boolean);
  renderBossHudRichText(intentProgress, intentProgressParts.join(actionPresentation.progress?.includes('\n') ? '\n' : ' · '));

  renderBossDetailFields(document.getElementById('bossActionDetails'), actionPresentation.details);

  const dialoguePanel = document.getElementById('bossDialoguePresentation');
  const dialogueVisible = ['ability', 'taunt'].includes(flow?.stage) && !hasPendingBossChoices(state) && Boolean(actionPresentation.speech);
  dialoguePanel.style.display = dialogueVisible ? 'grid' : 'none';
  if (dialogueVisible) {
    // O HUD da direita já explica regra, objetivo, progresso e consequência.
    // Este balão existe só para dar voz/personagem ao chefe.
    document.getElementById('bossDialogueType').textContent = (definition?.name || 'Chefe da Mesa').toUpperCase();
    document.getElementById('bossDialogueName').textContent = '';
    document.getElementById('bossDialogueSpeech').textContent = `“${actionPresentation.speech}”`;
    document.getElementById('bossDialogueConsequence').textContent = '';

    // Posiciona já e confirma por mais dois frames: tablet/DevTools pode
    // recalcular fontes, quebras e escala depois do primeiro layout.
    const syncDialoguePosition = () => {
      if (dialoguePanel.style.display !== 'none' && hud.style.display !== 'none') positionBossDialogueOverlay(hud);
    };
    syncDialoguePosition();
    requestAnimationFrame(() => {
      syncDialoguePosition();
      requestAnimationFrame(syncDialoguePosition);
    });
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
  (boss.activeOrders || []).filter((order) => order.status === 'active').forEach((order) => tacticalEffects.push({ ...order, id: 'dominatrix_order' }));
  (boss.interdicts || []).filter((interdict) => interdict.status === 'active').forEach((interdict) => tacticalEffects.push({ ...interdict, id: 'interdict' }));
  if (boss.creditLimit?.status === 'active') tacticalEffects.push({ id: 'credit_limit', ...boss.creditLimit });
  if (boss.discardSurcharge?.status === 'active') tacticalEffects.push({ id: 'discard_surcharge', ...boss.discardSurcharge });
  document.getElementById('bossEffects').innerHTML =
    [...(boss.effects || []), ...persistentPossessions, ...natureEffects, ...tacticalEffects]
      .map((effect) => {
        if (effect.id === 'maintenance_fee') return `<span class="boss-effect-chip">Tarifa: +${effect.extraDraw} carta${effect.extraDraw === 1 ? '' : 's'} financiada${effect.extraDraw === 1 ? '' : 's'} · Dívida +${effect.financedDebt} cada</span>`;
        if (effect.id === 'financed_card') {
          const owner = state.players.find((player) => player.id === effect.playerId);
          const card = owner?.hand?.find((entry) => entry.id === effect.cardId);
          return `<span class="boss-effect-chip boss-financed-chip">$ ${owner?.name || 'Jogador'}: ${card ? `${card.rank}${card.suit}` : 'carta'} FINANCIADA · use em jogo · +${effect.debtPerCard} se falhar</span>`;
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
        if (effect.id === 'final_order_mark') {
          const owner = state.players.find((player) => player.id === effect.playerId);
          const marked = owner?.hand?.find((card) => card.id === effect.cardId);
          return `<span class="boss-effect-chip">Ordem Final: ${marked ? `${marked.rank}${marked.suit}` : 'carta marcada'} · ${owner?.name || 'alvo'}</span>`;
        }
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
    chain: 'Aceitar Dominação',
    order: 'Aceitar a ordem',
    obey: 'Aceitar Ordem Final',
    lock_card: 'Prender 1 carta',
    break_meld: 'Permitir cura de 180 HP',
    full: 'Pagar valor integral',
    guarantee: 'Dar garantia',
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
    const choiceOwner = state.players.find((player) => player.id === myChoice.playerId);
    const collateralChoice = myChoice.type === 'banker_collateral_card';
    if (collateralChoice) {
      const selectedStillExists = state.players[myPlayerIndex]?.hand?.some((card) => card.id === selectedBossCollateralCardId);
      if (selectedBossCollateralChoiceId !== myChoice.id || !selectedStillExists) {
        selectedBossCollateralChoiceId = myChoice.id;
        selectedBossCollateralCardId = null;
      }
    } else {
      selectedBossCollateralChoiceId = null;
      selectedBossCollateralCardId = null;
    }

    document.getElementById('bossChoicePrompt').textContent = ['false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare'].includes(myChoice.type)
      ? myChoice.type === 'shattered_mirror'
        ? 'Espelho Estilhaçado: dois reflexos são reais. Escolha a única mentira.'
        : myChoice.type === 'discard_mirror'
          ? 'Espelho do Lixo: dois reflexos idênticos mostram o topo. Escolha um deles.'
          : myChoice.type === 'dream_theft'
            ? 'Roubo de Sonho: qual dessas imagens realmente existe na sua mão?'
            : myChoice.type === 'eternal_nightmare'
              ? 'Pesadelo Eterno: acompanhe a carta ORIGINAL depois que dois reflexos nascerem e os três se embaralharem.'
              : 'Imagem Falsa: qual dessas imagens realmente existe na sua mão?'
      : myChoice.type === 'break_will'
        ? 'Quebra de Vontade: escolha sua punição.'
        : myChoice.type === 'fixed_interest_payment'
          ? `${choiceOwner?.name || 'Titular'}: +${myChoice.amount} agora ou Cofre (carta aleatória · resgate +${myChoice.collateralAmount} · +${myChoice.interestStep || 2} por turno adiado).`
          : collateralChoice
            ? 'Clique em uma carta da sua mão e confirme a garantia.'
            : myChoice.type === 'final_order'
              ? 'Ordem Final: aceite às cegas ou receba Dominação +7.'
              : myChoice.type === 'final_order_draw'
                ? 'Ordem Final: escolha pendente.'
                : myChoice.type === 'final_order_lock'
                  ? 'Ordem Final: escolha pendente.'
                  : myChoice.type === 'forced_choice' && myChoice.order?.description
                    ? `Escolha Forçada: cumpra a ordem ou escolha Dominação.`
                    : 'A Dominadora exige uma escolha.';
    const actions = document.getElementById('bossChoiceActions');

    if (collateralChoice) {
      clearNeheleniaChoiceStageTimers(actions);
      actions.classList.remove('nehelenia-choice-stage-host');
      delete actions.dataset.neheleniaChoiceId;
      const selectedCard = state.players[myPlayerIndex]?.hand?.find((card) => card.id === selectedBossCollateralCardId);
      actions.innerHTML = `
        <span class="boss-collateral-selection-summary">${selectedCard ? `Selecionada: <strong>${selectedCard.rank}${selectedCard.suit}</strong>` : 'Nenhuma carta selecionada'}</span>
        <button type="button" class="boss-confirm-collateral" ${selectedCard ? `data-boss-choice="card:${selectedCard.id}"` : 'disabled'}>Confirmar garantia</button>
      `;
    } else if (!renderNeheleniaChoiceStage(actions, myChoice)) {
      clearNeheleniaChoiceStageTimers(actions);
      actions.classList.remove('nehelenia-choice-stage-host');
      delete actions.dataset.neheleniaChoiceId;
      actions.innerHTML = myChoice.options
        .map((option) => {
          let label = myChoice.optionLabels?.[option] || choiceLabels[option] || option;
          if (option === 'chain') {
            if (myChoice.type === 'break_will') label = 'Dominação +8';
            else if (myChoice.type === 'final_order') label = 'Dominação +7';
            else if (myChoice.type === 'forced_choice') {
              const phase = Number(myChoice.announcedPhase || state.boss?.phase || 1);
              label = `Dominação +${phase === 3 ? 8 : phase === 2 ? 7 : 6}`;
            } else label = 'Aceitar Dominação';
          }
          if (option === 'obey' && myChoice.type === 'final_order') label = 'Aceitar às cegas';
          if (option === 'full' && myChoice.type === 'fixed_interest_payment') {
            label = `Assumir +${myChoice.amount} Dívida`;
          } else if ((option === 'guarantee' || option.startsWith('guarantee:')) && myChoice.type === 'fixed_interest_payment') {
            label = `Aceitar Cofre · começa +${myChoice.collateralAmount}`;
          } else if (option.startsWith('guarantee:')) {
            const player = state.players.find((entry) => entry.id === Number(option.split(':')[1]));
            label = `Garantia: ${player?.name || 'Jogador'}`;
          } else if (option.startsWith('card:')) {
            const card = state.players[myPlayerIndex]?.hand?.find((entry) => entry.id === option.slice(5));
            label = card ? `${card.rank}${card.suit}` : 'Carta';
          }
          return `<button type="button" data-boss-choice="${option}">${label}</button>`;
        })
        .join('');
    }

    actions.querySelectorAll('[data-boss-choice]').forEach((button) => {
      button.onclick = async () => {
        if (!state || state.finished || pauseBlocksPlay(state)) return;
        const activeChoiceBeforeClick = getBossPendingChoice(state, myPlayerIndex);
        if (!activeChoiceBeforeClick) return;
        const discardMirrorTrap = activeChoiceBeforeClick.type === 'discard_mirror' && button.dataset.bossChoice !== activeChoiceBeforeClick.correctOption;
        if (activeChoiceBeforeClick.type === 'discard_mirror') {
          await animateNeheleniaDiscardMirrorReturn(button, { trap: discardMirrorTrap });
          const stillPending = getBossPendingChoice(state, myPlayerIndex);
          if (!stillPending || String(stillPending.id) !== String(activeChoiceBeforeClick.id)) return;
        }
        const stockEl = document.querySelector('#drawStockBtn .pile-card');
        const stockRect = stockEl ? getRect(stockEl) : null;
        const visibleCardRects = snapshotVisibleCardRects();
        const selectedCollateralId = button.dataset.bossChoice.startsWith('card:') ? button.dataset.bossChoice.slice(5) : '';
        const selectedCollateralEl = selectedCollateralId ? cardElById(selectedCollateralId) : null;
        const selectedCollateralRect = selectedCollateralEl ? getRect(selectedCollateralEl) : null;
        localUndoStack = [];
        const selectedBossChoiceOption = button.dataset.bossChoice;
        const event = resolveBossChoice(state, myPlayerIndex, selectedBossChoiceOption);
        if (!event) {
          renderAll();
          if (activeChoiceBeforeClick.type === 'discard_mirror') document.getElementById('drawDiscardBtn')?.classList.remove('boss-nehelenia-seal-preview');
          return;
        }
        playNeheleniaWrongMirrorLaugh(activeChoiceBeforeClick, selectedBossChoiceOption);
        if (event.collateralCardId && event.actionId) {
          locallyAnimatedBossVaultSoundEventIds.add(event.actionId);
          locallyAnimatingBossVaultStates.set(event.collateralPlayerId, 'receiving');
        }
        if (selectedCollateralId) {
          selectedBossCollateralCardId = null;
          selectedBossCollateralChoiceId = null;
        }
        if (state.boss?.result) {
          state.finished = true;
          state.winnerTeamId = state.boss.result.victory ? 0 : 1;
        }
        if (event.drawnCardIds?.length) {
          state.boughtCardIds = [...event.drawnCardIds];

          const lockedMessage = event.lockedCardLabels?.length ? ` ${event.lockedCardLabels.join(' e ')} ficaram presas.` : ' As duas cartas ficaram presas.';

          showMessage(`2 cartas adicionadas à sua mão.${lockedMessage} Sua compra normal do turno continua sendo 1 carta.`);
        } else if (event.choiceType === 'final_order' && event.option === 'obey' && event.markedCardLabels?.length) {
          showMessage(`Ordem Final aceita: use ${event.markedCardLabels.join(' e ')} em jogo no proximo turno. Cada carta não usada causa Dominação +6.`);
        } else if (event.choiceType === 'final_order_lock' && event.lockedCardLabel) {
          showMessage(`Ordem Final: ${event.lockedCardLabel} ficou presa durante o proximo turno completo.`);
        }
        state.lastAction = { id: newActionId(), type: 'bossChoice', playerId: myPlayerIndex, bossEvent: event, ts: Date.now() };
        renderAll();
        if (activeChoiceBeforeClick.type === 'discard_mirror') document.getElementById('drawDiscardBtn')?.classList.remove('boss-nehelenia-seal-preview');
        const commitPromise = commitState();
        if (event.drawnCardIds?.length) await animateForcedChoiceDraw(event, myPlayerIndex, stockRect);
        if (event.collateralCardId) {
          const vaultCard = getBossVault(state, event.collateralPlayerId)?.card;
          const collateralFromRect = selectedCollateralRect || visibleCardRects.get(event.collateralCardId) || null;
          try {
            await animateBossVaultLock(event, vaultCard, collateralFromRect);
          } finally {
            locallyAnimatedBossVaultSoundEventIds.delete(event.actionId);
          }
        }
        await commitPromise;
        if (!hasPendingBossChoices(state)) startTurnTimerIfNeeded();
      };
    });
  } else if (pendingChoice && !state.finished) {
    selectedBossCollateralCardId = null;
    selectedBossCollateralChoiceId = null;
    const target = state.players.find((player) => player.id === pendingChoice.playerId);
    choicePanel.style.display = 'flex';
    document.getElementById('bossChoicePrompt').textContent = `Aguardando ${target?.name || 'o jogador alvo'} decidir.`;
    const waitingActions = document.getElementById('bossChoiceActions');
    clearNeheleniaChoiceStageTimers(waitingActions);
    waitingActions.classList.remove('nehelenia-choice-stage-host');
    delete waitingActions.dataset.neheleniaChoiceId;
    waitingActions.innerHTML = '';
  } else {
    selectedBossCollateralCardId = null;
    selectedBossCollateralChoiceId = null;
    choicePanel.style.display = 'none';
    const hiddenActions = document.getElementById('bossChoiceActions');
    clearNeheleniaChoiceStageTimers(hiddenActions);
    hiddenActions.classList.remove('nehelenia-choice-stage-host');
    delete hiddenActions.dataset.neheleniaChoiceId;
    hiddenActions.innerHTML = '';
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
        detail: `${entry.damage} de dano${entry.dangerChangeLabel ? ` · ${entry.dangerChangeLabel}` : ''}${entry.chainsRemoved ? ` · Dominação -${Math.round(entry.chainsRemoved * 12.5 * 10) / 10}` : ''}${entry.possessionProgress != null ? ` · Posse ${entry.possessionProgress}/2` : ''}`,
      };
    if (entry.type === 'bossAbility') return { icon: '💼', title: `${definition?.name || 'Chefe'} — ${entry.name || 'Habilidade'}`, detail: entry.outcome || 'Habilidade resolvida' };
    if (entry.type === 'chainChange')
      return {
        icon: '⛓',
        title: entry.amount > 0 ? 'Dominação aumentou' : 'Resistência',
        detail: `${state.players.find((player) => player.id === entry.playerId)?.name || 'Jogador'}: ${Math.round((entry.domination ?? entry.chains * 12.5) * 10) / 10}/50 · ${entry.dominationDelta > 0 ? '+' : ''}${entry.dominationDelta ?? Math.round(entry.amount * 12.5 * 10) / 10}`,
      };
    if (entry.type === 'chainOverflow') return { icon: '⛓', title: 'Dominação transferida', detail: entry.outcome || 'O excesso de Dominação passou para o parceiro.' };
    if (entry.type === 'dominatrixOrder') return { icon: '👑', title: 'Ordem da Dominadora', detail: entry.outcome || 'A ordem foi resolvida.' };
    if (entry.type === 'creditLimit') return { icon: '🪙', title: 'Limite de Crédito', detail: entry.outcome || `Dívida +${entry.debtAdded || 0}` };
    if (entry.type === 'discardSurcharge') return { icon: '🪙', title: 'Sobretaxa do Lixo', detail: entry.outcome || `Dívida +${entry.amount || 0}` };
    if (entry.type === 'bossChoice') return { icon: '👑', title: 'Escolha cumprida', detail: entry.outcome };
    if (entry.type === 'debtReduction') return { icon: '🛡️', title: 'Morto conquistado', detail: entry.dangerChangeLabel || `Morto conquistado: Dívida -${entry.amount}` };
    if (entry.type === 'bossHeal') return { icon: '✿', title: entry.origin || 'Cura natural', detail: `HP +${entry.amount}` };
    if (entry.type === 'bloomChange') return { icon: '🌸', title: entry.origin || 'Florescimento', detail: `${entry.amount > 0 ? '+' : ''}${entry.amount} Flor${Math.abs(entry.amount) === 1 ? '' : 'es'}` };
    if (entry.type === 'natureThreat') return { icon: '🌿', title: `${definition?.name || 'Matriarca'} — ${entry.name || 'Ameaça natural'}`, detail: entry.outcome || 'A ameaça foi plantada na mesa.' };
    if (entry.type === 'rebirth') return { icon: '✨', title: 'Renascimento Esmeralda', detail: entry.outcome || 'A Matriarca retornou com 300 HP.' };
    if (entry.type === 'bloodChange') return { icon: '🩸', title: entry.origin || 'Sede de Sangue', detail: entry.outcome || entry.dangerChangeLabel || `Sede ${entry.amount > 0 ? '+' : ''}${entry.amount}` };
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
    const nemesisContaminated = !!getBossUiAdapter(boss.id)?.discard?.({ gameState: state });
    discardButton.classList.toggle('boss-nemesis-contaminated-discard', nemesisContaminated);
    discardButton.classList.toggle('boss-locked', isBossDiscardBlocked(state) && !state.hasDrawnThisTurn);
    const discardCardIds = new Set((state.discard || []).map((card) => card?.id).filter(Boolean));
    const pollenActive = (boss.natureThreats || []).some((threat) => threat.status === 'active' && ['pollen', 'royal_pollen'].includes(threat.type) && threat.targetPlayerId == null && discardCardIds.has(threat.discardCardId));
    discardButton.classList.toggle('boss-pollen-discard', pollenActive);
    const dimitrescuIntent = boss.id === 'dimitrescu' ? boss.currentIntent : null;
    const danielaObjective = dimitrescuIntent?.abilityId === 'three_daughters' ? dimitrescuIntent.payload?.objectives?.find((objective) => objective.type === 'daniela') : null;
    const danielaActive = (dimitrescuIntent?.abilityId === 'daniela_swarm' && !dimitrescuIntent.payload?.triggered) || danielaObjective?.status === 'active';
    const castleLockdownActive = boss.id === 'dimitrescu' && dimitrescuIntent?.abilityId === 'castle_lockdown' && !state.finished;
    discardButton.classList.toggle('boss-daniela-discard', !!danielaActive);
    discardButton.classList.toggle('boss-castle-lockdown-discard', castleLockdownActive);
    if (nemesisContaminated) discardButton.setAttribute('aria-label', 'Lixo contaminado pelo Nemesis: +6 Infecção por retirada');
    else if (castleLockdownActive) discardButton.setAttribute('aria-label', 'Lixo bloqueado por Portas do Castelo');
    else if (pollenActive) discardButton.setAttribute('aria-label', 'Lixo contaminado por Pólen da Matriarca');
    else if (danielaActive) discardButton.setAttribute('aria-label', 'Lixo cercado pelo Enxame de Daniela');
    else discardButton.removeAttribute('aria-label');
    discardButton.classList.toggle('boss-surcharge-discard', boss.id === 'banker' && boss.discardSurcharge?.status === 'active');
  }

  const event = resolvingEvent || (boss.lastEvent?.type === 'bossAbility' ? null : boss.lastEvent);
  if (event?.actionId && event.actionId !== lastRenderedBossEventId) {
    lastRenderedBossEventId = event.actionId;
    presentBossDamageFeedback(hud, boss, event);
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
      const isDimitrescuHeal = boss.id === 'dimitrescu' && feedback.type === 'bossAbility' && feedback.abilityId === 'red_wine' && Number(feedback.healAmount) > 0;
      const isBloom = feedback.type === 'bloomChange' && feedback.amount;
      const isBlood = boss.id === 'dimitrescu' && feedback.dangerChangeLabel && ['bossAbility', 'bossDamage', 'bloodChange'].includes(feedback.type);
      const isMirrorFragment = boss.id === 'nehelenia' && feedback.type === 'dreamMirror' && Number(feedback.dangerDelta);
      const isMirrorStore = boss.id === 'nehelenia' && feedback.type === 'bossDamage' && Number(feedback.mirrorStoredDamage) > 0 && !feedback.mirrorBroken;
      const isMirrorBreak = boss.id === 'nehelenia' && feedback.type === 'bossDamage' && feedback.mirrorBroken;
      const isRebirth = feedback.type === 'rebirth';
      const isCocoonAbsorb = boss.id === 'matriarca_esmeralda' && feedback.type === 'bossDamage' && Number(feedback.absorbedDamage) > 0;
      const isCocoonBreak = boss.id === 'matriarca_esmeralda' && feedback.type === 'bossDamage' && feedback.cocoonBroken;
      const isBloodClotAbsorb = boss.id === 'dimitrescu' && feedback.type === 'bossDamage' && Number(feedback.absorbedDamage) > 0;
      const isBloodClotBreak = boss.id === 'dimitrescu' && feedback.type === 'bossDamage' && feedback.bloodClotBroken;
      const isNatureCreated = feedback.type === 'bossAbility' && Array.isArray(feedback.threatIds) && feedback.threatIds.length > 0;
      if (isCocoonAbsorb || isBloodClotAbsorb || isMirrorStore || isMirrorBreak) {
        const portrait = document.querySelector('#bossHud .boss-portrait');
        if (portrait) {
          const pulseClass = isMirrorBreak
            ? 'boss-mirror-breaking'
            : isMirrorStore
              ? 'boss-mirror-impact'
              : isBloodClotBreak
                ? 'boss-blood-clot-breaking'
                : isBloodClotAbsorb
                  ? 'boss-blood-clot-impact'
                  : isCocoonBreak
                    ? 'boss-cocoon-breaking'
                    : 'boss-cocoon-impact';
          portrait.classList.remove('boss-cocoon-impact', 'boss-cocoon-breaking', 'boss-blood-clot-impact', 'boss-blood-clot-breaking', 'boss-mirror-impact', 'boss-mirror-breaking');
          void portrait.offsetWidth;
          portrait.classList.add(pulseClass);
          setTimeout(() => portrait.classList.remove(pulseClass), isCocoonBreak || isBloodClotBreak || isMirrorBreak ? 820 : 620);
        }
      }
      if (isRebirth && boss.id === 'matriarca_esmeralda') {
        triggerMatriarchRebirthVisual(feedback.actionId);
      }
      if (
        !isChain &&
        !isDebt &&
        !isHeal &&
        !isDimitrescuHeal &&
        !isBloom &&
        !isBlood &&
        !isMirrorFragment &&
        !isMirrorStore &&
        !isMirrorBreak &&
        !isRebirth &&
        !isCocoonAbsorb &&
        !isCocoonBreak &&
        !isBloodClotAbsorb &&
        !isBloodClotBreak &&
        !isNatureCreated
      )
        return;
      const floating = document.createElement('div');
      const visualClass = isChain
        ? feedback.amount > 0
          ? 'chain-up'
          : 'chain-down'
        : isHeal || isDimitrescuHeal
          ? 'nature-heal-up'
          : isBloom
            ? feedback.amount > 0
              ? 'bloom-up'
              : 'bloom-down'
            : isBlood
              ? Number(feedback.dangerDelta ?? feedback.amount) > 0
                ? 'blood-up'
                : 'blood-down'
              : isMirrorFragment
                ? Number(feedback.dangerDelta) > 0
                  ? 'mirror-up'
                  : 'mirror-down'
                : isMirrorBreak
                  ? 'mirror-break'
                  : isMirrorStore
                    ? 'mirror-absorb'
                    : isRebirth
                      ? 'nature-rebirth'
                      : isBloodClotBreak
                        ? 'blood-clot-break'
                        : isBloodClotAbsorb
                          ? 'blood-clot-absorb'
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
        ? `DOMINAÇÃO ${feedback.amount > 0 ? '+' : '−'}${Math.round(Math.abs(feedback.amount) * 12.5 * 10) / 10}`
        : isHeal
          ? `HP +${feedback.amount}`
          : isDimitrescuHeal
            ? `HP +${feedback.healAmount}`
            : isBloom
              ? `${feedback.amount > 0 ? '+' : '−'}${Math.abs(feedback.amount)} Flor${Math.abs(feedback.amount) === 1 ? '' : 'es'}`
              : isMirrorFragment
                ? `${feedback.amount > 0 ? '+' : '−'}${Math.abs(feedback.amount)} FRAGMENTO${Math.abs(feedback.amount) === 1 ? '' : 'S'}`
                : isMirrorBreak
                  ? `ESPELHO ROMPIDO · ${feedback.mirrorReleasedDamage || 0} LIBERADO`
                  : isMirrorStore
                    ? `DANO PRESO ${feedback.mirrorStoredDamage}`
                    : isRebirth
                      ? 'RENASCIMENTO +300 HP'
                      : isBloodClotBreak
                        ? `COÁGULO ROMPIDO · CURA EVITADA`
                        : isBloodClotAbsorb
                          ? `COÁGULO ABSORVEU ${feedback.absorbedDamage}`
                          : isCocoonBreak
                            ? `CASULO ROMPIDO · ${feedback.absorbedDamage || 0} ABSORVIDO`
                            : isCocoonAbsorb
                              ? `CASULO ABSORVEU ${feedback.absorbedDamage}`
                              : isNatureCreated
                                ? { living_seed: 'SEMENTE CRIADA', hungry_root: 'RAIZ CRIADA', twin_vines: 'TREPADEIRAS CRIADAS', graft: 'ENXERTO CRIADO', discard_pollen: 'PÓLEN CRIADO', royal_bloom: 'FLORESCIMENTO REAL' }[feedback.abilityId] ||
                                  'AMEAÇA CRIADA'
                                : feedback.dangerChangeLabel;
      const chainPlayer = isChain ? [...document.querySelectorAll('#bossChainStatus .boss-domination-player')].find((element) => String(element.dataset.playerId) === String(feedback.playerId)) : null;
      const anchor = isChain
        ? chainPlayer?.querySelector('.boss-domination-track')?.getBoundingClientRect()
        : isHeal || isDimitrescuHeal || isRebirth
          ? document.getElementById('bossHpBar')?.parentElement?.getBoundingClientRect()
          : isCocoonBreak || isCocoonAbsorb || isBloodClotBreak || isBloodClotAbsorb || isMirrorStore || isMirrorBreak
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

function presentBossResultAfterDeathFade() {
  const boss = state?.boss;
  if (!boss?.result?.victory) {
    renderBossResult();
    return;
  }

  const portrait = document.querySelector('#bossHud .boss-portrait');
  if (!portrait) {
    renderBossResult();
    return;
  }

  clearBossPortraitTerminalVisuals();
  bossDeathVisualSequence += 1;
  const sequence = bossDeathVisualSequence;
  void portrait.offsetWidth;
  portrait.classList.add('boss-death-fade');

  bossDeathResultTimer = setTimeout(() => {
    bossDeathResultTimer = null;
    if (sequence !== bossDeathVisualSequence || !state?.finished || !state?.boss?.result?.victory) return;
    renderBossResult();
  }, 1850);
}

function renderBossResult() {
  const section = document.getElementById('bossResultSection');
  if (!isCurrentBossMode() || !state.finished || !state.boss?.result) {
    section.style.display = 'none';
    return;
  }
  const boss = normalizeBossState(state);
  const presentation = buildBossFinalPresentation(state);
  const specialDefeatReasons = new Set(['max_debt', 'both_players_dominated', 'max_bloom', 'max_blood']);
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
  schedulePendingBossResultFinish();
  renderMatchDuration();
  renderDominationTools();
  // Only rendering sees the intermediate friend frame. Restore the persisted
  // state synchronously, before any event, timer or network callback can run.
  if (state.mode === '1x1_dominacao' && friendPlayback && state !== friendPlayback.view && state.friendGameId === friendPlayback.gameId) {
    const persisted = state;
    state = friendPlayback.view;
    try {
      renderAll();
    } finally {
      state = persisted;
    }
    return;
  }

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

  if (dominationFeatureEnabled(state, 'vision') && state.powerActiveThisTurn && !state.finished) {
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
    // Em produção, o DevTools é liberado pela sessão autenticada no Firebase.
    // Não dependa de ?debug=1 aqui: isso fazia o painel sumir assim que renderAll()
    // rodava dentro da partida, mesmo com o acesso DEV válido.
    if (isDebugMode) {
      debugPanel.style.display = window.isDevToolsOpen ? 'flex' : 'none';
      debugMiniBtn.style.display = window.isDevToolsOpen ? 'none' : 'block';
    } else {
      debugPanel.style.display = 'none';
      debugMiniBtn.style.display = 'none';
    }
  }

  applyViewTeamClass();
  // ... (resto da função continua igual)
  const debugVisionLab = document.getElementById('debugVisionLab');
  if (debugVisionLab) debugVisionLab.hidden = state.mode !== '1x1_dominacao' || myPlayerIndex !== 1;

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
  syncAdaptiveGamePerformance();

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

  const currP = isDominationFriendTurn(state) ? getDominationFriend(state) || currentPlayer() : currentPlayer();
  const pName = currP ? currP.name : 'Aguardando...';
  const cardCount = currP && currP.hand ? currP.hand.length : 0; // 🔥 CORREÇÃO: Variável declarada corretamente no escopo de renderAll

  document.getElementById('currentPlayerLabel').textContent = isMyTurnRightNow ? `Sua Vez! (${cardCount})` : `Vez de ${pName} (${cardCount})`;
  syncTurnScopedFeedback({ isMyTurnRightNow, currentName: pName });

  // Exibe o contador de cartas no chip de status do topo esquerdo
  const currentChip = document.querySelector('.current-player-chip');
  if (currentChip) currentChip.classList.toggle('is-my-turn', isMyTurnRightNow);
  document.getElementById('stockCount').textContent = state.stock.length;

  // ==========================================================
  // MOTOR DE RENDERIZAÇÃO 3D DINÂMICO (Monte, Lixo e Mortos)
  // ==========================================================
  function updatePile3D(container, baseCardClass, count, backColor, keepArcade) {
    if (!container) return 0;

    const existingLayers = [...container.querySelectorAll('.visual-layer')];

    if (count === 0) {
      existingLayers.forEach((layer) => layer.remove());
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
    const visibleLayers = isDiscard ? layers - 1 : layers;
    existingLayers.slice(visibleLayers).forEach((layer) => layer.remove());

    for (let i = 0; i < layers; i++) {
      if (isDiscard && i === layers - 1) continue;

      const layer = existingLayers[i] || document.createElement('div');
      const isTopLayer = i === layers - 1;

      // Intercala as cores herdando perfeitamente as classes do Tema
      let currentClass = topClass;
      if (!isDiscard) {
        const isBlueTop = topClass === 'back-blue';
        currentClass = (layers - 1 - i) % 2 === 0 ? topClass : isBlueTop ? 'back-red' : 'back-blue';
      }

      layer.classList.add(...baseCardClass.split(' '), 'visual-layer');
      for (const colorClass of ['back-blue', 'back-red', 'visual-discard-layer']) {
        layer.classList.toggle(colorClass, colorClass === currentClass);
      }
      layer.classList.toggle('sub-layer', !isTopLayer && !isDiscard);
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
      } else layer.style.removeProperty('box-shadow');

      if (isDiscard) {
        layer.style.background = '#f3f4f6';
        layer.style.border = '1px solid #d1d5db';
        layer.style.filter = `brightness(${0.6 + (i / layers) * 0.4})`;
      } else if (!isTopLayer) {
        // Escurece gradativamente para dar noção de profundidade na pilha
        layer.style.filter = `brightness(${0.4 + (i / layers) * 0.5})`;
      } else layer.style.filter = '';

      if (!layer.parentNode) container.appendChild(layer);
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
  const dimitrescuIntent = state.boss?.id === 'dimitrescu' ? state.boss.currentIntent : null;
  const danielaObjective = dimitrescuIntent?.abilityId === 'three_daughters' ? dimitrescuIntent.payload?.objectives?.find((objective) => objective.type === 'daniela') : null;
  const danielaCardId = dimitrescuIntent?.abilityId === 'daniela_swarm' && !dimitrescuIntent.payload?.triggered ? dimitrescuIntent.payload?.discardCardId : danielaObjective?.status === 'active' ? danielaObjective.discardCardId : null;
  const danielaInDiscard = !!danielaCardId && discardCardIds.has(danielaCardId);
  const danielaOnTop = danielaInDiscard && discardTop?.id === danielaCardId;
  const neheleniaDiscardMirror = state.boss?.id === 'nehelenia' && state.boss.currentIntent?.abilityId === 'discard_mirror' && !state.boss.currentIntent.payload?.resolved;
  const neheleniaCurrentPlayerId = state.players?.[state.currentPlayer]?.id ?? state.currentPlayer;
  const neheleniaMirrorDiscardSealed =
    state.boss?.id === 'nehelenia' && (Number(state.boss.neheleniaDiscardSealRound) === Number(state.boss.roundNumber) || state.boss.effects?.some((effect) => effect.id === 'nehelenia_discard_lock' && effect.playerId === neheleniaCurrentPlayerId));
  const neheleniaHawkGuardedDiscard = state.boss?.id === 'nehelenia' && !!discardTop?.id && state.boss.effects?.some((effect) => effect.id === 'nehelenia_hawk_guarded_discard' && effect.cardId === discardTop.id);
  const hawkSuitIntent = state.boss?.id === 'nehelenia' && state.boss.currentIntent?.abilityId === 'hawk_suit' ? state.boss.currentIntent : null;
  const neheleniaHawkDiscardDemand = !!hawkSuitIntent && hawkSuitIntent.payload?.targetPlayerId === neheleniaCurrentPlayerId && !hawkSuitIntent.payload?.resolved;
  const discardButtonEl = document.getElementById('drawDiscardBtn');
  const nemesisContaminated = !!getBossUiAdapter(state.boss?.id)?.discard?.({ gameState: state });
  discardButtonEl?.classList.toggle('boss-nemesis-contaminated-discard', nemesisContaminated);
  discardButtonEl?.classList.toggle('boss-pollen-discard', !!pollenThreat);
  discardButtonEl?.classList.toggle('boss-daniela-discard', danielaInDiscard);
  discardButtonEl?.classList.toggle('boss-surcharge-discard', state.boss?.id === 'banker' && state.boss.discardSurcharge?.status === 'active');
  discardButtonEl?.classList.toggle('boss-nehelenia-discard', neheleniaDiscardMirror);
  discardButtonEl?.classList.toggle('boss-nehelenia-discard-sealed', neheleniaMirrorDiscardSealed);
  discardButtonEl?.classList.toggle('boss-nehelenia-hawk-discard', neheleniaHawkGuardedDiscard || neheleniaHawkDiscardDemand);
  discardButtonEl?.classList.toggle('is-hawk-guarded', neheleniaHawkGuardedDiscard);
  discardButtonEl?.classList.toggle('is-hawk-demand', neheleniaHawkDiscardDemand && !neheleniaHawkGuardedDiscard);
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

    const hawkSuitLabel = hawkSuitIntent?.payload?.suit || hawkSuitIntent?.payload?.suitLabel || '';
    const discardBossStatus = pollenThreat
      ? '<span class="boss-card-status boss-card-status-pollen" aria-hidden="true"><i>&#10022;</i><b>PÓLEN</b></span>'
      : danielaOnTop
        ? '<span class="boss-card-status boss-card-status-blood-hunt boss-card-status-daniela" aria-hidden="true"><i>🩸</i><b>DANIELA</b></span>'
        : neheleniaHawkGuardedDiscard
          ? '<span class="boss-card-status boss-card-status-nehelenia-hawk" aria-hidden="true"><i>◉</i><b>VIGIADO</b></span>'
          : neheleniaHawkDiscardDemand
            ? `<span class="boss-card-status boss-card-status-nehelenia-hawk" aria-hidden="true"><i>◉</i><b>DESCARTE ${hawkSuitLabel}</b></span>`
            : neheleniaDiscardMirror || neheleniaMirrorDiscardSealed
              ? `<span class="boss-card-status boss-card-status-nehelenia" aria-hidden="true"><i>◇</i><b>${neheleniaMirrorDiscardSealed ? 'SELADO' : 'ESPELHO'}</b></span>`
              : '';
    const discardMarkup = cardFrontHTML(discardTop) + discardBossStatus;
    if (discardFace._faceMarkup !== discardMarkup) discardFace.innerHTML = discardMarkup;
    discardFace._faceMarkup = discardMarkup;
    discardFace.className = `discard-face ${suitClass(discardTop)} ${deckFaceClass(discardTop)}${pollenThreat ? ' boss-discard-pollen-card' : ''}${danielaOnTop ? ' boss-discard-dimitrescu-card' : ''}${neheleniaDiscardMirror || neheleniaMirrorDiscardSealed ? ' boss-discard-nehelenia-card' : ''}${neheleniaHawkGuardedDiscard || neheleniaHawkDiscardDemand ? ' boss-discard-nehelenia-hawk-card' : ''}`;
    getBossUiAdapter('nemesis')?.decorateCard?.(discardFace, nemesisContaminated ? 'nemesis-contaminated' : null);
    if (danielaOnTop) applyDimitrescuBloodScatter(discardFace, discardTop?.id || 'daniela-discard', 'discard');
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
    const bloodiedDead = state.boss?.id === 'dimitrescu' && state.boss.bloodiedDead?.status === 'active' ? state.boss.bloodiedDead : null;
    s0.classList.toggle('boss-dimitrescu-dead', bloodiedDead?.deadIndex === 0 && m0.length > 0);
    s1.classList.toggle('boss-dimitrescu-dead', bloodiedDead?.deadIndex === 1 && m1.length > 0);
    s0.title = bloodiedDead?.deadIndex === 0 && m0.length > 0 ? 'Morto 1 · BANQUETE DOS MORTOS' : 'Morto Time 1';
    s1.title = bloodiedDead?.deadIndex === 1 && m1.length > 0 ? 'Morto 2 · BANQUETE DOS MORTOS' : 'Morto Time 2';

    updatePile3D(s0, 'morto-card-back', m0.length, m0.length ? m0[m0.length - 1].back : 'red', false);
    updatePile3D(s1, 'morto-card-back', m1.length, m1.length ? m1[m1.length - 1].back : 'blue', false);
    syncDimitrescuDeadPileVisual(s0, bloodiedDead?.deadIndex === 0 && m0.length > 0, m0[m0.length - 1]?.id || 'dead-0');
    syncDimitrescuDeadPileVisual(s1, bloodiedDead?.deadIndex === 1 && m1.length > 0, m1[m1.length - 1]?.id || 'dead-1');
  }

  renderOpponentHands();
  renderHand();
  renderMelds();
  renderDominationFriend(state, myPlayerIndex);
  const callFriendButton = document.getElementById('callFriendBtn');
  if (callFriendButton) callFriendButton.disabled = callFriendButton.disabled || friendOperationPending || !commonActionsAllowed;

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
  const canDrawDiscard = myTurn && !state.hasDrawnThisTurn && !bossControlsLocked && !vaultDrawRequired && state.discard.length && !isBossDiscardBlocked(state) && !isDominationDiscardDecreeActive(state, state.currentPlayer);
  const canDiscardToPile = myTurn && state.hasDrawnThisTurn && !bossControlsLocked;
  document.getElementById('drawDiscardBtn').style.pointerEvents = canDrawDiscard || canDiscardToPile ? 'auto' : 'none';
  document.getElementById('drawDiscardBtn').style.opacity = shouldShowDominationDecreeDiscardLock(state) || canDrawDiscard || canDiscardToPile ? '1' : '0.5';
  const me = state.players[myPlayerIndex];
  const myTeamId = me ? me.teamId : null; // Protege o Team ID

  document.getElementById('endGameBtn').disabled = false;

  // Controle de exibição do botão Voltar
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    const canUndo = !isDominationFriendBusy(state) && !friendOperationPending && canRestoreUndoTransaction(localUndoStack[localUndoStack.length - 1], state, myPlayerIndex);
    // Keep the slot stable instead of recentering the bar after every action.
    undoBtn.style.display = !state.finished && myPlayerIndex >= 0 ? 'block' : 'none';
    undoBtn.disabled = !canUndo;
    undoBtn.title = canUndo ? 'Desfazer a ultima acao completa' : 'Esta acao nao pode ser desfeita';
  }

  const powerBtn = document.getElementById('powerBtn');
  if (powerBtn) {
    powerBtn.title = 'Antes de comprar, use uma vez por partida para ver a mão adversária e roubar até 2 cartas. Priorize completar seus jogos ou tirar cartas que ajudam o adversário. Não retira cartas dos jogos já baixados.';
    const canUsePower = dominationFeatureEnabled(state, 'vision') && state.currentPlayer === 1 && myPlayerIndex === 1 && !state.hasDrawnThisTurn && (!state.dominatorUsedPower || state.powerActiveThisTurn);
    const showPower = dominationFeatureEnabled(state, 'vision') && myPlayerIndex === 1 && !state.finished;
    powerBtn.style.display = showPower ? 'block' : 'none';
    powerBtn.disabled = !canUsePower;

    if (window.isStealModeActive) {
      powerBtn.innerHTML = '❌ FECHAR VISÃO';
      powerBtn.style.background = '#ef4444';
      powerBtn.style.borderColor = '#fca5a5';
      powerBtn.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
    } else {
      powerBtn.innerHTML = state.dominatorUsedPower ? '✓ VISÃO USADA' : '👁️ ROUBAR MÃO';
      powerBtn.style.background = 'linear-gradient(90deg, var(--hud-accent-soft), rgba(15, 23, 42, 0.82))';
      powerBtn.style.borderColor = 'var(--hud-accent)';
      powerBtn.style.boxShadow = '0 0 10px var(--hud-accent-glow)';
    }
  }

  // Oculta botões se o jogo acabou OU se for o Espectador (-1)
  renderDominationVisionHint();
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
    if (!resultPresented && !state.surrender?.active) {
      resultPresented = true;
      if (isCurrentBossMode()) presentBossResultAfterDeathFade();
      else renderScores(computeScores(), state.winnerTeamId);
    }
  } else {
    resultPresented = false;
    document.getElementById('scoreSection').style.display = 'none';
    document.getElementById('bossResultSection').style.display = 'none';
  }

  syncCanastraSfxFromState();
  // Canastra first, then its extra-turn announcement/MP3, on every client.
  syncDominationFriendNotices();

  // reativa os carrinhos do tema arcade sem loop bugado
  refreshArcadeCars(false);

  syncMythicPhase();

  // CHAMA A TELA DE VOTAÇÃO AQUI
  renderSurrender();
  renderPauseVote();

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
  const handRoot = document.getElementById('handContainer');
  // Replacing the DOM under a stationary cursor must not lift a different
  // card after a discard. Re-enable PC hover only after genuine mouse motion.
  handRoot.onpointerenter = (event) => {
    if (event.pointerType === 'mouse') handRoot.classList.remove('hand-hover-reset');
  };
  handRoot.onpointermove = (event) => {
    if (event.pointerType === 'mouse' && (event.movementX || event.movementY)) {
      handRoot.classList.remove('hand-hover-reset');
    }
  };
  const container = document.querySelector('#handContainer .cards-row');
  const nextCards = document.createDocumentFragment();
  const commitHand = () => {
    const oldCards = new Map([...container.children].map((node) => [node.dataset.cardId, node]));
    const desired = [...nextCards.children];
    const orderChanged = desired.length !== container.children.length || desired.some((node, index) => node.dataset.cardId !== container.children[index]?.dataset.cardId);
    if (orderChanged) handRoot.classList.add('hand-hover-reset');
    desired.forEach((fresh, index) => {
      const existing = oldCards.get(fresh.dataset.cardId);
      const node = existing || fresh;
      if (existing) {
        // Preserve faces and running effects; refresh handlers because indexes
        // and collateral choices can change without changing the card itself.
        for (const name of (existing._handClasses || existing.className).split(' ').filter(Boolean)) {
          if (!fresh.classList.contains(name)) existing.classList.remove(name);
        }
        for (const name of fresh.classList) existing.classList.add(name);
        for (const name of ['title', 'aria-label']) {
          if (fresh.hasAttribute(name)) existing.setAttribute(name, fresh.getAttribute(name));
          else existing.removeAttribute(name);
        }
        if (existing._faceMarkup !== fresh.innerHTML) existing.innerHTML = fresh.innerHTML;
        if (existing._handVisibility !== fresh.style.visibility) existing.style.visibility = fresh.style.visibility;
        existing.onclick = fresh.onclick;
      }
      node._faceMarkup = fresh.innerHTML;
      node._handClasses = fresh.className;
      node._handVisibility = fresh.style.visibility;
      if (container.children[index] !== node) container.insertBefore(node, container.children[index] || null);
      oldCards.delete(fresh.dataset.cardId);
    });
    oldCards.forEach((node) => node.remove());
  };
  const localLabelEl = document.getElementById('localPlayerLabel'); // Captura o novo elemento

  // --- MODO ESPECTADOR ---
  if (myPlayerIndex === -1) {
    if (localLabelEl) {
      localLabelEl.style.display = 'none';
      localLabelEl.classList.remove('boss-player-targeted');
    }
    const p0 = state.players[0];
    if (!p0) {
      commitHand();
      return;
    }

    p0.hand.forEach((card) => {
      ensureCardId(card);
      const div = document.createElement('div');
      div.dataset.cardId = card.id;
      div.className = 'carta back ' + (card.back === 'blue' ? 'back-blue' : 'back-red');
      nextCards.appendChild(div);
    });
    commitHand();
    return;
  }

  // --- JOGADOR NORMAL ---
  const me = state.players[myPlayerIndex];
  if (!me) {
    if (localLabelEl) {
      localLabelEl.style.display = 'none';
      localLabelEl.classList.remove('boss-player-targeted');
    }
    commitHand();
    return;
  }

  // 🔥 Atualiza o seu próprio indicador dinamicamente na tela com nome e contagem real
  if (localLabelEl) {
    localLabelEl.textContent = `${me.name} (${me.hand.length})`;
    localLabelEl.style.display = 'block';
    localLabelEl.classList.toggle('boss-player-targeted', activeMatriarchTargetPlayerIds().has(me.id));

    // Usa a cor de turno do tema, mantendo o verde padrão nas demais mesas.
    const isMyTurn = !state.finished && state.currentPlayer === myPlayerIndex;
    if (isMyTurn) {
      localLabelEl.style.setProperty('background', 'var(--table-local-active-bg, #16a34a)', 'important');
      localLabelEl.style.setProperty('border-color', 'var(--table-local-active-border, rgba(255, 255, 255, 0.3))', 'important');
    } else {
      localLabelEl.style.setProperty('background', 'rgba(15, 23, 42, 0.9)', 'important');
      localLabelEl.style.setProperty('border-color', 'rgba(255, 255, 255, 0.15)', 'important');
    }
  }

  const collateralChoice = getBossPendingChoice(state, me.id);
  const selectingBankerCollateral = collateralChoice?.type === 'banker_collateral_card';
  // Membership is checked once per rendered card. Sets avoid repeatedly
  // scanning large pickup lists after a big discard purchase.
  const boughtCardIds = new Set(state.boughtCardIds || []);
  const bossChoiceBoughtIds = new Set(state.boss?.choiceDrawnCardIdsByPlayer?.[me.id] || []);

  me.hand.forEach((card, idx) => {
    if (!card) return; // 🛡️ BLINDAGEM ANTI-FANTASMA: Impede o crash de UI
    ensureCardId(card);
    const div = document.createElement('div');
    div.dataset.cardId = card.id;
    div.className = `carta ${suitClass(card)} ${deckFaceClass(card)}`;
    if (pendingStockCardIds.has(card.id)) div.style.visibility = 'hidden';
    if (selectingBankerCollateral) {
      div.classList.add('boss-collateral-selectable');
      if (selectedBossCollateralCardId === card.id) div.classList.add('boss-collateral-selected');
      div.title = 'Clique para escolher esta carta como garantia';
    }

    const bossCardEffect = getBossCardEffect(state, me.id, card.id);
    const adapterCard = getBossUiAdapter(state.boss?.id)?.card?.(bossCardEffect);
    if (adapterCard) {
      div.classList.add(...adapterCard.classes);
      div.title = adapterCard.title;
    }
    const bossDiscardFeedback = getBossCardBlockFeedback(state, me.id, card.id, 'discard');
    const bossCardLocked = bossCardEffect === 'locked';

    // O brilho de compra nunca compete com um estado visual da Dominadora.
    if (!bossCardEffect && (boughtCardIds.has(card.id) || bossChoiceBoughtIds.has(card.id))) {
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
    if (bossCardEffect === 'final-order') {
      div.classList.add('boss-card-exposed');
      div.title = 'Ordem Final: use esta carta em um jogo no próximo turno; descartar não cumpre a ordem';
    }
    if (bossCardEffect === 'nature-seed') {
      div.classList.add('boss-card-nature-seed');
      div.title = bossDiscardFeedback?.message || 'Semente Viva: use esta carta antes do fim do turno';
    }
    if (bossCardEffect === 'nature-pollen') {
      div.classList.add('boss-card-nature-pollen');
      div.title = bossDiscardFeedback?.message || 'Pólen da Matriarca: use esta carta neste turno';
    }
    if (bossCardEffect === 'dimitrescu-hunt') {
      div.classList.add('boss-card-dimitrescu-hunt');
      div.title = 'Caçada de Bela: use esta carta antes do fim do turno';
    }
    if (bossCardEffect === 'dimitrescu-blood-mark') {
      div.classList.add('boss-card-dimitrescu-blood-mark');
      div.title = 'Marca Carmesim: use esta carta legalmente antes do fim da rodada';
    }
    if (bossCardEffect === 'nehelenia-reflection') {
      div.classList.add('boss-card-nehelenia-reflection');
      div.title = 'Reflexo de Nehelenia: use esta carta legalmente nesta rodada';
    }
    if (bossCardEffect === 'nehelenia-dream') {
      div.classList.add('boss-card-nehelenia-dream');
      div.title = 'Espelho dos Sonhos: use esta carta em jogo para dobrar o dano individual';
    }
    if (bossCardEffect === 'nehelenia-nightmare') {
      div.classList.add('boss-card-nehelenia-nightmare');
      div.title = 'Pesadelo Eterno: esta carta faz parte do objetivo de Reflexos';
    }
    if (bossCardEffect === 'nehelenia-fish-mark') {
      div.classList.add('boss-card-nehelenia-fish-mark');
      div.title = 'Mão no Espelho · Fish Eye: use esta carta em jogo ou descarte-a antes do fim do turno';
    }
    if (bossCardEffect === 'nehelenia-fish-dead') {
      div.classList.add('boss-card-nehelenia-fish-mark', 'boss-card-nehelenia-fish-dead');
      div.title = 'Reflexo Morto · Fish Eye: esta carta não pode mais entrar em jogo; descarte-a para quebrar o efeito';
    }
    if (['dimitrescu-hunt', 'dimitrescu-blood-mark'].includes(bossCardEffect)) applyDimitrescuBloodScatter(div, card.id, 'card');
    const swapHighlight = bossSwapReceivedHighlights.get(card.id);
    if (swapHighlight && swapHighlight.expiresAt > Date.now()) div.classList.add('boss-swap-received');
    if (bossDiscardFeedback) div.setAttribute('aria-label', `${card.rank}${card.suit}. ${bossDiscardFeedback.message}`);
    const financedCard = state.boss?.effects?.find((effect) => effect.id === 'financed_card' && effect.playerId === me.id && effect.cardId === card.id);
    if (financedCard) {
      div.classList.add('boss-card-financed');
      // A compra normal continua como NOVA; a extra da Tarifa recebe uma identidade própria.
      div.classList.remove('just-bought');
      div.title = `Carta FINANCIADA: use em um jogo neste turno. Descartar não quita a Tarifa; se não entrar em jogo, Dívida +${financedCard.debtPerCard}.`;
    }

    div.innerHTML = cardFrontHTML(card);
    if (financedCard) {
      div.insertAdjacentHTML('beforeend', '<span class="boss-financed-marker" role="img" aria-label="Carta financiada: use em um jogo neste turno"><span aria-hidden="true">FINANCIADA</span></span>');
    } else if (div.classList.contains('just-bought')) {
      div.insertAdjacentHTML('beforeend', '<span class="bought-card-marker" role="img" aria-label="Carta recém-comprada"><span aria-hidden="true">NOVA</span></span>');
    }
    if (bossCardLocked) {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-locked" aria-hidden="true"><i></i><b>PRESA</b></span>');
    } else if (bossCardEffect === 'exposed') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-exposed" aria-hidden="true"><i></i><b>USE NESTE TURNO</b></span>');
    } else if (bossCardEffect === 'final-order') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-exposed" aria-hidden="true"><i></i><b>ORDEM FINAL</b></span>');
    } else if (bossCardEffect === 'nature-seed') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-seed" aria-hidden="true"><i>&#10047;</i><b>SEMENTE</b></span>');
    } else if (bossCardEffect === 'nature-pollen') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-pollen" aria-hidden="true"><i>&#10022;</i><b>POLEN</b></span>');
    } else if (bossCardEffect === 'dimitrescu-hunt') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-blood-hunt" aria-hidden="true"><i>🩸</i><b>BELA</b></span>');
    } else if (bossCardEffect === 'dimitrescu-blood-mark') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-blood-hunt boss-card-status-crimson-brand" aria-hidden="true"><i>🩸</i><b>MARCA</b></span>');
    } else if (bossCardEffect === 'nehelenia-reflection') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia" aria-hidden="true"><i>◇</i><b>REFLEXO</b></span>');
    } else if (bossCardEffect === 'nehelenia-dream') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia" aria-hidden="true"><i>☾</i><b>SONHO</b></span>');
    } else if (bossCardEffect === 'nehelenia-nightmare') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia" aria-hidden="true"><i>◆</i><b>PESADELO</b></span>');
    } else if (bossCardEffect === 'nehelenia-illusion-lock') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia" aria-hidden="true"><i>◈</i><b>NO ESPELHO</b></span>');
    } else if (bossCardEffect === 'nehelenia-fish-mark') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia-fish" aria-hidden="true"><i>◉</i><b>FISH EYE</b></span>');
    } else if (bossCardEffect === 'nehelenia-fish-dead') {
      div.insertAdjacentHTML('beforeend', '<span class="boss-card-status boss-card-status-nehelenia-fish is-dead" aria-hidden="true"><i>✦</i><b>REFLEXO MORTO</b></span>');
    }
    if (swapHighlight && swapHighlight.expiresAt > Date.now()) {
      const sender = state.players.find((player) => player.id === swapHighlight.fromPlayerId);
      div.insertAdjacentHTML('beforeend', `<span class="boss-swap-origin">DO PARCEIRO${sender?.name ? `: ${sender.name}` : ''}</span>`);
    }

    // Decorate after the face markup: innerHTML must not erase the objective marker.
    getBossUiAdapter(state.boss?.id)?.decorateCard?.(div, bossCardEffect);

    // A seleção visual agora aplica a classe 'selected' isoladamente
    if (selectedHandIndexes.has(idx)) div.classList.add('selected');

    div.onclick = () => {
      if (selectingBankerCollateral) {
        selectedBossCollateralChoiceId = collateralChoice.id;
        selectedBossCollateralCardId = card.id;
        renderHand();
        renderBossHud();
        return;
      }
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

      // Re-render using the live DOM card nodes. renderHand() rebinds indexes
      // safely when the hand DOM is reused after a draw, and renderMelds()
      // refreshes the drop targets for the current selection.
      renderHand();
      renderMelds();
    };
    nextCards.appendChild(div);
  });
  commitHand();
  getBossUiAdapter(state.boss?.id)?.syncCardTransitions?.(handRoot, state.boss, {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  });
}

function seatForPlayer(pid, friendId = null) {
  const baseIdx = myPlayerIndex !== -1 ? myPlayerIndex : 0;
  if (pid === 'friend' && state.mode === '1x1_dominacao') return getDominationFriend(state, friendId)?.seat || 'left';
  if (pid === baseIdx) return 'self';
  const seats = opponentSeats(state, myPlayerIndex, isCurrentBossMode());
  return Object.keys(seats).find((seat) => seats[seat] === pid) || null;
}

function fallbackSeatRect(seat) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (seat === 'top') return { left: vw * 0.5 - 20, top: 40, width: 40, height: 60 };
  if (seat === 'left') return { left: 12, top: vh * 0.5 - 30, width: 40, height: 60 };
  if (seat === 'right') return { left: vw - 52, top: vh * 0.5 - 30, width: 40, height: 60 };
  return null;
}

function opponentAnchorRect(pid, friendId = null) {
  const seat = seatForPlayer(pid, friendId);
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
  // The main 1x1 axis never depends on invitation or guest lifetime.
  const board = document.querySelector('#gameSection > .board');
  if (board) board.dataset.mode = state.mode;
  const top = document.getElementById('opponentTop');
  const left = document.getElementById('opponentLeft');
  const right = document.getElementById('opponentRight');

  const seats = opponentSeats(state, myPlayerIndex, isCurrentBossMode());

  function updateSeat(rootEl, playerIdx) {
    if (!rootEl) return;
    // The guest renderer owns this existing empty seat, not a parallel panel.
    if (state.mode === '1x1_dominacao' && state.dominationOptions?.friend !== false && !state.finished && activeDominationFriends(state).some((friend) => OPPONENT_SEAT_IDS[friend.seat] === rootEl.id)) return;
    if (rootEl.classList.contains('domination-friend-seat')) rootEl.replaceChildren();
    rootEl.classList.remove('domination-friend-seat');
    delete rootEl.dataset.viewKey;

    if (playerIdx === null || playerIdx === undefined) {
      rootEl.innerHTML = '';
      delete rootEl.dataset.playerId;
      rootEl.classList.remove('active-turn-glow');
      rootEl.classList.remove('boss-player-targeted');
      return;
    }

    const p = state.players[playerIdx];
    if (!p) {
      rootEl.innerHTML = '';
      delete rootEl.dataset.playerId;
      rootEl.classList.remove('active-turn-glow');
      rootEl.classList.remove('boss-player-targeted');
      return;
    }

    rootEl.dataset.playerId = String(p.id);

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
    const isStealTarget = dominationFeatureEnabled(state, 'vision') && window.isStealModeActive && playerIdx === 0 && myPlayerIndex === 1 && state.powerActiveThisTurn && !state.hasDrawnThisTurn;

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
      renderOpponentBacks(cardsDiv, p.hand);
      for (const cardEl of cardsDiv.children) {
        // 🧹 CORREÇÃO DO BURACO FANTASMA: Destrói a invisibilidade injetada pela animação!
        cardEl.removeAttribute('style');
        cardEl.innerHTML = '';
        cardEl.onclick = null;
        if (document.body.dataset.deckTheme !== 'arcade') {
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

async function resolveNeheleniaMirrorVisualChoice(slot, teamId, meldIndex, mirrorElement = null) {
  if (!state || state.finished || state.boss?.id !== 'nehelenia') return;
  if (!ensureMyTurn()) return;
  if (!state.hasDrawnThisTurn) {
    showMessage('Compre primeiro.');
    return;
  }
  const intent = state.boss?.currentIntent;
  const me = currentPlayer();
  if (!intent || intent.abilityId !== 'mirrored_meld' || intent.payload?.targetPlayerId !== me?.id || intent.payload?.resolved) {
    showMessage('Este reflexo não está ativo para o seu turno.');
    return;
  }
  if (Number(intent.payload.meldIndex) !== Number(meldIndex) || teamId !== me.teamId) {
    showMessage('A ilusão está ligada a outro jogo.');
    return;
  }
  const indexes = [...selectedHandIndexes];
  if (indexes.length !== 1) {
    showMessage('🪞 Jogo Espelhado: selecione exatamente 1 carta para testar um dos reflexos.');
    return;
  }
  const card = me.hand[indexes[0]];
  if (!card) return;
  const targetMeld = state.teams?.[teamId]?.melds?.[meldIndex];
  if (!targetMeld || !isValidSequenceMeld([...(targetMeld || []), { ...card }])) {
    showMessage('❌ Essa carta não encaixa no jogo refletido.');
    return;
  }

  const mirrorUndoSaved = slot !== intent.payload.realSlot;
  if (mirrorUndoSaved) saveStateForUndo('neheleniaMirrorChoice', [card.id]);
  const fromEl = cardElById(card.id);
  const fromRect = fromEl ? getRect(fromEl) : null;
  const mirrorRect = mirrorElement ? getRect(mirrorElement) : null;
  const result = resolveNeheleniaMirroredMeldChoice(state, me.id, slot, card.id);
  if (!result?.allowed) {
    if (mirrorUndoSaved) localUndoStack.pop();
    showMessage(result?.message || 'A ilusão não aceitou essa jogada.');
    return;
  }

  if (result.real) {
    selectedMeldTarget = `${teamId}:${meldIndex}`;
    await makeMeldFromSelection(false);
    if (state?.boss?.currentIntent?.abilityId === 'mirrored_meld' && !state.boss.currentIntent.payload?.fed) {
      state.boss.currentIntent.payload.realChosen = false;
    }
    return;
  }

  playSfxClone(BOSS_SFX.nehelenia?.laugh, { audioContext: audioCtx });
  if (mirrorElement) mirrorElement.classList.add('is-shattering');
  if (fromEl) fromEl.style.visibility = 'hidden';
  if (fromRect && mirrorRect) {
    await flyRectToRect(card, fromRect, mirrorRect, 'front').catch(() => {});
    impactAtRect(mirrorRect);
    const stockFace = document.querySelector('#drawStockBtn .pile-card') || document.getElementById('drawStockBtn');
    const stockRect = stockFace ? getRect(stockFace) : null;
    if (stockRect) await flyRectToRect(card, mirrorRect, stockRect, 'back').catch(() => {});
  }
  selectedHandIndexes.clear();
  selectedMeldTarget = null;
  state.lastAction = {
    id: newActionId(),
    type: 'neheleniaMirrorTrap',
    playerId: me.id,
    card: packCard(card),
    meldIndex,
    fakeSlot: slot,
    bossEvent: result.event || null,
    ts: Date.now(),
  };
  renderAll();
  await commitState();
  showMessage(`💥 Reflexo falso! ${card.rank}${card.suit} foi para o fundo do monte. Você ficou Desorientado: apenas descarte para encerrar.`);
}

function applyBossMeldUiSurface(element, classes = [], dataset = {}) {
  if (!element) return;
  for (const className of classes || []) {
    if (className) element.classList.add(className);
  }
  for (const [key, value] of Object.entries(dataset || {})) {
    if (value == null || value === '') delete element.dataset[key];
    else element.dataset[key] = String(value);
  }
}

function applyBossMeldEffectFrame(div, row) {
  const effects = [
    ['locked-by-boss', 'PENHORA', '#fbbf24'],
    ['possessed-by-boss', 'POSSE', '#f472b6'],
    ['interdicted-by-boss', 'INTERDITO', '#f472b6'],
    ['rooted-by-matriarch', 'RAIZ', '#34d399'],
    ['grafted-by-matriarch', 'ENXERTO', '#fde68a'],
    ['feasted-by-cassandra', 'BANQUETE', '#fb7185'],
    ['nemesis-impact-zone', 'ZONA DE IMPACTO', '#e86938'],
    ['mirrored-by-nehelenia', 'ESPELHO', '#c4b5fd'],
  ].filter(([className]) => div.classList.contains(className));
  if (!effects.length) return;
  div.classList.add('boss-meld-marked');
  row.classList.add('boss-meld-effect-frame');
  row.style.setProperty('--boss-effect-color', effects[0][2]);
  // Nehelenia already provides a contextual badge on the card row.
  if (row.classList.contains('nehelenia-mirror-card-frame')) return;
  const badge = document.createElement('span'); badge.className = 'boss-meld-effect-badge';
  badge.textContent = effects.map(([, label]) => label).join(' · ');
  row.append(badge);
}

function applyBossMeldCardDecoration(element, decoration, key = '') {
  if (!element || !decoration) return;
  applyBossMeldUiSurface(element, decoration.classes || []);
  if (decoration.bloodProfile) applyDimitrescuBloodScatter(element, key, decoration.bloodProfile);
}

function renderMelds() {
  if (!discardChoiceIsCurrent()) pendingDiscardChoice = null;
  const m1 = document.getElementById('meldsP1');
  const m2 = document.getElementById('meldsP2');
  // Keep unchanged Domination melds (and seat clearances) mounted. Rebuilding
  // them on every hand/guest update restarts effects and invalidates geometry.
  // Mesas de chefe crescem bastante no fim da partida. Reusar jogos que não
  // mudaram evita desmontar/recriar dezenas de cartas a cada clique, compra ou
  // atualização do Firebase — exatamente o tipo de custo que degrada tablets.
  const stableMelds = state.mode === '1x1_dominacao' || isBossMode(state.mode);
  if (!stableMelds) {
    m1.innerHTML = '';
    m2.innerHTML = '';
  }
  const retainedMeldKeys = new Set();
  let s1 = 0,
    s2 = 0;

  const meLocal = state.players[myPlayerIndex];
  const myTurnLocal = !state.finished && state.currentPlayer === myPlayerIndex && !isDominationFriendBusy(state);
  const activeTeamId = isDominationFriendTurn(state) ? state.players[1].teamId : state.players?.[state.currentPlayer]?.teamId;

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
        if (discardChoiceIsCurrent() && t.id === pendingDiscardChoice.teamId && pendingDiscardChoice.canCreateNew) {
          chooseDiscardDestination(t.id);
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
    if (dominationFeatureEnabled(state, 'plus')) {
      let extraCardsDrawn = 0;
      const rewardsMap = { simple: 0, suja: 0, limpa: 1, real: 1, asas: 1 };
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
    if (dominationFeatureEnabled(state, 'vision') && t.id === 1) {
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

      const identityMarkup = `
              <div class="player-title-main">
                <div class="player-identity-chip ${roleClass}">
                  <span class="identity-copy">
                    <span class="identity-role">${t.name}</span>
                    <span class="identity-player-name">${pNames}</span>
                  </span>
                </div>
                <div class="player-title-badges">${mortoHtml}${extraCardsHtml}${powerStealHtml}</div>
              </div>`;
      if (!titleEl.querySelector('.title-score-cluster')) {
        titleEl.innerHTML = `${identityMarkup}<div class="title-score-cluster">
                <div id="liveMoney${i + 1}" class="live-money-badge"></div>
                <strong id="scoreTeam${i + 1}">${i === 0 ? s1 : s2}</strong>
              </div>`;
      } else if (titleEl._identityMarkup !== identityMarkup) {
        titleEl.querySelector('.player-title-main').outerHTML = identityMarkup;
      }
      titleEl._identityMarkup = identityMarkup;
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
      const discardCandidate = pendingDiscardChoice?.teamId === t.id && pendingDiscardChoice.indexes.includes(midx);
      div.classList.toggle('discard-target-choice', Boolean(discardCandidate));
      div.classList.toggle('locked-by-boss', isBossMeldLocked(state, t.id, midx));
      const possessed = isBossMeldPossessed(state, t.id, midx);
      div.classList.toggle('possessed-by-boss', possessed);
      const stableMeldId = state.boss?.meldIdsByPosition?.[`${t.id}:${midx}`];
      const mInfo = classifyMeldForUi(meld);
      const contribution = isCurrentBossMode() ? getBossMeldContribution(state, t.id, midx) : null;
      const natureThreats = isCurrentBossMode() ? getBossMeldNatureThreats(state, t.id, midx) : [];
      const bossMeldUi = isCurrentBossMode()
        ? getBossMeldUiModel(state.boss?.id, {
            boss: state.boss,
            players: state.players,
            teamId: t.id,
            meldIndex: midx,
            meldId: stableMeldId,
            contributionMeldId: contribution?.meldId || null,
            meldInfo: mInfo,
            natureThreats,
          })
        : null;

      applyBossMeldUiSurface(div, bossMeldUi?.divClasses, bossMeldUi?.divDataset);

      const neheleniaMirror = bossMeldUi?.mirror || null;
      const neheleniaMirrorLabel = neheleniaMirror?.label || '';
      const neheleniaMirrorChoice = !!neheleniaMirror?.choice;
      const neheleniaIntent = neheleniaMirror?.intent || null;
      const neheleniaMirrorAnimationKey = neheleniaMirrorChoice ? neheleniaMirrorMeldAnimationKey(neheleniaIntent, t.id, midx) : '';
      const neheleniaMirrorSplitComplete = !neheleniaMirrorChoice || locallyAnimatedNeheleniaMirrorMelds.has(neheleniaMirrorAnimationKey);

      const row = document.createElement('div');
      row.className = 'meld-line-cards';
      applyBossMeldUiSurface(row, bossMeldUi?.rowClasses, bossMeldUi?.rowDataset);
      applyBossMeldEffectFrame(div, row);
      // Se for uma canastra Ás-a-Ás, injeta o visual BDSM de destaque
      if (mInfo && mInfo.kind === 'asas') {
        div.classList.add('canastra-asas-bdsm');
        div.classList.add('compact-asas');
        row.classList.add('asas-stack');
        row.title = `Canastra Ás-a-Ás · ${meld.length} cartas`;
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
        if (mInfo?.kind === 'asas') {
          miniCard.className = `carta mini back back-${card.back === 'blue' ? 'blue' : 'red'}`;
          miniCard.style.setProperty('--stack-step', Math.min(cardIndex, 4));
          miniCard.style.zIndex = cardIndex;
          miniCard.setAttribute('aria-hidden', 'true');
        } else miniCard.innerHTML = cardFrontHTML(card);
        applyBossMeldCardDecoration(miniCard, bossMeldUi?.cardDecoration, card.id || `${midx}:${cardIndex}`);

        row.appendChild(miniCard);
      });

      if (mInfo?.kind !== 'simple') {
        const lastCard = meld[meld.length - 1];

        if (lastCard && typeof lastCard === 'object') {
          const closedCard = document.createElement('div');

          closedCard.className = `carta mini canastra-fechada ${suitClass(lastCard)} ${deckFaceClass(lastCard)}`;
          if (mInfo?.kind === 'asas') {
            closedCard.classList.remove('canastra-fechada');
            closedCard.classList.add('asas-top');
            closedCard.style.setProperty('--stack-step', 5);
            closedCard.style.zIndex = meld.length;
          }

          closedCard.dataset.cardIndex = String(meld.length - 1);
          applyBossMeldCardDecoration(closedCard, bossMeldUi?.cardDecoration, lastCard.id || `${midx}:closed`);

          closedCard.innerHTML = cardFrontHTML(lastCard);

          row.appendChild(closedCard);
          if (mInfo?.kind === 'asas') {
            const count = document.createElement('span');
            count.className = 'asas-stack-count';
            count.textContent = `${meld.length} cartas`;
            row.appendChild(count);
          }
        } else {
          console.warn('[renderMelds] carta final inválida ignorada:', lastCard, {
            teamId: t.id,
            meldIndex: midx,
          });
        }
      }

      const meta = document.createElement('div');
      meta.className = 'meld-meta';
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
      const bossSpecificContribution = getBossMeldContributionUi(state.boss?.id, contribution);
      if (bossSpecificContribution) {
        contributionChips.push(contributionChip(bossSpecificContribution.type, bossSpecificContribution.value, bossSpecificContribution.icon, bossSpecificContribution.title));
      }
      const natureLabels = [...(bossMeldUi?.labels || [])];
      meta.innerHTML = `
              <span class="meld-meta-label">${mInfo.kind === 'asas' ? 'Ás-a-Ás' : `${mInfo.base}${mInfo.tag ? ` <span class="meld-tag ${mInfo.tag.cls}">${mInfo.tag.text}</span>` : ''}`}</span>
              ${contributionChips.length ? `<span class="boss-meld-contributions" data-meld-id="${contribution.meldId}">${contributionChips.join('')}</span>` : ''}
              ${natureLabels.join('')}
            `;

      div.appendChild(row);
      if (neheleniaMirrorChoice && neheleniaMirrorSplitComplete) {
        const realSlot = neheleniaIntent?.payload?.realSlot === 'right' ? 'right' : 'left';
        div.classList.add('nehelenia-mirror-twin', 'nehelenia-mirror-source');
        if (locallyAnimatingNeheleniaMirrorMelds.has(neheleniaMirrorAnimationKey)) div.classList.add('nehelenia-mirror-split-underlay');
        div.dataset.neheleniaMirrorSlot = realSlot;
        div.dataset.neheleniaMirror = `REFLEXO ${realSlot === 'left' ? 'I' : 'II'}`;
        row.dataset.neheleniaMirror = div.dataset.neheleniaMirror;
      } else if (neheleniaMirrorChoice) {
        div.classList.add('nehelenia-mirror-split-pending');
        div.dataset.neheleniaMirror = 'JOGO ESPELHADO';
        row.dataset.neheleniaMirror = 'JOGO ESPELHADO';
      }
      div.appendChild(meta);
      div.onclick = (ev) => {
        ev.stopPropagation(); // Impede o clique de vazar pro fundo da caixa

        if (neheleniaMirrorChoice) {
          if (!neheleniaMirrorSplitComplete) {
            showMessage('🪞 O jogo ainda está se dividindo no espelho.');
            return;
          }
          const slot = div.dataset.neheleniaMirrorSlot === 'right' ? 'right' : 'left';
          void resolveNeheleniaMirrorVisualChoice(slot, t.id, midx, div);
          return;
        }
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
          showMessage(bossUseMeldDeniedMessage(meLocal.id, midx));
          resetDeniedCardSelection();
          return;
        }

        if (discardChoiceIsCurrent() && pendingDiscardChoice.teamId === t.id) {
          chooseDiscardDestination(t.id, midx);
          return;
        }
        if (meLocal && t.id === meLocal.teamId && myTurnLocal && selectedHandIndexes.size > 0) {
          // ESTENDE O JOGO IMEDIATAMENTE
          selectedMeldTarget = key;
          makeMeldFromSelection(false);
        }
        // O 'else' que acendia a borda amarela foi aniquilado
      };
      retainedMeldKeys.add(key);
      const existing = stableMelds ? target.querySelector(`[data-meld-key="${key}"]`) : null;
      // Compare the requested render, not live DOM mutated by card flights
      // (visibility/transforms) or theme animations.
      const renderMarkup = div.outerHTML;
      let renderedMeld = div;
      if (existing && existing._meldRenderMarkup === renderMarkup) {
        existing.onclick = div.onclick; // Refresh closures without resetting animations.
        renderedMeld = existing;
      } else if (existing) {
        existing.replaceWith(div);
      } else {
        target.appendChild(div);
      }
      renderedMeld._meldRenderMarkup = renderMarkup;

      const oldMirrorClone = target.querySelector(`[data-nehelenia-clone-for="${key}"]`);
      if (neheleniaMirrorChoice && neheleniaMirrorSplitComplete) {
        const realSlot = neheleniaIntent?.payload?.realSlot === 'right' ? 'right' : 'left';
        const cloneSlot = realSlot === 'left' ? 'right' : 'left';
        renderedMeld.classList.remove('nehelenia-mirror-split-pending');
        renderedMeld.classList.add('nehelenia-mirror-twin', 'nehelenia-mirror-source');
        renderedMeld.dataset.neheleniaMirrorSlot = realSlot;
        renderedMeld.dataset.neheleniaMirror = `REFLEXO ${realSlot === 'left' ? 'I' : 'II'}`;
        renderedMeld.onclick = (ev) => {
          ev.stopPropagation();
          void resolveNeheleniaMirrorVisualChoice(realSlot, t.id, midx, renderedMeld);
        };

        const clone = renderedMeld.cloneNode(true);
        clone.removeAttribute('data-meld-key');
        clone.dataset.neheleniaCloneFor = key;
        clone.dataset.neheleniaMirrorSlot = cloneSlot;
        clone.dataset.neheleniaMirror = `REFLEXO ${cloneSlot === 'left' ? 'I' : 'II'}`;
        clone.querySelector('.nehelenia-mirror-card-frame')?.setAttribute('data-nehelenia-mirror', clone.dataset.neheleniaMirror);
        clone.classList.remove('nehelenia-mirror-source');
        clone.classList.add('nehelenia-mirror-clone');
        if (locallyAnimatingNeheleniaMirrorMelds.has(neheleniaMirrorAnimationKey)) clone.classList.add('nehelenia-mirror-split-underlay');
        clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        clone.onclick = (ev) => {
          ev.stopPropagation();
          void resolveNeheleniaMirrorVisualChoice(cloneSlot, t.id, midx, clone);
        };
        oldMirrorClone?.remove();
        if (realSlot === 'left') renderedMeld.after(clone);
        else renderedMeld.before(clone);
      } else {
        oldMirrorClone?.remove();
        if (neheleniaMirrorChoice) scheduleNeheleniaMirroredMeldSplit(neheleniaIntent, t.id, midx);
      }
    });
  });

  if (stableMelds)
    for (const container of [m1, m2]) {
      for (const node of container.querySelectorAll('[data-meld-key]')) {
        if (!retainedMeldKeys.has(node.dataset.meldKey)) node.remove();
      }
      for (const clone of container.querySelectorAll('[data-nehelenia-clone-for]')) {
        if (!retainedMeldKeys.has(clone.dataset.neheleniaCloneFor)) clone.remove();
      }
    }

  scheduleMatriarchGraftLinks();

  if (typeof window.lastScores === 'undefined') window.lastScores = [0, 0];

  function triggerScoreAnim(teamIndex, oldScore, newScore) {
    const scoreEl = document.getElementById(`scoreTeam${teamIndex + 1}`);
    if (scoreEl._scoreTarget === newScore) return;
    scoreEl._scoreTarget = newScore;
    const animationId = (scoreEl._scoreAnimationId || 0) + 1;
    scoreEl._scoreAnimationId = animationId;
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
      if (!scoreEl.isConnected || scoreEl._scoreAnimationId !== animationId) return;
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

    for (const [index, grow] of [grow1, grow2].entries()) {
      const winner = level > 0 && (index === 0 ? s1 > s2 : s2 > s1);
      for (let i = 0; i <= 6; i++) {
        grow.classList.toggle('dom-nivel-' + i, level === 0 ? i === 0 : winner && i === level);
      }
      grow.classList.toggle('has-brasao', winner);
      grow.classList.toggle('dom-dominador', winner);
      grow.classList.toggle('dom-escravo', level > 0 && !winner);
      if (!winner) document.getElementById(`statusDom${index + 1}`)?.remove();
    }
    if (boardMelds) boardMelds.classList.toggle('has-domination-status', level > 0);

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
      if (level > 0) {
        let status = document.getElementById(statusId);
        if (!status) {
          winnerGrow.insertAdjacentHTML('afterbegin', brasaoHtml.replace('statusDom_ID_AQUI', statusId));
          status = document.getElementById(statusId);
        }
        if (status.dataset.level !== String(level)) {
          status.className = `brasao-dominacao ${levelClass}`;
          status.dataset.level = String(level);
          status.style.setProperty('--brasao-runtime-accent', glowColor);
          status.querySelectorAll('.coroa-slot').forEach((crown, i) => crown.classList.toggle('active', i < level));
          status.querySelector('.brasao-titulo').textContent = statusText;
        }
        const points = status.querySelector('.brasao-pontos');
        if (points.textContent !== `+${diff}`) points.textContent = `+${diff}`;
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
        total += 15.0;
        b.base = 15.0;
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
      // MetaPix is shared: follow the scoreboard leader, never the local seat.
      // At game end, use the final scores (including hand/dead/finish penalties
      // and bonuses), just like the existing financial result screen.
      const leaderScores = state.finished ? [proj1, proj2] : [s1, s2];
      const leaderId = leaderScores[0] === leaderScores[1] ? null : leaderScores[0] > leaderScores[1] ? 0 : 1;
      const leaderWinsGoal = leaderId !== null;
      const refName = leaderWinsGoal ? state.teams[leaderId].name : 'Empate — sem líder';
      let refFin = leaderId === 1 ? fin2 : fin1;
      if (!leaderWinsGoal) {
        // Neutral display only; do not change either team's calculated values.
        refFin = { total: 0, b: Object.fromEntries(Object.keys(fin1.b).map((key) => [key, 0])) };
      } else if (state.finished) {
        const rivalId = 1 - leaderId;
        refFin = window.calculatePixFin(
          leaderScores[leaderId],
          leaderScores[rivalId],
          state.teams[leaderId].melds,
          state.teams[rivalId].melds,
          state.deadChunksTaken?.[leaderId] ?? 0,
          (state.deadChunksTaken?.[rivalId] ?? 0) > 0,
          leaderScores[leaderId],
          leaderScores[rivalId],
        );
      }

      let achievedCount = 0;
      if (leaderWinsGoal) achievedCount++;
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

      // Both clients identify the same leader at the top of the goals table.
      const nameEl = document.getElementById('winnerNameHud');
      if (nameEl) {
        nameEl.textContent = `(${refName})`;
      }

      // Display the leader's financial goals on both clients.
      document.getElementById('goalsTotalHud').textContent = 'R$ ' + refFin.total.toFixed(2).replace('.', ',');

      const counterEl = document.getElementById('goalsCounterHud');
      if (counterEl) {
        counterEl.textContent = `(${achievedCount}/8)`;
        counterEl.style.color = achievedCount === 8 ? '#4ade80' : '#94a3b8';
      }

      // Renderiza a lista de itens baseada na referência calculada incluindo a Soberania dos Mortos
      const list = document.getElementById('goalsListHud');
      list.innerHTML = `
                        <div class="goal-item ${leaderWinsGoal ? 'achieved' : ''}">
                            <span>✅ Vitória (R$ 15)</span>
                            <strong>+R$ ${leaderWinsGoal ? '15,00' : '0,00'}</strong>
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

  const scoreCard = document.querySelector('#scoreSection .score-card');
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

let turnScopedMessage = null;

function showMessage(msg, { turnScoped = false, playerIndex = null, turnNumber = null } = {}) {
  const message = document.getElementById('message');
  if (message) message.textContent = msg;
  turnScopedMessage = turnScoped
    ? {
        playerIndex: playerIndex ?? state?.currentPlayer ?? null,
        turnNumber: turnNumber ?? state?.turnNumber ?? null,
      }
    : null;
}

function showBotTurnMessage(msg) {
  showMessage(msg, {
    turnScoped: true,
    playerIndex: state?.currentPlayer ?? null,
    turnNumber: state?.turnNumber ?? null,
  });
}

function syncTurnScopedFeedback({ isMyTurnRightNow = false, currentName = '' } = {}) {
  if (!turnScopedMessage || !state) return;
  const stale = turnScopedMessage.turnNumber !== state.turnNumber || turnScopedMessage.playerIndex !== state.currentPlayer;
  if (!stale) return;

  turnScopedMessage = null;
  const message = document.getElementById('message');
  if (!message) return;

  if (isMyTurnRightNow) {
    message.textContent = state.hasDrawnThisTurn ? 'Sua vez: você já comprou. Jogue se quiser e descarte 1 carta para encerrar.' : 'Sua vez: compre do Monte ou do Lixo.';
    return;
  }
  if (isBossTurnActive(state)) {
    message.textContent = `${getBossDefinition(state.boss?.id)?.name || 'O chefe'} está preparando a ação da rodada.`;
    return;
  }
  message.textContent = currentName ? `Vez de ${currentName}.` : '';
}

function renderRemoteHandEmptyBeforeDeadPickup(playerId) {
  const id = String(playerId);
  const root = ['opponentTop', 'opponentLeft', 'opponentRight'].map((rootId) => document.getElementById(rootId)).find((seat) => seat?.dataset?.playerId === id);
  if (!root) return;

  root.querySelector('.opponent-cards')?.replaceChildren();

  const player = state?.players?.find((candidate) => String(candidate?.id) === id);
  const label = root.querySelector('.opponent-label');
  if (label && player) label.textContent = `${player.name} (0)`;
}

async function playRemoteAction(a) {
  if (!state || !a) return;
  if (a.type === 'friendTurn') return playFriendTurnPresentation(a);

  const isFriend = a.playerId === 'friend' && state.mode === '1x1_dominacao';
  const friendSessionId = window.gameSessionId;
  const flightStillActive = () => !isFriend || (friendSessionId === window.gameSessionId && !window.isClosingGame && (!a.friendId || getDominationFriend(state, a.friendId)?.active));
  const stockEl =
    document.querySelector(isFriend ? '#dominationFriendStock .opponent-card-back' : '#drawStockBtn .pile-card') ||
    (isFriend ? document.getElementById('dominationFriendStock') : a.type === 'dominatorBonus' ? document.getElementById('drawStockBtn') : null);
  const discardEl = document.querySelector('#drawDiscardBtn .pile-card');
  const dead0El = document.getElementById('mortoSlot0');
  const dead1El = document.getElementById('mortoSlot1');

  const stockRect = stockEl ? getRect(stockEl) : null;
  const discardRect = discardEl ? getRect(discardEl) : null;
  const handRect = opponentAnchorRect(a.playerId, a.friendId);
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
      // O snapshot novo ainda não foi aplicado durante a apresentação remota.
      // Esvazia só a mão visual antiga antes do voo do Morto.
      renderRemoteHandEmptyBeforeDeadPickup(a.playerId);
      const fromEl = a.tookDead.deadIndex === 1 ? dead1El : dead0El;
      const fromR = fromEl ? getRect(fromEl) : null;
      if (fromR && handRect) {
        if (fromEl) fromEl.style.opacity = '0'; // Esconde a pilha original na hora do voo
        await flyRectToRect(fallbackCard, fromR, handRect, 'back');
        impactAtRect(handRect);
      }
    }
  };

  const animateRemotePlayerDraws = async () => {
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

          await flyRectToRect(cardVisual, fromRect, handRect, isSteal ? 'front' : 'back', cardData?._silentAsAsBonus === true || (a.type === 'dominatorBonus' && a.kind === 'asas'));
          impactAtRect(handRect);

          if (i < a.drawnCards.length - 1) await new Promise((r) => setTimeout(r, 180));
        }
      }
    }
  };

  const animateRemoteDrawsIfAny = () => Promise.all([animateRemotePlayerDraws(), a.friendBonus ? playDominationFriendSharedDraw(a.friendBonus) : Promise.resolve()]);

  const animateRemoteFinancedCards = async () => {
    const financedCards = a.bossExtraCards || [];
    if (!financedCards.length || !stockRect) return;
    for (let i = 0; i < financedCards.length; i++) {
      await flyRectToRect(financedCards[i], stockRect, handRect, 'back');
      impactAtRect(handRect);
      if (i < financedCards.length - 1) await new Promise((resolve) => setTimeout(resolve, 220));
    }
    const playerName = state.players?.find((player) => player.id === a.playerId)?.name || 'Jogador';
    showMessage(
      financedTariffMessage(
        a.bossEvent || {
          count: financedCards.length,
          cardLabels: financedCards.map((card) => `${card.rank || ''}${card.suit || ''}`),
          debtPerCard: state.boss?.phase === 3 ? 7 : 5,
        },
        playerName,
      ),
    );
  };

  if (a.type === 'dominatorBonus' && state.mode === '1x1_dominacao') {
    await animateRemoteRecycleIfAny();
    await animateRemoteDrawsIfAny();
    return;
  }

  if (a.type === 'dominationDecree') {
    const lockPresentation = animateDominationDecreeLockToDiscard({ force: true, persist: false });
    if (myPlayerIndex === 0) {
      showMessage('🔒 O Dominador bloqueou o Lixo. Compre do Monte.');
      if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    } else if (myPlayerIndex === 1) {
      presentDecreeFocus(true);
      playDominationSearchSound();
      setTimeout(() => presentDecreeFocus(false), 1400);
      showMessage('🔒 Lixo bloqueado neste turno.');
    }
    await lockPresentation;
    return;
  }

  if (a.type === 'dominationSearch') {
    if (myPlayerIndex !== 1 || state.players[1]?.name?.toUpperCase().includes('BOT')) playDominationSearchSound();
    const source = document.querySelector(a.source === 'auxiliary' ? '#dominationFriendStock .opponent-card-back' : '#drawStockBtn .pile-card');
    if (source && a.card) {
      await flyRectToRect(a.card, getRect(source), handRect, 'front');
      if (friendSessionId === window.gameSessionId && !window.isClosingGame) impactAtRect(handRect);
    }
    return;
  }

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
    if (isFriend && a.reason === 'canastra' && !a.drawIndex) {
      const label = { limpa: 'Limpa', real: 'Real', asas: 'Ás-a-Ás' }[a.kind] || a.kind;
      showMessage(`👠 ${getDominationFriend(state, a.friendId)?.name || 'Amiga'}: ${label}! +${a.drawTotal || a.cards.length} carta(s) do monte auxiliar.`);
    }
    if (a.recycledDeadIndex !== null && a.recycledDeadIndex !== undefined) {
      const deadEl = a.recycledDeadIndex === 1 ? dead1El : dead0El;
      if (deadEl && stockRect) {
        await flyRectToRect(fallbackCard, getRect(deadEl), stockRect, 'back');
        impactAtRect(stockRect);
      }
    }

    const drawCount = isFriend ? a.cards.length : Math.max(0, (a.count || 1) - (a.bossExtraCards?.length || 0));
    for (let i = 0; i < drawCount; i++) {
      if (!flightStillActive()) return;
      if (stockRect) await flyRectToRect(isFriend ? a.cards[i] : fallbackCard, stockRect, handRect, 'back', a.reason === 'canastra' && a.kind === 'asas');
      if (!flightStillActive()) return;
      impactAtRect(handRect);
      if (i < drawCount - 1) await new Promise((r) => setTimeout(r, 180)); // Pequeno delay pra ver as cartas separadas
    }
    await animateRemoteFinancedCards();
    return;
  }

  if (a.type === 'drawDiscard') {
    if (isFriend) {
      const source = document.querySelector('#dominationFriendDiscard .friend-discard-face');
      if (!source || !flightStillActive()) return;
      await flyRectToRect(a.card || a.cards?.at(-1) || fallbackCard, getRect(source), handRect, 'front');
      if (flightStillActive()) impactAtRect(handRect);
      return;
    }
    if (a.discardPresentation) {
      await animateDiscardTransfer({ ...a.discardPresentation, fromDiscard: discardRect, fromHand: () => handRect, toHand: () => handRect, toMeld: () => null, fly: flyRectToRect, isActive: flightStillActive });
    } else if (discardRect) {
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
    if (isFriend) {
      const target = document.querySelector('#dominationFriendDiscard .friend-discard-face');
      if (!target) return;
      const destination = getRect(target);
      await flyRectToRect(a.card, handRect, destination, 'front');
      if (!flightStillActive()) return;
      target.innerHTML = cardFrontHTML(a.card);
      target.className = `friend-discard-face discard-face has-card ${suitClass(a.card)} ${deckFaceClass(a.card)}`;
      target.style.color = ['♥', '♦'].includes(a.card.suit) ? '#b91c1c' : '#111';
      impactAtRect(destination);
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        const landing = target.animate([{ transform: 'rotate(-8deg) scale(1.12)' }, { transform: 'rotate(3deg) scale(.97)', offset: 0.6 }, { transform: 'rotate(0) scale(1)' }], { duration: 320, easing: 'ease-out' });
        await landing.finished.catch(() => {});
      }
      return;
    }
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
    if (a.discardPresentation) {
      const presentation = a.discardPresentation;
      const key = `${presentation.teamId}:${presentation.meldIndex}`;
      const panel = document.getElementById(presentation.teamId === 0 ? 'meldsP1' : 'meldsP2');
      const panelRect = panel ? getRect(panel) : null;
      const destination = meldDropRect(key) || (panelRect ? { left: panelRect.left + 20, top: panelRect.top + 15, width: 28, height: 40 } : null);
      await animateDiscardTransfer({ ...presentation, fromDiscard: discardRect, fromHand: () => handRect, toHand: () => handRect, toMeld: () => destination, fly: flyRectToRect, isActive: flightStillActive });
    }
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
        return flyRectToRect(c, handRect, toRect, 'front').then(() => {
          if (flightStillActive()) impactAtRect(toRect);
        });
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
        return flyRectToRect(c, handRect, toRect, 'front').then(() => {
          if (flightStillActive()) impactAtRect(toRect);
        });
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
function chooseBotDominationSteal(gameState) {
  const hand = gameState.players[1].hand;
  const melds = gameState.teams[gameState.players[1].teamId].melds;
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let best = null;
  let bestValue = -Infinity;
  for (const card of gameState.players[0].hand) {
    let value = card.joker ? 25 : card.rank === '2' ? 20 : 0;
    for (const base of melds) {
      const after = friendMeldRules.prepare([...base, card]);
      if (!friendMeldRules.valid(after) || after.some((c) => friendMeldRules.isWild(c, after))) continue;
      const kind = friendMeldRules.classify(after);
      value = Math.max(value, 100 + after.length * 10 + ({ limpa: 500, real: 1500, asas: 3000 }[kind] || 0));
    }
    value += hand.filter((c) => !c.joker && c.suit === card.suit && Math.abs(ranks.indexOf(c.rank) - ranks.indexOf(card.rank)) <= 2).length * 15;
    for (let i = 0; i < hand.length; i++)
      for (let j = i + 1; j < hand.length; j++) {
        const meld = friendMeldRules.prepare([hand[i], hand[j], card]);
        if (friendMeldRules.valid(meld)) value = Math.max(value, meld.some((c) => friendMeldRules.isWild(c, meld)) ? 40 : 90);
      }
    if (value > bestValue) {
      best = card;
      bestValue = value;
    }
  }
  return best;
}

async function executeBotDominationPowers(engine, botIndex) {
  const eligible = () => engine.isActive() && state?.mode === '1x1_dominacao' && botIndex === 1 && state.currentPlayer === 1 && !state.finished && !state.debugPaused && !state.surrender?.active && state.players[1].name.toUpperCase().includes('BOT');
  if (!eligible()) return;
  if (shouldBotCallDominationFriend(state, friendMeldRules)) await performDominationFriendCall(1, true);
  if (!eligible() || state.hasDrawnThisTurn || !dominationFeatureEnabled(state, 'vision') || (state.dominatorUsedPower && !state.powerActiveThisTurn) || !state.players[0].hand.length) return;
  // Persist activation before stealing: a resumed turn can finish the remaining
  // purchase, but can never activate the once-per-match power a second time.
  state.dominatorUsedPower = true;
  state.powerActiveThisTurn = true;
  await engine.commitState();
  for (let i = 0; i < 2 && eligible() && !state.hasDrawnThisTurn; i++) {
    if (!dominationFeatureEnabled(state, 'vision')) break;
    const card = chooseBotDominationSteal(state);
    if (!card) break;
    const victim = state.players[0];
    victim.hand.splice(
      victim.hand.findIndex((c) => c.id === card.id),
      1,
    );
    state.players[1].hand.push(card);
    sortHand(state.players[1].hand);
    (state.boughtCardIds ||= []).push(card.id);
    let escravoAutoDraw = null;
    if (!victim.hand.length) {
      if (!state.stock.length) await recycleDeadToStockIfPossible();
      if (!eligible()) return;
      if (state.stock.length) {
        const replacement = state.stock.pop();
        ensureCardId(replacement);
        victim.hand.push(replacement);
        escravoAutoDraw = packCard(replacement);
      } else {
        await finishGame(teamHasGoodCanastra(victim.teamId) ? victim.teamId : 1);
        return;
      }
    }
    if (state.partialDraw) {
      state.hasDrawnThisTurn = true;
      state.partialDraw = false;
      state.powerActiveThisTurn = false;
    } else state.partialDraw = true;
    state.lastAction = { id: newActionId(), type: 'stealCard', playerId: 1, card: packCard(card), escravoAutoDraw, ts: Date.now() };
    engine.showMessage(`👁️ ${state.players[1].name} usou a Visão do Dominador!`);
    await engine.commitState();
    await BuracoBot.sleep(900, engine);
  }
}

const botEngine = {
  getState: () => state,
  isActive: () => !window.isClosingGame && !localExitPending && !!state,
  commitState: async () => commitState(),
  showMessage: (msg) => showBotTurnMessage(msg),
  computeTeamMeldScore: (team) => computeTeamMeldScore(team),
  isValidSequenceMeld: (cards) => isValidSequenceMeld(cards),
  canTeamTakeDeadNow: (teamId) => canTeamTakeDeadNow(teamId),
  teamHasGoodCanastra: (teamId) => teamHasGoodCanastra(teamId),
  canSafelyFinishBoss: () => {
    if (!isCurrentBossMode() || !state?.boss || state.boss.result) return true;
    try {
      const probe = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
      applyBossFinalStrike(probe, getCooperativeProjectedScore());
      return probe.boss?.result?.victory === true;
    } catch (error) {
      console.warn('[BOT-BOSS] Não foi possível simular o ataque final; mantendo a partida aberta.', error);
      return false;
    }
  },
  isDiscardBlocked: () => isBossDiscardBlocked(state) || isDominationDiscardDecreeActive(state, state.currentPlayer),
  quoteDiscardPickup: (playerId, destination) => quoteBossDiscardPickup(state, playerId, destination),
  isMeldLocked: (teamId, meldIndex) => isBossMeldLocked(state, teamId, meldIndex) || !canBossUseMeld(state, state.currentPlayer, meldIndex),
  isCardBlocked: (playerId, cardId, action = 'play') => isBossCardBlocked(state, playerId, cardId, action),
  canCreateMeld: (playerId) => canBossCreateMeld(state, playerId),
  hasPendingBossChoice: () => hasPendingBossChoices(state),
  getNaturePriorities: (playerId) => getBossNaturePriorities(state, playerId),
  getDominatrixPriorities: (playerId) => getBossDominatrixPriorities(state, playerId),
  getDimitrescuPriorities: (playerId) => getBossDimitrescuPriorities(state, playerId),
  getNeheleniaPriorities: (playerId) => getBossNeheleniaPriorities(state, playerId),
  getCombatPriorities: (playerId) => getBossCombatPriorities(state, playerId),
  shouldTakeBossDiscard: (playerId, intent, naturePlan) => shouldBossBotTakeDiscard(state, playerId, { intent, naturePlan }),
  async executeDominationPowers(botIndex) {
    await executeBotDominationPowers(this, botIndex);
  },

  async resolvePendingBossChoice(playerId) {
    const choice = getBossPendingChoice(state, playerId);
    if (!choice) return null;
    const player = state.players.find((entry) => entry.id === playerId);
    const hasCanastra = state.teams?.[0]?.melds?.some((meld) => meld?.length >= 7);
    let option = choice.options[0];
    if (choice.type === 'fixed_interest_payment' || choice.type === 'banker_collateral_card') {
      option = chooseBossFixedInterestBotOption(state, choice) || option;
    }
    if (state.boss?.id === 'nehelenia' && ['false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare'].includes(choice.type) && choice.correctOption) {
      if (choice.type === 'discard_mirror') {
        // Espelho do Lixo é deliberadamente 50/50: nem o bot recebe a resposta.
        const options = choice.options || [];
        option = options.length ? options[(Number(state.turnNumber || 0) + Number(state.boss?.actionSequence || 0) + Number(playerId || 0)) % options.length] : option;
      } else {
        // Nas ilusões de memória, o bot modela o acompanhamento visual da carta original.
        option = choice.correctOption;
      }
    }
    const dominatrixBotChoice = state.boss?.id === 'dominadora' ? BossBuracoBot.chooseDominatrixPendingChoice(state, playerId, choice) : null;
    if (dominatrixBotChoice && choice.options.includes(dominatrixBotChoice)) {
      option = dominatrixBotChoice;
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
    const combatPlan = getBossCombatPriorities(s, me.id);
    if (combatPlan?.avoidMeldIndexes?.includes(meldIndex) && combatPlan.infection + combatPlan.impactCost >= 100) return false;
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
        friendBonus: domReward?.friendBonus || null,
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
    const mirrorIntent = s.boss?.id === 'nehelenia' && s.boss.currentIntent?.abilityId === 'mirrored_meld' ? s.boss.currentIntent : null;
    if (mirrorIntent?.payload?.targetPlayerId === me.id && Number(mirrorIntent.payload?.meldIndex) === Number(meldIndex) && !mirrorIntent.payload?.resolved) {
      if (cards.length !== 1) return false;
      const deterministicPick = ((Number(s.turnNumber) || 0) + (Number(s.boss?.actionSequence) || 0) + String(cards[0]?.id || '').length) % 2 ? 'right' : 'left';
      const mirrorDecision = resolveNeheleniaMirroredMeldChoice(s, me.id, deterministicPick, cards[0]?.id);
      if (!mirrorDecision?.allowed) return false;
      if (!mirrorDecision.real) {
        s.lastAction = {
          id: newActionId(),
          type: 'neheleniaMirrorTrap',
          playerId: botIndex,
          card: packCard(cards[0]),
          meldIndex,
          fakeSlot: deterministicPick,
          bossEvent: mirrorDecision.event || null,
          ts: Date.now(),
        };
        await this.commitState();
        return true;
      }
    }
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
        friendBonus: domReward?.friendBonus || null,
        bossEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
  },

  async executeDrawStock(botIndex) {
    const s = this.getState();
    if (!s) return;
    if (s.hasDrawnThisTurn) return false;
    const me = s.players[botIndex];
    const botVault = getBossVault(s, botIndex);
    if (botVault && (isBossVaultDrawRequired(s, botIndex) || shouldBossBotReclaimVault(s, botIndex))) {
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
    const vaultInterestEvent = deferBossVault(s, botIndex);

    sortHand(me.hand);
    s.hasDrawnThisTurn = true;
    s.partialDraw = false;

    const freshS = this.getState();
    notifyBossPurchaseCompleted(s, me.id);
    if (freshS && drawnCards.length > 0) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'drawStock',
        playerId: botIndex,
        card: packCard(drawnCards[drawnCards.length - 1]),
        count: drawnCards.length,
        bossExtraCards: bossExtraCards.map(packCard),
        bossEvent: financedEvent,
        bossVaultEvent: vaultInterestEvent,
        recycledDeadIndex: recycledIndex,
        ts: Date.now(),
      };
      await this.commitState();
    }
  },

  async executeDrawDiscard(botIndex) {
    let s = this.getState();
    if (!s) return false;
    // Boss pickups require a validated destination; never use the open shortcut.
    if (isBossMode(s.mode)) return false;
    if (s.hasDrawnThisTurn) return false;
    if (isBossDiscardBlocked(s) || isDominationDiscardDecreeActive(s, botIndex)) return false;
    if (await waitForDominationDecreeReaction(botIndex)) return false;
    s = this.getState();
    if (!s || s.hasDrawnThisTurn || isDominationDiscardDecreeActive(s, botIndex)) return false;
    if (!Array.isArray(s.discard) || s.discard.length === 0) {
      console.warn('[BOT] executeDrawDiscard chamado com lixo vazio. Possível jogada duplicada.');
      return false;
    }
    const me = s.players[botIndex];
    if (getBossVault(s, botIndex) && shouldBossBotReclaimVault(s, botIndex)) {
      const vaultEvent = reclaimBossVault(s, botIndex);
      if (!vaultEvent) return false;
      s.lastAction = { id: newActionId(), type: 'bossVaultReclaim', playerId: botIndex, bossEvent: vaultEvent, ts: Date.now() };
      await this.commitState();
      return true;
    }
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
    const vaultInterestEvent = deferBossVault(s, botIndex);

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
        discardPresentation: { cards: pile.map(packCard) },
        card: packCard(topCard),
        count: pile.length,
        bossExtraCards: bossExtraCards.map(packCard),
        bossFinanceEvent: surchargeDecision.event,
        bossEvent: financedEvent,
        bossVaultEvent: vaultInterestEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
    return true;
  },

  async executeDrawDiscardFechado(botIndex, intent) {
    let s = this.getState();
    if (!s) return false;
    if (s.hasDrawnThisTurn) return false;
    if (isBossDiscardBlocked(s) || isDominationDiscardDecreeActive(s, botIndex)) return false;
    if (await waitForDominationDecreeReaction(botIndex)) return false;
    s = this.getState();
    if (!s || s.hasDrawnThisTurn || isDominationDiscardDecreeActive(s, botIndex)) return false;
    if (!Array.isArray(s.discard) || s.discard.length === 0) {
      console.warn('[BOT] executeDrawDiscardFechado chamado com lixo vazio. Possível jogada duplicada.');
      return false;
    }
    const me = s.players[botIndex];
    if (getBossVault(s, botIndex) && shouldBossBotReclaimVault(s, botIndex)) {
      const vaultEvent = reclaimBossVault(s, botIndex);
      if (!vaultEvent) return false;
      s.lastAction = { id: newActionId(), type: 'bossVaultReclaim', playerId: botIndex, bossEvent: vaultEvent, ts: Date.now() };
      await this.commitState();
      return true;
    }
    const team = s.teams[me.teamId];
    if (!['extend', 'new'].includes(intent?.action)) return false;
    const selectedIndexes = intent.action === 'new' || isBossMode(s) ? (intent.handIndexes || []) : [];
    const selectedHandCards = selectedIndexes.map(index => me.hand[index]).filter(Boolean);
    if (selectedHandCards.length !== selectedIndexes.length || new Set(selectedIndexes).size !== selectedIndexes.length) return false;
    if (selectedHandCards.some(card => isBossCardBlocked(s, me.id, card.id, 'play'))) return false;
    if (intent.action === 'extend' && !canBossUseMeld(s, me.id, intent.meldIndex)) return false;
    if (intent.action === 'new') {
      if (!canBossCreateMeld(s, me.id)) return false;
      if (selectedHandCards.length !== (intent.handIndexes || []).length) return false;
      if (selectedHandCards.some((card) => isBossCardBlocked(s, me.id, card.id, 'play'))) return false;
    }
    const pickupQuote = isBossMode(s) ? quoteBossDiscardPickup(s, me.id, {
      meldIndex: intent.action === 'extend' ? intent.meldIndex : null, handCardIds: selectedHandCards.map(card => card.id),
    }) : { allowed: true, count: s.discard.length };
    if (!pickupQuote.allowed) return false;
    const bossMeldValidation = validateBossMeldPlay(s, me.id, selectedHandCards, s.discard.slice(s.discard.length - pickupQuote.count, -1));
    if (!bossMeldValidation.allowed) return false;
    const previewTop = s.discard[s.discard.length - 1];
    const previewAddedCards = [...selectedHandCards, previewTop];
    const previewOldKind = intent.action === 'extend' ? classifyMeldForUi(team.melds[intent.meldIndex]).kind : 'simple';
    const previewMeld = intent.action === 'extend' ? [...team.melds[intent.meldIndex], ...previewAddedCards] : previewAddedCards;
    const previewNewKind = classifyMeldForUi(previewMeld).kind;
    const previewMeldIndex = intent.action === 'extend' ? intent.meldIndex : team.melds.length;
    const creditEligibleCardIds = selectedHandCards.map((card) => card.id);
    const futureHandSize = me.hand.length - selectedHandCards.length + pickupQuote.count - 1;
    if (isBossMode(s) && futureHandSize <= 1 && !canTeamTakeDeadNow(team.id)
      && !teamHasGoodCanastra(team.id) && !['limpa', 'real', 'asas'].includes(previewNewKind)) return false;
    if (!(await this.evaluateBossMeldMutation(botIndex, previewMeldIndex, previewOldKind, previewNewKind, previewAddedCards, { creditEligibleCardIds }))) return false;
    if (pickupQuote.message) this.showMessage(pickupQuote.message);
    const surchargeDecision = this.acceptBossDiscardSurcharge(me.id, intent, getBossNaturePriorities(s, me.id));
    if (!surchargeDecision.allowed) return false;
    const pile = s.discard.splice(s.discard.length - pickupQuote.count, pickupQuote.count);
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
      bossAddedCards = [...selectedHandCards, topCard];
      [...selectedIndexes].sort((a, b) => b - a).forEach(index => me.hand.splice(index, 1));
      team.melds[intent.meldIndex].push(...bossAddedCards);
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
    const vaultInterestEvent = deferBossVault(s, botIndex);

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
    notifyBossPurchaseCompleted(s, me.id);

    const freshS = this.getState();
    if (freshS) {
      freshS.lastAction = {
        id: newActionId(),
        type: 'drawDiscardFechado',
        playerId: botIndex,
        discardPresentation: { cards: pile.map(packCard), topCard: packCard(topCard), meldCards: bossAddedCards.map(packCard), teamId: team.id, meldIndex: targetIdx },
        tookDead,
        drawnCards: domReward?.drawnCards,
        friendBonus: domReward?.friendBonus || null,
        bossExtraCards: bossExtraCards.map(packCard),
        bossFinanceEvent: financedEvent || surchargeDecision.event,
        bossSurchargeEvent: surchargeDecision.event,
        bossEvent,
        bossVaultEvent: vaultInterestEvent,
        ts: Date.now(),
      };
      await this.commitState();
    }
    return true;
  },

  async executeDiscard(botIndex, cardIndex) {
    const s = this.getState();
    if (!s || s.finished || s.currentPlayer !== botIndex || !s.hasDrawnThisTurn || !canPerformCommonGameAction(s)) return false;
    const me = s.players[botIndex];
    if (!me?.hand?.[cardIndex]) return false;
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

    if (stockIsExhausted(s)) {
      await finishGame(null);
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
    if (!s || !me || s.finished || s.currentPlayer !== botIndex) return false;
    if (!me.hand.length) {
      await this._checkBotMortoOrWin(botIndex);
      if (s.finished) return true;
      if (!me.hand.length) return false;
    }
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

let gameSnapshotSequence = 0;
onSnapshot(gameRef, async (snap) => {
  const snapshotSequence = ++gameSnapshotSequence;
  if (!snap.exists()) {
    document.getElementById('pauseVoteOverlay')?.remove();
    resultPresented = false;
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
    accountSeatStamp = '';
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
    syncDominationMenuOptions(l.dominationOptions);
    setIfUnfocused('modeSelect', lobbyBoss ? COOPERATIVE_MENU_MODE : l.mode || '');
    if (lobbyBoss) setIfUnfocused('bossSelect', lobbyBoss.id);
    setIfUnfocused('variantSelect', l.variant || '');
    setIfUnfocused('deckThemeSelect', l.deckTheme || 'classico');
    setIfUnfocused('tableThemeSelect', l.tableTheme || 'feltro'); // Sincroniza inputs entre abas
    setIfUnfocused('betToggle', l.betToggle || '');
    setIfUnfocused('betBase', 15);
    setIfUnfocused('betPerPoint', l.betPerPoint || 0.01);
    if (l.names) {
      setIfUnfocused('p1Name', l.names[0] || '');
      setIfUnfocused('p2Name', l.names[1] || '');
      setIfUnfocused('p3Name', l.names[2] || '');
      setIfUnfocused('p4Name', l.names[3] || '');
    }

    // CHAMA A FUNÇÃO NOVA AQUI PARA ATUALIZAR A TELA COM OS DADOS DO BANCO
    window.updateMenuDynamic();
    void syncAccountSeat();

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
      if (!validateDominationFriendSelection(currentLobby.mode, currentLobby.dominationOptions)) {
        clearInterval(window.startTimer);
        window.startTimer = null;
        document.getElementById('countdownOverlay').style.display = 'none';
        return;
      }
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
            startGame(currentLobby.mode, currentLobby.names, currentLobby.variant, currentLobby.pixKeys, currentLobby.dominationOptions);
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
              startGame(currentLobby.mode, currentLobby.names, currentLobby.variant, currentLobby.pixKeys, currentLobby.dominationOptions);
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

  if (localActionGate.pending) await localActionGate.pending;
  if (snapshotSequence !== gameSnapshotSequence) return;

  const newState = normalizeDominationFriends(JSON.parse(data.stateJson));
  newState.matchStartedAt ||= data.createdAt?.toMillis?.() || Number(data.createdAt) || null;
  if (newState.finished) newState.matchFinishedAt ||= newState.lastAction?.ts || Number(data.updatedAt) || Date.now();
  if (newState.finished && !data.historySummary) void recoverFinishedHistory().catch((error) => console.warn('Histórico pendente: reconecte para tentar novamente.', error.code));
  normalizeLegacyDiscardPurchase(newState);
  if (newState.mode === '1x1_dominacao' && state?.friendGameId === newState.friendGameId && (newState.friendRevision || 0) < (state?.friendRevision || 0)) return;
  // Compatibilidade com partidas salvas enquanto existia o modal de posicao do coringa.
  delete newState.pendingWildcardChoice;
  newState.variant = normalizeVariantForMode(newState.mode, newState.variant);
  const wasPaused = pauseBlocksPlay(state);
  if (pauseBlocksPlay(newState)) {
    state = newState;
    if (!wasPaused) {
      botTurnController.abort();
      botTurnController = new AbortController();
      cancelPendingBotTurns();
    }
    window.lastBotTurnPlayed = null;
    if (window.botPlayTimeoutId) clearTimeout(window.botPlayTimeoutId);
    window.botPlayTimeoutId = null;
    renderAll();
    return;
  }
  if (wasPaused) window.lastBotTurnPlayed = null;
  if (newState.surrender?.active) {
    state = newState;
    if (!window.isClosingGame) invalidateGameSession({ stopMedia: false });
    renderSurrender();
    return;
  }

  if (!state || window.isClosingGame) activateGameSession();
  const snapshotSessionId = window.gameSessionId;
  // Do not let a repeated or newer snapshot cut across a guest's card flight.
  if (friendPlayback && newState.friendGameId === friendPlayback.gameId) {
    await friendPlayback.promise;
    if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
    if ((newState.friendRevision || 0) < (state?.friendRevision || 0)) return;
  }
  if (state && !state.finished && newState.finished) playCanastraSfx('fim');
  const arrivingFriends =
    state && state.friendGameId === newState.friendGameId && !friendOperationPending
      ? activeDominationFriends(newState).filter((friend) => friend.presentationUntil > Date.now() && !dominationFriends(state).some((previous) => previous.id === friend.id))
      : [];

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
  if (snapshotSequence !== gameSnapshotSequence) return;
  if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
  if (newState.mode === '1x1_dominacao' && state?.friendGameId === newState.friendGameId && (newState.friendRevision || 0) < (state?.friendRevision || 0)) return;
  const previousFriends = activeDominationFriends(state);
  state = newState;
  movingWild = null;
  selectedHandIndexes.clear();

  document.getElementById('configSection').style.display = 'none';
  document.getElementById('gameSection').style.display = 'flex';
  keepScreenAlive();

  toggleMenuVideos(false);
  syncTableAmbientMusic();

  renderAll();
  if (arrivingFriends.length) {
    try {
      await playFriendInvitationPresentation(arrivingFriends);
    } catch (error) {
      if (snapshotSessionId === window.gameSessionId && !window.isClosingGame) console.error('Falha na entrada da amiga:', error);
    }
    if (snapshotSessionId !== window.gameSessionId || window.isClosingGame) return;
  }
  startTurnTimerIfNeeded();
  for (const previous of previousFriends) {
    if (!getDominationFriend(state, previous.id)?.active) showMessage(`💋 ${previous.name} foi embora.`);
  }
  scheduleDominationFriend();

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
  } else if (!state.finished && !isBossLabAutomationPaused() && canPerformCommonGameAction(state) && !hasPendingBossChoices(state) && !isBossTurnActive(state)) {
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
          const scheduledBotIndex = state.currentPlayer;
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
            if (!canPerformCommonGameAction(state) || isBossTurnActive(state) || hasPendingBossChoices(state)) return;
            if (document.getElementById('gameSection').style.display !== 'flex') return;
            if (state.debugPaused) return; // 🛑 CORTA A IA IMEDIATAMENTE
            if (isBossLabAutomationPaused()) return;
            if (state.turnNumber !== scheduledTurn) return;
            if (state.currentPlayer !== scheduledBotIndex) return;

            window.lastBotTurnPlayed = state.turnNumber;
            const sessionEngine = createBotEngineForSession(scheduledSessionId, scheduledSignal);
            const BotController = botControllerForState(state);
            const activeBotTurn = { turnNumber: scheduledTurn, sessionId: scheduledSessionId, promise: null };
            window.activeBotTurn = activeBotTurn;
            const recoverIncompleteTurn = async () => {
              // A live revision can invalidate a plan without cancelling the match.
              // Wait for the Decree transaction/presentation before resuming.
              while (friendOperationPending && isGameSessionActive(scheduledSessionId, scheduledSignal) && state?.turnNumber === scheduledTurn && state?.currentPlayer === scheduledBotIndex && !state.finished) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              const live = state;
              const sameTurn = isGameSessionActive(scheduledSessionId, scheduledSignal) && live && !live.finished && live.turnNumber === scheduledTurn && live.currentPlayer === scheduledBotIndex;
              if (sameTurn && canPerformCommonGameAction(live) && !isBossTurnActive(live) && !hasPendingBossChoices(live)) {
                console.warn('[BOT] Rotina terminou sem avançar o turno; aplicando recuperação segura.');
                window.lastBotTurnPlayed = null;
                if (!live.hasDrawnThisTurn) await sessionEngine.executeDrawStock(scheduledBotIndex);
                if (isGameSessionActive(scheduledSessionId, scheduledSignal) && state?.turnNumber === scheduledTurn && state?.currentPlayer === scheduledBotIndex && !state.finished) await sessionEngine.recoverBotTurn(scheduledBotIndex);
              }
            };
            activeBotTurn.promise = BotController.playTurn(state, scheduledBotIndex, sessionEngine, { signal: scheduledSignal, sessionId: scheduledSessionId })
              .then(recoverIncompleteTurn)
              .catch(async (err) => {
                if (err?.code === 'BOT_PLAN_STALE') {
                  await recoverIncompleteTurn();
                  return;
                }
                if (BotController.isCancellationError(err)) return;
                console.error('Erro na Matrix:', err);
                window.lastBotTurnPlayed = null;
              })
              .finally(() => {
                if (window.activeBotTurn === activeBotTurn) window.activeBotTurn = null;
              });
          }, botDelay);
        }
      }
    }
  }
});

window.pushLobby = function () {
  applyCooperativeBossPreset();
  updateDominationFriendCapacity();
  const mode = getEffectiveMenuMode();
  const dominationOptions = readDominationMenuOptions();
  const resetReady = currentLobby && (currentLobby.mode !== mode || (mode === '1x1_dominacao' && JSON.stringify(normalizeDominationOptions(currentLobby.dominationOptions)) !== JSON.stringify(dominationOptions)));

  const pt1 = document.getElementById('pixTeam1');
  const pt2 = document.getElementById('pixTeam2');

  // Atualiza o cache seguro APENAS se o jogador tiver permissão para digitar
  if (!pt1.disabled) pt1.dataset.rawPix = pt1.value.trim();
  if (!pt2.disabled) pt2.dataset.rawPix = pt2.value.trim();

  const lobby = profileInLobby(
    {
      seatAccountIds: currentLobby?.seatAccountIds || ['', '', '', ''],
      mode: mode,
      dominationOptions,
      bossId: getBossDefinitionForMode(mode)?.id || null,
      variant: normalizeVariantForMode(mode, document.getElementById('variantSelect').value),
      deckTheme: document.getElementById('deckThemeSelect').value,
      tableTheme: document.getElementById('tableThemeSelect').value, // Sincroniza escolha no lobby do Firebase
      betToggle: document.getElementById('betToggle').value,
      betBase: document.getElementById('betBase').value,
      betPerPoint: document.getElementById('betPerPoint').value,
      names: [document.getElementById('p1Name').value, document.getElementById('p2Name').value, document.getElementById('p3Name').value, document.getElementById('p4Name').value],
      pixKeys: [pt1.dataset.rawPix || '', pt2.dataset.rawPix || ''],
    },
    myPlayerIndex,
    activeAccount,
  );

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
    const cooperativeRgb = bossDefinition?.id === 'dimitrescu' ? '185, 28, 28' : isDominatrixMenu ? '236, 72, 153' : '34, 197, 94';
    const cooperativeStyle = `position: relative; border-left: 4px solid ${cooperativeColor}; background: rgba(${cooperativeRgb}, 0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 5px; display: block;`;
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
  const myTeam = teamForSeat(mode, myPlayerIndex);

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
const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
let leaveDevTools;
if (isLocalDevelopment) {
  // Development keeps its original always-on panel, without production auth/exit.
  isDebugMode = true;
} else {
  const access = await import('./js/game/devtools-auth.js');
  access.installDevToolsAccessUI();
  isDebugMode = await access.hasDevToolsAccess();
  leaveDevTools = access.leaveDevTools;
}
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
  if (!isLocalDevelopment) {
    const exitDevTools = document.createElement('button');
    exitDevTools.id = 'exitDevToolsBtn';
    exitDevTools.type = 'button';
    exitDevTools.textContent = 'Sair do modo DEV';
    exitDevTools.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:2147483647;padding:8px 12px;background:#7f1d1d;color:white;border:1px solid #fca5a5;border-radius:8px;font-size:11px;';
    exitDevTools.addEventListener('click', leaveDevTools);
    document.body.append(exitDevTools);
  }
  window.toggleDebugPanel(true);
  // 🔥 Exibe o painel de atalhos rápidos do menu principal
  const menuPanel = document.getElementById('menuDebugPanel');
  if (menuPanel) menuPanel.style.display = 'flex';

  // 🔥 Preenche as configurações e inverte dinamicamente os BOTs de lugar baseado na sua cadeira de teste
  window.debugInstantStart = async (selectedMode, preferredSeat = 0, preparedState = null) => {
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

    const debugDominationOptions = selectedMode === '1x1_dominacao' ? { ...readDominationMenuOptions(), friend: true, friendCapacity: 2 } : undefined;
    if (debugDominationOptions) syncDominationMenuOptions(debugDominationOptions);

    if (preparedState) {
      // Publish the selected scenario once, never an unrelated random match first.
      activateGameSession();
      preparedState.matchStartedAt = Date.now();
      preparedState.matchFinishedAt = null;
      preparedState.historyTest = true;
      preparedState.players.forEach((p) => {
        p.accountUid = p.id === targetSeat ? activeAccount?.uid || null : null;
      });
      preparedState.isBetting = false;
      preparedState.betBase = 0;
      preparedState.betPerPoint = 0;
      beginBossTurn(preparedState, { first: true, now: Date.now(), debug: true });
      await setDoc(gameRef, { stateJson: JSON.stringify(preparedState), createdAt: preparedState.matchStartedAt });
      return preparedState;
    }

    return startGame(selectedMode, names, normalizeVariantForMode(selectedMode, 'aberto'), ['biel@financeiro.com', 'bot@rebeca.com'], debugDominationOptions, { test: true });
  };

  let bossDebugLabModulePromise = null;
  let bossDebugLabCatalog = [];
  let bossDebugLabBaseSnapshot = null;
  let bossDebugLabObservedBaseline = null;
  let bossDebugLabLastConfig = null;
  let bossDebugLabReportTimerId = null;

  const loadBossDebugLabModule = () => {
    bossDebugLabModulePromise ||= import('./js/boss/boss-debug-scenarios.js?lab=20261004d');
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
    setBossLabOptions(bossLabElement('debugBossLabVariant'), ability.variants, 'interactive');
    setBossLabOptions(bossLabElement('debugBossLabTarget'), ability.targets, 'auto');
    const targetRow = bossLabElement('debugBossLabTargetRow');
    const hasSelectableTarget = ability.targets.some((target) => !['auto', 'team'].includes(target.id));
    if (targetRow) targetRow.hidden = !hasSelectableTarget;
    const technical = bossLabElement('debugBossLabTechnical');
    if (technical) technical.textContent = `${ability.id} - Fases ${ability.phases.join('/')} - peso ${ability.weight}`;
    document.querySelectorAll('[data-boss-lab-variant]').forEach((button) => {
      button.hidden = !ability.variants.some((variant) => variant.id === button.dataset.bossLabVariant);
    });
    validateBossLabSelection();
  }

  function currentBossLabBossId() {
    const activeBossId = state?.boss?.id;
    if (activeBossId && bossDebugLabCatalog.some((entry) => entry.id === activeBossId)) return activeBossId;

    const modeBossId = getBossDefinitionForMode(state?.mode)?.id;
    if (modeBossId && bossDebugLabCatalog.some((entry) => entry.id === modeBossId)) return modeBossId;

    return null;
  }

  function syncBossLabToCurrentBoss() {
    const bossSelect = bossLabElement('debugBossLabBoss');
    const currentBossId = currentBossLabBossId();
    if (!bossSelect || !currentBossId || bossSelect.value === currentBossId) return false;

    bossSelect.value = currentBossId;
    syncBossLabBossControls();
    return true;
  }

  function syncBossLabBossControls() {
    const boss = bossDebugLabCatalog.find((entry) => entry.id === bossLabElement('debugBossLabBoss')?.value) || bossDebugLabCatalog[0];
    if (!boss) return;
    setBossLabOptions(
      bossLabElement('debugBossLabAbility'),
      boss.abilities.map((ability) => ({ id: ability.id, label: `${ability.name} - Fases ${ability.phases.join('/')} - peso ${ability.weight}` })),
    );
    syncBossLabAbilityControls({ preservePhase: false });
    refreshBossLabResourceControls().catch(console.error);
  }

  function validateBossLabSelection({ preserveError = false } = {}) {
    const ability = selectedBossLabAbility();
    const phase = bossLabElement('debugBossLabPhase')?.value || 'auto';
    const button = bossLabElement('debugBossLabPrepare');
    const compatible = !!ability && (phase === 'auto' || ability.phases.includes(Number(phase)));
    if (button) button.disabled = !compatible;
    if (!compatible || !preserveError) setBossLabError(compatible ? '' : `${ability?.name || 'A habilidade'} nao e elegivel na Fase ${phase}.`);
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

  function currentBossLabResourceTarget() {
    return bossLabElement('debugBossLabResourceTarget')?.value || 'human';
  }

  async function refreshBossLabResourceControls() {
    const value = bossLabElement('debugBossLabResourceValue');
    const targetRow = bossLabElement('debugBossLabResourceTargetRow');
    const selectedBossId = bossLabElement('debugBossLabBoss')?.value || null;
    if (targetRow) targetRow.hidden = selectedBossId !== 'dominadora';
    if (!value) return;

    const module = await loadBossDebugLabModule();
    const info = module.getBossDebugResourceState(state, {
      bossId: selectedBossId,
      target: currentBossLabResourceTarget(),
    });
    value.textContent = info.label;
    const disabled = !info.available;
    ['debugBossLabResourceMinus', 'debugBossLabResourcePlus', 'debugBossLabResourceNear', 'debugBossLabResourceZero'].forEach((id) => {
      const button = bossLabElement(id);
      if (button) button.disabled = disabled;
    });
  }

  async function adjustBossLabResource(action) {
    setBossLabError('');
    try {
      const module = await loadBossDebugLabModule();
      const info = module.adjustBossDebugResource(state, {
        bossId: bossLabElement('debugBossLabBoss')?.value || null,
        action,
        target: currentBossLabResourceTarget(),
      });
      renderAll();
      await commitState();
      await refreshBossLabObserved();
      await refreshBossLabResourceControls();
      showMessage(`Laboratorio: ${info.label}.`);
    } catch (error) {
      setBossLabError(error.message || String(error));
      await refreshBossLabResourceControls();
    }
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
    cancelPendingBotTurns();
    stopTurnTimer();
    localUndoStack = [];
    selectedHandIndexes.clear();
    selectedMeldTarget = null;
    movingWild = null;
    state = prepared.state;
    state.debugScenario.pauseAutomation = true;
    renderedBossFeedbackCount = null;
    renderedBossFeedbackEventIds = null;
    if (!state.boss?.bossFlow) beginBossTurn(state, { first: true, now: Date.now(), debug: true });
    if (rememberBase) bossDebugLabBaseSnapshot = module.createBossDebugSnapshot(state);
    const fallbackExpected = config.variant === 'no_target';
    if (!fallbackExpected && state.boss?.currentIntent?.abilityId !== config.abilityId) {
      throw new Error(`O motor selecionou ${state.boss?.currentIntent?.abilityId || 'nenhuma habilidade'} em vez de ${config.abilityId}.`);
    }
    const selectedDebugAbilityId = state.boss?.currentIntent?.abilityId || state.boss?.lastAbilityId || null;
    if (fallbackExpected && selectedDebugAbilityId === config.abilityId) {
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
    await refreshBossLabResourceControls();
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
      await window.debugInstantStart(definition.mode, 0, prepared.state);
      await activatePreparedBossLabState(prepared, config);
      if (instructions) instructions.textContent = prepared.instructions;
      showMessage(
        config.variant === 'no_target'
          ? `Sem alvo: habilidade rejeitada. ${state.boss.currentIntent?.name ? `Fallback: ${state.boss.currentIntent.name}.` : 'Nenhuma alternativa elegivel nesta fase.'}`
          : `${definition.name}: ${state.boss.currentIntent?.name} preparado no laboratorio.`,
      );
      return true;
    } catch (error) {
      setBossLabError(error.message || String(error));
    } finally {
      validateBossLabSelection({ preserveError: true });
    }
    return false;
  }

  async function executeBossLabVariant(variant) {
    const config = currentBossLabConfig({ variant });
    const module = await loadBossDebugLabModule();
    const sameScenario = module.canContinueBossDebugScenario(state, config);
    if (!sameScenario && !(await prepareBossLab({ variant }))) return;
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
      await BossBuracoBot.playTurn(state, botIndex, sessionEngine, { signal, sessionId });
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
      currentBossLabBossId(),
    );
    syncBossLabBossControls();
    bossLabElement('debugBossLabBoss')?.addEventListener('change', syncBossLabBossControls);
    bossLabElement('debugBossLabAbility')?.addEventListener('change', () => syncBossLabAbilityControls({ preservePhase: false }));
    bossLabElement('debugBossLabPhase')?.addEventListener('change', validateBossLabSelection);
    bossLabElement('debugBossLabPrepare')?.addEventListener('click', () => prepareBossLab());
    document.querySelectorAll('[data-boss-lab-variant]').forEach((button) => button.addEventListener('click', () => executeBossLabVariant(button.dataset.bossLabVariant)));
    bossLabElement('debugBossLabBotSuccess')?.addEventListener('click', () => executeBossLabBotAction('success').catch((error) => setBossLabError(error.message || String(error))));
    bossLabElement('debugBossLabBotFailure')?.addEventListener('click', () => executeBossLabBotAction('failure').catch((error) => setBossLabError(error.message || String(error))));
    bossLabElement('debugBossLabResourceMinus')?.addEventListener('click', () => adjustBossLabResource('decrease'));
    bossLabElement('debugBossLabResourcePlus')?.addEventListener('click', () => adjustBossLabResource('increase'));
    bossLabElement('debugBossLabResourceNear')?.addEventListener('click', () => adjustBossLabResource('near'));
    bossLabElement('debugBossLabResourceZero')?.addEventListener('click', () => adjustBossLabResource('zero'));
    bossLabElement('debugBossLabResourceTarget')?.addEventListener('change', () => refreshBossLabResourceControls().catch(console.error));
    bossLabElement('debugBossLabUndo')?.addEventListener('click', async () => {
      await window.executeUndo();
      await refreshBossLabObserved();
    });
    bossLabElement('debugBossLabReset')?.addEventListener('click', resetBossLabScenario);
    bossLabElement('debugBossLabSweep')?.addEventListener('click', sweepBossLab);
    bossLabElement('debugBossLab')?.addEventListener('toggle', () => {
      if (bossLabElement('debugBossLab')?.open) {
        syncBossLabToCurrentBoss();
        refreshBossLabResourceControls().catch(console.error);
        startBossLabReportTimer();
      } else {
        stopBossLabReportTimer();
      }
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

window.debugRestartGame = async (fromRematch = false) => {
  if (!state) return;
  const keepDevToolsOpen = window.isDevToolsOpen;

  // Puxa as configurações atuais da partida e da sala para refazer igual
  const currentNames = [state.players[0]?.name || '', state.players[1]?.name || '', state.players[2]?.name || '', state.players[3]?.name || ''];

  const currentPix = [state.teams[0]?.pix || '', state.teams[1]?.pix || ''];

  // Sincroniza o DOM com o estado atual para o startGame() não perder o PIX e o Tema do Baralho
  document.getElementById('deckThemeSelect').value = state.deckTheme || 'classico';
  document.getElementById('tableThemeSelect').value = state.tableTheme || document.body.dataset.tableTheme || 'feltro';
  document.getElementById('betToggle').value = state.isBetting ? 'sim' : 'nao';
  document.getElementById('betBase').value = 15;
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
  if (state.finished) await recoverFinishedHistory();
  const restartedState = await startGame(state.mode, currentNames, state.variant, currentPix, normalizeDominationOptions(state.dominationOptions), {
    test: !!state.historyTest || !fromRematch,
    accountIds: state.players.map((p) => p.accountUid || null),
  });

  // O setDoc pode terminar antes de o snapshot da nova partida voltar. Adota o
  // estado recém-criado imediatamente para não deixar UI/efeitos da partida
  // anterior (como o Decreto no Lixo) visíveis durante essa janela.
  if (restartedState) {
    state = restartedState;
    cancelGameAnimations();
    renderAll();
  }

  // Esconde o painel do DevTools para o jogador ver os dados rolarem
  window.toggleDebugPanel(keepDevToolsOpen);
};

function replayDebugBossTerminalPresentation() {
  if (!isDebugMode || !isCurrentBossMode() || !state?.finished || !state.boss?.result) return false;
  resultPresented = false;
  const resultSection = document.getElementById('bossResultSection');
  if (resultSection) resultSection.style.display = 'none';
  clearBossPortraitTerminalVisuals();
  renderAll();
  return true;
}

window.debugEndGame = async () => {
  if (!ensureMyTurn()) return;
  await finishGame(currentTeam().id);
  replayDebugBossTerminalPresentation();
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
  if (!isDebugMode || !state || state.finished || friendOperationPending || committing || isDominationFriendBusy(state) || document.querySelector('.fly-card')) return;
  const target = document.getElementById('debugMeldActor')?.value || 'current';
  const friendId = target.startsWith('friend:') ? target.slice(7) : null;
  const actor = target.startsWith('player:') ? state.players.find((p) => p.id === Number(target.slice(7))) : currentPlayer();
  if (!actor) return;
  const team = state.teams.find((t) => t.id === actor.teamId);
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
  if (friendId || (state.mode === '1x1_dominacao' && actor.id === 1)) {
    await performDominationDevOperation((latest) => debugFriendMeld(latest, friendId, meld, friendMeldRules));
    return;
  }
  team.melds.push(meld);
  const meldIdx = team.melds.length - 1;

  // Passando o meldIdx corretamente no lugar do array "meld"
  let domReward = await processDominationReward(actor, 'simple', classifyMeldForUi(meld).kind, meldIdx);
  const bossEvent = await processBossMeldChange(actor, 'simple', classifyMeldForUi(meld).kind, meldIdx, meld, true);
  showDebugBossDamageReaction();
  if (bossEvent?.reborn && state?.boss?.id === 'matriarca_esmeralda' && !bossHasActiveRebirthVisual(state.boss)) {
    renderAll();
    triggerMatriarchRebirthVisual(bossEvent.actionId || 'debug_rebirth');
  }
  if (state.finished) {
    replayDebugBossTerminalPresentation();
    return;
  }

  const friendDraw = domReward?.friendBonus ? playDominationFriendSharedDraw(domReward.friendBonus) : Promise.resolve();
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
  await friendDraw;

  if (domReward?.tookDead) {
    await animateDeadToHandLocal(domReward.tookDead.deadIndex);
  }

  renderAll();
  await commitState();
};

window.debugSetupVision = debugSetupVision;
async function debugSetupVision(count) {
  if (!isDebugMode || !state || state.mode !== '1x1_dominacao' || myPlayerIndex !== 1) return;
  if (![1, 2].includes(count) || !ensureMyTurn()) return;
  if (!dominationFeatureEnabled(state, 'vision')) {
    showMessage('Ative a Visão no menu para testar seu aviso.');
    return;
  }
  const team = currentTeam();
  const enemy = state.players[0];
  const prefix = `debug-vision-${newActionId()}`;
  let serial = 0;
  const card = (rank, suit = '♥') => ({ id: `${prefix}-${serial++}`, rank, suit, joker: false, back: 'red' });
  // Intentionally replace the test board/target hand: unrelated opportunities
  // must not mask whether the hint really needs one card or the pair together.
  team.melds = [(count === 1 ? ['3', '4', '5', '6', '7', '8'] : ['3', '4', '5', '6', '7']).map((rank) => card(rank))];
  enemy.hand = [...(count === 1 ? ['9'] : ['8', '9']).map((rank) => card(rank)), card('K', '♣'), card('Q', '♦')];
  state.dominatorUsedPower = false;
  state.powerActiveThisTurn = false;
  state.hasDrawnThisTurn = false;
  state.partialDraw = false;
  state.pickedDiscardCardId = null;
  state.requiredDiscardCard = null;
  state.boughtCardIds = [];
  window.isStealModeActive = false;
  selectedHandIndexes.clear();
  selectedMeldTarget = null;
  localUndoStack = [];
  renderAll();
  await commitState();
  showMessage(count === 1 ? 'Teste: 3–8 de copas na mesa; 9 de copas no adversário. Veja o aviso abaixo da Visão.' : 'Teste: 3–7 de copas na mesa; 8 e 9 de copas no adversário. O aviso precisa das duas juntas.');
}

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
  if (!validateDominationFriendSelection(mode, readDominationMenuOptions())) return;
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
    seatAccountIds: currentLobby?.seatAccountIds || ['', '', '', ''],
    mode: mode,
    dominationOptions: readDominationMenuOptions(),
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
    seatAccountIds: currentLobby?.seatAccountIds || ['', '', '', ''],
    mode: getEffectiveMenuMode(),
    dominationOptions: readDominationMenuOptions(),
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
  const previousSeat = myPlayerIndex;
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
  if (!state) {
    if (currentLobby) void syncAccountSeat(true, previousSeat);
    else if (myPlayerIndex >= 0) window.pushLobby();
  }
  if (state) renderAll();
};
document.getElementById('drawStockBtn').onclick = drawFromStock;
document.getElementById('drawDiscardBtn').onclick = drawFromDiscard;

// Suppress all overlapping table gestures until a purchase/discard is saved.
for (const type of ['click', 'dblclick', 'pointerdown', 'keydown']) {
  window.addEventListener(
    type,
    (event) => {
      if (localActionGate.pending && event.target.closest?.('#gameSection')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

let pauseVotePending = false;
async function votePause(action) {
  if (!state || state.finished || myPlayerIndex < 0 || pauseVotePending || localActionGate.pending) return;
  pauseVotePending = true;
  try {
    const startedAt = state.matchStartedAt;
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists() || !snapshot.data().stateJson) return;
      const latest = JSON.parse(snapshot.data().stateJson);
      if (latest.matchStartedAt !== startedAt || isDominationFriendBusy(latest)) return;
      if (!applyPauseVote(latest, myPlayerIndex, action)) return;
      if (latest.mode === '1x1_dominacao') latest.friendRevision = (latest.friendRevision || 0) + 1;
      transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
    });
  } catch (error) {
    console.error('Falha na votação de pausa:', error);
    showMessage('Não foi possível salvar o voto. Tente novamente.');
  } finally {
    pauseVotePending = false;
  }
}
document.getElementById('pauseGameBtn').onclick = () => votePause('request');

function renderPauseVote() {
  const button = document.getElementById('pauseGameBtn');
  button.hidden = !state || state.finished || myPlayerIndex < 0;
  button.disabled = isDominationFriendBusy(state);
  let overlay = document.getElementById('pauseVoteOverlay');
  if (!pauseBlocksPlay(state) || state.finished || state.surrender?.active) {
    overlay?.remove();
    return;
  }
  for (const id of ['cardArtDialog', 'cardSearchDialog']) {
    const dialog = document.getElementById(id);
    if (dialog?.open) dialog.close();
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pauseVoteOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Pausa da partida');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.9);display:grid;place-items:center';
    document.body.append(overlay);
  }
  const pause = state.pause;
  overlay.replaceChildren();
  const panel = document.createElement('div');
  panel.style.cssText = 'padding:24px;max-width:350px;color:white;text-align:center';
  const title = document.createElement('h2');
  title.textContent = pause.request ? (pause.request === 'pause' ? '⏸ Votar para pausar' : '▶ Votar para retomar') : '⏸ Partida pausada';
  panel.append(title);
  const text = document.createElement('p');
  text.textContent = 'Relógio e jogadas congelados. Todos precisam concordar; bots votam sim.';
  panel.append(text);
  if (pause.request)
    for (const player of state.players) {
      const row = document.createElement('p');
      row.textContent = `${player.name}: ${pause.votes[player.id] ? '✅ Sim' : '⏳ Aguardando'}`;
      panel.append(row);
    }
  const addButton = (label, action) => {
    const control = document.createElement('button');
    control.textContent = label;
    control.style.margin = '6px';
    control.onclick = () => votePause(action);
    panel.append(control);
  };
  if (myPlayerIndex >= 0) {
    if (!pause.request) addButton('▶ Retomar (votação)', 'request');
    else {
      if (!pause.votes[myPlayerIndex]) addButton('Sim', 'yes');
      addButton('Não / cancelar votação', 'no');
    }
  }
  overlay.append(panel);
}

// --- LÓGICA DE VOTAÇÃO PARA SAIR ---
async function voteExit(action) {
  if (!state || myPlayerIndex < 0 || exitVotePending || localActionGate.pending) return;
  exitVotePending = true;
  const startedAt = state.matchStartedAt;
  try {
    // Arquivar o resultado antes de encerrar a sala; nunca perder o histórico.
    await recoverFinishedHistory();
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists() || !snapshot.data().stateJson) return;
      const latest = JSON.parse(snapshot.data().stateJson);
      if (latest.matchStartedAt !== startedAt || latest.rematch?.starting || !latest.players.some((p) => p.id === myPlayerIndex)) return;
      if (latest.finished) {
        if (action === 'no') return;
        if (!snapshot.data().historySummary) throw new Error('Resultado ainda não arquivado');
        transaction.delete(gameRef);
        return;
      }
      if (action === 'request') latest.surrender ||= { active: false, votes: {} };
      if (!latest.surrender || (action !== 'request' && !latest.surrender.active)) return;
      if (action === 'no') {
        latest.surrender = { active: false, votes: {} };
      } else {
        if (!latest.surrender.active) latest.surrender = { active: true, votes: {} };
        latest.surrender.votes[myPlayerIndex] = true;
        for (const p of latest.players) if (p.name?.toUpperCase().includes('BOT')) latest.surrender.votes[p.id] = true;
        if (latest.players.every((p) => latest.surrender.votes[p.id] === true)) {
          transaction.delete(gameRef);
          return;
        }
      }
      latest.pauseControlRevision = (latest.pauseControlRevision || 0) + 1;
      if (latest.mode === '1x1_dominacao') latest.friendRevision = (latest.friendRevision || 0) + 1;
      transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
    });
  } catch (error) {
    console.error('Falha na votação de saída:', error);
    showMessage('Não foi possível concluir a saída. Confira a conexão e tente novamente.');
  } finally {
    exitVotePending = false;
  }
}
document.getElementById('endGameBtn').onclick = () => voteExit('request');
document.getElementById('voteYesBtn').onclick = () => voteExit('yes');
document.getElementById('voteNoBtn').onclick = () => voteExit('no');

function renderSurrender() {
  const section = document.getElementById('surrenderSection');
  if (!state || !state.surrender || !state.surrender.active) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'flex';
  const list = document.getElementById('surrenderVotesList');
  document.getElementById('scoreSection').style.display = 'none';
  document.getElementById('bossResultSection').style.display = 'none';
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
  document.getElementById('voteYesBtn').style.display = alreadyVoted || myPlayerIndex < 0 ? 'none' : 'block';
  document.getElementById('voteNoBtn').style.display = myPlayerIndex < 0 ? 'none' : 'block';
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
  if (!dominationFeatureEnabled(state, 'vision')) return;
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
  if (!dominationFeatureEnabled(state, 'vision')) return;
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
  if (!state?.finished || myPlayerIndex < 0 || state.surrender?.active || rematchVotePending) return;
  rematchVotePending = true;
  const startedAt = state.matchStartedAt;
  try {
    const restart = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists() || !snapshot.data().stateJson) return false;
      const latest = JSON.parse(snapshot.data().stateJson);
      if (!latest.finished || latest.matchStartedAt !== startedAt || latest.surrender?.active || latest.rematch?.starting) return false;
      latest.rematch ||= { votes: {} };
      latest.rematch.votes[myPlayerIndex] = true;
      for (const p of latest.players) if (p.name?.toUpperCase().includes('BOT')) latest.rematch.votes[p.id] = true;
      const ready = latest.players.every((p) => latest.rematch.votes[p.id] === true);
      latest.rematch.starting = ready;
      if (latest.mode === '1x1_dominacao') latest.friendRevision = (latest.friendRevision || 0) + 1;
      transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
      return ready;
    });
    if (restart) await window.debugRestartGame(true);
  } catch (error) {
    console.error('Falha na revanche:', error);
    showMessage('Não foi possível iniciar a revanche. Tente novamente.');
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(gameRef);
      if (!snapshot.exists() || !snapshot.data().stateJson) return;
      const latest = JSON.parse(snapshot.data().stateJson);
      if (latest.finished && latest.matchStartedAt === startedAt && latest.rematch) {
        latest.rematch.starting = false;
        transaction.update(gameRef, { stateJson: JSON.stringify(latest), updatedAt: Date.now() });
      }
    }).catch(console.error);
  } finally {
    rematchVotePending = false;
  }
};

// Usar uma ferramenta que altera a partida torna seu resultado um teste, não uma vitória válida.
for (const name of ['debugDraw5', 'debugDraw30', 'debugDiscard5', 'debugMeld', 'debugSetupDead', 'debugSetupWin', 'debugEndGame', 'debugSetFriends', 'debugSetupVision', 'debugTogglePause']) {
  const action = window[name];
  if (typeof action !== 'function') continue;
  window[name] = function (...args) {
    if (state && !state.finished) state.historyTest = true;
    return action.apply(this, args);
  };
}
