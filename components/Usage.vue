<script setup>
const darkMode = useState('darkMode', () => false)
const { $termino } = useNuxtApp()
let term = null

const help = () => {
  term.echo(`The following commands are available:

  hi()         // Prints 'Hi'
  skills()     // Shows a's skills
  contact()    // Get a's email information
  call()       // Get a's phone information
  bye()        // Prints 'Bye'`)
}

const contact = () => {
  term.echo(`Please, send me an email to a.latorrecrespo@gmail.com`)
}

const call = () => {
  term.echo(`Sure, you can call me at +34 661858060`)
}

const bye = () => {
  term.echo(`Bye bye`)
}
const hi = () => {
  term.echo(`Hey, you look amazing today`)
}
const experience = () => {
  term.echo(`A has a lot of experiencie with multiple tools. For example:
  
  - Vue 3
  - Nuxt/SSR/Static site generation
  - AI projects (GPT-3)
  - Payment integrations and APIs
  - Stock/crypto APIs`)
}

const functions = new Map([
  ['call', call],
  ['contact', contact],
  ['help', help],
  ['bye', bye],
  ['ciao', bye],
  ['hi', hi],
  ['hello', hi],
  ['skills', experience],
  ['experience', experience]
])

async function basicTerminalApp() {
  // call Termino.js /  your terminal for inital input
  let termvalue = await term.input(`
  
  What would you like to do?`)
  termvalue = termvalue.replace('()', '')
  if (functions.has(termvalue)) {
    functions.get(termvalue)()
  } else {
    term.output("Command not supported")
  }
  setTimeout(basicTerminalApp, 2000)
}

onMounted(async () => {
  term = $termino(document.getElementById("terminal"))
  term.output('Hi! Welcome to a\'s interface.')
  term.output(`Remember that you can type "help" to see the available command.`)
  await term.delay(3000)
  basicTerminalApp()
})

onUnmounted(() => {
  term?.kill()
})

</script>


<template >
  <div class="section" id="section-usage" :class="{ 'section_dark': darkMode }">
    <h1>How it works</h1>
    <p>
      The usage of <span class="highlight" :class="{ 'highlight_dark': darkMode }">a</span> is pretty straightforward.
      Here are some examples:
    </p>

    <div class="rpl">
      <div id="terminal">
        <pre><code class="termino-console"></code></pre>
        <div class="termino-input-container flex items-center">
          <label id="termino-prompt" for="termino-input">→ </label>
          <textarea class="termino-input" rows="1" wrap="hard" placeholder="Type something here"></textarea>
        </div>
      </div>
    </div>

    <p>
      I know that it's a little bit difficult to grasp at first, but with a little bit of effort, one gets used to it.
      You can try the actions without having to download the library:
    </p>
    <div class="buttons">
      <a href="mailto:a.latorrecrespo@gmail.com" class="button is-danger">
        <span class="icon is-small">
          <img src="../assets/img/envelope.svg" class="icon text-white" />
        </span>
        <span>
          a.contact()
        </span>
      </a>
      <a href="tel:+34661858060" class="button is-default">
        <span class="icon is-small">
          <img src="../assets/img/phone.svg" class="icon" />
        </span>
        <span>
          a.call()
        </span>
      </a>
    </div>


    <h2>Dependencies</h2>

    <p>
      Without those libraries, <span class="strike">he</span> <span class="highlight"
        :class="{ 'highlight_dark': darkMode }">a</span> wouldn't work. Contrary to what is common, more and more
      dependencies are beeing
      added as time passes.
    </p>

    <h2>Download CV</h2>
    <p>
      If you prefer, you can download a Code Visual also known as CV here.
    </p>
    <a href="/docs/cv_adrian_latorre.pdf" rel="nofollow" class="button">

      <span class="icon is-small">
        <img src="../assets/img/open.svg" class="icon" />
      </span>
      <span class="ml-3">
        Download CV
      </span>

    </a>


  </div>
</template>



<style lang="scss" scoped>
.rpl {
  text-shadow: none;
  color: #333;
  background: #f8f8f8;
  padding: 0;
  text-align: left;
  max-width: 600px;
  margin: 24px auto;
  border-radius: 3px;
  border: 1px solid #ddd;
  overflow: hidden;

  pre {
    word-break: break-all;
    white-space: pre-line;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    font-size: 12px;
  }

  code {
    overflow-y: scroll;
    scroll-behavior: smooth;
    height: 200px;
  }

  .termino-console {
    padding: 12px 16px;
    display: block;
  }

  .termino-input {
    flex: 1;
    height: 100%;
    padding-left: 0;
  }

  .termino-input-container>* {
    outline: none;
    border: none;
    white-space: pre-wrap;
    font-family: monospace;
    color: #444;
    background: #f0f0f0;
    min-height: 14px;
    padding: 10px;
    margin: 0;
    border-radius: 0 0 3px 3px;
    border-top: 1px solid #ddd;
  }
}

.icon {
  width: 24px;
  height: 24px;
}
</style>
