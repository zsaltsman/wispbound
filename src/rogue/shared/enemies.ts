import type { BossAttackDef, EnemyDef } from '../../engine/boss';
import { DUTCHMAN } from '../../engine/boss';
import { FISHERMAN } from '../../engine/fisherman';
import { SALESMAN } from '../../engine/salesman';
import { KRAKEN } from '../../engine/kraken';
import { TITANS } from '../../engine/titans';
import { SPIRITS } from '../../engine/spirits';

// ROGUELIKE: everything that fights back. The dungeon's own enemies are written here as
// data (their attacks carry their effects in `fx`); the story's bosses are borrowed whole.

const A = (d: Partial<BossAttackDef> & Pick<BossAttackDef, 'id' | 'name' | 'dmg' | 'warn'>): BossAttackDef => ({
  phases: [1, 2, 3],
  major: false,
  hits: [1, 1, 1],
  cd: 1,
  weight: 8,
  charge: false,
  breakNeed: 0,
  scaled: true,
  icon: 'w_fist',
  style: 'lunge',
  ...d,
});

/** What the co-op rules need to know about an enemy beyond its attacks. */
export interface RogueFoe {
  def: EnemyDef;
  /** Sprite sheet (frames 0-3 idle, 4 attack, 5 hurt). The story's bosses use their own rigs instead. */
  sprite: string;
  /** Drawn size on the battle floor: small enemies stand in a row, a boss stands alone. */
  size: 's' | 'm' | 'l';
  /** One line for the target list: why you might hit this one first. */
  role: string;
  /** Who it goes for: anyone, whoever is weakest, or whoever it has marked. */
  aggro?: 'any' | 'weakest' | 'marked';
  /** While it stands, every other enemy is WARDED (takes 30% less). */
  wardsOthers?: boolean;
  /** Hits against it bounce part of the damage back while it is FORTIFIED. */
  reflect?: number;
  /** On death it bursts into these, unless it was BURNING or finished by one heavy blow. */
  splitsInto?: { id: string; n: number };
  /** Attack ids that call more enemies in: [enemy id, how many]. */
  summons?: Record<string, [string, number]>;
  /** Attack ids that touch every other enemy: [status, turns, value]. */
  rallies?: Record<string, [string, number, number]>;
  /** Attack ids that reach every player at once, whatever the party size. */
  hitsAll?: string[];
  /** A boss whose defences depend on its helpers: while any of these stand it is WARDED; when the last one falls it is SNARED. */
  leansOn?: string[];
  /** A boss that marks a player (the attack id that does it) and hunts them. */
  marksWith?: string;
  /** Never targets players and cannot be targeted first by area damage rules (a stationary growth, a mirror). */
  passive?: boolean;
}

const mob = (id: string, name: string, hp: number, attacks: BossAttackDef[], fallback: string, extra: Partial<EnemyDef> = {}): EnemyDef => ({
  id,
  name,
  subtitle: '',
  maxHp: hp,
  attacks: Object.fromEntries(attacks.map((a) => [a.id, a])),
  phaseAt: [],
  phaseMult: [1],
  combos: [],
  fallback,
  chargeText: {},
  fireWarn: {},
  ...extra,
});

// ------------------------------------------------------------------ standard enemies

const ASHBITER = mob('ashbiter', 'ASHBITER', 92, [
  A({ id: 'ash_bite', name: 'CINDER BITE', dmg: 8, hits: [2], cd: 0, weight: 10, icon: 'w_claw', warn: 'IT SNAPS ITS SOOTY JAWS.' }),
  A({ id: 'ash_trail', name: 'SMOULDER TRAIL', dmg: 5, cd: 2, weight: 7, style: 'wave', icon: 'w_breaker', warn: 'IT DRAGS A GLOWING TAIL ACROSS THE FLOOR.', fx: { status: [['SCALDED', 3, 7]], say: 'HOT ASH CLINGS TO YOU!' } }),
], 'ash_bite');

