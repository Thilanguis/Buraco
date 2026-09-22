import { dominationFriends, activeDominationFriends, getDominationFriend, remainingFriendCalls, canCallDominationFriend, isDominationFriendTurn, isDominationFriendEndgame, FRIEND_NAMES, FRIEND_PRESENTATION_TIMING } from './domination-friend.js';
import { OPPONENT_SEAT_IDS, renderOpponentBacks } from './opponent-seats.js';
import { cardFrontHTML, suitClass, deckFaceClass } from './card-face.js';

// The wheel only presents the already persisted result; it never rolls again.
export function friendWheelSegments(values, weights = values.map(() => 1)) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let angle = 0;
  return values.map((value, index) => {
    const start = angle;
    angle += (weights[index] / total) * 360;
    return { value, start, end: angle, center: (start + angle) / 2 };
  });
}

export function createFriendNoticeTracker() {
  let gameKey = null;
  let seen = new Set();
  return {
    reset() {
      gameKey = null;
      seen.clear();
    },
    collect(state, deferArrival = false) {
      if (state?.mode !== '1x1_dominacao') return [];
      const key = state.friendGameId || 'legacy-domination';
      const events = dominationFriends(state).flatMap((friend) => friend.events || []);
      if (key !== gameKey) {
        gameKey = key;
        seen = new Set(events.map((event) => event.id));
        return []; // Reload: prime saved events, do not replay old announcements.
      }
      const fresh = events.filter((event) => {
        if (seen.has(event.id) || (deferArrival && event.type === 'arrival')) return false;
        seen.add(event.id);
        return true;
      });
      const groups = new Map();
      const notices = [];
      for (const event of fresh) {
        if (event.type !== 'extraTurn') {
          notices.push(event);
          continue;
        }
        const key = event.groupId || `${event.id.split(':extra:')[1]}:${event.actorName}`;
        const existing = groups.get(key);
        if (existing) {
          existing.recipients ||= [{ ...existing }];
          existing.recipients.push(event);
        } else {
          const notice = { ...event };
          groups.set(key, notice);
          notices.push(notice);
        }
      }
      return notices;
    },
  };
}

function cardBack(card) {
  const back = document.createElement('div');
  back.className = `opponent-card-back back-${card.back === 'blue' ? 'blue' : 'red'}`;
  back.dataset.cardId = card.id;
  return back;
}

function seatChild(parent, className, tag = 'div') {
  let child = parent.querySelector(`.${className}`);
  if (!child) {
    child = document.createElement(tag);
    child.className = className;
    parent.append(child);
  }
  return child;
}

let spotlightBinding = null;
const seatClearanceBindings = new Map();

