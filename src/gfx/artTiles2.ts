import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { T, D } from '../world/tiles';

// World 2 tiles: the flooded island. Asphalt, floodwater, sand drifts, the
// inventor's workshop and the Cave of the Gods.

type Painter = (p: PC, r: () => number) => void;

const speck = (p: PC, r: () => number, n: number, c: number, x0 = 0, y0 = 0, w = 16, h = 16) => {
  for (let i = 0; i < n; i++) p.px(x0 + Math.floor(r() * w), y0 + Math.floor(r() * h), c);
};
const fill = (p: PC, c: number) => p.rect(0, 0, 16, 16, c);

const asphalt = (p: PC, r: () => number) => {
  fill(p, MID);
  p.dither(0, 0, 16, 16, DARK, 0.5);
  speck(p, r, 6, LIGHT);
  speck(p, r, 4, BLACK);
};

export const G2: Record<number, Painter> = {
  [T.SHALLOW]: (p, r) => {
    // ankle-deep floodwater over the road: dark, rippling, with debris specks
    fill(p, DARK);
    p.dither(0, 0, 16, 16, BLACK, 0.35);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 10);
      const y = 1 + i * 4 + Math.floor(r() * 2);
      p.line(x, y, x + 5, y, LIGHT);
      p.px(x + 2, y - 1, WHITE);
    }
  },
  [T.ASPHALT]: asphalt,
  [T.ASPHALT2]: (p, r) => {
    asphalt(p, r);
    // a crack, with a missing chunk
    let x = Math.floor(r() * 6);
    for (let y = 0; y < 16; y++) {
      p.px(x, y, BLACK);
      if (r() < 0.4) x += r() < 0.5 ? 1 : -1;
      x = Math.max(0, Math.min(15, x));
    }
    p.ellipse(10, 10, 3, 2, BLACK);
    p.px(9, 9, MID);
  },
  [T.ROADLINE]: (p, r) => {
    asphalt(p, r);
    p.rect(2, 7, 5, 2, LIGHT);
    p.rect(10, 7, 4, 2, LIGHT);
    p.dither(2, 7, 12, 2, MID, 0.35);
  },
  [T.SIDEWALK]: (p, r) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.2);
    p.rect(0, 0, 16, 1, DARK);
    p.rect(0, 8, 16, 1, DARK);
    p.rect(7, 0, 1, 8, DARK);
    p.rect(3, 8, 1, 8, DARK);
    p.rect(12, 8, 1, 8, DARK);
    speck(p, r, 3, DARK);
  },
  [T.MUD]: (p, r) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.25);
    for (let i = 0; i < 3; i++) p.ellipse(Math.floor(r() * 16), Math.floor(r() * 16), 2, 1, BLACK);
    speck(p, r, 2, LIGHT);
  },
  [T.SANDDRIFT]: (p, r) => {
    // sand the waves dumped across the street: soft ripples
    fill(p, MID);
    p.dither(0, 0, 16, 16, LIGHT, 0.45);
    for (let y = 3; y < 16; y += 5) for (let x = 0; x < 16; x++) if (Math.sin(x * 0.7 + y) > 0.5) p.px(x, y, LIGHT);
    speck(p, r, 3, DARK);
  },
  [T.MARBLE]: (p, r) => {
    fill(p, LIGHT);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 0, 1, 16, MID);
    let x = Math.floor(r() * 16);
    for (let y = 1; y < 16; y++) {
      if (r() < 0.5) p.px(x, y, MID);
      x += r() < 0.5 ? 1 : 0;
    }
    p.px(8, 8, WHITE);
  },
  [T.GRATE]: (p) => {
    fill(p, DARK);
    for (let i = 0; i < 16; i += 4) {
      p.rect(i, 0, 1, 16, BLACK);
      p.rect(0, i, 16, 1, BLACK);
      p.px(i + 2, i + 2, MID);
    }
    p.rect(0, 0, 16, 1, MID);
  },
  [T.GODSTONE]: (p, r) => {
    // vast ancient flagstones, almost white with age where the light hits
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.3);
    p.rect(0, 0, 16, 1, BLACK);
    p.rect(0, 0, 1, 16, BLACK);
    p.rect(1, 1, 15, 1, LIGHT);
    p.rect(1, 1, 1, 15, LIGHT);
    speck(p, r, 4, LIGHT);
    if (r() < 0.3) p.line(3, 12, 9, 6, DARK);
  },
  [T.GODWALL]: (p, r) => {
    // the carved face of the chamber wall
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.25);
    p.rect(0, 0, 16, 1, BLACK);
    p.rect(0, 15, 16, 1, BLACK);
    p.rect(0, 7, 16, 1, BLACK);
    p.rect(r() < 0.5 ? 5 : 11, 0, 1, 7, BLACK);
    p.rect(r() < 0.5 ? 3 : 9, 8, 1, 7, BLACK);
    p.rect(0, 1, 16, 1, MID);
    p.rect(0, 8, 16, 1, MID);
  },
  [T.GODWALL_TOP]: (p, r) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 16, DARK, 0.18);
    speck(p, r, 2, MID);
  },
  [T.SEAFLOOR]: (p, r) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 16, DARK, 0.4);
    for (let i = 0; i < 4; i++) p.ellipse(Math.floor(r() * 16), Math.floor(r() * 16), 2, 1, DARK);
    speck(p, r, 3, MID);
  },
  [T.PARKPATH]: (p, r) => {
    // old painted paving: diamond tiles, chipped
    fill(p, MID);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) p.px(x, y, DARK);
    p.dither(0, 0, 16, 16, DARK, 0.15);
    speck(p, r, 3, LIGHT);
  },
};