const BONE_RUNNER = mob('bonerunner', 'BONE RUNNER', 84, [
  A({ id: 'rib_dash', name: 'RIB DASH', dmg: 7, hits: [2], cd: 0, weight: 10, icon: 'w_claw', warn: 'BONES CLATTER AS IT WINDS UP.' }),
  A({ id: 'flank', name: 'FLANK', dmg: 15, cd: 2, weight: 8, icon: 'w_pounce', warn: 'IT CIRCLES ROUND BEHIND YOU.', fx: { status: [['EXPOSED', 1, 0.5]], unlessDefended: true, say: 'IT FINDS YOUR BLIND SIDE!' } }),
], 'rib_dash');

const MIRELING = mob('mireling', 'MIRELING', 104, [
  A({ id: 'mud_slap', name: 'MUD SLAP', dmg: 12, cd: 0, weight: 10, icon: 'w_fist', warn: 'IT WINDS UP A WET ARM.' }),
  A({ id: 'gulp', name: 'BOG GULP', dmg: 7, cd: 3, weight: 6, style: 'buff', icon: 'w_fortress', warn: 'IT SINKS INTO ITS OWN PUDDLE.', fx: { heal: 0.14 } }),
], 'mud_slap');

const MIRELET = mob('mirelet', 'MIRELET', 36, [A({ id: 'mud_flick', name: 'MUD FLICK', dmg: 7, cd: 0, weight: 10, style: 'shot', warn: 'IT SCOOPS UP A HANDFUL OF MUD.' })], 'mud_flick');

const SHARD_MOTH = mob('shardmoth', 'SHARD MOTH', 78, [
  A({ id: 'shard_volley', name: 'SHARD VOLLEY', dmg: 5, hits: [3], cd: 0, weight: 9, style: 'shot', icon: 'w_breaker', warn: 'ITS WINGS CATCH THE LIGHT.' }),
  A({ id: 'glare', name: 'BLINDING GLARE', dmg: 0, hits: [0], cd: 3, weight: 6, style: 'wave', icon: 'w_fog', warn: 'IT ANGLES ITS WINGS AT YOUR EYES.', fx: { status: [['FOGGED', 2, 0]], unlessDefended: true, say: 'YOU CAN BARELY SEE!' } }),
  A({ id: 'prism_fold', name: 'PRISM FOLD', dmg: 0, hits: [0], cd: 3, weight: 6, style: 'buff', icon: 'w_fortress', warn: 'IT FOLDS ITS WINGS INTO A MIRROR.', fx: { self: [['FORTIFIED', 2, 0.5]], say: 'HITS WILL BOUNCE BACK OFF THE GLASS!' } }),
], 'shard_volley');

const LATCHLING = mob('latchling', 'LATCHLING', 74, [
  A({ id: 'key_jab', name: 'KEY JAB', dmg: 10, cd: 0, weight: 10, icon: 'w_claw', warn: 'IT POINTS ITS KEY AT YOU.' }),
  A({ id: 'latch_on', name: 'LATCH ON', dmg: 6, cd: 2, weight: 9, icon: 'w_chain', warn: 'ITS SHACKLE SWINGS OPEN.', fx: { status: [['WEBBED', 2, 0]], say: 'IT CLAMPS ON: NO SWITCHING, AND MOVES COST MORE!' } }),
  A({ id: 'lock_jaw', name: 'LOCK JAW', dmg: 0, hits: [0], cd: 4, weight: 5, style: 'wave', icon: 'w_anchor', warn: 'ITS KEYHOLE GLOWS.', fx: { status: [['ANCHORED', 2, 0]], unlessDefended: true, say: 'YOUR SIGNATURE MOVE IS LOCKED AWAY!' } }),
], 'key_jab');

