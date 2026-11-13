import { line, arp, drum, rep, type Song } from './songs';

// The title screen and the voyages between islands.

const bars = (...b: string[]) => b.join(' ');
const whole = (n: string) => n + ' -'.repeat(15);

export const SONGS7: Record<string, Song> = {
  // WISPBOUND: a lantern on dark water. Minor, slow, and wanting to go somewhere
  title: {
    bpm: 76,
    steps: 128,
    parts: [
      line(
        bars(
          'A4 - - - C5 - E5 - - - D5 - C5 - B4 -',
          'A4 - - - - - E4 - G4 - A4 - B4 - - -',
          'C5 - - - E5 - A5 - - - G5 - E5 - D5 -',
          'E5 - - - - - - - . . . . . . . .',
          'F5 - - - E5 - D5 - C5 - - - D5 - E5 -',
          'C5 - - - B4 - A4 - G4 - - - A4 - B4 -',
          'C5 - - - D5 - E5 - G5 - - - E5 - D5 -',
          'A4 - - - - - - - - - - - . . . .'
        ),
        'triangle',
        0.09,
        4
      ),
      arp(['A3/C4/E4', 'E3/G3/B3', 'F3/A3/C4', 'E3/G#3/B3', 'D3/F3/A3', 'A3/C4/E4', 'F3/A3/C4', 'E3/G#3/B3'], 16, 'square', 0.02, 2),
      line(bars(whole('A1'), whole('E2'), whole('F1'), whole('E1'), whole('D2'), whole('A1'), whole('F1'), whole('E1')), 'triangle', 0.2),
      line(bars(whole('E4'), whole('B3'), whole('C4'), whole('B3'), whole('A3'), whole('E4'), whole('C4'), whole('G#3')), 'sine', 0.025),
      drum(rep('x... .... .... ....', 8), 'boom', 0.16),
      drum(rep('.... .... ..x. ....', 8), 'hat', 0.02),
    ],
  },

  // Hollowhaven to Saltwash: the wind is up and the sea is grey
  sea_wind: {
    bpm: 108,
    steps: 64,
    parts: [
      line(
        bars('D5 - - - A4 - D5 - F5 - - - E5 - D5 -', 'C5 - - - A4 - C5 - E5 - - - D5 - C5 -', 'Bb4 - - - D5 - F5 - A5 - - - G5 - F5 -', 'E5 - - - - - C#5 - A4 - - - . . . .'),
        'square',
        0.06,
        3
      ),
      line(bars(rep('D2 -', 8), rep('C2 -', 8), rep('Bb1 -', 8), rep('A1 -', 8)), 'triangle', 0.2),
      arp(['D4/F4/A4', 'C4/E4/G4', 'Bb3/D4/F4', 'A3/C#4/E4'], 16, 'square', 0.018, 2),
      drum(rep('x... x... x... x...', 4), 'kick', 0.16),
      drum(rep('.... x... .... x...', 4), 'snare', 0.06),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.022),
    ],
  },

  // Saltwash to Bacchus Key: blue sky, a fair wind, and music on the water
  sea_calm: {
    bpm: 96,
    steps: 64,
    parts: [
      line(
        bars('D5 - F#5 - A5 - - - F#5 - E5 - D5 - - -', 'B4 - D5 - G5 - - - F#5 - E5 - D5 - E5 -', 'F#5 - A5 - D6 - - - C#6 - B5 - A5 - - -', 'G5 - F#5 - E5 - - - D5 - - - . . . .'),
        'triangle',
        0.09,
        4
      ),
      arp(['D4/F#4/A4', 'G3/B3/D4', 'D4/F#4/A4', 'A3/C#4/E4'], 16, 'square', 0.02, 2),
      line(
        bars('D2 - - - A1 - - - D2 - - - A1 - - -', 'G1 - - - D2 - - - G1 - - - D2 - - -', 'D2 - - - A1 - - - D2 - - - A1 - - -', 'A1 - - - E2 - - - A1 - - - E2 - - -'),
        'triangle',
        0.19
      ),
      drum(rep('x... ..x. x... ....', 4), 'kick', 0.13),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.025),
    ],
  },

  // Bacchus Key to the Forgotten Island: night, fog, and things in the water
  sea_fog: {
    bpm: 60,
    steps: 64,
    parts: [
      line(bars('E5 - - - - - - - F5 - - - E5 - - -', 'B4 - - - - - - - - - - - . . . .', 'G5 - - - F5 - - - E5 - - - D5 - - -', whole('E5')), 'triangle', 0.07, 5),
      line(bars(whole('E2'), whole('F2'), whole('C2'), whole('B1')), 'sine', 0.2),
      arp(['E3/G3/B3', 'F3/A3/C4', 'C3/E3/G3', 'B2/D#3/F#3'], 16, 'sine', 0.03, 4),
      drum(rep('x... .... .... ....', 4), 'boom', 0.18),
    ],
  },
};
