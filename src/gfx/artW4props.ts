import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';
import { building } from './artProps';

// World 4 set pieces: the monuments and carvings, the abandoned village, the
// Woodlands Tower, the giant tree, the crashed airship, the castle, the forest,
// every puzzle piece in the two dungeons, and the sky cinematics at the end.

type R = () => number;

// ------------------------------------------------------------------ shared bits

/** Rough stone: a base colour with cracks, chips and a lit upper-left edge. */
function stone(p: PC, x: number, y: number, w: number, h: number, r: R, base = MID) {
  p.rect(x, y, w, h, base);
  p.rect(x, y, w, 2, base === MID ? LIGHT : MID);
  p.rect(x, y, 2, h, base === MID ? LIGHT : MID);
  p.rect(x + w - 2, y, 2, h, DARK);
  p.rect(x, y + h - 2, w, 2, DARK);
  for (let i = 0; i < (w * h) / 40; i++) p.px(x + 2 + Math.floor(r() * (w - 4)), y + 2 + Math.floor(r() * (h - 4)), r() < 0.5 ? DARK : base === MID ? LIGHT : MID);
  for (let i = 0; i < Math.max(1, w / 16); i++) {
    let cx = x + 3 + Math.floor(r() * (w - 6));
    let cy = y + 3 + Math.floor(r() * (h / 2));
    for (let k = 0; k < 6 + r() * 8; k++) {
      p.px(cx, cy, DARK);
      cx += r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1;
      cy += 1;
      if (cy >= y + h - 2) break;
    }
  }
}

/** Creeping vines and leaves over whatever is drawn in a rectangle. */
function vines(p: PC, x: number, y: number, w: number, h: number, r: R, n: number, leafC = MID) {
  for (let i = 0; i < n; i++) {
    let vx = x + r() * w;
    let vy = y + r() * h * 0.3;
    const len = h * (0.4 + r() * 0.6);
    for (let k = 0; k < len; k++) {
      vx += Math.sin((vy + i * 13) * 0.25) * 0.6;
      vy += 1;
      if (vy >= y + h) break;
      p.px(Math.round(vx), Math.round(vy), DARK);
      if (k % 4 === 0) {
        const s = r() < 0.5 ? -1 : 1;
        p.px(Math.round(vx) + s, Math.round(vy), leafC);
        p.px(Math.round(vx) + s * 2, Math.round(vy) - 1, leafC);
        p.px(Math.round(vx) + s, Math.round(vy) - 1, LIGHT);
      }
    }
  }
}

/** The paw: a pad and four toes (the island's old sign). */
export function pawMark(p: PC, cx: number, cy: number, s: number, c: number) {
  p.ellipse(cx, cy + s * 0.5, s * 1.1, s * 0.85, c);
  for (const [dx, dy] of [
    [-1.3, -0.7],
    [-0.45, -1.35],
    [0.45, -1.35],
    [1.3, -0.7],
  ])
    p.ellipse(Math.round(cx + dx * s), Math.round(cy + dy * s), Math.max(1, Math.round(s * 0.42)), Math.max(1, Math.round(s * 0.5)), c);
}

/** Lines of carved writing (too small to read: the dialogue reads it for you). */
function writing(p: PC, x: number, y: number, w: number, rows: number, r: R, c = DARK) {
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < w; ) {
      const l = 1 + Math.floor(r() * 3);
      if (i + l > w) break;
      p.rect(x + i, y + j * 3, l, 1, c);
      i += l + 1;
    }
}

// ------------------------------------------------------------------ the monuments

/** The enormous stone monument at the summit: a weathered slab, a paw at its head. */
export function monument(): PC {
  const p = new PC(56, 88);
  const r = artRng(401);
  // the plinth
  stone(p, 2, 70, 52, 16, r, MID);
  stone(p, 6, 64, 44, 8, r, MID);
  // the slab, slightly tapered
  p.poly([[10, 64], [12, 8], [28, 2], [44, 8], [46, 64]], MID);
  p.poly([[12, 62], [14, 10], [28, 4], [28, 62]], LIGHT);
  p.dither(12, 6, 16, 56, MID, 0.5);
  p.poly([[40, 10], [44, 8], [46, 64], [40, 64]], DARK);
  // the paw, carved deep
  pawMark(p, 28, 18, 5, DARK);
  pawMark(p, 27, 17, 5, BLACK);
  writing(p, 16, 30, 24, 10, r, DARK);
  // moss at the foot, and cracks
  for (let i = 0; i < 40; i++) p.px(6 + Math.floor(r() * 44), 60 + Math.floor(r() * 10), r() < 0.6 ? DARK : MID);
  p.line(36, 14, 33, 30, DARK);
  p.line(33, 30, 35, 38, DARK);
  p.outline(BLACK);
  return p;
}

/** The village's monument in the square: smaller, the same paw. */
export function villageMonument(): PC {
  const p = new PC(32, 48);
  const r = artRng(402);
  stone(p, 2, 38, 28, 10, r);
  p.poly([[6, 38], [7, 6], [16, 1], [25, 6], [26, 38]], MID);
  p.poly([[7, 37], [8, 7], [16, 2], [16, 37]], LIGHT);
  p.dither(8, 4, 8, 32, MID, 0.5);
  pawMark(p, 16, 14, 3, BLACK);
  writing(p, 10, 22, 12, 4, r);
  p.outline(BLACK);
  return p;
}

/** The two guardian carvings: 0 a lion among trees, 1 a serpent in the wind. */
export function stele(kind: 0 | 1): PC {
  const p = new PC(32, 44);
  const r = artRng(410 + kind);
  stone(p, 1, 2, 30, 34, r, MID);
  stone(p, 0, 34, 32, 10, r, MID);
  p.rect(4, 5, 24, 26, DARK);
  if (kind === 0) {
    // trees behind
    for (const tx of [7, 25]) {
      p.rect(tx, 18, 1, 12, MID);
      p.ellipse(tx, 15, 3, 5, MID);
    }
    // the lion's head, mane in rays
    for (let a = 0; a < 12; a++) {
      const an = (a / 12) * Math.PI * 2;
      p.line(16, 17, 16 + Math.cos(an) * 9, 17 + Math.sin(an) * 8, LIGHT);
    }
    p.ellipse(16, 17, 5, 5, MID);
    p.px(14, 16, BLACK);
    p.px(18, 16, BLACK);
    p.rect(15, 19, 3, 1, BLACK);
  } else {
    // wind curls
    for (const [cx, cy] of [
      [9, 9],
      [23, 26],
    ]) {
      p.ring(cx, cy, 3, 2, MID);
      p.line(cx + 3, cy, cx + 8, cy, MID);
    }
    // the serpent, an S through the panel
    const pts: Pt[] = [];
    for (let t = 0; t <= 1; t += 0.02) pts.push([8 + t * 16 + Math.sin(t * 9) * 5, 28 - t * 20]);
    pts.forEach(([x, y]) => p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, LIGHT));
    p.rect(23, 6, 4, 3, LIGHT);
    p.px(25, 7, BLACK);
  }
  writing(p, 5, 37, 22, 2, r, DARK);
  p.outline(BLACK);
  return p;
}

