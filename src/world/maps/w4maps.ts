import { MapBuilder, type MapDef } from '../mapdef';
import { fromAscii, type Style, type ExtraChars } from '../ascii';
import { T, D } from '../tiles';
import { isSet, flag } from '../../story/state';
import type { StoryState } from '../../story/state';

// World 4: THE FORGOTTEN ISLAND. The mountain and its trail, the abandoned village,
// the giant tree, the Ancient Forest and the Woodlands Tower, the crashed airship on
// the rocks, the castle; the two dungeons (seven floors of the tower, seven of the
// tree); and the sets for the ending: the sky, the stone chamber and the cells.

export const W4_W = 112;
export const W4_H = 92;

const f = (k: string) => (st: StoryState) => isSet(st, k);
const nf = (k: string) => (st: StoryState) => !isSet(st, k);
const route = (st: StoryState) => flag(st, 'w4_route') as string | undefined;

/** Where things are on the island (scripts use these). */
export const W4 = {
  spawn: { x: 12, y: 85 },
  catStart: { x: 17, y: 81 },
  /** where the cat shows itself on the way up, and the trigger that shows it */
  catTrail: [
    { at: { x: 16, y: 70, w: 4, h: 2 }, cat: { x: 31, y: 66 } },
    { at: { x: 31, y: 60, w: 4, h: 2 }, cat: { x: 12, y: 54 } },
    { at: { x: 9, y: 48, w: 4, h: 2 }, cat: { x: 28, y: 42 } },
    { at: { x: 27, y: 36, w: 4, h: 2 }, cat: { x: 33, y: 22 } },
  ],
  monument: { x: 35, y: 11 },
  /** standing in front of the monument */
  monumentFront: { x: 36, y: 18 },
  vmonument: { x: 60, y: 41 },
  paw: { x: 60, y: 46 },
  plaza: { x: 60, y: 47 },
  well: { x: 63, y: 53 },
  doors: {
    warn: { x: 48, y: 52 },
    boarded: { x: 48, y: 40 },
    house2: { x: 69, y: 39 },
    storage: { x: 69, y: 52 },
    boarded2: { x: 76, y: 53 },
    tower: { x: 96, y: 13 },
    wreck: { x: 72, y: 79 },
    ladder: { x: 78, y: 79 },
    castle: { x: 50, y: 75 },
    root: { x: 60, y: 25 },
  },
  roofs: { warn: { x: 48, y: 47 }, storage: { x: 69, y: 48 }, house2: { x: 69, y: 34 } },
  steles: [
    { x: 56, y: 29 },
    { x: 64, y: 29 },
  ],
  clearing: { x: 102, y: 54 },
  forestGate: { x: 83, y: 43, w: 2, h: 4 },
};

/** The spirit research facility: the hillside on the clearing, and what is inside. */
export const LAB = {
  hill: { x: 98, y: 43, w: 8, h: 6 },
  door: { x: 102, y: 48 },
  /** where the tunnel from the vault comes out, and where you climb out of it */
  burrow: { x: 106, y: 46 },
  out: { x: 106, y: 49 },
  /** reception: the four breakers on the wall, and which of them start switched on */
  breakers: [10, 11, 12, 13],
  brkStart: [false, true, true, false],
  /** containment */
  pad: { x: 5, y: 6 },
  cellStart: { x: 11, y: 9 },
  /** the tanks along the walls: [x, y (top of the sprite), subject number, sprite kind] */
  tanks: [
    [1, 1, 2, 1],
    [4, 1, 3, 0],
    [7, 1, 6, 4],
    [10, 1, 5, 2],
    [13, 1, 7, 3],
    [1, 7, 4, 1],
    [13, 7, 8, 0],
  ] as [number, number, number, number][],
  /** the director's safe: the control group (never enhanced, still stable), lowest first */
  code: [3, 6, 8],
  /** the chamber's great tank and its console */
  tank: { x: 8, y: 1 },
  console: { x: 8.5, y: 7 },
};
/** Is breaker i switched on? (Its flag records that it has been flipped from how it started.) */
export const brkOn = (st: StoryState, i: number) => isSet(st, 'w4_lb' + i) !== LAB.brkStart[i];
const px16 = (t: number) => t * 16 + 8;

function inIsland(x: number, y: number) {
  const b = 2 + 1.2 * Math.sin(x * 0.31 + 0.7) + 0.8 * Math.sin(y * 0.23 + 2.1);
  const by = 2 + 1.1 * Math.sin(x * 0.27 + 1.9) + 0.6 * Math.sin(x * 0.11);
  return x > b && x < W4_W - 1 - b && y > by && y < W4_H - 1 - by;
}

