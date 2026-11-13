import Phaser from 'phaser';
import { Battle, freshPlayer, type PartyMember } from '../../engine/battle';
import type { ActionResult, CreatureDef } from '../../engine/types';
import type { BattleScene } from '../../scenes/BattleScene';
import { SWAP } from '../../scenes/BattleScene';
import { PLAYER_X, PLAYER_Y } from '../../scenes/battle/Arena';
import { ROGUE_ARENA, ROGUE_BODIES } from '../../scenes/battle/TitanRig';
import { ROGUE_FOE_IDS, bossAnim7 } from '../../scenes/battle/anims7';
import { bossAnim, playerAnim } from '../../scenes/battle/anims';
import { SPIRIT_SONG } from '../../scenes/battle/titanScenes4';
import { txt, box, bar, C } from '../../ui/ui';
import { W, TOP_H, BOTTOM_Y, ARENA_CY } from '../../constants';
import { sound } from '../../audio/audio';
import { net, type BattleFeed } from '../net/client';
import { FOES, foeDef } from '../shared/enemies';
import { hookFor, passives } from '../shared/skills';
import { spiritDef } from '../shared/roster';
import { SWAP as COOP_SWAP, type BattleSnap, type CoopChoice, type EnemySnap, type Step } from '../shared/coop';
import { SCENE_FOR } from '../scenes/common';

// ROGUELIKE: a co-op fight, shown through the story's own battle screen.
//
// The host decides everything. This keeps a copy of the engine for each enemy, filled in
// from what the host sends (so the menu, the intent and every "what would this do" answer
// work exactly as they do in the story), and plays the host's steps back in order: your
// own moves and the blows aimed at you in full, your friends' in brief.

// the dungeon's enemies stand in the arena the way the island's spirits do
for (const id of Object.keys(FOES)) {
  ROGUE_FOE_IDS.add(id);
  ROGUE_BODIES.add(id);
}
const SONGS: Record<string, string> = { glassregent: 'w4_subject', mirrorcopy: 'w4_subject', mirematriarch: 'w4_wisp', rootgrowth: 'w4_wisp', palehuntsman: 'w4_viper', cindermatron: 'w4_champ', gaoler: 'w5_warden', broodmire: 'w4_squirrel' };
const ROOM_SONG = ['fisher', 'w4_crow', 'w5_super'];
for (const id of Object.keys(FOES)) SPIRIT_SONG[id] = Array(3).fill(SONGS[id] ?? 'fisher');
const ARENAS: { bg: string; floor: string }[] = [
  { bg: 'w5b_guard', floor: 'w5f_stone' },
  { bg: 'w4b_clearing', floor: 'w4f_grass' },
  { bg: 'fb_hall', floor: 'w5f_stone' },
];
const BOSS_ARENA: Record<string, { bg: string; floor: string }> = { glassregent: { bg: 'w4b_lab', floor: 'w4f_lab' }, mirematriarch: { bg: 'w4b_clearing', floor: 'w4f_grass' }, palehuntsman: { bg: 'w4b_tree', floor: 'w4f_bark' } };

/** Where the enemies who are not in the spotlight stand: [x, y offset, scale]. */
const SLOTS: [number, number, number][] = [[366, -6, 0.85], [246, 2, 0.85], [392, 8, 0.72], [222, -8, 0.72]];
const SLOTS_BIG: [number, number, number][] = [[384, 2, 0.8], [232, 6, 0.8], [394, -40, 0.65], [226, -44, 0.65]];

export class RogueBattleView {
  private s!: BattleScene;
  private feed: BattleFeed;
  private seat: number;
  private party: PartyMember[] = [];
  private reps = new Map<number, Battle>();
  private snap: BattleSnap;
  /** The enemy in the spotlight (the one the top bar and the menu are about). */
  focus = -1;
  private cursor = 0;
  private acted = -1;
  private ended: 'victory' | 'defeat' | null = null;
  private leaving = false;
  private down = false;
  private extras = new Map<number, Phaser.GameObjects.Sprite>();
  private g: Phaser.GameObjects.Graphics | null = null;
  private marks: Phaser.GameObjects.Image[] = [];
  private strip: Phaser.GameObjects.Container | null = null;
  private waitC: Phaser.GameObjects.Container | null = null;
  private bannerC: Phaser.GameObjects.Container | null = null;
  private offNet: (() => void) | null = null;
  private wake: (() => void) | null = null;
  /** One enemy for the whole fight, with its own entrance and exit (a boss). */
  private solo: boolean;

