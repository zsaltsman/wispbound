import { PC, artRng } from './pixel';
import { G4 } from './artTiles4';

// World 4 art, gathered in one place (the preview tool and textures.ts read it from here).

/** A strip of World 4 tiles, for checking them side by side. */
export function tileStrip(ids: number[]): PC {
  const p = new PC(ids.length * 17, 16);
  ids.forEach((id, i) => {
    const t = new PC(16, 16);
    G4[id]?.(t, artRng(id * 131 + 7));
    p.blit(t, i * 17, 0);
  });
  return p;
}
export * from './artW4beasts';
export * from './artW4props';
