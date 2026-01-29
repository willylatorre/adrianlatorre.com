import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ui from '@nuxt/ui/vue-plugin'
import './assets/imports.css'
import './assets/main.scss'
import 'highlight.js/styles/github.css'

const app = createApp(App)

app.use(router)
app.use(ui)

app.mount('#app')
