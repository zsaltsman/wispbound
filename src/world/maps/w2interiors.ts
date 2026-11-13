import { fromAscii, STYLES, type ExtraChars } from '../ascii';
import { MapBuilder, type MapDef, type Dir } from '../mapdef';
import { T, D } from '../tiles';
import { isSet, has } from '../../story/state';
import type { StoryState } from '../../story/state';
import { ISL_DOORS } from './island';
import { TEMPLE_SPAWN } from './temples';
import { GODS } from '../../gfx/artGods';

// Every indoor place on Saltwash, plus the cutscene sets: the emergency
// briefing room, the deep sea and the Cave of the Gods.

function R(width: number, rows: string[]) {
  rows.forEach((r) => {
    if (r.length !== width) throw new Error(`row width ${r.length} != ${width}: "${r}"`);
  });
  return rows;
}

type N = { id: string; sprite: string; x: number; y: number; dir: Dir; wander?: number; script?: string; show?: (st: StoryState) => boolean; big?: boolean };
function npcs(b: MapBuilder, list: N[]) {
  for (const n of list) b.npc({ ...n, script: n.script ?? n.id, wander: n.wander ?? 0 });
}

const before = (st: StoryState) => !isSet(st, 'w2_evac_done');

/** World 2 furniture characters. */
const X: ExtraChars = {
  '=': { d: D.BLUEPRINT, wall: true },
  '7': { d: D.NOTES, wall: true },
  '~': { d: D.FLOODLINE, wall: true },
  '^': { d: D.SCREEN, wall: true },
  '1': { d: D.MACHINE },
  '2': { d: D.TOOLRACK },
  '3': { d: D.WORKBENCH },
  '4': { d: D.GEARS },
  '5': { d: D.WIRES },
  '6': { d: D.COMPUTER },
  '8': { d: D.SANDBAG },
  '9': { d: D.TRASHCAN },
  v: { d: D.VAULT },
  V: { d: D.BALLOT },
  '!': { d: D.TELLER },
  ':': { d: D.ROPEPOST },
  '/': { d: D.PALLET },
  _: { d: D.PUDDLE_D },
  '%': { d: D.TIRE },
  ',': { d: D.NONE, g: T.SHALLOW },
  '&': { d: D.DEBRIS },
  '?': { d: D.CRACK },
  M: { d: D.MAPTABLE },
  '+': { d: D.PLANKS },
};

/** A small house on the island, exit in the middle of the bottom row. */
function house(id: string, name: string, rows: string[], door: { x: number; y: number }, style = STYLES.house): MapBuilder {
  const b = fromAscii(id, name, R(9, rows), style, X);
  b.g(4, rows.length - 1, T.MAT);
  b.warp(4, rows.length - 1, 'isl', door.x, door.y + 1, 'down', 'step');
  b.m.spawn = { x: 4, y: rows.length - 2, dir: 'up' };
  b.m.world = 2;
  b.m.dark = 0.2;
  b.m.darkStyle = 'candle';
  b.m.music = 'w2house';
  return b;
}

// ------------------------------------------------------------------ the inventor's workshop

