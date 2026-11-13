import { DIFFICULTY, type Difficulty } from './config';

// ROGUELIKE: laying out a floor. Rooms sit on a grid like a map drawn on squared paper.
// A floor is never random noise: it is one of a few hand-drawn SHAPES (a safe road and a
// dangerous one that part and meet again, side rooms hanging off them), turned and
// mirrored, with its rooms dealt from the floor's deck. The rooms themselves are
// handcrafted templates (see ROOM_TEMPLATES).

export type RoomKind = 'start' | 'combat' | 'elite' | 'puzzle' | 'treasure' | 'rest' | 'shop' | 'boss';
export type Dir = 'n' | 'e' | 's' | 'w';
export const DIRS: Dir[] = ['n', 'e', 's', 'w'];
export const DELTA: Record<Dir, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { n: 's', e: 'w', s: 'n', w: 'e' };
export type PuzzleKind = 'plates' | 'sequence' | 'lights' | 'mirrors' | 'timed';
export const PUZZLE_KINDS: PuzzleKind[] = ['plates', 'sequence', 'lights', 'mirrors', 'timed'];

export interface RoomPub {
  id: number;
  gx: number;
  gy: number;
  kind: RoomKind;
  /** Neighbouring room ids by wall. */
  doors: Partial<Record<Dir, number>>;
  /** Someone has been inside (it is drawn on the map). */
  seen: boolean;
  cleared: boolean;
  /** The chest has been opened, or the fire has been used. */
  used: boolean;
  /** Which handcrafted layout it uses, and a seed for its small variations. */
  layout: number;
  seed: number;
  /** A standard room dealt a nastier mix of enemies. */
  danger: boolean;
  /** Which enemies wait inside (combat, elite and boss rooms), front to back. */
  foes: string[];
  puzzle: PuzzleKind | null;
  /** On the dangerous road: the map marks it, so the party can choose. */
  risky: boolean;
}

/** A shape is a list of rooms: [x, y, slot]. Slots say what may go there. */
type Slot = 'start' | 'road' | 'safe' | 'risk' | 'side' | 'gate' | 'boss';
type Shape = { rooms: [number, number, Slot][]; links: [number, number][] };

// Indices in `links` refer to positions in `rooms`.
const SHAPES: Shape[] = [
  // the fork: two roads part after the second room and meet again before the boss
  {
    rooms: [
      [0, 0, 'start'], [1, 0, 'road'], [2, 0, 'road'],
      [2, -1, 'safe'], [3, -1, 'safe'], [4, -1, 'safe'],
      [2, 1, 'risk'], [3, 1, 'risk'], [4, 1, 'risk'],
      [4, 0, 'gate'], [5, 0, 'boss'],
      [1, -1, 'side'], [1, 1, 'side'], [3, 0, 'side'], [0, 1, 'side'],
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 9], [2, 6], [6, 7], [7, 8], [8, 9], [9, 10], [1, 11], [1, 12], [4, 13], [0, 14]],
  },
  // the ladder: a long road with the dangerous rooms as a parallel rail
  {
    rooms: [
      [0, 0, 'start'], [1, 0, 'road'], [2, 0, 'safe'], [3, 0, 'safe'], [4, 0, 'gate'], [5, 0, 'boss'],
      [1, 1, 'risk'], [2, 1, 'risk'], [3, 1, 'risk'],
      [0, -1, 'side'], [2, -1, 'side'], [3, -1, 'side'], [4, -1, 'side'], [4, 1, 'side'],
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 6], [6, 7], [7, 8], [8, 3], [0, 9], [2, 10], [3, 11], [4, 12], [8, 13]],
  },
  // the cross: roads leave the start in two directions and curl round to the same gate
  {
    rooms: [
      [0, 0, 'start'],
      [0, -1, 'safe'], [1, -1, 'safe'], [2, -1, 'safe'], [3, -1, 'safe'],
      [1, 0, 'risk'], [2, 0, 'risk'],
      [3, 0, 'gate'], [4, 0, 'boss'],
      [-1, 0, 'side'], [0, 1, 'side'], [1, -2, 'side'], [2, 1, 'side'], [3, 1, 'side'],
    ],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 7], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [0, 10], [2, 11], [6, 12], [7, 13]],
  },
];

/** What each floor's deck holds besides the start and the boss. */
const DECK = [
  { combat: 4, elite: 1, puzzle: 1, treasure: 1, shop: 1 },
  { combat: 5, elite: 2, puzzle: 2, treasure: 1, shop: 1 },
  { combat: 5, elite: 2, puzzle: 1, treasure: 1, shop: 1 },
];

