import type { Song } from './songs';
import { line, drum, arp, rep, lift, crashOn } from './songs';

// THE GOD OF DEATH, and everything after. Every boss track grows out of the Reaper's own
// toll from `menace`: D, then E-flat, then the A-flat that never resolves. The supercharge
// answers it in D MAJOR, and the ending finally lets the tritone go.

export const SONGS6: Record<string, Song> = {
  // the Reaper, fighting at last: the stalking pulse sped up into a gallop, the toll as a lead
  gr_reaper1: {
    bpm: 116,
    steps: 64,
    parts: [
      line(rep('D2 D2 . D2 . D2 Eb2 . D2 D2 . D2 Ab1 . A1 .', 4), 'sawtooth', 0.12),
      line(
        'D5 - - - - - Eb5 - - - Ab4 - - - - - ' +
          'D5 - - - F5 - Eb5 - D5 - C5 - Ab4 - - - ' +
          'D5 - - - - - Eb5 - - - A5 - - - Ab5 - ' +
          'G5 - F5 - Eb5 - D5 - Eb5 - - - D5 - - -',
        'square',
        0.05,
        4,
      ),
      arp(['D3/F3/A3', 'Eb3/G3/Bb3', 'D3/F3/Ab3', 'C3/Eb3/G3', 'D3/F3/A3', 'Eb3/G3/Bb3', 'Bb2/D3/F3', 'A2/C#3/E3'], 8, 'triangle', 0.03, 1),
      drum(rep('x... x..x x... x...', 4), 'kick', 0.28),
      drum(rep('.... x... .... x...', 4), 'snare', 0.11),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.035),
      drum('x... .... .... .... ' + '.... .... .... .... ' + 'x... .... .... .... ' + '.... .... .... ....', 'boom', 0.3),
    ],
  },
  // the BUFF Reaper: no more gliding. Every beat is a stomp, the bass is a wall
  gr_buff: {
    bpm: 132,
    steps: 32,
    parts: [
      line(rep('D1 - . D1 . . D1 . Eb1 - . Eb1 . . Ab0 .', 2), 'sawtooth', 0.15),
      line(rep('D2 . . D2 . . D2 . Eb2 . . Eb2 . . Ab1 .', 2), 'square', 0.06),
      line('D5 - - - - - - - Eb5 - - - Ab4 - - - ' + 'D5 - - - F5 - - - Eb5 - D5 - Ab4 - - -', 'sawtooth', 0.04, 3),
      drum(rep('x.x. ..x. x.x. ..x.', 2), 'kick', 0.32),
      drum(rep('.... x... .... x.x.', 2), 'snare', 0.14),
      drum(rep('x... x... x... x...', 2), 'boom', 0.24),
      drum(rep('..x. ..x. ..x. ..x.', 2), 'hat', 0.04),
    ],
  },
  // THE TRUE FORM: a cathedral. A tolling organ, a choir held on the tritone, a slow
  // three-beat sway like great wings, and under it the old gallop, waiting
  gr_true: {
    bpm: 108,
    steps: 96,
    parts: [
      line(
        'D5 - - - - - - - - - - - Eb5 - - - - - - - - - - - ' +
          'Ab4 - - - - - - - - - - - A4 - - - Bb4 - - - C5 - - - ' +
          'D5 - - - - - - - F5 - - - Eb5 - - - - - - - D5 - - - ' +
          'C5 - - - Bb4 - - - Ab4 - - - - - - - - - - - . . . .',
        'triangle',
        0.06,
        5,
      ),
      line(
        'D4 - - - - - - - - - - - - - - - - - - - - - - - ' +
          'Ab3 - - - - - - - - - - - - - - - - - - - - - - - ' +
          'Bb3 - - - - - - - - - - - - - - - - - - - - - - - ' +
          'A3 - - - - - - - - - - - Ab3 - - - - - - - - - - -',
        'sine',
        0.05,
        3,
      ),
      arp(['D3/F3/A3/D4', 'D3/F3/Ab3/D4', 'Bb2/D3/F3/Bb3', 'A2/C#3/E3/A3'], 24, 'square', 0.018, 2),
      line(rep('D1 - - - - - D1 - - - - - D1 - - - - - Eb1 - - - - -', 4), 'sawtooth', 0.12),
      drum(rep('x..... x..... x..... x.x...', 4), 'kick', 0.3),
      drum(rep('...... ...x.. ...... ...x..', 4), 'snare', 0.08),
      drum('x' + '.'.repeat(23) + 'x' + '.'.repeat(23) + 'x' + '.'.repeat(23) + 'x' + '.'.repeat(23), 'boom', 0.36),
    ],
  },
  // HIS DOMAIN, at full power: the gallop, the cathedral and the stomp all at once
  gr_final: {
    bpm: 150,
    steps: 64,
    parts: [
      line(rep('D2 D2 Eb2 D2 . D2 Ab1 . D2 D2 Eb2 D2 . F2 Eb2 .', 4), 'sawtooth', 0.12),
      line(
        'D5 - - - Eb5 - - - Ab4 - - - - - - - ' +
          'D5 - F5 - Eb5 - D5 - C5 - Eb5 - D5 - - - ' +
          'A5 - - - Ab5 - - - G5 - F5 - Eb5 - - - ' +
          'D5 - Eb5 - F5 - Ab5 - G5 - - - D5 - - -',
        'square',
        0.05,
        3,
      ),
      line(
        'D4 - - - - - - - Eb4 - - - - - - - ' + 'Ab3 - - - - - - - A3 - - - - - - - ' + 'Bb3 - - - - - - - C4 - - - - - - - ' + 'Ab3 - - - - - - - A3 - - - - - - -',
        'sine',
        0.04,
        3,
      ),
      arp(['D4/F4/A4', 'Eb4/G4/Bb4', 'D4/F4/Ab4', 'D4/F4/A4', 'Bb3/D4/F4', 'C4/Eb4/G4', 'D4/F4/Ab4', 'A3/C#4/E4'], 8, 'square', 0.018, 1),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.3),
      drum(rep('.... x... .... x..x', 4), 'snare', 0.13),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.03),
      drum('x... .... .... .... ' + '.... .... .... .... ' + 'x... .... .... .... ' + '.... .... x... x...', 'boom', 0.32),
    ],
  },
  // the last stretch: your answer in D MAJOR rides on top of his D minor. Same speed,
  // same bass, but the lead is yours now
  gr_final2: {
    bpm: 160,
    steps: 64,
    parts: [
      line(rep('D2 D2 Eb2 D2 . D2 Ab1 . D2 D2 Eb2 D2 . F2 Eb2 .', 4), 'sawtooth', 0.12),
      line(
        'D5 - - - F#5 - - - A5 - - - - - G5 - ' +
          'F#5 - - - E5 - D5 - E5 - - - A4 - - - ' +
          'B4 - - - D5 - - - G5 - - - F#5 - E5 - ' +
          'F#5 - - - A5 - - - D6 - - - - - - -',
        'square',
        0.055,
        3,
      ),
      line(
        '. . . . D5 . . . Eb5 . . . Ab4 . . . ' + '. . . . D5 . . . Eb5 . . . Ab4 . . . ' + '. . . . D5 . . . Eb5 . . . Ab4 . . . ' + '. . . . D5 . Eb5 . Ab4 . . . . . . .',
        'sawtooth',
        0.025,
      ),
      arp(['D4/F#4/A4', 'A3/C#4/E4', 'G3/B3/D4', 'D4/F#4/A4', 'B3/D4/F#4', 'G3/B3/D4', 'A3/C#4/E4', 'D4/F#4/A4'], 8, 'square', 0.02, 1),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.3),
      drum(rep('.... x... .... x.xx', 4), 'snare', 0.14),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.03),
    ],
  },
  // THE SUPERCHARGE: the guard's other way. His toll, turned over into D major, rising
  gr_super: {
    bpm: 120,
    steps: 64,
    parts: [
      line(
        'D5 - - - - - - - F#5 - - - - - - - ' + 'A5 - - - - - - - B5 - A5 - G5 - F#5 - ' + 'G5 - - - - - - - E5 - - - F#5 - G5 - ' + 'A5 - - - - - - - D6 - - - - - - -',
        'triangle',
        0.07,
        4,
      ),
      arp(['D4/F#4/A4/D5', 'B3/D4/F#4/B4', 'G3/B3/D4/G4', 'A3/C#4/E4/A4'], 16, 'square', 0.025, 1),
      line('D2 - - - - - - - D2 - - - - - - - B1 - - - - - - - B1 - - - - - - - G1 - - - - - - - G1 - - - - - - - A1 - - - - - - - A1 - - - A1 - - -', 'triangle', 0.15),
      drum(rep('x... .... x... ....', 2) + ' ' + rep('x... x... x... x.x.', 2), 'kick', 0.24),
      drum('.... .... .... .... ' + '.... .... .... .... ' + '.... x... .... x... ' + 'x.x. x.x. xxxx xxxx', 'snare', 0.1),
    ],
  },

  // ---------------------------------------------------------------- AFTER
  // the celebration: everybody, everywhere, at once
  fin_celebrate: {
    bpm: 138,
    steps: 64,
    parts: [
      line(
        'F5 . A5 . C6 - A5 . Bb5 . G5 . E5 - C5 . ' +
          'F5 . A5 . C6 - D6 . C6 . Bb5 . A5 - G5 . ' +
          'Bb5 . D6 . F6 - D6 . C6 . A5 . F5 - A5 . ' +
          'G5 . E5 . C5 . E5 . F5 - - - - - . .',
        'square',
        0.05,
      ),
      line(rep('. . C5 . . . C5 . . . Bb4 . . . A4 .', 4), 'square', 0.025),
      line(
        rep('F2 . C2 . F2 . C2 . G2 . C2 . E2 . C2 .', 1) + ' ' + rep('F2 . C2 . F2 . A2 . Bb2 . C3 . G2 . C2 .', 1) + ' ' + rep('Bb1 . F2 . Bb1 . F2 . A1 . F2 . D2 . A1 .', 1) + ' ' + rep('C2 . G1 . C2 . E2 . F2 . C2 . F1 . . .', 1),
        'triangle',
        0.15,
      ),
      drum(rep('x... x... x... x...', 4), 'kick', 0.22),
      drum(rep('.... x... .... x...', 4), 'snare', 0.09),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.035),
    ],
  },
  // the credits: warm, slow, a little proud. The Reaper's three notes, finally resolved
  fin_credits: {
    bpm: 84,
    steps: 128,
    parts: [
      line(
        'D5 - - - E5 - - - F#5 - - - - - - - ' +
          'A5 - - - G5 - F#5 - E5 - - - - - - - ' +
          'B4 - - - D5 - - - G5 - - - F#5 - E5 - ' +
          'F#5 - - - - - - - - - - - . . . . ' +
          'D5 - - - E5 - - - F#5 - - - A5 - - - ' +
          'B5 - - - A5 - G5 - F#5 - - - D5 - - - ' +
          'E5 - - - F#5 - - - G5 - - - A5 - - - ' +
          'D5 - - - - - - - - - - - - - - -',
        'triangle',
        0.06,
        4,
      ),
      arp(['D3/F#3/A3/D4', 'A2/C#3/E3/A3', 'G2/B2/D3/G3', 'D3/F#3/A3/D4', 'D3/F#3/A3/D4', 'B2/D3/F#3/B3', 'G2/B2/D3/G3', 'A2/D3/F#3/A3'], 16, 'sine', 0.035, 2),
      line(
        'D2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - ' +
          'D2 - - - - - - - - - - - - - - - B1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - A1 - - - - - - - A1 - - - - - - -',
        'triangle',
        0.13,
      ),
      drum(rep('x... .... .... ....', 8), 'boom', 0.12),
      drum(rep('.... .... x... ....', 8), 'hat', 0.03),
    ],
  },
  // the montage: every world, better than you found it. A bright walking tune
  fin_montage: {
    bpm: 104,
    steps: 64,
    parts: [
      line(
        'G5 - - - B5 - D6 - C6 - B5 - A5 - - - ' + 'F#5 - - - A5 - C6 - B5 - A5 - G5 - - - ' + 'E5 - G5 - B5 - - - A5 - G5 - F#5 - E5 - ' + 'D5 - - - F#5 - A5 - G5 - - - - - - -',
        'square',
        0.045,
        2,
      ),
      arp(['G3/B3/D4', 'D3/F#3/A3', 'E3/G3/B3', 'C3/E3/G3', 'C3/E3/G3', 'D3/F#3/A3', 'G3/B3/D4', 'G3/B3/D4'], 8, 'triangle', 0.035, 1),
      line(rep('G2 . . D2 . . G2 . D2 . . A2 . . D2 .', 2) + ' ' + rep('C2 . . G1 . . C2 . D2 . . A1 . . D2 .', 1) + ' ' + rep('G2 . . D2 . . G2 . G1 . . . . . . .', 1), 'triangle', 0.13),
      drum(rep('x... ..x. x... ....', 4), 'kick', 0.18),
      drum(rep('.... x... .... x...', 4), 'snare', 0.07),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.025),
    ],
  },
  // ...and the cat. A music box, far too slow, that stops on the wrong note
  fin_cat: {
    bpm: 66,
    steps: 32,
    parts: [
      line('B5 . . . G5 . . . E5 . . . G5 . . . ' + 'B5 . . . C6 . . . B5 . . . F5 - - -', 'sine', 0.05, 2),
      line('E3 - - - - - - - - - - - - - - - ' + 'E3 - - - - - - - F3 - - - - - - -', 'triangle', 0.06),
    ],
  },
};

SONGS6.gr_reaper1.intro = lift(0.14);
SONGS6.gr_buff.intro = lift(0.18);
SONGS6.gr_true.intro = { steps: 24, parts: [drum('x' + '.'.repeat(11) + 'x' + '.'.repeat(11), 'boom', 0.45), drum('.'.repeat(16) + 'x.x.xxxx', 'snare', 0.14)] };
SONGS6.gr_final.intro = lift(0.18);
SONGS6.gr_final2.intro = lift(0.2);
SONGS6.gr_super.intro = { steps: 16, parts: [drum('x...x...x...xxxx', 'snare', 0.12), drum('x...............', 'boom', 0.4)] };
for (const k of ['gr_reaper1', 'gr_buff', 'gr_final', 'gr_final2', 'gr_super']) SONGS6[k].parts.push(crashOn(SONGS6[k].steps, 0.08));
