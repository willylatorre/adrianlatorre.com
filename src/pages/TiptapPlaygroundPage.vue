<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useApi } from '@/composables/useApi'
import { useTipTap } from '@/composables/useTipTap'
import CoffeeCounterCalloutNode from '@/tiptap/CoffeeCounterCalloutNode'
import TipTapEditor from '@/components/TipTapEditor.vue'
import TipTapToolbar from '@/components/TipTapToolbar.vue'

const { sendChatMessage } = useApi()

const prompt = ref(
  'Generate a brief summary about the advantages of using tip-tap editor over a simple WYSIWYG editor. Return HTML only (no Markdown), including a short heading and a bullet list. Highlight that one of the trickiest points is maintaining a consistent response format and smooth interaction with the editor.',
)
const status = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const rawHtml = ref('')
const improveStatus = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const improveError = ref('')

const scriptClose = '</scr' + 'ipt>'

const bindingSnippet = `const outputHtml = ref('<p>Start writing...</p>')

const outputEditor = useTipTap({
  content: outputHtml,
  extensions: [StarterKit, Underline],
})

const setEditorFromHtml = (value: string) => {
  outputHtml.value = value
}`

const editorSnippet = `<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'

defineProps<{ editor: Editor | null }>()
${scriptClose}

<template>
  <EditorContent v-if="editor" :editor="editor" />
</template>`

const improveSnippet = `const { from, to } = editor.state.selection
const selectedText = editor.state.doc.textBetween(from, to, '\\n')
const contextText = contextNotes

const prompt = \`Improve the highlighted text using the context.
Context:
\${contextText}

Selected text:
\${selectedText}\``

const aiIntegrationSnippet = `const handleGenerate = async () => {
  if (!prompt.value.trim()) return
  status.value = 'loading'
  rawHtml.value = ''
  let buffer = ''

  await sendChatMessage(
    [],
    prompt.value,
    (chunk) => {
      status.value = 'streaming'
      buffer += chunk
      rawHtml.value = buffer
    },
    () => {
      status.value = 'done'
      rawHtml.value = buffer.trim()
      if (rawHtml.value) {
        outputHtml.value = rawHtml.value
      }
    },
    (error) => {
      status.value = 'error'
      errorMessage.value = error
    },
  )
}`

const interactiveViewsSnippet = `const interactiveContent = ref(
  '<coffee-counter-callout></coffee-counter-callout>',
)

const interactiveEditor = useTipTap({
  extensions: [StarterKit, CoffeeCounterCalloutNode],
  content: interactiveContent,
})`

