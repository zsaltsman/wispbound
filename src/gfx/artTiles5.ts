import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { T, D } from '../world/tiles';

// The final world's tiles: THE REAPER'S PRISON. Worn flagstones and black brick in
// the cell block, a sticky chequered floor in the mess hall, scrubbed boards and
// painted walls in the guard quarters, cold polished stone in high security.

type Painter = (p: PC, r: () => number) => void;
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);
const speck = (p: PC, r: () => number, n: number, c: number) => {
  for (let i = 0; i < n; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), c);
};
const flags = (p: PC, r: () => number, base: number, edge: number, hi: number) => {
  fill(p, edge);
  const rows = [0, 5, 11, 16];
  for (let j = 0; j < 3; j++) {
    let x = j % 2 ? -4 : 0;
    while (x < 16) {
      const w = 5 + Math.floor(r() * 4);
      p.rect(x + 1, rows[j] + 1, w - 1, rows[j + 1] - rows[j] - 1, base);
      p.rect(x + 1, rows[j] + 1, w - 1, 1, hi);
      x += w;
    }
  }
};
const bricks = (p: PC, base: number, mortar: number, hi: number, bw = 8, bh = 4) => {
  fill(p, mortar);
  for (let y = 0; y < 16; y += bh)
    for (let x = (y / bh) % 2 ? -bw / 2 : 0; x < 16; x += bw) {
      p.rect(x + 1, y + 1, bw - 1, bh - 1, base);
      p.rect(x + 1, y + 1, bw - 1, 1, hi);
    }
};
/** The base of a wall face: a dark skirting line where it meets the floor. */
const skirt = (p: PC, c = BLACK, hi = MID) => {
  p.rect(0, 13, 16, 3, c);
  p.rect(0, 13, 16, 1, hi);
};
const bars = (p: PC, base: Painter, r: () => number, bent: boolean) => {
  base(p, r);
  p.rect(0, 0, 16, 2, DARK);
  p.rect(0, 0, 16, 1, LIGHT);
  for (const x of [1, 5, 9, 13]) {
    if (bent && (x === 5 || x === 9)) {
      // pulled apart: the two middle bars bowed out, a gap you can walk through
      const dx = x === 5 ? -1 : 1;
      for (let y = 2; y < 16; y++) {
        const bow = Math.round(Math.sin(((y - 2) / 13) * Math.PI) * 3) * dx;
        p.rect(x + bow, y, 2, 1, MID);
        p.px(x + bow, y, LIGHT);
      }
      continue;
    }
    if (bent && (x === 1 || x === 13)) {
      p.rect(x, 2, 2, 14, MID);
      p.rect(x, 2, 1, 14, LIGHT);
      continue;
    }
    p.rect(x, 2, 2, 14, MID);
    p.rect(x, 2, 1, 14, LIGHT);
  }
  if (!bent) {
    p.rect(0, 8, 16, 1, DARK);
    p.rect(0, 8, 16, 1, MID);
  }
};

const floor: Painter = (p, r) => {
  flags(p, r, DARK, BLACK, MID);
  speck(p, r, 3, MID);
};
const cell: Painter = (p, r) => {
  flags(p, r, DARK, BLACK, MID);
  if (r() < 0.4) p.rect(Math.floor(r() * 10), Math.floor(r() * 12), 4, 2, BLACK); // grime
  speck(p, r, 4, BLACK);
};

