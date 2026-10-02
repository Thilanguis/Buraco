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
  const suffix = (label) => label ? ` · ${label}` : '';
  if (completed) return `✅ ${required}/${required}${suffix(labels.success)}`;
  if (status === 'failed') return `❌ ${current}/${required}${suffix(labels.failed)}`;
  if (status === 'cancelled') return `— ${current}/${required}${suffix(labels.cancelled)}`;
  return `⬜ ${current}/${required}${suffix(labels.pending)}`;
}

function stateProgress(status = 'active', labels = {}) {
  if (status === 'success') return `✅ ${labels.success || 'Concluído'}`;
  if (status === 'failed') return `❌ ${labels.failed || 'Falhou'}`;
  if (status === 'cancelled' || status === 'expired') return `— ${labels.cancelled || 'Cancelado'}`;
  return labels.active || 'Ativo';
}

function groupedObjectiveProgress(threats = []) {
  const required = threats.length;
  if (!required) return 'Aguardando';
  const completed = threats.filter((threat) => threat.status === 'success').length;
  const active = threats.some((threat) => threat.status === 'active');
  const failed = threats.filter((threat) => threat.status === 'failed').length;
  const cancelled = threats.filter((threat) => threat.status === 'cancelled').length;
  if (active) return objectiveProgress(completed, required, 'active');
  if (completed === required) return objectiveProgress(completed, required, 'success');
  if (failed) return `❌ ${completed}/${required}`;
  if (cancelled) return `— ${completed}/${required}`;
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
    const marker = threat.status === 'success' ? '✅' : threat.status === 'failed' ? '✕' : threat.status === 'cancelled' ? '—' : '☐';
    const result = threat.status === 'success' ? ' · concluído' : threat.status === 'failed' ? ` · falhou${threat.bloomApplied ? ` (+${threat.bloomApplied} Flor)` : ''}` : threat.status === 'cancelled' ? ' · cancelado sem efeito' : '';
    return `${marker} ${royalBloomObjectiveLabel(gameState, threat)}${result}`;
  });
  return lines.join('\n');
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
    const marker = objective.status === 'success' ? '✅' : objective.status === 'failed' ? '✕' : '☐';
    const suffix = objective.status === 'success' ? ' · concluído' : objective.status === 'failed' ? ' · falhou' : '';
    return `${marker} ${dimitrescuDaughterObjectiveLabel(gameState, objective)}${suffix}`;
  });
  return lines.join('\n');
}

