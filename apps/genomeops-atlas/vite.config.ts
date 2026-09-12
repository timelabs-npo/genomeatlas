import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Bound concurrent DOM environments on developer machines and CI runners.
    maxWorkers: 4,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