export const G5: Record<number, Painter> = {
  [T.W5_FLOOR]: floor,
  [T.W5_CELL]: cell,
  [T.W5_WALL]: (p) => {
    bricks(p, DARK, BLACK, MID, 8, 4);
  },
  [T.W5_WALL_LOW]: (p, r) => {
    bricks(p, DARK, BLACK, MID, 8, 4);
    if (r() < 0.3) p.rect(2 + Math.floor(r() * 10), 4, 1, 8, BLACK); // a damp streak
    skirt(p);
  },
  [T.W5_BARS]: (p, r) => bars(p, floor, r, false),
  [T.W5_BARS_BROKEN]: (p, r) => bars(p, floor, r, true),
  [T.W5_MESS]: (p, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.px(x, y, ((x >> 3) + (y >> 3)) % 2 ? DARK : MID);
    speck(p, r, 5, BLACK);
    if (r() < 0.25) p.ellipse(4 + Math.floor(r() * 8), 4 + Math.floor(r() * 8), 2, 1, LIGHT); // something spilled
  },
  [T.W5_GUARD]: (p, r) => {
    fill(p, MID);
    for (let y = 0; y < 16; y += 4) p.rect(0, y, 16, 1, DARK);
    for (let y = 0; y < 16; y += 4) p.rect((y * 5 + Math.floor(r() * 4)) % 16, y, 1, 4, DARK);
    p.rect(0, 1, 16, 1, LIGHT);
  },
  [T.W5_GWALL]: (p) => {
    fill(p, MID);
    for (let x = 0; x < 16; x += 4) p.rect(x, 0, 1, 16, DARK);
  },
  [T.W5_GWALL_LOW]: (p) => {
    fill(p, MID);
    p.rect(0, 0, 16, 7, LIGHT); // painted top half
    p.rect(0, 7, 16, 1, DARK);
    for (let x = 0; x < 16; x += 4) p.rect(x, 8, 1, 5, DARK);
    skirt(p, DARK, MID);
  },
  [T.W5_SLOPFLOOR]: (p, r) => {
    flags(p, r, DARK, BLACK, MID);
    p.ellipse(8, 9, 6, 4, MID);
    p.ellipse(7, 8, 4, 2, LIGHT);
    for (let i = 0; i < 4; i++) p.px(2 + Math.floor(r() * 12), 2 + Math.floor(r() * 12), LIGHT);
  },
  [T.W5_HIGH]: (p, r) => {
    fill(p, BLACK);
    p.rect(0, 0, 16, 1, DARK);
    p.rect(0, 0, 1, 16, DARK);
    if (r() < 0.5) p.line(2, 14, 6, 10, DARK); // a cold reflection
  },
  [T.W5_HWALL]: (p) => {
    fill(p, DARK);
    p.rect(0, 0, 16, 1, MID);
    p.rect(7, 0, 2, 16, BLACK);
  },
  [T.W5_HWALL_LOW]: (p) => {
    fill(p, DARK);
    p.rect(1, 2, 14, 9, BLACK);
    p.frame(1, 2, 14, 9, MID);
    skirt(p);
  },
  [T.W5_LIFT]: (p) => {
    fill(p, DARK);
    for (let y = 1; y < 16; y += 3) p.rect(0, y, 16, 1, BLACK);
    p.rect(0, 0, 16, 1, MID);
  },
  [T.W5_KITCHEN]: (p, r) => {
    fill(p, LIGHT);
    for (let i = 0; i < 16; i += 4) {
      p.rect(i, 0, 1, 16, MID);
      p.rect(0, i, 16, 1, MID);
    }
    speck(p, r, 6, DARK);
  },
  // ---------------- deco
  [D.W5_SLOP]: (p, r) => {
    p.ellipse(8, 10, 6, 3, MID);
    p.ellipse(7, 9, 3, 1, LIGHT);
    for (let i = 0; i < 3; i++) p.px(3 + Math.floor(r() * 10), 5 + Math.floor(r() * 4), MID);
  },
  [D.W5_FOOD]: (p, r) => {
    p.ellipse(5, 11, 3, 2, LIGHT); // a bread roll
    p.px(4, 10, WHITE);
    p.rect(9, 7, 4, 2, MID); // a chop
    p.ellipse(11, 13, 2, 1, WHITE); // mash
    if (r() < 0.5) p.line(2, 4, 6, 6, LIGHT); // a noodle
  },
  [D.W5_TALLY]: (p, r) => {
    for (let g = 0; g < 3; g++) {
      for (let i = 0; i < 4; i++) p.rect(1 + g * 5 + i, 3 + (g % 2) * 4, 1, 4, LIGHT);
      p.line(g * 5, 7 + (g % 2) * 4, g * 5 + 5, 3 + (g % 2) * 4, LIGHT);
    }
    void r;
  },
  [D.W5_SCRAWL]: (p, r) => {
    for (let l = 0; l < 3; l++) {
      let x = 1;
      while (x < 14) {
        const w = 1 + Math.floor(r() * 3);
        p.rect(x, 2 + l * 4, w, 1, LIGHT);
        x += w + 1;
      }
    }
  },
  [D.W5_SHACKLE]: (p) => {
    p.rect(3, 2, 2, 2, MID);
    p.rect(11, 2, 2, 2, MID);
    for (let y = 4; y < 10; y += 2) {
      p.px(4, y, LIGHT);
      p.px(12, y, LIGHT);
    }
    p.ring(4, 11, 2, 2, LIGHT);
    p.ring(12, 11, 2, 2, LIGHT);
  },
  [D.W5_BOARD]: (p) => {
    p.rect(1, 1, 14, 11, LIGHT);
    p.frame(1, 1, 14, 11, BLACK);
    for (let l = 0; l < 4; l++) p.rect(3, 3 + l * 2, 6 + ((l * 5) % 5), 1, DARK);
    p.rect(11, 3, 2, 2, BLACK); // a pin
  },
  [D.W5_BUNK_T]: (p) => {
    p.rect(1, 2, 14, 14, DARK);
    p.rect(2, 3, 12, 4, LIGHT); // a thin grey pillow
    p.rect(2, 7, 12, 9, MID);
    p.rect(1, 2, 1, 14, BLACK);
    p.rect(14, 2, 1, 14, BLACK);
  },
  [D.W5_BUNK_B]: (p) => {
    p.rect(1, 0, 14, 12, MID);
    p.rect(2, 0, 12, 10, MID);
    for (let x = 3; x < 14; x += 3) p.rect(x, 1, 1, 9, DARK); // the blanket's stripes
    p.rect(1, 12, 14, 2, DARK);
    p.rect(1, 14, 2, 2, BLACK);
    p.rect(13, 14, 2, 2, BLACK);
  },
  [D.W5_LOCKER]: (p) => {
    p.rect(2, 0, 12, 16, MID);
    p.frame(2, 0, 12, 16, BLACK);
    p.rect(8, 0, 1, 16, BLACK);
    for (let v = 0; v < 3; v++) {
      p.rect(4, 2 + v * 2, 3, 1, BLACK);
      p.rect(10, 2 + v * 2, 3, 1, BLACK);
    }
    p.rect(6, 9, 1, 2, LIGHT);
    p.rect(10, 9, 1, 2, LIGHT);
  },
  [D.W5_RACK]: (p) => {
    p.rect(1, 3, 14, 2, DARK);
    p.rect(1, 12, 14, 2, DARK);
    for (let i = 0; i < 4; i++) {
      p.rect(2 + i * 4, 0, 2, 16, i % 2 ? LIGHT : MID);
      p.px(2 + i * 4, 0, WHITE);
    }
  },
  [D.W5_GARBAGE]: (p, r) => {
    p.ellipse(8, 11, 7, 5, DARK);
    for (let i = 0; i < 10; i++) p.rect(2 + Math.floor(r() * 11), 6 + Math.floor(r() * 8), 2, 2, [MID, LIGHT, BLACK][i % 3]);
    p.line(4, 4, 6, 8, LIGHT); // a fish bone
    p.line(3, 5, 5, 5, LIGHT);
    // flies
    p.px(11, 2, BLACK);
    p.px(13, 4, BLACK);
  },
  [D.W5_DRAIN]: (p) => {
    p.rect(3, 5, 10, 7, BLACK);
    for (let x = 4; x < 13; x += 2) p.rect(x, 5, 1, 7, MID);
    p.frame(3, 5, 10, 7, DARK);
  },
  [D.W5_SHELF]: (p, r) => {
    p.rect(1, 0, 14, 16, DARK);
    for (let y = 3; y < 16; y += 5) p.rect(1, y, 14, 1, LIGHT);
    for (let i = 0; i < 6; i++) p.rect(2 + (i % 3) * 4, (i < 3 ? 0 : 5) + 0, 3, 3, r() < 0.5 ? MID : LIGHT); // tins and sacks
  },
  [D.W5_TRAYTABLE]: (p) => {
    p.rect(0, 3, 16, 9, MID);
    p.rect(0, 3, 16, 1, LIGHT);
    p.rect(0, 12, 16, 2, DARK);
    p.rect(2, 5, 6, 4, LIGHT); // a tray
    p.ellipse(5, 7, 2, 1, MID);
    p.rect(10, 6, 4, 3, LIGHT);
  },
  [D.W5_STOOL]: (p) => {
    p.ellipse(8, 8, 4, 2, MID);
    p.rect(7, 9, 2, 6, DARK);
  },
  [D.W5_DESK]: (p) => {
    p.rect(0, 4, 16, 10, MID);
    p.rect(0, 4, 16, 1, LIGHT);
    p.rect(1, 14, 2, 2, DARK);
    p.rect(13, 14, 2, 2, DARK);
    p.rect(3, 6, 5, 4, WHITE); // papers
    p.rect(10, 5, 2, 3, DARK); // a mug
  },
};
