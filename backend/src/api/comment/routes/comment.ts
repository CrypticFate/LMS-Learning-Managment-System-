import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::comment.comment', {
  only: ['create', 'delete'],
  config: {
    create: { policies: ['global::can-access-lesson'] },
    delete: {
      policies: [
        {
          name: 'global::has-any-role',
          config: { roles: ['Admin', 'Content Manager', 'Instructor', 'Student'] },
        },
      ],
    },
  },
});
