import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths so the build works on any GitHub Pages URL
  // (e.g. https://<user>.github.io/<repo>/) regardless of the repo name.
  base: './',
  plugins: [react()],
})
