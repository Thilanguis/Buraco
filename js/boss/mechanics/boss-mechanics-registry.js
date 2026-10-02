import { dimitrescuBossMechanics } from './dimitrescu.js';
import { dominatrixBossMechanics } from './dominatrix.js';
import { neheleniaBossMechanics } from './nehelenia.js';
import { matriarchBossMechanics } from './matriarch.js';
import { bankerBossMechanics } from './banker.js';

const BOSS_MECHANICS_REGISTRY = Object.freeze({
  [dimitrescuBossMechanics.id]: dimitrescuBossMechanics,
  [dominatrixBossMechanics.id]: dominatrixBossMechanics,
  [neheleniaBossMechanics.id]: neheleniaBossMechanics,
  [matriarchBossMechanics.id]: matriarchBossMechanics,
  [bankerBossMechanics.id]: bankerBossMechanics,
});

export function getBossMechanicsAdapter(bossId) {
  return BOSS_MECHANICS_REGISTRY[bossId] || null;
}

export function applyBossMeldMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.onMeldTransition?.(context) || null;
}

export function applyBossCardDamageMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.onCardDamage?.(context) || null;
}

export function finalizeBossMeldCardDamageMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.afterMeldCardDamage?.(context) || null;
}

export function applyBossMeldContributionMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.onMeldContribution?.(context) || null;
}

export function finalizeBossMeldResolutionMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.afterMeldResolution?.(context) || null;
}

export function finalizeBossMeldEventMechanics(bossId, context) {
  return getBossMechanicsAdapter(bossId)?.afterMeldEvent?.(context) || null;
}