// Let only meld rows intersecting the actual guest flow around her. This is
// not a board gutter: there is no exclusion before arrival or after departure,
// and rows above/below the seat retain the entire available width.
function syncFriendSeatClearance(panel, side = 'left') {
  let seatClearanceBinding = seatClearanceBindings.get(side);
  const clearanceClass = `friend-clearance-${side}`;
  const titleProperty = `--friend-title-clearance-${side}`;
  if (!panel) {
    seatClearanceBinding?.dispose();
    seatClearanceBindings.delete(side);
    return;
  }
  if (!panel.getBoundingClientRect) return;
  if (seatClearanceBinding?.panel !== panel) {
    seatClearanceBinding?.dispose();
    const board = document.querySelector('#gameSection > .board');
    const containers = [...board.querySelectorAll('.meld-container')];
    const titles = [...board.querySelectorAll('.meld-title')];
    let frame = null;
    let disposed = false;
    const update = () => {
      frame = null;
      if (disposed) return;
      const seat = panel.getBoundingClientRect();
      for (const container of containers) {
        const rect = container.getBoundingClientRect();
        const css = getComputedStyle(container);
        const contentHeight = rect.height - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
        const width = Math.max(0, Math.ceil(Math.min(rect.width, side === 'left' ? seat.right + 6 - rect.left : rect.right - seat.left + 6)));
        const top = Math.max(0, Math.floor(seat.top - rect.top - 6));
        const bottom = Math.min(contentHeight, Math.ceil(seat.bottom - rect.top + 6));
        let exclusion = container.querySelector(`.${clearanceClass}`);
        if (!width || bottom <= top) {
          exclusion?.remove();
          continue;
        }
        if (!exclusion) {
          exclusion = document.createElement('span');
          exclusion.className = `friend-seat-clearance ${clearanceClass}`;
          exclusion.setAttribute('aria-hidden', 'true');
          container.prepend(exclusion);
        }
        const key = `${width}:${top}:${bottom}`;
        if (exclusion.dataset.geometry !== key) {
          exclusion.dataset.geometry = key;
          exclusion.style.width = `${width}px`;
          exclusion.style.height = `${bottom}px`;
          exclusion.style.shapeOutside = `inset(${top}px 0 0 0)`;
        }
      }
      for (const title of titles) {
        const rect = title.getBoundingClientRect();
        const overlap = rect.bottom > seat.top && rect.top < seat.bottom ? Math.max(0, Math.ceil(side === 'left' ? seat.right + 6 - rect.left : rect.right - seat.left + 6)) : 0;
        const value = `${overlap}px`;
        if (title.style.getPropertyValue(titleProperty) !== value) {
          title.style.setProperty(titleProperty, value);
        }
      }
    };
    const schedule = () => {
      if (!disposed && frame === null) frame = window.requestAnimationFrame(update);
    };
    const observer = globalThis.ResizeObserver ? new ResizeObserver(schedule) : null;
    for (const element of [board, panel, ...containers]) observer?.observe(element);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    seatClearanceBinding = {
      panel,
      update: schedule,
      dispose() {
        disposed = true;
        observer?.disconnect();
        if (frame !== null) window.cancelAnimationFrame(frame);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, true);
        for (const container of containers) container.querySelector(`.${clearanceClass}`)?.remove();
        for (const title of titles) title.style.removeProperty(titleProperty);
      },
    };
    seatClearanceBindings.set(side, seatClearanceBinding);
  }
  seatClearanceBinding.update();
}

export function friendSpotlightGeometry(rect, width) {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height * 0.65;
  const origin = Math.max(24, Math.min(width - 24, x - width * 0.22));
  const spread = Math.min(125, Math.max(65, rect.width * 1.25));
  return { x, y, origin, spread, path: `M ${origin - 9} -30 L ${origin + 9} -30 L ${x + spread} ${y} Q ${x} ${y + 35} ${x - spread} ${y} Z` };
}

