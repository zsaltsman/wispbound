import Phaser from 'phaser';
import type { W } from './helpers';
import { scene } from './w2_fx';
import { C, txt, box } from '../ui/ui';
import { up } from '../gfx/font';
import { W as SW, H as SH } from '../constants';
import type { Dir } from '../world/mapdef';

// World 3: choosing one of Milo's three spirits, the way you'd pick a starter. One
// at a time, big, bouncing on the spot, with its name and a few words about it;
// LEFT/RIGHT to look at the others, A to choose, and then a YES/NO to make sure
// (the cursor starts on NO, so mashing A can never pick one by accident).

const PICKS: { id: string; name: string; about: string }[] = [
  {
    id: 'scorvlet',
    name: 'SCORVLET',
    about: "A steel pup no bigger than a boot. Its little tail glows like a coal and puffs smoke rings when it's happy. Brave, loud, and never still.",
  },
  {
    id: 'widowling',
    name: 'WIDOWLING',
    about: "A clockwork spiderling with a wind-up key on its back. It clicks its eight tiny feet while it thinks, and it's always thinking. Shy, but clever.",
  },
  {
    id: 'ironbud',
    name: 'IRONBUD',
    about: 'A little knight in a helmet two sizes too big, dragging a hammer it can barely lift. Stubborn and loyal: it will never, ever give up.',
  },
];

type Btn = 'a' | 'b' | 'start' | Dir;

/** Shows the chooser and resolves with the chosen spirit's id. */
export async function pickTitan(w: W): Promise<string> {
  const dlg = (w as any).dialog as { auto: boolean; autoPicks: number[] };
  // automated runs: answer straight away, the same way they answer questions
  if (dlg.auto) return PICKS[Math.min(2, dlg.autoPicks.length ? dlg.autoPicks.shift()! : 0)].id;

  const s = scene(w);
  const D = 45; // under the dialog box (50), so the YES/NO shows on top
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objs.push(o);
    return w.ui(o);
  };
  const back = add(s.add.rectangle(0, 0, SW, SH, C.black, 0.92).setOrigin(0, 0).setDepth(D)) as Phaser.GameObjects.Rectangle;
  const g = add(s.add.graphics().setDepth(D));
  box(g, 70, 40, SW - 140, 150, 'dark');
  add(txt(s, SW / 2, 14, "MILO'S SPIRITS", { color: C.mid, origin: [0.5, 0] }).setDepth(D));
  add(txt(s, SW / 2, 24, 'CHOOSE ONE', { color: C.white, outline: true, origin: [0.5, 0] }).setDepth(D));
  // a little floor for it to stand on
  const floor = add(s.add.ellipse(SW / 2, 166, 76, 10, C.dark).setDepth(D)) as Phaser.GameObjects.Ellipse;
  const spr = add(s.add.sprite(SW / 2, 168, 'cr_scorvlet', 0).setOrigin(0.5, 1).setScale(2).setDepth(D + 1)) as Phaser.GameObjects.Sprite;
  const left = add(txt(s, 88, 104, '<', { color: C.white, outline: true, scale: 2, origin: [0.5, 0.5] }).setDepth(D + 1));
  const right = add(txt(s, SW - 88, 104, '>', { color: C.white, outline: true, scale: 2, origin: [0.5, 0.5] }).setDepth(D + 1));
  const pips = add(s.add.graphics().setDepth(D + 1)) as Phaser.GameObjects.Graphics;
  const name = add(txt(s, SW / 2, 198, '', { color: C.white, outline: true, scale: 2, origin: [0.5, 0] }).setDepth(D));
  const about = add(txt(s, SW / 2, 222, '', { color: C.light, maxW: SW - 90, align: 'center', origin: [0.5, 0] }).setDepth(D));
  const hint = add(txt(s, SW / 2, SH - 14, '< >  LOOK      A  CHOOSE', { color: C.mid, origin: [0.5, 0] }).setDepth(D));
  const arrowsBob = s.tweens.add({ targets: [left, right], scale: { from: 2, to: 2.3 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  let sel = 0;
  const show = (i: number, from = 0) => {
    sel = (i + PICKS.length) % PICKS.length;
    const p = PICKS[sel];
    spr.setTexture('cr_' + p.id, 0).play('cr_' + p.id + '_idle');
    name.setText(p.name);
    about.setText(up(p.about)); // (the pixel font is capitals only)
    pips.clear();
    PICKS.forEach((_, k) => {
      pips.fillStyle(k === sel ? C.white : C.dark, 1).fillRect(SW / 2 - 16 + k * 14, 180, 6, 4);
    });
    // it slides in from the side you're browsing toward
    if (from) {
      spr.x = SW / 2 + from * 40;
      spr.setAlpha(0);
      s.tweens.add({ targets: spr, x: SW / 2, alpha: 1, duration: 200, ease: 'Quad.easeOut' });
    }
  };
  show(0);
  for (const o of objs) (o as any).setAlpha?.(0);
  await w.tw({ targets: objs, alpha: 1, duration: 350 });
  back.setAlpha(1);

  const ws = w as any;
  let lockUntil = s.time.now + 350;
  let busy = false;
  const id = await new Promise<string>((resolve) => {
    const hook = (b: Btn) => {
      if (busy || s.time.now < lockUntil) return;
      if (b === 'left' || b === 'right') {
        w.sfx('tick');
        const d = b === 'left' ? -1 : 1;
        show(sel + d, d);
        lockUntil = s.time.now + 140;
        return;
      }
      if (b !== 'a') return;
      busy = true;
      void (async () => {
        const p = PICKS[sel];
        w.sfx('select');
        // it perks up at being picked
        spr.stop().setFrame(4);
        await w.tw({ targets: spr, y: spr.y - 10, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        hint.setVisible(false);
        about.setVisible(false);
        ws.keyHook = null; // the YES/NO takes the buttons
        const yes = (await w.ask(`Take ${p.name} with you?`, ['YES', 'NO'], undefined, { cancel: 1, start: 1 })) === 0;
        if (yes) return resolve(p.id);
        // not this one: back to looking
        hint.setVisible(true);
        about.setVisible(true);
        spr.play('cr_' + p.id + '_idle');
        lockUntil = s.time.now + 300;
        busy = false;
        ws.keyHook = hook;
      })();
    };
    ws.keyHook = hook;
  });
  ws.keyHook = null;
  arrowsBob.stop();
  await w.tw({ targets: objs, alpha: 0, duration: 400 });
  objs.forEach((o) => o.destroy());
  void floor;
  return id;
}
