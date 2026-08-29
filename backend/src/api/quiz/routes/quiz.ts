import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::quiz.quiz', {
  only: ['create', 'update', 'delete'],
  config: {
    create: { policies: ['global::can-manage-course'] },
    update: { policies: ['global::can-manage-quiz'] },
    delete: { policies: ['global::can-manage-quiz'] },
  },
});
