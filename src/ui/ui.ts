import Phaser from 'phaser';
import { PAL_HEX } from '../gfx/pixel';
import { up } from '../gfx/font';

export const C = {
  black: PAL_HEX[0],
  dark: PAL_HEX[1],
  mid: PAL_HEX[2],
  light: PAL_HEX[3],
  white: PAL_HEX[4],
};

export interface TextOpts {
  color?: number;
  outline?: boolean;
  scale?: 1 | 2;
  maxW?: number;
  align?: 'left' | 'center' | 'right';
  origin?: [number, number];
}

/** Pixel-font text. Everything is upper-cased to match the font. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}) {
  const font = o.outline ? 'gbo' : 'gb';
  const base = o.outline ? 8 : 6; // bitmap font 'size' = glyph cell width
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), font, up(s), base * (o.scale ?? 1));
  if (o.maxW) t.setMaxWidth(o.maxW);
  if (o.color !== undefined && o.color !== C.white) t.setTint(o.color);
  if (o.align === 'center') t.setCenterAlign();
  if (o.align === 'right') t.setRightAlign();
  if (o.origin) t.setOrigin(o.origin[0], o.origin[1]);
  return t;
}

export type BoxStyle = 'light' | 'dark' | 'select' | 'plain';

/** Game Boy style framed box. */
export function box(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, style: BoxStyle = 'dark') {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const fill = style === 'light' ? C.white : style === 'select' ? C.white : C.black;
  const edge = style === 'light' || style === 'select' ? C.black : C.white;
  const inner = style === 'light' ? C.light : style === 'select' ? C.black : C.mid;
  g.fillStyle(fill, 1).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(edge, 1);
  g.fillRect(x + 2, y, w - 4, 1);
  g.fillRect(x + 2, y + h - 1, w - 4, 1);
  g.fillRect(x, y + 2, 1, h - 4);
  g.fillRect(x + w - 1, y + 2, 1, h - 4);
  g.fillRect(x + 1, y + 1, 1, 1);
  g.fillRect(x + w - 2, y + 1, 1, 1);
  g.fillRect(x + 1, y + h - 2, 1, 1);
  g.fillRect(x + w - 2, y + h - 2, 1, 1);
  if (style !== 'plain') {
    g.fillStyle(inner, 1);
    g.fillRect(x + 3, y + 2, w - 6, 1);
    g.fillRect(x + 3, y + h - 3, w - 6, 1);
    g.fillRect(x + 2, y + 3, 1, h - 6);
    g.fillRect(x + w - 3, y + 3, 1, h - 6);
  }
}

/** Segmented retro bar. `ghost` shows recently lost value in a lighter shade. */
export function bar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  ghost = pct,
  seg = 3,
  fill = C.white,
  minFill = 0
) {
  g.fillStyle(C.white, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(C.black, 1).fillRect(x, y, w, h);
  const gw = Math.round(w * Math.max(0, Math.min(1, ghost)));
  const fw = Math.max(minFill, Math.round(w * Math.max(0, Math.min(1, pct))));
  if (gw > fw) {
    g.fillStyle(C.mid, 1).fillRect(x + fw, y, gw - fw, h);
  }
  g.fillStyle(fill, 1).fillRect(x, y, fw, h);
  if (h > 3) {
    g.fillStyle(C.light, 1).fillRect(x, y + h - 2, fw, 1);
  }
  if (seg > 0) {
    g.fillStyle(C.black, 1);
    for (let i = seg; i < fw; i += seg + 1) g.fillRect(x + i, y, 1, h);
  }
}

/**
 * Destroy layer contents ourselves before a scene switch. Phaser otherwise tears
 * down the layers first and then trips over sprites that still point at them.
 */
export function teardownLayers(scene: Phaser.Scene, layers: (Phaser.GameObjects.Layer | undefined)[]) {
  scene.tweens.killAll();
  // animated objects (sprites, particle emitters) first, while their layers still exist
  const ul = scene.sys.updateList as any;
  for (const o of [...(ul._active ?? []), ...(ul._pending ?? [])]) if (o && o.scene) o.destroy();
  for (const l of layers) {
    if (!l || !l.list) continue;
    for (const c of l.list.slice()) c.destroy();
  }
  for (const c of scene.children.list.slice()) if (!(c instanceof Phaser.GameObjects.Layer)) c.destroy();
}
