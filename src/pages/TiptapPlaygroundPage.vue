<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { useApi } from '@/composables/useApi'
import UEditor from '@/components/UEditor.vue'

const { sendChatMessage } = useApi()

const prompt = ref(
  'Generate a brief summary about the advantages of using tip-tap editor over a simple WYSIWYG editor (use a Markdown response). Include a short heading and a bullet list. Highlight that one of the trickiest points is maintaining the response format outcome consistent and the interaction with the editor.',
)
const status = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const rawMarkdown = ref('')
const improveStatus = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const improveError = ref('')

const markdown = new MarkdownIt({ linkify: true, breaks: true })
const scriptClose = '</scr' + 'ipt>'

const bindingSnippet = `const markdown = new MarkdownIt({ linkify: true, breaks: true })

const setEditorFromMarkdown = (value: string) => {
  if (!editor.value) return
  const html = markdown.render(value)
  editor.value.commands.setContent(html, false)
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
const contextText = contextEditor.getText()

const prompt = \`Improve the highlighted text using the context.
Context:
\${contextText}

Selected text:
\${selectedText}\``

const editor = useEditor({
  extensions: [StarterKit],
  content: '<p>Run the prompt to generate a Markdown summary.</p>',
  editorProps: {
    attributes: {
      class:
        'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800',
    },
  },
})

const contextEditor = useEditor({
  extensions: [StarterKit],
  content:
    '<h3>Context notes</h3><p>This context editor stores background notes about a feature. It can include product tone, audience, or constraints. Select text in the main editor to ask the LLM to improve it using this context.</p>',
  editorProps: {
    attributes: {
      class:
        'min-h-[12rem] focus:outline-none prose prose-slate max-w-none text-slate-700',
    },
    editable: () => false,
  },
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

const setEditorFromMarkdown = (value: string) => {
  if (!editor.value) return
  const html = markdown.render(value)
  editor.value.commands.setContent(html, false)
}

const handleImproveSelection = async () => {
  improveError.value = ''
  if (!editor.value) return
  const { from, to } = editor.value.state.selection

  if (from === to) {
    improveStatus.value = 'error'
    improveError.value = 'Select some text in the editor to improve it.'
    return
  }

  const selectedText = editor.value.state.doc.textBetween(from, to, '\n')
  const contextText = contextEditor.value?.getText() ?? ''
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
        editor.value?.commands.insertContentAt({ from, to }, improved)
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
  rawMarkdown.value = ''
  let buffer = ''

  await sendChatMessage(
    [],
    prompt.value,
    (chunk) => {
      status.value = 'streaming'
      buffer += chunk
      rawMarkdown.value = buffer
    },
    () => {
      status.value = 'done'
      rawMarkdown.value = buffer.trim()
      if (rawMarkdown.value) {
        setEditorFromMarkdown(rawMarkdown.value)
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
  contextEditor.value?.destroy()
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
          editor using a Markdown pipeline.
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
      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">Takeaways</h2>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Stream LLM Markdown into Tiptap with a tiny conversion helper.</li>
            <li>Use a second editor to provide reliable context for improvements.</li>
          </ul>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-slate-900">Try it</h2>
          <p class="mt-2 text-sm text-slate-600">
            Generate a summary, then highlight a sentence and ask the model to improve it with the
            context notes.
          </p>
        </div>
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
            The prompt below is sent to the LLM endpoint. The Markdown response is parsed and pushed
            into the editor.
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
            <span class="text-sm text-slate-500">LLM response → Markdown → Tiptap</span>
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
      </div>
    </UCard>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">How the demo works</h2>
        <p class="text-slate-600 max-w-3xl">
          The playground at the top wires together three things: the Markdown parser, a helper that
          writes HTML into Tiptap, and the editor shell that renders the content.
        </p>
      </div>
      <UCodeGroup>
        <UCodeBlock label="binding.ts" :code="bindingSnippet" language="ts" />
        <UCodeBlock label="improve-selection.ts" :code="improveSnippet" language="ts" />
        <UCodeBlock label="UEditor.vue" :code="editorSnippet" language="vue" />
      </UCodeGroup>
    </section>

    <section class="space-y-4">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900">Editable summary</h2>
        <p class="text-slate-600 max-w-3xl">
          The editor below is driven by the streamed Markdown output. Use the toolbar to tweak the
          content or highlight a sentence before asking the model to improve it with context.
        </p>
      </div>
      <div class="space-y-4">
        <UEditor :editor="editor">
          <template #toolbar="{ editor: tiptap }">
            <div class="flex flex-wrap gap-2">
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('bold') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleBold().run()"
              >
                Bold
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('italic') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleItalic().run()"
              >
                Italic
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('strike') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleStrike().run()"
              >
                Strike
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('bulletList') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleBulletList().run()"
              >
                Bullet list
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('orderedList') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleOrderedList().run()"
              >
                Ordered list
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('blockquote') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleBlockquote().run()"
              >
                Quote
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                :disabled="!tiptap"
                :color="tiptap?.isActive('codeBlock') ? 'primary' : 'gray'"
                @click="tiptap?.chain().focus().toggleCodeBlock().run()"
              >
                Code block
              </UButton>
            </div>
          </template>
        </UEditor>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-slate-500">
            Select text in the editor and improve it using the context notes below.
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
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 text-sm font-semibold text-slate-700">Context editor</div>
        <UEditor :editor="contextEditor" />
      </div>
    </section>

  </div>
</template>
