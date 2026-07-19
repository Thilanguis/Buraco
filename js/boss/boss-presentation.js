import { getBossDefinition } from './boss-registry.js';
import { getRestorativeDewHealing } from './boss-balance.js';

const BANKER_SPEECHES = Object.freeze({
  fixed_interest: 'O prazo acabou. Agora paguem os juros.',
  maintenance_fee: 'Nada e gratis na minha mesa.',
  credit_block: 'Credito negado. O lixo ficou fora do alcance.',
  suit_audit: 'Vamos conferir cada carta dessa conta.',
  pledge: 'Este jogo agora esta sob penhora.',
  compound_interest: 'Quanto mais cartas, maior sera a divida.',
  credit_limit: 'O credito continua aberto. O excesso e que tem preco.',
  discard_surcharge: 'O lixo tambem tem cotacao nesta mesa.',
});

const DOMINATRIX_SPEECHES = Object.freeze({
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

const MATRIARCH_SPEECHES = Object.freeze({
  living_seed: 'Uma semente basta para tomar toda a sua mao.',
  hungry_root: 'Alimentem as raizes, ou elas alimentarao a mim.',
  restorative_dew: 'Cada hesitacao devolve vida ao meu jardim.',
  twin_vines: 'Duas raizes. Voces nao poderao ignorar ambas.',
  graft: 'Agora os seus jogos crescem ligados a minha vontade.',
  discard_pollen: 'Ate o lixo carrega a minha primavera.',
  harvest: 'Quero ver quanto peso suas maos conseguem sustentar.',
  royal_bloom: 'Todo o jardim exige obediencia ao mesmo tempo.',
  emerald_cocoon: 'Antes de me ferirem, terao de romper o casulo.',
  spring_crown: 'Uma unica ameaca carregara o peso da minha coroa.',
});

const RESULT_CATEGORY_BY_ABILITY = Object.freeze({
  fixed_interest: 'Cobranca automatica',
  maintenance_fee: 'Punicao aplicada',
  credit_block: 'Restricao encerrada',
  suit_audit: 'Objetivo resolvido',
  pledge: 'Restricao encerrada',
  compound_interest: 'Cobranca variavel',
  credit_limit: 'Cobranca variavel',
  discard_surcharge: 'Cobranca aplicada',
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
  living_seed: 'Objetivo resolvido',
  hungry_root: 'Objetivo resolvido',
  restorative_dew: 'Cura resolvida',
  twin_vines: 'Objetivos resolvidos',
  graft: 'Objetivo resolvido',
  discard_pollen: 'Objetivo resolvido',
  harvest: 'Colheita resolvida',
  royal_bloom: 'Objetivos resolvidos',
  emerald_cocoon: 'Protecao encerrada',
  spring_crown: 'Efeito encerrado',
});

const PREPARED_CHOICE_ABILITIES = new Set(['break_will', 'final_order']);
const ACTIVE_RESTRICTIONS = new Set(['credit_block', 'pledge', 'collar', 'exposure', 'hands_tied', 'double_collar', 'separation', 'absolute_control', 'interdict']);
const ROUND_OBJECTIVES = new Set(['suit_audit', 'possession', 'iron_etiquette', 'credit_limit', 'discard_surcharge']);
const NATURE_OBJECTIVES = new Set(['living_seed', 'hungry_root', 'restorative_dew', 'twin_vines', 'graft', 'discard_pollen', 'harvest', 'royal_bloom']);
const ACTIVE_NATURE_EFFECTS = new Set(['emerald_cocoon', 'spring_crown']);

function actionCategory(intent) {
  if (intent.abilityId === 'forced_choice') return 'Escolha imediata';
  if (PREPARED_CHOICE_ABILITIES.has(intent.abilityId)) return 'Escolha preparada';
  if (ACTIVE_RESTRICTIONS.has(intent.abilityId)) return 'Restricao ativa agora';
  if (intent.abilityId === 'credit_limit') return 'Cobranca variavel ativa';
  if (intent.abilityId === 'discard_surcharge') return 'Cobranca preparada';
  if (ROUND_OBJECTIVES.has(intent.abilityId)) return 'Objetivo da rodada';
  if (NATURE_OBJECTIVES.has(intent.abilityId)) return 'Ameaca natural ativa';
  if (ACTIVE_NATURE_EFFECTS.has(intent.abilityId)) return 'Efeito natural ativo';
  return 'Efeito no fim da rodada';
}

const playerById = (gameState, id) => gameState.players?.find((player) => player.id === id);
const playerName = (gameState, id) => playerById(gameState, id)?.name || (id == null ? '' : `Jogador ${Number(id) + 1}`);
const cardLabel = (gameState, playerId, cardId) => {
  if (!cardId) return '';
  const card = playerById(gameState, playerId)?.hand?.find((entry) => entry.id === cardId);
  return card ? `${card.rank}${card.suit}` : '';
};
const cardLabels = (gameState, playerId, cardIds = []) => cardIds.map((cardId) => cardLabel(gameState, playerId, cardId)).filter(Boolean);
const chains = (gameState, playerId) => gameState.boss?.chainsByPlayer?.[playerId] || 0;

function cardLabelAnywhere(gameState, cardId) {
  if (!cardId) return 'carta marcada';
  const zones = [
    ...(gameState.players || []).map((player) => player.hand || []),
    ...(gameState.teams || []).flatMap((team) => team.melds || []),
    gameState.discard || [],
    gameState.stock || [],
    ...(gameState.deadPiles || []),
  ];
  const card = zones.flat().find((entry) => entry?.id === cardId);
  return card ? `${card.rank}${card.suit}` : 'carta marcada';
}

function natureThreatsForIntent(gameState, intent) {
  if (!intent?.id) return [];
  return (gameState.boss?.natureThreats || []).filter((threat) => threat.sourceIntentId === intent.id);
}

function objectiveProgress(currentValue, requiredValue, status = 'active', labels = {}) {
  const required = Math.max(1, Number(requiredValue) || 1);
  const current = Math.max(0, Math.min(required, Number(currentValue) || 0));
  const completed = status === 'success' || (status === 'active' && current >= required);
  if (completed) return `✅ ${required}/${required} — ${labels.success || 'Concluído'}`;
  if (status === 'failed') return `❌ ${current}/${required} — ${labels.failed || 'Falhou'}`;
  if (status === 'cancelled') return `— ${current}/${required} — ${labels.cancelled || 'Cancelado'}`;
  return `⬜ ${current}/${required} — ${labels.pending || 'Pendente'}`;
}

function stateProgress(status = 'active', labels = {}) {
  if (status === 'success') return `✅ ${labels.success || 'Concluído'}`;
  if (status === 'failed') return `❌ ${labels.failed || 'Falhou'}`;
  if (status === 'cancelled' || status === 'expired') return `— ${labels.cancelled || 'Cancelado'}`;
  return labels.active || 'Ativo';
}

function groupedObjectiveProgress(threats = []) {
  const required = threats.length;
  if (!required) return 'Aguardando objetivos';
  const completed = threats.filter((threat) => threat.status === 'success').length;
  const active = threats.some((threat) => threat.status === 'active');
  const failed = threats.filter((threat) => threat.status === 'failed').length;
  const cancelled = threats.filter((threat) => threat.status === 'cancelled').length;
  if (active) return objectiveProgress(completed, required, 'active');
  if (completed === required) return objectiveProgress(completed, required, 'success');
  if (failed) return `❌ ${completed}/${required} — ${failed} não concluído${failed === 1 ? '' : 's'}`;
  if (cancelled) return `— ${completed}/${required} — ${cancelled} cancelado${cancelled === 1 ? '' : 's'}`;
  return objectiveProgress(completed, required, 'active');
}

function royalBloomObjectiveLabel(gameState, threat) {
  if (threat.type === 'royal_seed') {
    return `Semente: ${playerName(gameState, threat.targetPlayerId)} deve usar ${cardLabelAnywhere(gameState, threat.cardId)}`;
  }
  if (threat.type === 'royal_root') return `Raiz: adicionar 1 carta legal ao Jogo ${Number(threat.meldIndex) + 1}`;
  if (threat.type === 'royal_pollen') return `Pólen: não recolher ${cardLabelAnywhere(gameState, threat.discardCardId)} do lixo`;
  return 'Objetivo natural';
}

function royalBloomProgress(gameState, intent) {
  const threats = natureThreatsForIntent(gameState, intent);
  if (!threats.length) return 'Objetivos sendo preparados';
  const completed = threats.filter((threat) => threat.status === 'success').length;
  const lines = threats.map((threat) => {
    const marker = threat.status === 'success' ? '☑' : threat.status === 'failed' ? '✕' : threat.status === 'cancelled' ? '—' : '☐';
    const result = threat.status === 'success'
      ? ' · concluído'
      : threat.status === 'failed'
        ? ` · falhou${threat.bloomApplied ? ` (+${threat.bloomApplied} Flor)` : ''}`
        : threat.status === 'cancelled'
          ? ' · cancelado sem efeito'
          : '';
    return `${marker} ${royalBloomObjectiveLabel(gameState, threat)}${result}`;
  });
  return [`${completed}/${threats.length} concluídos`, ...lines].join('\n');
}

function compactNatureProgress(gameState, intent) {
  const threats = natureThreatsForIntent(gameState, intent);
  if (intent.abilityId === 'living_seed') {
    const threat = threats[0];
    return objectiveProgress(threat?.status === 'success' ? 1 : 0, 1, threat?.status || 'active');
  }
  if (intent.abilityId === 'hungry_root') {
    const threat = threats[0];
    if (!threat) return objectiveProgress(0, 1);
    if (threat.strengthened) {
      const current = new Set(threat.contributorPlayerIds || []).size;
      return objectiveProgress(current, threat.requiredContributorCount || 2, threat.status);
    }
    const current = new Set(threat.progressCardIds || []).size;
    return objectiveProgress(threat.status === 'success' ? 1 : current, 1, threat.status);
  }
  if (intent.abilityId === 'twin_vines') {
    return groupedObjectiveProgress(threats);
  }
  if (intent.abilityId === 'royal_bloom') return royalBloomProgress(gameState, intent);
  if (intent.abilityId === 'graft') {
    const threat = threats[0];
    const current = new Set(threat?.fedMeldIds || []).size;
    return objectiveProgress(threat?.status === 'success' ? 2 : current, 2, threat?.status || 'active');
  }
  if (intent.abilityId === 'discard_pollen') {
    const threat = threats[0];
    if (!threat) return 'Lixo ainda não contaminado';
    const contaminatedCard = cardLabelAnywhere(gameState, threat.discardCardId);
    if (threat.status === 'cancelled') return '✅ CARTA EVITADA · sem efeito';
    if (threat.status === 'failed') {
      const effects = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `❌ CARTA CONTAMINADA RECOLHIDA${effects ? ` · ${effects}` : ''}`;
    }
    return `☣️ CARTA CONTAMINADA: ${contaminatedCard} · não recolha a pilha`;
  }
  if (intent.abilityId === 'harvest') {
    const player = playerById(gameState, intent.payload?.targetPlayerId);
    const threat = threats[0];
    const cards = Number.isFinite(Number(threat?.observedHandSize)) ? Number(threat.observedHandSize) : (player?.hand?.length || 0);
    const reductionNeeded = Math.max(0, cards - 7);
    if (threat?.status === 'success') return `✅ COLHEITA EVITADA · terminou com ${cards} carta${cards === 1 ? '' : 's'}`;
    if (threat?.status === 'failed') {
      const result = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `❌ ${cards >= 11 ? 'COLHEITA CRÍTICA' : 'COLHEITA ALIMENTADA'} · terminou com ${cards} cartas${result ? ` · ${result}` : ''}`;
    }
    if (threat?.status === 'cancelled') return `— COLHEITA CANCELADA · ${cards} carta${cards === 1 ? '' : 's'}`;
    if (cards <= 7) return `✅ META ATINGIDA AGORA · ${cards} carta${cards === 1 ? '' : 's'} na mão`;
    return `${cards >= 11 ? '🔴' : '🟡'} ${cards} CARTAS NA MÃO · reduza ${reductionNeeded} para ficar seguro`;
  }
  if (intent.abilityId === 'restorative_dew') {
    const threat = threats[0];
    const current = new Set(threat?.countedCardIds || intent.payload?.countedCardIds || []).size;
    return objectiveProgress(current, 6, threat?.status || 'active', { pending: 'Cura sendo reduzida', failed: 'Cura aplicada' });
  }
  return threats.length ? groupedObjectiveProgress(threats) : '';
}

const CROWN_THREAT_NAMES = Object.freeze({
  seed: 'Semente Viva',
  royal_seed: 'Semente Real',
  root: 'Raiz Faminta',
  twin_root: 'Trepadeira',
  royal_root: 'Raiz Real',
  pollen: 'Polen do Lixo',
  royal_pollen: 'Polen Real',
  graft: 'Enxerto',
  dew: 'Orvalho Restaurador',
  harvest: 'Colheita',
});

function springCrownMarkedThreat(gameState) {
  const boss = gameState.boss;
  const crown = boss?.springCrown;
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown'
    ? boss.currentIntent
    : null;
  const markedThreatId = crown?.markedThreatId || announcedIntent?.payload?.markedThreatId || null;
  return markedThreatId
    ? (boss?.natureThreats || []).find((threat) => threat.id === markedThreatId) || null
    : null;
}

function crownThreatName(gameState) {
  const boss = gameState.boss;
  const crown = boss?.springCrown;
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown'
    ? boss.currentIntent
    : null;
  const threat = springCrownMarkedThreat(gameState);
  return crown?.markedThreatName
    || announcedIntent?.payload?.markedThreatName
    || CROWN_THREAT_NAMES[threat?.type]
    || threat?.name
    || 'Ameaca natural';
}

function crownThreatObjective(gameState, threat) {
  if (!threat) return 'A ameaca marcada nao possui mais um alvo valido.';
  if (['seed', 'royal_seed'].includes(threat.type)) {
    return `${playerName(gameState, threat.targetPlayerId)} deve usar ${cardLabelAnywhere(gameState, threat.cardId)} antes do fim do turno.`;
  }
  if (['pollen', 'royal_pollen'].includes(threat.type)) return `Nao recolher ${cardLabelAnywhere(gameState, threat.discardCardId)} do lixo.`;
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
    return threat.strengthened
      ? `Cada cooperador deve adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.`
      : `Adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.`;
  }
  if (threat.type === 'graft') return 'Adicionar uma carta legal em cada um dos dois jogos ligados.';
  if (threat.type === 'dew') return 'Colocar 6 cartas novas na mesa para zerar a cura preparada.';
  if (threat.type === 'harvest') return `${playerName(gameState, threat.targetPlayerId)} deve terminar o turno com 7 cartas ou menos.`;
  return 'Cumprir a ameaca natural marcada.';
}

function crownThreatProgress(threat) {
  if (!threat) return 'Cancelada sem punicao';
  if (threat.status === 'success') return 'Concluida · Coroa encerrada sem efeito extra';
  if (threat.status === 'failed') return 'Falhou · Raiz Fortalecida preparada';
  if (threat.status === 'cancelled') return 'Cancelada · sem punicao';
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
    const required = threat.strengthened ? threat.requiredContributorCount || 2 : 1;
    const current = threat.strengthened
      ? new Set(threat.contributorPlayerIds || []).size
      : Math.min(1, new Set(threat.progressCardIds || []).size);
    return `${current}/${required} · Pendente`;
  }
  if (threat.type === 'graft') return `${new Set(threat.fedMeldIds || []).size}/2 · Pendente`;
  if (threat.type === 'dew') return `${new Set(threat.countedCardIds || []).size}/6 · Pendente`;
  return 'Pendente';
}

