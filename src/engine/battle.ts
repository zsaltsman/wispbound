import type {
  ActionResult,
  BattleEvent,
  BattleStats,
  CreatureDef,
  Hit,
  Intent,
  Side,
  Status,
  StatusId,
  TickMode,
} from './types';
import { COMBO_POWER, DUTCHMAN, type BossAttackDef, type EnemyDef } from './boss';
import { PRISON_PLANS, prisonTune } from './prison';
import { FINAL_PLANS, finalTune, isFinal, ALLY_KIT, type AllyDef } from './final';
import type { AbilityDef } from './types';

/** ROGUELIKE: run skills plug into the engine through these few points (see rogue/shared/skills.ts). */
export interface SkillHook {
  /** Multiplier on every hit the spirit lands. */
  dealMult(b: Battle): number;
  /** Multiplier on damage it takes (per hit; nHits = hits in the attack). */
  takeMult(b: Battle, nHits: number): number;
  /** A hit is about to land for `dmg`: return what actually lands (a last stand can cap it). */
  lastStand(b: Battle, dmg: number, res: ActionResult): number;
  /** After an enemy attack reached the spirit. */
  afterHit(b: Battle, dealt: number, prevented: number): BattleEvent[];
  /** After the spirit used an ability (events can be pushed onto res.post). */
  afterAct(b: Battle, a: AbilityDef, res: ActionResult): void;
  /** Energy taken off an ability's cost. */
  discount?(a: AbilityDef): number;
}

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TICK: Record<StatusId, TickMode> = {
  SHIELD: 'round',
  GUARD: 'round',
  CHARGED: 'use',
  REGEN: 'tick',
  EMPOWER: 'use',
  REPRISAL: 'round',
  CANOPY: 'round',
  COMBO: 'use',
  LINKED: 'round',
  CROWNED: 'round',
  TRIBUTE: 'use',
  BLINDED: 'round',
  BOUND: 'round',
  INVERTED: 'round',
  ENRAGED: 'round',
  WARDED: 'round',
  ANCHORED: 'player',
  DROWNING: 'tick',
  FOGGED: 'player',
  VULNERABLE: 'round',
  EXPOSED: 'round',
  HEX: 'round',
  WEAKENED: 'round',
  SPOOKED: 'use',
  HAUNTED: 'round',
  DELAYED: 'use',
  WEBBED: 'round',
  SCALDED: 'tick',
  ROOTED: 'use',
  SHAKEN: 'round',
  WINDBOUND: 'tick',
  BURNING: 'round',
  SNARED: 'round',
  FORTIFIED: 'round',
  RALLIED: 'use',
};

export const STATUS_INFO: Record<StatusId, { name: string; good: boolean; icon: string }> = {
  SHIELD: { name: 'SHIELD', good: true, icon: 's_shield' },
  GUARD: { name: 'GUARD', good: true, icon: 's_guard' },
  CHARGED: { name: 'CHARGED', good: true, icon: 's_charge' },
  REGEN: { name: 'REGEN', good: true, icon: 's_regen' },
  EMPOWER: { name: 'EMPOWER', good: true, icon: 's_empower' },
  REPRISAL: { name: 'REPRISAL', good: true, icon: 's_reprisal' },
  CANOPY: { name: 'CANOPY', good: true, icon: 's_canopy' },
  COMBO: { name: 'COMBO', good: true, icon: 's_charge' },
  LINKED: { name: 'LINKED', good: true, icon: 's_reprisal' },
  CROWNED: { name: 'CROWNED', good: true, icon: 's_empower' },
  TRIBUTE: { name: 'TRIBUTE', good: true, icon: 's_rally' },
  BLINDED: { name: 'BLINDED', good: false, icon: 's_fog' },
  BOUND: { name: 'BOUND', good: false, icon: 's_snare' },
  INVERTED: { name: 'INVERTED', good: false, icon: 's_delay' },
  ENRAGED: { name: 'ENRAGED', good: true, icon: 's_rally' },
  WARDED: { name: 'WARDED', good: true, icon: 's_fort' },
  ANCHORED: { name: 'ANCHORED', good: false, icon: 's_anchor' },
  DROWNING: { name: 'DROWNING', good: false, icon: 's_drown' },
  FOGGED: { name: 'FOGGED', good: false, icon: 's_fog' },
  VULNERABLE: { name: 'VULNERABLE', good: false, icon: 's_vuln' },
  EXPOSED: { name: 'EXPOSED', good: false, icon: 's_vuln' },
  HEX: { name: 'HEX', good: false, icon: 's_hex' },
  WEAKENED: { name: 'WEAKENED', good: false, icon: 's_weak' },
  SPOOKED: { name: 'SPOOKED', good: false, icon: 's_spook' },
  HAUNTED: { name: 'HAUNTED', good: false, icon: 's_haunt' },
  DELAYED: { name: 'DELAYED', good: false, icon: 's_delay' },
  WEBBED: { name: 'WEBBED', good: false, icon: 's_web' },
  SCALDED: { name: 'SCALDED', good: false, icon: 's_scald' },
  ROOTED: { name: 'ROOTED', good: false, icon: 's_root' },
  SHAKEN: { name: 'SHAKEN', good: false, icon: 's_shaken' },
  WINDBOUND: { name: 'WINDBOUND', good: false, icon: 's_wind' },
  BURNING: { name: 'BURNING', good: false, icon: 's_burn' },
  SNARED: { name: 'SNARED', good: false, icon: 's_snare' },
  FORTIFIED: { name: 'FORTIFIED', good: true, icon: 's_fort' },
  RALLIED: { name: 'RALLIED', good: true, icon: 's_rally' },
};

export interface PlayerState {
  /** ROGUELIKE: what a spirit remembers within one battle (Nullcrown's stolen buffs). */
  mem?: Record<string, number>;
  hp: number;
  maxHp: number;
  en: number;
  maxEn: number;
  statuses: Status[];
  cd: number[];
  dmgLog: { round: number; amount: number }[];
}

interface BossState {
  hp: number;
  maxHp: number;
  statuses: Status[];
  phase: number;
  turnsInPhase: number;
  last: string[];
  cds: Record<string, number>;
  charging: string | null;
  uses: Record<string, number>;
}

export interface Availability {
  ok: boolean;
  reason: string;
}

/** The curses a foe can carry (Wispmane's PREDATOR'S MARK counts the kinds). */
const DEBUFF_KINDS: StatusId[] = ['HEX', 'WEAKENED', 'SPOOKED', 'HAUNTED', 'BURNING', 'SNARED', 'DELAYED', 'BLINDED', 'BOUND', 'INVERTED'];
/** The advantages a foe can hold (Nullcrown steals them). */
export const BOSS_BUFFS: StatusId[] = ['FORTIFIED', 'RALLIED', 'ENRAGED', 'WARDED'];
const NEGATIVE: StatusId[] = ['ANCHORED', 'DROWNING', 'FOGGED', 'VULNERABLE', 'EXPOSED', 'WEBBED', 'SCALDED', 'ROOTED', 'SHAKEN', 'WINDBOUND'];

/** One member of the player's party (World 2 fights take two). */
export interface PartyMember {
  creature: CreatureDef;
  p: PlayerState;
}

/** Big hits used to splash onto the bench (switched off: benched spirits stay at full health). */
const BENCH_SPLASH = false;

export function freshPlayer(creature: CreatureDef): PlayerState {
  return {
    hp: creature.hp,
    maxHp: creature.hp,
    en: creature.enStart,
    maxEn: creature.en,
    statuses: [],
    cd: creature.abilities.map(() => 0),
    dmgLog: [],
  };
}

export class Battle {
  /** The creature currently fighting (changes when the party swaps). */
  creature: CreatureDef;
  readonly rng: RNG;
  /** The opponent. Defaults to the Flying Dutchman. */
  readonly enemy: EnemyDef;
  /** The opponent's attack table (shortcut for enemy.attacks). */
  readonly atk: Record<string, BossAttackDef>;
  p: PlayerState;
  b: BossState;
  intent!: Intent;
  turn = 1;
  stats: BattleStats = {
    turns: 0,
    damageDealt: 0,
    damageTaken: 0,
    majorSurvived: 0,
    attacksSurvived: 0,
    healed: 0,
  };
  private _over: null | 'victory' | 'defeat' = null;
  /** Everyone fighting on the player's side; party[active] is on the field. */
  party: PartyMember[] = [];
  active = 0;
  /** The creature on the field just fell, but its partner can still fight. */
  koPending = false;
  /** Ironbud's SMALL BUT STURDY has been used up this battle (kept with the spirit, so it holds across every foe in a room). */
  private get ironHeld() {
    return !!this.p.mem?.iron;
  }
  private set ironHeld(v: boolean) {
    (this.p.mem ??= {}).iron = v ? 1 : 0;
  }
  /** The prison sizes its jailers to the party they meet (health, hits). */
  tune = { hp: 1, dmg: 1 };
  /** Flamora's REBIRTH has been used up this battle. */
  private get reborn() {
    return !!this.p.mem?.reborn;
  }
  private set reborn(v: boolean) {
    (this.p.mem ??= {}).reborn = v ? 1 : 0;
  }
  get over() {
    return this._over;
  }
  set over(v: null | 'victory' | 'defeat') {
    // a knockout only ends the fight once nobody is left standing
    if (v === 'defeat' && !this.collected && this.reserve() && this.reserve()!.p.hp > 0) {
      this.koPending = true;
      return;
    }
    this._over = v;
  }
  private followUp: string | null = null;
  private keepIntent = false;
  /** SUBJECT 9: boss turns since it last lost control of itself. */
  private meltCalm = 0;

  /** World 4: the Reaper's last attack has landed (nothing can stand back up after it). */
  collected = false;
  /** The final battle: a helper fighting beside you (their spirit acts on its own every round). */
  ally: { def: AllyDef; en: number; cd: number[]; acted: number } | null = null;
  /** Who steps in when you switch (with a big party you choose; null = the next one standing). */
  pick: number | null = null;
  /** The abilities you have used, in order (the Reaper's true form learns your rhythm). */
  playerLog: string[] = [];
  /** While an ability resolves: its damage, and its shields and heals, multiplied. */
  private pw = 1;
  private spw = 1;
  private acting = false;
  /** Damage that slips past GUARD (Shadow Step comes from behind). */
  private pierce = false;
  /** ROGUELIKE co-op: the other players' spirits on the field (team-wide effects reach them). */
  coopAllies: (() => PartyMember[]) | null = null;
  /** ROGUELIKE: damage a LINKED spirit passed along its threads in the last enemy attack. */
  linkShare = 0;
  /** ROGUELIKE: run skills of the spirit on the field (see rogue/shared/skills.ts). */
  skillHook: SkillHook | null = null;

  /** The creature the one on the field is built on (a supercharged form keeps its traits). */
  get cid(): string {
    return this.creature.base ?? this.creature.id;
  }
  /** Is this creature on the team and still standing (in front or on the bench)? */
  teamHas(id: string): boolean {
    if (this.cid === id) return true;
    return this.party.some((m) => (m.creature.base ?? m.creature.id) === id && m.p.hp > 0);
  }
  /** World 4: the Reaper was pushed past what this phase allows; it mends on its next turn. */
  private mendPending = false;

  constructor(creature: CreatureDef, rng: RNG = Math.random, enemy: EnemyDef = DUTCHMAN, partner?: CreatureDef | CreatureDef[]) {
    this.creature = creature;
    this.rng = rng;
    this.enemy = enemy;
    this.atk = enemy.attacks;
    this.p = freshPlayer(creature);
    this.party = [{ creature, p: this.p }];
    for (const c of Array.isArray(partner) ? partner : partner ? [partner] : []) this.party.push({ creature: c, p: freshPlayer(c) });
    this.tune = isFinal(enemy.id) ? finalTune(enemy.id, this.party.map((m) => m.creature)) : prisonTune(enemy.id, this.party.map((m) => m.creature.id));
    const hp0 = Math.round(enemy.maxHp * this.tune.hp);
    this.b = {
      hp: hp0,
      maxHp: hp0,
      statuses: [],
      phase: 1,
      turnsInPhase: 0,
      last: [],
      cds: {},
      charging: null,
      uses: {},
    };
    // a finisher that belongs to the opening phase waits a few turns before its first count
    const fin = TITAN_PLANS[enemy.id]?.finisher;
    if (fin && (fin.phases ?? [fin.phase]).includes(1)) this.b.cds[fin.id] = fin.first;
    this.planIntent();
  }

  // ---------------------------------------------------------------- the party

  /** Everyone on the bench (one partner in World 2 and 3, two in World 4). */
  bench(): PartyMember[] {
    return this.party.filter((_, i) => i !== this.active);
  }

  /** Index of who steps in next: the first benched creature still standing, in party order after the active one. */
  private nextIndex(): number {
    const n = this.party.length;
    for (let k = 1; k < n; k++) {
      const i = (this.active + k) % n;
      if (this.party[i].p.hp > 0) return i;
    }
    return n > 1 ? (this.active + 1) % n : -1;
  }

  /** Who steps in next: the one you picked (if still standing), else the next one standing. */
  private reserveIndex(): number {
    const p = this.pick;
    if (p !== null && p !== this.active && p >= 0 && p < this.party.length && this.party[p].p.hp > 0) return p;
    return this.nextIndex();
  }

  /** The partner who steps in next, if there is one. */
  reserve(): PartyMember | null {
    const i = this.reserveIndex();
    return i >= 0 ? this.party[i] : null;
  }

  /** Big parties: step through the bench to choose who comes in on a switch. */
  cyclePick(dir: 1 | -1): boolean {
    const n = this.party.length;
    if (n < 3) return false;
    let i = this.reserveIndex();
    for (let k = 1; k < n; k++) {
      const j = (((i + dir * k) % n) + n) % n;
      if (j !== this.active && this.party[j].p.hp > 0) {
        this.pick = j;
        return j !== i;
      }
    }
    return false;
  }

  /** Run something against a benched member's own state (statuses are per creature). */
  private onMember<T>(m: PartyMember, fn: () => T): T {
    const keepP = this.p;
    const keepC = this.creature;
    this.p = m.p;
    this.creature = m.creature;
    try {
      return fn();
    } finally {
      this.p = keepP;
      this.creature = keepC;
    }
  }

  /** A status on the whole team: the one on the field and everyone standing on the bench. */
  private teamStatus(id: StatusId, turns: number, value: number): BattleEvent[] {
    const out = [this.addStatus('player', id, turns, value)];
    const up = this.bench().filter((m) => m.p.hp > 0);
    for (const m of up) this.onMember(m, () => this.addStatus('player', id, turns, value));
    if (up.length) out.push({ t: 'msg', text: up.length > 1 ? 'IT REACHES THE WHOLE TEAM!' : `IT REACHES ${up[0].creature.name} TOO!` });
    return out;
  }

