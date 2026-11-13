import Phaser from 'phaser';
import { GBPipeline } from '../gfx/GBPipeline';
import { W, H } from '../constants';
import { getMap, ALL_MAPS } from '../world/maps';
import { DIRV, OPP, blockedStatic, reachAcross, warpAt, type Dir, type MapDef, type NpcDef, type PropDef } from '../world/mapdef';
import { T, D } from '../world/tiles';
import { PROP_META } from '../gfx/artProps';
import { loadState, newState, saveState, clearState, ITEMS, partyOf, isDevSession, setDevSession, type StoryState } from '../story/state';
import { DevMenu } from './world/DevMenu';
import { checkpointState, type Checkpoint, type Guardian } from '../dev/checkpoints';
import { SCRIPTS, GATES, type WorldAPI } from '../story/scripts';
import { w2Music } from '../story/w2_state';
import { w3Music, w3Dark, w3ClubDark } from '../story/w3_state';
import { w4Music, w4Dark } from '../story/w4_state';
import { w5Music } from '../story/w5_state';
import { isSpirit, type SpiritId } from '../engine/spirits';
import { Dialog, type SayOpts } from './world/Dialog';
import { PauseMenu } from './world/PauseMenu';
import { sound } from '../audio/audio';
import { settings } from '../settings';
import { C, box, txt, teardownLayers } from '../ui/ui';

// The overworld: Hollowhaven and everything inside it.

const ZOOM = 2;
/** side-view sprites drawn facing left: mirror them to face right */
const FLIP_RIGHT = new Set(['rickbike', 'heli', 'subside', 'ow_wispmane', 'ow_viperwind', 'ow_champion', 'ow_crow', 'ow_squirrel', 'ow_flamora', 'ow_reaper', 'w4_cat', 'w4_ship', 'ow_skelwarden']);
const STEP_MS = 230;
const RUN_MS = 130;

/** A walking character on the tile grid (player, follower or NPC). */
class Actor {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  dir: Dir;
  moving = false;
  sheet: string;
  big: boolean;
  def?: NpcDef;
  step = 0;
  private s: WorldScene;
  hidden = false;
  /** When it last arrived on a tile (followers idle after standing still a moment). */
  stillSince = 0;
  private idleF = -1;

  constructor(s: WorldScene, key: string, x: number, y: number, dir: Dir, big = false, def?: NpcDef) {
    this.s = s;
    this.sheet = key;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.big = big;
    this.def = def;
    this.sprite = s.add.sprite(0, 0, key, 0).setOrigin(0.5, 1);
    s.worldLayer.add(this.sprite);
    if (big && s.anims.exists(`${key}_idle`)) this.sprite.play(`${key}_idle`);
    this.place();
    this.face(dir);
  }

  get directional() {
    return this.sheet.startsWith('ch_');
  }

  place() {
    this.sprite.setPosition(this.x * 16 + 8, this.y * 16 + 16);
    this.sprite.setDepth(this.sprite.y);
  }

  face(d: Dir) {
    this.dir = d;
    if (!this.directional) {
      if (d === 'left' || d === 'right') this.sprite.setFlipX(d === 'left' ? this.sheet === 'cr_shipwraith' : FLIP_RIGHT.has(this.sheet));
      return;
    }
    const base = d === 'down' ? 0 : d === 'up' ? 3 : 6;
    this.sprite.setFrame(base);
    this.sprite.setFlipX(d === 'right');
  }

  frameFor(f: number) {
    if (!this.directional) return;
    const base = this.dir === 'down' ? 0 : this.dir === 'up' ? 3 : 6;
    this.sprite.setFrame(base + f);
  }

  /** Move one tile. Resolves on arrival. */
  walk(d: Dir, ms: number): Promise<void> {
    this.face(d);
    const [dx, dy] = DIRV[d];
    this.x += dx;
    this.y += dy;
    this.moving = true;
    this.step++;
    this.frameFor(this.step % 2 ? 1 : 2);
    return new Promise((res) => {
      this.s.tweens.add({
        targets: this.sprite,
        x: this.x * 16 + 8,
        y: this.y * 16 + 16,
        duration: ms,
        onUpdate: () => this.sprite.setDepth(this.sprite.y),
        onComplete: () => {
          this.moving = false;
          this.stillSince = this.s.time.now;
          this.idleF = 0;
          this.frameFor(0);
          this.sprite.setDepth(this.sprite.y);
          res();
        },
      });
    });
  }

  /** A dancer's beat: turn, step, bounce. Everyone keeps their own rhythm. */
  dance(beat: number) {
    const k = (beat + this.x * 3 + this.y) % 4;
    this.face((['down', 'left', 'down', 'right'] as Dir[])[k]);
    this.frameFor(k % 2 ? 1 : 2);
    this.sprite.y = this.y * 16 + 16 - (k % 2 ? 2 : 0);
  }

  /**
   * A gentle idle for a companion standing still: stay on the rest frame and breathe (a slow
   * one-pixel bob). Never a walking frame, which looked like stepping on the spot.
   */
  idle(now: number) {
    if (this.moving || !this.directional) return;
    const t = now - this.stillSince;
    const f = t < 450 ? 0 : Math.floor((t - 450) / 700) % 2;
    if (f === this.idleF) return;
    this.idleF = f;
    this.frameFor(0);
    this.sprite.y = this.y * 16 + 16 - f;
  }

  destroy() {
    this.sprite.destroy();
  }
}

interface LiveLight {
  x: number;
  y: number;
  r: number;
  flicker: number;
  on: boolean;
  k: number;
}

export class WorldScene extends Phaser.Scene implements WorldAPI {
  st!: StoryState;
  map!: MapDef;
  worldLayer!: Phaser.GameObjects.Layer;
  uiLayer!: Phaser.GameObjects.Layer;
  uiCam!: Phaser.Cameras.Scene2D.Camera;
  gb!: GBPipeline;
  private tm?: Phaser.Tilemaps.Tilemap;
  private sea?: Phaser.GameObjects.TileSprite;
  private seaF = 0;
  private seaN = 0;
  private props: { def: PropDef; img: Phaser.GameObjects.Image }[] = [];
  actors = new Map<string, Actor>();
  player!: Actor;
  follower: Actor | null = null;
  /** World 2: the temple creature walks behind the first spirit */
  follower2: Actor | null = null;
  /** World 2: the inventor walks at the back of the line */
  companion: Actor | null = null;
  /** Puzzles decide where a pushed object may go ('ok', 'no', or a custom verdict like 'pit'). */
  pushRule: ((id: string, x: number, y: number) => string) | null = null;
  onPushed: ((id: string, x: number, y: number, verdict: string) => void) | null = null;
  private danceT = 0;
  private danceBeat = 0;
  /** Timed free play (the escape): the story ticks this each frame until it returns a result. */
  private free: { tick: (dt: number) => string | null; done: (r: string) => void } | null = null;
  /** Movement locked until this time (knocked down by a falling rock). */
  frozenUntil = 0;
  /** Override how long a step takes onto a tile (wading through floodwater). */
  stepMs: ((x: number, y: number, run: boolean) => number) | null = null;
  private dark!: Phaser.GameObjects.RenderTexture;
  private stamp!: Phaser.GameObjects.Image;
  darkAlpha = 0;
  private liveLights: LiveLight[] = [];
  extraLights: { x: number; y: number; r: number }[] = [];
  private lightsDisabled = false;
  playerLight = true;
  private fogs: Phaser.GameObjects.Image[] = [];
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  dialog!: Dialog;
  /** Set by a story screen that wants raw button presses while it is up. */
  keyHook: ((b: 'a' | 'b' | 'start' | Dir) => void) | null = null;
  /** Set by a story sequence: one song for every map it visits (never saved). */
  musicOverride: string | null = null;
  /** Called every frame while the player has normal control (the prison's patrols). Cleared on every map load. */
  onTick: ((dt: number) => void) | null = null;
  private menu!: PauseMenu;
  busy = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private held: Dir | null = null;
  private heldSince = 0;
  private lastBump = 0;
  private stepping = false;
  /** scripts currently running (a trigger can fire while a script is mid-flight) */
  private running = 0;
  private wanderTimer = 0;
  private saveTimer = 0;
  private pad?: Phaser.GameObjects.Container;
  private padDir: Dir | null = null;
  private padRun = false;
  private fishing = false;
  private camLocked = false;
  private camStuck = 0;
  private flashAmt = 0;
  private entryData: any;
  /** The hidden developer test menu (D, E, V with the pause menu open) */
  private devMenu!: DevMenu;
  private devKeys = '';
  /** Was this scene started inside a developer test session? It only ever saves to that session's slot. */
  private devScene = false;
  private lightTimer = 0;