function compactBankerProgress(gameState, intent) {
  const boss = gameState.boss || {};
  const payload = intent.payload || {};
  switch (intent.abilityId) {
    case 'fixed_interest':
      return 'Cobrança no fim da rodada';
    case 'maintenance_fee': {
      const total = Math.max(1, gameState.players?.length || 0);
      const effect = (boss.effects || []).find((entry) => entry.id === 'maintenance_fee' && entry.sourceActionId === intent.id);
      if (effect) {
        const pending = new Set(effect.pendingPlayerIds || []).size;
        return pending ? `Tarifa ativa · ${total - pending}/${total} compras aplicadas` : '✅ Tarifa aplicada aos cooperadores';
      }
      if (boss.lastMaintenanceRound === boss.roundNumber) return '✅ Tarifa aplicada aos cooperadores';
      return `Tarifa preparada · 0/${total} compras aplicadas`;
    }
    case 'credit_block':
      return '🔒 Lixo bloqueado nesta rodada';
    case 'suit_audit':
      return objectiveProgress(payload.progress || 0, payload.required || 1, 'active');
    case 'pledge':
      return `🔒 Jogo ${Number.isInteger(payload.meldIndex) ? Number(payload.meldIndex) + 1 : ''} penhorado`.trim();
    case 'compound_interest':
      return 'Cobrança variável no fim da rodada';
    case 'credit_limit': {
      const limit = boss.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = Math.max(1, limit.allowance || payload.allowance || 1);
      const exceeded = Math.max(0, counted - allowance);
      if (limit.status === 'expired') return `Limite encerrado · ${counted} carta${counted === 1 ? '' : 's'} contabilizada${counted === 1 ? '' : 's'}`;
      return exceeded ? `⚠ Uso ${counted}/${allowance} · ${exceeded} excedente${exceeded === 1 ? '' : 's'}` : `Uso ${counted}/${allowance} · dentro do limite`;
    }
    case 'discard_surcharge': {
      const surcharge = boss.discardSurcharge || payload;
      if (surcharge.status === 'consumed') return '✅ Cobrança aplicada na retirada do lixo';
      if (surcharge.status === 'expired') return '— Encerrado sem retirada do lixo';
      return '🪙 Ágio ativo · aguardando retirada do lixo';
    }
    default:
      return '';
  }
}

