import { MapBuilder, type MapDef } from '../mapdef';
import { T, D } from '../tiles';
import { isSet } from '../../story/state';
import type { StoryState } from '../../story/state';

// SALTWASH: World 2's island, battered by wave after wave. Downtown along Center
// Avenue (City Hall, the bank, the tech shop and Rick's Rides), houses to the
// south and north, the theme park at the top of Harbor Road, the beach and dock
// at the bottom, and a canal cutting off the east point.

export const ISL_W = 100;
export const ISL_H = 84;

/** Door tiles of every enterable building (interiors warp back to the tile below). */
export const ISL_DOORS = {
  hall: { x: 33, y: 37 },
  bank: { x: 54, y: 37 },
  tech: { x: 65, y: 37 },
  dealer: { x: 76, y: 37 },
  grocery: { x: 57, y: 55 },
  inventor: { x: 14, y: 55 },
  v_gus: { x: 13, y: 37 },
  v_marla: { x: 21, y: 37 },
  v_dot: { x: 31, y: 15 },
  v_quentin: { x: 59, y: 15 },
  v_otto: { x: 67, y: 15 },
  v_bev: { x: 26, y: 55 },
  v_sid: { x: 34, y: 55 },
  v_lorna: { x: 69, y: 55 },
  h_pack: { x: 77, y: 55 },
  h_flood: { x: 21, y: 65 },
};

/** Where you stand outside the park gate. */
export const PARK_GATE = { x: 48, y: 15 };
/** The evacuation helipads (top-left tiles, 4x4). */
export const HELIPADS: [number, number][] = [
  [55, 43],
  [89, 28],
  [28, 72],
];

function islandR(x: number, y: number) {
  const dx = (x - 50) / 47;
  const dy = (y - 42) / 40;
  const wob = 0.035 * Math.sin(x * 0.19 + 0.4) + 0.03 * Math.sin(y * 0.23 + 2.1) + 0.015 * Math.sin((x - y) * 0.45);
  return Math.pow(Math.pow(Math.abs(dx), 3) + Math.pow(Math.abs(dy), 3), 1 / 3) - wob;
}

const evac = (st: StoryState) => isSet(st, 'w2_evac_done');
const before = (st: StoryState) => !evac(st);

