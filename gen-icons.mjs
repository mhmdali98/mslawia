import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';

const sizes = [
  { file: 'public/icon-192.png', size: 192 },
  { file: 'public/icon-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
];

for (const { file, size } of sizes) {
  const r = Math.round(size * 0.21);
  const fs2 = Math.round(size * 0.57);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#10b981"/>
  <text x="50%" y="62%" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif" font-weight="700" font-size="${fs2}" fill="#fff">م</text>
</svg>`;
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  writeFileSync(file, png);
  console.log('Generated', file, `(${png.length} bytes)`);
}
