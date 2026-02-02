<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import UEditorToolbar from '@/components/UEditorToolbar.vue'

defineProps<{
  editor: Editor | null
}>()
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
    <UEditorToolbar>
      <slot name="toolbar" :editor="editor" />
    </UEditorToolbar>
    <div class="px-4 py-3">
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