function shuffle<T>(rng: () => number, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface FloorPlan {
  rooms: RoomPub[];
  start: number;
  boss: number;
}

/**
 * Lay out one floor. The safe road holds ordinary fights and the rest stop; the risky road
 * holds the elites and the treasure. Side rooms get the puzzles, the shop and what is left.
 */
export function buildFloor(rng: () => number, floor: number, diff: Difficulty): FloorPlan {
  const d = DIFFICULTY[diff];
  const shape = SHAPES[Math.floor(rng() * SHAPES.length)];
  // turn and mirror the shape so the same drawing never looks the same twice
  const rot = Math.floor(rng() * 4);
  const flip = rng() < 0.5;
  const place = (x: number, y: number): [number, number] => {
    if (flip) y = -y;
    for (let i = 0; i < rot; i++) [x, y] = [-y, x];
    return [x, y];
  };
  const deck = { ...DECK[Math.min(2, floor)] };
  deck.elite += d.extraElites;
  const idx = (slot: Slot) => shape.rooms.map((r, i) => (r[2] === slot ? i : -1)).filter((i) => i >= 0);
  const kinds: (RoomKind | null)[] = shape.rooms.map(() => null);
  const risky = shape.rooms.map((r) => r[2] === 'risk');
  for (const i of idx('start')) kinds[i] = 'start';
  for (const i of idx('boss')) kinds[i] = 'boss';
  // ---- the dangerous road: elites first, then the treasure as its prize
  const risk = idx('risk');
  let elites = deck.elite;
  risk.forEach((i, k) => {
    if (k === risk.length - 1 && deck.treasure > 0) {
      kinds[i] = 'treasure';
      deck.treasure--;
    } else if (elites > 0) {
      kinds[i] = 'elite';
      elites--;
    } else kinds[i] = 'combat';
  });
  // ---- the safe road: ordinary fights, with a place to rest somewhere along it
  const safe = idx('safe');
  let rests = d.recoveryRooms;
  const restAt = safe.length ? safe[1 + Math.floor(rng() * Math.max(1, safe.length - 1))] ?? safe[safe.length - 1] : -1;
  for (const i of safe) {
    if (i === restAt && rests > 0) {
      kinds[i] = 'rest';
      rests--;
    } else kinds[i] = 'combat';
  }
  for (const i of idx('road')) kinds[i] = 'combat';
  // the room before the boss is always a fight: no walking in fresh from a shop
  for (const i of idx('gate')) kinds[i] = 'combat';
  // ---- side rooms: puzzles, the shop, a second rest on EASY, leftover elites, and nothing else
  const sidePool: RoomKind[] = [];
  for (let k = 0; k < deck.puzzle; k++) sidePool.push('puzzle');
  for (let k = 0; k < deck.shop; k++) sidePool.push('shop');
  for (let k = 0; k < rests; k++) sidePool.push('rest');
  for (let k = 0; k < elites; k++) sidePool.push('elite');
  for (let k = 0; k < deck.treasure; k++) sidePool.push('treasure');
  const sides = shuffle(rng, idx('side'));
  sides.forEach((i, k) => (kinds[i] = sidePool[k] ?? null));

  // ---- build the rooms that made it in, and link them
  const ids = new Map<number, number>();
  const rooms: RoomPub[] = [];
  const puzzles = shuffle(rng, [...PUZZLE_KINDS]);
  shape.rooms.forEach((r, i) => {
    const kind = kinds[i];
    if (!kind) return;
    const [gx, gy] = place(r[0], r[1]);
    ids.set(i, rooms.length);
    rooms.push({
      id: rooms.length,
      gx,
      gy,
      kind,
      doors: {},
      seen: false,
      cleared: kind === 'start' || kind === 'shop' || kind === 'rest',
      layout: Math.floor(rng() * 1000),
      seed: Math.floor(rng() * 1e6),
      used: false,
      danger: false,
      foes: [],
      puzzle: kind === 'puzzle' ? puzzles[rooms.filter((x) => x.kind === 'puzzle').length % puzzles.length] : null,
      risky: risky[i] || kind === 'elite',
    });
  });
  for (const [a, b] of shape.links) {
    const ra = rooms[ids.get(a) ?? -1];
    const rb = rooms[ids.get(b) ?? -1];
    if (!ra || !rb) continue;
    const dir = DIRS.find((dd) => ra.gx + DELTA[dd][0] === rb.gx && ra.gy + DELTA[dd][1] === rb.gy);
    if (!dir) continue;
    ra.doors[dir] = rb.id;
    rb.doors[OPPOSITE[dir]] = ra.id;
  }
  const start = rooms.find((r) => r.kind === 'start')!;
  start.seen = true;
  return { rooms, start: start.id, boss: rooms.find((r) => r.kind === 'boss')!.id };
}

// ------------------------------------------------------------------ the rooms themselves

/** Rooms are 19 tiles wide and 11 tall inside their walls; doors sit in the middle of each wall. */
export const ROOM_W = 19;
export const ROOM_H = 11;
export const DOOR_AT: Record<Dir, [number, number]> = { n: [9, -1], s: [9, ROOM_H], w: [-1, 5], e: [ROOM_W, 5] };
/** Where the party stands after coming in through a door (the first is the one who led). */
export const ENTRY: Record<Dir, [number, number][]> = {
  n: [[9, 0], [8, 0], [10, 0], [9, 1]],
  s: [[9, 10], [8, 10], [10, 10], [9, 9]],
  w: [[0, 5], [0, 4], [0, 6], [1, 5]],
  e: [[18, 5], [18, 4], [18, 6], [17, 5]],
};
export const CENTRE: [number, number][] = [[9, 6], [8, 6], [10, 6], [9, 7]];

/**
 * Handcrafted layouts. '.' floor, '#' a pillar or block of wall, '~' a pit (cannot be crossed),
 * 'x' rubble (decoration you can walk over), 'E' where enemies stand, 'C' a chest, 'F' a
 * fire to rest at, 'S' the shopkeeper, 'B' where a boss waits.
 * Every layout keeps all four doorways and the centre reachable.
 */
export const ROOM_TEMPLATES: Record<'combat' | 'elite' | 'treasure' | 'rest' | 'shop' | 'boss' | 'start', string[][]> = {
  start: [
    ['...................', '...................', '..#.............#..', '...................', '...................', '...................', '...................', '...................', '..#.............#..', '...................', '...................'],
  ],
  combat: [
    ['...................', '..#.............#..', '...................', '......E.....E......', '...................', '...................', '...................', '.......x...x.......', '...................', '..#.............#..', '...................'],
    ['...................', '...................', '...##.........##...', '...#...E...E...#...', '...................', '...................', '...................', '...#...........#...', '...##.........##...', '...................', '...................'],
    ['...................', '.~~.............~~.', '.~~.............~~.', '.......E...E.......', '...................', '...................', '...................', '.........E.........', '.~~.............~~.', '.~~.............~~.', '...................'],
    ['...................', '....#....x....#....', '...................', '..E.............E..', '...................', '.....#.......#.....', '...................', '...................', '...................', '....#....x....#....', '...................'],
    ['...................', '...................', '....~~~.....~~~....', '....~.........~....', '.......E.E.E.......', '...................', '...................', '....~.........~....', '....~~~.....~~~....', '...................', '...................'],
    ['...................', '.#...#.......#...#.', '...................', '.....E.......E.....', '...................', '...................', '...................', '.........E.........', '...................', '.#...#.......#...#.', '...................'],
  ],
  elite: [
    ['...................', '.#...............#.', '...#...........#...', '...................', '.......E.E.E.......', '...................', '...................', '...................', '...#...........#...', '.#...............#.', '...................'],
    ['...................', '..~~~.........~~~..', '..~.............~..', '........E.E........', '...................', '...................', '...................', '...................', '..~.............~..', '..~~~.........~~~..', '...................'],
  ],
  treasure: [
    ['...................', '...................', '....#.........#....', '...................', '.........C.........', '...................', '...................', '...................', '....#.........#....', '...................', '...................'],
    ['...................', '..x.............x..', '......#.....#......', '...................', '.........C.........', '...................', '...................', '......#.....#......', '..x.............x..', '...................', '...................'],
  ],
  rest: [
    ['...................', '...................', '...x...........x...', '...................', '.........F.........', '...................', '...................', '...................', '...x...........x...', '...................', '...................'],
  ],
  shop: [
    ['...................', '...................', '.....#.......#.....', '.........S.........', '...................', '...................', '...................', '...................', '.....#.......#.....', '...................', '...................'],
  ],
  boss: [
    ['...................', '.#...............#.', '...................', '.........B.........', '...................', '...................', '...................', '...................', '...................', '.#...............#.', '...................'],
  ],
};

/** The layout a room uses (puzzle rooms draw their own floor from the puzzle). */
export function roomTemplate(room: RoomPub): string[] {
  const set = ROOM_TEMPLATES[room.kind === 'puzzle' ? 'start' : room.kind];
  return set[room.layout % set.length];
}

export function findMarks(t: string[], ch: string): [number, number][] {
  const out: [number, number][] = [];
  t.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === ch) out.push([x, y]);
  });
  return out;
}

/** Can a traveller stand here? (Chests, fires and keepers block; rubble does not.) */
export function walkable(t: string[], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return false;
  return '.xE'.includes(t[y][x]);
}
