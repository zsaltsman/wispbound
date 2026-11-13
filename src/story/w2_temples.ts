import Phaser from 'phaser';
import { isSet } from './state';
import type { Script, Gate, W } from './helpers';
import { SCRIPTS } from './registry';
import { PIP, P_PIP, pip, scene, cam, camPx, pop, bars, blackout, hideParty, cut } from './w2_fx';
import { iris } from './s_endgame';
import { departPrompt, stayHere } from './voyage';
import { C, txt } from '../ui/ui';
import { W as SW } from '../constants';
import { T } from '../world/tiles';
import { blockedStatic } from '../world/mapdef';
import { getCreature } from '../engine/creatures';
import { armsAt } from '../gfx/artTemples';
import {
  ZNODE,
  ZCHANNELS,
  ZTYPES,
  ZSTART,
  ZSOURCE,
  ZEXIT,
  THOR,
  POS,
  ATH,
  VAULT_PIT,
  ESC_COLLAPSE,
  ESC_FLOOD,
  ESC_FLOOD_AT,
  ESC_GOAL,
  ESC_TIME,
  ESC_START,
} from '../world/maps/temples';
import { GODS, GOD_NAMES, type God } from '../gfx/artGods';

// World 2, the deep: the four god temples, the vault, the Kraken, the escape,
// the empty island and the professor's farewell.

type Dir = 'up' | 'down' | 'left' | 'right';
type Rect = { x: number; y: number; w: number; h: number };
const f = (w: W, k: string) => isSet(w.state, k);
const inR = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const px = (t: number) => t * 16 + 8;

// ================================================================== small effects

/** A jagged white bolt between two pixel points, gone in a blink. */
function bolt(w: W, x0: number, y0: number, x1: number, y1: number, ms = 180, depth = 9700) {
  const g = scene(w).add.graphics().setDepth(depth);
  w.worldLayer.add(g);
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = i === 0 || i === n ? 0 : 5;
    pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * j * 2, y0 + (y1 - y0) * t + (Math.random() - 0.5) * j]);
  }
  const path = (width: number, color: number, a: number) => {
    g.lineStyle(width, color, a);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.strokePath();
  };
  path(3, C.light, 0.7);
  path(1, C.white, 1);
  scene(w).time.delayedCall(ms, () => g.destroy());
}

/** A burst of white sparks. */
function sparks(w: W, x: number, y: number, n = 6, spread = 14) {
  const s = scene(w);
  for (let i = 0; i < n; i++) {
    const p = w.image('fx_px', x, y, 9750).setScale(2).setTint(i % 2 ? C.white : C.light);
    const a = Math.random() * Math.PI * 2;
    const d = spread * (0.4 + Math.random() * 0.6);
    s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 260 + Math.random() * 200, onComplete: () => p.destroy() });
  }
}

/** A tapered tentacle drawn live: base, angle, curl and length can all be tweened. */
function tentacle(w: W, bx: number, by: number, depth = 9300) {
  const g = scene(w).add.graphics().setDepth(depth);
  w.worldLayer.add(g);
  const st = { len: 0, ang: -Math.PI / 2, curl: 0.6, width: 9 };
  const draw = () => {
    g.clear();
    const N = 16;
    let x = bx;
    let y = by;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([x, y, st.width * (1 - t) + 1.5]);
      const a = st.ang + st.curl * t * t * 2;
      x += Math.cos(a) * (st.len / N);
      y += Math.sin(a) * (st.len / N);
    }
    for (const [x2, y2, r] of pts) {
      g.fillStyle(C.black, 1);
      g.fillCircle(x2, y2, r + 1.5);
    }
    for (const [x2, y2, r] of pts) {
      g.fillStyle(C.mid, 1);
      g.fillCircle(x2, y2, r);
    }
    pts.forEach(([x2, y2, r], i) => {
      // a pale belly stripe and suckers, so it reads against the dark floor
      g.fillStyle(C.light, 1);
      g.fillCircle(x2 - r * 0.25, y2 - r * 0.25, Math.max(1, r * 0.45));
      if (i % 2 === 0 && r > 3) {
        g.fillStyle(C.white, 1);
        g.fillCircle(x2 + r * 0.45, y2 + r * 0.2, 1.2);
      }
    });
  };
  draw();
  return { g, st, draw };
}

/** Boulders crash down onto a tile. */
async function rockFall(w: W, x: number, y: number, scale = 1, ms = 220) {
  const r = w.image('e_boulders', px(x), y * 16 - 110, y * 16 + 16).setOrigin(0.5, 1).setScale(scale);
  await w.tw({ targets: r, y: y * 16 + 16, duration: ms, ease: 'Quad.easeIn' });
  sparks(w, px(x), y * 16 + 14, 4, 10);
  return r;
}

// ================================================================== the party's new friend

async function join(w: W, id: string, lines: string[], pipLine: string) {
  const cr = getCreature(id);
  for (const l of lines) await w.say(l, undefined, { portrait: 'cr_' + id });
  if (!(await w.confirm(`Take ${cr.name} with you?`))) {
    await w.say(`${cr.name} waits. It isn't going anywhere.`);
    return;
  }
  w.sfx('recruit');
  w.flash(0.5);
  w.recruit2(id);
  w.refresh();
  await w.say(`${cr.name} JOINED YOU!`, undefined, { portrait: 'cr_' + id });
  await pip(w, pipLine);
  w.save();
}

const LAIRS: Record<string, Script> = {
  async glowbell_lair(w) {
    await join(
      w,
      'glowbell',
      ['A jellyfish made of light drifts in the dark, humming like a struck bell. Tiny sparks crawl along its tendrils.', 'It floats closer. The sparks tickle.'],
      "It glows! It hums! It's a nightlight that fights. Welcome aboard."
    );
  },
  async hammerfin_lair(w) {
    await join(
      w,
      'hammerfin',
      ['A shark with a head like a war hammer circles the chamber, slow and heavy. It has clearly been waiting for someone worthy.', 'It stops. It looks at the hammer marks on the wall. It looks at you.'],
      "Good. A shark. With a hammer for a head. I feel very safe and only a little afraid."
    );
  },
  async bubblotl_lair(w) {
    await join(
      w,
      'bubblotl',
      ['A pale axolotl lounges in the shrine, blowing bubbles. Each one pops with a tiny, happy sound.', 'It blows a bubble at you. It seems to be an invitation.'],
      'Look at its little frills! I would die for it. Hopefully that will not be necessary.'
    );
  },
  async glidray_lair(w) {
    await join(
      w,
      'glidray',
      ['A manta ray with wings like folded moonlight hangs in the air of the chamber, as if the room were full of water.', 'It glides a slow circle around you, then settles at your side.'],
      'It flies. Underwater. In a room with no water. I have stopped asking questions.'
    );
  },
};

// ================================================================== the cave: one god answers

const GATES_W2T: Record<string, Gate> = {
  async to_vault(w) {
    if (w.state.creature2) return true;
    await w.say("Not yet. Something in this chamber is still watching you.");
    return false;
  },
};
for (const g of GODS) {
  GATES_W2T['god_gate_' + g] = async (w) => {
    const chosen = w.state.flags.w2_god as God | undefined;
    if (chosen === g) return true;
    if (chosen) await w.say(`The door of ${GOD_NAMES[g]} stays sealed. It will never open for you now.`);
    else await SCRIPTS['god_door_' + g]?.(w);
    return false;
  };
}

// ================================================================== ZEUS: route the lightning

