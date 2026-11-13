import { loadState, saveState } from './state';

// Battle retries: losing a story encounter once unlocks fast-forward for that same encounter
// (and only that one). Kept in the save's flags, so it survives closing the game. A first
// attempt always plays at the intended pace.

const key = (enemy: string) => 'ff_' + enemy;

/** Has the player lost this encounter before? */
export function lostBefore(enemy: string): boolean {
  return !!loadState()?.flags[key(enemy)];
}

/** Remember a loss (written straight into the save: the world reloads it on return). */
export function markLost(enemy: string) {
  const st = loadState();
  if (!st || st.flags[key(enemy)]) return;
  st.flags[key(enemy)] = true;
  saveState(st);
}
