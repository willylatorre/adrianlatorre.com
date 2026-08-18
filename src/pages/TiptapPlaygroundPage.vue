<script setup lang="ts">
import { computed, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import ExperimentFooter from '@/components/experiment/ExperimentFooter.vue'
import ExperimentHeader from '@/components/experiment/ExperimentHeader.vue'
import TipTapEditor from '@/components/TipTapEditor.vue'
import TipTapToolbar from '@/components/TipTapToolbar.vue'

const { sendChatMessage } = useApi()

const prompt = ref(
  'Generate a brief summary about the advantages of using tip-tap editor over a simple WYSIWYG editor. Return HTML only (no Markdown), including a short heading and a bullet list. Highlight that one of the trickiest points is maintaining a consistent response format and smooth interaction with the editor.',
)
const status = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const improveStatus = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const improveError = ref('')

const scriptClose = '</scr' + 'ipt>'

const bindingSnippet = `const editorContent = ref('<p>Start writing...</p>')
const lastSavedHtml = ref('')

const editor = useTipTap({
  extensions: [StarterKit, Underline],
  content: editorContent,
  onUpdate: (html) => {
    lastSavedHtml.value = html
  },
})

const applyStreamedHtml = (value: string) => {
  editorContent.value = value
}`

const editorSnippet = `<script setup lang="ts">
import TipTapEditor from '@/components/TipTapEditor.vue'
import TipTapToolbar from '@/components/TipTapToolbar.vue'

const editorContent = ref('<p>Hello from Tiptap.</p>')
${scriptClose}

<template>
  <TipTapEditor
    v-model:content="editorContent"
    :extensions="['StarterKit', 'Underline', 'CoffeeCounterCalloutNode']"
  >
    <template #toolbar="{ editor }">
      <TipTapToolbar :editor="editor" />
    </template>
  </TipTapEditor>
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
  let buffer = ''

  await sendChatMessage(
    [],
    prompt.value,
    (chunk) => {
      status.value = 'streaming'
      buffer += chunk
    },
    () => {
      status.value = 'done'
      const html = buffer.trim()
      if (html) {
        applyStreamedHtml(html)
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

const editorContent = ref('<p>Run the prompt to generate an HTML summary.</p>')
const contextAwareContent = ref(
  '<h3>Context-aware rewrite playground</h3><p>This is the editor where you can highlight a line and ask the model to rework it using the notes below. It already knows that TipTap likes structure, so it keeps the bullets neat and the headings tidy.</p><ul><li>The UX should feel snappy, not robotic.</li><li>Consistency beats cleverness when output hits the editor.</li></ul>',
)
const interactiveContent = ref(
  '<h3>Interactive views with Vue + React</h3><p>Drop a custom component inside the editor to blend structured text with live UI. The callout below is a Vue component running inside a Tiptap node view.</p><coffee-counter-callout></coffee-counter-callout><p>In React, the same idea uses a ReactNodeViewRenderer. The key is that the editor still owns the document, while your framework owns the interactivity.</p>',
)

type TipTapEditorInstance = InstanceType<typeof TipTapEditor>
const contextAwareEditor = ref<TipTapEditorInstance | null>(null)

const contextNotes =
  'Voice: confident, friendly, a touch witty. Audience: builders integrating LLM output into Tiptap. Constraint: keep output structured for HTML parsing.'

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

const applyStreamedHtml = (value: string) => {
  editorContent.value = value
}

const handleImproveSelection = async () => {
  improveError.value = ''
  const editor = contextAwareEditor.value?.editor
  if (!editor) return
  const { from, to } = editor.state.selection

  if (from === to) {
    improveStatus.value = 'error'
    improveError.value = 'Select some text in the editor to improve it.'
    return
  }

  const selectedText = editor.state.doc.textBetween(from, to, '\n')
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
        editor.commands.insertContentAt({ from, to }, improved)
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
  let buffer = ''

  await sendChatMessage(
    [],
    prompt.value,
    (chunk) => {
      status.value = 'streaming'
      buffer += chunk
    },
    () => {
      status.value = 'done'
      const html = buffer.trim()
      if (html) {
        applyStreamedHtml(html)
      }
    },
    (error) => {
      status.value = 'error'
      errorMessage.value = error
    },
  )
}
</script>

<template>
  <div>
    <ExperimentHeader
      title="Tiptap + LLMs"
      description="Explore model-assisted editing workflows that move structured output into a Tiptap document without breaking the editing experience."
    />

    <UAlert
      icon="i-lucide-sparkles"
      color="primary"
      variant="soft"
      title="Why this experiment?"
      description="The tricky part is keeping the model output format consistent while syncing it into the editor without breaking the UX."
    />

    <UCard class="mt-8">
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
        <TipTapEditor v-model:content="editorContent" :extensions="['StarterKit']">
          <template #toolbar="{ editor: tiptap }">
            <TipTapToolbar :editor="tiptap" />
          </template>
        </TipTapEditor>
      </div>
    </UCard>

    <section class="mt-8 space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">How the demo works</h2>
        <p class="text-slate-600 max-w-3xl">
          The playground at the top wires together three things: the LLM prompt, the
          <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm">useTipTap</code> composable that
          syncs HTML into the editor, and the
          <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm">TipTapEditor</code>
          wrapper that standardizes extensions + toolbar UI.
        </p>
        <p class="text-slate-600 max-w-3xl">
          The composable hides the ProseMirror plumbing (content syncing, update hooks). The wrapper
          then maps named extensions, provides opinionated default editor styling, exposes a toolbar
          slot, and keeps the editor shell consistent across contexts.
        </p>
      </div>
      <UCodeGroup>
        <UCodeBlock label="ai-integration.ts" :code="aiIntegrationSnippet" language="ts" />
        <UCodeBlock label="binding.ts" :code="bindingSnippet" language="ts" />
        <UCodeBlock label="improve-selection.ts" :code="improveSnippet" language="ts" />
        <UCodeBlock label="TipTapEditor.vue" :code="editorSnippet" language="vue" />
      </UCodeGroup>
    </section>

    <section class="mt-8 space-y-4">
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
        <TipTapEditor
          ref="contextAwareEditor"
          v-model:content="contextAwareContent"
          :extensions="['StarterKit']"
        >
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

    <section class="mt-8 space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">Interactive Vue + React node views</h2>
        <p class="text-slate-600 max-w-3xl">
          Tiptap lets you mount interactive UI inside the editor via node views. This section uses a
          Vue node view to render the coffee counter callout, and the same pattern translates to
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
        <UCodeBlock label="interactive-views.ts" :code="interactiveViewsSnippet" language="ts" />
      </UCodeGroup>
      <TipTapEditor
        v-model:content="interactiveContent"
        :extensions="['StarterKit', 'CoffeeCounterCalloutNode']"
      >
        <template #toolbar="{ editor: tiptap }">
          <TipTapToolbar :editor="tiptap" />
        </template>
      </TipTapEditor>
    </section>

    <ExperimentFooter
      conclusion="Reliable editor workflows depend on constraining model output and synchronizing it deliberately with document state. Context, selection, and insertion rules matter as much as the prompt."
      :links="[
        {
          label: 'View the repository',
          href: 'https://github.com/willylatorre/adrianlatorre.com',
          external: true,
        },
        {
          label: 'Tiptap editor documentation',
          href: 'https://tiptap.dev/docs/editor/getting-started/overview',
          external: true,
        },
      ]"
    />
  </div>
</template>
