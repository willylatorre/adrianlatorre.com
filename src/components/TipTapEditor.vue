<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { EditorOptions, Extension } from '@tiptap/core'
import { useTipTap } from '@/composables/useTipTap'
import UEditorToolbar from '@/components/TipTapToolbar.vue'

const props = defineProps<{
  modelValue?: string
  content?: string
  extensions: Extension[]
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

const editor = useTipTap({
  extensions: props.extensions,
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
