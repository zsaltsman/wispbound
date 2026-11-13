import Phaser from 'phaser';
import type { Script, Gate, W } from './helpers';
import { scene, bars } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { blockedStatic } from '../world/mapdef';
import { LAB, brkOn } from '../world/maps/w4maps';
import { partyOf } from './state';
import { getCreature } from '../engine/creatures';
import { route4 } from './w4_state';
import { f, px, py, who, comp, inscription } from './w4_fx';

// World 4: THE SPIRIT RESEARCH FACILITY. After the guardian refuses you, the fight's
// last tremor shakes the vines off the hillside by the clearing, and there is a door.
// Inside: reception (the breakers), the laboratory (the tuner), containment (the spirit
// cell), the office (the director's safe), the experiment chamber (SUBJECT 9), and the
// vault, where something far bigger got out. Then back out into the night, and on to
// the village, where the chapter goes on exactly as before.
//
// The patron who paid for all of it is never named. A hood in a photograph, a sketch
// with no face, a curving mark instead of a signature, and a hand that writes FURTHER.

const O = (w: W) => who(w) === 'old';
/** The companion's line, one for each of them. */
const say2 = (w: W, old: string, carlo: string, emote?: string) => comp(w, O(w) ? old : carlo, emote);

function spawnPush(w: W, id: string, key: string, x: number, y: number, push: boolean) {
  w.remove(id);
  const a = w.spawn(id, 'raw:' + key, x, y, 'down');
  (a as any).push = push;
  return a;
}
/** Both creatures react to something. */
function startle(w: W, kind = '!') {
  w.emote('follower', kind, 800);
  w.emote('follower2', kind, 800);
}
/** The names of the three creatures with you. */
const names = (w: W) => partyOf(w.state).map((id) => getCreature(id).name);

let sub: Phaser.GameObjects.Sprite | null = null; // SUBJECT 9, asleep in its tank
let remnant: Phaser.GameObjects.Sprite | null = null; // the last of Subject 7

// ================================================================== the two minigames

/**
 * The containment lock: match the wave on the screen, three times. UP/DOWN sets how
 * tall your wave is, LEFT/RIGHT how fast it runs, SPACE locks it in, X steps away.
 */
async function tunerGame(w: W): Promise<boolean> {
  const s = scene(w);
  const c = w.ui(s.add.container(0, 0).setDepth(86));
  const shade = s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setAlpha(0.85);
  const title = txt(s, SW / 2, 16, 'THE CONTAINMENT LOCK', { outline: true, origin: [0.5, 0] });
  const info = txt(s, SW / 2, 34, 'MATCH THE GREY WAVE', { color: C.light, origin: [0.5, 0] });
  const h1 = txt(s, SW / 2, SH - 52, 'UP/DOWN: HEIGHT    LEFT/RIGHT: SPEED', { color: C.light, origin: [0.5, 0] });
  const h2 = txt(s, SW / 2, SH - 38, 'SPACE: LOCK IT IN    X: STEP AWAY', { color: C.light, origin: [0.5, 0] });
  const g = s.add.graphics();
  c.add([shade, g, title, info, h1, h2]);
  const targets: [number, number][] = [
    [2, 3],
    [4, 1],
    [3, 4],
  ];
  let stage = 0;
  let amp = 1;
  let freq = 1;
  let t = 0;
  let buzz = 0;
  const BX = 50;
  const BW = SW - 100;
  const BY = 70;
  const BH = 130;
  const draw = () => {
    g.clear();
    g.fillStyle(C.dark, 1).fillRect(BX - 6, BY - 6, BW + 12, BH + 12);
    g.fillStyle(C.black, 1).fillRect(BX - 4, BY - 4, BW + 8, BH + 8);
    for (let y = BY; y < BY + BH; y += 26) g.fillStyle(C.dark, 1).fillRect(BX, y, BW, 1);
    const [ta, tf] = targets[Math.min(stage, 2)];
    const mid = BY + BH / 2;
    for (let x = 0; x < BW; x += 3) g.fillStyle(C.mid, 1).fillRect(BX + x, Math.round(mid + Math.sin((x / BW) * Math.PI * 2 * tf + t) * ta * 13), 2, 2);
    const jit = buzz > 0 ? 3 : 0;
    for (let x = 0; x < BW; x++) g.fillStyle(C.white, 1).fillRect(BX + x, Math.round(mid + Math.sin((x / BW) * Math.PI * 2 * freq + t) * amp * 13 + (Math.random() - 0.5) * jit), 1, 2);
    for (let i = 0; i < 3; i++) g.fillStyle(i < stage ? C.white : C.dark, 1).fillRect(SW / 2 - 26 + i * 20, BY + BH + 14, 12, 6);
  };
  const ok = await new Promise<boolean>((done) => {
    const upd = (_: number, dt: number) => {
      t += dt * 0.004;
      buzz = Math.max(0, buzz - dt);
      draw();
    };
    const finish = (r: boolean) => {
      s.events.off('update', upd);
      w.keyHook = null;
      done(r);
    };
    s.events.on('update', upd);
    w.keyHook = (b) => {
      if (b === 'b') return finish(false);
      if (b === 'up' || b === 'down') {
        amp = Phaser.Math.Clamp(amp + (b === 'up' ? 1 : -1), 1, 4);
        w.sfx('tick');
      } else if (b === 'left' || b === 'right') {
        freq = Phaser.Math.Clamp(freq + (b === 'right' ? 1 : -1), 1, 4);
        w.sfx('tick');
      } else if (b === 'a') {
        const [ta, tf] = targets[stage];
        if (amp === ta && freq === tf) {
          stage++;
          w.sfx('right');
          info.setText(stage < 3 ? `STAGE ${stage + 1} OF 3` : 'UNLOCKED');
          if (stage >= 3) s.time.delayedCall(500, () => finish(true));
        } else {
          buzz = 400;
          w.sfx('wrong');
          info.setText('THE LOCK BUZZES. NOT QUITE.');
        }
      }
    };
  });
  c.destroy();
  return ok;
}

