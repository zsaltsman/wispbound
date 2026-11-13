import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { T } from '../world/tiles';

// World 4 tiles: the Forgotten Island. A night meadow at the foot of the mountain,
// the mountain's rock, the barren ground the village stands on, the ancient forest,
// and the floors and walls of the tower, the giant tree, the airship, the castle,
// the volcanic stronghold and its cells.

type Painter = (p: PC, r: () => number) => void;
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);
const speck = (p: PC, r: () => number, n: number, c: number) => {
  for (let i = 0; i < n; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), c);
};
const blade = (p: PC, x: number, y: number, h: number, c: number, lean = 0) => {
  for (let k = 0; k < h; k++) p.px(x + Math.round((lean * k) / h), y - k, c);
};
/** Big irregular stones laid in a floor. */
const flags = (p: PC, r: () => number, base: number, edge: number, hi: number) => {
  fill(p, edge);
  const rows = [0, 6, 11, 16];
  for (let j = 0; j < 3; j++) {
    let x = j % 2 ? -3 : 0;
    while (x < 16) {
      const w = 5 + Math.floor(r() * 5);
      p.rect(x + 1, rows[j] + 1, w - 1, rows[j + 1] - rows[j] - 1, base);
      p.rect(x + 1, rows[j] + 1, w - 1, 1, hi);
      x += w;
    }
  }
};
/** Bricks for a wall face. */
const bricks = (p: PC, base: number, mortar: number, hi: number, bw = 8, bh = 4) => {
  fill(p, mortar);
  for (let y = 0; y < 16; y += bh)
    for (let x = (y / bh) % 2 ? -bw / 2 : 0; x < 16; x += bw) {
      p.rect(x + 1, y + 1, bw - 1, bh - 1, base);
      p.rect(x + 1, y + 1, bw - 1, 1, hi);
    }
};

