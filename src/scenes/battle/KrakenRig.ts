import Phaser from 'phaser';
import { sound } from '../../audio/audio';
import { settings } from '../../settings';
import { C } from '../../ui/ui';
import type { Arena } from './Arena';
import { PLAYER_X, PLAYER_Y, SHIP_X } from './Arena';

// The Kraken's arena: a drowned temple at the bottom of the sea, the head and
// mantle looming on the right, and its arms drawn live every frame so attacks
// can lift, coil, sweep and slam them anywhere.

export interface Tentacle {
  bx: number; // root (world px)
  by: number;
  tx: number; // tip, as drawn
  ty: number;
  rx: number; // where the tip rests
  ry: number;
  w: number; // thickness at the root
  ph: number;
  curl: number;
  hold: boolean; // an animation is steering the tip
  front: boolean;
  hidden: boolean;
}

export class KrakenRig {
  a: Arena;
  s: Phaser.Scene;
  head!: Phaser.GameObjects.Sprite;
  body!: Phaser.GameObjects.Container;
  tents: Tentacle[] = [];
  private gBack!: Phaser.GameObjects.Graphics;
  private gFront!: Phaser.GameObjects.Graphics;
  private rays!: Phaser.GameObjects.Image;
  private murk!: Phaser.GameObjects.Rectangle;
  water!: Phaser.GameObjects.TileSprite;
  private glow!: Phaser.GameObjects.Image;
  private snow!: Phaser.GameObjects.Particles.ParticleEmitter;
  bubbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  rise = { y: 0, scale: 1 };
  sway = 1;
  /** Defeated: the arms stop fighting, droop, and are dragged down with the body. */
  private limp: { x: number; y: number; arms: [number, number, number, number][] } | null = null;
  murkLevel = 0.12;

  constructor(a: Arena) {
    this.a = a;
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
    this.add(s.add.rectangle(-200, -100, 900, 420, 0x000000).setOrigin(0, 0).setScrollFactor(0.1), 0);
    this.add(s.add.image(-140, -10, 'k_bg').setOrigin(0, 0).setScrollFactor(0.55, 0.8), 1);
    this.rays = this.add(s.add.image(0, -30, 'k_rays').setOrigin(0, 0).setScrollFactor(0.3, 0.6).setAlpha(0.35), 2);
    this.add(s.add.image(-160, 120, 'k_floor').setOrigin(0, 0), 10);
    // marine snow drifting down through the light
    this.snow = this.add(
      s.add.particles(0, 0, 'fx_px', { x: { min: -60, max: 460 }, y: -10, lifespan: 6000, speedY: { min: 6, max: 16 }, speedX: { min: -4, max: 4 }, alpha: { start: 0.7, end: 0 }, frequency: 90 }),
      12
    );
    this.snow.setScrollFactor(0.8);
    this.bubbles = this.add(
      s.add.particles(0, 0, 'bubble0', { x: { min: 0, max: 400 }, y: 210, lifespan: 4000, speedY: { min: -40, max: -20 }, speedX: { min: -6, max: 6 }, alpha: { start: 0.8, end: 0 }, frequency: 500 }),
      13
    );
    // the head and mantle
    const c = s.add.container(SHIP_X + 34, PLAYER_Y + 22);
    a.ship = this.add(c, 30);
    this.body = c;
    this.head = s.add.sprite(0, 0, 'kr', 0).setOrigin(0.5, 1);
    this.head.play('kr_idle');
    this.glow = s.add.image(-46, -64, 'light').setScale(0.9, 0.6).setAlpha(0);
    c.add([this.head, this.glow]);
    a.captain = this.head;
    const dummy = () => s.add.image(0, 0, 'fx_px').setVisible(false);
    a.hull = dummy();
    a.glow = dummy();
    a.masts = dummy();
    a.aura = dummy();
    a.flag = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    a.foam = s.add.sprite(0, 0, 'fx_px').setVisible(false);
    c.add([a.hull, a.glow, a.masts, a.aura, a.flag, a.foam]);
    a.shipParts = [this.head];
    // arms: three behind the head, two reaching around the front of the floor
    this.gBack = this.add(s.add.graphics(), 29);
    this.gFront = this.add(s.add.graphics(), 56);
    const mk = (bx: number, by: number, rx: number, ry: number, w: number, front: boolean): Tentacle => ({ bx, by, rx, ry, tx: rx, ty: ry, w, ph: Math.random() * 6, curl: 0, hold: false, front, hidden: false });
    this.tents = [
      mk(SHIP_X - 20, PLAYER_Y + 18, SHIP_X - 90, PLAYER_Y - 70, 9, false),
      mk(SHIP_X + 10, PLAYER_Y + 18, SHIP_X - 40, PLAYER_Y - 120, 8, false),
      mk(SHIP_X + 60, PLAYER_Y + 16, SHIP_X + 90, PLAYER_Y - 110, 8, false),
      mk(SHIP_X - 30, PLAYER_Y + 30, SHIP_X - 150, PLAYER_Y + 4, 10, true),
      mk(SHIP_X + 70, PLAYER_Y + 34, SHIP_X + 20, PLAYER_Y - 20, 10, true),
    ];
    // the water itself: a murk that thickens and a surface that climbs in the abyss
    this.murk = this.add(s.add.rectangle(-200, -100, 900, 420, 0x000000).setOrigin(0, 0).setAlpha(this.murkLevel).setScrollFactor(0), 80);
    this.water = this.add(s.add.tileSprite(-200, 260, 900, 140, 'sea_front').setOrigin(0, 0).setAlpha(0.55), 70);
    a.rain = this.add(s.add.particles(0, 0, 'fx_rain', { emitting: false }), 85);
    a.wisps = this.add(
      s.add.particles(0, 0, 'fx_puff', { frame: [0, 1, 2], x: { min: SHIP_X - 60, max: SHIP_X + 80 }, y: PLAYER_Y + 10, lifespan: 1600, speedY: { min: -30, max: -10 }, alpha: { start: 0.5, end: 0 }, scale: { start: 0.5, end: 1.6 }, frequency: 200, emitting: false }),
      31
    );
  }