function island(): MapDef {
  const b = new MapBuilder('w4_isl', 'THE FORGOTTEN ISLAND', W4_W, W4_H, T.WATER);
  const m = b.m;
  m.world = 4;
  m.outdoor = true;
  m.music = 'w4_island';
  m.amb = 'island';
  m.dark = 0.45;
  m.darkStyle = 'night';
  m.spawn = { x: W4.spawn.x, y: W4.spawn.y, dir: 'up' };
  const land = (x: number, y: number) => inIsland(x, y);
  for (let y = 0; y < W4_H; y++)
    for (let x = 0; x < W4_W; x++) {
      if (!land(x, y)) continue;
      const nearSea = [-2, -1, 1, 2].some((d) => !land(x + d, y) || !land(x, y + d));
      b.g(x, y, nearSea ? (!land(x + 1, y) || !land(x - 1, y) || !land(x, y + 1) || !land(x, y - 1) ? T.W4_SHORE : T.W4_SAND) : T.W4_DEADGRASS);
    }
  b.scatter(0, 0, W4_W, W4_H, T.W4_DEADGRASS, [T.W4_BARREN, T.W4_BARREN2], 0.35, 71);

  // ---------------------------------------------------------------- the mountain
  const isLand = (x: number, y: number) => b.gt(x, y) !== T.WATER;
  for (let y = 3; y <= 78; y++) for (let x = 0; x <= 43; x++) if (isLand(x, y)) b.g(x, y, T.W4_ROCKTOP);
  for (let y = 79; y <= 90; y++) for (let x = 37; x <= 43; x++) if (isLand(x, y)) b.g(x, y, T.W4_ROCKTOP);
  // the meadow at the foot of the mountain
  for (let y = 79; y <= 89; y++) for (let x = 0; x <= 36; x++) if (isLand(x, y) && ![T.W4_SHORE, T.W4_SAND].includes(b.gt(x, y) as any)) b.g(x, y, T.W4_GRASS);
  b.scatter(0, 79, 37, 12, T.W4_GRASS, [T.W4_FLOWERS], 0.22, 5);
  const trail = (x: number, y: number, w: number, h: number) => {
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        const X = x + i;
        const Y = y + j;
        if (!isLand(X, Y)) continue;
        const edge = i < 0 || j < 0 || i >= w || j >= h;
        if (edge) {
          if (b.gt(X, Y) === T.W4_ROCKTOP) b.g(X, Y, T.W4_GRASS);
        } else b.g(X, Y, T.W4_TRAIL);
      }
  };
  // a trail winding up from the meadow: right, up, left, up, right, up
  trail(17, 66, 2, 15);
  trail(17, 66, 17, 2);
  trail(32, 54, 2, 14);
  trail(10, 54, 24, 2);
  trail(10, 42, 2, 14);
  trail(10, 42, 20, 2);
  trail(28, 30, 2, 14);
  trail(18, 79, 1, 4);
  // the summit: a grassy shelf at the cliff edge, the monument looking out over the island
  for (let y = 9; y <= 30; y++) for (let x = 16; x <= 40; x++) b.g(x, y, T.W4_GRASS);
  b.scatter(16, 9, 25, 22, T.W4_GRASS, [T.W4_FLOWERS], 0.12, 9);
  for (let y = 7; y <= 31; y++) b.g(41, y, T.W4_CLIFF).g(42, y, T.W4_CLIFF);
  // and the way down to the village
  trail(39, 27, 5, 2);
  trail(42, 27, 2, 9);
  // rock faces where the mountain meets walkable ground
  for (let y = 1; y < W4_H; y++)
    for (let x = 0; x < W4_W; x++) if (b.gt(x, y) === T.W4_ROCKTOP && ![T.W4_ROCKTOP, T.W4_CLIFF, T.WATER].includes(b.gt(x, y + 1) as any)) b.g(x, y, T.W4_ROCK);
  for (const [x, y] of [[8, 84], [27, 86], [30, 81], [20, 72], [25, 66], [14, 57], [29, 55], [20, 45], [24, 43], [12, 47], [30, 38], [19, 20], [25, 13], [38, 25]]) b.d(x, y, D.ROCK);
  b.prop('w4_monument', W4.monument.x, W4.monument.y, [{ x: 35, y: 14, w: 4, h: 4 }]);
  b.spot(36, 17, 'w4_monument').spot(37, 17, 'w4_monument');
  // the cat shows itself on the way up, and waits on the monument at the top
  W4.catTrail.forEach((c, i) => b.trigger(c.at.x, c.at.y, c.at.w, c.at.h, 'w4_cat' + i, 'w4_cat_t' + i, f('w4_cat_seen')));
  b.trigger(26, 28, 6, 3, 'w4_summit', 'w4_summit_t');
  for (const [k, x, y] of [[0, 22, 16], [1, 18, 25], [2, 26, 82], [1, 6, 80], [0, 32, 84]] as const) b.prop(`w4_bush${k % 2}`, x, y, [{ x: x + 0.5, y: y + 0.5, w: 1, h: 0.5 }], { sortY: y + 1 });

  // ---------------------------------------------------------------- the village
  const cob = (x: number, y: number, w: number, h: number) => {
    b.rect(x, y, w, h, T.W4_COBBLE);
    b.scatter(x, y, w, h, T.W4_COBBLE, [T.W4_BARREN2], 0.18, x * 3 + y);
  };
  for (let y = 27; y <= 63; y++) for (let x = 44; x <= 81; x++) if (b.gt(x, y) === T.W4_DEADGRASS) b.g(x, y, (x * 7 + y * 3) % 5 ? T.W4_BARREN : T.W4_BARREN2);
  cob(44, 44, 40, 2);
  cob(60, 27, 2, 52);
  cob(56, 40, 10, 10);
  cob(50, 77, 12, 2);
  b.prop('w4_vmonument', W4.vmonument.x, W4.vmonument.y, [{ x: 60, y: 42, w: 2, h: 3 }]);
  b.spot(60, 44, 'w4_vmonument').spot(61, 44, 'w4_vmonument');
  b.prop('w4_paw', W4.paw.x - 0.75, W4.paw.y - 0.5, 'none', { sortY: W4.paw.y - 1, show: f('w4_paw_seen') });
  // houses: one to read, one to follow the cat into, one boarded shut, the storage barn, and ruins
  b.prop('w4_house0', 46, 47, [{ x: 46, y: 49, w: 6, h: 4 }]);
  b.warp(W4.doors.warn.x, W4.doors.warn.y, 'w4_warn', 4, 7, 'up');
  b.prop('w4_house2', 46, 35, [{ x: 46, y: 37, w: 6, h: 4 }]);
  b.spot(W4.doors.boarded.x, W4.doors.boarded.y, 'w4_boarded');
  b.prop('w4_house1', 67, 34, [{ x: 67, y: 36, w: 6, h: 4 }]);
  b.warp(W4.doors.house2.x, W4.doors.house2.y, 'w4_house2', 5, 8, 'up', 'door', 'w4_house2_door');
  b.prop('w4_storage', 66, 48, [{ x: 66, y: 50, w: 7, h: 3 }]);
  b.warp(W4.doors.storage.x, W4.doors.storage.y, 'w4_storage', 6, 7, 'up', 'door', 'w4_storage_door');
  b.prop('w4_house0', 74, 48, [{ x: 74, y: 50, w: 6, h: 4 }]);
  b.spot(W4.doors.boarded2.x, W4.doors.boarded2.y, 'w4_boarded');
  b.prop('w4_ruin0', 74, 37, [{ x: 74, y: 39, w: 6, h: 2 }]);
  b.prop('w4_ruin1', 49, 56, [{ x: 49, y: 58, w: 6, h: 2 }]);
  b.spot(51, 59, 'w4_ruin');
  b.prop('p_well', W4.well.x, W4.well.y, [{ x: 63, y: 54, w: 2, h: 2 }]);
  b.spot(63, 55, 'w4_well').spot(64, 55, 'w4_well');
  W4.steles.forEach((s, i) => {
    b.prop(`w4_stele${i}`, s.x, s.y, [{ x: s.x, y: s.y + 1, w: 2, h: 2 }]);
    b.spot(s.x, s.y + 2, 'w4_stele' + i).spot(s.x + 1, s.y + 2, 'w4_stele' + i);
  });
  for (const [k, x, y] of [[0, 53, 30], [1, 70, 29], [2, 77, 58], [0, 45, 59], [1, 56, 62], [2, 79, 31], [0, 66, 60]] as const) b.prop(`w4_dtree${k}`, x - 1, y - 3, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  for (const [x, y, d] of [[52, 46, D.CRATE], [53, 46, D.BROKENBOX], [65, 46, D.BARREL], [57, 52, D.FENCE_BROKEN], [58, 52, D.FENCE_H], [72, 46, D.RUBBLE], [55, 39, D.STUMP], [79, 43, D.RUBBLE]] as const) b.d(x, y, d);
  // the gemstone trail: the cat at the storage barn, then at the second house
  b.trigger(64, 53, 12, 4, 'w4_cat_storage', 'w4_cat_storage', f('w4_tower_seen'));
  b.trigger(64, 40, 12, 3, 'w4_cat_house2', 'w4_cat_house2', f('w4_storage_read'));
  // the last warning: back in the square with your companion
  b.trigger(56, 38, 10, 12, 'w4_last_warning', 'w4_warning_t', (st) => (isSet(st, 'wispmane_beaten') || isSet(st, 'viperwind_beaten')) && isSet(st, 'w4_lab_done') && !isSet(st, 'w4_warning'));
  b.npc({ id: 'w4_hen1', sprite: 'chicken', x: 54, y: 43, dir: 'left', script: 'w4_animal', wander: 3, show: nf('w4_animals_fled') });
  b.npc({ id: 'w4_hen2', sprite: 'chicken', x: 57, y: 57, dir: 'right', script: 'w4_animal', wander: 2, show: nf('w4_animals_fled') });
  b.npc({ id: 'w4_pig', sprite: 'pig', x: 71, y: 58, dir: 'down', script: 'w4_animal', wander: 2, show: nf('w4_animals_fled') });
  // the giant tree, north of the village (its roots are sealed from the outside)
  b.prop('w4_bigtree', 51, 1, [{ x: 57, y: 13, w: 8, h: 9 }, { x: 55, y: 22, w: 12, h: 4 }]);
  b.warp(W4.doors.root.x, W4.doors.root.y, 'w4_g1', 7, 9, 'up', 'door', 'w4_root_gate');
  b.warp(W4.doors.root.x + 1, W4.doors.root.y, 'w4_g1', 8, 9, 'up', 'door', 'w4_root_gate');

  // ---------------------------------------------------------------- the Ancient Forest
  for (let y = 2; y <= 66; y++)
    for (let x = 83; x < W4_W; x++) if (b.gt(x, y) === T.W4_DEADGRASS || b.gt(x, y) === T.W4_BARREN || b.gt(x, y) === T.W4_BARREN2) b.g(x, y, (x * 5 + y * 11) % 7 ? T.W4_FOREST : T.W4_FOREST2);
  const fpath = (x: number, y: number, w: number, h: number) => b.rect(x, y, w, h, T.W4_TRAIL);
  fpath(82, 44, 16, 2);
  fpath(96, 14, 2, 32);
  fpath(96, 46, 2, 6);
  for (let y = 49; y <= 60; y++) for (let x = 97; x <= 108; x++) if (b.gt(x, y) !== T.WATER && b.gt(x, y) !== T.W4_SHORE) b.g(x, y, (x + y) % 6 ? T.W4_GRASS : T.W4_FLOWERS);
  for (let y = 13; y <= 15; y++) for (let x = 93; x <= 100; x++) b.g(x, y, T.W4_TRAIL);
  b.prop('w4_tower0', 94, 1, [{ x: 94, y: 5, w: 5, h: 9 }], { id: 'tower', show: (st) => !isSet(st, 'w4_tower_open') });
  b.prop('w4_tower_open', 94, 1, [{ x: 94, y: 5, w: 5, h: 9 }], { show: f('w4_tower_open') });
  b.warp(W4.doors.tower.x, W4.doors.tower.y, 'w4_t1', 8, 11, 'up', 'door', 'w4_tower_door');
  // the hillside on the north edge of the clearing: an overgrown mound, until the fight
  // with the guardian shakes the vines off it and shows the door underneath
  for (let y = LAB.hill.y - 2; y <= LAB.hill.y + LAB.hill.h - 1; y++) for (let x = LAB.hill.x - 1; x <= LAB.hill.x + LAB.hill.w + 1; x++) b.g(x, y, (x + y) % 5 ? T.W4_GRASS : T.W4_FLOWERS);
  const hillSolid = [{ x: LAB.hill.x, y: LAB.hill.y, w: LAB.hill.w, h: LAB.hill.h }];
  b.prop('w4_mound', LAB.hill.x, LAB.hill.y, hillSolid, { show: nf('w4_lab_found'), sortY: LAB.hill.y + LAB.hill.h });
  b.prop('w4_labfront', LAB.hill.x, LAB.hill.y, hillSolid, { id: 'labfront', show: f('w4_lab_found'), sortY: LAB.hill.y + LAB.hill.h });
  b.warp(LAB.door.x, LAB.door.y, 'w4_lab1', 8, 9, 'up', 'door', 'w4_lab_door');
  b.prop('w4_burrow', LAB.burrow.x, LAB.burrow.y, [{ x: LAB.burrow.x, y: LAB.burrow.y + 1, w: 2, h: 1 }], { show: f('w4_lab_done'), sortY: LAB.burrow.y + 2 });
  b.light(px16(LAB.door.x), (LAB.door.y + 1) * 16, 36, 0.3, f('w4_lab_found'));
  // trees: thick everywhere except the paths and the clearing
  const free = (x: number, y: number) => {
    for (let j = -1; j <= 4; j++) for (let i = -1; i <= 3; i++) if (![T.W4_FOREST, T.W4_FOREST2].includes(b.gt(x + i, y + j) as any)) return false;
    return true;
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let y = 2; y <= 62; y += 4)
    for (let x = 84; x <= 108; x += 3) {
      const tx = x + Math.floor(rnd() * 2);
      const ty = y + Math.floor(rnd() * 2);
      if (!free(tx, ty) || rnd() < 0.25) continue;
      b.prop(`w4_ltree${Math.floor(rnd() * 3)}`, tx, ty, [{ x: tx + 1, y: ty + 3, w: 1, h: 1 }], { sortY: ty + 4 });
    }
  for (const [x, y] of [[86, 47], [92, 42], [99, 30], [93, 22], [104, 47], [88, 39]]) if (b.gt(x, y) === T.W4_FOREST) b.d(x, y, D.BUSH);
  b.npc({ id: 'w4_deer', sprite: 'cow', x: 90, y: 47, dir: 'left', script: 'w4_forest_animal', wander: 2, show: nf('w4_animals_fled') });
  b.npc({ id: 'w4_fcat', sprite: 'piglet', x: 99, y: 40, dir: 'down', script: 'w4_forest_animal', wander: 2, show: nf('w4_animals_fled') });
  b.trigger(W4.forestGate.x, W4.forestGate.y, W4.forestGate.w, W4.forestGate.h, 'w4_forest_roar', 'w4_roared');
  // after the guardian: the door in the hillside (for a save from before there was one)
  b.trigger(97, 49, 12, 12, 'w4_lab_found', 'w4_lab_found_t', (st) => (isSet(st, 'wispmane_beaten') || isSet(st, 'viperwind_beaten')) && !isSet(st, 'w4_lab_found') && !isSet(st, 'w4_warning'));
  b.trigger(98, 49, 10, 2, 'w4_clearing', undefined, (st) => (isSet(st, 'w4_old_done') && !isSet(st, 'wispmane_beaten')) || (isSet(st, 'w4_flute_done') && !isSet(st, 'viperwind_beaten')));

  // ---------------------------------------------------------------- the south coast: the airship and the castle
  for (const [x, y, w, h] of [[63, 81, 3, 2], [82, 79, 3, 3], [86, 84, 2, 2], [60, 85, 2, 2], [90, 77, 2, 3], [67, 85, 3, 1]] as const)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (b.gt(x + i, y + j) !== T.WATER) b.g(x + i, y + j, j === h - 1 ? T.W4_ROCK : T.W4_ROCKTOP);
  b.prop('w4_wreck', 66, 71, [{ x: 67, y: 76, w: 14, h: 4 }], { show: (st) => route(st) !== 'B' });
  b.prop('w4_wreck_fixed', 66, 71, [{ x: 67, y: 76, w: 14, h: 4 }], { show: (st) => route(st) === 'B' && !isSet(st, 'w4_flown') });
  b.warp(W4.doors.wreck.x, W4.doors.wreck.y, 'w4_ship', 10, 8, 'up', 'door', 'w4_wreck_door');
  b.warp(W4.doors.wreck.x + 1, W4.doors.wreck.y, 'w4_ship', 11, 8, 'up', 'door', 'w4_wreck_door');
  b.warp(W4.doors.ladder.x, W4.doors.ladder.y, 'w4_nest', 6, 6, 'up', 'door', 'w4_ladder_gate');
  b.spot(75, 79, 'w4_engine').spot(76, 79, 'w4_engine');
  // make the way up the mast and the engine panel easy to see
  const parts3 = (st: StoryState) => ['keys', 'wheel', 'gas'].every((k) => (st.items[k] ?? 0) > 0);
  const ship = (st: StoryState) => route(st) !== 'A' && !isSet(st, 'w4_flown');
  b.prop('w4_ropeladder', W4.doors.ladder.x, 73.25, 'none', { show: (st) => !isSet(st, 'w4_flown'), sortY: 80.5 });
  b.prop('w4_nestsign', W4.doors.ladder.x + 0.95, 78.7, 'none', { show: ship, sortY: 80.6 });
  b.prop('w4_engpanel0', 75.06, 78.7, 'none', { show: (st) => !isSet(st, 'w4_flown') && !(ship(st) && parts3(st)), sortY: 80.5 });
  b.prop('w4_engpanel1', 75.06, 78.7, 'none', { show: (st) => ship(st) && parts3(st), sortY: 80.5 });
  b.light(76 * 16, 79 * 16 + 4, 34, 0.25, (st) => ship(st) && parts3(st));
  // the first time you come up to the wreck: what it needs, where to look
  b.trigger(66, 80, 16, 3, 'w4_wreck_look', 'w4_wreck_looked', (st) => isSet(st, 'w4_summit_done') && !route(st));
  b.prop('w4_castle', 44, 62.5, [{ x: 44, y: 67, w: 14, h: 9 }]);
  b.warp(W4.doors.castle.x, W4.doors.castle.y, 'w4_castle', 11, 14, 'up', 'door', 'w4_castle_door');
  b.warp(W4.doors.castle.x + 1, W4.doors.castle.y, 'w4_castle', 12, 14, 'up', 'door', 'w4_castle_door');
  b.trigger(46, 76, 10, 3, 'w4_engine_noise', 'w4_heard_engine', nf('w4_carlo_met'));
  // companions waiting out in the world
  b.npc({ id: 'w4_carlo', sprite: 'carlo', x: 74, y: 81, dir: 'up', script: 'w4_carlo_talk', show: (st) => isSet(st, 'w4_carlo_joined') && !isSet(st, 'w4_carlo_follow') && !isSet(st, 'w4_captured') });

  // lights: the moon on the water, the castle's lit windows
  b.light(55 * 16, 70 * 16, 50, 0.1).light(57 * 16, 70 * 16, 30, 0.1);
  b.light(36 * 16, 16 * 16, 60, 0);
  b.light(102 * 16, 54 * 16, 90, 0);
  return b.build();
}

