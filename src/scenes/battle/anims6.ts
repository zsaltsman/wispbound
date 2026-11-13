import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_X, PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { W, ARENA_CY } from '../../constants';
import { playerHits, ring, burst } from './anims';

// The God of Death's moves, every form. Each one has its own wind-up (the telegraph shows
// it a turn ahead) and its own way of landing.
//   gr1 frames: 0 idle, 1 raised, 2 swing, 3 reaching hand, 4 risen, 5 fallen, 6 eyes lit
//   gr2 frames: 0 idle, 1 flex, 2 punch, 3 overhead, 4 slam, 5 kneel, 6 furious
//   gr3/gr4:    0 idle, 1 crossed, 2 swung, 3 crown flare, 4 hunched; plus six legs and wings

type S = BattleScene;
type Pt = { x: number; y: number };
const GROUND = PLAYER_Y + 8;
const FORMS = new Set(['gr1', 'gr2', 'gr3', 'gr4']);

export async function bossAnim6(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k || !FORMS.has(k.kind)) return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  const frame = (n: number) => k.core.setFrame(n);
  const finish = async (ms = 420) => {
    k.releaseAll();
    k.holdWings(null);
    k.core.setFrame(k.restFrame());
    await s.tw({ targets: k.off, x: 0, y: 0, rot: 0, duration: ms, ease: 'Sine.easeInOut' });
    s.setDarkness(0);
    await s.wait(140);
  };
  const reach = (gap = 70) => feet().x + gap - (k.body.x - k.off.x);
  const mid = () => s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 280);
  const slash = (at: Pt, angle: number, scale = 2.2) => {
    const o = s.w(s.add.image(at.x, at.y, 'fx_darkblade').setAngle(angle).setScale(scale * 0.6).setAlpha(0.95), 66);
    s.tweens.add({ targets: o, scale, alpha: 0, duration: 320, onComplete: () => o.destroy() });
  };
  /** the bench: where the others stand (splash damage lands there too) */
  const bench = () => [a.reserve, a.reserve2, a.reserve3, a.reserve4].filter((r) => r && r.visible).map((r) => ({ x: r!.x, y: r!.y - r!.displayHeight * 0.5 }));
  /** charged attacks: the charge turn is all wind-up */
  const charge = async (cue: () => Promise<void>) => {
    await s.camFocus(k.eye(), 1.7, 400);
    s.setDarkness(0.45);
    sound.play('charge');
    await cue();
    await s.wait(300);
    await finish(400);
  };
  const stab = async (i: number, to: Pt, ms = 180) => {
    await k.steerLeg(i, to.x, to.y, ms, 'Quad.easeIn');
    sound.play('slice');
  };
  const air = k.legs.map((_, i) => i);
  const charging = res.stage === 'charge';

  switch (res.id) {
    // ================================================================ THE REAPER
    case 'g_reap': {
      await mid();
      frame(4);
      await s.tw({ targets: k.off, x: reach(64), y: -10, duration: 420, ease: 'Sine.easeInOut' });
      frame(1);
      sound.play('ghost');
      await s.wait(260);
      frame(2);
      sound.play('slice');
      slash(P(), -30);
      s.shake(5, 300);
      await playerHits(s, res.hits, 0, true);
      for (const b of bench()) slash(b, -20, 1.2);
      await finish();
      return true;
    }
    case 'g_grasp': {
      await mid();
      frame(3);
      sound.play('ghost');
      const hands: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 4; i++) {
        const h = s.w(s.add.image(feet().x - 16 + i * 11, GROUND + 10, 'fx_darkhand').setOrigin(0.5, 1).setScale(1, 0.1).setFlipX(i % 2 === 1), 60);
        hands.push(h);
        s.tweens.add({ targets: h, scaleY: 1.2, duration: 260, delay: i * 60, ease: 'Back.easeOut' });
      }
      await s.wait(420);
      sound.play('slam');
      await playerHits(s, res.hits, 0);
      await s.wait(400);
      hands.forEach((h) => s.tweens.add({ targets: h, scaleY: 0, alpha: 0, duration: 300, onComplete: () => h.destroy() }));
      await finish();
      return true;
    }
    case 'g_step': {
      // he thins to smoke and steps out of the dark BEHIND you
      await mid();
      sound.play('whoosh');
      burst(s, k.center(), 'fx_puff', 10, 40, 400);
      await s.tw({ targets: k.core, alpha: 0, duration: 260 });
      k.off.x = feet().x - 46 - (k.body.x - k.off.x);
      k.core.setFlipX(true);
      await s.camFocus(P(), 1.5, 260);
      await s.tw({ targets: k.core, alpha: 1, duration: 200 });
      for (let i = 0; i < res.hits.length; i++) {
        frame(i % 2 ? 1 : 2);
        sound.play('slice');
        slash({ x: P().x - 6, y: P().y - 4 + i * 6 }, 30 + i * 40, 1.6);
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        await s.wait(110);
      }
      burst(s, k.center(), 'fx_puff', 8, 30, 360);
      await s.tw({ targets: k.core, alpha: 0, duration: 200 });
      k.off.x = 0;
      k.core.setFlipX(false);
      await s.tw({ targets: k.core, alpha: 1, duration: 300 });
      await finish(200);
      return true;
    }
    case 'g_drain':
    case 't_harvest':
    case 'f_devour': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 1.0, 300);
      frame(k.kind === 'gr1' ? 3 : 3);
      sound.play(res.id === 'f_devour' ? 'roar' : 'ghost');
      for (let i = 0; i < res.hits.length; i++) {
        for (let n = 0; n < 6; n++) {
          const o = s.w(s.add.image(P().x + (Math.random() - 0.5) * 20, P().y + (Math.random() - 0.5) * 20, 'fx_soul').setAlpha(0.9), 64);
          s.tweens.add({ targets: o, x: k.center().x, y: k.center().y, alpha: 0.2, duration: 520, delay: n * 40, ease: 'Sine.easeIn', onComplete: () => o.destroy() });
        }
        await playerHits(s, [res.hits[i]], 0);
        await s.wait(260);
      }
      ring(s, k.center(), 'fx_ring', 2.4, 500);
      sound.play('heal');
      await finish();
      return true;
    }
    case 'g_mark':
    case 't_mark': {
      await s.camFocus(k.eye(), 2, 300);
      frame(k.kind === 'gr1' ? 6 : 4);
      sound.play('ghost');
      await s.wait(300);
      await s.camFocus(P(), 1.6, 300);
      const sk = s.w(s.add.image(P().x, P().y - 26, 'fx_skull').setScale(0.3).setAlpha(0), 66);
      s.tweens.add({ targets: sk, scale: 1.8, alpha: 1, duration: 300, ease: 'Back.easeOut' });
      if (res.id === 't_mark') for (let i = 0; i < 4; i++) void k.steerLeg(i, P().x + 30 + i * 12, P().y - 70 + i * 8, 320);
      await playerHits(s, res.hits, 0);
      await s.wait(500);
      s.tweens.add({ targets: sk, alpha: 0, duration: 300, onComplete: () => sk.destroy() });
      await finish();
      return true;
    }
    case 'g_knell':
    case 'b_roar': {
      await s.camFocus(k.eye(), 1.8, 300);
      frame(k.kind === 'gr2' ? 1 : 6);
      for (let i = 0; i < 3; i++) {
        sound.play(res.id === 'g_knell' ? 'bell' : 'roar');
        ring(s, k.eye(), 'fx_ring', 5, 900);
        s.shake(4 + i * 2, 300);
        await s.wait(320);
      }
      await s.camTo(W / 2, ARENA_CY, 0.9, 260);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'g_storm': {
      await mid();
      frame(1);
      sound.play('spin');
      await s.tw({ targets: k.off, x: reach(90) * 0.6, duration: 360 });
      for (let i = 0; i < res.hits.length; i++) {
        frame(i % 2 ? 1 : 2);
        sound.play('slice');
        slash({ x: P().x + (Math.random() - 0.5) * 20, y: P().y + (Math.random() - 0.5) * 20 }, i * 72, 1.8);
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        await s.wait(90);
      }
      for (const b of bench()) slash(b, 0, 1);
      await finish();
      return true;
    }
    case 'g_harvest': {
      if (charging)
        return void (await charge(async () => {
          frame(1);
          for (let i = 0; i < 12; i++) {
            const o = s.w(s.add.image(Math.random() * W, GROUND + 30, 'fx_soul'), 63);
            s.tweens.add({ targets: o, x: k.eye().x + 20, y: k.eye().y - 30, alpha: 0, duration: 800, delay: i * 50, onComplete: () => o.destroy() });
          }
          await s.wait(900);
        })), true;
      await s.camFocus(k.eye(), 1.8, 300);
      frame(1);
      await s.invert(140);
      s.flash(0.9, 300);
      frame(2);
      sound.play('slice');
      sound.play('boom');
      await s.camTo(W / 2, ARENA_CY, 0.9, 200);
      slash({ x: W / 2 - 60, y: ARENA_CY + 10 }, -15, 5);
      s.shake(10, 600);
      await playerHits(s, res.hits, 0, true);
      for (const b of bench()) s.boom(b.x, b.y, 0.8);
      await finish(500);
      return true;
    }

    // ================================================================ THE BUFF REAPER
    case 'b_scythe': {
      await mid();
      frame(3);
      sound.play('roar_small');
      await s.tw({ targets: k.off, x: reach(80), duration: 360, ease: 'Sine.easeIn' });
      sound.play('slice');
      frame(4);
      slash({ x: P().x - 30, y: P().y }, -10, 4);
      s.shake(7, 400);
      await playerHits(s, res.hits, 0, true);
      for (const b of bench()) slash(b, -10, 1.6);
      await finish();
      return true;
    }
    case 'b_punch':
    case 'b_breaker': {
      await mid();
      frame(6);
      sound.play('roar_small');
      await s.tw({ targets: k.off, x: 30, duration: 260 });
      frame(2);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(40), duration: 180, ease: 'Quad.easeIn' });
      if (res.id === 'b_breaker') {
        const sh = s.w(s.add.image(P().x + 16, P().y, 'fx_shield').setScale(1.6), 64);
        burst(s, sh, 'fx_dot', 14, 50, 400);
        s.tweens.add({ targets: sh, alpha: 0, scale: 2.4, duration: 300, onComplete: () => sh.destroy() });
        sound.play('crash');
      }
      sound.play('impact');
      s.boom(P().x + 8, P().y, 1.6);
      s.shake(11, 500);
      s.flash(0.5, 200);
      void s.tw({ targets: a.playerOffset, x: -26, duration: 140, yoyo: true });
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'b_quake':
    case 'b_stomp': {
      await mid();
      for (let j = 0; j < (res.id === 'b_stomp' ? 2 : 1); j++) {
        frame(6);
        await s.tw({ targets: k.off, y: -70, duration: 320, ease: 'Quad.easeOut' });
        frame(4);
        await s.tw({ targets: k.off, y: 0, duration: 200, ease: 'Quad.easeIn' });
        sound.play('boom');
        sound.play('stone');
        s.shake(10, 500);
        for (let i = 0; i < 8; i++) {
          const o = s.w(s.add.image(k.body.x - 40 - i * 30, GROUND + 4, 'fx_dotM').setScale(2), 60);
          s.tweens.add({ targets: o, y: o.y - 20, alpha: 0, duration: 400, delay: i * 40, onComplete: () => o.destroy() });
        }
        await s.wait(200);
        await playerHits(s, res.hits.slice(j, j + (res.id === 'b_stomp' ? 1 : res.hits.length)), 0, true);
      }
      for (const b of bench()) burst(s, b, 'fx_dotM', 4, 14, 300);
      await finish();
      return true;
    }
    case 'b_crush': {
      await mid();
      frame(2);
      await s.tw({ targets: k.off, x: reach(60), duration: 300 });
      const h = s.w(s.add.image(P().x + 8, P().y, 'fx_hand').setScale(2.4), 64);
      sound.play('slam');
      for (let i = 0; i < res.hits.length; i++) {
        s.tweens.add({ targets: h, scaleX: 2.0, duration: 90, yoyo: true });
        sound.play('creak');
        s.shake(5, 200);
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        await s.wait(180);
      }
      await s.tw({ targets: h, alpha: 0, duration: 260 });
      h.destroy();
      await finish();
      return true;
    }
    case 'b_flex': {
      await s.camFocus(k.center(), 1.6, 300);
      frame(1);
      sound.play('roar_small');
      const gl = s.w(s.add.image(k.local(-50, -k.core.height * 0.62).x, k.local(-50, -k.core.height * 0.62).y, 'fx_spark').setScale(2), 70);
      s.tweens.add({ targets: gl, angle: 180, alpha: 0, duration: 700, onComplete: () => gl.destroy() });
      sound.play('sparkle');
      ring(s, k.center(), 'fx_shield', 2.4, 700);
      s.shake(3, 500);
      await s.wait(900);
      await finish();
      return true;
    }
    case 'b_fury': {
      if (charging)
        return void (await charge(async () => {
          frame(6);
          for (let i = 0; i < 4; i++) {
            sound.play('roar_small');
            s.shake(3 + i, 260);
            await s.wait(300);
          }
        })), true;
      await mid();
      frame(6);
      sound.play('roar');
      await s.tw({ targets: k.off, x: reach(50), duration: 260 });
      for (let i = 0; i < res.hits.length; i++) {
        frame(i % 2 ? 2 : 4);
        sound.play(i % 3 === 2 ? 'impact' : 'hit');
        s.boom(P().x + (Math.random() - 0.5) * 20, P().y + (Math.random() - 0.5) * 20, 0.8);
        s.shake(4, 100);
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        await s.wait(60);
      }
      frame(3);
      sound.play('slice');
      slash(P(), -40, 3.6);
      s.flash(0.6, 200);
      await finish();
      return true;
    }

    // ================================================================ THE TRUE FORM (and fully powered)
    case 't_cross':
    case 'f_twin': {
      await mid();
      frame(1);
      sound.play('slice');
      await s.tw({ targets: k.off, x: reach(78), y: -8, duration: 380, ease: 'Sine.easeIn' });
      for (let i = 0; i < res.hits.length; i++) {
        frame(i % 2 ? 1 : 2);
        sound.play('slice');
        slash(P(), i % 2 ? 45 : -45, res.id === 'f_twin' ? 2 : 2.6);
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        await s.wait(res.id === 'f_twin' ? 70 : 160);
      }
      if (res.id === 'f_twin') for (const b of bench()) slash(b, 0, 1.2);
      await finish();
      return true;
    }
    case 't_lance':
    case 't_storm':
    case 'f_spider': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 10, 0.92, 300);
      frame(4);
      sound.play('creakmetal');
      // every leg draws back
      await Promise.all(air.map((i) => k.steerLeg(i, k.legs[i].fx + 30, k.legs[i].fy - 30, 300)));
      const targets = res.id === 'f_spider' ? [P(), ...bench()] : [P()];
      for (let i = 0; i < res.hits.length; i++) {
        const li = air[i % air.length];
        const t = targets[i % targets.length];
        await stab(li, { x: t.x + (Math.random() - 0.5) * 14, y: t.y + (Math.random() - 0.5) * 14 }, res.id === 't_storm' ? 90 : 150);
        s.shake(3, 120);
        if (t === targets[0]) await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        else {
          s.spark(t.x, t.y);
          await playerHits(s, [res.hits[i]], 0, false);
        }
        k.releaseLeg(li);
      }
      await finish();
      return true;
    }
    case 't_gale': {
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      for (let j = 0; j < 2; j++) {
        k.holdWings(0);
        await s.wait(180);
        k.holdWings(2);
        sound.play('whoosh');
        s.shake(5, 300);
        for (let i = 0; i < 14; i++) {
          const o = s.w(s.add.image(k.body.x - 30, ARENA_CY + (Math.random() - 0.5) * 140, 'fx_gust').setAlpha(0.8), 63);
          s.tweens.add({ targets: o, x: -40, alpha: 0, duration: 420 + Math.random() * 200, delay: i * 20, onComplete: () => o.destroy() });
        }
        await s.wait(240);
      }
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 't_crown': {
      await s.camFocus(k.eye(), 2, 300);
      frame(3);
      sound.play('bell');
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 160, () => ring(s, k.local(-4, -k.core.height * 0.9), 'fx_ring', 3, 600));
      s.flash(0.5, 300);
      await s.wait(900);
      await finish();
      return true;
    }
    case 't_wings':
    case 'f_descent': {
      if (charging)
        return void (await charge(async () => {
          k.holdWings(0);
          frame(3);
          sound.play('whoosh');
          // up into the dark (for the descent, all the way out of sight), then back down to wait
          await s.tw({ targets: k.off, y: res.id === 'f_descent' ? -300 : -60, duration: 900, ease: 'Sine.easeInOut' });
          if (res.id === 'f_descent') await s.wait(500);
        })), true;
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 30, 0.9, 300);
      k.holdWings(3);
      frame(2);
      sound.play('whoosh');
      k.off.y = res.id === 'f_descent' ? -300 : -60;
      await s.tw({ targets: k.off, x: reach(60), y: 0, duration: 380, ease: 'Quad.easeIn' });
      sound.play('boom');
      s.boom(P().x + 10, GROUND - 6, 2.2);
      s.shake(12, 600);
      s.flash(0.7, 250);
      await playerHits(s, res.hits, 0, true);
      for (const b of bench()) s.boom(b.x, b.y, 0.9);
      await finish(500);
      return true;
    }
    case 't_eclipse': {
      if (charging)
        return void (await charge(async () => {
          frame(3);
          s.setDarkness(0.8);
          sound.play('rumble');
          s.shake(3, 1200);
          await s.wait(900);
        })), true;
      await s.camTo(W / 2, ARENA_CY, 0.85, 300);
      frame(3);
      await s.invert(160);
      const orb = s.w(s.add.image(k.center().x, k.center().y - 30, 'fx_ball').setTint(0x000000).setScale(0.5), 66);
      sound.play('boom');
      await s.tw({ targets: orb, scale: 9, x: W / 2, y: ARENA_CY, duration: 600, ease: 'Quad.easeIn' });
      s.flash(1, 400);
      s.shake(12, 700);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: orb, alpha: 0, duration: 400 });
      orb.destroy();
      await finish(500);
      return true;
    }
    case 'f_legs': {
      await s.camFocus(P(), 1.5, 300);
      frame(4);
      sound.play('creakmetal');
      const spots = air.map((_, i) => ({ x: feet().x - 34 + (i % 3) * 34 + (i > 2 ? 10 : 0), y: GROUND - (i > 2 ? 2 : 6) }));
      await Promise.all(air.map((i) => k.steerLeg(i, spots[i].x, spots[i].y, 360 + i * 40, 'Quad.easeIn')));
      sound.play('slam');
      s.shake(7, 400);
      for (let i = 0; i < res.hits.length; i++) {
        await playerHits(s, [res.hits[i]], 0, i === res.hits.length - 1);
        sound.play('clank');
        await s.wait(160);
      }
      await s.wait(300);
      await finish();
      return true;
    }
    case 'f_chains': {
      await mid();
      frame(3);
      sound.play('chain');
      const tos = [P(), ...bench()];
      await Promise.all(tos.map((t, i) => s.wait(i * 80).then(() => s.projectile('fx_link', k.center(), t, 360, 10, { trail: true } as any))));
      tos.forEach((t) => ring(s, t, 'fx_ring', 1.4, 400));
      sound.play('clank');
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'f_shroud': {
      await s.camFocus(k.center(), 1.6, 300);
      k.holdWings(3);
      sound.play('whoosh');
      ring(s, k.center(), 'fx_shield', 2.8, 700);
      sound.play('shield');
      await s.wait(900);
      await finish();
      return true;
    }
    case 'f_foresee': {
      await s.camFocus(k.eye(), 2.3, 300);
      frame(4);
      sound.play('ghost');
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 140, () => ring(s, k.eye(), 'fx_ring', 1.6, 400));
      await s.wait(600);
      ring(s, k.center(), 'fx_shield', 2.4, 600);
      sound.play('shield');
      await s.wait(500);
      await finish();
      return true;
    }
    case 'f_crown': {
      if (charging)
        return void (await charge(async () => {
          frame(3);
          for (let i = 0; i < 4; i++) {
            sound.play('bell');
            ring(s, k.local(-4, -k.core.height * 0.9), 'fx_ring', 2 + i, 700);
            await s.wait(260);
          }
        })), true;
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      frame(3);
      const top = k.local(-4, -k.core.height * 0.9);
      for (const t of [P(), ...bench()]) {
        const beam = s.w(s.add.image(top.x, top.y, 'fx_beam').setOrigin(0, 0.5), 65);
        beam.setRotation(Math.atan2(t.y - top.y, t.x - top.x));
        beam.setScale(Math.hypot(t.x - top.x, t.y - top.y) / beam.width, 2);
        s.tweens.add({ targets: beam, alpha: 0, duration: 500, delay: 200, onComplete: () => beam.destroy() });
      }
      sound.play('thunder');
      s.flash(0.8, 300);
      s.shake(9, 500);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'f_extinction': {
      if (charging)
        return void (await charge(async () => {
          frame(3);
          k.holdWings(0);
          s.setDarkness(0.85);
          sound.play('rumble');
          await Promise.all(air.map((i) => k.steerLeg(i, k.legs[i].fx + (i % 2 ? 30 : -30), k.legs[i].fy - 50, 600)));
          for (let i = 0; i < 3; i++) {
            sound.play('heartbeat');
            s.shake(2 + i * 2, 400);
            await s.wait(400);
          }
        })), true;
      // FINAL EXTINCTION: three movements
      const n = res.hits.length;
      const third = Math.ceil(n / 3);
      // I. every leg at once
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 10, 0.92, 300);
      frame(4);
      for (let i = 0; i < third; i++) {
        await stab(air[i % air.length], { x: P().x + (Math.random() - 0.5) * 16, y: P().y + (Math.random() - 0.5) * 16 }, 90);
        await playerHits(s, [res.hits[i]], 0);
        k.releaseLeg(air[i % air.length]);
      }
      // II. both scythes
      frame(1);
      await s.tw({ targets: k.off, x: reach(76), duration: 260 });
      for (let i = third; i < Math.min(n, third * 2); i++) {
        frame(i % 2 ? 1 : 2);
        sound.play('slice');
        slash(P(), i % 2 ? 45 : -45, 2.6);
        await playerHits(s, [res.hits[i]], 0);
        await s.wait(80);
      }
      await s.tw({ targets: k.off, x: 0, duration: 260 });
      // III. the eclipse
      frame(3);
      await s.invert(180);
      const orb = s.w(s.add.image(k.center().x, k.center().y - 30, 'fx_ball').setTint(0x000000).setScale(0.5), 66);
      sound.play('boom');
      await s.tw({ targets: orb, scale: 10, x: W / 2, y: ARENA_CY, duration: 600, ease: 'Quad.easeIn' });
      s.flash(1, 500);
      s.shake(14, 800);
      await playerHits(s, res.hits.slice(third * 2), 60, true);
      for (const b of bench()) s.boom(b.x, b.y, 1);
      await s.tw({ targets: orb, alpha: 0, duration: 500 });
      orb.destroy();
      await finish(600);
      return true;
    }
  }
  void PLAYER_X;
  return false;
}
