import { MapBuilder, type MapDef } from '../mapdef';
import { T, D } from '../tiles';
import { isSet, routesOpen, has } from '../../story/state';

// HOLLOWHAVEN: an island town. Square in the middle, the Mayor's Office to the
// north, the mansion and grocery to the east, the farm and park to the west,
// the dock and fishing shop to the south.

export const TOWN_W = 96;
export const TOWN_H = 82;

/** Island shape: a rounded square with a wobbly coast. 0 = centre, 1 = waterline. */
function islandR(x: number, y: number) {
  const dx = (x - 48) / 46;
  const dy = (y - 38) / 38.5;
  const wob = 0.03 * Math.sin(x * 0.21) + 0.025 * Math.sin(y * 0.27 + 1.3) + 0.012 * Math.sin((x + y) * 0.5);
  return Math.pow(Math.pow(Math.abs(dx), 3.2) + Math.pow(Math.abs(dy), 3.2), 1 / 3.2) - wob;
}

/** Building doors (exported so interiors can warp back to the right tile). */
export const DOORS = {
  office: { x: 47, y: 32 },
  psychic: { x: 24, y: 17 },
  mabel: { x: 33, y: 17 },
  gerald: { x: 63, y: 17 },
  coffin: { x: 71, y: 17 },
  mansion: { x: 79, y: 34 },
  store: { x: 67, y: 53 },
  spoons: { x: 80, y: 52 },
  farmhouse: { x: 12, y: 28 },
  barn: { x: 27, y: 29 },
  tavern: { x: 41, y: 54 },
  twins: { x: 62, y: 37 },
  fan: { x: 39, y: 62 },
  fishshop: { x: 57, y: 65 },
  cave: { x: 8, y: 53 },
};

