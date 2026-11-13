import Phaser from 'phaser';
import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { pose, idle, bossHits, playerHits, ring, burst } from './anims';
import { miloSay } from './titanScenes';

// World 3: the first-stage Titan creatures' abilities, and every attack of
// Scorvex, Widowmaker and Ironclad. Returns false for anything it does not know.

type S = BattleScene;
type Pt = { x: number; y: number };

/** A fan of hot embers flying from a to b. */
async function embers(s: S, a: Pt, b: Pt, n = 10, ms = 380) {
  for (let i = 0; i < n; i++) {
    const e = s.w(s.add.image(a.x, a.y, i % 3 ? 'fx_dot' : 'fx_dotM').setScale(1 + Math.random()), 63);
    s.tweens.add({ targets: e, x: b.x + (Math.random() - 0.5) * 30, y: b.y + (Math.random() - 0.5) * 24, alpha: 0.3, duration: ms + Math.random() * 120, delay: i * 18, ease: 'Quad.easeIn', onComplete: () => e.destroy() });
  }
  await s.wait(ms + 60);
}

/** Thin silk lines strung from a to b, that fade away. */
function silk(s: S, a: Pt, b: Pt, n = 5, ms = 900) {
  const g = s.w(s.add.graphics(), 63);
  g.lineStyle(1, C.white, 0.9);
  for (let i = 0; i < n; i++) g.lineBetween(a.x, a.y + (i - n / 2) * 2, b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30);
  s.tweens.add({ targets: g, alpha: 0, duration: ms, delay: 300, onComplete: () => g.destroy() });
}

// ============================================================ the young Titans

