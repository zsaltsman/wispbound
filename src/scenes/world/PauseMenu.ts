import Phaser from 'phaser';
import { txt, box, C } from '../../ui/ui';
import { W } from '../../constants';
import { sound } from '../../audio/audio';
import { ITEMS, CURIOS, objective, partyOf, isDevSession, type StoryState } from '../../story/state';
import { getCreature } from '../../engine/creatures';
import { checklist, cash, votes } from '../../story/w2_state';

// START menu: companion, bag, town map, current goal, and a new-game option.

const BASE = ['COMPANION', 'BAG', 'MAP', 'GOAL', 'CLOSE'];

/** The menu grows a submarine checklist in World 2. */
function entries(st: StoryState) {
  const e = [...BASE];
  if (st.flags.w2_inv_met && !st.flags.w3_started) e.unshift('CHECKLIST');
  // only inside a developer test session
  if (isDevSession()) e.splice(e.length - 1, 0, 'SAVE');
  return e;
}

export class PauseMenu {
  private s: Phaser.Scene;
  private addUi: <T extends Phaser.GameObjects.GameObject>(o: T) => T;
  private c!: Phaser.GameObjects.Container;
  open = false;
  private sel = 0;
  private getState: () => StoryState;
  private mapInfo: () => { key: string; name: string; w: number; h: number; dot: { x: number; y: number } | null; indoors: boolean };
  private onNewGame: () => void;
  private onClose: () => void;
  private bagScroll = 0;
  /** Called after the main companion changes, so the world can re-form the line of followers. */
  onParty: () => void = () => {};
  onEndTest: () => void = () => {};
  private compView = 0;

  constructor(
    s: Phaser.Scene,
    addUi: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    getState: () => StoryState,
    mapInfo: () => { key: string; name: string; w: number; h: number; dot: { x: number; y: number } | null; indoors: boolean },
    onNewGame: () => void,
    onClose: () => void
  ) {
    this.s = s;
    this.addUi = addUi;
    this.getState = getState;
    this.mapInfo = mapInfo;
    this.onNewGame = onNewGame;
    this.onClose = onClose;
    this.c = this.addUi(s.add.container(0, 0)).setVisible(false).setDepth(130);
  }

  show() {
    this.open = true;
    this.sel = 0;
    this.bagScroll = 0;
    this.compView = 0;
    sound.play('select');
    this.draw();
  }

  hide() {
    this.open = false;
    this.c.setVisible(false);
    sound.play('back');
    this.onClose();
  }

  onKey(k: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') {
    const ENTRIES = entries(this.getState());
    if (k === 'b') return this.hide();
    if (k === 'left' || k === 'right') {
      // browse the party on the companion page
      const n = partyOf(this.getState()).length;
      if (ENTRIES[this.sel] !== 'COMPANION' || n < 2) return;
      this.compView = (this.compView + (k === 'left' ? -1 : 1) + n) % n;
      sound.play('move');
      this.draw();
      return;
    }
    if (k === 'up' || k === 'down') {
      this.sel = (this.sel + (k === 'up' ? -1 : 1) + ENTRIES.length) % ENTRIES.length;
      sound.play('move');
      this.draw();
      return;
    }
    const e = ENTRIES[this.sel];
    if (e === 'CLOSE') this.hide();
    else if (e === 'NEW GAME') {
      this.open = false;
      this.c.setVisible(false);
      this.onNewGame();
    } else if (e === 'BAG') {
      this.bagScroll++;
      this.draw();
    } else if (e === 'COMPANION') {
      const st = this.getState();
      const party = partyOf(st);
      if (party.length < 2) return;
      const id = party[this.compView % party.length];
      if (id === party[0]) this.compView = (this.compView + 1) % party.length;
      else {
        // make this one the main companion: it leads the line and starts every battle
        st.lead = id;
        this.compView = 0;
        sound.play('recruit');
        this.onParty();
      }
      this.draw();
    } else if (e === 'SAVE') {
      this.open = false;
      this.c.setVisible(false);
      this.onEndTest();
    }
  }

  pointer(x: number, y: number) {
    const ENTRIES = entries(this.getState());
    const i = Math.floor((y - 16) / 16);
    if (x > W - 104 && i >= 0 && i < ENTRIES.length) {
      if (i === this.sel) this.onKey('a');
      else {
        this.sel = i;
        sound.play('move');
        this.draw();
      }
    }
  }

