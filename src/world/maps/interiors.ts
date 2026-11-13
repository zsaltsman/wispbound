import { fromAscii, STYLES, find } from '../ascii';
import { MapBuilder, type MapDef, type Dir } from '../mapdef';
import { T, D } from '../tiles';
import { makeMaze } from '../maze';
import { isSet, has, routesOpen } from '../../story/state';

// Every indoor location, dungeon and maze in Hollowhaven.

/** Join row segments and insist on an exact width (catches authoring slips early). */
function R(width: number, ...parts: string[]) {
  const s = parts.join('');
  if (s.length !== width) throw new Error(`row width ${s.length} != ${width}: "${s}"`);
  return s;
}

type N = { id: string; sprite: string; x: number; y: number; dir: Dir; wander?: number; script?: string; show?: (st: any) => boolean; big?: boolean };
function npcs(b: MapBuilder, list: N[]) {
  for (const n of list) b.npc({ ...n, script: n.script ?? n.id, wander: n.wander ?? 0 });
}

/** A standard little house: 9 x 9, exit mat in the middle of the bottom row. */
function house(id: string, name: string, rows: string[], door: [number, number]): MapBuilder {
  const b = fromAscii(id, name, rows, STYLES.house);
  b.g(4, rows.length - 1, T.MAT);
  b.warp(4, rows.length - 1, 'town', door[0], door[1] + 1, 'down', 'step');
  b.m.spawn = { x: 4, y: rows.length - 2, dir: 'up' };
  b.m.dark = 0.22;
  b.m.darkStyle = 'candle';
  b.m.music = 'house';
  return b;
}

// ------------------------------------------------------------------ the Mayor's Office

