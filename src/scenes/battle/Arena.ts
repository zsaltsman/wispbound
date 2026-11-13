import Phaser from 'phaser';
import { HULL_W, HULL_H, MASTS, MAST_TOP, SAILS } from '../../gfx/artBoss';
import { sound } from '../../audio/audio';
import { settings } from '../../settings';
import type { BattleScene } from '../BattleScene';
import { KrakenRig } from './KrakenRig';
import { TitanRig } from './TitanRig';
import { isTitan } from '../../engine/titans';

// The living storm arena: parallax sky and sea, the Flying Dutchman built from
// animated parts, the player's raft, debris, rain, fog and lightning.

export const HORIZON = 86;
export const SHIP_X = 292; // ship origin = waterline centre
export const SHIP_Y = 160;
export const PLAYER_X = 84;
export const PLAYER_Y = 180;

const HULL_LEFT = -HULL_W / 2;
const HULL_TOP = -HULL_H + 10;
const DECK = HULL_TOP + 25;

export class Arena {
  s: BattleScene;
  layer: Phaser.GameObjects.Layer;
  // ship
  ship!: Phaser.GameObjects.Container;
  hull!: Phaser.GameObjects.Image;
  glow!: Phaser.GameObjects.Image;
  masts!: Phaser.GameObjects.Image;
  sails: Phaser.GameObjects.Sprite[] = [];
  captain!: Phaser.GameObjects.Sprite;
  cannons: Phaser.GameObjects.Image[] = [];
  chains: Phaser.GameObjects.Sprite[] = [];
  flag!: Phaser.GameObjects.Sprite;
  aura!: Phaser.GameObjects.Image;
  foam!: Phaser.GameObjects.Sprite;
  shipParts: (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] = [];
  // player
  raft!: Phaser.GameObjects.Image;
  player!: Phaser.GameObjects.Sprite;
  // environment
  tiles: { t: Phaser.GameObjects.TileSprite; v: number; bob: number; y: number }[] = [];
  debris: { o: Phaser.GameObjects.Image; v: number; y: number; ph: number }[] = [];
  fogs: Phaser.GameObjects.Image[] = [];
  rain!: Phaser.GameObjects.Particles.ParticleEmitter;
  wisps!: Phaser.GameObjects.Particles.ParticleEmitter;
  bolts: Phaser.GameObjects.Image[] = [];
  clouds: Phaser.GameObjects.TileSprite[] = [];

  // animation state
  phase = 1;
  storm = 1; // 1..3
  t = 0;
  shipFrozen = false;
  shipOffset = { x: 0, y: 0, rot: 0, hover: 0 };
  playerOffset = { x: 0, y: 0 };
  playerLocked = false; // animations drive the player sprite directly
  // Umbrawl's two floating fists (index 0 = left, 1 = right), relative to the sprite's feet
  fists: Phaser.GameObjects.Sprite[] = [];
  fistHome = [
    { x: -13, y: -13 },
    { x: 13, y: -15 },
  ];
  fistOff = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  fistLocked = [false, false]; // an animation positions this fist itself
  private nextJab = 3500;
  fogLevel = 0.18;
  private fogTarget = 0.18;
  private nextBolt = 2500;
  private chainPhase: number[] = [];
  // the Kraken's drowned temple
  kr: KrakenRig | null = null;
  /** World 3: Scorvex, Widowmaker or Ironclad */
  ti: TitanRig | null = null;
  /** the partner waiting behind the active creature (two-creature fights) */
  reserve: Phaser.GameObjects.Sprite | null = null;
  // the cellar (fisherman fight)
  cellar = false;
  private cone?: Phaser.GameObjects.Image;
  private bulbImg?: Phaser.GameObjects.Image;
  private bucket?: Phaser.GameObjects.Image;

  constructor(s: BattleScene, layer: Phaser.GameObjects.Layer) {
    this.s = s;
    this.layer = layer;
    this.build();
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T, depth: number): T {
    (o as any).setDepth?.(depth);
    this.layer.add(o);
    return o;
  }

