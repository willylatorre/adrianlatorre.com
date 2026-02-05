import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ui from '@nuxt/ui/vue-plugin'
import ProseCode from '@nuxt/ui/components/prose/Code.vue'
import ProsePre from '@nuxt/ui/components/prose/Pre.vue'
import CoffeeCounter from './components/CoffeeCounter.vue'
import CoffeeCounterCallout from './components/CoffeeCounterCallout.vue'
import './assets/imports.css'
import './assets/tiptap.css'
import './assets/main.scss'
import 'highlight.js/styles/github.css'

const app = createApp(App)

app.use(router)
app.use(ui)
app.component('CoffeeCounter', CoffeeCounter)
app.component('CoffeeCounterCallout', CoffeeCounterCallout)
app.component('ProseCode', ProseCode)
app.component('ProsePre', ProsePre)

app.mount('#app')
