import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';

// The Cave of the Gods: four colossal statues and four sealed doors, carved
// from pale stone at the bottom of the sea.

export type God = 'zeus' | 'thor' | 'poseidon' | 'athena';
export const GODS: God[] = ['zeus', 'thor', 'poseidon', 'athena'];
export const GOD_NAMES: Record<God, string> = { zeus: 'ZEUS', thor: 'THOR', poseidon: 'POSEIDON', athena: 'ATHENA' };

const SW = 96;
const SH = 208;

/** Stone shading: light falls from the upper left, with chisel grain. */
function stone(p: PC, seed: number) {
  const r = artRng(seed);
  // find each row's extent so the shading wraps around the form
  for (let y = 0; y < p.h; y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < p.w; x++)
      if (p.get(x, y) === LIGHT) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
    if (x0 < 0) continue;
    for (let x = x0; x <= x1; x++) {
      if (p.get(x, y) !== LIGHT) continue;
      const t = (x - x0) / Math.max(1, x1 - x0);
      const v = 1.05 - t * 0.9 - y / (p.h * 4) + (r() - 0.5) * 0.08;
      p.px(x, y, v > 0.82 ? WHITE : v > 0.5 ? LIGHT : v > 0.22 ? MID : DARK);
    }
  }
}

/** The plinth every god stands on, with their name carved in. */
function plinth(p: PC, name: string) {
  const y = SH - 34;
  p.rect(4, y, SW - 8, 34, MID);
  p.rect(0, y, SW, 5, LIGHT);
  p.rect(0, y, SW, 1, WHITE);
  p.rect(2, SH - 6, SW - 4, 6, DARK);
  for (let x = 8; x < SW - 8; x += 12) p.rect(x, y + 7, 1, 20, DARK);
  p.rect(14, y + 11, SW - 28, 13, DARK);
  p.rect(15, y + 12, SW - 30, 11, BLACK);
  drawText(p, SW / 2 - name.length * 3, y + 14, name, LIGHT);
  // barnacles and a crack, the sea has had a long time with it
  p.line(SW - 20, y + 4, SW - 12, SH - 6, BLACK);
  for (const [x, yy] of [
    [10, y + 30],
    [20, y + 28],
    [80, y + 30],
  ])
    p.circle(x, yy, 1, LIGHT);
}

/** A robed body from shoulders to feet. */
function robe(p: PC, cx: number, top: number, bottom: number, wTop: number, wBottom: number) {
  p.poly(
    [
      [cx - wTop, top],
      [cx + wTop, top],
      [cx + wBottom, bottom],
      [cx - wBottom, bottom],
    ],
    LIGHT
  );
}

/** Mark lines that the stone pass should keep dark (drawn after shading). */
function carve(p: PC, pts: [number, number, number, number][]) {
  for (const [a, b, c, d] of pts) p.line(a, b, c, d, DARK);
}

