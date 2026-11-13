import Phaser from 'phaser';
import type { ActionResult, Hit } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_X, PLAYER_Y, SHIP_X } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { playerAnim2, bossAnim2 } from './anims2';
import { playerAnim3, bossAnim3 } from './anims3';
import { bossAnim4 } from './anims4';
import { bossAnim5, playerAnim5 } from './anims5';
import { bossAnim6 } from './anims6';
import { bossAnimLab } from './anims4lab';
import { bossAnim7, playerAnim7 } from './anims7';

// Every ability and boss attack has its own staged sequence with camera work.

type S = BattleScene;
type Pt = { x: number; y: number };

export const pose = (s: S, frame: number) => {
  const pl = s.arena.player;
  pl.stop();
  pl.setFrame(frame);
};
export const idle = (s: S) => s.arena.player.play(s.idleAnim);

/** Land hits on the boss one after another. */
export async function bossHits(s: S, hits: Hit[], gap: number, at?: () => Pt) {
  for (let i = 0; i < hits.length; i++) {
    s.hitBoss(hits[i], at?.());
    if (i < hits.length - 1) await s.wait(gap);
  }
}

export async function playerHits(s: S, hits: Hit[], gap: number, heavy = false, each?: (i: number) => void) {
  for (let i = 0; i < hits.length; i++) {
    each?.(i);
    s.hitPlayer(hits[i], heavy);
    if (i < hits.length - 1) await s.wait(gap);
  }
}

export function ring(s: S, p: Pt, key = 'fx_ring', to = 2, dur = 400, depth = 62) {
  const r = s.w(s.add.image(p.x, p.y, key).setScale(0.2), depth);
  s.tweens.add({ targets: r, scale: to, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}

export function burst(s: S, p: Pt, key: string, n: number, dist: number, dur = 500) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const o = s.w(s.add.image(p.x, p.y, key), 62);
    s.tweens.add({
      targets: o,
      x: p.x + Math.cos(a) * dist,
      y: p.y + Math.sin(a) * dist,
      alpha: 0,
      angle: 180,
      duration: dur,
      onComplete: () => o.destroy(),
    });
  }
}

/** Ghostly chain drawn between two moving points. */
function chainLine(s: S) {
  const ts = s.w(s.add.tileSprite(0, 0, 8, 5, 'fx_link').setOrigin(0, 0.5), 63);
  return {
    set(a: Pt, b: Pt) {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      ts.setPosition(a.x, a.y);
      ts.width = Math.max(1, d);
      ts.rotation = Math.atan2(b.y - a.y, b.x - a.x);
    },
    destroy: () => ts.destroy(),
    obj: ts,
  };
}

// ============================================================ PLAYER

