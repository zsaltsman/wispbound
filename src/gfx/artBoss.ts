import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';

// THE FLYING DUTCHMAN - built from parts so each can animate independently.
// Hull space: 212 x 78, bow on the LEFT (it faces the player).

export const HULL_W = 212;
export const HULL_H = 78;

export function skull(p: PC, x: number, y: number, r: number, bone = LIGHT, glow = false) {
  p.sphere(x, y, r, Math.round(r * 0.9), [MID, bone, WHITE]);
  p.rect(x - Math.round(r * 0.6), y + Math.round(r * 0.6), Math.round(r * 1.2) + 1, Math.max(2, Math.round(r * 0.5)), bone);
  const er = Math.max(1, Math.round(r * 0.32));
  p.ellipse(x - Math.round(r * 0.4), y, er, er, BLACK);
  p.ellipse(x + Math.round(r * 0.4), y, er, er, BLACK);
  if (glow) {
    p.px(x - Math.round(r * 0.4), y, WHITE);
    p.px(x + Math.round(r * 0.4), y, WHITE);
  }
  p.px(x, y + Math.round(r * 0.45), BLACK);
  const ty = y + Math.round(r * 0.75);
  for (let i = -Math.round(r * 0.5); i <= Math.round(r * 0.5); i += 2) p.px(x + i, ty, BLACK);
}

export const HULL_SHAPE: Pt[] = [
  [8, 22],
  [54, 17],
  [58, 25],
  [150, 25],
  [152, 7],
  [200, 3],
  [208, 9],
  [206, 44],
  [196, 62],
  [176, 72],
  [70, 73],
  [38, 61],
  [14, 41],
];

export function hull(phase = 1): PC {
  const p = new PC(HULL_W, HULL_H);
  const rng = artRng(1234);
  p.poly(HULL_SHAPE, DARK);
  // planks: lighter near the rail, rotten black toward the waterline
  p.shade((x, y) => {
    let v = 0.66 - (y / HULL_H) * 0.62;
    if (y % 7 === 0) v -= 0.45;
    if (y % 7 === 1) v += 0.08;
    return v;
  }, [BLACK, DARK, MID]);
  for (let y = 25; y < 72; y += 7)
    for (let x = 18 + ((y / 7) % 2) * 15; x < 206; x += 30) if (p.get(x, y + 3) >= 0) p.line(x, y + 1, x, y + 5, BLACK);
  // rails + balusters
  p.line(8, 21, 54, 16, MID);
  p.line(58, 24, 150, 24, MID);
  p.line(152, 6, 200, 2, MID);
  for (let x = 62; x < 150; x += 6) p.line(x, 20, x, 24, DARK);
  for (let x = 62; x < 150; x += 6) p.px(x, 20, MID);
  p.line(60, 20, 150, 20, MID);
  for (let x = 12; x < 54; x += 6) {
    const y = 21 - Math.round((x - 8) * (5 / 46));
    p.line(x, y - 4, x, y, DARK);
    p.px(x, y - 4, MID);
  }
  p.line(10, 17, 54, 12, MID);
  // gun deck: open ports
  for (let x = 66; x < 150; x += 20) {
    p.rect(x, 33, 10, 7, BLACK);
    p.line(x - 1, 32, x + 10, 32, LIGHT);
    p.line(x - 1, 40, x + 10, 40, MID);
  }
  // lower glowing ports
  for (let x = 78; x < 170; x += 22) {
    p.rect(x, 49, 6, 4, WHITE);
    p.rect(x - 1, 48, 8, 1, DARK);
  }
  // stern windows
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      const wx = 160 + i * 11;
      const wy = 11 + j * 10;
      p.rect(wx - 1, wy - 1, 10, 9, MID);
      p.rect(wx, wy, 8, 7, WHITE);
      p.line(wx + 4, wy, wx + 4, wy + 6, BLACK);
      p.line(wx, wy + 3, wx + 7, wy + 3, BLACK);
    }
  // stern gallery
  p.line(156, 31, 206, 31, LIGHT);
  for (let x = 158; x < 206; x += 4) p.line(x, 31, x, 34, MID);
  p.line(156, 34, 206, 34, MID);
  // skull crest on the stern
  skull(p, 182, 45, 6, LIGHT, true);
  p.line(172, 52, 192, 40, LIGHT);
  p.line(172, 40, 192, 52, LIGHT);
  skull(p, 182, 45, 6, LIGHT, true);
  // gaping holes and broken planks
  p.poly(
    [
      [104, 51],
      [113, 48],
      [121, 54],
      [115, 60],
      [106, 59],
    ],
    BLACK
  );
  p.line(103, 50, 110, 46, MID);
  p.line(116, 61, 123, 57, MID);
  p.poly(
    [
      [44, 50],
      [50, 47],
      [54, 53],
      [47, 56],
    ],
    BLACK
  );
  // barnacles + slime near the waterline
  for (let i = 0; i < 70; i++) {
    const x = 30 + Math.floor(rng() * 175);
    const y = 56 + Math.floor(rng() * 16);
    if (p.get(x, y) >= 0) p.px(x, y, rng() < 0.6 ? MID : LIGHT);
  }
  // the bowsprit stub + figurehead skull
  p.thick(0, 16, 14, 24, DARK, 2);
  skull(p, 12, 30, 8, LIGHT, true);
  p.line(4, 37, 20, 37, BLACK);
  p.outline(BLACK);
  // seaweed hanging from the keel
  for (let i = 0; i < 14; i++) {
    const x = 50 + Math.floor(rng() * 150);
    let y = 0;
    for (let yy = HULL_H - 1; yy > 30; yy--)
      if (p.get(x, yy) >= 0) {
        y = yy;
        break;
      }
    if (!y) continue;
    const len = 3 + Math.floor(rng() * 6);
    for (let k = 1; k <= len && y + k < HULL_H; k++) p.px(x + (k % 3 === 0 ? 1 : 0), y + k, k < 3 ? MID : DARK);
  }
  if (phase >= 2) {
    // abyssal veins of light crawl over the hull
    for (let i = 0; i < 6; i++) {
      let x = 60 + Math.floor(rng() * 130);
      let y = 40 + Math.floor(rng() * 20);
      for (let k = 0; k < 10; k++) {
        if (p.get(x, y) >= 0 && p.get(x, y) !== WHITE) p.px(x, y, LIGHT);
        x += rng() < 0.5 ? 1 : -1;
        y += rng() < 0.6 ? -1 : 1;
      }
    }
  }
  return p;
}

