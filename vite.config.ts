import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteSingleFile } from 'vite-plugin-singlefile' // ① 新增

// https://vite.dev/config/
export default defineConfig({
  base: './', // ② 新增：资源用相对路径
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    viteSingleFile(), // ③ 新增：把 JS/CSS 内联进 HTML
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
