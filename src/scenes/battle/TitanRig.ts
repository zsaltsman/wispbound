import Phaser from 'phaser';
import { C } from '../../ui/ui';
import type { Arena } from './Arena';
import { PLAYER_Y, SHIP_X } from './Arena';
import type { TitanId } from '../../engine/titans';
import { isSpirit } from '../../engine/spirits';

/** World 4: each spirit's backdrop and floor, and where its body rests (y above the ground line). */
/** ROGUELIKE: the dungeon's enemies stand like spirits, in whichever backdrop the current floor has. */
export const ROGUE_ARENA = { bg: 'w5b_guard', floor: 'w5f_stone' };
export const ROGUE_BODIES = new Set<string>();

const SPIRIT_ARENA: Record<string, { bg: string; floor: string; lift: number; dx: number }> = {
  champion: { bg: 'w4b_tower', floor: 'w4f_stone', lift: -10, dx: 16 },
  wispmane: { bg: 'w4b_clearing', floor: 'w4f_grass', lift: -10, dx: 18 },
  crow: { bg: 'w4b_nest', floor: 'w4f_deck', lift: 26, dx: 18 },
  subject: { bg: 'w4b_lab', floor: 'w4f_lab', lift: -10, dx: 18 },
  squirrel: { bg: 'w4b_tree', floor: 'w4f_bark', lift: -8, dx: 18 },
  viperwind: { bg: 'w4b_clearing', floor: 'w4f_grass', lift: 4, dx: 16 },
  reaper: { bg: 'w4b_volc', floor: 'w4f_volc', lift: 14, dx: 10 },
  // the Reaper's prison
  skelwarden: { bg: 'w5b_post', floor: 'w5f_stone', lift: -10, dx: 14 },
  sc_booheet: { bg: 'w5b_guard', floor: 'w5f_stone', lift: 6, dx: 12 },
  sc_shipwraith: { bg: 'w5b_guard', floor: 'w5f_stone', lift: -6, dx: 12 },
  sc_hauntcorn: { bg: 'w5b_guard', floor: 'w5f_stone', lift: -10, dx: 12 },
  sc_umbrawl: { bg: 'w5b_guard', floor: 'w5f_stone', lift: 4, dx: 12 },
  sc_tickraith: { bg: 'w5b_guard', floor: 'w5f_stone', lift: -10, dx: 12 },
  // the God of Death: the high-security hall, then the centre of his domain
  gr1: { bg: 'fb_hall', floor: 'w5f_stone', lift: 0, dx: 16 },
  gr2: { bg: 'fb_hall', floor: 'w5f_stone', lift: 0, dx: 8 },
  gr3: { bg: 'fb_hall', floor: 'w5f_stone', lift: 6, dx: 10 },
  gr4: { bg: 'fb_domain', floor: 'ff_domain', lift: 6, dx: 10 },
};

/** The forms of the God of Death that grow legs and wings. */
const WINGED = ['gr3', 'gr4'];

// World 3: the three Titans in battle. Bodies are sprites; legs, Scorvex's tail and
// Ironclad's arms move live every frame, so attacks can lift and drive them anywhere.

export interface Leg {
  hx: number; // hip, body-local
  hy: number;
  rx: number; // where the foot rests (world)
  ry: number;
  fx: number; // the foot as drawn (world)
  fy: number;
  l1: number; // thigh and shin lengths
  l2: number;
  w: number;
  front: boolean;
  hold: boolean;
  blade: boolean;
  ph: number;
  /** a leg that never touches the ground: its rest point is body-local, and it weaves */
  air?: boolean;
}

type Pt = { x: number; y: number };

