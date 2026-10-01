import { getBossDefinition } from './boss-registry.js';
import { getRestorativeDewHealing } from './boss-balance.js';

const BANKER_CONTRACT_TIER_LABELS = Object.freeze({
  mild: 'Leve',
  standard: 'Padrão',
  severe: 'Severo',
});

function bankerContractTierLabel(tier) {
  return BANKER_CONTRACT_TIER_LABELS[tier] || 'Padrão';
}

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

const DIMITRESCU_SPEECHES = Object.freeze({
  bela_hunt: 'Bela adora quando a presa tenta fugir.',
  cassandra_feast: 'Cassandra escolheu onde vai servir o jantar.',
  daniela_swarm: 'Daniela transformou o lixo em um enxame faminto.',
  blood_tithe: 'Toda mão cheia me deve um tributo.',
  red_wine: 'Um bom vinho melhora com sangue fresco.',
  crimson_brand: 'Vou deixar a minha marca em cada uma de vocês.',
  cassandra_dead_feast: 'Cassandra, prepare o banquete onde elas menos esperam.',
  crimson_clot: 'Meu sangue sabe muito bem como fechar uma ferida.',
  castle_lockdown: 'As portas estão trancadas. Ninguém sai para o lixo.',
  three_daughters: 'Meninas, divirtam-se com nossos convidados.',
});

const NEHELENIA_SPEECHES = Object.freeze({
  false_image: 'Qual dessas imagens vocês ainda chamam de verdade?',
  mirrored_meld: 'O jogo de vocês fica mais bonito dentro do meu espelho.',
  follow_reflection: 'Repitam o reflexo. Se conseguirem lembrar qual veio primeiro.',
  dream_theft: 'Um sonho tão frágil merece uma moldura melhor.',
  discard_mirror: 'O lixo mostra exatamente o que vocês querem enxergar.',
  shattered_mirror: 'Três fragmentos. Duas verdades. Uma mentira.',
  mirror_prison: 'Um de vocês já está aqui dentro. Venham buscá-lo.',
  eternal_nightmare: 'No meu pesadelo, a mentira sempre parece familiar.',
  tiger_link: "Tiger's Eye: amarrem os jogos até eles rasgarem.",
  tiger_prey: "Tiger's Eye já escolheu a presa. Não o façam esperar.",
  hawk_suit: "Hawk's Eye viu até a carta que vocês pretendiam descartar.",
  hawk_watch: "Hawk's Eye fechou os olhos de vocês para um caminho.",
  fish_marked_card: 'Fish Eye quer ver quanto tempo vocês conseguem segurar essa carta.',
  fish_inverted: 'Fish Eye prefere quando vocês começam pelo reflexo errado.',
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
  false_image: 'Ilusão resolvida',
  mirrored_meld: 'Jogo Espelhado resolvido',
  follow_reflection: 'Reflexo resolvido',
  dream_theft: 'Roubo de Sonho resolvido',
  discard_mirror: 'Espelho do Lixo resolvido',
  shattered_mirror: 'Espelho Estilhaçado resolvido',
  mirror_prison: 'Prisão no Espelho resolvida',
  eternal_nightmare: 'Pesadelo resolvido',
  tiger_link: 'Laço do Tigre resolvido',
  tiger_prey: 'Presa Marcada resolvida',
  hawk_suit: 'Olho do Falcão resolvido',
  hawk_watch: 'Vigilância encerrada',
  fish_marked_card: 'Mão no Espelho resolvida',
  fish_inverted: 'Reflexo Invertido encerrado',
});

const PREPARED_CHOICE_ABILITIES = new Set(['break_will', 'final_order', 'false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare']);
const ACTIVE_RESTRICTIONS = new Set(['credit_block', 'pledge', 'collar', 'exposure', 'hands_tied', 'double_collar', 'separation', 'absolute_control', 'interdict', 'castle_lockdown', 'hawk_watch', 'fish_inverted']);
const ROUND_OBJECTIVES = new Set(['suit_audit', 'possession', 'iron_etiquette', 'credit_limit', 'discard_surcharge', 'bela_hunt', 'crimson_brand', 'cassandra_feast', 'daniela_swarm', 'blood_tithe', 'three_daughters', 'mirrored_meld', 'follow_reflection', 'mirror_prison', 'tiger_link', 'tiger_prey', 'hawk_suit', 'fish_marked_card']);
const NATURE_OBJECTIVES = new Set(['living_seed', 'hungry_root', 'restorative_dew', 'twin_vines', 'graft', 'discard_pollen', 'harvest', 'royal_bloom']);
const ACTIVE_NATURE_EFFECTS = new Set(['emerald_cocoon', 'spring_crown', 'cassandra_dead_feast', 'crimson_clot']);
const ACTIVE_MIRROR_EFFECTS = new Set([]);

function actionCategory(intent) {
  if (intent.abilityId === 'maintenance_fee') return 'Tarifa ativa nesta rodada';
  if (intent.abilityId === 'forced_choice') return 'Escolha imediata';
  if (PREPARED_CHOICE_ABILITIES.has(intent.abilityId)) return 'Escolha preparada';
  if (ACTIVE_RESTRICTIONS.has(intent.abilityId)) return 'Restricao ativa agora';
  if (intent.abilityId === 'credit_limit') return 'Cobranca variavel ativa';
  if (intent.abilityId === 'discard_surcharge') return 'Cobranca preparada';
  if (ROUND_OBJECTIVES.has(intent.abilityId)) return 'Objetivo da rodada';
  if (NATURE_OBJECTIVES.has(intent.abilityId)) return 'Ameaca natural ativa';
  if (ACTIVE_MIRROR_EFFECTS.has(intent.abilityId)) return 'Efeito do espelho ativo';
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
  const zones = [...(gameState.players || []).map((player) => player.hand || []), ...(gameState.teams || []).flatMap((team) => team.melds || []), gameState.discard || [], gameState.stock || [], ...(gameState.deadPiles || [])];
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
    const result = threat.status === 'success' ? ' · concluído' : threat.status === 'failed' ? ` · falhou${threat.bloomApplied ? ` (+${threat.bloomApplied} Flor)` : ''}` : threat.status === 'cancelled' ? ' · cancelado sem efeito' : '';
    return `${marker} ${royalBloomObjectiveLabel(gameState, threat)}${result}`;
  });
  return [`${completed}/${threats.length} concluídos`, ...lines].join('\n');
}

function dimitrescuDaughterObjectiveLabel(gameState, objective) {
  if (objective?.type === 'bela') return `Bela — ${playerName(gameState, objective.targetPlayerId)} usa ${cardLabelAnywhere(gameState, objective.cardId)}`;
  if (objective?.type === 'cassandra') return `Cassandra — alimentar o Jogo ${Number(objective.meldIndex) + 1}`;
  if (objective?.type === 'daniela') return `Daniela — não recolher ${cardLabelAnywhere(gameState, objective.discardCardId)} do lixo`;
  return 'Objetivo das filhas';
}

function dimitrescuMultiObjectiveProgress(gameState, objectives = []) {
  if (!objectives.length) return 'Objetivos sendo preparados';
  const done = objectives.filter((objective) => objective.status === 'success').length;
  const lines = objectives.map((objective) => {
    const marker = objective.status === 'success' ? '☑' : objective.status === 'failed' ? '✕' : '☐';
    const suffix = objective.status === 'success' ? ' · concluído' : objective.status === 'failed' ? ' · falhou' : '';
    return `${marker} ${dimitrescuDaughterObjectiveLabel(gameState, objective)}${suffix}`;
  });
  return [`${done}/${objectives.length} concluídos`, ...lines].join('\n');
}