const HOLLOW_GUARD = mob('hollowguard', 'HOLLOW GUARD', 148, [
  A({ id: 'halberd', name: 'HALBERD SWING', dmg: 19, cd: 1, weight: 9, style: 'slam', icon: 'w_hammer', warn: 'IT RAISES ITS HALBERD.' }),
  A({ id: 'shield_wall', name: 'SHIELD WALL', dmg: 0, hits: [0], cd: 3, weight: 6, style: 'buff', icon: 'w_fortress', warn: 'IT PLANTS ITS SHIELD.', fx: { self: [['FORTIFIED', 2, 0.5]] } }),
  A({ id: 'guard_shove', name: 'SHIELD SHOVE', dmg: 11, cd: 0, weight: 8, icon: 'w_fist', warn: 'IT BRACES BEHIND ITS SHIELD.' }),
], 'guard_shove');

// ------------------------------------------------------------------ elites (two phases, one attack that must be broken or braced)

const CINDER_MATRON = mob(
  'cindermatron',
  'THE CINDER MATRON',
  370,
  [
    A({ id: 'ember_swipe', name: 'EMBER SWIPE', dmg: 17, cd: 0, weight: 9, icon: 'w_claw', warn: 'A BURNING CLAW RISES.' }),
    A({ id: 'ash_storm', name: 'ASH STORM', dmg: 6, hits: [3, 4], cd: 2, weight: 8, style: 'wave', icon: 'w_breaker', warn: 'ASH WHIRLS UP ROUND HER.', fx: { status: [['SCALDED', 3, 8]] } }),
    A({ id: 'brood_call', name: 'BROOD CALL', dmg: 0, hits: [0, 0], cd: 5, weight: 6, style: 'buff', icon: 'w_order', warn: 'SHE RATTLES HER EMBERS. SOMETHING ANSWERS.' }),
    A({ id: 'inferno', name: 'INFERNO', dmg: 46, major: true, charge: true, breakNeed: 70, cd: 4, weight: 6, phases: [2], style: 'wave', icon: 'w_pounce', warn: 'SHE DRAWS EVERY EMBER IN THE ROOM TO HER.' }),
  ],
  'ember_swipe',
  { subtitle: 'MOTHER OF THE ASHBITERS', phaseAt: [0.5], phaseMult: [1, 1.2], chargeText: { inferno: 'THE CINDER MATRON GLOWS WHITE-HOT. BREAK HER CONCENTRATION!' }, fireWarn: { inferno: 'THE INFERNO BREAKS NEXT TURN!' } }
);

const GAOLER = mob(
  'gaoler',
  'THE GAOLER',
  410,
  [
    A({ id: 'ring_of_keys', name: 'RING OF KEYS', dmg: 8, hits: [2, 3], cd: 0, weight: 9, icon: 'w_chain', warn: 'A HUNDRED KEYS JINGLE.' }),
    A({ id: 'manacle', name: 'MANACLE', dmg: 9, cd: 3, weight: 7, icon: 'w_chain', warn: 'HE UNHOOKS A PAIR OF MANACLES.', fx: { status: [['WEBBED', 2, 0], ['ANCHORED', 2, 0]], unlessDefended: true, say: 'YOU ARE CHAINED IN PLACE!' } }),
    A({ id: 'iron_door', name: 'IRON DOOR', dmg: 0, hits: [0, 0], cd: 4, weight: 6, style: 'buff', icon: 'w_fortress', warn: 'HE HEAVES A CELL DOOR IN FRONT OF HIMSELF.', fx: { self: [['FORTIFIED', 2, 0.5]] } }),
    A({ id: 'lights_out', name: 'LIGHTS OUT', dmg: 44, major: true, charge: true, breakNeed: 75, cd: 4, weight: 6, phases: [2], style: 'slam', icon: 'w_hammer', warn: 'HE LIFTS THE GREAT KEY OVER HIS HEAD.' }),
  ],
  'ring_of_keys',
  { subtitle: 'KEEPER OF EVERY LOCK', phaseAt: [0.5], phaseMult: [1, 1.2], chargeText: { lights_out: 'THE GREAT KEY HANGS IN THE AIR. STAGGER HIM!' }, fireWarn: { lights_out: 'THE GREAT KEY FALLS NEXT TURN!' } }
);

