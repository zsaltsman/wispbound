import Phaser from 'phaser';
import { CREATURES } from '../engine/creatures';
import { GBPipeline } from '../gfx/GBPipeline';
import { txt, box, C } from '../ui/ui';
import { sound } from '../audio/audio';
import { W, H } from '../constants';

// CHOOSE YOUR CHAMPION - the first thing the player sees.

type Focus = { area: 'cards' } | { area: 'ability'; i: number } | { area: 'start' };

export class SelectScene extends Phaser.Scene {
  private sel = 0;
  private focus: Focus = { area: 'cards' };
  private cards: { g: Phaser.GameObjects.Graphics; spr: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.BitmapText }[] = [];
  private panel!: Phaser.GameObjects.Container;
  private startG!: Phaser.GameObjects.Graphics;
  private startT!: Phaser.GameObjects.BitmapText;
  private cursor!: Phaser.GameObjects.Image;
  private leaving = false;
  private abilityRows: Phaser.GameObjects.Zone[] = [];
  private infoT!: Phaser.GameObjects.BitmapText;
  private abilityY = 190;
  private scrollers: [Phaser.GameObjects.TileSprite, number][] = [];

  constructor() {
    super('select');
  }

  init(data: { sel?: number }) {
    this.sel = data?.sel ?? this.sel ?? 0;
    this.focus = { area: 'cards' };
    this.leaving = false;
    this.cards = [];
    this.abilityRows = [];
  }

