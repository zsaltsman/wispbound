import Phaser from 'phaser';
import { PC, BLACK, WHITE } from './pixel';
import { G, FONT_CHARS, drawText } from './fontData';

export { FONT_CHARS, drawText };

// Original 5x7 pixel font, painted at boot into two bitmap fonts:
//  'gb'  - plain white glyphs on a 6x8 grid (tint for other shades)
//  'gbo' - white glyphs with a black outline on an 8x10 grid (damage numbers, titles)

function paint(outlined: boolean): PC {
  const cw = outlined ? 8 : 6;
  const ch = outlined ? 10 : 8;
  const keys = Object.keys(G);
  const pc = new PC(cw * keys.length, ch);
  keys.forEach((k, idx) => {
    const rows = G[k].split(' ');
    const ox = idx * cw + (outlined ? 1 : 0);
    const oy = outlined ? 1 : 0;
    rows.forEach((r, y) => {
      for (let x = 0; x < 5; x++) if (r[x] === '1') pc.px(ox + x, oy + y, WHITE);
    });
  });
  if (outlined) {
    // outline per glyph cell so neighbours never merge
    const o = pc.copy();
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < pc.w; x++) {
        if (pc.get(x, y) >= 0) continue;
        const cell = Math.floor(x / cw);
        const same = (xx: number) => Math.floor(xx / cw) === cell;
        let n = false;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
        ]) {
          if (same(x + dx) && pc.get(x + dx, y + dy) === WHITE) n = true;
        }
        if (n) o.px(x, y, BLACK);
      }
    return o;
  }
  return pc;
}

export function registerFonts(scene: Phaser.Scene) {
  for (const outlined of [false, true]) {
    const key = outlined ? 'gbo' : 'gb';
    const pc = paint(outlined);
    scene.textures.addCanvas(key + '_img', pc.toCanvas());
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key + '_img',
      width: outlined ? 8 : 6,
      height: outlined ? 10 : 8,
      chars: FONT_CHARS,
      charsPerRow: FONT_CHARS.length,
      'spacing.x': 0,
      'spacing.y': 0,
      'offset.x': 0,
      'offset.y': 0,
      lineSpacing: outlined ? 0 : 2,
    });
    scene.cache.bitmapFont.add(key, data);
  }
}

/** Uppercase everything except the lowercase 'x' used for hit counts like 4x14. */
export function up(s: string): string {
  return s.toUpperCase().replace(/(\d)X(?=\d)/g, '$1x');
}
