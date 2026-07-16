import { bankerDefinition } from './bosses/banker.js';
import { dominatrixDefinition } from './bosses/dominatrix.js';
import { matriarchDefinition } from './bosses/matriarch.js';

const BOSS_REGISTRY = Object.freeze({
  [bankerDefinition.id]: bankerDefinition,
  [dominatrixDefinition.id]: dominatrixDefinition,
  [matriarchDefinition.id]: matriarchDefinition,
});

export function getBossDefinition(id) {
  return BOSS_REGISTRY[id] || null;
}

export function listBossDefinitions() {
  return Object.values(BOSS_REGISTRY);
}

export function getBossDefinitionForMode(mode) {
  return listBossDefinitions().find((definition) => definition.mode === mode) || null;
}

export function normalizeVariantForMode(mode, variant) {
  return getBossDefinitionForMode(mode) ? 'fechado' : variant;
}
