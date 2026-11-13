import Phaser from 'phaser';
import { txt, box, bar, C } from '../../ui/ui';
import { W, H, TOP_H, BOTTOM_Y } from '../../constants';
import { STATUS_INFO } from '../../engine/battle';
import { up } from '../../gfx/font';
import type { Status, StatusId } from '../../engine/types';
import type { BattleScene } from '../BattleScene';

// Retro battle interface: boss nameplate + giant HP bar on top, champion
// status and the four-action menu at the bottom, and a compact intent telegraph.
// It favours icons, pips and bars over sentences.

const MENU_Y = 232;
const CELL_W = 194;
const CELL_H = 30;

/** Status icon shown next to an intent for the curse that attack leaves behind. */
const RIDER: Record<string, StatusId> = {
  tide: 'DROWNING',
  anchor: 'ANCHORED',
  siphon: 'REGEN',
  fog: 'FOGGED',
  maelstrom: 'VULNERABLE',
};

export class Hud {
  /** The boss's subtitle under its name (the Reaper changes its own mid-fight). */
  subT?: Phaser.GameObjects.GameObject & { setText(t: string): unknown };
  setSubtitle(t: string) {
    this.subT?.setText(t);
  }
  /** ROGUELIKE: several enemies share the top bar: whoever is in the spotlight is named here. */
  private nameE?: Phaser.GameObjects.BitmapText;
  setEnemy(name: string, sub: string) {
    this.nameE?.setText(up(name));
    this.subT?.setText(up(sub));
  }
  /** A different enemy took the spotlight: its bar starts where it actually stands. */
  snapBoss() {
    const b = this.s.battle;
    this.bossHp = this.bossGhost = this.bossTarget = b.b.hp;
    this.refresh();
  }

  s: BattleScene;
  layer: Phaser.GameObjects.Layer;
  g!: Phaser.GameObjects.Graphics; // bars (redrawn every frame)
  // displayed values
  bossHp = 0;
  bossGhost = 0;
  bossTarget = 0;
  playerHp = 0;
  playerGhost = 0;
  playerTarget = 0;
  private ghostDelayB = 0;
  private ghostDelayP = 0;
  en = 0;
  private pHpT!: Phaser.GameObjects.BitmapText;
  private bossStat!: Phaser.GameObjects.Container;
  private playerStat!: Phaser.GameObjects.Container;
  // intent
  private intentC!: Phaser.GameObjects.Container;
  private intentBlink?: Phaser.Time.TimerEvent;
  // menu
  menuC!: Phaser.GameObjects.Container;
  cells: Phaser.GameObjects.Zone[] = [];
  private nameT!: Phaser.GameObjects.BitmapText;
  private partC!: Phaser.GameObjects.Container;
  private chipOn = false;
  private infoC!: Phaser.GameObjects.Container;
  // action caption
  private capC!: Phaser.GameObjects.Container;
  private hitP = 0;
  private flashB = 0;
  private healP = 0;
  private healB = 0;

  constructor(s: BattleScene, layer: Phaser.GameObjects.Layer) {
    this.s = s;
    this.layer = layer;
    this.build();
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.s.uiObj(o);
    return o;
  }