// ------------------------------------------------------------------ styles

const S = {
  house: { floor: T.W4_PLANK, floor2: T.W4_STONE, wall: T.W4_STONEWALL, wallLow: T.W4_STONEWALL_LOW },
  stone: { floor: T.W4_STONE, floor2: T.W4_ROOTFLOOR, wall: T.W4_STONEWALL, wallLow: T.W4_STONEWALL_LOW },
  tree: { floor: T.W4_PLANK, floor2: T.W4_ROOTFLOOR, wall: T.W4_BARK, wallLow: T.W4_BARK_LOW },
  ship: { floor: T.W4_DECK, floor2: T.W4_PLANK, wall: T.W4_HULL, wallLow: T.W4_HULL_LOW },
  castle: { floor: T.W4_CASTLE, floor2: T.W4_CARPET, wall: T.W4_CASTLEWALL, wallLow: T.W4_CASTLEWALL_LOW },
  volc: { floor: T.W4_VOLC, floor2: T.W4_CELLFLOOR, wall: T.W4_VOLCWALL, wallLow: T.W4_VOLCWALL_LOW },
  lab: { floor: T.LAB_FLOOR, floor2: T.LAB_GRATE, wall: T.LAB_WALL, wallLow: T.LAB_WALL_LOW },
} satisfies Record<string, Style>;

/** The facility's own characters (in place of the island's). */
const LX: ExtraChars = {
  g: { d: D.NONE, g: T.LAB_GLASS },
  '/': { d: D.NONE, g: T.LAB_SCORCH },
  '1': { d: D.LAB_DESK },
  '2': { d: D.LAB_CONSOLE },
  '3': { d: D.LAB_CABINET },
  '4': { d: D.LAB_CLAW },
  '5': { d: D.LAB_WALLCLAW, wall: true },
  '6': { d: D.LAB_SIGN, wall: true },
  '7': { d: D.LAB_PIPES, wall: true },
  '8': { d: D.LAB_CANISTER },
  '9': { d: D.LAB_CABLES },
  '0': { d: D.LAB_GLASSBITS },
  ':': { d: D.LAB_CHART, wall: true },
  ';': { d: D.LAB_LOCKER },
  '<': { d: D.LAB_BENCH },
  '>': { d: D.LAB_PAPERS },
  '^': { d: D.LAB_BOARD, wall: true },
};

const X: ExtraChars = {
  '=': { d: D.NONE, g: T.W4_GAP },
  '-': { d: D.NONE, g: T.W4_ROPEBRIDGE },
  ':': { d: D.NONE, g: T.W4_CHANNEL },
  '/': { d: D.NONE, g: T.W4_CRACKED },
  '1': { d: D.RUBBLE },
  '2': { d: D.DEBRIS },
  '3': { d: D.CARVING, wall: true },
  '4': { d: D.NOTES, wall: true },
  '5': { d: D.MACHINE },
  '6': { d: D.GEARS },
  '7': { d: D.MAPTABLE },
  '8': { d: D.BRAZIER },
  '9': { d: D.GLOWROCK },
  '#': { d: D.NONE, g: T.W4_ROOTFLOOR },
};

const R = (w: number, rows: string[]) => {
  rows.forEach((r) => {
    if (r.length !== w) throw new Error(`row width ${r.length} != ${w}: "${r}"`);
  });
  return rows;
};

function room(id: string, name: string, rows: string[], style: Style, o: { music?: string; dark?: number; amb?: string; dstyle?: MapDef['darkStyle'] } = {}) {
  const b = fromAscii(id, name, rows, style, X);
  b.m.world = 4;
  b.m.music = o.music ?? 'w4_inside';
  b.m.amb = o.amb ?? 'indoor';
  b.m.dark = o.dark ?? 0.55;
  b.m.darkStyle = o.dstyle ?? 'candle';
  return b;
}
/** A mat at (x, bottom row) that leads back out to the island at (tx, ty). */
function out(b: MapBuilder, x: number, tx: number, ty: number) {
  const y = b.m.h - 1;
  b.g(x, y, T.MAT);
  b.warp(x, y, 'w4_isl', tx, ty, 'down', 'step');
  b.m.spawn = { x, y: y - 1, dir: 'up' };
}

