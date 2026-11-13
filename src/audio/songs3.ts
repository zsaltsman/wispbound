import type { Song } from './songs';
import { line, drum, arp, rep, lift, crashOn } from './songs';

// World 3: The Party Island. The town, the club (busy and quiet), grief, the
// hideout, the stealth night, Ayla's cave, the flashback, the shops, the ending,
// and the three Titans, each getting worse as its fight goes on.

export const SONGS3: Record<string, Song> = {
  // Bacchus Key by day: a sunburnt, bouncing party anthem
  party: {
    bpm: 128,
    steps: 64,
    parts: [
      line('C5 . E5 . G5 . E5 . A5 - G5 - E5 . C5 . ' + 'D5 . F5 . A5 . F5 . G5 - - - . . . . ' + 'C5 . E5 . G5 . C6 . B5 - A5 - G5 . E5 . ' + 'F5 . E5 . D5 . B4 . C5 - - - . . . .', 'square', 0.05),
      line(rep('C3 . C3 C4 . C3 C4 .', 2) + ' ' + rep('D3 . D3 D4 . D3 G3 .', 2) + ' ' + rep('A2 . A2 A3 . A2 A3 .', 2) + ' ' + rep('F2 . F2 F3 G2 . G3 .', 2), 'triangle', 0.22),
      drum(rep('x... x... x... x...', 4), 'kick', 0.26),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.05),
      drum(rep('.... x... .... x...', 4), 'snare', 0.08),
    ],
  },
  // inside Club Forever: four on the floor, a pumping bass, a glittering arpeggio
  club: {
    bpm: 124,
    steps: 64,
    parts: [
      arp(['A3/C4/E4/A4', 'F3/A3/C4/F4', 'C4/E4/G4/C5', 'G3/B3/D4/G4'], 16, 'square', 0.028),
      line(rep('A2 . A3 . A2 . A3 .', 2) + ' ' + rep('F2 . F3 . F2 . F3 .', 2) + ' ' + rep('C3 . C4 . C3 . C4 .', 2) + ' ' + rep('G2 . G3 . G2 . G3 .', 2), 'sawtooth', 0.1),
      line('. . . . E5 - - - . . . . C5 - D5 - ' + '. . . . A5 - - - . . . . G5 - F5 - ' + '. . . . E5 - - - . . . . G5 - - - ' + 'D5 - - - B4 - - - . . . . . . . .', 'triangle', 0.05, 4),
      drum(rep('x... x... x... x...', 4), 'kick', 0.3),
      drum(rep('..x. ..x. ..x. ..xx', 4), 'hat', 0.06),
      drum(rep('.... x... .... x...', 4), 'snare', 0.1),
    ],
  },
  // the same club after the bartender: half the crowd, half the music
  club_quiet: {
    bpm: 96,
    steps: 64,
    parts: [
      arp(['A3/C4/E4', 'F3/A3/C4', 'C4/E4/G4', 'G3/B3/D4'], 16, 'triangle', 0.03, 2),
      line(rep('A2 . . . A2 . . .', 2) + ' ' + rep('F2 . . . F2 . . .', 2) + ' ' + rep('C3 . . . C3 . . .', 2) + ' ' + rep('G2 . . . G2 . . .', 2), 'triangle', 0.16),
      drum(rep('x... .... x... ....', 4), 'kick', 0.14),
    ],
  },
  // Bacchus Key on the third day: nobody is dancing
  town_quiet: {
    bpm: 74,
    steps: 64,
    parts: [
      line('C5 - - - E5 - - - D5 - - - G4 - - - ' + 'A4 - - - C5 - - - B4 - - - - - - - ' + 'C5 - - - E5 - - - G5 - - - F5 - E5 - ' + 'D5 - - - - - - - . . . . . . . .', 'triangle', 0.06, 3),
      line('C3 - - - - - - - G2 - - - - - - - A2 - - - - - - - E2 - - - - - - - F2 - - - - - - - C3 - - - - - - - G2 - - - - - - - G2 - - - - - - -', 'triangle', 0.15),
    ],
  },
  // the bartender: slow, simple, no drums
  grief: {
    bpm: 58,
    steps: 64,
    parts: [
      line('A4 - - - - - - - C5 - - - B4 - - - ' + 'A4 - - - E4 - - - - - - - . . . . ' + 'F4 - - - A4 - - - G4 - - - E4 - - - ' + 'A4 - - - - - - - - - - - . . . .', 'triangle', 0.07, 4),
      line('A2 - - - - - - - - - - - - - - - F2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -', 'triangle', 0.15),
    ],
  },
  // Milo's hideout: a ticking clock and a melody that thinks it is righteous
  hideout: {
    bpm: 88,
    steps: 64,
    parts: [
      line('D4 - - - F4 - - - E4 - D4 - C#4 - - - ' + 'D4 - - - A4 - - - G4 - F4 - E4 - - - ' + 'F4 - - - G4 - - - A4 - - - Bb4 - A4 - ' + 'G4 - - - E4 - - - D4 - - - . . . .', 'square', 0.04),
      line(rep('D2 . . D2 . . . .', 4) + ' ' + rep('Bb1 . . Bb1 . . . .', 2) + ' ' + rep('A1 . . A1 . . . .', 2), 'triangle', 0.22),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.05),
      drum(rep('x... .... .... ....', 4), 'kick', 0.18),
    ],
  },
  // following Ayla through the night: tiptoeing staccato
  stealth: {
    bpm: 108,
    steps: 32,
    parts: [
      line('E4 . . G4 . . A4 . B4 . . A4 . . G4 . ' + 'E4 . . G4 . . A4 . C5 . B4 . A4 . . .', 'square', 0.04),
      line(rep('E2 . . . B2 . . .', 2) + ' ' + rep('C2 . . . G2 . . .', 1) + ' ' + rep('D2 . . . B1 . . .', 1), 'triangle', 0.18),
      drum(rep('..x. ...x ..x. ....', 2), 'hat', 0.04),
    ],
  },
  // Ayla's cave: a little, lonely, hopeful tune
  ayla: {
    bpm: 80,
    steps: 64,
    parts: [
      line('G4 - B4 - D5 - - - C5 - B4 - A4 - - - ' + 'B4 - G4 - E4 - - - D4 - - - - - - - ' + 'G4 - B4 - D5 - - - E5 - D5 - C5 - - - ' + 'B4 - A4 - G4 - - - - - - - . . . .', 'triangle', 0.07, 3),
      arp(['G3/B3/D4', 'C3/E3/G3', 'E3/G3/B3', 'D3/F#3/A3'], 16, 'sine', 0.035, 2),
    ],
  },
  // the flashback: a music box, the way it used to be
  memory: {
    bpm: 84,
    steps: 64,
    parts: [
      line('C6 - G5 - E5 - G5 - C6 - - - B5 - - - ' + 'A5 - F5 - C5 - F5 - A5 - - - G5 - - - ' + 'E5 - G5 - C6 - E6 - D6 - C6 - B5 - - - ' + 'C6 - - - G5 - - - C6 - - - . . . .', 'sine', 0.07),
      arp(['C4/E4/G4', 'F3/A3/C4', 'C4/E4/G4', 'G3/B3/D4'], 16, 'triangle', 0.03, 2),
    ],
  },
  // the same music box, winding down
  memory_sad: {
    bpm: 60,
    steps: 64,
    parts: [
      line('C5 - - - G4 - - - Eb4 - - - G4 - - - ' + 'Ab4 - - - F4 - - - C4 - - - - - - - ' + 'Eb4 - - - G4 - - - C5 - - - Bb4 - - - ' + 'Ab4 - - - G4 - - - - - - - . . . .', 'sine', 0.07, 3),
      line('C3 - - - - - - - Ab2 - - - - - - - F2 - - - - - - - G2 - - - - - - - C3 - - - - - - - Eb2 - - - - - - - F2 - - - - - - - G2 - - - - - - -', 'triangle', 0.13),
    ],
  },
  // the shops of Bacchus Key: easy, jazzy, a little cheesy
  w3shop: {
    bpm: 104,
    steps: 32,
    parts: [
      line('E5 - G5 . A5 - G5 . E5 - D5 . C5 - . . ' + 'D5 - E5 . G5 - E5 . D5 - C5 . A4 - . .', 'triangle', 0.06, 3),
      line(rep('C3 . G2 . A2 . E2 .', 2) + ' ' + rep('F2 . C3 . G2 . D3 .', 2), 'triangle', 0.17),
      drum(rep('x... ..x. x... ..x.', 2), 'kick', 0.1),
      drum(rep('..x. ..x. ..x. ..x.', 2), 'hat', 0.03),
    ],
  },
  // the end of World 3: bittersweet, still a little bit of a party
  w3_end: {
    bpm: 86,
    steps: 64,
    parts: [
      line('C5 - - - E5 - G5 - A5 - - - G5 - E5 - ' + 'F5 - - - E5 - D5 - C5 - - - - - - - ' + 'A4 - - - C5 - E5 - G5 - - - F5 - E5 - ' + 'D5 - - - B4 - - - C5 - - - . . . .', 'triangle', 0.08, 4),
      arp(['C4/E4/G4', 'A3/C4/E4', 'F3/A3/C4', 'G3/B3/D4'], 16, 'square', 0.022, 2),
      line('C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - - C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - -', 'triangle', 0.16),
      drum(rep('x... .... x... ....', 4), 'kick', 0.1),
    ],
  },
  // ---- the Titans
  scorvex: {
    bpm: 132,
    steps: 64,
    parts: [
      line('E4 . E4 . G4 . E4 . A4 - G4 - E4 - D4 - ' + 'E4 . E4 . G4 . B4 . A4 - G4 - E4 - - - ' + 'C5 . C5 . B4 . A4 . G4 - A4 - B4 - - - ' + 'E4 . G4 . B4 . E5 . D5 - B4 - E4 - - -', 'square', 0.055),
      line(rep('E2 E2 . E2 E3 . E2 .', 4) + ' ' + rep('C2 C2 . C2 C3 . C2 .', 2) + ' ' + rep('B1 B1 . B1 B2 . B1 .', 2), 'sawtooth', 0.11),
      drum(rep('x.x. ..x. x.x. ..x.', 4), 'kick', 0.3),
      drum(rep('.... x... .... x...', 4), 'snare', 0.13),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.04),
    ],
  },
  scorvex2: {
    bpm: 148,
    steps: 64,
    parts: [
      line('E5 . E5 . G5 . E5 . A5 - G5 - E5 - D5 - ' + 'E5 . E5 . G5 . B5 . A5 - G5 - E5 - - - ' + 'C6 . C6 . B5 . A5 . G5 - A5 - B5 - - - ' + 'E5 . G5 . B5 . E6 . D6 - B5 - E5 - - -', 'square', 0.06),
      line(rep('E2 E2 E3 E2 E2 E3 E2 E3', 4) + ' ' + rep('C2 C2 C3 C2 C2 C3 C2 C3', 2) + ' ' + rep('B1 B1 B2 B1 B1 B2 B1 B2', 2), 'sawtooth', 0.12),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.32),
      drum(rep('.... x... .... x.x.', 4), 'snare', 0.15),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.04),
    ],
  },
  widow1: {
    bpm: 116,
    steps: 64,
    parts: [
      line('F4 - Ab4 - C5 - B4 - C5 - - - Ab4 - G4 - ' + 'F4 - Ab4 - Db5 - C5 - Bb4 - - - G4 - - - ' + 'F4 - Ab4 - C5 - F5 - E5 - C5 - Ab4 - - - ' + 'G4 - B4 - D5 - C5 - - - - - . . . .', 'square', 0.05),
      line(rep('F2 . F2 C3 . F2 Ab2 .', 2) + ' ' + rep('Db2 . Db2 Ab2 . Db2 F2 .', 2) + ' ' + rep('F2 . F2 C3 . F2 Ab2 .', 2) + ' ' + rep('C2 . C2 G2 . C2 E2 .', 2), 'triangle', 0.24),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.28),
      drum(rep('xxx. xxx. xxx. xxx.', 4), 'hat', 0.04),
    ],
  },
  widow2: {
    bpm: 132,
    steps: 64,
    parts: [
      line('F5 - Ab5 - C6 - B5 - C6 - - - Ab5 - G5 - ' + 'F5 - Ab5 - Db6 - C6 - Bb5 - - - G5 - - - ' + 'F5 - Ab5 - C6 - F6 - E6 - C6 - Ab5 - - - ' + 'G5 - B5 - D6 - C6 - - - - - . . . .', 'square', 0.055),
      arp(['F4/Ab4/C5', 'Db4/F4/Ab4', 'F4/Ab4/C5', 'C4/E4/G4'], 16, 'square', 0.024),
      line(rep('F2 F2 C3 F2 F2 Ab2 F2 C3', 2) + ' ' + rep('Db2 Db2 Ab2 Db2 Db2 F2 Db2 Ab2', 2) + ' ' + rep('F2 F2 C3 F2 F2 Ab2 F2 C3', 2) + ' ' + rep('C2 C2 G2 C2 C2 E2 C2 G2', 2), 'sawtooth', 0.1),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.3),
      drum(rep('.... x... .... x...', 4), 'snare', 0.13),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.04),
    ],
  },
  widow3: {
    bpm: 156,
    steps: 64,
    parts: [
      line('F5 . F5 . Ab5 . C6 . B5 - C6 - Db6 - C6 - ' + 'F5 . F5 . Ab5 . Db6 . C6 - Bb5 - G5 - - - ' + 'F6 . E6 . C6 . Ab5 . G5 . F5 . E5 . C5 . ' + 'F5 - - - C5 - - - F5 - - - . . . .', 'square', 0.065),
      arp(['F4/Ab4/C5/F5', 'Db4/F4/Ab4/Db5', 'F4/Ab4/C5/F5', 'C4/E4/G4/C5'], 16, 'square', 0.024),
      line(rep('F2 F2 . F2 F3 . F2 .', 4) + ' ' + rep('Db2 Db2 . Db2 Db3 . C2 .', 4), 'sawtooth', 0.12),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.34),
      drum(rep('.... x... .... x.xx', 4), 'snare', 0.16),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.045),
    ],
  },
  // Ironclad: a march for a fortress, heavier with every phase
  iron1: {
    bpm: 92,
    steps: 64,
    parts: [
      line('D4 - - - D4 - F4 - A4 - - - G4 - F4 - ' + 'E4 - - - C4 - - - D4 - - - - - - - ' + 'F4 - - - F4 - A4 - C5 - - - Bb4 - A4 - ' + 'G4 - - - E4 - - - D4 - - - . . . .', 'sawtooth', 0.05),
      line(rep('D2 - . D2 - . D2 .', 2) + ' ' + rep('C2 - . C2 - . C2 .', 2) + ' ' + rep('Bb1 - . Bb1 - . Bb1 .', 2) + ' ' + rep('A1 - . A1 - . A1 .', 2), 'triangle', 0.28),
      drum(rep('x... .... x... ..x.', 4), 'kick', 0.34),
      drum(rep('.... x... .... x...', 4), 'snare', 0.14),
    ],
  },
  iron2: {
    bpm: 108,
    steps: 64,
    parts: [
      line('D5 - - - D5 - F5 - A5 - - - G5 - F5 - ' + 'E5 - - - C5 - - - D5 - - - - - - - ' + 'F5 - - - F5 - A5 - C6 - - - Bb5 - A5 - ' + 'G5 - - - E5 - F5 - D5 - - - . . . .', 'square', 0.055),
      line(rep('D2 D2 . D2 D3 . D2 .', 2) + ' ' + rep('C2 C2 . C2 C3 . C2 .', 2) + ' ' + rep('Bb1 Bb1 . Bb1 Bb2 . Bb1 .', 2) + ' ' + rep('A1 A1 . A1 A2 . A1 .', 2), 'sawtooth', 0.13),
      arp(['D4/F4/A4', 'C4/E4/G4', 'Bb3/D4/F4', 'A3/C#4/E4'], 16, 'square', 0.022, 2),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.34),
      drum(rep('.... x... .... x...', 4), 'snare', 0.15),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.04),
    ],
  },
  iron3: {
    bpm: 126,
    steps: 64,
    parts: [
      line('D5 . D5 . F5 . A5 . D6 - C6 - A5 - F5 - ' + 'E5 . E5 . G5 . C6 . D6 - - - . . . . ' + 'F6 . E6 . D6 . C6 . Bb5 - A5 - G5 - F5 - ' + 'E5 - C#5 - A4 - C#5 - D5 - - - . . . .', 'square', 0.065),
      line(rep('D2 D2 D3 D2 D2 D3 D2 D3', 2) + ' ' + rep('C2 C2 C3 C2 C2 C3 C2 C3', 2) + ' ' + rep('Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2', 2) + ' ' + rep('A1 A1 A2 A1 A1 A2 C#2 A1', 2), 'sawtooth', 0.14),
      arp(['D4/F4/A4/D5', 'C4/E4/G4/C5', 'Bb3/D4/F4/Bb4', 'A3/C#4/E4/A4'], 16, 'square', 0.024),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.36),
      drum(rep('.... x... .... x.xx', 4), 'snare', 0.17),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.045),
    ],
  },
};

