// Bake the existing ink filter into a transparent asset instead of applying SVG
// filters to HTML images at runtime (which varies between Safari versions).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = (await readFile(new URL('../public/project-heaven-logo.jpg', import.meta.url))).toString('base64');
const filter = (await readFile(new URL('../public/sigil-filter.svg', import.meta.url), 'utf8')).match(/<filter[\s\S]*?<\/filter>/)[0];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="295" height="935" viewBox="395 110 295 935"><defs>${filter}</defs><image width="1097" height="1280" xlink:href="data:image/jpeg;base64,${source}" filter="url(#ink)"/></svg>`;
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/project-heaven-sigil.png', import.meta.url)));
console.log('Rendered transparent Project Heaven sigil.');
