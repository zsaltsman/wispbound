import { RoomHost } from '../shared/host';
import { RECONNECT_GRACE } from '../shared/config';
import { cleanName, type ClientMsg, type RoomState, type ServerMsg } from '../shared/protocol';
import type { BattleSnap, Step } from '../shared/coop';

/** One fight, as the host tells it: where it stood when we started listening, and every step since. */
export interface BattleFeed {
  id: number;
  base: BattleSnap;
  /** Index (in the host's count) of the next step we expect. */
  next: number;
  steps: Step[];
}

// ROGUELIKE: the game's side of a room. Solo runs talk to a RoomHost living in this page;
// online runs talk to the same RoomHost living on the multiplayer server. The scenes never
// know the difference: they read `net.state` and call `net.send`.

const PROFILE_KEY = 'wispbound-rogue-profile';

export interface Profile {
  /** A private id for this browser: it is what lets a dropped player take their seat back. */
  key: string;
  name: string;
  look: number;
  /** A multiplayer server typed in by hand (empty = the one this page came from). */
  server: string;
  /** The last online room, for rejoining after a reload. */
  lastCode: string;
}

const SEAT_KEY = 'wispbound-rogue-seat';

function loadProfile(): Profile {
  const fresh: Profile = { key: '', name: 'WISP', look: 0, server: '', lastCode: '' };
  let p = fresh;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) p = { ...fresh, ...JSON.parse(raw), key: '', lastCode: '' };
  } catch {
    /* storage unavailable */
  }
  // The seat key lives with the tab, not the browser: a reload keeps your seat, while a second
  // tab (two players on one computer) is a second player.
  try {
    const raw = sessionStorage.getItem(SEAT_KEY);
    if (raw) Object.assign(p, JSON.parse(raw));
  } catch {
    /* ignore */
  }
  if (!p.key) p.key = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return p;
}

/**
 * Any way of writing a server address ("wss://x/rogue-ws", "https://x", "x.onrender.com",
 * "192.168.1.5:8787") as the socket address. A local or numbered address is plain ws://,
 * anything else (a hosted server) is secure.
 */
