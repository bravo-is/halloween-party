// Render the existing site's vector artwork as a compact, crawler-friendly JPEG.
// Run with: npm run social:generate
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const logo = (await readFile(new URL('../public/project-heaven-logo.jpg', import.meta.url))).toString('base64');
const lights = [[78,180,16],[148,335,38],[244,122,12],[305,266,19],[55,505,28],[212,533,11],[919,146,24],[1042,310,45],[1140,176,16],[1165,510,27],[944,478,14]];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="mist"><stop stop-color="#34363a"/><stop offset="1" stop-color="#0c0d0f"/></radialGradient>
    <radialGradient id="pearl" cx="35%" cy="28%" r="78%"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#fcf9f1"/><stop offset=".8" stop-color="#dcdbd7"/><stop offset="1" stop-color="#a6a8ad"/></radialGradient>
    <filter id="glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .96  0 0 0 0 .94  0 0 0 0 .90  -.333 -.333 -.334 0 1"/><feComponentTransfer><feFuncA type="linear" slope="3" intercept="-.4"/></feComponentTransfer></filter>
    <clipPath id="sigil"><rect x="550" y="40" width="100" height="214"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="#0c0d0f"/>
  <ellipse cx="600" cy="290" rx="680" ry="400" fill="url(#mist)" opacity=".7"/>
  ${lights.map(([x,y,r],i)=>`<g opacity="${i%3===0?'.65':'1'}"><path d="M${x} 0V${y-r}" stroke="#d4d1cc" stroke-opacity=".16"/><circle cx="${x}" cy="${y}" r="${r*1.2}" fill="#f4f0e9" opacity=".28" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#pearl)"/></g>`).join('')}
  <g clip-path="url(#sigil)"><image x="466" y="11" width="270" height="315" xlink:href="data:image/jpeg;base64,${logo}" filter="url(#ink)"/></g>
  <g text-anchor="middle" fill="#f3f0e9">
    <text x="604" y="300" font-family="Arial, sans-serif" font-size="18" letter-spacing="10">PROJECT</text>
    <text x="600" y="414" font-family="Times New Roman, Georgia, serif" font-size="130" letter-spacing="-3">HEAVEN</text>
    <text x="600" y="473" font-family="Georgia, serif" font-size="28" font-style="italic">Look divine. Be damned.</text>
    <text x="603" y="558" font-family="Arial, sans-serif" font-size="14" letter-spacing="4" fill="#c1bdb7">HALLOWEEN · OCTOBER 31</text>
  </g>
</svg>`;
const output = new URL('../public/project-heaven-social.jpg', import.meta.url);
await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(fileURLToPath(output));
console.log('Generated public/project-heaven-social.jpg (1200 × 630).');
