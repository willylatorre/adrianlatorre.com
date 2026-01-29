import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import hljs from 'highlight.js'

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
      markdownItSetup(md) {
        md.options.highlight = (code: string, lang?: string) => {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value
            } catch {
              // fall through
            }
          }
          return ''
        }

        md.renderer.rules.fence = (tokens, idx, options) => {
          const token = tokens[idx]
          const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
          const langName = info ? info.split(/\s+/g)[0] : ''

          let highlighted = options.highlight?.(token.content, langName, '') ?? ''
          if (!highlighted) highlighted = md.utils.escapeHtml(token.content)

          const langClass = langName ? `${options.langPrefix}${langName}` : ''
          const codeClass = ['hljs', langClass].filter(Boolean).join(' ')

          return `<pre class="hljs"><code class="${codeClass}">${highlighted}</code></pre>\n`
        }
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
