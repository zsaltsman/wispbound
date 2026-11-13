import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer } from './pixel';
import { T, D } from '../world/tiles';
import { G2, DC2 } from './artTiles2';
import { G3 } from './artTiles3';
import { G4 } from './artTiles4';
import { G5 } from './artTiles5';
import { G_LAB_TILES } from './artTilesLab';

// 16x16 overworld tiles: terrain, floors, walls and furniture. Painted into a
// single tileset whose frame index equals the tile id.

type Painter = (p: PC, r: () => number) => void;

const speck = (p: PC, r: () => number, n: number, c: number, x0 = 0, y0 = 0, w = 16, h = 16) => {
  for (let i = 0; i < n; i++) p.px(x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), c);
};
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);

const grassBase = (p: PC, r: () => number) => {
  fill(p, DARK);
  p.dither(0, 0, 16, 16, BLACK, 0.18);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * 15);
    const y = 2 + Math.floor(r() * 13);
    p.px(x, y, MID);
    p.px(x + 1, y - 1, MID);
  }
};

const plank = (p: PC, vertical: boolean, base: number) => {
  fill(p, base);
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    if (vertical) {
      p.rect(o, 0, 1, 16, BLACK);
      p.rect(o + 1, 0, 1, 16, base === MID ? LIGHT : MID);
      p.px(o + 2, (i * 5) % 16, BLACK);
      p.rect(o, (i * 7 + 3) % 16, 4, 1, BLACK);
    } else {
      p.rect(0, o, 16, 1, BLACK);
      p.rect(0, o + 1, 16, 1, base === MID ? LIGHT : MID);
      p.px((i * 5) % 16, o + 2, BLACK);
      p.rect((i * 7 + 3) % 16, o, 1, 4, BLACK);
    }
  }
};

const wallFace = (p: PC, base: number, stripe: number, board: number) => {
  fill(p, base);
  for (let x = 1; x < 16; x += 4) p.rect(x, 0, 1, 12, stripe);
  p.rect(0, 12, 16, 4, board);
  p.rect(0, 12, 16, 1, LIGHT);
  p.rect(0, 15, 16, 1, BLACK);
};

