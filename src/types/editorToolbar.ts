export type EditorToolbarItem = {
  icon?: string
  label?: string
  tooltip?: {
    text: string
  }
  kind?: 'mark' | 'heading' | 'node'
  mark?: string
  level?: number
  node?: string
  content?: {
    align?: 'start' | 'center' | 'end'
  }
  items?: EditorToolbarItem[]
}
