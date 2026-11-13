import type Phaser from 'phaser';
import { net } from './net/client';

// ROGUELIKE: helpers for driving the game from the browser console during development
// (never part of a production build: main.ts only loads this under the dev server).
// The preview pane throttles the game loop, so tests step it by hand.

export function installRogueDev(game: Phaser.Game) {
  let t = 0;
  const scene = () => game.scene.getScenes(true)[0];
  const rt = {
    net,
    game,
    /** Run the game loop `n` frames. */
    async step(n: number) {
      for (let i = 0; i < n; i++) {
        t = (t || performance.now()) + 33;
        game.loop.step(t);
        if (i % 15 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    },
    key(k: string) {
      scene()?.input.keyboard?.emit('keydown', { key: k, preventDefault() {} });
    },
    fast(x = 6) {
      const s = scene();
      if (s) {
        s.tweens.timeScale = x;
        s.time.timeScale = x;
      }
    },
    /** From the title screen: a solo run, through the first draft, standing in the first room. */
    async solo() {
      await rt.step(20);
      game.scene.getScene('title').scene.start('rogue-lobby');
      await rt.step(30);
      net.startSolo();
      await rt.step(20);
      rt.key('Enter');
      await rt.step(40);
      rt.key('Enter');
      await rt.step(10);
      rt.key('Enter');
      await rt.step(220);
    },
    dev(cmd: string, arg?: string) {
      net.send({ t: 'dev', cmd: cmd as 'room', arg });
    },
    /** Keep pressing the first option until this fight (or `n` beats) is over. */
    async fight(n = 200) {
      const id = net.state?.battle?.id;
      for (let k = 0; k < n && net.state?.phase === 'battle' && net.state.battle?.id === id; k++) {
        rt.fast();
        const s = game.scene.getScene('battle') as unknown as { awaitingChoice: boolean; pickerKey: unknown };
        if (game.scene.isActive('battle') && (s.awaitingChoice || s.pickerKey)) rt.key('Enter');
        await rt.step(50);
      }
    },
    /** Step until a scene is on screen. */
    async until(key: string, n = 200) {
      for (let k = 0; k < n && !game.scene.isActive(key); k++) {
        rt.fast();
        await rt.step(25);
      }
      await rt.step(40);
    },
    scenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
  };
  (window as unknown as { __rt: typeof rt }).__rt = rt;
}
