import { MapBuilder, type MapDef, type NpcDef, type Dir } from '../mapdef';
import { fromAscii, STYLES, type ExtraChars } from '../ascii';
import { T, D } from '../tiles';
import { isSet } from '../../story/state';
import type { StoryState } from '../../story/state';
import { w3Stage, crowdAt, type W3Stage } from '../../story/w3_state';

// World 3: BACCHUS KEY, the party island. The town and its neighbourhoods, Club
// Forever (dance floor, bar, hotel, clinic), and every shop, home and hideout.

export const W3_W = 100;
export const W3_H = 80;

/** Doors on the island (interiors return the player to the tile below). */
export const W3_DOORS = {
  club: { x: 49, y: 22 },
  hotel: { x: 38, y: 22 },
  art: { x: 17, y: 51 },
  buffet: { x: 62, y: 51 },
  lobster: { x: 73, y: 51 },
  cafe: { x: 83, y: 51 },
  dough: { x: 62, y: 62 },
  froyo: { x: 73, y: 62 },
  karaoke: { x: 11, y: 37 },
  arcade: { x: 19, y: 37 },
  diner: { x: 30, y: 37 },
  souvenir: { x: 58, y: 37 },
  costume: { x: 67, y: 37 },
  tipsy: { x: 70, y: 20 },
  sunset: { x: 28, y: 20 },
  home0: { x: 10, y: 61 },
  home1: { x: 19, y: 61 },
  home2: { x: 26, y: 61 },
  cave: { x: 4, y: 26 },
};
/** The tap at the foot of the Great Barrel, and the spot the strange man stands. */
export const BARREL_TAP = { x: 81, y: 36 };
export const BACKDOOR = { x: 50, y: 8 };

const R = (w: number, rows: string[]) => {
  rows.forEach((r) => {
    if (r.length !== w) throw new Error(`row width ${r.length} != ${w}: "${r}"`);
  });
  return rows;
};

// ------------------------------------------------------------------ the crowd

type Who = { look: string; dance?: boolean; wander?: number; dir?: Dir };
/** Partygoers: they come and go with the days. `tier` 0 is always there, higher tiers leave first. */
function crowd(b: MapBuilder, zone: string, spots: [number, number, number][], who: Who[]) {
  spots.forEach(([x, y, tier], i) => {
    const w = who[i % who.length];
    const n: NpcDef = {
      id: `w3c_${zone}_${i}`,
      sprite: w.look,
      x,
      y,
      dir: w.dir ?? (['down', 'left', 'right', 'up'] as Dir[])[(x + y) % 4],
      script: 'w3_crowd',
      wander: w.dance ? 0 : w.wander ?? (i % 3 === 0 ? 2 : 0),
      show: (st: StoryState) => crowdAt(st, zone, tier),
    };
    if (w.dance) (n as any).dance = true;
    b.npc(n);
  });
}

const PARTY: Who[] = [
  { look: 'partier1', dance: true },
  { look: 'partier2' },
  { look: 'partier3', dance: true },
  { look: 'tourist', wander: 3 },
  { look: 'partier4', dance: true },
  { look: 'partier5' },
  { look: 'partier6', dance: true },
  { look: 'tourist2', wander: 2 },
  { look: 'local3' },
  { look: 'local4', wander: 2 },
];
const DANCERS: Who[] = [
  { look: 'partier1', dance: true },
  { look: 'partier3', dance: true },
  { look: 'partier4', dance: true },
  { look: 'partier6', dance: true },
  { look: 'partier2', dance: true },
  { look: 'partier5', dance: true },
];

// ------------------------------------------------------------------ the island

function islandShape(x: number, y: number) {
  const dx = (x - 50) / 47;
  const dy = (y - 40) / 37;
  const wob = 0.03 * Math.sin(x * 0.21 + 1.1) + 0.025 * Math.sin(y * 0.27 + 0.4);
  return Math.pow(Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4), 1 / 4) - wob;
}

const night = (st: StoryState) => ['n1', 'n2'].includes(w3Stage(st));
const stageIs = (...s: W3Stage[]) => (st: StoryState) => s.includes(w3Stage(st));

