import Phaser from 'phaser';
import { GBPipeline } from '../gfx/GBPipeline';
import { txt, box, C } from '../ui/ui';
import { W, H } from '../constants';
import { sound } from '../audio/audio';
import { settings, updateSettings } from '../settings';
import { loadState, clearState, partyOf, type StoryState } from '../story/state';
import { getMap } from '../world/maps';
import { getCreature } from '../engine/creatures';
import { logoWispSpot } from '../gfx/artVoyage';
import { Ocean, type Mood } from './sea/ocean';

// WISPBOUND's title screen: a lantern-lit boat on a moonlit sea, the islands of the whole
// adventure on the horizon, wisps rising off the water. NEW GAME, CONTINUE, SETTINGS, CREDITS.

const HZ = 196; // the horizon
const MENU = ['NEW GAME', 'CONTINUE', 'ROGUELIKE', 'SETTINGS', 'CREDITS'] as const;
const MENU_Y = 104;
const ROW = 17;

type Mode = 'intro' | 'press' | 'menu' | 'confirm' | 'settings' | 'credits' | 'leaving';

export class TitleScene extends Phaser.Scene {
  private mode: Mode = 'intro';
  private sel = 0;
  private save: StoryState | null = null;
  private ocean!: Ocean;
  private mood: Mood = { night: true, chop: 0.2, fog: 0, light: { az: 0.6, width: 12 } };
  private t = 0;
  private boat!: Phaser.GameObjects.Container;
  private menuC!: Phaser.GameObjects.Container;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.Sprite;
  private note!: Phaser.GameObjects.BitmapText;
  private press!: Phaser.GameObjects.BitmapText;
  private panel: Phaser.GameObjects.Container | null = null;
  private panelKey: ((k: string) => void) | null = null;
  private clouds: { o: Phaser.GameObjects.Image; v: number }[] = [];
  private beam!: Phaser.GameObjects.Graphics;

  constructor() {
    super('title');
  }

  init() {
    this.mode = 'intro';
    this.panel = null;
    this.panelKey = null;
    this.items = [];
    this.clouds = [];
    this.t = 0;
  }

