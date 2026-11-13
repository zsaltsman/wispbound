import Phaser from 'phaser';
import type { BattleScene } from '../BattleScene';
import { PLAYER_X, PLAYER_Y } from './Arena';
import { sound } from '../../audio/audio';
import { W, H, ARENA_CY } from '../../constants';
import { txt, box, C } from '../../ui/ui';
import { burst, ring, bossHits } from './anims';
import { ALLY_KIT, type AllyDef } from '../../engine/final';
import { getCreature } from '../../engine/creatures';
import type { ActionResult } from '../../engine/types';
import { loadState, saveState } from '../../story/state';

// The God of Death, told in battle: four fights chained into one.
//
//  gr1  the Reaper as you met him. Beaten, he falls... and gets up as a mountain of muscle
//       (the story cuts away to the guardian and Flamora before the second fight)
//  gr2  the buff Reaper. Beaten, he kneels: "I CAN'T DIE." and comes apart
//  gr3  the true form, revealed. At 80, 60 and 40% help arrives (Pipwick, Madame Oracle,
//       Ayla, with half the islands behind them); at 20% everything goes wrong and you
//       supercharge your spirits - the way the sergeant said nobody ever had
//  gr4  the ultimate fight, at the centre of his domain. Beaten, he falls apart for good.

type S = BattleScene;
type Pt = { x: number; y: number };

/** What the battle needs to know about the story (passed in from the world). */
export interface FinCfg {
  /** the true form: which section (0 = from the top, 1-3 = after Pipwick, Oracle, Ayla) */
  sec?: number;
  /** the helpers, in order of arrival: Pipwick, Madame Oracle, Ayla */
  allies?: AllyDef[];
  /** your three spirits (World 1, 2, 3) and the guardian */
  own?: string[];
  g?: string;
  /** World 3's Milo stayed on the island (he comes with Ayla) */
  milo?: boolean;
  /** the big reveal has been seen already (retries start quicker) */
  seen?: boolean;
  /** DEV: start the true form just above milestone `near` (1-4: 80/60/40/20%), to watch it */
  near?: number;
}

const GROUND = PLAYER_Y + 8;
const BOTTOM_PROMPT = H - 50;
const REAPER = 'THE GRIM REAPER';
const P_R = 260;
const PIP = 'PIPWICK';
const ORA = 'MADAME ORACLE';
const AYLA = 'AYLA';

/** How each helper's spirit is announced when it acts (a little personality each). */
const ALLY_QUIPS: Record<AllyDef['who'], string[]> = {
  pipwick: ['FOR SCIENCE!', 'CALCULATED!', 'MARK VIII!', 'EUREKA!', 'THAT WAS ON PURPOSE!'],
  oracle: ['I SAW THAT COMING.', 'AS FORETOLD.', 'THE CARDS SAY: HIT HIM.', 'THAT ONE IS FREE.'],
  ayla: ['MINE NOW!', 'YOINK!', 'NOBODY SAW THAT!', 'BORROWING THIS!'],
};

export class FinalScenes {
  private s: S;
  /** people standing about in the arena during a cutscene */
  private crowd: Phaser.GameObjects.Sprite[] = [];
  private allyPerson?: Phaser.GameObjects.Sprite;
  private allySpirit?: Phaser.GameObjects.Sprite;

  constructor(s: S) {
    this.s = s;
  }
  private get k() {
    return this.s.arena.ti!;
  }
  private get b() {
    return this.s.battle;
  }
  private get kind() {
    return this.s.enemyId as 'gr1' | 'gr2' | 'gr3' | 'gr4';
  }
  private get cfg() {
    return this.s.fin;
  }

  // ================================================================ setup

  /** Before the first frame: a retried section of the true form starts where it was. */
  setup() {
    const sec = this.cfg.sec ?? 0;
    const near = this.cfg.near ?? 0;
    if (this.kind === 'gr3' && sec > 0) {
      this.b.startAt(1 - 0.2 * sec, sec + 1);
      const al = this.cfg.allies?.[sec - 1];
      if (al) this.b.setAlly(al);
    } else if (this.kind === 'gr3' && near > 0) {
      this.b.startAt(1 - 0.2 * near + 0.015, near);
      const al = near > 1 ? this.cfg.allies?.[near - 2] : undefined;
      if (al) this.b.setAlly(al);
    }
  }

  /** TRY AGAIN keeps your place in the true form (the section you reached). */
  retryCfg(): FinCfg {
    const sec = this.kind === 'gr3' ? Math.min(3, Math.max(0, this.b.b.phase - 1)) : undefined;
    return { ...this.cfg, sec, seen: true };
  }

  songFor(p: number): string {
    if (this.kind === 'gr1') return 'gr_reaper1';
    if (this.kind === 'gr2') return 'gr_buff';
    if (this.kind === 'gr3') return 'gr_true';
    return p >= 3 ? 'gr_final2' : 'gr_final';
  }

  /** Progress in the save, so closing the game mid-fight comes back to the right fight. */
  private mark(stage: string, sec = 0) {
    // ROGUELIKE: a run never touches the story's save
    if (this.s.rogue) return;
    const st = loadState();
    if (!st) return;
    st.flags.w6_stage = stage;
    st.flags.w6_sec = sec;
    saveState(st);
  }

  // ================================================================ talking