export async function playerAnim(s: S, res: ActionResult) {
  if (await playerAnim7(s, res)) return;
  if (await playerAnim5(s, res)) return;
  if (await playerAnim3(s, res)) return;
  if (await playerAnim2(s, res)) return;
  const a = s.arena;
  const P = () => a.playerCenter();
  const hull = () => a.hullPoint();
  switch (res.id) {
    // ---------------------------------------------------- BOOHEET
    case 'spook_bolt': {
      await s.camFocus(P(), 1.7, 300);
      pose(s, 4);
      sound.play('ghost');
      ring(s, P(), 'fx_ring', 1.2, 250);
      await s.wait(150);
      s.camFocus({ x: (P().x + hull().x) / 2, y: P().y - 20 }, 1.15, 420);
      await s.projectile('fx_bolt', { x: P().x + 12, y: P().y - 4 }, hull(), 420, 26, { trail: true });
      idle(s);
      await s.camFocus(hull(), 1.45, 120);
      await bossHits(s, res.hits, 0);
      const r = s.w(s.add.image(hull().x, hull().y, 'fx_rune').setScale(2), 64);
      s.tweens.add({ targets: r, y: r.y - 26, alpha: 0, scale: 1, duration: 600, onComplete: () => r.destroy() });
      await s.wait(350);
      break;
    }
    case 'dread_wail': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('wail');
      s.shake(1.5, 900);
      s.camFocus({ x: W / 2 + 30, y: ARENA_CY }, 1.05, 700);
      for (let i = 0; i < 4; i++) {
        const arc = s.w(s.add.image(P().x + 16, P().y - 4, 'fx_arc').setScale(0.6), 63);
        s.tweens.add({ targets: arc, x: hull().x - 20, scale: 3, alpha: 0, duration: 650, onComplete: () => arc.destroy() });
        await s.wait(120);
      }
      await s.wait(300);
      idle(s);
      await bossHits(s, res.hits, 0);
      a.shipParts.forEach((o) => o.setTint(0x707070));
      await s.wait(350);
      s.applyWeakTint();
      break;
    }
    case 'peekaboo': {
      await s.camFocus(P(), 1.8, 300);
      sound.play('ghost');
      await s.tw({ targets: a.player, alpha: 0, duration: 300, yoyo: false });
      await s.camFocus(a.captainPoint(), 2.2, 450);
      const eyes = s.w(s.add.container(a.captainPoint().x - 26, a.captainPoint().y - 6), 64);
      eyes.add([s.add.ellipse(-6, 0, 9, 12, C.white), s.add.ellipse(6, 0, 9, 12, C.white), s.add.ellipse(-4, 1, 4, 6, C.black), s.add.ellipse(8, 1, 4, 6, C.black)]);
      eyes.setScale(0);
      await s.tw({ targets: eyes, scale: 1.3, duration: 160, ease: 'Back.easeOut' });
      sound.play('wail');
      a.captain.setFrame(2);
      s.tweens.add({ targets: a.captain, x: a.captain.x + 6, duration: 70, yoyo: true, repeat: 3 });
      s.shake(2, 300);
      await s.wait(500);
      eyes.destroy();
      a.captainIdle();
      await s.camFocus(P(), 1.5, 350);
      await s.tw({ targets: a.player, alpha: 1, duration: 200 });
      break;
    }
    case 'night_terror': {
      await s.camFocus(P(), 2, 300);
      pose(s, 4);
      s.setDarkness(0.45);
      sound.play('wail');
      await s.wait(350);
      await s.camTo(SHIP_X - 10, ARENA_CY - 10, 1.2, 500, -0.04);
      const sk = s.w(s.add.image(a.shipCenter().x, a.shipCenter().y + 60, 'fx_skull').setScale(0.3).setAlpha(0), 64);
      await s.tw({ targets: sk, y: a.shipCenter().y - 30, scale: 3, alpha: 0.9, duration: 700, ease: 'Back.easeOut' });
      sound.play('boom');
      await s.invert(120);
      s.flash(0.6, 300);
      s.shake(5, 500);
      for (let i = 0; i < 5; i++) {
        const r = s.w(s.add.image(a.shipCenter().x, a.shipCenter().y, 'fx_rune'), 64);
        const ang = (i / 5) * Math.PI * 2;
        s.tweens.add({ targets: r, x: r.x + Math.cos(ang) * 80, y: r.y + Math.sin(ang) * 40, alpha: 0, scale: 2, duration: 700, onComplete: () => r.destroy() });
      }
      await bossHits(s, res.hits, 0, () => a.shipCenter());
      await s.tw({ targets: sk, alpha: 0, scale: 4, duration: 400 });
      sk.destroy();
      s.setDarkness(a.phase >= 3 ? 0.14 : 0);
      idle(s);
      await s.wait(200);
      break;
    }
    // ---------------------------------------------------- SHIPWRAITH
    case 'spectral_cannon': {
      await s.camFocus(P(), 1.8, 280);
      pose(s, 4);
      sound.play('cannon');
      const m = { x: P().x + 22, y: P().y + 10 };
      const pf = s.w(s.add.sprite(m.x, m.y, 'fx_puff', 0), 62);
      s.tweens.add({ targets: pf, x: m.x - 6, scale: 1.8, alpha: 0, duration: 400, onComplete: () => pf.destroy() });
      s.tweens.add({ targets: a.playerOffset, x: -5, duration: 60, yoyo: true });
      s.camFocus({ x: (P().x + hull().x) / 2, y: P().y - 25 }, 1.1, 400);
      await s.projectile('fx_ball', m, hull(), 450, 40, { trail: true });
      idle(s);
      await s.camFocus(hull(), 1.4, 100);
      await bossHits(s, res.hits, 0);
      await s.wait(300);
      break;
    }
    case 'barnacle_barrier': {
      await s.camFocus(P(), 1.9, 300);
      sound.play('shield');
      const sh = s.w(s.add.image(P().x, P().y, 'fx_shield').setScale(0), 56);
      await s.tw({ targets: sh, scale: 1.1, duration: 300, ease: 'Back.easeOut' });
      burst(s, P(), 'fx_dot', 12, 30);
      await s.tw({ targets: sh, scale: 1, alpha: 0, duration: 250 });
      sh.destroy();
      break;
    }
    case 'batten_down':
    case 'brass_casing': {
      await s.camFocus(P(), 1.9, 300);
      const n = res.id === 'brass_casing' ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const key = res.id === 'brass_casing' ? 'fx_gear' : 'fx_hex';
        const o = s.w(s.add.image(P().x + Math.cos(ang) * 60, P().y + Math.sin(ang) * 40, key).setScale(res.id === 'brass_casing' ? 1.5 : 0.4), 56);
        s.tweens.add({ targets: o, x: P().x, y: P().y, angle: 180, alpha: 0.2, duration: 380, onComplete: () => o.destroy() });
      }
      await s.wait(360);
      sound.play('heavy');
      s.shake(2.5, 200);
      ring(s, P(), 'fx_hex', 1.4, 400, 56);
      await s.wait(350);
      break;
    }
    case 'dead_mans_volley': {
      await s.camFocus(P(), 2, 320);
      pose(s, 4);
      sound.play('charge');
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = s.w(s.add.image(P().x + Math.cos(ang) * 34, P().y + Math.sin(ang) * 34, 'fx_spark'), 62);
        s.tweens.add({ targets: sp, x: P().x, y: P().y, alpha: 0, duration: 400, delay: i * 40, onComplete: () => sp.destroy() });
      }
      await s.wait(600);
      sound.play('shield');
      ring(s, P(), 'fx_ringL', 1, 400);
      idle(s);
      await s.wait(250);
      break;
    }
    // ---------------------------------------------------- HAUNTCORN
    case 'straw_lash': {
      await s.camFocus(P(), 1.7, 280);
      pose(s, 4);
      sound.play('swish');
      const g = s.w(s.add.graphics(), 57);
      const hand = s.w(s.add.image(P().x + 18, P().y - 2, 'fx_hand'), 58);
      const from = { x: P().x + 16, y: P().y - 2 };
      const draw = () => {
        g.clear();
        g.lineStyle(2, C.light, 1).lineBetween(from.x, from.y, hand.x - 4, hand.y);
        g.lineStyle(1, C.white, 1).lineBetween(from.x, from.y - 1, hand.x - 4, hand.y - 1);
      };
      s.camFocus({ x: (from.x + hull().x) / 2, y: from.y - 20 }, 1.05, 380);
      await s.tw({ targets: hand, x: hull().x, y: hull().y, duration: 380, ease: 'Quad.easeIn', onUpdate: draw } as any);
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: hand, x: from.x + 2, y: from.y, duration: 350, ease: 'Quad.easeOut', onUpdate: draw } as any);
      g.destroy();
      hand.destroy();
      idle(s);
      break;
    }
    case 'harvest_moon': {
      await s.camTo(P().x + 30, P().y - 50, 1.25, 400);
      const moon = s.w(s.add.image(P().x, P().y - 50, 'fx_moon').setAlpha(0).setScale(0.5), 25);
      await s.tw({ targets: moon, y: P().y - 90, alpha: 1, scale: 1.4, duration: 600, ease: 'Sine.easeOut' });
      const beam = s.w(s.add.rectangle(P().x, P().y - 40, 30, 90, C.white).setAlpha(0), 56);
      await s.tw({ targets: beam, alpha: 0.35, duration: 250 });
      pose(s, 4);
      await s.wait(500);
      s.tweens.add({ targets: [moon, beam], alpha: 0, duration: 400, onComplete: () => (moon.destroy(), beam.destroy()) });
      idle(s);
      break;
    }
    case 'corn_ritual': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('buff');
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const k = s.w(s.add.image(P().x, P().y, 'fx_kernel'), 58);
        s.tweens.add({
          targets: k,
          x: P().x + Math.cos(ang) * 30,
          y: P().y + Math.sin(ang) * 22,
          duration: 300,
          yoyo: true,
          hold: 250,
          onComplete: () => k.destroy(),
        });
      }
      await s.wait(900);
      ring(s, P(), 'fx_ring', 1.4, 350);
      idle(s);
      break;
    }
    case 'hallowed_harvest': {
      await s.camFocus(P(), 2.1, 350);
      pose(s, 4);
      s.setDarkness(0.3);
      sound.play('charge');
      await s.wait(400);
      s.flash(0.7, 400);
      s.setDarkness(a.phase >= 3 ? 0.14 : 0);
      ring(s, P(), 'fx_ringL', 1.2, 500);
      burst(s, P(), 'fx_kernel', 16, 46, 700);
      const moon = s.w(s.add.image(P().x, P().y - 60, 'fx_moon').setScale(0.6), 25);
      s.tweens.add({ targets: moon, alpha: 0, y: P().y - 90, duration: 1000, onComplete: () => moon.destroy() });
      await s.camFocus(P(), 1.6, 400);
      idle(s);
      break;
    }
    // ---------------------------------------------------- UMBRAWL
    case 'parasol_pierce': {
      await s.camFocus(P(), 1.6, 250);
      pose(s, 4);
      a.setFistPose(0);
      await Promise.all([a.fistTo(0, -7, 2, 150), a.fistTo(1, -9, 1, 150)]);
      sound.play('swish');
      s.camFocus({ x: 220, y: P().y - 30 }, 1.35, 300);
      await s.tw({ targets: a.playerOffset, x: 120, y: -40, duration: 230, ease: 'Quad.easeIn' });
      // the tip stabs, then the right fist follows through
      a.fists[1]?.setFrame(1);
      a.fistTo(1, 24, -4, 70);
      const sl = s.w(s.add.image(hull().x - 10, hull().y, 'fx_slash').setRotation(-0.4), 63);
      s.tweens.add({ targets: sl, alpha: 0, scale: 1.4, duration: 300, onComplete: () => sl.destroy() });
      await bossHits(s, res.hits, 0);
      await s.wait(150);
      a.setFistPose(0);
      a.fistTo(0, 0, 0, 300);
      a.fistTo(1, 0, 0, 300);
      await s.tw({ targets: a.playerOffset, x: 0, y: 0, duration: 320, ease: 'Quad.easeOut' });
      idle(s);
      break;
    }
    case 'cyclone_spin': {
      await s.camFocus(P(), 1.6, 250);
      sound.play('spin');
      const spin = s.w(s.add.sprite(P().x, P().y, 'fx_spin'), 59);
      spin.play('fx_spin');
      s.tweens.add({ targets: a.player, angle: 1080, duration: 1200 });
      a.fistLocked = [true, true];
      const orbit = s.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const c = a.playerCenter();
          const t = s.time.now / 1000;
          a.fists.forEach((f, i) => {
            const ang = t * 14 + i * Math.PI;
            f.setPosition(c.x + Math.cos(ang) * 21, c.y + 4 + Math.sin(ang) * 8);
            f.setDepth(Math.sin(ang) > 0 ? 52 : 50);
            f.setFrame(1);
          });
        },
      });
      s.camFocus({ x: 230, y: P().y - 30 }, 1.3, 400);
      await s.tw({
        targets: a.playerOffset,
        x: 125,
        y: -40,
        duration: 400,
        ease: 'Sine.easeIn',
        onUpdate: () => spin.setPosition(a.playerCenter().x, a.playerCenter().y),
      } as any);
      for (let i = 0; i < res.hits.length; i++) {
        sound.play('swish');
        const sl = s.w(s.add.image(hull().x - 10, hull().y + (i - 1) * 10, 'fx_slash').setRotation(i * 2), 63);
        s.tweens.add({ targets: sl, alpha: 0, duration: 250, onComplete: () => sl.destroy() });
        s.hitBoss(res.hits[i]);
        await s.wait(170);
      }
      await s.tw({
        targets: a.playerOffset,
        x: 0,
        y: 0,
        duration: 400,
        onUpdate: () => spin.setPosition(a.playerCenter().x, a.playerCenter().y),
      } as any);
      spin.destroy();
      orbit.remove();
      a.fists.forEach((f) => f.setDepth(52).setFrame(0));
      a.fistLocked = [false, false];
      a.player.angle = 0;
      idle(s);
      break;
    }
    case 'canopy_catch': {
      await s.camFocus(P(), 1.9, 280);
      sound.play('swish');
      a.setFistPose(2);
      a.fistTo(0, -9, -8, 200, 'Back.easeOut');
      a.fistTo(1, 9, -10, 200, 'Back.easeOut');
      const c = s.w(s.add.image(P().x + 26, P().y - 2, 'fx_canopy').setAngle(90).setScale(0.1, 0.8), 57);
      await s.tw({ targets: c, scaleX: 1.2, duration: 220, ease: 'Back.easeOut' });
      await s.tw({ targets: c, scaleX: 0.8, alpha: 0, duration: 250 });
      c.destroy();
      sound.play('shield');
      a.fistTo(0, 0, 0, 300);
      a.fistTo(1, 0, 0, 300);
      await s.wait(150);
      break;
    }
    case 'monsoon_plunge': {
      await s.camFocus(P(), 1.6, 250);
      pose(s, 4);
      sound.play('charge');
      a.setFistPose(0);
      await Promise.all([a.fistTo(0, 10, -28, 220, 'Back.easeOut'), a.fistTo(1, -10, -26, 220, 'Back.easeOut')]);
      s.camTo(P().x + 20, P().y - 120, 1.2, 500);
      await s.tw({ targets: a.playerOffset, y: -260, duration: 520, ease: 'Quad.easeIn' });
      a.lightning(true);
      s.setDarkness(0.35);
      await s.camTo(SHIP_X - 20, ARENA_CY - 30, 1.15, 450, 0.05);
      a.playerOffset.x = 200;
      a.player.angle = 180;
      await s.wait(200);
      sound.play('swish');
      await s.tw({ targets: a.playerOffset, y: -60, duration: 260, ease: 'Quad.easeIn' });
      s.flash(0.8, 350);
      await s.invert(80);
      s.shake(7, 600);
      sound.play('boom');
      a.setFistPose(1);
      a.fistTo(0, 10, 14, 80);
      a.fistTo(1, -10, 16, 80);
      s.boom(a.shipCenter().x - 20, a.shipCenter().y + 10, 2.2);
      s.splash(a.shipCenter().x - 40, 176, 1.8);
      await bossHits(s, res.hits, 0, () => a.shipCenter());
      s.setDarkness(a.phase >= 3 ? 0.14 : 0);
      await s.wait(350);
      a.player.angle = 0;
      a.player.setAlpha(0);
      a.playerOffset.x = 0;
      a.playerOffset.y = -50;
      a.setFistPose(0);
      a.fistOff.forEach((o) => ((o.x = 0), (o.y = 0)));
      await s.camHome(300);
      await s.tw({ targets: a.player, alpha: 1, duration: 200 });
      await s.tw({ targets: a.playerOffset, y: 0, duration: 300, ease: 'Bounce.easeOut' });
      idle(s);
      break;
    }
    // ---------------------------------------------------- TICKRAITH
    case 'pendulum_crush': {
      await s.camFocus(P(), 1.7, 280);
      pose(s, 4);
      sound.play('tick');
      const bob = s.w(s.add.image(P().x, P().y + 10, 'fx_ball').setScale(2.6), 63);
      const g = s.w(s.add.graphics(), 62);
      const pivot = { x: (P().x + hull().x) / 2, y: P().y - 140 };
      const st = { a: -1.1 };
      const len = Math.hypot(P().x - pivot.x, P().y + 10 - pivot.y);
      const upd = () => {
        bob.setPosition(pivot.x + Math.sin(st.a) * len, pivot.y + Math.cos(st.a) * len);
        g.clear();
        g.lineStyle(2, C.light, 1).lineBetween(pivot.x, pivot.y, bob.x, bob.y);
      };
      upd();
      s.camTo((P().x + hull().x) / 2, P().y - 30, 1.0, 500);
      await s.tw({ targets: st, a: 0.75, duration: 520, ease: 'Sine.easeIn', onUpdate: upd } as any);
      s.shake(4, 300);
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: [bob, g], alpha: 0, duration: 250 });
      bob.destroy();
      g.destroy();
      idle(s);
      break;
    }
    case 'stop_the_clock': {
      await s.camTo(W / 2 + 40, ARENA_CY - 10, 0.95, 350);
      sound.play('freeze');
      const c = a.shipCenter();
      const face = s.w(s.add.image(c.x, c.y, 'fx_clock').setScale(0.2).setAlpha(0), 66);
      const hl = s.w(s.add.image(c.x, c.y, 'fx_handL').setOrigin(0.5, 1).setAlpha(0), 67);
      const hs = s.w(s.add.image(c.x, c.y, 'fx_handS').setOrigin(0.5, 1).setAlpha(0), 67);
      await s.tw({ targets: face, scale: 1.8, alpha: 0.9, duration: 400, ease: 'Back.easeOut' });
      hl.setAlpha(1).setScale(1.8);
      hs.setAlpha(1).setScale(1.8);
      await s.tw({ targets: [hl, hs], angle: '+=720', duration: 700, ease: 'Cubic.easeOut' });
      await s.invert(120);
      s.flash(0.5, 300);
      a.shipFrozen = true;
      sound.play('tick');
      await s.wait(400);
      s.tweens.add({ targets: [face, hl, hs], alpha: 0, duration: 400, onComplete: () => (face.destroy(), hl.destroy(), hs.destroy()) });
      break;
    }
    case 'rewind': {
      await s.camFocus(P(), 2, 300);
      sound.play('rewind');
      const face = s.w(s.add.image(P().x, P().y, 'fx_clock').setScale(0.9).setAlpha(0.8), 56);
      const hl = s.w(s.add.image(P().x, P().y, 'fx_handL').setOrigin(0.5, 1), 57);
      await s.tw({ targets: hl, angle: -1080, duration: 900, ease: 'Sine.easeInOut' });
      // afterimages slide back into place
      for (let i = 0; i < 3; i++) {
        const ghost = s.w(s.add.image(P().x - 20 - i * 10, a.player.y, s.bodyKey, 5).setOrigin(0.5, 1).setAlpha(0.5), 50);
        s.tweens.add({ targets: ghost, x: a.player.x, alpha: 0, duration: 400, delay: i * 80, onComplete: () => ghost.destroy() });
      }
      await s.wait(400);
      s.tweens.add({ targets: [face, hl], alpha: 0, duration: 300, onComplete: () => (face.destroy(), hl.destroy()) });
      break;
    }
  }
}