// ------------------------------------------------------------------ the village interiors

/** The house with the carving: the first warning. */
function warnHouse(): MapDef {
  const b = room('w4_warn', 'AN ABANDONED HOUSE', R(10, [
    'WWWWWWWWWW',
    'ww3wwwwOww',
    'w........w',
    'w.k...c..w',
    'w...o....w',
    'w.......zw',
    'w.x...hX.w',
    'w.....H..w',
    'WWWWmWWWWW',
  ]), S.house);
  out(b, 4, W4.doors.warn.x, W4.doors.warn.y + 1);
  b.prop('w4_carving', 2, 0, 'none', { sortY: 2 });
  b.spot(2, 1, 'w4_carving').spot(3, 1, 'w4_carving');
  b.light(3 * 16, 2 * 16, 40, 0.2);
  return b.build();
}

/** The old storage building: shelves, sacks, and an inscription on the back wall. */
function storageRoom(): MapDef {
  const b = room('w4_storage', 'OLD STORAGE', R(14, [
    'WWWWWWWWWWWWWW',
    'wwwwww3wwwwwww',
    'w.eeee..xx?..w',
    'w.EEEE..X..x.w',
    'w............w',
    'w.?x.....eee.w',
    'w.......XEEE.w',
    'w..&&........w',
    'WWWWWWmWWWWWWW',
  ]), S.house);
  out(b, 6, W4.doors.storage.x, W4.doors.storage.y + 1);
  b.spot(6, 1, 'w4_storage_text').spot(7, 1, 'w4_storage_text');
  b.light(7 * 16, 3 * 16, 50, 0.2);
  return b.build();
}

/** The second house: a front room and a back room (the cat went round the back). */
function house2(): MapDef {
  const b = room('w4_house2', 'AN ABANDONED HOUSE', R(12, [
    'WWWWWWWWWWWW',
    'ww3wwwwwPwww',
    'w....w.....w',
    'w.hk.w..o..w',
    'w.H..w..c..w',
    'w....w.....w',
    'ww.www.....w',
    'w.......[].w',
    'w..i...p...w',
    'WWWWWmWWWWWW',
  ]), S.house);
  out(b, 5, W4.doors.house2.x, W4.doors.house2.y + 1);
  b.spot(2, 1, 'w4_house2_text').spot(3, 1, 'w4_house2_text');
  b.light(3 * 16, 3 * 16, 36, 0.2);
  return b.build();
}

/** Under the well: a forgotten storage room. */
function cellar(): MapDef {
  const b = room('w4_cellar', 'UNDERGROUND STOREROOM', R(12, [
    'WWWWWLWWWWWW',
    'wwwww.wwwwww',
    'w..xX..s..vw',
    'w.........xw',
    'w.?..___...w',
    'w.......9..w',
    'w.XX.......w',
    'w......x.?.w',
    'WWWWWWWWWWWW',
  ]), S.stone, { dark: 0.7, dstyle: 'well', amb: 'cave' });
  b.warp(5, 0, 'w4_isl', 63, 56, 'down', 'door');
  b.m.spawn = { x: 5, y: 2, dir: 'down' };
  b.prop('w4_gem', 8, 5, 'none', { id: 'gem1', show: nf('w4_gem1') });
  b.spot(8, 5, 'w4_gem1', nf('w4_gem1'), true);
  b.light(8 * 16 + 8, 5 * 16 + 8, 30, 0.3, nf('w4_gem1'));
  return b.build();
}

// ------------------------------------------------------------------ the airship, the crow's nest, the castle

function shipInside(): MapDef {
  const b = room('w4_ship', 'THE CRASHED AIRSHIP', R(30, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwOwwwOwwwwwwwww2wwwwwwwwOwwww',
    'w.h.c..h.ww1.1..2..1.w.......w',
    'w.H....H.w.....2...1.w.7..c..w',
    'w...x....w..1.....1..w.......w',
    'w.h...h..w.2...1.....w.......w',
    'w.H...H..ww...2..1..ww.......w',
    'w..............1.....w...X...w',
    'w.........m....2.............w',
    'WWWWWWWWWWmWWWWWWWWWWWWWWWWWWW',
  ]), S.ship, { dark: 0.68, amb: 'cave' });
  b.g(10, 8, T.W4_DECK);
  b.g(10, 9, T.MAT).g(11, 9, T.MAT);
  b.warp(10, 9, 'w4_isl', 72, 80, 'down', 'step');
  b.warp(11, 9, 'w4_isl', 73, 80, 'down', 'step');
  b.m.spawn = { x: 10, y: 8, dir: 'up' };
  // the passenger cabin (west): the keys, and something behind the broken wall
  b.prop('w4_gem', 4, 4, 'none', { id: 'keys_glint', show: nf('w4_keys') });
  b.spot(4, 4, 'w4_keys', nf('w4_keys'), true);
  b.spot(8, 2, 'w4_cabin_wall').spot(9, 2, 'w4_cabin_wall');
  b.trigger(1, 2, 8, 6, 'w4_cabin_dark', 'w4_cabin_scene');
  // the captain's room (east)
  b.prop('w4_chair', 26, 2, [{ x: 26, y: 3, w: 1, h: 1 }], { sortY: 4 });
  b.prop('w4_brokenwheel', 24.5, 1.5, 'none', { sortY: 3 });
  b.prop('w4_map', 22.5, 2.5, 'none', { sortY: 4 });
  b.spot(23, 4, 'w4_shipmap').spot(24, 3, 'w4_brokenwheel_s').spot(26, 4, 'w4_chair_s');
  b.prop('w4_gem', 27, 6, 'none', { id: 'gem2', show: nf('w4_gem2') });
  b.spot(27, 6, 'w4_gem2', nf('w4_gem2'), true);
  b.light(5 * 16, 4 * 16, 30, 0.3).light(25 * 16, 4 * 16, 50, 0.2);
  return b.build();
}

/** The crow's nest, high on the mast: a small round platform, nothing but sky. */
function nest(): MapDef {
  const b = room('w4_nest', "THE CROW'S NEST", R(12, [
    '            ',
    ' .......... ',
    ' .......... ',
    ' .......... ',
    ' .......... ',
    ' .......... ',
    ' ....L..... ',
    '            ',
  ]), S.ship, { dark: 0.3, amb: 'coast', dstyle: 'night', music: 'w4_tense' });
  b.m.outdoor = false;
  b.warp(5, 6, 'w4_isl', 78, 80, 'down', 'step');
  b.m.spawn = { x: 6, y: 6, dir: 'up' };
  b.prop('it_gas', 6, 1.5, 'none', { id: 'gas', show: nf('w4_gas') });
  b.spot(6, 2, 'w4_gas', nf('w4_gas'), true);
  b.trigger(1, 1, 10, 4, 'w4_crow_meet', undefined, (st) => !isSet(st, 'crow_beaten'));
  return b.build();
}

function castleInside(): MapDef {
  const b = room('w4_castle', 'THE CASTLE', R(24, [
    'WWWWWWWWWWWWWWWWWWWWWWWW',
    'wwNwwwPwwwwNNwwwwPwwwNww',
    'w....Z......,,......Z..w',
    'w...........,,.........w',
    'w..TtTt.....,,....ww.www',
    'w..cccc.....,,....w....w',
    'w...........,,....w..k.w',
    'w...........,,.......h.w',
    'wZ..........,,....w..H.w',
    'w...........,,....wwwwww',
    'w..o........,,.......{.w',
    'w..c........,,.......}.w',
    'wZ..........,,.......Z.w',
    'w...........,,.........w',
    'w...........,,.........w',
    'WWWWWWWWWWWmmWWWWWWWWWWW',
  ]), S.castle, { dark: 0.4 });
  b.warp(11, 15, 'w4_isl', 50, 76, 'down', 'step');
  b.warp(12, 15, 'w4_isl', 51, 76, 'down', 'step');
  b.m.spawn = { x: 11, y: 14, dir: 'up' };
  // Carlo's "car" in the hall
  b.prop('w4_toycar', 14, 5.5, [{ x: 15, y: 6, w: 1, h: 1 }], { id: 'toycar', show: nf('w4_wheel') });
  b.prop('w4_toycar_empty', 14, 5.5, [{ x: 15, y: 6, w: 1, h: 1 }], { show: f('w4_wheel') });
  b.npc({ id: 'carlo', sprite: 'carlo', x: 15, y: 5, dir: 'left', script: 'w4_carlo', show: (st) => !isSet(st, 'w4_carlo_joined') });
  for (const [x, y] of [[4, 2], [19, 2], [4, 12], [19, 12]]) b.light(x * 16, y * 16, 40, 0.3);
  return b.build();
}

// ------------------------------------------------------------------ the Woodlands Tower

const TOWER_NAMES = ['', 'ANCIENT ROOTS', "THE GUARDIAN'S CHAMPION", 'RESTORE THE TREES', 'THE FORGOTTEN GARDEN', 'THE BROKEN FLOOR', 'THE THREE SACRED STONES', 'THE TOP OF THE TOWER'];
const towerName = (n: number) => `TOWER ${n}F - ${TOWER_NAMES[n]}`;

