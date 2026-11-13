import { T, D, SOLID_GROUND, WALKABLE_DECO } from './tiles';
import type { StoryState } from '../story/state';

// Map format and a small builder used to author every location in code.
// Pure TypeScript: the scene renders it, and sim/maps-check.ts validates it.

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export type Cond = (st: StoryState) => boolean;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PropDef {
  id?: string;
  key: string; // texture key
  x: number; // top-left tile
  y: number;
  /** blocked tiles (absolute tile rects) */
  solid: Rect[];
  /** row used for depth sorting (defaults to the bottom of the image) */
  sortY?: number;
  /** pixel offset of the image inside its tile box */
  ox?: number;
  oy?: number;
  show?: Cond;
  /** draw above characters no matter what (tree canopies, arches) */
  over?: boolean;
}

export interface WarpDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  dir: Dir;
  /** 'door' = walk into it, 'step' = step onto it */
  kind: 'door' | 'step';
  /** script run instead of warping; return true from it to allow the warp */
  gate?: string;
}

export interface SpotDef {
  x: number;
  y: number;
  id: string; // script id
  show?: Cond;
  /** an item on the floor: usable while standing on it or next to it, whichever way you face */
  near?: boolean;
}

export interface TriggerDef extends Rect {
  id: string;
  once?: string; // flag set when it fires
  show?: Cond;
}

export interface NpcDef {
  id: string;
  sprite: string;
  x: number;
  y: number;
  dir: Dir;
  script: string;
  wander?: number; // radius in tiles (0 = stands still)
  show?: Cond;
  /** tall/large sprites (creatures in their lairs) */
  big?: boolean;
  /** background critters (pen animals) that are not meant to be talked to */
  ambient?: boolean;
  /** World 3: partygoers dancing on the spot */
  dance?: boolean;
}

export interface LightDef {
  x: number; // pixels
  y: number;
  r: number;
  flicker?: number;
  show?: Cond;
}

export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  ground: number[];
  deco: number[];
  props: PropDef[];
  warps: WarpDef[];
  spots: SpotDef[];
  triggers: TriggerDef[];
  npcs: NpcDef[];
  lights: LightDef[];
  /** 0 = daylight, 1 = pitch black outside of lights */
  dark: number;
  darkStyle: 'night' | 'cave' | 'cellar' | 'candle' | 'well';
  music: string;
  amb: string;
  outdoor: boolean;
  fog: Rect[];
  /** default spawn (used on new games) */
  spawn: { x: number; y: number; dir: Dir };
  /** fishing is possible when facing water */
  fishing: boolean;
  /** deco tiles that change with story progress (purely visual; solidity is unchanged) */
  dyn?: (st: StoryState) => [number, number, number][];
  /** which world the map belongs to (1 = Hollowhaven, 2 = the flooded island) */
  world?: number;
}

