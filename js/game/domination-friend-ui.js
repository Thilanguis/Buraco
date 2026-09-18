import { canCallDominationFriend, isDominationFriendTurn, FRIEND_NAMES, FRIEND_PRESENTATION_TIMING } from './domination-friend.js';

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

export function renderDominationFriend(state, playerId) {
  const button = document.getElementById('callFriendBtn');
  if (button) button.hidden = !canCallDominationFriend(state, playerId);
  let panel = document.getElementById('dominationFriendPanel');
  const friend = state?.mode === '1x1_dominacao' && !state.finished ? state.dominationFriend : null;
  if (!friend?.active) { panel?.remove(); return; }
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
  const key = `${friend.id}:${friend.hand.map((card) => `${card.id}/${card.back}`).join(',')}:${friend.stock.length}:${friend.turnsRemaining}:${friend.pendingTurnId}:${friend.farewell}`;
  if (panel.dataset.viewKey === key) return;
  panel.dataset.viewKey = key;
  panel.replaceChildren();
  const heading = document.createElement('strong');
  heading.className = 'opponent-label';
  heading.textContent = `👠 ${friend.name} (${friend.hand.length})`;
  const detail = document.createElement('span');
  detail.className = 'friend-seat-status';
  detail.textContent = `${playing ? 'JOGANDO · ' : ''}${friend.turnsRemaining} ${friend.turnsRemaining === 1 ? 'turno restante' : 'turnos restantes'}`;
  const hand = document.createElement('div');
  hand.className = 'opponent-cards';
  hand.setAttribute('aria-label', `Mão de ${friend.name}: ${friend.hand.length} cartas`);
  for (const card of friend.hand) hand.append(cardBack(card));
  panel.append(heading, detail, hand);
  const stock = document.createElement('div');
  stock.id = 'dominationFriendStock';
  stock.className = 'friend-stock';
  if (friend.stock.length) stock.append(cardBack(friend.stock[friend.stock.length - 1]));
  const stockLabel = document.createElement('small');
  stockLabel.textContent = `MONTE AUXILIAR (${friend.stock.length})`;
  stock.append(stockLabel);
  panel.append(stock);
  if (friend.farewell) {
    const farewell = document.createElement('b');
    farewell.className = 'friend-farewell';
    farewell.textContent = '💋 DESPEDIDA';
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
export async function playDominationFriendTimeline(view, result, { animate, render, isActive }) {
  const friend = view.dominationFriend;
  for (const step of result.steps || []) {
    if (!isActive()) return;
    await animate(step);
    if (!isActive()) return;
    const ids = new Set(step.cards.map((card) => card.id));
    if (step.type === 'drawStock') {
      friend.stock = friend.stock.filter((card) => !ids.has(card.id));
      friend.hand.push(...step.cards.map((card) => ({ ...card })));
    } else {
      friend.hand = friend.hand.filter((card) => !ids.has(card.id));
      view.teams.find((team) => team.id === step.teamId).melds[step.meldIndex] = step.meld.map((card) => ({ ...card }));
    }
    if (step.friendEvent) {
      friend.turnsRemaining = step.friendEvent.turnsRemaining;
      friend.extraTurns = step.friendEvent.extraTurns;
      friend.farewell = false;
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
