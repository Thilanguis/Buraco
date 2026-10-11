// Build measured tables from the reproducible artifacts, never estimated wins.
import { readFile, writeFile } from 'node:fs/promises';
import { listBossDefinitions } from '../js/boss/boss-registry.js';
const data=JSON.parse(await readFile('docs/experiments/chefe-especial-pareado-2026-10-10.json','utf8'));
const variety=JSON.parse(await readFile('docs/experiments/chefe-variedade-atual-2026-10-10.json','utf8'));
if(data.count!==12||!data.method.includes('seeded Fisher–Yates')||data.rows.length!==144)throw Error('Expected final 144-battle discard cohort');
const definitions=listBossDefinitions(),sum=(rows,fn)=>rows.reduce((n,r)=>n+fn(r),0);
const mean=(rows,fn)=>rows.length?(sum(rows,fn)/rows.length).toFixed(1):'—';
const names=Object.fromEntries(definitions.map(d=>[d.id,d.name]));
const lines=['# Balanceamento e ritmo dos seis chefes — 10/10/2026','',
'## Método e limites','',
`${data.rows.length} batalhas completas: ${data.count} seeds (${data.start}–${data.start+data.count-1}) por chefe, pareadas com/sem Especial. Todos os braços usam o mesmo baralho físico inicial, motor canônico e política de baixar cartas BossBuracoBot. O controlador experimental escolhe usar o Especial assim que puder, para o jogador da vez. Não é uma política nova do BOT de produção.`, '',
'O experimento aplica o mesmo seletor canônico de itens nos dois braços da Lady, depois da compra normal. Não equivale a um humano competente nem à automação completa do aplicativo. Compra normal de uma carta, financiamento real, escolhas canônicas, reciclagem Fisher–Yates com seed por Morto e derrota por recursos antes das passivas de fim de turno. Limite de segurança: 180 turnos.', '',
'O Especial retira exatamente cinco cartas do topo do Lixo; respeita bloqueios/reações e não consome cartas do Monte. Não altera a compra normal. Tempo abaixo é execução CPU sem pausas/animações, não duração de uma partida humana. Rodar outros processos altera essa medida.', '',
'O contador `damage` vem de `boss.stats.totalDamage`: contribuições creditadas ao HP dos alvos e Ataque Final contabilizado pelo motor. Não mede dano absorvido pela PROT./Coágulo nem transferência da Adaga/ticks como uma nova contribuição. Portanto “sem dano” abaixo significa sem aumento desse contador, não ausência de qualquer progresso de combate. Os arquivos preservam o traço de cada turno; não presumir benefício humano a partir da taxa de vitória deste controlador.', '',
'## Comparação pareada','',
'Médias por batalha, salvo vitórias e maior sequência. Canastras incluem as categorias contabilizadas pelo motor; pontos do Especial só vêm de Limpa/Real/Ás-a-Ás.', '',
'| Chefe | Especial | Vitórias / completas | Turnos | Máx. sequência sem baixar (média / pior) | Sem dano creditado (média / pior) | Cartas na mão ao fim (equipe) | Monte ao fim | Canastras | Pontos ganhos | Usos / cartas recebidas | CPU (s) |',
'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
for(const d of definitions)for(const enabled of [false,true]){
 const rows=data.rows.filter(r=>r.bossId===d.id&&r.enabled===enabled);
 lines.push(`| ${d.name} | ${enabled?'Com':'Sem'} | ${rows.filter(r=>r.result===true).length} / ${rows.filter(r=>r.result!==null).length} | ${mean(rows,r=>r.turns)} | ${mean(rows,r=>r.maxNoPlay)} / ${Math.max(...rows.map(r=>r.maxNoPlay))} | ${mean(rows,r=>r.maxNoDamage)} / ${Math.max(...rows.map(r=>r.maxNoDamage))} | ${mean(rows,r=>sum(r.hands,h=>h))} | ${mean(rows,r=>r.stock)} | ${mean(rows,r=>r.canastras)} | ${mean(rows,r=>r.earned)} | ${sum(rows,r=>r.activations)} / ${sum(rows,r=>r.received)} | ${mean(rows,r=>r.durationCpuMs/1000)} |`);
}
lines.push('', '## Janela crítica: dois Mortos retirados, Monte de 20–30 cartas','',
'Janela exige `deadTaken >= 2`, não apenas pilhas vazias por reciclagem. Sequências são os contadores correntes do turno observado. Ausência de amostra é explicitada, não substituída por estados fabricados.', '',
'| Chefe | Especial | Batalhas que chegaram à janela | Turnos observados | Mão média (equipe) | Sem baixar / sem dano nesses turnos | Maior sequência sem baixar / sem dano |',
'| --- | --- | --- | --- | --- | --- | --- |');
for(const d of definitions)for(const enabled of [false,true]){
 const rows=data.rows.filter(r=>r.bossId===d.id&&r.enabled===enabled);
 const test=t=>t.deadTaken>=2&&t.stockBefore>=20&&t.stockBefore<=30;
 const trace=rows.flatMap(r=>r.trace.filter(test));
 lines.push(`| ${d.name} | ${enabled?'Com':'Sem'} | ${rows.filter(r=>r.trace.some(test)).length} / ${rows.length} | ${trace.length} | ${mean(trace,t=>sum(t.hands,h=>h))} | ${trace.filter(t=>!t.playedMoves).length} / ${trace.filter(t=>!t.damage).length} | ${trace.length?Math.max(...trace.map(t=>t.noPlay)):'—'} / ${trace.length?Math.max(...trace.map(t=>t.noDamage)):'—'} |`);
}
lines.push('', '## Cargas, itens e causas de encerramento','');
for(const d of definitions){
 const rows=data.rows.filter(r=>r.bossId===d.id);
 lines.push(`### ${d.name}`,'');
 for(const enabled of [false,true]){
  const arm=rows.filter(r=>r.enabled===enabled),causes={};for(const r of arm)causes[r.reason]=(causes[r.reason]||0)+1;
  const loaded=arm.flatMap(r=>r.trace.filter(t=>t.gained&&t.earned>=100).map(t=>t.turn));
  const used=arm.flatMap(r=>r.trace.filter(t=>t.activations).map(t=>t.turn));
  lines.push(`- ${enabled?'Com':'Sem'}: causas ${Object.entries(causes).map(([k,v])=>`${k}=${v}`).join(', ')}; primeiro turno observado com saldo conquistado de pelo menos 100: ${loaded.length?Math.min(...loaded):'nenhum'}; ativações nos turnos ${used.length?[...new Set(used)].sort((a,b)=>a-b).join(', '):'nenhuma'}; itens usados: ${sum(arm,r=>r.usedItems.length)}.`);
 }
 lines.push('');
}
lines.push('## Interpretação','',
'A retirada do Lixo não acelera diretamente o esgotamento do Monte: a ativação deixa seu tamanho intacto. Pode mudar indiretamente quantos turnos a batalha dura e quantas compras normais serão necessárias. Compare essas trajetórias, não apenas o Monte final.', '',
'Cargas conquistadas tarde, Lixo abaixo de cinco ou bloqueios podem impedir uso justamente no trecho ocioso. Os totais acima mostram a cobertura efetiva; este controlador gasta cedo e não reserva cargas para a janela crítica. Não autoriza concluir que o Especial resolveu o travamento humano. Recomendação: manter as regras aprovadas, coletar logs de humanos e comparar uso imediato versus reserva estratégica em uma próxima validação, sem criar outra recuperação ou mudar números agora.', '',
'Dados integrais: [144 batalhas e traços](experiments/chefe-especial-pareado-2026-10-10.json). Reprodução: `node scripts/boss-special-experiment.mjs 12 101001`, depois `node scripts/boss-consolidated-report.mjs`.', '',
'## Variedade: catálogo atual, elegibilidade e frequência observada','',
'A tabela combina as 144 batalhas para medir oportunidades reais por fase. A observação de elegibilidade acontece antes do sorteio; o primeiro anúncio já resolvido pelo fixture conta em seleções, não inventa uma oportunidade anterior. “0 oportunidades” não significa habilidade inelegível; significa fase/condição não observada neste lote.', '',
'Separadamente, 15 estados dirigidos × 64 seeds × 3 fases × 6 chefes = 17.280 sorteios condicionais, mais 4.320 sorteios em sequências de histórico. São testes de variedade, não frequência de partidas humanas. Elegibilidade dirigida é uma contagem de cenários, não probabilidade de ocorrer.', '',
'| Chefe | Habilidades oficiais | F1 / F2 / F3 |', '| --- | --- | --- |');
for(const d of definitions){const v=variety.bosses[d.id];lines.push(`| ${d.name} | ${v.count} | ${[1,2,3].map(p=>v.phases[p].registered).join(' / ')} |`);}
for(const d of definitions){
 const rows=data.rows.filter(r=>r.bossId===d.id),observations=rows.flatMap(r=>r.eligibility),selections=rows.flatMap(r=>r.selections),v=variety.bosses[d.id];
 lines.push('',`### ${d.name}`,'','| Fase | Habilidade | Elegível / oportunidades em batalha | Seleções em batalha | Elegível em cenários dirigidos | Seleções condicionais / 960 |', '| --- | --- | --- | --- | --- | --- |');
 for(const phase of [1,2,3])for(const a of d.abilities.filter(a=>!a.debugOnly&&a.phases.includes(phase))){
  const obs=observations.filter(o=>o.phase===phase),eligible=obs.filter(o=>o.entries.some(e=>e.id===a.id&&e.eligible)).length;
  lines.push(`| ${phase} | ${a.name || a.id} (${a.id}) | ${eligible} / ${obs.length} | ${selections.filter(s=>s.phase===phase&&s.id===a.id).length} | ${v.phases[phase].eligible[a.id]||0} / 15 | ${v.phases[phase].selected[a.id]||0} |`);
 }
 const actualRepeat=sum(rows,r=>r.selections.slice(1).filter((s,i)=>s.id===r.selections[i].id&&s.phase===r.selections[i].phase).length);
 const probesRepeat=sum(Object.values(v.phases),p=>p.repeats);
 lines.push('',`Repetições consecutivas observadas na mesma fase: ${actualRepeat}. Repetições nos 720 sorteios sequenciais dirigidos: ${probesRepeat}.`);
}
lines.push('', '### Recomendação de variedade','',
'Não igualar catálogos a 13 por obrigação. O Banqueiro dispõe de quatro habilidades na fase 1 e oito nas fases seguintes; Juros Fixos tem peso maior, e Garantia exige condições reais. Frequência baixa de uma habilidade condicional não justifica removê-las nem forçar alvos inválidos. A proteção contra repetição só se aplica quando há outra elegível. Nenhum peso ou regra de elegibilidade foi alterado neste pacote.', '',
'Para a Lady, duas propostas temáticas completas estão em [PROPOSTAS_DIMITRESCU_2026-10-10.md](PROPOSTAS_DIMITRESCU_2026-10-10.md). Continuam fora da rotação, aguardando aprovação. Os demais chefes precisam de validação humana do incômodo com repetição antes de expandir o catálogo.', '',
'Dados condicionais: [variedade atual](experiments/chefe-variedade-atual-2026-10-10.json).');
await writeFile('docs/BALANCEAMENTO_SEIS_CHEFES_2026-10-10.md',lines.join('\n')+'\n');
console.log('Generated measured balance/variety report:',data.rows.length,'battles');
