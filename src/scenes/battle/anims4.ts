import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { playerHits, ring, burst } from './anims';
import { isSpirit } from '../../engine/spirits';
import type { TitanRig } from './TitanRig';

// World 4: every attack of the island's spirits and the Reaper. Each body is a single
// painted sprite, so the attacks move the whole of it (lunges, leaps, dives, coils)
// and throw the island at you: roots, wind, nuts, feathers, the dark.

type S = BattleScene;
type Pt = { x: number; y: number };

const GROUND = PLAYER_Y + 8;

/** Roots burst out of the ground under a point and sink back. */
function roots(s: S, p: Pt, n = 5, hold = 700) {
  for (let i = 0; i < n; i++) {
    const r = s.w(s.add.image(p.x - 30 + (i * 60) / Math.max(1, n - 1), GROUND + 6, 'fx_root').setOrigin(0.5, 1).setScale(1, 0.1), 58);
    r.setFlipX(i % 2 === 1);
    s.tweens.add({ targets: r, scaleY: 1 + Math.random() * 0.4, duration: 180, delay: i * 40, ease: 'Back.easeOut' });
    s.tweens.add({ targets: r, scaleY: 0, alpha: 0, duration: 300, delay: hold + i * 40, onComplete: () => r.destroy() });
  }
}

