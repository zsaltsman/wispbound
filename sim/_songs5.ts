import { SONGS5 } from '../src/audio/songs5';
for (const [k, s] of Object.entries(SONGS5)) for (const [i, p] of s.parts.entries()) if (p.notes.length !== s.steps) console.log('BAD', k, i, p.notes.length, '!=', s.steps);
console.log('checked', Object.keys(SONGS5).length);
