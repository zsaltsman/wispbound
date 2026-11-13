import Phaser from 'phaser';
import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, sheet, bayer, type Pt } from './pixel';
import { K, limb, wisp } from './artW4beasts';

// World 4: THE SPIRIT RESEARCH FACILITY, cut into the hillside by the forest clearing.
// Pale tiled floors and riveted wall panels (nothing else on the island is square),
// glass tanks, cables, old machines; the overgrown mound and the door behind it; the
// failed experiment, SUBJECT 9, in its tank and in battle; and the vault where
// something much larger got out.

type R = () => number;
const rint = (r: R, n: number) => Math.floor(r() * n);

// ================================================================== the hillside

/** The hill itself: rock and earth, ferns, moss. */
function hill(p: PC, r: R) {
  p.poly([[0, 96], [2, 50], [14, 26], [34, 12], [60, 6], [88, 10], [110, 22], [124, 44], [128, 96]], DARK);
  p.poly([[8, 60], [18, 34], [36, 20], [60, 14], [86, 18], [106, 30], [118, 52], [100, 40], [70, 30], [40, 34], [20, 50]], MID);
  for (let i = 0; i < 70; i++) {
    const x = 4 + rint(r, 120);
    const y = 14 + rint(r, 80);
    if (p.get(x, y) < 0) continue;
    p.px(x, y, r() < 0.5 ? BLACK : LIGHT);
  }
  for (let i = 0; i < 14; i++) {
    const x = 6 + rint(r, 116);
    const y = 20 + rint(r, 20);
    if (p.get(x, y + 4) < 0) continue;
    // a fern
    for (let k = -2; k <= 2; k++) p.line(x, y + 6, x + k * 2, y, k ? MID : LIGHT);
  }
}
function hangVines(p: PC, r: R, x0: number, x1: number, y0: number, y1: number, n: number) {
  for (let i = 0; i < n; i++) {
    let x = x0 + r() * (x1 - x0);
    const len = (y1 - y0) * (0.5 + r() * 0.5);
    for (let k = 0; k < len; k++) {
      const y = y0 + k;
      x += Math.sin((y + i * 7) * 0.3) * 0.5;
      p.px(Math.round(x), y, BLACK);
      p.px(Math.round(x) + 1, y, DARK);
      if (k % 3 === 0) {
        const s = i % 2 ? -1 : 1;
        p.px(Math.round(x) + s * 2, y, MID);
        p.px(Math.round(x) + s, y - 1, LIGHT);
      }
    }
  }
}

/** Before: just an overgrown mound at the edge of the clearing. */
export function mound(): PC {
  const p = new PC(128, 96);
  const r = artRng(901);
  hill(p, r);
  hangVines(p, r, 20, 110, 24, 96, 46);
  p.outline(BLACK);
  return p;
}

/** After: the vines have come down. A concrete frontage and a heavy door. */
export function labFront(): PC {
  const p = new PC(128, 96);
  const r = artRng(902);
  hill(p, r);
  // the concrete front, set into the hill
  p.rect(28, 40, 72, 56, MID);
  p.rect(28, 40, 72, 2, LIGHT);
  p.rect(28, 40, 2, 56, LIGHT);
  p.rect(98, 40, 2, 56, DARK);
  for (let i = 0; i < 40; i++) p.px(30 + rint(r, 68), 42 + rint(r, 52), r() < 0.6 ? DARK : LIGHT);
  for (let x = 30; x < 98; x += 12) p.rect(x, 42, 1, 54, DARK);
  // the sign over the door: a plate with the spiral mark and lettering
  p.rect(44, 44, 40, 12, LIGHT);
  p.frame(44, 44, 40, 12, BLACK);
  p.ring(51, 50, 3, 3, DARK);
  p.px(51, 50, DARK);
  for (const [x, w] of [[58, 6], [66, 8], [76, 5]] as const) p.rect(x, 48, w, 2, DARK);
  p.rect(58, 52, 20, 1, MID);
  p.line(80, 45, 83, 55, DARK); // rust run
  // the door: a heavy rounded slab, a wheel to turn
  p.rect(58, 62, 28, 34, BLACK);
  p.rect(60, 64, 24, 32, DARK);
  p.rect(60, 64, 24, 1, MID);
  p.rect(71, 64, 2, 32, BLACK);
  p.ring(72, 79, 6, 6, LIGHT);
  p.ring(72, 79, 5, 5, MID);
  for (let a = 0; a < 4; a++) p.line(72, 79, 72 + Math.round(Math.cos(a * 1.57) * 6), 79 + Math.round(Math.sin(a * 1.57) * 6), LIGHT);
  for (const y of [66, 92]) for (const x of [62, 82]) p.px(x, y, LIGHT);
  // a dead lamp over the door, pipes that run off into the hill, a vent
  p.rect(70, 58, 4, 3, DARK);
  p.px(71, 60, LIGHT);
  p.rect(10, 70, 18, 3, DARK);
  p.rect(10, 70, 18, 1, MID);
  p.rect(10, 78, 18, 2, DARK);
  p.rect(36, 66, 14, 10, BLACK);
  for (let y = 67; y < 76; y += 2) p.rect(37, y, 12, 1, DARK);
  p.rect(94, 66, 6, 30, DARK); // a downpipe
  p.rect(94, 66, 2, 30, MID);
  // what is left of the vines, still hanging from the top
  hangVines(p, r, 30, 100, 30, 52, 16);
  // the ones that came down, in a heap at the foot of the wall
  for (let i = 0; i < 30; i++) {
    const x = 26 + rint(r, 76);
    const y = 90 + rint(r, 6);
    if (x > 58 && x < 86) continue;
    p.line(x, y, x + 3, y - 1, i % 2 ? DARK : MID);
  }
  p.outline(BLACK);
  return p;
}