const BROOD_MIRE = mob(
  'broodmire',
  'THE BROOD MIRE',
  390,
  [
    A({ id: 'tar_fist', name: 'TAR FIST', dmg: 18, cd: 0, weight: 9, style: 'slam', icon: 'w_fist', warn: 'A FIST OF TAR RISES OUT OF THE POOL.' }),
    A({ id: 'sink', name: 'SINKING MUD', dmg: 8, cd: 3, weight: 7, style: 'wave', icon: 'w_anchor', warn: 'THE FLOOR TURNS SOFT UNDER YOU.', fx: { status: [['ROOTED', 1, 0]], unlessDefended: true, say: 'YOU ARE STUCK FAST!' } }),
    A({ id: 'bud', name: 'BUD', dmg: 0, hits: [0, 0], cd: 4, weight: 6, style: 'buff', icon: 'w_order', warn: 'A LUMP SWELLS ON ITS BACK.' }),
    A({ id: 'swallow', name: 'SWALLOW WHOLE', dmg: 42, major: true, charge: true, breakNeed: 70, cd: 4, weight: 6, phases: [2], style: 'slam', icon: 'w_pounce', warn: 'IT OPENS UP LIKE A SINKHOLE.', fx: { heal: 0.06 } }),
  ],
  'tar_fist',
  { subtitle: 'IT GROWS ITS OWN COMPANY', phaseAt: [0.5], phaseMult: [1, 1.2], chargeText: { swallow: 'THE BROOD MIRE GAPES WIDE. HIT IT HARD!' }, fireWarn: { swallow: 'IT LUNGES NEXT TURN!' } }
);

// ------------------------------------------------------------------ the three new bosses

const GLASS_REGENT = mob(
  'glassregent',
  'THE GLASS REGENT',
  1500,
  [
    A({ id: 'shard_lance', name: 'SHARD LANCE', dmg: 36, cd: 1, weight: 9, style: 'shot', icon: 'w_claw', warn: 'A SPEAR OF GLASS FORMS IN ITS HAND.' }),
    A({ id: 'glass_storm', name: 'GLASS STORM', dmg: 8, hits: [4, 5, 6], cd: 2, weight: 8, style: 'wave', icon: 'w_breaker', warn: 'EVERY SHARD IN THE HALL LIFTS OFF THE FLOOR.' }),
    A({ id: 'splinter', name: 'SPLINTER', dmg: 0, hits: [0, 0, 0], cd: 7, weight: 7, style: 'buff', icon: 'w_order', warn: 'ITS REFLECTION STEPS OUT OF THE MIRROR.' }),
    A({ id: 'dazzle', name: 'DAZZLE', dmg: 10, cd: 3, weight: 6, style: 'wave', icon: 'w_fog', warn: 'IT TURNS ITS FACE TO THE LIGHT.', fx: { status: [['FOGGED', 2, 0]], unlessDefended: true } }),
    A({ id: 'mirror_beam', name: 'MIRROR BEAM', dmg: 60, major: true, charge: true, breakNeed: 110, cd: 4, weight: 6, phases: [2, 3], style: 'shot', icon: 'w_pounce', warn: 'LIGHT GATHERS BETWEEN THE MIRRORS.' }),
    A({ id: 'shatterfall', name: 'SHATTERFALL', dmg: 13, hits: [0, 0, 5], major: true, cd: 3, weight: 7, phases: [3], style: 'wave', icon: 'w_breaker', warn: 'THE CEILING OF MIRRORS CRACKS.' }),
  ],
  'shard_lance',
  { subtitle: 'RULER OF THE HALL OF MIRRORS', phaseAt: [0.66, 0.33], phaseMult: [1, 1.15, 1.3], chargeText: { mirror_beam: 'THE BEAM BOUNCES FROM MIRROR TO MIRROR, GROWING. BREAK IT!' }, fireWarn: { mirror_beam: 'THE BEAM FIRES NEXT TURN!' } }
);

