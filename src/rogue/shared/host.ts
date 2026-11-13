import { mulberry32 } from '../../engine/battle';
import { ACTION_TIMEOUT, DIFFICULTIES, DIFFICULTY, ELITE_SCALE, FLOOR_NAMES, MAX_PLAYERS, MAX_SPIRITS, PARTY_SCALE, RECONNECT_GRACE, bossScale, roomScale } from './config';
import { CoopBattle, type CoopChoice, type Step } from './coop';
import { CENTRE, ENTRY, OPPOSITE, ROOM_H, ROOM_W, buildFloor, roomTemplate, walkable, type RoomPub } from './dungeon';
import { BOSSES, ELITES, PACKS, REAPER_CHAIN, averageTurn, foeDef } from './enemies';
import { SHOP, cleanName, type ClientMsg, type PlayerPub, type RewardOffer, type RoomState, type ServerMsg } from './protocol';
import { checkPlates, flipLamp, makePuzzle, pushBlock, puzzleBlocked, stepSymbol, traceBeam, type PuzzleState } from './puzzles';
import { PUZZLE_KINDS } from './dungeon';
import { draftOffers, rosterEntry } from './roster';
import { SKILL_CAP, type Rarity } from './config';
import { canHold, skillDef, skillOffers } from './skills';

// ROGUELIKE: the host of one room. It owns the only real copy of the run and is the only
// thing allowed to change it; players send requests and get the new state back.
// It is plain TypeScript with no browser or network code in it, so the very same class
// runs inside the multiplayer server (online play) and inside the game (solo play).

export interface HostIO {
  /** Deliver a message to one seat (dropped silently if nobody is connected there). */
  send(seat: number, msg: ServerMsg): void;
  /** Run `fn` after `ms` (the server and the browser both have timers). Returns a canceller. */
  later(ms: number, fn: () => void): () => void;
  /** The room has nobody left in it and can be thrown away. */
  closed(): void;
  /** Milliseconds, for the run timer. */
  now?(): number;
}

/** Seconds a draft or a reward waits for a player who has dropped out before choosing for them. */
const AWAY_SECS = 25;
/** How much of its health each of the Reaper's four fights gets (of the floor's boss target). */
const REAPER_HP = [0.55, 0.65, 1.4];
/** ...and his last fight hits far harder: every spirit facing him has been supercharged. */
const REAPER_DMG = [1, 1, 2.6];
const WISPS = { room: 8, elite: 16, boss: 30, puzzle: 12, treasure: 18, skip: 10 };

interface Seat {
  key: string;
  pub: PlayerPub;
  /** Cancels the "this player never came back" timer. */
  dropTimer: (() => void) | null;
}

export class RoomHost {
  readonly state: RoomState;
  private seats: Seat[] = [];
  private rng: () => number;
  private tick: (() => void) | null = null;
  private dead = false;
  // ---- the run
  private started = 0;
  private floorBosses: string[] = [];
  private puzzles = new Map<number, PuzzleState>();
  private battle: CoopBattle | null = null;
  private battleRoom: RoomPub | null = null;
  private battleId = 0;
  private choices = new Map<number, CoopChoice>();
  private battleClock: (() => void) | null = null;
  private puzzleClock: (() => void) | null = null;
  /** What follows the rewards on screen now: back to the room, or on to the next draft. */
  private afterRewards: (() => void) | null = null;

  constructor(code: string, private io: HostIO, solo = false, seed = (Math.random() * 0x7fffffff) | 0) {
    this.state = { code, solo, phase: 'lobby', difficulty: 'normal', seed, players: [], draftRound: 0, countdown: 0, floor: null, battle: null, summary: null, bosses: [], roomsCleared: 0, rev: 0 };
    this.rng = mulberry32(seed);
  }

  get empty() {
    return this.seats.length === 0;
  }
  get inRun() {
    return this.state.phase !== 'lobby';
  }
  private now() {
    return this.io.now ? this.io.now() : Date.now();
  }

  // ------------------------------------------------------------------ joining and leaving

  /**
   * A player arrives. With a key the room already knows, they take their old seat back
   * (that is what a reconnect is). Returns the seat, or an error for the caller to relay.
   */
  join(key: string, name: string, look: number): { seat: number } | { error: ServerMsg } {
    const back = this.seats.find((s) => s.key === key);
    if (back) {
      back.dropTimer?.();
      back.dropTimer = null;
      back.pub.connected = true;
      this.note(`${back.pub.name} IS BACK.`, back.pub.seat);
      this.io.send(back.pub.seat, { t: 'welcome', seat: back.pub.seat, code: this.state.code });
      this.passHost();
      this.push();
      this.coverAbsent();
      return { seat: back.pub.seat };
    }
    if (this.inRun) return { error: { t: 'error', code: 'in_progress', msg: 'THAT RUN HAS ALREADY STARTED.' } };
    if (this.seats.length >= MAX_PLAYERS) return { error: { t: 'error', code: 'full', msg: 'THAT ROOM IS FULL.' } };
    const used = this.seats.map((s) => s.pub.seat);
    let seat = 0;
    while (used.includes(seat)) seat++;
    const pub: PlayerPub = {
      seat,
      name: this.uniqueName(cleanName(name)),
      look: ((look | 0) % 8 + 8) % 8,
      connected: true,
      host: this.seats.length === 0,
      ready: false,
      spirits: [],
      offers: [],
      pick: null,
      locked: false,
      wisps: 0,
      reward: null,
      x: 9,
      y: 6,
      dir: 's',
      bought: [],
      tally: { dmg: 0, healed: 0, downs: 0, skills: 0 },
    };
    this.seats.push({ key, pub, dropTimer: null });
    this.seats.sort((a, b) => a.pub.seat - b.pub.seat);
    this.io.send(seat, { t: 'welcome', seat, code: this.state.code });
    this.push();
    return { seat };
  }