/** A curtain of vines, for the moment they fall. */
export function vineCurtain(): PC {
  const p = new PC(80, 60);
  hangVines(p, artRng(903), 2, 78, 0, 60, 30);
  return p;
}

// ================================================================== puzzle pieces and set dressing

/** A breaker on the wall: its lever up (on) or down (off), and its lamp. */
export function breaker(on: boolean): PC {
  const p = new PC(16, 20);
  p.rect(2, 4, 12, 15, MID);
  p.rect(2, 4, 12, 1, LIGHT);
  p.rect(5, 8, 6, 9, BLACK);
  if (on) {
    p.rect(7, 9, 2, 4, WHITE);
    p.rect(6, 8, 4, 2, LIGHT);
  } else {
    p.rect(7, 12, 2, 4, LIGHT);
    p.rect(6, 15, 4, 2, MID);
  }
  p.circle(8, 2, 2, on ? WHITE : BLACK);
  if (on) p.px(7, 1, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A glass tank. 0 murky, 1 broken, 2 a drained husk, 3 a faint remnant, 4 a coat inside, 5 the glass raised. */
export function tank(kind: number): PC {
  const p = new PC(32, 48);
  const r = artRng(910 + kind);
  // the base and the cap
  p.rect(2, 38, 28, 10, DARK);
  p.rect(2, 38, 28, 2, MID);
  p.rect(10, 42, 12, 4, LIGHT); // a plaque
  p.rect(12, 43, 8, 1, DARK);
  p.rect(12, 45, 5, 1, DARK);
  p.rect(4, 0, 24, 6, DARK);
  p.rect(4, 0, 24, 1, MID);
  p.rect(14, 0, 4, 2, BLACK);
  const gx = 5;
  const gw = 22;
  const top = kind === 5 ? 4 : 6;
  if (kind === 1) {
    // burst: jagged teeth of glass top and bottom, the inside open and dark
    p.rect(gx, 6, gw, 32, BLACK);
    p.poly([[gx, 6], [gx + gw, 6], [gx + gw, 12], [gx + 16, 9], [gx + 10, 15], [gx + 5, 10], [gx, 13]], LIGHT);
    p.poly([[gx, 38], [gx + gw, 38], [gx + gw, 31], [gx + 15, 35], [gx + 9, 28], [gx + 4, 34], [gx, 30]], LIGHT);
    p.dither(gx, 6, gw, 32, MID, 0.12, true);
    for (let i = 0; i < 5; i++) p.line(gx + rint(r, gw), 20 + rint(r, 10), gx + rint(r, gw), 26 + rint(r, 10), DARK);
  } else {
    p.rect(gx, top, gw, 38 - top, kind === 5 ? BLACK : DARK);
    if (kind === 0) p.dither(gx, 12, gw, 26, MID, 0.45); // murky liquid
    if (kind === 2) {
      // something curled up, grey and dry, far too light
      p.ellipse(16, 31, 7, 5, MID);
      p.ellipse(11, 27, 4, 3, MID);
      for (let i = 0; i < 6; i++) p.px(10 + rint(r, 12), 27 + rint(r, 8), DARK);
      p.line(19, 26, 21, 22, MID);
    }
    if (kind === 3) {
      p.dither(gx, 10, gw, 28, MID, 0.2);
      p.ring(16, 24, 4, 5, LIGHT);
    }
    if (kind === 4 || kind === 5) {
      // a white lab coat on a hook: somebody hid in here
      p.rect(15, 9, 2, 2, MID);
      p.poly([[11, 12], [21, 12], [23, 34], [9, 34]], WHITE);
      p.line(16, 12, 16, 34, LIGHT);
      p.rect(18, 22, 3, 3, LIGHT); // a pocket
    }
    if (kind !== 5) {
      p.dither(gx, top, gw, 38 - top, WHITE, 0.12);
      p.line(gx + 3, 34, gx + 8, 9, WHITE);
      p.line(gx + 5, 34, gx + 9, 20, LIGHT);
    } else {
      // the glass is up in the cap: the front stands open
      p.rect(4, 4, 24, 2, LIGHT);
    }
    p.rect(gx - 1, top, 1, 38 - top, MID);
    p.rect(gx + gw, top, 1, 38 - top, MID);
  }
  // pipes over the top
  p.rect(0, 2, 4, 2, MID);
  p.rect(28, 2, 4, 2, MID);
  p.outline(BLACK);
  return p;
}

/** The great tank in the experiment chamber (whole, or burst open). */
export function bigTank(burst: boolean): PC {
  const p = new PC(64, 96);
  const r = artRng(920 + (burst ? 1 : 0));
  p.rect(2, 80, 60, 16, DARK);
  p.rect(2, 80, 60, 2, MID);
  for (let x = 6; x < 60; x += 8) p.rect(x, 84, 4, 8, BLACK);
  p.rect(4, 0, 56, 12, DARK);
  p.rect(4, 0, 56, 2, MID);
  for (let x = 8; x < 58; x += 10) p.rect(x, 4, 6, 4, BLACK);
  const gx = 8;
  const gw = 48;
  if (burst) {
    p.rect(gx, 12, gw, 68, BLACK);
    p.poly([[gx, 12], [gx + gw, 12], [gx + gw, 22], [gx + 38, 17], [gx + 30, 30], [gx + 22, 19], [gx + 12, 27], [gx, 18]], LIGHT);
    p.poly([[gx, 80], [gx + gw, 80], [gx + gw, 66], [gx + 36, 72], [gx + 28, 58], [gx + 18, 70], [gx + 8, 62], [gx, 70]], LIGHT);
    p.dither(gx, 12, gw, 68, MID, 0.1, true);
    // the cables that held it, hanging loose
    for (let i = 0; i < 5; i++) {
      let x = gx + 6 + i * 9;
      for (let y = 12; y < 40 + rint(r, 20); y++) {
        x += Math.sin(y * 0.3 + i) * 0.6;
        p.px(Math.round(x), y, i % 2 ? MID : DARK);
      }
    }
  } else {
    p.rect(gx, 12, gw, 68, DARK);
    p.dither(gx, 20, gw, 60, MID, 0.4);
    p.dither(gx, 12, gw, 68, WHITE, 0.08);
    for (let i = 0; i < 5; i++) {
      let x = gx + 6 + i * 9;
      for (let y = 12; y < 48; y++) {
        x += (24 + gx - x) * 0.05;
        p.px(Math.round(x), y, BLACK);
      }
    }
    p.line(gx + 4, 76, gx + 12, 16, WHITE);
    p.line(gx + 7, 76, gx + 13, 40, LIGHT);
  }
  p.rect(gx - 2, 12, 2, 68, MID);
  p.rect(gx + gw, 12, 2, 68, MID);
  p.outline(BLACK);
  return p;
}

/** The vault: an enormous chamber, torn open from the inside. */
export function vaultTank(): PC {
  const p = new PC(112, 112);
  const r = artRng(930);
  // the base: a ring of iron, cracked through
  p.ellipse(56, 100, 52, 11, DARK);
  p.ellipse(56, 98, 46, 8, BLACK);
  p.ring(56, 100, 52, 11, MID);
  // the bars of the cage, bent outward like petals
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const bx = 12 + t * 88;
    const out = (t - 0.5) * 2;
    const bend = Math.abs(out) < 0.35 ? 0 : 1;
    const pts: Pt[] = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const y = 98 - u * 92;
      const push = bend ? Math.sin(u * Math.PI * 0.9) * 22 * Math.sign(out) * (0.5 + Math.abs(out)) : 0;
      pts.push([bx + push, y]);
    }
    // the middle bars are snapped off short
    const keep = Math.abs(out) < 0.35 ? 4 + rint(r, 3) : 12;
    for (let k = 0; k < keep; k++) p.thick(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], i % 2 ? MID : LIGHT, 3);
    if (keep < 12) p.poly([[pts[keep][0] - 2, pts[keep][1]], [pts[keep][0] + 3, pts[keep][1] - 6], [pts[keep][0] + 4, pts[keep][1] + 1]], LIGHT);
  }
  // a crown of iron at the top, ripped and hanging
  p.rect(14, 4, 30, 6, DARK);
  p.rect(70, 4, 28, 6, DARK);
  p.poly([[44, 4], [52, 10], [46, 22], [42, 10]], DARK);
  p.poly([[70, 4], [64, 12], [68, 26], [74, 10]], DARK);
  // gouges across the base: four of them, each as wide as your hand
  for (let i = 0; i < 4; i++) p.thick(28 + i * 9, 92, 40 + i * 9, 106, BLACK, 3);
  // glass everywhere
  for (let i = 0; i < 26; i++) {
    const x = 4 + rint(r, 104);
    const y = 96 + rint(r, 14);
    p.poly([[x, y], [x + 3, y + 1], [x + 1, y + 2]], r() < 0.5 ? WHITE : LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** A hole torn through the wall, big enough to walk through. Beyond it: the forest. */
export function tunnel(): PC {
  const p = new PC(48, 48);
  const r = artRng(940);
  const pts: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    const rr = 20 + (r() - 0.5) * 6;
    pts.push([24 + Math.cos(a) * rr, 44 + Math.sin(a) * rr * 1.6]);
  }
  pts.push([45, 48], [3, 48]);
  p.poly(pts, BLACK);
  // the earth beyond it, and a little moonlight
  p.dither(10, 26, 28, 22, DARK, 0.25, true);
  p.dither(16, 30, 16, 18, MID, 0.12, true);
  for (let i = 0; i < pts.length - 2; i++) p.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], LIGHT, 2);
  for (let i = 0; i < 12; i++) p.rect(rint(r, 44), 40 + rint(r, 7), 3, 2, i % 2 ? MID : DARK);
  p.outline(BLACK);
  return p;
}

