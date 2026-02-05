<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { EditorOptions, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import CoffeeCounterCalloutNode from '@/tiptap/CoffeeCounterCalloutNode'
import { useTipTap } from '@/composables/useTipTap'
import TipTapToolbar from '@/components/TipTapToolbar.vue'

const EXTENSION_MAP: Record<string, Extension> = {
  StarterKit,
  Underline,
  CoffeeCounterCalloutNode,
}

const props = defineProps<{
  modelValue?: string
  content?: string
  extensions: string[]
  editorProps?: EditorOptions['editorProps']
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'update:content', value: string): void
}>()

const resolvedContent = computed({
  get: () => props.modelValue ?? props.content ?? '',
  set: (value) => {
    emit('update:modelValue', value)
    emit('update:content', value)
  },
})

const resolvedExtensions = computed(() => {
  const resolved: Extension[] = []
  const missing: string[] = []

  for (const name of props.extensions) {
    const extension = EXTENSION_MAP[name]
    if (!extension) {
      missing.push(name)
      continue
    }
    resolved.push(extension)
  }

  if (missing.length) {
    console.warn(`Extensions not found in extension map: ${missing.join(', ')}`)
  }

  return resolved
})

const editor = useTipTap({
  extensions: resolvedExtensions.value,
  editorProps: props.editorProps,
  content: resolvedContent,
})

defineExpose({ editor })

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
    <slot name="toolbar" :editor="editor">
      <TipTapToolbar :editor="editor" />
    </slot>
    <div class="px-4 py-3">
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