  constructor() {
    this.feed = net.feed!;
    this.seat = net.seat;
    this.snap = this.feed.base;
    this.cursor = 0;
    this.solo = net.state?.battle?.kind === 'boss';
  }

  /** A short entrance for ordinary rooms; bosses keep their full one. */
  get quickIntro() {
    return !this.solo;
  }

  // ------------------------------------------------------------------ the engine copies

  private me() {
    return this.snap.sides.find((s) => s.seat === this.seat)!;
  }
  private living(): EnemySnap[] {
    return this.snap.enemies.filter((e) => !e.dead);
  }
  private focusEnemy(): EnemySnap | undefined {
    return this.snap.enemies.find((e) => e.uid === this.focus);
  }

  /** Called by the battle scene as it starts: who you are fighting with, and what. */
  setup(): { creature: CreatureDef; battle: Battle; enemyId: string } {
    const st = net.state!;
    const mine = st.players.find((p) => p.seat === this.seat)!;
    const side = this.me();
    this.party = side.members.map((m, i) => {
      const base = spiritDef(m.id);
      const pas = passives(mine.spirits[i]?.skills ?? []);
      const creature: CreatureDef = { ...base, hp: m.maxHp, regen: base.regen + pas.regenEn };
      return { creature, p: freshPlayer(creature) };
    });
    this.focus = this.living()[0]?.uid ?? this.snap.enemies[0].uid;
    const floor = st.floor?.index ?? 0;
    const lead = this.focusEnemy()!;
    Object.assign(ROGUE_ARENA, BOSS_ARENA[lead.id] ?? ARENAS[floor]);
    this.apply(this.snap);
    return { creature: this.party[side.active].creature, battle: this.reps.get(this.focus)!, enemyId: lead.id };
  }

  private rep(e: EnemySnap): Battle {
    let b = this.reps.get(e.uid);
    if (!b) {
      const side = this.me();
      b = new Battle(this.party[side.active].creature, Math.random, foeDef(e.id));
      this.reps.set(e.uid, b);
    }
    return b;
  }

  /** Copy the host's numbers into the engine copies. */
  private apply(snap: BattleSnap) {
    this.snap = snap;
    const side = this.me();
    const mine = net.state?.players.find((p) => p.seat === this.seat);
    side.members.forEach((m, i) => {
      const p = this.party[i]?.p;
      if (!p) return;
      p.hp = m.hp;
      p.maxHp = m.maxHp;
      p.en = m.en;
      p.maxEn = m.maxEn;
      p.statuses = m.statuses;
      p.cd = m.cd;
    });
    this.down = side.down;
    for (const e of snap.enemies) {
      const b = this.rep(e) as any;
      b.party = this.party;
      b.active = side.active;
      b.creature = this.party[side.active].creature;
      b.p = this.party[side.active].p;
      b.skillHook = hookFor(mine?.spirits[side.active]?.skills ?? []);
      b.tune = e.tune;
      b.b.hp = e.hp;
      b.b.maxHp = e.maxHp;
      b.b.phase = e.phase;
      b.b.turnsInPhase = e.turnsInPhase;
      b.b.statuses = e.statuses;
      b.intent = e.intent;
      b.turn = snap.round;
      b._over = null;
    }
    if (this.s) {
      const cur = this.reps.get(this.focus);
      if (cur) this.s.battle = cur;
    }
  }

  // ------------------------------------------------------------------ the scene's hooks

  /** Called once the arena and the HUD exist. */
  attach(s: BattleScene) {
    this.s = s;
    this.g = s.w(s.add.graphics(), 66);
    this.strip = s.uiObj(s.add.container(0, 0).setDepth(110));
    this.waitC = s.uiObj(s.add.container(0, 0).setDepth(111));
    this.bannerC = s.uiObj(s.add.container(0, 0).setDepth(112));
    this.offNet = net.on((ev) => {
      if (ev.t === 'state') {
        this.drawStrip();
        this.drawWait();
        this.maybeLeave();
      }
      if (ev.t === 'steps' || ev.t === 'state') {
        const w = this.wake;
        this.wake = null;
        w?.();
      }
      if (ev.t === 'note') this.banner(ev.text, 1600);
    });
    this.sizeRig();
    this.buildExtras();
    this.drawStrip();
  }

  destroy() {
    this.offNet?.();
    this.offNet = null;
    this.wake = null;
  }

