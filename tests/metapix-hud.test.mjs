import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the production HUD without Firebase, using two independent clients.
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const marker = app.indexOf('// 🎨 PINTANDO A CHECKLIST DE METAS');
assert.ok(marker > 0);
const start = app.indexOf("const hud = document.getElementById('goalsHud');", marker);
const end = app.indexOf("\n  } else {\n    const hud = document.getElementById('goalsHud');", start);
assert.ok(end > start);
const source = app.slice(start, end);
const fin = (total, countAsas) => ({ total, b: {
  diff: 2, negative: 0, countAsas, hasHumilhacao: false, virgemDeMorto: false,
  canastraQuantityBonus: 0, myTookMorto: 1, valorVirgem: 0, oppProjected: 200,
  asas: countAsas * 3, oppCanastras: 1, humilhacaoSuprema: 0, totalCanastras: 1,
} });
function client(playerId) {
  const nodes = Object.fromEntries(['goalsHud', 'winnerNameHud', 'goalsTotalHud', 'goalsCounterHud', 'goalsListHud'].map((id) => [id, {
    style: {}, textContent: '', innerHTML: '', classList: { toggle() {} },
  }]));
  const context = vm.createContext({
    document: { getElementById: (id) => nodes[id] }, myPlayerIndex: playerId,
    window: {}, s1: 300, s2: 100, proj1: 100, proj2: 50,
    state: { finished: false, players: [{ teamId: 0 }, { teamId: 1 }],
      teams: [{ name: 'Time A', melds: [] }, { name: 'Time B', melds: [] }], deadChunksTaken: [1, 2] },
    fin1: fin(17, 1), fin2: fin(28, 2),
  });
  return { context, render() {
    vm.runInContext(`{${source}}`, context);
    return { name: nodes.winnerNameHud.textContent, total: nodes.goalsTotalHud.textContent,
      count: nodes.goalsCounterHud.textContent, items: nodes.goalsListHud.innerHTML };
  } };
}

test('MetaPix e identica para ambos e acompanha a troca de lideranca', () => {
  const clients = [client(0), client(1)];
  const finances = clients.map(({ context }) => JSON.stringify([context.fin1, context.fin2]));
  const first = clients.map((viewer) => viewer.render());
  assert.deepEqual(first[0], first[1]);
  assert.equal(first[0].name, '(Time A)');
  assert.equal(first[0].total, 'R$ 17,00');
  assert.match(first[0].items, /Ás-a-Ás \(1\/4\)/);
  for (const viewer of clients) viewer.context.s2 = 500;
  const switched = clients.map((viewer) => viewer.render());
  assert.deepEqual(switched[0], switched[1]);
  assert.equal(switched[0].name, '(Time B)');
  assert.equal(switched[0].total, 'R$ 28,00');
  assert.match(switched[0].items, /Ás-a-Ás \(2\/4\)/);
  clients.forEach(({ context }, i) => assert.equal(JSON.stringify([context.fin1, context.fin2]), finances[i]));
});

test('empate mostra tabela neutra igual para ambos, sem metas do antigo lider', () => {
  const clients = [client(0), client(1)];
  for (const viewer of clients) { viewer.render(); viewer.context.s2 = viewer.context.s1; }
  const tied = clients.map((viewer) => viewer.render());
  assert.deepEqual(tied[0], tied[1]);
  assert.equal(tied[0].name, '(Empate — sem líder)');
  assert.equal(tied[0].total, 'R$ 0,00');
  assert.equal(tied[0].count, '(0/8)');
  assert.doesNotMatch(tied[0].items, /goal-item achieved/);
});

test('fim segue o vencedor financeiro pelos pontos finais, nao a cadeira nem quem bateu', () => {
  const clients = [client(0), client(1)];
  for (const { context } of clients) {
    context.state.finished = true;
    context.state.winnerTeamId = 0;
    context.proj1 = -50;
    context.proj2 = 120;
    context.window.calculatePixFin = (winner, loser, melds, rivalMelds, dead, rivalDead) => {
      assert.equal(winner, 120); assert.equal(loser, -50);
      assert.equal(melds, context.state.teams[1].melds);
      assert.equal(rivalMelds, context.state.teams[0].melds);
      assert.equal(dead, 2); assert.equal(rivalDead, true);
      return fin(42, 2);
    };
  }
  const final = clients.map((viewer) => viewer.render());
  assert.deepEqual(final[0], final[1]);
  assert.equal(final[0].name, '(Time B)');
  assert.equal(final[0].total, 'R$ 42,00');
});
