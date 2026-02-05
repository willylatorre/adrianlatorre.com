import { useEditor, type EditorOptions } from '@tiptap/vue-3'

const DEFAULT_EDITOR_CLASS =
  'min-h-[16rem] focus:outline-none prose prose-slate max-w-none text-slate-800'

type EditorProps = EditorOptions['editorProps']

type UseTipTapOptions = {
  content?: EditorOptions['content']
  extensions?: EditorOptions['extensions']
  editorProps?: EditorProps
  editable?: EditorOptions['editable']
  onUpdate?: EditorOptions['onUpdate']
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

export function useTipTap(options: UseTipTapOptions) {
  const editor = useEditor({
    content: options.content,
    extensions: options.extensions,
    editorProps: mergeEditorClass(options.editorProps),
    editable: options.editable,
    onUpdate: options.onUpdate,
  })

  return {
    editor,
    editorClass: DEFAULT_EDITOR_CLASS,
  }
}
