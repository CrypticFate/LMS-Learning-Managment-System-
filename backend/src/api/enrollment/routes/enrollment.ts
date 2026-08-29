import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::enrollment.enrollment', {
  only: ['create'],
  config: {
    create: {
      policies: [
        {
          name: 'global::has-any-role',
          config: { roles: ['Student'] },
        },
      ],
    },
  },
});
