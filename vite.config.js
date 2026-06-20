import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://<user>.github.io/interactive-game-of-life-/,
// so assets must resolve under that sub-path. Locally (dev) the base is '/'.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/interactive-game-of-life-/' : '/',
  plugins: [react()],
})
