import Phaser from 'phaser';
import { GBPipeline } from '../gfx/GBPipeline';
import { PAL_RGB, bayer } from '../gfx/pixel';
import { txt, box, C } from '../ui/ui';
import { W, H } from '../constants';
import { sound } from '../audio/audio';
import { settings } from '../settings';
import { loadState, partyOf } from '../story/state';
import { VOYAGES, type Voyage } from '../world/voyages';
import { Ocean, DEPTH, FOCAL, wrapAngle, type Mood } from './sea/ocean';

// Sailing between islands. First a short shot at the pier (you walk out and climb aboard,
// your spirits hop in after you, the boat pushes off), then the open sea, seen from just
// behind your boat: you steer, the next island rises out of the distance, and you bring the
// boat in to its dock. No fights, no failing: the sea only ever nudges you back on course.

const HZ = 118; // the horizon
const BOAT_Y = 296; // the boat's waterline on screen
const DIST = 8400; // how far the next island is (about a minute at full sail, a minute and a half cruising)
const CRUISE = 74; // world units per second with no input
const FULL = 124;
const SLOW = 26;
/** The camera height out at sea (the title screen's water is seen from lower down). An object
 * this far ahead is level with your boat on screen. */
const OBJ_DEPTH = DEPTH * 8;
const AT_BOAT = OBJ_DEPTH / (BOAT_Y - HZ);

type Obj = {
  kind: 'isle' | 'rock' | 'buoy' | 'wreck' | 'ghost' | 'ship';
  x: number;
  z: number;
  /** width in world units */
  ww: number;
  r: number;
  spr: Phaser.GameObjects.Sprite;
  bob: number;
  rang?: number;
};

