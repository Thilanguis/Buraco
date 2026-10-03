const SPEECHES = Object.freeze({
  fixed_interest: 'O prazo acabou. Agora paguem os juros.',
  maintenance_fee: 'Nada e gratis na minha mesa.',
  credit_block: 'Credito negado. O lixo ficou fora do alcance.',
  suit_audit: 'Vamos conferir cada carta dessa conta.',
  pledge: 'Este jogo agora esta sob penhora.',
  compound_interest: 'Quanto mais cartas, maior sera a divida.',
  credit_limit: 'O credito continua aberto. O excesso e que tem preco.',
  discard_surcharge: 'O lixo tambem tem cotacao nesta mesa.',
});

const RESULT_CATEGORIES = Object.freeze({
  fixed_interest: 'Cobranca automatica',
  maintenance_fee: 'Punicao aplicada',
  credit_block: 'Restricao encerrada',
  suit_audit: 'Objetivo resolvido',
  pledge: 'Restricao encerrada',
  compound_interest: 'Cobranca variavel',
  credit_limit: 'Cobranca variavel',
  discard_surcharge: 'Cobranca aplicada',
});

const ACTION_CATEGORIES = Object.freeze({
  maintenance_fee: 'Tarifa ativa nesta rodada',
  credit_block: 'Restricao ativa agora',
  suit_audit: 'Objetivo da rodada',
  pledge: 'Restricao ativa agora',
  credit_limit: 'Cobranca variavel ativa',
  discard_surcharge: 'Cobranca preparada',
});

