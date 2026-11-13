// @ts-nocheck
// Renders the roguelike's evolved forms to PNG: npx tsx sim/_evo_rogue.ts <outdir>
declare const process: { argv: string[] };
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { PC, PAL_RGB } from '../src/gfx/pixel';
import { rogueEvoFrames, rogueSuperFrames, ROGUE_EVO_IDS } from '../src/rogue/gfx/artEvoRogue';
import { evoFrames } from '../src/gfx/artEvo';
import { rogueSpiritFrames } from '../src/rogue/gfx/artSpirits';

function png(p: PC, scale: number, file: string) {
  const W = p.w * scale, H = p.h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const c = p.get(Math.floor(x / scale), Math.floor(y / scale));
      const o = y * (W * 4 + 1) + 1 + x * 4;
      const [r, g, b] = c >= 0 ? PAL_RGB[c] : [40, 90, 140];
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const crcT: number[] = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function grid(rows: PC[][], gap = 4): PC {
  const W = Math.max(...rows.map((r) => r.reduce((a, p) => a + p.w + gap, 0)));
  const H = rows.reduce((a, r) => a + Math.max(...r.map((p) => p.h)) + gap, 0);
  const o = new PC(W, H);
  let y = 0;
  for (const r of rows) { let x = 0; for (const p of r) { o.blit(p, x, y); x += p.w + gap; } y += Math.max(...r.map((p) => p.h)) + gap; }
  return o;
}
const out = process.argv[2];
png(grid(ROGUE_EVO_IDS.map((id) => rogueEvoFrames(id))), 4, out + '/evo_rogue.png');
png(grid([ROGUE_EVO_IDS.slice(0, 3).map((id) => rogueSuperFrames(id)[0]), ROGUE_EVO_IDS.slice(3).map((id) => rogueSuperFrames(id)[0])]), 2, out + '/super_rogue.png');
png(grid([evoFrames('booheet'), evoFrames('ironbud')]), 4, out + '/evo_story.png');
