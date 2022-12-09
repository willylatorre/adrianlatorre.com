export const state = () => ({
    darkMode: false
  })

  
  export const mutations = {
    toggle(state, darkMode) {
      state.darkMode = darkMode
    }
  }
  