/** A steel shutter pulled down over a doorway. */
export function shutter(): PC {
  const p = new PC(16, 16);
  p.rect(0, 0, 16, 16, MID);
  for (let y = 1; y < 16; y += 3) {
    p.rect(0, y, 16, 1, DARK);
    p.rect(0, y + 1, 16, 1, LIGHT);
  }
  p.rect(0, 0, 1, 16, BLACK);
  p.rect(15, 0, 1, 16, BLACK);
  p.rect(5, 13, 6, 2, BLACK); // the handle
  return p;
}

/** Where the tunnel comes out: a burrow torn up through the bank, claw marks round its lip. */
export function burrow(): PC {
  const p = new PC(32, 32);
  const r = artRng(945);
  p.ellipse(16, 22, 15, 10, DARK);
  p.ellipse(16, 22, 13, 8, MID);
  p.ellipse(16, 24, 9, 6, BLACK);
  for (let i = 0; i < 4; i++) p.thick(5 + i * 6, 12, 8 + i * 6, 18, BLACK, 2);
  for (let i = 0; i < 14; i++) p.rect(rint(r, 30), 26 + rint(r, 5), 2, 2, i % 2 ? MID : DARK);
  p.outline(BLACK);
  return p;
}

/** A charging pad in the floor (lit: something is sitting on it, drawing power). */
export function pad(on: boolean): PC {
  const p = new PC(16, 16);
  p.rect(1, 1, 14, 14, DARK);
  p.frame(1, 1, 14, 14, BLACK);
  p.ring(8, 8, 5, 5, on ? WHITE : MID);
  p.ring(8, 8, 3, 3, on ? LIGHT : DARK);
  if (on) p.circle(8, 8, 1, WHITE);
  return p;
}