// ---- the Titans' openings: each one hits from the first beat, in its own voice,
// and every harder phase comes in on a drum roll and a crash.
// Scorvex: an engine turning over. Power-chord hammering, a snare roll, the furnace roars.
SONGS3.scorvex.intro = {
  steps: 32,
  parts: [
    line('E2 - - . E2 - - . E2 - . . . . . . ' + 'G2 - - . G2 - - . A2 - - - B2 - - -', 'sawtooth', 0.14),
    line('B2 - - . B2 - - . B2 - . . . . . . ' + 'D3 - - . D3 - - . E3 - - - F#3 - - -', 'sawtooth', 0.09),
    line('E5 - - . E5 - - . E5 - - - - - - - ' + '. . . . . . . . B4 - - - D5 - - -', 'square', 0.06, 3),
    drum('x..x..x.x....... ' + 'x..x..x.x.x.xxxx', 'kick', 0.34),
    drum('x............... ' + '........x.......', 'boom', 0.42),
    drum('................ ' + '........x.x.xxxx', 'snare', 0.16),
    drum('x............... ' + '................', 'crash', 0.1),
  ],
};
// Widowmaker: something with too many legs. A chromatic skitter up the web, then the bite.
SONGS3.widow1.intro = {
  steps: 32,
  parts: [
    line('F5 Ab5 B5 C6 F5 Ab5 B5 C6 F5 Ab5 B5 C6 Db6 C6 B5 Ab5 ' + 'F5 - - - . . . . B5 - - - Ab5 - - -', 'square', 0.05),
    line('. . . . . . . . . . . . . . . . ' + 'F2 - - - - - - - Db2 - - - C2 - - -', 'sawtooth', 0.14),
    line('. . . . . . . . . . . . . . . . ' + 'B2 - - - - - - - Ab2 - - - G2 - - -', 'sawtooth', 0.09),
    drum('xxxxxxxxxxxxxxxx ' + 'x.x.x.x.xxxxxxxx', 'hat', 0.045),
    drum('................ ' + 'x.......x.......', 'boom', 0.42),
    drum('................ ' + 'x...............', 'crash', 0.11),
    drum('................ ' + '....x.......x.xx', 'snare', 0.14),
  ],
};
// Ironclad: a fortress on the march. Three huge booms under a brass wall, then the drums.
SONGS3.iron1.intro = {
  steps: 32,
  parts: [
    line('D2 - - - - - . . D2 - - - - - . . ' + 'D2 - - . C2 - - . Bb1 - - . A1 - - -', 'sawtooth', 0.14),
    line('A2 - - - - - . . A2 - - - - - . . ' + 'A2 - - . G2 - - . F2 - - . E2 - - -', 'sawtooth', 0.09),
    line('D4 - - - - - . . F4 - - - - - . . ' + 'D4 - - . E4 - - . F4 - - . A4 - - -', 'square', 0.06, 2),
    drum('x.......x....... ' + 'x...x...x.x.x.x.', 'boom', 0.48),
    drum('x............... ' + 'x...............', 'crash', 0.1),
    drum('................ ' + '........x.x.xxxx', 'snare', 0.16),
  ],
};
for (const k of ['scorvex2', 'widow2', 'widow3', 'iron2', 'iron3']) {
  SONGS3[k].intro = lift();
  SONGS3[k].parts.push(crashOn(SONGS3[k].steps));
}
// and every first phase opens each pass of its loop on a crash
for (const k of ['scorvex', 'widow1', 'iron1']) SONGS3[k].parts.push(crashOn(SONGS3[k].steps, 0.07));