  /** A quick entrance for a room full of ordinary enemies. */
  async intro(s: BattleScene) {
    const k = s.arena.ti!;
    s.hud.setIntentVisible(false);
    s.hud.hideMenu();
    sound.setAmbience('cave');
    const floor = net.state?.floor?.index ?? 0;
    sound.playSong(net.state?.battle?.kind === 'elite' ? SONGS[this.focusEnemy()?.id ?? ''] ?? 'w4_champ' : ROOM_SONG[floor]);
    s.cameras.main.fadeIn(350, 0, 0, 0);
    s.uiCam.fadeIn(350, 0, 0, 0);
    s.cs = { x: W / 2 + 30, y: ARENA_CY - 10, zoom: 0.9, rot: 0 };
    k.off.x = 60;
    for (const sp of this.extras.values()) sp.setAlpha(0);
    await s.tw({ targets: k.off, x: 0, duration: 320, ease: 'Back.easeOut' });
    sound.play('roar_small');
    k.core.setFrame(1);
    let i = 0;
    for (const sp of this.extras.values()) s.tweens.add({ targets: sp, alpha: 1, duration: 200, delay: 80 * i++ });
    await s.wait(380);
    k.core.setFrame(0);
    await s.camHome(400);
  }

  update() {
    this.drawExtras();
  }

  // ------------------------------------------------------------------ the fight

  async loop(s: BattleScene) {
    s.hud.sync();
    for (;;) {
      while (this.cursor < this.feed.steps.length) {
        const step = this.feed.steps[this.cursor++];
        await this.play(step);
        if (this.leaving) return;
      }
      if (this.ended) break;
      const b = net.state?.battle;
      if (!b || b.id !== this.feed.id) {
        // the host has moved on (a rejoin after the fight ended)
        this.ended = this.snap.over ?? 'victory';
        break;
      }
      if (!this.down && this.acted !== this.snap.round && !b.chosen.includes(this.seat) && this.cursor >= this.feed.steps.length) {
        this.acted = this.snap.round;
        const c = await this.choose();
        net.send({ t: 'act', choice: c });
        s.hud.hideMenu();
        this.drawWait();
        continue;
      }
      this.drawWait();
      await new Promise<void>((r) => (this.wake = r));
    }
    this.clearWait();
    if (this.solo) {
      // (the scene's own ending calls finished() when its curtain falls)
      if (this.ended === 'victory') await s.victory();
      else await s.defeat();
      // (some endings hand over without a curtain of their own)
      this.finished();
    } else {
      s.hud.setIntentVisible(false);
      s.hud.hideMenu();
      if (this.ended === 'victory') {
        sound.playSong(null);
        sound.play('victory');
        this.banner('THE ROOM IS CLEAR', 1400);
        s.tweens.add({ targets: s.arena.playerOffset, y: -8, duration: 260, yoyo: true, repeat: 1 });
        await s.wait(1300);
      } else {
        sound.playSong(null);
        sound.play('defeat');
        this.banner('YOUR PARTY HAS FALLEN', 1800);
        await s.wait(1700);
      }
      this.finished();
    }
  }

  /** The fight is over on this screen: go wherever the run has gone. */
  finished() {
    this.ended = this.ended ?? 'victory';
    this.maybeLeave(true);
  }
  private done = false;
  private maybeLeave(force = false) {
    if (force) this.done = true;
    if (!this.done || this.leaving) return;
    const st = net.state;
    const s = this.s;
    const go = (key: string, data: object = {}) => {
      this.leaving = true;
      sound.stopMusic();
      s.cameras.main.fadeOut(300, 0, 0, 0);
      s.uiCam.fadeOut(300, 0, 0, 0);
      s.uiCam.once('camerafadeoutcomplete', () => s.leaveTo(key, data));
    };
    if (!st) return go('rogue-lobby');
    if (st.phase === 'battle') {
      // the Grim Reaper's next form: straight into the next fight
      if (st.battle && st.battle.id !== this.feed.id && net.feed && net.feed.id === st.battle.id) go('battle', { rogue: new RogueBattleView() });
      return;
    }
    go(SCENE_FOR[st.phase]);
  }

  // ------------------------------------------------------------------ choosing

  private async choose(): Promise<CoopChoice> {
    const s = this.s;
    for (;;) {
      const b = s.battle;
      await s.telegraph();
      // held by roots: there is nothing to choose
      if (b.has('player', 'ROOTED')) {
        s.hud.caption('s_root', 'ROOTED', false);
        await s.wait(500);
        return { a: 0, target: this.focus };
      }
      const i = await s.waitChoice();
      // (the battle screen calls switching 4; the host's rules call it COOP_SWAP)
      if (i === SWAP) return { a: COOP_SWAP, target: this.focus, pick: b.pick ?? undefined };
      const ab = b.ability(i);
      const live = this.living();
      if (live.length > 1 && ab.kind !== 'defense') {
        const t = await this.pickTarget();
        if (t === null) continue;
        return { a: i, target: t };
      }
      return { a: i, target: this.focus };
    }
  }

