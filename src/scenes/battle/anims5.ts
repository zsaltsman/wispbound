import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { playerHits, bossHits, ring, burst, pose, idle } from './anims';

// The Reaper's prison: every attack of the Skeleton Warden and of the five supercharged
// spirits, and the moves of Wispmane, Viperwind and Flamora once they fight for you.
// Bodies are single painted sprites (frames: 0 rest, 1 strike, 2 wind-up, 3 spent,
// 4 enraged rest), so attacks move the whole body and throw the prison at you.

type S = BattleScene;
type Pt = { x: number; y: number };

const GROUND = PLAYER_Y + 8;
const PRISON = new Set(['skelwarden', 'sc_booheet', 'sc_shipwraith', 'sc_hauntcorn', 'sc_umbrawl', 'sc_tickraith']);

/** Things flying from a to b, one per hit, landing a hit each. */
async function volley(s: S, key: string, from: () => Pt, to: () => Pt, res: ActionResult, gap = 110, arc = 30, sfx = 'swish', spin = false) {
  const shots: Promise<void>[] = [];
  for (let i = 0; i < res.hits.length; i++) {
    sound.play(sfx);
    const t = to();
    shots.push(
      s.projectile(key, from(), { x: t.x + (Math.random() - 0.5) * 26, y: t.y + (Math.random() - 0.5) * 22 }, 380, arc + (i % 3) * 10, { trail: true, spin } as any).then(() => {
        s.hitPlayer(res.hits[i], i === res.hits.length - 1);
      })
    );
    await s.wait(gap);
  }
  await Promise.all(shots);
}

/** A slow dark ring closing around a point. */
function closeIn(s: S, p: Pt, key = 'fx_ring', ms = 500) {
  const r = s.w(s.add.image(p.x, p.y, key).setScale(3).setAlpha(0), 62);
  s.tweens.add({ targets: r, scale: 0.6, alpha: 1, duration: ms, ease: 'Quad.easeIn', onComplete: () => s.tweens.add({ targets: r, alpha: 0, duration: 200, onComplete: () => r.destroy() }) });
}

/** A glyph that appears over a point, hangs, and fades (shields, curses, clocks). */
function glyph(s: S, p: Pt, key: string, scale = 1.6, hold = 600, tint?: number) {
  const g = s.w(s.add.image(p.x, p.y, key).setScale(0.2).setAlpha(0), 64);
  if (tint !== undefined) g.setTint(tint);
  s.tweens.add({ targets: g, scale, alpha: 0.95, duration: 260, ease: 'Back.easeOut' });
  s.tweens.add({ targets: g, alpha: 0, duration: 300, delay: 260 + hold, onComplete: () => g.destroy() });
}

/** Lines of rain (or wind) slanting across the arena. */
function weather(s: S, key: string, n = 24, ms = 700) {
  for (let i = 0; i < n; i++) {
    const o = s.w(s.add.image(Math.random() * W, -20, key).setAngle(20), 63);
    s.tweens.add({ targets: o, x: o.x - 60, y: GROUND, duration: ms * (0.7 + Math.random() * 0.6), delay: i * 30, onComplete: () => o.destroy() });
  }
}

// ============================================================ the prison's bosses