/** A REPRISAL strike: Shipwraith answers with a cannon volley, anyone else with moonlit slashes. */
export async function counterAnim(s: S, amount: number) {
  const a = s.arena;
  const P = a.playerCenter();
  await s.camTo((P.x + a.hullPoint().x) / 2, P.y - 30, 1.1, 300);
  pose(s, 4);
  if ((s.battle.creature.base ?? s.battle.creature.id) !== 'shipwraith') {
    // everyone else strikes back with what they have: for Glidray, crescents of moonlight
    for (let i = 0; i < 3; i++) {
      sound.play('swish');
      const from = { x: P.x + 16, y: P.y - 4 };
      const to = { x: a.hullPoint().x + (i - 1) * 14, y: a.hullPoint().y + (i % 2) * 10 };
      const sl = s.w(s.add.image(from.x, from.y, 'fx_slash').setScale(0.7).setAlpha(0.9), 63);
      s.tweens.add({ targets: sl, x: to.x, y: to.y, angle: 200, scale: 1.3, duration: 300, ease: 'Quad.easeIn', onComplete: () => s.tweens.add({ targets: sl, alpha: 0, duration: 200, onComplete: () => sl.destroy() }) });
      await s.wait(110);
    }
    await s.wait(300);
    sound.play('counter');
    s.hitBoss({ amount, absorbed: 0, crit: amount >= 120, miss: false, graze: false });
    idle(s);
    await s.wait(300);
    return;
  }
  for (let i = 0; i < 4; i++) {
    sound.play('cannon');
    s.projectile('fx_ball', { x: P.x + 20, y: P.y + 8 }, { x: a.hullPoint().x + (i - 2) * 14, y: a.hullPoint().y + (i % 2) * 10 }, 340, 30 + i * 8, { trail: true });
    await s.wait(90);
  }
  await s.wait(300);
  sound.play('counter');
  s.hitBoss({ amount, absorbed: 0, crit: amount >= 120, miss: false, graze: false });
  idle(s);
  await s.wait(300);
}

