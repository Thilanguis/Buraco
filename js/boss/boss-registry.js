import { bankerDefinition } from './bosses/banker.js';
import { dominatrixDefinition } from './bosses/dominatrix.js';
import { matriarchDefinition } from './bosses/matriarch.js';
import { dimitrescuDefinition } from './bosses/dimitrescu.js';
import { neheleniaDefinition } from './bosses/nehelenia.js';
import { nemesisDefinition } from './bosses/nemesis.js';

const BOSS_REGISTRY = Object.freeze({
  [bankerDefinition.id]: bankerDefinition,
  [dominatrixDefinition.id]: dominatrixDefinition,
  [matriarchDefinition.id]: matriarchDefinition,
  [dimitrescuDefinition.id]: dimitrescuDefinition,
  [neheleniaDefinition.id]: neheleniaDefinition,
  [nemesisDefinition.id]: nemesisDefinition,
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
