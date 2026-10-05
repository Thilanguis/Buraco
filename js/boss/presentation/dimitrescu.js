const SPEECHES = Object.freeze({
  bela_hunt: 'Bela está entediada. Seja gentil e entretenha minha filha.',
  cassandra_feast: 'Cassandra já escolheu onde servir o jantar. Não a façam esperar.',
  daniela_swarm: 'Daniela encontrou algo no lixo. Ela sempre traz os brinquedos para dentro.',
  blood_tithe: 'Uma casa cheia de convidados… e nenhum deles trouxe um presente para mim.',
  red_wine: 'Ah… isso sim é uma safra digna da casa Dimitrescu.',
  crimson_brand: 'Gosto de saber exatamente a quem cada gota pertence.',
  cassandra_dead_feast: 'Cassandra, minha querida… guarde esse banquete para quando eles estiverem mais famintos.',
  crimson_clot: 'Vocês realmente acharam que meu próprio sangue permitiria que eu caísse tão facilmente?',
  castle_lockdown: 'As portas estão fechadas. Meus convidados só saem quando eu decidir.',
  three_daughters: 'Meninas… nossos convidados começaram a ficar confortáveis demais.',
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
  bela_hunt: 'Caçada resolvida',
  cassandra_feast: 'Banquete resolvido',
  daniela_swarm: 'Enxame resolvido',
  blood_tithe: 'Tributo cobrado',
  red_wine: 'Cura aplicada',
  crimson_brand: 'Marcas resolvidas',
  cassandra_dead_feast: 'Morto profanado',
  crimson_clot: 'Proteção formada',
  castle_lockdown: 'Restrição encerrada',
  three_daughters: 'Caçada conjunta resolvida',
});

const ACTION_CATEGORIES = Object.freeze({
  bela_hunt: 'Objetivo da rodada',
  cassandra_feast: 'Objetivo da rodada',
  daniela_swarm: 'Objetivo da rodada',
  blood_tithe: 'Objetivo da rodada',
  crimson_brand: 'Objetivo da rodada',
  cassandra_dead_feast: 'Efeito natural ativo',
  crimson_clot: 'Efeito natural ativo',
  castle_lockdown: 'Restricao ativa agora',
  three_daughters: 'Objetivo da rodada',
});

