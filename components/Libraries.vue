<script setup>
const darkMode = useState('darkMode', () => false)
</script>

<template >
  <div class="section" id="section-libraries" :class="{'section_dark': darkMode}">
    <h1>Libraries using it</h1>
    <p>
      Some libraries that are using <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> in production (crazy), so here is a big shoutout to them.
    </p>

    <h2> <a href="https://adyen.com">Adyen</a> </h2>
    <h3> Amsterdam, August 2020 - in production currently</h3>
    <p>
      After a proper analysis, one of the most important companies in the <span class="bold" :class="{ 'bold_dark': darkMode }">Fintech sector</span> has decided to work with <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> :
      <ul>
        <li>
          Currently, Frontend Engineer in charge of the main Adyen.com and derivates websites.
        </li>
        <li>
          Previously, Frontend Engineer at the Billing Stream
        </li>
        <li>Improve the invoicing experience for both merchants and AMs</li>
        <li>
          Develop internal tools related to invoices and contracts
        </li>
      </ul>
    </p>

<h2> Housfy </h2>
    <h3> Barcelona, March 2019 - August 2020</h3>
    <p>
      First usage of <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> in the <span class="bold" :class="{ 'bold_dark': darkMode }">PropTech Sector</span>:
      <ul>
        <li>
          Lead the Frontend stack of Housfy (Vue.js, Nuxt.js)
        </li>
        <li>Implement MyHousfy, a fully featured PWA to provide value for the customers</li>
        <li>
          Implement a good testing (Jest/Cypress) environment
        </li>
        <li>Implement analytics tracking</li>
      </ul>
    </p>


    <h2> Glovoapp </h2>
    <h3> Barcelona, Sept 2015 - March 2019</h3>
    <p>
      One of the biggest companies in the delivery ecosystem right now. Glovoapp has worked with <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> as
      <span class="bold" :class="{ 'bold_dark': darkMode }">Technical Lead</span> and has done pretty cool things with it:
      <ul>
        <li>
          Lead the Frontend stack of Glovo (Vue.js, Nuxt.js, HeadlessCMS)
        </li>
        <li>
          Lead the Growth / B2B team
        </li>
        <li>Implement & A/B Test multiple RPO improvements</li>
        <li>Implement Glovo Prime</li>
        <li>Implement Glovo Member Get Member program</li>
        <li>Implement Glovo Business</li>
        <li>
          Migration of the Glovo webapp from Angular to Vue.js. Here is a great summary of it
          <a href="http://tech.glovoapp.com/a-wonderful-journey-migrating-from-angular-to-vue-js/" target="_new">A wonderful journey: migrating from Angular to Vue (and why not React)</a>
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



<style lang="scss">
</style>