/** Floor 1: three vines from the stump to three sockets; switches turn the broken sections. */
export const T1 = {
  stump: { x: 7, y: 5 },
  sockets: [
    { x: 2, y: 1 },
    { x: 14, y: 1 },
    { x: 16, y: 7 },
  ],
  /** each vine's path (tiles), the rotating piece's index in it, and its switch */
  vines: [
    { path: [[6, 6], [5, 6], [4, 6], [3, 6], [3, 5], [3, 4], [3, 3], [2, 3], [2, 2]], rot: 4, start: 1, sw: { x: 2, y: 9 } },
    { path: [[9, 5], [10, 5], [11, 5], [12, 5], [12, 4], [13, 4], [14, 4], [14, 3], [14, 2]], rot: 4, start: 2, sw: { x: 14, y: 6 } },
    { path: [[8, 6], [8, 7], [9, 7], [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7]], rot: 5, start: 1, sw: { x: 5, y: 9 } },
  ] as { path: [number, number][]; rot: number; start: number; sw: { x: number; y: number } }[],
  /** vine 3 has a side shoot at (10,8) that bleeds the sap away unless a block is pushed onto it */
  fork: { x: 10, y: 8 },
  block: { x: 13, y: 10 },
};
function tower1(): MapDef {
  const b = room('w4_t1', towerName(1), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwww',
    'w###...#....##..w',
    'w#.............#w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w#..............w',
    'w...............w',
    'w#.............#w',
    'w...............w',
    'w..........###..w',
    'WWWWWWWWUWWWWWWWW',
  ]), S.stone, { dark: 0.6, amb: 'cave' });
  b.warp(8, 12, 'w4_isl', W4.doors.tower.x, W4.doors.tower.y + 1, 'down', 'step');
  b.m.spawn = { x: 8, y: 11, dir: 'up' };
  b.prop('w4_stump', T1.stump.x - 1, T1.stump.y - 1.5, [{ x: 6, y: 4, w: 3, h: 2 }], { id: 'stump', show: nf('w4_t1_done') });
  b.prop('w4_stump_open', T1.stump.x - 1, T1.stump.y - 1.5 - 2.5, [{ x: 6, y: 4, w: 3, h: 2 }], { show: f('w4_t1_done'), sortY: T1.stump.y + 1 });
  b.warp(7, 5, 'w4_t2', 8, 10, 'up', 'door', 'w4_t1_stairs');
  T1.sockets.forEach((s, i) => b.prop('w4_socket', s.x, s.y - (s.y === 1 ? 0.5 : 0), 'none', { id: 'socket' + i, sortY: s.y + 1 }));
  T1.vines.forEach((v, i) => {
    b.prop('w4_switch0', v.sw.x, v.sw.y - 0.25, [{ x: v.sw.x, y: v.sw.y, w: 1, h: 1 }], { id: 'switch' + i, sortY: v.sw.y + 1 });
    b.spot(v.sw.x, v.sw.y, 'w4_t1_switch' + i);
  });
  b.light(8 * 16, 6 * 16, 70, 0.15);
  return b.build();
}

function tower2(): MapDef {
  const b = room('w4_t2', towerName(2), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'ww3wwwwwwwwwww3ww',
    'w#.............#w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w#.............#w',
    'w.......U.......w',
    'WWWWWWWWWWWWWWWWW',
  ]), S.stone, { dark: 0.55, amb: 'cave' });
  b.g(8, 11, T.STAIRS_DOWN);
  b.warp(8, 11, 'w4_t1', 7, 6, 'down', 'step', 'w4_t2_down');
  b.m.spawn = { x: 8, y: 10, dir: 'up' };
  b.g(8, 2, T.STAIRS_UP);
  b.warp(8, 2, 'w4_t3', 8, 11, 'up', 'step', 'w4_t2_up');
  b.trigger(2, 4, 13, 5, 'w4_champion_scene', undefined, (st) => !isSet(st, 'champion_beaten'));
  b.light(8 * 16, 6 * 16, 80, 0.15);
  return b.build();
}

/** Floor 3: four dead stumps, channels and the water wheel; the branches make a bridge. */
export const T3 = {
  stumps: [
    { x: 2, y: 3, need: 2 },
    { x: 5, y: 3, need: 4 },
    { x: 10, y: 3, need: 1 },
    { x: 13, y: 3, need: 3 },
  ],
  wheel: { x: 7, y: 8 },
  bridge: [[6, 5], [7, 5], [8, 5], [9, 5]] as [number, number][],
};
function tower3(): MapDef {
  const b = room('w4_t3', towerName(3), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwUwwwwwwww',
    'w.......#.......w',
    'w...............w',
    'w...............w',
    'w=====....======w',
    'w=====....======w',
    'w.::.::...::.::.w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'WWWWWWWWVWWWWWWWW',
  ]), S.stone, { dark: 0.55, amb: 'cave' });
  // the gap in the middle is the only way north, and it is empty until the trees grow
  for (const [x, y] of T3.bridge) b.g(x, y, T.W4_GAP).g(x, y + 1, T.W4_GAP);
  b.warp(8, 12, 'w4_t2', 8, 3, 'down', 'step');
  b.m.spawn = { x: 8, y: 11, dir: 'up' };
  b.warp(8, 1, 'w4_t4', 8, 11, 'up', 'door');
  T3.stumps.forEach((s, i) => {
    for (let st = 0; st < 3; st++)
      b.prop(`w4_wtree${s.need}_${st}`, s.x - 1, s.y - 3.5, [{ x: s.x, y: s.y, w: 1, h: 1 }], { id: `wtree${i}_${st}`, sortY: s.y + 1, show: (q) => {
          const c = (flag(q, 'w4_t3_s' + i) as number) ?? 0;
          return c >= s.need ? st === 2 : c > 0 ? st === 1 : st === 0;
        } });
  });
  b.prop('w4_waterwheel', T3.wheel.x - 0.5, T3.wheel.y - 1.5, [{ x: 7, y: 8, w: 2, h: 1 }], { sortY: 9 });
  b.spot(7, 9, 'w4_t3_wheel').spot(8, 9, 'w4_t3_wheel').spot(7, 8, 'w4_t3_wheel').spot(8, 8, 'w4_t3_wheel');
  b.light(8 * 16, 8 * 16, 60, 0.15).light(8 * 16, 3 * 16, 60, 0.15);
  return b.build();
}

function tower4(): MapDef {
  const b = room('w4_t4', towerName(4), R(19, [
    'WWWWWWWWWWWWWWWWWWW',
    'wwwOwwwwwUwwwwwOwww',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,...,,,,,,,w',
    'w,,,,,,,...,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'WWWWWWWWWVWWWWWWWWW',
  ]), { floor: T.W4_STONE, floor2: T.W4_GRASS, wall: T.W4_STONEWALL, wallLow: T.W4_STONEWALL_LOW }, { dark: 0.25, music: 'w4_garden', amb: 'island' });
  b.scatter(1, 2, 17, 10, T.W4_GRASS, [T.W4_FLOWERS], 0.3, 44);
  b.warp(9, 12, 'w4_t3', 8, 2, 'down', 'step');
  b.m.spawn = { x: 9, y: 11, dir: 'up' };
  b.warp(9, 1, 'w4_t5', 2, 3, 'up', 'door');
  b.prop('w4_fountain', 7.5, 3.5, [{ x: 8, y: 5, w: 3, h: 2 }], { sortY: 7 });
  b.spot(9, 7, 'w4_fountain').spot(8, 6, 'w4_fountain').spot(9, 6, 'w4_fountain').spot(10, 6, 'w4_fountain');
  for (const [k, x, y] of [[0, 2, 3], [1, 14, 3], [2, 3, 8], [0, 14, 8]] as const) b.prop(`w4_ltree${k}`, x, y, [{ x: x + 1, y: y + 3, w: 1, h: 1 }], { sortY: y + 4 });
  for (const [k, x, y] of [[0, 6, 9], [1, 12, 10], [0, 11, 3]] as const) b.prop(`w4_bush${k}`, x, y, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  const sleeper = (id: string, sprite: string, x: number, y: number, dir: 'left' | 'right' | 'down') => b.npc({ id, sprite, x, y, dir, script: 'w4_sleeper' });
  sleeper('g_deer', 'cow', 5, 6, 'right');
  sleeper('g_hen', 'chicken', 12, 7, 'left');
  sleeper('g_cat', 'cat', 13, 5, 'down');
  sleeper('g_piglet', 'piglet', 4, 10, 'right');
  for (const [x, y] of [[4, 4], [14, 4], [9, 6], [4, 9], [14, 10]]) b.light(x * 16, y * 16, 50, 0.2);
  return b.build();
}

/** Floor 5: the stairs have collapsed. A vine hangs over the gap. */
export const T5 = { vine: { x: 8, y: 6 }, far: { x: 11, y: 5 }, below: { x: 7, y: 10 } };
function tower5(): MapDef {
  const b = room('w4_t5', towerName(5), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwUww',
    'w.....====......w',
    'w.....====......w',
    'w.....====......w',
    'w.....====......w',
    'w.....====......w',
    'w.....====......w',
    'w===============w',
    'w...........11..w',
    'w...............w',
    'w.L.............w',
    'WWWWWWWWWWWWWWWWW',
  ]), S.stone, { dark: 0.55, amb: 'cave' });
  // the lower platform you drop onto, and the ladder back up to the near ledge
  b.warp(2, 11, 'w4_t5', 2, 7, 'up', 'step');
  // the stairs back down to the garden, on the near ledge
  b.g(1, 2, T.STAIRS_DOWN);
  b.warp(1, 2, 'w4_t4', 9, 2, 'down', 'step');
  b.m.spawn = { x: 2, y: 2, dir: 'right' };
  b.warp(14, 1, 'w4_t6', 8, 11, 'up', 'door');
  b.prop('w4_hangvine', T5.vine.x - 0.5, 1, 'none', { id: 'vine', over: true });
  for (let y = 2; y <= 7; y++) b.spot(6, y, 'w4_swing').spot(9, y, 'w4_swing');
  b.light(8 * 16, 5 * 16, 70, 0.15);
  return b.build();
}