export async function playerAnim3(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const P = () => a.playerCenter();
  const T = () => a.hullPoint();
  switch (res.id) {
    case 'ember_nip': {
      await s.camFocus(P(), 1.6, 250);
      pose(s, 4);
      sound.play('swish');
      await s.tw({ targets: a.playerOffset, x: 120, duration: 260, ease: 'Quad.easeIn' });
      sound.play('hit');
      await bossHits(s, res.hits, 0);
      burst(s, T(), 'fx_dot', 8, 30, 400);
      await s.tw({ targets: a.playerOffset, x: 0, duration: 300 });
      idle(s);
      return true;
    }
    case 'cinder_shell': {
      await s.camFocus(P(), 1.8, 250);
      pose(s, 4);
      sound.play('shield');
      ring(s, P(), 'fx_ring', 1.6, 500);
      await embers(s, { x: P().x, y: P().y + 10 }, { x: P().x, y: P().y - 30 }, 8, 400);
      idle(s);
      return true;
    }
    case 'smog_cloud': {
      await s.camFocus(P(), 1.5, 250);
      pose(s, 4);
      sound.play('whoosh');
      for (let i = 0; i < 8; i++) {
        const c = s.w(s.add.image(P().x + 10, P().y - 20, 'fx_puff', i % 3).setScale(0.6).setAlpha(0.8), 63);
        s.tweens.add({ targets: c, x: T().x + (Math.random() - 0.5) * 60, y: T().y + (Math.random() - 0.5) * 40, scale: 2.4, alpha: 0, duration: 900, delay: i * 60, onComplete: () => c.destroy() });
      }
      await s.wait(700);
      idle(s);
      return true;
    }
    case 'stoked_sting': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('charge');
      s.flash(0.3, 200);
      await s.wait(350);
      s.camFocus({ x: (P().x + T().x) / 2, y: P().y - 20 }, 1.1, 300);
      sound.play('whoosh');
      await s.projectile('fx_bolt', { x: P().x + 10, y: P().y - 10 }, T(), 300, 30, { trail: true });
      s.boom(T().x, T().y, 1.6);
      sound.play('boom');
      s.shake(5, 300);
      await bossHits(s, res.hits, 0);
      await embers(s, T(), { x: T().x, y: T().y - 50 }, 12, 500);
      idle(s);
      return true;
    }
    case 'silk_snip': {
      await s.camFocus(P(), 1.5, 220);
      await s.tw({ targets: a.playerOffset, x: 130, y: -6, duration: 220, ease: 'Quad.easeIn' });
      for (let i = 0; i < res.hits.length; i++) {
        pose(s, 4);
        sound.play('swish');
        s.hitBoss(res.hits[i]);
        await s.wait(160);
        idle(s);
      }
      await s.tw({ targets: a.playerOffset, x: 0, y: 0, duration: 300 });
      return true;
    }
    case 'venom_bite': {
      await s.camFocus(P(), 1.6, 220);
      pose(s, 4);
      await s.tw({ targets: a.playerOffset, x: 130, duration: 220, ease: 'Quad.easeIn' });
      sound.play('hit');
      await bossHits(s, res.hits, 0);
      burst(s, T(), 'fx_dotM', 8, 26, 500);
      sound.play('debuff');
      await s.tw({ targets: a.playerOffset, x: 0, duration: 300 });
      idle(s);
      return true;
    }
    case 'tangle_web': {
      await s.camFocus(P(), 1.4, 250);
      pose(s, 4);
      sound.play('whirl');
      for (let i = 0; i < 3; i++) {
        silk(s, { x: P().x + 10, y: P().y - 10 }, T(), 6);
        await s.wait(120);
      }
      s.camFocus(T(), 1.3, 300);
      sound.play('debuff');
      await s.wait(500);
      idle(s);
      return true;
    }
    case 'eightfold_flurry': {
      await s.camFocus(P(), 1.7, 250);
      pose(s, 4);
      sound.play('charge');
      await s.wait(200);
      await s.tw({ targets: a.playerOffset, x: 140, y: -10, duration: 200, ease: 'Quad.easeIn' });
      s.camFocus(T(), 1.4, 200);
      for (let i = 0; i < res.hits.length; i++) {
        sound.play(i % 2 ? 'swish' : 'hit');
        a.playerOffset.y = -10 + (i % 2 ? -6 : 6);
        s.hitBoss(res.hits[i], { x: T().x + (Math.random() - 0.5) * 40, y: T().y + (Math.random() - 0.5) * 30 });
        await s.wait(80);
      }
      await s.tw({ targets: a.playerOffset, x: 0, y: 0, duration: 320 });
      idle(s);
      return true;
    }
    case 'tiny_tap': {
      await s.camFocus(P(), 1.6, 220);
      await s.tw({ targets: a.playerOffset, x: 110, duration: 260, ease: 'Quad.easeIn' });
      pose(s, 4);
      sound.play('hammer');
      s.shake(2, 150);
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: a.playerOffset, x: 0, duration: 300 });
      idle(s);
      return true;
    }
    case 'bulwark': {
      await s.camFocus(P(), 1.8, 250);
      pose(s, 4);
      sound.play('shield');
      s.shake(1, 200);
      ring(s, P(), 'fx_ring', 1.4, 400);
      await s.wait(450);
      idle(s);
      return true;
    }
    case 'rally_clang': {
      await s.camFocus(P(), 1.7, 250);
      pose(s, 4);
      for (let i = 0; i < 3; i++) {
        sound.play('bell');
        ring(s, { x: P().x, y: P().y - 14 }, 'fx_ring', 1.2 + i * 0.4, 400);
        await s.wait(220);
      }
      s.healFx();
      idle(s);
      return true;
    }
    case 'big_bonk': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('charge');
      await s.wait(300);
      // pull back to frame the leap and the enemy it lands on
      s.camFocus({ x: (P().x + T().x) / 2 + 20, y: (P().y + T().y) / 2 - 20 }, 1.15, 300);
      await s.tw({ targets: a.playerOffset, x: 120, y: -30, duration: 300, ease: 'Quad.easeOut' });
      sound.play('whoosh');
      await s.tw({ targets: a.playerOffset, y: 0, duration: 140, ease: 'Quad.easeIn' });
      s.boom(T().x, T().y + 10, 2);
      sound.play('impact');
      s.shake(7, 400);
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: a.playerOffset, x: 0, duration: 400 });
      idle(s);
      return true;
    }
  }
  return false;
}

// ============================================================ the Titans