// ------------------------------------------------------------------ the god temples

const slab = (p: PC, r: () => number, base: number, edge: number, size: number) => {
  fill(p, base);
  for (let i = 0; i < 16; i += size) {
    p.rect(i, 0, 1, 16, edge);
    p.rect(0, i, 16, 1, edge);
  }
  speck(p, r, 4, edge === BLACK ? MID : LIGHT);
};

Object.assign(G2, {
  [T.ZFLOOR]: (p: PC, r: () => number) => {
    slab(p, r, BLACK, DARK, 8);
    if (r() < 0.25) {
      p.line(3, 2, 7, 7, MID);
      p.line(7, 7, 5, 9, MID);
      p.line(5, 9, 10, 14, MID);
    }
  },
  [T.CONDUIT]: (p: PC, r: () => number) => {
    slab(p, r, BLACK, DARK, 8);
    // a copper channel cross: the arms only look connected where real channels meet
    p.rect(6, 0, 4, 16, DARK);
    p.rect(7, 0, 2, 16, MID);
    p.px(7, 3, LIGHT);
    p.px(8, 11, LIGHT);
  },
  [T.TFLOOR]: (p: PC, r: () => number) => {
    fill(p, MID);
    p.dither(0, 0, 16, 16, DARK, 0.4);
    p.rect(0, 0, 16, 1, BLACK);
    p.rect(0, 0, 1, 16, BLACK);
    speck(p, r, 6, LIGHT);
    if (r() < 0.3) p.line(2, 12, 12, 3, BLACK);
  },
  [T.PLATE]: (p: PC) => {
    fill(p, DARK);
    p.rect(2, 2, 12, 12, MID);
    p.frame(2, 2, 12, 12, BLACK);
    p.rect(3, 3, 10, 1, LIGHT);
    p.line(6, 5, 9, 8, LIGHT);
    p.line(9, 8, 7, 11, LIGHT);
  },
  [T.PIT]: (p: PC) => {
    fill(p, BLACK);
    p.rect(0, 0, 16, 2, DARK);
    p.dither(0, 2, 16, 4, DARK, 0.3);
  },
  [T.PIT_FILLED]: (p: PC, r: () => number) => {
    fill(p, BLACK);
    p.rect(1, 1, 14, 14, MID);
    p.rect(1, 1, 14, 2, LIGHT);
    speck(p, r, 3, DARK, 2, 4, 12, 10);
  },
  [T.SOCKET]: (p: PC, r: () => number) => {
    slab(p, r, DARK, BLACK, 8);
    p.circle(8, 8, 5, BLACK);
    p.ring(8, 8, 5, 5, MID);
    p.rect(0, 7, 3, 2, MID);
    p.rect(13, 7, 3, 2, MID);
  },
  [T.PFLOOR]: (p: PC, r: () => number) => {
    fill(p, MID);
    for (let x = 0; x < 16; x++) {
      p.px(x, 4 + Math.round(Math.sin(x * 0.8) * 1.5), LIGHT);
      p.px(x, 11 + Math.round(Math.sin(x * 0.8 + 2) * 1.5), DARK);
    }
    p.rect(0, 0, 16, 1, DARK);
    speck(p, r, 3, DARK);
  },
  [T.PWATER]: (p: PC, r: () => number) => {
    fill(p, BLACK);
    p.dither(0, 0, 16, 16, DARK, 0.45);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 10);
      const y = 2 + i * 5;
      p.line(x, y, x + 5, y, MID);
      p.px(x + 2, y - 1, LIGHT);
    }
  },
  [T.PBASIN]: (p: PC, r: () => number) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, MID, 0.25);
    for (let i = 0; i < 3; i++) p.ellipse(Math.floor(r() * 16), Math.floor(r() * 16), 2, 1, BLACK);
    p.line(2, 13, 6, 10, MID); // weed
    speck(p, r, 2, LIGHT);
  },
  [T.AFLOOR]: (p: PC, r: () => number) => {
    fill(p, LIGHT);
    p.dither(0, 0, 16, 16, WHITE, 0.15);
    p.rect(0, 0, 16, 1, MID);
    p.rect(0, 0, 1, 16, MID);
    if (r() < 0.35) for (let x = 2; x < 14; x += 4) p.rect(x, 7, 2, 2, MID);
  },
  [T.ACARPET]: (p: PC) => {
    fill(p, DARK);
    p.frame(1, 1, 14, 14, MID);
    for (let x = 3; x < 13; x += 3) p.rect(x, 7, 2, 2, LIGHT);
  },
  [T.VFLOOR]: (p: PC, r: () => number) => {
    slab(p, r, DARK, BLACK, 16);
    p.dither(0, 0, 16, 16, BLACK, 0.2);
    if (r() < 0.4) p.line(Math.floor(r() * 16), 0, Math.floor(r() * 16), 15, BLACK);
  },
  [T.VCRACK]: (p: PC) => {
    fill(p, DARK);
    p.dither(0, 0, 16, 16, BLACK, 0.3);
    p.thick(0, 9, 6, 6, BLACK, 2);
    p.thick(6, 6, 10, 10, BLACK, 2);
    p.thick(10, 10, 16, 7, BLACK, 2);
  },
});

