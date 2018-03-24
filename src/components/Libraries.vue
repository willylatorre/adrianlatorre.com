<template lang="html">
  <div class="section" id="section-libraries" :class="{'section_dark': darkMode}">
    <h1>Libraries using it</h1>
    <p>
      Some libraries that are using <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> in production (crazy), so here is a big shoutout to them.
    </p>
    <h2> Glovoapp </h2>
    <h3> Barcelona, Sept 2015 - in production currently</h3>
    <p>
      One of the biggest companies in the delivery ecosystem right now. Glovoapp has worked with <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> as
      <span class="bold" :class="{ 'bold_dark': darkMode }">Technical Lead</span> and has done pretty cool things with it:
      <ul>
        <li>
          Migration of the Glovo webapp from Angular to Vue.js. Here is a great summary of it
          <a href="http://tech.glovoapp.com/a-wonderful-journey-migrating-from-angular-to-vue-js/" target="_new">A wonderful journey: migrating from Angular to Vue (and why not React)</a>
        </li>
        <li>
          Updated the old admin panel, from Django to Vue.js + Java
        </li>
        <li>
          Created a partners webapp that connects to ECS/POS bluetooth printers
        </li>
        <li>
          Refactored the Android application to use Kotlin in several places.
        </li>
      </ul>
    </p>

    <h2> Oliva App </h2>
    <h3> Barcelona, Feb 2015 - Sept 2015</h3>
    <p>
      Small startup with a focus on delivering a high-tech solution to improve the filedity amongst merchants.
      Oliva used <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> alone to build the whole <span class="bold" :class="{ 'bold_dark': darkMode }">Android application and website</span>
      and implemented some very interesting technologies as NFC and QR codes.
    </p>

    <h2> Everis </h2>
    <h3> Barcelona, 2013 - Sept 2015</h3>
    <p>
      One of the most important IT consultancies in Spain. First real world implementation of <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> in production.
      Of course, a lot of bugs were found but fixed and improved until reaching the status of <span class="bold" :class="{ 'bold_dark': darkMode }">Solutions Analyst</span>.
    </p>
  </div>
</template>

<script>
export default {
  name: 'Libraries',
  store: ['darkMode']
}
</script>

<style lang="scss">
</style>