  /** The connection to a seat was lost (not a deliberate leave). */
  disconnect(seat: number) {
    const s = this.seat(seat);
    if (!s) return;
    if (!this.inRun) return this.remove(seat);
    // mid-run: hold the seat so they can come back to the same spirits and skills
    s.pub.connected = false;
    this.note(`${s.pub.name} LOST CONNECTION. HOLDING THEIR PLACE.`);
    s.dropTimer?.();
    s.dropTimer = this.io.later(RECONNECT_GRACE * 1000, () => {
      s.dropTimer = null;
      if (!s.pub.connected && this.seats.every((x) => !x.pub.connected)) this.close();
    });
    if (!this.seats.every((x) => !x.pub.connected)) this.passHost();
    this.push();
    this.coverAbsent();
  }

  private remove(seat: number) {
    const i = this.seats.findIndex((s) => s.pub.seat === seat);
    if (i < 0) return;
    const [gone] = this.seats.splice(i, 1);
    gone.dropTimer?.();
    if (!this.seats.length) return this.close();
    if (gone.pub.host) this.passHost(true);
    this.note(`${gone.pub.name} LEFT.`);
    this.push();
  }

  /** The host role always sits with someone who is actually connected. */
  private passHost(force = false) {
    const cur = this.seats.find((s) => s.pub.host);
    if (cur && cur.pub.connected && !force) return;
    const next = this.seats.find((s) => s.pub.connected);
    if (!next) return;
    for (const s of this.seats) s.pub.host = s === next;
  }

  private close() {
    if (this.dead) return;
    this.dead = true;
    this.tick?.();
    this.battleClock?.();
    this.puzzleClock?.();
    for (const s of this.seats) s.dropTimer?.();
    this.seats = [];
    this.io.closed();
  }

  /** Leaving a run on purpose: the seat stays in the summary, but nothing waits for them any more. */
  private leaveRun(seat: number) {
    const s = this.seat(seat);
    if (!s) return;
    s.pub.connected = false;
    s.key = '';
    this.note(`${s.pub.name} LEFT THE RUN.`);
    if (this.seats.every((x) => !x.pub.connected)) return this.close();
    this.passHost();
    this.push();
    this.coverAbsent();
  }

  // ------------------------------------------------------------------ requests

  handle(seat: number, m: ClientMsg) {
    const s = this.seat(seat);
    if (!s || this.dead) return;
    const p = s.pub;
    const st = this.state;
    switch (m.t) {
      case 'ping':
        return this.io.send(seat, { t: 'pong' });
      case 'leave':
        return this.inRun ? this.leaveRun(seat) : this.remove(seat);
      case 'profile': {
        if (this.inRun) return;
        if (m.name !== undefined) {
          const n = cleanName(m.name);
          if (n !== p.name) p.name = this.uniqueName(n, seat);
        }
        if (m.look !== undefined) p.look = ((m.look | 0) % 8 + 8) % 8;
        return this.push();
      }
      case 'ready':
        if (this.inRun) return;
        p.ready = !!m.ready;
        return this.push();
      case 'difficulty':
        // one difficulty for the whole party, and only the host sets it
        if (this.inRun || !p.host || !DIFFICULTIES.includes(m.difficulty)) return;
        st.difficulty = m.difficulty;
        // a changed difficulty is a changed deal: everyone confirms again
        for (const x of this.seats) if (!x.pub.host) x.pub.ready = false;
        return this.push();
      case 'start': {
        if (this.inRun || !p.host) return;
        const waiting = this.seats.filter((x) => !x.pub.host && !x.pub.ready);
        if (waiting.length) return this.io.send(seat, { t: 'error', code: 'not_ready', msg: `WAITING FOR ${waiting.map((x) => x.pub.name).join(', ')}.` });
        return this.startRun();
      }
      case 'draft_pick': {
        if (st.phase !== 'draft' || p.locked || !p.offers.includes(m.id)) return;
        p.pick = m.id;
        return this.push();
      }
      case 'draft_lock': {
        if (st.phase !== 'draft') return;
        if (m.locked && !p.pick) return;
        p.locked = !!m.locked;
        this.push();
        return this.checkDraft();
      }
      case 'pos':
        return this.onPos(p, m.x | 0, m.y | 0, m.dir);
      case 'door':
        return this.onDoor(p, m.dir);
      case 'engage':
        return this.onEngage();
      case 'use':
        return this.onUse(p, m.what, m.i ?? 0);
      case 'push':
        return this.onPush(m.x | 0, m.y | 0, m.dir);
      case 'lead': {
        // who steps out first in the next fight
        if (st.phase !== 'dungeon' || !p.spirits[m.spirit] || m.spirit === 0) return;
        const [sp] = p.spirits.splice(m.spirit, 1);
        p.spirits.unshift(sp);
        return this.push();
      }
      case 'buy':
        return this.onBuy(p, m.item);
      case 'act':
        return this.onAct(seat, m.choice);
      case 'reward_take':
        return this.onReward(p, m.skill, m.spirit, m.replace);
      case 'dev':
        return this.onDev(m.cmd, m.arg ?? '');
      case 'reward_skip': {
        if (!p.reward) return;
        p.reward = null;
        p.wisps += this.wisps(WISPS.skip);
        this.push();
        return this.checkRewards();
      }
    }
  }