export class TitanRig {
  kind: TitanId;
  a: Arena;
  s: Phaser.Scene;
  body!: Phaser.GameObjects.Container;
  core!: Phaser.GameObjects.Sprite;
  legs: Leg[] = [];
  /** Scorvex's tail tip (world) and the stinger drawn there */
  tail = { x: 0, y: 0, rx: 0, ry: 0, hold: false };
  stinger?: Phaser.GameObjects.Sprite;
  /** Ironclad's arms (rotations in radians: 0 hangs straight down, +PI/2 points at you) */
  arm?: Phaser.GameObjects.Image;
  hammer?: Phaser.GameObjects.Sprite;
  armRot = { fist: 0.25, hammer: 0.35 };
  milo?: Phaser.GameObjects.Sprite;
  /** The God of Death: the wings on his back (their flap runs on its own unless held). */
  wings?: Phaser.GameObjects.Sprite;
  wingHold: number | null = null;
  /** How many of the legs are drawn (the true form grows them one by one). */
  legN = 99;
  /** Offsets the scenes animate (entrances, collapses, retreats). */
  off = { x: 0, y: 0, rot: 0, scale: 1 };
  sway = 1;
  phase = 1;
  /** Defeated: legs fold, nothing fights back any more */
  dead = false;
  bg?: Phaser.GameObjects.Image;
  shadow?: Phaser.GameObjects.Ellipse;
  /** World 4: true for the island's spirits (single-sprite bodies). */
  get spirit() {
    return isSpirit(this.kind);
  }
  private gBack!: Phaser.GameObjects.Graphics;
  private gFront!: Phaser.GameObjects.Graphics;
  private rest: Pt = { x: 0, y: 0 };
  private t = 0;

  constructor(a: Arena, kind: TitanId) {
    this.a = a;
    this.kind = kind;
    this.s = a.s as unknown as Phaser.Scene;
    this.build();
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T, depth: number): T {
    (o as any).setDepth?.(depth);
    this.a.layer.add(o);
    return o;
  }

