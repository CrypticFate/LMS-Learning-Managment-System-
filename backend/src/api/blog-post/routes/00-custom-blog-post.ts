export default {
  routes: [
    {
      method: 'GET',
      path: '/blog-posts/mine',
      handler: 'blog-post.mine',
      config: {
        policies: [
          {
            name: 'global::has-any-role',
            config: { roles: ['Admin', 'Content Manager'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/blog-posts/:slug',
      handler: 'blog-post.findOneBySlug',
      config: { auth: false },
    },
  ],
};
