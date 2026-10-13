// Experiment-only module hooks. No production file is written or imported by the app.
import { registerHooks } from 'node:module';

export const CURRENT_DAMAGE = { simple: 0, suja: 100, limpa: 180, real: 300, asas: 450 };
export const PROPOSED_DAMAGE = { simple: 0, suja: 100, limpa: 200, real: 500, asas: 1000 };
export const CURRENT_HP = { banker: 2650, dominadora: 2600, matriarca_esmeralda: 2000,
  nehelenia: 2400, nemesis: 2200, dimitrescu: 2000 };
const files = { banker: 'banker', dominadora: 'dominatrix', matriarca_esmeralda: 'matriarch',
  nehelenia: 'nehelenia', nemesis: 'nemesis' };

export function installExperimentHooks({ system = 'current', bossId, hp }) {
  const changes = [];
  registerHooks({ load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    if (!url.startsWith('file:') || !/\.(?:js|mjs)$/.test(url)) return loaded;
    let source = Buffer.isBuffer(loaded.source) ? loaded.source.toString('utf8') : String(loaded.source);
    const original = source;
    if (url.endsWith('/js/boss/bosses/banker.js') && system === 'proposed') {
      source = source.replace(/export const BOSS_DAMAGE_BY_KIND = Object.freeze\(\{[\s\S]*?\}\);/,
        `export const BOSS_DAMAGE_BY_KIND = Object.freeze(${JSON.stringify(PROPOSED_DAMAGE)});`);
    }
    if (hp != null && hp !== CURRENT_HP[bossId]) {
      if (files[bossId] && url.endsWith(`/js/boss/bosses/${files[bossId]}.js`)) {
        // Only the definition's main HP, never auxiliary HP values.
        source = source.replace(`maxHp: ${CURRENT_HP[bossId]},`, `maxHp: ${hp},`);
      }
      if (bossId === 'dimitrescu' && url.endsWith('/js/boss/dimitrescu-castle.js')) {
        source = source.replace('...LEGACY_CASTLE_BALANCE, daughterHp: 500',
          `...LEGACY_CASTLE_BALANCE, ladyHp: ${hp}, daughterHp: 500`);
      }
    }
    if (url.endsWith('/js/boss/boss-engine.js')) {
      source = source.replace('boss.eventLog.push(recordedEvent);',
        'boss.eventLog.push(recordedEvent); globalThis.__canastraExperimentEvent?.(boss, recordedEvent);');
      source = source.replace('function applyDamageToBoss(gameState, damage,',
        `function applyDamageToBoss(gameState, damage, options = {}) {
          const before = { hp: gameState.boss.hp, entities: (gameState.boss.combatEntities || []).map(e =>
            ({ id: e.id, hp: e.hp, relicAttackBonus: e.relicAttackBonus })) };
          const result = experimentOriginalApplyDamage(gameState, damage, options);
          globalThis.__canastraExperimentDamage?.(gameState, damage, options, result, before);
          return result;
        }
        function experimentOriginalApplyDamage(gameState, damage,`);
    }
    if (source !== original) {
      changes.push(url);
      return { ...loaded, source };
    }
    return loaded;
  } });
  return changes;
}