const detailFields = (entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`);

function dominatrixDetails(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
  const possession = (gameState.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
  const contributors = (possession?.contributorPlayerIds || []).map((playerId) => playerName(gameState, playerId));

  switch (intent.abilityId) {
    case 'collar':
      return detailFields([
        ['Alvo', target],
        [collarCards.length > 1 ? 'Cartas' : 'Carta', collarCards.join(' e ')],
        ['Duracao', 'ate o fim do turno do alvo'],
        ['Restricao', 'nao pode jogar nem descartar'],
      ]);
    case 'forced_choice':
      return detailFields([
        ['Alvo', target],
        ['Resolucao', 'imediatamente apos o anuncio'],
        ['Escolha', `receber 1 Chicote ou aceitar: ${payload.order?.label || 'uma ordem valida para o proximo turno'}`],
      ]);
    case 'exposure':
      return detailFields([
        ['Alvo', target],
        ['Carta', card],
        ['Duracao', 'ate o fim do turno do alvo'],
        ['Obrigacao', 'baixar ou adicionar a um jogo'],
        ['Falha', '1 Chicote se permanecer na mao'],
      ]);
    case 'forced_swap':
      return detailFields([
        ['Alvos', 'os dois cooperadores'],
        ['Cartas', 'uma carta de cada mao'],
        ['Efeito', 'a troca acontece depois deste anuncio'],
      ]);
    case 'hands_tied':
      return detailFields([
        ['Alvos', 'equipe inteira'],
        ['Duracao', 'rodada completa'],
        ['Criacao compartilhada', payload.teamMeldAvailable === false ? 'consumida' : 'disponivel'],
        ['Consumida por', playerName(gameState, payload.consumedByPlayerId)],
        ['Restricao', 'a equipe pode criar somente 1 jogo novo'],
      ]);
    case 'possession':
      return detailFields([
        ['Jogo', `#${Number(payload.meldIndex) + 1}`],
        ['Contribuicoes', contributors.length ? contributors.join(' e ') : 'nenhum cooperador'],
        ['Progresso', `${contributors.length}/${possession?.required || gameState.players?.length || 2}`],
        ['Duracao', 'ate romper a Posse'],
        ['Restricao', 'o dano do jogo permanece suspenso'],
        ['Encerramento', 'uma contribuicao de cada jogador ou evolucao de tier'],
      ]);
    case 'favorite':
      return detailFields([
        ['Protegido', playerName(gameState, payload.protectedPlayerId)],
        ['Punido', playerName(gameState, payload.punishedPlayerId)],
        ['Chicotes do punido', `${chains(gameState, payload.punishedPlayerId)}/4`],
        ['Efeito', 'protecao e 1 Chicote depois deste anuncio'],
      ]);
    case 'double_collar':
      return detailFields([
        ['Alvos', (payload.lockedCards || []).map((entry) => `${playerName(gameState, entry.playerId)}: ${cardLabel(gameState, entry.playerId, entry.cardId)}`).join('; ')],
        ['Duracao', 'rodada completa'],
        ['Restricao', 'nao pode jogar nem descartar as cartas presas'],
      ]);
    case 'separation':
      return detailFields([
        ['Alvos', 'os dois cooperadores'],
        ['Duracao', 'rodada completa'],
        ['Restricao', 'cada jogo so pode ser alimentado por um cooperador'],
      ]);
    case 'absolute_control':
      return detailFields([
        ['Alvo', target],
        ['Duracao', 'turno do jogador alvo'],
        ['Restricao', 'nao pode criar jogos novos'],
        ['Encerramento', 'o alvo concluir o turno'],
      ]);
    case 'break_will':
      return detailFields([
        ['Alvo', target],
        ['Chicotes', `${chains(gameState, payload.targetPlayerId)}/4`],
        ['Resolucao', 'ao final da rodada'],
        ['Escolha', 'receber 1 Chicote ou retirar carta de canastra'],
      ]);
    case 'final_order':
      return detailFields([
        ['Alvos', 'os dois cooperadores'],
        ['Resolucao', 'ao final da rodada'],
        ['Escolha', 'cada jogador recebera uma decisao individual'],
      ]);
    case 'iron_etiquette':
      return detailFields([
        ['Alvo', target],
        ['Ordem', `descartar ${payload.suitLabel}`],
        ['Prazo', 'fim do proximo turno do alvo'],
        ['Desobediencia', '+1 Chicote'],
      ]);
    case 'interdict':
      return detailFields([
        ['Jogo', `#${Number(payload.meldIndex) + 1}`],
        ['Gatilho', 'primeira tentativa valida de evolucao'],
        ['Obedecer', 'cancelar somente a tentativa'],
        ['Desobedecer', 'evoluir e receber +1 Chicote'],
        ['Duracao', 'esta rodada'],
      ]);
    default:
      return detailFields([
        ['Duracao', 'rodada completa'],
        ['Efeito', intent.description || 'ordem ativa'],
      ]);
  }
}