  private build() {
    const s = this.s;
    if (s.enemyId === 'fisherman') {
      this.buildCellar();
      return;
    }
    if (s.enemyId === 'salesman') {
      this.buildStore();
      return;
    }
    if (isTitan(s.enemyId)) {
      this.ti = new TitanRig(this, s.enemyId);
      this.raft = this.add(s.add.ellipse(PLAYER_X, PLAYER_Y + 2, 40, 8, 0x000000).setAlpha(0.5) as any, 50);
      this.player = this.add(s.add.sprite(PLAYER_X, PLAYER_Y, s.bodyKey, 0).setOrigin(0.5, 1), 51);
      this.player.play(s.idleAnim);
      this.buildFists();
      this.reserve = this.add(s.add.sprite(PLAYER_X - 52, PLAYER_Y - 4, 'fx_px').setOrigin(0.5, 1).setScale(0.7).setAlpha(0.8), 49);
      // World 4: the third creature waits further back still
      if (s.battle.party.length > 2) this.reserve2 = this.add(s.add.sprite(PLAYER_X - 84, PLAYER_Y - 8, 'fx_px').setOrigin(0.5, 1).setScale(0.55).setAlpha(0.6), 48);
      // the last battle: a back row for the rest of a big team
      if (s.battle.party.length > 3) this.reserve3 = this.add(s.add.sprite(PLAYER_X - 30, PLAYER_Y - 30, 'fx_px').setOrigin(0.5, 1).setScale(0.45).setAlpha(0.5), 47);
      if (s.battle.party.length > 4) this.reserve4 = this.add(s.add.sprite(PLAYER_X - 66, PLAYER_Y - 34, 'fx_px').setOrigin(0.5, 1).setScale(0.4).setAlpha(0.45), 46);
      this.showReserve();
      return;
    }
    if (s.enemyId === 'kraken') {
      this.kr = new KrakenRig(this);
      this.raft = this.add(s.add.ellipse(PLAYER_X, PLAYER_Y + 2, 40, 8, 0x000000).setAlpha(0.5) as any, 50);
      this.player = this.add(s.add.sprite(PLAYER_X, PLAYER_Y, s.bodyKey, 0).setOrigin(0.5, 1), 51);
      this.player.play(s.idleAnim);
      this.buildFists();
      this.reserve = this.add(s.add.sprite(PLAYER_X - 52, PLAYER_Y - 4, 'fx_px').setOrigin(0.5, 1).setScale(0.7).setAlpha(0.8), 49);
      this.showReserve();
      return;
    }
    // sky & far layers
    this.add(s.add.image(-140, -84, 'sky').setOrigin(0, 0).setScrollFactor(0.1, 0.4), 0);
    this.add(s.add.image(70, 6, 'moon').setScrollFactor(0.08, 0.3), 1);
    const cf = this.add(s.add.tileSprite(-200, -6, 800, 70, 'clouds_far').setOrigin(0, 0).setScrollFactor(0.15, 0.4), 2);
    for (let i = 0; i < 3; i++) {
      const b = this.add(s.add.image(0, -10, 'bolt' + i).setOrigin(0.5, 0).setScrollFactor(0.2, 0.4).setVisible(false), 3);
      this.bolts.push(b);
    }
    const cn = this.add(s.add.tileSprite(-200, 26, 800, 60, 'clouds_near').setOrigin(0, 0).setScrollFactor(0.25, 0.5), 4);
    this.clouds = [cf, cn];
    this.add(s.add.image(-20, HORIZON + 1, 'rocks').setOrigin(0, 1).setScrollFactor(0.3, 1), 5);
    this.add(s.add.image(330, HORIZON + 1, 'rocks').setOrigin(0, 1).setScrollFactor(0.3, 1).setFlipX(true).setScale(0.6, 0.5), 5);

    // sea
    this.add(s.add.image(-160, HORIZON, 'sea_base').setOrigin(0, 0), 10);
    const strip = (key: string, y: number, h: number, sf: number, v: number, bob: number, depth: number) => {
      const t = this.add(s.add.tileSprite(-300, y, 1000, h, key).setOrigin(0, 0).setScrollFactor(sf, 1), depth);
      this.tiles.push({ t, v, bob, y });
      return t;
    };
    strip('sea_far', HORIZON, 14, 0.6, 0.008, 0.5, 11);
    strip('sea_mid', HORIZON + 10, 22, 0.75, 0.014, 1, 12);
    strip('sea_near', HORIZON + 28, 30, 0.9, 0.02, 1.5, 13);
    strip('sea_mid', HORIZON + 46, 22, 0.95, 0.025, 1.5, 14);

    // the ship
    this.buildShip();
    strip('sea_near', SHIP_Y - 8, 30, 1, 0.03, 2, 35);
    strip('sea_mid', SHIP_Y + 12, 22, 1.05, 0.034, 2, 36);

    // debris
    const items: [string, number, number][] = [
      ['d_barrel', 30, 168],
      ['d_plank', 170, 182],
      ['d_crate', 250, 196],
      ['d_mast', 360, 176],
      ['d_plank', -20, 196],
      ['d_barrel', 200, 160],
    ];
    items.forEach(([k, x, y], i) => {
      const o = this.add(s.add.image(x, y, k), 40);
      this.debris.push({ o, v: 0.004 + (i % 3) * 0.002, y, ph: i * 1.7 });
    });

    // raft + champion
    this.raft = this.add(s.add.image(PLAYER_X, PLAYER_Y + 2, 'raft'), 50);
    this.player = this.add(s.add.sprite(PLAYER_X, PLAYER_Y, s.bodyKey, 0).setOrigin(0.5, 1), 51);
    this.player.play(s.idleAnim);
    if (s.creature.id === 'umbrawl') {
      for (let i = 0; i < 2; i++) this.fists.push(this.add(s.add.sprite(PLAYER_X, PLAYER_Y, 'u_fist', 0), 52));
    }

    strip('sea_front', PLAYER_Y + 12, 44, 1.2, 0.045, 2.5, 70);

    // fog banks
    for (let i = 0; i < 6; i++) {
      const f = this.add(
        s.add
          .image(-60 + i * 90, HORIZON + 30 + (i % 3) * 30, 'fx_fog' + (i % 3))
          .setScale(1.6, 1)
          .setAlpha(0.2),
        80
      );
      this.fogs.push(f);
    }

    // rain (screen-anchored)
    this.rain = this.add(
      s.add.particles(0, 0, 'fx_rain', {
        x: { min: -120, max: 520 },
        y: -60,
        lifespan: 1100,
        speedY: { min: 300, max: 380 },
        speedX: { min: -90, max: -60 },
        frequency: 22,
        quantity: 1,
        alpha: { start: 0.9, end: 0.5 },
      }),
      85
    );
    this.rain.setScrollFactor(0);

    // ghostly wisps around the hull (phase 2+)
    this.wisps = this.add(
      s.add.particles(0, 0, 'fx_puff', {
        frame: [0, 1, 2],
        x: { min: SHIP_X - 100, max: SHIP_X + 100 },
        y: { min: SHIP_Y - 60, max: SHIP_Y - 10 },
        lifespan: 2200,
        speedY: { min: -18, max: -8 },
        speedX: { min: -8, max: 8 },
        alpha: { start: 0.6, end: 0 },
        scale: { start: 0.6, end: 1.4 },
        frequency: 260,
        emitting: false,
      }),
      31
    );
  }

