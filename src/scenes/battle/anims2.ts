import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_X, PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { pose, idle, bossHits, playerHits, ring, burst } from './anims';

// World 2: the four temple creatures' abilities, and every attack of the Kraken.
// Returns false for anything it does not know, so anims.ts handles the rest.

type S = BattleScene;
type Pt = { x: number; y: number };

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A jagged bolt of white light between two points, redrawn a few times so it crackles. */
async function zap(s: S, a: Pt, b: Pt, ms = 260, width = 2) {
  const g = s.w(s.add.graphics(), 64);
  const t0 = s.time.now;
  while (s.time.now - t0 < ms) {
    g.clear();
    for (const [w, c] of [
      [width + 2, C.light],
      [width, C.white],
    ] as const) {
      g.lineStyle(w, c, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      const n = 7;
      for (let k = 1; k < n; k++) {
        const p = lerp(a, b, k / n);
        g.lineTo(p.x + (Math.random() - 0.5) * 14, p.y + (Math.random() - 0.5) * 14);
      }
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    await s.wait(50);
  }
  g.destroy();
}

export async function playerAnim2(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const P = () => a.playerCenter();
  const B = () => a.shipCenter();
  switch (res.id) {
    // ---------------------------------------------------- GLOWBELL
    case 'zap_sting': {
      await s.camFocus(P(), 1.6, 260);
      pose(s, 4);
      sound.play('charge');
      for (let i = 0; i < 4; i++) s.spark(P().x + (Math.random() - 0.5) * 20, P().y + 10);
      await s.wait(220);
      s.camTo((P().x + B().x) / 2, P().y - 20, 1.0, 300);
      sound.play('crit');
      await zap(s, { x: P().x + 10, y: P().y + 8 }, B(), 300);
      await bossHits(s, res.hits, 0);
      idle(s);
      return true;
    }
    case 'static_veil': {
      await s.camFocus(P(), 1.8, 280);
      pose(s, 4);
      sound.play('shield');
      const sh = s.w(s.add.image(P().x, P().y, 'fx_shield').setScale(0.2).setAlpha(0.9), 62);
      await s.tw({ targets: sh, scale: 1.1, duration: 300, ease: 'Back.easeOut' });
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        s.spark(P().x + Math.cos(ang) * 22, P().y + Math.sin(ang) * 22);
        await s.wait(50);
      }
      s.tweens.add({ targets: sh, alpha: 0, duration: 400, delay: 300, onComplete: () => sh.destroy() });
      await s.camFocus(B(), 1.4, 300);
      sound.play('debuff');
      ring(s, B(), 'fx_ringL', 1.8, 500);
      idle(s);
      return true;
    }
    case 'jelly_flash': {
      await s.camFocus(P(), 1.7, 260);
      pose(s, 4);
      sound.play('freeze');
      ring(s, P(), 'fx_ringL', 3, 400, 66);
      s.flash(1, 500);
      await s.wait(160);
      await bossHits(s, res.hits, 0);
      idle(s);
      return true;
    }
    case 'tempest_bloom': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('charge');
      s.shake(2, 700);
      for (let i = 0; i < 8; i++) {
        s.spark(P().x + (Math.random() - 0.5) * 40, P().y - 10 + (Math.random() - 0.5) * 30);
        await s.wait(60);
      }
      await s.camTo(W / 2 + 40, ARENA_CY - 20, 0.95, 350);
      for (let i = 0; i < 5; i++) {
        sound.play(i % 2 ? 'thunder' : 'crit');
        void zap(s, { x: B().x + (Math.random() - 0.5) * 120, y: -20 }, { x: B().x + (Math.random() - 0.5) * 40, y: B().y }, 220, 3);
        s.flash(0.5, 120);
        s.shake(3, 150);
        await s.wait(140);
      }
      await bossHits(s, res.hits, 0);
      idle(s);
      return true;
    }
    // ---------------------------------------------------- HAMMERFIN
    case 'fin_bash':
    case 'frenzy_ram': {
      const big = res.id === 'frenzy_ram';
      await s.camFocus(P(), 1.6, 260);
      pose(s, 4);
      sound.play(big ? 'charge' : 'swish');
      if (big) {
        s.shake(2, 600);
        await s.wait(500);
      }
      a.playerLocked = true;
      const home = { x: a.player.x, y: a.player.y };
      s.camFocus({ x: (P().x + B().x) / 2, y: P().y - 20 }, 1.1, 260);
      for (let i = 0; i < (big ? 6 : 3); i++) {
        const l = s.w(s.add.rectangle(a.player.x - 20, a.player.y - 10 - i * 6, 26, 2, C.light), 60);
        s.tweens.add({ targets: l, x: l.x - 50, alpha: 0, duration: 300, onComplete: () => l.destroy() });
      }
      await s.tw({ targets: a.player, x: B().x - 40, duration: big ? 260 : 220, ease: 'Quad.easeIn' });
      s.boom(B().x - 20, B().y + 10, big ? 2 : 1.1);
      sound.play(big ? 'impact' : 'hit');
      s.shake(big ? 6 : 3, 300);
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: a.player, x: home.x, y: home.y, duration: 380, ease: 'Sine.easeOut' });
      a.playerLocked = false;
      idle(s);
      return true;
    }
    case 'hammer_guard': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('shield');
      const sh = s.w(s.add.image(P().x, P().y, 'fx_shield').setScale(0.3).setTint(C.light), 62);
      await s.tw({ targets: sh, scale: 1.05, duration: 260, ease: 'Back.easeOut' });
      s.shake(1.5, 200);
      await s.wait(400);
      s.tweens.add({ targets: sh, alpha: 0, duration: 400, onComplete: () => sh.destroy() });
      idle(s);
      return true;
    }
    case 'riptide_roar': {
      await s.camFocus(P(), 1.8, 260);
      pose(s, 4);
      sound.play('wail');
      for (let i = 0; i < 4; i++) {
        const arc = s.w(s.add.image(P().x + 20, P().y, 'fx_arc').setScale(0.5).setAlpha(0.9), 63);
        s.tweens.add({ targets: arc, x: B().x - 20, scale: 1.6, alpha: 0, duration: 600, delay: i * 110, onComplete: () => arc.destroy() });
      }
      s.camTo((P().x + B().x) / 2, P().y - 20, 1.0, 400);
      await s.wait(500);
      await bossHits(s, res.hits, 0);
      sound.play('debuff');
      idle(s);
      return true;
    }
    // ---------------------------------------------------- BUBBLOTL
    case 'bubble_pop': {
      await s.camFocus(P(), 1.6, 260);
      pose(s, 4);
      s.camTo((P().x + B().x) / 2, P().y - 30, 1.0, 400);
      for (let i = 0; i < res.hits.length; i++) {
        sound.play('bubbles');
        await s.projectile('bubble1', { x: P().x + 10, y: P().y - 10 }, { x: B().x + (i - 1) * 16, y: B().y - i * 8 }, 300, 30, { scale: 2 });
        burst(s, { x: B().x + (i - 1) * 16, y: B().y - i * 8 }, 'bubble0', 6, 18, 350);
        s.hitBoss(res.hits[i]);
      }
      idle(s);
      return true;
    }
    case 'froth_bath': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('heal');
      for (let i = 0; i < 14; i++) {
        const b = s.w(s.add.image(P().x + (Math.random() - 0.5) * 36, P().y + 14, i % 2 ? 'bubble0' : 'bubble1').setScale(1.5), 63);
        s.tweens.add({ targets: b, y: b.y - 40 - Math.random() * 30, alpha: 0, duration: 800, delay: i * 40, onComplete: () => b.destroy() });
      }
      await s.wait(700);
      idle(s);
      return true;
    }
    case 'big_bubble': {
      await s.camFocus(P(), 1.7, 260);
      pose(s, 4);
      sound.play('bubbles');
      const bub = s.w(s.add.image(P().x + 16, P().y - 10, 'bubble1').setScale(1), 66);
      s.camTo((P().x + B().x) / 2, ARENA_CY - 20, 0.95, 500);
      await s.tw({ targets: bub, x: B().x, y: B().y - 10, scale: 20, alpha: 0.6, duration: 700, ease: 'Sine.easeOut' });
      sound.play('freeze');
      a.shipParts.forEach((o) => o.setTint(0xbfbfbf));
      s.tweens.add({ targets: bub, scale: 19, duration: 300, yoyo: true, repeat: 1 });
      await s.wait(700);
      s.tweens.add({ targets: bub, alpha: 0.25, duration: 400 });
      s.time.delayedCall(1600, () => bub.destroy());
      a.shipParts.forEach((o) => o.clearTint());
      idle(s);
      return true;
    }
    case 'gill_geyser': {
      await s.camFocus(P(), 1.8, 300);
      pose(s, 4);
      sound.play('charge');
      s.shake(2, 600);
      await s.wait(500);
      await s.camTo(W / 2 + 40, ARENA_CY - 10, 0.95, 300);
      sound.play('wave');
      for (let i = 0; i < 26; i++) {
        const b = s.w(s.add.image(B().x + (Math.random() - 0.5) * 50, B().y + 40, i % 2 ? 'bubble1' : 'bubble0').setScale(2 + Math.random() * 2), 63);
        s.tweens.add({ targets: b, y: b.y - 160 - Math.random() * 60, alpha: 0, duration: 700, delay: i * 18, onComplete: () => b.destroy() });
      }
      await s.wait(300);
      s.shake(5, 400);
      await bossHits(s, res.hits, 0);
      idle(s);
      return true;
    }
    // ---------------------------------------------------- GLIDRAY
    case 'wing_slice': {
      await s.camFocus(P(), 1.6, 240);
      pose(s, 4);
      sound.play('swish');
      a.playerLocked = true;
      const home = { x: a.player.x, y: a.player.y };
      s.camFocus({ x: (P().x + B().x) / 2, y: P().y - 30 }, 1.1, 240);
      await s.tw({ targets: a.player, x: B().x - 30, y: B().y + 10, duration: 220, ease: 'Quad.easeIn' });
      const sl = s.w(s.add.image(B().x, B().y, 'fx_slash').setScale(1.4), 63);
      s.tweens.add({ targets: sl, alpha: 0, scale: 2, duration: 300, onComplete: () => sl.destroy() });
      await bossHits(s, res.hits, 0);
      await s.tw({ targets: a.player, x: home.x, y: home.y, duration: 380, ease: 'Sine.easeOut' });
      a.playerLocked = false;
      idle(s);
      return true;
    }
    case 'moon_mantle': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('shield');
      const m = s.w(s.add.image(P().x, P().y - 26, 'fx_moon').setScale(0.3).setAlpha(0), 61);
      await s.tw({ targets: m, scale: 1, alpha: 0.9, duration: 400 });
      const sh = s.w(s.add.image(P().x, P().y, 'fx_shield').setScale(0.2), 62);
      await s.tw({ targets: sh, scale: 1, duration: 260, ease: 'Back.easeOut' });
      await s.wait(400);
      s.tweens.add({ targets: [m, sh], alpha: 0, duration: 400, onComplete: () => (m.destroy(), sh.destroy()) });
      idle(s);
      return true;
    }
    case 'skylight_dive': {
      await s.camFocus(P(), 1.5, 240);
      pose(s, 4);
      sound.play('whoosh');
      a.playerLocked = true;
      const home = { x: a.player.x, y: a.player.y };
      await s.tw({ targets: a.player, y: -60, duration: 320, ease: 'Quad.easeIn' });
      await s.camTo(W / 2 + 40, ARENA_CY - 10, 0.95, 250);
      for (let i = 0; i < res.hits.length; i++) {
        a.player.setPosition(B().x - 40 + i * 30, -40);
        sound.play('swish');
        await s.tw({ targets: a.player, y: B().y + 10, x: B().x - 10 + i * 10, duration: 200, ease: 'Quad.easeIn' });
        s.hitBoss(res.hits[i]);
        s.shake(3, 150);
        await s.tw({ targets: a.player, y: -40, duration: 220, ease: 'Quad.easeOut' });
      }
      a.player.setPosition(home.x, -40);
      await s.tw({ targets: a.player, y: home.y, duration: 300, ease: 'Sine.easeOut' });
      a.playerLocked = false;
      idle(s);
      return true;
    }
    case 'lunar_ray': {
      await s.camFocus(P(), 1.9, 300);
      pose(s, 4);
      sound.play('charge');
      for (let i = 0; i < 6; i++) {
        s.spark(P().x - 20 + Math.random() * 40, P().y - 20);
        await s.wait(80);
      }
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      sound.play('crit');
      const g = s.w(s.add.graphics(), 64);
      const t0 = s.time.now;
      while (s.time.now - t0 < 600) {
        g.clear();
        const w = 6 + Math.sin((s.time.now - t0) / 40) * 2;
        g.lineStyle(w + 4, C.light, 0.8).lineBetween(P().x + 10, P().y - 6, B().x, B().y);
        g.lineStyle(w, C.white, 1).lineBetween(P().x + 10, P().y - 6, B().x, B().y);
        await s.wait(30);
      }
      g.destroy();
      s.flash(0.6, 300);
      s.shake(5, 300);
      await bossHits(s, res.hits, 0);
      idle(s);
      return true;
    }
  }
  return false;
}