/** A spirit cell: a heavy canister with a little window (pushable). */
export function cell(lit: boolean): PC {
  const p = new PC(16, 16);
  p.ellipse(8, 14, 6, 2, BLACK);
  p.rect(3, 2, 10, 12, MID);
  p.rect(4, 2, 2, 12, LIGHT);
  p.rect(3, 1, 10, 2, DARK);
  p.rect(6, 6, 4, 5, lit ? WHITE : BLACK);
  if (lit) p.px(7, 7, LIGHT);
  p.rect(3, 12, 10, 1, DARK);
  p.outline(BLACK);
  return p;
}

/** The resonance scanner: an arm on a stand with a dish, and a little screen. */
export function scanner(): PC {
  const p = new PC(32, 32);
  p.rect(4, 22, 24, 10, DARK);
  p.rect(4, 22, 24, 1, MID);
  p.rect(7, 25, 9, 5, BLACK);
  for (let x = 8; x < 15; x++) p.px(x, 27 + ((x % 3) - 1), LIGHT);
  p.rect(20, 25, 2, 2, WHITE);
  p.rect(24, 25, 2, 2, MID);
  p.thick(22, 22, 18, 8, MID, 2);
  p.ellipse(14, 7, 7, 4, LIGHT);
  p.ellipse(14, 8, 5, 2, MID);
  p.px(14, 8, WHITE);
  p.outline(BLACK);
  return p;
}

/** The tuner: an old wave screen and two big dials. */
export function tuner(): PC {
  const p = new PC(32, 32);
  p.rect(2, 4, 28, 28, DARK);
  p.rect(2, 4, 28, 1, MID);
  p.rect(5, 7, 22, 12, BLACK);
  for (let x = 6; x < 26; x++) p.px(x, 13 + Math.round(Math.sin(x * 0.8) * 3), LIGHT);
  for (const x of [10, 22]) {
    p.circle(x, 25, 3, MID);
    p.px(x, 23, WHITE);
  }
  p.rect(14, 23, 4, 4, BLACK);
  p.px(15, 24, WHITE);
  p.outline(BLACK);
  return p;
}

/** The chamber console: the main lever and a row of dead lamps (lit: the power is on). */
export function chamberConsole(lit: boolean): PC {
  const p = new PC(48, 32);
  p.rect(2, 10, 44, 22, DARK);
  p.rect(2, 10, 44, 2, MID);
  p.poly([[2, 10], [8, 2], [40, 2], [46, 10]], MID);
  p.rect(10, 4, 28, 5, BLACK);
  for (let i = 0; i < 6; i++) p.circle(13 + i * 4.4, 6, 1, lit ? WHITE : DARK);
  for (let x = 6; x < 40; x += 4) p.rect(x, 15, 2, 2, lit && x % 8 ? LIGHT : BLACK);
  // the lever
  p.rect(36, 18, 6, 10, BLACK);
  if (lit) {
    p.thick(39, 24, 39, 30, LIGHT, 2);
    p.circle(39, 30, 2, WHITE);
  } else {
    p.thick(39, 24, 39, 14, LIGHT, 2);
    p.circle(39, 13, 2, WHITE);
  }
  p.rect(6, 22, 22, 6, BLACK);
  for (let x = 7; x < 27; x++) p.px(x, 25 + (lit ? Math.round(Math.sin(x) * 2) : 0), lit ? LIGHT : DARK);
  p.outline(BLACK);
  return p;
}

