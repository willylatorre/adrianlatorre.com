<template lang="html">
  <div class="section" id="section-media">
    <h1>Media</h1>
    <p>
      Yes, <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> <span class="strike">was</span> is famous and has appeared in the media.
      Sharing knowledge has been always a must.
    </p>

    <h2>Talks</h2>
    <div class="videos">
      <youtube-video id="t6en3oPbYTI"></youtube-video>
      <youtube-video id="wQlmEspvC98"></youtube-video>
      <youtube-video id="asUqQjPAGY4"></youtube-video>
      <youtube-video id="nBr2fJ_0Xrk"></youtube-video>
    </div>

    <h2>Articles</h2>
    <p>
      <ul>
        <li>
          Migration of the Glovo webapp from Angular to Vue.js. Here is a great summary of it
          <a href="http://tech.glovoapp.com/a-wonderful-journey-migrating-from-angular-to-vue-js/" target="_new">A wonderful journey: migrating from Angular to Vue (and why not React)</a>
        </li>
        <li>
          Más allá del conocimiento [ES]: Thoughts about learning business in an IT career.
          <a href="/static/docs/articulotelecoscat.pdf">Read</a>
        </li>
      </ul>
    </p>
  </div>
</template>

<script>
import YoutubeVideo from './YoutubeVideo'
export default {
  name: 'Media',
  store: ['darkMode'],
  components: {
    YoutubeVideo
  }
}
</script>

<style lang="scss">
.videos {
  display: flex;
  flex-wrap: wrap;
  & div {
    margin: 10px;
  }
}
</style>