export function buildTown(): MapDef {
  const b = new MapBuilder('town', 'HOLLOWHAVEN', TOWN_W, TOWN_H, T.WATER);
  const m = b.m;
  m.outdoor = true;
  m.music = 'town';
  m.amb = 'town';
  m.dark = 0.42;
  m.darkStyle = 'night';
  m.fishing = true;
  m.spawn = { x: 47, y: 44, dir: 'up' };

  // ---------------------------------------------------------------- land
  for (let y = 0; y < TOWN_H; y++)
    for (let x = 0; x < TOWN_W; x++) {
      const r = islandR(x, y);
      if (r < 0.94) b.g(x, y, T.GRASS);
      else if (r < 1) b.g(x, y, T.SAND);
    }
  // wet sand where the sand meets the sea
  for (let y = 0; y < TOWN_H; y++)
    for (let x = 0; x < TOWN_W; x++) {
      if (b.gt(x, y) !== T.SAND) continue;
      const nearWater = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => b.gt(x + dx, y + dy) === T.WATER);
      if (nearWater) b.g(x, y, T.WETSAND);
    }
  b.scatter(0, 0, TOWN_W, TOWN_H, T.GRASS, [T.GRASS2, T.GRASS3, T.TUFT, T.DEADFLOWER], 0.3, 7);
  b.scatter(0, 0, TOWN_W, TOWN_H, T.SAND, [T.SAND2], 0.2, 3);

  // ---------------------------------------------------------------- roads
  const road = (x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, T.COBBLE);
    b.scatter(x, y, w, h, T.COBBLE, [T.COBBLE2], 0.3, x * 7 + y);
  };
  road(47, 33, 2, 1); // office steps
  road(47, 47, 2, 22); // south road to the dock
  road(8, 40, 31, 2); // west road
  road(58, 40, 30, 2); // east road
  road(39, 20, 2, 14); // north-west lane
  road(56, 20, 2, 14); // north-east lane
  road(18, 20, 58, 2); // north road
  road(49, 55, 36, 2); // south-east road to the store
  road(20, 42, 2, 4); // to the park
  road(20, 36, 2, 4); // to the farm gate
  b.rect(24, 18, 1, 2, T.DIRT);
  b.rect(33, 18, 1, 2, T.DIRT);
  b.rect(63, 18, 1, 2, T.DIRT);
  b.rect(71, 18, 1, 2, T.DIRT);
  b.rect(79, 35, 2, 5, T.GRAVEL); // mansion drive
  b.rect(67, 54, 2, 1, T.COBBLE);
  b.rect(80, 53, 1, 2, T.DIRT);
  b.rect(62, 38, 1, 2, T.DIRT);
  b.rect(39, 63, 1, 3, T.DIRT);
  b.rect(40, 65, 7, 1, T.DIRT);
  b.rect(57, 66, 1, 2, T.DIRT);
  b.rect(49, 67, 8, 1, T.DIRT);

  // ---------------------------------------------------------------- square
  b.rect(39, 34, 19, 13, T.PLAZA);
  b.prop('p_well', 47, 38, [{ x: 47, y: 39, w: 2, h: 2 }], { sortY: 41 });
  b.spot(47, 39, 'well');
  b.spot(48, 39, 'well');
  b.spot(47, 40, 'well');
  b.spot(48, 40, 'well');
  b.prop('p_clocktower', 53, 34, [{ x: 53, y: 39, w: 3, h: 2 }], { sortY: 41 });
  b.spot(54, 40, 'clocktower');
  for (const [x, y] of [
    [40, 35],
    [57, 36],
    [40, 45],
    [56, 45],
    [45, 33],
    [50, 33],
  ]) {
    b.prop('p_lamp', x, y - 1, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
    b.light(x * 16 + 8, (y - 1) * 16 + 4, 44, 0.25);
  }
  for (const [x, y] of [
    [42, 37],
    [52, 43],
    [42, 43],
  ])
    b.d(x, y, D.BENCH);
  b.d(44, 46, D.SIGN);
  b.spot(44, 46, 'sign_square');

  // ---------------------------------------------------------------- north: office, cemetery, houses
  b.prop('b_office', 42, 26, [{ x: 42, y: 26, w: 12, h: 7 }]);
  b.warp(47, 32, 'office', 6, 8, 'up', 'door', 'office_door');
  b.warp(48, 32, 'office', 7, 8, 'up', 'door', 'office_door');
  b.light(47 * 16 + 16, 31 * 16, 30, 0.1);
  // little cemetery behind the office
  b.rect(42, 8, 13, 9, T.DIRT);
  b.scatter(42, 8, 13, 9, T.DIRT, [T.GRASS3, T.TUFT], 0.4, 12);
  b.fence(41, 7, 15, 11);
  b.d(48, 17, D.NONE).d(48, 18, D.NONE);
  b.rect(48, 18, 1, 2, T.DIRT);
  for (const [x, y, t] of [
    [43, 9, D.GRAVE],
    [46, 9, D.TOMBSTONE2],
    [49, 9, D.GRAVE],
    [52, 9, D.GRAVE],
    [43, 12, D.TOMBSTONE2],
    [46, 12, D.GRAVE],
    [51, 12, D.TOMBSTONE2],
    [53, 14, D.GRAVE],
    [44, 15, D.SKULLPILE],
  ] as const)
    b.d(x, y, t);
  b.spot(46, 12, 'grave_eye');
  b.spot(52, 9, 'grave_joke');
  b.spot(43, 9, 'grave_old');
  b.prop('p_tree', 54, 9, [{ x: 54, y: 11, w: 1, h: 1 }], { sortY: 12 });

  b.prop('b_psychic', 20, 12, [{ x: 20, y: 12, w: 9, h: 6 }]);
  b.warp(DOORS.psychic.x, DOORS.psychic.y, 'psychic', 6, 8, 'up', 'door', 'psychic_door');
  b.light(24 * 16 + 8, 16 * 16, 40, 0.4);
  b.prop('b_house1', 30, 13, [{ x: 30, y: 13, w: 7, h: 5 }]);
  b.warp(DOORS.mabel.x, DOORS.mabel.y, 'mabel', 4, 7, 'up');
  b.prop('b_house2', 60, 13, [{ x: 60, y: 13, w: 7, h: 5 }]);
  b.warp(DOORS.gerald.x, DOORS.gerald.y, 'gerald', 4, 7, 'up');
  b.prop('b_house3', 68, 13, [{ x: 68, y: 13, w: 7, h: 5 }]);
  b.warp(DOORS.coffin.x, DOORS.coffin.y, 'coffin', 4, 7, 'up');
  b.d(31, 19, D.SIGN);
  b.spot(31, 19, 'sign_north');
  // MAD PIES, at the quiet end of North Road
  b.prop('b_madpies', 76, 13, [{ x: 76, y: 13, w: 7, h: 5 }]);
  b.warp(79, 17, 'madpies', 6, 8, 'up');
  b.rect(76, 20, 6, 2, T.COBBLE);
  b.rect(79, 18, 1, 2, T.DIRT);
  b.d(81, 19, D.SIGN);
  b.spot(81, 19, 'sign_madpies');

  // ---------------------------------------------------------------- east: mansion, store
  b.rect(68, 23, 23, 16, T.GRASS3);
  b.scatter(68, 23, 23, 16, T.GRASS3, [T.DEADFLOWER, T.TUFT], 0.25, 31);
  b.frame(68, 23, 23, 16, T.HEDGE, 'g');
  b.rect(79, 38, 2, 1, T.GRAVEL); // gate opening
  b.prop('b_mansion', 70, 23, [{ x: 70, y: 23, w: 20, h: 12 }]);
  b.warp(79, 34, 'mansion1', 12, 19, 'up', 'door', 'mansion_door');
  b.warp(80, 34, 'mansion1', 13, 19, 'up', 'door', 'mansion_door');
  for (const [x, y] of [
    [72, 37],
    [87, 37],
  ])
    b.prop('p_tree', x, y - 2, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  b.d(73, 36, D.TOMBSTONE2).d(86, 36, D.GRAVE).d(76, 36, D.STUMP);
  b.spot(86, 36, 'mansion_grave');
  b.prop('p_lamp', 78, 38, [{ x: 78, y: 39, w: 1, h: 1 }], { sortY: 40 });
  b.light(78 * 16 + 8, 38 * 16 + 4, 30, 0.6);

  b.prop('b_store', 62, 47, [{ x: 62, y: 47, w: 12, h: 7 }]);
  b.warp(67, 53, 'store', 9, 13, 'up', 'door', 'store_door');
  b.warp(68, 53, 'store', 10, 13, 'up', 'door', 'store_door');
  b.light(67 * 16 + 16, 52 * 16, 50, 0.08);
  b.prop('b_house4', 77, 47, [{ x: 77, y: 47, w: 7, h: 5 }]);
  b.warp(80, 51, 'spoons', 4, 7, 'up');
  b.d(60, 50, D.CRATE).d(60, 51, D.BARREL).d(75, 52, D.CRATE);
  b.spot(60, 50, 'store_crate');

  // ---------------------------------------------------------------- square-side houses
  b.prop('b_tavern', 38, 49, [{ x: 38, y: 49, w: 7, h: 6 }]);
  b.warp(41, 54, 'tavern', 4, 8, 'up');
  b.rect(41, 55, 6, 1, T.DIRT);
  b.prop('p_lamp', 45, 53, [{ x: 45, y: 54, w: 1, h: 1 }], { sortY: 55 });
  b.light(45 * 16 + 8, 53 * 16 + 4, 36, 0.3);
  b.prop('b_house2', 59, 32, [{ x: 59, y: 32, w: 7, h: 5 }]);
  b.warp(62, 36, 'twins', 4, 7, 'up');

  // ---------------------------------------------------------------- west: the farm
  b.rect(6, 22, 28, 15, T.DIRT);
  b.scatter(6, 22, 28, 15, T.DIRT, [T.HAYDIRT, T.GRASS3], 0.25, 41);
  b.fence(5, 21, 30, 17);
  b.d(20, 37, D.NONE).d(21, 37, D.NONE); // gate gap
  b.prop('b_farmhouse', 8, 23, [{ x: 8, y: 23, w: 8, h: 6 }]);
  b.warp(DOORS.farmhouse.x, DOORS.farmhouse.y, 'farmhouse', 4, 7, 'up');
  b.prop('b_barn', 23, 23, [{ x: 23, y: 23, w: 9, h: 7 }]);
  b.warp(DOORS.barn.x, DOORS.barn.y, 'barn', 5, 8, 'up');
  // animal pen
  b.fence(7, 30, 9, 6);
  b.d(15, 32, D.FENCE_BROKEN);
  b.spot(15, 32, 'farm_fence');
  // troughs are set into the fence so they can be filled from outside the pen
  b.d(8, 30, D.TROUGH).d(12, 30, D.TROUGH).d(15, 34, D.TROUGH);
  b.spot(8, 30, 'farm_trough1');
  b.spot(12, 30, 'farm_trough2');
  b.spot(15, 34, 'farm_trough3');
  b.d(17, 30, D.HAY).d(18, 30, D.HAY).d(17, 31, D.HAY);
  b.d(32, 30, D.PLANKS);
  b.spot(32, 30, 'farm_planks');
  b.d(33, 24, D.FEEDSACK);
  // corn field: a little maze of rows in the fog
  b.rect(17, 31, 15, 6, T.SOIL);
  const corn = [
    '..CCCCCCCCCCCCC',
    '.CC...C.....C.C',
    '.C..C.C.CCC.C.C',
    '.C.CC...C...C..',
    '.C..CCCCC.CCCC.',
    '..............C',
  ];
  corn.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === 'C') b.g(17 + i, 31 + j, T.CORN);
  });
  m.fog.push({ x: 16, y: 29, w: 18, h: 9 });
  b.d(6, 36, D.PUMPKIN).d(16, 36, D.PUMPKIN).d(6, 24, D.BARREL);
  b.prop('p_tree', 31, 34, [{ x: 31, y: 36, w: 1, h: 1 }], { sortY: 37, show: () => false });
  b.d(22, 38, D.SIGN);
  b.spot(22, 38, 'sign_farm');

  // ---------------------------------------------------------------- west: park + cave
  b.rect(10, 45, 28, 17, T.GRASS);
  b.scatter(10, 45, 28, 17, T.GRASS, [T.GRASS2, T.TUFT], 0.35, 51);
  for (let x = 10; x < 38; x++) if (x < 19 || x > 22) b.g(x, 44, T.HEDGE);
  for (let y = 44; y < 62; y++) b.g(37, y, T.HEDGE);
  b.rect(20, 45, 2, 6, T.DIRT);
  b.rect(12, 51, 22, 1, T.DIRT);
  b.rect(9, 51, 3, 3, T.DIRT);
  // pond
  b.rect(24, 54, 6, 4, T.WATER);
  b.g(24, 54, T.GRASS).g(29, 54, T.GRASS).g(24, 57, T.GRASS).g(29, 57, T.GRASS);
  b.d(23, 55, D.REEDS).d(30, 56, D.REEDS).d(25, 58, D.REEDS);
  b.spot(27, 58, 'pond');
  b.prop('p_swings', 13, 46, [{ x: 13, y: 47, w: 3, h: 1 }], { sortY: 48 });
  b.prop('p_slide', 17, 46, [{ x: 17, y: 47, w: 2, h: 1 }], { sortY: 48 });
  b.d(14, 55, D.BENCH).d(19, 55, D.BENCH).d(32, 53, D.BENCH);
  for (const [x, y] of [
    [11, 57],
    [33, 46],
    [31, 58],
    [16, 58],
  ])
    b.prop('p_tree', x, y - 2, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  b.prop('p_lamp', 22, 52, [{ x: 22, y: 53, w: 1, h: 1 }], { sortY: 54 });
  b.light(22 * 16 + 8, 52 * 16 + 4, 40, 0.3);
  // cave mouth in the western cliffs
  b.rect(4, 48, 6, 4, T.ROCKWALL);
  b.prop('p_cave', 5, 49, [{ x: 5, y: 49, w: 5, h: 4 }], { sortY: 53 });
  b.prop('p_tape', 8, 52, [{ x: 8, y: 52, w: 1, h: 1 }], { sortY: 54, show: (st) => !routesOpen(st) });
  b.warp(8, 52, 'cave', 2, 1, 'down', 'door', 'cave_door');
  b.d(12, 52, D.SIGN);
  b.spot(12, 52, 'sign_park');

  // ---------------------------------------------------------------- south: dock, fishing shop, beach
  for (let y = 69; y < 80; y++) {
    b.g(47, y, T.DOCK_V).g(48, y, T.DOCK_V).g(49, y, T.DOCK_V);
  }
  b.rect(44, 70, 3, 1, T.DOCK);
  b.prop('p_bell', 48, 78, [{ x: 48, y: 79, w: 1, h: 1 }], { sortY: 80, show: (st) => !isSet(st, 'bell_replaced') });
  b.prop('p_bellfish_bell', 48, 78, [{ x: 48, y: 79, w: 1, h: 1 }], { sortY: 80, show: (st) => isSet(st, 'bell_replaced') });
  b.spot(48, 79, 'dock_bell');
  b.d(49, 71, D.BARREL).d(47, 74, D.ROPE).d(49, 76, D.CRATE);
  b.prop('p_lamp', 49, 72, [{ x: 49, y: 73, w: 1, h: 1 }], { sortY: 74 });
  b.light(49 * 16 + 8, 72 * 16 + 4, 36, 0.5);
  b.prop('p_boat', 43, 72, 'none', { sortY: 73 });
  b.prop('p_boat', 51, 75, 'none', { sortY: 76 });
  b.prop('b_fishshop', 54, 60, [{ x: 54, y: 60, w: 8, h: 6 }]);
  b.warp(57, 65, 'fishshop', 4, 7, 'up', 'door', 'fishshop_door');
  b.d(62, 64, D.FISHRACK).d(53, 64, D.NET).d(62, 62, D.BARREL);
  b.prop('p_stall', 38, 66, [{ x: 38, y: 67, w: 3, h: 1 }], { sortY: 68 });
  b.prop('p_stall', 42, 66, [{ x: 42, y: 67, w: 3, h: 1 }], { sortY: 68 });
  b.spot(39, 67, 'stall1');
  b.spot(43, 67, 'stall2');
  b.prop('b_house1', 36, 58, [{ x: 36, y: 58, w: 7, h: 5 }]);
  b.warp(39, 62, 'fan', 4, 7, 'up');
  b.d(50, 66, D.SIGN);
  b.spot(50, 66, 'sign_dock');

  // ---------------------------------------------------------------- scattered dead trees + rocks
  for (const [x, y] of [
    [14, 12],
    [10, 17],
    [36, 9],
    [60, 7],
    [76, 9],
    [84, 15],
    [88, 44],
    [86, 62],
    [72, 64],
    [26, 66],
    [14, 66],
    [62, 26],
    [28, 26],
    [35, 26],
    [90, 52],
  ])
    if (b.gt(x, y) !== T.WATER && b.gt(x, y + 2) !== T.WATER) b.prop('p_tree', x, y, [{ x, y: y + 2, w: 1, h: 1 }], { sortY: y + 3 });
  b.spot(76, 11, 'tree_crow');
  for (const [x, y] of [
    [74, 69],
    [10, 64],
    [80, 7],
    [24, 70],
  ])
    if (b.gt(x, y) !== T.WATER) b.d(x, y, D.ROCK);
  b.spot(74, 69, 'rock_coin');
  b.d(66, 70, D.BONES);
  b.spot(66, 70, 'beach_bones');

  // ---------------------------------------------------------------- the rest of town: boarded houses, lamps, trees
  const free = (x: number, y: number, w: number, h: number) => {
    for (let j = y - 1; j < y + h + 1; j++)
      for (let i = x - 1; i < x + w + 1; i++) {
        const g = b.gt(i, j);
        if (![T.GRASS, T.GRASS2, T.GRASS3, T.TUFT, T.DEADFLOWER].includes(g as any)) return false;
        if (b.dt(i, j) !== D.NONE) return false;
        if (m.props.some((p) => p.solid.some((r) => i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h))) return false;
        if (m.warps.some((wp) => Math.abs(wp.x - i) + Math.abs(wp.y - j) < 2)) return false;
      }
    return true;
  };
  const boarded: [number, number, number, string][] = [
    [64, 59, 2, 'boarded1'],
    [76, 59, 0, 'boarded2'],
    [80, 64, 3, 'boarded3'],
    [26, 63, 1, 'boarded4'],
    [12, 64, 2, 'boarded5'],
    [84, 22, 0, 'boarded6'],
  ];
  for (const [x, y, v, spot] of boarded) {
    if (!free(x, y, 7, 5)) continue;
    b.prop('b_house' + (v + 1), x, y, [{ x, y, w: 7, h: 5 }]);
    b.d(x + 3, y + 5, D.NONE);
    b.spot(x + 3, y + 4, spot);
    b.prop('tile:' + D.BOARDED, x + 3, y + 4, 'none', { sortY: y + 5 });
  }
  // lamps along the main streets
  for (const [x, y] of [
    [46, 50],
    [49, 58],
    [46, 64],
    [56, 54],
    [64, 57],
    [74, 54],
    [84, 54],
    [16, 39],
    [28, 39],
    [62, 42],
    [72, 42],
    [84, 42],
    [24, 22],
    [36, 19],
    [60, 19],
    [72, 22],
  ])
    if (free(x, y, 1, 1) || [T.COBBLE, T.COBBLE2].includes(b.gt(x, y + 1) as any)) {
      if (b.gt(x, y) === T.COBBLE || b.gt(x, y) === T.COBBLE2) continue;
      b.prop('p_lamp', x, y - 1, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
      b.light(x * 16 + 8, (y - 1) * 16 + 4, 40, 0.25);
    }
  // a scatter of dead trees and the odd gravestone, crate or stump
  let s = 4242;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let trees = 0;
  for (let k = 0; k < 900 && trees < 70; k++) {
    const x = 3 + Math.floor(r() * (TOWN_W - 6));
    const y = 3 + Math.floor(r() * (TOWN_H - 8));
    if (!free(x, y, 1, 3)) continue;
    if ([T.COBBLE, T.COBBLE2, T.PLAZA].some((t) => [b.gt(x, y + 3), b.gt(x, y + 4), b.gt(x - 1, y + 2), b.gt(x + 1, y + 2)].includes(t as any))) continue;
    const roll = r();
    if (roll < 0.7) {
      b.prop('p_tree', x, y, [{ x, y: y + 2, w: 1, h: 1 }], { sortY: y + 3 });
      trees++;
    } else if (roll < 0.8) b.d(x, y + 2, D.GRAVE);
    else if (roll < 0.9) b.d(x, y + 2, D.STUMP);
    else b.d(x, y + 2, D.ROCK);
  }

  // ---------------------------------------------------------------- townsfolk
  const npc = (id: string, sprite: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right', wander = 0, show?: (st: any) => boolean, ambient = false) =>
    b.npc({ id, sprite, x, y, dir, wander, script: id, show, ambient });
  const before = (st: any) => !isSet(st, 'dutchman_arrived') || isSet(st, 'ending_done');
  npc('t_greeter', 'man_hat', 45, 42, 'right', 0, (st) => !isSet(st, 'dutchman_arrived'));
  npc('t_oldlady', 'old_lady', 42, 38, 'down', 2, before);
  npc('t_worker', 'man_cap', 52, 44, 'left', 2, before);
  npc('t_gossip', 'woman', 38, 41, 'right', 1, before);
  npc('t_lamplighter', 'old_man', 57, 36, 'down', 1, before);
  npc('t_north', 'woman_bun', 50, 21, 'left', 3, before);
  npc('t_crowkid', 'kid_boy', 74, 20, 'down', 2, before);
  npc('t_dockhand', 'man_beard', 46, 68, 'down', 1, before);
  npc('t_fishwife', 'woman', 44, 68, 'right', 0, before);
  npc('father', 'man_beard', 77, 40, 'up', 0, (st) => !isSet(st, 'dutchman_arrived') || isSet(st, 'ending_done'));
  npc('farmer', 'farmer', 21, 39, 'down', 0, (st) => !isSet(st, 'farm_met'));
  npc('farmer_in', 'farmer', 19, 26, 'down', 2, (st) => isSet(st, 'farm_met') && !isSet(st, 'dutchman_arrived'));
  npc('kid1', 'kid_girl', 15, 49, 'right', 2, before);
  npc('kid2', 'kid_boy', 18, 50, 'left', 2, before);
  npc('kid3', 'kid_boy2', 26, 52, 'down', 1, before);
  npc('blocker', 'man_round', 57, 66, 'down', 0, (st) => !isSet(st, 'blocker_moved'));
  npc('blocker_side', 'man_round', 59, 67, 'left', 0, (st) => isSet(st, 'blocker_moved') && before(st));
  npc('chicken1', 'chicken', 9, 33, 'right', 2, undefined, true);
  npc('chicken2', 'chicken', 11, 34, 'left', 2, undefined, true);
  npc('pig1', 'pig', 13, 32, 'down', 1, undefined, true);
  npc('piglet_pen', 'piglet', 10, 32, 'down', 1, (st) => isSet(st, 'farm_piglet_done'), true);
  npc('piglet', 'piglet', 30, 36, 'left', 0, (st) => isSet(st, 'farm_task2') && !isSet(st, 'farm_piglet_got'));
  npc('hauntcorn_field', 'cr_hauntcorn', 27, 34, 'down', 0, (st) => st.creature === null && isSet(st, 'farm_told'));
  npc('scarecrow_still', 'scarecrow', 27, 34, 'down', 0, (st) => st.creature !== 'hauntcorn' && !(st.creature === null && isSet(st, 'farm_told')));
  // celebration crowd for the ending
  const party = (st: any) => isSet(st, 'mayor_ran') && !isSet(st, 'ending_done');
  npc('c_1', 'woman', 44, 36, 'up', 0, party);
  npc('c_2', 'man_cap', 51, 36, 'up', 0, party);
  npc('c_3', 'kid_girl', 46, 35, 'up', 0, party);
  npc('c_4', 'old_man', 49, 37, 'up', 0, party);

  // triggers
  b.trigger(19, 37, 4, 2, 'farm_gate', undefined, (st) => !isSet(st, 'farm_met'));
  b.trigger(46, 33, 4, 1, 'ending_trigger', undefined, (st) => isSet(st, 'mayor_ran') && !isSet(st, 'ending_done'));
  // story-driven tile changes: filled troughs, the mended fence
  m.dyn = (st) => {
    const out: [number, number, number][] = [];
    if (isSet(st, 'farm_fed1')) out.push([8, 30, D.TROUGH_FULL]);
    if (isSet(st, 'farm_fed2')) out.push([12, 30, D.TROUGH_FULL]);
    if (isSet(st, 'farm_fed3')) out.push([15, 34, D.TROUGH_FULL]);
    if (isSet(st, 'farm_fence_fixed')) out.push([15, 32, D.FENCE_V]);
    return out;
  };
  void has;
  return b.build();
}
