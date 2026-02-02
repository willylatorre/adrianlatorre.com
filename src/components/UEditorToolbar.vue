<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { EditorToolbarItem } from '@/types/editorToolbar'

const props = defineProps<{
  editor: Editor | null
  items: EditorToolbarItem[][]
  layout?: 'bubble' | 'inline'
}>()

const markCommands = {
  bold: (editor: Editor) => editor.chain().focus().toggleBold().run(),
  italic: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
  underline: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
  strike: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
  code: (editor: Editor) => editor.chain().focus().toggleCode().run(),
} as const

const nodeCommands = {
  blockquote: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
  bulletList: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  orderedList: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
  codeBlock: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
} as const

const isActive = (item: EditorToolbarItem) => {
  if (!props.editor) return false
  if (item.kind === 'heading' && item.level) {
    return props.editor.isActive('heading', { level: item.level })
  }
  if (item.kind === 'mark' && item.mark) {
    return props.editor.isActive(item.mark)
  }
  if (item.kind === 'node' && item.node) {
    return props.editor.isActive(item.node)
  }
  return false
}

const handleItem = (item: EditorToolbarItem) => {
  if (!props.editor) return
  if (item.kind === 'heading' && item.level) {
    props.editor.chain().focus().toggleHeading({ level: item.level }).run()
    return
  }
  if (item.kind === 'mark' && item.mark && item.mark in markCommands) {
    markCommands[item.mark as keyof typeof markCommands](props.editor)
    return
  }
  if (item.kind === 'node' && item.node && item.node in nodeCommands) {
    nodeCommands[item.node as keyof typeof nodeCommands](props.editor)
  }
}

const alignClass = (item: EditorToolbarItem) => {
  const align = item.content?.align
  if (align === 'center') return 'items-center'
  if (align === 'end') return 'items-end'
  return 'items-start'
}
</script>

<template>
  <div
    class="editor-toolbar flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2"
    :class="layout === 'bubble' ? 'rounded-t-lg' : ''"
  >
    <div
      v-for="(group, groupIndex) in items"
      :key="groupIndex"
      class="flex flex-wrap items-center gap-2"
    >
      <template v-for="(item, itemIndex) in group" :key="itemIndex">
        <UPopover v-if="item.items?.length" mode="click">
          <UButton
            size="xs"
            variant="soft"
            :disabled="!editor"
            :color="isActive(item) ? 'primary' : 'gray'"
            :title="item.tooltip?.text"
          >
            <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4" />
            <span v-else>{{ item.label }}</span>
          </UButton>

          <template #content>
            <div class="flex flex-col gap-1 p-2" :class="alignClass(item)">
              <UButton
                v-for="(subItem, subIndex) in item.items"
                :key="subIndex"
                size="xs"
                variant="ghost"
                :disabled="!editor"
                :color="isActive(subItem) ? 'primary' : 'gray'"
                :title="subItem.tooltip?.text"
                @click="handleItem(subItem)"
              >
                <UIcon v-if="subItem.icon" :name="subItem.icon" class="h-4 w-4" />
                <span v-else>{{ subItem.label }}</span>
              </UButton>
            </div>
          </template>
        </UPopover>

        <UButton
          v-else
          size="xs"
          variant="soft"
          :disabled="!editor"
          :color="isActive(item) ? 'primary' : 'gray'"
          :title="item.tooltip?.text"
          @click="handleItem(item)"
        >
          <UIcon v-if="item.icon" :name="item.icon" class="h-4 w-4" />
          <span v-else>{{ item.label }}</span>
        </UButton>
      </template>
    </div>
  </div>
</template>
