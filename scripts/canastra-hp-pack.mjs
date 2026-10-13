// Lossless packing of experiment-generated logs, never production/user assets.
import { readdirSync, readFileSync, writeFileSync, unlinkSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { enrichRow } from './canastra-hp-summary.mjs';

const root=realpathSync(resolve(process.argv[2]||'docs/metrics/canastra-hp-2026-10-12'));
const directories=[root,...readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>resolve(root,d.name))];
const indexPath=resolve(root,'archives.json');
let previous=[];
try { previous=JSON.parse(readFileSync(indexPath,'utf8')); } catch { /* First packing. */ }
const packed=[];
for(const directory of directories) {
  const completion=JSON.parse(readFileSync(resolve(directory,'completion.json'),'utf8'));
  if(completion.failed||completion.productionFilesChanged.length)throw Error(`Unsafe incomplete batch: ${directory}`);
  for(const name of readdirSync(directory).filter(p=>/^(?:banker|dominadora|matriarca_esmeralda|nehelenia|nemesis|dimitrescu)-.*\.jsonl$/.test(p))) {
    const source=realpathSync(resolve(directory,name));
    if(!source.startsWith(root+sep))throw Error('Packing target escapes metrics directory');
    const original=readFileSync(source);
    const rows=original.toString('utf8').trim().split('\n').filter(Boolean).map(line=>enrichRow(JSON.parse(line)));
    const content=Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
    const compressed=gzipSync(content,{level:9}),target=source+'.gz';
    writeFileSync(target,compressed);
    if(!gunzipSync(readFileSync(target)).equals(content))throw Error('Compressed evidence failed round-trip');
    packed.push({path:target.slice(root.length+1).replaceAll('\\','/'),rows:rows.length,
      originalBytes:original.length,normalizedBytes:content.length,gzipBytes:compressed.length,
      sha256:createHash('sha256').update(compressed).digest('hex'),
      originalSha256:createHash('sha256').update(original).digest('hex')});
    // Exact validated generated file; its entire enriched trace is recoverable from .gz.
    unlinkSync(source);
  }
}
const replaced=new Set(packed.map(p=>p.path));
writeFileSync(indexPath,JSON.stringify([...previous.filter(p=>!replaced.has(p.path)),...packed],null,2));
console.log(JSON.stringify({files:packed.length,rows:packed.reduce((n,p)=>n+p.rows,0),
  before:packed.reduce((n,p)=>n+p.originalBytes,0),after:packed.reduce((n,p)=>n+p.gzipBytes,0)}));
