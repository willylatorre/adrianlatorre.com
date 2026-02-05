import { type Ref, watch } from 'vue'
import { type Editor, type EditorOptions, useEditor } from '@tiptap/vue-3'

type UseTipTapOptions = Omit<EditorOptions, 'content' | 'onUpdate'> & {
  content: Ref<string>
  onUpdate?: (editor: Editor) => void
}

export const useTipTap = ({ content, onUpdate, ...options }: UseTipTapOptions) => {
  const editor = useEditor({
    ...options,
    content: content.value,
    onUpdate: ({ editor: tiptap }) => {
      content.value = tiptap.getHTML()
      onUpdate?.(tiptap)
    },
  })

  watch(
    content,
    (value) => {
      if (!editor.value) return
      if (value === editor.value.getHTML()) return
      editor.value.commands.setContent(value, false)
    },
    { flush: 'post' },
  )

  return editor
}