  /** ROGUELIKE: a status on everyone fighting on your side: you, your bench, and every other player's spirit on the field. */
  partyStatus(id: StatusId, turns: number, value: number, addValue = false): BattleEvent[] {
    const out = [this.addStatus('player', id, turns, value, { addValue })];
    const others = [...this.bench().filter((m) => m.p.hp > 0), ...(this.coopAllies?.() ?? []).filter((m) => m.p.hp > 0)];
    for (const m of others) this.onMember(m, () => this.addStatus('player', id, turns, value, { addValue }));
    if (others.length) out.push({ t: 'msg', text: 'IT REACHES EVERYONE ON YOUR SIDE!' });
    return out;
  }

  /** ROGUELIKE: heal whoever on your side is hurt the most (the caster counts). */
  healMostWounded(frac: number): BattleEvent[] {
    const all: PartyMember[] = [{ creature: this.creature, p: this.p }, ...this.bench(), ...(this.coopAllies?.() ?? [])].filter((m) => m.p.hp > 0);
    let best = all[0];
    for (const m of all) if (m.p.hp / m.p.maxHp < best.p.hp / best.p.maxHp) best = m;
    if (best.p === this.p) {
      const h = this.healPlayer(this.p.maxHp * frac);
      return h ? [h] : [{ t: 'msg', text: 'NOBODY NEEDS MENDING.' }];
    }
    const amt = Math.min(Math.round(best.p.maxHp * frac * this.spw), best.p.maxHp - best.p.hp);
    if (amt <= 0) return [{ t: 'msg', text: 'NOBODY NEEDS MENDING.' }];
    best.p.hp += amt;
    this.stats.healed += amt;
    return [{ t: 'msg', text: `${best.creature.name} IS STITCHED BACK TOGETHER: +${amt} HP.` }];
  }

  canSwap(): boolean {
    const r = this.reserve();
    return !this.over && !!r && r.p.hp > 0 && !this.has('player', 'WEBBED');
  }

  /** What an ability costs right now (webbing makes everything heavier). */
  costOf(i: number): number {
    const a = this.ability(i);
    return Math.max(0, a.cost + (a.cost > 0 && this.has('player', 'WEBBED') ? 1 : 0) - (this.skillHook?.discount?.(a) ?? 0));
  }

  /** Heal the partners waiting on the bench (World 3 support abilities). */
  private healReserve(frac: number): BattleEvent | null {
    const lines: string[] = [];
    for (const r of this.bench()) {
      if (r.p.hp <= 0) continue;
      const amt = Math.min(Math.round(r.p.maxHp * frac), r.p.maxHp - r.p.hp);
      if (amt <= 0) continue;
      r.p.hp += amt;
      this.stats.healed += amt;
      lines.push(`${r.creature.name} RECOVERS ${amt} HP ON THE BENCH.`);
    }
    return lines.length ? { t: 'msg', text: lines.join(' ') } : null;
  }

  /**
   * A blow so big it would reach the partners on the bench. It no longer does: a spirit
   * that has not stepped onto the field yet always comes in at full health.
   */
  private splashReserve(amount: number): BattleEvent | null {
    if (!BENCH_SPLASH) return null;
    const up = this.bench().filter((r) => r.p.hp > 1);
    if (!up.length || amount <= 0) return null;
    const lines: string[] = [];
    let last = 0;
    for (const r of up) {
      const d = Math.min(r.p.hp - 1, Math.round(amount));
      r.p.hp -= d;
      last = d;
      lines.push(`${r.creature.name} -${d}`);
    }
    return { t: 'msg', text: up.length > 1 ? `IT REACHES THE BENCH! ${lines.join('  ')} HP` : `THE SHOCKWAVE REACHES ${up[0].creature.name}! -${last} HP` };
  }

  private bringIn(i: number) {
    this.active = i;
    this.creature = this.party[i].creature;
    this.p = this.party[i].p;
  }

  /** Swap creatures as the turn's action: the foe then attacks the newcomer. */
  swapAction(): ActionResult {
    const from = this.creature.name;
    // Tintrick's rhythm does not survive leaving the field
    this.removeStatus('player', 'COMBO');
    this.bringIn(this.reserveIndex());
    this.pick = null;
    return {
      actor: 'player',
      id: 'swap',
      name: 'SWITCH',
      intro: `${from} FALLS BACK. ${this.creature.name} STEPS IN!`,
      target: 'player',
      hits: [],
      post: [],
      major: false,
    };
  }

  /** After a knockout: the partner takes the field for free. */
  swapAfterKO() {
    this.koPending = false;
    this.bringIn(this.reserveIndex());
    this.pick = null;
  }

  /**
   * The final battle, between sections: everyone stands back up, full health, energy
   * topped up, cooldowns cleared, every status gone (on both sides).
   */
  restoreParty() {
    for (const m of this.party) {
      const f = freshPlayer(m.creature);
      m.p.hp = f.hp;
      m.p.maxHp = f.maxHp;
      m.p.en = Math.max(f.en, Math.ceil(m.creature.en * 0.6));
      m.p.statuses = [];
      m.p.cd = f.cd;
      m.p.dmgLog = [];
    }
    this.b.statuses = [];
    this.b.charging = null;
    this.koPending = false;
    this.reborn = false;
    this.ironHeld = false;
    this.followUp = null;
    this.keepIntent = false;
    this.pick = null;
    this.playerLog = [];
    if (this.party[this.active].p.hp <= 0) this.bringIn(0);
  }

  /** Begin partway through (a later section of the true form): health and phase set, plan made. */
  startAt(pct: number, phase: number) {
    this.b.hp = Math.max(1, Math.round(this.b.maxHp * pct));
    this.b.phase = phase;
    this.b.turnsInPhase = 0;
    this.b.cds = {};
    const fin = TITAN_PLANS[this.enemy.id]?.finisher;
    if (fin && (fin.phases ?? [fin.phase]).includes(phase)) this.b.cds[fin.id] = fin.first;
    this.planIntent();
  }

  /** The milestone the true form is held at right now (its next threshold), or 0. */
  floorPct(): number {
    if (!this.enemy.milestones) return 0;
    return this.b.phase <= this.enemy.phaseAt.length ? this.enemy.phaseAt[this.b.phase - 1] : 0;
  }

  /** World 4: the creature on the field is held by roots and loses this turn. */
  rootedTurn(): ActionResult {
    const res: ActionResult = {
      actor: 'player',
      id: 'rooted',
      name: 'ROOTED',
      intro: `${this.creature.name} IS HELD FAST AND CANNOT MOVE!`,
      target: 'player',
      hits: [],
      post: [],
      major: false,
    };
    const e = this.removeStatus('player', 'ROOTED');
    if (e) res.post.push(e);
    this.tickMode('player', 'player', res.post);
    return res;
  }

  // ---------------------------------------------------------------- statuses

  list(side: Side): Status[] {
    return side === 'player' ? this.p.statuses : this.b.statuses;
  }

  st(side: Side, id: StatusId): Status | undefined {
    return this.list(side).find((s) => s.id === id);
  }

  has(side: Side, id: StatusId): boolean {
    return !!this.st(side, id);
  }

  addStatus(
    side: Side,
    id: StatusId,
    turns: number,
    value = 0,
    opts: { stacks?: number; maxStacks?: number; fresh?: boolean; addValue?: boolean } = {}
  ): BattleEvent {
    const l = this.list(side);
    if (this.acting && side === 'player' && (id === 'SHIELD' || id === 'REGEN')) value = Math.round(value * this.spw);
    // Nullcrown's SOVEREIGN: a foe that takes an advantage pays tribute
    if (side === 'boss' && !this.acting && BOSS_BUFFS.includes(id) && this.cid === 'nullcrown') this.p.en = Math.min(this.p.maxEn, this.p.en + 1);
    const cur = l.find((s) => s.id === id);
    if (cur) {
      cur.turns = Math.max(cur.turns, turns);
      cur.value = opts.addValue ? cur.value + value : Math.max(cur.value, value);
      if (opts.stacks) cur.stacks = Math.min(opts.maxStacks ?? 99, cur.stacks + opts.stacks);
      if (opts.fresh) cur.fresh = true;
    } else {
      l.push({
        id,
        turns,
        value,
        stacks: Math.min(opts.maxStacks ?? 99, opts.stacks ?? 1),
        tick: TICK[id],
        fresh: !!opts.fresh,
      });
    }
    return { t: 'status', target: side, id, on: true };
  }

  removeStatus(side: Side, id: StatusId): BattleEvent | null {
    const l = this.list(side);
    const i = l.findIndex((s) => s.id === id);
    if (i < 0) return null;
    l.splice(i, 1);
    return { t: 'status', target: side, id, on: false };
  }

  private tickMode(side: Side, mode: TickMode, out: BattleEvent[]) {
    for (const s of [...this.list(side)]) {
      if (s.tick !== mode) continue;
      if (s.fresh) {
        s.fresh = false;
        continue;
      }
      s.turns--;
      if (s.turns <= 0) {
        const e = this.removeStatus(side, s.id);
        if (e) out.push(e);
      }
    }
  }

  // ---------------------------------------------------------------- queries

  ability(i: number) {
    return this.creature.abilities[i];
  }

  canUse(i: number): Availability {
    const a = this.ability(i);
    if (this.over) return { ok: false, reason: 'THE BATTLE IS OVER' };
    if (a.kind === 'signature' && this.has('player', 'ANCHORED'))
      return { ok: false, reason: 'ANCHORED! SIGNATURE SEALED' };
    if (this.p.cd[i] > 0) return { ok: false, reason: `RECHARGING: ${this.p.cd[i]} TURN${this.p.cd[i] > 1 ? 'S' : ''}` };
    if (this.p.en < this.costOf(i)) return { ok: false, reason: `NEEDS ${this.costOf(i)} EN` };
    return { ok: true, reason: '' };
  }

  bossPct(): number {
    return this.b.hp / this.b.maxHp;
  }

  /** Expected damage of the current intent against the player's current defences (UI + AI). */
  estimateIntent(): { hits: number; per: number; total: number } {
    const ids = [...this.intent.combo, this.intent.id];
    let total = 0;
    let hits = 0;
    let per = 0;
    if (this.intent.stage === 'charge') return { hits: 0, per: 0, total: 0 };
    ids.forEach((id, k) => {
      const def = this.atk[id];
      const power = ids.length > 1 ? COMBO_POWER : 1;
      const n = def.hits[this.b.phase - 1];
      const base = this.attackPer(def, power, this.intent.stage === 'fire' && this.intentBroken());
      const { final } = this.mitigate(base, n, false);
      if (k === ids.length - 1) per = Math.round(base);
      hits += n;
      total += final * n;
    });
    return { hits, per, total: Math.round(total) };
  }

  intentBroken(): boolean {
    return this.intent.breakNeed > 0 && this.intent.breakDone >= this.intent.breakNeed;
  }

  // ---------------------------------------------------------------- player turn

  startPlayerTurn(): BattleEvent[] {
    const out: BattleEvent[] = [];
    if (this.over) return out;
    this.p.cd = this.p.cd.map((c) => Math.max(0, c - 1));
    const regen = Math.max(0, this.creature.regen - (this.has('player', 'ANCHORED') ? 1 : 0));
    const before = this.p.en;
    this.p.en = Math.min(this.p.maxEn, this.p.en + regen);
    if (this.p.en > before) out.push({ t: 'energy', amount: this.p.en - before });

    // Hauntcorn's ROOTED: its roots keep whoever is in front going, even from the bench
    if (this.teamHas('hauntcorn')) {
      const h = this.healPlayer(4);
      if (h) out.push(h);
    }
    if (this.cid === 'bubblotl') {
      const h = this.healPlayer(5);
      if (h) out.push(h);
    }
    // Viperwind's TAILWIND: a protected serpent catches its breath faster
    if (this.cid === 'viperwind' && (this.has('player', 'GUARD') || this.has('player', 'SHIELD') || this.has('player', 'REGEN'))) out.push(...this.gainEn(1));
    // the partners on the bench catch their breath: cooldowns run and 1 EN returns
    for (const r of this.bench()) {
      if (r.p.hp <= 0) continue;
      r.p.cd = r.p.cd.map((c) => Math.max(0, c - 1));
      r.p.en = Math.min(r.p.maxEn, r.p.en + 1);
    }
    const wind = this.st('player', 'WINDBOUND');
    if (wind && !this.over) {
      const d = Math.min(this.p.hp, wind.value);
      this.p.hp -= d;
      this.stats.damageTaken += d;
      this.p.dmgLog.push({ round: this.turn, amount: d });
      out.push({ t: 'damage', target: 'player', amount: d, source: 'WINDBOUND' });
      wind.turns--;
      if (wind.turns <= 0) out.push(this.removeStatus('player', 'WINDBOUND')!);
      if (this.p.hp <= 0) {
        this.p.hp = 0;
        this.over = 'defeat';
        return out;
      }
    }
    const regenS = this.st('player', 'REGEN');
    if (regenS) {
      const h = this.healPlayer(regenS.value);
      if (h) out.push(h);
      regenS.turns--;
      if (regenS.turns <= 0) out.push(this.removeStatus('player', 'REGEN')!);
    }
    const scald = this.st('player', 'SCALDED');
    if (scald && !this.over) {
      const d = Math.min(this.p.hp, scald.value);
      this.p.hp -= d;
      this.stats.damageTaken += d;
      this.p.dmgLog.push({ round: this.turn, amount: d });
      out.push({ t: 'damage', target: 'player', amount: d, source: 'SCALDED' });
      scald.turns--;
      if (scald.turns <= 0) out.push(this.removeStatus('player', 'SCALDED')!);
      if (this.p.hp <= 0) {
        this.p.hp = 0;
        this.over = 'defeat';
        return out;
      }
    }
    const drown = this.st('player', 'DROWNING');
    if (drown) {
      const d = Math.min(this.p.hp, drown.value);
      this.p.hp -= d;
      this.stats.damageTaken += d;
      this.p.dmgLog.push({ round: this.turn, amount: d });
      out.push({ t: 'damage', target: 'player', amount: d, source: 'DROWNING' });
      drown.turns--;
      if (drown.turns <= 0) out.push(this.removeStatus('player', 'DROWNING')!);
      if (this.p.hp <= 0) {
        this.p.hp = 0;
        this.over = 'defeat';
      }
    }
    return out;
  }