export async function bossAnim5(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k || !PRISON.has(k.kind)) return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  const frame = (n: number) => k.core.setFrame(n === 0 ? k.restFrame() : n);
  const finish = async (ms = 400) => {
    k.core.setFrame(k.restFrame());
    await s.tw({ targets: k.off, x: 0, y: 0, rot: 0, duration: ms, ease: 'Sine.easeInOut' });
    await s.wait(150);
  };
  const reach = (gap = 70) => feet().x + gap - (k.body.x - k.off.x);
  const mid = () => s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 280);
  const lunge = async (gap: number, sfx: string, heavy = false, hitGap = 120) => {
    await mid();
    frame(2);
    await s.tw({ targets: k.off, x: 20, duration: 220, ease: 'Sine.easeOut' });
    frame(1);
    sound.play(sfx);
    await s.tw({ targets: k.off, x: reach(gap), duration: 200, ease: 'Quad.easeIn' });
    s.shake(heavy ? 7 : 4, 300);
    await playerHits(s, res.hits, hitGap, heavy);
    await finish(380);
  };
  /** The big ones: the light goes, it gathers, the screen inverts, then everything lands. */
  const finisher = async (charge: () => Promise<void>, land: () => Promise<void>) => {
    await s.camFocus(k.eye(), 1.8, 400);
    frame(2);
    s.setDarkness(0.45);
    sound.play('charge');
    await charge();
    frame(1);
    await s.invert(120);
    s.flash(0.8, 300);
    await land();
    s.setDarkness(0);
    await finish(500);
  };

  switch (res.id) {
    // ================================================================ THE SKELETON WARDEN
    case 'nightstick':
      await lunge(56, 'hammer', true);
      return true;
    case 'key_lash': {
      await mid();
      frame(2);
      for (let i = 0; i < 5; i++) {
        sound.play('rattle');
        await s.wait(70);
      }
      frame(1);
      await volley(s, 'fx_link', () => k.eye(), P, res, 120, 18, 'chain', true);
      await finish();
      return true;
    }
    case 'lockdown': {
      await s.camFocus(k.center(), 1.5, 300);
      frame(2);
      sound.play('slam');
      glyph(s, k.center(), 'fx_shield', 2.4, 700);
      s.shake(4, 300);
      await s.wait(500);
      sound.play('shield');
      await finish();
      return true;
    }
    case 'shackles': {
      await mid();
      frame(1);
      sound.play('chain');
      await s.projectile('fx_link', k.eye(), P(), 360, 10, { trail: true } as any);
      closeIn(s, P(), 'fx_ring', 300);
      sound.play('clank');
      await playerHits(s, res.hits, 0);
      sound.play('debuff');
      await finish();
      return true;
    }
    case 'bone_rattle': {
      await s.camFocus(k.center(), 1.4, 300);
      for (let i = 0; i < 8; i++) {
        frame(i % 2 ? 1 : 2);
        sound.play('rattle');
        await s.tw({ targets: k.off, x: i % 2 ? 4 : -4, duration: 50, yoyo: true });
      }
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 160, () => ring(s, k.center(), 'fx_ring', 3, 500));
      s.camFocus(P(), 1.3, 300);
      await playerHits(s, res.hits, 0);
      sound.play('debuff');
      await finish();
      return true;
    }
    case 'solitary': {
      // he reaches across the room, picks you up, and shuts you away
      await mid();
      frame(2);
      sound.play('creak');
      await s.wait(300);
      frame(1);
      const h = s.w(s.add.image(k.eye().x, k.eye().y + 10, 'fx_hand').setScale(1.4), 64);
      await s.tw({ targets: h, x: P().x + 10, y: P().y, duration: 260, ease: 'Quad.easeIn' });
      sound.play('slam');
      s.setDarkness(0.6);
      s.shake(8, 500);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: h, alpha: 0, duration: 300 });
      h.destroy();
      await s.wait(300);
      s.setDarkness(0);
      await finish();
      return true;
    }
    case 'lights_out':
      await finisher(
        async () => {
          for (let i = 0; i < 3; i++) {
            sound.play('rattle');
            s.setDarkness(0.45 + i * 0.15);
            await s.wait(380);
          }
        },
        async () => {
          s.setDarkness(0.92);
          sound.play('hammer');
          s.shake(10, 600);
          for (let i = 0; i < 4; i++) s.boom(P().x + (Math.random() - 0.5) * 40, P().y + (Math.random() - 0.5) * 30, 1.2);
          await playerHits(s, res.hits, 0, true);
          await s.wait(400);
        }
      );
      return true;

    // ================================================================ SUPERCHARGED BOOHEET
    case 'spook_storm': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      sound.play('ghost');
      await volley(s, 'fx_bolt', () => ({ x: k.eye().x + (Math.random() - 0.5) * 50, y: k.eye().y + (Math.random() - 0.5) * 40 }), P, res, 95, 40, 'ghost');
      await finish();
      return true;
    }
    case 'dread_howl': {
      await s.camFocus(k.eye(), 1.6, 300);
      frame(1);
      sound.play('wail');
      for (let i = 0; i < 4; i++) s.time.delayedCall(i * 140, () => ring(s, k.eye(), 'fx_ringL', 4, 700));
      s.shake(5, 700);
      await s.wait(400);
      await playerHits(s, res.hits, 0);
      sound.play('debuff');
      await finish();
      return true;
    }
    case 'smother': {
      await mid();
      frame(2);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(20), y: -40, duration: 420, ease: 'Sine.easeIn' });
      frame(1);
      s.setDarkness(0.55);
      await s.tw({ targets: k.off, y: 0, scale: 1.15, duration: 160, ease: 'Quad.easeIn' });
      sound.play('heavy');
      s.shake(7, 400);
      await playerHits(s, res.hits, 0, true);
      s.setDarkness(0);
      await s.tw({ targets: k.off, scale: 1, duration: 200 });
      await finish();
      return true;
    }
    case 'peekaboo_x': {
      for (let i = 0; i < 3; i++) {
        k.core.setAlpha(0);
        sound.play('ghost');
        await s.wait(160);
        k.off.x = reach(40) * (i === 2 ? 1 : Math.random());
        k.core.setAlpha(1);
        frame(1);
        await s.wait(120);
      }
      s.flash(0.4, 200);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'night_terror_x':
      await finisher(
        async () => {
          for (let i = 0; i < 10; i++) {
            const e = s.w(s.add.image(Math.random() * W, ARENA_CY - 60 + Math.random() * 80, 'fx_skull').setAlpha(0), 64);
            s.tweens.add({ targets: e, alpha: 0.9, duration: 200, delay: i * 60, yoyo: true, hold: 400, onComplete: () => e.destroy() });
          }
          sound.play('wail');
          await s.wait(900);
        },
        async () => {
          s.setDarkness(0.85);
          sound.play('scream');
          s.shake(10, 700);
          await playerHits(s, res.hits, 0, true);
          await s.wait(300);
        }
      );
      return true;

    // ================================================================ SUPERCHARGED SHIPWRAITH
    case 'broadside_x': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      const gun = () => ({ x: k.body.x - 40 + (Math.random() - 0.5) * 30, y: k.body.y - 40 - Math.random() * 50 });
      await volley(s, 'fx_ball', gun, P, res, 90, 46, 'cannon');
      s.shake(6, 400);
      await finish();
      return true;
    }
    case 'barnacle_bastion': {
      await s.camFocus(k.center(), 1.4, 300);
      frame(2);
      sound.play('stone');
      burst(s, k.center(), 'fx_dotM', 16, 50, 600);
      glyph(s, k.center(), 'fx_shield', 2.6, 700);
      await s.wait(700);
      await finish();
      return true;
    }
    case 'batten_all': {
      await s.camFocus(k.center(), 1.4, 300);
      for (let i = 0; i < 4; i++) {
        sound.play('slam');
        s.shake(3, 120);
        await s.wait(160);
      }
      sound.play('creak');
      glyph(s, k.center(), 'fx_bigcannon', 1.4, 700);
      await s.wait(600);
      await finish();
      return true;
    }
    case 'sunken_anchor': {
      await s.camFocus(P(), 1.4, 300);
      sound.play('chain');
      const an = s.w(s.add.image(P().x, -60, 'fx_anchor').setScale(1.8), 64);
      await s.tw({ targets: an, y: P().y, duration: 420, ease: 'Quad.easeIn' });
      sound.play('anchor');
      s.boom(P().x, P().y + 10, 1.8);
      s.shake(10, 500);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: an, alpha: 0, duration: 300 });
      an.destroy();
      await finish();
      return true;
    }
    case 'dead_fleet':
      await finisher(
        async () => {
          sound.play('horn');
          for (let i = 0; i < 3; i++) {
            const g = s.w(s.add.image(W + 40, ARENA_CY - 70 + i * 26, 'fx_sailor').setAlpha(0.6).setFlipX(true), 20);
            s.tweens.add({ targets: g, x: W - 60 - i * 40, duration: 900, ease: 'Sine.easeOut' });
            s.tweens.add({ targets: g, alpha: 0, duration: 400, delay: 2600, onComplete: () => g.destroy() });
          }
          await s.wait(1000);
        },
        async () => {
          await volley(s, 'fx_ball', () => ({ x: W - 40 - Math.random() * 120, y: ARENA_CY - 80 + Math.random() * 60 }), P, res, 70, 60, 'cannon');
          s.shake(10, 600);
        }
      );
      return true;

    // ================================================================ SUPERCHARGED HAUNTCORN
    case 'straw_scythe': {
      await mid();
      frame(2);
      await s.tw({ targets: k.off, x: reach(60), duration: 240, ease: 'Quad.easeIn' });
      for (let i = 0; i < res.hits.length; i++) {
        frame(i % 2 ? 2 : 1);
        sound.play('slice');
        const sl = s.w(s.add.image(P().x + 10, P().y, 'fx_slash').setFlipX(i % 2 === 0).setRotation(i % 2 ? -0.4 : 0.4).setScale(1.4), 63);
        s.tweens.add({ targets: sl, alpha: 0, scale: 1.8, duration: 260, onComplete: () => sl.destroy() });
        s.hitPlayer(res.hits[i], i === res.hits.length - 1);
        await s.wait(150);
      }
      await finish();
      return true;
    }
    case 'blood_moon': {
      await s.camTo(W / 2, ARENA_CY - 40, 0.85, 400);
      sound.play('wail');
      const m = s.w(s.add.image(k.body.x + 30, ARENA_CY - 90, 'fx_moon').setScale(0.3).setAlpha(0).setTint(0x8a8a8a), 15);
      await s.tw({ targets: m, scale: 2.2, alpha: 0.9, duration: 900, ease: 'Sine.easeOut' });
      s.setDarkness(0.3);
      frame(1);
      sound.play('buff');
      await s.wait(500);
      s.tweens.add({ targets: m, alpha: 0, duration: 800, delay: 400, onComplete: () => m.destroy() });
      s.setDarkness(0);
      await finish();
      return true;
    }
    case 'corn_maze': {
      await s.camFocus(P(), 1.4, 300);
      sound.play('grow');
      for (let i = 0; i < 7; i++) {
        const c = s.w(s.add.image(P().x - 48 + i * 16, GROUND + 6, 'fx_root').setOrigin(0.5, 1).setScale(0.8, 0.1), 58);
        s.tweens.add({ targets: c, scaleY: 1.4, duration: 200, delay: i * 40, ease: 'Back.easeOut' });
        s.tweens.add({ targets: c, alpha: 0, duration: 300, delay: 900, onComplete: () => c.destroy() });
      }
      await s.wait(400);
      await playerHits(s, res.hits, 0);
      sound.play('debuff');
      await finish();
      return true;
    }
    case 'crow_swarm': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      sound.play('caw');
      await volley(s, 'fx_feather', () => ({ x: k.eye().x, y: k.eye().y - 20 }), P, res, 70, 40, 'crow', true);
      await finish();
      return true;
    }
    case 'hallowed_reaping':
      await finisher(
        async () => {
          const m = s.w(s.add.image(W / 2, ARENA_CY - 70, 'fx_moon').setScale(3).setAlpha(0), 15);
          s.tweens.add({ targets: m, alpha: 0.8, duration: 700 });
          s.tweens.add({ targets: m, alpha: 0, duration: 600, delay: 2400, onComplete: () => m.destroy() });
          sound.play('wail');
          await s.wait(900);
        },
        async () => {
          await s.tw({ targets: k.off, x: reach(30), duration: 200, ease: 'Quad.easeIn' });
          sound.play('slice');
          const sl = s.w(s.add.image(P().x, P().y, 'fx_darkblade').setScale(2.4), 64);
          s.tweens.add({ targets: sl, rotation: -1.6, alpha: 0, duration: 500, onComplete: () => sl.destroy() });
          s.shake(10, 600);
          await playerHits(s, res.hits, 0, true);
          await s.wait(300);
        }
      );
      return true;

    // ================================================================ SUPERCHARGED UMBRAWL
    case 'parasol_lance': {
      await mid();
      frame(2);
      sound.play('charge');
      await s.tw({ targets: k.off, x: 30, duration: 300, ease: 'Sine.easeOut' });
      frame(1);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(30), duration: 140, ease: 'Quad.easeIn' });
      s.boom(P().x + 6, P().y, 1.4);
      s.shake(8, 400);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'cyclone_vortex': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      sound.play('spin');
      for (let i = 0; i < 3; i++) await s.tw({ targets: k.off, rot: 0.3, duration: 90, yoyo: true });
      for (let i = 0; i < res.hits.length; i++) {
        const w = s.w(s.add.image(P().x + (Math.random() - 0.5) * 30, P().y, 'fx_whirl').setScale(1.4), 63);
        s.tweens.add({ targets: w, angle: 360, alpha: 0, duration: 400, onComplete: () => w.destroy() });
        sound.play('whirl');
        s.hitPlayer(res.hits[i], i === res.hits.length - 1);
        await s.wait(140);
      }
      await finish();
      return true;
    }
    case 'canopy_dome': {
      await s.camFocus(k.center(), 1.3, 300);
      frame(2);
      sound.play('shield');
      glyph(s, { x: k.center().x, y: k.center().y - 30 }, 'fx_canopy', 2.8, 800);
      await s.wait(700);
      await finish();
      return true;
    }
    case 'lightning_rod': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.9, 300);
      frame(1);
      sound.play('thunder');
      s.flash(0.7, 200);
      const b = s.w(s.add.image(P().x, P().y - 80, 'fx_beam').setScale(1, 2.4).setAngle(90), 64);
      s.tweens.add({ targets: b, alpha: 0, duration: 400, onComplete: () => b.destroy() });
      s.shake(6, 300);
      await playerHits(s, res.hits, 0, true);
      sound.play('debuff');
      await finish();
      return true;
    }
    case 'monsoon_end':
      await finisher(
        async () => {
          sound.play('thunder');
          weather(s, 'fx_rain', 40, 800);
          await s.wait(900);
          sound.play('thunder');
          s.flash(0.6, 200);
          await s.wait(400);
        },
        async () => {
          weather(s, 'fx_rain', 60, 500);
          for (let i = 0; i < 3; i++) {
            sound.play('thunder');
            s.flash(0.8, 120);
            await s.wait(140);
          }
          s.boom(P().x, P().y, 2);
          s.shake(12, 700);
          await playerHits(s, res.hits, 0, true);
          await s.wait(300);
        }
      );
      return true;

    // ================================================================ SUPERCHARGED TICKRAITH
    case 'pendulum_wreck': {
      await mid();
      frame(2);
      sound.play('tickclock');
      await s.tw({ targets: k.off, rot: 0.25, duration: 360, ease: 'Sine.easeOut' });
      frame(1);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(40), rot: -0.2, duration: 200, ease: 'Quad.easeIn' });
      sound.play('impact');
      s.shake(9, 400);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'brass_tomb': {
      await s.camFocus(k.center(), 1.4, 300);
      frame(2);
      sound.play('clank');
      glyph(s, k.center(), 'fx_gear', 2.4, 700);
      glyph(s, k.center(), 'fx_shield', 2.2, 700);
      await s.wait(700);
      await finish();
      return true;
    }
    case 'time_stop': {
      await s.camFocus(P(), 1.6, 300);
      sound.play('freeze');
      glyph(s, P(), 'fx_clock', 1.8, 600);
      await s.invert(120);
      await playerHits(s, res.hits, 0);
      sound.play('tick');
      await finish();
      return true;
    }
    case 'rewind_x': {
      await s.camFocus(k.center(), 1.5, 300);
      sound.play('rewind');
      const h = s.w(s.add.image(k.center().x, k.center().y, 'fx_handL').setOrigin(0.5, 1).setScale(2), 64);
      await s.tw({ targets: h, angle: -1080, duration: 900, ease: 'Sine.easeInOut' });
      h.destroy();
      sound.play('heal');
      await finish();
      return true;
    }
    case 'midnight_toll':
      await finisher(
        async () => {
          glyph(s, { x: W / 2, y: ARENA_CY - 50 }, 'fx_clock', 3, 1600);
          for (let i = 0; i < 4; i++) {
            sound.play('tickclock');
            await s.wait(320);
          }
        },
        async () => {
          for (let i = 0; i < res.hits.length; i++) {
            sound.play('bell');
            s.flash(0.4, 100);
            s.shake(5, 150);
            s.hitPlayer(res.hits[i], i === res.hits.length - 1);
            await s.wait(110);
          }
        }
      );
      return true;
  }
  return false;
}

