import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer } from '../../gfx/pixel';

// ROGUELIKE: the dungeon's own tiles and furniture, 16x16 unless noted. Three floors, three
// looks: the Hollow Keep (cut stone), the Drowned Gardens (moss and standing water) and the
// Reaper's Domain (bone-pale flags over nothing at all).

const T = 16;

/** A floor tile. `v` picks one of four variations so a room never looks stamped. */
export function floorTile(theme: number, v: number): PC {
  const p = new PC(T, T);
  const r = artRng(theme * 97 + v * 13 + 5);
  if (theme === 0) {
    // cut flagstones with worn joints
    p.rect(0, 0, T, T, MID);
    p.rect(0, 0, T, 1, DARK);
    p.rect(0, 0, 1, T, DARK);
    if (v % 2) p.rect(8, 0, 1, T, DARK);
    else p.rect(0, 8, T, 1, DARK);
    for (let i = 0; i < 7; i++) p.px(1 + Math.floor(r() * 14), 1 + Math.floor(r() * 14), r() < 0.5 ? LIGHT : DARK);
    if (v === 3) p.line(3, 4, 7, 9, DARK);
  } else if (theme === 1) {
    // wet earth: quiet underfoot, with a tuft of moss here and a puddle there
    p.rect(0, 0, T, T, DARK);
    for (let i = 0; i < 5; i++) p.px(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? MID : BLACK);
    if (v === 1) {
      for (const [x, y] of [[4, 10], [10, 5]]) {
        p.px(x, y, MID);
        p.px(x + 1, y - 1, LIGHT);
        p.px(x + 2, y, MID);
      }
    }
    if (v === 2) {
      p.px(6, 7, MID);
      p.px(7, 6, MID);
      p.px(11, 12, MID);
    }
    if (v === 3) {
      p.ellipse(8, 9, 4, 2, BLACK);
      p.rect(6, 8, 3, 1, MID);
    }
  } else {
    // pale flags floating on the dark
    p.rect(0, 0, T, T, BLACK);
    p.rect(1, 1, 14, 14, DARK);
    p.rect(1, 1, 14, 1, MID);
    p.rect(1, 1, 1, 14, MID);
    for (let i = 0; i < 5; i++) p.px(2 + Math.floor(r() * 12), 2 + Math.floor(r() * 12), BLACK);
    if (v === 1) {
      // a skull pressed into the stone
      p.ellipse(8, 7, 3, 3, MID);
      p.px(7, 7, BLACK);
      p.px(9, 7, BLACK);
      p.rect(7, 10, 3, 1, MID);
    }
    if (v === 3) p.line(4, 12, 11, 4, BLACK);
  }
  return p;
}

/** The wall as seen from inside the room: `side` 0 = the far wall (its face is visible), 1 = any other edge. */
export function wallTile(theme: number, side: number): PC {
  const p = new PC(T, T);
  const base = theme === 2 ? DARK : MID;
  const hi = theme === 2 ? MID : LIGHT;
  p.rect(0, 0, T, T, side ? BLACK : base);
  if (!side) {
    // courses of brick
    for (let y = 0; y < T; y += 4) {
      p.rect(0, y + 3, T, 1, BLACK);
      for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) p.rect(x, y, 1, 3, BLACK);
      p.rect(0, y, T, 1, hi);
    }
    p.rect(0, 14, T, 2, BLACK);
    if (theme === 1) for (let x = 1; x < T; x += 3) p.rect(x, 0, 1, 2 + (x % 4), DARK); // hanging moss
    if (theme === 2) {
      p.px(4, 6, WHITE);
      p.px(11, 10, WHITE);
    }
  } else {
    p.rect(0, 0, T, T, BLACK);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (bayer(x, y) < 0.3) p.px(x, y, DARK);
    p.rect(0, 0, T, 1, base);
  }
  return p;
}

/** A pillar or block of wall standing in the room (drawn 16x24 so it rises above its tile). */
export function pillar(theme: number): PC {
  const p = new PC(T, 24);
  const c = theme === 2 ? MID : LIGHT;
  p.rect(1, 0, 14, 3, WHITE);
  p.rect(2, 3, 12, 16, c);
  p.rect(2, 3, 2, 16, WHITE);
  p.rect(11, 3, 3, 16, theme === 2 ? DARK : MID);
  p.rect(1, 19, 14, 4, c);
  p.rect(1, 22, 14, 1, DARK);
  for (let y = 6; y < 18; y += 4) p.rect(5, y, 5, 1, DARK);
  if (theme === 1) {
    p.rect(3, 12, 1, 6, DARK);
    p.rect(9, 8, 1, 9, DARK);
  }
  if (theme === 2) {
    p.ellipse(7, 9, 2, 2, BLACK);
    p.px(7, 12, BLACK);
  }
  p.outline(BLACK);
  return p;
}

