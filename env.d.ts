/// <reference types="vite/client" />

declare module '*.md' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component

  // Frontmatter exports (provided by unplugin-vue-markdown).
  export const title: string
  export const date: string
  export const description: string
}

declare function useToast(): {
  add: (input: unknown) => void
}
