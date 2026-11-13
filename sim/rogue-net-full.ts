// A whole online run with 4 simulated players, over real WebSockets, from CREATE ROOM to the
// summary: `npx tsx sim/rogue-net-full.ts` (local server) or, against the live one,
// `ROGUE_URL=wss://wispbound.onrender.com/rogue-ws npx tsx sim/rogue-net-full.ts`.
// It checks that every player sees the same run: movement, fights (enemies and health), floors,
// rewards and the ending, and that a player who drops mid-run gets their seat back.
declare const process: { argv: string[]; exit(n: number): never; env: Record<string, string | undefined> };
import type { ClientMsg, RoomState, ServerMsg } from '../src/rogue/shared/protocol';
import { DIRS } from '../src/rogue/shared/dungeon';
import { canHold } from '../src/rogue/shared/skills';
import { SWAP } from '../src/rogue/shared/coop';
import { spiritDef } from '../src/rogue/shared/roster';

const URL_ = process.env.ROGUE_URL ?? 'ws://localhost:8787/rogue-ws';
const DIFF = (process.env.ROGUE_DIFF ?? 'easy') as 'easy' | 'normal' | 'hard';
const LIMIT_MIN = Number(process.env.ROGUE_MINUTES ?? 20);
let failed = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) failed++;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const clock = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

class Bot {
  ws!: WebSocket;
  state: RoomState | null = null;
  seat = -1;
  code = '';
  errors: string[] = [];
  steps = new Map<number, number>();
  /** Last position seen for each other seat, from 'pos' messages. */
  seen = new Map<number, string>();
  lastMsg = Date.now();
  constructor(public name: string, public key = name + '-key-' + Math.random().toString(36).slice(2)) {}
  open(opts: { create?: boolean; code?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL_);
      this.ws.onopen = () => this.send({ t: 'hello', key: this.key, name: this.name, look: 1, ...opts });
      this.ws.onmessage = (e) => {
        this.lastMsg = Date.now();
        const m = JSON.parse(String(e.data)) as ServerMsg;
        if (m.t === 'welcome') {
          this.seat = m.seat;
          this.code = m.code;
          resolve();
        } else if (m.t === 'state') this.state = m.state;
        else if (m.t === 'steps') this.steps.set(m.battle, (this.steps.get(m.battle) ?? 0) + m.steps.length);
        else if (m.t === 'pos') this.seen.set(m.seat, `${m.x},${m.y}`);
        else if (m.t === 'error') {
          this.errors.push(m.code);
          reject(new Error(m.code));
        }
      };
      this.ws.onerror = () => reject(new Error('socket'));
    });
  }
  send(m: ClientMsg) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }
  get me() {
    return this.state!.players.find((p) => p.seat === this.seat)!;
  }
}

/** Wait until nobody has heard anything for `quiet` ms (the server has finished reacting). */
async function settle(bots: Bot[], quiet = 350, max = 8000) {
  const end = Date.now() + max;
  await wait(quiet);
  while (Date.now() < end && bots.some((b) => Date.now() - b.lastMsg < quiet)) await wait(80);
}

/** What every player must agree on. */
function digest(s: RoomState) {
  return JSON.stringify({
    phase: s.phase,
    floor: s.floor && { i: s.floor.index, cur: s.floor.cur, cleared: s.floor.rooms.map((r) => +r.cleared).join('') },
    foes: s.battle?.snap.enemies.map((e) => `${e.id}:${e.hp}`),
    sides: s.battle?.snap.sides.map((x) => x.members.map((m) => m.hp).join('/')),
    players: s.players.map((p) => ({ seat: p.seat, hp: p.spirits.map((sp) => +sp.hp.toFixed(3)), skills: p.spirits.map((sp) => sp.skills.length), wisps: p.wisps, conn: p.connected })),
  });
}