/** The director's safe: three digits. LEFT/RIGHT picks a dial, UP/DOWN turns it. */
async function safeGame(w: W): Promise<boolean> {
  const s = scene(w);
  const c = w.ui(s.add.container(0, 0).setDepth(86));
  const shade = s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setAlpha(0.85);
  const title = txt(s, SW / 2, 40, "THE DIRECTOR'S SAFE", { outline: true, origin: [0.5, 0] });
  const info = txt(s, SW / 2, 196, '', { color: C.light, origin: [0.5, 0] });
  const h1 = txt(s, SW / 2, SH - 52, 'LEFT/RIGHT: PICK A DIAL    UP/DOWN: TURN IT', { color: C.light, origin: [0.5, 0] });
  const h2 = txt(s, SW / 2, SH - 38, 'SPACE: TRY THE HANDLE    X: STEP AWAY', { color: C.light, origin: [0.5, 0] });
  const g = s.add.graphics();
  const digits = [0, 1, 2].map((i) => txt(s, SW / 2 - 50 + i * 50, 112, '0', { outline: true, origin: [0.5, 0], scale: 2 }));
  c.add([shade, g, title, info, h1, h2, ...digits]);
  const val = [0, 0, 0];
  let sel = 0;
  const draw = () => {
    g.clear();
    g.fillStyle(C.dark, 1).fillRect(SW / 2 - 90, 80, 180, 100);
    g.fillStyle(C.black, 1).fillRect(SW / 2 - 86, 84, 172, 92);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(i === sel ? C.light : C.dark, 1).fillRect(SW / 2 - 66 + i * 50, 100, 32, 50);
      g.fillStyle(C.black, 1).fillRect(SW / 2 - 64 + i * 50, 102, 28, 46);
      digits[i].setText(String(val[i]));
      if (i === sel) {
        g.fillStyle(C.white, 1).fillTriangle(SW / 2 - 50 + i * 50, 92, SW / 2 - 56 + i * 50, 98, SW / 2 - 44 + i * 50, 98);
        g.fillStyle(C.white, 1).fillTriangle(SW / 2 - 50 + i * 50, 158, SW / 2 - 56 + i * 50, 152, SW / 2 - 44 + i * 50, 152);
      }
    }
  };
  draw();
  const ok = await new Promise<boolean>((done) => {
    const finish = (r: boolean) => {
      w.keyHook = null;
      done(r);
    };
    w.keyHook = (b) => {
      if (b === 'b') return finish(false);
      if (b !== 'a') info.setText('');
      if (b === 'left' || b === 'right') sel = (sel + (b === 'right' ? 1 : 2)) % 3;
      else if (b === 'up' || b === 'down') val[sel] = (val[sel] + (b === 'up' ? 1 : 9)) % 10;
      else if (b === 'a') {
        if (val.every((v, i) => v === LAB.code[i])) {
          w.sfx('unlock');
          info.setText('CLICK.');
          draw();
          s.time.delayedCall(500, () => finish(true));
          return;
        }
        w.sfx('locked');
        info.setText('THE HANDLE WILL NOT TURN.');
      }
      w.sfx('tick');
      draw();
    };
  });
  c.destroy();
  return ok;
}

// ================================================================== the door in the hillside

