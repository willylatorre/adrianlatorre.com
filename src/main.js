
import DefaultLayout from '~/layouts/Default.vue'
import Switches from 'vue-switches'

import VueObserveVisibility from 'vue-observe-visibility'
import VueStash from 'vue-stash'
import Icon from 'vue-awesome/components/Icon'


import 'highlight.js/styles/rainbow.css'
import '~/assets/scss/common.scss'
// Icons (we are importing them separately to reduce the bundle size)
import 'vue-awesome/icons/brands/github'
import 'vue-awesome/icons/brands/linkedin'
import 'vue-awesome/icons/file'
import 'vue-awesome/icons/envelope'
import 'vue-awesome/icons/phone'
import 'vue-awesome/icons/heart'
import 'vue-awesome/icons/sun'
import 'vue-awesome/icons/moon'

export default function (Vue, { appOptions, isClient }) {
  Vue.component('Layout', DefaultLayout)
  Vue.component('Switches', Switches)
  Vue.component('v-icon', Icon)

  Vue.use(VueStash)

  if (isClient) {
    Vue.use(VueObserveVisibility)
  }

  appOptions.data = {
    store: {
      darkMode: false
    }
  }
}
