<script>
import BlogPostsList from '@/components/BlogPostsList'
export default {
  metaInfo: {
    title: 'Adrian Latorre'
  },
  components: {
    BlogPostsList
  }
}
</script>

<page-query>
query {
  posts: allPost {
    totalCount
    edges {
      node {
        title
        summary
        date  (format: "YYYY-MM-DD")
        path
      }
    }
  }
}
</page-query>


<template>
    <BlogPostsList :posts="$page.posts" />
</template>


