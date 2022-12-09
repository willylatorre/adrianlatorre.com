<script setup>
import _sections from './sections'
// import zenscroll from 'zenscroll'
// import hljs from 'highlight.js'

import A from '../assets/img/a.svg?url'
import A_Dark from '../assets/img/a_dark.svg?url'
import BuildSvg from '../assets/img/build.svg'
import CoverageSvg from '../assets/img/coverage.svg'
import LicenseSvg from '../assets/img/license.svg'
import AllstarSvg from '../assets/img/allstar.svg'

const sections = ref(_sections)
const darkMode = useState('darkMode', () => false)

const mainImg = computed(() => darkMode ? A_Dark : A)

</script>

<template>
  <div class="hello">
    <div class="flex flex-col items-center mb-10">
      <img :src="mainImg" alt="a" width="160" />

      <div class="mb-4">
        <span class="highlight" :class="{ highlight_dark: darkMode }">a</span>
        is the new library by
        <span class="bold" :class="{ bold_dark: darkMode }">Adrian Latorre</span>.<br />
        The library is still in development, but it's safe to use in production
        (at your own risk).
      </div>
      <div class="flex flex-wrap">
        <BuildSvg alt="build badge" class="m-1" />
        <CoverageSvg alt="coverage badge" class="m-1" />
        <LicenseSvg alt="license badge" class="m-1" />
        <AllstarSvg alt="allstar badge" class="m-1" />
      </div>
    </div>
    <div class="hello_docs">
      <Usage />
      <Libraries />
      <Demos />
      <Media />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hello {}
</style>
