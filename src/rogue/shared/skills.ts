import type { Battle, SkillHook } from '../../engine/battle';
import type { AbilityDef, ActionResult, BattleEvent, StatusId } from '../../engine/types';
import { RARITIES, SKILL_CAP, pickWeighted, type Rarity } from './config';
import type { SpiritInst } from './protocol';

// ROGUELIKE: run skills. Each one is attached to a single spirit for the rest of the run
// (never to the story's save). What a skill does is written here once, as small hooks the
// battle engine calls; the reward screens only ever show `name`, `rarity` and `desc`.

export interface SkillDef {
  id: string;
  name: string;
  rarity: Rarity;
  desc: string;
  /** How many copies one spirit may hold (default 1). */
  max?: number;
  /** A bond skill: only this spirit can carry it, and it is only offered to a player who owns it. */
  only?: string;
  // ---- passive numbers (added up across a spirit's skills)
  hp?: number; // +max health (fraction)
  dmg?: number; // +damage (fraction)
  armor?: number; // -damage taken (fraction)
  startEn?: number; // extra energy at the start of a battle
  regenHp?: number; // health back each turn (fraction of max)
  sigDiscount?: number; // signature costs this much less
}

const S = (d: SkillDef) => d;

export const SKILLS: SkillDef[] = [
  // ------------------------------------------------ COMMON: small, always useful
  S({ id: 'vigor', name: 'VIGOR', rarity: 'common', desc: '+12% max health.', max: 3, hp: 0.12 }),
  S({ id: 'edge', name: 'KEEN EDGE', rarity: 'common', desc: '+8% damage.', max: 3, dmg: 0.08 }),
  S({ id: 'hide', name: 'THICK HIDE', rarity: 'common', desc: 'Takes 6% less damage.', max: 3, armor: 0.06 }),
  S({ id: 'kindling', name: 'KINDLING', rarity: 'common', desc: 'Starts every battle with 2 more energy.', max: 2, startEn: 2 }),
  S({ id: 'breather', name: 'BREATHER', rarity: 'common', desc: 'Recovers 3% of its max health every turn.', max: 2, regenHp: 0.03 }),
  S({ id: 'grudge', name: 'LONG GRUDGE', rarity: 'common', desc: 'Curses it lays on a foe last 1 turn longer.' }),
  S({ id: 'calm', name: 'STEADY CALM', rarity: 'common', desc: 'Its GUARD and SHIELD last 1 turn longer.' }),
  // ------------------------------------------------ RARE: a specific, noticeable benefit
  S({ id: 'jinx', name: 'JINX', rarity: 'rare', desc: 'Its attacks have a 30% chance to add 1 HEX to the foe.' }),
  S({ id: 'padding', name: 'PADDED HEART', rarity: 'rare', desc: 'Whenever it heals, it also gains SHIELD 25.' }),
  S({ id: 'opportunist', name: 'OPPORTUNIST', rarity: 'rare', desc: '+20% damage to a foe that is WEAKENED, SNARED or BOUND.' }),
  S({ id: 'siphon', name: 'ENERGY SIPHON', rarity: 'rare', desc: 'Its damaging abilities give back 1 energy.' }),
  S({ id: 'thorns', name: 'THORNS', rarity: 'rare', desc: 'Whatever strikes it takes 12 damage back.' }),
  S({ id: 'ambush', name: 'AMBUSH', rarity: 'rare', desc: 'Its first attack of every battle deals 60% more.' }),
  S({ id: 'executioner', name: 'EXECUTIONER', rarity: 'rare', desc: '+25% damage to a foe below 35% health.' }),
  S({ id: 'underdog', name: 'UNDERDOG', rarity: 'rare', desc: 'Takes 20% less damage while below half health.' }),
  // ------------------------------------------------ EPIC: changes how the spirit plays
  S({ id: 'momentum', name: 'MOMENTUM', rarity: 'epic', desc: 'Each attack in a row deals 10% more (up to +50%). Any other move resets it.' }),
  S({ id: 'mirrorguard', name: 'MIRROR GUARD', rarity: 'epic', desc: 'While it has GUARD or SHIELD, it throws back 35% of the damage it prevents.' }),
  S({ id: 'purifier', name: 'PURIFIER', rarity: 'epic', desc: 'Whenever it heals, it also shakes off one curse.' }),
  S({ id: 'hexblade', name: 'HEXBLADE', rarity: 'epic', desc: 'Whenever it lays a curse on a foe, it strikes again for 24 damage.' }),
  S({ id: 'overflow', name: 'OVERFLOW', rarity: 'epic', desc: 'Its signature costs 2 less energy.', sigDiscount: 2 }),
  S({ id: 'leech', name: 'LEECH', rarity: 'epic', desc: 'Heals for 12% of the damage it deals.' }),
  S({ id: 'shockwave', name: 'SHOCKWAVE', rarity: 'epic', desc: 'Its attacks also strike every other enemy for 25% of the damage.' }),
  // ------------------------------------------------ LEGENDARY: run-defining
  S({ id: 'laststand', name: 'LAST STAND', rarity: 'legendary', desc: 'Once per battle, a blow that would knock it out leaves it on 1 health, with SHIELD 50.' }),
  S({ id: 'gambit', name: 'OPENING GAMBIT', rarity: 'legendary', desc: 'Starts every battle with SHIELD 60 and CROWNED (+20% damage) for 3 turns.' }),
  S({ id: 'harvest', name: 'SOUL HARVEST', rarity: 'legendary', desc: 'Whenever an enemy falls, your whole side heals 8% and is CROWNED (+15% damage) for 2 turns.' }),
  S({ id: 'echo', name: 'ECHO', rarity: 'legendary', desc: 'Its signature strikes a second time, at half strength.' }),
  S({ id: 'avatar', name: 'AVATAR', rarity: 'legendary', desc: '+20% max health, +15% damage, and 1 more energy every turn.', hp: 0.2, dmg: 0.15 }),
  S({ id: 'rhythm', name: 'PERFECT RHYTHM', rarity: 'legendary', desc: 'After using three different abilities in a row, its next ability deals 60% more and refunds its energy.' }),
  // ------------------------------------------------ BONDS: one for each of the twenty spirits
  S({ id: 'b_booheet', name: 'DEEPER DARK', rarity: 'rare', only: 'booheet', desc: 'SPOOK BOLT adds 2 HEX instead of 1.' }),
  S({ id: 'b_shipwraith', name: 'IRON HULL', rarity: 'rare', only: 'shipwraith', desc: 'BARNACLE WALL also braces: take 20% less damage for 2 turns.' }),
  S({ id: 'b_hauntcorn', name: 'BUMPER CROP', rarity: 'rare', only: 'hauntcorn', desc: 'CORN RITUAL restores 2 more energy and heals 6%.' }),
  S({ id: 'b_umbrawl', name: 'EYE OF THE STORM', rarity: 'epic', only: 'umbrawl', desc: 'MONSOON PLUNGE no longer leaves it EXPOSED.' }),
  S({ id: 'b_tickraith', name: 'OVERWOUND', rarity: 'rare', only: 'tickraith', desc: 'STOP THE CLOCK also WEAKENS the foe for 2 turns.' }),
  S({ id: 'b_glowbell', name: 'LIVE WIRE', rarity: 'rare', only: 'glowbell', desc: 'TEMPEST BLOOM leaves 2 HEX behind instead of none.' }),
  S({ id: 'b_hammerfin', name: 'THICKER SKULL', rarity: 'rare', only: 'hammerfin', desc: 'HAMMER GUARD also grants SHIELD 40.' }),
  S({ id: 'b_bubblotl', name: 'DOUBLE BUBBLE', rarity: 'rare', only: 'bubblotl', desc: 'BIG BUBBLE also heals it for 15%.' }),
  S({ id: 'b_glidray', name: 'NIGHT HUNTER', rarity: 'rare', only: 'glidray', desc: 'A critical WING SLICE leaves the foe SNARED for 2 turns.' }),
  S({ id: 'b_scorvlet', name: 'BELLOWS', rarity: 'rare', only: 'scorvlet', desc: 'EMBER NIP makes the BURNING last 1 turn longer.' }),
  S({ id: 'b_widowling', name: 'SPINNERET', rarity: 'rare', only: 'widowling', desc: 'TANGLE WEB also adds 2 HEX.' }),
  S({ id: 'b_ironbud', name: 'CHEERLEADER', rarity: 'epic', only: 'ironbud', desc: 'RALLY CLANG gives everyone on your side SHIELD 25.' }),
  S({ id: 'b_wispmane', name: 'APEX', rarity: 'epic', only: 'wispmane', desc: 'ETHEREAL CLAWS also HAUNT the foe for 2 turns.' }),
  S({ id: 'b_viperwind', name: 'SLIPSTREAM', rarity: 'rare', only: 'viperwind', desc: 'GALE STRIKE gives SHIELD 35 instead of 15.' }),
  S({ id: 'b_flamora', name: 'EVERBURN', rarity: 'epic', only: 'flamora', desc: 'SOLAR TALON makes the BURNING last 2 turns longer.' }),
  S({ id: 'b_sootwick', name: 'BACKDRAFT', rarity: 'rare', only: 'sootwick', desc: 'CINDER BURST also BLINDS the foe for 2 turns.' }),
  S({ id: 'b_tintrick', name: 'SPRING-LOADED', rarity: 'rare', only: 'tintrick', desc: 'Starts every battle with 2 COMBO.' }),
  S({ id: 'b_mourningbell', name: 'UNDERTONE', rarity: 'rare', only: 'mourningbell', desc: 'DOLEFUL TOLL adds 1 HEX to its target.' }),
  S({ id: 'b_stitchwraith', name: 'DOUBLE STITCH', rarity: 'epic', only: 'stitchwraith', desc: 'MEND then mends a second time, for 15%.' }),
  S({ id: 'b_nullcrown', name: 'TITHE', rarity: 'epic', only: 'nullcrown', desc: 'Starts every battle holding 1 TRIBUTE.' }),
];