export function statue(god: God): PC {
  const p = new PC(SW, SH);
  const cx = 48;
  const foot = SH - 34;
  if (god === 'zeus') {
    // the king of the gods: robe over one shoulder, a thunderbolt raised to the sky
    robe(p, cx, 74, foot, 18, 26);
    p.ellipse(cx, 70, 22, 10, LIGHT); // shoulders
    p.ellipse(cx, 48, 12, 14, LIGHT); // head
    p.poly(
      [
        [cx - 13, 52],
        [cx + 13, 52],
        [cx + 9, 82],
        [cx, 90],
        [cx - 9, 82],
      ],
      LIGHT
    ); // the great beard
    p.thick(cx + 18, 68, cx + 30, 40, LIGHT, 7); // raised arm
    p.thick(cx + 30, 40, cx + 34, 18, LIGHT, 6);
    p.thick(cx - 20, 70, cx - 28, 110, LIGHT, 7); // lowered arm
    p.ellipse(cx - 28, 114, 5, 6, LIGHT);
    // the thunderbolt
    p.poly(
      [
        [cx + 30, -2 + 6],
        [cx + 42, 4],
        [cx + 34, 12],
        [cx + 44, 14],
        [cx + 30, 32],
        [cx + 34, 18],
        [cx + 26, 16],
      ],
      LIGHT
    );
    stone(p, 1);
    // laurel crown, eyes, beard curls, robe folds
    for (let a = -1.2; a <= 1.2; a += 0.3) p.px(cx + Math.sin(a) * 12, 40 - Math.cos(a) * 6, WHITE);
    p.rect(cx - 6, 46, 4, 2, BLACK);
    p.rect(cx + 2, 46, 4, 2, BLACK);
    carve(p, [
      [cx - 6, 60, cx - 4, 80],
      [cx, 62, cx, 86],
      [cx + 6, 60, cx + 4, 80],
      [cx - 18, 76, cx + 14, 120],
      [cx - 10, 120, cx - 16, foot],
      [cx + 4, 120, cx + 8, foot],
      [cx + 16, 110, cx + 22, foot],
    ]);
    p.line(cx + 34, 12, cx + 30, 26, WHITE);
  } else if (god === 'thor') {
    // the thunderer: winged helm, braided beard, cape, and the hammer
    p.poly(
      [
        [cx - 26, 70],
        [cx + 26, 70],
        [cx + 34, foot],
        [cx - 34, foot],
      ],
      LIGHT
    ); // cape behind
    robe(p, cx, 72, foot - 30, 20, 16); // armored torso
    p.rect(cx - 16, foot - 32, 12, 32, LIGHT); // legs
    p.rect(cx + 4, foot - 32, 12, 32, LIGHT);
    p.ellipse(cx, 70, 24, 10, LIGHT);
    p.ellipse(cx, 48, 12, 14, LIGHT);
    // helmet wings
    p.poly(
      [
        [cx - 12, 40],
        [cx - 30, 22],
        [cx - 22, 40],
      ],
      LIGHT
    );
    p.poly(
      [
        [cx + 12, 40],
        [cx + 30, 22],
        [cx + 22, 40],
      ],
      LIGHT
    );
    // braids
    p.thick(cx - 6, 58, cx - 8, 94, LIGHT, 4);
    p.thick(cx + 6, 58, cx + 8, 94, LIGHT, 4);
    // arms: one gripping the hammer, one fist on the hip
    p.thick(cx + 22, 72, cx + 30, 116, LIGHT, 8);
    p.thick(cx - 22, 72, cx - 26, 104, LIGHT, 8);
    p.thick(cx - 26, 104, cx - 16, 116, LIGHT, 6);
    // Mjolnir
    p.rect(cx + 28, 116, 4, 22, LIGHT);
    p.rect(cx + 16, 136, 28, 18, LIGHT);
    stone(p, 2);
    p.rect(cx - 12, 40, 24, 4, WHITE); // helm band
    p.rect(cx - 6, 47, 4, 2, BLACK);
    p.rect(cx + 2, 47, 4, 2, BLACK);
    for (let y = 60; y < 94; y += 4) {
      p.px(cx - 7, y, DARK);
      p.px(cx + 7, y, DARK);
    }
    carve(p, [
      [cx - 20, 96, cx + 20, 96], // belt
      [cx - 20, 98, cx + 20, 98],
      [cx, foot - 32, cx, foot],
      [cx + 16, 144, cx + 44, 144],
      [cx - 30, 80, cx - 32, foot],
      [cx + 32, 80, cx + 34, 110],
    ]);
    // runes on the hammer face
    p.line(cx + 22, 140, cx + 22, 150, BLACK);
    p.line(cx + 22, 140, cx + 26, 144, BLACK);
    p.line(cx + 34, 140, cx + 38, 150, BLACK);
    p.line(cx + 38, 140, cx + 34, 150, BLACK);
  } else if (god === 'poseidon') {
    // lord of the sea: a crown of spikes, a trident taller than he is, waves at his feet
    p.rect(cx + 30, 6, 4, foot - 6, LIGHT); // trident shaft
    p.rect(cx + 20, 14, 24, 4, LIGHT);
    for (const x of [cx + 20, cx + 30, cx + 40])
      p.poly(
        [
          [x, 16],
          [x + 4, 16],
          [x + 2, 0],
        ],
        LIGHT
      );
    robe(p, cx, 110, foot, 20, 30); // a wrap at the waist
    p.poly(
      [
        [cx - 20, 72],
        [cx + 20, 72],
        [cx + 18, 112],
        [cx - 18, 112],
      ],
      LIGHT
    ); // bare chest
    p.ellipse(cx, 70, 24, 10, LIGHT);
    p.ellipse(cx, 48, 12, 14, LIGHT);
    p.poly(
      [
        [cx - 14, 54],
        [cx + 14, 54],
        [cx + 12, 92],
        [cx, 104],
        [cx - 12, 92],
      ],
      LIGHT
    );
    p.thick(cx + 22, 72, cx + 31, 100, LIGHT, 8); // arm to the trident
    p.thick(cx - 22, 72, cx - 30, 108, LIGHT, 8);
    p.ellipse(cx - 30, 112, 6, 6, LIGHT);
    // the crown
    for (let i = -2; i <= 2; i++)
      p.poly(
        [
          [cx + i * 5 - 2, 38],
          [cx + i * 5 + 2, 38],
          [cx + i * 5, 26 - (2 - Math.abs(i)) * 3],
        ],
        LIGHT
      );
    stone(p, 3);
    p.rect(cx - 6, 47, 4, 2, BLACK);
    p.rect(cx + 2, 47, 4, 2, BLACK);
    carve(p, [
      [cx - 6, 64, cx - 8, 92],
      [cx, 66, cx, 100],
      [cx + 6, 64, cx + 8, 92],
      [cx - 12, 80, cx - 4, 84],
      [cx + 12, 80, cx + 4, 84],
      [cx - 18, 112, cx + 18, 112],
      [cx - 8, 116, cx - 16, foot],
      [cx + 8, 116, cx + 14, foot],
    ]);
    // waves curling around his feet
    for (let x = 6; x < SW - 6; x++) {
      const y = foot - 8 + Math.round(Math.sin(x * 0.35) * 3);
      p.px(x, y, WHITE);
      p.px(x, y + 1, LIGHT);
      if (x % 9 === 0) p.circle(x, y - 2, 2, LIGHT);
    }
  } else {
    // wisdom and war: a crested helm, spear, the round shield, and her owl
    p.rect(cx - 34, 20, 3, foot - 20, LIGHT); // spear
    p.poly(
      [
        [cx - 37, 22],
        [cx - 28, 22],
        [cx - 33, 4],
      ],
      LIGHT
    );
    robe(p, cx, 74, foot, 16, 28);
    p.ellipse(cx, 70, 20, 9, LIGHT);
    p.ellipse(cx, 50, 11, 13, LIGHT);
    // helmet with a tall crest
    p.ellipse(cx, 42, 13, 10, LIGHT);
    p.poly(
      [
        [cx - 4, 34],
        [cx + 16, 14],
        [cx + 22, 20],
        [cx + 8, 38],
      ],
      LIGHT
    );
    p.thick(cx - 18, 72, cx - 32, 96, LIGHT, 7); // arm holding the spear
    // the shield
    p.circle(cx + 22, 112, 20, LIGHT);
    // the owl on her shoulder
    p.ellipse(cx + 18, 62, 7, 8, LIGHT);
    stone(p, 4);
    p.ring(cx + 22, 112, 20, 20, DARK);
    p.ring(cx + 22, 112, 15, 15, MID);
    // the gorgon on the shield
    p.circle(cx + 22, 112, 6, WHITE);
    p.px(cx + 20, 111, BLACK);
    p.px(cx + 24, 111, BLACK);
    for (let a = 0; a < Math.PI * 2; a += 0.5) p.line(cx + 22 + Math.cos(a) * 7, 112 + Math.sin(a) * 7, cx + 22 + Math.cos(a + 0.4) * 11, 112 + Math.sin(a + 0.4) * 11, DARK);
    p.rect(cx - 5, 49, 3, 2, BLACK);
    p.rect(cx + 2, 49, 3, 2, BLACK);
    p.circle(cx + 16, 60, 2, WHITE); // owl eyes
    p.circle(cx + 20, 60, 2, WHITE);
    p.px(cx + 16, 60, BLACK);
    p.px(cx + 20, 60, BLACK);
    p.px(cx + 18, 63, DARK);
    for (let x = cx + 2; x < cx + 22; x += 3) p.px(x, 26 - (x - cx) * 0.6, DARK);
    carve(p, [
      [cx - 10, 80, cx - 16, foot],
      [cx - 2, 80, cx - 4, foot],
      [cx + 6, 132, cx + 10, foot],
      [cx - 16, 96, cx + 2, 96],
    ]);
  }
  plinth(p, GOD_NAMES[god]);
  p.outline(BLACK);
  return p;
}

