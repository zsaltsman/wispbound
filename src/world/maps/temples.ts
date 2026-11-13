import { MapBuilder, type MapDef } from '../mapdef';
import { T, D } from '../tiles';
import { isSet } from '../../story/state';

// The four god temples beyond the Cave of the Gods, the vault they all lead
// to, and the tunnels you flee through when it comes down.

/** Where each temple's door sits in the cave (kept in step with w2interiors GOD_X). */
const CAVE_DOOR_X = { zeus: 4, thor: 14, poseidon: 24, athena: 34 };
export const TEMPLE_SPAWN = {
  zeus: { map: 't_zeus', x: 13, y: 19 },
  thor: { map: 't_thor', x: 15, y: 26 },
  poseidon: { map: 't_poseidon', x: 14, y: 20 },
  athena: { map: 't_athena', x: 14, y: 23 },
} as const;

/** Stone room helper: void everywhere, a two-row wall on top of every room. */
function base(id: string, name: string, w: number, h: number) {
  const b = new MapBuilder(id, name, w, h, T.VOID);
  b.m.world = 2;
  b.m.amb = 'gods';
  b.m.darkStyle = 'cave';
  return b;
}
/** Carve a floor rectangle with a carved wall face along its top edge. */
function room(b: MapBuilder, x: number, y: number, w: number, h: number, floor: number) {
  b.rect(x, y - 2, w, 1, T.GODWALL_TOP);
  b.rect(x, y - 1, w, 1, T.GODWALL);
  b.rect(x, y, w, h, floor);
}
/** The mat you came in on: step on it to go back to the cave. */
function backToCave(b: MapBuilder, god: keyof typeof CAVE_DOOR_X, x: number, y: number) {
  b.g(x, y, T.MAT);
  b.warp(x, y, 'w2_cave', CAVE_DOOR_X[god] + 2, 6, 'down', 'step');
}

// ================================================================== ZEUS: the conductor hall

/** Node grid: columns and rows of conductor pillars (tile positions). */
export const ZNODE = (c: number, r: number) => ({ x: 5 + c * 4, y: 6 + r * 4 });
/** The real channels between nodes, as [c1, r1, c2, r2]. Some lead nowhere. */
export const ZCHANNELS: [number, number, number, number][] = [
  [0, 0, 0, 1],
  [0, 1, 1, 1],
  [1, 1, 2, 1],
  [2, 1, 2, 2],
  [2, 2, 3, 2],
  [3, 2, 3, 1],
  [3, 1, 4, 1],
  [4, 1, 4, 0],
  // dead ends
  [0, 0, 1, 0],
  [2, 1, 2, 0],
  [2, 0, 3, 0],
  [1, 1, 1, 2],
  [1, 2, 0, 2],
  [3, 2, 4, 2],
];
/** Piece types at each node (row-major: r * 5 + c). */
export const ZTYPES = ['S', 'T', 'T', 'L', 'S', 'L', 'S', 'L', 'L', 'L', 'S', 'L', 'L', 'L', 'T'];
/** Starting rotations: every piece on the true path starts wrong. */
export const ZSTART = [1, 2, 0, 1, 1, 2, 0, 0, 3, 0, 1, 1, 3, 1, 2];
export const ZSOURCE = { x: 5, y: 3 }; // lightning strikes here, feeding node (0,0) from above
export const ZEXIT = { x: 21, y: 3 }; // node (4,0) feeds the barrier above it