const G: Record<number, Painter> = {
  [T.VOID]: (p) => fill(p, BLACK),
  [T.GRASS]: grassBase,
  [T.GRASS2]: (p, r) => {
    grassBase(p, r);
    p.ellipse(10, 11, 2, 1, MID);
    p.px(9, 10, LIGHT);
  },
  [T.GRASS3]: (p, r) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, BLACK, 0.45);
    speck(p, r, 10, MID);
  },
  [T.TUFT]: (p, r) => {
    grassBase(p, r);
    for (const [x, h] of [
      [5, 5],
      [7, 7],
      [9, 4],
      [11, 6],
    ])
      p.line(x, 14, x + (x > 8 ? 1 : -1), 14 - h, MID);
    p.px(7, 7, LIGHT);
  },
  [T.DEADFLOWER]: (p, r) => {
    grassBase(p, r);
    p.line(8, 14, 8, 8, MID);
    p.line(8, 8, 10, 9, MID);
    p.circle(11, 10, 1, LIGHT);
    p.px(11, 10, MID);
  },
  [T.DIRT]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.45);
    speck(p, r, 6, LIGHT);
    speck(p, r, 6, BLACK);
  },
  [T.COBBLE]: (p, r) => {
    fill(p, BLACK);
    const stones = [
      [0, 0, 7, 5],
      [8, 0, 7, 4],
      [0, 6, 4, 4],
      [5, 5, 6, 5],
      [12, 5, 4, 5],
      [0, 11, 6, 5],
      [7, 11, 8, 5],
    ];
    for (const [x, y, w, h] of stones) {
      p.rect(x, y, w, h, MID);
      p.rect(x, y, w, 1, LIGHT);
      p.rect(x, y + h - 1, w, 1, DARK);
      if (r() < 0.4) p.px(x + 1 + Math.floor(r() * (w - 2)), y + 2, DARK);
    }
  },
  [T.COBBLE2]: (p, r) => {
    G[T.COBBLE](p, r);
    p.line(3, 2, 9, 9, BLACK);
    p.dither(9, 9, 6, 6, DARK, 0.5);
  },
  [T.PLAZA]: (p, r) => {
    // big worn flagstones, irregular, with dark joints
    fill(p, BLACK);
    const stones = [
      [0, 0, 9, 7],
      [10, 0, 6, 10],
      [0, 8, 5, 8],
      [6, 8, 3, 8],
      [10, 11, 6, 5],
    ];
    for (const [x, y, w, h] of stones) {
      p.rect(x, y, w, h, DARK);
      p.dither(x, y, w, h, MID, 0.45 + r() * 0.2);
      p.rect(x, y, w, 1, MID);
      p.rect(x, y, 1, h, MID);
      if (r() < 0.5) p.px(x + 1 + Math.floor(r() * (w - 2)), y + 1 + Math.floor(r() * (h - 2)), LIGHT);
    }
    if (r() < 0.4) p.line(2, 2, 6, 5, BLACK);
  },
  [T.SAND]: (p, r) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 16, MID, 0.3);
    speck(p, r, 4, DARK);
  },
  [T.SAND2]: (p, r) => {
    G[T.SAND](p, r);
    p.ellipse(8, 9, 2, 1, WHITE);
    p.line(7, 9, 9, 9, MID);
  },
  [T.WETSAND]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.35);
    speck(p, r, 6, WHITE);
    p.dither(0, 0, 16, 16, DARK, 0.1);
  },
  [T.WATER]: (p) => fill(p, DARK),
  [T.DOCK]: (p) => plank(p, false, MID),
  [T.DOCK_V]: (p) => plank(p, true, MID),
  [T.SOIL]: (p, r) => {
    fill(p, DARK);
    for (let y = 1; y < 16; y += 4) {
      p.rect(0, y, 16, 2, BLACK);
      p.rect(0, y + 2, 16, 1, MID);
    }
    speck(p, r, 4, MID);
  },
  [T.CORN]: (p, r) => {
    G[T.SOIL](p, r);
    for (const x of [3, 8, 13]) {
      p.rect(x, 1, 1, 15, MID);
      for (let y = 3; y < 15; y += 3) {
        p.line(x, y, x - 3, y + 2, y % 2 ? LIGHT : MID);
        p.line(x, y + 1, x + 3, y + 3, MID);
      }
      p.rect(x - 1, 1, 2, 3, LIGHT);
      p.px(x, 0, WHITE);
    }
    p.dither(0, 12, 16, 4, BLACK, 0.4);
  },
  [T.HAYDIRT]: (p, r) => {
    G[T.DIRT](p, r);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 13);
      const y = Math.floor(r() * 15);
      p.line(x, y, x + 3, y + (r() < 0.5 ? 1 : -1), LIGHT);
    }
  },
  [T.WOOD]: (p) => plank(p, false, MID),
  [T.WOOD2]: (p) => plank(p, false, DARK),
  [T.CHECKER]: (p) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) p.rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? MID : LIGHT);
    p.rect(0, 0, 16, 1, DARK);
    p.rect(0, 0, 1, 16, DARK);
  },
  [T.CARPET]: (p) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, BLACK, 0.3);
    p.ring(8, 8, 5, 5, MID);
    p.px(8, 8, LIGHT);
    for (const [x, y] of [
      [0, 0],
      [15, 0],
      [0, 15],
      [15, 15],
    ])
      p.px(x, y, MID);
  },
  [T.STONE]: (p, r) => {
    fill(p, DARK);
    p.rect(0, 0, 16, 1, BLACK);
    p.rect(0, 0, 1, 16, BLACK);
    p.rect(1, 1, 15, 1, MID);
    speck(p, r, 4, MID);
    p.dither(8, 8, 8, 8, BLACK, 0.2);
  },
  [T.BATHTILE]: (p) => {
    fill(p, LIGHT);
    for (let i = 0; i < 16; i += 4) {
      p.rect(i, 0, 1, 16, MID);
      p.rect(0, i, 16, 1, MID);
    }
    p.px(2, 2, WHITE);
    p.px(10, 6, WHITE);
  },
  [T.WALL]: (p) => {
    fill(p, BLACK);
    p.rect(0, 10, 16, 6, DARK);
    p.rect(0, 10, 16, 1, MID);
    for (let x = 0; x < 16; x += 8) p.rect(x, 11, 1, 5, BLACK);
  },
  [T.WALL_LOW]: (p) => wallFace(p, MID, DARK, DARK),
  [T.WALLM]: (p) => {
    fill(p, BLACK);
    p.rect(0, 11, 16, 5, DARK);
    p.dither(0, 11, 16, 5, BLACK, 0.4);
    p.rect(0, 11, 16, 1, MID);
  },
  [T.WALLM_LOW]: (p) => {
    fill(p, DARK);
    for (let y = 0; y < 11; y += 5)
      for (let x = 0; x < 16; x += 6) {
        p.px(x + 2, y + 1, MID);
        p.px(x + 1, y + 2, MID);
        p.px(x + 3, y + 2, MID);
        p.px(x + 2, y + 3, MID);
      }
    p.dither(10, 0, 6, 11, BLACK, 0.5); // peeling paper
    p.rect(0, 11, 16, 5, BLACK);
    p.rect(0, 11, 16, 1, MID);
    p.rect(0, 13, 16, 1, DARK);
  },
  [T.WALLC]: (p) => {
    fill(p, DARK);
    for (let y = 0; y < 16; y += 4) {
      p.rect(0, y, 16, 1, BLACK);
      for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) p.rect(x, y, 1, 4, BLACK);
    }
    p.dither(0, 0, 16, 16, MID, 0.12);
  },
  [T.WALLS]: (p) => {
    fill(p, DARK);
    p.rect(0, 10, 16, 6, MID);
    p.rect(0, 10, 16, 1, LIGHT);
  },
  [T.WALLS_LOW]: (p) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 10, MID, 0.2);
    p.rect(0, 10, 16, 2, MID);
    p.rect(0, 12, 16, 4, DARK);
    p.rect(0, 15, 16, 1, BLACK);
  },
  [T.CAVE]: (p, r) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, BLACK, 0.4);
    speck(p, r, 5, MID);
    p.ellipse(4 + Math.floor(r() * 8), 5 + Math.floor(r() * 6), 1, 1, MID);
  },
  [T.CAVE2]: (p, r) => {
    G[T.CAVE](p, r);
    p.ellipse(8, 9, 4, 2, BLACK);
    p.line(6, 8, 9, 8, MID);
  },
  [T.CAVEWALL]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.55);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 14);
      const y = Math.floor(r() * 12);
      p.line(x, y, x + 2, y + 3, LIGHT);
      p.line(x + 1, y, x + 3, y + 3, BLACK);
    }
    p.rect(0, 14, 16, 2, BLACK);
    p.rect(0, 0, 16, 1, LIGHT);
  },
  [T.CAVEWALL_TOP]: (p, r) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 16, DARK, 0.25);
    speck(p, r, 3, MID);
  },
  [T.CONCRETE]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.25);
    speck(p, r, 5, LIGHT);
    if (r() < 0.6) p.line(Math.floor(r() * 8), 0, 8 + Math.floor(r() * 8), 15, DARK);
  },
  [T.CONCRETE2]: (p, r) => {
    G[T.CONCRETE](p, r);
    p.ellipse(8, 8, 5, 3, DARK);
    p.dither(3, 5, 10, 6, BLACK, 0.3);
  },
  [T.WELLFLOOR]: (p, r) => {
    fill(p, DARK);
    for (let i = 0; i < 6; i++) p.ellipse(Math.floor(r() * 16), Math.floor(r() * 16), 2, 1, MID);
    p.dither(0, 0, 16, 16, BLACK, 0.3);
    speck(p, r, 3, LIGHT);
  },
  [T.WELLWALL]: (p) => {
    fill(p, DARK);
    for (let y = 0; y < 16; y += 4) {
      p.rect(0, y, 16, 1, BLACK);
      for (let x = (y / 4) % 2 ? 3 : 0; x < 16; x += 6) p.rect(x, y, 1, 4, BLACK);
      p.rect(0, y + 1, 16, 1, MID);
    }
    p.dither(0, 0, 16, 16, BLACK, 0.2);
  },
  [T.PUDDLE]: (p, r) => {
    G[T.WELLFLOOR](p, r);
    p.ellipse(8, 9, 5, 3, BLACK);
    p.line(5, 8, 8, 8, LIGHT);
    p.px(10, 10, MID);
  },
  [T.MAT]: (p) => {
    fill(p, BLACK);
    p.rect(2, 3, 12, 10, DARK);
    p.frame(2, 3, 12, 10, MID);
    for (let x = 3; x < 14; x += 2) {
      p.px(x, 2, MID);
      p.px(x, 13, MID);
    }
  },
  [T.STAIRS_UP]: (p) => {
    fill(p, BLACK);
    for (let i = 0; i < 4; i++) {
      p.rect(0, 12 - i * 4, 16, 3, [MID, MID, DARK, DARK][i]);
      p.rect(0, 12 - i * 4, 16, 1, LIGHT);
    }
  },
  [T.STAIRS_DOWN]: (p) => {
    fill(p, BLACK);
    for (let i = 0; i < 4; i++) {
      p.rect(0, i * 4, 16, 3, [MID, DARK, DARK, BLACK][i]);
      p.rect(0, i * 4, 16, 1, i < 2 ? LIGHT : MID);
    }
  },
  [T.HEDGE]: (p, r) => {
    fill(p, BLACK);
    for (let i = 0; i < 14; i++) p.circle(Math.floor(r() * 16), Math.floor(r() * 14), 2, r() < 0.5 ? DARK : MID);
    speck(p, r, 6, LIGHT, 0, 0, 16, 8);
    p.rect(0, 14, 16, 2, BLACK);
  },
  [T.GRAVEL]: (p, r) => {
    fill(p, MID);
    for (let i = 0; i < 20; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? LIGHT : DARK);
  },
  [T.ROCKWALL]: (p, r) => {
    G[T.CAVEWALL](p, r);
  },
  [T.LADDER]: (p, r) => {
    G[T.CAVE](p, r);
    p.rect(4, 0, 1, 16, LIGHT);
    p.rect(11, 0, 1, 16, LIGHT);
    for (let y = 2; y < 16; y += 4) p.rect(4, y, 8, 1, MID);
  },
  [T.SHELFWALL]: (p, r) => {
    fill(p, BLACK);
    p.rect(0, 0, 1, 16, MID);
    p.rect(15, 0, 1, 16, DARK);
    for (const y of [4, 10, 15]) {
      p.rect(0, y, 16, 1, MID);
      p.px(Math.floor(r() * 16), y, DARK); // rust
    }
    // junk on the shelves
    for (const y of [0, 6, 11]) {
      let x = 1;
      while (x < 14) {
        const w = 1 + Math.floor(r() * 3);
        const h = 2 + Math.floor(r() * 2);
        if (r() < 0.75) {
          p.rect(x, y + 4 - h, w, h, r() < 0.5 ? DARK : MID);
          p.px(x, y + 4 - h, LIGHT);
        }
        x += w + 1;
      }
    }
  },
  [T.DOORI]: (p) => {
    fill(p, BLACK);
    p.rect(3, 1, 10, 15, DARK);
    p.frame(3, 1, 10, 15, MID);
    p.rect(5, 3, 6, 5, BLACK);
    p.px(11, 9, LIGHT);
  },
};

