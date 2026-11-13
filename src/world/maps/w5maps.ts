import { type MapDef } from '../mapdef';
import { fromAscii, type Style, type ExtraChars } from '../ascii';
import { T, D } from '../tiles';
import { isSet } from '../../story/state';
import type { StoryState } from '../../story/state';

// The final world: THE REAPER'S PRISON. Five floors joined by one elevator.
//   1 THE CELL BLOCK       you wake here; the cells; your Titan cub in the specimen cell
//   2 THE WARDEN'S POST    the Skeleton Warden
//   3 THE MESS HALL        the food fight; the kitchen (the temple creature); the Reaper's visit
//   4 THE GUARD QUARTERS   patrols, a disguise, the sergeant and your first spirit
//   5 HIGH SECURITY        the last cell, its lock, and who is in it

const f = (k: string) => (st: StoryState) => isSet(st, k);
const nf = (k: string) => (st: StoryState) => !isSet(st, k);

const S: Record<string, Style> = {
  cells: { floor: T.W5_FLOOR, floor2: T.W5_CELL, wall: T.W5_WALL, wallLow: T.W5_WALL_LOW },
  mess: { floor: T.W5_MESS, floor2: T.W5_KITCHEN, wall: T.W5_WALL, wallLow: T.W5_WALL_LOW },
  guard: { floor: T.W5_GUARD, floor2: T.W5_FLOOR, wall: T.W5_GWALL, wallLow: T.W5_GWALL_LOW },
  high: { floor: T.W5_HIGH, floor2: T.W5_FLOOR, wall: T.W5_HWALL, wallLow: T.W5_HWALL_LOW },
};

const X: ExtraChars = {
  I: { d: D.NONE, g: T.W5_BARS },
  h: { d: D.W5_BUNK_T },
  H: { d: D.W5_BUNK_B },
  '1': { d: D.W5_SLOP },
  '2': { d: D.W5_FOOD },
  '3': { d: D.W5_TALLY, wall: true },
  '4': { d: D.W5_SCRAWL, wall: true },
  '5': { d: D.W5_SHACKLE, wall: true },
  '6': { d: D.W5_BOARD, wall: true },
  '7': { d: D.W5_LOCKER },
  '8': { d: D.W5_RACK },
  '9': { d: D.W5_GARBAGE },
  '=': { d: D.W5_DRAIN },
  '%': { d: D.W5_SHELF },
  '&': { d: D.W5_TRAYTABLE },
  '+': { d: D.W5_STOOL },
  d: { d: D.W5_DESK },
  L: { d: D.NONE, g: T.W5_LIFT },
  '#': { d: D.NONE, g: T.W5_SLOPFLOOR },
};

const R = (w: number, rows: string[]) => {
  rows.forEach((r) => {
    if (r.length !== w) throw new Error(`row width ${r.length} != ${w}: "${r}"`);
  });
  return rows;
};

function room(id: string, name: string, rows: string[], style: Style, music: string, dark = 0.5) {
  const b = fromAscii(id, name, rows, style, X);
  b.m.world = 5;
  b.m.music = music;
  b.m.amb = 'cave';
  b.m.dark = dark;
  b.m.darkStyle = 'candle';
  return b;
}

/** Where the elevator doors are on each floor (the left tile of the pair, on the wall row). */
export const LIFT: Record<string, { x: number; y: number }> = {
  p_cells: { x: 32, y: 1 },
  p_post: { x: 8, y: 1 },
  p_mess: { x: 2, y: 1 },
  p_guard: { x: 2, y: 1 },
  p_high: { x: 3, y: 1 },
};
export const FLOOR_MAPS = ['p_cells', 'p_post', 'p_mess', 'p_guard', 'p_high'];
export const FLOOR_NAMES = ['THE CELL BLOCK', "THE WARDEN'S POST", 'THE MESS HALL', 'THE GUARD QUARTERS', 'HIGH SECURITY'];