  /** A line in a box over the bottom of the screen; waits for SPACE/X. */
  async say(text: string, who?: string, pitch = 700) {
    const s = this.s;
    const c = s.uiObj(s.add.container(0, 0));
    c.setDepth(300);
    const g = s.add.graphics();
    c.add(g);
    const y0 = H - 80;
    box(g, 6, y0, W - 12, 74, 'dark');
    let ty = y0 + 8;
    if (who) {
      c.add(txt(s, 14, y0 + 6, who, { color: C.light }));
      ty += 12;
    }
    const t = txt(s, 14, ty, '', { maxW: W - 30 });
    c.add(t);
    const up = text.toUpperCase();
    let skip = false;
    s.keyWait = () => (skip = true);
    for (let i = 1; i <= up.length && !skip; i++) {
      t.setText(up.slice(0, i));
      const ch = up[i - 1];
      if (ch !== ' ' && i % 2 === 0) sound.blip(pitch + (ch.charCodeAt(0) % 5) * 12);
      await s.wait(ch === '.' ? 90 : 24);
    }
    t.setText(up);
    s.keyWait = null;
    const pr = txt(s, W - 16, y0 + 62, 'SPACE/X', { color: C.mid, origin: [1, 0] });
    c.add(pr);
    const blink = s.tweens.add({ targets: pr, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    await this.key();
    blink.remove();
    sound.play('text');
    c.destroy();
  }

  /** Wait for SPACE/X (or a tap). */
  key(): Promise<void> {
    return new Promise((r) => {
      this.s.keyWait = r;
      // ROGUELIKE: everyone is watching their own copy of this; lines move on by themselves so nobody falls behind
      if (this.s.rogue)
        this.s.time.delayedCall(1500, () => {
          if (this.s.keyWait !== r) return;
          this.s.keyWait = null;
          r();
        });
    });
  }

  /** Huge words in the middle of the screen (his lines when he stops talking and starts shouting). */
  async shout(text: string, size = 2, hold = 1100, shake = 0) {
    const s = this.s;
    const t = s.uiObj(txt(s, W / 2, ARENA_CY - 10, text, { outline: true, origin: [0.5, 0.5], align: 'center', maxW: 380 / size }).setScale(size * 0.6).setAlpha(0));
    t.setDepth(290);
    sound.play(size >= 3 ? 'roar' : 'ghost');
    if (shake) s.shake(shake, hold);
    s.tweens.add({ targets: t, alpha: 1, scale: size, duration: 220, ease: 'Back.easeOut' });
    await s.wait(hold);
    await s.tw({ targets: t, alpha: 0, duration: 300 });
    t.destroy();
  }

  /** A title card across the middle (name and a line under it). */
  async card(title: string, sub: string, hold = 2200) {
    const s = this.s;
    const c = s.uiObj(s.add.container(0, 0));
    c.setDepth(280);
    const g = s.add.graphics();
    g.fillStyle(C.black, 0.85).fillRect(0, ARENA_CY - 34, W, 62);
    g.fillStyle(C.light, 1).fillRect(0, ARENA_CY - 34, W, 1).fillRect(0, ARENA_CY + 27, W, 1);
    c.add(g);
    c.add(txt(s, W / 2, ARENA_CY - 22, title, { outline: true, origin: [0.5, 0] }).setScale(2));
    c.add(txt(s, W / 2, ARENA_CY + 12, sub, { color: C.light, origin: [0.5, 0] }));
    c.setAlpha(0);
    await s.tw({ targets: c, alpha: 1, duration: 400 });
    await s.wait(hold);
    await s.tw({ targets: c, alpha: 0, duration: 500 });
    c.destroy();
  }

  // ================================================================ people in the arena

  /** Someone from the islands, standing at the back of the arena (side-on, facing right). */
  private person(look: string, x: number, depth = 46, right = true) {
    const s = this.s;
    const sp = s.w(s.add.sprite(x, GROUND - 12, 'ch_' + look, 6).setOrigin(0.5, 1).setScale(1.7).setFlipX(right), depth);
    this.crowd.push(sp);
    return sp;
  }

  /** Walk someone along the floor (three-frame side walk), ending facing the way they walked. */
  private async walk(sp: Phaser.GameObjects.Sprite, toX: number, ms: number) {
    const s = this.s;
    sp.setFlipX(toX > sp.x);
    let f = 0;
    const ev = s.time.addEvent({ delay: 120, loop: true, callback: () => sp.setFrame(6 + (f++ % 3)) });
    await s.tw({ targets: sp, x: toX, duration: ms });
    ev.remove();
    sp.setFrame(6);
  }

  /** A whole group arrives from the left, each a beat behind the one before. */
  private async arrive(group: [string, number][], ms = 1400) {
    const out = group.map(([look], i) => this.person(look, -40 - i * 26));
    sound.play('step');
    await Promise.all(out.map((sp, i) => this.s.wait(i * 160).then(() => this.walk(sp, group[i][1], ms))));
    return out;
  }

  /** Everyone in the crowd (except `keep`) walks back out to the left. */
  private async leaveAll(keep: Phaser.GameObjects.Sprite[] = [], ms = 1200) {
    const go = this.crowd.filter((c) => !keep.includes(c));
    await Promise.all(go.map((sp, i) => this.s.wait(i * 90).then(() => this.walk(sp, -60 - i * 10, ms))));
    go.forEach((sp) => sp.destroy());
    this.crowd = this.crowd.filter((c) => keep.includes(c));
  }

  /** A little jump of surprise (or joy). */
  private hop(sp: Phaser.GameObjects.Sprite, n = 1) {
    return this.s.tw({ targets: sp, y: sp.y - 8, duration: 120, yoyo: true, repeat: n - 1 });
  }

  // ================================================================ the helper

  /** Pipwick (or Oracle, or Ayla) at the back, and their spirit at your side. */
  private showAlly(def: AllyDef, instant = false) {
    const s = this.s;
    this.hideAlly(true);
    const look = def.who === 'pipwick' ? 'inventor' : def.who === 'oracle' ? 'psychic' : 'ayla';
    this.allyPerson = s.w(s.add.sprite(instant ? 18 : -40, GROUND - 14, 'ch_' + look, 6).setOrigin(0.5, 1).setScale(1.7).setFlipX(true), 47);
    this.allySpirit = s.w(s.add.sprite(PLAYER_X + 40, PLAYER_Y - 4, 'cr_' + def.creature, 0).setOrigin(0.5, 1).setScale(0.8), 50);
    this.allySpirit.play(`cr_${def.creature}_idle`);
    if (!instant) this.allySpirit.setAlpha(0);
  }
  private hideAlly(now = false) {
    if (now) {
      this.allyPerson?.destroy();
      this.allySpirit?.destroy();
      this.allyPerson = this.allySpirit = undefined;
    }
  }

  /** The helper's spirit acts on its own: what it does depends on what it chose. */
  async allyTurn(res: ActionResult) {
    const s = this.s;
    const al = this.b.ally;
    const sp = this.allySpirit;
    if (!al || !sp) {
      await s.playEvents(res.post);
      return;
    }
    const slot = Number(res.id.split(':')[1] ?? 0);
    const fx = ALLY_KIT[al.def.creature]?.[slot];
    const ab = getCreature(al.def.creature).abilities[slot];
    const quips = ALLY_QUIPS[al.def.who];
    s.hud.caption(ab?.icon ?? 'i_bolt', `${al.def.name}: ${ab?.name ?? ''}`, false);
    if (al.acted % 3 === 1) s.num(this.allyPerson?.x ?? 20, (this.allyPerson?.y ?? GROUND) - 52, quips[al.acted % quips.length], { color: C.white });
    const from = { x: sp.x + 6, y: sp.y - sp.displayHeight * 0.5 };
    const boss = this.k.center();
    await s.camTo((from.x + boss.x) / 2, ARENA_CY, 1.0, 260);
    sp.setFrame(4);
    sound.play('swish');
    await s.tw({ targets: sp, x: sp.x + 10, duration: 120, yoyo: true });
    const kind = fx?.fx ?? 'hit';
    if (['hit', 'big', 'hex', 'burn', 'weaken'].includes(kind)) {
      const big = kind === 'big';
      if (big) {
        sound.play('charge');
        ring(s, from, 'fx_ring', 2.4, 500);
        await s.wait(350);
      }
      const n = Math.max(1, res.hits.length);
      for (let i = 0; i < n; i++) {
        sound.play(big ? 'boom' : 'hit');
        await s.projectile(big ? 'fx_ball' : kind === 'hex' ? 'fx_hex' : kind === 'burn' ? 'fx_spark' : 'fx_bolt', from, { x: boss.x + (Math.random() - 0.5) * 30, y: boss.y + (Math.random() - 0.5) * 30 }, big ? 420 : 300, 20, { trail: true, scale: big ? 2 : 1 } as any);
        if (res.hits[i]) await bossHits(s, [res.hits[i]], 0);
      }
      if (big) {
        s.shake(5, 400);
        s.boom(boss.x, boss.y, 1.6);
      }
    } else if (['snare', 'spook', 'delay'].includes(kind)) {
      sound.play(kind === 'delay' ? 'freeze' : 'ghost');
      await s.projectile(kind === 'delay' ? 'fx_clock' : 'fx_ring', from, boss, 360, 30, { trail: true } as any);
      ring(s, boss, 'fx_ring', 3, 600);
    } else {
      // shields, heals, energy: for you
      const P = s.arena.playerCenter();
      sound.play(kind === 'heal' || kind === 'team' ? 'heal' : 'shield');
      await s.projectile('fx_dot', from, P, 260, 16, { trail: true } as any);
      ring(s, P, 'fx_ring', 2, 400);
      if (kind === 'heal' || kind === 'team') s.healFx();
    }
    sp.setFrame(0);
    sp.play(`cr_${al.def.creature}_idle`);
    await s.playEvents(res.post);
    s.hud.hideCaption();
    s.hud.sync();
  }

  // ================================================================ your spirits, supercharged

  /** Before a supercharged spirit's move: its power flares (in its own world's way). */
  async scCharge(_res: ActionResult) {
    const s = this.s;
    const a = s.arena;
    const id = s.creature.base ?? s.creature.id;
    const P = a.playerCenter();
    const w1 = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'].includes(id);
    const w2 = ['glowbell', 'hammerfin', 'bubblotl', 'glidray'].includes(id);
    sound.play('charge');
    if (w1) burst(s, { x: P.x, y: P.y + 10 }, 'fx_puff', 8, 34, 420);
    else if (w2) for (let i = 0; i < 8; i++) s.time.delayedCall(i * 30, () => {
      const o = s.w(s.add.image(P.x + (Math.random() - 0.5) * 50, P.y + 20, 'fx_dot'), 62);
      s.tweens.add({ targets: o, y: o.y - 50 - Math.random() * 30, alpha: 0, duration: 500, onComplete: () => o.destroy() });
    });
    else {
      burst(s, { x: P.x, y: P.y }, 'fx_spark', 8, 30, 360);
      sound.play('clank');
    }
    ring(s, P, 'fx_ring', 2.6, 360);
    await s.wait(160);
  }

  /** After it lands: an aftershock on him that only a supercharged spirit makes. */
  async scImpact(res: ActionResult) {
    const s = this.s;
    if (!res.hits.length) return;
    const c = this.k.center();
    s.flash(0.35, 140);
    ring(s, c, 'fx_ring', 3.4, 420);
    burst(s, c, 'fx_dotM', 10, 46, 420);
    s.shake(2.5, 220);
    await s.wait(120);
  }

  // ================================================================ entrances

  async intro() {
    const s = this.s;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.setAmbience('indoor');
    s.cameras.main.fadeIn(900, 0, 0, 0);
    s.uiCam.fadeIn(900, 0, 0, 0);
    s.cs = { x: W / 2 + 30, y: ARENA_CY - 20, zoom: 0.85, rot: 0 };
    if (this.kind === 'gr1') {
      this.mark('gr1');
      sound.playSong(null);
      s.setDarkness(0.4);
      k.core.setAlpha(0);
      k.off.y = 40;
      await s.wait(700);
      sound.play('heartbeat');
      await s.camFocus(k.center(), 1.3, 900);
      sound.play('rumble');
      s.shake(2, 1800);
      s.tweens.add({ targets: k.core, alpha: 1, duration: 1500 });
      await s.tw({ targets: k.off, y: 0, duration: 1800, ease: 'Sine.easeOut' });
      await s.camFocus(k.eye(), 2.1, 700);
      k.core.setFrame(6);
      sound.playSong(this.songFor(1));
      sound.play('wail');
      s.flash(0.5, 300);
      ring(s, k.eye(), 'fx_ring', 3, 700);
      await s.wait(700);
      s.hud.setSubtitle('COLLECTOR OF SOULS');
      k.core.setFrame(0);
    } else if (this.kind === 'gr2') {
      this.mark('gr2');
      sound.playSong(this.songFor(1));
      s.hud.setSubtitle('ABSOLUTELY ENORMOUS');
      k.off.x = 200;
      for (let i = 0; i < 3; i++) {
        sound.play('stone');
        s.shake(5, 220);
        await s.tw({ targets: k.off, x: 200 - (i + 1) * 66.7, duration: 320, ease: 'Sine.easeInOut' });
        burst(s, { x: k.body.x - 30, y: GROUND }, 'fx_dotM', 5, 24, 300);
      }
      await s.camFocus(k.center(), 1.6, 500);
      k.core.setFrame(1);
      sound.play('roar');
      s.shake(7, 900);
      await s.invert(110);
      await s.wait(900);
      k.core.setFrame(0);
    } else if (this.kind === 'gr3') {
      this.mark('gr3', this.cfg.sec ?? 0);
      if (!this.cfg.seen) await this.revealTrueForm();
      else {
        sound.playSong(this.songFor(1));
        s.hud.setSubtitle('THE GOD OF DEATH');
        await s.camFocus(k.eye(), 1.8, 700);
        k.core.setFrame(3);
        sound.play('roar');
        s.shake(5, 700);
        await s.wait(700);
        k.core.setFrame(k.restFrame());
      }
      const sec = this.cfg.sec ?? 0;
      const al = sec > 0 ? this.cfg.allies?.[sec - 1] : undefined;
      if (al) this.showAlly(al, true);
    } else {
      this.mark('gr4');
      // ROGUELIKE: his true form and his last stand are one fight; it opens with the supercharge
      if (this.s.rogue) await this.rogueSupercharge();
      await this.domainIntro();
    }
    await s.camTo(W / 2 + 20, ARENA_CY - 20, 0.85, 600);
    await s.camFocus(s.arena.playerCenter(), 1.6, 500);
    await s.wait(250);
    await s.camHome(700);
  }

  /** The true form. It comes out of him one piece at a time. */
  private async revealTrueForm() {
    const s = this.s;
    const k = this.k;
    sound.playSong(null);
    s.setDarkness(0.95);
    k.core.setFrame(6);
    k.legN = 0;
    k.wings?.setAlpha(0);
    k.sway = 0.3;
    await s.wait(1200);
    for (let i = 0; i < 2; i++) {
      sound.play('heartbeat');
      await s.wait(700);
    }
    await s.camFocus(k.center(), 1.6, 10);
    s.setDarkness(0.55);
    await s.wait(600);
    await this.say('...', REAPER, P_R);
    // the legs: one at a time, out of his back
    const hip = (i: number) => k.local(k.legs[i].hx, k.legs[i].hy);
    for (let i = 0; i < k.legs.length; i++) {
      const h = hip(i);
      k.legs[i].fx = h.x;
      k.legs[i].fy = h.y;
      k.legN = i + 1;
      sound.play(i % 2 ? 'slice' : 'creakmetal');
      s.shake(3 + i, 260);
      s.flash(0.25, 120);
      burst(s, h, 'fx_dotM', 5, 26, 300);
      await s.wait(420 - i * 30);
    }
    sound.play('rumble');
    s.shake(5, 900);
    await s.wait(500);
    // the wings
    await s.camTo(k.center().x, k.center().y - 20, 1.0, 500);
    k.holdWings(3);
    s.tweens.add({ targets: k.wings!, alpha: 1, duration: 500 });
    await s.wait(500);
    sound.play('whoosh');
    k.holdWings(0);
    s.shake(8, 700);
    s.flash(0.6, 300);
    for (let i = 0; i < 18; i++) {
      const o = s.w(s.add.image(k.body.x - 40, ARENA_CY + (Math.random() - 0.5) * 160, 'fx_gust').setAlpha(0.7), 63);
      s.tweens.add({ targets: o, x: -60, alpha: 0, duration: 500 + Math.random() * 300, delay: i * 20, onComplete: () => o.destroy() });
    }
    await s.wait(700);
    k.holdWings(null);
    // the crown, out of the dark, down onto the hood
    const top = k.local(-4, -k.core.height * 0.9);
    const cr = s.w(s.add.image(top.x, top.y - 80, 'fb_crown').setAlpha(0).setScale(1.3), 64);
    await s.camFocus({ x: top.x, y: top.y - 10 }, 2.2, 500);
    sound.play('bell');
    s.tweens.add({ targets: cr, alpha: 1, duration: 600 });
    await s.tw({ targets: cr, y: top.y + 6, duration: 1400, ease: 'Sine.easeInOut' });
    cr.destroy();
    k.core.setFrame(3);
    sound.play('bell');
    s.flash(0.7, 300);
    ring(s, top, 'fx_ring', 3.4, 700);
    await s.wait(800);
    // two scythes
    k.core.setFrame(0);
    sound.play('slice');
    s.time.delayedCall(180, () => sound.play('slice'));
    s.flash(0.5, 200);
    await s.wait(700);
    // and the words
    await s.camFocus(k.eye(), 2.4, 400);
    k.core.setFrame(3);
    k.sway = 1;
    s.setDarkness(0.3);
    await s.invert(140);
    sound.playSong(this.songFor(1));
    await this.shout('I AM THE GOD OF DEATH!', 3, 1800, 9);
    await s.camTo(W / 2 + 30, ARENA_CY - 20, 0.85, 700);
    await this.card('THE GOD OF DEATH', 'CROWNED. WINGED. NOT FINISHED.', 2200);
    s.hud.setSubtitle('THE GOD OF DEATH');
    k.core.setFrame(0);
  }

  /** The centre of his domain. Your spirits, supercharged; him, coming down out of the eclipse. */
  private async domainIntro() {
    const s = this.s;
    const k = this.k;
    const a = s.arena;
    sound.playSong(null);
    s.flash(1, 1200);
    k.off.y = -320;
    await s.wait(1200);
    await s.camFocus(a.playerCenter(), 1.4, 900);
    sound.play('charge');
    ring(s, a.playerCenter(), 'fx_ring', 3, 700);
    await s.wait(600);
    await s.camTo(k.center().x, 60, 1.2, 800);
    sound.play('whoosh');
    sound.playSong(this.songFor(1));
    await s.tw({ targets: k.off, y: 0, duration: 2200, ease: 'Sine.easeOut' });
    s.shake(7, 700);
    sound.play('stone');
    burst(s, { x: k.body.x, y: GROUND }, 'fx_dotM', 14, 60, 600);
    await s.camFocus(k.eye(), 2, 500);
    k.core.setFrame(3);
    await this.say('Fine.', REAPER, P_R);
    await this.say('Then I will take EVERYTHING.', REAPER, P_R);
    s.shake(6, 900);
    await this.card('THE LAST BATTLE', 'THE CENTRE OF HIS DOMAIN', 2000);
    s.hud.setSubtitle('THE GOD OF DEATH');
    k.core.setFrame(0);
  }

  // ================================================================ escalation

  async phase(p: number) {
    const s = this.s;
    const k = this.k;
    s.hud.setIntentVisible(false);
    s.hud.showMenu(s.menuSel, true);
    if (this.kind === 'gr3') return this.milestone(p);
    await s.camFocus(k.eye(), 1.9, 500);
    if (this.kind === 'gr1') {
      k.core.setFrame(p >= 3 ? 1 : 6);
      sound.play('wail');
      s.setDarkness(p >= 3 ? 0.45 : 0.25);
      s.shake(p >= 3 ? 7 : 4, 1000);
      if (p === 3) await this.say('ENOUGH.', REAPER, P_R);
    } else if (this.kind === 'gr2') {
      k.core.setFrame(1);
      sound.play('roar');
      s.shake(8, 1100);
      await s.invert(110);
      if (p === 2) await this.say('I have been doing PUSH-UPS for a THOUSAND YEARS.', REAPER, P_R);
      else await this.say('NO MORE HOLDING BACK.', REAPER, P_R);
      k.core.setFrame(6);
    } else {
      // fully powered: the domain itself answers him
      k.core.setFrame(3);
      sound.play('bell');
      s.flash(0.7, 400);
      s.setDarkness(p >= 3 ? 0.4 : 0.2);
      s.shake(8, 1400);
      if (p === 2) await this.say('You think you have seen all of me?', REAPER, P_R);
      else {
        await this.say('I AM THE END OF EVERY STORY.', REAPER, P_R);
        sound.playSong(this.songFor(3));
      }
    }
    s.arena.setPhase(p);
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 200, () => ring(s, k.eye(), 'fx_ring', 3.2, 600));
    await s.wait(700);
    k.core.setFrame(k.restFrame());
    await s.camHome(700);
    s.syncStatusFx();
  }

  /** A small cue before his big moves. */
  async warnCue(id: string) {
    const s = this.s;
    const k = this.k;
    const raise: Record<string, number> = {
      g_reap: 1, g_harvest: 1, g_storm: 1, g_knell: 6,
      b_punch: 6, b_scythe: 3, b_fury: 6, b_crush: 6,
      t_cross: 1, t_wings: 3, t_eclipse: 3, t_storm: 4,
      f_twin: 1, f_spider: 4, f_descent: 3, f_crown: 3, f_extinction: 3,
    };
    if (!(id in raise)) return;
    k.core.setFrame(raise[id]);
    sound.play(this.kind === 'gr2' ? 'roar_small' : 'ghost');
    s.time.delayedCall(600, () => k.core.setFrame(k.restFrame()));
  }

  // ================================================================ the milestones

  /** Everyone stands back up, full strength. */
  private async restore() {
    const s = this.s;
    this.b.restoreParty();
    s.arena.setChampion();
    s.healFx();
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 160, () => ring(s, s.arena.playerCenter(), 'fx_ring', 2.4, 500));
    s.num(s.arena.playerCenter().x, s.arena.playerCenter().y - 30, 'RESTORED!', { color: C.white });
    s.hud.sync();
    s.syncStatusFx();
    await s.wait(700);
  }

