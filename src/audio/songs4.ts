import type { Song } from './songs';
import { line, drum, arp, rep, lift, crashOn } from './songs';

// World 4: The Forgotten Island. A still, starry night over an empty land; the old
// houses; the guardians' homes (the tower, the giant tree); the old man's room; the
// fights, each with its own voice; the Reaper, who brings no music of his own; the end.

export const SONGS4: Record<string, Song> = {
  // the island at night: slow, open, a little lonely, a music box under the stars
  w4_island: {
    bpm: 66,
    steps: 64,
    parts: [
      line('E5 - - - G5 - - - A5 - - - B5 - A5 - ' + 'G5 - - - E5 - - - D5 - - - - - - - ' + 'C5 - - - E5 - - - G5 - - - A5 - G5 - ' + 'E5 - - - - - - - . . . . . . . .', 'triangle', 0.055, 4),
      arp(['E3/B3/E4/G4', 'C3/G3/C4/E4', 'A2/E3/A3/C4', 'B2/F#3/B3/D4'], 16, 'sine', 0.035, 2),
      line('E2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - - B1 - - - - - - - - - - - - - - -', 'triangle', 0.13),
    ],
  },
  // indoors on the island: dust, empty rooms, a slow clock
  w4_inside: {
    bpm: 60,
    steps: 64,
    parts: [
      line('A4 - - - - - - - C5 - - - B4 - - - ' + 'G4 - - - - - - - E4 - - - - - - - ' + 'F4 - - - A4 - - - G4 - - - E4 - - - ' + 'D4 - - - - - - - . . . . . . . .', 'triangle', 0.05, 3),
      line(rep('A2 . . . . . . . ', 2) + rep('E2 . . . . . . . ', 2) + rep('F2 . . . . . . . ', 2) + rep('D2 . . . . . . . ', 2), 'triangle', 0.14),
      drum(rep('..x. .... ..x. ....', 4), 'hat', 0.02),
    ],
  },
  // the crow's nest, the dark cabin: a low pulse and a nervous figure
  w4_tense: {
    bpm: 92,
    steps: 32,
    parts: [
      line('D4 . . Eb4 . . D4 . . . C4 . D4 . . . ' + 'D4 . . Eb4 . . F4 . Eb4 . D4 . C4 . . .', 'square', 0.035),
      line(rep('D2 . D2 . D2 . D2 .', 2) + ' ' + rep('C2 . C2 . Bb1 . Bb1 .', 2), 'triangle', 0.2),
      drum(rep('x... .... x... ....', 2), 'kick', 0.18),
      drum(rep('.... ..x. .... ..x.', 2), 'hat', 0.04),
    ],
  },
  // the Forgotten Garden: everything that the rest of the island lost
  w4_garden: {
    bpm: 84,
    steps: 64,
    parts: [
      line('G5 - - - B5 - D6 - C6 - B5 - A5 - - - ' + 'F#5 - - - A5 - C6 - B5 - A5 - G5 - - - ' + 'E5 - - - G5 - B5 - A5 - G5 - F#5 - - - ' + 'G5 - - - D5 - - - G5 - - - - - - -', 'triangle', 0.05, 3),
      arp(['G3/B3/D4/G4', 'D3/F#3/A3/D4', 'E3/G3/B3/E4', 'C3/E3/G3/C4'], 16, 'sine', 0.04),
      line('G2 - - - - - - - D2 - - - - - - - E2 - - - - - - - C2 - - - - - - - G2 - - - - - - - D2 - - - - - - - C2 - - - - - - - D2 - - - - - - -', 'triangle', 0.13),
    ],
  },
  // the old man's room at the top of the tower: warm, a little silly, a waltz
  w4_oldman: {
    bpm: 108,
    steps: 48,
    parts: [
      line('C5 - - E5 - - G5 - - - - F5 ' + 'E5 - - D5 - - C5 - - - - - ' + 'A4 - - C5 - - F5 - - E5 - D5 ' + 'C5 - - - - - G4 - - - - -', 'triangle', 0.06, 2),
      line(rep('C3 . . G3 . . ', 2) + rep('F2 . . C3 . . ', 2) + rep('A2 . . E3 . . ', 2) + rep('G2 . . D3 . . ', 2), 'triangle', 0.14),
      drum(rep('x.. ... ... ...', 4), 'kick', 0.08),
    ],
  },
  // inside the giant tree: hollow, green, mysterious: echoing runs
  w4_tree: {
    bpm: 78,
    steps: 64,
    parts: [
      arp(['D4/F4/A4/C5', 'Bb3/D4/F4/A4', 'G3/Bb3/D4/F4', 'A3/C#4/E4/G4'], 16, 'sine', 0.04),
      line('A5 - - - - - - - F5 - - - G5 - A5 - ' + 'D5 - - - - - - - - - - - . . . . ' + 'C5 - - - D5 - - - F5 - - - E5 - D5 - ' + 'C#5 - - - - - - - - - - - . . . .', 'triangle', 0.045, 4),
      line('D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - -', 'triangle', 0.14),
    ],
  },
  // the Champion: a stomping brute, all drum
  w4_champ: {
    bpm: 112,
    steps: 64,
    parts: [
      line('E4 - . E4 - . G4 - A4 - - - G4 - E4 - ' + 'D4 - . D4 - . E4 - G4 - - - - - - - ' + 'E4 - . E4 - . G4 - B4 - - - A4 - G4 - ' + 'A4 - G4 - E4 - D4 - E4 - - - . . . .', 'sawtooth', 0.055),
      line(rep('E2 . E2 . . . E2 .', 4) + ' ' + rep('C2 . C2 . . . D2 .', 4), 'triangle', 0.28),
      drum(rep('x.x. ..x. x.x. ..x.', 4), 'boom', 0.3),
      drum(rep('.... x... .... x...', 4), 'snare', 0.15),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.04),
    ],
  },
  // Wispmane: grand and ancient; heavy toms under a slow, proud theme
  w4_wisp: {
    bpm: 96,
    steps: 64,
    parts: [
      line('A4 - - - E5 - - - D5 - C5 - B4 - C5 - ' + 'A4 - - - - - - - G4 - A4 - B4 - - - ' + 'C5 - - - G5 - - - F5 - E5 - D5 - E5 - ' + 'A5 - - - G5 - E5 - A5 - - - - - - -', 'square', 0.055, 2),
      line('A3 - - - - - - - G3 - - - - - - - F3 - - - - - - - E3 - - - - - - - ' + 'A3 - - - - - - - G3 - - - - - - - F3 - - - - - - - G#3 - - - - - - -', 'triangle', 0.08),
      line(rep('A1 . . A1 . . A2 .', 2) + ' ' + rep('G1 . . G1 . . G2 .', 2) + ' ' + rep('F1 . . F1 . . F2 .', 2) + ' ' + rep('E1 . . E1 . . E2 .', 2), 'sawtooth', 0.12),
      drum(rep('x..x ..x. x... x.x.', 4), 'boom', 0.32),
      drum(rep('x... x... x... x...', 4), 'kick', 0.24),
      drum(rep('.... x... .... x..x', 4), 'snare', 0.13),
    ],
  },
  // the Mutant Crow: shrill and flapping
  w4_crow: {
    bpm: 140,
    steps: 32,
    parts: [
      line('B4 C5 B4 . F5 . E5 . D5 C5 B4 . A4 . B4 . ' + 'B4 C5 B4 . F5 . G5 . F5 E5 D5 . C5 . B4 .', 'square', 0.05),
      line(rep('E2 . E3 . E2 . E3 .', 2) + ' ' + rep('F2 . F3 . F2 . F3 .', 2), 'sawtooth', 0.11),
      drum(rep('x..x x..x x..x x.x.', 2), 'kick', 0.3),
      drum(rep('.... x... .... x...', 2), 'snare', 0.14),
      drum(rep('xxxx xxxx xxxx xxxx', 2), 'hat', 0.04),
    ],
  },
  // the Ancient Tree Guardian: bouncy, nutty, wild
  w4_squirrel: {
    bpm: 150,
    steps: 64,
    parts: [
      line('G4 . B4 . D5 . G5 . F#5 . D5 . A4 . D5 . ' + 'E5 . C5 . G4 . E5 . D5 - - - . . . . ' + 'G4 . B4 . D5 . G5 . A5 . G5 . F#5 . E5 . ' + 'D5 . B4 . A4 . F#4 . G4 - - - . . . .', 'square', 0.05),
      line(rep('G2 . D3 . G2 . D3 .', 2) + ' ' + rep('C3 . G2 . C3 . G2 .', 2) + ' ' + rep('E2 . B2 . E2 . B2 .', 2) + ' ' + rep('D2 . A2 . D2 . F#2 .', 2), 'triangle', 0.24),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.28),
      drum(rep('.... x... .... x...', 4), 'snare', 0.13),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.05),
    ],
  },
  // Viperwind: faster and fiercer than Wispmane; a whipping, spiralling theme
  w4_viper: {
    bpm: 164,
    steps: 64,
    parts: [
      line('D5 E5 F5 A5 . . G5 F5 E5 D5 . . C5 D5 E5 . ' + 'F5 E5 D5 C5 A4 . . . D5 . F5 . A5 . . . ' + 'Bb5 A5 G5 F5 . . E5 F5 G5 A5 . . G5 F5 E5 . ' + 'D5 . A4 . D5 . E5 . F5 - E5 - D5 - . .', 'square', 0.055),
      arp(['D4/F4/A4/D5', 'C4/E4/G4/C5', 'Bb3/D4/F4/Bb4', 'A3/C#4/E4/A4'], 16, 'square', 0.022),
      line(rep('D2 D2 D3 D2 . D2 D3 .', 2) + ' ' + rep('C2 C2 C3 C2 . C2 C3 .', 2) + ' ' + rep('Bb1 Bb1 Bb2 Bb1 . Bb1 Bb2 .', 2) + ' ' + rep('A1 A1 A2 A1 . A1 C#2 .', 2), 'sawtooth', 0.12),
      drum(rep('x.x. x.xx x.x. x.xx', 4), 'kick', 0.32),
      drum(rep('.... x... .... x.x.', 4), 'snare', 0.15),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.045),
    ],
  },
  // the Reaper: no melody at all. A heartbeat of a bass, a toll, and silence between
  w4_reaper1: {
    bpm: 72,
    steps: 32,
    parts: [
      line('D2 - - - - - - - . . . . . . . . ' + 'Eb2 - - - - - - - . . . . . . . .', 'triangle', 0.22),
      line('. . . . . . . . . . . . D5 - - - ' + '. . . . . . . . . . . . Eb5 - - -', 'sine', 0.035, 2),
      drum(rep('x..x .... .... ....', 2), 'kick', 0.26),
    ],
  },
  // THE COLLECTOR: the same toll, but the dark has started to sing
  w4_reaper2: {
    bpm: 84,
    steps: 32,
    parts: [
      line('D2 - - D2 - - - - Eb2 - - - - - - - ' + 'D2 - - D2 - - - - C#2 - - - - - - -', 'sawtooth', 0.13),
      line('D4 - - - Eb4 - - - D4 - - - C#4 - - - ' + 'D4 - - - F4 - - - Eb4 - - - D4 - - -', 'square', 0.03, 4),
      arp(['D3/F3/Ab3', 'Eb3/G3/Bb3', 'D3/F3/Ab3', 'C#3/E3/G3'], 8, 'sine', 0.03),
      drum(rep('x..x ..x. x... ..x.', 2), 'kick', 0.3),
      drum(rep('.... .... .... x...', 2), 'boom', 0.22),
    ],
  },
  // the escape: running for your life. A pounding phrygian ostinato, a lead that
  // keeps falling a tritone, and a boom under every bar
  w4_escape: {
    bpm: 176,
    steps: 32,
    parts: [
      line('D5 . Eb5 . D5 . A4 . Bb4 . A4 . Ab4 - - - ' + 'D5 . Eb5 . F5 . Eb5 . D5 . Ab5 - - - . .', 'square', 0.05),
      line(rep('D2 D2 D3 D2 D2 Eb3 D2 D2', 2) + ' ' + rep('Bb1 Bb1 Bb2 Bb1 Ab1 Ab1 Ab2 Ab1', 2), 'sawtooth', 0.13),
      line('D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - Ab1 - - - - - - -', 'triangle', 0.2),
      drum(rep('x.x. x.x. x.x. x.x.', 2), 'kick', 0.34),
      drum(rep('.... x... .... x.xx', 2), 'snare', 0.16),
      drum(rep('xxxx xxxx xxxx xxxx', 2), 'hat', 0.04),
      drum(rep('x... .... .... ....', 2), 'boom', 0.26),
    ],
  },
  // something terrible has arrived: a stalking low pulse, a tritone that will not
  // resolve, a toll high above, and a boom on every bar
  menace: {
    bpm: 80,
    steps: 32,
    parts: [
      line(rep('D1 . D1 . D1 . D1 . D1 . D1 . Eb1 . D1 .', 2), 'sawtooth', 0.14),
      line('D2 - - - - - . . Ab2 - - - - - . . ' + 'D2 - - - - - . . A2 - - - Ab2 - - -', 'sawtooth', 0.07),
      line('D5 - - - - - - - - - - - - - - - ' + 'Eb5 - - - - - - - Ab4 - - - - - - -', 'square', 0.022, 5),
      line('. . . . . . . . . . . . D6 . . . ' + '. . . . . . . . . . . . Ab5 . . .', 'sine', 0.04),
      drum(rep('x..x .... x... ....', 2), 'kick', 0.32),
      drum('x... .... .... .... x... .... .... ....', 'boom', 0.34),
      drum('.... .... .... .... .... .... .... ..xx', 'snare', 0.08),
    ],
  },
  // Flamora: radiant, vast, a little sad
  w4_flamora: {
    bpm: 70,
    steps: 64,
    parts: [
      line('C5 - - - G5 - - - F5 - E5 - D5 - - - ' + 'E5 - - - C6 - - - B5 - - - G5 - - - ' + 'A5 - - - F5 - - - G5 - E5 - D5 - - - ' + 'C5 - - - - - - - - - - - . . . .', 'triangle', 0.06, 4),
      arp(['C4/E4/G4/C5', 'E3/G3/B3/E4', 'F3/A3/C4/F4', 'G3/B3/D4/G4'], 16, 'sine', 0.04),
      line('C2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - - F2 - - - - - - - - - - - - - - - G2 - - - - - - - - - - - - - - -', 'triangle', 0.14),
    ],
  },
  // the cell, and TO BE CONTINUED: the island theme, slower, in a minor key
  w4_end: {
    bpm: 56,
    steps: 64,
    parts: [
      line('E5 - - - G5 - - - A5 - - - B5 - A5 - ' + 'G5 - - - E5 - - - D#5 - - - - - - - ' + 'C5 - - - E5 - - - G5 - - - F#5 - E5 - ' + 'E5 - - - - - - - . . . . . . . .', 'triangle', 0.05, 4),
      arp(['E3/G3/B3/E4', 'C3/E3/G3/C4', 'A2/C3/E3/A3', 'B2/D#3/F#3/B3'], 16, 'sine', 0.03, 2),
      line('E2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - - B1 - - - - - - - - - - - - - - -', 'triangle', 0.12),
    ],
  },
};

