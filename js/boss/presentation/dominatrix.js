const SPEECHES = Object.freeze({
  collar: 'Suas escolhas ficaram menores. As minhas, não.',
  forced_choice: 'Escolha. Quero ver qual arrependimento você prefere.',
  exposure: 'Eu já vi exatamente onde você vai hesitar.',
  forced_swap: 'Planos tão frágeis merecem donos melhores.',
  hands_tied: 'Cooperação demais cria conforto. Vamos corrigir isso.',
  possession: 'Esse jogo já não responde a vocês.',
  favorite: 'Uma será poupada. A outra, disciplinada.',
  double_collar: 'Duas coleiras. Agora prestem atenção.',
  separation: 'Vocês se escondem demais um atrás do outro. Acabou.',
  absolute_control: 'Neste turno, sua vontade é apenas um detalhe.',
  break_will: 'Vamos descobrir quanto de você sobra depois de uma ordem simples.',
  final_order: 'Última ordem. Não me façam repeti-la.',
  iron_etiquette: 'Até aquilo que vocês descartam deve saber se comportar.',
  interdict: 'Esse jogo só cresce quando eu permitir.',
});

function dialogueTarget(context = {}) {
  const gameState = context.gameState;
  const targetPlayerId = context.intent?.payload?.targetPlayerId;
  if (targetPlayerId == null) return '';
  return context.helpers?.playerName?.(gameState, targetPlayerId)
    || gameState?.players?.find((player) => player.id === targetPlayerId)?.name
    || '';
}


const RESULT_CATEGORIES = Object.freeze({
  collar: 'Restricao encerrada',
  forced_choice: 'Escolha exigida',
  exposure: 'Restricao encerrada',
  forced_swap: 'Punicao aplicada',
  hands_tied: 'Restricao encerrada',
  possession: 'Objetivo resolvido',
  favorite: 'Punicao aplicada',
  double_collar: 'Restricao encerrada',
  separation: 'Restricao encerrada',
  absolute_control: 'Restricao encerrada',
  break_will: 'Escolha exigida',
  final_order: 'Escolha exigida',
  iron_etiquette: 'Ordem resolvida',
  interdict: 'Restricao encerrada',
});

const ACTION_CATEGORIES = Object.freeze({
  collar: 'Restricao ativa agora',
  forced_choice: 'Escolha imediata',
  exposure: 'Restricao ativa agora',
  hands_tied: 'Restricao ativa agora',
  possession: 'Objetivo da rodada',
  double_collar: 'Restricao ativa agora',
  separation: 'Restricao ativa agora',
  absolute_control: 'Restricao ativa agora',
  break_will: 'Escolha preparada',
  final_order: 'Escolha preparada',
  iron_etiquette: 'Objetivo da rodada',
  interdict: 'Restricao ativa agora',
});

function dominatrixPressureText(phase = 1) {
  const p = Number(phase) || 1;
  return {
    forcedChoice: p === 3 ? { direct: 8, obey: 3, fail: 16 } : p === 2 ? { direct: 7, obey: 3, fail: 14 } : { direct: 6, obey: 2, fail: 12 },
    exposure: { success: 1, fail: p === 3 ? 13 : p === 2 ? 11 : 9 },
    etiquette: { obey: p === 3 ? 3 : 2, fail: p === 3 ? 14 : p === 2 ? 12 : 10 },
    finalOrder: { direct: 7, accept: 2, miss: 6 },
    absoluteControl: 5,
  };
}