  private build() {
    const s = this.s;
    const a = this.a;
    // the backdrop and the street
    const sp = SPIRIT_ARENA[this.kind] ?? (ROGUE_BODIES.has(this.kind) ? { ...ROGUE_ARENA, lift: 0, dx: 14 } : undefined);
    const bg = sp ? sp.bg : this.kind === 'widowmaker' ? 'ta_barrel_broken' : this.kind === 'ironclad' ? 'ta_clubhole' : 'ta_club';
    this.add(s.add.rectangle(-200, -100, 900, 420, 0x000000).setOrigin(0, 0).setScrollFactor(0.1), 0);
    this.bg = this.add(s.add.image(-140, 12, bg).setOrigin(0, 0).setScrollFactor(0.55, 0.8), 1);
    this.add(s.add.image(-160, 126, sp ? sp.floor : this.kind === 'widowmaker' ? 'ta_flood' : 'ta_street').setOrigin(0, 0), 10);
    this.gBack = this.add(s.add.graphics(), 29);
    this.gFront = this.add(s.add.graphics(), 56);
    const L = (hx: number, hy: number, rx: number, ry: number, l1: number, l2: number, w: number, front: boolean, blade: boolean): Leg => ({
      hx,
      hy,
      rx,
      ry,
      fx: rx,
      fy: ry,
      l1,
      l2,
      w,
      front,
      hold: false,
      blade,
      ph: Math.random() * 6,
    });
    if (sp) {
      // a spirit: one painted body, no limbs to steer; attacks move the whole of it
      this.rest = { x: SHIP_X + sp.dx, y: PLAYER_Y + 10 - sp.lift };
      this.core = s.add.sprite(0, 0, 'sp_' + this.kind, 0).setOrigin(0.5, 1);
      this.shadow = this.add(s.add.ellipse(this.rest.x, PLAYER_Y + 10, this.core.width * 0.7, 14, C.black, 0.45), 28);
      if (WINGED.includes(this.kind)) {
        // the wings behind his shoulders, and six bladed legs out of his back, each with a
        // mind of its own (rest points are body-local; they weave in the air)
        this.wings = s.add.sprite(10, -this.core.height * 0.66, 'fb_wings', 1).setOrigin(0.5, 62 / 140);
        const H = this.core.height;
        const spots: [number, number, number, number, number, number, boolean][] = [
          // hip x, hip y, rest x, rest y, thigh, shin, in front
          [12, -0.62, -70, -1.02, 46, 52, false],
          [16, -0.58, 64, -1.08, 46, 50, false],
          [18, -0.52, 96, -0.7, 44, 50, false],
          [14, -0.5, -96, -0.62, 46, 54, false],
          [10, -0.44, -62, -0.2, 40, 46, true],
          [16, -0.42, 70, -0.18, 40, 46, true],
        ];
        for (const [hx, hy, rx, ry, l1, l2, front] of spots) this.legs.push({ ...L(hx, hy * H, rx, ry * H, l1, l2, front ? 6 : 5, front, true), air: true });
      }
    } else if (this.kind === 'scorvex') {
      this.rest = { x: SHIP_X + 20, y: PLAYER_Y - 14 };
      this.core = s.add.sprite(0, 0, 'sv_body', 0).setOrigin(0.5, 1);
      const g = PLAYER_Y + 8;
      this.legs = [
        L(-42, -20, this.rest.x - 70, g - 6, 30, 30, 7, false, false),
        L(26, -20, this.rest.x + 20, g - 6, 30, 30, 7, false, false),
        L(-30, -14, this.rest.x - 52, g + 4, 30, 32, 9, true, false),
        L(44, -14, this.rest.x + 50, g + 4, 30, 32, 9, true, false),
      ];
      this.tail.rx = this.rest.x + 20;
      this.tail.ry = this.rest.y - 132;
      this.tail.x = this.tail.rx;
      this.tail.y = this.tail.ry;
      this.stinger = this.add(s.add.sprite(0, 0, 'sv_sting', 0).setOrigin(0.4, 0.4), 32);
    } else if (this.kind === 'widowmaker') {
      this.rest = { x: SHIP_X + 24, y: PLAYER_Y - 44 };
      this.core = s.add.sprite(0, 0, 'wm_body', 0).setOrigin(0.5, 1);
      const g = PLAYER_Y + 6;
      for (let i = 0; i < 4; i++) {
        this.legs.push(L(-30 + i * 14, -40, this.rest.x - 150 + i * 70, g - 12, 62, 70, 4, false, true));
        this.legs.push(L(-26 + i * 14, -34, this.rest.x - 120 + i * 72, g + 8, 66, 74, 6, true, true));
      }
    } else {
      this.rest = { x: SHIP_X + 20, y: PLAYER_Y + 12 };
      this.core = s.add.sprite(0, 0, 'ic_body', 0).setOrigin(0.5, 1);
      this.off.scale = 0.88; // big enough to loom, small enough to keep its helmet under the HUD
    }
    const c = s.add.container(this.rest.x, this.rest.y);
    this.body = this.add(c, 30);
    if (this.wings) c.add(this.wings);
    c.add(this.core);
    if (this.kind === 'ironclad') {
      // arms hang from the shoulders, outside the container so they can be drawn in front
      this.arm = this.add(s.add.image(0, 0, 'ic_arm').setOrigin(0.5, 0.08), 31);
      this.hammer = this.add(s.add.sprite(0, 0, 'ic_hammer', 0).setOrigin(0.5, 0.05), 57);
      // the Spirit Tamer himself, on a pile of rubble
      this.add(s.add.ellipse(SHIP_X + 96, PLAYER_Y - 2, 70, 20, C.dark), 26);
      this.add(s.add.ellipse(SHIP_X + 96, PLAYER_Y - 8, 54, 16, C.mid), 26);
      this.milo = this.add(s.add.sprite(SHIP_X + 96, PLAYER_Y - 10, 'milo_b', 0).setOrigin(0.5, 1), 27);
    }
    // the rest of the arena wants a `captain` and ship parts to flash and shake
    a.ship = c;
    a.captain = this.core;
    a.shipParts = [this.core, ...(this.hammer ? [this.hammer] : []), ...(this.arm ? [this.arm] : []), ...(this.stinger ? [this.stinger] : [])];
    const dummy = () => s.add.image(0, 0, 'fx_px').setVisible(false);
    a.hull = dummy();
    a.glow = dummy();
    a.masts = dummy();
    a.aura = dummy();
    a.flag = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    a.foam = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    c.add([a.hull, a.glow, a.masts, a.aura, a.flag, a.foam]);
    a.rain = this.add(s.add.particles(0, 0, 'fx_rain', { emitting: false }), 85);
    a.wisps = this.add(
      s.add.particles(0, 0, 'fx_puff', { frame: [0, 1, 2], x: { min: this.rest.x - 60, max: this.rest.x + 60 }, y: this.rest.y - 40, lifespan: 1600, speedY: { min: -30, max: -10 }, alpha: { start: 0.5, end: 0 }, scale: { start: 0.5, end: 1.6 }, frequency: 220, emitting: this.kind === 'scorvex' }),
      31
    );
  }

