import { Battle, freshPlayer, type PartyMember, type RNG, type SkillHook } from '../../engine/battle';
import type { ActionResult, BattleEvent, CreatureDef, Intent, Status, StatusId } from '../../engine/types';
import type { EnemyDef } from '../../engine/boss';
import { FOES, foeDef, type RogueFoe } from './enemies';
import { battleStart, hookFor, passives } from './skills';
import { rosterEntry, spiritDef, superId } from './roster';
import type { SpiritInst } from './protocol';

// ROGUELIKE: one fight, for one to four players against one or more enemies.
//
// The story's battle engine knows one spirit on the field against one foe. Rather than
// rebuild it, a co-op fight keeps one engine Battle per ENEMY (so every boss keeps its own
// plan, phases and tricks) and points it at whichever player is acting or being attacked.
// A spirit's health, energy and statuses live in one place and are shared by all of them.

export const SWAP = -1;
/** How many enemies can stand in a room at once (calls for help beyond this are wasted). */
const MAX_FOES = 5;

export interface CoopChoice {
  /** Ability index 0..3, or SWAP. */
  a: number;
  /** Which enemy (its uid). */
  target: number;
  /** For SWAP: which of your spirits steps in (party index). */
  pick?: number;
}

export interface MemberSnap {
  id: string;
  hp: number;
  maxHp: number;
  en: number;
  maxEn: number;
  statuses: Status[];
  cd: number[];
}
export interface SideSnap {
  seat: number;
  active: number;
  down: boolean;
  members: MemberSnap[];
}
export interface EnemySnap {
  uid: number;
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  phase: number;
  turnsInPhase: number;
  statuses: Status[];
  intent: Intent;
  dead: boolean;
  /** Who it is hunting (the Pale Huntsman's mark), or -1. */
  marked: number;
  /** Damage and health tuning, so a player's copy of the engine predicts the same numbers. */
  tune: { hp: number; dmg: number };
}
export interface BattleSnap {
  round: number;
  sides: SideSnap[];
  enemies: EnemySnap[];
  over: null | 'victory' | 'defeat';
}

/** One thing that happened, in order, with the state it left behind: players replay these to watch the round. */
export type Step = (
  | { t: 'begin'; seat: number; events: BattleEvent[] }
  | { t: 'swapin'; seat: number; to: number }
  | { t: 'act'; seat: number; uid: number; res: ActionResult; splash: { uid: number; amount: number }[]; recoil: number }
  | { t: 'kill'; uid: number }
  | { t: 'spawn'; uids: number[]; text: string }
  | { t: 'phase'; uid: number; phase: number }
  | { t: 'foe'; uid: number; seat: number; results: ActionResult[]; links: { seat: number; amount: number }[] }
  | { t: 'round'; uid: number; events: BattleEvent[] }
  | { t: 'note'; text: string }
  | { t: 'down'; seat: number }
  | { t: 'end'; result: 'victory' | 'defeat' }
) & { snap: BattleSnap };

interface Side {
  seat: number;
  party: PartyMember[];
  active: number;
  down: boolean;
  hooks: (SkillHook | null)[];
  skills: string[][];
  spd: number[];
  /** Tallies for the run summary. */
  dmg: number;
  healed: number;
  downs: number;
}

interface Foe {
  uid: number;
  id: string;
  battle: Battle;
  meta: RogueFoe | null;
  dead: boolean;
  marked: number;
  /** Called in this round: it waits for the next one before acting. */
  fresh: boolean;
  /** Health before the hit that killed it (a Mireling finished by one heavy blow does not split). */
  lastHp: number;
}

