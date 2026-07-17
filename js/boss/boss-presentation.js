import { getBossDefinition } from './boss-registry.js';

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
  spring_crown: 'Cada falha de voces fortalece a minha coroa.',
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

function actionCategory(intent) {
  if (intent.abilityId === 'forced_choice') return 'Escolha imediata';
  if (PREPARED_CHOICE_ABILITIES.has(intent.abilityId)) return 'Escolha preparada';
  if (ACTIVE_RESTRICTIONS.has(intent.abilityId)) return 'Restricao ativa agora';
  if (ROUND_OBJECTIVES.has(intent.abilityId)) return 'Objetivo da rodada';
  if (NATURE_OBJECTIVES.has(intent.abilityId)) return 'Ameaca natural ativa';
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

const detailFields = (entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`);

function dominatrixDetails(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
  const possession = (gameState.boss?.possessions || []).find((entry) => (
    payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex
  ));
  const contributors = (possession?.contributorPlayerIds || []).map((playerId) => playerName(gameState, playerId));

  switch (intent.abilityId) {
    case 'collar': return detailFields([['Alvo', target], [collarCards.length > 1 ? 'Cartas' : 'Carta', collarCards.join(' e ')], ['Duracao', 'ate o fim do turno do alvo'], ['Restricao', 'nao pode jogar nem descartar']]);
    case 'forced_choice': return detailFields([['Alvo', target], ['Resolucao', 'imediatamente apos o anuncio'], ['Escolha', `receber 1 Corrente ou aceitar: ${payload.order?.label || 'uma ordem valida para o proximo turno'}`]]);
    case 'exposure': return detailFields([['Alvo', target], ['Carta', card], ['Duracao', 'ate o fim do turno do alvo'], ['Obrigacao', 'baixar ou adicionar a um jogo'], ['Falha', '1 Corrente se permanecer na mao']]);
    case 'forced_swap': return detailFields([['Alvos', 'os dois cooperadores'], ['Cartas', 'uma carta de cada mao'], ['Efeito', 'a troca acontece depois deste anuncio']]);
    case 'hands_tied': return detailFields([['Alvos', 'equipe inteira'], ['Duracao', 'rodada completa'], ['Criacao compartilhada', payload.teamMeldAvailable === false ? 'consumida' : 'disponivel'], ['Consumida por', playerName(gameState, payload.consumedByPlayerId)], ['Restricao', 'a equipe pode criar somente 1 jogo novo']]);
    case 'possession': return detailFields([['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Contribuicoes', contributors.length ? contributors.join(' e ') : 'nenhum cooperador'], ['Progresso', `${contributors.length}/${possession?.required || gameState.players?.length || 2}`], ['Duracao', 'ate romper a Posse'], ['Restricao', 'o dano do jogo permanece suspenso'], ['Encerramento', 'uma contribuicao de cada jogador ou evolucao de tier']]);
    case 'favorite': return detailFields([['Protegido', playerName(gameState, payload.protectedPlayerId)], ['Punido', playerName(gameState, payload.punishedPlayerId)], ['Correntes do punido', `${chains(gameState, payload.punishedPlayerId)}/4`], ['Efeito', 'protecao e 1 Corrente depois deste anuncio']]);
    case 'double_collar': return detailFields([['Alvos', (payload.lockedCards || []).map((entry) => `${playerName(gameState, entry.playerId)}: ${cardLabel(gameState, entry.playerId, entry.cardId)}`).join('; ')], ['Duracao', 'rodada completa'], ['Restricao', 'nao pode jogar nem descartar as cartas presas']]);
    case 'separation': return detailFields([['Alvos', 'os dois cooperadores'], ['Duracao', 'rodada completa'], ['Restricao', 'cada jogo so pode ser alimentado por um cooperador']]);
    case 'absolute_control': return detailFields([['Alvo', target], ['Duracao', 'turno do jogador alvo'], ['Restricao', 'nao pode criar jogos novos'], ['Encerramento', 'o alvo concluir o turno']]);
    case 'break_will': return detailFields([['Alvo', target], ['Correntes', `${chains(gameState, payload.targetPlayerId)}/4`], ['Resolucao', 'ao final da rodada'], ['Escolha', 'receber 1 Corrente ou retirar carta de canastra']]);
    case 'final_order': return detailFields([['Alvos', 'os dois cooperadores'], ['Resolucao', 'ao final da rodada'], ['Escolha', 'cada jogador recebera uma decisao individual']]);
    case 'iron_etiquette': return detailFields([['Alvo', target], ['Ordem', `descartar ${payload.suitLabel}`], ['Prazo', 'fim do proximo turno do alvo'], ['Desobediencia', '+1 Corrente']]);
    case 'interdict': return detailFields([['Jogo', `#${Number(payload.meldIndex) + 1}`], ['Gatilho', 'primeira tentativa valida de evolucao'], ['Obedecer', 'cancelar somente a tentativa'], ['Desobedecer', 'evoluir e receber +1 Corrente'], ['Duracao', 'esta rodada']]);
    default: return detailFields([['Duracao', 'rodada completa'], ['Efeito', intent.description || 'ordem ativa']]);
  }
}