function island(): MapDef {
  const b = new MapBuilder('w3_isl', 'BACCHUS KEY', W3_W, W3_H, T.WATER);
  const m = b.m;
  m.world = 3;
  m.outdoor = true;
  m.music = 'party';
  m.amb = 'coast';
  m.dark = 0.05;
  m.darkStyle = 'night';
  m.fishing = false;
  m.spawn = { x: 50, y: 73, dir: 'up' };
  // land, beaches and a lush interior
  for (let y = 0; y < W3_H; y++)
    for (let x = 0; x < W3_W; x++) {
      const r = islandShape(x, y);
      if (r < 0.92) b.g(x, y, T.GRASS);
      else if (r < 1) b.g(x, y, T.SANDLIT);
    }
  b.scatter(0, 0, W3_W, W3_H, T.GRASS, [T.GRASS2], 0.12, 31);
  const prom = (x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, T.PROMENADE);
    b.scatter(x, y, w, h, T.PROMENADE, [T.PROMENADE2], 0.35, x * 7 + y);
  };
  const road = (x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, T.ASPHALT);
    b.scatter(x, y, w, h, T.ASPHALT, [T.ASPHALT2], 0.2, x * 11 + y * 3);
  };
  // the club plaza, the Strip down to the harbour, the back alley
  prom(30, 23, 40, 7);
  prom(47, 30, 6, 42);
  road(34, 5, 32, 3);
  road(33, 5, 2, 18);
  road(65, 5, 2, 18);
  prom(24, 21, 8, 2);
  prom(66, 21, 8, 2);
  // Neon Lane, Food Row, the arts quarter, the homes
  road(4, 38, 92, 3);
  b.rect(4, 37, 92, 1, T.SIDEWALK);
  road(56, 52, 36, 4);
  road(56, 63, 36, 3);
  road(6, 52, 40, 4);
  road(6, 62, 30, 3);
  b.rect(44, 41, 3, 11, T.SIDEWALK);
  b.rect(53, 41, 3, 25, T.SIDEWALK);
  b.rect(8, 56, 1, 6, T.SIDEWALK);
  b.rect(36, 56, 2, 8, T.SIDEWALK);
  // the barrel plaza
  prom(72, 37, 20, 1);
  prom(70, 22, 4, 15);
  // the harbour
  b.rect(46, 72, 8, 2, T.BOARDWALK);
  b.rect(48, 74, 4, 6, T.DOCK_V);
  b.rect(10, 70, 30, 2, T.BOARDWALK);
  b.rect(60, 70, 30, 2, T.BOARDWALK);
  // the path out along the cliffs to Ayla's cave
  b.rect(4, 27, 2, 11, T.SANDLIT);
  b.rect(3, 22, 5, 5, T.CAVE);
  b.rect(3, 20, 5, 2, T.CAVEWALL_TOP);

  // ---------------------------------------------------------------- Club Forever
  b.prop('b3_club', 36, 8, [{ x: 36, y: 8, w: 28, h: 15 }], { show: (st) => !isSet(st, 'w3_club_smashed') });
  b.prop('b3_club_wrecked', 36, 8, [{ x: 36, y: 8, w: 28, h: 15 }], { show: (st) => isSet(st, 'w3_club_smashed') });
  b.warp(49, 22, 'w3_club', 21, 27, 'up', 'door', 'w3_club_door');
  b.warp(50, 22, 'w3_club', 22, 27, 'up', 'door', 'w3_club_door');
  b.warp(38, 22, 'w3_club', 37, 12, 'up', 'door', 'w3_hotel_door');
  b.warp(39, 22, 'w3_club', 38, 12, 'up', 'door', 'w3_hotel_door');
  b.npc({ id: 'bouncer', sprite: 'bouncer', x: 47, y: 23, dir: 'down', script: 'w3_bouncer', show: (st) => stageIs('d1', 'n1')(st) && !isSet(st, 'w3_sal_dead') });
  b.d(51, 23, D.BARRIER).d(46, 23, D.BARRIER);
  // the back door opens onto the alley
  b.warp(BACKDOOR.x, BACKDOOR.y, 'w3_club', 2, 3, 'down', 'door', 'w3_backdoor_in');
  b.d(40, 6, D.TRASHCAN).d(42, 6, D.CRATE).d(58, 6, D.CRATE).d(60, 6, D.BARREL);
  // the plaza: palms, lamps, the street stage, balloons, bunting overhead
  b.prop('p3_stage', 39, 24, [{ x: 39, y: 25, w: 3, h: 1 }], { sortY: 26 });
  b.npc({ id: 'w3_performer', sprite: 'performer', x: 40, y: 24, dir: 'down', script: 'w3_performer', show: stageIs('d1', 'n1', 'd2', 'end') });
  for (const [x, y, k] of [
    [31, 24, 0],
    [67, 24, 1],
    [31, 28, 2],
    [67, 28, 0],
  ])
    b.prop(`p3_palm${k}`, x - 1, y - 2, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  for (const x of [44, 56]) b.prop('p3_lamp', x, 26, [{ x, y: 28, w: 1, h: 1 }], { sortY: 29 });
  for (let y = 32; y < 70; y += 6) for (const x of [46, 53]) b.prop('p3_lamp', x, y - 2, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  for (let y = 30; y < 70; y += 9) b.prop(`p3_bunting${(y / 9) % 2 ? 1 : 0}`, 47, y - 1, 'none', { over: true });
  b.prop('p3_bunting0', 36, 22.5, 'none', { over: true });
  b.prop('p3_bunting1', 56, 22.5, 'none', { over: true });
  b.prop('p3_balloons', 45, 22, [{ x: 45, y: 23, w: 1, h: 1 }], { sortY: 24 });
  b.prop('p3_balloons', 54, 22, [{ x: 54, y: 23, w: 1, h: 1 }], { sortY: 24 });
  for (const [x, y] of [[32, 26], [44, 24], [56, 25], [62, 27], [36, 28]]) b.light(x * 16 + 8, y * 16, 44, 0.1, night);
  for (let y = 32; y < 70; y += 6) for (const x of [46, 53]) b.light(x * 16 + 8, (y - 2) * 16 + 4, 36, 0.2, night);
  b.light(50 * 16, 20 * 16, 90, 0.15, night);

  // ---------------------------------------------------------------- the Great Barrel
  b.prop('b3_barrel', 78, 24, [{ x: 78, y: 24, w: 8, h: 13 }], { show: (st) => !isSet(st, 'w3_barrel_gone') });
  b.prop('b3_barrel_broken', 78, 24, [{ x: 78, y: 31, w: 8, h: 6 }], { show: (st) => isSet(st, 'w3_barrel_gone') });
  b.spot(BARREL_TAP.x, BARREL_TAP.y, 'w3_tap').spot(BARREL_TAP.x + 1, BARREL_TAP.y, 'w3_tap');
  for (const x of [76, 88]) b.prop('p3_lamp', x, 34, [{ x, y: 36, w: 1, h: 1 }], { sortY: 37 });
  b.npc({ id: 'w3_ayla_barrel', sprite: 'ayla', x: 84, y: 37, dir: 'left', script: 'w3_ayla_buy', show: (st) => isSet(st, 'w3_painting') && !isSet(st, 'w3_sold') });
  b.npc({ id: 'w3_milo_barrel', sprite: 'milo', x: 86, y: 37, dir: 'left', script: 'w3_milo_barrel', show: (st) => isSet(st, 'w3_jug_quest') && !isSet(st, 'w3_jug_full') });
  b.light(82 * 16, 34 * 16, 60, 0.1, night);

  // ---------------------------------------------------------------- the strip's hotels
  b.prop('b3_hotel2', 24, 11, [{ x: 24, y: 11, w: 9, h: 10 }]);
  b.warp(28, 20, 'w3_lobby2', 5, 8, 'up');
  b.prop('b3_hotel1', 66, 12, [{ x: 66, y: 12, w: 9, h: 9 }]);
  b.warp(70, 20, 'w3_lobby', 5, 8, 'up');

  // ---------------------------------------------------------------- Neon Lane
  const shop = (key: string, x: number, y: number, w: number, h: number, door: { x: number; y: number }, to: string, gate?: string) => {
    b.prop(key, x, y, [{ x, y, w, h }]);
    b.warp(door.x, door.y, to, 5, 8, 'up', 'door', gate);
  };
  shop('b3_karaoke', 8, 32, 7, 6, W3_DOORS.karaoke, 'w3_karaoke');
  shop('b3_arcade', 16, 32, 7, 6, W3_DOORS.arcade, 'w3_arcade');
  shop('b3_diner', 26, 33, 8, 5, W3_DOORS.diner, 'w3_diner');
  shop('b3_souvenir', 56, 33, 6, 5, W3_DOORS.souvenir, 'w3_souvenir');
  shop('b3_costume', 64, 33, 6, 5, W3_DOORS.costume, 'w3_costume');
  b.prop('p3_photobooth', 38, 34.5, [{ x: 38, y: 36, w: 2, h: 1 }], { sortY: 37 });
  b.spot(38, 36, 'w3_photobooth').spot(39, 36, 'w3_photobooth');

  // ---------------------------------------------------------------- the arts quarter
  b.prop('b3_art', 14, 47, [{ x: 14, y: 47, w: 7, h: 5 }], { show: (st) => !isSet(st, 'w3_shop_closed') });
  b.prop('b3_art_closed', 14, 47, [{ x: 14, y: 47, w: 7, h: 5 }], { show: (st) => isSet(st, 'w3_shop_closed') });
  b.warp(W3_DOORS.art.x, W3_DOORS.art.y, 'w3_art', 6, 8, 'up', 'door', 'w3_art_door');
  b.prop('p3_forsale', 21, 50, [{ x: 21, y: 51, w: 1, h: 1 }], { sortY: 52, show: (st) => isSet(st, 'w3_shop_closed') });
  b.spot(21, 51, 'w3_forsale', (st) => isSet(st, 'w3_shop_closed'));
  for (const [k, x, d] of [['b3_house0', 8, W3_DOORS.home0], ['b3_house1', 16, W3_DOORS.home1], ['b3_house2', 23, W3_DOORS.home2]] as const) {
    b.prop(k, x, 57, [{ x, y: 57, w: 6, h: 5 }]);
    b.warp(d.x, d.y, 'w3_home' + k.slice(-1), 4, 7, 'up');
  }
  b.prop('p3_palm1', 29, 45, [{ x: 30, y: 47, w: 1, h: 1 }], { sortY: 48 });
  b.prop('p3_palm2', 39, 57, [{ x: 40, y: 59, w: 1, h: 1 }], { sortY: 60 });

  // ---------------------------------------------------------------- Food Row
  shop('b3_buffet', 58, 46, 9, 6, W3_DOORS.buffet, 'w3_buffet');
  shop('b3_lobster', 69, 46, 8, 6, W3_DOORS.lobster, 'w3_lobster');
  shop('b3_cafe', 79, 46, 8, 6, W3_DOORS.cafe, 'w3_cafe');
  shop('b3_dough', 58, 56, 8, 7, W3_DOORS.dough, 'w3_dough');
  shop('b3_froyo', 69, 56, 8, 7, W3_DOORS.froyo, 'w3_froyo');
  // queues outside the two busy ones (the street tells you who is doing well)
  crowd(b, 'q_dough', [[61, 64, 0], [60, 64, 0], [59, 64, 1], [58, 65, 1], [57, 65, 2]], [{ look: 'tourist', dir: 'up' }, { look: 'local4', dir: 'up' }, { look: 'partier5', dir: 'right' }, { look: 'local3', dir: 'right' }, { look: 'tourist2', dir: 'right' }]);
  crowd(b, 'q_froyo', [[72, 64, 0], [71, 64, 0], [70, 64, 1], [69, 65, 1], [68, 65, 2]], [{ look: 'partier3', dir: 'up' }, { look: 'tourist2', dir: 'up' }, { look: 'local3', dir: 'right' }, { look: 'partier1', dir: 'right' }, { look: 'kid3', dir: 'right' }]);

  // ---------------------------------------------------------------- Ayla's cave, out on the western cliffs
  b.prop('p3_cave', 2.5, 22.5, [{ x: 3, y: 23, w: 3, h: 2 }], { sortY: 25 });
  b.warp(W3_DOORS.cave.x, W3_DOORS.cave.y - 1, 'w3_aylacave', 6, 8, 'up', 'door', 'w3_cave_door');

  // ---------------------------------------------------------------- the harbour and the beaches
  b.d(47, 73, D.ROPEPOST).d(52, 73, D.ROPEPOST).d(46, 76, D.LIFERING).d(53, 77, D.BUOY);
  for (const [x, y] of [[14, 66], [22, 67], [64, 67], [78, 66], [86, 67]]) b.d(x, y, D.BUOY);
  b.npc({ id: 'w3_guide', sprite: 'guide', x: 50, y: 70, dir: 'down', script: 'w3_guide' });

  // ---------------------------------------------------------------- people everywhere
  crowd(b, 'plaza', [[34, 25, 0], [36, 26, 1], [42, 27, 0], [45, 25, 2], [55, 26, 1], [58, 24, 0], [61, 27, 2], [64, 25, 1], [38, 28, 3], [60, 28, 3], [52, 27, 2], [48, 28, 3]], PARTY);
  crowd(b, 'strip', [[48, 33, 1], [51, 36, 0], [49, 42, 2], [50, 47, 1], [48, 53, 3], [51, 58, 2], [49, 64, 1], [50, 68, 3]], PARTY);
  crowd(b, 'neon', [[9, 39, 2], [15, 39, 1], [24, 40, 0], [33, 39, 3], [41, 40, 1], [60, 39, 2], [66, 40, 0], [74, 39, 1], [88, 40, 3]], PARTY);
  crowd(b, 'barrel', [[74, 37, 1], [77, 38, 0], [86, 38, 2], [89, 37, 3], [72, 30, 2]], PARTY);
  crowd(b, 'food', [[60, 53, 2], [66, 54, 1], [76, 53, 3], [86, 54, 2]], PARTY);
  crowd(b, 'beach', [[16, 68, 1], [24, 68, 2], [66, 68, 1], [80, 68, 3], [88, 67, 2]], PARTY);
  crowd(b, 'arts', [[12, 53, 2], [22, 54, 3], [30, 53, 1]], PARTY);
  return b.build();
}

// ------------------------------------------------------------------ Club Forever

export const CLUB = { bar: { x: 6, y: 4 }, dj: { x: 21, y: 3 }, window: { x: 34, y: 2 }, elevator: { x: 40, y: 2 }, clinic: { x: 41, y: 27 }, backdoor: { x: 2, y: 2 } };

function club(): MapDef {
  const b = new MapBuilder('w3_club', 'CLUB FOREVER', 44, 30, T.VOID);
  const m = b.m;
  m.world = 3;
  m.music = 'club';
  m.amb = 'indoor';
  m.dark = 0.5;
  m.darkStyle = 'candle';
  b.rect(0, 0, 44, 1, T.CLUBWALL);
  b.rect(0, 1, 44, 1, T.CLUBWALL_LOW);
  b.rect(0, 0, 1, 30, T.CLUBWALL);
  b.rect(43, 0, 1, 30, T.CLUBWALL);
  b.rect(0, 29, 44, 1, T.CLUBWALL);
  b.rect(1, 2, 42, 27, T.CLUBCARPET);
  // the bar (west), open to the floor
  b.rect(1, 2, 11, 27, T.BARWOOD);
  for (let x = 2; x <= 10; x++) b.d(x, 5, D.COUNTER);
  for (let x = 2; x <= 10; x += 2) b.d(x, 7, D.CHAIR);
  for (const [x, y] of [[3, 11], [7, 11], [3, 16], [7, 16], [3, 21], [7, 21]]) b.d(x, y, D.TABLE_ROUND).d(x + 1, y, D.CHAIR);
  for (const x of [4, 6, 8]) b.prop('p3_bottles', x, 0, 'none', { id: 'bottles' + x, sortY: 2, show: (st) => !isSet(st, 'w3_bar_dry') || isSet(st, 'w3_jug_done') });
  for (const x of [4, 6, 8]) b.prop('p3_bottles_empty', x, 0, 'none', { sortY: 2, show: (st) => isSet(st, 'w3_bar_dry') && !isSet(st, 'w3_jug_done') });
  // (no examine spots on the counter itself: you talk to the bartender across it)
  b.spot(11, 5, 'w3_bar');
  b.npc({ id: 'sal', sprite: 'sal', x: CLUB.bar.x, y: CLUB.bar.y, dir: 'down', script: 'w3_sal', show: (st) => !isSet(st, 'w3_sal_dead') });
  b.npc({ id: 'avalena_bar', sprite: 'avalena_bar', x: CLUB.bar.x, y: CLUB.bar.y, dir: 'down', script: 'w3_avalena_bar', show: (st) => isSet(st, 'w3_day2') });
  // the back door, behind the bar
  b.g(CLUB.backdoor.x, 1, T.MAT);
  // a proper door on the wall, so you can see where it is (and when it opens)
  const bdOpen = (st: StoryState) => isSet(st, 'w3_backdoor_open') && !isSet(st, 'w3_ayla_seen');
  b.prop('p3_backdoor', CLUB.backdoor.x - 0.5, 0, 'none', { sortY: 2, show: (st) => !bdOpen(st) });
  b.prop('p3_backdoor_open', CLUB.backdoor.x - 0.5, 0, 'none', { sortY: 2, show: bdOpen });
  b.light(CLUB.backdoor.x * 16 + 8, 20, 30, 0.5);
  b.warp(CLUB.backdoor.x, 1, 'w3_isl', 50, 7, 'up', 'door', 'w3_backdoor');
  // the stage and DJ booth, the dance floor
  b.rect(14, 2, 16, 3, T.STAGE);
  b.rect(14, 6, 16, 12, T.CLUBFLOOR);
  for (let y = 6; y < 18; y++) for (let x = 14; x < 30; x++) if ((x + y) % 2) b.g(x, y, T.CLUBFLOOR2);
  b.prop('p3_dj', 19.5, 1.5, [{ x: 20, y: 3, w: 3, h: 1 }], { sortY: 4 });
  b.npc({ id: 'w3_dj', sprite: 'dj', x: 21, y: 2, dir: 'down', script: 'w3_dj', show: (st) => !['n2', 'd3'].includes(w3Stage(st)) });
  b.spot(20, 3, 'w3_djbooth').spot(22, 3, 'w3_djbooth');
  for (const x of [13, 30]) b.prop('p3_speaker', x, 1, [{ x, y: 2, w: 1, h: 1 }], { sortY: 3 });
  b.prop('p3_disco', 21.5, 4.5, 'none', { over: true });
  b.spot(21, 11, 'w3_dance', undefined, true).spot(22, 11, 'w3_dance', undefined, true);
  // pillars between the zones
  for (let y = 9; y < 28; y += 5) {
    b.d(12, y, D.PILLAR_T).d(12, y + 1, D.PILLAR_B);
    b.d(31, y, D.PILLAR_T).d(31, y + 1, D.PILLAR_B);
  }
  // the hotel's reception (east), elevator, lounge, the big window over the town
  b.rect(32, 2, 11, 12, T.MARBLE);
  for (let x = 35; x <= 38; x++) b.d(x, 5, D.COUNTER);
  b.spot(36, 5, 'w3_reception').spot(37, 5, 'w3_reception');
  b.npc({ id: 'w3_receptionist', sprite: 'receptionist', x: 36, y: 4, dir: 'down', script: 'w3_receptionist' });
  b.prop('p3_elevator', CLUB.elevator.x, 0, [{ x: 40, y: 1, w: 2, h: 1 }], { sortY: 2 });
  b.warp(40, 1, 'w3_hotel', 2, 10, 'right', 'door', 'w3_elevator');
  b.warp(41, 1, 'w3_hotel', 2, 10, 'right', 'door', 'w3_elevator');
  for (let x = 33; x <= 37; x++) b.d(x, 1, D.WINDOW);
  for (let x = 33; x <= 37; x++) b.spot(x, 2, 'w3_window');
  b.d(34, 9, D.SOFA_L).d(35, 9, D.SOFA_R).d(39, 9, D.SOFA_L).d(40, 9, D.SOFA_R).d(37, 11, D.PLANT).d(42, 3, D.PLANT);
  // the clinic corridor, south-east
  b.rect(38, 20, 5, 9, T.CLINICTILE);
  b.d(37, 21, D.PILLAR_T).d(37, 22, D.PILLAR_B);
  b.g(CLUB.clinic.x, 28, T.MAT);
  b.warp(CLUB.clinic.x, 28, 'w3_clinic', 14, 12, 'up', 'step', 'w3_clinic_in');
  b.spot(40, 26, 'w3_clinic_sign');
  b.d(40, 26, D.SIGN);
  // the way out
  b.g(21, 28, T.MAT).g(22, 28, T.MAT);
  b.warp(21, 28, 'w3_isl', 49, 23, 'down', 'step');
  b.warp(22, 28, 'w3_isl', 50, 23, 'down', 'step');
  m.spawn = { x: 21, y: 27, dir: 'up' };
  // the dancers, the drinkers, the lounge: the crowd thins out as the days go by
  crowd(b, 'club_floor', [[15, 7, 0], [17, 8, 0], [19, 7, 1], [23, 7, 0], [26, 8, 1], [28, 7, 2], [15, 10, 1], [18, 11, 0], [24, 10, 2], [27, 11, 1], [16, 13, 2], [20, 14, 1], [25, 14, 0], [28, 13, 3], [17, 16, 3], [22, 16, 2], [26, 16, 3], [14, 15, 3]], DANCERS);
  crowd(b, 'club_bar', [[3, 7, 0], [5, 7, 1], [9, 7, 0], [4, 12, 2], [8, 12, 1], [4, 17, 3], [8, 22, 2], [2, 25, 3]], [{ look: 'local3', dir: 'up' }, { look: 'partier2', dir: 'up' }, { look: 'partier5', dir: 'up' }, { look: 'local4' }, { look: 'tourist' }, { look: 'partier6' }]);
  crowd(b, 'club_lounge', [[34, 10, 1], [39, 10, 2], [41, 7, 0], [33, 13, 3], [35, 17, 1], [41, 16, 2], [33, 24, 3], [24, 22, 2], [18, 22, 1], [28, 25, 3]], PARTY);
  // daytime: the sun through the big window (only shows against the day's light dimming)
  for (const x of [33, 35, 37]) b.light(x * 16 + 8, 3 * 16, 60, 0, (st) => !night(st));
  b.light(6 * 16, 4 * 16, 70, 0.1).light(22 * 16, 6 * 16, 110, 0.25).light(37 * 16, 6 * 16, 70, 0.1).light(40 * 16, 24 * 16, 50, 0.1).light(22 * 16, 24 * 16, 60, 0.1);
  return b.build();
}

/** The hotel floor upstairs: a corridor, your room and Ayla's. */
function hotel(): MapDef {
  const rows = R(30, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwwwwwwOwwwwwwOwwwwwwOwwwwwwOw',
    'w.....w.....w.....w.....w....w',
    'w.hk..w.hk..w.hk..w.hk..w.p..w',
    'w.H...w.H...w.H...w.H...w....w',
    'w.....w.....w.....w.....w..[]w',
    'w..c..w..c..w..c..w..c..w....w',
    'w.....w.....w.....w.....w....w',
    'ww.wwwww.wwwww.wwwww.wwww.wwww',
    'w,,,,,,,,,,,,,,,,,,,,,,,,,,,,w',
    'U,,,,,,,,,,,,,,,,,,,,,,,,,,,,w',
    'w,,,,,,,,,,,,,,,,,,,,,,,,,,,,w',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]);
  const b = fromAscii('w3_hotel', 'CLUB FOREVER - HOTEL', rows, { floor: T.CLUBCARPET, floor2: T.CARPET, wall: T.CLUBWALL, wallLow: T.CLUBWALL_LOW });
  b.m.world = 3;
  b.m.music = 'club_quiet';
  b.m.dark = 0.3;
  b.m.darkStyle = 'candle';
  b.warp(0, 10, 'w3_club', 40, 2, 'down', 'step');
  b.g(0, 10, T.MAT);
  b.m.spawn = { x: 1, y: 10, dir: 'right' };
  b.spot(2, 3, 'w3_bed_any').spot(8, 3, 'w3_bed_any').spot(14, 3, 'w3_bed_player').spot(20, 3, 'w3_bed_ayla');
  b.npc({ id: 'w3_guest1', sprite: 'partier6', x: 26, y: 10, dir: 'left', script: 'w3_guest', show: (st) => !['d3'].includes(w3Stage(st)) });
  b.npc({ id: 'w3_guest2', sprite: 'local4', x: 27, y: 4, dir: 'down', script: 'w3_guest' });
  b.npc({ id: 'w3_ayla_hotel', sprite: 'ayla', x: 21, y: 5, dir: 'down', script: 'w3_ayla_hotel', show: (st) => isSet(st, 'w3_hotel_night') && !isSet(st, 'w3_day3') });
  b.light(8 * 16, 10 * 16, 50, 0.1).light(20 * 16, 10 * 16, 50, 0.1);
  return b.build();
}

