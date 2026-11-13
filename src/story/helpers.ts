import type { WorldScene } from '../scenes/WorldScene';
import { isSet, has, routesOpen, canRecruit } from './state';
import { getCreature } from '../engine/creatures';

// Shared helpers for story scripts.

export type W = WorldScene;
export type Script = (w: W, arg?: any) => Promise<void>;
export type Gate = (w: W) => Promise<boolean>;

/** Story stage, used to vary what townsfolk talk about. */
export function stage(w: W): number {
  const f = (k: string) => isSet(w.state, k);
  if (f('ending_done')) return 6;
  if (f('mayor_ran')) return 5;
  if (f('dutchman_arrived')) return 4;
  if (f('vision_done')) return 3;
  if (w.state.creature) return 2;
  if (f('office_scene')) return 1;
  return 0;
}

/** Say the line set for the current stage (falls back to the latest earlier one). */
export async function staged(w: W, speaker: string, sets: (string[] | null)[], pitch = 900) {
  let s = stage(w);
  while (s > 0 && !sets[s]) s--;
  const lines = sets[s] ?? sets[0] ?? [];
  for (const l of lines) await w.say(l, speaker, { pitch });
  if (s === 0) w.set('talked_mayor');
}

export const P_LOW = 520;
export const P_MID = 760;
export const P_HIGH = 1100;

/** The moment a companion offers to join. Returns true if recruited. */
export async function offer(w: W, id: string, line: string): Promise<boolean> {
  const cr = getCreature(id);
  if (!canRecruit(w.state, id)) return false;
  await w.say(line, undefined, { portrait: 'cr_' + id });
  const yes = await w.confirm(`Take ${cr.name} with you? Only one spirit will ever follow you.`);
  if (!yes) {
    await w.say(`${cr.name} watches you go. It will wait.`, undefined, { portrait: 'cr_' + id });
    return false;
  }
  w.sfx('recruit');
  w.flash(0.5);
  w.recruit(id);
  await w.say(`${cr.name} JOINED YOU!`, undefined, { portrait: 'cr_' + id });
  await w.say('It drifts into place behind you, as if it had always been there.');
  return true;
}