function crimsonBrandProgress(gameState, intent) {
  const marks = intent?.payload?.marks || [];
  if (!marks.length) return 'Marcas sendo preparadas';
  const done = marks.filter((mark) => mark.status === 'success').length;
  const lines = marks.map((mark) => {
    const marker = mark.status === 'success' ? '✅' : mark.status === 'failed' ? '✕' : '☐';
    const result = mark.status === 'success' ? ' · removida' : mark.status === 'failed' ? ' · sangrou' : '';
    return `${marker} ${playerName(gameState, mark.playerId)}: ${cardLabelAnywhere(gameState, mark.cardId)}${result}`;
  });
  return lines.join('\n');
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
    return `☣️ ${contaminatedCard} no Lixo`;
  }
  if (intent.abilityId === 'harvest') {
    const player = playerById(gameState, intent.payload?.targetPlayerId);
    const threat = threats[0];
    const cards = Number.isFinite(Number(threat?.observedHandSize)) ? Number(threat.observedHandSize) : player?.hand?.length || 0;
    const reductionNeeded = Math.max(0, cards - 7);
    const targetName = player?.name || playerName(gameState, intent.payload?.targetPlayerId) || 'Jogador';
    if (threat?.status === 'success') return `✅ ${targetName} — terminou com ${cards} carta${cards === 1 ? '' : 's'} · meta cumprida`;
    if (threat?.status === 'failed') {
      const result = [threat.bloomApplied ? `+${threat.bloomApplied} Flor` : '', threat.healApplied ? `cura ${threat.healApplied} HP` : ''].filter(Boolean).join(' · ');
      return `✕ ${targetName} — terminou com ${cards} cartas${result ? ` · ${result}` : ''}`;
    }
    if (threat?.status === 'cancelled') return `— ${targetName} — Colheita cancelada`;
    if (cards <= 7) return `✅ ${targetName}: ${cards} cartas`;
    return `☐ ${targetName}: ${cards} cartas · tire ${reductionNeeded}`;
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

function crownThreatCompactObjective(gameState, threat) {
  if (!threat) return 'Sem alvo válido';
  if (['seed', 'royal_seed'].includes(threat.type)) return `${playerName(gameState, threat.targetPlayerId)}: use ${cardLabelAnywhere(gameState, threat.cardId)}`;
  if (['pollen', 'royal_pollen'].includes(threat.type)) return `Não recolha ${cardLabelAnywhere(gameState, threat.discardCardId)}`;
  if (['root', 'twin_root', 'royal_root'].includes(threat.type)) return threat.strengthened
    ? `Cada jogador: Jogo ${Number(threat.meldIndex) + 1}`
    : `Alimente o Jogo ${Number(threat.meldIndex) + 1}`;
  if (threat.type === 'graft') return 'Alimente os 2 jogos';
  if (threat.type === 'dew') return 'Baixe 6 cartas';
  if (threat.type === 'harvest') return `${playerName(gameState, threat.targetPlayerId)}: até 7 cartas`;
  return 'Cumpra o objetivo marcado';
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
      return playerCards.map((entry) => `☐ ${playerName(gameState, player.id)}: ${cardLabelAnywhere(gameState, entry.cardId)}`);
    }

    const pendingDraw = boss.pendingFinancedDrawsByPlayer?.[player.id];
    if (pendingDraw?.sourceActionId === intent.id) return [`☐ ${playerName(gameState, player.id)}: recebendo`];
    if (maintenance?.pendingPlayerIds?.includes(player.id)) return [`☐ ${playerName(gameState, player.id)}: aguardando`];

    const resolved = [...(boss.eventLog || [])].reverse().find((event) => event.type === 'financedCharge'
      && event.round === boss.roundNumber
      && event.playerId === player.id
      && (!event.sourceActionId || event.sourceActionId === intent.id));
    if (resolved) {
      return [resolved.dangerDelta
        ? `✕ ${playerName(gameState, player.id)}: +${resolved.dangerDelta} Dívida`
        : `✅ ${playerName(gameState, player.id)}: quitada`];
    }

    return [`☐ ${playerName(gameState, player.id)}: aguardando`];
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
  return status === 'success' ? '✅' : status === 'failed' ? '✕' : status === 'cancelled' ? '—' : '☐';
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
    if (payload.fed) return `✅ ${target}: verdadeiro`;
    if (payload.failed) return `✕ ${target}: reflexo falso`;
    return `☐ ${target}: escolha I ou II`;
  }
  if (intent.abilityId === 'follow_reflection') {
    const firstName = playerName(gameState, payload.firstPlayerId);
    const secondName = playerName(gameState, payload.secondPlayerId);
    const locked = payload.patternLocked === true;
    const first = locked ? Math.max(0, Number(payload.patternCount) || 0) : Math.max(0, Number(payload.firstPlayedCount) || 0);
    const second = Math.max(0, Number(payload.secondPlayedCount) || 0);
    return locked
      ? `1º ${firstName}: padrão ${first}\n2º ${secondName}: ${second}/${first}`
      : `1º ${firstName}: ${first} carta${first === 1 ? '' : 's'}\n2º ${secondName}: aguarda`;
  }
  if (intent.abilityId === 'mirror_prison') {
    return `${payload.fed ? '✅' : '☐'} ${playerName(gameState, payload.rescuerPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  }
  if (intent.abilityId === 'tiger_link') {
    const fed = new Set(payload.fedMeldIds || []);
    return (payload.targets || []).map((target) => `${fed.has(target.meldId) ? '✅' : '☐'} Jogo ${Number(target.meldIndex) + 1}`).join(' · ');
  }
  if (intent.abilityId === 'tiger_prey') {
    return `${payload.fed ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  }
  if (intent.abilityId === 'hawk_suit') {
    return `${payload.discardedCorrectSuit ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: ${payload.suitLabel || payload.suit}`;
  }
  if (intent.abilityId === 'hawk_watch') {
    return `👁 ${playerName(gameState, payload.targetPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  }
  if (intent.abilityId === 'fish_marked_card') {
    const done = payload.used || payload.discarded;
    return `${done ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: ${cardLabelAnywhere(gameState, payload.cardId)}`;
  }
  if (intent.abilityId === 'fish_inverted') {
    return `${payload.fedExisting ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: jogo existente`;
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

function buildBossRangeMeters(gameState, intent) {
  if (!intent?.abilityId) return [];
  const payload = intent.payload || {};
  const boss = gameState.boss || {};

  if (boss.id === 'dimitrescu' && intent.abilityId === 'blood_tithe') {
    const phase = Number(intent.announcedPhase) || 1;
    const medium = phase === 3 ? 6 : 4;
    const heavy = phase === 3 ? 10 : 8;
    const players = (gameState.players || []).map((player) => {
      const cards = player.hand?.length || 0;
      const amount = cards >= 11 ? heavy : cards >= 8 ? medium : 0;
      return {
        label: player.name || 'Jogador',
        value: cards,
        amount,
        tone: cards >= 11 ? 'danger' : cards >= 8 ? 'warning' : 'safe',
      };
    });
    const maxCards = Math.max(0, ...players.map((player) => player.value));
    const projectedBlood = players.reduce((sum, player) => sum + player.amount, 0);
    const maximum = Math.max(14, maxCards);
    const worstTone = players.some((player) => player.tone === 'danger')
      ? 'danger'
      : players.some((player) => player.tone === 'warning')
        ? 'warning'
        : 'safe';
    const playerSummary = players
      .map((player) => `${player.label} ${player.value}`)
      .join(' · ');

    return [{
      label: playerSummary || 'Cooperadores',
      value: maxCards,
      unit: 'cartas',
      max: maximum,
      tone: worstTone,
      currentEffect: projectedBlood > 0 ? `+${projectedBlood} SEDE` : 'SEM TRIBUTO',
      ariaLabel: [
        ...players.map((player) => `${player.label}: ${player.value} cartas, ${player.amount > 0 ? `+${player.amount} Sede` : 'sem tributo'}`),
        `Cobrança projetada: +${projectedBlood} Sede`,
      ].join('. '),
      markers: players.map((player, index) => ({
        label: player.label,
        value: player.value,
        tone: player.tone,
        index,
      })),
      segments: [
        { from: 0, to: 7, label: '0–7', effect: 'sem efeito', tone: 'safe' },
        { from: 8, to: 10, label: '8–10', effect: `+${medium} Sede`, tone: 'warning' },
        { from: 11, to: null, label: '11+', effect: `+${heavy} Sede`, tone: 'danger' },
      ],
    }];
  }

  if (boss.id === 'matriarca_esmeralda' && intent.abilityId === 'harvest') {
    const target = playerById(gameState, payload.targetPlayerId);
    const cards = target?.hand?.length || 0;
    return [{
      label: target?.name || 'Alvo',
      value: cards,
      unit: cards === 1 ? 'carta' : 'cartas',
      max: Math.max(14, cards),
      tone: cards >= 11 ? 'danger' : cards >= 8 ? 'warning' : 'safe',
      currentEffect: cards >= 11 ? '+1 FLOR · CURA 80 HP' : cards >= 8 ? 'CURA 50 HP' : 'SEM EFEITO',
      segments: [
        { from: 0, to: 7, label: '0–7', effect: 'sem efeito', tone: 'safe' },
        { from: 8, to: 10, label: '8–10', effect: 'cura 50 HP', tone: 'warning' },
        { from: 11, to: null, label: '11+', effect: '+1 Flor · cura 80 HP', tone: 'danger' },
      ],
    }];
  }

  if (boss.id === 'matriarca_esmeralda' && intent.abilityId === 'restorative_dew') {
    const threat = natureThreatsForIntent(gameState, intent)[0];
    const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
    const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || boss.phase || 1;
    const healing = getRestorativeDewHealing(phase, counted);
    return [{
      label: 'Cartas novas na mesa',
      value: counted,
      unit: counted === 1 ? 'carta' : 'cartas',
      max: Math.max(6, counted),
      tone: counted >= 6 ? 'safe' : counted >= 2 ? 'warning' : 'danger',
      currentEffect: healing > 0 ? `CURA ${healing} HP` : 'CURA ZERADA',
      segments: [
        { from: 0, to: 1, label: '0–1', effect: `cura ${getRestorativeDewHealing(phase, 0)} HP`, tone: 'danger' },
        { from: 2, to: 3, label: '2–3', effect: `cura ${getRestorativeDewHealing(phase, 2)} HP`, tone: 'warning' },
        { from: 4, to: 5, label: '4–5', effect: `cura ${getRestorativeDewHealing(phase, 4)} HP`, tone: 'warning' },
        { from: 6, to: null, label: '6+', effect: 'cura 0', tone: 'safe' },
      ],
    }];
  }

  if (boss.id === 'banker' && intent.abilityId === 'compound_interest') {
    const total = (gameState.players || []).reduce((sum, player) => sum + (player.hand?.length || 0), 0);
    const safeMax = payload.safeMax ?? 7;
    const warningMax = payload.warningMax ?? 13;
    const phase3 = Number(intent.announcedPhase) === 3;
    const safeDebt = payload.safeDebt ?? (phase3 ? 8 : 6);
    const warningDebt = payload.warningDebt ?? (phase3 ? 12 : 10);
    const dangerDebt = payload.dangerDebt ?? (phase3 ? 16 : 14);
    const currentDebt = total <= safeMax ? safeDebt : total <= warningMax ? warningDebt : dangerDebt;
    return [{
      label: 'Equipe',
      value: total,
      unit: total === 1 ? 'carta' : 'cartas',
      max: Math.max(warningMax + 5, total),
      tone: total > warningMax ? 'danger' : total > safeMax ? 'warning' : 'safe',
      currentEffect: `+${currentDebt} DÍVIDA`,
      segments: [
        { from: 0, to: safeMax, label: `0–${safeMax}`, effect: `+${safeDebt} Dívida`, tone: 'safe' },
        { from: safeMax + 1, to: warningMax, label: `${safeMax + 1}–${warningMax}`, effect: `+${warningDebt} Dívida`, tone: 'warning' },
        { from: warningMax + 1, to: null, label: `${warningMax + 1}+`, effect: `+${dangerDebt} Dívida`, tone: 'danger' },
      ],
    }];
  }

  if (boss.id === 'banker' && intent.abilityId === 'credit_limit') {
    const limit = boss.creditLimit || payload;
    const counted = new Set(limit.countedCardIds || []).size;
    const allowance = Number(limit.allowance || payload.allowance) || 0;
    const debtPerCard = Number(limit.debtPerCard || payload.debtPerCard) || 1;
    const maxCharge = Number(limit.maxCharge || payload.maxCharge) || debtPerCard;
    const chargedDebt = Number(limit.chargedDebt) || 0;
    const maxExceededCards = Math.max(1, Math.ceil(maxCharge / debtPerCard));
    return [{
      label: 'Franquia compartilhada',
      value: counted,
      unit: counted === 1 ? 'carta' : 'cartas',
      max: Math.max(allowance + maxExceededCards, counted),
      tone: counted > allowance ? 'danger' : 'safe',
      currentEffect: counted > allowance ? `+${chargedDebt} / +${maxCharge} DÍVIDA` : 'DENTRO DA FRANQUIA',
      segments: [
        { from: 0, to: allowance, label: `0–${allowance}`, effect: 'sem cobrança', tone: 'safe' },
        { from: allowance + 1, to: null, label: `${allowance + 1}+`, effect: `+${debtPerCard}/carta · teto +${maxCharge}`, tone: 'danger' },
      ],
    }];
  }

  return [];
}


const BOSS_HELP_ABILITY_IDS = new Set([
  // Banqueiro — termos/escopo que nao cabem no HUD curto.
  'fixed_interest',
  'maintenance_fee',
  'credit_limit',

  // Dominadora — efeitos compartilhados, persistentes ou com estado especial.
  'forced_choice',
  'possession',
  'hands_tied',
  'separation',
  'absolute_control',
  'break_will',
  'final_order',

  // Dimitrescu — efeitos persistentes/condicionais.
  'cassandra_dead_feast',
  'crimson_clot',

  // Matriarca — propagacao, objetivos compostos e protecoes.
  'hungry_root',
  'graft',
  'royal_bloom',
  'emerald_cocoon',
  'spring_crown',

  // Nehelenia / capangas — ilusoes, persistencia e termos proprios.
  'mirrored_meld',
  'follow_reflection',
  'discard_mirror',
  'mirror_prison',
  'eternal_nightmare',
  'tiger_link',
  'tiger_prey',
  'hawk_suit',
  'hawk_watch',
  'fish_marked_card',
  'fish_inverted',
]);

function bossAbilityHelpSupplement(gameState, intent) {
  const payload = intent?.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);

  switch (intent?.abilityId) {
    case 'fixed_interest':
      return 'Cofre: 1 carta do titular fica apreendida. Resgatar substitui a compra normal. Se o titular comprar do Monte e adiar, o resgate sobe +2 por turno nas Fases 1–2 ou +3 na Fase 3, até o valor integral; ao chegar ao limite, o próximo resgate é obrigatório.';
    case 'maintenance_fee':
      return 'FINANCIADA é a carta extra criada pela Tarifa. Ela só quita a cobrança se entrar legalmente em um jogo naquele turno. Descartá-la ou terminar o turno ainda com ela na mão gera a cobrança uma única vez.';
    case 'credit_limit':
      return 'A franquia é compartilhada pela equipe e conta somente cartas que vieram da mão e permaneceram legalmente na mesa. Cartas trazidas pelo Lixo, reorganização e cartas que já estavam em jogo não entram na conta. Só o excedente gera Dívida, até o teto mostrado.';

    case 'forced_choice':
      return 'Se aceitar a ordem, ela vale para o próximo turno do alvo. A Dominadora só oferece uma ordem que pode ser cumprida naquele momento. Se uma mudança externa tornar a ordem impossível, ela é cancelada sem Chicote; se o próprio jogador gastar voluntariamente a forma de cumprir, conta como desobediência.';
    case 'possession':
      return 'A Posse suspende somente o dano antigo do jogo marcado. Cartas novas ainda causam o dano individual normal. O jogo é libertado quando cada cooperador contribui ao menos 1 carta ou quando ele evolui de categoria; nesse momento, apenas o dano antigo suspenso volta a ser aplicado.';
    case 'hands_tied':
      return 'O limite é da equipe inteira: existe apenas 1 jogo novo disponível na rodada. Assim que qualquer cooperador usar essa criação, os dois só podem alimentar jogos existentes até a rodada terminar.';
    case 'separation':
      return 'Nesta rodada, o primeiro cooperador que alimentar um jogo fica vinculado a ele: o parceiro não pode alimentar esse mesmo jogo. Os outros jogos continuam livres.';
    case 'absolute_control':
      return `Neste efeito, ${target} é tratado como Dominado durante o próximo turno: não pode pegar o Lixo nem criar jogo novo, mas pode comprar do Monte e alimentar jogos existentes.`;
    case 'break_will':
      return 'Quebra de Vontade só escolhe um jogador que já tenha pelo menos 2 Chicotes. Ele decide entre receber outro Chicote ou aceitar a alternativa de retirar uma carta válida de canastra.';
    case 'final_order':
      return 'Cada cooperador decide separadamente: pode recusar e receber +1 Chicote agora, ou aceitar usar as 2 cartas marcadas em jogos no próximo turno. Se aceitar, 2/2 usadas = 0 Chicotes; 1/2 = +1; 0/2 = +2. Descartar carta marcada não cumpre a ordem.';

    case 'cassandra_dead_feast':
      return 'A maldição permanece no próximo Morto até ele ser tomado. Normalmente isso aumenta a Sede e cura Lady. Se a equipe já tiver Canastra Real ou Ás-a-Ás quando conquistar o Morto, ele é purificado: a Sede sobe apenas +4 e a cura é anulada.';
    case 'crimson_clot':
      return 'O Coágulo recebe o dano antes de Lady. Romper toda a proteção reduz 6 de Sede. Se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.';

    case 'hungry_root':
      return 'Se a Raiz falhar, ela pode gerar uma única nova Raiz na rodada seguinte. Uma Raiz que nasceu dessa propagação não se propaga de novo.';
    case 'graft':
      return 'Os dois jogos ligados são objetivos separados. Cada um precisa receber ao menos 1 carta legal nesta rodada; alimentar apenas um lado ainda deixa o outro em falha.';
    case 'royal_bloom':
      return 'Florescimento Real combina vários objetivos naturais, mas cada um é resolvido separadamente. Cumprir um objetivo não compensa outro que falhou; cada falha acrescenta a própria Flor.';
    case 'emerald_cocoon':
      return 'O dano comum atinge primeiro os 180 pontos do Casulo; o excesso passa para o HP. Uma Canastra Limpa ou superior rompe o Casulo imediatamente. Se ele sobreviver até o fim da rodada, metade da proteção restante vira cura.';
    case 'spring_crown':
      return 'A Coroa acompanha uma ameaça natural da rodada. Se a sequência de falhas preparar uma Raiz Fortalecida, ela exige uma contribuição de cada cooperador. Essa Raiz não cria nova propagação automática.';

    case 'mirrored_meld':
      return `${target} precisa usar exatamente 1 carta legal no jogo espelhado e escolher qual reflexo é o verdadeiro. Errar manda a carta ao fundo do Monte e deixa o jogador Desorientado: ele não pode fazer novas baixadas naquele turno, apenas descartar. Se havia uma Presa Marcada antiga, ela volta a valer depois que o espelho for resolvido.`;
    case 'follow_reflection': {
      const first = playerName(gameState, payload.firstPlayerId);
      const second = playerName(gameState, payload.secondPlayerId);
      return `${first} define o padrão pela quantidade TOTAL de cartas baixadas no turno inteiro. ${second} precisa terminar o próprio turno com exatamente a mesma quantidade; zero também conta. O jogo não bloqueia uma quantidade diferente durante o turno: a comparação acontece somente no final.`;
    }
    case 'discard_mirror':
      return 'Os dois reflexos do topo do Lixo são visualmente idênticos e não existe pista escondida: a escolha é realmente 50/50. Errar sela o Lixo durante a rodada.';
    case 'mirror_prison':
      return 'A Prisão só pode aparecer quando Nehelenia já tomou pelo menos 1 Espelho dos Sonhos. O parceiro indicado precisa alimentar o jogo refletido para devolver 1 Espelho ao jogador preso.';
    case 'eternal_nightmare':
      return 'Primeiro a carta ORIGINAL aparece sozinha. Depois surgem dois reflexos, o rótulo some e os três se embaralham. Nenhum deles recebe pista de verdadeiro ou falso: é preciso acompanhar visualmente a posição da original.';
    case 'tiger_link':
      return 'Tiger liga dois jogos e cada lado precisa receber ao menos 1 carta. Se um lado ficar sem alimentação, as garras permanecem nele até um turno futuro. A carta usada para romper essas garras não causa o dano individual normal.';
    case 'tiger_prey':
      return `A Presa prende somente ${target}. Até esse jogador alimentar o jogo marcado, ele não pode alimentar outro jogo existente. O parceiro continua livre e a Presa atravessa rodadas até ser resolvida. Jogo Espelhado tem precedência temporária, mas não apaga a Presa.`;
    case 'hawk_suit':
      return `Se ${target} descartar outro naipe, Hawk passa a vigiar exatamente a carta descartada. Enquanto ela continuar no topo do Lixo, ninguém pode recolher a pilha. Um novo descarte tira a carta vigiada do topo e encerra o bloqueio.`;
    case 'hawk_watch':
      return `Vigilância vale somente para ${target} e somente sobre o jogo marcado durante esse turno. O parceiro e os outros jogos continuam livres.`;
    case 'fish_marked_card':
      return 'Se a carta marcada continuar na mão no fim do prazo, ela vira Reflexo Morto: continua na mão, não pode entrar em jogo e só é libertada quando for descartada.';
    case 'fish_inverted':
      return `A restrição fica somente em ${target}: antes de abrir jogo novo, esse jogador precisa alimentar um jogo existente. Se não resolver neste turno, o efeito continua nos próximos turnos até ser cumprido.`;
    default:
      return '';
  }
}

export function buildBossAbilityHelp(gameState) {
  if (gameState?.boss?.pendingChoices?.length) return null;
  const intent = gameState?.boss?.currentIntent;
  if (!intent || !BOSS_HELP_ABILITY_IDS.has(intent.abilityId)) return null;

  const text = String(bossAbilityHelpSupplement(gameState, intent) || '').trim();
  if (!text) return null;

  return {
    title: intent.name || 'Ajuda da habilidade',
    text,
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
        instruction: `${holder}: pague agora ou use o Cofre.`,
        progress: [
          `Integral: +${fullDebt} Dívida`,
          `Cofre: +${guaranteedDebt} · 1 carta presa`,
          `Adiar: +${interestStep}/turno`,
        ].join('\n'),
        consequence: '',
      };
    }
    case 'maintenance_fee':
      return {
        instruction: 'Coloque as cartas FINANCIADAS em jogos.',
        progress: maintenanceFeeProgress(gameState, intent),
        consequence: `Não usar: +${payload.financedDebt ?? (intent.announcedPhase === 3 ? 7 : 5)} Dívida/carta`,
      };
    case 'credit_block':
      return { instruction: '🔒 Lixo bloqueado.', progress: '', consequence: 'Até virar a rodada' };
    case 'suit_audit':
      return { instruction: `Baixe ${payload.required} de ${payload.suitLabel}.`, progress: compactBankerProgress(gameState, intent), consequence: `Falha: +${payload.failureDelta} Dívida` };
    case 'pledge':
      return { instruction: `🔒 Jogo ${Number(payload.meldIndex) + 1} bloqueado.`, progress: '', consequence: 'Até a cobrança' };
    case 'compound_interest': {
      const total = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      const safeMax = payload.safeMax ?? 7;
      const warningMax = payload.warningMax ?? 13;
      const phase3 = intent.announcedPhase === 3;
      const safeDebt = payload.safeDebt ?? (phase3 ? 8 : 6);
      const warningDebt = payload.warningDebt ?? (phase3 ? 12 : 10);
      const dangerDebt = payload.dangerDebt ?? (phase3 ? 16 : 14);
      const currentDebt = total <= safeMax ? safeDebt : total <= warningMax ? warningDebt : dangerDebt;
      return {
        instruction: `Equipe: ${total} cartas na mão.`,
        progress: '',
        consequence: `Agora: +${currentDebt} Dívida`,
      };
    }
    case 'credit_limit': {
      const limit = gameState.boss?.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = limit.allowance || payload.allowance || 0;
      const chargedDebt = Number(limit.chargedDebt) || 0;
      const maxCharge = limit.maxCharge || payload.maxCharge || 0;
      return {
        instruction: `Cartas da mão usadas: ${counted}/${allowance} sem custo.`,
        progress: '',
        consequence: counted > allowance ? `+${chargedDebt} Dívida · teto +${maxCharge}` : 'Sem cobrança',
      };
    }
    case 'discard_surcharge':
      return { instruction: `1ª retirada do Lixo: +${payload.amount} Dívida.`, progress: '', consequence: 'Monte evita a cobrança' };
    case 'collar':
      return { instruction: `${target}: ${collarCards.join(' e ')} bloqueada(s).`, progress: '', consequence: 'Até fim do turno' };
    case 'exposure': {
      const targetPlayer = playerById(gameState, payload.targetPlayerId);
      const completed = !targetPlayer?.hand?.some((entry) => entry.id === payload.cardId);

      const exposedCard = card || 'a carta exposta';

      return {
        instruction: completed ? `✅ ${target}: ${exposedCard} usada.` : `${target}: use ${exposedCard}.`,
        progress: completed ? '✅ 1/1' : '⬜ 0/1',
        consequence: completed ? 'Sem Chicote' : 'Falha: +1 Chicote',
      };
    }
    case 'forced_choice':
      return { instruction: `${target}: aceite a ordem ou receba +1 Chicote.`, progress: payload.order?.label || '', consequence: 'Escolha agora' };
    case 'forced_swap':
      return { instruction: 'Troca de 1 carta entre os cooperadores.', progress: '', consequence: 'Automático' };
    case 'possession': {
      const possession = (gameState.boss?.possessions || []).find((entry) => (payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex));
      return {
        instruction: `Jogo ${Number(payload.meldIndex) + 1}: dano antigo suspenso.`,
        progress: `Contribuição: ${possession?.contributorPlayerIds?.length || 0}/${possession?.required || gameState.players?.length || 2}`,
        consequence: 'Libera com os 2 jogadores ou evolução',
      };
    }
    case 'absolute_control':
      return { instruction: `${target}: Dominado neste turno.`, progress: '', consequence: 'Sem Lixo · sem jogo novo' };
    case 'double_collar':
      return { instruction: '1 carta de cada jogador bloqueada.', progress: '', consequence: 'Nesta rodada' };
    case 'separation':
      return { instruction: 'Cada jogo pode ser alimentado por só 1 jogador.', progress: '', consequence: 'Nesta rodada' };
    case 'hands_tied': {
      const consumed = payload.teamMeldAvailable === false;
      const consumedBy = payload.consumedByPlayerId == null ? null : playerName(gameState, payload.consumedByPlayerId);

      if (consumed) {
        return {
          instruction: 'Limite de jogo novo já usado.',
          progress: `✅ 1/1${consumedBy ? ` · ${consumedBy}` : ''}`,
          consequence: 'Agora só jogos existentes',
        };
      }

      return {
        instruction: 'Máx. 1 jogo novo nesta rodada.',
        progress: '⬜ 0/1',
        consequence: 'Depois: só jogos existentes',
      };
    }
    case 'favorite':
      return { instruction: `${playerName(gameState, payload.protectedPlayerId)} protegida · ${playerName(gameState, payload.punishedPlayerId)} +1 Chicote.`, progress: '', consequence: '' };
    case 'break_will':
      return { instruction: `${target}: escolha a punição no fim da rodada.`, progress: '', consequence: 'Chicote ou canastra' };
    case 'final_order': {
      const orders = payload.orders || [];
      const lines = orders.map((order) => `☐ ${playerName(gameState, order.playerId)} — ${(order.cardIds || []).map((cardId) => cardLabelAnywhere(gameState, cardId)).join(' e ')}`);
      return {
        instruction: 'Use as 2 cartas marcadas em jogos.',
        progress: lines.join('\n'),
        consequence: 'Recusar +1 · Aceitou: +1 por carta não usada',
      };
    }
    case 'iron_etiquette':
      return {
        instruction: `${target}: descarte ${payload.suitLabel}.`,
        progress: '⬜ 0/1',
        consequence: 'Outro naipe: +1 Chicote',
      };
    case 'interdict':
      return {
        instruction: `Jogo ${Number(payload.meldIndex) + 1}: não evolua de categoria.`,
        progress: '',
        consequence: 'Evoluir: cancelar ou +1 Chicote',
      };
    case 'bela_hunt': {
      const completed = payload.used === true;
      return { instruction: completed ? `✅ ${target}: ${card} usada.` : `${target}: use ${card}.`, progress: completed ? '✅ Resolvido' : '🩸 Caçando', consequence: completed ? 'Sede -3' : `Falha: +${Number(intent.announcedPhase) === 3 ? 16 : 14} Sede` };
    }
    case 'cassandra_feast':
      return { instruction: `Alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: payload.fed ? '✅ Resolvido' : '⬜ Pendente', consequence: payload.fed ? 'Sede -4' : `Falha: +${Number(intent.announcedPhase) === 3 ? 18 : 16} Sede` };
    case 'daniela_swarm':
      return { instruction: '☣️ Não pegue o Lixo.', progress: payload.triggered ? '❌ Ativado' : '⬜ Seguro', consequence: payload.triggered ? 'Sede aumentou' : `Evitar -3 · Pegar +${Number(intent.announcedPhase) === 3 ? 15 : 12} Sede` };
    case 'blood_tithe': {
      const phase = Number(intent.announcedPhase) || 1;
      const medium = phase === 3 ? 6 : 4;
      const heavy = phase === 3 ? 10 : 8;
      const projected = (gameState.players || []).reduce((sum, player) => {
        const cards = player.hand?.length || 0;
        return sum + (cards >= 11 ? heavy : cards >= 8 ? medium : 0);
      }, 0);
      return {
        instruction: 'Reduza as duas mãos antes do fim da rodada.',
        progress: '',
        consequence: `Previsto: +${projected} Sede`,
      };
    }
    case 'red_wine':
      return { instruction: `Lady gasta ${payload.bloodCost || 15} Sede para curar.`, progress: `Sede ${gameState.boss?.danger || 0}/100`, consequence: `Cura até ${payload.healAmount || 0} HP` };
    case 'crimson_brand':
      return { instruction: 'Use cada carta marcada em um jogo.', progress: crimsonBrandProgress(gameState, intent), consequence: `Sucesso -2 · Falha +${Number(intent.announcedPhase) === 3 ? 9 : 7} Sede` };
    case 'cassandra_dead_feast': {
      const curse = gameState.boss?.bloodiedDead;
      const active = curse?.status === 'active';
      return {
        instruction: `Morto ${Number(payload.deadIndex) + 1} amaldiçoado.`,
        progress: active ? '🩸 MALDIÇÃO ATIVA NO MORTO' : 'A profanação foi preparada',
        consequence: `Tomar: +${payload.bloodAmount || 0} Sede · cura ${payload.healAmount || 0} HP`,
      };
    }
    case 'crimson_clot': {
      const clot = gameState.boss?.crimsonClot;
      const remaining = clot?.status === 'active' ? Math.max(0, Number(clot.remaining) || 0) : 0;
      const maximum = Math.max(1, Number(clot?.max || payload.amount) || 1);
      return { instruction: 'Quebre o Coágulo.', progress: clot?.status === 'active' ? `🩸 ${remaining}/${maximum}` : 'Preparado', consequence: 'Falha: 50% restante vira cura' };
    }
    case 'castle_lockdown':
      return { instruction: '🔒 Lixo fechado.', progress: '', consequence: 'Use o Monte' };
    case 'three_daughters': {
      const objectives = payload.objectives || [];
      return { instruction: 'Cumpra os objetivos de Bela, Cassandra e Daniela.', progress: dimitrescuMultiObjectiveProgress(gameState, objectives), consequence: 'Cada um: sucesso -2 · falha +8 Sede' };
    }
    case 'living_seed':
      return { instruction: `${target}: use ${card}.`, progress: compactNatureProgress(gameState, intent), consequence: 'Falha: +1 Flor' };
    case 'hungry_root':
      return { instruction: `Alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: compactNatureProgress(gameState, intent), consequence: 'Falha: +1 Flor' };
    case 'restorative_dew': {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const counted = new Set(threat?.countedCardIds || payload.countedCardIds || []).size;
      const phase = threat?.announcedPhase || payload.announcedPhase || intent.announcedPhase || gameState.boss?.phase || 1;
      const healing = getRestorativeDewHealing(phase, counted);
      return { instruction: 'Baixe cartas para reduzir a cura.', progress: '', consequence: `Cura prevista: ${healing} HP` };
    }
    case 'twin_vines':
      return { instruction: `Alimente ${payload.targetCount || payload.targets?.length || 0} jogos marcados.`, progress: compactNatureProgress(gameState, intent), consequence: 'Falha: +1 Flor por raiz' };
    case 'graft':
      return { instruction: 'Alimente os 2 jogos ligados.', progress: compactNatureProgress(gameState, intent), consequence: '0/2: +2 Flores · 1/2: +1' };
    case 'discard_pollen': {
      const threat = natureThreatsForIntent(gameState, intent)[0];
      const contaminatedCard = cardLabelAnywhere(gameState, threat?.discardCardId || payload.discardCardId);
      return {
        instruction: `☣️ Não recolha ${contaminatedCard}.`,
        progress: compactNatureProgress(gameState, intent),
        consequence: 'Se vier: +1 Flor · cura até 40 HP',
      };
    }
    case 'harvest':
      return {
        instruction: `${target}: termine com até 7 cartas.`,
        progress: '',
        consequence: 'Mais cartas = efeito pior',
      };
    case 'royal_bloom':
      return { instruction: 'Cumpra cada objetivo marcado.', progress: compactNatureProgress(gameState, intent), consequence: '+1 Flor por falha' };
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
        instruction: 'Dano comum vai para o Casulo.',
        progress,
        consequence: wasBroken ? 'Proteção encerrada' : 'Canastra Limpa+ rompe',
      };
    }
    case 'spring_crown': {
      const crown = gameState.boss?.springCrown;
      const threat = springCrownMarkedThreat(gameState);
      const name = crownThreatName(gameState);
      const progress =
        crown?.status === 'root_prepared'
          ? `❌ ${name}`
          : crown?.status === 'root_active'
            ? '🌿 Raiz Fortalecida'
            : crown?.status === 'completed'
              ? `✅ ${name}`
              : crown?.status === 'cancelled'
                ? `— ${name}`
                : crownThreatProgress(threat);
      const consequence =
        crown?.status === 'root_active'
          ? 'Raiz Fortalecida ativa'
          : crown?.status === 'root_prepared'
            ? 'Próxima rodada: Raiz Fortalecida'
            : crown?.status === 'completed'
              ? 'Sem efeito extra'
              : crown?.status === 'cancelled'
                ? 'Sem punição'
                : 'Falha: Raiz Fortalecida';
      return {
        instruction: `${name}: ${crownThreatCompactObjective(gameState, threat)}.`,
        progress,
        consequence,
      };
    }
    case 'false_image':
      return { instruction: `${target}: ache o reflexo real.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro: carta presa 1 turno' };
    case 'mirrored_meld':
      return { instruction: `${playerName(gameState, payload.targetPlayerId)}: use 1 carta e escolha o jogo verdadeiro.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Erro: carta ao monte + Desorientado' };
    case 'follow_reflection':
      return { instruction: `${playerName(gameState, payload.firstPlayerId)} define a quantidade · ${playerName(gameState, payload.secondPlayerId)} iguala.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Diferença: +1 Espelho' };
    case 'dream_theft':
      return { instruction: `${target}: ache o reflexo real.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro: perde o Espelho dos Sonhos' };
    case 'discard_mirror':
      return { instruction: `${target}: escolha 1 dos 2 reflexos do Lixo.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro: Lixo selado na rodada' };
    case 'shattered_mirror':
      return { instruction: `${target}: ache o único falso.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro: 2 cartas presas 1 turno' };
    case 'mirror_prison':
      return { instruction: `${playerName(gameState, payload.rescuerPlayerId)}: alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: `Liberta ${playerName(gameState, payload.trappedPlayerId)}` };
    case 'eternal_nightmare':
      return { instruction: `${target}: acompanhe a carta ORIGINAL.`, progress: neheleniaDreamMirrorSummary(gameState), consequence: 'Erro: +1 Espelho' };
    case 'tiger_link':
      return { instruction: 'Alimente os 2 jogos ligados.', progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Falha: garras persistem no lado faltante' };
    case 'tiger_prey':
      return { instruction: `${target}: primeiro alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Até lá: outros jogos bloqueados para o alvo' };
    case 'hawk_suit':
      return { instruction: `${target}: descarte ${payload.suitLabel || payload.suit}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Errar: topo vigiado · Lixo bloqueado' };
    case 'hawk_watch':
      return { instruction: `${target}: não alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Parceiro e outros jogos livres' };
    case 'fish_marked_card':
      return { instruction: `${target}: use ou descarte ${cardLabelAnywhere(gameState, payload.cardId)}.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Falha: carta só poderá ser descartada' };
    case 'fish_inverted':
      return { instruction: `${target}: alimente 1 jogo existente antes de abrir outro.`, progress: neheleniaMirrorProgress(gameState, intent), consequence: 'Persiste até cumprir' };
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

  if (event?.type === 'bossAbility' && event.abilityId === 'blood_tithe') {
    const bands = Array.isArray(event.bloodTitheBands) ? event.bloodTitheBands : [];
    const progress = bands.map((entry) => {
      const cards = Number(entry.cards) || 0;
      const amount = Number(entry.amount) || 0;
      const marker = amount > 0 ? '🩸' : '✅';
      return `${marker} ${playerName(gameState, entry.playerId)} — ${cards} carta${cards === 1 ? '' : 's'} → ${amount > 0 ? `+${amount} Sede` : 'sem tributo'}`;
    }).join('\n');

    return {
      category: RESULT_CATEGORY_BY_ABILITY.blood_tithe,
      name: event.name || 'Tributo de Sangue',
      speech: '',
      description: '',
      details: [...(event.presentation?.details || [])],
      instruction: event.outcome || 'O Tributo de Sangue foi resolvido.',
      progress,
      consequence: `Sede atual: ${Number(boss.danger) || 0}/${Number(boss.maxDanger) || 100}`,
    };
  }

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
      const lines = finalOrderMarks.map((effect) => `${meldCardIds.has(effect.cardId) ? '✅' : '☐'} ${playerName(gameState, effect.playerId)} — ${cardLabelAnywhere(gameState, effect.cardId)}${meldCardIds.has(effect.cardId) ? ' · usada em jogo' : ' · use em jogo'}`);
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
    rangeMeters: buildBossRangeMeters(gameState, intent),
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
    portrait: definition?.phasePortraits?.[Math.max(1, Number(boss?.phase) || 1)] || definition?.portrait || '',
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
