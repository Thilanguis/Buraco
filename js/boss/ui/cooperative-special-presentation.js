// Cosmetics only. No card faces, gameplay mutations, audio playback or action gates.
export const SPECIAL_PRESENTATION = Object.freeze({ durationMs: 3000, imageTimeoutMs: 400,
  enterEnd: .25, flightStart: .36, flightDuration: .24, stagger: .02, exitStart: .75,
  fallbackFlightMs: 420, fallbackStaggerMs: 45 });
export const SPECIAL_CHARACTER_ASSETS = Object.freeze({
  dimitrescu: Object.freeze({ name: 'Ada Wong', src: 'assets/images/special/ada-wong.png' }),
  nemesis: Object.freeze({ name: 'Jill Valentine', src: 'assets/images/special/jill-valentine.png' }),
  nehelenia: Object.freeze({ name: 'Sailor Moon', src: 'assets/images/special/sailor-moon.png' }),
  banker: null, matriarca_esmeralda: null, dominadora: null,
});
const colors = { nemesis: '#99e37c', dimitrescu: '#dc697b', nehelenia: '#c5a3f5',
  matriarca_esmeralda: '#60e9b5', dominadora: '#e8b6ec', banker: '#e8c775' };

// Protect actual controls/cards rather than empty panels. Portrait artwork may
// be briefly overlaid, but names, chips, health, HUD, hands and piles stay clear.
export const SPECIAL_PROTECTED_SELECTOR = '.boss-hud-heading > div, .boss-vitals, .boss-intent, .boss-dialogue-presentation, .boss-battle-details, .boss-choice-panel, #dimitrescuCastleItems, #castleFury, #castleDaggerLink, #nemesisStarsOverlay, .boss-portrait .boss-daughter-state, .boss-portrait .boss-intent-help-button, .boss-combat-chips, .boss-combat-content, .boss-daughter-card > b, .boss-daughter-card > .boss-intent-help-button, .castle-sacrifice-stack, .board-melds .carta, .board-melds .meld-label, .board-melds .meld-title > *, .board-top-actions, .board-status, #drawStockBtn, #drawDiscardBtn, #handContainer, .player-actions, .player-label, .opponent-hand, #message, #bossIntentHelpPopover, #bossRule';

// Fit the original aspect ratio in free vertical intervals, preferring the right. Never
// move/resize game elements; a cramped viewport may use the card-flight fallback.
export function specialCharacterPlacement({ width, height }, image, obstacles = []) {
  const margin = 12, ratio = image.width / image.height;
  if (!(ratio > 0) || width < 48 || height < 48) return null;
  obstacles = obstacles.filter(r => r && r.width > 0 && r.height > 0 && r.left < width && r.left+r.width > 0 && r.top < height && r.top+r.height > 0);
  const desired = Math.min(width * (width > 1100 ? .35 : width > 600 ? .32 : .34), 660);
  let best = null;
  for (const scale of [1, .8, .6, .4]) {
    const maxWidth = desired * scale;
    // A blank portion of the board is a valid stage; limiting the search to the
    // outermost right column made the original characters unnecessarily tiny.
    const positions = [...new Set([width-margin-maxWidth, ...obstacles.flatMap(r => [r.left-maxWidth-8, r.left+r.width+8])])];
    for (const left of positions.filter(x => x >= margin && x+maxWidth <= width-margin)) {
      const blocked = obstacles.filter(r => r.left < left+maxWidth && r.left+r.width > left && r.top < height-margin && r.top+r.height > margin)
        .map(r => [Math.max(margin, r.top-8), Math.min(height-margin, r.top+r.height+8)])
        .sort((a,b) => a[0]-b[0]);
      let cursor = margin;
      const gaps = [];
      for (const [start,end] of blocked) { if (start > cursor) gaps.push([cursor,start]); cursor = Math.max(cursor,end); }
      if (cursor < height-margin) gaps.push([cursor,height-margin]);
      for (const [start,end] of gaps) {
        const h = Math.min(end-start, height*.78, 900, maxWidth/ratio), w = h*ratio;
        if (h < 48 || w < 28) continue;
        const rect = { left: left+maxWidth-w, top: start+(end-start-h)/2, width:w, height:h };
        if (!best || rect.height > best.height || (rect.height === best.height && rect.left > best.left)) best = rect;
      }
    }
  }
  return best;
}