function matriarchDetails(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const meldLabel = (index) => (Number.isInteger(index) ? `Jogo #${index + 1}` : '');
  switch (intent.abilityId) {
    case 'living_seed':
      return detailFields([
        ['Alvo', target],
        ['Carta', card],
        ['Prazo', 'fim do proximo turno do alvo'],
        ['Falha', '+1 Flor, sem cura'],
      ]);
    case 'hungry_root':
      return detailFields([
        ['Jogo', meldLabel(payload.meldIndex)],
        ['Prazo', 'fim da rodada'],
        ['Objetivo', 'adicionar 1 carta legal'],
        ['Falha', '+1 Flor, sem cura, e pode propagar uma Raiz'],
      ]);
    case 'restorative_dew': {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
      const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState.boss?.phase || 1;
      return detailFields([
        ['Cartas contabilizadas', `${Math.min(counted, 6)}/6`],
        ['Cura prevista', `${getRestorativeDewHealing(phase, counted)} HP`],
        ['Faixas', '0-1 / 2-3 / 4-5 / 6+ cartas'],
        ['Prazo', 'fim da rodada'],
      ]);
    }
    case 'twin_vines':
      return detailFields([
        ['Jogos', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')],
        ['Objetivo', 'alimentar cada jogo separadamente'],
        ['Falha por raiz', '+1 Flor, sem cura'],
        ['Falha dupla', 'pode propagar uma Raiz'],
      ]);
    case 'graft':
      return detailFields([
        ['Jogos ligados', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')],
        ['Objetivo', 'adicionar 1 carta em cada jogo'],
        ['Falha parcial', '+1 Flor, sem cura'],
        ['Falha total', '+2 Flores, sem cura, e pode propagar uma Raiz'],
      ]);
    case 'discard_pollen':
      return detailFields([
        [
          'Carta',
          gameState.discard?.find((entry) => entry.id === payload.discardCardId)
            ? `${gameState.discard.find((entry) => entry.id === payload.discardCardId).rank}${gameState.discard.find((entry) => entry.id === payload.discardCardId).suit}`
            : 'topo do lixo',
        ],
        ['Gatilho', 'pegar a carta contaminada do lixo'],
        ['Consequência imediata', '+1 Flor e cura de até 40 HP'],
      ]);
    case 'harvest':
      return detailFields([
        ['Alvo', target],
        ['Meta', 'terminar o turno com 7 cartas ou menos'],
        ['8–10 cartas ao final', 'Matriarca cura 60 HP'],
        ['11+ cartas ao final', 'Matriarca ganha +1 Flor e cura 100 HP'],
      ]);
    case 'royal_bloom': {
      const threats = natureThreatsForIntent(gameState, intent);
      const objectives = threats.length ? threats : (payload.objectives || []).map((objective) => ({
        ...objective,
        type: objective.type === 'seed' ? 'royal_seed' : objective.type === 'root' ? 'royal_root' : 'royal_pollen',
      }));
      return detailFields([
        ...objectives.map((objective, index) => [`Objetivo ${index + 1}`, royalBloomObjectiveLabel(gameState, objective)]),
        ['Falha por objetivo', '+1 Flor, sem cura'],
        ['Raiz falha', 'pode solicitar uma propagacao'],
      ]);
    }
    case 'emerald_cocoon':
      return detailFields([
        ['Casulo', `${payload.amount || 180} de absorcao`],
        ['Ruptura', 'canastra limpa ou superior'],
        ['Fim da rodada', 'cura metade do valor restante'],
      ]);
    case 'spring_crown': {
      const threat = springCrownMarkedThreat(gameState);
      return detailFields([
        ['A Coroa marcou', crownThreatName(gameState)],
        ['Objetivo', crownThreatObjective(gameState, threat)],
        ['Progresso', crownThreatProgress(threat)],
        ['Se cumprir', 'a Coroa termina sem efeito extra'],
        ['Se falhar', 'Raiz Fortalecida na proxima rodada'],
        ['Se for cancelada', 'a Coroa termina sem punicao'],
      ]);
    }
    default:
      return detailFields([['Efeito', intent.description || 'ameaca natural ativa']]);
  }
}

function compactAction(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
  switch (intent.abilityId) {
    case 'fixed_interest':
      return {
        instruction: `Contrato ${payload.contractTier || 'Padrao'}: ao fim da rodada, pague tudo ou deixe uma garantia.`,
        progress: compactBankerProgress(gameState, intent),
        consequence: `Integral: +${payload.fullDebt ?? payload.amount} · Garantia: +${payload.guaranteedDebt ?? payload.collateralAmount}`,
      };
    case 'maintenance_fee':
      return { instruction: `Cada jogador comprara +${payload.extraDraw} carta(s).`, progress: compactBankerProgress(gameState, intent), consequence: 'Compra extra inevitavel' };
    case 'credit_block':
      return { instruction: 'O lixo esta bloqueado nesta rodada.', progress: compactBankerProgress(gameState, intent), consequence: 'Encerra na virada da rodada' };
    case 'suit_audit':
      return { instruction: `Joguem ${payload.required} cartas de ${payload.suitLabel}.`, progress: compactBankerProgress(gameState, intent), consequence: `Sucesso: ${payload.successDelta} | Falha: +${payload.failureDelta}` };
    case 'pledge':
      return { instruction: `Jogo ${Number(payload.meldIndex) + 1} nao pode receber cartas.`, progress: compactBankerProgress(gameState, intent), consequence: 'Libera ao fim da cobranca' };
    case 'compound_interest': {
      const total = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      return { instruction: `${total} cartas nas maos.`, progress: compactBankerProgress(gameState, intent), consequence: `Estimativa: +${Math.min(12, 4 + Math.floor(total / 4))} de Divida` };
    }
    case 'credit_limit': {
      const limit = gameState.boss?.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = limit.allowance || payload.allowance || 0;
      return {
        instruction: `A equipe possui franquia de ${allowance} cartas novas na mesa.`,
        progress: compactBankerProgress(gameState, intent),
        consequence: `Cobranca acumulada: ${limit.chargedDebt || 0}/${limit.maxCharge || payload.maxCharge || 0} · excedente: +${limit.debtPerCard || 1}`,
      };
    }
    case 'discard_surcharge':
      return { instruction: `A primeira retirada valida do lixo custa Divida +${payload.amount}.`, progress: compactBankerProgress(gameState, intent), consequence: 'O jogador pode desistir e comprar do monte' };
    case 'collar':
      return { instruction: `${target} nao pode jogar nem descartar ${collarCards.join(' e ')} ate o fim do turno.`, progress: '', consequence: '' };
    case 'exposure': {
      const targetPlayer = playerById(gameState, payload.targetPlayerId);
      const completed = !targetPlayer?.hand?.some((entry) => entry.id === payload.cardId);

      const exposedCard = card || 'a carta exposta';

      return {
        instruction: completed ? `✅ ${target} usou ${exposedCard}.` : `${target} precisa usar ${exposedCard} neste turno.`,
        progress: completed ? '✅ 1/1 — Concluído' : '⬜ 0/1 — Pendente',
        consequence: completed ? 'Nenhum Chicote será aplicado' : 'Se permanecer na mão, recebe 1 Chicote',
      };
    }
    case 'forced_choice':
      return { instruction: `${target} devera escolher agora entre receber 1 Chicote ou aceitar: ${payload.order?.label || 'uma ordem valida para o proximo turno'}.`, progress: '', consequence: 'A partida aguarda a decisao' };
    case 'forced_swap':
      return { instruction: 'Uma carta de cada cooperador sera trocada depois deste anuncio.', progress: '', consequence: 'Controles bloqueados ate o resultado' };
    case 'possession': {
      const possession = (gameState.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
      return {
        instruction: `Jogo ${Number(payload.meldIndex) + 1} mantem o dano suspenso. Cada cooperador deve contribuir, ou o jogo precisa evoluir.`,
        progress: `${possession?.contributorPlayerIds?.length || 0}/${possession?.required || gameState.players?.length || 2}`,
        consequence: 'Permanece ate coordenacao ou evolucao',
      };
    }
    case 'absolute_control':
      return { instruction: `${target} nao pode criar jogos novos.`, progress: '', consequence: 'Ate concluir o turno' };
    case 'double_collar':
      return { instruction: 'Uma carta de cada cooperador esta presa.', progress: '', consequence: 'Dura a rodada completa' };
    case 'separation':
      return { instruction: 'Cada jogo so pode ser alimentado por um cooperador.', progress: '', consequence: 'Dura a rodada completa' };
    case 'hands_tied': {
      const consumed = payload.teamMeldAvailable === false;
      const consumedBy = payload.consumedByPlayerId == null ? null : playerName(gameState, payload.consumedByPlayerId);

      if (consumed) {
        return {
          instruction: `${consumedBy || 'A equipe'} criou o único jogo novo permitido nesta rodada.`,
          progress: `✅ 1/1 — Jogo novo criado${consumedBy ? ` por ${consumedBy}` : ''}`,
          consequence: 'Agora a equipe só pode alimentar jogos que já existem',
        };
      }

      return {
        instruction: 'A equipe pode criar somente um jogo novo nesta rodada.',
        progress: '⬜ 0/1 — Jogo novo disponível',
        consequence: 'Depois da criação, somente jogos existentes poderão ser alimentados',
      };
    }
    case 'favorite':
      return { instruction: `${playerName(gameState, payload.protectedPlayerId)} sera protegida; ${playerName(gameState, payload.punishedPlayerId)} recebera 1 Chicote.`, progress: '', consequence: 'Aplicado depois deste anuncio' };
    case 'break_will':
      return { instruction: `Ao final da rodada, ${target} devera escolher sua punicao.`, progress: '', consequence: 'Chicote ou retirada de canastra' };
    case 'final_order':
      return { instruction: 'Ao final da rodada, cada cooperador devera cumprir uma escolha.', progress: '', consequence: '' };
    case 'iron_etiquette':
      return {
        instruction: `${target} deve encerrar o próximo turno descartando ${payload.suitLabel}.`,
        progress: '⬜ 0/1 — Pendente',
        consequence: 'Outro naipe enquanto houver opção válida: +1 Chicote',
      };
    case 'interdict':
      return {
        instruction: `O Jogo ${Number(payload.meldIndex) + 1} está marcado. Evoluir significa mudar a categoria da canastra, por exemplo de Limpa para Real — apenas adicionar uma carta e continuar Limpa não ativa o Interdito.`,
        progress: '',
        consequence: 'Ao evoluir: obedecer cancela a tentativa; desobedecer conclui a evolução e aplica +1 Chicote',
      };
    case 'living_seed':
      return { instruction: `${target} precisa usar ${card} no proximo turno.`, progress: compactNatureProgress(gameState, intent), consequence: 'Falha: +1 Flor, sem cura' };
    case 'hungry_root':
      return { instruction: `Adicione uma carta legal ao jogo ${Number(payload.meldIndex) + 1}.`, progress: compactNatureProgress(gameState, intent), consequence: 'Falha: +1 Flor e pode propagar uma Raiz' };
    case 'restorative_dew': {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
      const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState.boss?.phase || 1;
      const healing = getRestorativeDewHealing(phase, counted);
      return { instruction: 'Cada carta nova na mesa atravessa uma faixa e reduz a cura preparada.', progress: compactNatureProgress(gameState, intent), consequence: `Cura prevista: ${healing} HP` };
    }
    case 'twin_vines':
      return { instruction: `Alimente ${payload.targetCount || payload.targets?.length || 0} jogo(s), cada um separadamente.`, progress: compactNatureProgress(gameState, intent), consequence: 'Cada raiz falha: +1 Flor, sem cura' };
    case 'graft':
      return { instruction: 'Adicione uma carta legal em cada um dos dois jogos ligados.', progress: compactNatureProgress(gameState, intent), consequence: '0 lados: +2 Flores e pode propagar · 1 lado: +1 Flor' };
    case 'discard_pollen': {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const contaminatedCard = cardLabelAnywhere(gameState, threat?.discardCardId || payload.discardCardId);
      return {
        instruction: `A carta ${contaminatedCard} foi contaminada. Não recolha a pilha enquanto ela estiver no lixo.`,
        progress: compactNatureProgress(gameState, intent),
        consequence: 'Se essa carta vier junto na retirada: +1 Flor e cura de até 40 HP',
      };
    }
    case 'harvest':
      return {
        instruction: `${target}: termine o turno com no máximo 7 cartas na mão.`,
        progress: compactNatureProgress(gameState, intent),
        consequence: '8–10 ao final: cura 60 HP · 11+ ao final: +1 Flor e cura 100 HP',
      };
    case 'royal_bloom':
      return { instruction: `Cumpra ${payload.targetCount || payload.objectives?.length || 0} objetivos independentes.`, progress: compactNatureProgress(gameState, intent), consequence: 'Cada falha: +1 Flor, sem cura' };
    case 'emerald_cocoon': {
      const boss = gameState.boss;
      const cocoon = boss?.emeraldCocoon;
      const amount = payload.amount || 180;
      const events = boss?.eventLog || [];
      const activationActionId = intent.immediateEventActionId;
      let activationIndex = activationActionId
        ? events.findIndex((entry) => entry.actionId === activationActionId)
        : -1;

      if (activationIndex < 0) {
        activationIndex = events.findLastIndex?.((entry) => (
          entry.type === 'bossAbility' && entry.abilityId === 'emerald_cocoon'
        )) ?? -1;
      }

      const eventsAfterActivation = activationIndex >= 0
        ? events.slice(activationIndex + 1)
        : events.slice(-1);
      const breakEvent = [...eventsAfterActivation].reverse().find((entry) => (
        entry.type === 'bossDamage' && entry.cocoonBroken
      ));
      const wasBroken = cocoon?.status === 'broken' || Boolean(breakEvent);
      const absorbed = Math.max(0, amount - (cocoon?.remaining ?? (wasBroken ? 0 : amount)));

      const progress = wasBroken
        ? '💥 Casulo rompido · proteção encerrada'
        : cocoon?.status === 'expired'
          ? `— Casulo encerrado · ${absorbed} de dano absorvido`
          : cocoon?.status === 'active'
            ? `Proteção ativa · ${cocoon.remaining}/${amount}`
            : '— Casulo encerrado';

      return {
        instruction: 'Dano comum é absorvido pelo Casulo.',
        progress,
        consequence: wasBroken
          ? 'A proteção não absorve mais dano'
          : 'Canastra limpa ou superior rompe e causa dano total',
      };
    }
    case 'spring_crown': {
      const crown = gameState.boss?.springCrown;
      const threat = springCrownMarkedThreat(gameState);
      const name = crownThreatName(gameState);
      const progress = crown?.status === 'root_prepared'
        ? `${name} falhou · Raiz Fortalecida preparada`
        : crown?.status === 'root_active'
          ? 'Raiz Fortalecida ativa · a Coroa permanece fortalecida'
          : crown?.status === 'completed'
            ? `${name} concluida · Coroa encerrada sem efeito extra`
            : crown?.status === 'cancelled'
              ? `${name} cancelada · sem punicao`
              : crownThreatProgress(threat);
      const consequence = crown?.status === 'root_active'
        ? 'Raiz Fortalecida ativa'
        : crown?.status === 'root_prepared'
          ? 'Raiz Fortalecida preparada para a próxima rodada'
          : crown?.status === 'completed'
            ? 'Sem efeito extra'
            : crown?.status === 'cancelled'
              ? 'Sem punição'
              : 'Não cumprir: Raiz Fortalecida na próxima rodada';
      return {
        instruction: `A Coroa marcou: ${name}. ${crownThreatObjective(gameState, threat)}`,
        progress,
        consequence,
      };
    }
    default:
      return { instruction: intent.description || 'Habilidade ativa.', progress: '', consequence: '' };
  }
}

function exposureResultPresentation(gameState) {
  const boss = gameState?.boss;

  if (boss?.id !== 'dominadora') return null;

  const flowEventId = boss.bossFlow?.stage === 'result' ? boss.bossFlow.eventActionId : null;

  const event = flowEventId ? (boss.eventLog || []).find((entry) => entry.actionId === flowEventId) : boss.lastEvent;

  if (event?.type !== 'bossAbility' || event.abilityId !== 'exposure' || typeof event.exposureSuccess !== 'boolean') {
    return null;
  }

  const target = playerName(gameState, event.targetPlayerId);

  const cardInHands = (gameState.players || []).flatMap((player) => player.hand || []).find((entry) => entry.id === event.cardId);

  const cardOnTable = (gameState.teams || [])
    .flatMap((team) => team.melds || [])
    .flat()
    .find((entry) => entry.id === event.cardId);

  const exposedCard = cardInHands || cardOnTable;
  const exposedCardLabel = exposedCard ? `${exposedCard.rank}${exposedCard.suit}` : 'a carta exposta';

  if (event.exposureSuccess) {
    return {
      category: 'Objetivo concluído',
      name: 'Exposição',
      speech: '',
      description: '',
      details: detailFields([
        ['Alvo', target],
        ['Carta', exposedCardLabel],
      ]),
      instruction: `✅ ${target} usou ${exposedCardLabel}.`,
      progress: '✅ 1/1 — Concluído',
      consequence: 'Nenhum Chicote aplicado',
    };
  }

  return {
    category: 'Objetivo não concluído',
    name: 'Exposição',
    speech: '',
    description: '',
    details: detailFields([
      ['Alvo', target],
      ['Carta', exposedCardLabel],
    ]),
    instruction: `❌ ${target} terminou o turno sem usar ${exposedCardLabel}.`,
    progress: '❌ 0/1 — Falhou',
    consequence: '+1 Chicote',
  };
}

function possessionPresentation(gameState) {
  const boss = gameState?.boss;

  if (boss?.id !== 'dominadora') return null;

  const possession = [...(boss.possessions || [])].reverse()[0];

  if (possession) {
    const contributors = new Set(possession.contributorPlayerIds || []);

    const required = Math.max(1, Number(possession.required) || gameState.players?.length || 2);

    const playerProgress = (gameState.players || []).slice(0, required).map((player) => (contributors.has(player.id) ? `✅ ${player.name}` : `⬜ ${player.name}`));

    const current = Math.min(contributors.size, required);

    return {
      category: 'Objetivo ativo',
      name: 'Posse',
      speech: '',
      description: '',
      details: detailFields([
        ['Jogo', `#${Number(possession.meldIndex) + 1}`],
        ['Dano suspenso', `${possession.suppressedDamage || 0}`],
        ['Progresso', `${current}/${required}`],
      ]),
      instruction: `O Jogo ${Number(possession.meldIndex) + 1} está possuído. ` + 'Cada cooperador precisa adicionar uma carta, ou o jogo precisa evoluir.',
      progress: `${playerProgress.join(' · ')} · ${current}/${required}`,
      consequence: 'A Posse termina com uma contribuição de cada jogador ou com evolução de tier',
    };
  }

  const releaseEvent = boss.lastEvent?.type === 'possessionReleased' ? boss.lastEvent : null;

  if (!releaseEvent) return null;

  return {
    category: 'Objetivo concluído',
    name: 'Posse',
    speech: '',
    description: '',
    details: detailFields([
      ['Jogo', `#${Number(releaseEvent.meldIndex) + 1}`],
      ['Dano restaurado', `${releaseEvent.reappliedDamage || 0}`],
    ]),
    instruction: `✅ A equipe rompeu a Posse do Jogo ${Number(releaseEvent.meldIndex) + 1}.`,
    progress: '✅ Posse rompida — Concluído',
    consequence: `${releaseEvent.reappliedDamage || 0} de dano suspenso foram reaplicados`,
  };
}

function ironEtiquetteOrderPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'dominadora') return null;

  const orders = [...(boss.activeOrders || [])].reverse();
  const currentIntentOrderId = boss.currentIntent?.abilityId === 'iron_etiquette'
    ? `etiquette_${boss.currentIntent.id}`
    : null;

  // Durante a rodada, o currentIntent da Etiqueta continua ativo mesmo depois
  // de o descarte resolver a ordem. Por isso, priorizamos a ordem ligada ao
  // intent atual, independentemente de ela estar ativa, obedecida ou falhada.
  const currentIntentOrder = currentIntentOrderId
    ? orders.find((order) => order.id === currentIntentOrderId && order.type === 'discard_suit')
    : null;

  const activeOrder = orders.find((order) => order.type === 'discard_suit' && order.status === 'active');

  // Um resultado resolvido só pode continuar visível enquanto ele ainda for
  // o último evento da partida e nenhuma nova habilidade estiver ativa.
  // Consultar o eventLog inteiro fazia uma Etiqueta antiga reaparecer sobre
  // os resultados das habilidades seguintes.
  const latestResolvedEvent = !boss.currentIntent
    && boss.lastEvent?.type === 'dominatrixOrder'
    && boss.lastEvent?.orderType === 'discard_suit'
    ? boss.lastEvent
    : null;

  const resolvedOrder = latestResolvedEvent
    ? orders.find((entry) => entry.id === latestResolvedEvent.orderId && entry.type === 'discard_suit' && entry.status !== 'active')
    : null;

  const order = currentIntentOrder || activeOrder || resolvedOrder;

  if (!order) return null;

  const target = playerName(gameState, order.targetPlayerId);
  const suit = order.suitLabel || order.suit || 'o naipe ordenado';

  const base = {
    category: order.status === 'active' ? 'Objetivo ativo' : 'Objetivo resolvido',
    name: 'Etiqueta de Ferro',
    speech: '',
    description: '',
    details: detailFields([
      ['Alvo', target],
      ['Ordem', `descartar ${suit}`],
      ['Prazo', 'fim do turno do alvo'],
    ]),
  };

  if (order.status === 'active') {
    return {
      ...base,
      instruction: `${target} deve encerrar o turno descartando ${suit}.`,
      progress: '⬜ 0/1 — Pendente',
      consequence: 'Outro naipe enquanto houver opção válida: +1 Chicote',
    };
  }

  if (order.status === 'obeyed') {
    return {
      ...base,
      instruction: `✅ ${target} cumpriu a Etiqueta de Ferro.`,
      progress: '✅ 1/1 — Concluído',
      consequence: 'Nenhum Chicote aplicado',
    };
  }

  if (order.status === 'disobeyed') {
    return {
      ...base,
      instruction: `❌ ${target} desobedeceu à Etiqueta de Ferro.`,
      progress: '❌ 0/1 — Falhou',
      consequence: '+1 Chicote',
    };
  }

  return {
    ...base,
    instruction: 'A Etiqueta de Ferro foi cancelada porque o objetivo deixou de ser possível.',
    progress: 'Cancelado',
    consequence: 'Nenhum Chicote aplicado',
  };
}

function interdictPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'dominadora') return null;

  const interdicts = [...(boss.interdicts || [])].reverse();
  const currentIntent = boss.currentIntent?.abilityId === 'interdict'
    ? boss.currentIntent
    : null;
  const currentInterdictId = currentIntent ? `interdict_${currentIntent.id}` : null;
  const currentInterdict = currentInterdictId
    ? interdicts.find((entry) => entry.id === currentInterdictId)
    : null;
  const activeInterdict = interdicts.find((entry) => entry.status === 'active');

  const latestEvent = [...(boss.eventLog || [])]
    .reverse()
    .find((event) => ['interdictDecision', 'interdictExpired'].includes(event.type));
  const resolvedInterdict = latestEvent
    ? interdicts.find((entry) => entry.id === latestEvent.interdictId)
    : null;

  const interdict = currentInterdict || activeInterdict || resolvedInterdict;
  if (!interdict) return null;

  const gameNumber = Number(interdict.meldIndex) + 1;
  const base = {
    category: interdict.status === 'active' ? 'Restrição ativa agora' : 'Restrição resolvida',
    name: 'Interdito',
    speech: '',
    description: '',
    details: detailFields([
      ['Jogo marcado', `#${gameNumber}`],
      ['Gatilho', 'mudar o tier da canastra'],
      ['Exemplo', 'Limpa → Real'],
      ['Prazo', 'fim da rodada'],
    ]),
  };

  if (interdict.status === 'active') {
    return {
      ...base,
      instruction: `O Jogo ${gameNumber} está marcado. Apenas a jogada que transformar a canastra em um tier superior ativa a escolha; adicionar cartas e continuar no mesmo tipo não conta.`,
      progress: '',
      consequence: 'Obedecer: cancelar só a tentativa · Desobedecer: evoluir e terminar com +1 Chicote; esta evolução não concede Resistência',
    };
  }

  if (interdict.status === 'obeyed') {
    return {
      ...base,
      instruction: `✅ O Interdito do Jogo ${gameNumber} foi obedecido.`,
      progress: 'Evolução cancelada',
      consequence: 'A canastra não evoluiu e nenhum Chicote foi aplicado',
    };
  }

  if (interdict.status === 'disobeyed') {
    return {
      ...base,
      instruction: `❌ O Interdito do Jogo ${gameNumber} foi desobedecido.`,
      progress: 'Evolução concluída',
      consequence: '+1 Chicote aplicado · Resistência não foi concedida nesta evolução',
    };
  }

  if (interdict.status === 'expired') {
    return {
      ...base,
      instruction: `O Interdito do Jogo ${gameNumber} expirou sem tentativa de evolução.`,
      progress: 'Expirou sem ativar',
      consequence: 'Nenhum Chicote aplicado',
    };
  }

  return {
    ...base,
    instruction: `O Interdito do Jogo ${gameNumber} foi cancelado porque a evolução deixou de ser possível.`,
    progress: '— Cancelado',
    consequence: 'Nenhum Chicote aplicado',
  };
}

