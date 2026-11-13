import Phaser from 'phaser';
import type { Script, W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, bars, pop, blackout, camPx } from './w2_fx';
import { bigWords } from './w4_fx';
import { C } from '../ui/ui';
import { T } from '../world/tiles';
import { DIRV, blockedStatic } from '../world/mapdef';
import { P4, P5 } from '../world/maps/w5maps';
import { lockClues } from './w5_state';
import { scFor } from '../engine/prison';
import { SC_STARTERS } from '../gfx/texturesW5';
import { f, px, py, G, gName, gSound, w1, crName, spiritRecovered, comboLock, setBadge, glow, friendName, friendPitch, type Dir } from './w5_fx';

// The guard quarters (patrols, hiding, a spare uniform, the sergeant and his supercharged
// spirit), then HIGH SECURITY: the lock, your friend, and the one who comes for you.

const SARGE = 'SERGEANT';
const P_SARGE = 600;

// ================================================================== stealth

type Patrol = { id: string; pts: [number, number][]; i: number; wait: number; seen: number; greet: number };

const dirTo = (x: number, y: number, tx: number, ty: number): Dir => (tx > x ? 'right' : tx < x ? 'left' : ty > y ? 'down' : 'up');

/** Tiles a guard can see: up to 4 straight ahead, stopped by walls, crates and lockers. */
function sight(w: W, x: number, y: number, d: Dir, n = 4): [number, number][] {
  const [dx, dy] = DIRV[d];
  const out: [number, number][] = [];
  for (let k = 1; k <= n; k++) {
    const tx = x + dx * k;
    const ty = y + dy * k;
    if (blockedStatic(w.map, tx, ty, w.state)) break;
    out.push([tx, ty]);
  }
  return out;
}

function stealth(w: W) {
  const s = scene(w);
  const pats: Patrol[] = P4.patrols.map((p) => {
    const [x, y] = p.pts[0];
    const [nx, ny] = p.pts[1];
    w.spawn(p.id, p.sprite, x, y, dirTo(x, y, nx, ny));
    return { id: p.id, pts: p.pts, i: 1, wait: 600, seen: 0, greet: 0 };
  });
  // drawn over the darkness, like a lantern beam, so the lit tiles are always readable
  const cone = s.add.graphics().setDepth(10001);
  w.worldLayer.add(cone);
  let caught = false;
  w.onTick = (dt) => {
    if (caught) return;
    const disguised = f(w, 'w5_disguised');
    const me = w.player;
    cone.clear();
    for (const p of pats) {
      const a = w.actor(p.id);
      if (!a) continue;
      p.seen = Math.max(0, p.seen - dt);
      p.greet = Math.max(0, p.greet - dt);
      // walk the route: to each point in turn, pause, turn around
      if (!a.moving) {
        if (p.wait > 0) p.wait -= dt;
        else {
          const [tx, ty] = p.pts[p.i];
          if (a.x === tx && a.y === ty) {
            p.i = (p.i + 1) % p.pts.length;
            const [nx, ny] = p.pts[p.i];
            a.face(dirTo(a.x, a.y, nx, ny));
            p.wait = 1100;
          } else {
            const d = dirTo(a.x, a.y, tx, ty);
            const [dx, dy] = DIRV[d];
            if (me.x === a.x + dx && me.y === a.y + dy) p.wait = 300;
            else void a.walk(d, 360);
          }
        }
      }
      // what it can see
      const view = sight(w, a.x, a.y, a.dir);
      if (!disguised) {
        cone.fillStyle(C.light, 0.2);
        for (const [x, y] of view) cone.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
      }
      const adj = Math.abs(me.x - a.x) + Math.abs(me.y - a.y) === 1;
      const inView = view.some(([x, y]) => x === me.x && y === me.y);
      if (disguised) {
        if ((adj || inView) && p.greet <= 0) {
          p.greet = 5000;
          void w.emote(p.id, '?', 500);
          pop(w, a.sprite.x, a.sprite.y - 30, Phaser.Utils.Array.GetRandom(['EVENING.', 'SHIFT CHANGE?', 'NICE HAT.', 'CARRY ON.', 'HMM.']), C.light, 1100);
        }
        continue;
      }
      if (adj || inView) {
        caught = true;
        void w.run('p4_caught', p.id);
        return;
      }
      // a warning: something at the edge of its sight
      const far = sight(w, a.x, a.y, a.dir, 6).slice(4);
      if (p.seen <= 0 && far.some(([x, y]) => x === me.x && y === me.y)) {
        p.seen = 2500;
        void w.emote(p.id, '?', 700);
      }
    }
  };
}