  create() {
    const cam = this.cameras.main;
    cam.setPostPipeline(GBPipeline);
    cam.setBackgroundColor('#000000');
    this.save = loadState();
    this.sel = this.save ? 1 : 0;

    // ---- the sky, the clouds, the far islands, the sea
    this.add.image(0, 0, 'ti_sky').setOrigin(0, 0);
    for (let i = 0; i < 7; i++) {
      const v = i % 3;
      const o = this.add.image(Math.random() * W, 18 + Math.random() * 110, 'ti_cloud' + v).setAlpha(0.55 + Math.random() * 0.35);
      this.clouds.push({ o, v });
    }
    this.add.image(0, HZ - 44, 'ti_far').setOrigin(0, 0);
    // Hollowhaven's lighthouse still turns
    this.beam = this.add.graphics();
    const lamp = this.add.image(116, HZ - 41, 'fx_px').setScale(3);
    this.tweens.add({ targets: lamp, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
    this.ocean = new Ocean(this, 'ti_ocean', HZ, W, H - HZ, 2);

    // ---- the boat, a lantern, the hooded traveller, two wisps keeping it company
    const boat = this.add.container(118, 262);
    const hull = this.add.sprite(0, 0, 'ti_boat', 0).setOrigin(0.5, 1);
    const you = this.add.sprite(-12, -12, 'ch_player', 6).setOrigin(0.5, 1).setFlipX(true);
    boat.add([you, hull]);
    this.boat = boat;
    this.time.addEvent({ delay: 900, loop: true, callback: () => hull.setFrame(hull.frame.name === '0' ? 1 : 0) });
    for (let i = 0; i < 2; i++) {
      const w = this.add.sprite(boat.x, boat.y - 40, 'ti_wisp').play({ key: 'ti_wisp_burn', startFrame: i * 2 });
      const ph = i * Math.PI;
      this.events.on('update', () => {
        const a = this.t * 0.9 + ph;
        w.setPosition(boat.x + Math.cos(a) * 30, boat.y - 44 + Math.sin(a * 1.3) * 8);
        w.setDepth(Math.sin(a) > 0 ? 5 : -1);
      });
    }
    // wisps drifting up off the water, now and then
    this.time.addEvent({ delay: 1300, loop: true, callback: () => this.riseWisp() });
    // a pair of gulls, now and then
    this.time.addEvent({ delay: 9000, loop: true, callback: () => this.gulls() });
    this.time.delayedCall(2500, () => this.gulls());
    // a shooting star
    this.time.addEvent({ delay: 7000, loop: true, callback: () => this.star() });

    // ---- the logo
    const lg = this.add.image(W / 2, 18, 'ti_logo').setOrigin(0.5, 0).setDepth(20).setAlpha(0);
    const ws = logoWispSpot();
    const lw = this.add.sprite(lg.x - lg.width / 2 + ws.x, lg.y + ws.y - 2, 'ti_wispbig').setOrigin(0.5, 1).setDepth(21).setAlpha(0).play('ti_wispbig_burn');
    const glow = this.add.image(lw.x, lw.y - 12, 'fx_ring').setDepth(19).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: lg, alpha: 1, y: 22, duration: 1800, delay: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: lw, alpha: 1, y: lw.y + 4, duration: 1800, delay: 400, ease: 'Sine.easeOut' });
    this.time.delayedCall(2300, () => {
      this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 0.15 }, scale: { from: 0.5, to: 0.8 }, duration: 1400, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: lg, y: 20, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: lw, y: lw.y - 2, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ---- PRESS SPACE/X, then the menu
    this.press = txt(this, W / 2, MENU_Y + 30, 'PRESS SPACE/X', { outline: true, origin: [0.5, 0] }).setDepth(20).setAlpha(0);
    this.time.delayedCall(2000, () => {
      if (this.mode !== 'intro') return;
      this.mode = 'press';
      this.tweens.add({ targets: this.press, alpha: { from: 0, to: 1 }, duration: 600 });
      this.tweens.add({ targets: this.press, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, delay: 600 });
    });
    this.buildMenu();
    txt(this, W - 4, H - 10, 'V1.0', { color: C.dark, origin: [1, 0] }).setDepth(20);

    cam.fadeIn(1400, 0, 0, 0);
    sound.playSong('title');
    sound.setAmbience('title');

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === ' ') e.preventDefault();
      this.key(e.key);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointer(p.x, p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.hover(p.x, p.y));
    this.events.once('shutdown', () => {
      kb.off('keydown');
      this.input.off('pointerdown');
      this.input.off('pointermove');
      this.events.off('update');
    });
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.t += dt;
    // the boat rides the swell; the sea rolls slowly past it
    this.boat.y = 262 + Math.sin(this.t * 1.3) * 1.5;
    this.boat.rotation = Math.sin(this.t * 0.9) * 0.035;
    this.ocean.render(0, this.t * 14, 0, this.t, this.mood, { x: this.boat.x - 30, y: 262, speed: 0.15, turn: -0.6 });
    for (const c of this.clouds) {
      c.o.x -= dt * (3 + c.v * 2);
      if (c.o.x < -60) {
        c.o.x = W + 60;
        c.o.y = 18 + Math.random() * 110;
      }
    }
    // the lighthouse beam, sweeping
    const a = this.t * 0.8;
    const g = this.beam;
    g.clear();
    const s = Math.cos(a);
    if (s > -0.2) {
      g.fillStyle(C.light, 0.12 + 0.12 * Math.max(0, s));
      const len = 90 * (0.3 + 0.7 * Math.abs(Math.sin(a)));
      const dir = Math.sin(a) > 0 ? 1 : -1;
      g.fillTriangle(116, HZ - 41, 116 + dir * len, HZ - 48, 116 + dir * len, HZ - 34);
    }
  }

  // ================================================================ ambient life

  private riseWisp() {
    const x = 20 + Math.random() * (W - 40);
    const w = this.add.sprite(x, HZ + 10 + Math.random() * 70, 'ti_wisp').setAlpha(0).setScale(0.6 + Math.random() * 0.4).play('ti_wisp_burn');
    this.tweens.add({ targets: w, alpha: { from: 0, to: 0.8 }, duration: 800, yoyo: true, hold: 1800 });
    this.tweens.add({ targets: w, y: w.y - 60 - Math.random() * 40, x: x + (Math.random() - 0.5) * 40, duration: 3400, ease: 'Sine.easeOut', onComplete: () => w.destroy() });
  }

