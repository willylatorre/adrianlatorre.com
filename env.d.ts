/// <reference types="vite/client" />

declare module '*.md' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare function useToast(): {
  add: (input: unknown) => void
}
