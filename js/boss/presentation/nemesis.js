import { nemesisDefinition } from '../bosses/nemesis.js';
const entry = (id) => nemesisDefinition.abilities.find((ability) => ability.id === id);
function compact({ gameState, intent, helpers = {} }) {
  if (!intent) return null;
  const payload = intent.payload || {};
  const target = gameState.players.find((player) => player.id === payload.targetPlayerId)?.name || '';
  const label = (id) => helpers.cardLabelAnywhere?.(gameState, id) || id;
  const names = (payload.cardIds || []).map(label).join(' · ');
  const who = target.slice(0, 16);
  const instruction = {
    horde_invasion: payload.entryKind === 'grabber' ? `${who}: jogue/descarte a carta marcada.` : payload.entryKind === 'infected' ? 'Equipe: contribua 2 cartas nesta rodada.' : 'Equipe: alimente 2 jogos nesta rodada.',
    stars_hunt: `${who}: contribua 1 carta neste turno.`,
    infectious_tentacle: `${who}: jogue/descarte 1 marcada.`,
    tentacle_barrage: `${who}: jogue/descarte 2 marcadas.`,
    stars_extermination: `${who}: contribua E resolva a segunda carta.`,
    contaminated_zone: `${who}: Lixo permitido, custa +6 Infecção.`,
    horde_command: 'Um zumbi reforçado até a próxima rodada.',
    rocket_launcher: `Jogo ${payload.meldIndex + 1}: +${payload.infectionCost} Infecção por carta nova.`,
    parasite_regeneration: 'Cura de 100 HP em um zumbi vivo e ferido.',
    viral_reanimation: 'Um cadáver retorna com 50% do HP.',
    omega_outbreak: 'Falhas futuras recebem +2/+4/+6 Infecção.',
  }[intent.abilityId] || 'Efeito do Nemesis ativo.';
  const progress = intent.abilityId === 'horde_invasion' ? `${gameState.boss.combatEntities.find((entity) => entity.id === payload.entityId)?.name || ''} · ${payload.entryKind === 'grabber' ? `${payload.exitedCardIds.length}/1 saída` : payload.entryKind === 'infected' ? `${payload.contributionCardIds.length}/2 cartas` : `${payload.fedMeldIds.length}/2 jogos`}` : payload.required ? `${(payload.exitedCardIds || []).length}/${payload.required} saídas legais`
    : intent.abilityId === 'stars_extermination' ? `${payload.contributed ? '✓' : '○'} Contribuição · ${payload.secondExited ? '✓' : '○'} Segunda carta: ${label(payload.secondCardId)}`
      : intent.abilityId === 'stars_hunt' ? payload.contributed ? 'Contribuição cumprida' : 'Contribuição pendente' : '';
  const consequence = {
    horde_invasion: 'Sucesso: repele · Falha: zumbi permanece',
    horde_command: '+1 presa · +2 falha · +30 cura',
    parasite_regeneration: 'Cura: até +100 HP',
    viral_reanimation: 'Retorna com 50% do HP',
    rocket_launcher: `Cada carta: +${payload.infectionCost || 0} Infecção`,
    contaminated_zone: 'Lixo: +6 Infecção por retirada',
    omega_outbreak: 'Falhas: +2/+4/+6 conforme Infecção',
    stars_extermination: 'Falhas podem receber bônus do Infectado/Ômega.',
  }[intent.abilityId] || `Falha: +${payload.failure || 6 + gameState.boss.phase * 2} Infecção + bônus`;
  return { instruction, progress: names ? `${names}\n${progress}` : progress, consequence };
}
export const nemesisBossPresentation = Object.freeze({
  id: 'nemesis', feminine: false,
  resourceSoundEvent: (event) => ['infection', 'nemesisObjective'].includes(event?.type) && Number(event.amount) > 0,
  speech: () => '',
  ruleSummary: () => '100 Infecção = derrota imediata. Canastras: Limpa −4, Real −8, Ás-a-Ás −12; evolução só soma a diferença. Toque no zumbi para escolher o alvo; ↩ volta ao Nemesis. Dano excedente é perdido. Matar zumbi remove passiva, sem reduzir Infecção. Dano direto muda S.T.A.R.S.',
  actionCategory: (id) => entry(id)?.duration === 'target_turn' ? 'Objetivo do turno' : entry(id)?.duration === 'immediate' ? 'Efeito imediato' : 'Efeito ativo',
  resultCategory: (id) => entry(id) ? 'Ação do Nemesis resolvida' : '',
  finalDanger: (state) => ({ label: 'Infecção final', value: `${state.boss.danger}/100` }),
  compactAction: compact,
  rangeMeters({ intent } = {}) {
    if (!intent) return null;
    const payload = intent.payload || {};
    // Match other bosses: a range meter explains a graded consequence,
    // not every binary objective or card counter.
    if (intent.abilityId !== 'stars_extermination') return null;
    const value = Number(!!payload.contributed) + Number(!!payload.secondExited);
    const amount = value === 2 ? 0 : value === 1 ? 8 : 16;
    return [{ label: 'Exigências cumpridas', value, max: 2, unit: 'de 2',
      tone: value === 2 ? 'safe' : value === 1 ? 'warning' : 'danger',
      currentEffect: `+${amount} INFECÇÃO BASE`,
      ariaLabel: `${value} de 2 exigências cumpridas. Punição base: +${amount} Infecção.`,
      segments: [
        { from: 0, to: 0, label: '0 cumpridas', effect: '+16 Infecção', tone: 'danger' },
        { from: 1, to: 1, label: '1 cumprida', effect: '+8 Infecção', tone: 'warning' },
        { from: 2, to: 2, label: '2 cumpridas', effect: 'sem punição', tone: 'safe' },
      ] }];
  },
  help({ gameState, intent, helpers = {} }) {
    const payload = intent.payload;
    const target = gameState.players.find((player) => player.id === payload.targetPlayerId)?.name || 'Equipe';
    const labels = [...(payload.cardIds || []), payload.secondCardId].filter(Boolean).map((id) => helpers.cardLabelAnywhere?.(gameState, id) || id).join(' · ');
    if (intent.abilityId === 'horde_invasion') {
      const goal = payload.entryKind === 'grabber' ? `${target}: jogue ou descarte a carta marcada neste turno.` : payload.entryKind === 'infected' ? 'Equipe: adicione 2 cartas legais aos jogos nesta rodada.' : 'Equipe: adicione cartas a 2 jogos diferentes nesta rodada.';
      return `${goal}\nSucesso: expulsa o zumbi. Falha: ele fica ATIVO com HP cheio, sem Infecção extra.\nINVADINDO: sem dano/passiva. Repelido não é cadáver e pode voltar. Teto: 1/2/3 ativos nas fases 1/2/3.`;
    }
    const modifier = 'Falhas: Infectado +2 (+4 Mutado); Horda +2 extra. Ômega soma +2/+4/+6 conforme Infecção <50/50–74/75+. Cada bônus só conta uma vez.';
    const goal = {
      stars_hunt: `${target}: adicione 1 carta legal a um jogo neste turno. Descarte não vale.`,
      infectious_tentacle: `${target}: jogue ou descarte 1 das 2 marcadas neste turno.`,
      tentacle_barrage: `${target}: jogue ou descarte 2 das 3 marcadas neste turno.`,
      stars_extermination: `${target}: adicione 1 carta a um jogo E jogue/descarte a segunda marcada neste turno. Cumprir 2/1/0: +0/+8/+16 Infecção.`,
      contaminated_zone: `${target}: cada retirada legal do Lixo custa +6 Infecção neste turno. Agarrador continua valendo.`,
      horde_command: 'Reforça 1 zumbi até o fim da próxima rodada.\nAgarrador: +1 presa. Infectado: +2 por falha. Devorador: +30 HP de cura.',
      rocket_launcher: `Cada carta nova adicionada à Zona de Impacto custa +${payload.infectionCost || (gameState.boss.phase === 3 ? 12 : 10)} Infecção nesta rodada. Jogar várias juntas soma os custos. Não bloqueia o jogo.`,
      parasite_regeneration: 'Cura 100 HP do zumbi vivo com menor percentual de HP. Não ultrapassa o HP máximo.',
      viral_reanimation: 'Um cadáver volta com 50% do HP; na fase 3, Mutado. Uma vez por fase, respeitando o teto de ativos. Repelidos não voltam por esta habilidade.',
      omega_outbreak: 'Até o fim da próxima rodada: falhas recebem +2/+4/+6 com Infecção <50/50–74/75+. Ativar não aumenta Infecção.',
    }[intent.abilityId] || intent.description;
    const offensive = ['stars_hunt', 'infectious_tentacle', 'tentacle_barrage', 'stars_extermination'].includes(intent.abilityId);
    return `${goal}${labels ? `\nCartas: ${labels}` : ''}${offensive ? `\n${intent.abilityId === 'stars_extermination' ? '' : `Falha: +${payload.failure || 6 + gameState.boss.phase * 2} Infecção. `}${modifier}` : ''}`;
  },
  details({ gameState, intent, helpers = {} }) {
    if (!intent) return [];
    const fields = [['Regra', intent.description]];
    const entity = gameState.boss.combatEntities.find((item) => item.id === intent.payload.entityId);
    if (entity) fields.push(['Zumbi', `${entity.name}: ${entity.hp}/${entity.maxHp} HP`]);
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