export async function presentCooperativeSpecial({ document, from, to, count, bossId, reducedMotion,
  signal, isCurrent = () => true, getGeometry, onCue = () => {}, config = SPECIAL_PRESENTATION,
  assets = SPECIAL_CHARACTER_ASSETS }) {
  if (reducedMotion || document.hidden || signal?.aborted || !isCurrent() || !count) return;
  const win = document.defaultView, nodes = new Set(), animations = new Set(), timers = new Set();
  let stopped = false, finishAbort;
  const aborted = new Promise(resolve => { finishAbort = resolve; });
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const animation of animations) animation.cancel?.();
    animations.clear();
    for (const node of nodes) node.remove();
    nodes.clear(); finishAbort();
  };
  const current = () => !stopped && !signal?.aborted && isCurrent();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (current()) fn(); }, ms); timers.add(id); return id; };
  const node = tag => { const el = document.createElement(tag); el.setAttribute('aria-hidden','true'); nodes.add(el); return el; };
  const animate = (el, frames, options) => {
    const animation = el.animate(frames, options); animations.add(animation);
    return animation.finished.catch(() => {}).finally(() => { animations.delete(animation); el.remove(); nodes.delete(el); });
  };
  const cue = phase => { if (current()) { try { onCue(phase); } catch {} } }; // Future opt-in audio hook, silent today.
  signal?.addEventListener('abort',stop,{once:true});
  const hidden = () => { if (document.hidden) stop(); };
  document.addEventListener?.('visibilitychange',hidden);
  win?.addEventListener?.('resize',stop,{once:true});
  timers.add(setTimeout(stop, config.imageTimeoutMs + config.durationMs + 1000)); // Cleanup even if stale/throttled.
  try {
    let hero = null, placement = null;
    const asset = assets[bossId];
    if (asset && win?.Image) {
      hero = node('img'); hero.className = 'boss-special-character'; hero.alt = '';
      const loaded = await Promise.race([new Promise(resolve => {
        hero.onload = () => resolve(hero.naturalWidth > 0);
        hero.onerror = () => resolve(false);
        later(() => resolve(false),config.imageTimeoutMs);
        hero.src = asset.src;
        if (hero.complete && hero.naturalWidth) resolve(true);
      }), aborted.then(() => false)]);
      hero.onload = hero.onerror = null;
      if (!current()) return;
      const geometry = getGeometry?.() || { from, to, viewport:{width:win.innerWidth,height:win.innerHeight}, obstacles:[] };
      if (loaded) placement = specialCharacterPlacement(geometry.viewport,
        {width:hero.naturalWidth,height:hero.naturalHeight}, geometry.obstacles);
      if (!placement) { hero.remove(); nodes.delete(hero); hero = null; }
    }
    if (!current()) return;
    const geometry = getGeometry?.() || {from,to};
    from = geometry.from; to = geometry.to;
    if (!from || !to || ![from.left,from.top,to.left,to.top].every(Number.isFinite)) return;
    const duration = config.durationMs, promises = [];
    if (hero) {
      Object.assign(hero.style,{left:`${placement.left}px`,top:`${placement.top}px`,width:`${placement.width}px`,height:`${placement.height}px`});
      // Clip only the journey, not the resting PNG. A character travelling to a
      // free portrait area must not sweep across HP labels/controls on the way.
      const stage = node('span'); stage.className = 'boss-special-stage';
      stage.style.clipPath = `inset(${placement.top}px ${win.innerWidth-placement.left-placement.width}px ${win.innerHeight-placement.top-placement.height}px ${placement.left}px)`;
      stage.append(hero); document.body.append(stage); cue('entry');
      const outside = placement.width+16;
      promises.push(animate(hero,[{transform:`translateX(${outside}px)`,opacity:0,easing:'cubic-bezier(.22,.7,.3,1)'},
        {transform:'translateX(0)',opacity:1,offset:config.enterEnd},
        {transform:'translateX(0)',opacity:1,offset:config.exitStart,easing:'cubic-bezier(.4,0,.7,.3)'},
        {transform:`translateX(${outside}px)`,opacity:0}],{duration,easing:'linear',fill:'both'}));
    }
    const flightDuration = hero ? duration*config.flightDuration : config.fallbackFlightMs;
    const start = hero ? duration*config.flightStart : 0, stagger = hero ? duration*config.stagger : config.fallbackStaggerMs;
    // Silhouettes never contain rank, suit, metadata or a card-face image.
    for (let i=0;i<Math.min(5,count);i++) {
      const card = node('span'); card.className = 'boss-special-flight';
      Object.assign(card.style,{left:`${from.left+from.width/2}px`,top:`${from.top+from.height/2}px`,'--special-color':colors[bossId]||'#e8c775'});
      document.body.append(card);
      const dx=to.left+to.width/2-(from.left+from.width/2)+(i-2)*8,dy=to.top+to.height/2-(from.top+from.height/2);
      promises.push(animate(card,[{transform:'translate(-50%, -50%) scale(.7)',opacity:0},
        {transform:'translate(-50%, -50%) scale(1)',opacity:1,offset:.12},
        {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${(i-2)*7}deg)`,opacity:0}],
      {duration:flightDuration,delay:start+i*stagger,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}));
    }
    if (win) promises.push(new Promise(resolve => later(() => {
      cue('arrival');
      const latest = getGeometry?.()?.to || to;
      const arrival = node('span'); arrival.className='boss-special-arrival';
      Object.assign(arrival.style,{left:`${latest.left+latest.width/2}px`,top:`${latest.top+latest.height/2}px`,'--special-color':colors[bossId]||'#e8c775'});
      document.body.append(arrival);
      void animate(arrival,[{transform:'translate(-50%, -50%) scale(.8)',opacity:.65},
        {transform:'translate(-50%, -50%) scale(1.2)',opacity:0}],{duration:duration*.12,easing:'ease-out'}).then(resolve);
    },start+flightDuration+(Math.min(5,count)-1)*stagger)));
    await Promise.race([Promise.all(promises),aborted]);
  } finally {
    signal?.removeEventListener('abort',stop);
    document.removeEventListener?.('visibilitychange',hidden);
    win?.removeEventListener?.('resize',stop);
    stop();
  }
}

// Per-client presentation history, not a gameplay ledger. First snapshots are
// baselines; subsequent confirmed real IDs may play once. Undo never clears seen.
export function createCooperativeSpecialPresenter({ present = presentCooperativeSpecial, storage = null } = {}) {
  let scope = null, seen = new Set(), revision = -1, active = null;
  const identity = state => state?.boss ? `${state.mode}:${state.matchStartedAt}:${state.boss.id}` : null;
  const ids = state => state?.boss?.cooperativeSpecial?.resolvedActionIds || [];
  const remember = id => { seen.add(id); try { storage?.setItem(`buraco-special-seen:${scope}`,JSON.stringify([...seen])); } catch {} };
  function cancel() { active?.controller.abort(); active = null; }
  function enter(state) {
    const next = identity(state);
    if (scope === next) return false;
    cancel(); scope = next; seen = new Set(); revision = -1;
    try { for (const id of JSON.parse(storage?.getItem(`buraco-special-seen:${scope}`) || '[]')) seen.add(id); } catch {}
    return true;
  }
  function observe(state,{initial=false}={}) {
    const changed = enter(state), nextRevision=Number(state?.bossStateRevision)||0;
    if (nextRevision < revision) return null;
    revision = nextRevision;
    if (initial || changed || !scope) { cancel(); for (const id of ids(state)) remember(id); return null; }
    if (state.lastAction?.type==='undoMove' || (active && !ids(state).includes(active.id))) cancel();
    const action=state.lastAction;
    return action?.type==='bossSpecial' && ids(state).includes(action.id) && !seen.has(action.id) ? action : null;
  }
  async function playConfirmed(state,action,options) {
    enter(state);
    const nextRevision=Number(state?.bossStateRevision)||0;
    if (nextRevision < revision) return;
    revision = nextRevision;
    if (!scope || action?.type!=='bossSpecial' || !action.id || action.count!==5 || !ids(state).includes(action.id) || seen.has(action.id)) return;
    remember(action.id); cancel();
    const run={id:action.id,scope,controller:new AbortController()};active=run;
    try { await present({...options,count:5,bossId:state.boss.id,signal:run.controller.signal,
      isCurrent:()=>active===run && scope===run.scope && (options?.isCurrent?.() ?? true)}); }
    finally { if (active===run) active=null; }
  }
  return {observe,playConfirmed,cancel};
}