export class SeaScene extends Phaser.Scene {
  private v!: Voyage;
  private mood!: Mood;
  private phase: 'board' | 'sail' | 'dock' | 'done' = 'board';
  private ocean!: Ocean;
  private sky!: Phaser.GameObjects.Image;
  private t = 0;
  // the boat
  private x = 0;
  private z = 0;
  private hd = 0;
  private spd = CRUISE;
  private turn = 0;
  private boat!: Phaser.GameObjects.Container;
  private sail!: Phaser.GameObjects.Sprite;
  private objs: Obj[] = [];
  private isle!: Obj;
  private dock = { x: 0, z: 0 };
  private clouds: { o: Phaser.GameObjects.Image; az: number; drift: number }[] = [];
  private orb!: Phaser.GameObjects.Image;
  private arrow!: Phaser.GameObjects.Container;
  private rain: Phaser.GameObjects.Graphics | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private padL = false;
  private padR = false;
  private padU = false;
  private nudge = 0;
  private events0: { at: number; fn: () => void }[] = [];
  private shade!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('sea');
  }

  init(data: { voyage?: string }) {
    this.v = VOYAGES[data?.voyage ?? 'w2'] ?? VOYAGES.w2;
    const m = this.v.mood;
    this.mood =
      m === 'wind'
        ? { night: false, chop: 0.8, fog: 0.15 }
        : m === 'calm'
          ? { night: false, chop: 0.18, fog: 0, light: { az: -0.5, width: 10 } }
          : { night: true, chop: 0.12, fog: 0.85, light: { az: 0.35, width: 6 } };
    this.phase = 'board';
    this.t = 0;
    this.x = 0;
    this.z = 0;
    this.hd = 0;
    this.spd = CRUISE;
    this.turn = 0;
    this.objs = [];
    this.clouds = [];
    this.rain = null;
    this.nudge = 0;
    this.events0 = [];
  }

  create() {
    const cam = this.cameras.main;
    cam.setPostPipeline(GBPipeline);
    cam.setBackgroundColor('#000000');
    sound.playSong(this.v.song);
    sound.setAmbience(this.v.amb);
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D }) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pad(p, true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.pad(p, true));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.pad(p, false));
    this.events.once('shutdown', () => {
      this.input.off('pointerdown');
      this.input.off('pointermove');
      this.input.off('pointerup');
    });
    this.board().catch((e) => console.error(e));
  }

  private pad(p: Phaser.Input.Pointer, down: boolean) {
    this.padL = down && p.x < W / 3;
    this.padR = down && p.x > (W * 2) / 3;
    this.padU = down && !this.padL && !this.padR;
  }

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
  }
  private tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  // ================================================================ at the pier

  private async board() {
    const night = this.mood.night;
    const g = this.add.graphics();
    // sky and sea, side on
    const sky = night ? [C.black, C.dark] : this.v.mood === 'wind' ? [C.dark, C.mid] : [C.light, C.white];
    for (let y = 0; y < 200; y += 4) g.fillStyle(y < 100 ? sky[0] : sky[1], 1).fillRect(0, y, W, 4);
    g.fillStyle(night ? C.black : C.dark, 1).fillRect(0, 200, W, 100);
    const isle = this.add.image(120, 206, 'sea_isle_' + this.v.from).setOrigin(0.5, 1).setScale(1.3);
    if (this.v.mood === 'fog') isle.setAlpha(0.8);
    const waves = this.add.graphics();
    // the pier
    const pier = this.add.graphics();
    pier.fillStyle(C.mid, 1).fillRect(0, 222, 214, 5);
    pier.fillStyle(C.light, 1).fillRect(0, 222, 214, 1);
    for (let x = 6; x < 214; x += 22) pier.fillStyle(C.dark, 1).fillRect(x, 227, 4, 40);
    pier.fillStyle(C.black, 1).fillRect(0, 227, 214, 1);
    // the boat, moored at the end
    const boat = this.add.container(262, 252);
    const hull = this.add.sprite(0, 0, 'ti_boat', 0).setOrigin(0.5, 1);
    boat.add(hull);
    const bobT = this.tweens.add({ targets: boat, y: 254, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const waveT = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        waves.clear();
        for (let row = 0; row < 8; row++) {
          const y = 206 + row * 12;
          for (let x = -20; x < W + 20; x += 18) {
            const ox = (x + this.t * (14 + row * 4) + row * 7) % (W + 40) - 20;
            waves.fillStyle(row < 3 ? C.mid : C.light, row < 3 ? 0.6 : 0.4).fillRect(Math.round(ox), y + Math.round(Math.sin(ox * 0.05 + this.t * 2) * 1.5), 7, 1);
          }
        }
      },
    });
    const tick = (_a: number, dl: number) => (this.t += dl / 1000);
    this.events.on('update', tick);
    this.cameras.main.fadeIn(800, 0, 0, 0);
    await this.wait(700);
    // you walk out along the pier, your spirits behind you
    const st = loadState();
    const party = st ? partyOf(st).slice(0, 2) : [];
    const you = this.add.sprite(-12, 223, 'ch_player', 6).setOrigin(0.5, 1).setFlipX(true);
    const pals = party.map((id, i) => this.add.sprite(-34 - i * 18, 223, this.textures.exists('ch_mini_' + id) ? 'ch_mini_' + id : 'ch_player', 6).setOrigin(0.5, 1).setFlipX(true));
    const walkers = [you, ...pals];
    let f = 0;
    const step = this.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        f = (f + 1) % 4;
        walkers.forEach((s) => s.setFrame(6 + [0, 1, 0, 2][f]));
        if (f % 2) sound.play('step');
      },
    });
    await Promise.all(walkers.map((s, i) => this.tw({ targets: s, x: 222 - i * 18, duration: 2400, ease: 'Linear' })));
    step.remove();
    walkers.forEach((s) => s.setFrame(6));
    // one by one they hop down into the boat
    const spots = [-6, 10, -20];
    for (let i = 0; i < walkers.length; i++) {
      const s = walkers[i];
      const tx = boat.x + spots[i], ty = boat.y - 12;
      sound.play('swish');
      await Promise.all([
        this.tw({ targets: s, x: tx, duration: 420, ease: 'Linear' }),
        this.tw({ targets: s, y: { from: s.y, to: s.y - 14 }, duration: 210, yoyo: true, ease: 'Sine.easeOut' }),
      ]);
      s.setPosition(spots[i], -12);
      boat.addAt(s, 0);
      sound.play('creak');
      this.tweens.add({ targets: boat, angle: { from: 3, to: 0 }, duration: 400, ease: 'Back.easeOut' });
      await this.wait(160);
    }
    // the sail fills and the boat pulls away from the pier
    await this.wait(300);
    sound.play('whoosh');
    hull.setFrame(1);
    bobT.stop();
    sound.play('wave');
    await this.tw({ targets: boat, x: W + 70, y: 262, duration: 2600, ease: 'Sine.easeIn' });
    waveT.remove();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    await this.wait(750);
    this.children.removeAll(true);
    this.events.off('update', tick);
    this.setupSea();
    this.cameras.main.fadeIn(900, 0, 0, 0);
    this.phase = 'sail';
    this.intro();
  }

  // ================================================================ the open sea

  private setupSea() {
    const m = this.mood;
    // the sky, painted once
    const key = 'sea_sky_' + this.v.mood;
    if (!this.textures.exists(key)) {
      const cv = this.textures.createCanvas(key, W, HZ)!;
      const ctx = cv.getContext();
      const img = ctx.createImageData(W, HZ);
      const top = m.night ? 0 : this.v.mood === 'wind' ? 1 : 3;
      const bot = m.night ? (m.fog ? 2 : 1) : this.v.mood === 'wind' ? 2 : 4;
      for (let y = 0; y < HZ; y++)
        for (let x = 0; x < W; x++) {
          const v = y / HZ;
          const c = bayer(x, y) < v ? bot : top;
          const [r, g, b] = PAL_RGB[c];
          const i = (y * W + x) * 4;
          img.data[i] = r;
          img.data[i + 1] = g;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
      cv.refresh();
    }
    this.sky = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-100);
    // the sun or the moon
    this.orb = this.add.image(0, m.night ? 34 : 30, 'fx_ring').setDepth(-95).setScale(m.night ? 0.9 : 1.2);
    if (this.v.mood === 'wind') this.orb.setVisible(false);
    const orbCore = this.add.circle(0, this.orb.y, m.night ? 7 : 9, m.night ? C.light : C.white).setDepth(-94);
    const follow = () => orbCore.active && orbCore.setPosition(this.orb.x, this.orb.y).setVisible(this.orb.visible);
    this.events.on('update', follow);
    this.events.once('shutdown', () => this.events.off('update', follow));
    // clouds, at the edge of the world
    for (let i = 0; i < 9; i++) {
      const v = i % 3;
      const bright = !m.night && this.v.mood === 'calm';
      const o = this.add.image(0, 12 + Math.random() * 70, (bright ? 'ti_cloudb' : 'ti_cloud') + v).setDepth(-90 + v).setAlpha(this.v.mood === 'fog' ? 0.4 : 0.85);
      if (this.v.mood === 'wind') o.setScale(1.6);
      this.clouds.push({ o, az: (i / 9) * Math.PI * 2, drift: (this.v.mood === 'wind' ? 0.02 : 0.006) * (1 + v) });
    }
    this.ocean = new Ocean(this, 'sea_water', HZ, W, H - HZ, 2, OBJ_DEPTH);
    this.ocean.img.setDepth(-80);

    // ---- the course: the island, and what you pass on the way
    const isleW = 1500;
    const ix = this.v.mood === 'calm' ? -700 : 800;
    this.isle = this.addObj('isle', ix, DIST, isleW, 0, 'sea_isle_' + this.v.to);
    const dockPx = { saltwash: 70, bacchus: 120, forgotten: 80, hollowhaven: 100 }[this.v.to] ?? 120;
    this.dock = { x: ix + (dockPx / 240 - 0.5) * isleW, z: DIST - 60 };
    const r = mulberry(this.v.mood.length * 97);
    for (let i = 0; i < 12; i++) {
      const z = 700 + (i / 12) * (DIST - 1600);
      const along = (z / DIST) * this.dock.x;
      const side = i % 2 ? 1 : -1;
      this.addObj('rock', along + side * (90 + r() * 300), z + r() * 200, 70 + r() * 40, 38, 'sea_rock' + (i % 2));
    }
    for (let i = 0; i < 5; i++) {
      const z = 1200 + i * 1000;
      const along = (z / DIST) * this.dock.x;
      this.addObj('buoy', along + (i % 2 ? 80 : -80), z, 18, 12, 'sea_buoy');
    }
    if (this.v.mood === 'wind') {
      // far off, broken and listing: the Flying Dutchman
      this.addObj('wreck', -2400, 3600, 900, 0, 'sea_dutchman');
    } else if (this.v.mood === 'calm') {
      // another sail, heading the other way
      const sh = this.addObj('ship', 900, 2600, 120, 0, 'ti_boat');
      sh.spr.setFlipX(true);
    } else {
      this.addObj('wreck', 200, 2300, 110, 30, 'sea_mast');
      this.addObj('wreck', -360, 4200, 100, 30, 'sea_mast');
      for (let i = 0; i < 7; i++) {
        const o = this.addObj('ghost', (r() - 0.5) * 900 + (i / 7) * this.dock.x, 900 + i * 700, 16, 0, 'ti_wisp');
        o.spr.play({ key: 'ti_wisp_burn', startFrame: i % 4 });
      }
    }

    // ---- your boat, from just behind
    const n = this.mood.night ? 'N' : '';
    const boat = this.add.container(W / 2, BOAT_Y).setDepth(50);
    this.sail = this.add.sprite(0, 0, 'sea_stern' + n, 0).setOrigin(0.5, 1);
    boat.add(this.sail);
    const st = loadState();
    const party = st ? partyOf(st).slice(0, 2) : [];
    party.forEach((id, i) => {
      const key = this.textures.exists('ch_mini_' + id) ? 'ch_mini_' + id : null;
      if (key) boat.add(this.add.sprite(i ? 16 : -16, -16, key, 3).setOrigin(0.5, 1));
    });
    boat.add(this.add.sprite(0, -14, 'ch_player', 3).setOrigin(0.5, 1));
    boat.add(this.add.image(0, 4, 'sea_rail' + n).setOrigin(0.5, 1));
    this.boat = boat;
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.sail.setFrame(this.sail.frame.name === '0' ? 1 : 0) });

    // ---- the way to the island when it is off to one side
    const ar = this.add.container(0, 0).setDepth(70).setVisible(false);
    const ag = this.add.graphics();
    ar.add(ag);
    ar.add(txt(this, 0, 10, this.v.toName, { color: C.white, outline: true, origin: [0.5, 0] }));
    (ar as any).g = ag;
    this.arrow = ar;

    // ---- weather
    if (this.v.mood === 'wind') {
      this.rain = this.add.graphics().setDepth(80);
      this.time.addEvent({ delay: 9000 + Math.random() * 6000, loop: true, callback: () => this.lightning() });
    }
    if (this.v.mood === 'fog') {
      // low fog lying across the water
      const fg = this.add.graphics().setDepth(-70);
      for (let i = 0; i < 6; i++) fg.fillStyle(C.mid, 0.08 + i * 0.02).fillRect(0, HZ - 12 + i * 4, W, 10);
    }
    this.shade = this.add.rectangle(0, 0, W, H, C.white, 0).setOrigin(0, 0).setDepth(90);

    // ---- moments along the way
    const life = this.v.mood === 'calm' ? () => this.leap() : this.v.mood === 'fog' ? () => this.ghostLight() : () => this.spray();
    this.time.addEvent({ delay: 5200, loop: true, callback: life });
    this.time.addEvent({ delay: 11000, loop: true, callback: () => this.gulls() });
    this.time.delayedCall(3000, () => this.gulls());
    if (this.v.mood === 'fog') this.events0.push({ at: DIST * 0.45, fn: () => this.beneath() });
    if (this.v.mood === 'calm') this.events0.push({ at: DIST * 0.7, fn: () => this.fireworks() });
  }

  private addObj(kind: Obj['kind'], x: number, z: number, ww: number, r: number, key: string): Obj {
    const spr = this.add.sprite(-999, -999, key, 0).setOrigin(0.5, kind === 'ghost' ? 0.5 : 1);
    const o: Obj = { kind, x, z, ww, r, spr, bob: Math.random() * 6 };
    this.objs.push(o);
    return o;
  }

  /** Where you are going, and how to steer. */
  private intro() {
    const c = this.add.container(0, 0).setDepth(85).setAlpha(0);
    const g = this.add.graphics();
    box(g, W / 2 - 150, 8, 300, 34, 'dark');
    c.add(g);
    c.add(txt(this, W / 2, 14, `SAIL TO ${this.v.toName}`, { color: C.white, origin: [0.5, 0] }));
    c.add(txt(this, W / 2, 27, 'LEFT/RIGHT: STEER   UP: FULL SAIL   DOWN: SLOW', { color: C.light, origin: [0.5, 0] }));
    this.tweens.add({ targets: c, alpha: 1, duration: 500, delay: 900 });
    this.tweens.add({ targets: c, alpha: 0, duration: 800, delay: 8000, onComplete: () => c.destroy() });
  }

  update(_time: number, delta: number) {
    if (this.phase !== 'sail' && this.phase !== 'dock') return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || this.padL;
    const right = k.right.isDown || k.d.isDown || this.padR;
    const up = k.up.isDown || k.w.isDown || this.padU;
    const down = k.down.isDown || k.s.isDown;
    // the way to the dock, relative to where the bow is pointing
    const bearing = Math.atan2(this.dock.x - this.x, this.dock.z - this.z);
    const off = wrapAngle(bearing - this.hd);
    const dist = Math.hypot(this.dock.x - this.x, this.dock.z - this.z);
    let want = 0;
    let target = CRUISE;
    if (this.phase === 'sail') {
      want = (right ? 1 : 0) - (left ? 1 : 0);
      target = up ? FULL : down ? SLOW : CRUISE;
      // strayed too far (or turned right round): the current brings you back on course
      const lost = Math.abs(off) > 1.4 || Math.abs(this.x - (this.z / DIST) * this.dock.x) > 1700;
      if (lost && !left && !right) want = Math.sign(off) * 0.8;
      if (lost && this.nudge <= 0) {
        this.nudge = 6;
        this.toast(`THE CURRENT PULLS YOU BACK TOWARD ${this.v.toName}`);
      }
      this.nudge -= dt;
      if (dist < 820) this.arrive();
    } else {
      // docking: the boat lines itself up and glides in
      want = Math.max(-1, Math.min(1, off * 3));
      target = Math.max(28, Math.min(CRUISE, dist * 0.18));
    }
    this.turn += (want - this.turn) * Math.min(1, dt * 4);
    this.hd = wrapAngle(this.hd + this.turn * 0.8 * dt);
    this.spd += (target - this.spd) * Math.min(1, dt * 0.9);
    this.x += Math.sin(this.hd) * this.spd * dt;
    this.z += Math.cos(this.hd) * this.spd * dt;
    // the wind pushes you sideways on the grey crossing
    if (this.v.mood === 'wind') this.x += 9 * dt * Math.sin(this.t * 0.2 + 1);
    this.collide();
    for (const e of this.events0) if (e.at >= 0 && this.z > e.at) {
      e.at = -1;
      e.fn();
    }

    // ---- draw
    const roll = (Math.sin(this.t * 1.4) * 0.025 * (1 + this.mood.chop * 2) - this.turn * 0.07) * (settings.reducedMotion ? 0.5 : 1);
    this.boat.rotation = roll;
    this.boat.y = BOAT_Y + Math.sin(this.t * 1.9) * (1 + this.mood.chop * 2);
    this.ocean.render(this.x, this.z, this.hd, this.t, this.mood, { x: W / 2, y: BOAT_Y - 12, speed: this.spd / FULL, turn: this.turn });
    const azX = (az: number) => W / 2 + wrapAngle(az - this.hd) * FOCAL;
    if (this.mood.light) this.orb.x = azX(this.mood.light.az);
    for (const c of this.clouds) {
      c.az += c.drift * dt;
      c.o.x = azX(c.az);
    }
    this.drawObjs();
    this.drawArrow(off);
    if (this.rain) this.drawRain();
  }

  private drawObjs() {
    const s = Math.sin(this.hd), co = Math.cos(this.hd);
    const fog = this.mood.fog;
    for (const o of this.objs) {
      const rx = o.x - this.x, rz = o.z - this.z;
      const fz = rx * s + rz * co;
      const lat = rx * co - rz * s;
      if (fz < AT_BOAT * 0.5) {
        o.spr.setVisible(false);
        continue;
      }
      const sx = W / 2 + (lat * FOCAL) / fz;
      const wpx = (o.ww * FOCAL) / fz;
      const sc = wpx / o.spr.width;
      let y = HZ + OBJ_DEPTH / fz;
      if (o.kind === 'ghost') y -= wpx * 0.6 + Math.sin(this.t * 2 + o.bob) * wpx * 0.2;
      // the island's shore sits down in the water instead of resting on top of it
      else if (o.kind === 'isle') y += o.spr.height * sc * 0.14;
      else y += Math.sin(this.t * 1.6 + o.bob) * Math.min(2, wpx * 0.02);
      o.spr.setVisible(sx > -wpx && sx < W + wpx).setPosition(sx, y).setScale(sc).setDepth(-60 - fz / 100);
      // far things fade into the haze; in the fog, far sooner
      const far = o.kind === 'isle' ? (fog ? 3200 : 9000) : fog ? 1500 : 4200;
      let a = Math.max(0, Math.min(1, (far - fz) / (far * 0.35)));
      if (o.kind === 'ghost') a *= 0.55 + Math.sin(this.t * 3 + o.bob) * 0.35;
      o.spr.setAlpha(a);
      // a bell buoy rings as you pass it
      if (o.kind === 'buoy') {
        o.spr.setFrame(Math.sin(this.t * 2 + o.bob) > 0 ? 1 : 0);
        if (!o.rang && fz < 300 && Math.abs(lat) < 200) {
          o.rang = 1;
          sound.play('bell');
        }
      }
    }
  }

  private drawArrow(off: number) {
    const ar = this.arrow;
    const sx = W / 2 + off * FOCAL;
    const show = this.phase === 'sail' && (sx < 24 || sx > W - 24);
    ar.setVisible(show);
    if (!show) return;
    const g = (ar as any).g as Phaser.GameObjects.Graphics;
    const d = sx < W / 2 ? -1 : 1;
    ar.setPosition(d < 0 ? 52 : W - 52, HZ - 34);
    g.clear();
    g.fillStyle(C.white, 0.6 + Math.sin(this.t * 6) * 0.4);
    g.fillTriangle(d * 34, 0, d * 26, -6, d * 26, 6);
    g.fillStyle(C.black, 1);
  }

  private drawRain() {
    const g = this.rain!;
    g.clear();
    g.lineStyle(1, C.light, 0.5);
    for (let i = 0; i < 70; i++) {
      const x = (i * 53 + this.t * 220 + this.hd * 300) % (W + 40) - 20;
      const y = (i * 97 + this.t * 520) % (H + 20) - 10;
      g.lineBetween(x, y, x - 4, y + 9);
    }
  }

  private collide() {
    const bx = this.x + Math.sin(this.hd) * AT_BOAT, bz = this.z + Math.cos(this.hd) * AT_BOAT;
    for (const o of this.objs) {
      if (!o.r) continue;
      const dx = bx - o.x, dz = bz - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r + 14) {
        // a bump: pushed clear, and slowed right down
        const push = (o.r + 14 - d) / Math.max(1, d);
        this.x += dx * push;
        this.z += dz * push;
        if (this.spd > 30) {
          sound.play('bump');
          sound.play('creak');
          if (!settings.reducedMotion) this.cameras.main.shake(180, 0.006);
        }
        this.spd = Math.min(this.spd, 18);
      }
    }
  }

  private toast(s: string) {
    const t = txt(this, W / 2, HZ + 12, s, { color: C.white, outline: true, origin: [0.5, 0] }).setDepth(86);
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 600, onComplete: () => t.destroy() });
  }

  // ================================================================ moments

  private gulls() {
    if (this.phase !== 'sail' && this.phase !== 'dock') return;
    const night = this.mood.night;
    if (night && Math.random() < 0.6) return;
    const right = Math.random() < 0.5;
    const y = 30 + Math.random() * 50;
    const key = night || this.v.mood === 'wind' ? 'ti_gull' : 'ti_gullw';
    for (let i = 0; i < 3; i++) {
      const g = this.add.sprite(right ? -20 - i * 14 : W + 20 + i * 14, y + i * 6, key).play({ key: key + '_flap', startFrame: i }).setDepth(60);
      this.tweens.add({ targets: g, x: right ? W + 40 : -40, y: y + (Math.random() - 0.5) * 40, duration: 7000 + i * 500, onComplete: () => g.destroy() });
    }
    if (!night) sound.play('gull');
  }

  /** Calm water: a fish leaps beside the boat. */
  private leap() {
    if (this.phase !== 'sail') return;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x0 = W / 2 + side * (70 + Math.random() * 90);
    const y0 = HZ + 70 + Math.random() * 60;
    const f = this.add.sprite(x0, y0, 'sea_fish', 0).setDepth(40).setFlipX(side < 0);
    const p = { u: 0 };
    sound.play('splash');
    this.tweens.add({
      targets: p,
      u: 1,
      duration: 900,
      onUpdate: () => {
        f.setPosition(x0 + side * p.u * 30, y0 - Math.sin(p.u * Math.PI) * 26);
        f.setFrame(p.u < 0.35 ? 0 : p.u < 0.65 ? 1 : 2);
      },
      onComplete: () => {
        sound.play('splash');
        f.destroy();
      },
    });
  }

  /** The grey crossing: a wave breaks over the bow. */
  private spray() {
    if (this.phase !== 'sail') return;
    sound.play('wave');
    for (let i = 0; i < 14; i++) {
      const d = this.add.image(W / 2 + (Math.random() - 0.5) * 50, BOAT_Y - 70, 'fx_px').setDepth(55).setScale(1 + Math.round(Math.random()));
      this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 90, y: d.y + 30 + Math.random() * 40, alpha: 0, duration: 600 + Math.random() * 400, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
  }

  private lightning() {
    if (this.phase !== 'sail' || settings.reducedMotion) return;
    this.shade.setAlpha(0.55);
    this.tweens.add({ targets: this.shade, alpha: 0, duration: 380 });
    this.time.delayedCall(500 + Math.random() * 700, () => sound.play('thunder_far'));
  }

  /** The fog: a light under the water, keeping pace with you for a while. */
  private ghostLight() {
    if (this.phase !== 'sail') return;
    const side = Math.random() < 0.5 ? -1 : 1;
    const w = this.add.sprite(W / 2 + side * (60 + Math.random() * 80), HZ + 90 + Math.random() * 40, 'ti_wisp').setDepth(-50).setAlpha(0).play('ti_wisp_burn');
    this.tweens.add({ targets: w, alpha: 0.5, duration: 900, yoyo: true, hold: 1400, onComplete: () => w.destroy() });
    this.tweens.add({ targets: w, y: w.y + 30, x: w.x + side * 20, duration: 3200 });
  }

  /** The fog: something enormous passes slowly beneath the boat. */
  private beneath() {
    sound.play('rumble');
    const sh = this.add.ellipse(-120, BOAT_Y - 40, 220, 56, C.black, 0).setDepth(45);
    this.tweens.add({ targets: sh, fillAlpha: 0.55, duration: 1200, yoyo: true, hold: 2200 });
    this.tweens.add({ targets: sh, x: W + 140, duration: 4800, ease: 'Sine.easeInOut', onComplete: () => sh.destroy() });
    if (!settings.reducedMotion) this.cameras.main.shake(1600, 0.003);
    this.time.delayedCall(1800, () => this.toast('SOMETHING VERY LARGE PASSES UNDER THE BOAT...'));
  }

  /** Bacchus Key, getting closer: fireworks over the island. */
  private fireworks() {
    const go = () => {
      if (this.phase === 'done' || !this.isle.spr.visible) return;
      const s = this.isle.spr;
      const x = s.x + (Math.random() - 0.5) * s.displayWidth * 0.6;
      const y = s.y - s.displayHeight * (0.9 + Math.random() * 0.5);
      sound.play('boom');
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const d = this.add.image(x, y, 'fx_px').setDepth(-55);
        this.tweens.add({ targets: d, x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18 + 6, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
      }
    };
    go();
    this.time.addEvent({ delay: 1300, repeat: 30, callback: go });
  }

  // ================================================================ landfall

  private arrive() {
    if (this.phase !== 'sail') return;
    this.phase = 'dock';
    this.toast(`${this.v.toName}`);
    sound.play('horn');
    this.time.delayedCall(4200, () => this.land());
  }

  private land() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    sound.play('creak');
    this.cameras.main.fadeOut(1100, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      sound.stopMusic();
      this.scene.start('world', { ...this.v.dest });
    });
  }
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
