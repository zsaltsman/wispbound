// Targeted multiplayer test: `npx tsx sim/rogue-net-test.ts` (with `npm run server` running).
// Simulated players talk to the real server over real WebSockets.
declare const process: { argv: string[]; exit(n: number): never; env: Record<string, string | undefined> };
import type { ClientMsg, RoomState, ServerMsg } from '../src/rogue/shared/protocol';

const URL_ = process.env.ROGUE_URL ?? 'ws://localhost:8787/rogue-ws';
let failed = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) failed++;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Bot {
  ws!: WebSocket;
  state: RoomState | null = null;
  seat = -1;
  code = '';
  errors: string[] = [];
  steps = 0;
  notes: string[] = [];
  constructor(public name: string, public key = name + '-key-' + Math.random().toString(36).slice(2)) {}
  open(opts: { create?: boolean; code?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL_);
      this.ws.onopen = () => this.send({ t: 'hello', key: this.key, name: this.name, look: 1, ...opts });
      this.ws.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as ServerMsg;
        if (m.t === 'welcome') {
          this.seat = m.seat;
          this.code = m.code;
          resolve();
        } else if (m.t === 'state') this.state = m.state;
        else if (m.t === 'steps') this.steps += m.steps.length;
        else if (m.t === 'error') {
          this.errors.push(m.code);
          reject(new Error(m.code));
        } else if (m.t === 'note') this.notes.push(m.text);
      };
      this.ws.onerror = () => reject(new Error('socket'));
    });
  }
  send(m: ClientMsg) {
    this.ws.send(JSON.stringify(m));
  }
  get me() {
    return this.state!.players.find((p) => p.seat === this.seat)!;
  }
}