  /** The wrecked grocery store: shelves, a hole in the wall, Rick on his bike. */
  private buildStore() {
    const s = this.s;
    this.cellar = true;
    this.bossKey = 'rk';
    this.storm = 1;
    this.add(s.add.image(-120, -60, 's_wall').setOrigin(0, 0).setScrollFactor(0.7, 0.85), 0);
    this.add(s.add.image(-160, 112, 's_floor').setOrigin(0, 0), 10);
    this.add(s.add.image(-36, 108, 'c_crates').setOrigin(0, 0), 20);
    this.cone = this.add(s.add.image(200, 128, 'light').setScale(4.2, 3).setAlpha(0.3), 12);
    this.bulbImg = this.add(s.add.image(200, -14, 's_tube').setOrigin(0.5, 0), 13);
    const c = s.add.container(SHIP_X + 4, PLAYER_Y + 8);
    this.ship = this.add(c, 30);
    const shadow = s.add.ellipse(0, -2, 100, 12, 0x000000).setAlpha(0.5);
    this.captain = s.add.sprite(0, 0, 'rk', 0).setOrigin(0.5, 1);
    this.captain.play('rk_idle');
    c.add([shadow, this.captain]);
    const dummy = () => s.add.image(0, 0, 'fx_px').setVisible(false);
    this.hull = dummy();
    this.glow = dummy();
    this.masts = dummy();
    this.aura = dummy();
    this.flag = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    this.foam = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    c.add([this.hull, this.glow, this.masts, this.aura, this.flag, this.foam]);
    this.shipParts = [this.captain];
    this.raft = this.add(s.add.ellipse(PLAYER_X, PLAYER_Y + 2, 40, 8, 0x000000).setAlpha(0.5) as any, 50);
    this.player = this.add(s.add.sprite(PLAYER_X, PLAYER_Y, s.bodyKey, 0).setOrigin(0.5, 1), 51);
    this.player.play(s.idleAnim);
    if (s.creature.id === 'umbrawl') {
      for (let i = 0; i < 2; i++) this.fists.push(this.add(s.add.sprite(PLAYER_X, PLAYER_Y, 'u_fist', 0), 52));
    }
    // dust in the light from the hole in the wall
    this.add(
      s.add.particles(0, 0, 'fx_px', {
        x: { min: 260, max: 420 },
        y: { min: 20, max: 160 },
        lifespan: 3000,
        speedX: { min: -10, max: -3 },
        speedY: { min: 2, max: 8 },
        alpha: { start: 0.8, end: 0 },
        frequency: 120,
      }),
      14
    );
    this.rain = this.add(s.add.particles(0, 0, 'fx_rain', { emitting: false }), 85);
    // exhaust smoke once he gets angry
    this.wisps = this.add(
      s.add.particles(0, 0, 'fx_puff', {
        frame: [0, 1, 2],
        x: { min: SHIP_X + 50, max: SHIP_X + 70 },
        y: PLAYER_Y - 10,
        lifespan: 900,
        speedY: { min: -30, max: -15 },
        speedX: { min: 10, max: 30 },
        alpha: { start: 0.6, end: 0 },
        scale: { start: 0.4, end: 1.2 },
        frequency: 140,
        emitting: false,
      }),
      31
    );
  }

