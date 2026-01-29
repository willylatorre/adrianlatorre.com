import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import Markdown from 'unplugin-vue-markdown/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    Markdown({
      markdownItOptions: {
        html: true,
        linkify: true,
        typographer: true,
      },
    }),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    tailwindcss(),
    ui({
      colorMode: false,
      ui: {
        colors: {
          primary: 'teal',
          neutral: 'zinc',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // https: true,
    // hmr: {
    //   // host: 'adyen-demos.loca.lt',
    //   // port: 3001,
    //   clientPort: 443,
    //   protocol: 'wss'
    // },
    watch: {
      usePolling: true,
    },
  },
})