function zeus(): MapDef {
  const b = base('t_zeus', 'TEMPLE OF ZEUS', 27, 22);
  const m = b.m;
  m.music = 't_zeus';
  m.dark = 0.6;
  room(b, 1, 3, 25, 17, T.ZFLOOR);
  // copper channels: the only routes current can take
  for (const [c1, r1, c2, r2] of ZCHANNELS) {
    const a = ZNODE(c1, r1);
    const z = ZNODE(c2, r2);
    for (let x = Math.min(a.x, z.x); x <= Math.max(a.x, z.x); x++) for (let y = Math.min(a.y, z.y); y <= Math.max(a.y, z.y); y++) b.g(x, y, T.CONDUIT);
  }
  for (let y = ZSOURCE.y + 1; y < ZNODE(0, 0).y; y++) b.g(ZSOURCE.x, y, T.CONDUIT);
  for (let y = ZEXIT.y + 1; y < ZNODE(4, 0).y; y++) b.g(ZEXIT.x, y, T.CONDUIT);
  // the lightning rod and the sealed door
  b.prop('z_source', ZSOURCE.x, ZSOURCE.y - 2, [{ x: ZSOURCE.x, y: ZSOURCE.y, w: 1, h: 1 }], { id: 'z_source', sortY: ZSOURCE.y + 1 });
  b.spot(ZSOURCE.x, ZSOURCE.y, 'zeus_rod');
  b.prop('z_barrier', ZEXIT.x - 0.5, 0, [{ x: ZEXIT.x - 1, y: 2, w: 3, h: 2 }], { id: 'z_barrier', sortY: 4, show: (st) => !isSet(st, 'zeus_open') });
  b.prop('z_barrier_open', ZEXIT.x - 0.5, 0, [{ x: ZEXIT.x - 1, y: 2, w: 1, h: 2 }, { x: ZEXIT.x + 1, y: 2, w: 1, h: 2 }], { sortY: 4, show: (st) => isSet(st, 'zeus_open') });
  b.g(ZEXIT.x, ZEXIT.y, T.ZFLOOR);
  b.warp(ZEXIT.x, ZEXIT.y, 't_zeus2', 7, 9, 'up', 'step');
  b.spot(ZEXIT.x, ZEXIT.y, 'zeus_barrier', (st) => !isSet(st, 'zeus_open'));
  // conductor pillars (the story turns them and lights them up)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const n = ZNODE(c, r);
      const i = r * 5 + c;
      b.prop(`zc_${ZTYPES[i]}${ZSTART[i]}0`, n.x, n.y - 1, [{ x: n.x, y: n.y, w: 1, h: 1 }], { id: `zc_${c}_${r}`, sortY: n.y + 1 });
      b.spot(n.x, n.y, `zc_${c}_${r}`);
    }
  // grandeur: pillars, braziers, carvings
  for (const x of [2, 24]) for (const y of [5, 10, 15]) b.d(x, y, D.PILLAR_T).d(x, y + 1, D.PILLAR_B);
  for (let x = 2; x < 25; x += 3) if (x !== ZSOURCE.x && Math.abs(x - ZEXIT.x) > 1) b.d(x, 2, D.CARVING);
  b.d(10, 18, D.BRAZIER).d(16, 18, D.BRAZIER);
  b.light(10 * 16 + 8, 18 * 16, 40, 0.5).light(16 * 16 + 8, 18 * 16, 40, 0.5);
  b.d(23, 18, D.URN).d(3, 18, D.RUBBLE);
  b.spot(23, 18, 'zeus_urn');
  b.light(ZSOURCE.x * 16 + 8, 2 * 16, 30, 0.4).light(ZEXIT.x * 16 + 8, 2 * 16, 40, 0.3, (st) => !isSet(st, 'zeus_open'));
  m.spawn = { x: 13, y: 19, dir: 'up' };
  backToCave(b, 'zeus', 13, 20);
  b.trigger(1, 14, 25, 3, 'zeus_enter', 'q_zeus_enter');
  return b.build();
}

function zeus2(): MapDef {
  const b = base('t_zeus2', 'THE STORM CHAMBER', 15, 12);
  b.m.music = 't_zeus';
  b.m.dark = 0.75;
  room(b, 1, 2, 13, 9, T.ZFLOOR);
  b.m.spawn = { x: 7, y: 9, dir: 'up' };
  for (const x of [2, 12]) b.d(x, 3, D.PILLAR_T).d(x, 4, D.PILLAR_B);
  b.d(4, 8, D.GLYPH).d(10, 8, D.GLYPH);
  b.npc({ id: 'glowbell_lair', sprite: 'cr_glowbell', x: 7, y: 4, dir: 'down', script: 'glowbell_lair', big: true, show: (st) => !st.creature2 });
  b.light(7 * 16 + 8, 4 * 16, 56, 0.25);
  // the way on: a passage behind where the creature floated
  b.g(7, 1, T.ZFLOOR);
  b.warp(7, 1, 'w2_vault', 14, 20, 'up', 'step', 'to_vault');
  b.g(7, 10, T.MAT);
  b.warp(7, 10, 't_zeus', ZEXIT.x, ZEXIT.y + 1, 'down', 'step');
  return b.build();
}