const MIRROR_COPY = mob('mirrorcopy', 'A REFLECTION', 42, [A({ id: 'copy_jab', name: 'HOLLOW LANCE', dmg: 9, cd: 0, weight: 10, style: 'shot', warn: 'THE REFLECTION COPIES ITS MASTER.' })], 'copy_jab');

const MIRE_MATRIARCH = mob(
  'mirematriarch',
  'THE MIRE MATRIARCH',
  1500,
  [
    A({ id: 'root_lash', name: 'ROOT LASH', dmg: 30, cd: 1, weight: 9, style: 'slam', icon: 'w_claw', warn: 'A ROOT AS THICK AS A MAST DRAWS BACK.' }),
    A({ id: 'mire_pool', name: 'MIRE POOLS', dmg: 6, cd: 3, weight: 8, style: 'wave', icon: 'w_wave', warn: 'BLACK WATER WELLS UP THROUGH THE FLOOR.', fx: { status: [['DROWNING', 3, 9]], unlessDefended: true, say: 'THE POOL DRAGS AT YOU!' } }),
    A({ id: 'strangle', name: 'STRANGLING ROOTS', dmg: 12, cd: 4, weight: 7, icon: 'w_chain', warn: 'ROOTS CREEP ROUND YOUR FEET.', fx: { status: [['ROOTED', 1, 0]], unlessDefended: true, say: 'THE ROOTS HOLD YOU FAST!' } }),
    A({ id: 'sprout', name: 'SPROUT', dmg: 0, hits: [0, 0, 0], cd: 7, weight: 7, style: 'buff', icon: 'w_order', warn: 'SOMETHING PUSHES UP OUT OF THE MUD.' }),
    A({ id: 'brood', name: 'BROOD', dmg: 0, hits: [0, 0, 0], cd: 4, weight: 6, phases: [2, 3], style: 'buff', icon: 'w_order', warn: 'THE LUMPS ON HER BACK BEGIN TO MOVE.' }),
    A({ id: 'bog_surge', name: 'BOG SURGE', dmg: 15, hits: [0, 3, 4], major: true, cd: 3, weight: 7, phases: [2, 3], style: 'wave', icon: 'w_wave', warn: 'THE WHOLE SWAMP LEANS TOWARD YOU.' }),
  ],
  'root_lash',
  { subtitle: 'THE SWAMP THAT WALKS', phaseAt: [0.66, 0.33], phaseMult: [1, 1.15, 1.3] }
);

const ROOT_GROWTH = mob('rootgrowth', 'ROOT GROWTH', 55, [A({ id: 'feed', name: 'FEED', dmg: 0, hits: [0], cd: 0, weight: 10, style: 'buff', warn: 'THE GROWTH PULSES.', fx: { say: 'THE GROWTH FEEDS THE MATRIARCH.' } })], 'feed');

