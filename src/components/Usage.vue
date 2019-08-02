<template lang="html">
  <div class="section" id="section-usage" :class="{'section_dark': darkMode}">
    <h1>How it works</h1>
    <p>
      The usage of <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> is pretty straightforward. Here are some examples:
    </p>
    <pre><code class="javascript">
      // import the library first
      import a from 'a'

      a.hi()       // Prints 'Hi'
      a.contact()  // Sends an email to a.latorrecrespo@gmail.com
      a.chat()     // Sends also an email to a.latorrecrespo@gmail.com
      a.call()     // As you cannot call from node, it just prints the phone +34661858060
      a.bye()      // Prints 'Bye'
    </code></pre>

    <p>
      I know that it's a little bit difficult to grasp at first, but with a little bit of effort, one gets used to it.
      You can try the actions without having to download the library:
    </p>
    <div class="buttons">
      <a href="mailto:a.latorrecrespo@gmail.com" class="button is-danger">
        <v-icon name="envelope"/>
        a.contact()
      </a>
      <a href="tel:+34661858060" class="button is-default">
        <v-icon name="phone"/>
        a.call()
      </a>
    </div>


    <h2>Dependencies</h2>

    <p>
      Without those libraries, <span class="strike">he</span> <span class="highlight" :class="{'highlight_dark': darkMode}">a</span> wouldn't work. Contrary to what is common, more and more dependencies are beeing
      added as time passes.
    </p>

    <pre><code class="json">
      dependencies: {
        javascript-es6,
        node,
        express,
        sass,
        android-even-if-its-not-a-node-library,
        kotlin-too,
        mocha,
        webpack
      },
      devDependencies: {
        vuejs,
        gridsome,
        nuxt,
        react-hooks,
        gatsby,
        vuex,
        async-await-polyfill
        babel,
        date-fn,
        cool-css-animations,
        github-addict,
      }
    </code></pre>
    <p>
    </p>
    <h2>Download CV</h2>
    <p>
      If you prefer, you can download a Code Visual also known as CV here.
    </p>
    <a href="/static/docs/cv_adrian_latorre.pdf" rel="nofollow">
      <div class="box">
        <v-icon name="file" />
        Download CV
      </div>
    </a>


  </div>
</template>

<script>
export default {
  name: "Usage",
  store: ["darkMode"]
};
</script>

<style lang="scss" scoped>
.buttons,
.box {
  & svg {
    margin-right: 5px;
  }
}
</style>