  /** A dim storage cellar under a swinging bulb, and Old Grundy guarding his bait. */
  private buildCellar() {
    const s = this.s;
    this.cellar = true;
    this.storm = 1;
    this.add(s.add.image(-120, -64, 'c_wall').setOrigin(0, 0).setScrollFactor(0.7, 0.85), 0);
    this.add(s.add.image(-160, 112, 'c_floor').setOrigin(0, 0), 10);
    this.add(s.add.image(-36, 106, 'c_crates').setOrigin(0, 0), 20);
    this.add(s.add.image(360, 100, 'c_crates').setOrigin(0, 0).setFlipX(true), 20);
    this.cone = this.add(s.add.image(200, 128, 'light').setScale(3.6, 2.8).setAlpha(0.34), 12);
    this.bulbImg = this.add(s.add.image(200, -14, 'c_bulb').setOrigin(0.5, 0), 13);
    // the fisherman stands where the ship would
    const c = s.add.container(SHIP_X + 8, PLAYER_Y + 6);
    this.ship = this.add(c, 30);
    const shadow = s.add.ellipse(0, -2, 70, 10, 0x000000).setAlpha(0.5);
    this.captain = s.add.sprite(0, 0, 'fm', 0).setOrigin(0.5, 1);
    this.captain.play('fm_idle');
    this.bucket = s.add.image(46, 0, 'c_bucket').setOrigin(0.5, 1);
    c.add([shadow, this.captain, this.bucket]);
    const dummy = () => s.add.image(0, 0, 'fx_px').setVisible(false);
    this.hull = dummy();
    this.glow = dummy();
    this.masts = dummy();
    this.aura = dummy();
    this.flag = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    this.foam = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    c.add([this.hull, this.glow, this.masts, this.aura, this.flag, this.foam]);
    this.shipParts = [this.captain, this.bucket];
    // the champion on the cellar floor
    this.raft = this.add(s.add.ellipse(PLAYER_X, PLAYER_Y + 2, 40, 8, 0x000000).setAlpha(0.5) as any, 50);
    this.player = this.add(s.add.sprite(PLAYER_X, PLAYER_Y, s.bodyKey, 0).setOrigin(0.5, 1), 51);
    this.player.play(s.idleAnim);
    if (s.creature.id === 'umbrawl') {
      for (let i = 0; i < 2; i++) this.fists.push(this.add(s.add.sprite(PLAYER_X, PLAYER_Y, 'u_fist', 0), 52));
    }
    // dust in the light, steam for when he loses his temper
    this.add(
      s.add.particles(0, 0, 'fx_px', {
        x: { min: 100, max: 300 },
        y: { min: 20, max: 200 },
        lifespan: 4000,
        speedX: { min: -4, max: 4 },
        speedY: { min: -3, max: 3 },
        alpha: { start: 0.7, end: 0 },
        frequency: 160,
      }),
      14
    );
    this.rain = this.add(s.add.particles(0, 0, 'fx_rain', { emitting: false }), 85);
    this.wisps = this.add(
      s.add.particles(0, 0, 'fx_puff', {
        frame: [0, 1, 2],
        x: { min: SHIP_X - 10, max: SHIP_X + 26 },
        y: PLAYER_Y - 88,
        lifespan: 900,
        speedY: { min: -40, max: -20 },
        speedX: { min: -12, max: 12 },
        alpha: { start: 0.7, end: 0 },
        scale: { start: 0.4, end: 1 },
        frequency: 120,
        emitting: false,
      }),
      31
    );
  }