const zRot = (w: W, i: number) => Number(w.state.flags['zr_' + i] ?? ZSTART[i]);
const DV: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
function zTex(w: W, c: number, r: number, lit: boolean) {
  const i = r * 5 + c;
  w.prop(`zc_${c}_${r}`)?.setTexture(`zc_${ZTYPES[i]}${zRot(w, i)}${lit ? 1 : 0}`);
}
function zChannel(c: number, r: number, d: number): [number, number] | null {
  const c2 = c + DV[d][0];
  const r2 = r + DV[d][1];
  const hit = ZCHANNELS.some(([a, b, x, y]) => (a === c && b === r && x === c2 && y === r2) || (x === c && y === r && a === c2 && b === r2));
  return hit ? [c2, r2] : null;
}

/** Follow the current from the rod. Returns the nodes it lights, where it dies, and whether it reaches the door. */
export function zeusTrace(rot: (i: number) => number) {
  const arms = (c: number, r: number) => armsAt(ZTYPES[r * 5 + c], rot(r * 5 + c));
  const hops: { c: number; r: number; from: [number, number] | null; depth: number }[] = [];
  const fizz: { x: number; y: number; depth: number }[] = [];
  let reached = -1;
  const start = ZNODE(0, 0);
  if (!arms(0, 0)[0]) {
    fizz.push({ x: px(start.x), y: (start.y - 1) * 16 + 8, depth: 0 });
    return { hops, fizz, reached };
  }
  const seen = new Set<string>(['0,0']);
  const q: { c: number; r: number; from: [number, number] | null; depth: number }[] = [{ c: 0, r: 0, from: null, depth: 0 }];
  while (q.length) {
    const h = q.shift()!;
    hops.push(h);
    const a = arms(h.c, h.r);
    const n = ZNODE(h.c, h.r);
    for (let d = 0; d < 4; d++) {
      if (!a[d]) continue;
      if (h.c === 0 && h.r === 0 && d === 0) continue; // where it came in
      if (h.c === 4 && h.r === 0 && d === 0) {
        reached = h.depth + 1;
        continue;
      }
      const nb = zChannel(h.c, h.r, d);
      if (!nb) {
        fizz.push({ x: px(n.x) + DV[d][0] * 9, y: n.y * 16 + 2 + DV[d][1] * 6, depth: h.depth });
        continue;
      }
      if (!arms(nb[0], nb[1])[(d + 2) % 4]) {
        const m = ZNODE(nb[0], nb[1]);
        fizz.push({ x: px(m.x - DV[d][0]), y: (m.y - DV[d][1]) * 16 + 8, depth: h.depth });
        continue;
      }
      const k = nb.join(',');
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ c: nb[0], r: nb[1], from: [h.c, h.r], depth: h.depth + 1 });
    }
  }
  return { hops, fizz, reached };
}

let zTimer: Phaser.Time.TimerEvent | null = null;
function zeusStrike(w: W) {
  if (w.map.id !== 't_zeus') {
    zTimer?.remove();
    zTimer = null;
    return;
  }
  if (w.busy || f(w, 'zeus_open')) return;
  const s = scene(w);
  const sx = px(ZSOURCE.x);
  const sy = (ZSOURCE.y - 2) * 16 + 4;
  bolt(w, sx + (Math.random() - 0.5) * 40, sy - 130, sx, sy, 220);
  w.sfx('thunder');
  w.flash(0.22);
  const src = w.prop('z_source');
  src?.setTexture('z_source_lit');
  s.time.delayedCall(420, () => src?.setTexture('z_source'));
  sparks(w, sx, sy, 6);
  const t = zeusTrace((i) => zRot(w, i));
  const STEP = 150;
  const live = () => w.map.id === 't_zeus';
  for (const h of t.hops)
    s.time.delayedCall(140 + h.depth * STEP, () => {
      if (!live()) return;
      const p = ZNODE(h.c, h.r);
      const from = h.from ? ZNODE(h.from[0], h.from[1]) : { x: ZSOURCE.x, y: ZSOURCE.y };
      bolt(w, px(from.x), from.y * 16 + 4, px(p.x), p.y * 16 + 2, 140);
      zTex(w, h.c, h.r, true);
      sparks(w, px(p.x), p.y * 16, 3, 8);
      s.time.delayedCall(700, () => live() && zTex(w, h.c, h.r, false));
    });
  for (const z of t.fizz)
    s.time.delayedCall(140 + (z.depth + 1) * STEP, () => {
      if (!live()) return;
      sparks(w, z.x, z.y, 5, 9);
      pop(w, z.x, z.y - 4, 'fzzt', C.light, 600);
      w.sfx('miss');
    });
  if (t.reached >= 0)
    s.time.delayedCall(140 + t.reached * STEP, () => {
      if (!live()) return;
      const n = ZNODE(4, 0);
      bolt(w, px(n.x), n.y * 16, px(ZEXIT.x), ZEXIT.y * 16 - 8, 300);
      w.run('zeus_solved');
    });
}

const ZEUS: Record<string, Script> = {
  decorate_t_zeus(w) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) zTex(w, c, r, false);
    const img = w.prop('z_barrier');
    if (img && !f(w, 'zeus_open')) {
      img.setVisible(false);
      const sp = w.sprite('z_barrier', img.x, img.y, img.depth).setOrigin(0, 0);
      sp.play('z_barrier_buzz');
      (w as any).zBar = sp;
    }
    zTimer?.remove();
    zTimer = f(w, 'zeus_open') ? null : scene(w).time.addEvent({ delay: 3400, loop: true, callback: () => zeusStrike(w) });
    return Promise.resolve();
  },
  async zeus_enter(w) {
    await pip(w, 'Mind the pillars. And the lightning. Mostly the lightning.');
  },
  async zeus_rod(w) {
    await w.say('A tall copper rod. Lightning keeps finding it. A copper channel runs from its foot into the hall.');
  },
  async zeus_barrier(w) {
    await w.say('A doorway full of crackling light. The copper channel at your feet ends right here.');
  },
  async zeus_urn(w) {
    await w.say('A cracked urn full of fused glass. Lightning has found it more than once.');
  },
  async zeus_solved(w) {
    if (f(w, 'zeus_open')) return;
    w.set('zeus_open');
    zTimer?.remove();
    zTimer = null;
    w.sfx('thunder');
    w.flash(0.9);
    w.shake(900, 0.01);
    const bar = (w as any).zBar as Phaser.GameObjects.Sprite | undefined;
    sparks(w, px(ZEXIT.x), ZEXIT.y * 16 - 10, 16, 26);
    bar?.destroy();
    w.refresh();
    await w.camPan(ZEXIT.x, ZEXIT.y, 600);
    await w.say('The current hits the doorway. The barrier bursts apart in a shower of white sparks.');
    await w.camReturn(500);
    await pip(w, 'Ha! It worked! I mean... obviously it worked.');
    w.save();
  },
};
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 5; c++)
    ZEUS[`zc_${c}_${r}`] = async (w) => {
      if (f(w, 'zeus_open')) {
        await w.say('The pillar hums quietly. Its work is done.');
        return;
      }
      const i = r * 5 + c;
      w.set('zr_' + i, (zRot(w, i) + 1) % 4);
      zTex(w, c, r, false);
      w.sfx('stone');
      if (!f(w, 'zeus_turned')) {
        w.set('zeus_turned');
        await w.say('The copper cap turns with a heavy clunk.');
      }
    };

// ================================================================== THOR: the worthy

function spawnPush(w: W, id: string, key: 'block' | 'orb' | 'crate', x: number, y: number, push: boolean) {
  w.remove(id);
  const a = w.spawn(id, 'raw:push_' + key, x, y, 'down');
  (a as any).push = push;
  return a;
}
const thorDone = (w: W) => [f(w, 'thor_m1'), f(w, 'thor_m2'), f(w, 'thor_m3')];