  /** The eye, in world space. */
  eye() {
    const c = this.body;
    return { x: c.x - 46 * c.scale, y: c.y - 64 * c.scale };
  }
  /** Lift a tentacle tip somewhere (animations hold it while they work). */
  steer(i: number, x: number, y: number, ms: number, ease = 'Sine.easeInOut') {
    const t = this.tents[i];
    t.hold = true;
    return new Promise<void>((r) => this.s.tweens.add({ targets: t, tx: x, ty: y, duration: ms, ease, onComplete: () => r() }));
  }
  release(i: number) {
    this.tents[i].hold = false;
  }

  /** The killing blow: every arm goes slack at once and from here on moves only with the body. */
  goLimp() {
    this.sway = 0;
    for (const t of this.tents) t.hold = false;
    this.limp = { x: this.body.x, y: this.body.y, arms: this.tents.map((t) => [t.bx, t.by, t.tx, t.ty]) };
  }

  /** Fade the arms and the body out together (the very end of the sinking). */
  fadeOut(ms: number, delay = 0) {
    return new Promise<void>((r) => this.s.tweens.add({ targets: [this.gBack, this.gFront, this.body], alpha: 0, duration: ms, delay, onComplete: () => r() }));
  }

  update(dt: number, t: number) {
    const a = this.a;
    // the body heaves; it rises higher in the final stage
    if (!a.shipFrozen) {
      this.body.x = SHIP_X + 34 + a.shipOffset.x;
      this.body.y = PLAYER_Y + 22 + a.shipOffset.y + this.rise.y + Math.sin(t * 0.8) * 2 * this.sway;
      this.body.setScale(this.rise.scale);
      this.body.rotation = a.shipOffset.rot + Math.sin(t * 0.5) * 0.01;
    }
    if (!a.playerLocked) {
      a.player.x = PLAYER_X + a.playerOffset.x;
      a.player.y = PLAYER_Y + Math.sin(t * 1.6) * 1.2 + a.playerOffset.y;
    }
    a.raft.x = a.player.x;
    this.rays.setAlpha(Math.max(0, 0.32 - this.murkLevel * 0.5) + Math.sin(t * 0.7) * 0.06);
    this.murk.setAlpha(this.murkLevel);
    this.water.tilePositionX += dt * 0.02;
    this.water.y += Math.sin(t * 1.3) * 0.08;
    if (this.limp) {
      // dead weight: roots ride the sinking body, tips flop to the seabed and are dragged after it
      const L = this.limp;
      const dX = this.body.x - L.x;
      const dY = this.body.y - L.y;
      this.tents.forEach((tn, i) => {
        const [bx, by, tx] = L.arms[i];
        tn.bx = bx + dX;
        tn.by = by + dY;
        const gx = bx + (tx - bx) * 0.75 + dX;
        const gy = Math.max(by, PLAYER_Y + 34) + dY;
        tn.tx += (gx - tn.tx) * Math.min(1, dt / 320);
        tn.ty += (gy - tn.ty) * Math.min(1, dt / 320);
        tn.curl += ((i % 2 ? 22 : -22) - tn.curl) * Math.min(1, dt / 400);
      });
      this.draw(this.gBack, false);
      this.draw(this.gFront, true);
      return;
    }
    // the arms: tips wander around their rest point unless an attack is steering them
    for (const tn of this.tents) {
      if (!tn.hold) {
        const wx = tn.rx + Math.sin(t * 0.9 + tn.ph) * 16 * this.sway;
        const wy = tn.ry + Math.cos(t * 0.7 + tn.ph) * 12 * this.sway;
        tn.tx += (wx - tn.tx) * Math.min(1, dt / 260);
        tn.ty += (wy - tn.ty) * Math.min(1, dt / 260);
      }
      tn.curl = Math.sin(t * 1.1 + tn.ph) * 30 * this.sway;
    }
    this.draw(this.gBack, false);
    this.draw(this.gFront, true);
  }