/** The first warning: a little hooded figure with a blade, scratched into a wall. */
export function reaperCarving(): PC {
  const p = new PC(32, 32);
  const r = artRng(420);
  stone(p, 0, 0, 32, 32, r, MID);
  p.rect(3, 3, 26, 26, DARK);
  // hood and cloak
  p.poly([[16, 7], [11, 13], [10, 26], [22, 26], [21, 13]], BLACK);
  p.ellipse(16, 12, 3, 3, BLACK);
  p.px(15, 12, MID);
  p.px(17, 12, MID);
  // the blade, much bigger than he is
  p.line(22, 9, 22, 27, LIGHT);
  p.poly([[22, 9], [8, 6], [4, 9], [12, 8]], LIGHT);
  writing(p, 6, 28, 20, 1, r, BLACK);
  p.outline(BLACK);
  return p;
}

/** The paw on the ground, drawn in faint light (glow = brighter). */
export function groundPaw(glow: boolean): PC {
  const p = new PC(40, 32);
  pawMark(p, 20, 18, 6, glow ? WHITE : LIGHT);
  if (glow) {
    pawMark(p, 20, 18, 4, LIGHT);
  }
  return p;
}

/** A sparkle in the shape of a paw (where the cat was). */
export function pawSparkle(f: number): PC {
  const p = new PC(16, 16);
  pawMark(p, 8, 9, 2, f ? LIGHT : WHITE);
  if (f) for (const [x, y] of [[2, 2], [13, 3], [3, 13], [14, 12]]) p.px(x, y, WHITE);
  return p;
}

// ------------------------------------------------------------------ the village

/** An abandoned house: boarded windows, the paint long gone. */
export function oldHouse(v: number): PC {
  const variants = [
    { roof: 'gable', siding: 'wood', windows: [{ x: 1, boarded: true }, { x: 4, broken: true }], crooked: 4 },
    { roof: 'gambrel', siding: 'plaster', windows: [{ x: 1, broken: true }, { x: 4, boarded: true }], crooked: -3 },
    { roof: 'gable', siding: 'stone', windows: [{ x: 1, boarded: true }, { x: 4, boarded: true }], crooked: 6 },
  ];
  const p = building({ w: 6, h: 6, roofRows: 3, doors: [2], seed: 430 + v, dark: true, ...(variants[v % 3] as any) });
  const r = artRng(440 + v);
  vines(p, 0, 40, 96, 56, r, 5, DARK);
  // missing roof tiles
  for (let i = 0; i < 6; i++) p.rect(8 + Math.floor(r() * 80), 6 + Math.floor(r() * 30), 3, 2, BLACK);
  return p;
}

/** The old storage building (a long low barn). */
export function storage(): PC {
  const p = building({ w: 7, h: 5, roofRows: 2, roof: 'gable', siding: 'wood', doors: [3], windows: [{ x: 1, boarded: true }, { x: 5, broken: true }], seed: 450, dark: true, crooked: 3 } as any);
  const r = artRng(451);
  vines(p, 0, 28, 112, 52, r, 6, DARK);
  return p;
}

/** A collapsed house: two walls and a fallen roof. */
export function collapsed(seed: number): PC {
  const p = new PC(96, 64);
  const r = artRng(seed);
  p.rect(2, 20, 14, 44, DARK);
  p.rect(78, 28, 16, 36, DARK);
  for (let y = 22; y < 64; y += 4) {
    p.rect(2, y, 14, 1, BLACK);
    p.rect(78, y, 16, 1, BLACK);
  }
  p.poly([[6, 64], [10, 30], [70, 40], [90, 64]], MID);
  for (let i = 0; i < 9; i++) p.line(10 + i * 7, 31 + i, 14 + i * 9, 64, DARK);
  p.poly([[10, 30], [12, 26], [72, 36], [70, 40]], LIGHT);
  // rubble
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.floor(r() * 86);
    p.rect(x, 56 + Math.floor(r() * 6), 3 + Math.floor(r() * 5), 2 + Math.floor(r() * 3), r() < 0.5 ? MID : DARK);
  }
  vines(p, 0, 20, 96, 44, r, 4, DARK);
  p.outline(BLACK);
  return p;
}

/** A dead, leafless tree (the island's trees are dying). */
export function deadTree4(seed: number): PC {
  const p = new PC(40, 56);
  const r = artRng(seed);
  p.rect(18, 26, 4, 30, DARK);
  p.rect(18, 26, 1, 30, MID);
  const branch = (x: number, y: number, a: number, l: number, d: number) => {
    const x1 = x + Math.cos(a) * l;
    const y1 = y + Math.sin(a) * l;
    p.line(x, y, x1, y1, DARK);
    if (d > 0) {
      branch(x1, y1, a - 0.5 - r() * 0.3, l * 0.7, d - 1);
      branch(x1, y1, a + 0.4 + r() * 0.3, l * 0.65, d - 1);
    }
  };
  branch(20, 28, -Math.PI / 2, 12, 3);
  p.outline(BLACK);
  return p;
}

