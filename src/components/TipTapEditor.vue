<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { EditorOptions, Extension } from '@tiptap/core'
import { useTipTap } from '@/composables/useTipTap'

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

const resolvedContent = computed(() => props.modelValue ?? props.content ?? '')

const editor = useTipTap({
  extensions: props.extensions,
  editorProps: props.editorProps,
  content: resolvedContent,
  onUpdate: (value) => {
    emit('update:modelValue', value)
    emit('update:content', value)
  },
})

defineExpose({ editor })

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
    <slot name="toolbar" :editor="editor" />
    <div class="px-4 py-3">
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