/** Window glow overlay (flickers). */
export function windowGlow(): PC {
  const p = new PC(HULL_W, HULL_H);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      const wx = 160 + i * 11;
      const wy = 11 + j * 10;
      p.dither(wx - 3, wy - 3, 14, 13, LIGHT, 0.35);
      p.rect(wx, wy, 8, 7, WHITE);
    }
  for (let x = 78; x < 170; x += 22) {
    p.dither(x - 2, 47, 10, 8, LIGHT, 0.4);
    p.rect(x, 49, 6, 4, WHITE);
  }
  return p;
}

// ------------------------------------------------------------------ masts

export const MASTS = [
  { x: 74, h: 78, yards: [0.15, 0.52] },
  { x: 116, h: 90, yards: [0.12, 0.5] },
  { x: 164, h: 70, yards: [0.15, 0.55] },
];
export const MAST_TOP = 90; // tallest mast above the deck (deck at hull y=25)

/** Masts, yards, rigging and crow's nest, in a 212 x (MAST_TOP+26) canvas. Deck line = bottom - 1. */
export function masts(): PC {
  const H = MAST_TOP + 26;
  const deck = H - 1;
  const p = new PC(HULL_W, H);
  // rigging (behind)
  for (const m of MASTS) {
    const top = deck - m.h;
    const base = m.x >= 150 ? deck - 18 : deck;
    p.line(m.x, top + 4, m.x - 30, base, DARK);
    p.line(m.x, top + 4, m.x + 26, base, DARK);
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      p.line(m.x - 30 * t + 2, top + 4 + (base - top - 4) * t, m.x + 26 * t - 2, top + 4 + (base - top - 4) * t, BLACK);
    }
  }
  p.line(4, deck - 6, MASTS[0].x, deck - MASTS[0].h + 2, DARK);
  p.line(MASTS[0].x, deck - MASTS[0].h + 2, MASTS[1].x, deck - MASTS[1].h + 2, DARK);
  p.line(MASTS[1].x, deck - MASTS[1].h + 2, MASTS[2].x, deck - MASTS[2].h + 2, DARK);
  for (const m of MASTS) {
    const top = deck - m.h;
    const bottom = m.x >= 150 ? deck - 18 : deck;
    p.rect(m.x - 1, top, 3, bottom - top, DARK);
    p.line(m.x - 1, top, m.x - 1, bottom, MID);
    for (const y of m.yards) {
      const yy = Math.round(top + (bottom - top) * y);
      const w = Math.round(22 - y * 6);
      p.rect(m.x - w, yy, w * 2 + 1, 2, DARK);
      p.line(m.x - w, yy, m.x + w, yy, MID);
    }
    p.circle(m.x, top - 1, 1, LIGHT);
  }
  // crow's nest
  const mm = MASTS[1];
  const ny = deck - mm.h + 14;
  p.rect(mm.x - 6, ny, 13, 5, DARK);
  p.line(mm.x - 6, ny, mm.x + 6, ny, MID);
  p.px(mm.x - 2, ny - 1, WHITE);
  p.px(mm.x + 2, ny - 1, WHITE);
  p.outline(BLACK);
  return p;
}