  /** He strikes the helper down: one enormous blow at the back of the room. */
  private async strikeAlly() {
    const s = this.s;
    const k = this.k;
    const sp = this.allySpirit;
    if (!sp) return;
    await s.camTo((sp.x + k.body.x) / 2, ARENA_CY, 0.95, 400);
    k.core.setFrame(1);
    sound.play('charge');
    await s.wait(500);
    k.core.setFrame(2);
    sound.play('slice');
    await s.projectile('fx_darkblade', k.center(), { x: sp.x, y: sp.y - 20 }, 300, 0, { trail: true, scale: 2 } as any);
    s.boom(sp.x, sp.y - 16, 1.6);
    s.shake(8, 500);
    s.flash(0.6, 200);
    sp.stop().setFrame(5);
    await s.tw({ targets: sp, angle: -80, alpha: 0.4, duration: 600 });
    k.core.setFrame(k.restFrame());
    await s.wait(500);
  }

  /** ROGUELIKE: the same four turning points, without the story's visitors: it is between him and the party. */
  private async rogueMilestone(p: number) {
    const s = this.s;
    const k = this.k;
    await k.settle(400);
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.playSong(null);
    await s.camFocus(k.eye(), 1.8, 600);
    k.core.setFrame(4);
    sound.play('wail');
    s.shake(6, 900);
    await s.invert(110);
    s.flash(0.6, 300);
    const lines: Record<number, string> = {
      2: 'You are still standing. That is... unusual.',
      3: 'HOW MANY OF YOU ARE THERE?',
      4: 'I have collected kings. I have collected gods. I WILL collect you.',
      5: 'No. NOT LIKE THIS.',
    };
    await this.say(lines[p] ?? '...', REAPER, P_R);
    for (let i = 0; i < 3; i++) s.time.delayedCall(i * 200, () => ring(s, k.eye(), 'fx_ring', 3.2, 600));
    if (p < 5) {
      s.arena.setPhase(p);
      sound.playSong(this.songFor(p));
    }
    await s.wait(500);
    k.core.setFrame(k.restFrame());
    await s.camHome(700);
    s.syncStatusFx();
  }