function crimsonBrandProgress(gameState, intent) {
  const marks = intent?.payload?.marks || [];
  if (!marks.length) return 'Marcas sendo preparadas';
  const done = marks.filter((mark) => mark.status === 'success').length;
  const lines = marks.map((mark) => {
    const marker = mark.status === 'success' ? '☑' : mark.status === 'failed' ? '✕' : '☐';
    const result = mark.status === 'success' ? ' · removida' : mark.status === 'failed' ? ' · sangrou' : '';
    return `${marker} ${playerName(gameState, mark.playerId)} — usar ${cardLabelAnywhere(gameState, mark.cardId)}${result}`;
  });
  return [`${done}/${marks.length} marcas removidas`, ...lines].join('\n');
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
    const cards = Number.isFinite(Number(threat?.observedHandSize)) ? Number(threat.observedHandSize) : player?.hand?.length || 0;
    const reductionNeeded = Math.max(0, cards - 7);
    const targetName = player?.name || playerName(gameState, intent.payload?.targetPlayerId) || 'Jogador';
    if (threat?.status === 'success') return `☑ ${targetName} — terminou com ${cards} carta${cards === 1 ? '' : 's'} · meta cumprida`;
    if (threat?.status === 'failed') {
      const result = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `✕ ${targetName} — terminou com ${cards} cartas${result ? ` · ${result}` : ''}`;
    }
    if (threat?.status === 'cancelled') return `— ${targetName} — Colheita cancelada`;
    if (cards <= 7) return `☑ ${targetName} — ${cards} carta${cards === 1 ? '' : 's'} na mão · meta atingida`;
    return `☐ ${targetName} — ${cards} cartas na mão · descarte ${reductionNeeded}`;
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
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown' ? boss.currentIntent : null;
  const markedThreatId = crown?.markedThreatId || announcedIntent?.payload?.markedThreatId || null;
  return markedThreatId ? (boss?.natureThreats || []).find((threat) => threat.id === markedThreatId) || null : null;
}

function crownThreatName(gameState) {
  const boss = gameState.boss;
  const crown = boss?.springCrown;
  const announcedIntent = boss?.currentIntent?.abilityId === 'spring_crown' ? boss.currentIntent : null;
  const threat = springCrownMarkedThreat(gameState);
  return crown?.markedThreatName || announcedIntent?.payload?.markedThreatName || CROWN_THREAT_NAMES[threat?.type] || threat?.name || 'Ameaca natural';
}

function crownThreatObjective(gameState, threat) {
  if (!threat) return 'A ameaca marcada nao possui mais um alvo valido.';
  if (['seed', 'royal_seed'].includes(threat.type)) {
    return `${playerName(gameState, threat.targetPlayerId)} deve usar ${cardLabelAnywhere(gameState, threat.cardId)} antes do fim do turno.`;
  }
  if (['pollen', 'royal_pollen'].includes(threat.type)) return `Nao recolher ${cardLabelAnywhere(gameState, threat.discardCardId)} do lixo.`;
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) {
    return threat.strengthened ? `Cada cooperador deve adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.` : `Adicionar uma carta legal ao Jogo ${Number(threat.meldIndex) + 1}.`;
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
    const current = threat.strengthened ? new Set(threat.contributorPlayerIds || []).size : Math.min(1, new Set(threat.progressCardIds || []).size);
    return `${current}/${required} · Pendente`;
  }
  if (threat.type === 'graft') return `${new Set(threat.fedMeldIds || []).size}/2 · Pendente`;
  if (threat.type === 'dew') return `${new Set(threat.countedCardIds || []).size}/6 · Pendente`;
  return 'Pendente';
}


function maintenanceFeeProgress(gameState, intent) {
  const boss = gameState.boss || {};
  const maintenance = (boss.effects || []).find((entry) => entry.id === 'maintenance_fee' && entry.sourceActionId === intent.id);
  const activeFinanced = (boss.effects || []).filter((entry) => entry.id === 'financed_card' && entry.sourceActionId === intent.id);
  const lines = (gameState.players || []).flatMap((player) => {
    const playerCards = activeFinanced.filter((entry) => entry.playerId === player.id);
    if (playerCards.length) {
      return playerCards.map((entry) => `☐ ${playerName(gameState, player.id)} — use ${cardLabelAnywhere(gameState, entry.cardId)} em jogo`);
    }

    const pendingDraw = boss.pendingFinancedDrawsByPlayer?.[player.id];
    if (pendingDraw?.sourceActionId === intent.id) return [`☐ ${playerName(gameState, player.id)} — recebendo carta financiada`];
    if (maintenance?.pendingPlayerIds?.includes(player.id)) return [`☐ ${playerName(gameState, player.id)} — aguarda a compra financiada`];

    const resolved = [...(boss.eventLog || [])].reverse().find((event) => event.type === 'financedCharge'
      && event.round === boss.roundNumber
      && event.playerId === player.id
      && (!event.sourceActionId || event.sourceActionId === intent.id));
    if (resolved) {
      return [resolved.dangerDelta
        ? `✕ ${playerName(gameState, player.id)} — +${resolved.dangerDelta} Dívida`
        : `☑ ${playerName(gameState, player.id)} — financiada usada em jogo`];
    }

    return [`☐ ${playerName(gameState, player.id)} — aguarda a compra financiada`];
  });
  return lines.join('\n');
}