  private buildFists() {
    const s = this.s;
    this.fists.forEach((f) => f.destroy());
    this.fists = [];
    if (s.creature.id === 'umbrawl') {
      for (let i = 0; i < 2; i++) this.fists.push(this.add(s.add.sprite(PLAYER_X, PLAYER_Y, 'u_fist', 0), 52));
    }
  }

  /** The partner on the bench, standing a little behind (smaller, dimmer). */
  showReserve() {
    const r = this.s.battle.reserve();
    if (!this.reserve) return;
    if (!r) {
      this.reserve.setVisible(false);
      return;
    }
    const show = (spr: Phaser.GameObjects.Sprite, m: typeof r, alpha: number) => {
      const key = 'cr_' + m.creature.id;
      spr.setTexture(key, 0).setVisible(true);
      // big bodies (supercharged, the guardian) shrink to fit the bench
      const base = spr === this.reserve ? 0.7 : spr === this.reserve2 ? 0.55 : spr === this.reserve3 ? 0.45 : 0.4;
      spr.setScale(base * Math.min(1, 60 / spr.frame.height));
      if (m.p.hp <= 0) spr.stop().setFrame(5).setAlpha(alpha * 0.45).setAngle(-80);
      else spr.setAlpha(alpha).setAngle(0).play(`${key}_idle`);
    };
    show(this.reserve, r, 0.8);
    const others = this.s.battle.bench().filter((m) => m !== r);
    const rows: [Phaser.GameObjects.Sprite | undefined, number][] = [
      [this.reserve2, 0.6],
      [this.reserve3, 0.5],
      [this.reserve4, 0.45],
    ];
    rows.forEach(([spr, al], i) => {
      if (!spr) return;
      if (others[i]) show(spr, others[i], al);
      else spr.setVisible(false);
    });
  }
  reserve2?: Phaser.GameObjects.Sprite;
  reserve3?: Phaser.GameObjects.Sprite;
  reserve4?: Phaser.GameObjects.Sprite;

  /** After a swap: the new creature takes the field sprite (and Umbrawl gets its fists back). */
  setChampion() {
    this.player.setTexture(this.s.bodyKey, 0).setAngle(0).setAlpha(1).setVisible(true);
    this.player.play(this.s.idleAnim);
    this.buildFists();
    this.showReserve();
  }

  /** sprite sheet of the indoor boss ('fm' Grundy, 'rk' Rick) */
  bossKey = 'fm';

  /** The boss's resting animation (captain on the ship, or Grundy in the cellar). */
  captainIdle() {
    if (this.kr) return void this.captain.play(this.phase >= 2 ? 'kr_idle2' : 'kr_idle');
    if (this.ti) return void this.ti.core.setFrame(this.ti.restFrame());
    if (this.cellar) this.captain.play(this.phase >= 2 ? `${this.bossKey}_idle2` : `${this.bossKey}_idle`);
    else this.captain.play(this.phase >= 2 ? 'b_captain2_idle' : 'b_captain_idle');
  }

