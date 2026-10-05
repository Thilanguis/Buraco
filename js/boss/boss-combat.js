// Small, serializable combat-entity primitive. Damage never overflows to another entity.
export function createCombatEntities(definitions, { initialStatus = 'alive' } = {}) {
  return definitions.map((entry) => ({ ...entry, hp: entry.maxHp, status: initialStatus, mutated: false, revivals: 0, diedAt: null }));
}

export const isCombatEntityAlive = (entry) => !!entry && ['alive', 'persistent'].includes(entry.status) && entry.hp > 0;

export function normalizeCombatEntities(boss, definitions, { lifecycle = false } = {}) {
  const entries = Array.isArray(boss.combatEntities) ? boss.combatEntities : [];
  const saved = new Map(entries.filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
  boss.combatEntities = definitions.map((definition) => {
    const entry = { ...definition, ...saved.get(definition.id), maxHp: definition.maxHp, passive: definition.passive };
    entry.hp = Math.max(0, Math.min(entry.maxHp, Number.isFinite(entry.hp) ? entry.hp : entry.maxHp));
    if (lifecycle) {
      const states = ['absent', 'entering', 'persistent', 'repelled', 'corpse'];
      // Old saves contain alive/dead and must not be reset to a fresh battle.
      if (!states.includes(entry.status)) entry.status = saved.has(definition.id) ? (entry.hp > 0 ? 'persistent' : 'corpse') : 'absent';
      if (entry.status === 'persistent' && entry.hp === 0) entry.status = 'corpse';
      if (entry.status === 'corpse') entry.hp = 0;
    } else entry.status = entry.hp > 0 ? 'alive' : 'dead';
    entry.mutated = isCombatEntityAlive(entry) ? !!entry.mutated || boss.phase >= 3 : false;
    entry.revivals = Math.max(0, Number(entry.revivals) || 0);
    return entry;
  });
  if (lifecycle) boss.combatLifecycleVersion = 1;
}

export function damageCombatEntity(entity, damage, eventId) {
  if (!isCombatEntityAlive(entity)) return 0;
  const applied = Math.min(entity.hp, Math.max(0, Number(damage) || 0));
  entity.hp -= applied;
  if (entity.hp === 0) { entity.status = entity.status === 'persistent' ? 'corpse' : 'dead'; entity.diedAt = eventId; }
  return applied;
}

export function healCombatEntity(entity, amount) {
  if (!isCombatEntityAlive(entity)) return 0;
  const applied = Math.min(entity.maxHp - entity.hp, Math.max(0, Number(amount) || 0));
  entity.hp += applied;
  return applied;
}

export function reviveCombatEntity(entity, phase) {
  if (!entity || !['dead', 'corpse'].includes(entity.status)) return false;
  entity.hp = Math.ceil(entity.maxHp / 2);
  entity.status = entity.status === 'corpse' ? 'persistent' : 'alive';
  entity.mutated = phase >= 3;
  entity.revivals += 1;
  return true;
}
