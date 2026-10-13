import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createDeck } from '../js/deck.js';
const deck = new Map(createDeck(['♠','♦','♣','♥'],['A','2','3','4','5','6','7','8','9','10','J','Q','K']).map(c => [c.id,c]));
export function enrichRow(r) {
  // Older batch workers recorded the planner classification. The real app UI
  // treats a 14-card sequence containing a substituted rank as Suja, not Ás-a-Ás.
  // Reconstruct only that distinction from immutable physical card identities.
  const counts={suja:0,limpa:0,real:0,asas:0};
  for (const meld of r.physicalMelds) {
    const cards=meld.cardIds.map(id=>deck.get(id));
    const naturalAceToAce=cards.length===14 && cards.every(c=>!c.joker && c.suit===cards[0].suit)
      && cards.filter(c=>c.rank==='A').length===2
      && ['2','3','4','5','6','7','8','9','10','J','Q','K'].every(rank=>cards.some(c=>c.rank===rank));
    if(meld.kind==='asas'&&!naturalAceToAce) { meld.plannerKind='asas'; meld.kind='suja'; }
    if(meld.kind in counts)counts[meld.kind]++;
  }
  r.finalCounts=counts;
  const tiers={simple:0,suja:1,limpa:2,real:3,asas:4}, highest=new Map();
  for(const e of r.events)if(e.type==='bossDamage'&&tiers[e.newKind]) {
    const id=e.actionId.match(/^meld_(.*)_\d+$/)?.[1]||e.actionId;
    if((tiers[highest.get(id)]||0)<tiers[e.newKind])highest.set(id,e.newKind);
  }
  r.highestCounts={suja:0,limpa:0,real:0,asas:0};
  for(const kind of highest.values())r.highestCounts[kind]++;
  r.nominalBonusExtra=r.highestCounts.limpa*20+r.highestCounts.real*200+r.highestCounts.asas*550;
  r.damage.suppressedCards=r.events.filter(e=>e.type==='bossDamage').reduce((n,e)=>
    n+Number(e.newMoonSuppressedDamage||0)+Number(e.tigerClawSuppressedDamage||0),0);
  r.damage.auxiliaryHealing=r.damage.daughterHealing+r.events.filter(e=>e.type==='bossAbility'&&e.abilityId==='parasite_regeneration')
    .reduce((n,e)=>n+Number(e.outcome.match(/Regeneração: \+(\d+) HP/)?.[1]||0),0);
  const byCard=new Map(r.physicalMelds.flatMap(m=>m.cardIds.map(id=>[id,m])));
  for(const a of r.actions)if(a?.bossEvent?.type==='bossDamage') {
    const card=(a.cards||a.discardPresentation?.meldCards||[]).find(c=>byCard.has(c.id));
    if(card)byCard.get(card.id).id=a.bossEvent.actionId.match(/^meld_(.*)_\d+$/)?.[1]||byCard.get(card.id).id;
  }
  r.plannerClassificationMismatches=r.physicalMelds.filter(m=>m.plannerKind&&m.kind!==m.plannerKind).length;
  return r;
}

