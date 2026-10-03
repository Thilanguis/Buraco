import { bankerBossPresentation } from './banker.js';
import { dominatrixBossPresentation } from './dominatrix.js';
import { matriarchBossPresentation } from './matriarch.js';
import { dimitrescuBossPresentation } from './dimitrescu.js';
import { neheleniaBossPresentation } from './nehelenia.js';

const BOSS_PRESENTATION_REGISTRY = Object.freeze({
  [bankerBossPresentation.id]: bankerBossPresentation,
  [dominatrixBossPresentation.id]: dominatrixBossPresentation,
  [matriarchBossPresentation.id]: matriarchBossPresentation,
  [dimitrescuBossPresentation.id]: dimitrescuBossPresentation,
  [neheleniaBossPresentation.id]: neheleniaBossPresentation,
});

export function getBossPresentationAdapter(bossId) {
  return BOSS_PRESENTATION_REGISTRY[bossId] || null;
}

export function isBossPresentationFeminine(bossId) {
  return getBossPresentationAdapter(bossId)?.feminine === true;
}

export function getBossPresentationSpeech(bossId, abilityId, context = {}) {
  return getBossPresentationAdapter(bossId)?.speech?.(abilityId, context) || '';
}

export function buildBossRuleSummary(bossId, gameState) {
  return getBossPresentationAdapter(bossId)?.ruleSummary?.(gameState) || '';
}

export function getBossActionCategory(bossId, abilityId) {
  return getBossPresentationAdapter(bossId)?.actionCategory?.(abilityId) || 'Efeito no fim da rodada';
}

export function getBossResultCategory(abilityId) {
  for (const adapter of Object.values(BOSS_PRESENTATION_REGISTRY)) {
    const category = adapter.resultCategory?.(abilityId);
    if (category) return category;
  }
  return '';
}

export function getBossFinalDangerPresentation(bossId, gameState) {
  return getBossPresentationAdapter(bossId)?.finalDanger?.(gameState)
    || { label: 'Recurso final', value: `${Number(gameState?.boss?.danger || 0)} / ${Number(gameState?.boss?.maxDanger || 0)}` };
}

export function buildBossPresentationDetails(bossId, context) {
  return getBossPresentationAdapter(bossId)?.details?.(context) ?? null;
}

export function buildBossCompactAction(bossId, context) {
  return getBossPresentationAdapter(bossId)?.compactAction?.(context) ?? null;
}

export function buildBossPresentationRangeMeters(bossId, context) {
  return getBossPresentationAdapter(bossId)?.rangeMeters?.(context) ?? null;
}

export function buildBossPresentationHelp(bossId, context) {
  return getBossPresentationAdapter(bossId)?.help?.(context) ?? null;
}

export function buildBossStatusPresentation(bossId, context) {
  return getBossPresentationAdapter(bossId)?.status?.(context) ?? null;
}

export function buildBossPendingChoicePresentation(bossId, context) {
  return getBossPresentationAdapter(bossId)?.pendingChoice?.(context) ?? null;
}
