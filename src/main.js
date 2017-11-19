// External deps + polyfills
import 'intersection-observer'

import Vue from 'vue'
import App from './App'
import router from './router'
import VueObserveVisibility from 'vue-observe-visibility'
Vue.use(VueObserveVisibility)

// Styles
import 'highlight.js/styles/rainbow.css'
import './styles/bulma.scss'
import './styles/common.scss'
// Icons (we are importing them separately to reduce the bundle size)
import 'vue-awesome/icons/github'
import 'vue-awesome/icons/linkedin'
import 'vue-awesome/icons/file-text'
import 'vue-awesome/icons/envelope'
import 'vue-awesome/icons/phone'
import 'vue-awesome/icons/heart'
import Icon from 'vue-awesome/components/Icon'
Vue.component('icon', Icon)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  template: '<App/>',
  components: { App }
})