  constructor() {
    super('world');
  }

  init(data: any) {
    this.entryData = data ?? {};
    this.musicOverride = null;
    this.actors = new Map();
    this.props = [];
    this.liveLights = [];
    this.extraLights = [];
    this.fogs = [];
    this.follower = null;
    this.follower2 = null;
    this.companion = null;
    this.pushRule = null;
    this.onPushed = null;
    this.chaseState = null;
    this.free = null;
    this.frozenUntil = 0;
    this.stepMs = null;
    this.stepping = false;
    this.running = 0;
    this.busy = false;
    this.camLocked = false;
    this.fishing = false;
    this.playerLight = true;
  }

  // ================================================================ setup

  create() {
    const main = this.cameras.main;
    main.setPostPipeline(GBPipeline);
    const pp = main.getPostPipeline(GBPipeline);
    this.gb = (Array.isArray(pp) ? pp[0] : pp) as GBPipeline;
    main.setZoom(ZOOM);
    main.setBackgroundColor('#000000');
    this.uiCam = this.cameras.add(0, 0, W, H);
    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer().setDepth(100);
    this.worldLayer.cameraFilter |= this.uiCam.id;
    this.uiLayer.cameraFilter |= main.id;

    this.dialog = new Dialog(this, (o) => this.ui(o));
    this.menu = new PauseMenu(
      this,
      (o) => this.ui(o),
      () => this.st,
      () => this.minimapInfo(),
      () => this.newGamePrompt(),
      () => (this.busy = false)
    );
    this.menu.onEndTest = () => this.endDevTest();
    this.devMenu = new DevMenu(
      this,
      (o) => this.ui(o),
      (cp, picks, g) => this.startDevTest(cp, picks, g),
      () => {}
    );
    // a new main companion steps to the front of the line
    this.menu.onParty = () => {
      this.spawnFollower();
      this.spawnFollower2();
      this.spawnCompanion();
      this.save();
    };
    this.buildMinimap();
    this.buildPad();
    this.setupInput();

    this.devScene = isDevSession();
    this.devKeys = '';
    const saved: StoryState | null = this.entryData.devState ?? loadState();
    this.st = saved ?? newState();
    const fresh = !saved;
    const m = this.entryData.map ? this.entryData : this.st;
    this.loadMap(m.map, m.x, m.y, m.dir ?? 'down');
    main.fadeIn(600, 0, 0, 0);
    this.uiCam.fadeIn(600, 0, 0, 0);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown');
      this.input.off('pointerdown');
    });

    if (this.entryData.battle) {
      const { enemy, result } = this.entryData.battle;
      this.time.delayedCall(50, () => this.run('after_' + enemy, result));
    } else if (this.entryData.script) this.time.delayedCall(60, () => this.run(this.entryData.script));
    else if (fresh) this.time.delayedCall(400, () => this.run('intro'));
    else
      this.time.delayedCall(300, () => {
        // a cutscene interrupted by closing the game picks up again here
        if (SCRIPTS['resume_' + this.map.id]) this.run('resume_' + this.map.id);
        else if (SCRIPTS['resume_world' + (this.map.world ?? 1)]) this.run('resume_world' + (this.map.world ?? 1));
      });
    // back from a developer test: the real game, with its menu open where you left it
    if (this.entryData.openMenu)
      this.time.delayedCall(400, () => {
        if (this.busy || this.dialog.active) return;
        this.busy = true;
        this.menu.show();
      });
    (window as any).__world = this;
  }

  ui<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.uiLayer.add(o);
    (o as any).cameraFilter |= this.cameras.main.id;
    return o;
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      shift: K.SHIFT,
      x: K.X,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => {
      const k = e.key;
      if (this.devMenu.open) {
        if (k === 'Tab' || k === ' ') e.preventDefault();
        this.devMenu.key(k);
        return;
      }
      // D, E, V typed in order while the pause menu is open: the hidden developer menu
      const l = k.length === 1 ? k.toLowerCase() : '';
      if (this.menu.open && !this.dialog.active && (l === 'd' || l === 'e' || l === 'v')) {
        this.devKeys = (this.devKeys + l).slice(-3);
        if (this.devKeys === 'dev') {
          this.devKeys = '';
          this.devMenu.show();
          return;
        }
      } else this.devKeys = '';
      const A = k === 'z' || k === 'Z' || k === 'Enter' || k === ' ';
      const B = k === 'x' || k === 'X' || k === 'Backspace';
      const START = k === 'Escape' || k === 'm' || k === 'M' || k === 'Tab';
      const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, Dir>)[k];
      if (k === 'Tab') e.preventDefault();
      this.press(A ? 'a' : B ? 'b' : START ? 'start' : dir ? dir : null);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.devMenu.open && dy) this.devMenu.move(dy > 0 ? 1 : -1);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.devMenu.open) return this.devMenu.pointer(p.x, p.y);
      if (this.pad && this.pad.visible && p.y > H - 110 && (p.x < 120 || p.x > W - 120)) return;
      if (this.dialog.active) this.dialog.pointer(p.x, p.y);
      else if (this.menu.open) this.menu.pointer(p.x, p.y);
    });
  }

  /** Discrete button presses (keyboard and touch pad). */
  press(b: 'a' | 'b' | 'start' | Dir | null) {
    if (!b) return;
    sound.unlock();
    // a story screen (like choosing a spirit) can take the buttons for itself
    if (this.keyHook && !this.dialog.active) {
      this.keyHook(b);
      return;
    }
    if (this.dialog.active) {
      if (b === 'a') this.dialog.advance();
      else if (b === 'b') this.dialog.back();
      else if (b === 'up') this.dialog.move(-1);
      else if (b === 'down') this.dialog.move(1);
      return;
    }
    if (this.menu.open) {
      if (b === 'a') this.menu.onKey('a');
      else if (b === 'b' || b === 'start') this.menu.onKey('b');
      else if (b === 'up' || b === 'down' || b === 'left' || b === 'right') this.menu.onKey(b);
      return;
    }
    if (this.fishing && b === 'a') {
      this.fishHit = true;
      return;
    }
    if (this.busy || this.player.moving) return;
    if (b === 'a' && this.free) return;
    if (b === 'a') this.interact();
    else if (b === 'start') {
      this.busy = true;
      this.menu.show();
    }
  }

  private buildPad() {
    const touch = this.sys.game.device.input.touch;
    const c = this.ui(this.add.container(0, 0)).setDepth(40);
    this.pad = c;
    c.setVisible(!!touch);
    const g = this.add.graphics();
    c.add(g);
    const cx = 52;
    const cy = H - 52;
    g.fillStyle(C.black, 0.5).fillCircle(cx, cy, 40);
    g.fillStyle(C.white, 0.25);
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ])
      g.fillRect(cx + dx * 22 - 10, cy + dy * 22 - 10, 20, 20);
    g.fillStyle(C.white, 0.3).fillCircle(W - 40, H - 62, 18).fillCircle(W - 82, H - 38, 14);
    g.fillStyle(C.white, 0.2).fillRect(W / 2 - 22, H - 14, 44, 10);
    c.add(txt(this, W - 43, H - 66, 'A', { color: C.black }));
    c.add(txt(this, W - 85, H - 42, 'B', { color: C.black }));
    c.add(txt(this, W / 2 - 15, H - 13, 'MENU', { color: C.black }));
    const dirAt = (x: number, y: number): Dir | null => {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.hypot(dx, dy) > 52 || Math.hypot(dx, dy) < 8) return null;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!c.visible) return;
      const d = dirAt(p.x, p.y);
      if (d) {
        this.padDir = d;
        if (this.dialog.active || this.menu.open) this.press(d);
      } else if (Math.hypot(p.x - (W - 40), p.y - (H - 62)) < 22) this.press('a');
      else if (Math.hypot(p.x - (W - 82), p.y - (H - 38)) < 18) {
        this.padRun = true;
        this.press('b');
      } else if (Math.abs(p.x - W / 2) < 26 && p.y > H - 18) this.press('start');
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (c.visible && p.isDown && this.padDir) this.padDir = dirAt(p.x, p.y) ?? this.padDir;
    });
    this.input.on('pointerup', () => {
      this.padDir = null;
      this.padRun = false;
    });
  }

  private buildMinimap() {
    // painted on demand, per world (see minimapInfo)
  }

  /** Which map the pause menu shows: the world's main map (with you on it), or the floor you are on in the prison. */
  private minimapInfo() {
    const MAIN: Record<number, [string, string]> = { 1: ['town', 'HOLLOWHAVEN'], 2: ['isl', 'SALTWASH ISLAND'], 3: ['w3_isl', 'BACCHUS KEY'], 4: ['w4_isl', 'THE FORGOTTEN ISLAND'] };
    const m = this.map;
    const world = m?.world ?? 1;
    const main = MAIN[world];
    // the prison (and anywhere else without a main map): the floor you are standing on
    const id = main && getMap(main[0]) ? main[0] : m.id;
    const name = main ? main[1] : m.name;
    const key = 'minimap_' + id;
    this.buildMinimapFor(id, key);
    const mm = getMap(id);
    const here = m.id === id;
    return { key, name, w: mm.w, h: mm.h, dot: here && this.player ? { x: this.player.x, y: this.player.y } : null, indoors: !here };
  }

  private buildMinimapFor(id: string, key: string) {
    if (this.textures.exists(key)) return;
    const m = getMap(id);
    const cv = document.createElement('canvas');
    cv.width = m.w;
    cv.height = m.h;
    const ctx = cv.getContext('2d')!;
    const st = newState();
    const water = new Set<number>([T.WATER, T.PWATER, T.W4_CHANNEL, T.W4_CHANNEL_WET, T.W4_GAP]);
    const path = new Set<number>([T.COBBLE, T.COBBLE2, T.PLAZA, T.DOCK, T.DOCK_V, T.GRAVEL, T.ASPHALT, T.ASPHALT2, T.ROADLINE, T.SIDEWALK, T.BOARDWALK, T.PROMENADE, T.PROMENADE2, T.PARKPATH, T.DIRT, T.SANDDRIFT, T.W4_TRAIL, T.W4_COBBLE, T.W4_STONE, T.W4_PLANK, T.W4_ROPEBRIDGE]);
    const sand = new Set<number>([T.SAND, T.SAND2, T.WETSAND, T.SANDLIT, T.W4_SAND, T.W4_SHORE]);
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        const g = m.ground[y * m.w + x];
        let c = '#404040';
        if (water.has(g)) c = '#000000';
        else if (blockedStatic(m, x, y, st)) c = '#808080';
        else if (path.has(g)) c = '#bfbfbf';
        else if (sand.has(g)) c = '#808080';
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    // buildings and landmarks in white
    const landmark = /^(b_|b3_|w4_(house|storage|ruin|tower|castle|wreck|monument|vmonument|labfront|mound|bigtree))/;
    for (const p of m.props)
      if (landmark.test(p.key) && (!p.show || p.show(st))) {
        ctx.fillStyle = '#ffffff';
        for (const r of p.solid) ctx.fillRect(r.x, r.y, r.w, r.h);
      }
    this.textures.addCanvas(key, cv);
  }

  // ================================================================ maps

  loadMap(id: string, x: number, y: number, dir: Dir) {
    // tear down
    this.tm?.destroy();
    this.worldLayer.removeAll(true);
    this.actors.clear();
    this.props = [];
    this.fogs = [];
    this.rain = undefined;
    this.sea = undefined;
    this.extraLights = [];
    const changed = this.map?.id !== id;
    const m = getMap(id);
    this.map = m;
    this.st.map = id;
    this.st.x = x;
    this.st.y = y;
    this.st.dir = dir;

    // tiles
    const tm = this.make.tilemap({ tileWidth: 16, tileHeight: 16, width: m.w, height: m.h });
    this.tm = tm;
    const tset = tm.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!;
    const g = tm.createBlankLayer('g', tset)!;
    const d = tm.createBlankLayer('d', tset)!;
    const gData: number[][] = [];
    const dData: number[][] = [];
    let water = false;
    for (let j = 0; j < m.h; j++) {
      gData.push([]);
      dData.push([]);
      for (let i = 0; i < m.w; i++) {
        const t = m.ground[j * m.w + i];
        if (t === T.WATER) water = true;
        gData[j].push(t === T.WATER ? -1 : t);
        dData[j].push(m.deco[j * m.w + i]);
      }
    }
    g.putTilesAt(gData, 0, 0);
    d.putTilesAt(dData, 0, 0);
    if (water) {
      // the ocean runs on past the map edge, for cutscene pans out over the water
      const pad = 384;
      this.sea = this.add.tileSprite(-pad, -pad, m.w * 16 + pad * 2, m.h * 16 + pad * 2, 'sea0').setOrigin(0, 0).setDepth(-3000);
      this.worldLayer.add(this.sea);
    }
    g.setDepth(-2000);
    d.setDepth(-1900);
    this.worldLayer.add(g);
    this.worldLayer.add(d);

    // props
    for (const p of m.props) {
      const meta = PROP_META[p.key] ?? {};
      const key = p.key === 'p_tree' && (p.x + p.y) % 2 ? 'p_tree2' : p.key;
      if (key.startsWith('tile:')) {
        const img = this.add.image(p.x * 16, p.y * 16, 'tiles', 't' + key.slice(5)).setOrigin(0, 0);
        img.setDepth((p.sortY ?? p.y + 1) * 16 - 0.5);
        this.worldLayer.add(img);
        this.props.push({ def: p, img });
        continue;
      }
      const img = this.add.image(p.x * 16 + (meta.ox ?? 0) + (p.ox ?? 0), p.y * 16 + (meta.oy ?? 0) + (p.oy ?? 0), key).setOrigin(0, 0);
      if (key.startsWith('p_tree')) img.setFlipX((p.x * 7 + p.y) % 3 === 0);
      img.setDepth(p.over ? 9000 : (p.sortY !== undefined ? p.sortY * 16 : img.y + img.height) - 0.5);
      this.worldLayer.add(img);
      this.props.push({ def: p, img });
    }

    // characters
    this.onTick = null;
    this.player = new Actor(this, m.world === 5 && this.st.flags.w5_disguised ? 'ch_player_guard' : 'ch_player', x, y, dir);
    this.pushRule = null;
    this.onPushed = null;
    this.stepMs = null;
    this.frozenUntil = 0;
    this.spawnFollower();
    this.spawnFollower2();
    this.spawnCompanion();
    this.refresh();
    // living set pieces (the Ferris wheel turning, the slingshot ball) are built by the story
    SCRIPTS['decorate_' + id]?.(this);

    // atmosphere: the story can change the mood of the whole town
    this.darkAlpha = m.world === 3 && m.outdoor ? w3Dark(this.st) : m.world === 4 ? w4Dark(this.st, m) : m.id === 'w3_club' ? w3ClubDark(this.st) : m.dark;
    this.lightsDisabled = !!this.st.flags.lights_out;
    if (m.outdoor && this.lightsDisabled) this.darkAlpha = 0.8;
    else if (m.outdoor && m.world !== 3 && m.world !== 4 && (this.st.flags.mayor_ran || this.st.flags.ending_done)) this.darkAlpha = 0.28;
    this.stamp = this.make.image({ x: 0, y: 0, key: 'light', add: false }).setOrigin(0.5);
    this.dark = this.add.renderTexture(0, 0, W + 32, H + 32).setOrigin(0, 0).setDepth(10000);
    this.worldLayer.add(this.dark);
    this.liveLights = m.lights.map((l, k) => ({ x: l.x, y: l.y, r: l.r, flicker: l.flicker ?? 0, on: true, k }));
    for (const f of m.fog)
      for (let i = 0; i < Math.ceil((f.w * f.h) / 30); i++) {
        const img = this.add
          .image((f.x + Math.random() * f.w) * 16, (f.y + Math.random() * f.h) * 16, 'fx_fog' + (i % 3))
          .setAlpha(0.32)
          .setScale(0.8 + Math.random() * 0.5)
          .setDepth(9500);
        (img as any).bounds = f;
        this.worldLayer.add(img);
        this.fogs.push(img);
      }
    // (the Forgotten Island is a clear, still night: no rain)
    if (m.outdoor && !this.st.flags.ending_done && m.world !== 4) {
      this.rain = this.add.particles(0, 0, 'fx_rain', {
        x: { min: 90, max: 320 },
        y: 60,
        lifespan: 650,
        speedY: { min: 240, max: 300 },
        speedX: { min: -50, max: -30 },
        frequency: 35,
        alpha: { start: 0.6, end: 0.3 },
      });
      this.rain.setScrollFactor(0).setDepth(9800);
      this.worldLayer.add(this.rain);
    }

    // camera
    const cam = this.cameras.main;
    const vw = W / ZOOM;
    const vh = H / ZOOM;
    const mw = m.w * 16;
    const mh = m.h * 16;
    const bx = mw < vw ? (mw - vw) / 2 : 0;
    const by = mh < vh ? (mh - vh) / 2 : 0;
    cam.setBounds(bx, by, Math.max(mw, vw), Math.max(mh, vh));
    cam.setZoom(ZOOM);
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 8);
    this.camLocked = false;

    sound.playSong(this.musicFor(m));
    sound.setAmbience(m.amb);
    this.save();
  }

  /** Music can change with story progress (dread after the bell, celebration at the end). */
  private musicFor(m: MapDef) {
    // a story sequence across several maps keeps one song (the ending montage); 'none' is silence
    if (this.musicOverride) return this.musicOverride === 'none' ? null : this.musicOverride;
    if (m.world === 2) return w2Music(this.st, m);
    if (m.world === 3) return w3Music(this.st, m);
    if (m.world === 4) return w4Music(this.st, m);
    if (m.world === 5) return w5Music(this.st, m);
    if (this.st.flags.ending_done) return m.outdoor ? 'celebrate' : m.music;
    if (this.st.flags.dutchman_arrived && !this.st.flags.dutchman_beaten && m.outdoor) return 'dread';
    if (this.st.flags.mayor_ran && m.outdoor) return 'celebrate';
    return m.music;
  }

  private spawnFollower() {
    this.follower?.destroy();
    this.follower = null;
    const lead = partyOf(this.st)[0];
    if (!lead) return;
    const back = OPP[this.player.dir];
    const [dx, dy] = DIRV[back];
    let fx = this.player.x + dx;
    let fy = this.player.y + dy;
    if (blockedStatic(this.map, fx, fy, this.st)) {
      fx = this.player.x;
      fy = this.player.y;
    }
    this.follower = new Actor(this, 'ch_mini_' + lead, fx, fy, this.player.dir);
  }

  /** World 2: the second creature, behind the first. */
  spawnFollower2() {
    this.follower2?.destroy();
    this.follower2 = null;
    const second = partyOf(this.st)[1];
    if (!second || !this.follower) return;
    const lead = this.follower;
    let fx = lead.x;
    let fy = lead.y;
    for (const d of [OPP[lead.dir], 'left', 'right', 'up', 'down'] as Dir[]) {
      const [dx, dy] = DIRV[d];
      const nx = lead.x + dx;
      const ny = lead.y + dy;
      if (!blockedStatic(this.map, nx, ny, this.st) && !(nx === this.player.x && ny === this.player.y) && !warpAt(this.map, nx, ny)) {
        fx = nx;
        fy = ny;
        break;
      }
    }
    this.follower2 = new Actor(this, 'ch_mini_' + second, fx, fy, lead.dir);
  }

  /** The inventor tags along once he has joined you (World 2). */
  spawnCompanion() {
    this.companion?.destroy();
    this.companion = null;
    this.compGap = [];
    const w3 = this.map.world === 3;
    const w4 = this.map.world === 4;
    const f4 = this.st.flags;
    if (this.map.world === 5) return this.spawnGuardian();
    const w4who = !w4 || f4.w4_captured ? null : f4.w4_carlo_follow ? 'ch_carlo' : f4.w4_old_follow ? 'ch_oldman4' : null;
    if (w4 ? !w4who : w3 ? !this.st.flags.w3_ayla_follow : !this.st.flags.w2_inv_follow || this.st.flags.w2_inv_away || this.map.world !== 2) return;
    const lead = this.follower2 ?? this.follower ?? this.player;
    // behind whoever is last in line; failing that, beside them (never on top of anyone)
    const order: Dir[] = [OPP[lead.dir], 'left', 'right', 'up', 'down'];
    const taken = (x: number, y: number) =>
      (x === this.player.x && y === this.player.y) ||
      (!!this.follower && x === this.follower.x && y === this.follower.y) ||
      (!!this.follower2 && x === this.follower2.x && y === this.follower2.y) ||
      !!this.occupied(x, y);
    let cx = lead.x;
    let cy = lead.y;
    for (const d of order) {
      const [dx, dy] = DIRV[d];
      const nx = lead.x + dx;
      const ny = lead.y + dy;
      if (!blockedStatic(this.map, nx, ny, this.st) && !taken(nx, ny) && !warpAt(this.map, nx, ny)) {
        cx = nx;
        cy = ny;
        break;
      }
    }
    this.companion = new Actor(this, w4who ?? (w3 ? 'ch_ayla' : 'ch_inventor'), cx, cy, lead.dir);
  }

  /** Rebuild the line of followers (a creature found again, the guardian joining or leaving). */
  respawnParty() {
    this.spawnFollower();
    this.spawnFollower2();
    this.spawnCompanion();
  }

  /** The prison: the guardian walks with you (it does not fight; it is a companion on the map). */
  private spawnGuardian() {
    const fl = this.st.flags;
    if (!fl.w5_free || fl.w5_g_away) return;
    const lead = this.follower2 ?? this.follower ?? this.player;
    const taken = (x: number, y: number) =>
      (x === this.player.x && y === this.player.y) || (!!this.follower && x === this.follower.x && y === this.follower.y) || (!!this.follower2 && x === this.follower2.x && y === this.follower2.y) || !!this.occupied(x, y);
    let cx = lead.x;
    let cy = lead.y;
    for (const d of [OPP[lead.dir], 'left', 'right', 'up', 'down'] as Dir[]) {
      const [dx, dy] = DIRV[d];
      if (!blockedStatic(this.map, lead.x + dx, lead.y + dy, this.st) && !taken(lead.x + dx, lead.y + dy) && !warpAt(this.map, lead.x + dx, lead.y + dy)) {
        cx = lead.x + dx;
        cy = lead.y + dy;
        break;
      }
    }
    this.companion = new Actor(this, fl.w4_route === 'B' ? 'ow_viperwind' : 'ow_wispmane', cx, cy, lead.dir);
  }

  /** Where the last spirit in line has just been: the companion walks one step further back. */
  private compGap: { x: number; y: number }[] = [];

  /** Followers shuffle up one place behind whoever is ahead of them. */
  private trail(px: number, py: number, ms: number) {
    const chain = [this.follower, this.follower2].filter(Boolean) as Actor[];
    let tx = px;
    let ty = py;
    for (const a of chain) {
      const ox = a.x;
      const oy = a.y;
      const dx = tx - a.x;
      const dy = ty - a.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) a.walk(dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up', ms);
      else if (dx !== 0 || dy !== 0) {
        a.x = tx;
        a.y = ty;
        a.place();
      }
      tx = ox;
      ty = oy;
    }
    // the companion (Pipwick, Madame, the old man, Carlo, the guardian) keeps a tile of room
    // behind your spirits, so their sprites never pile up on top of each other
    const c = this.companion;
    if (!c) return;
    // (it walks straight onto the tile the last in line just left: right behind them)
    this.compGap.push({ x: tx, y: ty });
    const t = this.compGap.shift()!;
    const dx = t.x - c.x;
    const dy = t.y - c.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) c.walk(dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up', ms);
    else if (dx !== 0 || dy !== 0) {
      c.x = t.x;
      c.y = t.y;
      c.place();
    }
  }

  /** Re-evaluate which NPCs and props exist for the current story state. */
  refresh() {
    const st = this.st;
    for (const p of this.props) p.img.setVisible(!p.def.show || p.def.show(st));
    const dl = this.tm?.getLayer('d')?.tilemapLayer;
    if (dl && this.map.dyn) for (const [x, y, t] of this.map.dyn(st)) dl.putTileAt(t, x, y);
    if (this.lightsDisabled) for (const p of this.props) if (p.def.key === 'p_lamp') p.img.setTexture('p_lamp_off');
    const want = new Set<string>();
    for (const n of this.map.npcs) {
      if (n.show && !n.show(st)) continue;
      // after the Kraken, Saltwash is empty: only the people the ending places remain
      if (this.map.world === 2 && st.flags.w2_returned && !n.id.startsWith('ret_')) continue;
      want.add(n.id);
      if (this.actors.has(n.id)) continue;
      const a = new Actor(this, this.sheetFor(n.sprite), n.x, n.y, n.dir, n.big || this.sheetFor(n.sprite).startsWith('cr_') || n.sprite === 'grandclock' || n.sprite === 'wreck', n);
      if (n.sprite === 'scarecrow') {
        a.sprite.stop().setFrame(5).setTint(0x9a9a9a);
      }
      this.actors.set(n.id, a);
    }
    for (const [id, a] of this.actors) {
      if (!want.has(id) && !(a as any).temp) {
        a.destroy();
        this.actors.delete(id);
      }
    }
  }

  private sheetFor(sprite: string) {
    if (sprite.startsWith('raw:')) return sprite.slice(4);
    if (sprite.startsWith('cr_') || sprite === 'grandclock' || sprite === 'wreck') return sprite;
    if (sprite === 'scarecrow') return 'cr_hauntcorn';
    return 'ch_' + sprite;
  }

  // ================================================================ per frame

  update(time: number, delta: number) {
    // a cutscene that ended with the camera still panned away: bring it back to you
    const cam0 = this.cameras?.main as any;
    if (cam0 && this.player?.sprite && !this.busy && this.running === 0 && !this.dialog?.active && (this.camLocked || cam0._follow !== this.player.sprite)) {
      this.camStuck += delta;
      if (this.camStuck > 400) this.camFollowPlayer();
    } else this.camStuck = 0;
    const ff = this.keys.shift?.isDown && this.dialog.active;
    this.tweens.timeScale = ff ? 3 : 1;
    // the sea and sky move
    if (this.sea) {
      this.sea.tilePositionX += delta * 0.004;
      this.seaF += delta;
      if (this.seaF > 300) {
        this.seaF = 0;
        this.seaN = (this.seaN + 1) % 4;
        this.sea.setTexture('sea' + this.seaN);
      }
    }
    for (const f of this.fogs) {
      const b = (f as any).bounds;
      f.x -= delta * 0.006;
      if (f.x < b.x * 16 - 40) f.x = (b.x + b.w) * 16 + 20;
    }
    // companions breathe while they wait (also during dialogue)
    this.follower?.idle(time);
    this.follower2?.idle(time);
    // World 3: the dance floors never stop
    if (time - this.danceT > 230) {
      this.danceT = time;
      this.danceBeat++;
      for (const a of this.actors.values()) if ((a.def as any)?.dance && !a.moving && !a.hidden) a.dance(this.danceBeat);
    }
    this.flashAmt = Math.max(0, this.flashAmt - delta / 400);
    this.gb.flash = this.flashAmt;
    this.updateDark(delta);
    if (this.busy || this.dialog.active || this.menu.open || !this.player) return;
    this.updateMovement(time);
    this.onTick?.(delta);
    if (this.busy) return;
    if (this.chaseState) this.updateChase(delta);
    if (this.free) {
      const r = this.free.tick(delta);
      if (r) {
        const f = this.free;
        this.free = null;
        this.busy = true;
        f.done(r);
        return;
      }
    }
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 400 + Math.random() * 700;
      this.wander();
    }
    this.saveTimer -= delta;
  }

  private updateDark(delta: number) {
    const cam = this.cameras.main;
    const rt = this.dark;
    if (!rt) return;
    const wv = cam.worldView;
    const rx = wv.centerX - rt.width / 2;
    const ry = wv.centerY - rt.height / 2;
    rt.setPosition(rx, ry);
    rt.clear();
    if (this.darkAlpha <= 0.01) return;
    rt.fill(0x000000, Math.min(1, this.darkAlpha));
    this.lightTimer -= delta;
    const reflick = this.lightTimer <= 0;
    if (reflick) this.lightTimer = 90;
    const st = this.st;
    const erase = (x: number, y: number, r: number) => {
      if (x + r < wv.x - 20 || x - r > wv.right + 20 || y + r < wv.y - 20 || y - r > wv.bottom + 20) return;
      this.stamp.setScale((r * 2) / 128);
      rt.erase(this.stamp, x - rx, y - ry);
    };
    this.map.lights.forEach((l, i) => {
      if (l.show && !l.show(st)) return;
      if (this.lightsDisabled && this.map.outdoor) return;
      const live = this.liveLights[i];
      if (reflick && live.flicker > 0) {
        if (live.flicker >= 0.8) live.on = Math.random() > 0.3 ? live.on : !live.on;
        live.k = 1 - Math.random() * live.flicker * 0.2;
      }
      if (live.on) erase(l.x, l.y, l.r * (live.k || 1));
    });
    for (const l of this.extraLights) erase(l.x, l.y, l.r);
    if (this.playerLight && this.player) {
      const style = this.map.darkStyle;
      const r = style === 'cave' ? 50 : style === 'cellar' ? 42 : style === 'well' ? 40 : style === 'night' ? 30 : 34;
      const flick = style === 'cellar' ? 1 - Math.random() * 0.06 : 1 - Math.random() * 0.02;
      erase(this.player.sprite.x, this.player.sprite.y - 8, r * flick);
      if (this.follower && style === 'cave') erase(this.follower.sprite.x, this.follower.sprite.y - 8, 18);
    }
  }

  private inputDir(): Dir | null {
    const k = this.keys;
    if (k.up.isDown || k.w.isDown) return 'up';
    if (k.down.isDown || k.s.isDown) return 'down';
    if (k.left.isDown || k.a.isDown) return 'left';
    if (k.right.isDown || k.d.isDown) return 'right';
    return this.padDir;
  }

  private updateMovement(time: number) {
    // `stepping` covers the gap between arriving on a tile and its warps/triggers being handled
    if (this.player.moving || this.stepping) return;
    if (this.time.now < this.frozenUntil) return;
    const dir = this.inputDir();
    if (!dir) {
      this.held = null;
      return;
    }
    if (this.held !== dir) {
      this.held = dir;
      this.heldSince = time;
      if (this.player.dir !== dir) {
        this.player.face(dir);
        return;
      }
    }
    if (this.player.dir !== dir) this.player.face(dir);
    if (time - this.heldSince < 60 && this.player.dir === dir && this.held === dir && time - this.heldSince > 0) {
      /* small grace period for turning on the spot */
    }
    const run = this.keys.shift.isDown || this.keys.x.isDown || this.padRun;
    let ms = run ? RUN_MS : STEP_MS;
    if (this.stepMs) {
      const [dx, dy] = DIRV[dir];
      ms = this.stepMs(this.player.x + dx, this.player.y + dy, run);
    }
    this.tryStep(dir, ms);
  }

  private occupied(x: number, y: number): Actor | undefined {
    for (const a of this.actors.values()) if (!a.hidden && a.x === x && a.y === y && !(a.def?.ambient && false)) return a;
    return undefined;
  }

  blocked(x: number, y: number) {
    return blockedStatic(this.map, x, y, this.st) || !!this.occupied(x, y);
  }

  private async tryStep(dir: Dir, ms: number) {
    const [dx, dy] = DIRV[dir];
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    const warp = warpAt(this.map, nx, ny);
    if (warp && this.chaseState && warp.kind === 'door') return;
    if (warp && warp.kind === 'door') {
      this.busy = true;
      let ok = true;
      if (warp.gate && GATES[warp.gate]) ok = await GATES[warp.gate](this);
      if (ok) {
        sound.play('door');
        await this.warp(warp.to, warp.tx, warp.ty, warp.dir);
      }
      this.busy = false;
      return;
    }
    const shove = this.occupied(nx, ny);
    if (shove && (shove as any).push && !shove.moving) {
      this.tryPush(shove, dir);
      return;
    }
    if (this.blocked(nx, ny)) {
      if (this.time.now - this.lastBump > 350) {
        this.lastBump = this.time.now;
        sound.play('bump');
      }
      return;
    }
    const px = this.player.x;
    const py = this.player.y;
    this.stepping = true;
    const p = this.player.walk(dir, ms);
    this.trail(px, py, ms);
    if (ms === STEP_MS) sound.play('step');
    await p;
    this.stepping = false;
    this.onStep();
  }

  /** Shove a pushable object one tile, if the puzzle allows it. */
  private async tryPush(o: Actor, dir: Dir) {
    const [dx, dy] = DIRV[dir];
    const bx = o.x + dx;
    const by = o.y + dy;
    const id = [...this.actors.entries()].find(([, a]) => a === o)?.[0] ?? '';
    const clear =
      !this.occupied(bx, by) &&
      !warpAt(this.map, bx, by) &&
      !(bx === this.player.x && by === this.player.y) &&
      !(this.follower && bx === this.follower.x && by === this.follower.y) &&
      !(this.follower2 && bx === this.follower2.x && by === this.follower2.y) &&
      !(this.companion && bx === this.companion.x && by === this.companion.y);
    let verdict = clear && !blockedStatic(this.map, bx, by, this.st) ? 'ok' : 'no';
    if (clear && this.pushRule) verdict = this.pushRule(id, bx, by) ?? verdict;
    if (verdict === 'no') {
      if (this.time.now - this.lastBump > 350) {
        this.lastBump = this.time.now;
        sound.play('bump');
      }
      return;
    }
    this.stepping = true;
    sound.play('stone');
    this.player.face(dir);
    await o.walk(dir, 260);
    this.stepping = false;
    this.onPushed?.(id, bx, by, verdict);
  }

  /** Change a ground tile at runtime (water rising and falling). */
  setGround(x: number, y: number, t: number) {
    this.map.ground[y * this.map.w + x] = t;
    this.tm?.getLayer('g')?.tilemapLayer.putTileAt(t === T.WATER ? -1 : t, x, y);
  }

  private onStep() {
    const { x, y } = this.player;
    this.st.x = x;
    this.st.y = y;
    this.st.dir = this.player.dir;
    if (this.saveTimer <= 0) {
      this.save();
      this.saveTimer = 2000;
    }
    if (this.chaseState) {
      const g = this.chaseState.goal;
      if (x >= g.x && y >= g.y && x < g.x + g.w && y < g.y + g.h) this.endChase('escaped');
      return;
    }
    const w = warpAt(this.map, x, y);
    if (w && w.kind === 'step') {
      this.busy = true;
      (async () => {
        let ok = true;
        if (w.gate && GATES[w.gate]) ok = await GATES[w.gate](this);
        if (ok) {
          sound.play(this.map.ground[y * this.map.w + x] === T.LADDER ? 'ladder' : 'door');
          await this.warp(w.to, w.tx, w.ty, w.dir);
        }
        this.busy = false;
      })();
      return;
    }
    // no story triggers while a free-run minigame (a chase, an escape) has the controls
    if (this.busy || this.free) return;
    for (const t of this.map.triggers) {
      if (x < t.x || y < t.y || x >= t.x + t.w || y >= t.y + t.h) continue;
      if (t.show && !t.show(this.st)) continue;
      if (t.once && this.st.flags[t.once]) continue;
      if (t.once) this.st.flags[t.once] = true;
      this.run(t.id);
      return;
    }
  }

  private wander() {
    for (const a of this.actors.values()) {
      const r = a.def?.wander ?? 0;
      if (!r || a.moving || a.hidden || Math.random() < 0.6) continue;
      const dirs: Dir[] = ['up', 'down', 'left', 'right'];
      const d = dirs[Math.floor(Math.random() * 4)];
      const [dx, dy] = DIRV[d];
      const nx = a.x + dx;
      const ny = a.y + dy;
      if (Math.abs(nx - a.def!.x) > r || Math.abs(ny - a.def!.y) > r) {
        a.face(d);
        continue;
      }
      if (
        this.blocked(nx, ny) ||
        (nx === this.player.x && ny === this.player.y) ||
        (this.follower && nx === this.follower.x && ny === this.follower.y) ||
        (this.follower2 && nx === this.follower2.x && ny === this.follower2.y) ||
        (this.companion && nx === this.companion.x && ny === this.companion.y)
      ) {
        a.face(d);
        continue;
      }
      if (warpAt(this.map, nx, ny)) continue;
      a.walk(d, 320);
      if (a.sheet === 'ch_chicken' && Math.random() < 0.15) sound.play('cluck');
    }
  }

  // ================================================================ interaction

  private async interact() {
    const p = this.player;
    const [dx, dy] = DIRV[p.dir];
    let tx = p.x + dx;
    let ty = p.y + dy;
    if (this.companion && this.companion.x === tx && this.companion.y === ty && !this.companion.hidden) {
      this.companion.face(OPP[p.dir]);
      await this.run(this.map.world === 5 ? 'w5_guardian_talk' : this.map.world === 4 ? 'w4_companion_talk' : this.map.world === 3 ? 'w3_ayla_talk' : 'inventor_talk');
      return;
    }
    let target = this.occupied(tx, ty);
    let spot = this.spotAt(tx, ty);
    if (!target && !spot && reachAcross(this.map, tx, ty)) {
      const t2 = this.occupied(tx + dx, ty + dy);
      const s2 = this.spotAt(tx + dx, ty + dy);
      if (t2 || s2) {
        target = t2;
        spot = s2;
        tx += dx;
        ty += dy;
      }
    }
    if (target && target.def && !target.def.ambient) {
      if (target.directional && target.def.wander !== undefined) target.face(OPP[p.dir]);
      await this.run(target.def.script, target.def.id);
      return;
    }
    if (target?.def?.ambient) {
      await this.run(target.def.script, target.def.id);
      return;
    }
    if (!spot) spot = this.nearSpot(p.x, p.y);
    if (spot) {
      await this.run(spot.id);
      return;
    }
    // fishing from the shore
    const here = this.map.ground[p.y * this.map.w + p.x];
    const there = this.map.ground[(p.y + dy) * this.map.w + (p.x + dx)];
    if (this.map.fishing && there === T.WATER && [T.SAND, T.SAND2, T.WETSAND, T.DOCK, T.DOCK_V].includes(here as any)) {
      await this.run(this.st.items.rod ? 'fish' : 'fish_norod');
    }
  }

  /** A floor item under the player or on any side of them. */
  private nearSpot(x: number, y: number) {
    for (const [dx, dy] of [
      [0, 0],
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
    ]) {
      const s = this.spotAt(x + dx, y + dy);
      if (s?.near) return s;
    }
    return undefined;
  }

  private spotAt(x: number, y: number) {
    return this.map.spots.find((s) => s.x === x && s.y === y && (!s.show || s.show(this.st)));
  }

  /** Run a story script by id (input is locked while it runs). */
  private leaveGen = 0;
  private leftTo = '';

  async run(id: string, arg?: any) {
    const fn = SCRIPTS[id];
    if (!fn) return;
    this.busy = true;
    const gen = this.leaveGen;
    this.running++;
    try {
      await fn(this, arg);
    } catch (e) {
      console.error('script', id, e);
    }
    this.running--;
    // another script is still mid-dialogue: leave its box and the input lock alone
    if (this.running > 0) return;
    // the script handed off to another scene (a battle, the credits): this one is gone
    if (gen !== this.leaveGen && this.leftTo !== 'world') {
      this.busy = false;
      return;
    }
    this.dialog.hide();
    this.busy = false;
    this.refresh();
    this.save();
  }

  // ================================================================ WorldAPI (used by scripts)

  get state() {
    return this.st;
  }

  flag(k: string) {
    return this.st.flags[k];
  }
  set(k: string, v: number | boolean | string = true) {
    this.st.flags[k] = v;
  }
  has(item: string) {
    return (this.st.items[item] ?? 0) > 0;
  }
  count(item: string) {
    return this.st.items[item] ?? 0;
  }
  async give(item: string, n = 1, text?: string) {
    this.st.items[item] = (this.st.items[item] ?? 0) + n;
    this.save();
    const info = ITEMS[item];
    const icon = info?.fish ? 'fish_' + (item === 'bellfish' ? 'bellfish' : item) : info?.icon ?? 'it_key';
    await this.dialog.itemGet(icon, text ?? `GOT ${info?.curio ? 'A CURIO: ' : ''}${info?.name ?? item}!`, info?.curio ? 'crystal' : 'item');
  }
  take(item: string, n = 1) {
    this.st.items[item] = Math.max(0, (this.st.items[item] ?? 0) - n);
  }

  say(text: string, speaker?: string, opts?: SayOpts) {
    return this.dialog.say(text, speaker, opts);
  }
  ask(text: string, options: string[], speaker?: string, opts?: SayOpts & { cancel?: number; start?: number }) {
    return this.dialog.ask(text, options, speaker, opts);
  }
  async confirm(text: string, speaker?: string) {
    return (await this.dialog.ask(text, ['YES', 'NO'], speaker, { cancel: 1 })) === 0;
  }
  wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }
  tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }
  sfx(name: string) {
    sound.play(name);
  }
  music(name: string | null) {
    sound.playSong(name);
  }
  shake(ms = 300, amt = 0.006) {
    if (settings.reducedMotion) amt *= 0.3;
    this.cameras.main.shake(ms, amt);
  }
  flash(a = 0.6) {
    this.flashAmt = settings.reducedMotion ? Math.min(a, 0.2) : a;
  }
  async fade(out: boolean, ms = 300) {
    const cam = this.cameras.main;
    await new Promise<void>((r) => {
      if (out) cam.fadeOut(ms, 0, 0, 0);
      else cam.fadeIn(ms, 0, 0, 0);
      cam.once(out ? 'camerafadeoutcomplete' : 'camerafadeincomplete', () => r());
    });
  }
  async warp(map: string, x: number, y: number, dir: Dir) {
    await this.fade(true, 220);
    this.loadMap(map, x, y, dir);
    await this.fade(false, 220);
    const enter = SCRIPTS['enter_' + map];
    if (enter) {
      const wasBusy = this.busy;
      this.busy = true;
      try {
        await enter(this);
      } catch (e) {
        console.error(e);
      }
      this.dialog.hide();
      this.busy = wasBusy;
      this.refresh();
    }
  }
  actor(id: string): Actor | undefined {
    if (id === 'player') return this.player;
    if (id === 'follower') return this.follower ?? undefined;
    if (id === 'follower2') return this.follower2 ?? undefined;
    if (id === 'inventor' && this.companion) return this.companion;
    return this.actors.get(id);
  }
  async move(id: string, path: Dir[], ms = STEP_MS) {
    const a = this.actor(id);
    if (!a) return;
    for (const d of path) {
      if (id === 'player') this.trail(a.x, a.y, ms);
      await a.walk(d, ms);
    }
    if (id === 'player') {
      this.st.x = a.x;
      this.st.y = a.y;
      this.st.dir = a.dir;
    }
  }
  face(id: string, d: Dir) {
    this.actor(id)?.face(d);
  }
  /** Face actor `id` toward another actor. */
  faceTo(id: string, other: string) {
    const a = this.actor(id);
    const b = this.actor(other);
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    a.face(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }
  async emote(id: string, kind: string, ms = 700) {
    const a = this.actor(id);
    if (!a) return;
    const img = this.add.image(a.sprite.x, a.sprite.y - a.sprite.height - 4, 'em_' + kind).setDepth(9600).setOrigin(0.5, 1);
    this.worldLayer.add(img);
    img.setScale(0.2);
    this.tweens.add({ targets: img, scale: 1, duration: 140, ease: 'Back.easeOut' });
    if (kind === '!') sound.play('warn');
    await this.wait(ms);
    img.destroy();
  }
  /** Temporarily place an extra character (cutscene extras). */
  spawn(id: string, sprite: string, x: number, y: number, dir: Dir) {
    const a = new Actor(this, this.sheetFor(sprite), x, y, dir, sprite.startsWith('cr_') || sprite.startsWith('raw:'));
    (a as any).temp = true;
    this.actors.set(id, a);
    return a;
  }
  remove(id: string) {
    const a = this.actors.get(id);
    a?.destroy();
    this.actors.delete(id);
  }
  hide(id: string, v = true) {
    const a = this.actor(id);
    if (!a) return;
    a.hidden = v;
    a.sprite.setVisible(!v);
  }
  async camPan(tx: number, ty: number, ms = 800, zoom?: number) {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.camLocked = true;
    const z = zoom ?? cam.zoom;
    cam.removeBounds();
    await new Promise<void>((r) => {
      cam.pan(tx * 16 + 8, ty * 16 + 8, ms, 'Sine.easeInOut', true, (_c, p) => p === 1 && r());
      if (zoom) cam.zoomTo(z, ms, 'Sine.easeInOut', true);
    });
  }
  async camReturn(ms = 600) {
    const cam = this.cameras.main;
    await new Promise<void>((r) => {
      cam.pan(this.player.sprite.x, this.player.sprite.y - 8, ms, 'Sine.easeInOut', true, (_c, p) => p === 1 && r());
      cam.zoomTo(ZOOM, ms, 'Sine.easeInOut', true);
    });
    this.camFollowPlayer();
  }
  /** Back to normal: the map's bounds, the usual zoom, following the player. */
  private camFollowPlayer() {
    const cam = this.cameras.main;
    const m = this.map;
    const vw = W / ZOOM;
    const vh = H / ZOOM;
    const mw = m.w * 16;
    const mh = m.h * 16;
    if (cam.zoom !== ZOOM) cam.setZoom(ZOOM);
    cam.setBounds(mw < vw ? (mw - vw) / 2 : 0, mh < vh ? (mh - vh) / 2 : 0, Math.max(mw, vw), Math.max(mh, vh));
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 8);
    this.camLocked = false;
    this.camStuck = 0;
  }
  setDark(a: number, ms = 0) {
    if (!ms) this.darkAlpha = a;
    else this.tweens.add({ targets: this, darkAlpha: a, duration: ms });
  }
  /** Every lamp in town goes dark (the Dutchman has come). */
  lightsOff() {
    this.lightsDisabled = true;
    for (const p of this.props) if (p.def.key === 'p_lamp') p.img.setTexture('p_lamp_off');
  }
  lightsOn() {
    this.lightsDisabled = false;
    for (const p of this.props) if (p.def.key === 'p_lamp') p.img.setTexture('p_lamp');
  }
  setRain(freq: number) {
    if (this.rain) this.rain.frequency = freq;
  }
  prop(id: string) {
    return this.props.find((p) => p.def.id === id || p.def.key === id)?.img;
  }
  /** Add an image to the world (cutscenes). */
  image(key: string, x: number, y: number, depth?: number) {
    const img = this.add.image(x, y, key);
    img.setDepth(depth ?? y);
    this.worldLayer.add(img);
    return img;
  }
  sprite(key: string, x: number, y: number, depth?: number) {
    const s = this.add.sprite(x, y, key);
    s.setDepth(depth ?? y);
    this.worldLayer.add(s);
    return s;
  }
  recruit(id: string) {
    this.st.creature = id;
    this.save();
    this.spawnFollower();
  }
  save() {
    if (!this.player) return;
    this.st.x = this.player.x;
    this.st.y = this.player.y;
    this.st.dir = this.player.dir;
    // a developer test never writes to the real save (and the real game never writes into a test)
    if (this.devScene !== isDevSession()) return;
    saveState(this.st);
  }

  /** Start a developer test: a fresh, separate session at the checkpoint, with the chosen creatures. */
  private startDevTest(cp: Checkpoint, picks: string[], guardian?: Guardian) {
    const st = checkpointState(cp, picks, guardian);
    setDevSession(true);
    saveState(st);
    sound.stopMusic();
    this.leave('world', { map: cp.map, x: cp.x, y: cp.y, dir: cp.dir ?? 'down', script: cp.script, devState: st });
  }

  /** Leave a developer test: drop the test session and reload the real game, pause menu open. */
  private endDevTest() {
    // SAVE in a test: this test becomes the real save, and play carries on from right here
    setDevSession(false);
    this.devScene = false;
    this.save();
    this.sfx('item');
    void this.say('GAME SAVED. This is now your real save.');
  }

  // ---------------------------------------------------------------- chases

  private chaseState: {
    id: string;
    ms: number;
    t: number;
    goal: { x: number; y: number; w: number; h: number };
    left: number;
    done: (r: 'escaped' | 'caught') => void;
  } | null = null;

  /** Let the player run while `id` chases them. Resolves when they reach `goal`, are caught, or time runs out. */
  chase(id: string, ms: number, goal: { x: number; y: number; w: number; h: number }, limit = 60000): Promise<'escaped' | 'caught'> {
    return new Promise((done) => {
      this.chaseState = { id, ms, t: ms * 2, goal, left: limit, done };
      this.busy = false;
    });
  }

  /** Hand control back to the player while `tick` runs every frame; resolves with its first result. */
  freeRun(tick: (dt: number) => string | null): Promise<string> {
    return new Promise((done) => {
      this.free = { tick, done };
      this.busy = false;
    });
  }

  /** World 2: the temple creature joins the party (behind the first spirit). */
  recruit2(id: string) {
    this.st.creature2 = id;
    this.save();
    this.spawnFollower2();
  }

  get chasing() {
    return !!this.chaseState;
  }

  private endChase(r: 'escaped' | 'caught') {
    const c = this.chaseState;
    if (!c) return;
    this.chaseState = null;
    this.busy = true;
    c.done(r);
  }

  private updateChase(delta: number) {
    const c = this.chaseState!;
    const a = this.actors.get(c.id);
    if (!a) return this.endChase('escaped');
    c.left -= delta;
    if (c.left <= 0) return this.endChase('escaped');
    c.t -= delta;
    if (c.t > 0 || a.moving) return;
    c.t = c.ms;
    const px = this.player.x;
    const py = this.player.y;
    if (Math.abs(a.x - px) + Math.abs(a.y - py) <= 1) return this.endChase('caught');
    // breadth-first search for the first step toward the player (followers never block him)
    const w = this.map.w;
    const start = a.y * w + a.x;
    const prev = new Map<number, number>([[start, -1]]);
    const q: number[] = [start];
    let hit = -1;
    while (q.length && prev.size < 5000) {
      const k = q.shift()!;
      const x = k % w;
      const y = Math.floor(k / w);
      if (Math.abs(x - px) + Math.abs(y - py) <= 1) {
        hit = k;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = ny * w + nx;
        if (prev.has(nk) || blockedStatic(this.map, nx, ny, this.st) || warpAt(this.map, nx, ny)) continue;
        const o = this.occupied(nx, ny);
        if (o && o !== a) continue;
        prev.set(nk, k);
        q.push(nk);
      }
    }
    if (hit < 0 || hit === start) return;
    let k = hit;
    while (prev.get(k) !== start) k = prev.get(k)!;
    const nx = k % w;
    const ny = Math.floor(k / w);
    a.walk(nx > a.x ? 'right' : nx < a.x ? 'left' : ny > a.y ? 'down' : 'up', c.ms * 0.9);
  }

  // ---------------------------------------------------------------- fishing

  private fishHit = false;
  /** set when a fish bites (used by automated tests) */
  bitten = false;
  /** Cast, wait for a bite, react in time. Returns the catch id or null. */
  async fishOnce(): Promise<string | null> {
    const p = this.player;
    const [dx, dy] = DIRV[p.dir];
    const bx = (p.x + dx * 2) * 16 + 8;
    const by = (p.y + dy * 2) * 16 + 10;
    sound.play('cast');
    const line = this.add.graphics().setDepth(p.sprite.depth + 1);
    this.worldLayer.add(line);
    const bob = this.image('fx_dot', p.sprite.x, p.sprite.y - 14, 9000);
    await this.tw({ targets: bob, x: bx, y: by, duration: 380, ease: 'Quad.easeOut' });
    const drawLine = () => {
      line.clear();
      line.lineStyle(1, C.light, 1).lineBetween(p.sprite.x + (p.dir === 'left' ? -6 : 6), p.sprite.y - 14, bob.x, bob.y);
    };
    drawLine();
    const ripple = this.tweens.add({ targets: bob, y: by + 1, duration: 500, yoyo: true, repeat: -1, onUpdate: drawLine });
    let caught: string | null = null;
    this.fishing = true;
    this.bitten = false;
    this.fishHit = false;
    const waitMs = 1400 + Math.random() * 3200;
    const t0 = this.time.now;
    while (this.time.now - t0 < waitMs) {
      if (this.fishHit) break;
      await this.wait(50);
    }
    if (this.fishHit) {
      // pulled too early
      this.fishing = false;
      ripple.stop();
      line.destroy();
      bob.destroy();
      await this.say('Too early! The ripples settle.');
      return null;
    }
    // a bite!
    this.fishHit = false;
    this.bitten = true;
    sound.play('bite');
    ripple.stop();
    this.tweens.add({ targets: bob, y: by + 4, duration: 80, yoyo: true, repeat: 3 });
    this.emote('player', '!', 700);
    const window = 750;
    const t1 = this.time.now;
    while (this.time.now - t1 < window && !this.fishHit) await this.wait(30);
    this.fishing = false;
    if (this.fishHit) {
      sound.play('reel');
      await this.tw({ targets: bob, x: p.sprite.x, y: p.sprite.y - 14, duration: 300, onUpdate: drawLine });
      const r = Math.random();
      caught = r < 0.25 ? 'bellfish' : r < 0.47 ? 'cod' : r < 0.67 ? 'salmon' : r < 0.82 ? 'squid' : r < 0.94 ? 'eel' : 'boot';
    }
    line.destroy();
    bob.destroy();
    return caught;
  }

  // ---------------------------------------------------------------- battles + menu

  async startBattle(enemy: 'fisherman' | 'dutchman' | 'salesman' | 'kraken' | 'scorvex' | 'widowmaker' | 'ironclad' | SpiritId) {
    this.save();
    sound.stopMusic();
    sound.play('charge');
    // Game Boy battle swipe: the screen flashes, then bars close in
    for (let i = 0; i < 3; i++) {
      this.flash(0.9);
      await this.wait(110);
    }
    const g = this.ui(this.add.graphics()).setDepth(90);
    for (let i = 0; i <= 10; i++) {
      g.clear();
      g.fillStyle(C.black, 1);
      for (let y = 0; y < H; y += 20) g.fillRect(0, y, W, Math.round((i / 10) * 20));
      await this.wait(28);
    }
    // the main companion starts the fight; in the Kraken fight the next creature waits in reserve
    const party = partyOf(this.st);
    const solo = enemy === 'fisherman' || enemy === 'dutchman' || enemy === 'salesman';
    // World 4 takes all three
    this.leave('battle', { creature: party[0] ?? this.st.creature, enemy, story: true, partner: solo ? null : party[1] ?? null, partner2: isSpirit(enemy) ? party[2] ?? null : null });
  }

  private async newGamePrompt() {
    this.busy = true;
    const yes = await this.confirm('Erase this adventure and start over?');
    if (yes) {
      clearState();
      sound.stopMusic();
      await this.fade(true, 500);
      this.leave('world', {});
      return;
    }
    this.busy = false;
  }


  /** Switch scenes safely (see teardownLayers). */
  leave(key: string, data: any) {
    this.leaveGen++;
    this.leftTo = key;
    this.dialog.hide();
    teardownLayers(this, [this.worldLayer, this.uiLayer]);
    if (key === 'world') this.scene.restart(data);
    else this.scene.start(key, data);
  }

  /** Box helper for scripts that need a custom panel. */
  panel(x: number, y: number, w: number, h: number, style: 'dark' | 'light' = 'dark') {
    const g = this.ui(this.add.graphics());
    box(g, x, y, w, h, style);
    return g;
  }
  uiText(x: number, y: number, s: string, color: number = C.white, opts: any = {}) {
    return this.ui(txt(this, x, y, s, { color, ...opts }));
  }

  /** All maps (for scripts that want to peek). */
  maps() {
    return ALL_MAPS();
  }
  get decoAt() {
    return (x: number, y: number) => this.map.deco[y * this.map.w + x];
  }
  setDeco(x: number, y: number, t: number) {
    this.map.deco[y * this.map.w + x] = t;
    this.tm?.getLayer('d')?.tilemapLayer.putTileAt(t, x, y);
  }
  get D() {
    return D;
  }
}
