import type { Song } from './songs';
import { line, drum, arp, rep, lift, crashOn } from './songs';

// The final world: THE REAPER'S PRISON. Each floor has its own voice: the cell block
// drips and clanks, the mess hall is a riot, the guard quarters creep on tiptoe, high
// security is cold and empty. The Skeleton Warden marches; the supercharged starters
// scream; and the Reaper brings `menace` (songs4) wherever he goes.

export const SONGS5: Record<string, Song> = {
  // the cell block: a slow minor walk, a bass like a heavy door, a key ring jingling
  w5_prison: {
    bpm: 72,
    steps: 64,
    parts: [
      line('A4 - - - C5 - - - B4 - A4 - G#4 - - - ' + 'A4 - - - E5 - - - D5 - C5 - B4 - - - ' + 'C5 - - - A4 - - - F4 - E4 - D4 - - - ' + 'E4 - - - - - - - . . . . . . . .', 'triangle', 0.05, 3),
      arp(['A2/C3/E3/A3', 'F2/A2/C3/F3', 'D2/F2/A2/D3', 'E2/G#2/B2/E3'], 16, 'sine', 0.03, 2),
      line(rep('A1 - - - . . . . A1 - . . E1 - . .', 2) + ' ' + rep('D1 - - - . . . . E1 - . . E1 - . .', 2), 'triangle', 0.14),
      drum(rep('x... .... x... ....', 4), 'kick', 0.18),
      drum(rep('.... .... .... ..x.', 4), 'hat', 0.04),
    ],
  },
  // the mess hall: a ridiculous, galloping riot with a tuba bass and a kazoo
  w5_mess: {
    bpm: 150,
    steps: 32,
    parts: [
      line('C5 . E5 . G5 . E5 . F5 . D5 . B4 . G4 . ' + 'C5 . E5 . G5 . C6 . B5 - A5 - G5 - F#5 -', 'square', 0.05),
      line('. . G4 . . . G4 . . . A4 . . . G4 . ' + '. . G4 . . . G4 . . . Eb5 . D5 . C5 .', 'square', 0.03),
      line('C2 . G1 . C2 . G1 . F1 . C2 . G1 . B1 . ' + 'C2 . G1 . C2 . E2 . F2 . F#2 . G2 . G1 .', 'triangle', 0.16),
      drum(rep('x.x. x.x. x.x. x.xx', 2), 'kick', 0.22),
      drum(rep('..x. ..x. ..x. ..x.', 2), 'snare', 0.09),
      drum(rep('xxxx xxxx xxxx xxxx', 2), 'hat', 0.025),
    ],
  },
  // the guard quarters: on tiptoe. A plucked low ostinato and a held, worried note
  w5_stealth: {
    bpm: 100,
    steps: 32,
    parts: [
      line(rep('E2 . . E2 . . G2 . E2 . . E2 . . A#1 .', 2), 'triangle', 0.15),
      line('B4 - - - - - - - - - - - . . . . ' + 'C5 - - - - - - - A#4 - - - - - - -', 'sine', 0.03, 4),
      line('. . . . . . . . . . . . E5 . D#5 . ' + '. . . . . . . . . . . . E5 . G5 .', 'square', 0.018),
      drum(rep('x... ..x. .... ....', 2), 'kick', 0.14),
      drum(rep('.... .... ..x. ...x', 2), 'hat', 0.05),
    ],
  },
  // high security: cold and empty. A clock that is not quite a clock
  w5_high: {
    bpm: 60,
    steps: 32,
    parts: [
      line('D5 - - - - - - - F5 - - - E5 - - - ' + 'D5 - - - - - - - C#5 - - - - - - -', 'triangle', 0.04, 5),
      arp(['D3/F3/A3', 'A#2/D3/F3', 'G2/A#2/D3', 'A2/C#3/E3'], 8, 'sine', 0.03, 2),
      line('D1 - - - - - - - A#0 - - - - - - - G0 - - - - - - - A0 - - - - - - -', 'triangle', 0.12),
      drum(rep('x... .... .... ....', 2), 'boom', 0.16),
      drum(rep('..x. ..x. ..x. ..x.', 2), 'hat', 0.02),
    ],
  },
  // THE SKELETON WARDEN: a grim march. Forty years of the same beat, the keys keeping time
  w5_warden: {
    bpm: 128,
    steps: 32,
    parts: [
      line(rep('E2 . E2 . E2 . F2 . E2 . E2 . A#1 . B1 .', 2), 'sawtooth', 0.12),
      line('E4 - - - G4 - - - F4 - E4 - D#4 - - - ' + 'E4 - - - B4 - - - A#4 - A4 - G4 - F4 -', 'square', 0.05, 3),
      line('. . . . E5 . . . . . . . F5 . . . ' + '. . . . E5 . . . . . . . A#5 . B5 .', 'square', 0.025),
      drum(rep('x... x... x... x.x.', 2), 'kick', 0.3),
      drum(rep('.... x... .... x...', 2), 'snare', 0.12),
      drum(rep('x.x. x.x. x.x. x.x.', 2), 'hat', 0.04),
      drum('x... .... .... .... .... .... .... ....', 'boom', 0.3),
    ],
  },
  // SUPERCHARGED: your own starter, pushed past its limits. Fast, furious, a little wrong
  w5_super: {
    bpm: 156,
    steps: 64,
    parts: [
      line(rep('C2 C2 . C2 . C2 Db2 . C2 C2 . C2 G1 . Bb1 .', 4), 'sawtooth', 0.12),
      line('C5 - - - Eb5 - - - G5 - - - F#5 - G5 - ' + 'Ab5 - - - G5 - - - Eb5 - D5 - C5 - - - ' + 'Db5 - - - F5 - - - Ab5 - - - G5 - F5 - ' + 'G5 - - - - - - - B4 - - - D5 - - -', 'square', 0.05, 3),
      arp(['C4/Eb4/G4', 'Ab3/C4/Eb4', 'Db4/F4/Ab4', 'G3/B3/D4'], 16, 'square', 0.02, 1),
      drum(rep('x.x. x.x. x.x. x.xx', 4), 'kick', 0.28),
      drum(rep('.... x... .... x..x', 4), 'snare', 0.13),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.03),
    ],
  },
};

SONGS5.w5_warden.intro = lift(0.14);
SONGS5.w5_super.intro = lift(0.16);
for (const k of ['w5_warden', 'w5_super']) SONGS5[k].parts.push(crashOn(SONGS5[k].steps, 0.08));
