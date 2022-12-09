<script>
export default {
  store: ['darkMode'],
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
  <div class="post" id="section-bloglist" :class="{ post_dark: darkMode }">
    <h1>Blog</h1>

    <ul class="mt-4 list-none">
      <li v-for="post in formattedPosts" :key="post.path">
        <NuxtLink :to="post.path">
          <article
            class="border border-light p-4 block rounded bg-white hover:bg-warningLight cursor-pointer"
          >
            <div class="flex justify-between">
              <h2 class="font-medium text-xl mb-2 text-warning">
                {{ post.title }}
                <span class="text-grey text-sm">- read more</span>
              </h2>

              <span class="text-sm text-grey">{{ post.date }}</span>
            </div>

            <div>{{ post.summary }} ...</div>
          </article>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>