import { ROOM_H, ROOM_W, type PuzzleKind } from './dungeon';

// ROGUELIKE: the puzzle rooms. Five different kinds of thinking, each one solvable alone
// (friends only make them quicker). The host owns the state; players send what they did.

export type Pt = [number, number];
export type Facing = 'n' | 'e' | 's' | 'w';

export interface PuzzleState {
  kind: PuzzleKind;
  solved: boolean;
  /** The room's floor for this puzzle ('.' floor, '#' block, '~' pit). */
  floor: string[];
  hint: string;
  // ---- plates: hold every plate down at once (stand on them, or push a block onto them)
  plates?: Pt[];
  blocks?: Pt[];
  // ---- sequence: watch the order the symbols light in, then walk it
  tiles?: Pt[];
  order?: number[];
  progress?: number;
  /** Goes up every time the obelisk plays the order back (players watch for the change). */
  shown?: number;
  obelisk?: Pt;
  // ---- lights: every lamp lit; each switch flips its lamp and its neighbours
  lamps?: boolean[];
  lampAt?: Pt[];
  // ---- mirrors: turn the mirrors until the beam reaches the crystal
  mirrors?: { x: number; y: number; o: 0 | 1 }[];
  emitter?: { x: number; y: number; dir: Facing };
  crystal?: Pt;
  /** The beam as it currently runs, corner to corner. */
  beam?: Pt[];
  // ---- timed: press every switch before the hum dies away
  switches?: Pt[];
  pressed?: boolean[];
  /** Seconds left once the first switch is down (0 = not running). */
  clock?: number;
  limit?: number;
}

const OPEN = Array.from({ length: ROOM_H }, () => '.'.repeat(ROOM_W));
const withBlocks = (pts: Pt[], ch = '#') => OPEN.map((row, y) => row.split('').map((c, x) => (pts.some((p) => p[0] === x && p[1] === y) ? ch : c)).join(''));
const pick = <T>(rng: () => number, a: T[]) => a[Math.floor(rng() * a.length)];

export function makePuzzle(kind: PuzzleKind, rng: () => number, floor: number): PuzzleState {
  switch (kind) {
    case 'plates': {
      // three plates on later floors; always as many blocks as plates, so one traveller can do it
      const n = floor === 0 ? 2 : 3;
      const spots: Pt[][] = [
        [[4, 2], [14, 2], [9, 8]],
        [[3, 8], [15, 8], [9, 2]],
        [[5, 3], [13, 7], [9, 5]],
      ];
      const plates = pick(rng, spots).slice(0, n);
      const blockSpots: Pt[][] = [
        [[7, 5], [11, 5], [9, 3]],
        [[6, 4], [12, 6], [9, 7]],
      ];
      const blocks = pick(rng, blockSpots).slice(0, n).filter((b) => !plates.some((p) => p[0] === b[0] && p[1] === b[1]));
      while (blocks.length < n) blocks.push([8 + blocks.length, 6]);
      return { kind, solved: false, floor: withBlocks([[1, 1], [17, 1], [1, 9], [17, 9]]), hint: 'HOLD EVERY PLATE DOWN AT ONCE. BLOCKS CAN BE PUSHED.', plates, blocks };
    }
    case 'sequence': {
      const tiles: Pt[] = [[5, 3], [13, 3], [5, 7], [13, 7], [9, 2], [9, 8]];
      const len = 4 + Math.min(2, floor);
      const use = tiles.slice(0, floor === 0 ? 4 : 6);
      const order: number[] = [];
      while (order.length < len) {
        const k = Math.floor(rng() * use.length);
        if (order[order.length - 1] !== k) order.push(k);
      }
      return { kind, solved: false, floor: OPEN, hint: 'TOUCH THE OBELISK, WATCH THE ORDER, THEN WALK IT.', tiles: use, order, progress: 0, shown: 0, obelisk: [9, 5] };
    }
    case 'lights': {
      const n = 5 + Math.min(2, floor);
      let lamps = Array.from({ length: n }, () => true);
      // work backwards from the answer, so it can always be solved
      const flip = (i: number) => {
        for (const k of [i - 1, i, i + 1]) if (k >= 0 && k < n) lamps[k] = !lamps[k];
      };
      for (let k = 0; k < n + 2; k++) flip(Math.floor(rng() * n));
      if (lamps.every(Boolean)) flip(Math.floor(n / 2));
      const x0 = 9 - (n - 1);
      const lampAt = lamps.map((_, i) => [x0 + i * 2, 4] as Pt);
      return { kind, solved: false, floor: OPEN, hint: 'LIGHT EVERY LAMP. EACH ONE ALSO FLIPS ITS NEIGHBOURS.', lamps, lampAt };
    }
    case 'mirrors': {
      // a staircase the beam must climb: every corner is a mirror, most of them turned the wrong way
      const rows = [2, 5, 8];
      const y0 = pick(rng, rows);
      const y1 = pick(rng, rows.filter((r) => r !== y0));
      const y2 = pick(rng, rows.filter((r) => r !== y1));
      const x1 = 5 + Math.floor(rng() * 2);
      const x2 = 11 + Math.floor(rng() * 2);
      const corners: Pt[] = [[x1, y0], [x1, y1], [x2, y1], [x2, y2]];
      const mirrors = corners.map(([x, y]) => ({ x, y, o: (rng() < 0.5 ? 0 : 1) as 0 | 1 }));
      const st: PuzzleState = { kind, solved: false, floor: OPEN, hint: 'SPACE TURNS A MIRROR. BRING THE BEAM TO THE CRYSTAL.', mirrors, emitter: { x: 0, y: y0, dir: 'e' }, crystal: [17, y2] };
      traceBeam(st);
      // never hand it over already solved
      if (st.solved) {
        mirrors[0].o = mirrors[0].o ? 0 : 1;
        traceBeam(st);
      }
      return st;
    }
    case 'timed': {
      const sets: Pt[][] = [
        [[6, 3], [12, 3], [12, 7], [6, 7]],
        [[4, 5], [9, 2], [14, 5], [9, 8]],
      ];
      const switches = pick(rng, sets);
      return { kind, solved: false, floor: withBlocks([[9, 5]]), hint: 'PRESS EVERY SWITCH BEFORE THE HUM DIES AWAY.', switches, pressed: switches.map(() => false), clock: 0, limit: 9 - Math.min(2, floor) };
    }
  }
}

