<template>
  <div
    id="app"
    :style="themeStyle">
    <header>
      <span>Adrian Latorre Crespo</span>
      <div class="social-media">
        <div class="switch">
          <icon name="sun-o" scale="1.1" />
          <switches v-model="darkMode" :theme="switchStyle" color="default" />
          <icon name="moon-o" scale="1.1" />
        </div>

        <a href="https://github.com/willylatorre" target="_new" name="github"><icon name="github" scale="1.1"></icon></a>
        <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin"><icon name="linkedin" scale="1.1"></icon></a>
      </div>
    </header>
    <main>
      <router-view></router-view>
    </main>
    <footer>
      <a href="mailto:a.latorrecrespo@gmail.com">a.latorrecrespo@gmail.com</a>
      <div class="social-media">
        <a href="https://github.com/willylatorre" target="_new" name="github"><icon name="github" scale="1.1"></icon></a>
        <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin"><icon name="linkedin" scale="1.1"></icon></a>
      </div>
    </footer>
  </div>
</template>

<script>
import Switches from 'vue-switches'
export default {
  name: 'app',
  store: ['darkMode'],
  components: {
    Switches
  },
  data: () => ({
    themeColors: {
      light: {
        background: 'white',
        color: '#2c3e50'
      },
      dark: {
        background: '#002b36',
        color: '#839496'
      }
    }
  }),
  computed: {
    themeStyle () {
      return this.darkMode ? this.themeColors.dark : this.themeColors.light
    },
    switchStyle () {
      return this.darkMode ? 'default' : 'bulma'
    }
  }
}
</script>

<style lang="scss">
@import "~vars";

body {
  margin: 0;
}

a, a:visited {
  color: $grey;

  &:hover {
    color:black;
  }
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  backgroun: white;
}

main {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
}

header {
  margin: 0;
  height: 56px;
  padding: 0 16px 0 24px;
  color: $grey;
  display: flex!important;
  justify-content: space-between;
  align-items: center;

  & span {
    display: block;
    font-size: 20px;
    letter-spacing: .02em;
    box-sizing: border-box;
  }
}

.social-media {
  display: flex;

  & svg {
    margin: 0 10px;
    // cursor: pointer;
  }
}

footer {
  display: flex!important;
  padding: 20px;
  font-size: 14px;
  justify-content: space-around;
  flex-wrap: wrap;
}

</style>