/** One tattered sail. f = billow frame (0-2), glow = phase 3 illuminated variant. */
export function sail(w: number, h: number, f: number, seed: number, glow: boolean, emblem: boolean): PC {
  const p = new PC(w + 8, h + 6);
  const rng = artRng(seed);
  const bulge = [2, 4, 3][f];
  // shape: top hangs from the yard, sides and hem curve with the wind (blowing toward the bow / left)
  for (let y = 0; y <= h; y++) {
    const t = y / h;
    const curve = Math.sin(t * Math.PI) * bulge;
    const xl = 4 - Math.round(curve) + Math.round(t * 1);
    const xr = 4 + w - Math.round(curve * 0.4) - Math.round(t * 2);
    for (let x = xl; x <= xr; x++) p.px(x, y + 1, LIGHT);
  }
  // shading: shadowed toward the right, dark seams
  const ramp = glow ? [LIGHT, WHITE] : [DARK, MID, LIGHT];
  p.shade((x, y) => {
    const t = (x - 2) / (w + 4);
    let v = 0.95 - t * 0.6 - Math.abs(y / (h + 2) - 0.45) * 0.3;
    if (Math.floor(x + f) % 9 === 0) v -= 0.25;
    return v;
  }, ramp);
  // rips and holes
  const holes = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < holes; i++) {
    const hx = 6 + Math.floor(rng() * (w - 6));
    const hy = 4 + Math.floor(rng() * (h - 6));
    const hr = 1 + Math.floor(rng() * 2);
    p.ellipse(hx, hy, hr, hr + (rng() < 0.5 ? 1 : 0), -1);
  }
  // ragged hem
  for (let x = 0; x < w + 8; x++) {
    const cut = Math.floor(rng() * 4) + (f === 1 && x % 5 === 0 ? 1 : 0);
    for (let k = 0; k < cut; k++) p.px(x, h + 1 - k, -1);
  }
  // one long tear
  const tx = 8 + Math.floor(rng() * (w - 12));
  for (let k = 0; k < h * 0.45; k++) p.px(tx + Math.round(Math.sin(k * 0.5)), h + 1 - k, -1);
  if (emblem) {
    const ex = 4 + Math.round(w * 0.42);
    const ey = Math.round(h * 0.45);
    p.ellipse(ex, ey, 6, 5, glow ? LIGHT : DARK);
    p.rect(ex - 3, ey + 4, 7, 3, glow ? LIGHT : DARK);
    p.ellipse(ex - 2, ey, 1, 2, glow ? WHITE : BLACK);
    p.ellipse(ex + 3, ey, 1, 2, glow ? WHITE : BLACK);
    p.line(ex - 8, ey + 9, ex + 8, ey - 6, glow ? LIGHT : DARK);
    p.line(ex - 8, ey - 6, ex + 8, ey + 9, glow ? LIGHT : DARK);
  }
  p.outline(glow ? LIGHT : BLACK);
  return p;
}

/** Sail layout: [mastIndex, yardIndex, width, height, seed, emblem]. */
export const SAILS: [number, number, number, number, number, boolean][] = [
  [0, 0, 30, 22, 11, false],
  [0, 1, 36, 28, 12, false],
  [1, 0, 34, 26, 21, false],
  [1, 1, 42, 34, 22, true],
  [2, 0, 26, 18, 31, false],
  [2, 1, 32, 20, 32, false],
];