export function buildIsland(): MapDef {
  const b = new MapBuilder('isl', 'SALTWASH ISLAND', ISL_W, ISL_H, T.WATER);
  const m = b.m;
  m.world = 2;
  m.outdoor = true;
  m.music = 'island';
  m.amb = 'coast';
  m.dark = 0.18;
  m.darkStyle = 'night';
  m.fishing = false;
  m.spawn = { x: 48, y: 75, dir: 'up' };

  // ---------------------------------------------------------------- land
  for (let y = 0; y < ISL_H; y++)
    for (let x = 0; x < ISL_W; x++) {
      const r = islandR(x, y);
      if (r < 0.93) b.g(x, y, T.GRASS3);
      else if (r < 1) b.g(x, y, T.SAND);
    }
  for (let y = 0; y < ISL_H; y++)
    for (let x = 0; x < ISL_W; x++) {
      if (b.gt(x, y) !== T.SAND) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => b.gt(x + dx, y + dy) === T.WATER)) b.g(x, y, T.WETSAND);
    }
  // the south of the island took the worst of it: mud, sand drifts, dead grass, in
  // organic patches rather than speckle
  const noise = (x: number, y: number, k: number) =>
    Math.sin(x * 0.21 + k) * Math.cos(y * 0.17 - k * 0.5) + 0.6 * Math.sin((x + y) * 0.09 + k * 2) + 0.35 * Math.sin(x * 0.53 - y * 0.41 + k);
  for (let y = 0; y < ISL_H; y++)
    for (let x = 0; x < ISL_W; x++) {
      if (b.gt(x, y) !== T.GRASS3) continue;
      const south = Math.max(0, (y - 40) / 40);
      if (noise(x, y, 3) > 1.05 - south * 0.9) b.g(x, y, T.SANDDRIFT);
      else if (noise(x, y, 7) > 0.75) b.g(x, y, T.MUD);
      else if (noise(x, y, 11) > 0.9) b.g(x, y, T.GRASS);
    }
  b.scatter(0, 0, ISL_W, ISL_H, T.GRASS3, [T.TUFT, T.DEADFLOWER], 0.08, 17);
  b.scatter(0, 0, ISL_W, ISL_H, T.SAND, [T.SAND2, T.SANDDRIFT], 0.25, 5);

  // ---------------------------------------------------------------- roads
  const road = (x: number, y: number, w: number, h: number, lineAxis: 'h' | 'v' | null) => {
    b.rect(x, y, w, h, T.ASPHALT);
    b.scatter(x, y, w, h, T.ASPHALT, [T.ASPHALT2], 0.22, x * 13 + y * 7);
    if (lineAxis === 'h') for (let i = x; i < x + w; i += 2) b.g(i, y + Math.floor(h / 2), T.ROADLINE);
    if (lineAxis === 'v') for (let j = y; j < y + h; j += 2) b.g(x + Math.floor(w / 2), j, T.ROADLINE);
  };
  road(47, 14, 3, 61, 'v'); // Harbor Road, from the park gate down to the dock
  road(18, 16, 64, 3, 'h'); // North Road
  road(6, 38, 80, 3, 'h'); // Center Avenue
  road(10, 56, 74, 3, 'h'); // Low Street
  road(16, 66, 65, 2, null); // Shore Lane
  road(9, 40, 2, 16, null); // west link
  road(82, 41, 2, 15, null); // east link
  road(89, 38, 5, 3, null); // across the bridge to the east point
  // sidewalks in front of downtown
  b.rect(24, 37, 2, 1, T.SIDEWALK);
  b.rect(42, 37, 5, 1, T.SIDEWALK);
  // paths from every door down to its road
  for (const [x, y, h] of [
    [13, 37, 1],
    [21, 37, 1],
    [31, 15, 1],
    [59, 15, 1],
    [67, 15, 1],
    [14, 55, 1],
    [26, 55, 1],
    [34, 55, 1],
    [69, 55, 1],
    [77, 55, 1],
    [21, 65, 1],
  ])
    b.rect(x, y + 1, 1, h, T.SIDEWALK);

  // the floods never fully drained: standing water across the roads
  b.rect(28, 56, 16, 3, T.SHALLOW);
  b.rect(47, 60, 3, 8, T.SHALLOW);
  b.rect(16, 66, 30, 2, T.SHALLOW);
  b.rect(60, 38, 6, 3, T.SHALLOW);
  b.scatter(16, 66, 65, 2, T.ASPHALT, [T.SANDDRIFT], 0.5, 61);
  b.scatter(47, 62, 3, 13, T.ASPHALT, [T.SANDDRIFT], 0.4, 62);

  // ---------------------------------------------------------------- the canal and the broken bridge
  b.rect(86, 18, 3, 62, T.WATER);
  b.rect(86, 38, 3, 3, T.DOCK);
  b.d(86, 38, D.BARRIER).d(88, 40, D.PLANKS);
  b.spot(86, 38, 'w2_bridge');
  // the bridge rails are gone on one side
  b.rect(81, 41, 5, 2, T.MUD);

  // ---------------------------------------------------------------- downtown: Center Avenue
  b.prop('b2_cityhall', 26, 29, [{ x: 26, y: 29, w: 16, h: 9 }]);
  b.warp(33, 37, 'w2_hall', 8, 10, 'up');
  b.warp(34, 37, 'w2_hall', 9, 10, 'up');
  b.prop('b2_bank', 50, 31, [{ x: 50, y: 31, w: 10, h: 7 }]);
  b.warp(54, 37, 'w2_bank', 6, 8, 'up');
  b.warp(55, 37, 'w2_bank', 7, 8, 'up');
  b.prop('b2_tech', 61, 32, [{ x: 61, y: 32, w: 8, h: 6 }]);
  b.warp(65, 37, 'w2_tech', 6, 8, 'up');
  b.prop('b2_dealer', 70, 31, [{ x: 70, y: 31, w: 14, h: 7 }]);
  b.warp(76, 37, 'w2_dealer', 8, 10, 'up', 'door', 'w2_dealer_door');
  b.warp(77, 37, 'w2_dealer', 9, 10, 'up', 'door', 'w2_dealer_door');
  b.prop('p2_billboard2', 42, 33, [{ x: 43, y: 36, w: 3, h: 1 }], { sortY: 37 });
  for (const [x, y] of [
    [44, 37],
    [60, 37],
    [84, 37],
  ])
    b.prop('p2_lampbroken', x, y - 1, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  // sandbags along the shop fronts (never across a door)
  // sandbag walls along the avenue, with gaps for every lane
  for (const x of [12, 13, 14, 15, 16, 44, 45, 46, 68, 69, 70, 71, 72]) b.d(x, 41, D.SANDBAG);
  b.d(45, 37, D.WARNSIGN);
  b.spot(45, 37, 'w2_sign_flood');

  // west end: two houses and an overturned car
  b.prop('b2_house0', 10, 33, [{ x: 10, y: 33, w: 7, h: 5 }]);
  b.warp(13, 37, 'w2_v_gus', 4, 7, 'up');
  b.prop('b2_house1', 18, 33, [{ x: 18, y: 33, w: 7, h: 5 }]);
  b.warp(21, 37, 'w2_v_marla', 4, 7, 'up');
  b.prop('p2_car2', 6, 35, [{ x: 6, y: 36, w: 2, h: 1 }], { sortY: 37 });

  // south of the avenue: the helipad field, the flood memorial, a beached boat
  b.rect(51, 42, 16, 9, T.GRASS);
  b.scatter(51, 42, 16, 9, T.GRASS, [T.MUD, T.TUFT], 0.3, 70);
  b.prop('p2_helipad', HELIPADS[0][0], HELIPADS[0][1], 'none', { sortY: 0 });
  b.d(52, 42, D.CONE).d(65, 42, D.CONE).d(52, 48, D.CONE).d(65, 48, D.CONE);
  b.d(60, 42, D.SIGN);
  b.spot(60, 42, 'w2_sign_heli');
  b.rect(26, 42, 16, 9, T.MUD);
  b.rect(35, 44, 5, 4, T.WATER); // a pool that never drained
  b.d(28, 43, D.TOMBSTONE2).d(30, 43, D.GRAVE).d(32, 43, D.TOMBSTONE2);
  b.d(30, 46, D.SHRINE);
  b.spot(30, 46, 'w2_memorial');
  b.d(28, 47, D.CANDLE).d(32, 47, D.CANDLE);
  b.light(30 * 16 + 8, 46 * 16, 30, 0.4);
  b.prop('p2_boat0', 15, 43, [{ x: 15, y: 44, w: 3, h: 1 }], { sortY: 46 });
  b.spot(16, 44, 'w2_boat_street');
  b.prop('p2_palm0', 21, 42, [{ x: 22, y: 44, w: 1, h: 1 }], { sortY: 45 });
  b.prop('p2_car0', 43, 42, [{ x: 43, y: 43, w: 2, h: 1 }], { sortY: 44 });
  b.d(70, 44, D.DEBRIS).d(72, 46, D.TIRE).d(75, 43, D.DEBRIS).d(67, 52, D.SEAWEED);
  b.prop('p2_car1', 73, 48, [{ x: 73, y: 49, w: 2, h: 1 }], { sortY: 50 });

  // ---------------------------------------------------------------- north: the park gate, houses, the halted crane
  b.prop('p3_gate', 44, 9, [
    { x: 44, y: 11, w: 2, h: 4 },
    { x: 52, y: 11, w: 2, h: 4 },
  ]);
  b.rect(46, 9, 6, 6, T.PARKPATH);
  b.rect(46, 9, 6, 2, T.VOID);
  b.warp(47, 12, 'park', 29, 45, 'up', 'step');
  b.warp(48, 12, 'park', 30, 45, 'up', 'step');
  b.warp(49, 12, 'park', 30, 45, 'up', 'step');
  b.rect(46, 11, 1, 4, T.HEDGE);
  b.rect(51, 11, 1, 4, T.HEDGE);
  b.prop('b2_ruin0', 20, 11, [{ x: 20, y: 11, w: 7, h: 5 }]);
  b.prop('b2_house2', 28, 11, [{ x: 28, y: 11, w: 7, h: 5 }]);
  b.warp(31, 15, 'w2_v_dot', 4, 7, 'up');
  b.prop('p2_billboard', 36, 12, [{ x: 37, y: 14, w: 3, h: 1 }], { sortY: 15 });
  b.spot(38, 15, 'w2_billboard');
  b.prop('b2_house3', 56, 11, [{ x: 56, y: 11, w: 7, h: 5 }]);
  b.warp(59, 15, 'w2_v_quentin', 4, 7, 'up');
  b.prop('b2_house4', 64, 11, [{ x: 64, y: 11, w: 7, h: 5 }]);
  b.warp(67, 15, 'w2_v_otto', 4, 7, 'up');
  b.prop('p2_crane', 73, 6, [{ x: 74, y: 13, w: 3, h: 2 }], { sortY: 15 });
  b.d(72, 15, D.BARRIER).d(78, 15, D.BARRIER).d(75, 15, D.SIGN);
  b.spot(75, 15, 'w2_crane_sign');
  b.d(40, 19, D.CONE).d(52, 20, D.PUDDLE_D).d(26, 20, D.DEBRIS).d(62, 19, D.SEAWEED).d(80, 19, D.TIRE);

  // ---------------------------------------------------------------- Low Street: the inventor, the grocery, houses
  b.prop('b2_inventor', 12, 50, [{ x: 12, y: 50, w: 9, h: 6 }]);
  b.warp(14, 55, 'w2_inv', 4, 10, 'up');
  b.prop('b2_house5', 23, 51, [{ x: 23, y: 51, w: 7, h: 5 }]);
  b.warp(26, 55, 'w2_v_bev', 4, 7, 'up');
  b.prop('b2_house0', 31, 51, [{ x: 31, y: 51, w: 7, h: 5 }]);
  b.warp(34, 55, 'w2_v_sid', 4, 7, 'up');
  b.prop('b2_ruin1', 39, 51, [{ x: 39, y: 51, w: 7, h: 5 }]);
  b.prop('b2_grocery', 52, 49, [{ x: 52, y: 49, w: 12, h: 7 }], { show: before });
  b.prop('b2_grocery_open', 52, 49, [{ x: 52, y: 49, w: 12, h: 7 }], { show: evac });
  b.warp(57, 55, 'w2_grocery', 8, 13, 'up', 'door', 'w2_grocery_door');
  b.warp(58, 55, 'w2_grocery', 9, 13, 'up', 'door', 'w2_grocery_door');
  b.prop('b2_house2', 66, 51, [{ x: 66, y: 51, w: 7, h: 5 }]);
  b.warp(69, 55, 'w2_v_lorna', 4, 7, 'up');
  b.prop('b2_house3', 74, 51, [{ x: 74, y: 51, w: 7, h: 5 }]);
  b.warp(77, 55, 'w2_h_pack', 4, 7, 'up');
  b.prop('p2_boat1', 44, 58, [{ x: 44, y: 59, w: 3, h: 1 }], { sortY: 61 });
  b.prop('p2_car1', 22, 58, [{ x: 22, y: 59, w: 2, h: 1 }], { sortY: 60 });
  b.prop('p2_lampbroken', 46, 55, [{ x: 46, y: 56, w: 1, h: 1 }], { sortY: 57 });

  // ---------------------------------------------------------------- Shore Lane
  b.prop('b2_house4', 18, 61, [{ x: 18, y: 61, w: 7, h: 5 }]);
  b.warp(21, 65, 'w2_h_flood', 4, 7, 'up');
  b.prop('b2_ruin0', 26, 61, [{ x: 26, y: 61, w: 7, h: 5 }]);
  // the boarded-up house on Shore Lane is a thrift store now (barely)
  b.prop('b2_thrift', 52, 61, [{ x: 52, y: 61, w: 7, h: 5 }]);
  b.warp(55, 65, 'w2_thrift', 6, 8, 'up');
  b.prop('b2_ruin1', 60, 61, [{ x: 60, y: 61, w: 7, h: 5 }]);
  b.prop('b2_house5', 68, 61, [{ x: 68, y: 61, w: 7, h: 5 }]);
  b.d(71, 65, D.BOARDED);
  b.spot(71, 65, 'w2_boarded');
  b.prop('p2_palm1', 36, 61, [{ x: 37, y: 63, w: 1, h: 1 }], { sortY: 64 });

  // ---------------------------------------------------------------- the beach and the dock
  b.rect(46, 75, 5, 8, T.DOCK_V);
  b.rect(46, 75, 5, 1, T.DOCK);
  b.d(46, 77, D.ROPEPOST).d(50, 77, D.ROPEPOST).d(46, 80, D.LIFERING).d(50, 81, D.BUOY);
  b.prop('p2_helipad', HELIPADS[2][0], HELIPADS[2][1], 'none', { sortY: 0 });
  b.d(40, 74, D.DEBRIS).d(56, 73, D.DEBRIS).d(60, 75, D.SEAWEED).d(36, 76, D.CLAMSHELL).d(62, 72, D.TIRE).d(42, 71, D.SEAWEED);
  b.d(52, 72, D.WARNSIGN);
  b.spot(52, 72, 'w2_sign_beach');

  // ---------------------------------------------------------------- after the Kraken: nobody home
  b.trigger(10, 56, 74, 3, 'ret_low', 'q_ret_low', (st) => isSet(st, 'w2_returned'));
  b.trigger(6, 38, 80, 3, 'ret_farewell', undefined, (st) => isSet(st, 'w2_returned') && !isSet(st, 'w2_ending_done'));
  b.npc({ id: 'ret_pip', sprite: 'inventor', x: 50, y: 41, dir: 'down', script: 'ret_pip', show: (st) => isSet(st, 'w2_ending_done') });

  // ---------------------------------------------------------------- the east point
  b.prop('p2_helipad', HELIPADS[1][0], HELIPADS[1][1], 'none', { sortY: 0 });
  b.d(91, 42, D.SIGN);
  b.spot(91, 42, 'w2_lookout');
  b.prop('p2_boat0', 90, 47, [{ x: 90, y: 48, w: 3, h: 1 }], { sortY: 50 });

  // ---------------------------------------------------------------- scatter: debris, seaweed, cones, dead palms
  const free = (x: number, y: number) => {
    const g = b.gt(x, y);
    if (![T.GRASS3, T.GRASS, T.MUD, T.TUFT, T.DEADFLOWER, T.SANDDRIFT, T.SAND, T.SAND2].includes(g as any)) return false;
    if (b.dt(x, y) !== D.NONE) return false;
    for (const p of m.props) for (const r of p.solid) if (x >= r.x - 1 && x < r.x + r.w + 1 && y >= r.y - 1 && y < r.y + r.h + 1) return false;
    for (const w of m.warps) if (Math.abs(w.x - x) + Math.abs(w.y - y) < 3) return false;
    for (const s of m.spots) if (Math.abs(s.x - x) + Math.abs(s.y - y) < 2) return false;
    // keep the tile next to any road clear so nothing walls in a lane
    return true;
  };
  let s = 9177;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let n = 0;
  for (let k = 0; k < 3000 && n < 150; k++) {
    const x = 4 + Math.floor(r() * (ISL_W - 8));
    const y = 4 + Math.floor(r() * (ISL_H - 8));
    if (!free(x, y)) continue;
    const near = [b.gt(x + 1, y), b.gt(x - 1, y), b.gt(x, y + 1), b.gt(x, y - 1)];
    if (near.some((g) => g === T.SIDEWALK)) continue;
    const roll = r();
    const deco = roll < 0.3 ? D.SEAWEED : roll < 0.48 ? D.DEBRIS : roll < 0.6 ? D.PUDDLE_D : roll < 0.68 ? D.TIRE : roll < 0.76 ? D.CLAMSHELL : roll < 0.84 ? D.RUBBLE : roll < 0.9 ? D.CRATE : D.STUMP;
    b.d(x, y, deco);
    n++;
  }
  let palms = 0;
  for (let k = 0; k < 900 && palms < 18; k++) {
    const x = 4 + Math.floor(r() * (ISL_W - 8));
    const y = 4 + Math.floor(r() * (ISL_H - 10));
    if (![0, 1, 2, 3].every((dy) => free(x, y + dy) && free(x + 1, y + dy) && free(x - 1, y + dy))) continue;
    b.prop(palms % 2 ? 'p2_palm1' : 'p2_palm0', x - 1, y, [{ x, y: y + 2, w: 1, h: 1 }], { sortY: y + 3 });
    palms++;
  }

  // ---------------------------------------------------------------- residents (they leave in the evacuation)
  const npc = (id: string, sprite: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right', wander = 0, show?: (st: StoryState) => boolean) =>
    b.npc({ id, sprite, x, y, dir, wander, script: id, show: show ?? before });
  npc('w2_local', 'local', 48, 71, 'down', 0, (st) => before(st) && !isSet(st, 'w2_local_met'));
  npc('w2_local2', 'local', 44, 70, 'right', 1);
  npc('r_angry', 'man_beard', 40, 39, 'down', 2);
  npc('r_scared', 'woman3', 51, 57, 'down', 1);
  npc('r_accept', 'grandpa2', 30, 48, 'up', 0);
  npc('r_joker', 'surfer', 58, 71, 'left', 2);
  npc('r_sandbag', 'man2', 62, 36, 'left', 1);
  npc('r_kid', 'kid3', 24, 57, 'right', 2);
  npc('r_fisher', 'fisher_keeper', 49, 79, 'left', 0);
  npc('r_builder', 'man_cap', 76, 17, 'down', 1);
  npc('r_conspiracy', 'old_man', 38, 17, 'right', 1);
  npc('r_cat', 'woman2', 72, 58, 'left', 2);
  npc('r_couple', 'woman', 18, 40, 'down', 1);
  npc('r_lookout', 'man_hat', 92, 40, 'right', 0);
  npc('r_cat_cat', 'cat', 92, 45, 'left', 1);
  // the mayor campaigns on the steps of City Hall
  npc('r_campaign', 'mayor2', 36, 39, 'down', 0, (st) => before(st) && !isSet(st, 'w2_hall_met'));

  // ---------------------------------------------------------------- the inventor's running commentary
  const quip = (x: number, y: number, w: number, h: number, id: string) => b.trigger(x, y, w, h, id, 'q_' + id, (st) => isSet(st, 'w2_inv_follow') && !isSet(st, 'w2_assembled'));
  quip(44, 16, 8, 3, 'quip_park_road');
  quip(70, 38, 14, 3, 'quip_dealer');
  quip(26, 42, 9, 9, 'quip_memorial');
  quip(52, 56, 12, 3, 'quip_grocery');
  // the evacuation leaves the island silent
  b.trigger(47, 56, 3, 3, 'w2_empty_street', 'q_empty', (st) => evac(st) && !isSet(st, 'w2_assembled'));

  return b.build();
}