export class MapBuilder {
  m: MapDef;
  constructor(id: string, name: string, w: number, h: number, fill: number = T.GRASS) {
    this.m = {
      id,
      name,
      w,
      h,
      ground: new Array(w * h).fill(fill),
      deco: new Array(w * h).fill(D.NONE),
      props: [],
      warps: [],
      spots: [],
      triggers: [],
      npcs: [],
      lights: [],
      dark: 0,
      darkStyle: 'night',
      music: 'town',
      amb: 'indoor',
      outdoor: false,
      fog: [],
      spawn: { x: 1, y: 1, dir: 'down' },
      fishing: false,
    };
  }

  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.m.w && y < this.m.h;
  }
  g(x: number, y: number, t: number) {
    if (this.in(x, y)) this.m.ground[y * this.m.w + x] = t;
    return this;
  }
  gt(x: number, y: number) {
    return this.in(x, y) ? this.m.ground[y * this.m.w + x] : T.VOID;
  }
  d(x: number, y: number, t: number) {
    if (this.in(x, y)) this.m.deco[y * this.m.w + x] = t;
    return this;
  }
  dt(x: number, y: number) {
    return this.in(x, y) ? this.m.deco[y * this.m.w + x] : D.NONE;
  }
  rect(x: number, y: number, w: number, h: number, t: number, layer: 'g' | 'd' = 'g') {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) (layer === 'g' ? this.g : this.d).call(this, x + i, y + j, t);
    return this;
  }
  /** Hollow rectangle (fences, hedges, walls). */
  frame(x: number, y: number, w: number, h: number, t: number, layer: 'g' | 'd' = 'd') {
    for (let i = 0; i < w; i++) {
      (layer === 'g' ? this.g : this.d).call(this, x + i, y, t);
      (layer === 'g' ? this.g : this.d).call(this, x + i, y + h - 1, t);
    }
    for (let j = 0; j < h; j++) {
      (layer === 'g' ? this.g : this.d).call(this, x, y + j, t);
      (layer === 'g' ? this.g : this.d).call(this, x + w - 1, y + j, t);
    }
    return this;
  }
  /** A fence enclosure drawn with the right pieces. */
  fence(x: number, y: number, w: number, h: number) {
    for (let i = 0; i < w; i++) {
      this.d(x + i, y, D.FENCE_H);
      this.d(x + i, y + h - 1, D.FENCE_H);
    }
    for (let j = 1; j < h - 1; j++) {
      this.d(x, y + j, D.FENCE_V);
      this.d(x + w - 1, y + j, D.FENCE_V);
    }
    for (const [px, py] of [
      [x, y],
      [x + w - 1, y],
      [x, y + h - 1],
      [x + w - 1, y + h - 1],
    ])
      this.d(px, py, D.FENCE_POST);
    return this;
  }
  /** Random variation from a list (deterministic per tile). */
  scatter(x: number, y: number, w: number, h: number, from: number, to: number[], chance: number, seed = 1) {
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const v = r();
        if (this.gt(x + i, y + j) === from && v < chance) this.g(x + i, y + j, to[Math.floor(r() * to.length)]);
      }
    return this;
  }
  prop(key: string, x: number, y: number, solid: Rect[] | 'all' | 'none', o: Partial<PropDef> & { w?: number; h?: number } = {}) {
    const rects: Rect[] = solid === 'all' ? [{ x, y, w: o.w ?? 1, h: o.h ?? 1 }] : solid === 'none' ? [] : solid;
    const { w: _w, h: _h, ...rest } = o;
    this.m.props.push({ key, x, y, solid: rects, ...rest });
    return this;
  }
  warp(x: number, y: number, to: string, tx: number, ty: number, dir: Dir, kind: 'door' | 'step' = 'door', gate?: string) {
    this.m.warps.push({ x, y, to, tx, ty, dir, kind, gate });
    return this;
  }
  spot(x: number, y: number, id: string, show?: Cond, near = false) {
    this.m.spots.push({ x, y, id, show, near });
    return this;
  }
  trigger(x: number, y: number, w: number, h: number, id: string, once?: string, show?: Cond) {
    this.m.triggers.push({ x, y, w, h, id, once, show });
    return this;
  }
  npc(n: NpcDef) {
    this.m.npcs.push(n);
    return this;
  }
  light(x: number, y: number, r: number, flicker = 0, show?: Cond) {
    this.m.lights.push({ x, y, r, flicker, show });
    return this;
  }
  /**
   * A standard interior: two rows of wall on top, black sides, floor, and an
   * exit mat in the bottom row that leads back outside.
   */
  room(floor: number, wall: number, wallLow: number) {
    const { w, h } = this.m;
    this.rect(0, 0, w, h, T.VOID);
    this.rect(1, 0, w - 2, 1, wall);
    this.rect(1, 1, w - 2, 1, wallLow);
    this.rect(1, 2, w - 2, h - 3, floor);
    return this;
  }
  exit(x: number, to: string, tx: number, ty: number) {
    const y = this.m.h - 1;
    this.g(x, y, T.MAT);
    this.warp(x, y, to, tx, ty, 'down', 'step');
    this.m.spawn = { x, y: y - 1, dir: 'up' };
    return this;
  }
  build(): MapDef {
    // things lying on the floor that you pick up (a key, a gemstone, a can of fuel) are
    // solid while they are there: you walk up to them, not over them
    for (const s of this.m.spots) {
      if (!s.near) continue;
      for (const p of this.m.props)
        if (!p.solid.length && Math.abs(p.x - s.x) < 1 && s.y - p.y >= 0 && s.y - p.y < 1) p.solid = [{ x: s.x, y: s.y, w: 1, h: 1 }];
    }
    return this.m;
  }
}

// ------------------------------------------------------------ collision helpers

export function groundSolid(m: MapDef, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  const i = y * m.w + x;
  if (SOLID_GROUND.has(m.ground[i])) return true;
  const d = m.deco[i];
  return d !== D.NONE && !WALKABLE_DECO.has(d);
}

/** Static blocking: tiles + visible props. (NPCs are checked separately by the scene.) */
export function blockedStatic(m: MapDef, x: number, y: number, st: StoryState): boolean {
  if (groundSolid(m, x, y)) return true;
  for (const p of m.props) {
    if (p.show && !p.show(st)) continue;
    for (const r of p.solid) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
  }
  return false;
}

/** Tiles you can reach across (counters, tables, fences, furniture): never walls or water. */
export function reachAcross(m: MapDef, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
  const i = y * m.w + x;
  const g = m.ground[i];
  if (SOLID_GROUND.has(g)) return false;
  return m.deco[i] !== D.NONE || m.props.some((p) => p.solid.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h));
}

export function warpAt(m: MapDef, x: number, y: number): WarpDef | undefined {
  return m.warps.find((w) => w.x === x && w.y === y);
}
