<template>
  <div class="hello">
    <div class="hello_intro">
      <template v-if="darkMode">
        <img src="../assets/a_dark.svg" alt="a" />
      </template>
      <template v-else>
        <img src="../assets/a.svg" alt="a" />
      </template>
      <div class="hello_intro_explanation">
        <span class="highlight" :class="{ 'highlight_dark': darkMode }">a</span> is the new library by <span class="bold" :class="{ 'bold_dark': darkMode }">Adrian Latorre</span>.<br/>
        The library is still in development, but it's safe to use in production (at your own risk).
      </div>
      <div class="hello_badges">
        <img src="../assets/build.svg" />
        <img src="../assets/coverage.svg" />
        <img src="../assets/license.svg" />
        <img src="../assets/allstar.svg" />
      </div>
    </div>
    <div class="hello_docs">
      <div class="hello_content">
        <component
          v-for="section in sections"
          :key="section.name"
          v-observe-visibility="visibilityChanged"
          :is="section.component">
        </component>
      </div>
      <div class="hello_sidebar">
        <div class="hello_sidebar_inner">
          <h2>QUICK START</h2>
          <ul>
            <li
              v-for="section in sections"
              :key="section.name"
              @click="goToSection(section.name)"
              :class="{'section-highlight': section.name === visibleSection}">
              {{section.label}}
            </li>
          </ul>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import Demos from './Demos'
import Libraries from './Libraries'
import Usage from './Usage'
import Media from './Media'
import sections from './sections'
import StickySidebar from 'sticky-sidebar'
import zenscroll from 'zenscroll'
import hljs from 'highlight.js'
global.hljs = hljs

export default {
  name: 'Hello',
  store: ['darkMode'],
  data () {
    return {
      visibleSection: null,
      sections: sections
    }
  },
  mounted () {
    // Sticky
    const sticky = new StickySidebar('.hello_sidebar', {
      topSpacing: 20,
      bottomSpacing: 20,
      containerSelector: '.hello_docs',
      innerWrapperSelector: '.hello_sidebar_inner'
    })

    // highlight
    hljs.initHighlightingOnLoad()
  },
  methods: {
    goToSection (section) {
      zenscroll.to(document.getElementById(section), 100, () => {
        this.visibleSection = section
      })
    },
    visibilityChanged (isVisible, entry) {
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
<style lang="scss" scoped>
@import "~vars";
.hello {

  &_intro {
    margin-bottom: 60px;

    &_explanation {
      margin: 20px 0;
      & svg {
      }
    }
  }

  &_docs {
    display: flex;
  }

  &_content {
    flex: 1;
    max-width: 100%;
  }

  &_sidebar {
    flex: 0 0 200px;
    text-align: left;

    @media(max-width: 900px) {
      display: none;
    }

    &_inner {
      border-left: 1px solid rgba(0,0,0,0.1);
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
