import Phaser from 'phaser';
import { GBPipeline } from '../gfx/GBPipeline';
import { txt, box, C } from '../ui/ui';
import { W, H } from '../constants';
import { sound } from '../audio/audio';
import { loadState, clearState, CURIOS } from '../story/state';
import { getCreature } from '../engine/creatures';

// The end of the adventure: a slow monochrome credits roll, then THE END.

export class CreditsScene extends Phaser.Scene {
  private roll!: Phaser.GameObjects.Container;
  private done = false;
  private sel = 0;
  private menu: { label: string; act: () => void }[] = [];
  private menuC?: Phaser.GameObjects.Container;
  private fast = false;

  constructor() {
    super('credits');
  }

  init() {
    this.done = false;
    this.sel = 0;
    this.fast = false;
  }

  create(data: { creature?: string | null; world?: number }) {
    this.world = data?.world ?? 1;
    const cam = this.cameras.main;
    cam.setPostPipeline(GBPipeline);
    cam.setBackgroundColor('#000000');
    cam.fadeIn(1200, 0, 0, 0);
    sound.playSong(data?.world === 6 ? 'fin_credits' : data?.world === 4 ? 'w4_end' : data?.world === 3 ? 'w3_end' : 'credits');
    sound.setAmbience('indoor');
    const st = loadState();
    const creature = data?.creature ?? st?.creature ?? null;
    const curios = st ? CURIOS.filter((k) => (st.items[k] ?? 0) > 0).length : 0;

    // a few drifting stars behind everything
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(Math.random() * W, Math.random() * H, 'fx_px').setAlpha(0.3 + Math.random() * 0.5);
      this.tweens.add({ targets: s, alpha: 0.1, duration: 800 + Math.random() * 1600, yoyo: true, repeat: -1 });
    }

    const c = this.add.container(0, H + 20);
    this.roll = c;
    let y = 0;
    const line = (s: string, color: number = C.white, gap = 14, outline = false, scale: 1 | 2 = 1) => {
      const t = txt(this, W / 2, y, s, { color, origin: [0.5, 0], outline });
      if (scale === 2) t.setScale(2);
      c.add(t);
      y += gap + (scale === 2 ? 10 : 0);
      return t;
    };
    const space = (n: number) => (y += n);
    const sprite = (key: string, frame = 0, scale = 1, anim?: string) => {
      const sp = this.add.sprite(W / 2, y, key, frame).setOrigin(0.5, 0).setScale(scale);
      if (anim && this.anims.exists(anim)) sp.play(anim);
      c.add(sp);
      y += sp.displayHeight + 6;
    };