export interface CoopSetup {
  sides: { seat: number; spirits: SpiritInst[] }[];
  /** Enemy ids, front to back. */
  foes: string[];
  /** Multipliers for this room: enemy health, boss health (for `boss`), and damage. */
  scale: { hp: number; dmg: number };
  /** Per enemy id overrides (a boss brought to the floor's level). */
  tune?: Record<string, { hp: number; dmg: number }>;
  /** Helpers a boss calls at each new phase in bigger parties: [enemy id, how many]. */
  phaseAdds?: [string, number];
  /** How many players a major attack reaches. */
  majorTargets: number;
  /** Bigger parties face more of a boss's helpers at once (mirror copies, root growths). */
  hazards?: number;
  rng: RNG;
}

export class CoopBattle {
  readonly sides: Side[] = [];
  readonly foes: Foe[] = [];
  round = 1;
  over: null | 'victory' | 'defeat' = null;
  private uid = 0;
  private steps: Step[] = [];
  private rng: RNG;

  constructor(private setup: CoopSetup) {
    this.rng = setup.rng;
    for (const s of setup.sides) {
      const party: PartyMember[] = [];
      const skills: string[][] = [];
      for (const inst of s.spirits) {
        const base = spiritDef(inst.id);
        const pas = passives(inst.skills);
        // run skills can change a spirit's numbers: it fights as its own copy of the definition
        const def: CreatureDef = { ...base, hp: Math.round(base.hp * (1 + pas.hp)), regen: base.regen + pas.regenEn };
        const p = freshPlayer(def);
        p.hp = Math.max(0, Math.round(def.hp * inst.hp));
        party.push({ creature: def, p });
        skills.push(inst.skills);
      }
      const first = party.findIndex((m) => m.p.hp > 0);
      this.sides.push({
        seat: s.seat,
        party,
        active: Math.max(0, first),
        down: first < 0,
        hooks: skills.map((ids) => hookFor(ids)),
        skills,
        spd: s.spirits.map((x) => rosterEntry(x.id).spd),
        dmg: 0,
        healed: 0,
        downs: 0,
      });
    }
    for (const id of setup.foes) this.addFoe(id, false);
    // what skills do the moment the fight opens
    const f0 = this.living()[0];
    for (const s of this.sides) {
      if (s.down || !f0) continue;
      s.party.forEach((m, i) => {
        if (m.p.hp <= 0) return;
        const keep = s.active;
        s.active = i;
        this.bind(f0, s);
        battleStart(f0.battle, s.skills[i]);
        s.active = keep;
      });
    }
    this.wards();
  }

  // ------------------------------------------------------------------ setup helpers

  private addFoe(id: string, fresh: boolean): Foe {
    const def: EnemyDef = foeDef(id);
    const meta = FOES[id] ?? null;
    const lead = this.sides.find((s) => !s.down) ?? this.sides[0];
    const b = new Battle(lead.party[lead.active].creature, this.rng, def);
    const t = this.setup.tune?.[id] ?? this.setup.scale;
    b.tune = { hp: t.hp, dmg: t.dmg };
    b.b.maxHp = b.b.hp = Math.max(1, Math.round(def.maxHp * t.hp));
    b.turn = this.round;
    b.planIntent();
    const f: Foe = { uid: this.uid++, id, battle: b, meta, dead: false, marked: -1, fresh, lastHp: b.b.hp };
    this.foes.push(f);
    return f;
  }

  /** Point an enemy's engine at one player's side. */
  private bind(f: Foe, s: Side) {
    const b = f.battle as any;
    b.party = s.party;
    b.active = s.active;
    b.creature = s.party[s.active].creature;
    b.p = s.party[s.active].p;
    b.pick = null;
    b.koPending = false;
    b.skillHook = s.hooks[s.active];
    b.coopAllies = () => this.sides.filter((o) => o !== s && !o.down).map((o) => o.party[o.active]);
  }

