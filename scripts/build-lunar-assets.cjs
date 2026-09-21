// Usage: SHARP_PATH=/path/to/sharp node scripts/build-lunar-assets.cjs [source directory]
// Only creates optimized game copies; source PNGs remain untouched.
const sharp = require(process.env.SHARP_PATH || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const source = process.argv[2] || path.join(process.env.USERPROFILE, 'Downloads');
const target = path.join(__dirname, '../assets/lunar');
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const suits = {
  spades: ['21_50_08 (1)', '21_50_08 (2)', '21_50_09 (3)', '21_50_09 (4)', '21_50_09 (5)', '21_50_09 (6)', '21_50_09 (7)', '21_50_10 (8)', '21_50_10 (9)', '21_50_10 (10)', '21_50_37 (1)', '21_50_38 (2)', '21_50_38 (3)'],
  hearts: ['21_50_38 (4)', '21_50_38 (5)', '21_50_39 (6)', '21_50_39 (7)', '21_50_39 (8)', '21_50_39 (9)', '21_50_40 (10)', '21_50_44 (1)', '21_50_45 (2)', '21_50_45 (3)', '21_50_45 (4)', '21_50_45 (5)', '21_50_46 (6)'],
  clubs: ['21_50_46 (7)', '21_50_46 (8)', '21_50_47 (9)', '21_50_47 (10)', '21_52_23 (1)', '21_52_24 (2)', '21_52_24 (3)', '21_52_24 (4)', '21_52_25 (5)', '21_52_25 (6)', '21_52_25 (7)', '21_52_25 (8)', '21_52_26 (9)'],
  diamonds: ['22_04_53 (1)', '22_04_46 (1)', '22_04_46 (2)', '22_04_46 (3)', '22_04_46 (4)', '22_04_46 (5)', '22_04_46 (6)', '22_04_46 (7)', '22_04_46 (8)', '22_04_46 (9)', '22_04_46 (10)', '22_04_53 (2)', '22_04_53 (3)'],
};
const entries = Object.entries(suits).flatMap(([suit, names]) => names.map((name, i) => [`${suit}-${ranks[i]}`, name]));
entries.push(['joker-red', '22_04_53 (4)'], ['joker-blue', '22_04_54 (5)'], ['back-blue', '22_04_54 (6)'], ['back-red', '22_04_54 (7)'], ['table', '22_07_17']);
(async () => {
  // Validate the entire input set before generating anything.
  const inputs = entries.map(([id, name]) => ({ id, file: path.join(source, `ChatGPT Image 20 de set. de 2026, ${name}.png`) }));
  await Promise.all(inputs.map(({ file }) => fs.access(file)));
  await fs.mkdir(target, { recursive: true });
  for (const { id, file } of inputs) {
    await sharp(file).resize({ width: id === 'table' ? 1672 : 384, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(path.join(target, `${id}.webp`));
  }
  const bytes = (await Promise.all(inputs.map(({ id }) => fs.stat(path.join(target, `${id}.webp`))))).reduce((sum, s) => sum + s.size, 0);
  console.log(`${inputs.length} assets; ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
})().catch(error => { console.error(error); process.exitCode = 1; });
