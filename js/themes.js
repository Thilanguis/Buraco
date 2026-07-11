export const TABLE_THEME_IDS = Object.freeze(['feltro', 'cassino', 'masmorra', 'ostentacao', 'submissao', 'findom']);
export const DECK_THEME_IDS = Object.freeze(['classico', 'cassino', 'minimal', 'dominacao', 'arcade', 'mythic', 'holografico']);

export function normalizeTableTheme(theme) {
  return TABLE_THEME_IDS.includes(theme) ? theme : 'feltro';
}

export function normalizeDeckTheme(theme) {
  return DECK_THEME_IDS.includes(theme) ? theme : 'classico';
}