export function toSocketUrl(addr: string): string {
  const a = addr.trim();
  if (/^wss?:\/\//i.test(a)) return /\/rogue-ws\/?$/i.test(a) ? a : a.replace(/\/+$/, '') + '/rogue-ws';
  const host = a.replace(/^https?:\/\//i, '').replace(/\/+$/, '').replace(/\/rogue-ws$/i, '');
  const secure = /^https:/i.test(a) || (!/^http:/i.test(a) && !/^(localhost|127\.|192\.168\.|10\.)/.test(host) && !/:\d+$/.test(host));
  return `${secure ? 'wss' : 'ws'}://${host}/rogue-ws`;
}

export type NetStatus = 'idle' | 'connecting' | 'solo' | 'online' | 'reconnecting' | 'lost';
type Listener = (ev: { t: 'state' } | { t: 'status' } | { t: 'steps' } | { t: 'note'; text: string } | { t: 'error'; msg: string; code: string } | { t: 'pos'; seat: number; x: number; y: number; dir: 'n' | 'e' | 's' | 'w' } | { t: 'fx'; kind: string; seat: number; text: string }) => void;

class RogueNet {
  profile = loadProfile();
  constructor() {
    this.saveProfile({});
  }
  state: RoomState | null = null;
  seat = -1;
  status: NetStatus = 'idle';
  /** Why the last connection attempt failed (shown in the lobby). */
  lastError = '';
  /** The fight in progress (kept here, not in a scene, so no step is ever missed between screens). */
  feed: BattleFeed | null = null;
  private listeners = new Set<Listener>();
  private ws: WebSocket | null = null;
  private local: RoomHost | null = null;
  private timers = new Set<number>();
  private code = '';
  private retryUntil = 0;
  private pingTimer = 0;

  /** The seat this browser holds, from the latest state. */
  get me() {
    return this.state?.players.find((p) => p.seat === this.seat) ?? null;
  }

  saveProfile(patch: Partial<Profile>) {
    Object.assign(this.profile, patch);
    this.profile.name = cleanName(this.profile.name);
    try {
      const { key, lastCode, ...rest } = this.profile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(rest));
      sessionStorage.setItem(SEAT_KEY, JSON.stringify({ key, lastCode }));
    } catch {
      /* ignore */
    }
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(ev: Parameters<Listener>[0]) {
    for (const l of [...this.listeners]) l(ev);
  }
  private setStatus(s: NetStatus) {
    this.status = s;
    this.emit({ t: 'status' });
  }

  // ------------------------------------------------------------------ solo

  /** A run by yourself: the host runs right here, and nothing leaves this page. */
  startSolo() {
    this.leave();
    const host = new RoomHost(
      'SOLO',
      {
        // (copied, as the network would, so the scenes can never reach into the host's state)
        send: (_seat, msg) => this.receive(JSON.parse(JSON.stringify(msg))),
        later: (ms, fn) => {
          const id = window.setTimeout(() => {
            this.timers.delete(id);
            fn();
          }, ms);
          this.timers.add(id);
          return () => {
            window.clearTimeout(id);
            this.timers.delete(id);
          };
        },
        closed: () => {},
      },
      true
    );
    this.local = host;
    this.setStatus('solo');
    host.join(this.profile.key, this.profile.name, this.profile.look);
  }

  // ------------------------------------------------------------------ online

  /**
   * Where the multiplayer server is, in order: the address typed into the lobby, the one this
   * build was made for (VITE_ROGUE_SERVER, e.g. "https://wispbound.onrender.com"), or the
   * server this page came from.
   */
  serverUrl(): string {
    const typed = this.profile.server.trim();
    if (typed) return toSocketUrl(typed);
    const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ROGUE_SERVER ?? '').trim();
    if (env) return toSocketUrl(env);
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/rogue-ws`;
  }

  /** Create a room (no code) or join one. Resolves once the server has seated us, rejects with a readable reason. */
  connect(opts: { create: true } | { code: string }): Promise<void> {
    this.leave();
    this.code = 'code' in opts ? opts.code.toUpperCase() : '';
    this.lastError = '';
    this.setStatus('connecting');
    return this.open('create' in opts);
  }

  private open(create: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (why: string) => {
        if (settled) return;
        settled = true;
        this.lastError = why;
        reject(new Error(why));
      };
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.serverUrl());
      } catch {
        this.setStatus('idle');
        return fail('THAT SERVER ADDRESS IS NOT VALID.');
      }
      this.ws = ws;
      const giveUp = window.setTimeout(() => {
        if (settled) return;
        ws.close();
        if (this.status === 'connecting') this.setStatus('idle');
        fail('NO ANSWER FROM THE MULTIPLAYER SERVER.');
      }, 8000);
      ws.onopen = () => {
        const p = this.profile;
        this.sendRaw({ t: 'hello', key: p.key, name: p.name, look: p.look, code: this.code || undefined, create: create || undefined });
      };
      ws.onmessage = (e) => {
        let msg: ServerMsg;
        try {
          msg = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (msg.t === 'welcome' && !settled) {
          settled = true;
          window.clearTimeout(giveUp);
          this.code = msg.code;
          this.saveProfile({ lastCode: msg.code });
          this.retryUntil = 0;
          this.setStatus('online');
          this.startPing();
          resolve();
        }
        if (msg.t === 'error' && !settled) {
          window.clearTimeout(giveUp);
          ws.onclose = null;
          ws.close();
          this.ws = null;
          this.setStatus('idle');
          fail(msg.msg);
        }
        this.receive(msg);
      };
      ws.onclose = () => {
        window.clearTimeout(giveUp);
        window.clearInterval(this.pingTimer);
        if (this.ws !== ws) return;
        this.ws = null;
        if (!settled) {
          if (this.status === 'connecting') this.setStatus('idle');
          return fail('COULD NOT REACH THE MULTIPLAYER SERVER.');
        }
        this.dropped();
      };
      ws.onerror = () => {
        /* onclose follows and reports it */
      };
    });
  }

  /** The line went dead mid-room: keep trying to take the seat back for as long as the host holds it. */
  private dropped() {
    if (this.status !== 'online' && this.status !== 'reconnecting') return;
    if (!this.retryUntil) this.retryUntil = Date.now() + RECONNECT_GRACE * 1000;
    if (Date.now() > this.retryUntil || !this.state || this.state.phase === 'lobby') {
      this.state = null;
      this.seat = -1;
      this.lastError = 'THE CONNECTION WAS LOST.';
      return this.setStatus('lost');
    }
    this.setStatus('reconnecting');
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (this.status !== 'reconnecting') return;
      this.open(false).catch(() => this.dropped());
    }, 2000);
    this.timers.add(id);
  }

  private startPing() {
    window.clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => this.sendRaw({ t: 'ping' }), 20000);
  }

  // ------------------------------------------------------------------ both

  send(msg: ClientMsg) {
    if (this.local) this.local.handle(this.seat, msg);
    else this.sendRaw(msg);
  }
  private sendRaw(msg: ClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private receive(msg: ServerMsg) {
    if (msg.t === 'welcome') this.seat = msg.seat;
    else if (msg.t === 'state') {
      this.state = msg.state;
      const b = msg.state.battle;
      if (!b) this.feed = null;
      else if (!this.feed || this.feed.id !== b.id) this.feed = { id: b.id, base: b.snap, next: b.sent, steps: [] };
      this.emit({ t: 'state' });
    } else if (msg.t === 'steps') {
      const f = this.feed;
      if (f && f.id === msg.battle && msg.from === f.next) {
        f.steps.push(...msg.steps);
        f.next += msg.steps.length;
        this.emit({ t: 'steps' });
      }
    } else if (msg.t === 'pos') this.emit(msg);
    else if (msg.t === 'fx') this.emit({ t: 'fx', kind: msg.kind, seat: msg.seat ?? -1, text: msg.text ?? '' }); else if (msg.t === 'note') this.emit({ t: 'note', text: msg.text });
    else if (msg.t === 'error') {
      this.lastError = msg.msg;
      this.emit({ t: 'error', msg: msg.msg, code: msg.code });
    }
  }

  /** Walk away from whatever room we are in. */
  leave() {
    if (this.local) {
      this.local.handle(this.seat, { t: 'leave' });
      this.local = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'leave' } satisfies ClientMsg));
        ws.close();
      } catch {
        /* already gone */
      }
    }
    for (const id of this.timers) window.clearTimeout(id);
    this.timers.clear();
    window.clearInterval(this.pingTimer);
    this.state = null;
    this.feed = null;
    this.seat = -1;
    this.retryUntil = 0;
    this.status = 'idle';
  }
}

export const net = new RogueNet();

// (for targeted tests from the browser console and the DEV tools)
(globalThis as any).__rogueNet = net;