    const w2 = data?.world === 2;
    if (data?.world === 6) {
      this.world6(line, space, sprite, creature, st);
    } else if (data?.world === 4) {
      this.world4(line, space, sprite, creature, st);
    } else if (data?.world === 3) {
      this.world3(line, space, sprite, creature, st);
    } else if (w2) {
      this.world2(line, space, sprite, creature, st?.creature2 ?? null);
    } else {
    line('THE FLYING DUTCHMAN', C.white, 16, true, 2);
    line('A HOLLOWHAVEN STORY', C.mid, 14);
    space(70);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
    space(80);
    line('STARRING', C.mid, 20);
    const cast: [string, string, number, string?][] = [
      ['THE MAYOR', 'ch_mayor', 0],
      ['AS HIMSELF (A DOG)', '', 0],
      ['THE ASSISTANT', 'ch_assistant', 0],
      ['MADAME ORACLE', 'ch_psychic', 0],
      ['FARMER HOLT', 'ch_farmer', 0],
      ['PUMPKIN THE PIGLET', 'ch_piglet', 0],
      ['GERALD AND HIS HIDEOUS CLOCK', 'p_uglyclock', 0],
      ['OLD GRUNDY THE FISHERMAN', 'ch_fisherman', 0],
      ['DUNCAN, FIRST IN LINE', 'ch_man_round', 0],
      ['GARY (STILL IN THE CELLAR)', '', 0],
    ];
    for (const [name, key, f] of cast) {
      if (key) sprite(key, f, 2);
      line(name, key ? C.white : C.mid, key ? 22 : 30);
    }
    space(40);
    line('THE SPIRITS OF HOLLOWHAVEN', C.mid, 24);
    for (const id of ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith']) {
      sprite('cr_' + id, 0, 1, `cr_${id}_idle`);
      const cr = getCreature(id);
      line(cr.name + (id === 'umbrawl' ? ' (AND HIS FISTS)' : id === 'tickraith' ? ' (PROMOTED)' : ''), id === creature ? C.white : C.light, 26);
    }
    space(40);
    line('AND', C.mid, 20);
    sprite('b_captain', 0, 2);
    line('THE FLYING DUTCHMAN', C.white, 16, true);
    line('CURSED CAPTAIN OF THE ENDLESS SEA', C.mid, 30);
    space(50);
    if (creature) {
      line('YOUR COMPANION', C.mid, 18);
      line(getCreature(creature).name, C.white, 26, true);
    }
    line(`CURIOS FOUND: ${curios} / ${CURIOS.length}`, C.light, 30);
    }
    space(70);
    line('THANK YOU FOR PLAYING', C.white, 20, true);
    space(H / 2);
    const total = y;
    const ms = this.world === 6 ? Math.max(52000, total * 42) : 52000;
    this.tweens.add({
      targets: c,
      y: -total + H / 2 - 40,
      duration: ms,
      ease: 'Linear',
      onComplete: () => this.end(),
    });

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.key(e.key));
    kb.on('keyup', () => (this.fast = false));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.done) this.fast = true;
      else this.pointer(p.x, p.y);
    });
    this.input.on('pointerup', () => (this.fast = false));
    this.events.once('shutdown', () => {
      kb.off('keydown');
      kb.off('keyup');
      this.input.off('pointerdown');
      this.input.off('pointerup');
    });
  }

  private world = 1;

  /** The last roll: everybody, from every world, and the one who started it all. */
  private world6(
    line: (s: string, color?: number, gap?: number, outline?: boolean, scale?: 1 | 2) => unknown,
    space: (n: number) => void,
    sprite: (key: string, frame?: number, scale?: number, anim?: string) => void,
    creature: string | null,
    st: ReturnType<typeof loadState>
  ) {
    const fl = st?.flags ?? {};
    const B = fl.w4_route === 'B';
    const g = B ? 'viperwind' : 'wispmane';
    const has = (k: string) => this.textures.exists(k);
    line('THE GOD OF DEATH', C.white, 16, true, 2);
    line('THE FINAL CHAPTER', C.mid, 14);
    space(70);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
    space(80);
    const section = (title: string, cast: [string, string][]) => {
      line(title, C.mid, 22);
      for (const [name, key] of cast) {
        if (key && has(key)) sprite(key, 0, 2);
        line(name, key ? C.white : C.mid, key ? 22 : 26);
      }
      space(36);
    };
    section('HOLLOWHAVEN', [
      ['THE MAYOR (STILL A DOG)', 'ch_mayor'],
      ['THE ASSISTANT', 'ch_assistant'],
      ['MADAME ORACLE, WHO SAW IT COMING', 'ch_psychic'],
      ['FARMER HOLT', 'ch_farmer'],
      ['MABEL', 'ch_old_lady'],
      ['GERALD', 'ch_gerald'],
    ]);
    section('SALTWASH', [
      ['PROFESSOR PIPWICK, WHO TOLD YOU SO', 'ch_inventor'],
      ['MAYOR BIGGS', 'ch_mayor2'],
      ['LUKE AND GRACE', 'ch_luke'],
      ['MADDIE, MORGAN AND ROXIE', 'ch_maddie'],
    ]);
    section('BACCHUS KEY', [
      ['AYLA, EX ART THIEF', 'ch_ayla'],
      ['AVALENA', 'ch_avalena_bar'],
      ['THE BOUNCER', 'ch_bouncer'],
      ['TOUR GUIDE TEDDY', 'ch_guide'],
      ['MR. FROFRO', 'ch_frofro'],
      [fl.w3_stayed ? 'MILO, WHO STAYED' : 'MILO, WHO SENT A POSTCARD', 'ch_milo'],
      ['AND SAL, WHO IS MISSED', ''],
    ]);
    section('THE FORGOTTEN ISLAND', [
      [B ? 'CARLO, WHO CAME BACK' : 'THE OLD MAN, WHO CAME BACK', B ? 'ch_carlo' : 'ch_oldman4'],
      ['THE BLACK CAT', 'w4_cat'],
    ]);
    section("THE REAPER'S PRISON", [
      ['THE SKELETON WARDEN', ''],
      ['THE SERGEANT, WHO KNEW ANOTHER WAY', ''],
      ['EVERY GUARD WHO SAW NOTHING', ''],
    ]);
    line('THE GUARDIANS', C.mid, 24);
    sprite('ow_' + g, 0, 1);
    line(g === 'viperwind' ? 'VIPERWIND, GUARDIAN OF THE SKY' : 'WISPMANE, GUARDIAN OF THE LAND', C.white, 26, true);
    sprite('ow_flamora', 0, 1, 'ow_flamora_idle');
    line('FLAMORA', C.white, 16, true);
    line('THE OVERSEER OF ALL SPIRITS', C.mid, 30);
    space(30);
    line('AND', C.mid, 20);
    if (has('ow_reaper_true')) sprite('ow_reaper_true', 0, 1);
    line('THE GRIM REAPER', C.white, 16, true);
    line('THE GOD OF DEATH (FORMERLY)', C.mid, 30);
    space(50);
    const party = [creature, st?.creature2 ?? null, ...(st?.extra ?? [])].filter(Boolean) as string[];
    if (party.length) {
      line('AND YOUR TEAM', C.mid, 22);
      for (const id of party) {
        if (has('cr_' + id)) sprite('cr_' + id, 0, 1, `cr_${id}_idle`);
        line(getCreature(id).name, C.white, 24, true);
      }
      space(10);
    }
    line('WHO WERE NEVER AFRAID OF HIM', C.light, 20);
    line('(OKAY. A LITTLE.)', C.mid, 40);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
  }

  /** The roll for World 4: the Forgotten Island, its guardians, and what came for them. */
  private world4(
    line: (s: string, color?: number, gap?: number, outline?: boolean, scale?: 1 | 2) => unknown,
    space: (n: number) => void,
    sprite: (key: string, frame?: number, scale?: number, anim?: string) => void,
    creature: string | null,
    st: ReturnType<typeof loadState>
  ) {
    const B = st?.flags?.w4_route === 'B';
    line('THE FORGOTTEN ISLAND', C.white, 16, true, 2);
    line('CHAPTER ONE OF SOMETHING BIGGER', C.mid, 14);
    space(70);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
    space(80);
    line('STARRING', C.mid, 20);
    const cast: [string, string][] = [
      [B ? 'CARLO, WHO WAS NOT SCARED' : 'CARLO, STILL IN HIS CASTLE', 'ch_carlo'],
      [B ? 'THE OLD MAN IN THE TOWER' : 'THE OLD MAN, AND HIS SALADS', 'ch_oldman4'],
      ['THE BLACK CAT', 'w4_cat'],
      ['THE CHICKENS, WHO RAN', 'ch_chicken'],
    ];
    for (const [name, key] of cast) {
      if (this.textures.exists(key)) sprite(key, 0, 2);
      line(name, C.white, 22);
    }
    space(40);
    line('THE SPIRITS OF THE ISLAND', C.mid, 24);
    for (const [key, name] of [
      ['ow_champion', 'THE ANCIENT FOREST CHAMPION'],
      ['ow_crow', 'THE MUTANT CROW'],
      ['ow_squirrel', 'THE ANCIENT TREE GUARDIAN'],
      ['ow_wispmane', 'WISPMANE, GUARDIAN OF THE LAND'],
      ['ow_viperwind', 'VIPERWIND, GUARDIAN OF THE SKY'],
    ] as const) {
      sprite(key, 0, 1);
      line(name, C.white, 26, true);
    }
    space(30);
    sprite('ow_flamora', 0, 1, 'ow_flamora_idle');
    line('FLAMORA', C.white, 16, true);
    line('THE OVERSEER OF ALL SPIRITS', C.mid, 30);
    space(30);
    line('AND', C.mid, 20);
    sprite('ow_reaper', 0, 2);
    line('THE REAPER', C.white, 16, true);
    line('THE COLLECTOR', C.mid, 30);
    space(50);
    const party = [creature, st?.creature2 ?? null, ...(st?.extra ?? [])].filter(Boolean) as string[];
    if (party.length) {
      line('YOUR COMPANIONS (WHEREVER THEY ARE NOW)', C.mid, 18);
      for (const id of party) line(getCreature(id).name, C.white, 18, true);
      space(10);
    }
    line(`AND ${B ? 'VIPERWIND' : 'WISPMANE'}, WHO STAYED WITH YOU`, C.light, 30);
  }

  /** The roll for the end of World 3: Bacchus Key, the Titans, and the boy who sent them. */
  private world3(
    line: (s: string, color?: number, gap?: number, outline?: boolean, scale?: 1 | 2) => unknown,
    space: (n: number) => void,
    sprite: (key: string, frame?: number, scale?: number, anim?: string) => void,
    creature: string | null,
    st: ReturnType<typeof loadState>
  ) {
    line('THE PARTY ISLAND', C.white, 16, true, 2);
    line('A BACCHUS KEY STORY', C.mid, 14);
    space(70);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
    space(80);
    line('STARRING', C.mid, 20);
    const cast: [string, string][] = [
      ['AYLA', 'ch_ayla'],
      ['AVALENA', 'ch_avalena'],
      ['MILO', 'ch_milo'],
      ['SAL, BEHIND THE BAR FOR 53 YEARS', 'ch_sal'],
      ['TOUR GUIDE TEDDY', 'ch_guide'],
      ['THE BOUNCER', 'ch_bouncer'],
      ['DR. FIZZ AND MR. GRIMSBY', 'ch_doctor'],
      ['LIN AND KEVIN', 'ch_lin'],
      ['CAPTAIN MORTY', 'ch_morty'],
      ['LEX, THE BEAR QUEEN', 'ch_lex'],
      ['DOTTIE', 'ch_dottie'],
      ['MR. FROFRO', 'ch_frofro'],
      ['EVERY PARTYGOER ON BACCHUS KEY', 'ch_partier1'],
    ];
    for (const [name, key] of cast) {
      if (this.textures.exists(key)) sprite(key, 0, 2);
      line(name, C.white, 22);
    }
    space(40);
    line('THE TITANS', C.mid, 24);
    for (const [key, name] of [['ow_scorvex', 'SCORVEX'], ['ow_widow', 'WIDOWMAKER'], ['ow_ironclad', 'IRONCLAD']] as const) {
      sprite(key, 0, 1);
      line(name, C.white, 26, true);
    }
    space(40);
    const party = [creature, st?.creature2 ?? null, ...(st?.extra ?? [])].filter(Boolean) as string[];
    if (party.length) {
      line('YOUR COMPANIONS', C.mid, 18);
      for (const id of party) line(getCreature(id).name, C.white, 18, true);
      space(10);
    }
    line(st?.flags?.w3_stayed ? 'MILO STAYED, AND HELPED REBUILD' : st?.flags?.w3_banished ? 'MILO SAILED AWAY AT SUNSET' : 'AND MILO', C.light, 22);
    line('AND SAL, WHO IS MISSED', C.light, 30);
  }

  /** The roll for the end of World 2: Saltwash, the deep, and the Kraken. */
  private world2(
    line: (s: string, color?: number, gap?: number, outline?: boolean, scale?: 1 | 2) => unknown,
    space: (n: number) => void,
    sprite: (key: string, frame?: number, scale?: number, anim?: string) => void,
    creature: string | null,
    creature2: string | null
  ) {
    line('THE FLOODED ISLAND', C.white, 16, true, 2);
    line('A SALTWASH STORY', C.mid, 14);
    space(70);
    line('GAME MADE BY', C.light, 18);
    line('ZAIN SALTSMAN', C.white, 26, true, 2);
    space(80);
    line('STARRING', C.mid, 20);
    const cast: [string, string][] = [
      ['PROFESSOR PIPWICK', 'ch_inventor'],
      ['MAYOR BIGGS', 'ch_mayor2'],
      ['SLICK RICK', 'ch_rick'],
      ['MADDIE, MORGAN AND ROXIE', 'ch_maddie'],
      ['LUKE AND GRACE', 'ch_luke'],
      ['DIRECTOR HALE', 'ch_official'],
      ['THE VOTERS OF SALTWASH', 'ch_local'],
      ['THE PEANUT BUTTER', ''],
    ];
    for (const [name, key] of cast) {
      if (key && this.textures.exists(key)) sprite(key, 0, 2);
      line(name, key ? C.white : C.mid, key ? 22 : 30);
    }
    space(40);
    line('THE GUARDIANS OF THE DEEP', C.mid, 24);
    for (const id of ['glowbell', 'hammerfin', 'bubblotl', 'glidray']) {
      sprite('cr_' + id, 0, 1, `cr_${id}_idle`);
      line(getCreature(id).name, id === creature2 ? C.white : C.light, 26);
    }
    space(40);
    line('AND', C.mid, 20);
    sprite('kr', 0, 0.6);
    line('THE KRAKEN', C.white, 16, true);
    line('WHAT LIVED BENEATH THE ISLAND', C.mid, 30);
    space(50);
    const party = [creature, creature2].filter(Boolean) as string[];
    if (party.length) {
      line('YOUR COMPANIONS', C.mid, 18);
      for (const id of party) line(getCreature(id).name, C.white, 18, true);
      space(10);
    }
    line('AND PROFESSOR PIPWICK, WHO STAYED', C.light, 30);
  }

  update() {
    this.tweens.timeScale = this.fast && !this.done ? 6 : 1;
  }

  private key(k: string) {
    if (!this.done) {
      if (k === 'z' || k === 'Enter' || k === ' ') this.fast = true;
      return;
    }
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's') {
      this.sel = (this.sel + (k === 'ArrowUp' || k === 'w' ? -1 : 1) + this.menu.length) % this.menu.length;
      sound.play('move');
      this.drawMenu();
    } else if (k === 'z' || k === 'Enter' || k === ' ') this.menu[this.sel].act();
  }

  private pointer(x: number, y: number) {
    const i = Math.floor((y - 186) / 20);
    if (Math.abs(x - W / 2) < 100 && i >= 0 && i < this.menu.length) {
      this.sel = i;
      this.menu[i].act();
    }
  }

  private end() {
    if (this.done) return;
    this.done = true;
    this.fast = false;
    this.tweens.timeScale = 1;
    this.roll.setVisible(false);
    // the last chapter: no menu yet. The credits hand over to one more look at every world
    if (this.world === 6) {
      sound.stopMusic();
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('world', { script: 'w6_montage' }));
      return;
    }
    const t = txt(this, W / 2, 96, this.world === 4 ? 'TO BE CONTINUED' : 'THE END', { outline: true, origin: [0.5, 0] }).setScale(this.world === 4 ? 2 : 3);
    t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 1500 });
    sound.play('victory');
    this.menu = [
      { label: 'KEEP EXPLORING', act: () => this.go(() => this.scene.start('world', {})) },
      {
        label: 'NEW ADVENTURE',
        act: () =>
          this.go(() => {
            clearState();
            this.scene.start('world', {});
          }),
      },
      { label: 'DUTCHMAN RUSH', act: () => this.go(() => this.scene.start('select', {})) },
    ];
    this.time.delayedCall(1500, () => this.drawMenu());
  }

  private drawMenu() {
    this.menuC?.destroy();
    const c = this.add.container(0, 0);
    this.menuC = c;
    const g = this.add.graphics();
    c.add(g);
    this.menu.forEach((m, i) => {
      const y = 186 + i * 20;
      box(g, W / 2 - 90, y, 180, 18, i === this.sel ? 'light' : 'dark');
      c.add(txt(this, W / 2, y + 5, m.label, { origin: [0.5, 0], color: i === this.sel ? C.black : C.white }));
    });
    c.add(txt(this, W / 2, 256, 'DUTCHMAN RUSH: FIGHT HIM AGAIN WITH ANY SPIRIT', { origin: [0.5, 0], color: C.mid }));
  }

  private go(fn: () => void) {
    sound.play('select');
    sound.stopMusic();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', fn);
  }
}