/** Floor 6: three gemstone blocks, three plates. */
export const T6 = {
  stones: [
    { x: 4, y: 8 },
    { x: 8, y: 5 },
    { x: 12, y: 8 },
  ],
  plates: [
    { x: 3, y: 3 },
    { x: 8, y: 2 },
    { x: 13, y: 3 },
  ],
};
function tower6(): MapDef {
  const b = room('w4_t6', towerName(6), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwww',
    'w.......x.......w',
    'w..............Uw',
    'w.....x...x.....w',
    'w...............w',
    'w..x.........x..w',
    'w......x.x......w',
    'w...............w',
    'w..x....#....x..w',
    'w...............w',
    'w...............w',
    'WWWWWWWWVWWWWWWWW',
  ]), S.stone, { dark: 0.55, amb: 'cave' });
  b.g(8, 2, T.W4_STONE).d(8, 2, D.NONE);
  b.warp(8, 12, 'w4_t5', 13, 2, 'down', 'step');
  b.m.spawn = { x: 8, y: 11, dir: 'up' };
  b.warp(15, 3, 'w4_t7', 3, 9, 'up', 'door', 'w4_t6_stairs');
  T6.plates.forEach((p, i) => b.prop(`w4_plate${i}`, p.x, p.y, 'none', { sortY: p.y }));
  b.light(8 * 16, 6 * 16, 80, 0.15);
  return b.build();
}

function tower7(): MapDef {
  const b = room('w4_t7', towerName(7), R(15, [
    'WWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwww',
    'w.p..p........w',
    'w........[]...w',
    'w.............w',
    'w..o.c........w',
    'w.............w',
    'w..........hk.w',
    'w.p........H..w',
    'w.............w',
    'WWWVWWWWWWWWWWW',
  ]), S.house, { dark: 0.2, music: 'w4_oldman' });
  b.warp(3, 10, 'w4_t6', 14, 3, 'down', 'step');
  b.m.spawn = { x: 3, y: 9, dir: 'up' };
  b.prop('w4_window', 6.5, -0.2, 'none', { sortY: 2 });
  b.prop('w4_bowl', 10, 5, 'none', { id: 'bowl', sortY: 6 });
  b.spot(10, 5, 'w4_bowl', undefined, true);
  b.spot(7, 1, 'w4_oldwindow').spot(6, 1, 'w4_oldwindow');
  b.npc({ id: 'oldman', sprite: 'oldman4', x: 8, y: 2, dir: 'up', script: 'w4_oldman', show: (st) => !isSet(st, 'w4_old_follow') });
  b.light(8 * 16, 1 * 16, 80, 0.1).light(4 * 16, 6 * 16, 40, 0.2);
  return b.build();
}

// ------------------------------------------------------------------ the giant tree (floors 7 to 1, going down)

const TREE_NAMES = ['', 'THE FLUTE', 'THE COLLAPSING FLOOR', "CARLO'S MUSHROOM MELODY", 'THE BOTANICAL CHAMBER', 'THE TREEHOUSE', 'THE ANCIENT TREE GUARDIAN', 'THE REUNION'];
const treeName = (n: number) => `GIANT TREE ${n}F - ${TREE_NAMES[n]}`;

function tree7(): MapDef {
  const b = room('w4_g7', treeName(7), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwww',
    'w....#######....w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'wwwwwwwwVwwwwwwww',
  ]), S.tree, { dark: 0.45, music: 'w4_tree', amb: 'cave' });
  b.warp(8, 10, 'w4_g6', 8, 2, 'down', 'step', 'w4_g7_down');
  b.m.spawn = { x: 8, y: 7, dir: 'down' };
  b.prop('w4_ship', 4.5, 1.4, [{ x: 5, y: 3, w: 7, h: 3 }], { id: 'treeship', sortY: 6 });
  b.light(8 * 16, 3 * 16, 90, 0.1);
  return b.build();
}
function tree6(): MapDef {
  const b = room('w4_g6', treeName(6), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwUwwwwwwww',
    'w#.............#w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w#.............#w',
    'wwwwwwwwVwwwwwwww',
  ]), S.tree, { dark: 0.45, music: 'w4_tree', amb: 'cave' });
  b.warp(8, 1, 'w4_g7', 8, 9, 'up', 'door');
  b.m.spawn = { x: 8, y: 2, dir: 'down' };
  b.warp(8, 10, 'w4_g5', 8, 2, 'down', 'step', 'w4_g6_down');
  b.trigger(2, 4, 13, 3, 'w4_squirrel_scene', undefined, (st) => !isSet(st, 'squirrel_beaten'));
  b.light(8 * 16, 5 * 16, 90, 0.1);
  return b.build();
}
function tree5(): MapDef {
  const b = room('w4_g5', treeName(5), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'ww4wwww4wUw4wwwww',
    'w.......#.......w',
    'w.h..x......o...w',
    'w.H.........c...w',
    'w...............w',
    'w.[]......X.....w',
    'w...............w',
    'w.k.....x...x...w',
    'w...............w',
    'wwwwwwwwVwwwwwwww',
  ]), S.tree, { dark: 0.4, music: 'w4_tree', amb: 'cave' });
  b.warp(9, 1, 'w4_g6', 8, 9, 'up', 'door');
  b.m.spawn = { x: 9, y: 2, dir: 'down' };
  b.warp(8, 10, 'w4_g4', 8, 2, 'down', 'step');
  b.prop('w4_drawing0', 7, 0.6, 'none', { sortY: 2 });
  b.prop('w4_drawing1', 2, 0.6, 'none', { sortY: 2 });
  b.prop('w4_drawing2', 11, 0.6, 'none', { sortY: 2 });
  b.spot(7, 1, 'w4_drawing').spot(2, 1, 'w4_drawing_other').spot(11, 1, 'w4_drawing_other');
  b.prop('w4_scope', 13.5, 5.5, [{ x: 14, y: 7, w: 1, h: 1 }], { sortY: 8 });
  b.spot(14, 7, 'w4_scope_s');
  b.spot(5, 3, 'w4_toys').spot(8, 8, 'w4_toys').spot(12, 8, 'w4_toys');
  b.light(8 * 16, 4 * 16, 80, 0.1);
  return b.build();
}
function tree4(): MapDef {
  const b = room('w4_g4', treeName(4), R(19, [
    'WWWWWWWWWWWWWWWWWWW',
    'wwwwwwwwwUwwwwwwwww',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,9,,,,,.,,,,,9,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,...,,,,,,,w',
    'w,,,,9,,...,,9,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,,,,,,,,.,,,,,,,,w',
    'w,9,,,,,,.,,,,,,9,w',
    'wwwwwwwwwVwwwwwwwww',
  ]), { floor: T.W4_PLANK, floor2: T.W4_FOREST, wall: T.W4_BARK, wallLow: T.W4_BARK_LOW }, { dark: 0.3, music: 'w4_garden', amb: 'island' });
  b.scatter(1, 2, 17, 8, T.W4_FOREST, [T.W4_FLOWERS, T.W4_FOREST2], 0.3, 45);
  b.warp(9, 1, 'w4_g5', 8, 9, 'up', 'door');
  b.m.spawn = { x: 9, y: 2, dir: 'down' };
  b.warp(9, 10, 'w4_g3', 3, 2, 'down', 'step');
  for (const [k, x, y] of [[0, 2, 2], [1, 13, 2], [2, 3, 6], [1, 14, 6]] as const) b.prop(`w4_ltree${k}`, x, y, [{ x: x + 1, y: y + 3, w: 1, h: 1 }], { sortY: y + 4 });
  for (const [k, x, y] of [[0, 6, 4], [1, 11, 8], [0, 12, 4]] as const) b.prop(`w4_bush${k}`, x, y, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  b.spot(9, 5, 'w4_botany').spot(9, 6, 'w4_botany');
  for (const [x, y] of [[3, 3], [15, 3], [5, 6], [13, 6], [2, 9], [16, 9]]) b.light(x * 16 + 8, y * 16 + 8, 36, 0.3);
  return b.build();
}
/** Floor 3: four mushrooms that sing; the giant mushroom grows into a platform across the gap. */
export const G3 = {
  mush: [
    { x: 3, y: 4 },
    { x: 6, y: 7 },
    { x: 10, y: 4 },
    { x: 13, y: 7 },
  ],
  big: { x: 8, y: 9 },
  gap: [[7, 10], [8, 10], [9, 10]] as [number, number][],
};
function tree3(): MapDef {
  const b = room('w4_g3', treeName(3), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwww',
    'w.U.............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w======...======w',
    'w...............w',
    'wwwwwwwwVwwwwwwww',
  ]), S.tree, { dark: 0.55, music: 'w4_tree', amb: 'cave' });
  for (const [x, y] of G3.gap) b.g(x, y, T.W4_GAP);
  b.warp(2, 2, 'w4_g4', 9, 9, 'up', 'step');
  b.m.spawn = { x: 3, y: 2, dir: 'down' };
  b.warp(8, 12, 'w4_g2', 3, 2, 'down', 'step');
  G3.mush.forEach((p, i) => {
    b.prop(`w4_mush${i}_0`, p.x - 0.75, p.y - 1, [{ x: p.x, y: p.y, w: 1, h: 1 }], { id: 'mush' + i, sortY: p.y + 1 });
    b.spot(p.x, p.y, 'w4_mush');
  });
  b.prop('w4_bigmush', G3.big.x - 1.5, G3.big.y - 1.5, 'none', { id: 'bigmush', sortY: G3.big.y + 1.5, show: nf('w4_g3_done') });
  b.prop('w4_bigmush_grown', G3.big.x - 1.5, G3.big.y - 1, 'none', { sortY: G3.big.y + 2, show: f('w4_g3_done') });
  b.light(8 * 16, 6 * 16, 70, 0.2);
  return b.build();
}
/** Floor 2: a gap to jump, then a floor that gives way behind you. */
export const G2 = { jump: { from: { x: 4, y: 4 }, to: { x: 4, y: 6 } }, run: { y0: 7, y1: 9, x0: 2, x1: 15 }, goal: { x: 15, y: 10 } };
function tree2(): MapDef {
  const b = room('w4_g2', treeName(2), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwww',
    'w.U.....#.......w',
    'w...............w',
    'w...............w',
    'w===============w',
    'w...............w',
    'w//////////////.w',
    'w//////////////.w',
    'w//////////////.w',
    'w...............w',
    'wwwwwwwwwwwwwwwVw',
  ]), S.tree, { dark: 0.5, music: 'w4_tree', amb: 'cave' });
  for (let x = 1; x <= 15; x++) b.g(x, 5, T.W4_GAP);
  b.warp(2, 2, 'w4_g3', 8, 11, 'up', 'step');
  b.m.spawn = { x: 3, y: 2, dir: 'down' };
  b.warp(15, 11, 'w4_g1', 8, 2, 'down', 'step');
  for (let x = 1; x <= 15; x++) b.spot(x, 5, 'w4_jump');
  b.trigger(1, 6, 15, 2, 'w4_collapse', undefined, nf('w4_g2_done'));
  b.light(8 * 16, 4 * 16, 70, 0.2).light(8 * 16, 9 * 16, 70, 0.2);
  return b.build();
}
function tree1(): MapDef {
  const b = room('w4_g1', treeName(1), R(17, [
    'WWWWWWWWWWWWWWWWW',
    'wwwwwwwwUwwwwwwww',
    'w#.............#w',
    'w...............w',
    'w..9.........9..w',
    'w...............w',
    'w...............w',
    'w...............w',
    'w#......#......#w',
    'w...............w',
    'WWWWWWWmmWWWWWWWW',
  ]), S.tree, { dark: 0.45, music: 'w4_tree', amb: 'cave' });
  b.warp(8, 1, 'w4_g2', 15, 10, 'up', 'door');
  b.m.spawn = { x: 8, y: 2, dir: 'down' };
  b.warp(7, 10, 'w4_isl', W4.doors.root.x, W4.doors.root.y + 1, 'down', 'step', 'w4_g1_out');
  b.warp(8, 10, 'w4_isl', W4.doors.root.x + 1, W4.doors.root.y + 1, 'down', 'step', 'w4_g1_out');
  b.trigger(2, 5, 13, 2, 'w4_flute_scene', 'w4_flute_done');
  b.light(8 * 16, 5 * 16, 90, 0.15);
  return b.build();
}