function flowResultEvent(gameState) {
  const boss = gameState?.boss;
  if (boss?.bossFlow?.stage !== 'result') return null;
  const actionId = boss.bossFlow.eventActionId;
  if (!actionId) return null;
  return (boss.eventLog || []).find((event) => event.actionId === actionId) || null;
}

function bankerStatusPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'banker') return null;
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
    progress = compactBankerProgress(gameState, { abilityId: 'credit_limit', payload: boss.creditLimit || {} });
    category = 'Cobrança variável ativa';
  } else if (event.abilityId === 'discard_surcharge') {
    progress = compactBankerProgress(gameState, { abilityId: 'discard_surcharge', payload: boss.discardSurcharge || {} });
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

  return {
    category,
    name: event.name,
    speech: '',
    description: '',
    details,
    instruction: event.outcome || `${event.name} foi resolvida.`,
    progress,
    consequence: event.dangerChangeLabel || '',
  };
}

const MATRIARCH_ABILITY_NAMES = Object.freeze({
  living_seed: 'Semente Viva',
  hungry_root: 'Raiz Faminta',
  restorative_dew: 'Orvalho Restaurador',
  twin_vines: 'Trepadeiras Gêmeas',
  graft: 'Enxerto',
  discard_pollen: 'Pólen do Lixo',
  harvest: 'Colheita',
  royal_bloom: 'Florescimento Real',
  emerald_cocoon: 'Casulo Esmeralda',
  spring_crown: 'Coroa da Primavera',
});

function matriarchStatusPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'matriarca_esmeralda') return null;
  const event = flowResultEvent(gameState);
  const crown = boss.springCrown;
  const relatedCrownEvent = event?.type === 'springCrown'
    ? event
    : event?.type === 'natureThreat'
      && crown?.markedThreatId === event.threatId
      && crown?.resolvedEventId
      ? (boss.eventLog || []).find((entry) => entry.actionId === crown.resolvedEventId) || null
      : null;
  if (relatedCrownEvent) {
    const markedName = relatedCrownEvent.markedThreatName || crownThreatName(gameState);
    const threatEvent = event?.type === 'natureThreat'
      ? event
      : (boss.eventLog || []).find((entry) => (
          entry.type === 'natureThreat'
          && entry.threatId === relatedCrownEvent.threatId
          && entry.status === relatedCrownEvent.status
        )) || null;
    const failed = relatedCrownEvent.status === 'failed';
    const succeeded = relatedCrownEvent.status === 'success';
    const rootState = crown?.status === 'root_active'
      ? 'Raiz Fortalecida ativa'
      : 'Raiz Fortalecida preparada para a próxima rodada';
    const originalEffects = [
      threatEvent?.bloomApplied ? `+${threatEvent.bloomApplied} Flor${threatEvent.bloomApplied === 1 ? '' : 'es'}` : '',
      threatEvent?.healApplied ? `+${threatEvent.healApplied} HP` : '',
    ].filter(Boolean);
    return {
      category: failed
        ? 'Objetivo não concluído'
        : succeeded
          ? 'Objetivo concluído'
          : 'Objetivo cancelado',
      name: 'Coroa da Primavera',
      speech: '',
      description: '',
      details: detailFields([
        ['Ameaça marcada', markedName],
        ['Efeito da ameaça', originalEffects.join(' · ')],
      ]),
      instruction: relatedCrownEvent.outcome || 'A Coroa da Primavera foi resolvida.',
      progress: failed
        ? `❌ ${markedName} não cumprida`
        : succeeded
          ? `✅ ${markedName} cumprida`
          : `— ${markedName} cancelada`,
      consequence: failed
        ? [...originalEffects, rootState].join(' · ')
        : succeeded
          ? 'Sem efeito extra'
          : 'Sem punição',
    };
  }
  if (event?.type === 'bossAbility' && MATRIARCH_ABILITY_NAMES[event.abilityId]) {
    const currentIntent = boss.currentIntent;
    const sameAbility = currentIntent?.abilityId === event.abilityId;
    const sameResolution = !currentIntent?.immediateEventActionId || currentIntent.immediateEventActionId === event.actionId;
    const intent = sameAbility && sameResolution ? currentIntent : null;
    if (!intent) {
      return {
        category: 'Efeito registrado',
        name: MATRIARCH_ABILITY_NAMES[event.abilityId],
        speech: '',
        description: '',
        details: [...(event.presentation?.details || [])],
        instruction: event.outcome || 'A habilidade foi registrada.',
        progress: '',
        consequence: '',
      };
    }
    const compact = compactAction(gameState, intent);
    return {
      category: NATURE_OBJECTIVES.has(intent.abilityId) ? 'Ameaça natural ativa' : 'Efeito ativo',
      name: intent.name || MATRIARCH_ABILITY_NAMES[event.abilityId],
      speech: '',
      description: '',
      details: matriarchDetails(gameState, intent),
      instruction: compact.instruction,
      progress: compact.progress,
      consequence: compact.consequence,
    };
  }
  if (event?.type !== 'natureThreat') return null;
  const threat = (boss.natureThreats || []).find((entry) => entry.id === event.threatId);
  if (!threat) return null;
  const abilityId = threat.sourceAbilityId;
  const sourceIntentId = threat.sourceIntentId;
  const related = (boss.natureThreats || []).filter((entry) => entry.sourceIntentId === sourceIntentId);
  const intent = {
    id: sourceIntentId,
    abilityId,
    payload: {
      targetPlayerId: threat.targetPlayerId,
      countedCardIds: threat.countedCardIds || [],
    },
  };
  const completed = related.filter((entry) => entry.status === 'success').length;
  const failed = related.filter((entry) => entry.status === 'failed').length;
  const active = related.some((entry) => entry.status === 'active');
  const category = active
    ? 'Ameaça natural ativa'
    : failed
      ? 'Objetivo não concluído'
      : completed === related.length
        ? 'Objetivo concluído'
        : 'Objetivo resolvido';

  return {
    category,
    name: MATRIARCH_ABILITY_NAMES[abilityId] || threat.name || 'Ameaça natural',
    speech: '',
    description: '',
    details: detailFields([
      ['Objetivos concluídos', related.length > 1 ? `${completed}/${related.length}` : ''],
      ['Flores aplicadas', event.bloomApplied || ''],
      ['Cura aplicada', event.healApplied ? `${event.healApplied} HP` : ''],
    ]),
    instruction: event.outcome || 'A ameaça natural foi resolvida.',
    progress: compactNatureProgress(gameState, intent),
    consequence: event.bloomApplied || event.healApplied
      ? [event.bloomApplied ? `+${event.bloomApplied} Flor${event.bloomApplied === 1 ? '' : 'es'}` : '', event.healApplied ? `+${event.healApplied} HP` : ''].filter(Boolean).join(' · ')
      : 'Sem consequência adicional',
  };
}