  private dealToBoss(
    base: number,
    opts: { hits?: number; crit?: number; critMult?: number; mult?: number } = {}
  ): Hit[] {
    const hits: Hit[] = [];
    const n = opts.hits ?? 1;
    const fog = (this.has('player', 'FOGGED') ? 0.7 : 1) * (this.has('player', 'SHAKEN') ? 0.75 : 1);
    const armor = (this.has('boss', 'SNARED') ? 1.25 : 1) * (this.has('boss', 'FORTIFIED') ? 0.5 : 1) * (this.has('boss', 'WARDED') ? 0.7 : 1) * this.rogueMult();
    for (let i = 0; i < n; i++) {
      if (this.b.hp <= 0) break;
      if (this.enemy.milestones && this.b.hp <= Math.floor(this.b.maxHp * this.floorPct())) break;
      const variance = 0.92 + this.rng() * 0.16;
      const crit = this.rng() < (opts.crit ?? 0.08);
      let dmg = base * this.pw * (opts.mult ?? 1) * fog * armor * variance * (crit ? opts.critMult ?? 1.5 : 1);
      dmg = Math.max(1, Math.round(dmg));
      dmg = Math.min(dmg, this.b.hp);
      dmg = this.floorCap(dmg);
      this.b.hp -= dmg;
      this.registerBossDamage(dmg);
      hits.push({ amount: dmg, absorbed: 0, crit, miss: false, graze: false });
    }
    if (this.b.hp <= 0) this.over = 'victory';
    return hits;
  }

  /** ROGUELIKE: the new spirits' own damage bonuses, the crown's decree, and run skills. */
  private rogueMult(): number {
    let m = 1;
    const crown = this.st('player', 'CROWNED');
    if (crown) m *= 1 + crown.value;
    if (this.cid === 'sootwick' && (this.has('boss', 'BURNING') || this.has('boss', 'BLINDED'))) m *= 1.15;
    if (this.cid === 'tintrick' && !this.noCombo) m *= 1 + 0.12 * (this.st('player', 'COMBO')?.stacks ?? 0);
    if (this.skillHook) m *= this.skillHook.dealMult(this);
    return m;
  }
  private noCombo = false;

  /**
   * World 4: the Reaper cannot be hurried. Each phase holds until the story reaches
   * the next one (a sliver past its threshold), and in the last phase it simply will
   * not go below a quarter. Anything past that is shrugged off, and it mends.
   */
  private floorCap(dmg: number): number {
    if (this.enemy.milestones) {
      // the true form: each section ends exactly at its milestone, never past it
      const floor = Math.floor(this.b.maxHp * this.floorPct());
      return Math.max(0, Math.min(dmg, this.b.hp - floor));
    }
    if (this.enemy.id !== 'reaper' || this.collected) return dmg;
    const b = this.b;
    const at = b.phase <= this.enemy.phaseAt.length ? this.enemy.phaseAt[b.phase - 1] - 0.025 : 0.24;
    const floor = Math.round(b.maxHp * at);
    if (b.hp - dmg >= floor) return dmg;
    this.mendPending = true;
    return Math.max(0, b.hp - floor);
  }

  private registerBossDamage(dmg: number) {
    this.stats.damageDealt += dmg;
    if (this.intent && this.intent.breakNeed > 0) this.intent.breakDone += dmg;
  }

  /** Damage that does not come from a hit (DoT, counters). */
  hurtBoss(amount: number): number {
    const d = this.floorCap(Math.min(this.b.hp, Math.round(amount)));
    this.b.hp -= d;
    this.registerBossDamage(d);
    if (this.b.hp <= 0) this.over = 'victory';
    return d;
  }

  healPlayer(n: number): BattleEvent | null {
    if (this.acting) n *= this.spw;
    const amt = Math.min(Math.round(n), this.p.maxHp - this.p.hp);
    if (amt <= 0) return null;
    this.p.hp += amt;
    this.stats.healed += amt;
    return { t: 'heal', target: 'player', amount: amt };
  }

  playerAct(i: number): ActionResult {
    this.pw = this.creature.power ?? 1;
    this.spw = this.creature.support ?? 1;
    this.acting = true;
    try {
      const res = this.playerActInner(i);
      this.playerLog.push(res.id);
      return res;
    } finally {
      this.pw = 1;
      this.spw = 1;
      this.acting = false;
    }
  }

