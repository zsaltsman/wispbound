// @ts-nocheck
// Renders art to PNG for a quick look: npx tsx sim/_art.ts <outdir>
declare const process: { argv: string[] };
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { PC, PAL_RGB } from '../src/gfx/pixel';
import * as F from '../src/gfx/artFinal';

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
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function row(ps: PC[], gap = 4): PC {
  const W = ps.reduce((a, p) => a + p.w + gap, 0), H = Math.max(...ps.map((p) => p.h));
  const o = new PC(W, H);
  let x = 0;
  for (const p of ps) { o.blit(p, x, H - p.h); x += p.w + gap; }
  return o;
}
const out = process.argv[2];
const r = (n: number) => [...Array(n).keys()];
const which = process.argv[3] ?? 'all';
if (which === 'all' || which === 'gr1') png(row(r(7).map((f) => F.reaperFull(2.3, f))), 1, out + '/gr1.png');
if (which === 'all' || which === 'gr2') png(row([...r(7).map((f) => F.buffReaper(1.3, f)), ...[0.12, 0.38, 0.68].map((m) => F.buffReaper(1.3, 0, m))]), 1, out + '/gr2.png');
if (which === 'all' || which === 'gr3') png(row(r(8).map((f) => F.trueReaper(1.2, f))), 1, out + '/gr3.png');
if (which === 'all' || which === 'wings') png(row([...r(4).map((a) => F.wings(1, a)), F.crownAlone(1.2), F.scytheAlone(1.2)]), 1, out + '/wings.png');
if (which === 'all' || which === 'sc1') png(row(['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'].map((id) => row(F.scFrames(id).filter((_, i) => i === 0 || i === 4)))), 1, out + '/sc1.png');
if (which === 'all' || which === 'sc2') png(row(['glowbell', 'hammerfin', 'bubblotl', 'glidray', 'scorvlet', 'widowling', 'ironbud'].map((id) => row(F.scFrames(id).filter((_, i) => i === 0 || i === 4)))), 1, out + '/sc2.png');
if (which === 'all' || which === 'gd') png(row([...F.guardianFrames('wispmane'), ...F.guardianFrames('viperwind'), F.flamoraDim(1)]), 2, out + '/gd.png');
if (which === 'all' || which === 'bg') png(row([F.hallBack(), F.domainBack()]), 1, out + '/bg.png');
if (which === 'all' || which === 'floor') png(F.domainFloor(), 1, out + '/floor.png');
if (which === 'all' || which === 'cat') png(row([F.catShadow(), ...r(4).map((f) => F.catEyes(f))]), 1, out + '/cat.png');
if (which === 'all' || which === 'ow') png(row([...r(7).map((f) => F.buffReaper(0.3, f)), ...r(8).map((f) => F.trueReaperOw(0.28, f))]), 3, out + '/ow.png');
console.log('ok');
