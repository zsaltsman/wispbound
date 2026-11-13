import { txt, box, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import { DIFFICULTY, FLOOR_NAMES } from '../shared/config';
import { foeDef } from '../shared/enemies';
import { RogueScene, LOOKS, type Key } from './common';

// ROGUELIKE: how the run ended. The result first, and large; then the few numbers worth
// knowing; then who brought what.

const bossName = (id: string) => (id === 'reaper' ? 'THE GRIM REAPER' : foeDef(id)?.name ?? id.toUpperCase());
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export class SummaryScene extends RogueScene {
  private drawn = false;

  constructor() {
    super('rogue-summary');
  }

  init() {
    this.drawn = false;
  }

  create() {
    this.setup();
    if (this.follow()) return;
    this.refresh();
  }

  protected refresh() {
    const st = net.state;
    const sum = st?.summary;
    if (!st || !sum || this.drawn) return;
    this.drawn = true;
    const g = this.add.graphics();
    g.fillStyle(C.black, 1).fillRect(0, 0, W, H);
    sound.playSong(sum.won ? 'fin_celebrate' : 'grief');
    sound.play(sum.won ? 'victory' : 'defeat');
    // ---- the result
    const head = txt(this, W / 2, 14, sum.won ? 'THE REAPER HAS FALLEN' : 'THE RUN ENDS HERE', { outline: true, origin: [0.5, 0], scale: 2 });
    head.setAlpha(0);
    this.tweens.add({ targets: head, alpha: 1, y: 18, duration: 500, ease: 'Quad.easeOut' });
    const where = sum.won ? 'ALL THREE FLOORS CLEARED' : `FELL ON FLOOR ${sum.floor + 1}, ${FLOOR_NAMES[sum.floor]}${sum.fellTo ? `, TO ${sum.fellTo}` : ''}`;
    txt(this, W / 2, 44, where, { color: C.light, origin: [0.5, 0], maxW: W - 30, align: 'center' });
    // ---- three numbers
    const cells: [string, string][] = [
      ['DIFFICULTY', DIFFICULTY[st.difficulty].name],
      ['ROOMS CLEARED', String(sum.rooms)],
      ['TIME', clock(sum.seconds)],
    ];
    cells.forEach(([k, v], i) => {
      const x = 28 + i * 118;
      box(g, x, 66, 108, 28, 'dark');
      txt(this, x + 54, 71, k, { color: C.mid, origin: [0.5, 0] });
      txt(this, x + 54, 81, v, { origin: [0.5, 0] });
    });
    const bosses = sum.bosses.length ? sum.bosses.map(bossName).join('  +  ') : 'NONE';
    txt(this, W / 2, 100, 'BOSSES DEFEATED', { color: C.mid, origin: [0.5, 0] });
    txt(this, W / 2, 110, bosses, { color: C.white, origin: [0.5, 0], maxW: W - 30, align: 'center' });
    // ---- the party: who they were, what they brought, what they did
    const n = st.players.length;
    const rh = n > 2 ? 34 : 44;
    // a small party sits in the middle of the space left, not pinned under the bosses
    const y0 = Math.max(132, Math.round((132 + H - 22 - n * (rh + 3)) / 2));
    const top = Math.max(1, ...st.players.map((p) => p.tally.dmg));
    st.players.forEach((p, i) => {
      const y = y0 + i * (rh + 3);
      box(g, 14, y, W - 28, rh, 'plain');
      this.add.sprite(28, y + rh - 4, LOOKS[p.look], 0).setOrigin(0.5, 1);
      txt(this, 40, y + 4, p.name, { color: p.seat === net.seat ? C.white : C.light });
      txt(this, 40, y + 14, `${p.tally.skills} SKILL${p.tally.skills === 1 ? '' : 'S'}`, { color: C.mid });
      p.spirits.forEach((s, k) => {
        const x = 118 + k * 46;
        // portraits only: three names at 46px apart ran into each other
        if (this.textures.exists('cr_' + s.id)) this.add.image(x, y + rh - 3, 'cr_' + s.id, 0).setOrigin(0.5, 1).setScale(rh > 40 ? 0.7 : 0.5).setAlpha(s.hp > 0 ? 1 : 0.4);
      });
      // contribution: damage as a bar against the party's best, with healing and knock-downs beside it
      const bx = 262;
      txt(this, bx, y + 4, 'DAMAGE', { color: C.mid });
      txt(this, W - 22, y + 4, String(p.tally.dmg), { origin: [1, 0] });
      g.fillStyle(C.dark, 1).fillRect(bx, y + 14, 110, 3);
      g.fillStyle(C.white, 1).fillRect(bx, y + 14, Math.round((110 * p.tally.dmg) / top), 3);
      txt(this, bx, y + rh - 12, `HEALED ${p.tally.healed}   DOWNED ${p.tally.downs}`, { color: C.dark });
    });
    txt(this, W / 2, H - 13, 'SPACE: BACK TO THE ROGUELIKE MENU', { color: C.mid, origin: [0.5, 0] });
  }

  protected key(k: Key) {
    if (k !== 'ok' && k !== 'back') return;
    sound.play('select');
    sound.stopMusic();
    net.leave();
    net.saveProfile({ lastCode: '' });
    this.go('rogue-lobby');
  }
}