async function main() {
  console.log(`server ${URL_}   difficulty ${DIFF}`);
  // ---- room for four
  const bots = [new Bot('ALPHA'), new Bot('BRAVO'), new Bot('CHARLIE'), new Bot('DELTA')];
  await bots[0].open({ create: true });
  check(/^[A-Z]{4}$/.test(bots[0].code), `CREATE ROOM gives a room code (${bots[0].code})`);
  for (const b of bots.slice(1)) await b.open({ code: bots[0].code.toLowerCase() });
  await settle(bots);
  check(bots.every((b) => b.state?.players.length === 4), 'JOIN ROOM with that code seats all 4 players');
  check(new Set(bots.map((b) => b.seat)).size === 4, 'each player has a seat of their own');
  const fifth = new Bot('ECHO');
  await fifth.open({ code: bots[0].code }).catch(() => {});
  check(fifth.errors[0] === 'full', 'a fifth player is turned away');
  const lost = new Bot('FOXTROT');
  await lost.open({ code: 'ZZZZ' }).catch(() => {});
  check(lost.errors[0] === 'no_room', 'a wrong code is refused with a clear reason');

  // ---- start
  // (a new difficulty asks everyone to confirm again, so ready up only once it has landed)
  bots[0].send({ t: 'difficulty', difficulty: DIFF });
  await settle(bots);
  for (const b of bots.slice(1)) b.send({ t: 'ready', ready: true });
  await settle(bots);
  bots[0].send({ t: 'start' });
  await settle(bots);
  check(bots.every((b) => b.state?.phase === 'draft'), 'the run starts for everyone');

  const floors = new Set<number>();
  const fightsSeen = new Set<number>();
  let rewardsTaken = 0;
  let rewardsOffered = 0;
  let movesChecked = 0;
  let mismatches = 0;
  let didDrop = false;
  let rounds = 0;
  const visited = new Set<string>();
  const end = Date.now() + LIMIT_MIN * 60_000;
  let lastPhase = '';

  while (Date.now() < end) {
    await settle(bots);
    const st = bots[0].state!;
    // everyone agrees on the run
    const d0 = digest(st);
    const off = bots.filter((b) => b.state && digest(b.state) !== d0);
    if (off.length) {
      await settle(bots, 900, 10_000);
      if (bots.some((b) => digest(b.state!) !== digest(bots[0].state!))) {
        mismatches++;
        if (mismatches < 4) console.log(`  [${clock()}] players disagree in ${st.phase}`);
      }
    }
    if (st.phase !== lastPhase) {
      console.log(`  [${clock()}] ${st.phase}${st.floor ? ' floor ' + (st.floor.index + 1) : ''}`);
      lastPhase = st.phase;
    }
    if (st.phase === 'summary') break;
    if (st.phase === 'lobby') {
      console.log('  still in the lobby: ' + (bots[0].errors[bots[0].errors.length - 1] ?? ''));
      break;
    }

    if (st.phase === 'draft') {
      for (const b of bots) {
        const me = b.me;
        if (me.locked) continue;
        b.send({ t: 'draft_pick', id: me.offers[b.seat % me.offers.length] });
        b.send({ t: 'draft_lock', locked: true });
      }
    } else if (st.phase === 'reward') {
      for (const b of bots) {
        const r = b.me.reward;
        if (!r) continue;
        rewardsOffered++;
        let done = false;
        for (const sk of r.offers) {
          const i = b.me.spirits.findIndex((s) => canHold(s, sk) && s.skills.length < 4);
          if (i >= 0) {
            b.send({ t: 'reward_take', skill: sk, spirit: i });
            rewardsTaken++;
            done = true;
            break;
          }
        }
        if (!done) b.send({ t: 'reward_skip' });
      }
    } else if (st.phase === 'battle') {
      const bt = st.battle!;
      fightsSeen.add(bt.id);
      rounds++;
      // finish the weakest enemy first
      const foe = [...bt.snap.enemies].filter((e) => !e.dead).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      for (const b of bots) {
        const side = bt.snap.sides.find((x) => x.seat === b.seat);
        if (!side || side.down || bt.chosen.includes(b.seat)) continue;
        // a basic attack on the first enemy still standing (or a swap if the active spirit is out)
        const act = side.members[side.active];
        if (act && act.hp <= 0) {
          const pick = side.members.findIndex((m) => m.hp > 0);
          b.send({ t: 'act', choice: { a: SWAP, target: foe?.uid ?? 0, pick } });
        } else {
          // like the game's own auto-play: signature when ready, then a special, a guard when low, else the basic move
          const ab = spiritDef(act.id).abilities;
          const ready = (i: number) => (act.cd[i] ?? 0) <= 0 && act.en >= ab[i].cost;
          const of = (k: string, extra = 0) => ab.findIndex((x, i) => x.kind === k && ready(i) && act.en >= x.cost + extra);
          let a = 0;
          if (act.hp < act.maxHp * 0.3 && of('defense') >= 0) a = of('defense');
          else if (of('signature') >= 0) a = of('signature');
          else if (of('special', 2) >= 0) a = of('special', 2);
          b.send({ t: 'act', choice: { a, target: foe?.uid ?? 0 } });
        }
      }
    } else if (st.phase === 'dungeon') {
      const f = st.floor!;
      floors.add(f.index);
      const room = f.rooms[f.cur];
      visited.add(f.index + ':' + room.id);

      // ---- movement: one player takes a step, and the other three see it
      if (movesChecked < 6) {
        const mover = bots[(movesChecked % 3) + 1];
        const me = mover.me;
        for (const [dx, dy, dir] of [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']] as const) {
          mover.send({ t: 'pos', x: me.x + dx, y: me.y + dy, dir });
          await settle(bots, 250);
          const want = `${me.x + dx},${me.y + dy}`;
          const others = bots.filter((b) => b !== mover);
          if (others.every((b) => b.seen.get(mover.seat) === want)) {
            movesChecked++;
            break;
          }
        }
      }

      // ---- a dropped player, once, in the middle of floor 1
      if (!didDrop && f.index === 0 && fightsSeen.size >= 1) {
        didDrop = true;
        const c = bots[2];
        const keep = JSON.stringify(c.me.spirits.map((s) => s.id));
        c.ws.close();
        let seenGone = false;
        for (let i = 0; i < 40 && !seenGone; i++) {
          await wait(500);
          seenGone = bots[0].state!.players.find((p) => p.seat === c.seat)?.connected === false;
        }
        check(seenGone, `a player who drops mid-run is shown as disconnected, seat held (${clock()})`);
        const back = new Bot('CHARLIE', c.key);
        await back.open({ code: bots[0].code });
        await settle(bots);
        check(back.seat === c.seat && JSON.stringify(back.me.spirits.map((s) => s.id)) === keep && back.me.connected, 'they reconnect to the same seat with the same spirits');
        bots[2] = back;
        await settle(bots);
        continue;
      }

      if (!room.cleared && (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss')) {
        bots[0].send({ t: 'engage' });
        continue;
      }
      if (room.kind === 'treasure' && !room.used) {
        bots[0].send({ t: 'use', what: 'chest' });
        continue;
      }
      if (room.kind === 'rest' && !room.used) {
        bots[0].send({ t: 'use', what: 'fire' });
        continue;
      }
      if (room.kind === 'shop' && !visited.has('shop' + f.index)) {
        visited.add('shop' + f.index);
        for (const b of bots) {
          if (b.me.spirits.some((s) => s.hp <= 0)) b.send({ t: 'buy', item: 'revive' });
          if (b.me.spirits.some((s) => s.hp > 0 && s.hp < 0.6)) b.send({ t: 'buy', item: 'tonic' });
        }
        continue;
      }
      // ---- where next: the nearest room not yet visited (the boss last of all)
      const dist = new Map<number, { first: (typeof DIRS)[number] | null }>([[room.id, { first: null }]]);
      const q = [room.id];
      let goal: (typeof DIRS)[number] | null = null;
      let bossWay: (typeof DIRS)[number] | null = null;
      while (q.length) {
        const id = q.shift()!;
        const r = f.rooms[id];
        const here = dist.get(id)!;
        if (id !== room.id && !visited.has(f.index + ':' + id) && r.kind !== 'puzzle') {
          if (r.kind === 'boss') bossWay = bossWay ?? here.first;
          else goal = goal ?? here.first;
        }
        if (id !== room.id && !r.cleared && (r.kind === 'combat' || r.kind === 'elite' || r.kind === 'boss')) continue;
        for (const dir of DIRS) {
          const to = r.doors[dir];
          if (to === undefined || dist.has(to)) continue;
          dist.set(to, { first: here.first ?? dir });
          q.push(to);
        }
      }
      const way = goal ?? bossWay;
      if (!way) {
        console.log('  no way on from room ' + room.id + ' (' + room.kind + ')');
        break;
      }
      bots[0].send({ t: 'door', dir: way });
    }
  }

  await settle(bots, 600);
  const st = bots[0].state!;
  const sum = st.summary;
  console.log(`  [${clock()}] ${sum ? (sum.won ? 'WON' : `fell on floor ${sum.floor + 1} to ${sum.fellTo}`) : 'no summary'}: ${fightsSeen.size} fights, ${rounds} rounds`);
  check(st.phase === 'summary', 'the run reaches its ending screen');
  check(bots.every((b) => b.state?.phase === 'summary' && JSON.stringify(b.state.summary) === JSON.stringify(sum)), 'all 4 players see the same ending');
  check(mismatches === 0, 'all 4 players saw the same rooms, enemies, health, wisps and skills throughout');
  check(movesChecked >= 3, `a step by one player is seen by the other three (${movesChecked} steps)`);
  check(fightsSeen.size >= 3, `fights are played together (${fightsSeen.size})`);
  const stepCounts = [...fightsSeen].map((id) => new Set(bots.filter((b) => b.name !== 'CHARLIE').map((b) => b.steps.get(id) ?? 0)).size === 1);
  check(stepCounts.every(Boolean), 'every player received every battle step of every fight');
  check(rewardsOffered >= 4 && rewardsTaken >= 4, `rewards are offered to each player and taken (${rewardsTaken}/${rewardsOffered})`);
  check(floors.size >= 2, `the party goes down more than one floor (${[...floors].map((i) => i + 1).join(', ')})`);
  check(didDrop, 'the drop-and-rejoin was exercised');

  for (const b of bots) b.send({ t: 'leave' });
  await wait(300);
  for (const b of bots) b.ws.close();
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.log('FAIL  ' + (e?.stack ?? e));
  process.exit(1);
});