  /** After the engine ran against a side: pick up what changed about who is standing. */
  private settle(f: Foe, s: Side) {
    const b = f.battle as any;
    s.active = b.active;
    if (b._over === 'defeat') {
      // (only this player's spirits are all down: the fight goes on while anyone else stands)
      b._over = null;
      if (!s.down) {
        s.down = true;
        s.downs++;
        this.push({ t: 'down', seat: s.seat });
      }
    } else if (b.koPending) {
      b.koPending = false;
      s.downs++;
      b.swapAfterKO();
      s.active = b.active;
      this.push({ t: 'swapin', seat: s.seat, to: s.active });
    }
    if (b._over === 'victory' || b.b.hp <= 0) b._over = 'victory';
  }

  living(): Foe[] {
    return this.foes.filter((f) => !f.dead);
  }
  standing(): Side[] {
    return this.sides.filter((s) => !s.down);
  }
  side(seat: number) {
    return this.sides.find((s) => s.seat === seat);
  }
  foe(uid: number) {
    return this.foes.find((f) => f.uid === uid);
  }

  // ------------------------------------------------------------------ the round

  /** Start-of-turn effects for everyone. Returns the steps so far (the caller then waits for choices). */
  beginRound(): Step[] {
    this.steps = [];
    if (this.over) return [];
    this.wards();
    for (const f of this.living()) {
      f.fresh = false;
      f.battle.turn = this.round;
    }
    for (const s of this.standing()) {
      const f = this.living()[0];
      if (!f) break;
      this.bind(f, s);
      const ev = f.battle.startPlayerTurn();
      const pas = passives(s.skills[s.active]);
      if (pas.regenHp && s.party[s.active].p.hp > 0) {
        const h = f.battle.healPlayer(s.party[s.active].p.maxHp * pas.regenHp);
        if (h) ev.push(h);
      }
      this.push({ t: 'begin', seat: s.seat, events: ev });
      this.settle(f, s);
    }
    this.checkEnd();
    return this.steps;
  }

  /** Does this side still need to choose (it is standing, and not held by roots)? */
  needsChoice(seat: number): boolean {
    const s = this.side(seat);
    return !!s && !s.down && !this.over;
  }

  /** Everyone has chosen (or been chosen for): play the round out. */
  resolve(choices: Map<number, CoopChoice>): Step[] {
    this.steps = [];
    if (this.over) return [];
    // fastest spirits first; ties go to the lower seat
    const order = this.standing().sort((a, b) => b.spd[b.active] - a.spd[a.active] || a.seat - b.seat);
    for (const s of order) {
      if (this.over || s.down) continue;
      this.act(s, choices.get(s.seat) ?? this.auto(s.seat));
      this.checkEnd();
    }
    if (!this.over) this.enemyPhase();
    if (!this.over) {
      // statuses count down once per round, however many enemies there are
      const f = this.living()[0];
      if (f) for (const s of this.standing()) {
        this.bind(f, s);
        f.battle.endRoundPlayers();
      }
      this.round++;
    }
    if (this.over) this.push({ t: 'end', result: this.over });
    return this.steps;
  }

