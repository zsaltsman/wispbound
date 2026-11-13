import { fromAscii, STYLES } from '../ascii';
import { type MapDef } from '../mapdef';
import { T, D } from '../tiles';
import { isSet } from '../../story/state';
import type { StoryState } from '../../story/state';

// Two small businesses: MAD PIES (Hollowhaven) and LUKE & GRACE'S THRIFT (Saltwash).

function R(width: number, rows: string[]) {
  rows.forEach((r) => {
    if (r.length !== width) throw new Error(`row width ${r.length} != ${width}: "${r}"`);
  });
  return rows;
}

/** Door on the town map (interior exits land on the tile below it). */
export const MADPIES_DOOR = { x: 79, y: 17 };
export const THRIFT_DOOR = { x: 55, y: 65 };

/** Where the pies are on the counter (Roxie's favourite tile is the one in front). */
export const PIE_CASE = { x: 8, y: 4 };

function madPies(): MapDef {
  const rows = R(13, [
    ' WWWWWWWWWWW ',
    ' wOwQw@wPwOw ',
    ' SK......fbb ',
    ' ........FBB ',
    ' CCCCC..CCCC ',
    ' ........... ',
    ' .o.c...o.c. ',
    ' .c.....c... ',
    ' p.......g.p ',
    '      m      ',
  ]);
  const b = fromAscii('madpies', 'MAD PIES', rows, STYLES.house);
  b.warp(6, 9, 'town', MADPIES_DOOR.x, MADPIES_DOOR.y + 1, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'tavern';
  b.m.dark = 0.12;
  b.m.darkStyle = 'candle';
  // the glass case of scowling pies, and pies cooling along the counter
  b.prop('p_piecase', PIE_CASE.x, 2, 'none', { sortY: 5 });
  for (const [x, f] of [
    [1, 0],
    [2, 3],
    [4, 5],
  ])
    b.prop(`p_pie${f}`, x + 0.06, 3.7, 'none', { sortY: 5 });
  b.prop('p_pie4', 2.06, 5.6, 'none', { sortY: 7 }); // on a table
  b.prop('p_pie2', 8.06, 5.6, 'none', { sortY: 7 });
  for (let x = PIE_CASE.x; x < PIE_CASE.x + 3; x++) b.spot(x, 4, 'pies_case');
  for (const x of [1, 2, 3, 4, 5]) b.spot(x, 4, 'pies_counter');
  b.spot(1, 2, 'pies_oven').spot(2, 2, 'pies_oven').spot(3, 1, 'pies_menu').spot(10, 3, 'pies_shelf').spot(11, 3, 'pies_shelf').spot(9, 2, 'pies_fridge').spot(9, 3, 'pies_fridge');
  b.spot(9, 8, 'roxie_bed');
  b.light(6 * 16, 3 * 16, 50, 0.1).light(9 * 16, 4 * 16, 30, 0.2);
  const after = (st: StoryState) => isSet(st, 'ending_done');
  for (const n of [
    { id: 'maddie', sprite: 'maddie', x: 6, y: 3, dir: 'down' as const },
    { id: 'morgan', sprite: 'morgan', x: 1, y: 5, dir: 'right' as const },
    { id: 'roxie', sprite: 'roxie', x: 9, y: 7, dir: 'left' as const },
    { id: 'mayor_visit', sprite: 'mayor', x: 4, y: 7, dir: 'right' as const, show: after },
  ])
    b.npc({ ...n, wander: 0, script: n.id });
  return b.build();
}

/** Everything in here is for sale. Nothing in here should be. */
export const JUNK_AT: Record<string, [number, number]> = {
  chair: [2, 5],
  clock: [4, 4],
  lamp: [10, 5],
  tv: [8, 5],
  jacket: [11, 7],
  box: [6, 7],
  toaster: [3, 7],
};

function thrift(): MapDef {
  const rows = R(13, [
    ' WWWWWWWWWWW ',
    ' wQw~wPw~wQw ',
    ' xx.......xz ',
    ' X...CCC$..x ',
    ' ........... ',
    ' ........... ',
    ' ........... ',
    ' z.......... ',
    ' x..[].....X ',
    '      m      ',
  ]);
  const b = fromAscii('w2_thrift', "LUKE & GRACE'S THRIFT", rows, STYLES.flooded);
  b.m.world = 2;
  b.warp(6, 9, 'isl', THRIFT_DOOR.x, THRIFT_DOOR.y + 1, 'down', 'step');
  b.m.spawn = { x: 6, y: 8, dir: 'up' };
  b.m.music = 'w2house';
  b.m.dark = 0.15;
  b.m.darkStyle = 'candle';
  b.rect(1, 4, 11, 4, T.WOOD, 'g'); // the floor that survived
  b.d(5, 6, D.PUDDLE_D);
  for (const [k, [x, y]] of Object.entries(JUNK_AT)) {
    b.prop(`p_junk_${k}`, x, y - 0.5, [{ x, y, w: 1, h: 1 }], { sortY: y + 1, show: (st) => !isSet(st, 'w2_bought_' + k) });
    b.spot(x, y, 'junk_' + k);
  }
  // racks of clothes nobody has ever bought
  for (const x of [1, 2, 3]) b.prop('p_junk_rack', x, 1.5, 'none', { sortY: 3 });
  b.spot(2, 2, 'thrift_racks').spot(3, 2, 'thrift_racks').spot(1, 2, 'thrift_racks');
  b.spot(7, 3, 'thrift_counter').spot(8, 3, 'thrift_register');
  b.light(6 * 16, 3 * 16, 44, 0.3);
  for (const n of [
    { id: 'grace', sprite: 'grace', x: 6, y: 2, dir: 'down' as const },
    { id: 'luke', sprite: 'luke', x: 8, y: 6, dir: 'left' as const },
    { id: 'thrift_shopper', sprite: 'grandpa2', x: 4, y: 5, dir: 'up' as const, show: (st: StoryState) => !isSet(st, 'w2_evac_done') },
  ])
    b.npc({ ...n, wander: 0, script: n.id });
  return b.build();
}

export function buildShops(): MapDef[] {
  return [madPies(), thrift()];
}