const STEALTH: Record<string, Script> = {
  decorate_p_guard(w) {
    setBadge(w, f(w, 'w5_disguised') ? 'DISGUISED' : null);
    stealth(w);
    return Promise.resolve();
  },

  async p4_caught(w, id: string) {
    w.face(id, (() => {
      const a = w.actor(id)!;
      return dirTo(a.x, a.y, w.player.x, w.player.y);
    })());
    w.sfx('alarm');
    await w.emote(id, '!', 700);
    await w.say(Phaser.Utils.Array.GetRandom(['HEY! YOU THERE!', 'PRISONER ON THE LOOSE!', 'OI! WHERE DO YOU THINK YOU\'RE GOING?']), 'GUARD', { pitch: 560 });
    await w.say('Two guards grab you by the collar and march you back to the elevator. "AND STAY THERE."');
    if (!f(w, 'w5_caught_tip')) {
      w.set('w5_caught_tip');
      await w.say('(The guards only see straight ahead - the lit tiles in front of them - and anyone who walks right up to them. Stay behind them, or behind things.)');
    }
    await w.warp('p_guard', P4.lobby.x, P4.lobby.y, 'down');
  },

  async p4_uniform(w) {
    if (f(w, 'w5_disguised')) return w.say('An empty coat stand.');
    await w.say('A coat stand. On it: a spare guard uniform, a hat with a skull on it, and a badge that says HELLO, MY NAME IS: GUARD.');
    if (!(await w.confirm('Put on the uniform?'))) return;
    w.sfx('poof');
    w.flash(0.4);
    w.set('w5_disguised');
    w.player.sheet = 'ch_player_guard';
    w.player.sprite.setTexture('ch_player_guard', 0);
    w.player.face('down');
    w.refresh();
    setBadge(w, 'DISGUISED');
    await w.say('It is three sizes too big. The hat covers one eye. Nobody here will look twice.');
    await w.say('(While you are DISGUISED, the guards will not stop you. The badge in the corner shows it is working.)');
    w.save();
  },

  async p4_doorguard(w) {
    const id = f(w, 'w5_door_ok') ? 'doorguard2' : 'doorguard';
    w.faceTo(id, 'player');
    if (f(w, 'w5_door_ok')) return w.say('Go on in. Mind the sergeant - he\'s losing again.', 'GUARD', { pitch: 700 });
    if (!f(w, 'w5_disguised')) {
      await w.say('BREAK ROOM. STAFF ONLY. ...Wait.', 'GUARD', { pitch: 700 });
      return SCRIPTS.p4_caught(w, id);
    }
    await w.emote(id, '?', 700);
    await w.say("...Never seen you before. New, are you? Nice hat.", 'GUARD', { pitch: 700 });
    await w.say('Go on in. The sergeant\'s in a mood. He just got a new toy.', 'GUARD', { pitch: 700 });
    w.set('w5_door_ok');
    w.refresh();
    w.save();
  },

  async p4_cards(w) {
    await w.say(Phaser.Utils.Array.GetRandom(['Got any sevens?', 'Go fish.', "I'm not cheating. I'm a skeleton. The ace was in my ribs the whole time."]), 'GUARD', { pitch: 760 });
  },

  async p4_office(w) {
    const first = !f(w, 'w5_d3');
    w.set('w5_d3');
    w.sfx('item');
    await w.say('A memo pinned to the office desk:');
    await w.say('TO ALL STAFF. HIGH SECURITY - WHEEL THREE IS 6. HE CHANGES THE OTHER TWO EVERY CENTURY. THIS ONE HE ALWAYS FORGETS.');
    if (first) {
      pop(w, w.player.sprite.x, w.player.sprite.y - 26, 'CLUE: WHEEL THREE = 6', C.white, 1600);
      await w.say('WHEEL THREE: 6. Got it.');
    }
    w.save();
  },
  async p4_roster(w) {
    await w.say('DUTY ROSTER. GATE: BONES. PATROL: BONES, GRIM, ALSO BONES. BREAK ROOM: SARGE (AGAIN).');
  },
  async p4_sleepboard(w) {
    await w.say('LIGHTS OUT AT 9. ANYONE CAUGHT SNORING WILL BE SENT DOWN TO THE MESS HALL AT SUPPER TIME.');
  },
  async p4_storage(w) {
    await w.say('Sacks of grey powder: INSTANT SLOP. JUST ADD WATER. OR DON\'T. IT IS SLOP EITHER WAY.');
  },
  async p4_security(w) {
    await w.say('A board of little bells, one for each floor. The bell for the mess hall is still trembling.');
  },
  async p4_weapons(w) {
    await w.say('A rack of spears. Every single one is blunt. Nobody up here has had to fight anything in a very long time.');
  },
};

