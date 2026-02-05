import { type Ref, watch } from 'vue'
import { type Editor, type EditorOptions, useEditor } from '@tiptap/vue-3'

const DEFAULT_EDITOR_CLASS =
  'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800'

type EditorProps = EditorOptions['editorProps']

type UseTipTapOptions = Omit<EditorOptions, 'content' | 'onUpdate' | 'editorProps'> & {
  content: Ref<string>
  editorProps?: EditorProps
  onUpdate?: (editor: Editor) => void
}

const mergeEditorClass = (editorProps?: EditorProps): EditorProps | undefined => {
  if (!editorProps) {
    return {
      attributes: {
        class: DEFAULT_EDITOR_CLASS,
      },
    }
  }

  const mergedClass = [DEFAULT_EDITOR_CLASS, editorProps.attributes?.class]
    .filter(Boolean)
    .join(' ')

  return {
    ...editorProps,
    attributes: {
      ...editorProps.attributes,
      class: mergedClass,
    },
  }
}

export const useTipTap = ({ content, onUpdate, editorProps, ...options }: UseTipTapOptions) => {
  const editor = useEditor({
    ...options,
    content: content.value,
    editorProps: mergeEditorClass(editorProps),
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