/** The director's wall safe: shut, or standing open. */
export function safe(open: boolean): PC {
  const p = new PC(16, 16);
  p.rect(1, 1, 14, 13, DARK);
  p.frame(1, 1, 14, 13, MID);
  if (open) {
    p.rect(3, 3, 10, 9, BLACK);
    p.rect(12, 2, 3, 11, MID);
  } else {
    p.circle(8, 7, 3, MID);
    p.px(8, 5, WHITE);
    p.rect(11, 6, 2, 3, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ================================================================== pictures (shown close up)

/** The staff photograph from the opening day. At the back, someone in a hood. */
export function photo(): PC {
  const p = new PC(120, 80);
  p.rect(0, 0, 120, 80, LIGHT);
  p.frame(0, 0, 120, 80, BLACK);
  p.frame(3, 3, 114, 74, MID);
  p.rect(5, 5, 110, 70, MID);
  p.dither(5, 5, 110, 40, LIGHT, 0.3);
  // the hillside door behind them
  p.rect(48, 14, 24, 32, DARK);
  p.rect(44, 10, 32, 5, LIGHT);
  const person = (x: number, y: number, s: number, coat: number) => {
    p.circle(x, y, Math.round(3 * s), LIGHT);
    p.poly([[x - 5 * s, y + 4 * s], [x + 5 * s, y + 4 * s], [x + 6 * s, y + 18 * s], [x - 6 * s, y + 18 * s]], coat);
    p.line(x, y + 4 * s, x, y + 18 * s, MID);
  };
  // the back row, then the front row
  for (const x of [22, 38, 82, 98]) person(x, 30, 1, WHITE);
  for (const x of [14, 30, 50, 70, 90, 106]) person(x, 46, 1.1, WHITE);
  // standing a little apart from all of them, half out of the picture: a hood, and nothing in it
  p.poly([[104, 12], [112, 6], [116, 12], [118, 44], [100, 44]], BLACK);
  p.ellipse(110, 15, 4, 5, BLACK);
  p.px(109, 16, DARK);
  // the photograph is old: scratches, a fold
  p.line(60, 5, 58, 75, LIGHT);
  for (let i = 0; i < 20; i++) p.px(6 + ((i * 37) % 108), 6 + ((i * 53) % 68), WHITE);
  return p;
}

/** A sketch pinned up in the office: "our patron", drawn from memory. */
export function patron(): PC {
  const p = new PC(80, 100);
  p.rect(0, 0, 80, 100, WHITE);
  p.frame(0, 0, 80, 100, MID);
  p.rect(38, 2, 4, 4, DARK); // the pin
  // pencil strokes: a tall hooded shape, hands folded, a face that is only shadow
  const r = artRng(950);
  for (let i = 0; i < 260; i++) {
    const y = 14 + r() * 80;
    const half = y < 34 ? (y - 14) * 0.7 + 4 : 14 + (y - 34) * 0.28;
    const x = 40 + (r() - 0.5) * 2 * half;
    p.line(x, y, x + 2, y + 5, r() < 0.7 ? MID : DARK);
  }
  p.ellipse(40, 28, 7, 9, DARK);
  p.dither(33, 20, 14, 16, BLACK, 0.7);
  p.ring(40, 28, 8, 10, MID);
  // the hands
  p.ellipse(36, 62, 3, 2, LIGHT);
  p.ellipse(44, 62, 3, 2, LIGHT);
  p.line(35, 61, 37, 63, MID);
  p.line(43, 61, 45, 63, MID);
  // the ground line, and a few words underneath that the dialogue reads for you
  p.line(10, 94, 70, 94, MID);
  for (const [x, w] of [[22, 10], [34, 8], [44, 14]] as const) p.rect(x, 96, w, 1, DARK);
  return p;
}

/** The lab whiteboard: a graph that climbs and climbs, then falls off a cliff. */
export function graph(): PC {
  const p = new PC(120, 72);
  p.rect(0, 0, 120, 72, WHITE);
  p.frame(0, 0, 120, 72, MID);
  p.line(12, 60, 112, 60, DARK);
  p.line(12, 8, 12, 60, DARK);
  const ys = [56, 54, 50, 47, 41, 34, 26, 18, 12, 10, 58, 59];
  for (let i = 0; i < ys.length - 1; i++) p.thick(14 + i * 9, ys[i], 14 + (i + 1) * 9, ys[i + 1], BLACK, 2);
  // a line across the top, marked in red ink once, now just grey: LIMIT
  for (let x = 14; x < 112; x += 4) p.rect(x, 22, 2, 1, MID);
  for (const [x, w] of [[90, 4], [96, 6]] as const) p.rect(x, 18, w, 1, MID);
  // circled, three times, hard enough to dent the board
  p.ring(104, 12, 9, 7, DARK);
  p.ring(104, 12, 10, 8, DARK);
  p.ring(105, 13, 11, 8, MID);
  for (const [x, w] of [[16, 10], [28, 6], [16, 64]] as const) p.rect(x, 66, w > 20 ? 30 : w, 1, MID);
  return p;
}

// ================================================================== SUBJECT 9

/** The little spirit it used to be: a fox-eared wisp with a metal collar. 16x14 design. */
function smallForm(K0: K, x: number, y: number, pose: number) {
  // pose 0 curled asleep, 1 head up, 2 lying flat (spent)
  if (pose === 2) {
    K0.ell(x, y + 3, 7, 2.6, LIGHT);
    K0.ell(x - 6, y + 2, 3, 2.4, LIGHT);
    K0.poly([[x - 8, y], [x - 9, y - 3], [x - 6, y]], LIGHT);
    K0.line(x - 7, y + 2, x - 5, y + 2, DARK, 0.5);
    K0.rect(x - 4, y + 1, 1.4, 3, MID); // the collar
    wisp(K0, [x + 6, y + 3], [x + 11, y + 1], [x + 13, y - 2], 1.6, LIGHT, WHITE);
    return;
  }
  K0.ell(x, y + 2, 6, 4, LIGHT);
  wisp(K0, [x + 5, y + 3], [x + 9, y - 1], [x + 5, y - 5], 2, LIGHT, WHITE);
  const hy = pose === 1 ? y - 3 : y + 1;
  K0.ell(x - 4, hy, 3.4, 3, WHITE);
  K0.poly([[x - 7, hy - 1], [x - 7, hy - 6], [x - 4.6, hy - 2]], WHITE);
  K0.poly([[x - 3.4, hy - 2], [x - 2, hy - 6], [x - 1, hy - 1]], WHITE);
  if (pose === 1) {
    K0.dot(x - 5, hy, BLACK, 0.8);
    K0.dot(x - 3, hy, BLACK, 0.8);
  } else {
    K0.line(x - 6, hy + 0.4, x - 4.6, hy + 0.4, MID, 0.5);
    K0.line(x - 3.4, hy + 0.4, x - 2, hy + 0.4, MID, 0.5);
  }
  K0.rect(x - 6, hy + 2.4, 5, 1.4, MID);
  K0.dot(x - 3.5, hy + 3, DARK, 0.6);
}

/**
 * SUBJECT 9, facing left. Design box 64x56. A small fox-eared spirit, swollen far past
 * its own shape: a lopsided mass, one enormous arm, cracks of raw light, a collar,
 * cut cables trailing from its back, and its own little head still on top.
 * Poses: 0 stands, 1 roars (the arm up), 2 gathers itself (crouched, glowing),
 * 3 spent (shrunk back to what it was), 4 glitch (losing hold of its shape).
 */
export function subject(k: number, pose: number): PC {
  const K0 = new K(64, 56, k);
  const r = artRng(960 + pose);
  if (pose === 3) {
    smallForm(K0, 34, 48, 2);
    return K0.done();
  }
  const crouch = pose === 2 ? 6 : 0;
  const cy = 32 + crouch;
  // cables trailing behind it, cut off short
  for (let i = 0; i < 4; i++) {
    const sx = 42 + i * 3;
    const sy = cy - 10 + i * 4;
    const pts: Pt[] = [[sx, sy], [sx + 8, sy + 4 - i], [sx + 12 + i * 2, sy + 12]];
    for (let k2 = 0; k2 < 2; k2++) K0.line(pts[k2][0], pts[k2][1], pts[k2 + 1][0], pts[k2 + 1][1], i % 2 ? DARK : BLACK, 1.2);
    K0.rect(pts[2][0] - 1, pts[2][1], 2.4, 2, MID); // a plug
  }
  // the far arm: small, the arm it was born with
  limb(K0, 24, cy - 2, 18, cy + 12 - crouch, 2.2, 1.6, MID);
  // the body: a swollen, lopsided mass
  K0.ell(34, cy, 17, 15, MID);
  K0.ell(42, cy - 6, 10, 10, MID);
  K0.ell(28, cy + 8, 12, 9, MID);
  K0.form(34, cy - 2, 18, 16, [DARK, MID, LIGHT]);
  // legs: short, braced
  limb(K0, 28, cy + 12, 26, 53, 4, 3, MID);
  limb(K0, 40, cy + 12, 42, 53, 4.4, 3.2, DARK);
  K0.ell(25, 53.5, 4, 1.4, DARK);
  K0.ell(43, 53.5, 4, 1.4, DARK);
  // cracks of raw energy all over it
  const cracks = pose === 2 ? 9 : 6;
  for (let i = 0; i < cracks; i++) {
    let x = 24 + r() * 22;
    let y = cy - 10 + r() * 20;
    for (let s = 0; s < 4; s++) {
      const nx = x + (r() - 0.5) * 7;
      const ny = y + 1 + r() * 4;
      K0.line(x, y, nx, ny, WHITE, 0.7);
      x = nx;
      y = ny;
    }
  }
  // the huge arm, with claws
  const arm: Pt[] = pose === 1 ? [[26, cy - 8], [16, cy - 20], [8, cy - 30]] : pose === 2 ? [[26, cy - 4], [14, cy + 2], [6, cy + 12]] : [[26, cy - 6], [14, cy - 2], [8, cy + 10]];
  limb(K0, arm[0][0], arm[0][1], arm[1][0], arm[1][1], 6, 4.8, MID);
  limb(K0, arm[1][0], arm[1][1], arm[2][0], arm[2][1], 4.8, 4.4, MID);
  K0.form(arm[1][0], arm[1][1], 10, 12, [DARK, MID, LIGHT]);
  for (let i = 0; i < 3; i++) {
    const [hx, hy] = arm[2];
    const a = (pose === 1 ? -2.2 : 1.9) + (i - 1) * 0.45;
    K0.line(hx, hy, hx + Math.cos(a) * 7, hy + Math.sin(a) * 7, WHITE, 1.1);
  }
  K0.line(arm[1][0] - 2, arm[1][1] - 2, arm[1][0] + 2, arm[1][1] + 3, WHITE, 0.6);
  // the collar, half buried in the swelling, and its little head on top
  const hx = 30;
  const hy = cy - 16 - (pose === 1 ? 2 : 0);
  K0.ell(hx + 2, hy + 5, 7, 2.4, DARK);
  K0.line(hx - 4, hy + 5, hx + 8, hy + 5, LIGHT, 0.6);
  K0.dot(hx + 2, hy + 5.4, WHITE, 0.8);
  K0.ell(hx, hy, 4.4, 4, WHITE);
  K0.poly([[hx - 4, hy - 1], [hx - 4.6, hy - 8], [hx - 1, hy - 3]], WHITE);
  K0.poly([[hx + 1, hy - 3], [hx + 3.4, hy - 8.4], [hx + 4, hy - 1]], WHITE);
  // its eyes: too bright, and not the same size
  K0.dot(hx - 2, hy, pose === 1 ? BLACK : DARK, 1.2);
  K0.dot(hx + 1.6, hy - 0.4, BLACK, 0.8);
  if (pose === 1) K0.ell(hx - 1, hy + 2.4, 2.4, 1.2, BLACK); // a mouth, far too wide
  // energy spilling off it
  const n = pose === 2 ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const sx = 24 + r() * 24;
    const sy = cy - 14 + r() * 16;
    wisp(K0, [sx, sy], [sx + (r() - 0.5) * 10, sy - 6], [sx + (r() - 0.5) * 14, sy - 12 - r() * 6], 1.6, LIGHT, WHITE);
  }
  if (pose === 2) {
    K0.ell(34, cy - 2, 5, 5, WHITE);
    K0.ell(34, cy - 2, 3, 3, LIGHT);
  }
  const p = K0.done();
  if (pose !== 4) return p;
  // losing hold: slices of it slide out of place, and its old shape shows through
  const o = new PC(p.w, p.h);
  const band = Math.max(2, Math.round(3 * k));
  for (let y = 0; y < p.h; y++) {
    const b = Math.floor(y / band);
    const dx = b % 3 === 0 ? Math.round(3 * k) : b % 5 === 0 ? -Math.round(4 * k) : 0;
    for (let x = 0; x < p.w; x++) {
      const c = p.get(x, y);
      if (c < 0) continue;
      o.px(x + dx, y, b % 4 === 1 ? (c === WHITE ? BLACK : c === BLACK ? WHITE : 4 - c) : c);
    }
  }
  const ghost = new K(64, 56, k);
  smallForm(ghost, 32, 30, 1);
  const g = ghost.done();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) >= 0 && bayer(x, y) < 0.5) o.px(x, y, g.get(x, y));
  return o;
}