// ================================================================== THOR: worthiness

export const THOR = {
  hammer: { x: 14, y: 10 },
  crack: { x: 14, y: 5 },
  block1: { x: 3, y: 11 },
  plate1: { x: 6, y: 15 },
  room1: { x: 1, y: 9, w: 7, h: 8 },
  block2: { x: 25, y: 10 },
  pit2: { x: 27, y: 13 },
  lever2: { x: 29, y: 10 },
  room2: { x: 24, y: 9, w: 3, h: 8 },
  orb: { x: 14, y: 24 },
  socket: { x: 16, y: 22 },
  rod: { x: 11, y: 22 },
  symbol: { x: 18, y: 21 },
  gong: { x: 20, y: 25 },
  room3: { x: 10, y: 21, w: 12, h: 6 },
  runes: [
    [12, 15],
    [15, 16],
    [18, 15],
  ] as [number, number][],
};

function thor(): MapDef {
  const b = base('t_thor', 'TEMPLE OF THOR', 32, 28);
  const m = b.m;
  m.music = 't_thor';
  m.dark = 0.55;
  const F = T.TFLOOR;
  // the hidden chamber (behind the cracked wall), the great hall, three trial rooms
  room(b, 12, 2, 8, 3, F);
  room(b, 11, 8, 10, 10, F);
  room(b, 1, 9, 7, 8, F);
  room(b, 24, 9, 7, 8, F);
  room(b, 10, 21, 12, 6, F);
  // corridors
  b.rect(8, 12, 3, 2, F);
  b.rect(21, 12, 3, 2, F);
  b.rect(15, 18, 2, 3, F);
  // behind the cracked wall
  b.rect(14, 5, 3, 3, F);
  b.prop('t_crackwall', THOR.crack.x, THOR.crack.y, [{ x: 14, y: 5, w: 3, h: 3 }], { id: 't_crackwall', sortY: 8, show: (st) => !isSet(st, 'thor_wall_broken') });
  b.prop('t_rubble', THOR.crack.x, THOR.crack.y, 'none', { sortY: 6, show: (st) => isSet(st, 'thor_wall_broken') });
  for (let x = 14; x < 17; x++) b.spot(x, 7, 'thor_crack', (st) => !isSet(st, 'thor_wall_broken'));
  // the hammer and the three rune stones
  b.prop('t_hammer', THOR.hammer.x, THOR.hammer.y, [{ x: 14, y: 11, w: 3, h: 2 }], { id: 't_hammer', sortY: 13, show: (st) => !isSet(st, 'thor_hammer') });
  b.prop('t_hammer_gone', THOR.hammer.x, THOR.hammer.y, [{ x: 14, y: 11, w: 3, h: 2 }], { sortY: 13, show: (st) => isSet(st, 'thor_hammer') });
  for (let x = 14; x < 17; x++) b.spot(x, 12, 'thor_hammer');
  THOR.runes.forEach(([x, y], n) => {
    b.prop(`t_rune${n}0`, x, y - 0.5, [{ x, y, w: 1, h: 1 }], { id: `rune${n}`, sortY: y + 1 });
    b.spot(x, y, 'thor_rune');
  });
  // Room 1: a block and a pressure plate
  b.g(THOR.plate1.x, THOR.plate1.y, T.PLATE);
  b.d(4, 13, D.PILLAR_B).d(1, 16, D.URN);
  b.d(1, 9, D.SHRINE);
  b.spot(1, 9, 'thor_reset1');
  // Room 2: a dividing wall with one pit in it, the lever beyond
  for (let y = 9; y < 17; y++) if (y !== THOR.pit2.y) b.g(27, y, T.GODWALL);
  b.g(THOR.pit2.x, THOR.pit2.y, T.PIT);
  b.prop('p_sluice_shut', THOR.lever2.x, THOR.lever2.y - 0.5, [{ x: THOR.lever2.x, y: THOR.lever2.y, w: 1, h: 1 }], { sortY: THOR.lever2.y + 1, show: (st) => !isSet(st, 'thor_m2') });
  b.prop('p_sluice_open', THOR.lever2.x, THOR.lever2.y - 0.5, [{ x: THOR.lever2.x, y: THOR.lever2.y, w: 1, h: 1 }], { sortY: THOR.lever2.y + 1, show: (st) => isSet(st, 'thor_m2') });
  b.spot(THOR.lever2.x, THOR.lever2.y, 'thor_lever');
  b.d(24, 16, D.SHRINE);
  b.spot(24, 16, 'thor_reset2');
  // Room 3: rod, conduit, socket, the carved bolt, the gong (also the way in)
  for (let x = THOR.rod.x + 1; x < THOR.symbol.x; x++) b.g(x, THOR.socket.y, T.CONDUIT);
  b.g(THOR.socket.x, THOR.socket.y, T.SOCKET);
  b.prop('z_source', THOR.rod.x, THOR.rod.y - 2, [{ x: THOR.rod.x, y: THOR.rod.y, w: 1, h: 1 }], { id: 't_rod', sortY: THOR.rod.y + 1 });
  b.spot(THOR.rod.x, THOR.rod.y, 'thor_rod');
  b.prop('t_bolt', THOR.symbol.x, THOR.symbol.y - 0.5, [{ x: 18, y: 21, w: 3, h: 3 }], { sortY: 24, show: (st) => !isSet(st, 'thor_m3') });
  b.prop('t_bolt_lit', THOR.symbol.x, THOR.symbol.y - 0.5, [{ x: 18, y: 21, w: 3, h: 3 }], { sortY: 24, show: (st) => isSet(st, 'thor_m3') });
  b.spot(17, 21, 'thor_symbol').spot(17, 23, 'thor_symbol');
  b.prop('t_gong', THOR.gong.x - 0.5, THOR.gong.y - 1, [{ x: THOR.gong.x, y: THOR.gong.y, w: 1, h: 1 }], { sortY: THOR.gong.y + 1 });
  b.spot(THOR.gong.x, THOR.gong.y, 'thor_gong');
  b.d(10, 26, D.SHRINE);
  b.spot(10, 26, 'thor_reset3');
  // statues and carvings: it should feel enormous
  for (const x of [11, 20]) b.d(x, 8, D.PILLAR_T).d(x, 9, D.PILLAR_B);
  for (let x = 12; x < 20; x += 2) if (x < 14 || x > 16) b.d(x, 7, D.CARVING);
  b.d(12, 17, D.BRAZIER).d(19, 17, D.BRAZIER);
  b.light(12 * 16 + 8, 17 * 16, 40, 0.5).light(19 * 16 + 8, 17 * 16, 40, 0.5).light(15 * 16 + 8, 11 * 16, 50, 0.2);
  b.light(3 * 16, 12 * 16, 40, 0.3).light(28 * 16, 12 * 16, 40, 0.3).light(16 * 16, 24 * 16, 50, 0.3);
  // the hidden chamber: Hammerfin, and the way on
  b.npc({ id: 'hammerfin_lair', sprite: 'cr_hammerfin', x: 16, y: 3, dir: 'down', script: 'hammerfin_lair', big: true, show: (st) => !st.creature2 });
  b.g(13, 1, F);
  b.warp(13, 1, 'w2_vault', 14, 20, 'up', 'step', 'to_vault');
  b.light(16 * 16, 3 * 16, 40, 0.3, (st) => isSet(st, 'thor_wall_broken'));
  m.spawn = { x: 15, y: 26, dir: 'up' };
  backToCave(b, 'thor', 15, 27);
  return b.build();
}