// ------------------------------------------------------------------ deco

const ell = (p: PC, x: number, y: number, rx: number, ry: number, c: number) => p.ellipse(x, y, rx, ry, c);

const DC: Record<number, Painter> = {
  [D.FENCE_H]: (p) => {
    p.rect(0, 5, 16, 2, MID);
    p.rect(0, 10, 16, 2, MID);
    p.rect(0, 7, 16, 1, DARK);
    p.rect(0, 12, 16, 1, DARK);
    p.rect(2, 3, 2, 11, LIGHT);
    p.rect(12, 3, 2, 11, LIGHT);
    p.rect(3, 4, 1, 10, MID);
    p.outline(BLACK);
  },
  [D.FENCE_V]: (p) => {
    p.rect(6, 0, 3, 16, MID);
    p.rect(6, 0, 1, 16, LIGHT);
    p.rect(8, 0, 1, 16, DARK);
    p.outline(BLACK);
  },
  [D.FENCE_POST]: (p) => {
    p.rect(5, 2, 5, 12, MID);
    p.rect(5, 2, 5, 1, LIGHT);
    p.rect(9, 3, 1, 11, DARK);
    p.outline(BLACK);
  },
  [D.FENCE_BROKEN]: (p) => {
    p.rect(0, 5, 5, 2, MID);
    p.line(5, 6, 8, 9, MID);
    p.rect(11, 10, 5, 2, MID);
    p.line(10, 10, 7, 13, MID);
    p.rect(2, 3, 2, 11, LIGHT);
    p.line(13, 4, 14, 13, LIGHT);
    p.px(9, 4, LIGHT);
    p.px(6, 12, LIGHT);
    p.outline(BLACK);
  },
  [D.GRAVE]: (p) => {
    p.rect(4, 5, 8, 9, MID);
    ell(p, 8, 5, 4, 3, MID);
    p.rect(4, 5, 2, 9, LIGHT);
    p.line(6, 7, 10, 7, DARK);
    p.line(8, 6, 8, 10, DARK);
    p.rect(3, 14, 10, 1, DARK);
    p.outline(BLACK);
  },
  [D.TOMBSTONE2]: (p) => {
    p.rect(7, 2, 2, 12, MID);
    p.rect(4, 5, 8, 2, MID);
    p.px(7, 2, LIGHT);
    p.rect(5, 14, 6, 1, DARK);
    p.outline(BLACK);
  },
  [D.SKULLPILE]: (p) => {
    for (const [x, y] of [
      [5, 11],
      [11, 11],
      [8, 7],
    ]) {
      ell(p, x, y, 3, 3, LIGHT);
      p.px(x - 1, y, BLACK);
      p.px(x + 1, y, BLACK);
    }
    p.outline(BLACK);
  },
  [D.BARREL]: (p) => {
    ell(p, 8, 9, 6, 6, MID);
    p.shade((x) => (x < 7 ? 0.8 : 0.35), [DARK, MID, LIGHT]);
    p.rect(2, 5, 13, 1, BLACK);
    p.rect(2, 12, 13, 1, BLACK);
    ell(p, 8, 3, 5, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.CRATE]: (p) => {
    p.rect(2, 3, 12, 12, MID);
    p.frame(2, 3, 12, 12, DARK);
    p.line(3, 4, 12, 13, DARK);
    p.rect(2, 3, 12, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.HAY]: (p, r) => {
    p.rect(1, 4, 14, 11, LIGHT);
    for (let i = 0; i < 18; i++) p.px(1 + Math.floor(r() * 14), 4 + Math.floor(r() * 11), MID);
    p.rect(1, 8, 14, 1, DARK);
    p.rect(1, 12, 14, 1, DARK);
    p.outline(BLACK);
  },
  [D.TROUGH]: (p) => {
    p.rect(1, 7, 14, 6, MID);
    p.rect(2, 8, 12, 3, BLACK);
    p.rect(1, 7, 14, 1, LIGHT);
    p.rect(2, 13, 2, 2, DARK);
    p.rect(12, 13, 2, 2, DARK);
    p.outline(BLACK);
  },
  [D.TROUGH_FULL]: (p, r) => {
    DC[D.TROUGH](p, r);
    for (let x = 3; x < 13; x += 2) p.px(x, 9, LIGHT);
  },
  [D.SIGN]: (p) => {
    p.rect(7, 8, 2, 8, DARK);
    p.rect(2, 2, 12, 7, MID);
    p.rect(2, 2, 12, 1, LIGHT);
    p.line(4, 5, 11, 5, DARK);
    p.line(4, 7, 9, 7, DARK);
    p.outline(BLACK);
  },
  [D.STUMP]: (p) => {
    ell(p, 8, 10, 6, 4, DARK);
    ell(p, 8, 8, 5, 3, MID);
    p.ring(8, 8, 2, 1, DARK);
    p.outline(BLACK);
  },
  [D.ROCK]: (p) => {
    ell(p, 8, 10, 7, 5, MID);
    p.shade((x, y) => 0.9 - x / 20 - y / 30, [DARK, MID, LIGHT]);
    p.outline(BLACK);
  },
  [D.BUSH]: (p, r) => {
    for (let i = 0; i < 7; i++) p.circle(3 + Math.floor(r() * 10), 6 + Math.floor(r() * 7), 3, r() < 0.5 ? DARK : MID);
    p.outline(BLACK);
  },
  [D.PUMPKIN]: (p) => {
    ell(p, 8, 10, 6, 5, MID);
    p.shade((x) => (x < 7 ? 0.8 : 0.4), [DARK, MID, LIGHT]);
    p.line(5, 6, 5, 14, DARK);
    p.line(11, 6, 11, 14, DARK);
    p.rect(7, 3, 2, 3, DARK);
    p.px(6, 9, WHITE);
    p.px(10, 9, WHITE);
    p.line(6, 12, 10, 12, WHITE);
    p.outline(BLACK);
  },
  [D.REEDS]: (p) => {
    for (const x of [3, 6, 9, 12]) {
      p.line(x, 15, x + 1, 4, MID);
      p.rect(x + 1, 3, 1, 3, DARK);
    }
  },
  [D.BENCH]: (p) => {
    p.rect(1, 6, 14, 2, MID);
    p.rect(1, 9, 14, 2, MID);
    p.rect(1, 6, 14, 1, LIGHT);
    p.rect(2, 11, 2, 4, DARK);
    p.rect(12, 11, 2, 4, DARK);
    p.outline(BLACK);
  },
  [D.TABLE_L]: (p) => {
    p.rect(1, 5, 15, 7, MID);
    p.rect(1, 5, 15, 1, LIGHT);
    p.rect(2, 12, 2, 3, DARK);
    p.outline(BLACK);
  },
  [D.TABLE_R]: (p) => {
    p.rect(0, 5, 15, 7, MID);
    p.rect(0, 5, 15, 1, LIGHT);
    p.rect(12, 12, 2, 3, DARK);
    p.outline(BLACK);
  },
  [D.TABLE_ROUND]: (p) => {
    ell(p, 8, 8, 7, 5, MID);
    ell(p, 7, 7, 5, 3, LIGHT);
    p.rect(7, 12, 2, 3, DARK);
    p.outline(BLACK);
  },
  [D.CHAIR]: (p) => {
    p.rect(4, 2, 8, 6, MID);
    p.rect(4, 8, 8, 3, LIGHT);
    p.rect(4, 11, 1, 4, DARK);
    p.rect(11, 11, 1, 4, DARK);
    p.outline(BLACK);
  },
  [D.BED_T]: (p) => {
    p.rect(1, 2, 14, 14, DARK);
    p.rect(2, 4, 12, 5, WHITE);
    p.rect(2, 9, 12, 7, LIGHT);
    p.rect(1, 2, 14, 2, MID);
    p.outline(BLACK);
  },
  [D.BED_B]: (p) => {
    p.rect(1, 0, 14, 13, LIGHT);
    p.dither(1, 0, 14, 13, MID, 0.25);
    p.rect(1, 13, 14, 2, DARK);
    p.outline(BLACK);
  },
  [D.BOOK_T]: (p, r) => {
    p.rect(0, 0, 16, 16, DARK);
    p.rect(0, 7, 16, 1, BLACK);
    for (let x = 1; x < 15; x += 2) {
      p.rect(x, 1 + Math.floor(r() * 2), 1, 6, r() < 0.5 ? MID : LIGHT);
      p.rect(x, 8 + Math.floor(r() * 2), 1, 7, r() < 0.5 ? MID : LIGHT);
    }
    p.frame(0, 0, 16, 16, BLACK);
  },
  [D.BOOK_B]: (p, r) => {
    DC[D.BOOK_T](p, r);
    p.rect(0, 13, 16, 3, BLACK);
  },
  [D.CABINET]: (p) => {
    p.rect(2, 2, 12, 13, MID);
    p.rect(2, 8, 12, 1, DARK);
    p.px(7, 5, LIGHT);
    p.px(7, 11, LIGHT);
    p.rect(2, 2, 12, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.STOVE]: (p) => {
    p.rect(1, 3, 14, 12, DARK);
    p.rect(1, 3, 14, 3, MID);
    p.ring(5, 4, 2, 1, BLACK);
    p.ring(11, 4, 2, 1, BLACK);
    p.rect(3, 8, 10, 5, BLACK);
    p.rect(4, 9, 8, 1, MID);
    p.outline(BLACK);
  },
  [D.SINK]: (p) => {
    p.rect(1, 5, 14, 10, LIGHT);
    ell(p, 8, 8, 5, 2, MID);
    p.rect(7, 2, 2, 4, MID);
    p.outline(BLACK);
  },
  [D.FRIDGE_T]: (p) => {
    p.rect(2, 1, 12, 15, LIGHT);
    p.rect(12, 5, 1, 6, MID);
    p.rect(2, 1, 12, 1, WHITE);
    p.outline(BLACK);
  },
  [D.FRIDGE_B]: (p) => {
    p.rect(2, 0, 12, 15, LIGHT);
    p.rect(2, 0, 12, 1, MID);
    p.rect(12, 3, 1, 5, MID);
    p.outline(BLACK);
  },
  [D.PLANT]: (p) => {
    p.rect(5, 10, 6, 5, MID);
    p.rect(5, 10, 6, 1, LIGHT);
    p.line(8, 10, 5, 3, DARK);
    p.line(8, 10, 11, 4, DARK);
    p.line(8, 10, 8, 2, DARK);
    p.px(5, 3, MID);
    p.px(11, 4, MID);
    p.outline(BLACK);
  },
  [D.CANDLE]: (p) => {
    p.rect(7, 7, 2, 7, LIGHT);
    p.rect(5, 14, 6, 1, MID);
    ell(p, 8, 5, 1, 2, WHITE);
    p.px(8, 2, LIGHT);
    p.outline(BLACK);
  },
  [D.RUG]: (p) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.25);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 15, 16, 1, MID);
    p.px(8, 8, LIGHT);
    p.ring(8, 8, 3, 3, MID);
  },
  [D.STAR_RUG]: (p) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 16, DARK, 0.5);
    p.line(8, 2, 8, 14, MID);
    p.line(2, 8, 14, 8, MID);
    p.line(4, 4, 12, 12, DARK);
    p.line(12, 4, 4, 12, DARK);
    p.px(8, 8, WHITE);
  },
  [D.COUNTER]: (p) => {
    p.rect(0, 3, 16, 12, MID);
    p.rect(0, 3, 16, 3, LIGHT);
    p.rect(0, 6, 16, 1, DARK);
    p.rect(0, 14, 16, 1, DARK);
    p.outline(BLACK);
  },
  [D.REGISTER]: (p, r) => {
    DC[D.COUNTER](p, r);
    p.rect(4, 0, 8, 5, DARK);
    p.rect(5, 1, 6, 2, LIGHT);
  },
  [D.TOILET]: (p) => {
    p.rect(4, 1, 8, 5, LIGHT);
    ell(p, 8, 10, 5, 4, WHITE);
    ell(p, 8, 10, 3, 2, MID);
    p.rect(4, 1, 8, 1, WHITE);
    p.outline(BLACK);
  },
  [D.STALL]: (p) => {
    p.rect(6, 0, 4, 16, MID);
    p.rect(6, 0, 1, 16, LIGHT);
    p.outline(BLACK);
  },
  [D.ROTTEN]: (p, r) => {
    for (let i = 0; i < 6; i++) ell(p, 3 + Math.floor(r() * 10), 8 + Math.floor(r() * 5), 3, 2, r() < 0.5 ? DARK : MID);
    p.dither(0, 6, 16, 9, BLACK, 0.3);
    for (let i = 0; i < 3; i++) p.px(3 + Math.floor(r() * 10), 1 + Math.floor(r() * 5), LIGHT); // flies
    p.outline(BLACK);
  },
  [D.SHELF_T]: (p, r) => {
    p.rect(0, 0, 16, 16, DARK);
    for (const y of [1, 8]) {
      let x = 1;
      while (x < 15) {
        const w = 2 + Math.floor(r() * 2);
        p.rect(x, y, w, 6, r() < 0.5 ? LIGHT : MID);
        p.rect(x, y, w, 1, WHITE);
        x += w + 1;
      }
    }
    p.rect(0, 7, 16, 1, BLACK);
    p.outline(BLACK);
  },
  [D.SHELF_B]: (p, r) => {
    DC[D.SHELF_T](p, r);
    p.rect(0, 14, 16, 2, BLACK);
  },
  [D.PAINTING]: (p) => {
    p.rect(3, 1, 10, 9, MID);
    p.rect(4, 2, 8, 7, DARK);
    ell(p, 8, 5, 2, 2, LIGHT);
    p.rect(6, 7, 4, 2, LIGHT);
    p.px(7, 5, BLACK);
    p.px(9, 5, BLACK);
    p.outline(BLACK);
  },
  [D.WINDOW]: (p) => {
    p.rect(3, 1, 10, 9, DARK);
    p.rect(4, 2, 8, 7, BLACK);
    p.line(8, 2, 8, 8, DARK);
    p.line(4, 5, 11, 5, DARK);
    p.circle(10, 3, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.MIRROR]: (p) => {
    ell(p, 8, 5, 4, 5, MID);
    ell(p, 8, 5, 3, 4, LIGHT);
    p.line(6, 3, 7, 2, WHITE);
    p.outline(BLACK);
  },
  [D.POSTER]: (p) => {
    p.rect(4, 1, 8, 10, LIGHT);
    p.line(5, 3, 10, 3, DARK);
    p.rect(6, 5, 4, 4, MID);
    p.outline(BLACK);
  },
  [D.DIAL_CLOCK]: (p) => {
    p.circle(8, 5, 4, LIGHT);
    p.ring(8, 5, 4, 4, DARK);
    p.line(8, 5, 8, 2, BLACK);
    p.line(8, 5, 10, 6, BLACK);
    p.outline(BLACK);
  },
  [D.CURTAIN]: (p) => {
    p.rect(2, 0, 12, 13, DARK);
    for (let x = 3; x < 14; x += 3) p.rect(x, 0, 1, 13, MID);
    p.rect(2, 0, 12, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.FLAG]: (p) => {
    p.rect(7, 0, 1, 12, LIGHT);
    p.rect(8, 1, 6, 5, MID);
    p.px(10, 3, WHITE);
    p.outline(BLACK);
  },
  [D.FIREPLACE_L]: (p) => {
    p.rect(1, 0, 15, 16, DARK);
    p.rect(1, 0, 15, 2, MID);
    p.rect(5, 5, 11, 11, BLACK);
    ell(p, 12, 12, 3, 3, LIGHT);
    ell(p, 12, 13, 2, 2, WHITE);
    p.outline(BLACK);
  },
  [D.FIREPLACE_R]: (p) => {
    p.rect(0, 0, 15, 16, DARK);
    p.rect(0, 0, 15, 2, MID);
    p.rect(0, 5, 11, 11, BLACK);
    ell(p, 3, 11, 3, 4, LIGHT);
    ell(p, 3, 12, 2, 3, WHITE);
    p.line(0, 15, 8, 15, MID);
    p.outline(BLACK);
  },
  [D.DESK_L]: (p) => {
    p.rect(1, 4, 15, 11, DARK);
    p.rect(1, 4, 15, 2, MID);
    p.rect(4, 2, 5, 3, WHITE); // papers
    p.rect(3, 8, 6, 6, MID);
    p.px(5, 10, LIGHT);
    p.outline(BLACK);
  },
  [D.DESK_R]: (p) => {
    p.rect(0, 4, 15, 11, DARK);
    p.rect(0, 4, 15, 2, MID);
    p.rect(8, 1, 2, 4, LIGHT); // inkwell + quill
    p.line(10, 0, 13, 3, WHITE);
    p.rect(7, 8, 6, 6, MID);
    p.outline(BLACK);
  },
  [D.FILE]: (p) => {
    p.rect(3, 1, 10, 14, MID);
    for (const y of [5, 10]) p.rect(3, y, 10, 1, DARK);
    for (const y of [3, 7, 12]) p.rect(6, y, 4, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.DOGBED]: (p) => {
    ell(p, 8, 10, 7, 5, MID);
    ell(p, 8, 10, 5, 3, LIGHT);
    p.rect(5, 9, 3, 2, WHITE); // a chew toy
    p.outline(BLACK);
  },
  [D.CRYSTAL]: (p) => {
    p.poly(
      [
        [4, 14],
        [6, 4],
        [8, 14],
      ],
      LIGHT
    );
    p.poly(
      [
        [7, 14],
        [10, 1],
        [12, 14],
      ],
      WHITE
    );
    p.poly(
      [
        [10, 14],
        [13, 7],
        [14, 14],
      ],
      MID
    );
    p.rect(3, 14, 12, 1, DARK);
    p.outline(BLACK);
  },
  [D.BALLTABLE]: (p) => {
    p.rect(1, 9, 14, 5, DARK);
    p.rect(1, 9, 14, 1, MID);
    for (let x = 1; x < 15; x += 3) p.px(x, 13, LIGHT); // tassels
    p.circle(8, 6, 4, LIGHT);
    p.circle(8, 6, 3, WHITE);
    p.px(6, 4, WHITE);
    p.dither(7, 5, 4, 4, MID, 0.3);
    p.outline(BLACK);
  },
  [D.COFFIN_T]: (p) => {
    p.poly(
      [
        [4, 2],
        [12, 2],
        [14, 9],
        [12, 16],
        [4, 16],
        [2, 9],
      ],
      DARK
    );
    p.line(8, 5, 8, 12, MID);
    p.line(6, 7, 10, 7, MID);
    p.outline(BLACK);
  },
  [D.COFFIN_B]: (p) => {
    p.poly(
      [
        [4, 0],
        [12, 0],
        [11, 14],
        [5, 14],
      ],
      DARK
    );
    p.line(5, 0, 5, 13, MID);
    p.outline(BLACK);
  },
  [D.PIANO_L]: (p) => {
    p.rect(1, 1, 15, 14, BLACK);
    p.rect(2, 2, 14, 6, DARK);
    p.rect(1, 9, 15, 3, WHITE);
    for (let x = 2; x < 16; x += 2) p.rect(x, 9, 1, 2, BLACK);
    p.outline(BLACK);
  },
  [D.PIANO_R]: (p) => {
    p.rect(0, 1, 15, 14, BLACK);
    p.rect(0, 2, 14, 6, DARK);
    p.rect(0, 9, 15, 3, WHITE);
    for (let x = 1; x < 14; x += 2) p.rect(x, 9, 1, 2, BLACK);
    p.rect(9, 3, 4, 3, LIGHT); // sheet music
    p.outline(BLACK);
  },
  [D.ARMOR]: (p) => {
    p.circle(8, 3, 2, LIGHT);
    p.rect(5, 5, 6, 6, MID);
    p.rect(6, 11, 1, 4, MID);
    p.rect(9, 11, 1, 4, MID);
    p.line(12, 1, 12, 14, LIGHT); // halberd
    p.px(7, 3, BLACK);
    p.px(9, 3, BLACK);
    p.rect(6, 6, 2, 3, LIGHT);
    p.outline(BLACK);
  },
  [D.STALAG]: (p) => {
    p.poly(
      [
        [3, 15],
        [7, 2],
        [11, 15],
      ],
      MID
    );
    p.poly(
      [
        [9, 15],
        [12, 7],
        [14, 15],
      ],
      DARK
    );
    p.line(6, 5, 5, 13, LIGHT);
    p.outline(BLACK);
  },
  [D.BONES]: (p) => {
    p.line(3, 12, 12, 7, LIGHT);
    p.circle(3, 12, 1, LIGHT);
    p.circle(12, 7, 1, LIGHT);
    ell(p, 10, 12, 2, 2, LIGHT);
    p.px(9, 12, BLACK);
    p.px(11, 12, BLACK);
  },
  [D.GLOWROCK]: (p) => {
    ell(p, 8, 11, 6, 4, DARK);
    p.poly(
      [
        [5, 11],
        [7, 3],
        [9, 11],
      ],
      WHITE
    );
    p.poly(
      [
        [8, 12],
        [11, 6],
        [12, 12],
      ],
      LIGHT
    );
    p.outline(BLACK);
  },
  [D.BROKENBOX]: (p) => {
    p.poly(
      [
        [2, 6],
        [13, 4],
        [14, 15],
        [3, 15],
      ],
      MID
    );
    p.line(3, 8, 13, 11, DARK);
    p.line(8, 4, 6, 10, BLACK);
    p.outline(BLACK);
  },
  [D.CANS]: (p) => {
    for (const [x, y] of [
      [4, 10],
      [9, 11],
      [7, 6],
      [12, 7],
    ]) {
      p.rect(x - 2, y - 3, 4, 5, MID);
      p.rect(x - 2, y - 3, 4, 1, LIGHT);
      p.rect(x - 2, y - 1, 4, 1, DARK);
    }
    p.outline(BLACK);
  },
  [D.BUCKET]: (p) => {
    p.poly(
      [
        [3, 6],
        [13, 6],
        [11, 15],
        [5, 15],
      ],
      MID
    );
    ell(p, 8, 6, 5, 2, DARK);
    p.ring(8, 4, 5, 3, LIGHT);
    p.outline(BLACK);
  },
  [D.PLANKS]: (p) => {
    for (const y of [5, 8, 11]) {
      p.rect(1, y, 14, 2, MID);
      p.rect(1, y, 14, 1, LIGHT);
    }
    p.outline(BLACK);
  },
  [D.FEEDSACK]: (p) => {
    ell(p, 8, 10, 6, 5, LIGHT);
    p.rect(6, 3, 4, 3, MID);
    p.line(5, 9, 11, 9, MID);
    p.outline(BLACK);
  },
  [D.NET]: (p) => {
    for (let i = 0; i < 16; i += 3) {
      p.line(i, 1, i + 4, 15, MID);
      p.line(i + 4, 1, i, 15, MID);
    }
    p.rect(0, 0, 16, 1, LIGHT);
  },
  [D.FISHRACK]: (p) => {
    p.rect(1, 3, 14, 1, MID);
    p.rect(2, 3, 1, 12, DARK);
    p.rect(13, 3, 1, 12, DARK);
    for (const x of [4, 8, 11]) {
      ell(p, x, 8, 1, 3, LIGHT);
      p.px(x, 12, MID);
    }
    p.outline(BLACK);
  },
  [D.CLOCK_SMALL]: (p) => {
    p.rect(4, 2, 8, 12, DARK);
    p.circle(8, 6, 3, LIGHT);
    p.px(8, 5, BLACK);
    p.px(9, 6, BLACK);
    p.outline(BLACK);
  },
  [D.SPOONS]: (p) => {
    p.rect(1, 1, 14, 14, DARK);
    for (const x of [3, 6, 9, 12]) {
      ell(p, x, 4, 1, 2, WHITE);
      p.rect(x, 6, 1, 7, LIGHT);
    }
    p.outline(BLACK);
  },
  [D.SHRINE]: (p) => {
    p.rect(2, 6, 12, 9, DARK);
    p.rect(2, 6, 12, 1, MID);
    ell(p, 8, 4, 4, 2, LIGHT); // a dog bowl, enshrined
    ell(p, 8, 4, 2, 1, MID);
    p.px(3, 3, WHITE);
    p.px(13, 3, WHITE);
    p.outline(BLACK);
  },
  [D.POT]: (p) => {
    ell(p, 8, 10, 6, 4, DARK);
    ell(p, 8, 7, 6, 2, MID);
    ell(p, 8, 7, 4, 1, BLACK);
    p.px(4, 4, LIGHT);
    p.px(11, 3, LIGHT); // steam
    p.outline(BLACK);
  },
  [D.CAULDRON]: (p) => {
    ell(p, 8, 10, 7, 5, BLACK);
    ell(p, 8, 7, 6, 2, LIGHT);
    p.dither(3, 6, 10, 3, WHITE, 0.4);
    p.circle(6, 3, 1, LIGHT);
    p.circle(10, 2, 1, MID);
    p.outline(BLACK);
  },
  [D.CHANDELIER]: (p) => {
    p.rect(7, 0, 1, 6, MID);
    ell(p, 8, 7, 6, 2, MID);
    for (const x of [3, 8, 13]) p.px(x, 4, WHITE);
  },
  [D.LANTERN_POST]: (p) => {
    p.rect(7, 4, 2, 12, DARK);
    p.rect(5, 0, 6, 5, MID);
    p.rect(6, 1, 4, 3, WHITE);
    p.outline(BLACK);
  },
  [D.CORPSE_FRIDGE]: (p) => {
    p.poly(
      [
        [3, 2],
        [13, 1],
        [14, 15],
        [2, 15],
      ],
      MID
    );
    p.line(3, 8, 14, 7, DARK);
    p.rect(4, 3, 4, 4, BLACK);
    p.px(5, 4, LIGHT);
    p.dither(2, 10, 12, 5, DARK, 0.4);
    p.outline(BLACK);
  },
  [D.MOP]: (p) => {
    p.line(5, 1, 10, 12, MID);
    for (let x = 7; x < 14; x++) p.line(10, 12, x, 15, LIGHT);
    p.outline(BLACK);
  },
  [D.TV]: (p) => {
    p.rect(1, 3, 14, 11, DARK);
    p.rect(3, 5, 10, 7, MID);
    p.dither(3, 5, 10, 7, LIGHT, 0.5); // static
    p.line(5, 0, 8, 3, MID);
    p.line(11, 0, 8, 3, MID);
    p.outline(BLACK);
  },
  [D.SOFA_L]: (p) => {
    p.rect(1, 3, 15, 11, MID);
    p.rect(1, 3, 3, 11, DARK);
    p.rect(4, 8, 12, 4, LIGHT);
    p.outline(BLACK);
  },
  [D.SOFA_R]: (p) => {
    p.rect(0, 3, 15, 11, MID);
    p.rect(12, 3, 3, 11, DARK);
    p.rect(0, 8, 12, 4, LIGHT);
    p.outline(BLACK);
  },
  [D.WARDROBE_T]: (p) => {
    p.rect(2, 0, 12, 16, DARK);
    p.rect(7, 0, 1, 16, BLACK);
    p.rect(2, 0, 12, 2, MID);
    p.outline(BLACK);
  },
  [D.WARDROBE_B]: (p) => {
    p.rect(2, 0, 12, 15, DARK);
    p.rect(7, 0, 1, 15, BLACK);
    p.px(6, 3, LIGHT);
    p.px(9, 3, LIGHT);
    p.outline(BLACK);
  },
  [D.SACK]: (p) => {
    ell(p, 8, 10, 6, 5, MID);
    p.rect(6, 3, 4, 3, DARK);
    p.dither(3, 7, 10, 7, DARK, 0.3);
    p.outline(BLACK);
  },
  [D.ROPE]: (p) => {
    p.ring(8, 9, 5, 4, LIGHT);
    p.ring(8, 9, 3, 2, MID);
    p.outline(BLACK);
  },
  [D.BOARDED]: (p) => {
    p.rect(1, 3, 14, 3, MID);
    p.rect(1, 9, 14, 3, MID);
    p.line(2, 2, 13, 13, LIGHT);
    p.outline(BLACK);
  },
};

export const TILE_COLS = 16;
export const TILE_SLOTS = 320;

/** Paint the whole tileset: slot index == tile id. */
export function tileset(): PC {
  const sheet = new PC(TILE_COLS * 16, (TILE_SLOTS / TILE_COLS) * 16);
  for (let id = 0; id < TILE_SLOTS; id++) {
    const painter = G[id] ?? DC[id] ?? G2[id] ?? DC2[id] ?? G3[id] ?? G4[id] ?? G5[id] ?? G_LAB_TILES[id];
    if (!painter) continue;
    const p = new PC(16, 16);
    painter(p, artRng(id * 131 + 7));
    sheet.blit(p, (id % TILE_COLS) * 16, Math.floor(id / TILE_COLS) * 16);
  }
  return sheet;
}

/** Tileable animated sea for under the map (several frames). */
export function seaTile(f: number): PC {
  const p = new PC(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const v =
        0.18 + 0.1 * Math.sin((x + f * 2) * ((Math.PI * 2) / 32) + Math.sin(y * ((Math.PI * 2) / 64)) * 2) * Math.sin(y * ((Math.PI * 2) / 16) + f * 0.5);
      p.px(x, y, bayer(x, y) < (v - 0.1) * 3 ? MID : bayer(x + 2, y + 1) < 0.5 ? DARK : BLACK);
    }
  // little crests
  const r = artRng(99 + f);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * 60);
    const y = Math.floor(r() * 62);
    p.line(x, y, x + 3, y, LIGHT);
    if (r() < 0.4) p.px(x + 1, y - 1, WHITE);
  }
  return p;
}