  private playerActInner(i: number): ActionResult {
    const a = this.ability(i);
    const avail = this.canUse(i);
    if (!avail.ok) throw new Error('Ability not usable: ' + avail.reason);
    this.p.en -= this.costOf(i);
    // cd N = unusable for the next N turns (the counter drops at the start of each turn)
    this.p.cd[i] = a.cd > 0 ? a.cd + 1 : 0;
    const res: ActionResult = {
      actor: 'player',
      id: a.id,
      name: a.name,
      intro: `${this.creature.name} USED ${a.name}!`,
      target: 'boss',
      hits: [],
      post: [],
      major: a.kind === 'signature',
    };
    const post = res.post;

    // Hauntcorn's EMPOWER boosts the next ability that is not the ritual itself.
    let emp = 1;
    if (a.id !== 'corn_ritual' && this.has('player', 'EMPOWER')) {
      emp = 1.6;
      this.removeStatus('player', 'EMPOWER');
      post.push({ t: 'msg', text: 'EMPOWERED!' });
    }
    // Umbrawl's CHARGED boosts its next damaging ability.
    const takeCharge = (): { mult: number; flat: number } => {
      const c = this.st('player', 'CHARGED');
      if (!c) return { mult: 1, flat: 0 };
      this.removeStatus('player', 'CHARGED');
      return { mult: 1.6, flat: c.value };
    };

    switch (a.id) {
      // ---------------- BOOHEET
      case 'spook_bolt': {
        res.hits = this.dealToBoss(38);
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'dread_wail': {
        res.hits = this.dealToBoss(20);
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        break;
      }
      case 'peekaboo': {
        post.push(this.addStatus('boss', 'SPOOKED', 9, 0));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'night_terror': {
        const hex = this.st('boss', 'HEX')?.stacks ?? 0;
        res.hits = this.dealToBoss(34 + 18 * hex);
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
        post.push(this.addStatus('boss', 'HAUNTED', 3, 30));
        const w = this.st('boss', 'WEAKENED');
        if (w) {
          w.turns += 2;
          post.push({ t: 'msg', text: 'WEAKENED EXTENDED!' });
        }
        break;
      }
      // ---------------- SHIPWRAITH
      case 'spectral_cannon': {
        res.hits = this.dealToBoss(38);
        post.push(...this.gainEn(1));
        break;
      }
      case 'barnacle_barrier': {
        post.push(this.addStatus('player', 'SHIELD', 2, 80));
        break;
      }
      case 'batten_down': {
        post.push(this.addStatus('player', 'GUARD', 3, 0.35));
        break;
      }
      case 'dead_mans_volley': {
        post.push(this.addStatus('player', 'SHIELD', 2, 40, { addValue: true }));
        post.push(this.addStatus('player', 'REPRISAL', 1, 0));
        break;
      }
      // ---------------- HAUNTCORN
      case 'straw_lash': {
        res.hits = this.dealToBoss(48 * emp);
        const dealt = res.hits.reduce((s, h) => s + h.amount, 0);
        const h = this.healPlayer(dealt * 0.15);
        if (h) post.push(h);
        break;
      }
      case 'harvest_moon': {
        // the moon heals the scarecrow and scorches the foe
        res.hits = this.dealToBoss(14 * emp);
        const h = this.healPlayer(this.p.maxHp * 0.13 * emp);
        if (h) post.push(h);
        // the moonlight reaches the partner on the bench too
        const hr = this.healReserve(0.15 * emp);
        if (hr) post.push(hr);
        break;
      }
      case 'corn_ritual': {
        post.push(...this.gainEn(4));
        post.push(this.addStatus('player', 'SHIELD', 2, 25, { addValue: true }));
        post.push(this.addStatus('player', 'EMPOWER', 9, 0));
        break;
      }
      case 'hallowed_harvest': {
        const h = this.healPlayer(40 * emp);
        if (h) post.push(h);
        let cleansed = false;
        for (const id of NEGATIVE) {
          const e = this.removeStatus('player', id);
          if (e) {
            post.push(e);
            cleansed = true;
          }
        }
        if (cleansed) post.push({ t: 'cleanse' });
        post.push(this.addStatus('player', 'GUARD', 3, 0.3));
        post.push(this.addStatus('player', 'REGEN', 3, Math.round(8 * emp)));
        break;
      }
      // ---------------- UMBRAWL
      case 'parasol_pierce': {
        const c = takeCharge();
        res.hits = this.dealToBoss(48 * c.mult + c.flat, { crit: 0.25, critMult: 1.6 });
        post.push(...this.gainEn(1));
        post.push(...this.critRefund(res.hits));
        break;
      }
      case 'cyclone_spin': {
        const c = takeCharge();
        res.hits = this.dealToBoss(25 * c.mult + c.flat / 3, { hits: 3, crit: 0.1, critMult: 1.6 });
        post.push(...this.critRefund(res.hits));
        break;
      }
      case 'canopy_catch': {
        post.push(this.addStatus('player', 'CANOPY', 1, 0.5));
        break;
      }
      case 'monsoon_plunge': {
        const c = takeCharge();
        res.hits = this.dealToBoss(150 * c.mult + c.flat, { crit: 0.12, critMult: 1.5 });
        post.push(...this.critRefund(res.hits));
        post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
        break;
      }
      // ---------------- TICKRAITH
      case 'pendulum_crush': {
        // behind its brass casing the pendulum swings much heavier
        res.hits = this.dealToBoss(46 * (this.has('player', 'GUARD') ? 1.1 : 1));
        post.push(...this.gainEn(1));
        break;
      }
      case 'brass_casing': {
        // the casing closes around the whole team
        post.push(...this.teamStatus('GUARD', 3, 0.4));
        break;
      }
      case 'stop_the_clock': {
        // a free blow while time stands still
        res.hits = this.dealToBoss(14);
        post.push(this.addStatus('boss', 'DELAYED', 1, 0));
        break;
      }
      // ---------------- GLOWBELL
      case 'zap_sting': {
        res.hits = this.dealToBoss(42);
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'static_veil': {
        post.push(this.addStatus('player', 'SHIELD', 2, 70));
        post.push(this.addStatus('boss', 'WEAKENED', 2, 0.3));
        break;
      }
      case 'jelly_flash': {
        res.hits = this.dealToBoss(14);
        post.push(this.addStatus('boss', 'SPOOKED', 9, 0));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'tempest_bloom': {
        const hex = this.st('boss', 'HEX')?.stacks ?? 0;
        res.hits = this.dealToBoss(50 + 30 * hex);
        const e = this.removeStatus('boss', 'HEX');
        if (e) post.push(e);
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        break;
      }
      // ---------------- HAMMERFIN
      case 'fin_bash': {
        res.hits = this.dealToBoss(42);
        post.push(...this.gainEn(1));
        break;
      }
      case 'hammer_guard': {
        post.push(this.addStatus('player', 'GUARD', 3, 0.4));
        break;
      }
      case 'riptide_roar': {
        res.hits = this.dealToBoss(20);
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
        break;
      }
      case 'frenzy_ram': {
        const soaked = this.p.dmgLog.filter((d) => d.round >= this.turn - 3).reduce((s, d) => s + d.amount, 0);
        res.hits = this.dealToBoss(80 + Math.min(120, soaked * 0.6));
        break;
      }
      // ---------------- BUBBLOTL
      case 'bubble_pop': {
        res.hits = this.dealToBoss(19, { hits: 3 });
        const h = this.healPlayer(res.hits.length * 3);
        if (h) post.push(h);
        break;
      }
      case 'froth_bath': {
        const h = this.healPlayer(this.p.maxHp * 0.2);
        if (h) post.push(h);
        let cleansed = false;
        for (const id of NEGATIVE) {
          const e = this.removeStatus('player', id);
          if (e) {
            post.push(e);
            cleansed = true;
          }
        }
        if (cleansed) post.push({ t: 'cleanse' });
        post.push(this.addStatus('player', 'REGEN', 3, 12));
        break;
      }
      case 'big_bubble': {
        post.push(this.addStatus('boss', 'DELAYED', 1, 0));
        break;
      }
      case 'gill_geyser': {
        res.hits = this.dealToBoss(160, { crit: 0.1 });
        const h = this.healPlayer(25);
        if (h) post.push(h);
        break;
      }
      // ---------------- GLIDRAY
      case 'wing_slice': {
        res.hits = this.dealToBoss(38, { crit: 0.3, critMult: 1.6 });
        post.push(...this.critRefund(res.hits));
        break;
      }
      case 'moon_mantle': {
        post.push(this.addStatus('player', 'SHIELD', 2, 45, { addValue: true }));
        post.push(this.addStatus('player', 'REPRISAL', 1, 0));
        break;
      }
      case 'skylight_dive': {
        res.hits = this.dealToBoss(26, { hits: 2, crit: 0.2, critMult: 1.6 });
        post.push(...this.gainEn(2));
        post.push(...this.critRefund(res.hits));
        break;
      }
      case 'lunar_ray': {
        res.hits = this.dealToBoss(140, { crit: 0.15, critMult: 1.5 });
        post.push(this.addStatus('player', 'SHIELD', 2, 30, { addValue: true }));
        post.push(...this.critRefund(res.hits));
        break;
      }
      // ---------------- SCORVLET
      case 'ember_nip': {
        res.hits = this.dealToBoss(36, { mult: emp });
        post.push(this.addStatus('boss', 'BURNING', 3, 14));
        break;
      }
      case 'cinder_shell': {
        post.push(this.addStatus('player', 'GUARD', 2, 0.35));
        post.push(this.addStatus('player', 'SHIELD', 2, 40, { addValue: true }));
        break;
      }
      case 'smog_cloud': {
        res.hits = this.dealToBoss(16, { mult: emp });
        const bn = this.st('boss', 'BURNING');
        if (bn) bn.turns += 1;
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'stoked_sting': {
        const burn = this.st('boss', 'BURNING')?.turns ?? 0;
        res.hits = this.dealToBoss(80 + 30 * burn, { mult: emp });
        const e = this.removeStatus('boss', 'BURNING');
        if (e) post.push(e);
        const h = this.healReserve(0.15);
        if (h) post.push(h);
        break;
      }
      // ---------------- WIDOWLING
      case 'silk_snip': {
        res.hits = this.dealToBoss(26, { hits: 2, crit: 0.22, critMult: 1.6, mult: emp });
        break;
      }
      case 'venom_bite': {
        res.hits = this.dealToBoss(22, { mult: emp });
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
        break;
      }
      case 'tangle_web': {
        post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
        post.push(this.addStatus('boss', 'SPOOKED', 9, 0));
        break;
      }
      case 'eightfold_flurry': {
        res.hits = this.dealToBoss(21, { hits: 8, crit: 0.22, critMult: 1.6, mult: emp });
        break;
      }
      // ---------------- IRONBUD
      case 'tiny_tap': {
        res.hits = this.dealToBoss(40, { mult: emp });
        post.push(...this.gainEn(1));
        break;
      }
      case 'bulwark': {
        post.push(this.addStatus('player', 'GUARD', 3, 0.4));
        break;
      }
      case 'rally_clang': {
        const h = this.healPlayer(this.p.maxHp * 0.12);
        if (h) post.push(h);
        const r = this.healReserve(0.18);
        if (r) post.push(r);
        post.push(this.addStatus('player', 'EMPOWER', 9, 0));
        break;
      }
      case 'big_bonk': {
        res.hits = this.dealToBoss(95 * (this.has('player', 'GUARD') ? 1.4 : 1), { mult: emp, crit: 0.1 });
        break;
      }
      // ---------------- WISPMANE
      case 'w_claws': {
        res.hits = this.dealToBoss(24, { hits: 2, mult: emp * this.markMult() });
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'w_roar': {
        res.hits = this.dealToBoss(16, { mult: emp * this.markMult() });
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
        break;
      }
      case 'w_grasp': {
        post.push(this.addStatus('boss', 'HAUNTED', 3, 22));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
        break;
      }
      case 'w_wrath': {
        const kinds = this.debuffKinds();
        res.hits = this.dealToBoss(70 + 26 * kinds, { mult: emp * this.markMult(), crit: 0.1 });
        for (const st of this.b.statuses) if (DEBUFF_KINDS.includes(st.id)) st.turns += 1;
        if (kinds) post.push({ t: 'msg', text: 'EVERY CURSE ON IT DIGS IN DEEPER!' });
        break;
      }
      // ---------------- VIPERWIND
      case 'v_gale': {
        res.hits = this.dealToBoss(20, { hits: 2, mult: emp });
        post.push(this.addStatus('player', 'SHIELD', 2, 15, { addValue: true }));
        break;
      }
      case 'v_barrier': {
        post.push(...this.teamStatus('GUARD', 3, 0.35));
        break;
      }
      case 'v_tailwind': {
        let cleansed = false;
        for (const id of NEGATIVE) {
          const e = this.removeStatus('player', id);
          if (e) {
            post.push(e);
            cleansed = true;
          }
        }
        if (cleansed) post.push({ t: 'cleanse' });
        post.push(...this.teamStatus('REGEN', 3, 14));
        break;
      }
      case 'v_tempest': {
        res.hits = this.dealToBoss(64, { mult: emp });
        post.push(this.addStatus('player', 'SHIELD', 2, 90, { addValue: true }));
        post.push(this.addStatus('player', 'REPRISAL', 1, 0));
        const up = this.bench().filter((m) => m.p.hp > 0);
        for (const m of up) this.onMember(m, () => this.addStatus('player', 'SHIELD', 2, 40, { addValue: true }));
        if (up.length) post.push({ t: 'msg', text: 'THE WIND WRAPS AROUND THE BENCH TOO!' });
        break;
      }
      // ---------------- FLAMORA
      case 'f_talon': {
        res.hits = this.dealToBoss(42, { mult: emp });
        post.push(this.addStatus('boss', 'BURNING', 2, 12));
        break;
      }
      case 'f_veil': {
        post.push(this.addStatus('player', 'SHIELD', 2, 60, { addValue: true }));
        post.push(this.addStatus('player', 'REGEN', 3, 10));
        break;
      }
      case 'f_cry': {
        res.hits = this.dealToBoss(18, { mult: emp });
        post.push(this.addStatus('boss', 'WEAKENED', 3, 0.3));
        post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
        const h = this.healReserve(0.15);
        if (h) post.push(h);
        break;
      }
      case 'f_nova': {
        const burn = this.st('boss', 'BURNING')?.turns ?? 0;
        res.hits = this.dealToBoss(125 + 22 * burn, { mult: emp, crit: 0.1 });
        const h = this.healPlayer(this.p.maxHp * 0.15);
        if (h) post.push(h);
        const r = this.healReserve(0.15);
        if (r) post.push(r);
        break;
      }
      // ================= ROGUELIKE: the five new spirits =================
      // ---------------- SOOTWICK
      case 'soot_puff': {
        res.hits = this.dealToBoss(34);
        post.push(this.addStatus('boss', 'BLINDED', 2, 0.25));
        break;
      }
      case 'cinder_burst': {
        res.hits = this.dealToBoss(24, { hits: 2 });
        post.push(this.addStatus('boss', 'BURNING', 3, 10));
        break;
      }
      case 'choke_cloud': {
        res.hits = this.dealToBoss(14);
        post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
        post.push(this.addStatus('boss', 'WEAKENED', 2, 0.3));
        break;
      }
      case 'blackout_billow': {
        res.hits = this.dealToBoss(96, { crit: 0.1 });
        post.push(this.addStatus('boss', 'BLINDED', 3, 0.25));
        break;
      }
      // ---------------- TINTRICK
      case 'tin_jab': {
        res.hits = this.dealToBoss(19, { hits: 2, crit: 0.12 });
        post.push(...this.gainEn(1));
        post.push(this.addStatus('player', 'COMBO', 9, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'bayonet_rush': {
        res.hits = this.dealToBoss(19, { hits: 3, crit: 0.12 });
        post.push(this.addStatus('player', 'COMBO', 9, 0, { stacks: 1, maxStacks: 5 }));
        break;
      }
      case 'key_spin': {
        res.hits = this.dealToBoss(78, { crit: 0.1 });
        post.push(this.addStatus('player', 'COMBO', 9, 0, { stacks: 2, maxStacks: 5 }));
        break;
      }
      case 'final_salute': {
        // every wound-up turn of the key goes into one blow (the rhythm bonus is spent, not multiplied in)
        const stacks = this.st('player', 'COMBO')?.stacks ?? 0;
        this.noCombo = true;
        res.hits = this.dealToBoss(70 + 30 * stacks, { crit: 0.12 });
        this.noCombo = false;
        const e = this.removeStatus('player', 'COMBO');
        if (e) post.push(e);
        break;
      }
      // ---------------- MOURNINGBELL
      case 'toll': {
        res.hits = this.dealToBoss(32);
        post.push(...this.gainEn(1));
        break;
      }
      case 'dissonance': {
        res.hits = this.dealToBoss(22);
        post.push(this.addStatus('boss', 'WEAKENED', 2, 0.3));
        if (this.intent.breakNeed > 0 && !this.intentBroken()) {
          // the wrong note at the wrong moment: most of the way to breaking a charge
          this.intent.breakDone += Math.ceil(this.intent.breakNeed * 0.6);
          post.push({ t: 'msg', text: 'THE CHARGE FALTERS!' });
        }
        break;
      }
      case 'resonance': {
        post.push(...this.partyStatus('GUARD', 2, 0.3));
        this.partyStatus('SHIELD', 2, 20, true);
        break;
      }
      case 'death_knell': {
        res.hits = this.dealToBoss(105, { crit: 0.1 });
        post.push(this.addStatus('boss', 'SNARED', 3, 0.25));
        post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
        break;
      }
      // ---------------- STITCHWRAITH
      case 'thread_bind': {
        res.hits = this.dealToBoss(32);
        post.push(this.addStatus('boss', 'BOUND', 2, 0.15));
        post.push(...this.gainEn(1));
        break;
      }
      case 'soul_stitch': {
        post.push(...this.partyStatus('LINKED', 2, 0.3));
        post.push(this.addStatus('player', 'SHIELD', 2, 20, { addValue: true }));
        break;
      }
      case 'mend': {
        post.push(...this.healMostWounded(0.25));
        post.push(this.addStatus('player', 'SHIELD', 2, 20, { addValue: true }));
        break;
      }
      case 'grand_tangle': {
        res.hits = this.dealToBoss(84, { crit: 0.1 });
        post.push(this.addStatus('boss', 'BOUND', 2, 0.4));
        break;
      }
      // ---------------- NULLCROWN
      case 'sceptre_strike': {
        const buffed = BOSS_BUFFS.some((id) => this.has('boss', id));
        res.hits = this.dealToBoss(40 * (buffed ? 1.3 : 1));
        post.push(...this.gainEn(1));
        break;
      }
      case 'usurp': {
        res.hits = this.dealToBoss(24);
        let n = 0;
        for (const id of BOSS_BUFFS) {
          const e = this.removeStatus('boss', id);
          if (e) {
            post.push(e);
            n++;
          }
        }
        if (n) post.push({ t: 'msg', text: n > 1 ? `${n} ADVANTAGES TORN AWAY AND KEPT!` : 'ITS ADVANTAGE IS TORN AWAY AND KEPT!' });
        else {
          // nothing to steal: it takes the foe's strength itself
          post.push(this.addStatus('boss', 'WEAKENED', 2, 0.3));
          n = 1;
        }
        const mem = (this.p.mem ??= {});
        mem.stolen = (mem.stolen ?? 0) + n;
        post.push(this.addStatus('player', 'TRIBUTE', 9, 0, { stacks: n, maxStacks: 3 }));
        break;
      }
      case 'royal_decree': {
        const n = this.st('player', 'TRIBUTE')?.stacks ?? 0;
        this.removeStatus('player', 'TRIBUTE');
        post.push(...this.partyStatus('CROWNED', 3, 0.1 + 0.1 * n));
        this.partyStatus('SHIELD', 2, 15 + 20 * n, true);
        if (n) post.push({ t: 'msg', text: `${n} STOLEN ADVANTAGE${n > 1 ? 'S' : ''} HANDED TO YOUR SIDE!` });
        break;
      }
      case 'null_edict': {
        const stolen = Math.min(5, this.p.mem?.stolen ?? 0);
        res.hits = this.dealToBoss(85 + 20 * stolen, { crit: 0.1 });
        // what made it strong now makes it weak
        const turned: [StatusId, StatusId][] = [['FORTIFIED', 'SNARED'], ['WARDED', 'SNARED'], ['RALLIED', 'WEAKENED'], ['ENRAGED', 'WEAKENED']];
        for (const [from, to] of turned) {
          const e = this.removeStatus('boss', from);
          if (!e) continue;
          post.push(e, this.addStatus('boss', to, 2, to === 'SNARED' ? 0.25 : 0.3));
        }
        post.push(this.addStatus('boss', 'INVERTED', 2, 0));
        break;
      }
      case 'rewind': {
        const recent = this.p.dmgLog
          .filter((d) => d.round >= this.turn - 3)
          .reduce((s, d) => s + d.amount, 0);
        const h = this.healPlayer(recent * 0.8);
        if (h) post.push(h);
        // the hands snap back, and the wounds are sent back where they came from
        res.hits = this.dealToBoss(recent * 0.15);
        break;
      }
    }

    if (this.skillHook) this.skillHook.afterAct(this, a, res);
    // Player-timed debuffs (anchored, fogged) count down after each action.
    this.tickMode('player', 'player', post);
    if (this.b.hp <= 0) this.over = 'victory';
    return res;
  }

  /** How many different kinds of debuff the foe carries (Wispmane counts them). */
  private debuffKinds(): number {
    return this.b.statuses.filter((s) => DEBUFF_KINDS.includes(s.id)).length;
  }

  /** Wispmane's PREDATOR'S MARK: +8% per kind of debuff on the foe, up to +40%. */
  private markMult(): number {
    return this.cid === 'wispmane' ? 1 + Math.min(0.4, 0.08 * this.debuffKinds()) : 1;
  }

  private gainEn(n: number): BattleEvent[] {
    const before = this.p.en;
    this.p.en = Math.min(this.p.maxEn, this.p.en + n);
    return this.p.en > before ? [{ t: 'energy', amount: this.p.en - before }] : [];
  }

  private critRefund(hits: Hit[]): BattleEvent[] {
    if (!hits.some((h) => h.crit)) return [];
    return this.gainEn(2);
  }

  /** Returns the new phase if the boss crossed a threshold. */
  checkPhase(): number | null {
    if (this.over) return null;
    const pct = this.bossPct();
    let np = this.b.phase;
    this.enemy.phaseAt.forEach((at, i) => {
      if (pct <= at) np = Math.max(np, i + 2);
    });
    if (np <= this.b.phase) return null;
    // the true form's milestones come one at a time, never two at once
    if (this.enemy.milestones) np = this.b.phase + 1;
    this.b.phase = np;
    this.b.turnsInPhase = -1; // the transformation round brings it to 0
    this.b.charging = null;
    this.followUp = null;
    this.keepIntent = false;
    this.removeStatus('boss', 'DELAYED');
    return np;
  }

  // ---------------------------------------------------------------- boss turn

  private attackPer(def: BossAttackDef, power: number, broken: boolean): number {
    let per = def.dmg * (def.scaled ? this.enemy.phaseMult[this.b.phase - 1] : 1) * power * this.tune.dmg;
    if (broken) per *= 0.6;
    if (this.has('boss', 'WEAKENED')) per *= 1 - (this.st('boss', 'WEAKENED')!.value || 0.3);
    const hex = this.st('boss', 'HEX');
    if (hex) per *= 1 - 0.04 * hex.stacks;
    if (this.has('boss', 'RALLIED')) per *= 1.35;
    if (this.has('boss', 'ENRAGED')) per *= 1.25;
    const bound = this.st('boss', 'BOUND');
    if (bound) per *= 1 - (bound.value || 0.4);
    // INVERTED: the strength its later phases give it works against it instead
    if (this.has('boss', 'INVERTED')) {
      const pm = def.scaled ? this.enemy.phaseMult[this.b.phase - 1] : 1;
      per *= 0.85 / (pm * pm);
    }
    return per;
  }

  /** Applies the player's own mitigation. `withVariance` adds +-8% noise. */
  private mitigate(per: number, nHits: number, withVariance: boolean): { raw: number; final: number } {
    const raw = per * (withVariance ? 0.92 + this.rng() * 0.16 : 1);
    let m = 1;
    const guard = this.st('player', 'GUARD');
    if (guard && !this.pierce) m *= 1 - guard.value;
    if (this.has('player', 'REPRISAL')) m *= 0.5;
    if (this.has('player', 'CANOPY')) m *= 0.5;
    if (this.cid === 'tickraith' && nHits >= 4) m *= 0.8;
    if (this.cid === 'hammerfin' && nHits === 1) m *= 0.85;
    if (this.cid === 'scorvlet' && this.has('boss', 'BURNING')) m *= 0.9;
    if (this.skillHook) m *= this.skillHook.takeMult(this, nHits);
    m = Math.max(0.15, m);
    if (this.has('player', 'VULNERABLE')) m *= 1.25;
    if (this.has('player', 'EXPOSED')) m *= 1.5;
    return { raw, final: raw * m };
  }

  bossTurn(): ActionResult[] {
    if (this.over) return [];
    const mend: ActionResult[] = [];
    if (this.mendPending && this.enemy.id === 'reaper') {
      // driven too far, too fast: the dark simply fills the wounds back in
      this.mendPending = false;
      const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.05));
      if (heal > 0) {
        this.b.hp += heal;
        mend.push({
          actor: 'boss',
          id: 'reaper_mend',
          name: 'THE DARK MENDS',
          intro: 'SHADOW POURS INTO ITS WOUNDS AND THEY CLOSE.',
          target: 'boss',
          hits: [],
          post: [{ t: 'heal', target: 'boss', amount: heal }],
          major: false,
          stage: 'frozen',
        });
      }
    }
    return [...mend, ...this.bossTurnInner()];
  }

  private bossTurnInner(): ActionResult[] {
    const intent = this.intent;
    if (this.has('boss', 'DELAYED')) {
      this.removeStatus('boss', 'DELAYED');
      this.keepIntent = true;
      return [
        {
          actor: 'boss',
          id: 'frozen',
          name: 'FROZEN',
          intro: 'TIME STANDS STILL!',
          target: 'player',
          hits: [],
          post: [],
          major: false,
          stage: 'frozen',
        },
      ];
    }
    if (this.enemy.id === 'subject' && this.meltdownDue()) return [this.meltdown()];
    const def = this.atk[intent.id];
    if (intent.stage === 'charge') {
      this.b.charging = intent.id;
      if (intent.id === 'f_descent') this.addStatus('boss', 'FORTIFIED', 1, 0.45, { fresh: true });
      return [
        {
          actor: 'boss',
          id: intent.id,
          name: def.name,
          intro: this.enemy.chargeText[intent.id] ?? `${def.name} IS COMING!`,
          target: 'player',
          hits: [],
          post: [],
          major: true,
          stage: 'charge',
        },
      ];
    }
    const ids = [...intent.combo, intent.id];
    const results: ActionResult[] = [];
    let anyMajor = false;
    for (const id of ids) {
      if (this.over || this.koPending) break;
      const power = ids.length > 1 ? COMBO_POWER : 1;
      const r = this.executeAttack(id, power, intent.stage === 'fire');
      results.push(r);
      anyMajor = anyMajor || this.atk[id].major;
      this.b.last.push(id);
      this.b.cds[id] = this.atk[id].cd;
      this.b.uses[id] = (this.b.uses[id] ?? 0) + 1;
    }
    if (intent.stage === 'fire') this.b.charging = null;
    if (!this.over) {
      this.stats.attacksSurvived += results.length;
      if (anyMajor) this.stats.majorSurvived++;
    }
    return results;
  }

  /**
   * SUBJECT 9 cannot hold itself together. Never two turns running; more often as it
   * weakens; and never more than five calm turns in a row.
   */
  private meltdownDue(): boolean {
    this.meltCalm++;
    if (this.meltCalm < 2) return false;
    const chance = this.meltCalm >= 6 ? 1 : 0.12 + 0.05 * (this.b.phase - 1);
    if (this.rng() >= chance) return false;
    this.meltCalm = 0;
    return true;
  }

  /** It loses control: it hurts itself and is wide open for two turns. A charge fizzles. */
  private meltdown(): ActionResult {
    const fire = this.intent.stage === 'fire';
    const res: ActionResult = {
      actor: 'boss',
      id: 'meltdown',
      name: 'LOSES CONTROL',
      intro: fire ? 'THE LIGHT INSIDE IT GOES WILD. IT CANNOT HOLD IT!' : 'IT LOSES CONTROL OF ITS OWN ENERGY!',
      target: 'boss',
      hits: [],
      post: [],
      major: false,
      stage: 'normal',
    };
    const dmg = Math.min(this.b.hp - 1, Math.round(this.b.maxHp * (fire ? 0.07 : 0.045)));
    if (dmg > 0) {
      this.b.hp -= dmg;
      res.post.push({ t: 'damage', target: 'boss', amount: dmg, source: 'RECOIL' });
    }
    res.post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
    res.post.push({ t: 'msg', text: fire ? 'CRITICAL MASS FIZZLES OUT! IT IS WIDE OPEN!' : 'IT IS WIDE OPEN! HIT IT WHILE IT IS UNSTABLE!' });
    // whatever it meant to do, it still means to do it next turn (unless that was the burst)
    if (fire) this.b.charging = null;
    else this.keepIntent = true;
    this.b.last.push('meltdown');
    return res;
  }

  private executeAttack(id: string, power: number, fireStage: boolean): ActionResult {
    const def = this.atk[id];
    const phase = this.b.phase;
    const n = def.hits[phase - 1];
    const broken = fireStage && this.intentBroken();
    const per = this.attackPer(def, power, broken);
    const res: ActionResult = {
      actor: 'boss',
      id,
      name: def.name,
      intro: `THE FLYING DUTCHMAN USES ${def.name}!`,
      target: 'player',
      hits: [],
      post: [],
      major: def.major,
      stage: fireStage ? 'fire' : 'normal',
      power,
    };
    if (broken) res.post.push({ t: 'break', id });

    const spooked = !!this.st('boss', 'SPOOKED');
    if (spooked) this.removeStatus('boss', 'SPOOKED');
    const hasShield = () => {
      const s = this.st('player', 'SHIELD');
      return s && s.value > 0 ? s : undefined;
    };
    const defended =
      !!hasShield() ||
      this.has('player', 'GUARD') ||
      this.has('player', 'CANOPY') ||
      this.has('player', 'REPRISAL');

    if (id === 'final_collection') {
      // everything, all at once: no shield, no guard and no bench can hold it
      this.collected = true;
      for (const m of this.party) {
        const d = m.p.hp;
        m.p.hp = 0;
        this.stats.damageTaken += d;
        if (m.p === this.p) res.hits.push({ amount: d, absorbed: 0, crit: false, miss: false, graze: false });
      }
      this._over = 'defeat';
      return res;
    }

    this.pierce = id === 'g_step';
    if (id === 'b_breaker' && !spooked) {
      let broke = false;
      for (const sid of ['SHIELD', 'GUARD', 'REPRISAL', 'CANOPY'] as StatusId[]) {
        const e = this.removeStatus('player', sid);
        if (e) {
          res.post.push(e);
          broke = true;
        }
      }
      if (broke) res.post.push({ t: 'msg', text: 'HE RIPS YOUR DEFENCES AWAY!' });
    }

    let prevented = 0;
    let swallowed = 0;
    let dealt = 0;
    let absorbedAny = false;
    this.linkShare = 0;
    const blinded = this.has('boss', 'BLINDED');
    const link = this.st('player', 'LINKED');
    for (let i = 0; i < n; i++) {
      if (this.p.hp <= 0) break;
      // BLINDED: one hit in four goes wide
      if (blinded && this.rng() < 0.25) {
        res.hits.push({ amount: 0, absorbed: 0, crit: false, miss: true, graze: false });
        continue;
      }
      if (spooked && n > 1 && i % 2 === 0) {
        res.hits.push({ amount: 0, absorbed: 0, crit: false, miss: true, graze: false });
        continue;
      }
      const graze = spooked && n === 1;
      const { raw, final } = this.mitigate(per * (graze ? 0.5 : 1), n, true);
      let dmg = Math.round(final);
      let absorbed = 0;
      const sh = hasShield();
      if (sh) {
        absorbed = Math.min(sh.value, dmg);
        sh.value -= absorbed;
        dmg -= absorbed;
        if (absorbed > 0) absorbedAny = true;
        if (sh.value <= 0) {
          this.removeStatus('player', 'SHIELD');
          res.post.push({ t: 'msg', text: 'THE SHIELD SHATTERS!' });
        }
      }
      if (this.has('player', 'CANOPY')) swallowed += raw - final;
      prevented += Math.max(0, raw - dmg);
      if (link && dmg > 0) {
        // LINKED: part of the blow runs down the threads to the others
        const share = Math.round(dmg * (link.value || 0.3));
        dmg -= share;
        this.linkShare += share;
      }
      if (this.skillHook) dmg = this.skillHook.lastStand(this, dmg, res);
      dmg = Math.min(dmg, this.p.hp);
      if (dmg >= this.p.hp && this.cid === 'ironbud' && !this.ironHeld) {
        // SMALL BUT STURDY: it refuses to fall, once
        this.ironHeld = true;
        dmg = this.p.hp - 1;
        res.post.push({ t: 'msg', text: 'IRONBUD REFUSES TO FALL!' });
      }
      this.p.hp -= dmg;
      dealt += dmg;
      this.stats.damageTaken += dmg;
      res.hits.push({ amount: dmg, absorbed, crit: false, miss: false, graze });
    }
    this.pierce = false;
    if (dealt > 0) this.p.dmgLog.push({ round: this.turn, amount: dealt });
    // Tintrick: a heavy blow knocks it out of its rhythm
    const combo = this.st('player', 'COMBO');
    if (combo && def.major && dealt > 0) {
      combo.stacks -= 2;
      if (combo.stacks <= 0) this.removeStatus('player', 'COMBO');
      res.post.push({ t: 'msg', text: 'THE RHYTHM BREAKS!' });
    }
    // Mourningbell's CRACKED BRONZE: striking it sets the attacker's teeth ringing
    if (this.cid === 'mourningbell' && dealt > 0 && this.p.hp > 0 && this.rng() < 0.25) {
      res.post.push(this.addStatus('boss', 'WEAKENED', 1, 0.3, { fresh: true }), { t: 'msg', text: 'THE BELL RINGS UNDER THE BLOW. THE ATTACKER REELS!' });
    }
    if (this.skillHook && dealt > 0) res.post.push(...this.skillHook.afterHit(this, dealt, prevented));
    if (this.p.hp <= 0 && this.cid === 'flamora' && !this.reborn && !this.collected) {
      // REBIRTH: it burns down to ash, and rises out of it
      this.reborn = true;
      this.p.hp = Math.round(this.p.maxHp * 0.4);
      res.post.push({ t: 'msg', text: 'FLAMORA BURNS TO ASH... AND RISES AGAIN!' }, { t: 'heal', target: 'player', amount: this.p.hp });
    }
    if (this.p.hp <= 0) {
      this.p.hp = 0;
      this.over = 'defeat';
      return res;
    }

    // Riders
    if (spooked) {
      res.post.push({ t: 'msg', text: 'SPOOKED! THE ATTACK FUMBLED.' });
    } else {
      switch (id) {
        case 'anchor':
          res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'tide':
          if (defended) res.post.push({ t: 'msg', text: 'YOUR DEFENSES HOLD BACK THE TIDE!' });
          else res.post.push(this.addStatus('player', 'DROWNING', 3, Math.round(9 * this.enemy.phaseMult[phase - 1])));
          break;
        case 'siphon': {
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * 1.5));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          } else res.post.push({ t: 'msg', text: 'THE CHAINS FIND NOTHING TO DRINK!' });
          break;
        }
        case 'fog':
          res.post.push(this.addStatus('player', 'FOGGED', 3, 0));
          break;
        case 'hook':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'maelstrom':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        // The Kraken
        case 'ink':
          res.post.push(this.addStatus('player', 'FOGGED', 2, 0));
          break;
        case 'whirlpool':
          if (defended) res.post.push({ t: 'msg', text: 'YOU HOLD AGAINST THE CURRENT!' });
          else res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'grasp':
          res.post.push(this.addStatus('player', 'DROWNING', 3, Math.round(10 * this.enemy.phaseMult[phase - 1])));
          break;
        case 'abyss_gaze':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.3, { fresh: true }));
          break;
        // World 3: Scorvex
        case 'pounce':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'ground_breaker':
          if (defended) res.post.push({ t: 'msg', text: 'YOU KEEP YOUR FOOTING!' });
          else res.post.push(this.addStatus('player', 'ANCHORED', 1, 0));
          break;
        case 'furnace_tail':
          res.post.push(this.addStatus('player', 'SCALDED', 3, Math.round(12 * this.enemy.phaseMult[phase - 1])));
          break;
        case 'molten_sweep':
          res.post.push(this.addStatus('player', 'SCALDED', 2, Math.round(8 * this.enemy.phaseMult[phase - 1])));
          break;
        case 'smokestack':
          res.post.push(this.addStatus('player', 'FOGGED', 2, 0));
          break;
        // World 3: Widowmaker
        case 'web_trap':
          res.post.push(this.addStatus('player', 'WEBBED', 2, 0));
          break;
        case 'impale':
          res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'lunge':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'frenzy':
          res.post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
          break;
        // World 3: Ironclad
        case 'quake': {
          if (!defended) res.post.push(this.addStatus('player', 'ANCHORED', 1, 0));
          const sp = this.splashReserve(dealt * 0.3);
          if (sp) res.post.push(sp);
          break;
        }
        case 'fortress':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 2, 0.6));
          res.post.push({ t: 'msg', text: 'IRONCLAD LOCKS ITS ARMOR. HITS BARELY DENT IT!' });
          break;
        case 'command': {
          res.post.push(this.addStatus('boss', 'RALLIED', 9, 0.35));
          for (const sid of ['WEAKENED', 'SPOOKED'] as StatusId[]) {
            const e = this.removeStatus('boss', sid);
            if (e) res.post.push(e);
          }
          break;
        }
        case 'grip':
          res.post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
          break;
        case 'judgment': {
          const sp = this.splashReserve(dealt * 0.4);
          if (sp) res.post.push(sp);
          break;
        }
        // ---------------------------------------------------------- World 4
        case 'ground_slam': {
          const sp = this.splashReserve(dealt * 0.65);
          if (sp) res.post.push(sp);
          break;
        }
        case 'root_trap':
        case 'natures_grasp':
          if (defended) res.post.push({ t: 'msg', text: 'YOU TEAR FREE OF THE ROOTS!' });
          else res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `${this.creature.name} IS ROOTED TO THE SPOT!` });
          break;
        case 'crushing_grip':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'forest_rage':
          res.post.push(this.addStatus('boss', 'RALLIED', 9, 0.35), { t: 'msg', text: 'ITS ATTACKS GROW EVEN STRONGER!' });
          break;
        case 'ancient_growth': {
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.05));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          } else res.post.push({ t: 'msg', text: 'IT IS ALREADY WHOLE.' });
          break;
        }
        case 'forest_roar':
        case 'screech':
          res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          break;
        case 'overgrowth':
        case 'whirlwind_spin':
        case 'cyclone_rush': {
          const sp = this.splashReserve(dealt * 0.32);
          if (sp) res.post.push(sp);
          break;
        }
        case 'natures_wrath':
        case 'forestquake': {
          const sp = this.splashReserve(dealt * 0.55);
          if (sp) res.post.push(sp);
          if (id === 'forestquake' && !defended && this.p.hp > 0) res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `${this.creature.name} IS KNOCKED OFF ITS FEET!` });
          break;
        }
        case 'wing_gust': {
          const sp = this.splashReserve(dealt * 0.4);
          if (sp) res.post.push(sp);
          break;
        }
        case 'diving_strike':
        case 'branch_leap':
        case 'skyfall':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'blackout_storm': {
          res.post.push(...this.teamStatus('FOGGED', 2, 0));
          const sp = this.splashReserve(dealt * 0.35);
          if (sp) res.post.push(sp);
          break;
        }
        case 'tail_slam':
          if (!defended) res.post.push(this.addStatus('player', 'ANCHORED', 1, 0));
          break;
        case 'tornado_trap':
          if (defended) res.post.push({ t: 'msg', text: 'YOU BRACE AGAINST THE WIND!' });
          else res.post.push(this.addStatus('player', 'WINDBOUND', 3, Math.round(14 * this.enemy.phaseMult[phase - 1])));
          break;
        case 'wind_barrier':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 2, 0.5), { t: 'msg', text: 'A WALL OF WIND SURROUNDS IT. HITS ARE BLOWN ASIDE!' });
          break;
        case 'tempest': {
          const sp = this.splashReserve(dealt * 0.5);
          if (sp) res.post.push(sp);
          if (!defended) res.post.push(this.addStatus('player', 'WINDBOUND', 2, Math.round(12 * this.enemy.phaseMult[phase - 1])));
          break;
        }
        case 'soul_drain': {
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * 1.2));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          }
          break;
        }
        case 'shadow_step':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 1, 0.5), { t: 'msg', text: 'IT SLIPS INTO THE SHADOWS. IT IS HARD TO HIT!' });
          break;
        case 'graveyard':
          if (!defended) res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'judgment_r':
          res.post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
          break;
        case 'blackout':
          res.post.push(...this.teamStatus('FOGGED', 3, 0));
          break;
        case 'soul_chains':
          res.post.push(...this.teamStatus('WEBBED', 2, 0));
          res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'deaths_approach': {
          const sp = this.splashReserve(dealt * 0.25);
          if (sp) res.post.push(sp);
          break;
        }
        // ---------------------------------------------------------- SUBJECT 9
        case 'overcharge':
        case 'critical_mass': {
          const sp = this.splashReserve(dealt * (id === 'critical_mass' ? 0.45 : 0.5));
          if (sp) res.post.push(sp);
          break;
        }
        case 'arc_lash':
          if (!defended && this.rng() < 0.35) res.post.push(this.addStatus('player', 'SHAKEN', 1, 0.25), { t: 'msg', text: `${this.creature.name} IS LEFT TWITCHING!` });
          break;
        case 'drain_grip': {
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * 0.8));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          }
          break;
        }
        case 'static_howl':
          res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          break;
        // ---------------------------------------------------------- the prison
        case 'lockdown':
        case 'barnacle_bastion':
        case 'brass_tomb':
        case 'canopy_dome':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 2, 0.5), { t: 'msg', text: id === 'lockdown' ? 'HITS CLANG OFF THE CELL DOOR!' : 'IT IS BARELY SCRATCHED BY ANYTHING NOW!' });
          if (id === 'barnacle_bastion')
          {
            const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.04));
            if (heal > 0) {
              this.b.hp += heal;
              res.post.push({ t: 'heal', target: 'boss', amount: heal });
            }
          }
          break;
        case 'shackles':
        case 'smother':
          if (defended) res.post.push({ t: 'msg', text: 'YOU SHAKE IT OFF!' });
          else res.post.push(this.addStatus('player', 'ANCHORED', 2, 0), { t: 'msg', text: `${this.creature.name} CANNOT USE ITS SIGNATURE!` });
          break;
        case 'bone_rattle':
        case 'dread_howl': {
          res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          if (id === 'dread_howl') {
            const sp = this.splashReserve(dealt * 0.4);
            if (sp) res.post.push(sp);
          }
          break;
        }
        case 'solitary':
        case 'parasol_lance':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          break;
        case 'lights_out':
        case 'dead_fleet':
        case 'hallowed_reaping':
        case 'midnight_toll': {
          const sp = this.splashReserve(dealt * 0.5);
          if (sp) res.post.push(sp);
          if (id === 'hallowed_reaping')
          {
            const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * 0.25));
            if (heal > 0) {
              this.b.hp += heal;
              res.post.push({ t: 'heal', target: 'boss', amount: heal });
            }
          }
          break;
        }
        case 'night_terror_x': {
          res.post.push(...this.teamStatus('FOGGED', 2, 0));
          const sp = this.splashReserve(dealt * 0.55);
          if (sp) res.post.push(sp);
          break;
        }
        case 'monsoon_end': {
          const sp = this.splashReserve(dealt * 0.6);
          if (sp) res.post.push(sp);
          break;
        }
        case 'peekaboo_x':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 1, 0.5), { t: 'msg', text: 'IT IS EVERYWHERE AND NOWHERE. HARD TO HIT!' });
          break;
        case 'batten_all':
          res.post.push(this.addStatus('boss', 'RALLIED', 3, 0.35), this.addStatus('boss', 'FORTIFIED', 1, 0.5), { t: 'msg', text: 'ITS NEXT ATTACK WILL BE MUCH STRONGER!' });
          break;
        case 'sunken_anchor': {
          if (!defended) res.post.push(this.addStatus('player', 'ANCHORED', 1, 0));
          const sp = this.splashReserve(dealt * 0.4);
          if (sp) res.post.push(sp);
          break;
        }
        case 'straw_scythe':
          {
            const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * 0.15));
            if (heal > 0) {
              this.b.hp += heal;
              res.post.push({ t: 'heal', target: 'boss', amount: heal });
            }
          }
          break;
        case 'blood_moon':
          {
            const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.06));
            if (heal > 0) {
              this.b.hp += heal;
              res.post.push({ t: 'heal', target: 'boss', amount: heal });
            }
          }
          res.post.push(this.addStatus('boss', 'RALLIED', 3, 0.35));
          break;
        case 'corn_maze':
          res.post.push(...this.teamStatus('WEBBED', 2, 0), { t: 'msg', text: 'LOST IN THE CORN! NO SWITCHING, AND EVERYTHING COSTS MORE!' });
          break;
        case 'crow_swarm':
        case 'cyclone_vortex': {
          const sp = this.splashReserve(dealt * 0.3);
          if (sp) res.post.push(sp);
          if (id === 'crow_swarm') res.post.push(this.addStatus('player', 'SHAKEN', 1, 0.25));
          break;
        }
        case 'lightning_rod':
          res.post.push(this.addStatus('boss', 'RALLIED', 3, 0.35), { t: 'msg', text: 'LIGHTNING CRACKLES DOWN THE SHAFT. ITS NEXT BLOW IS CHARGED!' });
          break;
        case 'time_stop':
          if (defended) res.post.push({ t: 'msg', text: 'YOU KEEP MOVING, JUST BARELY!' });
          else res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `TIME STOPS FOR ${this.creature.name}!` });
          break;
        case 'rewind_x':
          {
            const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.07));
            if (heal > 0) {
              this.b.hp += heal;
              res.post.push({ t: 'heal', target: 'boss', amount: heal });
            }
          }
          for (const sid of ['WEAKENED', 'SNARED', 'HAUNTED', 'BURNING'] as StatusId[]) {
            const e = this.removeStatus('boss', sid);
            if (e) res.post.push(e);
          }
          res.post.push({ t: 'msg', text: 'ITS WOUNDS AND CURSES UNWIND!' });
          break;
        // ---------------------------------------------------------- the God of Death
        case 'g_reap':
        case 'b_scythe':
        case 'g_harvest':
        case 't_wings':
        case 'f_spider': {
          const sp = this.splashReserve(dealt * (id === 'b_scythe' ? 0.6 : id === 'f_spider' ? 0.55 : id === 't_wings' ? 0.6 : id === 'g_harvest' ? 0.5 : 0.4));
          if (sp) res.post.push(sp);
          break;
        }
        case 'g_grasp':
          if (defended) res.post.push({ t: 'msg', text: 'YOU TEAR FREE OF THE HANDS!' });
          else res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `THE HANDS HOLD ${this.creature.name} DOWN!` });
          break;
        case 'g_step':
          res.post.push({ t: 'msg', text: 'HE STRIKES FROM BEHIND YOUR GUARD!' });
          break;
        case 'g_drain':
        case 't_harvest':
        case 'f_devour': {
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(dealt * (id === 'g_drain' ? 1 : 1.1)));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          }
          if (id === 'g_drain' && this.p.en > 0) {
            const lost = Math.min(2, this.p.en);
            this.p.en -= lost;
            res.post.push({ t: 'msg', text: `HE DRINKS ${lost} EN OUT OF ${this.creature.name}!` });
          }
          if (id === 'f_devour') {
            if (defended) res.post.push({ t: 'msg', text: 'YOU HOLD ON TO YOUR STRENGTH!' });
            else if (this.p.en > 0) {
              this.p.en = 0;
              res.post.push({ t: 'msg', text: `HE DEVOURS EVERY LAST DROP OF ${this.creature.name}'S ENERGY!` });
            }
          }
          break;
        }
        case 'g_mark':
        case 't_mark':
          res.post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
          if (id === 't_mark') res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          break;
        case 'g_knell':
        case 'b_roar':
          res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          break;
        case 'g_storm':
        case 't_storm':
        case 'b_stomp': {
          const sp = this.splashReserve(dealt * 0.28);
          if (sp) res.post.push(sp);
          break;
        }
        case 'b_punch':
        case 'f_descent':
          res.post.push(this.addStatus('player', 'VULNERABLE', 1, 0.25, { fresh: true }));
          if (id === 'f_descent') {
            const sp = this.splashReserve(dealt * 0.3);
            if (sp) res.post.push(sp);
          }
          break;
        case 'b_quake': {
          const sp = this.splashReserve(dealt * 0.5);
          if (sp) res.post.push(sp);
          if (!defended) res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `${this.creature.name} IS THROWN OFF ITS FEET!` });
          break;
        }
        case 'b_crush':
        case 't_lance':
          if (defended) res.post.push({ t: 'msg', text: 'YOU WRENCH YOURSELF FREE!' });
          else res.post.push(this.addStatus('player', 'ANCHORED', 2, 0), { t: 'msg', text: `${this.creature.name} CANNOT USE ITS SIGNATURE!` });
          break;
        case 'b_flex':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 2, 0.5), this.addStatus('boss', 'RALLIED', 3, 0.35), { t: 'msg', text: 'A WALL OF MUSCLE! HITS BARELY DENT HIM, AND HIS NEXT BLOW WILL BE HUGE!' });
          break;
        case 'b_fury': {
          const sp = this.splashReserve(dealt * 0.3);
          if (sp) res.post.push(sp);
          break;
        }
        case 't_gale': {
          res.post.push(...this.teamStatus('FOGGED', 2, 0));
          const sp = this.splashReserve(dealt * 0.4);
          if (sp) res.post.push(sp);
          break;
        }
        case 't_crown': {
          let any = false;
          for (const sid of ['WEAKENED', 'HEX', 'SNARED', 'HAUNTED', 'BURNING', 'SPOOKED'] as StatusId[]) {
            const e = this.removeStatus('boss', sid);
            if (e) {
              res.post.push(e);
              any = true;
            }
          }
          res.post.push(this.addStatus('boss', 'RALLIED', 3, 0.35), { t: 'msg', text: any ? 'YOUR CURSES BURN AWAY IN THE LIGHT OF THE CROWN!' : 'THE CROWN BLAZES. HIS NEXT BLOW WILL BE HUGE!' });
          break;
        }
        case 't_eclipse':
        case 'f_extinction': {
          const sp = this.splashReserve(dealt * 0.5);
          if (sp) res.post.push(sp);
          if (id === 't_eclipse') res.post.push(...this.teamStatus('FOGGED', 2, 0));
          break;
        }
        case 'f_twin': {
          const sp = this.splashReserve(dealt * 0.2);
          if (sp) res.post.push(sp);
          break;
        }
        case 'f_legs':
          if (defended) res.post.push({ t: 'msg', text: 'YOU SLIP BETWEEN THE LEGS!' });
          else res.post.push(this.addStatus('player', 'ROOTED', 1, 0), { t: 'msg', text: `${this.creature.name} IS CAGED!` });
          break;
        case 'f_chains':
          res.post.push(...this.teamStatus('WEBBED', 2, 0), { t: 'msg', text: 'CHAINED! NO SWITCHING, AND EVERYTHING COSTS MORE!' });
          break;
        case 'f_shroud': {
          res.post.push(this.addStatus('boss', 'FORTIFIED', 2, 0.6));
          const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * 0.03));
          if (heal > 0) {
            this.b.hp += heal;
            res.post.push({ t: 'heal', target: 'boss', amount: heal });
          }
          res.post.push({ t: 'msg', text: 'THE WINGS CLOSE AROUND HIM. HITS SKID OFF THEM!' });
          break;
        }
        case 'f_foresee':
          res.post.push(this.addStatus('boss', 'FORTIFIED', 1, 0.7), this.addStatus('boss', 'RALLIED', 3, 0.35), { t: 'msg', text: 'HE HAS LEARNED YOUR RHYTHM! MIX IT UP!' });
          break;
        case 'f_crown': {
          res.post.push(...this.teamStatus('SHAKEN', 2, 0.25));
          const sp = this.splashReserve(dealt * 0.7);
          if (sp) res.post.push(sp);
          break;
        }
        // Slick Rick
        case 'oil':
          if (defended) res.post.push({ t: 'msg', text: 'YOU KEEP YOUR FOOTING!' });
          else res.post.push(this.addStatus('player', 'ANCHORED', 2, 0));
          break;
        case 'pitch':
          res.post.push(this.addStatus('player', 'EXPOSED', 1, 0.5));
          break;
      }
    }

    // ROGUELIKE: effects written as data on the attack itself
    if (def.fx && !(this.p.hp <= 0)) {
      const landed = def.dmg === 0 || dealt > 0 || absorbedAny;
      if (def.fx.status && landed && !spooked && !(def.fx.unlessDefended && defended)) {
        for (const [sid, turns, value] of def.fx.status) res.post.push(this.addStatus('player', sid as StatusId, turns, value, { fresh: true }));
      } else if (def.fx.status && def.fx.unlessDefended && defended) res.post.push({ t: 'msg', text: 'YOUR DEFENCES KEEP IT OFF!' });
      if (def.fx.self) for (const [sid, turns, value] of def.fx.self) res.post.push(this.addStatus('boss', sid as StatusId, turns, value, { fresh: true }));
      if (def.fx.heal && this.b.hp > 0) {
        const heal = Math.min(this.b.maxHp - this.b.hp, Math.round(this.b.maxHp * def.fx.heal));
        if (heal > 0) {
          this.b.hp += heal;
          res.post.push({ t: 'heal', target: 'boss', amount: heal });
        }
      }
      if (def.fx.say) res.post.push({ t: 'msg', text: def.fx.say });
    }

    if (this.has('boss', 'RALLIED') && def.dmg > 0) {
      const e = this.removeStatus('boss', 'RALLIED');
      if (e) res.post.push(e);
    }
    if (absorbedAny && this.cid === 'shipwraith') res.post.push(...this.gainEn(1));
    // Glowbell's static skin: blows that land on its shield charge the attacker with HEX
    if (absorbedAny && this.cid === 'glowbell') res.post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));

    if (this.has('player', 'CANOPY')) {
      this.removeStatus('player', 'CANOPY');
      res.post.push({ t: 'msg', text: 'THE CANOPY SWALLOWS THE BLOW!' });
      res.post.push(this.addStatus('player', 'CHARGED', 9, Math.round(swallowed * 0.3)));
      const h = this.healPlayer(swallowed * 0.5);
      if (h) res.post.push(h);
    }
    if (this.has('player', 'REPRISAL')) {
      this.removeStatus('player', 'REPRISAL');
      // capped: with helpers and guardians stacking shields on the Reaper's giant hits,
      // an uncapped reply could take off hundreds at once
      const counter = this.hurtBoss(25 + Math.min(prevented, 100) * 1.25);
      res.post.push({ t: 'counter', amount: counter });
    }
    return res;
  }

  /** End of round: boss DoTs, status countdowns, cooldowns, then the next intent. */
  /** ROGUELIKE co-op: the player half of a round's end, on its own (one room can hold several foes, but a spirit's statuses count down once). */
  endRoundPlayers(): BattleEvent[] {
    const out: BattleEvent[] = [];
    this.tickMode('player', 'round', out);
    for (const m of this.bench()) this.onMember(m, () => this.tickMode('player', 'round', []));
    return out;
  }

  endRound(transform = false, tickPlayers = true): BattleEvent[] {
    const out: BattleEvent[] = [];
    const haunt = this.st('boss', 'HAUNTED');
    if (haunt && !this.over) {
      const d = this.hurtBoss(haunt.value);
      out.push({ t: 'damage', target: 'boss', amount: d, source: 'HAUNTED' });
      // Booheet's SOUL THIEF: the haunting feeds whoever is in front
      if (this.teamHas('booheet')) {
        // fighting alone it keeps half; with a team, the whole haunting feeds whoever is in front
        const h = this.healPlayer(d * (this.party.length > 1 ? 1 : 0.5));
        if (h) out.push(h);
      }
    }
    const burn = this.st('boss', 'BURNING');
    if (burn && !this.over) {
      const d = this.hurtBoss(burn.value);
      out.push({ t: 'damage', target: 'boss', amount: d, source: 'BURNING' });
    }
    this.tickMode('boss', 'round', out);
    if (!transform && tickPlayers) {
      this.tickMode('player', 'round', out);
      // (statuses on the bench wear off quietly)
      for (const m of this.bench()) this.onMember(m, () => this.tickMode('player', 'round', []));
    }
    for (const k of Object.keys(this.b.cds)) this.b.cds[k] = Math.max(0, this.b.cds[k] - 1);
    this.turn++;
    this.stats.turns = this.turn - 1;
    this.b.turnsInPhase++;
    if (!this.over) this.planIntent();
    return out;
  }

  // ---------------------------------------------------------------- boss AI

  private makeIntent(id: string, stage: Intent['stage'], combo: string[] = []): Intent {
    const def = this.atk[id];
    const fogged = this.has('player', 'FOGGED');
    const major = def.major || combo.some((c) => this.atk[c].major);
    let warn = def.warn;
    if (stage === 'fire') warn = this.enemy.fireWarn[id] ?? warn;
    if (combo.length) warn = 'TWO ATTACKS AT ONCE!';
    return {
      id,
      name: combo.length ? combo.map((c) => this.atk[c].name).join(' + ') + ' + ' + def.name : def.name,
      major,
      stage,
      hidden: fogged && !major,
      warn,
      icon: def.icon,
      combo,
      breakNeed: def.charge ? def.breakNeed : 0,
      breakDone: 0,
    };
  }

  planIntent() {
    const b = this.b;
    // A frozen boss keeps its plan (pushed back one turn).
    if (this.keepIntent && this.intent) {
      this.keepIntent = false;
      this.intent.hidden = this.has('player', 'FOGGED') && !this.intent.major;
      return;
    }
    // A charged attack always fires next.
    if (b.charging) {
      const keep = this.intent?.breakDone ?? 0;
      this.intent = this.makeIntent(b.charging, 'fire');
      this.intent.breakDone = keep;
      return;
    }
    if (this.enemy.id === 'kraken') {
      this.planKraken();
      return;
    }
    if (this.enemy.id in TITAN_PLANS) {
      this.planTitan(TITAN_PLANS[this.enemy.id]);
      return;
    }
    if (this.enemy.id !== 'dutchman') {
      this.planSimple();
      return;
    }
    // Phase openers
    if (b.phase === 2 && b.turnsInPhase === 0) {
      this.intent = this.makeIntent('tide', 'normal');
      return;
    }
    if (b.phase === 3 && b.turnsInPhase === 0) {
      this.intent = this.makeIntent('maelstrom', 'normal');
      b.cds['voyage'] = 2;
      return;
    }
    // The Final Voyage runs on a schedule in phase 3.
    if (b.phase === 3 && (b.cds['voyage'] ?? 0) <= 0) {
      this.intent = this.makeIntent('voyage', 'charge');
      b.cds['voyage'] = 99; // reset when it fires
      return;
    }
    // The Captain always shows up a few turns into phase 2.
    if (b.phase >= 2 && !b.uses['command'] && b.turnsInPhase >= 3 && (b.cds['command'] ?? 0) <= 0) {
      this.intent = this.makeIntent('command', 'charge');
      return;
    }

    const last = b.last[b.last.length - 1];
    const pick = this.followUp && (b.cds[this.followUp] ?? 0) <= 0 && this.followUp !== last ? this.followUp : null;
    this.followUp = null;
    const id = pick ?? this.weightedPick(last);
    if (id === 'command') {
      this.intent = this.makeIntent('command', 'charge');
      return;
    }
    // Follow-ups that set up the next turn (readable, since they are shown as the next intent).
    if (id === 'fog' && this.rng() < 0.5) this.followUp = 'ram';
    if (id === 'anchor' && this.rng() < 0.35) this.followUp = 'broadside';

    // Phase 3 combos
    if (b.phase === 3) {
      const options = this.enemy.combos.filter(([a, z]) => z === id && (b.cds[a] ?? 0) <= 0 && a !== last);
      if (options.length && this.rng() < 0.45) {
        const [first] = options[Math.floor(this.rng() * options.length)];
        this.intent = this.makeIntent(id, 'normal', [first]);
        return;
      }
    }
    this.intent = this.makeIntent(id, 'normal');
  }

  /** The Kraken: phase openers, a scheduled finisher in phase 3, readable follow-ups and combos. */
  private planKraken() {
    const b = this.b;
    if (b.phase === 2 && b.turnsInPhase === 0) {
      this.intent = this.makeIntent('whirlpool', 'normal');
      return;
    }
    if (b.phase === 3 && b.turnsInPhase === 0) {
      this.intent = this.makeIntent('gaze', 'normal');
      b.cds['devour'] = 2;
      return;
    }
    if (b.phase === 3 && (b.cds['devour'] ?? 0) <= 0 && b.charging === null) {
      this.intent = this.makeIntent('devour', 'charge');
      b.cds['devour'] = 99; // re-armed when it fires
      return;
    }
    const last = b.last[b.last.length - 1];
    const pick = this.followUp && (b.cds[this.followUp] ?? 0) <= 0 && this.followUp !== last ? this.followUp : null;
    this.followUp = null;
    const id = pick ?? this.weightedPick(last);
    if (this.atk[id].charge) {
      this.intent = this.makeIntent(id, 'charge');
      return;
    }
    // blinded by ink, then something heavy
    if (id === 'ink' && this.rng() < 0.5) this.followUp = 'slam';
    if (b.phase === 3) {
      const options = this.enemy.combos.filter(([a, z]) => z === id && (b.cds[a] ?? 0) <= 0 && a !== last);
      if (options.length && this.rng() < 0.45) {
        const [first] = options[Math.floor(this.rng() * options.length)];
        this.intent = this.makeIntent(id, 'normal', [first]);
        return;
      }
    }
    this.intent = this.makeIntent(id, 'normal');
  }

  /**
   * The Titans: phase openers, a scheduled finisher, readable follow-ups and combos.
   * Ironclad also reacts to being hurt: big damage makes it lock its armor, and once
   * it has, its next swing is the hammer.
   */
  private planTitan(plan: TitanPlan) {
    const b = this.b;
    const opener = plan.openers[b.phase];
    const finOn = !!plan.finisher && (plan.finisher.phases ?? [plan.finisher.phase]).includes(b.phase);
    if (opener && b.turnsInPhase === 0) {
      this.intent = this.makeIntent(opener, this.atk[opener].charge ? 'charge' : 'normal');
      if (plan.finisher && finOn) b.cds[plan.finisher.id] = plan.finisher.first;
      return;
    }
    if (plan.finisher && finOn && (b.cds[plan.finisher.id] ?? 0) <= 0 && b.charging === null) {
      this.intent = this.makeIntent(plan.finisher.id, 'charge');
      b.cds[plan.finisher.id] = 99; // re-armed when it fires
      return;
    }
    const last = b.last[b.last.length - 1];
    let pick = this.followUp && (b.cds[this.followUp] ?? 0) <= 0 && this.followUp !== last ? this.followUp : null;
    this.followUp = null;
    if (!pick && this.enemy.id === 'ironclad' && b.phase < 3 && last !== 'fortress' && (b.cds['fortress'] ?? 0) <= 0) {
      // hurt badly since its last turn: it digs in behind its armor
      const hurt = this.stats.damageDealt - (this.lastDealt ?? 0);
      if (hurt > b.maxHp * 0.09 && this.rng() < 0.7) pick = 'fortress';
    }
    this.lastDealt = this.stats.damageDealt;
    if (!pick) pick = this.finalPunish(last);
    const id = pick ?? this.weightedPick(last);
    if (this.atk[id].charge) {
      this.intent = this.makeIntent(id, 'charge');
      return;
    }
    const f = plan.followUps[id];
    if (f && this.rng() < f[1]) this.followUp = f[0];
    if (b.phase >= plan.comboPhase) {
      const options = this.enemy.combos.filter(([a, z]) => z === id && (b.cds[a] ?? 0) <= 0 && a !== last);
      if (options.length && this.rng() < plan.comboChance) {
        const [first] = options[Math.floor(this.rng() * options.length)];
        this.intent = this.makeIntent(id, 'normal', [first]);
        return;
      }
    }
    this.intent = this.makeIntent(id, 'normal');
  }
  private lastDealt: number | null = null;

  /**
   * The God of Death punishes habits. The buff form breaks a team that hides behind
   * shields; the true form burns off a pile of curses; fully powered, he learns your
   * rhythm (the same move three times running and he is ready for the fourth).
   */
  private finalPunish(last: string | undefined): string | null {
    const id = this.enemy.id;
    const b = this.b;
    const ready = (a: string) => !!this.atk[a] && (b.cds[a] ?? 0) <= 0 && a !== last && this.atk[a].phases.includes(b.phase);
    if (id === 'gr2' && ready('b_breaker')) {
      const sh = this.st('player', 'SHIELD')?.value ?? 0;
      const turtle = sh >= 40 || this.has('player', 'GUARD') || this.has('player', 'REPRISAL') || this.has('player', 'CANOPY');
      if (turtle && this.rng() < 0.5) return 'b_breaker';
    }
    if (id === 'gr3' && ready('t_crown') && this.debuffKinds() >= 3 && this.rng() < 0.7) return 't_crown';
    if (id === 'gr4' && ready('f_foresee')) {
      const l = this.playerLog.slice(-3);
      if (l.length === 3 && l.every((x) => x === l[0]) && this.rng() < 0.85) return 'f_foresee';
    }
    return null;
  }

  // ---------------------------------------------------------------- the helper

  /** A helper joins (or leaves, with null): their spirit fights on its own from now on. */
  setAlly(def: AllyDef | null) {
    if (!def) {
      this.ally = null;
      return;
    }
    const kit = ALLY_KIT[def.creature];
    this.ally = { def, en: 5, cd: (kit ?? []).map(() => 0), acted: 0 };
  }

  /** The helper is ready to act (and the section is not already over). */
  allyReady(): boolean {
    if (!this.ally || this.over) return false;
    if (this.enemy.milestones && this.b.hp <= Math.floor(this.b.maxHp * this.floorPct())) return false;
    return true;
  }

  /**
   * The helper's turn, after yours: their spirit picks for itself. A charge is coming:
   * hit as hard as it can to break it. A big blow is coming: protect you. You are hurt:
   * patch you up. Otherwise: curse him if he is clean, use the signature if it can, or hit.
   */
  allyAct(): ActionResult | null {
    const al = this.ally;
    if (!al || !this.allyReady()) return null;
    const kit = ALLY_KIT[al.def.creature];
    if (!kit) return null;
    const abil = (i: number) => ({ cost: [0, 3, 4, 6][i] ?? 0, cd: [0, 1, 2, 3][i] ?? 0 });
    al.cd = al.cd.map((c) => Math.max(0, c - 1));
    al.en = Math.min(10, al.en + 2);
    const can = (i: number) => al.cd[i] <= 0 && al.en >= abil(i).cost;
    const has = (fx: string) => kit.findIndex((k, i) => k.fx === fx && can(i));
    const it = this.intent;
    const est = this.estimateIntent().total;
    const pHp = this.p.hp / this.p.maxHp;
    const protect = ['shield', 'guard', 'spook', 'canopy', 'delay'];
    const debuff: [string, StatusId][] = [['weaken', 'WEAKENED'], ['hex', 'HEX'], ['snare', 'SNARED'], ['burn', 'BURNING']];
    let pick = -1;
    // 1. a charge is building: help break it
    if (it.breakNeed > 0 && !this.intentBroken() && it.stage !== 'normal') {
      pick = has('big');
      if (pick < 0) pick = kit.findIndex((k, i) => (k.fx === 'hit' || k.fx === 'hex' || k.fx === 'burn') && can(i));
    }
    // 2. something big is coming at you: protect you
    if (pick < 0 && (it.major || est >= this.p.hp * 0.55) && it.stage !== 'charge') {
      pick = kit.findIndex((k, i) => protect.includes(k.fx) && can(i) && !(k.fx === 'shield' && (this.st('player', 'SHIELD')?.value ?? 0) >= 40) && !(k.fx === 'guard' && this.has('player', 'GUARD')));
    }
    // 3. you are badly hurt: heal you
    if (pick < 0 && pHp < 0.45) pick = kit.findIndex((k, i) => (k.fx === 'heal' || k.fx === 'team') && can(i));
    // 4. the big one, when there is energy for it
    if (pick < 0 && al.acted >= 1) pick = has('big');
    // 5. a curse he is not carrying
    if (pick < 0) pick = kit.findIndex((k, i) => can(i) && debuff.some(([fx, sid]) => fx === k.fx && !this.has('boss', sid)));
    if (pick < 0) pick = kit.findIndex((k, i) => k.fx === 'en' && can(i) && this.p.en <= 3);
    if (pick < 0) pick = 0;
    const k = kit[pick];
    al.en -= abil(pick).cost;
    al.cd[pick] = abil(pick).cd > 0 ? abil(pick).cd + 1 : 0;
    al.acted++;
    const res: ActionResult = {
      actor: 'player',
      id: 'ally',
      name: '',
      intro: '',
      target: protect.includes(k.fx) || ['heal', 'team', 'en'].includes(k.fx) ? 'player' : 'boss',
      hits: [],
      post: [],
      major: k.fx === 'big',
    };
    const post = res.post;
    this.pw = al.def.power;
    try {
      switch (k.fx) {
        case 'hit':
          res.hits = this.dealToBoss(k.v, { hits: k.n ?? 1, crit: k.crit ?? 0.08 });
          break;
        case 'big':
          res.hits = this.dealToBoss(k.v, { hits: k.n ?? 1, crit: 0.1 });
          break;
        case 'hex':
          res.hits = this.dealToBoss(k.v, { hits: k.n ?? 1 });
          post.push(this.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
          break;
        case 'burn':
          res.hits = this.dealToBoss(k.v);
          post.push(this.addStatus('boss', 'BURNING', 2, 14));
          break;
        case 'weaken':
          res.hits = this.dealToBoss(k.v);
          post.push(this.addStatus('boss', 'WEAKENED', 2, 0.25));
          break;
        case 'snare':
          post.push(this.addStatus('boss', 'SNARED', 2, 0.25));
          break;
        case 'spook':
          post.push(this.addStatus('boss', 'SPOOKED', 9, 0));
          break;
        case 'delay':
          post.push(this.addStatus('boss', 'DELAYED', 9, 0));
          al.cd[pick] = 6;
          break;
        case 'shield':
          post.push(this.addStatus('player', 'SHIELD', 2, k.v, { addValue: true }));
          break;
        case 'guard':
          post.push(this.addStatus('player', 'GUARD', 2, k.v));
          break;
        case 'canopy':
          post.push(this.addStatus('player', 'CANOPY', 1, 0));
          break;
        case 'heal': {
          const h = this.healPlayer(this.p.maxHp * k.v);
          post.push(h ?? { t: 'msg', text: 'HP IS ALREADY FULL.' });
          break;
        }
        case 'team': {
          const h = this.healPlayer(this.p.maxHp * k.v);
          if (h) post.push(h);
          const r = this.healReserve(k.v);
          if (r) post.push(r);
          break;
        }
        case 'en':
          post.push(...this.gainEn(k.v));
          break;
      }
    } finally {
      this.pw = 1;
    }
    res.id = 'ally:' + pick;
    if (this.b.hp <= 0) this.over = 'victory';
    return res;
  }

  /** Smaller opponents: a weighted pick, charged attacks when ready, no repeats. */
  private planSimple() {
    const last = this.b.last[this.b.last.length - 1];
    const id = this.weightedPick(last);
    this.intent = this.makeIntent(id, this.atk[id].charge ? 'charge' : 'normal');
  }

  private weightedPick(last: string | undefined): string {
    const b = this.b;
    const pHp = this.p.hp / this.p.maxHp;
    const shield = this.st('player', 'SHIELD')?.value ?? 0;
    const guarded = this.has('player', 'GUARD');
    const cands: [string, number][] = [];
    for (const def of Object.values(this.atk)) {
      if (!def.phases.includes(b.phase) || def.weight <= 0) continue;
      if ((b.cds[def.id] ?? 0) > 0) continue;
      if (def.id === last) continue;
      let w = def.weight;
      // ROGUELIKE: a move that only sets a status is pointless while that status is already there
      if (def.fx && def.dmg === 0) {
        const onP = def.fx.status?.length ? def.fx.status.every(([s]) => this.has('player', s as StatusId)) : true;
        const onB = def.fx.self?.length ? def.fx.self.every(([s]) => this.has('boss', s as StatusId)) : true;
        if (onP && onB && !def.fx.heal) w = 0;
        if (def.fx.heal && b.hp > b.maxHp * 0.85) w = 0;
      }
      if (pHp < 0.35 && ['ram', 'anchor', 'broadside'].includes(def.id)) w *= 1.6;
      if (shield >= 40 && ['anchor', 'fog'].includes(def.id)) w *= 1.5;
      if (shield >= 40 && def.id === 'siphon') w *= 0.4;
      if (guarded && ['anchor', 'fog', 'crew'].includes(def.id)) w *= 1.3;
      if (def.id === 'anchor' && this.has('player', 'ANCHORED')) w = 0;
      if (def.id === 'fog' && this.has('player', 'FOGGED')) w = 0;
      if (def.id === 'oil' && this.has('player', 'ANCHORED')) w = 0;
      if (def.id === 'ink' && this.has('player', 'FOGGED')) w = 0;
      if (def.id === 'whirlpool' && this.has('player', 'ANCHORED')) w = 0;
      if (def.id === 'grasp' && this.has('player', 'DROWNING')) w = 0;
      if (pHp < 0.35 && def.id === 'slam') w *= 1.4;
      if (pHp < 0.35 && def.id === 'rev') w *= 1.4;
      if (def.id === 'siphon' && b.hp > b.maxHp * 0.9) w *= 0.3;
      if (def.id === 'siphon' && b.phase === 3) w *= 1.4;
      if (def.id === 'web_trap' && this.has('player', 'WEBBED')) w = 0;
      if (def.id === 'smokestack' && this.has('player', 'FOGGED')) w = 0;
      if (def.id === 'command' && this.has('boss', 'RALLIED')) w = 0;
      if (def.id === 'fortress' && this.has('boss', 'FORTIFIED')) w = 0;
      if (['root_trap', 'natures_grasp'].includes(def.id) && this.has('player', 'ROOTED')) w = 0;
      if (['forest_roar', 'screech', 'static_howl'].includes(def.id) && this.has('player', 'SHAKEN')) w = 0;
      if (def.id === 'drain_grip' && b.hp > b.maxHp * 0.8) w *= 0.3;
      if (['wind_barrier', 'shadow_step'].includes(def.id) && this.has('boss', 'FORTIFIED')) w = 0;
      if (def.id === 'tornado_trap' && this.has('player', 'WINDBOUND')) w = 0;
      if (def.id === 'blackout' && this.has('player', 'FOGGED')) w = 0;
      if (def.id === 'soul_chains' && this.has('player', 'WEBBED')) w = 0;
      if (def.id === 'ancient_growth' && b.hp > b.maxHp * 0.85) w = 0;
      if (['lockdown', 'barnacle_bastion', 'brass_tomb', 'canopy_dome', 'peekaboo_x'].includes(def.id) && this.has('boss', 'FORTIFIED')) w = 0;
      if (['shackles', 'smother'].includes(def.id) && this.has('player', 'ANCHORED')) w = 0;
      if (['bone_rattle', 'dread_howl'].includes(def.id) && this.has('player', 'SHAKEN')) w = 0;
      if (def.id === 'corn_maze' && this.has('player', 'WEBBED')) w = 0;
      if (def.id === 'time_stop' && this.has('player', 'ROOTED')) w = 0;
      if (['batten_all', 'lightning_rod', 'blood_moon'].includes(def.id) && this.has('boss', 'RALLIED')) w = 0;
      if (['blood_moon', 'rewind_x'].includes(def.id) && b.hp > b.maxHp * 0.8) w = 0;
      if (pHp < 0.35 && ['nightstick', 'solitary', 'smother', 'sunken_anchor', 'parasol_lance', 'pendulum_wreck'].includes(def.id)) w *= 1.3;
      if (def.id === 'ancient_growth' && b.hp < b.maxHp * 0.5) w *= 1.6;
      if (def.id === 'soul_drain' && b.hp > b.maxHp * 0.92) w *= 0.3;
      if (pHp < 0.35 && ['crushing_grip', 'ethereal_claws', 'diving_strike', 'tail_slam', 'skyfall', 'dark_slash'].includes(def.id)) w *= 1.4;
      if (pHp < 0.35 && ['pounce', 'hammer', 'charge', 'lunge'].includes(def.id)) w *= 1.4;
      // the God of Death
      if (['g_grasp', 'f_legs'].includes(def.id) && this.has('player', 'ROOTED')) w = 0;
      if (['g_mark', 't_mark'].includes(def.id) && this.has('player', 'EXPOSED')) w = 0;
      if (['g_knell', 'b_roar'].includes(def.id) && this.has('player', 'SHAKEN')) w = 0;
      if (def.id === 't_gale' && this.has('player', 'FOGGED')) w = 0;
      if (['b_flex', 'f_shroud'].includes(def.id) && this.has('boss', 'FORTIFIED')) w = 0;
      if (def.id === 'f_chains' && this.has('player', 'WEBBED')) w = 0;
      if (['b_crush', 't_lance'].includes(def.id) && this.has('player', 'ANCHORED')) w *= 0.4;
      if (['g_drain', 't_harvest', 'f_devour'].includes(def.id) && b.hp > b.maxHp * 0.92) w *= 0.4;
      if (def.id === 't_crown') w = this.debuffKinds() >= 2 ? w * 2 : 0;
      if (def.id === 'f_shroud' && b.hp > b.maxHp * 0.85) w *= 0.5;
      if (pHp < 0.35 && ['g_reap', 'b_punch', 't_cross', 'f_twin'].includes(def.id)) w *= 1.35;
      if (w > 0) cands.push([def.id, w]);
    }
    if (!cands.length) return this.enemy.fallback;
    const total = cands.reduce((s, c) => s + c[1], 0);
    let r = this.rng() * total;
    for (const [id, w] of cands) {
      r -= w;
      if (r <= 0) return id;
    }
    return cands[cands.length - 1][0];
  }

}

