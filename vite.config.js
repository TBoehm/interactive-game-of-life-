import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/interactive-game-of-life-/,
// so assets must resolve under that sub-path in production. Locally (dev) the
// base is '/'. Using the `mode` argument avoids referencing Node's `process`.
// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/interactive-game-of-life-/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
}))