  async milestone(p: number) {
    if (this.s.rogue) return this.rogueMilestone(p);
    const s = this.s;
    const k = this.k;
    await k.settle(400);
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    const sec = p - 1;
    if (p <= 4) this.mark('gr3', sec);
    const allies = this.cfg.allies ?? [];
    const al = allies[sec - 1];
    sound.playSong(null);
    await s.wait(400);
    if (p === 2) await this.m80(al);
    else if (p === 3) await this.m60(al);
    else if (p === 4) await this.m40(al);
    else return this.m20();
    // a fresh start for the next section
    await this.restore();
    if (al) this.b.setAlly(al);
    s.hud.sync();
    sound.playSong(this.songFor(p));
    await s.camHome(700);
  }

  /** 80%: Pipwick, and a crowd from the drowned island. */
  private async m80(al?: AllyDef) {
    const s = this.s;
    const k = this.k;
    await s.camTo(W / 2 - 40, ARENA_CY, 1.05, 600);
    await this.say('WAAAAIT!', '???', 1100);
    const [pip, luke, grace, biggs] = await this.arrive([['inventor', 30], ['luke', -2], ['grace', -24], ['mayor2', 54]]);
    void this.hop(pip, 2);
    await this.say('I TOLD YOU!', PIP, 1000);
    await this.say('I TOLD YOU YOUR GOOD DEED WOULD BE REPAID!', PIP, 1000);
    await this.say("I went back to the cave. The one full of spirits. And one of them LIKED me! Mostly it liked my sandwich. But that counts!", PIP, 1000);
    if (al) {
      this.showAlly(al);
      this.allyPerson!.destroy();
      this.allyPerson = pip;
      this.crowd = this.crowd.filter((c) => c !== pip);
      sound.play('recruit');
      ring(s, { x: this.allySpirit!.x, y: this.allySpirit!.y - 20 }, 'fx_ring', 2.6, 500);
      await s.tw({ targets: this.allySpirit!, alpha: 1, duration: 500 });
      await this.say(`${getCreature(al.creature).name} WILL FIGHT WITH YOU!`, PIP, 1000);
    }
    await this.say('Is that the Grim Reaper? Like, THE Grim Reaper? Do you think he wants to sell that crown?', 'LUKE', 760);
    await this.say('Luke.', 'GRACE', 880);
    await this.say('Vintage crown. Hardly worn.', 'LUKE', 760);
    void this.hop(biggs);
    await this.say('For the record, I did NOT cause this either! Vote Biggs!', 'MAYOR BIGGS', 640);
    await s.camFocus(k.eye(), 1.8, 500);
    k.core.setFrame(4);
    await this.say('...Who are ALL of you?', REAPER, P_R);
    await this.leaveAll([pip]);
    void luke;
    void grace;
  }