  private act(s: Side, c: CoopChoice) {
    let f = this.foe(c.target);
    if (!f || f.dead) f = this.living()[0];
    if (!f) return;
    this.bind(f, s);
    const b = f.battle;
    const hpBefore = f.battle.b.hp;
    const healedBefore = b.stats.healed;
    let res: ActionResult;
    if (b.has('player', 'ROOTED')) res = b.rootedTurn();
    else if (c.a === SWAP && b.canSwap()) {
      if (c.pick !== undefined && c.pick !== s.active && s.party[c.pick]?.p.hp > 0) b.pick = c.pick;
      res = b.swapAction();
    } else {
      let i = c.a >= 0 && c.a < b.creature.abilities.length ? c.a : 0;
      if (!b.canUse(i).ok) i = b.creature.abilities.findIndex((_, k) => b.canUse(k).ok);
      if (i < 0) i = 0;
      const ab = b.ability(i);
      res = b.canUse(i).ok ? b.playerAct(i) : { actor: 'player', id: 'wait', name: 'WAIT', intro: `${b.creature.name} CANNOT ACT!`, target: 'boss', hits: [], post: [], major: false };
      const total = res.hits.reduce((n, h) => n + h.amount, 0);
      // ---- area damage: the ability's own, and the SHOCKWAVE skill
      const shock = s.skills[s.active].includes('shockwave');
      const aoe = (ab.aoe ?? 0) + (shock && res.hits.length ? 0.25 : 0);
      const splash: { uid: number; amount: number }[] = [];
      if (aoe > 0 && total > 0) {
        const curses = res.post.filter((e): e is Extract<BattleEvent, { t: 'status' }> => e.t === 'status' && e.target === 'boss' && e.on);
        for (const o of this.living()) {
          if (o === f) continue;
          o.lastHp = o.battle.b.hp;
          this.bind(o, s);
          const d = o.battle.hurtBoss(total * aoe);
          splash.push({ uid: o.uid, amount: d });
          // a curse laid by an area attack lands on everything it touched
          if (ab.aoe) for (const e of curses) {
            const st = f.battle.st('boss', e.id);
            if (st) o.battle.addStatus('boss', e.id, st.turns, st.value, { stacks: st.stacks, maxStacks: 5 });
          }
        }
        this.bind(f, s);
      }
      // ---- reflection: glass throws part of a blow back
      let recoil = 0;
      if (f.meta?.reflect && total > 0 && b.has('boss', 'FORTIFIED')) {
        const p = s.party[s.active].p;
        recoil = Math.min(Math.max(0, p.hp - 1), Math.round(total * f.meta.reflect));
        p.hp -= recoil;
      }
      s.dmg += total + splash.reduce((n, x) => n + x.amount, 0);
      f.lastHp = hpBefore;
      this.push({ t: 'act', seat: s.seat, uid: f.uid, res, splash, recoil });
      s.healed += Math.max(0, b.stats.healed - healedBefore);
      this.settle(f, s);
      this.reap(s);
      return;
    }
    // (a switch: the step must already show who stepped in, so the screen brings the right one out)
    s.active = (b as unknown as { active: number }).active;
    this.push({ t: 'act', seat: s.seat, uid: f.uid, res, splash: [], recoil: 0 });
    this.settle(f, s);
  }

  /** Clear away what has fallen, and everything that follows from it. */
  private reap(by: Side | null) {
    for (const f of this.foes) {
      if (f.dead || f.battle.b.hp > 0) continue;
      f.dead = true;
      this.push({ t: 'kill', uid: f.uid });
      // a Mireling bursts into smaller ones unless it was burning or went in one heavy blow
      const sp = f.meta?.splitsInto;
      const heavy = f.lastHp >= f.battle.b.maxHp * 0.35;
      if (sp && !f.battle.has('boss', 'BURNING') && !heavy) this.spawn(sp.id, sp.n, `${f.battle.enemy.name} BURSTS APART!`);
      // SOUL HARVEST: a fallen enemy feeds every side that carries it
      for (const s of this.standing()) {
        if (!s.skills[s.active].includes('harvest')) continue;
        const o = this.living()[0] ?? f;
        this.bind(o, s);
        o.battle.partyStatus('CROWNED', 2, 0.15);
        for (const m of [s.party[s.active], ...this.standing().filter((x) => x !== s).map((x) => x.party[x.active])]) {
          m.p.hp = Math.min(m.p.maxHp, m.p.hp + Math.round(m.p.maxHp * 0.08));
        }
      }
      // a boss that leans on its helpers staggers when the last one goes
      for (const boss of this.living()) {
        const lean = boss.meta?.leansOn;
        if (!lean || !lean.includes(f.id)) continue;
        if (this.living().some((x) => lean.includes(x.id))) continue;
        boss.battle.removeStatus('boss', 'WARDED');
        boss.battle.removeStatus('boss', 'FORTIFIED');
        boss.battle.addStatus('boss', 'SNARED', 2, 0.25);
        this.push({ t: 'note', text: `${boss.battle.enemy.name} IS LEFT WIDE OPEN!` });
      }
    }
    void by;
    this.wards();
  }

