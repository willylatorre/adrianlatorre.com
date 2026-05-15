import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ui from '@nuxt/ui/vue-plugin'
import CoffeeCounter from './components/CoffeeCounter.vue'
import CoffeeCounterCallout from './components/CoffeeCounterCallout.vue'
import ProseCode from './components/prose/ProseCode.vue'
import ProsePre from './components/prose/ProsePre.vue'
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