export async function bossAnim3(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k) return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  const finish = async () => {
    k.releaseAll();
    k.core.setFrame(k.kind === 'ironclad' ? (k.phase >= 3 ? 2 : k.phase >= 2 ? 1 : 0) : 0);
    await s.wait(200);
  };
  switch (res.id) {
    // ---------------------------------------------------------------- SCORVEX
    case 'claw': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 300);
      sound.play('creak');
      await k.steerLeg(2, feet().x + 40, feet().y - 60, 300, 'Sine.easeOut');
      sound.play('swish');
      await k.steerLeg(2, feet().x + 6, feet().y - 14, 120, 'Quad.easeIn');
      s.shake(3, 200);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'pounce': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      sound.play('rev');
      await s.tw({ targets: k.off, y: 10, duration: 300 }); // a crouch
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: -150, y: -60, duration: 260, ease: 'Quad.easeOut' });
      await s.tw({ targets: k.off, y: 0, duration: 160, ease: 'Quad.easeIn' });
      s.boom(feet().x + 20, feet().y - 10, 1.6);
      sound.play('impact');
      s.shake(7, 400);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: k.off, x: 0, duration: 500, ease: 'Sine.easeInOut' });
      await finish();
      return true;
    }
    case 'ground_breaker': {
      await s.camTo(W / 2 + 20, ARENA_CY - 20, 0.85, 300);
      sound.play('creak');
      await s.tw({ targets: k.off, rot: 0.22, y: -18, duration: 400, ease: 'Sine.easeOut' });
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('whoosh');
        await s.tw({ targets: k.off, rot: -0.05, y: 6, duration: 140, ease: 'Quad.easeIn' });
        s.shake(6, 300);
        sound.play('boom');
        for (let i = 0; i < 5; i++) s.boom(k.body.x - 90 - i * 40, PLAYER_Y + 4, 0.7);
        s.hitPlayer(res.hits[h], true);
        if (h < res.hits.length - 1) await s.tw({ targets: k.off, rot: 0.18, y: -14, duration: 260 });
      }
      await s.tw({ targets: k.off, rot: 0, y: 0, duration: 300 });
      await finish();
      return true;
    }
    case 'furnace_tail': {
      if (res.stage === 'charge') {
        await s.camFocus(k.stingerPoint(), 1.7, 400);
        k.core.setFrame(1);
        k.stinger?.setFrame(1);
        sound.play('charge');
        await k.steerTail(k.body.x + 60, k.body.y - 170, 800, 'Sine.easeOut');
        s.flash(0.3, 300);
        await s.wait(300);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 250);
      sound.play('whoosh');
      await k.steerTail(feet().x + 10, feet().y - 12, 220, 'Quad.easeIn');
      s.boom(feet().x, feet().y - 10, 2.2);
      sound.play('boom');
      s.shake(9, 500);
      s.flash(0.6, 300);
      await playerHits(s, res.hits, 0, true);
      await embers(s, feet(), { x: feet().x, y: feet().y - 60 }, 14, 500);
      k.stinger?.setFrame(0);
      await finish();
      return true;
    }
    case 'molten_sweep': {
      await s.camTo(W / 2 - 10, ARENA_CY, 0.9, 300);
      k.stinger?.setFrame(1);
      sound.play('charge');
      await k.steerTail(feet().x + 140, feet().y - 40, 300);
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('swish');
        await k.steerTail(h % 2 ? feet().x + 120 : feet().x - 30, feet().y - 20 + (h % 2) * 10, 200);
        embers(s, k.stingerPoint(), feet(), 5, 260);
        s.hitPlayer(res.hits[h]);
        s.shake(2, 120);
      }
      k.stinger?.setFrame(0);
      await finish();
      return true;
    }
    case 'smokestack': {
      await s.camFocus(k.center(), 1.4, 300);
      sound.play('whoosh');
      for (let i = 0; i < 14; i++) {
        const c = s.w(s.add.image(k.body.x + 40, k.body.y - 80, 'fx_puff', i % 3).setScale(0.8).setTint(0x333333).setAlpha(0.9), 66);
        s.tweens.add({ targets: c, x: P().x + (Math.random() - 0.5) * 180, y: P().y + (Math.random() - 0.5) * 90, scale: 3, duration: 900, delay: i * 50, ease: 'Quad.easeOut', onComplete: () => s.tweens.add({ targets: c, alpha: 0, duration: 1400, onComplete: () => c.destroy() }) });
      }
      await s.wait(700);
      s.setDarkness(0.35);
      await playerHits(s, res.hits, 0);
      s.time.delayedCall(1200, () => s.setDarkness(0));
      await finish();
      return true;
    }
    // ---------------------------------------------------------------- WIDOWMAKER
    case 'lunge': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 300);
      const i = 1;
      sound.play('creak');
      await k.steerLeg(i, k.body.x - 30, k.body.y - 110, 260, 'Sine.easeOut');
      sound.play('swish');
      await k.steerLeg(i, feet().x + 8, feet().y - 20, 130, 'Quad.easeIn');
      s.shake(4, 220);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'blade_barrage': {
      await s.camTo((P().x + k.body.x) / 2 - 20, ARENA_CY, 0.95, 280);
      for (let h = 0; h < res.hits.length; h++) {
        const i = h % 2 ? 1 : 3;
        sound.play('swish');
        await k.steerLeg(i, feet().x + 50, feet().y - 70, 110, 'Sine.easeOut');
        await k.steerLeg(i, feet().x + 4, feet().y - 18, 80, 'Quad.easeIn');
        s.hitPlayer(res.hits[h]);
        s.shake(2, 100);
      }
      await finish();
      return true;
    }
    case 'web_trap': {
      await s.camFocus(k.center(), 1.4, 300);
      sound.play('whirl');
      await s.wait(200);
      for (let i = 0; i < 4; i++) {
        silk(s, k.center(), feet(), 8, 1600);
        await s.wait(90);
      }
      const net = s.w(s.add.image(feet().x, feet().y - 20, 'fx_ring').setScale(0.4).setTint(0xffffff).setAlpha(0.8), 62);
      s.tweens.add({ targets: net, scale: 1.4, duration: 300, onComplete: () => s.tweens.add({ targets: net, alpha: 0, duration: 900, delay: 400, onComplete: () => net.destroy() }) });
      s.camFocus(P(), 1.5, 300);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'impale': {
      if (res.stage === 'charge') {
        await s.camTo(W / 2 + 30, ARENA_CY - 40, 0.8, 400);
        k.core.setFrame(1);
        sound.play('creak');
        await s.tw({ targets: k.off, y: -40, duration: 500, ease: 'Sine.easeOut' });
        await Promise.all([1, 3, 5, 7].map((i, n) => k.steerLeg(i, feet().x - 30 + n * 30, feet().y - 170, 600, 'Sine.easeOut')));
        sound.play('warn');
        return true;
      }
      sound.play('whoosh');
      await Promise.all([1, 3, 5, 7].map((i, n) => k.steerLeg(i, feet().x - 24 + n * 18, feet().y + 2, 150, 'Quad.easeIn')));
      s.boom(feet().x, feet().y, 2);
      sound.play('impact');
      s.shake(9, 500);
      s.flash(0.5, 250);
      await playerHits(s, res.hits, 0, true);
      await s.tw({ targets: k.off, y: 0, duration: 500 });
      await finish();
      return true;
    }
    case 'eight_leg': {
      await s.camTo(W / 2 - 30, ARENA_CY - 10, 0.9, 300);
      k.core.setFrame(1);
      sound.play('charge');
      await s.wait(250);
      for (let h = 0; h < res.hits.length; h++) {
        const i = h;
        sound.play(h % 2 ? 'swish' : 'hit');
        const from = h % 2 ? -60 : 70;
        k.steerLeg(i, feet().x + from, feet().y - 80, 70, 'Sine.easeOut').then(() => k.steerLeg(i, feet().x + from * 0.1, feet().y - 16, 70, 'Quad.easeIn'));
        await s.wait(120);
        s.hitPlayer(res.hits[h]);
        s.shake(2, 80);
      }
      await s.wait(200);
      await finish();
      return true;
    }
    case 'frenzy': {
      if (res.stage === 'charge') {
        await s.camFocus(k.center(), 1.5, 400);
        k.core.setFrame(1);
        sound.play('charge');
        k.sway = 3;
        s.shake(3, 1200);
        await s.wait(900);
        return true;
      }
      await s.camTo(W / 2 - 20, ARENA_CY - 10, 0.88, 250);
      await s.tw({ targets: k.off, x: -80, duration: 200, ease: 'Quad.easeIn' });
      for (let h = 0; h < res.hits.length; h++) {
        for (let n = 0; n < 2; n++) {
          const i = (h * 2 + n) % 8;
          k.steerLeg(i, feet().x + (Math.random() - 0.5) * 80, feet().y - 10 - Math.random() * 50, 60, 'Quad.easeIn');
        }
        sound.play(h % 2 ? 'swish' : 'impact');
        s.hitPlayer(res.hits[h], h === res.hits.length - 1);
        s.shake(3, 90);
        await s.wait(110);
      }
      k.sway = 1.7;
      await s.tw({ targets: k.off, x: 0, duration: 500 });
      await finish();
      return true;
    }
    // ---------------------------------------------------------------- IRONCLAD
    case 'punch': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 10, 0.9, 300);
      sound.play('creak');
      await k.swing('fist', -0.4, 400, 'Sine.easeOut');
      sound.play('whoosh');
      await k.swing('fist', 1.45, 160, 'Quad.easeIn');
      s.boom(P().x + 10, P().y, 1.3);
      sound.play('impact');
      s.shake(5, 300);
      await playerHits(s, res.hits, 0, true);
      await k.swing('fist', 0.25, 600);
      await finish();
      return true;
    }
    case 'hammer': {
      await s.camTo(W / 2 + 10, ARENA_CY - 40, 0.8, 400);
      sound.play('creak');
      await k.swing('hammer', 3.4, 900, 'Sine.easeInOut'); // up, and back over its shoulder
      await s.wait(250);
      sound.play('whoosh');
      await k.swing('hammer', 1.25, 200, 'Quad.easeIn');
      const hp = k.hammerHead();
      s.boom(hp.x, hp.y, 2.4);
      sound.play('boom');
      sound.play('impact');
      s.shake(11, 600);
      s.flash(0.5, 200);
      burst(s, feet(), 'fx_dotM', 14, 60, 600);
      s.ti?.clubShake();
      await playerHits(s, res.hits, 0, true);
      await s.wait(300);
      await k.swing('hammer', 0.35, 900);
      await finish();
      return true;
    }
    case 'quake': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.82, 300);
      sound.play('creak');
      await s.tw({ targets: k.off, rot: -0.06, y: -10, duration: 500, ease: 'Sine.easeOut' });
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('boom');
        await s.tw({ targets: k.off, rot: 0, y: 4, duration: 140, ease: 'Quad.easeIn' });
        s.shake(9, 500);
        const wave = s.w(s.add.ellipse(k.body.x - 60, PLAYER_Y + 6, 40, 10, 0xffffff).setAlpha(0.6), 49);
        s.tweens.add({ targets: wave, x: -40, scaleX: 6, alpha: 0, duration: 600, onComplete: () => wave.destroy() });
        for (let i = 0; i < 6; i++) s.boom(k.body.x - 80 - i * 34, PLAYER_Y + 4, 0.6);
        s.hitPlayer(res.hits[h], true);
        s.ti?.clubShake();
        if (h < res.hits.length - 1) await s.tw({ targets: k.off, y: -10, duration: 300 });
      }
      await s.tw({ targets: k.off, y: 0, rot: 0, duration: 300 });
      await finish();
      return true;
    }
    case 'fortress': {
      await s.camFocus(k.center(), 1.5, 300);
      sound.play('clank');
      await Promise.all([k.swing('fist', 1.9, 400), k.swing('hammer', -0.4, 400)]);
      sound.play('shield');
      s.shake(3, 300);
      ring(s, k.center(), 'fx_ring', 3, 600);
      k.core.setTintFill(0xffffff);
      s.time.delayedCall(90, () => k.core.clearTint());
      await s.wait(500);
      return true; // it stays braced: the arms drop again with its next swing
    }
    case 'command': {
      await s.camFocus({ x: k.milo!.x, y: k.milo!.y - 30 }, 2, 350);
      k.milo?.setFrame(1);
      sound.play('horn');
      await miloSay(s, ['NOW, IRONCLAD!', 'DO NOT HOLD BACK!', 'FINISH THIS!'][Math.floor(Math.random() * 3)]);
      await s.camFocus(k.eye(), 1.8, 350);
      sound.play('charge');
      k.core.setTintFill(0xffffff);
      s.time.delayedCall(120, () => k.core.clearTint());
      s.shake(3, 400);
      await s.wait(400);
      k.milo?.setFrame(0);
      await Promise.all([k.swing('fist', 0.25, 400), k.swing('hammer', 0.35, 400)]);
      return true;
    }
    case 'charge': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
      sound.play('rumble');
      await s.tw({ targets: k.off, x: 30, rot: 0.08, duration: 400 });
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: -150, rot: -0.12, duration: 300, ease: 'Quad.easeIn' });
      s.boom(P().x + 20, P().y, 2);
      sound.play('impact');
      s.shake(10, 500);
      await s.tw({ targets: a.playerOffset, x: -40, y: -10, duration: 160 });
      await playerHits(s, res.hits, 0, true);
      await Promise.all([s.tw({ targets: a.playerOffset, x: 0, y: 0, duration: 400 }), s.tw({ targets: k.off, x: 0, rot: 0, duration: 800 })]);
      await finish();
      return true;
    }
    case 'grip': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 20, 0.9, 300);
      sound.play('creak');
      await k.swing('fist', 1.25, 400);
      a.playerLocked = true;
      const fp = k.fistPoint();
      await s.tw({ targets: a.player, x: fp.x, y: fp.y + 20, duration: 250 });
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('chain');
        s.shake(3, 200);
        a.player.setAngle(h % 2 ? 10 : -10);
        s.hitPlayer(res.hits[h]);
        await s.wait(260);
      }
      sound.play('whoosh');
      a.player.setAngle(0);
      await k.swing('fist', 0.25, 300);
      await s.tw({ targets: a.player, x: 84, y: PLAYER_Y, duration: 300, ease: 'Bounce.easeOut' });
      a.playerLocked = false;
      await finish();
      return true;
    }
    case 'judgment': {
      if (res.stage === 'charge') {
        await s.camTo(W / 2 + 20, ARENA_CY - 50, 0.75, 500);
        k.milo?.setFrame(1);
        miloSay(s, 'ALL OF IT, IRONCLAD! EVERYTHING!');
        sound.play('rumble');
        await Promise.all([k.swing('hammer', 3.1, 1200, 'Sine.easeInOut'), k.swing('fist', 2.9, 1200, 'Sine.easeInOut')]);
        k.hammer?.setFrame(1);
        s.flash(0.4, 400);
        s.shake(4, 1400);
        k.milo?.setFrame(0);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 30, 0.75, 300);
      sound.play('whoosh');
      await Promise.all([k.swing('hammer', 1.2, 240, 'Quad.easeIn'), k.swing('fist', 1.0, 240, 'Quad.easeIn')]);
      const hp = k.hammerHead();
      s.flash(1, 400);
      await s.invert(120);
      s.boom(hp.x, hp.y, 3);
      sound.play('boom');
      sound.play('impact');
      s.shake(14, 900);
      for (let i = 0; i < 8; i++) {
        const wave = s.w(s.add.ellipse(hp.x, PLAYER_Y + 6, 30, 8, 0xffffff).setAlpha(0.7), 49);
        s.tweens.add({ targets: wave, scaleX: 10 + i * 2, scaleY: 3, alpha: 0, duration: 700, delay: i * 70, onComplete: () => wave.destroy() });
      }
      s.ti?.clubShake(true);
      await playerHits(s, res.hits, 0, true);
      await s.wait(400);
      k.hammer?.setFrame(1);
      await Promise.all([k.swing('hammer', 0.35, 1000), k.swing('fist', 0.25, 1000)]);
      await finish();
      return true;
    }
  }
  return false;
}

void Phaser;
