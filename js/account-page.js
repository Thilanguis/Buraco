import { historyStats, resultFor } from './match-history.js';
import { comparePlayers, comparisonPlayers, comparisonMatches } from './history-comparison.js';

const modes = { '1x1': '1×1 Clássico', '2x2': 'Duplas', '1x2': 'Solo × dupla', '1x3': 'Solo × trio', '1x1_duploMorto': 'Humilhação', '1x1_dominacao': 'Dominação', boss_banker: 'O Banqueiro', boss_dominadora: 'A Dominadora', boss_matriarca: 'A Matriarca' };
const categories = { all: 'Todas', players: 'Entre jogadores', bots: 'Contra bots', boss: 'Chefes', test: 'Testes' };
const results = { win: 'Vitória', loss: 'Derrota', draw: 'Empate', unknown: 'Concluída' };
const number = value => Number(value || 0).toLocaleString('pt-BR');
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function duration(seconds) { return seconds == null ? 'Duração não registrada' : `${Math.floor(seconds / 60)}min ${seconds % 60}s`; }

export function openAccountPage({ account, saveProfile, resetPassword, loadMatches }) {
  if (document.getElementById('accountPage')) return;
  const previousFocus = document.activeElement;
  const menu = document.getElementById('configSection');
  const dialog = node('dialog', 'profile-page');
  dialog.id = 'accountPage';
  dialog.setAttribute('aria-labelledby', 'profileTitle');
  dialog.innerHTML = `<div class="profile-shell">
    <header class="profile-nav"><span>♠ &nbsp; BURACO <i>/ SEU PERFIL</i></span><button type="button" data-back>← Voltar ao menu</button></header>
    <section class="profile-hero"><div class="profile-monogram" aria-hidden="true"></div><div><p class="profile-eyebrow">SUA TRAJETÓRIA NA MESA</p><h1 id="profileTitle"></h1><p class="profile-subtitle">Cada partida, uma história.</p></div></section>
    <div class="profile-tabs" role="tablist" aria-label="Seções do perfil"><button role="tab" id="historyTab" aria-controls="historyPanel" aria-selected="true">Histórico</button><button role="tab" id="comparisonTab" aria-controls="comparisonPanel" aria-selected="false" tabindex="-1">Confrontos</button><button role="tab" id="settingsTab" aria-controls="settingsPanel" aria-selected="false" tabindex="-1">Editar perfil</button></div>
    <section id="historyPanel" role="tabpanel" aria-labelledby="historyTab">
      <div class="profile-stats"></div><p class="profile-scope">Resumo das partidas carregadas, sem testes. Use os filtros para separar modalidades.</p>
      <div class="profile-list-header"><h2>Suas partidas</h2><label>Mostrar <select id="historyFilter"></select></label></div>
      <p class="profile-history-status" role="status" aria-live="polite"></p><div class="profile-matches"></div><button class="profile-more" type="button">Carregar mais partidas</button>
    </section>
    <section id="comparisonPanel" role="tabpanel" aria-labelledby="comparisonTab" hidden>
      <p class="profile-eyebrow">HISTÓRIAS COMPARTILHADAS</p><h2>Quem leva a melhor?</h2>
      <p class="profile-history-status">Compare suas mesas com outra pessoa. Bots e testes ficam de fora.</p>
      <div class="comparison-filters"><label>Jogador<select id="comparisonPlayer"></select></label><label>Na mesa<select id="comparisonRelation"><option value="opponents">Adversários</option><option value="partners">Jogamos juntos</option></select></label><label>Modalidade<select id="comparisonMode"></select></label></div>
      <div class="comparison-content"></div><p class="comparison-scope" role="status" aria-live="polite"></p>
      <div class="comparison-matches profile-matches"></div><button class="comparison-more" type="button" hidden>Carregar mais partidas</button>
    </section>
    <section id="settingsPanel" role="tabpanel" aria-labelledby="settingsTab" hidden>
      <form class="profile-form"><h2>Do seu jeito</h2><p>Atualize seus dados para as próximas partidas. Os resultados antigos preservam o nome usado na época.</p>
      <label>Nome de jogador<input name="name" autocomplete="name" maxlength="60" required></label>
      <label>Chave Pix<input name="pixKey" autocomplete="off" maxlength="140" required><small>Usada no campo Pix do seu time. Confira a chave antes de salvar.</small></label>
      <label>E-mail da conta<input name="email" type="email" readonly><small>O e-mail identifica seu login e não será alterado aqui.</small></label>
      <p class="profile-save-status" role="status" aria-live="polite"></p><div class="profile-form-actions"><button type="submit">Salvar alterações</button><button type="button" data-reset>Redefinir senha por e-mail</button></div></form>
    </section>
    <footer class="profile-footer">Seu histórico é privado. Partidas antigas recuperadas são identificadas nos detalhes.</footer>
  </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  let alive = true, busy = false, matches = [], cursor = null, hasMore = false, loadError = false;
  const close = () => {
    if (!alive) return;
    alive = false;
    dialog.classList.add('is-closing');
    menu?.classList.remove('profile-menu-away');
    const finish = () => { dialog.close(); dialog.remove(); previousFocus?.focus({ preventScroll: true }); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else window.setTimeout(finish, 220);
  };
  $('[data-back]').onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  function identity() {
    $('#profileTitle').textContent = account.name;
    const words = account.name.split(/\s+/);
    $('.profile-monogram').textContent = (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toLocaleUpperCase('pt-BR');
  }
  identity();
  const form = $('.profile-form');
  form.elements.name.value = account.name;
  form.elements.pixKey.value = account.pixKey;
  form.elements.email.value = account.email;
  const tabs = [$('#historyTab'), $('#comparisonTab'), $('#settingsTab')];
  function selectTab(index) {
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    $('#historyPanel').hidden = index !== 0;
    $('#comparisonPanel').hidden = index !== 1;
    $('#settingsPanel').hidden = index !== 2;
    dialog.scrollTop = 0;
  }
  tabs.forEach((tab, i) => {
    tab.onclick = () => selectTab(i);
    tab.onkeydown = event => {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        selectTab(next); tabs[next].focus();
      }
    };
  });
  for (const [value, title] of Object.entries(categories)) { const option = node('option', '', title); option.value = value; $('#historyFilter').append(option); }
  function render() {
    const filter = $('#historyFilter').value;
    const visible = matches.filter(m => filter === 'all' || m.category === filter);
    const stats = historyStats(visible, account.uid);
    const statsNode = $('.profile-stats'); statsNode.replaceChildren();
    for (const [label, value] of [['Partidas', stats.played], ['Vitórias', stats.wins], ['Vitórias / jogos', `${stats.winRate}%`], ['Melhor placar', stats.bestScore === null ? '—' : number(stats.bestScore)]]) {
      const tile = node('div', 'profile-stat'); tile.append(node('strong', '', value), node('span', '', label)); statsNode.append(tile);
    }
    $('.profile-scope').textContent = `${stats.played} partidas válidas carregadas · ${stats.losses} derrotas · ${stats.draws} empates. Testes não entram nas estatísticas.`;
    renderMatchList(visible, $('#historyPanel .profile-matches'));
    $('.profile-history-status').textContent = visible.length ? `${visible.length} partidas exibidas. Toque numa partida para ver os detalhes.` : matches.length ? 'Nenhuma partida neste filtro.' : 'Sua história começa na próxima partida. Quando ela terminar, o resultado aparece aqui.';
    $('.profile-more').hidden = !hasMore;
    renderComparison();
  }
  function renderMatchList(visible, list) {
    list.replaceChildren();
    for (const match of visible) {
      const outcome = resultFor(match, account.uid);
      const card = node('details', `profile-match outcome-${outcome}`);
      const summary = node('summary');
      const info = node('div', 'profile-match-info');
      const title = modes[match.mode] || match.mode;
      info.append(node('strong', '', title), node('span', '', new Date(match.finishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })));
      const players = node('span', 'profile-match-players', match.participants.map(p => p.name).join(' · '));
      players.title = players.textContent;
      info.append(players);
      const score = node('strong', 'profile-match-score', match.teams.map(t => number(t.score)).join(' × '));
      const badge = node('span', `profile-outcome ${match.category === 'test' ? 'is-test' : ''}`, match.category === 'test' ? 'Teste' : results[outcome]);
      summary.append(info, score, badge);
      const detail = node('div', 'profile-match-detail');
      if (match.legacyImport) detail.append(node('p', 'profile-match-note', `Partida antiga recuperada${match.legacyImport.approximateDate ? ' · Data aproximada do último registro' : ''}. Placar reconstruído pelas regras atuais.${match.legacyImport.testStatus === 'not_recorded' ? ' O registro antigo não informava se era teste.' : ''}`));
      detail.append(node('p', '', `${categories[match.category]} · ${match.variant === 'fechado' ? 'Buraco fechado' : 'Buraco aberto'} · ${duration(match.durationSeconds)}`));
      if (match.mode === '1x1_dominacao') {
        const options=match.dominationOptions;
        const settings=node('section','match-options');
        settings.append(node('h3','','Regras desta Dominação'));
        const chips=node('div','match-option-list');
        for(const [key,label] of [['plus','Plus Dominação'],['search','Procurar carta'],['vision','Visão do Dominador'],['friend','Amiga do Dominador']]) {
          const enabled=options?.[key];
          let value=enabled===true?'Ativado':enabled===false?'Desativado':'Não registrado';
          if(key==='friend' && enabled===true && [0,1,2].includes(options.friendCapacity))value+=` · ${options.friendCapacity} ${options.friendCapacity===1?'amiga':'amigas'}`;
          const chip=node('div',`match-option ${enabled===true?'enabled':enabled===false?'disabled':'unknown'}`);
          chip.append(node('span','',label),node('strong','',value));chips.append(chip);
        }
        settings.append(chips,node('p','match-option-note','Configuração registrada da partida; ativado não significa que o recurso foi utilizado.'));
        detail.append(settings);
      }
      for (const team of match.teams) {
        const names = match.participants.filter(p => p.teamId === team.id).map(p => p.name).join(' + ') || team.name;
        detail.append(node('h3', '', `${names} — ${number(team.score)} pontos`));
        detail.append(node('p', '', `Cartas: ${number(team.meldPoints)} · Penalidade da mão: ${number(team.handPenalty)} · Morto: ${number(team.deadPenalty)} · Batida: +${number(team.finishBonus)}`));
        const c = team.canastras;
        detail.append(node('p', '', `Canastras: ${c.suja} sujas · ${c.limpa} limpas · ${c.real} reais · ${c.asas} ás a ás`));
      }
      if (match.category !== 'boss' && match.finisherTeamId !== null) detail.append(node('p', 'profile-match-note', `Batida: ${match.teams.find(t => t.id === match.finisherTeamId)?.name || '—'}. A vitória do histórico considera o placar final.`));
      card.append(summary, detail); list.append(card);
    }
  }
  function options(select, items) {
    const previous=select.value; select.replaceChildren();
    for(const [value,label] of items){const option=node('option','',label);option.value=value;select.append(option);}
    if(items.some(([value])=>value===previous))select.value=previous;
  }
  function renderComparison() {
    const people=comparisonPlayers(matches,account.uid);
    options($('#comparisonPlayer'),people.length?people.map(p=>[p.uid,p.name]):[['','Nenhum jogador ainda']]);
    $('#comparisonPlayer').disabled=!people.length;
    const otherUid=$('#comparisonPlayer').value;
    const modeIds=[...new Set(comparisonMatches(matches,account.uid).filter(m=>m.participants.some(p=>p.uid===otherUid)).map(m=>m.mode))];
    options($('#comparisonMode'),[['all','Todas as modalidades'],...modeIds.map(m=>[m,modes[m]||m])]);
    const partners=$('#comparisonRelation').value==='partners';
    const stats=comparePlayers(matches,account.uid,otherUid,partners?'partners':'opponents',$('#comparisonMode').value);
    const other=people.find(p=>p.uid===otherUid)?.name||'Outro jogador';
    const content=$('.comparison-content');content.replaceChildren();
    if(people.length) {
      const arena=node('div','comparison-arena');
      for(const [name,value,caption] of [[account.name,stats.wins,partners?'Vitórias juntos':'Suas vitórias'],[partners?'PARCERIA':'VERSUS',stats.draws,'Empates'],[other,stats.losses,partners?'Derrotas juntos':'Vitórias do outro time']]) {
        const side=node('div','comparison-side');side.append(node('span','comparison-name',name),node('strong','',number(value)),node('small','',caption));arena.append(side);
      }
      content.append(arena);
      const bar=node('div','comparison-bar');bar.setAttribute('aria-hidden','true');
      for(const [cls,value] of [['wins',stats.wins],['draws',stats.draws],['losses',stats.losses]]) { const segment=node('span',cls);segment.style.flexGrow=String(value);bar.append(segment); }content.append(bar);
      const streak=stats.streak;
      const plural=streak.count!==1;
      const text=!stats.played?'Ainda não há partidas nesta combinação.':streak.outcome==='draw'?`${streak.count} ${plural?'empates consecutivos':'empate no último jogo'}.`:partners?`${streak.count} ${streak.outcome==='win'?'vitória':'derrota'}${plural?'s seguidas':' seguida'} juntos.`:`${streak.outcome==='win'?account.name:other} venceu ${plural?`os últimos ${streak.count} confrontos`:'o último confronto'}.`;
      content.append(node('p','comparison-streak',text));
      const table=node('table','comparison-table');
      const row=(tag,values)=>{const tr=node('tr');for(const value of values)tr.append(node(tag,'',value));return tr;};
      const head=node('thead');head.append(row('th',['Pontos do time',account.name,other]));
      const body=node('tbody');const format=v=>v===null?'—':number(v);
      body.append(row('td',['Maior placar',format(stats.mine.best),format(stats.theirs.best)]),row('td',['Média por partida',format(stats.mine.average),format(stats.theirs.average)]));table.append(head,body);content.append(table);
    }
    $('.comparison-scope').textContent=people.length?`${stats.played} partidas compartilhadas neste filtro, entre ${matches.length} registros carregados. ${hasMore||loadError?'Carregue mais para ampliar a comparação.':'Todo o histórico disponível foi carregado.'} Placares e vitórias são dos times; datas antigas podem ser aproximadas.`:'Nenhum outro jogador com conta identificado nas partidas carregadas. Carregue mais registros ou termine uma partida com outro jogador.';
    renderMatchList(stats.matches,$('.comparison-matches'));
    if(loadError)$('.comparison-scope').textContent+=' Não foi possível concluir a busca. Tente carregar novamente.';
    $('.comparison-more').hidden=!hasMore && !loadError;
  }
  for(const id of ['comparisonPlayer','comparisonMode','comparisonRelation'])$('#'+id).onchange=renderComparison;
  $('#historyFilter').onchange = render;
  async function load() {
    if (busy) return; busy = true;
    $('.profile-more').disabled = true;
    $('.comparison-more').disabled = true;
    $('.comparison-scope').textContent = 'Buscando suas partidas…';
    $('.profile-history-status').textContent = 'Buscando suas partidas…';
    try {
      const page = await loadMatches(account.uid, cursor);
      if (!alive) return;
      const seen = new Set(matches.map(m => m.matchId));
      matches.push(...page.matches.filter(m => !seen.has(m.matchId)));
      cursor = page.cursor; hasMore = page.hasMore; loadError = false; render();
      $('.profile-more').textContent = $('.comparison-more').textContent = 'Carregar mais partidas';
    } catch {
      if (!alive) return;
      loadError = true;
      $('.profile-history-status').textContent = 'Não foi possível buscar o histórico. Confira sua conexão e tente novamente.';
      $('.profile-more').hidden = false;
      $('.profile-more').textContent = 'Tentar novamente';
      $('.comparison-scope').textContent = 'Não foi possível buscar mais partidas. A comparação pode estar incompleta. Tente novamente.';
      $('.comparison-more').hidden = false;
      $('.comparison-more').textContent = 'Tentar novamente';
    } finally { busy = false; $('.profile-more').disabled = false; $('.comparison-more').disabled = false; }
  }
  $('.profile-more').onclick = () => { $('.profile-more').textContent = 'Carregar mais partidas'; void load(); };
  $('.comparison-more').onclick = () => { $('.comparison-more').textContent = 'Carregar mais partidas'; void load(); };
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    $('.profile-save-status').textContent = 'Salvando…';
    try {
      await saveProfile({ name: form.elements.name.value, pixKey: form.elements.pixKey.value });
      identity(); renderComparison(); $('.profile-save-status').textContent = 'Perfil atualizado. Seus resultados anteriores foram preservados.';
    } catch (error) { $('.profile-save-status').textContent = error.code ? 'Não foi possível salvar. Confira sua conexão e tente novamente.' : error.message; }
    finally { button.disabled = false; }
  };
  $('[data-reset]').onclick = async event => {
    const button = event.currentTarget; button.disabled = true;
    try { await resetPassword(); $('.profile-save-status').textContent = 'E-mail de redefinição enviado. Confira também o spam.'; }
    catch { $('.profile-save-status').textContent = 'Não foi possível enviar agora. Aguarde e tente novamente.'; }
    finally { button.disabled = false; }
  };
  menu?.classList.add('profile-menu-away');
  dialog.showModal();
  render(); void load();
}