function pendingChoicePresentation(gameState, choice) {
  const target = playerName(gameState, choice.playerId);
  const names = {
    forced_choice: 'Escolha Forcada',
    break_will: 'Quebra de Vontade',
    final_order_draw: 'Ordem Final',
    final_order_lock: 'Ordem Final',
    fixed_interest_payment: 'Pagamento dos Juros Fixos',
    banker_collateral_card: 'Garantia do Cofre',
  };
  const finalOrderInstruction = choice.type === 'final_order_draw'
    ? `${target} escolhe entre comprar 2 cartas presas no proximo turno ou receber 1 Chicote.`
    : choice.type === 'final_order_lock'
      ? `${target} escolhe entre prender 1 carta aleatoria da propria mao no proximo turno ou receber 1 Chicote.`
      : `${target} precisa decidir antes de a partida continuar.`;
  return {
    category: 'Escolha obrigatoria agora',
    name: names[choice.type] || 'Decisao obrigatoria',
    speech: '',
    description: '',
    details: detailFields([
      ['Alvo', target],
      ['Ordem oferecida', choice.order?.label],
      ['Estado', 'a partida permanece pausada ate a decisao'],
    ]),
    instruction: finalOrderInstruction,
    progress: '',
    consequence: 'Acoes comuns bloqueadas',
  };
}

