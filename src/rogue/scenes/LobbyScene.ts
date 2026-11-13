import Phaser from 'phaser';
import { txt, box, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import { DIFFICULTIES, DIFFICULTY, MAX_PLAYERS } from '../shared/config';
import { CODE_CHARS, CODE_LEN, NAME_MAX } from '../shared/protocol';
import { LOOKS, RogueScene, type Key } from './common';

// ROGUELIKE: the way in. First the menu (who you are, solo or with friends), then the room
// itself: four seats, a code to share, ready marks, one difficulty for everyone, and START.

type Mode = 'menu' | 'room' | 'busy';
type Field = null | 'name' | 'code' | 'server';

const BASE = ['NAME', 'LOOK', 'PLAY SOLO', 'CREATE ROOM', 'JOIN ROOM', 'SERVER', 'BACK TO TITLE'] as const;
type Item = (typeof BASE)[number] | 'REJOIN';
/** After a reload in the middle of an online run, the way back into it is the first thing on the menu. */
let MENU: Item[] = [...BASE];

export class LobbyScene extends RogueScene {
  private mode: Mode = 'menu';
  private sel = 2;
  private field: Field = null;
  private buf = '';
  private ui!: Phaser.GameObjects.Container;
  private zones: Phaser.GameObjects.Zone[] = [];
  private note = '';
  private blink = true;

  constructor() {
    super('rogue-lobby');
  }

  init() {
    MENU = net.profile.lastCode && !net.state ? ['REJOIN', ...BASE] : [...BASE];
    this.mode = net.state ? 'room' : 'menu';
    this.field = null;
    this.buf = '';
    this.note = net.status === 'lost' ? net.lastError : '';
    this.sel = this.mode === 'room' ? 1 : MENU[0] === 'REJOIN' ? 0 : 2;
  }

  create() {
    this.setup();
    this.backdrop();
    this.ui = this.add.container(0, 0).setDepth(10);
    sound.playSong('title');
    sound.setAmbience('cave');
    this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        this.blink = !this.blink;
        if (this.field) this.draw();
      },
    });
    if (this.follow()) return;
    this.draw();
  }

  /** A quiet, dark hall with wisps drifting up through it. */
  private backdrop() {
    const g = this.add.graphics();
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    // a dithered floor glow and two pillars
    for (let y = 150; y < H; y += 2) for (let x = (y % 4 === 0 ? 0 : 2); x < W; x += 4) if (Math.abs(x - W / 2) < (y - 130) * 1.6) g.fillStyle(C.dark, 1).fillRect(x, y, 1, 1);
    for (const px of [34, W - 50]) {
      g.fillStyle(C.dark, 1).fillRect(px, 40, 16, H - 40);
      g.fillStyle(C.mid, 1).fillRect(px, 40, 2, H - 40);
      g.fillStyle(C.black, 1);
      for (let y = 52; y < H; y += 14) g.fillRect(px + 2, y, 14, 1);
      g.fillStyle(C.mid, 1).fillRect(px - 3, 36, 22, 5);
    }
    for (let i = 0; i < 9; i++) {
      const w = this.add.image(20 + Math.random() * (W - 40), H + Math.random() * 60, 'fx_px').setScale(1 + (i % 2)).setAlpha(0.25 + Math.random() * 0.4);
      const run = () => {
        if (!w.active) return;
        w.setPosition(20 + Math.random() * (W - 40), H + 6);
        this.tweens.add({ targets: w, y: -8, x: w.x + (Math.random() - 0.5) * 50, duration: 7000 + Math.random() * 6000, onComplete: run });
      };
      this.tweens.add({ targets: w, y: -8, duration: 3000 + Math.random() * 8000, onComplete: run });
    }
  }

  protected refresh() {
    if (net.state && this.mode !== 'room') {
      this.mode = 'room';
      this.sel = 1;
    }
    if (!net.state && this.mode === 'room') {
      this.mode = 'menu';
      this.sel = 2;
      if (net.lastError) this.note = net.lastError;
    }
    this.draw();
  }

  protected onStatus() {
    if (net.status === 'lost' || (net.status === 'idle' && this.mode !== 'busy')) this.refresh();
  }

  // ================================================================ drawing

  private draw() {
    this.ui.removeAll(true);
    for (const z of this.zones) z.destroy();
    this.zones = [];
    if (this.mode === 'room' && net.state) this.drawRoom();
    else this.drawMenu();
  }

  private hit(x: number, y: number, w: number, h: number, fn: () => void, hover?: () => void) {
    const z = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(20);
    z.on('pointerdown', fn);
    if (hover) z.on('pointerover', hover);
    this.zones.push(z);
  }

  private drawMenu() {
    const c = this.ui;
    c.add(txt(this, W / 2, 22, 'ROGUELIKE', { outline: true, origin: [0.5, 0], scale: 2 }));
    c.add(txt(this, W / 2, 46, 'THREE FLOORS. ONE REAPER. UP TO FOUR TRAVELLERS.', { color: C.mid, origin: [0.5, 0] }));
    const g = this.add.graphics();
    c.add(g);
    const x0 = W / 2 - 96;
    const y0 = 70;
    const p = net.profile;
    box(g, x0 - 10, y0 - 10, 212, MENU.length * 20 + 16, 'dark');
    MENU.forEach((m, i) => {
      const y = y0 + i * 20;
      const on = i === this.sel && this.mode === 'menu';
      if (on) g.fillStyle(C.dark, 1).fillRect(x0 - 6, y - 4, 204, 17);
      const col = on ? C.white : C.light;
      let label: string = m;
      if (m === 'REJOIN') label = `REJOIN ROOM ${net.profile.lastCode}`;
      if (m === 'NAME') {
        const v = this.field === 'name' ? this.buf + (this.blink ? '_' : ' ') : p.name;
        label = `NAME   ${v}`;
      } else if (m === 'LOOK') {
        label = 'LOOK';
        const sp = this.add.sprite(x0 + 74, y + 12, LOOKS[p.look], 0).setOrigin(0.5, 1);
        c.add(sp);
        if (on) {
          c.add(txt(this, x0 + 50, y, '<', { color: C.white }));
          c.add(txt(this, x0 + 92, y, '>', { color: C.white }));
        }
      } else if (m === 'SERVER') {
        const v = this.field === 'server' ? this.buf + (this.blink ? '_' : ' ') : p.server || 'THIS ONE';
        label = `SERVER ${v.length > 22 ? v.slice(-22) : v}`;
      } else if (m === 'JOIN ROOM' && this.field === 'code') {
        label = `CODE   ${this.buf.padEnd(CODE_LEN, '-').split('').join(' ')}`;
      }
      c.add(txt(this, x0 + 8, y, label, { color: m === 'SERVER' && !on ? C.mid : col }));
      if (on) c.add(txt(this, x0 - 2, y, '>', { color: C.white }));
      this.hit(x0 - 6, y - 4, 204, 17, () => {
        if (this.field || this.mode !== 'menu') return;
        this.sel = i;
        this.choose();
      }, () => {
        if (this.field || this.mode !== 'menu' || this.sel === i) return;
        this.sel = i;
        this.draw();
      });
    });
    const hint = this.mode === 'busy' ? 'CONNECTING...' : this.field === 'name' ? 'TYPE A NAME. ENTER: DONE' : this.field === 'code' ? 'TYPE THE ROOM CODE. ENTER: JOIN   ESC: CANCEL' : this.field === 'server' ? 'TYPE AN ADDRESS (EMPTY = THIS ONE). ENTER: DONE' : this.note || this.menuHint();
    c.add(txt(this, W / 2, y0 + MENU.length * 20 + 14, hint, { color: this.note && !this.field && this.mode !== 'busy' ? C.white : C.mid, origin: [0.5, 0], maxW: W - 30, align: 'center' }));
  }

  private menuHint(): string {
    switch (MENU[this.sel]) {
      case 'REJOIN':
        return 'YOUR SEAT IN THAT RUN IS STILL BEING HELD FOR YOU.';
      case 'PLAY SOLO':
        return 'A RUN BY YOURSELF. NOTHING LEAVES THIS COMPUTER.';
      case 'CREATE ROOM':
        return 'OPEN A ROOM AND SHARE ITS CODE WITH UP TO 3 FRIENDS.';
      case 'JOIN ROOM':
        return "ENTER A FRIEND'S ROOM CODE.";
      case 'SERVER':
        return 'WHERE ONLINE ROOMS LIVE. LEAVE IT ALONE UNLESS TOLD OTHERWISE.';
      case 'LOOK':
        return 'LEFT/RIGHT: CHOOSE WHO YOU ARE IN THE DUNGEON.';
      case 'NAME':
        return 'WHAT YOUR FRIENDS WILL SEE.';
    }
    return '';
  }

  private drawRoom() {
    const st = net.state!;
    const me = net.me;
    const c = this.ui;
    const g = this.add.graphics();
    c.add(g);
    // ---- the code to share
    if (st.solo) c.add(txt(this, W / 2, 14, 'SOLO RUN', { outline: true, origin: [0.5, 0], scale: 2 }));
    else {
      c.add(txt(this, W / 2, 8, 'ROOM CODE', { color: C.mid, origin: [0.5, 0] }));
      st.code.split('').forEach((ch, i) => {
        const x = W / 2 - (CODE_LEN * 22) / 2 + i * 22;
        box(g, x, 18, 20, 22, 'light');
        c.add(txt(this, x + 10, 22, ch, { origin: [0.5, 0], scale: 2, color: C.black }));
      });
      c.add(txt(this, W / 2, 43, 'SHARE IT WITH YOUR FRIENDS', { color: C.dark, origin: [0.5, 0] }));
    }
    // ---- the four seats
    const sw = 88;
    const sx0 = (W - (sw * MAX_PLAYERS + 6 * (MAX_PLAYERS - 1))) / 2;
    for (let i = 0; i < (st.solo ? 1 : MAX_PLAYERS); i++) {
      const x = st.solo ? W / 2 - sw / 2 : sx0 + i * (sw + 6);
      const y = 56;
      const p = st.players[i];
      box(g, x, y, sw, 84, p ? 'dark' : 'plain');
      if (!p) {
        c.add(txt(this, x + sw / 2, y + 36, 'EMPTY SEAT', { color: C.dark, origin: [0.5, 0] }));
        continue;
      }
      const sp = this.add.sprite(x + sw / 2, y + 52, LOOKS[p.look], 0).setOrigin(0.5, 1).setScale(2);
      if (!p.connected) sp.setAlpha(0.35);
      c.add(sp);
      c.add(txt(this, x + sw / 2, y + 56, p.name, { origin: [0.5, 0], color: p.seat === net.seat ? C.white : C.light }));
      if (p.host) c.add(txt(this, x + 5, y + 5, 'HOST', { color: C.mid }));
      if (p.seat === net.seat) c.add(txt(this, x + sw - 5, y + 5, 'YOU', { color: C.mid, origin: [1, 0] }));
      // ready mark: a box that fills in
      const ready = p.host || p.ready;
      const label = !p.connected ? 'AWAY' : p.host ? 'HOSTING' : p.ready ? 'READY' : 'NOT READY';
      if (!st.solo) {
        const bx = x + sw / 2 - 30;
        g.fillStyle(ready ? C.white : C.dark, 1).fillRect(bx, y + 69, 7, 7);
        g.fillStyle(C.black, 1).fillRect(bx + 1, y + 70, 5, 5);
        if (ready) g.fillStyle(C.white, 1).fillRect(bx + 2, y + 71, 3, 3);
        c.add(txt(this, bx + 11, y + 69, label, { color: ready ? C.white : C.mid }));
      }
    }
    // ---- one difficulty for the whole party
    const isHost = !!me?.host;
    const dy = 150;
    c.add(txt(this, W / 2, dy, 'DIFFICULTY', { color: C.mid, origin: [0.5, 0] }));
    DIFFICULTIES.forEach((d, i) => {
      const x = W / 2 - 96 + i * 66;
      const on = st.difficulty === d;
      box(g, x, dy + 11, 60, 16, on ? 'light' : 'dark');
      c.add(txt(this, x + 30, dy + 16, DIFFICULTY[d].name, { origin: [0.5, 0], color: on ? C.black : C.mid }));
      if (isHost) this.hit(x, dy + 11, 60, 16, () => this.setDifficulty(i));
    });
    if (this.sel === 0 && isHost) {
      c.add(txt(this, W / 2 - 108, dy + 16, '<', { color: C.white }));
      c.add(txt(this, W / 2 + 104, dy + 16, '>', { color: C.white }));
    }
    c.add(txt(this, W / 2, dy + 32, DIFFICULTY[st.difficulty].blurb, { color: C.light, origin: [0.5, 0], maxW: W - 40, align: 'center' }));
    if (!isHost) c.add(txt(this, W / 2, dy + 44, 'THE HOST CHOOSES', { color: C.dark, origin: [0.5, 0] }));

    // ---- what you can do
    const waiting = st.players.filter((p) => !p.host && !p.ready);
    const main = isHost ? 'START RUN' : me?.ready ? 'NOT READY' : 'READY';
    const canStart = !isHost || waiting.length === 0;
    const by = 222;
    const mainT = txt(this, 0, 0, main, {});
    const bw = Math.max(96, mainT.width + 24);
    mainT.destroy();
    const drawBtn = (x: number, w: number, label: string, on: boolean, dim: boolean) => {
      box(g, x, by, w, 18, on ? 'light' : 'dark');
      c.add(txt(this, x + w / 2, by + 6, label, { origin: [0.5, 0], color: on ? C.black : dim ? C.dark : C.light }));
    };
    drawBtn(W / 2 - bw - 4, bw, main, this.sel === 1, !canStart);
    drawBtn(W / 2 + 4, 70, 'LEAVE', this.sel === 2, false);
    this.hit(W / 2 - bw - 4, by, bw, 18, () => {
      this.sel = 1;
      this.choose();
    });
    this.hit(W / 2 + 4, by, 70, 18, () => {
      this.sel = 2;
      this.choose();
    });
    let foot = '';
    if (isHost) foot = waiting.length ? `WAITING FOR ${waiting.map((p) => p.name).join(', ')}` : st.solo ? 'UP/DOWN: MOVE   LEFT/RIGHT: DIFFICULTY   SPACE: CHOOSE' : st.players.length === 1 ? 'YOU CAN START ALONE, OR WAIT FOR FRIENDS TO JOIN.' : 'EVERYONE IS READY.';
    else foot = me?.ready ? 'WAITING FOR THE HOST TO START.' : 'PRESS READY WHEN YOU ARE SET.';
    c.add(txt(this, W / 2, by + 26, this.note || foot, { color: this.note ? C.white : C.mid, origin: [0.5, 0], maxW: W - 30, align: 'center' }));
  }

  // ================================================================ input

  protected typing(e: KeyboardEvent): boolean {
    if (!this.field) return false;
    const f = this.field;
    if (e.key === 'Escape') {
      this.field = null;
      sound.play('back');
    } else if (e.key === 'Enter') {
      this.field = null;
      sound.play('select');
      if (f === 'name') {
        net.saveProfile({ name: this.buf || 'WISP' });
      } else if (f === 'server') net.saveProfile({ server: this.buf.toLowerCase() });
      else if (f === 'code') {
        if (this.buf.length === CODE_LEN) this.connect({ code: this.buf });
        else this.note = `A ROOM CODE HAS ${CODE_LEN} LETTERS.`;
      }
    } else if (e.key === 'Backspace') this.buf = this.buf.slice(0, -1);
    else if (e.key.length === 1) {
      const ch = e.key.toUpperCase();
      if (f === 'name' && /[A-Z0-9 ]/.test(ch) && this.buf.length < NAME_MAX) this.buf += ch;
      else if (f === 'code' && CODE_CHARS.includes(ch) && this.buf.length < CODE_LEN) {
        this.buf += ch;
        sound.play('move');
      } else if (f === 'server' && /[A-Z0-9.:\/\-_]/.test(ch) && this.buf.length < 60) this.buf += ch;
    }
    this.draw();
    return true;
  }

  protected key(k: Key) {
    if (this.mode === 'busy') return;
    this.note = '';
    if (this.mode === 'menu') {
      if (k === 'up' || k === 'down') {
        this.sel = (this.sel + (k === 'up' ? -1 : 1) + MENU.length) % MENU.length;
        sound.play('move');
      } else if ((k === 'left' || k === 'right') && MENU[this.sel] === 'LOOK') {
        net.saveProfile({ look: (net.profile.look + (k === 'left' ? -1 : 1) + LOOKS.length) % LOOKS.length });
        sound.play('move');
      } else if (k === 'ok') return this.choose();
      else if (k === 'back') return this.toTitle();
      return this.draw();
    }
    // in the room
    const isHost = !!net.me?.host;
    if (k === 'up' || k === 'down') {
      const order = isHost ? [0, 1, 2] : [1, 2];
      const i = order.indexOf(this.sel);
      this.sel = order[(i + (k === 'up' ? -1 : 1) + order.length) % order.length];
      sound.play('move');
    } else if (k === 'left' || k === 'right') {
      if (this.sel === 0 && isHost) this.setDifficulty(DIFFICULTIES.indexOf(net.state!.difficulty) + (k === 'left' ? -1 : 1));
      else {
        this.sel = this.sel === 1 ? 2 : 1;
        sound.play('move');
      }
    } else if (k === 'ok') return this.choose();
    else if (k === 'back') {
      this.sel = 2;
      sound.play('move');
    }
    this.draw();
  }

  private setDifficulty(i: number) {
    if (i < 0 || i >= DIFFICULTIES.length || DIFFICULTIES[i] === net.state?.difficulty) return;
    sound.play('move');
    net.send({ t: 'difficulty', difficulty: DIFFICULTIES[i] });
  }

  private choose() {
    if (this.mode === 'room') {
      const me = net.me;
      if (this.sel === 2) {
        sound.play('back');
        net.leave();
        net.saveProfile({ lastCode: '' });
        MENU = [...BASE];
        this.mode = 'menu';
        this.sel = 2;
        return this.draw();
      }
      if (this.sel === 0) return;
      if (me?.host) {
        net.send({ t: 'start' });
        sound.play('select');
      } else {
        net.send({ t: 'ready', ready: !me?.ready });
        sound.play(me?.ready ? 'back' : 'select');
      }
      return;
    }
    const m = MENU[this.sel];
    sound.play('select');
    if (m === 'NAME') {
      this.field = 'name';
      this.buf = '';
    } else if (m === 'SERVER') {
      this.field = 'server';
      this.buf = net.profile.server.toUpperCase();
    } else if (m === 'JOIN ROOM') {
      this.field = 'code';
      this.buf = '';
    } else if (m === 'PLAY SOLO') net.startSolo();
    else if (m === 'REJOIN') return this.connect({ code: net.profile.lastCode });
    else if (m === 'CREATE ROOM') return this.connect({ create: true });
    else if (m === 'BACK TO TITLE') return this.toTitle();
    this.draw();
  }

  private connect(opts: { create: true } | { code: string }) {
    this.mode = 'busy';
    this.note = '';
    this.draw();
    net.connect(opts).catch((e: Error) => {
      if (this.leaving || !this.scene.isActive()) return;
      this.mode = 'menu';
      this.note = e.message;
      // a run that is gone cannot be rejoined: stop offering it
      if ('code' in opts && opts.code === net.profile.lastCode) {
        net.saveProfile({ lastCode: '' });
        MENU = [...BASE];
        this.sel = 2;
      }
      sound.play('deny');
      this.draw();
    });
  }

  private toTitle() {
    sound.play('back');
    net.leave();
    sound.stopMusic();
    this.go('title');
  }
}
