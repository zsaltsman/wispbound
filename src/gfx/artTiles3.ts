import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { T } from '../world/tiles';

// World 3 tiles: Bacchus Key's boardwalks and promenades, the club's dance floor,
// carpet and bar, the clinic, the stage, the club's walls, and the spilt booze.

type Painter = (p: PC, r: () => number) => void;
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);
const speck = (p: PC, r: () => number, n: number, c: number) => {
  for (let i = 0; i < n; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), c);
};

export const G3: Record<number, Painter> = {
  [T.BOARDWALK]: (p, r) => {
    fill(p, MID);
    for (let y = 0; y < 16; y += 4) {
      p.rect(0, y, 16, 1, DARK);
      p.px(Math.floor(r() * 16), y + 2, LIGHT);
    }
    p.rect(Math.floor(r() * 12) + 2, 1, 1, 3, DARK);
  },
  [T.PROMENADE]: (p, r) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 16, MID, 0.12);
    // a diamond inlay, like a dance floor laid in the street
    p.poly([[8, 2], [14, 8], [8, 14], [2, 8]], MID);
    p.poly([[8, 5], [11, 8], [8, 11], [5, 8]], LIGHT);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 0, 1, 16, MID);
    speck(p, r, 2, WHITE);
  },
  [T.PROMENADE2]: (p, r) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 16, MID, 0.12);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 0, 1, 16, MID);
    for (let i = 0; i < 5; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? WHITE : DARK); // confetti
  },
  [T.CLUBFLOOR]: (p, r) => {
    fill(p, BLACK);
    const lit = r();
    p.rect(1, 1, 6, 6, lit < 0.3 ? WHITE : DARK);
    p.rect(9, 1, 6, 6, lit > 0.7 ? LIGHT : MID);
    p.rect(1, 9, 6, 6, lit > 0.5 ? MID : DARK);
    p.rect(9, 9, 6, 6, lit < 0.5 ? LIGHT : DARK);
  },
  [T.CLUBFLOOR2]: (p) => {
    fill(p, BLACK);
    p.rect(1, 1, 6, 6, MID);
    p.rect(9, 1, 6, 6, DARK);
    p.rect(1, 9, 6, 6, DARK);
    p.rect(9, 9, 6, 6, MID);
  },
  [T.CLUBCARPET]: (p) => {
    fill(p, DARK);
    for (let i = 0; i < 16; i += 8) {
      p.ring(i + 4, 4, 2, 2, MID);
      p.ring(i, 12, 2, 2, MID);
    }
  },
  [T.BARWOOD]: (p, r) => {
    fill(p, DARK);
    for (let y = 0; y < 16; y += 4) p.rect(0, y, 16, 1, BLACK);
    p.rect(Math.floor(r() * 14), 2, 2, 1, MID);
    p.rect(Math.floor(r() * 14), 10, 3, 1, MID);
  },
  [T.CLINICTILE]: (p, r) => {
    fill(p, WHITE);
    p.rect(0, 0, 16, 1, LIGHT);
    p.rect(0, 0, 1, 16, LIGHT);
    p.rect(0, 8, 16, 1, LIGHT);
    p.rect(8, 0, 1, 16, LIGHT);
    if (r() < 0.1) p.px(4, 4, MID);
  },
  [T.BOOZE]: (p, r) => {
    // a sheet of spilled booze: seamless from tile to tile, glossy, with slow ripples
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.18);
    // long, thin ripples running across the tile (they line up with the neighbours')
    for (const y of [3, 8, 13]) {
      const x0 = Math.floor(r() * 10);
      p.rect(x0, y, 3 + Math.floor(r() * 4), 1, LIGHT);
      if (r() < 0.5) p.rect((x0 + 9) % 16, y + 1, 2, 1, LIGHT);
    }
    // the odd glint of light on the surface, and a bubble
    if (r() < 0.6) p.px(Math.floor(r() * 16), Math.floor(r() * 16), WHITE);
    if (r() < 0.25) {
      const bx = 2 + Math.floor(r() * 12);
      const by = 2 + Math.floor(r() * 12);
      p.px(bx, by, LIGHT);
      p.px(bx + 1, by, WHITE);
    }
  },
  [T.STAGE]: (p, r) => {
    fill(p, MID);
    for (let x = 0; x < 16; x += 5) p.rect(x, 0, 1, 16, DARK);
    p.rect(0, 0, 16, 1, LIGHT);
    speck(p, r, 2, LIGHT);
  },
  [T.CLUBWALL]: (p) => {
    fill(p, BLACK);
    p.rect(0, 12, 16, 4, DARK);
    for (let x = 2; x < 16; x += 8) p.rect(x, 2, 1, 8, DARK);
  },
  [T.CLUBWALL_LOW]: (p) => {
    fill(p, DARK);
    p.rect(0, 0, 16, 2, MID);
    p.rect(0, 7, 16, 1, WHITE); // a strip of light along the wall
    p.rect(0, 14, 16, 2, BLACK);
  },
  [T.SANDLIT]: (p, r) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 16, WHITE, 0.15);
    speck(p, r, 4, MID);
  },
};
