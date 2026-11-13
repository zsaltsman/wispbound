import type { CreatureDef } from '../../engine/types';
import { CREATURES, getCreature } from '../../engine/creatures';
import { W2_CREATURES } from '../../engine/creatures2';
import { W3_CREATURES } from '../../engine/creatures3';
import { W5_CREATURES } from '../../engine/creatures5';
import { ROGUE_CREATURES } from '../../engine/creaturesRogue';
import { DIFFICULTY, RARITIES, pickWeighted, type Difficulty, type Rarity } from './config';

// ROGUELIKE: the twenty spirits a run can offer, and what the selection cards say about them.
// (Supercharged forms are only ever met in the Grim Reaper's last fight: see `superId`.)

export interface RosterEntry {
  id: string;
  rarity: Rarity;
  /** 1..5 pips each, for the card. Health is the real number, shown beside its pips. */
  atk: number;
  def: number;
  spd: number;
  /** One short line: how it actually plays. */
  style: string;
  strengths: string[];
  weaknesses: string[];
  /** A couple of sentences for the details page. */
  ideal: string;
}

export const ROSTER: RosterEntry[] = [
  // ---- Hollowhaven
  { id: 'booheet', rarity: 'common', atk: 2, def: 2, spd: 4, style: 'Stacks curses until the foe can barely hurt you, then cashes them in.', strengths: ['Shrinks every hit a foe lands', 'Haunting heals the whole team'], weaknesses: ['Low health', 'Slow to get going'], ideal: 'Open with SPOOK BOLT to build HEX, keep the foe WEAKENED, and save NIGHT TERROR for three or more HEX.' },
  { id: 'shipwraith', rarity: 'rare', atk: 2, def: 5, spd: 2, style: 'Hides behind shields and fires back whatever it blocked.', strengths: ['Turns big hits into big counters', 'Shields refund energy'], weaknesses: ['Little damage of its own', 'Many small hits wear it down'], ideal: 'Read the telegraph. Shield small attacks, and answer the heavy ones with DEAD MAN VOLLEY.' },
  { id: 'hauntcorn', rarity: 'common', atk: 2, def: 3, spd: 2, style: 'Keeps everyone on their feet: steady healing, even from the bench.', strengths: ['Heals itself and its partners', 'Never runs out of energy'], weaknesses: ['Slow to finish a fight', 'Weak against burst damage'], ideal: 'CORN RITUAL first, then spend the EMPOWER on HARVEST MOON or HALLOW HARVEST. Its roots heal whoever is fighting.' },
  { id: 'umbrawl', rarity: 'rare', atk: 5, def: 1, spd: 4, style: 'Swallows one blow, then hits back like a storm.', strengths: ['The biggest single hits of the starters', 'Crits refund energy'], weaknesses: ['Fragile', 'EXPOSED after its best move'], ideal: 'CANOPY CATCH a heavy attack, then drop a CHARGED MONSOON PLUNGE when the foe is not about to answer.' },
  { id: 'tickraith', rarity: 'rare', atk: 3, def: 5, spd: 1, style: 'A patient wall that stops turns and winds its wounds back.', strengths: ['Can cancel an enemy turn', 'Guards the whole team'], weaknesses: ['Slow damage', 'Needs its casing up to hit hard'], ideal: 'Keep BRASS CASING up, STOP THE CLOCK on the worst attack, and REWIND right after a beating.' },
  // ---- Saltwash temples
  { id: 'glowbell', rarity: 'common', atk: 3, def: 3, spd: 3, style: 'Shields up, sparks out: every blow on its shield curses the attacker.', strengths: ['Builds HEX just by being hit', 'One big release'], weaknesses: ['Weak without its shield', 'Spends all its HEX at once'], ideal: 'Keep STATIC VEIL up so hits feed HEX, then let TEMPEST BLOOM go at four or five stacks.' },
  { id: 'hammerfin', rarity: 'rare', atk: 3, def: 4, spd: 2, style: 'Takes the beating on purpose and rams back harder for it.', strengths: ['Shrugs off single big hits', 'Damage grows with punishment'], weaknesses: ['Chipped down by flurries', 'Short on energy'], ideal: 'HAMMER GUARD through the heavy turn, then FRENZY RAM while the bruises are fresh.' },
  { id: 'bubblotl', rarity: 'common', atk: 3, def: 3, spd: 3, style: 'Heals as it pops, and can bubble a foe out of a turn.', strengths: ['Heals a little every turn', 'Skips an enemy attack'], weaknesses: ['Long cooldown on its trap', 'Modest damage until the geyser'], ideal: 'Save BIG BUBBLE for the attack you cannot afford, and FROTH BATH to wash off curses.' },
  { id: 'glidray', rarity: 'rare', atk: 4, def: 2, spd: 5, style: 'Fast, sharp and lucky: crits pay for its next move.', strengths: ['High critical chance', 'Counters while shielded'], weaknesses: ['Low health', 'Swingy'], ideal: 'WING SLICE to fish for crits, MOON MANTLE into a telegraphed hit, LUNAR RAY when the coast is clear.' },
  // ---- Bacchus Key
  { id: 'scorvlet', rarity: 'epic', atk: 3, def: 4, spd: 3, style: 'Sets the foe smouldering, hides in its shell, then stings for every ember.', strengths: ['Burning ignores armor', 'Heals its partners'], weaknesses: ['Needs time to stoke', 'Sting uses up the burn'], ideal: 'EMBER NIP to keep the foe BURNING, SMOG CLOUD to stretch it, STOKED STING on three turns of burn.' },
  { id: 'widowling', rarity: 'epic', atk: 5, def: 2, spd: 5, style: 'Snares the foe so everyone hits harder, then cuts eight times.', strengths: ['SNARE boosts the whole party', 'Huge multi-hit signature'], weaknesses: ['Thin defences', 'Reliant on crits'], ideal: 'TANGLE WEB before the party unloads, VENOM BITE to blunt the reply, EIGHTFOLD FLURRY into a snared foe.' },
  { id: 'ironbud', rarity: 'epic', atk: 4, def: 5, spd: 1, style: 'Holds the line, rings the rally bell, and bonks very hard from behind its guard.', strengths: ['Survives one killing blow', 'Heals the team'], weaknesses: ['Slow', 'Low energy'], ideal: 'BULWARK first: BIG BONK hits far harder while guarded. RALLY CLANG when the bench is hurting.' },
  // ---- The Forgotten Island
  { id: 'wispmane', rarity: 'legendary', atk: 5, def: 3, spd: 4, style: 'Lays on every curse it knows and grows stronger with each one.', strengths: ['More damage per kind of debuff', 'Makes curses last'], weaknesses: ['Needs setup', 'No shields of its own'], ideal: 'ROAR, then GRASP, then claws for HEX: with three kinds of curse on the foe, NATURE\'S WRATH is enormous.' },
  { id: 'viperwind', rarity: 'legendary', atk: 2, def: 5, spd: 4, style: 'Wraps the whole team in wind. Very hard to put down.', strengths: ['Team-wide guard and regen', 'Extra energy while protected'], weaknesses: ['Low damage', 'Fights run long'], ideal: 'Keep WIND BARRIER rolling for the energy, TAILWIND when curses land, TEMPEST WALL into a big hit.' },
  { id: 'flamora', rarity: 'legendary', atk: 5, def: 4, spd: 3, style: 'Strikes, shields, heals and curses. Rises once from its own ashes.', strengths: ['Does everything well', 'Comes back from a knockout'], weaknesses: ['Master of none', 'Its best turns cost a lot'], ideal: 'Keep the foe BURNING with SOLAR TALON so SUPERNOVA lands at full strength, and cry when the team is hurt.' },
  // ---- found only in the dungeon
  { id: 'sootwick', rarity: 'common', atk: 3, def: 1, spd: 5, style: 'Quick and smoky: blinds foes, lights them up, and softens them for an ally.', strengths: ['Makes enemy hits miss', 'Sets up every teammate'], weaknesses: ['Very fragile', 'Modest damage alone'], ideal: 'SOOT PUFF everything that hits hard, CHOKING CLOUD right before a teammate\'s big move.' },
  { id: 'tintrick', rarity: 'common', atk: 5, def: 1, spd: 4, style: 'Every hit winds the key tighter. Then it lets go.', strengths: ['Damage climbs every turn', 'Devastating finisher'], weaknesses: ['No defence at all', 'Heavy blows break its rhythm'], ideal: 'Jab and rush to five COMBO, then FINAL SALUTE. Let someone else take the hits.' },
  { id: 'mourningbell', rarity: 'rare', atk: 3, def: 3, spd: 2, style: 'Rings through whole rooms, breaks charges, and steadies the party.', strengths: ['Hits every enemy', 'Protects every player at once'], weaknesses: ['Slow', 'Low single-target damage'], ideal: 'TOLL into crowds, DISSONANCE on anything charging, RESONANCE before the big attack lands.' },
  { id: 'stitchwraith', rarity: 'epic', atk: 2, def: 4, spd: 3, style: 'Ties foes down and ties friends together so nobody takes the whole blow.', strengths: ['Shares damage across the party', 'Heals any player\'s spirit'], weaknesses: ['Low damage', 'Best with company'], ideal: 'SOUL STITCH before a heavy attack, MEND whoever is lowest, GRAND TANGLE to quiet a whole room.' },
  { id: 'nullcrown', rarity: 'legendary', atk: 4, def: 4, spd: 3, style: 'Steals a foe\'s advantages, hands them to its own side, and turns strength into weakness.', strengths: ['Strips every enemy buff', 'Empowers the whole party'], weaknesses: ['Plain against foes with nothing to steal', 'Slow to pay off'], ideal: 'USURP whenever the foe powers up, spend the TRIBUTE with ROYAL DECREE, and NULL EDICT in a boss\'s last phase.' },
];