// ================================================================== POSEIDON: the waters

export const POS = {
  W: { x: 3, y: 7, w: 7, h: 7 }, // west basin
  C: { x: 10, y: 10, w: 10, h: 1 }, // the canal between them
  E: { x: 20, y: 6, w: 7, h: 8 }, // east basin (sealed by the sluice)
  tunnel: { x: 24, y: 14 }, // the drowned passage under the east basin
  plate: { x: 25, y: 11 }, // where floating things come to rest in the east
  ledge: { x: 2, y: 10 }, // the crate starts on the west ledge
  wheel: { x: 12, y: 17 },
  sluice: { x: 27, y: 5 },
  reset: { x: 17, y: 17 },
};

function poseidon(): MapDef {
  const b = base('t_poseidon', 'TEMPLE OF POSEIDON', 30, 24);
  const m = b.m;
  m.music = 't_poseidon';
  m.dark = 0.5;
  // one great hall with two sunken basins and a canal, the entry below, the shrine beyond
  room(b, 1, 4, 28, 11, T.PFLOOR);
  b.rect(11, 15, 8, 7, T.PFLOOR); // entry hall
  room(b, 21, 17, 7, 5, T.PFLOOR); // the shrine (only reachable through the drowned tunnel)
  b.rect(21, 15, 3, 2, T.GODWALL_TOP);
  b.rect(25, 15, 3, 2, T.GODWALL_TOP);
  b.rect(POS.tunnel.x, 15, 1, 2, T.PBASIN);
  // the basins start flooded; the story repaints them from the save
  for (const r of [POS.W, POS.C, POS.E]) b.rect(r.x, r.y, r.w, r.h, T.PWATER);
  b.g(POS.tunnel.x, POS.tunnel.y, T.PWATER);
  // the sea gate in the tunnel, shut until something holds the plate down
  b.prop('p_seagate', POS.tunnel.x - 0.5, 14.5, [{ x: POS.tunnel.x, y: 15, w: 1, h: 1 }], { sortY: 16.2, show: (st) => !isSet(st, 'pos_gate') });
  b.prop('p_seagate_open', POS.tunnel.x - 0.5, 14.5, 'none', { sortY: 15, show: (st) => isSet(st, 'pos_gate') });
  // controls: the tide wheel (entry), the sluice (east rim), the rewinding statue
  b.prop('p_tide_lo', POS.wheel.x - 0.5, POS.wheel.y - 1, [{ x: POS.wheel.x, y: POS.wheel.y, w: 1, h: 1 }], { id: 'p_tide', sortY: POS.wheel.y + 1 });
  b.spot(POS.wheel.x, POS.wheel.y, 'pos_wheel');
  b.prop('p_sluice_shut', POS.sluice.x, POS.sluice.y - 0.5, [{ x: POS.sluice.x, y: POS.sluice.y, w: 1, h: 1 }], { id: 'p_sluice', sortY: POS.sluice.y + 1 });
  b.spot(POS.sluice.x, POS.sluice.y, 'pos_sluice');
  b.prop('p_seastatue2', POS.reset.x - 0.5, POS.reset.y - 2, [{ x: POS.reset.x, y: POS.reset.y, w: 1, h: 1 }], { sortY: POS.reset.y + 1 });
  b.spot(POS.reset.x, POS.reset.y, 'pos_reset');
  // sea-creature statues and carvings around the hall
  // two serpent statues stand fully inside the hall, against the walls (32px wide: centred on a tile seam)
  b.prop('p_seastatue0', 1, 2, [{ x: 1, y: 4, w: 2, h: 1 }], { sortY: 5 });
  b.prop('p_seastatue1', 26.5, 11, [{ x: 27, y: 13, w: 2, h: 1 }], { sortY: 14 });
  b.spot(1, 4, 'pos_statue').spot(2, 4, 'pos_statue').spot(27, 13, 'pos_statue').spot(28, 13, 'pos_statue');
  for (let x = 4; x < 28; x += 4) b.d(x, 3, D.CARVING);
  b.d(15, 5, D.GLYPH).d(14, 13, D.SEAWEED).d(5, 14, D.CLAMSHELL);
  b.spot(15, 5, 'pos_glyph');
  b.light(12 * 16, 17 * 16, 40, 0.3).light(27 * 16, 5 * 16, 30, 0.3).light(15 * 16, 8 * 16, 60, 0.1).light(24 * 16, 19 * 16, 50, 0.3);
  // the shrine
  b.npc({ id: 'bubblotl_lair', sprite: 'cr_bubblotl', x: 24, y: 19, dir: 'down', script: 'bubblotl_lair', big: true, show: (st) => !st.creature2 });
  b.warp(27, 21, 'w2_vault', 14, 20, 'up', 'step', 'to_vault');
  b.g(27, 21, T.MAT);
  m.spawn = { x: 14, y: 20, dir: 'up' };
  b.g(14, 22, T.PFLOOR);
  backToCave(b, 'poseidon', 14, 22);
  return b.build();
}