  private buildShip() {
    const s = this.s;
    const c = s.add.container(SHIP_X, SHIP_Y);
    this.ship = this.add(c, 30);
    this.aura = s.add.image(0, -70, 'b_aura').setAlpha(0);
    c.add(this.aura);
    this.masts = s.add.image(HULL_LEFT, DECK - (MAST_TOP + 25), 'b_masts').setOrigin(0, 0);
    c.add(this.masts);
    // flag on the main mast
    const mm = MASTS[1];
    this.flag = s.add.sprite(HULL_LEFT + mm.x + 1, DECK - mm.h - 4, 'b_flag').setOrigin(0, 0.5);
    this.flag.play('b_flag_wave');
    c.add(this.flag);
    // sails
    SAILS.forEach(([mi, yi, w, h], i) => {
      const m = MASTS[mi];
      const top = DECK - m.h;
      const bottom = m.x >= 150 ? DECK - 18 : DECK;
      const yy = Math.round(top + (bottom - top) * m.yards[yi]);
      const sp = s.add.sprite(HULL_LEFT + m.x, yy + 1, `b_sail${i}`).setOrigin((4 + w / 2) / (w + 8), 0);
      sp.play({ key: `b_sail${i}_wave`, startFrame: i % 3 });
      this.sails.push(sp);
      c.add(sp);
    });
    // captain on the stern castle
    this.captain = s.add.sprite(HULL_LEFT + 180, HULL_TOP + 9, 'b_captain').setOrigin(0.5, 1);
    this.captain.play('b_captain_idle');
    c.add(this.captain);
    // chains hanging into the sea
    for (const hx of [52, 96, 142, 186]) {
      const ch = s.add.sprite(HULL_LEFT + hx, HULL_TOP + 62 - (hx > 170 ? 8 : 0), 'b_chain', hx % 2).setOrigin(0.5, 0);
      this.chains.push(ch);
      this.chainPhase.push(hx * 0.05);
      c.add(ch);
    }
    this.hull = s.add.image(HULL_LEFT, HULL_TOP, 'b_hull').setOrigin(0, 0);
    c.add(this.hull);
    this.glow = s.add.image(HULL_LEFT, HULL_TOP, 'b_glow').setOrigin(0, 0).setAlpha(0.6);
    c.add(this.glow);
    // cannons at the gun ports
    for (let x = 66; x < 150; x += 20) {
      // flipped so the muzzle points left; origin sits on the breech so it can aim
      const cn = s.add.image(HULL_LEFT + x + 8, HULL_TOP + 36, 'b_cannon').setOrigin(0.85, 0.5).setFlipX(true);
      this.cannons.push(cn);
      c.add(cn);
    }
    this.foam = s.add.sprite(-120, -4, 'b_foam').setOrigin(0, 0);
    this.foam.play('b_foam_roll');
    c.add(this.foam);
    this.shipParts = [this.masts, this.flag, ...this.sails, this.captain, ...this.chains, this.hull, this.glow, ...this.cannons];
  }

  // -------------------------------------------------------------- world points

  /** World position of a point given in ship-local coordinates (accounts for movement). */
  shipPoint(lx: number, ly: number) {
    const c = this.ship;
    const cos = Math.cos(c.rotation);
    const sin = Math.sin(c.rotation);
    return { x: c.x + lx * cos - ly * sin, y: c.y + lx * sin + ly * cos };
  }
  cannonMuzzle(i: number) {
    const cn = this.cannons[i % this.cannons.length];
    return this.shipPoint(cn.x - 12 * Math.cos(cn.rotation), cn.y - 12 * Math.sin(cn.rotation));
  }
  captainPoint() {
    if (this.kr) return this.kr.eye();
    if (this.ti) return this.ti.eye();
    if (this.cellar) return this.shipPoint(this.bossKey === 'rk' ? 4 : 0, this.bossKey === 'rk' ? -78 : -72);
    return this.shipPoint(this.captain.x, this.captain.y - 18);
  }
  shipCenter() {
    if (this.kr) return { x: this.kr.body.x - 40, y: this.kr.body.y - 60 };
    if (this.ti) return this.ti.center();
    return this.shipPoint(-10, -40);
  }
  hullPoint() {
    if (this.ti) return this.ti.center();
    return this.shipPoint(-30, -30);
  }
  playerCenter() {
    return { x: this.player.x, y: this.player.y - 22 };
  }

  // -------------------------------------------------------------- per frame