function inventor(): MapDef {
  const rows = R(16, [
    ' WWWWWWWWWWWWWW ',
    ' w=7w==w7=w=77w ',
    ' 33.6.4....4.12 ',
    ' 5............1 ',
    ' 5............x ',
    ' 4............x ',
    ' 3............9 ',
    ' 3..5..........',
    ' 2..........4.1 ',
    ' 1x...5.....xx1 ',
    ' ...........5.. ',
    '    m           ',
  ].map((r) => r.padEnd(16, ' ').slice(0, 16)));
  const b = fromAscii('w2_inv', "PROFESSOR PIPWICK'S WORKSHOP", rows, STYLES.workshop, X);
  b.m.world = 2;
  b.warp(4, 11, 'isl', ISL_DOORS.inventor.x, ISL_DOORS.inventor.y + 1, 'down', 'step');
  b.m.spawn = { x: 4, y: 10, dir: 'up' };
  b.m.music = 'inventor';
  b.m.dark = 0.25;
  b.m.darkStyle = 'candle';
  // the submarine takes up an unreasonable amount of the house
  for (let st = 0; st <= 4; st++) {
    const s = st;
    b.prop(`subtop${st}`, 5, 3, [{ x: 5, y: 4, w: 8, h: 3 }], {
      show: (sv) => {
        const n = Math.min(4, (isSet(sv, 'w2_assembled') ? 4 : 0) || Number(sv.flags.w2_sub_stage ?? 0));
        return n === s && !isSet(sv, 'w2_sub_gone');
      },
    });
  }
  for (let x = 6; x < 12; x++) b.spot(x, 6, 'inv_sub');
  b.spot(2, 1, 'inv_blueprint').spot(5, 1, 'inv_blueprint').spot(6, 1, 'inv_blueprint').spot(9, 1, 'inv_blueprint');
  b.spot(3, 1, 'inv_notes').spot(7, 1, 'inv_notes').spot(11, 1, 'inv_notes').spot(12, 1, 'inv_notes');
  b.spot(1, 2, 'inv_bench').spot(2, 2, 'inv_bench').spot(4, 2, 'inv_computer').spot(14, 2, 'inv_tools');
  b.spot(14, 3, 'inv_machine').spot(1, 9, 'inv_machine').spot(14, 9, 'inv_machine');
  b.light(4 * 16 + 8, 2 * 16 + 4, 34, 0.3).light(9 * 16, 5 * 16, 60, 0.15).light(13 * 16, 9 * 16, 30, 0.5);
  npcs(b, [{ id: 'pipwick', sprite: 'inventor', x: 4, y: 7, dir: 'right', show: (st) => !isSet(st, 'w2_inv_follow') || isSet(st, 'w2_inv_home') }]);
  return b.build();
}

// ------------------------------------------------------------------ City Hall

