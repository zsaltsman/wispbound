import Phaser from 'phaser';
import { txt, box, bar, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import { DIFFICULTY, FLOOR_NAMES } from '../shared/config';
import { DELTA, DIRS, DOOR_AT, ROOM_H, ROOM_W, findMarks, roomTemplate, walkable, type Dir, type RoomPub } from '../shared/dungeon';
import { BOSSES, FOES } from '../shared/enemies';
import { SHOP, type PlayerPub, type ShopItem } from '../shared/protocol';
import { puzzleBlocked, type PuzzleState } from '../shared/puzzles';
import { spiritDef } from '../shared/roster';
import { MAP_ICONS } from '../gfx/artDungeon';
import { LOOKS, RogueScene, type Key } from './common';
import { RewardPanel } from './RewardPanel';

// ROGUELIKE: the dungeon. One room at a time, the whole party in it together; a map of
// what has been found; and everything a room can hold (enemies to walk up to, a chest, a
// fire, a keeper selling things, a puzzle).

const T = 16;
const OX = (W - ROOM_W * T) / 2;
const OY = 46;
const STEP_MS = 120;
/** The room is seen up close, the way the story's world is: twice the size, following you. */
const ZOOM = 2;
/** The bottom of the screen belongs to your spirits and the room's hint; the room is seen above it. */
const VIEW_H = OY + ROOM_H * T + T;
const KIND_LABEL: Record<string, string> = { start: 'THE WAY IN', combat: '', elite: 'AN ELITE GUARDS THIS ROOM', puzzle: 'A PUZZLE', treasure: 'A TREASURE ROOM', rest: 'A PLACE TO REST', shop: 'A WANDERING KEEPER', boss: 'THE BOSS OF THIS FLOOR' };
const FACE: Record<Dir, number> = { s: 0, n: 3, w: 6, e: 6 };
const SHOP_ITEMS: ShopItem[] = ['tonic', 'revive', 'skill'];

interface Avatar {
  sp: Phaser.GameObjects.Sprite;
  tag: Phaser.GameObjects.BitmapText | null;
  x: number;
  y: number;
}

export class DungeonScene extends RogueScene {
  private roomKey = '';
  private floorSeen = -1;
  private tiles!: Phaser.GameObjects.Container;
  private objs!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private doors!: Phaser.GameObjects.Container;
  private worldLayer!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private beamG!: Phaser.GameObjects.Graphics;
  private avatars = new Map<number, Avatar>();
  private things = new Map<string, Phaser.GameObjects.Sprite>();
  private foeSprites: Phaser.GameObjects.Sprite[] = [];
  private reward!: RewardPanel;
  private shopC: Phaser.GameObjects.Container | null = null;
  private shopSel = 0;
  private cardC: Phaser.GameObjects.Container | null = null;
  private devC: Phaser.GameObjects.Container | null = null;
  private devSel = 0;
  private devBoss = 0;
  private mx = 9;
  private my = 6;
  private mdir: Dir = 's';
  private moving = false;
  private engaged = false;
  private doorWait = 0;
  private showing = false;
  private keysDown!: Record<Dir, Phaser.Input.Keyboard.Key[]>;
  private fading = false;

  constructor() {
    super('rogue-dungeon');
  }

  init() {
    this.roomKey = '';
    this.floorSeen = -1;
    this.avatars = new Map();
    this.things = new Map();
    this.foeSprites = [];
    this.shopC = null;
    this.cardC = null;
    this.devC = null;
    this.moving = false;
    this.engaged = false;
    this.doorWait = 0;
    this.showing = false;
    this.fading = false;
  }

  create() {
    this.setup();
    // two cameras, as in the story's world: the room up close, following you; and the HUD over it
    const main = this.cameras.main;
    main.setZoom(ZOOM).setViewport(0, 0, W, VIEW_H);
    main.setBounds(OX - T, OY - T, (ROOM_W + 2) * T, (ROOM_H + 2) * T);
    this.uiCam = this.cameras.add(0, 0, W, H);
    this.uiCam.fadeIn(300, 0, 0, 0);
    this.worldLayer = this.add.layer().setDepth(0);
    this.worldLayer.cameraFilter |= this.uiCam.id;
    this.tiles = this.add.container(0, 0).setDepth(1);
    this.doors = this.add.container(0, 0).setDepth(2);
    this.beamG = this.add.graphics().setDepth(4);
    this.objs = this.add.container(0, 0).setDepth(5);
    this.worldLayer.add([this.tiles, this.doors, this.beamG, this.objs]);
    // everything else in the scene (HUD, panels, notices) is drawn by the HUD camera only
    this.events.on('postupdate', () => {
      for (const o of this.children.list) if ((o as unknown) !== this.worldLayer && !(o.cameraFilter & main.id)) o.cameraFilter |= main.id;
    });
    this.hud = this.add.container(0, 0).setDepth(100);
    this.reward = new RewardPanel(this);
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keysDown = {
      n: [kb.addKey(K.UP, false), kb.addKey(K.W, false)],
      s: [kb.addKey(K.DOWN, false), kb.addKey(K.S, false)],
      w: [kb.addKey(K.LEFT, false), kb.addKey(K.A, false)],
      e: [kb.addKey(K.RIGHT, false), kb.addKey(K.D, false)],
    };
    const off = net.on((ev) => {
      if (this.leaving) return;
      if (ev.t === 'pos') this.onPos(ev.seat, ev.x, ev.y, ev.dir);
      if (ev.t === 'fx') this.onFx(ev.kind, ev.seat, ev.text);
    });
    this.events.once('shutdown', () => {
      off();
      this.reward.destroy();
    });
    if (this.follow()) return;
    sound.setAmbience('cave');
    this.refresh();
  }

  // ================================================================ the room

  private room(): RoomPub | null {
    const f = net.state?.floor;
    return f ? f.rooms[f.cur] : null;
  }
  private px(x: number) {
    return OX + x * T + T / 2;
  }
  private py(y: number) {
    return OY + y * T + T;
  }

  protected refresh() {
    const st = net.state;
    const f = st?.floor;
    const room = this.room();
    if (!st || !f || !room) return;
    const key = `${f.index}:${f.cur}`;
    if (key !== this.roomKey) {
      const first = this.roomKey === '';
      this.roomKey = key;
      this.engaged = false;
      if (first) this.build();
      else {
        // a quick curtain between rooms
        this.fading = true;
        this.cameras.main.fadeOut(110, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.build();
          this.cameras.main.fadeIn(160, 0, 0, 0);
          this.fading = false;
        });
        return;
      }
    }
    if (this.fading) return;
    this.sync();
  }

  /** Lay the whole room out afresh (a new room, or coming back from a fight). */
  private build() {
    const st = net.state!;
    const f = st.floor!;
    const room = this.room()!;
    const th = f.index;
    this.tiles.removeAll(true);
    this.objs.removeAll(true);
    this.avatars.clear();
    this.things.clear();
    this.foeSprites = [];
    this.closeShop();
    const tpl = f.puzzle ? f.puzzle.floor : roomTemplate(room);
    // ---- walls
    for (let x = -1; x <= ROOM_W; x++) {
      this.tiles.add(this.add.image(OX + x * T, OY - T, `rg_wall${th}_0`).setOrigin(0, 0));
      this.tiles.add(this.add.image(OX + x * T, OY + ROOM_H * T, `rg_wall${th}_1`).setOrigin(0, 0));
    }
    for (let y = 0; y < ROOM_H; y++) {
      this.tiles.add(this.add.image(OX - T, OY + y * T, `rg_wall${th}_1`).setOrigin(0, 0));
      this.tiles.add(this.add.image(OX + ROOM_W * T, OY + y * T, `rg_wall${th}_1`).setOrigin(0, 0));
    }
    // ---- floor
    for (let y = 0; y < ROOM_H; y++)
      for (let x = 0; x < ROOM_W; x++) {
        const ch = tpl[y][x];
        const v = (x * 7 + y * 13 + room.seed) % 11;
        this.tiles.add(this.add.image(OX + x * T, OY + y * T, ch === '~' ? `rg_pit${th}` : `rg_floor${th}_${v < 6 ? 0 : v < 8 ? 1 : v < 10 ? 2 : 3}`).setOrigin(0, 0));
        if (ch === '#') this.thing(`pil${x},${y}`, `rg_pillar${th}`, x, y);
        if (ch === 'x') this.tiles.add(this.add.image(OX + x * T, OY + y * T, 'rg_rubble').setOrigin(0, 0));
      }
    // ---- what the room holds
    if (!f.puzzle) {
      for (const [x, y] of findMarks(tpl, 'C')) this.thing('chest', 'rg_chest', x, y);
      for (const [x, y] of findMarks(tpl, 'F')) this.thing('fire', 'rg_fire', x, y);
      for (const [x, y] of findMarks(tpl, 'S')) {
        const k = this.thing('keeper', 'ch_imp', x, y);
        k.setFrame(0);
      }
      const marks = [...findMarks(tpl, 'E'), ...findMarks(tpl, 'B')];
      if (!room.cleared) {
        room.foes.forEach((id, i) => {
          const [x, y] = marks[i % Math.max(1, marks.length)] ?? [9, 3];
          const dx = i >= marks.length ? (i % 2 ? 1 : -1) * (1 + Math.floor(i / 2)) : 0;
          const key = this.textures.exists('sp_' + id) ? 'sp_' + id : 'sp_ashbiter';
          const sp = this.add.sprite(this.px(x + dx), this.py(y), key, 0).setOrigin(0.5, 1);
          const want = room.kind === 'boss' ? 60 : FOES[id]?.size === 'm' ? 40 : FOES[id]?.size === 'l' ? 56 : 28;
          sp.setScale(Math.min(1, want / sp.height));
          sp.setDepth(sp.y);
          this.objs.add(sp);
          this.tweens.add({ targets: sp, y: sp.y - 2, duration: 700 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.foeSprites.push(sp);
        });
      }
    }
    this.buildPuzzle(f.puzzle);
    // ---- the party
    for (const p of st.players) this.addAvatar(p);
    const me = net.me;
    if (me) {
      this.mx = me.x;
      this.my = me.y;
      this.mdir = me.dir;
    }
    this.moving = false;
    const mine = this.avatars.get(net.seat);
    if (mine) {
      this.cameras.main.startFollow(mine.sp, true, 1, 1, 0, 8);
      this.cameras.main.centerOn(mine.sp.x, mine.sp.y - 8);
    }
    this.sync();
    if (this.floorSeen !== f.index) {
      this.floorSeen = f.index;
      if (room.kind === 'start') this.floorCard(f.index);
      sound.playSong(['w5_prison', 'w4_garden', 'w5_high'][f.index] ?? 'title');
    }
  }

  private thing(id: string, key: string, x: number, y: number): Phaser.GameObjects.Sprite {
    const sp = this.add.sprite(this.px(x), this.py(y), key, 0).setOrigin(0.5, 1);
    sp.setDepth(sp.y);
    this.objs.add(sp);
    this.things.set(id, sp);
    return sp;
  }

  private addAvatar(p: PlayerPub) {
    const sp = this.add.sprite(this.px(p.x), this.py(p.y), LOOKS[p.look], FACE[p.dir]).setOrigin(0.5, 1).setFlipX(p.dir === 'e');
    sp.setDepth(sp.y + 1);
    this.objs.add(sp);
    let tag: Phaser.GameObjects.BitmapText | null = null;
    if ((net.state?.players.length ?? 1) > 1) {
      tag = txt(this, sp.x, sp.y - 27, p.name, { color: p.seat === net.seat ? C.white : C.light, origin: [0.5, 0] }).setScale(0.5);
      tag.setDepth(2000);
      this.objs.add(tag);
    }
    if (!p.connected) sp.setAlpha(0.4);
    this.avatars.set(p.seat, { sp, tag, x: p.x, y: p.y });
  }

  // ================================================================ keeping it current

  /** Everything that can change while the room stays the same. */
  private sync() {
    const st = net.state!;
    const f = st.floor!;
    const room = this.room()!;
    // furniture
    this.things.get('chest')?.setFrame(room.used ? 1 : 0);
    const fire = this.things.get('fire');
    if (fire) {
      if (room.used) fire.stop().setFrame(3);
      else if (!fire.anims.isPlaying) fire.play('rg_fire_burn');
    }
    if (room.cleared) {
      for (const sp of this.foeSprites) sp.destroy();
      this.foeSprites = [];
    }
    for (const p of st.players) {
      const a = this.avatars.get(p.seat);
      if (a) a.sp.setAlpha(p.connected ? 1 : 0.4);
    }
    this.syncPuzzle(f.puzzle);
    this.drawHud();
    this.reward.sync();
    if (this.shopC) this.drawShop();
  }

  private drawHud() {
    const st = net.state!;
    const f = st.floor!;
    const room = this.room()!;
    const me = net.me;
    const c = this.hud;
    c.removeAll(true);
    const g = this.add.graphics();
    c.add(g);
    const locked = !room.cleared && (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss');
    this.drawDoors(room, locked);
    // ---- where you are (a dark plate behind it: the room runs underneath)
    const nameW = Math.max(60, f.name.length * 8 + 8);
    g.fillStyle(C.black, 0.75).fillRect(0, 0, nameW, me ? 36 : 26);
    c.add(txt(this, 6, 4, `FLOOR ${f.index + 1}`, { color: C.mid }));
    c.add(txt(this, 6, 13, f.name, { outline: true }));
    if (me) c.add(txt(this, 6, 26, `WISPS ${me.wisps}`, { color: C.light }));
    // the bottom strip: your spirits and the room's hint, on black
    g.fillStyle(C.black, 1).fillRect(0, VIEW_H, W, H - VIEW_H);
    g.fillStyle(C.dark, 1).fillRect(0, VIEW_H, W, 1);
    this.drawMap(g, c);
    // ---- your spirits (number keys choose who steps out first)
    const by = VIEW_H + 4;
    if (me) {
      me.spirits.forEach((sp, i) => {
        const x = 6 + i * 96;
        box(g, x, by, 92, 26, 'plain');
        if (this.textures.exists('cr_' + sp.id)) c.add(this.add.image(x + 12, by + 25, 'cr_' + sp.id, 0).setOrigin(0.5, 1).setScale(0.38).setAlpha(sp.hp > 0 ? 1 : 0.35));
        // the name runs the whole width (MOURNINGBELL and STITCHWRAITH need all twelve letters)
        c.add(txt(this, x + 4, by + 3, spiritDef(sp.id).name.slice(0, 14), { color: i === 0 ? C.white : C.light }));
        bar(g, x + 26, by + 13, 40, 3, sp.hp, sp.hp, 0);
        c.add(txt(this, x + 88, by + 16, sp.hp <= 0 ? 'DOWN' : i === 0 ? '1ST' : `${i + 1}`, { color: i === 0 ? C.light : C.dark, origin: [1, 0] }));
        if (sp.skills.length) for (let k = 0; k < sp.skills.length; k++) g.fillStyle(C.light, 1).fillRect(x + 26 + k * 4, by + 19, 3, 3);
      });
    }
    // ---- the rest of the party, in brief
    const others = st.players.filter((p) => p.seat !== net.seat);
    others.forEach((p, i) => {
      const x = W - 96;
      const y = by + i * 9;
      c.add(txt(this, x, y, p.name.slice(0, 8), { color: p.connected ? C.light : C.dark }));
      const hp = p.spirits.length ? p.spirits.reduce((n, s) => n + s.hp, 0) / p.spirits.length : 0;
      bar(g, x + 52, y + 2, 38, 3, hp, hp, 0);
    });
    // ---- what this room is, and what to do in it
    const pz = f.puzzle;
    let line = '';
    if (pz && !pz.solved) line = pz.hint;
    else if (locked) line = room.kind === 'boss' ? 'SOMETHING VERY LARGE IS WAITING. WALK UP TO IT WHEN YOU ARE READY.' : 'THE DOORS ARE BARRED. WALK UP TO THE ENEMIES TO FIGHT.';
    else if (room.kind === 'treasure' && !room.used) line = 'A CHEST. SPACE: OPEN IT.';
    else if (room.kind === 'rest' && !room.used) line = 'A FIRE. SPACE: REST (ONCE, FOR EVERYONE).';
    else if (room.kind === 'shop') line = 'SPACE: TALK TO THE KEEPER.';
    else if (st.phase === 'reward' && !me?.reward) {
      const w = st.players.filter((p) => p.reward).map((p) => p.name);
      line = w.length ? `WAITING FOR ${w.join(', ')} TO CHOOSE${st.countdown ? ` (${st.countdown})` : ''}` : '';
    } else line = KIND_LABEL[room.kind] || (me && me.spirits.length > 1 ? 'WALK THROUGH A DOOR TO GO ON.  1-3: WHO FIGHTS FIRST' : 'WALK THROUGH A DOOR TO GO ON.');
    c.add(txt(this, W / 2, H - 11, line, { color: pz && !pz.solved ? C.light : C.mid, origin: [0.5, 0], maxW: W - 12, align: 'center' }));
    if (pz?.kind === 'timed' && pz.clock) c.add(txt(this, W / 2, OY + 6, String(pz.clock), { outline: true, origin: [0.5, 0], scale: 2 }));
  }

  /** The doors in the walls: open, or barred while the room is not clear. */
  private drawDoors(room: RoomPub, locked: boolean) {
    const c = this.doors;
    c.removeAll(true);
    const g = this.add.graphics();
    c.add(g);
    for (const d of DIRS) {
      if (room.doors[d] === undefined) continue;
      const [dx, dy] = DOOR_AT[d];
      const x = OX + dx * T;
      const y = OY + dy * T;
      if (d === 'n') c.add(this.add.image(x, y, 'rg_door', locked ? 1 : 0).setOrigin(0, 0));
      else {
        g.fillStyle(C.black, 1).fillRect(x, y, T, T);
        g.fillStyle(locked ? C.light : C.dark, 1);
        if (locked) for (let i = 2; i < T; i += 4) (d === 's' ? g.fillRect(x + i, y, 1, T) : g.fillRect(x, y + i, T, 1));
        else g.fillRect(d === 's' ? x : d === 'w' ? x + T - 2 : x, d === 's' ? y : y, d === 's' ? T : 2, d === 's' ? 2 : T);
      }
    }
  }

  /** The map: every room found so far, and what lies behind the doors you have seen. */
  private drawMap(g: Phaser.GameObjects.Graphics, c: Phaser.GameObjects.Container) {
    const f = net.state!.floor!;
    const CWd = 11;
    const CHt = 8;
    const known = f.rooms.filter((r) => r.seen || f.rooms.some((o) => o.seen && Object.values(o.doors).includes(r.id)));
    if (!known.length) return;
    const minX = Math.min(...known.map((r) => r.gx));
    const maxX = Math.max(...known.map((r) => r.gx));
    const minY = Math.min(...known.map((r) => r.gy));
    const maxY = Math.max(...known.map((r) => r.gy));
    const w = (maxX - minX + 1) * CWd;
    const x0 = W - 6 - w;
    const y0 = 4 + Math.max(0, (4 - (maxY - minY + 1)) * CHt * 0.5);
    g.fillStyle(C.black, 0.75).fillRect(x0 - 4, y0 - 3, w + 7, (maxY - minY + 1) * CHt + 5);
    for (const r of known) {
      const x = x0 + (r.gx - minX) * CWd;
      const y = y0 + (r.gy - minY) * CHt;
      const here = r.id === f.cur;
      // corridors to the rooms it opens onto
      g.fillStyle(C.dark, 1);
      for (const d of DIRS) {
        if (r.doors[d] === undefined || !r.seen) continue;
        const [dx, dy] = DELTA[d];
        g.fillRect(x + 4 + dx * 5, y + 3 + dy * 4, dx ? 3 : 1, dy ? 2 : 1);
      }
      g.fillStyle(here ? C.white : r.seen ? (r.cleared ? C.mid : C.light) : C.black, 1).fillRect(x, y, CWd - 2, CHt - 2);
      if (!r.seen) {
        g.fillStyle(C.mid, 1);
        g.fillRect(x, y, CWd - 2, 1);
        g.fillRect(x, y + CHt - 3, CWd - 2, 1);
        g.fillRect(x, y, 1, CHt - 2);
        g.fillRect(x + CWd - 3, y, 1, CHt - 2);
      }
      const icon = MAP_ICONS[r.kind];
      if (icon) {
        g.fillStyle(here || r.seen ? C.black : C.light, 1);
        icon.forEach((row, j) => {
          for (let i = 0; i < 5; i++) if (row[i] === '4') g.fillRect(x + 2 + i, y + 0.5 + j, 1, 1);
        });
      } else if (r.risky && !r.cleared) {
        // a marked room: harder than most
        g.fillStyle(here || r.seen ? C.black : C.light, 1).fillRect(x + 4, y + 2, 1, 2);
      }
    }
    void c;
  }

  // ================================================================ puzzles

  private buildPuzzle(pz: PuzzleState | null) {
    if (!pz) return;
    pz.plates?.forEach(([x, y], i) => this.tiles.add(this.thingFlat(`plate${i}`, 'rg_plate', x, y)));
    pz.tiles?.forEach(([x, y], i) => this.tiles.add(this.thingFlat(`sym${i}`, 'rg_sym', x, y, i * 2)));
    pz.switches?.forEach(([x, y], i) => this.tiles.add(this.thingFlat(`sw${i}`, 'rg_switch', x, y)));
    pz.blocks?.forEach(([x, y], i) => this.thing(`block${i}`, 'rg_block', x, y));
    if (pz.obelisk) this.thing('obelisk', 'rg_obelisk', pz.obelisk[0], pz.obelisk[1]);
    pz.lampAt?.forEach(([x, y], i) => this.thing(`lamp${i}`, 'rg_lamp', x, y));
    pz.mirrors?.forEach((m, i) => this.thing(`mirror${i}`, 'rg_mirror', m.x, m.y));
    if (pz.emitter) this.thing('emitter', 'rg_emitter', pz.emitter.x, pz.emitter.y);
    if (pz.crystal) this.thing('crystal', 'rg_crystal', pz.crystal[0], pz.crystal[1]);
  }

  /** Things that lie flat on the floor (plates, symbols, switches) are part of it, not standing on it. */
  private thingFlat(id: string, key: string, x: number, y: number, frame = 0) {
    const sp = this.add.sprite(OX + x * T, OY + y * T, key, frame).setOrigin(0, 0);
    this.things.set(id, sp);
    return sp;
  }

  private syncPuzzle(pz: PuzzleState | null) {
    this.beamG.clear();
    if (!pz) return;
    const at = (x: number, y: number) => [...this.avatars.values()].some((a) => a.x === x && a.y === y);
    pz.plates?.forEach(([x, y], i) => this.things.get(`plate${i}`)?.setFrame(pz.solved || at(x, y) || pz.blocks!.some((b) => b[0] === x && b[1] === y) ? 1 : 0));
    pz.blocks?.forEach(([x, y], i) => {
      const sp = this.things.get(`block${i}`);
      if (!sp) return;
      const tx = this.px(x);
      const ty = this.py(y);
      if (sp.x !== tx || sp.y !== ty) {
        this.tweens.add({ targets: sp, x: tx, y: ty, duration: 110, onUpdate: () => sp.setDepth(sp.y) });
        sound.play('stone');
      }
    });
    if (pz.tiles && !this.showing) pz.tiles.forEach((_, i) => this.things.get(`sym${i}`)?.setFrame(i * 2 + (pz.solved || (pz.order!.slice(0, pz.progress).includes(i) && !!pz.shown) ? 1 : 0)));
    pz.lamps?.forEach((on, i) => this.things.get(`lamp${i}`)?.setFrame(on ? 1 : 0));
    pz.mirrors?.forEach((m, i) => this.things.get(`mirror${i}`)?.setFrame(m.o));
    pz.switches?.forEach((_, i) => this.things.get(`sw${i}`)?.setFrame(pz.pressed![i] || pz.solved ? 1 : 0));
    this.things.get('crystal')?.setFrame(pz.solved ? 1 : 0);
    if (pz.beam && pz.beam.length > 1) {
      this.beamG.lineStyle(2, C.white, 0.9);
      this.beamG.beginPath();
      pz.beam.forEach(([x, y], i) => {
        const X = OX + x * T + T / 2;
        const Y = OY + y * T + T / 2 - 2;
        if (i) this.beamG.lineTo(X, Y);
        else this.beamG.moveTo(X, Y);
      });
      this.beamG.strokePath();
    }
  }

  /** The obelisk plays the order back: the symbols light one after another. */
  private async playSequence() {
    const pz = net.state?.floor?.puzzle;
    if (!pz?.tiles || !pz.order || this.showing) return;
    this.showing = true;
    pz.tiles.forEach((_, i) => this.things.get(`sym${i}`)?.setFrame(i * 2));
    for (const i of pz.order) {
      await new Promise((r) => this.time.delayedCall(180, r));
      const sp = this.things.get(`sym${i}`);
      if (!sp?.active) break;
      sp.setFrame(i * 2 + 1);
      sound.play('chime');
      await new Promise((r) => this.time.delayedCall(430, r));
      if (sp.active) sp.setFrame(i * 2);
    }
    this.showing = false;
    if (!this.leaving) this.syncPuzzle(net.state?.floor?.puzzle ?? null);
  }

  // ================================================================ moving about

  update(_t: number, dt: number) {
    if (this.leaving || this.fading) return;
    this.doorWait = Math.max(0, this.doorWait - dt);
    if (this.moving || this.blocked()) return;
    for (const d of DIRS) if (this.keysDown[d].some((k) => k.isDown)) return this.tryMove(d);
  }

  /** Something is in front of the room: a reward, the shop, the floor's title. */
  private blocked() {
    return this.reward.open || !!this.shopC || !!this.cardC || !!this.devC || net.state?.phase !== 'dungeon';
  }

  private solid(x: number, y: number): boolean {
    const f = net.state!.floor!;
    const room = this.room()!;
    if (f.puzzle) return puzzleBlocked(f.puzzle, x, y);
    return !walkable(roomTemplate(room), x, y);
  }

  private tryMove(d: Dir) {
    const room = this.room();
    const me = this.avatars.get(net.seat);
    if (!room || !me) return;
    this.mdir = d;
    me.sp.setFrame(FACE[d]).setFlipX(d === 'e');
    const [dx, dy] = DELTA[d];
    const tx = this.mx + dx;
    const ty = this.my + dy;
    // ---- through a door
    const [ex, ey] = DOOR_AT[d];
    if (tx === ex && ty === ey && room.doors[d] !== undefined) {
      if (this.doorWait > 0) return;
      this.doorWait = 500;
      if (!room.cleared && (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss')) {
        sound.play('locked');
        return this.toast('THE DOORS ARE BARRED UNTIL THE ROOM IS CLEAR.');
      }
      sound.play('door');
      return net.send({ t: 'door', dir: d });
    }
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return;
    // ---- a block to push
    const pz = net.state!.floor!.puzzle;
    if (pz?.blocks?.some((b) => b[0] === tx && b[1] === ty)) {
      if (this.doorWait > 0) return;
      this.doorWait = 160;
      return net.send({ t: 'push', x: tx, y: ty, dir: d });
    }
    if (this.solid(tx, ty)) return;
    this.mx = tx;
    this.my = ty;
    this.moving = true;
    net.send({ t: 'pos', x: tx, y: ty, dir: d });
    const step = ((me.x + me.y) & 1) + 1;
    me.sp.setFrame(FACE[d] + step);
    me.x = tx;
    me.y = ty;
    this.tweens.add({
      targets: me.sp,
      x: this.px(tx),
      y: this.py(ty),
      duration: STEP_MS,
      onUpdate: () => {
        me.sp.setDepth(me.sp.y + 1);
        me.tag?.setPosition(me.sp.x, me.sp.y - 27);
      },
      onComplete: () => {
        this.moving = false;
        me.sp.setFrame(FACE[d]);
        this.arrived();
      },
    });
  }

  /** Close enough to the enemies, and the fight begins. */
  private arrived() {
    const room = this.room();
    if (!room) return;
    if (net.state?.floor?.puzzle) this.syncPuzzle(net.state.floor.puzzle);
    if (this.engaged || room.cleared || !this.foeSprites.length) return;
    const near = this.foeSprites.some((sp) => Math.abs(sp.x - this.px(this.mx)) <= T * 2.2 && Math.abs(sp.y - this.py(this.my)) <= T * 2.2);
    if (!near) return;
    this.engaged = true;
    sound.play('charge');
    net.send({ t: 'engage' });
  }

  private onPos(seat: number, x: number, y: number, dir: Dir) {
    const a = this.avatars.get(seat);
    if (!a) return;
    if (seat === net.seat) {
      // the host did not accept the step: back to where it says we are
      this.mx = x;
      this.my = y;
      this.tweens.killTweensOf(a.sp);
      this.moving = false;
    }
    a.x = x;
    a.y = y;
    a.sp.setFrame(FACE[dir] + 1).setFlipX(dir === 'e');
    this.tweens.add({
      targets: a.sp,
      x: this.px(x),
      y: this.py(y),
      duration: STEP_MS,
      onUpdate: () => {
        a.sp.setDepth(a.sp.y + 1);
        a.tag?.setPosition(a.sp.x, a.sp.y - 27);
      },
      onComplete: () => a.sp.active && a.sp.setFrame(FACE[dir]),
    });
    if (net.state?.floor?.puzzle) this.syncPuzzle(net.state.floor.puzzle);
  }

  private onFx(kind: string, _seat: number, text: string) {
    if (text) this.toast(text);
    if (kind === 'wrong') {
      sound.play('wrong');
      this.cameras.main.shake(160, 0.004);
    } else if (kind === 'right') sound.play('right');
    else if (kind === 'solved') {
      sound.play('quest');
      this.cameras.main.flash(250, 255, 255, 255);
    } else if (kind === 'heal') sound.play('heal');
    else if (kind === 'chest') sound.play('unlock');
    else if (kind === 'buy') sound.play('register');
    else if (kind === 'show') void this.playSequence();
  }

  // ================================================================ keys

  /** The backquote key opens the developer shortcuts (solo runs only). */
  protected typing(e: KeyboardEvent): boolean {
    if (e.key !== '`' || !net.state?.solo) return false;
    if (this.devC) this.closeDev();
    else if (net.state.phase === 'dungeon' && !this.reward.open) {
      this.devC = this.add.container(0, 0).setDepth(500);
      this.drawDev();
    }
    return true;
  }

  protected key(k: Key, e: KeyboardEvent) {
    if (this.devC) return this.devKey(k);
    if (this.reward.key(k)) return;
    if (this.cardC) return;
    if (this.shopC) return this.shopKey(k);
    if (net.state?.phase !== 'dungeon') return;
    // who steps out first
    const n = Number(e.key);
    if (n >= 1 && n <= 3 && net.me?.spirits[n - 1] && n > 1) {
      sound.play('select');
      return net.send({ t: 'lead', spirit: n - 1 });
    }
    if (k === 'ok') this.interact();
  }

  /** SPACE: whatever is in front of you. */
  private interact() {
    const room = this.room();
    const f = net.state?.floor;
    if (!room || !f || this.moving) return;
    const [dx, dy] = DELTA[this.mdir];
    const fx = this.mx + dx;
    const fy = this.my + dy;
    const pz = f.puzzle;
    if (pz) {
      if (pz.solved) return;
      if (pz.obelisk && pz.obelisk[0] === fx && pz.obelisk[1] === fy) return net.send({ t: 'use', what: 'obelisk' });
      const li = pz.lampAt?.findIndex((p) => p[0] === fx && p[1] === fy) ?? -1;
      if (li >= 0) return net.send({ t: 'use', what: 'lamp', i: li });
      const mi = pz.mirrors?.findIndex((m) => m.x === fx && m.y === fy) ?? -1;
      if (mi >= 0) return net.send({ t: 'use', what: 'mirror', i: mi });
      return;
    }
    const tpl = roomTemplate(room);
    const ch = tpl[fy]?.[fx];
    if (ch === 'C' && !room.used) return net.send({ t: 'use', what: 'chest' });
    if (ch === 'F' && !room.used) return net.send({ t: 'use', what: 'fire' });
    if (ch === 'S') return this.openShop();
    if (!room.cleared && this.foeSprites.length && !this.engaged) {
      const near = this.foeSprites.some((sp) => Math.abs(sp.x - this.px(this.mx)) <= T * 3.2 && Math.abs(sp.y - this.py(this.my)) <= T * 3.2);
      if (near) {
        this.engaged = true;
        net.send({ t: 'engage' });
      }
    }
  }

  // ================================================================ the keeper's shop

  private openShop() {
    this.shopSel = 0;
    this.shopC = this.add.container(0, 0).setDepth(200);
    sound.play('select');
    this.drawShop();
  }

  private closeShop() {
    this.shopC?.destroy();
    this.shopC = null;
  }

  private shopState(item: ShopItem): string {
    const me = net.me!;
    if (me.bought.includes(item)) return 'SOLD';
    if (item === 'tonic' && me.spirits.every((s) => s.hp <= 0 || s.hp >= 1)) return 'NOBODY NEEDS IT';
    if (item === 'revive' && me.spirits.every((s) => s.hp > 0)) return 'NOBODY IS DOWN';
    if (me.wisps < SHOP[item].cost) return 'NOT ENOUGH WISPS';
    return '';
  }

  private drawShop() {
    const c = this.shopC;
    const me = net.me;
    if (!c || !me) return;
    c.removeAll(true);
    const g = this.add.graphics();
    c.add(g);
    g.fillStyle(C.black, 0.7).fillRect(0, 0, W, H);
    const pw = 300;
    const px0 = (W - pw) / 2;
    const py0 = 50;
    box(g, px0, py0, pw, 190, 'dark');
    c.add(txt(this, W / 2, py0 + 8, 'THE WANDERING KEEPER', { outline: true, origin: [0.5, 0] }));
    c.add(txt(this, W / 2, py0 + 21, `YOU HAVE ${me.wisps} WISPS`, { color: C.light, origin: [0.5, 0] }));
    SHOP_ITEMS.forEach((id, i) => {
      const it = SHOP[id];
      const y = py0 + 36 + i * 40;
      const on = this.shopSel === i;
      const why = this.shopState(id);
      box(g, px0 + 10, y, pw - 20, 36, on ? 'light' : 'plain');
      c.add(txt(this, px0 + 18, y + 5, it.name, { color: on ? C.black : why ? C.mid : C.white }));
      c.add(txt(this, px0 + pw - 18, y + 5, why || `${it.cost} WISPS`, { color: on ? C.dark : why ? C.dark : C.light, origin: [1, 0] }));
      c.add(txt(this, px0 + 18, y + 16, it.desc, { color: on ? C.dark : C.mid, maxW: pw - 40 }));
    });
    const on = this.shopSel === SHOP_ITEMS.length;
    box(g, W / 2 - 40, py0 + 160, 80, 14, on ? 'light' : 'dark');
    c.add(txt(this, W / 2, py0 + 164, 'LEAVE', { origin: [0.5, 0], color: on ? C.black : C.light }));
    c.add(txt(this, W / 2, py0 + 178, 'EACH THING ONCE PER FLOOR', { color: C.dark, origin: [0.5, 0] }));
  }

  private shopKey(k: Key) {
    const n = SHOP_ITEMS.length + 1;
    if (k === 'up' || k === 'down') {
      this.shopSel = (this.shopSel + (k === 'up' ? -1 : 1) + n) % n;
      sound.play('move');
      return this.drawShop();
    }
    if (k === 'back') {
      sound.play('back');
      return this.closeShop();
    }
    if (k !== 'ok') return;
    if (this.shopSel === SHOP_ITEMS.length) {
      sound.play('back');
      return this.closeShop();
    }
    const item = SHOP_ITEMS[this.shopSel];
    if (this.shopState(item)) return void sound.play('deny');
    net.send({ t: 'buy', item });
    // a relic opens the skill choice straight away
    if (item === 'skill') this.closeShop();
  }

  // ================================================================ developer shortcuts (solo)

  private devRows(): { text: string; run: () => void }[] {
    const dev = (cmd: 'room' | 'boss' | 'floor' | 'wisps' | 'heal' | 'weak' | 'reaper', arg?: string) => () => {
      net.send({ t: 'dev', cmd, arg });
      this.closeDev();
    };
    const floor = net.state?.floor?.index ?? 0;
    const pool = BOSSES.filter((b) => b.floors.includes(Math.min(1, floor)));
    const boss = pool[this.devBoss % pool.length];
    return [
      ...(['combat', 'elite', 'treasure', 'rest', 'shop'] as const).map((k) => ({ text: `GO TO: ${k.toUpperCase()} ROOM`, run: dev('room', k) })),
      ...(['plates', 'sequence', 'lights', 'mirrors', 'timed'] as const).map((k) => ({ text: `GO TO PUZZLE: ${k.toUpperCase()}`, run: dev('room', k) })),
      { text: floor < 2 ? `GO TO BOSS: < ${boss.def.name} >` : 'GO TO BOSS ROOM (THE REAPER)', run: dev('boss', floor < 2 ? boss.id : '') },
      ...[0, 1, 2].map((n) => ({ text: `START FLOOR ${n + 1}`, run: dev('floor', String(n)) })),
      ...(floor === 2 ? [0, 1, 2, 3].map((n) => ({ text: `REAPER: FIGHT ${n + 1} OF 4`, run: dev('reaper', String(n)) })) : []),
      { text: 'ENEMIES START NEARLY DEAD (TOGGLE)', run: dev('weak') },
      { text: '+100 WISPS', run: dev('wisps') },
      { text: 'FULL HEAL', run: dev('heal') },
      { text: 'CLOSE', run: () => this.closeDev() },
    ];
  }

  private closeDev() {
    this.devC?.destroy();
    this.devC = null;
  }

  private drawDev() {
    const c = this.devC;
    if (!c) return;
    c.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    c.add(g);
    c.add(txt(this, 8, 6, 'ROGUELIKE TEST SHORTCUTS (SOLO RUNS ONLY)', { color: C.white }));
    const rows = this.devRows();
    rows.forEach((r, i) => c.add(txt(this, 8, 20 + i * 10, (i === this.devSel ? '> ' : '  ') + r.text, { color: i === this.devSel ? C.white : C.light })));
    c.add(txt(this, 8, H - 10, 'UP/DOWN: MOVE   LEFT/RIGHT: CHANGE BOSS   SPACE: GO   `: CLOSE', { color: C.dark }));
  }

  private devKey(k: Key) {
    const rows = this.devRows();
    if (k === 'up' || k === 'down') this.devSel = (this.devSel + (k === 'up' ? -1 : 1) + rows.length) % rows.length;
    else if (k === 'left' || k === 'right') this.devBoss = (this.devBoss + (k === 'left' ? -1 : 1) + 100) % 100;
    else if (k === 'ok') return rows[this.devSel].run();
    else if (k === 'back') return this.closeDev();
    this.drawDev();
  }

  // ================================================================ arriving on a floor

  private floorCard(index: number) {
    const st = net.state!;
    const c = this.add.container(0, 0).setDepth(400);
    this.cardC = c;
    const g = this.add.graphics();
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    c.add(g);
    const a = txt(this, W / 2, H / 2 - 30, `FLOOR ${index + 1}`, { color: C.mid, origin: [0.5, 0] });
    const b = txt(this, W / 2, H / 2 - 16, FLOOR_NAMES[index], { outline: true, origin: [0.5, 0], scale: 2 });
    const d = txt(this, W / 2, H / 2 + 14, index === 2 ? 'HE IS WAITING AT THE END OF IT.' : `${DIFFICULTY[st.difficulty].name} DIFFICULTY`, { color: C.light, origin: [0.5, 0] });
    c.add([a, b, d]);
    b.setAlpha(0);
    d.setAlpha(0);
    sound.play('quest');
    this.tweens.add({ targets: b, alpha: 1, duration: 500, delay: 200 });
    this.tweens.add({ targets: d, alpha: 1, duration: 500, delay: 700 });
    this.time.delayedCall(2100, () => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          c.destroy();
          this.cardC = null;
        },
      });
    });
  }
}
