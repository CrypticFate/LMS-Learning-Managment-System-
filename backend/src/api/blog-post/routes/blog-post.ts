import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::blog-post.blog-post', {
  only: ['find', 'create', 'update', 'delete'],
  config: {
    create: {
      policies: [
        {
          name: 'global::has-any-role',
          config: { roles: ['Admin', 'Content Manager'] },
        },
      ],
    },
    update: { policies: ['global::can-manage-blog'] },
    delete: { policies: ['global::can-manage-blog'] },
  },
});
