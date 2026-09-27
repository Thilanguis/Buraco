import { historyStats, resultFor } from './match-history.js';

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
    <div class="profile-tabs" role="tablist" aria-label="Seções do perfil"><button role="tab" id="historyTab" aria-controls="historyPanel" aria-selected="true">Histórico & estatísticas</button><button role="tab" id="settingsTab" aria-controls="settingsPanel" aria-selected="false" tabindex="-1">Editar perfil</button></div>
    <section id="historyPanel" role="tabpanel" aria-labelledby="historyTab">
      <div class="profile-stats"></div><p class="profile-scope">Resumo das partidas carregadas, sem testes. Use os filtros para separar modalidades.</p>
      <div class="profile-list-header"><h2>Suas partidas</h2><label>Mostrar <select id="historyFilter"></select></label></div>
      <p class="profile-history-status" role="status" aria-live="polite"></p><div class="profile-matches"></div><button class="profile-more" type="button">Carregar mais partidas</button>
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
  let alive = true, busy = false, matches = [], cursor = null, hasMore = false;
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
  const tabs = [$('#historyTab'), $('#settingsTab')];
  function selectTab(index) {
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    $('#historyPanel').hidden = index !== 0;
    $('#settingsPanel').hidden = index !== 1;
  }
  tabs.forEach((tab, i) => {
    tab.onclick = () => selectTab(i);
    tab.onkeydown = event => {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - i;
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
    const list = $('.profile-matches'); list.replaceChildren();
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
    $('.profile-history-status').textContent = visible.length ? `${visible.length} partidas exibidas. Toque numa partida para ver os detalhes.` : matches.length ? 'Nenhuma partida neste filtro.' : 'Sua história começa na próxima partida. Quando ela terminar, o resultado aparece aqui.';
    $('.profile-more').hidden = !hasMore;
  }
  $('#historyFilter').onchange = render;
  async function load() {
    if (busy) return; busy = true;
    $('.profile-more').disabled = true;
    $('.profile-history-status').textContent = 'Buscando suas partidas…';
    try {
      const page = await loadMatches(account.uid, cursor);
      if (!alive) return;
      const seen = new Set(matches.map(m => m.matchId));
      matches.push(...page.matches.filter(m => !seen.has(m.matchId)));
      cursor = page.cursor; hasMore = page.hasMore; render();
    } catch {
      if (!alive) return;
      $('.profile-history-status').textContent = 'Não foi possível buscar o histórico. Confira sua conexão e tente novamente.';
      $('.profile-more').hidden = false;
      $('.profile-more').textContent = 'Tentar novamente';
    } finally { busy = false; $('.profile-more').disabled = false; }
  }
  $('.profile-more').onclick = () => { $('.profile-more').textContent = 'Carregar mais partidas'; void load(); };
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    $('.profile-save-status').textContent = 'Salvando…';
    try {
      await saveProfile({ name: form.elements.name.value, pixKey: form.elements.pixKey.value });
      identity(); $('.profile-save-status').textContent = 'Perfil atualizado. Seus resultados anteriores foram preservados.';
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
