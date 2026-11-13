import Phaser from 'phaser';
import { Battle, STATUS_INFO } from '../engine/battle';
import type { RogueBattleView } from '../rogue/battle/view';
import { getCreature, CREATURES } from '../engine/creatures';
import { PHASE_NAMES, DUTCHMAN } from '../engine/boss';
import { FISHERMAN } from '../engine/fisherman';
import { SALESMAN } from '../engine/salesman';
import { KRAKEN } from '../engine/kraken';
import { TITANS, isTitan, type TitanId } from '../engine/titans';
import { isSpirit } from '../engine/spirits';
import { PRISON_FOES } from '../engine/prison';
import { TitanScenes } from './battle/titanScenes';
import { FinalScenes, type FinCfg } from './battle/finalScenes';
import { isFinal } from '../engine/final';
import type { ActionResult, BattleEvent, CreatureDef, Hit, StatusId } from '../engine/types';
import { GBPipeline } from '../gfx/GBPipeline';
import { Arena, PLAYER_X, PLAYER_Y } from './battle/Arena';
import { Hud } from './battle/Hud';
import { playerAnim, bossAnim, counterAnim } from './battle/anims';
import { txt, box, C, teardownLayers } from '../ui/ui';
import { sound } from '../audio/audio';
import { settings } from '../settings';
import { lostBefore, markLost } from '../story/retry';
import { W, H, ARENA_CY, BOTTOM_Y } from '../constants';

type Pt = { x: number; y: number };

/** Short floating words for engine messages; everything else is shown with icons and numbers. */
const MSG_TAG: [string, string, 'player' | 'boss'][] = [
  ['SHIELD SHATTERS', 'SHATTERED', 'player'],
  ['FUMBLED', 'FUMBLED', 'boss'],
  ['HOLD BACK THE TIDE', 'HELD', 'player'],
  ['NOTHING TO DRINK', 'DENIED', 'player'],
  ['CANOPY SWALLOWS', 'SWALLOWED', 'player'],
  ['ALREADY FULL', 'FULL', 'player'],
  ['NOTHING TO UNDO', 'NO EFFECT', 'player'],
];

/** Statuses that announce themselves with a floating tag when applied. */
const TAGGED: StatusId[] = [
  'WEAKENED',
  'SPOOKED',
  'HAUNTED',
  'DELAYED',
  'ANCHORED',
  'DROWNING',
  'FOGGED',
  'VULNERABLE',
  'EXPOSED',
  'CHARGED',
  'EMPOWER',
  'REPRISAL',
  'REGEN',
  'GUARD',
];

/** Menu slot for swapping creatures (after the four abilities). */
export const SWAP = 4;
/** (not a menu slot: the turn a rooted creature loses) */
const ROOTED_TURN = 98;

export class BattleScene extends Phaser.Scene {
  battle!: Battle;
  creature!: CreatureDef;
  sel = 0;
  worldLayer!: Phaser.GameObjects.Layer;
  uiLayer!: Phaser.GameObjects.Layer;
  uiCam!: Phaser.Cameras.Scene2D.Camera;
  gb!: GBPipeline;
  arena!: Arena;
  hud!: Hud;
  cs = { x: W / 2, y: ARENA_CY, zoom: 1, rot: 0 };
  private shakeAmt = 0;
  private shakeTime = 0;
  private flashAmt = 0;
  private flashDecay = 0;
  idle = true;
  menuSel = 0;
  /** World 3: staging for the Titan fights */
  ti: TitanScenes | null = null;
  /** The God of Death: staging for the four last fights */
  finS: FinalScenes | null = null;
  /** The last battle: who fights (in order) and which section of the fight */
  partyIds: string[] | null = null;
  fin: FinCfg = {};
  /** A cutscene waiting for SPACE/X (the battle's own keys are ignored meanwhile). */
  keyWait: (() => void) | null = null;
  /** ROGUELIKE: set when this is a co-op dungeon fight (the campaign never sets it). */
  rogue: RogueBattleView | null = null;
  private choose: ((i: number) => void) | null = null;
  private keys!: { space: Phaser.Input.Keyboard.Key };
  private holdFF = false;
  /** Fast-forward: only on a retry of an encounter you have lost before (never a first attempt). */
  private ffUnlocked = false;
  private ffBtn: Phaser.GameObjects.Container | null = null;
  /** The toggle stays where you left it from one retry to the next. */
  private static ffOn = false;
  private resultButtons: { zone: Phaser.GameObjects.Zone; act: () => void }[] = [];
  private resultSel = 0;
  private resultRedraw: (() => void) | null = null;
  // persistent status visuals
  private fx: Record<string, Phaser.GameObjects.GameObject & { setVisible(v: boolean): any }> = {};
  private hexRunes: Phaser.GameObjects.Image[] = [];
  private bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private haunt!: Phaser.GameObjects.Particles.ParticleEmitter;
  private charge!: Phaser.GameObjects.Particles.ParticleEmitter;
  private darkTarget = 0;

  constructor() {
    super('battle');
  }

  /** Battle sprite sheet: Umbrawl's fists are separate sprites here, so it uses its bare umbrella. */
  get bodyKey() {
    return this.creature.id === 'umbrawl' ? 'cr_umbrawlB' : 'cr_' + this.creature.id;
  }
  get idleAnim() {
    return `${this.bodyKey}_idle`;
  }
  get awaitingChoice() {
    return !!this.choose;
  }

  /** 'dutchman' (the finale), 'fisherman' (the cellar) or 'salesman' (World 2's wrecked grocery). */
  enemyId: 'dutchman' | 'fisherman' | 'salesman' | 'kraken' | TitanId = 'dutchman';
  /** an indoor fight against a person (no sea, no storm) */
  get indoor() {
    return this.enemyId === 'fisherman' || this.enemyId === 'salesman';
  }
  /** World 2's second companion (two-creature fights only) */
  partnerId: string | null = null;
  /** World 4: the third creature (three-creature fights) */
  partner2Id: string | null = null;
  private party0: string | null = null;
  /** Started from the overworld story (results lead back to the world). */
  story = false;

  init(data: { creature: string; sel?: number; enemy?: 'dutchman' | 'fisherman' | 'salesman' | 'kraken' | TitanId; story?: boolean; partner?: string | null; partner2?: string | null; party?: string[]; fin?: FinCfg; rogue?: RogueBattleView }) {
    this.partyIds = data.party ?? null;
    this.fin = data.fin ?? {};
    this.keyWait = null;
    this.rogue = data.rogue ?? null;
    if (this.rogue) {
      // ROGUELIKE: the host owns the fight; this scene shows this player's side of it
      const r = this.rogue.setup();
      this.creature = r.creature;
      this.sel = 0;
      this.enemyId = r.enemyId as typeof this.enemyId;
      this.story = false;
      this.ffUnlocked = false;
      this.ffBtn = null;
      this.partnerId = null;
      this.partner2Id = null;
      this.party0 = this.creature.id;
      this.ti = isTitan(this.enemyId) ? new TitanScenes(this) : null;
      this.finS = isFinal(this.enemyId) ? new FinalScenes(this) : null;
      this.battle = r.battle;
      this.finS?.setup();
    } else {
      this.creature = getCreature(this.partyIds?.[0] ?? data.creature ?? 'booheet');
      this.sel = data.sel ?? CREATURES.findIndex((c) => c.id === this.creature.id);
      this.enemyId = data.enemy ?? 'dutchman';
      this.story = !!data.story;
      this.ffUnlocked = this.story && lostBefore(this.enemyId);
      this.ffBtn = null;
      this.partnerId = data.partner ?? null;
      this.partner2Id = data.partner2 ?? null;
      this.party0 = this.creature.id;
      const enemy = isTitan(this.enemyId) ? TITANS[this.enemyId] : this.enemyId === 'fisherman' ? FISHERMAN : this.enemyId === 'salesman' ? SALESMAN : this.enemyId === 'kraken' ? KRAKEN : DUTCHMAN;
      this.ti = isTitan(this.enemyId) ? new TitanScenes(this) : null;
      this.finS = isFinal(this.enemyId) ? new FinalScenes(this) : null;
      const partners = this.partyIds ? this.partyIds.slice(1).map((id) => getCreature(id)) : [this.partnerId, this.partner2Id].filter(Boolean).map((id) => getCreature(id!));
      this.battle = new Battle(this.creature, Math.random, enemy, partners);
      this.finS?.setup();
    }
    this.leaving = false;
    this.cs = { x: W / 2, y: ARENA_CY, zoom: 1, rot: 0 };
    this.choose = null;
    this.idle = true;
    this.menuSel = 0;
    this.fx = {};
    this.hexRunes = [];
    this.resultButtons = [];
    this.resultRedraw = null;
    this.darkTarget = 0;
    this.flashAmt = 0;
  }

  // ================================================================ setup