// ============================================================ the Kraken

export async function bossAnim2(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.kr;
  if (!k) return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  const T = (i: number) => k.tents[Math.min(i, k.tents.length - 1)];
  switch (res.id) {
    case 'slam': {
      // a tentacle climbs high over the champion, a shadow grows, then it falls
      const i = 3;
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 40, 0.85, 350);
      sound.play('creak');
      const shadow = s.w(s.add.ellipse(feet().x, feet().y + 2, 10, 4, 0x000000).setAlpha(0.6), 49);
      s.tweens.add({ targets: shadow, scaleX: 4, scaleY: 2.5, duration: 700 });
      await k.steer(i, feet().x + 10, feet().y - 170, 700, 'Sine.easeOut');
      await s.wait(200);
      sound.play('whoosh');
      await k.steer(i, feet().x + 4, feet().y - 6, 150, 'Quad.easeIn');
      s.boom(feet().x, feet().y - 6, 1.8);
      sound.play('impact');
      s.shake(7, 400);
      burst(s, feet(), 'fx_dotM', 10, 40, 500);
      await playerHits(s, res.hits, 0, true);
      shadow.destroy();
      await s.wait(250);
      k.release(i);
      a.captainIdle();
      return true;
    }
    case 'sweep': {
      await s.camTo(W / 2 - 20, ARENA_CY, 0.9, 300);
      sound.play('creak');
      const i = 4;
      await k.steer(i, W + 60, feet().y - 4, 400);
      for (let h = 0; h < res.hits.length; h++) {
        const left = h % 2 === 0;
        sound.play('swish');
        await k.steer(i, left ? -40 : W + 40, feet().y - 8 - (h % 3) * 6, 220, 'Sine.easeInOut');
        s.hitPlayer(res.hits[h]);
        s.shake(2, 120);
      }
      k.release(i);
      return true;
    }
    case 'ink': {
      await s.camFocus(a.captainPoint(), 1.8, 300);
      a.captain.stop().setFrame(2);
      sound.play('siphon');
      await s.wait(300);
      sound.play('whoosh');
      s.camTo((P().x + k.body.x) / 2, ARENA_CY - 10, 0.9, 300);
      const clouds: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 10; i++) {
        const c = s.w(s.add.image(a.captainPoint().x, a.captainPoint().y + 20, 'fx_ink').setScale(0.4).setAlpha(0.95), 67);
        clouds.push(c);
        s.tweens.add({ targets: c, x: P().x + (Math.random() - 0.5) * 160, y: P().y + (Math.random() - 0.5) * 80, scale: 2 + Math.random() * 1.5, duration: 700, delay: i * 40, ease: 'Quad.easeOut' });
      }
      await s.wait(600);
      await playerHits(s, res.hits, 0);
      s.setDarkness(0.35);
      await s.wait(500);
      s.tweens.add({ targets: clouds, alpha: 0, duration: 1400, onComplete: () => clouds.forEach((c) => c.destroy()) });
      s.time.delayedCall(900, () => s.setDarkness(0));
      a.captainIdle();
      return true;
    }
    case 'whirlpool': {
      await s.camFocus(P(), 1.4, 300);
      sound.play('whirl');
      const wh = s.w(s.add.sprite(feet().x + 40, feet().y, 'fx_whirl').setScale(0.4).setAlpha(0.8), 48);
      wh.play('fx_whirl');
      await s.tw({ targets: wh, scale: 2.4, duration: 400 });
      for (let h = 0; h < res.hits.length; h++) {
        await s.tw({ targets: a.playerOffset, x: 30 + h * 12, y: 4, duration: 260, ease: 'Sine.easeInOut' });
        a.player.setAngle(h % 2 ? 12 : -12);
        s.hitPlayer(res.hits[h]);
      }
      a.player.setAngle(0);
      await s.tw({ targets: a.playerOffset, x: 0, y: 0, duration: 400 });
      s.tweens.add({ targets: wh, alpha: 0, scale: 0.5, duration: 400, onComplete: () => wh.destroy() });
      return true;
    }
    case 'grasp': {
      await s.camFocus(P(), 1.6, 300);
      const i = 4;
      sound.play('creak');
      await k.steer(i, feet().x + 30, feet().y - 20, 500);
      await k.steer(i, feet().x, feet().y - 18, 200);
      const coils: Phaser.GameObjects.Ellipse[] = [];
      for (let c = 0; c < 3; c++) coils.push(s.w(s.add.ellipse(feet().x, feet().y - 8 - c * 10, 30, 8).setStrokeStyle(3, 0x808080), 57));
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('chain');
        s.tweens.add({ targets: coils, scaleX: 0.8, duration: 120, yoyo: true });
        s.hitPlayer(res.hits[h]);
        s.shake(2, 200);
        await s.wait(260);
      }
      coils.forEach((c) => c.destroy());
      k.release(i);
      return true;
    }
    case 'gaze': {
      await s.camFocus(a.captainPoint(), 2.6, 400);
      a.captain.stop().setFrame(4);
      sound.play('ghost');
      await s.wait(500);
      s.camTo((P().x + a.captainPoint().x) / 2, ARENA_CY - 20, 0.95, 250);
      const g = s.w(s.add.graphics(), 64);
      const t0 = s.time.now;
      sound.play('crit');
      while (s.time.now - t0 < 500) {
        g.clear();
        g.lineStyle(10, C.light, 0.5).lineBetween(a.captainPoint().x, a.captainPoint().y, P().x, P().y);
        g.lineStyle(3, C.white, 1).lineBetween(a.captainPoint().x, a.captainPoint().y, P().x + (Math.random() - 0.5) * 6, P().y);
        await s.wait(30);
      }
      g.destroy();
      s.flash(0.5, 250);
      await playerHits(s, res.hits, 0, true);
      a.captainIdle();
      return true;
    }
    case 'rupture':
    case 'devour': {
      const ult = res.id === 'devour';
      if (res.stage === 'charge') {
        // the telegraph: the water pulls back, every arm rises, the whole cavern holds still
        await s.camTo(W / 2 + 40, ARENA_CY - 40, 0.8, 500);
        sound.play('rumble');
        s.shake(2, 1400);
        if (ult) {
          a.captain.stop().setFrame(2);
          s.tweens.add({ targets: k.rise, y: k.rise.y - 20, duration: 1200, yoyo: true, hold: 600 });
        }
        k.tents.forEach((t, i) => k.steer(i, t.bx + (i - 2) * 30, t.by - 150 - (i % 2) * 30, 1200));
        s.tweens.add({ targets: k.water, y: k.water.y + 30, duration: 1200, yoyo: true });
        await s.wait(1400);
        k.tents.forEach((_, i) => k.release(i));
        a.captainIdle();
        return true;
      }
      if (ult) {
        // the beak opens over everything
        await s.camFocus(a.captainPoint(), 2.0, 300);
        a.captain.stop().setFrame(2);
        sound.play('horn');
        s.shake(6, 900);
        await s.wait(600);
        s.setDarkness(0.7);
        await s.camTo(W / 2, ARENA_CY - 20, 0.9, 250);
        k.tents.forEach((_, i) => k.steer(i, feet().x + (i - 3) * 16, feet().y - 6, 260, 'Quad.easeIn'));
        await s.wait(260);
      } else {
        await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
        sound.play('wave');
        const wave = s.w(s.add.image(W + 200, ARENA_CY + 10, 'fx_wave').setScale(1.6).setAlpha(0.95), 68);
        await s.tw({ targets: wave, x: P().x, duration: 600, ease: 'Quad.easeIn' });
        s.tweens.add({ targets: wave, x: -300, alpha: 0, duration: 700, onComplete: () => wave.destroy() });
      }
      s.flash(0.9, 400);
      sound.play('impact');
      s.boom(P().x, P().y, 2.6);
      s.shake(8, 600);
      await playerHits(s, res.hits, 0, true);
      s.setDarkness(0);
      k.tents.forEach((_, i) => k.release(i));
      a.captainIdle();
      return true;
    }
  }
  void PLAYER_X;
  void PLAYER_Y;
  return false;
}