function compactBankerProgress(gameState, intent) {
  const boss = gameState.boss || {};
  const payload = intent.payload || {};
  switch (intent.abilityId) {
    case 'fixed_interest':
      return 'Cobrança no fim da rodada';
    case 'maintenance_fee':
      return maintenanceFeeProgress(gameState, intent);
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
    case 'final_order': {
      const orders = payload.orders || [];
      return detailFields([
        ['Alvos', 'os dois cooperadores'],
        ['Cartas marcadas', orders.map((order) => `${playerName(gameState, order.playerId)}: ${(order.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).join(' e ')}`).join(' · ')],
        ['Resolucao', 'cada jogador decide agora, antes dos turnos dos cooperadores'],
        ['Escolha', 'aceitar a ordem ou receber 1 Chicote imediatamente'],
        ['Falha ao obedecer', '1 Chicote por carta marcada que nao entrar em jogo'],
      ]);
    }
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

function dimitrescuDetails(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const objectiveLabel = (objective) => dimitrescuDaughterObjectiveLabel(gameState, objective);
  switch (intent.abilityId) {
    case 'bela_hunt':
      return detailFields([
        ['Filha', 'Bela'], ['Alvo', target], ['Carta', card], ['Prazo', 'fim do turno do alvo'],
        ['Sucesso', 'Sede -3'], ['Falha', `Sede +${Number(intent.announcedPhase) === 3 ? 16 : 14}`],
      ]);
    case 'cassandra_feast':
      return detailFields([
        ['Filha', 'Cassandra'], ['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Prazo', 'fim da rodada'],
        ['Sucesso', 'Sede -4'], ['Falha', `Sede +${Number(intent.announcedPhase) === 3 ? 18 : 16}`],
      ]);
    case 'daniela_swarm':
      return detailFields([
        ['Filha', 'Daniela'], ['Carta contaminada', cardLabelAnywhere(gameState, payload.discardCardId)], ['Prazo', 'esta rodada'],
        ['Evitar o lixo', 'Sede -3'], ['Recolher o lixo', `Sede +${Number(intent.announcedPhase) === 3 ? 15 : 12}`],
      ]);
    case 'blood_tithe': {
      const phase = Number(intent.announcedPhase) || 1;
      const medium = phase === 3 ? 6 : 4;
      const heavy = phase === 3 ? 10 : 8;
      const players = (gameState.players || []).map((player) => {
        const cards = player.hand?.length || 0;
        const amount = cards >= 11 ? heavy : cards >= 8 ? medium : 0;
        return [player.name || 'Jogador', `${cards} carta${cards === 1 ? '' : 's'} → ${amount ? `+${amount} Sede` : 'sem tributo'}`];
      });
      return detailFields([
        ['Cobrança', 'cada jogador é avaliado separadamente no fim da rodada'],
        ...players,
        ['0–7 cartas', 'sem efeito'],
        ['8–10 cartas', `Sede +${medium} por jogador`],
        ['11+ cartas', `Sede +${heavy} por jogador`],
      ]);
    }
    case 'red_wine':
      return detailFields([
        ['Requisito', 'Lady ferida e Sede 20+'], ['Cura', `${payload.healAmount || 0} HP`], ['Custo', `${payload.bloodCost || 15} de Sede`],
      ]);
    case 'crimson_brand':
      return detailFields([
        ...(payload.marks || []).map((mark, index) => [`Marca ${index + 1}`, `${playerName(gameState, mark.playerId)} — ${cardLabelAnywhere(gameState, mark.cardId)}`]),
        ['Sucesso por marca', 'Sede -2'], ['Falha por marca', `Sede +${Number(intent.announcedPhase) === 3 ? 9 : 7}`],
      ]);
    case 'cassandra_dead_feast':
      return detailFields([
        ['Filha', 'Cassandra'], ['Alvo', `Morto ${Number(payload.deadIndex) + 1}`],
        ['Ao tomar', `Sede +${payload.bloodAmount || 0} e cura ${payload.healAmount || 0} HP`],
        ['Purificação', 'Canastra Real ou Ás-a-Ás: apenas +4 Sede, sem cura'],
      ]);
    case 'crimson_clot':
      return detailFields([
        ['Proteção', `${payload.amount || 0}`], ['Romper', 'Sede -6'], ['Sobreviver', 'metade da proteção restante vira cura'],
      ]);
    case 'castle_lockdown':
      return detailFields([
        ['Duração', 'rodada completa'], ['Restrição', 'ninguém pode pegar o lixo'], ['Compra permitida', 'somente do monte'],
      ]);
    case 'three_daughters':
      return detailFields([
        ...(payload.objectives || []).map((objective, index) => [`Objetivo ${index + 1}`, objectiveLabel(objective)]),
        ['Cada sucesso', 'Sede -2'], ['Cada falha', 'Sede +8'],
      ]);
    default:
      return detailFields([['Efeito', intent.description || 'habilidade ativa']]);
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
      return [];
    case 'royal_bloom': {
      const threats = natureThreatsForIntent(gameState, intent);
      const objectives = threats.length
        ? threats
        : (payload.objectives || []).map((objective) => ({
            ...objective,
            type: objective.type === 'seed' ? 'royal_seed' : objective.type === 'root' ? 'royal_root' : 'royal_pollen',
          }));
      return detailFields([...objectives.map((objective, index) => [`Objetivo ${index + 1}`, royalBloomObjectiveLabel(gameState, objective)]), ['Falha por objetivo', '+1 Flor, sem cura'], ['Raiz falha', 'pode solicitar uma propagacao']]);
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


function neheleniaObjectiveMarker(status = 'active') {
  return status === 'success' ? '☑' : status === 'failed' ? '✕' : status === 'cancelled' ? '—' : '☐';
}

function neheleniaDreamMirrorSummary(gameState) {
  const boss = gameState.boss || {};
  const taken = Math.max(0, Number(boss.danger) || 0);
  const maximum = Math.max(1, Number(boss.maxDanger) || 5);
  const mirrors = Array.from({ length: maximum }, (_, index) => index < taken ? '◆' : '◇').join(' ');
  const lines = [`${mirrors}  ${taken}/${maximum} Espelhos tomados`];
  if (boss.mirrorWorldActive) lines.push('◆ Mundo do Espelho pressionando a mesa');
  return lines.join('\n');
}

function neheleniaMirrorProgress(gameState, intent) {
  const payload = intent?.payload || {};
  if (intent.abilityId === 'mirrored_meld') {
    const target = playerName(gameState, payload.targetPlayerId);
    const marker = payload.fed ? '☑' : payload.failed ? '✕' : '☐';
    const stateLabel = payload.fed ? 'jogo verdadeiro encontrado' : payload.failed ? 'reflexo falso · carta enviada ao fundo' : 'escolha REFLEXO I ou II com 1 carta';
    return `${marker} ${target} — ${stateLabel}`;
  }
  if (intent.abilityId === 'follow_reflection') {
    const firstName = playerName(gameState, payload.firstPlayerId);
    const secondName = playerName(gameState, payload.secondPlayerId);
    const locked = payload.patternLocked === true;
    const first = locked ? Math.max(0, Number(payload.patternCount) || 0) : Math.max(0, Number(payload.firstPlayedCount) || 0);
    const second = Math.max(0, Number(payload.secondPlayedCount) || 0);
    return [
      `${locked ? '☑' : '☐'} ${firstName} — ${locked ? `padrão fechado: ${first} carta${first === 1 ? '' : 's'}` : `${first} baixada${first === 1 ? '' : 's'} até agora · o turno inteiro define o padrão`}`,
      `${locked && second === first ? '☑' : '☐'} ${secondName} — ${locked ? `${second}/${first} · pode jogar livremente, mas precisa terminar exatamente igual` : 'aguarda o fim do primeiro turno'}`,
    ].join('\n');
  }
  if (intent.abilityId === 'mirror_prison') {
    return `${payload.fed ? '☑' : '☐'} ${playerName(gameState, payload.rescuerPlayerId)} — alimente o Jogo ${Number(payload.meldIndex) + 1} para libertar ${playerName(gameState, payload.trappedPlayerId)}`;
  }
  if (intent.abilityId === 'tiger_link') {
    const fed = new Set(payload.fedMeldIds || []);
    return (payload.targets || []).map((target, index) => `${fed.has(target.meldId) ? '☑' : '☐'} Laço ${index + 1} — Jogo ${Number(target.meldIndex) + 1}`).join('\n');
  }
  if (intent.abilityId === 'tiger_prey') {
    return `${payload.fed ? '☑' : '☐'} ${playerName(gameState, payload.targetPlayerId)} — alimente o Jogo ${Number(payload.meldIndex) + 1}`;
  }
  if (intent.abilityId === 'hawk_suit') {
    return `${payload.discardedCorrectSuit ? '☑' : '☐'} ${playerName(gameState, payload.targetPlayerId)} — descarte ${payload.suitLabel || payload.suit}`;
  }
  if (intent.abilityId === 'hawk_watch') {
    return `👁 ${playerName(gameState, payload.targetPlayerId)} — Jogo ${Number(payload.meldIndex) + 1} bloqueado neste turno`;
  }
  if (intent.abilityId === 'fish_marked_card') {
    const done = payload.used || payload.discarded;
    return `${done ? '☑' : '☐'} ${playerName(gameState, payload.targetPlayerId)} — retire ${cardLabelAnywhere(gameState, payload.cardId)} da mão`;
  }
  if (intent.abilityId === 'fish_inverted') {
    return `${payload.fedExisting ? '☑' : '☐'} ${playerName(gameState, payload.targetPlayerId)} — alimente 1 jogo existente antes de abrir outro`;
  }
  return neheleniaDreamMirrorSummary(gameState);
}

function neheleniaStatusPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'nehelenia') return null;
  const event = flowResultEvent(gameState);
  if (!event) return null;
  const abilityId = event.abilityId || event.sourceAbilityId;
  const ability = getBossDefinition('nehelenia')?.abilities.find((entry) => entry.id === abilityId);
  if (!ability && !['dreamMirror', 'mirrorWorld'].includes(event.type)) return null;
  return {
    category: ['dreamMirror', 'mirrorWorld'].includes(event.type) ? 'Espelhos dos Sonhos' : 'Resultado da habilidade',
    name: ability?.name || event.origin || 'Espelho dos Sonhos',
    speech: '',
    description: '',
    details: event.presentation?.details || [],
    instruction: event.outcome || `${ability?.name || 'A ilusão'} foi resolvida.`,
    progress: neheleniaDreamMirrorSummary(gameState),
    consequence: event.dangerChangeLabel || '',
  };
}

function compactAction(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
  switch (intent.abilityId) {
    case 'fixed_interest': {
      const holder = playerName(gameState, payload.holderPlayerId);
      const fullDebt = payload.fullDebt ?? payload.amount;
      const guaranteedDebt = payload.guaranteedDebt ?? payload.collateralAmount;
      const interestStep = payload.interestStep ?? (intent.announcedPhase === 3 ? 3 : 2);
      return {
        instruction: `${holder} escolhe no fim da rodada.`,
        progress: [
          `☐ Integral → +${fullDebt} Dívida`,
          `☐ Cofre → 1 carta presa · resgate +${guaranteedDebt}`,
          `☐ Adiar → +${interestStep}/turno · máximo +${fullDebt}`,
        ].join('\n'),
        consequence: '',
      };
    }
    case 'maintenance_fee':
      return {
        instruction: `Cada cooperador recebe +${payload.extraDraw} carta${payload.extraDraw === 1 ? '' : 's'} FINANCIADA${payload.extraDraw === 1 ? '' : 'S'}.`,
        progress: maintenanceFeeProgress(gameState, intent),
        consequence: `Falha por carta: +${payload.financedDebt ?? (intent.announcedPhase === 3 ? 7 : 5)} Dívida · descartar não quita`,
      };
    case 'credit_block':
      return { instruction: 'O lixo esta bloqueado nesta rodada.', progress: compactBankerProgress(gameState, intent), consequence: 'Encerra na virada da rodada' };
    case 'suit_audit':
      return { instruction: `Joguem ${payload.required} cartas de ${payload.suitLabel}.`, progress: compactBankerProgress(gameState, intent), consequence: `Sucesso → sem cobrança · Falha → +${payload.failureDelta} Dívida` };
    case 'pledge':
      return { instruction: `Jogo ${Number(payload.meldIndex) + 1} nao pode receber cartas.`, progress: compactBankerProgress(gameState, intent), consequence: 'Libera ao fim da cobranca' };
    case 'compound_interest': {
      const total = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      const safeMax = payload.safeMax ?? 7;
      const warningMax = payload.warningMax ?? 13;
      const phase3 = intent.announcedPhase === 3;
      const safeDebt = payload.safeDebt ?? (phase3 ? 8 : 6);
      const warningDebt = payload.warningDebt ?? (phase3 ? 12 : 10);
      const dangerDebt = payload.dangerDebt ?? (phase3 ? 16 : 14);
      const band = total <= safeMax ? 'safe' : total <= warningMax ? 'warning' : 'danger';
      return {
        instruction: `${total} cartas nas mãos da equipe.`,
        progress: [
          `${band === 'safe' ? '☑' : '☐'} 0–${safeMax} → +${safeDebt} Dívida`,
          `${band === 'warning' ? '☑' : '☐'} ${safeMax + 1}–${warningMax} → +${warningDebt} Dívida`,
          `${band === 'danger' ? '☑' : '☐'} ${warningMax + 1}+ → +${dangerDebt} Dívida`,
        ].join('\n'),
        consequence: '',
      };
    }
    case 'credit_limit': {
      const limit = gameState.boss?.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = limit.allowance || payload.allowance || 0;
      const exceeded = Math.max(0, counted - allowance);
      const debtPerCard = limit.debtPerCard || payload.debtPerCard || 1;
      const chargedDebt = Number(limit.chargedDebt) || 0;
      const maxCharge = limit.maxCharge || payload.maxCharge || 0;
      return {
        instruction: 'Só contam cartas que saíram da mão.',
        progress: [
          `${exceeded ? '✕' : '☑'} Uso ${counted}/${allowance}${exceeded ? ` · ${exceeded} excedente${exceeded === 1 ? '' : 's'}` : ' · dentro da franquia'}`,
          `☐ Excedente → +${debtPerCard} Dívida por carta`,
          `☐ Cobrança ${chargedDebt}/${maxCharge} · teto +${maxCharge}`,
        ].join('\n'),
        consequence: '',
      };
    }
    case 'discard_surcharge':
      return { instruction: `Primeira retirada do lixo → +${payload.amount} Dívida.`, progress: compactBankerProgress(gameState, intent), consequence: 'Comprar do monte evita a cobrança' };
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
    case 'final_order': {
      const orders = payload.orders || [];
      const lines = orders.map((order) => `☐ ${playerName(gameState, order.playerId)} — ${(order.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).join(' e ')}`);
      return {
        instruction: 'A Dominadora marcou 2 cartas da mao de cada cooperador. As escolhas acontecem agora, antes dos turnos.',
        progress: lines.join('\n'),
        consequence: 'Recusar: +1 Chicote · Aceitar: +1 Chicote por carta que nao entrar em jogo no proximo turno',
      };
    }
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
    case 'bela_hunt': {
      const completed = payload.used === true;
      return { instruction: completed ? `✅ ${target} usou ${card}.` : `${target} precisa usar ${card} neste turno.`, progress: completed ? '✅ Bela perdeu a presa' : '🩸 Bela está caçando', consequence: completed ? 'Sede -3' : `Falha: Sede +${Number(intent.announcedPhase) === 3 ? 16 : 14}` };
    }
    case 'cassandra_feast':
      return { instruction: `Alimente o Jogo ${Number(payload.meldIndex) + 1} nesta rodada.`, progress: payload.fed ? '✅ Cassandra ficou sem banquete' : '⬜ Jogo ainda não alimentado', consequence: payload.fed ? 'Sede -4' : `Falha: Sede +${Number(intent.announcedPhase) === 3 ? 18 : 16}` };
    case 'daniela_swarm':
      return { instruction: 'Não recolha o lixo contaminado nesta rodada.', progress: payload.triggered ? '❌ Daniela encontrou sangue' : '☣️ Lixo contaminado', consequence: payload.triggered ? 'Sede já aumentou' : `Evitar: Sede -3 · Recolher: +${Number(intent.announcedPhase) === 3 ? 15 : 12}` };
    case 'blood_tithe': {
      const phase = Number(intent.announcedPhase) || 1;
      const medium = phase === 3 ? 6 : 4;
      const heavy = phase === 3 ? 10 : 8;
      const rows = (gameState.players || []).map((player) => {
        const cards = player.hand?.length || 0;
        const amount = cards >= 11 ? heavy : cards >= 8 ? medium : 0;
        const marker = amount ? '🩸' : '✓';
        return `${marker} ${player.name}: ${cards} carta${cards === 1 ? '' : 's'} → ${amount ? `+${amount} Sede` : 'sem tributo'}`;
      });
      const projected = (gameState.players || []).reduce((sum, player) => {
        const cards = player.hand?.length || 0;
        return sum + (cards >= 11 ? heavy : cards >= 8 ? medium : 0);
      }, 0);
      return {
        instruction: 'No fim da rodada, Lady cobra CADA jogador separadamente pelas cartas que ainda restarem na própria mão.',
        progress: rows.join('\n'),
        consequence: `0–7 = 0 · 8–10 = +${medium} · 11+ = +${heavy} Sede por jogador · cobrança atual: +${projected}`,
      };
    }
    case 'red_wine':
      return { instruction: `Lady Dimitrescu consome ${payload.bloodCost || 15} de Sede e recupera até ${payload.healAmount || 0} HP.`, progress: `Sede atual: ${gameState.boss?.danger || 0}/100`, consequence: 'A cura reduz a própria barra de Sede' };
    case 'crimson_brand':
      return { instruction: 'Cada cooperador precisa usar legalmente a própria carta marcada nesta rodada.', progress: crimsonBrandProgress(gameState, intent), consequence: `Cada sucesso: Sede -2 · Cada falha: Sede +${Number(intent.announcedPhase) === 3 ? 9 : 7}` };
    case 'cassandra_dead_feast': {
      const curse = gameState.boss?.bloodiedDead;
      const active = curse?.status === 'active';
      return {
        instruction: `Cassandra profanou o Morto ${Number(payload.deadIndex) + 1}.`,
        progress: active ? '🩸 MALDIÇÃO ATIVA NO MORTO' : 'A profanação foi preparada',
        consequence: `Tomar: +${payload.bloodAmount || 0} Sede e cura ${payload.healAmount || 0} HP · Real/Ás-a-Ás purifica`,
      };
    }
    case 'crimson_clot': {
      const clot = gameState.boss?.crimsonClot;
      const remaining = clot?.status === 'active' ? Math.max(0, Number(clot.remaining) || 0) : 0;
      const maximum = Math.max(1, Number(clot?.max || payload.amount) || 1);
      return { instruction: 'Rompa o Coágulo Carmesim antes do fim da rodada.', progress: clot?.status === 'active' ? `🩸 COÁGULO ${remaining}/${maximum}` : 'Coágulo preparado', consequence: 'Romper: Sede -6 · Sobreviver: 50% do restante vira cura' };
    }
    case 'castle_lockdown':
      return { instruction: 'O lixo está trancado nesta rodada.', progress: '🔒 Portas do Castelo fechadas', consequence: 'Compre apenas do monte' };
    case 'three_daughters': {
      const objectives = payload.objectives || [];
      return { instruction: 'Cumpra os três objetivos independentes das filhas.', progress: dimitrescuMultiObjectiveProgress(gameState, objectives), consequence: 'Cada sucesso: Sede -2 · Cada falha: Sede +8' };
    }
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
        instruction: `${target}: termine o turno com 7 cartas ou menos.`,
        progress: `${compactNatureProgress(gameState, intent)}\n• 0–7 ao final → sem efeito`,
        consequence: '• 8–10 ao final → cura 60 HP\n• 11+ ao final → +1 Flor e cura 100 HP',
      };
    case 'royal_bloom':
      return { instruction: `Cumpra ${payload.targetCount || payload.objectives?.length || 0} objetivos independentes.`, progress: compactNatureProgress(gameState, intent), consequence: 'Cada falha: +1 Flor, sem cura' };
    case 'emerald_cocoon': {
      const boss = gameState.boss;
      const cocoon = boss?.emeraldCocoon;
      const amount = payload.amount || 180;
      const events = boss?.eventLog || [];
      const activationActionId = intent.immediateEventActionId;
      let activationIndex = activationActionId ? events.findIndex((entry) => entry.actionId === activationActionId) : -1;

      if (activationIndex < 0) {
        activationIndex = events.findLastIndex?.((entry) => entry.type === 'bossAbility' && entry.abilityId === 'emerald_cocoon') ?? -1;
      }

      const eventsAfterActivation = activationIndex >= 0 ? events.slice(activationIndex + 1) : events.slice(-1);
      const breakEvent = [...eventsAfterActivation].reverse().find((entry) => entry.type === 'bossDamage' && entry.cocoonBroken);
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
        consequence: wasBroken ? 'A proteção não absorve mais dano' : 'Canastra limpa ou superior rompe e causa dano total',
      };
    }
    case 'spring_crown': {
      const crown = gameState.boss?.springCrown;
      const threat = springCrownMarkedThreat(gameState);
      const name = crownThreatName(gameState);
      const progress =
        crown?.status === 'root_prepared'
          ? `${name} falhou · Raiz Fortalecida preparada`
          : crown?.status === 'root_active'
            ? 'Raiz Fortalecida ativa · a Coroa permanece fortalecida'
            : crown?.status === 'completed'
              ? `${name} concluida · Coroa encerrada sem efeito extra`
              : crown?.status === 'cancelled'
                ? `${name} cancelada · sem punicao`
                : crownThreatProgress(threat);
      const consequence =
        crown?.status === 'root_active'
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
    case 'false_image':
      return { instruction: `${target}: descubra qual dos três reflexos realmente existe na sua mão.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro → a carta verdadeira fica presa no espelho durante o próximo turno' };
    case 'mirrored_meld':
      return { instruction: `${playerName(gameState, payload.targetPlayerId)}: o mesmo jogo apareceu duas vezes. Selecione 1 carta e escolha qual reflexo é o verdadeiro.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Reflexo falso → carta ao fundo do monte + Desorientado · Ignorar até o fim do turno → Espelho dos Sonhos roubado' };
    case 'follow_reflection':
      return { instruction: `Tudo o que ${playerName(gameState, payload.firstPlayerId)} baixar no turno vira o padrão. Depois, ${playerName(gameState, payload.secondPlayerId)} pode jogar livremente, mas precisa terminar com exatamente a mesma quantidade — inclusive 0.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Quantidade diferente no fim do segundo turno → +1 Espelho para Nehelenia' };
    case 'dream_theft':
      return { instruction: `${target}: reconheça qual reflexo realmente existe na sua mão.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro → seu Espelho dos Sonhos é roubado' };
    case 'discard_mirror':
      return { instruction: `${target}: o topo do lixo foi duplicado em dois reflexos idênticos. Escolha um deles — não há pista visual.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: '50/50 · erro → o lixo fica selado durante esta rodada' };
    case 'shattered_mirror':
      return { instruction: `${target}: dois reflexos são cartas reais da sua mão; encontre o único fragmento falso.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro → as duas cartas verdadeiras ficam presas no espelho durante o próximo turno' };
    case 'mirror_prison':
      return { instruction: `${playerName(gameState, payload.rescuerPlayerId)} precisa alimentar o reflexo para libertar ${playerName(gameState, payload.trappedPlayerId)}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Sucesso → recupera o Espelho dos Sonhos roubado' };
    case 'eternal_nightmare':
      return { instruction: `${target}: observe a carta ORIGINAL gerar dois reflexos e acompanhe-a durante o embaralhamento.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro → +1 Espelho para Nehelenia · 5/5 encerra a batalha' };
    case 'tiger_link':
      return { instruction: "Tiger's Eye ligou dois jogos. Alimente os dois antes do fim da rodada.", progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Lado ignorado → as garras persistem; a próxima alimentação rompe o efeito, mas o dano individual dessas cartas é anulado' };
    case 'tiger_prey':
      return { instruction: `${target}: Tiger's Eye marcou o Jogo ${Number(payload.meldIndex) + 1}. Alimente essa Presa.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Enquanto a Presa continuar ativa, você não pode alimentar outro jogo existente' };
    case 'hawk_suit':
      return { instruction: `${target}: encerre o turno descartando ${payload.suitLabel || payload.suit}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Outro naipe → Hawk vigia a carta descartada; ninguém pode recolher o lixo enquanto ela estiver no topo' };
    case 'hawk_watch':
      return { instruction: `${target}: Hawk's Eye está vigiando o Jogo ${Number(payload.meldIndex) + 1}. Você não pode alimentá-lo neste turno.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Os demais jogos continuam disponíveis' };
    case 'fish_marked_card':
      return { instruction: `${target}: Fish Eye marcou ${cardLabelAnywhere(gameState, payload.cardId)}. Use-a em jogo ou descarte-a neste turno.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Se continuar na mão → vira Reflexo Morto: não pode entrar em jogo e só sai pelo descarte' };
    case 'fish_inverted':
      return { instruction: `${target}: antes de abrir qualquer jogo novo, alimente 1 jogo que já existe.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Enquanto não alimentar um jogo existente, criar jogo novo fica bloqueado' };
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
  const currentIntentOrderId = boss.currentIntent?.abilityId === 'iron_etiquette' ? `etiquette_${boss.currentIntent.id}` : null;

  // Durante a rodada, o currentIntent da Etiqueta continua ativo mesmo depois
  // de o descarte resolver a ordem. Por isso, priorizamos a ordem ligada ao
  // intent atual, independentemente de ela estar ativa, obedecida ou falhada.
  const currentIntentOrder = currentIntentOrderId ? orders.find((order) => order.id === currentIntentOrderId && order.type === 'discard_suit') : null;

  const activeOrder = orders.find((order) => order.type === 'discard_suit' && order.status === 'active');

  // Um resultado resolvido só pode continuar visível enquanto ele ainda for
  // o último evento da partida e nenhuma nova habilidade estiver ativa.
  // Consultar o eventLog inteiro fazia uma Etiqueta antiga reaparecer sobre
  // os resultados das habilidades seguintes.
  const latestResolvedEvent = !boss.currentIntent && boss.lastEvent?.type === 'dominatrixOrder' && boss.lastEvent?.orderType === 'discard_suit' ? boss.lastEvent : null;

  const resolvedOrder = latestResolvedEvent ? orders.find((entry) => entry.id === latestResolvedEvent.orderId && entry.type === 'discard_suit' && entry.status !== 'active') : null;

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
  const currentIntent = boss.currentIntent?.abilityId === 'interdict' ? boss.currentIntent : null;
  const currentInterdictId = currentIntent ? `interdict_${currentIntent.id}` : null;
  const currentInterdict = currentInterdictId ? interdicts.find((entry) => entry.id === currentInterdictId) : null;
  const activeInterdict = interdicts.find((entry) => entry.status === 'active');

  const latestEvent = [...(boss.eventLog || [])].reverse().find((event) => ['interdictDecision', 'interdictExpired'].includes(event.type));
  const resolvedInterdict = latestEvent ? interdicts.find((entry) => entry.id === latestEvent.interdictId) : null;

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

function dominadoraResultPresentation(gameState) {
  if (gameState?.boss?.id !== 'dominadora') return null;
  const event = flowResultEvent(gameState);
  if (!event) return null;
  const abilityId = event.abilityId || event.sourceAbilityId;
  const ability = getBossDefinition('dominadora')?.abilities.find(entry => entry.id === abilityId);
  if (!ability) return null;
  // Persistent objectives must not replace the result identified by the flow.
  if (abilityId === 'possession') {
    const presentation = possessionPresentation(gameState);
    if (presentation) return presentation;
  }
  if (abilityId === 'exposure') {
    const presentation = exposureResultPresentation(gameState);
    if (presentation) return presentation;
  }
  return {
    category: 'Resultado da habilidade',
    name: ability.name,
    speech: '',
    description: '',
    details: event.presentation?.details || [],
    instruction: event.outcome || `${ability.name} foi resolvida.`,
    progress: 'Resultado registrado',
    consequence: event.dangerChangeLabel || '',
  };
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

function dimitrescuStatusPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'dimitrescu') return null;
  const clot = boss.crimsonClot;
  const event = flowResultEvent(gameState);

  if (clot?.status === 'active') {
    const maximum = Math.max(1, Number(clot.max) || 1);
    const remaining = Math.max(0, Number(clot.remaining) || 0);
    const projectedHeal = Math.floor(remaining / 2);
    return {
      category: 'Proteção vampírica ativa',
      name: 'Coágulo Carmesim',
      speech: '',
      description: '',
      details: detailFields([
        ['Proteção restante', `${remaining}/${maximum}`],
        ['Prazo', `fim da rodada ${boss.roundNumber}`],
        ['Se romper', 'Sede -6'],
        ['Se sobreviver', `${projectedHeal} HP de cura com o valor atual`],
      ]),
      instruction: 'Rompa o Coágulo Carmesim antes do fim da rodada.',
      progress: `🩸 COÁGULO ${remaining}/${maximum}`,
      consequence: `Romper: Sede -6 · Sobreviver agora: +${projectedHeal} HP`,
    };
  }

  if (event?.type === 'bossHeal' && event.origin === 'Coágulo Carmesim') {
    return {
      category: 'Proteção convertida em cura',
      name: 'Coágulo Carmesim',
      speech: '',
      description: '',
      details: detailFields([['Cura aplicada', `+${event.amount || 0} HP`]]),
      instruction: event.outcome || `O Coágulo sobrevivente restaurou ${event.amount || 0} HP.`,
      progress: 'Coágulo consumido',
      consequence: `Lady Dimitrescu recuperou ${event.amount || 0} HP`,
    };
  }

  if (event?.type === 'bloodClot') {
    return {
      category: 'Proteção encerrada',
      name: 'Coágulo Carmesim',
      speech: '',
      description: '',
      details: [],
      instruction: event.outcome || 'O Coágulo Carmesim foi encerrado.',
      progress: 'Coágulo encerrado',
      consequence: '',
    };
  }

  return null;
}

function matriarchStatusPresentation(gameState) {
  const boss = gameState?.boss;
  if (boss?.id !== 'matriarca_esmeralda') return null;
  const event = flowResultEvent(gameState);
  const crown = boss.springCrown;
  const relatedCrownEvent =
    event?.type === 'springCrown' ? event : event?.type === 'natureThreat' && crown?.markedThreatId === event.threatId && crown?.resolvedEventId ? (boss.eventLog || []).find((entry) => entry.actionId === crown.resolvedEventId) || null : null;
  if (relatedCrownEvent) {
    const markedName = relatedCrownEvent.markedThreatName || crownThreatName(gameState);
    const threatEvent = event?.type === 'natureThreat' ? event : (boss.eventLog || []).find((entry) => entry.type === 'natureThreat' && entry.threatId === relatedCrownEvent.threatId && entry.status === relatedCrownEvent.status) || null;
    const failed = relatedCrownEvent.status === 'failed';
    const succeeded = relatedCrownEvent.status === 'success';
    const rootState = crown?.status === 'root_active' ? 'Raiz Fortalecida ativa' : 'Raiz Fortalecida preparada para a próxima rodada';
    const originalEffects = [threatEvent?.bloomApplied ? `+${threatEvent.bloomApplied} Flor${threatEvent.bloomApplied === 1 ? '' : 'es'}` : '', threatEvent?.healApplied ? `+${threatEvent.healApplied} HP` : ''].filter(Boolean);
    return {
      category: failed ? 'Objetivo não concluído' : succeeded ? 'Objetivo concluído' : 'Objetivo cancelado',
      name: 'Coroa da Primavera',
      speech: '',
      description: '',
      details: detailFields([
        ['Ameaça marcada', markedName],
        ['Efeito da ameaça', originalEffects.join(' · ')],
      ]),
      instruction: relatedCrownEvent.outcome || 'A Coroa da Primavera foi resolvida.',
      progress: failed ? `❌ ${markedName} não cumprida` : succeeded ? `✅ ${markedName} cumprida` : `— ${markedName} cancelada`,
      consequence: failed ? [...originalEffects, rootState].join(' · ') : succeeded ? 'Sem efeito extra' : 'Sem punição',
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
        details: event.abilityId === 'harvest' ? [] : [...(event.presentation?.details || [])],
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
  const category = active ? 'Ameaça natural ativa' : failed ? 'Objetivo não concluído' : completed === related.length ? 'Objetivo concluído' : 'Objetivo resolvido';

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
    consequence:
      event.bloomApplied || event.healApplied
        ? [event.bloomApplied ? `+${event.bloomApplied} Flor${event.bloomApplied === 1 ? '' : 'es'}` : '', event.healApplied ? `+${event.healApplied} HP` : ''].filter(Boolean).join(' · ')
        : 'Sem consequência adicional',
  };
}

function pendingChoicePresentation(gameState, choice) {
  const target = playerName(gameState, choice.playerId);
  const names = {
    forced_choice: 'Escolha Forcada',
    break_will: 'Quebra de Vontade',
    final_order: 'Ordem Final',
    final_order_draw: 'Ordem Final',
    final_order_lock: 'Ordem Final',
    fixed_interest_payment: 'Pagamento dos Juros Fixos',
    banker_collateral_card: 'Garantia do Cofre',
    false_image: 'Imagem Falsa',
    dream_theft: 'Roubo de Sonho',
    discard_mirror: 'Espelho do Lixo',
    shattered_mirror: 'Espelho Estilhaçado',
    eternal_nightmare: 'Pesadelo Eterno',
  };
  let instruction = `${target} precisa decidir antes de a partida continuar.`;
  let progress = '';
  let consequence = 'Acoes comuns bloqueadas';
  let details = detailFields([
    ['Alvo', target],
    ['Ordem oferecida', choice.order?.label],
    ['Estado', 'a partida permanece pausada ate a decisao'],
  ]);

  if (['false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare'].includes(choice.type)) {
    const labels = choice.options.map((option) => choice.optionLabels?.[option] || option);
    const findFake = choice.type === 'shattered_mirror';
    instruction = findFake
      ? `${target}: dois reflexos existem na sua mão e um é falso. Aponte a mentira.`
      : `${target}: escolha qual reflexo corresponde à imagem verdadeira.`;
    if (choice.type === 'discard_mirror') instruction = `${target}: escolha um dos dois reflexos idênticos do topo do lixo. É 50/50.`;
    if (choice.type === 'dream_theft') instruction = `${target}: reconheça sua carta real antes que Nehelenia roube seu Espelho dos Sonhos.`;
    if (choice.type === 'eternal_nightmare') instruction = `${target}: acompanhe a carta ORIGINAL depois que dois reflexos nascerem e os três se embaralharem.`;
    progress = labels.map((label) => `◇ ${label}`).join('   ');
    consequence = choice.type === 'dream_theft' || choice.type === 'eternal_nightmare'
      ? 'Erro → +1 Espelho para Nehelenia'
      : choice.type === 'discard_mirror'
        ? 'Erro → lixo selado nesta rodada'
        : 'Erro → cartas reais presas no espelho durante o próximo turno';
    details = detailFields([
      ['Alvo', target],
      ['Reflexos', labels.join(' · ')],
      ['Regra', findFake ? 'encontre o reflexo falso' : 'encontre a imagem verdadeira'],
    ]);
  } else   if (choice.type === 'final_order') {
    const cards = (choice.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).filter(Boolean);
    instruction = `${target}: ${cards.join(' e ')} foram marcadas. Aceite usar as duas em jogo no proximo turno ou receba 1 Chicote agora.`;
    progress = `☐ 0/${cards.length || 2} — cada carta nao usada vale +1 Chicote`;
    consequence = 'Obedecer pode resultar em 0, 1 ou 2 Chicotes';
    details = detailFields([
      ['Alvo', target],
      ['Cartas marcadas', cards.join(' e ')],
      ['Recusar', '+1 Chicote agora'],
      ['Aceitar', 'usar as 2 cartas em jogos no proximo turno'],
      ['Falha parcial', '+1 Chicote por carta nao usada'],
    ]);
  } else if (choice.type === 'final_order_draw') {
    instruction = `${target} escolhe entre comprar 2 cartas presas no proximo turno ou receber 1 Chicote.`;
  } else if (choice.type === 'final_order_lock') {
    instruction = `${target} escolhe entre prender 1 carta aleatoria da propria mao no proximo turno ou receber 1 Chicote.`;
  } else if (choice.type === 'fixed_interest_payment') {
    instruction = `${target} escolhe como pagar o contrato.`;
    progress = `Integral agora: +${choice.amount} Dívida`;
    consequence = `Cofre: carta aleatória; resgate começa em +${choice.collateralAmount} e sobe +1 por compra adiada`;
    details = detailFields([
      ['Titular sorteado', target],
      ['Pagamento integral', `+${choice.amount} Dívida agora`],
      ['Com garantia', `o Banqueiro apreende 1 carta aleatória`],
      ['Preço inicial do resgate', `+${choice.collateralAmount} Dívida`],
      ['Juros', '+1 a cada turno em que comprar normalmente'],
      ['Limite', `ao chegar a +${choice.amount}, o próximo resgate é obrigatório`],
    ]);
  } else if (choice.type === 'banker_collateral_card') {
    instruction = `${target}: concluindo uma garantia salva na versão anterior.`;
    progress = 'A carta escolhida ficará no Cofre';
    consequence = `O resgate começa em +${choice.collateralAmount} Dívida`;
    details = detailFields([
      ['Titular', target],
      ['Compatibilidade', 'etapa antiga de escolha manual da carta'],
      ['Resgate', 'substitui uma compra e cobra a Dívida acumulada'],
    ]);
  }

  return {
    category: 'Escolha obrigatoria agora',
    name: names[choice.type] || 'Decisao obrigatoria',
    speech: '',
    description: '',
    details,
    instruction,
    progress,
    consequence,
  };
}

export function buildBossActionPresentation(gameState) {
  const pendingChoice = gameState?.boss?.pendingChoices?.[0];
  if (pendingChoice) return pendingChoicePresentation(gameState, pendingChoice);
  const intent = gameState?.boss?.currentIntent;
  const flow = gameState?.boss?.bossFlow;
  const definition = getBossDefinition(gameState?.boss?.id);
  const feminineBoss = ['dominadora', 'matriarca_esmeralda', 'dimitrescu', 'nehelenia'].includes(definition?.id);
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
    const dominadoraResult = dominadoraResultPresentation(gameState);
    if (dominadoraResult) return dominadoraResult;
    const bankerStatus = bankerStatusPresentation(gameState);

    if (bankerStatus) {
      return bankerStatus;
    }

    const matriarchStatus = matriarchStatusPresentation(gameState);

    if (matriarchStatus) {
      return matriarchStatus;
    }

    const dimitrescuStatus = dimitrescuStatusPresentation(gameState);

    if (dimitrescuStatus) {
      return dimitrescuStatus;
    }

    const neheleniaStatus = neheleniaStatusPresentation(gameState);
    if (neheleniaStatus) return neheleniaStatus;

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
    const dimitrescuStatus = dimitrescuStatusPresentation(gameState);
    if (dimitrescuStatus) return dimitrescuStatus;

    const finalOrderMarks = (gameState.boss?.effects || []).filter((effect) => effect.id === 'final_order_mark');
    if (finalOrderMarks.length) {
      const meldCardIds = new Set((gameState.teams || []).flatMap((team) => (team.melds || []).flatMap((meld) => (meld || []).map((card) => card?.id).filter(Boolean))));
      const lines = finalOrderMarks.map((effect) => `${meldCardIds.has(effect.cardId) ? '☑' : '☐'} ${playerName(gameState, effect.playerId)} — ${cardLabelAnywhere(gameState, effect.cardId)}${meldCardIds.has(effect.cardId) ? ' · usada em jogo' : ' · use em jogo'}`);
      return {
        category: 'Ordem aceita em vigor',
        name: 'Ordem Final',
        speech: '',
        description: '',
        details: [],
        instruction: 'As cartas marcadas precisam entrar em jogo até o fim do turno de cada jogador.',
        progress: lines.join('\n'),
        consequence: 'Cada carta marcada que não entrar em jogo: +1 Chicote',
      };
    }

    const orders = (gameState.boss?.activeOrders || []).filter(order => order.status === 'active' && order.sourceAbilityId === 'forced_choice');
    if (orders.length) return {
      category: 'Ordem aceita em vigor', name: 'Escolha Forçada', speech: '', description: '', details: [],
      instruction: orders.map(order => `${playerName(gameState, order.targetPlayerId)}: ${order.description || order.label || order.type}`).join(' · '),
      progress: 'Prazo: fim do turno do jogador marcado', consequence: 'Descumprir: +1 Chicote',
    };
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
    if (intent.abilityId === 'fixed_interest') {
      const fullDebt = payload.fullDebt ?? payload.amount ?? (phase === 3 ? 16 : 12);
      const guaranteedDebt = payload.guaranteedDebt ?? payload.collateralAmount ?? (phase === 3 ? 7 : 5);
      const interestStep = payload.interestStep ?? (phase === 3 ? 3 : 2);
      details = [
        `Integral: +${fullDebt} de Dívida`,
        `Cofre: carta aleatória · resgate começa em +${guaranteedDebt}`,
        `Adiar resgate: +${interestStep} por turno, até +${fullDebt}`,
      ];
    } else if (intent.abilityId === 'maintenance_fee') {
      details = [
        `Cada jogador: +${payload.extraDraw ?? (phase === 3 ? 2 : 1)} carta(s) FINANCIADA(S)`,
        'Quitação: a carta precisa entrar em um jogo neste turno',
        `Descartar ou terminar com ela na mão: +${payload.financedDebt ?? (phase === 3 ? 7 : 5)} de Dívida cada`,
      ];
    } else if (intent.abilityId === 'credit_block') details = ['Lixo bloqueado nesta rodada'];
    else if (intent.abilityId === 'suit_audit')
      details = [
        `Meta: ${payload.required} cartas de ${payload.suitLabel}`,
        `Progresso: ${payload.progress || 0}/${payload.required}`,
        'Sucesso: sem cobrança',
        `Falha: +${payload.failureDelta ?? (phase === 3 ? 16 : 12)} de Dívida`,
      ];
    else if (intent.abilityId === 'pledge') details = [`Jogo bloqueado: ${payload.meldIndex == null ? 'nenhum' : `#${Number(payload.meldIndex) + 1}`}`, 'Não pode receber cartas nesta rodada'];
    else if (intent.abilityId === 'compound_interest') {
      const totalCards = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      const safeMax = payload.safeMax ?? 7;
      const warningMax = payload.warningMax ?? 13;
      const currentDebt = totalCards <= safeMax ? payload.safeDebt : totalCards <= warningMax ? payload.warningDebt : payload.dangerDebt;
      details = [`Cartas nas mãos: ${totalCards}`, `Cobrança atual: +${currentDebt} de Dívida`];
    } else if (intent.abilityId === 'credit_limit') {
      const limit = gameState.boss.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      details = [
        `Uso: ${counted}/${limit.allowance || payload.allowance} cartas da mão`,
        `Excedente: +${limit.debtPerCard || payload.debtPerCard} por carta`,
        `Teto: +${limit.maxCharge || payload.maxCharge}`,
      ];
    } else if (intent.abilityId === 'discard_surcharge') {
      const surcharge = gameState.boss.discardSurcharge || payload;
      details = [`Primeira retirada do lixo: +${surcharge.amount || payload.amount} de Dívida`, 'Comprar do monte evita o Ágio'];
    }
  } else if (gameState.boss.id === 'dominadora') details = dominatrixDetails(gameState, intent);
  else if (gameState.boss.id === 'dimitrescu') details = dimitrescuDetails(gameState, intent);
  else if (gameState.boss.id === 'nehelenia') details = [];
  else details = matriarchDetails(gameState, intent);

  const compact = compactAction(gameState, intent);

  return {
    category: flow?.stage === 'ability' ? `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}` : actionCategory(intent),
    name: intent.name,
    speech:
      intent.abilityId === 'collar' && collarCards.length === 1
        ? 'Uma das suas opcoes agora me pertence.'
        : (gameState.boss.id === 'banker' ? BANKER_SPEECHES : gameState.boss.id === 'dominadora' ? DOMINATRIX_SPEECHES : gameState.boss.id === 'dimitrescu' ? DIMITRESCU_SPEECHES : gameState.boss.id === 'nehelenia' ? NEHELENIA_SPEECHES : MATRIARCH_SPEECHES)[intent.abilityId] || intent.name,
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
    dangerLabel: boss?.id === 'dominadora' ? 'Chicotes finais' : boss?.id === 'matriarca_esmeralda' ? 'Florescimento final' : boss?.id === 'dimitrescu' ? 'Sede final' : boss?.id === 'nehelenia' ? 'Espelhos roubados' : 'Dívida final',
    danger: boss?.id === 'dominadora' ? chainSummary : `${Number(boss?.danger || 0)} / ${Number(boss?.maxDanger || 0)}`,
    totalDamage: Number(boss?.stats?.totalDamage || 0),
    canastras: Number(boss?.stats?.canastrasFormed || 0),
    rounds: Number(boss?.roundNumber || 1),
    finalStrike: Number(boss?.stats?.finalStrike || finalStrike?.damage || 0),
  };
}
