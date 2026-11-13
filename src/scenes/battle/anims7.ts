import Phaser from 'phaser';
import type { ActionResult, Hit } from '../../engine/types';
import type { BattleScene } from '../BattleScene';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';

// ROGUELIKE: the staging for the dungeon's five spirits (every ability its own sequence),
// and for the dungeon's enemies, whose attacks are staged by their `style`.

type S = BattleScene;
type Pt = { x: number; y: number };

const pose = (s: S, frame: number) => {
  const pl = s.arena.player;
  pl.stop();
  pl.setFrame(frame);
};
const idle = (s: S) => s.arena.player.play(s.idleAnim);
async function bossHits(s: S, hits: Hit[], gap: number, at?: () => Pt) {
  for (let i = 0; i < hits.length; i++) {
    s.hitBoss(hits[i], at?.());
    if (i < hits.length - 1) await s.wait(gap);
  }
}
async function playerHits(s: S, hits: Hit[], gap: number, heavy = false) {
  for (let i = 0; i < hits.length; i++) {
    s.hitPlayer(hits[i], heavy);
    if (i < hits.length - 1) await s.wait(gap);
  }
}
function ring(s: S, p: Pt, to = 2, dur = 400, key = 'fx_ring') {
  const r = s.w(s.add.image(p.x, p.y, key).setScale(0.2), 62);
  s.tweens.add({ targets: r, scale: to, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}
function puffs(s: S, p: Pt, n: number, spread: number, rise = 20, dur = 600, tint?: number) {
  for (let i = 0; i < n; i++) {
    const o = s.w(s.add.image(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * spread * 0.5, 'fx_puff', i % 3).setScale(0.5 + Math.random() * 0.6), 62);
    if (tint !== undefined) o.setTint(tint);
    s.tweens.add({ targets: o, y: o.y - rise - Math.random() * rise, x: o.x + (Math.random() - 0.5) * 16, alpha: 0, scale: o.scale * 1.8, duration: dur + Math.random() * 200, onComplete: () => o.destroy() });
  }
}
function sparks(s: S, p: Pt, n: number, dist: number, key = 'fx_dotM') {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const o = s.w(s.add.image(p.x, p.y, key), 63);
    s.tweens.add({ targets: o, x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist, alpha: 0, duration: 380 + Math.random() * 160, onComplete: () => o.destroy() });
  }
}
/** A line drawn between two points for a moment (threads, beams, sound). */
function streak(s: S, a: Pt, b: Pt, ms: number, color: number = C.white, width = 1) {
  const g = s.w(s.add.graphics(), 63);
  g.lineStyle(width, color, 1).lineBetween(a.x, a.y, b.x, b.y);
  s.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
  return g;
}
/** Arcs of sound rolling out from a point toward the foe. */
async function soundWaves(s: S, from: Pt, to: Pt, n: number, gap = 110) {
  for (let i = 0; i < n; i++) {
    const arc = s.w(s.add.image(from.x + 12, from.y, 'fx_arc').setScale(0.5), 63);
    s.tweens.add({ targets: arc, x: to.x - 10, y: to.y, scale: 2.6, alpha: 0, duration: 520, onComplete: () => arc.destroy() });
    await s.wait(gap);
  }
}

// ================================================================ the five spirits

export async function playerAnim7(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const P = () => a.playerCenter();
  const T = () => a.hullPoint();
  const mid = () => ({ x: (P().x + T().x) / 2, y: (P().y + T().y) / 2 - 10 });
  switch (res.id) {
    // ---------------------------------------------------- SOOTWICK: smoke and embers
    case 'soot_puff': {
      await s.camFocus(P(), 1.7, 240);
      pose(s, 4);
      sound.play('ghost');
      puffs(s, { x: P().x + 8, y: P().y - 14 }, 4, 10);
      await s.wait(140);
      s.camFocus(mid(), 1.15, 380);
      await s.projectile('fx_puff', { x: P().x + 12, y: P().y - 12 }, T(), 380, 18, { trail: true, scale: 1.2 });
      idle(s);
      puffs(s, T(), 8, 34, 14, 700, 0x808080);
      await bossHits(s, res.hits, 0);
      await s.wait(320);
      return true;
    }
    case 'cinder_burst': {
      await s.camFocus(P(), 1.7, 220);
      pose(s, 4);
      for (let i = 0; i < Math.max(2, res.hits.length); i++) {
        sound.play('cast');
        s.camFocus(mid(), 1.2, 200);
        await s.projectile('fx_dotM', { x: P().x + 10, y: P().y - 20 }, { x: T().x + (i ? 8 : -8), y: T().y + (i ? -6 : 6) }, 260, 30 - i * 14, { trail: true, scale: 1.4 });
        if (res.hits[i]) s.hitBoss(res.hits[i]);
        sparks(s, T(), 6, 22);
        await s.wait(90);
      }
      idle(s);
      await s.wait(260);
      return true;
    }
    case 'choke_cloud': {
      await s.camFocus(P(), 1.8, 260);
      pose(s, 4);
      sound.play('wail');
      await s.camTo(W / 2 + 30, ARENA_CY, 1.02, 450);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        puffs(s, { x: P().x + (T().x - P().x) * t, y: P().y - 10 + (T().y - P().y) * t }, 5, 26, 10, 800, 0x707070);
        await s.wait(80);
      }
      idle(s);
      puffs(s, T(), 14, 60, 8, 1100, 0x505050);
      await bossHits(s, res.hits, 0);
      await s.wait(420);
      return true;
    }
    case 'blackout_billow': {
      await s.camFocus(P(), 2, 320);
      pose(s, 4);
      sound.play('charge');
      for (let i = 0; i < 3; i++) {
        ring(s, { x: P().x, y: P().y - 18 }, 1.2 + i * 0.4, 300);
        await s.wait(110);
      }
      s.shake(3, 500);
      await s.camTo(W / 2 + 20, ARENA_CY - 6, 0.95, 380);
      sound.play('thunder');
      s.setDarkness(0.5);
      for (let i = 0; i < 4; i++) {
        puffs(s, { x: 120 + i * 60, y: PLAYER_Y - 30 }, 9, 70, 30, 1100, 0x404040);
        await s.wait(60);
      }
      idle(s);
      s.flash(0.4, 220);
      await bossHits(s, res.hits, 0);
      await s.wait(500);
      s.setDarkness(0);
      return true;
    }
    // ---------------------------------------------------- TINTRICK: clockwork drill
    case 'tin_jab':
    case 'bayonet_rush': {
      const rush = res.id === 'bayonet_rush';
      await s.camFocus(P(), 1.5, 200);
      pose(s, 4);
      sound.play(rush ? 'swish' : 'tickclock');
      await s.tw({ targets: a.playerOffset, x: rush ? 150 : 132, duration: rush ? 200 : 170, ease: 'Quad.easeIn' });
      for (let i = 0; i < res.hits.length; i++) {
        s.hitBoss(res.hits[i]);
        const sl = s.w(s.add.image(T().x - 16, T().y + (i - 1) * 6, 'fx_slash').setScale(0.7).setRotation(0.2 - i * 0.2), 63);
        s.tweens.add({ targets: sl, alpha: 0, x: sl.x + 10, duration: 160, onComplete: () => sl.destroy() });
        // each jab is a stiff little step back and forward again
        s.tweens.add({ targets: a.playerOffset, x: a.playerOffset.x - 8, duration: 50, yoyo: true });
        await s.wait(rush ? 100 : 130);
      }
      await s.tw({ targets: a.playerOffset, x: 0, duration: 260 });
      idle(s);
      return true;
    }
    case 'key_spin': {
      await s.camFocus(P(), 1.8, 260);
      sound.play('tickclock');
      pose(s, 4);
      // the key winds: three quick turns on the spot
      for (let i = 0; i < 3; i++) {
        a.player.setFlipX(i % 2 === 0);
        ring(s, P(), 0.9, 160);
        await s.wait(90);
      }
      a.player.setFlipX(false);
      sound.play('swish');
      const sp = s.w(s.add.image(P().x, P().y, 'fx_spin').setScale(1.3), 63);
      s.tweens.add({ targets: sp, rotation: 12, duration: 560 });
      await s.tw({ targets: a.playerOffset, x: 140, duration: 260, ease: 'Quad.easeIn', onUpdate: () => sp.setPosition(P().x, P().y) } as any);
      s.shake(5, 260);
      await bossHits(s, res.hits, 0);
      sparks(s, T(), 10, 34);
      await s.wait(160);
      sp.destroy();
      await s.tw({ targets: a.playerOffset, x: 0, duration: 320 });
      idle(s);
      return true;
    }
    case 'final_salute': {
      await s.camFocus(P(), 2.1, 380);
      // attention... the key runs down as everything it stored goes into the barrel
      pose(s, 0);
      sound.play('tickclock');
      await s.wait(260);
      sound.play('charge');
      for (let i = 0; i < 4; i++) {
        ring(s, { x: P().x - 8, y: P().y - 4 }, 0.8, 220);
        s.shake(1 + i, 120);
        await s.wait(120);
      }
      pose(s, 4);
      await s.camTo(W / 2 + 20, ARENA_CY, 1, 160);
      sound.play('cannon');
      s.flash(0.8, 260);
      s.shake(8, 500);
      const g = streak(s, { x: P().x + 24, y: P().y - 6 }, T(), 420, C.white, 3);
      g.setDepth(64);
      sparks(s, { x: P().x + 26, y: P().y - 6 }, 8, 20);
      await s.wait(60);
      await bossHits(s, res.hits, 0);
      s.boom(T().x, T().y, 1.6);
      await s.wait(600);
      idle(s);
      return true;
    }
    // ---------------------------------------------------- MOURNINGBELL: sound you can see
    case 'toll': {
      await s.camFocus(P(), 1.6, 240);
      pose(s, 4);
      sound.play('bell');
      s.shake(1.5, 500);
      s.camTo(W / 2 + 20, ARENA_CY, 1, 500);
      await soundWaves(s, P(), T(), 3);
      idle(s);
      await bossHits(s, res.hits, 0);
      await s.wait(300);
      return true;
    }
    case 'dissonance': {
      await s.camFocus(P(), 1.8, 240);
      pose(s, 4);
      sound.play('wrong');
      // a sour chord: the waves come out crooked
      for (let i = 0; i < 4; i++) {
        const arc = s.w(s.add.image(P().x + 12, P().y, 'fx_arc').setScale(0.5).setRotation((i % 2 ? 1 : -1) * 0.5), 63);
        s.tweens.add({ targets: arc, x: T().x - 10, y: T().y + (i % 2 ? 14 : -14), scale: 2, alpha: 0, rotation: 0, duration: 420, onComplete: () => arc.destroy() });
        await s.wait(80);
      }
      await s.camFocus(T(), 1.4, 200);
      idle(s);
      s.shake(3, 300);
      await bossHits(s, res.hits, 0);
      await s.wait(340);
      return true;
    }
    case 'resonance': {
      await s.camFocus(P(), 1.5, 260);
      pose(s, 4);
      sound.play('bell');
      // a steady hum: rings that hold their size instead of flying off
      for (let i = 0; i < 3; i++) {
        const r = s.w(s.add.image(P().x, P().y - 6, 'fx_ring').setScale(0.6 + i * 0.5).setAlpha(0), 62);
        s.tweens.add({ targets: r, alpha: 0.9, duration: 220, yoyo: true, hold: 260, delay: i * 120, onComplete: () => r.destroy() });
      }
      await s.wait(760);
      idle(s);
      return true;
    }
    case 'death_knell': {
      await s.camFocus(P(), 2.1, 400);
      pose(s, 4);
      s.setDarkness(0.4);
      sound.play('bell');
      await s.wait(420);
      sound.play('bell');
      s.shake(6, 900);
      await s.camTo(W / 2 + 20, ARENA_CY - 4, 0.95, 320);
      for (let i = 0; i < 2; i++) {
        ring(s, P(), 5 + i * 2, 900, 'fx_ringL');
        await soundWaves(s, P(), T(), 3, 70);
      }
      idle(s);
      s.flash(0.5, 240);
      await bossHits(s, res.hits, 0);
      await s.wait(520);
      s.setDarkness(0);
      return true;
    }
    // ---------------------------------------------------- STITCHWRAITH: threads
    case 'thread_bind': {
      await s.camFocus(P(), 1.6, 220);
      pose(s, 4);
      sound.play('cast');
      const from = { x: P().x + 20, y: P().y - 10 };
      streak(s, from, T(), 520);
      await s.camFocus(T(), 1.4, 220);
      // the loop pulls tight
      for (let i = 0; i < 2; i++) {
        const r = s.w(s.add.image(T().x, T().y, 'fx_ring').setScale(1.6 - i * 0.3), 63);
        s.tweens.add({ targets: r, scale: 0.5, duration: 240, onComplete: () => r.destroy() });
      }
      await s.wait(220);
      idle(s);
      await bossHits(s, res.hits, 0);
      await s.wait(280);
      return true;
    }
    case 'soul_stitch': {
      await s.camFocus(P(), 1.4, 260);
      pose(s, 4);
      sound.play('buff');
      // threads thrown out to everyone on your side
      const ends: Pt[] = [{ x: P().x - 52, y: P().y - 6 }, { x: P().x - 84, y: P().y - 14 }, { x: P().x - 30, y: P().y - 34 }, { x: P().x - 66, y: P().y - 38 }];
      for (const e of ends) {
        streak(s, { x: P().x, y: P().y - 8 }, e, 800, C.light);
        sparks(s, e, 4, 10, 'fx_px');
        await s.wait(70);
      }
      ring(s, P(), 1.6, 500);
      await s.wait(520);
      idle(s);
      return true;
    }
    case 'mend': {
      await s.camFocus(P(), 1.7, 240);
      pose(s, 4);
      sound.play('heal');
      // a needle darts back and forth
      const n = s.w(s.add.image(P().x - 16, P().y - 22, 'fx_px').setScale(1, 7), 64);
      await s.tw({ targets: n, x: P().x + 16, y: P().y - 8, duration: 130, yoyo: true, repeat: 2 });
      n.destroy();
      for (let i = 0; i < 6; i++) {
        const pl = s.w(s.add.image(P().x + (Math.random() - 0.5) * 40, P().y + 6, 'fx_plus'), 63);
        s.tweens.add({ targets: pl, y: pl.y - 34, alpha: 0, duration: 700, delay: i * 50, onComplete: () => pl.destroy() });
      }
      await s.wait(600);
      idle(s);
      return true;
    }
    case 'grand_tangle': {
      await s.camFocus(P(), 2, 360);
      pose(s, 4);
      sound.play('charge');
      await s.wait(300);
      await s.camTo(W / 2 + 20, ARENA_CY - 4, 0.95, 300);
      sound.play('swish');
      // every thread at once, fanning across the room
      for (let i = -3; i <= 3; i++) {
        streak(s, { x: P().x + 18, y: P().y - 10 }, { x: T().x + 30, y: T().y + i * 16 }, 700, i % 2 ? C.light : C.white);
        await s.wait(30);
      }
      s.shake(5, 400);
      idle(s);
      await bossHits(s, res.hits, 0);
      for (let i = 0; i < 3; i++) {
        const r = s.w(s.add.image(T().x, T().y, 'fx_ring').setScale(2.2 - i * 0.4), 63);
        s.tweens.add({ targets: r, scale: 0.4, alpha: 0.2, duration: 360, delay: i * 70, onComplete: () => r.destroy() });
      }
      await s.wait(620);
      return true;
    }
    // ---------------------------------------------------- NULLCROWN: hands that take
    case 'sceptre_strike': {
      await s.camFocus(P(), 1.6, 220);
      pose(s, 4);
      sound.play('ghost');
      s.camFocus(mid(), 1.2, 280);
      await s.projectile('fx_hand', { x: P().x + 16, y: P().y - 8 }, T(), 300, 10);
      idle(s);
      await bossHits(s, res.hits, 0);
      sparks(s, T(), 6, 20);
      await s.wait(280);
      return true;
    }
    case 'usurp': {
      await s.camFocus(P(), 1.7, 240);
      pose(s, 4);
      sound.play('ghost');
      await s.projectile('fx_hand', { x: P().x + 16, y: P().y - 10 }, { x: T().x, y: T().y - 10 }, 320, 20);
      await s.camFocus(T(), 1.5, 160);
      await bossHits(s, res.hits, 0);
      sound.play('siphon');
      // what it held comes back with the hand
      const prize = s.w(s.add.image(T().x, T().y - 10, 'fx_soul').setScale(1.2), 64);
      s.camFocus(mid(), 1.2, 300);
      await s.tw({ targets: prize, x: P().x, y: P().y - 30, duration: 420, ease: 'Quad.easeIn' });
      prize.destroy();
      ring(s, { x: P().x, y: P().y - 30 }, 1.2, 300);
      idle(s);
      await s.wait(260);
      return true;
    }
    case 'royal_decree': {
      await s.camFocus(P(), 1.7, 300);
      pose(s, 4);
      sound.play('recruit');
      s.flash(0.3, 300);
      ring(s, { x: P().x, y: P().y - 10 }, 4, 800, 'fx_ringL');
      for (let i = 0; i < 8; i++) {
        const sp = s.w(s.add.image(P().x - 90 + i * 22, P().y + 10, 'fx_spark'), 63);
        s.tweens.add({ targets: sp, y: sp.y - 46, alpha: 0, duration: 700, delay: i * 40, onComplete: () => sp.destroy() });
      }
      await s.wait(820);
      idle(s);
      return true;
    }
    case 'null_edict': {
      await s.camFocus(P(), 2.1, 420);
      pose(s, 4);
      s.setDarkness(0.55);
      sound.play('charge');
      await s.wait(380);
      await s.camFocus(T(), 1.5, 360);
      // the world turns over for a moment
      sound.play('phase');
      await s.invert(140);
      s.shake(7, 600);
      const hands = [-1, 1].map((d) => s.w(s.add.image(T().x + d * 70, T().y - 6, 'fx_handL').setFlipX(d < 0), 64));
      await Promise.all(hands.map((h, i) => s.tw({ targets: h, x: T().x + (i ? 14 : -14), duration: 200, ease: 'Quad.easeIn' })));
      s.flash(0.7, 260);
      await bossHits(s, res.hits, 0);
      hands.forEach((h) => s.tweens.add({ targets: h, alpha: 0, duration: 300, onComplete: () => h.destroy() }));
      await s.invert(90);
      await s.wait(560);
      s.setDarkness(0);
      idle(s);
      return true;
    }
  }
  return false;
}

