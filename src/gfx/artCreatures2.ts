import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { CW, CH, type Facing } from './artPeople';

// The four temple creatures. Same format as the five Hollowhaven spirits:
// 48x48, bottom-centred, facing right. Frames 0-3 idle, 4 action, 5 hurt.

const S = 48;

function eye(p: PC, x: number, y: number, r = 2, glint = true) {
  p.ellipse(x, y, r, r + 1, BLACK);
  if (glint) p.px(x - 1, y - 1, WHITE);
}

// ------------------------------------------------------------------ GLOWBELL

/** A tiny jellyfish that floats like a balloon, crackling tentacles below. */
function glowbell(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -3 : pose === 5 ? 2 : [0, -1, -2, -1][ph];
  const cx = 24;
  const top = 6 + bob;
  // the halo of its own light
  p.ellipse(cx, top + 12, 17, 14, DARK);
  p.dither(cx - 17, top - 2, 34, 28, BLACK, 0.55, true);
  // tentacles, swaying, sparking on the action frame
  for (let i = 0; i < 5; i++) {
    const tx = cx - 10 + i * 5;
    for (let y = top + 18; y < 46; y++) {
      const x = tx + Math.round(Math.sin(y * 0.35 + ph * 1.3 + i) * (pose === 4 ? 3 : 1.5));
      p.px(x, y, (y + i) % 3 === 0 ? WHITE : LIGHT);
    }
    if (pose === 4) for (const y of [30, 38]) p.px(tx + (i % 2 ? 3 : -3), top + y - 6, WHITE);
  }
  // the bell: a glowing dome, brightest at its heart
  p.ellipse(cx, top + 12, 13, 10, LIGHT);
  p.rect(cx - 13, top + 12, 27, 6, LIGHT);
  p.shade((x, y) => {
    const d = Math.hypot((x - cx + 3) / 13, (y - top - 9) / 10);
    return d < 1.4 && y < top + 19 ? 1.15 - d * 0.55 : null;
  }, [MID, LIGHT, WHITE]);
  // frilled rim
  for (let x = cx - 13; x <= cx + 13; x += 3) p.ellipse(x, top + 18, 1, 1, WHITE);
  // a bright core and a sweet face
  p.circle(cx - 3, top + 6, 2, WHITE);
  if (pose === 5) {
    p.line(cx - 1, top + 11, cx + 2, top + 12, BLACK);
    p.line(cx + 6, top + 12, cx + 9, top + 11, BLACK);
  } else {
    eye(p, cx + 1, top + 11, 1);
    eye(p, cx + 8, top + 11, 1);
  }
  p.px(cx + 4, top + 15, pose === 4 ? BLACK : MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ HAMMERFIN

/** A playful hammerhead shark with oversized fins, grinning. */
function hammerfin(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -2 : pose === 5 ? 2 : [0, -1, -1, 0][ph];
  const lean = pose === 4 ? 4 : pose === 5 ? -3 : 0;
  const cy = 28 + bob;
  // tail fin, flicking
  const flick = [0, 2, 0, -2][ph];
  p.poly(
    [
      [6 + lean / 2, cy - 2],
      [0, cy - 12 + flick],
      [3, cy + 1],
      [0, cy + 12 - flick],
    ],
    MID
  );
  // body
  p.ellipse(22 + lean / 2, cy, 15, 8, MID);
  // pale belly
  p.ellipse(23 + lean / 2, cy + 4, 12, 4, LIGHT);
  // the hammer head: a wide bar with eyes at the ends
  const hx = 37 + lean;
  p.rect(hx - 3, cy - 12, 7, 22, MID);
  p.ellipse(hx, cy - 11, 4, 3, MID);
  p.ellipse(hx, cy + 9, 4, 3, MID);
  // oversized fins
  p.poly(
    [
      [18 + lean / 2, cy - 6],
      [26 + lean / 2, cy - 6],
      [14 + lean / 2, cy - 22 + (ph % 2)],
    ],
    MID
  ); // dorsal
  p.poly(
    [
      [20 + lean / 2, cy + 5],
      [30 + lean / 2, cy + 5],
      [16 + lean / 2, cy + 16 - (ph % 2)],
    ],
    MID
  ); // pectoral
  p.shade((x, y) => (y < cy + 2 ? 0.95 - (y - cy + 20) / 60 : null), [DARK, MID, LIGHT]);
  // gills
  for (const x of [28, 30, 32]) p.line(x + lean / 2, cy - 3, x + lean / 2, cy + 2, DARK);
  // eyes on the hammer, a huge grin
  if (pose === 5) {
    p.line(hx - 1, cy - 12, hx + 2, cy - 10, BLACK);
    p.line(hx - 1, cy + 8, hx + 2, cy + 10, BLACK);
  } else {
    eye(p, hx + 1, cy - 11, 1);
    eye(p, hx + 1, cy + 9, 1);
  }
  p.line(hx - 6, cy + 3, hx + 2, cy + 3, BLACK);
  if (pose === 4) {
    p.rect(hx - 5, cy + 3, 7, 3, BLACK);
    for (let x = hx - 5; x < hx + 2; x += 2) p.px(x, cy + 3, WHITE); // teeth
  } else p.px(hx - 6, cy + 2, BLACK);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ BUBBLOTL

/** A cheerful axolotl with fluffy gill fronds that puff bubbles. */
function bubblotl(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -2 : pose === 5 ? 2 : [0, -1, -1, 0][ph];
  const cx = 22;
  const base = 44;
  // tail curling behind
  p.poly(
    [
      [cx - 8, base - 10 + bob],
      [cx - 22, base - 14 + bob + [0, 1, 2, 1][ph]],
      [cx - 20, base - 7 + bob],
      [cx - 6, base - 3 + bob],
    ],
    LIGHT
  );
  // body + stubby legs
  p.ellipse(cx, base - 9 + bob, 12, 8, WHITE);
  for (const lx of [cx - 7, cx + 6]) p.rect(lx, base - 3 + bob, 3, 3, LIGHT);
  // big round head
  const hx = cx + 8;
  const hy = base - 22 + bob;
  p.ellipse(hx, hy, 11, 9, WHITE);
  // fluffy gill fronds, three per side, waving
  for (let i = 0; i < 3; i++) {
    const wav = [0, 1, 0, -1][(ph + i) % 4];
    p.thick(hx - 6, hy - 3 + i * 3, hx - 13, hy - 10 + i * 5 + wav, LIGHT, 2);
    p.thick(hx + 4, hy - 7 + i * 1, hx + 6 + i * 3, hy - 16 + i * 2 + wav, LIGHT, 2);
  }
  p.shade((x, y) => (p.get(x, y) === WHITE ? 1.05 - Math.max(0, (x - hx) / 18) - Math.max(0, (y - hy) / 40) : null), [LIGHT, WHITE]);
  // eyes + the famous smile
  if (pose === 5) {
    p.line(hx - 1, hy - 1, hx + 1, hy, BLACK);
    p.line(hx + 5, hy, hx + 7, hy - 1, BLACK);
  } else {
    eye(p, hx, hy - 1, 1);
    eye(p, hx + 6, hy - 1, 1);
  }
  p.line(hx, hy + 4, hx + 3, hy + 5, BLACK);
  p.line(hx + 3, hy + 5, hx + 6, hy + 4, BLACK);
  p.px(hx - 2, hy + 2, MID); // blush, in grey
  p.px(hx + 8, hy + 2, MID);
  // bubbles drifting up from the gills
  const bubbles = pose === 4 ? 4 : 2;
  for (let i = 0; i < bubbles; i++) {
    const by = hy - 16 - ((ph * 3 + i * 7) % 14);
    const bx = hx + 8 + i * 4;
    p.ring(bx, by, 2 + (i % 2), 2 + (i % 2), WHITE);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ GLIDRAY

/** A tiny manta ray gliding above the water, wing tips glowing. */
function glidray(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const flap = pose === 4 ? -5 : pose === 5 ? 3 : [0, -2, -3, -2][ph];
  const cx = 24;
  const cy = 26 + (pose === 5 ? 2 : [0, -1, -2, -1][ph]);
  // a soft shadow on the water below
  p.ellipse(cx, 44, 12, 2, DARK);
  // wings: a wide diamond, tips lifting as it flaps
  p.poly(
    [
      [cx - 22, cy + flap],
      [cx, cy - 7],
      [cx + 22, cy + flap],
      [cx + 6, cy + 6],
      [cx - 6, cy + 6],
    ],
    MID
  );
  p.shade((x, y) => (p.get(x, y) === MID ? 0.9 - (y - cy + 8) / 30 : null), [DARK, MID, LIGHT]);
  // glowing wing tips
  for (const s of [-1, 1]) {
    p.circle(cx + s * 21, cy + flap, 2, WHITE);
    p.px(cx + s * 23, cy + flap - 2, LIGHT);
  }
  // the head lobes and a little whip of a tail
  p.rect(cx + 2, cy - 6, 3, 3, MID);
  p.rect(cx - 4, cy - 6, 3, 3, MID);
  p.line(cx, cy + 6, cx - 3, cy + 15, DARK);
  // face, peering forward (right)
  if (pose === 5) {
    p.line(cx - 4, cy - 2, cx - 2, cy - 1, BLACK);
    p.line(cx + 2, cy - 1, cx + 4, cy - 2, BLACK);
  } else {
    eye(p, cx - 3, cy - 2, 1);
    eye(p, cx + 4, cy - 2, 1);
  }
  p.line(cx - 1, cy + 2, cx + 2, cy + 2, BLACK);
  if (pose === 4) for (let i = 0; i < 4; i++) p.line(cx - 20 + i * 2, cy + 10 + i, cx - 26 + i * 2, cy + 12 + i, LIGHT); // speed lines
  p.outline(BLACK);
  return p;
}

const DRAW: Record<string, (f: number) => PC> = { glowbell, hammerfin, bubblotl, glidray };

export const W2_CREATURE_IDS = Object.keys(DRAW);

export function creatureFrames2(id: string): PC[] {
  return Array.from({ length: 6 }, (_, i) => DRAW[id](i));
}

// ------------------------------------------------------------------ overworld followers (16x20)

function mini(id: string, dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = [0, -1, -1][f];
  const side = dir === 'left';
  if (id === 'glowbell') {
    p.ellipse(8, 7 + bob, 5, 4, LIGHT);
    p.rect(3, 7 + bob, 11, 2, LIGHT);
    p.circle(6, 5 + bob, 1, WHITE);
    for (let i = 0; i < 4; i++) p.line(4 + i * 3, 10 + bob, 4 + i * 3 + (f === 1 ? 1 : -1), 16 + bob, LIGHT);
    if (dir !== 'up') {
      p.px(side ? 5 : 6, 7 + bob, BLACK);
      if (!side) p.px(10, 7 + bob, BLACK);
    }
  } else if (id === 'hammerfin') {
    if (side) {
      p.ellipse(8, 12 + bob, 6, 3, MID);
      p.rect(1, 8 + bob, 2, 9, MID); // the hammer, end-on
      p.poly([[7, 9 + bob], [10, 9 + bob], [8, 4 + bob]], MID);
      p.poly([[14, 12 + bob], [16, 8 + bob], [16, 16 + bob]], MID);
      p.px(2, 9 + bob, BLACK);
      p.line(3, 14 + bob, 6, 14 + bob, BLACK);
    } else {
      p.ellipse(8, 12 + bob, 4, 4, MID);
      p.rect(1, 7 + bob, 15, 3, MID);
      p.poly([[7, 8 + bob], [9, 8 + bob], [8, 2 + bob]], DARK);
      if (dir === 'down') {
        p.px(2, 8 + bob, BLACK);
        p.px(14, 8 + bob, BLACK);
        p.line(6, 13 + bob, 10, 13 + bob, BLACK);
      }
    }
  } else if (id === 'bubblotl') {
    p.ellipse(8, 15 + bob, 5, 3, WHITE);
    p.ellipse(side ? 6 : 8, 9 + bob, 5, 4, WHITE);
    p.line(side ? 2 : 2, 6 + bob, side ? 0 : 1, 3 + bob, LIGHT);
    p.line(side ? 10 : 14, 6 + bob, side ? 12 : 15, 3 + bob, LIGHT);
    if (dir !== 'up') {
      p.px(side ? 3 : 6, 9 + bob, BLACK);
      if (!side) p.px(10, 9 + bob, BLACK);
      p.px(side ? 4 : 8, 11 + bob, BLACK);
    }
    if (f === 1) p.ring(13, 3, 1, 1, WHITE);
  } else {
    // glidray
    const fl = f === 1 ? -2 : 0;
    p.poly([[1, 9 + fl + bob], [8, 6 + bob], [15, 9 + fl + bob], [10, 12 + bob], [6, 12 + bob]], MID);
    p.px(1, 9 + fl + bob, WHITE);
    p.px(15, 9 + fl + bob, WHITE);
    p.line(8, 12 + bob, 8, 16 + bob, DARK);
    if (dir !== 'up') {
      p.px(6, 8 + bob, BLACK);
      p.px(10, 8 + bob, BLACK);
    }
    p.ellipse(8, 18, 4, 1, DARK); // its shadow on the floor
  }
  p.outline(BLACK);
  return p;
}

export function miniSheet2(id: string): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(mini(id, d, f));
  return out;
}