const sandbag = (p: PC, x: number, y: number) => {
  p.ellipse(x, y, 4, 2, LIGHT);
  p.line(x - 3, y, x + 3, y, MID);
  p.px(x - 1, y - 1, WHITE);
};

export const DC2: Record<number, Painter> = {
  [D.SANDBAG]: (p) => {
    sandbag(p, 4, 12);
    sandbag(p, 11, 12);
    sandbag(p, 7, 8);
    sandbag(p, 13, 8);
    sandbag(p, 2, 8);
    p.outline(BLACK);
  },
  [D.WARNSIGN]: (p) => {
    p.rect(7, 8, 2, 8, DARK);
    p.poly(
      [
        [8, 0],
        [15, 9],
        [1, 9],
      ],
      WHITE
    );
    p.poly(
      [
        [8, 2],
        [13, 8],
        [3, 8],
      ],
      LIGHT
    );
    p.rect(7, 3, 2, 3, BLACK);
    p.px(7, 7, BLACK);
    p.px(8, 7, BLACK);
    p.outline(BLACK);
  },
  [D.DEBRIS]: (p, r) => {
    // a heap of broken boards, a bent sign, a shoe
    p.thick(1, 13, 14, 9, MID, 2);
    p.thick(3, 7, 12, 14, DARK, 2);
    p.rect(5, 10, 6, 3, LIGHT);
    p.line(5, 10, 10, 12, BLACK);
    p.rect(11, 12, 3, 2, DARK);
    speck(p, r, 3, WHITE, 2, 8, 12, 6);
    p.outline(BLACK);
  },
  [D.SEAWEED]: (p, r) => {
    for (let i = 0; i < 3; i++) {
      const x = 3 + Math.floor(r() * 10);
      const y = 5 + Math.floor(r() * 8);
      p.line(x - 3, y + 1, x + 3, y - 1, MID);
      p.line(x - 2, y + 2, x + 2, y + 1, DARK);
    }
    p.outline(BLACK);
  },
  [D.TIRE]: (p) => {
    p.ellipse(8, 10, 6, 4, BLACK);
    p.ring(8, 10, 6, 4, DARK);
    p.ring(8, 10, 3, 2, MID);
    p.outline(BLACK);
  },
  [D.CONE]: (p) => {
    p.poly(
      [
        [8, 2],
        [12, 13],
        [4, 13],
      ],
      LIGHT
    );
    p.rect(5, 8, 6, 2, WHITE);
    p.rect(3, 13, 10, 2, MID);
    p.outline(BLACK);
  },
  [D.BLUEPRINT]: (p) => {
    // pinned to the wall: a sheet of lines and circles
    p.rect(1, 1, 14, 10, MID);
    p.frame(1, 1, 14, 10, LIGHT);
    p.ring(5, 6, 2, 2, WHITE);
    p.line(7, 6, 13, 6, WHITE);
    p.line(10, 3, 10, 9, LIGHT);
    p.px(8, 1, BLACK);
  },
  [D.WIRES]: (p) => {
    p.line(0, 9, 5, 12, BLACK);
    p.line(5, 12, 11, 8, BLACK);
    p.line(11, 8, 15, 11, BLACK);
    p.line(0, 4, 7, 6, DARK);
    p.line(7, 6, 15, 3, DARK);
    p.px(11, 8, LIGHT);
  },
  [D.MACHINE]: (p) => {
    p.rect(1, 2, 14, 13, MID);
    p.rect(1, 2, 14, 2, LIGHT);
    p.rect(3, 6, 5, 4, BLACK);
    p.px(4, 7, WHITE);
    p.px(6, 8, LIGHT);
    p.circle(11, 8, 2, DARK);
    p.px(11, 8, WHITE);
    for (let x = 3; x < 13; x += 3) p.rect(x, 12, 2, 1, DARK);
    p.outline(BLACK);
  },
  [D.TOOLRACK]: (p) => {
    p.rect(1, 1, 14, 11, DARK);
    p.line(3, 3, 3, 10, LIGHT);
    p.rect(2, 3, 3, 2, LIGHT); // hammer
    p.line(7, 3, 7, 10, MID);
    p.ring(7, 3, 1, 1, LIGHT); // wrench
    p.line(11, 3, 11, 10, LIGHT);
    p.line(10, 10, 12, 10, MID);
    p.outline(BLACK);
  },
  [D.WORKBENCH]: (p, r) => {
    p.rect(0, 4, 16, 4, MID);
    p.rect(0, 4, 16, 1, LIGHT);
    p.rect(1, 8, 2, 7, DARK);
    p.rect(13, 8, 2, 7, DARK);
    speck(p, r, 5, WHITE, 1, 2, 14, 2);
    p.rect(4, 2, 3, 2, DARK);
    p.outline(BLACK);
  },
  [D.VAULT]: (p) => {
    p.rect(0, 0, 16, 16, MID);
    p.circle(8, 8, 6, LIGHT);
    p.circle(8, 8, 4, MID);
    p.line(8, 3, 8, 13, DARK);
    p.line(3, 8, 13, 8, DARK);
    p.circle(8, 8, 1, WHITE);
    p.outline(BLACK);
  },
  [D.BALLOT]: (p) => {
    p.rect(3, 5, 10, 10, LIGHT);
    p.rect(3, 5, 10, 2, WHITE);
    p.rect(5, 5, 6, 1, BLACK);
    p.rect(5, 9, 6, 3, MID);
    p.px(7, 10, BLACK);
    p.px(8, 11, BLACK);
    p.outline(BLACK);
  },
  [D.TRASHCAN]: (p) => {
    p.rect(4, 4, 8, 11, MID);
    p.rect(3, 3, 10, 2, LIGHT);
    for (let x = 5; x < 12; x += 2) p.rect(x, 6, 1, 8, DARK);
    p.outline(BLACK);
  },
  [D.PB_SHELF_T]: (p, r) => {
    p.rect(0, 0, 16, 16, DARK);
    for (const y of [1, 8]) {
      for (let x = 1; x < 15; x += 3) {
        // jars
        p.rect(x, y + 1, 3, 5, r() < 0.5 ? LIGHT : MID);
        p.rect(x, y, 3, 1, WHITE);
      }
      p.rect(0, y + 6, 16, 1, BLACK);
    }
  },
  [D.PB_SHELF_B]: (p, r) => {
    p.rect(0, 0, 16, 15, DARK);
    for (let x = 1; x < 15; x += 3) {
      p.rect(x, 2, 3, 5, r() < 0.5 ? LIGHT : MID);
      p.rect(x, 1, 3, 1, WHITE);
    }
    p.rect(0, 8, 16, 1, BLACK);
    p.rect(0, 13, 16, 2, MID);
    p.outline(BLACK);
  },
  [D.CARVING]: (p) => {
    // a frieze: a figure holding something aloft, waves below
    p.rect(1, 1, 14, 10, MID);
    p.circle(8, 3, 1, LIGHT);
    p.line(8, 4, 8, 7, LIGHT);
    p.line(8, 5, 5, 2, LIGHT);
    p.line(8, 5, 11, 4, LIGHT);
    for (let x = 1; x < 15; x++) p.px(x, 9 + (x % 4 < 2 ? 0 : 1), LIGHT);
    p.frame(1, 1, 14, 10, DARK);
  },
  [D.BRAZIER]: (p) => {
    p.rect(5, 9, 6, 6, DARK);
    p.rect(3, 7, 10, 3, MID);
    p.rect(3, 7, 10, 1, LIGHT);
    p.ellipse(8, 5, 3, 3, LIGHT);
    p.ellipse(8, 4, 2, 3, WHITE);
    p.px(6, 1, LIGHT);
    p.px(10, 2, LIGHT);
    p.outline(BLACK);
  },
  [D.RUBBLE]: (p, r) => {
    for (let i = 0; i < 6; i++) {
      const x = 2 + Math.floor(r() * 11);
      const y = 5 + Math.floor(r() * 8);
      p.rect(x, y, 3, 2, i % 2 ? MID : LIGHT);
    }
    p.outline(BLACK);
  },
  [D.GEARS]: (p) => {
    for (const [cx, cy, rr] of [
      [6, 9, 4],
      [11, 6, 3],
    ]) {
      p.circle(cx, cy, rr, MID);
      for (let a = 0; a < 8; a++) p.px(cx + Math.round(Math.cos(a) * (rr + 1)), cy + Math.round(Math.sin(a) * (rr + 1)), LIGHT);
      p.circle(cx, cy, 1, BLACK);
    }
    p.outline(BLACK);
  },
  [D.COMPUTER]: (p) => {
    p.rect(2, 2, 12, 9, DARK);
    p.rect(3, 3, 10, 7, BLACK);
    for (let y = 4; y < 9; y += 2) p.rect(4, y, 4 + (y % 3), 1, LIGHT);
    p.rect(6, 11, 4, 2, MID);
    p.rect(1, 13, 14, 2, MID);
    p.outline(BLACK);
  },
  [D.SCREEN]: (p) => {
    // wall monitor showing the island, a pulsing red-free warning ring
    p.rect(0, 1, 16, 11, DARK);
    p.rect(1, 2, 14, 9, BLACK);
    p.ellipse(7, 6, 4, 3, MID);
    p.ring(7, 6, 6, 4, LIGHT);
    p.px(13, 3, WHITE);
  },
  [D.MAPTABLE]: (p) => {
    p.rect(0, 3, 16, 10, LIGHT);
    p.ellipse(8, 8, 5, 3, MID);
    p.line(2, 4, 14, 12, DARK);
    p.px(9, 7, BLACK);
    p.rect(0, 13, 16, 2, DARK);
    p.outline(BLACK);
  },
  [D.NOTES]: (p, r) => {
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(r() * 11);
      const y = Math.floor(r() * 7);
      p.rect(x, y, 5, 4, i % 2 ? WHITE : LIGHT);
      p.line(x + 1, y + 1, x + 3, y + 1, MID);
    }
  },
  [D.FLOODLINE]: (p) => {
    // a dark tide mark, drip stains below it
    p.rect(0, 6, 16, 2, BLACK);
    p.dither(0, 8, 16, 6, BLACK, 0.3);
    for (const x of [2, 7, 12]) p.line(x, 8, x, 12, BLACK);
  },
  [D.CRACK]: (p) => {
    p.line(1, 3, 6, 7, BLACK);
    p.line(6, 7, 5, 12, BLACK);
    p.line(6, 7, 12, 9, BLACK);
    p.line(12, 9, 15, 14, BLACK);
  },
  [D.PUDDLE_D]: (p) => {
    p.ellipse(8, 9, 6, 3, BLACK);
    p.dither(3, 7, 10, 5, DARK, 0.4);
    p.line(4, 8, 8, 8, MID);
    p.px(11, 10, LIGHT);
  },
  [D.TELLER]: (p) => {
    p.rect(0, 6, 16, 9, MID);
    p.rect(0, 6, 16, 1, LIGHT);
    p.rect(0, 0, 1, 6, LIGHT);
    p.rect(15, 0, 1, 6, LIGHT);
    p.rect(0, 0, 16, 1, LIGHT);
    p.dither(1, 1, 14, 5, WHITE, 0.15);
    p.outline(BLACK);
  },
  [D.ROPEPOST]: (p) => {
    p.rect(7, 4, 2, 10, LIGHT);
    p.circle(8, 3, 2, WHITE);
    p.rect(5, 13, 6, 2, MID);
    p.line(0, 7, 6, 8, DARK);
    p.line(10, 8, 15, 7, DARK);
    p.outline(BLACK);
  },
  [D.LIFERING]: (p) => {
    p.circle(8, 8, 6, WHITE);
    p.circle(8, 8, 3, -1);
    for (const [x, y] of [
      [8, 2],
      [8, 14],
      [2, 8],
      [14, 8],
    ])
      p.rect(x - 1, y - 1, 2, 2, MID);
    p.outline(BLACK);
  },
  [D.BUOY]: (p) => {
    p.ellipse(8, 11, 5, 4, LIGHT);
    p.rect(3, 10, 10, 2, MID);
    p.rect(7, 2, 2, 6, DARK);
    p.px(8, 1, WHITE);
    p.outline(BLACK);
  },
  [D.BARRIER]: (p) => {
    p.rect(1, 4, 14, 4, WHITE);
    for (let x = 1; x < 15; x += 4) p.rect(x, 4, 2, 4, DARK);
    p.rect(2, 8, 2, 7, MID);
    p.rect(12, 8, 2, 7, MID);
    p.outline(BLACK);
  },
  [D.PALLET]: (p) => {
    for (let y = 6; y < 15; y += 3) p.rect(1, y, 14, 2, MID);
    p.rect(1, 6, 2, 9, DARK);
    p.rect(13, 6, 2, 9, DARK);
    p.rect(3, 2, 10, 4, LIGHT);
    p.outline(BLACK);
  },
  [D.CLAMSHELL]: (p) => {
    p.ellipse(5, 11, 2, 1, WHITE);
    p.ellipse(11, 7, 2, 1, LIGHT);
    p.px(9, 13, LIGHT);
  },
  [D.GLYPH]: (p) => {
    // a worn spiral cut into the floor
    for (let a = 0; a < 12; a += 0.3) p.px(8 + Math.cos(a) * a * 0.5, 8 + Math.sin(a) * a * 0.5, DARK);
    p.px(8, 8, LIGHT);
  },
  [D.PILLAR_T]: (p) => {
    p.rect(1, 0, 14, 3, LIGHT);
    p.rect(3, 3, 10, 13, MID);
    for (let x = 4; x < 13; x += 3) p.rect(x, 3, 1, 13, DARK);
    p.rect(3, 3, 1, 13, LIGHT);
    p.outline(BLACK);
  },
  [D.PILLAR_B]: (p) => {
    p.rect(3, 0, 10, 12, MID);
    for (let x = 4; x < 13; x += 3) p.rect(x, 0, 1, 12, DARK);
    p.rect(3, 0, 1, 12, LIGHT);
    p.rect(1, 12, 14, 3, LIGHT);
    p.outline(BLACK);
  },
  [D.URN]: (p) => {
    p.ellipse(8, 10, 5, 5, MID);
    p.rect(6, 2, 4, 4, MID);
    p.rect(5, 2, 6, 1, LIGHT);
    p.line(4, 10, 12, 10, LIGHT);
    p.px(6, 8, WHITE);
    p.outline(BLACK);
  },
};