  private draw() {
    const s = this.s;
    const st = this.getState();
    const ENTRIES = entries(st);
    this.c.removeAll(true);
    this.c.setVisible(true);
    const g = s.add.graphics();
    this.c.add(g);
    // menu column
    box(g, W - 106, 6, 100, ENTRIES.length * 16 + 14, 'light');
    ENTRIES.forEach((e, i) => {
      this.c.add(txt(s, W - 88, 14 + i * 16, e, { color: C.black }));
      if (i === this.sel) this.c.add(s.add.image(W - 96, 17 + i * 16, 'ui_cursor').setTint(C.black));
    });
    // content panel
    const px = 6;
    const py = 6;
    const pw = W - 118;
    const ph = 200;
    box(g, px, py, pw, ph, 'dark');
    const e = ENTRIES[this.sel];
    const t = (x: number, y: number, str: string, color: number = C.white, maxW?: number) => {
      const b = txt(s, px + x, py + y, str, { color, maxW });
      this.c.add(b);
      return b;
    };
    if (e === 'CHECKLIST') {
      t(12, 10, "PROFESSOR PIPWICK'S PARTS LIST", C.light);
      checklist(st).forEach((row, i) => {
        const y = 26 + i * 38;
        // the box: empty, ticked, or padlocked
        g.lineStyle(1, row.locked ? C.mid : C.white, 1).strokeRect(px + 12, py + y, 9, 9);
        if (row.done) {
          g.lineStyle(2, C.white, 1);
          g.lineBetween(px + 13, py + y + 4, px + 16, py + y + 8);
          g.lineBetween(px + 16, py + y + 8, px + 22, py + y - 1);
        } else if (row.locked) {
          g.fillStyle(C.mid, 1).fillRect(px + 14, py + y + 4, 5, 4);
          g.lineStyle(1, C.mid, 1).strokeRect(px + 15, py + y + 1, 3, 3);
        }
        t(28, y, row.name, row.done ? C.mid : row.locked ? C.mid : C.white, pw - 40);
        t(28, y + 11, row.done ? 'GOT IT!' : row.hint, row.done ? C.light : C.mid, pw - 40);
      });
      const money = cash(st);
      if (st.flags.w2_deal || money) t(12, ph - 14, `CASH: $${money.toLocaleString('en-US')}${st.flags.w2_deal && !st.flags.w2_paid500 ? `   VOTES: ${votes(st)}/5` : ''}`, C.light);
    } else if (e === 'COMPANION') {
      if (!st.creature) {
        t(12, 14, 'NO COMPANION YET', C.light);
        t(12, 30, 'Somewhere in Hollowhaven, a lonely spirit is waiting. Only one will follow you.', C.mid, pw - 24);
      } else {
        // the party, main companion first: LEFT/RIGHT to browse, A to make the shown creature the main one
        const party = partyOf(st);
        const view = this.compView % party.length;
        const cr = getCreature(party[view]);
        if (party.length > 1) {
          g.fillStyle(C.mid, 1).fillRect(px + 8, py + ph - 22, pw - 16, 1);
          t(12, ph - 14, `< ${view + 1}/${party.length} >`, C.mid);
          const tag = view === 0 ? 'MAIN COMPANION' : 'A: MAKE MAIN COMPANION';
          t(pw - 12 - tag.length * 6, ph - 14, tag, view === 0 ? C.light : C.white);
        }
        g.fillStyle(C.black, 1).fillRect(px + 10, py + 12, 60, 60);
        const spr = s.add.sprite(px + 40, py + 70, 'cr_' + cr.id, 0).setOrigin(0.5, 1);
        spr.play(`cr_${cr.id}_idle`);
        this.c.add(spr);
        const nameT = t(80, 14, cr.name, C.white);
        if (party.length > 1 && view === 0) {
          // a small badge beside the name marks the main companion
          const bx = px + 80 + nameT.width + 6;
          box(g, bx, py + 11, 34, 13, 'light');
          this.c.add(txt(s, bx + 6, py + 14, 'MAIN', { color: C.black }));
        }
        t(80, 42, `HP ${cr.hp}   EN ${cr.en}`, C.light);
        t(80, 54, cr.identity, C.mid, pw - 92);
        cr.abilities.forEach((a, i) => {
          const y = 84 + i * 16;
          this.c.add(s.add.image(px + 12, py + y, a.icon).setOrigin(0, 0));
          t(28, y + 2, a.name, a.kind === 'signature' ? C.white : C.light);
          t(130, y + 2, a.short, C.mid);
        });
        t(12, 152, `TRAIT: ${cr.trait}. ${cr.traitDesc}`, C.mid, pw - 24);
      }
    } else if (e === 'BAG') {
      const owned = Object.keys(st.items).filter((k) => (st.items[k] ?? 0) > 0 && ITEMS[k] && !ITEMS[k].curio);
      const curios = CURIOS.filter((k) => (st.items[k] ?? 0) > 0);
      if (!owned.length) t(12, 14, 'EMPTY', C.mid);
      // items flow down the panel, each as tall as its wrapped text; whatever doesn't fit goes on the next page
      const textW = pw - 42;
      const footer = ph - 32;
      const label = (k: string) => ITEMS[k].name + (st.items[k] > 1 ? ` x${st.items[k]}` : '');
      const rowH = (k: string) => {
        const a = txt(s, 0, 0, label(k), { maxW: textW });
        const b = txt(s, 0, 0, ITEMS[k].desc, { maxW: textW });
        const h = Math.max(18, a.height + 2 + b.height) + 6;
        a.destroy();
        b.destroy();
        return h;
      };
      const pages: string[][] = [[]];
      let fill = 10;
      for (const k of owned) {
        const h = rowH(k);
        if (fill + h > footer && pages[pages.length - 1].length) {
          pages.push([]);
          fill = 10;
        }
        pages[pages.length - 1].push(k);
        fill += h;
      }
      const page = pages[this.bagScroll % pages.length];
      let y = 10;
      for (const k of page) {
        this.c.add(s.add.image(px + 12, py + y, ITEMS[k].icon).setOrigin(0, 0));
        const name = t(30, y, label(k), C.white, textW);
        const desc = t(30, y + name.height + 2, ITEMS[k].desc, C.mid, textW);
        y = desc.y - py + desc.height + 6;
      }
      // footer: curios on the left, paging on the right, under a divider
      g.fillStyle(C.mid, 1).fillRect(px + 8, py + footer, pw - 16, 1);
      if (pages.length > 1) {
        const more = `A: MORE ${(this.bagScroll % pages.length) + 1}/${pages.length}`;
        t(pw - 12 - more.length * 6, ph - 29, more, C.mid);
      }
      t(12, ph - 29, `CURIOS FOUND: ${curios.length}/${CURIOS.length}`, C.light);
      curios.forEach((k, i) => this.c.add(s.add.image(px + 12 + i * 15, py + ph - 12, ITEMS[k].icon).setOrigin(0, 0.5)));
    } else if (e === 'MAP') {
      const m = this.mapInfo();
      if (s.textures.exists(m.key)) {
        // as big as the panel allows (the island maps are larger than the town)
        const k = Math.min(2, (pw - 20) / m.w, (ph - 34) / m.h);
        const img = s.add.image(px + pw / 2, py + 6 + (ph - 34) / 2 + 2, m.key).setScale(k);
        this.c.add(img);
        if (m.dot) {
          const dot = s.add.rectangle(img.x - img.displayWidth / 2 + (m.dot.x + 0.5) * k, img.y - img.displayHeight / 2 + (m.dot.y + 0.5) * k, 4, 4, C.white);
          dot.setStrokeStyle(1, C.black);
          this.c.add(dot);
          s.tweens.add({ targets: dot, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
        }
        t(10, ph - 14, m.name, C.light);
        if (m.indoors) t(pw - 10 - 'YOU ARE INDOORS'.length * 6, ph - 14, 'YOU ARE INDOORS', C.mid);
      }
    } else if (e === 'GOAL') {
      t(12, 14, 'CURRENT GOAL', C.light);
      t(12, 30, objective(st), C.white, pw - 24);
    } else if (e === 'NEW GAME') {
      t(12, 14, 'START OVER', C.light);
      t(12, 30, 'Erase this adventure and begin again in the square. You will be asked to confirm.', C.mid, pw - 24);
    } else {
      t(12, 14, 'PAUSED', C.light);
    }
  }
}
