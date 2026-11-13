import Phaser from 'phaser';
import { txt, box, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { up } from '../../gfx/font';
import { sound } from '../../audio/audio';

// Clean RPG dialogue: one box at the bottom, a small speaker tag, optional
// portrait, choice lists and item fanfares. Text pages are 3 lines of 60 chars.

const BOX_Y = 234;
const BOX_H = 62;
const LINE_CH = 60;

export interface SayOpts {
  portrait?: string; // texture key (48x48 creature sheets use frame 0)
  pitch?: number;
}

function wrap(text: string): string[][] {
  const pages: string[][] = [];
  for (const chunk of text.split('|')) {
    const lines: string[] = [];
    for (const para of chunk.split('\n')) {
      let cur = '';
      for (const word of para.split(' ')) {
        if (!word) continue;
        if ((cur + ' ' + word).trim().length > LINE_CH) {
          lines.push(cur.trim());
          cur = word;
        } else cur = (cur + ' ' + word).trim();
      }
      lines.push(cur);
    }
    for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
  }
  return pages;
}

export class Dialog {
  private s: Phaser.Scene;
  private addUi: <T extends Phaser.GameObjects.GameObject>(o: T) => T;
  private c!: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.BitmapText;
  private tag!: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Image;
  private portrait!: Phaser.GameObjects.Container;
  private choiceC!: Phaser.GameObjects.Container;
  private bannerC!: Phaser.GameObjects.Container;
  active = false;
  private typing = false;
  private full = '';
  private shown = 0;
  private resolveAdvance: (() => void) | null = null;
  private choice: { n: number; sel: number; resolve: (i: number) => void; cancel: number; redraw: () => void } | null = null;
  private typeTimer?: Phaser.Time.TimerEvent;
  private pitch = 900;
  /** tests and fast-forward: advance automatically */
  auto = false;
  /** automated tests: answers to give to upcoming questions */
  autoPicks: number[] = [];

  constructor(s: Phaser.Scene, addUi: <T extends Phaser.GameObjects.GameObject>(o: T) => T) {
    this.s = s;
    this.addUi = addUi;
    this.build();
  }

  private build() {
    const s = this.s;
    this.c = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(120);
    const g = s.add.graphics();
    box(g, 6, BOX_Y, W - 12, BOX_H, 'light');
    this.body = txt(s, 18, BOX_Y + 11, '', { color: C.black });
    this.body.setLineSpacing(4);
    this.arrow = s.add.image(W - 20, BOX_Y + BOX_H - 10, 'ui_cursor').setAngle(90).setTint(C.black);
    this.c.add([g, this.body, this.arrow]);
    s.tweens.add({ targets: this.arrow, y: this.arrow.y + 2, duration: 300, yoyo: true, repeat: -1 });
    this.tag = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(121);
    this.portrait = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(121);
    this.choiceC = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(122);
    this.bannerC = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(123);
  }

  /** Raise the box, its name tag, portrait and choices (letterbox bars cover the bottom in cutscenes). */
  lift(px: number) {
    for (const c of [this.c, this.tag, this.portrait, this.choiceC]) c.y = -px;
  }

  private setTag(name?: string) {
    this.tag.removeAll(true);
    if (!name) {
      this.tag.setVisible(false);
      return;
    }
    const t = txt(this.s, 18, BOX_Y - 9, name, { color: C.white });
    const g = this.s.add.graphics();
    box(g, 10, BOX_Y - 14, t.width + 16, 16, 'dark');
    this.tag.add([g, t]).setVisible(true);
  }

  private setPortrait(key?: string) {
    this.portrait.removeAll(true);
    if (!key) {
      this.portrait.setVisible(false);
      return;
    }
    const g = this.s.add.graphics();
    const x = W - 72;
    const y = BOX_Y - 70;
    box(g, x, y, 62, 62, 'dark');
    g.fillStyle(C.dark, 1).fillRect(x + 4, y + 4, 54, 54);
    const spr = this.s.add.sprite(x + 31, y + 57, key, 0).setOrigin(0.5, 1);
    if (this.s.anims.exists(`${key}_idle`)) spr.play(`${key}_idle`);
    this.portrait.add([g, spr]).setVisible(true);
  }

  /** Show text (pages split automatically or by "|"). Resolves when the player has read it. */
  async say(text: string, speaker?: string, opts: SayOpts = {}) {
    this.active = true;
    this.pitch = opts.pitch ?? 900;
    this.c.setVisible(true);
    this.setTag(speaker);
    this.setPortrait(opts.portrait);
    for (const page of wrap(up(text))) {
      await this.typePage(page.join('\n'));
    }
    this.hide();
  }

  private typePage(page: string): Promise<void> {
    this.full = page;
    this.shown = 0;
    this.typing = true;
    this.arrow.setVisible(false);
    this.body.setText('');
    this.typeTimer?.remove();
    this.typeTimer = this.s.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.shown = Math.min(this.full.length, this.shown + 1);
        this.body.setText(this.full.slice(0, this.shown));
        const ch = this.full[this.shown - 1];
        if (ch && ch !== ' ' && this.shown % 2 === 0) sound.blip(this.pitch + (ch.charCodeAt(0) % 5) * 12);
        if (this.shown >= this.full.length) this.finishTyping();
      },
    });
    return new Promise((res) => {
      this.resolveAdvance = res;
      if (this.auto) this.s.time.delayedCall(30, () => this.advance());
    });
  }

  private finishTyping() {
    this.typeTimer?.remove();
    this.typing = false;
    this.shown = this.full.length;
    this.body.setText(this.full);
    this.arrow.setVisible(true);
    if (this.auto) this.s.time.delayedCall(10, () => this.advance());
  }

  /** A pressed. */
  advance() {
    if (this.choice) {
      this.pickChoice(this.choice.sel);
      return;
    }
    if (this.typing) {
      this.finishTyping();
      return;
    }
    if (this.resolveAdvance) {
      const r = this.resolveAdvance;
      this.resolveAdvance = null;
      sound.play('text');
      r();
    }
  }

  /** B pressed. */
  back() {
    if (this.choice && this.choice.cancel >= 0) this.pickChoice(this.choice.cancel);
    else this.advance();
  }

  move(d: number) {
    if (!this.choice) return;
    this.choice.sel = (this.choice.sel + d + this.choice.n) % this.choice.n;
    sound.play('move');
    this.choice.redraw();
  }

  private pickChoice(i: number) {
    const ch = this.choice;
    if (!ch) return;
    this.choice = null;
    this.choiceC.setVisible(false);
    sound.play('select');
    ch.resolve(i);
  }

  /** Ask a question: the prompt stays on screen while a list of answers is shown. */
  async ask(prompt: string, options: string[], speaker?: string, opts: SayOpts & { cancel?: number; start?: number } = {}): Promise<number> {
    this.active = true;
    this.pitch = opts.pitch ?? 900;
    this.c.setVisible(true);
    this.setTag(speaker);
    this.setPortrait(opts.portrait);
    const pages = wrap(up(prompt));
    for (let i = 0; i < pages.length - 1; i++) await this.typePage(pages[i].join('\n'));
    // type the last page without waiting for A
    const last = pages[pages.length - 1].join('\n');
    this.full = last;
    this.body.setText(last);
    this.arrow.setVisible(false);
    const s = this.s;
    const longest = Math.max(...options.map((o) => o.length));
    const w = longest * 6 + 30;
    const h = options.length * 13 + 12;
    const x = W - 6 - w;
    const y = BOX_Y - h - 2;
    const result = await new Promise<number>((resolve) => {
      const redraw = () => {
        this.choiceC.removeAll(true);
        const g = s.add.graphics();
        box(g, x, y, w, h, 'light');
        this.choiceC.add(g);
        options.forEach((o, i) => {
          this.choiceC.add(txt(s, x + 18, y + 8 + i * 13, o, { color: C.black }));
          if (i === this.choice!.sel) this.choiceC.add(s.add.image(x + 10, y + 11 + i * 13, 'ui_cursor').setTint(C.black));
        });
        this.choiceC.setVisible(true);
      };
      this.choice = { n: options.length, sel: Math.min(options.length - 1, Math.max(0, opts.start ?? 0)), resolve, cancel: opts.cancel ?? -1, redraw };
      redraw();
      if (this.auto) s.time.delayedCall(20, () => this.pickChoice(this.autoPicks.length ? this.autoPicks.shift()! : 0));
    });
    this.hide();
    return result;
  }

  /** Clicks on the choice list (touch / mouse). */
  pointer(x: number, y: number) {
    if (!this.choice) {
      this.advance();
      return;
    }
    const b = this.choiceC.getBounds();
    if (x < b.x || x > b.right || y < b.y || y > b.bottom) return;
    const i = Math.floor((y - b.y - 6) / 13);
    if (i >= 0 && i < this.choice.n) {
      if (i === this.choice.sel) this.pickChoice(i);
      else {
        this.choice.sel = i;
        this.choice.redraw();
      }
    }
  }

  hide() {
    this.active = false;
    this.c.setVisible(false);
    this.tag.setVisible(false);
    this.portrait.setVisible(false);
    this.choiceC.setVisible(false);
  }

  /** Item fanfare: icon popup + jingle + a line of text. */
  async itemGet(icon: string, text: string, sfx = 'item') {
    const s = this.s;
    const c = this.addUi(s.add.container(W / 2, 120)).setDepth(125);
    const g = s.add.graphics();
    box(g, -26, -26, 52, 52, 'dark');
    const img = s.add.image(0, 0, icon).setScale(icon.startsWith('fish_') ? 1.4 : icon.startsWith('p_junk') ? 1.8 : 3);
    c.add([g, img]);
    c.setScale(0);
    s.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.easeOut' });
    sound.play(sfx);
    await this.say(text);
    await new Promise<void>((r) => s.tweens.add({ targets: c, scale: 0, duration: 150, onComplete: () => r() }));
    c.destroy();
  }

  /** Location name that slides in at the top-left when entering an area. */
  banner(name: string) {
    const s = this.s;
    this.bannerC.removeAll(true);
    s.tweens.killTweensOf(this.bannerC);
    const t = txt(s, 14, 12, name, { color: C.white });
    const g = s.add.graphics();
    box(g, 6, 6, t.width + 18, 18, 'dark');
    this.bannerC.add([g, t]).setVisible(true).setAlpha(1);
    this.bannerC.x = -t.width - 30;
    s.tweens.add({
      targets: this.bannerC,
      x: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => s.tweens.add({ targets: this.bannerC, x: -t.width - 30, delay: 1800, duration: 260, ease: 'Quad.easeIn' }),
    });
  }
}

export { BOX_Y, BOX_H, H as SCREEN_H };