// ================================================================ the dungeon's enemies

/** Which enemy ids belong to the dungeon (filled in by the roguelike when it registers them). */
export const ROGUE_FOE_IDS = new Set<string>();

export async function bossAnim7(s: S, res: ActionResult): Promise<boolean> {
  const a = s.arena;
  const k = a.ti;
  if (!k || !ROGUE_FOE_IDS.has(k.kind)) return false;
  if (res.stage === 'frozen') return false;
  const def = s.battle.atk[res.id];
  if (!def) return false;
  const P = () => a.playerCenter();
  const big = k.core.height > 90;
  const finish = async (ms = 320) => {
    k.core.setFrame(0);
    await s.tw({ targets: k.off, x: 0, y: 0, rot: 0, duration: ms, ease: 'Sine.easeInOut' });
    await s.wait(120);
  };
  const reach = (gap: number) => a.player.x + gap - (k.body.x - k.off.x);

  // ---- a charge: it gathers itself, and everyone can see what is coming
  if (res.stage === 'charge') {
    await s.camFocus(k.center(), big ? 1.3 : 1.6, 320);
    k.core.setFrame(1);
    sound.play('charge');
    for (let i = 0; i < 3; i++) {
      ring(s, k.center(), 2 + i * 0.5, 500);
      s.shake(1 + i, 160);
      await s.wait(170);
    }
    await s.wait(240);
    return true;
  }
  const heavy = def.major || res.stage === 'fire';
  switch (def.style) {
    case 'shot': {
      await s.camFocus(k.center(), big ? 1.25 : 1.5, 240);
      k.core.setFrame(1);
      sound.play('cast');
      await s.wait(200);
      k.core.setFrame(2);
      s.camTo((P().x + k.body.x) / 2, ARENA_CY, 1, 240);
      const n = Math.max(1, res.hits.length);
      for (let i = 0; i < n; i++) {
        sound.play('swish');
        await s.projectile(heavy ? 'fx_bolt' : 'fx_dotM', { x: k.center().x - 20, y: k.center().y - 6 + (i % 2) * 8 }, { x: P().x + 6, y: P().y }, heavy ? 300 : 200, 6, { trail: heavy, scale: heavy ? 1.6 : 1.3 });
        if (res.hits[i]) s.hitPlayer(res.hits[i], heavy);
        await s.wait(60);
      }
      await finish();
      return true;
    }
    case 'wave': {
      await s.camTo(W / 2 + 20, ARENA_CY - 6, big ? 0.9 : 1, 280);
      k.core.setFrame(1);
      sound.play(heavy ? 'roar' : 'wail');
      await s.wait(220);
      k.core.setFrame(2);
      s.shake(heavy ? 6 : 3, 500);
      for (let i = 0; i < 3; i++) {
        ring(s, k.center(), 4 + i, 600, 'fx_ringL');
        await s.wait(90);
      }
      await playerHits(s, res.hits, 110, heavy);
      await finish();
      return true;
    }
    case 'slam': {
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY - 10, 0.95, 260);
      k.core.setFrame(1);
      sound.play('swish');
      await s.tw({ targets: k.off, y: -34, x: reach(big ? 110 : 70) * 0.5, duration: 280, ease: 'Sine.easeOut' });
      k.core.setFrame(2);
      await s.tw({ targets: k.off, y: 0, x: reach(big ? 110 : 60), duration: 130, ease: 'Quad.easeIn' });
      sound.play('impact');
      s.shake(heavy ? 9 : 5, 420);
      s.boom(P().x + 14, PLAYER_Y - 2, heavy ? 1.3 : 0.9);
      await playerHits(s, res.hits, 90, true);
      await s.wait(160);
      await finish(380);
      return true;
    }
    case 'buff': {
      await s.camFocus(k.center(), big ? 1.3 : 1.6, 260);
      k.core.setFrame(1);
      sound.play('buff');
      ring(s, k.center(), 2.4, 600);
      const sh = s.w(s.add.image(k.center().x, k.center().y, 'fx_shield').setAlpha(0).setScale(big ? 2 : 1.2), 63);
      s.tweens.add({ targets: sh, alpha: 0.8, duration: 200, yoyo: true, hold: 220, onComplete: () => sh.destroy() });
      await s.wait(680);
      await finish(200);
      return true;
    }
    default: {
      // a lunge: the whole body goes for you
      await s.camTo((P().x + k.body.x) / 2, ARENA_CY, 1, 240);
      k.core.setFrame(1);
      await s.tw({ targets: k.off, x: 12, duration: 180, ease: 'Sine.easeOut' });
      sound.play('swish');
      k.core.setFrame(2);
      await s.tw({ targets: k.off, x: reach(big ? 100 : 56), duration: 150, ease: 'Quad.easeIn' });
      for (let i = 0; i < res.hits.length; i++) {
        const sl = s.w(s.add.image(P().x + 14, P().y + (i % 2 ? 6 : -4), 'fx_slash').setFlipX(true).setRotation(i % 2 ? -0.3 : 0.3), 63);
        s.tweens.add({ targets: sl, alpha: 0, scale: 1.3, duration: 220, onComplete: () => sl.destroy() });
        s.hitPlayer(res.hits[i], heavy);
        if (i < res.hits.length - 1) {
          s.tweens.add({ targets: k.off, x: k.off.x + 10, duration: 60, yoyo: true });
          await s.wait(150);
        }
      }
      await s.wait(180);
      await finish();
      return true;
    }
  }
}

void Phaser;