/** The clinic in the club's east wing. */
function clinic(): MapDef {
  const rows = R(30, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwwwQwwwwwwwwwwwwwwwwwwPwwwwww',
    'w....w.....w.....w....w......w',
    'w....w.....w.....w....w..dD..w',
    'w....w.....w.....w....w......w',
    'w....w.....w.....w....w..c...w',
    'ww.wwww.wwwww.wwwww.wwww.wwwww',
    'w............................w',
    'w............................w',
    'w..CCCC......................w',
    'w............................w',
    'w..c.c.c.c...........p...kk..w',
    'w............................w',
    'WWWWWWWWWWWWWWmWWWWWWWWWWWWWWW',
  ]);
  const b = fromAscii('w3_clinic', 'THE CLINIC', rows, { floor: T.CLINICTILE, floor2: T.CLINICTILE, wall: T.WALLS, wallLow: T.WALLS_LOW });
  b.m.world = 3;
  b.m.music = 'club_quiet';
  b.m.dark = 0.08;
  b.m.darkStyle = 'candle';
  b.warp(14, 13, 'w3_club', 41, 27, 'up', 'step');
  b.m.spawn = { x: 14, y: 12, dir: 'up' };
  for (const [x, y] of [[2, 2], [7, 2], [13, 2], [19, 2]]) b.prop('p3_bed', x, y, [{ x, y: y + 1, w: 1, h: 1 }], { sortY: y + 2 });
  b.spot(3, 9, 'w3_clinic_desk').spot(4, 9, 'w3_clinic_desk').spot(5, 9, 'w3_clinic_desk');
  b.spot(26, 11, 'w3_clinic_cabinet').spot(27, 11, 'w3_clinic_cabinet');
  b.npc({ id: 'w3_nurse', sprite: 'nurse', x: 4, y: 8, dir: 'down', script: 'w3_nurse' });
  b.npc({ id: 'w3_doctor', sprite: 'doctor', x: 26, y: 4, dir: 'down', script: 'w3_doctor' });
  b.npc({ id: 'grimsby', sprite: 'grimsby', x: 14, y: 4, dir: 'down', script: 'w3_grimsby' });
  b.npc({ id: 'w3_pat1', sprite: 'patient', x: 3, y: 4, dir: 'down', script: 'w3_patient' });
  b.npc({ id: 'w3_pat2', sprite: 'patient2', x: 9, y: 4, dir: 'down', script: 'w3_patient' });
  b.npc({ id: 'w3_pat3', sprite: 'partier4', x: 20, y: 4, dir: 'left', script: 'w3_patient' });
  b.npc({ id: 'w3_pat4', sprite: 'local4', x: 5, y: 10, dir: 'down', script: 'w3_patient' });
  b.npc({ id: 'w3_pat5', sprite: 'partier6', x: 9, y: 10, dir: 'down', script: 'w3_patient' });
  return b.build();
}

