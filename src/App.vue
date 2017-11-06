<template>
  <div id="app">
    <header>
      <span>Adrian Latorre Crespo</span>
      <div id="social-media">
        <icon name="github" scale="1.1"></icon>
        <icon name="facebook" scale="1.1"></icon>
      </div>
    </header>
    <main>
      <router-view></router-view>
    </main>
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
  & svg {
    margin: 0 10px;
    cursor: pointer;
    &:hover {
      color: black;
    }
  }
}

</style>
