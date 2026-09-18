import { canCallDominationFriend, isDominationFriendTurn, isDominationFriendEndgame, FRIEND_NAMES, FRIEND_PRESENTATION_TIMING } from './domination-friend.js';

// The wheel only presents the already persisted result; it never rolls again.
export function friendWheelSegments(values, weights = values.map(() => 1)) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let angle = 0;
  return values.map((value, index) => {
    const start = angle;
    angle += weights[index] / total * 360;
    return { value, start, end: angle, center: (start + angle) / 2 };
  });
}

export function createFriendNoticeTracker() {
  let gameKey = null;
  let seen = new Set();
  return {
    reset() { gameKey = null; seen.clear(); },
    collect(state, deferArrival = false) {
      if (state?.mode !== '1x1_dominacao') return [];
      const key = state.friendGameId || 'legacy-domination';
      const events = state.dominationFriend?.events || [];
      if (key !== gameKey) {
        gameKey = key;
        seen = new Set(events.map((event) => event.id));
        return []; // Reload: prime saved events, do not replay old announcements.
      }
      return events.filter((event) => {
        if (seen.has(event.id) || (deferArrival && event.type === 'arrival')) return false;
        seen.add(event.id);
        return true;
      });
    },
  };
}

function cardBack(card) {
  const back = document.createElement('div');
  back.className = `opponent-card-back back-${card.back === 'blue' ? 'blue' : 'red'}`;
  back.dataset.cardId = card.id;
  return back;
}

let spotlightBinding = null;

export function friendSpotlightGeometry(rect, width) {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height * .65;
  const origin = Math.max(24, Math.min(width - 24, x - width * .22));
  const spread = Math.min(125, Math.max(65, rect.width * 1.25));
  return { x, y, origin, spread,
    path: `M ${origin - 9} -30 L ${origin + 9} -30 L ${x + spread} ${y} Q ${x} ${y + 35} ${x - spread} ${y} Z` };
}