export const skillDef = (id: string) => SKILLS.find((s) => s.id === id)!;
const count = (ids: string[], id: string) => ids.filter((x) => x === id).length;

/** Can this spirit take this skill (another copy included)? */
export function canHold(spirit: SpiritInst, id: string): boolean {
  const d = skillDef(id);
  if (!d) return false;
  if (d.only && d.only !== spirit.id) return false;
  return count(spirit.skills, id) < (d.max ?? 1);
}

/** A spirit that already holds SKILL_CAP skills must give one up to take another. */
export const isFull = (spirit: SpiritInst) => spirit.skills.length >= SKILL_CAP;

/**
 * Three different skills for one player: each is rolled for rarity first, and must be
 * something at least one of their spirits could actually take.
 */
export function skillOffers(rng: () => number, weights: [number, number, number, number], spirits: SpiritInst[], n = 3): string[] {
  const usable = SKILLS.filter((s) => spirits.some((sp) => canHold(sp, s.id) || (isFull(sp) && (!s.only || s.only === sp.id) && count(sp.skills, s.id) < (s.max ?? 1))));
  const out: string[] = [];
  while (out.length < n) {
    const left = usable.filter((s) => !out.includes(s.id));
    if (!left.length) break;
    const rar = pickWeighted(rng, RARITIES, (r) => (left.some((s) => s.rarity === r) ? weights[RARITIES.indexOf(r)] : 0));
    const of = left.filter((s) => s.rarity === rar);
    // a bond for a spirit you own is a little likelier than any one general skill
    out.push(pickWeighted(rng, of, (s) => (s.only ? 1.6 : 1)).id);
  }
  return out;
}

