import { bankerBossUi } from './banker-ui.js';
import { dominatrixBossUi } from './dominatrix-ui.js';
import { matriarchBossUi } from './matriarch-ui.js';
import { dimitrescuBossUi } from './dimitrescu-ui.js';
import { neheleniaBossUi } from './nehelenia-ui.js';

const BOSS_UI_REGISTRY = Object.freeze({
  [bankerBossUi.id]: bankerBossUi,
  [dominatrixBossUi.id]: dominatrixBossUi,
  [matriarchBossUi.id]: matriarchBossUi,
  [dimitrescuBossUi.id]: dimitrescuBossUi,
  [neheleniaBossUi.id]: neheleniaBossUi,
});

export function getBossUiAdapter(bossId) {
  return BOSS_UI_REGISTRY[bossId] || null;
}

export function getBossMeldContributionUi(bossId, contribution) {
  return getBossUiAdapter(bossId)?.meldContribution?.(contribution) || null;
}

export function getBossMeldUiModel(bossId, context) {
  return getBossUiAdapter(bossId)?.meld?.(context) || null;
}
