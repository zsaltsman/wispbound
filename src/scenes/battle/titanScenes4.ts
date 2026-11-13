import Phaser from 'phaser';
import type { BattleScene } from '../BattleScene';
import { PLAYER_X, PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { W, ARENA_CY } from '../../constants';
import { burst, ring } from './anims';

// World 4 battle staging: how each spirit enters, how it escalates (no banners: the
// body, the music and the attacks change), and how it leaves. The Reaper's fight is
// told entirely here: you alone (the guardian fell in the chamber), the dark spreading
// at 60%, and at 30% the moment it stops fighting and raises the blade.

type S = BattleScene;

export const SPIRIT_SONG: Record<string, string[]> = {
  champion: ['w4_champ', 'w4_champ'],
  wispmane: ['w4_wisp', 'w4_wisp', 'w4_wisp'],
  crow: ['w4_crow', 'w4_crow', 'w4_crow'],
  // the failed experiment: its own theme from the first turn
  subject: ['w4_subject', 'w4_subject', 'w4_subject'],
  squirrel: ['w4_squirrel', 'w4_squirrel', 'w4_squirrel'],
  viperwind: ['w4_viper', 'w4_viper', 'w4_viper'],
  // the Collector's theme from the first turn; the last phase is silence
  reaper: ['w4_reaper2', 'w4_reaper2', ''],
  // the prison: each boss's own theme from the very first turn
  skelwarden: ['w5_warden', 'w5_warden'],
  sc_booheet: ['w5_super', 'w5_super', 'w5_super'],
  sc_shipwraith: ['w5_super', 'w5_super', 'w5_super'],
  sc_hauntcorn: ['w5_super', 'w5_super', 'w5_super'],
  sc_umbrawl: ['w5_super', 'w5_super', 'w5_super'],
  sc_tickraith: ['w5_super', 'w5_super', 'w5_super'],
};
const AMB: Record<string, string> = { champion: 'cave', wispmane: 'forest', crow: 'coast', subject: 'indoor', squirrel: 'cave', viperwind: 'forest', reaper: 'indoor', skelwarden: 'cave', sc_booheet: 'indoor', sc_shipwraith: 'indoor', sc_hauntcorn: 'indoor', sc_umbrawl: 'indoor', sc_tickraith: 'indoor' };

/** What each spirit sounds like when it roars. */
function voice(kind: string): string {
  const v: Record<string, string> = { viperwind: 'hiss', crow: 'screech', subject: 'wail', skelwarden: 'rattle', sc_booheet: 'wail', sc_shipwraith: 'horn', sc_hauntcorn: 'caw', sc_umbrawl: 'thunder', sc_tickraith: 'tickclock' };
  return v[kind] ?? 'roar';
}
const isPrison = (kind: string) => kind === 'skelwarden' || kind.startsWith('sc_');

export class SpiritScenes {
  private s: S;

  constructor(s: S) {
    this.s = s;
  }

  private get k() {
    return this.s.arena.ti!;
  }

  songFor(phase: number): string {
    if (this.s.finS) return this.s.finS.songFor(phase);
    return SPIRIT_SONG[this.s.enemyId]?.[phase - 1] ?? 'w4_wisp';
  }

  // ------------------------------------------------------------- entrances

  async intro() {
    if (this.s.finS) return this.s.finS.intro();
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    const id = k.kind;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.setAmbience(AMB[id] ?? 'indoor');
    s.cameras.main.fadeIn(700, 0, 0, 0);
    s.uiCam.fadeIn(700, 0, 0, 0);
    s.cs = { x: W / 2 + 30, y: ARENA_CY - 20, zoom: 0.85, rot: 0 };
    if (isPrison(id)) {
      await this.prisonIntro();
    } else if (id === 'subject') {
      await this.subjectIntro();
    } else if (id === 'reaper') {
      // no music at all to begin with: it simply arrives
      sound.playSong(null);
      this.addBackdrop();
      k.core.setAlpha(0);
      await s.wait(900);
      await s.camFocus(k.center(), 1.4, 900);
      sound.playSong(this.songFor(1));
      s.tweens.add({ targets: k.core, alpha: 1, duration: 1400 });
      await s.wait(1600);
    } else {
      sound.playSong(this.songFor(1));
      if (id === 'crow' || id === 'viperwind') {
        k.off.y = -300;
        await s.wait(500);
        sound.play(id === 'crow' ? 'caw' : 'hiss');
        k.core.setFrame(id === 'crow' ? 2 : 0);
        await s.tw({ targets: k.off, y: 0, duration: 700, ease: 'Quad.easeOut' });
      } else {
        k.off.x = 260;
        await s.wait(400);
        for (let i = 0; i < 3; i++) {
          sound.play('slam');
          s.shake(3, 200);
          await s.tw({ targets: k.off, x: 260 - (i + 1) * 87, duration: 300, ease: 'Sine.easeInOut' });
          burst(s, { x: k.body.x - 30, y: PLAYER_Y + 8 }, 'fx_dotM', 4, 20, 300);
        }
      }
      await s.camFocus(k.eye(), 2, 600);
      k.core.setFrame(1);
      sound.play(id === 'viperwind' ? 'hiss' : id === 'crow' ? 'screech' : 'roar');
      s.shake(id === 'wispmane' ? 7 : 5, 1000);
      s.flash(0.4, 300);
      for (let i = 0; i < 2; i++) s.time.delayedCall(i * 250, () => ring(s, k.eye(), 'fx_ring', 3, 600));
      await s.wait(1000);
      k.core.setFrame(k.restFrame());
    }
    await s.camTo(W / 2 + 20, ARENA_CY - 20, 0.85, 600);
    await s.camFocus(a.playerCenter(), 1.6, 500);
    await s.wait(250);
    await s.camHome(700);
  }

  /** The Reaper fight: just you and your team. Flamora lies fallen at the back of the chamber. */
  private addBackdrop() {
    const s = this.s;
    const f = s.add.sprite(-30, PLAYER_Y - 30, 'sp_flamora', 3).setOrigin(0.5, 1).setScale(0.55).setAlpha(0.75).setScrollFactor(0.7, 0.9);
    f.setDepth(5);
    s.arena.layer.add(f);
  }

  // ------------------------------------------------------------- escalation

  async phase(p: number) {
    if (this.s.finS) return this.s.finS.phase(p);
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.showMenu(s.menuSel, true);
    if (k.kind === 'reaper') return this.reaperPhase(p);
    sound.playSong(null);
    await s.camFocus(k.eye(), 1.9, 500);
    k.core.setFrame(1);
    sound.play(voice(k.kind));
    s.shake(p >= 3 ? 8 : 6, 1100);
    if (k.kind === 'squirrel') {
      // its tail swells, its eyes go red-hot (well: white-hot)
      for (let i = 0; i < 4; i++) {
        k.core.setFrame(i % 2 ? 1 : 5);
        await s.wait(140);
      }
    }
    if (p >= 3) {
      await s.invert(120);
      s.flash(0.8, 400);
    } else s.flash(0.5, 300);
    a.setPhase(p);
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 200, () => ring(s, k.eye(), 'fx_ring', 3.2, 600));
    await s.wait(900);
    k.core.setFrame(k.restFrame());
    sound.playSong(this.songFor(p));
    await s.camHome(700);
    s.syncStatusFx();
  }

  private async reaperPhase(p: number) {
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    sound.playSong(null);
    if (p === 2) {
      // THE COLLECTOR: it stops. The light goes. The cloak lifts on a wind of its own.
      await s.camFocus(k.center(), 1.5, 900);
      await s.wait(700);
      s.setDarkness(0.35);
      k.core.setFrame(4);
      for (let i = 0; i < 14; i++) {
        const o = s.w(s.add.image(k.body.x + (Math.random() - 0.5) * 40, PLAYER_Y + 8, 'fx_puff', i % 3).setTint(0x111111).setScale(0.5), 12);
        s.tweens.add({ targets: o, x: o.x - 80 - Math.random() * 220, scale: 2.4, duration: 1600, delay: i * 70, ease: 'Sine.easeOut' });
        s.tweens.add({ targets: o, alpha: 0, duration: 900, delay: 2600 + i * 40, onComplete: () => o.destroy() });
      }
      s.shake(2, 1600);
      await s.wait(1600);
      a.setPhase(2);
      s.hud.setSubtitle('THE COLLECTOR');
      sound.playSong(this.songFor(2));
    } else {
      // the end: it stops fighting. The screen shakes, the music is gone. It raises the blade.
      await s.camTo(W / 2, ARENA_CY - 10, 0.9, 600);
      s.shake(6, 2200);
      sound.play('rumble');
      await s.wait(1400);
      await s.camFocus(k.eye(), 1.9, 700);
      k.core.setFrame(1);
      s.setDarkness(0.5);
      await s.wait(900);
      a.setPhase(3);
    }
    await s.camHome(700);
    s.syncStatusFx();
  }

  /** A small cue on the spirit before its big attacks. */
  async warnCue(id: string) {
    if (this.s.finS) return this.s.finS.warnCue(id);
    const s = this.s;
    const k = this.k;
    if (k.kind === 'reaper') return;
    if (isPrison(k.kind)) {
      if (['solitary', 'lights_out', 'smother', 'night_terror_x', 'sunken_anchor', 'dead_fleet', 'crow_swarm', 'hallowed_reaping', 'parasol_lance', 'monsoon_end', 'pendulum_wreck', 'midnight_toll', 'batten_all', 'lightning_rod'].includes(id)) {
        k.core.setFrame(2);
        sound.play(voice(k.kind));
        s.time.delayedCall(600, () => k.core.setFrame(k.restFrame()));
      }
      return;
    }
    if (k.kind === 'subject') {
      if (['surge_claw', 'overcharge', 'critical_mass', 'drain_grip'].includes(id)) {
        k.core.setFrame(2);
        sound.play('zap');
        s.time.delayedCall(500, () => k.core.setFrame(k.restFrame()));
      }
      return;
    }
    if (['ground_slam', 'crushing_grip', 'natures_wrath', 'skyfall', 'diving_strike', 'forestquake', 'branch_leap', 'tempest', 'blackout_storm', 'ethereal_claws'].includes(id)) {
      k.core.setFrame(1);
      sound.play(k.kind === 'viperwind' ? 'hiss' : k.kind === 'crow' ? 'caw' : 'roar_small');
      s.time.delayedCall(500, () => k.core.setFrame(k.restFrame()));
    }
  }

  react() {
    /* the spirits do not talk */
  }

  // ------------------------------------------------------------- the prison

  /** The Warden at his post; your own first spirit, supercharged, each in its own way. */
  private async prisonIntro() {
    const s = this.s;
    const k = this.k;
    const id = k.kind;
    sound.playSong(this.songFor(1));
    s.hud.setSubtitle(id === 'skelwarden' ? 'FOUR HUNDRED YEARS AT HIS DESK' : s.battle.enemy.subtitle ?? 'SUPERCHARGED');
    if (id === 'skelwarden') {
      // the lantern comes up first, then the rest of him
      k.core.setFrame(2);
      k.off.y = 30;
      k.core.setAlpha(0.4);
      await s.wait(400);
      for (let i = 0; i < 3; i++) {
        sound.play('rattle');
        await s.wait(220);
      }
      s.tweens.add({ targets: k.core, alpha: 1, duration: 600 });
      await s.tw({ targets: k.off, y: 0, duration: 700, ease: 'Back.easeOut' });
      sound.play('clank');
      s.shake(4, 400);
    } else if (id === 'sc_booheet') {
      // it is not there. then it is.
      k.core.setAlpha(0);
      for (let i = 0; i < 4; i++) {
        k.core.setAlpha(0.6);
        sound.play('ghost');
        await s.wait(90);
        k.core.setAlpha(0);
        await s.wait(260 - i * 40);
      }
      k.core.setAlpha(1);
      s.flash(0.4, 200);
    } else if (id === 'sc_shipwraith') {
      // up out of the floor like a ship out of the sea
      k.off.y = 240;
      sound.play('horn');
      await s.wait(300);
      sound.play('creak');
      await s.tw({ targets: k.off, y: 0, duration: 1400, ease: 'Sine.easeOut' });
      s.shake(5, 500);
    } else if (id === 'sc_hauntcorn') {
      // a cloud of crows, and it is standing where they were
      k.core.setAlpha(0);
      for (let i = 0; i < 16; i++) {
        const f = s.w(s.add.image(k.body.x + (Math.random() - 0.5) * 120, k.body.y - Math.random() * 140, 'fx_feather').setAngle(Math.random() * 360), 63);
        s.tweens.add({ targets: f, x: f.x + 200 + Math.random() * 120, y: f.y - 60 - Math.random() * 60, alpha: 0, duration: 900, delay: i * 30, onComplete: () => f.destroy() });
      }
      sound.play('caw');
      await s.tw({ targets: k.core, alpha: 1, duration: 700 });
    } else if (id === 'sc_umbrawl') {
      // it comes down out of the ceiling under its umbrella, slowly
      k.off.y = -320;
      sound.play('thunder');
      s.flash(0.5, 200);
      await s.tw({ targets: k.off, y: 0, duration: 1600, ease: 'Sine.easeOut' });
    } else {
      // tick. tick. tick. then it is right there.
      k.off.x = 300;
      for (let i = 0; i < 4; i++) {
        sound.play('tick');
        await s.wait(300);
      }
      sound.play('tickclock');
      await s.tw({ targets: k.off, x: 0, duration: 260, ease: 'Quad.easeOut' });
      s.shake(6, 300);
    }
    // the surge: whatever it was, it is more now
    await s.camFocus(k.eye(), 2, 600);
    k.core.setFrame(1);
    sound.play(id === 'skelwarden' ? 'clank' : 'charge');
    sound.play(voice(id));
    s.shake(id === 'skelwarden' ? 5 : 8, 1000);
    if (id !== 'skelwarden') await s.invert(120);
    s.flash(0.5, 300);
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 220, () => ring(s, k.eye(), 'fx_ring', 3, 600));
    await s.wait(1100);
    k.core.setFrame(k.restFrame());
  }

  // ------------------------------------------------------------- SUBJECT 9

  /** Already out of its tank: it flickers into the arena, then the swelling surges. */
  private async subjectIntro() {
    const s = this.s;
    const k = this.k;
    sound.playSong(this.songFor(1));
    k.core.setAlpha(0);
    for (let i = 0; i < 5; i++) {
      k.core.setAlpha(i % 2 ? 0 : 0.8).setFrame(i % 2 ? 0 : 4);
      sound.play('zap');
      await s.wait(110 + i * 30);
    }
    k.core.setAlpha(1).setFrame(0);
    await s.camFocus(k.eye(), 2, 600);
    k.core.setFrame(1);
    sound.play('wail');
    sound.play('charge');
    s.shake(6, 1000);
    s.flash(0.5, 300);
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 220, () => ring(s, k.eye(), 'fx_ring', 3, 600));
    await s.wait(1100);
    k.core.setFrame(k.restFrame());
    // its shape will not hold still: every few seconds it slips
    const tick = () => {
      if (!k.dead && k.core.active && Number(k.core.frame.name) === k.restFrame()) {
        k.core.setFrame(4);
        if (Math.random() < 0.4) sound.play('zap');
        s.time.delayedCall(70 + Math.random() * 60, () => {
          if (!k.dead && k.core.active && Number(k.core.frame.name) === 4) k.core.setFrame(k.restFrame());
        });
      }
      s.time.delayedCall(1500 + Math.random() * 2200, tick);
    };
    s.time.delayedCall(1800, tick);
  }

  /** It cannot hold any of it any more. The light pours out, and it shrinks back to what it was. */
  private async subjectVictory() {
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    k.dead = true;
    k.sway = 0;
    sound.play('powerdown');
    for (let i = 0; i < 10; i++) {
      k.core.setFrame(i % 2 ? 0 : 4);
      await s.wait(80 + i * 12);
    }
    for (let i = 0; i < 16; i++) {
      const o = s.w(s.add.image(k.center().x, k.center().y, 'fx_spark'), 63);
      const ang = Math.random() * Math.PI * 2;
      s.tweens.add({ targets: o, x: o.x + Math.cos(ang) * 120, y: o.y + Math.sin(ang) * 80 - 40, alpha: 0, duration: 900, delay: i * 30, onComplete: () => o.destroy() });
    }
    s.flash(0.8, 500);
    k.core.setFrame(3);
    sound.play('heavy');
    await s.tw({ targets: k.off, y: 6, duration: 400, ease: 'Bounce.easeOut' });
    s.shake(3, 400);
    await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.85, 800);
    await s.wait(1200);
    s.setDarkness(0.2);
    sound.play('victory');
    await s.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(s.idleAnim);
    s.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    await s.wait(1000);
  }

  /** The Warden falls to bones. A supercharged spirit runs out of everything at once. */
  private async prisonVictory() {
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    k.dead = true;
    k.sway = 0;
    if (k.kind === 'skelwarden') {
      for (let i = 0; i < 5; i++) {
        sound.play('rattle');
        await s.tw({ targets: k.off, x: i % 2 ? 4 : -4, duration: 70, yoyo: true });
      }
      k.core.setFrame(3);
      sound.play('crash');
      burst(s, { x: k.body.x, y: PLAYER_Y }, 'fx_dotM', 14, 60, 700);
      s.shake(6, 600);
      await s.wait(1000);
    } else {
      sound.play('debuff');
      k.core.setFrame(3);
      await s.tw({ targets: k.off, scale: 0.7, y: 12, duration: 1400, ease: 'Sine.easeIn' });
      s.tweens.add({ targets: k.core, alpha: 0.7, duration: 800 });
      await s.wait(800);
    }
    await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.85, 800);
    s.setDarkness(0.2);
    sound.play('victory');
    await s.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(s.idleAnim);
    s.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    await s.wait(1000);
  }


  // ------------------------------------------------------------- endings

  async victory() {
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.playSong(null);
    s.flash(1, 600);
    await s.invert(150);
    await s.camFocus(k.eye(), 2, 700);
    k.core.setFrame(1);
    sound.play(voice(k.kind));
    s.shake(5, 1000);
    await s.wait(800);
    if (isPrison(k.kind)) return this.prisonVictory();
    if (k.kind === 'subject') return this.subjectVictory();
    k.dead = true;
    k.sway = 0;
    sound.play('heavy');
    k.core.setFrame(k.kind === 'viperwind' ? 3 : 3);
    await s.tw({ targets: k.off, y: k.kind === 'crow' ? -(k.body.y - k.off.y - PLAYER_Y - 10) : 10, duration: 500, ease: 'Bounce.easeOut' });
    s.boom(k.body.x, PLAYER_Y + 4, 1.4);
    s.shake(5, 500);
    await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.85, 800);
    await s.wait(1100);
    if (k.kind === 'wispmane' || k.kind === 'viperwind') {
      // it gets up, still not convinced, and is simply gone
      k.dead = false;
      k.core.setFrame(0);
      await s.tw({ targets: k.off, y: 0, duration: 600 });
      await s.camFocus(k.eye(), 1.8, 500);
      await s.wait(700);
      sound.play('whoosh');
      await s.tw({ targets: k.core, alpha: 0, duration: 700 });
    } else if (k.kind === 'champion') {
      await s.wait(500);
    } else {
      k.dead = false;
      k.core.setFrame(k.kind === 'crow' ? 1 : 0);
      sound.play(k.kind === 'crow' ? 'caw' : 'swish');
      await s.tw({ targets: k.off, x: 420, y: k.kind === 'crow' ? -200 : 0, duration: 900, ease: 'Quad.easeIn' });
    }
    s.setDarkness(0.2);
    sound.play('victory');
    await s.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(s.idleAnim);
    s.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    await s.wait(1000);
  }

  /** The team falls. Against the Reaper, it barely moved. */
  async defeat() {
    if (this.s.finS) return this.s.finS.defeat();
    const s = this.s;
    const k = this.k;
    if (k.kind === 'reaper') {
      sound.playSong(null);
      await s.camFocus(k.eye(), 1.6, 1200);
      k.core.setFrame(0);
      await s.wait(1800);
      return;
    }
    await s.camFocus(k.eye(), 1.8, 800);
    k.core.setFrame(1);
    sound.play(voice(k.kind));
    s.shake(4, 700);
    await s.wait(900);
  }
}
