import Phaser from 'phaser';
import { buildTextures, buildWorldTextures } from '../gfx/textures';
import { registerFonts } from '../gfx/font';
import { buildRogueTextures } from '../rogue/gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    registerFonts(this);
    buildTextures(this);
    buildWorldTextures(this);
    // the roguelike mode's own art (new spirits, dungeon tiles, enemies)
    buildRogueTextures(this);
    // the title screen first: NEW GAME / CONTINUE / SETTINGS / CREDITS
    this.scene.start('title');
  }
}
