// Player options, persisted per browser. Shown in the bar under the game screen.

export interface Settings {
  sound: boolean;
  volume: number; // 0..10
  speed: number; // 1..3 animation speed multiplier
  reducedMotion: boolean;
  /** Music and sound-effect levels, 0..10 each (under the master volume). */
  music: number;
  sfx: number;
}

const KEY = 'flying-dutchman-settings';
const defaults: Settings = { sound: true, volume: 7, speed: 1, reducedMotion: false, music: 8, sfx: 8 };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: use defaults */
  }
  return { ...defaults };
}

export const settings: Settings = load();
const listeners: (() => void)[] = [];

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function onSettings(fn: () => void) {
  listeners.push(fn);
}