// ------------------------------------------------------------------ passive totals

export interface Passive {
  hp: number;
  dmg: number;
  armor: number;
  startEn: number;
  regenHp: number;
  sigDiscount: number;
  regenEn: number;
}

export function passives(ids: string[]): Passive {
  const p: Passive = { hp: 0, dmg: 0, armor: 0, startEn: 0, regenHp: 0, sigDiscount: 0, regenEn: 0 };
  for (const id of ids) {
    const d = skillDef(id);
    if (!d) continue;
    p.hp += d.hp ?? 0;
    p.dmg += d.dmg ?? 0;
    p.armor += d.armor ?? 0;
    p.startEn += d.startEn ?? 0;
    p.regenHp += d.regenHp ?? 0;
    p.sigDiscount += d.sigDiscount ?? 0;
    if (id === 'avatar') p.regenEn += 1;
  }
  return p;
}

// ------------------------------------------------------------------ the engine hooks

const CURSES: StatusId[] = ['HEX', 'WEAKENED', 'SPOOKED', 'HAUNTED', 'BURNING', 'SNARED', 'DELAYED', 'BLINDED', 'BOUND', 'INVERTED'];
const NEGATIVE: StatusId[] = ['ANCHORED', 'DROWNING', 'FOGGED', 'VULNERABLE', 'EXPOSED', 'WEBBED', 'SCALDED', 'ROOTED', 'SHAKEN', 'WINDBOUND'];
const mem = (b: Battle) => (b.p.mem ??= {});
const msg = (text: string): BattleEvent => ({ t: 'msg', text });