  private gulls() {
    const y = 40 + Math.random() * 60;
    const right = Math.random() < 0.5;
    for (let i = 0; i < 2; i++) {
      const g = this.add.sprite(right ? -20 - i * 16 : W + 20 + i * 16, y + i * 7, 'ti_gull').play({ key: 'ti_gull_flap', startFrame: i }).setAlpha(0.8);
      this.tweens.add({ targets: g, x: right ? W + 30 : -30, y: y + i * 7 + (Math.random() - 0.5) * 30, duration: 14000 + i * 600, onComplete: () => g.destroy() });
    }
  }

  private star() {
    const x = 30 + Math.random() * 250, y = 10 + Math.random() * 50;
    const g = this.add.graphics();
    const p = { t: 0 };
    this.tweens.add({
      targets: p,
      t: 1,
      duration: 700,
      onUpdate: () => {
        g.clear();
        const hx = x + p.t * 70, hy = y + p.t * 24;
        g.lineStyle(1, C.white, 1 - p.t).lineBetween(hx - 18, hy - 6, hx, hy);
      },
      onComplete: () => g.destroy(),
    });
  }

  // ================================================================ the menu

  private buildMenu() {
    const c = this.add.container(0, 0).setDepth(20).setAlpha(0);
    this.menuC = c;
    // a soft dark band behind the options so they read over the sky
    const g = this.add.graphics();
    g.fillStyle(C.black, 0.55).fillRect(W / 2 - 82, MENU_Y - 8, 164, MENU.length * ROW + 12);
    c.add(g);
    this.items = MENU.map((m, i) => {
      const t = txt(this, W / 2, MENU_Y + i * ROW, m, { outline: true, origin: [0.5, 0] });
      c.add(t);
      return t;
    });
    this.cursor = this.add.sprite(0, 0, 'ti_wisp').play('ti_wisp_burn').setOrigin(0.5, 1);
    c.add(this.cursor);
    this.note = txt(this, W / 2, MENU_Y + MENU.length * ROW + 8, '', { color: C.light, origin: [0.5, 0] });
    c.add(this.note);
    this.drawMenu(false);
  }

  private showMenu() {
    this.mode = 'menu';
    this.tweens.killTweensOf(this.press);
    this.tweens.add({ targets: this.press, alpha: 0, duration: 200 });
    this.tweens.add({ targets: this.menuC, alpha: 1, duration: 400 });
  }

  private drawMenu(animate = true) {
    this.items.forEach((t, i) => {
      const on = i === this.sel;
      const off = i === 1 && !this.save;
      t.setTint(off ? C.dark : on ? C.white : C.mid);
      this.tweens.killTweensOf(t);
      if (animate && on) this.tweens.add({ targets: t, x: { from: W / 2 + 6, to: W / 2 + 4 }, duration: 160, ease: 'Back.easeOut' });
      else t.x = on ? W / 2 + 4 : W / 2;
    });
    const t = this.items[this.sel];
    this.cursor.setPosition(W / 2 - t.width / 2 - 12, MENU_Y + this.sel * ROW + 10);
    this.tweens.killTweensOf(this.cursor);
    this.tweens.add({ targets: this.cursor, x: this.cursor.x + 2, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // what CONTINUE will load
    if (this.sel === 1) this.note.setText(this.save ? this.saveLine(this.save) : 'NO SAVED GAME YET');
    else if (MENU[this.sel] === 'ROGUELIKE') this.note.setText('CO-OP DUNGEON RUNS FOR 1 TO 4 PLAYERS');
    else this.note.setText('');
  }

  private saveLine(st: StoryState) {
    let where = st.map;
    try {
      where = getMap(st.map).name;
    } catch {
      /* an unknown map: show its id */
    }
    const n = partyOf(st).length;
    return `${where}${n ? ` - ${n} SPIRIT${n > 1 ? 'S' : ''}` : ''}`;
  }

  private move(d: number) {
    this.sel = (this.sel + d + MENU.length) % MENU.length;
    sound.play('move');
    this.drawMenu();
  }

  private choose() {
    const m = MENU[this.sel];
    if (m === 'CONTINUE' && !this.save) return sound.play('deny');
    sound.play('select');
    const t = this.items[this.sel];
    this.tweens.add({ targets: t, alpha: 0.2, duration: 70, yoyo: true, repeat: 2 });
    if (m === 'NEW GAME') {
      if (this.save) this.confirmNew();
      else this.start(true);
    } else if (m === 'CONTINUE') this.start(false);
    else if (m === 'ROGUELIKE') this.startRogue();
    else if (m === 'SETTINGS') this.openSettings();
    else this.openCredits();
  }

  private start(fresh: boolean) {
    this.mode = 'leaving';
    if (fresh) clearState();
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    this.tweens.add({ targets: this.boat, x: this.boat.x + 40, duration: 900 });
    cam.once('camerafadeoutcomplete', () => {
      sound.stopMusic();
      this.scene.start('world', {});
    });
  }

  /** The roguelike is its own mode with its own progress: the story's save is never touched from there. */
  private startRogue() {
    this.mode = 'leaving';
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      sound.stopMusic();
      this.scene.start('rogue-lobby', {});
    });
  }