  update(dt: number) {
    this.t += dt;
    const t = this.t / 1000;
    const st = this.storm;
    if (this.ti) {
      this.ti.update(dt, t);
      this.updateFists(dt, t);
      if (this.reserve && this.reserve.visible) this.reserve.y = PLAYER_Y - 4 + Math.sin(t * 1.4 + 1) * 1;
      return;
    }
    if (this.kr) {
      this.kr.update(dt, t);
      this.updateFists(dt, t);
      if (this.reserve && this.reserve.visible) this.reserve.y = PLAYER_Y - 4 + Math.sin(t * 1.4 + 1) * 1;
      return;
    }
    if (this.cellar) {
      this.updateCellar(dt, t);
      return;
    }
    for (const tl of this.tiles) {
      tl.t.tilePositionX += dt * tl.v * (0.8 + st * 0.35);
      tl.t.y = tl.y + Math.sin(t * (0.9 + st * 0.25) + tl.y * 0.05) * tl.bob * (0.7 + st * 0.3);
    }
    this.clouds[0].tilePositionX += dt * 0.004 * st;
    this.clouds[1].tilePositionX += dt * 0.009 * st;
    for (const d of this.debris) {
      d.o.x -= dt * d.v * st;
      if (d.o.x < -60) d.o.x = 460;
      d.o.y = d.y + Math.sin(t * 1.4 + d.ph) * 2 * st;
      d.o.rotation = Math.sin(t * 1.1 + d.ph) * 0.12;
    }
    // fog drift
    this.fogLevel += (this.fogTarget - this.fogLevel) * Math.min(1, dt / 600);
    this.fogs.forEach((f, i) => {
      f.x -= dt * (0.006 + (i % 3) * 0.003);
      if (f.x < -140) f.x = 520;
      f.setAlpha(this.fogLevel * (0.8 + Math.sin(t * 0.5 + i) * 0.2));
    });

    // the ship rocks, sails heave, chains swing
    if (!this.shipFrozen) {
      const sway = (0.018 + st * 0.008) * (settings.reducedMotion ? 0.5 : 1);
      const hover = this.shipOffset.hover;
      this.ship.rotation = Math.sin(t * 0.8) * sway + this.shipOffset.rot;
      this.ship.x = SHIP_X + this.shipOffset.x + Math.sin(t * 0.37) * 2;
      this.ship.y = SHIP_Y + this.shipOffset.y - hover + Math.sin(t * 1.1) * (1.5 + st * 0.5) + (hover ? Math.sin(t * 1.7) * 3 : 0);
      this.chains.forEach((c, i) => (c.rotation = Math.sin(t * 1.3 + this.chainPhase[i]) * 0.18 * st));
      this.glow.setAlpha(0.45 + Math.sin(t * 7) * 0.12 + (Math.random() < 0.03 ? -0.3 : 0));
    }
    // champion bobs on the raft
    const bob = Math.sin(t * 1.6) * 1.5 * (0.8 + st * 0.2);
    this.raft.y = PLAYER_Y + 2 + bob;
    this.raft.rotation = Math.sin(t * 1.2) * 0.04;
    if (!this.playerLocked) {
      this.player.x = PLAYER_X + this.playerOffset.x;
      this.player.y = PLAYER_Y + bob + this.playerOffset.y;
    }
    this.updateFists(dt, t);

    // lightning
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.lightning(false);
      const base = [0, 6500, 4200, 2200][this.phase];
      this.nextBolt = base + Math.random() * base;
    }
  }

  private updateCellar(dt: number, t: number) {
    const sw = Math.sin(t * 0.9) * 0.08;
    this.bulbImg!.rotation = sw;
    this.cone!.x = 200 - Math.sin(sw) * 70;
    if (!this.shipFrozen) {
      this.ship.x = SHIP_X + 8 + this.shipOffset.x;
      this.ship.y = PLAYER_Y + 6 + this.shipOffset.y - this.shipOffset.hover;
      this.ship.rotation = this.shipOffset.rot + Math.sin(t * 1.4) * 0.008 * this.storm;
    }
    if (!this.playerLocked) {
      this.player.x = PLAYER_X + this.playerOffset.x;
      this.player.y = PLAYER_Y + Math.sin(t * 2) * 0.8 + this.playerOffset.y;
    }
    this.raft.x = this.player.x;
    this.updateFists(dt, t);
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.nextBolt = 3000 + Math.random() * 5000;
      this.flicker(false);
    }
  }

  /** The bulb stutters. Used where the sea arena would throw lightning. */
  private flicker(big: boolean) {
    const c = this.cone!;
    const seq = big ? [0, 0.6, 0, 0.5, 0.34] : [0.1, 0.34, 0.15, 0.34];
    seq.forEach((a, i) => this.s.time.delayedCall(i * 70, () => c.setAlpha(a)));
    if (big) {
      this.s.flash(0.5, 300);
      sound.play('boom');
    } else sound.play('tickclock');
  }

  /** The fists hover beside the umbrella, each on its own rhythm, and shadow-box while idle. */
  private updateFists(dt: number, t: number) {
    if (!this.fists.length) return;
    const pl = this.player;
    this.fists.forEach((f, i) => {
      f.setVisible(pl.visible);
      f.setAlpha(pl.alpha);
      if (this.fistLocked[i]) return;
      const h = this.fistHome[i];
      const o = this.fistOff[i];
      f.x = pl.x + h.x + o.x + Math.sin(t * 1.3 + i * 2.1) * 1.2;
      f.y = pl.y + h.y + o.y + Math.sin(t * 2.2 + i * 1.7) * 2;
    });
    // a restless jab now and then while the champion waits for orders
    this.nextJab -= dt;
    if (this.nextJab <= 0) {
      this.nextJab = 3000 + Math.random() * 3500;
      if (this.s.awaitingChoice && !this.fistLocked[1] && this.fists[1].frame.name === '0') {
        const f = this.fists[1];
        f.setFrame(1);
        this.s.tweens.add({
          targets: this.fistOff[1],
          x: 7,
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => f.frame.name === '1' && f.setFrame(0),
        });
      }
    }
  }

  /** Fist pose for both hands: 0 clenched, 1 punch, 2 open. */
  setFistPose(frame: number) {
    this.fists.forEach((f) => f.setFrame(frame));
  }

  /** Tween a fist's offset from its resting spot. */
  fistTo(i: number, x: number, y: number, duration: number, ease = 'Quad.easeOut') {
    return this.s.tw({ targets: this.fistOff[i], x, y, duration, ease });
  }

  lightning(close: boolean) {
    if (this.kr) return this.kr.pulse(close);
    if (this.ti) {
      this.s.flash(close ? 0.4 : 0.15, 200);
      return;
    }
    if (this.cellar) return this.flicker(close);
    const b = Phaser.Utils.Array.GetRandom(this.bolts);
    b.x = close ? 120 + Math.random() * 200 : -40 + Math.random() * 480;
    b.setScale(close ? 1.4 : 0.6 + Math.random() * 0.6);
    b.setVisible(true);
    const strong = !settings.reducedMotion;
    this.s.flash(close ? 0.6 : strong ? 0.28 : 0.1, close ? 380 : 260);
    this.s.time.delayedCall(70, () => b.setVisible(false));
    if (strong && Math.random() < 0.5) {
      this.s.time.delayedCall(140, () => b.setVisible(true));
      this.s.time.delayedCall(200, () => b.setVisible(false));
    }
    // the ship's silhouette lights up
    this.shipParts.forEach((p) => p.setTintFill(0xffffff));
    this.s.time.delayedCall(60, () => this.shipParts.forEach((p) => p.clearTint()));
    this.s.time.delayedCall(close ? 50 : 300 + Math.random() * 600, () => sound.play(close ? 'thunder' : 'thunder_far'));
  }

  setFog(level: number) {
    this.fogTarget = level;
  }

  // -------------------------------------------------------------- phases

  setPhase(p: number) {
    this.phase = p;
    if (this.kr) return this.kr.setPhase(p);
    if (this.ti) return this.ti.setPhase(p);
    if (this.cellar) {
      this.storm = 1.6;
      this.captain.play(`${this.bossKey}_idle2`);
      this.wisps.emitting = true;
      return;
    }
    this.storm = p;
    sound.setStorm(p);
    this.rain.frequency = [0, 22, 12, 7][p];
    this.rain.quantity = p === 3 ? 2 : 1;
    if (p >= 2) {
      this.hull.setTexture('b_hull2');
      this.captain.play('b_captain2_idle');
      this.wisps.emitting = true;
      this.wisps.frequency = p === 3 ? 140 : 260;
    }
    if (p >= 3) {
      this.sails.forEach((sp, i) => sp.play({ key: `b_sailG${i}_wave`, startFrame: i % 3 }));
      this.aura.setAlpha(0.35);
      this.s.tweens.add({ targets: this.aura, alpha: { from: 0.2, to: 0.45 }, duration: 1400, yoyo: true, repeat: -1 });
    }
  }
}
