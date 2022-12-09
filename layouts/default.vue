
<script setup>
import Linkedin from '../assets/img/linkedin.svg'
import Github from '../assets/img/github.svg'
import Sun from '../assets/img/sun.svg'
import Moon from '../assets/img/moon.svg'

const darkMode = useState('darkMode', () => false)
const themeColors =
{
  light: {
    background: "white",
    color: "#2c3e50"
  },
  dark: {
    background: "#002b36",
    color: "#839496"
  }
}


const themeStyle = computed(() => darkMode.value ? themeColors.dark : themeColors.light)
</script>

<template>
  <div class="layout" :style="themeStyle">
    <div class="layout__wrapper">
      <header class="header">

        <div class="flex items-center">
          <NuxtLink to="/" class="mr-2 md:text-xl">Adrian Latorre</NuxtLink>
          <!-- <NuxtLink to="/blog" class="ml-2"> Blog </NuxtLink> -->
        </div>


        <div class="social-media">
          <div class="flex items-center">
            <Sun class="w-6" name="sun" />
            <Switch />
            <Moon class="w-6" />
          </div>

          <a href="https://github.com/willylatorre" target="_new" name="github">
            <Github class="w-6" />
          </a>
          <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin">
            <Linkedin />
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
            <Github />
          </a>
          <a href="https://www.linkedin.com/in/adrianlatorre" target="_new" name="linkedin">
            <Linkedin />
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>




<style lang="scss">
@import '../assets/scss/vars';

body {
  margin: 0;
}

// a,
// a:visited {
//   color: $black;

//   &:hover {
//     color: $warning;
//   }
// }

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
  align-items: center;

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
