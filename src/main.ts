import Phaser from 'phaser';
import { GBPipeline } from './gfx/GBPipeline';
import { BootScene } from './scenes/BootScene';
import { SelectScene } from './scenes/SelectScene';
import { BattleScene } from './scenes/BattleScene';
import { WorldScene } from './scenes/WorldScene';
import { CreditsScene } from './scenes/CreditsScene';
import { TitleScene } from './scenes/TitleScene';
import { SeaScene } from './scenes/SeaScene';
import { LobbyScene } from './rogue/scenes/LobbyScene';
import { DraftScene } from './rogue/scenes/DraftScene';
import { SummaryScene } from './rogue/scenes/SummaryScene';
import { DungeonScene } from './rogue/scenes/DungeonScene';
import { settings, updateSettings, onSettings } from './settings';
import { sound } from './audio/audio';
import { W, H } from './constants';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE },
  pipeline: { GBPipeline } as unknown as Phaser.Types.Core.PipelineConfig,
  // (the last four are the roguelike mode: its own scenes, its own progress)
  scene: [BootScene, TitleScene, WorldScene, SelectScene, BattleScene, CreditsScene, SeaScene, LobbyScene, DraftScene, DungeonScene, SummaryScene],
  input: { activePointers: 2 },
  disableContextMenu: true,
});

// Integer pixel scaling whenever the window is large enough.
function fit() {
  const availW = window.innerWidth - 36;
  const availH = window.innerHeight - 96;
  let s = Math.min(availW / W, availH / H);
  if (s >= 2) s = Math.floor(s);
  s = Math.max(0.5, s);
  const el = document.getElementById('game')!;
  const w = `${Math.round(W * s)}px`;
  const h = `${Math.round(H * s)}px`;
  el.style.width = w;
  el.style.height = h;
  if (game.canvas) {
    game.canvas.style.width = w;
    game.canvas.style.height = h;
    game.scale.refresh();
  }
}
game.events.once('ready', fit);
window.addEventListener('resize', fit);
document.addEventListener('fullscreenchange', fit);
fit();

// Audio may only start after a user gesture.
const unlock = () => {
  sound.unlock();
  sound.setEnabled(settings.sound);
  sound.setVolume(settings.volume / 10);
  sound.setMusicVolume(settings.music / 10);
  sound.setSfxVolume(settings.sfx / 10);
  sound.startAmbience();
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// Settings bar
const $ = (id: string) => document.getElementById(id) as HTMLButtonElement;
function render() {
  $('b-sound').textContent = `SOUND: ${settings.sound ? 'ON' : 'OFF'}`;
  document.getElementById('pips')!.textContent = 'VOL ' + '#'.repeat(settings.volume) + '.'.repeat(10 - settings.volume);
  $('b-speed').textContent = `SPEED: ${settings.speed}X`;
  $('b-motion').textContent = `MOTION: ${settings.reducedMotion ? 'REDUCED' : 'FULL'}`;
  sound.setEnabled(settings.sound);
  sound.setVolume(settings.volume / 10);
  sound.setMusicVolume(settings.music / 10);
  sound.setSfxVolume(settings.sfx / 10);
}
const blurAfter = (fn: () => void) => (e: Event) => {
  fn();
  (e.currentTarget as HTMLElement).blur(); // keep keyboard focus on the game
};
$('b-sound').onclick = blurAfter(() => updateSettings({ sound: !settings.sound }));
$('b-voldn').onclick = blurAfter(() => updateSettings({ volume: Math.max(0, settings.volume - 1) }));
$('b-volup').onclick = blurAfter(() => updateSettings({ volume: Math.min(10, settings.volume + 1) }));
$('b-speed').onclick = blurAfter(() => updateSettings({ speed: (settings.speed % 3) + 1 }));
$('b-motion').onclick = blurAfter(() => updateSettings({ reducedMotion: !settings.reducedMotion }));
$('b-full').onclick = blurAfter(() => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
onSettings(render);
render();

(window as any).__game = game;
// console helpers for testing the roguelike (dev server only)
if ((import.meta as any).env?.DEV) void import('./rogue/dev').then((m) => m.installRogueDev(game));
