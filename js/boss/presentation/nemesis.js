import { nemesisDefinition } from '../bosses/nemesis.js';
import { getNemesisObjectiveOutcome, projectNemesisInfection, getNemesisZombieEffect } from '../mechanics/nemesis.js';
const entry = (id) => nemesisDefinition.abilities.find((ability) => ability.id === id);
const offensiveIds = new Set(['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination']);
function hordeCommandPresentation(boss, intent) {
  const entity = boss.combatEntities?.find(item => item.id === intent.payload?.entityId);
  const active = entity && getNemesisZombieEffect(boss, entity).reinforced;
  if (!entity || entity.status !== 'persistent' || entity.hp <= 0 || (intent.payload?.activated && !active)) {
    return { instruction: 'Reforço encerrado.', consequence: 'Nenhum zumbi reforçado por este comando.', help: 'Este comando não reforça mais um zumbi vivo.' };
  }
  const expiresRound = active ? boss.hordeBuff.expiresRound : boss.roundNumber + 1;
  const effect = getNemesisZombieEffect(active ? boss : { ...boss, hordeBuff: { entityId: entity.id, expiresRound } }, entity);
  const instruction = `${entity.name}${active ? ' reforçado' : ': reforço'} até fim da rodada ${expiresRound}.`;
  const consequence = entity.id === 'grabber' ? `Após compra: prende ${effect.value} cartas.`
    : entity.id === 'infected' ? `Falha: +${effect.value} Infecção extra.`
      : `A cada 3 cartas da equipe: cura até ${effect.value} HP.`;
  const rule = entity.id === 'grabber' ? 'Persegue um jogador nesta rodada e troca na próxima. Após a compra do alvo, sorteia cartas da mão: não pode jogar, mas pode descartar até o fim do turno. Só prende menos por falta de cartas ou para preservar uma saída legal.'
    : entity.id === 'infected' ? 'Uma falha que já aumenta Infecção recebe esse adicional uma vez. Falhar na Invasão não gera esse bônus.'
      : 'Cada 3 cartas novas que a equipe adiciona aos jogos curam o Nemesis. Pode juntar contribuições de jogos, jogadores e turnos diferentes. Cada grupo de 3 cura imediatamente, mesmo na mesma jogada. Só o progresso parcial fica para depois. Derrotar o Devorador zera essa contagem.';
  return { instruction, consequence, help: `${instruction}\n${consequence}\n${rule}\nSó ${entity.name} recebe este reforço.` };
}
function compact({ gameState, intent, helpers = {} }) {
  if (!intent) return null;
  const payload = intent.payload || {};
  const target = gameState.players.find((player) => player.id === payload.targetPlayerId)?.name || '';
  const label = (id) => helpers.cardLabelAnywhere?.(gameState, id) || id;
  const names = (payload.cardIds || []).map(label).join(' · ');
  const who = target.slice(0, 16);
  const current = payload.objectiveVersion === 2;
  const partner = gameState.players.find(player => player.id === payload.partnerPlayerId)?.name.slice(0, 16) || 'Parceiro';
  const instruction = {
    horde_invasion: payload.entryKind === 'grabber' ? `${who}: jogue/descarte a carta marcada.` : payload.entryKind === 'infected' ? 'Equipe: contribua 2 cartas nesta rodada.' : 'Alimente jogos existentes com 3 cartas nesta rodada.',
    stars_hunt: current ? `${who}: cause dano direto ao Nemesis.` : `${who}: contribua 1 carta neste turno.`,
    infectious_tentacle: current ? `${who}: jogue 1 marcada; descarte custa menos.` : `${who}: jogue/descarte 1 marcada.`,
    tentacle_barrage: `${who}: jogue/descarte 2 marcadas.`,
    stars_extermination: current ? `${who}: ataque Nemesis · ${partner}: Jogo ${payload.partnerMeldIndex + 1}.` : `${who}: contribua E resolva a segunda carta.`,
    contaminated_zone: `${who}: Lixo permitido, custa +6 Infecção.`,
    horde_command: hordeCommandPresentation(gameState.boss, intent).instruction,
    rocket_launcher: `Jogo ${payload.meldIndex + 1}: +${payload.infectionCost} Infecção por carta nova.`,
    parasite_regeneration: 'Cura de 100 HP em um zumbi vivo e ferido.',
    viral_reanimation: 'Um cadáver retorna com 50% do HP.',
    omega_outbreak: 'O Surto aumenta a Infecção causada por falhas.',
  }[intent.abilityId] || 'Efeito do Nemesis ativo.';
  const progress = intent.abilityId === 'horde_invasion' ? `${gameState.boss.combatEntities.find((entity) => entity.id === payload.entityId)?.name || ''} · ${payload.entryKind === 'grabber' ? `${payload.exitedCardIds.length}/1 saída` : payload.entryKind === 'infected' ? `${payload.contributionCardIds.length}/2 cartas` : `${(payload.devourerCardIds || []).length}/3 cartas`}`
    : intent.abilityId === 'infectious_tentacle' && current ? payload.playedMarkedCardIds?.length ? 'Marcada jogada · completo' : payload.exitedCardIds?.length ? 'Marcada descartada · parcial' : 'Nenhuma marcada resolvida'
      : payload.required ? `${(payload.exitedCardIds || []).length}/${payload.required} saídas legais`
    : intent.abilityId === 'stars_extermination' ? current
      ? `${payload.directDamage >= payload.requiredDamage ? '✓' : '○'} Dano direto · ${payload.partnerContributed ? '✓' : '○'} Jogo ${payload.partnerMeldIndex + 1}`
      : `${payload.contributed ? '✓' : '○'} Contribuição · ${payload.secondExited ? '✓' : '○'} Segunda carta: ${label(payload.secondCardId)}`
      : intent.abilityId === 'stars_hunt' ? current ? `${payload.directDamage || 0} HP de dano direto` : payload.contributed ? 'Contribuição cumprida' : 'Contribuição pendente' : '';
  const consequence = {
    horde_invasion: 'Sucesso: repele · Falha: zumbi permanece',
    horde_command: hordeCommandPresentation(gameState.boss, intent).consequence,
    parasite_regeneration: 'Cura: até +100 HP',
    viral_reanimation: 'Retorna com 50% do HP',
    rocket_launcher: `Cada carta: +${payload.infectionCost || 0} Infecção`,
    contaminated_zone: 'Lixo: +6 Infecção por retirada',
    omega_outbreak: 'Quanto maior a Infecção, pior a punição',
  }[intent.abilityId] || (offensiveIds.has(intent.abilityId) ? `Falha: +${getNemesisObjectiveOutcome(gameState.boss, intent).applied} Infecção` : '');
  return { instruction, progress: names ? `${names}\n${progress}` : progress, consequence };
}
export const nemesisBossPresentation = Object.freeze({
  id: 'nemesis', feminine: false,
  resourceSoundEvent: (event) => ['infection', 'nemesisObjective'].includes(event?.type) && Number(event.amount) > 0,
  speech: () => '',
  ruleSummary: () => '100 Infecção = derrota imediata. Canastras: Limpa −4, Real −8, Ás-a-Ás −12; evolução só soma a diferença. Toque no zumbi ATIVO ou na arte do Nemesis para escolher o alvo. Dano excedente é perdido. Matar zumbi remove passiva, sem reduzir Infecção. Dano direto muda S.T.A.R.S.',
  actionCategory: (id) => entry(id)?.duration === 'target_turn' ? 'Objetivo do turno' : entry(id)?.duration === 'immediate' ? 'Efeito imediato' : 'Efeito ativo',
  resultCategory: (id) => entry(id) ? 'Ação do Nemesis resolvida' : '',
  finalDanger: (state) => ({ label: 'Infecção final', value: `${state.boss.danger}/100` }),
  compactAction: compact,
  rangeMeters({ gameState, intent } = {}) {
    if (!intent) return null;
    const payload = intent.payload || {};
    // Match other bosses: a range meter explains a graded consequence,
    // not every binary objective or card counter.
    const tentacle = intent.abilityId === 'infectious_tentacle' && payload.objectiveVersion === 2;
    if (intent.abilityId !== 'stars_extermination' && !tentacle) return null;
    const boss = gameState?.boss || { danger: 0, combatEntities: [] };
    const outcome = getNemesisObjectiveOutcome(boss, intent), value = outcome.fulfilled, amount = outcome.applied;
    const projected = base => projectNemesisInfection(boss, base, { failure: base > 0 }).applied;
    return [{ label: tentacle ? 'Carta marcada' : 'Exigências cumpridas', value, max: 2, unit: tentacle ? 'resultado' : 'de 2',
      tone: value === 2 ? 'safe' : value === 1 ? 'warning' : 'danger',
      currentEffect: `+${amount} INFECÇÃO`,
      ariaLabel: `${value} de 2 exigências cumpridas. Punição: +${amount} Infecção.`,
      segments: [
        { from: 0, to: 0, label: tentacle ? 'Nenhuma' : '0 cumpridas', effect: `+${projected(payload.failure ?? 16)} Infecção`, tone: 'danger' },
        { from: 1, to: 1, label: tentacle ? 'Descartada' : '1 cumprida', effect: `+${projected(payload.partialFailure ?? 8)} Infecção`, tone: 'warning' },
        { from: 2, to: 2, label: tentacle ? 'Jogada' : '2 cumpridas', effect: 'sem punição', tone: 'safe' },
      ] }];
  },
  help({ gameState, intent, helpers = {} }) {
    const payload = intent.payload;
    if (intent.abilityId === 'horde_command') return hordeCommandPresentation(gameState.boss, intent).help;
    const target = gameState.players.find((player) => player.id === payload.targetPlayerId)?.name || 'Equipe';
    const current = payload.objectiveVersion === 2;
    const partner = gameState.players.find(player => player.id === payload.partnerPlayerId)?.name || 'O parceiro';
    const labels = [...(payload.cardIds || []), payload.secondCardId].filter(Boolean).map((id) => helpers.cardLabelAnywhere?.(gameState, id) || id).join(' · ');
    if (intent.abilityId === 'horde_invasion') {
      const goal = payload.entryKind === 'grabber' ? `${target}: jogue ou descarte a carta marcada neste turno.` : payload.entryKind === 'infected' ? 'Equipe: adicione 2 cartas legais aos jogos nesta rodada.' : 'Alimente jogos existentes com 3 cartas nesta rodada. Pode ser no mesmo jogo, por um jogador ou pelos dois. Só cartas novas nos jogos que existiam no início; reorganizar não conta.';
      return `${goal}\nCumpra o objetivo para expulsar o zumbi. Se falhar, ele entra na mesa com vida cheia, sem aumentar a Infecção. Enquanto invade, não pode ser atacado nem usa sua passiva. Um zumbi expulso pode tentar invadir novamente.`;
    }
    const goal = {
      stars_hunt: current ? `${target}: cause qualquer dano positivo à vida do Nemesis até o fim do seu turno. Selecione Nemesis como alvo; dano em zumbis não conta. Este alvo S.T.A.R.S. fica fixo até a resolução.` : `${target}: adicione 1 carta legal a um jogo neste turno. Descarte não vale.`,
      infectious_tentacle: current ? `${target}: jogue uma das duas cartas marcadas até o fim do turno para evitar a punição. Se apenas descartar uma, a punição será menor. Deixar as duas na mão custa mais Infecção. A barra mostra os valores com os efeitos ativos.` : `${target}: jogue ou descarte uma das duas cartas marcadas neste turno.`,
      tentacle_barrage: `${target}: jogue ou descarte 2 das 3 marcadas neste turno.`,
      stars_extermination: current ? `Até o fim da rodada: ${target} causa dano direto ao Nemesis; ${partner} adiciona uma carta legal ao Jogo ${payload.partnerMeldIndex + 1}, que já existia no anúncio. Os papéis não mudam. Ambos: sem punição; só um: +8; nenhum: +16 Infecção, mais os bônus ativos uma vez. Zumbis e descarte não cumprem esses objetivos.` : `${target}: adicione 1 carta a um jogo E jogue/descarte a segunda marcada neste turno.`,
      contaminated_zone: `${target}: cada retirada legal do Lixo custa +6 Infecção neste turno. Agarrador continua valendo.`,
      rocket_launcher: `Cada carta nova adicionada à Zona de Impacto custa +${payload.infectionCost || (gameState.boss.phase === 3 ? 12 : 10)} Infecção nesta rodada. Jogar várias juntas soma os custos. Não bloqueia o jogo.`,
      parasite_regeneration: 'Cura 100 HP do zumbi vivo com menor percentual de HP. Não ultrapassa o HP máximo.',
      viral_reanimation: 'Um zumbi derrotado volta com metade da vida; na fase final, volta Mutado. Acontece uma vez por fase, e cada zumbi só pode reviver uma vez na batalha. Zumbis expulsos não são revividos.',
      omega_outbreak: 'Até o fim da próxima rodada, cada falha causa Infecção extra: 2 se a barra estiver abaixo de 50, 4 entre 50 e 74, ou 6 a partir de 75. O Surto não aumenta a barra ao ser anunciado.',
    }[intent.abilityId] || intent.description;
    let composition = '';
    if (offensiveIds.has(intent.abilityId)) {
      const cost = getNemesisObjectiveOutcome(gameState.boss, intent);
      composition = [`Base +${cost.base}`, cost.infectedAmount ? `Infectado${cost.mutated ? ' Mutado' : ''} +${cost.infectedAmount}` : '',
        cost.reinforcedAmount ? `Reforçado +${cost.reinforcedAmount}` : '', cost.omegaAmount ? `Surto Ômega +${cost.omegaAmount}` : '',
        `Total +${cost.applied} Infecção${cost.total > cost.applied ? ' (limite 100)' : ''}`].filter(Boolean).join('\n');
    }
    return `${goal}${labels ? `\nCartas: ${labels}` : ''}${composition ? `\n${composition}` : ''}`;
  },
  details({ gameState, intent, helpers = {} }) {
    if (!intent) return [];
    const fields = [['Regra', intent.description]];
    const entity = gameState.boss.combatEntities.find((item) => item.id === intent.payload.entityId);
    if (entity) fields.push(['Zumbi', entity.status === 'entering' ? `${entity.name}: INVADINDO · cumpra o objetivo para expulsar` : `${entity.name}: ${entity.hp}/${entity.maxHp} HP`]);
    fields.push(['Prazo', intent.duration === 'target_turn' ? 'fim do turno do alvo' : intent.duration === 'immediate' ? 'antes dos jogadores' : 'fim da rodada; Horda/Ômega expiram na rodada seguinte']);
    return helpers.detailFields?.(fields) || fields;
  },
  status({ gameState, mode, helpers = {} }) {
    if (mode !== 'result') return null;
    const event = helpers.flowResultEvent?.(gameState);
    if (event?.type !== 'bossAbility') return null;
    return { category: 'Resultado do Nemesis', name: event.name, speech: '', description: '', details: event.presentation?.details || [], instruction: event.outcome, progress: '', consequence: `Infecção ${gameState.boss.danger}/100` };
  },
});