  /** ROGUELIKE: another enemy steps into the spotlight (same stance, a different body). */
  retarget(kind: TitanId) {
    this.kind = kind;
    this.phase = 1;
    this.dead = false;
    this.sway = 1;
    this.off.x = this.off.y = this.off.rot = 0;
    this.core.setTexture('sp_' + kind, 0);
    this.core.setAlpha(1);
    this.shadow?.setSize(this.core.width * 0.7, 14);
  }

  // -------------------------------------------------------------- points

  local(lx: number, ly: number): Pt {
    const c = this.body;
    const sc = c.scale;
    const cos = Math.cos(c.rotation);
    const sin = Math.sin(c.rotation);
    return { x: c.x + (lx * cos - ly * sin) * sc, y: c.y + (lx * sin + ly * cos) * sc };
  }
  /** The eyes: where the camera looks when the Titan roars. */
  eye(): Pt {
    if (this.spirit) return this.local(-this.core.width * 0.3, -this.core.height * (this.kind === 'viperwind' ? 0.85 : 0.72));
    if (this.kind === 'scorvex') return this.local(-48, -46);
    if (this.kind === 'widowmaker') return this.local(-38, -50);
    return this.local(0, -138);
  }
  center(): Pt {
    if (this.spirit) return this.local(0, -this.core.height * 0.5);
    if (this.kind === 'scorvex') return this.local(0, -40);
    if (this.kind === 'widowmaker') return this.local(0, -50);
    return this.local(0, -80);
  }
  shoulder(which: 'fist' | 'hammer'): Pt {
    return this.local(which === 'fist' ? -48 : 50, -124);
  }
  /** The middle of the hammer head, wherever the arm is pointing. */
  hammerHead(): Pt {
    const sh = this.shoulder('hammer');
    const r = this.armRot.hammer;
    return { x: sh.x - Math.sin(r) * 128 * this.body.scale, y: sh.y + Math.cos(r) * 128 * this.body.scale };
  }
  fistPoint(): Pt {
    const sh = this.shoulder('fist');
    const r = this.armRot.fist;
    return { x: sh.x - Math.sin(r) * 64 * this.body.scale, y: sh.y + Math.cos(r) * 64 * this.body.scale };
  }
  stingerPoint(): Pt {
    return { x: this.tail.x, y: this.tail.y };
  }

  // -------------------------------------------------------------- steering

  steerLeg(i: number, x: number, y: number, ms: number, ease = 'Sine.easeInOut') {
    const l = this.legs[i];
    l.hold = true;
    return new Promise<void>((r) => this.s.tweens.add({ targets: l, fx: x, fy: y, duration: ms, ease, onComplete: () => r() }));
  }
  releaseLeg(i: number) {
    this.legs[i].hold = false;
  }
  releaseAll() {
    this.legs.forEach((l) => (l.hold = false));
    this.tail.hold = false;
  }
  steerTail(x: number, y: number, ms: number, ease = 'Sine.easeInOut') {
    this.tail.hold = true;
    return new Promise<void>((r) => this.s.tweens.add({ targets: this.tail, x, y, duration: ms, ease, onComplete: () => r() }));
  }
  /** Swing one of Ironclad's arms to an angle (0 = straight down, PI/2 = at you, PI = overhead). */
  swing(which: 'fist' | 'hammer', rot: number, ms: number, ease = 'Sine.easeInOut') {
    return new Promise<void>((r) => this.s.tweens.add({ targets: this.armRot, [which]: rot, duration: ms, ease, onComplete: () => r() }));
  }

  // -------------------------------------------------------------- per frame