/** The hooks for one spirit's skills. `ids` is that spirit's skill list. */
export function hookFor(ids: string[]): SkillHook | null {
  if (!ids.length) return null;
  const has = (id: string) => ids.includes(id);
  const pas = passives(ids);
  return {
    discount(a) {
      return a.kind === 'signature' ? pas.sigDiscount : 0;
    },
    dealMult(b) {
      let m = 1 + pas.dmg;
      const bossPct = b.b.hp / b.b.maxHp;
      if (has('opportunist') && (b.has('boss', 'WEAKENED') || b.has('boss', 'SNARED') || b.has('boss', 'BOUND'))) m *= 1.2;
      if (has('executioner') && bossPct < 0.35) m *= 1.25;
      if (has('ambush') && !mem(b).struck) m *= 1.6;
      if (has('momentum')) m *= 1 + 0.1 * Math.min(5, mem(b).streak ?? 0);
      if (has('rhythm') && mem(b).rhythm === 3) m *= 1.6;
      return m;
    },
    takeMult(b) {
      let m = 1 - Math.min(0.5, pas.armor);
      if (has('underdog') && b.p.hp < b.p.maxHp / 2) m *= 0.8;
      return m;
    },
    lastStand(b, dmg, res) {
      if (!has('laststand') || mem(b).stood || dmg < b.p.hp) return dmg;
      mem(b).stood = 1;
      res.post.push(msg(`${b.creature.name} MAKES ITS LAST STAND!`), b.addStatus('player', 'SHIELD', 2, 50, { addValue: true }));
      return Math.max(0, b.p.hp - 1);
    },
    afterHit(b, _dealt, prevented) {
      const out: BattleEvent[] = [];
      if (has('thorns') && !b.over) {
        const d = b.hurtBoss(12);
        if (d > 0) out.push({ t: 'damage', target: 'boss', amount: d, source: 'COUNTER' });
      }
      if (has('mirrorguard') && prevented > 0 && !b.over && (b.has('player', 'GUARD') || b.has('player', 'SHIELD'))) {
        const d = b.hurtBoss(prevented * 0.35);
        if (d > 0) out.push({ t: 'damage', target: 'boss', amount: d, source: 'COUNTER' });
      }
      return out;
    },
    afterAct(b, a, res) {
      const m = mem(b);
      const dealt = res.hits.reduce((s, h) => s + h.amount, 0);
      const attacked = res.hits.length > 0;
      if (attacked) m.struck = 1;
      // ---- streaks
      if (has('momentum')) m.streak = attacked ? (m.streak ?? 0) + 1 : 0;
      if (has('rhythm')) {
        if (m.rhythm === 3) {
          // the charged move has been spent: its energy comes back
          m.rhythm = 0;
          m.last1 = m.last2 = -1;
          b.p.en = Math.min(b.p.maxEn, b.p.en + a.cost);
          res.post.push(msg('PERFECT RHYTHM!'));
        } else {
          const idx = b.creature.abilities.indexOf(a);
          const fresh = idx !== m.last1 && idx !== m.last2;
          m.rhythm = fresh ? Math.min(3, (m.rhythm ?? 0) + 1) : 1;
          m.last2 = m.last1 ?? -1;
          m.last1 = idx;
          if (m.rhythm === 3) res.post.push(msg('THE RHYTHM IS PERFECT. THE NEXT MOVE WILL SING!'));
        }
      }
      // ---- on dealing damage
      if (attacked && dealt > 0) {
        if (has('siphon')) b.p.en = Math.min(b.p.maxEn, b.p.en + 1);
        if (has('leech')) {
          const h = b.healPlayer(dealt * 0.12);
          if (h) res.post.push(h);
        }
        if (has('jinx') && b.rng() < 0.3 && !b.over) res.post.push(b.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
      }
      // ---- on cursing
      const cursed = res.post.filter((e) => e.t === 'status' && e.target === 'boss' && e.on && CURSES.includes(e.id));
      if (cursed.length) {
        if (has('grudge')) for (const e of cursed) if (e.t === 'status') {
          const st = b.st('boss', e.id);
          if (st && e.id !== 'SPOOKED' && e.id !== 'DELAYED') st.turns += 1;
        }
        if (has('hexblade') && !b.over) {
          const d = b.hurtBoss(24);
          if (d > 0) res.post.push({ t: 'damage', target: 'boss', amount: d, source: 'COUNTER' });
        }
      }
      // ---- on protecting
      if (has('calm')) for (const e of res.post) if (e.t === 'status' && e.target === 'player' && e.on && (e.id === 'GUARD' || e.id === 'SHIELD')) {
        const st = b.st('player', e.id);
        if (st) st.turns += 1;
      }
      // ---- on healing
      if (res.post.some((e) => e.t === 'heal' && e.target === 'player')) {
        if (has('padding')) res.post.push(b.addStatus('player', 'SHIELD', 2, 25, { addValue: true }));
        if (has('purifier')) {
          const neg = NEGATIVE.find((id) => b.has('player', id));
          if (neg) {
            const e = b.removeStatus('player', neg);
            if (e) res.post.push(e, { t: 'cleanse' });
          }
        }
      }
      // ---- the signature, twice
      if (has('echo') && a.kind === 'signature' && dealt > 0 && !b.over) {
        const d = b.hurtBoss(dealt * 0.5);
        if (d > 0) res.post.push(msg('ECHO!'), { t: 'damage', target: 'boss', amount: d, source: 'COUNTER' });
      }
      // ---- bonds
      switch (a.id) {
        case 'spook_bolt':
          if (has('b_booheet')) res.post.push(b.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
          break;
        case 'barnacle_barrier':
          if (has('b_shipwraith')) res.post.push(b.addStatus('player', 'GUARD', 2, 0.2));
          break;
        case 'corn_ritual':
          if (has('b_hauntcorn')) {
            b.p.en = Math.min(b.p.maxEn, b.p.en + 2);
            const h = b.healPlayer(b.p.maxHp * 0.06);
            if (h) res.post.push(h);
          }
          break;
        case 'monsoon_plunge':
          if (has('b_umbrawl')) b.removeStatus('player', 'EXPOSED');
          break;
        case 'stop_the_clock':
          if (has('b_tickraith')) res.post.push(b.addStatus('boss', 'WEAKENED', 2, 0.3));
          break;
        case 'tempest_bloom':
          if (has('b_glowbell')) res.post.push(b.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
          break;
        case 'hammer_guard':
          if (has('b_hammerfin')) res.post.push(b.addStatus('player', 'SHIELD', 2, 40, { addValue: true }));
          break;
        case 'big_bubble':
          if (has('b_bubblotl')) {
            const h = b.healPlayer(b.p.maxHp * 0.15);
            if (h) res.post.push(h);
          }
          break;
        case 'wing_slice':
          if (has('b_glidray') && res.hits.some((h) => h.crit)) res.post.push(b.addStatus('boss', 'SNARED', 2, 0.25));
          break;
        case 'ember_nip':
          if (has('b_scorvlet')) {
            const st = b.st('boss', 'BURNING');
            if (st) st.turns += 1;
          }
          break;
        case 'tangle_web':
          if (has('b_widowling')) res.post.push(b.addStatus('boss', 'HEX', 4, 0, { stacks: 2, maxStacks: 5 }));
          break;
        case 'rally_clang':
          if (has('b_ironbud')) res.post.push(...b.partyStatus('SHIELD', 2, 25, true));
          break;
        case 'w_claws':
          if (has('b_wispmane')) res.post.push(b.addStatus('boss', 'HAUNTED', 2, 14));
          break;
        case 'v_gale':
          if (has('b_viperwind')) res.post.push(b.addStatus('player', 'SHIELD', 2, 20, { addValue: true }));
          break;
        case 'f_talon':
          if (has('b_flamora')) {
            const st = b.st('boss', 'BURNING');
            if (st) st.turns += 2;
          }
          break;
        case 'cinder_burst':
          if (has('b_sootwick')) res.post.push(b.addStatus('boss', 'BLINDED', 2, 0.25));
          break;
        case 'toll':
          if (has('b_mourningbell')) res.post.push(b.addStatus('boss', 'HEX', 4, 0, { stacks: 1, maxStacks: 5 }));
          break;
        case 'mend':
          if (has('b_stitchwraith')) res.post.push(...b.healMostWounded(0.15));
          break;
      }
    },
  };
}

/** What a spirit's skills do the moment a battle begins (called with the spirit bound as the one on the field). */
export function battleStart(b: Battle, ids: string[]): BattleEvent[] {
  const out: BattleEvent[] = [];
  const pas = passives(ids);
  if (pas.startEn) b.p.en = Math.min(b.p.maxEn, b.p.en + pas.startEn);
  if (ids.includes('gambit')) out.push(b.addStatus('player', 'SHIELD', 2, 60, { addValue: true }), b.addStatus('player', 'CROWNED', 3, 0.2));
  if (ids.includes('b_tintrick')) out.push(b.addStatus('player', 'COMBO', 9, 0, { stacks: 2, maxStacks: 5 }));
  if (ids.includes('b_nullcrown')) out.push(b.addStatus('player', 'TRIBUTE', 9, 0, { stacks: 1, maxStacks: 3 }));
  return out;
}

export type { ActionResult };