/** Overworld frames, all the same size: 0 asleep, 1 awake, 2 swollen, 3 swollen roaring, 4 spent. */
export function subjectOw(f: number): PC {
  const p = new PC(36, 32);
  if (f <= 1) {
    const K0 = new K(36, 32, 1);
    smallForm(K0, 19, 24, f);
    p.blit(K0.done(), 0, 0);
    return p;
  }
  if (f === 4) {
    const K0 = new K(36, 32, 1);
    smallForm(K0, 20, 26, 2);
    p.blit(K0.done(), 0, 0);
    return p;
  }
  const b = subject(0.55, f === 2 ? 0 : 1);
  p.blit(b, Math.round((36 - b.w) / 2), 32 - b.h);
  return p;
}

// ================================================================== the battle arena

/** The experiment chamber: wall panels, a row of tanks, cables hanging from the dark. */
export function labBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(970);
  p.rect(0, 0, 680, 210, BLACK);
  for (let x = 0; x < 680; x += 40) {
    p.rect(x + 1, 30, 38, 180, DARK);
    p.rect(x + 1, 30, 38, 1, MID);
    for (const y of [36, 200]) for (const dx of [4, 34]) p.px(x + dx, y, MID);
  }
  p.rect(0, 120, 680, 4, MID); // the painted stripe
  p.rect(0, 120, 680, 1, LIGHT);
  // pipes across the ceiling
  for (const y of [8, 18]) {
    p.rect(0, y, 680, 5, MID);
    p.rect(0, y, 680, 1, LIGHT);
    for (let x = 30; x < 680; x += 90) p.rect(x, y - 2, 6, 9, DARK);
  }
  // the tanks along the back wall: whole, broken, dark
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 76;
    const broken = i % 3 === 1;
    p.rect(x, 168, 44, 42, DARK);
    p.rect(x, 168, 44, 2, MID);
    p.rect(x + 4, 64, 36, 104, broken ? BLACK : DARK);
    if (!broken) p.dither(x + 4, 80, 36, 88, MID, 0.3);
    else {
      p.poly([[x + 4, 64], [x + 40, 64], [x + 40, 80], [x + 26, 72], [x + 16, 86], [x + 4, 74]], MID);
      p.poly([[x + 4, 168], [x + 40, 168], [x + 40, 150], [x + 28, 158], [x + 18, 144], [x + 4, 156]], MID);
    }
    p.rect(x, 54, 44, 10, DARK);
    p.rect(x, 54, 44, 1, MID);
    p.line(x + 8, 160, x + 14, 70, broken ? DARK : LIGHT);
  }
  // cables hanging down out of the dark
  for (let i = 0; i < 16; i++) {
    let x = r() * 680;
    const len = 30 + r() * 90;
    for (let y = 22; y < 22 + len; y++) {
      x += Math.sin(y * 0.08 + i) * 0.5;
      p.px(Math.round(x), y, i % 2 ? MID : DARK);
    }
    p.rect(Math.round(x) - 1, 22 + Math.round(len), 3, 3, LIGHT);
  }
  // sparks frozen in the air
  for (let i = 0; i < 40; i++) p.px(Math.floor(r() * 680), 30 + Math.floor(r() * 150), WHITE);
  return p;
}
export function labFloorB(): PC {
  const p = new PC(720, 140);
  const r = artRng(971);
  p.rect(0, 0, 720, 140, MID);
  for (let y = 0; y < 140; y += 20) p.rect(0, y, 720, 1, DARK);
  for (let y = 0; y < 140; y += 20) for (let x = (y / 20) % 2 ? 0 : 20; x < 720; x += 40) p.rect(x, y, 1, 20, DARK);
  p.rect(0, 0, 720, 6, DARK);
  p.rect(0, 0, 720, 1, LIGHT);
  for (let i = 0; i < 500; i++) p.px(Math.floor(r() * 720), 6 + Math.floor(r() * 134), r() < 0.5 ? LIGHT : DARK);
  // scorch marks and glass
  for (let i = 0; i < 8; i++) p.dither(Math.floor(r() * 680), 20 + Math.floor(r() * 100), 40, 14, DARK, 0.5);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * 718);
    const y = 8 + Math.floor(r() * 130);
    p.poly([[x, y], [x + 3, y + 1], [x + 1, y + 2]], WHITE);
  }
  return p;
}

