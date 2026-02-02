<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'

defineProps<{
  editor: Editor | null
}>()
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-200 bg-slate-50 px-3 py-2">
      <slot name="toolbar" :editor="editor" />
    </div>
    <div class="px-4 py-3">
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
