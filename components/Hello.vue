<script setup>
import  _sections from './sections'
import zenscroll from 'zenscroll'
import hljs from 'highlight.js'

import A from '../assets/img/a.svg?url'
import A_Dark from '../assets/img/a_dark.svg?url'

const visibleSection = ref(null)
const sections = ref(_sections)
const darkMode = useState('darkMode', () => false)

const mainImg = computed(() => darkMode ? A_Dark : A)

const observer = ref(null)
const observerOptions = reactive({
  threshold: 0.5,
})

onMounted(() => {
  // highlight
  hljs.initHighlightingOnLoad()

  observer.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute('id')
      if (entry.isIntersecting) {
        visibleSection.value = id
      }
    })
  }, observerOptions)
  document.querySelectorAll('.section').forEach((section) => {
    observer.value?.observe(section)
  })
})
onUnmounted(() => {
  observer.value?.disconnect()
})

const goToSection = (section) => {
  zenscroll.to(document.getElementById(section), 100, () => {
    visibleSection.value = section
  })
}

</script>

<template>
  <div class="hello">
    <div class="flex flex-col items-center mb-10">
      <img :src="mainImg" alt="a" width="160" />

      <div class="mb-4">
        <span class="highlight" :class="{ highlight_dark: darkMode }">a</span>
        is the new library by
        <span class="bold" :class="{ bold_dark: darkMode }">Adrian Latorre</span
        >.<br />
        The library is still in development, but it's safe to use in production
        (at your own risk).
      </div>
      <div class="flex flex-wrap">
        <img src="../assets/img/build.svg" alt="build badge" class="m-1" />
        <img
          src="../assets/img/coverage.svg"
          alt="coverage badge"
          class="m-1"
        />
        <img
          src="../assets/img/license.svg"
          alt="license badge"
          class="m-1"
        />
        <img
          src="../assets/img/allstar.svg"
          alt="allstar badge"
          class="m-1"
        />
      </div>
    </div>
    <div class="hello_docs">
      <div class="hello_content">
       <Usage />
       <Libraries />
       <Demos />
       <Media />
      </div>
      <div class="hello_sidebar sticky top-0">
        <h2>QUICK START</h2>
        <ul>
          <li
            v-for="section in sections"
            :key="section.name"
            @click="goToSection(section.name)"
            :class="{ 'section-highlight': section.name === visibleSection }"
          >
            {{ section.label }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hello {
  &_docs {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas: 'sidebar' 'content';

    @media (min-width: 1024px) {
      grid-template-columns: 1fr 200px;
      grid-template-areas: 'content sidebar';
    }
  }

  &_content {
    grid-area: content;
  }

  &_sidebar {
    grid-area: sidebar;
    text-align: left;

    @media only screen and (max-width: 600px) {
      display: none;
    }

    &_inner {
      border-left: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0px 10px 10px 0;
    }

    & h2 {
      padding-left: 10px;
    }

    & li {
      cursor: pointer;
      padding-left: 14px;
    }
  }
}
</style>
