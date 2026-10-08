import { CASTLE_BALANCE, ITEM_DEFINITIONS, bloodLinkCapacity, bloodLinkRemaining, furyLevel } from '../dimitrescu-castle.js';

export function castleItemHelp(type) {
  const effect = type === 'relic'
    ? 'Cancela uma passiva da filha: a desta rodada, se ainda pendente, ou a próxima vez que ela agir.'
    : ITEM_DEFINITIONS[type].special;
  return `${effect}\nTambém petrifica ${CASTLE_BALANCE.itemMaxHpLoss} HP: essa parte não regenera (mínimo de ${CASTLE_BALANCE.daughterHpFloor} HP recuperáveis).`;
}

export function daughterPassiveHelp(d, state) {
  const p = d.passive;
  if (d.status === 'dead') return 'Derrotada. Não regenera nem volta à batalha.';
  const rule = d.id === 'bela'
    ? 'CAÇADA: marca uma carta que o alvo pode jogar legalmente. Use-a em um jogo até o fim do turno desse jogador. Falha: +3 Sede. Sem carta válida, não pune.'
    : d.id === 'cassandra'
      ? 'BANQUETE: escolhe um jogo que pode receber cartas legalmente. Adicione uma contribuição legal a ele até o fim da rodada. Falha: +3 Sede. Sem jogo válido, não pune.'
      : 'LIXO +3: a primeira retirada efetiva do Lixo nesta rodada causa +3 Sede, uma única vez para a equipe. Comprar do Monte não ativa.';
  let context = 'Não foi escolhida nesta rodada.';
  if (p?.status === 'suppressed') context = 'Relíquia: passiva suspensa nesta rodada.';
  else if (p?.status === 'success') context = 'Objetivo cumprido nesta rodada: sem punição.';
  else if (p?.status === 'failed' || p?.status === 'triggered') context = '+3 Sede já aplicada nesta rodada.';
  else if (p?.status === 'idle') context = 'Sem candidato válido nesta rodada: não pune.';
  else if (p?.status === 'active') {
    if (d.id === 'bela') {
      const player = state.players.find(player => player.id === p.targetPlayerId);
      const card = player?.hand.find(card => card.id === p.cardId);
      context = `${player?.name || 'Alvo'}: jogue ${card ? card.rank + card.suit : 'a carta marcada'} até o fim do seu turno.`;
    } else if (d.id === 'cassandra') context = `Alimente o Jogo ${p.meldIndex + 1} até o fim da rodada.`;
    else context = 'Reação preparada para a primeira retirada efetiva do Lixo.';
  }
  return `${context}\n\n${rule}`;
}

export function daughterPassiveChips(d, state) {
  const p = d.passive;
  if (d.status === 'dead') return [];
  if (d.id === 'bela') {
    const player = state.players.find(player => player.id === p?.targetPlayerId);
    const card = p?.status === 'active' && player?.hand.find(card => card.id === p.cardId);
    return [card ? `CAÇADA · ${card.rank}${card.suit}` : 'CAÇADA'];
  }
  if (d.id === 'cassandra') return [p?.status === 'active' ? `BANQUETE · JOGO ${p.meldIndex + 1}` : 'BANQUETE'];
  return ['LIXO +3'];
}

export function castleItemInventory(boss, type) {
  const items = Object.values(boss.castleItems || {}).filter(item => item.type === type);
  return { total: items.length, available: items.filter(item => !item.consumed).length,
    used: items.filter(item => item.consumed).length,
    attached: boss.combatEntities.flatMap(d => d.sacrificedCards).filter(card => card.castleItem.type === type).length };
}