// ================================================================== the sergeant

/** Your first spirit, as the sergeant shows it off: huge, dark, and much too bright in the eyes. */
function superShow(w: W, x: number, y: number) {
  const s = scene(w);
  const sp = w.sprite('ch_mini_' + w1(w), x, y, y + 1).setOrigin(0.5, 1).setScale(0.2).setTint(0x6a6a6a).setAlpha(0);
  const aura = w.sprite('fx_ring', x, y - 14, y).setScale(0.3).setAlpha(0);
  const pulse = s.tweens.add({ targets: aura, scale: 1.4, alpha: { from: 0.7, to: 0 }, duration: 700, repeat: -1 });
  return {
    sp,
    async grow() {
      await w.tw({ targets: sp, alpha: 1, scale: 2.2, duration: 900, ease: 'Back.easeOut' });
    },
    kill() {
      pulse.stop();
      sp.destroy();
      aura.destroy();
    },
  };
}

const SERGEANT: Record<string, Script> = {
  async p4_overhear(w) {
    if (f(w, 'w5_got1')) return;
    const off = bars(w);
    w.face('player', 'down');
    await w.camPan(21, 17, 900, 2);
    await w.say("...and I'm telling you, somebody got out of the cell block.", SARGE, { pitch: P_SARGE });
    await w.say('Nobody gets out of the cell block, Sarge.', 'GUARD', { pitch: 760 });
    await w.say("The Warden's a heap of bones. HE came down to the mess hall. Somebody's done SOMETHING.", 'GUARD', { pitch: 460 });
    await w.say('Whoever it is, they won\'t get far. Not past me. Not with what I\'ve got now.', SARGE, { pitch: P_SARGE });
    // he looks up
    w.faceTo('sergeant', 'player');
    await w.emote('sergeant', '?', 900);
    await w.wait(400);
    await w.say("...You. You're new. Never seen that face under that hat.", SARGE, { pitch: P_SARGE });
    await w.move('sergeant', ['up'], 300);
    w.faceTo('sergeant', 'player');
    await w.say('And those little things following you about...', SARGE, { pitch: P_SARGE });
    await w.say('Spirits, eh?', SARGE, { pitch: P_SARGE - 40 });
    await w.wait(500);
    await w.say('What do you think of this one I\'ve got?', SARGE, { pitch: P_SARGE });
    // the jar
    const sa = w.actor('sergeant')!;
    w.sfx('charge');
    const sh = superShow(w, sa.sprite.x + 20, sa.sprite.y + 4);
    w.flash(0.6);
    w.shake(900, 0.01);
    await sh.grow();
    w.sfx('roar');
    await w.emote('player', '!', 900);
    await w.say(`It's ${crName(w1(w))}. YOUR ${crName(w1(w))}. But it is huge, and dark, and its eyes are much too bright.`);
    await w.say(`It looks straight through you. It doesn't know you.`);
    w.emote(G, '!', 900);
    gSound(w);
    await w.say(`${gName(w)} plants itself beside you - and stays there. This fight is yours.`);
    sh.kill();
    await off();
    await w.startBattle(scFor(w1(w)) as never);
  },

  async p4_sergeant(w) {
    if (f(w, 'w5_got1')) return;
    if (!f(w, 'w5_overheard')) return w.say('Not now. I\'m losing.', SARGE, { pitch: P_SARGE });
    await w.say('BACK AGAIN? HA! It never gets tired. Well - not until afterwards.', SARGE, { pitch: P_SARGE });
    if (await w.confirm(`Fight the sergeant's supercharged ${crName(w1(w))}?`)) await w.startBattle(scFor(w1(w)) as never);
  },
};