// ================================================================== ATHENA: the library

export const ATH = {
  owl: { x: 10, y: 9 },
  snake: { x: 19, y: 9 },
  eagle: { x: 10, y: 14 },
  lion: { x: 19, y: 14 },
  door: { x: 14, y: 5 },
  shelf: { x: 25, y: 8 },
};

function athena(): MapDef {
  const b = base('t_athena', 'TEMPLE OF ATHENA', 30, 26);
  const m = b.m;
  m.music = 't_athena';
  m.dark = 0.35;
  room(b, 11, 2, 8, 3, T.AFLOOR); // the final chamber
  room(b, 8, 7, 14, 10, T.AFLOOR); // the hall of guardians
  room(b, 1, 8, 6, 8, T.ACARPET); // west reading room
  room(b, 23, 8, 6, 8, T.ACARPET); // east reading room (and its hidden alcove)
  room(b, 9, 19, 12, 5, T.ACARPET); // south reading room (the way in)
  b.rect(7, 11, 1, 2, T.AFLOOR);
  b.rect(22, 11, 1, 2, T.AFLOOR);
  b.rect(14, 17, 2, 2, T.AFLOOR);
  // the great door: sealed by the guardians
  b.rect(14, 5, 2, 2, T.AFLOOR);
  b.prop('a_door', ATH.door.x - 0.5, 4, [{ x: 13, y: 5, w: 4, h: 2 }], { sortY: 7, show: (st) => !isSet(st, 'ath_open') });
  b.prop('a_door_open', ATH.door.x - 0.5, 4, [{ x: 13, y: 5, w: 1, h: 2 }, { x: 16, y: 5, w: 1, h: 2 }], { sortY: 7, show: (st) => isSet(st, 'ath_open') });
  b.spot(14, 6, 'ath_door', (st) => !isSet(st, 'ath_open')).spot(15, 6, 'ath_door', (st) => !isSet(st, 'ath_open'));
  // the four guardians
  for (const k of ['owl', 'snake', 'eagle', 'lion'] as const) {
    const p = ATH[k];
    b.prop(`a_${k}0`, p.x - 0.5, p.y - 2, [{ x: p.x, y: p.y, w: 1, h: 1 }], { id: 'a_' + k, sortY: p.y + 1 });
    b.spot(p.x, p.y, 'ath_' + k);
  }
  b.prop('a_lectern', 14.5, 11, [{ x: 15, y: 12, w: 1, h: 1 }], { sortY: 13 });
  b.spot(15, 12, 'ath_main');
  // shelves everywhere
  for (let x = 1; x < 7; x++) b.d(x, 8, x % 2 ? D.BOOK_T : D.BOOK_B);
  for (let x = 23; x < 29; x++) if (x !== ATH.shelf.x) b.d(x, 8, x % 2 ? D.BOOK_T : D.BOOK_B);
  for (let x = 9; x < 21; x++) if (x !== 14 && x !== 15) b.d(x, 19, x % 3 ? D.BOOK_T : D.BOOK_B);
  b.d(8, 16, D.URN).d(21, 16, D.URN).d(9, 7, D.PILLAR_B).d(20, 7, D.PILLAR_B);
  // west: the second verse
  b.prop('a_lectern', 2.5, 12, [{ x: 3, y: 13, w: 1, h: 1 }], { sortY: 14 });
  b.spot(3, 13, 'ath_scroll_w');
  for (const x of [1, 3, 5]) b.spot(x, 8, 'ath_books_w');
  // south: the last verse, cut into a standing stone
  b.d(10, 22, D.TABLE_ROUND).d(18, 22, D.TABLE_ROUND);
  b.g(12, 21, T.GODWALL);
  b.d(12, 21, D.CARVING);
  b.spot(12, 21, 'ath_south_wall');
  for (const x of [9, 11, 17, 19]) b.spot(x, 19, 'ath_books_s');
  // east: a book about patience, and the sliding bookcase with the third verse behind it
  for (const x of [23, 27]) b.spot(x, 8, 'ath_books_e');
  b.g(ATH.shelf.x, 7, T.ACARPET);
  b.g(ATH.shelf.x, 6, T.ACARPET);
  b.rect(ATH.shelf.x - 1, 5, 3, 1, T.GODWALL_TOP);
  b.g(ATH.shelf.x - 1, 6, T.GODWALL_TOP).g(ATH.shelf.x + 1, 6, T.GODWALL_TOP);
  b.prop('a_bookcase', ATH.shelf.x - 0.5, 6.5, [{ x: ATH.shelf.x, y: 8, w: 1, h: 1 }], { id: 'a_bookcase', sortY: 9, show: (st) => !isSet(st, 'ath_shelf') });
  b.prop('a_bookcase', ATH.shelf.x + 1, 6.5, [{ x: ATH.shelf.x + 1, y: 8, w: 2, h: 1 }], { sortY: 9, show: (st) => isSet(st, 'ath_shelf') });
  b.spot(ATH.shelf.x, 8, 'ath_bookcase', (st) => !isSet(st, 'ath_shelf'));
  b.prop('a_lectern', ATH.shelf.x - 0.5, 4.6, 'none', { sortY: 6.5 });
  b.spot(ATH.shelf.x, 6, 'ath_scroll_e');
  b.d(27, 13, D.TABLE_ROUND);
  b.spot(27, 13, 'ath_book_patient');
  // light: candles in every reading room, a pale glow on each guardian
  b.light(3 * 16, 12 * 16, 40, 0.5).light(26 * 16, 12 * 16, 40, 0.5).light(15 * 16, 21 * 16, 50, 0.5).light(15 * 16, 11 * 16, 80, 0.1);
  // Glidray, and the way on
  b.npc({ id: 'glidray_lair', sprite: 'cr_glidray', x: 15, y: 3, dir: 'down', script: 'glidray_lair', big: true, show: (st) => !st.creature2 });
  b.g(12, 1, T.AFLOOR);
  b.warp(12, 1, 'w2_vault', 14, 20, 'up', 'step', 'to_vault');
  m.spawn = { x: 14, y: 23, dir: 'up' };
  backToCave(b, 'athena', 14, 24);
  return b.build();
}