function syncFriendSpotlight(stock) {
  if (!stock) {
    spotlightBinding?.dispose();
    spotlightBinding = null;
    return;
  }
  if (!stock.getBoundingClientRect || !globalThis.ResizeObserver) return;
  if (spotlightBinding?.stock !== stock) {
    spotlightBinding?.dispose();
    const overlay = document.createElement('div');
    overlay.id = 'dominationFriendSpotlight';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="friendBeamFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff6df" stop-opacity=".20"/>
          <stop offset=".65" stop-color="#fff6df" stop-opacity=".07"/>
          <stop offset="1" stop-color="#fff6df" stop-opacity=".16"/>
        </linearGradient>
        <radialGradient id="friendBeamPool"><stop stop-color="#fff1c2" stop-opacity=".20"/><stop offset="1" stop-color="#fff1c2" stop-opacity="0"/></radialGradient>
        <filter id="friendBeamSoft" x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
      </defs>
      <path class="friend-spotlight-beam" fill="url(#friendBeamFade)" filter="url(#friendBeamSoft)"/>
      <ellipse fill="url(#friendBeamPool)"/>
    </svg>`;
    document.getElementById('gameSection').append(overlay);
    const beam = overlay.querySelector('path');
    const pool = overlay.querySelector('ellipse');
    const update = () => {
      const present = stock.isConnected;
      overlay.classList.toggle('is-playing', present);
      if (!present) return;
      const anchor = stock.classList.contains('is-playing')
        ? stock.querySelector('.friend-stock-stack')
        : document.querySelector('#drawStockBtn .pile-card');
      if (!anchor) return;
      const geometry = friendSpotlightGeometry(anchor.getBoundingClientRect(), window.innerWidth);
      beam.setAttribute('d', geometry.path);
      beam.style.transformOrigin = `${geometry.origin}px 0px`;
      pool.setAttribute('cx', geometry.x);
      pool.setAttribute('cy', geometry.y);
      pool.setAttribute('rx', geometry.spread * 1.3);
      pool.setAttribute('ry', '65');
    };
    const observer = new ResizeObserver(update);
    observer.observe(stock);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    spotlightBinding = { stock, update, dispose() {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      overlay.remove();
    } };
  }
  spotlightBinding.update();
}

export function renderDominationFriend(state, playerId) {
  const enabled = state?.mode === '1x1_dominacao' && !state.finished && state.dominationOptions?.friend !== false;
  const board = document.querySelector('#gameSection > .board');
  board?.classList.toggle('friend-layout', enabled);
  board?.classList.toggle('friend-layout-right', enabled && playerId === 1);
  board?.classList.toggle('friend-layout-left', enabled && playerId !== 1);
  const button = document.getElementById('callFriendBtn');
  if (button) {
    button.hidden = !(enabled && playerId === 1);
    button.disabled = !canCallDominationFriend(state, playerId);
    button.textContent = state?.friendUsed ? '✓ AMIGA CHAMADA' : '📞 CHAMAR AMIGA';
  }
  let panel = document.getElementById('dominationFriendPanel');
  let stock = document.getElementById('dominationFriendStock');
  const friend = state?.mode === '1x1_dominacao' && !state.finished ? state.dominationFriend : null;
  board?.classList.toggle('friend-present', !!friend?.active);
  board?.classList.toggle('friend-playing', !!friend?.active && isDominationFriendTurn(state));
  if (!friend?.active) { panel?.remove(); stock?.remove(); syncFriendSpotlight(null); return; }
  if (!panel) {
    panel = document.createElement('aside');
    panel.id = 'dominationFriendPanel';
    panel.setAttribute('aria-live', 'polite');
    // Match the existing opponents' parent: direct children of gameSection
    // receive position:relative and would reserve a blank row below the table.
    document.querySelector('#gameSection > .board')?.append(panel);
  }
  const playing = isDominationFriendTurn(state);
  panel.classList.add('opponent-hand', 'domination-friend-seat');
  panel.classList.toggle('opponent-hand-right', playerId === 1);
  panel.classList.toggle('opponent-hand-left', playerId !== 1);
  panel.classList.toggle('active-turn-glow', playing);
  if (playing) {
    for (const id of ['opponentTop', 'opponentLeft', 'opponentRight']) {
      document.getElementById(id)?.classList.remove('active-turn-glow');
    }
  }
  const endgame = isDominationFriendEndgame(state);
  const key = `${friend.id}:${friend.hand.map((card) => `${card.id}/${card.back}`).join(',')}:${friend.stock.length}:${friend.turnsRemaining}:${friend.extraTurns}:${friend.pendingTurnId}:${friend.farewell}:${endgame}`;
  const viewKey = `${key}:${friend.discard?.length || 0}`;
  if (panel.dataset.viewKey === viewKey && stock) { syncFriendSpotlight(stock); return; }
  panel.dataset.viewKey = viewKey;
  panel.replaceChildren();
  const heading = document.createElement('strong');
  heading.className = 'opponent-label';
  heading.textContent = `👠 ${friend.name} (${friend.hand.length})`;
  const detail = document.createElement('span');
  detail.className = 'friend-seat-status';
  detail.textContent = `${playing ? 'JOGANDO · ' : ''}${friend.turnsRemaining} ${friend.turnsRemaining === 1 ? 'turno restante' : 'turnos restantes'}`;
  if (friend.extraTurns) detail.textContent += ` · +${friend.extraTurns} ganhos`;
  const hand = document.createElement('div');
  hand.className = 'opponent-cards';
  hand.setAttribute('aria-label', `Mão de ${friend.name}: ${friend.hand.length} cartas`);
  // Like normal side seats, cap the visible fan, not the real hand or counter.
  for (const card of friend.hand.slice(0, 12)) hand.append(cardBack(card));
  panel.append(heading, detail, hand);
  const trash = document.createElement('div');
  trash.id = 'dominationFriendDiscard';
  trash.className = 'friend-discard';
  const face = document.createElement('div');
  face.className = 'friend-discard-face';
  const topDiscard = friend.discard?.at(-1);
  face.textContent = topDiscard ? `${topDiscard.rank} ${topDiscard.suit}` : '';
  face.classList.toggle('has-card', !!topDiscard);
  face.classList.toggle('red-card', ['♥', '♦'].includes(topDiscard?.suit));
  const trashLabel = document.createElement('small');
  trashLabel.textContent = `LIXO DA AMIGA (${friend.discard?.length || 0})`;
  trash.append(face, trashLabel);
  panel.append(trash);
  if (!stock) {
    stock = document.createElement('div');
    stock.id = 'dominationFriendStock';
    stock.className = 'friend-stock';
    stock.setAttribute('aria-live', 'polite');
    document.querySelector('#gameSection .board-middle')?.append(stock);
  }
  stock.replaceChildren();
  stock.classList.toggle('is-playing', playing);
  const stack = document.createElement('div');
  stack.className = 'friend-stock-stack';
  stack.setAttribute('aria-hidden', 'true');
  // Same density and offsets as the main stock. Keep the top card first in
  // the DOM so existing deal/draw animations measure the visible top layer.
  const layers = Math.min(16, Math.ceil(friend.stock.length / 3));
  const topCard = friend.stock[friend.stock.length - 1];
  for (let i = layers - 1; i >= 0; i--) {
    const top = i === layers - 1;
    const back = (layers - 1 - i) % 2 === 0 ? topCard.back : topCard.back === 'blue' ? 'red' : 'blue';
    const layer = cardBack({ ...topCard, back });
    layer.classList.add('visual-layer');
    if (!top) layer.classList.add('sub-layer');
    layer.style.bottom = `${i * 1.2}px`;
    layer.style.right = `${i * 0.3}px`;
    layer.style.zIndex = i;
    if (!top) layer.style.filter = `brightness(${0.4 + (i / layers) * 0.5})`;
    stack.append(layer);
  }
  stock.append(stack);
  const stockLabel = document.createElement('small');
  stockLabel.className = 'pile-info';
  stockLabel.textContent = `MONTE AUXILIAR (${friend.stock.length})`;
  stock.append(stockLabel);
  syncFriendSpotlight(stock);
  if (friend.farewell || endgame) {
    const farewell = document.createElement('b');
    farewell.className = 'friend-farewell';
    farewell.textContent = endgame ? 'RETA FINAL DO MONTE' : '💋 DESPEDIDA';
    panel.append(farewell);
  }
}

function createWheel(segments) {
  const wheel = document.createElement('div');
  wheel.className = 'friend-wheel';
  wheel.setAttribute('aria-hidden', 'true');
  const rotor = document.createElement('div');
  rotor.className = 'friend-wheel-rotor';
  const colors = ['#82363f', '#215e50', '#283d70'];
  rotor.style.background = `conic-gradient(${segments.map((segment, index) => `${colors[index % colors.length]} ${segment.start}deg ${segment.end}deg`).join(',')})`;
  for (const segment of segments) {
    const label = document.createElement('span');
    label.className = 'friend-wheel-label';
    const radians = segment.center * Math.PI / 180;
    label.style.left = `${50 + Math.sin(radians) * 31}%`;
    label.style.top = `${50 - Math.cos(radians) * 31}%`;
    label.style.transform = `translate(-50%, -50%) rotate(${segment.center}deg)`;
    label.textContent = segment.value;
    rotor.append(label);
  }
  const hub = document.createElement('span');
  hub.className = 'friend-wheel-hub';
  hub.textContent = '★';
  wheel.append(rotor, hub);
  return { wheel, rotor };
}

export async function dealDominationFriendCards(friend, isActive, { fly, impact, rect }) {
  const panel = document.getElementById('dominationFriendPanel');
  if (!panel || !isActive()) return;
  panel.classList.add('friend-entering');
  const backs = [...panel.querySelectorAll('.opponent-cards .opponent-card-back')];
  const source = document.querySelector('#dominationFriendStock .opponent-card-back');
  if (!source) { panel.classList.remove('friend-entering'); return; }
  const origin = rect(source);
  backs.forEach((back) => { back.style.visibility = 'hidden'; });
  try {
    await Promise.all(backs.map(async (back, index) => {
      await new Promise((resolve) => setTimeout(resolve, index * 35));
      if (!isActive()) return;
      const target = rect(back);
      try {
        await fly(friend.hand[index], origin, target, 'back');
        if (isActive()) impact(target);
      } finally {
        back.style.visibility = '';
      }
    }));
  } finally {
    backs.forEach((back) => { back.style.visibility = ''; });
    panel.classList.remove('friend-entering');
  }
}

// Replay committed actions on a visual copy only. Each flight uses the normal
// player animator; each frame uses the normal renderer (scores, canastras, SFX).
export async function playDominationFriendTimeline(view, result, { animate, render, isActive, pace }) {
  const friend = view.dominationFriend;
  const steps = result.steps || [];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    if (!isActive()) return;
    if (pace && step.type !== 'dominatorBonus' && !(step.type === 'drawStock' && step.reason === 'canastra')) {
      const stage = index === 0 ? 'think' : step.type === 'discard' ? 'discard'
        : steps[index - 1].type.startsWith('draw') ? 'organize' : 'play';
      await pace(stage);
      if (!isActive()) return;
    }
    if (step.type === 'drawStock' && step.reason === 'canastra' && steps[index + 1]?.type === 'dominatorBonus') {
      const ownerSteps = [];
      while (steps[index + 1]?.type === 'dominatorBonus') ownerSteps.push(steps[++index]);
      // The two hands buy together, independently of the sound queue.
      await Promise.all([
        playDominationFriendTimeline(view, { steps: [step] }, { animate, render, isActive }),
        playDominationFriendTimeline(view, { steps: ownerSteps }, { animate, render, isActive }),
      ]);
      continue;
    }
    if (step.type === 'dominatorBonus') {
      await animate({ ...step, drawnCards: step.cards, autoRecycledIndex: step.recycledIndex });
      if (!isActive()) return;
      if (step.recycledStock) {
        view.deadPiles[step.recycledIndex] = [];
        view.stock = step.recycledStock.map((card) => ({ ...card }));
      }
      for (const card of step.cards) {
        if (card._isEndgameSteal) view.players[0].hand = view.players[0].hand.filter((entry) => entry.id !== card.id);
        else view.stock = view.stock.filter((entry) => entry.id !== card.id);
        view.players[1].hand.push({ ...card });
      }
      render();
      continue;
    }
    if (step.type === 'drawDiscard') {
      // Private pile only. Counters move after each real card has arrived.
      for (const [cardIndex, card] of [...step.cards].reverse().entries()) {
        if (pace && cardIndex > 0) await pace('card');
        if (!isActive()) return;
        await animate({ ...step, cards: [card], card });
        if (!isActive()) return;
        friend.discard = (friend.discard || []).filter((entry) => entry.id !== card.id);
        friend.hand.push({ ...card });
        render();
      }
      continue;
    }
    if (step.type === 'drawStock') {
      // Show the exact auxiliary purchase one card at a time, including each
      // canastra bonus; the hand/stock counters advance with the actual flights.
      for (const [drawIndex, card] of step.cards.entries()) {
        if (pace && drawIndex > 0) await pace('card');
        if (!isActive()) return;
        await animate({ ...step, cards: [card], drawIndex, drawTotal: step.cards.length });
        if (!isActive()) return;
        friend.stock = friend.stock.filter((entry) => entry.id !== card.id);
        friend.hand.push({ ...card });
        render();
      }
      continue;
    }
    await animate(step);
    if (!isActive()) return;
    const ids = new Set(step.cards.map((card) => card.id));
    friend.hand = friend.hand.filter((card) => !ids.has(card.id));
    if (step.type === 'discard') {
      (friend.discard ||= []).push({ ...step.card });
      render();
      continue;
    }
    view.teams.find((team) => team.id === step.teamId).melds[step.meldIndex] = step.meld.map((card) => ({ ...card }));
    if (step.friendEvent) {
      friend.turnsRemaining = step.friendEvent.turnsRemaining;
      friend.extraTurns = step.friendEvent.extraTurns;
      friend.farewell = isDominationFriendEndgame(view);
      (friend.events ||= []).push({ ...step.friendEvent });
    }
    render();
  }
}

export async function showDominationFriendNotice(event) {
  const notice = document.createElement('aside');
  notice.className = `friend-notice friend-notice-${event.type}`;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  if (event.type === 'extraTurn') {
    const kind = { limpa: 'Limpa', real: 'Real', asas: 'Ás-a-Ás' }[event.kind];
    title.textContent = `+1 TURNO PARA ${event.name.toUpperCase()}!`;
    detail.textContent = `${event.actorName} fez ${kind} · ${event.turnsRemaining} turnos disponíveis`;
  } else {
    title.textContent = event.type === 'arrival' ? `👠 ${event.name} entrou na mesa!` : `💋 ${event.name} se despediu!`;
    detail.textContent = event.type === 'arrival' ? `${event.turnsRemaining} turnos para ajudar o Dominador` : 'Os jogos construídos continuam na mesa.';
  }
  notice.append(title, detail);
  document.body.append(notice);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  try {
    await notice.animate([
      { opacity: 0, transform: reduced ? 'translate(-50%, 0)' : 'translate(-50%, 20px) scale(.92)' },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .12 },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .86 },
      { opacity: 0, transform: reduced ? 'translate(-50%, 0)' : 'translate(-50%, -10px) scale(1)' },
    ], { duration: 3200, easing: 'ease-out', fill: 'both' }).finished;
  } finally { notice.remove(); }
}

export async function presentDominationFriend(friend, isActive, animations) {
  const overlay = document.createElement('div');
  overlay.id = 'dominationFriendPresentation';
  overlay.className = 'friend-presentation';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  const card = document.createElement('div');
  card.className = 'friend-invitation';
  const title = document.createElement('strong');
  const stage = document.createElement('div');
  stage.className = 'friend-wheel-stage';
  const detail = document.createElement('p');
  card.append(title, stage, detail);
  overlay.append(card);
  document.body.append(overlay);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const spin = async (segments, result) => {
    const { wheel, rotor } = createWheel(segments);
    stage.replaceChildren(wheel);
    const selected = segments.find((segment) => segment.value === result);
    const stop = 360 * 5 + 360 - selected.center;
    rotor.style.transform = `rotate(${stop}deg)`;
    if (!reducedMotion && rotor.animate) {
      await rotor.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${stop}deg)` }], {
        duration: FRIEND_PRESENTATION_TIMING.spinMs, easing: 'cubic-bezier(.12,.72,.12,1)',
      }).finished;
    } else {
      await pause(150);
    }
  };
  let stopRouletteSound;
  try {
    stopRouletteSound = animations.startRouletteSound?.();
    title.textContent = '📞 Chamando uma amiga...';
    detail.textContent = 'Quem vai entrar na mesa?';
    await spin(friendWheelSegments(FRIEND_NAMES), friend.name);
    if (!isActive()) return;
    detail.textContent = `👠 ${friend.name} atendeu!`;
    await pause(FRIEND_PRESENTATION_TIMING.resultMs);
    title.textContent = 'Quanto tempo ela vai ficar?';
    detail.textContent = '3 turnos · 20% | 4 turnos · 35% | 5 turnos · 45%';
    await spin(friendWheelSegments(['3 TURNOS', '4 TURNOS', '5 TURNOS'], [20, 35, 45]), `${friend.initialTurns} TURNOS`);
    if (!isActive()) return;
    detail.textContent = `👠 ${friend.name} chegou para ajudar por ${friend.initialTurns} turnos!`;
    await pause(FRIEND_PRESENTATION_TIMING.resultMs);
    stopRouletteSound?.();
    overlay.remove();
    await dealDominationFriendCards(friend, isActive, animations);
  } finally {
    stopRouletteSound?.();
    overlay.remove();
  }
}
