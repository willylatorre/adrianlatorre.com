<template lang="html">
  <div class="section" id="section-demos" :class="{'section_dark': darkMode}">
    <h1>Demos</h1>
    <p>
      But <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> is not only used in serious companies. It can be used for a lot of things. Here are some examples.
    </p>

    <h2>Open source projects</h2>
    <p>
      <ul>
        <li>
          <span class="bold" :class="{ 'bold_dark': darkMode }"><a href="https://github.com/Glovo/vue-multianalytics">vue-multianalytics</a></span>: A Vuejs library to implement event tracking over multiple platforms.
        </li>
        <li>
          <span class="bold" :class="{ 'bold_dark': darkMode }"><a href="https://github.com/Moneeda/moneeda-node">moneeda-node</a></span>: A cryptocurrencies node library to call moneeda (another project from Adrian Latorre, but private) API endpoints.
          Basically, a library that implements all the possible calls to Cryto exchanges such as Gdax, Bitfinex, Kraken, Bittrex, Binance and Liqui.
        </li>
        <li>
          <span class="bold" :class="{ 'bold_dark': darkMode }"><a href="https://github.com/willylatorre/angular-typeform">angular-typeform</a></span>: The typeform platform didn't work with angular 1, so we did a library to make it happen.
        </li>
        <li>
          <span class="bold" :class="{ 'bold_dark': darkMode }"><a href="https://github.com/willylatorre/restaurand">restaurand</a></span>: Android application that suggests random restaurants from your favorites. Implements all kind of Google APIs.
        </li>
        <li>
          <span class="bold" :class="{ 'bold_dark': darkMode }"><a href="http://adrianlatorre.com/projects/emrisco/">University final project</a></span>: Android application that uses Wifi-direct and GCM to find real-time parking spots and an notify emergencies.
        </li>
      </ul>
    </p>

    <h2>Other projects</h2>
    <p>
      Yep, <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> is also used in more private projects, such as friends/family webpages. A must check is <a href="https://holameraki.com" target="_new" rel="nofollow">Espacio Meraki</a>
    </p>
    <a href="https://holameraki.com" target="_new" rel="nofollow">
    <g-image src="~/assets/img/holameraki.png" alt="espacio meraki" />
    </a>
  </div>
</template>

<script>
export default {
  name: 'Demos',
  store: ['darkMode']
}
</script>

<style lang="scss" scoped>
img {
  max-width: 300px;
}
</style>