  private spawn(id: string, n: number, text: string): Foe[] {
    const out: Foe[] = [];
    for (let i = 0; i < n && this.living().length < MAX_FOES; i++) out.push(this.addFoe(id, true));
    if (out.length) this.push({ t: 'spawn', uids: out.map((f) => f.uid), text });
    return out;
  }

  /** Keep the standing auras true: guards ward the others, a boss is warded while its helpers stand. */
  private wards() {
    const live = this.living();
    const guard = live.filter((f) => f.meta?.wardsOthers);
    for (const f of live) {
      const lean = f.meta?.leansOn;
      const helped = !!lean && live.some((x) => lean.includes(x.id));
      const warded = helped || guard.some((g) => g !== f);
      if (warded) {
        f.battle.addStatus('boss', 'WARDED', 99, 0.3);
        // glass that is hiding behind its reflections is all but untouchable, and throws blows back
        if (helped && f.meta?.reflect) f.battle.addStatus('boss', 'FORTIFIED', 99, 0.5);
      } else {
        const w = f.battle.st('boss', 'WARDED');
        if (w && w.turns > 50) f.battle.removeStatus('boss', 'WARDED');
        const ft = f.battle.st('boss', 'FORTIFIED');
        if (ft && ft.turns > 50) f.battle.removeStatus('boss', 'FORTIFIED');
      }
    }
  }

  private enemyPhase() {
    for (const f of [...this.foes]) {
      if (this.over) return;
      if (f.dead || f.fresh) continue;
      const b = f.battle;
      const targets = this.standing();
      if (!targets.length) break;
      const t = this.target(f, targets);
      this.bind(f, t);
      // ---- a new phase takes the place of its attack this round
      const np = b.checkPhase();
      if (np) {
        this.push({ t: 'phase', uid: f.uid, phase: np });
        const ev = b.endRound(true, false);
        if (ev.length) this.push({ t: 'round', uid: f.uid, events: ev });
        const add = this.setup.phaseAdds;
        if (add && f.meta?.size !== 's' && f.battle.enemy.phaseAt.length >= 2) this.spawn(add[0], add[1], `${b.enemy.name} CALLS FOR HELP!`);
        this.reap(null);
        this.checkEnd();
        continue;
      }
      const intent = b.intent;
      const id = intent.id;
      const firing = intent.stage !== 'charge' && !b.has('boss', 'DELAYED');
      const def = b.atk[id];
      // ---- the attack itself, at whoever it chose
      const results = b.bossTurn();
      const links = this.shareLinks(f, t);
      this.push({ t: 'foe', uid: f.uid, seat: t.seat, results, links });
      this.settle(f, t);
      if (firing && def) {
        // ---- attacks that reach more of the party
        const all = f.meta?.hitsAll?.includes(id);
        const reach = all ? 99 : def.major && def.dmg > 0 ? this.setup.majorTargets - 1 : 0;
        const others = this.standing().filter((s) => s !== t).slice(0, reach);
        for (const o of others) {
          if (f.battle.b.hp <= 0) break;
          this.bind(f, o);
          const r = (b as any).executeAttack(id, all ? 0.8 : 0.6, false) as ActionResult;
          const l2 = this.shareLinks(f, o);
          this.push({ t: 'foe', uid: f.uid, seat: o.seat, results: [r], links: l2 });
          this.settle(f, o);
        }
        // ---- calling for help, rallying the others, marking a quarry
        const call = f.meta?.summons?.[id];
        if (call) this.spawn(call[0], call[1] + (f.meta?.leansOn?.includes(call[0]) ? (this.setup.hazards ?? 1) - 1 : 0), `${b.enemy.name} IS NO LONGER ALONE!`);
        const rally = f.meta?.rallies?.[id];
        if (rally) for (const o of this.living()) if (o !== f) o.battle.addStatus('boss', rally[0] as StatusId, rally[1], rally[2]);
        if (f.meta?.marksWith === id) this.mark(f, t);
        if (id === 'feed') {
          const m = this.living().find((x) => x.meta?.leansOn?.includes(f.id));
          if (m) m.battle.b.hp = Math.min(m.battle.b.maxHp, m.battle.b.hp + Math.round(m.battle.b.maxHp * 0.012));
        }
      }
      this.reap(null);
      this.checkEnd();
      if (this.over) return;
      if (f.dead) continue;
      // ---- its end of round: curses on it tick, cooldowns run, the next plan is made
      const back = this.standing().includes(t) ? t : this.standing()[0];
      if (!back) break;
      this.bind(f, back);
      f.lastHp = b.b.hp;
      const ev = b.endRound(false, false);
      if (ev.length) this.push({ t: 'round', uid: f.uid, events: ev });
      this.settle(f, back);
      this.reap(null);
      this.checkEnd();
    }
  }