// ============================================================ BOSS

export async function bossAnim(s: S, res: ActionResult) {
  if (await bossAnim7(s, res)) return;
  if (await bossAnim6(s, res)) return;
  if (await bossAnim5(s, res)) return;
  if (await bossAnimLab(s, res)) return;
  if (await bossAnim4(s, res)) return;
  if (await bossAnim3(s, res)) return;
  if (await bossAnim2(s, res)) return;
  const a = s.arena;
  const P = () => a.playerCenter();
  const reset = () => a.captainIdle();
  const aimCannons = (on: boolean) =>
    a.cannons.forEach((c, i) => s.tweens.add({ targets: c, rotation: on ? 0.35 + i * 0.03 : 0, duration: 300 }));

  switch (res.id) {
    // ------------------------------------------------ the angry fisherman
    case 'rod': {
      const fm = a.captain;
      await s.camFocus(a.shipCenter(), 1.6, 300);
      fm.stop().setFrame(2);
      sound.play('swish');
      await s.wait(260);
      s.camFocus({ x: (P().x + a.shipCenter().x) / 2, y: P().y - 20 }, 1.3, 220);
      fm.setFrame(3);
      await s.tw({ targets: a.shipOffset, x: -70, duration: 160, ease: 'Quad.easeIn' });
      const sl = s.w(s.add.image(P().x + 14, P().y, 'fx_slash').setFlipX(true).setRotation(0.3), 63);
      s.tweens.add({ targets: sl, alpha: 0, scale: 1.4, duration: 260, onComplete: () => sl.destroy() });
      await playerHits(s, res.hits, 0, true);
      await s.wait(220);
      await s.tw({ targets: a.shipOffset, x: 0, duration: 360, ease: 'Sine.easeOut' });
      a.captainIdle();
      break;
    }
    case 'hook': {
      const fm = a.captain;
      await s.camFocus(a.shipCenter(), 1.5, 300);
      fm.stop().setFrame(2);
      sound.play('cast');
      await s.wait(250);
      fm.setFrame(3);
      const tip = { x: a.shipCenter().x - 50, y: a.shipCenter().y - 10 };
      const hk = s.w(s.add.image(tip.x, tip.y, 'fx_hook'), 64);
      const g = s.w(s.add.graphics(), 63);
      const line = () => {
        g.clear();
        g.lineStyle(1, C.light, 1).lineBetween(a.shipCenter().x - 50, a.shipCenter().y - 22, hk.x, hk.y);
      };
      s.camFocus({ x: (P().x + tip.x) / 2, y: P().y - 20 }, 1.2, 300);
      await s.tw({ targets: hk, x: P().x + 4, y: P().y - 4, duration: 340, ease: 'Quad.easeIn', onUpdate: line } as any);
      s.hitPlayer(res.hits[0]);
      sound.play('reel');
      await s.wait(150);
      // reel the champion in
      await s.tw({
        targets: a.playerOffset,
        x: 90,
        duration: 380,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          hk.setPosition(a.playerCenter().x + 4, a.playerCenter().y - 4);
          line();
        },
      } as any);
      if (res.hits[1]) s.hitPlayer(res.hits[1], true);
      s.shake(4, 250);
      g.destroy();
      hk.destroy();
      await s.tw({ targets: a.playerOffset, x: 0, duration: 400, ease: 'Sine.easeOut' });
      a.captainIdle();
      break;
    }
    case 'slap': {
      const fm = a.captain;
      await s.camFocus(a.shipCenter(), 1.7, 280);
      fm.stop().setFrame(2);
      const fish = s.w(s.add.image(a.shipCenter().x - 20, a.shipCenter().y - 20, 'fish_cod').setScale(1.2), 64);
      await s.wait(350);
      await s.tw({ targets: a.shipOffset, x: -150, duration: 260, ease: 'Quad.easeIn' });
      fm.setFrame(3);
      await s.camFocus(P(), 1.8, 200);
      for (let i = 0; i < res.hits.length; i++) {
        const side = i % 2 ? -1 : 1;
        fish.setPosition(P().x + side * 18, P().y - 6).setFlipX(side < 0).setAngle(side * 30);
        await s.tw({ targets: fish, x: P().x - side * 4, angle: -side * 20, duration: 70 });
        s.hitPlayer(res.hits[i]);
        for (let k = 0; k < 4; k++) {
          const d = s.w(s.add.image(P().x, P().y - 6, 'fx_dot'), 65);
          s.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 40, y: d.y - 10 - Math.random() * 20, alpha: 0, duration: 400, onComplete: () => d.destroy() });
        }
        await s.wait(110);
      }
      fish.destroy();
      await s.tw({ targets: a.shipOffset, x: 0, duration: 420, ease: 'Sine.easeOut' });
      a.captainIdle();
      break;
    }
    case 'cast': {
      const fm = a.captain;
      if (res.stage === 'charge') {
        await s.camFocus(a.captainPoint(), 2.0, 450);
        fm.stop().setFrame(2);
        sound.play('charge');
        s.shake(2, 900);
        for (let i = 0; i < 6; i++) {
          sound.play('swish');
          s.spark(a.captainPoint().x + (Math.random() - 0.5) * 50, a.captainPoint().y - 20 - Math.random() * 20);
          await s.wait(140);
        }
        await s.wait(300);
        break;
      }
      await s.camFocus(a.captainPoint(), 1.8, 300);
      fm.stop().setFrame(2);
      sound.play('cast');
      await s.wait(400);
      fm.setFrame(3);
      const hk = s.w(s.add.image(a.captainPoint().x, a.captainPoint().y, 'fx_hook').setScale(3), 64);
      await s.camTo(200, -40, 1.0, 400);
      await s.tw({ targets: hk, x: P().x, y: -120, duration: 380, ease: 'Quad.easeOut' });
      await s.wait(200);
      await s.camFocus(P(), 1.4, 250);
      await s.tw({ targets: hk, y: P().y, duration: 260, ease: 'Quad.easeIn' });
      s.flash(0.7, 300);
      s.boom(P().x, P().y, 2.2);
      a.lightning(true);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: hk, alpha: 0, duration: 300 });
      hk.destroy();
      a.captainIdle();
      break;
    }
    // ------------------------------------------------ Slick Rick
    case 'rev': {
      // MOTORCYCLE CHARGE: rev, rear up, and run the champion down
      const rk = a.captain;
      await s.camFocus(a.shipCenter(), 1.6, 300);
      rk.stop().setFrame(2);
      sound.play('rev');
      s.shake(2, 400);
      await s.wait(420);
      rk.setFrame(3);
      sound.play('rev');
      s.camFocus({ x: (P().x + a.shipCenter().x) / 2, y: P().y - 20 }, 1.2, 240);
      await s.tw({ targets: a.shipOffset, x: -(a.shipCenter().x - P().x) + 40, duration: 260, ease: 'Quad.easeIn' });
      s.boom(P().x + 6, P().y - 4, 1.2);
      await playerHits(s, res.hits, 0, true);
      s.shake(5, 300);
      await s.wait(160);
      // skid back to his mark, leaving rubber
      sound.play('swish');
      await s.tw({ targets: a.shipOffset, x: 0, duration: 520, ease: 'Sine.easeOut' });
      a.captainIdle();
      break;
    }
    case 'oil': {
      // OIL SLICK: blobs arc across the floor; the champion slides and staggers
      const rk = a.captain;
      await s.camFocus(a.shipCenter(), 1.5, 300);
      rk.stop().setFrame(5);
      sound.play('rev');
      await s.wait(300);
      s.camFocus({ x: (P().x + a.shipCenter().x) / 2, y: P().y - 10 }, 1.15, 300);
      for (let i = 0; i < 5; i++) {
        s.projectile('fx_oil', { x: a.shipCenter().x - 30, y: a.shipCenter().y + 10 }, { x: P().x - 30 + i * 16, y: P().y + 4 }, 380 + i * 60, 40);
        await s.wait(70);
      }
      await s.wait(420);
      const slicks = [0, 1, 2].map((i) => s.w(s.add.ellipse(P().x - 20 + i * 20, P().y + 3, 26, 6, 0x000000).setAlpha(0.8), 49));
      sound.play('splash');
      for (let i = 0; i < res.hits.length; i++) {
        await s.tw({ targets: a.playerOffset, x: i % 2 ? 10 : -14, duration: 140, ease: 'Sine.easeInOut' });
        s.hitPlayer(res.hits[i]);
        await s.wait(120);
      }
      await s.tw({ targets: a.playerOffset, x: 0, duration: 300 });
      s.tweens.add({ targets: slicks, alpha: 0, duration: 1600, delay: 600, onComplete: () => slicks.forEach((o) => o.destroy()) });
      a.captainIdle();
      break;
    }
    case 'pitch': {
      // SALES PITCH: words, cards and contracts, flung hard
      const rk = a.captain;
      await s.camFocus(a.captainPoint(), 1.9, 300);
      rk.stop().setFrame(0);
      sound.play('quest');
      const head = a.captainPoint();
      for (let i = 0; i < res.hits.length; i++) {
        const key = 'fx_pitch' + (i % 5);
        const bub = s.w(s.add.image(head.x - 30, head.y - 20 - (i % 2) * 14, key).setScale(0.3), 66);
        s.tweens.add({ targets: bub, scale: 1, duration: 120, ease: 'Back.easeOut' });
        sound.play('text');
        await s.wait(150);
        if (i === 0) s.camFocus({ x: (P().x + head.x) / 2, y: P().y - 20 }, 1.25, 260);
        await s.projectile('fx_card', { x: head.x - 20, y: head.y }, P(), 200, 10, { spin: true });
        s.hitPlayer(res.hits[i]);
        s.tweens.add({ targets: bub, alpha: 0, y: bub.y - 10, duration: 300, onComplete: () => bub.destroy() });
      }
      a.captainIdle();
      break;
    }
    case 'throttle': {
      const rk = a.captain;
      if (res.stage === 'charge') {
        // he backs up to the far wall, the engine screaming
        await s.camFocus(a.shipCenter(), 1.4, 400);
        rk.stop().setFrame(2);
        await s.tw({ targets: a.shipOffset, x: 60, duration: 600, ease: 'Sine.easeOut' });
        s.shake(2, 1100);
        for (let i = 0; i < 6; i++) {
          sound.play('rev');
          a.wisps.emitting = true;
          s.spark(a.shipCenter().x + 50 + Math.random() * 20, a.shipCenter().y + 20);
          await s.wait(150);
        }
        a.wisps.emitting = a.phase >= 2;
        break;
      }
      // FULL THROTTLE: from across the store, flat out
      await s.camFocus(a.shipCenter(), 1.5, 250);
      rk.stop().setFrame(3);
      sound.play('rev');
      await s.wait(250);
      await s.camTo(W / 2, a.shipCenter().y - 10, 0.95, 250);
      for (let i = 0; i < 6; i++) {
        const l = s.w(s.add.rectangle(a.shipCenter().x + 40 + i * 6, a.shipCenter().y - 30 + i * 10, 40, 2, 0xffffff), 64);
        s.tweens.add({ targets: l, x: l.x + 120, alpha: 0, duration: 400, onComplete: () => l.destroy() });
      }
      await s.tw({ targets: a.shipOffset, x: -(a.shipCenter().x - P().x) - 20, duration: 300, ease: 'Quad.easeIn' });
      s.flash(0.8, 300);
      s.boom(P().x, P().y - 10, 2.4);
      sound.play('crash');
      await playerHits(s, res.hits, 0, true);
      s.shake(7, 500);
      await s.wait(300);
      a.shipOffset.x = 70;
      await s.tw({ targets: a.shipOffset, x: 0, duration: 600, ease: 'Sine.easeOut' });
      a.captainIdle();
      break;
    }
    case 'frozen': {
      a.shipFrozen = true;
      await s.camFocus(a.shipCenter(), 1.3, 400);
      sound.play('tick');
      a.shipParts.forEach((o) => o.setTint(0x808080));
      await s.wait(700);
      a.shipFrozen = false;
      s.applyWeakTint();
      if (!s.battle.has('boss', 'WEAKENED')) a.shipParts.forEach((o) => o.clearTint());
      break;
    }
    case 'broadside': {
      a.shipFrozen = false;
      await s.camFocus(a.shipPoint(-20, -30), 1.7, 450);
      sound.play('creak');
      aimCannons(true);
      await s.wait(380);
      const n = res.hits.length;
      // fire everything, then follow the volley to the champion
      const shots: Promise<void>[] = [];
      for (let i = 0; i < n; i++) {
        const m = a.cannonMuzzle(i);
        const pf = s.w(s.add.sprite(m.x, m.y, 'fx_puff', 0), 62);
        s.tweens.add({ targets: pf, x: m.x - 10, scale: 2, alpha: 0, duration: 500, onComplete: () => pf.destroy() });
        sound.play('cannon');
        s.shake(1.5, 100);
        const cn = a.cannons[i % a.cannons.length];
        s.tweens.add({ targets: cn, x: cn.x + 3, duration: 60, yoyo: true });
        shots.push(
          s.projectile('fx_ball', m, { x: P().x + (Math.random() - 0.5) * 16, y: P().y + (Math.random() - 0.5) * 16 }, 520, 30 + i * 6, { trail: true }).then(() => {
            s.boom(P().x + (Math.random() - 0.5) * 16, P().y + (Math.random() - 0.5) * 16, 0.9);
            s.hitPlayer(res.hits[i]);
          })
        );
        if (i === 0) s.camFocus({ x: (m.x + P().x) / 2, y: P().y - 30 }, 1.1, 450);
        await s.wait(110);
      }
      await s.camFocus(P(), 1.5, 300);
      await Promise.all(shots);
      aimCannons(false);
      await s.wait(350);
      break;
    }
    case 'anchor': {
      s.setDarkness(0.35);
      await s.camTo(P().x + 10, P().y - 70, 1.15, 450);
      sound.play('anchor');
      const shadow = s.w(s.add.ellipse(PLAYER_X, PLAYER_Y + 4, 10, 3, C.black).setAlpha(0.6), 49);
      const anc = s.w(s.add.image(P().x, P().y - 230, 'fx_anchor').setAngle(-20), 64);
      s.tweens.add({ targets: shadow, scaleX: 5, scaleY: 3, duration: 650 });
      s.camFocus(P(), 1.6, 650);
      await s.tw({ targets: anc, y: P().y - 6, angle: 0, duration: 650, ease: 'Quad.easeIn' });
      s.flash(0.7, 300);
      s.shake(7, 500);
      s.boom(P().x, P().y + 6, 1.8);
      s.splash(P().x, PLAYER_Y + 10, 1.6);
      await playerHits(s, res.hits, 0, true);
      shadow.destroy();
      s.setDarkness(a.phase >= 3 ? 0.14 : 0);
      await s.wait(350);
      await s.tw({ targets: anc, alpha: 0, y: anc.y + 30, duration: 450 });
      anc.destroy();
      break;
    }
    case 'crew': {
      await s.camFocus(P(), 1.7, 400);
      sound.play('ghost');
      const n = res.hits.length;
      const sailors: Phaser.GameObjects.Sprite[] = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const x = P().x + side * (26 + (i % 3) * 10);
        const sp = s.w(s.add.sprite(x, P().y + 36, 'fx_sailor', 0).setFlipX(side > 0).setAlpha(0), 61);
        sailors.push(sp);
        s.tweens.add({ targets: sp, y: P().y + 2 - (i % 2) * 6, alpha: 1, duration: 300, delay: i * 60 });
        s.splash(x, PLAYER_Y + 10, 0.6);
      }
      await s.wait(450 + n * 60);
      for (let i = 0; i < n; i++) {
        const sp = sailors[i];
        sp.setFrame(1);
        const ox = sp.x;
        sound.play('swish');
        await s.tw({ targets: sp, x: P().x + (sp.x < P().x ? -10 : 10), duration: 70 });
        s.hitPlayer(res.hits[i]);
        sp.setFrame(0);
        s.tweens.add({ targets: sp, x: ox, duration: 120 });
        await s.wait(90);
      }
      for (const sp of sailors) s.tweens.add({ targets: sp, y: sp.y + 30, alpha: 0, duration: 350, onComplete: () => sp.destroy() });
      await s.wait(350);
      break;
    }
    case 'ram': {
      // vanish into fog...
      await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.9, 400);
      const fogs: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 5; i++) {
        const f = s.w(s.add.image(a.ship.x - 80 + i * 40, a.ship.y - 50 + (i % 2) * 20, 'fx_fog' + (i % 3)).setScale(1.6).setAlpha(0), 32);
        fogs.push(f);
        s.tweens.add({ targets: f, alpha: 0.9, duration: 400, delay: i * 60 });
      }
      await s.wait(400);
      await s.tw({ targets: a.ship, alpha: 0, duration: 400 });
      a.shipOffset.x = 260;
      sound.play('horn');
      await s.wait(900);
      s.tweens.add({ targets: fogs, alpha: 0, duration: 400, onComplete: () => fogs.forEach((f) => f.destroy()) });
      // ...and burst out of it at full sail
      a.ship.setAlpha(1);
      s.camTo(W / 2 + 40, ARENA_CY, 0.95, 300);
      await s.tw({ targets: a.shipOffset, x: -125, duration: 520, ease: 'Quad.easeIn' });
      s.flash(0.6, 300);
      s.shake(8, 600);
      sound.play('boom');
      s.boom(P().x + 20, P().y, 2);
      s.splash(P().x + 10, PLAYER_Y + 10, 2);
      s.tweens.add({ targets: a.playerOffset, x: -30, y: -10, duration: 150, yoyo: true });
      await s.camFocus(P(), 1.5, 150);
      await playerHits(s, res.hits, 0, true);
      await s.wait(400);
      await s.tw({ targets: a.shipOffset, x: 0, duration: 900, ease: 'Sine.easeInOut' });
      break;
    }
    case 'chains': {
      await s.camTo((a.hullPoint().x + P().x) / 2, P().y - 20, 1.15, 350);
      sound.play('chain');
      for (let i = 0; i < res.hits.length; i++) {
        const ch = chainLine(s);
        const from = a.shipPoint(-60 + i * 30, -10);
        const tip = { x: from.x, y: from.y };
        await s.tw({ targets: tip, x: P().x, y: P().y + (i - 1) * 8, duration: 160, ease: 'Quad.easeIn', onUpdate: () => ch.set(from, tip) } as any);
        s.hitPlayer(res.hits[i]);
        await s.tw({ targets: tip, x: from.x, y: from.y, duration: 160, onUpdate: () => ch.set(from, tip) } as any);
        ch.destroy();
      }
      await s.wait(200);
      break;
    }
    case 'tide': {
      await s.camTo(W / 2 + 30, ARENA_CY - 25, 0.82, 450);
      sound.play('wave');
      const wave = s.w(s.add.image(a.ship.x - 40, 210, 'fx_wave').setOrigin(0.3, 1).setScale(1, 0.1), 29);
      await s.tw({ targets: wave, scaleY: 1.15, duration: 900, ease: 'Sine.easeOut' });
      s.shake(3, 800);
      wave.setDepth(75);
      s.camTo(P().x + 40, ARENA_CY, 1.1, 600);
      await s.tw({ targets: wave, x: -260, duration: 700, ease: 'Quad.easeIn' });
      s.flash(0.4, 300);
      s.splash(P().x, PLAYER_Y + 10, 2);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: wave, alpha: 0, duration: 300 });
      wave.destroy();
      break;
    }
    case 'siphon': {
      await s.camTo((a.hullPoint().x + P().x) / 2, P().y - 30, 1.05, 350);
      sound.play('chain');
      const chains = [0, 1, 2].map(() => chainLine(s));
      const froms = [a.shipPoint(-70, -20), a.shipPoint(-30, -10), a.shipPoint(10, -20)];
      const tip = { t: 0 };
      await s.tw({
        targets: tip,
        t: 1,
        duration: 300,
        onUpdate: () => chains.forEach((c, i) => c.set(froms[i], { x: froms[i].x + (P().x - froms[i].x) * tip.t, y: froms[i].y + (P().y - froms[i].y) * tip.t })),
      } as any);
      sound.play('siphon');
      for (let i = 0; i < res.hits.length; i++) {
        s.hitPlayer(res.hits[i]);
        const orb = s.w(s.add.image(P().x, P().y, 'fx_soul'), 64);
        s.tweens.add({ targets: orb, x: froms[1].x, y: froms[1].y, duration: 400, onComplete: () => orb.destroy() });
        await s.wait(260);
      }
      await s.wait(300);
      chains.forEach((c) => c.destroy());
      break;
    }
    case 'fog': {
      await s.camTo(W / 2, ARENA_CY, 1, 300);
      sound.play('ghost');
      for (let i = 0; i < 8; i++) {
        const f = s.w(s.add.image(460 + i * 30, 60 + (i % 4) * 40, 'fx_fog' + (i % 3)).setScale(2).setAlpha(0.8), 81);
        s.tweens.add({ targets: f, x: -150 + i * 20, duration: 1200, delay: i * 50, onComplete: () => s.tweens.add({ targets: f, alpha: 0, duration: 400, onComplete: () => f.destroy() }) });
      }
      await s.wait(700);
      await playerHits(s, res.hits, 0);
      await s.wait(400);
      break;
    }
    case 'command': {
      const cap = () => a.captainPoint();
      if (res.stage === 'charge') {
        await s.camFocus(cap(), 2.3, 500);
        a.captain.setFrame(2);
        sound.play('horn');
        await s.wait(300);
        sound.play('charge');
        const bc = s.w(s.add.image(cap().x - 30, cap().y + 4, 'fx_bigcannon').setFlipX(true).setAlpha(0), 33);
        (s as any).__bigCannon = bc;
        for (let i = 0; i < 4; i++) {
          bc.setAlpha(i % 2 ? 0.3 : 0.9);
          await s.wait(90);
        }
        bc.setAlpha(1);
        s.shake(2, 300);
        await s.wait(500);
        reset();
        // keep it pinned to the deck while it charges
        const pin = s.time.addEvent({ delay: 16, loop: true, callback: () => bc.active && bc.setPosition(cap().x - 30, cap().y + 4) });
        (s as any).__bigCannonPin = pin;
        break;
      }
      let bc = (s as any).__bigCannon as Phaser.GameObjects.Image | undefined;
      if (!bc || !bc.active) bc = s.w(s.add.image(cap().x - 30, cap().y + 4, 'fx_bigcannon').setFlipX(true), 33);
      ((s as any).__bigCannonPin as Phaser.Time.TimerEvent | undefined)?.remove();
      await s.camFocus({ x: bc.x, y: bc.y }, 2.0, 400);
      a.captain.setFrame(2);
      sound.play('charge');
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = s.w(s.add.image(bc.x - 24 + Math.cos(ang) * 30, bc.y + Math.sin(ang) * 30, 'fx_spark'), 64);
        s.tweens.add({ targets: sp, x: bc.x - 24, y: bc.y, alpha: 0, duration: 400, delay: i * 30, onComplete: () => sp.destroy() });
      }
      await s.wait(700);
      const from = { x: bc.x - 28, y: bc.y };
      const beam = s.w(s.add.tileSprite(from.x, from.y, 8, 22, 'fx_beam').setOrigin(0, 0.5), 64);
      beam.rotation = Math.atan2(P().y - from.y, P().x - from.x);
      const len = Math.hypot(P().x - from.x, P().y - from.y);
      sound.play('boom');
      s.camTo((from.x + P().x) / 2, (from.y + P().y) / 2, 1.0, 250);
      await s.tw({ targets: beam, width: len, duration: 220, ease: 'Quad.easeIn' });
      await s.invert(90);
      s.flash(0.8, 400);
      s.shake(8, 600);
      s.boom(P().x, P().y, 2.4);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: [beam, bc], alpha: 0, duration: 400 });
      beam.destroy();
      bc.destroy();
      reset();
      break;
    }
    case 'maelstrom': {
      await s.camTo(P().x + 30, P().y - 10, 1.2, 400);
      sound.play('whirl');
      const wh = s.w(s.add.sprite(P().x, PLAYER_Y + 8, 'fx_whirl').setScale(0.1, 0.05), 45);
      wh.play('fx_whirl');
      await s.tw({ targets: wh, scaleX: 1, scaleY: 1, duration: 600 });
      a.playerLocked = true;
      const st = { a: 0 };
      const cx = P().x;
      const base = a.player.y;
      for (let i = 0; i < res.hits.length; i++) {
        await s.tw({
          targets: st,
          a: st.a + Math.PI / 1.5,
          duration: 160,
          onUpdate: () => {
            const r = 34 - i * 4;
            a.player.x = cx + Math.cos(st.a) * r;
            a.player.y = base + Math.sin(st.a) * r * 0.25 + i;
            a.raft.x = a.player.x;
          },
        } as any);
        s.splash(a.player.x, PLAYER_Y + 10, 0.6);
        s.hitPlayer(res.hits[i]);
      }
      await s.tw({ targets: wh, scaleX: 0, scaleY: 0, alpha: 0, duration: 400 });
      wh.destroy();
      await s.tw({ targets: [a.player, a.raft], x: PLAYER_X, duration: 300 });
      a.playerLocked = false;
      break;
    }
    case 'voyage': {
      if (res.stage === 'charge') {
        await s.camTo(SHIP_X - 20, ARENA_CY - 30, 0.85, 600);
        sound.play('phase');
        s.shake(3, 1500);
        const prevHover = a.shipOffset.hover;
        s.tweens.add({ targets: a.shipOffset, hover: prevHover + 22, duration: 1200, ease: 'Sine.easeInOut' });
        for (let i = 0; i < 3; i++) {
          a.lightning(true);
          await s.wait(380);
        }
        a.aura.setAlpha(0.9);
        aimCannons(true);
        sound.play('creak');
        await s.wait(500);
        break;
      }
      await s.camTo(SHIP_X - 30, ARENA_CY - 40, 1.0, 400);
      s.setDarkness(0.35);
      await s.wait(250);
      const shots: Promise<void>[] = [];
      for (let i = 0; i < res.hits.length; i++) {
        const m = a.cannonMuzzle(i);
        sound.play('cannon');
        const pf = s.w(s.add.sprite(m.x, m.y, 'fx_puff', 0), 62);
        s.tweens.add({ targets: pf, scale: 2.4, alpha: 0, duration: 500, onComplete: () => pf.destroy() });
        s.shake(2.5, 100);
        shots.push(
          s.projectile('fx_ball', m, { x: P().x + (Math.random() - 0.5) * 24, y: P().y + (Math.random() - 0.5) * 20 }, 480, 50 + (i % 4) * 14, { trail: true }).then(() => {
            s.boom(P().x + (Math.random() - 0.5) * 22, P().y + (Math.random() - 0.5) * 18, 1.1);
            s.hitPlayer(res.hits[i], i === res.hits.length - 1);
          })
        );
        if (i === 2) s.camFocus(P(), 1.4, 500);
        if (i % 3 === 0) a.lightning(i === 6);
        await s.wait(85);
      }
      await Promise.all(shots);
      s.flash(0.6, 400);
      s.shake(6, 500);
      aimCannons(false);
      s.setDarkness(a.phase >= 3 ? 0.14 : 0);
      s.tweens.add({ targets: a.shipOffset, hover: 22, duration: 1000 });
      a.aura.setAlpha(0.35);
      await s.wait(400);
      break;
    }
  }
  if (res.id !== 'frozen') a.shipFrozen = false;
}