export function renderCastleHud({ document, hud, state, createHelp, cardFrontHTML, disabled, selectTarget, viewerId = state.players[state.currentPlayer]?.id }) {
  const boss = state.boss;
  let panel = document.getElementById('dimitrescuCastlePanel');
  let ribbon = document.getElementById('castleItemRibbon');
  let marker = document.getElementById('castleBloodLink');
  let fury = document.getElementById('castleFury');
  if (boss?.id !== 'dimitrescu') {
    panel?.remove(); ribbon?.remove(); marker?.remove(); fury?.remove(); hud?.removeAttribute('data-fury');
    document.getElementById('bossHpText')?.removeAttribute('aria-label');
    return;
  }
  if (!ribbon) {
    ribbon = document.createElement('div'); ribbon.id = 'castleItemRibbon';
    const title = document.createElement('b'); title.textContent = 'ITENS DO CASTELO'; ribbon.append(title);
    for (const [type, definition] of Object.entries(ITEM_DEFINITIONS)) {
      const button = createHelp(`Explicar ${definition.label}`, definition.label, () => {
        const count = castleItemInventory(ribbon._boss, type);
        return `${castleItemHelp(type)}\n\n${count.available}/${count.total} disponíveis · ${count.used} usados · ${count.attached} nas filhas.`;
      }, '');
      const art = document.createElement('img'); art.src = definition.image; art.alt = definition.label; button.append(art); button.dataset.itemType = type;
      const count = document.createElement('span'); count.className = 'castle-item-count'; button.append(count);
      ribbon.append(button);
    }
    ribbon.append(createHelp('Explicar itens do castelo', 'Itens do Castelo', '15 cartas têm itens: 3 de cada tipo. Toque no item da sua mão e escolha uma filha.\nCada item tem um efeito próprio e petrifica 100 HP (mínimo recuperável: 200).\nO contador mostra quantos ainda podem ser usados. Usar um item não encerra seu turno: guarde uma carta para descartar.', 'i'));
    document.getElementById('bossDangerMeter').insertAdjacentElement('afterend', ribbon);
  }
  ribbon._boss = boss;
  for (const button of ribbon.querySelectorAll('[data-item-type]')) {
    const count = castleItemInventory(boss, button.dataset.itemType);
    button.querySelector('.castle-item-count').textContent = `${count.available}/${count.total}`;
    button.title = `${ITEM_DEFINITIONS[button.dataset.itemType].label}: ${count.available} disponíveis, ${count.used} usados, ${count.attached} anexados`;
  }
  if (!marker) {
    marker = document.createElement('div'); marker.id = 'castleBloodLink';
    const fill = document.createElement('span'); fill.className = 'castle-link-fill'; fill.setAttribute('aria-hidden', 'true'); marker.append(fill);
    const label = document.createElement('span'); label.className = 'castle-link-label'; marker.append(label);
    marker.append(createHelp('Explicar Vínculo de Sangue', 'Vínculo de Sangue', () => marker._linkHelp, 'i'));
    document.getElementById('bossHpBar').parentElement.append(marker);
  }
  const protection = bloodLinkRemaining(boss), capacity = bloodLinkCapacity(boss), displayMax = boss.maxHp + capacity;
  const hpBar = document.getElementById('bossHpBar');
  hpBar.style.width = `${boss.hp / displayMax * 100}%`;
  document.getElementById('bossHpText').textContent = `${boss.hp + protection} / ${displayMax}`;
  document.getElementById('bossHpText').setAttribute('aria-label', `${boss.hp} de ${boss.maxHp} HP da Lady, mais ${protection} de proteção`);
  marker.style.width = `${capacity / displayMax * 100}%`; marker.hidden = !capacity;
  marker.querySelector('.castle-link-fill').style.width = `${capacity ? protection / capacity * 100 : 0}%`;
  marker.querySelector('.castle-link-label').textContent = `${protection} PROT.`;
  marker._linkHelp = `Proteção: ${protection}/${capacity}. Seus ataques gastam a proteção antes da vida; o excedente atinge a Lady.\nCada filha viva sustenta até 500 PROT. Ao morrer, retira até 500 restantes. Proteção consumida não volta. O Coágulo absorve primeiro.`;
  marker.setAttribute('aria-label', `${protection} de proteção`);
  const level = furyLevel(boss); hud.dataset.fury = level;
  if (!fury) {
    fury = createHelp('Explicar Fúria da Lady', 'Fúria da Lady', () => fury._furyHelp, '');
    fury.id = 'castleFury'; hud.querySelector('.boss-portrait').append(fury);
  }
  fury.textContent = ['NORMAL', 'FÚRIA I', 'FÚRIA II', 'FÚRIA FINAL'][level];
  fury._furyHelp = `Agora: cura da Lady +${level * 10}% e +${level * CASTLE_BALANCE.furyBloodStep} Sede nas punições dela.\nCada filha derrotada acrescenta +10% à cura e +${CASTLE_BALANCE.furyBloodStep} Sede. As filhas e Sangue Impuro não recebem esse bônus. Cumprir objetivos continua evitando a punição.`;
  if (!panel) { panel = document.createElement('section'); panel.id = 'dimitrescuCastlePanel'; hud.insertAdjacentElement('afterend', panel); }
  const target = boss.combatTargetsByPlayer[viewerId] || 'boss';
  const mainPortrait = hud.querySelector('.boss-portrait');
  mainPortrait.removeAttribute('aria-hidden');
  mainPortrait.classList.toggle('is-selected', target === 'boss');
  let mainTarget = mainPortrait.querySelector('.boss-combat-main-target');
  if (!mainTarget) {
    mainTarget = document.createElement('button'); mainTarget.type = 'button'; mainTarget.className = 'boss-combat-main-target';
    mainPortrait.append(mainTarget);
  }
  mainTarget.setAttribute('aria-label', 'Selecionar Lady Dimitrescu como alvo');
  mainTarget.disabled = disabled; mainTarget.setAttribute('aria-pressed', String(target === 'boss'));
  mainTarget.onclick = () => selectTarget('boss');
  const signature = JSON.stringify([boss.combatEntities, boss.roundNumber, boss.castlePassiveRound, boss.castleSelectedDaughterIds, disabled, target, state.players.map(p => p.name)]);
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature; panel.replaceChildren();
  for (const d of boss.combatEntities) {
    const card = document.createElement('article'); card.dataset.entityId = d.id;
    card.className = `boss-daughter-card boss-combat-entity castle-daughter ${d.hp ? '' : 'is-dead'}`;
    card.classList.toggle('is-selected', d.id === target);
    const portrait = document.createElement('img'); portrait.src = d.portrait; portrait.alt = d.name; portrait.className = 'boss-combat-portrait'; card.append(portrait);
    const name = document.createElement('b'); name.textContent = d.name.toUpperCase(); card.append(name);
    const chips = document.createElement('div'); chips.className = 'boss-combat-chips';
    const debuffs = [
      d.cold && ['FRIO', 'Não regenera no próximo fim de rodada. Depois, o efeito acaba.'],
      d.regeneration === CASTLE_BALANCE.anticoagulantRegeneration && ['ANTICOAGULANTE', `Regenera ${CASTLE_BALANCE.anticoagulantRegeneration} HP por rodada, em vez de ${CASTLE_BALANCE.regeneration}. Dura até ser derrotada; não acumula.`],
      d.relicRound != null && ['RELÍQUIA', d.passive?.status === 'suppressed' ? 'Passiva suspensa nesta rodada. Não bloqueia a regeneração.' : 'Suspende a passiva na próxima oportunidade. Não bloqueia a regeneração.'],
    ];
    for (const [label, explanation] of debuffs.filter(Boolean)) {
      const chip = createHelp(`Explicar debuff ${label} de ${d.name}`, label, explanation, `↓ ${label}`);
      chip.classList.add('boss-daughter-state', 'castle-debuff'); chips.append(chip);
    }
    card.append(chips);
    const content = document.createElement('div'); content.className = 'boss-combat-content';
    const hp = document.createElement('span'); hp.textContent = `${d.hp} / ${CASTLE_BALANCE.daughterHp} HP`;
    const health = document.createElement('div'); health.className = 'castle-daughter-health';
    const originalHp = CASTLE_BALANCE.daughterHp;
    const meter = document.createElement('meter'); meter.min = 0; meter.max = originalHp; meter.value = d.hp;
    meter.low = d.maxHp * .25; meter.high = d.maxHp * .5; meter.optimum = d.maxHp;
    meter.dataset.health = d.hp > meter.high ? 'normal' : d.hp > meter.low ? 'tension' : 'danger'; meter.setAttribute('aria-label', `HP de ${d.name}`);
    health.append(meter);
    const stone = document.createElement('span'); stone.className = 'castle-hp-petrified';
    stone.hidden = d.maxHp === originalHp; stone.style.width = `${(originalHp - d.maxHp) / originalHp * 100}%`;
    stone.setAttribute('aria-label', `${originalHp - d.maxHp} HP petrificados por itens; máximo recuperável ${d.maxHp}`); health.append(stone);
    if (d.maxHp < originalHp) {
      const reduction = document.createElement('span'); reduction.className = 'castle-max-loss';
      reduction.textContent = `↓ MÁX −${originalHp - d.maxHp}`; chips.append(reduction);
    }
    content.append(hp, health);
    const passive = document.createElement('div'); passive.className = 'castle-passive-chips';
    for (const label of daughterPassiveChips(d, state)) {
      const selectedPassive = boss.castlePassiveRound === boss.roundNumber &&
        !!boss.castleSelectedDaughterIds?.includes(d.id) && d.passive?.status !== 'suppressed';
      const chip = createHelp(`Explicar passiva de ${d.name}: ${label}`, `Passiva de ${d.name}`, daughterPassiveHelp(d, state), label);
      chip.classList.add('boss-daughter-state', 'castle-passive-chip');
      // The tint identifies whose round it is, not whether a candidate/punishment is pending.
      chip.classList.toggle('is-highlighted', selectedPassive);
      passive.append(chip);
      const indicator = createHelp(`Explicar passiva da rodada de ${d.name}`, `Passiva de ${d.name}`,
        daughterPassiveHelp(d, state), 'PASSIVA');
      indicator.classList.add('boss-daughter-state', 'castle-passive-indicator');
      indicator.classList.toggle('is-highlighted', selectedPassive);
      passive.append(indicator);
    }
    chips.append(passive);
    const stack = document.createElement('div'); stack.className = 'castle-sacrifice-stack';
    for (const saved of d.sacrificedCards) {
      const itemName = ITEM_DEFINITIONS[saved.castleItem.type].label;
      const mini = createHelp(`Explicar ${itemName} sacrificado`, itemName, `${castleItemHelp(saved.castleItem.type)}\n\n${saved.rank}${saved.suit} fica com ${d.name} e volta ao fundo do Lixo quando ela morrer, sem item.`, '');
      mini.className = 'carta castle-sacrifice-card';
      mini.innerHTML = cardFrontHTML({ ...saved, castleItem: { ...saved.castleItem, consumed: false } });
      mini.title = `${saved.rank}${saved.suit} · ${itemName}`;
      mini.style.setProperty('--stack-index', stack.childElementCount); stack.append(mini);
    }
    if (stack.childElementCount) {
      stack.setAttribute('aria-label', `${stack.childElementCount} cartas sacrificadas`); card.append(stack);
      const invested = document.createElement('span'); invested.className = 'castle-sacrifice-label';
      invested.textContent = d.sacrificedCards.map(saved => ITEM_DEFINITIONS[saved.castleItem.type].label).join(' · '); stack.append(invested);
    }
    card.append(content);
    const select = document.createElement('button'); select.type = 'button'; select.className = 'boss-combat-card-target';
    select.disabled = disabled || !d.hp; select.setAttribute('aria-label', `Atacar ${d.name}`); select.setAttribute('aria-pressed', String(d.id === target));
    select.onclick = () => selectTarget(d.id); card.append(select);
    card.append(createHelp(`Explicar ${d.name}`, d.name, `${daughterPassiveHelp(d, state)}\n\nRegenera ${d.regeneration} no fim da rodada${d.cold ? ' (bloqueado pelo Frio desta vez)' : ''}. ${d.maxHp < originalHp ? `Itens petrificaram ${originalHp - d.maxHp} HP; pode recuperar até ${d.maxHp}. ` : ''}Depois de derrotada, não volta.`));
    panel.append(card);
  }
}