  /** LINKED: what one spirit passed down the threads lands on the others who are tied in. */
  private shareLinks(f: Foe, t: Side): { seat: number; amount: number }[] {
    const share = f.battle.linkShare;
    f.battle.linkShare = 0;
    if (share <= 0) return [];
    const tied = this.standing().filter((s) => s !== t && s.party[s.active].p.statuses.some((x) => x.id === 'LINKED'));
    if (!tied.length) return [];
    const each = Math.round(share / tied.length);
    const out: { seat: number; amount: number }[] = [];
    for (const s of tied) {
      const p = s.party[s.active].p;
      // the threads never deliver a killing blow
      const d = Math.min(Math.max(0, p.hp - 1), each);
      p.hp -= d;
      if (d > 0) out.push({ seat: s.seat, amount: d });
    }
    return out;
  }

  private mark(f: Foe, last: Side) {
    const pool = this.standing().filter((s) => s !== last || this.standing().length === 1);
    const s = pool[Math.floor(this.rng() * pool.length)];
    if (!s) return;
    f.marked = s.seat;
    this.bind(f, s);
    f.battle.addStatus('player', 'EXPOSED', 3, 0.5, { fresh: true });
    this.push({ t: 'note', text: `${s.party[s.active].creature.name} IS MARKED. THE HUNT IS ON!` });
  }

  private target(f: Foe, pool: Side[]): Side {
    const aggro = f.meta?.aggro ?? 'any';
    if (aggro === 'marked') {
      const m = pool.find((s) => s.seat === f.marked);
      if (m) return m;
    }
    if (aggro === 'weakest') return [...pool].sort((a, b) => a.party[a.active].p.hp / a.party[a.active].p.maxHp - b.party[b.active].p.hp / b.party[b.active].p.maxHp)[0];
    return pool[Math.floor(this.rng() * pool.length)];
  }

  private checkEnd() {
    if (this.over) return;
    if (!this.living().length) this.over = 'victory';
    else if (!this.standing().length) this.over = 'defeat';
  }

  // ------------------------------------------------------------------ choices made for a player

