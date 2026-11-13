import type { MapDef } from '../mapdef';
import { buildTown } from './town';
import { buildInteriors } from './interiors';
import { buildIsland } from './island';
import { buildPark } from './park';
import { buildW2Interiors } from './w2interiors';
import { buildShops } from './shops';
import { buildTemples } from './temples';
import { buildW3 } from './w3maps';
import { buildW4 } from './w4maps';
import { buildW5 } from './w5maps';

let cache: Record<string, MapDef> | null = null;

/** Every map in the game, built once and cached. */
export function ALL_MAPS(): Record<string, MapDef> {
  if (cache) return cache;
  cache = {};
  for (const m of [buildTown(), ...buildInteriors(), buildIsland(), buildPark(), ...buildW2Interiors(), ...buildShops(), ...buildTemples(), ...buildW3(), ...buildW4(), ...buildW5()]) cache[m.id] = m;
  return cache;
}

export function getMap(id: string): MapDef {
  const m = ALL_MAPS()[id];
  if (!m) throw new Error('Unknown map ' + id);
  return m;
}
