const c1 = () => import(/* webpackChunkName: "page--src--templates--post-vue" */ "/workspace/adrianlatorre.com/src/templates/Post.vue")
const c2 = () => import(/* webpackChunkName: "page--src--pages--blog-vue" */ "/workspace/adrianlatorre.com/src/pages/Blog.vue")
const c3 = () => import(/* webpackChunkName: "page--node-modules--gridsome--app--pages--404-vue" */ "/workspace/adrianlatorre.com/node_modules/gridsome/app/pages/404.vue")
const c4 = () => import(/* webpackChunkName: "page--src--pages--index-vue" */ "/workspace/adrianlatorre.com/src/pages/Index.vue")

export default [
  {
    path: "/blog/hey/",
    component: c1
  },
  {
    path: "/blog/",
    component: c2
  },
  {
    name: "404",
    path: "/404/",
    component: c3
  },
  {
    name: "home",
    path: "/",
    component: c4
  },
  {
    name: "*",
    path: "*",
    component: c3
  }
]