  // ================================================================ panels

  private closePanel() {
    this.panel?.destroy();
    this.panel = null;
    this.panelKey = null;
    this.mode = 'menu';
    this.menuC.setVisible(true);
  }

  private panelBox(w: number, h: number, title: string) {
    const c = this.add.container(0, 0).setDepth(40);
    const g = this.add.graphics();
    g.fillStyle(C.black, 0.6).fillRect(0, 0, W, H);
    box(g, (W - w) / 2, (H - h) / 2, w, h, 'dark');
    c.add(g);
    c.add(txt(this, W / 2, (H - h) / 2 + 8, title, { outline: true, origin: [0.5, 0] }));
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    this.panel = c;
    this.menuC.setVisible(false);
    return c;
  }

  /** Never erase a save without asking. */
  private confirmNew() {
    this.mode = 'confirm';
    const c = this.panelBox(300, 96, 'START A NEW GAME?');
    c.add(txt(this, W / 2, H / 2 - 14, 'YOUR SAVED ADVENTURE WILL BE ERASED.', { color: C.light, origin: [0.5, 0] }));
    c.add(txt(this, W / 2, H / 2 - 4, 'THIS CANNOT BE UNDONE.', { color: C.mid, origin: [0.5, 0] }));
    const opts = ['NO, KEEP MY SAVE', 'YES, START OVER'];
    let s = 0;
    const g = this.add.graphics();
    c.add(g);
    const labels = opts.map((o, i) => {
      const l = txt(this, W / 2 - 70 + i * 140, H / 2 + 20, o, { origin: [0.5, 0] });
      c.add(l);
      return l;
    });
    const draw = () => {
      g.clear();
      opts.forEach((_, i) => {
        box(g, W / 2 - 70 + i * 140 - 64, H / 2 + 15, 128, 18, i === s ? 'light' : 'dark');
        labels[i].setTint(i === s ? C.black : C.white);
      });
    };
    draw();
    this.panelKey = (k) => {
      if (k === 'left' || k === 'right') {
        s = 1 - s;
        sound.play('move');
        draw();
      } else if (k === 'a') {
        if (s === 1) {
          sound.play('select');
          this.closePanel();
          this.start(true);
        } else {
          sound.play('back');
          this.closePanel();
        }
      } else if (k === 'b') {
        sound.play('back');
        this.closePanel();
      }
    };
    (c as any).pick = (x: number, y: number) => {
      if (y < H / 2 + 12 || y > H / 2 + 36) return;
      s = x < W / 2 ? 0 : 1;
      draw();
      this.panelKey!('a');
    };
  }

