const SPEECHES = Object.freeze({
  collar: 'Duas das suas opcoes agora me pertencem.',
  forced_choice: 'Escolha. Toda opcao cobra seu preco.',
  exposure: 'Eu vejo exatamente onde sua mao e fraca.',
  forced_swap: 'Seus planos ficariam melhores na mao errada.',
  hands_tied: 'Tentem jogar com as maos atadas.',
  possession: 'Este jogo responde a mim agora.',
  favorite: 'Uma sera favorecida. A outra, castigada.',
  double_collar: 'Duas coleiras. Nenhuma liberdade.',
  separation: 'Cooperacao demais cria maus habitos.',
  absolute_control: 'Neste turno, sua vontade e minha.',
  break_will: 'Vamos descobrir quanto vale sua resistencia.',
  final_order: 'Cada uma recebera exatamente o que merece.',
  iron_etiquette: 'Ate o seu descarte obedecera a minha etiqueta.',
  interdict: 'Este jogo evolui somente se eu permitir.',
});

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

export const dominatrixBossPresentation = Object.freeze({
  id: 'dominadora',
  feminine: true,
  speech(abilityId, { collarCards = [] } = {}) {
    if (abilityId === 'collar' && collarCards.length === 1) return 'Uma das suas opcoes agora me pertence.';
    return SPEECHES[abilityId] || '';
  },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    const summary = (gameState?.players || []).map((player) => `${player.name}: ${Number(boss.chainsByPlayer?.[player.id] || 0)}/4`).join(' · ');
    return { label: 'Chicotes finais', value: summary };
  },

  details({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return [];
    const { playerName = () => '', cardLabel = () => '', cardLabels = () => [], chains = () => 0, cardLabelAnywhere = () => 'carta marcada', detailFields = (entries) => entries } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
    const possession = (gameState?.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
    const contributors = (possession?.contributorPlayerIds || []).map((playerId) => playerName(gameState, playerId));
    switch (intent.abilityId) {
      case 'collar': return detailFields([['Alvo', target], [collarCards.length > 1 ? 'Cartas' : 'Carta', collarCards.join(' e ')], ['Duracao', 'ate o fim do turno do alvo'], ['Restricao', 'nao pode jogar nem descartar']]);
      case 'forced_choice': return detailFields([['Alvo', target], ['Resolucao', 'imediatamente apos o anuncio'], ['Escolha', `receber 1 Chicote ou aceitar: ${payload.order?.label || 'uma ordem valida para o proximo turno'}`]]);
      case 'exposure': return detailFields([['Alvo', target], ['Carta', card], ['Duracao', 'ate o fim do turno do alvo'], ['Obrigacao', 'baixar ou adicionar a um jogo'], ['Falha', '1 Chicote se permanecer na mao']]);
      case 'forced_swap': return detailFields([['Alvos', 'os dois cooperadores'], ['Cartas', 'uma carta de cada mao'], ['Efeito', 'a troca acontece depois deste anuncio']]);
      case 'hands_tied': return detailFields([['Alvos', 'equipe inteira'], ['Duracao', 'rodada completa'], ['Criacao compartilhada', payload.teamMeldAvailable === false ? 'consumida' : 'disponivel'], ['Consumida por', playerName(gameState, payload.consumedByPlayerId)], ['Restricao', 'a equipe pode criar somente 1 jogo novo']]);
      case 'possession': return detailFields([['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Contribuicoes', contributors.length ? contributors.join(' e ') : 'nenhum cooperador'], ['Progresso', `${contributors.length}/${possession?.required || gameState?.players?.length || 2}`], ['Duracao', 'ate romper a Posse'], ['Restricao', 'o dano do jogo permanece suspenso'], ['Encerramento', 'uma contribuicao de cada jogador ou evolucao de tier']]);
      case 'favorite': return detailFields([['Protegido', playerName(gameState, payload.protectedPlayerId)], ['Punido', playerName(gameState, payload.punishedPlayerId)], ['Chicotes do punido', `${chains(gameState, payload.punishedPlayerId)}/4`], ['Efeito', 'protecao e 1 Chicote depois deste anuncio']]);
      case 'double_collar': return detailFields([['Alvos', (payload.lockedCards || []).map((entry) => `${playerName(gameState, entry.playerId)}: ${cardLabel(gameState, entry.playerId, entry.cardId)}`).join('; ')], ['Duracao', 'rodada completa'], ['Restricao', 'nao pode jogar nem descartar as cartas presas']]);
      case 'separation': return detailFields([['Alvos', 'os dois cooperadores'], ['Duracao', 'rodada completa'], ['Restricao', 'cada jogo so pode ser alimentado por um cooperador']]);
      case 'absolute_control': return detailFields([['Alvo', target], ['Duracao', 'turno do jogador alvo'], ['Restricao', 'nao pode criar jogos novos'], ['Encerramento', 'o alvo concluir o turno']]);
      case 'break_will': return detailFields([['Alvo', target], ['Chicotes', `${chains(gameState, payload.targetPlayerId)}/4`], ['Resolucao', 'ao final da rodada'], ['Escolha', 'receber 1 Chicote ou retirar carta de canastra']]);
      case 'final_order': {
        const orders = payload.orders || [];
        return detailFields([['Alvos', 'os dois cooperadores'], ['Cartas marcadas', orders.map((order) => `${playerName(gameState, order.playerId)}: ${(order.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).join(' e ')}`).join(' · ')], ['Resolucao', 'cada jogador decide agora, antes dos turnos dos cooperadores'], ['Escolha', 'aceitar a ordem ou receber 1 Chicote imediatamente'], ['Falha ao obedecer', '1 Chicote por carta marcada que nao entrar em jogo']]);
      }
      case 'iron_etiquette': return detailFields([['Alvo', target], ['Ordem', `descartar ${payload.suitLabel}`], ['Prazo', 'fim do proximo turno do alvo'], ['Desobediencia', '+1 Chicote']]);
      case 'interdict': return detailFields([['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Gatilho', 'primeira tentativa valida de evolucao'], ['Obedecer', 'cancelar somente a tentativa'], ['Desobedecer', 'evoluir e receber +1 Chicote'], ['Duracao', 'esta rodada']]);
      default: return detailFields([['Duracao', 'rodada completa'], ['Efeito', intent.description || 'ordem ativa']]);
    }
  },

  compactAction({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '', playerById = () => null, cardLabel = () => '', cardLabels = () => [], cardLabelAnywhere = () => 'carta marcada' } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
    switch (intent.abilityId) {
      case 'collar': return { instruction: `${target}: ${collarCards.join(' e ')} bloqueada(s).`, progress: '', consequence: 'Até fim do turno' };
      case 'exposure': {
        const targetPlayer = playerById(gameState, payload.targetPlayerId);
        const completed = !targetPlayer?.hand?.some((entry) => entry.id === payload.cardId);
        const exposedCard = card || 'a carta exposta';
        return { instruction: completed ? `✅ ${target}: ${exposedCard} usada.` : `${target}: use ${exposedCard}.`, progress: completed ? '✅ 1/1' : '⬜ 0/1', consequence: completed ? 'Sem Chicote' : 'Falha: +1 Chicote' };
      }
      case 'forced_choice': return { instruction: `${target}: aceite a ordem ou receba +1 Chicote.`, progress: payload.order?.label || '', consequence: 'Escolha agora' };
      case 'forced_swap': return { instruction: 'Troca de 1 carta entre os cooperadores.', progress: '', consequence: 'Automático' };
      case 'possession': {
        const possession = (gameState?.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
        return { instruction: `Jogo ${Number(payload.meldIndex) + 1}: dano antigo suspenso.`, progress: `Contribuição: ${possession?.contributorPlayerIds?.length || 0}/${possession?.required || gameState?.players?.length || 2}`, consequence: 'Libera com os 2 jogadores ou evolução' };
      }
      case 'absolute_control': return { instruction: `${target}: Dominado neste turno.`, progress: '', consequence: 'Sem Lixo · sem jogo novo' };
      case 'double_collar': return { instruction: '1 carta de cada jogador bloqueada.', progress: '', consequence: 'Nesta rodada' };
      case 'separation': return { instruction: 'Cada jogo pode ser alimentado por só 1 jogador.', progress: '', consequence: 'Nesta rodada' };
      case 'hands_tied': {
        const consumed = payload.teamMeldAvailable === false;
        const consumedBy = payload.consumedByPlayerId == null ? null : playerName(gameState, payload.consumedByPlayerId);
        if (consumed) return { instruction: 'Limite de jogo novo já usado.', progress: `✅ 1/1${consumedBy ? ` · ${consumedBy}` : ''}`, consequence: 'Agora só jogos existentes' };
        return { instruction: 'Máx. 1 jogo novo nesta rodada.', progress: '⬜ 0/1', consequence: 'Depois: só jogos existentes' };
      }
      case 'favorite': return { instruction: `${playerName(gameState, payload.protectedPlayerId)} protegida · ${playerName(gameState, payload.punishedPlayerId)} +1 Chicote.`, progress: '', consequence: '' };
      case 'break_will': return { instruction: `${target}: escolha a punição no fim da rodada.`, progress: '', consequence: 'Chicote ou canastra' };
      case 'final_order': {
        const orders = payload.orders || [];
        const lines = orders.map((order) => `☐ ${playerName(gameState, order.playerId)} — ${(order.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).join(' e ')}`);
        return { instruction: 'Use as 2 cartas marcadas em jogos.', progress: lines.join('\n'), consequence: 'Recusar +1 · Aceitou: +1 por carta não usada' };
      }
      case 'iron_etiquette': return { instruction: `${target}: descarte ${payload.suitLabel}.`, progress: '⬜ 0/1', consequence: 'Outro naipe: +1 Chicote' };
      case 'interdict': return { instruction: `Jogo ${Number(payload.meldIndex) + 1}: não evolua de categoria.`, progress: '', consequence: 'Evoluir: cancelar ou +1 Chicote' };
      default: return null;
    }
  },

  help({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '' } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    switch (intent.abilityId) {
      case 'forced_choice': return 'Se aceitar a ordem, ela vale para o próximo turno do alvo. A Dominadora só oferece uma ordem que pode ser cumprida naquele momento. Se uma mudança externa tornar a ordem impossível, ela é cancelada sem Chicote; se o próprio jogador gastar voluntariamente a forma de cumprir, conta como desobediência.';
      case 'possession': return 'A Posse suspende somente o dano antigo do jogo marcado. Cartas novas ainda causam o dano individual normal. O jogo é libertado quando cada cooperador contribui ao menos 1 carta ou quando ele evolui de categoria; nesse momento, apenas o dano antigo suspenso volta a ser aplicado.';
      case 'hands_tied': return 'O limite é da equipe inteira: existe apenas 1 jogo novo disponível na rodada. Assim que qualquer cooperador usar essa criação, os dois só podem alimentar jogos existentes até a rodada terminar.';
      case 'separation': return 'Nesta rodada, o primeiro cooperador que alimentar um jogo fica vinculado a ele: o parceiro não pode alimentar esse mesmo jogo. Os outros jogos continuam livres.';
      case 'absolute_control': return `Neste efeito, ${target} é tratado como Dominado durante o próximo turno: não pode pegar o Lixo nem criar jogo novo, mas pode comprar do Monte e alimentar jogos existentes.`;
      case 'break_will': return 'Quebra de Vontade só escolhe um jogador que já tenha pelo menos 2 Chicotes. Ele decide entre receber outro Chicote ou aceitar a alternativa de retirar uma carta válida de canastra.';
      case 'final_order': return 'Cada cooperador decide separadamente: pode recusar e receber +1 Chicote agora, ou aceitar usar as 2 cartas marcadas em jogos no próximo turno. Se aceitar, 2/2 usadas = 0 Chicotes; 1/2 = +1; 0/2 = +2. Descartar carta marcada não cumpre a ordem.';
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
    let instruction = `${target} precisa decidir antes de a partida continuar.`;
    let progress = '';
    let consequence = 'Acoes comuns bloqueadas';
    let details = detailFields([['Alvo', target], ['Ordem oferecida', choice.order?.label], ['Estado', 'a partida permanece pausada ate a decisao']]);
    if (choice.type === 'final_order') {
      const cards = (choice.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).filter(Boolean);
      instruction = `${target}: ${cards.join(' e ')} foram marcadas. Aceite usar as duas em jogo no proximo turno ou receba 1 Chicote agora.`;
      progress = `☐ 0/${cards.length || 2} — cada carta nao usada vale +1 Chicote`;
      consequence = 'Obedecer pode resultar em 0, 1 ou 2 Chicotes';
      details = detailFields([['Alvo', target], ['Cartas marcadas', cards.join(' e ')], ['Recusar', '+1 Chicote agora'], ['Aceitar', 'usar as 2 cartas em jogos no proximo turno'], ['Falha parcial', '+1 Chicote por carta nao usada']]);
    } else if (choice.type === 'final_order_draw') instruction = `${target} escolhe entre comprar 2 cartas presas no proximo turno ou receber 1 Chicote.`;
    else if (choice.type === 'final_order_lock') instruction = `${target} escolhe entre prender 1 carta aleatoria da propria mao no proximo turno ou receber 1 Chicote.`;
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
      if (event.exposureSuccess) return { category: 'Objetivo concluído', name: 'Exposição', speech: '', description: '', details: detailFields([['Alvo', target], ['Carta', label]]), instruction: `✅ ${target} usou ${label}.`, progress: '✅ 1/1 — Concluído', consequence: 'Nenhum Chicote aplicado' };
      return { category: 'Objetivo não concluído', name: 'Exposição', speech: '', description: '', details: detailFields([['Alvo', target], ['Carta', label]]), instruction: `❌ ${target} terminou o turno sem usar ${label}.`, progress: '❌ 0/1 — Falhou', consequence: '+1 Chicote' };
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
      const base = { category: order.status === 'active' ? 'Objetivo ativo' : 'Objetivo resolvido', name: 'Etiqueta de Ferro', speech: '', description: '', details: detailFields([['Alvo', target], ['Ordem', `descartar ${suit}`], ['Prazo', 'fim do turno do alvo']]) };
      if (order.status === 'active') return { ...base, instruction: `${target} deve encerrar o turno descartando ${suit}.`, progress: '⬜ 0/1 — Pendente', consequence: 'Outro naipe enquanto houver opção válida: +1 Chicote' };
      if (order.status === 'obeyed') return { ...base, instruction: `✅ ${target} cumpriu a Etiqueta de Ferro.`, progress: '✅ 1/1 — Concluído', consequence: 'Nenhum Chicote aplicado' };
      if (order.status === 'disobeyed') return { ...base, instruction: `❌ ${target} desobedeceu à Etiqueta de Ferro.`, progress: '❌ 0/1 — Falhou', consequence: '+1 Chicote' };
      return { ...base, instruction: 'A Etiqueta de Ferro foi cancelada porque o objetivo deixou de ser possível.', progress: 'Cancelado', consequence: 'Nenhum Chicote aplicado' };
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
      if (entry.status === 'active') return { ...base, instruction: `O Jogo ${gameNumber} está marcado. Apenas a jogada que transformar a canastra em um tier superior ativa a escolha; adicionar cartas e continuar no mesmo tipo não conta.`, progress: '', consequence: 'Obedecer: cancelar só a tentativa · Desobedecer: evoluir e terminar com +1 Chicote; esta evolução não concede Resistência' };
      if (entry.status === 'obeyed') return { ...base, instruction: `✅ O Interdito do Jogo ${gameNumber} foi obedecido.`, progress: 'Evolução cancelada', consequence: 'A canastra não evoluiu e nenhum Chicote foi aplicado' };
      if (entry.status === 'disobeyed') return { ...base, instruction: `❌ O Interdito do Jogo ${gameNumber} foi desobedecido.`, progress: 'Evolução concluída', consequence: '+1 Chicote aplicado · Resistência não foi concedida nesta evolução' };
      if (entry.status === 'expired') return { ...base, instruction: `O Interdito do Jogo ${gameNumber} expirou sem tentativa de evolução.`, progress: 'Expirou sem ativar', consequence: 'Nenhum Chicote aplicado' };
      return { ...base, instruction: `O Interdito do Jogo ${gameNumber} foi cancelado porque a evolução deixou de ser possível.`, progress: '— Cancelado', consequence: 'Nenhum Chicote aplicado' };
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
        return { category: 'Ordem aceita em vigor', name: 'Ordem Final', speech: '', description: '', details: [], instruction: 'As cartas marcadas precisam entrar em jogo até o fim do turno de cada jogador.', progress: lines.join('\n'), consequence: 'Cada carta marcada que não entrar em jogo: +1 Chicote' };
      }
      const orders = (boss.activeOrders || []).filter((order) => order.status === 'active' && order.sourceAbilityId === 'forced_choice');
      if (orders.length) return { category: 'Ordem aceita em vigor', name: 'Escolha Forçada', speech: '', description: '', details: [], instruction: orders.map((order) => `${playerName(gameState, order.targetPlayerId)}: ${order.description || order.label || order.type}`).join(' · '), progress: 'Prazo: fim do turno do jogador marcado', consequence: 'Descumprir: +1 Chicote' };
      return null;
    }
    return null;
  },
});