/** Streaks of wind from a to b. */
function gusts(s: S, a: Pt, b: Pt, n = 8, ms = 360) {
  for (let i = 0; i < n; i++) {
    const g = s.w(s.add.image(a.x, a.y + (Math.random() - 0.5) * 60, 'fx_gust').setAlpha(0.9).setFlipX(b.x < a.x), 63);
    s.tweens.add({ targets: g, x: b.x + (Math.random() - 0.5) * 30, y: b.y + (Math.random() - 0.5) * 50, alpha: 0, duration: ms + Math.random() * 120, delay: i * 45, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
  }
}

/** A whirl of leaves / dust / shadow turning around a point. */
function swirl(s: S, p: Pt, key: string, n = 10, r = 40, ms = 900, tint?: number) {
  for (let i = 0; i < n; i++) {
    const o = s.w(s.add.image(p.x, p.y, key, key === 'fx_puff' ? i % 3 : undefined), 63);
    if (tint !== undefined) o.setTint(tint);
    const st = { a: (i / n) * Math.PI * 2, r: r * 0.3 };
    s.tweens.add({
      targets: st,
      a: st.a + Math.PI * 3,
      r,
      duration: ms,
      onUpdate: () => o.setPosition(p.x + Math.cos(st.a) * st.r, p.y + Math.sin(st.a) * st.r * 0.6 - st.r * 0.3),
      onComplete: () => o.destroy(),
    });
  }
}

/** Things raining down on the player (nuts, feathers, rocks). */
function rainOn(s: S, key: string, x: number, n: number, spread = 80, ms = 420) {
  for (let i = 0; i < n; i++) {
    const o = s.w(s.add.image(x + (Math.random() - 0.5) * spread, -20 - Math.random() * 60, key), 63);
    s.tweens.add({ targets: o, y: GROUND - Math.random() * 10, angle: 360, duration: ms + Math.random() * 200, delay: i * 50, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
  }
}

/** The dark gathering in toward a point. */
function gather(s: S, p: Pt, n = 14, ms = 600) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 70 + Math.random() * 50;
    const o = s.w(s.add.image(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 'fx_puff', i % 3).setTint(0x111111).setScale(0.7), 64);
    s.tweens.add({ targets: o, x: p.x, y: p.y, scale: 0.1, duration: ms, delay: i * 25, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
  }
}

/** Shadow hands out of the floor. */
function hands(s: S, x: number, n = 4) {
  for (let i = 0; i < n; i++) {
    const h = s.w(s.add.image(x - 36 + i * 24, GROUND + 8, 'fx_darkhand').setOrigin(0.5, 1).setScale(1, 0), 59);
    s.tweens.add({ targets: h, scaleY: 1, duration: 220, delay: i * 60, ease: 'Back.easeOut' });
    s.tweens.add({ targets: h, scaleY: 0, alpha: 0, duration: 260, delay: 800 + i * 60, onComplete: () => h.destroy() });
  }
}

export async function bossAnim4(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k || !isSpirit(k.kind)) return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  /** frames shift for the enraged squirrel */
  const F = (n: number) => (k.kind === 'squirrel' && k.phase >= 2 && n <= 3 ? n + 4 : n);
  const frame = (n: number) => k.core.setFrame(F(n));
  const finish = async (ms = 400) => {
    k.core.setFrame(k.restFrame());
    await s.tw({ targets: k.off, x: 0, y: 0, rot: 0, duration: ms, ease: 'Sine.easeInOut' });
    await s.wait(150);
  };
  /** how far the body must move to stand right in front of you */
  const reach = (gap = 70) => feet().x + gap - (k.body.x - k.off.x);
  const mid = () => s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 280);

  switch (res.id) {
    // ================================================================ THE CHAMPION
    case 'ground_slam': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
      frame(1);
      sound.play('roar_small');
      await s.tw({ targets: k.off, y: -24, duration: 380, ease: 'Sine.easeOut' });
      await s.wait(160);
      frame(2);
      await s.tw({ targets: k.off, y: 4, duration: 130, ease: 'Quad.easeIn' });
      sound.play('impact');
      s.shake(10, 600);
      for (let i = 0; i < 6; i++) s.boom(k.body.x - 50 - i * 40, GROUND - 4, 0.8);
      burst(s, { x: k.body.x - 40, y: GROUND }, 'fx_dotM', 10, 50, 500);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'root_trap': {
      await s.camFocus(k.center(), 1.3, 300);
      frame(2);
      sound.play('rumble');
      await s.wait(300);
      await s.camFocus(P(), 1.5, 260);
      sound.play('grow');
      roots(s, feet(), 6, 900);
      await s.wait(200);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'crushing_grip': {
      await mid();
      frame(1);
      sound.play('creak');
      await s.tw({ targets: k.off, x: reach(60), duration: 360, ease: 'Quad.easeIn' });
      frame(2);
      a.playerLocked = true;
      for (let i = 0; i < 3; i++) {
        sound.play('heavy');
        s.shake(3, 140);
        a.player.setScale(1, 0.88);
        await s.wait(130);
        a.player.setScale(1, 1);
        await s.wait(70);
      }
      a.playerLocked = false;
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'pummel': {
      await mid();
      await s.tw({ targets: k.off, x: reach(64), duration: 300, ease: 'Quad.easeIn' });
      for (let h = 0; h < res.hits.length; h++) {
        frame(h % 2 ? 2 : 1);
        sound.play('swish');
        await s.tw({ targets: k.off, x: k.off.x - 14, duration: 90, yoyo: true });
        s.hitPlayer(res.hits[h]);
        await s.wait(120);
      }
      await finish();
      return true;
    }
    case 'forest_rage': {
      await s.camFocus(k.eye(), 1.9, 400);
      frame(1);
      sound.play('roar');
      s.shake(5, 1000);
      swirl(s, k.center(), 'fx_dot', 14, 60, 900);
      s.flash(0.4, 300);
      await s.wait(900);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }

    // ================================================================ WISPMANE
    case 'ethereal_claws': {
      await mid();
      frame(2);
      sound.play('creak');
      await s.wait(220);
      await s.tw({ targets: k.off, x: reach(56), y: -18, duration: 240, ease: 'Quad.easeIn' });
      frame(0);
      for (let h = 0; h < Math.max(1, res.hits.length); h++) {
        sound.play('swish');
        const g = s.w(s.add.image(P().x + 6, P().y - 4, 'fx_slash').setScale(1.6).setAlpha(0.95), 64);
        s.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
        if (res.hits[h]) s.hitPlayer(res.hits[h], true);
        await s.wait(140);
      }
      await finish(500);
      return true;
    }
    case 'natures_grasp': {
      await s.camFocus(P(), 1.5, 300);
      sound.play('grow');
      roots(s, feet(), 7, 1100);
      swirl(s, P(), 'fx_dot', 8, 30, 800);
      await s.wait(300);
      await playerHits(s, res.hits, 160);
      await finish();
      return true;
    }
    case 'ancient_growth': {
      await s.camFocus(k.center(), 1.5, 300);
      frame(4);
      sound.play('grow');
      for (let i = 0; i < 10; i++) {
        const l = s.w(s.add.image(k.body.x + (Math.random() - 0.5) * 120, GROUND, 'fx_dot').setScale(1.5), 63);
        s.tweens.add({ targets: l, y: k.center().y - 40 - Math.random() * 40, alpha: 0, duration: 900, delay: i * 50, onComplete: () => l.destroy() });
      }
      ring(s, k.center(), 'fx_ring', 2.4, 700);
      sound.play('heal');
      await s.wait(800);
      await finish();
      return true;
    }
    case 'forest_roar': {
      await s.camFocus(k.eye(), 2, 400);
      frame(1);
      sound.play('roar');
      s.shake(7, 1100);
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 220, () => ring(s, k.eye(), 'fx_ring', 3, 600));
      gusts(s, k.eye(), P(), 10, 420);
      await s.wait(700);
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'overgrowth': {
      await s.camTo(W / 2 - 20, ARENA_CY - 10, 0.9, 300);
      frame(1);
      sound.play('grow');
      for (let h = 0; h < res.hits.length; h++) {
        roots(s, { x: feet().x + (h % 2 ? 16 : -16), y: feet().y }, 4, 400);
        sound.play('swish');
        s.hitPlayer(res.hits[h]);
        await s.wait(220);
      }
      await finish();
      return true;
    }
    case 'natures_wrath': {
      if (res.stage === 'charge') {
        await s.camFocus(k.eye(), 1.9, 500);
        frame(1);
        sound.play('roar');
        sound.play('charge');
        s.shake(4, 1400);
        swirl(s, k.center(), 'fx_dot', 18, 70, 1400);
        s.setDarkness(0.25);
        await s.wait(1200);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.8, 300);
      frame(2);
      sound.play('roar');
      await s.wait(200);
      s.flash(0.8, 400);
      sound.play('impact');
      s.shake(12, 900);
      for (let i = 0; i < 5; i++) s.time.delayedCall(i * 120, () => roots(s, { x: feet().x - 60 + i * 30, y: feet().y }, 4, 700));
      rainOn(s, 'fx_dotM', feet().x, 14, 160, 400);
      await s.wait(400);
      await playerHits(s, res.hits, 110, true);
      s.setDarkness(0);
      await finish(600);
      return true;
    }

    // ================================================================ THE MUTANT CROW
    case 'wing_gust': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.9, 300);
      frame(1);
      for (let i = 0; i < 2; i++) {
        sound.play('whoosh');
        await s.tw({ targets: k.off, y: -12, duration: 160, yoyo: true });
      }
      gusts(s, k.center(), P(), 12, 380);
      await s.wait(300);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'feather_barrage': {
      await s.camTo(W / 2, ARENA_CY - 20, 0.9, 300);
      frame(1);
      sound.play('caw');
      for (let h = 0; h < res.hits.length; h++) {
        for (let i = 0; i < 3; i++) {
          const f = s.w(s.add.image(k.center().x, k.center().y + (i - 1) * 10, 'fx_feather').setFlipX(false), 63);
          s.tweens.add({ targets: f, x: P().x + (Math.random() - 0.5) * 20, y: P().y + (Math.random() - 0.5) * 20, duration: 220, delay: i * 40, ease: 'Quad.easeIn', onComplete: () => f.destroy() });
        }
        sound.play('swish');
        await s.wait(240);
        s.hitPlayer(res.hits[h]);
      }
      await finish();
      return true;
    }
    case 'diving_strike': {
      await s.camTo(W / 2, ARENA_CY - 40, 0.8, 300);
      frame(1);
      sound.play('caw');
      await s.tw({ targets: k.off, y: -170, duration: 420, ease: 'Sine.easeOut' });
      frame(2);
      await s.wait(220);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(30), y: GROUND - (k.body.y - k.off.y) + 6, duration: 260, ease: 'Quad.easeIn' });
      s.boom(feet().x + 10, feet().y - 10, 1.6);
      sound.play('impact');
      s.shake(8, 400);
      await playerHits(s, res.hits, 0, true);
      frame(1);
      await finish(600);
      return true;
    }
    case 'screech': {
      await s.camFocus(k.eye(), 2, 300);
      frame(1);
      sound.play('screech');
      for (let i = 0; i < 4; i++) s.time.delayedCall(i * 140, () => ring(s, k.eye(), 'fx_ring', 3.2, 500));
      s.shake(4, 900);
      await s.invert(100);
      await s.wait(500);
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'blackout_storm': {
      if (res.stage === 'charge') {
        await s.camFocus(k.center(), 1.4, 400);
        frame(1);
        sound.play('caw');
        await s.tw({ targets: k.off, y: -120, duration: 700, ease: 'Sine.easeOut' });
        swirl(s, k.center(), 'fx_feather', 16, 80, 1400);
        s.setDarkness(0.35);
        sound.play('charge');
        await s.wait(1000);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
      s.setDarkness(0.6);
      sound.play('screech');
      for (let h = 0; h < res.hits.length; h++) {
        rainOn(s, 'fx_feather', feet().x, 6, 100, 300);
        gusts(s, { x: W + 20, y: P().y }, P(), 4, 260);
        sound.play('whoosh');
        await s.wait(200);
        s.hitPlayer(res.hits[h], true);
      }
      s.setDarkness(0);
      await finish(600);
      return true;
    }

    // ================================================================ THE ANCIENT TREE GUARDIAN
    case 'nut_barrage': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('swish');
        await s.projectile('fx_nut', { x: k.center().x - 20, y: k.center().y - 10 }, { x: P().x, y: P().y }, 240, 40, { spin: true });
        s.hitPlayer(res.hits[h]);
        await s.wait(60);
      }
      await finish();
      return true;
    }
    case 'tail_slam': {
      await mid();
      await s.tw({ targets: k.off, x: reach(70), duration: 300, ease: 'Quad.easeIn' });
      frame(1);
      sound.play('creak');
      await s.tw({ targets: k.off, rot: 0.25, duration: 260, ease: 'Sine.easeOut' });
      sound.play('whoosh');
      await s.tw({ targets: k.off, rot: -0.35, duration: 140, ease: 'Quad.easeIn' });
      s.boom(feet().x, feet().y - 6, 1.4);
      sound.play('impact');
      s.shake(7, 400);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'branch_leap': {
      await s.camTo(W / 2, ARENA_CY - 40, 0.8, 300);
      // up the wall, across the branches, and down on top of you
      sound.play('swish');
      await s.tw({ targets: k.off, x: 60, y: -150, duration: 360, ease: 'Sine.easeOut' });
      sound.play('creak');
      await s.tw({ targets: k.off, x: -90, y: -190, duration: 300 });
      frame(2);
      await s.wait(150);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(20), y: 0, duration: 260, ease: 'Quad.easeIn' });
      s.boom(feet().x, feet().y - 6, 1.8);
      sound.play('impact');
      s.shake(9, 500);
      await playerHits(s, res.hits, 0, true);
      await finish(600);
      return true;
    }
    case 'whirlwind_spin': {
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      frame(2);
      sound.play('whirl');
      const spin = s.tweens.add({ targets: k.off, rot: Math.PI * 2, duration: 300, repeat: -1 });
      await s.tw({ targets: k.off, x: reach(40), duration: 300, ease: 'Quad.easeIn' });
      for (let h = 0; h < res.hits.length; h++) {
        swirl(s, P(), 'fx_puff', 4, 30, 300);
        sound.play('swish');
        s.hitPlayer(res.hits[h]);
        await s.wait(170);
      }
      spin.stop();
      k.off.rot = 0;
      await finish();
      return true;
    }
    case 'forestquake': {
      if (res.stage === 'charge') {
        await s.camTo(W / 2, ARENA_CY - 50, 0.8, 400);
        frame(1);
        sound.play('creak');
        await s.tw({ targets: k.off, y: -200, duration: 700, ease: 'Sine.easeOut' });
        sound.play('rumble');
        s.shake(3, 1200);
        rainOn(s, 'fx_dotM', W / 2, 10, 300, 600);
        await s.wait(700);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
      frame(2);
      sound.play('whoosh');
      await s.tw({ targets: k.off, x: reach(60) * 0.5, y: 0, duration: 320, ease: 'Quad.easeIn' });
      sound.play('impact');
      sound.play('boom');
      s.shake(14, 1000);
      s.flash(0.6, 300);
      for (let i = 0; i < 7; i++) s.boom(30 + i * 60, GROUND - 4, 1);
      rainOn(s, 'fx_nut', feet().x, 10, 120, 400);
      await playerHits(s, res.hits, 0, true);
      await finish(600);
      return true;
    }

    // ================================================================ VIPERWIND
    case 'gale_strike': {
      await mid();
      frame(2);
      for (let h = 0; h < res.hits.length; h++) {
        sound.play('whoosh');
        await s.tw({ targets: k.off, x: reach(30), y: -10, duration: 120, ease: 'Quad.easeIn' });
        gusts(s, k.center(), P(), 3, 200);
        s.hitPlayer(res.hits[h]);
        await s.tw({ targets: k.off, x: h % 2 ? -40 : 30, y: -30, duration: 150, ease: 'Quad.easeOut' });
      }
      await finish();
      return true;
    }
    case 'tornado_trap': {
      await s.camFocus(P(), 1.4, 300);
      frame(3);
      sound.play('whirl');
      swirl(s, { x: P().x, y: P().y + 10 }, 'fx_gust', 12, 46, 1100);
      swirl(s, { x: P().x, y: P().y - 10 }, 'fx_puff', 8, 34, 1100, 0xbbbbbb);
      await s.tw({ targets: a.playerOffset, y: -18, duration: 500, yoyo: true });
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'skyfall': {
      await s.camTo(W / 2, ARENA_CY - 40, 0.8, 300);
      frame(0);
      sound.play('whoosh');
      await s.tw({ targets: k.off, y: -320, duration: 420, ease: 'Quad.easeIn' });
      sound.play('hiss');
      await s.wait(500);
      k.off.x = reach(10);
      frame(2);
      sound.play('whoosh');
      await s.tw({ targets: k.off, y: 0, duration: 300, ease: 'Quad.easeIn' });
      s.boom(feet().x, feet().y - 8, 2.2);
      sound.play('impact');
      s.shake(11, 600);
      gusts(s, feet(), { x: feet().x - 120, y: feet().y - 30 }, 8, 300);
      await playerHits(s, res.hits, 0, true);
      await finish(600);
      return true;
    }
    case 'wind_barrier': {
      await s.camFocus(k.center(), 1.5, 300);
      frame(3);
      sound.play('hiss');
      sound.play('shield');
      swirl(s, k.center(), 'fx_gust', 14, 70, 1000);
      ring(s, k.center(), 'fx_ring', 2.6, 800);
      await s.wait(900);
      await finish();
      return true;
    }
    case 'cyclone_rush': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.85, 300);
      frame(2);
      sound.play('whirl');
      for (let h = 0; h < res.hits.length; h++) {
        const left = h % 2 === 0;
        sound.play('whoosh');
        await s.tw({ targets: k.off, x: left ? reach(-20) : 30, y: left ? -6 : -40, duration: 110, ease: 'Sine.easeInOut' });
        gusts(s, k.center(), P(), 2, 160);
        s.hitPlayer(res.hits[h]);
      }
      await finish();
      return true;
    }
    case 'tempest': {
      if (res.stage === 'charge') {
        await s.camTo(W / 2, ARENA_CY - 40, 0.8, 400);
        frame(1);
        sound.play('hiss');
        await s.tw({ targets: k.off, y: -60, duration: 600, ease: 'Sine.easeOut' });
        sound.play('charge');
        swirl(s, { x: W / 2, y: 40 }, 'fx_puff', 16, 160, 1600, 0x777777);
        s.setDarkness(0.35);
        await s.wait(1300);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.8, 300);
      s.setDarkness(0.5);
      sound.play('thunder');
      s.flash(0.8, 300);
      for (let h = 0; h < res.hits.length; h++) {
        gusts(s, { x: W + 30, y: P().y - 40 + h * 10 }, P(), 6, 240);
        swirl(s, P(), 'fx_gust', 4, 40, 400);
        sound.play('whoosh');
        await s.wait(170);
        s.hitPlayer(res.hits[h], true);
      }
      s.setDarkness(0);
      await finish(600);
      return true;
    }

    // ================================================================ THE REAPER (it makes no sound of its own)
    case 'reaper_mend': {
      await s.camFocus(k.center(), 1.6, 400);
      frame(4);
      gather(s, k.center(), 16, 700);
      await s.wait(700);
      k.core.setTintFill(0x000000);
      await s.wait(160);
      k.core.clearTint();
      await s.wait(300);
      await finish();
      return true;
    }
    case 'dark_slash': {
      await mid();
      frame(1);
      await s.wait(400);
      await s.tw({ targets: k.off, x: reach(50), duration: 160, ease: 'Quad.easeIn' });
      frame(2);
      sound.play('slice');
      const g = s.w(s.add.image(P().x, P().y, 'fx_darkblade').setScale(0.5).setAngle(-30), 64);
      s.tweens.add({ targets: g, alpha: 0, angle: 30, duration: 360, onComplete: () => g.destroy() });
      await playerHits(s, res.hits, 0, true);
      await s.wait(200);
      await finish(500);
      return true;
    }
    case 'soul_drain': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 1, 300);
      frame(3);
      await s.wait(300);
      for (let h = 0; h < res.hits.length; h++) {
        for (let i = 0; i < 6; i++) {
          const o = s.w(s.add.image(P().x + (Math.random() - 0.5) * 20, P().y + (Math.random() - 0.5) * 20, 'fx_dot').setTint(0xdddddd), 64);
          s.tweens.add({ targets: o, x: k.center().x - 20, y: k.center().y - 10, alpha: 0.2, duration: 500, delay: i * 40, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
        }
        s.hitPlayer(res.hits[h]);
        await s.wait(360);
      }
      await finish();
      return true;
    }
    case 'shadow_step': {
      await s.camTo(W / 2, ARENA_CY, 0.9, 260);
      // gone... and then right beside you
      k.core.setAlpha(0);
      swirl(s, k.center(), 'fx_puff', 6, 30, 300, 0x111111);
      await s.wait(500);
      k.off.x = reach(40);
      frame(2);
      k.core.setAlpha(1);
      sound.play('slice');
      await playerHits(s, res.hits, 0, true);
      await s.wait(250);
      k.core.setAlpha(0);
      await s.wait(200);
      k.off.x = 0;
      k.core.setAlpha(1);
      await finish(200);
      return true;
    }
    case 'graveyard': {
      await s.camFocus(P(), 1.4, 300);
      frame(3);
      s.setDarkness(0.25);
      for (let h = 0; h < res.hits.length; h++) {
        hands(s, feet().x + (h % 2 ? 10 : -10), 3);
        s.hitPlayer(res.hits[h]);
        await s.wait(230);
      }
      s.setDarkness(0);
      await finish();
      return true;
    }
    case 'judgment_r': {
      await s.camFocus(k.eye(), 1.8, 400);
      frame(1);
      await s.wait(600);
      await s.camFocus(P(), 1.6, 300);
      const g = s.w(s.add.image(P().x, -60, 'fx_darkblade').setScale(1.2).setAngle(90), 64);
      await s.tw({ targets: g, y: P().y, duration: 220, ease: 'Quad.easeIn' });
      sound.play('slice');
      s.flash(0.7, 300);
      s.shake(10, 600);
      s.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
      await playerHits(s, res.hits, 0, true);
      await finish(500);
      return true;
    }
    case 'blackout': {
      await s.camFocus(k.center(), 1.3, 300);
      frame(4);
      gather(s, { x: W / 2, y: ARENA_CY }, 20, 800);
      await s.wait(500);
      s.setDarkness(0.7);
      await s.wait(700);
      await playerHits(s, res.hits, 0);
      s.time.delayedCall(900, () => s.setDarkness(0.15));
      await finish();
      return true;
    }
    case 'soul_chains': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 300);
      frame(3);
      const g = s.w(s.add.graphics(), 63);
      const c0 = k.center();
      for (let i = 0; i < 3; i++) {
        g.lineStyle(3, C.black, 1).lineBetween(c0.x - 10, c0.y - 6 + i * 6, P().x, P().y - 8 + i * 8);
        g.lineStyle(1, C.mid, 1).lineBetween(c0.x - 10, c0.y - 6 + i * 6, P().x, P().y - 8 + i * 8);
      }
      sound.play('chain');
      await s.wait(300);
      await playerHits(s, res.hits, 0);
      s.tweens.add({ targets: g, alpha: 0, duration: 800, delay: 600, onComplete: () => g.destroy() });
      await finish();
      return true;
    }
    case 'deaths_approach': {
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      frame(4);
      for (let h = 0; h < res.hits.length; h++) {
        await s.tw({ targets: k.off, x: (reach(40) * (h + 1)) / res.hits.length, duration: 120, ease: 'Quad.easeIn' });
        frame(h % 2 ? 1 : 2);
        sound.play('slice');
        s.hitPlayer(res.hits[h]);
        await s.wait(80);
      }
      await finish(500);
      return true;
    }
    case 'final_collection': {
      if (res.stage === 'charge') {
        // the guardian, the music, the light: everything waits on it now
        await s.camFocus(k.eye(), 1.8, 600);
        frame(1);
        gather(s, { x: k.center().x, y: k.center().y - 60 }, 24, 1400);
        s.setDarkness(0.4);
        await s.wait(1600);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY, 0.8, 300);
      frame(2);
      s.setDarkness(0.9);
      await s.wait(500);
      sound.play('slice');
      s.flash(1, 600);
      await s.invert(200);
      s.shake(14, 1400);
      const g = s.w(s.add.image(W / 2, ARENA_CY, 'fx_darkblade').setScale(3).setAlpha(0.95), 66);
      s.tweens.add({ targets: g, angle: 120, alpha: 0, scale: 5, duration: 1000, onComplete: () => g.destroy() });
      for (let i = 0; i < 8; i++) hands(s, 30 + i * 40, 1);
      await playerHits(s, res.hits, 0, true);
      await s.wait(800);
      return true;
    }
  }
  void (k as TitanRig);
  return false;
}
