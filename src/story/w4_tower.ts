import type Phaser from 'phaser';
import type { Script, Gate, W } from './helpers';
import { scene, bars } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW } from '../constants';
import { T } from '../world/tiles';
import { blockedStatic } from '../world/mapdef';
import { W4, T1, T3, T5, T6 } from '../world/maps/w4maps';
import { f, px, py, old, OLD, P_OLD, hideAll4 } from './w4_fx';

// World 4, route A: the Woodlands Tower. Seven floors up from the roots: the vines,
// Wispmane's Champion, the four thirsty stumps, the Forgotten Garden, the broken
// floor and the vine swing, the three sacred stones, and the old man at the top.
// Then Wispmane himself, in the clearing.

type Dir = 'up' | 'down' | 'left' | 'right';
const BIT: Record<string, number> = { N: 1, E: 2, S: 4, W: 8 };
const rot1 = (b: number) => ((b << 1) | (b >> 3)) & 15;
const rotN = (b: number, n: number) => {
  for (let i = 0; i < ((n % 4) + 4) % 4; i++) b = rot1(b);
  return b;
};
function dirBit(ax: number, ay: number, bx: number, by: number) {
  if (bx > ax) return BIT.E;
  if (bx < ax) return BIT.W;
  if (by < ay) return BIT.N;
  return BIT.S;
}
const STUMP = { x: 6, y: 4, w: 3, h: 2 };
const inStump = (x: number, y: number) => x >= STUMP.x && x < STUMP.x + STUMP.w && y >= STUMP.y && y < STUMP.y + STUMP.h;

/** One vine's tiles: the bits each tile connects, before the switch turns its broken piece. */
function vineBits(i: number): number[] {
  const v = T1.vines[i];
  const sock = T1.sockets[i];
  return v.path.map(([x, y], k) => {
    let b = 0;
    if (k === 0) {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) if (inStump(x + dx, y + dy)) b |= dirBit(x, y, x + dx, y + dy);
    } else b |= dirBit(x, y, v.path[k - 1][0], v.path[k - 1][1]);
    if (k === v.path.length - 1) b |= dirBit(x, y, sock.x, sock.y);
    else b |= dirBit(x, y, v.path[k + 1][0], v.path[k + 1][1]);
    return b;
  });
}
const turn = (w: W, i: number) => (w.state.flags['w4_t1_r' + i] as number | undefined) ?? T1.vines[i].start;
const forkBlocked = (w: W) => f(w, 'w4_t1_block');
const vineOk = (w: W, i: number) => {
  const r = vineBits(i)[T1.vines[i].rot];
  return rotN(r, turn(w, i)) === r && (i !== 2 || forkBlocked(w));
};

let vineImgs: Phaser.GameObjects.Image[] = [];
function drawVines(w: W) {
  vineImgs.forEach((o) => o.destroy());
  vineImgs = [];
  T1.vines.forEach((v, i) => {
    const bits = vineBits(i);
    const ok = vineOk(w, i);
    // sap runs from the stump up to the broken piece; past it only if the piece is turned right
    // (and on the third vine, only once the side shoot is plugged)
    const lit = i === 2 && !forkBlocked(w) ? 2 : ok ? v.path.length - 1 : v.rot - 1;
    v.path.forEach(([x, y], k) => {
      let b = k === v.rot ? rotN(bits[k], turn(w, i)) : bits[k];
      if (i === 2 && x === T1.fork.x && y === T1.fork.y - 1 && !forkBlocked(w)) b |= BIT.S;
      vineImgs.push(w.image(`w4_vine${b}_${k <= lit ? 1 : 0}`, px(x), y * 16 + 8, y * 16 + 2));
    });
    if (i === 2 && !forkBlocked(w)) vineImgs.push(w.image('w4_vine1_1', px(T1.fork.x), T1.fork.y * 16 + 8, T1.fork.y * 16 + 2));
    w.prop('socket' + i)?.setTexture(ok ? 'w4_socket_lit' : 'w4_socket');
    w.prop('switch' + i)?.setTexture('w4_switch' + (turn(w, i) % 4));
  });
}

function spawnPush(w: W, id: string, key: string, x: number, y: number, push: boolean) {
  w.remove(id);
  const a = w.spawn(id, 'raw:' + key, x, y, 'down');
  (a as any).push = push;
  return a;
}