function office(): MapDef {
  const rows = [
    ' WWWWWWWWWWWW ',
    ' wOwwPwwNwwOw ',
    ' l....c.....b ',
    ' l....dD....B ',
    ' ............ ',
    ' ..rrrrrrr... ',
    ' ..rrrrrrr..g ',
    ' p.........kp ',
    ' ............ ',
    '      mm      ',
  ];
  const b = fromAscii('office', "MAYOR'S OFFICE", rows, STYLES.shop);
  b.warp(6, 9, 'town', 47, 33, 'down', 'step').warp(7, 9, 'town', 48, 33, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'office';
  b.m.dark = 0.12;
  b.m.darkStyle = 'candle';
  b.spot(5, 1, 'office_portrait').spot(12, 6, 'office_dogbed').spot(12, 2, 'office_books').spot(12, 3, 'office_books');
  b.spot(1, 2, 'office_files').spot(1, 3, 'office_files').spot(6, 3, 'office_desk').spot(7, 3, 'office_desk');
  b.spot(11, 7, 'office_cabinet');
  b.light(6 * 16 + 16, 3 * 16, 40, 0.1);
  npcs(b, [
    { id: 'assistant', sprite: 'assistant', x: 4, y: 4, dir: 'left' },
    { id: 'mayor_desk', sprite: 'mayor', x: 6, y: 4, dir: 'down', show: (st) => isSet(st, 'ending_done') },
    { id: 'end_mabel', sprite: 'old_lady', x: 2, y: 6, dir: 'right', show: (st) => isSet(st, 'ending_done') },
    { id: 'end_gerald', sprite: 'gerald', x: 10, y: 6, dir: 'left', show: (st) => isSet(st, 'ending_done') },
    { id: 'end_farmer', sprite: 'farmer', x: 3, y: 8, dir: 'up', show: (st) => isSet(st, 'ending_done') },
    { id: 'end_psychic', sprite: 'psychic', x: 10, y: 4, dir: 'left', show: (st) => isSet(st, 'ending_done') },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ the psychic

function psychic(): MapDef {
  const rows = [
    ' WWWWWWWWWWW ',
    ' w^wPwwwPw^w ',
    ' y...n.n...y ',
    ' b....Y..... ',
    ' B..*****... ',
    ' ...*****..y ',
    ' )..*****... ',
    ' n.........n ',
    ' y.........p ',
    '      m      ',
  ];
  const b = fromAscii('psychic', "MADAME ORACLE'S", rows, STYLES.psychic);
  b.warp(6, 9, 'town', 24, 18, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'psychic';
  b.m.dark = 0.55;
  b.m.darkStyle = 'candle';
  b.spot(6, 3, 'psychic_ball').spot(1, 6, 'psychic_cauldron').spot(1, 3, 'psychic_books').spot(1, 4, 'psychic_books');
  b.spot(11, 2, 'psychic_crystal').spot(1, 2, 'psychic_crystal');
  for (const [x, y] of find(rows, 'n')) b.light(x * 16 + 8, y * 16 + 4, 34, 0.5);
  b.light(6 * 16 + 8, 3 * 16 + 6, 30, 0.2);
  npcs(b, [
    { id: 'psychic', sprite: 'psychic', x: 6, y: 2, dir: 'down' },
    { id: 'tickraith_corner', sprite: 'cr_tickraith', x: 11, y: 4, dir: 'left', big: true, show: (st) => !isSet(st, 'tick_given') && !isSet(st, 'clock_delivered') },
    { id: 'old_clock', sprite: 'grandclock', x: 11, y: 4, dir: 'left', big: true, show: (st) => isSet(st, 'clock_delivered') },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ townhouses

function mabel(): MapDef {
  const b = house(
    'mabel',
    "MABEL'S HOUSE",
    [' WWWWWWW ', ' wOwPwOw ', ' iI...bh ', ' ..o..BH ', ' ..c...p ', ' rrrrr.. ', ' rrrrr.. ', ' p.....k ', '         '],
    [33, 17]
  );
  b.spot(4, 1, 'mabel_painting').spot(6, 2, 'mabel_books').spot(6, 3, 'mabel_books').spot(1, 2, 'mabel_fire').spot(2, 2, 'mabel_fire').spot(7, 7, 'mabel_cabinet');
  b.light(2 * 16, 2 * 16 + 8, 36, 0.5);
  npcs(b, [
    { id: 'mabel', sprite: 'old_lady', x: 4, y: 4, dir: 'down', wander: 1 },
    { id: 'mabel_cat', sprite: 'cat', x: 2, y: 6, dir: 'right', wander: 2 },
  ]);
  return b.build();
}

function gerald(): MapDef {
  const b = house(
    'gerald',
    "GERALD'S HOUSE",
    [' WWWWWWW ', ' wQw@wOw ', ' {.....h ', ' }.....H ', ' .Tt.[]. ', ' ....... ', ' ..rrr.. ', ' p.....! ', '         '],
    [63, 17]
  );
  b.prop('p_uglyclock', 4, 2, [{ x: 4, y: 2, w: 1, h: 1 }], { show: (st) => !isSet(st, 'clock_got') });
  b.spot(4, 2, 'gerald_clock').spot(4, 1, 'gerald_wallclock').spot(2, 1, 'gerald_poster').spot(7, 7, 'gerald_tv');
  npcs(b, [{ id: 'gerald', sprite: 'gerald', x: 4, y: 4, dir: 'down', wander: 1 }]);
  return b.build();
}

function coffin(): MapDef {
  const b = house(
    'coffin',
    "THE COUNT'S HOUSE",
    [' WWWWWWW ', ' w^wPw^w ', ' jn...nj ', ' J.....J ', ' ...o... ', ' ..c.c.. ', ' ....... ', ' X.....p ', '         '],
    [71, 17]
  );
  b.spot(1, 3, 'coffin_box').spot(7, 3, 'coffin_box2').spot(1, 7, 'coffin_barrel');
  b.light(2 * 16 + 8, 2 * 16 + 4, 30, 0.6).light(6 * 16 + 8, 2 * 16 + 4, 30, 0.6);
  b.m.dark = 0.6;
  npcs(b, [{ id: 'count', sprite: 'count', x: 4, y: 3, dir: 'down' }]);
  return b.build();
}

function spoons(): MapDef {
  const b = house(
    'spoons',
    "DOUG'S HOUSE",
    [' WWWWWWW ', ' wOwPwOw ', ' <<<.<<< ', ' ....... ', ' .Tt..h. ', ' .c...H. ', ' rrrrr.. ', ' p.....k ', '         '],
    [80, 51]
  );
  for (const x of [1, 2, 3, 5, 6, 7]) b.spot(x, 2, 'spoons_display');
  npcs(b, [{ id: 'doug', sprite: 'man_cap', x: 4, y: 3, dir: 'down', wander: 1 }]);
  return b.build();
}

function twins(): MapDef {
  const b = house('twins', "THE TWINS' HOUSE", [' WWWWWWW ', ' wOwMwOw ', ' h.....h ', ' H.....H ', ' ...o... ', ' ..c.c.. ', ' ....... ', ' p.....p ', '         '], [62, 36]);
  b.spot(3, 1, 'twins_mirror');
  npcs(b, [
    { id: 'twin1', sprite: 'twin', x: 3, y: 6, dir: 'down', script: 'twins' },
    { id: 'twin2', sprite: 'twin', x: 5, y: 6, dir: 'down', script: 'twins' },
  ]);
  return b.build();
}

function fan(): MapDef {
  const b = house("fan", "BERNARD'S HOUSE", [' WWWWWWW ', ' wPwPwPw ', ' ..>.... ', ' ....... ', ' [].o... ', ' ....c.. ', ' .rrrr.. ', ' p.....k ', '         '], [39, 62]);
  b.spot(3, 2, 'fan_shrine').spot(1, 1, 'fan_portraits').spot(3, 1, 'fan_portraits').spot(5, 1, 'fan_portraits').spot(7, 7, 'fan_cabinet');
  b.light(3 * 16 + 8, 2 * 16 + 4, 30, 0.5);
  npcs(b, [{ id: 'bernard', sprite: 'man_round', x: 4, y: 5, dir: 'up', wander: 1 }]);
  return b.build();
}

function tavern(): MapDef {
  const rows = [
    ' WWWWWWWWW ',
    ' wOwwNwwOw ',
    ' ...X..XX. ',
    ' CCCCCC... ',
    ' ......... ',
    ' .o..o..o. ',
    ' .c..c..c. ',
    ' ......... ',
    ' p.......p ',
    '    m      ',
  ];
  const b = fromAscii('tavern', 'THE DROWNED RAT', rows, STYLES.house);
  b.warp(4, 9, 'town', 34, 38, 'down', 'step');
  b.m.spawn = { x: 4, y: 8, dir: 'up' };
  b.m.music = 'tavern';
  b.m.dark = 0.3;
  b.m.darkStyle = 'candle';
  b.spot(4, 2, 'tavern_barrel').spot(7, 2, 'tavern_barrel');
  for (const x of [2, 5, 8]) b.light(x * 16 + 8, 5 * 16 + 4, 28, 0.5);
  npcs(b, [
    { id: 'barkeep', sprite: 'man_beard', x: 3, y: 2, dir: 'down' },
    { id: 'drunk', sprite: 'old_man', x: 2, y: 7, dir: 'up', wander: 1 },
    { id: 'sailor', sprite: 'man_cap', x: 6, y: 4, dir: 'down' },
    { id: 'cardplayer', sprite: 'woman', x: 9, y: 6, dir: 'left' },
  ]);
  return b.build();
}

function farmhouse(): MapDef {
  const b = house('farmhouse', 'THE FARMHOUSE', [' WWWWWWW ', ' wOwPwOw ', ' iI..fh. ', ' ....FH. ', ' .Tt..k. ', ' .c..... ', ' rrrr... ', ' p...SK. ', '         '], [12, 28]);
  b.spot(4, 1, 'farm_photo').spot(5, 2, 'farm_fridge').spot(5, 3, 'farm_fridge').spot(5, 7, 'farm_stove');
  npcs(b, [{ id: 'farmwife', sprite: 'woman_bun', x: 3, y: 5, dir: 'down', wander: 1 }]);
  return b.build();
}

function barn(): MapDef {
  const rows = [
    ' WWWWWWWWW ',
    ' wwwOwOwww ',
    ' %%..&&.%% ',
    ' %.......% ',
    ' ..X...X.. ',
    ' ......... ',
    ' %%.....u. ',
    ' %........ ',
    ' ..x....xx ',
    '     m     ',
  ];
  const b = fromAscii('barn', 'THE BARN', rows, STYLES.barn);
  b.warp(5, 9, 'town', 27, 30, 'down', 'step');
  b.m.spawn = { x: 5, y: 8, dir: 'up' };
  b.m.music = 'farm';
  b.m.amb = 'farm';
  b.m.dark = 0.35;
  b.m.darkStyle = 'candle';
  b.spot(8, 6, 'barn_feed').spot(5, 2, 'barn_sacks').spot(6, 2, 'barn_sacks').spot(2, 2, 'barn_hay');
  b.light(5 * 16 + 8, 4 * 16, 50, 0.1);
  npcs(b, [{ id: 'cow', sprite: 'cow', x: 4, y: 6, dir: 'right', wander: 1 }]);
  return b.build();
}

function fishshop(): MapDef {
  const b = house('fishshop', 'THE SALTY HOOK', [' WWWWWWW ', ' wQwOwQw ', ' "..X..` ', ' CCCCC.. ', ' ....... ', ' X.....X ', ' ....... ', ' `.....p ', '         '], [57, 65]);
  b.m.music = 'shop';
  b.spot(7, 2, 'fishshop_rack').spot(6, 1, 'fishshop_poster');
  npcs(b, [{ id: 'shopkeep', sprite: 'fisher_keeper', x: 3, y: 2, dir: 'down' }]);
  return b.build();
}

// ------------------------------------------------------------------ the grocery store

function store(): MapDef {
  const W = 24;
  const main = [
    '................',
    '.eeee..eeee..ff.',
    '.EEEE..EEEE..FF.',
    '................',
    '.eeee..eeee..ee.',
    '.EEEE..EEEE..EE.',
    '................',
    '................',
    '..CC$C....CC$C..',
    '................',
    'p......pp......p',
    '................',
  ];
  const side = ['0.0.0', '.....', 'K...K', '##.##', '.....', '....V', '.....', '##.##', 'x...:', '.....', 'u..x.', 'xx.xx'];
  const div = (y: number) => (y === 5 ? '.' : '#');
  const rows = [R(W, ' ', 'W'.repeat(22), ' '), R(W, ' ', 'wQwOwwwQwwwOwwQw', 'w', 'wwwww', ' ')];
  for (let i = 0; i < 12; i++) rows.push(R(W, ' ', main[i], div(i), side[i], ' '));
  rows.push(R(W, ' '.repeat(9), 'mm', ' '.repeat(13)));
  const b = fromAscii('store', 'GROCERIES & MORE', rows, STYLES.shop);
  b.warp(9, 14, 'town', 67, 54, 'down', 'step').warp(10, 14, 'town', 68, 54, 'down', 'step');
  b.m.spawn = { x: 9, y: 13, dir: 'up' };
  b.m.music = 'store';
  b.m.amb = 'store';
  b.m.dark = 0.1;
  b.m.darkStyle = 'candle';
  // the men's room (top of the side wing)
  b.d(20, 5, D.NONE);
  b.spot(18, 2, 'wc_toilet1').spot(20, 2, 'wc_toilet2').spot(22, 2, 'wc_toilet3').spot(18, 4, 'wc_sink').spot(22, 4, 'wc_sink');
  // cellar stairs behind a locked door
  b.warp(22, 7, 'cellar', 1, 1, 'down', 'step');
  b.prop('p_door_cellar', 22, 7, [{ x: 22, y: 7, w: 1, h: 1 }], { show: (st) => !isSet(st, 'bait_cellar') });
  b.spot(22, 7, 'cellar_door', (st) => !isSet(st, 'bait_cellar'));
  // the staff closet
  b.prop('p_door_closet', 20, 9, [{ x: 20, y: 9, w: 1, h: 1 }], { show: (st) => !isSet(st, 'closet_open') });
  b.spot(20, 9, 'closet_door', (st) => !isSet(st, 'closet_open'));
  b.spot(18, 10, 'closet_shelf');
  // aisles and checkouts
  for (const x of [2, 3, 4, 5, 8, 9, 10, 11]) b.spot(x, 4, 'store_aisle').spot(x, 7, 'store_aisle');
  b.spot(14, 3, 'store_fridge').spot(15, 3, 'store_fridge').spot(14, 6, 'store_aisle').spot(15, 6, 'store_aisle');
  for (let x = 2; x < 16; x += 3) b.light(x * 16 + 8, 3 * 16, 46, 0.05);
  const open = (st: any) => st.creature !== null && !isSet(st, 'dutchman_arrived');
  npcs(b, [
    { id: 'clerk', sprite: 'clerk', x: 13, y: 9, dir: 'down', show: open },
    { id: 'shopper1', sprite: 'old_lady', x: 6, y: 5, dir: 'left', wander: 2, show: open },
    { id: 'shopper2', sprite: 'man_hat', x: 12, y: 8, dir: 'up', wander: 2, show: open },
    { id: 'umbrawl_closet', sprite: 'cr_umbrawl', x: 20, y: 11, dir: 'down', big: true, show: (st) => isSet(st, 'umbrawl_fled') && st.creature === null },
  ]);
  return b.build();
}

// ------------------------------------------------------------------ the mansion

function mansion1(): MapDef {
  const W = 26;
  const L = ['bbb.bbb', 'BBB.BBB', '.......', 'b.b.b.b', 'B.B.B.B', '.......', 'n.o.c.n', '.......', '###.###', '.......', 'iI.....', '.......', '.[]..o.', '.....c.', 'rrrrr..', 'rrrrr..', 'p.....p', '.......'];
  const Hh = ['...UU...', '........', '..aA....', '........', 'Z......Z', '........', '...rr...', '...rr...', '...rr...', '...rr...', '...rr...', '...rr...', 'Z..rr..Z', '...rr...', '...rr...', '...rr...', 'p..rr..p', '........'];
  const K = ['SK(..fp', '.....F.', '.......', '.......', '.x.....', '.......', '###.###', '.......', '.......', '.......', '.TtTt..', '.cccc..', '.......', '.cccc..', '.TtTt..', '.......', 'p.....p', '.......'];
  const c8 = (y: number) => (y === 6 || y === 16 ? '.' : '#');
  const c17 = (y: number) => (y === 5 || y === 14 ? '.' : '#');
  const rows = [R(W, ' ', 'W'.repeat(24), ' '), R(W, ' ', 'wwOwPww', 'w', 'wwPwwPww', 'w', 'wOwwwOw', ' ')];
  for (let i = 0; i < 18; i++) rows.push(R(W, ' ', L[i], c8(i + 2), Hh[i], c17(i + 2), K[i], ' '));
  rows.push(R(W, ' '.repeat(12), 'mm', ' '.repeat(12)));
  const b = fromAscii('mansion1', 'THE MANSION', rows, STYLES.mansion);
  b.warp(12, 20, 'town', 79, 35, 'down', 'step').warp(13, 20, 'town', 80, 35, 'down', 'step');
  b.m.spawn = { x: 12, y: 19, dir: 'up' };
  b.m.music = 'mansion';
  b.m.amb = 'mansion';
  b.m.dark = 0.72;
  b.m.darkStyle = 'candle';
  // stairs up
  b.warp(12, 2, 'mansion2', 12, 8, 'up', 'step').warp(13, 2, 'mansion2', 13, 8, 'up', 'step');
  // the secret passage behind the library shelf
  b.g(4, 1, T.DOORI);
  b.warp(4, 1, 'mansion_secret', 4, 5, 'up', 'door', 'secret_door');
  b.prop('p_shelf_gap', 4, 2, [{ x: 4, y: 2, w: 1, h: 2 }], { show: (st) => !isSet(st, 'shelf_moved') });
  b.spot(4, 3, 'mansion_shelf', (st) => !isSet(st, 'shelf_moved'));
  b.spot(1, 3, 'mansion_books').spot(7, 3, 'mansion_books').spot(1, 6, 'mansion_books').spot(3, 6, 'mansion_books').spot(5, 6, 'mansion_books');
  b.spot(11, 4, 'mansion_piano').spot(12, 4, 'mansion_piano');
  b.spot(11, 1, 'mansion_painting2').spot(14, 1, 'mansion_painting3');
  b.spot(9, 6, 'mansion_armor').spot(16, 6, 'mansion_armor').spot(9, 14, 'mansion_armor').spot(16, 14, 'mansion_armor');
  b.spot(20, 2, 'mansion_pot').spot(18, 2, 'mansion_stove').spot(19, 2, 'mansion_sink').spot(23, 2, 'mansion_fridge').spot(23, 3, 'mansion_fridge');
  b.spot(19, 6, 'mansion_note');
  b.spot(1, 12, 'mansion_fire').spot(2, 12, 'mansion_fire');
  for (const [x, y] of find(rows, 'n')) b.light(x * 16 + 8, y * 16 + 4, 34, 0.7);
  b.light(4 * 16 + 8, 12 * 16, 40, 0.6).light(12 * 16 + 16, 8 * 16, 30, 0.8).light(21 * 16, 13 * 16, 30, 0.8);
  b.trigger(11, 17, 4, 3, 'mansion_enter', 'mansion_slam');
  b.trigger(9, 4, 4, 2, 'mansion_piano_ghost', 'mansion_piano_played');
  b.trigger(18, 10, 7, 2, 'mansion_dining_chill', 'mansion_dining_seen');
  return b.build();
}

function mansion2(): MapDef {
  const W = 26;
  const A = ['h...{n', 'H...}.', '......', '..o...', 'p....p'];
  const S = ['xx.zX.x', 'x....q.', '.?..x..', 'X..u..z', 'xx...xx'];
  const M = ['n..h.h..n', '...H.H...', '.........', '.{..r..k.', 'p}......p'];
  const B = ['h.....{..h.', 'H.....}..H.', '...o.......'];
  const Nn = ['h..x.....x..', 'H.........p.', '..rrr...u...'];
  const rows = [R(W, ' ', 'W'.repeat(24), ' '), R(W, ' ', 'wwOwww', 'w', 'wwPwwww', 'w', 'wwOwwPwww', ' ')];
  for (let i = 0; i < 5; i++) rows.push(R(W, ' ', A[i], '#', S[i], '#', M[i], ' '));
  rows.push(R(W, ' ', '##.###', '#', '###.###', '#', '####.####', ' '));
  rows.push(R(W, ' ', '........................', ' '));
  rows.push(R(W, ' ', '...........VV...........', ' '));
  rows.push(R(W, ' ', '#####.######', '#####.######', ' '));
  for (let i = 0; i < 3; i++) rows.push(R(W, ' ', B[i], '#', Nn[i], ' '));
  rows.push(R(W, ' ', '#'.repeat(24), ' '));
  rows.push(R(W, ' '.repeat(26)));
  const b = fromAscii('mansion2', 'THE MANSION - UPSTAIRS', rows, STYLES.mansion);
  b.m.spawn = { x: 12, y: 8, dir: 'down' };
  b.m.music = 'mansion';
  b.m.amb = 'mansion';
  b.m.dark = 0.75;
  b.m.darkStyle = 'candle';
  b.warp(12, 9, 'mansion1', 12, 3, 'down', 'step').warp(13, 9, 'mansion1', 13, 3, 'down', 'step');
  // locked master bedroom
  b.prop('p_door_master', 20, 7, [{ x: 20, y: 7, w: 1, h: 1 }], { show: (st) => !isSet(st, 'bedroom_open') });
  b.spot(20, 7, 'master_door', (st) => !isSet(st, 'bedroom_open'));
  b.spot(19, 2, 'master_bed').spot(21, 2, 'master_bed').spot(23, 5, 'master_cabinet');
  b.spot(9, 2, 'storage_box').spot(9, 3, 'storage_box').spot(11, 4, 'storage_sack').spot(12, 5, 'storage_bucket');
  b.spot(1, 2, 'bedA_bed').spot(5, 2, 'bedA_wardrobe').spot(1, 3, 'bedA_bed');
  b.spot(1, 11, 'bedB_bed').spot(10, 11, 'bedB_bed').spot(7, 11, 'bedB_wardrobe');
  b.spot(16, 11, 'nursery_toys').spot(22, 11, 'nursery_toys').spot(13, 11, 'nursery_bed').spot(13, 12, 'nursery_bed').spot(21, 13, 'nursery_box');
  for (const [x, y] of find(rows, 'n')) b.light(x * 16 + 8, y * 16 + 4, 34, 0.7);
  b.light(12 * 16 + 16, 8 * 16, 40, 0.8);
  b.trigger(1, 8, 4, 2, 'mansion_hall_ghost', 'mansion_ghost_seen');
  b.trigger(16, 3, 9, 4, 'master_enter');
  npcs(b, [{ id: 'booheet_bed', sprite: 'cr_booheet', x: 20, y: 4, dir: 'down', big: true, show: (st) => st.creature === null && isSet(st, 'bedroom_open') }]);
  return b.build();
}

function mansionSecret(): MapDef {
  const rows = [' WWWWWWW ', ' wPwwwPw ', ' n.....n ', ' ....... ', ' ....... ', ' ....... ', '    m    '];
  const b = fromAscii('mansion_secret', 'A HIDDEN ROOM', rows, STYLES.mansion);
  b.warp(4, 6, 'mansion1', 4, 4, 'down', 'step');
  b.m.spawn = { x: 4, y: 5, dir: 'up' };
  b.m.music = 'mansion';
  b.m.amb = 'mansion';
  b.m.dark = 0.8;
  b.m.darkStyle = 'candle';
  b.prop('p_pedestal', 4, 3, [{ x: 4, y: 3, w: 1, h: 1 }], { show: (st) => isSet(st, 'mansion_key_got') });
  b.prop('p_pedestal_key', 4, 3, [{ x: 4, y: 3, w: 1, h: 1 }], { show: (st) => !isSet(st, 'mansion_key_got') });
  b.spot(4, 3, 'secret_pedestal');
  b.spot(2, 1, 'secret_portrait').spot(6, 1, 'secret_portrait2');
  b.light(2 * 16 + 8, 2 * 16 + 4, 30, 0.6).light(7 * 16 + 8, 2 * 16 + 4, 30, 0.6).light(4 * 16 + 8, 3 * 16, 26, 0.3);
  return b.build();
}

// ------------------------------------------------------------------ the well

function well(): MapDef {
  const rows = [' WWWWWWW ', ' ###L### ', ' #.._..# ', ' #_....# ', ' #..~~.# ', ' #.~~~_# ', ' #...._# ', ' ##...## ', ' ###.### ', ' ####### '];
  const b = fromAscii('well', 'THE BOTTOM OF THE WELL', rows, STYLES.well);
  b.warp(4, 1, 'town', 47, 41, 'down', 'step');
  b.m.spawn = { x: 4, y: 2, dir: 'down' };
  b.m.music = 'well';
  b.m.amb = 'cave';
  b.m.dark = 0.85;
  b.m.darkStyle = 'well';
  b.light(4 * 16 + 8, 0, 60, 0.05); // the circle of sky far above
  b.prop('p_wellkey', 4, 8, 'none', { show: (st) => !has(st, 'office_key') && !isSet(st, 'office_open') });
  b.spot(4, 8, 'well_key', undefined, true).spot(2, 4, 'well_scratches').spot(6, 6, 'well_scratches2');
  return b.build();
}

// ------------------------------------------------------------------ the cave

function cave(): MapDef {
  const mz = makeMaze(20, 15, 1337, 28, [
    [9, 9, 5, 3],
    [25, 5, 4, 4],
    [17, 19, 5, 3],
    [31, 21, 4, 3],
  ]);
  const b = new MapBuilder('cave', 'THE SEA CAVE', mz.w + 2, mz.h + 2, T.CAVEWALL);
  // offset by one so the entrance can sit on the top edge
  for (let y = 0; y < mz.h; y++)
    for (let x = 0; x < mz.w; x++) {
      if (mz.open[y * mz.w + x]) b.g(x + 1, y + 1, (x * 7 + y * 13) % 5 === 0 ? T.CAVE2 : T.CAVE);
    }
  // wall tops: a wall tile with floor below it shows its face, deeper rock shows its top
  for (let y = 0; y < b.m.h; y++)
    for (let x = 0; x < b.m.w; x++) {
      if (b.gt(x, y) !== T.CAVEWALL) continue;
      const below = b.gt(x, y + 1);
      if (below !== T.CAVE && below !== T.CAVE2) b.g(x, y, T.CAVEWALL_TOP);
    }
  // entrance from the park (top-left)
  b.g(2, 1, T.CAVE).g(2, 0, T.LADDER);
  b.warp(2, 0, 'town', 8, 53, 'down', 'step');
  b.m.spawn = { x: 2, y: 1, dir: 'down' };
  b.m.music = 'cave';
  b.m.amb = 'cave';
  b.m.dark = 1;
  b.m.darkStyle = 'cave';
  const [fx, fy] = [mz.far[0] + 1, mz.far[1] + 1];
  // decorate: glowing rocks as landmarks, stalagmites and bones in dead ends, puddles
  let k = 0;
  for (const [dx, dy] of mz.deadEnds) {
    const x = dx + 1;
    const y = dy + 1;
    if (Math.abs(x - fx) + Math.abs(y - fy) < 3 || (x < 5 && y < 5)) continue;
    k++;
    if (k % 4 === 0) {
      b.d(x, y, D.GLOWROCK);
      b.light(x * 16 + 8, y * 16 + 8, 26, 0.3);
    } else if (k % 4 === 1) b.d(x, y, D.STALAG);
    else if (k % 4 === 2) b.d(x, y, D.BONES);
    else b.g(x, y, T.PUDDLE);
  }
  // hints: little ghost-lights drifting down the right path every so often
  b.light(fx * 16 + 8, fy * 16 + 8, 46, 0.6);
  b.spot(Math.min(b.m.w - 2, fx + 1), fy, 'cave_shipwreck');
  npcs(b, [{ id: 'shipwraith_cave', sprite: 'cr_shipwraith', x: fx, y: fy, dir: 'left', big: true, show: (st) => st.creature === null }]);
  b.npc({ id: 'cave_wreck', sprite: 'wreck', x: fx, y: fy, dir: 'left', script: 'cave_wreck', big: true, show: (st) => st.creature !== null });
  b.trigger(fx - 3, fy - 3, 7, 7, 'cave_deep', 'cave_deep_trig', (st) => st.creature === null);
  // a crack of daylight next to the lair leads straight back to the park
  const exit = mz.deadEnds.find(([x, y]) => Math.abs(x + 1 - fx) + Math.abs(y + 1 - fy) >= 2 && Math.abs(x + 1 - fx) + Math.abs(y + 1 - fy) <= 8);
  if (exit) {
    const [ex, ey] = [exit[0] + 1, exit[1] + 1];
    b.d(ex, ey, D.NONE).g(ex, ey, T.LADDER);
    b.warp(ex, ey, 'town', 9, 53, 'down', 'step');
    b.light(ex * 16 + 8, ey * 16 + 8, 30, 0.1, (st) => st.creature !== null);
  }
  return b.build();
}

// ------------------------------------------------------------------ the cellar

function cellar(): MapDef {
  const mz = makeMaze(19, 14, 4242, 22, [
    [7, 7, 5, 3],
    [21, 3, 5, 3],
    [13, 17, 7, 3],
    [27, 15, 5, 5],
  ]);
  const b = new MapBuilder('cellar', 'THE CELLAR', mz.w, mz.h, T.SHELFWALL);
  for (let y = 0; y < mz.h; y++)
    for (let x = 0; x < mz.w; x++) if (mz.open[y * mz.w + x]) b.g(x, y, (x * 5 + y * 3) % 7 === 0 ? T.CONCRETE2 : T.CONCRETE);
  for (let x = 0; x < mz.w; x++) b.g(x, 0, T.WALLC);
  b.g(1, 0, T.STAIRS_UP);
  b.warp(1, 0, 'store', 22, 8, 'down', 'step');
  b.m.spawn = { x: 1, y: 1, dir: 'down' };
  b.m.music = 'cellar';
  b.m.amb = 'cellar';
  b.m.dark = 0.97;
  b.m.darkStyle = 'cellar';
  const [fx, fy] = mz.far;
  const decor = [D.ROTTEN, D.CRATE, D.CANS, D.BROKENBOX, D.BARREL, D.CORPSE_FRIDGE, D.ROTTEN, D.MOP, D.SACK, D.CANS];
  let k = 0;
  for (const [x, y] of mz.deadEnds) {
    if (Math.abs(x - fx) + Math.abs(y - fy) < 2 || (x < 4 && y < 4)) continue;
    b.d(x, y, decor[k++ % decor.length]);
    if (k % 5 === 0) b.spot(x, y, 'cellar_junk');
  }
  // old strip lights in the big rooms flicker on and off
  for (const [rx, ry, rw, rh] of [
    [7, 7, 5, 3],
    [21, 3, 5, 3],
    [13, 17, 7, 3],
    [27, 15, 5, 5],
  ])
    b.light((rx + rw / 2) * 16, (ry + rh / 2) * 16, 34, 0.9);
  b.light(16 + 8, 8, 30, 0.1); // the stairwell
  // the bait, in the far corner
  b.prop('p_bait', fx, fy, [{ x: fx, y: fy, w: 1, h: 1 }], { show: (st) => !has(st, 'bait') && !isSet(st, 'bait_delivered') });
  b.spot(fx, fy, 'cellar_bait', (st) => !has(st, 'bait') && !isSet(st, 'bait_delivered'));
  // signs scrawled by somebody who got lost down here before
  const signs = mz.deadEnds.filter((_, i) => i % 9 === 4).slice(0, 3);
  signs.forEach(([x, y], i) => {
    if (b.dt(x, y) === D.NONE) b.d(x, y, D.SIGN);
    b.spot(x, y, 'cellar_sign' + (i + 1));
  });
  // the fisherman steps out of the dark two tiles behind you
  let [gx, gy] = [fx, fy];
  for (let step = 0; step < 3; step++) {
    const d0 = mz.dist[gy * mz.w + gx];
    const nb = [
      [gx + 1, gy],
      [gx - 1, gy],
      [gx, gy + 1],
      [gx, gy - 1],
    ].find(([x, y]) => mz.open[y * mz.w + x] && mz.dist[y * mz.w + x] === d0 - 1);
    if (nb) [gx, gy] = nb as [number, number];
  }
  b.m.triggers.push({ x: gx, y: gy, w: 1, h: 1, id: 'cellar_mark' });
  npcs(b, [{ id: 'fisherman', sprite: 'fisherman', x: gx, y: gy, dir: 'down', show: (st) => isSet(st, 'fisher_appeared') && !isSet(st, 'fisher_beaten') }]);
  void routesOpen;
  return b.build();
}

export function buildInteriors(): MapDef[] {
  return [office(), psychic(), mabel(), gerald(), coffin(), spoons(), twins(), fan(), tavern(), farmhouse(), barn(), fishshop(), store(), mansion1(), mansion2(), mansionSecret(), well(), cave(), cellar()];
}