export const bankerBossPresentation = Object.freeze({
  id: 'banker',
  feminine: false,
  ruleSummary(gameState) {
    const limit = Math.max(1, Number(gameState?.boss?.maxDanger || 100));
    return `${limit} de Dívida = derrota imediata.`;
  },
  speech(abilityId) { return SPEECHES[abilityId] || ''; },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    return { label: 'Dívida final', value: `${Number(boss.danger || 0)} / ${Number(boss.maxDanger || 0)}` };
  },

  details({ gameState, intent } = {}) {
    if (!intent) return [];
    const payload = intent.payload || {};
    const phase = gameState?.boss?.phase || 1;
    if (intent.abilityId === 'fixed_interest') {
      const fullDebt = payload.fullDebt ?? payload.amount ?? (phase === 3 ? 16 : 12);
      const guaranteedDebt = payload.guaranteedDebt ?? payload.collateralAmount ?? (phase === 3 ? 7 : 5);
      const interestStep = payload.interestStep ?? (phase === 3 ? 3 : 2);
      return [
        `Integral: +${fullDebt} de Dívida`,
        `Cofre: carta aleatória · resgate começa em +${guaranteedDebt}`,
        `Adiar resgate: +${interestStep} por turno, até +${fullDebt}`,
      ];
    }
    if (intent.abilityId === 'maintenance_fee') return [
      `Cada jogador: +${payload.extraDraw ?? (phase === 3 ? 2 : 1)} carta(s) FINANCIADA(S)`,
      'Quitação: a carta precisa entrar em um jogo neste turno',
      `Descartar ou terminar com ela na mão: +${payload.financedDebt ?? (phase === 3 ? 7 : 5)} de Dívida cada`,
    ];
    if (intent.abilityId === 'credit_block') return ['Lixo bloqueado nesta rodada'];
    if (intent.abilityId === 'suit_audit') return [
      `Meta: ${payload.required} cartas de ${payload.suitLabel}`,
      `Progresso: ${payload.progress || 0}/${payload.required}`,
      'Sucesso: sem cobrança',
      `Falha: +${payload.failureDelta ?? (phase === 3 ? 16 : 12)} de Dívida`,
    ];
    if (intent.abilityId === 'pledge') return [`Jogo bloqueado: ${payload.meldIndex == null ? 'nenhum' : `#${Number(payload.meldIndex) + 1}`}`, 'Não pode receber cartas nesta rodada'];
    if (intent.abilityId === 'compound_interest') {
      const totalCards = gameState?.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      const safeMax = payload.safeMax ?? 7;
      const warningMax = payload.warningMax ?? 13;
      const currentDebt = totalCards <= safeMax ? payload.safeDebt : totalCards <= warningMax ? payload.warningDebt : payload.dangerDebt;
      return [`Cartas nas mãos: ${totalCards}`, `Cobrança atual: +${currentDebt} de Dívida`];
    }
    if (intent.abilityId === 'credit_limit') {
      const limit = gameState?.boss?.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      return [
        `Uso: ${counted}/${limit.allowance || payload.allowance} cartas da mão`,
        `Excedente: +${limit.debtPerCard || payload.debtPerCard} por carta`,
        `Teto: +${limit.maxCharge || payload.maxCharge}`,
      ];
    }
    if (intent.abilityId === 'discard_surcharge') {
      const surcharge = gameState?.boss?.discardSurcharge || payload;
      return [`Primeira retirada do lixo: +${surcharge.amount || payload.amount} de Dívida`, 'Comprar do monte evita o Ágio'];
    }
    return [];
  },

  compactAction({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '', cardLabelAnywhere = () => 'carta marcada', objectiveProgress = () => '' } = helpers;
    const payload = intent.payload || {};
    const boss = gameState?.boss || {};

    const maintenanceFeeProgress = () => {
      const maintenance = (boss.effects || []).find((entry) => entry.id === 'maintenance_fee' && entry.sourceActionId === intent.id);
      const activeFinanced = (boss.effects || []).filter((entry) => entry.id === 'financed_card' && entry.sourceActionId === intent.id);
      return (gameState?.players || []).flatMap((player) => {
        const playerCards = activeFinanced.filter((entry) => entry.playerId === player.id);
        if (playerCards.length) return playerCards.map((entry) => `☐ ${playerName(gameState, player.id)}: ${cardLabelAnywhere(gameState, entry.cardId)}`);
        const pendingDraw = boss.pendingFinancedDrawsByPlayer?.[player.id];
        if (pendingDraw?.sourceActionId === intent.id) return [`☐ ${playerName(gameState, player.id)}: recebendo`];
        if (maintenance?.pendingPlayerIds?.includes(player.id)) return [`☐ ${playerName(gameState, player.id)}: aguardando`];
        const resolved = [...(boss.eventLog || [])].reverse().find((event) => event.type === 'financedCharge'
          && event.round === boss.roundNumber
          && event.playerId === player.id
          && (!event.sourceActionId || event.sourceActionId === intent.id));
        if (resolved) return [resolved.dangerDelta ? `✕ ${playerName(gameState, player.id)}: +${resolved.dangerDelta} Dívida` : `✅ ${playerName(gameState, player.id)}: quitada`];
        return [`☐ ${playerName(gameState, player.id)}: aguardando`];
      }).join('\n');
    };

    const compactProgress = () => {
      if (intent.abilityId === 'maintenance_fee') return maintenanceFeeProgress();
      if (intent.abilityId === 'suit_audit') return objectiveProgress(payload.progress || 0, payload.required || 1, 'active');
      if (intent.abilityId === 'credit_limit') {
        const limit = boss.creditLimit || payload;
        const counted = new Set(limit.countedCardIds || []).size;
        const allowance = Math.max(1, limit.allowance || payload.allowance || 1);
        const exceeded = Math.max(0, counted - allowance);
        if (limit.status === 'expired') return `Limite encerrado · ${counted} carta${counted === 1 ? '' : 's'} contabilizada${counted === 1 ? '' : 's'}`;
        return exceeded ? `⚠ Uso ${counted}/${allowance} · ${exceeded} excedente${exceeded === 1 ? '' : 's'}` : `Uso ${counted}/${allowance} · dentro do limite`;
      }
      if (intent.abilityId === 'discard_surcharge') {
        const surcharge = boss.discardSurcharge || payload;
        if (surcharge.status === 'consumed') return '✅ Cobrança aplicada na retirada do lixo';
        if (surcharge.status === 'expired') return '— Encerrado sem retirada do lixo';
        return '🪙 Ágio ativo · aguardando retirada do lixo';
      }
      return '';
    };

    switch (intent.abilityId) {
      case 'fixed_interest': {
        const holder = playerName(gameState, payload.holderPlayerId);
        const fullDebt = payload.fullDebt ?? payload.amount;
        const guaranteedDebt = payload.guaranteedDebt ?? payload.collateralAmount;
        const interestStep = payload.interestStep ?? (intent.announcedPhase === 3 ? 3 : 2);
        return { instruction: `${holder}: pague agora ou use o Cofre.`, progress: [`Integral: +${fullDebt} Dívida`, `Cofre: +${guaranteedDebt} · 1 carta presa`, `Adiar: +${interestStep}/turno`].join('\n'), consequence: '' };
      }
      case 'maintenance_fee':
        return { instruction: 'Coloque as cartas FINANCIADAS em jogos.', progress: compactProgress(), consequence: `Não usar: +${payload.financedDebt ?? (intent.announcedPhase === 3 ? 7 : 5)} Dívida/carta` };
      case 'credit_block':
        return { instruction: '🔒 Lixo bloqueado.', progress: '', consequence: 'Até virar a rodada' };
      case 'suit_audit':
        return { instruction: `Baixe ${payload.required} de ${payload.suitLabel}.`, progress: compactProgress(), consequence: `Falha: +${payload.failureDelta} Dívida` };
      case 'pledge':
        return { instruction: `🔒 Jogo ${Number(payload.meldIndex) + 1} bloqueado.`, progress: '', consequence: 'Até a cobrança' };
      case 'compound_interest': {
        const total = gameState?.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
        const safeMax = payload.safeMax ?? 7;
        const warningMax = payload.warningMax ?? 13;
        const phase3 = intent.announcedPhase === 3;
        const safeDebt = payload.safeDebt ?? (phase3 ? 8 : 6);
        const warningDebt = payload.warningDebt ?? (phase3 ? 12 : 10);
        const dangerDebt = payload.dangerDebt ?? (phase3 ? 16 : 14);
        const currentDebt = total <= safeMax ? safeDebt : total <= warningMax ? warningDebt : dangerDebt;
        return { instruction: `Equipe: ${total} cartas na mão.`, progress: '', consequence: `Agora: +${currentDebt} Dívida` };
      }
      case 'credit_limit': {
        const limit = boss.creditLimit || payload;
        const counted = new Set(limit.countedCardIds || []).size;
        const allowance = limit.allowance || payload.allowance || 0;
        const chargedDebt = Number(limit.chargedDebt) || 0;
        const maxCharge = limit.maxCharge || payload.maxCharge || 0;
        return { instruction: `Cartas da mão usadas: ${counted}/${allowance} sem custo.`, progress: '', consequence: counted > allowance ? `+${chargedDebt} Dívida · teto +${maxCharge}` : 'Sem cobrança' };
      }
      case 'discard_surcharge':
        return { instruction: `1ª retirada do Lixo: +${payload.amount} Dívida.`, progress: '', consequence: 'Monte evita a cobrança' };
      default:
        return null;
    }
  },

  rangeMeters({ gameState, intent } = {}) {
    if (!intent) return null;
    const payload = intent.payload || {};
    const boss = gameState?.boss || {};
    if (intent.abilityId === 'compound_interest') {
      const total = (gameState?.players || []).reduce((sum, player) => sum + (player.hand?.length || 0), 0);
      const safeMax = payload.safeMax ?? 7;
      const warningMax = payload.warningMax ?? 13;
      const phase3 = Number(intent.announcedPhase) === 3;
      const safeDebt = payload.safeDebt ?? (phase3 ? 8 : 6);
      const warningDebt = payload.warningDebt ?? (phase3 ? 12 : 10);
      const dangerDebt = payload.dangerDebt ?? (phase3 ? 16 : 14);
      const currentDebt = total <= safeMax ? safeDebt : total <= warningMax ? warningDebt : dangerDebt;
      return [{ label: 'Equipe', value: total, unit: total === 1 ? 'carta' : 'cartas', max: Math.max(warningMax + 5, total), tone: total > warningMax ? 'danger' : total > safeMax ? 'warning' : 'safe', currentEffect: `+${currentDebt} DÍVIDA`, segments: [
        { from: 0, to: safeMax, label: `0–${safeMax}`, effect: `+${safeDebt} Dívida`, tone: 'safe' },
        { from: safeMax + 1, to: warningMax, label: `${safeMax + 1}–${warningMax}`, effect: `+${warningDebt} Dívida`, tone: 'warning' },
        { from: warningMax + 1, to: null, label: `${warningMax + 1}+`, effect: `+${dangerDebt} Dívida`, tone: 'danger' },
      ] }];
    }
    if (intent.abilityId === 'credit_limit') {
      const limit = boss.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = Number(limit.allowance || payload.allowance) || 0;
      const debtPerCard = Number(limit.debtPerCard || payload.debtPerCard) || 1;
      const maxCharge = Number(limit.maxCharge || payload.maxCharge) || debtPerCard;
      const chargedDebt = Number(limit.chargedDebt) || 0;
      const maxExceededCards = Math.max(1, Math.ceil(maxCharge / debtPerCard));
      return [{ label: 'Franquia compartilhada', value: counted, unit: counted === 1 ? 'carta' : 'cartas', max: Math.max(allowance + maxExceededCards, counted), tone: counted > allowance ? 'danger' : 'safe', currentEffect: counted > allowance ? `+${chargedDebt} / +${maxCharge} DÍVIDA` : 'DENTRO DA FRANQUIA', segments: [
        { from: 0, to: allowance, label: `0–${allowance}`, effect: 'sem cobrança', tone: 'safe' },
        { from: allowance + 1, to: null, label: `${allowance + 1}+`, effect: `+${debtPerCard}/carta · teto +${maxCharge}`, tone: 'danger' },
      ] }];
    }
    return null;
  },

  help({ intent } = {}) {
    if (!intent) return null;
    switch (intent.abilityId) {
      case 'fixed_interest':
        return 'Cofre: 1 carta do titular fica apreendida. Resgatar substitui a compra normal. Se o titular comprar do Monte e adiar, o resgate sobe +2 por turno nas Fases 1–2 ou +3 na Fase 3, até o valor integral; ao chegar ao limite, o próximo resgate é obrigatório.';
      case 'maintenance_fee':
        return 'FINANCIADA é a carta extra criada pela Tarifa. Ela só quita a cobrança se entrar legalmente em um jogo naquele turno. Descartá-la ou terminar o turno ainda com ela na mão gera a cobrança uma única vez.';
      case 'credit_limit':
        return 'A franquia é compartilhada pela equipe e conta somente cartas que vieram da mão e permaneceram legalmente na mesa. Cartas trazidas pelo Lixo, reorganização e cartas que já estavam em jogo não entram na conta. Só o excedente gera Dívida, até o teto mostrado.';
      default:
        return null;
    }
  },

  pendingChoice({ gameState, choice, helpers = {} } = {}) {
    if (!choice || !['fixed_interest_payment', 'banker_collateral_card'].includes(choice.type)) return null;
    const playerName = helpers.playerName || (() => '');
    const detailFields = helpers.detailFields || ((entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`));
    const target = playerName(gameState, choice.playerId);
    if (choice.type === 'fixed_interest_payment') {
      return {
        category: 'Escolha obrigatoria agora',
        name: 'Pagamento dos Juros Fixos',
        speech: '', description: '',
        details: detailFields([
          ['Titular sorteado', target],
          ['Pagamento integral', `+${choice.amount} Dívida agora`],
          ['Com garantia', 'o Banqueiro apreende 1 carta aleatória'],
          ['Preço inicial do resgate', `+${choice.collateralAmount} Dívida`],
          ['Juros', '+1 a cada turno em que comprar normalmente'],
          ['Limite', `ao chegar a +${choice.amount}, o próximo resgate é obrigatório`],
        ]),
        instruction: `${target} escolhe como pagar o contrato.`,
        progress: `Integral agora: +${choice.amount} Dívida`,
        consequence: `Cofre: carta aleatória; resgate começa em +${choice.collateralAmount} e sobe +1 por compra adiada`,
      };
    }
    return {
      category: 'Escolha obrigatoria agora', name: 'Garantia do Cofre', speech: '', description: '',
      details: detailFields([['Titular', target], ['Compatibilidade', 'etapa antiga de escolha manual da carta'], ['Resgate', 'substitui uma compra e cobra a Dívida acumulada']]),
      instruction: `${target}: concluindo uma garantia salva na versão anterior.`,
      progress: 'A carta escolhida ficará no Cofre',
      consequence: `O resgate começa em +${choice.collateralAmount} Dívida`,
    };
  },

  status({ gameState, helpers = {} } = {}) {
    const boss = gameState?.boss;
    if (boss?.id !== 'banker') return null;
    const { flowResultEvent = () => null, objectiveProgress = () => '' } = helpers;
    const event = flowResultEvent(gameState);
    if (event?.type !== 'bossAbility') return null;
    const details = [...(event.presentation?.details || [])];
    const progressDetail = details.find((entry) => /^Progresso:/i.test(entry)) || '';
    const progressMatch = progressDetail.match(/(\d+)\s*\/\s*(\d+)/);
    let progress = event.outcome || 'Efeito resolvido';
    let category = 'Efeito resolvido';

    if (event.abilityId === 'suit_audit') {
      const current = Number(progressMatch?.[1]) || 0;
      const required = Number(progressMatch?.[2]) || 1;
      const success = Number(event.dangerDelta) < 0;
      progress = objectiveProgress(success ? required : current, required, success ? 'success' : 'failed');
      category = success ? 'Objetivo concluído' : 'Objetivo não concluído';
    } else if (event.abilityId === 'maintenance_fee') {
      const effect = (boss.effects || []).find((entry) => entry.id === 'maintenance_fee');
      const total = Math.max(1, gameState.players?.length || 0);
      const pending = new Set(effect?.pendingPlayerIds || []).size;
      progress = pending ? `Tarifa ativa · ${total - pending}/${total} compras aplicadas` : '✅ Tarifa aplicada aos cooperadores';
      category = 'Efeito ativado';
    } else if (event.abilityId === 'credit_limit') {
      progress = this.compactAction({ gameState, intent: { abilityId: 'credit_limit', payload: boss.creditLimit || {} }, helpers })?.progress || '';
      const limit = boss.creditLimit || {};
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = Math.max(1, limit.allowance || 1);
      const exceeded = Math.max(0, counted - allowance);
      progress = limit.status === 'expired'
        ? `Limite encerrado · ${counted} carta${counted === 1 ? '' : 's'} contabilizada${counted === 1 ? '' : 's'}`
        : exceeded ? `⚠ Uso ${counted}/${allowance} · ${exceeded} excedente${exceeded === 1 ? '' : 's'}` : `Uso ${counted}/${allowance} · dentro do limite`;
      category = 'Cobrança variável ativa';
    } else if (event.abilityId === 'discard_surcharge') {
      const surcharge = boss.discardSurcharge || {};
      progress = surcharge.status === 'consumed' ? '✅ Cobrança aplicada na retirada do lixo' : surcharge.status === 'expired' ? '— Encerrado sem retirada do lixo' : '🪙 Ágio ativo · aguardando retirada do lixo';
      category = 'Cobrança preparada';
    } else if (['credit_block', 'pledge'].includes(event.abilityId)) {
      progress = 'Restrição encerrada';
      category = 'Restrição encerrada';
    } else if (Number(event.dangerDelta)) {
      progress = 'Cobrança aplicada';
      category = 'Cobrança concluída';
    } else if (event.abilityId === 'fixed_interest') {
      progress = boss.pendingChoices?.some((choice) => choice.type === 'fixed_interest_payment') ? 'Pagamento obrigatório pendente' : 'Cobrança resolvida';
      category = 'Cobrança automática';
    }

    return { category, name: event.name, speech: '', description: '', details, instruction: event.outcome || `${event.name} foi resolvida.`, progress, consequence: event.dangerChangeLabel || '' };
  },
});
