import { MapBuilder } from './mapdef';
import { T, D } from './tiles';

// Interiors, dungeons and mazes are authored as ASCII art: one character per tile.

export interface Style {
  floor: number;
  floor2: number;
  wall: number;
  wallLow: number;
}

export const STYLES: Record<string, Style> = {
  house: { floor: T.WOOD, floor2: T.WOOD2, wall: T.WALL, wallLow: T.WALL_LOW },
  shop: { floor: T.CHECKER, floor2: T.WOOD, wall: T.WALLS, wallLow: T.WALLS_LOW },
  mansion: { floor: T.STONE, floor2: T.WOOD2, wall: T.WALLM, wallLow: T.WALLM_LOW },
  psychic: { floor: T.CARPET, floor2: T.WOOD2, wall: T.WALLM, wallLow: T.WALLM_LOW },
  barn: { floor: T.HAYDIRT, floor2: T.DIRT, wall: T.WALL, wallLow: T.WALL_LOW },
  bath: { floor: T.BATHTILE, floor2: T.CHECKER, wall: T.WALLS, wallLow: T.WALLS_LOW },
  cellar: { floor: T.CONCRETE, floor2: T.CONCRETE2, wall: T.WALLC, wallLow: T.SHELFWALL },
  cave: { floor: T.CAVE, floor2: T.CAVE2, wall: T.CAVEWALL_TOP, wallLow: T.CAVEWALL },
  well: { floor: T.WELLFLOOR, floor2: T.PUDDLE, wall: T.WELLWALL, wallLow: T.WELLWALL },
  // World 2
  marble: { floor: T.MARBLE, floor2: T.CARPET, wall: T.WALLS, wallLow: T.WALLS_LOW },
  workshop: { floor: T.GRATE, floor2: T.CONCRETE, wall: T.WALL, wallLow: T.WALL_LOW },
  flooded: { floor: T.WOOD2, floor2: T.SHALLOW, wall: T.WALL, wallLow: T.WALL_LOW },
  gods: { floor: T.GODSTONE, floor2: T.SEAFLOOR, wall: T.GODWALL_TOP, wallLow: T.GODWALL },
};

/** Characters that place deco on top of the floor. */
const DECO: Record<string, number> = {
  r: D.RUG,
  '*': D.STAR_RUG,
  b: D.BOOK_T,
  B: D.BOOK_B,
  T: D.TABLE_L,
  t: D.TABLE_R,
  o: D.TABLE_ROUND,
  c: D.CHAIR,
  h: D.BED_T,
  H: D.BED_B,
  k: D.CABINET,
  S: D.STOVE,
  K: D.SINK,
  f: D.FRIDGE_T,
  F: D.FRIDGE_B,
  p: D.PLANT,
  n: D.CANDLE,
  C: D.COUNTER,
  $: D.REGISTER,
  '0': D.TOILET,
  '|': D.STALL,
  e: D.SHELF_T,
  E: D.SHELF_B,
  x: D.CRATE,
  X: D.BARREL,
  R: D.ROTTEN,
  z: D.BROKENBOX,
  q: D.CANS,
  u: D.BUCKET,
  i: D.FIREPLACE_L,
  I: D.FIREPLACE_R,
  d: D.DESK_L,
  D: D.DESK_R,
  l: D.FILE,
  g: D.DOGBED,
  y: D.CRYSTAL,
  Y: D.BALLTABLE,
  j: D.COFFIN_T,
  J: D.COFFIN_B,
  a: D.PIANO_L,
  A: D.PIANO_R,
  Z: D.ARMOR,
  '[': D.SOFA_L,
  ']': D.SOFA_R,
  '{': D.WARDROBE_T,
  '}': D.WARDROBE_B,
  '%': D.HAY,
  '&': D.FEEDSACK,
  '+': D.PLANKS,
  '(': D.POT,
  ')': D.CAULDRON,
  '<': D.SPOONS,
  '>': D.SHRINE,
  '!': D.TV,
  '?': D.SACK,
  '"': D.NET,
  '`': D.FISHRACK,
  ';': D.CLOCK_SMALL,
  ':': D.MOP,
  s: D.STALAG,
  v: D.BONES,
  G: D.GLOWROCK,
  k2: D.CABINET,
};

/** Characters that sit on the wall face row. */
const WALLDECO: Record<string, number> = {
  P: D.PAINTING,
  O: D.WINDOW,
  M: D.MIRROR,
  Q: D.POSTER,
  '@': D.DIAL_CLOCK,
  '^': D.CURTAIN,
  N: D.FLAG,
};

/** Extra per-map characters: deco on the floor, or (wall: true) deco hung on the wall row. */
export type ExtraChars = Record<string, { d: number; wall?: boolean; g?: number }>;

export function fromAscii(id: string, name: string, rows: string[], style: Style, extra: ExtraChars = {}): MapBuilder {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const b = new MapBuilder(id, name, w, h, T.VOID);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ' ';
      if (ch === ' ') continue;
      const ex = extra[ch];
      if (ex) {
        b.g(x, y, ex.g ?? (ex.wall ? style.wallLow : style.floor));
        if (ex.d !== D.NONE) b.d(x, y, ex.d);
        continue;
      }
      if (ch === 'W') b.g(x, y, style.wall);
      else if (ch === 'w') b.g(x, y, style.wallLow);
      else if (ch === '#') b.g(x, y, style.wallLow);
      else if (ch === '.') b.g(x, y, style.floor);
      else if (ch === ',') b.g(x, y, style.floor2);
      else if (ch === 'm') b.g(x, y, T.MAT);
      else if (ch === 'U') b.g(x, y, T.STAIRS_UP);
      else if (ch === 'V') b.g(x, y, T.STAIRS_DOWN);
      else if (ch === 'L') b.g(x, y, T.LADDER);
      else if (ch === '~') b.g(x, y, T.WATER);
      else if (ch === '_') b.g(x, y, T.PUDDLE);
      else if (WALLDECO[ch] !== undefined) {
        b.g(x, y, style.wallLow);
        b.d(x, y, WALLDECO[ch]);
      } else if (DECO[ch] !== undefined) {
        b.g(x, y, style.floor);
        b.d(x, y, DECO[ch]);
      } else b.g(x, y, style.floor);
    }
  });
  return b;
}

/** Find every (x, y) where a character appears in the ASCII source. */
export function find(rows: string[], ch: string): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] === ch) out.push([x, y]);
  });
  return out;
}