const PALE_HUNTSMAN = mob(
  'palehuntsman',
  'THE PALE HUNTSMAN',
  1550,
  [
    A({ id: 'spear_thrust', name: 'SPEAR THRUST', dmg: 32, cd: 1, weight: 9, icon: 'w_claw', warn: 'THE SPEAR LEVELS AT ITS QUARRY.' }),
    A({ id: 'hunters_mark', name: "HUNTER'S MARK", dmg: 0, hits: [0, 0, 0], cd: 3, weight: 9, style: 'wave', icon: 'w_fog', warn: 'THE ANTLERED MASK TURNS, SLOWLY, AND STOPS.' }),
    A({ id: 'snare_trap', name: 'SNARE TRAP', dmg: 9, cd: 3, weight: 7, style: 'shot', icon: 'w_chain', warn: 'SOMETHING CLICKS UNDER THE LEAVES.', fx: { status: [['WEBBED', 2, 0]], unlessDefended: true, say: 'THE TRAP SNAPS SHUT!' } }),
    A({ id: 'volley', name: 'BONE VOLLEY', dmg: 9, hits: [3, 4, 5], cd: 2, weight: 8, style: 'shot', icon: 'w_breaker', warn: 'IT NOCKS A FISTFUL OF ARROWS.' }),
    A({ id: 'wild_charge', name: 'THE WILD CHARGE', dmg: 64, major: true, charge: true, breakNeed: 115, cd: 3, weight: 8, style: 'slam', icon: 'w_pounce', warn: 'IT PAWS THE GROUND, HEAD LOWERED.' }),
    A({ id: 'horn', name: "HUNTER'S HORN", dmg: 0, hits: [0, 0, 0], cd: 5, weight: 5, phases: [2, 3], style: 'buff', icon: 'w_order', warn: 'IT LIFTS A HORN TO THE MASK.', fx: { self: [['ENRAGED', 2, 0]] } }),
  ],
  'spear_thrust',
  { subtitle: 'IT HAS NEVER LOST A TRAIL', phaseAt: [0.66, 0.33], phaseMult: [1, 1.15, 1.3], chargeText: { wild_charge: 'THE HUNTSMAN LOWERS ITS ANTLERS. BREAK ITS STRIDE!' }, fireWarn: { wild_charge: 'IT CHARGES NEXT TURN!' } }
);

export const FOES: Record<string, RogueFoe> = {
  ashbiter: { def: ASHBITER, sprite: 're_ashbiter', size: 's', role: 'Leaves burning ash on whoever it bites.' },
  bonerunner: { def: BONE_RUNNER, sprite: 're_bonerunner', size: 's', role: 'Goes for whoever is weakest.', aggro: 'weakest' },
  mireling: { def: MIRELING, sprite: 're_mireling', size: 's', role: 'Splits in two unless burned or finished in one blow.', splitsInto: { id: 'mirelet', n: 2 } },
  mirelet: { def: MIRELET, sprite: 're_mirelet', size: 's', role: 'A scrap of a Mireling.' },
  shardmoth: { def: SHARD_MOTH, sprite: 're_shardmoth', size: 's', role: 'Reflects hits while its wings are folded.', reflect: 0.3 },
  latchling: { def: LATCHLING, sprite: 're_latchling', size: 's', role: 'Locks your switching and your best move.' },
  hollowguard: { def: HOLLOW_GUARD, sprite: 're_hollowguard', size: 'm', role: 'Shields every other enemy while it stands.', wardsOthers: true },
  cindermatron: { def: CINDER_MATRON, sprite: 're_cindermatron', size: 'm', role: 'Calls Ashbiters. Break her INFERNO.', summons: { brood_call: ['ashbiter', 1] } },
  gaoler: { def: GAOLER, sprite: 're_gaoler', size: 'm', role: 'Chains you down. Stagger LIGHTS OUT.' },
  broodmire: { def: BROOD_MIRE, sprite: 're_broodmire', size: 'm', role: 'Grows Mirelets. Splits when it falls.', summons: { bud: ['mirelet', 1] }, splitsInto: { id: 'mireling', n: 2 } },
  glassregent: { def: GLASS_REGENT, sprite: 're_glassregent', size: 'l', role: 'Untouchable while its reflections stand.', summons: { splinter: ['mirrorcopy', 1] }, leansOn: ['mirrorcopy'], hitsAll: ['glass_storm', 'shatterfall'], reflect: 0.25 },
  mirrorcopy: { def: MIRROR_COPY, sprite: 're_glassregent', size: 'l', role: 'A reflection. Shatter them all.' },
  mirematriarch: { def: MIRE_MATRIARCH, sprite: 're_mirematriarch', size: 'l', role: 'Guarded by her root growths.', summons: { sprout: ['rootgrowth', 1], brood: ['mirelet', 1] }, leansOn: ['rootgrowth'], hitsAll: ['mire_pool', 'bog_surge'] },
  rootgrowth: { def: ROOT_GROWTH, sprite: 're_rootgrowth', size: 's', role: 'Feeds the Matriarch. Cut it down.', passive: true },
  palehuntsman: { def: PALE_HUNTSMAN, sprite: 're_palehuntsman', size: 'l', role: 'Hunts whoever it has marked.', aggro: 'marked', marksWith: 'hunters_mark', hitsAll: ['volley'] },
};

