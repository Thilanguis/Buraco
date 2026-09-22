// Optimized copies only; supplied originals remain untouched.
// Usage: set SHARP_PATH to the installed sharp package, then run with Node.
const sharp = require(process.env.SHARP_PATH || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const source = process.argv[2] || path.join(process.env.USERPROFILE, 'Downloads');
const detail = process.argv.includes('--detail');
const target = path.join(__dirname, '../assets/wwe', detail ? 'detail' : '');
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// Day/time in rank order, matching the printed indices on each supplied card.
const suits = {
  hearts: ['22/08_18_16 (2)', '22/08_18_15 (1)', '21/06_29_21', '21/06_44_53', '21/06_47_14', '21/06_47_57', '21/06_48_52', '21/06_51_43', '21/06_57_25', '21/06_59_31', '21/07_00_46', '21/07_01_29', '21/07_10_47'],
  clubs: ['22/07_58_53 (1)', '22/07_58_53 (2)', '22/07_58_53 (3)', '22/08_02_20 (1)', '21/03_35_28 (8)', '22/08_02_20 (2)', '22/08_02_21 (3)', '21/03_53_30', '21/04_02_47 (1)', '21/04_02_47 (2)', '21/04_02_47 (3)', '21/04_02_47 (4)', '21/04_02_48 (5)'],
  spades: ['22/05_08_33', '22/05_08_25', '22/05_08_13', '22/05_12_13', '22/05_24_35 (1)', '22/05_24_36 (2)', '22/05_24_36 (3)', '22/07_51_39 (1)', '22/07_51_39 (2)', '22/07_51_39 (3)', '22/07_55_00 (1)', '22/07_55_00 (2)', '22/07_55_00 (3)'],
  diamonds: ['21/07_12_10', '21/07_24_54', '21/07_28_56', '21/07_33_31', '21/07_42_13', '21/07_52_21 (2)', '21/07_52_21 (1)', '22/08_59_30', '21/07_57_25', '22/08_49_50', '22/08_56_00', '22/08_54_24', '22/08_57_42'],
};
const entries = Object.entries(suits).flatMap(([suit, names]) => names.map((name, i) => [`${suit}-${ranks[i]}`, name]));
entries.push(['joker-red', '22/08_30_57'], ['joker-blue', '8c2c26e9-ac09-4032-be88-512fb1e7687a.png'], ['back-red', '22/08_37_59'], ['back-blue', '22/08_39_24'], ['table', '22/08_41_30']);
(async () => {
  const inputs = entries.map(([id, name]) => {
    const [day, time] = name.split('/');
    return { id, file: path.join(source, time ? `ChatGPT Image ${day} de set. de 2026, ${time}.png` : name) };
  });
  await Promise.all(inputs.map(({ file }) => fs.access(file)));
  await fs.mkdir(target, { recursive: true });
  for (const { id, file } of inputs) {
    await sharp(file).resize({ width: detail ? 1024 : id === 'table' ? 1672 : 384, withoutEnlargement: true }).webp({ quality: detail ? 90 : 88, effort: 6 }).toFile(path.join(target, `${id}.webp`));
  }
  const bytes = (await Promise.all(inputs.map(({ id }) => fs.stat(path.join(target, `${id}.webp`))))).reduce((sum, s) => sum + s.size, 0);
  console.log(`${inputs.length} assets; ${(bytes / 1024 / 1024).toFixed(2)} MiB`);
})().catch(error => { console.error(error); process.exitCode = 1; });