function lift(b: ReturnType<typeof room>, id: string) {
  const l = LIFT[id];
  b.prop('p5_lift', l.x, l.y - 1, 'none', { id: 'lift', oy: -8, sortY: l.y + 1 });
  b.spot(l.x, l.y, 'p_lift');
  b.spot(l.x + 1, l.y, 'p_lift');
  b.light(l.x * 16 + 16, l.y * 16 + 4, 34, 0.2);
}

// ------------------------------------------------------------------ 1: THE CELL BLOCK

/** Cells: north row (y2-4, bars on y5), corridor (y6-8), south row (y10-12, bars on y9). */
export const P1 = {
  wake: { x: 3, y: 3 },
  myBars: { x: 3, y: 5 },
  gCell: { x: 3, y: 11 },
  gBars: { x: 3, y: 9 },
  specimen: { x: 27, y: 11 },
  specBars: { x: 27, y: 9 },
  hatch: { x: 3, y: 6 },
  board: { x: 35, y: 1 },
};

function cellBlock(): MapDef {
  const b = room('p_cells', 'LEVEL 1 - THE CELL BLOCK', R(38, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'Wwwwwwwww3wwwww4wwwwwwwwwww5wwwwwww6wW',
    'Wh,,,0w,,,h,w,,,,uw,,,,,wv,,,,w......W',
    'WH,,,,w,,,H,w,,,,,w,,,,,w,,,,,w......W',
    'W,,,,,w,,,,,w,,,,,w,,,,,w,,,,,w....ddW',
    'WIIIIIwIIIIIwIIIIIwIIIIIwIIIIIw......W',
    'W...1...........................x....W',
    'W..............=.....................W',
    'W.....1....................1........xW',
    'WIIIIIwIIIIIwIIIIIwIIIIIwIIIIIw......W',
    'W,,,,,wh,,,,w,,,,,w,,,,hw,,,,,w.7..7.W',
    'W,,,,,wH,,,,w,,v,,w,,,,Hw,,,,,w......W',
    'W,,,,,w,,,,0w,,,,,w0,,,,w,,,,,wx.X...W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]), S.cells, 'w5_prison', 0.5);
  lift(b, 'p_cells');
  // bars that have been torn open (the scripts re-apply these on every visit)
  b.m.dyn = undefined;
  b.prop('p5_sign', 25.5, 8, 'none', { sortY: 9.5, oy: 3 });
  // the people of the cell block
  b.npc({ id: 'c_tally', sprite: 'skel', x: 9, y: 4, dir: 'up', script: 'p1_tally' });
  b.npc({ id: 'c_ghost', sprite: 'ghost', x: 21, y: 3, dir: 'down', script: 'p1_ghost', wander: 1 });
  b.npc({ id: 'c_imp', sprite: 'imp', x: 27, y: 3, dir: 'down', script: 'p1_imp', wander: 1 });
  b.npc({ id: 'c_sailor', sprite: 'pr_g', x: 9, y: 11, dir: 'up', script: 'p1_sailor' });
  b.npc({ id: 'c_lifer', sprite: 'pr_e', x: 21, y: 11, dir: 'up', script: 'p1_lifer' });
  b.spot(15, 1, 'p1_scrawl');
  b.spot(9, 1, 'p1_tallymarks');
  b.spot(15, 11, 'p1_bones');
  b.spot(P1.board.x, P1.board.y, 'p1_board');
  b.spot(36, 4, 'p1_desk');
  b.spot(27, 1, 'p1_shackles');
  for (let x = 25; x <= 29; x++) b.spot(x, 9, 'p1_specimen', nf('w5_got3'));
  b.trigger(22, 6, 3, 3, 'p1_spec_seen', 'w5_spec_seen');
  for (const x of [3, 15, 27]) b.light(x * 16, 7 * 16, 44, 0.3);
  b.light(34 * 16, 6 * 16, 60, 0.15);
  b.m.spawn = { x: P1.wake.x, y: P1.wake.y, dir: 'down' };
  return b.build();
}

// ------------------------------------------------------------------ 2: THE WARDEN'S POST

export const P2 = {
  gate: { x: 7, y: 5 },
  warden: { x: 8, y: 10 },
  trig: { x: 7, y: 6 },
};

function wardenPost(): MapDef {
  const b = room('p_post', "LEVEL 2 - THE WARDEN'S POST", R(18, [
    'WWWWWWWWWWWWWWWWWW',
    'Ww5wwwwwwwwww6w5wW',
    'Ww.....LL.....wwwW',
    'Ww.....LL.....wwwW',
    'WwwwwwW...WwwwwwwW',
    'WWWWWWw...wWWWWWWW',
    'WWWWWWw...wWWWWWWW',
    'W5www3w...w3www5wW',
    'Ww...............W',
    'Ww..x.........x..W',
    'Ww......d.d......W',
    'Ww..X.........X..W',
    'Ww...............W',
    'WWWWWWWWWWWWWWWWWW',
  ]), S.cells, 'w5_prison', 0.55);
  lift(b, 'p_post');
  b.prop('p5_portcullis', 7, 5.2, 'none', { id: 'gate', show: (st) => isSet(st, 'w5_gate_down') && !isSet(st, 'w5_warden_beaten'), sortY: 8 });
  b.npc({ id: 'warden', sprite: 'raw:ow_skelwarden', x: P2.warden.x + 1, y: P2.warden.y - 1, dir: 'left', script: 'p2_warden', show: nf('w5_warden_beaten'), big: true });
  b.trigger(7, 8, 3, 1, 'p2_warden_meet', undefined, nf('w5_warden_beaten'));
  b.spot(13, 1, 'p2_board');
  b.spot(8, 10, 'p2_desk');
  b.spot(10, 10, 'p2_desk');
  for (const [x, y] of [[4, 9], [14, 9], [9, 6]]) b.light(x * 16, y * 16, 50, 0.3);
  b.m.spawn = { x: 8, y: 3, dir: 'down' };
  return b.build();
}

// ------------------------------------------------------------------ 3: THE MESS HALL

export const P3 = {
  door: { x: 25, y: 9 },
  hide: { x: 27, y: 12 },
  pot: { x: 29, y: 5 },
  cage: { x: 30, y: 2 },
  trough: { x: 13, y: 15 },
  clock: { x: 12, y: 1 },
};

function messHall(): MapDef {
  const b = room('p_mess', 'LEVEL 3 - THE MESS HALL', R(36, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'Wwwwwww6wwwwwwwwww4wwwwwwwwwwwwwwwwW',
    'W0.....LL.........2......w,,,,,,,,,W',
    'W......LL................wSCC,,,,CCW',
    'W.......1.......2........w,,,,,,,,,W',
    'W..&&&&&&&.....&&&&&&&...w,,,,,,,,,W',
    'W..+++++++.....+++++++...w,,,,,,,,,W',
    'W.........2..............w,,,,,,,,,W',
    'W..&&&&&&&..=..&&&&&&&...w,,,,,,,,,W',
    'W..+++++++.....+++++++...w,,,,,,,,,W',
    'W....1...................w,C,,,,,%,W',
    'W..&&&&&&&.....&&&&&&&...w,C,,,,,%,W',
    'W..+++++++..2..+++++++...w,,,,,,,,,W',
    'W....................#...w,,,,,,,%,W',
    'W9.......................wC,,,,,,,,W',
    'W9................###...9w,,,,,,,,,W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]), S.mess, 'w5_mess', 0.35);
  lift(b, 'p_mess');
  // the kitchen door: a heavy locked door in the wall (opened by the script)
  b.prop('p5_kdoor', P3.door.x, P3.door.y - 1, 'none', { show: nf('w5_kitchen_open'), sortY: P3.door.y + 1 });
  b.light(P3.door.x * 16 + 8, P3.door.y * 16 + 4, 26, 0.2, nf('w5_kitchen_open'));
  b.spot(P3.door.x, P3.door.y, 'p3_door', nf('w5_kitchen_open'));
  b.spot(P3.door.x - 1, P3.door.y, 'p3_door', nf('w5_kitchen_open'));
  // the clock over the hall (it stops forever at eight)
  b.prop('p5_clock', P3.clock.x, P3.clock.y, 'none', { show: nf('w5_massacre'), sortY: 2 });
  b.prop('p5_clock_stopped', P3.clock.x, P3.clock.y, 'none', { show: f('w5_massacre'), sortY: 2 });
  b.spot(P3.clock.x, P3.clock.y, 'p3_clock');
  b.spot(7, 1, 'p3_menu');
  b.spot(18, 1, 'p3_scrawl');
  // the slop trough (the filthiest thing on the floor), and other filthy places
  b.prop('p5_trough', P3.trough.x, P3.trough.y - 0.2, [{ x: P3.trough.x, y: P3.trough.y, w: 3, h: 1 }], { show: (st) => !isSet(st, 'w5_key_found') && !isSet(st, 'w5_trough_dug') });
  b.prop('p5_trough_key', P3.trough.x, P3.trough.y - 0.2, [{ x: P3.trough.x, y: P3.trough.y, w: 3, h: 1 }], { show: (st) => isSet(st, 'w5_trough_dug') && !isSet(st, 'w5_key_found') });
  b.prop('p5_trough', P3.trough.x, P3.trough.y - 0.2, [{ x: P3.trough.x, y: P3.trough.y, w: 3, h: 1 }], { show: f('w5_key_found') });
  for (let x = P3.trough.x; x < P3.trough.x + 3; x++) b.spot(x, P3.trough.y, 'p3_trough');
  b.spot(1, 14, 'p3_garbage');
  b.spot(1, 15, 'p3_garbage');
  b.spot(24, 15, 'p3_garbage2');
  b.spot(12, 8, 'p3_drain', undefined, true);
  b.spot(1, 2, 'p3_toilet');
  // the kitchen: the pot, the cage, and what is in it
  b.prop('p5_pot', P3.pot.x - 1, P3.pot.y, [{ x: P3.pot.x - 1, y: P3.pot.y + 1, w: 3, h: 1 }], { sortY: P3.pot.y + 2 });
  b.prop('p5_cage', P3.cage.x - 1.5, P3.cage.y - 1.6, 'none', { id: 'cage', show: nf('w5_got2'), sortY: P3.pot.y + 2.1 });
  b.prop('p5_cage_open', P3.cage.x - 1.5, P3.cage.y - 1.6, 'none', { show: f('w5_got2'), sortY: P3.pot.y + 2.1 });
  for (const [x, y] of [[28, 6], [29, 6], [30, 6], [31, 6]]) b.spot(x, y, 'p3_cage', nf('w5_got2'));
  b.spot(32, 10, 'p3_shelf');
  // the prisoners at supper (all gone after the Reaper's visit)
  const P = (id: string, sprite: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right', wander = 0) =>
    b.npc({ id, sprite, x, y, dir, script: 'p3_talk', wander, show: nf('w5_massacre') });
  P('m_chef', 'pr_b', 5, 4, 'down', 1);
  P('m_twins', 'pr_d', 10, 7, 'left', 1);
  P('m_skel', 'skel', 17, 4, 'down', 1);
  P('m_ghost', 'ghost', 20, 7, 'right', 2);
  P('m_imp', 'imp', 13, 10, 'up', 1);
  P('m_lady', 'pr_c', 4, 10, 'right', 1);
  P('m_big', 'pr_f', 19, 13, 'left', 1);
  P('m_quiet', 'pr_h', 23, 3, 'left');
  P('m_old', 'pr_e', 8, 13, 'up', 1);
  P('m_rat', 'pr_a', 23, 11, 'left', 1);
  // the dust and clothes they leave behind
  for (const [i, x, y] of [[0, 5, 4], [1, 10, 7], [2, 17, 4], [3, 13, 10], [1, 4, 10], [0, 19, 13], [2, 23, 3], [3, 8, 13], [0, 23, 11]] as const)
    b.prop('p5_dust' + i, x, y + 0.4, 'none', { show: f('w5_massacre') });
  for (const [x, y] of [[6, 5], [18, 5], [6, 11], [18, 11], [30, 8]]) b.light(x * 16, y * 16, 60, 0.2);
  b.m.spawn = { x: 2, y: 3, dir: 'down' };
  return b.build();
}

// ------------------------------------------------------------------ 4: THE GUARD QUARTERS

/** Patrol routes: tile loops (each guard walks to each point in turn, then turns back). */
export const P4 = {
  lobby: { x: 3, y: 4 },
  rack: { x: 36, y: 13 },
  office: { x: 34, y: 3 },
  breakDoor: { x: 20, y: 15 },
  sergeant: { x: 21, y: 19 },
  patrols: [
    { id: 'pg1', sprite: 'guard', pts: [[6, 9], [18, 9]] },
    { id: 'pg2', sprite: 'skelguard', pts: [[24, 11], [24, 14]] },
    { id: 'pg3', sprite: 'guard2', pts: [[22, 8], [37, 8]] },
    { id: 'pg4', sprite: 'skelguard', pts: [[32, 14], [38, 14]] },
  ] as { id: string; sprite: string; pts: [number, number][] }[],
};

function guardQuarters(): MapDef {
  const b = room('p_guard', 'LEVEL 4 - THE GUARD QUARTERS', R(40, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'Wwwwwwwwww6wwwwwwwwwwwwwwwwwwwwwwww6wwwW',
    'W.LL.....w.h.h.h.h.w.....w%%%%%w.....l.W',
    'W........w.H.H.H.H.w.....w.....w..dd...W',
    'W........w.........w.....w.....w..+....W',
    'W........w.h.h.h.h.w.....w.x.X.w.......W',
    'W........w.H.H.H.H.w.....w.....w.......W',
    'W........wwww..wwwww.....www.wwwwww.wwwW',
    'W......................................W',
    'W......................................W',
    'W....x........x.........x......x.......W',
    'Wwww.wwwwwwww.wwww.............www.wwwwW',
    'W7.....7ww...dd..w..x..........w8....88W',
    'W.......ww...+...w.........xx..w.......W',
    'W7.....7ww.......w.............w.......W',
    'W.......ww.......www.wwwwwwwwwww......7W',
    'W7.....7ww.......w...........7.w......7W',
    'W.......wwww.wwwww..&&&&.......wwww.wwwW',
    'W.......w........w..++++.......w.......W',
    'W..%%%..w..x...X.w...........X.w..8.x..W',
    'W.......w........w.............w.......W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]), S.guard, 'w5_stealth', 0.4);
  lift(b, 'p_guard');
  // the equipment room's coat stand, with a spare uniform
  b.prop('p5_rack', P4.rack.x, P4.rack.y - 0.75, [{ x: P4.rack.x, y: P4.rack.y, w: 1, h: 1 }], { show: nf('w5_disguised') });
  b.prop('p5_rack_empty', P4.rack.x, P4.rack.y - 0.75, [{ x: P4.rack.x, y: P4.rack.y, w: 1, h: 1 }], { show: f('w5_disguised') });
  b.spot(P4.rack.x, P4.rack.y, 'p4_uniform');
  b.spot(34, 3, 'p4_office');
  b.spot(35, 3, 'p4_office');
  b.spot(35, 1, 'p4_roster');
  b.spot(10, 1, 'p4_sleepboard');
  b.spot(27, 2, 'p4_storage');
  b.spot(13, 12, 'p4_security');
  b.spot(14, 12, 'p4_security');
  b.spot(37, 12, 'p4_weapons');
  // the break room: a door guard, the card table, and the sergeant
  b.npc({ id: 'doorguard', sprite: 'guard3', x: 20, y: 15, dir: 'up', script: 'p4_doorguard', show: nf('w5_door_ok') });
  b.npc({ id: 'doorguard2', sprite: 'guard3', x: 19, y: 16, dir: 'right', script: 'p4_doorguard', show: f('w5_door_ok') });
  b.npc({ id: 'sergeant', sprite: 'sergeant', x: 22, y: 16, dir: 'down', script: 'p4_sergeant', show: nf('w5_got1') });
  b.npc({ id: 'cards1', sprite: 'guard', x: 19, y: 17, dir: 'right', script: 'p4_cards' });
  b.npc({ id: 'cards2', sprite: 'skelguard', x: 24, y: 17, dir: 'left', script: 'p4_cards' });
  b.trigger(18, 16, 13, 1, 'p4_overhear', 'w5_overheard');
  for (const [x, y] of [[5, 5], [14, 5], [22, 6], [35, 5], [22, 18], [13, 15], [35, 15], [4, 16]]) b.light(x * 16, y * 16, 54, 0.15);
  b.m.spawn = { x: P4.lobby.x, y: P4.lobby.y, dir: 'down' };
  return b.build();
}

// ------------------------------------------------------------------ 5: HIGH SECURITY

export const P5 = {
  cell: { x: 22, y: 5 },
  lock: { x: 22, y: 7 },
  stand: { x: 22, y: 8 },
};

function highSecurity(): MapDef {
  const b = room('p_high', 'LEVEL 5 - HIGH SECURITY', R(28, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'Wwwwwwwwwwwwwwwwwwwwwwwwwwww'.slice(0, 27) + 'W',
    'Ww.LL......wwww,,,,w,,,,,,,W'.slice(0, 27) + 'W',
    'Ww.LL......w,,,,,,,w,,,,,,,W',
    'Ww.........w,,,,,,,w,,h,,,,W',
    'Ww.........w,,,,,,,w,,H,,,,W',
    'Ww.........w,,,,,,,w,,,,,,,W',
    'Ww.........IIIIIIIIwIIIIIIIW',
    'Ww.........................W',
    'Ww.........................W',
    'Ww.........................W',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]), S.high, 'w5_high', 0.6);
  lift(b, 'p_high');
  b.prop('p5_lock', P5.lock.x, P5.lock.y - 0.4, 'none', { id: 'lock', show: nf('w5_cell_open'), sortY: P5.lock.y + 0.5 });
  b.prop('p5_lock_open', P5.lock.x, P5.lock.y - 0.4, 'none', { show: f('w5_cell_open'), sortY: P5.lock.y + 0.5 });
  for (let x = 20; x <= 26; x++) b.spot(x, 7, 'p5_lock', nf('w5_cell_open'));
  for (let x = 12; x <= 18; x++) b.spot(x, 7, 'p5_emptycell');
  const routeB = (st: StoryState) => st.flags.w4_route === 'B';
  b.npc({ id: 'rescue', sprite: 'carlo', x: 23, y: 4, dir: 'down', script: 'p5_rescue_talk', show: (st) => routeB(st) && !isSet(st, 'w5_rescued') });
  b.npc({ id: 'rescue_old', sprite: 'oldman4', x: 23, y: 4, dir: 'down', script: 'p5_rescue_talk', show: (st) => !routeB(st) && !isSet(st, 'w5_rescued') });
  for (const [x, y] of [[6, 5], [16, 9], [23, 5]]) b.light(x * 16, y * 16, 48, 0.1);
  b.m.spawn = { x: 3, y: 4, dir: 'down' };
  return b.build();
}

export function buildW5(): MapDef[] {
  return [cellBlock(), wardenPost(), messHall(), guardQuarters(), highSecurity()];
}