// ================================================================== the vault: where every path ends

export const VAULT_PIT = { x: 12, y: 7, w: 6, h: 5 };

function vault(): MapDef {
  const b = base('w2_vault', 'THE DEEP VAULT', 30, 24);
  const m = b.m;
  m.music = 'gods';
  m.dark = 0.7;
  room(b, 2, 3, 26, 19, T.VFLOOR);
  for (const [x, y] of [
    [6, 8],
    [7, 9],
    [8, 9],
    [20, 15],
    [21, 14],
    [22, 14],
    [11, 17],
    [12, 16],
    [17, 5],
  ])
    b.g(x, y, T.VCRACK);
  b.rect(VAULT_PIT.x, VAULT_PIT.y, VAULT_PIT.w, VAULT_PIT.h, T.VCRACK); // the floor over the pit is cracked right through
  for (const x of [3, 26]) for (const y of [6, 12, 18]) b.d(x, y, D.PILLAR_T).d(x, y + 1, D.PILLAR_B);
  b.light(15 * 16, 10 * 16, 60, 0.1);
  m.spawn = { x: 14, y: 20, dir: 'up' };
  b.trigger(4, 12, 22, 4, 'vault_reveal', undefined, (st) => !isSet(st, 'kraken_seen'));
  for (let x = VAULT_PIT.x; x < VAULT_PIT.x + VAULT_PIT.w; x++) b.spot(x, VAULT_PIT.y + VAULT_PIT.h - 1, 'vault_pit', (st) => isSet(st, 'kraken_seen'));
  return b.build();
}

