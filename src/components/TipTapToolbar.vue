<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

defineProps<{
  editor?: Editor | null
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('bold') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleBold().run()"
    >
      Bold
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('italic') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleItalic().run()"
    >
      Italic
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('strike') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleStrike().run()"
    >
      Strike
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('bulletList') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleBulletList().run()"
    >
      Bullet list
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('orderedList') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleOrderedList().run()"
    >
      Ordered list
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('blockquote') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleBlockquote().run()"
    >
      Quote
    </UButton>
    <UButton
      size="xs"
      variant="soft"
      :disabled="!editor"
      :color="editor?.isActive('codeBlock') ? 'primary' : 'gray'"
      @click="editor?.chain().focus().toggleCodeBlock().run()"
    >
      Code block
    </UButton>
  </div>
</template>