  /** A sensible move for a player who is away or out of time (and the simulator's whole brain). */
  auto(seat: number): CoopChoice {
    const s = this.side(seat)!;
    const live = this.living();
    // finish what is nearly dead; otherwise whatever is most dangerous to leave standing
    const prio = (f: Foe) => (f.meta?.passive ? 1 : 0) + (f.meta?.wardsOthers ? 3 : 0) + (f.meta?.leansOn ? -2 : 0) + (f.battle.b.hp < 60 ? 2 : 0) + (f.battle.has('boss', 'FORTIFIED') ? -3 : 0);
    const helpers = live.filter((f) => live.some((x) => x.meta?.leansOn?.includes(f.id)));
    const tgt = helpers[0] ?? [...live].sort((a, b) => prio(b) - prio(a))[0];
    if (!tgt) return { a: 0, target: 0 };
    this.bind(tgt, s);
    const b = tgt.battle;
    const ok = (i: number) => b.canUse(i).ok;
    const p = b.p;
    const threat = live.reduce((n, f) => {
      this.bind(f, s);
      return n + (f.fresh ? 0 : f.battle.estimateIntent().total / Math.max(1, this.standing().length));
    }, 0);
    this.bind(tgt, s);
    const ab = b.creature.abilities;
    const kind = (k: string) => ab.findIndex((a, i) => a.kind === k && ok(i));
    if (p.hp < p.maxHp * 0.3 && b.canSwap() && s.party.some((m, i) => i !== s.active && m.p.hp > m.p.maxHp * 0.5)) return { a: SWAP, target: tgt.uid };
    const charging = tgt.battle.intent.breakNeed > 0;
    if (threat > p.maxHp * 0.2 && kind('defense') >= 0 && !b.has('player', 'GUARD') && !charging) return { a: kind('defense'), target: tgt.uid };
    if (kind('signature') >= 0 && (tgt.battle.b.hp > 80 || live.length > 1)) return { a: kind('signature'), target: tgt.uid };
    const sp = kind('special');
    if (sp >= 0 && p.en >= ab[sp].cost + 2) return { a: sp, target: tgt.uid };
    return { a: 0, target: tgt.uid };
  }

  // ------------------------------------------------------------------ what players are sent

  snap(): BattleSnap {
    return {
      round: this.round,
      over: this.over,
      sides: this.sides.map((s) => ({
        seat: s.seat,
        active: s.active,
        down: s.down,
        members: s.party.map((m) => ({ id: m.creature.id, hp: m.p.hp, maxHp: m.p.maxHp, en: m.p.en, maxEn: m.p.maxEn, statuses: m.p.statuses.map((x) => ({ ...x })), cd: [...m.p.cd] })),
      })),
      enemies: this.foes.map((f) => ({
        uid: f.uid,
        id: f.id,
        name: f.battle.enemy.name,
        hp: f.battle.b.hp,
        maxHp: f.battle.b.maxHp,
        phase: f.battle.b.phase,
        turnsInPhase: f.battle.b.turnsInPhase,
        statuses: f.battle.b.statuses.map((x) => ({ ...x })),
        intent: { ...f.battle.intent, combo: [...f.battle.intent.combo] },
        dead: f.dead,
        marked: f.marked,
        tune: { ...f.battle.tune },
      })),
    };
  }

  private push(s: Record<string, unknown>) {
    this.steps.push({ ...(JSON.parse(JSON.stringify(s)) as object), snap: this.snap() } as Step);
  }

  /**
   * The Grim Reaper's last fight: every spirit is pushed past its limits and becomes its evolved
   * form (the same moves, grown; more health, energy and power), with a good share of its health
   * back. Called as the fight is set up, before anyone sees it.
   */
  supercharge() {
    for (const s of this.sides) {
      s.party.forEach((m, i) => {
        const evo = spiritDef(superId(m.creature.id));
        const pas = passives(s.skills[i]);
        const def: CreatureDef = { ...evo, hp: Math.round(evo.hp * (1 + pas.hp)), regen: evo.regen + pas.regenEn };
        const share = m.p.maxHp > 0 ? m.p.hp / m.p.maxHp : 0;
        m.creature = def;
        m.p.maxHp = def.hp;
        m.p.maxEn = def.en;
        m.p.en = def.en;
        m.p.hp = share > 0 ? Math.min(def.hp, Math.round(def.hp * (share + 0.4))) : 0;
      });
    }
  }

  /** After the fight: each spirit's health as a share of its maximum (0 = it went down). */
  healthAfter(seat: number): number[] {
    return this.side(seat)!.party.map((m) => Math.max(0, m.p.hp / m.p.maxHp));
  }
  tally(seat: number) {
    const s = this.side(seat)!;
    return { dmg: s.dmg, healed: s.healed, downs: s.downs };
  }
}
