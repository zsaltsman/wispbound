import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
    // the roguelike's multiplayer server (`npm run server`), reached through the dev server
    proxy: { '/rogue-ws': { target: 'ws://localhost:8787', ws: true }, '/rogue-status': { target: 'http://localhost:8787' } },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
