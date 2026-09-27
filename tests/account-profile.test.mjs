import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeProfile, teamForSeat, profileInLobby } from '../js/account-profile.js';

test('perfil aceita formatos de Pix sem guardar senha ou email duplicados', () => {
  for (const pixKey of ['123.456.789-00', '+5511999999999', 'pessoa@example.test', 'abcd-1234']) {
    assert.deepEqual(normalizeProfile({ name: '  Maria   Silva ', pixKey, password: 'secret', email: 'x' }), { name: 'Maria Silva', pixKey });
  }
  for (const input of [{ name: 'A', pixKey: 'x' }, { name: '<img>', pixKey: 'x' }, { name: 'BOT Joana', pixKey: 'x' }, { name: 'Joana', pixKey: '' }]) {
    assert.throws(() => normalizeProfile(input));
  }
});

test('mapa correto de cadeira/time para todos os modos', () => {
  const modes = { '1x1': [0, 1, -1, -1], '1x1_duploMorto': [0, 1, -1, -1], '1x1_dominacao': [0, 1, -1, -1], '2x2': [0, 1, 0, 1], '1x2': [0, 1, 1, -1], '1x3': [0, 1, 1, 1], boss_banker: [0, 0, -1, -1], boss_matriarca: [0, 0, -1, -1], boss_dominadora: [0, 0, -1, -1] };
  for (const [mode, teams] of Object.entries(modes)) assert.deepEqual([0, 1, 2, 3].map(seat => teamForSeat(mode, seat)), teams, mode);
  assert.equal(teamForSeat('2x2', -1), -1);
});

test('preenche apenas nome próprio e Pix do time; não troca chave do parceiro nem altera original', () => {
  const lobby = { mode: '1x1', names: ['A', 'B', '', ''], pixKeys: ['pix-a', 'pix-b'], ready: [true, false] };
  const profile = { name: 'Maria', pixKey: 'pix-maria' };
  const next = profileInLobby(lobby, 1, profile);
  assert.deepEqual(next.names, ['A', 'Maria', '', '']);
  assert.deepEqual(next.pixKeys, ['pix-a', 'pix-maria']);
  assert.deepEqual(lobby.pixKeys, ['pix-a', 'pix-b']);
  assert.equal(profileInLobby({ ...lobby, mode: '2x2' }, 2, profile).pixKeys[0], 'pix-a');
  assert.equal(profileInLobby({ ...lobby, mode: 'boss_banker' }, 1, profile).pixKeys[0], 'pix-a');
  assert.equal(profileInLobby({ ...lobby, mode: '1x3', pixKeys: ['', ''] }, 3, profile).pixKeys[1], 'pix-maria');
  assert.equal(profileInLobby(lobby, -1, profile), lobby);
});

test('sincronização usa lobby atual na transação, não altera partida iniciada e não repete snapshot', async () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const source = app.slice(app.indexOf('async function syncAccountSeat('), app.indexOf('\n}', app.indexOf('async function syncAccountSeat(')) + 2);
  const data = { lobby: { mode: '1x1', names: ['Outro atualizado', 'antigo'], pixKeys: ['pix-outro', 'antigo'] } };
  let updates = [];
  const context = { activeAccount: { name: 'Maria', pixKey: 'maria-pix' }, state: null, myPlayerIndex: 1, currentLobby: { mode: '1x1' }, accountSeatStamp: '', teamForSeat, profileInLobby, db: {}, gameRef: {}, runTransaction: async (_db, fn) => fn({ get: async () => ({ data: () => data }), update: (_ref, value) => updates.push(value) }) };
  vm.createContext(context);
  vm.runInContext(source, context);
  await context.syncAccountSeat();
  assert.deepEqual(Array.from(updates[0].lobby.names), ['Outro atualizado', 'Maria']);
  assert.deepEqual(Array.from(updates[0].lobby.pixKeys), ['pix-outro', 'maria-pix']);
  await context.syncAccountSeat();
  assert.equal(updates.length, 1);
  data.stateJson = '{}';
  await context.syncAccountSeat(true);
  assert.equal(updates.length, 1);
});

test('partida só importa depois da conta; regras não aceitam perfis alheios/listagem/senhas', () => {
  const boot = readFileSync(new URL('../js/bootstrap.js', import.meta.url), 'utf8');
  assert.ok(boot.indexOf('await requireAccount()') < boot.indexOf("import('../app.js')"));
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /request.auth.uid == uid/);
  assert.match(rules, /hasOnly\(\['name', 'pixKey'\]\)/);
  assert.doesNotMatch(rules, /allow list/);
});

test('trocar cadeira limpa nome/Pix próprios anteriores e cancela pronto', () => {
  const profile = { uid: 'maria', name: 'Maria', pixKey: 'pix-maria' };
  const before = profileInLobby({ mode: '1x1', names: ['', ''], pixKeys: ['', ''] }, 0, profile);
  before.ready[0] = true;
  const after = profileInLobby(before, 1, profile, 0);
  assert.deepEqual(after.names, ['', 'Maria']);
  assert.deepEqual(after.pixKeys, ['', 'pix-maria']);
  assert.deepEqual(after.ready, [false, false, false, false]);
  assert.equal(after.seatAccountIds[0], '');
  assert.equal(after.seatAccountIds[1], 'maria');
  assert.equal(before.names[0], 'Maria');
  const left = profileInLobby(after, -1, profile, 1);
  assert.deepEqual(left.names, ['', '']);
  assert.deepEqual(left.pixKeys, ['', '']);
});

test('troca preserva outro dono com mesmo nome e Pix compartilhado com parceiro', () => {
  const profile = { uid: 'maria', name: 'Maria', pixKey: 'pix-maria' };
  const replaced = { mode: '1x1', names: ['Maria', ''], pixKeys: ['pix-maria', ''], seatAccountIds: ['outra-conta', ''] };
  assert.equal(profileInLobby(replaced, 1, profile, 0).names[0], 'Maria');
  const shared = { mode: '2x2', names: ['Maria', '', 'Parceiro', ''], pixKeys: ['pix-maria', ''], seatAccountIds: ['maria', '', 'parceiro', ''] };
  const moved = profileInLobby(shared, 1, profile, 0);
  assert.equal(moved.names[0], '');
  assert.equal(moved.names[2], 'Parceiro');
  assert.equal(moved.pixKeys[0], 'pix-maria');
  const legacy = { mode: '1x1', names: ['Maria', ''], pixKeys: ['pix-maria', ''] };
  assert.equal(profileInLobby(legacy, 1, profile, 0).names[0], '');
});