  /** 60%: Pipwick goes down. The assistant brings the first island; Madame Oracle comes too. */
  private async m60(al?: AllyDef) {
    const s = this.s;
    const k = this.k;
    await this.strikeAlly();
    const pip = this.allyPerson;
    await this.say("Ow. Oh, that's... that's a lot of ow.", PIP, 1000);
    const [luke, grace] = await this.arrive([['luke', -10], ['grace', 4]], 900);
    sound.play('step');
    await this.say("...You can do this. I know you can. I did the maths. Mostly.", PIP, 960);
    // they carry him out (and his spirit, worn out, trots after them)
    const out = [luke, grace, ...(pip ? [pip] : [])];
    this.allySpirit && s.tweens.add({ targets: this.allySpirit, x: -60, alpha: 0, duration: 1400 });
    await Promise.all(out.map((sp) => this.walk(sp, -70, 1300)));
    out.forEach((o) => o.destroy());
    this.crowd = [];
    this.hideAlly(true);
    this.b.setAlly(null);
    await s.wait(500);
    sound.play('door');
    await s.camTo(W / 2 - 40, ARENA_CY, 1.05, 500);
    const [asst, holt, mabel, gerald, ora, dog] = await this.arrive([['assistant', 36], ['farmer', 6], ['old_lady', -18], ['gerald', 58], ['psychic', 22], ['mayor', -38]]);
    void this.hop(dog, 3);
    sound.play('bark');
    await s.camFocus(k.eye(), 1.8, 500);
    k.core.setFrame(4);
    await this.say('HOW...', REAPER, P_R);
    await this.say('HOW ARE ALL OF YOU GETTING IN HERE?', REAPER, P_R);
    await s.camTo(W / 2 - 40, ARENA_CY, 1.05, 500);
    await this.say('The front door was open.', "MAYOR'S ASSISTANT", 1100);
    await this.say("The elevator plays a lovely tune. Bit gloomy.", 'FARMER HOLT', 520);
    await this.say('BARK!', 'THE MAYOR', 1300);
    await this.say('The mayor says: put the scythe down, young man.', "MAYOR'S ASSISTANT", 1100);
    await this.say('I saw all of this coming, obviously.', ORA, 720);
    await this.say('I also saw that you still owe me five hundred dollars. We will talk after.', ORA, 720);
    if (al) {
      this.showAlly(al);
      this.allyPerson!.destroy();
      this.allyPerson = ora;
      this.crowd = this.crowd.filter((c) => c !== ora);
      sound.play('tickclock');
      await s.tw({ targets: this.allySpirit!, alpha: 1, duration: 500 });
      await this.say(`The spirits whispered to me. ${getCreature(al.creature).name} answered.`, ORA, 720);
    }
    await this.leaveAll([ora]);
    void mabel;
    void gerald;
    void asst;
    void holt;
    await s.camFocus(k.eye(), 1.9, 500);
    k.core.setFrame(1);
    sound.play('roar');
    s.shake(7, 900);
    await this.say('NO MORE GAMES.', REAPER, P_R);
    s.hud.setSubtitle('FURIOUS');
  }

  /** 40%: Oracle goes down. Ayla, with the party island behind her. */
  private async m40(al?: AllyDef) {
    const s = this.s;
    const k = this.k;
    await this.strikeAlly();
    const ora = this.allyPerson;
    await this.say("I foresaw this part as well. It still stings.", ORA, 700);
    const [asst, holt] = await this.arrive([['assistant', -6], ['farmer', 8]], 900);
    await this.say('Go on, dear. The cards were very clear about you.', ORA, 700);
    const out = [asst, holt, ...(ora ? [ora] : [])];
    this.allySpirit && s.tweens.add({ targets: this.allySpirit, x: -60, alpha: 0, duration: 1400 });
    await Promise.all(out.map((sp) => this.walk(sp, -70, 1300)));
    out.forEach((o) => o.destroy());
    this.crowd = [];
    this.hideAlly(true);
    this.b.setAlly(null);
    await s.wait(400);
    sound.play('door');
    await s.camTo(W / 2 - 40, ARENA_CY, 1.05, 500);
    const group: [string, number][] = [['ayla', 34], ['avalena_bar', 8], ['bouncer', -18], ['guide', 58], ['frofro', -40]];
    if (this.cfg.milo) group.push(['milo', 78]);
    const [ayla, ava, bouncer, guide, frofro, milo] = await this.arrive(group);
    void this.hop(ayla);
    await this.say('Did somebody order an art thief? EX art thief. Retired. Mostly.', AYLA, 1180);
    await this.say("You're not on the list.", 'BOUNCER', 420);
    await this.say('After the barrel, I swore I would never set foot in a dark, scary place again. And yet. Here I am.', 'AVALENA', 960);
    await this.say('On your left: the God of Death. Please do not feed him. Please do not let him feed on you.', 'TOUR GUIDE TEDDY', 1100);
    await this.say('We brought froyo. For after. Assuming there IS an after.', 'MR. FROFRO', 700);
    if (milo) {
      await this.say("I know a thing or two about wanting power over spirits. Trust me. It does not end well.", 'MILO', 660);
      await this.say('...I swept the whole street, by the way. Twice.', 'MILO', 660);
    }
    await this.say("Honestly? Three Titans in one week. A big angry skeleton is just a Tuesday.", 'BOUNCER', 420);
    await this.say('Sal would have loved this. He would have charged you double for the view.', 'AVALENA', 960);
    if (al) {
      this.showAlly(al);
      this.allyPerson!.destroy();
      this.allyPerson = ayla;
      this.crowd = this.crowd.filter((c) => c !== ayla);
      sound.play('sparkle');
      await s.tw({ targets: this.allySpirit!, alpha: 1, duration: 500 });
      await this.say(`I didn't steal ${getCreature(al.creature).name}. It followed me. We're partners now. That's legal.`, AYLA, 1180);
    }
    await this.leaveAll([ayla]);
    void ava;
    void bouncer;
    void guide;
    void frofro;
    await s.camFocus(k.eye(), 1.9, 500);
    k.core.setFrame(3);
    sound.play('bell');
    s.shake(6, 900);
    await this.say('I WILL BURY EVERY LAST ONE OF YOU.', REAPER, P_R);
  }