export function distribution(values) {
  const sorted = values.slice().sort((a,b) => a-b), n = sorted.length;
  const histogram = sorted.reduce((h,v) => (h[v] = (h[v] || 0) + 1, h), {});
  return { n, mean: n ? sorted.reduce((a,b) => a+b,0)/n : null,
    median: n ? (sorted[Math.floor((n-1)/2)] + sorted[Math.ceil((n-1)/2)])/2 : null,
    min: sorted[0] ?? null, max: sorted.at(-1) ?? null,
    p25: sorted[Math.floor((n-1)*.25)] ?? null, p75: sorted[Math.floor((n-1)*.75)] ?? null, histogram };
}
export function summarize(rows) {
  const completed = rows.filter(r => r.complete), reasons = rows.reduce((h,r) => (h[r.reason]=(h[r.reason]||0)+1,h),{});
  const numeric = field => distribution(completed.map(field));
  const counts = field => Object.fromEntries(['suja','limpa','real','asas'].map(kind => [kind,numeric(r => r[field][kind])]));
  return { attempted: rows.length, completed: completed.length, censored: rows.length-completed.length,
    wins: completed.filter(r => r.victory).length, losses: completed.filter(r => r.victory === false).length,
    reasons, initialHp: rows[0]?.initialHp, finalCounts: counts('finalCounts'), reachedCounts: counts('reachedCounts'),
    highestCounts: counts('highestCounts'),
    asas: { zero: completed.filter(r => r.reachedCounts.asas === 0).length,
      one: completed.filter(r => r.reachedCounts.asas === 1).length,
      two: completed.filter(r => r.reachedCounts.asas === 2).length,
      moreThanTwo: completed.filter(r => r.reachedCounts.asas > 2).length },
    counterfactualBonusExtra: numeric(r => r.counterfactualBonusExtra),
    nominalBonusExtra:numeric(r=>r.nominalBonusExtra),
    damage: Object.fromEntries(Object.keys(rows[0]?.damage || {}).map(k => [k,numeric(r => r.damage[k])])),
    hp: numeric(r => r.hp), turns: numeric(r => r.turns), rounds: numeric(r => r.rounds),
    phase: numeric(r => r.phase), deadTaken: numeric(r => r.deadTaken), stock: numeric(r => r.stock),
    itemsUsed: numeric(r => r.itemsUsed.length), maxZombies: numeric(r => r.maxZombies),
    winsWithoutAsas: completed.filter(r => r.victory && r.reachedCounts.asas === 0).length,
    twoOrMoreAsasWins: completed.filter(r => r.victory && r.reachedCounts.asas >= 2).length,
    twoOrMoreAsasLosses: completed.filter(r => !r.victory && r.reachedCounts.asas >= 2).length,
    errors: rows.filter(r => r.errors.length).length,
    plannerClassificationMismatches:numeric(r=>r.plannerClassificationMismatches||0) };
}
export function readRows(directory) {
  const files=readdirSync(directory);
  return files.filter(p => /^(?:banker|dominadora|matriarca_esmeralda|nehelenia|nemesis|dimitrescu)-.*\.jsonl(?:\.gz)?$/.test(p)
      && !(p.endsWith('.gz')&&files.includes(p.slice(0,-3))))
    .flatMap(p => {
      const content=readFileSync(resolve(directory,p));
      return (p.endsWith('.gz')?gunzipSync(content).toString('utf8'):content.toString('utf8'))
        .trim().split('\n').filter(Boolean).map(line=>enrichRow(JSON.parse(line)));
    });
}
export function buildSummary(directories) {
  const rows = directories.flatMap(readRows), groups = {};
  for (const r of rows) (groups[`${r.bossId}:${r.scenario}`] ||= []).push(r);
  const grouped = Object.fromEntries(Object.entries(groups).map(([key,value]) => [key,summarize(value)]));
  const pairs = {};
  for (const bossId of [...new Set(rows.map(r => r.bossId))]) {
    const base = groups[`${bossId}:current`] || [];
    for (const scenario of [...new Set(rows.filter(r=>r.bossId===bossId&&r.scenario!=='current').map(r=>r.scenario))]) {
      const map = new Map((groups[`${bossId}:${scenario}`] || []).map(r => [r.seed,r]));
      const matched = base.filter(r => r.complete && map.get(r.seed)?.complete).map(a => ({ a,b:map.get(a.seed) }));
      if (!map.size) continue;
      if (matched.some(({a,b}) => a.deckHash !== b.deckHash)) throw Error('Paired physical decks differ');
      pairs[`${bossId}:${scenario}`] = { n: matched.length,
        baselineWins: matched.filter(({a}) => a.victory).length, newWins: matched.filter(({b}) => b.victory).length,
        lossToWin: matched.filter(({a,b}) => !a.victory && b.victory).length,
        winToLoss: matched.filter(({a,b}) => a.victory && !b.victory).length,
        actualBonusDifference: distribution(matched.map(({a,b}) => b.damage.bonuses-a.damage.bonuses)),
        actualCardDifference: distribution(matched.map(({a,b}) => b.damage.cards-a.damage.cards)),
        actualMainDamageDifference: distribution(matched.map(({a,b}) => b.damage.mainAttack+b.damage.dagger-a.damage.mainAttack-a.damage.dagger)),
        actualHpDifference: distribution(matched.map(({a,b}) => b.hp-a.hp)),
        actualTurnDifference: distribution(matched.map(({a,b}) => b.turns-a.turns)),
        completedSeeds: matched.map(({a}) => a.seed) };
    }
  }
  return { directories, totals: { attempts: rows.length, complete: rows.filter(r => r.complete).length,
    censored: rows.filter(r => !r.complete).length }, grouped, pairs };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directories = process.argv.slice(2), summary = buildSummary(directories);
  const target = resolve(directories[0], 'summary.json');
  writeFileSync(target,JSON.stringify(summary,null,2));
  const columns = ['boss','scenario','attempted','completed','censored','wins','suja','limpa','real','asas','extra',
    'cards','bonuses','absorbed','overkill','heal','hp','turns','zeroAsas','oneAsas','twoAsas','moreAsas'];
  const table = [columns.join(',')];
  for (const [key,g] of Object.entries(summary.grouped)) {
    const [boss,scenario] = key.split(':'), mean = x => x?.mean?.toFixed(3) ?? '';
    table.push([boss,scenario,g.attempted,g.completed,g.censored,g.wins,...['suja','limpa','real','asas'].map(k => mean(g.highestCounts[k])),
      mean(g.counterfactualBonusExtra),mean(g.damage.cards),mean(g.damage.bonuses),mean(g.damage.absorbed),
      mean(g.damage.overkill),mean(g.damage.bossHealing),mean(g.hp),mean(g.turns),g.asas.zero,g.asas.one,g.asas.two,g.asas.moreThanTwo].join(','));
  }
  writeFileSync(resolve(directories[0],'summary.csv'),table.join('\n')+'\n');
  const rows=directories.flatMap(readRows), fields=['bossId','scenario','seed','complete','victory','reason','initialHp','hp',
    'turns','rounds','phase','deadTaken','stock','nominalBonusExtra','counterfactualBonusExtra'];
  const damageFields=Object.keys(rows[0]?.damage||{});
  const escape=value=>JSON.stringify(value??'');
  const csv=[[...fields,...['suja','limpa','real','asas'].map(k=>`highest_${k}`),
    ...['suja','limpa','real','asas'].map(k=>`final_${k}`),...damageFields.map(k=>`damage_${k}`)].join(',')];
  for(const r of rows)csv.push([...fields.map(k=>escape(r[k])),...['suja','limpa','real','asas'].map(k=>r.highestCounts[k]),
    ...['suja','limpa','real','asas'].map(k=>r.finalCounts[k]),...damageFields.map(k=>r.damage[k])].join(','));
  writeFileSync(resolve(directories[0],'battles.csv'),csv.join('\n')+'\n');
  console.log(table.join('\n'));
  console.log(JSON.stringify(summary.totals));
}