  /** Each arm is a bezier swept with shrinking circles: dark outline, grey flesh, pale suckers. */
  private draw(g: Phaser.GameObjects.Graphics, front: boolean) {
    g.clear();
    for (const tn of this.tents) {
      if (tn.front !== front || tn.hidden) continue;
      const mx = (tn.bx + tn.tx) / 2;
      const my = (tn.by + tn.ty) / 2;
      const dx = tn.tx - tn.bx;
      const dy = tn.ty - tn.by;
      const len = Math.max(1, Math.hypot(dx, dy));
      const cx = mx + (-dy / len) * tn.curl;
      const cy = my + (dx / len) * tn.curl;
      const N = 26;
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N;
        const x = (1 - u) * (1 - u) * tn.bx + 2 * (1 - u) * u * cx + u * u * tn.tx;
        const y = (1 - u) * (1 - u) * tn.by + 2 * (1 - u) * u * cy + u * u * tn.ty;
        pts.push([x, y, tn.w * (1 - u * 0.85) + 1]);
      }
      g.fillStyle(C.black, 1);
      for (const [x, y, r] of pts) g.fillCircle(x, y, r + 1.5);
      g.fillStyle(C.mid, 1);
      for (const [x, y, r] of pts) g.fillCircle(x, y, r);
      g.fillStyle(C.dark, 1);
      for (const [x, y, r] of pts) g.fillCircle(x + r * 0.3, y + r * 0.35, r * 0.55);
      g.fillStyle(C.light, 1);
      pts.forEach(([x, y, r], k) => {
        if (k % 3 === 1 && k < N - 1) g.fillCircle(x - r * 0.35, y + r * 0.45, Math.max(1, r * 0.28));
      });
    }
  }

  setPhase(p: number) {
    if (p === 2) {
      // the abyss: the water climbs, the light fails, the arms grow restless
      this.s.tweens.add({ targets: this.water, y: 196, duration: 2400, ease: 'Sine.easeInOut' });
      this.s.tweens.add({ targets: this, murkLevel: 0.3, sway: 1.4, duration: 2400 });
      this.bubbles.frequency = 160;
      this.head.play('kr_idle2');
      this.a.wisps.emitting = true;
    } else if (p >= 3) {
      // the whole creature: it heaves itself up out of the floor
      this.s.tweens.add({ targets: this.rise, y: -26, scale: 1.18, duration: 2200, ease: 'Sine.easeInOut' });
      this.s.tweens.add({ targets: this, murkLevel: 0.4, sway: 1.9, duration: 2000 });
      this.s.tweens.add({ targets: this.glow, alpha: { from: 0.2, to: 0.55 }, duration: 900, yoyo: true, repeat: -1 });
      for (const tn of this.tents) {
        tn.w += 3;
        tn.ry -= 20;
      }
      this.tents.push(
        { bx: SHIP_X + 110, by: PLAYER_Y + 20, rx: SHIP_X + 140, ry: PLAYER_Y - 140, tx: SHIP_X + 140, ty: PLAYER_Y + 20, w: 11, ph: 1.3, curl: 0, hold: false, front: false, hidden: false },
        { bx: SHIP_X - 90, by: PLAYER_Y + 40, rx: SHIP_X - 200, ry: PLAYER_Y - 90, tx: SHIP_X - 90, ty: PLAYER_Y + 40, w: 12, ph: 2.1, curl: 0, hold: false, front: true, hidden: false }
      );
      this.head.play('kr_idle2');
      this.bubbles.frequency = 90;
    }
  }

  /** Where the storm arena would throw lightning, the deep pulses: a shiver of light through the water. */
  pulse(big: boolean) {
    const s = this.s as any;
    const k = big ? 0.6 : 0.25;
    this.s.tweens.add({ targets: this.rays, alpha: k, duration: 80, yoyo: true });
    if (big) {
      s.flash?.(0.4, 300);
      sound.play('rumble');
    }
    if (!settings.reducedMotion && big) s.shake?.(2, 300);
  }
}
