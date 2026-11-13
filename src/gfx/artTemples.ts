import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { drawText } from './fontData';

// Props for the four god temples, the vault, and the escape.

// ------------------------------------------------------------------ Zeus: conductors

/** Arms a conductor piece has at rotation 0, as [up, right, down, left]. */
export const CONDUCTOR_ARMS: Record<string, boolean[]> = {
  S: [true, false, true, false],
  L: [true, true, false, false],
  T: [true, true, false, true],
};

/** Rotate an arm list by `rot` quarter-turns clockwise. */
export function armsAt(type: string, rot: number): boolean[] {
  const a = CONDUCTOR_ARMS[type];
  return [0, 1, 2, 3].map((d) => a[(d - rot + 8) % 4]);
}

/** A stone conductor pillar (16x32), its copper arms on top. Lit: white-hot with current. */
export function conductor(type: string, rot: number, lit: boolean): PC {
  const p = new PC(16, 32);
  p.rect(3, 12, 10, 18, MID);
  p.rect(3, 12, 2, 18, LIGHT);
  p.rect(11, 12, 2, 18, DARK);
  p.rect(2, 28, 12, 4, DARK);
  for (let y = 15; y < 28; y += 4) p.px(8, y, DARK);
  // the cap: a disc seen from above
  p.ellipse(8, 9, 7, 5, lit ? LIGHT : DARK);
  p.ring(8, 9, 7, 5, BLACK);
  const arms = armsAt(type, rot);
  const c = lit ? WHITE : MID;
  const ends: [number, number][] = [
    [8, 4],
    [15, 9],
    [8, 14],
    [1, 9],
  ];
  arms.forEach((on, d) => {
    if (on) p.thick(8, 9, ends[d][0], ends[d][1], c, 2);
  });
  p.circle(8, 9, 2, lit ? WHITE : LIGHT);
  if (lit) {
    p.px(3, 3, WHITE);
    p.px(13, 5, LIGHT);
    p.px(2, 13, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** The pillar that lightning strikes (16x48): a tall rod with an orb. */
export function lightningSource(lit: boolean): PC {
  const p = new PC(16, 48);
  p.rect(4, 14, 8, 32, MID);
  p.rect(4, 14, 2, 32, LIGHT);
  p.rect(2, 42, 12, 6, DARK);
  p.rect(7, 2, 2, 12, LIGHT);
  p.circle(8, 4, 3, lit ? WHITE : LIGHT);
  for (let y = 18; y < 42; y += 6) p.line(5, y, 10, y + 3, DARK);
  if (lit) for (const [x, y] of [[2, 1], [14, 3], [1, 8], [15, 10]]) p.px(x, y, WHITE);
  p.outline(BLACK);
  return p;
}

/** The sealed exit: a doorway full of crackling light (32x48). Open: just a dark arch. */
export function stormBarrier(open: boolean, f: number): PC {
  const p = new PC(32, 48);
  p.rect(0, 6, 32, 42, DARK);
  p.ellipse(16, 8, 16, 8, DARK);
  p.rect(4, 10, 24, 38, BLACK);
  p.ellipse(16, 10, 12, 6, BLACK);
  if (!open) {
    for (let k = 0; k < 4; k++) {
      let x = 6 + k * 6 + ((f + k) % 2) * 2;
      for (let y = 8; y < 48; y += 3) {
        const nx = x + (((y + f * 3 + k) % 4) - 1.5) * 1.5;
        p.line(x, y, nx, y + 3, k % 2 ? WHITE : LIGHT);
        x = Math.max(5, Math.min(26, nx));
      }
    }
  }
  drawText(p, 13, 0, 'Z', LIGHT, 0);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ Thor

/** The legendary hammer, buried head-first in a cracked dais (48x48). */
export function thorHammer(present: boolean, lit: boolean): PC {
  const p = new PC(48, 48);
  p.ellipse(24, 40, 22, 7, DARK);
  p.ellipse(24, 38, 20, 5, MID);
  for (const [a, b] of [[8, 36], [40, 38], [20, 44]]) p.line(24, 39, a, b, BLACK);
  if (present) {
    p.rect(14, 26, 20, 12, LIGHT); // the head, half sunk
    p.rect(14, 26, 20, 2, WHITE);
    p.rect(14, 34, 20, 4, MID);
    p.rect(22, 2, 4, 25, MID); // the handle
    p.rect(22, 2, 1, 25, LIGHT);
    for (let y = 6; y < 24; y += 3) p.rect(22, y, 4, 1, DARK); // leather wrap
    p.rect(21, 0, 6, 3, DARK);
    p.line(18, 30, 22, 30, DARK);
    p.line(26, 30, 30, 32, DARK);
    if (lit) for (const [x, y] of [[10, 22], [38, 24], [24, 0], [12, 30], [36, 30]]) p.px(x, y, WHITE);
  } else p.rect(16, 34, 16, 4, BLACK);
  p.outline(BLACK);
  return p;
}

/** One of the three rune stones that show a mechanism is done (16x24). */
export function runeStone(n: number, lit: boolean): PC {
  const p = new PC(16, 24);
  p.rect(2, 4, 12, 18, MID);
  p.rect(2, 2, 12, 3, LIGHT);
  p.rect(1, 20, 14, 4, DARK);
  const c = lit ? WHITE : DARK;
  if (n === 0) p.rect(5, 9, 6, 6, c);
  else if (n === 1) {
    p.rect(7, 7, 2, 10, c);
    p.rect(4, 7, 8, 2, c);
  } else {
    p.line(9, 6, 6, 11, c);
    p.line(6, 11, 10, 11, c);
    p.line(10, 11, 7, 17, c);
  }
  if (lit) p.ring(8, 12, 6, 7, LIGHT);
  p.outline(BLACK);
  return p;
}

/** Pushable things: a stone block, a copper orb, a wooden crate (16x20, bottom-anchored). */
export function pushable(kind: 'block' | 'orb' | 'crate'): PC {
  const p = new PC(16, 20);
  if (kind === 'block') {
    p.rect(1, 6, 14, 14, MID);
    p.rect(1, 4, 14, 3, LIGHT);
    p.rect(13, 6, 2, 14, DARK);
    p.line(4, 10, 8, 14, DARK);
    p.rect(5, 12, 4, 2, DARK);
  } else if (kind === 'orb') {
    p.ellipse(8, 18, 6, 2, DARK);
    p.circle(8, 12, 6, MID);
    p.circle(6, 10, 2, WHITE);
    p.ring(8, 12, 6, 6, LIGHT);
    p.line(2, 12, 14, 12, DARK);
  } else {
    p.rect(1, 6, 14, 14, MID);
    p.rect(1, 6, 14, 2, LIGHT);
    for (const y of [11, 16]) p.rect(1, y, 14, 1, DARK);
    p.line(2, 8, 14, 19, DARK);
    p.line(14, 8, 2, 19, DARK);
  }
  p.outline(BLACK);
  return p;
}

/** A bronze gong on a frame (32x32): strike it to call the storm. */
export function gong(): PC {
  const p = new PC(32, 32);
  p.rect(2, 2, 2, 30, DARK);
  p.rect(28, 2, 2, 30, DARK);
  p.rect(2, 2, 28, 3, MID);
  p.circle(16, 17, 10, MID);
  p.ring(16, 17, 10, 10, LIGHT);
  p.ring(16, 17, 6, 6, DARK);
  p.circle(13, 14, 2, WHITE);
  p.line(10, 5, 12, 8, LIGHT);
  p.line(22, 5, 20, 8, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A huge lightning bolt carved into the wall (48x48). Lit: blazing. */
export function boltSymbol(lit: boolean): PC {
  const p = new PC(48, 48);
  p.rect(0, 0, 48, 48, DARK);
  p.frame(0, 0, 48, 48, MID);
  p.poly(
    [
      [28, 3],
      [12, 26],
      [22, 26],
      [16, 45],
      [36, 18],
      [26, 18],
      [32, 3],
    ],
    lit ? WHITE : MID
  );
  if (lit) p.ring(24, 24, 22, 22, LIGHT);
  p.outline(BLACK);
  return p;
}

/** The cracked wall (48x48) and what is left of it after the hammer (rubble). */
export function crackedWall(broken: boolean): PC {
  const p = new PC(48, 48);
  if (!broken) {
    p.rect(0, 0, 48, 48, DARK);
    for (let y = 0; y < 48; y += 8) {
      p.rect(0, y, 48, 1, BLACK);
      for (let x = (y / 8) % 2 ? 6 : 0; x < 48; x += 12) p.rect(x, y, 1, 8, BLACK);
    }
    p.thick(24, 2, 18, 18, BLACK, 2);
    p.thick(18, 18, 28, 30, BLACK, 2);
    p.thick(28, 30, 22, 46, BLACK, 2);
    p.thick(18, 18, 6, 24, BLACK, 1);
    p.thick(28, 30, 42, 28, BLACK, 1);
    p.px(30, 31, LIGHT);
  } else {
    for (let i = 0; i < 14; i++) p.rect(2 + ((i * 7) % 40), 38 + (i % 3) * 3, 5, 3, i % 2 ? MID : DARK);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ Poseidon

export function tideWheel(high: boolean): PC {
  const p = new PC(32, 32);
  p.rect(14, 14, 4, 18, DARK);
  p.ring(16, 13, 11, 11, MID);
  p.ring(16, 13, 10, 10, LIGHT);
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 + (high ? 0.5 : 0);
    p.line(16, 13, 16 + Math.cos(ang) * 10, 13 + Math.sin(ang) * 10, MID);
  }
  p.circle(16, 13, 3, high ? WHITE : DARK);
  // a little wave mark shows which way it is set
  for (let x = 8; x < 24; x++) p.px(x, high ? 2 + Math.round(Math.sin(x)) : 29 + Math.round(Math.sin(x)), WHITE);
  p.outline(BLACK);
  return p;
}

export function sluiceLever(open: boolean): PC {
  const p = new PC(16, 24);
  p.rect(3, 16, 10, 8, DARK);
  p.rect(3, 16, 10, 2, MID);
  p.thick(8, 17, open ? 13 : 3, 4, LIGHT, 2);
  p.circle(open ? 13 : 3, 4, 2, WHITE);
  p.outline(BLACK);
  return p;
}

/** A statue of something from the sea (32x48): fish, crab, seahorse. */
/**
 * Poseidon's temple statues (32x48), on a stone plinth.
 * 0, 1: a sea serpent coiled around a trident, jaws open (1 faces the other way).
 * 2: a seahorse rising from a scallop shell (the statue that rewinds the waters).
 */
export function seaStatue(kind: number): PC {
  const p = new PC(32, 48);
  p.rect(4, 38, 24, 10, MID);
  p.rect(2, 36, 28, 3, LIGHT);
  p.rect(4, 39, 24, 1, DARK);
  if (kind === 2) {
    // the scallop shell
    p.ellipse(16, 34, 11, 4, LIGHT);
    for (let i = -4; i <= 4; i++) p.line(16, 37, 16 + i * 2.6, 31, MID);
    p.ellipse(16, 30, 9, 2, LIGHT);
    // the curled tail, the ridged belly, the long snout and crest
    p.ring(13, 30, 3, 3, LIGHT);
    p.thick(15, 28, 18, 23, LIGHT, 3);
    p.ellipse(18, 18, 5, 7, LIGHT);
    for (let y = 13; y < 25; y += 3) p.line(14, y, 17, y + 1, MID);
    p.poly([[22, 14], [26, 17], [22, 21]], MID); // dorsal fin
    p.ellipse(17, 9, 4, 3, LIGHT);
    p.thick(14, 9, 8, 11, LIGHT, 2); // snout
    for (const x of [16, 18, 20]) p.px(x, 5, LIGHT); // crest spikes
    p.px(17, 8, BLACK);
  } else {
    const dir = kind === 1 ? -1 : 1;
    const X = (x: number) => (dir === 1 ? x : 31 - x);
    // the coil behind the shaft
    const coil = (front: boolean) => {
      for (let y = 15; y <= 34; y++) {
        const ph = (y - 15) * 0.42;
        if (Math.cos(ph) > 0 !== front) continue;
        p.circle(X(16 + Math.sin(ph) * 7), y, 2.5, LIGHT);
      }
    };
    coil(false);
    // the trident: shaft, crossbar and three barbed tines
    p.rect(15, 8, 2, 29, MID);
    p.rect(15, 8, 1, 29, LIGHT);
    p.rect(10, 9, 12, 2, MID);
    for (const x of [10, 15, 20]) {
      p.rect(x, 2, 2, 8, LIGHT);
      p.poly([[x - 1, 3], [x + 1, 0], [x + 3, 3]], LIGHT);
    }
    coil(true);
    // the serpent's head rearing out to one side, jaws wide open
    p.thick(X(20), 15, X(23), 13, LIGHT, 3); // neck
    p.ellipse(X(24), 11, 3, 3, LIGHT);
    p.poly([[X(25), 9], [X(29), 6], [X(28), 10]], LIGHT); // upper jaw
    p.poly([[X(25), 13], [X(29), 16], [X(27), 13]], LIGHT); // lower jaw
    p.poly([[X(26), 10], [X(29), 8], [X(29), 14], [X(26), 12]], BLACK); // the open mouth
    p.px(X(28), 9, WHITE);
    p.px(X(28), 13, WHITE); // fangs
    p.px(X(23), 10, BLACK); // eye
    for (const y of [20, 26, 32]) p.px(X(16 + Math.sin((y - 15) * 0.42) * 7), y, MID); // scales
    // the tail flicks around the foot of the trident
    p.thick(X(12), 35, X(7), 33, LIGHT, 2);
  }
  p.shade((x, y) => (p.get(x, y) === LIGHT && y < 36 ? 1.05 - x / 40 : null), [MID, LIGHT, WHITE]);
  p.outline(BLACK);
  return p;
}

/** A gate in the basin wall (32x32): a heavy grille (shut) or an open dark arch. */
export function seaGate(open: boolean): PC {
  const p = new PC(32, 32);
  p.rect(0, 0, 32, 32, DARK);
  p.rect(4, 6, 24, 26, BLACK);
  p.ellipse(16, 6, 12, 5, BLACK);
  if (!open) for (let x = 6; x < 28; x += 4) p.rect(x, 3, 2, 29, MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ Athena

export const ANIMALS = ['owl', 'snake', 'eagle', 'lion'] as const;

/** One of the four guardian statues (32x48). Awake: their eyes burn white. */
export function animalStatue(kind: string, awake: boolean): PC {
  const p = new PC(32, 48);
  p.rect(3, 38, 26, 10, MID);
  p.rect(1, 36, 30, 3, LIGHT);
  const E = awake ? WHITE : DARK;
  if (kind === 'owl') {
    p.ellipse(16, 22, 10, 13, LIGHT);
    p.poly([[7, 10], [10, 14], [12, 9]], LIGHT);
    p.poly([[25, 10], [22, 14], [20, 9]], LIGHT);
    p.circle(12, 17, 3, MID);
    p.circle(20, 17, 3, MID);
    p.circle(12, 17, 1, E);
    p.circle(20, 17, 1, E);
    p.poly([[15, 20], [17, 20], [16, 23]], DARK);
  } else if (kind === 'snake') {
    p.ellipse(16, 32, 12, 4, LIGHT);
    p.ellipse(16, 27, 9, 3, LIGHT);
    p.thick(16, 26, 13, 12, LIGHT, 5);
    p.ellipse(16, 10, 5, 4, LIGHT);
    p.px(14, 9, E);
    p.px(18, 9, E);
    p.line(16, 14, 16, 17, DARK);
  } else if (kind === 'eagle') {
    p.poly([[16, 12], [1, 6], [6, 24], [16, 30], [26, 24], [31, 6]], LIGHT);
    p.ellipse(16, 12, 4, 5, LIGHT);
    p.poly([[18, 12], [22, 14], [18, 15]], MID);
    p.px(17, 10, E);
    for (let x = 4; x < 28; x += 4) p.line(x, 10 + Math.abs(16 - x) / 3, x + 1, 22, MID);
  } else {
    p.ellipse(16, 28, 12, 8, LIGHT);
    p.circle(16, 16, 9, MID); // mane
    p.circle(16, 17, 6, LIGHT);
    p.px(13, 15, E);
    p.px(19, 15, E);
    p.rect(14, 20, 4, 2, DARK);
    for (let a = 0; a < 12; a++) p.px(16 + Math.cos(a / 2) * 9, 16 + Math.sin(a / 2) * 9, DARK);
  }
  p.shade((x, y) => (p.get(x, y) === LIGHT && y < 36 ? 1.08 - x / 36 : null), [MID, LIGHT, WHITE]);
  if (awake) p.ring(16, 18, 15, 17, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A lectern holding an open scroll (16x24). */
export function lectern(): PC {
  const p = new PC(16, 24);
  p.rect(6, 10, 4, 12, DARK);
  p.rect(3, 20, 10, 4, MID);
  p.poly([[1, 4], [15, 4], [13, 11], [3, 11]], MID);
  p.rect(3, 5, 10, 5, WHITE);
  for (let y = 6; y < 10; y += 2) p.line(4, y, 11, y, MID);
  p.outline(BLACK);
  return p;
}

/** Athena's great door (48x48): sealed with an owl, or open. */
export function athenaDoor(open: boolean): PC {
  const p = new PC(48, 48);
  p.rect(0, 8, 48, 40, MID);
  p.ellipse(24, 10, 24, 10, MID);
  p.rect(6, 12, 36, 36, open ? BLACK : LIGHT);
  p.ellipse(24, 13, 18, 8, open ? BLACK : LIGHT);
  if (!open) {
    p.line(24, 6, 24, 48, MID);
    p.circle(24, 24, 7, MID);
    p.circle(21, 22, 2, DARK);
    p.circle(27, 22, 2, DARK);
  }
  p.outline(BLACK);
  return p;
}

/** A sliding bookcase (32x32): closed, or shifted aside to show a passage. */
export function bookcase(): PC {
  const p = new PC(32, 32);
  p.rect(0, 0, 32, 32, DARK);
  for (const y of [3, 12, 21]) {
    for (let x = 2; x < 30; x += 3) p.rect(x, y, 2, 7, x % 2 ? MID : LIGHT);
    p.rect(1, y + 7, 30, 1, BLACK);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the escape

/** A boulder pile that has fallen across a corridor (16x24). */
export function boulders(): PC {
  const p = new PC(16, 24);
  p.circle(5, 17, 5, MID);
  p.circle(12, 18, 4, DARK);
  p.circle(8, 10, 5, MID);
  p.circle(6, 8, 1, LIGHT);
  p.circle(12, 13, 2, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A god's door in the Cave of the Gods, its slab gone: a black arch (48x64). */
export function openGodDoor(): PC {
  const p = new PC(48, 64);
  p.rect(0, 14, 48, 50, DARK);
  p.ellipse(24, 16, 24, 16, DARK);
  p.rect(4, 18, 40, 46, MID);
  p.ellipse(24, 18, 20, 14, MID);
  p.rect(8, 20, 32, 44, BLACK);
  p.ellipse(24, 22, 16, 10, BLACK);
  p.dither(8, 52, 32, 12, DARK, 0.2);
  p.outline(BLACK);
  return p;
}