async function main() {
  const a = new Bot('ALPHA');
  await a.open({ create: true });
  check(a.code.length === 4, `room created with a 4-letter code (${a.code})`);
  await wait(60);
  check(a.me.host, 'the creator is the host');

  // joining
  const b = new Bot('BRAVO');
  await b.open({ code: a.code.toLowerCase() });
  const c = new Bot('ALPHA'); // same name on purpose
  await c.open({ code: a.code });
  const d = new Bot('DELTA');
  await d.open({ code: a.code });
  await wait(80);
  check(a.state!.players.length === 4 && d.state!.players.length === 4, 'four players see four seats');
  check(new Set(a.state!.players.map((p) => p.name)).size === 4, `duplicate names are made unique (${a.state!.players.map((p) => p.name).join(', ')})`);
  const e = new Bot('ECHO');
  await e.open({ code: a.code }).catch(() => {});
  check(e.errors[0] === 'full', 'a fifth player is refused: room full');
  const f = new Bot('FOX');
  await f.open({ code: 'ZZZZ' }).catch(() => {});
  check(f.errors[0] === 'no_room', 'a wrong code is refused: no such room');

  // lobby rules
  b.send({ t: 'difficulty', difficulty: 'hard' });
  await wait(60);
  check(a.state!.difficulty === 'normal', 'only the host can change the difficulty');
  a.send({ t: 'difficulty', difficulty: 'hard' });
  await wait(60);
  check(d.state!.difficulty === 'hard', 'the host sets HARD and everyone sees it');
  a.send({ t: 'start' });
  await wait(60);
  check(a.state!.phase === 'lobby' && a.errors.includes('not_ready'), 'the host cannot start until everyone is ready');
  for (const x of [b, c, d]) x.send({ t: 'ready', ready: true });
  await wait(60);
  check(a.state!.players.filter((p) => p.ready).length === 3, 'ready marks are shared');
  a.send({ t: 'difficulty', difficulty: 'normal' });
  await wait(60);
  check(a.state!.players.every((p) => !p.ready), 'changing the difficulty clears ready marks');
  for (const x of [b, c, d]) x.send({ t: 'ready', ready: true });
  await wait(60);
  a.send({ t: 'start' });
  await wait(80);
  check(d.state!.phase === 'draft' && d.state!.draftRound === 1, 'the run starts: everyone is in the first draft');

  // the draft
  const offers = [a, b, c, d].map((x) => x.me.offers);
  check(offers.every((o) => o.length === 3 && new Set(o).size === 3), `each player is dealt three different spirits (${offers.map((o) => o.join('/')).join('  ')})`);
  a.send({ t: 'draft_pick', id: b.me.offers.find((o) => !a.me.offers.includes(o)) ?? 'nope' });
  await wait(50);
  check(a.me.pick === null, "a player cannot pick from another player's offers");
  a.send({ t: 'draft_pick', id: a.me.offers[0] });
  await wait(40);
  a.send({ t: 'draft_pick', id: a.me.offers[2] });
  await wait(40);
  check(b.state!.players[0].pick === a.me.offers[2], 'a pick can be changed, and the others see it');
  a.send({ t: 'draft_lock', locked: true });
  await wait(40);
  a.send({ t: 'draft_pick', id: a.me.offers[0] });
  await wait(40);
  check(a.me.pick === a.me.offers[2], 'a confirmed pick cannot be changed without unlocking');

  // a late joiner is turned away once the run has begun
  const g = new Bot('GOLF');
  await g.open({ code: a.code }).catch(() => {});
  check(g.errors[0] === 'in_progress', 'nobody new can join a run in progress');

  // reconnect mid-run
  const bPick = b.me.offers[1];
  b.send({ t: 'draft_pick', id: bPick });
  await wait(40);
  b.ws.close();
  await wait(120);
  check(a.state!.players.find((p) => p.seat === b.seat)!.connected === false, 'a dropped player is shown as disconnected, seat held');
  const b2 = new Bot('BRAVO', b.key);
  await b2.open({ code: a.code });
  await wait(80);
  check(b2.seat === b.seat && b2.me.connected && b2.me.pick === bPick, 'reconnecting with the same key returns the same seat and pick');

  // host drops: the host role moves on
  a.ws.close();
  await wait(120);
  check(b2.state!.players.some((p) => p.host && p.connected), 'when the host drops, another connected player becomes host');
  const a2 = new Bot('ALPHA', a.key);
  await a2.open({ code: a.code });
  await wait(60);

  for (const x of [b2, c, d]) {
    x.send({ t: 'draft_pick', id: x.me.offers[0] });
    await wait(20);
    x.send({ t: 'draft_lock', locked: true });
  }
  await wait(120);
  check(d.state!.phase === 'dungeon', 'when everyone confirms, the draft ends and the party is in the dungeon');
  check(d.state!.players.every((p) => p.spirits.length === 1), 'every player now owns exactly one spirit');
  check(d.state!.players[0].spirits[0].id === a.me.offers[2], "player one's spirit is the one they confirmed");

  // ---- the dungeon: same floor for everyone, walking is relayed, doors move the whole party
  const all = [a2, b2, c, d];
  const f0 = a2.state!.floor!;
  check(all.every((x) => JSON.stringify(x.state!.floor!.rooms.map((r) => [r.gx, r.gy, r.kind])) === JSON.stringify(f0.rooms.map((r) => [r.gx, r.gy, r.kind]))), `all four players have the same floor layout (${f0.rooms.length} rooms)`);
  const start = f0.rooms[f0.cur];
  const way = (Object.entries(start.doors) as [string, number][]).find(([, id]) => f0.rooms[id].kind === 'combat')!;
  c.send({ t: 'door', dir: way[0] as 'n' });
  await wait(120);
  check(all.every((x) => x.state!.floor!.cur === way[1]), 'one player walks through a door and the whole party moves');
  const room = d.state!.floor!.rooms[d.state!.floor!.cur];
  check(room.foes.length >= 3, `a four-player room holds more enemies (${room.foes.join(', ')})`);
  b2.send({ t: 'door', dir: 'n' });
  b2.send({ t: 'door', dir: 's' });
  b2.send({ t: 'door', dir: 'e' });
  b2.send({ t: 'door', dir: 'w' });
  await wait(80);
  check(d.state!.floor!.cur === way[1], 'the doors stay barred while enemies remain');

  // ---- a fight: everyone submits a move, the round resolves once, everyone gets the same steps
  d.send({ t: 'engage' });
  await wait(150);
  check(all.every((x) => x.state!.phase === 'battle'), 'walking up to the enemies starts the fight for all four');
  const enemies0 = a2.state!.battle!.snap.enemies.length;
  let rounds = 0;
  while (a2.state!.phase === 'battle' && rounds < 60) {
    const snap = a2.state!.battle!.snap;
    const round = snap.round;
    const target = snap.enemies.find((e) => !e.dead)!.uid;
    const standing = snap.sides.filter((s) => !s.down).map((s) => s.seat);
    if (rounds === 0) {
      // three of four have chosen: nothing resolves yet, and the others can see who is still thinking
      for (const x of all.slice(0, 3)) x.send({ t: 'act', choice: { a: 0, target } });
      await wait(100);
      check(d.state!.battle!.snap.round === round && d.state!.battle!.chosen.length === 3, 'the round waits until the last player has chosen, and shows who has');
      // a player cannot act twice, or act for someone else
      a2.send({ t: 'act', choice: { a: 0, target } });
      await wait(60);
      check(d.state!.battle!.snap.round === round, 'choosing twice does not count as two players');
      d.send({ t: 'act', choice: { a: 0, target } });
    } else {
      for (const x of all) if (standing.includes(x.seat)) x.send({ t: 'act', choice: { a: 0, target } });
    }
    await wait(120);
    rounds++;
  }
  check(a2.state!.phase !== 'battle', `the fight ends (${rounds} rounds against ${enemies0} enemies)`);
  check(new Set(all.map((x) => x.steps)).size === 1 && a2.steps > 0, `every player received the same ${a2.steps} battle steps`);
  if (a2.state!.phase === 'reward') {
    check(all.every((x) => x.me.reward && x.me.reward.offers.length === 3), 'each player is offered three skills of their own');
    // one takes, one skips: the others are still choosing and the run waits for them
    const r = a2.me.reward!;
    a2.send({ t: 'reward_take', skill: r.offers[0], spirit: 0 });
    b2.send({ t: 'reward_skip' });
    await wait(100);
    check(c.state!.phase === 'reward' && c.me.reward !== null, "one player's choice does not use up another's");
    check(d.state!.players[a2.seat].spirits[0].skills.length === 1, 'a taken skill is attached to the chosen spirit');
    // nobody can take a skill they were not offered
    const before = c.me.spirits[0].skills.length;
    c.send({ t: 'reward_take', skill: 'laststand_not_offered', spirit: 0 });
    await wait(60);
    check(c.me.spirits[0].skills.length === before && c.me.reward !== null, 'a skill that was not offered cannot be taken');
    c.send({ t: 'reward_take', skill: c.me.reward!.offers[1], spirit: 0 });
    d.send({ t: 'reward_take', skill: d.me.reward!.offers[2], spirit: 0 });
    await wait(120);
    check(all.every((x) => x.state!.phase === 'dungeon'), 'once everyone has chosen, the run carries on');
    check(d.state!.floor!.rooms[d.state!.floor!.cur].cleared, 'the room is cleared and its doors open');
  } else check(a2.state!.phase === 'summary', 'a lost fight ends the run with a summary');

  for (const x of [a2, b2, c, d]) x.ws.close();
  await wait(100);
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
