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
        content
        date  (format: "YYYY-MM-DD")
        path
      }
    }
  }
}
</page-query>


<template>
  <Layout>
    <BlogPostsList :posts="$page.posts" />
  </Layout>
</template>


