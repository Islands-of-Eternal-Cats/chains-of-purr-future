import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    base: command === 'build' ? '/имя_вашего_репозитория/' : '/',
    include: ['src/**/*.spec.ts'],
  },
})