// ------------------------------------------------------------------ Avalena, Ayla, Milo

function artShop(): MapDef {
  const rows = R(13, [
    ' WWWWWWWWWWW ',
    ' wPwPwPwPwPw ',
    ' ..........e ',
    ' ..........E ',
    ' ...CCC..... ',
    ' ........... ',
    ' p.........p ',
    ' ........... ',
    ' ........... ',
    '      m      ',
  ]);
  const b = fromAscii('w3_art', "AVALENA'S ART", rows, STYLES.house);
  b.m.world = 3;
  b.m.music = 'w3shop';
  b.m.dark = 0.08;
  b.m.darkStyle = 'candle';
  b.warp(6, 9, 'w3_isl', W3_DOORS.art.x, W3_DOORS.art.y + 1, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  const robbed = (st: StoryState) => isSet(st, 'w3_robbed');
  for (const [x, k] of [[2, 0], [9, 1], [10, 2]] as const) b.prop(`p3_easel${k}`, x, 4, [{ x, y: 5, w: 1, h: 1 }], { sortY: 6, show: (st) => !robbed(st) });
  for (const [x, y, k] of [[1.5, 6.8, 0], [10.5, 6.8, 3], [3, 7.5, 4]] as const) b.prop(`p3_canvas${k}`, x, y, 'none', { sortY: y + 1, show: (st) => !robbed(st) });
  b.spot(2, 5, 'w3_art_piece').spot(9, 5, 'w3_art_piece').spot(10, 5, 'w3_art_piece');
  b.spot(1, 1, 'w3_art_wall').spot(3, 1, 'w3_art_wall').spot(5, 1, 'w3_art_wall').spot(7, 1, 'w3_art_wall').spot(9, 1, 'w3_art_wall');
  b.npc({ id: 'avalena', sprite: 'avalena', x: 5, y: 3, dir: 'down', script: 'w3_avalena', show: (st) => !isSet(st, 'w3_shop_closed') });
  return b.build();
}

function aylaCave(): MapDef {
  const rows = R(14, [
    ' WWWWWWWWWWWW ',
    ' wwwwwwwwwwww ',
    ' hk....fd.... ',
    ' H.....FD..SK ',
    ' ............ ',
    ' r..o.c...... ',
    ' ..........xx ',
    ' p........... ',
    ' ............ ',
    '      m       ',
  ]);
  const b = fromAscii('w3_aylacave', "AYLA'S CAVE", rows, STYLES.cave, { f: { d: D.SHELF_T }, F: { d: D.SHELF_B } });
  b.m.world = 3;
  b.m.music = 'ayla';
  b.m.dark = 0.45;
  b.m.darkStyle = 'cave';
  b.warp(6, 9, 'w3_isl', W3_DOORS.cave.x, W3_DOORS.cave.y, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  // stolen paintings everywhere, propped on every surface
  const art = (st: StoryState) => !isSet(st, 'w3_ayla_packed') || isSet(st, 'w3_art_kept');
  for (const [x, y, k] of [[3, 1.2, 0], [5, 1.2, 1], [9, 1.2, 2], [11, 1.2, 3], [4.5, 6.8, 4], [10, 4.6, 5], [8, 7.2, 1]] as const) b.prop(`p3_canvas${k}`, x, y, 'none', { sortY: y + 1, show: art });
  for (const [x, y] of [[3, 2], [5, 2], [9, 2], [11, 2], [10, 5]]) b.spot(x, y, 'w3_cave_art');
  b.spot(1, 2, 'w3_cave_bed').spot(1, 3, 'w3_cave_bed');
  b.spot(11, 3, 'w3_cave_kitchen').spot(12, 3, 'w3_cave_kitchen');
  b.spot(8, 3, 'w3_cave_desk');
  b.npc({ id: 'ayla_home', sprite: 'ayla', x: 9, y: 5, dir: 'up', script: 'w3_ayla_home', show: (st) => isSet(st, 'w3_followed') && !isSet(st, 'w3_ayla_joined') });
  b.light(7 * 16, 4 * 16, 60, 0.3).light(2 * 16, 3 * 16, 30, 0.4);
  return b.build();
}

function hideout(): MapDef {
  const rows = R(20, [
    'WWWWWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwwwwww',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    'WWWWWWWWWWWWWWWWWWWW',
  ]);
  const b = fromAscii('w3_hideout', 'THE HIDEOUT', rows, { floor: T.CONCRETE, floor2: T.GRATE, wall: T.WALLC, wallLow: T.SHELFWALL });
  b.m.world = 3;
  b.m.music = 'hideout';
  b.m.dark = 0.6;
  b.m.darkStyle = 'cellar';
  b.prop('p3_workbench', 2, 1.5, 'none', { sortY: 3 });
  b.prop('p3_checklist', 8, 0.2, 'none', { sortY: 2 });
  b.m.spawn = { x: 10, y: 9, dir: 'up' };
  b.light(5 * 16, 4 * 16, 60, 0.4).light(14 * 16, 6 * 16, 80, 0.2);
  return b.build();
}

// ------------------------------------------------------------------ the five businesses (and the rest of the strip)

const SHOP: ExtraChars = { f: { d: D.FRIDGE_T }, F: { d: D.FRIDGE_B } };

function interior(id: string, name: string, rows: string[], style: typeof STYLES.house, door: { x: number; y: number }, music = 'w3shop', exit = { x: 5, y: 9 }) {
  const b = fromAscii(id, name, rows, style, SHOP);
  b.m.world = 3;
  b.m.music = music;
  b.m.dark = 0.08;
  b.m.darkStyle = 'candle';
  b.warp(exit.x, exit.y, 'w3_isl', door.x, door.y + 1, 'down', 'step');
  b.m.spawn = { x: exit.x, y: exit.y - 1, dir: 'up' };
  return b;
}

function buffet(): MapDef {
  const b = interior('w3_buffet', 'EAT LIKE PIG BUFFET', R(13, [
    ' WWWWWWWWWWW ',
    ' wQwwwOwwwPw ',
    ' ........... ',
    ' ........... ',
    ' .o.c..o.c.. ',
    ' ........... ',
    ' .o.c..o.c.. ',
    ' ........... ',
    ' p.......... ',
    '     m       ',
  ]), STYLES.shop, W3_DOORS.buffet);
  b.prop('p3_buffet', 2, 1.6, [{ x: 2, y: 2, w: 3, h: 1 }], { sortY: 3 });
  b.prop('p3_buffet', 6, 1.6, [{ x: 6, y: 2, w: 3, h: 1 }], { sortY: 3 });
  b.spot(3, 2, 'w3_buffet_food').spot(7, 2, 'w3_buffet_food');
  b.npc({ id: 'lin', sprite: 'lin', x: 10, y: 3, dir: 'down', script: 'w3_lin' });
  b.npc({ id: 'kevin', sprite: 'kevin', x: 9, y: 5, dir: 'left', script: 'w3_kevin' });
  b.npc({ id: 'w3_bf_c1', sprite: 'tourist2', x: 3, y: 6, dir: 'right', script: 'w3_biz_buffet' });
  return b.build();
}

function lobster(): MapDef {
  const b = interior('w3_lobster', 'BLUE LOBSTER', R(13, [
    ' WWWWWWWWWWW ',
    ' wOww"ww"wOw ',
    ' ........... ',
    ' .CCC....... ',
    ' ........... ',
    ' .o.c..o.c.. ',
    ' ........... ',
    ' .o.c..o.c.. ',
    ' ........... ',
    '     m       ',
  ]), STYLES.house, W3_DOORS.lobster);
  b.prop('p3_tank', 8, 1.5, [{ x: 8, y: 2, w: 2, h: 1 }], { sortY: 3 });
  b.spot(8, 2, 'w3_tank').spot(9, 2, 'w3_tank');
  b.npc({ id: 'morty', sprite: 'morty', x: 3, y: 2, dir: 'down', script: 'w3_morty' });
  b.npc({ id: 'w3_lb_c1', sprite: 'local3', x: 3, y: 5, dir: 'right', script: 'w3_biz_lobster' });
  return b.build();
}

function cafe(): MapDef {
  const b = interior('w3_cafe', "LEX'S CAFE", R(13, [
    ' WWWWWWWWWWW ',
    ' wPwwOwwOwPw ',
    ' ........... ',
    ' .CCC....... ',
    ' .....o.c... ',
    ' .o.c....... ',
    ' .......o.c. ',
    ' ......rr... ',
    ' p.........p ',
    '     m       ',
  ]), STYLES.house, W3_DOORS.cafe);
  b.npc({ id: 'lex', sprite: 'lex', x: 3, y: 2, dir: 'down', script: 'w3_lex' });
  for (const [x, y, i] of [[6, 2, 0], [9, 5, 1], [5, 7, 2], [10, 7, 3], [6, 5, 4]] as const) b.npc({ id: 'cub' + i, sprite: 'cub', x, y, dir: 'down', script: 'w3_cub', wander: 2 });
  b.npc({ id: 'w3_cf_c1', sprite: 'tourist', x: 3, y: 5, dir: 'right', script: 'w3_unsafe' });
  b.npc({ id: 'w3_cf_c2', sprite: 'local4', x: 9, y: 4, dir: 'left', script: 'w3_biz_cafe' });
  b.npc({ id: 'w3_cf_c3', sprite: 'partier3', x: 9, y: 6, dir: 'left', script: 'w3_biz_cafe' });
  return b.build();
}

function dough(): MapDef {
  const b = interior('w3_dough', 'THE FROSTED DOUGH SHACK', R(13, [
    ' WWWWWWWWWWW ',
    ' wQwwPwwPwQw ',
    ' ........... ',
    ' ........... ',
    ' ........... ',
    ' ........... ',
    ' ........... ',
    ' ........... ',
    ' p.........p ',
    '     m       ',
  ]), STYLES.shop, W3_DOORS.dough);
  b.prop('p3_donuts', 2, 2.4, [{ x: 2, y: 3, w: 2, h: 1 }], { sortY: 4 });
  b.prop('p3_donuts', 5, 2.4, [{ x: 5, y: 3, w: 2, h: 1 }], { sortY: 4 });
  b.prop('p3_donuts', 8, 2.4, [{ x: 8, y: 3, w: 2, h: 1 }], { sortY: 4 });
  b.spot(3, 3, 'w3_donuts').spot(6, 3, 'w3_donuts').spot(9, 3, 'w3_donuts');
  b.npc({ id: 'dottie', sprite: 'dottie', x: 4, y: 2, dir: 'down', script: 'w3_dottie' });
  b.npc({ id: 'w3_baker', sprite: 'baker', x: 8, y: 2, dir: 'down', script: 'w3_baker', wander: 1 });
  // a queue right round the shop
  for (const [x, y, i, d] of [[5, 5, 0, 'up'], [5, 6, 1, 'up'], [5, 7, 2, 'up'], [6, 7, 3, 'left'], [7, 7, 4, 'left'], [9, 6, 5, 'left'], [2, 6, 6, 'right'], [10, 5, 7, 'down']] as const)
    b.npc({ id: 'w3_dq' + i, sprite: ['tourist', 'local4', 'partier5', 'kid3', 'tourist2', 'local3', 'partier1', 'partier6'][i], x, y, dir: d, script: 'w3_biz_dough' });
  return b.build();
}

function froyo(): MapDef {
  const b = interior('w3_froyo', "MR. FROFRO'S FROYO", R(13, [
    ' WWWWWWWWWWW ',
    ' wPwwOwwOwPw ',
    ' ........... ',
    ' ........... ',
    ' .........o. ',
    ' .........c. ',
    ' ........... ',
    ' .o.c....... ',
    ' p.......... ',
    '     m       ',
  ]), STYLES.shop, W3_DOORS.froyo);
  b.prop('p3_froyo', 2, 1, [{ x: 2, y: 2, w: 2, h: 1 }], { sortY: 3 });
  b.prop('p3_froyo', 5, 1, [{ x: 5, y: 2, w: 2, h: 1 }], { sortY: 3 });
  b.spot(3, 2, 'w3_froyo_machine').spot(6, 2, 'w3_froyo_machine');
  b.npc({ id: 'frofro', sprite: 'frofro', x: 8, y: 2, dir: 'down', script: 'w3_frofro' });
  for (const [x, y, i, d] of [[3, 3, 0, 'up'], [4, 4, 1, 'up'], [6, 3, 2, 'up'], [6, 5, 3, 'up'], [9, 5, 4, 'left'], [3, 7, 5, 'right'], [5, 7, 6, 'left'], [8, 7, 7, 'up']] as const)
    b.npc({ id: 'w3_fq' + i, sprite: ['partier3', 'kid3', 'tourist2', 'local3', 'partier1', 'tourist', 'local4', 'partier2'][i], x, y, dir: d, script: 'w3_biz_froyo' });
  return b.build();
}

function small(id: string, name: string, door: { x: number; y: number }, rows: string[], people: [string, number, number, Dir, string][], style = STYLES.house, music = 'w3shop') {
  const b = interior(id, name, rows, style, door, music);
  people.forEach(([look, x, y, d, script], i) => b.npc({ id: `${id}_p${i}`, sprite: look, x, y, dir: d, script, wander: script === 'w3_crowd' ? 1 : 0 }));
  return b.build();
}

const ROOM = R(13, [
  ' WWWWWWWWWWW ',
  ' wPwwOwwOwQw ',
  ' ........... ',
  ' ........... ',
  ' .o.c...o.c. ',
  ' ........... ',
  ' .o.c....... ',
  ' ........... ',
  ' p.........p ',
  '     m       ',
]);

// a home on the island (exit at x=4)
const HOME = R(10, [
  ' WWWWWWWW ',
  ' wPwwOwQw ',
  ' hk...[]. ',
  ' H....... ',
  ' ...o.c.. ',
  ' ........ ',
  ' p......p ',
  '    m     ',
]);

function home(n: number, door: { x: number; y: number }, people: [string, number, number, Dir, string][]) {
  const b = fromAscii('w3_home' + n, ['A QUIET HOUSE', 'A HOUSE FULL OF PARTY HATS', 'A HOUSE FOR RENT'][n], HOME, STYLES.house);
  b.m.world = 3;
  b.m.music = 'house';
  b.m.dark = 0.1;
  b.m.darkStyle = 'candle';
  b.warp(4, 7, 'w3_isl', door.x, door.y + 1, 'down', 'step');
  b.m.spawn = { x: 4, y: 6, dir: 'up' };
  people.forEach(([look, x, y, d, script], i) => b.npc({ id: `w3_home${n}_p${i}`, sprite: look, x, y, dir: d, script }));
  return b.build();
}

/** The flashback: the little house Milo grew up in. */
function miloHome(): MapDef {
  const rows = R(13, [
    ' WWWWWWWWWWW ',
    ' wPwwOwwPwOw ',
    ' hk....fSK.. ',
    ' H.....F.... ',
    ' ..[]....... ',
    ' ......o.c.. ',
    ' ........... ',
    ' r.........p ',
    ' ........... ',
    '     m       ',
  ]);
  const b = fromAscii('w3_memhome', 'A LONG TIME AGO', rows, STYLES.house, SHOP);
  b.m.world = 3;
  b.m.music = 'memory';
  b.m.dark = 0.15;
  b.m.darkStyle = 'candle';
  b.m.spawn = { x: 6, y: 7, dir: 'up' };
  return b.build();
}

export function buildW3(): MapDef[] {
  const maps = [island(), club(), hotel(), clinic(), artShop(), aylaCave(), hideout(), buffet(), lobster(), cafe(), dough(), froyo(), miloHome()];
  maps.push(
    small('w3_karaoke', 'THE BIG MIC KARAOKE', W3_DOORS.karaoke, ROOM, [
      ['partier4', 6, 2, 'down', 'w3_karaoke_singer'],
      ['partier1', 3, 5, 'up', 'w3_crowd'],
      ['local3', 8, 5, 'up', 'w3_crowd'],
      ['partier6', 5, 6, 'up', 'w3_crowd'],
    ]),
    small('w3_arcade', 'PIXEL PALACE ARCADE', W3_DOORS.arcade, ROOM, [
      ['kid3', 3, 3, 'up', 'w3_arcade_kid'],
      ['partier2', 8, 3, 'up', 'w3_crowd'],
      ['local4', 6, 6, 'down', 'w3_crowd'],
    ]),
    small('w3_diner', 'NITE OWL DINER', W3_DOORS.diner, ROOM, [
      ['waiter', 6, 3, 'down', 'w3_waiter'],
      ['local3', 3, 4, 'right', 'w3_diner_regular'],
      ['partier5', 9, 6, 'left', 'w3_crowd'],
    ]),
    small('w3_souvenir', 'SOUVENIRS & SUNSCREEN', W3_DOORS.souvenir, ROOM, [
      ['woman3', 6, 2, 'down', 'w3_souvenir_clerk'],
      ['tourist', 3, 5, 'up', 'w3_crowd'],
    ]),
    small('w3_costume', 'COSTUME CASTLE', W3_DOORS.costume, ROOM, [
      ['performer', 6, 2, 'down', 'w3_costumer'],
      ['partier1', 8, 5, 'left', 'w3_crowd'],
    ]),
    small('w3_lobby', 'HOTEL TIPSY', W3_DOORS.tipsy, ROOM, [
      ['receptionist', 6, 2, 'down', 'w3_lobby_clerk'],
      ['tourist2', 3, 5, 'right', 'w3_crowd'],
      ['partier6', 9, 6, 'left', 'w3_crowd'],
    ], STYLES.marble),
    small('w3_lobby2', 'THE SUNSET INN', W3_DOORS.sunset, ROOM, [
      ['receptionist', 6, 2, 'down', 'w3_lobby_clerk'],
      ['grandpa2', 3, 5, 'right', 'w3_crowd'],
    ], STYLES.marble),
    home(0, W3_DOORS.home0, [['grandpa2', 6, 5, 'down', 'w3_resident']]),
    home(1, W3_DOORS.home1, [['partier3', 3, 4, 'right', 'w3_resident'], ['kid3', 6, 5, 'up', 'w3_resident']]),
    home(2, W3_DOORS.home2, [['local4', 5, 3, 'down', 'w3_resident']])
  );
  return maps;
}