export function buildBossActionPresentation(gameState) {
  const pendingChoice = gameState?.boss?.pendingChoices?.[0];
  if (pendingChoice) return pendingChoicePresentation(gameState, pendingChoice);
  const intent = gameState?.boss?.currentIntent;
  const flow = gameState?.boss?.bossFlow;
  const definition = getBossDefinition(gameState?.boss?.id);
  const feminineBoss = ['dominadora', 'matriarca_esmeralda'].includes(definition?.id);
  if (flow?.stage === 'phase') {
    const phaseName = definition?.phaseNames?.[flow.phase] || '';
    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: `FASE ${flow.phase} - ${phaseName}`,
      speech: '',
      description: '',
      details: [],
      instruction: `A batalha entrou na fase ${flow.phase}.`,
      progress: '',
      consequence: '',
    };
  }
  if (flow?.stage === 'taunt') {
    const phaseName = definition?.phaseNames?.[flow.phase] || '';
    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: `FASE ${flow.phase} - ${phaseName}`,
      speech: definition?.phaseTaunts?.[flow.phase] || '',
      description: '',
      details: [],
      instruction: definition?.phaseTaunts?.[flow.phase] || '',
      progress: '',
      consequence: '',
    };
  }
  if (flow?.stage === 'result') {
    const bankerStatus = bankerStatusPresentation(gameState);

    if (bankerStatus) {
      return bankerStatus;
    }

    const matriarchStatus = matriarchStatusPresentation(gameState);

    if (matriarchStatus) {
      return matriarchStatus;
    }

    const possessionStatus = possessionPresentation(gameState);

    if (possessionStatus) {
      return possessionStatus;
    }

    const exposureResult = exposureResultPresentation(gameState);

    if (exposureResult) {
      return exposureResult;
    }

    const etiquettePresentation = ironEtiquetteOrderPresentation(gameState);

    if (etiquettePresentation) {
      return etiquettePresentation;
    }

    const interdictStatus = interdictPresentation(gameState);

    if (interdictStatus) {
      return interdictStatus;
    }

    return {
      category: `Turno d${feminineBoss ? 'a' : 'o'} ` + `${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`,
      name: 'Preparando nova ordem',
      speech: '',
      description: '',
      details: [],
      instruction: 'O resultado foi registrado. A próxima habilidade será anunciada em instantes.',
      progress: '',
      consequence: '',
    };
  }
  if (intent?.abilityId === 'iron_etiquette') {
    const etiquettePresentation = ironEtiquetteOrderPresentation(gameState);

    if (etiquettePresentation) {
      return etiquettePresentation;
    }
  }

  if (intent?.abilityId === 'interdict' || (gameState.boss?.interdicts || []).some((entry) => entry.status === 'active')) {
    const interdictStatus = interdictPresentation(gameState);

    if (interdictStatus) {
      return interdictStatus;
    }
  }

  if (!intent) {
    const possessionStatus = possessionPresentation(gameState);

    if (possessionStatus) {
      return possessionStatus;
    }

    const exposureResult = exposureResultPresentation(gameState);

    if (exposureResult) {
      return exposureResult;
    }

    const etiquettePresentation = ironEtiquetteOrderPresentation(gameState);

    if (etiquettePresentation) {
      return etiquettePresentation;
    }

    const interdictStatus = interdictPresentation(gameState);

    if (interdictStatus) {
      return interdictStatus;
    }

    return {
      category: 'Acao atual',
      name: 'Aguardando a virada da rodada',
      speech: 'Aguardem.',
      description: 'Nenhuma habilidade esta ativa.',
      details: [],
      instruction: 'A proxima acao sera anunciada na nova rodada.',
      progress: '',
      consequence: '',
    };
  }
  const phase = gameState.boss.phase || 1;
  const payload = intent.payload || {};
  const collarCards = intent.abilityId === 'collar' ? cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : [])) : [];
  let details = [];

  if (gameState.boss.id === 'banker') {
    if (intent.abilityId === 'fixed_interest')
      details = [
        `Contrato: ${payload.contractTier || 'Padrao'}`,
        `Pagamento integral: +${payload.fullDebt ?? payload.amount ?? (phase === 3 ? 8 : 6)} de Divida`,
        `Com garantia no Cofre: +${payload.guaranteedDebt ?? payload.collateralAmount ?? (phase === 3 ? 5 : 3)} de Divida`,
        'A carta dada em garantia substitui a compra normal do proximo turno do dono',
        'Duracao: resolve ao fim da rodada',
      ];
    else if (intent.abilityId === 'maintenance_fee') details = ['Compra extra inevitavel', `Cada jogador comprara +${payload.extraDraw ?? (phase === 3 ? 2 : 1)} carta(s)`, 'Aplicada no proximo turno de cada jogador'];
    else if (intent.abilityId === 'credit_block') details = ['Lixo bloqueado agora', `Duracao: ate o fim da rodada ${gameState.boss.roundNumber}`, 'Encerra depois da acao do ultimo cooperador'];
    else if (intent.abilityId === 'suit_audit')
      details = [
        `Naipe: ${payload.suitLabel}`,
        `Progresso: ${payload.progress || 0}/${payload.required}`,
        `Sucesso: ${payload.successDelta ?? -5} de Divida`,
        `Falha: +${payload.failureDelta ?? (phase === 3 ? 12 : 10)} de Divida`,
        'Encerra ao fim da rodada',
      ];
    else if (intent.abilityId === 'pledge') details = [`Jogo bloqueado: ${payload.meldIndex == null ? 'nenhum jogo disponivel' : `Jogo #${Number(payload.meldIndex) + 1}`}`, 'Nao pode receber cartas', 'Encerra na proxima cobranca'];
    else if (intent.abilityId === 'compound_interest') {
      const totalCards = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      details = [`Cartas nas maos agora: ${totalCards}`, `Estimativa atual: +${Math.min(12, 4 + Math.floor(totalCards / 4))} de Divida`, 'O valor e recalculado quando a cobranca resolver'];
    } else if (intent.abilityId === 'credit_limit') {
      const limit = gameState.boss.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      details = [
        `Franquia compartilhada: ${limit.allowance || payload.allowance} cartas`,
        `Cartas contadas: ${counted}/${limit.allowance || payload.allowance}`,
        `Cobranca acumulada: ${limit.chargedDebt || 0}/${limit.maxCharge || payload.maxCharge}`,
        `Proxima carta excedente: +${limit.debtPerCard || payload.debtPerCard || 1} de Divida`,
      ];
    } else if (intent.abilityId === 'discard_surcharge') {
      const surcharge = gameState.boss.discardSurcharge || payload;
      details = [`Custo: +${surcharge.amount || payload.amount} de Divida`, 'Gatilho: primeira retirada valida do lixo', 'O jogador pode desistir e comprar do monte', `Estado: ${surcharge.status === 'consumed' ? 'consumido' : 'ativo nesta rodada'}`];
    }
  } else if (gameState.boss.id === 'dominadora') details = dominatrixDetails(gameState, intent);
  else details = matriarchDetails(gameState, intent);

  const compact = compactAction(gameState, intent);

  return {
    category: flow?.stage === 'ability' ? `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}` : actionCategory(intent),
    name: intent.name,
    speech:
      intent.abilityId === 'collar' && collarCards.length === 1
        ? 'Uma das suas opcoes agora me pertence.'
        : (gameState.boss.id === 'banker' ? BANKER_SPEECHES : gameState.boss.id === 'dominadora' ? DOMINATRIX_SPEECHES : MATRIARCH_SPEECHES)[intent.abilityId] || intent.name,
    description: intent.description || '',
    details,
    instruction: compact.instruction,
    progress: compact.progress,
    consequence: compact.consequence,
  };
}

export function buildBossResultPresentation(lastEvent) {
  if (!lastEvent) return { category: 'Resultado recente', name: 'Nenhum resultado', speech: '', description: 'Aguardando a primeira resolucao.', details: [] };
  if (lastEvent.type !== 'bossAbility') {
    const value = lastEvent.damage ? `-${lastEvent.damage} HP` : lastEvent.amount ? `${lastEvent.amount}` : '';
    const details = value ? [value] : [];
    if (lastEvent.type === 'bossChoice' && lastEvent.lockedCardLabel) details.push(`Carta presa: ${lastEvent.lockedCardLabel}`);
    return { category: 'Resultado recente', name: lastEvent.name || 'Impacto registrado', speech: '', description: lastEvent.outcome || value || 'Evento concluido.', details };
  }
  const snapshot = lastEvent.presentation || {};
  const details = [...(snapshot.details || [])];
  if (lastEvent.dangerChangeLabel) details.push(lastEvent.dangerChangeLabel);
  return {
    category: RESULT_CATEGORY_BY_ABILITY[lastEvent.abilityId] || 'Resultado recente',
    name: lastEvent.name || 'Habilidade resolvida',
    speech: '',
    description: lastEvent.outcome || 'Habilidade concluida.',
    details,
  };
}

export function buildBossFinalPresentation(gameState) {
  const boss = gameState?.boss;
  const result = boss?.result;
  const definition = getBossDefinition(boss?.id);
  const playersWon = Boolean(result?.victory);
  const chainSummary = (gameState?.players || []).map((player) => `${player.name}: ${Number(boss?.chainsByPlayer?.[player.id] || 0)}/4`).join(' · ');
  const finalStrike = [...(boss?.eventLog || [])].reverse().find((entry) => entry.type === 'finalStrike');
  return {
    outcome: playersWon ? 'VITÓRIA' : 'DERROTA',
    bossName: definition?.name || 'Chefe da Mesa',
    portrait: definition?.portrait || '',
    reason: result?.detail || (playersWon ? 'O chefe foi derrotado.' : 'A equipe foi derrotada.'),
    speech: definition?.finalSpeeches?.[playersWon ? 'victory' : 'defeat'] || '',
    hp: `${Math.max(0, boss?.hp || 0)} / ${boss?.maxHp || 0}`,
    dangerLabel: boss?.id === 'dominadora' ? 'Chicotes finais' : boss?.id === 'matriarca_esmeralda' ? 'Florescimento final' : 'Dívida final',
    danger: boss?.id === 'dominadora' ? chainSummary : `${Number(boss?.danger || 0)} / ${Number(boss?.maxDanger || 0)}`,
    totalDamage: Number(boss?.stats?.totalDamage || 0),
    canastras: Number(boss?.stats?.canastrasFormed || 0),
    rounds: Number(boss?.roundNumber || 1),
    finalStrike: Number(boss?.stats?.finalStrike || finalStrike?.damage || 0),
  };
}
