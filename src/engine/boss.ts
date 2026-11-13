// The Flying Dutchman: attack table and phase data.

export interface BossAttackDef {
  id: string;
  name: string;
  phases: number[]; // phases in which it can be chosen
  major: boolean; // devastating: always telegraphed
  hits: number[]; // hit count per phase (index = phase - 1)
  dmg: number; // damage per hit before modifiers
  cd: number; // boss turns before it can be chosen again
  weight: number;
  charge: boolean; // two-step attack: charge turn, then fire
  breakNeed: number; // damage the player must deal during the charge to stagger it
  scaled: boolean; // affected by phase damage multiplier
  warn: string; // telegraph text
  icon: string;
  /**
   * ROGUELIKE: what the attack does besides damage, as data (the story's bosses have theirs
   * written out in battle.ts). `status` lands on whoever it hits, `self` on the attacker.
   * Each entry is [status, turns, value]. `heal` restores that share of the attacker's health.
   * `unlessDefended`: a shield, guard or brace keeps the statuses off.
   */
  fx?: { status?: [string, number, number][]; self?: [string, number, number][]; heal?: number; unlessDefended?: boolean; say?: string };
  /** ROGUELIKE: how the battle screen should stage it when it has no animation of its own. */
  style?: 'lunge' | 'shot' | 'wave' | 'buff' | 'slam';
}

export const BOSS_MAX_HP = 1000;
export const PHASE2_AT = 0.65;
export const PHASE3_AT = 0.3;
export const PHASE_MULT = [1, 1.15, 1.3];

export const PHASE_NAMES = ['THE CURSED VOYAGE', 'THE ABYSS AWAKENS', 'THE ENDLESS SEA'];

export const BOSS_ATTACKS: Record<string, BossAttackDef> = {
  broadside: {
    id: 'broadside',
    name: 'GHOSTLY BROADSIDE',
    phases: [1, 2, 3],
    major: true,
    hits: [4, 5, 6],
    dmg: 9,
    cd: 2,
    weight: 10,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'THE CANNONS TURN TOWARD YOU!',
    icon: 'w_cannon',
  },
  anchor: {
    id: 'anchor',
    name: 'CURSED ANCHOR',
    phases: [1, 2, 3],
    major: true,
    hits: [1, 1, 1],
    dmg: 44,
    cd: 3,
    weight: 8,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'A SHADOW FALLS FROM THE SKY!',
    icon: 'w_anchor',
  },
  crew: {
    id: 'crew',
    name: 'THE DROWNED CREW',
    phases: [1, 2, 3],
    major: false,
    hits: [5, 6, 7],
    dmg: 6,
    cd: 2,
    weight: 10,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'SHAPES STIR BENEATH THE WAVES...',
    icon: 'w_crew',
  },
  ram: {
    id: 'ram',
    name: 'PHANTOM RAM',
    phases: [1, 2, 3],
    major: true,
    hits: [1, 1, 1],
    dmg: 58,
    cd: 3,
    weight: 7,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'A DISTANT HORN SOUNDS...',
    icon: 'w_ram',
  },
  chains: {
    id: 'chains',
    name: 'CHAIN LASH',
    phases: [1, 2, 3],
    major: false,
    hits: [2, 2, 3],
    dmg: 11,
    cd: 1,
    weight: 6,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'THE HULL CHAINS RATTLE.',
    icon: 'w_chain',
  },
  tide: {
    id: 'tide',
    name: 'BLACK TIDE',
    phases: [2, 3],
    major: true,
    hits: [1, 1, 1],
    dmg: 30,
    cd: 4,
    weight: 8,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'THE SEA RISES BEHIND THE SHIP! DEFEND OR DROWN!',
    icon: 'w_wave',
  },
  siphon: {
    id: 'siphon',
    name: 'SOUL SIPHON',
    phases: [2, 3],
    major: true,
    hits: [3, 3, 4],
    dmg: 10,
    cd: 4,
    weight: 7,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'CHAINS HUNGER FOR YOUR SOUL! SHIELDS DENY IT.',
    icon: 'w_siphon',
  },
  fog: {
    id: 'fog',
    name: 'CURSED FOG',
    phases: [2, 3],
    major: false,
    hits: [1, 1, 1],
    dmg: 12,
    cd: 5,
    weight: 7,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'A COLD MIST ROLLS IN...',
    icon: 'w_fog',
  },
  command: {
    id: 'command',
    name: "THE CAPTAIN'S COMMAND",
    phases: [2, 3],
    major: true,
    hits: [1, 1, 1],
    dmg: 95,
    cd: 6,
    weight: 6,
    charge: true,
    breakNeed: 90,
    scaled: true,
    warn: 'THE CAPTAIN SUMMONS A SPECTRAL CANNON!',
    icon: 'w_captain',
  },
  maelstrom: {
    id: 'maelstrom',
    name: 'MAELSTROM',
    phases: [3],
    major: true,
    hits: [6, 6, 6],
    dmg: 7,
    cd: 4,
    weight: 8,
    charge: false,
    breakNeed: 0,
    scaled: true,
    warn: 'THE SEA BEGINS TO SPIN!',
    icon: 'w_whirl',
  },
  voyage: {
    id: 'voyage',
    name: 'THE FINAL VOYAGE',
    phases: [3],
    major: true,
    hits: [10, 10, 10],
    dmg: 13,
    cd: 7,
    weight: 0, // scheduled, never random
    charge: true,
    breakNeed: 140,
    scaled: false,
    warn: 'THE DUTCHMAN RISES FROM THE SEA!',
    icon: 'w_voyage',
  },
};

/** Everything the battle engine needs to know about an opponent. */
export interface EnemyDef {
  id: string;
  name: string;
  subtitle: string;
  maxHp: number;
  attacks: Record<string, BossAttackDef>;
  phaseAt: number[]; // HP fractions that start phase 2, 3, ...
  phaseMult: number[];
  combos: [string, string][];
  fallback: string; // attack used if nothing else is available
  chargeText: Record<string, string>;
  fireWarn: Record<string, string>;
  /** The final boss's true form: the fight stops at each phase threshold (it can never be skipped past). */
  milestones?: boolean;
}

// Phase 3 combos: a lighter attack chained before a heavier one in the same turn.
export const COMBOS: [string, string][] = [
  ['chains', 'broadside'],
  ['crew', 'anchor'],
  ['chains', 'ram'],
  ['crew', 'siphon'],
];
export const COMBO_POWER = 0.75;

export const DUTCHMAN: EnemyDef = {
  id: 'dutchman',
  name: 'THE FLYING DUTCHMAN',
  subtitle: 'THE CURSED CAPTAIN OF THE ENDLESS SEA',
  maxHp: BOSS_MAX_HP,
  attacks: BOSS_ATTACKS,
  phaseAt: [PHASE2_AT, PHASE3_AT],
  phaseMult: PHASE_MULT,
  combos: COMBOS,
  fallback: 'chains',
  chargeText: {
    voyage: 'THE DUTCHMAN RISES ABOVE THE SEA! EVERY CANNON TAKES AIM!',
    command: 'THE CAPTAIN HOISTS A SPECTRAL CANNON ONTO THE DECK!',
  },
  fireWarn: { voyage: 'ALL CANNONS FIRE NEXT TURN!', command: 'THE GREAT CANNON FIRES NEXT TURN!' },
};
