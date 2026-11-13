import type { ActionResult } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { W, ARENA_CY } from '../../constants';
import { playerHits, ring, burst } from './anims';

// World 4: SUBJECT 9, the failed experiment in the hillside facility. One painted body
// (poses: 0 stands, 1 roars, 2 gathers, 3 spent, 4 glitch) that lurches, crackles and
// throws raw energy about; and the turns it simply loses control of itself.

type S = BattleScene;
type Pt = { x: number; y: number };
const GROUND = PLAYER_Y + 8;

/** Sparks spraying off a point. */
function sparks(s: S, p: Pt, n = 8, dist = 40, ms = 420) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const o = s.w(s.add.image(p.x, p.y, 'fx_spark'), 63);
    s.tweens.add({ targets: o, x: p.x + Math.cos(a) * dist * (0.5 + Math.random()), y: p.y + Math.sin(a) * dist * (0.5 + Math.random()), alpha: 0, duration: ms + Math.random() * 200, onComplete: () => o.destroy() });
  }
}
/** A crooked bolt from a to b, for a moment. */
function bolt(s: S, a: Pt, b: Pt, ms = 160) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const o = s.w(s.add.image((a.x + b.x) / 2, (a.y + b.y) / 2, 'fx_arc').setRotation(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2).setScale(1, d / 48), 64);
  o.setFlipX(Math.random() < 0.5);
  s.tweens.add({ targets: o, alpha: 0, duration: ms, delay: 60, onComplete: () => o.destroy() });
}
/** Flicker the body between poses (its shape will not hold still). */
async function glitch(s: S, set: (f: number) => void, n = 4, ms = 70, back = 0) {
  for (let i = 0; i < n; i++) {
    set(i % 2 ? back : 4);
    await s.wait(ms);
  }
  set(back);
}