  // ------------------------------------------------------------------ the run begins

  private startRun() {
    this.started = this.now();
    // two different bosses guard the first two floors; the third is always the Grim Reaper
    const f1 = BOSSES.filter((b) => b.floors.includes(0));
    const a = f1[Math.floor(this.rng() * f1.length)];
    const f2 = BOSSES.filter((b) => b.floors.includes(1) && b.id !== a.id);
    const b = f2[Math.floor(this.rng() * f2.length)];
    this.floorBosses = [a.id, b.id];
    this.startDraft(1);
  }

  /** Deal three spirits to every player. Each player's three are different; players do not share a pool. */
  private startDraft(round: number) {
    const st = this.state;
    st.phase = 'draft';
    st.draftRound = round;
    st.battle = null;
    for (const s of this.seats) {
      const p = s.pub;
      p.ready = false;
      p.locked = false;
      p.pick = null;
      p.reward = null;
      p.offers = draftOffers(this.rng, st.difficulty, p.spirits.map((x) => x.id));
    }
    this.push();
    this.coverAbsent();
  }

  /** Everyone has confirmed: the spirits join their parties. */
  private checkDraft() {
    const st = this.state;
    if (st.phase !== 'draft') return;
    if (!this.seats.every((s) => s.pub.locked)) return;
    for (const s of this.seats) {
      const p = s.pub;
      if (p.pick && p.spirits.length < MAX_SPIRITS) p.spirits.push({ id: p.pick, hp: 1, skills: [] });
      p.offers = [];
      p.pick = null;
      p.locked = false;
    }
    this.stopCountdown();
    this.enterFloor(st.draftRound - 1);
  }

  // ------------------------------------------------------------------ floors and rooms

  private enterFloor(index: number) {
    const st = this.state;
    const n = this.seats.length;
    const d = DIFFICULTY[st.difficulty];
    const plan = buildFloor(this.rng, index, st.difficulty);
    const extra = PARTY_SCALE[n].extraEnemies;
    for (const r of plan.rooms) {
      if (r.kind === 'combat') {
        r.danger = r.risky || this.rng() < d.dangerMix;
        const pool = PACKS[index].filter((p) => !!p.danger === r.danger);
        const pack = (pool.length ? pool : PACKS[index])[Math.floor(this.rng() * (pool.length || PACKS[index].length))];
        r.foes = [...pack.foes, ...pack.extra.slice(0, extra)].slice(0, 5);
      } else if (r.kind === 'elite') {
        const pack = ELITES[Math.floor(this.rng() * ELITES.length)];
        r.foes = [...pack.foes, ...pack.extra.slice(0, extra)].slice(0, 5);
      } else if (r.kind === 'boss') r.foes = [index < 2 ? this.floorBosses[index] : REAPER_CHAIN[0]];
    }
    this.puzzles.clear();
    for (const r of plan.rooms) if (r.puzzle) this.puzzles.set(r.id, makePuzzle(r.puzzle, this.rng, index));
    st.floor = { index, name: FLOOR_NAMES[index], rooms: plan.rooms, cur: plan.start, puzzle: null };
    for (const s of this.seats) s.pub.bought = [];
    this.placeParty(CENTRE);
    st.phase = 'dungeon';
    this.push();
  }

  private room(): RoomPub | null {
    const f = this.state.floor;
    return f ? f.rooms[f.cur] : null;
  }

  private placeParty(spots: [number, number][], lead = -1) {
    const order = [...this.seats].sort((a, b) => (a.pub.seat === lead ? -1 : b.pub.seat === lead ? 1 : a.pub.seat - b.pub.seat));
    order.forEach((s, i) => {
      const [x, y] = spots[i % spots.length];
      s.pub.x = x;
      s.pub.y = y;
    });
  }

