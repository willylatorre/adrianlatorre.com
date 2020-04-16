<script>
import Demos from './Demos'
import Libraries from './Libraries'
import Usage from './Usage'
import Media from './Media'
import sections from './sections'
import zenscroll from 'zenscroll'
import hljs from 'highlight.js'

export default {
  name: 'Hello',
  store: ['darkMode'],
  data() {
    return {
      visibleSection: null,
      sections: sections
    }
  },
  computed: {
    mainImg() {
      return require(`~/assets/img/${this.darkMode ? 'a_dark.svg' : 'a.svg'}`)
    }
  },
  mounted() {
    

    // highlight
    hljs.initHighlightingOnLoad()
  },
  methods: {
    goToSection(section) {
      zenscroll.to(document.getElementById(section), 100, () => {
        this.visibleSection = section
      })
    },
    visibilityChanged(isVisible, entry) {
      if (isVisible) {
        this.visibleSection = entry.target.id
      }
    }
  },
  components: {
    Demos,
    Libraries,
    Usage,
    Media
  }
}
</script>


<template>
  <div class="hello">
    <div class="flex flex-col items-center mb-10">
      <g-image :src="mainImg" alt="a" width="160" />

      <div class="mb-4">
        <span class="highlight" :class="{ highlight_dark: darkMode }">a</span>
        is the new library by
        <span class="bold" :class="{ bold_dark: darkMode }">Adrian Latorre</span
        >.<br />
        The library is still in development, but it's safe to use in production
        (at your own risk).
      </div>
      <div class="flex flex-wrap">
        <g-image src="~/assets/img/build.svg" alt="build badge" class="m-1" />
        <g-image
          src="~/assets/img/coverage.svg"
          alt="coverage badge"
          class="m-1"
        />
        <g-image
          src="~/assets/img/license.svg"
          alt="license badge"
          class="m-1"
        />
        <g-image
          src="~/assets/img/allstar.svg"
          alt="allstar badge"
          class="m-1"
        />
      </div>
    </div>
    <div class="hello_docs">
      <div class="hello_content">
        <component
          v-for="section in sections"
          :key="section.name"
          v-observe-visibility="visibilityChanged"
          :is="section.component"
        >
        </component>
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