// ============================================================ Wispmane, Viperwind, Flamora (yours)

export async function playerAnim5(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const P = () => a.playerCenter();
  const T = () => a.hullPoint();
  const dash = async (sfx: string, gap = 90) => {
    await s.camFocus(P(), 1.5, 220);
    pose(s, 4);
    sound.play(sfx);
    await s.tw({ targets: a.playerOffset, x: 130, duration: 220, ease: 'Quad.easeIn' });
    for (let i = 0; i < res.hits.length; i++) {
      sound.play('hit');
      s.hitBoss(res.hits[i]);
      await s.wait(gap);
    }
    await s.tw({ targets: a.playerOffset, x: 0, duration: 300 });
    idle(s);
  };
  const self = async (key: string, sfx: string, tint?: number) => {
    await s.camFocus(P(), 1.8, 250);
    pose(s, 4);
    sound.play(sfx);
    ring(s, P(), 'fx_ring', 1.8, 500);
    glyph(s, P(), key, 1.6, 600, tint);
    await s.wait(700);
    idle(s);
  };
  switch (res.id) {
    // ---------------------------------------------------- WISPMANE: claws, dread, the dark
    case 'w_claws':
      await dash('slice', 140);
      return true;
    case 'w_roar': {
      await s.camFocus(P(), 1.6, 250);
      pose(s, 4);
      sound.play('roar');
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 150, () => ring(s, P(), 'fx_ringL', 4, 600));
      s.shake(5, 600);
      await s.wait(400);
      s.camFocus(T(), 1.3, 300);
      await bossHits(s, res.hits, 0);
      sound.play('debuff');
      idle(s);
      return true;
    }
    case 'w_grasp': {
      await s.camFocus(T(), 1.4, 300);
      pose(s, 4);
      sound.play('ghost');
      for (let i = 0; i < 4; i++) {
        const h = s.w(s.add.image(T().x - 36 + i * 24, GROUND + 8, 'fx_darkhand').setOrigin(0.5, 1).setScale(1, 0), 59);
        s.tweens.add({ targets: h, scaleY: 1.3, duration: 220, delay: i * 60, ease: 'Back.easeOut' });
        s.tweens.add({ targets: h, scaleY: 0, alpha: 0, duration: 260, delay: 800 + i * 60, onComplete: () => h.destroy() });
      }
      await s.wait(400);
      await bossHits(s, res.hits, 0);
      sound.play('debuff');
      await s.wait(400);
      idle(s);
      return true;
    }
    case 'w_wrath': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      s.setDarkness(0.5);
      sound.play('charge');
      await s.wait(500);
      sound.play('roar');
      await s.invert(120);
      await s.tw({ targets: a.playerOffset, x: 150, duration: 200, ease: 'Quad.easeIn' });
      s.boom(T().x, T().y, 2);
      s.shake(10, 600);
      await bossHits(s, res.hits, 0);
      burst(s, T(), 'fx_dotM', 14, 60, 600);
      s.setDarkness(0);
      await s.tw({ targets: a.playerOffset, x: 0, duration: 400 });
      idle(s);
      return true;
    }
    // ---------------------------------------------------- VIPERWIND: wind and walls
    case 'v_gale': {
      await s.camFocus(P(), 1.5, 250);
      pose(s, 4);
      sound.play('whoosh');
      for (let i = 0; i < 8; i++) {
        const g = s.w(s.add.image(P().x + 10, P().y + (Math.random() - 0.5) * 40, 'fx_gust'), 63);
        s.tweens.add({ targets: g, x: T().x, y: T().y + (Math.random() - 0.5) * 40, alpha: 0, duration: 380, delay: i * 40, onComplete: () => g.destroy() });
      }
      await s.wait(300);
      await bossHits(s, res.hits, 120);
      glyph(s, P(), 'fx_shield', 1.2, 400);
      sound.play('shield');
      idle(s);
      return true;
    }
    case 'v_barrier':
      await self('fx_shield', 'shield');
      return true;
    case 'v_tailwind':
      await self('fx_whirl', 'heal');
      return true;
    case 'v_tempest': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      pose(s, 4);
      sound.play('thunder');
      weather(s, 'fx_gust', 30, 500);
      await s.wait(500);
      s.boom(T().x, T().y, 1.8);
      s.shake(9, 500);
      await bossHits(s, res.hits, 0);
      glyph(s, P(), 'fx_shield', 2, 700);
      sound.play('shield');
      await s.wait(500);
      idle(s);
      return true;
    }
    // ---------------------------------------------------- FLAMORA: fire, and coming back
    case 'f_talon':
      await dash('fire', 100);
      return true;
    case 'f_veil':
      await self('fx_shield', 'heal', C.light);
      return true;
    case 'f_cry': {
      await s.camFocus(P(), 1.6, 250);
      pose(s, 4);
      sound.play('screech');
      for (let i = 0; i < 2; i++) s.time.delayedCall(i * 160, () => ring(s, P(), 'fx_ringL', 3.5, 600));
      await s.wait(400);
      await bossHits(s, res.hits, 0);
      sound.play('heal');
      idle(s);
      return true;
    }
    case 'f_nova': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('fire');
      s.flash(0.4, 200);
      await s.wait(500);
      await s.invert(120);
      sound.play('boom');
      s.camFocus(T(), 1.2, 300);
      for (let i = 0; i < 5; i++) s.boom(T().x + (Math.random() - 0.5) * 50, T().y + (Math.random() - 0.5) * 40, 1.4);
      s.shake(10, 600);
      await bossHits(s, res.hits, 0);
      sound.play('heal');
      await s.wait(500);
      idle(s);
      return true;
    }
  }
  return false;
}