async function runeLight(w: W, n: number) {
  const [x, y] = THOR.runes[n];
  await w.camPan(x, y, 700);
  w.prop('rune' + n)?.setTexture(`t_rune${n}1`);
  w.sfx('crystal');
  w.flash(0.3);
  sparks(w, px(x), y * 16, 8);
  await w.wait(700);
  if (thorDone(w).every(Boolean)) {
    await w.camPan(15, 11, 600);
    w.prop('t_hammer')?.setTexture('t_hammer_lit');
    w.sfx('thunder');
    w.shake(700, 0.006);
    await w.say('All three runes blaze. In the middle of the hall, the hammer begins to hum.');
  }
  await w.camReturn(600);
  w.save();
}

const THOR_S: Record<string, Script> = {
  decorate_t_thor(w) {
    w.setGround(THOR.pit2.x, THOR.pit2.y, f(w, 'thor_pit') ? T.PIT_FILLED : T.PIT);
    thorDone(w).forEach((on, n) => w.prop('rune' + n)?.setTexture(`t_rune${n}${on ? 1 : 0}`));
    if (thorDone(w).every(Boolean) && !f(w, 'thor_hammer')) w.prop('t_hammer')?.setTexture('t_hammer_lit');
    if (f(w, 'thor_m1')) spawnPush(w, 'block1', 'block', THOR.plate1.x, THOR.plate1.y, false);
    else spawnPush(w, 'block1', 'block', THOR.block1.x, THOR.block1.y, true);
    if (!f(w, 'thor_pit')) spawnPush(w, 'block2', 'block', THOR.block2.x, THOR.block2.y, true);
    if (f(w, 'thor_orb')) spawnPush(w, 'orb', 'orb', THOR.socket.x, THOR.socket.y, false);
    else spawnPush(w, 'orb', 'orb', THOR.orb.x, THOR.orb.y, true);
    w.pushRule = (id, x, y) => {
      const free = blockedStatic(w.map, x, y, w.state) ? 'no' : 'ok';
      if (id === 'block1') {
        if (!inR(THOR.room1, x, y)) return 'no';
        return x === THOR.plate1.x && y === THOR.plate1.y ? 'plate' : free;
      }
      if (id === 'block2') {
        if (x === THOR.pit2.x && y === THOR.pit2.y) return 'pit';
        return inR(THOR.room2, x, y) ? free : 'no';
      }
      if (id === 'orb') {
        if (!inR(THOR.room3, x, y)) return 'no';
        return x === THOR.socket.x && y === THOR.socket.y ? 'socket' : free;
      }
      return 'no';
    };
    w.onPushed = (id, _x, _y, v) => {
      if (v === 'plate') w.run('thor_plate');
      else if (v === 'pit') w.run('thor_pitfill');
      else if (v === 'socket') w.run('thor_socket');
    };
    return Promise.resolve();
  },
  async enter_t_thor(w) {
    if (f(w, 'q_thor_in')) return;
    w.set('q_thor_in');
    await w.wait(300);
    await pip(w, "Is that a hammer up there? That's a big hammer.");
  },
  async thor_plate(w) {
    const a = w.actor('block1');
    if (a) (a as any).push = false;
    w.set('thor_m1');
    w.sfx('unlock');
    w.shake(300, 0.004);
    await w.say('The plate sinks under the block with a deep CLUNK.');
    await runeLight(w, 0);
  },
  async thor_pitfill(w) {
    const a = w.actor('block2');
    if (a) await w.tw({ targets: a.sprite, alpha: 0, y: a.sprite.y + 6, duration: 200 });
    w.remove('block2');
    w.set('thor_pit');
    w.setGround(THOR.pit2.x, THOR.pit2.y, T.PIT_FILLED);
    w.sfx('slam');
    w.shake(500, 0.008);
    await w.say('The block drops into the pit with a boom. It fits perfectly.');
  },
  async thor_lever(w) {
    if (f(w, 'thor_m2')) {
      await w.say('The lever is down. It stays down.');
      return;
    }
    w.set('thor_m2');
    w.refresh();
    w.sfx('clank');
    await w.say('You haul the lever down. Chains rattle somewhere inside the walls.');
    await runeLight(w, 1);
  },
  async thor_socket(w) {
    const a = w.actor('orb');
    if (a) (a as any).push = false;
    w.set('thor_orb');
    w.sfx('crystal');
    await w.say('The orb rolls into the gap in the copper channel and settles there.');
  },
  async thor_rod(w) {
    await w.say('A copper rod as tall as a tree. A channel runs from its foot to the carved thunderbolt, with a round gap in the middle.');
  },
  async thor_symbol(w) {
    await w.say(f(w, 'thor_m3') ? 'The carved thunderbolt glows white-hot.' : 'A thunderbolt carved deep into the wall, ringed in copper. It is dark.');
  },
  async thor_rune(w) {
    const n = thorDone(w).filter(Boolean).length;
    await w.say(n === 3 ? 'All three rune stones glow.' : `Three rune stones. ${n === 0 ? 'None of them glow' : n === 1 ? 'One of them glows' : 'Two of them glow'}.`);
  },
  async thor_gong(w) {
    w.sfx('bell');
    w.shake(300, 0.003);
    await w.wait(450);
    // the sky answers the gong
    const rx = px(THOR.rod.x);
    const ry = (THOR.rod.y - 2) * 16 + 4;
    bolt(w, rx + 10, ry - 130, rx, ry, 220);
    w.sfx('thunder');
    w.flash(0.3);
    const rod = w.prop('t_rod');
    rod?.setTexture('z_source_lit');
    const end = f(w, 'thor_orb') ? THOR.symbol.x : THOR.socket.x;
    for (let x = THOR.rod.x; x < end; x++) {
      bolt(w, px(x), THOR.socket.y * 16 + 8, px(x + 1), THOR.socket.y * 16 + 8, 120);
      await w.wait(60);
    }
    rod?.setTexture('z_source');
    if (!f(w, 'thor_orb')) {
      sparks(w, px(THOR.socket.x), THOR.socket.y * 16 + 8, 8);
      pop(w, px(THOR.socket.x), THOR.socket.y * 16, 'fzzt', C.light, 700);
      w.sfx('miss');
      if (!f(w, 'q_thor_fizz')) {
        w.set('q_thor_fizz');
        await w.say('The current races down the channel... and dies at the round gap in the middle.');
      }
      return;
    }
    sparks(w, px(THOR.symbol.x + 1), (THOR.symbol.y + 1) * 16, 14, 20);
    if (f(w, 'thor_m3')) return;
    w.set('thor_m3');
    w.refresh();
    w.sfx('crystal');
    await w.say('The current leaps through the orb and into the carved thunderbolt. It blazes white.');
    await runeLight(w, 2);
  },
  async thor_hammer(w) {
    if (f(w, 'thor_hammer')) {
      await w.say('Just a cracked, empty dais now.');
      return;
    }
    if (!thorDone(w).every(Boolean)) {
      await w.say("You grab the handle and heave. It doesn't move. Not even a little.");
      await w.say('Three rune stones sit at its feet, waiting.');
      return;
    }
    const remove = bars(w);
    w.music(null);
    await w.camPan(15, 11, 900, 3);
    await w.say('You wrap both hands around the handle.');
    w.sfx('rumble');
    for (let i = 1; i <= 3; i++) {
      w.shake(600, 0.003 * i);
      await w.wait(700);
    }
    const h = w.prop('t_hammer');
    w.sfx('thunder');
    w.flash(0.9);
    if (h) await w.tw({ targets: h, y: h.y - 14, duration: 700, ease: 'Back.easeOut' });
    for (let i = 0; i < 3; i++) {
      bolt(w, px(15) + (i - 1) * 30, 8 * 16 - 60, px(15), 10 * 16 + 4, 200);
      w.sfx('thunder_far');
      await w.wait(220);
    }
    w.set('thor_hammer');
    await w.say('The hammer comes free.');
    w.refresh();
    await remove();
    await w.camReturn(600);
    w.music('t_thor');
    await pip(w, "You LIFTED it. I'm not even going to ask how.");
    await w.say('The hammer pulls, hard, toward the cracked wall at the top of the hall.');
    w.save();
  },
  async thor_crack(w) {
    if (!f(w, 'thor_hammer')) {
      await w.say('A wall split by a deep crack. Cold air whistles through it. Something heavy might break it.');
      return;
    }
    w.sfx('hammer');
    await w.wait(200);
    w.sfx('boom');
    w.flash(1);
    w.shake(1200, 0.018);
    sparks(w, px(15), 6 * 16, 18, 30);
    w.set('thor_wall_broken');
    w.refresh();
    await w.wait(700);
    await w.say('One swing. The wall bursts apart. Behind it, a hidden chamber.');
    w.save();
  },
  async thor_reset1(w) {
    if (f(w, 'thor_m1')) return w.say('A small shrine. Nothing here needs putting right.');
    if (!(await w.confirm('Touch the shrine? The block in this room will return to where it started.'))) return;
    w.sfx('rewind');
    w.flash(0.3);
    spawnPush(w, 'block1', 'block', THOR.block1.x, THOR.block1.y, true);
  },
  async thor_reset2(w) {
    if (f(w, 'thor_pit')) return w.say('A small shrine. Nothing here needs putting right.');
    if (!(await w.confirm('Touch the shrine? The block in this room will return to where it started.'))) return;
    w.sfx('rewind');
    w.flash(0.3);
    spawnPush(w, 'block2', 'block', THOR.block2.x, THOR.block2.y, true);
  },
  async thor_reset3(w) {
    if (f(w, 'thor_orb')) return w.say('A small shrine. Nothing here needs putting right.');
    if (!(await w.confirm('Touch the shrine? The orb will return to where it started.'))) return;
    w.sfx('rewind');
    w.flash(0.3);
    spawnPush(w, 'orb', 'orb', THOR.orb.x, THOR.orb.y, true);
  },
};