const TURN: Record<0 | 1, Record<Facing, Facing>> = {
  // 0 is '/', 1 is '\'
  0: { e: 'n', n: 'e', w: 's', s: 'w' },
  1: { e: 's', s: 'e', w: 'n', n: 'w' },
};
const STEP: Record<Facing, Pt> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/** Follow the beam from the emitter. Sets `beam` and `solved`. */
export function traceBeam(st: PuzzleState) {
  const e = st.emitter!;
  let x = e.x;
  let y = e.y;
  let dir = e.dir;
  const path: Pt[] = [[x, y]];
  st.solved = false;
  for (let n = 0; n < 200; n++) {
    x += STEP[dir][0];
    y += STEP[dir][1];
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) break;
    if (st.crystal && st.crystal[0] === x && st.crystal[1] === y) {
      path.push([x, y]);
      st.solved = true;
      st.beam = path;
      return;
    }
    const m = st.mirrors!.find((q) => q.x === x && q.y === y);
    if (m) {
      path.push([x, y]);
      dir = TURN[m.o][dir];
    }
  }
  path.push([Math.max(0, Math.min(ROOM_W - 1, x)), Math.max(0, Math.min(ROOM_H - 1, y))]);
  st.beam = path;
}

/** Things in a puzzle room that stop a traveller (blocks, lamps, mirrors, the obelisk, the crystal). */
export function puzzleBlocked(st: PuzzleState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return true;
  if (st.floor[y][x] !== '.') return true;
  const at = (p?: Pt) => !!p && p[0] === x && p[1] === y;
  if (st.blocks?.some(at)) return true;
  if (at(st.obelisk) || at(st.crystal)) return true;
  if (st.lampAt?.some(at)) return true;
  if (st.mirrors?.some((m) => m.x === x && m.y === y)) return true;
  if (st.emitter && st.emitter.x === x && st.emitter.y === y) return true;
  return false;
}

/** A traveller walks into a block: it slides one tile if nothing is behind it. */
export function pushBlock(st: PuzzleState, x: number, y: number, dir: Facing, occupied: (x: number, y: number) => boolean): boolean {
  const b = st.blocks?.find((q) => q[0] === x && q[1] === y);
  if (!b || st.solved) return false;
  const nx = x + STEP[dir][0];
  const ny = y + STEP[dir][1];
  if (puzzleBlocked(st, nx, ny) || occupied(nx, ny)) return false;
  b[0] = nx;
  b[1] = ny;
  return true;
}

/** Plates: solved when every plate has a block or a traveller on it. */
export function checkPlates(st: PuzzleState, standing: Pt[]): boolean {
  if (!st.plates) return false;
  return st.plates.every((p) => st.blocks!.some((b) => b[0] === p[0] && b[1] === p[1]) || standing.some((s) => s[0] === p[0] && s[1] === p[1]));
}

/** Lights: flip a lamp and its neighbours. */
export function flipLamp(st: PuzzleState, i: number) {
  if (!st.lamps || st.solved) return;
  for (const k of [i - 1, i, i + 1]) if (k >= 0 && k < st.lamps.length) st.lamps[k] = !st.lamps[k];
  st.solved = st.lamps.every(Boolean);
}

/** Sequence: a traveller steps on symbol `i`. Returns what happened. */
export function stepSymbol(st: PuzzleState, i: number): 'right' | 'wrong' | 'solved' | 'idle' {
  if (!st.order || st.solved || !st.shown) return 'idle';
  if (st.order[st.progress!] === i) {
    st.progress!++;
    if (st.progress! >= st.order.length) {
      st.solved = true;
      return 'solved';
    }
    return 'right';
  }
  // (standing still on the symbol you just lit is not a mistake)
  if (st.progress! > 0 && st.order[st.progress! - 1] === i) return 'idle';
  st.progress = 0;
  return 'wrong';
}