export const dimitrescuBossPresentation = Object.freeze({
  id: 'dimitrescu',
  feminine: true,
  ruleSummary(gameState) {
    const limit = Math.max(1, Number(gameState?.boss?.maxDanger || 100));
    return `${limit} de Sede = derrota · Limpa/Real/Ás-a-Ás: −4/−8/−12 Sede.`;
  },
  speech(abilityId, context = {}) {
    const target = dialogueTarget(context);
    if (abilityId === 'bela_hunt' && target) return `Bela está entediada. ${target}… seja gentil e entretenha minha filha.`;
    return SPEECHES[abilityId] || '';
  },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    return { label: 'Sede final', value: `${Number(boss.danger || 0)} / ${Number(boss.maxDanger || 0)}` };
  },

  details({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return [];
    const { playerName = () => '', cardLabel = () => '', cardLabelAnywhere = () => 'carta marcada', detailFields = (entries) => entries } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const objectiveLabel = (objective) => {
      if (objective?.type === 'bela') return `Bela — ${playerName(gameState, objective.targetPlayerId)} usa ${cardLabelAnywhere(gameState, objective.cardId)}`;
      if (objective?.type === 'cassandra') return `Cassandra — alimentar o Jogo ${Number(objective.meldIndex) + 1}`;
      if (objective?.type === 'daniela') return `Daniela — não recolher ${cardLabelAnywhere(gameState, objective.discardCardId)} do lixo`;
      return 'Objetivo das filhas';
    };
    switch (intent.abilityId) {
      case 'bela_hunt': return detailFields([['Filha', 'Bela'], ['Alvo', target], ['Carta', card], ['Prazo', 'fim do turno do alvo'], ['Sucesso', 'Sem punição'], ['Falha', `Sede +${Number(intent.announcedPhase) === 3 ? 16 : 14}`]]);
      case 'cassandra_feast': return detailFields([['Filha', 'Cassandra'], ['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Prazo', 'fim da rodada'], ['Sucesso', 'Sem punição'], ['Falha', `Sede +${Number(intent.announcedPhase) === 3 ? 18 : 16}`]]);
      case 'daniela_swarm': return detailFields([['Filha', 'Daniela'], ['Carta contaminada', cardLabelAnywhere(gameState, payload.discardCardId)], ['Prazo', 'esta rodada'], ['Evitar o lixo', 'Sem punição'], ['Recolher o lixo', `Sede +${Number(intent.announcedPhase) === 3 ? 15 : 12}`]]);
      case 'blood_tithe': {
        const phase = Number(intent.announcedPhase) || 1;
        const medium = phase === 3 ? 6 : 4;
        const heavy = phase === 3 ? 10 : 8;
        const players = (gameState?.players || []).map((player) => {
          const cards = player.hand?.length || 0;
          const amount = cards >= 11 ? heavy : cards >= 8 ? medium : 0;
          return [player.name || 'Jogador', `${cards} carta${cards === 1 ? '' : 's'} → ${amount ? `+${amount} Sede` : 'sem tributo'}`];
        });
        return detailFields([['Cobrança', 'cada jogador é avaliado separadamente no fim da rodada'], ...players, ['0–7 cartas', 'sem efeito'], ['8–10 cartas', `Sede +${medium} por jogador`], ['11+ cartas', `Sede +${heavy} por jogador`]]);
      }
      case 'red_wine': return detailFields([['Requisito', 'Lady ferida e Sede 20+'], ['Cura', `${payload.healAmount || 0} HP`], ['Custo', `${payload.bloodCost || 15} de Sede`]]);
      case 'crimson_brand': return detailFields([...(payload.marks || []).map((mark, index) => [`Marca ${index + 1}`, `${playerName(gameState, mark.playerId)} — ${cardLabelAnywhere(gameState, mark.cardId)}`]), ['Sucesso por marca', 'Sem punição'], ['Falha por marca', `Sede +${Number(intent.announcedPhase) === 3 ? 9 : 7}`]]);
      case 'cassandra_dead_feast': return detailFields([['Filha', 'Cassandra'], ['Alvo', `Morto ${Number(payload.deadIndex) + 1}`], ['Ao tomar', `Sede +${payload.bloodAmount || 0} e cura ${payload.healAmount || 0} HP`], ['Purificação', 'Canastra Real ou Ás-a-Ás: apenas +4 Sede, sem cura']]);
      case 'crimson_clot': return detailFields([['Proteção', `${payload.amount || 0}`], ['Romper', 'Sem punição'], ['Sobreviver', 'metade da proteção restante vira cura']]);
      case 'castle_lockdown': return detailFields([['Duração', 'rodada completa'], ['Restrição', 'ninguém pode pegar o lixo'], ['Compra permitida', 'somente do monte']]);
      case 'three_daughters': return detailFields([...(payload.objectives || []).map((objective, index) => [`Objetivo ${index + 1}`, objectiveLabel(objective)]), ['Cada sucesso', 'Sem punição'], ['Cada falha', 'Sede +8']]);
      default: return detailFields([['Efeito', intent.description || 'habilidade ativa']]);
    }
  },

  compactAction({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '', cardLabel = () => '', cardLabelAnywhere = () => 'carta marcada' } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
    const daughterLabel = (objective) => {
      if (objective?.type === 'bela') return `Bela — ${playerName(gameState, objective.targetPlayerId)} usa ${cardLabelAnywhere(gameState, objective.cardId)}`;
      if (objective?.type === 'cassandra') return `Cassandra — alimentar o Jogo ${Number(objective.meldIndex) + 1}`;
      if (objective?.type === 'daniela') return `Daniela — não recolher ${cardLabelAnywhere(gameState, objective.discardCardId)} do lixo`;
      return 'Objetivo das filhas';
    };
    const multiProgress = (objectives = []) => {
      if (!objectives.length) return 'Objetivos sendo preparados';
      const daughterName = (objective) => objective?.type === 'bela' ? 'Bela' : objective?.type === 'cassandra' ? 'Cassandra' : objective?.type === 'daniela' ? 'Daniela' : 'Objetivo';
      return objectives.map((objective) => {
        const marker = objective.status === 'success' ? '✅' : objective.status === 'failed' ? '✕' : '☐';
        return `${marker} ${daughterName(objective)}`;
      }).join(' · ');
    };
    const brandProgress = () => {
      const marks = payload.marks || [];
      if (!marks.length) return 'Marcas sendo preparadas';
      return marks.map((mark) => {
        const marker = mark.status === 'success' ? '✅' : mark.status === 'failed' ? '✕' : '☐';
        const result = mark.status === 'success' ? ' · removida' : mark.status === 'failed' ? ' · sangrou' : '';
        return `${marker} ${playerName(gameState, mark.playerId)}: ${cardLabelAnywhere(gameState, mark.cardId)}${result}`;
      }).join('\n');
    };
    switch (intent.abilityId) {
      case 'bela_hunt': {
        const completed = payload.used === true;
        return { instruction: completed ? `✅ ${target}: ${card} usada.` : `${target}: use ${card}.`, progress: completed ? '✅ Resolvido' : '🩸 Caçando', consequence: completed ? 'Sem punição' : `Falha: +${Number(intent.announcedPhase) === 3 ? 16 : 14} Sede` };
      }
      case 'cassandra_feast': return { instruction: `Alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: payload.fed ? '✅ Resolvido' : '⬜ Pendente', consequence: payload.fed ? 'Sem punição' : `Falha: +${Number(intent.announcedPhase) === 3 ? 18 : 16} Sede` };
      case 'daniela_swarm': return { instruction: '☣️ Não pegue o Lixo.', progress: payload.triggered ? '❌ Ativado' : '⬜ Seguro', consequence: payload.triggered ? 'Sede aumentou' : `Evitar: sem punição · Pegar +${Number(intent.announcedPhase) === 3 ? 15 : 12} Sede` };
      case 'blood_tithe': {
        const phase = Number(intent.announcedPhase) || 1;
        const medium = phase === 3 ? 6 : 4;
        const heavy = phase === 3 ? 10 : 8;
        const projected = (gameState?.players || []).reduce((sum, player) => {
          const cards = player.hand?.length || 0;
          return sum + (cards >= 11 ? heavy : cards >= 8 ? medium : 0);
        }, 0);
        return { instruction: 'Reduza as duas mãos antes do fim da rodada.', progress: '', consequence: `Previsto: +${projected} Sede` };
      }
      case 'red_wine': return { instruction: `Troca ${payload.bloodCost || 15} Sede por cura.`, progress: `Sede ${gameState?.boss?.danger || 0}/100`, consequence: `Até +${payload.healAmount || 0} HP` };
      case 'crimson_brand': return { instruction: 'Use cada carta marcada em um jogo.', progress: brandProgress(), consequence: `Sucesso: sem punição · Falha +${Number(intent.announcedPhase) === 3 ? 9 : 7} Sede` };
      case 'cassandra_dead_feast': {
        const curse = gameState?.boss?.bloodiedDead;
        const active = curse?.status === 'active';
        return { instruction: `Morto ${Number(payload.deadIndex) + 1} amaldiçoado.`, progress: active ? '🩸 Maldição ativa' : 'Preparado', consequence: `Tomar: +${payload.bloodAmount || 0} Sede · +${payload.healAmount || 0} HP` };
      }
      case 'crimson_clot': {
        const clot = gameState?.boss?.crimsonClot;
        const remaining = clot?.status === 'active' ? Math.max(0, Number(clot.remaining) || 0) : 0;
        const maximum = Math.max(1, Number(clot?.max || payload.amount) || 1);
        return { instruction: 'Quebre o Coágulo.', progress: clot?.status === 'active' ? `🩸 ${remaining}/${maximum}` : 'Preparado', consequence: 'Falha: 50% restante vira cura' };
      }
      case 'castle_lockdown': return { instruction: '🔒 Lixo fechado.', progress: '', consequence: 'Use o Monte' };
      case 'three_daughters': return { instruction: 'Cumpra os 3 objetivos das Filhas.', progress: multiProgress(payload.objectives || []), consequence: 'Falha: +8 Sede por objetivo' };
      default: return null;
    }
  },

  rangeMeters({ gameState, intent } = {}) {
    if (intent?.abilityId !== 'blood_tithe') return null;
    const phase = Number(intent.announcedPhase) || 1;
    const medium = phase === 3 ? 6 : 4;
    const heavy = phase === 3 ? 10 : 8;
    const players = (gameState?.players || []).map((player) => {
      const cards = player.hand?.length || 0;
      const amount = cards >= 11 ? heavy : cards >= 8 ? medium : 0;
      return { label: player.name || 'Jogador', value: cards, amount, tone: cards >= 11 ? 'danger' : cards >= 8 ? 'warning' : 'safe' };
    });
    const maxCards = Math.max(0, ...players.map((player) => player.value));
    const projectedBlood = players.reduce((sum, player) => sum + player.amount, 0);
    const maximum = Math.max(14, maxCards);
    const worstTone = players.some((player) => player.tone === 'danger') ? 'danger' : players.some((player) => player.tone === 'warning') ? 'warning' : 'safe';
    const playerSummary = players.map((player) => `${player.label} ${player.value}`).join(' · ');
    return [{ label: playerSummary || 'Cooperadores', value: maxCards, unit: 'cartas', max: maximum, tone: worstTone, currentEffect: projectedBlood > 0 ? `+${projectedBlood} SEDE` : 'SEM TRIBUTO', ariaLabel: [...players.map((player) => `${player.label}: ${player.value} cartas, ${player.amount > 0 ? `+${player.amount} Sede` : 'sem tributo'}`), `Cobrança projetada: +${projectedBlood} Sede`].join('. '), markers: players.map((player, index) => ({ label: player.label, value: player.value, tone: player.tone, index })), segments: [
      { from: 0, to: 7, label: '0–7', effect: 'sem efeito', tone: 'safe' },
      { from: 8, to: 10, label: '8–10', effect: `+${medium} Sede`, tone: 'warning' },
      { from: 11, to: null, label: '11+', effect: `+${heavy} Sede`, tone: 'danger' },
    ] }];
  },

  help({ gameState, intent, helpers = {} } = {}) {
    if (!intent) return null;
    const { playerName = () => '', cardLabelAnywhere = () => 'carta marcada' } = helpers;
    const payload = intent.payload || {};
    const phase = Number(intent.announcedPhase) || 1;
    switch (intent.abilityId) {
      case 'bela_hunt':
        return `${playerName(gameState, payload.targetPlayerId)}: jogue ${cardLabelAnywhere(gameState, payload.cardId)} legalmente até o fim do seu turno. Descartar não vale. Sucesso: sem punição; falha: +${phase === 3 ? 16 : 14} Sede.`;
      case 'blood_tithe':
        return `No fim da rodada, cada mão é avaliada separadamente. Nesta fase: 0–7 cartas não cobram; 8–10 acrescentam ${phase === 3 ? 6 : 4} de Sede por jogador; 11+ acrescentam ${phase === 3 ? 10 : 8}. O medidor mostra a cobrança projetada.`;
      case 'red_wine':
        return `Vinho Carmesim só entra quando Lady está ferida e possui Sede suficiente. Ela consome ${payload.bloodCost || 15} de Sede para recuperar até ${payload.healAmount || 0} HP; a cura nunca ultrapassa o HP que falta.`;
      case 'crimson_brand':
        return `Cada cooperador recebe uma carta marcada. Cada marca é resolvida separadamente: colocar a carta legalmente em um jogo evita a punição; deixar a carta sem uso até o prazo acrescenta ${phase === 3 ? 9 : 7}.`;
      case 'cassandra_feast':
        return `Adicione 1 carta legal ao Jogo ${Number(payload.meldIndex) + 1} nesta rodada. Sucesso: sem punição; falha: +${phase === 3 ? 18 : 16} Sede.`;
      case 'daniela_swarm':
        return `Daniela contaminou ${cardLabelAnywhere(gameState, payload.discardCardId)} no Lixo. Evitar essa carta durante a rodada não altera a Sede. Recolhê-la acrescenta ${phase === 3 ? 15 : 12}.`;
      case 'cassandra_dead_feast':
        return 'A maldição permanece no próximo Morto até ele ser tomado. Normalmente isso aumenta a Sede e cura Lady. Se a equipe já tiver Canastra Real ou Ás-a-Ás quando conquistar o Morto, ele é purificado: a Sede sobe apenas +4 e a cura é anulada.';
      case 'crimson_clot':
        return 'O Coágulo recebe o dano antes de Lady. Romper toda a proteção evita a cura, sem alterar a Sede. Se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.';
      case 'castle_lockdown':
        return 'Portas do Castelo bloqueia o Lixo durante a rodada inteira. Os jogadores continuam podendo comprar normalmente do Monte; não existe punição extra por usar o Monte.';
      case 'three_daughters': {
        const objectiveLabel = (objective) => {
          if (objective?.type === 'bela') return `Bela: ${playerName(gameState, objective.targetPlayerId)} usa ${cardLabelAnywhere(gameState, objective.cardId)}`;
          if (objective?.type === 'cassandra') return `Cassandra: alimentar o Jogo ${Number(objective.meldIndex) + 1}`;
          if (objective?.type === 'daniela') return `Daniela: não recolher ${cardLabelAnywhere(gameState, objective.discardCardId)} do Lixo`;
          return 'objetivo pendente';
        };
        return `${(payload.objectives || []).map(objectiveLabel).join(' · ')}. Cada falha: +8 Sede. Sucesso evita apenas sua própria punição.`;
      }
      default:
        return null;
    }
  },

  status({ gameState, helpers = {} } = {}) {
    const boss = gameState?.boss;
    if (boss?.id !== 'dimitrescu') return null;
    const { flowResultEvent = () => null, playerName = () => '', detailFields = (entries) => entries, getBossResultCategory = () => '' } = helpers;
    const clot = boss.crimsonClot;
    const event = flowResultEvent(gameState);
    if (event?.type === 'bossAbility' && event.abilityId === 'blood_tithe') {
      const bands = Array.isArray(event.bloodTitheBands) ? event.bloodTitheBands : [];
      const progress = bands.map((entry) => {
        const cards = Number(entry.cards) || 0;
        const amount = Number(entry.amount) || 0;
        const marker = amount > 0 ? '🩸' : '✅';
        return `${marker} ${playerName(gameState, entry.playerId)} — ${cards} carta${cards === 1 ? '' : 's'} → ${amount > 0 ? `+${amount} Sede` : 'sem tributo'}`;
      }).join('\n');
      return { category: getBossResultCategory('blood_tithe'), name: event.name || 'Tributo de Sangue', speech: '', description: '', details: [...(event.presentation?.details || [])], instruction: event.outcome || 'O Tributo de Sangue foi resolvido.', progress, consequence: `Sede atual: ${Number(boss.danger) || 0}/${Number(boss.maxDanger) || 100}` };
    }
    if (clot?.status === 'active') {
      const maximum = Math.max(1, Number(clot.max) || 1);
      const remaining = Math.max(0, Number(clot.remaining) || 0);
      const projectedHeal = Math.floor(remaining / 2);
      return { category: 'Proteção vampírica ativa', name: 'Coágulo Carmesim', speech: '', description: '', details: detailFields([['Proteção restante', `${remaining}/${maximum}`], ['Prazo', `fim da rodada ${boss.roundNumber}`], ['Se romper', 'Sem punição'], ['Se sobreviver', `${projectedHeal} HP de cura com o valor atual`]]), instruction: 'Rompa o Coágulo Carmesim antes do fim da rodada.', progress: `🩸 COÁGULO ${remaining}/${maximum}`, consequence: `Romper: Sem punição · Sobreviver agora: +${projectedHeal} HP` };
    }
    if (event?.type === 'bossHeal' && event.origin === 'Coágulo Carmesim') return { category: 'Proteção convertida em cura', name: 'Coágulo Carmesim', speech: '', description: '', details: detailFields([['Cura aplicada', `+${event.amount || 0} HP`]]), instruction: event.outcome || `O Coágulo sobrevivente restaurou ${event.amount || 0} HP.`, progress: 'Coágulo consumido', consequence: `Lady Dimitrescu recuperou ${event.amount || 0} HP` };
    if (event?.type === 'bloodClot') return { category: 'Proteção encerrada', name: 'Coágulo Carmesim', speech: '', description: '', details: [], instruction: event.outcome || 'O Coágulo Carmesim foi encerrado.', progress: 'Coágulo encerrado', consequence: '' };
    return null;
  },
});
