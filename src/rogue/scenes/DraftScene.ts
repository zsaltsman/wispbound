import Phaser from 'phaser';
import { txt, box, bar, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import { RARITY_NAME, rosterEntry, spiritDef } from '../shared/roster';
import { RogueScene, legendarySpark, rarityFrame, rarityPips, statPips, type Key } from './common';

// ROGUELIKE: choosing a spirit. Three cards, each with room to be looked at, and a full
// details page behind every one of them: nobody has to pick a spirit they do not understand.

const CARD_W = 122;
const CARD_H = 216;
const CARD_Y = 30;
const GAP = 7;
const X0 = (W - (CARD_W * 3 + GAP * 2)) / 2;
const TITLES = ['', 'CHOOSE YOUR FIRST SPIRIT', 'A SECOND SPIRIT JOINS YOU', 'CHOOSE YOUR THIRD SPIRIT'];

/** Health as pips: the roster runs from about 300 to 640. */
const hpPips = (hp: number) => Math.max(1, Math.min(5, Math.round((hp - 260) / 80) + 1));

export class DraftScene extends RogueScene {
  private col = 1;
  /** 0 = VIEW DETAILS, 1 = CHOOSE */
  private row = 1;
  private offersKey = '';
  private cards!: Phaser.GameObjects.Container;
  private dyn!: Phaser.GameObjects.Container;
  private zones: Phaser.GameObjects.Zone[] = [];
  /** The details page: which spirit, which page, which button. */
  private detail: { id: string; page: 0 | 1; btn: 0 | 1 | 2 } | null = null;
  private detailC: Phaser.GameObjects.Container | null = null;
  private detailZones: Phaser.GameObjects.Zone[] = [];

  constructor() {
    super('rogue-draft');
  }

  init() {
    this.col = 1;
    this.row = 1;
    this.offersKey = '';
    this.detail = null;
    this.detailC = null;
    this.zones = [];
    this.detailZones = [];
    this.frames = [];
  }

  create() {
    this.setup();
    this.add.graphics().fillStyle(C.black, 1).fillRect(0, 0, W, H);
    this.cards = this.add.container(0, 0).setDepth(5);
    this.dyn = this.add.container(0, 0).setDepth(10);
    if (this.follow()) return;
    sound.playSong('title');
    this.refresh();
  }

  protected refresh() {
    const me = net.me;
    if (!me) return;
    const key = me.offers.join(',') + '|' + net.state!.draftRound;
    if (key !== this.offersKey) {
      this.offersKey = key;
      this.closeDetail(false);
      this.buildCards();
    }
    this.drawDyn();
    if (this.detail) this.drawDetail();
  }

  // ================================================================ the three cards

  private cardX(i: number) {
    return X0 + i * (CARD_W + GAP);
  }

  /** The parts of a card that never change while it is on screen: the spirit, its name, its text. */
  private buildCards() {
    this.cards.removeAll(true);
    this.frames = [];
    const me = net.me!;
    me.offers.forEach((id, i) => {
      const def = spiritDef(id);
      const info = rosterEntry(id);
      const x = this.cardX(i);
      const c = this.add.container(x, CARD_Y + 14).setAlpha(0);
      // a soft floor under the spirit
      const g = this.add.graphics();
      g.fillStyle(C.dark, 1).fillEllipse(CARD_W / 2, 84, 62, 10);
      c.add(g);
      const sp = this.add.sprite(CARD_W / 2, 86, 'cr_' + id, 0).setOrigin(0.5, 1).setScale(1.5);
      if (this.anims.exists(`cr_${id}_idle`)) sp.play({ key: `cr_${id}_idle`, startFrame: i % 4 });
      c.add(sp);
      c.add(txt(this, CARD_W / 2, 92, def.name, { outline: true, origin: [0.5, 0] }));
      c.add(txt(this, CARD_W / 2, 104, RARITY_NAME[info.rarity], { color: info.rarity === 'common' ? C.mid : C.light, origin: [0.5, 0] }));
      c.add(rarityPips(this, CARD_W / 2, 113, info.rarity));
      // compact stats: two rows of two (the exact numbers are on the details page)
      const sg = this.add.graphics();
      c.add(sg);
      const rows: [string, number][] = [['HP', hpPips(def.hp)], ['ATK', info.atk], ['DEF', info.def], ['SPD', info.spd]];
      rows.forEach(([label, n], k) => {
        const sx = 9 + (k % 2) * 56;
        const y = 132 + Math.floor(k / 2) * 11;
        c.add(txt(this, sx, y, label, { color: C.mid }));
        statPips(sg, sx + 21, y, n, 4);
      });
      this.cards.add(c);
      if (info.rarity === 'legendary') this.cards.add(legendarySpark(this, x, CARD_Y, CARD_W, CARD_H).setDepth(1));
      // dealt one after another
      this.tweens.add({ targets: c, alpha: 1, y: CARD_Y, duration: 260, delay: 80 + i * 110, ease: 'Quad.easeOut' });
      this.time.delayedCall(80 + i * 110, () => sound.play('move'));
    });
  }

  /** Everything that follows the cursor and the room: frames, buttons, marks, the party strip. */
  private drawDyn() {
    const st = net.state!;
    const me = net.me!;
    this.dyn.removeAll(true);
    for (const z of this.zones) z.destroy();
    this.zones = [];
    for (const f of this.frames) f.destroy();
    this.frames = [];
    const g = this.add.graphics();
    this.dyn.add(g);
    this.dyn.add(txt(this, W / 2, 8, TITLES[st.draftRound] ?? 'CHOOSE A SPIRIT', { outline: true, origin: [0.5, 0] }));

    me.offers.forEach((id, i) => {
      const info = rosterEntry(id);
      const x = this.cardX(i);
      const on = i === this.col && !this.detail;
      const mine = me.pick === id;
      // the frame goes behind the card's contents
      const fg = this.add.graphics().setDepth(-1);
      rarityFrame(fg, x, CARD_Y, CARD_W, CARD_H, info.rarity, on || mine);
      this.cards.addAt(fg, 0);
      this.frames.push(fg);
      if (mine) {
        // a ribbon across the top corner of your pick
        g.fillStyle(C.white, 1).fillRect(x + 6, CARD_Y + 6, 56, 11);
        this.dyn.add(txt(this, x + 34, CARD_Y + 8, me.locked ? 'LOCKED IN' : 'YOUR PICK', { color: C.black, origin: [0.5, 0] }));
      }
      const by = CARD_Y + 191;
      const bx = x + 8;
      const bw = CARD_W - 16;
      const dOn = on && this.row === 0;
      const cOn = on && this.row === 1;
      box(g, bx, by, bw, 12, dOn ? 'light' : 'dark');
      this.dyn.add(txt(this, bx + bw / 2, by + 3, 'VIEW DETAILS', { origin: [0.5, 0], color: dOn ? C.black : C.light }));
      const label = !mine ? 'CHOOSE' : me.locked ? 'CHANGE' : 'CONFIRM';
      box(g, bx, by + 12, bw, 12, cOn ? 'light' : 'dark');
      const ct = txt(this, bx + bw / 2, by + 15, label, { origin: [0.5, 0], color: cOn ? C.black : mine ? C.white : C.light });
      this.dyn.add(ct);
      if (mine && !me.locked) this.tweens.add({ targets: ct, alpha: 0.35, duration: 380, yoyo: true, repeat: -1 });
      this.hitZone(bx, by, bw, 12, () => this.press(i, 0), () => this.hover(i, 0));
      this.hitZone(bx, by + 12, bw, 12, () => this.press(i, 1), () => this.hover(i, 1));
      this.hitZone(x, CARD_Y, CARD_W, 188, () => this.press(i, this.row), () => this.hover(i, this.row));
    });

    // ---- the rest of the party, and what happens next
    const others = st.players.filter((p) => p.seat !== net.seat);
    const y = CARD_Y + CARD_H + 6;
    if (others.length) {
      const cw = 92;
      const x0 = (W - st.players.length * (cw + 4) + 4) / 2;
      st.players.forEach((p, k) => {
        const x = x0 + k * (cw + 4);
        box(g, x, y, cw, 22, 'plain');
        if (p.pick && this.textures.exists('cr_' + p.pick)) this.dyn.add(this.add.image(x + 12, y + 20, 'cr_' + p.pick, 0).setOrigin(0.5, 1).setScale(0.4));
        else this.dyn.add(txt(this, x + 12, y + 8, '?', { color: C.dark, origin: [0.5, 0] }));
        this.dyn.add(txt(this, x + 24, y + 4, p.name, { color: p.seat === net.seat ? C.white : C.light }));
        this.dyn.add(txt(this, x + 24, y + 12, !p.connected ? 'AWAY' : p.locked ? 'LOCKED IN' : p.pick ? 'DECIDING' : 'LOOKING', { color: p.locked ? C.white : C.dark }));
      });
    }
    const waiting = st.players.filter((p) => !p.locked);
    let foot = 'SPACE: CHOOSE   V: DETAILS';
    if (me.locked) foot = waiting.length ? `WAITING FOR ${waiting.map((p) => p.name).join(', ')}${st.countdown ? ` (${st.countdown})` : ''}` : 'EVERYONE IS IN.';
    else if (me.pick) foot = 'SPACE AGAIN TO CONFIRM';
    this.dyn.add(txt(this, W / 2, H - 12, foot, { color: me.locked ? C.light : C.mid, origin: [0.5, 0] }));
  }
  private frames: Phaser.GameObjects.Graphics[] = [];

  private hitZone(x: number, y: number, w: number, h: number, fn: () => void, hover: () => void) {
    const z = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(20);
    z.on('pointerdown', () => !this.detail && fn());
    z.on('pointerover', () => !this.detail && hover());
    this.zones.push(z);
  }

  private hover(col: number, row: number) {
    if (this.col === col && this.row === row) return;
    this.col = col;
    this.row = row;
    this.redraw();
  }

  private redraw() {
    this.drawDyn();
  }

  // ================================================================ input

  protected key(k: Key) {
    if (this.detail) return this.detailKey(k);
    const me = net.me;
    if (!me) return;
    if (k === 'left' || k === 'right') {
      this.col = (this.col + (k === 'left' ? -1 : 1) + 3) % 3;
      sound.play('move');
    } else if (k === 'up' || k === 'down') {
      this.row = this.row ? 0 : 1;
      sound.play('move');
    } else if (k === 'ok') return this.press(this.col, this.row);
    else if (k === 'alt') return this.press(this.col, 0);
    else if (k === 'back' && me.locked) {
      net.send({ t: 'draft_lock', locked: false });
      sound.play('back');
    }
    this.redraw();
  }

  private press(col: number, row: number) {
    const me = net.me;
    if (!me) return;
    this.col = col;
    this.row = row;
    const id = me.offers[col];
    if (!id) return;
    if (row === 0) {
      sound.play('select');
      return this.openDetail(id);
    }
    this.chooseSpirit(id);
    this.redraw();
  }

  /** CHOOSE picks; pressing it again on the same card confirms; pressing it once confirmed lets go again. */
  private chooseSpirit(id: string) {
    const me = net.me!;
    if (me.locked) {
      net.send({ t: 'draft_lock', locked: false });
      return sound.play('back');
    }
    if (me.pick === id) {
      net.send({ t: 'draft_lock', locked: true });
      return sound.play('recruit');
    }
    net.send({ t: 'draft_pick', id });
    sound.play('select');
  }

  // ================================================================ the details page

  private openDetail(id: string) {
    this.detail = { id, page: 0, btn: 2 };
    this.drawDetail(true);
    this.redraw();
  }

  private closeDetail(redraw = true) {
    this.detailC?.destroy();
    this.detailC = null;
    for (const z of this.detailZones) z.destroy();
    this.detailZones = [];
    if (!this.detail) return;
    this.detail = null;
    if (redraw) this.redraw();
  }

  private detailKey(k: Key) {
    const d = this.detail!;
    if (k === 'back') {
      sound.play('back');
      return this.closeDetail();
    }
    if (k === 'left' || k === 'right') {
      d.btn = ((d.btn + (k === 'left' ? -1 : 1) + 3) % 3) as 0 | 1 | 2;
      sound.play('move');
    } else if (k === 'alt' || k === 'up' || k === 'down') {
      d.page = d.page ? 0 : 1;
      sound.play('move');
    } else if (k === 'ok') return this.detailPress(d.btn);
    this.drawDetail();
  }

  private detailPress(btn: 0 | 1 | 2) {
    const d = this.detail!;
    d.btn = btn;
    if (btn === 0) {
      sound.play('back');
      return this.closeDetail();
    }
    if (btn === 1) {
      d.page = d.page ? 0 : 1;
      sound.play('move');
      return this.drawDetail();
    }
    // CHOOSE THIS SPIRIT: it becomes your pick, and you are back at the three cards to confirm it
    const me = net.me!;
    if (me.locked) net.send({ t: 'draft_lock', locked: false });
    if (me.pick !== d.id) net.send({ t: 'draft_pick', id: d.id });
    sound.play('select');
    this.col = Math.max(0, me.offers.indexOf(d.id));
    this.row = 1;
    this.closeDetail();
  }

  private drawDetail(first = false) {
    const d = this.detail!;
    this.detailC?.destroy();
    for (const z of this.detailZones) z.destroy();
    this.detailZones = [];
    const c = this.add.container(0, 0).setDepth(50);
    this.detailC = c;
    const def = spiritDef(d.id);
    const info = rosterEntry(d.id);
    const me = net.me!;
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(C.black, 0.86).fillRect(0, 0, W, H);
    const px = 10;
    const py = 8;
    const pw = W - 20;
    const ph = H - 16;
    rarityFrame(g, px, py, pw, ph, info.rarity, true);
    if (info.rarity === 'legendary') c.add(legendarySpark(this, px, py, pw, ph));

    // ---- left column: the spirit itself
    const lx = px + 62;
    g.fillStyle(C.dark, 1).fillEllipse(lx, py + 118, 84, 12);
    const sp = this.add.sprite(lx, py + 120, 'cr_' + d.id, 0).setOrigin(0.5, 1).setScale(2);
    if (this.anims.exists(`cr_${d.id}_idle`)) sp.play(`cr_${d.id}_idle`);
    c.add(sp);
    c.add(txt(this, lx, py + 128, def.name, { outline: true, origin: [0.5, 0] }));
    c.add(txt(this, lx, py + 140, RARITY_NAME[info.rarity], { color: C.light, origin: [0.5, 0] }));
    c.add(rarityPips(this, lx, py + 149, info.rarity));
    // exact health, and the three ratings
    const sy = py + 162;
    c.add(txt(this, px + 14, sy, 'HEALTH', { color: C.mid }));
    c.add(txt(this, px + 110, sy, String(def.hp), { origin: [1, 0] }));
    bar(g, px + 14, sy + 9, 96, 4, def.hp / 640, def.hp / 640, 0);
    const rows: [string, number][] = [['ATTACK', info.atk], ['DEFENSE', info.def], ['SPEED', info.spd]];
    rows.forEach(([label, n], k) => {
      const y = sy + 20 + k * 11;
      c.add(txt(this, px + 14, y, label, { color: C.mid }));
      statPips(g, px + 66, y, n, 6);
    });
    c.add(txt(this, px + 14, sy + 56, `ENERGY ${def.en}  +${def.regen}/TURN`, { color: C.dark }));

    // ---- right column: one of two pages
    const rx = px + 128;
    const rw = pw - 128 - 12;
    g.fillStyle(C.dark, 1).fillRect(rx - 6, py + 12, 1, ph - 46);
    const tabs = ['OVERVIEW', 'ABILITIES'];
    tabs.forEach((t, i) => {
      const on = d.page === i;
      const tx = rx + i * 74;
      if (on) g.fillStyle(C.white, 1).fillRect(tx, py + 22, t.length * 6, 1);
      c.add(txt(this, tx, py + 12, t, { color: on ? C.white : C.dark }));
      this.detailZone(tx - 2, py + 8, 70, 16, () => {
        if (d.page !== i) {
          d.page = i as 0 | 1;
          sound.play('move');
          this.drawDetail();
        }
      });
    });
    let y = py + 30;
    const para = (s: string, color: number = C.light, gap = 5) => {
      const t = txt(this, rx, y, s, { color, maxW: rw });
      c.add(t);
      y += t.height + gap;
    };
    const head = (s: string) => {
      c.add(txt(this, rx, y, s, { color: C.mid }));
      y += 9;
    };
    if (d.page === 0) {
      para(def.description, C.white, 7);
      head('HOW IT PLAYS');
      para(info.ideal, C.light, 7);
      head('STRENGTHS');
      for (const s of info.strengths) para('+ ' + s, C.light, 1);
      y += 5;
      head('WEAKNESSES');
      for (const s of info.weaknesses) para('- ' + s, C.light, 1);
    } else {
      // the trait, then all four abilities with exactly what they do
      c.add(txt(this, rx, y, def.trait, { color: C.white }));
      c.add(txt(this, rx + rw, y, 'TRAIT', { color: C.dark, origin: [1, 0] }));
      y += 9;
      para(def.traitDesc, C.light, 6);
      for (const a of def.abilities) {
        if (this.textures.exists(a.icon)) c.add(this.add.image(rx, y - 1, a.icon).setOrigin(0, 0));
        c.add(txt(this, rx + 14, y, a.name, { color: C.white }));
        const cost = a.cost ? `${a.cost} EN${a.cd ? `  WAIT ${a.cd}` : ''}` : 'FREE';
        c.add(txt(this, rx + rw, y, cost, { color: C.mid, origin: [1, 0] }));
        y += 10;
        para(a.desc, C.light, 5);
      }
    }

    // ---- the three buttons
    const by = py + ph - 24;
    const mine = me.pick === d.id;
    const labels = ['BACK', d.page ? 'SEE OVERVIEW' : 'SEE ABILITIES', mine ? (me.locked ? 'LOCKED IN' : 'THIS IS YOUR PICK') : 'CHOOSE THIS SPIRIT'];
    const widths = [60, 104, 138];
    let bx = px + (pw - (60 + 104 + 138 + 16)) / 2;
    labels.forEach((l, i) => {
      const on = d.btn === i;
      box(g, bx, by, widths[i], 15, on ? 'light' : 'dark');
      c.add(txt(this, bx + widths[i] / 2, by + 4, l, { origin: [0.5, 0], color: on ? C.black : C.light }));
      this.detailZone(bx, by, widths[i], 15, () => this.detailPress(i as 0 | 1 | 2));
      bx += widths[i] + 8;
    });
    if (first) {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    }
  }

  private detailZone(x: number, y: number, w: number, h: number, fn: () => void) {
    const z = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(60);
    z.on('pointerdown', fn);
    this.detailZones.push(z);
  }
}