const CoffeeCounterCalloutNode = Node.create({
  name: 'coffeeCounterCallout',
  group: 'block',
  atom: true,
  parseHTML: () => [{ tag: 'coffee-counter-callout' }],
  renderHTML: () => ['coffee-counter-callout'],
  addNodeView() {
    return VueNodeViewRenderer(CoffeeCounterCallout)
  },
})`

const outputHtml = ref('<p>Run the prompt to generate a Markdown summary.</p>')
const contextAwareHtml = ref(
  '<h3>Context-aware rewrite playground</h3><p>This is the editor where you can highlight a line and ask the model to rework it using the notes below. It already knows that TipTap likes structure, so it keeps the bullets neat and the headings tidy.</p><ul><li>The UX should feel snappy, not robotic.</li><li>Consistency beats cleverness when output hits the editor.</li></ul>',
)
const interactiveHtml = ref(
  '<h3>Interactive views with Vue + React</h3><p>Drop a custom component inside the editor to blend structured text with live UI. The callout below is a Vue component running inside a Tiptap node view.</p><coffee-counter-callout></coffee-counter-callout><p>In React, the same idea uses a ReactNodeViewRenderer. The key is that the editor still owns the document, while your framework owns the interactivity.</p>',
)

const baseEditorProps = {
  attributes: {
    class: 'min-h-[14rem] focus:outline-none prose prose-slate max-w-none text-slate-800',
  },
}

const editor = useTipTap({
  extensions: [StarterKit, Underline],
  content: outputHtml,
  editorProps: {
    attributes: {
      ...baseEditorProps.attributes,
      class: 'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800',
    },
  },
})

const contextAwareEditor = useTipTap({
  extensions: [StarterKit],
  content: contextAwareHtml,
  editorProps: baseEditorProps,
})

const contextNotes =
  'Voice: confident, friendly, a touch witty. Audience: builders integrating LLM output into Tiptap. Constraint: keep output structured for HTML parsing.'

const interactiveEditor = useTipTap({
  extensions: [StarterKit, CoffeeCounterCalloutNode],
  content: interactiveHtml,
  editorProps: baseEditorProps,
})

const isBusy = computed(() => status.value === 'loading' || status.value === 'streaming')
const statusLabel = computed(() => {
  switch (status.value) {
    case 'loading':
      return 'Sending prompt'
    case 'streaming':
      return 'Streaming response'
    case 'done':
      return 'Ready'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
})

const setEditorFromHtml = (value: string) => {
  outputHtml.value = value
}

const handleImproveSelection = async () => {
  improveError.value = ''
  if (!contextAwareEditor.value) return
  const { from, to } = contextAwareEditor.value.state.selection

  if (from === to) {
    improveStatus.value = 'error'
    improveError.value = 'Select some text in the editor to improve it.'
    return
  }

  const selectedText = contextAwareEditor.value.state.doc.textBetween(from, to, '\n')
  const contextText = contextNotes
  const improvePrompt = `Improve the highlighted text below using the provided context. Preserve the meaning and keep it concise.\n\nContext:\n${contextText}\n\nSelected text:\n${selectedText}`
  let buffer = ''

  improveStatus.value = 'loading'

  await sendChatMessage(
    [],
    improvePrompt,
    (chunk) => {
      improveStatus.value = 'streaming'
      buffer += chunk
    },
    () => {
      improveStatus.value = 'done'
      const improved = buffer.trim()
      if (improved) {
        contextAwareEditor.value?.commands.insertContentAt({ from, to }, improved)
      }
    },
    (error) => {
      improveStatus.value = 'error'
      improveError.value = error
    },
  )
}

const handleGenerate = async () => {
  errorMessage.value = ''
  if (!prompt.value.trim()) return
  status.value = 'loading'
  rawHtml.value = ''
  let buffer = ''

  await sendChatMessage(
    [],
    prompt.value,
    (chunk) => {
      status.value = 'streaming'
      buffer += chunk
      rawHtml.value = buffer
    },
    () => {
      status.value = 'done'
      rawHtml.value = buffer.trim()
      if (rawHtml.value) {
        setEditorFromHtml(rawHtml.value)
      }
    },
    (error) => {
      status.value = 'error'
      errorMessage.value = error
    },
  )
}

onBeforeUnmount(() => {
  editor.value?.destroy()
  contextAwareEditor.value?.destroy()
  interactiveEditor.value?.destroy()
})
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-4">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Tiptap + LLMs Playground</h1>
        <p class="text-slate-600 max-w-3xl">
          Tiptap is a headless, extension-first editor built on ProseMirror. It gives you full
          control over the editing experience while still offering rich text primitives out of the
          box. This playground demonstrates how to plug an LLM response directly into a Tiptap
          editor using raw HTML.
        </p>
        <p class="text-slate-600 max-w-3xl">
          Tiptap also ships an
          <a
            class="text-slate-700 underline underline-offset-4"
            href="https://tiptap.dev/docs/content-ai/capabilities/generation/overview"
            rel="noreferrer"
            target="_blank"
          >
            out-of-the-box AI integration extension
          </a>
          that can power generation workflows alongside custom pipelines like this one.
        </p>
      </div>
      <UAlert
        icon="i-lucide-sparkles"
        color="primary"
        variant="soft"
        title="Why this experiment?"
        description="The tricky part is keeping the model output format consistent while syncing it into the editor without breaking the UX."
      />
    </header>

    <UCard>
      <template #header>
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-slate-900">Prompt the LLM</h2>
          <p class="text-slate-600">
            The prompt below is sent to the LLM endpoint. The HTML response is pushed into the
            editor without a Markdown conversion step.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UTextarea v-model="prompt" :rows="4" class="w-full" />
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UBadge color="gray" variant="soft">
              {{ statusLabel }}
            </UBadge>
            <span class="text-sm text-slate-500">LLM response → HTML → Tiptap</span>
          </div>
          <UButton :loading="isBusy" color="primary" @click="handleGenerate">
            Generate summary
          </UButton>
        </div>
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          icon="i-lucide-alert-triangle"
          :description="errorMessage"
        />
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-slate-900">Output editor</h3>
          <p class="text-sm text-slate-600">
            The editor below reflects the HTML returned by the model.
          </p>
        </div>
        <TipTapEditor :editor="editor.value">
          <template #toolbar="{ editor: tiptap }">
            <TipTapToolbar :editor="tiptap" />
          </template>
        </TipTapEditor>
      </div>
    </UCard>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">How the demo works</h2>
        <p class="text-slate-600 max-w-3xl">
          The playground at the top wires together three things: the LLM prompt, a helper that
          writes HTML into Tiptap, and the editor shell that renders the content.
        </p>
      </div>
      <UCodeGroup>
        <UCodeBlock label="ai-integration.ts" :code="aiIntegrationSnippet" language="ts" />
        <UCodeBlock label="binding.ts" :code="bindingSnippet" language="ts" />
        <UCodeBlock label="improve-selection.ts" :code="improveSnippet" language="ts" />
        <UCodeBlock label="TipTapEditor.vue" :code="editorSnippet" language="vue" />
      </UCodeGroup>
    </section>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">Context + insertion points</h2>
        <p class="text-slate-600 max-w-3xl">
          Getting the right context and inserting model output where the cursor lives is often the
          trickiest part. You have to preserve selections, handle collapsed cursors, and avoid
          clobbering nearby content. Thankfully, Tiptap provides helper utilities like
          <a
            class="text-slate-700 underline underline-offset-4"
            href="https://tiptap.dev/docs/ui-components/components/ai-menu#getcontextandinsertateditor"
            rel="noreferrer"
            target="_blank"
          >
            getContextAndInsertAt
          </a>
          so you can keep the insertion logic safe and predictable.
        </p>
      </div>
      <div class="space-y-4">
        <TipTapEditor :editor="contextAwareEditor.value">
          <template #toolbar="{ editor: tiptap }">
            <TipTapToolbar :editor="tiptap" />
          </template>
        </TipTapEditor>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-slate-500">
            Select text in the editor and improve it using the context notes.
          </div>
          <UButton
            size="sm"
            variant="soft"
            color="primary"
            :loading="improveStatus === 'loading' || improveStatus === 'streaming'"
            @click="handleImproveSelection"
          >
            Improve selection
          </UButton>
        </div>
        <UAlert
          v-if="improveError"
          color="red"
          variant="soft"
          icon="i-lucide-alert-triangle"
          :description="improveError"
        />
      </div>
    </section>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">
          Interactive Vue + React node views
        </h2>
        <p class="text-slate-600 max-w-3xl">
          Tiptap lets you mount interactive UI inside the editor via node views. This section uses
          a Vue node view to render the coffee counter callout, and the same pattern translates to
          React with its node view renderer.
        </p>
        <p class="text-slate-600 max-w-3xl">
          See the full walkthrough in the
          <a
            class="text-slate-700 underline underline-offset-4"
            href="https://tiptap.dev/docs/examples/advanced/interactive-react-and-vue-views"
            rel="noreferrer"
            target="_blank"
          >
            interactive React + Vue views example
          </a>
          from the Tiptap docs.
        </p>
      </div>
      <UCodeGroup>
        <UCodeBlock
          label="interactive-views.ts"
          :code="interactiveViewsSnippet"
          language="ts"
        />
      </UCodeGroup>
      <TipTapEditor :editor="interactiveEditor.value">
        <template #toolbar="{ editor: tiptap }">
          <TipTapToolbar :editor="tiptap" />
        </template>
      </TipTapEditor>
    </section>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">Summary</h2>
        <p class="text-slate-600 max-w-3xl">
          Keep the output format predictable, use context notes for precision, and mix in
          interactive components when the UI needs to do more than text.
        </p>
      </div>
      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">Takeaways</h3>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Stream LLM HTML straight into Tiptap for stable structure.</li>
            <li>Use consistent context notes to guide on-demand rewrites.</li>
            <li>Node views unlock interactive UI inside the document.</li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-900">Try it</h3>
          <p class="mt-2 text-sm text-slate-600">
            Generate a summary, then highlight a sentence and ask the model to improve it with the
            context notes.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
