import { Termino } from '../assets/scripts/temino'

export default defineNuxtPlugin((NuxtApp) => {
  return {
    provide: {
      termino: Termino
    }
  }
})