export const dominatrixBossPresentation = Object.freeze({
  id: 'dominadora',
  feminine: true,
  ruleSummary() {
    return 'Cada jogador tem uma barra de Dominação de 0 a 50, dividida em 4 partes. Em 37,5 fica Sob Controle; em 50 fica Dominado. Se os dois chegarem a 50, a equipe perde.';
  },
  speech(abilityId, context = {}) {
    const target = dialogueTarget(context);
    const collarCards = context.collarCards || [];
    if (abilityId === 'collar') {
      if (target && collarCards.length === 1) return `${target}, uma escolha a menos para você.`;
      if (target) return `${target}, suas escolhas ficaram menores. As minhas, não.`;
    }
    if (abilityId === 'exposure' && target) return `${target}, eu já vi exatamente onde você vai hesitar.`;
    if (abilityId === 'absolute_control' && target) return `${target}, neste turno sua vontade é apenas um detalhe.`;
    if (abilityId === 'break_will' && target) return `${target}, vamos descobrir quanto de você sobra depois de uma ordem simples.`;
    if (abilityId === 'iron_etiquette' && target) return `${target}, até aquilo que você descarta deve saber se comportar.`;
    return SPEECHES[abilityId] || '';
  },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    const summary = (gameState?.players || []).map((player) => {
      const domination = Math.round((Number(boss.chainsByPlayer?.[player.id]) || 0) * 12.5 * 10) / 10;
      return `${player.name}: ${domination}/50`;
    }).join(' · ');
    return { label: 'Dominação final', value: summary };
  },

  details({ intent } = {}) {
    // A Dominadora usa HUD curto; regras completas ficam no botão "?".
    return intent ? [] : [];
  },

  compactAction({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '', playerById = () => null, cardLabel = () => '', cardLabels = () => [] } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
    switch (intent.abilityId) {
      case 'collar': return { instruction: `${target}: ${collarCards.join(' e ')} bloqueada(s).`, progress: '', consequence: 'Até o fim do turno' };
      case 'exposure': {
        const targetPlayer = playerById(gameState, payload.targetPlayerId);
        const completed = !targetPlayer?.hand?.some((entry) => entry.id === payload.cardId);
        const pressure = dominatrixPressureText(intent.announcedPhase).exposure;
        return {
          instruction: completed ? `✅ ${target}: carta usada.` : `${target}: jogue ${card || 'a carta exposta'}.`,
          progress: completed ? '✅ 1/1' : '⬜ 0/1',
          consequence: completed ? `Dominação +${pressure.success}` : `Falha: +${pressure.fail}`,
        };
      }
      case 'forced_choice': {
        const pressure = dominatrixPressureText(intent.announcedPhase).forcedChoice;
        return { instruction: `Escolha: ordem ou +${pressure.direct} Dominação.`, progress: payload.order?.label || '', consequence: `Aceitar +${pressure.obey} · falhar +${pressure.fail}` };
      }
      case 'forced_swap': return { instruction: 'Troca forçada concluída.', progress: '', consequence: 'Cartas recebidas presas 1 turno' };
      case 'possession': {
        const possession = (gameState?.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
        return { instruction: `Libere o Jogo ${Number(payload.meldIndex) + 1}.`, progress: `${possession?.contributorPlayerIds?.length || 0}/${possession?.required || gameState?.players?.length || 2} jogadores`, consequence: 'Dano antigo suspenso' };
      }
      case 'absolute_control': return { instruction: `${target}: Dominado por 1 turno.`, progress: '', consequence: '+5 Dominação' };
      case 'double_collar': return { instruction: '1 carta de cada jogador bloqueada.', progress: '', consequence: 'Nesta rodada' };
      case 'separation': return { instruction: 'Cada jogo: só 1 jogador.', progress: '', consequence: 'Nesta rodada' };
      case 'hands_tied': return { instruction: 'Cada jogador: use só 1 jogo.', progress: '', consequence: 'Equipe: 1 jogo novo' };
      case 'favorite': return { instruction: `${playerName(gameState, payload.punishedPlayerId)}: +8 Dominação.`, progress: '', consequence: `${playerName(gameState, payload.protectedPlayerId)} poupada` };
      case 'break_will': return { instruction: 'Escolha: +8 Dominação ou +180 HP para a chefe.', progress: '', consequence: '' };
      case 'final_order': {
        const pressure = dominatrixPressureText(intent.announcedPhase).finalOrder;
        return { instruction: `Ordem às cegas ou +${pressure.direct} Dominação.`, progress: '', consequence: `Aceitar +${pressure.accept} · cartas só depois` };
      }
      case 'iron_etiquette': {
        const pressure = dominatrixPressureText(intent.announcedPhase).etiquette;
        return { instruction: `${target}: descarte ${payload.suitLabel}.`, progress: '⬜ 0/1', consequence: `Cumpre +${pressure.obey} · falha +${pressure.fail}` };
      }
      case 'interdict': return { instruction: `Jogo ${Number(payload.meldIndex) + 1}: não evolua.`, progress: '', consequence: 'Desobedecer: Dominação' };
      default: return null;
    }
  },

  help({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '' } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    switch (intent.abilityId) {
      case 'collar': return 'A Coleira prioriza cartas que realmente poderiam ser usadas. As cartas presas não podem ser jogadas nem descartadas até o fim do turno do alvo.';
      case 'forced_choice': return 'A ordem sempre nasce de uma tarefa viável. Aceitar cobra Dominação menor imediatamente; falhar cobra a punição adicional da fase. Se a mesa tornar a ordem impossível sem culpa do alvo, ela é cancelada.';
      case 'exposure': return `Usar a carta exposta ainda causa Dominação +1. Falhar causa +${dominatrixPressureText(intent.announcedPhase).exposure.fail}. A carta precisa entrar em jogo; simplesmente descartá-la não resolve a Exposição.`;
      case 'forced_swap': return 'A troca prioriza cartas úteis/jogáveis. A carta recebida fica presa durante o próximo turno para a troca realmente alterar o plano dos dois jogadores.';
      case 'possession': return 'Dano antigo do jogo fica suspenso; cartas novas causam dano normal. Para libertar: cada cooperador adiciona 1 carta OU o jogo evolui de categoria. Só o dano antigo suspenso é reaplicado.';
      case 'hands_tied': return 'Cada cooperador fica vinculado ao primeiro jogo que alimentar ou criar naquela rodada e não pode tocar outro. A equipe inteira ainda compartilha somente 1 criação de jogo novo.';
      case 'separation': return 'Nesta rodada, o primeiro cooperador que alimentar um jogo fica vinculado a ele: o parceiro não pode alimentar esse mesmo jogo. Os outros jogos continuam livres.';
      case 'favorite': return 'Nas Fases 2 e 3, o cooperador menos dominado recebe +8 Dominação. A protegida fica inalterada: ser poupada não recupera Dominação.';
      case 'double_collar': return 'A Dupla Coleira prioriza 1 carta útil/jogável de cada cooperador. As duas ficam presas durante a rodada.';
      case 'iron_etiquette': {
        const pressure = dominatrixPressureText(intent.announcedPhase).etiquette;
        return `O naipe é escolhido entre descartes legais e com poucas opções. Cumprir ainda custa Dominação +${pressure.obey}; falhar custa +${pressure.fail}.`;
      }
      case 'absolute_control': return `Neste efeito, ${target} é tratado como Dominado durante o próximo turno: não pode pegar o Lixo nem criar jogo novo, mas pode comprar do Monte e alimentar jogos existentes. Também recebe Dominação +5.`;
      case 'break_will': return 'Quebra de Vontade só aparece se houver um jogador com 25+ de Dominação e a chefe puder recuperar ao menos 120 HP. Ela mira quem está mais dominado. A escolha é +8 de Dominação ou cura de até 180 HP.';
      case 'final_order': return 'Escolha às cegas: recusar +7 Dominação; aceitar +2 e revela 2 cartas jogáveis sorteadas. Use-as em jogos. Cada carta não usada: +6. Descartar não cumpre.';
      default: return null;
    }
  },

  pendingChoice({ gameState, choice, helpers = {} } = {}) {
    if (!choice || !['forced_choice', 'break_will', 'final_order', 'final_order_draw', 'final_order_lock'].includes(choice.type)) return null;
    const playerName = helpers.playerName || (() => '');
    const cardLabelAnywhere = helpers.cardLabelAnywhere || (() => 'carta marcada');
    const detailFields = helpers.detailFields || ((entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`));
    const target = playerName(gameState, choice.playerId);
    const names = { forced_choice: 'Escolha Forcada', break_will: 'Quebra de Vontade', final_order: 'Ordem Final', final_order_draw: 'Ordem Final', final_order_lock: 'Ordem Final' };
    let instruction = `${target}: escolha agora.`;
    let progress = '';
    let consequence = '';
    let details = [];
    if (choice.type === 'final_order') {
      const pressure = dominatrixPressureText(choice.announcedPhase).finalOrder;
      instruction = `${target}: Ordem às cegas ou +${pressure.direct} Dominação.`;
      progress = `Aceitar +${pressure.accept}`;
      consequence = `Falha: +${pressure.miss}/carta`;
    } else if (choice.type === 'forced_choice') {
      const pressure = dominatrixPressureText(choice.announcedPhase).forcedChoice;
      instruction = `${target}: cumpra a ordem ou +${pressure.direct} Dominação.`;
      progress = choice.order?.label || '';
      consequence = `Aceitar +${pressure.obey} · falhar +${pressure.fail}`;
    } else if (choice.type === 'break_will') {
      instruction = `${target}: +8 Dominação ou +180 HP para a chefe.`;
      progress = '';
      consequence = '';
    } else if (choice.type === 'final_order_draw') instruction = `${target} escolhe entre comprar 2 cartas presas no proximo turno ou receber Dominação.`;
    else if (choice.type === 'final_order_lock') instruction = `${target} escolhe entre prender 1 carta aleatoria da propria mao no proximo turno ou receber Dominação.`;
    return { category: 'Escolha obrigatoria agora', name: names[choice.type] || 'Decisao obrigatoria', speech: '', description: '', details, instruction, progress, consequence };
  },

  status({ gameState, helpers = {}, mode = 'result' } = {}) {
    const boss = gameState?.boss;
    if (boss?.id !== 'dominadora') return null;
    const { playerName = () => '', detailFields = (entries) => entries, flowResultEvent = () => null, getBossDefinition = () => null } = helpers;

    const exposure = () => {
      const flowEventId = boss.bossFlow?.stage === 'result' ? boss.bossFlow.eventActionId : null;
      const event = flowEventId ? (boss.eventLog || []).find((entry) => entry.actionId === flowEventId) : boss.lastEvent;
      if (event?.type !== 'bossAbility' || event.abilityId !== 'exposure' || typeof event.exposureSuccess !== 'boolean') return null;
      const target = playerName(gameState, event.targetPlayerId);
      const cardInHands = (gameState.players || []).flatMap((player) => player.hand || []).find((entry) => entry.id === event.cardId);
      const cardOnTable = (gameState.teams || []).flatMap((team) => team.melds || []).flat().find((entry) => entry.id === event.cardId);
      const exposedCard = cardInHands || cardOnTable;
      const label = exposedCard ? `${exposedCard.rank}${exposedCard.suit}` : 'a carta exposta';
      const applied = Number(event.dominationApplied) || (event.exposureSuccess ? 1 : 9);
      if (event.exposureSuccess) return { category: 'Objetivo concluído', name: 'Exposição', speech: '', description: '', details: detailFields([['Alvo', target], ['Carta', label]]), instruction: `✅ ${target} usou ${label}.`, progress: '✅ 1/1 — Concluído', consequence: `Dominação +${applied}` };
      return { category: 'Objetivo não concluído', name: 'Exposição', speech: '', description: '', details: detailFields([['Alvo', target], ['Carta', label]]), instruction: `❌ ${target} terminou o turno sem usar ${label}.`, progress: '❌ 0/1 — Falhou', consequence: `Dominação +${applied}` };
    };

    const possession = () => {
      const current = [...(boss.possessions || [])].reverse()[0];
      if (current) {
        const contributors = new Set(current.contributorPlayerIds || []);
        const required = Math.max(1, Number(current.required) || gameState.players?.length || 2);
        const playerProgress = (gameState.players || []).slice(0, required).map((player) => (contributors.has(player.id) ? `✅ ${player.name}` : `⬜ ${player.name}`));
        const count = Math.min(contributors.size, required);
        return { category: 'Objetivo ativo', name: 'Posse', speech: '', description: '', details: detailFields([['Jogo', `#${Number(current.meldIndex) + 1}`], ['Dano suspenso', `${current.suppressedDamage || 0}`], ['Progresso', `${count}/${required}`]]), instruction: `O Jogo ${Number(current.meldIndex) + 1} está possuído. Cada cooperador precisa adicionar uma carta, ou o jogo precisa evoluir.`, progress: `${playerProgress.join(' · ')} · ${count}/${required}`, consequence: 'A Posse termina com uma contribuição de cada jogador ou com evolução de tier' };
      }
      const releaseEvent = boss.lastEvent?.type === 'possessionReleased' ? boss.lastEvent : null;
      if (!releaseEvent) return null;
      return { category: 'Objetivo concluído', name: 'Posse', speech: '', description: '', details: detailFields([['Jogo', `#${Number(releaseEvent.meldIndex) + 1}`], ['Dano restaurado', `${releaseEvent.reappliedDamage || 0}`]]), instruction: `✅ A equipe rompeu a Posse do Jogo ${Number(releaseEvent.meldIndex) + 1}.`, progress: '✅ Posse rompida — Concluído', consequence: `${releaseEvent.reappliedDamage || 0} de dano suspenso foram reaplicados` };
    };

    const etiquette = () => {
      const orders = [...(boss.activeOrders || [])].reverse();
      const currentIntentOrderId = boss.currentIntent?.abilityId === 'iron_etiquette' ? `etiquette_${boss.currentIntent.id}` : null;
      const currentIntentOrder = currentIntentOrderId ? orders.find((order) => order.id === currentIntentOrderId && order.type === 'discard_suit') : null;
      const activeOrder = orders.find((order) => order.type === 'discard_suit' && order.status === 'active');
      const latestResolvedEvent = !boss.currentIntent && boss.lastEvent?.type === 'dominatrixOrder' && boss.lastEvent?.orderType === 'discard_suit' ? boss.lastEvent : null;
      const resolvedOrder = latestResolvedEvent ? orders.find((entry) => entry.id === latestResolvedEvent.orderId && entry.type === 'discard_suit' && entry.status !== 'active') : null;
      const order = currentIntentOrder || activeOrder || resolvedOrder;
      if (!order) return null;
      const target = playerName(gameState, order.targetPlayerId);
      const suit = order.suitLabel || order.suit || 'o naipe ordenado';
      const pressure = dominatrixPressureText(order.announcedPhase || boss.phase).etiquette;
      const base = { category: order.status === 'active' ? 'Objetivo ativo' : 'Objetivo resolvido', name: 'Etiqueta de Ferro', speech: '', description: '', details: detailFields([['Alvo', target], ['Ordem', `descartar ${suit}`], ['Prazo', 'fim do turno do alvo']]) };
      if (order.status === 'active') return { ...base, instruction: `${target} deve encerrar o turno descartando ${suit}.`, progress: '⬜ 0/1 — Pendente', consequence: `Cumprir +${pressure.obey} · falhar +${pressure.fail}` };
      if (order.status === 'obeyed') return { ...base, instruction: `✅ ${target} cumpriu a Etiqueta de Ferro.`, progress: '✅ 1/1 — Concluído', consequence: `Dominação +${pressure.obey}` };
      if (order.status === 'disobeyed') return { ...base, instruction: `❌ ${target} desobedeceu à Etiqueta de Ferro.`, progress: '❌ 0/1 — Falhou', consequence: `Dominação +${pressure.fail}` };
      return { ...base, instruction: 'A Etiqueta de Ferro foi cancelada porque o objetivo deixou de ser possível.', progress: 'Cancelado', consequence: 'Dominação não aumentou' };
    };

    const interdict = () => {
      const interdicts = [...(boss.interdicts || [])].reverse();
      const currentIntent = boss.currentIntent?.abilityId === 'interdict' ? boss.currentIntent : null;
      const currentInterdictId = currentIntent ? `interdict_${currentIntent.id}` : null;
      const currentInterdict = currentInterdictId ? interdicts.find((entry) => entry.id === currentInterdictId) : null;
      const activeInterdict = interdicts.find((entry) => entry.status === 'active');
      const latestEvent = [...(boss.eventLog || [])].reverse().find((event) => ['interdictDecision', 'interdictExpired'].includes(event.type));
      const resolvedInterdict = latestEvent ? interdicts.find((entry) => entry.id === latestEvent.interdictId) : null;
      const entry = currentInterdict || activeInterdict || resolvedInterdict;
      if (!entry) return null;
      const gameNumber = Number(entry.meldIndex) + 1;
      const base = { category: entry.status === 'active' ? 'Restrição ativa agora' : 'Restrição resolvida', name: 'Interdito', speech: '', description: '', details: detailFields([['Jogo marcado', `#${gameNumber}`], ['Gatilho', 'mudar o tier da canastra'], ['Exemplo', 'Limpa → Real'], ['Prazo', 'fim da rodada']]) };
      if (entry.status === 'active') return { ...base, instruction: `O Jogo ${gameNumber} está marcado. Apenas a jogada que transformar a canastra em um tier superior ativa a escolha; adicionar cartas e continuar no mesmo tipo não conta.`, progress: '', consequence: 'Obedecer: cancelar só a tentativa · Desobedecer: evoluir e terminar com Dominação; esta evolução não concede Resistência' };
      if (entry.status === 'obeyed') return { ...base, instruction: `✅ O Interdito do Jogo ${gameNumber} foi obedecido.`, progress: 'Evolução cancelada', consequence: 'A canastra não evoluiu e nenhuma Dominação foi aplicada' };
      if (entry.status === 'disobeyed') return { ...base, instruction: `❌ O Interdito do Jogo ${gameNumber} foi desobedecido.`, progress: 'Evolução concluída', consequence: 'Dominação aplicado · Resistência não foi concedida nesta evolução' };
      if (entry.status === 'expired') return { ...base, instruction: `O Interdito do Jogo ${gameNumber} expirou sem tentativa de evolução.`, progress: 'Expirou sem ativar', consequence: 'Dominação não aumentou' };
      return { ...base, instruction: `O Interdito do Jogo ${gameNumber} foi cancelado porque a evolução deixou de ser possível.`, progress: '— Cancelado', consequence: 'Dominação não aumentou' };
    };

    if (mode === 'result') {
      const event = flowResultEvent(gameState);
      if (!event) return null;
      const abilityId = event.abilityId || event.sourceAbilityId;
      const ability = getBossDefinition('dominadora')?.abilities.find((entry) => entry.id === abilityId);
      if (!ability) return null;
      if (abilityId === 'possession') { const value = possession(); if (value) return value; }
      if (abilityId === 'exposure') { const value = exposure(); if (value) return value; }
      return { category: 'Resultado da habilidade', name: ability.name, speech: '', description: '', details: event.presentation?.details || [], instruction: event.outcome || `${ability.name} foi resolvida.`, progress: 'Resultado registrado', consequence: event.dangerChangeLabel || '' };
    }

    if (mode === 'etiquette') return etiquette();
    if (mode === 'interdict') return interdict();
    if (mode === 'persistent') {
      const specific = possession() || exposure() || etiquette() || interdict();
      if (specific) return specific;
      const finalOrderMarks = (boss.effects || []).filter((effect) => effect.id === 'final_order_mark');
      if (finalOrderMarks.length) {
        const cardLabelAnywhere = helpers.cardLabelAnywhere || (() => 'carta marcada');
        const meldCardIds = new Set((gameState.teams || []).flatMap((team) => (team.melds || []).flatMap((meld) => (meld || []).map((card) => card?.id).filter(Boolean))));
        const lines = finalOrderMarks.map((effect) => `${meldCardIds.has(effect.cardId) ? '✅' : '☐'} ${playerName(gameState, effect.playerId)} — ${cardLabelAnywhere(gameState, effect.cardId)}${meldCardIds.has(effect.cardId) ? ' · usada em jogo' : ' · use em jogo'}`);
        return { category: 'Ordem aceita em vigor', name: 'Ordem Final', speech: '', description: '', details: [], instruction: 'As cartas reveladas precisam entrar em jogo até o fim do turno de cada jogador.', progress: lines.join('\n'), consequence: `Cada carta não usada: Dominação +${dominatrixPressureText(3).finalOrder.miss}` };
      }
      const orders = (boss.activeOrders || []).filter((order) => order.status === 'active' && order.sourceAbilityId === 'forced_choice');
      if (orders.length) {
        const failValues = orders.map((order) => dominatrixPressureText(order.announcedPhase || boss.phase).forcedChoice.fail);
        const failText = [...new Set(failValues)].join('/');
        return { category: 'Ordem aceita em vigor', name: 'Escolha Forçada', speech: '', description: '', details: [], instruction: orders.map((order) => `${playerName(gameState, order.targetPlayerId)}: ${order.description || order.label || order.type}`).join(' · '), progress: 'Prazo: fim do turno do jogador marcado', consequence: `Falhar: Dominação +${failText}` };
      }
      return null;
    }
    return null;
  },
});