  create() {
    const main = this.cameras.main;
    main.setPostPipeline(GBPipeline);
    const pp = main.getPostPipeline(GBPipeline);
    this.gb = (Array.isArray(pp) ? pp[0] : pp) as GBPipeline;
    this.uiCam = this.cameras.add(0, 0, W, H);
    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    // each layer is drawn by exactly one camera
    this.worldLayer.cameraFilter |= this.uiCam.id;
    this.uiLayer.cameraFilter |= main.id;
    this.uiLayer.setDepth(100);

    this.arena = new Arena(this, this.worldLayer);
    this.hud = new Hud(this, this.uiLayer);
    this.buildStatusFx();

    // input
    const kb = this.input.keyboard!;
    this.keys = { space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false) };
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.hud.cells.forEach((z, i) => {
      z.on('pointerover', (p: Phaser.Input.Pointer) => {
        if (!p.wasTouch && this.choose && this.menuSel !== i) this.highlight(i);
      });
      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.choose) return;
        if (p.wasTouch && this.menuSel !== i) this.highlight(i);
        else this.confirm(i);
      });
    });
    this.input.on('pointerdown', () => {
      this.holdFF = true;
      if (this.keyWait) {
        const k = this.keyWait;
        this.keyWait = null;
        k();
      }
    });
    this.input.on('pointerup', () => (this.holdFF = false));
    if (this.ffUnlocked) this.buildFF();
    this.events.once('shutdown', () => {
      kb.off('keydown');
      this.input.off('pointerdown');
      this.input.off('pointerup');
      this.anims.globalTimeScale = 1;
      sound.stopMusic();
    });

    this.rogue?.attach(this);
    this.events.once('shutdown', () => this.rogue?.destroy());
    this.applyCamera(0);
    this.run().catch((e) => console.error(e));
  }

  /** The fast-forward toggle: a small >> chip in the corner of the bottom panel. */
  private buildFF() {
    const bw = 30, bh = 13;
    const x = W - bw - 5, y = BOTTOM_Y + 5;
    const c = this.uiObj(this.add.container(x, y).setDepth(120));
    const g = this.add.graphics();
    const t = txt(this, bw / 2, 3, '>>', { origin: [0.5, 0] });
    const k = txt(this, -3, 3, 'F', { color: C.mid, origin: [1, 0] });
    c.add([g, t, k]);
    const draw = () => {
      g.clear();
      box(g, 0, 0, bw, bh, BattleScene.ffOn ? 'light' : 'dark');
      t.setTint(BattleScene.ffOn ? C.black : C.light);
    };
    draw();
    (c as any).redraw = draw;
    const z = this.uiObj(this.add.zone(x, y, bw, bh).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(121));
    z.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev?.stopPropagation?.();
      this.toggleFF();
    });
    this.ffBtn = c;
    // the chevrons nudge forward while it is on
    this.tweens.add({ targets: t, x: { from: bw / 2, to: bw / 2 + 1 }, duration: 260, yoyo: true, repeat: -1, onUpdate: () => !BattleScene.ffOn && (t.x = bw / 2) });
  }

  private toggleFF() {
    if (!this.ffBtn || !this.ffBtn.visible) return;
    BattleScene.ffOn = !BattleScene.ffOn;
    sound.play(BattleScene.ffOn ? 'select' : 'back');
    (this.ffBtn as any).redraw();
    const note = this.uiObj(txt(this, W - 5, BOTTOM_Y - 10, BattleScene.ffOn ? 'FAST-FORWARD ON' : 'NORMAL SPEED', { color: C.white, outline: true, origin: [1, 0] }).setDepth(121));
    // real time, so the note reads the same at any speed
    window.setTimeout(() => note.active && note.destroy(), 900);
  }

  /** Add a game object to the world layer. */
  w<T extends Phaser.GameObjects.GameObject>(o: T, depth = 60): T {
    (o as any).setDepth?.(depth);
    this.worldLayer.add(o);
    return o;
  }

  /** Add a game object to the UI layer (never hit-tested through the battle camera). */
  uiObj<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.uiLayer.add(o);
    (o as any).cameraFilter |= this.cameras.main.id;
    return o;
  }

  // ================================================================ timing helpers

  wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => {
      this.tweens.add({ ...cfg, onComplete: () => r() });
    });
  }

  // ================================================================ camera

  get rm() {
    return settings.reducedMotion;
  }

  camTo(x: number, y: number, zoom: number, dur = 400, rot = 0, ease = 'Sine.easeInOut') {
    this.idle = false;
    if (this.rm) {
      zoom = 1 + (zoom - 1) * 0.35;
      rot = 0;
    }
    this.tweens.killTweensOf(this.cs);
    return this.tw({ targets: this.cs, x, y, zoom, rot, duration: dur, ease });
  }

  camFocus(p: Pt, zoom: number, dur = 400, rot = 0) {
    return this.camTo(p.x, p.y, zoom, dur, rot);
  }

  async camHome(dur = 450) {
    await this.camTo(W / 2, ARENA_CY, 1, dur, 0);
    this.idle = true;
  }

  shake(amount: number, dur = 250) {
    if (this.rm) amount *= 0.25;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }

  flash(amount: number, dur = 200) {
    if (this.rm) amount = Math.min(amount, 0.15);
    this.flashAmt = Math.max(this.flashAmt, amount);
    this.flashDecay = amount / Math.max(30, dur);
  }

  async invert(ms = 90) {
    if (this.rm) return;
    this.gb.invert = 1;
    await this.wait(ms);
    this.gb.invert = 0;
  }

  setDarkness(d: number) {
    this.darkTarget = d;
  }

  private applyCamera(dt: number) {
    const cam = this.cameras.main;
    const t = this.time.now / 1000;
    let { x, y, zoom, rot } = this.cs;
    if (this.idle && !this.rm) {
      // a slow, breathing establishing shot
      x += Math.sin(t * 0.21) * 6;
      y += Math.sin(t * 0.17) * 2;
      zoom += Math.sin(t * 0.13) * 0.012;
    }
    let sx = 0;
    let sy = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      sx = (Math.random() - 0.5) * 2 * this.shakeAmt;
      sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
      if (this.shakeTime <= 0) this.shakeAmt = 0;
    }
    cam.setZoom(zoom);
    cam.setRotation(rot);
    cam.setScroll(Math.round(x - W / 2 + sx), Math.round(y + (H / 2 - ARENA_CY) / zoom - H / 2 + sy));
  }

  update(_time: number, delta: number) {
    this.rogue?.update();
    // a first attempt keeps the encounter's own pace; after a loss, hold SPACE or toggle >>
    const ff = !this.ffUnlocked ? 1 : this.keys.space.isDown || (this.holdFF && !this.choose) ? 3 : BattleScene.ffOn ? 2.5 : 1;
    const ts = settings.speed * ff;
    this.time.timeScale = ts;
    this.tweens.timeScale = ts;
    this.anims.globalTimeScale = ts;
    const dt = delta * ts;
    this.arena.update(dt);
    this.hud.update(delta);
    this.applyCamera(delta);
    // flash + darkness feed the monochrome shader
    this.flashAmt = Math.max(0, this.flashAmt - this.flashDecay * delta);
    this.gb.flash = this.flashAmt;
    this.gb.dark += (this.darkTarget - this.gb.dark) * Math.min(1, delta / 400);
    this.updateStatusFx(delta);
  }

  // ================================================================ battle flow

  /** How this foe arrives (music, ambience, its entrance). */
  private async playIntro() {
    // ROGUELIKE: ordinary rooms open quickly; bosses keep their full entrances
    if (this.rogue?.quickIntro) return this.rogue.intro(this);
    if (this.enemyId === 'fisherman') {
      sound.playSong('fisher');
      sound.setAmbience('cellar');
      await this.fisherIntro();
    } else if (this.enemyId === 'salesman') {
      sound.playSong('rick');
      sound.setAmbience('store');
      await this.rickIntro();
    } else if (this.enemyId === 'kraken') {
      sound.playSong('kraken3');
      sound.setAmbience('deep');
      await this.krakenIntro();
    } else if (this.ti) {
      sound.setAmbience('indoor');
      await this.ti.intro();
    } else {
      sound.setAmbience('battle');
      sound.setStorm(1);
      sound.startMusic(3);
      await this.intro();
    }
  }

  private async run() {
    const b = this.battle;
    await this.playIntro();
    // ROGUELIKE: a co-op fight is decided by the host and played back here (see rogue/battle/view.ts)
    if (this.rogue) return this.rogue.loop(this);
    while (!b.over) {
      this.hud.sync();
      const ev = b.startPlayerTurn();
      await this.playEvents(ev);
      this.hud.sync();
      if (b.over) break;
      if (b.koPending) await this.koSwap();
      await this.telegraph();
      // World 4: held by roots, the creature on the field loses its turn
      const choice = b.has('player', 'ROOTED') ? ROOTED_TURN : await this.waitChoice();
      if (choice === ROOTED_TURN) {
        this.hud.setIntentVisible(false);
        this.hud.hideMenu();
        this.hud.caption('s_root', 'ROOTED', false);
        const res = b.rootedTurn();
        await this.rootedAnim();
        await this.playEvents(res.post);
      } else if (choice === SWAP) {
        // trading places costs the turn: the foe then strikes the newcomer
        this.hud.setIntentVisible(false);
        this.hud.hideMenu();
        this.hud.caption('s_delay', 'SWITCH', false);
        const res = b.swapAction();
        await this.swapAnim();
        await this.playEvents(res.post);
      } else {
      const ab = b.ability(choice);
      const res = b.playerAct(choice);
      this.hud.setIntentVisible(false);
      this.hud.showMenu(choice, true);
      this.hud.caption(ab.icon, ab.name, false);
      if (this.creature.sc) await this.finS?.scCharge(res);
      await playerAnim(this, res);
      if (this.creature.sc) await this.finS?.scImpact(res);
      this.ti?.react(res);
      await this.playEvents(res.post);
      }
      this.hud.hideCaption();
      // the last battle: a helper's spirit acts on its own after you
      if (this.finS && !b.over && b.allyReady()) {
        this.hud.sync();
        const ar = b.allyAct();
        if (ar) await this.finS.allyTurn(ar);
      }
      this.hud.sync();
      await this.camHome(350);
      if (b.over) break;

      const np = b.checkPhase();
      if (np) {
        await this.phaseTransition(np);
        await this.playEvents(b.endRound(true));
        this.hud.sync();
        continue;
      }
      const results = b.bossTurn();
      for (const r of results) {
        if (r.stage !== 'frozen') this.hud.caption(b.atk[r.id].icon, r.name, true);
        await bossAnim(this, r);
        await this.playEvents(r.post);
        this.hud.hideCaption();
        // (HP stays as the animations left it: the next result's hits are still to play)
        this.hud.sync(true);
        if (b.over || b.koPending) break;
      }
      this.hud.sync();
      await this.camHome(400);
      if (b.over) break;
      if (b.koPending) await this.koSwap();
      await this.playEvents(b.endRound());
      this.hud.sync();
      if (b.over) break;
      const np2 = b.checkPhase();
      if (np2) {
        await this.phaseTransition(np2);
        b.b.turnsInPhase = 0;
        b.planIntent();
        this.hud.sync();
      }
    }
    if (b.over === 'victory') await this.victory();
    else await this.defeat();
  }

  // ================================================================ the party (two-creature fights)

  /** A creature falls; its partner takes the field. */
  async koSwap() {
    const b = this.battle;
    const a = this.arena;
    const pl = a.player;
    this.hud.hideMenu();
    this.hud.setIntentVisible(false);
    sound.play('defeat');
    pl.stop().setFrame(5);
    await this.camFocus(a.playerCenter(), 1.8, 400);
    for (let i = 0; i < 4; i++) {
      pl.setVisible(i % 2 === 0);
      await this.wait(90);
    }
    pl.setVisible(true);
    await this.tw({ targets: pl, angle: -70, alpha: 0.4, duration: 600, ease: 'Quad.easeIn' });
    // two or more left standing: you choose who goes in
    if (this.benchUp().length >= 2) {
      await this.camHome(300);
      const who = await this.pickFromBench(false);
      if (who !== null) b.pick = who;
    }
    b.swapAfterKO();
    this.creature = b.creature;
    await this.camHome(300);
    await this.enterAnim();
    this.hud.sync();
    this.syncStatusFx();
  }

  /** Roots wrap the creature on the field: it strains against them and cannot move. */
  async rootedAnim() {
    const a = this.arena;
    const pl = a.player;
    await this.camFocus(a.playerCenter(), 1.6, 300);
    this.num(a.playerCenter().x, a.playerCenter().y - 18, 'ROOTED!', { color: C.white });
    const roots: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 4; i++) {
      const r = this.w(this.add.image(pl.x - 14 + i * 9, pl.y + 2, 'fx_root').setOrigin(0.5, 1).setFlipX(i % 2 === 1).setScale(1, 0.2), 60);
      roots.push(r);
      this.tweens.add({ targets: r, scaleY: 1, duration: 260, delay: i * 60, ease: 'Back.easeOut' });
    }
    sound.play('creak');
    for (let i = 0; i < 3; i++) {
      await this.tw({ targets: a.playerOffset, x: i % 2 ? 3 : -3, duration: 90, yoyo: true });
      await this.wait(160);
    }
    await this.wait(500);
    roots.forEach((r) => this.tweens.add({ targets: r, alpha: 0, scaleY: 0.3, duration: 300, onComplete: () => r.destroy() }));
    await this.wait(300);
  }

  /** Swap by choice: the active creature backs off, the partner steps up. */
  async swapAnim() {
    const a = this.arena;
    sound.play('swish');
    await this.tw({ targets: a.player, x: a.player.x - 40, alpha: 0, duration: 260, ease: 'Quad.easeIn' });
    this.creature = this.battle.creature;
    await this.enterAnim();
    this.hud.sync();
    this.syncStatusFx();
  }

  async enterAnim() {
    const a = this.arena;
    a.setChampion();
    a.player.setAlpha(0);
    a.playerLocked = true;
    a.player.setPosition(a.player.x - 50, a.player.y);
    sound.play('buff');
    await this.tw({ targets: a.player, x: a.player.x + 50, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    a.playerLocked = false;
    this.hud.snapPlayer();
    this.flash(0.25, 200);
    this.num(a.playerCenter().x, a.playerCenter().y - 18, this.creature.name, { color: C.white });
    await this.wait(300);
  }

  // ================================================================ the Kraken

  private async krakenIntro() {
    const a = this.arena;
    const k = a.kr!;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    this.cs = { x: W / 2 + 60, y: ARENA_CY - 40, zoom: 0.8, rot: 0 };
    k.rise.y = 150;
    k.tents.forEach((t) => (t.ty = t.by + 40));
    this.setDarkness(0.5);
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.uiCam.fadeIn(800, 0, 0, 0);
    await this.wait(600);
    sound.play('rumble');
    this.shake(2, 1600);
    k.pulse(false);
    // it rises out of the floor of the temple
    this.tweens.add({ targets: k.rise, y: 0, duration: 2600, ease: 'Sine.easeOut' });
    await this.wait(1400);
    this.setDarkness(0.15);
    await this.camFocus(a.captainPoint(), 2.2, 1200);
    a.captain.stop().setFrame(2);
    sound.play('horn');
    sound.play('wail');
    this.shake(4, 900);
    k.pulse(true);
    await this.wait(1000);
    a.captainIdle();
    await this.camTo(W / 2 + 30, ARENA_CY - 30, 0.82, 900);
    await this.wait(500);
    await this.camFocus(a.playerCenter(), 1.6, 700);
    await this.wait(400);
    await this.camHome(700);
  }

  private async krakenPhase(p: number) {
    const a = this.arena;
    const k = a.kr!;
    this.hud.setIntentVisible(false);
    this.hud.showMenu(this.menuSel, true);
    if (p === 2) {
      sound.playSong(null);
      await this.camTo(W / 2 + 40, ARENA_CY - 10, 0.8, 800);
      sound.play('rumble');
      this.shake(3, 2200);
      k.pulse(true);
      a.setPhase(2);
      await this.wait(900);
      a.captain.stop().setFrame(2);
      sound.play('wail');
      await this.wait(800);
      a.captainIdle();
      await this.camFocus(a.captainPoint(), 2.0, 800);
      await this.wait(500);
      sound.playSong('kraken3');
    } else {
      sound.playSong(null);
      await this.camTo(W / 2 + 50, ARENA_CY - 40, 0.75, 900);
      sound.play('rumble');
      this.shake(6, 2600);
      await this.invert(120);
      this.flash(0.9, 500);
      a.setPhase(3);
      await this.wait(1200);
      a.captain.stop().setFrame(2);
      sound.play('horn');
      sound.play('wail');
      this.shake(5, 900);
      k.pulse(true);
      await this.camFocus(a.captainPoint(), 2.4, 1000);
      await this.wait(700);
      a.captainIdle();
      sound.playSong('kraken3');
    }
    await this.camHome(700);
    this.syncStatusFx();
  }

  private async krakenVictory() {
    const a = this.arena;
    const k = a.kr!;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    sound.playSong(null);
    this.flash(1, 600);
    await this.invert(150);
    await this.camFocus(a.captainPoint(), 2.2, 700);
    a.captain.stop().setFrame(3);
    sound.play('wail');
    this.shake(4, 1200);
    await this.wait(900);
    // a last spasm: every arm lashes upward at once...
    sound.play('wail');
    await Promise.all(k.tents.map((t, i) => k.steer(i, t.tx + (Math.random() - 0.5) * 30, t.ty - 50 - Math.random() * 30, 280, 'Quad.easeOut')));
    this.shake(5, 500);
    // ...then they all go slack together, the eye closes, and the arms slap down onto the seabed
    k.goLimp();
    a.captain.setFrame(6);
    sound.play('heavy');
    await this.wait(650);
    sound.play('slam');
    this.shake(4, 400);
    k.bubbles.frequency = 30;
    await this.camTo(W / 2 + 40, ARENA_CY - 10, 0.85, 900);
    for (let i = 0; i < 6; i++) {
      const p = { x: k.body.x - 80 + Math.random() * 160, y: k.body.y - 40 - Math.random() * 80 };
      this.boom(p.x, p.y, 0.8 + Math.random() * 0.8);
      sound.play(i % 2 ? 'boom' : 'impact');
      this.shake(3, 200);
      await this.wait(180);
    }
    // the whole creature sinks as one, its arms dragged down after it, and is gone
    await Promise.all([this.tw({ targets: k.rise, y: 170, duration: 3200, ease: 'Quad.easeIn' }), k.fadeOut(1200, 2000)]);
    this.setDarkness(0.25);
    await this.wait(400);
    sound.play('victory');
    await this.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(this.idleAnim);
    this.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    if (a.reserve?.visible) this.tweens.add({ targets: a.reserve, y: a.reserve.y - 8, duration: 300, yoyo: true, repeat: 2 });
    await this.wait(1000);
    this.results(true);
  }

  /** Old Grundy steps into the light. */
  private async fisherIntro() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    this.cs = { x: W / 2, y: ARENA_CY, zoom: 0.95, rot: 0 };
    this.setDarkness(0.6);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.uiCam.fadeIn(500, 0, 0, 0);
    await this.wait(500);
    a.lightning(true);
    this.setDarkness(0);
    await this.camFocus(a.captainPoint(), 2.0, 900);
    a.captain.stop().setFrame(2);
    sound.play('slam');
    this.shake(3, 400);
    await this.wait(700);
    a.captain.setFrame(3);
    sound.play('swish');
    await this.wait(400);
    a.captainIdle();
    await this.camFocus(a.playerCenter(), 1.7, 700);
    await this.wait(400);
    await this.camHome(600);
  }

  /** Slick Rick revs up in the ruins of the grocery store. */
  private async rickIntro() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    this.cs = { x: W / 2 + 30, y: ARENA_CY, zoom: 0.95, rot: 0 };
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.uiCam.fadeIn(400, 0, 0, 0);
    await this.wait(300);
    await this.camFocus(a.captainPoint(), 2.1, 800);
    a.captain.stop().setFrame(2);
    sound.play('rev');
    this.shake(2, 600);
    await this.wait(500);
    sound.play('rev');
    a.lightning(true);
    await this.wait(500);
    a.captain.setFrame(0);
    await this.wait(250);
    a.captainIdle();
    await this.camFocus(a.playerCenter(), 1.7, 600);
    await this.wait(350);
    await this.camHome(600);
  }

  private async intro() {
    const b = this.battle;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    // open wide on the storm, then find the ship
    this.cs = { x: W / 2 + 40, y: ARENA_CY - 30, zoom: 0.85, rot: 0 };
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.uiCam.fadeIn(600, 0, 0, 0);
    await this.wait(200);
    this.arena.lightning(true);
    sound.play('horn');
    await this.camFocus(this.arena.captainPoint(), 1.9, 1500);
    this.arena.captain.play('b_captain2_idle');
    this.shake(2, 300);
    await this.wait(1100);
    this.arena.captain.play('b_captain_idle');
    await this.camFocus(this.arena.playerCenter(), 1.8, 900);
    await this.wait(700);
    await this.camHome(700);
    void b;
  }

  /** Show the next intent; dangerous ones get a sound, a cue on the ship and a pulse of the chip. */
  async telegraph() {
    const b = this.battle;
    const it = b.intent;
    this.hud.setIntentVisible(true);
    this.hud.drawIntent();
    if (it.hidden || b.has('boss', 'DELAYED')) return;
    if (it.major || it.stage !== 'normal') {
      sound.play('warn');
      this.hud.pulseIntent();
      await this.warnCue(it.id);
      await this.wait(450);
    }
  }

  /** A small, attack-specific warning animation on the ship. */
  private async warnCue(id: string) {
    const a = this.arena;
    if (this.ti) return this.ti.warnCue(id);
    if (this.enemyId === 'kraken') {
      // the deep shivers before anything big
      a.lightning(id === 'rupture' || id === 'devour');
      if (id === 'slam' || id === 'devour') {
        a.captain.stop().setFrame(2);
        this.time.delayedCall(500, () => a.captainIdle());
      }
      if (id === 'gaze') sound.play('ghost');
      return;
    }
    if (this.enemyId === 'salesman') {
      if (id === 'throttle' || id === 'rev') {
        a.captain.stop().setFrame(2);
        sound.play('rev');
        this.shake(1.5, 400);
        this.time.delayedCall(500, () => a.captainIdle());
      } else if (id === 'pitch') sound.play('quest');
      return;
    }
    if (this.enemyId === 'fisherman') {
      if (id === 'cast') {
        a.captain.stop().setFrame(2);
        this.shake(1.5, 400);
        this.time.delayedCall(500, () => a.captainIdle());
      } else if (id === 'slap') sound.play('swish');
      return;
    }
    if (id === 'broadside' || id === 'voyage') {
      a.cannons.forEach((c, i) => this.tweens.add({ targets: c, x: c.x + 2, duration: 80, yoyo: true, delay: i * 40 }));
      sound.play('creak');
    } else if (id === 'anchor') {
      const sh = this.w(this.add.ellipse(PLAYER_X, PLAYER_Y + 4, 30, 6, C.black).setAlpha(0.5), 49);
      this.tweens.add({ targets: sh, scaleX: 1.6, alpha: 0, duration: 700, onComplete: () => sh.destroy() });
    } else if (id === 'command') {
      a.captain.setFrame(2);
      this.time.delayedCall(500, () => a.captain.play(a.phase >= 2 ? 'b_captain2_idle' : 'b_captain_idle'));
    } else if (id === 'tide' || id === 'maelstrom') {
      this.shake(1.5, 500);
    } else if (id === 'ram') {
      sound.play('horn');
    }
  }

  waitChoice(): Promise<number> {
    const b = this.battle;
    if (this.menuSel === SWAP && !b.canSwap()) this.menuSel = 0;
    if (this.menuSel !== SWAP && !b.canUse(this.menuSel).ok) this.menuSel = b.creature.abilities.findIndex((_, i) => b.canUse(i).ok);
    if (this.menuSel < 0) this.menuSel = 0;
    this.hud.showMenu(this.menuSel);
    return new Promise((res) => {
      this.choose = (i) => {
        this.choose = null;
        this.hud.hideMenu();
        res(i);
      };
    });
  }

  private highlight(i: number) {
    if (i === this.menuSel) return;
    this.menuSel = i;
    sound.play('move');
    this.hud.showMenu(i);
  }

  private confirm(i: number) {
    if (!this.choose) return;
    if (i === SWAP) {
      if (!this.battle.canSwap()) return void sound.play('deny');
      sound.play('select');
      // two or more on the bench: choose which one comes in
      if (this.benchUp().length >= 2) {
        const go = this.choose;
        this.choose = null;
        void this.pickFromBench(true).then((who) => {
          this.choose = go;
          if (who === null) return void this.hud.showMenu(SWAP);
          this.battle.pick = who;
          this.choose?.(SWAP);
        });
        return;
      }
      this.choose(SWAP);
      return;
    }
    const av = this.battle.canUse(i);
    if (!av.ok) {
      sound.play('deny');
      this.menuSel = i;
      this.hud.showMenu(i);
      this.shake(0.8, 120);
      return;
    }
    sound.play('select');
    this.choose(i);
  }

  /** The spirits on the bench who can still fight. */
  private benchUp() {
    const b = this.battle;
    return b.party.map((m, i) => ({ m, i })).filter(({ m, i }) => i !== b.active && m.p.hp > 0);
  }

  pickerKey: ((k: string) => void) | null = null;

  /**
   * Choose who steps in from the bench: every spirit you brought, with its health and
   * energy. Resolves with its place in the party, or null if you back out.
   */
  private pickFromBench(canCancel: boolean): Promise<number | null> {
    const b = this.battle;
    const rows = b.party.map((m, i) => ({ m, i })).filter(({ i }) => i !== b.active);
    const RW = 250;
    const RH = 24;
    const X0 = Math.round((W - RW) / 2);
    const Y0 = Math.round(ARENA_CY - ((rows.length + 1) * RH) / 2) - 6;
    const c = this.uiObj(this.add.container(0, 0).setDepth(140));
    const zones: Phaser.GameObjects.Zone[] = [];
    let sel = Math.max(0, rows.findIndex(({ m }) => m.p.hp > 0));
    const ok = (k: number) => rows[k] && rows[k].m.p.hp > 0;
    const draw = () => {
      c.removeAll(true);
      const g = this.add.graphics();
      c.add(g);
      g.fillStyle(C.black, 0.6).fillRect(0, 0, W, H);
      box(g, X0 - 6, Y0 - 6, RW + 12, (rows.length + 1) * RH + 22, 'dark');
      c.add(txt(this, W / 2, Y0, 'WHO STEPS IN?', { outline: true, origin: [0.5, 0] }));
      rows.forEach(({ m }, k) => {
        const y = Y0 + RH * (k + 1);
        const on = k === sel;
        const down = m.p.hp <= 0;
        box(g, X0, y, RW, RH - 3, on ? 'light' : 'dark');
        const fg = on ? C.black : down ? C.dark : C.white;
        c.add(txt(this, X0 + 6, y + 4, (on ? '> ' : '  ') + m.creature.name, { color: fg }));
        const pct = Math.max(0, m.p.hp / m.p.maxHp);
        g.fillStyle(on ? C.dark : C.black, 1).fillRect(X0 + 120, y + 5, 60, 5);
        g.fillStyle(down ? C.dark : on ? C.black : C.white, 1).fillRect(X0 + 120, y + 5, Math.round(60 * pct), 5);
        c.add(txt(this, X0 + 186, y + 4, down ? 'DOWN' : `${Math.max(0, Math.ceil(m.p.hp))}/${m.p.maxHp}`, { color: fg }));
        for (let e = 0; e < m.p.maxEn; e++) g.fillStyle(e < m.p.en ? (on ? C.black : C.light) : on ? C.mid : C.dark, 1).fillRect(X0 + 120 + e * 5, y + 13, 4, 3);
      });
      const hint = canCancel ? 'UP/DOWN: CHOOSE   SPACE: SWITCH   X: BACK' : 'UP/DOWN: CHOOSE   SPACE: SEND IN';
      c.add(txt(this, W / 2, Y0 + RH * (rows.length + 1) + 2, hint, { color: C.light, origin: [0.5, 0] }));
    };
    draw();
    return new Promise((done) => {
      const finish = (r: number | null) => {
        this.pickerKey = null;
        zones.forEach((z) => z.destroy());
        c.destroy();
        done(r);
      };
      const move = (d: number) => {
        for (let k = 1; k <= rows.length; k++) {
          const n = (((sel + d * k) % rows.length) + rows.length) % rows.length;
          if (ok(n)) {
            if (n !== sel) sound.play('move');
            sel = n;
            break;
          }
        }
        draw();
      };
      this.pickerKey = (k) => {
        if (['ArrowUp', 'w', 'ArrowLeft', 'a'].includes(k)) move(-1);
        else if (['ArrowDown', 's', 'ArrowRight', 'd'].includes(k)) move(1);
        else if (['Enter', 'z', 'Z', ' '].includes(k)) {
          if (!ok(sel)) return void sound.play('deny');
          sound.play('select');
          finish(rows[sel].i);
        } else if (canCancel && ['x', 'X', 'Escape', 'Backspace'].includes(k)) {
          sound.play('back');
          finish(null);
        }
      };
      rows.forEach((_, k) => {
        const z = this.uiObj(this.add.zone(X0, Y0 + RH * (k + 1), RW, RH - 3).setOrigin(0, 0).setDepth(141).setInteractive({ useHandCursor: true }));
        z.on('pointerdown', () => {
          if (!ok(k)) return void sound.play('deny');
          if (sel !== k) {
            sel = k;
            sound.play('move');
            return draw();
          }
          sound.play('select');
          finish(rows[k].i);
        });
        zones.push(z);
      });
    });
  }

  private onKey(e: KeyboardEvent) {
    if (this.pickerKey) return this.pickerKey(e.key);
    if (this.ffUnlocked && (e.key === 'f' || e.key === 'F') && !this.resultButtons.length) return this.toggleFF();
    if (this.keyWait) {
      if ([' ', 'x', 'X', 'Enter', 'z', 'Z'].includes(e.key)) {
        const k = this.keyWait;
        this.keyWait = null;
        k();
      }
      return;
    }
    if (this.resultButtons.length) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(e.key)) {
        this.resultSel = (this.resultSel + 1) % this.resultButtons.length;
        sound.play('move');
        this.resultRedraw?.();
      } else if (e.key === 'Enter' || e.key === 'z') this.resultButtons[this.resultSel].act();
      else if (e.key === 'Escape') this.resultButtons[this.resultButtons.length - 1].act();
      return;
    }
    if (!this.choose) return;
    const s = this.menuSel;
    const party = this.battle.party.length > 1;
    if (s === SWAP) {
      // a big party: left and right choose who comes in
      if (this.battle.party.length >= 3 && ['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) {
        if (this.battle.cyclePick(e.key === 'ArrowLeft' || e.key === 'a' ? -1 : 1)) {
          sound.play('move');
          this.hud.sync();
          this.hud.showMenu(SWAP);
        }
        return;
      }
      // the partner chip sits above the menu: down returns to the abilities
      if (['ArrowDown', 's', 'ArrowLeft', 'a'].includes(e.key)) return this.highlight(1);
      if (e.key === 'Enter' || e.key === 'z') return this.confirm(SWAP);
      return;
    }
    const map: Record<string, number> = {
      ArrowLeft: s % 2 === 1 ? s - 1 : s,
      ArrowRight: s % 2 === 0 ? s + 1 : s,
      ArrowUp: s >= 2 ? s - 2 : party ? SWAP : s,
      ArrowDown: s < 2 ? s + 2 : s,
      a: s % 2 === 1 ? s - 1 : s,
      d: s % 2 === 0 ? s + 1 : s,
      w: s >= 2 ? s - 2 : party ? SWAP : s,
      s: s < 2 ? s + 2 : s,
    };
    if (party && (e.key === 'Tab' || e.key === '5' || e.key === 'q')) {
      e.preventDefault?.();
      return this.highlight(SWAP);
    }
    if (e.key in map) this.highlight(map[e.key]);
    else if (e.key === 'Enter' || e.key === 'z') this.confirm(this.menuSel); // space is fast-forward
    else if (['1', '2', '3', '4'].includes(e.key)) {
      const i = Number(e.key) - 1;
      this.highlight(i);
    }
  }

  // ================================================================ feedback

  num(x: number, y: number, text: string, opts: { big?: boolean; color?: number; rise?: number } = {}) {
    const t = this.w(txt(this, x, y, text, { outline: true, origin: [0.5, 1] }), 90);
    if (opts.color !== undefined) t.setTint(opts.color);
    if (opts.big) t.setScale(2);
    const rise = opts.rise ?? 18;
    this.tweens.add({ targets: t, y: y - 6, duration: 90, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, y: y - rise, delay: 90, duration: 700, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
    return t;
  }

  /** A small floating icon + word (status applied, attack fumbled, etc). */
  tag(x: number, y: number, icon: string | null, word: string, color: number = C.white) {
    const c = this.w(this.add.container(x, y), 91);
    const t = txt(this, 0, 0, word, { outline: true, origin: [0, 0.5] });
    if (color !== C.white) t.setTint(color);
    const iw = icon ? (word ? 10 : 7) : 0;
    t.x = -Math.round((t.width + iw) / 2) + iw;
    c.add(t);
    if (icon) c.add(this.add.image(t.x - iw, 0, icon).setOrigin(0, 0.5));
    c.setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: y - 16, delay: 140, duration: 800, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 750, duration: 300, onComplete: () => c.destroy() });
    return c;
  }

  /** Show one hit landing on the champion. */
  hitPlayer(h: Hit, heavy = false) {
    const a = this.arena;
    const p = a.playerCenter();
    const jx = (Math.random() - 0.5) * 14;
    if (h.miss) {
      this.num(p.x + jx, p.y - 10, 'MISS', { color: C.light });
      sound.play('miss');
      this.tweens.add({ targets: a.playerOffset, x: -8, duration: 80, yoyo: true });
      a.fists.forEach((_, i) => this.tweens.add({ targets: a.fistOff[i], y: -6, duration: 80, yoyo: true }));
      return;
    }
    if (h.absorbed > 0) {
      this.tag(p.x + jx, p.y - 22, 's_shield', `${h.absorbed}`, C.light);
      const sh = this.fx.shield as Phaser.GameObjects.Image;
      if (sh) {
        sh.setScale(1.15);
        this.tweens.add({ targets: sh, scale: 1, duration: 160 });
      }
      sound.play('shield');
    }
    if (h.amount > 0 || h.absorbed === 0) {
      this.num(p.x + jx, p.y - 6, `-${h.amount}`, { big: heavy && h.amount >= 40, color: h.graze ? C.light : undefined });
      this.hud.playerHit(this.hud.playerTarget - h.amount);
      sound.play(heavy ? 'heavy' : 'hit');
      this.shake(heavy ? 4 : 2, heavy ? 320 : 160);
      const pl = a.player;
      pl.stop();
      pl.setFrame(5);
      pl.setTintFill(0xffffff);
      this.time.delayedCall(60, () => pl.clearTint());
      this.time.delayedCall(120, () => pl.setTintFill(0xffffff));
      this.time.delayedCall(170, () => pl.clearTint());
      this.time.delayedCall(320, () => {
        if (!this.battle.over || this.battle.p.hp > 0) pl.play(this.idleAnim);
      });
      this.tweens.add({ targets: a.playerOffset, x: -6 - (heavy ? 6 : 0), duration: 60, yoyo: true });
      // Umbrawl's fists flinch a beat behind the umbrella
      a.fists.forEach((f, i) => {
        if (a.fistLocked[i]) return;
        f.setTintFill(0xffffff);
        this.time.delayedCall(60, () => f.clearTint());
        this.tweens.add({ targets: a.fistOff[i], x: (i ? -4 : -10) - (heavy ? 5 : 0), y: 3, duration: 70, delay: 40, yoyo: true });
      });
      this.spark(p.x + jx * 0.5, p.y + (Math.random() - 0.5) * 12);
    }
  }

  /** Show one hit landing on the Dutchman. */
  hitBoss(h: Hit, at?: Pt) {
    const a = this.arena;
    const p = at ?? a.hullPoint();
    const jx = (Math.random() - 0.5) * 20;
    this.num(p.x + jx, p.y - 4, `-${h.amount}`, { big: h.crit || h.amount >= 100 });
    this.hud.bossHit(this.hud.bossTarget - h.amount);
    sound.play(h.crit ? 'crit' : 'hit');
    this.shake(h.crit ? 4 : 2, h.crit ? 300 : 160);
    if (h.crit) this.flash(0.35, 160);
    this.flickerShip();
    this.boom(p.x + jx * 0.5, p.y, h.crit ? 1.3 : 0.8);
  }

  flickerShip() {
    const parts = this.arena.shipParts;
    parts.forEach((o) => o.setTintFill(0xffffff));
    this.time.delayedCall(50, () => parts.forEach((o) => o.clearTint()));
    this.time.delayedCall(100, () => parts.forEach((o) => o.setTintFill(0xffffff)));
    this.time.delayedCall(140, () => {
      parts.forEach((o) => o.clearTint());
      this.applyWeakTint();
    });
  }

  spark(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const s = this.w(this.add.image(x, y, i % 2 ? 'fx_spark' : 'fx_dot'), 62);
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * 14;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        duration: 260 + Math.random() * 120,
        onComplete: () => s.destroy(),
      });
    }
  }

  boom(x: number, y: number, scale = 1) {
    const b = this.w(this.add.sprite(x, y, 'fx_boom', 0).setScale(scale), 61);
    b.play('fx_boom');
    b.once('animationcomplete', () => b.destroy());
    return b;
  }

  splash(x: number, y: number, scale = 1) {
    if (this.indoor) {
      // no water in the cellar: a burst of dust instead
      const d = this.w(this.add.sprite(x, y - 10, 'fx_puffL', 0).setScale(scale), 69);
      this.tweens.add({ targets: d, scale: scale * 1.8, alpha: 0, duration: 500, onComplete: () => d.destroy() });
      sound.play('hit');
      return;
    }
    const s = this.w(this.add.sprite(x, y, 'fx_splash', 0).setOrigin(0.5, 1).setScale(scale), 69);
    s.play('fx_splash');
    s.once('animationcomplete', () => s.destroy());
    sound.play('splash');
  }

  /** Fly a sprite from a to b (optionally arcing). Resolves on arrival. */
  async projectile(key: string, a: Pt, b: Pt, dur: number, arc = 0, opts: { spin?: boolean; trail?: boolean; scale?: number } = {}) {
    const p = this.w(this.add.image(a.x, a.y, key).setScale(opts.scale ?? 1), 63);
    if (b.x < a.x && key === 'fx_bolt') p.setFlipX(true);
    const st = { t: 0 };
    let lastTrail = 0;
    await this.tw({
      targets: st,
      t: 1,
      duration: dur,
      ease: 'Linear',
      onUpdate: () => {
        const t = st.t;
        p.x = a.x + (b.x - a.x) * t;
        p.y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * arc;
        if (opts.spin) p.rotation += 0.3;
        if (opts.trail && this.time.now - lastTrail > 30) {
          lastTrail = this.time.now;
          const tr = this.w(this.add.image(p.x, p.y, 'fx_puff', 1).setScale(0.5).setAlpha(0.7), 62);
          this.tweens.add({ targets: tr, alpha: 0, scale: 0.1, duration: 300, onComplete: () => tr.destroy() });
        }
      },
    } as any);
    p.destroy();
  }

  // ================================================================ events

  async playEvents(events: BattleEvent[]) {
    const pc = () => this.arena.playerCenter();
    const bc = () => this.arena.shipCenter();
    let lift = 0; // stack tags shown in quick succession
    const at = (side: 'player' | 'boss') => {
      const p = side === 'player' ? pc() : bc();
      const r = { x: p.x, y: p.y - (side === 'player' ? 30 : 40) - lift };
      lift = (lift + 11) % 33;
      return r;
    };
    for (const e of events) {
      switch (e.t) {
        case 'msg': {
          const m = MSG_TAG.find(([k]) => e.text.includes(k));
          if (!m) break;
          const p = at(m[2]);
          if (m[1] === 'SHATTERED') {
            sound.play('crit');
            this.spark(pc().x, pc().y);
          }
          this.tag(p.x, p.y, null, m[1], C.light);
          await this.wait(320);
          break;
        }
        case 'heal':
          if (e.target === 'player') {
            this.hud.playerHeal(this.hud.playerTarget + e.amount);
            this.healFx();
            this.num(pc().x, pc().y - 8, `+${e.amount}`, { color: C.white });
          } else {
            this.hud.bossHeal(this.hud.bossTarget + e.amount);
            this.num(bc().x, bc().y, `+${e.amount}`, { big: true });
            sound.play('siphon');
          }
          await this.wait(380);
          break;
        case 'damage':
          if (e.target === 'player') {
            this.hitPlayer({ amount: e.amount, absorbed: 0, crit: false, miss: false, graze: false });
            const p = at('player');
            const ic = STATUS_INFO[e.source as StatusId]?.icon;
            if (ic) this.tag(p.x, p.y, ic, '', C.light);
          } else {
            if (e.source === 'HAUNTED') this.hauntBurst();
            this.hitBoss({ amount: e.amount, absorbed: 0, crit: false, miss: false, graze: false }, bc());
          }
          await this.wait(380);
          break;
        case 'energy':
          this.hud.en = this.battle.p.en;
          break;
        case 'status': {
          this.hud.refresh();
          this.syncStatusFx();
          if (!e.on) break;
          const info = STATUS_INFO[e.id];
          const p = at(e.target);
          if (e.id === 'HEX') {
            const st = this.battle.st('boss', 'HEX');
            sound.play('debuff');
            this.tag(p.x, p.y, info.icon, `HEX x${st?.stacks ?? 1}`, C.light);
            await this.wait(260);
          } else if (TAGGED.includes(e.id)) {
            const bad = !info.good;
            sound.play(e.target === 'player' && !bad ? 'buff' : 'debuff');
            this.tag(p.x, p.y, info.icon, info.name, e.target === 'player' && bad ? C.light : C.white);
            await this.wait(320);
          }
          break;
        }
        case 'cleanse':
          this.healFx();
          this.tag(pc().x, pc().y - 30, null, 'CLEANSED');
          await this.wait(300);
          break;
        case 'break':
          sound.play('crit');
          this.flash(0.4, 200);
          this.shake(3, 250);
          this.tag(bc().x, bc().y - 30, null, 'BROKEN!');
          await this.wait(500);
          break;
        case 'counter':
          await counterAnim(this, e.amount);
          break;
      }
    }
    this.syncStatusFx();
  }

  healFx() {
    const p = this.arena.playerCenter();
    sound.play('heal');
    for (let i = 0; i < 8; i++) {
      const s = this.w(this.add.image(p.x + (Math.random() - 0.5) * 30, p.y + 14, 'fx_plus'), 62);
      this.tweens.add({
        targets: s,
        y: p.y - 24 - Math.random() * 14,
        alpha: 0,
        delay: i * 50,
        duration: 600,
        onComplete: () => s.destroy(),
      });
    }
  }

  hauntBurst() {
    const c = this.arena.shipCenter();
    for (let i = 0; i < 6; i++) {
      const s = this.w(this.add.image(c.x + (Math.random() - 0.5) * 120, c.y + 20, 'fx_bolt'), 64);
      s.setFlipX(Math.random() < 0.5);
      this.tweens.add({ targets: s, y: c.y - 50 - Math.random() * 30, alpha: 0, duration: 700, delay: i * 60, onComplete: () => s.destroy() });
    }
    sound.play('ghost');
  }

  // ================================================================ persistent status visuals

  private buildStatusFx() {
    const a = this.arena;
    const p = a.playerCenter();
    this.fx.shield = this.w(this.add.image(p.x, p.y, 'fx_shield').setAlpha(0.85).setVisible(false), 53);
    this.fx.guard = this.w(this.add.image(p.x, p.y, 'fx_hex').setAlpha(0.6).setVisible(false), 52);
    this.fx.canopy = this.w(this.add.image(p.x + 26, p.y - 4, 'fx_canopy').setAngle(90).setScale(0.8).setVisible(false), 54);
    this.fx.reprisal = this.w(this.add.image(p.x, p.y, 'fx_ring').setVisible(false), 53);
    this.fx.anchor = this.w(this.add.image(p.x - 22, p.y + 18, 'fx_anchor').setScale(0.4).setAlpha(0.8).setVisible(false), 50);
    this.fx.spook = this.w(this.add.container(0, 0).setVisible(false), 64);
    const eyes = this.fx.spook as Phaser.GameObjects.Container;
    eyes.add([this.add.ellipse(-6, 0, 7, 9, C.white), this.add.ellipse(6, 0, 7, 9, C.white), this.add.ellipse(-5, 1, 3, 5, C.black), this.add.ellipse(7, 1, 3, 5, C.black)]);
    this.fx.clock = this.w(this.add.image(0, 0, 'fx_clock').setAlpha(0.5).setVisible(false), 64);
    this.bubbles = this.w(
      this.add.particles(0, 0, 'fx_dot', {
        x: { min: -14, max: 14 },
        y: { min: 0, max: 10 },
        speedY: { min: -40, max: -20 },
        lifespan: 700,
        frequency: 90,
        alpha: { start: 1, end: 0 },
        emitting: false,
      }),
      55
    );
    this.charge = this.w(
      this.add.particles(0, 0, 'fx_spark', {
        x: { min: -18, max: 18 },
        y: { min: -20, max: 20 },
        speed: 10,
        lifespan: 400,
        frequency: 120,
        scale: { start: 1, end: 0 },
        emitting: false,
      }),
      55
    );
    this.haunt = this.w(
      this.add.particles(0, 0, 'fx_bolt', {
        x: { min: -90, max: 90 },
        y: { min: -60, max: 0 },
        speedY: { min: -20, max: -10 },
        lifespan: 1400,
        frequency: 380,
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      }),
      64
    );
    for (let i = 0; i < 5; i++) this.hexRunes.push(this.w(this.add.image(0, 0, 'fx_rune').setVisible(false), 64));
  }

  syncStatusFx() {
    const b = this.battle;
    const has = (s: 'player' | 'boss', id: StatusId) => b.has(s, id);
    this.fx.shield.setVisible(has('player', 'SHIELD') && (b.st('player', 'SHIELD')?.value ?? 0) > 0);
    this.fx.guard.setVisible(has('player', 'GUARD'));
    this.fx.canopy.setVisible(has('player', 'CANOPY'));
    this.fx.reprisal.setVisible(has('player', 'REPRISAL'));
    this.fx.anchor.setVisible(has('player', 'ANCHORED'));
    this.fx.spook.setVisible(has('boss', 'SPOOKED'));
    this.fx.clock.setVisible(has('boss', 'DELAYED'));
    this.bubbles.emitting = has('player', 'DROWNING');
    this.charge.emitting = has('player', 'CHARGED') || has('player', 'EMPOWER');
    this.haunt.emitting = has('boss', 'HAUNTED');
    const hex = b.st('boss', 'HEX')?.stacks ?? 0;
    this.hexRunes.forEach((r, i) => r.setVisible(i < hex));
    this.arena.setFog(has('player', 'FOGGED') ? 0.75 : b.b.phase >= 2 ? 0.28 : 0.18);
    // while the canopy is open, Umbrawl's hands spread wide, palms out
    if (!this.arena.fistLocked[0]) this.arena.setFistPose(has('player', 'CANOPY') ? 2 : 0);
    this.applyWeakTint();
  }

  applyWeakTint() {
    const weak = this.battle.has('boss', 'WEAKENED');
    this.arena.shipParts.forEach((o) => (weak ? o.setTint(0xa0a0a0) : o.clearTint()));
  }

  private updateStatusFx(dt: number) {
    const a = this.arena;
    const p = a.playerCenter();
    const t = this.time.now / 1000;
    for (const k of ['shield', 'guard', 'reprisal']) {
      const o = this.fx[k] as Phaser.GameObjects.Image;
      o.setPosition(p.x, p.y);
    }
    (this.fx.guard as Phaser.GameObjects.Image).rotation = t * 0.4;
    const rep = this.fx.reprisal as Phaser.GameObjects.Image;
    rep.setScale(1 + Math.sin(t * 8) * 0.08);
    (this.fx.shield as Phaser.GameObjects.Image).setAlpha(0.65 + Math.sin(t * 5) * 0.2);
    (this.fx.canopy as Phaser.GameObjects.Image).setPosition(p.x + 26, p.y - 2);
    (this.fx.anchor as Phaser.GameObjects.Image).setPosition(p.x - 24, p.y + 16);
    this.bubbles.setPosition(p.x, p.y);
    this.charge.setPosition(p.x, p.y);
    const cap = a.captainPoint();
    (this.fx.spook as Phaser.GameObjects.Container).setPosition(cap.x - 26, cap.y - 6 + Math.sin(t * 3) * 2);
    const c = a.shipCenter();
    (this.fx.clock as Phaser.GameObjects.Image).setPosition(c.x, c.y).setRotation(Math.sin(t) * 0.05);
    this.haunt.setPosition(c.x, c.y);
    this.hexRunes.forEach((r, i) => {
      const ang = t * 1.2 + (i / 5) * Math.PI * 2;
      r.setPosition(c.x + Math.cos(ang) * 70, c.y - 10 + Math.sin(ang) * 22);
      r.setDepth(Math.sin(ang) > 0 ? 64 : 29);
    });
    void dt;
  }

  // ================================================================ phases

  /** The fisherman loses his temper (no announcement: you can see it). */
  private async fisherRage() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.showMenu(this.menuSel, true);
    await this.camFocus(a.captainPoint(), 2.0, 600);
    a.captain.stop().setFrame(5);
    for (let i = 0; i < 3; i++) {
      sound.play('slam');
      this.shake(4, 160);
      await this.tw({ targets: a.shipOffset, y: -6, duration: 90, yoyo: true });
    }
    this.flash(0.6, 300);
    a.setPhase(2);
    sound.play('charge');
    await this.wait(700);
    await this.camHome(500);
    this.syncStatusFx();
  }

  /** Rick realises he is losing the sale. */
  private async rickRage() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.showMenu(this.menuSel, true);
    await this.camFocus(a.captainPoint(), 2.0, 600);
    a.captain.stop().setFrame(5);
    for (let i = 0; i < 3; i++) {
      sound.play('rev');
      this.shake(3, 200);
      await this.tw({ targets: a.shipOffset, x: -8, duration: 80, yoyo: true });
      await this.wait(120);
    }
    sound.play('horn');
    this.flash(0.6, 300);
    a.setPhase(2);
    await this.wait(600);
    await this.camHome(500);
    this.syncStatusFx();
  }

  /**
   * A phase change can cut off an attack the boss was still winding up (the engine
   * drops the charge). Put every part it had moved back where it rests, smoothly,
   * before the transformation plays, so nothing stays frozen mid-attack.
   */
  private async settleBoss(p: number) {
    const a = this.arena;
    const s = this as any;
    // the Dutchman's great cannon, wheeled out for COMMAND
    (s.__bigCannonPin as Phaser.Time.TimerEvent | undefined)?.remove();
    const bc = s.__bigCannon as Phaser.GameObjects.Image | undefined;
    if (bc?.active) this.tweens.add({ targets: bc, alpha: 0, duration: 300, onComplete: () => bc.destroy() });
    s.__bigCannon = undefined;
    s.__bigCannonPin = undefined;
    if (a.ti) {
      await a.ti.settle(500);
      return;
    }
    if (a.kr) {
      a.kr.tents.forEach((_, i) => a.kr!.release(i));
      a.captainIdle();
      return;
    }
    // ship / cellar bosses: the hull back on its mark, cannons lowered, idle pose
    a.cannons?.forEach((c) => this.tweens.add({ targets: c, rotation: 0, duration: 300 }));
    if (this.enemyId === 'salesman') a.wisps.emitting = false;
    if (this.enemyId === 'dutchman') a.aura.setAlpha(0.35);
    await this.tw({ targets: a.shipOffset, x: 0, y: 0, rot: 0, hover: this.enemyId === 'dutchman' && p >= 3 ? a.shipOffset.hover : 0, duration: 450, ease: 'Sine.easeInOut' });
    a.captainIdle();
  }

  async phaseTransition(p: number) {
    await this.settleBoss(p);
    if (this.enemyId === 'kraken') return this.krakenPhase(p);
    if (this.ti) return this.ti.phase(p);
    if (this.enemyId === 'fisherman') return this.fisherRage();
    if (this.enemyId === 'salesman') return this.rickRage();
    const a = this.arena;
    this.hud.setIntentVisible(false);
    a.shipFrozen = false;
    sound.play('phase');
    // the full storm theme plays from the first turn; it never drops back
    sound.setMusicPhase(Math.max(3, p));
    this.hud.showMenu(this.menuSel, true);
    await this.camTo(W / 2 + 60, ARENA_CY - 20, 0.82, 900);
    this.shake(3, 1800);
    a.lightning(true);
    await this.wait(400);
    // the ship convulses
    await this.tw({ targets: a.shipOffset, rot: -0.06, duration: 300, yoyo: true, repeat: 1 });
    await this.invert(110);
    this.flash(0.9, 500);
    a.setPhase(p);
    this.flickerShip();
    if (p === 3) {
      this.setDarkness(0.14);
      this.tweens.add({ targets: a.shipOffset, hover: 22, duration: 1600, ease: 'Sine.easeInOut' });
    }
    a.lightning(true);
    await this.camFocus(a.captainPoint(), 2.0, 900);
    a.captain.setFrame(2);
    this.shake(2, 600);
    await this.wait(400);
    a.captain.play('b_captain2_idle');
    await this.camTo(W / 2 + 40, ARENA_CY - 10, 0.88, 700);
    a.lightning(true);
    this.shake(2, 500);
    await this.wait(900);
    await this.camHome(600);
    this.syncStatusFx();
  }

  // ================================================================ endings

  private async fisherVictory() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    this.flash(0.9, 500);
    await this.invert(120);
    await this.camFocus(a.captainPoint(), 1.8, 500);
    a.captain.stop().setFrame(4);
    sound.play('heavy');
    this.shake(3, 300);
    await this.wait(600);
    await this.tw({ targets: a.shipOffset, rot: -0.25, y: 4, duration: 500, ease: 'Quad.easeIn' });
    a.captain.setFrame(7);
    a.shipOffset.rot = 0;
    sound.play('boom');
    this.shake(5, 400);
    a.wisps.emitting = false;
    await this.wait(700);
    sound.stopMusic();
    sound.play('victory');
    await this.camFocus(a.playerCenter(), 1.6, 700);
    a.player.play(this.idleAnim);
    this.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    await this.wait(900);
    this.results(true);
  }

  /** Rick goes over the handlebars. */
  private async rickVictory() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    this.hud.hideMenu();
    sound.stopMusic();
    this.flash(0.9, 500);
    await this.invert(120);
    await this.camFocus(a.captainPoint(), 1.8, 500);
    a.captain.stop().setFrame(4);
    sound.play('heavy');
    this.shake(3, 300);
    await this.wait(500);
    // the engine coughs, the bike lurches, over it goes
    sound.play('rev');
    await this.tw({ targets: a.shipOffset, x: 30, duration: 300, ease: 'Quad.easeIn' });
    sound.play('crash');
    this.shake(5, 400);
    a.captain.setFrame(7);
    a.shipOffset.x = 0;
    for (let i = 0; i < 6; i++) {
      const c = this.w(this.add.image(a.shipCenter().x + (Math.random() - 0.5) * 60, a.shipCenter().y, 'fx_card'), 64);
      this.tweens.add({ targets: c, y: c.y - 40 - Math.random() * 30, x: c.x + (Math.random() - 0.5) * 50, angle: 360, alpha: 0, duration: 1100, onComplete: () => c.destroy() });
    }
    a.wisps.emitting = false;
    await this.wait(800);
    sound.play('victory');
    await this.camFocus(a.playerCenter(), 1.6, 700);
    a.player.play(this.idleAnim);
    this.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    await this.wait(900);
    this.results(true);
  }

  async victory() {
    if (this.finS) return this.finS.victory();
    if (this.enemyId === 'kraken') return this.krakenVictory();
    if (this.ti) {
      await this.ti.victory();
      this.results(true);
      return;
    }
    if (this.enemyId === 'fisherman') return this.fisherVictory();
    if (this.enemyId === 'salesman') return this.rickVictory();
    const a = this.arena;
    const b = this.battle;
    this.hud.setIntentVisible(false);
    sound.stopMusic();
    this.flash(1, 600);
    await this.invert(150);
    this.hud.hideMenu();
    await this.wait(400);
    await this.camTo(W / 2 + 70, ARENA_CY - 10, 0.9, 700);
    a.shipFrozen = true;
    // explosions ripple along the hull
    for (let i = 0; i < 9; i++) {
      const p = a.shipPoint(-90 + Math.random() * 180, -60 + Math.random() * 60);
      this.boom(p.x, p.y, 0.8 + Math.random() * 0.8);
      sound.play(i % 2 ? 'boom' : 'cannon');
      this.shake(3, 200);
      await this.wait(140);
    }
    sound.play('wave');
    this.tweens.add({ targets: a.ship, rotation: 0.32, duration: 3200, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: a.ship, y: a.ship.y + 190, duration: 3800, ease: 'Quad.easeIn' });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(500 + i * 450, () => this.splash(a.ship.x - 80 + Math.random() * 160, 172, 1.4));
    }
    this.tweens.add({ targets: a.aura, alpha: 0, duration: 1500 });
    await this.wait(2200);
    // the storm breaks
    a.rain.emitting = false;
    a.wisps.emitting = false;
    a.phase = 0;
    a.storm = 0.4;
    this.setDarkness(0);
    this.tweens.add({ targets: this.gb, flash: 0.08, duration: 1500 });
    this.flashDecay = 0;
    this.flashAmt = 0.08;
    sound.play('victory');
    await this.camHome(800);
    await this.camFocus(a.playerCenter(), 1.6, 800);
    a.player.play(this.idleAnim);
    this.tweens.add({ targets: a.playerOffset, y: -8, duration: 300, yoyo: true, repeat: 2 });
    // Umbrawl throws both fists up in triumph
    if (a.fists.length) {
      a.setFistPose(0);
      a.fists.forEach((_, i) =>
        this.tweens.add({ targets: a.fistOff[i], x: i ? 4 : -4, y: -26, duration: 220, delay: i * 120, yoyo: true, hold: 300, repeat: 1 })
      );
    }
    await this.wait(900);
    this.results(true);
    void b;
  }

  async defeat() {
    const a = this.arena;
    this.hud.setIntentVisible(false);
    sound.stopMusic();
    sound.play('defeat');
    a.playerLocked = true;
    const pl = a.player;
    pl.stop();
    pl.setFrame(5);
    this.hud.hideMenu();
    await this.camFocus(a.playerCenter(), 2, 500);
    await this.wait(400);
    a.fists.forEach((_, i) => this.tweens.add({ targets: a.fistOff[i], x: i ? 6 : -6, y: 20, duration: 1400, ease: 'Quad.easeIn' }));
    for (let i = 0; i < 6; i++) {
      pl.setVisible(i % 2 === 0);
      await this.wait(90);
    }
    pl.setVisible(true);
    this.tweens.add({ targets: pl, angle: -70, duration: 700, ease: 'Quad.easeIn' });
    await this.tw({ targets: pl, y: pl.y + 36, alpha: 0, duration: 1600, ease: 'Quad.easeIn' });
    if (this.ti) {
      await this.ti.defeat();
      // the Reaper's fight was never one you could win: the story simply carries on
      if (this.enemyId === 'reaper') return this.toWorld('defeat');
      this.results(false);
      return;
    }
    if (this.enemyId === 'kraken') {
      // the arms close over the last of them
      const k = a.kr!;
      await this.camTo(W / 2, ARENA_CY - 20, 0.9, 700);
      a.captain.stop().setFrame(2);
      sound.play('wail');
      k.tents.forEach((t, i) => k.steer(i, PLAYER_X + (i - 2) * 14, PLAYER_Y - 10, 900, 'Quad.easeIn'));
      await this.wait(900);
      this.shake(4, 500);
      this.setDarkness(0.6);
      await this.wait(900);
      this.results(false);
      return;
    }
    if (this.indoor) {
      await this.camFocus(a.captainPoint(), 1.7, 900);
      a.captain.stop().setFrame(this.enemyId === 'salesman' ? 0 : 3);
      if (this.enemyId === 'salesman') sound.play('rev');
      this.shake(2, 400);
      await this.wait(1200);
      await this.camHome(700);
      this.results(false);
      return;
    }
    this.splash(pl.x, 196, 1.2);
    // the Dutchman dominates the sea
    this.setDarkness(0.25);
    await this.camFocus(a.captainPoint(), 1.6, 1200);
    a.captain.setFrame(2);
    a.lightning(true);
    this.shake(3, 600);
    sound.play('horn');
    await this.wait(1400);
    await this.camTo(W / 2 + 30, ARENA_CY - 20, 0.86, 900);
    this.results(false);
  }

  /** ROGUELIKE: leave for another scene, cleaning up the way every exit from a battle does. */
  leaveTo(key: string, data: object = {}) {
    teardownLayers(this, [this.worldLayer, this.uiLayer]);
    this.scene.start(key, data);
  }

  private results(won: boolean) {
    // ROGUELIKE: no results screen and nothing written anywhere: the run carries on
    if (this.rogue) return void this.rogue.finished();
    const b = this.battle;
    // a loss unlocks fast-forward for the next try at this same encounter
    if (!won && this.story) markLost(this.enemyId);
    this.ffBtn?.setVisible(false);
    const c = this.uiObj(this.add.container(0, 0));
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) g.fillStyle(C.dark, 1).fillRect(0, y, W, 1);
    box(g, 12, 10, W - 24, H - 20, 'dark');
    const fisher = this.indoor;
    const TITAN_TITLES: Record<string, [string, string]> = {
      scorvex: ['SCORVEX IS DEFEATED!', 'SCORVEX STANDS OVER THE STREET...'],
      widowmaker: ['WIDOWMAKER IS DEFEATED!', 'CAUGHT IN THE WEB...'],
      ironclad: ['IRONCLAD HAS FALLEN!', 'THE HAMMER CAME DOWN...'],
      champion: ['THE CHAMPION IS DEFEATED!', 'FLATTENED BY THE CHAMPION...'],
      wispmane: ['WISPMANE IS DEFEATED!', 'THE FOREST WINS...'],
      crow: ['THE MUTANT CROW IS DEFEATED!', 'BLOWN OFF THE NEST...'],
      subject: ['THE EXPERIMENT IS OVER.', 'OVERLOADED...'],
      squirrel: ['THE TREE GUARDIAN IS DEFEATED!', 'BURIED IN NUTS...'],
      viperwind: ['VIPERWIND IS DEFEATED!', 'SWEPT AWAY BY THE WIND...'],
      reaper: ['...', '...'],
      skelwarden: ['THE WARDEN IS DEFEATED!', 'BACK IN YOUR CELL...'],
      sc_booheet: ['BOOHEET IS SPENT!', 'IT DID NOT EVEN KNOW YOU...'],
      sc_shipwraith: ['SHIPWRAITH IS SPENT!', 'SUNK BY YOUR OWN SHIP...'],
      sc_hauntcorn: ['HAUNTCORN IS SPENT!', 'LOST IN THE CORN...'],
      sc_umbrawl: ['UMBRAWL IS SPENT!', 'WASHED AWAY...'],
      sc_tickraith: ['TICKRAITH IS SPENT!', 'OUT OF TIME...'],
      gr1: ['', 'REAPED...'],
      gr2: ['', 'FLATTENED BY A VERY LARGE SKELETON...'],
      gr3: ['', 'THE GOD OF DEATH STILL STANDS...'],
      gr4: ['', 'NOT LIKE THIS. GET UP.'],
    };
    const title = this.ti
      ? (TITAN_TITLES[this.enemyId] ?? [`${this.battle.enemy.name} IS DEFEATED!`, 'DEFEATED...'])[won ? 0 : 1]
      : this.enemyId === 'kraken'
      ? won
        ? 'THE KRAKEN IS DEFEATED!'
        : 'DRAGGED DOWN INTO THE DEEP...'
      : this.enemyId === 'salesman'
      ? won
        ? 'SLICK RICK IS DEFEATED!'
        : 'NO REFUNDS...'
      : this.enemyId === 'fisherman'
      ? won
        ? 'THE ANGRY FISHERMAN IS DEFEATED!'
        : 'KNOCKED OUT IN THE CELLAR...'
      : won
        ? 'YOU HAVE DEFEATED THE FLYING DUTCHMAN!'
        : 'YOUR SOUL BELONGS TO THE ENDLESS SEA.';
    // maxWidth is measured after scaling, so 360 here means ~22 large characters per line
    const t = txt(this, W / 2, 20, title, { outline: true, origin: [0.5, 0], maxW: 360, align: 'center' }).setScale(2);
    c.add(t);
    const ty = 20 + t.height + 10;
    // champion portrait
    g.fillStyle(C.dark, 1).fillRect(26, ty, 100, 104);
    g.fillStyle(C.black, 1).fillRect(28, ty + 2, 96, 100);
    const spr = this.add.sprite(76, ty + 100, 'cr_' + this.creature.id, won ? 0 : 5).setOrigin(0.5, 1);
    spr.setScale(Math.min(2, 96 / spr.height, 94 / spr.width));
    if (won) spr.play(`cr_${this.creature.id}_idle`);
    else spr.setAlpha(0.6);
    c.add(spr);
    c.add(txt(this, 76, ty + 108, this.creature.name, { origin: [0.5, 0] }));
    const st = b.stats;
    const rows: [string, string][] = won
      ? [
          ['TURNS SURVIVED', `${st.turns}`],
          ['TOTAL DAMAGE DEALT', `${st.damageDealt}`],
          ['REMAINING HP', `${b.p.hp}/${b.p.maxHp}`],
          ['MAJOR ATTACKS SURVIVED', `${st.majorSurvived}`],
        ]
      : [
          ['TURNS SURVIVED', `${st.turns}`],
          ['DAMAGE DEALT', `${st.damageDealt}`],
          ['BOSS HP REMAINING', `${b.b.hp}/${b.b.maxHp}`],
          ...((fisher || this.enemyId === 'kraken' || this.ti ? [] : [['PHASE REACHED', `${['', 'I', 'II', 'III'][b.b.phase]} - ${PHASE_NAMES[b.b.phase - 1]}`]]) as [string, string][]),
          ['ATTACKS SURVIVED', `${st.attacksSurvived}`],
          ['MAJOR ATTACKS SURVIVED', `${st.majorSurvived}`],
        ];
    rows.forEach(([k, v], i) => {
      const y = ty + 4 + i * (won ? 26 : 18);
      c.add(txt(this, 140, y, k, { color: C.mid }));
      c.add(txt(this, 140, y + 9, v, { color: C.white }));
    });
    // buttons
    const btns = this.story
      ? won
        ? [{ label: 'CONTINUE', act: () => this.toWorld('victory') }]
        : this.finS
          ? [{ label: 'TRY AGAIN', act: () => this.restart(this.creature.id) }]
          : fisher || this.enemyId === 'kraken' || this.ti
          ? [
              { label: 'TRY AGAIN', act: () => this.restart(this.creature.id) },
              { label: this.ti ? (this.enemyId in PRISON_FOES ? 'BACK TO THE PRISON' : isSpirit(this.enemyId) ? 'BACK TO THE ISLAND' : 'BACK TO TOWN') : this.enemyId === 'kraken' ? 'BACK TO THE VAULT' : this.enemyId === 'salesman' ? 'BACK TO THE STORE' : 'BACK TO THE CELLAR', act: () => this.toWorld('defeat') },
            ]
          : [{ label: 'RETURN TO THE DOCK', act: () => this.toWorld('defeat') }]
      : won
        ? [
            { label: 'FIGHT AGAIN', act: () => this.restart(this.creature.id) },
            { label: 'NEW CHAMPION', act: () => this.toSelect() },
          ]
        : [
            { label: 'TRY AGAIN', act: () => this.restart(this.creature.id) },
            { label: 'SELECT A DIFFERENT CREATURE', act: () => this.toSelect() },
          ];
    const bg = this.add.graphics();
    c.add(bg);
    const by = H - 40;
    const bw = btns.length === 1 ? [180] : [120, 200];
    const xs = btns.length === 1 ? [W / 2 - 90] : [W / 2 - (bw[0] + bw[1] + 10) / 2, 0];
    if (btns.length > 1) xs[1] = xs[0] + bw[0] + 10;
    const labels = btns.map((bt, i) => {
      const l = txt(this, xs[i] + bw[i] / 2, by + 7, bt.label, { origin: [0.5, 0] });
      c.add(l);
      return l;
    });
    this.resultSel = 0;
    this.resultRedraw = () => {
      bg.clear();
      btns.forEach((_, i) => {
        const on = i === this.resultSel;
        box(bg, xs[i], by, bw[i], 22, on ? 'light' : 'dark');
        labels[i].setTint(on ? C.black : C.white);
      });
    };
    this.resultButtons = btns.map((bt, i) => {
      const z = this.uiObj(this.add.zone(xs[i], by, bw[i], 22).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
      z.on('pointerover', () => {
        this.resultSel = i;
        this.resultRedraw?.();
      });
      z.on('pointerdown', () => bt.act());
      return { zone: z, act: bt.act };
    });
    this.resultRedraw();
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 500 });
  }

  private leaving = false;
  private restart(id: string) {
    if (this.leaving) return;
    this.leaving = true;
    sound.play('select');
    this.cameras.main.fadeOut(300);
    this.uiCam.fadeOut(300);
    this.uiCam.once('camerafadeoutcomplete', () => {
      this.leaving = false;
      teardownLayers(this, [this.worldLayer, this.uiLayer]);
      this.scene.restart({ creature: this.party0 ?? id, sel: this.sel, enemy: this.enemyId, story: this.story, partner: this.partnerId, partner2: this.partner2Id, party: this.partyIds ?? undefined, fin: this.finS?.retryCfg() ?? this.fin });
    });
  }

  /** The last battle: straight on into the next form of the fight (no results screen). */
  chainTo(enemy: TitanId, party: string[], fin: FinCfg, fadeMs = 600) {
    // ROGUELIKE: the host starts his next form; this screen only has to let go
    if (this.rogue) return void this.rogue.finished();
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(fadeMs, 0, 0, 0);
    this.uiCam.fadeOut(fadeMs, 0, 0, 0);
    this.uiCam.once('camerafadeoutcomplete', () => {
      this.leaving = false;
      teardownLayers(this, [this.worldLayer, this.uiLayer]);
      this.scene.restart({ creature: party[0], enemy, story: this.story, party, fin });
    });
  }

  /** Back to the overworld with the battle's outcome. */
  toWorld(result: 'victory' | 'defeat') {
    if (this.rogue) return void this.rogue.finished();
    if (this.leaving) return;
    this.leaving = true;
    sound.play('select');
    sound.stopMusic();
    this.cameras.main.fadeOut(400);
    this.uiCam.fadeOut(400);
    this.uiCam.once('camerafadeoutcomplete', () => {
      this.leaving = false;
      teardownLayers(this, [this.worldLayer, this.uiLayer]);
      this.scene.start('world', { battle: { enemy: this.enemyId, result } });
    });
  }

  private toSelect() {
    if (this.leaving) return;
    this.leaving = true;
    sound.play('back');
    this.cameras.main.fadeOut(300);
    this.uiCam.fadeOut(300);
    this.uiCam.once('camerafadeoutcomplete', () => {
      this.leaving = false;
      teardownLayers(this, [this.worldLayer, this.uiLayer]);
      this.scene.start('select', { sel: this.sel });
    });
  }

  // helpers used by anims
  playerAt(dx = 0, dy = 0): Pt {
    const p = this.arena.playerCenter();
    return { x: p.x + dx, y: p.y + dy };
  }
  get playerHome(): Pt {
    return { x: PLAYER_X, y: PLAYER_Y };
  }
  resultOf(res: ActionResult) {
    return res;
  }
}
