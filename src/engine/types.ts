// Core combat types. The engine is pure TypeScript (no Phaser) so it can run
// headless in the balance simulator as well as inside the game.

export type Side = 'player' | 'boss';

export type StatusId =
  // player buffs
  | 'SHIELD'
  | 'GUARD'
  | 'CHARGED'
  | 'REGEN'
  | 'EMPOWER'
  | 'REPRISAL'
  | 'CANOPY'
  // ROGUELIKE: combo (Tintrick's rhythm), linked (Stitchwraith's threads share the hurt),
  // crowned (Nullcrown's decree: more damage), tribute (buffs Nullcrown holds, waiting to be spent)
  | 'COMBO'
  | 'LINKED'
  | 'CROWNED'
  | 'TRIBUTE'
  // player debuffs
  | 'ANCHORED'
  | 'DROWNING'
  | 'FOGGED'
  | 'VULNERABLE'
  | 'EXPOSED'
  // World 3: webbed (no switching, abilities cost 1 more EN), scalded (heat over time)
  | 'WEBBED'
  | 'SCALDED'
  // World 4: rooted (loses its next turn), shaken (deals 25% less), windbound (wind damage over time)
  | 'ROOTED'
  | 'SHAKEN'
  | 'WINDBOUND'
  // boss debuffs
  | 'HEX'
  | 'WEAKENED'
  | 'SPOOKED'
  | 'HAUNTED'
  | 'DELAYED'
  // World 3: boss burning (damage over time, ignores armor), snared (takes 25% more),
  // fortified (takes 60% less from hits), rallied (its tamer's order: next attack +35%)
  | 'BURNING'
  | 'SNARED'
  | 'FORTIFIED'
  | 'RALLIED'
  // ROGUELIKE: blinded (its hits can miss), bound (deals less), inverted (its phase strength
  // works against it), enraged (deals 25% more), warded (takes 30% less from hits)
  | 'BLINDED'
  | 'BOUND'
  | 'INVERTED'
  | 'ENRAGED'
  | 'WARDED';

/**
 * How a status counts down:
 *  - 'round'  : at the end of every boss turn
 *  - 'player' : at the end of every player action
 *  - 'tick'   : when it triggers (regen / drowning at the start of the player turn)
 *  - 'use'    : only when consumed
 */
export type TickMode = 'round' | 'player' | 'tick' | 'use';

export interface Status {
  id: StatusId;
  turns: number;
  value: number;
  stacks: number;
  tick: TickMode;
  fresh: boolean; // applied during the boss turn: skip the first 'round' countdown
}

export interface Hit {
  amount: number; // damage that reached HP
  absorbed: number; // damage soaked by a shield
  crit: boolean;
  miss: boolean;
  graze: boolean; // reduced by SPOOKED
}

export type BattleEvent =
  | { t: 'msg'; text: string }
  | { t: 'heal'; target: Side; amount: number }
  | { t: 'damage'; target: Side; amount: number; source: StatusId | 'COUNTER' | 'RECOIL' }
  | { t: 'energy'; amount: number }
  | { t: 'status'; target: Side; id: StatusId; on: boolean }
  | { t: 'cleanse' }
  | { t: 'break'; id: string }
  | { t: 'counter'; amount: number };

export interface ActionResult {
  actor: Side;
  id: string; // ability id or boss attack id
  name: string;
  intro: string;
  target: Side;
  hits: Hit[];
  post: BattleEvent[];
  major: boolean;
  stage?: 'charge' | 'fire' | 'normal' | 'frozen' | 'transform';
  power?: number; // relative power (combo hits are weaker)
}

export type AbilityKind = 'attack' | 'defense' | 'special' | 'signature';

export interface AbilityDef {
  id: string;
  name: string;
  short: string; // one line for the menu
  desc: string; // longer text for the info box
  cost: number;
  cd: number;
  kind: AbilityKind;
  icon: string;
  /** ROGUELIKE: this share of the damage also strikes every other enemy in the room. */
  aoe?: number;
}

export interface CreatureDef {
  id: string;
  name: string;
  cls: string;
  description: string;
  identity: string; // combat identity line for the selection screen
  trait: string;
  traitDesc: string;
  hp: number;
  en: number;
  enStart: number;
  regen: number;
  abilities: AbilityDef[];
  /** A supercharged form or the guardian: the creature it is built on (its traits and animations). */
  base?: string;
  /** Damage multiplier for its abilities (supercharged forms, the guardian). */
  power?: number;
  /** Multiplier for its own shields and heals. */
  support?: number;
  /** Pushed past its limits for the final battle. */
  sc?: boolean;
  /** The guardian of the Forgotten Island, fighting at your side. */
  guardian?: boolean;
}

export interface Intent {
  id: string;
  name: string;
  major: boolean;
  stage: 'normal' | 'charge' | 'fire';
  hidden: boolean;
  warn: string;
  icon: string;
  combo: string[]; // extra attack ids executed in the same turn (phase 3 combos)
  breakNeed: number; // damage required to stagger a charged attack (0 = n/a)
  breakDone: number;
}

export interface BattleStats {
  turns: number;
  damageDealt: number;
  damageTaken: number;
  majorSurvived: number;
  attacksSurvived: number;
  healed: number;
}