/** A sealed doorway in the far wall, marked with the god's sign (3x4 tiles). */
export function godDoor(god: God, lit: boolean): PC {
  const p = new PC(48, 64);
  // the arch
  p.rect(0, 14, 48, 50, DARK);
  p.ellipse(24, 16, 24, 16, DARK);
  p.rect(4, 18, 40, 46, MID);
  p.ellipse(24, 18, 20, 14, MID);
  // the slab that seals it
  p.rect(8, 20, 32, 44, LIGHT);
  p.ellipse(24, 22, 16, 10, LIGHT);
  p.dither(8, 14, 32, 50, MID, 0.25, true);
  p.line(24, 12, 24, 64, MID);
  // runes around the edge
  const r = artRng(GOD_NAMES[god].length * 13);
  for (let y = 22; y < 62; y += 6) {
    p.px(6, y, r() < 0.5 ? WHITE : DARK);
    p.px(41, y + 2, r() < 0.5 ? WHITE : DARK);
  }
  const c = lit ? WHITE : DARK;
  const x = 24;
  const y = 38;
  if (god === 'zeus') {
    p.poly(
      [
        [x - 2, y - 12],
        [x + 6, y - 12],
        [x + 1, y - 2],
        [x + 7, y - 2],
        [x - 5, y + 14],
        [x - 1, y + 2],
        [x - 7, y + 2],
      ],
      c
    );
  } else if (god === 'thor') {
    p.rect(x - 9, y - 10, 18, 10, c);
    p.rect(x - 2, y, 4, 14, c);
  } else if (god === 'poseidon') {
    p.rect(x - 1, y - 6, 2, 20, c);
    p.rect(x - 8, y - 6, 16, 2, c);
    for (const dx of [-8, 0, 7]) p.rect(x + dx, y - 14, 2, 8, c);
  } else {
    p.ellipse(x, y, 8, 10, c);
    p.circle(x - 3, y - 3, 2, lit ? BLACK : MID);
    p.circle(x + 3, y - 3, 2, lit ? BLACK : MID);
    p.px(x, y + 1, lit ? BLACK : MID);
  }
  if (lit) p.ring(x, y, 14, 16, WHITE);
  p.outline(BLACK);
  return p;
}