  private onPos(p: PlayerPub, x: number, y: number, dir: PlayerPub['dir']) {
    const room = this.room();
    if (this.state.phase !== 'dungeon' || !room) return;
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H || !['n', 'e', 's', 'w'].includes(dir)) return;
    // one tile at a time, and only onto floor: a player's copy of the game is not taken at its word
    if (Math.abs(x - p.x) + Math.abs(y - p.y) > 1) return this.io.send(p.seat, { t: 'pos', seat: p.seat, x: p.x, y: p.y, dir: p.dir });
    const pz = this.state.floor!.puzzle;
    const free = pz ? !puzzleBlocked(pz, x, y) : walkable(roomTemplate(room), x, y);
    if (!free) return this.io.send(p.seat, { t: 'pos', seat: p.seat, x: p.x, y: p.y, dir: p.dir });
    p.x = x;
    p.y = y;
    p.dir = dir;
    for (const s of this.seats) if (s.pub.connected && s.pub.seat !== p.seat) this.io.send(s.pub.seat, { t: 'pos', seat: p.seat, x, y, dir });
    if (pz && !pz.solved) this.puzzleStep(pz, p);
  }

  private onDoor(p: PlayerPub, dir: 'n' | 'e' | 's' | 'w') {
    const st = this.state;
    const room = this.room();
    if (st.phase !== 'dungeon' || !room || !st.floor) return;
    const to = room.doors[dir];
    if (to === undefined) return;
    // doors stay shut while there is something left to fight in here
    if (!room.cleared && (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss')) return;
    this.puzzleClock?.();
    this.puzzleClock = null;
    st.floor.cur = to;
    const next = st.floor.rooms[to];
    next.seen = true;
    st.floor.puzzle = this.puzzles.get(to) ?? null;
    if (st.floor.puzzle?.kind === 'timed' && !st.floor.puzzle.solved) {
      st.floor.puzzle.clock = 0;
      st.floor.puzzle.pressed = st.floor.puzzle.pressed!.map(() => false);
    }
    this.placeParty(ENTRY[OPPOSITE[dir]], p.seat);
    for (const s of this.seats) s.pub.dir = dir;
    this.fx('door', p.seat, st.solo ? '' : `${p.name} LEADS THE WAY.`);
    this.push();
  }

  private onEngage() {
    const room = this.room();
    if (this.state.phase !== 'dungeon' || !room || room.cleared) return;
    if (room.kind !== 'combat' && room.kind !== 'elite' && room.kind !== 'boss') return;
    this.startBattle(room, 0);
  }

  private onUse(p: PlayerPub, what: string, i: number) {
    const st = this.state;
    const room = this.room();
    if (st.phase !== 'dungeon' || !room || !st.floor) return;
    const d = DIFFICULTY[st.difficulty];
    if (what === 'chest' && room.kind === 'treasure' && !room.used) {
      room.used = true;
      room.cleared = true;
      for (const s of this.seats) s.pub.wisps += this.wisps(WISPS.treasure);
      this.fx('chest', p.seat);
      return this.giveRewards('treasure', d.eliteWeights, () => this.backToRoom());
    }
    if (what === 'fire' && room.kind === 'rest' && !room.used) {
      room.used = true;
      for (const s of this.seats) for (const sp of s.pub.spirits) sp.hp = sp.hp <= 0 ? 0.3 : Math.min(1, sp.hp + d.recoveryHeal);
      this.fx('heal', p.seat, 'THE FIRE WARMS EVERYONE. YOUR SPIRITS RECOVER.');
      return this.push();
    }
    const pz = st.floor.puzzle;
    if (!pz || pz.solved) return;
    if (what === 'obelisk' && pz.kind === 'sequence') {
      pz.shown = (pz.shown ?? 0) + 1;
      pz.progress = 0;
      this.fx('show');
      return this.push();
    }
    if (what === 'lamp' && pz.kind === 'lights' && pz.lamps && i >= 0 && i < pz.lamps.length) {
      flipLamp(pz, i);
      this.fx('right');
      return this.afterPuzzle(pz);
    }
    if (what === 'mirror' && pz.kind === 'mirrors' && pz.mirrors?.[i]) {
      pz.mirrors[i].o = pz.mirrors[i].o ? 0 : 1;
      traceBeam(pz);
      this.fx('right');
      return this.afterPuzzle(pz);
    }
  }

  private onPush(x: number, y: number, dir: PlayerPub['dir']) {
    const pz = this.state.floor?.puzzle;
    if (this.state.phase !== 'dungeon' || !pz || pz.kind !== 'plates' || pz.solved) return;
    const occupied = (ax: number, ay: number) => this.seats.some((s) => s.pub.x === ax && s.pub.y === ay);
    if (!pushBlock(pz, x, y, dir, occupied)) return;
    pz.solved = checkPlates(pz, this.seats.map((s) => [s.pub.x, s.pub.y]));
    this.afterPuzzle(pz);
  }

  /** A traveller arrived on a tile in a puzzle room. */
  private puzzleStep(pz: PuzzleState, p: PlayerPub) {
    if (pz.kind === 'plates') {
      if (!checkPlates(pz, this.seats.map((s) => [s.pub.x, s.pub.y]))) return;
      pz.solved = true;
      return this.afterPuzzle(pz);
    }
    if (pz.kind === 'sequence') {
      const i = pz.tiles!.findIndex((t) => t[0] === p.x && t[1] === p.y);
      if (i < 0) return;
      const r = stepSymbol(pz, i);
      if (r === 'idle') return;
      this.fx(r === 'wrong' ? 'wrong' : 'right', p.seat, r === 'wrong' ? 'THE SYMBOLS GO DARK. WATCH THE ORDER AGAIN.' : '');
      return this.afterPuzzle(pz);
    }
    if (pz.kind === 'timed') {
      const i = pz.switches!.findIndex((t) => t[0] === p.x && t[1] === p.y);
      if (i < 0 || pz.pressed![i]) return;
      pz.pressed![i] = true;
      this.fx('right', p.seat);
      if (pz.pressed!.every(Boolean)) {
        pz.solved = true;
        pz.clock = 0;
        this.puzzleClock?.();
        this.puzzleClock = null;
        return this.afterPuzzle(pz);
      }
      if (!pz.clock) {
        pz.clock = pz.limit!;
        const step = () => {
          this.puzzleClock = null;
          if (pz.solved || this.state.floor?.puzzle !== pz) return;
          pz.clock!--;
          if (pz.clock! <= 0) {
            pz.clock = 0;
            pz.pressed = pz.pressed!.map(() => false);
            this.fx('wrong', -1, 'THE HUM DIES AWAY. THE SWITCHES RISE AGAIN.');
          } else this.puzzleClock = this.io.later(1000, step);
          this.push();
        };
        this.puzzleClock = this.io.later(1000, step);
      }
      return this.push();
    }
  }

  private afterPuzzle(pz: PuzzleState) {
    const room = this.room()!;
    if (!pz.solved) return this.push();
    room.cleared = true;
    this.state.roomsCleared++;
    for (const s of this.seats) {
      s.pub.wisps += this.wisps(WISPS.puzzle);
      for (const sp of s.pub.spirits) if (sp.hp > 0) sp.hp = Math.min(1, sp.hp + 0.15);
    }
    this.fx('solved', -1, 'SOMETHING UNLOCKS. THE ROOM GIVES UP ITS PRIZE.');
    this.giveRewards('puzzle', DIFFICULTY[this.state.difficulty].eliteWeights, () => this.backToRoom());
  }

  private onBuy(p: PlayerPub, item: keyof typeof SHOP) {
    const room = this.room();
    const it = SHOP[item];
    if (this.state.phase !== 'dungeon' || !room || room.kind !== 'shop' || !it) return;
    if (p.bought.includes(item) || p.wisps < it.cost || p.reward) return;
    if (item === 'tonic' && p.spirits.every((s) => s.hp <= 0 || s.hp >= 1)) return;
    if (item === 'revive' && p.spirits.every((s) => s.hp > 0)) return;
    p.wisps -= it.cost;
    p.bought.push(item);
    if (item === 'tonic') for (const s of p.spirits) if (s.hp > 0) s.hp = Math.min(1, s.hp + 0.35);
    if (item === 'revive') for (const s of p.spirits) if (s.hp <= 0) s.hp = 0.5;
    if (item === 'skill') p.reward = { offers: skillOffers(this.rng, DIFFICULTY[this.state.difficulty].eliteWeights, p.spirits), source: 'shop' };
    this.fx('buy', p.seat);
    this.push();
  }

  // ------------------------------------------------------------------ developer shortcuts

  /** Targeted tests: jump straight to the thing being tested. Solo runs only. */
  private devWeak = false;
  private onDev(cmd: string, arg: string) {
    const st = this.state;
    if (!st.solo || !st.floor || (st.phase !== 'dungeon' && cmd !== 'weak')) return;
    const f = st.floor;
    const goto = (r: RoomPub) => {
      f.cur = r.id;
      r.seen = true;
      f.puzzle = this.puzzles.get(r.id) ?? null;
      this.placeParty(CENTRE.map(([x, y]) => [x, y + 3] as [number, number]));
      this.push();
    };
    switch (cmd) {
      case 'room': {
        // "combat", "elite", "treasure"..., or a puzzle by name ("mirrors")
        const r = f.rooms.find((x) => (x.kind === arg || x.puzzle === arg) && x.id !== f.cur);
        if (r) return goto(r);
        // this floor has none: turn a side room into one
        const pzk = PUZZLE_KINDS.find((k) => k === arg);
        const spare = f.rooms.find((x) => x.kind === 'puzzle' && x.id !== f.cur) ?? f.rooms.find((x) => x.kind === 'shop');
        if (pzk && spare) {
          spare.kind = 'puzzle';
          spare.puzzle = pzk;
          spare.cleared = false;
          this.puzzles.set(spare.id, makePuzzle(pzk, this.rng, f.index));
          return goto(spare);
        }
        return;
      }
      case 'boss': {
        const r = f.rooms.find((x) => x.kind === 'boss');
        if (!r) return;
        if (arg && f.index < 2 && BOSSES.some((b) => b.id === arg)) {
          r.foes = [arg];
          this.floorBosses[f.index] = arg;
        }
        r.cleared = false;
        return goto(r);
      }
      case 'floor': {
        const n = Math.max(0, Math.min(2, Number(arg) || 0));
        for (const s of this.seats) {
          while (s.pub.spirits.length < n + 1) s.pub.spirits.push({ id: draftOffers(this.rng, st.difficulty, s.pub.spirits.map((x) => x.id))[0], hp: 1, skills: [] });
        }
        st.draftRound = n + 1;
        return this.enterFloor(n);
      }
      case 'reaper': {
        // straight to one of his fights (0..2), on the last floor
        const stage = Math.max(0, Math.min(REAPER_CHAIN.length - 1, Number(arg) || 0));
        if (f.index !== 2) return;
        const r = f.rooms.find((x) => x.kind === 'boss')!;
        f.cur = r.id;
        r.seen = true;
        f.puzzle = null;
        return this.startBattle(r, stage);
      }
      case 'wisps':
        for (const s of this.seats) s.pub.wisps += 100;
        return this.push();
      case 'heal':
        for (const s of this.seats) for (const sp of s.pub.spirits) sp.hp = 1;
        return this.push();
      case 'skill': {
        const sp = this.seats[0]?.pub.spirits[0];
        if (sp && skillDef(arg) && sp.skills.length < SKILL_CAP) sp.skills.push(arg);
        return this.push();
      }
      case 'weak':
        // enemies arrive at a sliver of health (to reach the end of a fight quickly)
        this.devWeak = !this.devWeak;
        return this.note(this.devWeak ? 'DEV: ENEMIES START NEARLY DEAD.' : 'DEV: ENEMIES AT FULL HEALTH.');
    }
  }

  // ------------------------------------------------------------------ fights

  private startBattle(room: RoomPub, stage: number) {
    const st = this.state;
    const n = this.seats.length;
    const floor = st.floor!.index;
    const ps = PARTY_SCALE[n];
    const scale = roomScale(st.difficulty, n, floor);
    if (room.kind === 'elite') {
      scale.hp *= ELITE_SCALE.hp;
      scale.dmg *= ELITE_SCALE.dmg;
    }
    let foes = room.foes;
    const tune: Record<string, { hp: number; dmg: number }> = {};
    const reaper = room.kind === 'boss' && floor === 2;
    if (room.kind === 'boss') {
      if (reaper) foes = [REAPER_CHAIN[stage]];
      const def = foeDef(foes[0]);
      const t = bossScale(st.difficulty, n, floor, def.maxHp, averageTurn(def));
      if (reaper) {
        t.hp *= REAPER_HP[stage];
        t.dmg *= REAPER_DMG[stage];
      }
      tune[foes[0]] = t;
    }
    this.battle = new CoopBattle({
      sides: this.seats.map((s) => ({ seat: s.pub.seat, spirits: s.pub.spirits })),
      foes,
      scale,
      tune,
      majorTargets: ps.majorTargets,
      hazards: ps.hazards,
      phaseAdds: room.kind === 'boss' && ps.bossAdds ? [floor === 0 ? 'bonerunner' : 'hollowguard', ps.bossAdds] : undefined,
      rng: this.rng,
    });
    // his last fight: every spirit evolves before it starts (the scene shows it happen)
    if (reaper && stage === REAPER_CHAIN.length - 1) this.battle.supercharge();
    if (this.devWeak) for (const f of this.battle.foes) f.battle.b.hp = Math.max(1, Math.round(f.battle.b.maxHp * 0.06));
    this.battleRoom = room;
    st.battle = { id: ++this.battleId, kind: room.kind === 'elite' ? 'elite' : room.kind === 'boss' ? 'boss' : 'room', stage: reaper ? stage : -1, snap: this.battle.snap(), chosen: [], clock: 0, sent: 0 };
    st.phase = 'battle';
    this.push();
    this.openRound();
  }

  private sendSteps(steps: Step[]) {
    const b = this.state.battle;
    if (!b || !steps.length) return;
    for (const s of this.seats) if (s.pub.connected) this.io.send(s.pub.seat, { t: 'steps', battle: b.id, from: b.sent, steps });
    b.sent += steps.length;
    b.snap = this.battle!.snap();
  }

  /** Start-of-turn effects, then wait for everyone's move. */
  private openRound(lastBatch = 0) {
    const cb = this.battle!;
    const b = this.state.battle!;
    this.sendSteps(cb.beginRound());
    if (cb.over) return this.endBattle();
    this.choices.clear();
    b.chosen = [];
    // a clock only where other people are waiting on you; it allows for the round that is still playing out on screen
    this.battleClock?.();
    this.battleClock = null;
    b.clock = this.state.solo || this.seats.length < 2 ? 0 : ACTION_TIMEOUT + Math.round(lastBatch * 2);
    if (b.clock) {
      const step = () => {
        this.battleClock = null;
        if (this.state.battle !== b || this.battle !== cb || cb.over) return;
        b.clock--;
        if (b.clock > 0) {
          this.battleClock = this.io.later(1000, step);
          if (b.clock <= 10 || b.clock % 5 === 0) this.push();
          return;
        }
        // time is up: a sensible move is made for whoever is still deciding
        for (const s of cb.standing()) if (!this.choices.has(s.seat)) this.choices.set(s.seat, cb.auto(s.seat));
        this.resolveRound();
      };
      this.battleClock = this.io.later(1000, step);
    }
    this.push();
    this.coverAbsent();
  }

  private onAct(seat: number, c: CoopChoice) {
    const cb = this.battle;
    const b = this.state.battle;
    if (this.state.phase !== 'battle' || !cb || !b || cb.over) return;
    if (!cb.needsChoice(seat) || this.choices.has(seat)) return;
    if (!c || typeof c.a !== 'number' || typeof c.target !== 'number') return;
    this.choices.set(seat, { a: c.a | 0, target: c.target | 0, pick: c.pick === undefined ? undefined : c.pick | 0 });
    b.chosen = [...this.choices.keys()];
    if (cb.standing().every((s) => this.choices.has(s.seat))) return this.resolveRound();
    this.push();
  }

  private resolveRound() {
    const cb = this.battle!;
    this.battleClock?.();
    this.battleClock = null;
    const steps = cb.resolve(this.choices);
    this.sendSteps(steps);
    if (cb.over) return this.endBattle();
    this.openRound(steps.length);
  }

  private endBattle() {
    const cb = this.battle!;
    const st = this.state;
    const b = st.battle!;
    const room = this.battleRoom!;
    const d = DIFFICULTY[st.difficulty];
    this.battleClock?.();
    this.battleClock = null;
    const won = cb.over === 'victory';
    for (const s of this.seats) {
      const hp = cb.healthAfter(s.pub.seat);
      const t = cb.tally(s.pub.seat);
      s.pub.tally.dmg += t.dmg;
      s.pub.tally.healed += t.healed;
      s.pub.tally.downs += t.downs;
      // a spirit that fell is carried out of a won fight, barely standing
      s.pub.spirits.forEach((sp, i) => (sp.hp = hp[i] > 0 ? hp[i] : won ? 0.2 : 0));
    }
    b.snap = cb.snap();
    if (!won) return this.finish(false, cb.foes.find((f) => !f.dead)?.battle.enemy.name ?? '');
    // ---- the Grim Reaper does not fall in one fight
    if (b.stage >= 0 && b.stage < REAPER_CHAIN.length - 1) {
      for (const s of this.seats) for (const sp of s.pub.spirits) sp.hp = Math.min(1, sp.hp + 0.15);
      this.battle = null;
      return this.startBattle(room, b.stage + 1);
    }
    this.battle = null;
    room.cleared = true;
    st.roomsCleared++;
    const kind = room.kind;
    for (const s of this.seats) {
      s.pub.wisps += this.wisps(kind === 'boss' ? WISPS.boss : kind === 'elite' ? WISPS.elite : WISPS.room);
      const heal = kind === 'boss' ? 0.5 : d.roomHeal;
      for (const sp of s.pub.spirits) sp.hp = Math.min(1, Math.max(kind === 'boss' ? 0.5 : sp.hp, sp.hp + heal));
    }
    if (kind === 'boss') {
      st.bosses.push(b.stage >= 0 ? 'reaper' : room.foes[0]);
      if (b.stage >= 0) return this.finish(true, '');
      const next = st.draftRound + 1;
      return this.giveRewards('boss', d.bossWeights, () => this.startDraft(next));
    }
    this.giveRewards(kind === 'elite' ? 'elite' : 'room', kind === 'elite' ? d.eliteWeights : d.skillWeights, () => this.backToRoom());
  }

  // ------------------------------------------------------------------ rewards

  /** Every player gets their own three skills to choose from; nobody's choice touches anybody else's. */
  private giveRewards(source: RewardOffer['source'], weights: [number, number, number, number], then: () => void) {
    const st = this.state;
    for (const s of this.seats) {
      const offers = skillOffers(this.rng, weights, s.pub.spirits);
      s.pub.reward = offers.length ? { offers, source } : null;
    }
    this.afterRewards = then;
    st.battle = null;
    st.phase = 'reward';
    this.push();
    this.coverAbsent();
    this.checkRewards();
  }

  private onReward(p: PlayerPub, skill: string, spirit: number, replace?: number) {
    const r = p.reward;
    const sp = p.spirits[spirit];
    const def = skillDef(skill);
    if (!r || !sp || !def || !r.offers.includes(skill)) return;
    if (def.only && def.only !== sp.id) return;
    if (sp.skills.length >= SKILL_CAP) {
      // full: one of its skills makes way
      if (replace === undefined || !sp.skills[replace]) return;
      const rest = sp.skills.filter((_, i) => i !== replace);
      if (rest.filter((x) => x === skill).length >= (def.max ?? 1)) return;
      sp.skills[replace] = skill;
    } else {
      if (!canHold(sp, skill)) return;
      sp.skills.push(skill);
    }
    p.reward = null;
    p.tally.skills++;
    this.push();
    this.checkRewards();
  }

  private checkRewards() {
    if (this.state.phase !== 'reward') return;
    if (this.seats.some((s) => s.pub.reward)) return;
    this.stopCountdown();
    const then = this.afterRewards;
    this.afterRewards = null;
    then?.();
  }

  private backToRoom() {
    this.state.phase = 'dungeon';
    this.state.battle = null;
    this.push();
  }

  // ------------------------------------------------------------------ the end

  private finish(won: boolean, fellTo: string) {
    const st = this.state;
    this.battle = null;
    st.summary = { won, floor: st.floor?.index ?? 0, rooms: st.roomsCleared, bosses: [...st.bosses], seconds: Math.round((this.now() - this.started) / 1000), fellTo };
    st.phase = 'summary';
    for (const s of this.seats) s.pub.reward = null;
    this.stopCountdown();
    this.push();
  }

  // ------------------------------------------------------------------ nobody waits for ever

  /**
   * Whatever the run is waiting for, a player who is not there cannot hold it up: in a fight
   * their move is made at once, and in a draft or at a reward a short count runs first.
   */
  private coverAbsent() {
    const st = this.state;
    const away = this.seats.filter((s) => !s.pub.connected);
    // with nobody at all watching, the run simply waits (it is not played out for an empty room)
    if (away.length === this.seats.length) return this.stopCountdown();
    if (st.phase === 'battle' && this.battle && !this.battle.over) {
      let any = false;
      for (const s of away) {
        if (!this.battle.needsChoice(s.pub.seat) || this.choices.has(s.pub.seat)) continue;
        this.choices.set(s.pub.seat, this.battle.auto(s.pub.seat));
        any = true;
      }
      if (any) {
        st.battle!.chosen = [...this.choices.keys()];
        if (this.battle.standing().every((s) => this.choices.has(s.seat))) return this.resolveRound();
        this.push();
      }
      return;
    }
    const stuck = st.phase === 'draft' ? away.filter((s) => !s.pub.locked) : st.phase === 'reward' ? away.filter((s) => s.pub.reward) : [];
    if (!stuck.length) return this.stopCountdown();
    if (this.tick) return;
    st.countdown = AWAY_SECS;
    const step = () => {
      this.tick = null;
      if (this.state.phase !== 'draft' && this.state.phase !== 'reward') return;
      st.countdown--;
      if (st.countdown > 0) {
        this.tick = this.io.later(1000, step);
        return this.push();
      }
      st.countdown = 0;
      if (st.phase === 'draft') {
        for (const s of this.seats) {
          if (s.pub.connected || s.pub.locked) continue;
          // the best of what they were offered
          s.pub.pick = s.pub.pick ?? [...s.pub.offers].sort((a, b) => rarityRank(b) - rarityRank(a))[0] ?? null;
          s.pub.locked = !!s.pub.pick;
        }
        this.push();
        return this.checkDraft();
      }
      for (const s of this.seats) if (!s.pub.connected && s.pub.reward) {
        s.pub.reward = null;
        s.pub.wisps += this.wisps(WISPS.skip);
      }
      this.push();
      this.checkRewards();
    };
    this.tick = this.io.later(1000, step);
    this.push();
  }

  private stopCountdown() {
    this.tick?.();
    this.tick = null;
    this.state.countdown = 0;
  }

  // ------------------------------------------------------------------ helpers

  private wisps(n: number) {
    return Math.round(n * DIFFICULTY[this.state.difficulty].wisps);
  }

  private seat(seat: number) {
    return this.seats.find((s) => s.pub.seat === seat);
  }

  private uniqueName(name: string, except = -1): string {
    const taken = (n: string) => this.seats.some((s) => s.pub.seat !== except && s.pub.name === n);
    if (!taken(name)) return name;
    for (let i = 2; i < 9; i++) {
      const n = `${name.slice(0, 8)} ${i}`;
      if (!taken(n)) return n;
    }
    return name;
  }

  private note(text: string, except = -1) {
    for (const s of this.seats) if (s.pub.connected && s.pub.seat !== except) this.io.send(s.pub.seat, { t: 'note', text });
  }

  private fx(kind: Extract<ServerMsg, { t: 'fx' }>['kind'], seat = -1, text = '') {
    for (const s of this.seats) if (s.pub.connected) this.io.send(s.pub.seat, { t: 'fx', kind, seat, text });
  }

  /** Send the whole state to everyone. It is small, and it makes late joins and reconnects trivial. */
  private push() {
    if (this.dead) return;
    const st = this.state;
    st.rev++;
    st.players = this.seats.map((s) => s.pub);
    for (const s of this.seats) if (s.pub.connected) this.io.send(s.pub.seat, { t: 'state', state: st });
  }
}

const RANK: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const rarityRank = (id: string) => RANK.indexOf(rosterEntry(id).rarity);