export const G4: Record<number, Painter> = {
  // ---- the meadow at the foot of the mountain (night)
  [T.W4_GRASS]: (p, r) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.1);
    for (let i = 0; i < 4; i++) blade(p, Math.floor(r() * 15), 4 + Math.floor(r() * 12), 2 + Math.floor(r() * 2), MID, r() < 0.5 ? -1 : 1);
    speck(p, r, 2, BLACK);
  },
  [T.W4_FLOWERS]: (p, r) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.1);
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r() * 12);
      const y = 3 + Math.floor(r() * 11);
      p.line(x, y + 1, x, y + 3, MID);
      p.px(x, y, WHITE);
      p.px(x - 1, y, LIGHT);
      p.px(x + 1, y, LIGHT);
      p.px(x, y - 1, LIGHT);
    }
  },
  [T.W4_TRAIL]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.18);
    speck(p, r, 5, LIGHT);
    speck(p, r, 4, DARK);
    p.rect(Math.floor(r() * 10) + 2, Math.floor(r() * 10) + 3, 2, 1, DARK);
  },
  // the mountain itself: cut rock, layered, solid
  [T.W4_ROCK]: (p, r) => {
    fill(p, DARK);
    for (let y = 2; y < 16; y += 5) {
      p.rect(0, y, 16, 1, BLACK);
      p.rect(0, y + 1, 16, 1, MID);
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 16);
      p.line(x, 0, x + (r() < 0.5 ? -2 : 2), 15, BLACK);
    }
    speck(p, r, 3, MID);
  },
  [T.W4_ROCKTOP]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.3);
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r() * 10);
      const y = 2 + Math.floor(r() * 10);
      p.ellipse(x, y, 3, 2, MID);
      p.px(x - 1, y - 1, LIGHT);
      p.line(x - 3, y + 2, x + 3, y + 2, BLACK);
    }
  },
  [T.W4_CLIFF]: (p, r) => {
    // the edge of the summit: a lip of rock and a long drop into the dark
    fill(p, BLACK);
    p.rect(0, 0, 16, 5, MID);
    p.rect(0, 0, 16, 1, LIGHT);
    for (let x = 0; x < 16; x += 3) p.rect(x, 5, 2, 1 + Math.floor(r() * 3), DARK);
    p.dither(0, 8, 16, 8, DARK, 0.1);
  },
  // ---- the village's barren ground
  [T.W4_BARREN]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.22);
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(r() * 12);
      const y = Math.floor(r() * 14);
      p.line(x, y, x + 3, y + 1, BLACK);
      p.line(x + 3, y + 1, x + 4, y + 3, BLACK);
    }
    speck(p, r, 3, LIGHT);
  },
  [T.W4_BARREN2]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.3);
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(r() * 15);
      const y = Math.floor(r() * 15);
      p.rect(x, y, 2, 1, LIGHT);
      p.px(x, y + 1, DARK);
    }
  },
  [T.W4_DEADGRASS]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.2);
    for (let i = 0; i < 6; i++) blade(p, Math.floor(r() * 15), 6 + Math.floor(r() * 10), 3, r() < 0.5 ? LIGHT : DARK, r() < 0.5 ? -2 : 2);
  },
  [T.W4_COBBLE]: (p, r) => {
    fill(p, DARK);
    for (let y = 0; y < 16; y += 5)
      for (let x = (y / 5) % 2 ? -2 : 1; x < 16; x += 6) {
        if (r() < 0.18) continue; // stones missing
        p.ellipse(x + 2, y + 2, 2, 1, MID);
        p.px(x + 1, y + 1, LIGHT);
      }
  },
  [T.W4_SHORE]: (p, r) => {
    fill(p, DARK);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 14) + 1;
      const y = Math.floor(r() * 14) + 1;
      const w = 1 + Math.floor(r() * 3);
      p.ellipse(x, y, w, 1 + Math.floor(r() * 2), MID);
      p.px(x - 1, y - 1, LIGHT);
    }
    speck(p, r, 3, BLACK);
  },
  [T.W4_SAND]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.12);
    speck(p, r, 4, DARK);
  },
  // ---- the ancient forest: unusually alive
  [T.W4_FOREST]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.12);
    for (let i = 0; i < 6; i++) blade(p, Math.floor(r() * 15), 5 + Math.floor(r() * 11), 3, r() < 0.4 ? LIGHT : DARK, r() < 0.5 ? -1 : 1);
  },
  [T.W4_FOREST2]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.1);
    // a fern
    const x = 4 + Math.floor(r() * 8);
    const y = 12;
    for (let k = 0; k < 4; k++) {
      p.line(x, y, x - 4 + k, y - 6 + k, DARK);
      p.line(x, y, x + 4 - k, y - 6 + k, DARK);
    }
    p.line(x, y, x, y - 7, LIGHT);
    speck(p, r, 2, WHITE);
  },
  // ---- the Woodlands Tower: old stone, overtaken by roots
  [T.W4_STONE]: (p, r) => {
    flags(p, r, MID, DARK, LIGHT);
    if (r() < 0.4) p.line(Math.floor(r() * 16), 0, Math.floor(r() * 16), 15, DARK);
  },
  [T.W4_ROOTFLOOR]: (p, r) => {
    flags(p, r, MID, DARK, LIGHT);
    const y0 = 3 + Math.floor(r() * 10);
    p.thick(0, y0, 15, y0 + Math.floor((r() - 0.5) * 6), BLACK, 2);
    p.line(0, y0, 15, y0 + 1, DARK);
    p.px(6, y0 - 1, LIGHT);
  },
  [T.W4_STONEWALL]: (p) => {
    bricks(p, DARK, BLACK, MID, 8, 4);
    // a curtain of vines over the top
    for (let x = 1; x < 16; x += 4) p.line(x, 0, x + 1, 6 + (x % 3) * 2, MID);
  },
  [T.W4_STONEWALL_LOW]: (p) => {
    bricks(p, DARK, BLACK, MID, 8, 4);
    p.rect(0, 13, 16, 3, BLACK);
    p.rect(0, 13, 16, 1, MID);
    p.line(3, 0, 5, 9, MID);
    p.px(5, 9, LIGHT);
  },
  // ---- the giant tree
  [T.W4_PLANK]: (p, r) => {
    fill(p, MID);
    for (let x = 0; x < 16; x += 4) {
      p.rect(x, 0, 1, 16, DARK);
      p.px(x + 2, Math.floor(r() * 16), LIGHT);
    }
    p.px(2, 3, BLACK);
    p.px(10, 12, BLACK);
  },
  [T.W4_BARK]: (p, r) => {
    fill(p, DARK);
    for (let x = 1; x < 16; x += 3 + Math.floor(r() * 2)) p.line(x, 0, x + (r() < 0.5 ? 1 : -1), 15, BLACK);
    for (let i = 0; i < 4; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), MID);
  },
  [T.W4_BARK_LOW]: (p, r) => {
    fill(p, DARK);
    for (let x = 1; x < 16; x += 3 + Math.floor(r() * 2)) p.line(x, 0, x, 12, BLACK);
    p.rect(0, 12, 16, 4, BLACK);
    p.rect(0, 12, 16, 1, MID);
  },
  [T.W4_ROPEBRIDGE]: (p) => {
    fill(p, BLACK);
    for (let y = 1; y < 16; y += 3) {
      p.rect(2, y, 12, 2, MID);
      p.rect(2, y, 12, 1, LIGHT);
    }
    p.rect(1, 0, 1, 16, LIGHT);
    p.rect(14, 0, 1, 16, LIGHT);
  },
  [T.W4_GAP]: (p, r) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 4, DARK, 0.25);
    speck(p, r, 1, DARK);
  },
  [T.W4_CHANNEL]: (p) => {
    // a stone water channel, dry
    fill(p, DARK);
    p.rect(0, 0, 16, 3, MID);
    p.rect(0, 13, 16, 3, MID);
    p.rect(0, 3, 16, 1, BLACK);
    p.dither(0, 4, 16, 9, BLACK, 0.3);
  },
  [T.W4_CHANNEL_WET]: (p) => {
    fill(p, DARK);
    p.rect(0, 0, 16, 3, MID);
    p.rect(0, 13, 16, 3, MID);
    p.rect(0, 4, 16, 9, LIGHT);
    for (let x = 0; x < 16; x += 5) p.rect(x, 6, 3, 1, WHITE);
    p.rect(7, 9, 2, 1, MID);
  },
  [T.W4_CRACKED]: (p, r) => {
    fill(p, MID);
    for (let x = 0; x < 16; x += 4) p.rect(x, 0, 1, 16, DARK);
    p.line(1, 2, 7, 9, BLACK);
    p.line(7, 9, 5, 15, BLACK);
    p.line(7, 9, 14, 7, BLACK);
    speck(p, r, 2, LIGHT);
  },
  // ---- the airship
  [T.W4_DECK]: (p, r) => {
    fill(p, MID);
    for (let y = 0; y < 16; y += 4) p.rect(0, y, 16, 1, DARK);
    p.px(Math.floor(r() * 16), 2, BLACK);
    p.px(Math.floor(r() * 16), 10, BLACK);
    if (r() < 0.4) p.rect(Math.floor(r() * 10), Math.floor(r() * 3) * 4 + 1, 6, 3, DARK); // a split board
  },
  [T.W4_HULL]: (p) => {
    fill(p, DARK);
    for (let y = 0; y < 16; y += 4) {
      p.rect(0, y, 16, 1, BLACK);
      p.rect(0, y + 1, 16, 1, MID);
    }
    p.circle(4, 8, 1, LIGHT);
    p.circle(12, 8, 1, LIGHT);
  },
  [T.W4_HULL_LOW]: (p) => {
    fill(p, DARK);
    for (let y = 0; y < 12; y += 4) p.rect(0, y, 16, 1, BLACK);
    p.rect(0, 12, 16, 4, BLACK);
    p.rect(0, 12, 16, 1, MID);
  },
  // ---- the castle
  [T.W4_CASTLE]: (p, r) => flags(p, r, LIGHT, MID, WHITE),
  [T.W4_CASTLEWALL]: (p) => bricks(p, MID, DARK, LIGHT, 8, 4),
  [T.W4_CASTLEWALL_LOW]: (p) => {
    bricks(p, MID, DARK, LIGHT, 8, 4);
    p.rect(0, 13, 16, 3, BLACK);
    p.rect(0, 13, 16, 1, MID);
  },
  [T.W4_CARPET]: (p) => {
    fill(p, DARK);
    p.rect(2, 0, 12, 16, MID);
    p.rect(3, 0, 1, 16, LIGHT);
    p.rect(12, 0, 1, 16, LIGHT);
    for (let y = 2; y < 16; y += 8) p.poly([[8, y], [11, y + 3], [8, y + 6], [5, y + 3]], DARK);
  },
  // ---- the volcanic stronghold and its cells
  [T.W4_VOLC]: (p, r) => {
    flags(p, r, DARK, BLACK, MID);
    if (r() < 0.3) {
      const x = Math.floor(r() * 12);
      p.line(x, 4, x + 4, 9, LIGHT); // a hot seam
    }
  },
  [T.W4_VOLCWALL]: (p, r) => {
    bricks(p, DARK, BLACK, MID, 8, 5);
    const x = 3 + Math.floor(r() * 10);
    p.line(x, 0, x - 2, 6, LIGHT);
    p.line(x - 2, 6, x + 1, 11, WHITE);
    p.line(x + 1, 11, x, 15, LIGHT);
  },
  [T.W4_VOLCWALL_LOW]: (p) => {
    bricks(p, DARK, BLACK, MID, 8, 5);
    p.rect(0, 13, 16, 3, BLACK);
    p.line(6, 0, 8, 8, LIGHT);
  },
  [T.W4_CELLFLOOR]: (p, r) => {
    flags(p, r, DARK, BLACK, MID);
    if (r() < 0.25) p.ellipse(4 + Math.floor(r() * 8), 6 + Math.floor(r() * 6), 2, 1, MID); // a puddle from the drip
  },
};