// ------------------------------------------------------------------ the spirit research facility

function lab(id: string, name: string, rows: string[], dark = 0.5) {
  const b = fromAscii(id, name, rows, S.lab, LX);
  b.m.world = 4;
  b.m.music = 'w4_lab';
  b.m.amb = 'indoor';
  b.m.dark = dark;
  b.m.darkStyle = 'candle';
  return b;
}
/** A door set into a wall, leading to (to, tx, ty). */
function labDoor(b: MapBuilder, x: number, y: number, to: string, tx: number, ty: number, dir: 'up' | 'down' | 'left' | 'right', gate?: string) {
  b.g(x, y, T.DOORI);
  b.warp(x, y, to, tx, ty, dir, 'door', gate);
}

/** Reception: the front desk, the waiting chairs, the breakers that bring the power back. */
function labReception(): MapDef {
  const b = lab('w4_lab1', 'RECEPTION', R(16, [
    'WWWWWWWWWWWWWWWW',
    'wwPw6ww^wwwwwwww',
    'w..............w',
    'w.c.c....;...p.w',
    'w....111.......w',
    'w..........>...w',
    'w.9............w',
    'w...c.c...8....w',
    'w.p.........>..w',
    'w..............w',
    'WWWWWWWWmWWWWWWW',
  ]), 0.72);
  b.warp(8, 10, 'w4_isl', LAB.door.x, LAB.door.y + 1, 'down', 'step');
  b.m.spawn = { x: 8, y: 9, dir: 'up' };
  labDoor(b, 8, 1, 'w4_lab2', 9, 10, 'up', 'w4_lab_n');
  LAB.breakers.forEach((x, i) => {
    b.prop('w4_brk1', x, 0.75, 'none', { show: (st) => brkOn(st, i), sortY: 2 });
    b.prop('w4_brk0', x, 0.75, 'none', { show: (st) => !brkOn(st, i), sortY: 2 });
    b.spot(x, 1, 'w4_lab_brk' + i);
  });
  b.spot(2, 1, 'w4_lab_photo').spot(4, 1, 'w4_lab_sign').spot(7, 1, 'w4_lab_board');
  b.spot(5, 4, 'w4_lab_desk').spot(6, 4, 'w4_lab_desk').spot(7, 4, 'w4_lab_desk');
  b.spot(9, 3, 'w4_lab_locker1');
  b.light(px16(11.5), 2 * 16, 40, 0.5);
  b.light(px16(8), 6 * 16, 70, 0.1);
  return b.build();
}

/** The research laboratory: benches, a resonance scanner, the tuner that works the shutter. */
function labLab(): MapDef {
  const b = lab('w4_lab2', 'RESEARCH LABORATORY', R(18, [
    'WWWWWWWWWWWWWWWWWW',
    'ww:wwwwwwwwwwwww7w',
    'w................w',
    'w................w',
    'w......<<<.......w',
    'w................w',
    'w..9.......<<<...w',
    'w............>...w',
    'w.;....0.........w',
    'w..>..........3..w',
    'w................w',
    'WWWWWWWWWWWWWWWWWW',
  ]));
  labDoor(b, 9, 11, 'w4_lab1', 8, 2, 'down');
  b.m.spawn = { x: 9, y: 10, dir: 'up' };
  labDoor(b, 4, 1, 'w4_lab3', 8, 10, 'up', 'w4_lab_shutter');
  labDoor(b, 9, 1, 'w4_lab5', 10, 12, 'up', 'w4_lab_dkey');
  labDoor(b, 14, 1, 'w4_lab4', 7, 8, 'up', 'w4_lab_card');
  b.prop('w4_shutter', 4, 1, 'none', { show: nf('w4_lab_tuned'), sortY: 2 });
  b.prop('w4_tuner', 1, 4, [{ x: 1, y: 4, w: 2, h: 2 }], { sortY: 6 });
  b.spot(1, 5, 'w4_lab_tuner').spot(2, 5, 'w4_lab_tuner').spot(2, 4, 'w4_lab_tuner');
  b.prop('w4_scanner', 15, 4, [{ x: 15, y: 4, w: 2, h: 2 }], { sortY: 6 });
  b.spot(15, 5, 'w4_lab_scanner').spot(16, 5, 'w4_lab_scanner').spot(15, 4, 'w4_lab_scanner');
  b.spot(2, 1, 'w4_lab_graph');
  b.spot(8, 4, 'w4_lab_scope').spot(7, 4, 'w4_lab_bench').spot(9, 4, 'w4_lab_bench');
  b.spot(12, 6, 'w4_lab_jars').spot(11, 6, 'w4_lab_bench').spot(13, 6, 'w4_lab_bench');
  b.spot(2, 8, 'w4_lab_locker2').spot(14, 9, 'w4_lab_files');
  b.light(px16(2), 5 * 16, 40, 0.3).light(px16(16), 5 * 16, 40, 0.3).light(px16(9), 7 * 16, 70, 0.1);
  return b.build();
}

/** Containment: the tanks, some broken, some not empty; the spirit cell and its pad. */
function labContain(): MapDef {
  const b = lab('w4_lab3', 'CONTAINMENT', R(16, [
    'WWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwww',
    'w..............w',
    'w..............w',
    'w..0...........w',
    'w...888.8......w',
    'w...8.....9....w',
    'w...888.8......w',
    'w..............w',
    'w.....0........w',
    'w..>...........w',
    'WWWWWWWWWWWWWWWW',
  ]));
  labDoor(b, 8, 11, 'w4_lab2', 4, 2, 'down');
  b.m.spawn = { x: 8, y: 10, dir: 'up' };
  LAB.tanks.forEach(([x, y, n, kind]) => {
    const solid = [{ x, y: y + 1, w: 2, h: 2 }];
    if (n === 6) {
      b.prop('w4_tank4', x, y, solid, { show: nf('w4_lab_cell'), sortY: y + 3 });
      b.prop('w4_tank5', x, y, solid, { show: f('w4_lab_cell'), sortY: y + 3 });
    } else b.prop('w4_tank' + kind, x, y, solid, { sortY: y + 3 });
    b.spot(x, y + 2, 'w4_lab_tank' + n).spot(x + 1, y + 2, 'w4_lab_tank' + n);
  });
  b.prop('w4_pad0', LAB.pad.x, LAB.pad.y, 'none', { show: nf('w4_lab_cell'), sortY: 0 });
  b.prop('w4_pad1', LAB.pad.x, LAB.pad.y, 'none', { show: f('w4_lab_cell'), sortY: 0 });
  b.light(px16(LAB.pad.x), LAB.pad.y * 16 + 8, 30, 0.2, f('w4_lab_cell'));
  b.light(px16(14), 3 * 16, 30, 0.6);
  b.light(px16(8), 8 * 16, 70, 0.1);
  return b.build();
}