async function t1Check(w: W) {
  if (f(w, 'w4_t1_done') || ![0, 1, 2].every((i) => vineOk(w, i))) return;
  w.set('w4_t1_done');
  await w.wait(300);
  w.sfx('grow');
  w.flash(0.4);
  await w.camPan(T1.stump.x, T1.stump.y, 600);
  w.sfx('rumble');
  w.shake(1200, 0.008);
  await w.wait(500);
  w.refresh();
  w.sfx('unlock');
  await w.say('All three sockets blaze with light. The great stump splits down the middle with a groan.');
  await w.say('Inside it, a stair of roots winds upward.');
  await w.camReturn(600);
  w.save();
}

// ================================================================== the floors

const FLOORS: Record<string, Script> = {
  // ---------------------------------------------------------------- 1F: ancient roots
  decorate_w4_t1(w) {
    drawVines(w);
    if (forkBlocked(w)) spawnPush(w, 't1block', 'push_block', T1.fork.x, T1.fork.y, false);
    else spawnPush(w, 't1block', 'push_block', T1.block.x, T1.block.y, true);
    const onPath = (x: number, y: number) => T1.vines.some((v) => v.path.some(([a, b]) => a === x && b === y) || (v.sw.x === x && v.sw.y === y));
    w.pushRule = (id, x, y) => {
      if (id !== 't1block') return 'no';
      if (x === T1.fork.x && y === T1.fork.y) return 'fork';
      if (onPath(x, y) || blockedStatic(w.map, x, y, w.state)) return 'no';
      return 'ok';
    };
    w.onPushed = (id, _x, _y, v) => {
      if (id === 't1block' && v === 'fork') w.run('w4_t1_plug');
    };
    return Promise.resolve();
  },
  async enter_w4_t1(w) {
    if (f(w, 'q_w4_t1')) return;
    w.set('q_w4_t1');
    await w.wait(300);
    await w.say('Under the tower, among its roots. A huge dead stump stands in the middle of the room.');
    await w.say('Three withered vines run from the stump toward three empty sockets in the walls. Each one is broken somewhere along the way.');
  },
  async w4_t1_plug(w) {
    const a = w.actor('t1block');
    if (a) (a as any).push = false;
    w.set('w4_t1_block');
    w.sfx('slam');
    w.shake(200, 0.004);
    drawVines(w);
    await w.say('The block lands on the side shoot and pinches it shut. No more sap is leaking away.');
    await t1Check(w);
  },

  // ---------------------------------------------------------------- 2F: the Champion
  async w4_champion_scene(w) {
    const s = scene(w);
    w.music('menace');
    const off = bars(w);
    // a shadow slides along the wall...
    const shadow = w.image('ow_wispmane', px(1), py(1) - 10, 9000).setTint(0x000000).setAlpha(0.55).setScale(1.4);
    w.sfx('whoosh');
    await w.tw({ targets: shadow, x: px(15), duration: 1100, ease: 'Sine.easeInOut' });
    shadow.destroy();
    await w.wait(500);
    // ...and Wispmane is there, high on the broken wall, glowing faintly
    const wm = w.sprite('ow_wispmane', px(8), py(1) + 2, 9000).setOrigin(0.5, 1).setAlpha(0);
    s.tweens.add({ targets: wm, alpha: { from: 0.75, to: 0.95 }, duration: 600, yoyo: true, repeat: -1 });
    await w.camPan(8, 3, 700, 2);
    await w.wait(1400);
    wm.setFrame(1);
    w.sfx('roar');
    w.shake(1600, 0.02);
    await w.wait(1500);
    wm.setFrame(0);
    // the floor bursts
    await w.camPan(8, 6, 400, 2);
    w.sfx('crash');
    w.shake(900, 0.02);
    for (let i = 0; i < 10; i++) {
      const d = w.image('fx_dotM', px(8), py(6) - 8, 9100).setScale(2);
      s.tweens.add({ targets: d, x: px(8) + (Math.random() - 0.5) * 90, y: py(6) - 40 - Math.random() * 40, alpha: 0, duration: 700 });
    }
    const g = w.sprite('ow_champion', px(8), py(6) + 6, py(6) + 6).setOrigin(0.5, 1).setScale(1, 0.1);
    await w.tw({ targets: g, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
    g.setFrame(1);
    w.sfx('roar_small');
    w.shake(700, 0.012);
    await w.say('A giant gorilla bursts up through the floor, moss and roots hanging from its shoulders!');
    await off();
    await w.startBattle('champion');
  },
  async after_champion(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You come round on the cold stone floor. The Champion is pounding its chest in the middle of the room.');
      while (!(await w.confirm('Fight the Ancient Forest Champion again?'))) await w.say('It is not moving out of your way.');
      return w.startBattle('champion');
    }
    w.set('champion_beaten');
    w.save();
    const g = w.sprite('ow_champion', px(8), py(6), py(6)).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(8, 4, 600, 2);
    await w.wait(600);
    await w.tw({ targets: g, alpha: 0, duration: 900 });
    g.destroy();
    const wm = w.sprite('ow_wispmane', px(8), py(1) + 2, 9000).setOrigin(0.5, 1).setAlpha(0.85);
    await w.wait(500);
    await w.say('High on the wall, Wispmane looks down at you for a long moment.');
    w.sfx('whoosh');
    await w.tw({ targets: wm, y: wm.y - 60, alpha: 0, duration: 1200, ease: 'Quad.easeIn' });
    wm.destroy();
    await w.say('Then it leaps, straight up through a gap in the ceiling, and is gone.');
    await w.camReturn(600);
  },

  // ---------------------------------------------------------------- 3F: restore the trees
  decorate_w4_t3(w) {
    if (f(w, 'w4_t3_done')) for (const [x, y] of T3.bridge) w.setGround(x, y, T.W4_ROOTFLOOR), w.setGround(x, y + 1, T.W4_ROOTFLOOR);
    else for (const [x, y] of T3.bridge) w.setGround(x, y, T.W4_GAP), w.setGround(x, y + 1, T.W4_GAP);
    return Promise.resolve();
  },
  async enter_w4_t3(w) {
    if (f(w, 'q_w4_t3')) return;
    w.set('q_w4_t3');
    await w.wait(300);
    await w.say('Four dead stumps stand along the far side of a gap. Dry channels run to each of them from a water wheel.');
    await w.say('Each stump has a few notches cut into its bark.');
  },
  async w4_t3_wheel(w) {
    if (f(w, 'w4_t3_done')) return void (await w.say('The wheel creaks round. The four young trees drink happily.'));
    const names = ['THE FAR LEFT STUMP', 'THE LEFT STUMP', 'THE RIGHT STUMP', 'THE FAR RIGHT STUMP'];
    for (;;) {
      const k = await w.ask('Turn the wheel and send water to...', [...names, 'LEAVE IT'], undefined, { cancel: 4 });
      if (k < 0 || k >= 4) return;
      const st = T3.stumps[k];
      const key = 'w4_t3_s' + k;
      const c = ((w.state.flags[key] as number) ?? 0) + 1;
      if (c - 1 >= st.need) {
        await w.say('That one has had all it needs.');
        continue;
      }
      w.sfx('water');
      w.set(key, c);
      if (c === st.need) {
        w.refresh();
        w.sfx('grow');
        await w.camPan(st.x, st.y, 400);
        await w.say('The stump drinks the water... green shoots burst out of it, and it grows into a young tree!');
      } else if (c > st.need) {
        w.set(key, 0);
        w.refresh();
        await w.say('Too much! The water floods the roots and drains away. The stump is as dead as before.');
      } else {
        w.refresh();
        await w.camPan(st.x, st.y, 400);
        await w.say('The roots soak it up. A tiny green bud appears... it wants more.');
      }
      await w.camReturn(300);
      if (T3.stumps.every((s, i) => ((w.state.flags['w4_t3_s' + i] as number) ?? 0) >= s.need)) {
        w.set('w4_t3_done');
        await w.camPan(7.5, 5, 600);
        w.sfx('grow');
        w.shake(900, 0.006);
        for (const [x, y] of T3.bridge) {
          w.setGround(x, y, T.W4_ROOTFLOOR);
          w.setGround(x, y + 1, T.W4_ROOTFLOOR);
          await w.wait(150);
        }
        await w.say('The four trees stretch out their branches. They meet over the gap and lock together into a bridge.');
        await w.camReturn(600);
        w.save();
        return;
      }
    }
  },

  // ---------------------------------------------------------------- 4F: the forgotten garden
  async enter_w4_t4(w) {
    if (f(w, 'q_w4_t4')) return;
    w.set('q_w4_t4');
    await w.wait(400);
    await w.say('Trees grow right up through the ceiling. Flowers everywhere. Fountains. Warm, green air.');
    await w.say('Animals are curled up asleep in the grass. Every one of them is plump and healthy.');
    await w.say('Something here is taking very good care of them.');
  },
  async w4_sleeper(w, id: string) {
    await w.emote(id, 'zzz', 900);
    const t: Record<string, string> = {
      g_deer: 'A cow, fast asleep, its flank rising and falling. Its coat shines.',
      g_hen: 'A hen tucked into a ball of feathers. It mutters something in its sleep.',
      g_cat: 'A fat ginger cat, sprawled on its back. It is not the black cat.',
      g_piglet: 'A piglet, snoring. When you lean close, it smells of flowers.',
    };
    await w.say(t[id] ?? 'It is fast asleep.');
  },
  async w4_fountain(w) {
    w.sfx('water');
    await w.say('Clear water bubbles out of the stone. Everywhere else on this island, the water has gone stale. Not here.');
  },

  // ---------------------------------------------------------------- 5F: the broken floor
  async enter_w4_t5(w) {
    if (f(w, 'q_w4_t5')) return;
    w.set('q_w4_t5');
    await w.wait(300);
    await w.say('The stairs ahead have collapsed. A long vine hangs from the ceiling over the gap.');
  },
  async w4_swing(w) {
    const back = w.player.x >= 10;
    if (back || f(w, 'w4_t5_done')) {
      if (!f(w, 'w4_t5_done')) return;
      await w.say('You grab the vine and swing across.');
      w.sfx('whoosh');
      return w.warp('w4_t5', back ? 5 : T5.far.x, w.player.y, back ? 'left' : 'right');
    }
    if (!(await w.confirm('Grab the vine and swing across?'))) return;
    const r = await swingGame(w);
    if (r === 'across') {
      w.set('w4_t5_done');
      w.save();
      await w.warp('w4_t5', T5.far.x, T5.far.y, 'right');
      await w.say('You let go at the top of the swing and sail over the gap!');
    } else {
      await w.warp('w4_t5', T5.below.x, T5.below.y, 'down');
      w.sfx('heavy');
      w.shake(300, 0.008);
      await w.say('You lose the swing and drop onto a ledge below. Ouch. There is a ladder back up.');
    }
  },

  // ---------------------------------------------------------------- 6F: the three sacred stones
  decorate_w4_t6(w) {
    T6.stones.forEach((s, k) => {
      const on = f(w, 'w4_t6_p' + k);
      const p = T6.plates[k];
      spawnPush(w, 'stone' + k, 'push_sacred' + k, on ? p.x : s.x, on ? p.y : s.y, !on);
    });
    w.pushRule = (id, x, y) => {
      if (!id.startsWith('stone')) return 'no';
      if (blockedStatic(w.map, x, y, w.state) || x === 15 || y >= 12) return 'no';
      const k = +id.slice(5);
      return x === T6.plates[k].x && y === T6.plates[k].y ? 'plate' : 'ok';
    };
    w.onPushed = (id, _x, _y, v) => {
      if (v === 'plate') w.run('w4_t6_plate', id);
    };
    return Promise.resolve();
  },
  async enter_w4_t6(w) {
    if (f(w, 'q_w4_t6')) return;
    w.set('q_w4_t6');
    await w.wait(300);
    await w.say('Three gemstone blocks, and three plates set into the floor, each one marked to match.');
    await w.say('(If a stone gets stuck against the crates, step out and back in to put them back.)');
  },
  async w4_t6_plate(w, id: string) {
    const k = +id.slice(5);
    const a = w.actor(id);
    if (a) (a as any).push = false;
    w.set('w4_t6_p' + k);
    w.sfx('crystal');
    w.flash(0.3);
    await w.say('The stone settles onto its plate with a deep hum.');
    if ([0, 1, 2].every((i) => f(w, 'w4_t6_p' + i)) && !f(w, 'w4_t6_done')) {
      w.set('w4_t6_done');
      w.sfx('rumble');
      w.shake(1400, 0.012);
      await w.wait(600);
      await w.camPan(15, 3, 600);
      w.sfx('unlock');
      await w.say('The whole room shakes. In the corner, a stone slab slides aside: stairs!');
      await w.camReturn(600);
      w.save();
    }
  },

  // ---------------------------------------------------------------- 7F: the old man
  async w4_bowl(w) {
    await w.say(f(w, 'w4_old_met') ? 'The bowl. Wispmane\'s salad.' : 'A big wooden bowl, piled high with fresh green leaves.');
  },
  async w4_oldwindow(w) {
    await w.say('A window full of plants: herbs, lettuces, little tomatoes. From up here you can see the whole forest.');
  },
  async w4_oldman(w) {
    const O = (l: string) => w.say(l, OLD, { pitch: P_OLD });
    if (f(w, 'w4_old_met')) return void (await O('You should probably go find him. He\'s likely upset about leaving me behind.'));
    w.set('w4_old_met');
    w.face('oldman', 'down');
    await w.wait(400);
    await O('Well, well...');
    await O('I haven\'t had a visitor in quite some time.');
    await O('I see you\'ve noticed Wispmane.');
    await O('We grew up together, he and I. Since I was knee-high to a cabbage.');
    await O('Every day I bring him a salad. Fresh from my window.');
    await O('Haha! He absolutely loves it.');
    await O('He\'s been watching over this island for longer than I can remember.');
    await w.wait(500);
    w.face('oldman', 'up');
    await w.wait(900);
    w.face('oldman', 'down');
    await O('There\'s something coming.');
    await O('I can feel it. Wispmane can feel it too.');
    await O('You sail the seas, don\'t you?');
    await O('I think Wispmane needs to see the world. He\'s spent his entire life protecting this little island.');
    await O('Perhaps it\'s time he discovered something beyond it.');
    // Wispmane comes up the stairs behind you
    const end = w.player.x === 7 && w.player.y === 3 ? { x: 6, y: 2 } : { x: 7, y: 3 };
    w.spawn('wisp', 'raw:ow_wispmane', 3, 10, 'up');
    w.sfx('step');
    await w.camPan(5, 6, 600);
    const near = end.x === 7;
    await w.move('wisp', ['up', 'right', 'up', 'up', 'up', 'up', 'up', 'up', ...((near ? ['right', 'right', 'right'] : ['right', 'right', 'up']) as Dir[])], 200);
    w.face('wisp', 'right');
    await w.camPan(7.5, 3, 400);
    await w.emote('oldman', 'heart', 700);
    w.sfx('purr');
    await w.say('The old man scratches Wispmane behind the ears. The great lion closes its eyes and purrs like a kitten.');
    await w.wait(600);
    await w.emote('wisp', 'anger', 600);
    await O('Don\'t give me that look.');
    await O('I\'ll be fine.');
    await O('Besides, I think you\'ll be in much better hands.');
    const wsp = w.actor('wisp');
    wsp?.sprite.setFrame(1);
    w.sfx('roar');
    w.shake(900, 0.01);
    await w.wait(900);
    wsp?.sprite.setFrame(0);
    await w.move('wisp', [...((near ? ['left', 'left', 'left'] : ['down', 'left', 'left']) as Dir[]), 'down', 'down', 'down', 'down', 'down', 'down', 'left', 'down'], 70);
    w.remove('wisp');
    await w.camReturn(500);
    await O('Haha... I guess he didn\'t like that.');
    await O('You should probably go find him. He\'s likely upset about leaving me behind.');
    await w.wait(300);
    await O('Well, don\'t just stand there. I\'m coming with you, of course. I know a quicker way down than all those stairs.');
    w.set('w4_old_done');
    w.set('w4_old_follow');
    w.save();
    await w.fade(true, 700);
    await w.warp('w4_isl', W4.doors.tower.x, W4.doors.tower.y + 1, 'down');
    await old(w, 'Wispmane always goes to the same place when he sulks. The clearing, south of here.');
  },
};

for (let i = 0; i < 3; i++)
  FLOORS['w4_t1_switch' + i] = async (w) => {
    if (f(w, 'w4_t1_done')) return void (await w.say('The switch is stuck fast now. Sap runs through all three vines.'));
    w.set('w4_t1_r' + i, (turn(w, i) + 1) % 4);
    w.sfx('stone');
    w.shake(150, 0.003);
    drawVines(w);
    await w.wait(250);
    if (vineOk(w, i)) w.sfx('chime');
    await t1Check(w);
  };

// ================================================================== the vine swing (5F)

async function swingGame(w: W): Promise<'across' | 'fall'> {
  const s = scene(w);
  const vine = w.prop('vine') as Phaser.GameObjects.Image;
  const p = w.player.sprite;
  hideAll4(w, true);
  p.setVisible(true);
  const pivot = { x: vine.x + vine.width / 2, y: vine.y };
  vine.setOrigin(0.5, 0).setPosition(pivot.x, pivot.y);
  const L = vine.height - 6;
  const MAX = 1.0;
  let amp = 0.18;
  let t = 0;
  let pumped = false;
  let result: 'across' | 'fall' | null = null;
  const hint = w.ui(txt(s, SW / 2, 12, 'SPACE: PUMP AT THE BACK OF THE SWING   X: LET GO', { outline: true, origin: [0.5, 0] }).setDepth(80));
  const meter = w.ui(s.add.graphics().setDepth(80));
  // jump onto the vine
  await w.tw({ targets: p, x: pivot.x, y: pivot.y + L + 14, duration: 300, ease: 'Quad.easeOut' });
  const th = () => amp * MAX * Math.sin((t / 1300) * Math.PI * 2);
  const upd = (_: number, dt: number) => {
    if (result) return;
    t += dt;
    const a = th();
    vine.setRotation(-a);
    p.setPosition(pivot.x + Math.sin(a) * L, pivot.y + Math.cos(a) * L + 14);
    p.setDepth(9100);
    if (a > 0) pumped = false;
    meter.clear();
    meter.fillStyle(C.black, 1).fillRect(SW / 2 - 52, 26, 104, 8);
    meter.fillStyle(amp >= 0.85 ? C.white : C.light, 1).fillRect(SW / 2 - 50, 28, 100 * amp, 4);
  };
  s.events.on('update', upd);
  const outcome = await new Promise<'across' | 'fall'>((done) => {
    w.keyHook = (b) => {
      const a = th();
      if (b === 'a') {
        if (a < -amp * MAX * 0.6 && !pumped) {
          pumped = true;
          amp = Math.min(1, amp + 0.2);
          w.sfx('swish');
        } else amp = Math.max(0.15, amp - 0.08);
      } else if (b === 'b') done(amp >= 0.85 && a > amp * MAX * 0.55 ? 'across' : 'fall');
    };
  });
  result = outcome;
  w.keyHook = null;
  s.events.off('update', upd);
  hint.destroy();
  meter.destroy();
  if (outcome === 'across') {
    w.sfx('whoosh');
    await w.tw({ targets: p, x: px(T5.far.x), y: py(T5.far.y) - 20, duration: 300, ease: 'Quad.easeOut' });
    await w.tw({ targets: p, y: py(T5.far.y), duration: 160, ease: 'Quad.easeIn' });
  } else {
    w.sfx('miss');
    await w.tw({ targets: p, y: py(T5.below.y), duration: 420, ease: 'Quad.easeIn' });
  }
  vine.setRotation(0);
  hideAll4(w, false);
  return outcome;
}

// ================================================================== Wispmane in the clearing

const WISP: Record<string, Script> = {
  async after_wispmane(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You wake up in the long grass. Wispmane is pacing the edge of the clearing, watching you.');
      while (!(await w.confirm('Face Wispmane again?'))) await w.say('He is not going to wait forever. Then again, he is not going anywhere.');
      return w.startBattle('wispmane');
    }
    w.set('wispmane_beaten');
    w.save();
    const c = W4.clearing;
    const wm = w.sprite('ow_wispmane', px(c.x), py(c.y), py(c.y)).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(c.x, c.y - 1, 600, 2);
    await w.wait(1200);
    w.sfx('creak');
    wm.setFrame(0);
    await w.wait(600);
    await w.say('Wispmane drags himself back onto his feet. He glares at you, every bit as suspicious as before.');
    w.sfx('roar_small');
    await w.wait(500);
    await w.tw({ targets: wm, alpha: 0, duration: 900 });
    wm.destroy();
    await w.say('And then he is simply gone, into the trees.');
    await w.camReturn(600);
    await old(w, 'Stubborn old cat. He\'ll come round. Let\'s head back to the village. I want to see the old square again.');
    // the fight's last tremor shakes the vines off the hillside: the research facility
    await w.run('w4_lab_found');
  },
};

const TOWER_GATES: Record<string, Gate> = {
  async w4_t1_stairs(w) {
    if (f(w, 'w4_t1_done')) {
      if (!f(w, 'q_w4_climb')) {
        w.set('q_w4_climb');
        await w.say('You step into the split stump and start to climb. The roots twist upward like a spiral staircase, toward the floor above.');
      }
      w.sfx('ladder');
      return true;
    }
    await w.say('The stump is solid. Dead wood, and the faint sound of sap moving somewhere inside.');
    return false;
  },
  async w4_t2_down() {
    return true;
  },
  async w4_t2_up() {
    return true;
  },
  async w4_t6_stairs(w) {
    if (f(w, 'w4_t6_done')) return true;
    await w.say('A heavy stone slab lies over the stairs.');
    return false;
  },
};

export const W4_TOWER: Record<string, Script> = { ...FLOORS, ...WISP };
export const W4_TOWER_GATES = TOWER_GATES;
void old;
