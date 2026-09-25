// Convert supplied artwork without changing the originals or their printed indices.
const sharp = require(process.env.SHARP_PATH || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const source = process.argv[2] || path.join(process.env.USERPROFILE, 'Downloads');
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const suits = {
  clubs: ['23_21_02-1','23_21_21-1','23_21_23-2','23_21_25-3','23_21_04-2','23_21_27-4','23_21_30-5','23_21_28-1','23_21_31-2','23_21_33-3','23_21_06-3','23_21_07-4','23_21_10-5'],
  diamonds: ['23_21_07-1','23_19_53-1','23_19_55-2','23_19_56-3','23_21_09-2','23_19_58-4','23_20_00-5','23_19_44-1','23_19_46-2','23_19_48-3','23_21_11-3','23_21_13-4','23_21_15-5'],
  spades: ['23_20_57-1','23_20_09','23_19_59-1','23_20_01-2','23_21_00-2','23_20_03-3','23_20_05-4','23_51_48-1','23_51_51-2','23_51_53-3','23_21_02-3','23_21_04-4','23_21_07-5'],
  hearts: ['23_20_40-2','23_19_36-1','23_19_38-2','23_19_40-3','23_20_38-1','23_19_42-4','23_19_44-5','23_19_25-3','23_19_23-2','23_19_21-1','23_20_42-3','23_26_47','23_26_57'],
};
const entries = Object.entries(suits).flatMap(([suit,names]) => names.map((name,i) => [`${suit}-${ranks[i]}`,name]));
entries.push(['joker-red','23_19_05-1'],['joker-blue','23_19_09-2'],['back-red','23_18_56-2'],['back-blue','23_18_54-1'],['table','23_18_29']);
(async () => {
  const inputs = entries.map(([id,name]) => ({ id, file:path.join(source,`Imagem do ChatGPT 24 de set. de 2026, ${name}.png`) }));
  await Promise.all(inputs.map(({file}) => fs.access(file)));
  const target = path.join(__dirname,'../assets/resident');
  await fs.mkdir(path.join(target,'detail'),{recursive:true});
  for(const {id,file} of inputs) {
    await sharp(file).resize({width:id === 'table' ? 1672 : 384,withoutEnlargement:true}).webp({quality:88,effort:6}).toFile(path.join(target,`${id}.webp`));
    if(id !== 'table') await sharp(file).resize({width:1024,withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(path.join(target,'detail',`${id}.webp`));
  }
  console.log(`${inputs.length} base assets and 56 detail assets created.`);
})().catch(error => { console.error(error); process.exitCode=1; });
