import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::quiz.quiz', {
  only: ['create', 'findOne', 'update', 'delete'],
  config: {
    create: { policies: ['global::can-manage-course'] },
    findOne: { policies: ['global::can-manage-quiz'] },
    update: { policies: ['global::can-manage-quiz'] },
    delete: { policies: ['global::can-manage-quiz'] },
  },
});
