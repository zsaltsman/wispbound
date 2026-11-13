import Phaser from 'phaser';
import { txt, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { getCreature } from '../../engine/creatures';
import { CHECKPOINTS, W1_CREATURES, W2_CREATURES, W3_TITAN_PICKS, asksGuardian, type Checkpoint, type Guardian } from '../../dev/checkpoints';

// The hidden developer test menu: a bare text list. Location, then creatures, then (past World 4's
// guardian) which guardian you chose, then START.

type Row = { text: string; pick?: () => void };
const TOP = 34;
const LINE = 10;
const VISIBLE = 24;

export class DevMenu {
  open = false;
  private c: Phaser.GameObjects.Container;
  private step: 'loc' | 'c1' | 'c2' | 'c3' | 'g' | 'go' = 'loc';
  private sel = 0;
  private scroll = 0;
  private cp: Checkpoint | null = null;
  private picks: string[] = [];
  private guardian: Guardian | undefined;

  constructor(
    private s: Phaser.Scene,
    addUi: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    private onStart: (cp: Checkpoint, picks: string[], guardian?: Guardian) => void,
    private onClose: () => void
  ) {
    this.c = addUi(s.add.container(0, 0)).setDepth(200).setVisible(false);
  }

  show() {
    this.open = true;
    this.goto('loc');
  }

  hide() {
    this.open = false;
    this.c.setVisible(false);
    this.onClose();
  }

  private goto(step: DevMenu['step']) {
    this.step = step;
    this.sel = this.rows().findIndex((r) => r.pick);
    this.scroll = 0;
    this.draw();
  }

  private rows(): Row[] {
    if (this.step === 'loc') {
      const out: Row[] = [];
      let world = 0;
      for (const cp of CHECKPOINTS) {
        if (cp.world !== world) {
          world = cp.world;
          out.push({ text: world === 6 ? "-- FINAL WORLD: THE GOD OF DEATH --" : `-- WORLD ${world} --` });
        }
        out.push({
          text: cp.label,
          pick: () => {
            this.cp = cp;
            this.picks = [];
            this.guardian = undefined;
            this.goto(cp.party > 0 ? 'c1' : 'go');
          },
        });
      }
      return out;
    }
    if (this.step === 'c1' || this.step === 'c2' || this.step === 'c3') {
      const n = this.step === 'c1' ? 0 : this.step === 'c2' ? 1 : 2;
      const ids = [W1_CREATURES, W2_CREATURES, W3_TITAN_PICKS][n];
      return ids.map((id) => ({
        text: getCreature(id).name,
        pick: () => {
          this.picks = [...this.picks.slice(0, n), id];
          const party = this.cp!.party;
          this.goto(n === 0 && party >= 2 ? 'c2' : n === 1 && party >= 3 ? 'c3' : asksGuardian(this.cp!) ? 'g' : 'go');
        },
      }));
    }
    if (this.step === 'g')
      return (['wispmane', 'viperwind'] as Guardian[]).map((g) => ({
        text: g === 'wispmane' ? 'WISPMANE (THE OLD MAN, ROUTE A)' : 'VIPERWIND (CARLO, ROUTE B)',
        pick: () => {
          this.guardian = g;
          this.goto('go');
        },
      }));
    return [
      { text: 'START', pick: () => this.onStart(this.cp!, this.picks, this.guardian) },
      { text: 'BACK', pick: () => this.goto('loc') },
    ];
  }

  private prompt(): string[] {
    const cp = this.cp;
    if (this.step === 'loc') return ['CHOOSE A LOCATION'];
    const many = cp!.party >= 3 ? 'THREE' : 'TWO';
    if (this.step === 'c1') return cp!.party >= 2 ? [`CHOOSE YOUR ${many} CREATURES`, 'FIRST CREATURE (WORLD 1)'] : ['CHOOSE YOUR CREATURE (WORLD 1)'];
    if (this.step === 'c2') return [`CHOOSE YOUR ${many} CREATURES`, `FIRST: ${getCreature(this.picks[0]).name}   SECOND CREATURE (WORLD 2)`];
    if (this.step === 'c3') return ['CHOOSE YOUR THREE CREATURES', `${getCreature(this.picks[0]).name} + ${getCreature(this.picks[1]).name}   THIRD (WORLD 3 TITAN)`];
    if (this.step === 'g') return ['WHICH GUARDIAN DID YOU CHOOSE?'];
    const who = this.picks.length ? this.picks.map((id) => getCreature(id).name).join(' + ') : 'NONE';
    return [`LOCATION: ${cp!.label}`, `CREATURES: ${who}` + (this.guardian ? `   GUARDIAN: ${this.guardian.toUpperCase()}` : '')];
  }

  private draw() {
    const s = this.s;
    this.c.removeAll(true);
    this.c.setVisible(true);
    this.c.add(s.add.rectangle(0, 0, W, H, C.black).setOrigin(0, 0));
    this.c.add(txt(s, 8, 6, 'DEVELOPER TEST MENU', { color: C.white }));
    this.prompt().forEach((p, i) => this.c.add(txt(s, 8, 16 + i * 9, p, { color: C.mid })));
    const rows = this.rows();
    const top = TOP + (this.prompt().length - 1) * 9;
    const vis = VISIBLE - (this.prompt().length - 1);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + vis) this.scroll = this.sel - vis + 1;
    rows.slice(this.scroll, this.scroll + vis).forEach((r, i) => {
      const k = this.scroll + i;
      const on = k === this.sel;
      this.c.add(txt(s, 8, top + i * LINE, (on ? '> ' : '  ') + r.text, { color: !r.pick ? C.mid : on ? C.white : C.light }));
    });
    this.c.add(txt(s, 8, H - 10, 'UP/DOWN: MOVE   ENTER: SELECT   BACKSPACE: BACK   ESC: CLOSE', { color: C.dark }));
  }

  move(d: number) {
    const rows = this.rows();
    let k = this.sel;
    for (let n = 0; n < rows.length; n++) {
      k = (k + d + rows.length) % rows.length;
      if (rows[k].pick) break;
    }
    this.sel = k;
    this.draw();
  }

  private back() {
    if (this.step === 'loc') return this.hide();
    if (this.step === 'c2') return this.goto('c1');
    if (this.step === 'c3') return this.goto('c2');
    if (this.step === 'g') return this.goto(this.cp!.party >= 3 ? 'c3' : 'c1');
    this.goto('loc');
  }

  /** Raw keyboard input while the menu is open. */
  key(k: string) {
    if (k === 'Escape') return this.hide();
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return this.move(-1);
    if (k === 'ArrowDown' || k === 's' || k === 'S') return this.move(1);
    if (k === 'Backspace' || k === 'x' || k === 'X') return this.back();
    if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') this.rows()[this.sel]?.pick?.();
  }

  /** Mouse / touch: click a row to select it, click it again to choose it. */
  pointer(_x: number, y: number) {
    const top = TOP + (this.prompt().length - 1) * 9;
    const k = this.scroll + Math.floor((y - top + 2) / LINE);
    const rows = this.rows();
    if (k < 0 || k >= rows.length || !rows[k].pick) return;
    if (k === this.sel) rows[k].pick!();
    else {
      this.sel = k;
      this.draw();
    }
  }
}