export function pit(theme: number): PC {
  const p = new PC(T, T);
  p.rect(0, 0, T, T, BLACK);
  if (theme === 1) {
    // standing water
    for (let y = 2; y < T; y += 4) for (let x = (y % 8 ? 0 : 3); x < T; x += 7) p.rect(x, y, 4, 1, DARK);
    p.px(5, 6, MID);
    p.px(11, 11, MID);
  } else {
    p.rect(0, 0, T, 2, DARK);
    for (let x = 0; x < T; x += 3) p.px(x, 2, DARK);
    if (theme === 2) {
      p.px(4, 9, DARK);
      p.px(10, 6, MID);
      p.px(12, 12, DARK);
    }
  }
  return p;
}

export function rubble(): PC {
  const p = new PC(T, T);
  for (const [x, y, r] of [[4, 11, 2], [9, 12, 3], [12, 9, 1], [6, 8, 1]]) {
    p.ellipse(x, y, r, Math.max(1, r - 1), MID);
    p.px(x - 1, y - 1, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** A doorway in the far wall: 0 open, 1 barred. (Side and near doors are drawn as gaps by the room itself.) */
export function door(barred: number): PC {
  const p = new PC(T, T);
  p.rect(0, 0, T, T, MID);
  p.rect(2, 2, 12, 14, BLACK);
  p.rect(1, 1, 14, 1, WHITE);
  p.rect(1, 1, 1, 15, LIGHT);
  p.rect(14, 1, 1, 15, DARK);
  if (barred) {
    for (let x = 3; x < 14; x += 3) p.rect(x, 2, 1, 14, LIGHT);
    p.rect(2, 8, 12, 1, LIGHT);
  } else {
    p.px(5, 6, DARK);
    p.px(9, 11, DARK);
  }
  return p;
}

export function chest(open: number): PC {
  const p = new PC(T, T);
  if (open) {
    p.rect(2, 1, 12, 5, MID);
    p.rect(2, 1, 12, 1, LIGHT);
    p.rect(3, 6, 10, 2, BLACK);
    p.px(6, 6, WHITE);
    p.px(10, 7, WHITE);
  } else {
    p.rect(2, 4, 12, 5, LIGHT);
    p.rect(2, 4, 12, 1, WHITE);
    p.rect(2, 8, 12, 1, DARK);
  }
  p.rect(2, 9, 12, 6, MID);
  p.rect(2, 9, 2, 6, LIGHT);
  p.rect(12, 9, 2, 6, DARK);
  p.rect(7, 8, 2, 4, WHITE);
  p.px(7, 10, BLACK);
  p.outline(BLACK);
  return p;
}

/** A fire to rest at: three frames of flame, and a fourth burnt down to embers. */
export function fire(f: number): PC {
  const p = new PC(T, 20);
  p.line(3, 18, 12, 15, MID);
  p.line(3, 15, 12, 18, DARK);
  if (f === 3) {
    p.px(6, 15, LIGHT);
    p.px(9, 16, MID);
    p.outline(BLACK);
    return p;
  }
  const h = [9, 11, 8][f];
  p.poly([[4, 15], [8, 15 - h], [11, 15]], LIGHT);
  p.poly([[6, 15], [8 + (f - 1), 15 - h + 4], [10, 15]], WHITE);
  p.px(4 + f * 2, 15 - h - 1, LIGHT);
  p.px(11 - f, 15 - h + 1, MID);
  p.outline(BLACK);
  return p;
}

export function plate(down: number): PC {
  const p = new PC(T, T);
  p.rect(2, 3 + down, 12, 10, down ? MID : LIGHT);
  p.rect(2, 3 + down, 12, 1, down ? LIGHT : WHITE);
  if (!down) p.rect(2, 12, 12, 1, DARK);
  p.ring(8, 8 + down, 3, 3, down ? WHITE : DARK);
  p.outline(BLACK);
  return p;
}

export function block(): PC {
  const p = new PC(T, 20);
  p.rect(1, 0, 14, 6, WHITE);
  p.rect(1, 6, 14, 13, LIGHT);
  p.rect(12, 6, 3, 13, MID);
  p.rect(1, 18, 14, 1, DARK);
  p.frame(4, 9, 8, 7, MID);
  p.px(7, 12, DARK);
  p.px(8, 12, DARK);
  p.outline(BLACK);
  return p;
}

const SYMBOLS: string[][] = [
  ['..4..', '.444.', '44444', '.444.', '..4..'], // diamond
  ['4...4', '.4.4.', '..4..', '.4.4.', '4...4'], // cross
  ['.444.', '4...4', '4...4', '4...4', '.444.'], // ring
  ['44444', '....4', '.444.', '4....', '44444'], // serpent
  ['..4..', '..4..', '44444', '..4..', '..4..'], // star
  ['4.4.4', '.....', '4.4.4', '.....', '4.4.4'], // dots
];

/** A floor symbol for the sequence puzzle: `lit` 0 dark, 1 lit. */
export function symbol(i: number, lit: number): PC {
  const p = new PC(T, T);
  p.rect(1, 1, 14, 14, lit ? LIGHT : DARK);
  p.frame(1, 1, 14, 14, lit ? WHITE : MID);
  SYMBOLS[i % SYMBOLS.length].forEach((row, y) => {
    for (let x = 0; x < 5; x++) if (row[x] === '4') p.rect(3 + x * 2, 3 + y * 2, 2, 2, lit ? BLACK : MID);
  });
  return p;
}

export function obelisk(): PC {
  const p = new PC(T, 28);
  p.poly([[5, 2], [8, 0], [11, 2], [12, 24], [4, 24]], LIGHT);
  p.poly([[5, 2], [8, 0], [8, 24], [4, 24]], WHITE);
  p.rect(2, 24, 12, 3, MID);
  for (let y = 6; y < 22; y += 5) {
    p.rect(6, y, 4, 1, DARK);
    p.px(8, y + 2, DARK);
  }
  p.outline(BLACK);
  return p;
}

export function lamp(on: number): PC {
  const p = new PC(T, 24);
  p.rect(6, 12, 4, 9, MID);
  p.rect(4, 20, 8, 3, LIGHT);
  p.rect(4, 4, 8, 9, on ? WHITE : DARK);
  p.frame(4, 4, 8, 9, on ? LIGHT : MID);
  p.rect(5, 2, 6, 2, MID);
  if (on) {
    p.px(8, 8, LIGHT);
    for (const [x, y] of [[1, 8], [14, 8], [8, 0], [2, 3], [13, 3]]) p.px(x, y, WHITE);
  } else p.px(8, 9, BLACK);
  p.outline(BLACK);
  return p;
}

/** A standing mirror: 0 leans like '/', 1 like '\\'. */
export function mirror(o: number): PC {
  const p = new PC(T, 20);
  p.rect(6, 15, 4, 4, MID);
  for (let i = 0; i < 12; i++) {
    const x = o ? 2 + i : 13 - i;
    p.rect(x, 2 + i, 2, 2, WHITE);
    p.px(x + (o ? 1 : 0), 3 + i, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

export function emitter(): PC {
  const p = new PC(T, T);
  p.rect(1, 3, 11, 10, MID);
  p.rect(1, 3, 11, 2, LIGHT);
  p.rect(12, 6, 3, 4, WHITE);
  p.ellipse(6, 8, 2, 2, WHITE);
  p.outline(BLACK);
  return p;
}

export function crystal(lit: number): PC {
  const p = new PC(T, 24);
  p.rect(4, 19, 8, 4, MID);
  p.poly([[8, 1], [12, 8], [10, 19], [6, 19], [4, 8]], lit ? WHITE : MID);
  p.poly([[8, 1], [8, 19], [6, 19], [4, 8]], lit ? WHITE : LIGHT);
  p.line(8, 2, 8, 18, lit ? LIGHT : DARK);
  if (lit) for (const [x, y] of [[1, 5], [14, 6], [2, 14], [14, 15], [8, 0]]) p.px(x, y, WHITE);
  p.outline(BLACK);
  return p;
}

export function floorSwitch(down: number): PC {
  const p = new PC(T, T);
  p.ellipse(8, 9, 6, 5, down ? DARK : MID);
  p.ellipse(8, 8 + down, 4, 3, down ? WHITE : LIGHT);
  if (down) p.px(8, 9, LIGHT);
  p.outline(BLACK);
  return p;
}

/** Map icons, 7x5: one per kind of room. */
export const MAP_ICONS: Record<string, string[]> = {
  boss: ['4.4.4', '44444', '4.4.4', '.444.', '.4.4.'],
  elite: ['4...4', '44.44', '.444.', '44.44', '4...4'],
  treasure: ['.444.', '44444', '4.4.4', '44444', '.....'],
  puzzle: ['.444.', '...4.', '..4..', '.....', '..4..'],
  rest: ['..4..', '.444.', '..4..', '.4.4.', '4...4'],
  shop: ['.4.4.', '44444', '.4.4.', '44444', '.4.4.'],
};
