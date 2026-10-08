// Presentation only: amounts come from resolved events, never from current buffs.
export function resourceFeedbackSteps(boss, event) {
  if (!['nemesis', 'dimitrescu'].includes(boss.id)) return [];
  if (boss.id==='nemesis' && event.type==='bossHeal' && event.sourceEntityId==='devourer' && event.amount>0) {
    return [{entityId:'devourer',metric:'hp',amount:event.amount,before:event.hpBefore??event.hp-event.amount,
      after:event.hp,color:'#9cde4d',label:'HP'}];
  }
  const supported = boss.id === 'nemesis'
    ? ['infection', 'nemesisObjective', 'bossDamage'].includes(event.type)
    : ['bloodChange', 'bossAbility', 'bossDamage'].includes(event.type);
  if (!supported) return [];
  const amount = Number(event.appliedDangerDelta ?? event.dangerDelta ?? event.amount) || 0;
  if (!amount) return [];
  const after = Number.isFinite(event.danger) ? event.danger : boss.danger;
  const before = Number.isFinite(event.dangerBefore) ? event.dangerBefore : Math.max(0, after - amount);
  const delta = after - before;
  if (!delta) return [];
  const sources = delta > 0 && event.resourceSources?.length ? event.resourceSources
    : [{ entityId: event.sourceEntityId || (boss.id === 'dimitrescu'
      ? ['bela', 'cassandra', 'daniela'].find(id => event.actionId?.startsWith(`daughter_${id}_`)) : null), amount: delta }];
  let cursor = before;
  return sources.flatMap(source => {
    const applied = delta > 0 ? Math.min(Math.max(0, source.amount), after - cursor) : delta;
    if (!applied) return [];
    const step = { entityId: source.entityId || 'boss', amount: applied, before: cursor, after: cursor + applied,
      color: boss.id === 'nemesis' ? '#9cde4d' : '#ef405c', label: boss.id === 'nemesis' ? 'Infecção' : 'Sede' };
    cursor += applied;
    return [step];
  });
}

export function createResourceFeedbackPresenter({ document, reducedMotion = () => false }) {
  let scope = null, queue = [], running = false, version = 0, displayed = null, maximum = 100, metric = 'danger';
  const nodes = new Set(), animations = new Set();
  const seen = new Set();
  const scopeOf = boss => `${boss.id}:${boss.seed}`;
  const sync = (boss, immediate = false) => {
    if (scope !== scopeOf(boss)) { clear(); scope = scopeOf(boss); }
    maximum = metric==='hp'?boss.maxHp:boss.maxDanger || 100;
    if (displayed == null) return;
    const bar = document.getElementById(metric==='hp'?'bossHpBar':'bossDebtBar'), text = document.getElementById(metric==='hp'?'bossHpText':'bossDebtText');
    if (bar) {
      const transition = bar.style.transition;
      if (immediate) bar.style.transition = 'none';
      bar.style.width = `${displayed / maximum * 100}%`;
      // Hold the pre-impact fill without a reverse tween from the latest render.
      if (immediate) { bar.getBoundingClientRect(); bar.style.transition = transition; }
    }
    if (text) text.textContent = `${displayed} / ${maximum}`;
  };
  function clear() {
    version++; queue = []; running = false; displayed = null;
    for (const animation of animations) animation.cancel();
    for (const node of nodes) node.remove();
    animations.clear(); nodes.clear(); seen.clear();
  }
  async function animate(node, frames, options, allowReduced = false) {
    if (!node.animate || (reducedMotion() && !allowReduced)) return;
    const animation = node.animate(frames, options); animations.add(animation);
    try { await animation.finished; } catch { /* cancelled on match/undo change */ }
    animations.delete(animation);
  }
  async function drain(boss) {
    if (running) return;
    running = true;
    const token = version;
    while (queue.length && token === version) {
      const step = queue.shift();
      metric = step.metric || 'danger';
      displayed = step.before; sync(boss, true);
      const bar = document.getElementById(metric==='hp'?'bossHpBar':'bossDebtBar'), track = bar?.parentElement;
      const source = step.entityId === 'boss' ? document.querySelector('#bossHud .boss-portrait')
        : document.querySelector(`[data-entity-id="${step.entityId}"]`);
      if (!track) continue;
      const end = track.getBoundingClientRect(), start = (source || track).getBoundingClientRect();
      const arrivalX = bar.getBoundingClientRect().right;
      if (step.amount > 0 && step.entityId !== 'boss' && source && !reducedMotion()) {
        const ray = document.createElement('span'); ray.className = 'boss-resource-transfer';
        ray.dataset.sourceId = step.entityId; ray.style.setProperty('--resource-color', step.color);
        ray.style.left = `${start.left + start.width / 2}px`; ray.style.top = `${start.top + start.height / 2}px`;
        const dx = arrivalX - (start.left + start.width / 2);
        const dy = end.top + end.height / 2 - (start.top + start.height / 2);
        ray.style.setProperty('--resource-angle', `${Math.atan2(dy, dx)}rad`);
        document.body.append(ray); nodes.add(ray);
        await animate(ray, [{transform:'translate(0,0)',opacity:0}, {opacity:1,offset:.15},
          {transform:`translate(${dx}px,${dy}px)`,opacity:1}], {duration:700,easing:'ease-in',fill:'forwards'});
        ray.remove(); nodes.delete(ray);
      }
      if (token !== version) return;
      displayed = step.after; sync(boss);
      const floating = document.createElement('div'); floating.className = 'boss-resource-arrival';
      floating.dataset.sourceId = step.entityId; floating.textContent = `${step.amount > 0 ? '+' : '−'}${Math.abs(step.amount)} ${step.label}`;
      floating.style.color = step.color; floating.style.left = `${arrivalX}px`; floating.style.top = `${end.top}px`;
      document.body.append(floating); nodes.add(floating);
      await animate(track, [{filter:'brightness(1)'},{filter:'brightness(1.55)',offset:.3},{filter:'brightness(1)'}], {duration:250});
      const frames = reducedMotion() ? [{opacity:1},{opacity:1,offset:.85},{opacity:0}]
        : [{opacity:1,transform:'translate(-50%,-50%)'}, {opacity:0,transform:'translate(-50%,-140%)'}];
      await animate(floating, frames, {duration:650,easing:'ease-out'}, true);
      floating.remove(); nodes.delete(floating);
    }
    if (token === version) { displayed = null; running = false; }
  }
  return { sync, clear, enqueue(boss, event) {
    sync(boss);
    const steps = resourceFeedbackSteps(boss, event);
    if (!steps.length) return false;
    if (event.actionId && seen.has(event.actionId)) return true;
    if (event.actionId) seen.add(event.actionId);
    queue.push(...steps); void drain(boss);
    return true;
  } };
}
