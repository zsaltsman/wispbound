import type { Script, W } from './helpers';
import { P_HIGH } from './helpers';
import { isSet } from './state';
import { VOYAGES } from '../world/voyages';

// Leaving an island is always the player's choice. When an island's story is over you stay
// right where you are and can wander as long as you like; one familiar face on each island
// offers to see you off, and saying yes takes you down to the boat and out to sea.

/** "Ready to head out?" Returns true if the player chose to leave (and the voyage has begun). */
export async function departPrompt(w: W, voyage: string, who?: string, pitch?: number): Promise<boolean> {
  const v = VOYAGES[voyage];
  const pick = await w.ask('Ready to head out?', ['LEAVE ISLAND', 'STAY A LITTLE LONGER'], who, { pitch, cancel: 1 });
  if (pick !== 0) {
    await w.say(`Take your time. ${v?.toName ?? 'The sea'} will still be there.`, who, { pitch });
    return false;
  }
  w.save();
  await w.fade(true, 800);
  w.leave('sea', { voyage });
  return true;
}

/** Come back into the world, right where the island's last scene ended. */
export function stayHere(w: W, script: string) {
  const p = w.player;
  w.leave('world', { map: w.map.id, x: p.x, y: p.y, dir: 'down', script });
}

export const VOYAGE_SCRIPTS: Record<string, Script> = {
  /** After Hollowhaven's ending: the town is yours for as long as you like. */
  async stay_w1(w) {
    await w.wait(900);
    await w.say('(The mayor is home, and Hollowhaven is quiet. Explore as long as you like.)');
    await w.say('(When you are ready to leave the island, talk to the mayor in his office.)');
  },
  /** After Saltwash's ending. */
  async stay_w2(w) {
    await w.wait(900);
    await w.say('(Saltwash is drying out in the sun. Explore as long as you like.)');
    await w.say('(When you are ready to leave the island, talk to Professor Pipwick on Center Avenue.)');
  },
  /** Back from Bacchus Key's credits. */
  async stay_w3(w) {
    w.set('w3_leave_hint');
    w.save();
    await w.wait(600);
    await w.say('(Bacchus Key is finding its feet again. Explore as long as you like.)');
    await w.say('(When you are ready to leave the island, talk to Tour Guide Teddy by the harbour.)');
  },

  // developer checkpoints: straight onto the water
  async dev_voyage_w2(w) {
    await w.wait(200);
    w.leave('sea', { voyage: 'w2' });
  },
  async dev_voyage_w3(w) {
    await w.wait(200);
    w.leave('sea', { voyage: 'w3' });
  },
  async dev_voyage_w4(w) {
    await w.wait(200);
    w.leave('sea', { voyage: 'w4' });
  },
};

/** Teddy, once the island's story is done: the one who sees you off from Bacchus Key. */
export async function teddyFarewell(w: W) {
  if (isSet(w.state, 'w4_started')) return;
  await departPrompt(w, 'w4', 'TOUR GUIDE TEDDY', P_HIGH);
}