// The boss themes open on a hit; every first loop pass lands on a crash.
SONGS4.w4_wisp.intro = {
  steps: 32,
  parts: [
    line('A1 - - - - - - - . . . . A1 - - - ' + 'E2 - - - - - - - G#2 - - - - - - -', 'sawtooth', 0.16),
    line('A4 - - - - - - - . . . . E5 - - - ' + 'A5 - - - - - - - G#5 - - - - - - -', 'square', 0.05, 3),
    drum('x... .... .... x... x... x... xxxx xxxx', 'boom', 0.34),
    crashOn(32, 0.1),
  ],
};
SONGS4.w4_viper.intro = {
  steps: 16,
  parts: [
    line('D5 E5 F5 G5 A5 Bb5 C6 D6 . . . . . . . .', 'square', 0.05),
    drum('x.x. x.x. xxxx xxxx', 'snare', 0.15),
    drum('x... x... x... x...', 'kick', 0.3),
  ],
};
// the spirit research facility: a cold hum, a slow ping, a tune that will not resolve
SONGS4.w4_lab = {
  bpm: 70,
  steps: 64,
  parts: [
    line('B4 - - - . . . . F5 - - - . . . . ' + 'E5 - - - - - - - . . . . . . . . ' + 'B4 - - - . . . . C5 - - - . . . . ' + 'A#4 - - - - - - - . . . . . . . .', 'triangle', 0.045, 5),
    line('E2 ' + rep('-', 31) + ' F2 ' + rep('-', 31), 'sawtooth', 0.045),
    line(rep('B5 . . . . . . . . . . . . . . .', 4), 'sine', 0.025),
    drum(rep('.... .... ..x. ....', 4), 'hat', 0.02),
  ],
};
// SUBJECT 9: a driving, stuttering theme that keeps slipping a semitone out of key
SONGS4.w4_subject = {
  bpm: 150,
  steps: 32,
  parts: [
    line('E4 E4 . F4 . E4 . . A#4 . A4 . G4 . F4 . ' + 'E4 E4 . F4 . E4 . . B4 - A#4 - A4 . G#4 .', 'square', 0.05),
    line(rep('E2 E2 E3 E2', 4) + ' ' + rep('F2 F2 F3 F2', 2) + ' ' + rep('E2 E2 B2 E2', 2), 'sawtooth', 0.11),
    arp(['E5/F5/E5/A#5', 'E5/F5/E5/B5'], 16, 'square', 0.018),
    drum(rep('x.x. x..x x.x. x.xx', 2), 'kick', 0.3),
    drum(rep('.... x... .... x...', 2), 'snare', 0.14),
    drum(rep('x.xx x.xx x.xx x.xx', 2), 'hat', 0.04),
  ],
};
for (const k of ['w4_champ', 'w4_crow', 'w4_squirrel', 'w4_subject']) SONGS4[k].intro = lift();
for (const k of ['w4_champ', 'w4_wisp', 'w4_crow', 'w4_squirrel', 'w4_viper', 'w4_subject']) SONGS4[k].parts.push(crashOn(SONGS4[k].steps, 0.07));
SONGS4.w4_reaper2.intro = lift(0.12);