function hall(): MapDef {
  const rows = R(18, [
    ' WWWWWWWWWWWWWWWW ',
    ' wNwPw~ww~wPwNw=w ',
    ' l............V.b ',
    ' l......dD......B ',
    ' ..rrrrrrrrrrrr.. ',
    ' ..rrrrrrrrrrrr.. ',
    ' 8.....c..c.....8 ',
    ' p..._........_.p ',
    ' ...c........c... ',
    ' 8..............8 ',
    ' ................ ',
    '        mm        ',
  ]);
  const b = fromAscii('w2_hall', 'CITY HALL', rows, STYLES.marble, X);
  b.m.world = 2;
  b.warp(8, 11, 'isl', ISL_DOORS.hall.x, ISL_DOORS.hall.y + 1, 'down', 'step');
  b.warp(9, 11, 'isl', ISL_DOORS.hall.x + 1, ISL_DOORS.hall.y + 1, 'down', 'step');
  b.m.spawn = { x: 8, y: 10, dir: 'up' };
  b.m.music = 'hall';
  b.m.dark = 0.1;
  b.m.darkStyle = 'candle';
  b.spot(4, 1, 'hall_portrait').spot(11, 1, 'hall_portrait').spot(6, 1, 'hall_floodline').spot(9, 1, 'hall_floodline');
  b.spot(14, 2, 'hall_ballot').spot(1, 2, 'hall_files').spot(1, 3, 'hall_files').spot(16, 2, 'hall_books').spot(16, 3, 'hall_books');
  b.spot(5, 7, 'hall_bucket').spot(14, 7, 'hall_bucket').spot(15, 1, 'hall_plan');
  npcs(b, [
    { id: 'mayor2', sprite: 'mayor2', x: 8, y: 2, dir: 'down' },
    { id: 'hall_aide', sprite: 'official', x: 12, y: 5, dir: 'down', wander: 1 },
    { id: 'hall_protester', sprite: 'man_beard', x: 3, y: 8, dir: 'up', wander: 1, show: before },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ the bank

function bankMap(): MapDef {
  const rows = R(14, [
    ' WWWWWWWWWWWW ',
    ' wPw~wwww~wPw ',
    ' ..........vv ',
    ' !!!!..!!!!.. ',
    ' .:..:..:..:. ',
    ' ............ ',
    ' p..c....c..p ',
    ' 8....__....8 ',
    ' ............ ',
    '      mm      ',
  ]);
  const b = fromAscii('w2_bank', 'BANK OF SALTWASH', rows, STYLES.marble, X);
  b.m.world = 2;
  b.warp(6, 9, 'isl', ISL_DOORS.bank.x, ISL_DOORS.bank.y + 1, 'down', 'step');
  b.warp(7, 9, 'isl', ISL_DOORS.bank.x + 1, ISL_DOORS.bank.y + 1, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'bank';
  b.m.dark = 0.08;
  b.m.darkStyle = 'candle';
  b.spot(11, 2, 'bank_vault').spot(12, 2, 'bank_vault').spot(2, 1, 'bank_portrait');
  npcs(b, [
    { id: 'banker', sprite: 'banker', x: 3, y: 2, dir: 'down' },
    { id: 'bank_teller2', sprite: 'woman2', x: 8, y: 2, dir: 'down' },
    { id: 'bank_cust1', sprite: 'grandpa2', x: 3, y: 5, dir: 'up', show: before },
    { id: 'bank_cust2', sprite: 'woman', x: 10, y: 5, dir: 'up', wander: 1, show: before },
    { id: 'bank_guard', sprite: 'official2', x: 12, y: 4, dir: 'left' },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ Tech Repair

function tech(): MapDef {
  const rows = R(12, [
    ' WWWWWWWWWW ',
    ' w=w^ww^w7w ',
    ' 1........2 ',
    ' 1..CCCC..1 ',
    ' 4..5.....6 ',
    ' 3.......53 ',
    ' 1.4......1 ',
    ' x....5...x ',
    ' %........x ',
    '      m     ',
  ]);
  const b = fromAscii('w2_tech', 'TECH REPAIR', rows, STYLES.workshop, X);
  b.m.world = 2;
  b.warp(6, 9, 'isl', ISL_DOORS.tech.x, ISL_DOORS.tech.y + 1, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'shop';
  b.m.dark = 0.2;
  b.m.darkStyle = 'candle';
  b.spot(4, 1, 'tech_screen').spot(7, 1, 'tech_screen').spot(1, 3, 'tech_machine').spot(10, 4, 'tech_computer').spot(10, 2, 'tech_tools');
  b.light(5 * 16, 2 * 16, 40, 0.3);
  npcs(b, [{ id: 'techie', sprite: 'techie', x: 5, y: 2, dir: 'down' }]);
  return b.build();
}

// ------------------------------------------------------------------ Rick's Rides

/** The bike you steal from: front and centre in the showroom. */
export const HERO_BIKE = { x: 8, y: 5 };

function dealer(): MapDef {
  const rows = R(18, [
    ' WWWWWWWWWWWWWWWW ',
    ' wQwPwwQwwQwwwwww ',
    ' 2%%............. ',
    ' 3/.............6 ',
    ' 3..........CC... ',
    ' %...............',
    ' 2/..............',
    ' ................ ',
    ' 9..............9 ',
    ' p..............p ',
    ' ................ ',
    '        mm        ',
  ].map((r) => r.padEnd(18, ' ').slice(0, 18)));
  const b = fromAscii('w2_dealer', "RICK'S RIDES", rows, STYLES.shop, X);
  b.m.world = 2;
  b.warp(8, 11, 'isl', ISL_DOORS.dealer.x, ISL_DOORS.dealer.y + 1, 'down', 'step', 'w2_dealer_exit');
  b.warp(9, 11, 'isl', ISL_DOORS.dealer.x + 1, ISL_DOORS.dealer.y + 1, 'down', 'step', 'w2_dealer_exit');
  b.m.spawn = { x: 8, y: 10, dir: 'up' };
  b.m.music = 'dealer';
  b.m.dark = 0.05;
  b.m.darkStyle = 'candle';
  // the office in the back corner, its door, and the service bay on the left
  b.g(14, 1, T.DOORI);
  b.spot(14, 1, 'dealer_office');
  b.spot(1, 3, 'dealer_service').spot(1, 4, 'dealer_service').spot(1, 5, 'dealer_service').spot(1, 6, 'dealer_service');
  b.spot(16, 3, 'dealer_computer').spot(3, 1, 'dealer_poster').spot(7, 1, 'dealer_poster').spot(10, 1, 'dealer_poster');
  // motorcycles on display
  const bikes: [number, number, string][] = [
    [HERO_BIKE.x, HERO_BIKE.y, 'p2_bike_hero'],
    [4, 4, 'p2_bike'],
    [12, 6, 'p2_bike'],
    [4, 8, 'p2_bike'],
    [12, 8, 'p2_bike'],
    [8, 2, 'p2_bike'],
  ];
  bikes.forEach(([x, y, key], i) => {
    b.prop(key, x - 0.5, y - 0.5, [{ x, y, w: 2, h: 1 }], { sortY: y + 1 });
    b.spot(x, y, i === 0 ? 'dealer_hero' : 'dealer_bike');
    b.spot(x + 1, y, i === 0 ? 'dealer_hero' : 'dealer_bike');
  });
  npcs(b, [{ id: 'rick', sprite: 'rick', x: 8, y: 8, dir: 'down', show: (st) => !isSet(st, 'w2_stole') }]);
  return b.build();
}

// ------------------------------------------------------------------ the grocery store (Fresh Mart)

export const PB_SPOT = { x: 6, y: 4 };
export const STORE_HOLE = { x: 13, y: 1 };

function grocery(): MapDef {
  const rows = R(18, [
    ' WWWWWWWWWWWWWWWW ',
    ' wQwwwwwQwwwwwwQw ',
    ' fq..........qq.f ',
    ' F...........q..F ',
    ' .ee.ee.ee.ee.... ',
    ' .EE.EE.EE.EE.... ',
    ' ................ ',
    ' .ee.ee.ee.ee.R.. ',
    ' .EE.EE.EE.EE.... ',
    ' ................ ',
    ' 8.............C$ ',
    ' ..............C. ',
    ' 8.....__........ ',
    '        mm        ',
  ]);
  const b = fromAscii('w2_grocery', 'FRESH MART', rows, STYLES.shop, X);
  b.m.world = 2;
  b.warp(8, 13, 'isl', ISL_DOORS.grocery.x, ISL_DOORS.grocery.y + 1, 'down', 'step', 'w2_grocery_exit');
  b.warp(9, 13, 'isl', ISL_DOORS.grocery.x + 1, ISL_DOORS.grocery.y + 1, 'down', 'step', 'w2_grocery_exit');
  b.m.spawn = { x: 8, y: 12, dir: 'up' };
  b.m.music = 'empty_store';
  b.m.dark = 0.45;
  b.m.darkStyle = 'cellar';
  // aisle 3 (SPREADS) is the one with the peanut butter
  b.d(PB_SPOT.x, 4, D.PB_SHELF_T).d(PB_SPOT.x, 5, D.PB_SHELF_B).d(PB_SPOT.x - 1, 4, D.PB_SHELF_T).d(PB_SPOT.x - 1, 5, D.PB_SHELF_B);
  b.spot(PB_SPOT.x, 5, 'store_pb').spot(PB_SPOT.x - 1, 5, 'store_pb').spot(PB_SPOT.x, 4, 'store_pb').spot(PB_SPOT.x - 1, 4, 'store_pb');
  for (const [x, y] of [
    [2, 4],
    [3, 4],
    [2, 5],
    [3, 5],
    [8, 4],
    [9, 4],
    [8, 5],
    [9, 5],
    [11, 4],
    [12, 4],
    [11, 5],
    [12, 5],
  ])
    b.spot(x, y, 'store_shelf_top');
  for (const [x, y] of [
    [2, 7],
    [3, 7],
    [5, 7],
    [6, 7],
    [8, 7],
    [9, 7],
    [11, 7],
    [12, 7],
    [2, 8],
    [3, 8],
    [5, 8],
    [6, 8],
    [8, 8],
    [9, 8],
    [11, 8],
    [12, 8],
  ])
    b.spot(x, y, 'store_shelf_bottom');
  b.spot(1, 2, 'store_fridge').spot(16, 2, 'store_fridge').spot(16, 10, 'store_register').spot(15, 10, 'store_register');
  b.d(2, 1, D.POSTER);
  // the hole Rick drives through, and the rubble
  b.prop('tile:' + D.RUBBLE, STORE_HOLE.x, STORE_HOLE.y + 1, 'none', { show: (st) => isSet(st, 'w2_pb_taken') });
  b.prop('tile:' + D.DEBRIS, STORE_HOLE.x + 1, STORE_HOLE.y + 2, 'none', { show: (st) => isSet(st, 'w2_pb_taken') });
  b.prop('tile:' + D.TIRE, STORE_HOLE.x - 1, STORE_HOLE.y + 3, 'none', { show: (st) => isSet(st, 'w2_pb_taken') });
  b.light(8 * 16, 6 * 16, 50, 0.6).light(14 * 16, 2 * 16, 40, 0.3, (st) => isSet(st, 'w2_pb_taken'));
  // Rick, after the crash (and after the fight, lying in the wreckage)
  npcs(b, [
    { id: 'rick_store', sprite: 'raw:rickbike', x: STORE_HOLE.x, y: STORE_HOLE.y + 3, dir: 'left', show: (st) => isSet(st, 'w2_pb_taken') && !isSet(st, 'w2_rick_beaten') },
    { id: 'rick_down', sprite: 'rick', x: STORE_HOLE.x, y: STORE_HOLE.y + 3, dir: 'down', show: (st) => isSet(st, 'w2_rick_beaten') && !isSet(st, 'w2_assembled') },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ the voters (and two other houses)

function voters(): MapDef[] {
  const D_ = ISL_DOORS;
  const list: MapDef[] = [];
  const add = (id: keyof typeof ISL_DOORS, name: string, rows: string[], who: N | null, extra?: (b: MapBuilder) => void, style = STYLES.house) => {
    const b = house('w2_' + id, name, rows, D_[id], style);
    if (who) npcs(b, [who]);
    extra?.(b);
    list.push(b.build());
  };
  // Gus keeps receipts of every penny the flood fund ever spent
  add('v_gus', "GUS'S HOUSE", [' WWWWWWW ', ' w7w~w7w ', ' ll..6.b ', ' ......B ', ' .Tt.... ', ' .c..... ', ' ..rrr.. ', ' p8....k ', '         '], { id: 'v_gus', sprite: 'man_hat', x: 5, y: 3, dir: 'down', wander: 1 }, (b) => {
    b.spot(1, 2, 'gus_files').spot(2, 2, 'gus_files');
  });
  // Marla lost her house: she is living in her sister's, in boxes
  add('v_marla', "MARLA'S SISTER'S HOUSE", [' WWWWWWW ', ' wOw~wOw ', ' xx.x.hx ', ' x....Hx ', ' ..xx... ', ' ....... ', ' x...xx. ', ' xx....x ', '         '], { id: 'v_marla', sprite: 'woman3', x: 3, y: 5, dir: 'down', wander: 1 });
  // Dot runs the island's only laundromat; nobody in charge has ever asked her anything
  add('v_dot', "DOT'S PLACE", [' WWWWWWW ', ' wOwPwOw ', ' K.S..fq ', ' ......F ', ' .Tt.... ', ' .c...[] ', ' ..rrr.. ', ' p.....p ', '         '], { id: 'v_dot', sprite: 'woman_bun', x: 4, y: 4, dir: 'down', wander: 1 });
  // Quentin has pinned every newspaper since the first wave to the wall
  add('v_quentin', "QUENTIN'S HOUSE", [' WWWWWWW ', ' w7w7w7w ', ' 6.....b ', ' ......B ', ' .7.M... ', ' ....... ', ' ..rrr.. ', ' 9.....k ', '         '].map((r, i) => (i === 4 ? ' .......'.padEnd(9, ' ') : r)), { id: 'v_quentin', sprite: 'official2', x: 4, y: 3, dir: 'down', wander: 1 }, (b) => {
    b.spot(2, 1, 'quentin_wall').spot(4, 1, 'quentin_wall').spot(6, 1, 'quentin_wall');
  });
  // Bev, a retired schoolteacher, believes in resignations
  add('v_bev', "BEV'S HOUSE", [' WWWWWWW ', ' wPwOwPw ', ' bb..hh. ', ' BB..HH. ', ' ....... ', ' .o.[].. ', ' .c..... ', ' p.....p ', '         '], { id: 'v_bev', sprite: 'old_lady', x: 4, y: 4, dir: 'down', wander: 1 });
  // Otto hates politicians. All of them. In principle.
  add('v_otto', "OTTO'S HOUSE", [' WWWWWWW ', ' wQwQwQw ', ' !.....h ', ' ......H ', ' ..[]... ', ' ....... ', ' x..9..x ', ' %.....% ', '         '].map((r) => r.replace('!', 'x')), { id: 'v_otto', sprite: 'grandpa2', x: 4, y: 3, dir: 'down' }, (b) => {
    b.spot(2, 1, 'otto_posters').spot(4, 1, 'otto_posters').spot(6, 1, 'otto_posters');
  });
  // Sid thinks elections are pointless, and is willing to explain why for hours
  add('v_sid', "SID'S HOUSE", [' WWWWWWW ', ' wOwQwOw ', ' ....... ', ' .[]..h. ', ' .....H. ', ' ..o.... ', ' ....... ', ' 9.....p ', '         '], { id: 'v_sid', sprite: 'surfer', x: 2, y: 5, dir: 'right' });
  // Lorna has a grudge, and it is extremely specific
  add('v_lorna', "LORNA'S HOUSE", [' WWWWWWW ', ' wPwPwPw ', ' ....... ', ' .Tt..h. ', ' .c...H. ', ' ....... ', ' (.(.(.( ', ' p.....p ', '         '], { id: 'v_lorna', sprite: 'woman2', x: 4, y: 5, dir: 'up' }, (b) => {
    b.spot(1, 6, 'lorna_pots').spot(3, 6, 'lorna_pots').spot(5, 6, 'lorna_pots').spot(7, 6, 'lorna_pots');
  });
  // a family packing up to leave
  add('h_pack', 'THE ABBOTTS', [' WWWWWWW ', ' wOw~wOw ', ' xx...h. ', ' x....H. ', ' ..xx... ', ' ....... ', ' x..xx.x ', ' ?....xx ', '         '], { id: 'abbott', sprite: 'man2', x: 3, y: 4, dir: 'down', wander: 1, show: before }, (b) => {
    npcs(b, [{ id: 'abbott_kid', sprite: 'kid_girl', x: 5, y: 5, dir: 'left', wander: 1, show: before }]);
  });
  // a house the sea got inside of
  add(
    'h_flood',
    'A FLOODED HOUSE',
    [' WWWWWWW ', ' w~w~w~w ', ' ,,&.,h, ', ' ,,..,H, ', ' ,.[],., ', ' ,,,,,,, ', ' &,,,.., ', ' ,,..,,& ', '         '],
    null,
    (b) => {
      b.spot(3, 4, 'flood_sofa').spot(4, 4, 'flood_sofa').spot(6, 2, 'flood_bed').spot(6, 3, 'flood_bed').spot(3, 2, 'flood_photo');
    },
    STYLES.flooded
  );
  return list;
}

// ------------------------------------------------------------------ cutscene sets

/** The emergency briefing room, somewhere off the island. */
function gov(): MapDef {
  const rows = R(16, [
    ' WWWWWWWWWWWWWW ',
    ' w^ww^ww^ww^w=w ',
    ' 6..l......l..6 ',
    ' ..c.c.c.c.c... ',
    ' ..MMMMMMMMM... ',
    ' ..MMMMMMMMM... ',
    ' ..c.c.c.c.c... ',
    ' 1............1 ',
    ' .............. ',
    '                ',
  ]);
  const b = fromAscii('w2_gov', 'EMERGENCY COMMAND', rows, STYLES.shop, X);
  b.m.world = 2;
  b.m.spawn = { x: 7, y: 8, dir: 'up' };
  b.m.music = 'gov';
  b.m.dark = 0.35;
  b.m.darkStyle = 'candle';
  b.prop('bigscreen', 5, -0.2, 'none', { sortY: 0 });
  for (const [x, y] of [
    [2, 1],
    [5, 1],
    [8, 1],
    [11, 1],
  ])
    b.light(x * 16 + 8, y * 16 + 8, 26, 0.2);
  b.light(8 * 16, 5 * 16, 60, 0.1);
  npcs(b, [
    { id: 'g_chief', sprite: 'official', x: 7, y: 3, dir: 'down' },
    { id: 'g_general', sprite: 'official2', x: 3, y: 6, dir: 'up' },
    { id: 'g_sci1', sprite: 'scientist', x: 11, y: 3, dir: 'down' },
    { id: 'g_sci2', sprite: 'scientist2', x: 9, y: 6, dir: 'up' },
    { id: 'g_aide', sprite: 'banker', x: 5, y: 3, dir: 'down' },
    { id: 'g_pilot', sprite: 'man_cap', x: 13, y: 7, dir: 'left' },
  ]);
  return b.build();
}

/** The deep sea: a long strip the submarine travels through. */
export const DEEP_W = 110;
function deep(): MapDef {
  const b = new MapBuilder('w2_deep', 'THE DEEP', DEEP_W, 20, T.VOID);
  b.m.world = 2;
  b.rect(0, 16, DEEP_W, 4, T.SEAFLOOR);
  b.m.music = 'deep';
  b.m.amb = 'deep';
  b.m.dark = 0.88;
  b.m.darkStyle = 'cave';
  b.m.spawn = { x: 2, y: 8, dir: 'right' };
  return b.build();
}

/** The Cave of the Gods. */
export const GOD_X: Record<string, number> = { zeus: 4, thor: 14, poseidon: 24, athena: 34 };
export const CAVE_W = 44;
export const CAVE_H = 38;

function cave(): MapDef {
  const b = new MapBuilder('w2_cave', 'THE CAVE OF THE GODS', CAVE_W, CAVE_H, T.VOID);
  const m = b.m;
  m.world = 2;
  m.music = 'gods';
  m.amb = 'gods';
  m.dark = 0.62;
  m.darkStyle = 'cave';
  m.spawn = { x: 21, y: 31, dir: 'up' };
  // the chamber floor
  b.rect(1, 6, CAVE_W - 2, CAVE_H - 9, T.GODSTONE);
  // the soaring back wall
  b.rect(1, 0, CAVE_W - 2, 4, T.GODWALL_TOP);
  b.rect(1, 4, CAVE_W - 2, 2, T.GODWALL);
  b.rect(0, 0, 1, CAVE_H, T.GODWALL_TOP);
  b.rect(CAVE_W - 1, 0, 1, CAVE_H, T.GODWALL_TOP);
  // side walls taper the room toward the sea pool at the bottom
  for (let y = 26; y < CAVE_H; y++) {
    const inset = Math.floor((y - 26) * 0.9);
    b.rect(1, y, inset, 1, T.GODWALL_TOP);
    b.rect(CAVE_W - 1 - inset, y, inset, 1, T.GODWALL_TOP);
  }
  // where the sea came in
  b.rect(14, CAVE_H - 4, 16, 3, T.WATER);
  b.rect(12, CAVE_H - 5, 20, 1, T.SEAFLOOR);
  b.rect(14, CAVE_H - 1, 16, 1, T.GODWALL_TOP);
  // carvings along the wall, pillars down the sides
  for (let x = 2; x < CAVE_W - 2; x++) if (x % 3 === 0) b.d(x, 5, D.CARVING);
  for (let y = 8; y < 26; y += 4) {
    b.d(2, y, D.PILLAR_T).d(2, y + 1, D.PILLAR_B);
    b.d(CAVE_W - 3, y, D.PILLAR_T).d(CAVE_W - 3, y + 1, D.PILLAR_B);
  }
  // the four gods and their doors
  for (const g of GODS) {
    const x = GOD_X[g];
    b.prop(`g_door_${g}`, x + 1.5, 2, [{ x: x + 2, y: 4, w: 2, h: 2 }], { sortY: 6, show: (st) => st.flags.w2_touched !== g && st.flags.w2_god !== g });
    b.prop(`g_door_${g}_lit`, x + 1.5, 2, [{ x: x + 2, y: 4, w: 2, h: 2 }], { id: `g_door_${g}_lit`, sortY: 6, show: (st) => st.flags.w2_touched === g && st.flags.w2_god !== g });
    b.prop('g_door_open', x + 1.5, 2, [{ x: x + 2, y: 4, w: 2, h: 1 }], { id: `g_door_${g}_open`, sortY: 6, show: (st) => st.flags.w2_god === g });
    b.spot(x + 2, 5, 'god_door_' + g);
    b.spot(x + 3, 5, 'god_door_' + g);
    // the chosen door leads into its temple (the others never open)
    const sp = TEMPLE_SPAWN[g];
    b.warp(x + 2, 5, sp.map, sp.x, sp.y, 'up', 'door', 'god_gate_' + g);
    b.warp(x + 3, 5, sp.map, sp.x, sp.y, 'up', 'door', 'god_gate_' + g);
    b.prop(`g_statue_${g}`, x, 9, [{ x: x, y: 20, w: 6, h: 2 }], { sortY: 22 });
    for (let k = 0; k < 6; k++) b.spot(x + k, 21, 'statue_' + g);
    b.d(x - 1, 23, D.BRAZIER).d(x + 6, 23, D.BRAZIER);
    b.light((x - 1) * 16 + 8, 23 * 16 + 4, 40, 0.5).light((x + 6) * 16 + 8, 23 * 16 + 4, 40, 0.5);
    b.light(x * 16 + 48, 14 * 16, 64, 0.05); // a pale glow on each statue
  }
  // floor glyphs, urns, rubble, the sea's leavings
  for (const [x, y, d] of [
    [21, 25, D.GLYPH],
    [10, 27, D.GLYPH],
    [33, 27, D.GLYPH],
    [6, 25, D.URN],
    [37, 25, D.URN],
    [16, 29, D.RUBBLE],
    [28, 30, D.RUBBLE],
    [12, 32, D.SEAWEED],
    [30, 32, D.CLAMSHELL],
    [19, 33, D.SEAWEED],
    [9, 23, D.CRACK],
    [31, 24, D.CRACK],
  ] as const)
    b.d(x, y, d);
  b.spot(21, 25, 'cave_glyph').spot(6, 25, 'cave_urn').spot(37, 25, 'cave_urn').spot(9, 5, 'cave_carving').spot(30, 5, 'cave_carving');
  // the crashed submarine
  b.prop('g_subwreck', 23, 28, [{ x: 24, y: 30, w: 4, h: 1 }], { sortY: 31 });
  b.spot(25, 30, 'cave_sub');
  b.spot(26, 30, 'cave_sub');
  // shafts of light from impossibly far above
  for (const x of [9, 20, 30]) b.prop('g_shaft', x, -2, 'none', { over: true });
  b.light(10 * 16, 14 * 16, 50, 0.1).light(21 * 16, 16 * 16, 60, 0.1).light(31 * 16, 14 * 16, 50, 0.1);
  // the inventor reacts as you wander
  b.trigger(1, 22, CAVE_W - 2, 3, 'cave_statues_close', 'q_cave_close');
  return b.build();
}

export function buildW2Interiors(): MapDef[] {
  return [inventor(), hall(), bankMap(), tech(), dealer(), grocery(), ...voters(), gov(), deep(), cave()];
}

void has;