/** A tree of the Ancient Forest: unusually alive, the canopy thick and bright. */
export function liveTree(seed: number): PC {
  const p = new PC(48, 64);
  const r = artRng(seed);
  p.rect(21, 34, 6, 30, DARK);
  p.rect(21, 34, 2, 30, MID);
  p.poly([[18, 64], [21, 56], [27, 56], [30, 64]], DARK);
  for (let i = 0; i < 9; i++) {
    const cx = 8 + r() * 32;
    const cy = 8 + r() * 26;
    p.ellipse(Math.round(cx), Math.round(cy), 8 + Math.floor(r() * 5), 7 + Math.floor(r() * 4), MID);
  }
  p.shade((x, y) => (p.get(x, y) === MID ? 0.9 - x / 90 - y / 70 + (((x * 7 + y * 3) % 5) - 2) * 0.04 : null), [DARK, MID, LIGHT]);
  for (let i = 0; i < 26; i++) {
    const x = 4 + Math.floor(r() * 40);
    const y = 4 + Math.floor(r() * 34);
    if (p.get(x, y) >= 0) p.px(x, y, r() < 0.3 ? WHITE : LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** A small flowering bush. */
export function bush4(seed: number): PC {
  const p = new PC(24, 18);
  const r = artRng(seed);
  p.ellipse(12, 11, 11, 7, MID);
  p.ellipse(8, 9, 6, 5, LIGHT);
  for (let i = 0; i < 6; i++) p.px(3 + Math.floor(r() * 18), 5 + Math.floor(r() * 9), WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the Woodlands Tower

/** The tower in the forest: stone, swallowed by vines and roots, a lion on top. gems: 0-2 lit sockets. */
export function tower(gems: number, open: boolean): PC {
  const W = 80;
  const H = 208;
  const p = new PC(W, H);
  const r = artRng(460);
  // the lion statue on the crown
  p.ellipse(40, 22, 14, 10, MID); // mane
  p.ellipse(40, 22, 9, 8, LIGHT);
  p.rect(30, 26, 22, 10, MID); // body
  p.poly([[28, 36], [30, 26], [36, 36]], MID);
  p.rect(48, 28, 8, 8, MID);
  p.px(37, 21, BLACK);
  p.px(43, 21, BLACK);
  p.rect(39, 25, 3, 1, BLACK);
  // battlements
  for (let x = 6; x < 74; x += 10) p.rect(x, 36, 7, 6, MID);
  p.rect(4, 42, 72, 4, LIGHT);
  // the shaft, slightly wider at the base
  p.poly([[8, 46], [72, 46], [76, H - 8], [4, H - 8]], MID);
  for (let y = 48; y < H - 8; y += 7)
    for (let x = ((y / 7) | 0) % 2 ? 6 : 12; x < 74; x += 12) {
      p.rect(x, y, 11, 6, (x + y) % 3 ? MID : LIGHT);
      p.rect(x + 11, y, 1, 7, DARK);
      p.rect(x, y + 6, 12, 1, DARK);
    }
  p.rect(4, H - 8, 72, 8, DARK);
  // shade the right side
  p.dither(56, 46, 22, H - 54, DARK, 0.45, true);
  // windows
  for (const y of [70, 110, 150]) {
    p.rect(36, y, 8, 12, BLACK);
    p.ellipse(40, y, 4, 3, BLACK);
  }
  // the door, with two sockets above it
  const dy = H - 44;
  if (open) {
    p.rect(30, dy, 20, 36, BLACK);
    p.ellipse(40, dy, 10, 6, BLACK);
    for (let i = 0; i < 4; i++) p.rect(32, dy + 20 + i * 4, 16, 1, DARK); // stairs going down
  } else {
    p.rect(30, dy, 20, 36, DARK);
    p.ellipse(40, dy, 10, 6, DARK);
    p.rect(39, dy - 4, 2, 40, BLACK);
    for (let y = dy + 4; y < dy + 36; y += 6) p.rect(31, y, 18, 1, BLACK);
  }
  for (let i = 0; i < 2; i++) {
    const sx = 33 + i * 14;
    const sy = dy - 12;
    p.ellipse(sx, sy, 4, 4, BLACK);
    if (gems > i) {
      p.ellipse(sx, sy, 3, 3, WHITE);
      p.px(sx - 1, sy - 1, LIGHT);
    } else p.ellipse(sx, sy, 2, 2, DARK);
  }
  // vines and roots everywhere (pulled back once the door has opened)
  vines(p, 4, 40, 72, H - 48, r, open ? 7 : 16, MID);
  const roots = open ? 3 : 7;
  for (let i = 0; i < roots; i++) {
    const x0 = 6 + r() * 68;
    let x = x0;
    for (let y = H - 30 - r() * 40; y < H; y++) {
      x += Math.sin(y * 0.2 + i) * 0.7;
      p.rect(Math.round(x), Math.round(y), 3, 1, DARK);
      p.px(Math.round(x), Math.round(y), MID);
    }
  }
  if (!open)
    for (let i = 0; i < 6; i++) {
      const y = dy + 4 + i * 6;
      p.line(28, y, 52, y + (i % 2 ? 4 : -3), DARK); // vines across the door
      p.line(28, y - 1, 52, y + (i % 2 ? 3 : -4), MID);
    }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the giant tree

/** The island's giant tree: a trunk wider than a house, a canopy over the whole north. */
export function giantTree(): PC {
  const W = 320;
  const H = 400;
  const p = new PC(W, H);
  const r = artRng(470);
  // canopy: clumps of leaves, back ones darker, each lit from the upper left
  const clumps: [number, number, number][] = [];
  for (let i = 0; i < 54; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    clumps.push([160 + Math.cos(a) * d * 128, 112 + Math.sin(a) * d * 78, 20 + r() * 16]);
  }
  clumps.sort((u, v) => u[1] - v[1]);
  clumps.forEach(([cx, cy, s], i) => {
    const back = i < clumps.length * 0.35;
    p.sphere(Math.round(cx), Math.round(cy), Math.round(s), Math.round(s * 0.8), back ? [BLACK, DARK, MID] : [DARK, MID, LIGHT]);
  });
  for (let i = 0; i < 700; i++) {
    const x = 10 + Math.floor(r() * 300);
    const y = 20 + Math.floor(r() * 190);
    const c = p.get(x, y);
    if (c >= 1) p.px(x, y, c === LIGHT && r() < 0.3 ? WHITE : c - 1);
  }
  // the trunk, flaring into roots, bark in long twisting ridges
  p.poly([[124, 176], [196, 176], [212, 330], [250, 392], [70, 392], [108, 330]], DARK);
  for (let i = 0; i < 9; i++) {
    let x = 126 + i * 8;
    for (let y = 176; y < 392; y++) {
      x += Math.sin(y * 0.05 + i * 1.7) * 0.5 + (x - 160) * 0.004;
      if (p.get(Math.round(x), y) < 0) continue;
      p.px(Math.round(x), y, BLACK);
      if (i < 4 && p.get(Math.round(x) + 1, y) >= 0) p.px(Math.round(x) + 1, y, MID);
    }
  }
  p.dither(110, 176, 22, 216, MID, 0.35, true);
  p.dither(186, 176, 30, 216, BLACK, 0.4, true);
  // branches into the canopy
  for (const [x0, x1] of [[140, 96], [180, 228], [160, 150]] as const) p.thick(x0, 190, x1, 150, DARK, 6);
  // great roots spreading over the ground
  for (const [x0, dir] of [
    [80, -1],
    [100, -1],
    [220, 1],
    [240, 1],
  ] as const) {
    p.poly([[x0, 360], [x0 + 24 * -dir, 360], [x0 + 60 * dir, 398], [x0 + 30 * dir, 398]], DARK);
    p.line(x0, 362, x0 + 40 * dir, 396, MID);
  }
  // the opening in the roots (sealed: you cannot get in from the ground)
  p.ellipse(160, 362, 18, 22, BLACK);
  p.rect(142, 362, 36, 28, BLACK);
  for (let i = 0; i < 7; i++) p.line(144 + i * 5, 344, 146 + i * 5, 390, i % 2 ? DARK : MID);
  // the high opening Viperwind uses, up in the trunk
  p.ellipse(176, 214, 12, 9, BLACK);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the airship

/** The crashed airship on the rocks. fixed: patched up, balloon refilled. */
export function wreck(fixed: boolean): PC {
  const W = 240;
  const H = 136;
  const p = new PC(W, H);
  const r = artRng(480);
  // the envelope (balloon): torn and slumped, or full
  if (fixed) {
    p.ellipse(124, 34, 92, 30, MID);
    p.ellipse(110, 26, 70, 18, LIGHT);
    for (let i = -3; i <= 3; i++) p.line(124 + i * 24, 6, 124 + i * 28, 62, DARK);
  } else {
    p.poly([[40, 60], [70, 24], [150, 14], [210, 30], [226, 70], [180, 58], [120, 66], [80, 54]], MID);
    for (let i = 0; i < 8; i++) p.line(60 + i * 20, 22 + (i % 3) * 3, 70 + i * 19, 62, DARK);
    for (let i = 0; i < 9; i++) p.rect(60 + Math.floor(r() * 150), 24 + Math.floor(r() * 30), 6, 4, BLACK); // holes
    p.dither(40, 14, 190, 56, DARK, 0.25, true);
  }
  // rigging
  for (let i = 0; i < 6; i++) p.line(70 + i * 22, fixed ? 58 : 56, 64 + i * 24, 86, DARK);
  // the hull, tilted on the rocks
  const tilt = fixed ? 0 : 8;
  p.poly([[20, 84 + tilt], [222, 84 - tilt], [204, 118 - tilt], [44, 122 + tilt]], DARK);
  p.poly([[20, 84 + tilt], [222, 84 - tilt], [220, 90 - tilt], [22, 90 + tilt]], LIGHT);
  for (let i = 0; i < 8; i++) {
    const x = 34 + i * 22;
    const y = 96 + tilt - (i * tilt * 2) / 8;
    p.rect(x, y, 10, 6, BLACK);
    if (!fixed && i % 3 === 1) p.rect(x - 2, y - 2, 14, 10, BLACK);
    else p.rect(x + 1, y + 1, 8, 4, DARK);
  }
  // the damaged side opening (the way in)
  if (!fixed) {
    p.poly([[96, 100], [116, 96], [120, 118], [100, 120]], BLACK);
    for (let i = 0; i < 5; i++) p.line(96 + i * 5, 99, 92 + i * 6, 122, MID);
  }
  // planks of the deck rail, the crow's nest mast and its exterior ladder
  for (let x = 24; x < 218; x += 8) p.rect(x, 78 + tilt - ((x - 24) * tilt * 2) / 194, 1, 6, MID);
  p.rect(186, 30, 4, 54, DARK);
  p.rect(176, 26, 24, 8, MID);
  p.rect(176, 26, 24, 2, LIGHT);
  for (let y = 36; y < 84; y += 4) p.rect(191, y, 5, 1, LIGHT);
  p.rect(191, 36, 1, 48, MID);
  p.rect(195, 36, 1, 48, MID);
  // propellers
  p.rect(6, 92, 14, 3, MID);
  p.ellipse(8, 93, 2, 10, fixed ? LIGHT : DARK);
  // the rocks it's lying on
  if (!fixed)
    for (let i = 0; i < 10; i++) {
      const x = 10 + Math.floor(r() * 220);
      p.ellipse(x, 124 + Math.floor(r() * 8), 10 + Math.floor(r() * 12), 6 + Math.floor(r() * 4), r() < 0.5 ? MID : DARK);
    }
  p.outline(BLACK);
  return p;
}

/** The rope ladder down the side of the wreck, from the crow's nest to the ground. */
export function ropeLadder(): PC {
  const W = 16;
  const H = 110;
  const p = new PC(W, H);
  // two ropes, sagging a touch, and wooden rungs
  for (let y = 0; y < H; y++) {
    const sag = Math.round(Math.sin((y / H) * Math.PI) * 1.5);
    p.rect(3 + sag, y, 2, 1, LIGHT);
    p.rect(11 + sag, y, 2, 1, LIGHT);
  }
  for (let y = 4; y < H - 2; y += 7) {
    const sag = Math.round(Math.sin((y / H) * Math.PI) * 1.5);
    p.rect(4 + sag, y, 8, 2, WHITE);
    p.rect(4 + sag, y + 2, 8, 1, MID);
  }
  // a knot where it is tied off at the bottom
  p.rect(2, H - 3, 4, 3, MID);
  p.rect(10, H - 3, 4, 3, MID);
  p.outline(BLACK);
  return p;
}

/** A little painted board on a stake: an arrow up, and CROW'S NEST. */
export function nestSign(): PC {
  const p = new PC(18, 22);
  p.rect(8, 10, 2, 12, DARK);
  p.rect(1, 1, 16, 10, MID);
  p.rect(1, 1, 16, 2, LIGHT);
  // an arrow pointing up the ladder
  p.poly([[9, 2], [13, 6], [5, 6]], WHITE);
  p.rect(8, 6, 2, 4, WHITE);
  p.outline(BLACK);
  return p;
}

/** The engine panel on the hull: dials, a slot for a key. Ready = its lamp burns white. */
export function hullPanel(ready: boolean): PC {
  const p = new PC(30, 22);
  p.rect(1, 1, 28, 20, DARK);
  p.rect(1, 1, 28, 2, MID);
  p.rect(3, 4, 24, 15, MID);
  // two dials
  for (const cx of [9, 20]) {
    p.circle(cx, 10, 4, BLACK);
    p.circle(cx, 10, 3, LIGHT);
    p.line(cx, 10, cx + (ready ? 2 : -2), 8, BLACK);
  }
  // the key slot and the lamp
  p.rect(13, 15, 4, 2, BLACK);
  p.circle(15, 5, 2, ready ? WHITE : BLACK);
  if (ready) for (const [x, y] of [[11, 3], [19, 3], [15, 1]] as Pt[]) p.px(x, y, WHITE);
  p.outline(BLACK);
  return p;
}

/** The airship in flight, side on (frame: propeller blur). */
export function shipFly(f: number): PC {
  const p = new PC(128, 88);
  p.ellipse(64, 26, 54, 20, MID);
  p.ellipse(56, 20, 40, 12, LIGHT);
  for (let i = -2; i <= 2; i++) p.line(64 + i * 20, 8, 64 + i * 22, 44, DARK);
  for (let i = 0; i < 5; i++) p.line(34 + i * 15, 44, 36 + i * 14, 62, DARK);
  p.poly([[18, 60], [112, 60], [102, 78], [30, 80]], DARK);
  p.rect(18, 60, 94, 3, LIGHT);
  for (let i = 0; i < 5; i++) p.rect(32 + i * 16, 66, 8, 5, BLACK);
  p.rect(108, 64, 12, 3, MID);
  p.ellipse(120, 65, 2, f ? 4 : 9, LIGHT);
  p.outline(BLACK);
  return p;
}

/** The two halves of the airship, after one swing of the blade. */
export function shipHalf(side: 0 | 1): PC {
  const full = shipFly(0);
  const p = new PC(128, 88);
  for (let y = 0; y < 88; y++)
    for (let x = 0; x < 128; x++) {
      const cut = 62 + (y - 44) * 0.35;
      if ((side === 0 && x < cut) || (side === 1 && x >= cut)) {
        const c = full.get(x, y);
        if (c >= 0) p.px(x, y, c);
      }
    }
  return p;
}

// ------------------------------------------------------------------ the castle

export function castle(): PC {
  const W = 224;
  const H = 192;
  // headroom above the keep, so the tallest roof and its flag are not clipped
  const O = 24;
  const big = new PC(W, H + O);
  const p = {
    rect: (x: number, y: number, w: number, h: number, c: number) => big.rect(x, y + O, w, h, c),
    poly: (pts: Pt[], c: number) => big.poly(pts.map(([x, y]) => [x, y + O] as Pt), c),
    ellipse: (cx: number, cy: number, rx: number, ry: number, c: number) => big.ellipse(cx, cy + O, rx, ry, c),
    dither: (x: number, y: number, w: number, h: number, c: number, a: number, only?: boolean) => big.dither(x, y + O, w, h, c, a, only),
    outline: (c: number) => big.outline(c),
  };
  const r = artRng(490);
  const tower = (x: number, y: number, w: number) => {
    p.rect(x, y, w, H - y - 8, MID);
    for (let bx = x; bx < x + w; bx += 8) p.rect(bx, y - 6, 5, 6, MID);
    p.poly([[x - 2, y], [x + w / 2, y - 34], [x + w + 2, y]], DARK);
    p.rect(x + w / 2 - 2, y + 20, 4, 10, BLACK);
  };
  tower(6, 46, 40);
  tower(178, 46, 40);
  p.rect(44, 70, 136, H - 78, MID);
  for (let bx = 44; bx < 180; bx += 10) p.rect(bx, 62, 6, 8, MID);
  tower(92, 22, 40);
  // the keep's stones
  for (let y = 74; y < H - 8; y += 7)
    for (let x = ((y / 7) | 0) % 2 ? 44 : 50; x < 180; x += 12) {
      p.rect(x + 11, y, 1, 7, DARK);
      p.rect(x, y + 6, 12, 1, DARK);
      if (r() < 0.15) p.rect(x + 1, y + 1, 10, 5, LIGHT);
    }
  p.dither(140, 60, 80, H - 68, DARK, 0.3, true);
  // windows, one with a warm light (someone lives here)
  for (const [x, y, lit] of [
    [64, 96, 0],
    [152, 96, 1],
    [108, 66, 0],
    [24, 90, 0],
    [196, 90, 1],
  ] as const) {
    p.rect(x, y, 8, 12, BLACK);
    p.ellipse(x + 4, y, 4, 3, BLACK);
    if (lit) p.rect(x + 2, y + 2, 4, 8, LIGHT);
  }
  // the gate
  p.rect(98, H - 56, 28, 48, BLACK);
  p.ellipse(112, H - 56, 14, 10, BLACK);
  for (let x = 100; x < 126; x += 5) p.rect(x, H - 64, 1, 52, DARK);
  p.rect(0, H - 8, W, 8, DARK);
  // flags
  for (const x of [26, 112, 198]) {
    p.rect(x, x === 112 ? -14 + 22 - 30 : 46 - 34 - 14, 1, 14, DARK);
  }
  p.outline(BLACK);
  return big;
}

// ------------------------------------------------------------------ puzzle pieces and furniture

/** A stone switch for the vine puzzle, marked with an arrow pointing `rot` (0-3). */
export function vineSwitch(rot: number): PC {
  const p = new PC(16, 20);
  p.rect(2, 6, 12, 14, MID);
  p.rect(2, 4, 12, 3, LIGHT);
  p.rect(12, 6, 2, 14, DARK);
  const c: Pt = [8, 12];
  const d = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ][rot];
  p.line(c[0] - d[0] * 3, c[1] - d[1] * 3, c[0] + d[0] * 3, c[1] + d[1] * 3, BLACK);
  p.px(c[0] + d[0] * 3 + d[1], c[1] + d[1] * 3 + d[0], BLACK);
  p.px(c[0] + d[0] * 3 - d[1], c[1] + d[1] * 3 - d[0], BLACK);
  p.outline(BLACK);
  return p;
}

/**
 * A vine section on the floor of the first floor: `open` sides (N E S W bits), lit when
 * the sap is flowing through it.
 */
export function vineTile(bits: number, lit: boolean): PC {
  const p = new PC(16, 16);
  const c = lit ? LIGHT : DARK;
  const hi = lit ? WHITE : MID;
  p.ellipse(8, 8, 3, 3, c);
  if (bits & 1) p.rect(6, 0, 4, 8, c);
  if (bits & 2) p.rect(8, 6, 8, 4, c);
  if (bits & 4) p.rect(6, 8, 4, 8, c);
  if (bits & 8) p.rect(0, 6, 8, 4, c);
  if (bits & 1) p.rect(7, 0, 1, 8, hi);
  if (bits & 4) p.rect(7, 8, 1, 8, hi);
  if (bits & 2) p.rect(8, 7, 8, 1, hi);
  if (bits & 8) p.rect(0, 7, 8, 1, hi);
  p.outline(BLACK);
  return p;
}

/** The great stump at the centre of the first floor (open: the stairs inside). */
export function bigStump(open: boolean): PC {
  // the open stump is taller: a stair of living roots climbs out of it toward the ceiling
  const O = open ? 40 : 0;
  const p = new PC(48, 40 + O);
  const r = artRng(500);
  p.ellipse(24, 30 + O, 23, 9, DARK);
  p.rect(4, 12 + O, 40, 18, DARK);
  for (let i = 0; i < 8; i++) p.rect(6 + i * 5, 12 + O, 1, 18, i % 2 ? BLACK : MID);
  p.ellipse(24, 12 + O, 20, 8, MID);
  if (open) {
    // split down the middle, sap-light inside
    p.ellipse(24, 12 + O, 14, 5, LIGHT);
    p.rect(23, 12 + O, 2, 18, BLACK);
    // two roots twist up out of the split, around each other, into the dark above
    for (let y = 0; y <= 12 + O; y++) {
      const t = y / (12 + O);
      const sw = Math.sin(y * 0.22) * (4 + 6 * t);
      p.rect(Math.round(22 + sw) - 2, y, 4, 1, DARK);
      p.rect(Math.round(22 - sw) - 1, y, 3, 1, MID);
    }
    // steps grown into the roots, rising left and right
    for (let k = 0; k < 6; k++) {
      const y = 6 + O - k * 9;
      const left = k % 2 === 0;
      p.rect(left ? 12 : 24, y, 12, 2, LIGHT);
      p.rect(left ? 12 : 24, y + 2, 12, 1, BLACK);
    }
    // light falls from the next floor, above
    p.dither(10, 0, 28, 10, LIGHT, 0.25, true);
  } else {
    for (let k = 3; k < 18; k += 4) p.ring(24, 12, k, Math.max(1, Math.round(k * 0.4)), LIGHT);
  }
  for (let i = 0; i < 5; i++) p.px(6 + Math.floor(r() * 36), 16 + O + Math.floor(r() * 12), MID);
  p.outline(BLACK);
  return p;
}

/** A socket in the wall where a vine plugs in (lit: the vine reached it). */
export function wallSocket(lit: boolean): PC {
  const p = new PC(16, 16);
  p.ellipse(8, 8, 6, 6, BLACK);
  p.ellipse(8, 8, 4, 4, lit ? WHITE : DARK);
  if (lit) p.ellipse(8, 8, 2, 2, LIGHT);
  return p;
}

/** A dead stump on the third floor, and the tree it grows into (stage 0 dead .. 2 full). */
export function waterTree(stage: number, need: number): PC {
  const p = new PC(48, 72);
  if (stage === 0) {
    p.ellipse(24, 66, 10, 4, DARK);
    p.rect(16, 54, 16, 12, DARK);
    p.ellipse(24, 54, 8, 3, MID);
    for (let k = 3; k < 8; k += 3) p.ring(24, 54, k, Math.max(1, k / 3), DARK);
    // notches carved in the bark: how much water it wants
    for (let i = 0; i < need; i++) p.rect(18 + i * 4, 59, 2, 4, LIGHT);
  } else {
    p.rect(20, 34, 8, 34, DARK);
    p.rect(20, 34, 2, 34, MID);
    p.ellipse(24, 66, 10, 4, DARK);
    const big = stage >= 2;
    p.ellipse(24, 22, big ? 22 : 14, big ? 20 : 13, MID);
    p.ellipse(18, 16, big ? 12 : 8, big ? 10 : 7, LIGHT);
    for (let i = 0; i < need; i++) p.rect(20 + i * 3, 58, 2, 3, LIGHT);
    // a branch reaching out over the gap (it becomes the bridge)
    if (big) p.thick(26, 40, 46, 36, DARK, 3);
  }
  p.outline(BLACK);
  return p;
}

/** The water mechanism: a stone basin with a wheel. */
export function waterWheel(): PC {
  const p = new PC(32, 36);
  p.ellipse(16, 28, 15, 7, MID);
  p.ellipse(16, 27, 11, 4, BLACK);
  p.ellipse(16, 27, 9, 3, LIGHT);
  p.ring(16, 12, 10, 10, DARK);
  p.ring(16, 12, 9, 9, MID);
  for (let a = 0; a < 6; a++) p.line(16, 12, 16 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, MID);
  p.ellipse(16, 12, 2, 2, LIGHT);
  p.rect(15, 22, 2, 6, DARK);
  p.outline(BLACK);
  return p;
}

/** A gemstone lying on the ground (to pick up). */
export function gem(): PC {
  const p = new PC(16, 16);
  p.poly([[8, 3], [13, 7], [8, 14], [3, 7]], LIGHT);
  p.poly([[8, 3], [8, 14], [3, 7]], WHITE);
  p.line(3, 7, 13, 7, MID);
  p.outline(BLACK);
  p.px(12, 2, WHITE);
  p.px(13, 1, LIGHT);
  return p;
}

/** One of the three sacred stones (a pushable gemstone block). */
export function sacredStone(k: number): PC {
  const p = new PC(16, 20);
  p.rect(1, 6, 14, 14, MID);
  p.rect(1, 4, 14, 3, LIGHT);
  p.rect(13, 6, 2, 14, DARK);
  if (k === 0) p.poly([[8, 8], [12, 13], [8, 18], [4, 13]], WHITE);
  if (k === 1) p.circle(8, 13, 4, WHITE);
  if (k === 2) p.poly([[8, 8], [13, 17], [3, 17]], WHITE);
  p.outline(BLACK);
  return p;
}

/** A plate marked for one of the stones. */
export function sacredPlate(k: number): PC {
  const p = new PC(16, 16);
  p.rect(1, 1, 14, 14, DARK);
  p.frame(1, 1, 14, 14, MID);
  if (k === 0) p.poly([[8, 3], [12, 8], [8, 13], [4, 8]], LIGHT);
  if (k === 1) p.ring(8, 8, 4, 4, LIGHT);
  if (k === 2) p.poly([[8, 3], [13, 12], [3, 12]], LIGHT);
  return p;
}

/** A hanging vine (to swing across the broken floor). */
export function hangVine(len: number): PC {
  const p = new PC(16, len);
  for (let y = 0; y < len; y++) {
    const x = 7 + Math.round(Math.sin(y * 0.15) * 1.5);
    p.rect(x, y, 2, 1, DARK);
    if (y % 6 === 0) {
      p.px(x - 1, y, MID);
      p.px(x - 2, y + 1, LIGHT);
      p.px(x + 2, y + 3, MID);
    }
  }
  p.ellipse(8, len - 3, 3, 3, MID);
  p.outline(BLACK);
  return p;
}

/** The fountain in the Forgotten Garden. */
export function fountain(): PC {
  const p = new PC(48, 48);
  p.ellipse(24, 38, 22, 8, MID);
  p.ellipse(24, 37, 18, 5, LIGHT);
  p.ellipse(24, 37, 16, 4, DARK);
  p.rect(21, 18, 6, 18, MID);
  p.ellipse(24, 18, 9, 3, MID);
  p.ellipse(24, 17, 7, 2, LIGHT);
  for (let i = 0; i < 6; i++) p.line(24, 8, 14 + i * 4, 18 + (i % 2), WHITE);
  p.ellipse(24, 8, 2, 2, WHITE);
  p.outline(BLACK);
  return p;
}

/** The old man's window: plants on the sill and the forest beyond. */
export function plantWindow(): PC {
  const p = new PC(48, 32);
  p.rect(0, 0, 48, 26, DARK);
  p.rect(3, 3, 42, 20, MID);
  p.rect(23, 3, 2, 20, DARK);
  for (let i = 0; i < 5; i++) p.ellipse(6 + i * 9, 12 + (i % 2) * 4, 5, 6, LIGHT);
  p.rect(0, 24, 48, 3, LIGHT);
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 12;
    p.rect(x, 18, 6, 6, DARK);
    p.ellipse(x + 3, 15, 4, 4, i % 2 ? MID : LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** A food bowl with a salad in it (Wispmane's). */
export function bowl(full: boolean): PC {
  const p = new PC(16, 12);
  p.ellipse(8, 7, 7, 3, MID);
  p.rect(2, 7, 13, 3, MID);
  p.rect(2, 9, 13, 1, DARK);
  if (full) for (let i = 0; i < 6; i++) p.ellipse(4 + i * 2, 5 - (i % 2), 2, 2, i % 2 ? LIGHT : WHITE);
  p.outline(BLACK);
  return p;
}

/** The captain's room: a broken steering wheel, an old chair, the island's map. */
export function brokenWheel(): PC {
  const p = new PC(24, 28);
  p.rect(10, 14, 4, 14, DARK);
  p.ring(12, 12, 9, 9, MID);
  for (let a = 0; a < 8; a++) if (a !== 2 && a !== 3) p.line(12, 12, 12 + Math.cos(a * 0.785) * 11, 12 + Math.sin(a * 0.785) * 11, MID);
  p.rect(14, 2, 8, 8, -1); // the snapped quarter
  p.outline(BLACK);
  return p;
}
export function captainChair(): PC {
  const p = new PC(16, 24);
  p.rect(2, 2, 12, 12, DARK);
  p.rect(3, 3, 10, 10, MID);
  p.rect(1, 13, 14, 4, DARK);
  p.rect(2, 17, 2, 7, DARK);
  p.rect(12, 17, 2, 7, DARK);
  p.line(4, 4, 11, 11, BLACK); // a rip in the seat
  p.outline(BLACK);
  return p;
}
export function islandMap(): PC {
  const p = new PC(32, 24);
  p.rect(0, 0, 32, 24, LIGHT);
  p.rect(0, 0, 32, 1, MID);
  p.ellipse(16, 12, 11, 8, MID);
  p.ellipse(11, 10, 4, 3, DARK); // the mountain
  p.ellipse(19, 6, 3, 3, DARK); // the tree
  pawMark(p, 21, 14, 1, BLACK);
  p.line(4, 20, 9, 17, DARK);
  p.outline(BLACK);
  return p;
}

/** Carlo's "car": a crate on wheels with a steering wheel stuck on top. */
export function toyCar(withWheel: boolean): PC {
  const p = new PC(32, 24);
  p.rect(2, 8, 28, 10, MID);
  p.rect(2, 8, 28, 2, LIGHT);
  for (let x = 4; x < 30; x += 6) p.rect(x, 10, 1, 8, DARK);
  p.circle(8, 19, 4, DARK);
  p.circle(24, 19, 4, DARK);
  p.circle(8, 19, 1, LIGHT);
  p.circle(24, 19, 1, LIGHT);
  if (withWheel) {
    p.rect(20, 2, 2, 7, DARK);
    p.ring(21, 3, 4, 3, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** The airship's startup panel (shown big in the minigame). */
export function enginePanel(): PC {
  const p = new PC(160, 96);
  p.rect(0, 0, 160, 96, DARK);
  p.frame(0, 0, 160, 96, MID);
  p.frame(2, 2, 156, 92, BLACK);
  for (let i = 0; i < 5; i++) {
    p.rect(10 + i * 30, 70, 20, 16, BLACK);
    p.frame(10 + i * 30, 70, 20, 16, MID);
  }
  // gauges
  for (let i = 0; i < 3; i++) {
    p.circle(30 + i * 50, 30, 14, BLACK);
    p.ring(30 + i * 50, 30, 14, 14, LIGHT);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.8 + (k / 6) * 1.4);
      p.px(30 + i * 50 + Math.round(Math.cos(a) * 11), 30 + Math.round(Math.sin(a) * 11), MID);
    }
  }
  return p;
}

/** A sound-reactive mushroom in the tree (lit when it sings). */
export function mushroom(k: number, lit: boolean): PC {
  const p = new PC(24, 28);
  const cap = [10, 9, 11, 8][k % 4];
  p.rect(10, 12, 4, 16, lit ? LIGHT : MID);
  p.ellipse(12, 12, cap, 7, lit ? WHITE : MID);
  p.ellipse(12, 14, cap - 1, 3, lit ? LIGHT : DARK);
  for (let i = 0; i < 3 + k; i++) p.circle(5 + ((i * 7) % 15), 8 + (i % 2) * 2, 1, lit ? LIGHT : DARK);
  p.outline(BLACK);
  return p;
}
/** The giant mushroom: a stub, or a broad platform you can stand on. */
export function bigMushroom(grown: boolean): PC {
  const p = new PC(64, 48);
  if (!grown) {
    p.rect(28, 34, 8, 14, MID);
    p.ellipse(32, 34, 12, 6, MID);
    p.ellipse(32, 35, 10, 3, DARK);
  } else {
    p.rect(26, 22, 12, 26, LIGHT);
    p.ellipse(32, 18, 31, 14, MID);
    p.ellipse(32, 14, 26, 8, LIGHT);
    for (let i = 0; i < 6; i++) p.circle(10 + i * 9, 14 + (i % 2) * 4, 2, WHITE);
  }
  p.outline(BLACK);
  return p;
}
/** A child's drawing on the treehouse wall: 0 the boy and the serpent, others scribbles. */
export function drawing(k: number): PC {
  const p = new PC(16, 16);
  p.rect(1, 1, 14, 13, WHITE);
  if (k === 0) {
    p.rect(4, 6, 2, 5, DARK);
    p.circle(5, 5, 1, DARK);
    for (let x = 7; x < 14; x++) p.px(x, 7 + Math.round(Math.sin(x) * 2), MID);
    p.px(13, 6, DARK);
  } else if (k === 1) {
    p.circle(8, 6, 3, MID);
    for (let a = 0; a < 6; a++) p.px(8 + Math.round(Math.cos(a) * 5), 6 + Math.round(Math.sin(a) * 5), MID);
    p.rect(2, 11, 12, 1, DARK);
  } else {
    p.poly([[3, 12], [8, 3], [13, 12]], MID);
    p.rect(7, 9, 2, 3, DARK);
  }
  p.outline(BLACK);
  return p;
}
export function telescope(): PC {
  const p = new PC(24, 28);
  p.line(12, 14, 4, 27, DARK);
  p.line(12, 14, 20, 27, DARK);
  p.line(12, 14, 12, 27, DARK);
  p.thick(4, 10, 20, 4, MID, 4);
  p.rect(18, 2, 4, 5, LIGHT);
  p.line(10, 6, 13, 10, BLACK); // the crack
  p.outline(BLACK);
  return p;
}
export function flute(): PC {
  const p = new PC(16, 8);
  p.rect(1, 3, 14, 2, LIGHT);
  for (let i = 0; i < 4; i++) p.px(5 + i * 2, 3, DARK);
  p.outline(BLACK);
  return p;
}
/** Lava glowing in the cracks of the cell wall. */
export function lavaCrack(seed: number): PC {
  const p = new PC(16, 16);
  const r = artRng(seed);
  let x = 4 + r() * 8;
  for (let y = 0; y < 16; y++) {
    x += r() < 0.5 ? -0.7 : 0.7;
    p.px(Math.round(x), y, LIGHT);
    p.px(Math.round(x) + 1, y, WHITE);
  }
  return p;
}

// ------------------------------------------------------------------ the sky and the cage

/** A night sky with stars (cinematics). */
export function nightSky(w: number, h: number, seed: number, dark = false): PC {
  const p = new PC(w, h);
  const r = artRng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, y > h * 0.75 && !dark ? DARK : BLACK);
  if (!dark) p.dither(0, Math.floor(h * 0.55), w, Math.floor(h * 0.2), DARK, 0.4);
  for (let i = 0; i < (w * h) / 220; i++) p.px(Math.floor(r() * w), Math.floor(r() * h * 0.8), r() < 0.2 ? WHITE : r() < 0.5 ? LIGHT : MID);
  return p;
}

/** Distant mountains (a silhouette for the edges of the sky). */
export function farHills(w: number, h: number, seed: number): PC {
  const p = new PC(w, h);
  const r = artRng(seed);
  let y = h * 0.5;
  for (let x = 0; x < w; x++) {
    y += (r() - 0.5) * 3 + Math.sin(x * 0.03) * 0.6;
    y = Math.max(h * 0.1, Math.min(h * 0.8, y));
    p.rect(x, Math.round(y), 1, h - Math.round(y), DARK);
    if (r() < 0.25) p.px(x, Math.round(y), MID);
  }
  return p;
}

/** The Forgotten Island, seen from the air (shrinking away below the airship). */
export function islandFar(): PC {
  const p = new PC(200, 90);
  const r = artRng(520);
  p.ellipse(100, 70, 96, 18, DARK);
  p.poly([[20, 70], [50, 30], [64, 44], [76, 24], [96, 62]], MID); // the mountain
  p.poly([[50, 30], [56, 36], [46, 38]], LIGHT);
  p.ellipse(140, 40, 30, 22, MID); // the giant tree
  p.rect(136, 50, 8, 18, DARK);
  for (let i = 0; i < 20; i++) p.ellipse(112 + Math.floor(r() * 70), 60 + Math.floor(r() * 8), 4, 3, MID);
  p.outline(BLACK);
  return p;
}

/** The volcanic island, and the great structure built at the volcano's foot. */
export function volcanoIsland(): PC {
  const p = new PC(400, 220);
  const r = artRng(530);
  p.poly([[10, 220], [150, 40], [180, 28], [220, 28], [250, 40], [390, 220]], DARK);
  p.poly([[180, 28], [220, 28], [206, 40], [194, 40]], BLACK);
  // lava running down
  for (let i = 0; i < 5; i++) {
    let x = 190 + i * 5;
    for (let y = 36; y < 160; y++) {
      x += (r() - 0.5) * 2 + (i - 2) * 0.25;
      p.px(Math.round(x), y, y % 7 ? LIGHT : WHITE);
    }
  }
  p.dither(10, 40, 380, 180, MID, 0.12, true);
  // the structure: tiers, towers, pipes
  p.rect(110, 150, 180, 70, BLACK);
  for (let i = 0; i < 6; i++) p.rect(116 + i * 30, 120 - (i % 2) * 18, 16, 100, BLACK);
  for (let i = 0; i < 6; i++) p.rect(118 + i * 30, 128 - (i % 2) * 18, 2, 6, MID);
  for (let y = 158; y < 216; y += 10) for (let x = 116; x < 284; x += 14) p.rect(x, y, 3, 3, (x + y) % 3 ? MID : LIGHT);
  p.rect(190, 186, 20, 34, DARK);
  return p;
}

/** The cage of darkness. */
export function cage(): PC {
  const p = new PC(56, 64);
  p.ellipse(28, 8, 26, 7, DARK);
  p.ellipse(28, 58, 26, 6, DARK);
  for (let i = 0; i < 9; i++) {
    const x = 4 + i * 6;
    p.rect(x, 8, 2, 50, i % 2 ? DARK : MID);
    p.px(x, 8 + (i * 7) % 40, LIGHT);
  }
  p.ellipse(28, 4, 6, 4, BLACK);
  p.outline(BLACK);
  return p;
}

/** A blade of pure darkness (the swing that cuts the airship in two). */
export function darkBlade(): PC {
  const p = new PC(96, 96);
  for (let t = 0; t < 1; t += 0.004) {
    const a = -Math.PI * 0.85 + t * Math.PI * 1.1;
    const R = 44;
    const th = Math.sin(t * Math.PI) * 9;
    for (let k = 0; k < th; k++) p.px(Math.round(48 + Math.cos(a) * (R - k)), Math.round(54 + Math.sin(a) * (R - k)), k < 2 ? WHITE : k < 4 ? MID : BLACK);
  }
  return p;
}

/** A root that bursts out of the battlefield floor. */
export function rootFx(): PC {
  const p = new PC(12, 40);
  for (let y = 0; y < 40; y++) {
    const w = 1 + Math.round((y / 40) * 4);
    const x = 6 + Math.round(Math.sin(y * 0.22) * 2) - Math.floor(w / 2);
    p.rect(x, y, w, 1, y % 5 ? DARK : MID);
    if (y % 7 === 3) p.px(x + w, y, MID);
  }
  p.outline(BLACK);
  return p;
}

/** A gust of wind (a curl of pale lines). */
export function gustFx(): PC {
  const p = new PC(48, 24);
  for (let i = 0; i < 3; i++) {
    const y = 6 + i * 6;
    for (let x = 0; x < 40 - i * 6; x++) p.px(x + i * 4, y + Math.round(Math.sin(x * 0.3 + i) * 1.5), i === 1 ? WHITE : LIGHT);
    p.ring(42 - i * 3, y - 2, 3, 2, LIGHT);
  }
  return p;
}

/** A giant acorn (the squirrel's barrage). */
export function nutFx(): PC {
  const p = new PC(10, 12);
  p.ellipse(5, 7, 4, 5, MID);
  p.ellipse(4, 6, 2, 3, LIGHT);
  p.rect(1, 2, 8, 3, DARK);
  p.px(5, 0, DARK);
  p.px(5, 1, DARK);
  p.outline(BLACK);
  return p;
}

/** A black feather (the crow's barrage). */
export function featherFx(): PC {
  const p = new PC(14, 6);
  p.line(0, 3, 13, 3, MID);
  for (let x = 2; x < 12; x++) {
    p.px(x, 2, DARK);
    p.px(x, 4, DARK);
    if (x % 2) p.px(x, 1, BLACK);
  }
  return p;
}

/** A dark grasping hand (the Reaper's Graveyard). */
export function darkHand(): PC {
  const p = new PC(16, 28);
  p.rect(5, 12, 6, 16, BLACK);
  for (let i = 0; i < 4; i++) p.rect(3 + i * 3, 2 + (i === 0 || i === 3 ? 4 : 0), 2, 12, BLACK);
  p.rect(12, 10, 3, 2, BLACK);
  p.px(4, 3, DARK);
  p.px(7, 1, DARK);
  return p;
}

// ------------------------------------------------------------------ battle arenas

function ground(p: PC, y0: number, base: number, r: R, detail: number) {
  for (let y = y0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.px(x, y, base);
  for (let i = 0; i < (p.w * (p.h - y0)) / detail; i++) p.px(Math.floor(r() * p.w), y0 + Math.floor(r() * (p.h - y0)), r() < 0.5 ? (base === DARK ? MID : DARK) : BLACK);
}

/** The forest clearing (both guardian fights, and the Champion's floor of the tower). */
export function clearingBack(): PC {
  const p = nightSky(680, 210, 540);
  const r = artRng(541);
  // the moon
  p.circle(520, 40, 16, LIGHT);
  p.circle(526, 36, 14, WHITE);
  // rows of trees, far to near
  for (const [n, far, top, sz] of [
    [34, true, 112, 16],
    [24, false, 136, 24],
  ] as const)
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * 680);
      const s = sz + Math.floor(r() * 10);
      const cy = top + Math.floor(r() * 20);
      p.rect(x - 2, cy, 4, 210 - cy, BLACK);
      p.sphere(x, cy, s, s + 6, far ? [BLACK, DARK, DARK, MID] : [DARK, MID, MID, LIGHT]);
    }
  for (let i = 0; i < 60; i++) p.px(Math.floor(r() * 680), 100 + Math.floor(r() * 100), LIGHT); // fireflies
  return p;
}
export function grassFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(542);
  ground(p, 0, DARK, r, 6);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * 720);
    const y = 6 + Math.floor(r() * 132);
    p.line(x, y, x + (r() < 0.5 ? -1 : 1), y - 2 - Math.floor(y / 40), MID);
  }
  for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 720), 20 + Math.floor(r() * 110), WHITE);
  return p;
}

/** Inside the tower: stone walls held together by roots. */
export function towerBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(543);
  for (let y = 0; y < 210; y++)
    for (let x = 0; x < 680; x++) {
      const by = Math.floor(y / 14);
      const bx = Math.floor((x + (by % 2) * 12) / 24);
      const edge = y % 14 === 0 || (x + (by % 2) * 12) % 24 === 0;
      p.px(x, y, edge ? BLACK : (bx * 7 + by * 3) % 5 === 0 ? MID : DARK);
    }
  for (let i = 0; i < 14; i++) {
    let x = r() * 680;
    for (let y = 0; y < 210; y++) {
      x += Math.sin(y * 0.05 + i) * 1.2;
      p.rect(Math.round(x), y, 5, 1, BLACK);
      p.rect(Math.round(x) + 1, y, 2, 1, MID);
    }
  }
  return p;
}
export function stoneFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(544);
  ground(p, 0, MID, r, 5);
  for (let y = 0; y < 140; y += 18) p.rect(0, y, 720, 1, DARK);
  for (let y = 0; y < 140; y += 18) for (let x = (y / 18) % 2 ? 0 : 20; x < 720; x += 40) p.rect(x, y, 1, 18, DARK);
  return p;
}

/** The crow's nest: open night sky and the airship's rigging. */
export function nestBack(): PC {
  const p = nightSky(680, 210, 545, true);
  p.circle(120, 50, 12, LIGHT);
  for (let i = 0; i < 8; i++) p.line(40 + i * 90, 0, 20 + i * 95, 210, DARK);
  p.ellipse(340, 230, 300, 60, DARK); // the torn balloon below
  return p;
}
export function deckFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(546);
  ground(p, 0, DARK, r, 10);
  for (let y = 0; y < 140; y += 9) p.rect(0, y, 720, 1, BLACK);
  for (let y = 0; y < 140; y += 9) for (let x = (y / 9) % 2 ? 10 : 40; x < 720; x += 60) p.rect(x, y, 1, 9, BLACK);
  return p;
}