const DEFS: CreatureDef[] = [...CREATURES, ...W2_CREATURES, ...W3_CREATURES, ...W5_CREATURES, ...ROGUE_CREATURES];

export const rosterEntry = (id: string) => ROSTER.find((r) => r.id === id)!;
export const spiritDef = (id: string): CreatureDef => DEFS.find((c) => c.id === id) ?? getCreature(id);
/** What a spirit becomes in the Grim Reaper's last fight (the guardians were always this strong). */
export const superId = (id: string) => (id === 'wispmane' || id === 'viperwind' ? 'gd_' : 'x_') + id;
export const RARITY_NAME: Record<Rarity, string> = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };

/** Three different spirits for one player to choose from, leaving out the ones they already own. */
export function draftOffers(rng: () => number, diff: Difficulty, owned: string[]): string[] {
  const w = DIFFICULTY[diff].spiritWeights;
  const pool = ROSTER.filter((r) => !owned.includes(r.id));
  const out: string[] = [];
  while (out.length < 3 && pool.length) {
    // roll the rarity first, then a spirit of that rarity (falling back to any that is left)
    const rar = pickWeighted(rng, RARITIES, (r) => (pool.some((p) => p.rarity === r) ? w[RARITIES.indexOf(r)] : 0));
    const of = pool.filter((p) => p.rarity === rar);
    const pick = of[Math.floor(rng() * of.length)] ?? pool[0];
    out.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}