  private build() {
    const s = this.s;
    const b = s.battle;
    this.bossHp = this.bossGhost = this.bossTarget = b.b.hp;
    this.playerHp = this.playerGhost = this.playerTarget = b.p.hp;
    this.en = b.p.en;

    // ---- top bar: nameplate and one enormous health bar
    const top = this.add(s.add.graphics());
    top.fillStyle(C.black, 1).fillRect(0, 0, W, TOP_H);
    top.fillStyle(C.light, 1).fillRect(0, TOP_H - 1, W, 1);
    top.fillStyle(C.dark, 1).fillRect(0, TOP_H - 2, W, 1);
    this.nameE = this.add(txt(s, 5, 3, b.enemy.name, { color: C.white }));
    this.subT = this.add(txt(s, 5, 12, b.enemy.subtitle, { color: C.mid }));
    this.bossStat = this.add(s.add.container(0, 0));

    // ---- bottom panel
    const bot = this.add(s.add.graphics());
    bot.fillStyle(C.black, 1).fillRect(0, BOTTOM_Y, W, H - BOTTOM_Y);
    bot.fillStyle(C.light, 1).fillRect(0, BOTTOM_Y, W, 1);
    bot.fillStyle(C.dark, 1).fillRect(0, BOTTOM_Y + 1, W, 1);
    this.nameT = this.add(txt(s, 5, BOTTOM_Y + 5, s.creature.name, { outline: true }));
    this.partC = this.add(s.add.container(0, 0));
    this.add(txt(s, 182, BOTTOM_Y + 6, 'HP', { color: C.mid }));
    this.pHpT = this.add(txt(s, 292, BOTTOM_Y + 6, '', { color: C.white }));
    this.add(txt(s, 182, BOTTOM_Y + 16, 'EN', { color: C.mid }));
    this.playerStat = this.add(s.add.container(0, 0));

    this.g = this.add(s.add.graphics());

    this.intentC = this.add(s.add.container(0, 0));
    this.capC = this.add(s.add.container(0, 0));

    // ---- menu cells
    this.menuC = this.add(s.add.container(0, 0));
    this.infoC = this.add(s.add.container(0, 0));
    for (let i = 0; i < 4; i++) {
      const x = 4 + (i % 2) * (CELL_W + 4);
      const y = MENU_Y + Math.floor(i / 2) * (CELL_H + 4);
      const z = this.add(s.add.zone(x, y, CELL_W, CELL_H).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
      this.cells.push(z);
    }
    // two-creature fights: the partner chip doubles as the SWITCH button (slot 4)
    if (b.party.length > 1) this.cells.push(this.add(s.add.zone(4, BOTTOM_Y - 17, 122, 15).setOrigin(0, 0).setInteractive({ useHandCursor: true })));

    this.refresh();
  }

  // -------------------------------------------------------------- per frame

  update(dt: number) {
    const k = Math.min(1, dt / 120);
    const step = (cur: number, tgt: number) => (Math.abs(tgt - cur) < 0.5 ? tgt : cur + (tgt - cur) * k);
    this.bossHp = step(this.bossHp, this.bossTarget);
    this.playerHp = step(this.playerHp, this.playerTarget);
    this.ghostDelayB -= dt;
    this.ghostDelayP -= dt;
    if (this.ghostDelayB <= 0) this.bossGhost = this.bossGhost > this.bossHp ? Math.max(this.bossHp, this.bossGhost - dt * 0.25) : this.bossHp;
    if (this.ghostDelayP <= 0) this.playerGhost = this.playerGhost > this.playerHp ? Math.max(this.playerHp, this.playerGhost - dt * 0.12) : this.playerHp;
    this.hitP = Math.max(0, this.hitP - dt);
    this.flashB = Math.max(0, this.flashB - dt);
    this.healP = Math.max(0, this.healP - dt);
    this.healB = Math.max(0, this.healB - dt);
    this.drawBars();
  }

  private drawBars() {
    const g = this.g;
    const b = this.s.battle;
    g.clear();
    // Both bars stay exactly where they are: a hit flashes the fill, a heal pulses
    // a halo round the frame. Neither ever moves the bar or changes its size.
    // A sliver of health is always at least one pixel, so "nearly dead" never reads as dead.
    const alive = (hp: number) => (hp > 0 ? 1 : 0);
    // boss: one enormous bar across the whole top
    const bossPct = this.bossHp / b.b.maxHp;
    if (this.healB > 0) halo(g, 5, 22, W - 10, 6, this.healB);
    bar(g, 5, 22, W - 10, 6, bossPct, this.bossGhost / b.b.maxHp, 3, this.flashB > 0 && Math.floor(this.flashB / 60) % 2 ? C.light : C.white, alive(this.bossTarget));

    // champion HP
    const pPct = this.playerHp / b.p.maxHp;
    const low = pPct < 0.25 && Math.floor(this.s.time.now / 250) % 2 === 0;
    const hitFlash = this.hitP > 0 && Math.floor(this.hitP / 60) % 2 === 1;
    if (this.healP > 0) halo(g, 196, BOTTOM_Y + 7, 92, 5, this.healP);
    bar(g, 196, BOTTOM_Y + 7, 92, 5, pPct, this.playerGhost / b.p.maxHp, 3, low || hitFlash ? C.light : C.white, alive(this.playerTarget));
    // the number is right-aligned in a fixed-width field so the digits never shuffle about
    const max = String(b.p.maxHp);
    const cur = String(Math.max(0, Math.round(this.playerHp)));
    this.pHpT.setText(`${cur.padStart(max.length, ' ')}/${max}`);
    // energy pips
    for (let i = 0; i < b.p.maxEn; i++) {
      const x = 196 + i * 8;
      g.fillStyle(C.white, 1).fillRect(x, BOTTOM_Y + 17, 7, 6);
      g.fillStyle(i < this.en ? C.white : C.black, 1).fillRect(x + 1, BOTTOM_Y + 18, 5, 4);
      if (i < this.en) g.fillStyle(C.light, 1).fillRect(x + 1, BOTTOM_Y + 21, 5, 1);
    }
  }

  // -------------------------------------------------------------- values

  bossHit(newHp: number) {
    this.bossTarget = Math.max(0, newHp);
    this.ghostDelayB = 450;
    this.flashB = 300;
  }
  /** Heals grow the bar from where it is (no grey "ghost" ahead of it) and pulse a halo. */
  bossHeal(newHp: number) {
    this.bossTarget = Math.min(this.s.battle.b.maxHp, newHp);
    this.healB = 600;
  }
  playerHit(newHp: number) {
    this.playerTarget = Math.max(0, newHp);
    this.ghostDelayP = 450;
    this.hitP = 300;
  }
  playerHeal(newHp: number) {
    this.playerTarget = Math.min(this.s.battle.p.maxHp, newHp);
    this.healP = 600;
  }
  /** A different creature took the field: its bars start where it actually stands. */
  snapPlayer() {
    const b = this.s.battle;
    this.playerHp = this.playerGhost = this.playerTarget = b.p.hp;
    this.en = b.p.en;
    this.refresh();
  }
  /**
   * Line the bars up with the battle's real numbers. Pass `keepHp` while more
   * animated hits from the same turn are still to come: those hits move the bars
   * themselves, and syncing to the final HP first would count them twice (the bar
   * would overshoot, then jump back up).
   */
  sync(keepHp = false) {
    const b = this.s.battle;
    if (!keepHp) {
      this.bossTarget = b.b.hp;
      this.playerTarget = b.p.hp;
    }
    this.en = b.p.en;
    this.refresh();
  }

  // -------------------------------------------------------------- statuses + intent

  refresh() {
    const b = this.s.battle;
    this.en = b.p.en;
    this.nameT.setText(b.creature.name);
    this.drawPartner();
    this.drawStatuses(this.bossStat, b.b.statuses, W - 5, 3, true);
    this.drawStatuses(this.playerStat, b.p.statuses, 5, BOTTOM_Y + 17, false);
    this.drawIntent();
  }

  private drawStatuses(c: Phaser.GameObjects.Container, list: Status[], x: number, y: number, rightAlign: boolean) {
    c.removeAll(true);
    let cx = x;
    const items = list.filter((st) => !(st.id === 'SHIELD' && st.value <= 0));
    for (const st of items) {
      const info = STATUS_INFO[st.id];
      let label = '';
      if (st.id === 'HEX') label = `${st.stacks}`;
      else if (st.id === 'SHIELD') label = `${Math.round(st.value)}`;
      else if (st.tick !== 'use') label = `${st.turns}`;
      const w = 8 + label.length * 6 + 3;
      const ix = rightAlign ? cx - w : cx;
      const icon = this.s.add.image(ix, y, info.icon).setOrigin(0, 0);
      const t = txt(this.s, ix + 9, y, label, { color: info.good ? C.white : C.light });
      c.add([icon, t]);
      cx = rightAlign ? cx - w : cx + w;
    }
  }

  /**
   * Compact telegraph chip (top-left of the arena):
   *   [icon] ATTACK NAME          !
   *          ▪▪▪▪ ~36  [curse]
   * Charged attacks show a countdown and a break meter instead.
   */
  drawIntent() {
    const s = this.s;
    const b = s.battle;
    const c = this.intentC;
    c.removeAll(true);
    this.intentBlink?.remove();
    if (b.over) return;
    const it = b.intent;
    const frozen = b.has('boss', 'DELAYED');
    const x = 4;
    const y = TOP_H + 3;
    const g = s.add.graphics();
    c.add(g);

    const icon = s.add.image(x + 5, y + 5, it.hidden ? 'w_unknown' : it.icon).setOrigin(0, 0);
    const nameT = txt(s, x + 21, y + 6, it.hidden ? '???' : it.name, { color: frozen ? C.mid : C.white, maxW: 200 });
    c.add([icon, nameT]);
    let rowY = nameT.y + nameT.height + 4;
    let rowW = 0;
    const row = s.add.graphics();
    c.add(row);
    const rx = x + 21;

    if (frozen) {
      c.add(s.add.image(rx, rowY, 's_delay').setOrigin(0, 0));
      rowW = 8;
    } else if (it.hidden) {
      c.add(s.add.image(rx, rowY, 's_fog').setOrigin(0, 0));
      rowW = 8;
    } else if (it.stage === 'charge' || it.stage === 'fire') {
      // turns until it fires (hourglass + pips), then the break meter
      c.add(s.add.image(rx, rowY, 's_delay').setOrigin(0, 0));
      const left = it.stage === 'charge' ? 2 : 1;
      for (let i = 0; i < 2; i++) {
        row.fillStyle(C.white, 1).fillRect(rx + 10 + i * 6, rowY + 1, 5, 5);
        if (i >= left) row.fillStyle(C.black, 1).fillRect(rx + 11 + i * 6, rowY + 2, 3, 3);
      }
      const pct = Math.min(1, it.breakDone / it.breakNeed);
      const bx = rx + 26;
      bar(row, bx, rowY + 2, 60, 3, pct, pct, 0, pct >= 1 ? C.white : C.light);
      const lab = txt(s, bx + 64, rowY, pct >= 1 ? 'BROKEN' : 'BREAK', { color: pct >= 1 ? C.white : C.mid });
      c.add(lab);
      rowW = 90 + lab.width;
    } else {
      // one pip per hit, then the expected damage
      const est = b.estimateIntent();
      const n = Math.min(est.hits, 12);
      for (let i = 0; i < n; i++) {
        row.fillStyle(C.white, 1).fillRect(rx + i * 5, rowY + 1, 4, 5);
        row.fillStyle(C.light, 1).fillRect(rx + i * 5, rowY + 5, 4, 1);
      }
      const dmg = txt(s, rx + n * 5 + 3, rowY, `~${est.total}`, { color: C.light });
      c.add(dmg);
      rowW = n * 5 + 3 + dmg.width;
      const rider = RIDER[it.id];
      if (rider) {
        c.add(s.add.image(rx + rowW + 4, rowY, STATUS_INFO[rider].icon).setOrigin(0, 0));
        rowW += 12;
      }
    }
    rowY += 8;
    const w = Math.max(nameT.width, rowW) + 21 + (it.major ? 14 : 6);
    const h = rowY - y + 4;
    box(g, x, y, w, h, 'dark');
    c.sendToBack(g);

    if (it.major && !it.hidden && !frozen) {
      // danger: a blinking warning mark and a pulsing frame
      const bang = s.add.image(x + w - 8, y + 4, 'fx_warn').setOrigin(0.5, 0).setScale(0.7);
      c.add(bang);
      const pulse = s.add.graphics();
      c.add(pulse);
      this.intentBlink = s.time.addEvent({
        delay: 380,
        loop: true,
        callback: () => {
          bang.setVisible(!bang.visible);
          pulse.clear();
          if (bang.visible) pulse.lineStyle(1, C.white, 1).strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
        },
      });
    }
  }

  setIntentVisible(v: boolean) {
    this.intentC.setVisible(v);
  }

  /** A quick bump on the intent chip when a dangerous attack is announced. */
  pulseIntent() {
    const c = this.intentC;
    c.setScale(1);
    this.s.tweens.add({ targets: c, scale: 1.06, x: -2, y: -2, duration: 90, yoyo: true, repeat: 1 });
  }

  // -------------------------------------------------------------- action caption

  /** Names the move being performed: dark plate for the champion, light plate for the boss. */
  caption(icon: string, name: string, boss: boolean) {
    const s = this.s;
    const c = this.capC;
    c.removeAll(true);
    this.s.tweens.killTweensOf(c);
    const t = txt(s, 0, 0, name, { color: boss ? C.black : C.white });
    const w = t.width + 30;
    const x = Math.round(W / 2 - w / 2);
    const y = TOP_H + 4;
    const g = s.add.graphics();
    box(g, x, y, w, 18, boss ? 'light' : 'dark');
    t.setPosition(x + 23, y + 6);
    c.add([g, s.add.image(x + 6, y + 3, icon).setOrigin(0, 0), t]);
    c.setAlpha(1).setVisible(true);
    c.y = -6;
    s.tweens.add({ targets: c, y: 0, duration: 120, ease: 'Quad.easeOut' });
  }

  hideCaption() {
    const c = this.capC;
    if (!c.visible) return;
    this.s.tweens.add({ targets: c, alpha: 0, duration: 160, onComplete: () => c.setVisible(false) });
  }

  /** The benched partner: name and a little health bar. Selecting it swaps them in. */
  private drawPartner() {
    const s = this.s;
    const r = s.battle.reserve();
    this.partC.removeAll(true);
    if (!r) return;
    const down = r.p.hp <= 0;
    const g = s.add.graphics();
    const on = this.chipOn && !down;
    box(g, 4, BOTTOM_Y - 17, 122, 15, on ? 'light' : 'dark');
    const fg = on ? C.black : down ? C.dark : C.light;
    // (the dungeon's longer names are cut to fit beside the bar)
    const nm = r.creature.name.length > 10 ? r.creature.name.slice(0, 9) + '.' : r.creature.name;
    const t = txt(s, 10, BOTTOM_Y - 13, `${down ? 'X' : '<>'} ${nm}`, { color: fg });
    const pct = Math.max(0, r.p.hp / r.p.maxHp);
    // World 4: two on the bench. The next one in gets the big bar, the other a thin one under it
    const other = s.battle.bench().find((m) => m !== r);
    const bh = other ? 3 : 5;
    g.fillStyle(on ? C.dark : C.black, 1).fillRect(84, BOTTOM_Y - 12, 36, bh);
    g.fillStyle(down ? C.dark : on ? C.black : C.white, 1).fillRect(84, BOTTOM_Y - 12, Math.round(36 * pct), bh);
    if (other) {
      const p2 = Math.max(0, other.p.hp / other.p.maxHp);
      g.fillStyle(on ? C.dark : C.black, 1).fillRect(84, BOTTOM_Y - 8, 36, 2);
      g.fillStyle(other.p.hp <= 0 ? C.dark : on ? C.black : C.mid, 1).fillRect(84, BOTTOM_Y - 8, Math.round(36 * p2), 2);
    }
    this.partC.add([g, t]);
  }

  // -------------------------------------------------------------- menu

  /** The four actions. `busy` draws them dimmed while a turn is resolving. */
  showMenu(sel: number, busy = false) {
    const s = this.s;
    const b = s.battle;
    this.chipOn = sel === 4 && !busy;
    this.drawPartner();
    this.menuC.removeAll(true);
    this.menuC.setVisible(true);
    const g = s.add.graphics();
    this.menuC.add(g);
    g.fillStyle(C.black, 1).fillRect(0, MENU_Y - 1, W, H - MENU_Y + 1); // starts below the status row
    b.creature.abilities.forEach((a, i) => {
      const x = 4 + (i % 2) * (CELL_W + 4);
      const y = MENU_Y + Math.floor(i / 2) * (CELL_H + 4);
      const av = b.canUse(i);
      const on = i === sel && !busy;
      const live = av.ok && !busy;
      box(g, x, y, CELL_W, CELL_H, on ? 'light' : 'dark');
      const fg = on ? C.black : live ? C.white : C.dark;
      const icon = s.add.image(x + 6, y + 9, a.icon).setOrigin(0, 0);
      if (!live) icon.setTint(busy ? C.dark : C.mid);
      const name = txt(s, x + 23, y + 12, a.name, { color: fg });
      this.menuC.add([icon, name]);
      if (a.kind === 'signature') this.menuC.add(txt(s, x + 23 + name.width + 3, y + 12, '*', { color: on ? C.black : live ? C.light : C.dark }));

      // right side: cooldown, seal, or energy cost as pips
      const right = x + CELL_W - 7;
      const ink = on ? C.black : live ? C.light : C.dark;
      if (b.p.cd[i] > 0) {
        const n = txt(s, right, y + 12, `${b.p.cd[i]}`, { color: busy ? C.dark : C.light, origin: [1, 0] });
        const ic = s.add.image(right - n.width - 9, y + 11, 's_delay').setOrigin(0, 0);
        if (busy) ic.setTint(C.dark);
        this.menuC.add([n, ic]);
      } else if (a.kind === 'signature' && b.has('player', 'ANCHORED')) {
        this.menuC.add(s.add.image(right - 7, y + 11, 's_anchor').setOrigin(0, 0));
      } else {
        const short = !busy && a.cost > b.p.en;
        for (let k = 0; k < a.cost; k++) {
          const px = right - (a.cost - k) * 5 + 1;
          g.fillStyle(short && k >= b.p.en ? C.dark : ink, 1).fillRect(px, y + 12, 4, 6);
        }
      }
      if (on) {
        const cur = s.add.image(x - 1, y + 12, 'ui_cursor').setTint(C.black);
        this.menuC.add(cur);
        s.tweens.add({ targets: cur, x: x + 1, duration: 260, yoyo: true, repeat: -1 });
      }
    });
    if (busy) this.infoC.setVisible(false);
    else this.showInfo(sel);
  }

  /** One slim line about the highlighted action (or why it is unavailable). */
  private showInfo(i: number) {
    const s = this.s;
    const b = s.battle;
    this.infoC.removeAll(true);
    this.infoC.setVisible(true);
    let line: string;
    let ok: boolean;
    if (i === 4) {
      const r = b.reserve();
      ok = b.canSwap();
      line = ok ? `SWITCH TO ${r!.creature.name}. USES YOUR TURN.` : `${r?.creature.name ?? 'YOUR PARTNER'} CAN'T FIGHT.`;
    } else {
      const a = b.creature.abilities[i];
      const av = b.canUse(i);
      ok = av.ok;
      line = av.ok ? a.short : av.reason;
    }
    const av = { ok };
    const t = txt(s, 0, 0, line, { color: av.ok ? C.white : C.black });
    const w = t.width + 12;
    const x = W - 4 - w;
    const y = BOTTOM_Y - 16;
    const g = s.add.graphics();
    box(g, x, y, w, 14, av.ok ? 'dark' : 'light');
    t.setPosition(x + 6, y + 4);
    this.infoC.add([g, t]);
  }

  hideMenu() {
    this.menuC.setVisible(false);
    this.infoC.setVisible(false);
  }
}

/** A soft pulsing frame round a bar while it fills from a heal. */
function halo(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, left: number) {
  if (Math.floor(left / 100) % 2) return;
  g.fillStyle(C.light, 1).fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle(C.black, 1).fillRect(x - 2, y - 2, w + 4, h + 4);
}