// The battle screen stages a single painted body the way it stages the island's spirits,
// so the dungeon's enemies are entered in the same registers (the story never looks them up).
for (const f of Object.values(FOES)) {
  TITANS[f.def.id] = f.def;
  SPIRITS[f.def.id] = f.def;
}

// ------------------------------------------------------------------ rooms: who shows up together

export interface Pack {
  /** Enemy ids, front to back. Extra enemies for bigger parties come from `extra`. */
  foes: string[];
  extra: string[];
  /** Harder mixes only appear when the difficulty asks for them, or on later floors. */
  danger?: boolean;
}

/** Standard rooms, by floor (0..2). Each mix asks a different question of the party. */
export const PACKS: Pack[][] = [
  [
    { foes: ['ashbiter', 'ashbiter'], extra: ['ashbiter', 'bonerunner'] },
    { foes: ['bonerunner', 'ashbiter'], extra: ['bonerunner', 'ashbiter'] },
    { foes: ['mireling'], extra: ['ashbiter', 'mireling'] },
    { foes: ['latchling', 'ashbiter'], extra: ['latchling', 'bonerunner'] },
    { foes: ['shardmoth', 'bonerunner'], extra: ['shardmoth', 'ashbiter'] },
    { foes: ['hollowguard', 'ashbiter'], extra: ['bonerunner', 'ashbiter'], danger: true },
    { foes: ['latchling', 'latchling', 'bonerunner'], extra: ['ashbiter', 'ashbiter'], danger: true },
  ],
  [
    { foes: ['hollowguard', 'shardmoth'], extra: ['bonerunner', 'shardmoth'] },
    { foes: ['mireling', 'mireling'], extra: ['ashbiter', 'mireling'] },
    { foes: ['latchling', 'bonerunner', 'bonerunner'], extra: ['latchling', 'bonerunner'] },
    { foes: ['shardmoth', 'shardmoth', 'ashbiter'], extra: ['hollowguard', 'shardmoth'] },
    { foes: ['hollowguard', 'latchling', 'ashbiter'], extra: ['bonerunner', 'ashbiter'] },
    { foes: ['hollowguard', 'mireling', 'shardmoth'], extra: ['bonerunner', 'latchling'], danger: true },
    { foes: ['hollowguard', 'hollowguard', 'bonerunner'], extra: ['shardmoth', 'latchling'], danger: true },
  ],
  [
    { foes: ['hollowguard', 'bonerunner', 'bonerunner'], extra: ['latchling', 'shardmoth'] },
    { foes: ['mireling', 'latchling', 'shardmoth'], extra: ['mireling', 'bonerunner'] },
    { foes: ['hollowguard', 'shardmoth', 'latchling'], extra: ['hollowguard', 'ashbiter'] },
    { foes: ['ashbiter', 'ashbiter', 'bonerunner', 'bonerunner'], extra: ['latchling', 'shardmoth'] },
    { foes: ['hollowguard', 'hollowguard', 'mireling'], extra: ['shardmoth', 'latchling'], danger: true },
    { foes: ['hollowguard', 'latchling', 'latchling', 'shardmoth'], extra: ['bonerunner', 'mireling'], danger: true },
  ],
];