function syncFriendSpotlight(stock, playing) {
  if (!stock || !playing) {
    spotlightBinding?.dispose();
    spotlightBinding = null;
    return;
  }
  if (!stock.getBoundingClientRect) return;
  if (spotlightBinding?.stock !== stock) {
    spotlightBinding?.dispose();
    const overlay = document.createElement('div');
    overlay.id = 'dominationFriendSpotlight';
    overlay.dataset.source = stock.id;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="friendBeamFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff6df" stop-opacity="0"/>
          <stop offset=".5" stop-color="#fff6df" stop-opacity=".14"/>
          <stop offset="1" stop-color="#fff6df" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="friendBeamPool"><stop stop-color="#fff1c2" stop-opacity=".20"/><stop offset="1" stop-color="#fff1c2" stop-opacity="0"/></radialGradient>
      </defs>
      <path class="friend-spotlight-beam" fill="url(#friendBeamFade)"/>
      <ellipse fill="url(#friendBeamPool)"/>
    </svg>`;
    document.getElementById('gameSection').append(overlay);
    const beam = overlay.querySelector('path');
    const pool = overlay.querySelector('ellipse');
    let frame = null;
    let lastGeometry = '';
    const update = () => {
      frame = null;
      // Connectivity is only a safety check, never the signal for whose turn it is.
      if (!stock.isConnected) {
        syncFriendSpotlight(null, false);
        return;
      }
      const anchor = stock.querySelector('.friend-stock-stack, .pile-card');
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const key = [rect.left, rect.top, rect.width, rect.height, window.innerWidth].join(':');
      if (key === lastGeometry) return;
      lastGeometry = key;
      const screen = friendSpotlightGeometry(rect, window.innerWidth);
      const left = Math.max(0, Math.min(screen.origin - 30, screen.x - screen.spread * 1.4));
      const right = Math.min(window.innerWidth, Math.max(screen.origin + 30, screen.x + screen.spread * 1.4));
      // Bound the layer to the beam instead of rasterizing a blurred fullscreen SVG.
      overlay.style.left = `${left}px`;
      overlay.style.width = `${right - left}px`;
      overlay.style.height = `${Math.max(1, screen.y + 90)}px`;
      const geometry = { ...screen, x: screen.x - left, origin: screen.origin - left };
      geometry.path = `M ${geometry.origin - 9} -30 L ${geometry.origin + 9} -30 L ${geometry.x + geometry.spread} ${geometry.y} Q ${geometry.x} ${geometry.y + 35} ${geometry.x - geometry.spread} ${geometry.y} Z`;
      beam.setAttribute('d', geometry.path);
      beam.style.transformOrigin = `${geometry.origin}px 0px`;
      pool.setAttribute('cx', geometry.x);
      pool.setAttribute('cy', geometry.y);
      pool.setAttribute('rx', geometry.spread * 1.3);
      pool.setAttribute('ry', '65');
      overlay.classList.add('is-playing');
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const observer = globalThis.ResizeObserver ? new ResizeObserver(schedule) : null;
    observer?.observe(stock);
    const board = document.querySelector('#gameSection > .board');
    if (board) observer?.observe(board);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    spotlightBinding = {
      stock,
      update: schedule,
      dispose() {
        observer?.disconnect();
        if (frame !== null) window.cancelAnimationFrame(frame);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, true);
        overlay.remove();
      },
    };
  }
  spotlightBinding.update();
}

function renderFriendSeat(state, friend, panel, shared) {
  if (!panel) return;
  const playing = friend.id === getDominationFriend(state)?.id && !!friend.pendingTurnId;
  if (!panel.classList.contains('domination-friend-seat')) {
    panel.replaceChildren();
    delete panel.dataset.viewKey;
    delete panel.dataset.playerId;
    panel.classList.remove('reveal-mode', 'boss-player-targeted');
  }
  panel.classList.add('opponent-hand', 'domination-friend-seat');
  panel.classList.toggle('active-turn-glow', playing);
  if (playing) {
    for (const id of ['opponentTop', 'opponentLeft', 'opponentRight']) {
      if (id !== panel.id) document.getElementById(id)?.classList.remove('active-turn-glow');
    }
  }
  const endgame = isDominationFriendEndgame(state);
  const key = `${friend.id}:${friend.hand.map((card) => `${card.id}/${card.back}`).join(',')}:${shared.stock.length}:${friend.turnsRemaining}:${friend.extraTurns}:${friend.pendingTurnId}:${friend.farewell}:${endgame}`;
  const viewKey = `${key}:${shared.discard?.length || 0}:${playing}`;
  syncFriendSeatClearance(panel, friend.seat);
  if (panel.dataset.viewKey === viewKey) return;
  panel.dataset.viewKey = viewKey;
  panel.dataset.friendId = friend.id;
  // Keep the seat, fan and stock connected across actions: rebuilding them
  // restarts animated decks and can flash on mobile compositors.
  const heading = seatChild(panel, 'opponent-label', 'strong');
  heading.textContent = `👠 ${friend.name} (${friend.hand.length})`;
  const detail = seatChild(panel, 'friend-seat-status', 'span');
  detail.textContent = `${playing ? 'JOGANDO · ' : ''}${friend.turnsRemaining} ${friend.turnsRemaining === 1 ? 'turno restante' : 'turnos restantes'}`;
  if (friend.extraTurns) detail.textContent += ` · +${friend.extraTurns} ganhos`;
  const hand = seatChild(panel, 'opponent-cards');
  hand.setAttribute('aria-label', `Mão de ${friend.name}: ${friend.hand.length} cartas`);
  // Like normal side seats, cap the visible fan, not the real hand or counter.
  renderOpponentBacks(hand, friend.hand);
  if (friend.farewell || endgame) {
    const farewell = seatChild(panel, 'friend-farewell', 'b');
    farewell.textContent = endgame ? 'RETA FINAL DO MONTE' : '💋 DESPEDIDA';
  } else panel.querySelector('.friend-farewell')?.remove();
}

export function renderDominationFriend(state, playerId) {
  const enabled = state?.mode === '1x1_dominacao' && !state.finished && state.dominationOptions?.friend !== false;
  const friends = enabled ? activeDominationFriends(state) : [];
  const board = document.querySelector('#gameSection > .board');
  const button = document.getElementById('callFriendBtn');
  if (button) {
    const remaining = remainingFriendCalls(state);
    button.hidden = !(enabled && playerId === 1);
    button.disabled = !canCallDominationFriend(state, playerId);
    button.textContent = !remaining ? (dominationFriends(state).length > 1 ? '✓ CHAMADAS' : '✓ CHAMADA') : remaining === 2 ? '📞 CHAMAR AMIGAS' : '📞 CHAMAR AMIGA';
  }
  const shared = state?.dominationFriendShared;
  const playing = friends.some((friend) => !!friend.pendingTurnId);
  board?.classList.toggle('friend-present', friends.length > 0);
  board?.classList.toggle('friend-playing', playing);
  for (const side of ['left', 'right']) {
    const panel = document.getElementById(OPPONENT_SEAT_IDS[side]);
    const friend = friends.find((entry) => entry.seat === side);
    if (friend) renderFriendSeat(state, friend, panel, shared);
    else {
      syncFriendSeatClearance(null, side);
      if (panel?.classList.contains('domination-friend-seat')) {
        panel.replaceChildren();
        panel.classList.remove('domination-friend-seat', 'active-turn-glow');
        delete panel.dataset.viewKey;
        delete panel.dataset.friendId;
      }
    }
  }
  let stock = document.getElementById('dominationFriendStock');
  if (!friends.length) {
    stock?.remove();
    document.getElementById('dominationFriendDiscard')?.remove();
    syncFriendSpotlight(null, false);
    return;
  }
  const middle = document.querySelector('#gameSection .board-middle');
  const trash = seatChild(middle, 'friend-discard');
  trash.id = 'dominationFriendDiscard';
  const face = seatChild(trash, 'friend-discard-face');
  const topDiscard = shared.discard?.at(-1);
  const faceKey = `${topDiscard?.id}:${topDiscard?.rank}:${topDiscard?.suit}:${topDiscard?.joker}:${topDiscard?.back}`;
  if (face.dataset.viewKey !== faceKey) {
    face.dataset.viewKey = faceKey;
    face.innerHTML = cardFrontHTML(topDiscard);
    face.className = topDiscard ? `friend-discard-face discard-face has-card ${suitClass(topDiscard)} ${deckFaceClass(topDiscard)}` : 'friend-discard-face';
    face.style.color = topDiscard && !topDiscard.joker && ['♥', '♦'].includes(topDiscard.suit) ? '#b91c1c' : '#000';
  }
  const trashLabel = seatChild(trash, 'friend-discard-label', 'small');
  trashLabel.classList.add('pile-info');
  trashLabel.textContent = `LIXO AMIGAS (${shared.discard?.length || 0})`;
  if (!stock) {
    stock = document.createElement('div');
    stock.id = 'dominationFriendStock';
    stock.className = 'friend-stock';
    stock.setAttribute('aria-live', 'polite');
    // The guest's two piles form a real row above the normal piles. It exists
    // only during her stay, so dense melds cannot paint underneath that row.
    middle.append(stock);
  }
  stock.classList.toggle('is-playing', playing);
  const stack = seatChild(stock, 'friend-stock-stack');
  stack.setAttribute('aria-hidden', 'true');
  // Same density and offsets as the main stock. Keep the top card first in
  // the DOM so existing deal/draw animations measure the visible top layer.
  const layers = Math.min(16, Math.ceil(shared.stock.length / 3));
  const topCard = shared.stock[shared.stock.length - 1];
  const stockKey = `${shared.stock.length}:${topCard?.id}:${topCard?.back}`;
  if (stack.dataset.viewKey !== stockKey) {
    stack.dataset.viewKey = stockKey;
    while (stack.children.length > layers) stack.lastChild.remove();
    for (let i = layers - 1; i >= 0; i--) {
      const top = i === layers - 1;
      const back = (layers - 1 - i) % 2 === 0 ? topCard.back : topCard.back === 'blue' ? 'red' : 'blue';
      let layer = stack.children[layers - 1 - i];
      if (!layer) {
        layer = cardBack({ ...topCard, back });
        stack.append(layer);
      }
      layer.classList.toggle('back-blue', back === 'blue');
      layer.classList.toggle('back-red', back !== 'blue');
      layer.dataset.cardId = topCard.id;
      layer.classList.add('visual-layer');
      layer.classList.toggle('sub-layer', !top);
      layer.style.bottom = `${i * 1.2}px`;
      layer.style.right = `${i * 0.3}px`;
      layer.style.zIndex = i;
      layer.style.filter = top ? '' : `brightness(${0.4 + (i / layers) * 0.5})`;
    }
  }
  const stockLabel = seatChild(stock, 'pile-info', 'small');
  stockLabel.textContent = `MONTE AMIGAS (${shared.stock.length})`;
  syncFriendSpotlight(playing ? stock : document.getElementById('drawStockBtn'), true);
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
    const radians = (segment.center * Math.PI) / 180;
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
  const panel = document.getElementById(OPPONENT_SEAT_IDS[friend.seat || 'left']);
  if (!panel || !isActive()) return;
  panel.classList.add('friend-entering');
  const backs = [...panel.querySelectorAll('.opponent-cards .opponent-card-back')];
  const source = document.querySelector('#dominationFriendStock .opponent-card-back');
  if (!source) {
    panel.classList.remove('friend-entering');
    return;
  }
  const origin = rect(source);
  backs.forEach((back) => {
    back.style.visibility = 'hidden';
  });
  try {
    await Promise.all(
      backs.map(async (back, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * 35));
        if (!isActive()) return;
        const target = rect(back);
        try {
          await fly(friend.hand[index], origin, target, 'back');
          if (isActive()) impact(target);
        } finally {
          back.style.visibility = '';
        }
      }),
    );
  } finally {
    backs.forEach((back) => {
      back.style.visibility = '';
    });
    panel.classList.remove('friend-entering');
  }
}

// Replay committed actions on a visual copy only. Each flight uses the normal
// player animator; each frame uses the normal renderer (scores, canastras, SFX).
export async function playDominationFriendTimeline(view, result, { animate, render, isActive, pace }) {
  const friend = getDominationFriend(view, result.friendId);
  const shared = view.dominationFriendShared;
  if (!friend) return;
  const steps = result.steps || [];
  for (let index = 0; index < steps.length; index++) {
    const step = { ...steps[index], friendId: steps[index].friendId || result.friendId || friend.id };
    if (!isActive()) return;
    if (pace && step.type !== 'dominatorBonus' && !(step.type === 'drawStock' && step.reason === 'canastra')) {
      const stage = index === 0 ? 'think' : step.type === 'discard' ? 'discard' : steps[index - 1].type.startsWith('draw') ? 'organize' : 'play';
      await pace(stage);
      if (!isActive()) return;
    }
    const isBonusDraw = (entry) => entry?.type === 'dominatorBonus' || (entry?.type === 'drawStock' && entry.reason === 'canastra');
    if (isBonusDraw(step) && isBonusDraw(steps[index + 1])) {
      const ownerSteps = [];
      while (isBonusDraw(steps[index + 1])) ownerSteps.push(steps[++index]);
      // All recipients buy together, independently of the sound queue.
      await Promise.all([step, ...ownerSteps].map((entry) => playDominationFriendTimeline(view, { friendId: entry.friendId || friend.id, steps: [entry] }, { animate, render, isActive })));
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
      // Carry the entire private pile in one flight, like a normal pickup.
      // Commit the visual hand and counters only after the batch lands.
      if (!step.cards.length) continue;
      await animate({ ...step, card: step.cards.at(-1) });
      if (!isActive()) return;
      const pickedIds = new Set(step.cards.map((card) => card.id));
      shared.discard = (shared.discard || []).filter((card) => !pickedIds.has(card.id));
      getDominationFriend(view, step.friendId).hand.push(...step.cards.map((card) => ({ ...card })));
      render();
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
        shared.stock = shared.stock.filter((entry) => entry.id !== card.id);
        getDominationFriend(view, step.friendId).hand.push({ ...card });
        render();
      }
      continue;
    }
    await animate(step);
    if (!isActive()) return;
    const ids = new Set(step.cards.map((card) => card.id));
    friend.hand = friend.hand.filter((card) => !ids.has(card.id));
    if (step.type === 'discard') {
      (shared.discard ||= []).push({ ...step.card });
      render();
      continue;
    }
    view.teams.find((team) => team.id === step.teamId).melds[step.meldIndex] = step.meld.map((card) => ({ ...card }));
    if (step.friendEvent) {
      for (const event of step.friendEvent.recipients || [step.friendEvent]) {
        const recipient = getDominationFriend(view, event.friendId || friend.id);
        if (!recipient) continue;
        recipient.turnsRemaining = event.turnsRemaining;
        recipient.extraTurns = event.extraTurns;
        recipient.farewell = isDominationFriendEndgame(view);
        (recipient.events ||= []).push({ ...event });
      }
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
    const recipients = event.recipients || [event];
    title.textContent = `+1 TURNO PARA ${recipients.map((entry) => entry.name.toUpperCase()).join(' E ')}!`;
    const remaining = recipients.length === 1 ? `${event.turnsRemaining} turnos disponíveis` : recipients.map((entry) => `${entry.name}: ${entry.turnsRemaining} turnos`).join(' · ');
    detail.textContent = `${event.actorName} fez ${kind} · ${remaining}`;
  } else {
    title.textContent = event.type === 'arrival' ? `👠 ${event.name} entrou na mesa!` : `💋 ${event.name} se despediu!`;
    detail.textContent = event.type === 'arrival' ? `${event.turnsRemaining} turnos para ajudar o Dominador` : 'Os jogos construídos continuam na mesa.';
  }
  notice.append(title, detail);
  document.body.append(notice);
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  try {
    await notice.animate(
      [
        { opacity: 0, transform: reduced ? 'translate(-50%, 0)' : 'translate(-50%, 20px) scale(.92)' },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.12 },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.86 },
        { opacity: 0, transform: reduced ? 'translate(-50%, 0)' : 'translate(-50%, -10px) scale(1)' },
      ],
      { duration: 3200, easing: 'ease-out', fill: 'both' },
    ).finished;
  } finally {
    notice.remove();
  }
}

export async function presentDominationFriend(invited, isActive, animations) {
  const friends = Array.isArray(invited) ? invited : [invited];
  const friend = friends[0];
  if (!friend) return;
  const plural = friends.length > 1;
  const names = [...friends]
    .sort((a, b) => FRIEND_NAMES.indexOf(a.name) - FRIEND_NAMES.indexOf(b.name))
    .map((entry) => entry.name)
    .join(' e ');
  const choices = plural ? FRIEND_NAMES.flatMap((name, index) => FRIEND_NAMES.slice(index + 1).map((other) => `${name} e ${other}`)) : FRIEND_NAMES;
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
        duration: FRIEND_PRESENTATION_TIMING.spinMs,
        easing: 'cubic-bezier(.12,.72,.12,1)',
      }).finished;
    } else {
      await pause(150);
    }
  };
  let stopRouletteSound;
  try {
    stopRouletteSound = animations.startRouletteSound?.();
    title.textContent = plural ? '📞 Chamando as amigas...' : '📞 Chamando uma amiga...';
    detail.textContent = 'Quem vai entrar na mesa?';
    await spin(friendWheelSegments(choices), names);
    if (!isActive()) return;
    detail.textContent = `👠 ${names} ${plural ? 'atenderam' : 'atendeu'}!`;
    await pause(FRIEND_PRESENTATION_TIMING.resultMs);
    title.textContent = plural ? 'Quantos turnos para as duas?' : 'Quanto tempo ela vai ficar?';
    detail.textContent = '3 turnos · 20% | 4 turnos · 35% | 5 turnos · 45%';
    await spin(friendWheelSegments(['3 TURNOS', '4 TURNOS', '5 TURNOS'], [20, 35, 45]), `${friend.initialTurns} TURNOS`);
    if (!isActive()) return;
    detail.textContent = `👠 ${names}: ${friend.initialTurns} turnos${plural ? ' para cada uma' : ''}!`;
    await pause(FRIEND_PRESENTATION_TIMING.resultMs);
    stopRouletteSound?.();
    overlay.remove();
    await Promise.all(friends.map((entry) => dealDominationFriendCards(entry, isActive, animations)));
  } finally {
    stopRouletteSound?.();
    overlay.remove();
  }
}