/** A shaft of pale light falling from a crack far above. */
export function lightShaft(w: number, h: number): PC {
  const p = new PC(w, h);
  for (let y = 0; y < h; y++) {
    const half = (w / 2) * (0.35 + (y / h) * 0.65);
    for (let x = Math.round(w / 2 - half); x < w / 2 + half; x++) if ((x + y * 3) % 5 === 0) p.px(x, y, y < h * 0.3 ? WHITE : LIGHT);
  }
  return p;
}

/** The wrecked submarine on the chamber floor, nose-down in the sand. */
export function subWreck(): PC {
  const p = new PC(80, 48);
  p.ellipse(40, 28, 36, 13, MID);
  p.shade((x, y) => (Math.hypot((x - 40) / 36, (y - 28) / 13) < 1 ? 0.95 - (y - 15) / 30 : null), [DARK, MID, LIGHT]);
  p.rect(30, 10, 18, 10, MID);
  p.rect(30, 10, 18, 2, LIGHT);
  for (const x of [18, 32, 48, 62]) {
    p.circle(x, 28, 3, BLACK);
    p.circle(x, 28, 2, LIGHT);
  }
  p.line(54, 18, 66, 36, BLACK); // a crumpled seam
  p.line(58, 18, 70, 34, DARK);
  // the hatch, flung open
  p.ellipse(39, 9, 6, 2, DARK);
  p.rect(44, 2, 3, 8, LIGHT);
  // sand piled at the nose, steam rising
  p.ellipse(8, 40, 12, 6, LIGHT);
  p.ellipse(74, 42, 8, 4, LIGHT);
  p.outline(BLACK);
  return p;
}
