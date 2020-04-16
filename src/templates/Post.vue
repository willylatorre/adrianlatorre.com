
<page-query>
query Post ($path: String!) {
  post: post (path: $path) {
    title
    date (format: "YYYY-MM-DD")
    content
  }
}
</page-query>

<script>
export default {
  store: ['darkMode'],

  metaInfo() {
    return {
      title: this.$page.post.title
    }
  }
}
</script>

<template>
  <Layout>
    <article
      class="post relative"
      id="section-post"
      :class="{ post_dark: darkMode }"
    >
      <span class="absolute top-0 right-0 mr-4 mt-4 text-sm text-grey">
        {{ $page.post.date }}
      </span>

      <div v-html="$page.post.content" />
    </article>
  </Layout>
</template>
