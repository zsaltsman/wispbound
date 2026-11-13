import { MapBuilder, type MapDef } from '../mapdef';
import { T, D } from '../tiles';
import { isSet, has } from '../../story/state';
import type { StoryState } from '../../story/state';
import { COASTER_AREA } from '../coaster';
import { PARK_GATE } from './island';

// THRILL HARBOR: a once-glorious amusement park trying, against all odds and
// several building codes, to reopen. The coaster takes up the west, the Ferris
// wheel the north, the slingshot the north-east.

export const PARK_W = 60;
export const PARK_H = 48;

/** Ferris wheel hub (pixels) and rim radius. */
export const FERRIS = { cx: 26 * 16 + 64, cy: 4 * 16 + 54, r: 73 };
/** Where the slingshot ball rests (pixels). */
export const SLING = { x: 44 * 16 + 64, y: 3 * 16 + 166, top: 3 * 16 + 10 };

export function buildPark(): MapDef {
  const b = new MapBuilder('park', 'THRILL HARBOR', PARK_W, PARK_H, T.GRASS3);
  const m = b.m;
  m.world = 2;
  m.outdoor = true;
  m.music = 'park';
  m.amb = 'park';
  m.dark = 0.16;
  m.darkStyle = 'night';
  m.spawn = { x: 29, y: 45, dir: 'up' };
  b.scatter(0, 0, PARK_W, PARK_H, T.GRASS3, [T.GRASS, T.TUFT], 0.12, 9);

  // the perimeter fence and the way back out
  b.fence(0, 0, PARK_W, PARK_H);
  b.d(29, 47, D.NONE).d(30, 47, D.NONE);
  b.rect(29, 47, 2, 1, T.PARKPATH);
  b.warp(29, 47, 'isl', PARK_GATE.x, PARK_GATE.y, 'down', 'step');
  b.warp(30, 47, 'isl', PARK_GATE.x + 1, PARK_GATE.y, 'down', 'step');

  // ---------------------------------------------------------------- paths
  b.rect(28, 31, 4, 16, T.PARKPATH); // the midway, from the gate to the carousel
  b.rect(8, 30, 48, 3, T.PARKPATH); // the promenade
  b.rect(24, 32, 12, 4, T.PARKPATH); // around the carousel
  b.rect(28, 14, 4, 12, T.PARKPATH); // up to the Ferris wheel
  b.rect(26, 14, 26, 3, T.PARKPATH); // across to the slingshot
  b.rect(44, 16, 4, 14, T.PARKPATH);
  b.rect(34, 23, 10, 2, T.PARKPATH); // to the Terror Tunnel
  b.rect(50, 24, 6, 6, T.PARKPATH); // funhouse yard
  b.rect(20, 38, 32, 3, T.PARKPATH); // the stalls row
  b.scatter(0, 0, PARK_W, PARK_H, T.PARKPATH, [T.MUD, T.CONCRETE2], 0.12, 31);
  // puddles the size of ponds
  b.rect(38, 42, 4, 3, T.WATER);
  b.rect(12, 36, 3, 2, T.WATER);

  // ---------------------------------------------------------------- the roller coaster: WIPEOUT
  const ca = COASTER_AREA;
  b.fence(ca.x, ca.y, ca.w, ca.h);
  b.rect(ca.x + 1, ca.y + 1, ca.w - 2, ca.h - 2, T.DIRT);
  b.scatter(ca.x + 1, ca.y + 1, ca.w - 2, ca.h - 2, T.DIRT, [T.MUD], 0.08, 44);
  b.d(8, ca.y + ca.h - 1, D.NONE); // the queue gate
  b.prop('p3_coaster', 0, 0, [{ x: 8, y: 28, w: 1, h: 1 }], { sortY: 29 });
  b.spot(8, 28, 'ride_coaster');
  b.d(10, 30, D.SIGN);
  b.spot(10, 30, 'sign_coaster');
  b.d(6, 30, D.ROPEPOST).d(7, 31, D.ROPEPOST);

  // ---------------------------------------------------------------- the Ferris wheel: THE BIG O
  b.prop('p3_ferris', 26, 4, [
    { x: 26, y: 12, w: 2, h: 2 },
    { x: 32, y: 12, w: 2, h: 2 },
    { x: 28, y: 6, w: 4, h: 8 },
  ]);
  b.spot(29, 13, 'ride_ferris');
  b.spot(30, 13, 'ride_ferris');
  b.d(33, 15, D.SIGN);
  b.spot(33, 15, 'sign_ferris');

  // ---------------------------------------------------------------- the slingshot: THE YEET
  b.prop('p3_sling', 44, 3, [
    { x: 44, y: 3, w: 2, h: 12 },
    { x: 50, y: 3, w: 2, h: 12 },
    { x: 46, y: 13, w: 4, h: 2 },
  ]);
  b.spot(48, 14, 'ride_sling');
  b.spot(47, 14, 'ride_sling');
  b.d(51, 16, D.SIGN);
  b.spot(51, 16, 'sign_sling');

  // ---------------------------------------------------------------- everything else (look, don't ride)
  b.prop('p3_carousel', 27, 26, [{ x: 27, y: 27, w: 6, h: 4 }]);
  b.spot(29, 31, 'park_carousel');
  b.spot(30, 31, 'park_carousel');
  b.prop('p3_bumper', 46, 31, [{ x: 46, y: 31, w: 7, h: 5 }]);
  b.spot(49, 36, 'park_bumper');
  b.prop('p3_funhouse', 52, 18, [{ x: 52, y: 18, w: 7, h: 6 }]);
  b.spot(55, 24, 'park_funhouse');
  b.prop('p3_haunted', 35, 18, [{ x: 35, y: 18, w: 8, h: 5 }]);
  b.spot(39, 23, 'park_haunted');
  b.prop('p3_food1', 21, 36, [{ x: 21, y: 37, w: 3, h: 1 }]);
  b.spot(22, 38, 'park_corndog');
  b.prop('p3_food2', 33, 36, [{ x: 33, y: 37, w: 3, h: 1 }]);
  b.spot(34, 38, 'park_cotton');
  b.prop('p3_booth', 42, 36, [{ x: 42, y: 37, w: 3, h: 1 }]);
  b.spot(43, 38, 'park_ringtoss');
  b.prop('p3_tix', 25, 42, [{ x: 25, y: 44, w: 2, h: 1 }]);
  b.spot(26, 45, 'park_tix');
  for (const [x, y] of [
    [27, 41],
    [33, 41],
    [27, 33],
    [43, 29],
    [18, 30],
  ])
    b.prop((x + y) % 2 ? 'p2_lampbroken' : 'p_lamp', x, y - 1, [{ x, y, w: 1, h: 1 }], { sortY: y + 1 });
  b.d(36, 33, D.BENCH).d(24, 33, D.BENCH).d(20, 41, D.TRASHCAN).d(40, 41, D.TRASHCAN).d(52, 29, D.TRASHCAN);
  b.d(16, 40, D.DEBRIS).d(46, 41, D.SEAWEED).d(54, 40, D.CONE).d(55, 41, D.CONE).d(12, 44, D.TIRE).d(48, 26, D.RUBBLE);
  b.d(36, 30, D.SIGN);
  b.spot(36, 30, 'sign_park_rules');
  // a fallen letter from some sign, very large
  b.d(18, 43, D.PLANKS);
  b.spot(18, 43, 'park_letter');

  // ---------------------------------------------------------------- the employee and the dropped part
  b.npc({ id: 'skip', sprite: 'employee', x: 31, y: 43, dir: 'down', wander: 0, script: 'skip' });
  b.prop('tile:' + D.GEARS, 33, 43, [{ x: 33, y: 43, w: 1, h: 1 }], { show: (st: StoryState) => !has(st, 'transducer') && !isSet(st, 'w2_assembled') });
  b.spot(33, 43, 'park_part', (st) => !has(st, 'transducer'));

  // the inventor has opinions about rides
  const quip = (x: number, y: number, w: number, h: number, id: string) => b.trigger(x, y, w, h, id, 'q_' + id, (st) => isSet(st, 'w2_inv_follow'));
  quip(6, 29, 8, 3, 'quip_coaster');
  quip(44, 15, 6, 3, 'quip_sling');

  // a couple of lights that still work
  b.light(29 * 16, 40 * 16, 40, 0.6);
  b.light(30 * 16, 28 * 16, 50, 0.3);
  return b.build();
}