// ================================================================== POSEIDON: the waters

const tilesOf = (r: Rect) => {
  const out: [number, number][] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
};
const W_T = [...tilesOf(POS.W), ...tilesOf(POS.C)];
const E_T: [number, number][] = [...tilesOf(POS.E), [POS.tunnel.x, POS.tunnel.y]];
const pHi = (w: W) => f(w, 'pos_hi');
const pOpen = (w: W) => f(w, 'pos_open');
const eHi = (w: W) => !f(w, 'pos_e_dry');
const crateAt = (w: W) => (w.state.flags.pos_crate as string) || 'ledge';
const dryTile = (x: number, y: number) => (x === POS.plate.x && y === POS.plate.y ? T.PLATE : T.PBASIN);

function posProps(w: W) {
  w.prop('p_tide')?.setTexture(pHi(w) ? 'p_tide_hi' : 'p_tide_lo');
  w.prop('p_sluice')?.setTexture(pOpen(w) ? 'p_sluice_open' : 'p_sluice_shut');
}
function posPaint(w: W) {
  for (const [x, y] of W_T) w.setGround(x, y, pHi(w) ? T.PWATER : dryTile(x, y));
  for (const [x, y] of E_T) w.setGround(x, y, eHi(w) ? T.PWATER : dryTile(x, y));
}
function placeCrate(w: W) {
  const c = crateAt(w);
  const at = c === 'ledge' ? POS.ledge : c === 'W' || c === 'Wfloor' ? { x: POS.W.x, y: POS.ledge.y } : POS.plate;
  const a = spawnPush(w, 'p_crate', 'crate', at.x, at.y, c === 'ledge');
  if (c === 'W' || c === 'E') scene(w).tweens.add({ targets: a.sprite, y: a.sprite.y - 1.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

/** Water moves across a set of tiles column by column, so you can watch it go. */
async function flow(w: W, tiles: [number, number][], wet: boolean, eastward: boolean) {
  const cols = new Map<number, [number, number][]>();
  for (const t of tiles) cols.set(t[0], [...(cols.get(t[0]) ?? []), t]);
  const xs = [...cols.keys()].sort((a, b) => (eastward ? a - b : b - a));
  w.sfx(wet ? 'wave' : 'water');
  for (const x of xs) {
    for (const [tx, ty] of cols.get(x)!) w.setGround(tx, ty, wet ? T.PWATER : dryTile(tx, ty));
    if (Math.random() < 0.3) sparks(w, px(x), px(cols.get(x)![0][1]), 2, 6);
    await w.wait(45);
  }
}

/** White foam racing along the canal: the current, made visible. */
function foam(w: W, eastward: boolean, ms = 1600) {
  const s = scene(w);
  const y = px(POS.C.y);
  const x0 = px(eastward ? POS.W.x + POS.W.w - 1 : POS.E.x);
  const x1 = px(eastward ? POS.E.x + 2 : POS.W.x + POS.W.w - 2);
  const ev = s.time.addEvent({
    delay: 70,
    repeat: Math.floor(ms / 70),
    callback: () => {
      const p = w.image('fx_px', x0, y + (Math.random() - 0.5) * 10, 9000).setScale(Math.random() < 0.5 ? 2 : 3, 1).setTint(Math.random() < 0.5 ? C.white : C.light);
      s.tweens.add({ targets: p, x: x1, alpha: 0.2, duration: 900 + Math.random() * 300, onComplete: () => p.destroy() });
    },
  });
  return ev;
}

/** The east basin takes the level of the canal, if the sluice lets it. */
async function eastFollow(w: W) {
  if (!pOpen(w) || eHi(w) === pHi(w)) return;
  if (pHi(w)) {
    // the rush: everything in the west is carried east
    foam(w, true, 2200);
    if (crateAt(w) === 'W') {
      const a = w.actor('p_crate');
      w.set('pos_crate', 'E');
      if (a) {
        scene(w).tweens.killTweensOf(a.sprite);
        for (const [x, y] of [
          [POS.W.x + POS.W.w - 1, POS.ledge.y],
          [POS.C.x + POS.C.w - 1, POS.C.y],
          [POS.E.x + 2, POS.C.y],
          [POS.plate.x, POS.plate.y],
        ])
          await w.tw({ targets: a.sprite, x: px(x), y: y * 16 + 16, duration: 380, ease: 'Sine.easeInOut' });
      }
      flow(w, E_T, true, true);
      await w.wait(400);
    } else await flow(w, E_T, true, true);
    w.set('pos_e_dry', false);
  } else {
    foam(w, false, 1600);
    await flow(w, E_T, false, false);
    w.set('pos_e_dry', true);
  }
  placeCrate(w);
}

/** Floating things land when the water goes, and float when it comes back. */
async function crateSettle(w: W) {
  const c = crateAt(w);
  if (c === 'W' && !pHi(w)) w.set('pos_crate', 'Wfloor');
  else if (c === 'Wfloor' && pHi(w)) w.set('pos_crate', 'W');
  else if (c === 'E' && !eHi(w)) {
    w.set('pos_crate', 'plate');
    w.set('pos_gate');
    placeCrate(w);
    w.sfx('unlock');
    await w.camPan(POS.tunnel.x, POS.tunnel.y + 1, 600);
    w.refresh();
    w.shake(500, 0.005);
    await w.say('The crate settles onto the stone plate. Below, the sea gate grinds open.');
    return;
  } else if (c === 'plate' && eHi(w)) {
    w.set('pos_crate', 'E');
    w.set('pos_gate', false);
    w.refresh();
    w.sfx('slam');
    await w.say('The crate floats off the plate. The sea gate below slams shut.');
  } else return;
  placeCrate(w);
}

let posBump = 0;
const POSEIDON: Record<string, Script> = {
  decorate_t_poseidon(w) {
    posPaint(w);
    posProps(w);
    placeCrate(w);
    w.pushRule = (id, x, y) => {
      if (id !== 'p_crate') return 'no';
      if (x === POS.W.x && y === POS.ledge.y) {
        if (pHi(w)) return 'float';
        if (scene(w).time.now - posBump > 1500) {
          posBump = scene(w).time.now;
          w.run('pos_drop');
        }
      }
      return 'no';
    };
    w.onPushed = (id, _x, _y, v) => {
      if (id === 'p_crate' && v === 'float') w.run('pos_float');
    };
    return Promise.resolve();
  },
  async enter_t_poseidon(w) {
    if (f(w, 'q_pos_in')) return;
    w.set('q_pos_in');
    await w.wait(300);
    await pip(w, 'Everything in here is either wet, or about to be.');
  },
  async pos_drop(w) {
    await w.say('The basin below is bone dry. The crate would smash to pieces on the stones.');
  },
  async pos_float(w) {
    w.set('pos_crate', 'W');
    placeCrate(w);
    w.sfx('splash');
    if (!f(w, 'q_pos_float')) {
      w.set('q_pos_float');
      await w.say('The crate splashes down and bobs on the water.');
    }
  },
  async pos_wheel(w) {
    const hi = !pHi(w);
    w.set('pos_hi', hi);
    posProps(w);
    w.sfx('rattle');
    await w.say(hi ? 'You heave the great wheel round. Somewhere below, the sea starts pouring in.' : 'You heave the wheel back. The water begins to drain away.');
    await w.camPan(13, 9, 700);
    await flow(w, W_T, hi, true);
    if (pOpen(w)) await eastFollow(w);
    await crateSettle(w);
    await w.wait(300);
    await w.camReturn(500);
    w.save();
  },
  async pos_sluice(w) {
    const open = !pOpen(w);
    w.set('pos_open', open);
    posProps(w);
    w.sfx('clank');
    if (!open) {
      await w.say('The sluice gate slams shut.');
      w.save();
      return;
    }
    await w.say('The sluice gate grinds open.');
    if (eHi(w) !== pHi(w)) {
      await w.camPan(19, 10, 600);
      await eastFollow(w);
      await crateSettle(w);
      await w.wait(300);
      await w.camReturn(500);
    }
    w.save();
  },
  async pos_reset(w) {
    await w.say('A stone seahorse rises from a scallop shell. The water around its base swirls the wrong way.');
    if (!(await w.confirm('Touch the statue? The water and the crate will return to how they began.'))) return;
    w.sfx('rewind');
    w.flash(0.4);
    for (const k of ['pos_hi', 'pos_open', 'pos_e_dry', 'pos_gate']) w.set(k, false);
    w.set('pos_crate', 'ledge');
    posPaint(w);
    posProps(w);
    placeCrate(w);
    w.refresh();
    await w.say('The water churns, settles, and everything is as it was.');
  },
  async pos_glyph(w) {
    await w.say('A carving of waves: a wheel lets in the sea... a gate holds one basin shut... and then, all at once, the rush.');
  },
  async pos_statue(w) {
    await w.say('A stone sea serpent coils around a trident, its mouth open in a silent roar.');
  },
};

// ================================================================== ATHENA: wisdom's order

const ORDER = ['owl', 'snake', 'eagle', 'lion'] as const;
const aSeq = (w: W) => Number(w.state.flags.ath_seq ?? 0);
function athTex(w: W) {
  for (const k of ORDER) w.prop('a_' + k)?.setTexture(`a_${k}${f(w, 'ath_open') || ORDER.indexOf(k) < aSeq(w) ? 1 : 0}`);
}

const ATHENA: Record<string, Script> = {
  decorate_t_athena(w) {
    athTex(w);
    return Promise.resolve();
  },
  async enter_t_athena(w) {
    if (f(w, 'q_ath_in')) return;
    w.set('q_ath_in');
    await w.wait(300);
    await pip(w, 'A library! Finally, a temple with standards.');
  },
  async ath_main(w) {
    await w.say('A verse is carved into the lectern: "FOUR GUARDIANS KEEP THE DOOR. WAKE THEM AS WISDOM WOULD."');
    await w.say('"FIRST, THE ONE WHO SEES IN THE DARK."');
    await w.say('The rest has been chiseled away. Underneath, smaller: "THE REST IS AMONG MY BOOKS."');
  },
  async ath_scroll_w(w) {
    await w.say('An open scroll: "SECOND, THE ONE THAT SHEDS ITS SKIN AND RISES AGAIN."');
  },
  async ath_south_wall(w) {
    await w.say('Words cut into the standing stone: "LAST, THE ONE WHO GUARDS THE GATE."');
  },
  async ath_book_patient(w) {
    await w.say('A book lies open on the table. One line is underlined: "NOT EVERY SHELF HOLDS ONLY BOOKS."');
  },
  async ath_bookcase(w) {
    await w.say('A tall bookcase. Every book is thick with dust... except one, with a clean red spine.');
    if (!(await w.confirm('Pull the red book?'))) return;
    w.sfx('stone');
    w.shake(900, 0.004);
    const img = w.prop('a_bookcase');
    if (img) await w.tw({ targets: img, x: img.x + 24, duration: 1000, ease: 'Sine.easeInOut' });
    w.set('ath_shelf');
    w.refresh();
    await w.say('The whole bookcase slides aside. There is a narrow alcove behind it.');
    w.save();
  },
  async ath_scroll_e(w) {
    await w.say('A dusty scroll, hidden away: "THIRD, THE ONE THAT FLIES NEAREST THE SUN."');
  },
  async ath_books_w(w) {
    await w.say('HISTORIES OF THE SEA, volumes one through forty. Volume twelve is missing.');
  },
  async ath_books_e(w) {
    await w.say('A whole shelf of books about owls. Some of them are written by owls.');
  },
  async ath_books_s(w) {
    await w.say('Books on strategy. One is titled HOW TO WIN AN ARGUMENT WITH A GOD. It is very short.');
  },
  async ath_door(w) {
    await w.say('A great door with an owl carved into it. Four stone guardians stand between you and it.');
  },
};
for (const k of ORDER)
  ATHENA['ath_' + k] = async (w) => {
    if (f(w, 'ath_open')) {
      await w.say(`The ${k} watches over the open door.`);
      return;
    }
    const i = ORDER.indexOf(k);
    const s = aSeq(w);
    if (i < s) {
      await w.say('Its eyes already glow.');
      return;
    }
    w.prop('a_' + k)?.setTexture(`a_${k}1`);
    w.sfx('chime');
    w.flash(0.2);
    if (i === s) {
      w.set('ath_seq', s + 1);
      if (s + 1 < 4) {
        await w.say(`The ${k}'s eyes open, glowing white.`);
        return;
      }
      // all four awake
      await w.wait(500);
      w.set('ath_open');
      w.sfx('unlock');
      await w.camPan(ATH.door.x, ATH.door.y + 1, 700);
      w.shake(800, 0.005);
      w.flash(0.5);
      w.refresh();
      await w.say('All four guardians turn their eyes to the great door. It swings open without a sound.');
      await w.camReturn(600);
      await pip(w, "Oh, that's satisfying.");
      w.save();
      return;
    }
    // wrong: the guardians close their eyes again, one by one
    await w.wait(500);
    w.sfx('wrong');
    w.shake(300, 0.004);
    for (const k2 of [...ORDER].reverse()) {
      const img = w.prop('a_' + k2);
      if (img && img.texture.key.endsWith('1')) {
        img.setTexture(`a_${k2}0`);
        w.sfx('tick');
        await w.wait(220);
      }
    }
    w.set('ath_seq', 0);
    await w.say('One by one, the statues close their eyes.');
    if (!f(w, 'q_ath_wrong')) {
      w.set('q_ath_wrong');
      await pip(w, 'Wrong order. Back to the books.');
    }
  };

// ================================================================== Pipwick's advice, wherever you are

async function templePip(w: W): Promise<boolean> {
  const m = w.map.id;
  const say = (l: string) => w.say(l, PIP, { pitch: P_PIP });
  if (m === 't_zeus') await say(f(w, 'zeus_open') ? 'The door is open. Onward!' : 'The lightning has to reach that door. Turn the pillars so the copper lines up, and watch where it fizzles.');
  else if (m === 't_thor') {
    const n = thorDone(w).filter(Boolean).length;
    await say(f(w, 'thor_wall_broken') ? 'Through the wall!' : f(w, 'thor_hammer') ? 'That cracked wall up top is looking at you funny.' : n < 3 ? `Three runes, three rooms, I'd wager. ${n} down.` : 'All three runes are lit. Try the hammer!');
  } else if (m === 't_poseidon')
    await say(f(w, 'pos_gate') ? 'The gate is open! Down through the east basin!' : "That carving by the north wall... a gate holds one basin shut, then the rush. Maybe the crate wants to ride it.");
  else if (m === 't_athena') await say(f(w, 'ath_open') ? 'The door is open!' : 'The lectern says who goes first. The rest must be somewhere in the books.');
  else if (m === 't_zeus2' || m === 'w2_vault') await say(w.state.creature2 ? 'Onward. Carefully.' : "Don't keep it waiting.");
  else if (m === 'w2_escape') await say('RUN!');
  else return false;
  return true;
}

// ================================================================== the vault and the Kraken

function paintPit(w: W) {
  for (const [x, y] of tilesOf(VAULT_PIT)) w.setGround(x, y, T.PIT);
}

/** The Kraken's head, rising out of (or sinking into) the pit. */
function krakenHead(w: W) {
  const bottom = (VAULT_PIT.y + VAULT_PIT.h - 1) * 16;
  const x = (VAULT_PIT.x + VAULT_PIT.w / 2) * 16;
  const h = w.sprite('kr', x, bottom, bottom + 20).setOrigin(0.5, 1).setFrame(0);
  const st = { vis: 0 };
  const set = () => {
    const v = Math.max(0, Math.min(170, st.vis));
    h.setCrop(0, 0, 220, v);
    h.y = bottom + 170 - v;
  };
  set();
  return { h, st, set };
}

const VAULT: Record<string, Script> = {
  decorate_w2_vault(w) {
    if (f(w, 'kraken_seen')) paintPit(w);
    else for (const [x, y] of tilesOf(VAULT_PIT)) w.setGround(x, y, T.VCRACK);
    return Promise.resolve();
  },
  async enter_w2_vault(w) {
    if (f(w, 'q_vault_in')) return;
    w.set('q_vault_in');
    w.music(null);
  },
  async vault_reveal(w) {
    if (f(w, 'kraken_seen')) return;
    w.music(null);
    await w.wait(500);
    await pip(w, "...That's it? All that, for an empty room?");
    await w.wait(1600);
    w.sfx('drip');
    await w.wait(1700);
    w.sfx('rumble');
    w.shake(700, 0.002);
    await w.wait(1800);
    await pip(w, 'Did you feel that?');
    await w.wait(900);
    w.music('menace');
    const remove = bars(w);
    // cracks race across the floor from the middle of the room
    const s = scene(w);
    const g = s.add.graphics().setDepth(-1800);
    w.worldLayer.add(g);
    const cx = (VAULT_PIT.x + VAULT_PIT.w / 2) * 16;
    const cy = (VAULT_PIT.y + VAULT_PIT.h / 2) * 16;
    const arms = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const pts: [number, number][] = [[cx, cy]];
      let x = cx;
      let y = cy;
      for (let k = 0; k < 7; k++) {
        x += Math.cos(a + (Math.random() - 0.5) * 0.9) * 14;
        y += Math.sin(a + (Math.random() - 0.5) * 0.9) * 10;
        pts.push([x, y]);
      }
      return pts;
    });
    const grow = { t: 0 };
    const drawCracks = () => {
      g.clear();
      g.lineStyle(2, C.black, 1);
      for (const pts of arms) {
        const n = Math.floor(grow.t * (pts.length - 1));
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k <= n; k++) g.lineTo(pts[k][0], pts[k][1]);
        g.strokePath();
      }
    };
    w.sfx('stone');
    w.shake(1400, 0.005);
    await w.tw({ targets: grow, t: 0.5, duration: 1400, onUpdate: drawCracks } as any);
    // the light gutters
    for (let i = 0; i < 6; i++) {
      w.setDark(0.97);
      await w.wait(80 + Math.random() * 120);
      w.setDark(0.7);
      await w.wait(120 + Math.random() * 220);
    }
    w.sfx('rumble');
    w.shake(2000, 0.009);
    await w.tw({ targets: grow, t: 1, duration: 1400, onUpdate: drawCracks } as any);
    await pip(w, 'BACK! GET BACK!');
    const p = w.actor('player')!;
    const back: Dir[] = [];
    for (let y = p.y + 1; y <= Math.min(p.y + 3, 19); y++) back.push('down');
    w.move('follower', back.map(() => 'down' as Dir), 160);
    await w.move('player', back, 160);
    w.face('player', 'up');
    // the camera pulls away to take in the whole room
    await camPx(w, cx, cy + 24, 1500, 1);
    await w.wait(500);
    // tentacles burst up through the floor
    const spots: [number, number, number][] = [
      [cx - 70, cy + 10, -2.2],
      [cx + 74, cy + 6, -0.9],
      [cx - 40, cy - 30, -2.0],
      [cx + 44, cy - 34, -1.1],
    ];
    const tents = [];
    for (const [bx, by, ang] of spots) {
      const t = tentacle(w, bx, by, 9200);
      t.st.ang = ang;
      t.st.curl = (Math.random() - 0.5) * 1.4;
      tents.push(t);
      w.sfx('crash');
      w.shake(400, 0.012);
      sparks(w, bx, by, 8, 18);
      await w.tw({ targets: t.st, len: 70 + Math.random() * 20, duration: 320, ease: 'Back.easeOut', onUpdate: t.draw } as any);
      await w.wait(380);
    }
    // ...and slam down
    w.sfx('slam');
    await Promise.all(tents.map((t) => w.tw({ targets: t.st, ang: t.st.ang + (t.st.ang < -1.57 ? -0.9 : 0.9), duration: 260, ease: 'Quad.easeIn', onUpdate: t.draw } as any)));
    w.shake(900, 0.016);
    w.flash(0.5);
    await w.wait(700);
    // the floor gives way
    w.sfx('boom');
    w.flash(0.7);
    w.shake(1400, 0.015);
    g.destroy();
    paintPit(w);
    await w.wait(1200);
    // the head rises out of the dark
    const head = krakenHead(w);
    const sway = tents.map((t, i) => s.tweens.add({ targets: t.st, curl: t.st.curl + 0.6, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: t.draw }));
    w.sfx('rumble');
    w.shake(3200, 0.004);
    await w.tw({ targets: head.st, vis: 150, duration: 3200, ease: 'Sine.easeOut', onUpdate: head.set } as any);
    await w.wait(900);
    head.h.setFrame(2);
    w.sfx('horn');
    w.sfx('wail');
    w.shake(1600, 0.015);
    w.flash(0.4);
    await w.wait(1800);
    head.h.setFrame(0);
    await pip(w, '...That is NOT a god.');
    await w.wait(600);
    sway.forEach((t) => t.stop());
    w.set('kraken_seen');
    w.save();
    await remove();
    await w.startBattle('kraken');
  },
  async vault_pit(w) {
    if (f(w, 'kraken_beaten')) return w.say('Black water fills the pit. Nothing moves in it now.');
    await w.say('Black water fills the pit. Far below, something enormous is waiting.');
    if (!(await w.confirm('Face the Kraken again?'))) return;
    await w.startBattle('kraken');
  },
  async after_kraken(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      w.set('kraken_lost');
      await w.say('You come to at the edge of the pit, coughing up seawater. Far below, something vast shifts in the dark.');
      await pip(w, "We're not done. Catch your breath. Then we go again.");
      return;
    }
    w.set('kraken_beaten');
    w.set('kraken_lost', false);
    w.save();
    w.music(null);
    // it sinks
    const head = krakenHead(w);
    head.h.setFrame(6);
    head.st.vis = 140;
    head.set();
    await camPx(w, (VAULT_PIT.x + VAULT_PIT.w / 2) * 16, (VAULT_PIT.y + 2) * 16, 900, 1.4);
    await w.wait(800);
    w.sfx('splash');
    await w.tw({ targets: head.st, vis: 0, duration: 2600, ease: 'Sine.easeIn', onUpdate: head.set } as any);
    w.sfx('wave');
    await w.say('The Kraken sinks back into the pit. Its great eye closes. Then it is gone.');
    await w.camReturn(700);
    await w.wait(1400);
    w.sfx('creak');
    await w.wait(1000);
    w.sfx('rumble');
    w.shake(2400, 0.006);
    await w.say('A crack races up the wall. Then another. Then all of them.');
    await pip(w, 'It was holding the place up. It was HOLDING THE PLACE UP!');
    const p = w.actor('player')!;
    for (let i = 0; i < 5; i++) {
      rockFall(w, p.x + Math.round((Math.random() - 0.5) * 8), p.y - 1 - Math.floor(Math.random() * 4), 0.8);
      w.sfx('crash');
      w.shake(300, 0.012);
      await w.wait(260);
    }
    await pip(w, 'Back to the sub! RUN!');
    w.set('w2_escaping');
    w.save();
    await w.fade(true, 500);
    await SCRIPTS.escape_run(w);
  },
};

