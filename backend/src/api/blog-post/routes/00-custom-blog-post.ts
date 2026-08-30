export default {
  routes: [
    {
      method: 'POST',
      path: '/blog-posts/:documentId/publish',
      handler: 'blog-post.publish',
      config: { policies: ['global::can-manage-blog'] },
    },
    {
      method: 'POST',
      path: '/blog-posts/:documentId/unpublish',
      handler: 'blog-post.unpublish',
      config: { policies: ['global::can-manage-blog'] },
    },
  ],
};
