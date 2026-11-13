// Chiptune songs for the overworld, written as step sequences (one token per
// 16th note): a note name starts a note, "-" holds it, "." is a rest.

export interface Part {
  wave: OscillatorType | 'kick' | 'hat' | 'snare' | 'crash' | 'boom';
  vol: number;
  notes: (number | null)[];
  lens: number[];
  vibrato?: number;
}

export interface Song {
  bpm: number;
  steps: number;
  parts: Part[];
  /** Played once before the loop starts: a boss theme's opening hit, or a phase's lift. */
  intro?: { steps: number; parts: Part[] };
}

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

function midiOf(tok: string): number {
  const m = /^([A-G][b#]?)(-?\d)$/.exec(tok);
  if (!m) throw new Error('bad note ' + tok);
  return NOTE[m[1]] + (Number(m[2]) + 1) * 12;
}

/** Parse "D4 - - F4 . A4" into per-step notes + lengths. */
export function line(src: string, wave: Part['wave'], vol: number, vibrato = 0): Part {
  const toks = src.trim().split(/\s+/);
  const notes: (number | null)[] = new Array(toks.length).fill(null);
  const lens: number[] = new Array(toks.length).fill(0);
  let last = -1;
  toks.forEach((t, i) => {
    if (t === '-') {
      if (last >= 0) lens[last]++;
    } else if (t === '.') last = -1;
    else {
      notes[i] = midiOf(t);
      lens[i] = 1;
      last = i;
    }
  });
  return { wave, vol, notes, lens, vibrato };
}

/** Drum pattern: x = hit, . = rest. */
export function drum(src: string, wave: 'kick' | 'hat' | 'snare' | 'crash' | 'boom', vol: number): Part {
  const s = src.replace(/\s+/g, '');
  return { wave, vol, notes: [...s].map((c) => (c === 'x' ? 1 : null)), lens: [...s].map(() => 1) };
}

/** Broken-chord accompaniment: each chord lasts `per` steps, notes cycle in 16ths. */
export function arp(chords: string[], per: number, wave: OscillatorType, vol: number, every = 1): Part {
  const notes: (number | null)[] = [];
  const lens: number[] = [];
  for (const ch of chords) {
    const tones = ch.split('/').map(midiOf);
    for (let i = 0; i < per; i++) {
      const on = i % every === 0;
      notes.push(on ? tones[(i / every) % tones.length] : null);
      lens.push(on ? Math.max(1, every - 0.2) : 0);
    }
  }
  return { wave, vol, notes, lens };
}

/**
 * The way into a harder phase: an 8-step snare roll and two big booms; the loop
 * itself then opens on a crash (see `crashOn`).
 */
export function lift(vol = 0.16): { steps: number; parts: Part[] } {
  return { steps: 8, parts: [drum('x.x.xxxx', 'snare', vol), drum('x...x...', 'boom', 0.4), drum('x.......', 'crash', 0.07)] };
}

/** A crash cymbal on the first beat of every pass through a loop of `steps`. */
export function crashOn(steps: number, vol = 0.09): Part {
  return drum('x' + '.'.repeat(steps - 1), 'crash', vol);
}

export function rep(s: string, n: number) {
  return Array(n).fill(s).join(' ');
}

export const SONGS: Record<string, Song> = {
  // a music-box lullaby for a town that should not be this quiet
  town: {
    bpm: 84,
    steps: 64,
    parts: [
      line(
        'D5 - - - F5 - A5 - G5 - - - F5 - E5 - ' +
          'D5 - - - A4 - - - C5 - D5 - E5 - - - ' +
          'F5 - - - E5 - D5 - C5 - - - A4 - Bb4 - ' +
          'A4 - - - - - - - . . . . . . . .',
        'triangle',
        0.1,
        4
      ),
      line(
        'D2 - - - - - - - A1 - - - - - - - ' + 'Bb1 - - - - - - - F2 - - - - - - - ' + 'G1 - - - - - - - C2 - - - - - - - ' + 'A1 - - - - - - - A1 - - - E2 - - -',
        'triangle',
        0.22
      ),
      arp(['D4/F4/A4/F4', 'Bb3/D4/F4/D4', 'G3/Bb3/D4/Bb3', 'A3/C#4/E4/C#4'], 16, 'square', 0.025, 2),
      drum(rep('x... .... x... ....', 4), 'kick', 0.18),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.03),
    ],
  },
  house: {
    bpm: 72,
    steps: 64,
    parts: [
      line('A4 - - - C5 - - - E5 - - - D5 - - - ' + 'C5 - - - B4 - - - A4 - - - - - - - ' + 'F4 - - - A4 - - - C5 - - - B4 - - - ' + 'G#4 - - - - - - - E4 - - - - - - -', 'triangle', 0.08, 3),
      line('A2 - - - - - - - - - - - - - - - F2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -', 'triangle', 0.16),
      arp(['A3/C4/E4', 'F3/A3/C4', 'D3/F3/A3', 'E3/G#3/B3'], 16, 'sine', 0.03, 4),
    ],
  },
  farm: {
    bpm: 96,
    steps: 64,
    parts: [
      line(
        'E5 . E5 . G5 - E5 . D5 . B4 . A4 - - - ' + 'E5 . E5 . G5 - A5 . G5 . E5 . D5 - - - ' + 'E5 . D5 . B4 - A4 . G4 . A4 . B4 - - - ' + 'A4 . . . E4 . . . A4 - - - . . . .',
        'square',
        0.06
      ),
      line(rep('A2 . E2 . A2 . E2 .', 2) + ' ' + rep('G2 . D2 . G2 . D2 .', 1) + ' ' + rep('A2 . E2 . A2 . E2 .', 1) + ' ' + rep('E2 . B1 . E2 . B1 .', 2) + ' ' + rep('A2 . E2 . A2 . E2 .', 2), 'triangle', 0.22),
      drum(rep('x... ..x. x... ..x.', 4), 'kick', 0.16),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'snare', 0.05),
    ],
  },
  mansion: {
    bpm: 62,
    steps: 64,
    parts: [
      line('D4 - - - - - - - Eb4 - - - - - - - D4 - - - - - - - C#4 - - - - - - - ' + 'D4 - - - - - - - F4 - - - - - - - E4 - - - - - - - Ab4 - - - - - - -', 'sawtooth', 0.03, 2),
      line('D2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - -', 'sawtooth', 0.06),
      line('. . . . . . . . . . . . A5 . . . . . . . . . . . . . . . Ab5 . . . . . . . . . . . . . . . D6 . . . . . . . . . . . . . . . . . . .', 'sine', 0.05),
    ],
  },
  cave: {
    bpm: 56,
    steps: 64,
    parts: [
      line('D2 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - Eb2 - - - - - - - - - - - - - - -', 'triangle', 0.18),
      line('. . . . . . . . A4 . . . . . . . . . . . . . . . . . . . F4 . . . . . . . . . . . . . . . E4 . . . . . . . . . . . . . . . . . . .', 'sine', 0.05, 6),
      drum(rep('x... .... .... ....', 4), 'kick', 0.12),
    ],
  },
  well: {
    bpm: 50,
    steps: 32,
    parts: [line('A1 - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - -', 'triangle', 0.15), line('. . . . E5 . . . . . . . . . . . . . . . F5 . . . . . . . . . . .', 'sine', 0.04, 8)],
  },
  // painfully cheerful elevator music, for contrast
  store: {
    bpm: 118,
    steps: 64,
    parts: [
      line('E5 - G5 - C6 - - - B5 - A5 - G5 - - - ' + 'F5 - A5 - D6 - - - C6 - B5 - A5 - - - ' + 'G5 - - - E5 - - - F5 - D5 - B4 - - - ' + 'C5 - - - - - - - . . . . . . . .', 'triangle', 0.07, 3),
      line(rep('C3 . G2 . C3 . G2 .', 2) + ' ' + rep('D3 . A2 . G2 . D3 .', 2) + ' ' + rep('E3 . B2 . G2 . G2 .', 2) + ' ' + rep('C3 . G2 . C3 . . .', 2), 'triangle', 0.18),
      arp(['C4/E4/G4', 'D4/F4/A4', 'G3/B3/D4', 'C4/E4/G4'], 16, 'square', 0.02, 2),
      drum(rep('x... x... x... x...', 4), 'kick', 0.12),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.03),
    ],
  },
  cellar: {
    bpm: 80,
    steps: 64,
    parts: [
      line(rep('E2 . E2 . F2 . E2 .', 8), 'triangle', 0.2),
      line('. . . . . . . . B4 - - - . . . . . . . . . . . . C5 - - - . . . . . . . . . . . . Bb4 - - - . . . . . . . . . . . . A4 - - - - - - -', 'square', 0.035),
      drum(rep('x... .... x... ....', 4), 'kick', 0.15),
    ],
  },
  psychic: {
    bpm: 78,
    steps: 64,
    parts: [
      arp(['D4/F4/A4/C#5', 'Bb3/D4/F4/A4', 'G3/Bb3/D4/F4', 'A3/C#4/E4/G4'], 16, 'sine', 0.06),
      line('D5 - - - - - - - C#5 - - - A4 - - - ' + 'Bb4 - - - - - - - A4 - - - F4 - - - ' + 'G4 - - - Bb4 - - - D5 - - - F5 - - - ' + 'E5 - - - - - - - C#5 - - - - - - -', 'triangle', 0.06, 6),
      line('D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - -', 'triangle', 0.14),
    ],
  },
  shop: {
    bpm: 104,
    steps: 64,
    parts: [
      line('A4 - - . A4 . C5 - E5 - - . D5 . C5 - ' + 'B4 - - . G4 . B4 - D5 - - . C5 . B4 - ' + 'A4 - - . A4 . C5 - E5 - - . A5 . G5 - ' + 'E5 - D5 - C5 - B4 - A4 - - - . . . .', 'square', 0.06),
      line(rep('A2 . . E2 A2 . . E2', 2) + ' ' + rep('G2 . . D2 G2 . . D2', 2) + ' ' + rep('A2 . . E2 A2 . . E2', 2) + ' ' + rep('E2 . . B1 A2 . . A2', 2), 'triangle', 0.2),
      drum(rep('x... ..x. x... ....', 4), 'kick', 0.14),
      drum(rep('.... x... .... x...', 4), 'snare', 0.05),
    ],
  },
  tavern: {
    bpm: 112,
    steps: 64,
    parts: [
      line('D5 - . D5 F5 - A5 - G5 - F5 - E5 - D5 - ' + 'C5 - . C5 E5 - G5 - F5 - E5 - D5 - C5 - ' + 'D5 - . D5 F5 - A5 - Bb5 - A5 - G5 - F5 - ' + 'E5 - C#5 - D5 - - - . . . . . . . .', 'square', 0.05),
      line(rep('D3 . A2 . D3 . A2 .', 2) + ' ' + rep('C3 . G2 . C3 . G2 .', 2) + ' ' + rep('D3 . A2 . G2 . D3 .', 2) + ' ' + rep('A2 . E2 . D3 . . .', 2), 'triangle', 0.2),
      drum(rep('x... x... x... x...', 4), 'kick', 0.1),
    ],
  },
  // the bell has been rung: no melody, only dread. A grinding low drone, a tritone
  // stab, a toll and a boom
  dread: {
    bpm: 64,
    steps: 32,
    parts: [
      line('D1 - - - - - - - - - - - - - - - Eb1 - - - - - - - - - - - - - - -', 'sawtooth', 0.14),
      line('D2 - - - . . . . Ab2 - - - . . . . ' + 'D2 - - - . . . . A2 - - - Ab2 - - -', 'sawtooth', 0.07),
      line('. . . . . . . . . . . . D5 - - - ' + '. . . . . . . . . . . . Eb5 - - -', 'square', 0.025, 4),
      drum('x.x. .... x... .... x.x. .... x... ..x.', 'kick', 0.32),
      drum('x... .... .... .... x... .... .... ....', 'boom', 0.3),
    ],
  },
  fisher: {
    bpm: 144,
    steps: 64,
    parts: [
      line('E4 . E4 . G4 . E4 . A4 - G4 - E4 . D4 . ' + 'E4 . E4 . G4 . B4 . A4 - G4 - E4 - - - ' + 'C5 . C5 . B4 . A4 . B4 - A4 - G4 . F#4 . ' + 'E4 - - - B3 - - - E4 - - - . . . .', 'square', 0.07),
      line(rep('E2 E2 . E2 E3 . E2 .', 4) + ' ' + rep('C2 C2 . C2 C3 . C2 .', 2) + ' ' + rep('B1 B1 . B1 B2 . B1 .', 2), 'triangle', 0.26),
      drum(rep('x... ..x. x... ..x.', 4), 'kick', 0.32),
      drum(rep('.... x... .... x...', 4), 'snare', 0.16),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.04),
    ],
  },
  celebrate: {
    bpm: 128,
    steps: 64,
    parts: [
      line('C5 - E5 - G5 - C6 - B5 - G5 - E5 - G5 - ' + 'A5 - F5 - D5 - F5 - G5 - - - . . . . ' + 'E5 - G5 - C6 - E6 - D6 - B5 - G5 - B5 - ' + 'C6 - - - G5 - - - C6 - - - . . . .', 'square', 0.06),
      line(rep('C3 . G2 . C3 . G2 .', 2) + ' ' + rep('F2 . C3 . G2 . D3 .', 2) + ' ' + rep('C3 . G2 . E3 . G2 .', 2) + ' ' + rep('F2 . G2 . C3 . . .', 2), 'triangle', 0.22),
      arp(['C4/E4/G4', 'F4/A4/C5', 'C4/E4/G4', 'G4/B4/D5'], 16, 'square', 0.02, 2),
      drum(rep('x... x... x... x...', 4), 'kick', 0.18),
      drum(rep('.... x... .... x...', 4), 'snare', 0.08),
      drum(rep('..x. ..x. ..x. ..x.', 4), 'hat', 0.03),
    ],
  },
  // ================================================================ World 2: the flooded island
  // a tired, swaying sea shanty in a minor key: the island is still standing, barely
  island: {
    bpm: 76,
    steps: 64,
    parts: [
      line(
        'A4 - - - C5 - B4 - A4 - - - E4 - - - ' + 'F4 - - - A4 - G4 - E4 - - - - - - - ' + 'D4 - - - F4 - A4 - C5 - - - B4 - A4 - ' + 'G#4 - - - - - - - E4 - - - . . . .',
        'triangle',
        0.09,
        4
      ),
      line('A2 - - - - - - - E2 - - - - - - - ' + 'F2 - - - - - - - C2 - - - - - - - ' + 'D2 - - - - - - - A1 - - - - - - - ' + 'E2 - - - - - - - E2 - - - - - - -', 'triangle', 0.2),
      arp(['A3/C4/E4', 'F3/A3/C4', 'D3/F3/A3', 'E3/G#3/B3'], 16, 'sine', 0.035, 4),
      drum(rep('x... .... ..x. ....', 4), 'kick', 0.12),
    ],
  },
  // the island after everyone has gone: a music box winding down
  empty: {
    bpm: 58,
    steps: 64,
    parts: [
      line('E5 - - - - - - - . . . . C5 - - - ' + '. . . . . . . . A4 - - - - - - - ' + 'B4 - - - - - - - . . . . G4 - - - ' + '. . . . . . . . E4 - - - - - - -', 'sine', 0.06, 3),
      line('A1 - - - - - - - - - - - - - - - F1 - - - - - - - - - - - - - - - D1 - - - - - - - - - - - - - - - E1 - - - - - - - - - - - - - - -', 'triangle', 0.14),
    ],
  },
  // a calliope that has been left out in the rain
  park: {
    bpm: 132,
    steps: 48,
    parts: [
      line('C5 - - E5 G5 - C6 - - B5 - - ' + 'A5 - - G5 - - E5 - - F5 - - ' + 'D5 - - F5 A5 - D6 - - C6 - - ' + 'B5 - - G5 - - C6 - - . . .', 'square', 0.05, 7),
      line(rep('C3 . . G3 . . E3 . . G3 . .', 2) + ' ' + rep('G2 . . D3 . . B2 . . D3 . .', 1) + ' ' + rep('C3 . . G3 . . C3 . . . . .', 1), 'triangle', 0.2),
      drum(rep('x.. ... x.. ...', 4), 'kick', 0.12),
      drum(rep('... x.. ... x..', 4), 'hat', 0.04),
    ],
  },
  // pompous civic brass, slightly out of breath
  hall: {
    bpm: 100,
    steps: 64,
    parts: [
      line('G4 - - G4 C5 - - - E5 - - D5 C5 - - - ' + 'D5 - - D5 G5 - - - F5 - E5 - D5 - - - ' + 'E5 - - E5 A5 - - - G5 - - F5 E5 - D5 - ' + 'C5 - - - G4 - - - C5 - - - . . . .', 'square', 0.06),
      line(rep('C3 . G2 . C3 . G2 .', 2) + ' ' + rep('G2 . D3 . G2 . D3 .', 2) + ' ' + rep('A2 . E3 . F2 . C3 .', 2) + ' ' + rep('G2 . D3 . C3 . . .', 2), 'triangle', 0.2),
      drum(rep('x... x... x... x...', 4), 'kick', 0.12),
      drum(rep('.... x... .... x.x.', 4), 'snare', 0.06),
    ],
  },
  bank: {
    bpm: 88,
    steps: 64,
    parts: [
      line('E5 - - - D5 - C5 - D5 - - - G4 - - - ' + 'C5 - - - B4 - A4 - B4 - - - - - - - ' + 'A4 - - - C5 - E5 - D5 - - - B4 - G4 - ' + 'C5 - - - - - - - . . . . . . . .', 'sine', 0.07, 3),
      arp(['C4/E4/G4/B4', 'A3/C4/E4/G4', 'F3/A3/C4/E4', 'G3/B3/D4/F4'], 16, 'triangle', 0.035, 2),
      line('C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - - C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - -', 'triangle', 0.16),
    ],
  },
  // bouncy, a bit unhinged: the professor's theme
  inventor: {
    bpm: 140,
    steps: 64,
    parts: [
      line('C5 . E5 . G5 . F#5 . G5 - - . E5 . C5 . ' + 'D5 . F5 . A5 . G#5 . A5 - - . F5 . D5 . ' + 'E5 . G5 . C6 . B5 . Bb5 . A5 . Ab5 . G5 . ' + 'C5 . . . G4 . . . C5 - - - . . . .', 'square', 0.05),
      line(rep('C3 . C3 . G2 . G2 .', 2) + ' ' + rep('D3 . D3 . A2 . A2 .', 2) + ' ' + rep('E3 . E3 . F3 . F#3 .', 2) + ' ' + rep('G2 . G2 . C3 . . .', 2), 'triangle', 0.2),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.12),
      drum(rep('.x.x .x.x .x.x .x.x', 4), 'hat', 0.03),
    ],
  },
  // a smooth-jazz showroom loop, cheesy on purpose
  dealer: {
    bpm: 96,
    steps: 64,
    parts: [
      line('F5 - - E5 - - C5 - D5 - - - A4 - - - ' + 'Bb4 - - A4 - - F4 - G4 - - - - - - - ' + 'F5 - - E5 - - C5 - D5 - F5 - A5 - G5 - ' + 'F5 - - - - - - - . . . . . . . .', 'sine', 0.08, 5),
      arp(['F3/A3/C4/E4', 'D3/F3/A3/C4', 'Bb2/D3/F3/A3', 'C3/E3/G3/Bb3'], 16, 'triangle', 0.04, 2),
      line(rep('F2 . . F2 . . C2 .', 2) + ' ' + rep('D2 . . D2 . . A1 .', 2) + ' ' + rep('Bb1 . . Bb1 . . F2 .', 2) + ' ' + rep('C2 . . C2 . . G1 .', 2), 'triangle', 0.18),
      drum(rep('x... ..x. .x.. ..x.', 4), 'kick', 0.1),
      drum(rep('..x. ..x. ..x. ..xx', 4), 'hat', 0.03),
    ],
  },
  w2house: {
    bpm: 70,
    steps: 64,
    parts: [
      line('E4 - - - G4 - - - A4 - - - G4 - E4 - ' + 'D4 - - - E4 - - - C4 - - - - - - - ' + 'E4 - - - G4 - - - B4 - - - A4 - G4 - ' + 'E4 - - - - - - - . . . . . . . .', 'triangle', 0.07, 3),
      line('A2 - - - - - - - - - - - - - - - F2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - E2 - - - - - - - - - - - - - - -', 'triangle', 0.15),
    ],
  },
  // the store after the evacuation: the elevator music, slowed and wrong
  empty_store: {
    bpm: 64,
    steps: 64,
    parts: [
      line('E5 - G5 - C6 - - - B5 - A5 - G5 - - - ' + 'F5 - A5 - D6 - - - C6 - B5 - A5 - - - ' + 'G5 - - - E5 - - - F5 - D5 - B4 - - - ' + 'C5 - - - - - - - . . . . . . . .', 'sine', 0.04, 9),
      line('C2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - -', 'triangle', 0.12),
    ],
  },
  // the emergency room: a pulse, a held chord, nobody breathing
  gov: {
    bpm: 112,
    steps: 32,
    parts: [
      line(rep('D2 . D2 . D2 . D2 .', 4), 'triangle', 0.2),
      line('A4 - - - - - - - - - - - - - - - Bb4 - - - - - - - - - - - - - - -', 'sawtooth', 0.03),
      drum(rep('x... x... x... x...', 2), 'kick', 0.18),
      drum(rep('..x. ..x. ..x. ..x.', 2), 'hat', 0.04),
    ],
  },
  // helicopters and screaming: driving, urgent
  evac: {
    bpm: 150,
    steps: 64,
    parts: [
      line('D5 . D5 . F5 . D5 . E5 - D5 - C5 . A4 . ' + 'D5 . D5 . F5 . G5 . A5 - G5 - F5 - - - ' + 'Bb5 . A5 . G5 . F5 . E5 - F5 - G5 . E5 . ' + 'D5 - - - A4 - - - D5 - - - . . . .', 'square', 0.06),
      line(rep('D2 D2 . D2 D3 . D2 .', 4) + ' ' + rep('Bb1 Bb1 . Bb1 Bb2 . Bb1 .', 2) + ' ' + rep('A1 A1 . A1 A2 . A1 .', 2), 'triangle', 0.24),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.26),
      drum(rep('.... x... .... x...', 4), 'snare', 0.12),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.03),
    ],
  },
  // the wave: a low wall of sound rising, a racing heartbeat, an alarm far off
  tsunami: {
    bpm: 72,
    steps: 32,
    parts: [
      line('D1 - - - - - - - - - - - - - - - C1 - - - - - - - - - - - - - - -', 'sawtooth', 0.15),
      line(rep('D2 . D2 . Eb2 . D2 .', 2) + ' ' + rep('C2 . C2 . Db2 . C2 .', 2), 'sawtooth', 0.07),
      line('A5 - - - Eb5 - - - A5 - - - Eb5 - - - ' + 'G5 - - - Db5 - - - G5 - - - Db5 - - -', 'square', 0.02, 6),
      drum(rep('x.x. .... x.x. ....', 2), 'kick', 0.34),
      drum('x... .... .... .... x... .... .... ....', 'boom', 0.32),
    ],
  },
  // the abyss: sonar pings over a drone
  deep: {
    bpm: 50,
    steps: 64,
    parts: [
      line('A1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', 'triangle', 0.18),
      line('E6 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . E6 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', 'sine', 0.05),
      line('. . . . . . . . . . . . . . . . E4 - - - - - - - D4 - - - - - - - . . . . . . . . . . . . . . . . C4 - - - - - - - B3 - - - - - - -', 'sine', 0.04, 6),
    ],
  },
  // the Cave of the Gods: a slow, ancient chord progression, like a choir far away
  gods: {
    bpm: 54,
    steps: 64,
    parts: [
      line('D4 - - - - - - - - - - - - - - - F4 - - - - - - - - - - - - - - - E4 - - - - - - - - - - - - - - - A4 - - - - - - - - - - - - - - -', 'sine', 0.06, 3),
      line('A4 - - - - - - - - - - - - - - - C5 - - - - - - - - - - - - - - - B4 - - - - - - - - - - - - - - - C#5 - - - - - - - - - - - - - - -', 'sine', 0.04, 3),
      line('D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - -', 'triangle', 0.18),
      drum(rep('x... .... .... ....', 4), 'kick', 0.1),
    ],
  },
  // Slick Rick: a greasy surf-rock boss theme
  rick: {
    bpm: 156,
    steps: 64,
    parts: [
      line('E4 . G4 . A4 . Bb4 A4 G4 . E4 . D4 . E4 . ' + 'E4 . G4 . A4 . Bb4 A4 G4 . E4 - - - - . ' + 'A4 . C5 . D5 . Eb5 D5 C5 . A4 . G4 . A4 . ' + 'B4 - - - G#4 - - - E4 - - - . . . .', 'square', 0.07),
      line(rep('E2 . E2 E2 G2 . A2 .', 4) + ' ' + rep('A2 . A2 A2 C3 . D3 .', 2) + ' ' + rep('B1 . B1 B1 D2 . E2 .', 2), 'triangle', 0.26),
      drum(rep('x... x... x... x...', 4), 'kick', 0.3),
      drum(rep('.... x... .... x..x', 4), 'snare', 0.14),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.05),
    ],
  },
  // ================================================================ the Kraken: one theme, three depths
  // I: the awakening. A slow, enormous pulse; the melody keeps sinking.
  kraken1: {
    bpm: 96,
    steps: 64,
    parts: [
      line('D4 - - - F4 - - - E4 - - - A3 - - - ' + 'D4 - - - F4 - - - G4 - F4 - E4 - - - ' + 'D4 - - - C4 - - - Bb3 - - - A3 - - - ' + 'D4 - - - - - - - . . . . . . . .', 'sawtooth', 0.045, 3),
      line(rep('D2 - - - . . D2 .', 4) + ' ' + rep('Bb1 - - - . . Bb1 .', 2) + ' ' + rep('A1 - - - . . A1 .', 2), 'triangle', 0.26),
      drum(rep('x... .... x... ..x.', 4), 'kick', 0.3),
      drum(rep('.... .... .... x...', 4), 'snare', 0.08),
    ],
  },
  // II: the abyss. Faster, a churning ostinato under the same melody, higher.
  kraken2: {
    bpm: 120,
    steps: 64,
    parts: [
      line('D5 - - - F5 - - - E5 - - - A4 - - - ' + 'D5 - - - F5 - - - G5 - F5 - E5 - - - ' + 'D5 - - - C5 - - - Bb4 - - - A4 - - - ' + 'D5 - - - E5 - F5 - A5 - - - . . . .', 'square', 0.055),
      line(rep('D2 D3 A2 D3 F2 D3 A2 D3', 4) + ' ' + rep('Bb1 Bb2 F2 Bb2 D2 Bb2 F2 Bb2', 2) + ' ' + rep('A1 A2 E2 A2 C#2 A2 E2 A2', 2), 'triangle', 0.24),
      drum(rep('x..x ..x. x..x ..x.', 4), 'kick', 0.3),
      drum(rep('.... x... .... x...', 4), 'snare', 0.13),
      drum(rep('x.x. x.x. x.x. x.x.', 4), 'hat', 0.04),
    ],
  },
  // III: unleashed. Everything at once: full tempo, the theme screamed an octave up.
  kraken3: {
    bpm: 150,
    steps: 64,
    parts: [
      line('D5 . D5 . F5 . D5 . E5 - D5 - A4 . A4 . ' + 'D5 . D5 . F5 . A5 . G5 - F5 - E5 - - - ' + 'D6 . C6 . Bb5 . A5 . G5 - F5 - E5 . C#5 . ' + 'D5 - - - A4 - - - D5 - - - . . . .', 'square', 0.065),
      line(rep('D2 D2 . D2 D3 . D2 .', 4) + ' ' + rep('Bb1 Bb1 . Bb1 Bb2 . Bb1 .', 2) + ' ' + rep('A1 A1 . A1 A2 . C#2 .', 2), 'sawtooth', 0.12),
      arp(['D4/F4/A4', 'D4/F4/A4', 'Bb3/D4/F4', 'A3/C#4/E4'], 16, 'square', 0.025),
      drum(rep('x.x. ..x. x.x. ..x.', 4), 'kick', 0.34),
      drum(rep('.... x... .... x.xx', 4), 'snare', 0.16),
      drum(rep('xxxx xxxx xxxx xxxx', 4), 'hat', 0.04),
    ],
  },
  // the escape: just running
  escape: {
    bpm: 168,
    steps: 32,
    parts: [
      line('D5 . D5 . C5 . D5 . F5 . D5 . C5 . A4 . ' + 'D5 . D5 . C5 . D5 . A5 - G5 - F5 - E5 -', 'square', 0.06),
      line(rep('D2 D3 D2 D3 C2 C3 C2 C3', 2) + ' ' + rep('Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2', 2), 'triangle', 0.24),
      drum(rep('x.x. x.x. x.x. x.x.', 2), 'kick', 0.3),
      drum(rep('..x. ..x. ..x. ..xx', 2), 'snare', 0.12),
    ],
  },
  // each temple has its own air
  t_zeus: {
    bpm: 84,
    steps: 64,
    parts: [
      line('A4 - - - E5 - - - D5 - C5 - B4 - - - ' + 'A4 - - - C5 - - - E5 - - - A5 - - - ' + 'G5 - - - E5 - - - D5 - - - B4 - - - ' + 'A4 - - - - - - - . . . . . . . .', 'square', 0.04, 4),
      line('A2 - - - - - - - E2 - - - - - - - F2 - - - - - - - E2 - - - - - - - A2 - - - - - - - C3 - - - - - - - G2 - - - - - - - E2 - - - - - - -', 'triangle', 0.2),
      drum(rep('x... .... .... ..x.', 4), 'kick', 0.14),
    ],
  },
  t_thor: {
    bpm: 72,
    steps: 64,
    parts: [
      line('D4 - - - D4 - F4 - G4 - - - A4 - - - ' + 'C5 - - - A4 - G4 - F4 - - - D4 - - - ' + 'D4 - - - F4 - - - C4 - - - D4 - - - ' + 'D4 - - - - - - - . . . . . . . .', 'sawtooth', 0.04),
      line(rep('D2 - - - . . . .', 4) + ' ' + rep('C2 - - - . . . .', 2) + ' ' + rep('D2 - - - . . . .', 2), 'triangle', 0.26),
      drum(rep('x... .... x... ....', 4), 'kick', 0.3),
      drum(rep('.... .... .... x...', 4), 'snare', 0.1),
    ],
  },
  t_poseidon: {
    bpm: 66,
    steps: 64,
    parts: [
      arp(['E4/G4/B4/D5', 'C4/E4/G4/B4', 'A3/C4/E4/G4', 'B3/D#4/F#4/A4'], 16, 'sine', 0.05),
      line('E5 - - - - - - - D5 - - - B4 - - - ' + 'C5 - - - - - - - G4 - - - - - - - ' + 'A4 - - - C5 - - - E5 - - - D5 - - - ' + 'D#5 - - - - - - - B4 - - - - - - -', 'triangle', 0.06, 5),
      line('E2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - - - - - B1 - - - - - - - - - - - - - - -', 'triangle', 0.16),
    ],
  },
  t_athena: {
    bpm: 80,
    steps: 64,
    parts: [
      line('G4 - - - B4 - D5 - C5 - - - B4 - A4 - ' + 'G4 - - - E4 - - - F#4 - - - D4 - - - ' + 'G4 - - - B4 - D5 - G5 - - - F#5 - E5 - ' + 'D5 - - - - - - - . . . . . . . .', 'triangle', 0.07, 3),
      arp(['G3/B3/D4', 'E3/G3/B3', 'C3/E3/G3', 'D3/F#3/A3'], 16, 'sine', 0.035, 2),
      line('G2 - - - - - - - E2 - - - - - - - C2 - - - - - - - D2 - - - - - - - G2 - - - - - - - E2 - - - - - - - C2 - - - - - - - D2 - - - - - - -', 'triangle', 0.16),
    ],
  },
  // a farewell, for the professor
  farewell: {
    bpm: 70,
    steps: 64,
    parts: [
      line('C5 - - - E5 - G5 - F5 - - - E5 - D5 - ' + 'C5 - - - G4 - - - A4 - B4 - C5 - - - ' + 'F5 - - - E5 - D5 - C5 - - - A4 - G4 - ' + 'C5 - - - - - - - . . . . . . . .', 'triangle', 0.08, 4),
      arp(['C4/E4/G4', 'A3/C4/E4', 'F3/A3/C4', 'G3/B3/D4'], 16, 'sine', 0.035, 2),
      line('C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - - C2 - - - - - - - A1 - - - - - - - F1 - - - - - - - G1 - - - - - - -', 'triangle', 0.17),
    ],
  },
  credits: {
    bpm: 90,
    steps: 64,
    parts: [
      line('D5 - - - F5 - A5 - G5 - - - F5 - E5 - ' + 'D5 - - - A4 - - - C5 - D5 - E5 - - - ' + 'F5 - - - G5 - A5 - D6 - - - C6 - A5 - ' + 'D5 - - - - - - - . . . . . . . .', 'triangle', 0.09, 4),
      line('D3 - - - - - - - A2 - - - - - - - Bb2 - - - - - - - F2 - - - - - - - G2 - - - - - - - C3 - - - - - - - D3 - - - - - - - D3 - - - - - - -', 'triangle', 0.2),
      arp(['D4/F4/A4', 'Bb3/D4/F4', 'G3/Bb3/D4', 'D4/F#4/A4'], 16, 'square', 0.025, 2),
      drum(rep('x... .... x... ....', 4), 'kick', 0.12),
    ],
  },
};

// ---- the Kraken's opening: something huge rising out of the deep. A sub-bass swell
// and slow booms, then the whole chord breaks the surface on a crash.
SONGS.kraken1.intro = {
  steps: 32,
  parts: [
    line('D1 - - - - - - - - - - - - - - - ' + 'D1 - - - - - - - A1 - - - - - - -', 'triangle', 0.3),
    line('D2 - - - F2 - - - A2 - - - C3 - - - ' + 'D3 - - . F3 - - . A3 - - . D4 - - -', 'sawtooth', 0.1),
    line('. . . . . . . . . . . . . . . . ' + 'A3 - - . C4 - - . E4 - - . F4 - - -', 'sawtooth', 0.06),
    drum('x.......x....... ' + 'x.......x...x.x.', 'boom', 0.45),
    drum('................ ' + 'x...............', 'crash', 0.11),
    drum('................ ' + '............xxxx', 'snare', 0.14),
  ],
};
for (const k of ['kraken2', 'kraken3']) {
  SONGS[k].intro = lift();
  SONGS[k].parts.push(crashOn(SONGS[k].steps));
}
SONGS.kraken1.parts.push(crashOn(SONGS.kraken1.steps, 0.07));