/** Inside the giant tree: a vast hollow lit by glowing fungus. */
export function treeBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(547);
  for (let y = 0; y < 210; y++) for (let x = 0; x < 680; x++) p.px(x, y, ((x + Math.floor(Math.sin(y * 0.04) * 8)) % 11) < 2 ? BLACK : DARK);
  for (let i = 0; i < 30; i++) p.circle(Math.floor(r() * 680), Math.floor(r() * 200), 1 + Math.floor(r() * 2), r() < 0.3 ? WHITE : LIGHT);
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 110;
    p.rect(x, 0, 18, 210, MID);
    p.rect(x, 0, 3, 210, LIGHT);
    p.rect(x + 15, 0, 3, 210, BLACK);
  }
  return p;
}
export function barkFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(548);
  ground(p, 0, MID, r, 7);
  for (let i = 0; i < 60; i++) {
    const y = Math.floor(r() * 140);
    p.line(Math.floor(r() * 720), y, Math.floor(r() * 720), y + 2, DARK);
  }
  return p;
}

/** The stone chamber under the volcano. */
export function volcBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(549);
  for (let y = 0; y < 210; y++) for (let x = 0; x < 680; x++) p.px(x, y, (x * 3 + y * 5) % 23 < 2 ? DARK : BLACK);
  for (let i = 0; i < 12; i++) {
    let x = r() * 680;
    for (let y = 0; y < 210; y++) {
      x += (r() - 0.5) * 2;
      p.px(Math.round(x), y, y % 9 ? MID : LIGHT);
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 150;
    p.rect(x, 20, 30, 190, DARK);
    p.rect(x, 20, 4, 190, MID);
  }
  return p;
}
export function volcFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(550);
  ground(p, 0, DARK, r, 5);
  for (let i = 0; i < 10; i++) {
    let x = r() * 720;
    for (let y = 0; y < 140; y++) {
      x += (r() - 0.5) * 3;
      p.px(Math.round(x), y, LIGHT);
    }
  }
  return p;
}
