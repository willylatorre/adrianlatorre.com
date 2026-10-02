import 'vue'

declare module 'vue' {
  interface ComponentCustomProperties {
    $confetti: {
      start(options?: {
        particles?: Array<{ type: string; size: number }>
        defaultColors?: string[]
        particlesPerFrame?: number
        defaultDropRate?: number
      }): void
      stop(): void
      remove(): void
    }
  }
}
