import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeVariantForMode } from '../js/boss/boss-registry.js';

const [app, bot, html, serviceWorker, cardsCss, bossCss, banker, dominatrix, engine] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../bot.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles/cards.css', import.meta.url), 'utf8'),
  readFile(new URL('../styles/boss-mode.css', import.meta.url), 'utf8'),
  readFile(new URL('../js/boss/bosses/banker.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/boss/bosses/dominatrix.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/boss/boss-engine.js', import.meta.url), 'utf8'),
]);

test('menu e HUD expõem o modo Chefe da Mesa', () => {
  assert.match(html, /option value="cooperative"/);
  assert.match(html, /id="bossSelect"/);
  assert.match(html, /option value="banker"/);
  assert.match(html, /option value="dominadora"/);
  assert.doesNotMatch(html, /<option value="boss_(?:banker|dominadora)"/);
  assert.match(html, /id="bossChainStatus"/);
  assert.match(html, /id="bossChoicePanel"/);
  for (const id of ['bossHud', 'bossHpBar', 'bossDebtBar', 'bossIntentName', 'bossLastImpact', 'bossRoundNumber', 'bossEventLog', 'bossResultSection']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('cada chefe fixa sua identidade visual no menu cooperativo', () => {
  assert.match(banker, /tableTheme: 'findom'/);
  assert.match(banker, /deckTheme: 'cassino'/);
  assert.match(banker, /accent: '#22c55e'/);
  assert.match(dominatrix, /tableTheme: 'submissao'/);
  assert.match(dominatrix, /deckTheme: 'mythic'/);
  assert.match(dominatrix, /accent: '#ec4899'/);
  assert.match(app, /applyCooperativeBossPreset/);
  assert.match(app, /visualMenuBlock\.style\.display = cooperative \? 'none'/);
  assert.match(app, /moneyMenuBlock\.style\.display = cooperative \? 'none'/);
  assert.match(bossCss, /data-boss-id='banker'.*boss-hud/);
  assert.equal(normalizeVariantForMode('boss_banker', 'aberto'), 'fechado');
  assert.equal(normalizeVariantForMode('boss_dominadora', 'aberto'), 'fechado');
  assert.equal(normalizeVariantForMode('1x1', 'aberto'), 'aberto');
  assert.match(app, /const effectiveVariant = normalizeVariantForMode\(mode, variant\)/);
  assert.match(app, /newState\.variant = normalizeVariantForMode\(newState\.mode, newState\.variant\)/);
  assert.match(app, /variantSelect'\)\.value = 'fechado'/);
  assert.match(app, /variant: normalizeVariantForMode\(mode, document\.getElementById\('variantSelect'\)\.value\)/);
  assert.match(app, /await startGame\(state\.mode, currentNames, state\.variant, currentPix\)/);
  assert.match(app, /window\.voteRematch[\s\S]*?window\.debugRestartGame\(\)/);
});

test('cartas compradas ficam destacadas sem substituir a face do baralho', () => {
  assert.match(app, /classList\.add\('just-bought'\)/);
  assert.match(cardsCss, /body\[data-deck-theme\].*#handContainer .*\.carta\.just-bought/);
  assert.match(cardsCss, /outline: 2px solid/);
  const highlightRule = cardsCss.match(/body\[data-deck-theme\] #handContainer \.carta\.just-bought \{[^}]+\}/)?.[0] || '';
  assert.doesNotMatch(highlightRule, /background(?:-color)?:/);
});

test('escolha de comprar duas destaca exatamente as duas cartas recebidas', () => {
  assert.match(app, /event\.drawnCardIds\?\.length/);
  assert.match(app, /state\.boughtCardIds = \[\.\.\.event\.drawnCardIds\]/);
  assert.match(app, /2 cartas adicionadas à sua mão\./);
});

test('Escolha Forcada apresenta e anima os dois IDs recebidos', () => {
  assert.match(app, /const animateForcedChoiceDraw = async/);
  assert.match(app, /event\.drawnCardIds\.slice\(0, 2\)\.map/);
  assert.match(app, /cardElById\(card\.id\)/);
  assert.match(app, /flyRectToRect\(card, fromRect, getRect\(toEl\), 'back'\)/);
  assert.match(app, /2 cartas adicionadas à sua mão\./);
  assert.match(app, /Sua compra normal do turno continua sendo 1 carta\./);
});

test('destaque da escolha permanece vinculado ao jogador alvo', () => {
  assert.match(app, /choiceDrawnCardIdsByPlayer\?\.\[me\.id\]/);
  assert.match(engine, /choiceDrawnCardIdsByPlayer\[playerId\] = drawnCards\.map/);
  assert.match(engine, /delete boss\.choiceDrawnCardIdsByPlayer\[playerId\]/);
});

test('fluxos humanos e do bot chamam o motor do chefe fora do render', () => {
  assert.match(app, /processBossMeldChange\(currentPlayer\(\)/);
  assert.match(app, /processBossMeldChange\(me/);
  assert.match(app, /completeBossPlayerTurn\(state, state\.currentPlayer\)/);
  assert.doesNotMatch(app.match(/function renderBossHud\(\)[\s\S]*?function renderBossResult/)?.[0] || '', /applyBossMeldTransition/);
  assert.match(bot, /engine\.isDiscardBlocked/);
  assert.match(bot, /engine\.isMeldLocked/);
  assert.match(bot, /state\.mode\?\.startsWith\('boss_'\)[\s\S]*?executeDrawDiscardFechado/);
  assert.match(bot, /resolvePendingBossChoice/);
  assert.match(app, /isBossCardBlocked\(state/);
  assert.match(app, /canBossCreateMeld\(state/);
  assert.match(app, /canBossUseMeld\(state/);
  assert.match(app, /isCurrentBossMode\(\)\) seats\.right = others\[0\]/);
});

test('HUD usa apresentadores separados para acao atual e resultado recente', () => {
  assert.match(app, /buildBossActionPresentation\(state\)/);
  assert.match(app, /buildBossResultPresentation\(resolvingEvent\)/);
  assert.doesNotMatch(app, /bossSpeeches\[intent/);
});

test('acao e resultado usam falas separadas sem misturar seus payloads', () => {
  assert.match(html, /id="bossDialoguePresentation" class="boss-dialogue-presentation"/);
  assert.match(html, /id="bossResolvedPresentation"/);
  assert.match(html, /id="bossDialogueSpeech"/);
  assert.doesNotMatch(html, /id="bossResultSpeech"/);
  assert.match(app, /buildBossResultPresentation\(resolvingEvent\)/);
  assert.match(app, /resultPanel\.style\.display = resolvingEvent/);
  assert.doesNotMatch(bossCss, /boss-resolving[^\n{]*\.boss-intent/);
});

test('dialogo em quadrinho e resultado recente usam apresentacoes independentes', () => {
  assert.match(app, /\['ability', 'phase', 'taunt'\]\.includes\(flow\?\.stage\)/);
  assert.match(app, /dialoguePanel\.style\.display = dialogueVisible \? 'grid' : 'none'/);
  assert.match(app, /resultPanel\.style\.display = resolvingEvent \? 'grid' : 'none'/);
  const dialogueRule = bossCss.match(/\.boss-dialogue-presentation \{[^}]+\}/)?.[0] || '';
  assert.match(dialogueRule, /background:\s*#f8fafc/);
  assert.match(dialogueRule, /border:\s*2px solid #111827/);
  assert.match(dialogueRule, /animation:\s*bossSpeechPop/);
  assert.match(bossCss, /\.boss-result-presentation \{[^}]*background:\s*rgba\(7,10,18,\.97\)/s);
  assert.doesNotMatch(app.match(/const resultPresentation[\s\S]*?bossTotalDamage/)?.[0] || '', /bossDialogue/);
});

test('DevTools permite revisar toda canastra no balao sem alterar o limite do jogo real', () => {
  assert.match(html, /id="bossDamageReaction" class="boss-dialogue-presentation boss-damage-reaction"/);
  assert.match(app, /function showDebugBossDamageReaction\(\)/);
  assert.match(app, /debugPreview: true/);
  assert.match(app.match(/window\.debugMeld[\s\S]*?window\.debugSetupDead/)?.[0] || '', /showDebugBossDamageReaction\(\)/);
  assert.match(bossCss, /\.boss-damage-reaction \{[^}]*z-index:\s*10/);
});

test('primeira habilidade usa o balao e o HUD permanente continua separado', () => {
  assert.match(app, /flow\.stage === 'ability' \? 'NOVA HABILIDADE'/);
  assert.match(app, /bossDialogueName'\)\.textContent = actionPresentation\.name/);
  assert.match(app, /bossDialogueSpeech'\)\.textContent = actionPresentation\.speech \?/);
  assert.match(app, /bossIntentName'\)\.textContent = actionPresentation\.name/);
  assert.match(html, /id="bossFinalSpeech" class="boss-dialogue-presentation boss-final-dialogue"/);
});

test('HUD compacto remove marcas falsas de HP e mantem detalhes expansisveis', () => {
  assert.doesNotMatch(html, /boss-phase-mark|mark-66|mark-33/);
  assert.match(html, /<details id="bossBattleDetails"/);
  assert.doesNotMatch(html, /<details id="bossBattleDetails"[^>]*\bopen\b/);
  assert.match(html, /Detalhes da batalha/);
  assert.match(html, /id="bossRoundSummary"[\s\S]*?id="bossRoundNumber"[\s\S]*?id="bossRoundTurn"[\s\S]*?id="bossCurrentActor"/);
  assert.doesNotMatch(html, /id="bossStatusRail"|class="boss-round-card"/);
  assert.match(app, /bossBattleDetails'\);\s*if \(battleDetails\) battleDetails\.open = false/);
  assert.match(app, /bossActionType'\)\.textContent = actionPresentation\.category\.toUpperCase\(\)/);
  assert.match(app, /bossIntentDescription'\)\.textContent = actionPresentation\.instruction/);
  assert.match(app, /bossIntentProgress'\)\.textContent = \[actionPresentation\.progress, actionPresentation\.consequence\]/);
  assert.doesNotMatch(app, /bossIntentProgress'\)\.textContent = actionPresentation\.details/);
});

test('HUD explica Dominado e anima Correntes e Divida a partir dos eventos reais', () => {
  assert.match(app, /SOB CONTROLE — 3 CORRENTES/);
  assert.match(app, /DOMINADO — 4 CORRENTES/);
  assert.match(app, /Não pode pegar o lixo nem criar jogos novos/);
  assert.match(app, /feedback\.type === 'chainChange'/);
  assert.match(app, /feedback\.dangerChangeLabel/);
  assert.match(app, /data-player-id="\$\{player\.id\}"/);
  assert.match(app, /querySelectorAll\('#bossChainStatus \.boss-chain-player'\)/);
  assert.match(app, /querySelector\('\.boss-chain-links'\)\?\.getBoundingClientRect\(\)/);
  assert.doesNotMatch(app.match(/const feedbackEvents[\s\S]*?scheduleBossTurnAdvance/)?.[0] || '', /opponentAnchorRect/);
  assert.match(app, /bossDangerMeter/);
  assert.match(bossCss, /\.boss-floating-number\.chain-up/);
  assert.match(bossCss, /\.boss-floating-number\.chain-down/);
  assert.match(bossCss, /\.boss-floating-number\.debt-down,[\s\S]*?\.boss-floating-number\.debt-up \{ color: #22c55e; \}/);
  assert.match(bossCss, /\.boss-floating-number\.chain-up,[\s\S]*?\.boss-floating-number\.chain-down \{ color: #ec4899; \}/);
  assert.match(bossCss, /\.boss-floating-number \{[^}]*animation: bossFloatDamage 2\.4s ease forwards;/);
  assert.match(app, /setTimeout\(\(\) => floating\.remove\(\), 2600\)/);
  assert.match(app, /duration: 6000, easing: 'cubic-bezier\(0\.2, 0\.8, 0\.2, 1\)'/);
  assert.match(app, /duration: 1800, easing: 'ease-in'/);
});

test('Cofre fica junto ao jogador, bloqueia compras e anima o resgate sem entrar nos detalhes', () => {
  const vaultIndex = html.indexOf('id="bossLocalVaultSlot"');
  const handIndex = html.indexOf('id="handContainer"');
  assert.ok(vaultIndex >= 0 && vaultIndex < handIndex);
  const detailsBlock = html.match(/<details id="bossBattleDetails"[\s\S]*?<\/details>/)?.[0] || '';
  assert.doesNotMatch(detailsBlock, /bossLocalVaultSlot/);
  assert.match(app, /function renderBossVaultSlot\(root, player, isLocal = false\)/);
  assert.match(app, /COFRE DO BANQUEIRO/);
  assert.match(app, /Compra obrigatória no próximo turno/);
  assert.match(app, /isBossVaultDrawRequired\(state, myPlayerIndex\)/);
  assert.match(app, /recupere sua garantia antes de continuar\. Monte e lixo estão bloqueados/);
  assert.match(app, /flyRectToRect\(vaultCard, selectedCollateralRect, getRect\(vaultSlot\), 'front'\)/);
  assert.match(app, /flyRectToRect\(vault\.card, fromRect, getRect\(toEl\), 'front'\)/);
  assert.match(app, /if \(isBossVaultDrawRequired\(s, botIndex\)\)/);
  assert.match(bossCss, /\.boss-vault-slot \{/);
  assert.match(bossCss, /\.boss-vault-required \{/);
});

test('HUD mostra quatro Correntes, estado Sob Controle e Posses independentes', () => {
  assert.match(app, /Array\.from\(\{ length: 4 \}/);
  assert.match(app, /SOB CONTROLE — 3 CORRENTES/);
  assert.match(app, /DOMINADO — 4 CORRENTES/);
  assert.match(app, /boss\.possessions \|\| \[\]/);
  assert.match(app, /Posse: jogo/);
});

test('HUD do chefe acompanha a largura responsiva da mesa', () => {
  const hudRule = bossCss.match(/\.boss-hud \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(hudRule, /width:\s*calc\(100% - 180px\)/);
  assert.match(hudRule, /max-width:\s*1120px/);
  assert.match(hudRule, /min-height:\s*116px/);
  assert.match(bossCss, /\.boss-portrait \{[^}]*width:\s*138px;[^}]*height:\s*82px/);
});

test('tela final mostra resultado explicito, chefe, fala e duas acoes', () => {
  assert.match(html, /id="bossResultTitle">VITÓRIA</);
  assert.match(html, /id="bossResultPortrait"/);
  assert.match(html, /id="bossResultBossName"/);
  assert.match(html, /id="bossFinalSpeech"/);
  assert.match(html, /id="bossRematchBtn"[^>]*>JOGAR NOVAMENTE/);
  assert.match(html, /id="closeBossResultBtn"[^>]*>VOLTAR À MESA/);
  assert.match(app, /buildBossFinalPresentation\(state\)/);
});

test('primeira ordem usa o turno formal de seis segundos e trava controles', () => {
  assert.match(app, /beginBossTurn\(newState, \{ first: true/);
  assert.match(app, /isBossTurnActive\(state\)/);
  assert.match(app, /scheduleBossTurnAdvance\(\)/);
  assert.match(app, /isGameSessionActive\(sessionId, signal\)/);
  assert.match(app, /myPlayerIndex === bossFlowHostIndex\(\)/);
  assert.doesNotMatch(app, /firstOrderPresentationUntil/);
});

test('acoes humanas e cronometro consultam a trava obrigatoria de escolhas', () => {
  assert.match(app, /function ensureMyTurn\(\)[\s\S]*?canBossPerformCommonAction\(state\)/);
  assert.match(app, /async function drawFromStock\(\) \{\s*if \(!ensureMyTurn\(\)\) return/);
  assert.match(app, /async function drawFromDiscard\(\) \{\s*if \(!ensureMyTurn\(\)\) return/);
  assert.match(app, /async function makeMeldFromSelection[\s\S]*?if \(!ensureMyTurn\(\)\) return/);
  assert.match(app, /async function discardSelectedCard\(\) \{\s*if \(!ensureMyTurn\(\)\) return/);
  assert.match(app, /window\.executeUndo = async \(\) => \{\s*if \(!ensureMyTurn\(\)/);
  assert.match(app, /function passTurn\(\) \{\s*if \(!canBossPerformCommonAction\(state\)\)/);
  assert.match(app, /async function autoPlayTimeout\(\) \{\s*if \(!canBossPerformCommonAction\(state\)\)/);
  assert.match(app, /function startTurnTimerIfNeeded[\s\S]*?if \(!canBossPerformCommonAction\(state\)\)/);
});

test('turno formal do chefe pausa bot e cronometro ate o estagio dos jogadores', () => {
  assert.match(app, /!hasPendingBossChoices\(state\) && !isBossTurnActive\(state\)/);
  assert.match(app, /if \(isBossTurnActive\(state\) \|\| hasPendingBossChoices\(state\)\) return/);
  assert.match(app, /botTurnController\.abort\(\)/);
  assert.match(app, /bossPresentationKey = ''/);
});

test('bot resolve escolha antes de agir e compra extra verifica antes de mutar', () => {
  const resolveIndex = bot.indexOf('await engine.resolvePendingBossChoice(botIndex)');
  const analysisIndex = bot.indexOf('const myScore =');
  assert.ok(resolveIndex >= 0 && resolveIndex < analysisIndex);
  assert.match(bot, /engine\.hasPendingBossChoice\(\)\) return/);
  const extras = app.match(/async function drawBossTurnExtras[\s\S]*?return cards;\s*\}/)?.[0] || '';
  assert.match(extras, /hasPendingBossChoices\(state\)[\s\S]*?return \[\]/);
  assert.ok(extras.indexOf('hasPendingBossChoices(state)') < extras.indexOf('consumeBossExtraDraw'));
  assert.doesNotMatch(extras, /return false/);
});

test('humano e bot validam descarte livre antes de mover cartas', () => {
  assert.match(app, /validateBossMeldPlay\(state, currentPlayer\(\)\.id, cards\)/);
  assert.match(app, /validateBossMeldPlay\(s, me\.id, cards\)\.allowed/);
  assert.match(app, /validateBossMeldPlay\(s, me\.id, selectedHandCards, s\.discard\.slice\(0, -1\)\)/);
  assert.match(bot, /const moved = await engine\.executeMeld(?:New|Extend)[\s\S]*?madeMove = moved !== false/);
});

test('service worker inclui os novos módulos sem trocar sua versão', () => {
  assert.match(serviceWorker, /const CACHE_NAME = 'buraco-v120'/);
  assert.match(serviceWorker, /js\/boss\/boss-engine\.js/);
  assert.match(serviceWorker, /js\/deck\.js/);
  assert.match(serviceWorker, /js\/boss\/boss-presentation\.js/);
  assert.match(serviceWorker, /styles\/boss-mode\.css/);
  assert.match(serviceWorker, /assets\/images\/boss-banqueiro\.png/);
  assert.match(serviceWorker, /js\/boss\/bosses\/dominatrix\.js/);
  assert.match(serviceWorker, /assets\/images\/boss-dominadora\.png/);
});