/** Elite rooms: the elite, and who it brings. */
export const ELITES: Pack[] = [
  { foes: ['cindermatron', 'ashbiter'], extra: ['ashbiter', 'bonerunner'] },
  { foes: ['gaoler', 'latchling'], extra: ['latchling', 'hollowguard'] },
  { foes: ['broodmire'], extra: ['mireling', 'mirelet'] },
];

// ------------------------------------------------------------------ bosses

export interface BossEntry {
  id: string;
  def: EnemyDef;
  /** Which floors it can guard (0 = first, 1 = second). */
  floors: number[];
  /** true = one of the roguelike's own bosses (drawn by the pack rig, not a story rig). */
  rogue?: boolean;
}

const T = TITANS;
/** Every boss fight the story has, and the dungeon's three. The Grim Reaper is not here: he is always the last floor. */
export const BOSSES: BossEntry[] = [
  { id: 'fisherman', def: FISHERMAN, floors: [0] },
  { id: 'salesman', def: SALESMAN, floors: [0] },
  { id: 'dutchman', def: DUTCHMAN, floors: [0, 1] },
  { id: 'kraken', def: KRAKEN, floors: [0, 1] },
  { id: 'scorvex', def: T.scorvex, floors: [0, 1] },
  { id: 'widowmaker', def: T.widowmaker, floors: [1] },
  { id: 'ironclad', def: T.ironclad, floors: [1] },
  { id: 'champion', def: T.champion, floors: [0, 1] },
  { id: 'wispmane', def: T.wispmane, floors: [1] },
  { id: 'crow', def: T.crow, floors: [0, 1] },
  { id: 'subject', def: T.subject, floors: [1] },
  { id: 'squirrel', def: T.squirrel, floors: [0, 1] },
  { id: 'viperwind', def: T.viperwind, floors: [1] },
  { id: 'skelwarden', def: T.skelwarden, floors: [0, 1] },
  { id: 'sc_booheet', def: T.sc_booheet, floors: [0, 1] },
  { id: 'sc_shipwraith', def: T.sc_shipwraith, floors: [1] },
  { id: 'sc_hauntcorn', def: T.sc_hauntcorn, floors: [0, 1] },
  { id: 'sc_umbrawl', def: T.sc_umbrawl, floors: [1] },
  { id: 'sc_tickraith', def: T.sc_tickraith, floors: [1] },
  { id: 'glassregent', def: GLASS_REGENT, floors: [0, 1], rogue: true },
  { id: 'mirematriarch', def: MIRE_MATRIARCH, floors: [0, 1], rogue: true },
  { id: 'palehuntsman', def: PALE_HUNTSMAN, floors: [0, 1], rogue: true },
];

/** The last floor: the Grim Reaper's four fights, in order (his first form, the giant, the true form, his domain). */
// (his true form and his last stand are one fight here: the true form's strength, the last stand's
// ground, his domain, with every spirit supercharged from the start)
export const REAPER_CHAIN = ['gr1', 'gr2', 'gr4'];

export function foeDef(id: string): EnemyDef {
  return FOES[id]?.def ?? BOSSES.find((b) => b.id === id)?.def ?? TITANS[id];
}

/** What an enemy deals in an average turn, from its own attack table (used to bring every boss to the floor's level). */
export function averageTurn(def: EnemyDef): number {
  let total = 0;
  let wsum = 0;
  for (const a of Object.values(def.attacks)) {
    if (a.weight <= 0) continue;
    const hits = a.hits.reduce((s, n) => s + n, 0) / a.hits.length;
    const mult = def.phaseMult.reduce((s, n) => s + n, 0) / def.phaseMult.length;
    // a charged attack takes two turns to land
    total += a.weight * a.dmg * hits * (a.scaled ? mult : 1) * (a.charge ? 0.5 : 1);
    wsum += a.weight;
  }
  return wsum ? total / wsum : 1;
}
