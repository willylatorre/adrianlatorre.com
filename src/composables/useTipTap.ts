import { isRef, unref, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
import type { Editor, EditorOptions } from '@tiptap/core'
import type { Ref } from 'vue'

const DEFAULT_EDITOR_CLASS =
  'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800'

type EditorProps = EditorOptions['editorProps']
type MaybeRef<T> = T | Ref<T>

export type UseTipTapOptions = Omit<EditorOptions, 'content' | 'onUpdate' | 'editorProps'> & {
  content: MaybeRef<string>
  editorProps?: EditorProps
  onUpdate?: (content: string, editor: Editor) => void
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

const normalizeContent = (value: string | null | undefined) => value ?? ''

export const useTipTap = ({ content, onUpdate, editorProps, ...options }: UseTipTapOptions) => {
  const editor = useEditor({
    ...options,
    content: normalizeContent(unref(content)),
    editorProps: mergeEditorClass(editorProps),
    onUpdate: ({ editor: tiptap }) => {
      const html = tiptap.getHTML()
      if (isRef(content) && normalizeContent(content.value) !== html) {
        content.value = html
      }
      onUpdate?.(html, tiptap)
    },
  })

  watch(
    () => normalizeContent(unref(content)),
    (value) => {
      const instance = editor.value
      if (!instance) return
      if (instance.getHTML() === value) return
      instance.commands.setContent(value, false)
    },
    { flush: 'post' },
  )

  return editor
}
