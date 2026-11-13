// WISPBOUND multiplayer server: `npm run server`.
//
// One small Node process. It keeps the roguelike rooms (each one is a RoomHost, the very same
// class the game uses for solo runs), and it also serves the built game from dist/, so a
// group can play by opening this server's address in a browser.
//
//   npm run build && npm run server      then open http://<this machine>:8787
//
// Hosted (Render and the like): `npm start`. The host gives the port in PORT, checks
// GET /health, and stops the process with SIGTERM when it redeploys.
//
// Nothing here trusts a player's copy of the game: players send requests, the RoomHost decides.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomHost } from '../src/rogue/shared/host';
import { CODE_CHARS, CODE_LEN, type ClientMsg, type ServerMsg } from '../src/rogue/shared/protocol';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const STARTED = Date.now();
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MAX_ROOMS = 200;
const MAX_MSG = 4096;

interface Room {
  host: RoomHost;
  /** seat -> socket */
  socks: Map<number, WebSocket>;
}
const rooms = new Map<string, Room>();

function newCode(): string {
  for (;;) {
    let c = '';
    for (let i = 0; i < CODE_LEN; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}

function makeRoom(): Room {
  const code = newCode();
  const room: Room = {
    socks: new Map(),
    host: new RoomHost(code, {
      send: (seat, msg) => {
        const ws = room.socks.get(seat);
        if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
      later: (ms, fn) => {
        const id = setTimeout(fn, ms);
        return () => clearTimeout(id);
      },
      closed: () => {
        rooms.delete(code);
        log(`room ${code} closed (${rooms.size} open)`);
      },
    }),
  };
  rooms.set(code, room);
  log(`room ${code} opened (${rooms.size} open)`);
  return room;
}

const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

// ------------------------------------------------------------------ the game's files

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/health' || url.pathname === '/rogue-status') {
    // the host's health check (and a quick look for anyone curious)
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    let players = 0;
    for (const r of rooms.values()) players += r.socks.size;
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size, players, uptime: Math.round((Date.now() - STARTED) / 1000) }));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  let rel: string;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  let file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    return res.end();
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end(fs.existsSync(DIST) ? 'Not found' : 'WISPBOUND multiplayer server is running.\nRun "npm run build" to also serve the game from here.');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// ------------------------------------------------------------------ the rooms

const wss = new WebSocketServer({ server, path: '/rogue-ws', maxPayload: MAX_MSG });

wss.on('connection', (ws) => {
  let room: Room | null = null;
  let seat = -1;
  let alive = true;
  const send = (m: ServerMsg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));

  ws.on('pong', () => (alive = true));
  const beat = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 25000);

  ws.on('message', (raw) => {
    let m: ClientMsg;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') {
      if (room) return;
      if (typeof m.key !== 'string' || m.key.length < 8 || m.key.length > 64) return void send({ t: 'error', code: 'bad', msg: 'BAD REQUEST.' });
      let target: Room | undefined;
      if (m.create) {
        if (rooms.size >= MAX_ROOMS) return void send({ t: 'error', code: 'full', msg: 'THE SERVER IS FULL. TRY AGAIN SOON.' });
        target = makeRoom();
      } else {
        target = rooms.get(String(m.code ?? '').toUpperCase());
        if (!target) return void send({ t: 'error', code: 'no_room', msg: 'NO ROOM WITH THAT CODE.' });
      }
      // a returning player's old socket (a dropped line the server has not noticed yet) is replaced
      const r = target.host.join(m.key, String(m.name ?? ''), Number(m.look) || 0);
      if ('error' in r) {
        if (m.create) rooms.delete(target.host.state.code);
        return void send(r.error);
      }
      const old = target.socks.get(r.seat);
      room = target;
      seat = r.seat;
      target.socks.set(seat, ws);
      if (old && old !== ws) old.close();
      // (join() sent the welcome and the state before this socket was registered: send them again)
      send({ t: 'welcome', seat, code: target.host.state.code });
      send({ t: 'state', state: target.host.state });
      return;
    }
    if (!room) return;
    if (m.t === 'leave') {
      const r = room;
      room = null;
      r.socks.delete(seat);
      r.host.handle(seat, m);
      return;
    }
    room.host.handle(seat, m);
  });

  ws.on('close', () => {
    clearInterval(beat);
    if (!room) return;
    // only if this is still the socket holding the seat (a reconnect may already have replaced it)
    if (room.socks.get(seat) === ws) {
      room.socks.delete(seat);
      room.host.disconnect(seat);
    }
    room = null;
  });
});

server.listen(PORT, HOST, () => {
  log(`WISPBOUND multiplayer server on ${HOST}:${PORT}`);
  log(fs.existsSync(DIST) ? `serving the game from ${DIST}` : 'no dist/ folder yet: run "npm run build" to serve the game from here too');
});

// A redeploy or restart: tell everyone, close the sockets, then exit. (Rooms live in memory,
// so a run in progress does not survive a restart.)
let stopping = false;
function shutdown(sig: string) {
  if (stopping) return;
  stopping = true;
  log(`${sig}: closing ${rooms.size} rooms`);
  for (const ws of wss.clients) ws.close(1012, 'server restarting');
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