  create() {
    const cam = this.cameras.main;
    cam.setPostPipeline(GBPipeline);

    // backdrop: the storm the champion is about to sail into
    this.add.image(-120, -70, 'sky').setOrigin(0, 0);
    const clouds = this.add.tileSprite(0, 6, W, 70, 'clouds_far').setOrigin(0, 0);
    this.add.image(250, 236, 'rocks').setOrigin(0, 1).setAlpha(1);
    this.add.image(-160, 236, 'sea_base').setOrigin(0, 0);
    const s1 = this.add.tileSprite(0, 236, W, 14, 'sea_far').setOrigin(0, 0);
    const s2 = this.add.tileSprite(0, 248, W, 22, 'sea_mid').setOrigin(0, 0);
    const s3 = this.add.tileSprite(0, 266, W, 30, 'sea_near').setOrigin(0, 0);
    this.scrollers = [
      [clouds, 0.004],
      [s1, 0.006],
      [s2, 0.012],
      [s3, 0.022],
    ];
    const rain = this.add.particles(0, 0, 'fx_rain', {
      x: { min: -40, max: W + 40 },
      y: -10,
      lifespan: 900,
      speedY: { min: 260, max: 340 },
      speedX: { min: -70, max: -50 },
      frequency: 30,
      quantity: 1,
      alpha: { start: 0.8, end: 0.4 },
    });
    rain.setDepth(5);

    // title
    txt(this, W / 2, 5, 'CHOOSE YOUR CHAMPION', { outline: true, scale: 1, origin: [0.5, 0] }).setScale(2).setDepth(10);

    // creature cards
    const cw = 74;
    const gap = 4;
    const x0 = (W - (cw * 5 + gap * 4)) / 2;
    CREATURES.forEach((c, i) => {
      const x = x0 + i * (cw + gap);
      const g = this.add.graphics().setDepth(10);
      const spr = this.add.sprite(x + cw / 2, 92, 'cr_' + c.id, 0).setOrigin(0.5, 1).setDepth(11);
      const name = txt(this, x + cw / 2, 94, c.name, { origin: [0.5, 0] }).setDepth(11);
      const zone = this.add.zone(x, 38, cw, 66).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', (p: Phaser.Input.Pointer) => {
        if (!p.wasTouch) this.pick(i);
      });
      zone.on('pointerdown', () => {
        if (this.sel === i && this.focus.area === 'cards') this.go();
        else this.pick(i);
      });
      this.cards.push({ g, spr, name });
    });

    // info panel
    this.panel = this.add.container(0, 0).setDepth(10);

    // start button
    this.startG = this.add.graphics().setDepth(10);
    this.startT = txt(this, W / 2, 281, 'START BATTLE', { origin: [0.5, 0], color: C.black }).setScale(2).setDepth(11);
    const sz = this.add.zone(W / 2 - 90, 277, 180, 20).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    sz.on('pointerover', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) this.setFocus({ area: 'start' });
    });
    sz.on('pointerdown', () => this.go());
    this.cursor = this.add.image(0, 0, 'ui_cursor').setDepth(12).setTint(C.white);

    // keyboard
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e.key));
    this.events.once('shutdown', () => kb.off('keydown'));

    this.refresh();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  update(_t: number, dt: number) {
    for (const [ts, v] of this.scrollers) ts.tilePositionX += dt * v;
  }

  private onKey(key: string) {
    if (this.leaving) return;
    const f = this.focus;
    if (key === 'ArrowLeft' || key === 'a') {
      if (f.area === 'cards') this.pick((this.sel + 4) % 5);
    } else if (key === 'ArrowRight' || key === 'd') {
      if (f.area === 'cards') this.pick((this.sel + 1) % 5);
    } else if (key === 'ArrowDown' || key === 's') {
      if (f.area === 'cards') this.setFocus({ area: 'ability', i: 0 });
      else if (f.area === 'ability') this.setFocus(f.i < 3 ? { area: 'ability', i: f.i + 1 } : { area: 'start' });
    } else if (key === 'ArrowUp' || key === 'w') {
      if (f.area === 'start') this.setFocus({ area: 'ability', i: 3 });
      else if (f.area === 'ability') this.setFocus(f.i > 0 ? { area: 'ability', i: f.i - 1 } : { area: 'cards' });
    } else if (key === 'Enter' || key === ' ' || key === 'z') {
      this.go();
    } else if (key === 'Escape' || key === 'Backspace') {
      if (f.area !== 'cards') {
        sound.play('back');
        this.setFocus({ area: 'cards' });
      }
    }
  }

  private pick(i: number) {
    if (this.leaving) return;
    if (i !== this.sel) sound.play('move');
    this.sel = i;
    this.focus = { area: 'cards' };
    this.refresh();
  }

  private setFocus(f: Focus) {
    if (JSON.stringify(f) !== JSON.stringify(this.focus)) sound.play('move');
    this.focus = f;
    this.refresh();
  }

  private refresh() {
    const cw = 74;
    const gap = 4;
    const x0 = (W - (cw * 5 + gap * 4)) / 2;
    this.cards.forEach((c, i) => {
      const x = x0 + i * (cw + gap);
      c.g.clear();
      const on = i === this.sel;
      box(c.g, x, 38, cw, 66, on ? 'light' : 'dark');
      c.name.setTint(on ? C.black : C.light);
      if (on) c.spr.play(`cr_${CREATURES[i].id}_idle`, true);
      else c.spr.stop().setFrame(0);
      c.spr.setAlpha(on ? 1 : 0.75);
    });
    this.buildPanel();

    const sOn = this.focus.area === 'start';
    this.startG.clear();
    box(this.startG, W / 2 - 90, 277, 180, 20, sOn ? 'select' : 'light');
    if (sOn) {
      this.startG.fillStyle(C.black, 1).fillRect(W / 2 - 88, 279, 176, 16);
    }
    this.startT.setTint(sOn ? C.white : C.black);

    // cursor
    const f = this.focus;
    this.cursor.setVisible(f.area !== 'cards');
    if (f.area === 'cards') this.cursor.setPosition(0, 0);
    else if (f.area === 'start') this.cursor.setPosition(W / 2 - 80, 287).setTint(C.white);
    else this.cursor.setPosition(111, this.abilityY + f.i * 12 + 3).setTint(C.white);
    this.tweens.killTweensOf(this.cursor);
    this.tweens.add({ targets: this.cursor, x: this.cursor.x + 2, duration: 300, yoyo: true, repeat: -1 });
  }

  private buildPanel() {
    this.panel.removeAll(true);
    this.abilityRows.forEach((z) => z.destroy());
    this.abilityRows = [];
    const c = CREATURES[this.sel];
    const g = this.add.graphics();
    this.panel.add(g);
    box(g, 4, 108, W - 8, 166, 'dark');
    // portrait plate
    g.fillStyle(C.dark, 1).fillRect(10, 114, 100, 100);
    g.fillStyle(C.black, 1).fillRect(12, 116, 96, 96);
    for (let y = 0; y < 96; y += 2) g.fillStyle(C.dark, 1).fillRect(12, 116 + y, 96, 1);
    const big = this.add.sprite(60, 212, 'cr_' + c.id, 0).setOrigin(0.5, 1).setScale(2);
    big.play(`cr_${c.id}_idle`);
    this.panel.add(big);
    // class + hp under portrait
    const t = (x: number, y: number, s: string, o = {}) => {
      const b = txt(this, x, y, s, o);
      this.panel.add(b);
      return b;
    };
    t(60, 220, `HP ${c.hp}`, { origin: [0.5, 0] });
    t(60, 231, `EN ${c.en}`, { origin: [0.5, 0], color: C.light });

    // right column
    const rx = 118;
    t(rx, 112, c.name, { outline: true });
    const d = t(rx, 125, c.description, { maxW: 272, color: C.light });
    const dy = 125 + d.height + 3;
    // (combat roles stay internal: the player meets the creature, not its class)
    const idT = t(rx, dy, c.identity, { maxW: 272, color: C.mid });
    const ay = dy + idT.height + 4;
    this.abilityY = ay;
    c.abilities.forEach((a, i) => {
      const y = ay + i * 12;
      const on = this.focus.area === 'ability' && this.focus.i === i;
      if (on) g.fillStyle(C.dark, 1).fillRect(rx - 2, y - 2, 276, 12);
      const ic = this.add.image(rx + 6, y + 3, a.icon).setOrigin(0, 0.5);
      this.panel.add(ic);
      const nm = t(rx + 21, y, a.name, { color: on || a.kind === 'signature' ? C.white : C.light });
      if (a.kind === 'signature') t(rx + 21 + nm.width + 3, y, '*', { color: C.light });
      // energy cost as pips, matching the battle menu
      for (let k = 0; k < a.cost; k++) g.fillStyle(on ? C.white : C.light, 1).fillRect(rx + 270 - (a.cost - k) * 5, y, 4, 6);
      const z = this.add.zone(rx - 2, y - 2, 276, 12).setOrigin(0, 0).setInteractive();
      z.on('pointerover', () => this.setFocus({ area: 'ability', i }));
      z.on('pointerdown', () => this.setFocus({ area: 'ability', i }));
      this.abilityRows.push(z);
    });
    // trait or ability detail
    const f = this.focus;
    const detail =
      f.area === 'ability'
        ? c.abilities[f.i].desc
        : `TRAIT: ${c.trait}. ${c.traitDesc}`;
    const iy = ay + 50;
    g.fillStyle(C.dark, 1).fillRect(rx - 2, iy - 2, 276, 272 - iy);
    this.infoT = t(rx, iy, detail, { maxW: 272, color: C.white });
  }

  private go() {
    if (this.leaving) return;
    this.leaving = true;
    sound.unlock();
    sound.play('select');
    const id = CREATURES[this.sel].id;
    // Game Boy style flash-out
    const flash = this.add.rectangle(0, 0, W, H, C.white).setOrigin(0, 0).setDepth(100).setAlpha(0);
    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('battle', { creature: id, sel: this.sel }));
      },
    });
  }
}