export function flag(f: number): PC {
  const p = new PC(22, 12);
  for (let x = 0; x < 20; x++) {
    const wave = Math.round(Math.sin(x * 0.5 + f * 2) * 1.5);
    const hgt = Math.max(2, 8 - Math.floor(x / 4));
    for (let y = 0; y < hgt; y++) if (!(x > 12 && (x + y + f) % 4 === 0)) p.px(x, 2 + y + wave, DARK);
  }
  p.px(5, 4, LIGHT);
  p.px(7, 4, LIGHT);
  p.px(6, 6, LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ captain

/** 24x34. f 0-1 idle, 2 = command (arm raised). v2 = phase 2+ terrifying form. */
export function captain(f: number, v2: boolean): PC {
  const p = new PC(24, 34);
  const bob = f === 1 ? 1 : 0;
  const cx = 12;
  if (v2) {
    // ghostly aura
    for (let y = 2; y < 34; y++)
      for (let x = 0; x < 24; x++) {
        const d = Math.hypot((x - cx) / 11, (y - 17) / 16);
        if (d < 1 && (x + y) % 2 === 0 && (x * 3 + y) % 5 !== 0) p.px(x, y, MID);
      }
  }
  // long coat
  p.poly(
    [
      [cx - 5, 14 + bob],
      [cx + 5, 14 + bob],
      [cx + 7, 33],
      [cx - 7, 33],
    ],
    DARK
  );
  p.shade((x) => (x < cx ? 0.55 : 0.25), [BLACK, DARK, MID]);
  p.line(cx, 15 + bob, cx, 32, BLACK);
  for (let y = 17; y < 30; y += 4) {
    p.px(cx - 2, y + bob, LIGHT);
    p.px(cx + 2, y + bob, LIGHT);
  }
  // epaulettes
  p.rect(cx - 7, 14 + bob, 3, 2, LIGHT);
  p.rect(cx + 5, 14 + bob, 3, 2, LIGHT);
  // tattered coat tails
  p.px(cx - 6, 33, -1);
  p.px(cx + 4, 33, -1);
  // arms
  if (f === 2) {
    p.thick(cx - 6, 15, cx - 10, 4, DARK, 2);
    p.line(cx - 10, 3, cx - 12, -1, WHITE); // cutlass raised high
    p.line(cx - 11, 3, cx - 13, 0, LIGHT);
  } else {
    p.thick(cx - 6, 16 + bob, cx - 8, 25, DARK, 2);
    p.line(cx - 8, 26, cx - 11, 32, LIGHT); // cutlass resting
    p.line(cx - 9, 26, cx - 12, 33, WHITE);
  }
  p.thick(cx + 5, 16 + bob, cx + 7, 25, DARK, 2);
  // skull face
  const fy = 9 + bob;
  p.sphere(cx, fy, 4, 4, [MID, LIGHT, WHITE]);
  p.rect(cx - 2, fy + 3, 5, 2, LIGHT);
  p.px(cx - 2, fy, BLACK);
  p.px(cx - 1, fy, BLACK);
  p.px(cx + 1, fy, BLACK);
  p.px(cx + 2, fy, BLACK);
  if (v2 || f === 2) {
    p.px(cx - 2, fy, WHITE);
    p.px(cx + 2, fy, WHITE);
  }
  p.px(cx, fy + 2, BLACK);
  // seaweed beard
  for (let k = -3; k <= 3; k += 2) p.line(cx + k, fy + 4, cx + k + (k > 0 ? 1 : -1), fy + 8 + (k % 3 === 0 ? 1 : 0), MID);
  // tricorn hat
  const hy = fy - 4;
  p.poly(
    [
      [cx - 8, hy + 1],
      [cx + 8, hy + 1],
      [cx + 5, hy - 2],
      [cx, hy - 5 - (v2 ? 2 : 0)],
      [cx - 5, hy - 2],
    ],
    BLACK
  );
  p.line(cx - 8, hy + 1, cx + 8, hy + 1, LIGHT);
  p.px(cx, hy - 2, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ small parts

export function cannon(): PC {
  const p = new PC(16, 8);
  p.rect(3, 2, 12, 4, DARK);
  p.rect(1, 1, 3, 6, DARK);
  p.line(3, 2, 14, 2, MID);
  p.px(1, 1, LIGHT);
  p.rect(14, 1, 2, 6, DARK);
  p.outline(BLACK);
  return p;
}

export function chain(len: number, f: number): PC {
  const p = new PC(7, len);
  for (let y = 0; y < len - 2; y += 4) {
    if ((y / 4 + f) % 2 === 0) {
      p.ring(3, y + 2, 2, 2, MID);
      p.px(2, y + 1, LIGHT);
    } else {
      p.rect(3, y, 1, 4, MID);
      p.px(3, y, LIGHT);
    }
  }
  return p;
}

export function foam(f: number): PC {
  const p = new PC(240, 14);
  const rng = artRng(500 + f);
  for (let x = 0; x < 240; x++) {
    const h = 3 + Math.round(Math.sin(x * 0.18 + f * 1.4) * 2 + Math.sin(x * 0.05 + f) * 2);
    for (let y = 0; y < h; y++) p.px(x, 13 - y, y === h - 1 ? WHITE : y > h - 3 ? LIGHT : MID);
    if (rng() < 0.15) p.px(x, 12 - h - Math.floor(rng() * 3), WHITE);
  }
  return p;
}

export function aura(): PC {
  const p = new PC(280, 200);
  for (let y = 0; y < 200; y++)
    for (let x = 0; x < 280; x++) {
      const d = Math.hypot((x - 140) / 140, (y - 100) / 100);
      if (d > 1) continue;
      const v = (1 - d) * 0.9;
      if (((x * 7 + y * 13) % 16) / 16 < v * 0.55) p.px(x, y, d < 0.6 ? WHITE : LIGHT);
    }
  return p;
}
