// Read-only decoding of original files. Output is measurement data, not rewritten audio.
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=resolve('.');
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())result.push(...await files(path));else if(/\.(mp3|wav)$/i.test(path))result.push(path);}return result;}
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage();await page.goto('about:blank');
  const results=[];
  for(const file of (await files(resolve('assets'))).sort()){
    const bytes=await readFile(file),src=relative(root,file).replaceAll('\\','/');
    const metrics=await page.evaluate(async base64=>{
      window.auditContext ||= new OfflineAudioContext(2,1,48000);
      const raw=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      const buffer=await auditContext.decodeAudioData(raw.buffer);
      const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
      const block=Math.round(buffer.sampleRate*.4),energies=[];let peak=0,total=0;
      for(let start=0;start<buffer.length;start+=block){
        const end=Math.min(buffer.length,start+block);let energy=0;
        for(const channel of channels)for(let i=start;i<end;i++){const value=channel[i];energy+=value*value;peak=Math.max(peak,Math.abs(value));}
        total+=energy;energies.push(energy/((end-start)*channels.length));
      }
      const rms=Math.sqrt(total/(buffer.length*channels.length));
      const absolute=energies.filter(e=>e>1e-6),mean=absolute.reduce((a,b)=>a+b,0)/(absolute.length||1);
      const gated=absolute.filter(e=>e>mean*Math.pow(10,-1.5));
      const gatedRms=Math.sqrt(gated.reduce((a,b)=>a+b,0)/(gated.length||1));
      return{duration:buffer.duration,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,peak,rms,
        peakDb:20*Math.log10(peak||1e-12),rmsDb:20*Math.log10(rms||1e-12),gatedRmsDb:20*Math.log10(gatedRms||1e-12)};
    },bytes.toString('base64'));
    results.push({src,sha256:createHash('sha256').update(bytes).digest('hex'),...metrics});
    console.log(src,metrics.duration.toFixed(2)+'s','RMS',metrics.gatedRmsDb.toFixed(2),'peak',metrics.peakDb.toFixed(2));
  }
  await mkdir('.cache',{recursive:true});await writeFile('.cache/audio-level-audit.json',JSON.stringify(results,null,2)+'\n');
  console.log('Decoded originals:',results.length);
}finally{await browser.close();}
