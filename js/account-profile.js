// Perfis não contêm senha: ela pertence exclusivamente ao Firebase Authentication.
export function normalizeProfile(input) {
  const name = String(input?.name || '').trim().replace(/\s+/g, ' ');
  const pixKey = String(input?.pixKey || '').trim();
  if (name.length < 2 || name.length > 60 || /[<>\x00-\x1f]/.test(name)) throw new Error('Use um nome de 2 a 60 caracteres, sem símbolos < ou >.');
  if (/bot/i.test(name)) throw new Error('Escolha um nome sem “bot”, reservado aos jogadores automáticos.');
  if (!pixKey || pixKey.length > 140 || /[<>\x00-\x1f]/.test(pixKey)) throw new Error('Informe sua chave Pix (até 140 caracteres).');
  return { name, pixKey };
}

export function teamForSeat(mode, seat) {
  if (!Number.isInteger(seat) || seat < 0 || seat > 3) return -1;
  if (mode.startsWith('boss_')) return seat < 2 ? 0 : -1;
  if (mode === '2x2') return seat % 2;
  if (mode === '1x2') return seat < 3 ? (seat === 0 ? 0 : 1) : -1;
  if (mode === '1x3') return seat === 0 ? 0 : 1;
  return seat < 2 ? seat : -1;
}

export function profileInLobby(lobby, seat, profile, previousSeat = -1) {
  const team = teamForSeat(lobby.mode || '', seat);
  if (team < 0 && seat !== -1) return lobby;
  const names = [...(lobby.names || ['', '', '', ''])];
  const pixKeys = [...(lobby.pixKeys || ['', ''])];
  const owners = [...(lobby.seatAccountIds || ['', '', '', ''])];
  const ready = [...(lobby.ready || [false, false, false, false])];
  let released = false;
  for (let old = 0; old < names.length; old++) {
    if (old === seat) continue;
    const oldTeam = teamForSeat(lobby.mode || '', old);
    const owned = profile.uid && owners[old] === profile.uid;
    // Compatibilidade com lobbies preenchidos antes de gravarmos o dono da cadeira.
    const legacy = old === previousSeat && !owners[old] && names[old] === profile.name && pixKeys[oldTeam] === profile.pixKey;
    if (!owned && !legacy) continue;
    names[old] = '';
    owners[old] = '';
    ready[old] = false;
    released = true;
    const hasPartner = names.some((name, index) => index !== old && name && teamForSeat(lobby.mode || '', index) === oldTeam);
    if (oldTeam >= 0 && oldTeam !== team && !hasPartner && pixKeys[oldTeam] === profile.pixKey) pixKeys[oldTeam] = '';
  }
  if (team < 0) return released ? { ...lobby, names, pixKeys, ready, seatAccountIds: owners } : lobby;
  if (names[seat] !== profile.name || (profile.uid && owners[seat] !== profile.uid)) ready[seat] = false;
  names[seat] = profile.name;
  if (profile.uid) owners[seat] = profile.uid;
  // O primeiro jogador de cada time fornece a chave. Parceiros só preenchem se vazia.
  const primary = seat === 0 || (seat === 1 && !String(lobby.mode).startsWith('boss_'));
  if (primary || !pixKeys[team]) pixKeys[team] = profile.pixKey;
  return { ...lobby, names, pixKeys, ready, ...(profile.uid ? { seatAccountIds: owners } : {}) };
}
