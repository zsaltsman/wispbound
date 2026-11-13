import Phaser from 'phaser';
import type { BattleScene } from '../BattleScene';
import type { ActionResult } from '../../engine/types';
import { PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { C, txt, box } from '../../ui/ui';
import { W, ARENA_CY } from '../../constants';
import { burst } from './anims';
import { SpiritScenes } from './titanScenes4';

// World 3 battle staging: the Titans' entrances, their escalations (no banners: the
// music, the body and the attacks change), their defeats, and Milo shouting orders
// from his pile of rubble during the Ironclad fight.

type S = BattleScene;

/** Milo shouts something from the rubble: a little speech box over his head. */
export async function miloSay(s: S, line: string, ms = 1300) {
  const m = s.arena.ti?.milo;
  if (!m) return;
  const t = txt(s, 0, 0, line, { color: C.black, origin: [0.5, 0.5] });
  const g = s.add.graphics();
  box(g, -t.width / 2 - 5, -8, t.width + 10, 16, 'light');
  const c = s.w(s.add.container(Math.max(t.width / 2 + 10, Math.min(W - t.width / 2 - 10, m.x)), m.y - 66, [g, t]), 90);
  c.setScale(0.5);
  s.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' });
  sound.play('text');
  s.time.delayedCall(ms, () => s.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() }));
  await s.wait(Math.min(ms, 1000));
}

const FRUSTRATED = ['WHAT?!', 'THAT WAS NOTHING!', 'IRONCLAD! STAND UP STRAIGHT!', 'HOW ARE YOU DOING THIS?!', 'NO! HIT BACK!', "IT'S JUST A KID WITH A PET!"];

export class TitanScenes {
  private s: S;
  private lastReact = -9;
  /** World 4: the island's spirits are staged separately */
  private sp: SpiritScenes;

  constructor(s: S) {
    this.s = s;
    this.sp = new SpiritScenes(s);
  }

  private get spirit() {
    return !!this.s.arena?.ti?.spirit;
  }

  private get k() {
    return this.s.arena.ti!;
  }

  songFor(phase: number): string {
    if (this.spirit) return this.sp.songFor(phase);
    const id = this.s.enemyId;
    // every Titan plays its fiercest theme from the very first turn
    if (id === 'scorvex') return 'scorvex2';
    if (id === 'widowmaker') return 'widow3';
    return 'iron3';
  }