export async function bossAnimLab(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k || k.kind !== 'subject') return false;
  const P = () => a.playerCenter();
  const feet = () => ({ x: a.player.x, y: a.player.y });
  const frame = (n: number) => k.core.setFrame(n);
  const finish = async (ms = 400) => {
    k.core.setFrame(k.restFrame());
    await s.tw({ targets: k.off, x: 0, y: 0, rot: 0, duration: ms, ease: 'Sine.easeInOut' });
    await s.wait(150);
  };
  const reach = (gap = 70) => feet().x + gap - (k.body.x - k.off.x);
  const hand = () => ({ x: k.body.x - k.core.width * 0.38, y: k.body.y - k.core.height * 0.45 });

  switch (res.id) {
    case 'surge_claw': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 280);
      frame(1);
      sound.play('zap');
      sparks(s, hand(), 6, 20);
      await s.wait(260);
      await s.tw({ targets: k.off, x: reach(56), duration: 300, ease: 'Quad.easeIn' });
      frame(2);
      sound.play('slice');
      bolt(s, hand(), P());
      s.flash(0.3, 120);
      await playerHits(s, res.hits, 0, true);
      sparks(s, P(), 10, 36);
      s.shake(6, 300);
      await finish(500);
      return true;
    }
    case 'arc_lash': {
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 300);
      frame(1);
      for (let h = 0; h < res.hits.length; h++) {
        const from = { x: k.body.x - 20 + (Math.random() - 0.5) * 30, y: k.body.y - 40 - Math.random() * 40 };
        bolt(s, from, { x: P().x + (Math.random() - 0.5) * 16, y: P().y + (Math.random() - 0.5) * 16 });
        sound.play('zap');
        if (h % 2) frame(4);
        await s.wait(150);
        frame(1);
        s.hitPlayer(res.hits[h]);
        await s.wait(110);
      }
      await finish();
      return true;
    }
    case 'overcharge': {
      await s.camFocus(k.center(), 1.4, 300);
      frame(2);
      sound.play('charge');
      for (let i = 0; i < 3; i++) {
        await s.tw({ targets: k.off, scale: 1.06 + i * 0.03, duration: 160, yoyo: true });
        sparks(s, k.center(), 5, 30);
      }
      frame(1);
      sound.play('boom');
      s.flash(0.6, 260);
      await s.camTo(W / 2, ARENA_CY - 10, 0.85, 200);
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 120, () => ring(s, k.center(), 'fx_ring', 5, 500));
      s.shake(8, 600);
      await s.wait(220);
      await playerHits(s, res.hits, 0, true);
      await finish();
      return true;
    }
    case 'drain_grip': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 0.95, 280);
      frame(1);
      sound.play('creak');
      await s.tw({ targets: k.off, x: reach(50), duration: 360, ease: 'Quad.easeIn' });
      frame(2);
      a.playerLocked = true;
      sound.play('siphon');
      for (let i = 0; i < 3; i++) {
        bolt(s, P(), hand(), 200);
        s.shake(2, 120);
        await s.wait(170);
      }
      // the light runs out of you and into it
      for (let i = 0; i < 8; i++) {
        const o = s.w(s.add.image(P().x + (Math.random() - 0.5) * 20, P().y + (Math.random() - 0.5) * 20, 'fx_spark'), 63);
        s.tweens.add({ targets: o, x: k.center().x, y: k.center().y, alpha: 0.2, duration: 380, delay: i * 40, ease: 'Quad.easeIn', onComplete: () => o.destroy() });
      }
      await playerHits(s, res.hits, 0);
      a.playerLocked = false;
      await finish(500);
      return true;
    }
    case 'static_howl': {
      await s.camFocus(k.eye(), 2, 300);
      frame(1);
      sound.play('wail');
      sound.play('zap');
      for (let i = 0; i < 4; i++) s.time.delayedCall(i * 150, () => ring(s, k.eye(), 'fx_ring', 3.4, 500));
      s.shake(4, 900);
      await glitch(s, frame, 6, 80, 1);
      await s.camTo(W / 2, ARENA_CY, 0.9, 300);
      await playerHits(s, res.hits, 0);
      await finish();
      return true;
    }
    case 'critical_mass': {
      if (res.stage === 'charge') {
        await s.camFocus(k.center(), 1.4, 400);
        frame(2);
        sound.play('powerup');
        s.setDarkness(0.4);
        for (let i = 0; i < 4; i++) {
          sparks(s, k.center(), 6, 50, 600);
          await s.wait(220);
        }
        k.core.setTint(0xffffff);
        await s.wait(500);
        return true;
      }
      await s.camTo(W / 2, ARENA_CY - 20, 0.85, 300);
      frame(1);
      sound.play('crash');
      s.flash(1, 500);
      await s.invert(160);
      s.shake(10, 1200);
      for (let h = 0; h < res.hits.length; h++) {
        bolt(s, k.center(), { x: P().x + (Math.random() - 0.5) * 30, y: P().y + (Math.random() - 0.5) * 30 }, 220);
        sound.play('zap');
        s.boom(P().x + (Math.random() - 0.5) * 30, GROUND - 10, 0.9);
        await s.wait(160);
        s.hitPlayer(res.hits[h], true);
      }
      s.setDarkness(0);
      k.core.clearTint();
      await finish(600);
      return true;
    }
    case 'meltdown': {
      // it loses hold of itself: the light spills everywhere and it staggers
      await s.camFocus(k.center(), 1.6, 300);
      sound.play('powerdown');
      k.core.clearTint();
      await glitch(s, frame, 8, 60, 0);
      sound.play('zap');
      sparks(s, k.center(), 14, 60, 600);
      for (let i = 0; i < 4; i++) bolt(s, k.center(), { x: k.body.x + (Math.random() - 0.3) * 120, y: k.body.y - Math.random() * 100 }, 200);
      s.shake(5, 600);
      frame(3);
      sound.play('heavy');
      await s.tw({ targets: k.off, y: 8, duration: 220, ease: 'Bounce.easeOut' });
      burst(s, { x: k.body.x, y: GROUND }, 'fx_dotM', 8, 40, 500);
      await s.wait(500);
      // and it hauls itself back into shape, a little less of it than before
      await glitch(s, frame, 4, 70, 0);
      await finish(300);
      return true;
    }
  }
  return false;
}