// ================================================================== the escape: tunnels to the submarine

/** A corridor that caves in when you get close (visible, and never the only way on). */
export const ESC_COLLAPSE: { id: string; near: { x: number; y: number; w: number; h: number }; tiles: [number, number][] }[] = [
  // the east way down from the first gallery
  { id: 'e1', near: { x: 49, y: 6, w: 8, h: 3 }, tiles: [[54, 10], [55, 10], [56, 10]] },
  // the shortcut in the middle of the third gallery
  { id: 's3', near: { x: 25, y: 24, w: 11, h: 3 }, tiles: [[29, 28], [30, 28], [31, 28]] },
  // a dead-end cave gives way as you look into it
  { id: 'n1', near: { x: 41, y: 6, w: 8, h: 3 }, tiles: [[44, 4], [45, 4]] },
];
/** The fourth gallery floods from the east once this many seconds have passed. */
export const ESC_FLOOD_AT = 16;
export const ESC_FLOOD = { x: 3, y: 33, w: 54, h: 3 };
export const ESC_GOAL = { x: 24, y: 38, w: 12, h: 7 };
export const ESC_SUB = { x: 29, y: 42 };
export const ESC_TIME = 60;
export const ESC_START = { x: 30, y: 2 };

function escape(): MapDef {
  const b = base('w2_escape', 'THE COLLAPSING DEEP', 60, 47);
  const m = b.m;
  m.music = 'escape';
  m.dark = 0.5;
  const F = T.CAVE;
  const dig = (x: number, y: number, w: number, h: number, t: number = F) => b.rect(x, y, w, h, t);
  dig(29, 1, 3, 5); // up from the vault
  dig(3, 6, 54, 3); // gallery one
  dig(42, 3, 6, 3); //   a dead-end cave
  dig(3, 9, 3, 6); //   west way down
  dig(54, 9, 3, 6); //   east way down (caves in)
  dig(3, 15, 54, 3); // gallery two
  dig(29, 18, 3, 6, T.SHALLOW); //   a flooded shortcut down the middle
  dig(54, 18, 3, 6); //   east way down
  dig(3, 24, 54, 3); // gallery three
  dig(29, 27, 3, 6); //   a shortcut (caves in)
  dig(3, 27, 3, 6); //   west way down
  dig(44, 30, 5, 3); // gallery four's dead end
  dig(3, 33, 54, 3); // gallery four (floods)
  dig(24, 36, 12, 9); // the grotto with the submarine
  const floor = new Set<number>([F, T.SHALLOW]);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (b.gt(x, y) !== T.VOID) continue;
      if (floor.has(b.gt(x, y + 1))) b.g(x, y, T.CAVEWALL);
      else if ([[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].some(([dx, dy]) => floor.has(b.gt(x + dx, y + dy)))) b.g(x, y, T.CAVEWALL_TOP);
    }
  b.scatter(0, 0, m.w, m.h, F, [T.CAVE2], 0.3, 7);
  b.prop('g_subwreck', ESC_SUB.x - 2, ESC_SUB.y - 2, [{ x: ESC_SUB.x - 1, y: ESC_SUB.y, w: 4, h: 1 }], { sortY: ESC_SUB.y + 1 });
  b.d(46, 4, D.BONES).d(46, 31, D.SKULLPILE).d(8, 25, D.STALAG).d(26, 43, D.SEAWEED).d(33, 39, D.CLAMSHELL);
  for (const [x, y] of [
    [6, 7],
    [30, 4],
    [55, 7],
    [4, 12],
    [20, 16],
    [44, 16],
    [30, 21],
    [10, 25],
    [40, 25],
    [4, 30],
    [15, 34],
    [40, 34],
  ])
    b.d(x, y, D.GLOWROCK);
  b.light(30 * 16, 41 * 16, 70, 0.2);
  m.spawn = { x: ESC_START.x, y: ESC_START.y, dir: 'down' };
  return b.build();
}

export function buildTemples(): MapDef[] {
  return [zeus(), zeus2(), thor(), poseidon(), athena(), vault(), escape()];
}
