// ROGUELIKE: every tuning number lives here, so the mode can be balanced after playtests
// without touching the logic. Pure data: shared by the game and the multiplayer server.

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
export const MAX_PLAYERS = 4;
/** How many spirits each player has by the last floor. */
export const MAX_SPIRITS = 3;
/** Run skills one spirit can hold (a fourth replaces one). */
export const SKILL_CAP = 4;

export interface DifficultyDef {
  name: string;
  /** One line for the lobby. */
  blurb: string;
  /** Enemy health and damage, before the party-size scaling. */
  hp: number;
  dmg: number;
  /** Chance that a standard combat room is upgraded to a harder enemy mix. */
  dangerMix: number;
  /** Extra elite rooms added to each floor's layout. */
  extraElites: number;
  /** Recovery rooms per floor, and how much they heal (fraction of max HP). */
  recoveryRooms: number;
  recoveryHeal: number;
  /** Health given back to the whole party after every cleared combat room. */
  roomHeal: number;
  /** Rarity weights for skill offers: [common, rare, epic, legendary]. */
  skillWeights: [number, number, number, number];
  /** The same, for elite, puzzle and treasure rewards, and for boss rewards. */
  eliteWeights: [number, number, number, number];
  bossWeights: [number, number, number, number];
  /** Rarity weights for the three spirits offered in a draft. */
  spiritWeights: [number, number, number, number];
  /** Run currency (wisps) multiplier. */
  wisps: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  easy: {
    name: 'EASY',
    blurb: 'Gentler foes and more places to rest. Plainer rewards.',
    hp: 0.8,
    dmg: 0.78,
    dangerMix: 0,
    extraElites: 0,
    recoveryRooms: 2,
    recoveryHeal: 0.6,
    roomHeal: 0.14,
    skillWeights: [70, 25, 5, 0],
    eliteWeights: [40, 45, 14, 1],
    bossWeights: [0, 60, 34, 6],
    spiritWeights: [52, 32, 13, 3],
    wisps: 0.9,
  },
  normal: {
    name: 'NORMAL',
    blurb: 'The run as it is meant to be played.',
    hp: 1,
    dmg: 1,
    dangerMix: 0.2,
    extraElites: 0,
    recoveryRooms: 1,
    recoveryHeal: 0.5,
    roomHeal: 0.1,
    skillWeights: [56, 32, 10, 2],
    eliteWeights: [22, 48, 25, 5],
    bossWeights: [0, 42, 46, 12],
    spiritWeights: [46, 33, 16, 5],
    wisps: 1,
  },
  hard: {
    name: 'HARD',
    blurb: 'Stronger foes, deadlier rooms, more elites. Far better rewards.',
    hp: 1.22,
    dmg: 1.2,
    dangerMix: 0.5,
    extraElites: 1,
    recoveryRooms: 1,
    recoveryHeal: 0.4,
    roomHeal: 0.07,
    skillWeights: [36, 38, 20, 6],
    eliteWeights: [8, 40, 38, 14],
    bossWeights: [0, 22, 52, 26],
    spiritWeights: [36, 34, 21, 9],
    wisps: 1.35,
  },
};

/**
 * How a fight grows with the party. It is never "health times four": bigger parties meet
 * more enemies, attacks that reach more players, and extra boss mechanics.
 */
export interface PartyScale {
  /** Health of each enemy in a room, and of a boss. */
  hp: number;
  bossHp: number;
  /** Damage of every enemy hit in a room, and of a boss's hits (a boss strikes one player at a time, so it must hit a big party harder). */
  dmg: number;
  bossDmg: number;
  /** Extra enemies added to a standard room's pack. */
  extraEnemies: number;
  /** How many players a boss's major attacks reach (the rest hit one). */
  majorTargets: number;
  /** Bosses call helpers into the fight at each new phase. */
  bossAdds: number;
  /** Arena hazards active in boss fights that use them (mirror copies, root growths). */
  hazards: number;
}

/** Index = number of players (1..4). */
export const PARTY_SCALE: Record<number, PartyScale> = {
  1: { hp: 1, bossHp: 1, dmg: 1, bossDmg: 1, extraEnemies: 0, majorTargets: 1, bossAdds: 0, hazards: 1 },
  2: { hp: 1.25, bossHp: 1.8, dmg: 1.55, bossDmg: 1.6, extraEnemies: 1, majorTargets: 2, bossAdds: 0, hazards: 1 },
  3: { hp: 1.45, bossHp: 2.5, dmg: 1.95, bossDmg: 2.0, extraEnemies: 2, majorTargets: 2, bossAdds: 1, hazards: 2 },
  4: { hp: 1.7, bossHp: 3.2, dmg: 2.3, bossDmg: 2.4, extraEnemies: 2, majorTargets: 3, bossAdds: 1, hazards: 2 },
};

/** Each floor is harder than the one before it (parties grow tougher much faster than they grow stronger, so damage climbs and health barely does). */
export const FLOOR_SCALE = [
  { hp: 0.9, dmg: 1.9 },
  { hp: 1.0, dmg: 2.7 },
  { hp: 1.1, dmg: 3.3 },
];

export const FLOOR_NAMES = ['THE HOLLOW KEEP', 'THE DROWNED GARDENS', "THE REAPER'S DOMAIN"];

/** Seconds a player has to pick a battle action before the game picks a basic attack for them. */
export const ACTION_TIMEOUT = 45;
/** Seconds a disconnected player's seat is held before the run goes on without them. */
export const RECONNECT_GRACE = 120;

export function pickWeighted<T>(rng: () => number, items: T[], weight: (t: T) => number): T {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function rarityRoll(rng: () => number, w: [number, number, number, number]): Rarity {
  return pickWeighted(rng, RARITIES, (r) => w[RARITIES.indexOf(r)]);
}

// ------------------------------------------------------------------ how hard a room is

/** What a boss should have and deal on each floor, for ONE player on NORMAL (party size and difficulty multiply these). */
export const BOSS_TARGET = [
  { hp: 620, turn: 36 },
  { hp: 900, turn: 56 },
  { hp: 1100, turn: 68 },
];
/** Elites are tougher than the room around them. */
export const ELITE_SCALE = { hp: 1.15, dmg: 1.1 };

/** Health and damage multipliers for a standard room's enemies. */
export function roomScale(diff: Difficulty, players: number, floor: number) {
  const d = DIFFICULTY[diff];
  const p = PARTY_SCALE[Math.max(1, Math.min(MAX_PLAYERS, players))];
  const f = FLOOR_SCALE[Math.max(0, Math.min(2, floor))];
  return { hp: d.hp * p.hp * f.hp, dmg: d.dmg * p.dmg * f.dmg };
}

/** The same for a boss: brought to the floor's level whatever it was in the story. `avgTurn` is what it deals in an average turn. */
export function bossScale(diff: Difficulty, players: number, floor: number, baseHp: number, avgTurn: number) {
  const d = DIFFICULTY[diff];
  const p = PARTY_SCALE[Math.max(1, Math.min(MAX_PLAYERS, players))];
  const t = BOSS_TARGET[Math.max(0, Math.min(2, floor))];
  return { hp: (t.hp * d.hp * p.bossHp) / baseHp, dmg: (t.turn * d.dmg * p.bossDmg) / Math.max(1, avgTurn) };
}