/** The research office: the director's desk, the patron's letters, the safe. */
function labOffice(): MapDef {
  const b = lab('w4_lab4', 'RESEARCH OFFICE', R(14, [
    'WWWWWWWWWWWWWW',
    'www^wPwwwwwwww',
    'w.3....c...e.w',
    'w.3...111..E.w',
    'w............w',
    'w.>......9...w',
    'w.;.......>..w',
    'w............w',
    'w............w',
    'WWWWWWWWWWWWWW',
  ]));
  labDoor(b, 7, 9, 'w4_lab2', 14, 2, 'down');
  b.m.spawn = { x: 7, y: 8, dir: 'up' };
  b.prop('w4_safe0', 10, 1, 'none', { show: nf('w4_lab_key'), sortY: 2 });
  b.prop('w4_safe1', 10, 1, 'none', { show: f('w4_lab_key'), sortY: 2 });
  b.spot(10, 1, 'w4_lab_safe').spot(3, 1, 'w4_lab_letters').spot(5, 1, 'w4_lab_sketch');
  b.spot(6, 3, 'w4_lab_diary').spot(7, 3, 'w4_lab_diary').spot(8, 3, 'w4_lab_diary');
  b.spot(2, 2, 'w4_lab_cabinet').spot(2, 3, 'w4_lab_cabinet');
  b.spot(11, 2, 'w4_lab_shelf').spot(11, 3, 'w4_lab_shelf').spot(2, 6, 'w4_lab_locker3');
  b.light(px16(7), 3 * 16, 50, 0.3);
  return b.build();
}

/** The experiment chamber: the biggest room, the great tank, the main lever. */
function labChamber(): MapDef {
  const b = lab('w4_lab5', 'EXPERIMENT CHAMBER', R(20, [
    'WWWWWWWWWWWWWWWWWWWW',
    'ww7www7wwwwww7www7ww',
    'w..................w',
    'w.2..............2.w',
    'w.2..............2.w',
    'w..9............9..w',
    'w...9..........9...w',
    'w..................w',
    'w..................w',
    'w.<..............3.w',
    'w.<..............3.w',
    'w.....>.......0....w',
    'w..................w',
    'WWWWWWWWWWWWWWWWWWWW',
  ]), 0.6);
  labDoor(b, 10, 13, 'w4_lab2', 9, 2, 'down');
  b.m.spawn = { x: 10, y: 12, dir: 'up' };
  labDoor(b, 16, 1, 'w4_lab6', 8, 10, 'up', 'w4_lab_vault');
  const t = LAB.tank;
  b.prop('w4_bigtank', t.x, t.y, [{ x: t.x, y: t.y + 3, w: 4, h: 3 }], { id: 'bigtank', show: nf('w4_lab_broke'), sortY: t.y + 6 });
  b.prop('w4_bigtank_burst', t.x, t.y, [{ x: t.x, y: t.y + 3, w: 4, h: 3 }], { show: f('w4_lab_broke'), sortY: t.y + 6 });
  for (let x = t.x; x < t.x + 4; x++) b.spot(x, t.y + 5, 'w4_lab_bigtank');
  const c = LAB.console;
  b.prop('w4_console0', c.x, c.y, [{ x: 9, y: 8, w: 3, h: 1 }], { show: nf('w4_lab_lever'), sortY: 9 });
  b.prop('w4_console1', c.x, c.y, [{ x: 9, y: 8, w: 3, h: 1 }], { show: f('w4_lab_lever'), sortY: 9 });
  for (const x of [9, 10, 11]) b.spot(x, 8, 'w4_lab_console');
  b.spot(2, 3, 'w4_lab_mon').spot(2, 4, 'w4_lab_mon').spot(17, 3, 'w4_lab_mon').spot(17, 4, 'w4_lab_mon');
  b.spot(2, 9, 'w4_lab_bench').spot(2, 10, 'w4_lab_bench').spot(17, 9, 'w4_lab_files').spot(17, 10, 'w4_lab_files');
  b.light(px16(10), 4 * 16, 60, 0.4).light(px16(2.5), 4 * 16, 30, 0.3).light(px16(17.5), 4 * 16, 30, 0.3);
  return b.build();
}

/** The vault: something enormous was kept here. It is not here now. */
function labVault(): MapDef {
  const b = lab('w4_lab6', 'THE VAULT', R(16, [
    'WWWWWWWWWWWWWWWW',
    'ww5ww5wwwww5wwww',
    'w.............4w',
    'w.0...........0w',
    'w.4..........4.w',
    'w..............w',
    'w0............0w',
    'w..//.....//...w',
    'w.4....0....4..w',
    'w....//........w',
    'w......4.......w',
    'WWWWWWWWWWWWWWWW',
  ]), 0.62);
  labDoor(b, 8, 11, 'w4_lab5', 16, 2, 'down');
  b.m.spawn = { x: 8, y: 10, dir: 'up' };
  b.prop('w4_vault', 4.5, 1, [{ x: 5, y: 5, w: 6, h: 3 }], { sortY: 8 });
  for (let x = 5; x <= 10; x++) b.spot(x, 7, 'w4_lab_vtank');
  b.spot(5, 5, 'w4_lab_vtank').spot(10, 5, 'w4_lab_vtank');
  b.spot(2, 1, 'w4_lab_vclaw').spot(5, 1, 'w4_lab_vclaw').spot(11, 1, 'w4_lab_vclaw');
  // the way it went: a hole torn through the far wall
  b.prop('w4_tunnel', 12, 0, 'none', { sortY: 2 });
  b.spot(13, 1, 'w4_lab_tunnel');
  b.light(px16(13), 2 * 16, 40, 0.2).light(px16(8), 9 * 16, 50, 0.3);
  return b.build();
}

// ------------------------------------------------------------------ the end of the chapter

/** An empty black set for the sky cinematics (everything in it is drawn by the scripts). */
function sky(): MapDef {
  const b = new MapBuilder('w4_sky', 'THE SKY', 40, 30, T.VOID);
  b.m.world = 4;
  b.m.music = 'none';
  b.m.amb = 'indoor';
  b.m.dark = 0;
  b.m.spawn = { x: 20, y: 15, dir: 'down' };
  b.g(20, 15, T.W4_CELLFLOOR);
  return b.build();
}

function chamber(): MapDef {
  const b = room('w4_chamber', 'A STONE CHAMBER', R(19, [
    'WWWWWWWWWWWWWWWWWWW',
    'wwwww3wwwwwww3wwwww',
    'w#...............#w',
    'w..8..........8...w',
    'w.................w',
    'w.................w',
    'w.................w',
    'w.................w',
    'w..8..........8...w',
    'w#...............#w',
    'WWWWWWWWWWWWWWWWWWW',
  ]), S.volc, { dark: 0.55, music: 'none', amb: 'cave' });
  b.m.spawn = { x: 9, y: 7, dir: 'up' };
  for (const [x, y] of [[3, 3], [15, 3], [3, 8], [15, 8]]) b.light(x * 16 + 8, y * 16, 40, 0.4);
  return b.build();
}

/** The cells under the volcano: yours on the left, the rest of the block beyond the bars. */
function prison(): MapDef {
  const b = room('w4_cell', 'A PRISON CELL', R(40, [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'w,,,,,,w...........w,,,,,w,,,,,w,,,,,,,w',
    'w,,,,,,w..5..6..5..w,,,,,w,,,,,w,,,,,,,w',
    'w,,,,,,w...........w,,,,,w,,,,,w,,,,,,,w',
    'w,,,,,,w...........w,,,,,w,,,,,w,,,,,,,w',
    'w,,,,,,w..6..5..6..wwwwwwwwwwwwwwwwwwwww',
    'w,,,,,,w...............................w',
    'w,,,,,,w...............................w',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
  ]), S.volc, { dark: 0.5, music: 'none', amb: 'cave' });
  // the bars of your cell (solid, but you can see through)
  for (let y = 2; y < 9; y++) b.g(7, y, T.W4_VOLCWALL_LOW);
  for (const [x, y, k] of [[2, 1, 0], [5, 1, 1], [12, 1, 2], [22, 1, 0], [35, 1, 1]] as const) b.prop(`w4_lava${k}`, x, y, 'none', { sortY: 2 });
  b.m.spawn = { x: 3, y: 5, dir: 'down' };
  for (const [x, y] of [[2, 1], [5, 1], [12, 1], [22, 1], [35, 1]]) b.light(x * 16 + 8, y * 16 + 8, 30, 0.5);
  b.light(13 * 16, 5 * 16, 50, 0.3).light(28 * 16, 7 * 16, 50, 0.3);
  return b.build();
}

export function buildW4(): MapDef[] {
  return [
    island(),
    warnHouse(),
    storageRoom(),
    house2(),
    cellar(),
    shipInside(),
    nest(),
    castleInside(),
    tower1(),
    tower2(),
    tower3(),
    tower4(),
    tower5(),
    tower6(),
    tower7(),
    tree7(),
    tree6(),
    tree5(),
    tree4(),
    tree3(),
    tree2(),
    tree1(),
    labReception(),
    labLab(),
    labContain(),
    labOffice(),
    labChamber(),
    labVault(),
    sky(),
    chamber(),
    prison(),
  ];
}