  /** 20%: everything goes wrong. And then you do the thing nobody has ever done. */
  private async m20() {
    const s = this.s;
    const k = this.k;
    const a = s.arena;
    // he hits everything at once
    await s.camTo(W / 2, ARENA_CY - 10, 0.9, 500);
    k.core.setFrame(3);
    k.holdWings(0);
    sound.play('charge');
    s.setDarkness(0.7);
    await s.wait(900);
    k.core.setFrame(2);
    await s.invert(160);
    sound.play('boom');
    s.flash(1, 600);
    s.shake(12, 1200);
    for (const spr of [a.player, a.reserve, a.reserve2, a.reserve3, a.reserve4, this.allySpirit]) {
      if (!spr || !spr.visible) continue;
      s.boom(spr.x, spr.y - 14, 1.2);
      spr.stop().setFrame(5);
    }
    k.holdWings(null);
    await s.wait(900);
    s.setDarkness(0.35);
    k.core.setFrame(k.restFrame());
    // Ayla is done
    const ayla = this.allyPerson;
    await s.camTo(W / 2 - 40, ARENA_CY, 1.05, 500);
    await this.say('Okay. Okay, THAT one I felt.', AYLA, 1100);
    const [ava, bouncer] = await this.arrive([['avalena_bar', -6], ['bouncer', 8]], 900);
    const out = [ava, bouncer, ...(ayla ? [ayla] : [])];
    this.allySpirit && s.tweens.add({ targets: this.allySpirit, x: -60, alpha: 0, duration: 1400 });
    await Promise.all(out.map((sp) => this.walk(sp, -70, 1300)));
    out.forEach((o) => o.destroy());
    this.crowd = [];
    this.hideAlly(true);
    this.b.setAlly(null);
    // Flamora's fire goes out
    const fl = [a.reserve, a.reserve2, a.reserve3, a.reserve4].find((r) => r && r.texture.key === 'cr_flamora');
    if (fl) {
      await s.camFocus({ x: fl.x, y: fl.y - 16 }, 2, 500);
      sound.play('debuff');
      for (let i = 0; i < 4; i++) {
        fl.setAlpha(i % 2 ? 0.7 : 0.3);
        await s.wait(220);
      }
      await this.say("Flamora's flames gutter... and go out. It tries to stand. It can't.");
    }
    // and he heals: every soul in the place pours back into him
    await s.camFocus(k.center(), 1.5, 500);
    k.core.setFrame(3);
    sound.play('charge');
    for (let i = 0; i < 24; i++) {
      const o = s.w(s.add.image(Math.random() * W, ARENA_CY + 80 + Math.random() * 40, 'fx_soul').setAlpha(0.8), 63);
      s.tweens.add({ targets: o, x: k.center().x, y: k.center().y, alpha: 0, duration: 900, delay: i * 40, onComplete: () => o.destroy() });
    }
    await s.wait(900);
    this.b.b.hp = this.b.b.maxHp;
    this.b.b.statuses = [];
    sound.play('heal');
    s.hud.bossHeal(this.b.b.maxHp);
    s.flash(0.6, 300);
    await s.wait(900);
    await this.say('Did you really think that was me TRYING?', REAPER, P_R);
    k.core.setFrame(k.restFrame());
    // silence
    sound.playSong(null);
    await s.camFocus(a.playerCenter(), 1.7, 900);
    await s.wait(1200);
    await this.say('You know what you have to do.');
    await this.say('You have to supercharge your spirits.');
    await s.wait(1200);
    await this.say('Your only chance...');
    await this.say('...is to push them beyond their limits.');
    // you remember the sergeant
    s.setDarkness(0.6);
    await this.say('"You push a spirit past its limits. Way past. It gets bigger. Stronger than it has any right to be."', 'YOU REMEMBER THE SERGEANT', 600);
    await this.say('"Afterwards it has nothing left. ...HE showed us how. Said there is another way to do it, without the price."', 'YOU REMEMBER THE SERGEANT', 600);
    await this.say('"If the spirit trusts you enough. If you trust IT enough. Nobody has ever managed it."', 'YOU REMEMBER THE SERGEANT', 600);
    s.setDarkness(0.3);
    await this.supercharge();
  }