/** After the rematch: what supercharging is, and your first spirit back. */
async function afterSuper(w: W, result: 'victory' | 'defeat') {
  await w.wait(400);
  if (result !== 'victory') {
    await w.say("HA! You see? SUPERCHARGED. Nothing beats it.", SARGE, { pitch: P_SARGE });
    if (await w.confirm('Try again?')) return w.startBattle(scFor(w1(w)) as never);
    return;
  }
  const id = w1(w);
  const off = bars(w);
  await w.camPan(21, 17, 600, 2);
  // the creature, drained
  const sa = w.actor('sergeant');
  const sp = w.sprite('ch_mini_' + id, (sa?.sprite.x ?? px(22)) + 20, (sa?.sprite.y ?? py(16)) + 4, 9000).setOrigin(0.5, 1).setScale(2.2).setTint(0x6a6a6a);
  w.sfx('debuff');
  await w.tw({ targets: sp, scale: 1, duration: 1400, ease: 'Sine.easeIn' });
  sp.clearTint();
  sp.setAlpha(0.7);
  await w.say(`${crName(id)} shrinks back down to its normal size. It sinks to the floor, shaking. It can barely hold its head up.`);
  await w.say("No... no, no, no. It was SUPERCHARGED.", SARGE, { pitch: P_SARGE });
  await w.emote('player', '?', 800);
  await w.say("You don't know? Ha. Supercharging. You push a spirit past its limits. Way past.", SARGE, { pitch: P_SARGE });
  await w.say("It gets bigger. Meaner. Stronger than it has any right to be.", SARGE, { pitch: P_SARGE });
  await w.say("And afterwards...", SARGE, { pitch: P_SARGE - 60 });
  await w.say("Afterwards it's got nothing left. Weak. Drained. Feels terrible, they say. Like being scooped out.", SARGE, { pitch: P_SARGE });
  await w.emote('player', '...', 900);
  await w.say("Is it cruel? Probably.", SARGE, { pitch: P_SARGE });
  await w.say("Of course I'm going to use it.", SARGE, { pitch: P_SARGE });
  w.shake(300, 0.006);
  await w.say('I WANT TO WIN!', SARGE, { pitch: P_SARGE + 80 });
  await w.wait(500);
  await w.say("...HE showed us how. Up there. Said there's another way to do it, without the price.", SARGE, { pitch: P_SARGE - 40 });
  await w.say("If the spirit trusts you enough. If you trust IT enough. Nobody's ever managed it. Nobody here, anyway.", SARGE, { pitch: P_SARGE - 40 });
  // it comes to you
  await w.tw({ targets: sp, x: w.player.sprite.x + 14, y: w.player.sprite.y, alpha: 1, duration: 900 });
  await w.emote('player', 'heart', 800);
  sp.destroy();
  await spiritRecovered(w, id);
  w.set('w5_got1');
  w.save();
  w.respawnParty();
  await w.say(`${crName(id)} is back with you - tired, but itself again. All three of your spirits are together.`);
  await w.say('Keep it. Useless to me for a week now, anyway.', SARGE, { pitch: P_SARGE });
  await w.say('We saw nothing.', 'GUARD', { pitch: 760 });
  await w.say('Nothing at all.', 'GUARD', { pitch: 460 });
  await off();
  w.sfx('chime');
  await w.say('Far away, by the elevator, a glass eye blinks open.');
}

const AFTER_SC: Record<string, Script> = Object.fromEntries(SC_STARTERS.map((st) => ['after_sc_' + st, (w: W, r: 'victory' | 'defeat') => afterSuper(w, r)]));

// ================================================================== HIGH SECURITY