/**
 * Runs one full round in the canonical order. The scene drives the same steps
 * one at a time with animations in between; the simulator uses this directly.
 */
interface TitanPlan {
  openers: Record<number, string>;
  finisher?: { id: string; phase: number; first: number; phases?: number[] };
  followUps: Record<string, [string, number]>;
  comboPhase: number;
  comboChance: number;
}

const TITAN_PLANS: Record<string, TitanPlan> = {
  // ---- the God of Death
  ...FINAL_PLANS,
  // ---- the final world: the prison
  ...PRISON_PLANS,
  // ---- World 4
  champion: {
    openers: { 2: 'forest_rage' },
    followUps: { root_trap: ['crushing_grip', 0.6], pummel: ['ground_slam', 0.3] },
    comboPhase: 2,
    comboChance: 0.3,
  },
  wispmane: {
    openers: { 2: 'forest_roar', 3: 'overgrowth' },
    finisher: { id: 'natures_wrath', phase: 3, first: 1 },
    followUps: { natures_grasp: ['ethereal_claws', 0.6], forest_roar: ['overgrowth', 0.4] },
    comboPhase: 3,
    comboChance: 0.35,
  },
  crow: {
    openers: { 2: 'screech', 3: 'feather_barrage' },
    finisher: { id: 'blackout_storm', phase: 3, first: 1 },
    followUps: { screech: ['diving_strike', 0.55], wing_gust: ['feather_barrage', 0.3] },
    comboPhase: 3,
    comboChance: 0.35,
  },
  subject: {
    openers: { 2: 'static_howl', 3: 'overcharge' },
    finisher: { id: 'critical_mass', phase: 3, first: 1 },
    followUps: { static_howl: ['surge_claw', 0.5], drain_grip: ['arc_lash', 0.35] },
    comboPhase: 3,
    comboChance: 0.3,
  },
  squirrel: {
    openers: { 2: 'whirlwind_spin', 3: 'branch_leap' },
    finisher: { id: 'forestquake', phase: 3, first: 1 },
    followUps: { branch_leap: ['tail_slam', 0.5], nut_barrage: ['whirlwind_spin', 0.3] },
    comboPhase: 2,
    comboChance: 0.3,
  },
  viperwind: {
    openers: { 2: 'cyclone_rush', 3: 'wind_barrier' },
    finisher: { id: 'tempest', phase: 3, first: 1 },
    followUps: { tornado_trap: ['cyclone_rush', 0.5], wind_barrier: ['skyfall', 0.5] },
    comboPhase: 2,
    comboChance: 0.35,
  },
  reaper: {
    openers: { 2: 'soul_chains', 3: 'final_collection' },
    followUps: { shadow_step: ['dark_slash', 0.6], soul_chains: ['deaths_approach', 0.6], blackout: ['judgment_r', 0.5] },
    comboPhase: 2,
    comboChance: 0.3,
  },
  scorvex: {
    openers: { 2: 'molten_sweep' },
    followUps: { ground_breaker: ['pounce', 0.45], smokestack: ['claw', 0.4] },
    comboPhase: 2,
    comboChance: 0.3,
  },
  widowmaker: {
    openers: { 2: 'web_trap', 3: 'eight_leg' },
    finisher: { id: 'frenzy', phase: 3, first: 2 },
    followUps: { web_trap: ['eight_leg', 0.5], lunge: ['blade_barrage', 0.3] },
    comboPhase: 3,
    comboChance: 0.45,
  },
  ironclad: {
    openers: { 2: 'command', 3: 'quake' },
    finisher: { id: 'judgment', phase: 3, first: 2 },
    followUps: { fortress: ['hammer', 0.85], command: ['charge', 0.5], quake: ['hammer', 0.35] },
    comboPhase: 3,
    comboChance: 0.3,
  },
};

export function runRound(b: Battle, choose: (b: Battle) => number): void {
  b.startPlayerTurn();
  if (b.over) return;
  if (b.koPending) b.swapAfterKO();
  if (b.has('player', 'ROOTED')) b.rootedTurn();
  else {
    const i = choose(b);
    if (i < 0 && b.canSwap()) b.swapAction();
    else b.playerAct(i < 0 ? 0 : i);
  }
  if (b.over) return;
  if (b.allyReady()) b.allyAct();
  if (b.over) return;
  const np = b.checkPhase();
  if (np) {
    b.endRound(true);
    return;
  }
  b.bossTurn();
  if (b.over) return;
  if (b.koPending) b.swapAfterKO();
  b.endRound();
  // a damage-over-time tick can push the boss into its next phase
  if (!b.over && b.checkPhase()) {
    b.b.turnsInPhase = 0;
    b.planIntent();
  }
}