  /** One at a time, your spirits step up. You press, and they go beyond. */
  private async supercharge() {
    const s = this.s;
    const a = s.arena;
    const own = this.cfg.own ?? this.b.party.slice(0, 3).map((m) => m.creature.base ?? m.creature.id);
    const g = this.cfg.g ?? 'wispmane';
    sound.playSong('gr_super');
    a.playerLocked = true;
    for (const r of [a.reserve, a.reserve2, a.reserve3, a.reserve4]) r?.setVisible(false);
    // the ones already powered up wait at the back (the bench sprites, in a row)
    const ready: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < own.length; i++) {
      const id = own[i];
      const name = getCreature(id).name;
      a.player.setTexture('cr_' + id, 0).setAngle(0).setAlpha(1).setVisible(true).setScale(1);
      a.player.play(`cr_${id}_idle`);
      a.player.setPosition(PLAYER_X - 60, PLAYER_Y);
      sound.play('step');
      await s.tw({ targets: a.player, x: PLAYER_X, duration: 500 });
      await s.camFocus(a.playerCenter(), 2, 400);
      await this.say(`${name} looks up at you. It is shaking. It is not afraid.`);
      // the prompt: you cannot go on until you do it
      const pr = s.uiObj(txt(s, W / 2, BOTTOM_PROMPT, `PRESS SPACE/X TO SUPERCHARGE ${name}`, { outline: true, origin: [0.5, 0.5] }));
      pr.setDepth(290);
      const bl = s.tweens.add({ targets: pr, alpha: 0.3, duration: 420, yoyo: true, repeat: -1 });
      const aura = s.time.addEvent({ delay: 140, loop: true, callback: () => ring(s, a.playerCenter(), 'fx_ring', 1.6, 500) });
      await this.key();
      bl.remove();
      pr.destroy();
      aura.remove();
      // the transformation
      sound.play('charge');
      s.shake(3, 1800);
      for (let n = 0; n < 6; n++) {
        burst(s, a.playerCenter(), n % 2 ? 'fx_spark' : 'fx_puff', 8, 30 + n * 6, 400);
        s.flash(0.15 + n * 0.08, 120);
        a.player.setScale(1 + n * 0.08);
        await s.wait(240);
      }
      await s.invert(160);
      sound.play('boom');
      s.flash(1, 500);
      a.player.setScale(1).setTexture('cr_x_' + id, 0);
      a.player.play(`cr_x_${id}_idle`);
      s.shake(9, 700);
      for (let r = 0; r < 4; r++) s.time.delayedCall(r * 160, () => ring(s, a.playerCenter(), 'fx_ring', 4, 700));
      sound.play('roar');
      await s.wait(700);
      await this.card(getCreature('x_' + id).name, `${name} EVOLVED - STILL ITSELF`, 1700);
      // it steps back to wait with the others
      const ghost = s.w(s.add.sprite(a.player.x, a.player.y, 'cr_x_' + id, 0).setOrigin(0.5, 1), 49 - i);
      ghost.play(`cr_x_${id}_idle`);
      a.player.setVisible(false);
      const spot = [PLAYER_X - 52, PLAYER_X - 10, PLAYER_X - 90][i];
      ghost.setScale(0.6);
      await s.tw({ targets: ghost, x: spot, y: PLAYER_Y - 6 - i * 4, duration: 400 });
      ready.push(ghost);
    }
    // the guardian never needed it
    const gk = 'cr_gd_' + g;
    a.player.setTexture(gk, 0).setVisible(true).setScale(1).setPosition(PLAYER_X - 60, PLAYER_Y);
    a.player.play(`${gk}_idle`);
    await s.tw({ targets: a.player, x: PLAYER_X, duration: 500 });
    await s.camFocus(a.playerCenter(), 1.8, 400);
    sound.play(g === 'viperwind' ? 'hiss' : 'roar');
    s.shake(5, 600);
    await this.say(`${g === 'viperwind' ? 'VIPERWIND' : 'WISPMANE'} needs nothing. It was always this strong. It was waiting for you to catch up.`);
    // Flamora rests (the party island takes it somewhere safe)
    await this.say('Flamora is pulled back to safety by the wall. It lies there and watches you, with the last of its light.');
    await s.camTo(W / 2, ARENA_CY - 10, 0.9, 600);
    await this.say('Four of you. One of him.');
    ready.forEach((r) => s.tweens.add({ targets: r, alpha: 0, duration: 500 }));
    this.mark('gr4');
    const party = [...own.map((id) => 'x_' + id), 'gd_' + g];
    s.chainTo('gr4', party, { ...this.cfg, sec: undefined, seen: false }, 900);
    // the next fight takes over from here
    await new Promise<void>(() => {});
  }

  /**
   * ROGUELIKE: the last fight opens with your spirits going beyond, one after another, the way
   * the story's do (quicker, and nobody waits on a key: every player watches their own).
   */
  private async rogueSupercharge() {
    const s = this.s;
    const a = s.arena;
    const k = this.k;
    sound.playSong(null);
    k.core.setAlpha(0);
    s.setDarkness(0.5);
    a.playerLocked = true;
    for (const r of [a.reserve, a.reserve2, a.reserve3, a.reserve4]) r?.setVisible(false);
    await s.wait(500);
    sound.play('heartbeat');
    await s.camFocus(a.playerCenter(), 1.5, 700);
    await this.say('He is coming back. All of him. Your spirits look at you, and they are not afraid.');
    sound.playSong('gr_super');
    const party = this.b.party.filter((m) => m.p.hp > 0);
    const ready: Phaser.GameObjects.Sprite[] = [];
    for (let i = 0; i < party.length; i++) {
      const evo = party[i].creature;
      const base = evo.base ?? evo.id;
      const was = getCreature(base).name;
      a.player.setTexture('cr_' + base, 0).setAngle(0).setAlpha(1).setVisible(true).setScale(1);
      a.player.play(`cr_${base}_idle`);
      a.player.setPosition(PLAYER_X - 60, PLAYER_Y);
      sound.play('step');
      await s.tw({ targets: a.player, x: PLAYER_X, duration: 380 });
      await s.camFocus(a.playerCenter(), 2, 350);
      const pr = s.uiObj(txt(s, W / 2, BOTTOM_PROMPT, `${was}: SUPERCHARGE!`, { outline: true, origin: [0.5, 0.5] }));
      pr.setDepth(290);
      const aura = s.time.addEvent({ delay: 140, loop: true, callback: () => ring(s, a.playerCenter(), 'fx_ring', 1.6, 500) });
      sound.play('charge');
      s.shake(3, 1400);
      for (let n = 0; n < 5; n++) {
        burst(s, a.playerCenter(), n % 2 ? 'fx_spark' : 'fx_puff', 8, 30 + n * 6, 400);
        s.flash(0.15 + n * 0.08, 120);
        a.player.setScale(1 + n * 0.08);
        await s.wait(220);
      }
      aura.remove();
      pr.destroy();
      await s.invert(150);
      sound.play('boom');
      s.flash(1, 500);
      a.player.setScale(1).setTexture('cr_' + evo.id, 0);
      a.player.play(`cr_${evo.id}_idle`);
      s.shake(8, 600);
      for (let r = 0; r < 3; r++) s.time.delayedCall(r * 160, () => ring(s, a.playerCenter(), 'fx_ring', 4, 700));
      sound.play('roar');
      await this.card(evo.name, `${was} EVOLVED - STILL ITSELF`, 1300);
      // it steps back to wait with the others
      const ghost = s.w(s.add.sprite(a.player.x, a.player.y, 'cr_' + evo.id, 0).setOrigin(0.5, 1), 49 - i);
      ghost.play(`cr_${evo.id}_idle`);
      a.player.setVisible(false);
      ghost.setScale(0.6);
      await s.tw({ targets: ghost, x: [PLAYER_X - 52, PLAYER_X - 10, PLAYER_X - 90][i % 3], y: PLAYER_Y - 6 - i * 4, duration: 360 });
      ready.push(ghost);
    }
    await s.camTo(W / 2, ARENA_CY - 10, 0.9, 500);
    ready.forEach((r) => s.tweens.add({ targets: r, alpha: 0, duration: 400, onComplete: () => r.destroy() }));
    // the one who leads steps forward; he can come now
    s.creature = this.b.creature;
    a.setChampion();
    a.playerLocked = false;
    s.hud.snapPlayer();
    s.setDarkness(0.2);
    k.core.setAlpha(1);
  }

  // ================================================================ endings

  async victory() {
    const s = this.s;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.playSong(null);
    await this.k.settle(300);
    if (this.kind === 'gr1') return this.buffUp();
    if (this.kind === 'gr2') return this.cantDie();
    if (this.kind === 'gr4') return this.theEnd();
    // (gr3 never ends by itself: at 20% it becomes the last fight)
  }

  /** gr1 beaten: he falls. Silence. And then he gets up. */
  private async buffUp() {
    const s = this.s;
    const k = this.k;
    s.flash(1, 500);
    await s.invert(150);
    k.dead = true;
    k.sway = 0;
    for (let i = 0; i < 4; i++) {
      await s.tw({ targets: k.off, x: i % 2 ? 5 : -5, duration: 70, yoyo: true });
    }
    sound.play('heavy');
    k.core.setFrame(5);
    s.shake(4, 400);
    burst(s, { x: k.body.x, y: GROUND }, 'fx_dotM', 8, 40, 500);
    await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.9, 900);
    // it goes very quiet
    await s.wait(2600);
    // (he is lying down: look at where he lies, not where his head used to be)
    await s.camFocus({ x: k.body.x - 10, y: GROUND - 34 }, 1.5, 1800);
    await s.wait(800);
    await this.shout('No...', 1, 1300);
    await s.wait(500);
    await this.shout('No...', 1.4, 1200, 1);
    await this.shout('NO.', 2.2, 1100, 3);
    k.core.setFrame(0);
    k.off.y = 0;
    await this.shout('NO!', 3.4, 1200, 8);
    // the growing
    sound.play('rumble');
    s.setDarkness(0.4);
    for (let i = 0; i < 3; i++) {
      k.core.setTexture('sp_grow', i);
      sound.play('grow');
      sound.play(i === 2 ? 'crash' : 'stone');
      s.shake(4 + i * 3, 600);
      s.flash(0.3 + i * 0.15, 200);
      burst(s, k.center(), 'fx_dotM', 10, 40 + i * 20, 500);
      await s.wait(700);
    }
    await s.invert(160);
    k.core.setTexture('sp_gr2', 1);
    sound.play('boom');
    sound.play('roar');
    s.flash(1, 600);
    s.shake(12, 1400);
    for (let r = 0; r < 4; r++) s.time.delayedCall(r * 180, () => ring(s, k.center(), 'fx_ring', 4.5, 800));
    await s.wait(1400);
    s.setDarkness(0.15);
    // and he flexes. there is a glint. there is, somehow, a glint.
    await s.camFocus(k.center(), 1.6, 500);
    sound.play('sparkle');
    const gl = s.w(s.add.image(k.local(-50, -k.core.height * 0.62).x, k.local(-50, -k.core.height * 0.62).y, 'fx_spark').setScale(2), 70);
    s.tweens.add({ targets: gl, angle: 180, alpha: 0, duration: 700, onComplete: () => gl.destroy() });
    await s.wait(800);
    sound.playSong('menace');
    await this.say('...Now.', REAPER, P_R);
    await this.say('NOW we can begin.', REAPER, P_R);
    k.core.setFrame(6);
    await s.wait(500);
    s.toWorld('victory');
  }

  /** gr2 beaten: he kneels. And he will not accept it. */
  private async cantDie() {
    const s = this.s;
    const k = this.k;
    s.flash(1, 500);
    await s.invert(150);
    k.dead = true;
    sound.play('heavy');
    k.core.setFrame(5);
    s.shake(7, 600);
    burst(s, { x: k.body.x, y: GROUND }, 'fx_dotM', 14, 60, 600);
    await s.camTo(W / 2 + 30, ARENA_CY - 10, 0.9, 900);
    await s.wait(2000);
    await s.camFocus({ x: k.body.x - 10, y: GROUND - 40 }, 1.5, 1200);
    sound.play('heartbeat');
    await this.say('I...', REAPER, P_R);
    await this.say('I CAN\'T...', REAPER, P_R);
    s.shake(2, 600);
    await this.say('I CAN\'T DIE.', REAPER, P_R);
    s.shake(4, 600);
    sound.play('rumble');
    await this.say('DO YOU UNDERSTAND?', REAPER, P_R + 30);
    s.setDarkness(0.4);
    s.shake(9, 1600);
    await s.invert(120);
    await this.shout('I AM IMMORTAL!', 3, 1600, 10);
    // the muscle tears away from him like smoke
    for (let i = 0; i < 26; i++) {
      const o = s.w(s.add.image(k.body.x + (Math.random() - 0.5) * 90, k.body.y - Math.random() * 130, 'fx_puff', i % 3).setTint(0x101010).setScale(0.6), 64);
      s.tweens.add({ targets: o, x: o.x + (Math.random() - 0.5) * 200, y: o.y - 60 - Math.random() * 90, scale: 2.6, alpha: 0, duration: 1300, delay: i * 30, onComplete: () => o.destroy() });
    }
    sound.play('wail');
    s.tweens.add({ targets: k.core, alpha: 0.2, duration: 1200 });
    s.setDarkness(1);
    await s.wait(1600);
    s.chainTo('gr3', this.s.partyIds ?? [], { ...this.cfg, sec: 0, seen: false }, 500);
    await new Promise<void>(() => {});
  }

  /** gr4 beaten: he falls apart, piece by piece, and is gone for good. */
  private async theEnd() {
    const s = this.s;
    const k = this.k;
    const a = s.arena;
    s.flash(1, 700);
    await s.invert(180);
    k.sway = 0;
    await s.camTo(k.center().x - 20, ARENA_CY - 10, 1.0, 700);
    // the legs collapse, one after another
    for (let i = 0; i < k.legs.length; i++) {
      const l = k.legs[i];
      void k.steerLeg(i, l.fx + (Math.random() - 0.5) * 30, GROUND - 2, 380, 'Quad.easeIn');
      await s.wait(260);
      sound.play(i % 2 ? 'stone' : 'crash');
      s.shake(3 + i * 0.6, 200);
      burst(s, { x: l.fx, y: GROUND }, 'fx_dotM', 4, 16, 300);
    }
    k.dead = true;
    await s.wait(500);
    // the wings come down
    k.holdWings(2);
    sound.play('whoosh');
    if (k.wings) {
      s.tweens.add({ targets: k.wings, y: k.wings.y + 50, alpha: 0, angle: 6, duration: 1600, ease: 'Quad.easeIn' });
    }
    await s.wait(1200);
    // the scythes drop
    k.core.setFrame(6);
    for (const dx of [-30, 26]) {
      const p0 = k.local(dx, -k.core.height * 0.55);
      const sc = s.w(s.add.image(p0.x, p0.y, 'fb_scythe').setAngle(dx < 0 ? -70 : 70), 55);
      s.tweens.add({ targets: sc, y: GROUND - 4, angle: dx < 0 ? -8 : 8, duration: 600, ease: 'Bounce.easeOut' });
      s.time.delayedCall(300, () => sound.play('clank'));
      await s.wait(500);
    }
    // the crown falls, rings on the stone, and rolls away
    const top = k.local(-4, -k.core.height * 0.92);
    const cr = s.w(s.add.image(top.x, top.y, 'fb_crown').setScale(1.3), 66);
    await s.camFocus({ x: top.x, y: top.y + 20 }, 2, 300);
    s.tweens.add({ targets: cr, angle: 200, duration: 900 });
    await s.tw({ targets: cr, y: GROUND - 6, duration: 900, ease: 'Bounce.easeOut' });
    sound.play('bell');
    await s.tw({ targets: cr, x: cr.x - 50, angle: 380, duration: 900, ease: 'Sine.easeOut' });
    sound.play('bell_dud');
    // afraid
    await s.camFocus(k.eye(), 2.2, 600);
    k.core.setFrame(5);
    sound.play('heartbeat');
    await this.say('N-no...', REAPER, P_R + 200);
    await this.say('No, no, no. Not like this. I am... I am the...', REAPER, P_R + 220);
    await this.say('...I am afraid.', REAPER, P_R + 260);
    // and he is gone: every soul he ever took goes up out of him
    k.core.setFrame(7);
    sound.play('wail');
    for (let i = 0; i < 40; i++) {
      const o = s.w(s.add.image(k.body.x + (Math.random() - 0.5) * 70, k.body.y - Math.random() * 120, 'fx_soul').setAlpha(0.9), 64);
      s.tweens.add({ targets: o, y: -40, x: o.x + (Math.random() - 0.5) * 120, alpha: 0, duration: 2400 + Math.random() * 1200, delay: i * 60, onComplete: () => o.destroy() });
    }
    await s.camTo(k.center().x, ARENA_CY - 40, 1.1, 1800);
    await s.tw({ targets: k.core, alpha: 0, duration: 2600 });
    k.shadow?.setVisible(false);
    k.legN = 0;
    s.setDarkness(0);
    sound.play('chime');
    // silence: the camera stays on the empty space where he was
    await s.camFocus(k.center(), 1.3, 1500);
    await s.wait(3500);
    a.player.play(s.idleAnim);
    s.toWorld('victory');
  }

  /** The team falls. He looks down at you. */
  async defeat() {
    const s = this.s;
    const k = this.k;
    sound.playSong(null);
    await s.camFocus(k.eye(), 1.8, 900);
    k.core.setFrame(this.kind === 'gr2' ? 1 : this.kind === 'gr1' ? 6 : 3);
    sound.play(this.kind === 'gr2' ? 'roar' : 'wail');
    s.shake(4, 700);
    await s.wait(1100);
  }
}