// ================================================================== the escape

let escOrig: number[] | null = null;

async function escapePlay(w: W): Promise<string> {
  const s = scene(w);
  let left = ESC_TIME * 1000;
  let elapsed = 0;
  const done = new Set<string>();
  let flooded = 0;
  let floodT = 0;
  let rockT = 2200;
  const clock = w.ui(txt(s, SW / 2, 6, '1:00', { outline: true, origin: [0.5, 0], scale: 2 }).setDepth(70));
  const showClock = () => {
    const sec = Math.max(0, Math.ceil(left / 1000));
    clock.setText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    clock.setAlpha(sec <= 10 && Math.floor(left / 250) % 2 === 0 ? 0.35 : 1);
  };
  w.stepMs = (x, y, run) => (w.map.ground[y * w.map.w + x] === T.SHALLOW ? 330 : run ? 150 : 230);
  const isFloor = (x: number, y: number) => [T.CAVE, T.CAVE2, T.SHALLOW].includes(w.map.ground[y * w.map.w + x] as any) && !blockedStatic(w.map, x, y, w.state);

  const dropRock = () => {
    const p = w.actor('player');
    if (!p) return;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
    const k = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 3) : 0;
    const tx = p.x + dx * k + (k === 0 ? Math.round((Math.random() - 0.5) * 4) : 0);
    const ty = p.y + dy * k + (k === 0 ? Math.round((Math.random() - 0.5) * 3) : 0);
    if (!isFloor(tx, ty)) return;
    const sh = s.add.ellipse(px(tx), ty * 16 + 13, 14, 6, C.black, 0.6).setDepth(ty * 16 + 1).setScale(0.3).setAlpha(0.2);
    w.worldLayer.add(sh);
    s.tweens.add({ targets: sh, scale: 1, alpha: 0.7, duration: 650 });
    s.time.delayedCall(650, async () => {
      if (w.map.id !== 'w2_escape') return sh.destroy();
      const r = await rockFall(w, tx, ty, 0.55, 150);
      sh.destroy();
      w.sfx('impact');
      w.shake(120, 0.003);
      const q = w.actor('player');
      if (q && q.x === tx && q.y === ty && w.map.id === 'w2_escape') {
        w.frozenUntil = s.time.now + 750;
        w.sfx('hit');
        w.flash(0.35);
        s.tweens.add({ targets: q.sprite, alpha: 0.3, duration: 90, yoyo: true, repeat: 3, onComplete: () => q.sprite.setAlpha(1) });
      }
      s.tweens.add({ targets: r, alpha: 0, duration: 500, delay: 250, onComplete: () => r.destroy() });
    });
  };

  const result = await w.freeRun((dt) => {
    left -= dt;
    elapsed += dt;
    showClock();
    const p = w.actor('player');
    if (!p) return null;
    if (inR(ESC_GOAL, p.x, p.y)) return 'safe';
    if (left <= 0) return 'dead';
    // corridors cave in as you get close
    for (const c of ESC_COLLAPSE)
      if (!done.has(c.id) && inR(c.near, p.x, p.y)) {
        done.add(c.id);
        w.sfx('crash');
        w.shake(700, 0.012);
        c.tiles.forEach(([x, y], i) =>
          s.time.delayedCall(i * 90, async () => {
            if (w.map.id !== 'w2_escape') return;
            await rockFall(w, x, y, 1, 200);
            w.setGround(x, y, T.CAVEWALL_TOP);
          })
        );
      }
    // the lowest gallery floods, from the far end toward you
    if (elapsed > ESC_FLOOD_AT * 1000 && flooded < ESC_FLOOD.w) {
      floodT -= dt;
      if (floodT <= 0) {
        floodT = 150;
        const x = ESC_FLOOD.x + ESC_FLOOD.w - 1 - flooded;
        for (let y = ESC_FLOOD.y; y < ESC_FLOOD.y + ESC_FLOOD.h; y++) if ([T.CAVE, T.CAVE2].includes(w.map.ground[y * w.map.w + x] as any)) w.setGround(x, y, T.SHALLOW);
        if (flooded % 6 === 0) w.sfx('water');
        flooded++;
      }
    }
    // falling rock
    rockT -= dt;
    if (rockT <= 0) {
      rockT = 900 + Math.random() * 900;
      dropRock();
    }
    if (Math.random() < dt / 2600) {
      w.shake(260, 0.003);
      w.sfx('rumble');
    }
    return null;
  });
  w.stepMs = null;
  clock.destroy();
  return result;
}

