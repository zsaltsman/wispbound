import { W4 } from './maps/w4maps';

// The sea between the islands. Each voyage leaves one island (by choice, through someone who
// lives there) and ends at the next island's landing, where its arrival scene takes over.

export type SeaMood = 'wind' | 'calm' | 'fog';

export interface Voyage {
  /** island art (sea_isle_<id>) and name of where you leave and where you are going */
  from: string;
  fromName: string;
  to: string;
  toName: string;
  mood: SeaMood;
  song: string;
  amb: string;
  /** where the world picks up again, and the arrival scene to run there */
  dest: { map: string; x: number; y: number; dir: 'up' | 'down' | 'left' | 'right'; script: string };
}

export const VOYAGES: Record<string, Voyage> = {
  // a grey morning: wind, rain, and something old and broken far out on the water
  w2: {
    from: 'hollowhaven',
    fromName: 'HOLLOWHAVEN',
    to: 'saltwash',
    toName: 'SALTWASH ISLAND',
    mood: 'wind',
    song: 'sea_wind',
    amb: 'seastorm',
    dest: { map: 'isl', x: 48, y: 75, dir: 'up', script: 'w2_title' },
  },
  // blue sky, a fair wind, fish jumping, and fireworks over the party island
  w3: {
    from: 'saltwash',
    fromName: 'SALTWASH ISLAND',
    to: 'bacchus',
    toName: 'BACCHUS KEY',
    mood: 'calm',
    song: 'sea_calm',
    amb: 'sea',
    dest: { map: 'w3_isl', x: 50, y: 73, dir: 'up', script: 'w3_title' },
  },
  // night and fog: drowned masts, lights under the water, a shape that passes beneath you
  w4: {
    from: 'bacchus',
    fromName: 'BACCHUS KEY',
    to: 'forgotten',
    toName: 'THE FORGOTTEN ISLAND',
    mood: 'fog',
    song: 'sea_fog',
    amb: 'seafog',
    dest: { map: 'w4_isl', x: W4.spawn.x, y: W4.spawn.y, dir: 'up', script: 'w4_title' },
  },
};
