<template>
  <div class="layout" :style="themeStyle">
    <div class="layout__wrapper">
      <header class="header">
        <span>Adrian Latorre Crespo</span>
        <div class="social-media">
          <div class="switch">
            <v-icon name="sun" scale="1.1" />
            <switches v-model="darkMode" :theme="switchStyle" color="default" />
            <v-icon name="moon" scale="1.1" />
          </div>

          <a href="https://github.com/willylatorre" target="_new" name="github">
            <v-icon name="brands/github" scale="1.1" />
          </a>
          <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin">
            <v-icon name="brands/linkedin" scale="1.1" />
          </a>
        </div>
      </header>
      <main>
        <slot />
      </main>
      <footer>
        <a href="mailto:a.latorrecrespo@gmail.com">a.latorrecrespo@gmail.com</a>
        <div class="social-media">
          <a href="https://github.com/willylatorre" target="_new" name="github">
            <v-icon name="brands/github" scale="1.1" />
          </a>
          <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin">
            <v-icon name="brands/linkedin" scale="1.1" />
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>

<static-query>
query {
  metaData {
    siteName
  }
}
</static-query>
<script>
export default {
  store: ["darkMode"],
  data() {
    return {
      themeColors: {
        light: {
          background: "white",
          color: "#2c3e50"
        },
        dark: {
          background: "#002b36",
          color: "#839496"
        }
      }
    };
  },
  computed: {
    themeStyle() {
      return this.darkMode ? this.themeColors.dark : this.themeColors.light;
    },
    switchStyle() {
      return this.darkMode ? "default" : "bulma";
    }
  }
};
</script>


<style lang="scss">
body {
  margin: 0;
}

a,
a:visited {
  color: $grey;

  &:hover {
    color: black;
  }
}

.layout {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background: white;

  &__wrapper {
    max-width: 800px;
    margin: 0 auto;
  }
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
  display: flex !important;
  justify-content: space-between;
  align-items: center;

  & span {
    display: block;
    font-size: 20px;
    letter-spacing: 0.02em;
    box-sizing: border-box;
  }
}

.social-media {
  display: flex;

  & a {
    color: $grey !important;
  }

  & svg {
    margin: 0 10px;
    // cursor: pointer;
  }
}

footer {
  display: flex !important;
  padding: 20px;
  font-size: 14px;
  justify-content: space-around;
  flex-wrap: wrap;
}
</style>