async function escapeDeath(w: W) {
  const p = w.actor('player')!;
  w.sfx('crash');
  for (let i = 0; i < 8; i++) {
    rockFall(w, p.x + Math.round((Math.random() - 0.5) * 4), p.y + Math.round((Math.random() - 0.5) * 3), 0.9, 180);
    w.shake(300, 0.02);
    if (i % 2) w.sfx('boom');
    await w.wait(140);
  }
  w.flash(1);
  await w.fade(true, 700);
  const s = scene(w);
  const card = blackout(w, 1, 95);
  const t = w.ui(txt(s, SW / 2, 130, 'THE CAVE CAME DOWN...', { color: C.light, origin: [0.5, 0] }).setDepth(96));
  cam(w).resetFX();
  await w.wait(1800);
  t.setText('TRY AGAIN!');
  w.sfx('select');
  await w.wait(1100);
  t.destroy();
  card.destroy();
  await w.fade(true, 0);
}

const ESCAPE: Record<string, Script> = {
  decorate_w2_escape(w) {
    // every attempt starts from the same tunnels: put back whatever caved in or flooded
    if (!escOrig) escOrig = [...w.map.ground];
    w.map.ground.forEach((t, i) => {
      if (t !== escOrig![i]) w.setGround(i % w.map.w, Math.floor(i / w.map.w), escOrig![i]);
    });
    return Promise.resolve();
  },
  async escape_run(w) {
    w.set('w2_escaping');
    w.save();
    for (;;) {
      cut(w, 'w2_escape', ESC_START.x, ESC_START.y, 'down');
      cam(w).resetFX();
      w.shake(800, 0.008);
      await w.fade(false, 400);
      const r = await escapePlay(w);
      if (r === 'safe') break;
      await escapeDeath(w);
    }
    await SCRIPTS.escape_win(w);
  },
  async escape_win(w) {
    w.set('w2_escaped');
    w.save();
    w.music(null);
    w.sfx('rumble');
    w.shake(1500, 0.01);
    await pip(w, 'IN! EVERYBODY IN!');
    hideParty(w, true);
    w.hide('follower2', true);
    w.sfx('clank');
    await w.wait(500);
    await w.say('The hatch slams shut. The PIPWICK MARK VII coughs, groans... and roars to life.');
    for (let i = 0; i < 6; i++) {
      const p = w.actor('player')!;
      rockFall(w, p.x + Math.round((Math.random() - 0.5) * 8), p.y - 2 - Math.floor(Math.random() * 3), 1, 200);
      w.sfx('crash');
      w.shake(300, 0.014);
      await w.wait(200);
    }
    w.sfx('whoosh');
    w.sfx('bubbles');
    w.flash(0.8);
    await w.fade(true, 900);
    await SCRIPTS.w2_surface(w);
  },

  // ================================================================ home, and nobody in it
  async w2_surface(w) {
    w.set('w2_returned');
    w.set('w2_escaping', false);
    w.save();
    cut(w, 'isl', 48, 81, 'up');
    hideParty(w, true);
    w.hide('follower2', true);
    w.music(null);
    const s = scene(w);
    const sub = w.sprite('subside', 48 * 16 + 8, 86 * 16, 9100);
    sub.play('subside_go');
    sub.setAlpha(0).setFlipX(true);
    await camPx(w, 48 * 16 + 8, 82 * 16, 0, 2);
    cam(w).resetFX();
    await w.fade(false, 1200);
    w.sfx('gull');
    await w.wait(900);
    // it breaks the surface
    w.sfx('bubbles');
    for (let i = 0; i < 12; i++) {
      const b = w.image(i % 2 ? 'bubble0' : 'bubble1', sub.x + (Math.random() - 0.5) * 40, 86 * 16, 9200);
      s.tweens.add({ targets: b, y: b.y - 20 - Math.random() * 20, alpha: 0, duration: 900, delay: i * 70, onComplete: () => b.destroy() });
    }
    await w.tw({ targets: sub, alpha: 1, y: 84 * 16, duration: 1600, ease: 'Sine.easeOut' });
    w.sfx('splash');
    w.shake(300, 0.003);
    await w.wait(500);
    w.sfx('clank');
    await w.wait(400);
    hideParty(w, false);
    w.hide('follower2', false);
    w.sfx('door');
    await w.camReturn(800);
    w.music('empty');
    await pip(w, 'Land! Glorious, boring, dry land!');
    await w.wait(700);
    await pip(w, 'HELLO? We\'re back! We saved the island!');
    await w.wait(1600);
    await pip(w, '...Anyone?');
    await w.say('Nobody answers. Just the wind, and the gulls.');
    s.tweens.add({ targets: sub, y: sub.y + 2, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    w.save();
  },
  async ret_low(w) {
    await pip(w, 'Not a soul. The grocery store is wide open and NOBODY is in it. That is how you know something is wrong.');
  },
  async ret_farewell(w) {
    if (f(w, 'w2_ending_done')) return;
    w.music('farewell');
    const remove = bars(w);
    const pw = w.actor('inventor');
    if (pw) {
      // he steps out in front of you to talk
      w.faceTo('inventor', 'player');
      w.faceTo('player', 'inventor');
    }
    await w.wait(800);
    await w.say('Well... I suppose that\'s that...', PIP, { pitch: 760 });
    await w.wait(500);
    await w.say("You've done this island a pretty big favor...", PIP, { pitch: P_PIP });
    await w.say('Your good deed will be repaid one way or another...', PIP, { pitch: P_PIP });
    await w.wait(900);
    if (pw) {
      await w.emote('inventor', 'heart', 900);
      w.face('inventor', 'down');
    }
    await w.say("Besides... I've got an entire island to myself now!", PIP, { pitch: 1100 });
    await w.wait(600);
    w.set('w2_ending_done');
    w.set('w2_inv_follow', false);
    w.save();
    // the Looney Tunes iris, closing on him
    if (pw) {
      await w.camPan(pw.x, pw.y, 1400, 4);
      await w.wait(500);
      const c = cam(w);
      const sx = (pw.sprite.x - c.worldView.x) * c.zoom;
      const sy = (pw.sprite.y - 10 - c.worldView.y) * c.zoom;
      let hop = true;
      (async () => {
        while (hop) {
          await w.tw({ targets: pw.sprite, y: pw.sprite.y - 3, duration: 160, yoyo: true });
          await w.wait(500);
        }
      })();
      w.music(null);
      await iris(w, sx, sy, 3600);
      hop = false;
    } else {
      await w.fade(true, 1600);
    }
    void remove;
    await w.wait(1200);
    // the island is yours now: back into Saltwash, and you leave when you choose to
    stayHere(w, 'stay_w2');
  },
  async ret_pip(w) {
    await w.say("An entire island! I'm naming a street after myself. All of the streets, actually.", PIP, { pitch: P_PIP });
    if (!isSet(w.state, 'w3_started')) await SCRIPTS.w3_offer(w);
  },
  /** The professor sees you off. */
  async w3_offer(w) {
    await w.say('Far off across the water, faint music. Somewhere out there, an island is having a party.');
    await w.say('I have readied the boat! Well. I have looked at the boat. It is definitely a boat.', PIP, { pitch: P_PIP });
    await departPrompt(w, 'w3', PIP, P_PIP);
  },
  async resume_w2_escape(w) {
    if (f(w, 'w2_escaped') && !f(w, 'w2_returned')) return SCRIPTS.w2_surface(w);
    if (f(w, 'w2_escaping') && !f(w, 'w2_escaped')) return SCRIPTS.escape_run(w);
  },
  async resume_w2_vault(w) {
    if (f(w, 'kraken_beaten') && !f(w, 'w2_escaped')) return SCRIPTS.escape_run(w);
  },
};

export const W2_TEMPLE_SCRIPTS: Record<string, Script> = { ...LAIRS, ...ZEUS, ...THOR_S, ...POSEIDON, ...ATHENA, ...VAULT, ...ESCAPE };
export const W2_TEMPLE_GATES: Record<string, Gate> = GATES_W2T;
export { templePip };
void hideParty;
