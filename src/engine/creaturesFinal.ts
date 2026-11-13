import type { AbilityDef, CreatureDef } from './types';

// The last battle's creatures, built on the ones you already have:
//  - SUPERCHARGED forms of your own three spirits (id 'x_<id>'): the same creature pushed
//    past its limits. Its moves are its own moves, grown: same shapes, new names, far
//    more power, more health and energy. They keep their traits.
//  - the guardian (id 'gd_<id>'): Wispmane or Viperwind at full strength, as a creature
//    that fights beside you. It never needed supercharging.

/** New names for each ability of each spirit when supercharged (same order as its kit). */
const SC_NAMES: Record<string, [string, string][]> = {
  booheet: [['SPOOK TEMPEST', 'A storm of ghost bolts. +1 HEX.'], ['DREAD SHRIEK', 'Big WEAKEN, 3 turns.'], ['PEEK-A-BOO FOREVER', 'Next boss hit fumbles.'], ['ENDLESS NIGHT', 'Huge hit per HEX. HAUNT.']],
  shipwraith: [['SPECTRAL BROADSIDE', 'Full broadside. +1 EN.'], ['BARNACLE BASTION', 'Huge SHIELD, 2 turns.'], ['BATTEN EVERYTHING', 'Take 35% less, 3 turns.'], ['DEAD FLEET VOLLEY', 'Brace, then a fleet fires.']],
  hauntcorn: [['STRAW SCYTHE', 'Reap. Heal from the dmg.'], ['HARVEST MOON, FULL', 'Moon strike. Team heal.'], ['CORN RITE ETERNAL', '+4 EN. EMPOWER next.'], ['HALLOWED REAPING', 'Heal, cleanse, GUARD.']],
  umbrawl: [['PARASOL LANCE', 'Lightning stab. Crits.'], ['CYCLONE VORTEX', '3 storm strikes.'], ['CANOPY DOME', 'Swallow a hit. CHARGE.'], ['MONSOON APOCALYPSE', 'Colossal hit. EXPOSED.']],
  tickraith: [['PENDULUM WRECKER', 'Swing. Heavier if GUARDED.'], ['BRASS TOMB', 'Team takes 40% less.'], ['TIME STOP', 'Hit. Boss loses its turn.'], ['GRAND REWIND', 'Undo damage. Hit back.']],
  glowbell: [['THUNDER STING', 'Lightning. +1 HEX.'], ['STORM VEIL', 'Big SHIELD. WEAKEN.'], ['DEEP-SEA FLARE', 'Blinding flash.'], ['MAELSTROM BLOOM', 'Huge hit per HEX.']],
  hammerfin: [['TIDAL BASH', 'Tidal whack. +1 EN.'], ['IRON HAMMER GUARD', 'GUARD 3 turns.'], ['RIPTIDE TSUNAMI', 'WEAKEN. +2 HEX.'], ['FRENZY OF THE DEEP', 'Colossal ram.']],
  bubblotl: [['BUBBLE BARRAGE', '3 bursting hits.'], ['HOT SPRING', 'Big heal + REGEN.'], ['BUBBLE PRISON', 'Trap: skip a turn.'], ['GEYSER ERUPTION', 'Massive blast.']],
  glidray: [['MOONBLADE', 'Moonlit cut. Crits.'], ['FULL MOON MANTLE', 'Shield + counter.'], ['STARFALL DIVE', '2 dives. +2 EN.'], ['LUNAR CANNON', 'Gigantic beam.']],
  scorvlet: [['MAGMA NIP', 'Bite. BURN 3.'], ['FURNACE SHELL', 'GUARD + big shield.'], ['SMOKESTACK', 'WEAKEN + 1 HEX.'], ['FURNACE TAIL', 'Huge hit per BURN.']],
  widowling: [['BLADE SNIP', '2 blade cuts.'], ["WIDOW'S BITE", 'WEAKEN + 2 HEX.'], ['STEEL WEB', 'SNARE + fumble.'], ['EIGHT-LEG STORM', '8 blade cuts.']],
  ironbud: [['NOT-TINY TAP', 'Hammer blow. +1 EN.'], ['FORTRESS', 'GUARD 3 turns.'], ['WAR CLANG', 'Heals team. Boosts.'], ['JUDGMENT BONK', 'Titanic hit.']],
};

/** What each spirit evolves into when it is supercharged (its own design, see gfx/artEvo). */
export const EVO_NAMES: Record<string, string> = {
  booheet: 'BANSHEET',
  shipwraith: 'DREADHULL',
  hauntcorn: 'SCARECROWN',
  umbrawl: 'STORMBRAWL',
  tickraith: 'DOOMCLOCK',
  glowbell: 'GLOWQUEEN',
  hammerfin: 'ANVILJAW',
  bubblotl: 'GEYSERLOTL',
  glidray: 'ECLIPSERAY',
  scorvlet: 'SCORCHION',
  widowling: 'STEELWIDOW',
  ironbud: 'IRONBLOOM',
};

/** The spirits that can be supercharged: every World 1, 2 and 3 spirit. */
export const SC_IDS = Object.keys(SC_NAMES);
export const scId = (id: string) => 'x_' + id;
export const gdId = (id: string) => 'gd_' + id;

/** (exported for the roguelike, which supercharges spirits the story never does, with its own names) */
export function supercharge(c: CreatureDef, names: [string, string][] | undefined = SC_NAMES[c.id], evoName = EVO_NAMES[c.id]): CreatureDef {
  const abilities: AbilityDef[] = c.abilities.map((a, i) => ({
    ...a,
    name: names?.[i]?.[0] ?? a.name,
    short: names?.[i]?.[1] ?? a.short,
    desc: `SUPERCHARGED. ${a.desc}`,
  }));
  return {
    ...c,
    id: scId(c.id),
    base: c.id,
    name: evoName ?? c.name,
    cls: 'SUPERCHARGED',
    identity: `${c.name}, evolved: pushed far past its limits.`,
    hp: Math.round((c.hp * 1.7) / 10) * 10,
    en: c.en + 2,
    enStart: c.enStart + 3,
    regen: c.regen + 1,
    power: 1.5,
    support: 1.4,
    sc: true,
    abilities,
  };
}

function guardian(c: CreatureDef): CreatureDef {
  return {
    ...c,
    id: gdId(c.id),
    base: c.id,
    identity: `${c.name}, guardian of the Forgotten Island, at full strength.`,
    hp: Math.round((c.hp * 1.45) / 10) * 10,
    en: c.en + 2,
    enStart: c.enStart + 2,
    regen: c.regen + 1,
    power: 1.3,
    support: 1.3,
    guardian: true,
  };
}

/** Builds the supercharged and guardian creatures from the base roster. */
export function finalCreatures(all: CreatureDef[]): CreatureDef[] {
  const out: CreatureDef[] = [];
  for (const id of SC_IDS) {
    const c = all.find((x) => x.id === id);
    if (c) out.push(supercharge(c));
  }
  for (const id of ['wispmane', 'viperwind']) {
    const c = all.find((x) => x.id === id);
    if (c) out.push(guardian(c));
  }
  return out;
}
