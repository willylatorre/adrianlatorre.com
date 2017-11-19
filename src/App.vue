<template>
  <div id="app">
    <header>
      <span>Adrian Latorre Crespo</span>
      <div id="social-media">
        <a href="https://github.com/willylatorre" target="_new"><icon name="github" scale="1.1"></icon></a>
        <a href="https://www.linkedin.com/in/adrianlatorre" target="_new"><icon name="linkedin" scale="1.1"></icon></a>
      </div>
    </header>
    <main>
      <router-view></router-view>
    </main>
    <footer>
      <a href="mailto:a.latorrecrespo@gmail.com">a.latorrecrespo@gmail.com</a>
      <div id="social-media">
        <a href="https://github.com/willylatorre" target="_new"><icon name="github" scale="1.1"></icon></a>
        <a href="https://www.linkedin.com/in/adrianlatorre" target="_new"><icon name="linkedin" scale="1.1"></icon></a>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'app'
}
</script>

<style lang="scss">
@import "~vars";

body {
  margin: 0;
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
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
  background-color: white;
  color: $grey;
  display: flex;
  justify-content: space-between;
  align-items: center;

  & span {
    display: block;
    font-size: 20px;
    letter-spacing: .02em;
    box-sizing: border-box;
  }
}

#social-media {
  display: flex;
  & a {
    color: $grey!important;
  }
  & svg {
    margin: 0 10px;
    cursor: pointer;
    &:hover {
      color: black;
    }
  }
}

footer {
  display: flex;
  padding: 20px;
  font-size: 14px;
  justify-content: space-around;
  flex-wrap: wrap;

  & a {
    color: $grey!important;
  }
}

</style>
