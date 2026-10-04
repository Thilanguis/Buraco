const SPEECHES = Object.freeze({
  false_image: 'A verdade é tão vulgar. Escolham algo mais bonito.',
  mirrored_meld: 'Seu jogo fica muito mais interessante quando vocês já não sabem qual é o verdadeiro.',
  follow_reflection: 'Um cria o reflexo. O outro prova que consegue imitá-lo.',
  dream_theft: 'Esse sonho estava desperdiçado com vocês.',
  discard_mirror: 'Até aquilo que vocês rejeitam ainda quer refletir minha beleza.',
  shattered_mirror: 'Três fragmentos. Só um deles ainda se lembra do que era real.',
  mirror_prison: 'Alguém ficou preso do lado bonito do espelho. Venham buscá-lo, se conseguirem.',
  eternal_nightmare: 'No meu pesadelo, a mentira é sempre a coisa mais familiar.',
  tiger_link: "Tiger's Eye já viu onde seus jogos se tocam. Agora eles vão sentir.",
  tiger_prey: "Tiger's Eye não perde a mesma presa duas vezes.",
  hawk_suit: "Hawk's Eye viu seu descarte antes mesmo de vocês decidirem.",
  hawk_watch: "Hawk's Eye fechou uma das saídas. Eu adoraria ver vocês insistirem nela.",
  fish_marked_card: 'Fish Eye escolheu uma carta. Vamos ver quanto tempo conseguem fingir que não perceberam.',
  fish_inverted: 'Comecem pelo reflexo errado. Talvez, por acidente, encontrem o caminho certo.',
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

const ACTION_CATEGORIES = Object.freeze({
  false_image: 'Escolha preparada',
  mirrored_meld: 'Objetivo da rodada',
  follow_reflection: 'Objetivo da rodada',
  dream_theft: 'Escolha preparada',
  discard_mirror: 'Escolha preparada',
  shattered_mirror: 'Escolha preparada',
  mirror_prison: 'Objetivo da rodada',
  eternal_nightmare: 'Escolha preparada',
  tiger_link: 'Objetivo da rodada',
  tiger_prey: 'Objetivo da rodada',
  hawk_suit: 'Objetivo da rodada',
  hawk_watch: 'Restricao ativa agora',
  fish_marked_card: 'Objetivo da rodada',
  fish_inverted: 'Restricao ativa agora',
});

function helpersFor(context = {}) {
  const helpers = context.helpers || {};
  return {
    playerName: helpers.playerName || ((gameState, id) => gameState?.players?.find((player) => player.id === id)?.name || (id == null ? '' : `Jogador ${Number(id) + 1}`)),
    cardLabelAnywhere: helpers.cardLabelAnywhere || (() => 'carta marcada'),
    flowResultEvent: helpers.flowResultEvent || (() => null),
    getBossDefinition: helpers.getBossDefinition || (() => null),
  };
}

function dreamMirrorSummary(gameState) {
  const boss = gameState?.boss || {};
  const taken = Math.max(0, Number(boss.danger) || 0);
  const maximum = Math.max(1, Number(boss.maxDanger) || 5);
  const mirrors = Array.from({ length: maximum }, (_, index) => index < taken ? '◆' : '◇').join(' ');
  const lines = [`${mirrors}  ${Math.round(taken * 20 * 10) / 10}/100 no Mundo do Espelho`];
  if (boss.mirrorWorldActive) lines.push('◆ Mundo do Espelho pressionando a mesa');
  return lines.join('\n');
}

function mirrorProgress(gameState, intent, helpers) {
  const { playerName, cardLabelAnywhere } = helpers;
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
    return locked ? `1º ${firstName}: padrão ${first}\n2º ${secondName}: ${second}/${first}` : `1º ${firstName}: ${first} carta${first === 1 ? '' : 's'}\n2º ${secondName}: aguarda`;
  }
  if (intent.abilityId === 'mirror_prison') return `${payload.fed ? '✅' : '☐'} ${playerName(gameState, payload.rescuerPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  if (intent.abilityId === 'tiger_link') {
    const fed = new Set(payload.fedMeldIds || []);
    return (payload.targets || []).map((target) => `${fed.has(target.meldId) ? '✅' : '☐'} Jogo ${Number(target.meldIndex) + 1}`).join(' · ');
  }
  if (intent.abilityId === 'tiger_prey') return `${payload.fed ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  if (intent.abilityId === 'hawk_suit') return `${payload.discardedCorrectSuit ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: ${payload.suitLabel || payload.suit}`;
  if (intent.abilityId === 'hawk_watch') return `👁 ${playerName(gameState, payload.targetPlayerId)}: Jogo ${Number(payload.meldIndex) + 1}`;
  if (intent.abilityId === 'fish_marked_card') {
    const done = payload.used || payload.discarded;
    return `${done ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: ${cardLabelAnywhere(gameState, payload.cardId)}`;
  }
  if (intent.abilityId === 'fish_inverted') return `${payload.fedExisting ? '✅' : '☐'} ${playerName(gameState, payload.targetPlayerId)}: jogo existente`;
  return dreamMirrorSummary(gameState);
}

export const neheleniaBossPresentation = Object.freeze({
  id: 'nehelenia',
  feminine: true,
  ruleSummary(gameState) {
    const limit = Math.max(1, Number(gameState?.boss?.maxDanger || 5));
    return `100/100 = derrota · cada novo tier natural reduz 4 no Mundo do Espelho.`;
  },
  speech(abilityId, context = {}) {
    const target = dialogueTarget(context);
    if (abilityId === 'mirrored_meld' && target) return `${target}, seu jogo fica muito mais interessante quando você já não sabe qual é o verdadeiro.`;
    if (abilityId === 'dream_theft' && target) return `${target}, esse sonho estava desperdiçado com você.`;
    if (abilityId === 'tiger_prey' && target) return `${target}, Tiger's Eye não perde a mesma presa duas vezes.`;
    if (abilityId === 'hawk_suit' && target) return `${target}, Hawk's Eye viu seu descarte antes mesmo de você decidir.`;
    if (abilityId === 'hawk_watch' && target) return `${target}, Hawk's Eye fechou uma das saídas. Eu adoraria ver você insistir nela.`;
    if (abilityId === 'fish_marked_card' && target) return `${target}, Fish Eye escolheu uma carta. Vamos ver quanto tempo você consegue fingir que não percebeu.`;
    if (abilityId === 'fish_inverted' && target) return `${target}, comece pelo reflexo errado. Talvez, por acidente, encontre o caminho certo.`;
    return SPEECHES[abilityId] || '';
  },
  actionCategory(abilityId) { return ACTION_CATEGORIES[abilityId] || ''; },
  resultCategory(abilityId) { return RESULT_CATEGORIES[abilityId] || ''; },
  finalDanger(gameState) {
    const boss = gameState?.boss || {};
    return { label: 'Espelhos roubados', value: `${Math.round(Number(boss.danger || 0) * 20 * 10) / 10} / 100` };
  },

  details() { return []; },

  compactAction(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return null;
    const helpers = helpersFor(context);
    const { playerName, cardLabelAnywhere } = helpers;
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    switch (intent.abilityId) {
      case 'false_image': return { instruction: `${target}: ache o reflexo real.`, progress: dreamMirrorSummary(gameState), consequence: 'Erro: carta presa 1 turno' };
      case 'mirrored_meld': return { instruction: `${playerName(gameState, payload.targetPlayerId)}: use 1 carta e escolha o jogo verdadeiro.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Erro: Mundo do Espelho +18 · carta ao monte · Desorientado' };
      case 'follow_reflection': return { instruction: `${playerName(gameState, payload.firstPlayerId)} define a quantidade · ${playerName(gameState, payload.secondPlayerId)} iguala.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Diferença: Mundo do Espelho +16' };
      case 'dream_theft': return { instruction: `${target}: ache o reflexo real.`, progress: dreamMirrorSummary(gameState), consequence: 'Erro: perde o Espelho dos Sonhos' };
      case 'discard_mirror': return { instruction: `${target}: escolha 1 dos 2 reflexos do Lixo.`, progress: dreamMirrorSummary(gameState), consequence: 'Erro: Mundo do Espelho +16 · Lixo selado' };
      case 'shattered_mirror': return { instruction: `${target}: ache o único falso.`, progress: dreamMirrorSummary(gameState), consequence: 'Erro: 2 cartas presas 1 turno' };
      case 'mirror_prison': return { instruction: `${playerName(gameState, payload.rescuerPlayerId)}: alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: mirrorProgress(gameState, intent, helpers), consequence: `Resgate: Mundo do Espelho -8` };
      case 'eternal_nightmare': return { instruction: `${target}: acompanhe a carta ORIGINAL.`, progress: dreamMirrorSummary(gameState), consequence: 'Erro: Mundo do Espelho +24' };
      case 'tiger_link': return { instruction: 'Alimente os 2 jogos ligados.', progress: mirrorProgress(gameState, intent, helpers), consequence: 'Falha: Mundo do Espelho +12 · garras persistem' };
      case 'tiger_prey': return { instruction: `${target}: primeiro alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Até lá: outros jogos bloqueados para o alvo' };
      case 'hawk_suit': return { instruction: `${target}: descarte ${payload.suitLabel || payload.suit}.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Errar: topo vigiado · Lixo bloqueado' };
      case 'hawk_watch': return { instruction: `${target}: não alimente o Jogo ${Number(payload.meldIndex) + 1}.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Parceiro e outros jogos livres' };
      case 'fish_marked_card': return { instruction: `${target}: use ou descarte ${cardLabelAnywhere(gameState, payload.cardId)}.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Falha: carta só poderá ser descartada' };
      case 'fish_inverted': return { instruction: `${target}: alimente 1 jogo existente antes de abrir outro.`, progress: mirrorProgress(gameState, intent, helpers), consequence: 'Persiste até cumprir' };
      default: return null;
    }
  },

  help(context = {}) {
    const { gameState, intent } = context;
    if (!intent) return null;
    const { playerName } = helpersFor(context);
    const payload = intent.payload || {};
    const target = playerName(gameState, payload.targetPlayerId);
    switch (intent.abilityId) {
      case 'mirrored_meld': return `${target} precisa usar exatamente 1 carta legal no jogo espelhado e escolher qual reflexo é o verdadeiro. Errar manda a carta ao fundo do Monte e deixa o jogador Desorientado: ele não pode fazer novas baixadas naquele turno, apenas descartar. Se havia uma Presa Marcada antiga, ela volta a valer depois que o espelho for resolvido.`;
      case 'follow_reflection': return `${playerName(gameState, payload.firstPlayerId)} define o padrão pela quantidade TOTAL de cartas baixadas no turno inteiro. ${playerName(gameState, payload.secondPlayerId)} precisa terminar o próprio turno com exatamente a mesma quantidade; zero também conta. O jogo não bloqueia uma quantidade diferente durante o turno: a comparação acontece somente no final.`;
      case 'discard_mirror': return 'Os dois reflexos do topo do Lixo são visualmente idênticos e não existe pista escondida: a escolha é realmente 50/50. Errar sela o Lixo durante a rodada.';
      case 'mirror_prison': return 'A Prisão só pode aparecer quando Nehelenia já tomou pelo menos 1 Espelho dos Sonhos. O parceiro indicado precisa alimentar o jogo refletido para reduzir 8 do Mundo do Espelho.';
      case 'eternal_nightmare': return 'Primeiro a carta ORIGINAL aparece sozinha. Depois surgem dois reflexos, o rótulo some e os três se embaralham. Nenhum deles recebe pista de verdadeiro ou falso: é preciso acompanhar visualmente a posição da original.';
      case 'tiger_link': return 'Tiger liga dois jogos e cada lado precisa receber ao menos 1 carta. Se um lado ficar sem alimentação, as garras permanecem nele até um turno futuro. A carta usada para romper essas garras não causa o dano individual normal.';
      case 'tiger_prey': return `A Presa prende somente ${target}. Até esse jogador alimentar o jogo marcado, ele não pode alimentar outro jogo existente. O parceiro continua livre e a Presa atravessa rodadas até ser resolvida. Jogo Espelhado tem precedência temporária, mas não apaga a Presa.`;
      case 'hawk_suit': return `Se ${target} descartar outro naipe, Hawk passa a vigiar exatamente a carta descartada. Enquanto ela continuar no topo do Lixo, ninguém pode recolher a pilha. Um novo descarte tira a carta vigiada do topo e encerra o bloqueio.`;
      case 'hawk_watch': return `Vigilância vale somente para ${target} e somente sobre o jogo marcado durante esse turno. O parceiro e os outros jogos continuam livres.`;
      case 'fish_marked_card': return 'Se a carta marcada continuar na mão no fim do prazo, ela vira Reflexo Morto: continua na mão, não pode entrar em jogo e só é libertada quando for descartada.';
      case 'fish_inverted': return `A restrição fica somente em ${target}: antes de abrir jogo novo, esse jogador precisa alimentar um jogo existente. Se não resolver neste turno, o efeito continua nos próximos turnos até ser cumprido.`;
      default: return null;
    }
  },

  pendingChoice(context = {}) {
    const { gameState, choice } = context;
    if (!choice || !['false_image', 'dream_theft', 'discard_mirror', 'shattered_mirror', 'eternal_nightmare'].includes(choice.type)) return null;
    const helpers = helpersFor(context);
    const { playerName } = helpers;
    const detailFields = context.helpers?.detailFields || ((entries) => entries.filter(([, value]) => value !== '' && value != null).map(([label, value]) => `${label}: ${value}`));
    const target = playerName(gameState, choice.playerId);
    const names = { false_image: 'Imagem Falsa', dream_theft: 'Roubo de Sonho', discard_mirror: 'Espelho do Lixo', shattered_mirror: 'Espelho Estilhaçado', eternal_nightmare: 'Pesadelo Eterno' };
    const labels = (choice.options || []).map((option) => choice.optionLabels?.[option] || option);
    const findFake = choice.type === 'shattered_mirror';
    let instruction = findFake ? `${target}: dois reflexos existem na sua mão e um é falso. Aponte a mentira.` : `${target}: escolha qual reflexo corresponde à imagem verdadeira.`;
    if (choice.type === 'discard_mirror') instruction = `${target}: escolha um dos dois reflexos idênticos do topo do lixo. É 50/50.`;
    if (choice.type === 'dream_theft') instruction = `${target}: reconheça sua carta real antes que Nehelenia roube seu Espelho dos Sonhos.`;
    if (choice.type === 'eternal_nightmare') instruction = `${target}: acompanhe a carta ORIGINAL depois que dois reflexos nascerem e os três se embaralharem.`;
    const consequence = choice.type === 'dream_theft' || choice.type === 'eternal_nightmare' ? 'Erro → Mundo do Espelho +24' : choice.type === 'discard_mirror' ? 'Erro → lixo selado + Mundo do Espelho +16' : 'Erro → cartas reais presas no espelho durante o próximo turno';
    return {
      category: 'Escolha obrigatoria agora', name: names[choice.type] || 'Decisao obrigatoria', speech: '', description: '',
      details: detailFields([['Alvo', target], ['Reflexos', labels.join(' · ')], ['Regra', findFake ? 'encontre o reflexo falso' : 'encontre a imagem verdadeira']]),
      instruction, progress: labels.map((label) => `◇ ${label}`).join('   '), consequence,
    };
  },

  status(context = {}) {
    const { gameState } = context;
    const boss = gameState?.boss;
    if (boss?.id !== 'nehelenia') return null;
    const { flowResultEvent, getBossDefinition } = helpersFor(context);
    const event = flowResultEvent(gameState);
    if (!event) return null;
    const abilityId = event.abilityId || event.sourceAbilityId;
    const ability = getBossDefinition('nehelenia')?.abilities.find((entry) => entry.id === abilityId);
    if (!ability && !['dreamMirror', 'mirrorWorld'].includes(event.type)) return null;
    return { category: ['dreamMirror', 'mirrorWorld'].includes(event.type) ? 'Espelhos dos Sonhos' : 'Resultado da habilidade', name: ability?.name || event.origin || 'Espelho dos Sonhos', speech: '', description: '', details: event.presentation?.details || [], instruction: event.outcome || `${ability?.name || 'A ilusão'} foi resolvida.`, progress: dreamMirrorSummary(gameState), consequence: event.dangerChangeLabel || '' };
  },
});