  private openSettings() {
    this.mode = 'settings';
    const c = this.panelBox(300, 176, 'SETTINGS');
    const rows: { label: string; val: () => string; change: (d: number) => void }[] = [
      { label: 'MUSIC VOLUME', val: () => bar(settings.music), change: (d) => updateSettings({ music: clamp(settings.music + d) }) },
      {
        label: 'EFFECTS VOLUME',
        val: () => bar(settings.sfx),
        change: (d) => {
          updateSettings({ sfx: clamp(settings.sfx + d) });
          sound.play('select');
        },
      },
      { label: 'MASTER VOLUME', val: () => bar(settings.volume), change: (d) => updateSettings({ volume: clamp(settings.volume + d) }) },
      { label: 'SOUND', val: () => (settings.sound ? 'ON' : 'OFF'), change: () => updateSettings({ sound: !settings.sound }) },
      { label: 'BATTLE SPEED', val: () => `${settings.speed}X`, change: (d) => updateSettings({ speed: ((settings.speed - 1 + d + 3) % 3) + 1 }) },
      { label: 'SCREEN MOTION', val: () => (settings.reducedMotion ? 'REDUCED' : 'FULL'), change: () => updateSettings({ reducedMotion: !settings.reducedMotion }) },
      {
        label: 'FULLSCREEN',
        val: () => (document.fullscreenElement ? 'ON' : 'OFF'),
        change: () => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
          window.setTimeout(draw, 300);
        },
      },
      { label: 'BACK', val: () => '', change: () => {} },
    ];
    let s = 0;
    const top = H / 2 - 62;
    const g = this.add.graphics();
    c.add(g);
    const L = rows.map((r, i) => {
      const a = txt(this, W / 2 - 132, top + i * 16, r.label, { origin: [0, 0] });
      const b = txt(this, W / 2 + 132, top + i * 16, '', { origin: [1, 0] });
      c.add([a, b]);
      return [a, b] as const;
    });
    const hint = txt(this, W / 2, H / 2 + 74, 'LEFT/RIGHT: CHANGE   X: BACK', { color: C.mid, origin: [0.5, 0] });
    c.add(hint);
    function draw() {
      g.clear();
      g.fillStyle(C.dark, 1).fillRect(W / 2 - 138, top + s * 16 - 3, 276, 14);
      rows.forEach((r, i) => {
        L[i][0].setTint(i === s ? C.white : C.light);
        L[i][1].setText(i === s && r.label !== 'BACK' ? `< ${r.val()} >` : r.val());
        L[i][1].setTint(i === s ? C.white : C.mid);
      });
    }
    draw();
    this.panelKey = (k) => {
      if (k === 'up' || k === 'down') {
        s = (s + (k === 'up' ? -1 : 1) + rows.length) % rows.length;
        sound.play('move');
      } else if (k === 'left' || k === 'right') {
        if (rows[s].label === 'BACK') return;
        rows[s].change(k === 'left' ? -1 : 1);
        if (rows[s].label !== 'EFFECTS VOLUME') sound.play('move');
      } else if (k === 'a') {
        if (rows[s].label === 'BACK') {
          sound.play('back');
          return this.closePanel();
        }
        rows[s].change(1);
        sound.play('move');
      } else if (k === 'b') {
        sound.play('back');
        return this.closePanel();
      }
      draw();
    };
    (c as any).pick = (x: number, y: number) => {
      const i = Math.floor((y - top + 3) / 16);
      if (i < 0 || i >= rows.length) return;
      s = i;
      this.panelKey!(rows[i].label === 'BACK' ? 'a' : x < W / 2 + 40 ? 'right' : x < W / 2 + 90 ? 'left' : 'right');
      draw();
    };
  }

  private openCredits() {
    this.mode = 'credits';
    const c = this.add.container(0, 0).setDepth(40);
    this.panel = c;
    this.menuC.setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(C.black, 0.88).fillRect(0, 0, W, H);
    c.add(g);
    const roll = this.add.container(0, H + 10);
    c.add(roll);
    let y = 0;
    const line = (s: string, color: number = C.white, gap = 14, outline = false) => {
      roll.add(txt(this, W / 2, y, s, { color, outline, origin: [0.5, 0] }));
      y += gap;
    };
    roll.add(this.add.image(W / 2, y, 'ti_logo').setOrigin(0.5, 0).setScale(0.7));
    y += 54;
    line('GAME MADE BY', C.light, 14);
    line('ZAIN SALTSMAN', C.white, 30, true);
    line('THE ISLANDS', C.mid, 16);
    for (const s of ['HOLLOWHAVEN', 'SALTWASH ISLAND', 'BACCHUS KEY', 'THE FORGOTTEN ISLAND', "THE REAPER'S PRISON"]) line(s, C.white, 13);
    y += 16;
    line('THE SPIRITS', C.mid, 16);
    const ids = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith', 'glowbell', 'hammerfin', 'bubblotl', 'glidray', 'scorvlet', 'widowling', 'ironbud'];
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 4; i++) {
        const id = ids[r * 4 + i];
        const x = W / 2 - 120 + i * 80;
        if (this.textures.exists('cr_' + id)) {
          const sp = this.add.sprite(x, y, 'cr_' + id, 0).setOrigin(0.5, 0);
          if (this.anims.exists(`cr_${id}_idle`)) sp.play(`cr_${id}_idle`);
          roll.add(sp);
        }
        let name = id.toUpperCase();
        try {
          name = getCreature(id).name;
        } catch {
          /* keep the id */
        }
        roll.add(txt(this, x, y + 50, name, { color: C.light, origin: [0.5, 0] }));
      }
      y += 70;
    }
    y += 10;
    line('AND THE GUARDIANS', C.mid, 16);
    line('WISPMANE   VIPERWIND   FLAMORA', C.white, 30);
    line('MUSIC AND SOUND', C.mid, 14);
    line('EVERY NOTE PLAYED LIVE BY THE GAME', C.light, 30);
    line('ART', C.mid, 14);
    line('EVERY PIXEL PAINTED IN FIVE SHADES OF GREY', C.light, 40);
    line('THANK YOU FOR PLAYING', C.white, 20, true);
    const end = y;
    const hint = txt(this, W / 2, H - 12, 'X: BACK', { color: C.mid, origin: [0.5, 0] });
    c.add(this.add.rectangle(0, H - 16, W, 16, C.black, 1).setOrigin(0, 0));
    c.add(hint);
    const tw = this.tweens.add({ targets: roll, y: -end + H / 2 - 20, duration: (end + H) * 36, ease: 'Linear' });
    this.panelKey = (k) => {
      if (k === 'b' || k === 'a' && tw.progress >= 1) {
        sound.play('back');
        tw.remove();
        this.closePanel();
      } else if (k === 'a' || k === 'down') tw.timeScale = tw.timeScale > 1 ? 1 : 4;
    };
    (c as any).pick = () => this.panelKey!('b');
  }

  // ================================================================ input

  private key(k: string) {
    const b = keyOf(k);
    if (!b) return;
    if (this.mode === 'intro' || this.mode === 'press') {
      if (b !== 'a' && b !== 'b') return;
      // the first key press is also what lets the browser play sound
      sound.unlock();
      sound.playSong('title');
      sound.setAmbience('title');
      sound.play('select');
      this.tweens.killTweensOf(this.menuC);
      return this.showMenu();
    }
    if (this.mode === 'menu') {
      if (b === 'up' || b === 'down') this.move(b === 'up' ? -1 : 1);
      else if (b === 'a') this.choose();
      return;
    }
    this.panelKey?.(b);
  }

  private pointer(x: number, y: number) {
    if (this.mode === 'intro' || this.mode === 'press') return this.key(' ');
    if (this.mode === 'menu') {
      const i = Math.floor((y - MENU_Y + 3) / ROW);
      if (i >= 0 && i < MENU.length && Math.abs(x - W / 2) < 80) {
        this.sel = i;
        this.drawMenu();
        this.choose();
      }
      return;
    }
    (this.panel as any)?.pick?.(x, y);
  }

  private hover(x: number, y: number) {
    if (this.mode !== 'menu') return;
    const i = Math.floor((y - MENU_Y + 3) / ROW);
    if (i >= 0 && i < MENU.length && Math.abs(x - W / 2) < 80 && i !== this.sel) {
      this.sel = i;
      sound.play('move');
      this.drawMenu();
    }
  }
}

function keyOf(k: string): 'a' | 'b' | 'up' | 'down' | 'left' | 'right' | null {
  if (k === ' ' || k === 'Enter' || k === 'z' || k === 'Z') return 'a';
  if (k === 'x' || k === 'X' || k === 'Escape' || k === 'Backspace') return 'b';
  if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
  if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
  if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
  return null;
}
const clamp = (v: number) => Math.max(0, Math.min(10, v));
const bar = (v: number) => '#'.repeat(v) + '.'.repeat(10 - v);
void getCreature;
