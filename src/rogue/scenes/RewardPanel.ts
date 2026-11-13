import Phaser from 'phaser';
import { txt, box, bar, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import { SKILL_CAP } from '../shared/config';
import { RARITY_NAME, spiritDef } from '../shared/roster';
import { canHold, skillDef } from '../shared/skills';
import { rarityFrame, rarityPips, type Key } from './common';

// ROGUELIKE: the skill reward. Three skills to look at, one to take (or none), and then
// the part that matters: which of your spirits carries it for the rest of the run.

const SOURCE: Record<string, string> = { room: 'THE ROOM IS CLEAR', elite: 'THE ELITE HAS FALLEN', boss: 'THE BOSS HAS FALLEN', puzzle: 'THE PUZZLE IS SOLVED', treasure: 'THE CHEST OPENS', shop: 'A CURIOUS RELIC' };
const CW = 122;
const CH = 150;
const CY = 34;
const X0 = (W - (CW * 3 + 14)) / 2;

export class RewardPanel {
  private c: Phaser.GameObjects.Container;
  private zones: Phaser.GameObjects.Zone[] = [];
  private mode: 'pick' | 'assign' | 'replace' = 'pick';
  /** pick: 0..2 = a skill, 3 = leave it. assign: a spirit. replace: one of its skills. */
  private sel = 0;
  private skill = '';
  private spirit = 0;
  private key0 = '';

  constructor(private s: Phaser.Scene) {
    this.c = s.add.container(0, 0).setDepth(300).setVisible(false);
  }

  get open() {
    return this.c.visible;
  }

  /** Call whenever the room's state changes: opens, updates or closes itself. */
  sync() {
    const me = net.me;
    const r = me?.reward;
    if (!r) {
      if (this.open) this.close();
      return;
    }
    const k = r.offers.join(',') + r.source;
    if (k !== this.key0 || !this.open) {
      this.key0 = k;
      this.mode = 'pick';
      this.sel = 0;
      this.c.setVisible(true).setAlpha(0);
      this.s.tweens.add({ targets: this.c, alpha: 1, duration: 200 });
      sound.play('item');
    }
    this.draw();
  }

  private close() {
    this.c.setVisible(false);
    this.c.removeAll(true);
    for (const z of this.zones) z.destroy();
    this.zones = [];
    this.key0 = '';
  }

  destroy() {
    this.close();
    this.c.destroy();
  }

  private hit(x: number, y: number, w: number, h: number, fn: () => void) {
    const z = this.s.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(310);
    z.on('pointerdown', fn);
    this.zones.push(z);
  }

  private draw() {
    const s = this.s;
    const me = net.me;
    const r = me?.reward;
    const c = this.c;
    c.removeAll(true);
    for (const z of this.zones) z.destroy();
    this.zones = [];
    if (!me || !r) return;
    const g = s.add.graphics();
    c.add(g);
    // solid: the room's own labels showed through and muddled the header and footer
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    if (this.mode === 'pick') {
      c.add(txt(s, W / 2, 5, SOURCE[r.source] ?? 'A REWARD', { color: C.mid, origin: [0.5, 0] }));
      c.add(txt(s, W / 2, 16, 'CHOOSE ONE SKILL', { outline: true, origin: [0.5, 0] }));
      r.offers.forEach((id, i) => {
        const d = skillDef(id);
        const x = X0 + i * (CW + 7);
        const on = this.sel === i;
        rarityFrame(g, x, CY, CW, CH, d.rarity, on);
        c.add(txt(s, x + CW / 2, CY + 12, d.name, { outline: true, origin: [0.5, 0], maxW: CW - 10, align: 'center' }));
        c.add(txt(s, x + CW / 2, CY + 36, RARITY_NAME[d.rarity], { color: d.rarity === 'common' ? C.mid : C.light, origin: [0.5, 0] }));
        c.add(rarityPips(s, x + CW / 2, CY + 45, d.rarity));
        // only the card you are looking at explains itself; the others stay quiet
        if (on) c.add(txt(s, x + CW / 2, CY + 56, d.desc, { color: C.light, origin: [0.5, 0], maxW: CW - 12, align: 'center' }));
        if (d.only) c.add(txt(s, x + CW / 2, CY + CH - 24, `ONLY FOR ${spiritDef(d.only).name}`, { color: C.mid, origin: [0.5, 0] }));
        box(g, x + 10, CY + CH - 15, CW - 20, 12, on ? 'light' : 'dark');
        c.add(txt(s, x + CW / 2, CY + CH - 12, 'TAKE', { origin: [0.5, 0], color: on ? C.black : C.light }));
        this.hit(x, CY, CW, CH, () => {
          if (this.sel === i) return this.press();
          this.sel = i;
          sound.play('move');
          this.draw();
        });
      });
      const on = this.sel === 3;
      const sw = 150;
      box(g, W / 2 - sw / 2, H - 30, sw, 13, on ? 'light' : 'dark');
      c.add(txt(s, W / 2, H - 27, 'LEAVE IT', { origin: [0.5, 0], color: on ? C.black : C.mid }));
      this.hit(W / 2 - sw / 2, H - 30, sw, 13, () => {
        this.sel = 3;
        this.press();
      });
      c.add(txt(s, W / 2, H - 12, 'SPACE: TAKE', { color: C.dark, origin: [0.5, 0] }));
      return;
    }
    const d = skillDef(this.skill);
    rarityFrame(g, 20, 8, W - 40, 46, d.rarity, true);
    c.add(txt(s, 30, 15, d.name, { outline: true }));
    c.add(txt(s, W - 30, 16, RARITY_NAME[d.rarity], { color: C.light, origin: [1, 0] }));
    c.add(txt(s, 30, 28, d.desc, { color: C.light, maxW: W - 62 }));
    if (this.mode === 'assign') {
      c.add(txt(s, W / 2, 62, 'GIVE IT TO WHO?', { outline: true, origin: [0.5, 0] }));
      this.spiritRows(g, 78, this.sel, this.skill);
      c.add(txt(s, W / 2, H - 12, 'SPACE: GIVE   ESC: BACK', { color: C.dark, origin: [0.5, 0] }));
      return;
    }
    // replace: this spirit is carrying all it can
    const sp = me.spirits[this.spirit];
    c.add(txt(s, W / 2, 62, `${spiritDef(sp.id).name} IS FULL. DROP WHICH?`, { outline: true, origin: [0.5, 0], maxW: W - 30, align: 'center' }));
    sp.skills.forEach((id, i) => {
      const sd = skillDef(id);
      const y = 88 + i * 34;
      const on = this.sel === i;
      box(g, 30, y, W - 60, 31, on ? 'light' : 'dark');
      c.add(txt(s, 38, y + 4, sd.name, { color: on ? C.black : C.white }));
      c.add(txt(s, W - 38, y + 4, RARITY_NAME[sd.rarity], { color: on ? C.dark : C.mid, origin: [1, 0] }));
      if (on) c.add(txt(s, 38, y + 14, sd.desc, { color: C.dark, maxW: W - 80 }));
      this.hit(30, y, W - 60, 31, () => {
        if (this.sel === i) return this.press();
        this.sel = i;
        sound.play('move');
        this.draw();
      });
    });
    c.add(txt(s, W / 2, H - 12, 'SPACE: REPLACE   ESC: BACK', { color: C.dark, origin: [0.5, 0] }));
  }

  /** Your spirits and what they carry. With `skill`, each row says whether it can take it. */
  private spiritRows(g: Phaser.GameObjects.Graphics, y0: number, sel: number, skill: string | null, compact = 26) {
    const s = this.s;
    const me = net.me!;
    const rh = skill ? 34 : compact;
    me.spirits.forEach((sp, i) => {
      const def = spiritDef(sp.id);
      const y = y0 + i * (rh + 3);
      const on = sel === i;
      const why = skill ? this.blocker(i, skill) : '';
      box(g, 20, y, W - 40, rh, on ? 'select' : 'plain');
      if (s.textures.exists('cr_' + sp.id)) this.c.add(s.add.image(40, y + rh - 3, 'cr_' + sp.id, 0).setOrigin(0.5, 1).setScale(skill ? 0.5 : 0.45).setAlpha(sp.hp > 0 ? 1 : 0.4));
      const tx = skill ? 66 : 58;
      this.c.add(txt(s, tx, y + 4, def.name, { color: on ? C.black : C.white }));
      bar(g, tx + 76, y + 6, 50, 3, sp.hp, sp.hp, 0, on ? C.black : C.white);
      this.c.add(txt(s, W - 28, y + 4, `${sp.skills.length}/${SKILL_CAP}`, { color: on ? C.dark : C.mid, origin: [1, 0] }));
      if (skill) {
        const full = sp.skills.length >= SKILL_CAP;
        const line = why ? why : full ? 'FULL - SWAPS ONE' : '';
        this.c.add(txt(s, tx, y + rh - 12, line, { color: why ? (on ? C.dark : C.dark) : on ? C.black : C.light }));
        this.hit(20, y, W - 40, rh, () => {
          if (this.sel === i) return this.press();
          this.sel = i;
          sound.play('move');
          this.draw();
        });
      }
    });
  }

  /** Why this spirit cannot take the skill at all ('' if it can, perhaps by replacing one). */
  private blocker(i: number, skill: string): string {
    const sp = net.me!.spirits[i];
    const d = skillDef(skill);
    if (d.only && d.only !== sp.id) return `ONLY ${spiritDef(d.only).name}`;
    if (sp.skills.length < SKILL_CAP && !canHold(sp, skill)) return 'HAS ENOUGH OF THESE';
    return '';
  }

  /** Returns true when the panel swallowed the key. */
  key(k: Key): boolean {
    if (!this.open) return false;
    const me = net.me;
    if (!me?.reward) return true;
    if (this.mode === 'pick') {
      if (k === 'left' || k === 'right') {
        if (this.sel === 3) this.sel = 1;
        else this.sel = (this.sel + (k === 'left' ? -1 : 1) + 3) % 3;
        sound.play('move');
      } else if (k === 'down') {
        this.sel = 3;
        sound.play('move');
      } else if (k === 'up' && this.sel === 3) {
        this.sel = 1;
        sound.play('move');
      } else if (k === 'ok') return this.press(), true;
    } else {
      const n = this.mode === 'assign' ? me.spirits.length : me.spirits[this.spirit].skills.length;
      if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
        this.sel = (this.sel + (k === 'up' || k === 'left' ? -1 : 1) + n) % n;
        sound.play('move');
      } else if (k === 'ok') return this.press(), true;
      else if (k === 'back') {
        sound.play('back');
        if (this.mode === 'replace') {
          this.mode = 'assign';
          this.sel = this.spirit;
        } else {
          this.mode = 'pick';
          this.sel = Math.max(0, me.reward.offers.indexOf(this.skill));
        }
      }
    }
    this.draw();
    return true;
  }

  private press() {
    const me = net.me;
    const r = me?.reward;
    if (!me || !r) return;
    if (this.mode === 'pick') {
      if (this.sel === 3) {
        sound.play('back');
        return net.send({ t: 'reward_skip' });
      }
      this.skill = r.offers[this.sel];
      this.mode = 'assign';
      // start on the first spirit that can actually take it
      this.sel = Math.max(0, me.spirits.findIndex((_, i) => !this.blocker(i, this.skill)));
      sound.play('select');
      return this.draw();
    }
    if (this.mode === 'assign') {
      if (this.blocker(this.sel, this.skill)) return void sound.play('deny');
      this.spirit = this.sel;
      if (me.spirits[this.spirit].skills.length >= SKILL_CAP) {
        this.mode = 'replace';
        this.sel = 0;
        sound.play('select');
        return this.draw();
      }
      sound.play('recruit');
      return net.send({ t: 'reward_take', skill: this.skill, spirit: this.spirit });
    }
    sound.play('recruit');
    net.send({ t: 'reward_take', skill: this.skill, spirit: this.spirit, replace: this.sel });
  }
}
