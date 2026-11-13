// ROGUELIKE: where online rooms live. This is the one place to change it.
//
// The game always reaches this server over a secure WebSocket (wss://), wherever the page itself
// is served from: Render, itch.io, a file on disk or `npm run dev`. PLAY SOLO never uses it.
//
// Overrides, strongest first:
//   1. an address typed into the lobby's SERVER line (e.g. "localhost:8787" to test a local server)
//   2. VITE_ROGUE_SERVER at build time
//   3. ROGUE_SERVER below
// Set ROGUE_SERVER to '' to use the server the page came from instead.

export const ROGUE_SERVER = 'wss://wispbound.onrender.com/rogue-ws';

/** What the lobby calls the server above. */
export const ROGUE_SERVER_LABEL = 'WISPBOUND.ONRENDER.COM';

/**
 * How long to keep trying before saying the server is unavailable. Render's free plan puts the
 * server to sleep after 15 quiet minutes, and waking it can take a minute or two.
 */
export const CONNECT_TIMEOUT_MS = 150_000;

/** After this long without an answer, the lobby explains that the server is waking up. */
export const SLOW_CONNECT_MS = 5_000;
