import { unref, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import type { Editor, EditorOptions } from '@tiptap/core'
import type { Ref } from 'vue'

export type UseTipTapOptions = Omit<EditorOptions, 'content' | 'onUpdate'> & {
  content: string | Ref<string>
  onUpdate?: (content: string, editor: Editor) => void
}

export const useTipTap = ({ content, onUpdate, ...options }: UseTipTapOptions) => {
  const editor = useEditor({
    ...options,
    content: unref(content),
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML(), editor)
    },
  })

  watch(
    () => unref(content),
    (value) => {
      const instance = editor.value
      if (!instance) return
      if (instance.getHTML() === value) return
      instance.commands.setContent(value, false)
    },
  )

  return editor
}
