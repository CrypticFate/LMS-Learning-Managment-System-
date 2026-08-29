import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::course.course', {
  config: {
    create: {
      policies: [
        {
          name: 'global::has-any-role',
          config: { roles: ['Admin', 'Content Manager', 'Instructor'] },
        },
      ],
    },
    update: { policies: ['global::can-manage-course'] },
    delete: { policies: ['global::can-manage-course'] },
  },
});
