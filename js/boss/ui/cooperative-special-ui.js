import { bossSpecialView, SPECIAL_HELP } from '../boss-special.js';

export function renderCooperativeSpecial({ document, state, canActivate, onActivate, getUseStatus = () => ({allowed:true}) }) {
  const slot = document.getElementById('bossSpecialSlot');
  if (!slot) return;
  let button = slot.querySelector('.boss-special-button');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button'; button.className = 'boss-special-button';
    button.innerHTML = '<span aria-hidden="true">⚡</span><span class="boss-special-track"><span></span></span><strong></strong>';
    slot.append(button);
  }
  const view = bossSpecialView(state.boss);
  button.querySelector('.boss-special-track > span').style.width = `${view.progress}%`;
  button.querySelector('strong').textContent = view.charges ? `${view.charges}×` : `${view.points}/100`;
  button.classList.toggle('is-ready', view.charges > 0);
  button.setAttribute('aria-label', `Especial da equipe: ${view.points} pontos, ${view.charges} cargas. Abrir ajuda e escolher quem recebe cartas.`);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  document.getElementById('bossSpecialPopover')?.remove();
  button.onclick = event => {
    event.stopPropagation();
    if (document.getElementById('bossSpecialPopover')) { close(); return; }
    const popover = document.createElement('div');
    popover.id = 'bossSpecialPopover'; popover.className = 'boss-special-popover';
    popover.setAttribute('role', 'dialog'); popover.setAttribute('aria-label', 'Especial cooperativo');
    const title = document.createElement('strong'); title.textContent = 'Especial da equipe';
    const help = document.createElement('p'); help.textContent = SPECIAL_HELP;
    const info = document.createElement('p'); info.textContent = view.charges
      ? `${view.charges} carga(s) disponível(is). Quem recebe as cartas?` : 'Complete 100 pontos para usar.';
    const choices = document.createElement('div'); choices.className = 'boss-special-choices';
    for (const player of state.players.filter(p => p.teamId === 0)) {
      const choice = document.createElement('button'); choice.type = 'button';
      const status=getUseStatus(player.id);
      choice.textContent = player.name; choice.title = player.name;
      choice.setAttribute('aria-label', `Dar 5 cartas do Lixo para ${player.name}`);
      choice.disabled = !view.charges || (state.discard?.length || 0) < 5 || !canActivate() || !status.allowed;
      if(!status.allowed)choice.title=`${player.name}: ${status.message}`;
      choice.onclick = () => { close(); void onActivate(player.id); };
      choices.append(choice);
    }
    if ((state.discard?.length || 0) < 5) info.textContent = `O Lixo precisa ter 5 cartas. Agora tem ${state.discard?.length || 0}. Nenhum ponto será gasto.`;
    else if (view.charges && !canActivate()) info.textContent = 'Aguarde a ação atual terminar para usar.';
    else if(view.charges && [...choices.children].every(choice=>choice.disabled))info.textContent=getUseStatus(state.players.find(p=>p.teamId===0)?.id).message;
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = 'Fechar';
    dismiss.onclick = close;
    popover.append(title, help, info, choices, dismiss); document.body.append(popover);
    button.setAttribute('aria-expanded', 'true');
    const rect = button.getBoundingClientRect();
    const box = popover.getBoundingClientRect();
    popover.style.left = `${Math.max(8, Math.min(rect.right - box.width, innerWidth - box.width - 8))}px`;
    popover.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - box.height - 8))}px`;
    popover.onkeydown = event => { if (event.key === 'Escape') close(); };
    (choices.querySelector('button:not(:disabled)') || dismiss).focus();
  };
  function close() {
    document.getElementById('bossSpecialPopover')?.remove();
    button.setAttribute('aria-expanded', 'false'); button.focus();
  }
}

// Provisional animatic: five physical-card silhouettes travel together, tinted
// by universe. No new art, timers, canvas loops or permanent DOM nodes.
export async function presentCooperativeSpecial({ document, from, to, count, bossId, reducedMotion }) {
  if (!from || !to || reducedMotion || !count) return;
  const colors = { nemesis: '#99e37c', dimitrescu: '#dc697b', nehelenia: '#c5a3f5',
    matriarca_esmeralda: '#60e9b5', dominadora: '#e8b6ec', banker: '#e8c775' };
  const flights = [];
  for (let i = 0; i < Math.min(5, count); i++) {
    const card = document.createElement('span'); card.className = 'boss-special-flight';
    card.setAttribute('aria-hidden', 'true');
    Object.assign(card.style, { left: `${from.left + from.width / 2}px`, top: `${from.top + from.height / 2}px`,
      '--special-color': colors[bossId] || '#e8c775' });
    document.body.append(card);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2) + (i - 2) * 8;
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const animation = card.animate([{ transform: 'translate(-50%, -50%) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: .12 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${(i - 2) * 7}deg)`, opacity: 0 }],
    { duration: 420, delay: i * 45, easing: 'cubic-bezier(.2,.7,.3,1)' });
    flights.push(animation.finished.catch(() => {}).finally(() => card.remove()));
  }
  await Promise.all(flights);
}
