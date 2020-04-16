<script>
export default {
  store: ["darkMode"],
  props: {
    posts: {
      type: Object,
      default: () => {}
    }
  },
  computed: {
    formattedPosts() {
      if (!this.posts.edges) {
        return []
      }
      return this.posts.edges.map(edge => edge.node)
    }
  }
}
</script>



<template>
  <ul>
    {{ formattedPosts }}
  </ul>
</template>