function matriarchDetails(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const meldLabel = (index) => Number.isInteger(index) ? `Jogo #${index + 1}` : '';
  switch (intent.abilityId) {
    case 'living_seed': return detailFields([['Alvo', target], ['Carta', card], ['Prazo', 'fim do proximo turno do alvo'], ['Falha', '+1 Flor, sem cura']]);
    case 'hungry_root': return detailFields([['Jogo', meldLabel(payload.meldIndex)], ['Prazo', 'fim da rodada'], ['Objetivo', 'adicionar 1 carta legal'], ['Falha', '+1 Flor, sem cura, e pode propagar uma Raiz']]);
    case 'restorative_dew': {
      const counted = new Set(payload.countedCardIds || []).size;
      const baseHeal = payload.baseHeal || 150;
      const reduction = payload.reductionPerCard || 15;
      const required = Math.ceil(baseHeal / reduction);
      return detailFields([['Cartas contabilizadas', `${counted}/${required}`], ['Cura prevista', `${Math.max(0, baseHeal - counted * reduction)} HP`], ['Reducao', `-${reduction} por carta nova unica`], ['Prazo', 'fim da rodada']]);
    }
    case 'twin_vines': return detailFields([['Jogos', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')], ['Objetivo', 'alimentar cada jogo separadamente'], ['Falha por raiz', '+1 Flor, sem cura'], ['Falha dupla', 'pode propagar uma Raiz']]);
    case 'graft': return detailFields([['Jogos ligados', (payload.targets || []).map((entry) => meldLabel(entry.meldIndex)).join(' e ')], ['Objetivo', 'adicionar 1 carta em cada jogo'], ['Falha parcial', '+1 Flor, sem cura'], ['Falha total', '+2 Flores, sem cura, e pode propagar uma Raiz']]);
    case 'discard_pollen': return detailFields([['Carta', gameState.discard?.find((entry) => entry.id === payload.discardCardId) ? `${gameState.discard.find((entry) => entry.id === payload.discardCardId).rank}${gameState.discard.find((entry) => entry.id === payload.discardCardId).suit}` : 'topo do lixo'], ['Objetivo', 'usar a carta no turno em que o lixo for pego'], ['Falha', '+1 Flor e +40 HP']]);
    case 'harvest': return detailFields([['Alvo', target], ['Avaliacao', 'quantidade de cartas no fim do turno'], ['0-7 cartas', 'sem efeito'], ['8-10 cartas', '+60 HP'], ['11+ cartas', '+100 HP e +1 Flor']]);
    case 'royal_bloom': return detailFields([['Objetivos', `${payload.targetCount || payload.objectives?.length || 0}`], ['Tipos', (payload.objectives || []).map((entry) => ({ seed: 'carta', root: 'jogo', pollen: 'lixo' }[entry.type] || entry.type)).join(', ')], ['Falha por objetivo', '+1 Flor, sem cura'], ['Raiz falha', 'pode solicitar uma propagacao']]);
    case 'emerald_cocoon': return detailFields([['Casulo', `${payload.amount || 180} de absorcao`], ['Ruptura', 'canastra limpa ou superior'], ['Fim da rodada', 'cura metade do valor restante']]);
    case 'spring_crown': return detailFields([['Duracao', 'esta rodada'], ['Primeira falha', 'pode solicitar a propagacao normal'], ['Segunda falha', 'fortalece a Raiz propagada valida'], ['Raiz Fortalecida', 'exige uma contribuicao de cada jogador'], ['Cura adicional', 'nenhuma']]);
    default: return detailFields([['Efeito', intent.description || 'ameaca natural ativa']]);
  }
}

function compactAction(gameState, intent) {
  const payload = intent.payload || {};
  const target = playerName(gameState, payload.targetPlayerId);
  const card = cardLabel(gameState, payload.targetPlayerId, payload.cardId);
  const collarCards = cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []));
  switch (intent.abilityId) {
    case 'fixed_interest': return { instruction: `Contrato ${payload.contractTier || 'Padrao'}: ao fim da rodada, pague tudo ou deixe uma garantia.`, progress: '', consequence: `Integral: +${payload.fullDebt ?? payload.amount} · Garantia: +${payload.guaranteedDebt ?? payload.collateralAmount}` };
    case 'maintenance_fee': return { instruction: `Cada jogador comprara +${payload.extraDraw} carta(s).`, progress: '', consequence: 'Compra extra inevitavel' };
    case 'credit_block': return { instruction: 'O lixo esta bloqueado nesta rodada.', progress: '', consequence: 'Encerra na virada da rodada' };
    case 'suit_audit': return { instruction: `Joguem ${payload.required} cartas de ${payload.suitLabel}.`, progress: `${payload.progress || 0}/${payload.required}`, consequence: `Sucesso: ${payload.successDelta} | Falha: +${payload.failureDelta}` };
    case 'pledge': return { instruction: `Jogo ${Number(payload.meldIndex) + 1} nao pode receber cartas.`, progress: '', consequence: 'Libera ao fim da cobranca' };
    case 'compound_interest': {
      const total = gameState.players?.reduce((sum, player) => sum + (player.hand?.length || 0), 0) || 0;
      return { instruction: `${total} cartas nas maos.`, progress: '', consequence: `Estimativa: +${Math.min(12, 4 + Math.floor(total / 4))} de Divida` };
    }
    case 'credit_limit': {
      const limit = gameState.boss?.creditLimit || payload;
      const counted = new Set(limit.countedCardIds || []).size;
      const allowance = limit.allowance || payload.allowance || 0;
      return { instruction: `A equipe possui franquia de ${allowance} cartas novas na mesa.`, progress: `Credito ${counted}/${allowance}`, consequence: `Cobranca acumulada: ${limit.chargedDebt || 0}/${limit.maxCharge || payload.maxCharge || 0} · excedente: +${limit.debtPerCard || 1}` };
    }
    case 'discard_surcharge': return { instruction: `A primeira retirada valida do lixo custa Divida +${payload.amount}.`, progress: '', consequence: 'O jogador pode desistir e comprar do monte' };
    case 'collar': return { instruction: `${target} nao pode jogar nem descartar ${collarCards.join(' e ')} ate o fim do turno.`, progress: '', consequence: '' };
    case 'exposure': return { instruction: `${target} precisa usar ${card} neste turno.`, progress: '', consequence: 'Se permanecer na mao, recebe 1 Corrente' };
    case 'forced_choice': return { instruction: `${target} devera escolher agora entre receber 1 Corrente ou aceitar: ${payload.order?.label || 'uma ordem valida para o proximo turno'}.`, progress: '', consequence: 'A partida aguarda a decisao' };
    case 'forced_swap': return { instruction: 'Uma carta de cada cooperador sera trocada depois deste anuncio.', progress: '', consequence: 'Controles bloqueados ate o resultado' };
    case 'possession': {
      const possession = (gameState.boss?.possessions || []).find((entry) => payload.meldId ? entry.meldId === payload.meldId : entry.meldIndex === payload.meldIndex);
      return { instruction: `Jogo ${Number(payload.meldIndex) + 1} mantem o dano suspenso. Cada cooperador deve contribuir, ou o jogo precisa evoluir.`, progress: `${possession?.contributorPlayerIds?.length || 0}/${possession?.required || gameState.players?.length || 2}`, consequence: 'Permanece ate coordenacao ou evolucao' };
    }
    case 'absolute_control': return { instruction: `${target} nao pode criar jogos novos.`, progress: '', consequence: 'Ate concluir o turno' };
    case 'double_collar': return { instruction: 'Uma carta de cada cooperador esta presa.', progress: '', consequence: 'Dura a rodada completa' };
    case 'separation': return { instruction: 'Cada jogo so pode ser alimentado por um cooperador.', progress: '', consequence: 'Dura a rodada completa' };
    case 'hands_tied': return { instruction: 'A equipe inteira pode criar somente um jogo novo.', progress: payload.teamMeldAvailable === false ? 'Criacao consumida' : 'Criacao disponivel', consequence: payload.consumedByPlayerId == null ? 'Dura a rodada completa' : `Consumida por ${playerName(gameState, payload.consumedByPlayerId)}` };
    case 'favorite': return { instruction: `${playerName(gameState, payload.protectedPlayerId)} sera protegida; ${playerName(gameState, payload.punishedPlayerId)} recebera 1 Corrente.`, progress: '', consequence: 'Aplicado depois deste anuncio' };
    case 'break_will': return { instruction: `Ao final da rodada, ${target} devera escolher sua punicao.`, progress: '', consequence: 'Corrente ou retirada de canastra' };
    case 'final_order': return { instruction: 'Ao final da rodada, cada cooperador devera cumprir uma escolha.', progress: '', consequence: '' };
    case 'iron_etiquette': return { instruction: `${target} deve encerrar o proximo turno descartando ${payload.suitLabel}.`, progress: '', consequence: 'Outro naipe enquanto houver opcao: +1 Corrente' };
    case 'interdict': return { instruction: `A primeira tentativa de evoluir o jogo ${Number(payload.meldIndex) + 1} exigira obedecer ou receber +1 Corrente.`, progress: '', consequence: 'Expira no fim da rodada' };
    case 'living_seed': return { instruction: `${target} precisa usar ${card} no proximo turno.`, progress: '', consequence: 'Falha: +1 Flor, sem cura' };
    case 'hungry_root': return { instruction: `Adicione uma carta legal ao jogo ${Number(payload.meldIndex) + 1}.`, progress: '', consequence: 'Falha: +1 Flor e pode propagar uma Raiz' };
    case 'restorative_dew': {
      const counted = new Set(payload.countedCardIds || []).size;
      const baseHeal = payload.baseHeal || 150;
      const reduction = payload.reductionPerCard || 15;
      const required = Math.ceil(baseHeal / reduction);
      const healing = Math.max(0, baseHeal - counted * reduction);
      return { instruction: 'Cada carta nova na mesa reduz a cura preparada.', progress: `${counted}/${required} cartas`, consequence: `Cura prevista: ${healing} HP` };
    }
    case 'twin_vines': return { instruction: `Alimente ${payload.targetCount || payload.targets?.length || 0} jogo(s), cada um separadamente.`, progress: '', consequence: 'Cada raiz falha: +1 Flor, sem cura' };
    case 'graft': return { instruction: 'Adicione uma carta legal em cada um dos dois jogos ligados.', progress: '', consequence: '0 lados: +2 Flores e pode propagar · 1 lado: +1 Flor' };
    case 'discard_pollen': return { instruction: 'Se o lixo for pego, use a carta contaminada no mesmo turno.', progress: '', consequence: 'Falha: +1 Flor e +40 HP' };
    case 'harvest': return { instruction: `${target} deve reduzir a mao antes de encerrar o turno.`, progress: '', consequence: '8-10: +60 HP · 11+: +100 HP e +1 Flor' };
    case 'royal_bloom': return { instruction: `Cumpra ${payload.targetCount || payload.objectives?.length || 0} objetivos independentes.`, progress: '', consequence: 'Cada falha: +1 Flor, sem cura' };
    case 'emerald_cocoon': return { instruction: 'O dano atinge primeiro o Casulo.', progress: `0/${payload.amount || 180}`, consequence: 'Canastra limpa ou superior rompe a protecao' };
    case 'spring_crown': return { instruction: 'A primeira falha pode propagar; a segunda fortalece a Raiz propagada valida.', progress: '', consequence: 'Raiz Fortalecida: uma contribuicao de cada jogador' };
    default: return { instruction: intent.description || 'Habilidade ativa.', progress: '', consequence: '' };
  }
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
  return {
    category: 'Escolha obrigatoria agora',
    name: names[choice.type] || 'Decisao obrigatoria',
    speech: '',
    description: '',
    details: detailFields([['Alvo', target], ['Ordem oferecida', choice.order?.label], ['Estado', 'a partida permanece pausada ate a decisao']]),
    instruction: `${target} precisa decidir antes de a partida continuar.`,
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
    return { category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`, name: `FASE ${flow.phase} - ${phaseName}`, speech: '', description: '', details: [], instruction: `A batalha entrou na fase ${flow.phase}.`, progress: '', consequence: '' };
  }
  if (flow?.stage === 'taunt') {
    const phaseName = definition?.phaseNames?.[flow.phase] || '';
    return { category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`, name: `FASE ${flow.phase} - ${phaseName}`, speech: definition?.phaseTaunts?.[flow.phase] || '', description: '', details: [], instruction: definition?.phaseTaunts?.[flow.phase] || '', progress: '', consequence: '' };
  }
  if (flow?.stage === 'result') {
    return { category: `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}`, name: 'Preparando nova ordem', speech: '', description: '', details: [], instruction: 'O resultado foi registrado. A próxima habilidade será anunciada em instantes.', progress: '', consequence: '' };
  }
  if (!intent) return { category: 'Acao atual', name: 'Aguardando a virada da rodada', speech: 'Aguardem.', description: 'Nenhuma habilidade esta ativa.', details: [], instruction: 'A proxima acao sera anunciada na nova rodada.', progress: '', consequence: '' };
  const phase = gameState.boss.phase || 1;
  const payload = intent.payload || {};
  const collarCards = intent.abilityId === 'collar'
    ? cardLabels(gameState, payload.targetPlayerId, payload.cardIds || (payload.cardId ? [payload.cardId] : []))
    : [];
  let details = [];

  if (gameState.boss.id === 'banker') {
    if (intent.abilityId === 'fixed_interest') details = [
      `Contrato: ${payload.contractTier || 'Padrao'}`,
      `Pagamento integral: +${payload.fullDebt ?? payload.amount ?? (phase === 3 ? 8 : 6)} de Divida`,
      `Com garantia no Cofre: +${payload.guaranteedDebt ?? payload.collateralAmount ?? (phase === 3 ? 5 : 3)} de Divida`,
      'A carta dada em garantia substitui a compra normal do proximo turno do dono',
      'Duracao: resolve ao fim da rodada',
    ];
    else if (intent.abilityId === 'maintenance_fee') details = ['Compra extra inevitavel', `Cada jogador comprara +${payload.extraDraw ?? (phase === 3 ? 2 : 1)} carta(s)`, 'Aplicada no proximo turno de cada jogador'];
    else if (intent.abilityId === 'credit_block') details = ['Lixo bloqueado agora', `Duracao: ate o fim da rodada ${gameState.boss.roundNumber}`, 'Encerra depois da acao do ultimo cooperador'];
    else if (intent.abilityId === 'suit_audit') details = [`Naipe: ${payload.suitLabel}`, `Progresso: ${payload.progress || 0}/${payload.required}`, `Sucesso: ${payload.successDelta ?? -5} de Divida`, `Falha: +${payload.failureDelta ?? (phase === 3 ? 12 : 10)} de Divida`, 'Encerra ao fim da rodada'];
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
      details = [
        `Custo: +${surcharge.amount || payload.amount} de Divida`,
        'Gatilho: primeira retirada valida do lixo',
        'O jogador pode desistir e comprar do monte',
        `Estado: ${surcharge.status === 'consumed' ? 'consumido' : 'ativo nesta rodada'}`,
      ];
    }
  } else if (gameState.boss.id === 'dominadora') details = dominatrixDetails(gameState, intent);
  else details = matriarchDetails(gameState, intent);

  const compact = compactAction(gameState, intent);

  return {
    category: flow?.stage === 'ability' ? `Turno d${feminineBoss ? 'a' : 'o'} ${definition?.name?.replace(/^(A|O) /, '') || 'Chefe'}` : actionCategory(intent),
    name: intent.name,
    speech: intent.abilityId === 'collar' && collarCards.length === 1
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
  const chainSummary = (gameState?.players || [])
    .map((player) => `${player.name}: ${Number(boss?.chainsByPlayer?.[player.id] || 0)}/4`)
    .join(' · ');
  const finalStrike = [...(boss?.eventLog || [])].reverse().find((entry) => entry.type === 'finalStrike');
  return {
    outcome: playersWon ? 'VITÓRIA' : 'DERROTA',
    bossName: definition?.name || 'Chefe da Mesa',
    portrait: definition?.portrait || '',
    reason: result?.detail || (playersWon ? 'O chefe foi derrotado.' : 'A equipe foi derrotada.'),
    speech: definition?.finalSpeeches?.[playersWon ? 'victory' : 'defeat'] || '',
    hp: `${Math.max(0, boss?.hp || 0)} / ${boss?.maxHp || 0}`,
    dangerLabel: boss?.id === 'dominadora' ? 'Correntes finais' : boss?.id === 'matriarca_esmeralda' ? 'Florescimento final' : 'Dívida final',
    danger: boss?.id === 'dominadora' ? chainSummary : `${Number(boss?.danger || 0)} / ${Number(boss?.maxDanger || 0)}`,
    totalDamage: Number(boss?.stats?.totalDamage || 0),
    canastras: Number(boss?.stats?.canastrasFormed || 0),
    rounds: Number(boss?.roundNumber || 1),
    finalStrike: Number(boss?.stats?.finalStrike || finalStrike?.damage || 0),
  };
}