/** A spark (for the battle and the cutscenes). */
export function spark(): PC {
  const p = new PC(7, 7);
  p.line(3, 0, 3, 6, LIGHT);
  p.line(0, 3, 6, 3, LIGHT);
  p.px(3, 3, WHITE);
  p.px(1, 1, MID);
  p.px(5, 5, MID);
  return p;
}
/** A crooked bolt of energy. */
export function arc(): PC {
  const p = new PC(16, 48);
  const r = artRng(980);
  let x = 8;
  for (let y = 0; y < 48; y += 4) {
    const nx = 3 + Math.floor(r() * 10);
    p.thick(x, y, nx, y + 4, WHITE, 2);
    p.line(x + 2, y, nx + 2, y + 4, LIGHT);
    x = nx;
  }
  return p;
}

// ================================================================== textures

function add(scene: Phaser.Scene, key: string, pc: PC) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.toCanvas());
}
function addSheet(scene: Phaser.Scene, key: string, frames: PC[]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, sheet(frames).toCanvas())!;
  frames.forEach((f, i) => tex.add(i, 0, i * f.w, 0, f.w, f.h));
}
const range = (n: number) => [...Array(n).keys()];

export function buildLabTextures(scene: Phaser.Scene) {
  add(scene, 'w4_mound', mound());
  add(scene, 'w4_labfront', labFront());
  add(scene, 'w4_vinefall', vineCurtain());
  add(scene, 'w4_brk0', breaker(false));
  add(scene, 'w4_brk1', breaker(true));
  for (let k = 0; k < 6; k++) add(scene, `w4_tank${k}`, tank(k));
  add(scene, 'w4_bigtank', bigTank(false));
  add(scene, 'w4_bigtank_burst', bigTank(true));
  add(scene, 'w4_vault', vaultTank());
  add(scene, 'w4_tunnel', tunnel());
  add(scene, 'w4_shutter', shutter());
  add(scene, 'w4_burrow', burrow());
  add(scene, 'w4_pad0', pad(false));
  add(scene, 'w4_pad1', pad(true));
  add(scene, 'push_cell', cell(false));
  add(scene, 'push_cell_lit', cell(true));
  add(scene, 'w4_scanner', scanner());
  add(scene, 'w4_tuner', tuner());
  add(scene, 'w4_console0', chamberConsole(false));
  add(scene, 'w4_console1', chamberConsole(true));
  add(scene, 'w4_safe0', safe(false));
  add(scene, 'w4_safe1', safe(true));
  add(scene, 'w4_photo', photo());
  add(scene, 'w4_patron', patron());
  add(scene, 'w4_graph', graph());
  // SUBJECT 9
  addSheet(scene, 'sp_subject', range(5).map((f) => subject(2.2, f)));
  addSheet(scene, 'ow_subject', range(5).map((f) => subjectOw(f)));
  add(scene, 'w4b_lab', labBack());
  add(scene, 'w4f_lab', labFloorB());
  add(scene, 'fx_spark', spark());
  add(scene, 'fx_arc', arc());
}
