#!/usr/bin/env node
// Execução reproduzível no workspace atualizado, sem alterar fontes ou métricas históricas.
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname,'..');
const tests = resolve(root,'tests');
const all=process.argv.includes('--all');
const save=process.argv.includes('--save');
const filenames=readdirSync(tests).filter(x=>x.endsWith('.test.mjs'));
const allowed=/^(boss-|nemesis-|nehelenia-|dominatrix-|matriarch-|dimitrescu-|cooperative-balance-|canastra-hp-)/;
const selected=filenames.filter(x=>all || (allowed.test(x)&&!/experiment|battle/i.test(x))).sort();
if(!selected.length){console.error('Nenhum teste selecionado em',tests);process.exit(2);}
console.log(`Executando ${selected.length} arquivos de teste, ${all?'suite geral':'suite dos chefes'}...`);
const child=spawnSync(process.execPath,['--test',...selected.map(x=>resolve(tests,x))],{
 cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,env:process.env
});
const stdout=child.stdout||'',stderr=child.stderr||'';
process.stdout.write(stdout);process.stderr.write(stderr);
const record={mode:all?'all':'bosses',files:selected.length,exitCode:child.status,signal:child.signal,
 summary:Object.fromEntries(['tests','pass','fail','skipped','cancelled','duration_ms'].map(k=>{
  const m=stdout.match(new RegExp(`(?:^|\\n)(?:#|ℹ)\\s*${k}\\s+(\\d+(?:\\.\\d+)?)`,'m'));
  return [k,m?Number(m[1]):null];
 }))};
if(save){const dir=resolve(root,'docs');mkdirSync(dir,{recursive:true});
 writeFileSync(resolve(dir,'ultima-suite-chefes.log'),stdout+'\n'+stderr);
 writeFileSync(resolve(dir,'ultima-suite-chefes.json'),JSON.stringify(record,null,2)+'\n');}
console.log('Resumo:',JSON.stringify(record));
process.exit(child.status??1);
