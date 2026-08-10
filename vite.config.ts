import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Обратите внимание на фигурные скобки вокруг command!
export default defineConfig(({ command }) => {
  return {
    plugins: [vue()],
    // Локально будет '/', на GitHub Pages — '/chains-of-purr-future/'
    base: command === 'build' ? '/chains-of-purr-future/' : '/',
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
    },
  }
})