  update(dt: number, t: number) {
    this.t = t;
    const a = this.a;
    const floaty = this.kind === 'crow' || this.kind === 'viperwind' || this.kind === 'reaper' || this.kind === 'gr1' || WINGED.includes(this.kind);
    const heave = this.dead ? 0 : Math.sin(t * (this.kind === 'ironclad' ? 0.6 : floaty ? 1.1 : 1.4)) * (this.kind === 'widowmaker' || floaty ? 3 : 2) * this.sway;
    if (!a.shipFrozen) {
      this.body.x = this.rest.x + a.shipOffset.x + this.off.x;
      this.body.y = this.rest.y + a.shipOffset.y + this.off.y + heave;
      this.body.rotation = a.shipOffset.rot + this.off.rot;
      this.body.setScale(this.off.scale);
    }
    if (!a.playerLocked) {
      a.player.x = 84 + a.playerOffset.x;
      a.player.y = PLAYER_Y + Math.sin(t * 1.6) * 1.2 + a.playerOffset.y;
    }
    a.raft.x = a.player.x;
    if (this.shadow) {
      const h = Math.max(0, PLAYER_Y + 10 - this.body.y);
      this.shadow.setPosition(this.body.x, PLAYER_Y + 10).setScale(Math.max(0.3, 1 - h / 200) * this.body.scale, 1).setAlpha(this.body.alpha * 0.45);
    }
    // feet settle back to rest unless an attack holds them; the body's motion drags them
    for (const l of this.legs) {
      if (l.hold) continue;
      if (l.air) {
        // weaving: each leg on its own slow loop, quicker and wider when he is angry
        const amp = this.dead ? 0 : (this.phase >= 3 ? 12 : 8) * this.sway;
        const tg = this.local(l.rx + Math.sin(t * 1.3 + l.ph) * amp, l.ry + Math.cos(t * 1.05 + l.ph * 1.7) * amp * 0.8);
        l.fx += (tg.x - l.fx) * Math.min(1, dt / 160);
        l.fy += (tg.y - l.fy) * Math.min(1, dt / 160);
        continue;
      }
      const shuffle = this.dead ? 0 : Math.sin(t * 1.7 + l.ph) * (this.phase >= 3 ? 4 : 2) * this.sway;
      const tx = l.rx + this.off.x + a.shipOffset.x + shuffle;
      const ty = l.ry + (this.dead ? this.off.y * 0.4 : 0);
      l.fx += (tx - l.fx) * Math.min(1, dt / 180);
      l.fy += (ty - l.fy) * Math.min(1, dt / 180);
    }
    if (this.kind === 'scorvex' && this.stinger) {
      if (!this.tail.hold) {
        const tx = this.tail.rx + this.off.x + a.shipOffset.x + Math.sin(t * 1.1) * 10 * this.sway;
        const ty = this.tail.ry + this.off.y + Math.cos(t * 0.9) * 6 * this.sway;
        this.tail.x += (tx - this.tail.x) * Math.min(1, dt / 240);
        this.tail.y += (ty - this.tail.y) * Math.min(1, dt / 240);
      }
      this.stinger.setPosition(this.tail.x, this.tail.y);
    }
    if (this.arm && this.hammer) {
      const fs = this.shoulder('fist');
      const hs = this.shoulder('hammer');
      const breath = this.dead ? 0 : Math.sin(t * 0.8) * 0.04;
      this.arm.setPosition(fs.x, fs.y).setRotation(this.armRot.fist + breath + this.body.rotation).setScale(this.body.scale);
      this.hammer.setPosition(hs.x, hs.y).setRotation(this.armRot.hammer - breath + this.body.rotation).setScale(this.body.scale);
    }
    if (this.wings && this.wingHold === null) {
      // a slow, heavy beat
      const f = [0, 1, 2, 1][Math.floor(t * (this.phase >= 3 ? 2.6 : 2)) % 4];
      if (this.wings.frame.name !== String(f)) this.wings.setFrame(f);
    }
    this.draw(this.gBack, false);
    this.draw(this.gFront, true);
  }

  /** Hold the wings in one frame (0 up, 1 level, 2 down, 3 closed round him); null lets them beat. */
  holdWings(f: number | null) {
    this.wingHold = f;
    if (f !== null) this.wings?.setFrame(f);
  }

