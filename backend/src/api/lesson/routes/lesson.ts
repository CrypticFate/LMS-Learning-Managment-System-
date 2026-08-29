import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::lesson.lesson', {
  only: ['create', 'update', 'delete'],
  config: {
    create: { policies: ['global::can-manage-course'] },
    update: { policies: ['global::can-manage-lesson'] },
    delete: { policies: ['global::can-manage-lesson'] },
  },
});
