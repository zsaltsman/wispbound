import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { T, D } from '../world/tiles';

// The spirit research facility's tiles (World 4): pale square floor tiles, steel
// grating, riveted wall panels with a painted stripe, glass partitions, and the
// clutter of a place left in a hurry.

type Painter = (p: PC, r: () => number) => void;
type R = () => number;
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);
const rint = (r: R, n: number) => Math.floor(r() * n);

// ================================================================== tiles

const labFloor: Painter = (p, r) => {
  fill(p, LIGHT);
  for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
    p.rect(x, y, 8, 1, MID);
    p.rect(x, y, 1, 8, MID);
    p.px(x + 1, y + 1, WHITE);
  }
  if (r() < 0.45) p.dither(rint(r, 10), rint(r, 10), 5, 4, MID, 0.4); // old grime
  if (r() < 0.2) {
    let x = rint(r, 16);
    for (let y = rint(r, 6); y < 16; y++) {
      p.px(x, y, DARK);
      x += r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0;
      if (r() < 0.12) break;
    }
  }
};
const grate: Painter = (p) => {
  fill(p, DARK);
  for (let y = 1; y < 16; y += 3) for (let x = 1; x < 16; x += 3) p.rect(x, y, 2, 2, BLACK);
  p.rect(0, 0, 16, 1, MID);
  p.rect(0, 0, 1, 16, MID);
};
const rivets = (p: PC, y: number) => {
  for (const x of [2, 13]) p.px(x, y, LIGHT);
};
const G_LAB: Record<number, Painter> = {
  [T.LAB_FLOOR]: labFloor,
  [T.LAB_GRATE]: grate,
  [T.LAB_WALL]: (p) => {
    fill(p, DARK);
    p.rect(0, 0, 16, 1, MID);
    p.rect(7, 0, 1, 16, BLACK);
    p.rect(8, 0, 1, 16, MID);
    rivets(p, 3);
    rivets(p, 12);
  },
  [T.LAB_WALL_LOW]: (p, r) => {
    fill(p, MID);
    p.rect(0, 0, 16, 1, LIGHT);
    p.rect(7, 0, 1, 12, DARK);
    p.rect(0, 6, 16, 2, DARK); // a painted stripe round the room
    p.rect(0, 6, 16, 1, BLACK);
    rivets(p, 2);
    rivets(p, 10);
    if (r() < 0.3) p.dither(rint(r, 10), 8, 5, 4, DARK, 0.35); // rust
    p.rect(0, 12, 16, 4, BLACK);
    p.rect(0, 12, 16, 1, DARK);
  },
  [T.LAB_GLASS]: (p, r) => {
    labFloor(p, r);
    p.dither(1, 0, 14, 16, WHITE, 0.22);
    p.rect(0, 0, 1, 16, MID);
    p.rect(15, 0, 1, 16, DARK);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 14, 16, 2, DARK);
    p.line(3, 12, 9, 2, WHITE);
    p.line(6, 13, 11, 5, WHITE);
  },
  [T.LAB_SCORCH]: (p, r) => {
    labFloor(p, r);
    p.dither(1, 2, 14, 12, DARK, 0.6);
    p.ellipse(8, 8, 5, 4, BLACK);
    p.dither(3, 4, 10, 8, DARK, 0.3);
    for (let i = 0; i < 3; i++) p.line(2 + i * 4, 1, 6 + i * 4, 14, BLACK);
  },
  // ---------------------------------------------------------------- furniture and clutter
  [D.LAB_DESK]: (p) => {
    p.rect(0, 5, 16, 2, WHITE);
    p.rect(0, 7, 16, 6, MID);
    p.rect(9, 8, 6, 1, DARK);
    p.rect(9, 10, 6, 1, DARK);
    p.rect(1, 13, 2, 3, DARK);
    p.rect(13, 13, 2, 3, DARK);
    p.rect(2, 2, 5, 4, LIGHT); // papers
    p.rect(3, 3, 3, 1, DARK);
    p.line(11, 1, 12, 5, DARK); // a lamp
    p.rect(9, 0, 4, 2, DARK);
    p.outline(BLACK);
  },
  [D.LAB_CONSOLE]: (p) => {
    p.rect(1, 3, 14, 11, DARK);
    p.rect(2, 4, 12, 6, BLACK);
    for (let x = 3; x < 13; x++) p.px(x, 7 + Math.round(Math.sin(x * 1.3) * 1.5), LIGHT);
    for (const x of [3, 6, 9, 12]) p.px(x, 12, WHITE);
    p.rect(1, 14, 14, 2, MID);
    p.outline(BLACK);
  },
  [D.LAB_CABINET]: (p) => {
    p.rect(2, 0, 12, 16, MID);
    p.rect(2, 0, 12, 1, LIGHT);
    for (const y of [5, 10]) p.rect(2, y, 12, 1, DARK);
    for (const y of [2, 7, 12]) p.rect(6, y, 4, 1, LIGHT);
    p.outline(BLACK);
  },
  [D.LAB_CLAW]: (p) => {
    for (let i = 0; i < 3; i++) {
      p.thick(1 + i * 4, 1, 7 + i * 4, 15, BLACK, 2);
      p.line(3 + i * 4, 1, 9 + i * 4, 15, DARK);
    }
  },
  [D.LAB_WALLCLAW]: (p) => {
    for (let i = 0; i < 4; i++) {
      p.thick(i * 4, 0, 4 + i * 4, 12, BLACK, 2);
      p.line(2 + i * 4, 0, 6 + i * 4, 12, LIGHT);
    }
  },
  [D.LAB_SIGN]: (p) => {
    p.rect(1, 1, 14, 9, LIGHT);
    p.frame(1, 1, 14, 9, BLACK);
    p.ring(5, 5, 2, 2, DARK); // a spiral: the facility's mark
    p.px(5, 5, DARK);
    for (const y of [3, 5, 7]) p.rect(8, y, 5, 1, DARK);
  },
  [D.LAB_PIPES]: (p) => {
    p.rect(0, 2, 16, 3, MID);
    p.rect(0, 2, 16, 1, LIGHT);
    p.rect(0, 7, 16, 2, DARK);
    p.rect(5, 1, 2, 9, DARK); // a joint
    p.circle(11, 8, 3, WHITE);
    p.ring(11, 8, 3, 3, BLACK);
    p.line(11, 8, 13, 7, BLACK);
  },
  [D.LAB_CANISTER]: (p) => {
    p.rect(4, 2, 8, 13, MID);
    p.rect(5, 2, 2, 13, LIGHT);
    p.rect(4, 6, 8, 2, DARK);
    p.rect(5, 0, 6, 2, DARK);
    p.ellipse(8, 15, 4, 1, DARK);
    p.outline(BLACK);
  },
  [D.LAB_CABLES]: (p, r) => {
    for (let k = 0; k < 3; k++) {
      let y = 3 + rint(r, 10);
      for (let x = 0; x < 16; x++) {
        y += Math.sin(x * 0.7 + k * 2) * 0.8;
        p.px(x, Math.round(y), k === 1 ? DARK : BLACK);
      }
    }
  },
  [D.LAB_GLASSBITS]: (p, r) => {
    for (let i = 0; i < 7; i++) {
      const x = 1 + rint(r, 13);
      const y = 1 + rint(r, 13);
      p.poly([[x, y], [x + 2 + rint(r, 2), y + 1], [x, y + 2]], i % 2 ? WHITE : LIGHT);
      p.px(x, y + 2, MID);
    }
  },
  [D.LAB_CHART]: (p) => {
    p.rect(1, 1, 14, 10, WHITE);
    p.frame(1, 1, 14, 10, BLACK);
    const pts = [9, 9, 8, 6, 4, 2, 9, 9];
    for (let i = 0; i < 7; i++) p.line(2 + i * 2, pts[i], 4 + i * 2, pts[i + 1], DARK);
  },
  [D.LAB_LOCKER]: (p) => {
    p.rect(2, 0, 12, 16, MID);
    p.rect(8, 0, 1, 16, DARK);
    for (const x of [4, 10]) for (const y of [2, 4]) p.rect(x, y, 3, 1, DARK);
    p.px(6, 9, WHITE);
    p.rect(9, 0, 5, 16, DARK); // one door hangs open
    p.rect(10, 1, 3, 14, BLACK);
    p.outline(BLACK);
  },
  [D.LAB_BENCH]: (p) => {
    p.rect(0, 7, 16, 2, WHITE);
    p.rect(0, 9, 16, 4, MID);
    p.rect(1, 13, 2, 3, DARK);
    p.rect(13, 13, 2, 3, DARK);
    p.circle(4, 5, 2, LIGHT);
    p.rect(4, 1, 1, 3, LIGHT);
    p.rect(3, 5, 3, 1, MID);
    p.rect(9, 2, 2, 5, LIGHT);
    p.rect(9, 5, 2, 2, DARK);
    p.rect(13, 4, 2, 3, LIGHT);
    p.outline(BLACK);
  },
  [D.LAB_PAPERS]: (p, r) => {
    for (let i = 0; i < 3; i++) {
      const x = 1 + rint(r, 9);
      const y = 2 + rint(r, 9);
      p.rect(x, y, 5, 4, WHITE);
      p.rect(x + 1, y + 1, 3, 1, MID);
    }
  },
  [D.LAB_BOARD]: (p, r) => {
    p.rect(0, 1, 16, 10, DARK);
    p.frame(0, 1, 16, 10, BLACK);
    for (let i = 0; i < 4; i++) {
      const x = 1 + rint(r, 11);
      const y = 2 + rint(r, 5);
      p.rect(x, y, 4, 4, i === 2 ? LIGHT : WHITE);
      p.px(x + 2, y, BLACK);
    }
  },
};
export const G_LAB_TILES = G_LAB;