  /** Legs: two segments each, knees bending up; thick dark steel with a pale edge. */
  private draw(g: Phaser.GameObjects.Graphics, front: boolean) {
    g.clear();
    for (let li = 0; li < this.legs.length; li++) {
      const l = this.legs[li];
      if (l.front !== front || li >= this.legN) continue;
      const h = this.local(l.hx, l.hy);
      const k = knee(h, { x: l.fx, y: l.fy }, l.l1 * this.body.scale, l.l2 * this.body.scale);
      const w = l.w * this.body.scale;
      for (const [x0, y0, x1, y1] of [
        [h.x, h.y, k.x, k.y],
        [k.x, k.y, l.fx, l.fy],
      ]) {
        g.lineStyle(w + 3, C.black, 1).lineBetween(x0, y0, x1, y1);
        g.lineStyle(w, l.air ? (front ? C.light : C.mid) : front ? C.mid : C.dark, 1).lineBetween(x0, y0, x1, y1);
        g.lineStyle(Math.max(1, w * 0.3), l.air ? (front ? C.white : C.light) : front ? C.light : C.mid, 1).lineBetween(x0 - 1, y0 - 1, x1 - 1, y1 - 1);
        if (l.air) {
          // vertebrae: knobs down each bone
          for (let u = 0.2; u < 0.95; u += 0.2) {
            g.fillStyle(C.black, 1).fillCircle(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, w * 0.55 + 1);
            g.fillStyle(front ? C.light : C.mid, 1).fillCircle(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, w * 0.45);
          }
        }
      }
      g.fillStyle(C.black, 1).fillCircle(k.x, k.y, w * 0.8 + 1);
      g.fillStyle(front ? C.light : C.mid, 1).fillCircle(k.x, k.y, w * 0.6);
      if (l.blade) {
        // a bladed tip, pointing down at the ground
        const ang = Math.atan2(l.fy - k.y, l.fx - k.x);
        const bx = l.fx + Math.cos(ang) * 8;
        const by = l.fy + Math.sin(ang) * 8;
        const px = Math.cos(ang + Math.PI / 2) * 4;
        const py = Math.sin(ang + Math.PI / 2) * 4;
        g.fillStyle(C.black, 1).fillTriangle(l.fx + px * 1.4, l.fy + py * 1.4, l.fx - px * 1.4, l.fy - py * 1.4, bx + Math.cos(ang) * 2, by + Math.sin(ang) * 2);
        g.fillStyle(front ? C.white : C.light, 1).fillTriangle(l.fx + px, l.fy + py, l.fx - px, l.fy - py, bx, by);
      } else {
        g.fillStyle(C.black, 1).fillRect(l.fx - w, l.fy - 3, w * 2 + 2, 6);
        g.fillStyle(C.mid, 1).fillRect(l.fx - w + 1, l.fy - 2, w * 2, 4);
      }
    }
    if (front && this.kind === 'scorvex' && this.stinger) {
      // the tail: a chain of plates from the back of the chassis up to the stinger
      const base = this.local(56, -62);
      const ctrl = { x: (base.x + this.tail.x) / 2 + 40, y: Math.min(base.y, this.tail.y) - 50 };
      const N = 12;
      for (let i = N; i >= 0; i--) {
        const u = i / N;
        const x = (1 - u) * (1 - u) * base.x + 2 * (1 - u) * u * ctrl.x + u * u * this.tail.x;
        const y = (1 - u) * (1 - u) * base.y + 2 * (1 - u) * u * ctrl.y + u * u * this.tail.y;
        const r = (11 - u * 5) * this.body.scale;
        g.fillStyle(C.black, 1).fillCircle(x, y, r + 1.5);
        g.fillStyle(i % 2 ? C.mid : C.light, 1).fillCircle(x, y, r);
        g.fillStyle(C.dark, 1).fillCircle(x + r * 0.3, y + r * 0.3, r * 0.45);
      }
    }
  }

  /** How much it breathes and shuffles at rest in each phase. */
  /** The frame it stands in when nothing is happening. */
  restFrame(): number {
    if (this.kind === 'ironclad') return this.phase >= 3 ? 2 : this.phase >= 2 ? 1 : 0;
    if (this.kind === 'squirrel') return this.phase >= 2 ? 4 : 0;
    if (this.kind === 'reaper') return this.phase >= 2 ? 4 : 0;
    if (this.kind === 'skelwarden' || this.kind.startsWith('sc_')) return this.phase >= 2 ? 4 : 0;
    if (this.kind === 'gr1' || this.kind === 'gr2') return this.phase >= 2 ? 6 : 0;
    if (WINGED.includes(this.kind)) return this.phase >= (this.kind === 'gr3' ? 4 : 3) ? 4 : 0;
    return 0;
  }

