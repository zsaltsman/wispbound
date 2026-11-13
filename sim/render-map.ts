// @ts-nocheck -- node-only dev tool
// Renders a map to a PNG for layout review: `npx tsx sim/render-map.ts town out.png [scale]`
declare const process: { argv: string[] };
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { ALL_MAPS } from '../src/world/maps';
import { newState } from '../src/story/state';
import { T } from '../src/world/tiles';
import { tileset } from '../src/gfx/artTiles';
import { PC, PAL_RGB } from '../src/gfx/pixel';
import * as P from '../src/gfx/artProps';
import * as Pe from '../src/gfx/artPeople';
import { creatureFrames } from '../src/gfx/artCreatures';
import { buildW4Textures } from '../src/gfx/texturesW4';

// World 4 art: run the texture builder against a fake scene that just keeps the canvases
const W4ART: Record<string, PC> = {};
{
  const orig = PC.prototype.toCanvas;
  (PC.prototype as any).toCanvas = function () {
    return this;
  };
  const fake = {
    textures: { exists: () => false, remove: () => {}, addCanvas: (k: string, pc: PC) => ((W4ART[k] = pc), { add: () => {} }) },
    anims: { exists: () => true, create: () => {} },
  };
  buildW4Textures(fake as any);
  (PC.prototype as any).toCanvas = orig;
}

const id = process.argv[2] ?? 'town';
const out = process.argv[3] ?? 'map.png';
const scale = Number(process.argv[4] ?? 1);
const m = ALL_MAPS()[id];
const st = newState();
st.flags.office_scene = true;

const PROPS: Record<string, () => PC> = {
  b_house1: () => P.house(0),
  b_house2: () => P.house(1),
  b_house3: () => P.house(2),
  b_house4: () => P.house(3),
  b_office: P.office,
  b_psychic: P.psychic,
  b_mansion: P.mansion,
  b_store: P.store,
  b_fishshop: P.fishshop,
  b_farmhouse: P.farmhouse,
  b_barn: P.barn,
  b_tavern: P.tavern,
  p_clocktower: P.clocktower,
  p_well: P.well,
  p_lamp: () => P.lamp(true),
  p_tree: () => P.deadTree(3),
  p_swings: P.swings,
  p_slide: P.slide,
  p_cave: P.caveMouth,
  p_tape: P.tape,
  p_bell: () => P.bellPost(false),
  p_bellfish_bell: () => P.bellPost(true),
  p_boat: P.boat,
  p_stall: () => P.stall(4),
  p_uglyclock: P.uglyClock,
  p_door_cellar: () => P.lockedDoor('cellar'),
  p_door_closet: () => P.lockedDoor('closet'),
  p_door_master: () => P.lockedDoor('master'),
  p_shelf_gap: P.shelfGap,
  p_pedestal: () => P.pedestal(false),
  p_pedestal_key: () => P.pedestal(true),
  p_bait: P.baitBucket,
  p_wellkey: P.wellKey,
};

const Wpx = m.w * 16;
const Hpx = m.h * 16;
const buf = new Uint8Array(Wpx * Hpx * 3).fill(20);
const put = (pc: PC, ox: number, oy: number, sx = 0, sy = 0, sw = pc.w, sh = pc.h) => {
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const c = pc.get(sx + x, sy + y);
      if (c < 0) continue;
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= Wpx || Y >= Hpx) continue;
      const [r, g, b] = PAL_RGB[c];
      const i = (Y * Wpx + X) * 3;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
    }
};
const ts = tileset();
for (let j = 0; j < m.h; j++)
  for (let i = 0; i < m.w; i++) {
    const t = m.ground[j * m.w + i];
    if (t !== T.WATER) put(ts, i * 16, j * 16, (t % 16) * 16, Math.floor(t / 16) * 16, 16, 16);
    else for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0) buf[((j * 16 + y) * Wpx + i * 16 + x) * 3] = 60;
    const d = m.deco[j * m.w + i];
    if (d >= 0) put(ts, i * 16, j * 16, (d % 16) * 16, Math.floor(d / 16) * 16, 16, 16);
  }
for (const p of [...m.props].sort((a, b) => (a.sortY ?? a.y) - (b.sortY ?? b.y))) {
  if (p.show && !p.show(st)) continue;
  const f = PROPS[p.key] ?? (W4ART[p.key] ? () => W4ART[p.key] : undefined);
  if (!f) continue;
  put(f(), p.x * 16 + (P.PROP_META[p.key]?.ox ?? 0), p.y * 16);
}
const sheets: Record<string, PC> = {};
for (const n of m.npcs) {
  if (n.show && !n.show(st)) continue;
  let pc: PC | undefined;
  if (n.sprite.startsWith('cr_')) pc = creatureFrames(n.sprite.slice(3))[0];
  else if (Pe.LOOKS[n.sprite]) pc = Pe.personSheet(Pe.LOOKS[n.sprite])[0];
  else if (['chicken', 'pig', 'piglet', 'cat', 'cow'].includes(n.sprite)) pc = Pe.animalSheet(n.sprite as any)[0];
  if (pc) put(pc, n.x * 16 + 8 - pc.w / 2, n.y * 16 + 16 - pc.h);
  void sheets;
}
// warps marked with a white corner tick
for (const w of m.warps) {
  for (let k = 0; k < 4; k++) {
    const i = ((w.y * 16 + k) * Wpx + w.x * 16) * 3;
    buf[i] = buf[i + 1] = buf[i + 2] = 255;
  }
}

// downscale + PNG encode
const OW = Math.floor(Wpx * scale);
const OH = Math.floor(Hpx * scale);
const raw = Buffer.alloc((OW * 3 + 1) * OH);
for (let y = 0; y < OH; y++) {
  raw[y * (OW * 3 + 1)] = 0;
  for (let x = 0; x < OW; x++) {
    const si = (Math.floor(y / scale) * Wpx + Math.floor(x / scale)) * 3;
    const di = y * (OW * 3 + 1) + 1 + x * 3;
    raw[di] = buf[si];
    raw[di + 1] = buf[si + 1];
    raw[di + 2] = buf[si + 2];
  }
}
const crcT = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(OW, 0);
ihdr.writeUInt32BE(OH, 4);
ihdr[8] = 8;
ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`wrote ${out} (${OW}x${OH})`);