  /** Several enemies: which one? The spotlight follows the cursor so the top bar shows who you are looking at. */
  private pickTarget(): Promise<number | null> {
    const s = this.s;
    const live = this.living();
    let sel = Math.max(0, live.findIndex((e) => e.uid === this.focus));
    const RW = 236;
    const RH = 22;
    const x0 = Math.round((W - RW) / 2);
    const y0 = Math.round(ARENA_CY - ((live.length + 2) * RH) / 2);
    const c = s.uiObj(s.add.container(0, 0).setDepth(140));
    const zones: Phaser.GameObjects.Zone[] = [];
    const draw = () => {
      c.removeAll(true);
      const g = s.add.graphics();
      c.add(g);
      box(g, x0 - 6, y0 - 16, RW + 12, live.length * RH + 54, 'dark');
      c.add(txt(s, W / 2, y0 - 11, 'CHOOSE A TARGET', { color: C.mid, origin: [0.5, 0] }));
      live.forEach((e, k) => {
        const y = y0 + k * RH;
        const on = k === sel;
        box(g, x0, y, RW, RH - 2, on ? 'light' : 'plain');
        c.add(txt(s, x0 + 6, y + 3, e.name.slice(0, 20), { color: on ? C.black : C.white }));
        bar(g, x0 + 132, y + 5, 60, 4, e.hp / e.maxHp, e.hp / e.maxHp, 0, on ? C.black : C.white);
        const it = e.intent;
        c.add(txt(s, x0 + 6, y + 11, it.hidden ? '???' : `NEXT: ${it.name}${it.stage === 'charge' ? ' (CHARGING)' : ''}`.slice(0, 36), { color: on ? C.dark : C.mid }));
        if (it.major && !it.hidden) c.add(txt(s, x0 + RW - 8, y + 3, '!', { color: on ? C.black : C.white, origin: [1, 0] }));
      });
      const role = FOES[live[sel].id]?.role ?? '';
      c.add(txt(s, W / 2, y0 + live.length * RH + 3, role, { color: C.light, origin: [0.5, 0], maxW: RW }));
      c.add(txt(s, W / 2, y0 + live.length * RH + 26, 'ENTER: STRIKE   ESC: BACK', { color: C.dark, origin: [0.5, 0] }));
    };
    return new Promise((res) => {
      const finish = (v: number | null) => {
        s.pickerKey = null;
        for (const z of zones) z.destroy();
        c.destroy();
        res(v);
      };
      const move = (d: number) => {
        sel = (sel + d + live.length) % live.length;
        sound.play('move');
        this.refocus(live[sel].uid, true);
        draw();
      };
      live.forEach((e, k) => {
        const z = s.uiObj(s.add.zone(x0, y0 + k * RH, RW, RH - 2).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(141));
        z.on('pointerdown', (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev?.stopPropagation?.();
          if (sel !== k) {
            sel = k;
            this.refocus(e.uid, true);
            return draw();
          }
          sound.play('select');
          finish(e.uid);
        });
        zones.push(z);
      });
      s.pickerKey = (k) => {
        if (['ArrowUp', 'w', 'ArrowLeft', 'a'].includes(k)) move(-1);
        else if (['ArrowDown', 's', 'ArrowRight', 'd'].includes(k)) move(1);
        else if (['Enter', 'z', 'Z', ' ', 'x', 'X'].includes(k)) {
          sound.play('select');
          finish(live[sel].uid);
        } else if (k === 'Escape' || k === 'Backspace') {
          sound.play('back');
          finish(null);
        }
      };
      draw();
    });
  }

  // ------------------------------------------------------------------ the spotlight and the rest of the room

  /** Put another enemy in the spotlight: the big body, the top bar and the menu all follow. */
  private refocus(uid: number, quick = false) {
    if (uid === this.focus) return;
    const e = this.snap.enemies.find((x) => x.uid === uid);
    const s = this.s;
    const k = s.arena.ti;
    if (!e || !k || !ROGUE_FOE_IDS.has(e.id)) return;
    this.focus = uid;
    s.battle = this.reps.get(uid)!;
    s.enemyId = e.id as never;
    k.retarget(e.id as never);
    k.core.setAlpha(e.dead ? 0 : 1);
    this.sizeRig();
    s.hud.setEnemy(e.name, s.battle.enemy.subtitle);
    s.hud.snapBoss();
    s.hud.sync();
    s.hud.drawIntent();
    s.syncStatusFx();
    this.buildExtras();
    if (!quick) s.flash(0.12, 120);
  }