  baseSway(p = this.phase) {
    if (this.kind === 'scorvex') return p >= 2 ? 1.3 : 1;
    if (this.kind === 'widowmaker') return p >= 3 ? 1.7 : p === 2 ? 1.3 : 1;
    return p >= 3 ? 1.4 : 1;
  }

  /**
   * Back to its resting stance, smoothly: used when a phase change cancels an attack
   * it was winding up (legs raised, tail cocked, hammer overhead, body crouched).
   * Held limbs are let go and ease home on their own (update() pulls them to rest).
   */
  settle(ms = 500): Promise<void> {
    const s = this.s;
    s.tweens.killTweensOf(this.legs);
    s.tweens.killTweensOf(this.tail);
    s.tweens.killTweensOf(this.armRot);
    s.tweens.killTweensOf(this.off);
    this.releaseAll();
    this.holdWings(null);
    this.core.setFrame(this.restFrame());
    this.stinger?.setFrame(0);
    this.hammer?.setFrame(this.phase >= 3 ? 1 : 0);
    const scale = this.kind === 'ironclad' ? 0.88 : 1;
    const tw = (cfg: Phaser.Types.Tweens.TweenBuilderConfig) => new Promise<void>((r) => s.tweens.add({ ...cfg, duration: ms, ease: 'Sine.easeInOut', onComplete: () => r() }));
    return Promise.all([
      tw({ targets: this.off, x: 0, y: 0, rot: 0, scale }),
      tw({ targets: this.armRot, fist: 0.25, hammer: 0.35 }),
      tw({ targets: this, sway: this.baseSway() }),
    ]).then(() => undefined);
  }

  // -------------------------------------------------------------- moods

  setPhase(p: number) {
    this.phase = p;
    if (this.spirit) {
      this.core.setFrame(this.restFrame());
      this.sway = p >= 2 ? 1.4 : 1;
    }
    if (this.kind === 'scorvex' && p >= 2) {
      this.a.wisps.frequency = 90;
      this.sway = 1.3;
    }
    if (this.kind === 'widowmaker') this.sway = p === 2 ? 1.3 : 1.7;
    if (this.kind === 'ironclad') {
      this.core.setFrame(p >= 3 ? 2 : 1);
      this.sway = p >= 3 ? 1.4 : 1;
      if (p >= 3) this.hammer?.setFrame(1);
    }
  }

  /** Throw a few armor plates off Ironclad (they clang down and stay on the street). */
  shedPlates(n: number) {
    for (let i = 0; i < n; i++) {
      const p0 = this.local(-50 + Math.random() * 100, -120 + Math.random() * 70);
      const pl = this.add(this.s.add.image(p0.x, p0.y, 'ic_plate').setAngle(Math.random() * 360), 34);
      this.s.tweens.add({ targets: pl, x: p0.x + (Math.random() - 0.5) * 140, duration: 700, ease: 'Quad.easeOut' });
      this.s.tweens.add({ targets: pl, y: PLAYER_Y + 6 + Math.random() * 20, angle: pl.angle + 200, duration: 700, ease: 'Bounce.easeOut' });
    }
  }
}

/** Two-segment leg: where the knee goes, bending upward. */
function knee(h: Pt, f: Pt, l1: number, l2: number): Pt {
  const dx = f.x - h.x;
  const dy = f.y - h.y;
  const d = Math.max(1, Math.min(l1 + l2 - 1, Math.hypot(dx, dy)));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / Math.hypot(dx, dy || 1);
  const uy = dy / Math.hypot(dx || 1, dy);
  const mx = h.x + ux * a;
  const my = h.y + uy * a;
  // of the two solutions, take the one higher on screen
  const k1 = { x: mx - uy * hh, y: my + ux * hh };
  const k2 = { x: mx + uy * hh, y: my - ux * hh };
  return k1.y < k2.y ? k1 : k2;
}