const HIGH: Record<string, Script> = {
  decorate_p_high(w) {
    setBadge(w, null);
    if (f(w, 'w5_cell_open')) {
      w.setGround(P5.lock.x, P5.lock.y, T.W5_HIGH);
      w.setGround(P5.lock.x + 1, P5.lock.y, T.W5_HIGH);
    }
    if (f(w, 'w5_reaper_met')) {
      const r = w.spawn('reaper', 'raw:ow_reaper', 12, 9, 'right');
      r.sprite.setScale(1.5).setFrame(4);
      glow(w, r.sprite, 46);
    }
    return Promise.resolve();
  },

  async p5_rescue_talk(w) {
    const id = w.actor('rescue') ? 'rescue' : 'rescue_old';
    w.faceTo(id, 'player');
    if (friendName(w) === 'CARLO') {
      await w.say("YOU! It's YOU! I knew it! Well - I hoped it. Mostly I panicked.", 'CARLO', { pitch: friendPitch(w) });
      await w.say("There's a lock. Three wheels. They never let me see the numbers. Get me OUT of here!", 'CARLO', { pitch: friendPitch(w) });
    } else {
      await w.say("Well, look at you. Walking around in HIS prison like you own the place.", 'OLD MAN', { pitch: friendPitch(w) });
      await w.say("That lock wants three numbers. I've had a long time to think, but nobody ever told me them.", 'OLD MAN', { pitch: friendPitch(w) });
    }
  },

  async p5_emptycell(w) {
    await w.say('An empty cell. On the floor, a single grey feather.');
  },

  async p5_lock(w) {
    if (f(w, 'w5_cell_open')) return;
    const c = lockClues(w.state);
    await w.say(`A huge lock with three heavy number wheels. The numbers you have found so far: ${c}`);
    if (c.includes('?')) await w.say('Staff here write things down. Boards, walls, desks... on the floors below.');
    if (!(await comboLock(w))) return;
    // it opens
    w.sfx('unlock');
    w.shake(400, 0.006);
    await w.wait(400);
    w.sfx('clank');
    w.set('w5_cell_open');
    w.music(null);
    w.setGround(P5.lock.x, P5.lock.y, T.W5_HIGH);
    w.setGround(P5.lock.x + 1, P5.lock.y, T.W5_HIGH);
    w.refresh();
    w.sfx('door');
    w.save();
    await w.say('Clunk. Clunk. CLUNK. The cell door swings open.');
    await SCRIPTS.w5_rescue(w);
  },

  async w5_rescue(w) {
    const id = w.actor('rescue') ? 'rescue' : 'rescue_old';
    const fr = w.actor(id);
    // the friend walks out (a temporary copy: the cell's prisoner is gone once rescued)
    const sprite = friendName(w) === 'CARLO' ? 'carlo' : 'oldman4';
    const x0 = fr?.x ?? 23;
    const y0 = fr?.y ?? 4;
    w.set('w5_rescued');
    w.refresh();
    w.spawn('friend', sprite, x0, y0, 'down');
    await w.move('friend', ['down', 'down', 'down', 'down'], 220);
    w.faceTo('friend', 'player');
    w.faceTo('player', 'friend');
    w.sfx('cheer');
    await w.emote('friend', 'heart', 700);
    await w.say('AWESOME!', friendName(w), { pitch: friendPitch(w) });
    await w.say("LET'S GET OUT OF HERE!", friendName(w), { pitch: friendPitch(w) });
    w.save();
    await SCRIPTS.w5_reaper(w);
  },

  /** He arrives. Your friend runs. You stay. */
  async w5_reaper(w) {
    const s = scene(w);
    if (!w.actor('friend')) w.spawn('friend', friendName(w) === 'CARLO' ? 'carlo' : 'oldman4', 23, 8, 'left');
    w.music(null);
    // the lights fail
    for (let i = 0; i < 5; i++) {
      w.setDark(0.92, 60);
      w.sfx('ghost');
      await w.wait(110 + i * 30);
      w.setDark(0.55, 60);
      await w.wait(180);
    }
    w.setDark(0.8, 600);
    w.sfx('wail');
    await w.say('Every light on the floor flickers at once. The air goes cold enough to bite.');
    await w.emote('friend', '!', 900);
    await w.say("Oh no. Oh no, no, no. I KNOW that feeling. That's HIM.", friendName(w), { pitch: friendPitch(w) });
    w.faceTo('friend', 'player');
    await w.say("YOU'VE GOT THIS!", friendName(w), { pitch: friendPitch(w) + 80 });
    await w.say('GOOD LUCK!', friendName(w), { pitch: friendPitch(w) + 80 });
    // and runs for the elevator
    const fr = w.actor('friend')!;
    const path: Dir[] = [];
    let x = fr.x;
    let y = fr.y;
    path.push('down');
    y++;
    while (x > 4) {
      path.push('left');
      x--;
    }
    while (y > 2) {
      path.push('up');
      y--;
    }
    w.prop('lift')?.setTexture('p5_lift_open');
    await w.move('friend', path, 90);
    w.remove('friend');
    w.prop('lift')?.setTexture('p5_lift');
    w.sfx('slam');
    w.sfx('rumble');
    w.shake(700, 0.004);
    await w.wait(600);
    await w.say('The elevator rattles away down the shaft. Without you.');
    await w.emote('player', '...', 1200);
    // you, three spirits, and the guardian
    for (const id of ['follower', 'follower2', G]) void w.emote(id, '!', 800);
    await w.wait(900);
    const off = bars(w);
    // he comes up out of the floor
    await w.camPan(12, 8, 1400, 1.4);
    w.setDark(0.9, 1200);
    w.sfx('heartbeat');
    await w.wait(900);
    const smoke: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 7; i++) {
      const im = w.sprite('p5_soul', px(12) + Phaser.Math.Between(-22, 22), py(9) - 4, py(9) + 2).setTint(0x2a2a2a).setScale(1.6).setAlpha(0);
      smoke.push(im as unknown as Phaser.GameObjects.Image);
      s.tweens.add({ targets: im, alpha: 0.9, y: im.y - 30, duration: 1600, delay: i * 120 });
    }
    w.sfx('rumble');
    w.shake(2200, 0.006);
    await w.wait(900);
    const rp = w.sprite('ow_reaper', px(12), py(9) + 30, py(9) + 1).setOrigin(0.5, 1).setScale(1.5).setFrame(0).setAlpha(0);
    const unglow = glow(w, rp, 46);
    const mask = s.add.rectangle(px(12), py(9) + 60, 120, 60, C.black, 0).setDepth(0);
    void mask;
    await w.tw({ targets: rp, alpha: 1, y: py(9), duration: 2600, ease: 'Sine.easeOut' });
    smoke.forEach((m) => s.tweens.add({ targets: m, alpha: 0, duration: 900, onComplete: () => m.destroy() }));
    w.sfx('heartbeat');
    // the camera climbs him, slowly, from the hem to the hood
    await camPx(w, px(12), py(9) - 4, 1200, 3.2);
    await w.wait(600);
    w.sfx('heartbeat');
    await camPx(w, px(12), py(9) - 40, 3200, 3.6, 'Sine.easeInOut');
    await w.wait(900);
    // he is angry
    rp.setFrame(3);
    w.music('menace');
    w.sfx('boom');
    w.flash(0.8);
    w.shake(1600, 0.022);
    const ring = w.sprite('fx_ring', px(12), py(9) - 10, 9600).setScale(0.3).setAlpha(1);
    s.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 1200, onComplete: () => ring.destroy() });
    w.setDark(0.95, 300);
    await camPx(w, px(12), py(9) - 26, 260, 2.2, 'Quad.easeOut');
    await w.wait(700);
    const card = await bigWords(w, 'THE GRIM REAPER', 'COLLECTOR OF SOULS', 2400);
    card();
    // and you, at the far end of the hall
    await camPx(w, (px(12) + w.player.sprite.x) / 2, py(8), 1600, 1.5);
    rp.setFrame(4);
    w.sfx('wail');
    await w.say('He says nothing. He does not need to. You can feel how angry he is in your teeth.');
    const g = w.actor(G);
    if (g) {
      g.sprite.setFrame(2);
      gSound(w);
    }
    await w.say(`${gName(w)} steps in front of you. Your three spirits do too.`);
    await w.wait(800);
    await off();
    w.set('w5_reaper_met');
    w.save();
    // PART TWO: the guardian hears something, and the fight begins (story/w6_final.ts)
    await SCRIPTS.w6_begin(w, { rp, unglow });
  },
};

// ================================================================== developer tests

const DEV: Record<string, Script> = {
  async dev_fight_sc(w) {
    await w.wait(300);
    await w.startBattle(scFor(w1(w)) as never);
  },
  /** The island's three spirits as your own team, against the Warden. */
  async dev_w5_spirits(w) {
    w.state.creature = 'wispmane';
    w.state.creature2 = 'viperwind';
    w.state.extra = ['flamora'];
    w.set('dev_w5_test');
    w.respawnParty();
    await w.say('(DEV: Wispmane, Viperwind and Flamora are your team. Fighting the Skeleton Warden.)');
    await w.startBattle('skelwarden');
  },
};

export const W5_UPPER: Record<string, Script> = { ...STEALTH, ...SERGEANT, ...AFTER_SC, ...HIGH, ...DEV };