  /** Small enemies are drawn up a little in the spotlight, so they hold the stage a boss would. */
  private sizeRig() {
    const k = this.s.arena.ti;
    if (!k || !ROGUE_FOE_IDS.has(k.kind)) return;
    const size = FOES[k.kind]?.size;
    k.off.scale = size === 's' ? 1.5 : size === 'm' ? 1.2 : 1;
  }

  private buildExtras() {
    const s = this.s;
    for (const sp of this.extras.values()) sp.destroy();
    this.extras.clear();
    const others = this.living().filter((e) => e.uid !== this.focus && ROGUE_FOE_IDS.has(e.id));
    const big = (s.arena.ti?.core.height ?? 0) > 90;
    others.forEach((e, i) => {
      const [x, dy, sc] = (big ? SLOTS_BIG : SLOTS)[i % 4];
      const sp = s.w(s.add.sprite(x, PLAYER_Y + 10 + dy, 'sp_' + e.id, 0).setOrigin(0.5, 1).setScale(sc), dy < 0 ? 27 : 33);
      sp.setInteractive({ useHandCursor: true });
      sp.on('pointerdown', () => s.awaitingChoice && this.refocus(e.uid));
      // a slow sway, each to its own beat, so the room is never still
      s.tweens.add({ targets: sp, scaleY: sc * 1.03, duration: 900 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.extras.set(e.uid, sp);
    });
  }

  /** Health, and what each of them is about to do, above the enemies outside the spotlight. */
  private drawExtras() {
    const g = this.g;
    if (!g || !this.s) return;
    g.clear();
    for (const m of this.marks) m.destroy();
    this.marks = [];
    for (const [uid, sp] of this.extras) {
      const e = this.snap.enemies.find((x) => x.uid === uid);
      if (!e || e.dead || !sp.active) continue;
      const top = sp.y - sp.displayHeight - 6;
      const w = 28;
      const x = Math.round(sp.x - w / 2);
      g.fillStyle(C.white, 1).fillRect(x - 1, top - 1, w + 2, 5);
      g.fillStyle(C.black, 1).fillRect(x, top, w, 3);
      g.fillStyle(C.white, 1).fillRect(x, top, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 3);
      if (e.intent.major || e.intent.stage !== 'normal') {
        g.fillStyle(C.white, 1).fillRect(x + w + 3, top - 2, 2, 5);
        g.fillRect(x + w + 3, top + 4, 2, 2);
      }
    }
  }

  // ------------------------------------------------------------------ the party strip, the banner, the waiting line

  private drawStrip() {
    const c = this.strip;
    const st = net.state;
    if (!c || !st || !this.s) return;
    c.removeAll(true);
    if (st.players.length < 2) return;
    const g = this.s.add.graphics();
    c.add(g);
    const chosen = st.battle?.chosen ?? [];
    this.snap.sides.forEach((side, i) => {
      const p = st.players.find((x) => x.seat === side.seat);
      const m = side.members[side.active];
      if (!p || !m) return;
      // (top right: the intent of the enemy in the spotlight has the top left)
      const x0 = W - 126;
      const y = TOP_H + 3 + i * 12;
      g.fillStyle(C.black, 0.6).fillRect(x0, y - 1, 124, 11);
      const me = side.seat === this.seat;
      c.add(txt(this.s, x0 + 3, y + 1, p.name.slice(0, 7), { color: side.down ? C.dark : me ? C.white : C.light }));
      if (side.down) c.add(txt(this.s, x0 + 50, y + 1, 'DOWN', { color: C.dark }));
      else bar(g, x0 + 50, y + 3, 44, 3, m.hp / m.maxHp, m.hp / m.maxHp, 0);
      // a tick once their move is in; dots while they think
      const word = side.down ? '' : !p.connected ? 'AWAY' : chosen.includes(side.seat) ? 'OK' : '..';
      c.add(txt(this.s, x0 + 121, y + 1, word, { color: word === 'OK' ? C.white : C.mid, origin: [1, 0] }));
    });
  }

  private clearWait() {
    this.waitC?.removeAll(true);
  }

  private drawWait() {
    const c = this.waitC;
    const st = net.state;
    if (!c || !this.s || !st?.battle) return;
    c.removeAll(true);
    const b = st.battle;
    if (this.ended || b.id !== this.feed.id) return;
    const mine = b.chosen.includes(this.seat) || this.down;
    const waiting = this.snap.sides.filter((s) => !s.down && !b.chosen.includes(s.seat)).map((s) => st.players.find((p) => p.seat === s.seat)?.name ?? '?');
    if (mine && waiting.length && !this.s.awaitingChoice && this.cursor >= this.feed.steps.length) {
      const t = txt(this.s, W / 2, BOTTOM_Y + 34, this.down ? 'YOUR SPIRITS ARE DOWN. YOUR FRIENDS FIGHT ON.' : `WAITING FOR ${waiting.join(', ')}`, { color: C.light, origin: [0.5, 0], maxW: W - 20, align: 'center' });
      c.add(t);
      this.s.tweens.add({ targets: t, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    }
    if (b.clock > 0 && b.clock <= 15 && !mine) c.add(txt(this.s, W - 6, BOTTOM_Y - 12, String(b.clock), { outline: true, origin: [1, 0] }));
  }

  /** A line of text under the top bar: what a friend did, what a foe did to them. */
  private banner(text: string, ms = 1100) {
    const c = this.bannerC;
    if (!c || !this.s || !text) return;
    c.removeAll(true);
    // (low in the arena: the top corners belong to the intent and the party)
    const t = txt(this.s, W / 2, 0, text, { origin: [0.5, 0], maxW: W - 60, align: 'center' });
    const y = BOTTOM_Y - 24 - t.height;
    t.setY(y);
    const g = this.s.add.graphics();
    const w = t.width + 14;
    g.fillStyle(C.black, 0.8).fillRect(W / 2 - w / 2, y - 3, w, t.height + 6);
    c.add([g, t]);
    c.setAlpha(1);
    this.s.tweens.killTweensOf(c);
    this.s.tweens.add({ targets: c, alpha: 0, delay: ms, duration: 250 });
  }

  // ------------------------------------------------------------------ playing the host's steps back

  private name(seat: number) {
    return net.state?.players.find((p) => p.seat === seat)?.name ?? 'SOMEONE';
  }
  private spiritOf(snap: BattleSnap, seat: number) {
    const side = snap.sides.find((x) => x.seat === seat);
    return side ? spiritDef(side.members[side.active].id) : null;
  }

  private async play(step: Step) {
    const s = this.s;
    const before = this.snap;
    const mine = 'seat' in step && step.seat === this.seat;
    switch (step.t) {
      case 'begin': {
        this.apply(step.snap);
        if (mine) await s.playEvents(step.events);
        break;
      }
      case 'swapin': {
        this.apply(step.snap);
        if (!mine) {
          this.banner(`${this.name(step.seat)}: ${this.spiritOf(step.snap, step.seat)?.name ?? ''} STEPS IN`);
          await s.wait(500);
          break;
        }
        // the one on the field fell: the next of yours takes its place
        const pl = s.arena.player;
        sound.play('defeat');
        pl.stop().setFrame(5);
        await s.tw({ targets: pl, angle: -70, alpha: 0.3, duration: 500, ease: 'Quad.easeIn' });
        pl.setAngle(0);
        s.creature = this.party[this.me().active].creature;
        await s.enterAnim();
        s.syncStatusFx();
        break;
      }
      case 'act': {
        const e = before.enemies.find((x) => x.uid === step.uid);
        if (mine) {
          if (e && !e.dead) this.refocus(step.uid);
          this.apply(step.snap);
          await this.myAct(step.res, step);
        } else {
          this.apply(step.snap);
          await this.allyAct(before, step.seat, step.res, step.uid, step.splash);
        }
        break;
      }
      case 'foe': {
        if (mine) {
          this.refocus(step.uid);
          this.apply(step.snap);
          const b = s.battle;
          for (const r of step.results) {
            if (r.stage !== 'frozen' && b.atk[r.id]) s.hud.caption(b.atk[r.id].icon, r.name, true);
            if (!(await bossAnim7(s, r))) await bossAnim(s, r);
            await s.playEvents(r.post);
            s.hud.hideCaption();
            s.hud.sync(true);
          }
          await s.camHome(300);
        } else {
          this.apply(step.snap);
          const e = before.enemies.find((x) => x.uid === step.uid);
          const total = step.results.reduce((n, r) => n + r.hits.reduce((m, h) => m + h.amount, 0), 0);
          const what = step.results.map((r) => r.name).join(' + ');
          const who = this.spiritOf(step.snap, step.seat)?.name ?? this.name(step.seat);
          const charge = step.results.some((r) => r.stage === 'charge');
          this.banner(charge ? `${e?.name ?? 'THE FOE'} GATHERS ITSELF: ${what}` : total > 0 ? `${e?.name ?? 'THE FOE'}: ${what} ON ${who} (-${total})` : `${e?.name ?? 'THE FOE'}: ${what}`);
          // the foe turns on your friend: a lunge the other way, off your side of the screen
          if (step.uid === this.focus && s.arena.ti && ROGUE_FOE_IDS.has(s.arena.ti.kind) && total > 0) {
            const k = s.arena.ti;
            k.core.setFrame(2);
            sound.play('hit');
            await s.tw({ targets: k.off, x: -26, y: -8, duration: 120, yoyo: true });
            k.core.setFrame(0);
          } else if (total > 0) sound.play('hit');
          await s.wait(charge ? 700 : 520);
        }
        if (step.links.length) {
          const me = step.links.find((l) => l.seat === this.seat);
          if (me) {
            s.hitPlayer({ amount: me.amount, absorbed: 0, crit: false, miss: false, graze: false });
            s.tag(s.arena.playerCenter().x, s.arena.playerCenter().y - 30, 's_reprisal', 'LINKED', C.light);
            await s.wait(350);
          }
        }
        break;
      }
      case 'round': {
        this.apply(step.snap);
        if (step.uid === this.focus) await s.playEvents(step.events);
        break;
      }
      case 'phase': {
        const e = before.enemies.find((x) => x.uid === step.uid);
        this.refocus(step.uid);
        this.apply(step.snap);
        // (bosses change in front of everyone; the scene's own staging does the rest)
        if (e) await s.phaseTransition(step.phase);
        this.sizeRig();
        break;
      }
      case 'kill': {
        this.apply(step.snap);
        const sp = this.extras.get(step.uid);
        const lastOne = !this.living().length;
        if (sp) {
          sound.play('poof');
          s.boom(sp.x, sp.y - sp.displayHeight / 2, 0.8);
          this.extras.delete(step.uid);
          s.tweens.add({ targets: sp, alpha: 0, scaleX: 0.2, duration: 260, onComplete: () => sp.destroy() });
          await s.wait(260);
        } else if (step.uid === this.focus && !(this.solo && lastOne)) {
          const k = s.arena.ti;
          if (k && ROGUE_FOE_IDS.has(k.kind)) {
            sound.play('poof');
            k.core.setFrame(3);
            s.boom(k.center().x, k.center().y, 1);
            await s.tw({ targets: k.core, alpha: 0, duration: 320 });
          }
          const next = this.living()[0];
          if (next) {
            this.refocus(next.uid, true);
            const k2 = s.arena.ti;
            if (k2) {
              k2.core.setAlpha(0);
              await s.tw({ targets: k2.core, alpha: 1, duration: 220 });
            }
          }
        }
        break;
      }
      case 'spawn': {
        this.apply(step.snap);
        this.banner(step.text, 1300);
        this.ensureFocus();
        this.buildExtras();
        for (const uid of step.uids) {
          const sp = this.extras.get(uid);
          if (!sp) continue;
          sp.setAlpha(0);
          sound.play('ghost');
          s.tweens.add({ targets: sp, alpha: 1, duration: 300 });
        }
        await s.wait(650);
        break;
      }
      case 'note': {
        this.apply(step.snap);
        this.banner(step.text, 1700);
        if (step.text.includes('SUPERCHARGE')) {
          // the last stretch against the Reaper: every spirit left standing, pushed past its limits
          sound.play('charge');
          s.flash(0.9, 500);
          s.shake(6, 900);
          for (let i = 0; i < 4; i++) {
            const r = s.w(s.add.image(PLAYER_X, PLAYER_Y - 20, 'fx_ring').setScale(0.3), 62);
            s.tweens.add({ targets: r, scale: 3 + i, alpha: 0, duration: 700, delay: i * 140, onComplete: () => r.destroy() });
          }
          s.hud.snapPlayer();
          await s.wait(1200);
        } else await s.wait(600);
        break;
      }
      case 'down': {
        this.apply(step.snap);
        if (mine) {
          const pl = s.arena.player;
          sound.play('defeat');
          pl.stop().setFrame(5);
          await s.tw({ targets: pl, angle: -70, alpha: 0.25, duration: 600, ease: 'Quad.easeIn' });
          this.banner('YOUR SPIRITS ARE DOWN', 1800);
        } else this.banner(`${this.name(step.seat)} IS DOWN!`, 1500);
        await s.wait(500);
        break;
      }
      case 'end': {
        this.apply(step.snap);
        this.ended = step.result;
        break;
      }
    }
    if (this.leaving) return;
    this.ensureFocus();
    // the one on the field is always the one the host says is out
    const out = this.party[this.me().active]?.creature;
    if (out && s.creature !== out && !this.down) {
      s.creature = out;
      s.arena.setChampion();
      s.hud.snapPlayer();
    }
    s.hud.sync();
    s.syncStatusFx();
    this.drawStrip();
  }

  /** The spotlight never stays on something that has fallen while anything else stands. */
  private ensureFocus() {
    const cur = this.focusEnemy();
    if (cur && !cur.dead) return;
    const next = this.living().find((e) => ROGUE_FOE_IDS.has(e.id));
    if (next) this.refocus(next.uid, true);
  }

  /** Your own move: the full sequence, as in the story. */
  private async myAct(res: ActionResult, step: Extract<Step, { t: 'act' }>) {
    const s = this.s;
    const b = s.battle;
    s.hud.setIntentVisible(false);
    if (res.id === 'swap') {
      s.hud.caption('s_delay', 'SWITCH', false);
      await s.swapAnim();
    } else if (res.id === 'rooted') {
      s.hud.caption('s_root', 'ROOTED', false);
      await s.rootedAnim();
    } else if (res.id !== 'wait') {
      const ab = b.creature.abilities.find((a) => a.id === res.id);
      if (ab) s.hud.caption(ab.icon, ab.name, false);
      await playerAnim(s, res);
    }
    await s.playEvents(res.post);
    // what the blow did to the rest of the room
    for (const sp of step.splash) {
      const o = this.extras.get(sp.uid);
      if (o && sp.amount > 0) {
        s.num(o.x, o.y - o.displayHeight - 8, `-${sp.amount}`);
        o.setTintFill(0xffffff);
        s.time.delayedCall(90, () => o.active && o.clearTint());
      }
    }
    if (step.splash.length) {
      sound.play('hit');
      await s.wait(260);
    }
    if (step.recoil > 0) {
      s.tag(s.arena.playerCenter().x, s.arena.playerCenter().y - 34, 's_fort', 'REFLECTED', C.light);
      s.hitPlayer({ amount: step.recoil, absorbed: 0, crit: false, miss: false, graze: false });
      await s.wait(350);
    }
    s.hud.hideCaption();
    await s.camHome(300);
  }

  /** A friend's move, in brief: their spirit darts in, the numbers land, the fight goes on. */
  private async allyAct(before: BattleSnap, seat: number, res: ActionResult, uid: number, splash: { uid: number; amount: number }[]) {
    const s = this.s;
    const def = this.spiritOf(before, seat);
    const total = res.hits.reduce((n, h) => n + h.amount, 0);
    const e = before.enemies.find((x) => x.uid === uid);
    this.banner(res.id === 'swap' ? `${this.name(seat)} SWITCHES SPIRITS` : `${this.name(seat)}: ${def?.name ?? ''} USES ${res.name}`);
    if (!def || res.id === 'swap' || res.id === 'wait') return void (await s.wait(450));
    const target = uid === this.focus ? s.arena.hullPoint() : (() => {
      const o = this.extras.get(uid);
      return o ? { x: o.x, y: o.y - o.displayHeight / 2 } : s.arena.hullPoint();
    })();
    const key = this.s.textures.exists('cr_' + def.id) ? 'cr_' + def.id : 'cr_booheet';
    const sp = s.w(s.add.sprite(PLAYER_X - 46, PLAYER_Y - 26, key, 4).setOrigin(0.5, 1).setScale(0.75).setAlpha(0), 49);
    await s.tw({ targets: sp, alpha: 1, x: PLAYER_X - 28, duration: 120 });
    if (res.hits.length && e) {
      sound.play('swish');
      await s.tw({ targets: sp, x: PLAYER_X + 30, duration: 110, yoyo: true });
      for (const h of res.hits) {
        if (uid === this.focus) s.hitBoss(h, target);
        else {
          s.num(target.x, target.y - 10, `-${h.amount}`);
          sound.play('hit');
        }
        await s.wait(res.hits.length > 3 ? 55 : 90);
      }
    } else {
      sound.play('buff');
      const r = s.w(s.add.image(sp.x, sp.y - 16, 'fx_ring').setScale(0.3), 62);
      s.tweens.add({ targets: r, scale: 1.6, alpha: 0, duration: 380, onComplete: () => r.destroy() });
      await s.wait(260);
    }
    for (const x of splash) {
      const o = this.extras.get(x.uid);
      if (o && x.amount > 0) s.num(o.x, o.y - o.displayHeight - 8, `-${x.amount}`);
      else if (x.uid === this.focus && x.amount > 0) s.hitBoss({ amount: x.amount, absorbed: 0, crit: false, miss: false, graze: false });
    }
    void total;
    s.tweens.add({ targets: sp, alpha: 0, x: sp.x - 20, duration: 160, onComplete: () => sp.destroy() });
    await s.wait(240);
  }
}