  /** The front of Club Forever shudders: dust and chunks of masonry rain down. */
  clubShake(big = false) {
    const s = this.s;
    const k = this.k;
    if (k.kind !== 'ironclad' && k.kind !== 'scorvex') return;
    for (let i = 0; i < (big ? 18 : 7); i++) {
      const x = 60 + Math.random() * 300;
      const d = s.w(s.add.rectangle(x, -10 - Math.random() * 40, 3 + Math.random() * 5, 3 + Math.random() * 4, Math.random() < 0.5 ? C.mid : C.light), 20);
      d.setScrollFactor(0.7, 0.9);
      s.tweens.add({ targets: d, y: 130 + Math.random() * 20, angle: 360, duration: 700 + Math.random() * 500, delay: Math.random() * 300, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    }
    if (k.bg) s.tweens.add({ targets: k.bg, y: k.bg.y + (big ? 6 : 3), duration: 60, yoyo: true, repeat: big ? 5 : 2 });
  }

  // ------------------------------------------------------------- entrances

  async intro() {
    if (this.spirit) return this.sp.intro();
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    s.cameras.main.fadeIn(700, 0, 0, 0);
    s.uiCam.fadeIn(700, 0, 0, 0);
    if (k.kind === 'scorvex') {
      sound.playSong('scorvex2');
      k.off.x = 280;
      s.cs = { x: W / 2 + 40, y: ARENA_CY - 20, zoom: 0.85, rot: 0 };
      await s.wait(500);
      for (let i = 0; i < 4; i++) {
        sound.play('slam');
        s.shake(3, 200);
        await s.tw({ targets: k.off, x: 280 - (i + 1) * 70, duration: 360, ease: 'Sine.easeInOut' });
        burst(s, { x: k.body.x - 40, y: PLAYER_Y + 6 }, 'fx_dotM', 4, 20, 300);
      }
      await s.camFocus(k.eye(), 2.2, 700);
      k.core.setFrame(1);
      k.stinger?.setFrame(1);
      sound.play('horn');
      sound.play('rev');
      s.shake(5, 900);
      s.flash(0.5, 300);
      await k.steerTail(k.body.x + 40, k.body.y - 170, 600, 'Back.easeOut');
      await s.wait(700);
      k.core.setFrame(0);
      k.stinger?.setFrame(0);
      k.releaseAll();
    } else if (k.kind === 'widowmaker') {
      sound.playSong('widow3');
      k.off.y = -300;
      s.cs = { x: W / 2 + 30, y: ARENA_CY - 40, zoom: 0.8, rot: 0 };
      await s.wait(500);
      sound.play('creak');
      await s.wait(500);
      sound.play('whoosh');
      await s.tw({ targets: k.off, y: 0, duration: 500, ease: 'Quad.easeIn' });
      s.boom(k.body.x, PLAYER_Y, 2);
      sound.play('impact');
      s.shake(8, 600);
      for (let i = 0; i < 8; i++) {
        sound.play('tick');
        await s.wait(80);
      }
      await s.camFocus(k.eye(), 2.1, 600);
      k.core.setFrame(1);
      sound.play('wail');
      s.shake(3, 700);
      await s.wait(900);
      k.core.setFrame(0);
    } else {
      sound.playSong('iron3');
      k.off.x = 220;
      s.cs = { x: W / 2 + 40, y: ARENA_CY - 40, zoom: 0.75, rot: 0 };
      await s.wait(600);
      for (let i = 0; i < 3; i++) {
        await s.tw({ targets: k.off, y: -10, x: 220 - i * 73 - 30, duration: 500, ease: 'Sine.easeOut' });
        await s.tw({ targets: k.off, y: 0, x: 220 - (i + 1) * 73, duration: 220, ease: 'Quad.easeIn' });
        sound.play('boom');
        s.shake(7, 500);
        this.clubShake();
        burst(s, { x: k.body.x, y: PLAYER_Y + 8 }, 'fx_dotM', 8, 40, 400);
        await s.wait(300);
      }
      await s.camFocus({ x: k.milo!.x, y: k.milo!.y - 30 }, 2.2, 700);
      await miloSay(s, 'IRONCLAD. CRUSH IT.', 1500);
      await s.camFocus(k.eye(), 2, 600);
      sound.play('creak');
      await k.swing('hammer', 3.2, 900);
      sound.play('horn');
      s.flash(0.4, 300);
      await s.wait(300);
      await k.swing('hammer', 0.35, 700, 'Quad.easeIn');
      sound.play('boom');
      s.shake(9, 600);
      this.clubShake(true);
    }
    await s.camTo(W / 2 + 20, ARENA_CY - 20, 0.85, 700);
    await s.camFocus(a.playerCenter(), 1.6, 600);
    await s.wait(300);
    await s.camHome(700);
  }

  // ------------------------------------------------------------- escalation

  async phase(p: number) {
    if (this.spirit) return this.sp.phase(p);
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.showMenu(s.menuSel, true);
    sound.playSong(null);
    // (the rig is already back at rest: BattleScene.settleBoss runs first)
    if (k.kind === 'scorvex') {
      // the furnace overloads: it burns hotter for the rest of the fight
      await s.camFocus(k.center(), 1.6, 600);
      sound.play('rumble');
      s.shake(4, 1600);
      for (let i = 0; i < 4; i++) {
        k.core.setFrame(i % 2 ? 0 : 1);
        await s.wait(160);
      }
      k.core.setFrame(1);
      k.stinger?.setFrame(1);
      a.setPhase(2);
      sound.play('horn');
      s.flash(0.6, 400);
      await s.wait(800);
      k.core.setFrame(0);
    } else if (k.kind === 'widowmaker') {
      await s.camTo(W / 2 + 30, ARENA_CY - 30, 0.8, 600);
      sound.play('creak');
      await s.tw({ targets: k.off, y: -40, duration: 600, ease: 'Sine.easeOut' });
      k.core.setFrame(1);
      if (p === 3) {
        await s.invert(120);
        s.flash(0.8, 400);
      }
      for (let i = 0; i < (p === 3 ? 16 : 8); i++) {
        sound.play('tick');
        await s.wait(p === 3 ? 50 : 90);
      }
      sound.play('wail');
      a.setPhase(p);
      s.shake(p === 3 ? 6 : 4, 900);
      await s.tw({ targets: k.off, y: 0, duration: 300, ease: 'Quad.easeIn' });
      sound.play('impact');
      await s.wait(500);
      k.core.setFrame(0);
    } else {
      await s.camFocus(k.center(), 1.4, 600);
      sound.play('clank');
      s.shake(5, 900);
      a.setPhase(p);
      k.shedPlates(p === 3 ? 9 : 4);
      for (let i = 0; i < (p === 3 ? 4 : 2); i++) {
        sound.play('clank');
        await s.wait(180);
      }
      if (p === 3) {
        await s.invert(120);
        s.flash(0.9, 500);
        sound.play('horn');
      }
      await s.camFocus({ x: k.milo!.x, y: k.milo!.y - 30 }, 2.1, 600);
      k.milo?.setFrame(2);
      await miloSay(s, p === 3 ? 'NO! NO, NO, NO! GET UP AND FIGHT!' : 'WHAT?! HOLD TOGETHER!', 1600);
      k.milo?.setFrame(0);
      await s.camFocus(k.eye(), 2, 500);
      sound.play('horn');
      s.shake(6, 700);
      await s.wait(400);
    }
    sound.playSong(this.songFor(p));
    await s.camHome(700);
    s.syncStatusFx();
  }

  /** A small cue on the Titan before its big attacks. */
  async warnCue(id: string) {
    if (this.spirit) return this.sp.warnCue(id);
    const s = this.s;
    const k = this.k;
    if (k.kind === 'scorvex' && (id === 'furnace_tail' || id === 'pounce' || id === 'molten_sweep')) {
      k.core.setFrame(1);
      sound.play('rev');
      s.time.delayedCall(500, () => k.core.setFrame(0));
    }
    if (k.kind === 'widowmaker' && ['impale', 'eight_leg', 'frenzy', 'web_trap'].includes(id)) {
      k.core.setFrame(1);
      for (let i = 0; i < 3; i++) s.time.delayedCall(i * 90, () => sound.play('tick'));
      s.time.delayedCall(500, () => k.core.setFrame(0));
    }
    if (k.kind === 'ironclad') {
      if (id === 'hammer' || id === 'judgment' || id === 'charge') {
        sound.play('creak');
        k.milo?.setFrame(1);
        miloSay(s, id === 'charge' ? 'RUN IT DOWN!' : 'SMASH IT!', 900);
        s.time.delayedCall(900, () => k.milo?.setFrame(0));
      }
      if (id === 'fortress') {
        k.milo?.setFrame(1);
        miloSay(s, 'HOLD! DIG IN!', 900);
        s.time.delayedCall(900, () => k.milo?.setFrame(0));
      }
    }
  }

  /** Milo reacts when Ironclad gets really hurt. */
  react(res: ActionResult) {
    if (this.spirit) return;
    const s = this.s;
    const k = this.k;
    if (k.kind !== 'ironclad' || !k.milo || res.actor !== 'player') return;
    const dealt = res.hits.reduce((n, h) => n + h.amount, 0);
    if (dealt < 80 || s.battle.turn - this.lastReact < 2) return;
    this.lastReact = s.battle.turn;
    k.milo.setFrame(2);
    miloSay(s, FRUSTRATED[Math.floor(Math.random() * FRUSTRATED.length)], 1100);
    s.time.delayedCall(1100, () => k.milo?.setFrame(0));
  }

  // ------------------------------------------------------------- endings

  async victory() {
    if (this.spirit) return this.sp.victory();
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.playSong(null);
    s.flash(1, 600);
    await s.invert(150);
    await s.camFocus(k.eye(), 2.2, 700);
    k.core.setFrame(2);
    sound.play('wail');
    s.shake(5, 1200);
    for (let i = 0; i < 6; i++) {
      s.spark(k.center().x + (Math.random() - 0.5) * 80, k.center().y + (Math.random() - 0.5) * 60);
      sound.play(i % 2 ? 'clank' : 'impact');
      await s.wait(150);
    }
    if (k.kind === 'scorvex') {
      // its legs give out, the furnace goes dark... then it drags itself away
      k.dead = true;
      k.sway = 0;
      k.core.setFrame(3);
      sound.play('heavy');
      await Promise.all([s.tw({ targets: k.off, y: 22, rot: 0.12, duration: 500, ease: 'Quad.easeIn' }), k.steerTail(k.body.x + 80, PLAYER_Y - 4, 600, 'Quad.easeIn')]);
      s.boom(k.body.x, PLAYER_Y, 1.4);
      s.shake(5, 500);
      await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.85, 900);
      await s.wait(1100);
      sound.play('creak');
      k.dead = false;
      k.sway = 0.4;
      // let go of the tail so it lifts and follows the body instead of staying pinned
      k.releaseAll();
      await s.tw({ targets: k.off, y: 0, rot: 0, duration: 700 });
      for (let i = 0; i < 5; i++) {
        sound.play('slam');
        s.shake(1.5, 150);
        await s.tw({ targets: k.off, x: (i + 1) * 70, rot: i % 2 ? 0.05 : -0.05, duration: 380 });
      }
      k.releaseAll();
    } else if (k.kind === 'widowmaker') {
      // the legs fold under it, the eyes go out, it drops... then scuttles off into the dark
      k.dead = true;
      k.sway = 0;
      k.core.setFrame(3);
      await Promise.all(k.legs.map((l, i) => k.steerLeg(i, k.body.x - 20 + (i % 4) * 14, PLAYER_Y - 30, 500, 'Quad.easeIn')));
      sound.play('heavy');
      await s.tw({ targets: k.off, y: 34, duration: 300, ease: 'Quad.easeIn' });
      s.boom(k.body.x, PLAYER_Y, 1.8);
      s.shake(7, 600);
      await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.85, 900);
      await s.wait(1300);
      for (let i = 0; i < 3; i++) {
        sound.play('tick');
        await s.wait(260);
      }
      k.dead = false;
      k.releaseAll();
      k.sway = 2;
      await s.tw({ targets: k.off, y: 0, duration: 300 });
      sound.play('swish');
      await s.tw({ targets: k.off, x: 420, duration: 1000, ease: 'Quad.easeIn' });
    } else {
      // Ironclad goes down to one knee, the hammer slips from its grip, and it falls
      k.dead = true;
      k.sway = 0;
      sound.play('heavy');
      await Promise.all([s.tw({ targets: k.off, y: 28, rot: 0.06, duration: 700, ease: 'Quad.easeIn' }), k.swing('hammer', 0.05, 700)]);
      s.shake(6, 500);
      this.clubShake();
      await s.camFocus({ x: k.milo!.x, y: k.milo!.y - 30 }, 2.2, 700);
      k.milo?.setFrame(2);
      await miloSay(s, 'NO... IRONCLAD...', 1300);
      await s.camTo(W / 2 + 20, ARENA_CY - 20, 0.8, 600);
      k.core.setFrame(3);
      sound.play('creak');
      await Promise.all([s.tw({ targets: k.off, rot: -0.55, x: -40, y: 80, duration: 1200, ease: 'Quad.easeIn' }), k.swing('fist', 1.6, 1200), k.swing('hammer', 1.4, 1200)]);
      s.boom(k.body.x - 60, PLAYER_Y, 3);
      sound.play('boom');
      sound.play('impact');
      s.shake(14, 1000);
      s.flash(0.8, 400);
      this.clubShake(true);
      await s.wait(1200);
      k.milo?.setFrame(3);
      await s.camFocus({ x: k.milo!.x, y: k.milo!.y - 20 }, 2.4, 900);
      await s.wait(1400);
    }
    s.setDarkness(0.2);
    sound.play('victory');
    await s.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(s.idleAnim);
    s.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    if (a.reserve?.visible) s.tweens.add({ targets: a.reserve, y: a.reserve.y - 8, duration: 300, yoyo: true, repeat: 2 });
    await s.wait(1000);
  }

  /** The party falls: the Titan stands over the street. */
  async defeat() {
    if (this.spirit) return this.sp.defeat();
    const s = this.s;
    const k = this.k;
    await s.camFocus(k.eye(), 1.8, 800);
    k.core.setFrame(k.kind === 'ironclad' ? (k.phase >= 3 ? 2 : 1) : 1);
    sound.play('horn');
    s.shake(4, 700);
    if (k.milo) {
      k.milo.setFrame(1);
      await miloSay(s, 'GO HOME, KID.', 1400);
    }
    await s.wait(900);
  }
}

void Phaser;
void PLAYER_Y;