const FOUND: Record<string, Script> = {
  async w4_lab_found(w) {
    if (f(w, 'w4_lab_found')) return;
    const s = scene(w);
    await w.wait(400);
    w.sfx('rumble');
    w.shake(1000, 0.006);
    await w.say('The ground gives one last shudder, as if the fight has only just reached it.');
    await w.camPan(LAB.door.x, LAB.door.y - 2, 900, 1.6);
    // the vines come away from the hillside in one great sheet
    const v = w.image('w4_vinefall', px(LAB.hill.x + 4) - 8, py(LAB.hill.y) - 8, 9000).setOrigin(0.5, 0);
    w.set('w4_lab_found');
    w.refresh();
    w.sfx('creak');
    await w.wait(500);
    w.sfx('heavy');
    w.shake(400, 0.005);
    await w.tw({ targets: v, y: v.y + 50, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
    v.destroy();
    await w.wait(300);
    await w.say('The old vines slide off the hillside in a heap. Underneath them is concrete. And a heavy metal door.');
    await w.say('A rusted sign over the door: THE LANTERN INSTITUTE FOR SPIRIT RESEARCH.');
    w.sfx('hum');
    startle(w);
    await w.wait(900);
    await w.say('Your creatures go stiff. All three of them are staring at the door.');
    await w.say('From somewhere deep inside the hill comes a low, sick hum... and under it, very faintly, something crying.');
    if (O(w)) {
      await comp(w, 'In all my years on this island, I never once knew that was here.', '?');
      await comp(w, 'That hum is spirit energy. A great deal of it. And it does not sound well.');
      await comp(w, 'If something in there is hurting, we can\'t just walk away. The village can wait. Carefully, now.');
    } else {
      await comp(w, 'Okay. A secret door. In a hill. In the creepy forest.', '...');
      await comp(w, 'Something\'s crying in there. Your creatures heard it too. Look at them.');
      await comp(w, 'Fine. We look. But if anything jumps out, I\'m hiding behind you.');
    }
    s.cameras.main.flash(1, 0, 0, 0);
    await w.camReturn(700);
    w.save();
  },
};

const GATES_LAB: Record<string, Gate> = {
  async w4_lab_door(w) {
    if (!f(w, 'w4_lab_found')) {
      await w.say('Thick old vines hang over the hillside here, heavy as curtains.');
      return false;
    }
    if (!f(w, 'q_lab_in')) {
      w.set('q_lab_in');
      w.sfx('creakmetal');
      await w.say('You haul the wheel round. It turns, grinding, and the heavy door swings inward.');
    }
    return true;
  },
  async w4_lab_n(w) {
    if (f(w, 'w4_lab_power')) return true;
    await w.say('A sliding door marked LABORATORY. With no power, it will not budge an inch.');
    return false;
  },
  async w4_lab_shutter(w) {
    if (f(w, 'w4_lab_tuned')) return true;
    await w.say('CONTAINMENT. A steel shutter is pulled down over the doorway. The lock must be the machine by the wall.');
    return false;
  },
  async w4_lab_card(w) {
    if (f(w, 'w4_lab_card')) {
      if (!f(w, 'q_lab_card')) {
        w.set('q_lab_card');
        w.sfx('unlock');
        await w.say('You hold the keycard to the reader. A little lamp blinks white, and the lock clicks open.');
      }
      return true;
    }
    await w.say('RESEARCH OFFICE. A card reader by the handle. Without a keycard, it stays locked.');
    return false;
  },
  async w4_lab_dkey(w) {
    if (f(w, 'w4_lab_key')) {
      if (!f(w, 'q_lab_key')) {
        w.set('q_lab_key');
        w.sfx('unlock');
        await w.say('The brass key turns, heavy and stiff. Something enormous hums on the other side of the door.');
      }
      return true;
    }
    await w.say('EXPERIMENT CHAMBER. A thick door with a brass lock. A low hum comes through it; you can feel it in your teeth.');
    return false;
  },
  async w4_lab_vault(w) {
    if (f(w, 'subject_beaten')) {
      if (!f(w, 'q_lab_vault')) {
        w.set('q_lab_vault');
        w.sfx('creakmetal');
        await w.say('The vault door\'s lock has burnt out. It swings open at a push.');
      }
      return true;
    }
    await w.say('A huge round door, marked VAULT. Its lock is dead: there is no power to this part of the building.');
    return false;
  },
};

// ================================================================== reception

async function breaker(w: W, i: number) {
  if (f(w, 'w4_lab_power')) return void (await w.say('All four breakers are up. Somewhere in the walls, the building hums.'));
  for (const j of [i - 1, i, i + 1]) if (j >= 0 && j < LAB.breakers.length) w.set('w4_lb' + j, !f(w, 'w4_lb' + j));
  w.sfx('breaker');
  w.refresh();
  if (LAB.breakers.every((_, j) => brkOn(w.state, j))) {
    w.set('w4_lab_power');
    await w.wait(400);
    w.sfx('powerup');
    w.setDark(0.42, 1200);
    w.flash(0.3);
    await w.wait(900);
    await w.say('CLUNK. All four lamps burn white, and the whole building shudders awake.');
    await w.say('Lights stutter on, one room at a time. Somewhere further in, a door slides open.');
    await say2(w, 'There we are. Now we can see what we\'re walking into.', 'Lights! Lights are good. Lights mean fewer things in the dark.');
    w.save();
    return;
  }
  if (!f(w, 'q_lab_brk')) {
    w.set('q_lab_brk');
    await w.say('CLUNK. The breaker flips... and so do the ones on either side of it. The wiring in here is a mess.');
  }
}

const RECEPTION: Record<string, Script> = {
  async enter_w4_lab1(w) {
    if (f(w, 'q_lab_rec')) return;
    w.set('q_lab_rec');
    await w.wait(300);
    await w.say('Inside, it is cold and very quiet. Dust lies thick on everything.');
    await w.say('A front desk. Rows of waiting chairs. Nobody has sat in them for a very long time.');
    await say2(w, 'A waiting room. On this island. Who on earth were they expecting?', 'Hello? ...Nobody. Good. Great. Totally fine.');
    await w.say('The lights are dead. On the wall, a row of four big breakers, each with a lamp on top.');
    await w.say('A note is taped beneath them: ALL FOUR UP = MAIN POWER. Two are up. Two are down.');
  },
  w4_lab_brk0: (w) => breaker(w, 0),
  w4_lab_brk1: (w) => breaker(w, 1),
  w4_lab_brk2: (w) => breaker(w, 2),
  w4_lab_brk3: (w) => breaker(w, 3),
  async w4_lab_desk(w) {
    await w.say('A visitor log lies open on the front desk.');
    await w.say('Most of the pages are deliveries. Inspectors. A man come to fix the boiler.');
    await w.say('But one visitor came back again and again, every month, for years. There is no name. Just a mark: a long, curving line.');
    await w.say('Under PURPOSE OF VISIT, the same word every time, in a nervous hand: PATRON.');
    if (!f(w, 'q_lab_log')) {
      w.set('q_lab_log');
      await say2(w, 'A patron. Somebody was paying for all this.', 'Who signs their name with a squiggle? That\'s not a name. That\'s a doodle.');
    }
  },
  async w4_lab_photo(w) {
    await inscription(w, 'w4_photo', [
      'A framed photograph: the staff on opening day, in their white coats, all of them smiling.',
      'At the very edge of the picture, a little apart from the rest, someone tall is standing in a dark hood.',
      'Everyone else is looking at the camera. The hood is turned toward the door.',
    ], 2);
  },
  async w4_lab_sign(w) {
    await w.say('A painted sign: THE LANTERN INSTITUTE FOR SPIRIT RESEARCH.');
    await w.say('And under it, the motto: EVERY SPIRIT HAS A LIMIT. WE ARE HERE TO FIND IT.');
  },
  async w4_lab_board(w) {
    await w.say('A notice board. STAFF PICNIC CANCELLED (AGAIN). REMINDER: DO NOT TAP ON THE GLASS.');
    await w.say('Pinned over the top of all of them, a newer notice: NOBODY GOES DOWN TO THE VAULT ALONE. NOBODY.');
  },
  async w4_lab_locker1(w) {
    await w.say('A staff locker. Inside: a scarf, a flask of something long gone cold, and a badge. LANTERN INSTITUTE. VISITOR ESCORT.');
  },
};

// ================================================================== the laboratory

const LABORATORY: Record<string, Script> = {
  async enter_w4_lab2(w) {
    if (f(w, 'q_lab_lab')) return;
    w.set('q_lab_lab');
    await w.wait(300);
    await w.say('Long benches crowded with instruments, every one of them pointed at little glass jars. Some of the jars still glow.');
    await say2(w, 'Spirit energy. They were bottling it, like jam.', 'Are those... bits of spirits? In jars? Why would you put a spirit in a jar?', '...');
    await w.say('On the left, the door to CONTAINMENT is sealed behind a steel shutter. Beside it hums a big machine with a wave on its screen.');
  },
  async w4_lab_tuner(w) {
    if (f(w, 'w4_lab_tuned')) return void (await w.say('The tuner\'s screen shows three flat green lines. UNLOCKED.'));
    if (!f(w, 'q_lab_tuner')) {
      w.set('q_lab_tuner');
      await w.say('The shutter\'s lock. A label: SET THE TUNER TO THE SUBJECT\'S RESONANCE. THREE STAGES.');
      await w.say('The grey wave is the one the lock wants. The white one is yours.');
    }
    if (!(await tunerGame(w))) return void (await w.say('You step back from the tuner. The grey wave keeps on rolling.'));
    w.set('w4_lab_tuned');
    w.save();
    await w.camPan(4, 2, 500);
    w.sfx('clank');
    w.refresh();
    w.shake(400, 0.004);
    await w.say('The shutter rattles up into the ceiling. The way into CONTAINMENT is open.');
    await w.camReturn(500);
  },
  async w4_lab_scanner(w) {
    const [a, b, c] = names(w);
    if (f(w, 'q_lab_scan')) return void (await w.say(`The scanner's arm follows ${a} around the room. ${a} does not like it one bit.`));
    w.set('q_lab_scan');
    w.sfx('sonar');
    await w.say(`The scanner's arm swings round and points straight at ${a}. Numbers flood the screen.`);
    await w.say('ENERGY: NORMAL. STABLE. WITHIN NATURAL LIMITS.');
    await w.say(`It does the same to ${b}, then ${c}. The same answer every time.`);
    w.sfx('wrong');
    await w.say('Then it beeps twice, almost disappointed, and one word blinks on the screen: INSUFFICIENT.');
    await say2(w, 'Insufficient. For what, I wonder.', 'Rude. They\'re great. They\'re the best ones I\'ve met.');
  },
  async w4_lab_scope(w) {
    await w.say('Under the microscope, a speck of something grey. It was a spirit once. A tiny piece of one.');
    await w.say('It doesn\'t glow any more.');
  },
  async w4_lab_jars(w) {
    await w.say('Rows of little jars, each one labelled with a date. The oldest ones still glow. Each newer one holds a little less light than the last.');
  },
  async w4_lab_bench(w) {
    await w.say('Notes, tools, a cup of tea with a skin on it. Whoever worked here left in a hurry.');
  },
  async w4_lab_locker2(w) {
    await w.say('A locker. A white coat, a pair of boots, and a drawing of a dog, done by a child. Nobody ever came back for them.');
  },
  async w4_lab_files(w) {
    await w.say('A drawer of results. Every page has the same note in the margin, in the same sharp, slanting hand: FURTHER.');
  },
  async w4_lab_graph(w) {
    await inscription(w, 'w4_graph', [
      'A whiteboard graph. SPIRIT ENERGY, AGAINST DOSE.',
      'It climbs, and climbs, past a dotted line marked NATURAL LIMIT... and then drops straight to the bottom.',
      'Someone has circled the very top of the curve three times, hard enough to dent the board. Beside it, one word: MORE.',
    ], 2);
  },
};

// ================================================================== containment

const TANK: Record<number, string[]> = {
  2: ['A plaque: SUBJECT 2. ENHANCED. UNSTABLE.', 'The glass is smashed outward. Whatever was in here is long gone.'],
  3: ['A plaque: SUBJECT 3. CONTROL GROUP: NOT ENHANCED. STABLE. RELOCATED.', 'Just murky water now, and nothing in it.'],
  4: ['A plaque: SUBJECT 4. ENHANCED. UNSTABLE.', 'Broken, like the others. Bits of glass crunch under your feet.'],
  5: ['A plaque: SUBJECT 5. ENHANCED. DRAINED.', 'At the bottom, something small and grey is curled up. It was a spirit once. There is no light left in it at all.'],
  8: ['A plaque: SUBJECT 8. CONTROL GROUP: NOT ENHANCED. STABLE. RELOCATED.', 'Murky water. Empty.'],
};

const CONTAINMENT: Record<string, Script> = {
  decorate_w4_lab3(w) {
    const on = f(w, 'w4_lab_cell');
    const at = on ? LAB.pad : LAB.cellStart;
    spawnPush(w, 'cell', on ? 'push_cell_lit' : 'push_cell', at.x, at.y, !on);
    w.pushRule = (id, x, y) => {
      if (id !== 'cell') return 'no';
      if (blockedStatic(w.map, x, y, w.state)) return 'no';
      return x === LAB.pad.x && y === LAB.pad.y ? 'pad' : 'ok';
    };
    w.onPushed = (id, _x, _y, v) => {
      if (v === 'pad') w.run('w4_lab_padded');
    };
    // the last of Subject 7, flickering in its tank
    remnant = null;
    if (!f(w, 'w4_lab_remnant')) {
      remnant = w.sprite('ow_subject', px(13) + 8, py(2) + 2, py(4) + 2).setOrigin(0.5, 1).setFrame(0).setAlpha(0.3);
      scene(w).tweens.add({ targets: remnant, alpha: { from: 0.1, to: 0.45 }, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Stepped' });
    }
    return Promise.resolve();
  },
  async enter_w4_lab3(w) {
    if (f(w, 'q_lab_cont')) return;
    w.set('q_lab_cont');
    await w.wait(300);
    await w.say('Glass tanks line the walls. Some still hum. Some have been smashed open from the inside.');
    await say2(w, 'Tanks. They kept them in tanks.', 'I\'m not touching anything. Okay, I\'ll touch that. That looks important.');
    await w.say('A heavy canister lies in the middle of the floor: a spirit cell. In the corner, behind a wall of junk, a charging pad sits dark.');
    await w.say('(If the cell gets stuck, step out and back in to put it back.)');
  },
  async w4_lab_padded(w) {
    w.set('w4_lab_cell');
    spawnPush(w, 'cell', 'push_cell_lit', LAB.pad.x, LAB.pad.y, false);
    w.sfx('powerup');
    w.flash(0.3);
    w.refresh();
    await w.say('The cell drops onto the pad with a heavy CLUNK, and its little window lights up.');
    await w.camPan(7.5, 2, 600);
    w.sfx('bubbles');
    await w.say('Across the room, with a long hiss, the glass of one of the tanks slides up into its cap.');
    await w.camReturn(600);
    w.save();
  },
  w4_lab_tank2: (w) => tankSay(w, 2),
  w4_lab_tank3: (w) => tankSay(w, 3),
  w4_lab_tank4: (w) => tankSay(w, 4),
  w4_lab_tank5: (w) => tankSay(w, 5),
  w4_lab_tank8: (w) => tankSay(w, 8),
  async w4_lab_tank6(w) {
    if (!f(w, 'w4_lab_cell')) {
      await w.say('A plaque: SUBJECT 6. CONTROL GROUP: NOT ENHANCED. STABLE. RELOCATED.');
      noteControl(w, 6);
      await w.say('There is no spirit in this one. Just a white lab coat, hanging on a hook inside the glass.');
      await w.say('The glass will not budge. A thick cable runs from the base of the tank across the floor, to the dark charging pad.');
      return;
    }
    if (f(w, 'w4_lab_card')) return void (await w.say('The tank stands open. The coat hangs inside it, its pocket empty.'));
    await w.say('Someone hid in here. Climbed inside the glass and pulled it shut behind them.');
    await w.say('In the coat pocket: a keycard marked RESEARCH OFFICE. And a note, scribbled in a hurry.');
    await w.say('"Whoever finds this: don\'t go into the vault. Don\'t open it. Just leave."');
    w.set('w4_lab_card');
    w.sfx('item');
    await w.say('GOT THE OFFICE KEYCARD!');
    await say2(w, 'Sensible advice. I expect we\'ll ignore it.', 'Okay. Noted. Vault: bad. Got it.');
    w.save();
  },
  async w4_lab_tank7(w) {
    await w.say('A plaque: SUBJECT 7. ENHANCED. UNSTABLE.');
    if (f(w, 'w4_lab_remnant')) return void (await w.say('The tank is dark now.'));
    w.set('w4_lab_remnant');
    await w.say('Something faint flickers inside. A little light, barely there.');
    startle(w, '...');
    await w.wait(600);
    if (remnant) {
      scene(w).tweens.killTweensOf(remnant);
      remnant.setAlpha(0.5);
      await w.tw({ targets: remnant, alpha: 0, y: remnant.y - 10, duration: 1600, ease: 'Sine.easeIn' });
      remnant.destroy();
      remnant = null;
    }
    await w.say('It flickers toward you, just once... and then, very gently, it goes out.');
    await say2(w, '...They should never have done this.', '...That was the last bit of it, wasn\'t it.');
  },
};
async function tankSay(w: W, n: number) {
  for (const l of TANK[n]) await w.say(l);
  noteControl(w, n);
}
/** Reading a CONTROL GROUP plaque: noted for the safe. */
function noteControl(w: W, n: number) {
  if (LAB.code.includes(n) && !f(w, 'w4_ctl' + n)) w.set('w4_ctl' + n);
}

// ================================================================== the office

const OFFICE: Record<string, Script> = {
  async enter_w4_lab4(w) {
    if (f(w, 'q_lab_off')) return;
    w.set('q_lab_off');
    await w.wait(300);
    await w.say('A cramped office. Papers everywhere. Letters pinned to the walls, and a safe set into the wall behind the desk.');
    await say2(w, 'The director\'s office, I\'d guess.', 'This is where the boss sat. You can tell. It\'s the only nice chair in the building.');
  },
  async w4_lab_letters(w) {
    await w.say('Letters, pinned up in a neat row. All of them are from the same person, and none of them is signed: only that long, curving mark.');
    await w.say('"Your results are encouraging. But you are being careful. I did not pay for careful."');
    await w.say('"Subject 5 held twice its natural energy for an hour. Good. Now make it hold it for a day."');
    await w.say('"Stop asking what it is for. You will know when it is ready. Begin Subject 9."');
    if (!f(w, 'q_lab_letters')) {
      w.set('q_lab_letters');
      await say2(w, 'That mark again. Like a hook. Whoever it was, they wanted these spirits pushed far past where they should go.', 'Whoever this is, they write like a teacher who really, really hates you.');
    }
  },
  async w4_lab_sketch(w) {
    await inscription(w, 'w4_patron', [
      'A pencil sketch, pinned to the wall. Underneath: OUR PATRON. DRAWN FROM MEMORY. HE WOULD NOT SIT FOR IT.',
      'The artist gave up on the face. Under the hood there is only shading, pressed so hard it has torn the paper.',
    ], 2);
  },
  async w4_lab_diary(w) {
    await w.say('The director\'s journal. Most of the pages are numbers. A few of them are not.');
    await w.say('"DAY 112. The patron came again. He never takes his hood down. He never sits. He asked how much a spirit could hold before it broke."');
    await w.say('"DAY 140. He asked me to find out."');
    await w.say('"DAY 201. Subject 5 is drained. Subject 7 will not stop shaking. I told him we have to stop. He said we were very close."');
    await w.say('"DAY 202. I have set the safe to the numbers of the control group, lowest first. Nobody else here remembers which ones they were."');
    if (!f(w, 'w4_lab_hint')) {
      w.set('w4_lab_hint');
      await w.say('So the safe code is the three subjects in the CONTROL GROUP. Their tanks out in the lab have plaques that say so.');
    }
    await w.say('"DAY 233. Close to WHAT?"');
  },
  async w4_lab_cabinet(w) {
    await w.say('A filing cabinet. On top of the files, a single sheet: EVACUATION ORDER.');
    await w.say('"ALL STAFF TO LEAVE AT ONCE. TAKE NOTHING. DO NOT GO NEAR THE VAULT."');
    await w.say('It is dated the very same night as the last line in the visitor log.');
  },
  async w4_lab_shelf(w) {
    await w.say('Books. THE NATURE OF SPIRITS. LIMITS OF THE SOUL. And a thick binder labelled PATRON\'S REQUESTS.');
    await w.say('The binder is empty. Someone took every single page.');
  },
  async w4_lab_locker3(w) {
    await w.say('A staff rota for the last week. Eleven names a day. On the last day there are no names at all.');
  },
  async w4_lab_safe(w) {
    if (f(w, 'w4_lab_key')) return void (await w.say('The safe stands open, and empty.'));
    if (!f(w, 'q_lab_safe')) {
      w.set('q_lab_safe');
      await w.say('A heavy wall safe with three number dials.');
    }
    if (f(w, 'w4_lab_hint')) {
      const got = LAB.code.filter((n) => f(w, 'w4_ctl' + n));
      await w.say(got.length ? `Control group tanks you have read so far: ${got.join(', ')}. (${got.length} of 3)` : 'The journal said the code is the CONTROL GROUP subjects. Check the plaques on the tanks in the lab.');
    } else await w.say('Maybe there is a note about the code somewhere in this office.');
    if (!(await safeGame(w))) return void (await w.say('You leave the dials where they are.'));
    w.set('w4_lab_key');
    w.refresh();
    await w.say('The safe door swings open. Inside lies a heavy brass key, tagged EXPERIMENT CHAMBER.');
    w.sfx('item');
    await w.say('GOT THE CHAMBER KEY!');
    await w.say('Under the key is a letter. It was never sent.');
    await w.say('"To our patron. I will not begin Subject 9. Find someone else."');
    await w.say('Underneath, in different ink, in that sharp, slanting hand: "BEGIN."');
    await say2(w, 'So it went ahead anyway.', '...He came back and wrote on it. That\'s so much worse.', '...');
    w.save();
  },
};

// ================================================================== the experiment chamber

const CHAMBER: Record<string, Script> = {
  decorate_w4_lab5(w) {
    sub = null;
    if (!f(w, 'w4_lab_broke')) {
      sub = w.sprite('ow_subject', px(LAB.tank.x + 1) + 8, py(LAB.tank.y + 3) + 4, py(LAB.tank.y + 6) + 2).setOrigin(0.5, 1).setFrame(0);
      scene(w).tweens.add({ targets: sub, y: sub.y - 3, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return Promise.resolve();
  },
  async enter_w4_lab5(w) {
    if (f(w, 'q_lab_ch')) return;
    w.set('q_lab_ch');
    const off = bars(w);
    await w.wait(300);
    await w.camPan(LAB.tank.x + 2, LAB.tank.y + 4, 1000, 1.5);
    await w.say('The biggest room yet. Every cable in the building seems to end up here.');
    await w.say('In the middle stands a huge glass tank. Something small is floating inside it.');
    await w.say('A little spirit, no bigger than a cat, with long ears and a metal collar. Asleep. Every cable in the room runs into that collar.');
    w.sfx('hum');
    await w.say('The hum you heard from outside is coming from here.');
    await say2(w, 'Oh, the poor little thing.', 'It\'s tiny. Why\'s it in the BIG tank?', '...');
    await w.camPan(16, 2, 700, 1.5);
    await w.say('At the back of the room, a huge round door: VAULT.');
    await w.camReturn(700);
    await off();
  },
  async w4_lab_bigtank(w) {
    if (f(w, 'w4_lab_broke')) return void (await w.say('The great tank is burst wide open. Its cables hang loose, still sparking now and then.'));
    await w.say('A plaque: SUBJECT 9. ENHANCEMENT IN PROGRESS.');
    await w.say('The little spirit twitches in its sleep. It looks like it is having a bad dream.');
  },
  async w4_lab_mon(w) {
    if (f(w, 'w4_lab_broke')) return void (await w.say('The screens flicker: SEQUENCE FAILED. SEQUENCE FAILED. SEQUENCE FAILED.'));
    await w.say(f(w, 'w4_lab_power') ? 'Monitors. They show one thing: CHAMBER POWER - OFF.' : 'Dead screens.');
  },
  async w4_lab_console(w) {
    if (f(w, 'subject_beaten')) return void (await w.say('The console is dark again. Its last record is still on the screen: it simply stops, mid-sentence.'));
    if (f(w, 'w4_lab_broke')) return w.startBattle('subject');
    await w.say('The main console. One big lever, pushed all the way up: CHAMBER AND VAULT - POWER OFF.');
    await w.say('A label under it: DO NOT RESTART WITHOUT THE DIRECTOR.');
    if (!(await w.confirm('Pull the lever?'))) return void (await w.say('You leave the lever alone. For now.'));
    await SCRIPTS_LAB.w4_lab_breakout(w);
  },
  /** The power comes back to the chamber, and the machines pick up where they left off. */
  async w4_lab_breakout(w) {
    const s = scene(w);
    const off = bars(w);
    w.music(null);
    w.set('w4_lab_lever');
    w.sfx('clank');
    w.refresh();
    await w.wait(300);
    w.sfx('powerup');
    w.shake(1200, 0.004);
    await w.say('The lever slams down. All around the room, machines wake up at once.');
    w.sfx('alarm');
    await w.say('A speaker in the ceiling crackles.');
    await w.say('"ENHANCEMENT SEQUENCE... RESUMING."', 'CONSOLE', { pitch: 300 });
    await w.camPan(LAB.tank.x + 2, LAB.tank.y + 4, 700, 1.8);
    if (sub) {
      s.tweens.killTweensOf(sub);
      sub.setFrame(1);
    }
    startle(w);
    await w.wait(500);
    await w.say('The little spirit opens its eyes. It looks straight at you.');
    // every cable in the room lights up, and it swells
    for (let i = 0; i < 6; i++) {
      w.sfx('zap');
      w.flash(0.25);
      if (sub) sub.setFrame(i % 2 ? 1 : 2);
      await w.wait(160 + i * 40);
    }
    if (sub) sub.setFrame(2);
    w.sfx('charge');
    w.shake(1500, 0.01);
    await w.say('Then every cable in the room blazes white, and it begins to swell. Far, far too big for its own skin.');
    await say2(w, 'Turn it off! TURN IT OFF!', 'Turn it off turn it off turn it OFF-', '!');
    await w.say('You haul on the lever. It will not move.');
    if (sub) sub.setFrame(3);
    w.sfx('wail');
    await w.wait(500);
    w.sfx('glass');
    w.set('w4_lab_broke');
    w.refresh();
    w.flash(0.9);
    w.shake(900, 0.016);
    if (sub) await w.tw({ targets: sub, y: sub.y + 40, scale: 1.3, duration: 400, ease: 'Quad.easeOut' });
    await w.say('It bursts out of the tank in a shower of glass.');
    w.save();
    await off();
    sub?.destroy();
    sub = null;
    await w.startBattle('subject');
  },
  async after_subject(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You come round on the cold floor. SUBJECT 9 is still crackling in the middle of the room, too wild even to notice you.');
      while (!(await w.confirm('Face SUBJECT 9 again?'))) await w.say('It thrashes and sparks. It is not getting any calmer.');
      return w.startBattle('subject');
    }
    w.set('subject_beaten');
    w.save();
    const s = scene(w);
    const off = bars(w);
    const x = px(10);
    const y = py(10);
    const it = w.sprite('ow_subject', x, y, y).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(10, 9, 700, 2);
    for (let i = 0; i < 8; i++) {
      it.setFrame(i % 2 ? 3 : 1);
      w.sfx('zap');
      await w.wait(90 + i * 20);
    }
    w.sfx('powerdown');
    w.flash(0.6);
    it.setFrame(4);
    await w.say('The light pours out of it all at once.');
    await w.say('What is left is the little spirit it used to be, curled on the floor in its collar.');
    await w.say('It looks up at you. It doesn\'t seem angry any more. Just very, very tired.');
    await w.wait(500);
    // its light lifts off it like mist and drifts away
    for (let i = 0; i < 10; i++) {
      const m = w.image('fx_spark', x + (Math.random() - 0.5) * 16, y - 6, 9500).setAlpha(0.9);
      s.tweens.add({ targets: m, y: m.y - 70 - Math.random() * 40, x: m.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 1800, delay: i * 120, onComplete: () => m.destroy() });
    }
    w.sfx('sparkle');
    await w.tw({ targets: it, alpha: 0, duration: 1800 });
    it.destroy();
    await w.say('Its light lifts off it like mist, drifts up... and slips away through the ceiling, out toward the open sky.');
    w.sfx('clank');
    await w.say('The collar clatters to the floor. Empty.');
    await say2(w, 'Rest now, little one. Nobody is going to put you in a tank again.', '...It\'s free now. Right? It\'s okay?', '...');
    // the last record
    await w.camPan(10, 8, 500, 1.8);
    w.sfx('register');
    await w.say('The console chatters and prints out one last record.');
    await w.say('"SUBJECT 9: ENHANCEMENT FAILED. THE SUBJECT CANNOT HOLD THE ENERGY. NO SPIRIT OF THIS SIZE CAN."', 'CONSOLE', { pitch: 300 });
    await w.say('"RECOMMENDATION: A LARGER SUBJECT."', 'CONSOLE', { pitch: 300 });
    await w.say('"NOTE ADDED BY THE PATRON: THE LARGER SUBJECT IS READY. BEGIN AT ONCE. WHEN IT WORKS, I WILL WANT IT DONE TO EVERY"', 'CONSOLE', { pitch: 300 });
    await w.say('The record stops there, mid-sentence.');
    await w.wait(400);
    w.sfx('clank');
    w.shake(300, 0.004);
    await w.camPan(16, 2, 600, 1.6);
    await w.say('Behind you, something clunks. The surge has burnt out the lock on the vault door.');
    await say2(w, 'The vault. The note said not to go in there.', 'The vault. The one the note said NOT to open.');
    await say2(w, '...I\'ll be right behind you.', '...We\'re opening it, aren\'t we.');
    await w.camReturn(600);
    await off();
    w.save();
  },
};

// ================================================================== the vault, and the way out

const VAULT: Record<string, Script> = {
  async enter_w4_lab6(w) {
    if (f(w, 'q_lab_vlt')) return;
    w.set('q_lab_vlt');
    const off = bars(w);
    w.music(null);
    await w.wait(500);
    await w.camPan(8, 5, 1400, 1.3);
    await w.say('In the middle of the room stands a containment chamber three times the size of the one outside.');
    w.sfx('creakmetal');
    await w.say('It has been torn open. From the inside.');
    await w.say('Its bars are bent outward like the petals of a flower. Deep gouges run across the walls and the floor, each one as wide as your hand.');
    startle(w, '...');
    await w.wait(800);
    await w.say('Your creatures don\'t make a sound.');
    await say2(w, 'Whatever was kept in here... it got out.', 'Okay. Okay. Whatever was in here is not in here. That\'s... good? Is that good?');
    await w.camPan(13, 2, 800, 1.6);
    await w.say('In the far wall, a hole has been torn straight through the steel and on up through the earth.');
    await w.camReturn(800);
    await off();
    w.music('w4_lab');
  },
  async w4_lab_vtank(w) {
    await w.say('The plaque on its base has been torn clean off.');
    await w.say('A clipboard still hangs from a hook beside it. The last page reads:');
    await w.say('"DAY 1: CALM. DAY 9: CALM. DAY 30: IT HAS STOPPED EATING. DAY 31: IT WATCHES THE DOOR. DAY 32:"');
    await w.say('There is nothing after that.');
  },
  async w4_lab_vclaw(w) {
    await w.say('Gouges, four of them side by side, dragged right through the steel wall.');
  },
  async w4_lab_tunnel(w) {
    await w.say('A tunnel, torn up through the earth. Cold air comes down it... and the smell of the forest.');
    if (!(await w.confirm('Climb out through the tunnel?'))) return;
    await SCRIPTS_LAB.w4_lab_exit(w);
  },
  /** Out into the night, at the edge of the clearing; and on to the village. */
  async w4_lab_exit(w) {
    w.set('w4_lab_done');
    w.save();
    await w.warp('w4_isl', LAB.out.x, LAB.out.y, 'down');
    await w.wait(400);
    await w.say('You scramble up out of the earth and into the night, at the edge of the clearing.');
    await w.camPan(LAB.burrow.x + 1, LAB.burrow.y + 1, 600, 1.8);
    await w.say('Behind you, the tunnel comes up through the bank like a burrow. Its edges are torn up by enormous claws.');
    await w.camReturn(600);
    if (route4(w.state) === 'B' || who(w) === 'carlo') {
      await comp(w, 'So there\'s a giant something loose on this island. Cool. Cool cool cool.', '...');
      await comp(w, 'Can we please, please go back to the village now?');
    } else {
      await comp(w, 'Whoever was paying for all that... I hope we never meet them.', '...');
      await comp(w, 'Come on. Back to the village. I want to stand somewhere I know.');
    }
    await w.say('All the way across the clearing, your creatures keep looking back at the hill.');
    w.save();
  },
};

export const SCRIPTS_LAB: Record<string, Script> = { ...FOUND, ...RECEPTION, ...LABORATORY, ...CONTAINMENT, ...OFFICE, ...CHAMBER, ...VAULT };
export const W4_LAB_GATES = GATES_LAB;
