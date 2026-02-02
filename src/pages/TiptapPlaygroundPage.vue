<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useApi } from '@/composables/useApi'
import UEditor from '@/components/UEditor.vue'
import UEditorToolbar from '@/components/UEditorToolbar.vue'
import type { EditorToolbarItem } from '@/types/editorToolbar'

const { sendChatMessage } = useApi()

const prompt = ref(
  'Generate a brief summary about the advantages of using tip-tap editor over a simple WYSIWYG editor (use a Markdown response). Highlight that one of the trickiest points is maintaining the response format outcome consistent and the interaction with the editor.',
)
const status = ref<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
const errorMessage = ref('')
const rawMarkdown = ref('')

const markdown = new MarkdownIt({ linkify: true, breaks: true })

const editor = useEditor({
  extensions: [StarterKit, Underline],
  content: '<p>Run the prompt to generate a Markdown summary.</p>',
  editorProps: {
    attributes: {
      class:
        'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800',
    },
  },
})

const toolbarItems: EditorToolbarItem[][] = [
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: {
        align: 'start',
      },
      items: [
        {
          kind: 'heading',
          level: 1,
          icon: 'i-lucide-heading-1',
          label: 'Heading 1',
        },
        {
          kind: 'heading',
          level: 2,
          icon: 'i-lucide-heading-2',
          label: 'Heading 2',
        },
        {
          kind: 'heading',
          level: 3,
          icon: 'i-lucide-heading-3',
          label: 'Heading 3',
        },
        {
          kind: 'heading',
          level: 4,
          icon: 'i-lucide-heading-4',
          label: 'Heading 4',
        },
      ],
    },
  ],
  [
    {
      kind: 'mark',
      mark: 'bold',
      icon: 'i-lucide-bold',
      tooltip: { text: 'Bold' },
    },
    {
      kind: 'mark',
      mark: 'italic',
      icon: 'i-lucide-italic',
      tooltip: { text: 'Italic' },
    },
    {
      kind: 'mark',
      mark: 'underline',
      icon: 'i-lucide-underline',
      tooltip: { text: 'Underline' },
    },
    {
      kind: 'mark',
      mark: 'strike',
      icon: 'i-lucide-strikethrough',
      tooltip: { text: 'Strikethrough' },
    },
    {
      kind: 'mark',
      mark: 'code',
      icon: 'i-lucide-code',
      tooltip: { text: 'Code' },
    },
  ],
  [
    {
      kind: 'node',
      node: 'bulletList',
      icon: 'i-lucide-list',
      tooltip: { text: 'Bullet list' },
    },
    {
      kind: 'node',
      node: 'orderedList',
      icon: 'i-lucide-list-ordered',
      tooltip: { text: 'Ordered list' },
    },
    {
      kind: 'node',
      node: 'blockquote',
      icon: 'i-lucide-quote',
      tooltip: { text: 'Quote' },
    },
    {
      kind: 'node',
      node: 'codeBlock',
      icon: 'i-lucide-code-2',
      tooltip: { text: 'Code block' },
    },
  ],
]

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
  if (!editor) return
  const html = markdown.render(value)
  editor.commands.setContent(html, false)
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
  editor?.destroy()
})
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-3">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Tiptap + LLMs Playground</h1>
        <p class="text-slate-600 max-w-3xl">
          Tiptap is a headless, extension-first editor built on ProseMirror. It gives you full
          control over the editing experience while still offering rich text primitives out of the
          box. This playground demonstrates how to plug an LLM response directly into a Tiptap
          editor using a Markdown pipeline.
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
            The prompt below is sent to the LLM endpoint. The Markdown response is parsed and pushed
            into the editor.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UTextarea v-model="prompt" :rows="4" />
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

    <UCard>
      <template #header>
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-slate-900">Markdown-driven editor</h2>
          <p class="text-slate-600">
            A simplified toolbar using the Nuxt UI Editor component shell, wired to Tiptap actions.
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <UEditor :editor="editor">
          <template #toolbar="{ editor: tiptap }">
            <UEditorToolbar :editor="tiptap" :items="toolbarItems" layout="bubble" />
          </template>
        </UEditor>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-slate-900">Latest Markdown payload</h2>
          <p class="text-slate-600">
            Use this to verify the LLM output format remains stable across iterations.
          </p>
        </div>
      </template>
      <UTextarea v-model="rawMarkdown" :rows="8" readonly />
    </UCard>
  </div>
</template>
